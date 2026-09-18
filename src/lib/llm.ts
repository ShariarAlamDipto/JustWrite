/**
 * Groq model used for all text extraction.
 *
 * Keep this as the single definition. The app previously hard-coded
 * `llama-3.3-70b-versatile` in several places; Groq decommissioned it, and
 * every AI feature failed at once with no obvious cause. Verify a replacement
 * against `GET https://api.groq.com/openai/v1/models` before changing it.
 *
 * gpt-oss-20b is chosen over 120b to roughly halve cost; both returned
 * identical task extraction on test input. groq/compound-mini looks cheaper
 * by name but spends ~700 prompt tokens per call on its own scaffolding.
 */
export const GROQ_CHAT_MODEL = 'openai/gpt-oss-20b';

/** Groq rejects any audio container outside this set with a 400. */
export const GROQ_AUDIO_MODEL = 'whisper-large-v3-turbo';

export const GROQ_SUPPORTED_AUDIO_EXTENSIONS = [
  'flac', 'mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'ogg', 'opus', 'wav', 'webm',
] as const;

type GroqChatOptions = {
  url: string;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  /** Ask Groq to guarantee parseable JSON instead of hoping for it. */
  jsonObject?: boolean;
  timeoutMs?: number;
  fetchImpl?: (url: string, init: RequestInit, timeoutMs: number) => Promise<Response>;
};

async function defaultFetch(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Posts an OpenAI-compatible chat completion to Groq and returns the assistant
 * message text. Throws with the server's own error message so a decommissioned
 * model or bad key is visible in logs rather than being swallowed.
 */
export async function groqChat({
  url,
  apiKey,
  systemPrompt,
  userPrompt,
  maxTokens = 2000,
  jsonObject = true,
  timeoutMs = 20000,
  fetchImpl = defaultFetch,
}: GroqChatOptions): Promise<string> {
  const body: Record<string, unknown> = {
    model: GROQ_CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.3,
  };

  if (jsonObject) {
    body.response_format = { type: 'json_object' };
  }

  const resp = await fetchImpl(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    },
    timeoutMs
  );

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`Groq request failed (${resp.status}): ${detail.slice(0, 300)}`);
  }

  const json = await resp.json();
  const content = json?.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Groq returned no message content');
  }

  return content;
}

/** Pulls the first JSON object out of a model response, tolerating stray prose. */
export function parseJsonObject<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1)) as T;
    }
    throw new Error('Model response was not JSON');
  }
}

/**
 * Maps an audio mime type to an extension Groq's transcription endpoint accepts.
 * Falls back to webm (what browser MediaRecorder produces) rather than passing
 * through an unsupported extension that would be rejected with a 400.
 */
export function groqAudioExtension(mimeType: string): string {
  const subtype = mimeType.split(';')[0].trim().toLowerCase().split('/')[1] ?? '';
  const direct: Record<string, string> = {
    webm: 'webm',
    ogg: 'ogg',
    opus: 'opus',
    wav: 'wav',
    'x-wav': 'wav',
    wave: 'wav',
    flac: 'flac',
    mpeg: 'mp3',
    mp3: 'mp3',
    mp4: 'm4a',
    'x-m4a': 'm4a',
    m4a: 'm4a',
    aac: 'm4a',
  };
  return direct[subtype] ?? 'webm';
}
