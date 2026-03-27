import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/withAuth';
import { supabase } from '@/lib/supabase';
import { checkRateLimit, isValidUUID, sanitizeInput } from '@/lib/security';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES = ['open', 'closed'] as const;

function safeAmount(val: unknown): number | null {
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {

    // Rate limit: 60 requests per minute per user
    const rl = checkRateLimit(`finance_days:${userId}`, 60, 60000);
    if (!rl.allowed) return res.status(429).json({ error: 'Too many requests. Please try again later.' });

    // GET /api/finance/days — list recent days (last 30) with nested txns
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('finance_days')
        .select('id, date, status, start_spendable, end_spendable, start_reserve, end_reserve, notes, created_at, updated_at, finance_txns(id, kind, amount, category, note, created_at)')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(30);

      if (error) return res.status(500).json({ error: 'Failed to load days.' });
      return res.status(200).json({ days: data ?? [] });
    }

    // POST /api/finance/days — create today's day (insert-only; use PATCH to update)
    if (req.method === 'POST') {
      const { date, start_spendable, start_reserve } = req.body;

      if (!date || typeof date !== 'string' || !ISO_DATE_RE.test(date) || isNaN(Date.parse(date))) {
        return res.status(400).json({ error: 'date must be a valid YYYY-MM-DD string' });
      }
      const sp = safeAmount(start_spendable ?? 0);
      const sr = safeAmount(start_reserve ?? 0);
      if (sp === null) return res.status(400).json({ error: 'start_spendable must be a non-negative number' });
      if (sr === null) return res.status(400).json({ error: 'start_reserve must be a non-negative number' });

      // Return existing day if already started (idempotent — never overwrite status or end balances)
      const { data: existing } = await supabase
        .from('finance_days')
        .select('id, date, status, start_spendable, end_spendable, start_reserve, end_reserve, notes, created_at, updated_at, finance_txns(id, kind, amount, category, note, created_at)')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();

      if (existing) return res.status(200).json({ day: existing });

      const { data, error } = await supabase
        .from('finance_days')
        .insert({ user_id: userId, date, start_spendable: sp, start_reserve: sr, status: 'open' })
        .select('id, date, status, start_spendable, end_spendable, start_reserve, end_reserve, notes, created_at, updated_at')
        .single();

      if (error) return res.status(500).json({ error: 'Failed to create day.' });
      return res.status(201).json({ day: { ...data, finance_txns: [] } });
    }

    // PATCH /api/finance/days — update balances, notes, or close the day
    if (req.method === 'PATCH') {
      const { id, end_spendable, end_reserve, notes, status } = req.body;

      if (!id || !isValidUUID(id)) return res.status(400).json({ error: 'id must be a valid UUID' });

      // Verify ownership and get current status (prevents editing another user's day)
      const { data: existing } = await supabase
        .from('finance_days')
        .select('status')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (!existing) return res.status(404).json({ error: 'Day not found' });
      if (existing.status === 'closed') {
        return res.status(409).json({ error: 'Cannot edit a closed day' });
      }

      const update: Record<string, unknown> = {};

      if (end_spendable !== undefined) {
        const v = safeAmount(end_spendable);
        if (v === null) return res.status(400).json({ error: 'end_spendable must be a non-negative number' });
        update.end_spendable = v;
      }
      if (end_reserve !== undefined) {
        const v = safeAmount(end_reserve);
        if (v === null) return res.status(400).json({ error: 'end_reserve must be a non-negative number' });
        update.end_reserve = v;
      }
      if (notes !== undefined) {
        update.notes = sanitizeInput(String(notes)).slice(0, 2000) || null;
      }
      if (status !== undefined) {
        if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
          return res.status(400).json({ error: 'status must be open or closed' });
        }
        update.status = status;
      }

      if (Object.keys(update).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const { data, error } = await supabase
        .from('finance_days')
        .update(update)
        .eq('id', id)
        .eq('user_id', userId)
        .select('id, date, status, start_spendable, end_spendable, start_reserve, end_reserve, notes, created_at, updated_at')
        .single();

      if (error) return res.status(500).json({ error: 'Failed to update day.' });
      return res.status(200).json({ day: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  });
}
