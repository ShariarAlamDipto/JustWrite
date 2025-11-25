# Project Structure & Overview

## Directory Tree

```
JustWrite/
├── src/
│   ├── pages/
│   │   ├── index.tsx                 # Journal home (entries, distill modal)
│   │   ├── tasks.tsx                 # Task board (active/completed sections)
│   │   ├── _app.tsx                  # Root layout (Auth provider, fonts)
│   │   ├── api/
│   │   │   ├── entries.ts            # GET/POST entries (with auth)
│   │   │   ├── distill.ts            # POST distill (LLM call → summary + tasks)
│   │   │   └── tasks/
│   │   │       ├── index.ts          # GET/POST tasks (with auth)
│   │   │       └── [id].ts           # GET/PATCH/DELETE task
│   │   └── auth/
│   │       ├── login.tsx             # Magic link sign-in form
│   │       └── callback.tsx          # OAuth callback handler
│   ├── components/
│   │   ├── DistillView.tsx           # Modal (preview, summary, tasks)
│   │   └── Nav.tsx                   # Navigation + auth status
│   ├── lib/
│   │   ├── storage.ts                # DB abstraction (file or Prisma)
│   │   ├── db.ts                     # File-based JSON database
│   │   ├── useSocket.ts              # Socket.io client hook
│   │   ├── socket.ts                 # Socket.io server wrapper
│   │   ├── supabase.ts               # Supabase client (lazy init)
│   │   ├── useAuth.tsx               # Auth context provider
│   │   ├── withAuth.ts               # API middleware (JWT verify)
│   │   └── ProtectedPage.tsx         # Protected page wrapper
│   └── styles/
│       └── globals.css               # Arcade theme + animations
├── prisma/
│   └── schema.prisma                 # Data models (optional PostgreSQL)
├── data/
│   └── db.json                       # File-based database (default)
├── server.js                          # Custom Next.js server with Socket.io
├── package.json                       # Dependencies + scripts
├── tsconfig.json                      # TypeScript config
├── .env.example                       # Environment variable template
├── .gitignore                         # Git ignore patterns
├── README.md                          # Main project overview
├── QUICKSTART.md                      # Setup guide (first-time users)
├── AUTH_SETUP.md                      # Supabase authentication setup
├── TECHNICAL.md                       # Architecture deep-dive
├── TESTING.md                         # Integration test checklist
├── SUMMARY.md                         # Implementation summary
└── COMPLETION_REPORT.md               # What was delivered
```

---

## Data Flow Diagram

### Entry Creation Flow
```
User writes text in textarea
         ↓
Click "SAVE ENTRY"
         ↓
POST /api/entries { content }
         ↓
API calls storage.createEntry()
         ↓
If Prisma: INSERT into DB
If file DB: write to data/db.json
         ↓
Return { entry } with id, timestamp
         ↓
Socket.io emits 'entry:created' to all clients
         ↓
All connected users' lists update instantly (real-time)
         ↓
Entry visible in "RECENT ENTRIES"
```

### Distill Flow (Entry → Tasks)
```
User clicks "DISTILL" on entry
         ↓
POST /api/distill { entryId }
         ↓
Fetch entry content from storage
         ↓
LLM Provider Chain:
  1. Check GEMINI_API_KEY → Call Google Gemini
  2. Check GROQ_API_KEY → Call Groq API
  3. Check OPENAI_API_KEY → Call OpenAI
  4. Else → Heuristic extraction (regex parsing)
         ↓
LLM returns JSON { summary, tasks: [...] }
         ↓
Create task records: storage.createTasksBulk()
         ↓
Return { summary, tasks }
         ↓
Show DistillView modal (preview + summary + tasks)
         ↓
User clicks "ADD TO TO-DO"
         ↓
Tasks saved (already in DB) → Navigate to /tasks
```

### Authentication Flow
```
User visits /auth/login
         ↓
Enters email → Click "SEND MAGIC LINK"
         ↓
Supabase Auth sends email with link:
  http://localhost:3000/auth/callback?code=...
         ↓
User clicks link (checks email)
         ↓
Browser redirected to /auth/callback?code=...
         ↓
Exchange code for JWT:
  supabase.auth.exchangeCodeForSession(code)
         ↓
JWT stored in localStorage['sb:token']
         ↓
Redirected to /
         ↓
useAuth() detects token → user logged in
         ↓
Nav bar shows email + logout button
         ↓
All API requests include: Authorization: Bearer <token>
```

---

## Component Hierarchy

```
_app.tsx (Root)
├── <AuthProvider>
│   ├── <Nav /> (Shows user email or "Sign In")
│   └── <Component /> (Page: index/tasks/auth)
│       ├── (index.tsx)
│       │   ├── <textarea /> (Entry input)
│       │   ├── <EntryCard /> × N (Entry list)
│       │   └── <DistillView /> (Modal)
│       │       ├── Entry Preview
│       │       ├── AI Summary
│       │       ├── Task List
│       │       └── Buttons (Save/Cancel)
│       │
│       ├── (tasks.tsx)
│       │   ├── Stats (Active/Completed count)
│       │   └── <TaskCard /> × N
│       │       ├── Task Title + Description
│       │       └── Toggle Button
│       │
│       ├── (auth/login.tsx)
│       │   ├── Email Input
│       │   └── Send Magic Link Button
│       │
│       └── (auth/callback.tsx)
│           └── "Signing you in..." message
```

---

## State Management

### Global (via Context)
```typescript
// AuthContext (src/lib/useAuth.tsx)
- user: { id, email } | null
- loading: boolean
- signOut: () => Promise<void>

// Socket.io Context (custom in useSocket.ts)
- socket: Socket | null
- isConnected: boolean
```

### Local (per Page)
```typescript
// index.tsx (Journal)
- content: string (textarea)
- entries: Entry[] (list)
- loading: boolean
- distillLoading: string | null (which entry is being distilled)
- distillData: { entry, summary, tasks } (modal data)
- distillOpen: boolean

// tasks.tsx (Tasks Board)
- tasks: Task[]
- loading: boolean
- toggleLoading: string | null (which task is toggling)
```

---

## API Response Shapes

### POST /api/entries
```typescript
Request:  { content: string, source?: string }
Response: { entry: { id, content, created_at, summary?, ai_metadata? } }
```

### POST /api/distill
```typescript
Request:  { entryId: string }
Response: { 
  summary: string,
  tasks: [ { id, title, description, priority } ]
}
```

### GET/POST /api/tasks
```typescript
GET  Response: { tasks: [ { id, title, description, priority, status, entry_id } ] }
POST Response: { task: { id, title, description, priority, status, entry_id } }
```

### GET/PATCH/DELETE /api/tasks/[id]
```typescript
PATCH Request: { title?, description?, priority?, status? }
PATCH Response: { task: { ... } }
DELETE Response: { success: true }
```

---

## Environment Variables

### Supabase (Optional)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### LLM Providers (Choose One)
```bash
# Google Gemini Flash (Recommended)
GEMINI_API_KEY=your_key

# Groq
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_API_KEY=your_key

# OpenAI
OPENAI_API_KEY=sk_your_key
```

### Database (Optional)
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/justwrite
```

---

## Key Technologies

| Component | Library | Version |
|-----------|---------|---------|
| Frontend Framework | Next.js | 14.0.0 |
| UI Library | React | 18.2.0 |
| Language | TypeScript | 5.2.2 |
| Real-time | Socket.io | 4.7.2 |
| Auth | Supabase | 2.38.0 |
| ORM (optional) | Prisma | 5.7.0 |
| Database (optional) | PostgreSQL | - |

---

## How Data Moves

### Create Entry
```
Client (Form)
  ↓ (FormData)
API Route (/api/entries)
  ↓ (JSON body)
Storage Layer (storage.ts)
  ↓ (abstraction)
File DB (data/db.json) OR Prisma Client
  ↓ (write)
Data Persisted
  ↓ (response)
API returns Entry
  ↓ (Socket.io emit)
All Clients Receive Event
  ↓ (UI update)
Entry appears in list (all tabs/browsers)
```

### Distill Entry
```
User clicks "Distill"
  ↓
POST /api/distill
  ↓
Fetch entry from Storage
  ↓
Call LLM Provider (Gemini → Groq → OpenAI → Heuristic)
  ↓
LLM returns summary + tasks JSON
  ↓
Save tasks to Storage
  ↓
Return summary + tasks
  ↓
Show DistillView Modal
```

---

## Authentication Flow

```
Public (No Auth)
  ↓
All endpoints accessible
Database not filtered by user
Everyone sees everyone's entries/tasks

With Supabase Auth
  ↓
Login required to create entries
JWT token in localStorage
All API requests include token in Authorization header
withAuth() middleware verifies token
404 or 401 if invalid/missing token
Storage layer can filter by user_id (TODO)
```

---

## Real-time Sync Flow

```
Socket.io Server (server.js)
  ↓
Listens for connection/disconnect/events
  ↓
Client 1: socket.emit('entry:created', entry)
  ↓
Server receives event
  ↓
Server: socket.broadcast.emit('entry:created', entry)
  ↓
Client 2 receives event (via useSocket hook)
  ↓
setEntries(prev => [newEntry, ...prev])
  ↓
UI re-renders with new entry (no network request needed)
```

---

## Testing Strategy

### Unit Tests (Not Implemented)
- Storage layer functions (createEntry, getTasks, etc.)
- LLM provider chain logic
- Heuristic extraction regex

### Integration Tests (See TESTING.md)
- Create entry → Distill → View tasks (full flow)
- Auth: Sign up → Create entry → Logout
- Real-time: Open 2 tabs → Create entry → Verify instant sync
- LLM: Test each provider chain
- Error handling: Network errors, invalid tokens, etc.

### Manual Tests
- Browser DevTools (console errors, network tab)
- Performance profiling (DevTools → Performance)
- Mobile responsiveness (DevTools → Device Toolbar)

---

## Performance Considerations

- **Lazy Loading**: Supabase client only initialized if env vars present
- **Socket.io**: Only active when useSocket hook mounted (can be removed)
- **CSS**: Minimal animations (GPU-accelerated transforms)
- **Database**: File DB fast for < 1000 entries; recommend Prisma + PostgreSQL for scale

---

## Security Considerations

- ✅ No hardcoded secrets (all env vars)
- ✅ JWT tokens from Supabase (industry standard)
- ✅ API middleware checks token before processing
- ✅ Storage abstraction prevents SQL injection
- ⚠️ No rate limiting (add before production)
- ⚠️ No request logging (add for compliance)

---

This structure supports the core MVP and scales for future features like brainstorm canvas, voice input, or mobile apps.
