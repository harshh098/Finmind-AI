# FILE: backend/routers/banking.py
"""
Banking router v3:
- Deposit:  no OTP, immediate
- Withdraw: amount <= 50000 → OTP only
             amount >  50000 → Step 1: verify security question (DB, hashed)
                               Step 2: OTP
- Transfer: beneficiary check → fraud pre-check → OTP (or block)
"""
from datetime import date as date_type
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.user import User
from models.transaction import Account, Transaction, Beneficiary
from models.schemas import (TransferRequest, DepositRequest, WithdrawRequest,
                             OTPVerifyRequest, AccountOut, TransactionOut,
                             SecurityAnswerVerify, BeneficiaryCreate, BeneficiaryOut)
from services.auth_service import get_current_user
from services.otp_service import create_otp_session, verify_otp, count_failed_attempts
from services.fraud_service import score_pretransfer, RISK_WARN, RISK_BLOCK
from services.security_service import get_question, verify_security_answer
from sqlalchemy import select, func
from datetime import date as date_type

router = APIRouter(prefix="/banking", tags=["Banking"])


async def _get_account(db: AsyncSession, user_id: int) -> Account:
    result = await db.execute(
        select(Account).where(Account.user_id == user_id, Account.is_active == True)
    )
    acc = result.scalar_one_or_none()
    if not acc:
        raise HTTPException(status_code=404, detail="No active account found")
    return acc


async def _get_tx_history(db: AsyncSession, account_id: int) -> list:
    result = await db.execute(
        select(Transaction).where(Transaction.account_id == account_id)
    )

    return [
        {
            "id": t.id,
            "type": t.type,
            "amount": float(t.amount),
            "sender": t.sender,
            "receiver": t.receiver,
            "date": str(t.date),
            "category": t.category,
            "created_at": t.created_at,
        }
        for t in result.scalars().all()
    ]


DAILY_LIMIT = 100000


async def check_daily_limit(
    db: AsyncSession,
    account_id: int,
    tx_type: str,
    amount: float,
):
    result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0))
        .where(
            Transaction.account_id == account_id,
            Transaction.type == tx_type,
            Transaction.date == date_type.today(),
        )
    )

    today_total = float(result.scalar() or 0)

    if today_total + amount > DAILY_LIMIT:
        raise HTTPException(
            status_code=400,
            detail=f"Daily {tx_type} limit of ₹100000 exceeded. Please try again tomorrow.",
        )

# ─── Balance & Transactions ──────────────────────────────────────────────────
@router.get("/balance", response_model=AccountOut)
async def get_balance(current_user: User = Depends(get_current_user),
                      db: AsyncSession = Depends(get_db)):
    return await _get_account(db, current_user.id)


@router.get("/transactions", response_model=list[TransactionOut])
async def get_transactions(
    limit: int = 100, tx_type: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    acc   = await _get_account(db, current_user.id)
    query = select(Transaction).where(Transaction.account_id == acc.id)
    if tx_type:
        query = query.where(Transaction.type == tx_type)
    query = query.order_by(Transaction.date.desc(), Transaction.created_at.desc()).limit(limit)
    return (await db.execute(query)).scalars().all()


# ─── Beneficiaries ───────────────────────────────────────────────────────────
@router.get("/beneficiaries", response_model=list[BeneficiaryOut])
async def list_beneficiaries(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Beneficiary)
        .where(Beneficiary.user_id == current_user.id)
        .order_by(Beneficiary.created_at.desc())
    )
    return result.scalars().all()


@router.post("/beneficiaries", response_model=BeneficiaryOut)
async def add_beneficiary(
    payload: BeneficiaryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Reject own account number
    acc = await _get_account(db, current_user.id)
    if acc.account_no == payload.account_no:
        raise HTTPException(status_code=400, detail="Cannot add your own account as a beneficiary.")

    # Prevent duplicate (same user + same account_no)
    existing = await db.execute(
        select(Beneficiary).where(
            Beneficiary.user_id == current_user.id,
            Beneficiary.account_no == payload.account_no,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Beneficiary with account number {payload.account_no} already exists."
        )

    benef = Beneficiary(
        user_id=current_user.id,
        name=payload.name,
        account_no=payload.account_no,
    )
    db.add(benef)
    await db.commit()
    await db.refresh(benef)
    return benef


@router.delete("/beneficiaries/{beneficiary_id}")
async def delete_beneficiary(
    beneficiary_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Beneficiary).where(
            Beneficiary.id == beneficiary_id,
            Beneficiary.user_id == current_user.id,
        )
    )
    benef = result.scalar_one_or_none()
    if not benef:
        raise HTTPException(status_code=404, detail="Beneficiary not found.")
    await db.delete(benef)
    await db.commit()
    return {"deleted": True, "id": beneficiary_id}


# ─── Deposit (no OTP) ────────────────────────────────────────────────────────
@router.post("/deposit")
async def deposit(payload: DepositRequest,
                  current_user: User = Depends(get_current_user),
                  db: AsyncSession = Depends(get_db)):
    acc = await _get_account(db, current_user.id)
    await check_daily_limit(
    db,
    acc.id,
    "deposit",
    payload.amount,
  )
    acc.balance = float(acc.balance) + payload.amount
    tx = Transaction(
        account_id=acc.id, type="deposit", amount=payload.amount,
        sender=payload.sender or "External", receiver="Self",
        message=payload.message or "Deposit", category=payload.category or "Income",
        date=date_type.today(), fraud_score=0.0, fraud_flags=[], is_flagged=False,
    )
    db.add(tx)
    await db.commit()
    await db.refresh(acc); await db.refresh(tx)
    return {
        "status": "success", "transaction_id": tx.id,
        "amount": float(payload.amount), "new_balance": float(acc.balance),
        "message": f"₹{payload.amount:,.2f} deposited successfully.",
        "notification": {"type": "deposit", "title": "Deposit Successful ✅",
                         "body": f"₹{payload.amount:,.0f} credited to your account.",
                         "color": "#10b981"},
    }


# ─── Withdraw — security question (loads from DB, never hardcoded) ────────────
@router.get("/withdraw/security-question")
async def get_withdraw_security_question(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sq = await get_question(db, current_user.id)
    if sq is None:
        raise HTTPException(
            status_code=404,
            detail="No security question configured for your account. Contact support."
        )
    from services.security_service import is_locked
    if is_locked(sq):
        raise HTTPException(
            status_code=423,
            detail={
                "message": "Withdrawal temporarily locked due to too many failed security attempts.",
                "locked_until": str(sq.locked_until),
                "locked": True,
            }
        )
    return {"question": sq.question, "attempts_used": sq.failed_attempts}


@router.post("/withdraw/verify-security")
async def verify_withdraw_security(
    payload: SecurityAnswerVerify,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await verify_security_answer(db, current_user.id, payload.answer)
    if not result["success"]:
        status_code = 423 if result.get("locked") else 400
        raise HTTPException(status_code=status_code, detail=result)
    return {"verified": True, "message": "Security verification passed."}


@router.post("/withdraw/initiate")
async def initiate_withdraw(
    payload: WithdrawRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
  ):
    acc = await _get_account(db, current_user.id)
    await check_daily_limit(
    db,
    acc.id,
    "withdraw",
    payload.amount,
   )
    if float(acc.balance) < payload.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    session_id, _ = await create_otp_session(
        db, user_id=current_user.id, action="withdraw",
        payload={"amount": payload.amount}, mobile=current_user.mobile,
    )
    return {
        "status": "otp_sent", "session_id": session_id,
        "message": "OTP sent to your registered mobile number.",
        "high_value": payload.amount > 50000,
    }


@router.post("/withdraw/verify")
async def verify_withdraw(
    payload: OTPVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await verify_otp(db, payload.session_id, payload.otp, current_user.id)
    if not data:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")
    acc = await _get_account(db, current_user.id)
    if float(acc.balance) < data["amount"]:
        raise HTTPException(status_code=400, detail="Insufficient balance at verification time.")
    acc.balance = float(acc.balance) - data["amount"]
    tx = Transaction(
        account_id=acc.id, type="withdraw", amount=data["amount"],
        sender="Self", receiver="Cash", message="Cash Withdrawal", category="Cash",
        date=date_type.today(), fraud_score=0.0, fraud_flags=[], is_flagged=False,
    )
    db.add(tx)
    await db.commit()
    await db.refresh(acc); await db.refresh(tx)
    return {
        "status": "success", "transaction_id": tx.id,
        "amount": data["amount"], "new_balance": float(acc.balance),
        "message": f"₹{data['amount']:,.2f} withdrawn successfully.",
        "notification": {"type": "withdraw", "title": "Withdrawal Successful 🏧",
                         "body": f"₹{data['amount']:,.0f} withdrawn from your account.",
                         "color": "#f59e0b"},
    }


# ─── Transfer ─────────────────────────────────────────────────────────────────
@router.post("/transfer/initiate")
async def initiate_transfer(
    payload: TransferRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    acc = await _get_account(db, current_user.id)
    if float(acc.balance) < payload.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    # Verify beneficiary exists for this user
    benef_result = await db.execute(
        select(Beneficiary).where(
            Beneficiary.user_id == current_user.id,
            Beneficiary.name == payload.receiver,
        )
    )
    if benef_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=400,
            detail=f"Beneficiary '{payload.receiver}' not found. Please add them before transferring."
        )

    history     = await _get_tx_history(db, acc.id)
    
    failed_otps = await count_failed_attempts(db, current_user.id, "transfer")
    proposed    = {"type": "transfer", "amount": payload.amount,
                   "receiver": payload.receiver, "category": payload.category or "General"}
    fraud       = score_pretransfer(proposed, history, failed_otps)

    if fraud["action"] == "blocked":
        reasons = [f["rule"] for f in fraud["flags"]]
        raise HTTPException(status_code=403, detail={
            "message": "Transaction blocked.",
            "risk_score": fraud["risk_score"],
            "flags": fraud["flags"],
            "flag_reasons": reasons,
            "action": "blocked",
            "explanation": (
                f"Your transfer of ₹{payload.amount:,.0f} to '{payload.receiver}' was blocked. "
                f"Risk Score: {fraud['risk_score']}/100. "
                f"Reasons: {', '.join(reasons)}. "
                "Contact support if you believe this is an error."
            ),
        })

    session_id, _ = await create_otp_session(
        db, user_id=current_user.id, action="transfer",
        payload={
            "receiver": payload.receiver, "amount": payload.amount,
            "message": payload.message, "category": payload.category or "General",
            "fraud_result": {
                "risk_score": fraud["risk_score"], "risk_level": fraud["risk_level"],
                "flags": fraud["flags"], "action": fraud["action"],
            },
        },
        mobile=current_user.mobile,
    )
    return {
        "status": "otp_sent", "session_id": session_id,
        "message": "OTP sent to your registered mobile number.",
        "fraud_check": {
            "risk_score": fraud["risk_score"], "risk_level": fraud["risk_level"],
            "flags": fraud["flags"], "action": fraud["action"],
        },
    }


@router.post("/transfer/verify")
async def verify_transfer(
    payload: OTPVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await verify_otp(db, payload.session_id, payload.otp, current_user.id)
    if not data:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")
    acc = await _get_account(db, current_user.id)
    if float(acc.balance) < data["amount"]:
        raise HTTPException(status_code=400, detail="Insufficient balance at verification time.")
    acc.balance = float(acc.balance) - data["amount"]
    fr          = data.get("fraud_result", {})
    risk_score  = fr.get("risk_score", 0)
    flag_ids    = [f["rule_id"] for f in fr.get("flags", [])]
    tx = Transaction(
        account_id=acc.id, type="transfer", amount=data["amount"],
        sender="Self", receiver=data["receiver"], message=data.get("message"),
        category=data.get("category", "General"), date=date_type.today(),
        fraud_score=round(risk_score / 100, 3), fraud_flags=flag_ids,
        is_flagged=risk_score >= RISK_WARN,
    )
    db.add(tx)
    await db.commit()
    await db.refresh(acc); await db.refresh(tx)
    return {
        "status": "success", "transaction_id": tx.id,
        "amount": data["amount"], "receiver": data["receiver"],
        "new_balance": float(acc.balance), "fraud_check": fr,
        "message": f"₹{data['amount']:,.2f} transferred to {data['receiver']} successfully.",
        "notification": {"type": "transfer", "title": "Transfer Successful 💸",
                         "body": f"₹{data['amount']:,.0f} sent to {data['receiver']}.",
                         "color": "#6366f1"},
    }
