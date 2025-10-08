import math
import re
from datetime import datetime, timezone
from ipaddress import IPv4Address, IPv6Address
from typing import Sequence, Any

import numpy as np
from pydantic import TypeAdapter
from sqlalchemy import inspect
from sqlalchemy.orm import DeclarativeBase
from starlette.requests import Request


def utcnow():
    return datetime.now(timezone.utc)


def duration_to_seconds(duration_str: str) -> int:
    factors = (1, 60, 60 * 60, 24 * 60 * 60)
    parts = duration_str.split(":")
    seconds = 0
    for i, part in enumerate(reversed(parts)):
        seconds += int(part) * factors[i]

    return seconds


def get_keywords(text: str):
    return [
        keyword
        for keyword in re.sub(r"[^\w0-9 ]+", "", text.replace("_", " ").strip().lower()).split(" ")
        if keyword
    ]


def flatten(xss):
    return [x for xs in xss for x in xs]


def handle_filters_arg(model, filters):
    return flatten([
        [getattr(model, k) == v for k, v in filter_.items()]
        if isinstance(filter_, dict)
        else [filter_]
        for filter_ in filters
    ])


def safe_filename(filename):
    filename = re.sub(r"[<>:\"/\\|?*\x00-\x1F]", "", filename)
    filename = filename.strip()
    filename = filename[:255]
    return filename


def clamp(n, min_, max_):
    return min(max(n, min_), max_)


def normalize(raw: np.array):
    return 2 * (raw - raw.min()) / (raw.max() - raw.min()) - 1


def is_local_client(request: Request):
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        # X-Forwarded-For can contain multiple IPs, the first one is the client IP
        raw_client_ip = x_forwarded_for.split(",")[0].strip()
    else:
        # Fallback to the direct client IP
        raw_client_ip = request.client.host

    ip_adapter = TypeAdapter(IPv4Address | IPv6Address)
    # noinspection PyTypeChecker
    client_ip: IPv4Address | IPv6Address = ip_adapter.validate_python(raw_client_ip)

    return client_ip.is_private


def chunk_list(lst: Sequence, x: int):
    n = len(lst)
    base_size = n // x
    remainder = n % x

    start = 0
    for i in range(x):
        size = base_size + (1 if i < remainder else 0)
        end = start + size
        yield lst[start:end]
        start = end


def average(gen):
    total = 0
    count = 0
    for value in gen:
        total += value
        count += 1

    return total / count if count else None


def safe_log(v, base):
    if v == 0:
        return 0
    else:
        return math.log(v, base)


def db_model_dict(obj: DeclarativeBase) -> dict[str, Any]:
    def _unwrap(value):
        if isinstance(value, list):
            return [_unwrap(item) for item in value]
        elif isinstance(value, DeclarativeBase):
            return dbmodel_dict(value)
        else:
            return value

    insp = inspect(obj)
    return {
        attr_name: _unwrap(getattr(obj, attr_name))
        for attr_name, column in insp.attrs.items()
        if column.key not in insp.unloaded
    }
