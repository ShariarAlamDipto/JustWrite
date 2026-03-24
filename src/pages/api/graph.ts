import { NextApiRequest, NextApiResponse } from 'next';
import { getGraphData } from '../../lib/storage';
import { withAuth } from '../../lib/withAuth';
import { checkRateLimit } from '../../lib/security';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).end('Method Not Allowed');
    }

    const rateLimit = checkRateLimit(userId, 30, 60000);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    try {
      const { nodes, links } = await getGraphData(userId);
      return res.status(200).json({ nodes, links });
    } catch (err) {
      console.error('graph API error:', err);
      return res.status(500).json({ error: 'Failed to load graph data' });
    }
  });
}
