import type { SupabaseClient } from '@supabase/supabase-js';

export const VOICE_BUCKET = 'voice-recordings';

/** How long a playback URL stays valid. Refreshed on every list fetch. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const EXTENSION_BY_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
};

export function extensionForMime(mimeType: string): string {
  return EXTENSION_BY_MIME[mimeType.split(';')[0].trim().toLowerCase()] ?? 'webm';
}

/**
 * Objects are namespaced by user so a stray path can never address another
 * user's audio, even if the bucket is ever exposed directly.
 */
export function buildStoragePath(userId: string, entryId: string, extension: string): string {
  return `${userId}/${entryId}.${extension}`;
}

/** Reject anything that is not a plain `<userId>/<file>` path owned by this user. */
export function isOwnedStoragePath(path: unknown, userId: string): path is string {
  return (
    typeof path === 'string' &&
    path.length > 0 &&
    !path.includes('..') &&
    path.startsWith(`${userId}/`)
  );
}

type MetadataLike = Record<string, unknown> | null | undefined;

export function storagePathFromMetadata(metadata: MetadataLike): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const path = (metadata as Record<string, unknown>).storage_path;
  return typeof path === 'string' && path.length > 0 ? path : null;
}

/**
 * Replaces each entry's `audio_url` with a short-lived signed URL. Entries with
 * no stored object keep a null `audio_url` rather than failing the whole list.
 */
export async function attachSignedAudioUrls<T extends { metadata?: MetadataLike }>(
  supabase: SupabaseClient,
  entries: T[]
): Promise<T[]> {
  const paths = entries
    .map((entry) => storagePathFromMetadata(entry.metadata))
    .filter((path): path is string => path !== null);

  if (paths.length === 0) {
    return entries.map((entry) => ({ ...entry, audio_url: null }));
  }

  const signedByPath = new Map<string, string>();
  try {
    const { data } = await supabase.storage
      .from(VOICE_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

    for (const item of data ?? []) {
      if (item.signedUrl && item.path) signedByPath.set(item.path, item.signedUrl);
    }
  } catch {
    // Signing failure degrades to "no playback URL" instead of breaking the list.
  }

  return entries.map((entry) => {
    const path = storagePathFromMetadata(entry.metadata);
    return { ...entry, audio_url: path ? signedByPath.get(path) ?? null : null };
  });
}
