"""
Analytics service: financial health score, insights, and AI recommendations.
"""
from typing import List, Dict, Any
from services.expense_service import analyze_transactions_local


def compute_health_score(
    transactions: List[dict],
    reminders: List[dict],
    fraud_count: int = 0,
) -> Dict[str, Any]:
    """
    Compute financial health score (0–100) from multiple signals.
    Returns score + component breakdown.
    """
    analysis = analyze_transactions_local(transactions)
    sr = analysis["savings_rate"]

    # Component scores
    savings_score  = min(60, sr * 1.5)               # max 60 pts
    fraud_penalty  = min(20, fraud_count * 4)
    fraud_score    = max(0, 20 - fraud_penalty)       # max 20 pts
    reminder_score = 20 if len(reminders) < 10 else 10  # max 20 pts

    total = min(100, round(savings_score + fraud_score + reminder_score))

    grade = "A" if total >= 80 else "B" if total >= 65 else "C" if total >= 45 else "D"
    label = "Excellent" if total >= 80 else "Good" if total >= 65 else "Fair" if total >= 45 else "At Risk"

    return {
        "health_score": total,
        "grade": grade,
        "label": label,
        "components": {
            "savings_score": round(savings_score, 1),
            "fraud_score": fraud_score,
            "reminder_score": reminder_score,
        },
        "savings_rate": sr,
        "total_income": analysis["total_income"],
        "total_expense": analysis["total_expense"],
        "net_savings": analysis["net_savings"],
    }


def generate_insights(transactions: List[dict], reminders: List[dict]) -> List[str]:
    """Generate text insights from transaction data."""
    analysis = analyze_transactions_local(transactions)

    insights = []
    sr = analysis["savings_rate"]
    byCat = analysis["by_category"]
    budgets = analysis.get("dynamic_budgets", {})

    # Savings rate insight
    if sr >= 30:
        insights.append(
            f"Excellent savings rate of {sr}%! You're well above the 20% benchmark."
        )
    elif sr >= 20:
        insights.append(
            f"Good savings rate of {sr}%. Consider increasing SIP contributions."
        )
    elif sr > 0:
        insights.append(
            f"Your savings rate is {sr}%. Target 20%+ by reducing discretionary spend."
        )
    else:
        insights.append(
            "Warning: Expenses exceed income this period. Review your spending immediately."
        )

    # Top category
    expense_cats = {
        k: v
        for k, v in byCat.items()
        if k not in ("Income", "Refund", "Interest")
    }

    if expense_cats:
        top_cat, top_amt = max(
            expense_cats.items(),
            key=lambda x: x[1]
        )

        budget = budgets.get(top_cat)

        if budget:
            status = (
                "Within budget."
                if top_amt <= budget
                else "Over budget — consider reducing."
            )

            insights.append(
                f"Largest expense category: {top_cat} (₹{top_amt:,.0f}). {status}"
            )
        else:
            insights.append(
                f"Largest expense category: {top_cat} (₹{top_amt:,.0f})."
            )

    # Over-budget categories
    over = [
        k
        for k, v in expense_cats.items()
        if k in budgets and v > budgets[k]
    ]

    if over:
        insights.append(
            f"{len(over)} categories over budget this period: {', '.join(over[:3])}."
        )

    # Pending reminders
    pending = [
        r for r in reminders
        if r.get("status") == "pending"
    ]

    emi_total = sum(
        r.get("amount", 0)
        for r in pending
        if r.get("type") == "emi"
    )

    if emi_total > 0:
        insights.append(
            f"Upcoming EMI obligations: ₹{emi_total:,.0f}. Ensure sufficient balance before due dates."
        )

    # Income diversification
    sources = {
        t.get("sender")
        for t in transactions
        if t.get("type") == "deposit"
    }

    if len(sources) >= 3:
        insights.append(
            f"Good income diversification across {len(sources)} sources."
        )
    elif len(sources) == 1:
        insights.append(
            "Single income source detected. Consider diversifying income streams for financial resilience."
        )

    return insights[:6]


def get_recommendations(health_data: Dict[str, Any], reminders: List[dict]) -> List[Dict[str, str]]:
    """Return structured AI recommendations based on financial profile."""
    score = health_data.get("health_score", 50)
    sr    = health_data.get("savings_rate", 0)

    recs = []

    if sr < 20:
        recs.append({
            "icon": "📊",
            "title": "Boost Your Savings Rate",
            "desc": f"Your current rate is {sr}%. Automate savings of 20% of income on salary day.",
            "priority": "high",
        })

    pending_ins = [r for r in reminders if r.get("type") == "insurance" and r.get("status") == "pending"]
    if pending_ins:
        recs.append({
            "icon": "🛡️",
            "title": "Insurance Premium Due",
            "desc": f"{len(pending_ins)} insurance premium(s) due soon. Don't let coverage lapse.",
            "priority": "high",
        })

    recs.append({
        "icon": "📈",
        "title": "Step-Up Your SIP",
        "desc": "Increase SIP by 10% annually. ₹2,000/mo at 12% for 20 years = ₹19.8L corpus.",
        "priority": "medium",
    })

    if score < 60:
        recs.append({
            "icon": "⚠️",
            "title": "Improve Financial Health",
            "desc": "Your score is below 60. Pay EMIs on time, reduce overspending, build emergency fund.",
            "priority": "high",
        })
    else:
        recs.append({
            "icon": "💰",
            "title": "Build Emergency Fund",
            "desc": "Target 6 months of expenses in a liquid FD. Provides safety net without market risk.",
            "priority": "medium",
        })

    recs.append({
        "icon": "🎯",
        "title": "Maximize 80C Benefits",
        "desc": "Invest ₹1.5L in ELSS/PPF/NPS for tax savings of up to ₹46,800 under new tax regime.",
        "priority": "medium",
    })

    return recs[:4]
