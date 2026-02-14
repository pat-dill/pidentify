"""
Webserver peer singleton -- the FastAPI app's handle into the IPC bus.

Used by ``app.py`` and route modules to send commands and access state.
"""

from __future__ import annotations

from server.ipc.peer import Peer


_instance: Peer | None = None


def init_webserver_peer(broker_dir: str) -> Peer:
    """Create, store, and return the webserver peer singleton.

    The caller must ``await peer.start()`` afterwards.
    """
    global _instance

    peer = Peer("webserver", broker_dir)
    _instance = peer
    return peer


def get_webserver_peer() -> Peer:
    assert _instance is not None, "Webserver peer not initialised – call init_webserver_peer() first"
    return _instance
