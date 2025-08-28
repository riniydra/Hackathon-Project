from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..db import get_db, engine, Base
from .. import models, schemas
from ..crypto import encrypt_text, decrypt_text
from ..auth import get_current_user_id

# create tables on first run (simple for MVP; swap to Alembic later)
Base.metadata.create_all(bind=engine)

router = APIRouter()

@router.get("/", response_model=List[schemas.JournalOut])
def list_journals(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    rows = db.query(models.Journal).filter(models.Journal.user_id == user_id).order_by(models.Journal.id.desc()).all()
    out = []
    for r in rows:
        out.append(schemas.JournalOut(
            id=r.id, user_id=r.user_id, created_at=r.created_at,
            text=decrypt_text(r.ciphertext_b64, r.iv_b64)
        ))
    return out

@router.post("/", response_model=schemas.JournalOut, status_code=201)
def create_journal(payload: schemas.JournalCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    ct, iv, tag = encrypt_text(payload.text)
    row = models.Journal(user_id=user_id, ciphertext_b64=ct, iv_b64=iv, tag_b64=tag)
    db.add(row); db.commit(); db.refresh(row)
    return schemas.JournalOut(id=row.id, user_id=row.user_id, created_at=row.created_at, text=payload.text)
