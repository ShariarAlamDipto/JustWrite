import { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler } from '../../../lib/apiHelpers';
import { withAuth } from '../../../lib/withAuth';
import { createClient } from '@supabase/supabase-js';
import { isValidUUID, sanitizeInput } from '../../../lib/security';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { id } = req.query;
    // SECURITY: Validate ID format to prevent injection attacks
    if (!id || typeof id !== 'string' || !isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    if (req.method === 'GET') {
      // Get single voice entry
      try {
        const { data, error } = await supabase
          .from('voice_entries')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .single();

        if (error) throw error;
        if (!data) {
          return res.status(404).json({ error: 'Voice entry not found' });
        }
        return res.status(200).json({ voiceEntry: data });
      } catch {
        return res.status(500).json({ error: 'Failed to get voice entry' });
      }
    }

    if (req.method === 'PATCH') {
      // Update voice entry
      try {
        const { title, transcript } = req.body;
        const updates: any = {};
        // SECURITY: Sanitize inputs before storing
        if (title !== undefined) updates.title = sanitizeInput(title);
        if (transcript !== undefined) updates.transcript = sanitizeInput(transcript);

        const { data, error } = await supabase
          .from('voice_entries')
          .update(updates)
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return res.status(200).json({ voiceEntry: data });
      } catch {
        return res.status(500).json({ error: 'Failed to update voice entry' });
      }
    }

    if (req.method === 'DELETE') {
      // Delete voice entry (also delete from storage)
      try {
        // First get the entry to find the file path
        const { data: entry } = await supabase
          .from('voice_entries')
          .select('metadata')
          .eq('id', id)
          .eq('user_id', userId)
          .single();

        // Delete from storage if file exists
        if (entry?.metadata?.file_name) {
          await supabase.storage
            .from('voice-recordings')
            .remove([entry.metadata.file_name]);
        }

        // Delete from database
        const { error } = await supabase
          .from('voice_entries')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (error) throw error;
        return res.status(200).json({ success: true });
      } catch {
        return res.status(500).json({ error: 'Failed to delete voice entry' });
      }
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE');
    return res.status(405).end('Method Not Allowed');
  });
}

export default withErrorHandler(handler);
