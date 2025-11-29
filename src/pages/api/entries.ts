import { NextApiRequest, NextApiResponse } from 'next';
import { createEntry, listEntries, getEntryById } from '../../lib/storage';
import { withAuth } from '../../lib/withAuth';
import { sanitizeInput, validateContentLength, isValidUUID, checkRateLimit } from '../../lib/security';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    // SECURITY: Rate limiting
    const rateLimit = checkRateLimit(userId, 100, 60000);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
    
    if (req.method === 'GET') {
      // Check for locked filter
      const lockedParam = req.query.locked;
      const options = lockedParam !== undefined 
        ? { locked: lockedParam === 'true' } 
        : { locked: false }; // Default to showing non-locked entries
      
      // SECURITY: Filter entries by authenticated user only
      const entries = await listEntries(userId, options);
      return res.status(200).json({ entries });
    }

    if (req.method === 'POST') {
      const { content, source = 'text', created_at, mood, is_locked } = req.body;
      
      // SECURITY: Input validation
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'content required' });
      }
      
      const sanitizedContent = sanitizeInput(content);
      if (!validateContentLength(sanitizedContent)) {
        return res.status(400).json({ error: 'Content must be between 1 and 50000 characters' });
      }

      // SECURITY: Pass userId to associate entry with authenticated user
      const entry = await createEntry({ 
        content: sanitizedContent, 
        source: sanitizeInput(source).slice(0, 50), 
        created_at,
        user_id: userId,
        mood: typeof mood === 'number' ? Math.min(100, Math.max(0, mood)) : null,
        is_locked: is_locked === true
      });
      return res.status(201).json({ entry });
    }

    res.setHeader('Allow', 'GET,POST');
    res.status(405).end('Method Not Allowed');
  });
}
