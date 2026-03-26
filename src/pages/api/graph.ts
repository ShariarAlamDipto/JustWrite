import { NextApiRequest, NextApiResponse } from 'next';
import { getGraphData } from '../../lib/storage';
import { withAuth } from '../../lib/withAuth';
import { checkRateLimit } from '../../lib/security';
import { setCacheHeaders, withErrorHandler } from '../../lib/apiHelpers';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).end('Method Not Allowed');
    }

    const rateLimit = checkRateLimit(userId, 30, 60000);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    setCacheHeaders(res, 60); // graph data: cache 60s, stale-while-revalidate 120s
    const { nodes, links } = await getGraphData(userId);
    return res.status(200).json({ nodes, links });
  });
}

export default withErrorHandler(handler);
