"""
VISIORA — Firebase Auth Integration
Verifies Firebase ID tokens issued by the frontend.
"""
import structlog
from fastapi import Depends, HTTPException, Cookie, Header, Request
from typing import Optional

log = structlog.get_logger()

# Firebase Admin SDK — lazy init to avoid startup crash if not configured
_firebase_app = None


def _get_firebase_app():
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    from ..config import settings
    try:
        import firebase_admin
        from firebase_admin import credentials

        if not firebase_admin._apps:
            if settings.FIREBASE_SERVICE_ACCOUNT_PATH:
                cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
                _firebase_app = firebase_admin.initialize_app(cred)
            elif settings.FIREBASE_PROJECT_ID:
                # Use application default credentials (Cloud Run / GCP)
                _firebase_app = firebase_admin.initialize_app(
                    options={"projectId": settings.FIREBASE_PROJECT_ID}
                )
            else:
                log.warning("firebase_not_configured", msg="No Firebase credentials provided")
                return None
        else:
            _firebase_app = firebase_admin.get_app()
    except Exception as e:
        log.error("firebase_init_error", error=str(e))
        return None

    return _firebase_app


async def verify_firebase_token(id_token: str) -> dict:
    """Verify a Firebase ID token and return decoded claims."""
    from ..config import settings
    if settings.ENVIRONMENT == "development" and id_token == "dev_token_bypass":
        return {"uid": "dev_user", "email": "dev@visiora.app", "name": "Dev User"}

    app = _get_firebase_app()
    if app is None:
        # In dev without Firebase configured, allow through with mock user
        if settings.ENVIRONMENT == "development":
            return {"uid": "dev_user", "email": "dev@visiora.app", "name": "Dev User"}
        raise HTTPException(status_code=503, detail="Authentication service unavailable")

    try:
        from firebase_admin import auth
        decoded = auth.verify_id_token(id_token, app=app)
        return decoded
    except Exception as e:
        log.warning("firebase_token_invalid", error=str(e))
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")


class CurrentUser:
    """Dependency that extracts the current user from cookie or Authorization header."""

    def __init__(self, required: bool = True):
        self.required = required

    async def __call__(
        self,
        request: Request,
        authorization: Optional[str] = Header(None),
        session: Optional[str] = Cookie(None),
    ) -> Optional[dict]:
        log.info("auth_debug", headers=dict(request.headers), authorization=authorization)
        if authorization and authorization.startswith("Bearer "):
            token = authorization[7:]
            return await verify_firebase_token(token)
            
        if session:
            return await verify_firebase_token(session)

        if self.required:
            raise HTTPException(status_code=401, detail="Authentication required")
        return None


# Convenience dependencies
require_auth  = CurrentUser(required=True)
optional_auth = CurrentUser(required=False)
