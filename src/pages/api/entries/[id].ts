import { NextApiRequest, NextApiResponse } from 'next';
import { getEntryById, updateEntry, deleteEntry } from '../../../lib/storage';
import { withAuth } from '../../../lib/withAuth';
import { sanitizeInput, validateContentLength, isValidUUID } from '../../../lib/security';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Entry ID required' });
    }

    // Validate UUID format
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid entry ID format' });
    }

    // Get entry and verify ownership
    const entry = await getEntryById(id);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    // SECURITY: Verify the entry belongs to the authenticated user
    if (entry.user_id && entry.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to access this entry' });
    }

    if (req.method === 'GET') {
      return res.status(200).json({ entry });
    }

    if (req.method === 'PATCH') {
      const { content, mood, activities, summary } = req.body;
      
      const updates: any = {};
      
      if (content !== undefined) {
        const sanitizedContent = sanitizeInput(content);
        if (!validateContentLength(sanitizedContent)) {
          return res.status(400).json({ error: 'Content must be between 1 and 50000 characters' });
        }
        updates.content = sanitizedContent;
      }
      
      if (mood !== undefined) {
        updates.mood = Number(mood);
      }
      
      if (activities !== undefined) {
        updates.activities = activities;
      }
      
      if (summary !== undefined) {
        updates.summary = sanitizeInput(summary);
      }

      const updatedEntry = await updateEntry(id, updates);
      return res.status(200).json({ entry: updatedEntry });
    }

    if (req.method === 'DELETE') {
      await deleteEntry(id);
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', 'GET,PATCH,DELETE');
    res.status(405).end('Method Not Allowed');
  });
}
