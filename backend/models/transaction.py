# FILE: backend/models/transaction.py
from sqlalchemy import (Column, Integer, String, Numeric, Date, Float,
                        Boolean, DateTime, Text, JSON, ForeignKey, func)
from sqlalchemy.orm import relationship
from database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    account_no = Column(String(20), unique=True, nullable=False)
    account_type = Column(String(30), default="savings")
    balance = Column(Numeric(15, 2), default=0.00)
    currency = Column(String(5), default="INR")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(20), nullable=False)       # deposit | withdraw | transfer
    amount = Column(Numeric(12, 2), nullable=False)
    sender = Column(String(100))
    receiver = Column(String(100))
    message = Column(Text)
    category = Column(String(50), default="General")
    date = Column(Date, nullable=False, server_default=func.current_date())
    fraud_score = Column(Float, default=0.0)
    fraud_flags = Column(JSON, default=list)
    is_flagged = Column(Boolean, default=False)
    # completed | blocked | warning — daily limit usage (banking.py) counts
    # ONLY status == "completed" transfers/withdrawals/deposits. Blocked
    # fraud transactions are persisted for audit/history but excluded from
    # limit totals.
    status = Column(String(20), nullable=False, default="completed")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    account = relationship("Account", back_populates="transactions")
    fraud_logs = relationship("FraudLog", back_populates="transaction", cascade="all, delete-orphan")


class FraudLog(Base):
    __tablename__ = "fraud_logs"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"))
    rule_id = Column(String(10))
    rule_desc = Column(Text)
    severity = Column(String(10))
    ml_score = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    transaction = relationship("Transaction", back_populates="fraud_logs")


class Beneficiary(Base):
    __tablename__ = "beneficiaries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    account_no = Column(String(13), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="beneficiaries")