from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Text, Integer, DateTime, Boolean, func
from .db import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    pin_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    duress_pin_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    # Profile fields
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(50), nullable=True)
    relationship_status: Mapped[str | None] = mapped_column(String(100), nullable=True)
    victim_housing: Mapped[str | None] = mapped_column(String(100), nullable=True)  # e.g., "safe", "with_abuser", "transitional", "unknown"
    has_trusted_support: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    default_confidentiality: Mapped[str | None] = mapped_column(String(50), nullable=True)  # e.g., "private", "shared", "anonymous"
    default_share_with: Mapped[str | None] = mapped_column(String(255), nullable=True)  # JSON string of trusted contact IDs or roles
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
