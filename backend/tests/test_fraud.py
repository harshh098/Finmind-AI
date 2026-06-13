"""
Unit tests for fraud detection service.
Run: pytest backend/tests/
"""
import pytest
from services.fraud_service import apply_rules, compute_fraud_score, analyze_all_transactions

SAMPLE_TX = [
    {"id": 1, "type": "transfer", "amount": 10000, "receiver": "Alice", "sender": "Self", "date": "2025-01-01"},
    {"id": 2, "type": "deposit",  "amount": 30000, "receiver": "Self",  "sender": "Employer", "date": "2025-01-02"},
    {"id": 3, "type": "withdraw", "amount": 500,   "receiver": "Cash",  "sender": "Self", "date": "2025-01-03"},
    {"id": 4, "type": "transfer", "amount": 1000,  "receiver": "Bob",   "sender": "Self", "date": "2025-01-04"},
    {"id": 5, "type": "transfer", "amount": 9000,  "receiver": "Raj",   "sender": "Self", "date": "2025-01-05"},
]


class TestApplyRules:
    def test_large_transfer_flagged(self):
        tx = {"type": "transfer", "amount": 10000}
        flags = apply_rules(tx)
        rule_ids = [f["rule_id"] for f in flags]
        assert "F001" in rule_ids

    def test_small_transfer_not_flagged(self):
        tx = {"type": "transfer", "amount": 500}
        flags = apply_rules(tx)
        assert all(f["rule_id"] != "F001" for f in flags)

    def test_round_number_flagged(self):
        tx = {"type": "transfer", "amount": 6000}
        flags = apply_rules(tx)
        rule_ids = [f["rule_id"] for f in flags]
        assert "F005" in rule_ids

    def test_deposit_not_flagged_by_f001(self):
        tx = {"type": "deposit", "amount": 50000}
        flags = apply_rules(tx)
        assert all(f["rule_id"] != "F001" for f in flags)


class TestComputeFraudScore:
    def test_empty_flags_zero_score(self):
        assert compute_fraud_score([]) == 0.0

    def test_high_severity_gives_high_score(self):
        flags = [{"score": 0.8, "rule_id": "F001", "rule": "test", "severity": "high"}]
        score = compute_fraud_score(flags)
        assert score > 0.5

    def test_low_severity_gives_low_score(self):
        flags = [{"score": 0.2, "rule_id": "F005", "rule": "test", "severity": "low"}]
        score = compute_fraud_score(flags)
        assert score < 0.5


class TestAnalyzeAllTransactions:
    def test_returns_expected_keys(self):
        result = analyze_all_transactions(SAMPLE_TX)
        assert "total_transactions" in result
        assert "flagged_count" in result
        assert "overall_risk" in result
        assert "alerts" in result

    def test_total_count_correct(self):
        result = analyze_all_transactions(SAMPLE_TX)
        assert result["total_transactions"] == len(SAMPLE_TX)

    def test_large_transfers_flagged(self):
        result = analyze_all_transactions(SAMPLE_TX)
        flagged_ids = [a["transaction_id"] for a in result["alerts"]]
        assert 1 in flagged_ids  # ₹10,000 transfer

    def test_overall_risk_is_string(self):
        result = analyze_all_transactions(SAMPLE_TX)
        assert result["overall_risk"] in ("LOW", "MEDIUM", "HIGH")
