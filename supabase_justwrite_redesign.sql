-- ============================================================
-- JustWrite Redesign: 4-Tab Schema Migration
-- Run in Supabase SQL Editor after existing migrations
-- ============================================================

-- ============ ENTRIES: new columns for journal/idea segments ============

-- Entry type: journal | idea | voice
ALTER TABLE entries ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'journal'
  CHECK (type IN ('journal', 'idea', 'voice'));

-- Tags (JSONB array of strings, e.g. ["writing", "daily"])
ALTER TABLE entries ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Privacy flag
ALTER TABLE entries ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

-- Idea → Note conversion: stores the resulting note id
ALTER TABLE entries ADD COLUMN IF NOT EXISTS converted_to_note_id UUID REFERENCES notes(id) ON DELETE SET NULL;

-- Voice transcript reference (links to voice_entries row)
ALTER TABLE entries ADD COLUMN IF NOT EXISTS voice_transcript_id UUID;

-- Word count (computed on write, avoids re-counting on every list fetch)
ALTER TABLE entries ADD COLUMN IF NOT EXISTS word_count INTEGER NOT NULL DEFAULT 0;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_entries_type       ON entries(user_id, type);
CREATE INDEX IF NOT EXISTS idx_entries_private    ON entries(user_id, is_private);
CREATE INDEX IF NOT EXISTS idx_entries_tags       ON entries USING GIN (tags);

-- ============ NOTES: new columns ============

-- Privacy flag (matching entries pattern)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

-- Tags array
ALTER TABLE notes ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Segment label (always 'notes' for note rows — helps graph queries join uniformly)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS segment TEXT NOT NULL DEFAULT 'notes';

-- Word count
ALTER TABLE notes ADD COLUMN IF NOT EXISTS word_count INTEGER NOT NULL DEFAULT 0;

-- Source of creation: typed | voice
ALTER TABLE notes ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'typed'
  CHECK (source IN ('typed', 'voice'));

-- Linked note ids for bidirectional wikilinks (also stored in note_links below)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS linked_note_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Index for tags and privacy
CREATE INDEX IF NOT EXISTS idx_notes_tags    ON notes USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_notes_private ON notes(user_id, is_private);

-- ============ NOTE_LINKS: bidirectional wikilinks between notes ============
-- Stores [[wikilink]] connections parsed from note blocks

CREATE TABLE IF NOT EXISTS note_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  to_note_id  UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  context     TEXT,           -- excerpt around the [[link]] for backlink display
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_note_id, to_note_id)
);

CREATE INDEX IF NOT EXISTS idx_note_links_user    ON note_links(user_id);
CREATE INDEX IF NOT EXISTS idx_note_links_from    ON note_links(from_note_id);
CREATE INDEX IF NOT EXISTS idx_note_links_to      ON note_links(to_note_id);

ALTER TABLE note_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own note links" ON note_links;
CREATE POLICY "Users can manage own note links"
  ON note_links FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============ TAGS: user tag registry (for autocomplete + pattern view) ============

CREATE TABLE IF NOT EXISTS tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  segment    TEXT CHECK (segment IN ('journal', 'ideas', 'notes', NULL)),
  use_count  INTEGER NOT NULL DEFAULT 1,
  last_used  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_user     ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_segment  ON tags(user_id, segment);
CREATE INDEX IF NOT EXISTS idx_tags_count    ON tags(user_id, use_count DESC);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own tags" ON tags;
CREATE POLICY "Users can manage own tags"
  ON tags FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============ PRIVACY_UNLOCKS: time-limited session unlock log ============
-- Tracks when a user unlocked a private item (for audit / auto-relock)

CREATE TABLE IF NOT EXISTS privacy_unlocks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id  UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('entry', 'note')),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_privacy_unlocks_user   ON privacy_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_unlocks_target ON privacy_unlocks(user_id, target_id);

ALTER TABLE privacy_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own unlock log" ON privacy_unlocks;
CREATE POLICY "Users can manage own unlock log"
  ON privacy_unlocks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============ HELPER FUNCTION: upsert tag and increment use_count ============

CREATE OR REPLACE FUNCTION upsert_tag(
  p_user_id UUID,
  p_name    TEXT,
  p_segment TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO tags (user_id, name, segment, use_count, last_used)
  VALUES (p_user_id, lower(trim(p_name)), p_segment, 1, now())
  ON CONFLICT (user_id, name) DO UPDATE
    SET use_count = tags.use_count + 1,
        last_used = now();

  SELECT id INTO v_id FROM tags WHERE user_id = p_user_id AND name = lower(trim(p_name));
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============ HELPER FUNCTION: get graph nodes + edges for a user ============

CREATE OR REPLACE FUNCTION get_user_graph(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_nodes JSON;
  v_edges JSON;
BEGIN
  -- Nodes: notes + entries that have links or are linked to
  SELECT json_agg(n) INTO v_nodes FROM (
    SELECT
      id,
      title,
      'notes' AS segment,
      (
        SELECT COUNT(*) FROM note_links nl
        WHERE nl.from_note_id = notes.id OR nl.to_note_id = notes.id
      ) AS degree
    FROM notes
    WHERE user_id = p_user_id
      AND (
        EXISTS (SELECT 1 FROM note_links WHERE from_note_id = notes.id OR to_note_id = notes.id)
        OR array_length(ARRAY(SELECT jsonb_array_elements_text(linked_note_ids)), 1) > 0
      )
  ) n;

  -- Edges: from note_links
  SELECT json_agg(e) INTO v_edges FROM (
    SELECT
      from_note_id AS source,
      to_note_id   AS target,
      'link'       AS type
    FROM note_links
    WHERE user_id = p_user_id

    UNION ALL

    -- Tag-based connections between entries sharing a tag
    SELECT DISTINCT
      e1.id AS source,
      e2.id AS target,
      'tag' AS type
    FROM entries e1
    JOIN entries e2 ON e1.user_id = e2.user_id AND e1.id < e2.id
    WHERE e1.user_id = p_user_id
      AND e1.tags ?| ARRAY(SELECT jsonb_array_elements_text(e2.tags))
      AND jsonb_array_length(e1.tags) > 0
    LIMIT 50  -- cap tag edges to avoid explosion
  ) e;

  RETURN json_build_object(
    'nodes', COALESCE(v_nodes, '[]'::json),
    'edges', COALESCE(v_edges, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============ VERIFY ============

SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('entries', 'notes', 'note_links', 'tags', 'privacy_unlocks')
ORDER BY table_name, ordinal_position;
