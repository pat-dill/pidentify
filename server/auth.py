import argon2
import jwt
from datetime import datetime
from pydantic import Field
from server.models import BaseModel
from server.utils import utcnow

from server.config import FileConfig, file_config

from starlette.requests import Request


class SessionToken(BaseModel):
    is_admin: bool
    created_at: datetime = Field(default_factory=utcnow)

    def encode_jwt(self) -> str:
        return jwt.encode(self.model_dump(mode="json"), file_config.jwt_secret_key, algorithm="HS256")
    
    @classmethod
    def decode_jwt(cls, token: str):
        token_obj = jwt.decode(token, file_config.jwt_secret_key, algorithms=["HS256"])
        return cls.model_validate(token_obj)


def check_password(password: str, hashed_pw: str) -> bool:
    try:
        ph = argon2.PasswordHasher()
        return ph.verify(hashed_pw, password)
    except Exception:
        return False


def get_session(request: Request) -> SessionToken | None:
    token = request.cookies.get("session")
    if token:
        try:
            return SessionToken.decode_jwt(token)
        except Exception:
            return None
    
    return None


def is_admin(request: Request) -> bool:
    file_config = FileConfig.load()
    if file_config.admin_password_hash:
        session = get_session(request)
        return session.is_admin if session else False
    else:
        return True
