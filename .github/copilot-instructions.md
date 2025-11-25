## JustWrite Project — AI Coding Agent Instructions

### Project Overview
JustWrite is a minimalist journaling + task management web app built with Next.js. Key philosophy: convert internal thoughts into organized tasks with minimal friction.

### Tech Stack
- **Frontend**: Next.js 14 (React 18), TypeScript, global CSS (arcade theme)
- **Backend**: Next.js API Routes (server-side)
- **Database**: File-based JSON (default) or PostgreSQL + Prisma (optional)
- **LLM**: Groq, OpenAI, or heuristic fallback
- **UI**: Press Start 2P font, black background, neon accents (aqua: 00ffd5, magenta: ff3bff)

### Architecture Decision Points
1. **Storage Abstraction** (`src/lib/storage.ts`): Automatically switches between file DB and Prisma based on `DATABASE_URL` presence. Always use storage functions, never direct DB calls.
2. **LLM Priority**: GROQ → OpenAI → Heuristic (check env vars in `/api/distill.ts`)
3. **Error Handling**: All API routes should gracefully fallback (e.g., failed LLM call → heuristic extraction)
4. **Security**: Never store API keys in code; read from environment only. Use `.env.local` (in .gitignore)

### Key Files & Patterns

#### API Routes
- Pattern: Store layer abstraction via `src/lib/storage.ts` (never direct fs/db calls)
- Example: `src/pages/api/entries.ts` calls `listEntries()`, `createEntry()`
- Error handling: All try-catch with fallback to heuristic or return 4xx/5xx

#### Frontend Pages
- `src/pages/index.tsx`: Journal home (create entries, distill modal)
- `src/pages/tasks.tsx`: Task board (list, toggle done)
- `src/pages/_app.tsx`: Root layout (fonts, global CSS, container)

#### Components
- `src/components/DistillView.tsx`: Modal showing entry preview, summary, tasks
- Prop pattern: Keep components pure; state management at page level

#### Styling
- Use CSS classes from `src/styles/globals.css` (e.g., `.btn`, `.card`, `.modal-backdrop`)
- Arcade theme: black background (`--bg`), white text (`--fg`), neon accents (`--accent`)
- Minimize inline styles; prefer CSS classes for maintainability

### Critical Workflows

#### Adding a New API Feature
1. Define storage function in `src/lib/storage.ts` (handles both file DB and Prisma)
2. Create API route in `src/pages/api/` that calls storage function
3. Add error handling and fallback behavior
4. Test with both DB configurations (file-based, then if Prisma installed: set DATABASE_URL)

#### Modifying the Distill Flow
1. Update LLM provider logic in `src/pages/api/distill.ts` (GROQ URL/key, OpenAI format, heuristic)
2. Keep JSON response shape: `{ summary: string, tasks: [ {title, description, priority, due} ] }`
3. Test with env vars: `GROQ_API_URL`, `GROQ_API_KEY`, `OPENAI_API_KEY`
4. Fallback to heuristic if parsing fails

#### Adding UI Components
1. Create in `src/components/`
2. Use CSS classes from globals (`.btn`, `.card`, etc.) instead of inline styles
3. Keep styling consistent with arcade theme (black, white, neon accents)
4. Avoid new fonts; use Press Start 2P or monospace fallback

### Conventions & Standards

#### Import Paths
- Relative imports for same-level files: `import { x } from './db'`
- Avoid deep relative paths; use `src/` folder structure

#### Error Messages
- API routes: return JSON `{ error: string }`
- Client: use console.error for debugging, show user-friendly alerts

#### Environment Variables
- Prefix sensitive keys: `GROQ_API_KEY`, `OPENAI_API_KEY` (never hardcode)
- Document all vars in `.env.example`

#### Testing
- Manual: create entry, distill, toggle task done, check `/tasks`
- Automation: small test harness for distill JSON parsing (optional for later)

#### Commit Messages
- Format: "Feat: add feature" or "Fix: resolve issue"
- Example: "Feat: add Groq LLM provider to distill endpoint"
- Include files changed if substantial

### When Building New Features

1. **Always use storage abstraction** (`src/lib/storage.ts`) for DB operations
2. **Keep API response shapes consistent** with existing patterns
3. **Test fallback behavior** (what happens if LLM fails? If DB is down?)
4. **Maintain arcade theme** (black bg, neon accents, monospace font)
5. **Document env vars** in `.env.example` and README.md
6. **Never commit secret keys**; provide setup instructions instead

### Common Pitfalls to Avoid

❌ Direct imports from `@prisma/client` without checking `DATABASE_URL` — use storage abstraction instead
❌ Hardcoding API keys in code — always read from env
❌ Breaking the JSON response shape from `/api/distill` — keeps client parsing consistent
❌ Inline styles that conflict with CSS variables — use `.btn`, `.card` classes
❌ Committing `.env.local` or API keys — keep `.gitignore` updated

### Quick Reference: Add a Task Button

Example PR: client button → POST /api/tasks → storage.createTask() → return new task.

```typescript
// In src/pages/api/tasks/index.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { title, description, priority, entry_id } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    
    const task = await createTask({ title, description, priority, entry_id });
    return res.status(201).json({ task });
  }
  // ... rest of handler
}
```

### Next Steps If Asked

- **Prisma Integration**: Update storage functions to use Prisma client (already scaffolded in schema)
- **Auth**: Add Supabase Auth or Auth0 to protect entries/tasks per user
- **Voice Input**: Add `/api/audio/upload` + STT (Whisper) integration
- **Brainstorm**: New page for free-form idea capture + AI structuring
- **Attention Queue**: Task prioritization based on due date + recency

### Security & Privacy

- **API Keys**: Never share in chat. Set via `.env.local` only. If exposed, rotate immediately.
- **Database**: If using Postgres, ensure connection string is in env, never in code.
- **User Data**: Store entry/task data in private tables; add auth layer if multi-user.

---

### References
- **Next.js API Routes**: https://nextjs.org/docs/api-routes/introduction
- **Prisma ORM**: https://www.prisma.io/docs/
- **Groq API**: https://console.groq.com
- **Project Docs**: See README.md, SETUP.md, TECHNICAL.md
