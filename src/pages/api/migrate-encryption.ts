import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../lib/withAuth';
import { updateEntry, updateTask } from '../../lib/storage';
import { isValidUUID, checkRateLimit } from '../../lib/security';
import { withErrorHandler } from '../../lib/apiHelpers';

/**
 * Migration endpoint to re-encrypt existing entries client-side.
 * 
 * This is called from the client after login to migrate unencrypted entries.
 * The client sends the encrypted versions of their data.
 * 
 * POST /api/migrate-encryption
 * Body: { entries: [{id, content}], tasks: [{id, title, description}] }
 */
const MAX_BATCH = 500;
const MAX_CONTENT_LENGTH = 200_000; // encrypted content is larger than plain

async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).end('Method Not Allowed');
    }

    const rateLimit = checkRateLimit(userId, 10, 60000);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    const { entries, tasks } = req.body;

    if (Array.isArray(entries) && entries.length > MAX_BATCH) {
      return res.status(400).json({ error: `Too many entries. Max ${MAX_BATCH} per request.` });
    }
    if (Array.isArray(tasks) && tasks.length > MAX_BATCH) {
      return res.status(400).json({ error: `Too many tasks. Max ${MAX_BATCH} per request.` });
    }

    let entriesUpdated = 0;
    let tasksUpdated = 0;
    let errorCount = 0;

    if (Array.isArray(entries)) {
      for (const entry of entries) {
        try {
          if (
            entry.id && isValidUUID(String(entry.id)) &&
            typeof entry.content === 'string' &&
            entry.content.length > 0 &&
            entry.content.length <= MAX_CONTENT_LENGTH
          ) {
            await updateEntry(entry.id, { content: entry.content }, userId);
            entriesUpdated++;
          }
        } catch {
          errorCount++;
        }
      }
    }

    if (Array.isArray(tasks)) {
      for (const task of tasks) {
        try {
          if (task.id && isValidUUID(String(task.id)) && (task.title || task.description)) {
            const updates: Record<string, string> = {};
            if (typeof task.title === 'string' && task.title.length <= 500) {
              updates.title = task.title;
            }
            if (typeof task.description === 'string' && task.description.length <= MAX_CONTENT_LENGTH) {
              updates.description = task.description;
            }
            if (Object.keys(updates).length > 0) {
              await updateTask(task.id, updates, userId);
              tasksUpdated++;
            }
          }
        } catch {
          errorCount++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      entriesUpdated,
      tasksUpdated,
      ...(errorCount > 0 ? { errors: errorCount } : {}),
    });
  });
}

export default withErrorHandler(handler);
