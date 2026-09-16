import { NextApiRequest } from 'next';

export type MultipartFile = { buffer: Buffer; mimeType: string; fields: Record<string, string> };
export type MultipartResult = MultipartFile | { error: 'too_large' | 'invalid' };

export function isMultipartError(
  result: MultipartResult
): result is { error: 'too_large' | 'invalid' } {
  return 'error' in result;
}

/**
 * Minimal multipart/form-data reader for a single binary field plus any simple
 * text fields. Streams are capped before buffering so an oversized upload is
 * rejected without being held in memory.
 */
export function parseMultipart(
  req: NextApiRequest,
  options: { fileField: string; maxFileBytes: number; defaultMimeType?: string }
): Promise<MultipartResult> {
  const { fileField, maxFileBytes, defaultMimeType = 'application/octet-stream' } = options;
  const maxTotalBytes = maxFileBytes + 1024 * 1024;

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let finalized = false;

    const contentType = req.headers['content-type'] || '';
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) return resolve({ error: 'invalid' });

    const contentLengthHeader = req.headers['content-length'];
    const declaredLength = typeof contentLengthHeader === 'string'
      ? Number.parseInt(contentLengthHeader, 10)
      : 0;

    if (Number.isFinite(declaredLength) && declaredLength > maxTotalBytes) {
      return resolve({ error: 'too_large' });
    }

    req.on('data', (chunk: Buffer) => {
      if (finalized) return;

      totalBytes += chunk.length;
      if (totalBytes > maxTotalBytes) {
        finalized = true;
        req.pause();
        return resolve({ error: 'too_large' });
      }

      chunks.push(chunk);
    });

    req.on('error', reject);
    req.on('end', () => {
      if (finalized) return;

      const body = Buffer.concat(chunks).toString('binary');
      const parts = body.split(`--${boundary}`).slice(1, -1);

      const fields: Record<string, string> = {};
      let file: { buffer: Buffer; mimeType: string } | null = null;

      for (const part of parts) {
        const [rawHeaders, ...rawBodyParts] = part.split('\r\n\r\n');
        if (rawBodyParts.length === 0) continue;

        const nameMatch = rawHeaders.match(/name="([^"]+)"/i);
        if (!nameMatch) continue;
        const name = nameMatch[1];

        const rawBody = rawBodyParts.join('\r\n\r\n').replace(/\r\n$/, '');

        if (name === fileField) {
          const mimeMatch = rawHeaders.match(/content-type:\s*([^\r\n]+)/i);
          const buffer = Buffer.from(rawBody, 'binary');
          if (buffer.length > maxFileBytes) return resolve({ error: 'too_large' });
          file = { buffer, mimeType: mimeMatch ? mimeMatch[1].trim() : defaultMimeType };
        } else {
          fields[name] = Buffer.from(rawBody, 'binary').toString('utf8');
        }
      }

      if (!file) return resolve({ error: 'invalid' });
      return resolve({ ...file, fields });
    });
  });
}
