import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/withAuth';
import { supabase } from '@/lib/supabase';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {

    // POST /api/finance/txns — add income or expense
    if (req.method === 'POST') {
      const { day_id, kind, amount, category, note } = req.body;
      if (!day_id) return res.status(400).json({ error: 'day_id required' });
      if (!kind || !['income', 'expense'].includes(kind))
        return res.status(400).json({ error: 'kind must be income or expense' });
      const amt = Number(amount);
      if (!amt || amt <= 0) return res.status(400).json({ error: 'amount must be positive' });

      // Verify day belongs to user
      const { data: day } = await supabase
        .from('finance_days')
        .select('id')
        .eq('id', day_id)
        .eq('user_id', userId)
        .single();
      if (!day) return res.status(403).json({ error: 'Day not found' });

      const { data, error } = await supabase
        .from('finance_txns')
        .insert({ user_id: userId, day_id, kind, amount: amt, category: category ?? null, note: note ?? null })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ txn: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  });
}
