"""
VISIORA — FastAPI Application
Production-hardened: logging, error handlers, rate limiting, health check, CORS scoped.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import structlog
from contextlib import asynccontextmanager

from .config import settings
from .router import router as api_router
from .routes.progress_router import router as progress_router
from .middleware.logging_mw import LoggingMiddleware
from .middleware.error_handler import (
    http_exception_handler,
    validation_exception_handler,
    unhandled_exception_handler,
)
from .services.llm import get_llm_provider

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.ENVIRONMENT == "development":
        # Log masked secrets and config for dev sanity check
        gemini_masked = (settings.GEMINI_API_KEY[:4] + "***") if settings.GEMINI_API_KEY else "MISSING"
        log.info(
            "startup_sanity_check",
            firebase_project_id=settings.FIREBASE_PROJECT_ID or "MISSING",
            gemini_api_key=gemini_masked,
            cors_origins=settings.ALLOWED_ORIGINS,
        )

    # Startup: warm LLM singleton
    try:
        from .services.llm import get_llm_provider
        _ = get_llm_provider()
        log.info("LLM singleton warmed up")
    except Exception as e:
        log.error("Failed to warm up LLM", error=str(e))
    yield
    # Shutdown (cleanup if needed)


# ── App Setup ───────────────────────────────────────────────────────
app = FastAPI(
    title="VISIORA Physics API",
    version="1.0.0",
    description="AI-powered physics learning platform backend",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)

# ── Middleware (order matters: CORS first, then logging) ─────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,  # Never wildcard in prod
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
    max_age=600,
)

app.add_middleware(LoggingMiddleware)

# ── Request Size Limit ────────────────────────────────────────────
@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > settings.MAX_REQUEST_SIZE_BYTES:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=413,
            content={"error": f"Request body too large (max {settings.MAX_REQUEST_SIZE_BYTES // 1024}KB)"}
        )
    return await call_next(request)

# ── Exception Handlers ────────────────────────────────────────────
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# ── Routes ───────────────────────────────────────────────────────
app.include_router(api_router, prefix="/api/v1")
app.include_router(progress_router, prefix="/api/v1")
# Keep /api as a deprecated alias for one release to prevent breakage
app.include_router(api_router, prefix="/api")
app.include_router(progress_router, prefix="/api")


# ── Health Check ─────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    """Uptime monitoring endpoint. Returns 200 when service is healthy."""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0",
    }

@app.get("/")
async def root():
    return {"message": "VISIORA Physics API", "docs": "/docs"}
