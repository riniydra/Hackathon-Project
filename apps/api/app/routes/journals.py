from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..db import get_db, engine, Base
from .. import models, schemas
from ..crypto import encrypt_text, decrypt_text
from ..nlp_utils import simple_sentiment, extract_risk_flags, calculate_risk_scores
from sqlalchemy import text as sql_text
from ..auth import get_current_user_id

# create tables on first run (simple for MVP; swap to Alembic later)
Base.metadata.create_all(bind=engine)

router = APIRouter()

@router.get("/", response_model=List[schemas.JournalOut])
def list_journals(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    # Do not expose any journals to unauthenticated (demo) sessions
    if user_id == "demo":
        return []
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
    if user_id == "demo":
        raise HTTPException(status_code=401, detail="Login required")
    ct, iv, tag = encrypt_text(payload.text)
    row = models.Journal(user_id=user_id, ciphertext_b64=ct, iv_b64=iv, tag_b64=tag)
    db.add(row); db.commit(); db.refresh(row)
    # Best-effort analytics event for journals
    try:
        text_plain = payload.text or ""
        sentiment = simple_sentiment(text_plain)
        flags = extract_risk_flags(text_plain)
        risks = calculate_risk_scores(flags)
        evt = {
            "event_id": f"evt_{row.id}",
            "chat_id": f"journal_{user_id}",
            "user_id": user_id,
            "journal_entry": text_plain,
            "entry_source": "web",
            "jurisdiction": None,
            "location_type": None,
            "children_present": None,
            "event_type": "seek_emotional_support",
            "type_of_abuse": "unknown",
            "sentiment_score": sentiment,
            "risk_points": risks.get("risk_points"),
            "severity_score": risks.get("severity_score"),
            "escalation_index": risks.get("escalation_index"),
            "threats_to_kill": bool(flags.get("threats_to_kill")),
            "strangulation": bool(flags.get("strangulation")),
            "weapon_involved": bool(flags.get("weapon_involved")),
            "stalking": bool(flags.get("stalking")),
            "digital_surveillance": bool(flags.get("digital_surveillance")),
            "model_summary": "Short neutral summary (no PII).",
            "confidentiality_level": None,
            "share_with": None,
            "extra_json": None,
        }
        insert_sql = sql_text(
            """
            INSERT INTO chat_events (
                event_id, chat_id, user_id, journal_entry, entry_source, jurisdiction, location_type,
                children_present, event_type, type_of_abuse, sentiment_score, risk_points, severity_score,
                escalation_index, threats_to_kill, strangulation, weapon_involved, stalking,
                digital_surveillance, model_summary, confidentiality_level, share_with, extra_json
            ) VALUES (
                :event_id, :chat_id, :user_id, :journal_entry, :entry_source, :jurisdiction, :location_type,
                :children_present, :event_type, :type_of_abuse, :sentiment_score, :risk_points, :severity_score,
                :escalation_index, :threats_to_kill, :strangulation, :weapon_involved, :stalking,
                :digital_surveillance, :model_summary, :confidentiality_level, :share_with, :extra_json
            )
            """
        )
        db.execute(insert_sql, evt)
        db.commit()
    except Exception:
        db.rollback()
    return schemas.JournalOut(id=row.id, user_id=row.user_id, created_at=row.created_at, text=payload.text)
