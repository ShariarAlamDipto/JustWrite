-- Add is_locked column to entries table for private journal entries
ALTER TABLE entries ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- Create index for filtering locked entries
CREATE INDEX IF NOT EXISTS idx_entries_is_locked ON entries(user_id, is_locked);

-- Create custom_prompts table
CREATE TABLE IF NOT EXISTS custom_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'custom',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT text_length CHECK (char_length(text) >= 5 AND char_length(text) <= 500)
);

-- Create index for user's prompts
CREATE INDEX IF NOT EXISTS idx_custom_prompts_user ON custom_prompts(user_id);

-- Enable Row Level Security
ALTER TABLE custom_prompts ENABLE ROW LEVEL SECURITY;

-- Create policies for custom_prompts
CREATE POLICY "Users can view their own prompts"
  ON custom_prompts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own prompts"
  ON custom_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prompts"
  ON custom_prompts FOR DELETE
  USING (auth.uid() = user_id);
