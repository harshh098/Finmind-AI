# FILE: backend/models/__init__.py
# Import all models so SQLAlchemy Base.metadata discovers every table
from models.user import User
from models.transaction import Account, Transaction, FraudLog
from models.reminder import Reminder, OTPSession
from models.security_question import SecurityQuestion

__all__ = [
    "User", "Account", "Transaction", "FraudLog",
    "Reminder", "OTPSession", "SecurityQuestion",
]
