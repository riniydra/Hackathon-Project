from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Text, Integer, DateTime, func
from .db import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    pin_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    duress_pin_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(50), nullable=True)
    relationship_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    num_children: Mapped[int | None] = mapped_column(Integer, nullable=True)

class Journal(Base):
    __tablename__ = "journals"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # store ciphertext as base64 string for simplicity
    ciphertext_b64: Mapped[str] = mapped_column(Text, nullable=False)
    iv_b64: Mapped[str] = mapped_column(String(64), nullable=False)
    tag_b64: Mapped[str] = mapped_column(String(64), nullable=False)

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    session_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[str] = mapped_column(String(64), index=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # 'user' or 'assistant'
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # Encrypted message content
    ciphertext_b64: Mapped[str] = mapped_column(Text, nullable=False)
    iv_b64: Mapped[str] = mapped_column(String(64), nullable=False)
    tag_b64: Mapped[str] = mapped_column(String(64), nullable=False)
    # NLP analysis results (encrypted)
    intent: Mapped[str | None] = mapped_column(String(50), nullable=True)
    abuse_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sentiment_score: Mapped[float | None] = mapped_column(nullable=True)
    risk_points: Mapped[int | None] = mapped_column(Integer, nullable=True)
    severity_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    escalation_index: Mapped[float | None] = mapped_column(nullable=True)
    # Risk flags (boolean columns for easy querying)
    threats_to_kill: Mapped[bool | None] = mapped_column(nullable=True)
    strangulation: Mapped[bool | None] = mapped_column(nullable=True)
    weapon_involved: Mapped[bool | None] = mapped_column(nullable=True)
    children_present: Mapped[bool | None] = mapped_column(nullable=True)
    stalking: Mapped[bool | None] = mapped_column(nullable=True)
    digital_surveillance: Mapped[bool | None] = mapped_column(nullable=True)
    # Context metadata (JSON stored as text for simplicity)
    meta_json: Mapped[str | None] = mapped_column(Text, nullable=True)

class RiskSnapshot(Base):
    __tablename__ = "risk_snapshots"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    risk_score: Mapped[float] = mapped_column(nullable=False)
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False)  # 'low', 'medium', 'high'
    # Feature scores (JSON stored as text for simplicity)
    feature_scores: Mapped[str] = mapped_column(Text, nullable=False)  # JSON string
    # Risk flags
    threats_to_kill: Mapped[bool] = mapped_column(nullable=False, default=False)
    strangulation: Mapped[bool] = mapped_column(nullable=False, default=False)
    weapon_involved: Mapped[bool] = mapped_column(nullable=False, default=False)
    children_present: Mapped[bool] = mapped_column(nullable=False, default=False)
    stalking: Mapped[bool] = mapped_column(nullable=False, default=False)
    digital_surveillance: Mapped[bool] = mapped_column(nullable=False, default=False)
