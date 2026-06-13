# FILE: backend/models/security_question.py
from datetime import datetime, timezone
from sqlalchemy import (Column, Integer, String, Boolean, DateTime,
                        ForeignKey, func)
from sqlalchemy.orm import relationship
from database import Base


class SecurityQuestion(Base):
    __tablename__ = "security_questions"

    id                   = Column(Integer, primary_key=True, index=True)
    user_id              = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"),
                                  nullable=False, unique=True)
    question             = Column(String(255), nullable=False)
    answer_hash          = Column(String, nullable=False)   # bcrypt hash, NEVER plaintext
    failed_attempts      = Column(Integer, default=0)
    is_temporarily_locked = Column(Boolean, default=False)
    locked_until         = Column(DateTime(timezone=True), nullable=True)
    created_at           = Column(DateTime(timezone=True), server_default=func.now())
    updated_at           = Column(DateTime(timezone=True),
                                  server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="security_question")
