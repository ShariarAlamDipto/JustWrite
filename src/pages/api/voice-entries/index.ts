import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/withAuth';
import { createClient } from '@supabase/supabase-js';
import { sanitizeInput } from '../../../lib/security';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    if (req.method === 'GET') {
      // List voice entries
      try {
        const { data, error } = await supabase
          .from('voice_entries')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return res.status(200).json({ voiceEntries: data || [] });
      } catch {
        return res.status(500).json({ error: 'Failed to load voice entries' });
      }
    }

    if (req.method === 'POST') {
      // Create voice entry
      try {
        const { title, audio_url, audio_duration, transcript, metadata } = req.body;

        // SECURITY: Validate and sanitize inputs
        if (!title || typeof title !== 'string') {
          return res.status(400).json({ error: 'Title is required' });
        }

        const sanitizedTitle = sanitizeInput(title);
        if (!sanitizedTitle) {
          return res.status(400).json({ error: 'Title is required' });
        }

        const { data, error } = await supabase
          .from('voice_entries')
          .insert({
            user_id: userId,
            title: sanitizedTitle,
            audio_url: audio_url ? sanitizeInput(audio_url) : null,
            audio_duration: typeof audio_duration === 'number' ? audio_duration : null,
            transcript: transcript ? sanitizeInput(transcript) : null,
            metadata: metadata || null, // metadata is JSON, validated by Supabase
          })
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json({ voiceEntry: data });
      } catch {
        return res.status(500).json({ error: 'Failed to create voice entry' });
      }
    }

    if (req.method === 'PATCH') {
      // Update transcript (and optionally title) for an existing voice entry
      try {
        const { id, transcript, title } = req.body;
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'id is required' });
        }

        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (typeof transcript === 'string') {
          updates.transcript = sanitizeInput(transcript) || null;
        }
        if (typeof title === 'string' && title.trim()) {
          updates.title = sanitizeInput(title);
        }

        const { data, error } = await supabase
          .from('voice_entries')
          .update(updates)
          .eq('id', id)
          .eq('user_id', userId)  // ensure ownership
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json({ voiceEntry: data });
      } catch {
        return res.status(500).json({ error: 'Failed to update voice entry' });
      }
    }

    res.setHeader('Allow', 'GET, POST, PATCH');
    return res.status(405).end('Method Not Allowed');
  });
}
