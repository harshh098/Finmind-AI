# FILE: backend/routers/analytics.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.user import User
from models.transaction import Account, Transaction
from models.reminder import Reminder
from services.auth_service import get_current_user
from services.analytics_service import compute_health_score, generate_insights, get_recommendations
from services.fraud_service import analyze_all_transactions

router = APIRouter(prefix="/analytics", tags=["Analytics"])


async def _load(db: AsyncSession, user_id: int):
    acc = (await db.execute(select(Account).where(Account.user_id == user_id, Account.is_active == True))).scalar_one_or_none()
    txs, rems = [], []
    if acc:
        txs = [
            {"id": t.id, "type": t.type, "amount": float(t.amount),
             "sender": t.sender, "receiver": t.receiver,
             "date": str(t.date), "category": t.category}
            for t in (await db.execute(select(Transaction).where(Transaction.account_id == acc.id))).scalars().all()
        ]
    rems = [
        {"rid": r.rid, "type": r.type, "task": r.task, "date": str(r.date),
         "status": r.status, "amount": float(r.amount or 0)}
        for r in (await db.execute(select(Reminder).where(Reminder.user_id == user_id))).scalars().all()
    ]
    return txs, rems


@router.get("/health-score")
async def health_score(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    txs, rems = await _load(db, current_user.id)
    fraud = analyze_all_transactions(txs)
    return compute_health_score(txs, rems, fraud["flagged_count"])


@router.get("/insights")
async def insights(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    txs, rems = await _load(db, current_user.id)
    return {"insights": generate_insights(txs, rems)}


@router.get("/recommendations")
async def recommendations(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    txs, rems = await _load(db, current_user.id)
    fraud  = analyze_all_transactions(txs)
    health = compute_health_score(txs, rems, fraud["flagged_count"])
    return {"recommendations": get_recommendations(health, rems)}


@router.get("/summary")
async def full_summary(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    txs, rems = await _load(db, current_user.id)
    fraud  = analyze_all_transactions(txs)
    from services.expense_service import analyze_transactions_local
    expense = analyze_transactions_local(txs)
    health  = compute_health_score(txs, rems, fraud["flagged_count"])
    return {
        "health":  health,
        "expense": expense,
        "fraud_summary": {
            "flagged":      fraud["flagged_count"],
            "blocked":      fraud["blocked_count"],
            "overall_risk": fraud["overall_risk"],
        },
        "insights":        generate_insights(txs, rems),
        "recommendations": get_recommendations(health, rems),
        "reminders_count": len([r for r in rems if r.get("status") == "pending"]),
    }
