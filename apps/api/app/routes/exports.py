from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, text as sql_text
from datetime import datetime, timedelta
from pathlib import Path
import csv
import hashlib
import os
from typing import List, Dict, Any, Iterable
from ..utils.ids import user_id_hash
from ..db import get_db
from .. import models
from ..auth import get_current_user_id

router = APIRouter()

EXPORTS_DIR = Path(__file__).resolve().parents[3] / "exports"

class DataExporter:
    def __init__(self, exports_dir: Path):
        self.exports_dir = exports_dir
        self.exports_dir.mkdir(parents=True, exist_ok=True)
    
    def export_user_data(self, db: Session, user_id: str, export_type: str = "tableau") -> Dict[str, Any]:
        """Export user data in the specified format"""
        if user_id == "demo":
            return self._export_demo_data(export_type)
        
        if export_type == "tableau":
            return self._export_tableau_format(db, user_id)
        elif export_type == "full":
            return self._export_full_data(db, user_id)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported export type: {export_type}")
    
    def _export_demo_data(self, export_type: str) -> Dict[str, Any]:
        """Export demo data for testing"""
        today = datetime.utcnow().date().isoformat()
        out_dir = self.exports_dir / "demo"
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"demo_{export_type}_{today}.csv"
        
        with out_path.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            if export_type == "tableau":
                w.writerow(["view_date", "user_id_hash", "mood", "energy", "safety", "journals_last7", "risk_score"])
                w.writerow([today, "demo_hash", 3, 4, 5, 1, 0.2])
            else:
                w.writerow(["export_date", "user_id", "data_type", "count"])
                w.writerow([today, "demo", "journals", 1])
        
        return {"ok": True, "path": str(out_path), "type": "demo"}
    
    def _export_tableau_format(self, db: Session, user_id: str) -> Dict[str, Any]:
        """Export data in Tableau-compatible format"""
        today = datetime.utcnow().date().isoformat()
        user_hash = user_id_hash(user_id)
        
        # Get user data
        user_data = self._get_user_summary_data(db, user_id)
        
        # Create export file
        out_dir = self.exports_dir / "tableau" / today
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"user_{user_hash}_{today}.csv"
        
        with out_path.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow([
                "view_date", "user_id_hash", "mood_avg", "energy_avg", "safety_avg", 
                "journals_last7", "risk_score", "risk_level", "last_checkin"
            ])
            
            w.writerow([
                today,
                user_hash,
                user_data.get("mood_avg", 3),
                user_data.get("energy_avg", 4),
                user_data.get("safety_avg", 5),
                user_data.get("journals_last7", 0),
                user_data.get("risk_score", 0.0),
                user_data.get("risk_level", "low"),
                user_data.get("last_checkin", today)
            ])
        
        return {
            "ok": True, 
            "path": str(out_path), 
            "type": "tableau",
            "user_hash": user_hash,
            "data_summary": user_data
        }
    
    def _export_full_data(self, db: Session, user_id: str) -> Dict[str, Any]:
        """Export full user data for data portability"""
        today = datetime.utcnow().date().isoformat()
        user_hash = user_id_hash(user_id)
        
        # Get all user data
        journals = self._get_user_journals(db, user_id)
        user_info = self._get_user_info(db, user_id)
        
        # Create export file
        out_dir = self.exports_dir / "full" / today
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"user_{user_hash}_full_{today}.csv"
        
        with out_path.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow([
                "export_date", "user_id_hash", "data_type", "created_at", 
                "content_length", "encrypted_content"
            ])
            
            # Export journals
            for journal in journals:
                w.writerow([
                    today,
                    user_hash,
                    "journal",
                    journal.created_at.isoformat() if journal.created_at else today,
                    len(journal.ciphertext_b64),
                    journal.ciphertext_b64  # Encrypted content
                ])
            
            # Export user info (anonymized)
            w.writerow([
                today,
                user_hash,
                "user_info",
                user_info.get("created_at", today),
                len(str(user_info)),
                "encrypted_user_data"  # Placeholder for encrypted user data
            ])
        
        return {
            "ok": True,
            "path": str(out_path),
            "type": "full",
            "user_hash": user_hash,
            "journal_count": len(journals),
            "export_date": today
        }

    # New: per-dataset JSON/CSV exports aligned with Data Cloud schema
    def stream_chat_events_csv(self, db: Session, user_id: str) -> Iterable[str]:
        user_hash = user_id_hash(user_id)
        # header
        yield ",".join([
            "event_id","user_id_hash","chat_id","created_at","journal_entry","entry_source","jurisdiction",
            "location_type","children_present","event_type","type_of_abuse","sentiment_score","risk_points",
            "severity_score","escalation_index","threats_to_kill","strangulation","weapon_involved","stalking",
            "digital_surveillance","model_summary","confidentiality_level","share_with"
        ]) + "\n"
        rows = db.execute(
            sql_text("SELECT * FROM chat_events WHERE user_id=:uid ORDER BY created_at ASC"),
            {"uid": user_id}
        )
        for r in rows:
            vals = [
                r.event_id, user_hash, r.chat_id, (r.created_at.isoformat() if r.created_at else ""),
                (r.journal_entry or "").replace("\n"," ").replace("\r"," "), r.entry_source, r.jurisdiction,
                r.location_type, str(bool(r.children_present)), r.event_type, r.type_of_abuse,
                str(r.sentiment_score if r.sentiment_score is not None else ""),
                str(r.risk_points if r.risk_points is not None else ""),
                str(r.severity_score if r.severity_score is not None else ""),
                str(r.escalation_index if r.escalation_index is not None else ""),
                str(bool(r.threats_to_kill)), str(bool(r.strangulation)), str(bool(r.weapon_involved)),
                str(bool(r.stalking)), str(bool(r.digital_surveillance)),
                (r.model_summary or "").replace(","," "), r.confidentiality_level, r.share_with,
            ]
            yield ",".join(["" if v is None else str(v) for v in vals]) + "\n"

    def chat_events_json(self, db: Session, user_id: str) -> Dict[str, Any]:
        user_hash = user_id_hash(user_id)
        rows = db.execute(
            sql_text("SELECT * FROM chat_events WHERE user_id=:uid ORDER BY created_at ASC"),
            {"uid": user_id}
        )
        out = []
        for r in rows:
            out.append({
                "event_id": r.event_id,
                "user_id_hash": user_hash,
                "chat_id": r.chat_id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "journal_entry": r.journal_entry,
                "entry_source": r.entry_source,
                "jurisdiction": r.jurisdiction,
                "location_type": r.location_type,
                "children_present": bool(r.children_present) if r.children_present is not None else None,
                "event_type": r.event_type,
                "type_of_abuse": r.type_of_abuse,
                "sentiment_score": r.sentiment_score,
                "risk_points": r.risk_points,
                "severity_score": r.severity_score,
                "escalation_index": r.escalation_index,
                "threats_to_kill": bool(r.threats_to_kill) if r.threats_to_kill is not None else False,
                "strangulation": bool(r.strangulation) if r.strangulation is not None else False,
                "weapon_involved": bool(r.weapon_involved) if r.weapon_involved is not None else False,
                "stalking": bool(r.stalking) if r.stalking is not None else False,
                "digital_surveillance": bool(r.digital_surveillance) if r.digital_surveillance is not None else False,
                "model_summary": r.model_summary,
                "confidentiality_level": r.confidentiality_level,
                "share_with": r.share_with,
            })
        return {"dataset": "chat_events", "records": out}

    # risk_snapshots dataset
    def stream_risk_snapshots_csv(self, db: Session, user_id: str) -> Iterable[str]:
        user_hash = user_id_hash(user_id)
        yield ",".join(["user_id_hash","created_at","score","level","top_reasons"]) + "\n"
        rows = db.query(models.RiskSnapshot).filter(models.RiskSnapshot.user_id == user_id).order_by(models.RiskSnapshot.created_at.asc()).all()
        for r in rows:
            yield ",".join([
                user_hash,
                (r.created_at.isoformat() if r.created_at else ""),
                str(r.risk_score),
                r.risk_level,
                "",
            ]) + "\n"

    def risk_snapshots_json(self, db: Session, user_id: str) -> Dict[str, Any]:
        user_hash = user_id_hash(user_id)
        rows = db.query(models.RiskSnapshot).filter(models.RiskSnapshot.user_id == user_id).order_by(models.RiskSnapshot.created_at.asc()).all()
        out = []
        for r in rows:
            out.append({
                "user_id_hash": user_hash,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "score": r.risk_score,
                "level": r.risk_level,
                "top_reasons": None,
                "feature_scores": r.feature_scores,
            })
        return {"dataset": "risk_snapshots", "records": out}

    # user_profiles dataset
    def stream_user_profiles_csv(self, db: Session, user_id: str) -> Iterable[str]:
        user_hash = user_id_hash(user_id)
        u = db.query(models.User).filter(models.User.id == int(user_id)).first()
        # header
        yield ",".join([
            "user_id_hash","age","gender","relationship_status","victim_housing","has_trusted_support",
            "default_confidentiality","default_share_with","jurisdiction_default","children_present_default"
        ]) + "\n"
        if u:
            yield ",".join([
                user_hash,
                str(getattr(u, "age", "") or ""),
                u.gender or "",
                u.relationship_status or "",
                str(getattr(u, "victim_housing", "") or ""),
                str(bool(getattr(u, "has_trusted_support", False))),
                str(getattr(u, "default_confidentiality", "") or ""),
                str(getattr(u, "default_share_with", "") or ""),
                "",
                "",
            ]) + "\n"

    def user_profiles_json(self, db: Session, user_id: str) -> Dict[str, Any]:
        user_hash = user_id_hash(user_id)
        u = db.query(models.User).filter(models.User.id == int(user_id)).first()
        rec = None
        if u:
            rec = {
                "user_id_hash": user_hash,
                "age": getattr(u, "age", None),
                "gender": u.gender,
                "relationship_status": u.relationship_status,
                "victim_housing": getattr(u, "victim_housing", None),
                "has_trusted_support": getattr(u, "has_trusted_support", None),
                "default_confidentiality": getattr(u, "default_confidentiality", None),
                "default_share_with": getattr(u, "default_share_with", None),
                "jurisdiction_default": None,
                "children_present_default": None,
            }
        return {"dataset": "user_profiles", "records": [rec] if rec else []}

    # journals_public dataset
    def stream_journals_public_csv(self, db: Session, user_id: str) -> Iterable[str]:
        user_hash = user_id_hash(user_id)
        yield ",".join(["journal_id","user_id_hash","created_at","mood","tags","text_redacted"]) + "\n"
        journals = db.query(models.Journal).filter(models.Journal.user_id == user_id).order_by(models.Journal.created_at.asc()).all()
        for j in journals:
            # try find matching chat_event summary
            evt = db.execute(sql_text("SELECT model_summary FROM chat_events WHERE event_id=:eid"), {"eid": f"evt_{j.id}"}).first()
            summary = (evt.model_summary if evt else "Redacted entry")
            yield ",".join([
                str(j.id), user_hash, (j.created_at.isoformat() if j.created_at else ""), "", "", summary.replace(","," ")
            ]) + "\n"

    def journals_public_json(self, db: Session, user_id: str) -> Dict[str, Any]:
        user_hash = user_id_hash(user_id)
        journals = db.query(models.Journal).filter(models.Journal.user_id == user_id).order_by(models.Journal.created_at.asc()).all()
        out = []
        for j in journals:
            evt = db.execute(sql_text("SELECT model_summary FROM chat_events WHERE event_id=:eid"), {"eid": f"evt_{j.id}"}).first()
            summary = (evt.model_summary if evt else None)
            out.append({
                "journal_id": str(j.id),
                "user_id_hash": user_hash,
                "created_at": j.created_at.isoformat() if j.created_at else None,
                "mood": None,
                "tags": None,
                "text_redacted": summary,
            })
        return {"dataset": "journals_public", "records": out}
    
    # _hash_user_id deprecated: use utils.user_id_hash instead
    
    def _get_user_summary_data(self, db: Session, user_id: str) -> Dict[str, Any]:
        """Get summary data for Tableau export"""
        # Get recent journals count
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_journals = db.query(models.Journal).filter(
            and_(
                models.Journal.user_id == user_id,
                models.Journal.created_at >= week_ago
            )
        ).count()
        
        # For MVP, we'll use placeholder values
        # In production, this would use actual check-in data
        return {
            "mood_avg": 3.5,
            "energy_avg": 4.0,
            "safety_avg": 4.5,
            "journals_last7": recent_journals,
            "risk_score": 0.2,
            "risk_level": "low",
            "last_checkin": datetime.utcnow().date().isoformat()
        }
    
    def _get_user_journals(self, db: Session, user_id: str) -> List[models.Journal]:
        """Get all journals for a user"""
        return db.query(models.Journal).filter(
            models.Journal.user_id == user_id
        ).order_by(models.Journal.created_at.desc()).all()
    
    def _get_user_info(self, db: Session, user_id: str) -> Dict[str, Any]:
        """Get user information (anonymized)"""
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user:
            return {
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "is_active": user.is_active
            }
        return {}

# Initialize exporter
exporter = DataExporter(EXPORTS_DIR)

@router.post("/tableau")
def export_tableau(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Export user data in Tableau format"""
    return exporter.export_user_data(db, user_id, "tableau")

@router.post("/full")
def export_full_data(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Export full user data for data portability"""
    return exporter.export_user_data(db, user_id, "full")

@router.get("/download/{filename}")
def download_export(filename: str, user_id: str = Depends(get_current_user_id)):
    """Download a specific export file"""
    # Security: only allow downloading files that belong to the user
    user_hash = user_id_hash(user_id)
    
    # Look for the file in exports directory
    for export_type in ["tableau", "full", "demo"]:
        file_path = EXPORTS_DIR / export_type / filename
        if file_path.exists() and user_hash in filename:
            return FileResponse(
                path=str(file_path),
                filename=filename,
                media_type="text/csv"
            )
    
    raise HTTPException(status_code=404, detail="Export file not found")

@router.get("/list")
def list_exports(user_id: str = Depends(get_current_user_id)):
    """List available exports for the user"""
    user_hash = user_id_hash(user_id)
    exports = []
    
    for export_type in ["tableau", "full", "demo"]:
        export_dir = EXPORTS_DIR / export_type
        if export_dir.exists():
            for file_path in export_dir.rglob("*.csv"):
                if user_hash in file_path.name or user_id == "demo":
                    exports.append({
                        "filename": file_path.name,
                        "path": str(file_path),
                        "type": export_type,
                        "size": file_path.stat().st_size,
                        "created": datetime.fromtimestamp(file_path.stat().st_ctime).isoformat()
                    })
    
    return {"exports": exports, "user_hash": user_hash}


# New: Per-user dataset exports (Data Cloud aligned)
@router.get("/dataset/chat_events.csv")
def export_chat_events_csv(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if user_id == "demo":
        raise HTTPException(status_code=401, detail="Login required")
    gen = exporter.stream_chat_events_csv(db, user_id)
    return StreamingResponse(gen, media_type="text/csv")


@router.get("/dataset/chat_events.json")
def export_chat_events_json(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if user_id == "demo":
        raise HTTPException(status_code=401, detail="Login required")
    return exporter.chat_events_json(db, user_id)


@router.get("/dataset/risk_snapshots.csv")
def export_risk_snapshots_csv(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if user_id == "demo":
        raise HTTPException(status_code=401, detail="Login required")
    gen = exporter.stream_risk_snapshots_csv(db, user_id)
    return StreamingResponse(gen, media_type="text/csv")


@router.get("/dataset/risk_snapshots.json")
def export_risk_snapshots_json(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if user_id == "demo":
        raise HTTPException(status_code=401, detail="Login required")
    return exporter.risk_snapshots_json(db, user_id)


@router.get("/dataset/user_profiles.csv")
def export_user_profiles_csv(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if user_id == "demo":
        raise HTTPException(status_code=401, detail="Login required")
    gen = exporter.stream_user_profiles_csv(db, user_id)
    return StreamingResponse(gen, media_type="text/csv")


@router.get("/dataset/user_profiles.json")
def export_user_profiles_json(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if user_id == "demo":
        raise HTTPException(status_code=401, detail="Login required")
    return exporter.user_profiles_json(db, user_id)


@router.get("/dataset/journals_public.csv")
def export_journals_public_csv(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if user_id == "demo":
        raise HTTPException(status_code=401, detail="Login required")
    gen = exporter.stream_journals_public_csv(db, user_id)
    return StreamingResponse(gen, media_type="text/csv")


@router.get("/dataset/journals_public.json")
def export_journals_public_json(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if user_id == "demo":
        raise HTTPException(status_code=401, detail="Login required")
    return exporter.journals_public_json(db, user_id)


@router.post("/datacloud/ingest")
def datacloud_ingest():
    """Scaffold endpoint to forward curated tables to Salesforce Data Cloud Streaming API.
    Real implementation will authenticate and push records.
    """
    return {"ok": True, "status": "scaffold"}
