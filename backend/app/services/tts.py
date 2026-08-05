"""
VISIORA — TTS Service (Local Qwen3-TTS)
Calls local Qwen3-TTS server. Abstracted behind an interface for easy swap.
"""
import httpx
import structlog
from ..config import settings

log = structlog.get_logger()


class TTSUnavailableError(Exception):
    pass


async def synthesize_speech(text: str, speed: float = 1.0, emotion: str = "calm") -> bytes:
    """
    Call the local Qwen3-TTS voice-clone server and return audio bytes (WAV).
    Falls back gracefully if TTS is unavailable.

    Endpoint: POST /clone  (voice-clone project at localhost:8020)
    Payload:  { text, emotion, speed }
    Emotions: neutral | calm | happy | excited | sad | angry
    """
    if not settings.QWEN_TTS_BASE_URL:
        raise TTSUnavailableError("TTS not configured (QWEN_TTS_BASE_URL not set)")

    # Truncate text to configured limit
    text = text[:settings.MAX_TTS_TEXT_LENGTH]

    # voice-clone project endpoint — POST /clone, not /tts
    url = f"{settings.QWEN_TTS_BASE_URL}/clone"

    headers = {}
    if settings.QWEN_TTS_API_KEY:
        headers["Authorization"] = f"Bearer {settings.QWEN_TTS_API_KEY}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            res = await client.post(url, json={
                "text": text,
                "emotion": emotion,
                "speed": max(0.5, min(2.0, speed)),
            }, headers=headers)
            res.raise_for_status()
            log.info("tts_success", chars=len(text), speed=speed, emotion=emotion)
            return res.content
        except httpx.TimeoutException:
            raise TTSUnavailableError("TTS server timed out")
        except httpx.HTTPStatusError as e:
            raise TTSUnavailableError(f"TTS error: {e.response.status_code}")
        except httpx.ConnectError:
            raise TTSUnavailableError("Cannot connect to local TTS server (is voice-clone backend running at localhost:8020?)")
