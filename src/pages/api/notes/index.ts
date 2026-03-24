import { NextApiRequest, NextApiResponse } from 'next';
import { listNotes, createNote } from '../../../lib/storage';
import { withAuth } from '../../../lib/withAuth';
import { sanitizeInput, checkRateLimit } from '../../../lib/security';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    const rateLimit = checkRateLimit(userId, 120, 60000);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());

    if (req.method === 'GET') {
      const { parent_id } = req.query;
      // parent_id=null → root notes, parent_id=<uuid> → children, omitted → all
      const parentId = parent_id === 'null' ? null
        : typeof parent_id === 'string' ? parent_id
        : undefined;

      const notes = await listNotes(userId, parentId);
      return res.status(200).json({ notes });
    }

    if (req.method === 'POST') {
      try {
        const { title, icon, cover_url, blocks, parent_id } = req.body;

        const note = await createNote({
          user_id: userId,
          title: title ? sanitizeInput(String(title)).slice(0, 500) : 'Untitled',
          icon: icon ? sanitizeInput(String(icon)).slice(0, 50) : null,
          cover_url: cover_url ? sanitizeInput(String(cover_url)).slice(0, 1000) : null,
          blocks: Array.isArray(blocks) ? blocks : [],
          parent_id: parent_id || null,
        });

        return res.status(201).json({ note });
      } catch (error) {
        console.error('Create note failed:', error);
        return res.status(500).json({ error: 'Failed to create note' });
      }
    }

    res.setHeader('Allow', 'GET,POST');
    res.status(405).end('Method Not Allowed');
  });
}
