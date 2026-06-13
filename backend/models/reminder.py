from sqlalchemy import (
    Column, Integer, String, Numeric, Date, Time,
    DateTime, Text, ForeignKey, func, Boolean, JSON
)
from sqlalchemy.orm import relationship
from database import Base


class Reminder(Base):
    __tablename__ = "reminders"

    rid = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)
    task = Column(Text, nullable=False)
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    amount = Column(Numeric(12, 2), default=0.00)
    status = Column(String(20), default="pending")
    related_to = Column(Text)
    notify_before_min = Column(Integer, default=60)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="reminders")


class OTPSession(Base):
    __tablename__ = "otp_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    otp = Column(String(6), nullable=False)
    action = Column(String(50), nullable=False)
    payload = Column(JSON, default=dict)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="otp_sessions")
