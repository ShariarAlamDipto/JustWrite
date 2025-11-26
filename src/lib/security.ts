/**
 * Security utilities for JustWrite
 * Provides input sanitization, rate limiting helpers, and validation
 */

// HTML entity encoding to prevent XSS
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Sanitize user input for database storage (removes dangerous patterns)
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Remove null bytes and control characters (except newlines and tabs)
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Limit length to prevent DoS
  sanitized = sanitized.slice(0, 50000);
  
  return sanitized.trim();
}

// Validate UUID format
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Validate email format
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Sanitize priority values
export function sanitizePriority(priority: string): 'low' | 'medium' | 'high' {
  const validPriorities = ['low', 'medium', 'high'];
  const lower = (priority || '').toLowerCase().trim();
  return validPriorities.includes(lower) ? (lower as 'low' | 'medium' | 'high') : 'medium';
}

// Sanitize status values
export function sanitizeStatus(status: string): 'todo' | 'done' {
  const validStatuses = ['todo', 'done'];
  const lower = (status || '').toLowerCase().trim();
  return validStatuses.includes(lower) ? (lower as 'todo' | 'done') : 'todo';
}

// Rate limiting helper (in-memory, for serverless use external store)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  record.count++;
  return { allowed: true, remaining: maxRequests - record.count };
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000);

// Validate and sanitize content length
export function validateContentLength(content: string, maxLength: number = 50000): boolean {
  return typeof content === 'string' && content.length > 0 && content.length <= maxLength;
}

// Log security events (without sensitive data)
export function logSecurityEvent(event: string, details: Record<string, unknown> = {}): void {
  // In production, send to security monitoring service
  console.log(JSON.stringify({
    type: 'security_event',
    event,
    timestamp: new Date().toISOString(),
    // Redact sensitive fields
    ...Object.fromEntries(
      Object.entries(details).map(([k, v]) => [
        k,
        ['token', 'password', 'email', 'key', 'secret'].some(s => k.toLowerCase().includes(s))
          ? '[REDACTED]'
          : v
      ])
    )
  }));
}
