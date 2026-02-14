"""
Generic ZeroMQ peer for inter-service communication.

Each peer connects to the broker's three sockets (PUB/SUB/ROUTER) and
provides decorator-based handler registration plus async dispatch
methods:

* ``peer.broadcast(topic, data)`` -- fire-and-forget event via PUB
* ``peer.command("target.method", data)`` -- directed request/response via DEALER
* ``@peer.on_event(topic)`` -- subscribe + register handler
* ``@peer.on_command(method)`` -- register command handler

Also provides ``SyncPeer`` for thread-safe blocking access.
"""

from __future__ import annotations

import asyncio
import json
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

import zmq
import zmq.asyncio

from server.logger import logger


class Peer:
    """A single ZeroMQ peer that connects to the broker."""

    def __init__(self, identity: str, broker_dir: str) -> None:
        self.identity = identity
        self._broker_dir = broker_dir

        self._ctx: zmq.asyncio.Context | None = None
        self._pub: zmq.asyncio.Socket | None = None
        self._sub: zmq.asyncio.Socket | None = None
        self._dealer: zmq.asyncio.Socket | None = None

        # Handler registries (populated before start())
        self._event_handlers: dict[str, Callable[..., Awaitable[None]]] = {}
        self._command_handlers: dict[str, Callable[..., Awaitable[Any]]] = {}

        # Pending outgoing command futures keyed by request UUID
        self._pending: dict[str, asyncio.Future[Any]] = {}

        # Background receive tasks
        self._sub_task: asyncio.Task | None = None
        self._dealer_task: asyncio.Task | None = None

    # ------------------------------------------------------------------
    # Decorator-based handler registration
    # ------------------------------------------------------------------

    def on_event(self, topic: str) -> Callable:
        """Decorator: register an async handler for a broadcast event.

        Usage::

            @peer.on_event("volume_update")
            async def handle_volume(data):
                ...
        """
        def decorator(fn: Callable[..., Awaitable[None]]) -> Callable[..., Awaitable[None]]:
            self._event_handlers[topic] = fn
            return fn
        return decorator

    def on_command(self, method: str) -> Callable:
        """Decorator: register an async handler for a directed command.

        Usage::

            @peer.on_command("start_rip")
            async def handle_rip(data):
                return {"status": "ok"}

        The handler receives the deserialised payload and must return a
        JSON-serialisable result (or ``None``).
        """
        def decorator(fn: Callable[..., Awaitable[Any]]) -> Callable[..., Awaitable[Any]]:
            self._command_handlers[method] = fn
            return fn
        return decorator

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def start(self) -> None:
        """Connect to the broker and start background receive loops."""
        self._ctx = zmq.asyncio.Context()

        # PUB socket → broker XSUB
        self._pub = self._ctx.socket(zmq.PUB)
        self._pub.connect(f"ipc://{self._broker_dir}/sub.sock")

        # SUB socket → broker XPUB
        self._sub = self._ctx.socket(zmq.SUB)
        self._sub.connect(f"ipc://{self._broker_dir}/pub.sock")
        # Subscribe to all registered event topics
        for topic in self._event_handlers:
            self._sub.setsockopt_string(zmq.SUBSCRIBE, topic)

        # DEALER socket → broker ROUTER
        self._dealer = self._ctx.socket(zmq.DEALER)
        self._dealer.setsockopt(zmq.IDENTITY, self.identity.encode())
        self._dealer.connect(f"ipc://{self._broker_dir}/cmd.sock")

        self._sub_task = asyncio.create_task(self._sub_loop())
        self._dealer_task = asyncio.create_task(self._dealer_loop())

        logger.info(f"IPC peer '{self.identity}' started")

    async def stop(self) -> None:
        """Cancel background tasks and close sockets."""
        for task in (self._sub_task, self._dealer_task):
            if task is not None:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        for sock in (self._pub, self._sub, self._dealer):
            if sock is not None:
                sock.close()

        if self._ctx is not None:
            self._ctx.term()

    # ------------------------------------------------------------------
    # Dispatching: broadcasts
    # ------------------------------------------------------------------

    async def broadcast(self, topic: str, data: Any = None) -> None:
        """Publish a fire-and-forget event to all subscribers."""
        assert self._pub is not None, "Peer not started"
        payload = json.dumps(data, separators=(",", ":"), default=str).encode()
        await self._pub.send_multipart([topic.encode(), payload])

    # ------------------------------------------------------------------
    # Dispatching: directed commands
    # ------------------------------------------------------------------

    async def command(
        self,
        target_method: str,
        data: Any = None,
        timeout: float = 10,
    ) -> Any:
        """Send a directed command and wait for the response.

        *target_method* has the form ``"peer_id.method"`` -- e.g.
        ``"recorder.start_rip"``.
        """
        assert self._dealer is not None, "Peer not started"

        dot = target_method.index(".")
        target_peer = target_method[:dot]
        method = target_method[dot + 1:]

        req_id = uuid.uuid4().hex
        payload = json.dumps(data, separators=(",", ":"), default=str).encode()

        fut: asyncio.Future[Any] = asyncio.get_event_loop().create_future()
        self._pending[req_id] = fut

        await self._dealer.send_multipart([
            target_peer.encode(),   # target identity
            b"REQ",                 # message type
            req_id.encode(),        # correlation id
            method.encode(),        # command method
            payload,                # JSON payload
        ])

        try:
            return await asyncio.wait_for(fut, timeout=timeout)
        finally:
            self._pending.pop(req_id, None)

    # ------------------------------------------------------------------
    # State convenience wrappers
    # ------------------------------------------------------------------

    async def state_get(self, key: str) -> str | None:
        return await self.command("state.get", {"key": key})

    async def state_set(self, key: str, value: str | None, ttl_ms: int | None = None) -> None:
        params: dict[str, Any] = {"key": key, "value": value}
        if ttl_ms is not None:
            params["ttl_ms"] = ttl_ms
        await self.command("state.set", params)

    async def state_delete(self, key: str) -> bool:
        return bool(await self.command("state.delete", {"key": key}))

    async def state_exists(self, key: str) -> bool:
        return bool(await self.command("state.exists", {"key": key}))

    # ------------------------------------------------------------------
    # Background receive loops
    # ------------------------------------------------------------------

    async def _sub_loop(self) -> None:
        """Receive broadcast events from the broker and dispatch."""
        assert self._sub is not None
        try:
            while True:
                frames = await self._sub.recv_multipart()
                if len(frames) < 2:
                    continue

                topic = frames[0].decode()
                try:
                    data = json.loads(frames[1])
                except Exception:
                    data = None

                handler = self._event_handlers.get(topic)
                if handler is not None:
                    try:
                        await handler(data)
                    except Exception as exc:
                        logger.error(f"IPC event handler error ({topic}): {exc}")
        except asyncio.CancelledError:
            pass

    async def _dealer_loop(self) -> None:
        """Receive command requests and responses from the broker."""
        assert self._dealer is not None
        try:
            while True:
                frames = await self._dealer.recv_multipart()
                # Minimum: [sender, type, uuid, ...]
                if len(frames) < 3:
                    logger.warning(f"IPC peer '{self.identity}': malformed dealer msg ({len(frames)} frames)")
                    continue

                sender = frames[0].decode()
                msg_type = frames[1]
                req_id = frames[2].decode()

                if msg_type == b"REQ":
                    # Incoming command request
                    method = frames[3].decode() if len(frames) > 3 else ""
                    try:
                        payload = json.loads(frames[4]) if len(frames) > 4 else None
                    except Exception:
                        payload = None

                    await self._handle_command(sender, req_id, method, payload)

                elif msg_type == b"RES":
                    # Incoming command response
                    try:
                        result = json.loads(frames[3]) if len(frames) > 3 else None
                    except Exception:
                        result = None
                    self._resolve_response(req_id, result, error=None)

                elif msg_type == b"ERR":
                    # Error response from broker (peer not connected, etc.)
                    try:
                        err = json.loads(frames[3]) if len(frames) > 3 else {}
                    except Exception:
                        err = {}
                    self._resolve_response(
                        req_id, result=None,
                        error=err.get("error", "unknown error"),
                    )

                else:
                    logger.debug(
                        f"IPC peer '{self.identity}': unknown msg type {msg_type!r}"
                    )

        except asyncio.CancelledError:
            pass

    async def _handle_command(self, sender: str, req_id: str, method: str, payload: Any) -> None:
        """Dispatch an incoming command and send the response back."""
        handler = self._command_handlers.get(method)
        if handler is None:
            logger.warning(
                f"IPC peer '{self.identity}': no handler for command '{method}'"
            )
            err_payload = json.dumps({"error": f"unknown command: {method}"}).encode()
            await self._dealer.send_multipart([
                sender.encode(), b"ERR", req_id.encode(), err_payload,
            ])
            return

        try:
            result = await handler(payload)
            result_bytes = json.dumps(result, separators=(",", ":"), default=str).encode()
            await self._dealer.send_multipart([
                sender.encode(), b"RES", req_id.encode(), result_bytes,
            ])
        except Exception as exc:
            logger.error(f"IPC command handler error ({method}): {exc}")
            err_payload = json.dumps({"error": str(exc)}).encode()
            await self._dealer.send_multipart([
                sender.encode(), b"ERR", req_id.encode(), err_payload,
            ])

    def _resolve_response(self, req_id: str, result: Any, error: str | None) -> None:
        """Match an incoming response/error to a pending future."""
        fut = self._pending.get(req_id)
        if fut is None or fut.done():
            logger.debug(f"IPC peer '{self.identity}': unexpected response id={req_id}")
            return
        if error is not None:
            fut.set_exception(RuntimeError(error))
        else:
            fut.set_result(result)


# ------------------------------------------------------------------
# SyncPeer -- blocking wrapper for use from plain threads
# ------------------------------------------------------------------

class SyncPeer:
    """Blocking wrapper around :class:`Peer` for worker threads.

    Every call schedules a coroutine on the given *loop* via
    ``run_coroutine_threadsafe`` and blocks on the result.
    """

    def __init__(self, peer: Peer, loop: asyncio.AbstractEventLoop) -> None:
        self._peer = peer
        self._loop = loop

    def _run(self, coro: Any, timeout: float = 10) -> Any:
        return asyncio.run_coroutine_threadsafe(coro, self._loop).result(timeout)

    # State convenience methods
    def state_get(self, key: str) -> str | None:
        return self._run(self._peer.state_get(key))

    def state_set(self, key: str, value: str | None, ttl_ms: int | None = None) -> None:
        self._run(self._peer.state_set(key, value, ttl_ms=ttl_ms))

    def state_delete(self, key: str) -> bool:
        return self._run(self._peer.state_delete(key))

    def state_exists(self, key: str) -> bool:
        return self._run(self._peer.state_exists(key))

    # Generic dispatch
    def broadcast(self, topic: str, data: Any = None) -> None:
        self._run(self._peer.broadcast(topic, data))

    def command(self, target_method: str, data: Any = None, timeout: float = 10) -> Any:
        return self._run(self._peer.command(target_method, data, timeout=timeout), timeout=timeout + 2)
