from typing import Optional
from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
import bcrypt
from .db import get_db
from . import models

SESSION_KEY = "user_id"

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False

def get_current_user_id(request: Request) -> str:
    user_id = request.session.get(SESSION_KEY)
    return user_id or "demo"

def set_session_user(request: Request, user_id: str) -> None:
    request.session[SESSION_KEY] = user_id

def clear_session(request: Request) -> None:
    request.session.pop(SESSION_KEY, None)
