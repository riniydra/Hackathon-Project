from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any

class JournalCreate(BaseModel):
    text: str = Field(min_length=1, max_length=4000)

class JournalOut(BaseModel):
    id: int
    user_id: str
    created_at: datetime
    text: str  # decrypted for the caller

class ChatEventCreate(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    message: str = Field(min_length=1, max_length=4000)
    extra_json: Optional[Dict[str, Any]] = None

class ChatEventOut(BaseModel):
    id: int
    user_id: str
    created_at: datetime
    role: str
    message: str
    extra_json: Optional[Dict[str, Any]] = None

class GuidedChipResponse(BaseModel):
    substance_use: Optional[str] = None
    frequency_of_abuse: Optional[str] = None
    financial_control: Optional[str] = None
    reporting_history: Optional[str] = None
    recent_escalation: Optional[str] = None
    safety_plan: Optional[str] = None
