# Supabase Configuration Guide

## Critical: Configure Redirect URLs in Supabase Console

The magic link authentication requires you to add your redirect URL to Supabase's allowed list.

### Steps:

1. **Go to Supabase Console**
   - URL: https://app.supabase.com
   - Select your project: `hvljihceyzpfsktjtipi`

2. **Navigate to Auth Settings**
   - Left sidebar: **Authentication** Ã¢â€ â€™ **Providers**
   - Click on **Email** provider

3. **Add Redirect URLs**
   - Find the section: **Redirect URLs** (or **Redirect URLS for both OAuth & email**)
   - Add these URLs:
     ```
     http://localhost:3000/auth/callback
     http://127.0.0.1:3000/auth/callback
     http://[::1]:3000/auth/callback
     ```
   - **For production**, also add:
     ```
     https://yourdomain.com/auth/callback
     ```

4. **Save Changes**
   - Click **Save** button

## How Magic Links Work

1. User enters email and clicks "Send Magic Link"
2. Supabase sends an email with a link like:
   ```
   https://hvljihceyzpfsktjtipi.supabase.co/auth/v1/verify?token=...&type=magiclink&redirect_to=http://localhost:3000/auth/callback
   ```

3. User clicks the link Ã¢â€ â€™ redirected to `/auth/callback` with token in URL hash
4. Our app (`src/pages/auth/callback.tsx`) detects the session
5. User is logged in and redirected to home page (`/`)

## Environment Variables

Make sure `.env.local` has:

```env
NEXT_PUBLIC_SUPABASE_URL=https://hvljihceyzpfsktjtipi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_API_KEY=your_groq_api_key_here
```

## Troubleshooting

### "Redirect URL not allowed"
- Ã¢ÂÅ’ You haven't added the localhost URL to Supabase console
- Ã¢Å“â€¦ Solution: Follow steps 1-4 above

### Magic link isn't working
- Check browser console for errors (F12 Ã¢â€ â€™ Console tab)
- Verify `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Try signing in again

### Email not arriving
- Check spam/junk folder
- Verify email is typed correctly
- Check Supabase project logs: Auth Ã¢â€ â€™ Logs

## Testing Flow

1. Start dev server: `npm run dev`
2. Visit http://localhost:3000
3. Click "Sign In" or go directly to `/auth/login`
4. Enter your email address
5. Click "Send Magic Link"
6. Check your email for the magic link
7. Click the link in the email
8. Should redirect to home page logged in as your email

---

**Need help?** Check `src/pages/auth/callback.tsx` and `src/pages/auth/login.tsx` for the implementation.
