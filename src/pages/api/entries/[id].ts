import { NextApiRequest, NextApiResponse } from 'next';
import { getEntryById, updateEntry, deleteEntry } from '../../../lib/storage';
import { withAuth } from '../../../lib/withAuth';
import { sanitizeInput, validateContentLength, isValidUUID, checkRateLimit } from '../../../lib/security';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    // SECURITY: Rate limiting
    const rateLimit = checkRateLimit(userId, 100, 60000);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
    
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Entry ID required' });
    }

    // Validate UUID format
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid entry ID format' });
    }

    // Get entry and verify ownership - SECURITY: pass userId to filter by owner
    const entry = await getEntryById(id, userId);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
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

      // SECURITY: Pass userId to verify ownership
      const updatedEntry = await updateEntry(id, updates, userId);
      return res.status(200).json({ entry: updatedEntry });
    }

    if (req.method === 'DELETE') {
      try {
        await deleteEntry(id, userId);
        return res.status(200).json({ success: true });
      } catch (err: any) {
        console.error('Delete entry error:', err);
        return res.status(500).json({ error: err.message || 'Failed to delete entry' });
      }
    }

    res.setHeader('Allow', 'GET,PATCH,DELETE');
    res.status(405).end('Method Not Allowed');
  });
}
