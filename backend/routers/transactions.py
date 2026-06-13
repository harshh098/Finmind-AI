# FILE: backend/routers/transactions.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.user import User
from models.transaction import Account, Transaction
from models.schemas import ExpenseAnalysis
from services.auth_service import get_current_user
from services.expense_service import get_expense_analysis, analyze_transactions_local

router = APIRouter(prefix="/transactions", tags=["Transactions"])


async def _get_acc_txs(db: AsyncSession, user_id: int):
    acc = (await db.execute(select(Account).where(Account.user_id == user_id, Account.is_active == True))).scalar_one_or_none()
    if not acc:
        return None, []
    return acc, (await db.execute(select(Transaction).where(Transaction.account_id == acc.id))).scalars().all()


@router.get("/expense-analysis", response_model=ExpenseAnalysis)
async def expense_analysis(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    acc, _ = await _get_acc_txs(db, current_user.id)
    if acc:
        return await get_expense_analysis(db, acc.id)
    return ExpenseAnalysis(total_income=0, total_expense=0, net_savings=0, savings_rate=0,
                           by_category={}, by_month={}, top_categories=[], insights=["No transactions found."])


@router.get("/summary")
async def transaction_summary(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    _, txs = await _get_acc_txs(db, current_user.id)
    if not txs:
        return {"total": 0, "deposits": 0, "transfers": 0, "withdrawals": 0, "total_deposited": 0.0, "total_spent": 0.0}
    return {
        "total":           len(txs),
        "deposits":        sum(1 for t in txs if t.type == "deposit"),
        "transfers":       sum(1 for t in txs if t.type == "transfer"),
        "withdrawals":     sum(1 for t in txs if t.type == "withdraw"),
        "total_deposited": float(sum(t.amount for t in txs if t.type == "deposit")),
        "total_spent":     float(sum(t.amount for t in txs if t.type != "deposit")),
    }


@router.get("/categories")
async def spending_by_category(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    _, txs = await _get_acc_txs(db, current_user.id)
    if not txs:
        return []
    tx_dicts = [{"type": t.type, "amount": float(t.amount), "category": t.category, "date": str(t.date)} for t in txs]
    result = analyze_transactions_local(tx_dicts)
    return sorted([{"category": k, "amount": v} for k, v in result["by_category"].items() if k != "Income"],
                  key=lambda x: x["amount"], reverse=True)


@router.get("/monthly")
async def monthly_trends(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    _, txs = await _get_acc_txs(db, current_user.id)
    if not txs:
        return []
    tx_dicts = [{"type": t.type, "amount": float(t.amount), "category": t.category, "date": str(t.date)} for t in txs]
    result = analyze_transactions_local(tx_dicts)
    return [{"month": k, "income": v["income"], "expense": v["expense"]} for k, v in result["by_month"].items()]
