"""
Feature engineering for fraud ML model.
Generates enriched feature vectors from raw transaction data.
"""
from typing import List, Dict, Any
from datetime import datetime
from collections import defaultdict
import numpy as np


def compute_transaction_features(
    transaction: dict,
    all_transactions: List[dict],
) -> Dict[str, float]:
    """
    Compute rich features for a single transaction, using historical context.
    Returns a dict of feature_name → float value.
    """
    amount   = float(transaction.get("amount", 0))
    tx_type  = transaction.get("type", "")
    receiver = transaction.get("receiver", "")
    date_str = str(transaction.get("date", ""))

    # ── Historical stats (same type) ────────────────────────────────────────
    same_type = [t for t in all_transactions if t.get("type") == tx_type and t.get("id") != transaction.get("id")]
    amounts   = [float(t.get("amount", 0)) for t in same_type] or [0]

    hist_mean  = float(np.mean(amounts))
    hist_std   = float(np.std(amounts))  or 1.0
    z_score    = (amount - hist_mean) / hist_std

    # ── Recipient novelty ────────────────────────────────────────────────────
    known_recipients = {t.get("receiver") for t in all_transactions if t.get("type") == "transfer"}
    is_new_recipient = 1.0 if (tx_type == "transfer" and receiver not in known_recipients) else 0.0

    # ── Same-day frequency ───────────────────────────────────────────────────
    same_day = [t for t in all_transactions if str(t.get("date", ""))[:10] == date_str[:10]]
    daily_count = float(len(same_day))

    # ── Hour of day ──────────────────────────────────────────────────────────
    try:
        raw = transaction.get("created_at") or ""
        hour = int(str(raw).split("T")[1][:2]) if "T" in str(raw) else 12
    except Exception:
        hour = 12
    is_odd_hour = 1.0 if (hour >= 23 or hour <= 5) else 0.0

    # ── Round number ─────────────────────────────────────────────────────────
    is_round = 1.0 if amount > 0 and amount % 1000 == 0 else 0.0

    return {
        "amount":           amount,
        "log_amount":       float(np.log1p(amount)),
        "z_score":          z_score,
        "type_enc":         {"deposit": 0, "withdraw": 1, "transfer": 2}.get(tx_type, 0),
        "hour":             float(hour),
        "is_odd_hour":      is_odd_hour,
        "is_round":         is_round,
        "is_new_recipient": is_new_recipient,
        "daily_tx_count":   daily_count,
    }


def build_feature_matrix(transactions: List[dict]) -> np.ndarray:
    """Build feature matrix X for training the Isolation Forest."""
    rows = []
    for t in transactions:
        feat = compute_transaction_features(t, transactions)
        rows.append([
            feat["amount"],
            feat["log_amount"],
            feat["z_score"],
            feat["type_enc"],
            feat["hour"],
            feat["is_odd_hour"],
            feat["is_round"],
            feat["is_new_recipient"],
            feat["daily_tx_count"],
        ])
    return np.array(rows, dtype=float)
