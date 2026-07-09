from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.user import User
from models.transaction import Account, Transaction
from services.auth_service import get_current_user
from services.fraud_service import analyze_all_transactions, FRAUD_RULES

router = APIRouter(prefix="/fraud", tags=["Fraud Detection"])


async def _load_user_transactions(db: AsyncSession, user_id: int) -> list:
    result = await db.execute(
        select(Account).where(Account.user_id == user_id, Account.is_active == True)
    )
    account = result.scalar_one_or_none()
    if not account:
        return []
    tx_result = await db.execute(
        select(Transaction).where(Transaction.account_id == account.id)
        .order_by(Transaction.date.desc())
    )
    return [
        {
            "id": t.id, "type": t.type, "amount": float(t.amount),
            "sender": t.sender, "receiver": t.receiver,
            "date": str(t.date), "category": t.category,
            "created_at": t.created_at, "status": t.status,
            "is_flagged": t.is_flagged,"fraud_score": t.fraud_score,
            "fraud_flags": t.fraud_flags,
        }
        for t in tx_result.scalars().all()
    ]


@router.get("/report")
async def get_fraud_report(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tx_dicts = await _load_user_transactions(db, current_user.id)
    return analyze_all_transactions(tx_dicts)


@router.get("/rules")
async def get_fraud_rules(current_user: User = Depends(get_current_user)):
    return [
        {"id": r["id"], "rule": r["rule"], "severity": r["severity"]}
        for r in FRAUD_RULES
    ]


@router.get("/stats")
async def get_fraud_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tx_dicts = await _load_user_transactions(db, current_user.id)
    result   = analyze_all_transactions(tx_dicts)
    return {
        "total_transactions": result["total_transactions"],
        "flagged_count":      result["flagged_count"],
        "blocked_count":      result["blocked_count"],
        "warning_count":      result["warning_count"],
        "overall_risk":       result["overall_risk"],
        "high_risk":          result["high_risk"],
        "medium_risk":        result["medium_risk"],
        "low_risk":           result["low_risk"],
        "ml_trained":         result["ml_model_trained"],
        "ml_sample_count":    result["ml_sample_count"],
    }
