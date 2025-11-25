# Technical Documentation

## Project Structure

```
justwrite/
├── src/
│   ├── components/
│   │   └── DistillView.tsx       # Modal for showing distilled summary + tasks
│   ├── lib/
│   │   ├── db.ts                 # File-based DB (read/write JSON)
│   │   ├── prisma.ts             # Prisma client singleton
│   │   └── storage.ts            # Storage abstraction (file or Prisma)
│   ├── pages/
│   │   ├── api/
│   │   │   ├── entries.ts        # GET/POST entries
│   │   │   ├── distill.ts        # POST distill (LLM summarize + extract tasks)
│   │   │   └── tasks/
│   │   │       ├── index.ts      # GET/POST tasks
│   │   │       └── [id].ts       # GET/PATCH/DELETE task
│   │   ├── index.tsx             # Home page (journal, entries list, distill modal)
│   │   ├── tasks.tsx             # Task board page
│   │   └── _app.tsx              # Root layout (fonts, global CSS, container)
│   ├── styles/
│   │   └── globals.css           # Global theme, CSS variables, component classes
│   └── types.d.ts                # TypeScript ambient types
├── prisma/
│   └── schema.prisma             # Database schema (User, Entry, Task models)
├── data/
│   └── db.json                   # Local file-based database
├── prompts/
│   └── distill.json              # LLM prompt template for summarization
├── public/                       # Static assets (optional)
├── .env.example                  # Example env vars (copy to .env.local)
├── .gitignore                    # Git ignore rules
├── .github/
│   └── copilot-instructions.md   # AI coding guidelines
├── next.config.js                # Next.js config
├── tsconfig.json                 # TypeScript config
├── package.json                  # Dependencies and scripts
├── README.md                     # Quick start guide
└── SETUP.md                      # Detailed setup & run guide
```

## Data Model

### Entries
```typescript
{
  id: string                    // UUID or timestamp-based
  content: string               // Full journal entry text
  summary?: string              // AI-generated summary
  ai_metadata?: {
    provider: 'groq'|'openai'|'mock'
    model: string               // e.g., 'gpt-3.5-turbo', 'heuristic'
    extracted_at: ISO8601       // When distillation ran
    prompt_version: string      // e.g., 'distill_v1' for re-runs
  }
  source: 'text'|'speech'       // Input method
  created_at: ISO8601
}
```

### Tasks
```typescript
{
  id: string                    // UUID or timestamp-based
  entry_id?: string             // Link to originating entry
  title: string                 // Task title
  description?: string          // Optional details
  priority: 'low'|'medium'|'high'
  status: 'todo'|'in_progress'|'done'|'archived'
  created_at: ISO8601
  updated_at?: ISO8601
}
```

### Storage Layer (`src/lib/storage.ts`)
- Automatically detects `DATABASE_URL` environment variable
- If set and Prisma installed: uses Prisma ORM (PostgreSQL)
- Otherwise: uses file-based DB (`data/db.json`)
- **Functions**:
  - `listEntries()` / `createEntry()` / `getEntryById()` / `updateEntrySummary()`
  - `listTasks()` / `createTask()` / `createTasksBulk()` / `updateTask()`

## API Routes

### GET /api/entries
- **Returns**: `{ entries: Entry[] }`
- **Storage**: Calls `listEntries()`

### POST /api/entries
- **Body**: `{ content: string, source?: 'text'|'speech', created_at?: ISO8601 }`
- **Returns**: `{ entry: Entry }`
- **Storage**: Calls `createEntry()`

### POST /api/distill
- **Body**: `{ entryId: string }`
- **Flow**:
  1. Fetch entry from storage
  2. Try LLM providers in order: GROQ → OpenAI → Heuristic
  3. Persist summary + tasks to storage via `updateEntrySummary()` + `createTasksBulk()`
  4. Return: `{ summary: string, tasks: Task[] }`
- **LLM Integration**:
  - **GROQ**: POST to `GROQ_API_URL` with `{ prompt, input }` and header `Authorization: Bearer <GROQ_API_KEY>`
  - **OpenAI**: POST to `https://api.openai.com/v1/chat/completions` with standard Chat Completion format
  - **Heuristic**: Simple regex-based extraction (looks for verbs like "Call", "Email", etc.)

### GET /api/tasks
- **Returns**: `{ tasks: Task[] }`
- **Storage**: Calls `listTasks()`

### POST /api/tasks
- **Body**: `{ title: string, description?: string, priority?: string, entry_id?: string }`
- **Returns**: `{ task: Task }`
- **Storage**: Calls `createTask()`

### GET /api/tasks/[id]
- **Returns**: `{ task: Task }` or 404

### PATCH /api/tasks/[id]
- **Body**: Partial Task object (e.g., `{ status: 'done' }`)
- **Returns**: `{ task: Task }`
- **Storage**: Calls `updateTask()`

### DELETE /api/tasks/[id]
- **Effect**: Sets task status to 'archived' (soft delete)
- **Returns**: `{ ok: true }` or 404

## Frontend Components

### index.tsx (Home / Journal Page)
- **State**:
  - `content`: textarea input
  - `entries`: list of entries from server
  - `loading`: disable buttons during async ops
  - `distillData` / `distillOpen`: modal state
- **Functions**:
  - `fetchEntries()`: GET /api/entries
  - `createEntry()`: POST /api/entries, reset textarea
  - `distill(entryId)`: POST /api/distill, fetch related tasks, open DistillView modal
  - `addToTodo(tasks)`: PATCH tasks to status='todo', navigate to /tasks

### tasks.tsx (Task Board Page)
- **State**:
  - `tasks`: list of all tasks from server
- **Functions**:
  - `fetchTasks()`: GET /api/tasks
  - `toggleDone(task)`: PATCH /api/tasks/[id] with status='done'|'todo'
- **UI**: Simple list, toggle button per task

### DistillView.tsx (Modal)
- **Props**: `{ open, onClose, entry, summary, tasks, onSave }`
- **Display**:
  - Timestamp
  - Initial 120 chars of entry
  - AI summary
  - List of extracted tasks
  - "Add to To‑Do" button (calls `onSave(tasks)`)

### _app.tsx (Root Layout)
- **Loads**:
  - Global CSS (`styles/globals.css`)
  - Google Font (Press Start 2P)
  - Wraps all pages in `.container` div
- **HTML Meta**: viewport, charset, title

## LLM Integration Flow

### Request Flow (POST /api/distill)
1. Client sends `{ entryId }`
2. Server fetches entry from storage
3. Check env vars in order:
   - If `GROQ_API_URL` + `GROQ_API_KEY`: call GROQ endpoint
   - Else if `OPENAI_API_KEY`: call OpenAI
   - Else: use heuristic
4. Parse response (expect JSON with `summary` and `tasks` fields)
5. Update entry summary + create tasks in storage
6. Return response to client

### Groq Request Example
```json
POST https://api.groq.com/openai/v1/chat/completions
Authorization: Bearer <GROQ_API_KEY>

{
  "prompt": "Summarize and extract actionable tasks from the following journal entry. Return strict JSON: {...}",
  "input": "<entry_content>"
}
```

### Heuristic Extraction
```typescript
const verbs = ['Call', 'Email', 'Schedule', 'Buy', 'Pay', 'Finish', ...];
// For each sentence, if it starts with a verb, create a task
```

## Theme & Styling

### CSS Variables (`src/styles/globals.css`)
```css
--bg: #000000           /* Black background */
--fg: #ffffff           /* White text */
--accent: #00ffd5       /* Neon aqua */
--accent-2: #ff3bff     /* Magenta */
--card: #070707         /* Dark card bg */
```

### Key Classes
- `.container`: max-width 920px, centered, auto margins
- `.card`: subtle gradient + border, semi-transparent
- `.btn` / `.btn-primary`: button styles with hover/active
- `.modal-backdrop` / `.modal-card`: fixed-position modal
- `.entry-preview`: pre-wrap text
- `.glow`: text-shadow for accent glow

### Font
- **Primary**: Press Start 2P (retro arcade, 8-bit style)
- **Fallback**: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `NODE_ENV` | Runtime environment | `development`, `production` |
| `GROQ_API_URL` | Groq inference endpoint | `https://api.groq.com/openai/v1/chat/completions` |
| `GROQ_API_KEY` | Groq API key | (API key from groq.com) |
| `OPENAI_API_KEY` | OpenAI API key (fallback) | `sk_...` |
| `DATABASE_URL` | PostgreSQL connection string (optional) | `postgresql://user:pass@localhost:5432/justwrite` |

## Testing & Debugging

### Local Testing
1. Create an entry with test content
2. Click Distill and check:
   - Does the modal open?
   - Does the summary appear?
   - Are tasks listed?
3. Click "Add to To‑Do" and check `/tasks` page
4. Verify tasks appear and can be toggled done

### Server Logs
- Check terminal running `npm run dev` for errors
- Look for LLM provider errors (e.g., API key invalid, network issues)

### Database Inspection
- **File DB**: Open `data/db.json` in editor
- **Prisma DB**: Run `npm run prisma:studio` to open web UI

### Browser DevTools
- Network tab: inspect API requests/responses
- Console: check for JavaScript errors
- Storage: inspect localStorage if needed (currently unused)

## Future Enhancements

1. **Voice Input**: Add `/api/audio/upload` + STT integration (Whisper, AssemblyAI)
2. **Auth**: Add `/api/auth/signup` + `/api/auth/login` with Supabase or Auth0
3. **Brainstorm Canvas**: Free-form idea capture + AI structuring
4. **Attention Queue**: Highlight overdue tasks
5. **Tags & Categories**: Task organization by work/personal/fitness/etc.
6. **Real-time Sync**: WebSockets for live updates across devices
7. **Export**: PDF/Markdown export of entries + tasks
8. **Mood Tracking**: Tone analysis from entries
9. **Habits**: Auto-infer habit patterns from entry/task data
10. **Mobile App**: Flutter/React Native version sharing backend
