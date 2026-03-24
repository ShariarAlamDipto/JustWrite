import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/withAuth';
import { checkRateLimit } from '../../../lib/security';
import { createClient } from '@supabase/supabase-js';

// Disable default body parser — we receive multipart form data
export const config = { api: { bodyParser: false } };

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

async function parseMultipart(req: NextApiRequest): Promise<{ audioBuffer: Buffer; mimeType: string } | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let mimeType = 'audio/webm';

    const contentType = req.headers['content-type'] || '';
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) return resolve(null);

    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('error', reject);
    req.on('end', () => {
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
        resolve({ audioBuffer: Buffer.from(audioBody, 'binary'), mimeType });
        return;
      }
      resolve(null);
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    if (!parsed) {
      return res.status(400).json({ error: 'No audio file found in request' });
    }

    const { audioBuffer, mimeType } = parsed;

    if (audioBuffer.length > 25 * 1024 * 1024) {
      return res.status(400).json({ error: 'Audio file too large (max 25MB)' });
    }

    try {
      // Send to Groq Whisper API
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: mimeType });
      const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('mp3') ? 'mp3' : 'webm';
      formData.append('file', blob, `audio.${ext}`);
      formData.append('model', 'whisper-large-v3');
      formData.append('response_format', 'json');

      const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqApiKey}` },
        body: formData,
      });

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        console.error('Groq transcription error:', errText);
        return res.status(502).json({ error: 'Transcription failed' });
      }

      const result = await groqRes.json() as { text: string };
      const transcript = result.text?.trim() || '';

      // Extract simple keywords from transcript (stop-word filtered)
      const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for',
        'of','with','by','from','is','was','are','were','be','been','have','has','had',
        'do','did','will','would','could','should','may','might','this','that','these',
        'those','i','you','he','she','we','they','it','my','your','his','her','our','its']);

      const keywords = [...new Set(
        transcript.toLowerCase()
          .replace(/[^a-z\s]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length > 3 && !stopWords.has(w))
      )].slice(0, 20);

      return res.status(200).json({ transcript, keywords });
    } catch (err) {
      console.error('Transcription error:', err);
      return res.status(500).json({ error: 'Transcription failed' });
    }
  });
}
