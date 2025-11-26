import { NextApiRequest, NextApiResponse } from 'next';
import { listTasks, createTask } from '../../../lib/storage';
import { withAuth } from '../../../lib/withAuth';
import { sanitizeInput, sanitizePriority, validateContentLength, checkRateLimit } from '../../../lib/security';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    // SECURITY: Rate limiting
    const rateLimit = checkRateLimit(userId, 100, 60000);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
    
    if (req.method === 'GET') {
      // SECURITY: Filter tasks by authenticated user only
      const tasks = await listTasks(userId);
      return res.status(200).json({ tasks });
    }

    if (req.method === 'POST') {
      const { title, description = '', priority = 'medium', entry_id = null } = req.body;
      
      // SECURITY: Input validation and sanitization
      if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: 'title required' });
      }
      
      const sanitizedTitle = sanitizeInput(title).slice(0, 500);
      if (sanitizedTitle.length === 0) {
        return res.status(400).json({ error: 'title required' });
      }
      
      const sanitizedDescription = sanitizeInput(description).slice(0, 5000);
      const sanitizedPriority = sanitizePriority(priority);
      
      // SECURITY: Pass userId to associate task with authenticated user
      const task = await createTask({ 
        title: sanitizedTitle, 
        description: sanitizedDescription, 
        priority: sanitizedPriority, 
        entry_id,
        user_id: userId 
      });
      return res.status(201).json({ task });
    }

    res.setHeader('Allow', 'GET,POST');
    res.status(405).end('Method Not Allowed');
  });
}
