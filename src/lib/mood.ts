/**
 * Canonical mood scale for JustWrite.
 *
 * The `entries.mood` column is constrained to 1..10:
 *   mood INTEGER DEFAULT 5 CHECK (mood IS NULL OR (mood BETWEEN 1 AND 10))
 *
 * The Flutter app already writes on this scale. The web UI historically used a
 * 0-100 slider, so every web save violated the CHECK constraint and the insert
 * was rejected. Everything now goes through this module so there is exactly one
 * scale in the system.
 */

export const MOOD_MIN = 1
export const MOOD_MAX = 10
export const MOOD_DEFAULT = 5

/** Legacy web clients sent 0-100. Anything above MOOD_MAX is on that old scale. */
const LEGACY_SCALE_MAX = 100

/**
 * Coerce any incoming mood value into a valid 1..10 integer.
 * Returns null when no mood was supplied, which the column accepts.
 */
export function normalizeMood(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null

  const num = Number(value)
  if (!Number.isFinite(num)) return null

  // Values from a cached 0-100 client are rescaled rather than clamped, so a
  // stale tab does not record every entry as "Great".
  const onScale = num > MOOD_MAX
    ? (num / LEGACY_SCALE_MAX) * MOOD_MAX
    : num

  const rounded = Math.round(onScale)
  return Math.min(MOOD_MAX, Math.max(MOOD_MIN, rounded))
}

export function getMoodLabel(mood: number): string {
  if (mood <= 2) return 'Low'
  if (mood <= 4) return 'Below Average'
  if (mood <= 6) return 'Neutral'
  if (mood <= 8) return 'Good'
  return 'Great'
}

export type MoodBucket = 'veryLow' | 'low' | 'neutral' | 'good' | 'great'

export function getMoodBucket(mood: number): MoodBucket {
  if (mood <= 2) return 'veryLow'
  if (mood <= 4) return 'low'
  if (mood <= 6) return 'neutral'
  if (mood <= 8) return 'good'
  return 'great'
}
