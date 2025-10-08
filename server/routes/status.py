import asyncio
import threading
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from fastapi.routing import APIRouter
from redis import Redis, RedisError
from starlette.websockets import WebSocket

from server.logger import logger
from server.models import StatusResponse
from server.redis_client import get_redis
from server.websockets import ConnectionManager

ws_manager = ConnectionManager()


def push_status_updates(stop_event, _ws_manager: ConnectionManager, loop: asyncio.BaseEventLoop):
    rdb = get_redis()
    last_status = None
    while True:
        if stop_event.is_set():
            break

        try:
            status = get_status(rdb)
            if status != last_status:
                last_status = status
                asyncio.run_coroutine_threadsafe(_ws_manager.broadcast(status.model_dump_json()), loop)
        except RedisError:
            rdb = get_redis()
        except Exception as e:
            logger.error(e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    stop_trigger = threading.Event()
    status_push_thread = threading.Thread(
        target=push_status_updates,
        args=(stop_trigger, ws_manager, asyncio.get_event_loop()),
        daemon=True
    )
    status_push_thread.start()
    yield
    stop_trigger.set()
    status_push_thread.join()  # wait for status loop to stop gracefully
    ws_manager.close()


api = APIRouter(prefix="/api/status", lifespan=lifespan)


def get_status(rdb: Redis = None) -> StatusResponse | None:
    rdb = get_redis() if rdb is None else rdb

    playing_raw = rdb.get("now_playing")
    if playing_raw:
        resp = StatusResponse.model_validate_json(playing_raw)
        resp.rms = float(rms_raw) if (rms_raw := rdb.get("rms")) else None

    else:
        resp = StatusResponse(
            success=False,
            message=rdb.get("message") or "",
            recorded_at=datetime.fromisoformat(rdb.get("recorded_at")) if rdb.exists("recorded_at") else None,
            rms=float(rms_raw) if (rms_raw := rdb.get("rms")) else None
        )

    resp.next_scan = datetime.fromisoformat(rdb.get("sleep.next_scan")) if rdb.exists("sleep.next_scan") else None
    resp.scan_ends = datetime.fromisoformat(rdb.get("now_scanning")) if rdb.exists("now_scanning") else None

    return resp


@api.get("/")
@api.get("")
async def api_get_status() -> StatusResponse:
    return get_status()


@api.websocket("/ws")
async def get_live_status(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive()
    except:
        ws_manager.disconnect(websocket)
