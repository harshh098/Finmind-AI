"""OTP service — fixed: lazy Twilio, UTC-aware expiry, string used field."""
import random, json
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from config import settings
from models.reminder import OTPSession


def _get_twilio():
    try:
        from twilio.rest import Client
        if not settings.twilio_account_sid or not settings.twilio_auth_token:
            return None
        return Client(settings.twilio_account_sid, settings.twilio_auth_token)
    except Exception as e:
        print(f"[OTP] Twilio init error: {e}")
        return None


def generate_otp() -> str:
    return str(random.randint(100000, 999999))


async def send_otp(mobile: str, otp: str) -> bool:
    try:
        client = _get_twilio()
        if client is None:
            print(f"[OTP] Dev mode — OTP: {otp}")
            return True
        client.messages.create(
            body=f"[FinMind AI] Your OTP is {otp}. Valid 5 min. Do NOT share.",
            from_=settings.twilio_phone, to=mobile,
        )
        return True
    except Exception as e:
        print(f"[OTP] Send error: {e}")
        return False


async def create_otp_session(db: AsyncSession, user_id: int, action: str, payload: dict, mobile: Optional[str] = None) -> tuple[int, str]:
    otp = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    session = OTPSession(
        user_id=user_id, otp=otp, action=action,
        payload=payload,
        expires_at=expires_at,
        used=False,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    await send_otp(mobile or settings.user_mobile, otp)
    return session.id, otp


async def verify_otp(db: AsyncSession, session_id: int, otp: str, user_id: int) -> Optional[dict]:
    result = await db.execute(
        select(OTPSession).where(
            OTPSession.id == session_id,
            OTPSession.user_id == user_id,
            OTPSession.used == False,
        )
    )
    session = result.scalar_one_or_none()
    if not session or session.otp != otp:
        return None
    expires = session.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires:
        return None
    await db.execute(update(OTPSession).where(OTPSession.id == session_id).values(used=True))
    await db.commit()
    return session.payload


async def count_failed_attempts(db: AsyncSession, user_id: int, action: str = "transfer", window_minutes: int = 60) -> int:
    since = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)
    result = await db.execute(
        select(OTPSession).where(
            OTPSession.user_id == user_id,
            OTPSession.action == action,
            OTPSession.created_at >= since,
        )
    )
    return sum(1 for s in result.scalars().all() if not s.used)
