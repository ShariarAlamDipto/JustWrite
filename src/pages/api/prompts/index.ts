import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/withAuth';
import { sanitizeInput, validateContentLength, checkRateLimit, isValidUUID } from '../../../lib/security';
import { listCustomPrompts, createCustomPrompt, deleteCustomPrompt } from '../../../lib/storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    // SECURITY: Rate limiting
    const rateLimit = checkRateLimit(userId, 50, 60000);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
    
    if (req.method === 'GET') {
      const prompts = await listCustomPrompts(userId);
      return res.status(200).json({ prompts });
    }

    if (req.method === 'POST') {
      const { text, category } = req.body;
      
      // Input validation
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Prompt text is required' });
      }
      
      const sanitizedText = sanitizeInput(text);
      if (sanitizedText.length < 5 || sanitizedText.length > 500) {
        return res.status(400).json({ error: 'Prompt must be between 5 and 500 characters' });
      }
      
      const validCategories = ['gratitude', 'reflection', 'emotional_checkin', 'morning_intentions', 'self_discovery', 'creative', 'custom'];
      const promptCategory = validCategories.includes(category) ? category : 'custom';

      const prompt = await createCustomPrompt({ 
        text: sanitizedText, 
        category: promptCategory,
        user_id: userId 
      });
      return res.status(201).json({ prompt });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      
      // SECURITY: Validate ID presence and format
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Prompt ID is required' });
      }
      
      if (!isValidUUID(id)) {
        return res.status(400).json({ error: 'Invalid prompt ID format' });
      }
      
      try {
        await deleteCustomPrompt(id, userId);
        return res.status(200).json({ success: true });
      } catch (err) {
        return res.status(404).json({ error: 'Prompt not found or access denied' });
      }
    }

    res.setHeader('Allow', 'GET,POST,DELETE');
    res.status(405).end('Method Not Allowed');
  });
}
