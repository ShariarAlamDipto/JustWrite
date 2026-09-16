import { NextApiRequest, NextApiResponse } from 'next';
import { updateTask, getTaskById, deleteTask } from '../../../lib/storage';
import { withAuth } from '../../../lib/withAuth';
import { sanitizeInput, sanitizePriority, sanitizeStatus, isValidUUID, checkRateLimit } from '../../../lib/security';
import { withErrorHandler } from '../../../lib/apiHelpers';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    // SECURITY: Rate limiting
    const rateLimit = checkRateLimit(userId, 100, 60000);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
    
    const { id } = req.query;
    
    // SECURITY: Validate ID format
    if (!id || Array.isArray(id) || !isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid task ID format' });
    }

    if (req.method === 'PATCH') {
      const patch = req.body;
      
      // SECURITY: Sanitize patch fields
      const sanitizedPatch: Record<string, any> = {};
      if (patch.title !== undefined) {
        const isTitleEncrypted = typeof patch.title === 'string' && (patch.title.startsWith('enc2:') || patch.title.startsWith('enc:'));
        sanitizedPatch.title = isTitleEncrypted
          ? patch.title.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 10000)
          : sanitizeInput(patch.title).slice(0, 500);
      }
      if (patch.description !== undefined) {
        const isDescEncrypted = typeof patch.description === 'string' && (patch.description.startsWith('enc2:') || patch.description.startsWith('enc:'));
        sanitizedPatch.description = isDescEncrypted
          ? patch.description.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 50000)
          : sanitizeInput(patch.description).slice(0, 5000);
      }
      if (patch.priority !== undefined) {
        sanitizedPatch.priority = sanitizePriority(patch.priority);
      }
      if (patch.status !== undefined) {
        sanitizedPatch.status = sanitizeStatus(patch.status);
      }
      
      try {
        // SECURITY: Pass userId to verify ownership
        const task = await updateTask(id, sanitizedPatch, userId);
        return res.status(200).json({ task });
      } catch (e: any) {
        return res.status(404).json({ error: 'Task not found or access denied' });
      }
    }

    if (req.method === 'DELETE') {
      try {
        // SECURITY: Pass userId to verify ownership
        await deleteTask(id, userId);
        return res.status(200).json({ ok: true });
      } catch (e: any) {
        return res.status(404).json({ error: 'Task not found or access denied' });
      }
    }

    if (req.method === 'GET') {
      const task = await getTaskById(id, userId);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      return res.status(200).json({ task });
    }

    res.setHeader('Allow', 'GET,PATCH,DELETE');
    res.status(405).end('Method Not Allowed');
  });
}

export default withErrorHandler(handler);
