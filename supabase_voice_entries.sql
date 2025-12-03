-- Voice Entries Table for JustWrite
-- Run this in your Supabase SQL Editor

-- Create voice_entries table
CREATE TABLE IF NOT EXISTS voice_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    audio_url TEXT, -- URL to audio file in Supabase Storage
    audio_duration INTEGER, -- Duration in seconds
    transcript TEXT, -- Optional: transcribed text
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb -- For additional data like file size, format, etc.
);

-- Enable Row Level Security
ALTER TABLE voice_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own voice entries
CREATE POLICY "Users can view own voice entries"
    ON voice_entries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own voice entries"
    ON voice_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice entries"
    ON voice_entries FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own voice entries"
    ON voice_entries FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS voice_entries_user_id_idx ON voice_entries(user_id);
CREATE INDEX IF NOT EXISTS voice_entries_created_at_idx ON voice_entries(created_at DESC);

-- Create storage bucket for voice files (run this separately in Storage settings or use SQL)
-- Note: You may need to create this bucket manually in Supabase Dashboard > Storage
-- Bucket name: voice-recordings
-- Public: false (private bucket)

-- Storage RLS policies (create bucket first, then run these)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('voice-recordings', 'voice-recordings', false);

-- CREATE POLICY "Users can upload own voice recordings"
--     ON storage.objects FOR INSERT
--     WITH CHECK (bucket_id = 'voice-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can view own voice recordings"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'voice-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete own voice recordings"
--     ON storage.objects FOR DELETE
--     USING (bucket_id = 'voice-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_voice_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS voice_entries_updated_at ON voice_entries;
CREATE TRIGGER voice_entries_updated_at
    BEFORE UPDATE ON voice_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_voice_entries_updated_at();
