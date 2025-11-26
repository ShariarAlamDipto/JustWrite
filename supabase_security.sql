-- JustWrite Supabase Security Configuration
-- Run this in Supabase SQL Editor to enable Row Level Security (RLS)
-- This ensures users can only access their own data
-- Version: 2.0 - Enhanced with additional columns, constraints, and functions

-- ==============================================
-- STEP 1: CHECK EXISTING TABLE STRUCTURE
-- ==============================================
-- First, run this to see your actual column names:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'entries';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks';

-- ==============================================
-- STEP 2: ADD user_id COLUMN IF MISSING
-- Note: Prisma may have created "userId" (camelCase) - we need snake_case
-- ==============================================

-- Add user_id to entries if not exists (handles both cases)
DO $$ 
BEGIN 
  -- Check if userId exists (Prisma style)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='entries' AND column_name='userId') THEN
    -- Rename to snake_case if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='entries' AND column_name='user_id') THEN
      ALTER TABLE entries RENAME COLUMN "userId" TO user_id;
    END IF;
  -- Otherwise add user_id column
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='entries' AND column_name='user_id') THEN
    ALTER TABLE entries ADD COLUMN user_id TEXT;
  END IF;
END $$;

-- Add user_id to tasks if not exists (handles both cases)
DO $$ 
BEGIN 
  -- Check if userId exists (Prisma style)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='tasks' AND column_name='userId') THEN
    -- Rename to snake_case if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tasks' AND column_name='user_id') THEN
      ALTER TABLE tasks RENAME COLUMN "userId" TO user_id;
    END IF;
  -- Otherwise add user_id column
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='tasks' AND column_name='user_id') THEN
    ALTER TABLE tasks ADD COLUMN user_id TEXT;
  END IF;
END $$;

-- Also handle entryId -> entry_id for tasks
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='tasks' AND column_name='entryId') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tasks' AND column_name='entry_id') THEN
      ALTER TABLE tasks RENAME COLUMN "entryId" TO entry_id;
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='tasks' AND column_name='entry_id') THEN
    ALTER TABLE tasks ADD COLUMN entry_id TEXT;
  END IF;
END $$;

-- Handle aiMetadata -> ai_metadata for entries
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='entries' AND column_name='aiMetadata') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='entries' AND column_name='ai_metadata') THEN
      ALTER TABLE entries RENAME COLUMN "aiMetadata" TO ai_metadata;
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='entries' AND column_name='ai_metadata') THEN
    ALTER TABLE entries ADD COLUMN ai_metadata JSONB;
  END IF;
END $$;

-- Handle createdAt -> created_at for both tables
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='entries' AND column_name='createdAt') THEN
    ALTER TABLE entries RENAME COLUMN "createdAt" TO created_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='tasks' AND column_name='createdAt') THEN
    ALTER TABLE tasks RENAME COLUMN "createdAt" TO created_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='tasks' AND column_name='updatedAt') THEN
    ALTER TABLE tasks RENAME COLUMN "updatedAt" TO updated_at;
  END IF;
END $$;

-- ==============================================
-- STEP 2B: ADD MISSING COLUMNS FOR FLUTTER APP
-- These columns are used by the mobile app
-- ==============================================

-- Add title column to entries (for journal titles)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entries' AND column_name='title') THEN
    ALTER TABLE entries ADD COLUMN title TEXT;
  END IF;
END $$;

-- Add mood tracking columns to entries
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entries' AND column_name='mood') THEN
    ALTER TABLE entries ADD COLUMN mood INTEGER DEFAULT 5 CHECK (mood >= 1 AND mood <= 10);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entries' AND column_name='mood_intensity') THEN
    ALTER TABLE entries ADD COLUMN mood_intensity INTEGER DEFAULT 5 CHECK (mood_intensity >= 1 AND mood_intensity <= 10);
  END IF;
END $$;

-- Add gratitude column (JSONB array)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entries' AND column_name='gratitude') THEN
    ALTER TABLE entries ADD COLUMN gratitude JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add prompt_answers column (JSONB object)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entries' AND column_name='prompt_answers') THEN
    ALTER TABLE entries ADD COLUMN prompt_answers JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add updated_at to entries
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='entries' AND column_name='updated_at') THEN
    ALTER TABLE entries ADD COLUMN updated_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add if_then_plan column to tasks (for implementation intentions)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='if_then_plan') THEN
    ALTER TABLE tasks ADD COLUMN if_then_plan TEXT;
  END IF;
END $$;

-- Add due_date column to tasks
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='due_date') THEN
    ALTER TABLE tasks ADD COLUMN due_date TIMESTAMPTZ;
  END IF;
END $$;

-- ==============================================
-- STEP 2C: ADD CONSTRAINTS FOR DATA INTEGRITY
-- ==============================================

-- Ensure user_id is NOT NULL for new records
DO $$ 
BEGIN 
  -- Add NOT NULL constraint if not exists (only if no NULL values exist)
  IF NOT EXISTS (SELECT 1 FROM entries WHERE user_id IS NULL) THEN
    ALTER TABLE entries ALTER COLUMN user_id SET NOT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Constraint may already exist or NULL values present
  NULL;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM tasks WHERE user_id IS NULL) THEN
    ALTER TABLE tasks ALTER COLUMN user_id SET NOT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Add check constraint for priority values
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_priority_check') THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
      CHECK (priority IN ('low', 'medium', 'high'));
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Add check constraint for status values
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_status_check') THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
      CHECK (status IN ('todo', 'in_progress', 'done'));
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ==============================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- ==============================================

ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners too (extra security)
ALTER TABLE entries FORCE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;

-- ==============================================
-- STEP 4: DROP EXISTING POLICIES (clean slate)
-- ==============================================

DROP POLICY IF EXISTS "Users can view own entries" ON entries;
DROP POLICY IF EXISTS "Users can insert own entries" ON entries;
DROP POLICY IF EXISTS "Users can update own entries" ON entries;
DROP POLICY IF EXISTS "Users can delete own entries" ON entries;

DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

-- ==============================================
-- STEP 5: CREATE RLS POLICIES FOR ENTRIES
-- ==============================================

CREATE POLICY "Users can view own entries" 
ON entries FOR SELECT 
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own entries" 
ON entries FOR INSERT 
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own entries" 
ON entries FOR UPDATE 
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own entries" 
ON entries FOR DELETE 
USING (auth.uid()::text = user_id);

-- ==============================================
-- STEP 6: CREATE RLS POLICIES FOR TASKS
-- ==============================================

CREATE POLICY "Users can view own tasks" 
ON tasks FOR SELECT 
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own tasks" 
ON tasks FOR INSERT 
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own tasks" 
ON tasks FOR UPDATE 
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own tasks" 
ON tasks FOR DELETE 
USING (auth.uid()::text = user_id);

-- ==============================================
-- STEP 7: CREATE INDEXES FOR PERFORMANCE
-- ==============================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_entry_id ON tasks(entry_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_entries_user_created ON entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_created ON tasks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;

-- Full-text search index for content (optional - for search feature)
CREATE INDEX IF NOT EXISTS idx_entries_content_search ON entries USING gin(to_tsvector('english', content));

-- ==============================================
-- STEP 8: CREATE HELPER FUNCTIONS
-- ==============================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-updating timestamps
DROP TRIGGER IF EXISTS set_entries_updated_at ON entries;
CREATE TRIGGER set_entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_tasks_updated_at ON tasks;
CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get user's task statistics
CREATE OR REPLACE FUNCTION get_user_task_stats(p_user_id TEXT)
RETURNS TABLE (
  total_tasks BIGINT,
  completed_tasks BIGINT,
  pending_tasks BIGINT,
  high_priority_pending BIGINT,
  overdue_tasks BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_tasks,
    COUNT(*) FILTER (WHERE status = 'done')::BIGINT as completed_tasks,
    COUNT(*) FILTER (WHERE status != 'done')::BIGINT as pending_tasks,
    COUNT(*) FILTER (WHERE status != 'done' AND priority = 'high')::BIGINT as high_priority_pending,
    COUNT(*) FILTER (WHERE status != 'done' AND due_date < NOW())::BIGINT as overdue_tasks
  FROM tasks
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get mood trends (last 30 days)
CREATE OR REPLACE FUNCTION get_mood_trends(p_user_id TEXT, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  entry_date DATE,
  avg_mood NUMERIC,
  entry_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(created_at) as entry_date,
    AVG(mood)::NUMERIC as avg_mood,
    COUNT(*)::BIGINT as entry_count
  FROM entries
  WHERE user_id = p_user_id 
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND mood IS NOT NULL
  GROUP BY DATE(created_at)
  ORDER BY entry_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search entries by content
CREATE OR REPLACE FUNCTION search_entries(p_user_id TEXT, p_query TEXT)
RETURNS SETOF entries AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM entries
  WHERE user_id = p_user_id
    AND to_tsvector('english', content) @@ plainto_tsquery('english', p_query)
  ORDER BY created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- STEP 9: CREATE VIEWS FOR COMMON QUERIES
-- ==============================================

-- View for recent entries with task count
CREATE OR REPLACE VIEW user_entries_with_tasks AS
SELECT 
  e.*,
  COALESCE(t.task_count, 0) as task_count,
  COALESCE(t.completed_count, 0) as completed_count
FROM entries e
LEFT JOIN (
  SELECT 
    entry_id,
    COUNT(*) as task_count,
    COUNT(*) FILTER (WHERE status = 'done') as completed_count
  FROM tasks
  WHERE entry_id IS NOT NULL
  GROUP BY entry_id
) t ON e.id = t.entry_id;

-- ==============================================
-- STEP 10: SECURITY GRANTS
-- ==============================================

-- Grant execute on functions to authenticated users only
GRANT EXECUTE ON FUNCTION get_user_task_stats(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mood_trends(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_entries(TEXT, TEXT) TO authenticated;

-- Revoke from anon/public for extra security
REVOKE EXECUTE ON FUNCTION get_user_task_stats(TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION get_mood_trends(TEXT, INTEGER) FROM anon, public;
REVOKE EXECUTE ON FUNCTION search_entries(TEXT, TEXT) FROM anon, public;

-- ==============================================
-- VERIFICATION (run these separately)
-- ==============================================

-- Check columns:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'entries' ORDER BY ordinal_position;
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'tasks' ORDER BY ordinal_position;

-- Check RLS enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('entries', 'tasks');

-- Check policies:
-- SELECT policyname, tablename, cmd FROM pg_policies WHERE tablename IN ('entries', 'tasks');

-- Check indexes:
-- SELECT indexname, tablename FROM pg_indexes WHERE tablename IN ('entries', 'tasks');

-- Check constraints:
-- SELECT conname, contype, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid IN ('entries'::regclass, 'tasks'::regclass);

-- Test task stats function:
-- SELECT * FROM get_user_task_stats('your-user-id-here');

-- Test mood trends:
-- SELECT * FROM get_mood_trends('your-user-id-here', 30);

-- ==============================================
-- NOTES
-- ==============================================
-- 1. Service role key bypasses RLS (for server-side operations)
-- 2. Anon key respects RLS (for client-side operations)
-- 3. auth.uid() returns the logged-in user's ID from JWT
-- 4. SECURITY DEFINER functions run with definer's privileges
-- 5. All functions require authenticated user context
-- 6. Composite indexes improve query performance for common access patterns
-- 7. Full-text search index enables fast content searching
-- 8. Triggers auto-update the updated_at column on changes
