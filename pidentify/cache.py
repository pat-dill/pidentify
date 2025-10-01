import functools
import json

from pidentify.redis_client import get_redis


def cached(ttl: int = 5 * 60, encoder=None, decoder=None, cache_none=False):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            redis_client = get_redis()

            key = f"cache:{func.__qualname__}:{args}:{kwargs}"
            cached_result = redis_client.get(key)
            if cached_result:
                result = json.loads(cached_result)
                if decoder and result is not None:
                    result = decoder(result)

                return result

            to_cache = result = func(*args, **kwargs)
            if result is None and not cache_none:
                return result

            if encoder and to_cache is not None:
                to_cache = encoder(to_cache)

            redis_client.set(key, json.dumps(to_cache), ex=ttl)
            return result

        return wrapper

    return decorator


def async_cached(ttl: int = 5 * 60, encoder=None, decoder=None, cache_none=False):
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            redis_client = get_redis()

            key = f"cache:{func.__qualname__}:{args}:{kwargs}"
            cached_result = redis_client.get(key)
            if cached_result:
                result = json.loads(cached_result)
                if decoder and result is not None:
                    result = decoder(result)

                return result

            to_cache = result = await func(*args, **kwargs)
            if result is None and not cache_none:
                return result

            if encoder and to_cache is not None:
                to_cache = encoder(to_cache)

            redis_client.set(key, json.dumps(to_cache), ex=ttl)
            return result

        return wrapper

    return decorator
