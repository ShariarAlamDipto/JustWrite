import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/withAuth';
import { supabase } from '@/lib/supabase';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {

    // GET /api/finance/days — list recent days (last 30)
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('finance_days')
        .select('*, finance_txns(id, kind, amount, category, note, created_at)')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(30);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ days: data ?? [] });
    }

    // POST /api/finance/days — upsert a day (by date)
    if (req.method === 'POST') {
      const { date, start_spendable, start_reserve } = req.body;
      if (!date) return res.status(400).json({ error: 'date required' });

      const { data, error } = await supabase
        .from('finance_days')
        .upsert(
          {
            user_id: userId,
            date,
            start_spendable: Number(start_spendable ?? 0),
            start_reserve: Number(start_reserve ?? 0),
            status: 'open',
          },
          { onConflict: 'user_id,date', ignoreDuplicates: false }
        )
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ day: data });
    }

    // PATCH /api/finance/days — close day (set end balances)
    if (req.method === 'PATCH') {
      const { id, end_spendable, end_reserve, notes, status } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });

      const update: Record<string, unknown> = {};
      if (end_spendable !== undefined) update.end_spendable = Number(end_spendable);
      if (end_reserve   !== undefined) update.end_reserve   = Number(end_reserve);
      if (notes         !== undefined) update.notes         = notes;
      if (status        !== undefined) update.status        = status;

      const { data, error } = await supabase
        .from('finance_days')
        .update(update)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ day: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  });
}
