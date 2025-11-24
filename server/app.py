import json
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path

import httpx
from fastapi.exceptions import RequestValidationError
from fastapi.openapi.utils import get_openapi
from sqlalchemy.sql import true
from starlette.requests import Request
from starlette.responses import FileResponse, JSONResponse

from server.auth import get_session, is_admin
from server.models import ResponseModel, LyricLine, Lyrics
from server.utils import safe_filename, is_local_client
from server.config import ClientConfig, FileConfig, env_config
from server.exceptions import ErrorResponse

sys.path.append(str(Path(__file__).parents))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.redis_client import get_redis
from server.routes import status, history, rip_tool, auth, settings
from server.routes.status import get_status

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(status.api)
app.include_router(history.api)
app.include_router(rip_tool.api)
app.include_router(auth.api)
app.include_router(settings.api)


@app.post("/api/scan-now")
def scan_now(request: Request) -> ResponseModel:
    if is_local_client(request):
        rdb = get_redis()
        rdb.delete("sleep.next_scan")
        return ResponseModel(success=True, status="")
    else:
        raise ErrorResponse(401, "not_authorized")


@app.get("/api/dump", response_model=None)
async def dump_audio(request: Request, mins: float = 1) -> ResponseModel | FileResponse:
    if is_local_client(request):
        rdb = get_redis()
        rdb.publish("dump", f"{float(mins * 60)}")

        ps = rdb.pubsub()
        ps.subscribe("dump_response")
        ps.get_message(timeout=1)
        resp_raw = ps.get_message(timeout=30)

        if resp_raw is None:
            raise ErrorResponse(500, "timed_out")
        else:
            resp = ResponseModel.model_validate_json(resp_raw["data"])
            if resp.data:
                return FileResponse(
                    resp.data,
                    filename=f"{safe_filename(datetime.now().isoformat())}.flac"
                )
            else:
                return resp

    else:
        raise ErrorResponse(401, "not_authorized")


@app.get("/api/lyrics")
def get_current_lyrics():
    cur_status = get_status()
    if cur_status.track is None:
        raise ErrorResponse(400, "no_track")

    rdb = get_redis()
    if rdb.exists(f"lyrics:{cur_status.track.track_id}"):
        return Lyrics.model_validate_json(rdb.get(f"lyrics:{cur_status.track.track_id}"))

    params = {
        "track_name": cur_status.track.track_name,
        "artist_name": cur_status.track.artist_name,
    }

    # if cur_status.duration_seconds:
    #     params["duration"] = str(round(cur_status.duration_seconds))

    lrclib_resp = httpx.get("https://lrclib.net/api/get",
                            params=params,
                            headers={"User-Agent": env_config.user_agent},
                            timeout=30)
    if not lrclib_resp.is_success:
        raise ErrorResponse(404, "lyrics_not_found")

    raw_lyrics = lrclib_resp.json()
    if raw_lyrics.get("syncedLyrics"):
        lyric_lines = []
        for line in raw_lyrics["syncedLyrics"].split("\n"):
            timestamp, words = line.split(" ", 1)
            minutes, seconds = timestamp[1:-1].split(":")
            lyric_lines.append(LyricLine(
                start_time_ms=int(float(minutes) * 60000 + float(seconds) * 1000),
                words=words,
            ))

        lyrics = Lyrics(synced=True, lines=lyric_lines)
    else:
        lyrics = Lyrics(synced=False, lines=[
            LyricLine(start_time_ms=0, words=line)
            for line in raw_lyrics["plainLyrics"].split("\n")
        ])

    rdb.set(f"lyrics:{cur_status.track.track_id}", lyrics.model_dump_json(), px=timedelta(days=7))
    return lyrics



@app.get("/api/config")
async def get_client_config(request: Request) -> ClientConfig:
    is_local = is_local_client(request)

    file_config = FileConfig.load()

    return ClientConfig(
        can_skip=is_local,
        can_save=is_local,
        can_edit_history=is_local,
        buffer_length_seconds=file_config.buffer_length_seconds,
        temp_save_offset=file_config.temp_save_offset,
        initial_setup_complete=file_config.initial_setup_complete,
        is_admin=is_admin(request),
    )


@app.post("/api/recorder/restart")
def restart_recorder(request: Request) -> ResponseModel:
    if not is_local_client(request):
        return ResponseModel(success=False, status="must_be_local", message="Recorder restart requires local access")

    try:
        subprocess.run(
            ["s6-svc", "-r", env_config.recorder_service_path],
            check=True,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        raise ErrorResponse(
            400, 
            "not_available",
            "s6-svc is not available in this environment",
        )
    except subprocess.CalledProcessError as exc:
        raise ErrorResponse(
            400,
            "restart_failed",
            exc.stderr.strip() or "Failed to restart recorder",
        )

    return ResponseModel(success=True, message="Recorder restart requested")


@app.get("/api/websocket-host")
async def get_websocket_host(request: Request) -> str:
    if request.url.scheme == "https":
        return env_config.https_websocket_url
    else:
        return env_config.http_websocket_url


get_openapi(
    title=__name__,
    version="0.1",
    routes=app.routes
)


@app.exception_handler(ErrorResponse)
def handle_err_response(request: Request, exc: ErrorResponse) -> JSONResponse:
    return JSONResponse(
        status_code=exc.code,
        content=ResponseModel(success=False, status=exc.status, message=exc.message).model_dump()
    )
