from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from pathlib import Path
import csv
import hashlib
import os
from typing import List, Dict, Any
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
        user_hash = self._hash_user_id(user_id)
        
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
        user_hash = self._hash_user_id(user_id)
        
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
    
    def _hash_user_id(self, user_id: str) -> str:
        """Create a hash of user ID for anonymization"""
        return hashlib.sha256(user_id.encode()).hexdigest()[:16]
    
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
    user_hash = exporter._hash_user_id(user_id)
    
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
    user_hash = exporter._hash_user_id(user_id)
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


@router.post("/datacloud/ingest")
def datacloud_ingest():
    """Scaffold endpoint to forward curated tables to Salesforce Data Cloud Streaming API.
    Real implementation will authenticate and push records.
    """
    return {"ok": True, "status": "scaffold"}
