"""Redis caching utilities for content-service."""
import json
import os
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ----- connection -----
_redis_client = None


def _get_client():
    """Lazily initialise and return the Redis client (or None on failure)."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        import redis  # type: ignore

        url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        _redis_client = redis.from_url(url, decode_responses=True, socket_connect_timeout=2)
        _redis_client.ping()
        logger.info("Redis cache connected.")
    except Exception as exc:  # pragma: no cover
        logger.warning("Redis unavailable, caching disabled: %s", exc)
        _redis_client = None
    return _redis_client


# ----- public helpers -----

def get_cache(key: str) -> Optional[Any]:
    """Return the cached value for *key*, or None if missing / Redis down."""
    client = _get_client()
    if client is None:
        return None
    try:
        raw = client.get(key)
        return json.loads(raw) if raw is not None else None
    except Exception as exc:
        logger.debug("Cache GET error for %s: %s", key, exc)
        return None


def set_cache(key: str, value: Any, ttl: int = 300) -> None:
    """Serialise *value* to JSON and store it with the given TTL (seconds)."""
    client = _get_client()
    if client is None:
        return
    try:
        client.setex(key, ttl, json.dumps(value, default=str))
    except Exception as exc:
        logger.debug("Cache SET error for %s: %s", key, exc)


def invalidate_cache(pattern: str) -> None:
    """Delete all keys matching *pattern* (glob-style, e.g. 'articles:*')."""
    client = _get_client()
    if client is None:
        return
    try:
        keys = client.keys(pattern)
        if keys:
            client.delete(*keys)
    except Exception as exc:
        logger.debug("Cache INVALIDATE error for %s: %s", pattern, exc)
