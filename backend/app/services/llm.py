"""
VISIORA — LLM Provider Abstraction
Default: Gemini Flash. Swap to OpenAI/Claude by changing LLM_PROVIDER in .env.
All LLM calls go through this module — never inline in route handlers.
"""
import json
import re
import httpx
import structlog
from typing import Protocol, runtime_checkable
from ..config import settings
from .cache import cache
from .budget import check_budget_available, record_token_usage

log = structlog.get_logger()


@runtime_checkable
class LLMProvider(Protocol):
    async def generate(self, prompt: str, schema: dict | None = None) -> str:
        ...


class GeminiFlashProvider:
    """Google Gemini Flash — cheapest, fastest for this use case."""

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.LLM_MODEL or "gemini-1.5-flash"

    async def generate(self, prompt: str, schema: dict | None = None) -> str:
        cache_key = f"{self.model}:{prompt}"
        if cached := cache.get(cache_key):
            log.info("llm_cache_hit", model=self.model)
            return cached

        if not await check_budget_available(100):
            raise LLMUnavailableError("Daily AI budget exceeded (Free Tier)")

        if not self.api_key:
            raise LLMUnavailableError("GEMINI_API_KEY not configured")

        url = f"{self.BASE_URL}/{self.model}:generateContent?key={self.api_key}"
        contents = [{"parts": [{"text": prompt}]}]
        generation_config = {"temperature": 0.3, "maxOutputTokens": 512}

        if schema:
            generation_config["responseMimeType"] = "application/json"

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                res = await client.post(url, json={
                    "contents": contents,
                    "generationConfig": generation_config,
                })
                res.raise_for_status()
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                
                # Estimate or extract token usage
                tokens = len(prompt) // 4 + len(text) // 4
                await record_token_usage(tokens)
                
                log.info("llm_response", model=self.model, chars=len(text), tokens=tokens)
                cache.set(cache_key, text)
                return text
            except httpx.TimeoutException:
                raise LLMUnavailableError("LLM request timed out")
            except httpx.HTTPStatusError as e:
                raise LLMUnavailableError(f"LLM API error: {e.response.status_code}")


class OpenAIProvider:
    """OpenAI drop-in replacement."""

    def __init__(self):
        import os
        self.api_key = os.getenv("OPENAI_API_KEY", "")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    async def generate(self, prompt: str, schema: dict | None = None) -> str:
        cache_key = f"{self.model}:{prompt}"
        if cached := cache.get(cache_key):
            log.info("llm_cache_hit", model=self.model)
            return cached
            
        if not await check_budget_available(100):
            raise LLMUnavailableError("Daily AI budget exceeded (Free Tier)")

        if not self.api_key:
            raise LLMUnavailableError("OPENAI_API_KEY not configured")

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                res = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.3,
                        "max_tokens": 512,
                        **({"response_format": {"type": "json_object"}} if schema else {}),
                    },
                )
                res.raise_for_status()
                data = res.json()
                text = data["choices"][0]["message"]["content"]
                
                tokens = data.get("usage", {}).get("total_tokens", len(prompt)//4 + len(text)//4)
                await record_token_usage(tokens)
                
                cache.set(cache_key, text)
                return text
            except Exception as e:
                raise LLMUnavailableError(f"OpenAI error: {str(e)}")


class OpenRouterProvider:
    """OpenRouter provider for free Qwen models and others."""

    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.model = settings.LLM_MODEL or "qwen/qwen-2.5-72b-instruct"

    async def generate(self, prompt: str, schema: dict | None = None) -> str:
        cache_key = f"{self.model}:{prompt}"
        if cached := cache.get(cache_key):
            log.info("llm_cache_hit", model=self.model)
            return cached

        if not await check_budget_available(100):
            raise LLMUnavailableError("Daily AI budget exceeded (Free Tier)")

        if not self.api_key or self.api_key == "your_openrouter_api_key_here":
            raise LLMUnavailableError("OPENROUTER_API_KEY not configured in .env")

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "HTTP-Referer": "http://localhost:5173",
                        "X-Title": "VISIORA",
                    },
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.3,
                        # OpenRouter doesn't always support strict JSON mode natively across all models, 
                        # but we prompt it to output JSON anyway. Qwen handles it fine.
                        **({"response_format": {"type": "json_object"}} if schema else {}),
                    },
                )
                res.raise_for_status()
                data = res.json()
                
                if "error" in data:
                    raise LLMUnavailableError(f"OpenRouter API error: {data.get('error', {}).get('message', 'Unknown')}")
                    
                text = data["choices"][0]["message"]["content"]
                
                # Strip markdown codeblocks if openrouter models return them despite json_object
                if schema:
                    import re
                    text = re.sub(r"^```(?:json)?", "", text, flags=re.MULTILINE)
                    text = re.sub(r"```$", "", text, flags=re.MULTILINE).strip()

                tokens = data.get("usage", {}).get("total_tokens", len(prompt)//4 + len(text)//4)
                await record_token_usage(tokens)
                
                cache.set(cache_key, text)
                return text
            except httpx.HTTPStatusError as e:
                # Some API errors return JSON with message
                try:
                    err_data = e.response.json()
                    err_msg = err_data.get("error", {}).get("message", e.response.status_code)
                except Exception:
                    err_msg = e.response.status_code
                raise LLMUnavailableError(f"OpenRouter API error: {err_msg}")
            except Exception as e:
                if isinstance(e, LLMUnavailableError):
                    raise
                raise LLMUnavailableError(f"OpenRouter error: {str(e)}")


class LLMUnavailableError(Exception):
    pass


def get_llm_provider() -> LLMProvider:
    provider = settings.LLM_PROVIDER.lower()
    if provider == "openai":
        return OpenAIProvider()
    if provider == "openrouter":
        return OpenRouterProvider()
    return GeminiFlashProvider()  # default


# Singleton
_llm: LLMProvider | None = None


def llm() -> LLMProvider:
    global _llm
    if _llm is None:
        _llm = get_llm_provider()
    return _llm
