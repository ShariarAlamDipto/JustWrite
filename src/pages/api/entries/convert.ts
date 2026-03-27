import { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler } from '../../../lib/apiHelpers';
import { getEntryById, updateEntry, createNote } from '../../../lib/storage';
import { withAuth } from '../../../lib/withAuth';
import { checkRateLimit, isValidUUID } from '../../../lib/security';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId, accessToken) => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).end('Method Not Allowed');
    }

    const rateLimit = checkRateLimit(userId, 30, 60000);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'Too many requests.' });
    }

    const { ideaId } = req.body;

    if (!ideaId || typeof ideaId !== 'string' || !isValidUUID(ideaId)) {
      return res.status(400).json({ error: 'ideaId required (UUID)' });
    }

    // Fetch the idea entry — verifies ownership
    const entry = await getEntryById(ideaId, userId);
    if (!entry) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    // Derive a title from the first line of content (up to 60 chars)
    const rawContent: string = entry.content ?? '';
    const firstLine = rawContent.split('\n')[0].replace(/^(enc2:|enc:)[^\s]*/i, '').trim();
    const title = firstLine.slice(0, 60) || 'Untitled';

    // Build blocks — one paragraph block with the entry content
    const blocks = [
      {
        id: crypto.randomUUID(),
        type: 'paragraph',
        content: rawContent,
      },
    ];

    // Create the note
    const note = await createNote({
      user_id: userId,
      title,
      icon: '💡',
      blocks,
      accessToken,
    });

    // Mark the idea as converted
    await updateEntry(ideaId, { converted_to_note_id: note.id }, userId);

    return res.status(201).json({ note });
  });
}

export default withErrorHandler(handler);
