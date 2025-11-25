import { NextApiRequest, NextApiResponse } from 'next';
import { listTasks, createTask } from '../../../lib/storage';
import { withAuth } from '../../../lib/withAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    if (req.method === 'GET') {
      // TODO: Filter tasks by userId when storage layer supports it
      const tasks = await listTasks();
      return res.status(200).json({ tasks });
    }

    if (req.method === 'POST') {
      const { title, description = '', priority = 'medium', entry_id = null } = req.body;
      if (!title || title.trim().length === 0) return res.status(400).json({ error: 'title required' });
      // TODO: Pass userId to storage layer
      const task = await createTask({ title, description, priority, entry_id });
      return res.status(201).json({ task });
    }

    res.setHeader('Allow', 'GET,POST');
    res.status(405).end('Method Not Allowed');
  });
}
