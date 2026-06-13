"""
Unit tests for expense analytics service.
Run: pytest backend/tests/
"""
import pytest
from services.expense_service import analyze_transactions_local

SAMPLE = [
    {"id": 1, "type": "deposit",  "amount": 50000, "category": "Income",   "date": "2025-01-01"},
    {"id": 2, "type": "transfer", "amount": 5000,  "category": "Rent",     "date": "2025-01-05"},
    {"id": 3, "type": "withdraw", "amount": 1000,  "category": "Food",     "date": "2025-01-10"},
    {"id": 4, "type": "deposit",  "amount": 10000, "category": "Income",   "date": "2025-02-01"},
    {"id": 5, "type": "transfer", "amount": 2000,  "category": "General",  "date": "2025-02-05"},
]


class TestAnalyzeTransactionsLocal:
    def test_income_sum(self):
        result = analyze_transactions_local(SAMPLE)
        assert result["total_income"] == 60000

    def test_expense_sum(self):
        result = analyze_transactions_local(SAMPLE)
        assert result["total_expense"] == 8000

    def test_net_savings(self):
        result = analyze_transactions_local(SAMPLE)
        assert result["net_savings"] == 52000

    def test_savings_rate(self):
        result = analyze_transactions_local(SAMPLE)
        expected = round((52000 / 60000) * 100, 1)
        assert result["savings_rate"] == expected

    def test_by_category_keys(self):
        result = analyze_transactions_local(SAMPLE)
        assert "Rent" in result["by_category"]
        assert "Food" in result["by_category"]
        assert "Income" in result["by_category"]

    def test_by_month_keys(self):
        result = analyze_transactions_local(SAMPLE)
        assert "2025-01" in result["by_month"]
        assert "2025-02" in result["by_month"]

    def test_empty_transactions(self):
        result = analyze_transactions_local([])
        assert result["total_income"] == 0
        assert result["total_expense"] == 0
        assert result["savings_rate"] == 0
