# FILE: backend/routers/agent.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.user import User
from models.transaction import Account, Transaction
from models.reminder import Reminder
from models.schemas import AgentQuery, AgentResponse
from services.auth_service import get_current_user
from agents.graph import run_agent
from rag.vector_store import rag_store

router = APIRouter(prefix="/agent", tags=["AI Agent"])


async def _get_context(db: AsyncSession, user_id: int) -> dict:
    acc = (await db.execute(select(Account).where(Account.user_id == user_id, Account.is_active == True))).scalar_one_or_none()
    txs, balance = [], 0.0
    if acc:
        balance = float(acc.balance)
        txs = [
            {"id": t.id, "type": t.type, "amount": float(t.amount),
             "sender": t.sender, "receiver": t.receiver, "date": str(t.date),
             "category": t.category, "is_flagged": bool(t.is_flagged),
             "fraud_score": float(t.fraud_score or 0)}
            for t in (await db.execute(select(Transaction).where(Transaction.account_id == acc.id).order_by(Transaction.date.desc()))).scalars().all()
        ]
    rems = [
        {"rid": r.rid, "type": r.type, "task": r.task, "date": str(r.date),
         "status": r.status, "amount": float(r.amount or 0)}
        for r in (await db.execute(select(Reminder).where(Reminder.user_id == user_id))).scalars().all()
    ]
    return {"transactions": txs, "reminders": rems, "account_balance": balance,
            "account_id": acc.id if acc else None}


@router.post("/query", response_model=AgentResponse)
async def query_agent(payload: AgentQuery, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ctx = await _get_context(db, current_user.id)
    result = await run_agent(
        query=payload.query, user_id=current_user.id,
        account_id=ctx["account_id"] or 1,
        transactions=ctx["transactions"], reminders=ctx["reminders"],
        account_balance=ctx["account_balance"],
    )
    return AgentResponse(**result)


@router.get("/health")
async def agent_health():
    return {"agent": "online", "rag_initialized": rag_store._initialized, "langgraph": "ready"}
