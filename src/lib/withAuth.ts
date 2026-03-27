import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

// SECURITY: Token format validation
const isValidJWT = (token: string): boolean => {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const base64urlRegex = /^[A-Za-z0-9_-]+$/;
  return parts.every(part => part.length > 0 && base64urlRegex.test(part));
};

// ── Auth cache ───────────────────────────────────────────────────────────────
// Caches userId keyed by token for 60 seconds per serverless instance.
// Eliminates the Supabase auth.getUser() network round-trip on every request
// after the first one — the single biggest contributor to slow API response times.

const AUTH_CACHE = new Map<string, { userId: string; expiresAt: number }>();
const AUTH_CACHE_TTL_MS = 60_000; // 1 minute
const AUTH_CACHE_MAX_SIZE = 500;  // prevent unbounded growth

function getCachedUserId(token: string): string | null {
  const entry = AUTH_CACHE.get(token);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    AUTH_CACHE.delete(token);
    return null;
  }
  return entry.userId;
}

function setCachedUserId(token: string, userId: string): void {
  // Evict oldest entry when at capacity
  if (AUTH_CACHE.size >= AUTH_CACHE_MAX_SIZE) {
    const oldestKey = AUTH_CACHE.keys().next().value;
    if (oldestKey) AUTH_CACHE.delete(oldestKey);
  }
  AUTH_CACHE.set(token, { userId, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
}

// ── UUID validation ──────────────────────────────────────────────────────────
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function withAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  handler: (req: NextApiRequest, res: NextApiResponse, userId: string, accessToken: string) => Promise<void | NextApiResponse<unknown>>
) {
  // Extract token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);

  if (!token || token.length < 10 || !isValidJWT(token)) {
    return res.status(401).json({ error: 'Invalid token format' });
  }

  if (!supabase) {
    return res.status(401).json({ error: 'Authentication service unavailable' });
  }

  // ── Fast path: use cached userId if available ──────────────────────────────
  const cachedId = getCachedUserId(token);
  if (cachedId) {
    return handler(req, res, cachedId, token);
  }

  // ── Slow path: verify with Supabase (only on first request or after TTL) ───
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  if (!uuidRegex.test(user.id)) {
    return res.status(401).json({ error: 'Invalid user identity' });
  }

  // Cache and proceed
  setCachedUserId(token, user.id);
  return handler(req, res, user.id, token);
}
