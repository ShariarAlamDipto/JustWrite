# Magic Link Auth - Quick Fix ✨

## ✅ What I Fixed

1. **Callback Logic** (`src/pages/auth/callback.tsx`)
   - Changed from `exchangeCodeForSession` (OAuth) to `getSession` (Magic Link)
   - Added retry logic with 1-second delay for token processing
   - Better error handling with user-friendly messages

2. **Session Flow**
   - Now properly detects when Supabase parses the token from URL hash
   - Waits for session to be established before redirecting
   - Shows helpful error messages if something goes wrong

## ⚠️ What YOU Need to Do

### In Supabase Console:

1. Go to: https://app.supabase.com
2. Select project: `hvljihceyzpfsktjtipi`
3. Left sidebar: **Authentication** → **Providers** → **Email**
4. Find **Redirect URLs** section
5. Add these URLs:
   ```
   http://localhost:3000/auth/callback
   http://127.0.0.1:3000/auth/callback
   ```
6. Click **Save**

**⚡ This is the critical step!** Without this, the magic link won't redirect properly.

## 🧪 Test Flow

1. App running at http://localhost:3000 ✓
2. Click "Sign In"
3. Enter your email → "Send Magic Link"
4. Check your email
5. Click the link
6. Should now redirect to home page with you logged in!

## 📝 Files Changed

- `src/pages/auth/callback.tsx` — Fixed magic link session handling
- `src/pages/auth/login.tsx` — No changes (already correct)
- `src/lib/useAuth.tsx` — No changes (already correct)

## 🐛 If It Still Doesn't Work

Check browser console (F12):
- Look for auth errors
- Verify Supabase URL is correct
- Make sure email is in inbox

See `SUPABASE_SETUP.md` for detailed troubleshooting.
