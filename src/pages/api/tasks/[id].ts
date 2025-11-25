import { NextApiRequest, NextApiResponse } from 'next';
import { updateTask, listTasks, createTask } from '../../../lib/storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || Array.isArray(id)) return res.status(400).json({ error: 'invalid id' });

  // using storage.updateTask
  if (req.method === 'PATCH') {
    const patch = req.body;
    try {
      const task = await updateTask(id, patch);
      return res.status(200).json({ task });
    } catch (e: any) {
      return res.status(404).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await updateTask(id, { status: 'archived' });
      return res.status(200).json({ ok: true });
    } catch (e: any) {
      return res.status(404).json({ error: e.message });
    }
  }

  if (req.method === 'GET') {
    const tasks = await listTasks();
    const task = tasks.find((t: any) => t.id === id);
    if (!task) return res.status(404).json({ error: 'task not found' });
    return res.status(200).json({ task });
  }

  res.setHeader('Allow', 'GET,PATCH,DELETE');
  res.status(405).end('Method Not Allowed');
}
