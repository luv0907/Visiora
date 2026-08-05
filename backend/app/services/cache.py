import time
from typing import Any, Optional
from ..config import settings

class SimpleCache:
    """In-memory cache for repeated LLM queries."""
    def __init__(self):
        self._store = {}
        
    def get(self, key: str) -> Optional[Any]:
        if key in self._store:
            val, expiry = self._store[key]
            if time.time() < expiry:
                return val
            else:
                del self._store[key]
        return None
        
    def set(self, key: str, value: Any, ttl: int = None):
        if ttl is None:
            ttl = getattr(settings, 'CACHE_TTL_SECONDS', 600)
        self._store[key] = (value, time.time() + ttl)
        
    def clear(self):
        self._store.clear()

# Singleton instance
cache = SimpleCache()
