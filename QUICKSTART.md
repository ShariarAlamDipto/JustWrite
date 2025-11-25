# Quick Setup Guide

Complete end-to-end setup for JustWrite with Socket.io real-time sync and Supabase authentication.

## Step 1: Install Dependencies

```powershell
npm install
```

This installs all required packages including Socket.io, Supabase, Prisma, etc.

## Step 2: Set Up Supabase (Optional but Recommended)

### Create Supabase Project
1. Go to https://supabase.com and sign up (free tier available)
2. Create a new project (select region closest to you)
3. Wait ~2 minutes for initialization

### Get Your API Keys
In Supabase dashboard:
1. Go **Settings** → **API**
2. Copy your **Project URL** (e.g., `https://your-project.supabase.co`)
3. Copy the **anon public** key (the long JWT token)

### Configure Redirect URL
In Supabase dashboard:
1. Go **Auth** → **Providers** → **Email**
2. Scroll to "Redirect URLs"
3. Add: `http://localhost:3000/auth/callback` (for local development)
4. For production: `https://your-domain.com/auth/callback`

### Create `.env.local`
```bash
# Copy .env.example to .env.local
cp .env.example .env.local
```

Then edit `.env.local` and add:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**Important**: These are public keys (safe to expose). `NEXT_PUBLIC_` prefix makes them available in browser.

## Step 3: Set Up LLM Provider (Optional)

Choose **one** of the following:

### Option A: Google Gemini (Recommended - Free)
1. Go to https://ai.google.dev
2. Sign in with Google
3. Click "Get API Key"
4. Add to `.env.local`:
```bash
GEMINI_API_KEY=your_gemini_key
```

### Option B: Groq (Free)
1. Go to https://console.groq.com/keys
2. Create an API key
3. Add to `.env.local`:
```bash
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_API_KEY=your_groq_key
```

### Option C: OpenAI (Paid, $0.50-$5/month typical use)
1. Go to https://platform.openai.com/api-keys
2. Create an API key
3. Add to `.env.local`:
```bash
OPENAI_API_KEY=sk_your_key
```

## Step 4: Run the Development Server

```powershell
npm run dev
```

This starts:
- **Next.js dev server** on `http://localhost:3000`
- **Socket.io server** on the same port (real-time sync)
- **File-based database** at `data/db.json`

## Step 5: Test the App

### Without Auth (Quick Demo)
1. Visit `http://localhost:3000`
2. Write an entry
3. Click **DISTILL** (uses LLM or heuristic)
4. Click **ADD TO TO-DO** to create tasks
5. Go to `/tasks` to view board

### With Auth (Full Flow)
1. Visit `http://localhost:3000/auth/login`
2. Enter your email
3. Check your inbox for magic link
4. Click link → redirected to home
5. Create entries and tasks as authenticated user
6. Logout via nav bar

## Troubleshooting

### "Cannot find module 'socket.io'"
```powershell
npm install socket.io socket.io-client
```

### "Supabase not configured"
- Check `.env.local` has both env vars set
- Restart dev server after editing `.env.local`

### Magic link not arriving
- Check spam folder
- Verify email is correct in Supabase dashboard
- Check Supabase Auth logs: **Auth** → **Logs** tab

### GEMINI_API_KEY gives 401 error
- Regenerate key at https://ai.google.dev/app/apikey
- Make sure you're using the free tier
- Check for typos in `.env.local`

### Socket.io connection refused
- Make sure you're running `npm run dev` (not `next dev`)
- Check that port 3000 isn't already in use
- Look at browser console (F12 → Network → WS) for connection details

### Tasks not showing on `/tasks` page
- If auth enabled: confirm you're signed in (check nav bar)
- Refresh page
- Check browser console for API errors (F12 → Console)

## Development Tips

### Hot Reload
- Frontend changes auto-reload (Next.js)
- API route changes may require server restart

### View Local Database
- File DB is at `data/db.json`
- Can edit manually but be careful with formatting
- App reads/writes JSON with each request

### Debug LLM Calls
- Open browser console (F12 → Console)
- Look for `[LLM]` logs showing which provider was used
- Check `.env.local` to ensure correct keys are set

### Real-time Sync
- Open app in 2 browser tabs
- Create entry in tab 1 → appears instantly in tab 2
- Look for "● LIVE" indicator in nav

## Deploy to Production

### Vercel (Recommended for Next.js)
```powershell
npm install -g vercel
vercel --prod
```

Then:
1. Set environment variables in Vercel dashboard
2. Update Supabase redirect URL to production domain
3. Redeploy

### Docker
```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "run", "dev"]
```

## Next Steps

- [Prisma + PostgreSQL Migration](./TECHNICAL.md#database-migration)
- [Custom LLM Prompts](./prompts/distill.json)
- [Socket.io Events Reference](./TECHNICAL.md#realtime-events)

---

**Questions?** Check `TECHNICAL.md` for architecture deep-dive or `AUTH_SETUP.md` for auth specifics.
