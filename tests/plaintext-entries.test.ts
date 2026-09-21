/**
 * Journal entries are stored as plain text. These tests pin the two halves of
 * that decision:
 *   1. plain text survives a read untouched, and costs no key derivation
 *   2. content written by an older, encrypting build still decrypts on read
 *
 * Run: npm test
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'

// clientEncryption.ts targets the browser; give it the same globals.
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto })
}
globalThis.btoa ??= (s: string) => Buffer.from(s, 'binary').toString('base64')
globalThis.atob ??= (s: string) => Buffer.from(s, 'base64').toString('binary')

const { encryptContent, decryptContent, isEncrypted } = await import(
  '../src/lib/clientEncryption.ts'
)

const USER_ID = '3f1a8c42-9b7e-4d51-8a6f-2c9e7b1d4a03'

test('plain text is returned unchanged on read', async () => {
  const text = 'Today was long but I got the journal saving again.'
  assert.equal(await decryptContent(text, USER_ID), text)
})

test('plain text is not mistaken for an encrypted payload', () => {
  assert.equal(isEncrypted('a normal entry'), false)
  assert.equal(isEncrypted(''), false)
})

test('text written by an older encrypting build still round-trips', async () => {
  const original = 'An entry the phone wrote before the rollout.'
  const ciphertext = await encryptContent(original, USER_ID)

  assert.ok(ciphertext.startsWith('enc2:'), 'legacy format is enc2:')
  assert.equal(ciphertext.split(':').length, 4, 'enc2:{salt}:{iv}:{data}')
  assert.equal(isEncrypted(ciphertext), true)
  assert.equal(await decryptContent(ciphertext, USER_ID), original)
})

test('the key comes only from the user id, so any device can read it', async () => {
  // Two independent encryptions use different random salts...
  const a = await encryptContent('same text', USER_ID)
  const b = await encryptContent('same text', USER_ID)
  assert.notEqual(a, b, 'fresh salt per encryption')

  // ...yet both decrypt from the user id alone, with nothing device-local.
  assert.equal(await decryptContent(a, USER_ID), 'same text')
  assert.equal(await decryptContent(b, USER_ID), 'same text')
})

test('a different user id cannot read the content', async () => {
  const ciphertext = await encryptContent('private', USER_ID)
  const other = '00000000-0000-4000-8000-000000000000'
  assert.equal(
    await decryptContent(ciphertext, other),
    '[Encrypted content - decryption failed]'
  )
})
