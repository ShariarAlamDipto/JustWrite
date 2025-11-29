-- Run this in your Supabase SQL Editor to add missing columns to entries table
-- Go to: Supabase Dashboard -> SQL Editor -> New Query -> Paste this -> Run

-- Add title column if it doesn't exist
ALTER TABLE entries ADD COLUMN IF NOT EXISTS title TEXT;

-- Add summary column if it doesn't exist
ALTER TABLE entries ADD COLUMN IF NOT EXISTS summary TEXT;

-- Add mood column if it doesn't exist
ALTER TABLE entries ADD COLUMN IF NOT EXISTS mood INTEGER DEFAULT 5;

-- Add mood_intensity column if it doesn't exist  
ALTER TABLE entries ADD COLUMN IF NOT EXISTS mood_intensity INTEGER DEFAULT 5;

-- Add source column if it doesn't exist
ALTER TABLE entries ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'text';

-- Add gratitude column if it doesn't exist (JSON array)
ALTER TABLE entries ADD COLUMN IF NOT EXISTS gratitude JSONB DEFAULT '[]';

-- Add prompt_answers column if it doesn't exist (JSON object)
ALTER TABLE entries ADD COLUMN IF NOT EXISTS prompt_answers JSONB DEFAULT '{}';

-- Add ai_metadata column if it doesn't exist (JSON object)
ALTER TABLE entries ADD COLUMN IF NOT EXISTS ai_metadata JSONB;

-- Add updated_at column if it doesn't exist
ALTER TABLE entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- Verify the columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'entries'
ORDER BY ordinal_position;
