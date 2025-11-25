# Supabase Auth Setup Guide

## Quick Start

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project (choose a region closest to you)
3. Wait for the project to initialize (~2 min)

### 2. Get Your API Keys
In your Supabase dashboard:
- Go to **Settings** → **API**
- Copy `Project URL` → Set as `NEXT_PUBLIC_SUPABASE_URL`
- Copy `anon public` key → Set as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Configure Redirect URL
In your Supabase dashboard:
- Go to **Auth** → **Providers** → **Email**
- Under "Redirect URLs", add: `http://localhost:3000/auth/callback` (for dev)
- For production, add: `https://your-domain.com/auth/callback`

### 4. Set Environment Variables
In your `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 5. Run the App
```bash
npm install
npm run dev
```

Visit `http://localhost:3000/auth/login` to test the magic link flow.

## How It Works

1. **Sign In**: User enters email on `/auth/login`
2. **Magic Link**: Supabase sends a magic link to that email
3. **Callback**: User clicks link → redirected to `/auth/callback`
4. **Session**: JWT stored in localStorage, subsequent requests include token in `Authorization` header
5. **Protected Routes**: API endpoints verify token via `withAuth()` middleware

## Features

- ✅ No passwords (magic link authentication)
- ✅ Auto session persistence (localStorage + JSON Web Token)
- ✅ Protected API routes (401 if no valid token)
- ✅ Per-user entries/tasks (via `user.id`)
- ✅ Automatic logout on token expiry

## Troubleshooting

### "Cannot find module '@/lib/supabase'"
- Run `npm install` to install dependencies
- Make sure `tsconfig.json` has `"@/*": ["src/*"]` path mapping

### "Supabase not configured"
- Check `.env.local` for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Make sure both are set (they're public, ok to commit to `.env.example`)

### Magic link not arriving
- Check spam folder
- Verify email address is correct in Supabase dashboard (Settings → Auth → Email)
- Check Supabase logs: go to **Auth** tab → **User Management** → **Logs**

### Stuck on "Signing you in..."
- Open browser dev tools (F12) → **Console** tab
- Check for JavaScript errors
- Verify callback URL is correct in Supabase dashboard

## Next Steps

1. **Migrate data to PostgreSQL** (optional):
   - Uncomment `DATABASE_URL` in `.env.local`
   - Run `npx prisma migrate deploy` to create tables with `user_id` foreign keys
   - Update `src/lib/storage.ts` to filter queries by `user_id`

2. **Test end-to-end**:
   - Sign in via magic link
   - Create an entry
   - Distill it to tasks
   - Verify on `/tasks` page

3. **Deploy**:
   - Push code to GitHub
   - Deploy to Vercel/Netlify
   - Update Supabase redirect URLs to production domain
