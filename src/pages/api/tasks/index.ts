import { NextApiRequest, NextApiResponse } from 'next';
import { listTasks, createTask } from '../../../lib/storage';
import { withAuth } from '../../../lib/withAuth';
import { sanitizeInput, sanitizePriority, checkRateLimit } from '../../../lib/security';
import { withErrorHandler } from '../../../lib/apiHelpers';
import { createListEtag, isNotModified, setRevalidateHeaders } from '../../../lib/httpCache';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    const rateLimit = checkRateLimit(userId, 100, 60000);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());

    if (req.method === 'GET') {
      const rawLimit = Number.parseInt(String(req.query.limit ?? '100'), 10);
      const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(200, rawLimit)) : 100;
      const since = typeof req.query.since === 'string' ? req.query.since : undefined;
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

      const tasks = await listTasks(userId, { limit, since, cursor });

      const etag = createListEtag(tasks);
      setRevalidateHeaders(res, etag);
      if (isNotModified(req, etag)) {
        return res.status(304).end();
      }

      const nextCursor = tasks.length === limit ? tasks[tasks.length - 1]?.created_at ?? null : null;
      return res.status(200).json({
        tasks,
        meta: {
          limit,
          nextCursor,
          hasMore: tasks.length === limit,
        },
      });
    }

    if (req.method === 'POST') {
      const { title, description = '', priority = 'medium', entry_id = null, due } = req.body;

      if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: 'title required' });
      }

      // Skip HTML/JS injection scrubbing for encrypted payloads — same logic as entries API.
      const isTitleEncrypted = title.startsWith('enc2:') || title.startsWith('enc:');
      const sanitizedTitle = isTitleEncrypted
        ? title.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 10000)
        : sanitizeInput(title).slice(0, 500);
      if (sanitizedTitle.length === 0) {
        return res.status(400).json({ error: 'title required' });
      }

      const isDescEncrypted = typeof description === 'string' && (description.startsWith('enc2:') || description.startsWith('enc:'));
      const sanitizedDescription = isDescEncrypted
        ? description.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 50000)
        : sanitizeInput(description).slice(0, 5000);
      const sanitizedPriority = sanitizePriority(priority);

      // Validate due date — accept ISO date string (YYYY-MM-DD) only
      const sanitizedDue = typeof due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : undefined;

      const task = await createTask({
        title: sanitizedTitle,
        description: sanitizedDescription,
        priority: sanitizedPriority,
        entry_id,
        user_id: userId,
        ...(sanitizedDue ? { due: sanitizedDue } : {}),
      });
      return res.status(201).json({ task });
    }

    res.setHeader('Allow', 'GET,POST');
    res.status(405).end('Method Not Allowed');
  });
}

export default withErrorHandler(handler);
