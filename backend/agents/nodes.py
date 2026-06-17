"""
LangGraph agent nodes.
All nodes read transactions/reminders/balance from AgentState,
which is populated with real DB data by the agent router.
No hardcoded DEMO data — state is the single source of truth.
"""
from typing import Any
from agents.state import AgentState

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