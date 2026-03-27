-- ─── Finance Tracker Tables ───────────────────────────────────────────────────
-- Journal-style finance: Start/End balance per day + optional income/expense logs

-- DayLog: one row per user per calendar date
CREATE TABLE IF NOT EXISTS finance_days (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'open',       -- 'open' | 'closed'
  start_spendable  DECIMAL(14,2) NOT NULL DEFAULT 0,
  end_spendable    DECIMAL(14,2),
  start_reserve    DECIMAL(14,2) NOT NULL DEFAULT 0,
  end_reserve      DECIMAL(14,2),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Transactions: income or expense entries attached to a day
CREATE TABLE IF NOT EXISTS finance_txns (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id       UUID NOT NULL REFERENCES finance_days(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
  amount       DECIMAL(14,2) NOT NULL CHECK (amount > 0),
  category     TEXT,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS finance_days_user_date ON finance_days(user_id, date DESC);
CREATE INDEX IF NOT EXISTS finance_txns_day ON finance_txns(day_id);
CREATE INDEX IF NOT EXISTS finance_txns_user ON finance_txns(user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_finance_days_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS finance_days_updated_at ON finance_days;
CREATE TRIGGER finance_days_updated_at
  BEFORE UPDATE ON finance_days
  FOR EACH ROW EXECUTE FUNCTION update_finance_days_updated_at();

-- Row Level Security
ALTER TABLE finance_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_txns  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_days_owner" ON finance_days;
CREATE POLICY "finance_days_owner" ON finance_days
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "finance_txns_owner" ON finance_txns;
CREATE POLICY "finance_txns_owner" ON finance_txns
  FOR ALL USING (user_id = auth.uid());
