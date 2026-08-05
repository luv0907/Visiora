"""
VISIORA Backend — Application Settings
All config from environment variables. Never hardcode secrets.
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    # ── Environment ────────────────────────────────
    ENVIRONMENT: str = "development"

    # ── LLM ────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    LLM_PROVIDER: str = "openrouter"          # "gemini" | "openai" | "openrouter"
    LLM_MODEL: str = "qwen/qwen-2.5-72b-instruct"

    # ── TTS (local Qwen3-TTS) ──────────────────────
    QWEN_TTS_BASE_URL: str = "http://localhost:8020"
    QWEN_TTS_API_KEY: str = ""

    # ── Firebase ───────────────────────────────────
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_SERVICE_ACCOUNT_PATH: str = ""  # path to service-account.json
    FIRESTORE_USE_EMULATOR: bool = False

    # ── CORS ───────────────────────────────────────
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # ── Rate Limiting ──────────────────────────────
    RATE_LIMIT_AI_REQUESTS: int = 20       # per window
    RATE_LIMIT_AI_WINDOW_SECS: int = 60
    RATE_LIMIT_GLOBAL: int = 100
    RATE_LIMIT_GLOBAL_WINDOW_SECS: int = 60

    # ── LLM Cost Caps & Caching ──────────────────────────────
    LLM_DAILY_TOKEN_CAP: int = 500_000
    LLM_MONTHLY_TOKEN_CAP: int = 10_000_000
    CACHE_TTL_SECONDS: int = 600

    # ── Request Limits ─────────────────────────────
    MAX_REQUEST_SIZE_BYTES: int = 10_240   # 10 KB
    MAX_TTS_TEXT_LENGTH: int = 500

    # ── JWT ────────────────────────────────────────
    JWT_SECRET: str = "change_me_in_production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
