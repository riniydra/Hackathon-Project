from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class JournalCreate(BaseModel):
    text: str = Field(min_length=1, max_length=4000)

class JournalOut(BaseModel):
    id: int
    user_id: str
    created_at: datetime
    text: str  # decrypted for the caller

class ProfileUpdate(BaseModel):
    age: Optional[int] = Field(None, ge=13, le=120)  # Age validation
    gender: Optional[str] = Field(None, max_length=50)
    relationship_status: Optional[str] = Field(None, max_length=100)
    victim_housing: Optional[str] = Field(None, max_length=100)
    has_trusted_support: Optional[bool] = None
    default_confidentiality: Optional[str] = Field(None, max_length=50)
    default_share_with: Optional[str] = Field(None, max_length=255)
    num_children: Optional[int] = Field(None, ge=0, le=20)

class ProfileOut(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    relationship_status: Optional[str] = None
    victim_housing: Optional[str] = None
    has_trusted_support: Optional[bool] = None
    default_confidentiality: Optional[str] = None
    default_share_with: Optional[str] = None
    num_children: Optional[int] = None

class ChatContextOverrides(BaseModel):
    confidentiality: Optional[str] = Field(None, max_length=50)
    share_with: Optional[str] = Field(None, max_length=255)
    include_profile: Optional[bool] = True

class ChatMessage(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    context_overrides: Optional[ChatContextOverrides] = None
