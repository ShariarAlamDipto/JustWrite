import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/withAuth';
import { supabase } from '@/lib/supabase';
import { checkRateLimit, isValidUUID, sanitizeInput } from '@/lib/security';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {

    // Rate limit: 60 requests per minute per user
    const rl = checkRateLimit(`finance_txns:${userId}`, 60, 60000);
    if (!rl.allowed) return res.status(429).json({ error: 'Too many requests. Please try again later.' });

    // POST /api/finance/txns — add income or expense
    if (req.method === 'POST') {
      const { day_id, kind, amount, category, note } = req.body;

      if (!day_id || !isValidUUID(day_id)) return res.status(400).json({ error: 'day_id must be a valid UUID' });
      if (!kind || !['income', 'expense'].includes(kind))
        return res.status(400).json({ error: 'kind must be income or expense' });

      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0)
        return res.status(400).json({ error: 'amount must be a positive finite number' });
      const safeAmt = Math.round(amt * 100) / 100;

      const safeCategory = category ? sanitizeInput(String(category)).slice(0, 100) || null : null;
      const safeNote     = note     ? sanitizeInput(String(note)).slice(0, 500)     || null : null;

      // Verify day belongs to user and is still open
      const { data: day } = await supabase
        .from('finance_days')
        .select('id, status')
        .eq('id', day_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (!day) return res.status(404).json({ error: 'Day not found' });
      if (day.status === 'closed') return res.status(409).json({ error: 'Cannot add transactions to a closed day' });

      const { data, error } = await supabase
        .from('finance_txns')
        .insert({ user_id: userId, day_id, kind, amount: safeAmt, category: safeCategory, note: safeNote })
        .select()
        .single();

      if (error) return res.status(500).json({ error: 'Failed to add transaction.' });
      return res.status(201).json({ txn: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  });
}
