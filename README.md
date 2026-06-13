# FinMind AI — Agentic Banking Assistant

A production-grade **Agentic AI Banking Assistant** built with LangGraph, Groq Llama 3.1, FAISS RAG, FastAPI, Next.js, and PostgreSQL.

---

## 🚀 Features

| Category | Features |
|---|---|
| **AI Agent** | LangGraph StateGraph, tool-calling, multi-step reasoning, intent routing |
| **RAG** | FAISS vector store, all-MiniLM-L6-v2 embeddings, 6-file banking KB |
| **LLM** | Groq Llama 3.1 8B Instant (fast inference) |
| **Fraud Detection** | Rule engine (5 rules) + Isolation Forest ML anomaly detection |
| **Expense Analytics** | Category breakdown, budget tracking, monthly trends |
| **Auth** | JWT tokens + Twilio OTP for transaction verification |
| **Dashboard** | Balance cards, cash flow chart, spending donut, health score |
| **Reminders** | EMI, SIP, insurance, FD maturity — with SMS notifications |
| **Frontend** | Next.js 14, Tailwind CSS, Recharts, Framer Motion, Zustand |
| **Backend** | FastAPI async, SQLAlchemy 2.0, asyncpg, Alembic migrations |
| **Database** | PostgreSQL 16 with full schema |

---

## 📁 Project Structure

```
banking_assistant/
├── frontend/                    # Next.js 14 App
│   ├── app/
│   │   ├── page.tsx             # Dashboard
│   │   ├── accounts/            # Account management + OTP transfers
│   │   ├── transactions/        # Full transaction table + analytics
│   │   ├── ai-assistant/        # LangGraph chat interface
│   │   ├── expense-tracker/     # Budget tracking + category analysis
│   │   ├── fraud-detection/     # ML fraud alerts + rule engine
│   │   ├── financial-insights/  # Health score, goals, tips
│   │   ├── reminders/           # EMI/SIP/insurance reminders
│   │   └── settings/            # Profile, security, AI config
│   ├── components/
│   │   ├── ui/                  # Card, Pill, MetricCard, Charts, HealthScore
│   │   ├── layout/              # Sidebar, Header
│   │   ├── dashboard/           # Dashboard section components
│   │   ├── ai/                  # ChatPanel, AgentWorkflow, ArchitecturePanel
│   │   ├── transactions/        # TransactionTable
│   │   ├── expense/             # BudgetTracker, MonthlyTrends
│   │   ├── fraud/               # AlertsList, RulesPanel
│   │   └── reminders/           # ReminderCard
│   ├── hooks/                   # useBalance, useTransactions, useFraud, useChat
│   ├── lib/                     # api.ts (Axios), store.ts (Zustand), utils.ts
│   └── styles/globals.css
│
├── backend/                     # FastAPI
│   ├── main.py                  # App entry, lifespan, CORS
│   ├── config.py                # Pydantic settings
│   ├── database.py              # SQLAlchemy async engine
│   ├── agents/
│   │   ├── graph.py             # LangGraph StateGraph
│   │   ├── nodes.py             # Node functions
│   │   ├── state.py             # AgentState TypedDict
│   │   └── tools.py             # LangChain tool definitions
│   ├── routers/
│   │   ├── auth.py              # JWT register/login
│   │   ├── banking.py           # balance/transfer/withdraw/deposit
│   │   ├── reminders.py         # CRUD reminders
│   │   ├── transactions.py      # analytics endpoints
│   │   ├── agent.py             # LangGraph query endpoint
│   │   └── fraud.py             # fraud report/rules/stats
│   ├── services/
│   │   ├── auth_service.py      # JWT + bcrypt
│   │   ├── otp_service.py       # Twilio OTP
│   │   ├── fraud_service.py     # Rule engine + Isolation Forest
│   │   ├── expense_service.py   # Spend analytics
│   │   ├── llm_service.py       # Groq LLM wrapper
│   │   └── reminder_service.py  # Scheduling + SMS
│   ├── ml/
│   │   ├── fraud_model.py       # Isolation Forest trainer + persistence
│   │   └── feature_engineering.py
│   ├── rag/
│   │   ├── loader.py            # Q&A text file loader
│   │   ├── vector_store.py      # FAISS index management
│   │   └── LLM_RAG_DATASET/     # 6 banking knowledge files
│   ├── models/                  # SQLAlchemy ORM models
│   ├── alembic/                 # DB migrations
│   └── requirements.txt
│
├── database/schema.sql          # PostgreSQL DDL
├── docker-compose.yml
└── .env.example
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 16
- Groq API key
- Twilio account (for OTP)

### 1. Clone & configure

```bash
git clone <repo-url> banking_assistant
cd banking_assistant
cp .env.example .env
# Edit .env with your API keys
```

### 2. Database

```bash
# Option A: Docker
docker-compose up -d postgres

# Option B: Local PostgreSQL
createdb finmind_db
psql -U postgres -d finmind_db -f database/schema.sql
```

### 3. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start server
uvicorn main:app --reload --port 8000
```

Backend will be live at: `http://localhost:8000`
API docs: `http://localhost:8000/docs`

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will be live at: `http://localhost:3000`

### 5. Full Docker stack

```bash
docker-compose up --build
```

---

## 🔑 Environment Variables

```env
# LLM (required)
GROQ_API_KEY=gsk_...

# Twilio OTP (required for transfers)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE=+1...
USER_MOBILE=+91...

# PostgreSQL
DATABASE_URL=postgresql+asyncpg://finmind:finmind123@localhost:5432/finmind_db
SYNC_DATABASE_URL=postgresql://finmind:finmind123@localhost:5432/finmind_db

# JWT
JWT_SECRET=your-secret-key

# App
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🤖 LangGraph Agent Flow

```
User Query
    │
    ▼
[detect_intent]
    │
    ├─ "balance/transfer/withdraw" ──► [banking_node]   → FastAPI
    ├─ "fraud/suspicious"          ──► [fraud_node]     → Isolation Forest + Rules
    ├─ "expense/spend/budget"      ──► [expense_node]   → Analytics Engine
    ├─ "remind/emi/sip"            ──► [reminder_node]  → Reminder Store
    ├─ "what is/explain/define"    ──► [rag_node]       → FAISS → LLM fallback
    ├─ "advice/recommend"          ──► [advisory_node]  → Groq Llama 3.1
    └─ general                     ──► [general_llm]    → Groq Llama 3.1
    │
    ▼
Structured JSON Response
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get JWT token |
| GET  | `/banking/balance` | Account balance |
| GET  | `/banking/transactions` | Transaction list |
| POST | `/banking/transfer/initiate` | Send OTP for transfer |
| POST | `/banking/transfer/verify` | Verify OTP + execute |
| POST | `/banking/withdraw/initiate` | Send OTP for withdrawal |
| POST | `/banking/withdraw/verify` | Verify OTP + execute |
| POST | `/banking/deposit` | Deposit funds |
| POST | `/agent/query` | LangGraph AI query |
| GET  | `/fraud/report` | Full fraud analysis |
| GET  | `/fraud/rules` | Fraud rule definitions |
| GET  | `/reminders/` | List reminders |
| POST | `/reminders/` | Create reminder |
| PUT  | `/reminders/{rid}` | Update reminder |
| DELETE | `/reminders/{rid}` | Delete reminder |
| GET  | `/transactions/expense-analysis` | Expense breakdown |
| GET  | `/transactions/monthly` | Monthly trends |

---

## 🛡 Fraud Detection

**Rule Engine (5 rules):**
- F001: Large transfer > ₹8,000
- F002: Multiple transfers same recipient same day
- F003: Unusual hour (11 PM – 5 AM)
- F004: New recipient with large amount
- F005: Round-number transfer > ₹5,000

**ML Model:**
- Algorithm: Isolation Forest (scikit-learn)
- Contamination: 10%
- Features: amount, log_amount, z_score, type, hour, is_odd_hour, is_round, is_new_recipient, daily_count
- Auto-trained on startup, persisted to disk

---

## 📚 RAG Knowledge Base

6 text files with Q&A pairs covering:
- `banking_faq` — NEFT, RTGS, UPI, IMPS, IFSC
- `account_info_explainer` — Account types, KYC, nominee
- `financial_advice_basic` — SIP, FD, RD, ELSS, tax saving
- `loan_faq` — Eligibility, EMI, CIBIL score
- `policies_and_rules` — Banking regulations
- `security_fraud_info` — Fraud prevention, OTP, phishing

---

## 📄 License

MIT License — Open Source
