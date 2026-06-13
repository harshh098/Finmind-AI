from langchain_groq import ChatGroq
from langchain.schema import HumanMessage, SystemMessage
from config import settings

_llm_instance = None


def get_llm() -> ChatGroq:
    global _llm_instance
    if _llm_instance is None:
        _llm_instance = ChatGroq(
            groq_api_key=settings.groq_api_key,
            model="llama-3.1-8b-instant",
            temperature=0.3,
            max_tokens=1024,
        )
    return _llm_instance


BANKING_SYSTEM_PROMPT = """You are FinMind AI — an expert Indian banking and financial assistant.
You are embedded in a secure banking app. Be concise, accurate, and professional.
Use ₹ for Indian Rupee. Provide practical, actionable advice.
For sensitive financial queries, always advise consulting a certified financial advisor.
Never fabricate bank account numbers, interest rates, or specific product terms."""


async def ask_llm(query: str, system_prompt: str = BANKING_SYSTEM_PROMPT) -> str:
    """Invoke Groq Llama 3.1 with a query. Returns text response."""
    try:
        llm = get_llm()
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=query),
        ]
        response = llm.invoke(messages)
        return response.content.strip()
    except Exception as e:
        return f"I couldn't generate a response right now. Error: {str(e)[:80]}"


async def ask_llm_with_context(query: str, context: str) -> str:
    """LLM call with injected RAG context."""
    prompt = f"""Use the following banking knowledge to answer the question.
If the context doesn't cover the question fully, supplement with your general knowledge.

Context:
{context}

Question: {query}

Provide a clear, concise answer in 2-4 sentences."""
    return await ask_llm(prompt)


async def generate_recommendations(financial_summary: dict) -> str:
    """Generate AI-powered financial recommendations."""
    prompt = f"""Based on this user's financial profile, provide 4 specific, actionable recommendations.
Format each as a bullet point starting with an emoji.

Financial Profile:
- Balance: ₹{financial_summary.get('balance', 0):,.0f}
- Monthly Income: ₹{financial_summary.get('monthly_income', 0):,.0f}
- Monthly Expense: ₹{financial_summary.get('monthly_expense', 0):,.0f}
- Savings Rate: {financial_summary.get('savings_rate', 0)}%
- Health Score: {financial_summary.get('health_score', 0)}/100
- Pending EMIs: {financial_summary.get('pending_emis', 0)}
- Active SIPs: {financial_summary.get('active_sips', 0)}
- Fraud Alerts: {financial_summary.get('fraud_alerts', 0)}

Give specific ₹ amounts and percentages where relevant."""

    return await ask_llm(prompt)
