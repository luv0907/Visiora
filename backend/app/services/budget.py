import structlog
from datetime import datetime, timezone
from ..config import settings
from .progress import get_db

log = structlog.get_logger()

# Fallback for dev mode when Firestore is missing
_fallback_budget = 0
_fallback_date = ""

def get_today_string():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

async def check_budget_available(estimated_cost: int = 1000) -> bool:
    """Check if we have enough daily tokens remaining in the budget."""
    db = get_db()
    today = get_today_string()
    
    if not db:
        # Fallback for local dev without firebase
        global _fallback_budget, _fallback_date
        if _fallback_date != today:
            _fallback_date = today
            _fallback_budget = 0
        if _fallback_budget + estimated_cost > settings.LLM_DAILY_TOKEN_CAP:
            log.warning("budget_exceeded_fallback")
            return False
        return True
        
    doc_ref = db.collection("system").document("tokenUsage").collection("daily").document(today)
    doc = doc_ref.get()
    
    current_usage = 0
    if doc.exists:
        current_usage = doc.to_dict().get("tokens", 0)
        
    if current_usage + estimated_cost > settings.LLM_DAILY_TOKEN_CAP:
        log.warning("budget_exceeded", usage=current_usage, cap=settings.LLM_DAILY_TOKEN_CAP)
        return False
        
    return True

async def record_token_usage(tokens: int):
    """Persist used tokens to Firestore immediately."""
    db = get_db()
    today = get_today_string()
    
    if not db:
        global _fallback_budget, _fallback_date
        if _fallback_date != today:
            _fallback_date = today
            _fallback_budget = 0
        _fallback_budget += tokens
        return
        
    from firebase_admin import firestore
    doc_ref = db.collection("system").document("tokenUsage").collection("daily").document(today)
    
    try:
        # Using Firestore Increment for atomic updates across instances
        doc_ref.set({"tokens": firestore.Increment(tokens)}, merge=True)
    except Exception as e:
        log.error("record_token_usage_error", error=str(e))
