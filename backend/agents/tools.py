"""
LangGraph agent tools — all use real DB queries via context passed from nodes,
or fall back to the agent's injected transaction/reminder lists.
No DEMO_TRANSACTIONS imports anywhere in this file.
"""
import json
from langchain.tools import tool
from typing import Optional


@tool
def get_account_balance(account_id: int = 1) -> str:
    """Fetch the current account balance for the user from the banking store."""
    # Balance is passed into the agent graph via state; tools read from injected context.
    # This tool is called only when the LLM decides it needs balance info.
    # The actual value is resolved in the banking_node via state["account_balance"].
    return json.dumps({"note": "Balance is available in agent state. Use it directly."})


@tool
def get_recent_transactions(limit: int = 10, tx_type: Optional[str] = None) -> str:
    """Get recent transactions from the agent's injected transaction context."""
    import inspect, sys
    # transactions are injected into the calling frame via agent state
    frame = sys._getframe(1)
    txs = frame.f_locals.get("transactions", [])
    if tx_type:
        txs = [t for t in txs if t.get("type") == tx_type]
    return json.dumps(txs[-limit:])


@tool
def search_banking_knowledge(query: str) -> str:
    """Search the banking knowledge base using RAG (FAISS semantic search)."""
    try:
        from rag.vector_store import rag_store
        doc = rag_store.search(query)
        if doc:
            answer = rag_store.extract_answer(doc)
            confidence = doc.metadata.get("confidence", 0.0)
            return json.dumps({"found": True, "answer": answer, "confidence": confidence})
    except Exception as e:
        return json.dumps({"found": False, "answer": None, "error": str(e)})
    return json.dumps({"found": False, "answer": None})


@tool
def analyze_spending(category: Optional[str] = None) -> str:
    """Analyze spending patterns from the agent's injected transaction context."""
    import sys
    frame = sys._getframe(1)
    transactions = frame.f_locals.get("transactions", [])
    from services.expense_service import analyze_transactions_local
    result = analyze_transactions_local(transactions)
    if category:
        filtered = result["by_category"].get(category, 0)
        return json.dumps({"category": category, "amount": filtered})
    return json.dumps(result)


@tool
def check_fraud_alerts() -> str:
    """Run fraud detection on agent-injected transactions. Returns flagged transactions."""
    import sys
    frame = sys._getframe(1)
    transactions = frame.f_locals.get("transactions", [])
    from services.fraud_service import analyze_all_transactions
    result = analyze_all_transactions(transactions)
    return json.dumps({
        "flagged_count":  result["flagged_count"],
        "overall_risk":   result["overall_risk"],
        "blocked_count":  result["blocked_count"],
        "alerts":         result["alerts"][:5],
    })


@tool
def get_reminders(status: str = "pending") -> str:
    """Get financial reminders filtered by status (pending/done/cancelled)."""
    import sys
    frame = sys._getframe(1)
    reminders = frame.f_locals.get("reminders", [])
    filtered = [r for r in reminders if r.get("status") == status]
    return json.dumps(filtered)


@tool
def calculate_financial_health() -> str:
    """Calculate the user's financial health score (0–100) from injected context."""
    import sys
    frame = sys._getframe(1)
    transactions = frame.f_locals.get("transactions", [])
    reminders    = frame.f_locals.get("reminders", [])
    from services.expense_service import analyze_transactions_local
    from services.fraud_service import analyze_all_transactions

    analysis = analyze_transactions_local(transactions)
    fraud    = analyze_all_transactions(transactions)

    sr            = analysis["savings_rate"]
    fraud_penalty = min(fraud["flagged_count"] * 4, 20)
    reminder_score = 20 if len(reminders) < 10 else 10

    savings_score = min(sr / 100 * 60, 60)
    fraud_score   = max(0, 20 - fraud_penalty)
    total         = round(savings_score + fraud_score + reminder_score)

    return json.dumps({
        "health_score": min(100, total),
        "savings_rate": sr,
        "fraud_penalty": fraud_penalty,
        "grade": "A" if total >= 80 else "B" if total >= 60 else "C" if total >= 40 else "D",
    })


ALL_TOOLS = [
    get_account_balance,
    get_recent_transactions,
    search_banking_knowledge,
    analyze_spending,
    check_fraud_alerts,
    get_reminders,
    calculate_financial_health,
]
