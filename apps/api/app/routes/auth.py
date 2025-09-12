from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from ..db import get_db, engine, Base
from .. import models
from pydantic import BaseModel, Field
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

@router.get("/debug")
def debug_session(request: Request):
    # Debug endpoint to check session state
    session_data = dict(request.session)
    return {
        "session_data": session_data,
        "user_id": request.session.get("user_id"),
        "all_headers": dict(request.headers)
    }


class SetPinPayload(BaseModel):
    pin: str = Field(min_length=4, max_length=6)
    duress_pin: str | None = Field(default=None, min_length=4, max_length=6)


class VerifyPinPayload(BaseModel):
    pin: str = Field(min_length=4, max_length=6)


@router.post("/pin")
def set_pin(payload: SetPinPayload, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if user_id == "demo":
        raise HTTPException(status_code=401, detail="Login required")
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # reuse password hashing for PIN; ideally use argon2id in prod
    user.pin_hash = hash_password(payload.pin)
    if payload.duress_pin:
        user.duress_pin_hash = hash_password(payload.duress_pin)
    db.add(user); db.commit()
    return {"ok": True}


@router.post("/pin/verify")
def verify_pin(payload: VerifyPinPayload, request: Request, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if user_id == "demo":
        return {"ok": True}
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.duress_pin_hash and verify_password(payload.pin, user.duress_pin_hash):
        # Clear session and set to demo decoy
        set_session_user(request, "demo")
        return {"ok": True, "duress": True}
    if user.pin_hash and verify_password(payload.pin, user.pin_hash):
        return {"ok": True}
    raise HTTPException(status_code=401, detail="Invalid PIN")


class ProfileUpdate(BaseModel):
    gender: str | None = None
    relationship_status: str | None = None
    num_children: int | None = None
    # Extended profile fields
    age: int | None = None
    victim_housing: str | None = None
    has_trusted_support: bool | None = None
    default_confidentiality: str | None = None  # 'private' | 'advocate_only' | 'share_with_attorney'
    default_share_with: str | None = None       # 'nobody' | 'advocate' | 'attorney'


@router.post("/profile")
def update_profile(payload: ProfileUpdate, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if user_id == "demo":
        raise HTTPException(status_code=401, detail="Login required")
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.gender is not None:
        user.gender = payload.gender
    if payload.relationship_status is not None:
        user.relationship_status = payload.relationship_status
    if payload.num_children is not None:
        user.num_children = payload.num_children
    # Extended fields (guard if column exists)
    if hasattr(user, "age") and payload.age is not None:
        user.age = payload.age
    if hasattr(user, "victim_housing") and payload.victim_housing is not None:
        user.victim_housing = payload.victim_housing
    if hasattr(user, "has_trusted_support") and payload.has_trusted_support is not None:
        user.has_trusted_support = payload.has_trusted_support
    if hasattr(user, "default_confidentiality") and payload.default_confidentiality is not None:
        user.default_confidentiality = payload.default_confidentiality
    if hasattr(user, "default_share_with") and payload.default_share_with is not None:
        user.default_share_with = payload.default_share_with
    db.add(user); db.commit()
    return {"ok": True}
