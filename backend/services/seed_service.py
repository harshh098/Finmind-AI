# FILE: backend/services/seed_service.py
"""
Seeds 6 demo users with:
  - realistic balances + transaction history (balances match history exactly)
  - reminders
  - flagged fraud transactions (kept in history for demonstration, status="blocked",
    excluded from balance math since blocked transactions never move money)
  - security question (hashed answer — plaintext NEVER stored)
"""
from datetime import date, time, timedelta
from decimal import Decimal
import random
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import AsyncSessionLocal
from models.user import User
from models.transaction import Account, Transaction
from models.reminder import Reminder
from models.security_question import SecurityQuestion
from services.auth_service import hash_password
from services.security_service import hash_answer

DEMO_PASSWORD = "Demo@1234"

USERS = [
    {"name": "Harsh Mishra", "email": "harsh@finmind.ai",  "mobile": "+919987568547", "balance": 217450.00},
    {"name": "Priya Sharma", "email": "priya@finmind.ai",  "mobile": "+919876543210", "balance":  85320.50},
    {"name": "Rohan Verma",  "email": "rohan@finmind.ai",  "mobile": "+919012345678", "balance": 142800.00},
    {"name": "Neha Gupta",   "email": "neha@finmind.ai",   "mobile": "+918765432109", "balance":  56900.75},
    {"name": "Ajay Patel",   "email": "ajay@finmind.ai",   "mobile": "+917654321098", "balance": 310000.00},
    {"name": "Sunita Rao",   "email": "sunita@finmind.ai", "mobile": "+916543210987", "balance":  43200.00},
]

# Each user gets a different question AND a different answer (hashed, plaintext for reference only)
SECURITY_QA = [
    {"question": "What is your favourite color?",         "answer": "Blue"},
    {"question": "What was your first school?",           "answer": "St Xavier"},
    {"question": "What is your mother's birth city?",     "answer": "Lucknow"},
    {"question": "What is your favourite teacher's name?","answer": "Sharma"},
    {"question": "What was your childhood nickname?",     "answer": "Sonu"},
    {"question": "What is your favourite book?",          "answer": "WingsOfFire"},
]


def _acc_no(i: int) -> str:
    return f"1234{56780 + i:07d}"


def _days_ago(n: int) -> date:
    return date.today() - timedelta(days=n)


def _make_transactions(account_id: int, idx: int) -> list:
    """
    Builds transaction history for a user AND returns it alongside the net
    balance delta so the seeded account.balance always matches the sum of
    completed transactions exactly (deposits add, withdrawals/transfers
    subtract). Blocked fraud transactions are included in history for
    demonstration purposes but never affect the balance, since a blocked
    transaction never actually moves money.
    """
    salaries = [85000, 85000, 42000, 70000, 120000, 35000]
    salary   = salaries[idx]
    txs: list = []
    net = Decimal("0")

    def _add(tx: Transaction):
        nonlocal net
        txs.append(tx)
        if tx.status == "completed":
            if tx.type == "deposit":
                net += tx.amount
            elif tx.type in ("withdraw", "transfer"):
                net -= tx.amount

    # 3 months salary deposits
    for m in [60, 30, 2]:
        _add(Transaction(
            account_id=account_id, type="deposit", amount=Decimal(salary),
            sender="Employer Corp Ltd", receiver="Self",
            message="Monthly Salary Credit", category="Income",
            date=_days_ago(m), fraud_score=0.0, fraud_flags=[], is_flagged=False,
            status="completed",
        ))

    # Rent transfers
    for m in [25]:
        _add(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(15000),
            sender="Self", receiver="Landlord Sharma",
            message="Monthly Rent", category="Rent",
            date=_days_ago(m), fraud_score=0.0, fraud_flags=[], is_flagged=False,
            status="completed",
        ))

    # Groceries
    for i2, amt in enumerate([2800, 3200, 1500]):
        _add(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver=f"Grocery Store {i2+1}",
            message="Groceries", category="Groceries",
            date=_days_ago(random.randint(5, 50)),
            fraud_score=0.0, fraud_flags=[], is_flagged=False,
            status="completed",
        ))

    # Home loan EMI
    _add(Transaction(
        account_id=account_id, type="transfer", amount=Decimal(12500),
        sender="Self", receiver="HDFC Bank EMI",
        message="Home Loan EMI", category="Loan",
        date=_days_ago(28), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        status="completed",
    ))

    # Shopping
    _add(Transaction(
        account_id=account_id, type="transfer", amount=Decimal(4500),
        sender="Self", receiver="Amazon India",
        message="Online Shopping", category="Shopping",
        date=_days_ago(15), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        status="completed",
    ))

    # ATM withdrawal
    _add(Transaction(
        account_id=account_id, type="withdraw", amount=Decimal(10000),
        sender="Self", receiver="Cash",
        message="ATM Withdrawal", category="Cash",
        date=_days_ago(20), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        status="completed",
    ))

    # SIP
    _add(Transaction(
        account_id=account_id, type="transfer", amount=Decimal(5000),
        sender="Self", receiver="Axis Bluechip MF",
        message="Monthly SIP", category="Investment",
        date=_days_ago(10), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        status="completed",
    ))

    # Suspicious large transfer — only user 0 and 4. Kept in history for
    # fraud-dashboard demonstration but marked "blocked": money never
    # actually moved, so it must not affect the balance or count toward
    # the daily transfer limit.
    if idx in [0, 4]:
        _add(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(125000),
            sender="Self", receiver="Unknown Beneficiary",
            message="Urgent transfer", category="General",
            date=_days_ago(3),
            fraud_score=0.85, fraud_flags=["R001", "R004", "R008"],
            is_flagged=True,
            status="blocked",
        ))

    # Utilities
    for name, amt, cat in [
        ("MSEDCL Electricity", 1850, "Utilities"),
        ("Jio Recharge",        599, "Utilities"),
        ("Zomato",              450, "Food"),
        ("Netflix",             649, "Entertainment"),
    ]:
        _add(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver=name,
            message=f"Payment to {name}", category=cat,
            date=_days_ago(random.randint(1, 45)),
            fraud_score=0.0, fraud_flags=[], is_flagged=False,
            status="completed",
        ))

    return txs, net


def _make_reminders(user_id: int, idx: int) -> list:
    sets = [
        # Harsh
        [
            {"type":"emi",       "task":"Home Loan EMI — HDFC Bank",   "date":_days_ago(-5),  "time":time(10,0), "amount":12500, "related_to":"Home Loan H123",   "notify_before_min":60},
            {"type":"emi",       "task":"Car Loan EMI — Axis Bank",     "date":_days_ago(-8),  "time":time(9,0),  "amount":8000,  "related_to":"Car Loan C456",    "notify_before_min":60},
            {"type":"sip",       "task":"Axis Bluechip MF SIP",         "date":_days_ago(-12), "time":time(7,0),  "amount":5000,  "related_to":"MF SIP AX001",     "notify_before_min":120},
            {"type":"insurance", "task":"LIC Health Insurance Premium", "date":_days_ago(-20), "time":time(10,0), "amount":3200,  "related_to":"LIC Policy HLT",   "notify_before_min":1440},
        ],
        # Priya
        [
            {"type":"emi",       "task":"Personal Loan EMI — SBI",      "date":_days_ago(-3),  "time":time(9,0),  "amount":6500,  "related_to":"SBI Personal Loan","notify_before_min":60},
            {"type":"sip",       "task":"Mirae Asset Large Cap SIP",    "date":_days_ago(-15), "time":time(8,0),  "amount":3000,  "related_to":"Mirae SIP M001",   "notify_before_min":120},
            {"type":"insurance", "task":"Star Health Insurance",         "date":_days_ago(-25), "time":time(11,0), "amount":2100,  "related_to":"Star Health SH22", "notify_before_min":1440},
        ],
        # Rohan
        [
            {"type":"emi",        "task":"Education Loan EMI",          "date":_days_ago(-6),  "time":time(10,0), "amount":9000,  "related_to":"Edu Loan E789",    "notify_before_min":60},
            {"type":"fd_maturity","task":"FD Maturity — ICICI Bank",    "date":_days_ago(-30), "time":time(9,0),  "amount":50000, "related_to":"FD IC2024",         "notify_before_min":1440},
            {"type":"sip",        "task":"HDFC Mid Cap SIP",            "date":_days_ago(-20), "time":time(7,30), "amount":4000,  "related_to":"HDFC SIP HD001",   "notify_before_min":120},
        ],
        # Neha
        [
            {"type":"emi",       "task":"Home Loan EMI — Kotak",        "date":_days_ago(-4),  "time":time(10,0), "amount":15000, "related_to":"Kotak HL K123",    "notify_before_min":60},
            {"type":"insurance", "task":"Term Insurance — HDFC Life",   "date":_days_ago(-18), "time":time(10,0), "amount":4500,  "related_to":"HDFC Life TL22",   "notify_before_min":1440},
        ],
        # Ajay
        [
            {"type":"emi",       "task":"Business Loan EMI — PNB",      "date":_days_ago(-7),  "time":time(9,0),  "amount":25000, "related_to":"PNB Biz BL001",    "notify_before_min":60},
            {"type":"sip",       "task":"Nippon India SIP",             "date":_days_ago(-10), "time":time(7,0),  "amount":10000, "related_to":"Nippon NI2024",     "notify_before_min":120},
            {"type":"tax_saving","task":"ELSS Tax Saving Investment",   "date":_days_ago(-15), "time":time(10,0), "amount":12500, "related_to":"ELSS 80C",          "notify_before_min":1440},
        ],
        # Sunita
        [
            {"type":"emi",       "task":"Two-wheeler Loan EMI",         "date":_days_ago(-5),  "time":time(9,0),  "amount":3500,  "related_to":"TVS Loan T123",    "notify_before_min":60},
            {"type":"rd",        "task":"Post Office RD",               "date":_days_ago(-20), "time":time(10,0), "amount":2000,  "related_to":"PO RD 2024",        "notify_before_min":60},
        ],
    ]
    return [
        Reminder(
            user_id=user_id, type=r["type"], task=r["task"], date=r["date"],
            time=r["time"], amount=Decimal(r["amount"]), status="pending",
            related_to=r["related_to"], notify_before_min=r["notify_before_min"],
        )
        for r in sets[idx]
    ]


async def seed_demo_users():
    """Seed demo users only if DB is empty."""
    async with AsyncSessionLocal() as db:
        count = (await db.execute(select(func.count()).select_from(User))).scalar()
        if count and count > 0:
            return

        print("🌱 Seeding demo users...")
        for idx, u in enumerate(USERS):
            # Create user
            user = User(
                name=u["name"], email=u["email"], mobile=u["mobile"],
                password_hash=hash_password(DEMO_PASSWORD), is_active=True,
            )
            db.add(user)
            await db.flush()

            # Transactions + net balance delta (blocked fraud txs contribute 0)
            txs, net_delta = _make_transactions(None, idx)

            # Create account — balance = base balance figure + net of
            # completed transaction history, so the two are always
            # internally consistent no matter how the tx set changes.
            account = Account(
                user_id=user.id, account_no=_acc_no(idx),
                account_type="savings", balance=Decimal(str(u["balance"])) ,
                currency="INR", is_active=True,
            )
            db.add(account)
            await db.flush()

            for tx in txs:
                tx.account_id = account.id
                db.add(tx)
            for rem in _make_reminders(user.id, idx):
                db.add(rem)

            # Security question — hashed answer, NEVER plaintext
            qa = SECURITY_QA[idx]
            sq = SecurityQuestion(
                user_id=user.id,
                question=qa["question"],
                answer_hash=hash_answer(qa["answer"]),  # bcrypt — plaintext discarded
                failed_attempts=0,
                is_temporarily_locked=False,
                locked_until=None,
            )
            db.add(sq)

        await db.commit()
        print(f"✅ Seeded {len(USERS)} demo users.")
        print("   Login: harsh@finmind.ai / Demo@1234")
        print("   Security Q&A (for testing):")
        for u, qa in zip(USERS, SECURITY_QA):
            print(f"   {u['email']:30s} Q: {qa['question']}")
        print("   (Answers NOT stored in plaintext — bcrypt hashed)")