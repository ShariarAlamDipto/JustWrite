import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/withAuth';
import { supabase } from '@/lib/supabase';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {

    // DELETE /api/finance/txns/[id]
    if (req.method === 'DELETE') {
      const id = typeof req.query.id === 'string' ? req.query.id : null;
      if (!id) return res.status(400).json({ error: 'id required' });

      const { error } = await supabase
        .from('finance_txns')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  });
}
