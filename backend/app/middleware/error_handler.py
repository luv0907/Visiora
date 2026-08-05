"""
VISIORA — Global Exception Handler
Returns structured error responses. NEVER sends stack traces to the client.
"""
import structlog
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

log = structlog.get_logger()

def _error_response(status_code: int, code: str, message: str, details=None) -> dict:
    error_dict = {"code": code, "message": message}
    if details:
        error_dict["details"] = details
    return {"success": False, "data": None, "error": error_dict}

async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    request_id = structlog.contextvars.get_contextvars().get("request_id", getattr(request.state, "request_id", "unknown"))
    log.warning("http_error", request_id=request_id, status=exc.status_code, detail=exc.detail)
    
    code = "internal_error"
    if exc.status_code == 429:
        code = "rate_limited"
    elif exc.status_code == 404:
        code = "not_found"
    elif exc.status_code in (401, 403):
        code = "unauthorized"
    
    headers = getattr(exc, "headers", None) or {}
    headers["X-Request-ID"] = request_id

    return JSONResponse(
        status_code=exc.status_code,
        content=_error_response(exc.status_code, code, str(exc.detail)),
        headers=headers,
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = structlog.contextvars.get_contextvars().get("request_id", getattr(request.state, "request_id", "unknown"))
    errors = []
    for err in exc.errors():
        loc = " → ".join(str(l) for l in err["loc"] if l != "body")
        errors.append(f"{loc}: {err['msg']}" if loc else err["msg"])

    log.warning("validation_error", request_id=request_id, errors=errors)
    return JSONResponse(
        status_code=422,
        content=_error_response(422, "validation_error", "Invalid request data", errors),
        headers={"X-Request-ID": request_id},
    )

async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    try:
        request_id = structlog.contextvars.get_contextvars().get("request_id", getattr(request.state, "request_id", "unknown"))
        log.exception("unhandled_exception", request_id=request_id, exc_type=type(exc).__name__, path=request.url.path)
        return JSONResponse(
            status_code=500,
            content=_error_response(500, "internal_error", f"Something went wrong. Reference this ID if reporting: {request_id}"),
            headers={"X-Request-ID": str(request_id)},
        )
    except Exception as e:
        log.error("handler_failed", error=str(e), exc_info=True)
        return JSONResponse(status_code=500, content={"error": "Critical fallback error"})
