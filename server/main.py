"""
Central service entry point.

Bootstraps the asyncio event loop and runs:
1. The ZeroMQ message broker
2. The StateManager (in-memory KV with TTL) as a "state" peer
3. A "webserver" peer for the FastAPI application
4. The recorder service (as a subprocess with realtime priority)
5. Uvicorn serving the FastAPI application
"""

import asyncio
import os
import signal
import subprocess
import sys
from pathlib import Path

# Ensure the parent of /server is on sys.path so ``server.*`` imports work
# when invoked as ``python main.py`` from inside /server.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import uvicorn

from server.background.sound import RESTART_EXIT_CODE
from server.config import env_config
from server.logger import logger
from server.state_manager import StateManager, init_state_manager
from server.ipc.broker import Broker
from server.ipc.state_peer import init_state_peer
from server.ipc.webserver_peer import init_webserver_peer

RECORDER_SCRIPT = str(Path(__file__).resolve().parent / "background" / "sound.py")


def _try_nice() -> None:
    """Attempt to raise process priority; silently fall back if unprivileged."""
    try:
        os.nice(-10)
    except PermissionError:
        pass  # requires root / CAP_SYS_NICE


def _spawn_recorder() -> subprocess.Popen:
    """Spawn the recorder subprocess with realtime (nice) priority."""
    proc = subprocess.Popen(
        [sys.executable, "-u", RECORDER_SCRIPT],
        env={**os.environ, "PYTHONPATH": str(Path(__file__).resolve().parents[1])},
        preexec_fn=_try_nice,
    )
    logger.info(f"Recorder process started (pid={proc.pid})")
    return proc


async def _supervise_recorder(stop_event: asyncio.Event) -> None:
    """Watch the recorder subprocess; respawn on restart exit code."""
    loop = asyncio.get_event_loop()
    proc = _spawn_recorder()

    while not stop_event.is_set():
        # Poll without blocking the event loop
        exit_code = await loop.run_in_executor(None, proc.wait)

        if stop_event.is_set():
            break

        if exit_code == RESTART_EXIT_CODE:
            logger.info("Recorder requested restart – respawning")
            proc = _spawn_recorder()
        else:
            logger.warning(f"Recorder exited unexpectedly (code={exit_code}) – respawning")
            await asyncio.sleep(1)  # brief back-off before respawn
            proc = _spawn_recorder()

    # Cleanup on shutdown
    if proc.poll() is None:
        proc.send_signal(signal.SIGTERM)
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()
    logger.info("Recorder supervisor stopped")


async def main() -> None:
    broker_dir = env_config.ipc_broker_dir

    # -- ZeroMQ broker --------------------------------------------------
    broker = Broker(broker_dir)
    await broker.start()

    # -- State manager + state peer -------------------------------------
    state_manager = StateManager()
    init_state_manager(state_manager)
    state_manager.start_cleanup(interval=5.0)

    state_peer = init_state_peer(state_manager, broker_dir)
    await state_peer.start()

    # -- Webserver peer -------------------------------------------------
    ws_peer = init_webserver_peer(broker_dir)
    await ws_peer.start()

    # -- Recorder service (supervised subprocess) -----------------------
    recorder_stop = asyncio.Event()
    recorder_task = asyncio.create_task(_supervise_recorder(recorder_stop))

    # -- Uvicorn (FastAPI) ----------------------------------------------
    port = int(os.environ.get("PORT", 8000))
    config = uvicorn.Config(
        "server.app:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
    )
    server = uvicorn.Server(config)

    try:
        await server.serve()
    finally:
        recorder_stop.set()
        await recorder_task

        await ws_peer.stop()
        await state_peer.stop()
        await state_manager.stop()
        await broker.stop()


if __name__ == "__main__":
    asyncio.run(main())
