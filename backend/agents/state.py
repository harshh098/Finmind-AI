from typing import TypedDict, Optional, List, Any
from typing import Annotated
from langgraph.graph import add_messages
from langchain.schema import BaseMessage


class AgentState(TypedDict):
    """State passed between nodes in the LangGraph workflow."""
    # Input
    query:      str
    user_id:    int
    account_id: int

    # Real user context injected by the router
    transactions:    List[dict]
    reminders:       List[dict]
    account_balance: float

    # Routing
    intent:     str    # banking | rag | fraud | expense | reminder | advisory | general
    confidence: float

    # Intermediate results
    rag_doc:         Optional[Any]
    rag_answer:      Optional[str]
    banking_result:  Optional[dict]
    fraud_result:    Optional[dict]
    expense_result:  Optional[dict]
    reminder_result: Optional[Any]

    # Workflow tracking
    steps:      List[dict]
    tool_calls: List[str]

    # Final output
    response: str
    sources:  List[str]

    # Conversation history (for multi-turn)
    messages: Annotated[List[BaseMessage], add_messages]
