import asyncio
from concurrent.futures.process import ProcessPoolExecutor

from fastapi import APIRouter
from starlette.requests import Request
from starlette.responses import FileResponse, Response

from server.config import env_config, FileConfig
from server.db import get_history_entry
from server.exceptions import ErrorResponse
from server.models import HistoryEntry, ResponseModel, BaseModel
from server.redis_client import get_redis
from server.rip_tool.audio_data import get_audio_data_chart
from server.utils import is_local_client
from server.auth import check_password, SessionToken, get_session
import argon2


# == Request/Response models ==


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    username: str
    old_password: str = ""
    new_password: str



# == API routes ==

api = APIRouter(prefix="/api/auth")


@api.post("/login")
def login(data: LoginRequest, response: Response) -> ResponseModel:
    file_config = FileConfig.load()
    
    if not file_config.admin_password_hash:
        raise ErrorResponse(403, "invalid_credentials")

    if data.username != file_config.admin_username:
        raise ErrorResponse(403, "invalid_credentials")

    if not check_password(data.password, file_config.admin_password_hash):
        raise ErrorResponse(403, "invalid_credentials")

    token = SessionToken(is_admin=True) 
    encoded_token = token.encode_jwt()
    response.set_cookie(key="session", value=encoded_token)
    return ResponseModel(success=True, status="ok")


@api.post("/logout")
def logout(response: Response) -> ResponseModel:
    response.delete_cookie(key="session")
    return ResponseModel(success=True, status="ok")


@api.get("/check-auth")
def check_auth(request: Request) -> ResponseModel:
    session = get_session(request)
    return ResponseModel[SessionToken](success=True, status="ok", data=session)


@api.post("/change-password")
def change_password(data: ChangePasswordRequest, request: Request) -> ResponseModel:
    file_config = FileConfig.load()

    if data.username != file_config.admin_username:
        raise ErrorResponse(403, "invalid_credentials")

    if (not file_config.admin_password_hash) or check_password(data.old_password, file_config.admin_password_hash):
        ph = argon2.PasswordHasher()
        file_config.admin_password_hash = ph.hash(data.new_password)
        file_config.save()
        return ResponseModel(success=True, status="ok")
    else:
        raise ErrorResponse(403, "invalid_credentials")
