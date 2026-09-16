import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { withErrorHandler } from '../../../lib/apiHelpers';
import { withAuth } from '../../../lib/withAuth';
import { checkRateLimit, isValidUUID } from '../../../lib/security';
import { parseMultipart, isMultipartError } from '../../../lib/multipart';
import {
  VOICE_BUCKET,
  MAX_AUDIO_BYTES,
  SIGNED_URL_TTL_SECONDS,
  extensionForMime,
  buildStoragePath,
} from '../../../lib/voiceStorage';

// Audio arrives as multipart form data, so Next's JSON body parser is off.
export const config = { api: { bodyParser: false } };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).end('Method Not Allowed');
    }

    const rateLimit = checkRateLimit(userId, 30, 60000);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'Too many uploads. Please wait a moment.' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Storage not configured' });
    }

    const parsed = await parseMultipart(req, {
      fileField: 'audio',
      maxFileBytes: MAX_AUDIO_BYTES,
      defaultMimeType: 'audio/webm',
    });

    if (isMultipartError(parsed)) {
      return parsed.error === 'too_large'
        ? res.status(413).json({ error: 'Recording is too large (25MB maximum)' })
        : res.status(400).json({ error: 'Invalid audio upload' });
    }

    const entryId = parsed.fields.id;
    if (!entryId || !isValidUUID(entryId)) {
      return res.status(400).json({ error: 'A valid entry id is required' });
    }

    // Confirm the row exists and belongs to the caller before writing anything.
    const { data: entry, error: lookupError } = await supabase
      .from('voice_entries')
      .select('id, metadata')
      .eq('id', entryId)
      .eq('user_id', userId)
      .single();

    if (lookupError || !entry) {
      return res.status(404).json({ error: 'Voice entry not found' });
    }

    const extension = extensionForMime(parsed.mimeType);
    const storagePath = buildStoragePath(userId, entryId, extension);

    const { error: uploadError } = await supabase.storage
      .from(VOICE_BUCKET)
      .upload(storagePath, parsed.buffer, {
        contentType: parsed.mimeType,
        upsert: true,
      });

    if (uploadError) {
      return res.status(500).json({ error: 'Failed to store recording' });
    }

    const existingMetadata =
      entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {};

    const metadata = {
      ...existingMetadata,
      storage_path: storagePath,
      content_type: parsed.mimeType,
      file_size: parsed.buffer.length,
    };

    const { error: updateError } = await supabase
      .from('voice_entries')
      .update({ metadata, updated_at: new Date().toISOString() })
      .eq('id', entryId)
      .eq('user_id', userId);

    if (updateError) {
      // Don't leave an orphaned object behind if the row could not be updated.
      await supabase.storage.from(VOICE_BUCKET).remove([storagePath]);
      return res.status(500).json({ error: 'Failed to link recording' });
    }

    const { data: signed } = await supabase.storage
      .from(VOICE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    return res.status(200).json({
      audio_url: signed?.signedUrl ?? null,
      metadata,
    });
  });
}

export default withErrorHandler(handler);
