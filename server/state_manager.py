from __future__ import annotations

import asyncio
import time
from typing import Any


class StateManager:
    """In-memory key-value store with TTL support and asyncio lock safety."""

    def __init__(self):
        self._data: dict[str, str | None] = {}
        self._expiry: dict[str, float] = {}  # key -> monotonic expiry time
        self._lock = asyncio.Lock()
        self._cleanup_task: asyncio.Task | None = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def get(self, key: str) -> str | None:
        async with self._lock:
            if self._is_expired(key):
                self._remove(key)
                return None
            return self._data.get(key)

    async def set(self, key: str, value: str | None, ttl_ms: int | None = None) -> None:
        async with self._lock:
            self._data[key] = value
            if ttl_ms is not None and ttl_ms > 0:
                self._expiry[key] = time.monotonic() + ttl_ms / 1000.0
            else:
                self._expiry.pop(key, None)

    async def delete(self, key: str) -> bool:
        async with self._lock:
            existed = key in self._data and not self._is_expired(key)
            self._remove(key)
            return existed

    async def exists(self, key: str) -> bool:
        async with self._lock:
            if self._is_expired(key):
                self._remove(key)
                return False
            return key in self._data

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start_cleanup(self, interval: float = 5.0) -> None:
        """Start a background task that periodically purges expired keys."""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.ensure_future(self._cleanup_loop(interval))

    async def stop(self) -> None:
        if self._cleanup_task is not None:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            self._cleanup_task = None

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _is_expired(self, key: str) -> bool:
        exp = self._expiry.get(key)
        if exp is None:
            return False
        return time.monotonic() >= exp

    def _remove(self, key: str) -> None:
        self._data.pop(key, None)
        self._expiry.pop(key, None)

    async def _cleanup_loop(self, interval: float) -> None:
        while True:
            await asyncio.sleep(interval)
            async with self._lock:
                now = time.monotonic()
                expired = [k for k, exp in self._expiry.items() if now >= exp]
                for k in expired:
                    self._remove(k)


# ------------------------------------------------------------------
# Module-level singleton
# ------------------------------------------------------------------

_instance: StateManager | None = None


def init_state_manager(sm: StateManager) -> None:
    global _instance
    _instance = sm


def get_state_manager() -> StateManager:
    assert _instance is not None, "StateManager not initialised – call init_state_manager() first"
    return _instance
