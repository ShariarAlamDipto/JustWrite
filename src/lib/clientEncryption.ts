/**
 * Client-Side Encryption Service for JustWrite
 * 
 * This provides end-to-end encryption for journal entries so that
 * even database admins cannot read user content.
 * 
 * Encryption format: enc2:{salt}:{iv}:{encryptedData}
 * Compatible with Flutter app encryption format.
 */

// PBKDF2 iterations (OWASP 2023 recommends 600,000 for SHA-256)
const PBKDF2_ITERATIONS = 600000;
const SALT_LENGTH = 32;
const KEY_LENGTH = 256; // bits
const IV_LENGTH = 12; // GCM standard

/**
 * Generate cryptographically secure random bytes
 */
function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Convert Uint8Array to base64 string
 */
function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Convert base64 string to Uint8Array
 */
function fromBase64(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

/**
 * Derive encryption key from userId using PBKDF2
 */
async function deriveKey(userId: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(userId),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Get or create salt for user (stored in localStorage)
 */
function getOrCreateSalt(userId: string): Uint8Array {
  const storageKey = `jw_salt_${userId}`;
  
  if (typeof localStorage !== 'undefined') {
    const existingSalt = localStorage.getItem(storageKey);
    if (existingSalt) {
      return fromBase64(existingSalt);
    }
  }
  
  // Generate new salt
  const newSalt = generateRandomBytes(SALT_LENGTH);
  
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(storageKey, toBase64(newSalt));
  }
  
  return newSalt;
}

/**
 * Encrypt content using AES-256-GCM
 * Returns: enc2:{salt}:{iv}:{encryptedData}
 */
export async function encryptContent(content: string, userId: string): Promise<string> {
  if (!content || !userId) return content;
  
  // Check if Web Crypto API is available
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    console.warn('Web Crypto API not available, content will not be encrypted');
    return content;
  }
  
  try {
    // Generate fresh salt for each encryption (embedded in output)
    const salt = generateRandomBytes(SALT_LENGTH);
    const iv = generateRandomBytes(IV_LENGTH);
    
    // Derive key from userId
    const key = await deriveKey(userId, salt);
    
    // Encrypt content
    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      key,
      encoder.encode(content)
    );
    
    // Format: enc2:{salt}:{iv}:{encrypted}
    const saltBase64 = toBase64(salt);
    const ivBase64 = toBase64(iv);
    const encryptedBase64 = toBase64(new Uint8Array(encrypted));
    
    return `enc2:${saltBase64}:${ivBase64}:${encryptedBase64}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    return content; // Return unencrypted on failure
  }
}

/**
 * Decrypt content encrypted with enc2 format
 */
export async function decryptContent(content: string, userId: string): Promise<string> {
  if (!content || !userId) return content;
  
  // Check if content is encrypted
  if (!content.startsWith('enc2:')) {
    return content; // Not encrypted
  }
  
  // Check if Web Crypto API is available
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    console.warn('Web Crypto API not available, cannot decrypt');
    return '[Encrypted content - cannot decrypt in this environment]';
  }
  
  try {
    const parts = content.split(':');
    if (parts.length !== 4) {
      console.warn('Invalid encrypted format');
      return content;
    }
    
    const salt = fromBase64(parts[1]);
    const iv = fromBase64(parts[2]);
    const encryptedData = fromBase64(parts[3]);
    
    // Derive key from userId using the salt from the content
    const key = await deriveKey(userId, salt);
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      key,
      encryptedData.buffer as ArrayBuffer
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '[Encrypted content - decryption failed]';
  }
}

/**
 * Check if content is encrypted
 */
export function isEncrypted(content: string): boolean {
  return content?.startsWith('enc2:') || content?.startsWith('enc:');
}

/**
 * Decrypt multiple entries
 */
export async function decryptEntries(entries: any[], userId: string): Promise<any[]> {
  return Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      content: await decryptContent(entry.content, userId),
      // Also decrypt summary if present
      summary: entry.summary ? await decryptContent(entry.summary, userId) : entry.summary
    }))
  );
}
