import { NextApiRequest, NextApiResponse } from 'next';
import { getNoteById, updateNote, deleteNote, upsertKeywords, linkNoteKeywords } from '../../../lib/storage';
import { withAuth } from '../../../lib/withAuth';
import { sanitizeInput, isValidUUID, checkRateLimit } from '../../../lib/security';

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'from','is','was','are','were','be','been','have','has','had','do','did',
  'will','would','could','should','may','might','this','that','these','those',
  'i','you','he','she','we','they','it','my','your','his','her','our','its',
  'not','no','so','if','as','up','out','about','also','just','more','than',
]);

function extractKeywords(title: string, blocks: any[]): string[] {
  const text = [
    title,
    ...blocks.map((b: any) => (typeof b.content === 'string' ? b.content : '')),
  ].join(' ');

  return [...new Set(
    text.toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w))
  )].slice(0, 30);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    const rateLimit = checkRateLimit(userId, 120, 60000);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    const { id } = req.query;
    if (!id || typeof id !== 'string' || !isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid note ID' });
    }

    if (req.method === 'GET') {
      const note = await getNoteById(id, userId);
      if (!note) return res.status(404).json({ error: 'Note not found' });
      return res.status(200).json({ note });
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const { title, icon, cover_url, blocks, parent_id, is_locked, is_pinned } = req.body;

      const updates: Record<string, unknown> = {};
      if (title !== undefined)     updates.title     = sanitizeInput(String(title)).slice(0, 500);
      if (icon !== undefined)      updates.icon      = icon ? sanitizeInput(String(icon)).slice(0, 50) : null;
      if (cover_url !== undefined) updates.cover_url = cover_url ? sanitizeInput(String(cover_url)).slice(0, 1000) : null;
      if (blocks !== undefined)    updates.blocks    = Array.isArray(blocks) ? blocks : [];
      if (parent_id !== undefined) updates.parent_id = parent_id || null;
      if (is_locked !== undefined) updates.is_locked = Boolean(is_locked);
      if (is_pinned !== undefined) updates.is_pinned = Boolean(is_pinned);

      try {
        const note = await updateNote(id, updates, userId);

        // Background keyword extraction (non-blocking)
        if (blocks !== undefined || title !== undefined) {
          const finalTitle = (updates.title as string) || '';
          const finalBlocks = Array.isArray(updates.blocks) ? updates.blocks : [];
          const words = extractKeywords(finalTitle, finalBlocks);
          if (words.length > 0) {
            upsertKeywords(userId, words)
              .then(kwIds => linkNoteKeywords(id, kwIds))
              .catch(() => {}); // never fail the request
          }
        }

        return res.status(200).json({ note });
      } catch {
        return res.status(404).json({ error: 'Note not found or access denied' });
      }
    }

    if (req.method === 'DELETE') {
      try {
        await deleteNote(id, userId);
        return res.status(200).json({ success: true });
      } catch {
        return res.status(404).json({ error: 'Note not found or access denied' });
      }
    }

    res.setHeader('Allow', 'GET,PATCH,PUT,DELETE');
    res.status(405).end('Method Not Allowed');
  });
}
