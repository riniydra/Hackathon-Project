from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models
from ..auth import get_current_user_id
from ..schemas import ChatMessage, ProfileOut
import json
import asyncio
from typing import AsyncGenerator

router = APIRouter()

def get_user_profile(user_id: str, db: Session) -> ProfileOut:
    """Get user profile for chat context"""
    if user_id == "demo":
        return ProfileOut(
            age=25,
            gender="prefer not to say",
            relationship_status="single",
            victim_housing="safe",
            has_trusted_support=True,
            default_confidentiality="private",
            default_share_with="",
            num_children=0
        )
    
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not user:
        return ProfileOut()  # Empty profile if user not found
    
    return ProfileOut(
        age=user.age,
        gender=user.gender,
        relationship_status=user.relationship_status,
        victim_housing=user.victim_housing,
        has_trusted_support=user.has_trusted_support,
        default_confidentiality=user.default_confidentiality,
        default_share_with=user.default_share_with,
        num_children=user.num_children
    )

def build_chat_context(profile: ProfileOut, message: ChatMessage) -> str:
    """Build context string from profile and message overrides"""
    context_parts = []
    
    # Use overrides if provided, otherwise use profile defaults
    confidentiality = message.context_overrides.confidentiality if message.context_overrides and message.context_overrides.confidentiality else profile.default_confidentiality
    share_with = message.context_overrides.share_with if message.context_overrides and message.context_overrides.share_with else profile.default_share_with
    include_profile = message.context_overrides.include_profile if message.context_overrides and message.context_overrides.include_profile is not None else True
    
    if include_profile and profile:
        context_parts.append("User Profile Context:")
        if profile.age:
            context_parts.append(f"- Age: {profile.age}")
        if profile.gender:
            context_parts.append(f"- Gender: {profile.gender}")
        if profile.relationship_status:
            context_parts.append(f"- Relationship Status: {profile.relationship_status}")
        if profile.victim_housing:
            context_parts.append(f"- Housing Situation: {profile.victim_housing}")
        if profile.has_trusted_support is not None:
            support_text = "Yes" if profile.has_trusted_support else "No"
            context_parts.append(f"- Has Trusted Support: {support_text}")
        if profile.num_children is not None:
            context_parts.append(f"- Number of Children: {profile.num_children}")
    
    if confidentiality:
        context_parts.append(f"Confidentiality Level: {confidentiality}")
    
    if share_with:
        context_parts.append(f"Share With: {share_with}")
    
    return "\n".join(context_parts) if context_parts else ""

async def generate_empathetic_response(message: str, context: str) -> AsyncGenerator[str, None]:
    """Generate empathetic chat response with context (mock implementation)"""
    # This is a mock implementation - in production, you'd integrate with an LLM
    system_prompt = """You are an empathetic AI assistant designed to support individuals who may be experiencing domestic violence. 
    Your responses should be:
    - Compassionate and non-judgmental
    - Respectful of the user's autonomy and choices
    - Focused on safety and well-being
    - Never directive or prescriptive about what they "should" do
    - Supportive of their feelings and experiences
    
    Always include crisis resources when appropriate and remind users that this is not a replacement for professional help.
    """
    
    # Mock streaming response
    response_parts = [
        "I hear you, and I want you to know that your feelings are completely valid. ",
        "It takes courage to reach out and share what you're experiencing. ",
        "You deserve support and care. ",
        "\n\nIf you're in immediate danger, please reach out to:\n",
        "• National Domestic Violence Hotline: 1-800-799-7233\n",
        "• Crisis Text Line: Text HOME to 741741\n",
        "• Local emergency services: 911\n\n",
        "Remember, this conversation is confidential and you're in control of what you share."
    ]
    
    for part in response_parts:
        await asyncio.sleep(0.1)  # Simulate streaming delay
        yield f"data: {json.dumps({'content': part})}\n\n"
    
    yield "data: [DONE]\n\n"

@router.post("/stream")
async def chat_stream(
    message: ChatMessage,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Stream chat response with profile context"""
    try:
        # Get user profile for context
        profile = get_user_profile(user_id, db)
        
        # Build context from profile and overrides
        context = build_chat_context(profile, message)
        
        # Generate streaming response
        return StreamingResponse(
            generate_empathetic_response(message.message, context),
            media_type="text/plain",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/context")
def get_chat_context(
    message: ChatMessage,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get the chat context that would be used for a message (for debugging/preview)"""
    profile = get_user_profile(user_id, db)
    context = build_chat_context(profile, message)
    
    return {
        "context": context,
        "profile_used": profile.dict(),
        "overrides_applied": message.context_overrides.dict() if message.context_overrides else None
    }