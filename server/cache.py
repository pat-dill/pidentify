"""
Process-local in-memory cache with TTL support.

Drop-in replacement for the previous Redis-backed ``@cached`` /
``@async_cached`` decorators.  Each process maintains its own independent
cache dict – no cross-process sharing required.
"""

import functools
import json
import time
from typing import Any


# Module-level cache: key -> (value_json, monotonic_expiry)
_cache: dict[str, tuple[Any, float]] = {}


def _get(key: str) -> Any | None:
    entry = _cache.get(key)
    if entry is None:
        return None
    value, expiry = entry
    if time.monotonic() >= expiry:
        _cache.pop(key, None)
        return None
    return value


def _set(key: str, value: Any, ttl: int) -> None:
    _cache[key] = (value, time.monotonic() + ttl)


def cached(ttl: int = 5 * 60, encoder=None, decoder=None, cache_none=False):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            key = f"cache:{func.__qualname__}:{args}:{kwargs}"
            cached_result = _get(key)
            if cached_result is not None:
                result = json.loads(cached_result)
                if decoder and result is not None:
                    result = decoder(result)
                return result

            to_cache = result = func(*args, **kwargs)
            if result is None and not cache_none:
                return result

            if encoder and to_cache is not None:
                to_cache = encoder(to_cache)

            _set(key, json.dumps(to_cache), ttl)
            return result

        return wrapper

    return decorator


def async_cached(ttl: int = 5 * 60, encoder=None, decoder=None, cache_none=False):
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            key = f"cache:{func.__qualname__}:{args}:{kwargs}"
            cached_result = _get(key)
            if cached_result is not None:
                result = json.loads(cached_result)
                if decoder and result is not None:
                    result = decoder(result)
                return result

            to_cache = result = await func(*args, **kwargs)
            if result is None and not cache_none:
                return result

            if encoder and to_cache is not None:
                to_cache = encoder(to_cache)

            _set(key, json.dumps(to_cache), ttl)
            return result

        return wrapper

    return decorator
