import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export async function withAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  handler: (req: NextApiRequest, res: NextApiResponse, userId: string) => Promise<void | NextApiResponse<any>>
) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token || !supabase) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // SECURITY: Validate token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    // SECURITY: Don't expose specific error details
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  return handler(req, res, user.id);
}
