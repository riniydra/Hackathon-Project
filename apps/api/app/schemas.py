from pydantic import BaseModel, Field
from datetime import datetime

class JournalCreate(BaseModel):
    text: str = Field(min_length=1, max_length=4000)

class JournalOut(BaseModel):
    id: int
    user_id: str
    created_at: datetime
    text: str  # decrypted for the caller
