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
