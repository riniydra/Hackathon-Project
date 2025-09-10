from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Text, Integer, DateTime, Float, JSON, func
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

class RiskSnapshot(Base):
    __tablename__ = "risk_snapshots"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    score: Mapped[float] = mapped_column(Float, nullable=False)
    level: Mapped[str] = mapped_column(String(20), nullable=False)
    feature_scores: Mapped[dict] = mapped_column(JSON, nullable=False)
    reasons: Mapped[list] = mapped_column(JSON, nullable=False)
    weights: Mapped[dict] = mapped_column(JSON, nullable=False)
    thresholds: Mapped[dict] = mapped_column(JSON, nullable=False)
