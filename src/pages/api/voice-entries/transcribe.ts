import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/withAuth';
import { checkRateLimit } from '../../../lib/security';
import { withErrorHandler } from '../../../lib/apiHelpers';

// Disable default body parser - we receive multipart form data
export const config = { api: { bodyParser: false } };

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_AUDIO_BYTES + 1024 * 1024;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

type ParseResult =
  | { audioBuffer: Buffer; mimeType: string }
  | { error: 'too_large' | 'invalid' };

async function parseMultipart(req: NextApiRequest): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let mimeType = 'audio/webm';
    let totalBytes = 0;
    let finalized = false;

    const contentType = req.headers['content-type'] || '';
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) return resolve({ error: 'invalid' });

    const contentLengthHeader = req.headers['content-length'];
    const parsedContentLength = typeof contentLengthHeader === 'string'
      ? Number.parseInt(contentLengthHeader, 10)
      : 0;

    if (Number.isFinite(parsedContentLength) && parsedContentLength > MAX_MULTIPART_BYTES) {
      return resolve({ error: 'too_large' });
    }

    req.on('data', (chunk: Buffer) => {
      if (finalized) return;

      totalBytes += chunk.length;
      if (totalBytes > MAX_MULTIPART_BYTES) {
        finalized = true;
        req.pause();
        return resolve({ error: 'too_large' });
      }

      chunks.push(chunk);
    });

    req.on('error', reject);
    req.on('end', () => {
      if (finalized) {
        return;
      }

      const body = Buffer.concat(chunks).toString('binary');
      const boundaryDelim = `--${boundary}`;
      const parts = body.split(boundaryDelim).slice(1, -1);

      for (const part of parts) {
        const [rawHeaders, ...rawBodyParts] = part.split('\r\n\r\n');
        const headers = rawHeaders.toLowerCase();
        if (!headers.includes('name="audio"')) continue;

        const mimeMatch = rawHeaders.match(/content-type:\s*([^\r\n]+)/i);
        if (mimeMatch) mimeType = mimeMatch[1].trim();

        const audioBody = rawBodyParts.join('\r\n\r\n').replace(/\r\n$/, '');
        const audioBuffer = Buffer.from(audioBody, 'binary');

        if (audioBuffer.length > MAX_AUDIO_BYTES) {
          return resolve({ error: 'too_large' });
        }

        return resolve({ audioBuffer, mimeType });
      }

      return resolve({ error: 'invalid' });
    });
  });
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  return withAuth(req, res, async (req, res, userId) => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).end('Method Not Allowed');
    }

    // Rate limit: transcription is expensive
    const rateLimit = checkRateLimit(userId, 20, 60000);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: 'Too many transcription requests. Please wait.' });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(503).json({ error: 'Transcription service not configured' });
    }

    const parsed = await parseMultipart(req);
    if ('error' in parsed) {
      if (parsed.error === 'too_large') {
        return res.status(413).json({ error: 'Audio file too large (max 25MB)' });
      }
      return res.status(400).json({ error: 'No audio file found in request' });
    }

    const { audioBuffer, mimeType } = parsed;

    try {
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: mimeType });
      const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('mp3') ? 'mp3' : 'webm';
      formData.append('file', blob, `audio.${ext}`);
      formData.append('model', 'whisper-large-v3');
      formData.append('response_format', 'json');

      const groqRes = await fetchWithTimeout('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqApiKey}` },
        body: formData,
      }, 30000);

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        console.error('Groq transcription error:', errText);
        return res.status(502).json({ error: 'Transcription failed' });
      }

      const result = await groqRes.json() as { text: string };
      const transcript = result.text?.trim() || '';

      const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for',
        'of','with','by','from','is','was','are','were','be','been','have','has','had',
        'do','did','will','would','could','should','may','might','this','that','these',
        'those','i','you','he','she','we','they','it','my','your','his','her','our','its']);

      const keywords = [...new Set(
        transcript.toLowerCase()
          .replace(/[^a-z\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 3 && !stopWords.has(w))
      )].slice(0, 20);

      return res.status(200).json({ transcript, keywords });
    } catch (err) {
      console.error('Transcription error:', err);
      return res.status(500).json({ error: 'Transcription failed' });
    }
  });
}

export default withErrorHandler(handler);