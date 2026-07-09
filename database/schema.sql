-- FILE: schema.sql
-- FinMind AI — PostgreSQL Schema
-- Run: psql -U finmind -d finmind_db -f schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    uuid          UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) UNIQUE NOT NULL,
    mobile        VARCHAR(20),
    password_hash TEXT NOT NULL,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Accounts ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
    account_no    VARCHAR(20) UNIQUE NOT NULL,
    account_type  VARCHAR(30) DEFAULT 'savings',
    balance       NUMERIC(15, 2) DEFAULT 0.00,
    currency      VARCHAR(5) DEFAULT 'INR',
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Transactions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
    id            SERIAL PRIMARY KEY,
    account_id    INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    type          VARCHAR(20) NOT NULL CHECK (type IN ('deposit','withdraw','transfer')),
    amount        NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    sender        VARCHAR(100),
    receiver      VARCHAR(100),
    message       TEXT,
    category      VARCHAR(50) DEFAULT 'General',
    date          DATE NOT NULL DEFAULT CURRENT_DATE,
    fraud_score   FLOAT DEFAULT 0.0,
    fraud_flags   JSONB DEFAULT '[]'::jsonb,
    is_flagged    BOOLEAN DEFAULT FALSE,
    status        VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','blocked','warning')),
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_is_flagged ON transactions(is_flagged);
CREATE INDEX idx_transactions_status ON transactions(status);

-- ─── Reminders ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminders (
    rid               SERIAL PRIMARY KEY,
    user_id           INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type              VARCHAR(50) NOT NULL,
    task              TEXT NOT NULL,
    date              DATE NOT NULL,
    time              TIME NOT NULL,
    amount            NUMERIC(12, 2) DEFAULT 0.00,
    status            VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','done','cancelled')),
    related_to        TEXT,
    notify_before_min INTEGER DEFAULT 60,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_date ON reminders(date);
CREATE INDEX idx_reminders_status ON reminders(status);

-- ─── OTP Sessions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_sessions (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    otp         VARCHAR(6) NOT NULL,
    action      VARCHAR(50) NOT NULL,
    payload     JSONB DEFAULT '{}'::jsonb,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Fraud Logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fraud_logs (
    id              SERIAL PRIMARY KEY,
    transaction_id  INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    rule_id         VARCHAR(10),
    rule_desc       TEXT,
    severity        VARCHAR(10) CHECK (severity IN ('low','medium','high')),
    ml_score        FLOAT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Seed Demo Data ──────────────────────────────────────────────────────────
INSERT INTO users (name, email, mobile, password_hash)
VALUES ('Demo User', 'demo@finmind.ai', '+919987568547',
        '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW')  -- password: secret
ON CONFLICT DO NOTHING;

INSERT INTO accounts (user_id, account_no, balance)
VALUES (1, '12345678901', 217000.00)
ON CONFLICT DO NOTHING;