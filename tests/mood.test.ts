/**
 * The entries.mood column is CHECK-constrained to 1..10. Anything this module
 * lets through outside that range makes the INSERT fail and the entry is lost,
 * which is exactly the bug these tests exist to prevent regressing.
 *
 * Run: node --experimental-strip-types --test tests/mood.test.ts
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MOOD_MIN,
  MOOD_MAX,
  MOOD_DEFAULT,
  normalizeMood,
  getMoodLabel,
  getMoodBucket,
} from '../src/lib/mood.ts'

const inRange = (v: number | null) =>
  v === null || (Number.isInteger(v) && v >= MOOD_MIN && v <= MOOD_MAX)

test('every in-range value is preserved exactly', () => {
  for (let m = MOOD_MIN; m <= MOOD_MAX; m++) {
    assert.equal(normalizeMood(m), m)
  }
})

test('absent mood stays null so the nullable column accepts it', () => {
  assert.equal(normalizeMood(undefined), null)
  assert.equal(normalizeMood(null), null)
  assert.equal(normalizeMood(''), null)
  assert.equal(normalizeMood('not a number'), null)
  assert.equal(normalizeMood(NaN), null)
})

test('legacy 0-100 payloads are rescaled, not clamped to the top', () => {
  // The old web slider defaulted to 50, which must read as neutral, not "Great".
  assert.equal(normalizeMood(50), 5)
  assert.equal(normalizeMood(100), 10)
  assert.equal(normalizeMood(20), 2)
  assert.equal(normalizeMood(80), 8)
})

test('out-of-range and fractional values never escape 1..10', () => {
  const hostile = [-1, 0, 0.4, 1.5, 9.6, 11, 99, 1000, -500, Infinity, -Infinity]
  for (const v of hostile) {
    assert.ok(inRange(normalizeMood(v)), `normalizeMood(${v}) escaped the range`)
  }
  assert.equal(normalizeMood(0), MOOD_MIN)
  assert.equal(normalizeMood(-5), MOOD_MIN)
  assert.equal(normalizeMood(1000), MOOD_MAX)
})

test('the default mood is itself valid', () => {
  assert.equal(normalizeMood(MOOD_DEFAULT), MOOD_DEFAULT)
  assert.ok(inRange(MOOD_DEFAULT))
})

test('labels and buckets cover the whole scale', () => {
  const labels = new Set<string>()
  const buckets = new Set<string>()
  for (let m = MOOD_MIN; m <= MOOD_MAX; m++) {
    labels.add(getMoodLabel(m))
    buckets.add(getMoodBucket(m))
  }
  assert.deepEqual(
    [...labels].sort(),
    ['Below Average', 'Good', 'Great', 'Low', 'Neutral']
  )
  assert.deepEqual(
    [...buckets].sort(),
    ['good', 'great', 'low', 'neutral', 'veryLow']
  )
})
