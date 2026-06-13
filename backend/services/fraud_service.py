from __future__ import annotations
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import numpy as np

# ─── Thresholds ───────────────────────────────────────────────────────────────
RISK_WARN  = 60
RISK_BLOCK = 85

# ─── Rule definitions (R005 removed) ─────────────────────────────────────────
FRAUD_RULES = [
    {"id": "R001", "rule": "Large transfer (> 75,000)",            "severity": "high",   "weight": 25},
    {"id": "R002", "rule": "Multiple transfers to same recipient today","severity": "medium", "weight": 20},
    {"id": "R003", "rule": "Unusual hour (11 PM – 5 AM)",              "severity": "medium", "weight": 15},
    {"id": "R004", "rule": "New recipient with large amount (> ₹50,000)","severity": "high", "weight": 30},
    {"id": "R006", "rule": "Velocity: 3+ transfers in 60 minutes",     "severity": "high",  "weight": 35},
    {"id": "R007", "rule": "Amount > 2× user average transfer",        "severity": "medium","weight": 20},
    {"id": "R008", "rule": "Amount > ₹40,000",                         "severity": "high",  "weight": 15},
    {"id": "R009", "rule": "Multiple failed OTP attempts",             "severity": "high",  "weight": 30},
    {"id": "R010", "rule": "Isolation Forest anomaly detected",        "severity": "medium","weight": 25},
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


_if_model = _IsolationForestModel()


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
        # R001: amount > 100000  (fixed from 8000)
        if amount > 75000:
            add("R001")

        # R008: amount > 50000 (moderate signal)
        if amount > 40000:
            add("R008")

        # R003: odd hour
        h = datetime.now().hour
        if h >= 23 or h <= 5:
            add("R003")

        if tx_type == "transfer":
            # R004: new recipient + amount > 50000  (fixed from 5000)
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

    # R009: failed OTP
    if failed_otp_count >= 2:
        add("R009")

    return flags


def compute_risk_score(flags: List[dict], ml_score: float = 0.0) -> int:
    rule_score = min(70, sum(f["weight"] for f in flags))
    return min(100, rule_score + round(ml_score * 30))


def classify_risk(score: int) -> str:
    if score >= RISK_BLOCK: return "blocked"
    if score >= RISK_WARN:  return "warning"
    return "allowed"


# ─── Pre-transfer scoring ─────────────────────────────────────────────────────
def score_pretransfer(tx: dict, historical: List[dict],
                      failed_otp_count: int = 0) -> dict:
    ctx   = _build_context(historical)
    flags = apply_rules(tx, ctx, failed_otp_count)

    global _if_model
    if not _if_model.trained:
        _if_model.train(historical)
    ml = _if_model.score(tx)
    if ml > 0.5:
        r = next(r for r in FRAUD_RULES if r["id"] == "R010")
        flags.append({"rule_id": r["id"], "rule": r["rule"],
                      "severity": r["severity"], "weight": r["weight"]})

    score = compute_risk_score(flags, ml)

    # Hard block: transfer >75k AND score >= 85
    if (tx.get("type") == "transfer"
            and float(tx.get("amount", 0)) > 75000
            and score >= RISK_WARN):
        score = max(score, RISK_BLOCK)

    # Withdraw: NEVER block on amount
    action = classify_risk(score)
    return {
        "risk_score": score, "risk_level": action,
        "flags": flags, "ml_score": round(ml, 4),
        "action": action, "flag_ids": [f["rule_id"] for f in flags],
    }


# ─── Batch analysis (fraud dashboard) ────────────────────────────────────────
def analyze_all_transactions(transactions: List[dict]) -> Dict[str, Any]:
    global _if_model
    if not _if_model.trained and len(transactions) >= 5:
        _if_model.train(transactions)

    ctx    = _build_context(transactions)
    alerts = []

    for tx in transactions:
        flags = apply_rules(tx, ctx)
        ml    = _if_model.score(tx)
        if ml > 0.5:
            r = next(r for r in FRAUD_RULES if r["id"] == "R010")
            flags.append({"rule_id": r["id"], "rule": r["rule"],
                          "severity": r["severity"], "weight": r["weight"]})

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
                "flag_ids":       [f["rule_id"] for f in flags],
                "max_severity":   max_sev,
                "action":         classify_risk(score),
            })

    alerts.sort(key=lambda x: x["risk_score"], reverse=True)
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
        "ml_model_trained":   _if_model.trained,
        "ml_sample_count":    _if_model._sample_count,
    }
