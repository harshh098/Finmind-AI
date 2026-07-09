from __future__ import annotations
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import numpy as np

# ─── Thresholds ───────────────────────────────────────────────────────────────
RISK_WARN  = 60
RISK_BLOCK = 85

# ─── Daily limits (restored — required by banking.py) ─────────────────────────
TRANSFER_DAILY_LIMIT = 100000
WITHDRAW_DAILY_LIMIT = 100000
DEPOSIT_DAILY_LIMIT  = 100000

# ─── Rule definitions (R005 removed) ─────────────────────────────────────────
FRAUD_RULES = [
    {"id": "R001", "rule": "Large transfer (> 75,000)",            "severity": "high",   "weight": 20},
    {"id": "R002", "rule": "Multiple transfers to same recipient today","severity": "medium", "weight": 20},
    {"id": "R003", "rule": "Unusual hour (11 PM – 5 AM)",              "severity": "medium", "weight": 15},
    {"id": "R004", "rule": "New recipient with large amount (> ₹50,000)","severity": "medium", "weight": 15},
    {"id": "R006", "rule": "Velocity: 3+ transfers in 60 minutes",     "severity": "high",  "weight": 35},
    {"id": "R007", "rule": "Amount > 2× user average transfer",        "severity": "medium","weight": 20},
    {"id": "R008", "rule": "Amount > ₹40,000",                         "severity": "low",   "weight": 10},
    {"id": "R009", "rule": "Multiple failed OTP attempts",             "severity": "high",  "weight": 30},
    {"id": "R010", "rule": "Isolation Forest anomaly detected",        "severity": "medium","weight": 25},
    {"id": "R011", "rule": "Multi-recipient smurfing (several distinct recipients in short window)", "severity": "medium", "weight": 20},
    {"id": "R012", "rule": "Cumulative exposure to new beneficiaries today", "severity": "medium", "weight": 20},
]


# ─── Isolation Forest ─────────────────────────────────────────────────────────
def _get_hour(tx: dict) -> int:
    try:
        raw = tx.get("created_at") or tx.get("date", "")
        if hasattr(raw, "hour"):
            return raw.hour
        if isinstance(raw, str) and "T" in raw:
            return int(raw.split("T")[1][:2])
    except Exception:
        pass
    return datetime.now().hour


class _IsolationForestModel:
    def __init__(self):
        self.model = None; self.scaler = None
        self.trained = False; self._sample_count = 0

    def _features(self, txs: List[dict]) -> np.ndarray:
        enc = {"deposit": 0, "withdraw": 1, "transfer": 2}
        rows = []
        for t in txs:
            a = float(t.get("amount", 0))
            rows.append([a, float(np.log1p(a)), enc.get(t.get("type",""), 0),
                         _get_hour(t), 1 if a > 0 and a % 1000 == 0 else 0])
        return np.array(rows, dtype=float)

    def train(self, txs: List[dict]) -> bool:
        if len(txs) < 5: return False
        try:
            from sklearn.ensemble import IsolationForest
            from sklearn.preprocessing import StandardScaler
            X = self._features(txs)
            self.scaler = StandardScaler()
            Xs = self.scaler.fit_transform(X)
            self.model = IsolationForest(n_estimators=200, contamination=0.10,
                                          random_state=42, n_jobs=-1)
            self.model.fit(Xs)
            self.trained = True; self._sample_count = len(txs)
            return True
        except Exception as e:
            print(f"[Fraud] IF train error: {e}"); return False

    def score(self, tx: dict) -> float:
        if not self.trained or not self.model: return 0.0
        try:
            feat = self._features([tx])
            raw  = self.model.decision_function(self.scaler.transform(feat))[0]
            return round(float(max(0.0, min(1.0, -raw + 0.5))), 4)
        except Exception:
            return 0.0


# ─── Per-user model cache ─────────────────────────────────────────────────────
# Keyed by user_id (falls back to a shared "_global" bucket when no user_id
# is supplied, e.g. legacy callers or dashboard-wide batch analysis) so each
# user's Isolation Forest reflects their own transaction behavior instead of
# a single model shared across all accounts.
_if_models: Dict[Any, _IsolationForestModel] = {}
_GLOBAL_KEY = "_global"


def _get_or_train_model(user_id: Optional[int] = None,
                        historical: Optional[List[dict]] = None) -> _IsolationForestModel:
    """
    Returns the Isolation Forest model for `user_id`, creating and/or
    training it on `historical` if it doesn't exist yet or hasn't been
    trained (and enough samples, >= 5, are available). Falls back to a
    shared global-key model when user_id is None, preserving compatibility
    with any caller (e.g. batch dashboard analysis) that doesn't have a
    per-user context. Safe to call with no historical data (e.g. at app
    startup) — returns the untrained model, and `.score()` already
    degrades gracefully to 0.0 in that case.
    """
    key = user_id if user_id is not None else _GLOBAL_KEY
    model = _if_models.get(key)
    if model is None:
        model = _IsolationForestModel()
        _if_models[key] = model
    if not model.trained and historical:
        model.train(historical)
    return model


# ─── Context builder ──────────────────────────────────────────────────────────
def _build_context(all_txs: List[dict]) -> dict:
    r_counts: Dict[str, int] = defaultdict(int)
    r_dates:  Dict[str, list] = defaultdict(list)
    amounts: List[float] = []
    transfers: List[dict] = []
    for t in all_txs:
        if t.get("type") in ("transfer", "withdraw"):
            rec = t.get("receiver", "")
            r_counts[rec] += 1
            r_dates[rec].append(str(t.get("date", "")))
            amounts.append(float(t.get("amount", 0)))
            transfers.append(t)
    return {
        "recipient_counts": dict(r_counts),
        "recipient_dates":  dict(r_dates),
        "avg_amount":       sum(amounts) / len(amounts) if amounts else 0.0,
        "all_transfers":    transfers,
    }


def _velocity_check(tx: dict, all_transfers: List[dict]) -> bool:
    try:
        now_str = str(tx.get("created_at") or tx.get("date", ""))
        if "T" not in now_str and len(now_str) == 10:
            return len([t for t in all_transfers
                        if str(t.get("date",""))[:10] == now_str[:10]]) >= 4
        dt_now = datetime.fromisoformat(now_str.replace("Z", "+00:00"))
        return len([t for t in all_transfers
                    if abs((datetime.fromisoformat(
                        str(t.get("created_at", t.get("date",""))).replace("Z","+00:00")
                    ) - dt_now).total_seconds()) <= 3600]) >= 3
    except Exception:
        return False


def _smurfing_check(tx: dict, all_transfers: List[dict]) -> bool:
    """
    R011 helper: detect transfers to 3+ DISTINCT recipients within a short
    (60 minute) window, which is a classic smurfing / fan-out pattern.
    Uses the same time-window approach as _velocity_check but counts
    distinct receivers instead of raw transfer count, so a burst of
    payments to the SAME recipient (already covered by R002/R006) does not
    also trip this rule.
    """
    try:
        now_str = str(tx.get("created_at") or tx.get("date", ""))
        receiver = tx.get("receiver", "")

        if "T" not in now_str and len(now_str) == 10:
            same_day = [t for t in all_transfers if str(t.get("date",""))[:10] == now_str[:10]]
            recipients = {str(t.get("receiver", "")) for t in same_day} | {receiver}
            return len(recipients) >= 3

        dt_now = datetime.fromisoformat(now_str.replace("Z", "+00:00"))
        window = [t for t in all_transfers
                  if abs((datetime.fromisoformat(
                      str(t.get("created_at", t.get("date",""))).replace("Z","+00:00")
                  ) - dt_now).total_seconds()) <= 3600]
        recipients = {str(t.get("receiver", "")) for t in window} | {receiver}
        return len(recipients) >= 3
    except Exception:
        return False


def _new_beneficiary_exposure(tx: dict, ctx: dict) -> bool:
    """
    R012 helper: sums today's transfer amounts (including the current tx)
    sent to recipients that are "new" (0 or 1 prior occurrence in history,
    same definition of "new" used by R004), across DISTINCT new
    recipients. Fires only when 2+ distinct new beneficiaries are involved
    AND the cumulative amount sent to them today is significant
    (> ₹75,000), so a single new-beneficiary transfer (however large)
    never triggers this rule by itself — that stays R004's job.
    """
    try:
        today = str(tx.get("date", datetime.today().date()))[:10]
        recipient_counts = ctx.get("recipient_counts", {})
        all_transfers = ctx.get("all_transfers", [])

        todays = [t for t in all_transfers if str(t.get("date", ""))[:10] == today]
        # include the in-flight transaction itself
        todays = todays + [tx]

        new_benef_totals: Dict[str, float] = defaultdict(float)
        for t in todays:
            rec = t.get("receiver", "")
            if recipient_counts.get(rec, 0) <= 1:
                new_benef_totals[rec] += float(t.get("amount", 0))

        distinct_new = len(new_benef_totals)
        cumulative   = sum(new_benef_totals.values())

        return distinct_new >= 2 and cumulative > 75000
    except Exception:
        return False


# ─── Rule engine ──────────────────────────────────────────────────────────────
def apply_rules(tx: dict, ctx: Optional[dict] = None,
                failed_otp_count: int = 0) -> List[dict]:
    flags: List[dict] = []
    amount  = float(tx.get("amount", 0))
    tx_type = tx.get("type", "")
    receiver = tx.get("receiver", "")

    def add(rule_id: str):
        r = next((r for r in FRAUD_RULES if r["id"] == rule_id), None)
        if r:
            flags.append({"rule_id": r["id"], "rule": r["rule"],
                          "severity": r["severity"], "weight": r["weight"]})

    if tx_type in ("transfer", "withdraw"):
        # R001: amount > 75000
        if amount > 75000:
            add("R001")

        # R008: amount > 40000 — low-severity warning signal only, never
        # sufficient on its own to push a transaction into WARN/BLOCK.
        if amount > 40000:
            add("R008")

        # R003: odd hour
        h = datetime.now().hour
        if h >= 23 or h <= 5:
            add("R003")

        if tx_type == "transfer":
            # R004: new recipient + amount > 50000.
            # A brand-new beneficiary is NORMAL (user just added them before
            # transferring) — this must only ever be a contributing medium
            # signal, never a blocking condition by itself.
            if amount > 50000:
                if ctx:
                    if ctx["recipient_counts"].get(receiver, 0) <= 1:
                        add("R004")
                else:
                    add("R004")

            if ctx:
                # R002: same recipient same day >= 2
                today = str(tx.get("date", datetime.today().date()))[:10]
                dates = ctx["recipient_dates"].get(receiver, [])
                if sum(1 for d in dates if str(d)[:10] == today) >= 2:
                    add("R002")

                # R006: velocity
                if _velocity_check(tx, ctx["all_transfers"]):
                    add("R006")

                # R007: 2× avg
                avg = ctx.get("avg_amount", 0)
                if avg > 0 and amount > avg * 2:
                    add("R007")

                # R011: multi-recipient smurfing — 3+ distinct recipients
                # within a short window. Medium signal only, never blocks
                # by itself.
                if _smurfing_check(tx, ctx["all_transfers"]):
                    add("R011")

                # R012: cumulative exposure to multiple new beneficiaries
                # today. Medium signal only, never blocks by itself.
                if _new_beneficiary_exposure(tx, ctx):
                    add("R012")

    # R009: failed OTP
    if failed_otp_count >= 2:
        add("R009")

    return flags


def compute_risk_score(flags: List[dict], ml_score: float = 0.0) -> int:
    rule_score = min(90, sum(f["weight"] for f in flags))
    return min(100, rule_score + round(ml_score * 30))


def classify_risk(score: int) -> str:
    if score >= RISK_BLOCK: return "blocked"
    if score >= RISK_WARN:  return "warning"
    return "allowed"


# ─── Pre-transfer scoring ─────────────────────────────────────────────────────
def score_pretransfer(tx: dict, historical: List[dict],
                      failed_otp_count: int = 0,
                      user_id: Optional[int] = None) -> dict:
    """
    Uses the per-user Isolation Forest model (keyed by user_id) so each
    user's anomaly baseline is scored against their own transaction
    history rather than a single global model shared across all accounts.
    """
    ctx   = _build_context(historical)
    flags = apply_rules(tx, ctx, failed_otp_count)

    model = _get_or_train_model(user_id, historical)
    ml = model.score(tx)
    if ml > 0.5:
        r = next(r for r in FRAUD_RULES if r["id"] == "R010")
        flags.append({"rule_id": r["id"], "rule": r["rule"],
                      "severity": r["severity"], "weight": r["weight"]})

    score = compute_risk_score(flags, ml)

    # Hard block: only when the transaction is already independently at
    # BLOCK-level risk (strong ML anomaly + multiple corroborating rule
    # flags), AND the amount is large. A single rule (e.g. amount alone,
    # or new-beneficiary alone) can never reach this because R001/R004/R008
    # combined cap out well below RISK_BLOCK — genuine block requires
    # velocity/repeat-recipient/ML-anomaly signals stacking on top.
    if (tx.get("type") == "transfer"
            and float(tx.get("amount", 0)) > 75000
            and score >= RISK_BLOCK):
        score = max(score, RISK_BLOCK)

    # Withdraw: NEVER block on amount
    action = classify_risk(score)
    return {
        "risk_score": score, "risk_level": action,
        "flags": flags, "ml_score": round(ml, 4),
        "action": action, "flag_ids": [f["rule_id"] for f in flags],
    }


# ─── Batch analysis (fraud dashboard) ────────────────────────────────────────
def analyze_all_transactions(transactions: List[dict], user_id: Optional[int] = None) -> Dict[str, Any]:
    """
    user_id is optional for backward compatibility with existing callers
    that analyze a mixed/global transaction set (falls back to the shared
    global-key model in that case). Pass user_id when analyzing a single
    user's transactions to use their dedicated per-user model.
    """
    model = _get_or_train_model(user_id, transactions)

    ctx    = _build_context(transactions)
    alerts = []

    for tx in transactions:
        # Use saved fraud result for blocked transactions
        if tx.get("status") == "blocked":
            alerts.append({
                "transaction_id": tx.get("id"),
                "type": tx.get("type"),
                "amount": float(tx.get("amount", 0)),
                "receiver": tx.get("receiver"),
                "sender": tx.get("sender"),
                "date": str(tx.get("date")),
                "risk_score": round(tx.get("fraud_score", 1.0) * 100),
                "ml_score": 0,
                "flags": [next((r for r in FRAUD_RULES if r["id"] == fid), {"rule_id": fid, "rule": fid, "severity": "high", "weight": 0}) for fid in (tx.get("fraud_flags") or [])],
                "flag_ids": list(tx.get("fraud_flags") or []),
                
                "max_severity": "high",
                "action": "blocked",
            })
            continue

        flags = apply_rules(tx, ctx)
        ml = model.score(tx)
        score = compute_risk_score(flags, ml)

        if flags or ml > 0.55:
            sevs    = [f["severity"] for f in flags]
            max_sev = "high" if "high" in sevs else ("medium" if "medium" in sevs else "low")
            alerts.append({
                "transaction_id": tx.get("id"),
                "type":           tx.get("type"),
                "amount":         float(tx.get("amount", 0)),
                "receiver":       tx.get("receiver"),
                "sender":         tx.get("sender"),
                "date":           str(tx.get("date")),
                "risk_score":     score,
                "ml_score":       round(ml, 4),
                "flags":          flags,
                "flag_ids": list(tx.get("fraud_flags") or []),
                "max_severity":   max_sev,
                "action":         classify_risk(score),
            })

    alerts.sort(key=lambda x: x["date"], reverse=True)
    high    = [a for a in alerts if a["max_severity"] == "high"]
    medium  = [a for a in alerts if a["max_severity"] == "medium"]
    low     = [a for a in alerts if a["max_severity"] == "low"]
    blocked = [a for a in alerts if a["action"] == "blocked"]
    warned  = [a for a in alerts if a["action"] == "warning"]
    overall = "HIGH" if len(high) > 2 else ("MEDIUM" if len(medium) > 2 else "LOW")

    return {
        "total_transactions": len(transactions),
        "flagged_count":      len(alerts),
        "high_risk":          len(high),
        "medium_risk":        len(medium),
        "low_risk":           len(low),
        "blocked_count":      len(blocked),
        "warning_count":      len(warned),
        "alerts":             alerts,
        "overall_risk":       overall,
        "ml_model_trained":   model.trained,
        "ml_sample_count":    model._sample_count,
    }