"""
State peer singleton -- exposes the StateManager over IPC as ``Peer("state")``.

Commands: ``state.get``, ``state.set``, ``state.delete``, ``state.exists``
"""

from __future__ import annotations

from server.ipc.peer import Peer
from server.state_manager import StateManager


_instance: Peer | None = None


def init_state_peer(sm: StateManager, broker_dir: str) -> Peer:
    """Create, configure, and store the state peer singleton.

    The caller must ``await peer.start()`` afterwards.
    """
    global _instance

    peer = Peer("state", broker_dir)

    @peer.on_command("get")
    async def _get(data: dict) -> str | None:
        return await sm.get(data["key"])

    @peer.on_command("set")
    async def _set(data: dict) -> None:
        await sm.set(data["key"], data.get("value"), ttl_ms=data.get("ttl_ms"))

    @peer.on_command("delete")
    async def _delete(data: dict) -> bool:
        return await sm.delete(data["key"])

    @peer.on_command("exists")
    async def _exists(data: dict) -> bool:
        return await sm.exists(data["key"])

    _instance = peer
    return peer


def get_state_peer() -> Peer:
    assert _instance is not None, "State peer not initialised – call init_state_peer() first"
    return _instance
