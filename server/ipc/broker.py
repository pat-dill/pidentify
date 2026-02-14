"""
ZeroMQ message broker for inter-service communication.

Binds three sockets inside the configured runtime directory:

* **XSUB** (``sub.sock``) -- peers publish events here
* **XPUB** (``pub.sock``) -- peers subscribe to events here
* **ROUTER** (``cmd.sock``) -- peers send/receive directed commands here

The broker forwards pub/sub traffic transparently (XSUB ↔ XPUB proxy)
and routes command messages between peers based on the target identity
frame.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

import zmq
import zmq.asyncio

from server.logger import logger


class Broker:
    """ZeroMQ message broker -- runs in the core process's event loop."""

    def __init__(self, broker_dir: str) -> None:
        self._dir = broker_dir
        self._ctx: zmq.asyncio.Context | None = None
        self._xsub: zmq.asyncio.Socket | None = None
        self._xpub: zmq.asyncio.Socket | None = None
        self._router: zmq.asyncio.Socket | None = None
        self._proxy_task: asyncio.Task | None = None
        self._router_task: asyncio.Task | None = None

    # ------------------------------------------------------------------
    # Socket paths
    # ------------------------------------------------------------------

    @property
    def sub_endpoint(self) -> str:
        return f"ipc://{self._dir}/sub.sock"

    @property
    def pub_endpoint(self) -> str:
        return f"ipc://{self._dir}/pub.sock"

    @property
    def cmd_endpoint(self) -> str:
        return f"ipc://{self._dir}/cmd.sock"

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def start(self) -> None:
        Path(self._dir).mkdir(parents=True, exist_ok=True)

        # Clean stale socket files
        for name in ("sub.sock", "pub.sock", "cmd.sock"):
            try:
                os.unlink(Path(self._dir) / name)
            except FileNotFoundError:
                pass

        self._ctx = zmq.asyncio.Context()

        # PUB/SUB proxy sockets
        self._xsub = self._ctx.socket(zmq.XSUB)
        self._xsub.bind(self.sub_endpoint)

        self._xpub = self._ctx.socket(zmq.XPUB)
        self._xpub.bind(self.pub_endpoint)

        # Command router
        self._router = self._ctx.socket(zmq.ROUTER)
        self._router.setsockopt(zmq.ROUTER_MANDATORY, 1)
        self._router.bind(self.cmd_endpoint)

        self._proxy_task = asyncio.create_task(self._run_proxy())
        self._router_task = asyncio.create_task(self._run_router())

        logger.info(
            f"IPC broker started  pub={self.pub_endpoint}  "
            f"sub={self.sub_endpoint}  cmd={self.cmd_endpoint}"
        )

    async def stop(self) -> None:
        for task in (self._proxy_task, self._router_task):
            if task is not None:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        for sock in (self._xsub, self._xpub, self._router):
            if sock is not None:
                sock.close()

        if self._ctx is not None:
            self._ctx.term()

        for name in ("sub.sock", "pub.sock", "cmd.sock"):
            try:
                os.unlink(Path(self._dir) / name)
            except FileNotFoundError:
                pass

    # ------------------------------------------------------------------
    # PUB/SUB proxy
    # ------------------------------------------------------------------

    async def _run_proxy(self) -> None:
        """Forward messages between XSUB and XPUB (async proxy)."""
        assert self._xsub is not None and self._xpub is not None

        poller = zmq.asyncio.Poller()
        poller.register(self._xsub, zmq.POLLIN)
        poller.register(self._xpub, zmq.POLLIN)

        try:
            while True:
                events = dict(await poller.poll())

                if self._xsub in events:
                    # Data message from a publisher → forward to subscribers
                    msg = await self._xsub.recv_multipart()
                    await self._xpub.send_multipart(msg)

                if self._xpub in events:
                    # Subscription control message from a subscriber → forward
                    msg = await self._xpub.recv_multipart()
                    await self._xsub.send_multipart(msg)
        except asyncio.CancelledError:
            pass

    # ------------------------------------------------------------------
    # Command router
    # ------------------------------------------------------------------

    async def _run_router(self) -> None:
        """Route directed commands between peers.

        Frame layout from ROUTER recv:
            [sender_identity, target_peer, type, ...]

        The broker swaps sender/target and forwards:
            [target_peer, sender_identity, type, ...]
        """
        assert self._router is not None

        try:
            while True:
                frames = await self._router.recv_multipart()

                if len(frames) < 3:
                    logger.warning(f"IPC broker: malformed command ({len(frames)} frames)")
                    continue

                sender = frames[0]
                target = frames[1]

                try:
                    await self._router.send_multipart([target, sender] + frames[2:])
                except zmq.ZMQError as exc:
                    # Target peer not connected -- send error back to sender
                    logger.debug(
                        f"IPC broker: cannot route to {target!r}: {exc}"
                    )
                    # Build an error response so the sender's future resolves
                    # Frame layout: [sender, "broker", "ERR", uuid, error_json]
                    if len(frames) >= 4:
                        # frames[3] is the uuid
                        import json
                        err_payload = json.dumps({
                            "error": f"peer not connected: {target.decode(errors='replace')}"
                        }).encode()
                        await self._router.send_multipart([
                            sender, b"broker", b"ERR", frames[3], err_payload,
                        ])
        except asyncio.CancelledError:
            pass
