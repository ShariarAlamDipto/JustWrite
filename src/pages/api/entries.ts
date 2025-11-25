import { NextApiRequest, NextApiResponse } from 'next';
import { createEntry, listEntries, getEntryById } from '../../lib/storage';
import { withAuth } from '../../lib/withAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    if (req.method === 'GET') {
      // TODO: Filter entries by userId when storage layer supports it
      const entries = await listEntries();
      return res.status(200).json({ entries });
    }

    if (req.method === 'POST') {
      const { content, source = 'text', created_at } = req.body;
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'content required' });
      }

      // TODO: Pass userId to storage layer
      const entry = await createEntry({ content, source, created_at });
      return res.status(201).json({ entry });
    }

    res.setHeader('Allow', 'GET,POST');
    res.status(405).end('Method Not Allowed');
  });
}
