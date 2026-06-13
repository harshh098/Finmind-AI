# FILE: backend/services/security_service.py
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.security_question import SecurityQuestion
from services.auth_service import pwd_context

LOCK_MINUTES = 30
MAX_ATTEMPTS = 3


def hash_answer(answer: str) -> str:
    """Hash security answer using bcrypt. Plaintext never stored."""
    return pwd_context.hash(answer.strip().lower())


def verify_answer(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain.strip().lower(), hashed)


async def get_question(db: AsyncSession, user_id: int) -> Optional[SecurityQuestion]:
    r = await db.execute(select(SecurityQuestion).where(SecurityQuestion.user_id == user_id))
    return r.scalar_one_or_none()


def is_locked(sq: SecurityQuestion) -> bool:
    if not sq.is_temporarily_locked:
        return False
    if sq.locked_until is None:
        return True
    lu = sq.locked_until
    if lu.tzinfo is None:
        lu = lu.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) < lu


async def verify_security_answer(db: AsyncSession, user_id: int, plain_answer: str) -> dict:
    sq = await get_question(db, user_id)
    if sq is None:
        return {"success": False, "locked": False, "attempts_left": MAX_ATTEMPTS,
                "locked_until": None, "error": "No security question configured."}

    if is_locked(sq):
        return {"success": False, "locked": True, "attempts_left": 0,
                "locked_until": sq.locked_until, "question": sq.question,
                "error": f"Temporarily locked. Try again after {LOCK_MINUTES} minutes."}

    # Auto-unlock if cooldown expired
    if sq.is_temporarily_locked and sq.locked_until:
        lu = sq.locked_until
        if lu.tzinfo is None:
            lu = lu.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) >= lu:
            sq.is_temporarily_locked = False
            sq.failed_attempts = 0
            sq.locked_until = None
            await db.commit()

    correct = verify_answer(plain_answer, sq.answer_hash)
    if correct:
        sq.failed_attempts = 0
        await db.commit()
        return {"success": True, "locked": False, "attempts_left": MAX_ATTEMPTS,
                "locked_until": None, "question": sq.question}

    sq.failed_attempts += 1
    left = MAX_ATTEMPTS - sq.failed_attempts
    if sq.failed_attempts >= MAX_ATTEMPTS:
        sq.is_temporarily_locked = True
        sq.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCK_MINUTES)
        left = 0
    await db.commit()
    return {
        "success": False, "locked": sq.is_temporarily_locked,
        "attempts_left": max(0, left),
        "locked_until": sq.locked_until, "question": sq.question,
        "error": (f"Incorrect answer. {max(0, left)} attempt(s) remaining."
                  if not sq.is_temporarily_locked
                  else f"Too many incorrect answers. Withdrawal locked for {LOCK_MINUTES} minutes."),
    }
