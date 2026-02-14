import asyncio
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from fastapi.routing import APIRouter
from starlette.requests import Request
from starlette.websockets import WebSocket

from server.config import env_config
from server.logger import logger
from server.models import StatusResponse
from server.ipc.webserver_peer import get_webserver_peer
from server.ws_manager import ConnectionManager

ws_manager = ConnectionManager()


async def push_status_updates(stop_event: asyncio.Event, _ws_manager: ConnectionManager):
    last_status = None
    while not stop_event.is_set():
        try:
            status = await get_status()
            if status != last_status:
                last_status = status
                await _ws_manager.broadcast(status.model_dump_json())
        except Exception as e:
            logger.error(e)

        try:
            await asyncio.wait_for(stop_event.wait(), timeout=0.25)
            break
        except asyncio.TimeoutError:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    stop_trigger = asyncio.Event()
    task = asyncio.create_task(push_status_updates(stop_trigger, ws_manager))
    yield
    stop_trigger.set()
    await task
    ws_manager.close()


api = APIRouter(prefix="/api/status", lifespan=lifespan)


async def get_status() -> StatusResponse:
    peer = get_webserver_peer()

    playing_raw = await peer.state_get("now_playing")
    rms_raw = await peer.state_get("rms")

    if playing_raw:
        resp = StatusResponse.model_validate_json(playing_raw)
        resp.rms = float(rms_raw) if rms_raw else None
    else:
        message = await peer.state_get("message") or ""
        recorded_at_raw = await peer.state_get("recorded_at")
        resp = StatusResponse(
            success=False,
            message=message,
            recorded_at=datetime.fromisoformat(recorded_at_raw) if recorded_at_raw else None,
            rms=float(rms_raw) if rms_raw else None,
        )

    next_scan_raw = await peer.state_get("sleep.next_scan")
    resp.next_scan = datetime.fromisoformat(next_scan_raw) if next_scan_raw else None

    now_scanning_raw = await peer.state_get("now_scanning")
    resp.scan_ends = datetime.fromisoformat(now_scanning_raw) if now_scanning_raw else None

    return resp


@api.get("/")
@api.get("")
async def api_get_status() -> StatusResponse:
    return await get_status()


@api.get("/websocket-host")
async def get_websocket_host(request: Request, scheme: str) -> str:
    if scheme == "https":
        return env_config.https_websocket_url
    else:
        return env_config.http_websocket_url


@api.websocket("/ws")
async def get_live_status(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive()
    except:
        ws_manager.disconnect(websocket)
