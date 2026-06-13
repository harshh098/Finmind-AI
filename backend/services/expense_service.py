from typing import List, Dict, Any
from collections import defaultdict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.transaction import Transaction


CATEGORY_ICONS = {
    "Income": "↑", "Transfer": "↔", "Cash": "₹",
    "Rent": "🏠", "Food": "🍽", "Groceries": "🛒",
    "Interest": "%", "Gifts": "🎁", "Loan": "📋",
    "Refund": "↩", "General": "•", "Shopping": "🛍",
    "Healthcare": "⚕", "Education": "🎓", "Transport": "🚗",
    "Utilities": "⚡", "Investment": "📈", "Entertainment": "🎬",
}

# Percentage of monthly income allocated per category (sum ≈ 95% leaving 5% unallocated).
# Used to derive dynamic per-user budgets from their actual average income.
CATEGORY_INCOME_PCT: Dict[str, float] = {
    "Rent":          25.0,
    "Loan":          18.0,
    "Transfer":      15.0,
    "Groceries":      8.0,
    "Food":           7.0,
    "Shopping":       6.0,
    "Transport":      4.0,
    "Utilities":      4.0,
    "Healthcare":     4.0,
    "Education":      4.0,
    "Investment":     4.0,
    "Entertainment":  3.0,
    "Cash":           5.0,
    "Gifts":          3.0,
    "General":        5.0,
}

# Absolute floor so budgets never collapse to ₹0 for low-income months.
CATEGORY_FLOOR: Dict[str, float] = {
    "Rent": 8000, "Loan": 5000, "Transfer": 5000,
    "Groceries": 2000, "Food": 1500, "Shopping": 2000,
    "Transport": 1000, "Utilities": 800, "Healthcare": 1000,
    "Education": 1000, "Investment": 1000, "Entertainment": 500,
    "Cash": 2000, "Gifts": 500, "General": 2000,
}


def _compute_dynamic_budgets(avg_monthly_income: float) -> Dict[str, float]:
    """Return per-category budget derived from the user's average monthly income."""
    budgets: Dict[str, float] = {}
    for cat, pct in CATEGORY_INCOME_PCT.items():
        computed = avg_monthly_income * pct / 100.0
        budgets[cat] = max(computed, CATEGORY_FLOOR.get(cat, 500))
    return {k: round(v, 2) for k, v in budgets.items()}


def _mom_insights(by_month: Dict[str, Dict[str, float]]) -> List[str]:
    """Generate month-over-month comparison insights from chronological monthly data."""
    months = sorted(by_month.keys())
    if len(months) < 2:
        return []

    insights: List[str] = []
    last, prev = months[-1], months[-2]
    last_exp  = by_month[last]["expense"]
    prev_exp  = by_month[prev]["expense"]
    last_inc  = by_month[last]["income"]
    prev_inc  = by_month[prev]["income"]

    if prev_exp > 0:
        exp_chg = round((last_exp - prev_exp) / prev_exp * 100, 1)
        direction = "increased" if exp_chg > 0 else "decreased"
        sign      = "📈" if exp_chg > 0 else "📉"
        insights.append(
            f"{sign} Spending {direction} by {abs(exp_chg)}% vs last month "
            f"(₹{last_exp:,.0f} vs ₹{prev_exp:,.0f})."
        )

    if prev_inc > 0:
        inc_chg = round((last_inc - prev_inc) / prev_inc * 100, 1)
        if abs(inc_chg) >= 5:
            direction = "up" if inc_chg > 0 else "down"
            insights.append(
                f"💰 Income is {direction} {abs(inc_chg)}% vs last month "
                f"(₹{last_inc:,.0f} vs ₹{prev_inc:,.0f})."
            )

    # 3-month rolling average comparison (if enough history)
    if len(months) >= 4:
        rolling_exp = sum(by_month[m]["expense"] for m in months[-4:-1]) / 3
        if rolling_exp > 0:
            delta = round((last_exp - rolling_exp) / rolling_exp * 100, 1)
            if abs(delta) >= 10:
                verdict = "above" if delta > 0 else "below"
                insights.append(
                    f"📊 This month's spend is {abs(delta)}% {verdict} your 3-month average "
                    f"(₹{last_exp:,.0f} vs avg ₹{rolling_exp:,.0f})."
                )

    return insights


def _personalized_insights(
    by_category_month: Dict[str, Dict[str, float]],
    dynamic_budgets: Dict[str, float],
    savings_rate: float,
    total_income: float,
    total_expense: float,
    month_count: int,
) -> List[str]:
    """Generate actionable, user-specific insights based on actual patterns."""
    insights: List[str] = []

    # --- Savings rate insight ---
    if total_income == 0:
        insights.append("No income recorded yet. Deposit funds to activate expense analytics.")
        return insights

    if savings_rate > 35:
        insights.append(
            f"🏆 Exceptional savings rate of {savings_rate}%! "
            "Consider stepping up SIP contributions or opening an FD for the surplus."
        )
    elif savings_rate > 20:
        insights.append(
            f"✅ Savings rate {savings_rate}% — above the recommended 20%. "
            "You're on track; review investments annually."
        )
    elif savings_rate > 10:
        insights.append(
            f"⚠️ Savings rate {savings_rate}% — below the 20% target. "
            "Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings."
        )
    else:
        insights.append(
            f"🔴 Savings rate {savings_rate}% is critically low. "
            "Review discretionary spending — automate ₹{:,.0f}/month into a savings account.".format(
                max(500, round(total_income * 0.10 / month_count))
            )
        )

    # --- Per-category overspend with personalised advice ---
    CATEGORY_ADVICE: Dict[str, str] = {
        "Food":          "Try meal-prepping or limiting restaurant visits to weekends.",
        "Shopping":      "Use a 24-hour rule before online purchases to cut impulse buys.",
        "Entertainment": "Audit subscriptions — cancel unused streaming or gaming services.",
        "Transport":     "Combine errands or use public transit for short distances.",
        "Groceries":     "Stick to a weekly list; avoid shopping when hungry.",
        "General":       "Tag 'General' expenses with a specific category for better visibility.",
        "Cash":          "Limit ATM withdrawals — cash spend is harder to track.",
    }

    overspend_cats = [
        (cat, spent, dynamic_budgets[cat])
        for cat, spent in by_category_month.items()
        if cat in dynamic_budgets and spent > dynamic_budgets[cat]
    ]
    overspend_cats.sort(key=lambda x: x[1] - x[2], reverse=True)

    for cat, spent, budget in overspend_cats[:3]:
        pct_over = round((spent - budget) / budget * 100)
        advice   = CATEGORY_ADVICE.get(cat, "Review recent transactions in this category.")
        insights.append(
            f"🔴 {cat} is {pct_over}% over your ₹{budget:,.0f} budget "
            f"(spent ₹{spent:,.0f}). {advice}"
        )

    if not overspend_cats:
        insights.append("🟢 All tracked categories are within personalised budget limits. Excellent!")

    return insights


async def get_expense_analysis(db: AsyncSession, account_id: int) -> Dict[str, Any]:
    result = await db.execute(
        select(Transaction).where(Transaction.account_id == account_id)
    )
    transactions = result.scalars().all()

    by_category: Dict[str, float]                    = defaultdict(float)
    by_month: Dict[str, Dict[str, float]]            = defaultdict(lambda: {"income": 0.0, "expense": 0.0})
    by_category_month: Dict[str, float]              = defaultdict(float)  # last-month spend per category
    total_income  = 0.0
    total_expense = 0.0

    for t in transactions:
        month_key = str(t.date)[:7]
        amount    = float(t.amount)
        cat       = t.category or ("Income" if t.type == "deposit" else "General")

        if t.type == "deposit":
            total_income               += amount
            by_month[month_key]["income"] += amount
            by_category["Income"]      += amount
        else:
            total_expense              += amount
            by_month[month_key]["expense"] += amount
            by_category[cat]           += amount

    # Derive dynamic budgets from average monthly income
    month_count         = len(by_month) or 1
    avg_monthly_income  = total_income / month_count
    dynamic_budgets     = _compute_dynamic_budgets(avg_monthly_income)

    # Last-month category breakdown for personalised insights
    if by_month:
        last_month = max(by_month.keys())
        for t in transactions:
            if str(t.date)[:7] == last_month and t.type != "deposit":
                cat = t.category or "General"
                by_category_month[cat] += float(t.amount)

    top_categories = sorted(
        [{"category": k, "amount": v, "icon": CATEGORY_ICONS.get(k, "•")}
         for k, v in by_category.items() if k != "Income"],
        key=lambda x: x["amount"],
        reverse=True,
    )[:8]

    savings_rate = round(
        ((total_income - total_expense) / total_income * 100) if total_income else 0, 1
    )

    # --- Compose insights ---
    insights: List[str] = []

    # 1. Core savings + over-budget personalised insights
    insights.extend(_personalized_insights(
        dict(by_category_month),
        dynamic_budgets,
        savings_rate,
        total_income,
        total_expense,
        month_count,
    ))

    # 2. Month-over-month comparison insights
    insights.extend(_mom_insights({k: dict(v) for k, v in by_month.items()}))

    # 3. Top category callout (if not already covered by overspend)
    if top_categories:
        top = top_categories[0]
        insights.append(
            f"📌 Highest cumulative spend: {top['category']} at ₹{top['amount']:,.0f}."
        )

    # Budget alerts using dynamic budgets (backward-compat key)
    budget_alerts = [
        f"{cat} is at {round(amt / dynamic_budgets[cat] * 100)}% of your personalised monthly budget"
        for cat, amt in by_category.items()
        if cat in dynamic_budgets and amt > dynamic_budgets[cat] * 0.8 and cat != "Income"
    ]
    # Don't duplicate — only add alerts for categories not already in overspend insights
    overspend_keys = {
        c for c in by_category if c in dynamic_budgets and by_category[c] > dynamic_budgets[c]
    }
    for alert in budget_alerts:
        cat_name = alert.split(" is at ")[0]
        if cat_name not in overspend_keys:
            insights.append(alert)

    return {
        # Core financials — unchanged shape
        "total_income":   round(total_income, 2),
        "total_expense":  round(total_expense, 2),
        "net_savings":    round(total_income - total_expense, 2),
        "savings_rate":   savings_rate,
        "by_category":    dict(by_category),
        "by_month":       {k: dict(v) for k, v in sorted(by_month.items())},
        "top_categories": top_categories,
        "insights":       insights,
        # Dynamic budgets — replaces static BUDGET_DEFAULTS for this user
        "budget_defaults":      dynamic_budgets,
        # Extra metadata (additive — does not break existing consumers)
        "avg_monthly_income":   round(avg_monthly_income, 2),
        "dynamic_budgets":      dynamic_budgets,
        "income_pct_allocations": CATEGORY_INCOME_PCT,
    }


def analyze_transactions_local(transactions: List[dict]) -> Dict[str, Any]:
    """Pure-python version for use within agent tools (no DB needed)."""
    by_category: Dict[str, float]         = defaultdict(float)
    by_month: Dict[str, Dict[str, float]] = defaultdict(lambda: {"income": 0.0, "expense": 0.0})
    total_income  = 0.0
    total_expense = 0.0

    for t in transactions:
        month_key = str(t.get("date", ""))[:7]
        amount    = float(t.get("amount", 0))
        cat       = t.get("category") or ("Income" if t.get("type") == "deposit" else "General")

        if t.get("type") == "deposit":
            total_income               += amount
            by_month[month_key]["income"] += amount
            by_category["Income"]      += amount
        else:
            total_expense              += amount
            by_month[month_key]["expense"] += amount
            by_category[cat]           += amount

    month_count        = len(by_month) or 1
    avg_monthly_income = total_income / month_count
    dynamic_budgets    = _compute_dynamic_budgets(avg_monthly_income)

    return {
        "total_income":      round(total_income, 2),
        "total_expense":     round(total_expense, 2),
        "net_savings":       round(total_income - total_expense, 2),
        "savings_rate":      round(((total_income - total_expense) / total_income * 100) if total_income else 0, 1),
        "by_category":       dict(by_category),
        "by_month":          {k: dict(v) for k, v in sorted(by_month.items())},
        "budget_defaults":   dynamic_budgets,
        "dynamic_budgets":   dynamic_budgets,
        "avg_monthly_income": round(avg_monthly_income, 2),
    }