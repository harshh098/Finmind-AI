"""
LangGraph agent nodes.
All nodes read transactions/reminders/balance from AgentState,
which is populated with real DB data by the agent router.
No hardcoded DEMO data — state is the single source of truth.
"""
from typing import Any
from agents.state import AgentState

# ─── Intent Detection ─────────────────────────────────────────────────────────
INTENT_PATTERNS = {
    "balance":  ["balance", "how much", "money left", "account total", "funds"],
    "transfer": ["transfer", "send", "pay", "transfder", "tranfer"],
    "withdraw": ["withdraw", "withdrawal", "atm", "cash out"],
    "fraud":    ["fraud", "suspicious", "alert", "scam", "unusual", "flagged"],
    "expense":  ["expense", "spend", "spending", "category", "budget", "cost"],
    "reminder": ["remind", "reminder", "upcoming", "pending", "due date", "next emi",
                 "my emi", "my sip", "my bill", "insurance due"],
    "rag":      ["what is", "what's", "define", "explain", "how does", "how do",
                 "neft", "rtgs", "imps", "upi", "fd", "fixed deposit", "kyc",
                 "cibil", "credit score", "ifsc", "loan eligibility", "elss",
                 "rd", "recurring deposit", "nominee", "utr", "settlement",
                 "sip", "emi", "bill"],
    "advisory": ["advice", "recommend", "suggest", "should i", "invest", "plan",
                 "goal", "portfolio", "strategy", "financial health"],
    "general":  [],
}

EDUCATIONAL_MARKERS = [
    "what is", "what's", "what are", "define", "explain", "how does", "how do",
    "meaning of", "difference between", "tell me about", "give me info on",
]

REMINDER_MARKERS = [
    "remind", "reminder", "upcoming", "pending", "due date", "due on",
    "next emi", "next sip", "next bill", "next payment",
    "my emi", "my sip", "my bill", "my reminders", "my dues",
    "show reminders", "list reminders", "scheduled payment",
]


def detect_intent_node(state: AgentState) -> AgentState:
    """Node: Detect user intent and route to the right sub-graph."""
    query = state["query"].lower().strip()
    steps = state.get("steps", [])

    scores = {intent: 0 for intent in INTENT_PATTERNS}
    for intent, keywords in INTENT_PATTERNS.items():
        for kw in keywords:
            if kw in query:
                scores[intent] += 1

    is_educational = any(m in query for m in EDUCATIONAL_MARKERS)
    is_reminder_specific = any(m in query for m in REMINDER_MARKERS)

    # "What is X" only counts as educational if X is a concept word the RAG
    # list covers (sip, emi, neft, etc.) — not action words like "balance",
    # "transfer", "fraud" which have their own dedicated intents.
    has_concept_word = any(kw in query for kw in INTENT_PATTERNS["rag"]
                            if kw not in EDUCATIONAL_MARKERS)

    if is_educational and has_concept_word:
        best_intent, confidence = "rag", 0.9
    elif is_reminder_specific:
        best_intent, confidence = "reminder", 0.9
    else:
        best_intent = max(scores, key=scores.get)
        confidence  = min(1.0, scores[best_intent] * 0.3) if scores[best_intent] > 0 else 0.1
        if scores[best_intent] == 0:
            best_intent, confidence = "general", 0.1

    steps.append({"node": "detect_intent", "detail": f"Intent: {best_intent} (confidence: {confidence:.2f})"})
    return {**state, "intent": best_intent, "confidence": confidence, "steps": steps}


# ─── Banking Node ──────────────────────────────────────────────────────────────
def banking_node(state: AgentState) -> AgentState:
    steps   = state.get("steps", [])
    query   = state["query"].lower()
    balance = state.get("account_balance", 0)
    transactions = state.get("transactions", [])

    if "balance" in query:
        recent_lines = "\n".join(
            f"• {t['type'].title()} ₹{t['amount']:,.0f} — {t.get('message') or 'N/A'} ({t['date']})"
            for t in transactions[:3]
        )
        response = (
            f"Your current account balance is ₹{balance:,.0f}.\n\n"
            f"Recent activity:\n{recent_lines or 'No recent transactions.'}"
        )
        steps.append({"node": "banking", "detail": "Fetched live account balance from Banking API"})
    elif any(k in query for k in ["transfer", "send", "pay"]):
        response = (
            "To initiate a transfer, I need:\n"
            "• Recipient name\n• Amount\n• Purpose\n\n"
            "All transfers require OTP verification via SMS for security.\n"
            "Please use the Transfer section in the app."
        )
        steps.append({"node": "banking", "detail": "Transfer intent — OTP flow required"})
    elif any(k in query for k in ["withdraw", "withdrawal"]):
        response = (
            "To withdraw cash, use the Withdraw section.\n"
            "OTP verification is mandatory for all withdrawals.\n"
            f"Current balance available: ₹{balance:,.0f}"
        )
        steps.append({"node": "banking", "detail": "Withdrawal intent — redirecting to secure flow"})
    else:
        response = "Please specify a banking action: check balance, transfer funds, or withdraw cash."
        steps.append({"node": "banking", "detail": "Unknown banking sub-intent"})

    return {**state, "response": response, "steps": steps}


# ─── RAG Node ─────────────────────────────────────────────────────────────────
def rag_node(state: AgentState) -> AgentState:
    from rag.vector_store import rag_store
    steps = state.get("steps", [])
    query = state["query"]

    steps.append({"node": "rag_search", "detail": "Running FAISS semantic similarity search..."})
    doc = rag_store.search(query)

    if doc:
        answer     = rag_store.extract_answer(doc)
        confidence = doc.metadata.get("confidence", 0.0)
        source     = doc.metadata.get("source", "Banking KB")
        response   = (
            f"📚 **Banking Knowledge Base**\n\n{answer}\n\n"
            f"*Source: {source} | Confidence: {confidence:.0%}*"
        )
        steps.append({"node": "rag_found", "detail": f"Retrieved from {source} (confidence: {confidence:.2f})"})
        return {**state, "response": response, "steps": steps, "sources": [source]}
    else:
        steps.append({"node": "llm_fallback", "detail": "No RAG match — invoking Groq Llama 3.1..."})
        return {**state, "steps": steps, "rag_doc": None}


# ─── Fraud Node ───────────────────────────────────────────────────────────────
def fraud_node(state: AgentState) -> AgentState:
    from services.fraud_service import analyze_all_transactions
    steps        = state.get("steps", [])
    transactions = state.get("transactions", [])

    steps.append({"node": "fraud_engine", "detail": f"Running Isolation Forest + rule engine on {len(transactions)} transactions..."})
    result = analyze_all_transactions(transactions)

    alerts_text = "\n".join(
        f"• TX#{a['transaction_id']}: ₹{a['amount']:,.0f} → {a.get('receiver','?')} — "
        f"{a['flags'][0]['rule'] if a['flags'] else 'ML anomaly'} [{a['max_severity'].upper()}]"
        for a in result["alerts"][:5]
    ) or "No alerts."

    response = (
        f"🚨 **Fraud Detection Report**\n\n"
        f"Scanned: {result['total_transactions']} transactions\n"
        f"Flagged: {result['flagged_count']} suspicious\n"
        f"Blocked: {result['blocked_count']}\n"
        f"Overall Risk: **{result['overall_risk']}**\n\n"
        f"**Top Alerts:**\n{alerts_text}\n\n"
        f"ML Model: {'Active ✅' if result['ml_model_trained'] else 'Rule-based only'}"
    )

    steps.append({"node": "fraud_done", "detail": f"Found {result['flagged_count']} alerts. Risk: {result['overall_risk']}"})
    return {**state, "response": response, "fraud_result": result, "steps": steps}


# ─── Expense Node ─────────────────────────────────────────────────────────────
def expense_node(state: AgentState) -> AgentState:
    from services.expense_service import analyze_transactions_local
    steps        = state.get("steps", [])
    transactions = state.get("transactions", [])

    steps.append({"node": "expense_analytics", "detail": "Aggregating spend by category and month..."})
    result = analyze_transactions_local(transactions)

    top3 = sorted(
        [(k, v) for k, v in result["by_category"].items() if k != "Income"],
        key=lambda x: x[1], reverse=True
    )[:3]

    response = (
        f"📊 **Expense Analysis**\n\n"
        f"Total Income: ₹{result['total_income']:,.0f}\n"
        f"Total Expense: ₹{result['total_expense']:,.0f}\n"
        f"Net Savings: ₹{result['net_savings']:,.0f}\n"
        f"Savings Rate: {result['savings_rate']}%\n\n"
        f"**Top Spending Categories:**\n"
        + "\n".join(f"• {k}: ₹{v:,.0f}" for k, v in top3)
    )

    steps.append({"node": "expense_done", "detail": f"Savings rate: {result['savings_rate']}%"})
    return {**state, "response": response, "expense_result": result, "steps": steps}


# ─── Reminder Node ────────────────────────────────────────────────────────────
def reminder_node(state: AgentState) -> AgentState:
    steps     = state.get("steps", [])
    reminders = state.get("reminders", [])

    steps.append({"node": "reminder_store", "detail": "Querying reminder database..."})
    pending      = [r for r in reminders if r.get("status") == "pending"]
    total_amount = sum(r.get("amount", 0) for r in pending)

    lines = "\n".join(
        f"• [{r['type'].upper()}] {r['task']} — ₹{r.get('amount', 0):,.0f} on {r['date']}"
        for r in pending[:6]
    ) or "No pending reminders."

    response = (
        f"📅 **Upcoming Reminders ({len(pending)} pending)**\n\n"
        f"Total obligations: ₹{total_amount:,.0f}\n\n"
        f"{lines}"
    )

    steps.append({"node": "reminder_done", "detail": f"{len(pending)} pending reminders fetched"})
    return {**state, "response": response, "steps": steps}


# ─── Advisory Node ────────────────────────────────────────────────────────────
async def advisory_node(state: AgentState) -> AgentState:
    from services.llm_service import ask_llm
    from services.expense_service import analyze_transactions_local
    from services.fraud_service import analyze_all_transactions

    steps        = state.get("steps", [])
    transactions = state.get("transactions", [])
    reminders    = state.get("reminders", [])
    balance      = state.get("account_balance", 0)

    steps.append({"node": "advisory_engine", "detail": "Analyzing financial profile..."})

    analysis      = analyze_transactions_local(transactions)
    fraud         = analyze_all_transactions(transactions)
    pending_emis  = sum(1 for r in reminders if r.get("type") == "emi")

    context = f"""User Financial Profile:
- Balance: ₹{balance:,.0f}
- Net Savings: ₹{analysis['net_savings']:,.0f}
- Savings Rate: {analysis['savings_rate']}%
- Fraud Alerts: {fraud['flagged_count']}
- Pending EMIs: {pending_emis}
- Active Reminders: {len(reminders)}

Query: {state['query']}

Provide 4 specific, actionable financial recommendations with ₹ amounts."""

    response_text = await ask_llm(context)
    steps.append({"node": "advisory_done", "detail": "Generated personalized recommendations"})
    return {**state, "response": f"💡 **AI Financial Advisor**\n\n{response_text}", "steps": steps}


# ─── General LLM Node ─────────────────────────────────────────────────────────
async def general_llm_node(state: AgentState) -> AgentState:
    from services.llm_service import ask_llm, BANKING_SYSTEM_PROMPT
    steps   = state.get("steps", [])
    balance = state.get("account_balance", 0)

    from rag.vector_store import rag_store
    doc = rag_store.search(state["query"], min_score=0.45)
    if doc:
        answer = rag_store.extract_answer(doc)
        steps.append({"node": "rag_fallback", "detail": "Found weak RAG match — using it"})
        return {**state, "response": f"📚 {answer}", "steps": steps}

    steps.append({"node": "groq_llm", "detail": "No RAG match — invoking Groq Llama 3.1 8B..."})
    response_text = await ask_llm(
        f"User balance: ₹{balance:,.0f}. Query: {state['query']}",
        BANKING_SYSTEM_PROMPT,
    )
    steps.append({"node": "llm_done", "detail": "LLM response generated"})
    return {**state, "response": response_text, "steps": steps}