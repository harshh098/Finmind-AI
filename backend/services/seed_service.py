# FILE: backend/services/seed_service.py
"""
Seeds 6 demo users with:
  - Distinct salary levels and spending personalities
  - Varied category mixes so analytics look different per user
  - Reminders, flagged fraud transactions, security questions (bcrypt-hashed answers)
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

SECURITY_QA = [
    {"question": "What is your favourite color?",          "answer": "Blue"},
    {"question": "What was your first school?",            "answer": "St Xavier"},
    {"question": "What is your mother's birth city?",      "answer": "Lucknow"},
    {"question": "What is your favourite teacher's name?", "answer": "Sharma"},
    {"question": "What was your childhood nickname?",      "answer": "Sonu"},
    {"question": "What is your favourite book?",           "answer": "WingsOfFire"},
]


def _acc_no(i: int) -> str:
    return f"1234{56780 + i:07d}"


def _days_ago(n: int) -> date:
    return date.today() - timedelta(days=n)


# ---------------------------------------------------------------------------
# Per-user spending profiles
# Each profile defines how the user actually spends — salaries, rent style,
# discretionary categories, and whether they over-spend in certain buckets.
# ---------------------------------------------------------------------------

def _make_transactions_harsh(account_id: int) -> list:
    """
    Harsh — mid-senior tech professional, ₹85k salary.
    Spends heavily on rent + loan EMI; moderate food + shopping; solid SIP.
    Slightly over his food budget (lifestyle creep).
    """
    txs = []
    salary = 85000

    # 3 months salary
    for m in [62, 32, 2]:
        txs.append(Transaction(
            account_id=account_id, type="deposit", amount=Decimal(salary),
            sender="TechCorp India Pvt Ltd", receiver="Self",
            message="Monthly Salary Credit", category="Income",
            date=_days_ago(m), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Rent (high — Mumbai)
    for m in [58, 28]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(22000),
            sender="Self", receiver="Landlord Sharma",
            message="Monthly Rent", category="Rent",
            date=_days_ago(m), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Home Loan EMI
    txs.append(Transaction(
        account_id=account_id, type="transfer", amount=Decimal(18500),
        sender="Self", receiver="HDFC Bank EMI",
        message="Home Loan EMI", category="Loan",
        date=_days_ago(28), fraud_score=0.0, fraud_flags=[], is_flagged=False,
    ))

    # Groceries — moderate
    for amt, d in [(3200, 50), (3500, 20), (2900, 5)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver="DMart",
            message="Groceries", category="Groceries",
            date=_days_ago(d), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Food — over budget (lifestyle creep — Zomato + restaurants)
    for name, amt, d in [("Zomato", 1800, 45), ("Swiggy", 2200, 35),
                          ("Restaurant outing", 3500, 22), ("Zomato", 1600, 12), ("Cafe Coffee Day", 800, 6)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver=name, message=f"Payment to {name}",
            category="Food", date=_days_ago(d),
            fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Shopping — moderate
    for name, amt, d in [("Amazon India", 4500, 40), ("Myntra", 3200, 18)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver=name, message="Online Shopping",
            category="Shopping", date=_days_ago(d),
            fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Transport
    txs.append(Transaction(
        account_id=account_id, type="transfer", amount=Decimal(2800),
        sender="Self", receiver="Ola / Metro", message="Transport",
        category="Transport", date=_days_ago(15),
        fraud_score=0.0, fraud_flags=[], is_flagged=False,
    ))

    # Utilities
    for name, amt, d in [("MSEDCL Electricity", 2100, 30), ("Jio Recharge", 599, 25), ("Netflix", 649, 20)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver=name, message=f"Payment to {name}",
            category="Utilities", date=_days_ago(d),
            fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # SIP
    txs.append(Transaction(
        account_id=account_id, type="transfer", amount=Decimal(8000),
        sender="Self", receiver="Axis Bluechip MF",
        message="Monthly SIP", category="Investment",
        date=_days_ago(10), fraud_score=0.0, fraud_flags=[], is_flagged=False,
    ))

    # ATM
    txs.append(Transaction(
        account_id=account_id, type="withdraw", amount=Decimal(5000),
        sender="Self", receiver="Cash", message="ATM Withdrawal", category="Cash",
        date=_days_ago(20), fraud_score=0.0, fraud_flags=[], is_flagged=False,
    ))

    # Flagged suspicious transfer
    txs.append(Transaction(
        account_id=account_id, type="transfer", amount=Decimal(125000),
        sender="Self", receiver="Unknown Beneficiary",
        message="Urgent transfer", category="General",
        date=_days_ago(3),
        fraud_score=0.85, fraud_flags=["R001", "R004", "R008"],
        is_flagged=True,
    ))

    return txs


def _make_transactions_priya(account_id: int) -> list:
    """
    Priya — HR manager, ₹52k salary.
    Frugal on rent (shares flat), heavy on healthcare + education (upskilling),
    very good savings rate. Over budget on education.
    """
    txs = []
    salary = 52000

    for m in [60, 30, 3]:
        txs.append(Transaction(
            account_id=account_id, type="deposit", amount=Decimal(salary),
            sender="GlobalHR Solutions", receiver="Self",
            message="Monthly Salary Credit", category="Income",
            date=_days_ago(m), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Rent — shared apartment
    for m in [55, 25]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(8500),
            sender="Self", receiver="Flat Share Rent",
            message="Shared Apartment Rent", category="Rent",
            date=_days_ago(m), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Personal Loan EMI
    txs.append(Transaction(
        account_id=account_id, type="transfer", amount=Decimal(6500),
        sender="Self", receiver="SBI Personal Loan",
        message="Personal Loan EMI", category="Loan",
        date=_days_ago(28), fraud_score=0.0, fraud_flags=[], is_flagged=False,
    ))

    # Education — over budget (online courses, MBA prep)
    for name, amt, d in [("Coursera", 4200, 50), ("BYJU's", 5500, 30),
                          ("Udemy", 1800, 15), ("CAT Coaching", 6000, 8)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver=name, message=f"Education: {name}",
            category="Education", date=_days_ago(d),
            fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Healthcare
    for name, amt, d in [("Apollo Pharmacy", 1200, 40), ("Dr. Mehta Consult", 800, 22), ("Gym Membership", 2000, 5)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver=name, message=f"Healthcare: {name}",
            category="Healthcare", date=_days_ago(d),
            fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Groceries — frugal
    for amt, d in [(1800, 45), (2100, 15)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver="Big Bazaar",
            message="Groceries", category="Groceries",
            date=_days_ago(d), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Food — minimal
    for amt, d in [(900, 35), (650, 20), (1100, 10)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver="Swiggy",
            message="Food Delivery", category="Food",
            date=_days_ago(d), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # SIP
    txs.append(Transaction(
        account_id=account_id, type="transfer", amount=Decimal(5000),
        sender="Self", receiver="Mirae Asset Large Cap MF",
        message="Monthly SIP", category="Investment",
        date=_days_ago(10), fraud_score=0.0, fraud_flags=[], is_flagged=False,
    ))

    # Utilities
    for name, amt in [("BESCOM Electricity", 1100), ("Airtel", 499)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver=name, message=f"Payment to {name}",
            category="Utilities", date=_days_ago(25),
            fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    return txs


def _make_transactions_rohan(account_id: int) -> list:
    """
    Rohan — freelance developer, irregular income (varies month to month).
    Heavy on transport + shopping; low on food (cooks at home); FD maturity upcoming.
    Over budget on shopping and transport.
    """
    txs = []

    # Irregular freelance income — 3 months, varying amounts
    for income, m in [(42000, 60), (68000, 30), (55000, 5)]:
        txs.append(Transaction(
            account_id=account_id, type="deposit", amount=Decimal(income),
            sender="Freelance Clients", receiver="Self",
            message="Freelance Project Payment", category="Income",
            date=_days_ago(m), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Rent
    for m in [55, 25]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(12000),
            sender="Self", receiver="Landlord Verma",
            message="Monthly Rent", category="Rent",
            date=_days_ago(m), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Education Loan EMI
    txs.append(Transaction(
        account_id=account_id, type="transfer", amount=Decimal(9000),
        sender="Self", receiver="Axis Bank Edu Loan",
        message="Education Loan EMI", category="Loan",
        date=_days_ago(28), fraud_score=0.0, fraud_flags=[], is_flagged=False,
    ))

    # Transport — over budget (owns car, petrol + parking)
    for name, amt, d in [("HPCL Petrol", 4500, 50), ("Uber", 2200, 35),
                          ("HPCL Petrol", 4800, 20), ("Ola", 1800, 10), ("FastTag Toll", 900, 5)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver=name, message=f"Transport: {name}",
            category="Transport", date=_days_ago(d),
            fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Shopping — over budget (gadget purchases)
    for name, amt, d in [("Croma Electronics", 18000, 45), ("Amazon India", 5500, 28), ("Flipkart", 3200, 12)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver=name, message="Electronics / Shopping",
            category="Shopping", date=_days_ago(d),
            fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Groceries — minimal (cooks at home, budget-conscious)
    for amt, d in [(2200, 48), (1900, 18)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver="Reliance Smart",
            message="Groceries", category="Groceries",
            date=_days_ago(d), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Food — rare
    txs.append(Transaction(
        account_id=account_id, type="transfer", amount=Decimal(1200),
        sender="Self", receiver="Zomato",
        message="Food Delivery", category="Food",
        date=_days_ago(22), fraud_score=0.0, fraud_flags=[], is_flagged=False,
    ))

    # Utilities
    for name, amt, d in [("MSEDCL", 1600, 30), ("Vi Recharge", 449, 25), ("Amazon Prime", 299, 20)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver=name, message=f"Utility: {name}",
            category="Utilities", date=_days_ago(d),
            fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # SIP
    txs.append(Transaction(
        account_id=account_id, type="transfer", amount=Decimal(4000),
        sender="Self", receiver="HDFC Mid Cap MF",
        message="Monthly SIP", category="Investment",
        date=_days_ago(10), fraud_score=0.0, fraud_flags=[], is_flagged=False,
    ))

    return txs


def _make_transactions_neha(account_id: int) -> list:
    """
    Neha — school teacher, ₹38k salary.
    Low income, very high rent-to-income ratio, tight budget. Over on rent and loan.
    Minimal discretionary spending. Low savings rate.
    """
    txs = []
    salary = 38000

    for m in [60, 30, 4]:
        txs.append(Transaction(
            account_id=account_id, type="deposit", amount=Decimal(salary),
            sender="Delhi Public School", receiver="Self",
            message="Monthly Salary Credit", category="Income",
            date=_days_ago(m), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Rent — high relative to income
    for m in [55, 25]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(14000),
            sender="Self", receiver="Landlord Mehta",
            message="Monthly Rent", category="Rent",
            date=_days_ago(m), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Home loan EMI — stretches budget thin
    txs.append(Transaction(
        account_id=account_id, type="transfer", amount=Decimal(9500),
        sender="Self", receiver="Kotak Mahindra EMI",
        message="Home Loan EMI", category="Loan",
        date=_days_ago(28), fraud_score=0.0, fraud_flags=[], is_flagged=False,
    ))

    # Groceries — very frugal
    for amt, d in [(1500, 50), (1700, 20)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver="Local Market",
            message="Groceries", category="Groceries",
            date=_days_ago(d), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Food — bare minimum
    for amt, d in [(400, 40), (650, 25), (350, 8)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver="Swiggy",
            message="Food Delivery", category="Food",
            date=_days_ago(d), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Transport — public transit
    txs.append(Transaction(
        account_id=account_id, type="transfer", amount=Decimal(800),
        sender="Self", receiver="Delhi Metro / DTC",
        message="Public Transport", category="Transport",
        date=_days_ago(15), fraud_score=0.0, fraud_flags=[], is_flagged=False,
    ))

    # Utilities
    for name, amt, d in [("BSES Electricity", 950, 30), ("Jio", 299, 25)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver=name, message=f"Bill: {name}",
            category="Utilities", date=_days_ago(d),
            fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Gifts — one-off
    txs.append(Transaction(
        account_id=account_id, type="transfer", amount=Decimal(1500),
        sender="Self", receiver="Amazon India",
        message="Gift for nephew", category="Gifts",
        date=_days_ago(35), fraud_score=0.0, fraud_flags=[], is_flagged=False,
    ))

    # ATM
    txs.append(Transaction(
        account_id=account_id, type="withdraw", amount=Decimal(2000),
        sender="Self", receiver="Cash", message="ATM Withdrawal", category="Cash",
        date=_days_ago(20), fraud_score=0.0, fraud_flags=[], is_flagged=False,
    ))

    return txs


def _make_transactions_ajay(account_id: int) -> list:
    """
    Ajay — business owner, ₹1.5L+ variable income.
    High income, over-spends on gifts + entertainment; heavy business loan EMI.
    Over budget on entertainment and gifts. Good savings despite high spend.
    """
    txs = []

    # Variable business income
    for income, label, m in [(150000, "Business Revenue Q1", 62),
                              (180000, "Business Revenue Q2", 32),
                              (130000, "Business Revenue — Low Month", 5)]:
        txs.append(Transaction(
            account_id=account_id, type="deposit", amount=Decimal(income),
            sender="Patel Enterprises", receiver="Self",
            message=label, category="Income",
            date=_days_ago(m), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Rent — office + home
    for m, label, amt in [(58, "Home Rent", 30000), (55, "Office Rent", 25000),
                           (28, "Home Rent", 30000), (25, "Office Rent", 25000)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver="Landlord", message=label,
            category="Rent", date=_days_ago(m),
            fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Business Loan EMI
    txs.append(Transaction(
        account_id=account_id, type="transfer", amount=Decimal(35000),
        sender="Self", receiver="PNB Business Loan",
        message="Business Loan EMI", category="Loan",
        date=_days_ago(28), fraud_score=0.0, fraud_flags=[], is_flagged=False,
    ))

    # Entertainment — over budget
    for name, amt, d in [("Club Membership", 8000, 55), ("IPL Tickets", 12000, 40),
                          ("Weekend Resort", 18000, 22), ("Fine Dining", 6500, 10)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver=name, message=f"Entertainment: {name}",
            category="Entertainment", date=_days_ago(d),
            fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Gifts — over budget
    for name, amt, d in [("Tanishq Jewellery", 25000, 50), ("Amazon — Corporate Gifts", 12000, 30),
                          ("Wedding Gift", 8000, 15)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver=name, message="Gift",
            category="Gifts", date=_days_ago(d),
            fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Groceries + Food
    for amt, cat, d in [(6000, "Groceries", 40), (4500, "Food", 35),
                         (5500, "Groceries", 10), (7200, "Food", 8)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver="Premium Grocery / Restaurant",
            message=cat, category=cat, date=_days_ago(d),
            fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # SIP — large
    txs.append(Transaction(
        account_id=account_id, type="transfer", amount=Decimal(15000),
        sender="Self", receiver="Nippon India MF",
        message="Monthly SIP", category="Investment",
        date=_days_ago(10), fraud_score=0.0, fraud_flags=[], is_flagged=False,
    ))

    # ELSS Tax saving
    txs.append(Transaction(
        account_id=account_id, type="transfer", amount=Decimal(12500),
        sender="Self", receiver="ELSS Fund — Axis",
        message="ELSS 80C Investment", category="Investment",
        date=_days_ago(18), fraud_score=0.0, fraud_flags=[], is_flagged=False,
    ))

    # Utilities
    for name, amt, d in [("MSEDCL Office + Home", 5200, 30), ("Airtel Fiber + Mobile", 1499, 25)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver=name, message=f"Utilities: {name}",
            category="Utilities", date=_days_ago(d),
            fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Flagged suspicious transfer
    txs.append(Transaction(
        account_id=account_id, type="transfer", amount=Decimal(250000),
        sender="Self", receiver="Unknown Offshore Account",
        message="Urgent wire", category="General",
        date=_days_ago(4),
        fraud_score=0.91, fraud_flags=["R001", "R004", "R008"],
        is_flagged=True,
    ))

    return txs


def _make_transactions_sunita(account_id: int) -> list:
    """
    Sunita — homemaker / part-time tutor, ₹22k income.
    Very low income, tight budget, no rent (owned home), mostly groceries + utilities.
    ATM withdrawals heavy. Saving nothing — negative savings rate.
    """
    txs = []

    for income, m in [(22000, 60), (18000, 30), (20000, 5)]:
        txs.append(Transaction(
            account_id=account_id, type="deposit", amount=Decimal(income),
            sender="Tutoring / Part-time", receiver="Self",
            message="Income Credit", category="Income",
            date=_days_ago(m), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # No rent (owns home) — two-wheeler loan EMI instead
    txs.append(Transaction(
        account_id=account_id, type="transfer", amount=Decimal(3500),
        sender="Self", receiver="TVS Motors Finance",
        message="Two-wheeler Loan EMI", category="Loan",
        date=_days_ago(28), fraud_score=0.0, fraud_flags=[], is_flagged=False,
    ))

    # Groceries — primary expense
    for amt, d in [(3800, 55), (4200, 25), (4500, 5)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver="Kirana Store / Big Bazaar",
            message="Monthly Groceries", category="Groceries",
            date=_days_ago(d), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Food
    for amt, d in [(600, 40), (800, 20), (550, 8)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver="Local Restaurant",
            message="Food", category="Food",
            date=_days_ago(d), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Healthcare — medication for elderly parent
    for amt, d in [(2200, 48), (1800, 18)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver="Medplus Pharmacy",
            message="Medicines", category="Healthcare",
            date=_days_ago(d), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Utilities
    for name, amt, d in [("MSEDCL", 950, 30), ("Jio", 199, 25), ("LPG Cylinder", 900, 22)]:
        txs.append(Transaction(
            account_id=account_id, type="transfer", amount=Decimal(amt),
            sender="Self", receiver=name, message=f"Utility: {name}",
            category="Utilities", date=_days_ago(d),
            fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # ATM — high cash usage
    for amt, d in [(3000, 50), (4000, 25), (2500, 8)]:
        txs.append(Transaction(
            account_id=account_id, type="withdraw", amount=Decimal(amt),
            sender="Self", receiver="Cash", message="ATM Withdrawal", category="Cash",
            date=_days_ago(d), fraud_score=0.0, fraud_flags=[], is_flagged=False,
        ))

    # Post Office RD
    txs.append(Transaction(
        account_id=account_id, type="transfer", amount=Decimal(2000),
        sender="Self", receiver="Post Office RD",
        message="Recurring Deposit", category="Investment",
        date=_days_ago(20), fraud_score=0.0, fraud_flags=[], is_flagged=False,
    ))

    return txs


_TX_MAKERS = [
    _make_transactions_harsh,
    _make_transactions_priya,
    _make_transactions_rohan,
    _make_transactions_neha,
    _make_transactions_ajay,
    _make_transactions_sunita,
]


def _make_reminders(user_id: int, idx: int) -> list:
    sets = [
        # Harsh
        [
            {"type": "emi",       "task": "Home Loan EMI — HDFC Bank",   "date": _days_ago(-5),  "time": time(10, 0), "amount": 18500, "related_to": "Home Loan H123",  "notify_before_min": 60},
            {"type": "emi",       "task": "Car Loan EMI — Axis Bank",     "date": _days_ago(-8),  "time": time(9, 0),  "amount": 8000,  "related_to": "Car Loan C456",   "notify_before_min": 60},
            {"type": "sip",       "task": "Axis Bluechip MF SIP",         "date": _days_ago(-12), "time": time(7, 0),  "amount": 8000,  "related_to": "MF SIP AX001",    "notify_before_min": 120},
            {"type": "insurance", "task": "LIC Health Insurance Premium", "date": _days_ago(-20), "time": time(10, 0), "amount": 3200,  "related_to": "LIC Policy HLT",  "notify_before_min": 1440},
        ],
        # Priya
        [
            {"type": "emi",       "task": "Personal Loan EMI — SBI",      "date": _days_ago(-3),  "time": time(9, 0),  "amount": 6500,  "related_to": "SBI Personal Loan", "notify_before_min": 60},
            {"type": "sip",       "task": "Mirae Asset Large Cap SIP",    "date": _days_ago(-15), "time": time(8, 0),  "amount": 5000,  "related_to": "Mirae SIP M001",    "notify_before_min": 120},
            {"type": "insurance", "task": "Star Health Insurance",         "date": _days_ago(-25), "time": time(11, 0), "amount": 2100,  "related_to": "Star Health SH22",  "notify_before_min": 1440},
        ],
        # Rohan
        [
            {"type": "emi",         "task": "Education Loan EMI",       "date": _days_ago(-6),  "time": time(10, 0), "amount": 9000,  "related_to": "Edu Loan E789",    "notify_before_min": 60},
            {"type": "fd_maturity", "task": "FD Maturity — ICICI Bank", "date": _days_ago(-30), "time": time(9, 0),  "amount": 50000, "related_to": "FD IC2024",        "notify_before_min": 1440},
            {"type": "sip",         "task": "HDFC Mid Cap SIP",         "date": _days_ago(-20), "time": time(7, 30), "amount": 4000,  "related_to": "HDFC SIP HD001",   "notify_before_min": 120},
        ],
        # Neha
        [
            {"type": "emi",       "task": "Home Loan EMI — Kotak",      "date": _days_ago(-4),  "time": time(10, 0), "amount": 9500,  "related_to": "Kotak HL K123",   "notify_before_min": 60},
            {"type": "insurance", "task": "Term Insurance — HDFC Life", "date": _days_ago(-18), "time": time(10, 0), "amount": 2800,  "related_to": "HDFC Life TL22",  "notify_before_min": 1440},
        ],
        # Ajay
        [
            {"type": "emi",       "task": "Business Loan EMI — PNB",    "date": _days_ago(-7),  "time": time(9, 0),  "amount": 35000, "related_to": "PNB Biz BL001",   "notify_before_min": 60},
            {"type": "sip",       "task": "Nippon India SIP",           "date": _days_ago(-10), "time": time(7, 0),  "amount": 15000, "related_to": "Nippon NI2024",    "notify_before_min": 120},
            {"type": "tax_saving","task": "ELSS Tax Saving Investment", "date": _days_ago(-15), "time": time(10, 0), "amount": 12500, "related_to": "ELSS 80C",         "notify_before_min": 1440},
        ],
        # Sunita
        [
            {"type": "emi", "task": "Two-wheeler Loan EMI", "date": _days_ago(-5),  "time": time(9, 0),  "amount": 3500, "related_to": "TVS Loan T123", "notify_before_min": 60},
            {"type": "rd",  "task": "Post Office RD",       "date": _days_ago(-20), "time": time(10, 0), "amount": 2000, "related_to": "PO RD 2024",    "notify_before_min": 60},
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
        print("COUNT =", count)
        if count and count > 0:
            return

        print("🌱 Seeding demo users with diverse spending profiles...")
        for idx, u in enumerate(USERS):
            user = User(
                name=u["name"], email=u["email"], mobile=u["mobile"],
                password_hash=hash_password(DEMO_PASSWORD), is_active=True,
            )
            db.add(user)
            await db.flush()

            account = Account(
                user_id=user.id, account_no=_acc_no(idx),
                account_type="savings", balance=Decimal(u["balance"]),
                currency="INR", is_active=True,
            )
            db.add(account)
            await db.flush()

            for tx in _TX_MAKERS[idx](account.id):
                db.add(tx)
            for rem in _make_reminders(user.id, idx):
                db.add(rem)

            qa = SECURITY_QA[idx]
            sq = SecurityQuestion(
                user_id=user.id,
                question=qa["question"],
                answer_hash=hash_answer(qa["answer"]),
                failed_attempts=0,
                is_temporarily_locked=False,
                locked_until=None,
            )
            db.add(sq)

        await db.commit()
        print(f"✅ Seeded {len(USERS)} demo users with distinct spending personalities.")
        print("   Login: harsh@finmind.ai / Demo@1234")
        print("   Spending profiles:")
        profiles = [
            "Harsh  — Tech professional, food lifestyle creep, flagged transfer",
            "Priya  — HR manager, education over-budget, high savings rate",
            "Rohan  — Freelancer, shopping + transport over-budget, irregular income",
            "Neha   — Teacher, rent-heavy, critically low savings rate",
            "Ajay   — Business owner, entertainment + gifts over-budget, flagged transfer",
            "Sunita — Homemaker, cash-heavy, healthcare expenses, minimal savings",
        ]
        for p in profiles:
            print(f"   {p}")