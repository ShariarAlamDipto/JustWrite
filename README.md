# JustWrite — Web Scaffold

Minimal Next.js scaffold for the JustWrite journaling web app MVP with AI-powered task distillation, real-time sync, and optional user authentication.

## Getting Started (Local)

1. **Install dependencies**:
```powershell
npm install
```

2. **Run dev server**:
```powershell
npm run dev
```

3. **Visit** `http://localhost:3000`

The app works out-of-the-box with a local JSON database. To enable auth, follow [AUTH_SETUP.md](./AUTH_SETUP.md).

## Configuration

### LLM Provider (Choose One)

- **Google Gemini Flash** (RECOMMENDED - free, fast): Set `GEMINI_API_KEY`. Get free key at https://ai.google.dev
- **Groq** (free option): Set `GROQ_API_URL` and `GROQ_API_KEY`. The server will POST to the endpoint with `Authorization: Bearer <GROQ_API_KEY>` and expect JSON containing `summary` and `tasks` fields.
- **OpenAI**: Set `OPENAI_API_KEY` to use OpenAI's gpt-3.5-turbo model.
- Falls back to heuristic if no keys are set.

**Example setup (PowerShell)**:
```powershell
$env:GEMINI_API_KEY = 'your_gemini_api_key'
npm run dev
```

### Database (Optional, Default is Local JSON)

To use PostgreSQL with Prisma, set `DATABASE_URL` and run:
```powershell
npm run prisma:generate
npm run prisma:migrate
```

### Authentication (Optional, Default is Public)

To enable user authentication with Supabase:
- Follow [AUTH_SETUP.md](./AUTH_SETUP.md)
- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Users can sign in via magic link at `/auth/login`

## Features

✅ **Minimal Journaling**: Write entries, see recent list  
✅ **AI Distillation**: Summarize entries and extract actionable tasks via Gemini/Groq/OpenAI  
✅ **Task Board**: View, create, and mark tasks done  
✅ **Real-time Sync**: Socket.io infrastructure for live updates (optional wiring)  
✅ **User Auth**: Supabase magic link authentication (optional)  
✅ **Arcade Theme**: Black background, neon accents (aqua/magenta), Press Start 2P font  
✅ **Storage Abstraction**: Works with file DB or Postgres + Prisma  

## Architecture

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Next.js API Routes
- **Database**: File-based JSON (`data/db.json`) or PostgreSQL + Prisma
- **LLM**: Gemini Flash 1.5 (primary) → Groq → OpenAI → heuristic extraction
- **Real-time**: Socket.io (scaffolded)
- **Auth**: Supabase (optional)

## Project Structure

```
src/
  pages/
    index.tsx          # Journal home
    tasks.tsx          # Task board
    auth/
      login.tsx        # Magic link sign-in
      callback.tsx     # Auth callback
    api/
      entries.ts       # GET/POST entries
      distill.ts       # POST distill (LLM)
      tasks/
        index.ts       # GET/POST tasks
        [id].ts        # GET/PATCH/DELETE task
  components/
    DistillView.tsx    # Modal for distill result
    Nav.tsx            # Navigation with auth status
  lib/
    storage.ts         # DB abstraction (file or Prisma)
    db.ts              # File-based DB
    useSocket.ts       # Socket.io client hook
    socket.ts          # Socket.io server wrapper
    supabase.ts        # Supabase client
    useAuth.tsx        # Auth context provider
    withAuth.ts        # API middleware for token verification
  styles/
    globals.css        # Arcade theme, CSS variables
```

## Security Notes

- **Never commit API keys** to source control.
- **Never paste keys in chat** — I will not use them.
- Store keys only in `.env.local` (add to `.gitignore`).
- If a key is exposed, rotate/revoke it immediately.

## Next Steps

- **Migrate to Postgres**: Set `DATABASE_URL`, run migrations to add `user_id` to entries/tasks
- **Test Auth Flow**: Sign in via `/auth/login`, verify JWT persists and API routes reject unauth requests
- **Wire Socket.io Server**: Integrate Socket.io server initialization in Next.js HTTP server for real-time broadcast
- **UI Polish**: Add animations, improve layouts, add brainstorm canvas
- **Voice Capture**: Add audio upload + speech-to-text (Whisper API)
