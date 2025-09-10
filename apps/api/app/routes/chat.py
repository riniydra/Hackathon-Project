from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel
import uuid
import json
import os
from openai import OpenAI
from datetime import datetime, timezone
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

from ..db import get_db, engine, Base
from .. import models, schemas
from ..crypto import encrypt_text, decrypt_text
from ..auth import get_current_user_id
from ..nlp_utils import analyze_message, is_high_risk, get_emergency_message
from sqlalchemy import text as sql_text

# Ensure tables exist
Base.metadata.create_all(bind=engine)

router = APIRouter()

# OpenAI client (move to config later)
def get_openai_client():
    from ..config import settings
    api_key = settings.OPENAI_API_KEY
    print(f"OpenAI API Key present: {bool(api_key)}")
    if not api_key:
        print("No OpenAI API key found in environment")
        return None
    try:
        client = OpenAI(api_key=api_key)
        print("OpenAI client created successfully")
        return client
    except Exception as e:
        print(f"Failed to create OpenAI client: {e}")
        return None

class ChatMessageCreate(BaseModel):
    message: str
    session_id: str | None = None
    # Optional structured metadata from UI or conversational collection
    jurisdiction: str | None = None
    children_present: bool | None = None
    confidentiality: str | None = None  # 'private' | 'advocate_only' | 'share_with_attorney'
    share_with: str | None = None       # 'nobody' | 'advocate' | 'attorney'

class ChatMessageResponse(BaseModel):
    id: int
    session_id: str
    role: str
    content: str
    created_at: str
    intent: str | None = None
    abuse_type: str | None = None
    sentiment_score: float | None = None
    risk_points: int | None = None
    severity_score: int | None = None
    escalation_index: float | None = None
    is_high_risk: bool = False

class ChatSessionResponse(BaseModel):
    session_id: str
    created_at: str
    message_count: int

def get_or_create_session(db: Session, user_id: str, session_id: str | None = None) -> models.ChatSession:
    """Get existing session or create new one"""
    if session_id:
        session = db.query(models.ChatSession).filter(
            models.ChatSession.session_id == session_id,
            models.ChatSession.user_id == user_id
        ).first()
        if session:
            return session
    
    # Create new session
    new_session_id = f"sess_{uuid.uuid4().hex[:8]}"
    session = models.ChatSession(
        user_id=user_id,
        session_id=new_session_id
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.post("/sessions", response_model=ChatSessionResponse)
def create_chat_session(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Create a new chat session"""
    session = get_or_create_session(db, user_id)
    return ChatSessionResponse(
        session_id=session.session_id,
        created_at=session.created_at.isoformat(),
        message_count=0
    )

@router.get("/sessions", response_model=List[ChatSessionResponse])
def list_chat_sessions(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """List user's chat sessions"""
    if user_id == "demo":
        return []
    
    sessions = db.query(models.ChatSession).filter(
        models.ChatSession.user_id == user_id
    ).order_by(models.ChatSession.updated_at.desc()).all()
    
    result = []
    for session in sessions:
        message_count = db.query(models.ChatMessage).filter(
            models.ChatMessage.session_id == session.session_id
        ).count()
        
        result.append(ChatSessionResponse(
            session_id=session.session_id,
            created_at=session.created_at.isoformat(),
            message_count=message_count
        ))
    
    return result

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
def get_chat_messages(
    session_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Get messages for a specific chat session"""
    if user_id == "demo":
        return []
    
    # Verify session belongs to user
    session = db.query(models.ChatSession).filter(
        models.ChatSession.session_id == session_id,
        models.ChatSession.user_id == user_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = db.query(models.ChatMessage).filter(
        models.ChatMessage.session_id == session_id
    ).order_by(models.ChatMessage.created_at.asc()).all()
    
    result = []
    for msg in messages:
        content = decrypt_text(msg.ciphertext_b64, msg.iv_b64)
        result.append(ChatMessageResponse(
            id=msg.id,
            session_id=msg.session_id,
            role=msg.role,
            content=content,
            created_at=msg.created_at.isoformat(),
            intent=msg.intent,
            abuse_type=msg.abuse_type,
            sentiment_score=msg.sentiment_score,
            risk_points=msg.risk_points,
            severity_score=msg.severity_score,
            escalation_index=msg.escalation_index,
            is_high_risk=is_high_risk({
                "threats_to_kill": msg.threats_to_kill or False,
                "strangulation": msg.strangulation or False,
                "weapon_involved": msg.weapon_involved or False,
            })
        ))
    
    return result

@router.post("/stream", response_class=StreamingResponse)
def stream_chat_response(
    payload: ChatMessageCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Stream chat response with real-time NLP analysis"""
    
    def generate_response():
        try:
            # Get or create session
            session = get_or_create_session(db, user_id, payload.session_id)
            
            # Analyze user message
            analysis = analyze_message(payload.message)
            
            # Store user message
            ct, iv, tag = encrypt_text(payload.message)
            user_msg = models.ChatMessage(
                session_id=session.session_id,
                user_id=user_id,
                role="user",
                ciphertext_b64=ct,
                iv_b64=iv,
                tag_b64=tag,
                intent=analysis["intent"],
                abuse_type=analysis["abuse_type"],
                sentiment_score=analysis["sentiment_score"],
                risk_points=analysis["risk_points"],
                severity_score=analysis["severity_score"],
                escalation_index=analysis["escalation_index"],
                **analysis["risk_flags"]
            )
            # Attach metadata as JSON text if provided
            meta: Dict[str, Any] = {}
            for k in ["jurisdiction","children_present","confidentiality","share_with"]:
                v = getattr(payload, k, None)
                if v is not None:
                    meta[k] = v
            if meta:
                user_msg.meta_json = json.dumps(meta)
            db.add(user_msg)
            db.commit()
            db.refresh(user_msg)

            # Best-effort analytics/event record (created alongside the chat message)
            try:
                event_payload = {
                    "event_id": f"evt_{uuid.uuid4().hex[:12]}",
                    "chat_id": session.session_id,
                    "user_id": user_id,
                    "journal_entry": payload.message,
                    "entry_source": "web",
                    "jurisdiction": getattr(payload, "jurisdiction", None),
                    "location_type": getattr(payload, "location_type", None),
                    "children_present": getattr(payload, "children_present", None),
                    "event_type": analysis.get("intent"),
                    "type_of_abuse": analysis.get("abuse_type"),
                    "sentiment_score": analysis.get("sentiment_score"),
                    "risk_points": analysis.get("risk_points"),
                    "severity_score": analysis.get("severity_score"),
                    "escalation_index": analysis.get("escalation_index"),
                    "threats_to_kill": bool(analysis["risk_flags"].get("threats_to_kill")),
                    "strangulation": bool(analysis["risk_flags"].get("strangulation")),
                    "weapon_involved": bool(analysis["risk_flags"].get("weapon_involved")),
                    "stalking": bool(analysis["risk_flags"].get("stalking", False)),
                    "digital_surveillance": bool(analysis["risk_flags"].get("digital_surveillance", False)),
                    "model_summary": "Short neutral summary (no PII).",
                    "confidentiality_level": getattr(payload, "confidentiality", None),
                    "share_with": getattr(payload, "share_with", None),
                    "extra_json": None,
                }
                # Compose extra_json from any additional conversational fields if present in meta_json
                # (We already merged some in user_msg.meta_json; reuse it if available)
                if getattr(user_msg, "meta_json", None):
                    event_payload["extra_json"] = user_msg.meta_json

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
                db.execute(insert_sql, event_payload)
                db.commit()
            except Exception as _e:
                # Avoid breaking chat flow if analytics write fails
                db.rollback()
            
            # Send analysis results immediately
            yield f"data: {json.dumps({'type': 'analysis', 'data': analysis})}\n\n"
            
            # Check for high risk
            if is_high_risk(analysis["risk_flags"]):
                yield f"data: {json.dumps({'type': 'warning', 'message': get_emergency_message()})}\n\n"
            
            # Get recent message history for context
            recent_messages = db.query(models.ChatMessage).filter(
                models.ChatMessage.session_id == session.session_id
            ).order_by(models.ChatMessage.created_at.desc()).limit(10).all()
            
            # Build OpenAI message history (similar to chatdemoapp.py)
            messages = []
            for msg in reversed(recent_messages):
                content = decrypt_text(msg.ciphertext_b64, msg.iv_b64)
                messages.append({
                    "role": "assistant" if msg.role == "assistant" else "user",
                    "content": content
                })
            
            # Get AI response
            oai = get_openai_client()
            if oai:
                try:
                    # Choose prompt based on risk and tone
                    user_text_lower = payload.message.lower().strip()
                    is_greeting = user_text_lower in {"hi","hello","hey","hiya","yo"}
                    risk_is_high = is_high_risk(analysis["risk_flags"])
                    if risk_is_high:
                        system_prompt = (
                            "You are a supportive, non-clinical emotional support assistant for domestic violence survivors. "
                            "Be empathetic, succinct, and non-judgmental. Avoid medical/legal advice. "
                            "If there are safety risks (threats, strangulation, weapons), provide calm, direct guidance to seek immediate help from local emergency services. "
                            "Keep responses under 120 words."
                        )
                    elif is_greeting:
                        system_prompt = (
                            "You are a warm, concise support companion. When greeted, reply briefly and invite the person to share how they're feeling or what they'd like help with. "
                            "Do not mention emergency services or resources unless the user brings up danger or asks for resources. Keep responses under 60 words."
                        )
                    else:
                        system_prompt = (
                            "You are a supportive, non-clinical emotional support assistant. Be empathetic, succinct, and non-judgmental. "
                            "Offer optional next steps only if asked. Do not mention emergency services unless the user describes imminent danger. Keep responses under 100 words."
                        )
                    
                    # Build messages with system prompt
                    openai_messages = [{"role": "system", "content": system_prompt}]
                    for msg in messages[1:]:  # Skip the first system message
                        openai_messages.append(msg)
                    
                    chat = oai.chat.completions.create(
                        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                        messages=openai_messages,
                        temperature=0.3,
                        stream=True
                    )
                    
                    assistant_content = ""
                    for chunk in chat:
                        if chunk.choices[0].delta.content:
                            content = chunk.choices[0].delta.content
                            assistant_content += content
                            yield f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"
                    
                    # If no content was streamed, use fallback
                    if not assistant_content.strip():
                        assistant_content = "I'm here to support you. How can I help you today?"
                        yield f"data: {json.dumps({'type': 'content', 'content': assistant_content})}\n\n"
                        
                except Exception as e:
                    print(f"OpenAI error: {e}")  # Debug logging
                    assistant_content = "I'm here to support you. How can I help you today?"
                    yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            else:
                print("No OpenAI client available")  # Debug logging
                assistant_content = "I'm here to support you. How can I help you today?"
                yield f"data: {json.dumps({'type': 'content', 'content': assistant_content})}\n\n"
            
            # Store assistant response
            ct, iv, tag = encrypt_text(assistant_content)
            assistant_msg = models.ChatMessage(
                session_id=session.session_id,
                user_id=user_id,
                role="assistant",
                ciphertext_b64=ct,
                iv_b64=iv,
                tag_b64=tag
            )
            db.add(assistant_msg)
            db.commit()
            
            # Send completion signal
            yield f"data: {json.dumps({'type': 'complete', 'session_id': session.session_id})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        generate_response(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )

@router.delete("/sessions/{session_id}")
def delete_chat_session(
    session_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """Delete a chat session and all its messages"""
    if user_id == "demo":
        raise HTTPException(status_code=401, detail="Demo users cannot delete sessions")
    
    # Verify session belongs to user
    session = db.query(models.ChatSession).filter(
        models.ChatSession.session_id == session_id,
        models.ChatSession.user_id == user_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Delete all messages in session
    db.query(models.ChatMessage).filter(
        models.ChatMessage.session_id == session_id
    ).delete()
    
    # Delete session
    db.delete(session)
    db.commit()
    
    return {"ok": True, "message": "Session deleted"}
