# FILE: backend/models/user.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(100), nullable=False)
    email         = Column(String(150), unique=True, nullable=False, index=True)
    mobile        = Column(String(20))
    password_hash = Column(String, nullable=False)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    accounts = relationship(
        "Account",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    beneficiaries = relationship(
        "Beneficiary",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    reminders = relationship(
        "Reminder",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    otp_sessions = relationship(
        "OTPSession",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    security_question = relationship(
        "SecurityQuestion",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )