# Supabase Configuration Guide

## Sign in with Google

The web login page already calls `supabase.auth.signInWithOAuth({ provider: 'google' })` and returns to `/auth/callback`. Configure the provider as follows.

### 1. Create a Google OAuth client

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select the Google Cloud project for JustWrite.
2. Configure the OAuth consent screen under **Google Auth Platform**. Add the app name and support email. Add test users while the app is in testing mode.
3. Create an **OAuth client ID** for **Web application**.
4. Add this exact **Authorized redirect URI** in Google Cloud:

   ```text
   https://newpzqetqpvtdlmxmhjr.supabase.co/auth/v1/callback
   ```

   This is Google's callback URL. Do not use `http://localhost:3000/auth/callback` in Google Cloud; that is the app's final redirect URL.

5. Copy the generated **Client ID** and **Client secret**.

### 2. Enable Google in Supabase

1. Open the Supabase project and go to **Authentication** -> **Providers** -> **Google**.
2. Turn on **Enable Sign in with Google**.
3. Paste the Google **Web client ID** into **Client IDs**. If you later add Android or One Tap clients, add their IDs to the same comma-separated field.
4. Paste the Google **Client secret** into **Client Secret (for OAuth)**.
5. Leave **Skip nonce checks** disabled. Enable it only for a client that cannot provide a nonce.
6. Leave **Allow users without an email** disabled unless the application explicitly supports accounts without email addresses.
7. Save the provider.

### 3. Allow the app redirect in Supabase

Go to **Authentication** -> **URL Configuration** and add every URL the app may use under **Redirect URLs**:

```text
http://localhost:3000/auth/callback
http://127.0.0.1:3000/auth/callback
https://your-production-domain.com/auth/callback
```

Set **Site URL** to the production URL when deploying. The local URLs can remain in the allowlist for development.

### 4. Test the web flow

1. Restart the Next.js server after changing `.env.local` or Supabase settings.
2. Open `http://localhost:3000/auth/login`.
3. Select **Continue with Google**.
4. After Google consent, Supabase should return to `/auth/callback`, then the app should redirect to `/`.

If Google reports `redirect_uri_mismatch`, compare the Google Cloud redirect URI with the Supabase callback URL above character-for-character. If Supabase reports `Redirect URL not allowed`, add the app URL under Supabase **URL Configuration**.

## Critical: Configure Redirect URLs in Supabase Console

The magic link authentication requires you to add your redirect URL to Supabase's allowed list.

### Steps:

1. **Go to Supabase Console**
   - URL: https://app.supabase.com
   - Select your project: `newpzqetqpvtdlmxmhjr`

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
   https://newpzqetqpvtdlmxmhjr.supabase.co/auth/v1/verify?token=...&type=magiclink&redirect_to=http://localhost:3000/auth/callback
   ```

3. User clicks the link Ã¢â€ â€™ redirected to `/auth/callback` with token in URL hash
4. Our app (`src/pages/auth/callback.tsx`) detects the session
5. User is logged in and redirected to home page (`/`)

## Environment Variables

Make sure `.env.local` has:

```env
NEXT_PUBLIC_SUPABASE_URL=https://newpzqetqpvtdlmxmhjr.supabase.co
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
