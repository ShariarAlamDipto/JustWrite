import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../lib/withAuth';
import { updateEntry, updateTask } from '../../lib/storage';

/**
 * Migration endpoint to re-encrypt existing entries client-side.
 * 
 * This is called from the client after login to migrate unencrypted entries.
 * The client sends the encrypted versions of their data.
 * 
 * POST /api/migrate-encryption
 * Body: { entries: [{id, content}], tasks: [{id, title, description}] }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).end('Method Not Allowed');
    }

    const { entries, tasks } = req.body;
    
    let entriesUpdated = 0;
    let tasksUpdated = 0;
    const errors: string[] = [];

    // Update entries
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        try {
          if (entry.id && entry.content) {
            await updateEntry(entry.id, { content: entry.content }, userId);
            entriesUpdated++;
          }
        } catch (e) {
          errors.push(`Entry ${entry.id}: ${e}`);
        }
      }
    }

    // Update tasks
    if (Array.isArray(tasks)) {
      for (const task of tasks) {
        try {
          if (task.id && (task.title || task.description)) {
            await updateTask(task.id, { 
              title: task.title, 
              description: task.description 
            }, userId);
            tasksUpdated++;
          }
        } catch (e) {
          errors.push(`Task ${task.id}: ${e}`);
        }
      }
    }

    return res.status(200).json({
      success: true,
      entriesUpdated,
      tasksUpdated,
      errors: errors.length > 0 ? errors : undefined
    });
  });
}
