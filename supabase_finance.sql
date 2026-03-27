-- ─── Finance Tracker Tables ───────────────────────────────────────────────────
-- Journal-style finance: Start/End balance per day + optional income/expense logs

-- DayLog: one row per user per calendar date
CREATE TABLE IF NOT EXISTS finance_days (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  -- status constrained to allowed values only (no arbitrary strings)
  status           TEXT NOT NULL DEFAULT 'open'
                     CONSTRAINT finance_days_status_check CHECK (status IN ('open', 'closed')),
  start_spendable  NUMERIC(14,2) NOT NULL DEFAULT 0
                     CONSTRAINT finance_days_start_spendable_nn CHECK (start_spendable >= 0),
  end_spendable    NUMERIC(14,2)
                     CONSTRAINT finance_days_end_spendable_nn   CHECK (end_spendable IS NULL OR end_spendable >= 0),
  start_reserve    NUMERIC(14,2) NOT NULL DEFAULT 0
                     CONSTRAINT finance_days_start_reserve_nn   CHECK (start_reserve >= 0),
  end_reserve      NUMERIC(14,2)
                     CONSTRAINT finance_days_end_reserve_nn     CHECK (end_reserve IS NULL OR end_reserve >= 0),
  -- notes bounded to prevent unbounded storage
  notes            TEXT CONSTRAINT finance_days_notes_length CHECK (notes IS NULL OR char_length(notes) <= 2000),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Transactions: income or expense entries attached to a day
CREATE TABLE IF NOT EXISTS finance_txns (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Cascades: deleting a day permanently removes all its transactions
  day_id       UUID NOT NULL REFERENCES finance_days(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
  amount       NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  category     TEXT CONSTRAINT finance_txns_category_length CHECK (category IS NULL OR char_length(category) <= 100),
  note         TEXT CONSTRAINT finance_txns_note_length     CHECK (note IS NULL OR char_length(note) <= 500),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS finance_days_user_date ON finance_days(user_id, date DESC);

-- Covering index for the nested txn fetch in GET /days (avoids heap lookups)
DROP INDEX IF EXISTS finance_txns_day;
DROP INDEX IF EXISTS finance_txns_user;
CREATE INDEX IF NOT EXISTS finance_txns_day_covering
  ON finance_txns(day_id)
  INCLUDE (kind, amount, category, note, created_at);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_finance_days_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS finance_days_updated_at ON finance_days;
CREATE TRIGGER finance_days_updated_at
  BEFORE UPDATE ON finance_days
  FOR EACH ROW EXECUTE FUNCTION update_finance_days_updated_at();

-- ─── Row Level Security ────────────────────────────────────────────────────────
-- Split per-operation policies so INSERT rows are guarded by WITH CHECK
-- (FOR ALL without WITH CHECK only applies USING to SELECT/UPDATE/DELETE,
--  not to the new values being inserted — a critical RLS gap).
-- Uses (SELECT auth.uid()) to evaluate once per query, not once per row.

ALTER TABLE finance_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_txns  ENABLE ROW LEVEL SECURITY;

-- finance_days policies
DROP POLICY IF EXISTS "finance_days_owner"  ON finance_days;
DROP POLICY IF EXISTS "finance_days_select" ON finance_days;
DROP POLICY IF EXISTS "finance_days_insert" ON finance_days;
DROP POLICY IF EXISTS "finance_days_update" ON finance_days;
DROP POLICY IF EXISTS "finance_days_delete" ON finance_days;

CREATE POLICY "finance_days_select" ON finance_days
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "finance_days_insert" ON finance_days
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "finance_days_update" ON finance_days
  FOR UPDATE
  USING     ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "finance_days_delete" ON finance_days
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- finance_txns policies
DROP POLICY IF EXISTS "finance_txns_owner"  ON finance_txns;
DROP POLICY IF EXISTS "finance_txns_select" ON finance_txns;
DROP POLICY IF EXISTS "finance_txns_insert" ON finance_txns;
DROP POLICY IF EXISTS "finance_txns_update" ON finance_txns;
DROP POLICY IF EXISTS "finance_txns_delete" ON finance_txns;

CREATE POLICY "finance_txns_select" ON finance_txns
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "finance_txns_insert" ON finance_txns
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "finance_txns_update" ON finance_txns
  FOR UPDATE
  USING     ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "finance_txns_delete" ON finance_txns
  FOR DELETE USING ((SELECT auth.uid()) = user_id);
