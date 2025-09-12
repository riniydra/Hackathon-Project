from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any

from ..db import get_db, engine, Base
from .. import models
from ..auth import hash_password
from ..nlp_utils import simple_sentiment, extract_risk_flags, calculate_risk_scores
from sqlalchemy import text as sql_text

# Ensure tables exist
Base.metadata.create_all(bind=engine)

router = APIRouter()


def _seed_profiles() -> List[Dict[str, Any]]:
    # Minimal synthetic dataset with credentials, profile, and narrative
    # Emails/passwords are generated for local dev only
    base: List[Dict[str, Any]] = [
        {
            "email": "jane.d001@example.com", "password": "Passw0rd!001",
            "profile": {
                "age": 34, "gender": "female", "relationship_status": "married", "num_children": 2,
                "victim_housing": "with_abuser", "has_trusted_support": False,
                "default_confidentiality": "advocate_only", "default_share_with": "advocate"
            },
            "story": "Partner restricts spending and tracks phone; worried about children's well-being.",
            "context": {"jurisdiction": "Santa Clara County", "children_present": True, "event_type": "seek_emotional_support", "type_of_abuse": "financial"}
        },
        {
            "email": "maya.p002@example.com", "password": "Passw0rd!002",
            "profile": {
                "age": 28, "gender": "female", "relationship_status": "cohabiting", "num_children": 0,
                "victim_housing": "with_abuser", "has_trusted_support": False,
                "default_confidentiality": "private", "default_share_with": "nobody"
            },
            "story": "Partner shows up uninvited and monitors online activity.",
            "context": {"jurisdiction": "King County", "children_present": False, "event_type": "report_incident", "type_of_abuse": "stalking"}
        },
        {
            "email": "alex.r003@example.com", "password": "Passw0rd!003",
            "profile": {
                "age": 41, "gender": "male", "relationship_status": "married", "num_children": 1,
                "victim_housing": "stable", "has_trusted_support": True,
                "default_confidentiality": "advocate_only", "default_share_with": "attorney"
            },
            "story": "Obtained restraining order; working with attorney and therapist.",
            "context": {"jurisdiction": "Travis County", "children_present": True, "event_type": "seek_legal_info", "type_of_abuse": "physical"}
        },
        {
            "email": "jordan.k004@example.com", "password": "Passw0rd!004",
            "profile": {
                "age": 24, "gender": "non-binary", "relationship_status": "dating", "num_children": 0,
                "victim_housing": "friends", "has_trusted_support": True,
                "default_confidentiality": "private", "default_share_with": "nobody"
            },
            "story": "Left relationship; staying with friends; active safety plan.",
            "context": {"jurisdiction": "Cook County", "children_present": False, "event_type": "safety_planning", "type_of_abuse": "emotional"}
        },
        {
            "email": "rosa.m005@example.com", "password": "Passw0rd!005",
            "profile": {
                "age": 52, "gender": "female", "relationship_status": "separated", "num_children": 3,
                "victim_housing": "shelter", "has_trusted_support": True,
                "default_confidentiality": "advocate_only", "default_share_with": "advocate"
            },
            "story": "Long-term physical and financial abuse; currently in shelter; court hearing pending.",
            "context": {"jurisdiction": "Maricopa County", "children_present": True, "event_type": "report_incident", "type_of_abuse": "physical"}
        },
        {
            "email": "liam.t006@example.com", "password": "Passw0rd!006",
            "profile": {
                "age": 31, "gender": "male", "relationship_status": "cohabiting", "num_children": 0,
                "victim_housing": "with_abuser", "has_trusted_support": True,
                "default_confidentiality": "private", "default_share_with": "nobody"
            },
            "story": "Partner pressures for passwords and checks messages; considering boundaries.",
            "context": {"jurisdiction": "New York County", "children_present": False, "event_type": "seek_emotional_support", "type_of_abuse": "digital_surveillance"}
        },
        {
            "email": "priya.n007@example.com", "password": "Passw0rd!007",
            "profile": {
                "age": 37, "gender": "female", "relationship_status": "married", "num_children": 2,
                "victim_housing": "stable", "has_trusted_support": True,
                "default_confidentiality": "advocate_only", "default_share_with": "advocate"
            },
            "story": "Financial control limiting personal spending; building safety plan.",
            "context": {"jurisdiction": "Alameda County", "children_present": True, "event_type": "safety_planning", "type_of_abuse": "financial"}
        },
        {
            "email": "sam.w008@example.com", "password": "Passw0rd!008",
            "profile": {
                "age": 46, "gender": "male", "relationship_status": "divorced", "num_children": 1,
                "victim_housing": "stable", "has_trusted_support": True,
                "default_confidentiality": "private", "default_share_with": "nobody"
            },
            "story": "Past physical incidents; RO; focusing on recovery.",
            "context": {"jurisdiction": "Multnomah County", "children_present": False, "event_type": "seek_emotional_support", "type_of_abuse": "physical"}
        },
        {
            "email": "aisha.l009@example.com", "password": "Passw0rd!009",
            "profile": {
                "age": 22, "gender": "female", "relationship_status": "dating", "num_children": 0,
                "victim_housing": "with_abuser", "has_trusted_support": False,
                "default_confidentiality": "private", "default_share_with": "nobody"
            },
            "story": "Partner follows after class and tracks location.",
            "context": {"jurisdiction": "Wayne County", "children_present": False, "event_type": "report_incident", "type_of_abuse": "stalking"}
        },
        {
            "email": "diego.s010@example.com", "password": "Passw0rd!010",
            "profile": {
                "age": 30, "gender": "male", "relationship_status": "cohabiting", "num_children": 1,
                "victim_housing": "with_abuser", "has_trusted_support": False,
                "default_confidentiality": "private", "default_share_with": "nobody"
            },
            "story": "Partner withholds money and monitors messages.",
            "context": {"jurisdiction": "Los Angeles County", "children_present": True, "event_type": "seek_emotional_support", "type_of_abuse": "financial"}
        },
        {
            "email": "noor.c011@example.com", "password": "Passw0rd!011",
            "profile": {
                "age": 39, "gender": "female", "relationship_status": "married", "num_children": 3,
                "victim_housing": "with_abuser", "has_trusted_support": False,
                "default_confidentiality": "advocate_only", "default_share_with": "advocate"
            },
            "story": "Limited access to funds; planning safe exits with advocate.",
            "context": {"jurisdiction": "Suffolk County", "children_present": True, "event_type": "safety_planning", "type_of_abuse": "financial"}
        },
        {
            "email": "ethan.v012@example.com", "password": "Passw0rd!012",
            "profile": {
                "age": 26, "gender": "male", "relationship_status": "dating", "num_children": 0,
                "victim_housing": "stable", "has_trusted_support": True,
                "default_confidentiality": "private", "default_share_with": "nobody"
            },
            "story": "Unwanted messages and tracking; considering boundaries.",
            "context": {"jurisdiction": "Denver County", "children_present": False, "event_type": "report_incident", "type_of_abuse": "stalking"}
        },
        {
            "email": "grace.h013@example.com", "password": "Passw0rd!013",
            "profile": {
                "age": 55, "gender": "female", "relationship_status": "married", "num_children": 2,
                "victim_housing": "stable", "has_trusted_support": True,
                "default_confidentiality": "advocate_only", "default_share_with": "attorney"
            },
            "story": "Seeking legal separation due to long-term financial control.",
            "context": {"jurisdiction": "Ada County", "children_present": False, "event_type": "seek_legal_info", "type_of_abuse": "financial"}
        },
        {
            "email": "chen.y014@example.com", "password": "Passw0rd!014",
            "profile": {
                "age": 33, "gender": "female", "relationship_status": "cohabiting", "num_children": 0,
                "victim_housing": "with_abuser", "has_trusted_support": True,
                "default_confidentiality": "advocate_only", "default_share_with": "advocate"
            },
            "story": "Reports phone mirroring; planning safe device reset.",
            "context": {"jurisdiction": "San Francisco County", "children_present": False, "event_type": "safety_planning", "type_of_abuse": "digital_surveillance"}
        },
        {
            "email": "omar.z015@example.com", "password": "Passw0rd!015",
            "profile": {
                "age": 47, "gender": "male", "relationship_status": "separated", "num_children": 2,
                "victim_housing": "stable", "has_trusted_support": True,
                "default_confidentiality": "private", "default_share_with": "nobody"
            },
            "story": "Legal protections in place; focusing on healing.",
            "context": {"jurisdiction": "Wayne County", "children_present": False, "event_type": "seek_legal_info", "type_of_abuse": "physical"}
        },
        {
            "email": "sofia.g016@example.com", "password": "Passw0rd!016",
            "profile": {
                "age": 19, "gender": "female", "relationship_status": "dating", "num_children": 0,
                "victim_housing": "with_abuser", "has_trusted_support": False,
                "default_confidentiality": "private", "default_share_with": "nobody"
            },
            "story": "Frequent monitoring and demands for passwords.",
            "context": {"jurisdiction": "El Paso County", "children_present": False, "event_type": "report_incident", "type_of_abuse": "digital_surveillance"}
        },
        {
            "email": "maria.j017@example.com", "password": "Passw0rd!017",
            "profile": {
                "age": 43, "gender": "female", "relationship_status": "married", "num_children": 4,
                "victim_housing": "with_abuser", "has_trusted_support": False,
                "default_confidentiality": "advocate_only", "default_share_with": "advocate"
            },
            "story": "Financial isolation with children present; active planning.",
            "context": {"jurisdiction": "Miami-Dade County", "children_present": True, "event_type": "safety_planning", "type_of_abuse": "financial"}
        },
        {
            "email": "natalie.b018@example.com", "password": "Passw0rd!018",
            "profile": {
                "age": 29, "gender": "female", "relationship_status": "cohabiting", "num_children": 0,
                "victim_housing": "with_abuser", "has_trusted_support": True,
                "default_confidentiality": "private", "default_share_with": "nobody"
            },
            "story": "Frequent following and isolation behaviors; in therapy.",
            "context": {"jurisdiction": "Davidson County", "children_present": False, "event_type": "seek_emotional_support", "type_of_abuse": "stalking"}
        },
        {
            "email": "tyrese.q019@example.com", "password": "Passw0rd!019",
            "profile": {
                "age": 36, "gender": "male", "relationship_status": "dating", "num_children": 1,
                "victim_housing": "stable", "has_trusted_support": True,
                "default_confidentiality": "private", "default_share_with": "nobody"
            },
            "story": "Set boundaries and ended relationship; stable now.",
            "context": {"jurisdiction": "Fulton County", "children_present": False, "event_type": "seek_emotional_support", "type_of_abuse": "emotional"}
        },
        {
            "email": "helena.f020@example.com", "password": "Passw0rd!020",
            "profile": {
                "age": 62, "gender": "female", "relationship_status": "married", "num_children": 0,
                "victim_housing": "stable", "has_trusted_support": False,
                "default_confidentiality": "advocate_only", "default_share_with": "attorney"
            },
            "story": "Long-term financial control; exploring legal remedies.",
            "context": {"jurisdiction": "Cuyahoga County", "children_present": False, "event_type": "seek_legal_info", "type_of_abuse": "financial"}
        },
    ]
    return base


def _insert_chat_event(db: Session, user_id: str, chat_id: str, created_at, text_plain: str, context: Dict[str, Any], event_id: str, default_conf: str | None, default_share: str | None):
    sentiment = simple_sentiment(text_plain)
    flags = extract_risk_flags(text_plain)
    risks = calculate_risk_scores(flags)
    evt = {
        "event_id": event_id,
        "chat_id": chat_id,
        "user_id": user_id,
        "journal_entry": text_plain,
        "entry_source": "web",
        "jurisdiction": context.get("jurisdiction"),
        "location_type": None,
        "children_present": context.get("children_present"),
        "event_type": context.get("event_type", "seek_emotional_support"),
        "type_of_abuse": context.get("type_of_abuse", "unknown"),
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
        "confidentiality_level": context.get("confidentiality_level") or default_conf,
        "share_with": context.get("share_with") or default_share,
        "extra_json": None,
    }
    insert_sql = sql_text(
        """
        INSERT INTO chat_events (
            event_id, chat_id, user_id, journal_entry, entry_source, jurisdiction, location_type,
            children_present, event_type, type_of_abuse, sentiment_score, risk_points, severity_score,
            escalation_index, threats_to_kill, strangulation, weapon_involved, stalking,
            digital_surveillance, model_summary, confidentiality_level, share_with, extra_json, created_at
        ) VALUES (
            :event_id, :chat_id, :user_id, :journal_entry, :entry_source, :jurisdiction, :location_type,
            :children_present, :event_type, :type_of_abuse, :sentiment_score, :risk_points, :severity_score,
            :escalation_index, :threats_to_kill, :strangulation, :weapon_involved, :stalking,
            :digital_surveillance, :model_summary, :confidentiality_level, :share_with, :extra_json, :created_at
        )
        """
    )
    evt["created_at"] = created_at
    db.execute(insert_sql, evt)


@router.post("/run")
def seed_run(db: Session = Depends(get_db)):
    profiles = _seed_profiles()
    created_users: List[Dict[str, Any]] = []

    for p in profiles:
        # Create or fetch user
        existing = db.query(models.User).filter(models.User.email == p["email"]).first()
        if existing:
            user = existing
        else:
            user = models.User(email=p["email"], password_hash=hash_password(p["password"]))
            db.add(user); db.commit(); db.refresh(user)

        # Update profile fields if present on users table
        prof = p.get("profile", {})
        # These columns may or may not exist depending on migration state; ignore failures
        for attr in [
            "gender", "relationship_status", "num_children",
        ]:
            if prof.get(attr) is not None:
                setattr(user, attr, prof.get(attr))
        # Optional Alembic-added columns (guard with hasattr)
        for attr in [
            "age", "victim_housing", "has_trusted_support",
            "default_confidentiality", "default_share_with", "safety_plan_last_updated",
        ]:
            if hasattr(user, attr) and prof.get(attr) is not None:
                setattr(user, attr, prof.get(attr))
        db.add(user); db.commit(); db.refresh(user)

        # Fabricate 3 journals spaced over recent days
        now = datetime.now(timezone.utc)
        texts = [
            p["story"],
            "Feeling overwhelmed but considering reaching out to an advocate.",
            "Small step today toward safety; documenting incidents and planning next moves.",
        ]
        for i, txt in enumerate(texts):
            ts = now - timedelta(days=(len(texts) - i) * 3)
            ct, iv, tag = (None, None, None)
            # Use crypto layer if available; journals route uses encrypt_text
            try:
                from ..crypto import encrypt_text
                ct, iv, tag = encrypt_text(txt)
            except Exception:
                # Fallback plain markers (not expected in normal flow)
                ct, iv, tag = txt, "iv", "tag"
            j = models.Journal(user_id=str(user.id), ciphertext_b64=ct, iv_b64=iv, tag_b64=tag)
            db.add(j); db.commit(); db.refresh(j)
            # Adjust created_at to synthetic timestamp
            db.execute(sql_text("UPDATE journals SET created_at=:ts WHERE id=:jid"), {"ts": ts, "jid": j.id})
            db.commit()
            # Mirror as chat_event (denormalized analytics) with evt_<journal_id>
            default_conf = getattr(user, "default_confidentiality", None)
            default_share = getattr(user, "default_share_with", None)
            _insert_chat_event(
                db,
                str(user.id),
                f"journal_{user.id}",
                ts,
                txt,
                p.get("context", {}),
                event_id=f"evt_{j.id}",
                default_conf=default_conf,
                default_share=default_share,
            )
            db.commit()

        # Create one RiskSnapshot based on recent events
        try:
            # Aggregate risk from chat_events
            agg = db.execute(sql_text(
                "SELECT AVG(COALESCE(risk_points,0)) as rp, MAX(COALESCE(threats_to_kill,false)) as ttk, "
                "MAX(COALESCE(strangulation,false)) as strang, MAX(COALESCE(weapon_involved,false)) as weap, "
                "MAX(COALESCE(children_present,false)) as kids, MAX(COALESCE(stalking,false)) as stalk, "
                "MAX(COALESCE(digital_surveillance,false)) as digi FROM chat_events WHERE user_id=:uid"
            ), {"uid": str(user.id)}).first()
            rp_avg = float(agg.rp or 0.0)
            score = min(1.0, max(0.0, rp_avg / 10.0))
            level = "low" if score < 0.33 else ("medium" if score < 0.66 else "high")
            feature_scores = {"events_risk_points_avg": score}
            snap = models.RiskSnapshot(
                user_id=str(user.id),
                risk_score=score,
                risk_level=level,
                feature_scores=str(feature_scores),
                threats_to_kill=bool(agg.ttk),
                strangulation=bool(agg.strang),
                weapon_involved=bool(agg.weap),
                children_present=bool(agg.kids),
                stalking=bool(agg.stalk),
                digital_surveillance=bool(agg.digi),
            )
            db.add(snap); db.commit()
        except Exception:
            db.rollback()

        created_users.append({"email": p["email"], "password": p["password"], "user_id": user.id})

    return {"ok": True, "created": created_users}


