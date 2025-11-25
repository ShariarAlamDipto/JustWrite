# JustWrite — Setup & Run Guide

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+ (verify with `node --version`)
- npm or yarn

### Installation

1. **Install dependencies**
```powershell
npm install
```

2. **(Optional) Set up LLM provider**
Copy `.env.example` to `.env.local` and fill in your API key:
```powershell
Copy-Item .env.example .env.local
# Edit .env.local with your preferred LLM key
```

Or set environment variables directly in PowerShell:
```powershell
$env:GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
$env:GROQ_API_KEY = 'your_groq_key'
```

3. **Start the dev server**
```powershell
npm run dev
```

4. Open http://localhost:3000 in your browser

## Features

### Journal Entry
- Write free-form journal entries at the home page
- Click "Distill" to run AI summarization and task extraction
- View the Distill modal showing:
  - Initial 120 characters of the entry
  - AI-generated summary
  - Extracted tasks
- Click "Add to To‑Do" to move tasks to the task board

### Task Board
- Navigate to `/tasks` or click "Tasks" in navigation
- See all extracted tasks
- Click "Mark Done" to toggle task status

### Theme
- Arcade-style UI with black background, neon accents, retro font
- Uses Press Start 2P (Google Fonts) for retro aesthetic

## Architecture

### Frontend
- **Framework**: Next.js 14 (React 18)
- **Styling**: CSS-in-JS + global CSS variables
- **Pages**: `src/pages/index.tsx` (journal), `src/pages/tasks.tsx` (task board), `src/pages/_app.tsx` (root layout)
- **Components**: `src/components/DistillView.tsx` (modal for distillation)

### Backend
- **API Routes**: `src/pages/api/`
  - `/entries` — GET (list) / POST (create)
  - `/distill` — POST (summarize + extract tasks using LLM)
  - `/tasks` — GET (list) / POST (create)
  - `/tasks/[id]` — GET / PATCH (update) / DELETE (archive)
- **Storage**: `src/lib/storage.ts` (abstraction layer that switches between file DB or Prisma)
- **LLM Integration**: Groq → OpenAI → Heuristic fallback

### Data
- **Default**: Local JSON at `data/db.json`
- **Optional**: PostgreSQL with Prisma (set `DATABASE_URL` and run `npm run prisma:migrate`)

## LLM Provider Setup

### Using Groq (Recommended Free Option)
1. Sign up at https://console.groq.com
2. Get your API key from https://console.groq.com/keys
3. Set environment variables:
```powershell
$env:GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
$env:GROQ_API_KEY = 'your_api_key'
```
4. Restart `npm run dev`

### Using OpenAI
1. Sign up at https://platform.openai.com
2. Get your API key from https://platform.openai.com/api-keys
3. Set environment variable:
```powershell
$env:OPENAI_API_KEY = 'sk_...'
```
4. Restart `npm run dev`

### Fallback (No LLM key)
If no LLM keys are set, the app will use a simple heuristic to extract tasks (looks for lines starting with action verbs like "Call", "Email", etc.).

## Database Setup (Optional)

### Using PostgreSQL with Prisma
1. Set `DATABASE_URL`:
```powershell
$env:DATABASE_URL = 'postgresql://user:password@localhost:5432/justwrite'
```

2. Generate Prisma client and run migrations:
```powershell
npm run prisma:generate
npm run prisma:migrate
```

3. Restart dev server:
```powershell
npm run dev
```

## Available Scripts

```powershell
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run Prisma migrations
npm run prisma:studio    # Open Prisma Studio (DB browser)
```

## Troubleshooting

### npm install fails
- Ensure Node.js 18+ is installed
- Try `npm cache clean --force` then `npm install` again
- Check that no files are locked (close VS Code if needed)

### Dev server exits with error
- Check for env var typos in `.env.local`
- Ensure `data/db.json` exists and is valid JSON
- Check console for specific errors and refer to the issue

### Distill returns "No summary" or no tasks
- If LLM keys are set, check that the API endpoint is reachable
- If no keys are set, the heuristic will run (looks for imperative sentences)
- Check server logs in the terminal running `npm run dev`

### Tasks don't appear after distill
- Refresh the `/tasks` page
- Check browser DevTools Network tab to see if tasks were created (POST `/api/tasks`)
- Check `data/db.json` to see if tasks were written

## Security Best Practices

1. **Never commit `.env.local`** — it's in `.gitignore`
2. **Never paste API keys in chat or code** — only in `.env.local` or system environment
3. **If you accidentally commit a key**, rotate/revoke it immediately in the provider console
4. **Use separate keys per environment** (dev, staging, production)

## Next Steps

- Implement voice note capture (speech-to-text)
- Add user authentication (Supabase Auth, Auth0, etc.)
- Add brainstorm canvas (free-form idea structuring)
- Add attention queue (overdue tasks highlighting)
- Deploy to Vercel, Netlify, or self-hosted
