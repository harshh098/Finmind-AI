# FILE: backend/models/schemas.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import date, time, datetime


# ─── Auth ─────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    mobile: Optional[str] = None
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    mobile: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Account ──────────────────────────────────────────────────────────────────
class AccountOut(BaseModel):
    id: int
    account_no: str
    account_type: str
    balance: float
    currency: str

    class Config:
        from_attributes = True


# ─── Transactions ─────────────────────────────────────────────────────────────
class TransferRequest(BaseModel):
    receiver: str
    amount: float
    message: Optional[str] = None
    category: Optional[str] = None
    confirm_risk: bool = False   # naya field — default False, backward compatible


class DepositRequest(BaseModel):
    amount: float = Field(gt=0)
    sender: str = "External"
    message: Optional[str] = "Deposit"
    category: Optional[str] = "Income"


class WithdrawRequest(BaseModel):
    amount: float = Field(gt=0)


class OTPVerifyRequest(BaseModel):
    otp: str
    session_id: int


class TransactionOut(BaseModel):
    id: int
    type: str
    amount: float
    sender: Optional[str]
    receiver: Optional[str]
    message: Optional[str]
    category: Optional[str]
    date: date
    fraud_score: float
    fraud_flags: List[Any]
    is_flagged: bool
    status: str

    class Config:
        from_attributes = True


# ─── Security Question ────────────────────────────────────────────────────────
class SecurityQuestionOut(BaseModel):
    question: str
    failed_attempts: int
    is_temporarily_locked: bool
    locked_until: Optional[datetime]

    class Config:
        from_attributes = True


class SecurityAnswerVerify(BaseModel):
    answer: str


# ─── Beneficiary ──────────────────────────────────────────────────────────────
class BeneficiaryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    account_no: str = Field(min_length=13, max_length=13, pattern=r"^\d{13}$")


class BeneficiaryOut(BaseModel):
    id: int
    name: str
    account_no: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Reminders ────────────────────────────────────────────────────────────────
class ReminderCreate(BaseModel):
    type: str
    task: str
    date: date
    time: str
    amount: float = 0.0
    status: str = "pending"
    related_to: Optional[str] = ""
    notify_before_min: int = 60


class ReminderUpdate(BaseModel):
    type: Optional[str] = None
    task: Optional[str] = None
    date: Optional[date] = None
    time: Optional[str] = None
    amount: Optional[float] = None
    status: Optional[str] = None
    related_to: Optional[str] = None
    notify_before_min: Optional[int] = None


class ReminderOut(BaseModel):
    rid: int
    type: str
    task: str
    date: date
    time: Any
    amount: float
    status: str
    related_to: Optional[str]
    notify_before_min: int

    class Config:
        from_attributes = True


# ─── Agent ────────────────────────────────────────────────────────────────────
class AgentQuery(BaseModel):
    query: str
    user_id: Optional[int] = 1
    account_id: Optional[int] = 1


class AgentResponse(BaseModel):
    intent: str
    response: str
    steps: List[dict]
    confidence: Optional[float] = None
    sources: Optional[List[str]] = None


# ─── Fraud ────────────────────────────────────────────────────────────────────
class FraudReport(BaseModel):
    total_transactions: int
    flagged_count: int
    high_risk: int
    medium_risk: int
    low_risk: int
    blocked_count: int = 0
    warning_count: int = 0
    alerts: List[dict]
    overall_risk: str
    ml_model_trained: bool = False
    ml_sample_count: int = 0


# ─── Expense ──────────────────────────────────────────────────────────────────
class ExpenseAnalysis(BaseModel):
    total_income: float
    total_expense: float
    net_savings: float
    savings_rate: float
    by_category: dict
    by_month: dict
    top_categories: List[dict]
    insights: List[str]