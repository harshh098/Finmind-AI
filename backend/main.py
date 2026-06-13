# FILE: backend/main.py
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import os 
import uvicorn


from config import settings
from database import create_tables
from rag.vector_store import rag_store
from routers import auth, banking, reminders, agent, fraud, transactions, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 FinMind AI starting up...")

    # Register all models with Base.metadata
    from models import user, transaction, reminder, security_question  # noqa
    # Beneficiary is defined in models.transaction — already imported above

    # Create DB tables (includes beneficiaries)
    try:
        await create_tables()
        print("✅ Database tables ready")
    except Exception as e:
        print(f"⚠️  DB init error: {e}")

    # Seed 6 demo users (only if DB is empty)
    try:
        from services.seed_service import seed_demo_users
        await seed_demo_users()
    except Exception as e:
        print(f"⚠️  Seed error: {e}")

    # Initialize RAG (FAISS)
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, rag_store.initialize)
        print("✅ RAG (FAISS) initialized")
    except Exception as e:
        print(f"⚠️  RAG init error: {e}")

    # Pre-warm Isolation Forest ML model
    try:
        from services.fraud_service import _if_model
        from sqlalchemy import select
        from models.transaction import Transaction
        from database import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Transaction).limit(300))
            txs = result.scalars().all()
            if len(txs) >= 5:
                tx_dicts = [
                    {"id": t.id, "type": t.type, "amount": float(t.amount),
                     "date": str(t.date), "created_at": t.created_at}
                    for t in txs
                ]
                trained = _if_model.train(tx_dicts)
                if trained:
                    print(f"✅ ML Isolation Forest initialized ({len(tx_dicts)} samples)")
                else:
                    print("⚠️  ML model needs 5+ transactions to train")
            else:
                print(f"⚠️  ML model skipped — only {len(txs)} transactions in DB")
    except Exception as e:
        print(f"⚠️  ML init error: {e}")

    yield
    print("👋 FinMind AI shutting down...")


app = FastAPI(
    title="FinMind AI Banking API",
    description="Agentic AI Banking Assistant — LangGraph + Groq + FAISS + FastAPI",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Routers
app.include_router(auth.router)
app.include_router(banking.router)
app.include_router(reminders.router)
app.include_router(agent.router)
app.include_router(fraud.router)
app.include_router(transactions.router)
app.include_router(analytics.router)


@app.get("/", tags=["Health"])
async def root():
    return {"app": "FinMind AI Banking Assistant", "version": "2.0.0", "status": "running"}


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy", "rag": rag_store._initialized, "database": "connected"}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=settings.debug, workers=1)