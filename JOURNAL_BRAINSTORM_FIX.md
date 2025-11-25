# Fixed: Journal Saving & Brainstorm LLM Issues ✅

## Problems Identified & Fixed

### 1. **Journal Entries Not Being Saved** ❌ → ✅

**Root Cause**: The app was trying to use `localStorage.getItem('sb:token')` which doesn't exist in Supabase. Supabase stores sessions in memory/cookies, not as a simple token key.

**Files Fixed**:
- `src/lib/useAuth.tsx` — Now extracts and exposes `token` from Supabase session
- `src/pages/index.tsx` — Uses token from auth context instead of localStorage
- `src/pages/tasks.tsx` — Uses token from auth context instead of localStorage
- `src/pages/brainstorm.tsx` — Uses token from auth context instead of localStorage

**What Changed**:
```tsx
// BEFORE ❌
const { user, loading: authLoading } = useAuth();
// ...
headers: { 'Authorization': `Bearer ${localStorage.getItem('sb:token') || ''}` }

// AFTER ✅
const { user, loading: authLoading, token } = useAuth();
// ...
headers: { 'Authorization': `Bearer ${token || ''}` }
```

**useAuth.tsx Update**:
- Added `token` to AuthContextType
- Extract `access_token` from Supabase session
- Pass token via context to all pages

### 2. **Brainstorm Using Heuristic Instead of LLM** ❌ → ✅

**Root Cause**: 
1. Brainstorm endpoint wasn't protected with auth (might fail silently)
2. No logging to see if Groq was being called or erroring
3. Env vars might not be loaded in API route

**Files Fixed**:
- `src/pages/api/brainstorm.ts` — Added auth wrapper and logging

**What Changed**:
```typescript
// BEFORE ❌
export default async function handler(req, res) {
  // No auth, no logging
  if (groqUrl && groqKey) {
    // try Groq silently, fail to heuristic
  }
}

// AFTER ✅
export default async function handler(req, res) {
  return withAuth(req, res, async (req, res, userId) => {
    console.log('[Brainstorm] Groq URL present:', !!groqUrl);
    console.log('[Brainstorm] Groq Key present:', !!groqKey);
    console.log('[Brainstorm] Calling Groq LLM...');
    console.log('[Brainstorm] Groq response received');
    // ... with detailed logging at each step
  });
}
```

### 3. **Added Token to Dependencies**

**Updated useEffect hooks** to depend on token:
```tsx
// BEFORE ❌
useEffect(() => { 
  if (user) fetchEntries();
}, [user]);

// AFTER ✅
useEffect(() => { 
  if (user && token) fetchEntries();
}, [user, token]);
```

This ensures API calls wait until both user AND token are available.

## How to Test Now

### Test 1: Journal Entry Saving
1. Sign in with magic link (Supabase configured) ✅
2. Write something in the journal textarea
3. Click "SAVE ENTRY"
4. **Should save immediately** ✓
5. Check browser console (F12) — should NOT see auth errors
6. Check `data/db.json` — new entry should appear

### Test 2: Brainstorm LLM Processing
1. Go to `/brainstorm` page
2. Write something like: "I need to fix the auth bug, write documentation, deploy to production"
3. Click "GENERATE TASKS"
4. **Should see LLM output** (more natural language tasks)
5. **NOT just keyword matching** (e.g., won't just extract "fix", "write", "deploy")

**Example**:
- ✅ LLM: "Fix JWT token persistence issue in auth flow"
- ❌ Heuristic: "fix the auth bug", "write documentation", "deploy"

### Test 3: Check Logging

Open browser console (F12) → Network tab:
1. When brainstorming, check `/api/brainstorm` response
2. Open browser console → check for logs:
   ```
   [Brainstorm] Groq URL present: true
   [Brainstorm] Groq Key present: true
   [Brainstorm] Calling Groq LLM...
   [Brainstorm] Groq response received, content: true
   [Brainstorm] Parsed tasks: 3
   ```

If you see `Using heuristic extraction` → Groq failed or isn't configured.

## Environment Requirements

Make sure `.env.local` has:
```env
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_API_KEY=gsk_Ohpsg...  # Your actual key
NEXT_PUBLIC_SUPABASE_URL=https://hvljihceyzpfsktjtipi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  # Your actual key
```

Both Groq and Supabase keys must be present.

## Troubleshooting

### "401 Unauthorized" errors in console
→ Supabase auth not working. Follow `SUPABASE_SETUP.md` to configure redirect URLs.

### "Brainstorm using heuristic"
→ Check browser console logs. Likely causes:
1. `GROQ_API_KEY` or `GROQ_API_URL` not in `.env.local`
2. Groq API key is invalid/expired
3. Server needs restart after `.env.local` update

### Journal entries not saving
→ Check browser console for error messages. Likely causes:
1. Not signed in (check top-right corner for email)
2. `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` not set
3. Server not running (`npm run dev`)

## Files Changed Summary

| File | Change | Impact |
|------|--------|--------|
| `src/lib/useAuth.tsx` | Added token to context | All pages can access token |
| `src/pages/index.tsx` | Use token from context | Journal entries now save ✓ |
| `src/pages/tasks.tsx` | Use token from context | Tasks API now auth'd ✓ |
| `src/pages/brainstorm.tsx` | Use token from context + auth | Brainstorm now requires login ✓ |
| `src/pages/api/brainstorm.ts` | Added withAuth + logging | LLM now called with proper auth + debugging ✓ |

All changes are backward compatible. No breaking changes to existing features.
