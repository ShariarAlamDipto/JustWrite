import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/withAuth';
import { checkRateLimit } from '../../../lib/security';
import { withErrorHandler } from '../../../lib/apiHelpers';
import { parseMultipart, isMultipartError } from '../../../lib/multipart';
import { MAX_AUDIO_BYTES } from '../../../lib/voiceStorage';

// Disable default body parser - we receive multipart form data
export const config = { api: { bodyParser: false } };

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

    const parsed = await parseMultipart(req, {
      fileField: 'audio',
      maxFileBytes: MAX_AUDIO_BYTES,
      defaultMimeType: 'audio/webm',
    });
    if (isMultipartError(parsed)) {
      if (parsed.error === 'too_large') {
        return res.status(413).json({ error: 'Audio file too large (max 25MB)' });
      }
      return res.status(400).json({ error: 'No audio file found in request' });
    }

    const { buffer: audioBuffer, mimeType } = parsed;

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