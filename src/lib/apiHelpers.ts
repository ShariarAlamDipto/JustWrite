import { NextApiRequest, NextApiResponse } from 'next';

type ApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<void | NextApiResponse>;

/**
 * Wraps a Next.js API handler with a top-level try/catch.
 * Any uncaught error returns a 500 rather than crashing the serverless function.
 */
export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      console.error('[API error]', req.method, req.url, message, err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
}

/**
 * Sets Cache-Control headers for read-heavy GET endpoints.
 * Uses `private` to prevent shared/CDN caching of authenticated data.
 */
export function setCacheHeaders(res: NextApiResponse, maxAgeSeconds: number) {
  res.setHeader('Cache-Control', `private, max-age=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 2}`);
}

/**
 * Sends a 405 Method Not Allowed response with the correct Allow header.
 */
export function methodNotAllowed(res: NextApiResponse, allowed: string[]) {
  res.setHeader('Allow', allowed.join(','));
  res.status(405).end('Method Not Allowed');
}
