import time
from datetime import timedelta

from redis import Redis
from server.config import env_config
from server.utils import utcnow


def get_redis():
    return Redis(host=env_config.redis_host, port=env_config.redis_port, decode_responses=True)


def sleep(sleep_id: str, seconds: int | float, poll_interval=0.2):
    if seconds <= 0:
        return
    elif seconds < poll_interval:
        time.sleep(seconds)
        return

    rdb = get_redis()
    key = f"sleep.{sleep_id}"
    ends_at = utcnow() + timedelta(seconds=seconds)
    rdb.set(key, ends_at.isoformat(), px=int(seconds * 1000))

    while rdb.get(key):
        time.sleep(poll_interval)
