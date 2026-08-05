"""
VISIORA — Sliding-Window Rate Limiter
Per-IP and per-user limits on AI-calling endpoints.
In-memory for dev; swap storage backend to Redis for production scaling.
"""
import time
from collections import defaultdict, deque
from fastapi import Request, HTTPException
from ..config import settings


class SlidingWindowRateLimiter:
    """Token-bucket / sliding window rate limiter using in-memory deques."""

    def __init__(self):
        # { key: deque of timestamps }
        self._windows: dict[str, deque] = defaultdict(deque)

    def is_allowed(self, key: str, max_requests: int, window_secs: int) -> bool:
        now = time.time()
        window_start = now - window_secs
        q = self._windows[key]

        # Evict timestamps outside the window
        while q and q[0] < window_start:
            q.popleft()

        if len(q) >= max_requests:
            return False

        q.append(now)
        return True

    def get_retry_after(self, key: str, window_secs: int) -> int:
        q = self._windows.get(key)
        if not q:
            return 0
        oldest = q[0]
        return max(0, int(oldest + window_secs - time.time()) + 1)


# Global singleton limiter
_limiter = SlidingWindowRateLimiter()


def get_client_ip(request: Request) -> str:
    """Extract real IP, respecting common proxy headers."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def apply_ai_rate_limit(request: Request):
    """
    Dependency to be used on AI-calling endpoints.
    Limits per IP: RATE_LIMIT_AI_REQUESTS per RATE_LIMIT_AI_WINDOW_SECS.
    """
    ip = get_client_ip(request)
    key = f"ai:{ip}"
    max_req = settings.RATE_LIMIT_AI_REQUESTS
    window  = settings.RATE_LIMIT_AI_WINDOW_SECS

    if not _limiter.is_allowed(key, max_req, window):
        retry_after = _limiter.get_retry_after(key, window)
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. AI tutor is cooling down — try again in {retry_after}s.",
            headers={"Retry-After": str(retry_after)},
        )


async def apply_global_rate_limit(request: Request):
    """Broad per-IP limit on all endpoints."""
    ip = get_client_ip(request)
    key = f"global:{ip}"
    max_req = settings.RATE_LIMIT_GLOBAL
    window  = settings.RATE_LIMIT_GLOBAL_WINDOW_SECS

    if not _limiter.is_allowed(key, max_req, window):
        retry_after = _limiter.get_retry_after(key, window)
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please slow down.",
            headers={"Retry-After": str(retry_after)},
        )
