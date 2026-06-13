"""
Input validation helpers for banking operations.
"""
import re
from typing import Optional


def validate_amount(amount: float, min_amt: float = 1.0, max_amt: float = 1_000_000.0) -> Optional[str]:
    """Return error string or None if valid."""
    if amount < min_amt:
        return f"Amount must be at least ₹{min_amt:,.0f}"
    if amount > max_amt:
        return f"Amount cannot exceed ₹{max_amt:,.0f}"
    return None


def validate_mobile(mobile: str) -> bool:
    """Validate Indian mobile number (10 digits, optionally +91 prefix)."""
    cleaned = re.sub(r"[\s\-\(\)]", "", mobile)
    pattern = r"^(\+91)?[6-9]\d{9}$"
    return bool(re.match(pattern, cleaned))


def validate_otp(otp: str) -> bool:
    """OTP must be exactly 6 digits."""
    return bool(re.match(r"^\d{6}$", otp.strip()))


def validate_ifsc(ifsc: str) -> bool:
    """Validate IFSC code format: 4 letters + 0 + 6 alphanumeric chars."""
    return bool(re.match(r"^[A-Z]{4}0[A-Z0-9]{6}$", ifsc.upper()))


def validate_account_number(account_no: str) -> bool:
    """Bank account numbers are typically 9–18 digits."""
    cleaned = re.sub(r"\s", "", account_no)
    return cleaned.isdigit() and 9 <= len(cleaned) <= 18


def validate_pan(pan: str) -> bool:
    """Validate PAN card format: AAAAA9999A."""
    return bool(re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]$", pan.upper()))


def sanitize_name(name: str) -> str:
    """Remove special characters from a name field."""
    return re.sub(r"[^A-Za-z\s\.\-]", "", name).strip()[:100]
