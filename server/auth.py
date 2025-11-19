import argon2
import jwt
from datetime import datetime
from pydantic import Field
from server.models import BaseModel
from server.utils import utcnow

from server.config import file_config


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
    except Exception as e:
        return False
