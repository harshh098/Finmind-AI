"""
Shared utility helpers used across backend modules.
"""
import re
from datetime import datetime, timedelta
from typing import Optional
import pytz

IST = pytz.timezone("Asia/Kolkata")


def extract_amount(text: str) -> Optional[float]:
    """Extract the first numeric amount from a text string."""
    match = re.search(r"[\d,]+(?:\.\d{1,2})?", text.replace(",", ""))
    if match:
        try:
            return float(match.group().replace(",", ""))
        except ValueError:
            return None
    return None


def extract_receiver(text: str) -> str:
    """Try to extract a recipient name from a transfer query."""
    match = re.search(r"\bto\s+([A-Za-z][A-Za-z\s]{1,30}?)(?:\s+for|\s+of|\s+rs|\s+rupees|$)", text, re.IGNORECASE)
    if match:
        return match.group(1).strip().title()
    return "Recipient"


def extract_reason(text: str) -> Optional[str]:
    """Extract reason/purpose from text (after 'for')."""
    match = re.search(r"\bfor\s+(.+?)(?:\s+to\s|\s+rs\s|$)", text, re.IGNORECASE)
    if match:
        return match.group(1).strip().title()
    return None


def parse_date_nlp(text: str) -> datetime:
    """Parse natural language date expressions to datetime."""
    now = datetime.now(IST)
    text_lower = text.lower()

    if "day after tomorrow" in text_lower:
        return now + timedelta(days=2)
    if "tomorrow" in text_lower:
        return now + timedelta(days=1)
    if "next week" in text_lower:
        return now + timedelta(weeks=1)
    if "next month" in text_lower:
        return (now.replace(day=1) + timedelta(days=32)).replace(day=1)

    # Try dateutil
    try:
        from dateutil import parser as dp
        parsed = dp.parse(text, default=now.replace(tzinfo=None), fuzzy=True, dayfirst=True)
        return IST.localize(parsed) if parsed.tzinfo is None else parsed
    except Exception:
        return now


def detect_category(text: str) -> str:
    """Detect expense category from message/description text."""
    text_lower = text.lower()
    mapping = {
        "rent": "Rent", "food": "Food", "grocery": "Groceries", "groceries": "Groceries",
        "medicine": "Healthcare", "medical": "Healthcare", "hospital": "Healthcare",
        "shopping": "Shopping", "clothes": "Shopping", "amazon": "Shopping",
        "loan": "Loan", "emi": "Loan", "tuition": "Education", "education": "Education",
        "petrol": "Transport", "uber": "Transport", "transport": "Transport",
        "gift": "Gifts", "birthday": "Gifts",
        "salary": "Income", "bonus": "Income", "freelance": "Income",
    }
    for keyword, cat in mapping.items():
        if keyword in text_lower:
            return cat
    return "General"


def format_inr(amount: float) -> str:
    """Format a number as Indian Rupees string."""
    return f"₹{amount:,.0f}"


def now_ist() -> datetime:
    """Return current datetime in IST timezone."""
    return datetime.now(IST)


def sanitize_string(value: str, max_len: int = 255) -> str:
    """Strip HTML tags and truncate a string."""
    clean = re.sub(r"<[^>]+>", "", value or "")
    return clean.strip()[:max_len]
