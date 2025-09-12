from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text as sql_text
from typing import Dict, List, Any
from datetime import datetime, timedelta

from ..db import get_db
from ..auth import get_current_user_id
from ..salesforce import data_cloud_client
from ..utils.ids import user_id_hash

router = APIRouter()

@router.post("/authenticate")
def authenticate_salesforce():
    """Authenticate with Salesforce Data Cloud"""
    success = data_cloud_client.authenticate()
    return {"ok": success, "authenticated": success}

@router.post("/stream/events")
def stream_events_to_datacloud(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Stream recent chat events to Data Cloud"""
    if user_id == "demo":
        return {"ok": False, "message": "Demo users cannot stream to Data Cloud"}
    
    try:
        # Get recent events (last 24 hours)
        since = datetime.utcnow() - timedelta(hours=24)
        events = db.execute(sql_text(
            """
            SELECT event_id, chat_id, user_id, created_at, journal_entry, entry_source,
                   jurisdiction, location_type, children_present, event_type, type_of_abuse,
                   sentiment_score, risk_points, severity_score, escalation_index,
                   threats_to_kill, strangulation, weapon_involved, stalking,
                   digital_surveillance, model_summary, confidentiality_level,
                   share_with, extra_json
            FROM chat_events 
            WHERE user_id = :uid AND created_at >= :since
            ORDER BY created_at DESC
            """
        ), {"uid": user_id, "since": since}).fetchall()
        
        streamed = 0
        failed = 0
        
        for event in events:
            event_dict = dict(event._mapping)
            if data_cloud_client.stream_chat_event(event_dict):
                streamed += 1
            else:
                failed += 1
        
        return {
            "ok": True,
            "streamed": streamed,
            "failed": failed,
            "user_hash": user_id_hash(user_id)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Streaming failed: {str(e)}")

@router.post("/stream/risk")
def stream_risk_to_datacloud(
    user_id: str = Depends(get_current_user_id)
):
    """Stream current risk snapshot to Data Cloud"""
    if user_id == "demo":
        return {"ok": False, "message": "Demo users cannot stream to Data Cloud"}
    
    try:
        # Get current risk data (would call insights endpoint)
        from ..routes.insights import risk_evaluator
        from ..db import get_db
        
        db = next(get_db())
        risk_data = risk_evaluator.evaluate_user_risk(db, user_id)
        
        success = data_cloud_client.stream_risk_snapshot(user_id, risk_data)
        
        return {
            "ok": success,
            "user_hash": user_id_hash(user_id),
            "risk_score": risk_data.get("score"),
            "risk_level": risk_data.get("level")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk streaming failed: {str(e)}")

@router.get("/status")
def datacloud_status():
    """Check Data Cloud connection status"""
    return {
        "authenticated": data_cloud_client.sf is not None,
        "streaming_enabled": data_cloud_client.sf is not None and settings.DATA_CLOUD_STREAMING_ENABLED,
        "endpoint": data_cloud_client.streaming_endpoint
    }
