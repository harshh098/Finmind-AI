from typing import List
from langgraph.graph import StateGraph, END
from agents.state import AgentState
from agents.nodes import (
    detect_intent_node,
    banking_node,
    rag_node,
    fraud_node,
    expense_node,
    reminder_node,
    advisory_node,
    general_llm_node,
)


def route_after_intent(state: AgentState) -> str:
    intent = state.get("intent", "general")
    routes = {
        "balance":  "banking",
        "transfer": "banking",
        "withdraw": "banking",
        "fraud":    "fraud",
        "expense":  "expense",
        "reminder": "reminder",
        "rag":      "rag",
        "advisory": "advisory",
        "general":  "general_llm",
    }
    return routes.get(intent, "general_llm")


def route_after_rag(state: AgentState) -> str:
    if state.get("response"):
        return END
    return "general_llm"


def build_agent_graph() -> StateGraph:
    workflow = StateGraph(AgentState)

    workflow.add_node("detect_intent", detect_intent_node)
    workflow.add_node("banking",       banking_node)
    workflow.add_node("rag",           rag_node)
    workflow.add_node("fraud",         fraud_node)
    workflow.add_node("expense",       expense_node)
    workflow.add_node("reminder",      reminder_node)
    workflow.add_node("advisory",      advisory_node)
    workflow.add_node("general_llm",   general_llm_node)

    workflow.set_entry_point("detect_intent")

    workflow.add_conditional_edges(
        "detect_intent",
        route_after_intent,
        {
            "banking":     "banking",
            "rag":         "rag",
            "fraud":       "fraud",
            "expense":     "expense",
            "reminder":    "reminder",
            "advisory":    "advisory",
            "general_llm": "general_llm",
        },
    )

    workflow.add_conditional_edges(
        "rag",
        route_after_rag,
        {END: END, "general_llm": "general_llm"},
    )

    for node in ["banking", "fraud", "expense", "reminder", "advisory", "general_llm"]:
        workflow.add_edge(node, END)

    return workflow.compile()


agent_graph = build_agent_graph()


async def run_agent(
    query: str,
    user_id: int = 1,
    account_id: int = 1,
    transactions: List[dict] = None,
    reminders: List[dict] = None,
    account_balance: float = 0.0,
) -> dict:
    """
    Run the LangGraph agent.
    Accepts real user data injected by the router — no DEMO fallbacks.
    """
    initial_state: AgentState = {
        "query":           query,
        "user_id":         user_id,
        "account_id":      account_id,
        "transactions":    transactions or [],
        "reminders":       reminders or [],
        "account_balance": account_balance,
        "intent":          "",
        "confidence":      0.0,
        "rag_doc":         None,
        "rag_answer":      None,
        "banking_result":  None,
        "fraud_result":    None,
        "expense_result":  None,
        "reminder_result": None,
        "steps":           [],
        "tool_calls":      [],
        "response":        "",
        "sources":         [],
        "messages":        [],
    }

    final_state = await agent_graph.ainvoke(initial_state)

    return {
        "intent":     final_state.get("intent", "general"),
        "response":   final_state.get("response", "I couldn't generate a response."),
        "steps":      final_state.get("steps", []),
        "confidence": final_state.get("confidence", 0.0),
        "sources":    final_state.get("sources", []),
    }
