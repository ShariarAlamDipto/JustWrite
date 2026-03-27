-- ─── Finance Tracker Tables ───────────────────────────────────────────────────
-- Idempotent migration: safe to re-run whether tables exist or not.

-- ── Create tables (skips if already exist) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS finance_days (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date            DATE        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'open',
  start_spendable NUMERIC(14,2) NOT NULL DEFAULT 0,
  end_spendable   NUMERIC(14,2),
  start_reserve   NUMERIC(14,2) NOT NULL DEFAULT 0,
  end_reserve     NUMERIC(14,2),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS finance_txns (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id     UUID        NOT NULL REFERENCES finance_days(id) ON DELETE CASCADE,
  kind       TEXT        NOT NULL,
  amount     NUMERIC(14,2) NOT NULL,
  category   TEXT,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Add missing columns if upgrading from an older schema ────────────────────

-- (none needed for V1 → V1.1 upgrade)

-- ── Constraints: drop old then re-add so re-runs are safe ────────────────────

-- finance_days: status allowed values
ALTER TABLE finance_days DROP CONSTRAINT IF EXISTS finance_days_status_check;
ALTER TABLE finance_days ADD  CONSTRAINT finance_days_status_check
  CHECK (status IN ('open', 'closed'));

-- finance_days: non-negative balances
ALTER TABLE finance_days DROP CONSTRAINT IF EXISTS finance_days_start_spendable_nn;
ALTER TABLE finance_days ADD  CONSTRAINT finance_days_start_spendable_nn
  CHECK (start_spendable >= 0);

ALTER TABLE finance_days DROP CONSTRAINT IF EXISTS finance_days_start_reserve_nn;
ALTER TABLE finance_days ADD  CONSTRAINT finance_days_start_reserve_nn
  CHECK (start_reserve >= 0);

ALTER TABLE finance_days DROP CONSTRAINT IF EXISTS finance_days_end_spendable_nn;
ALTER TABLE finance_days ADD  CONSTRAINT finance_days_end_spendable_nn
  CHECK (end_spendable IS NULL OR end_spendable >= 0);

ALTER TABLE finance_days DROP CONSTRAINT IF EXISTS finance_days_end_reserve_nn;
ALTER TABLE finance_days ADD  CONSTRAINT finance_days_end_reserve_nn
  CHECK (end_reserve IS NULL OR end_reserve >= 0);

-- finance_days: notes length cap
ALTER TABLE finance_days DROP CONSTRAINT IF EXISTS finance_days_notes_length;
ALTER TABLE finance_days ADD  CONSTRAINT finance_days_notes_length
  CHECK (notes IS NULL OR char_length(notes) <= 2000);

-- finance_txns: kind allowed values
ALTER TABLE finance_txns DROP CONSTRAINT IF EXISTS finance_txns_kind_check;
ALTER TABLE finance_txns ADD  CONSTRAINT finance_txns_kind_check
  CHECK (kind IN ('income', 'expense'));

-- finance_txns: amount must be positive
ALTER TABLE finance_txns DROP CONSTRAINT IF EXISTS finance_txns_amount_check;
ALTER TABLE finance_txns ADD  CONSTRAINT finance_txns_amount_check
  CHECK (amount > 0);

-- finance_txns: category and note length caps
ALTER TABLE finance_txns DROP CONSTRAINT IF EXISTS finance_txns_category_length;
ALTER TABLE finance_txns ADD  CONSTRAINT finance_txns_category_length
  CHECK (category IS NULL OR char_length(category) <= 100);

ALTER TABLE finance_txns DROP CONSTRAINT IF EXISTS finance_txns_note_length;
ALTER TABLE finance_txns ADD  CONSTRAINT finance_txns_note_length
  CHECK (note IS NULL OR char_length(note) <= 500);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS finance_days_user_date
  ON finance_days(user_id, date DESC);

-- Replace simple day_id index with a covering index (avoids heap lookups on
-- the nested txn fetch in GET /days which reads kind/amount/category/note/created_at)
DROP INDEX IF EXISTS finance_txns_day;
DROP INDEX IF EXISTS finance_txns_user;

CREATE INDEX IF NOT EXISTS finance_txns_day_covering
  ON finance_txns(day_id)
  INCLUDE (kind, amount, category, note, created_at);

-- ── Auto-update updated_at trigger ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_finance_days_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_days_updated_at ON finance_days;
CREATE TRIGGER finance_days_updated_at
  BEFORE UPDATE ON finance_days
  FOR EACH ROW EXECUTE FUNCTION update_finance_days_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Split per-operation policies with explicit WITH CHECK on INSERT/UPDATE.
-- FOR ALL without WITH CHECK silently omits the new-row check on INSERT —
-- the USING expression only applies to SELECT/UPDATE/DELETE.
-- (SELECT auth.uid()) evaluates auth once per statement instead of per row.

ALTER TABLE finance_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_txns  ENABLE ROW LEVEL SECURITY;

-- finance_days
DROP POLICY IF EXISTS "finance_days_owner"  ON finance_days;
DROP POLICY IF EXISTS "finance_days_select" ON finance_days;
DROP POLICY IF EXISTS "finance_days_insert" ON finance_days;
DROP POLICY IF EXISTS "finance_days_update" ON finance_days;
DROP POLICY IF EXISTS "finance_days_delete" ON finance_days;

CREATE POLICY "finance_days_select" ON finance_days
  FOR SELECT USING      ((SELECT auth.uid()) = user_id);

CREATE POLICY "finance_days_insert" ON finance_days
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "finance_days_update" ON finance_days
  FOR UPDATE
  USING      ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "finance_days_delete" ON finance_days
  FOR DELETE USING      ((SELECT auth.uid()) = user_id);

-- finance_txns
DROP POLICY IF EXISTS "finance_txns_owner"  ON finance_txns;
DROP POLICY IF EXISTS "finance_txns_select" ON finance_txns;
DROP POLICY IF EXISTS "finance_txns_insert" ON finance_txns;
DROP POLICY IF EXISTS "finance_txns_update" ON finance_txns;
DROP POLICY IF EXISTS "finance_txns_delete" ON finance_txns;

CREATE POLICY "finance_txns_select" ON finance_txns
  FOR SELECT USING      ((SELECT auth.uid()) = user_id);

CREATE POLICY "finance_txns_insert" ON finance_txns
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "finance_txns_update" ON finance_txns
  FOR UPDATE
  USING      ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "finance_txns_delete" ON finance_txns
  FOR DELETE USING      ((SELECT auth.uid()) = user_id);
