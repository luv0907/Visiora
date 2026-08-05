"""
VISIORA — Structured JSON Request Logging Middleware
Every request gets a unique request_id for end-to-end tracing.
In production: JSON output (machine-readable for Railway/GCP log sinks).
In development: Pretty colored output (human-readable).
"""
import time
import uuid
import os
import structlog
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# ── structlog configuration ─────────────────────────────────────────────────
_shared_processors = [
    structlog.contextvars.merge_contextvars,
    structlog.stdlib.add_log_level,
    structlog.processors.TimeStamper(fmt="iso"),
    structlog.processors.StackInfoRenderer(),
    structlog.processors.format_exc_info,
]

if ENVIRONMENT == "production":
    # Machine-readable JSON — compatible with Railway, GCP Cloud Logging
    structlog.configure(
        processors=[
            *_shared_processors,
            structlog.processors.JSONRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
else:
    # Human-readable for local dev
    structlog.configure(
        processors=[
            *_shared_processors,
            structlog.dev.ConsoleRenderer(colors=True),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

log = structlog.get_logger()


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        start = time.perf_counter()
        response = await call_next(request)
        latency_ms = round((time.perf_counter() - start) * 1000, 2)

        # Skip noisy health-check logs in prod
        if request.url.path != "/health" or ENVIRONMENT != "production":
            log.info(
                "request",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                latency_ms=latency_ms,
                client_ip=request.client.host if request.client else "unknown",
            )

        response.headers["X-Request-ID"] = request_id
        return response
