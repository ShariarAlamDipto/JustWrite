-- ============================================================================
-- JustWrite — COMPLETE DATABASE BOOTSTRAP
-- ============================================================================
-- Paste this whole file into: Supabase Dashboard > SQL Editor > New Query > Run
--
-- Creates every table, index, trigger, RLS policy and helper function the app
-- needs, in dependency order. Fully idempotent — safe to re-run.
--
-- This file SUPERSEDES all of these (you do not need to run them):
--   supabase_add_columns.sql       supabase_custom_prompts.sql
--   supabase_notes_graph.sql       supabase_justwrite_redesign.sql
--   supabase_voice_entries.sql     supabase_security.sql
--   supabase_finance.sql
--
-- NOTE ON user_id TYPES (intentional — do not "fix"):
--   entries.user_id and tasks.user_id are TEXT  -> policies use auth.uid()::text
--   every other table's user_id is UUID         -> policies use auth.uid()
-- This mirrors the original production schema, which the app code and the
-- entry_keywords policy both depend on. Changing it breaks them.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. NOTES  (first: entries.converted_to_note_id references it)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL DEFAULT 'Untitled',
  icon            TEXT,
  cover_url       TEXT,
  blocks          JSONB NOT NULL DEFAULT '[]'::jsonb,
  parent_id       UUID REFERENCES notes(id) ON DELETE SET NULL,
  is_locked       BOOLEAN NOT NULL DEFAULT false,
  is_pinned       BOOLEAN NOT NULL DEFAULT false,
  is_private      BOOLEAN NOT NULL DEFAULT false,
  tags            JSONB NOT NULL DEFAULT '[]'::jsonb,
  segment         TEXT NOT NULL DEFAULT 'notes',
  word_count      INTEGER NOT NULL DEFAULT 0,
  source          TEXT NOT NULL DEFAULT 'typed' CHECK (source IN ('typed', 'voice')),
  linked_note_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id     ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_parent ON notes(user_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_pinned ON notes(user_id, is_pinned);
CREATE INDEX IF NOT EXISTS idx_notes_created_at  ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_tags        ON notes USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_notes_private     ON notes(user_id, is_private);

-- ============================================================================
-- 2. ENTRIES   (user_id is TEXT — see header note)
-- ============================================================================

CREATE TABLE IF NOT EXISTS entries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              TEXT NOT NULL,
  content              TEXT NOT NULL DEFAULT '',
  title                TEXT,
  summary              TEXT,
  mood                 INTEGER DEFAULT 5 CHECK (mood IS NULL OR (mood BETWEEN 1 AND 10)),
  mood_intensity       INTEGER DEFAULT 5 CHECK (mood_intensity IS NULL OR (mood_intensity BETWEEN 1 AND 10)),
  source               TEXT NOT NULL DEFAULT 'text',
  gratitude            JSONB DEFAULT '[]'::jsonb,
  prompt_answers       JSONB DEFAULT '{}'::jsonb,
  ai_metadata          JSONB,
  is_locked            BOOLEAN NOT NULL DEFAULT false,
  is_private           BOOLEAN NOT NULL DEFAULT false,
  type                 TEXT NOT NULL DEFAULT 'journal' CHECK (type IN ('journal', 'idea', 'voice')),
  tags                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  word_count           INTEGER NOT NULL DEFAULT 0,
  converted_to_note_id UUID REFERENCES notes(id) ON DELETE SET NULL,
  voice_transcript_id  UUID,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entries_user_id        ON entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_created_at     ON entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_user_created   ON entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_is_locked      ON entries(user_id, is_locked);
CREATE INDEX IF NOT EXISTS idx_entries_type           ON entries(user_id, type);
CREATE INDEX IF NOT EXISTS idx_entries_private        ON entries(user_id, is_private);
CREATE INDEX IF NOT EXISTS idx_entries_tags           ON entries USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_entries_content_search ON entries USING GIN (to_tsvector('english', content));

-- ============================================================================
-- 3. TASKS   (user_id is TEXT — see header note)
-- ============================================================================
-- 'urgent' IS allowed in the priority check. src/lib/security.ts sanitizePriority()
-- and src/pages/api/distill.ts both emit it, but the old schema only allowed
-- low/medium/high — so every AI-distilled "urgent" task failed to insert.

CREATE TABLE IF NOT EXISTS tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL,
  entry_id     UUID REFERENCES entries(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  priority     TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status       TEXT NOT NULL DEFAULT 'todo'   CHECK (status   IN ('todo', 'in_progress', 'done')),
  if_then_plan TEXT,
  due_date     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id      ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_entry_id     ON tasks(entry_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status       ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status  ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_created ON tasks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date     ON tasks(due_date) WHERE due_date IS NOT NULL;

-- ============================================================================
-- 4. VOICE ENTRIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS voice_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  audio_url      TEXT,
  audio_duration INTEGER,
  transcript     TEXT,
  metadata       JSONB DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voice_entries_user_id_idx    ON voice_entries(user_id);
CREATE INDEX IF NOT EXISTS voice_entries_created_at_idx ON voice_entries(created_at DESC);

-- ============================================================================
-- 5. GRAPH: keywords, join tables, content links, note links
-- ============================================================================

CREATE TABLE IF NOT EXISTS keywords (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, word)
);

CREATE INDEX IF NOT EXISTS idx_keywords_user_id ON keywords(user_id);

CREATE TABLE IF NOT EXISTS entry_keywords (
  entry_id   UUID NOT NULL REFERENCES entries(id)  ON DELETE CASCADE,
  keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, keyword_id)
);

CREATE INDEX IF NOT EXISTS idx_entry_keywords_entry   ON entry_keywords(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_keywords_keyword ON entry_keywords(keyword_id);

CREATE TABLE IF NOT EXISTS note_keywords (
  note_id    UUID NOT NULL REFERENCES notes(id)    ON DELETE CASCADE,
  keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, keyword_id)
);

CREATE INDEX IF NOT EXISTS idx_note_keywords_note    ON note_keywords(note_id);
CREATE INDEX IF NOT EXISTS idx_note_keywords_keyword ON note_keywords(keyword_id);

CREATE TABLE IF NOT EXISTS content_links (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_type  TEXT NOT NULL CHECK (from_type IN ('entry', 'note', 'voice')),
  from_id    UUID NOT NULL,
  to_type    TEXT NOT NULL CHECK (to_type   IN ('entry', 'note', 'voice', 'task', 'keyword')),
  to_id      UUID NOT NULL,
  link_type  TEXT NOT NULL CHECK (link_type IN ('similar', 'mention', 'wikilink', 'extracted')),
  weight     FLOAT NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_links_user_id ON content_links(user_id);
CREATE INDEX IF NOT EXISTS idx_content_links_from_id ON content_links(from_id);
CREATE INDEX IF NOT EXISTS idx_content_links_to_id   ON content_links(to_id);

CREATE TABLE IF NOT EXISTS note_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  to_note_id   UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  context      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_note_id, to_note_id)
);

CREATE INDEX IF NOT EXISTS idx_note_links_user ON note_links(user_id);
CREATE INDEX IF NOT EXISTS idx_note_links_from ON note_links(from_note_id);
CREATE INDEX IF NOT EXISTS idx_note_links_to   ON note_links(to_note_id);

-- ============================================================================
-- 6. TAGS, PRIVACY UNLOCKS, CUSTOM PROMPTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  segment    TEXT CHECK (segment IS NULL OR segment IN ('journal', 'ideas', 'notes')),
  use_count  INTEGER NOT NULL DEFAULT 1,
  last_used  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_user    ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_segment ON tags(user_id, segment);
CREATE INDEX IF NOT EXISTS idx_tags_count   ON tags(user_id, use_count DESC);

CREATE TABLE IF NOT EXISTS privacy_unlocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id   UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('entry', 'note')),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_privacy_unlocks_user   ON privacy_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_unlocks_target ON privacy_unlocks(user_id, target_id);

CREATE TABLE IF NOT EXISTS custom_prompts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  category   VARCHAR(50) DEFAULT 'custom',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT text_length CHECK (char_length(text) >= 5 AND char_length(text) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_custom_prompts_user ON custom_prompts(user_id);

-- ============================================================================
-- 7. FINANCE TRACKER
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_days (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open',
  start_spendable NUMERIC(14,2) NOT NULL DEFAULT 0,
  end_spendable   NUMERIC(14,2),
  start_reserve   NUMERIC(14,2) NOT NULL DEFAULT 0,
  end_reserve     NUMERIC(14,2),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS finance_txns (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id     UUID NOT NULL REFERENCES finance_days(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  amount     NUMERIC(14,2) NOT NULL,
  category   TEXT,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE finance_days DROP CONSTRAINT IF EXISTS finance_days_status_check;
ALTER TABLE finance_days ADD  CONSTRAINT finance_days_status_check
  CHECK (status IN ('open', 'closed'));

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

ALTER TABLE finance_days DROP CONSTRAINT IF EXISTS finance_days_notes_length;
ALTER TABLE finance_days ADD  CONSTRAINT finance_days_notes_length
  CHECK (notes IS NULL OR char_length(notes) <= 2000);

ALTER TABLE finance_txns DROP CONSTRAINT IF EXISTS finance_txns_kind_check;
ALTER TABLE finance_txns ADD  CONSTRAINT finance_txns_kind_check
  CHECK (kind IN ('income', 'expense', 'to_reserve', 'from_reserve'));

ALTER TABLE finance_txns DROP CONSTRAINT IF EXISTS finance_txns_amount_check;
ALTER TABLE finance_txns ADD  CONSTRAINT finance_txns_amount_check
  CHECK (amount > 0);

ALTER TABLE finance_txns DROP CONSTRAINT IF EXISTS finance_txns_category_length;
ALTER TABLE finance_txns ADD  CONSTRAINT finance_txns_category_length
  CHECK (category IS NULL OR char_length(category) <= 100);

ALTER TABLE finance_txns DROP CONSTRAINT IF EXISTS finance_txns_note_length;
ALTER TABLE finance_txns ADD  CONSTRAINT finance_txns_note_length
  CHECK (note IS NULL OR char_length(note) <= 1000);

CREATE INDEX IF NOT EXISTS finance_days_user_date    ON finance_days(user_id, date DESC);
CREATE INDEX IF NOT EXISTS finance_txns_day_covering ON finance_txns(day_id, created_at DESC);
CREATE INDEX IF NOT EXISTS finance_txns_user_idx     ON finance_txns(user_id);

-- ============================================================================
-- 8. TRIGGERS: auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_entries_updated_at ON entries;
CREATE TRIGGER set_entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_tasks_updated_at ON tasks;
CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS notes_updated_at ON notes;
CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS voice_entries_updated_at ON voice_entries;
CREATE TRIGGER voice_entries_updated_at
  BEFORE UPDATE ON voice_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS finance_days_updated_at ON finance_days;
CREATE TRIGGER finance_days_updated_at
  BEFORE UPDATE ON finance_days
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE entries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords        ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_keywords  ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_keywords   ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_links   ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_links      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags            ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_prompts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_days    ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_txns    ENABLE ROW LEVEL SECURITY;

-- ---- entries (TEXT user_id) -------------------------------------------------
DROP POLICY IF EXISTS "Users can view own entries"   ON entries;
DROP POLICY IF EXISTS "Users can insert own entries" ON entries;
DROP POLICY IF EXISTS "Users can update own entries" ON entries;
DROP POLICY IF EXISTS "Users can delete own entries" ON entries;

CREATE POLICY "Users can view own entries"
  ON entries FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own entries"
  ON entries FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own entries"
  ON entries FOR UPDATE USING (auth.uid()::text = user_id)
                        WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own entries"
  ON entries FOR DELETE USING (auth.uid()::text = user_id);

-- ---- tasks (TEXT user_id) ---------------------------------------------------
DROP POLICY IF EXISTS "Users can view own tasks"   ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE USING (auth.uid()::text = user_id)
                      WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE USING (auth.uid()::text = user_id);

-- ---- notes ------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own notes"   ON notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;

CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes"
  ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE USING (auth.uid() = user_id);

-- ---- voice_entries ----------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own voice entries"   ON voice_entries;
DROP POLICY IF EXISTS "Users can create own voice entries" ON voice_entries;
DROP POLICY IF EXISTS "Users can update own voice entries" ON voice_entries;
DROP POLICY IF EXISTS "Users can delete own voice entries" ON voice_entries;

CREATE POLICY "Users can view own voice entries"
  ON voice_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own voice entries"
  ON voice_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own voice entries"
  ON voice_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own voice entries"
  ON voice_entries FOR DELETE USING (auth.uid() = user_id);

-- ---- keywords ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own keywords" ON keywords;
CREATE POLICY "Users can manage own keywords"
  ON keywords FOR ALL USING (auth.uid() = user_id)
                      WITH CHECK (auth.uid() = user_id);

-- ---- entry_keywords (joins to entries.user_id TEXT) -------------------------
DROP POLICY IF EXISTS "Users can manage own entry keywords" ON entry_keywords;
CREATE POLICY "Users can manage own entry keywords"
  ON entry_keywords FOR ALL
  USING (EXISTS (
    SELECT 1 FROM entries e
    WHERE e.id = entry_keywords.entry_id AND e.user_id = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM entries e
    WHERE e.id = entry_keywords.entry_id AND e.user_id = auth.uid()::text
  ));

-- ---- note_keywords ----------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own note keywords" ON note_keywords;
CREATE POLICY "Users can manage own note keywords"
  ON note_keywords FOR ALL
  USING (EXISTS (
    SELECT 1 FROM notes n
    WHERE n.id = note_keywords.note_id AND n.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM notes n
    WHERE n.id = note_keywords.note_id AND n.user_id = auth.uid()
  ));

-- ---- content_links / note_links / tags / privacy_unlocks --------------------
DROP POLICY IF EXISTS "Users can manage own content links" ON content_links;
CREATE POLICY "Users can manage own content links"
  ON content_links FOR ALL USING (auth.uid() = user_id)
                           WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own note links" ON note_links;
CREATE POLICY "Users can manage own note links"
  ON note_links FOR ALL USING (auth.uid() = user_id)
                        WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own tags" ON tags;
CREATE POLICY "Users can manage own tags"
  ON tags FOR ALL USING (auth.uid() = user_id)
                  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own unlock log" ON privacy_unlocks;
CREATE POLICY "Users can manage own unlock log"
  ON privacy_unlocks FOR ALL USING (auth.uid() = user_id)
                             WITH CHECK (auth.uid() = user_id);

-- ---- custom_prompts ---------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own prompts"   ON custom_prompts;
DROP POLICY IF EXISTS "Users can create their own prompts" ON custom_prompts;
DROP POLICY IF EXISTS "Users can delete their own prompts" ON custom_prompts;

CREATE POLICY "Users can view their own prompts"
  ON custom_prompts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own prompts"
  ON custom_prompts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own prompts"
  ON custom_prompts FOR DELETE USING (auth.uid() = user_id);

-- ---- finance ----------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own finance days" ON finance_days;
CREATE POLICY "Users can manage own finance days"
  ON finance_days FOR ALL USING (auth.uid() = user_id)
                          WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own finance txns" ON finance_txns;
CREATE POLICY "Users can manage own finance txns"
  ON finance_txns FOR ALL USING (auth.uid() = user_id)
                          WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 10. HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION upsert_keyword(p_user_id UUID, p_word TEXT)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO keywords (user_id, word)
  VALUES (p_user_id, lower(trim(p_word)))
  ON CONFLICT (user_id, word) DO NOTHING;

  SELECT id INTO v_id FROM keywords
  WHERE user_id = p_user_id AND word = lower(trim(p_word));
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION upsert_tag(p_user_id UUID, p_name TEXT, p_segment TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO tags (user_id, name, segment, use_count, last_used)
  VALUES (p_user_id, lower(trim(p_name)), p_segment, 1, now())
  ON CONFLICT (user_id, name) DO UPDATE
    SET use_count = tags.use_count + 1,
        last_used = now();

  SELECT id INTO v_id FROM tags
  WHERE user_id = p_user_id AND name = lower(trim(p_name));
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- entries.user_id is TEXT, so p_user_id is cast before comparison.
-- (The original version compared UUID to TEXT directly and raised
--  "operator does not exist: text = uuid" at runtime.)
CREATE OR REPLACE FUNCTION get_user_graph(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_nodes JSON;
  v_edges JSON;
BEGIN
  SELECT json_agg(n) INTO v_nodes FROM (
    SELECT
      id,
      title,
      'notes' AS segment,
      (SELECT COUNT(*) FROM note_links nl
        WHERE nl.from_note_id = notes.id OR nl.to_note_id = notes.id) AS degree
    FROM notes
    WHERE user_id = p_user_id
      AND (
        EXISTS (SELECT 1 FROM note_links
                WHERE from_note_id = notes.id OR to_note_id = notes.id)
        OR jsonb_array_length(linked_note_ids) > 0
      )
  ) n;

  SELECT json_agg(e) INTO v_edges FROM (
    SELECT from_note_id AS source, to_note_id AS target, 'link' AS type
    FROM note_links
    WHERE user_id = p_user_id

    UNION ALL

    SELECT DISTINCT e1.id AS source, e2.id AS target, 'tag' AS type
    FROM entries e1
    JOIN entries e2 ON e1.user_id = e2.user_id AND e1.id < e2.id
    WHERE e1.user_id = p_user_id::text
      AND e1.tags ?| ARRAY(SELECT jsonb_array_elements_text(e2.tags))
      AND jsonb_array_length(e1.tags) > 0
    LIMIT 50
  ) e;

  RETURN json_build_object(
    'nodes', COALESCE(v_nodes, '[]'::json),
    'edges', COALESCE(v_edges, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_task_stats(p_user_id TEXT)
RETURNS TABLE (
  total_tasks           BIGINT,
  completed_tasks       BIGINT,
  pending_tasks         BIGINT,
  high_priority_pending BIGINT,
  overdue_tasks         BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'done'),
    COUNT(*) FILTER (WHERE status <> 'done'),
    COUNT(*) FILTER (WHERE status <> 'done' AND priority IN ('high', 'urgent')),
    COUNT(*) FILTER (WHERE status <> 'done' AND due_date IS NOT NULL AND due_date < now())
  FROM tasks
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 11. STORAGE: private bucket for voice recordings
-- ============================================================================
-- Objects are keyed <user_id>/<entry_id>.<ext>. The app reads and writes them
-- with the service role and hands out short-lived signed URLs, so these policies
-- only matter if a client ever talks to Storage directly — they keep each user
-- confined to their own folder if it does.

INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-recordings', 'voice-recordings', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can read own recordings"   ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own recordings" ON storage.objects;

CREATE POLICY "Users can read own recordings"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'voice-recordings'
         AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'voice-recordings'
              AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own recordings"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'voice-recordings'
         AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own recordings"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'voice-recordings'
         AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================================
-- 12. VERIFY — should return 14 rows, all with rls_enabled = true
-- ============================================================================

SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  (SELECT COUNT(*) FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policy_count
FROM pg_class c
JOIN pg_namespace ns ON ns.oid = c.relnamespace
WHERE ns.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'entries', 'tasks', 'notes', 'voice_entries', 'keywords',
    'entry_keywords', 'note_keywords', 'content_links', 'note_links',
    'tags', 'privacy_unlocks', 'custom_prompts', 'finance_days', 'finance_txns'
  )
ORDER BY c.relname;
