import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export async function withAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  handler: (req: NextApiRequest, res: NextApiResponse, userId: string) => Promise<void>
) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token || !supabase) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  return handler(req, res, user.id);
}
