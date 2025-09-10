from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..db import get_db
from ..auth import get_current_user_id

router = APIRouter()

@router.post("/", response_model=schemas.ChatEventOut, status_code=201)
def create_chat_event(
    payload: schemas.ChatEventCreate, 
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_current_user_id)
):
    """Create a new chat event with optional guided chip responses in extra_json"""
    if user_id == "demo":
        raise HTTPException(status_code=401, detail="Login required")
    
    chat_event = models.ChatEvent(
        user_id=user_id,
        role=payload.role,
        message=payload.message,
        extra_json=payload.extra_json
    )
    
    db.add(chat_event)
    db.commit()
    db.refresh(chat_event)
    
    return chat_event

@router.get("/", response_model=List[schemas.ChatEventOut])
def list_chat_events(
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_current_user_id),
    limit: int = 50
):
    """Get chat history for the current user"""
    if user_id == "demo":
        raise HTTPException(status_code=401, detail="Login required")
    
    events = db.query(models.ChatEvent).filter(
        models.ChatEvent.user_id == user_id
    ).order_by(models.ChatEvent.created_at.desc()).limit(limit).all()
    
    return events

@router.post("/guided-chips", response_model=schemas.ChatEventOut, status_code=201)
def save_guided_chip_responses(
    chip_responses: schemas.GuidedChipResponse,
    message: str = "Guided chip responses collected",
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_current_user_id)
):
    """Save guided chip responses in a chat event's extra_json field"""
    if user_id == "demo":
        raise HTTPException(status_code=401, detail="Login required")
    
    # Convert chip responses to dict, filtering out None values
    chip_data = {k: v for k, v in chip_responses.dict().items() if v is not None}
    
    chat_event = models.ChatEvent(
        user_id=user_id,
        role="user",
        message=message,
        extra_json={"guided_chips": chip_data}
    )
    
    db.add(chat_event)
    db.commit()
    db.refresh(chat_event)
    
    return chat_event

@router.get("/guided-chips/latest")
def get_latest_guided_chips(
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_current_user_id)
):
    """Get the latest guided chip responses for the current user"""
    if user_id == "demo":
        raise HTTPException(status_code=401, detail="Login required")
    
    # Find the most recent chat event with guided_chips data
    event = db.query(models.ChatEvent).filter(
        models.ChatEvent.user_id == user_id,
        models.ChatEvent.extra_json.contains({"guided_chips": {}})
    ).order_by(models.ChatEvent.created_at.desc()).first()
    
    if not event or not event.extra_json:
        return {"guided_chips": {}}
    
    return event.extra_json