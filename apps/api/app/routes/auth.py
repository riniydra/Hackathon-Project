from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from ..db import get_db, engine, Base
from .. import models
from ..auth import hash_password, verify_password, set_session_user, clear_session, get_current_user_id

# ensure tables exist
Base.metadata.create_all(bind=engine)

router = APIRouter()

class SignupPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class LoginPayload(BaseModel):
    email: EmailStr
    password: str

@router.post("/signup")
def signup(payload: SignupPayload, request: Request, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(email=payload.email, password_hash=hash_password(payload.password))
    db.add(user); db.commit(); db.refresh(user)
    set_session_user(request, str(user.id))
    return {"ok": True, "user_id": user.id}

@router.post("/login")
def login(payload: LoginPayload, request: Request, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    set_session_user(request, str(user.id))
    return {"ok": True, "user_id": user.id}

@router.post("/logout")
def logout(request: Request):
    clear_session(request)
    return {"ok": True}

@router.get("/me")
def me(user_id: str = Depends(get_current_user_id)):
    # returns demo if not logged in
    return {"ok": True, "user_id": user_id}
