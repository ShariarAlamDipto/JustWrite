import { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';

type CacheableItem = {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export function createListEtag(items: CacheableItem[]): string {
  const hash = createHash('sha1');
  hash.update(String(items.length));

  // Include each item identity/timestamps to avoid stale 304 when middle items change.
  for (const item of items) {
    hash.update('|');
    hash.update(item.id ?? '');
    hash.update(':');
    hash.update(item.updated_at ?? item.created_at ?? '');
  }

  return `W/"${hash.digest('hex')}"`;
}

export function setRevalidateHeaders(res: NextApiResponse, etag: string) {
  res.setHeader('ETag', etag);
  res.setHeader('Vary', 'Authorization');
  res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate, stale-while-revalidate=300');
}

export function isNotModified(req: NextApiRequest, etag: string): boolean {
  return req.headers['if-none-match'] === etag;
}