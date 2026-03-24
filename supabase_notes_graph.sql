-- ============================================================
-- JustWrite: Notes + Graph Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============ NOTES TABLE ============

CREATE TABLE IF NOT EXISTS notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'Untitled',
  icon       TEXT,
  cover_url  TEXT,
  blocks     JSONB NOT NULL DEFAULT '[]'::jsonb,
  parent_id  UUID REFERENCES notes(id) ON DELETE SET NULL,
  is_locked  BOOLEAN NOT NULL DEFAULT false,
  is_pinned  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id          ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_parent       ON notes(user_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_pinned       ON notes(user_id, is_pinned);
CREATE INDEX IF NOT EXISTS idx_notes_created_at        ON notes(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notes_updated_at ON notes;
CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_notes_updated_at();

-- RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notes" ON notes;
CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notes" ON notes;
CREATE POLICY "Users can insert own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notes" ON notes;
CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notes" ON notes;
CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);

-- ============ KEYWORDS TABLE ============

CREATE TABLE IF NOT EXISTS keywords (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, word)
);

CREATE INDEX IF NOT EXISTS idx_keywords_user_id ON keywords(user_id);

ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own keywords" ON keywords;
CREATE POLICY "Users can manage own keywords"
  ON keywords FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============ ENTRY_KEYWORDS JOIN TABLE ============

CREATE TABLE IF NOT EXISTS entry_keywords (
  entry_id   UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, keyword_id)
);

CREATE INDEX IF NOT EXISTS idx_entry_keywords_entry   ON entry_keywords(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_keywords_keyword ON entry_keywords(keyword_id);

ALTER TABLE entry_keywords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own entry keywords" ON entry_keywords;
CREATE POLICY "Users can manage own entry keywords"
  ON entry_keywords FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM entries e WHERE e.id = entry_id AND e.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entries e WHERE e.id = entry_id AND e.user_id = auth.uid()::text
    )
  );

-- ============ NOTE_KEYWORDS JOIN TABLE ============

CREATE TABLE IF NOT EXISTS note_keywords (
  note_id    UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, keyword_id)
);

CREATE INDEX IF NOT EXISTS idx_note_keywords_note    ON note_keywords(note_id);
CREATE INDEX IF NOT EXISTS idx_note_keywords_keyword ON note_keywords(keyword_id);

ALTER TABLE note_keywords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own note keywords" ON note_keywords;
CREATE POLICY "Users can manage own note keywords"
  ON note_keywords FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM notes n WHERE n.id = note_id AND n.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes n WHERE n.id = note_id AND n.user_id = auth.uid()
    )
  );

-- ============ CONTENT_LINKS TABLE ============

CREATE TABLE IF NOT EXISTS content_links (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_type  TEXT NOT NULL CHECK (from_type IN ('entry', 'note', 'voice')),
  from_id    UUID NOT NULL,
  to_type    TEXT NOT NULL CHECK (to_type IN ('entry', 'note', 'voice', 'task', 'keyword')),
  to_id      UUID NOT NULL,
  link_type  TEXT NOT NULL CHECK (link_type IN ('similar', 'mention', 'wikilink', 'extracted')),
  weight     FLOAT NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_links_user_id  ON content_links(user_id);
CREATE INDEX IF NOT EXISTS idx_content_links_from_id  ON content_links(from_id);
CREATE INDEX IF NOT EXISTS idx_content_links_to_id    ON content_links(to_id);

ALTER TABLE content_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own content links" ON content_links;
CREATE POLICY "Users can manage own content links"
  ON content_links FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============ ADD TRANSCRIPT COLUMN TO VOICE_ENTRIES (if table exists) ============

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'voice_entries'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voice_entries' AND column_name = 'transcript'
  ) THEN
    ALTER TABLE voice_entries ADD COLUMN transcript TEXT;
  END IF;
END $$;

-- ============ HELPER: upsert keyword and return id ============

CREATE OR REPLACE FUNCTION upsert_keyword(p_user_id UUID, p_word TEXT)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO keywords (user_id, word)
  VALUES (p_user_id, lower(trim(p_word)))
  ON CONFLICT (user_id, word) DO NOTHING;

  SELECT id INTO v_id FROM keywords WHERE user_id = p_user_id AND word = lower(trim(p_word));
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
