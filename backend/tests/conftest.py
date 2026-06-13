"""
Shared pytest fixtures for FinMind AI backend tests.
"""
import pytest
from httpx import AsyncClient
from fastapi.testclient import TestClient


SAMPLE_TRANSACTIONS = [
    {"id": 1, "type": "deposit",  "amount": 30000, "sender": "Employer", "receiver": "Self", "date": "2025-01-01", "category": "Income"},
    {"id": 2, "type": "withdraw", "amount": 2000,  "sender": "Self", "receiver": "Cash",    "date": "2025-01-02", "category": "Cash"},
    {"id": 3, "type": "transfer", "amount": 10000, "sender": "Self", "receiver": "Priya",   "date": "2025-01-03", "category": "Rent"},
    {"id": 4, "type": "deposit",  "amount": 5000,  "sender": "Freelance", "receiver": "Self","date": "2025-01-04", "category": "Income"},
    {"id": 5, "type": "transfer", "amount": 500,   "sender": "Self", "receiver": "Rohan",   "date": "2025-01-05", "category": "Food"},
]

SAMPLE_REMINDERS = [
    {"rid": 1, "type": "emi",       "task": "Home loan EMI", "date": "2025-04-01", "time": "10:00", "status": "pending", "amount": 15000},
    {"rid": 2, "type": "sip",       "task": "Monthly SIP",   "date": "2025-04-05", "time": "07:00", "status": "pending", "amount": 2000},
    {"rid": 3, "type": "insurance", "task": "Health cover",  "date": "2025-04-25", "time": "09:00", "status": "pending", "amount": 2500},
]


@pytest.fixture
def sample_transactions():
    return SAMPLE_TRANSACTIONS


@pytest.fixture
def sample_reminders():
    return SAMPLE_REMINDERS


@pytest.fixture
def test_client():
    from main import app
    return TestClient(app)
