import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

// SECURITY: Token format validation
const isValidJWT = (token: string): boolean => {
  // JWT format: header.payload.signature (3 parts separated by dots)
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  // Each part should be base64url encoded
  const base64urlRegex = /^[A-Za-z0-9_-]+$/;
  return parts.every(part => part.length > 0 && base64urlRegex.test(part));
};

export async function withAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  handler: (req: NextApiRequest, res: NextApiResponse, userId: string) => Promise<void | NextApiResponse<any>>
) {
  // SECURITY: Extract and validate token format
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.slice(7); // Remove 'Bearer ' prefix
  
  // SECURITY: Basic token format validation before hitting Supabase
  if (!token || token.length < 10 || !isValidJWT(token)) {
    return res.status(401).json({ error: 'Invalid token format' });
  }

  if (!supabase) {
    return res.status(401).json({ error: 'Authentication service unavailable' });
  }

  // SECURITY: Validate token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    // SECURITY: Don't expose specific error details
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // SECURITY: Verify user ID is valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(user.id)) {
    return res.status(401).json({ error: 'Invalid user identity' });
  }

  return handler(req, res, user.id);
}
