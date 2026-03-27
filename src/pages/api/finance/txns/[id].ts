import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/withAuth';
import { supabase } from '@/lib/supabase';
import { checkRateLimit, isValidUUID } from '@/lib/security';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {

    // Rate limit: 60 requests per minute per user
    const rl = checkRateLimit(`finance_txns_delete:${userId}`, 60, 60000);
    if (!rl.allowed) return res.status(429).json({ error: 'Too many requests. Please try again later.' });

    // DELETE /api/finance/txns/[id]
    if (req.method === 'DELETE') {
      const id = typeof req.query.id === 'string' ? req.query.id : null;
      if (!id || !isValidUUID(id)) return res.status(400).json({ error: 'id must be a valid UUID' });

      const { error, count } = await supabase
        .from('finance_txns')
        .delete({ count: 'exact' })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) return res.status(500).json({ error: 'Failed to delete transaction.' });
      if (count === 0) return res.status(404).json({ error: 'Transaction not found' });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  });
}
