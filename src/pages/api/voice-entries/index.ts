import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/withAuth';
import { createClient } from '@supabase/supabase-js';

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
      } catch (err) {
        console.error('Failed to list voice entries:', err);
        return res.status(500).json({ error: 'Failed to load voice entries' });
      }
    }

    if (req.method === 'POST') {
      // Create voice entry
      try {
        const { title, audio_url, audio_duration, transcript, metadata } = req.body;

        if (!title) {
          return res.status(400).json({ error: 'Title is required' });
        }

        const { data, error } = await supabase
          .from('voice_entries')
          .insert({
            user_id: userId,
            title,
            audio_url,
            audio_duration,
            transcript,
            metadata,
          })
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json({ voiceEntry: data });
      } catch (err) {
        console.error('Failed to create voice entry:', err);
        return res.status(500).json({ error: 'Failed to create voice entry' });
      }
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end('Method Not Allowed');
  });
}
