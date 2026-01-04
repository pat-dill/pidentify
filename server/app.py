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
from server.utils import safe_filename
from server.config import ClientConfig, FileConfig, env_config
from server.exceptions import ErrorResponse

sys.path.append(str(Path(__file__).parents))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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
    if is_admin(request):
        rdb = get_redis()
        rdb.delete("sleep.next_scan")
        return ResponseModel(success=True, status="")
    else:
        raise ErrorResponse(403, "not_authorized")


@app.get("/api/dump", response_model=None)
async def dump_audio(request: Request, mins: float = 1) -> ResponseModel | FileResponse:
    if is_admin(request):
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
        raise ErrorResponse(403, "not_authorized")


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
    is_admin_req = is_admin(request)

    file_config = FileConfig.load()

    return ClientConfig(
        can_skip=is_admin_req,
        can_save=is_admin_req,
        can_edit_history=is_admin_req,
        buffer_length_seconds=file_config.buffer_length_seconds,
        temp_save_offset=file_config.temp_save_offset,
        initial_setup_complete=file_config.initial_setup_complete,
        is_admin=is_admin_req,
    )


@app.post("/api/recorder/restart")
def restart_recorder(request: Request) -> ResponseModel:
    if not is_admin(request):
        return ErrorResponse(403, "not_authorized")

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


# Serve static files from the static directory (must be after all API routes)
static_path = Path(__file__).parent / "static"
if static_path.exists():
    # Mount static assets directory
    assets_path = static_path / "assets"
    if assets_path.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")
    
    # Serve index.html for all non-API routes (for React Router)
    # This catch-all route must be added last and handles GET/HEAD requests
    @app.route("/{full_path:path}", methods=["GET", "HEAD"])
    @app.route("/", methods=["GET", "HEAD"])
    async def serve_frontend(request: Request, full_path: str = ""):
        # Don't serve frontend for API routes (shouldn't reach here, but safety check)
        if full_path.startswith("api/"):
            from starlette.responses import Response
            return Response(status_code=404)
        
        # Check if it's a static asset request (like favicon.ico, etc.)
        static_file = static_path / full_path
        if static_file.exists() and static_file.is_file():
            return FileResponse(str(static_file))
        
        # For all other routes, serve index.html (React Router will handle routing)
        index_file = static_path / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        
        from starlette.responses import Response
        return Response(status_code=404)
