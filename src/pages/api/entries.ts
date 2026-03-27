import { NextApiRequest, NextApiResponse } from 'next';
import { createEntry, listEntries } from '../../lib/storage';
import { withAuth } from '../../lib/withAuth';
import { sanitizeInput, validateContentLength, checkRateLimit } from '../../lib/security';
import { withErrorHandler } from '../../lib/apiHelpers';
import { createListEtag, isNotModified, setRevalidateHeaders } from '../../lib/httpCache';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    const rateLimit = checkRateLimit(userId, 100, 60000);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());

    if (req.method === 'GET') {
      const lockedParam = req.query.locked;
      const rawLimit = Number.parseInt(String(req.query.limit ?? '100'), 10);
      const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(200, rawLimit)) : 100;
      const since = typeof req.query.since === 'string' ? req.query.since : undefined;
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

      const entries = await listEntries(userId, {
        locked: lockedParam !== undefined ? lockedParam === 'true' : false,
        limit,
        since,
        cursor,
      });

      const etag = createListEtag(entries);
      setRevalidateHeaders(res, etag);
      if (isNotModified(req, etag)) {
        return res.status(304).end();
      }

      const nextCursor = entries.length === limit ? entries[entries.length - 1]?.created_at ?? null : null;
      return res.status(200).json({
        entries,
        meta: {
          limit,
          nextCursor,
          hasMore: entries.length === limit,
        },
      });
    }

    if (req.method === 'POST') {
      const { content, source = 'text', created_at, mood, is_locked } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'content required' });
      }

      // Skip HTML/JS injection scrubbing for encrypted payloads (base64 is safe on the server;
      // client-side rendering never injects it as raw HTML). Only strip control chars + enforce length.
      const isEncryptedPayload = typeof content === 'string' &&
        (content.startsWith('enc2:') || content.startsWith('enc:'));
      const sanitizedContent = isEncryptedPayload
        ? content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 100000)
        : sanitizeInput(content);
      if (!validateContentLength(sanitizedContent, isEncryptedPayload ? 100000 : 50000)) {
        return res.status(400).json({ error: 'Content too long' });
      }

      const entry = await createEntry({
        content: sanitizedContent,
        source: sanitizeInput(source).slice(0, 50),
        created_at,
        user_id: userId,
        mood: typeof mood === 'number' ? Math.min(100, Math.max(0, mood)) : null,
        is_locked: is_locked === true,
      });
      return res.status(201).json({ entry });
    }

    res.setHeader('Allow', 'GET,POST');
    res.status(405).end('Method Not Allowed');
  });
}

export default withErrorHandler(handler);
