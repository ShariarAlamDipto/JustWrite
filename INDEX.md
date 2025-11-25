# JustWrite — Start Here 📝

Welcome! This guide will help you navigate the project and get started quickly.

---

## 🚀 Quick Start (5 minutes)

### 1. Install & Run
```powershell
npm install
npm run dev
```

### 2. Visit the App
Open `http://localhost:3000` in your browser.

### 3. Try It
- Write an entry in the textarea
- Click **SAVE ENTRY**
- Click **DISTILL** to summarize
- Click **ADD TO TO-DO** to create tasks
- Go to `/tasks` to see the board

**Done!** You've used JustWrite. 🎉

---

## 📚 Documentation Guide

### For First-Time Users
1. **[QUICKSTART.md](./QUICKSTART.md)** — Step-by-step setup (LLM keys, Supabase optional)
2. **[README.md](./README.md)** — Project overview and features

### For Developers
1. **[TECHNICAL.md](./TECHNICAL.md)** — Architecture, API routes, storage layer
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Data flow diagrams, component hierarchy
3. **[.github/copilot-instructions.md](./.github/copilot-instructions.md)** — AI coding guidelines

### For Setup & Integration
1. **[AUTH_SETUP.md](./AUTH_SETUP.md)** — Supabase authentication (optional but recommended)
2. **[TESTING.md](./TESTING.md)** — Integration test checklist (validate everything works)
3. **[SUMMARY.md](./SUMMARY.md)** — What was built and how it works

### For Project Tracking
1. **[COMPLETION_REPORT.md](./COMPLETION_REPORT.md)** — What tasks were completed and when
2. **[This file](./INDEX.md)** — You are here!

---

## 🎯 Choose Your Path

### Path A: Just Want to Use It?
```
1. Read: QUICKSTART.md (2 min)
2. Run: npm install && npm run dev
3. Use: http://localhost:3000
4. Enjoy: Create entries and tasks
```

### Path B: Want to Deploy?
```
1. Read: QUICKSTART.md + AUTH_SETUP.md (10 min)
2. Setup: Configure .env.local with API keys
3. Test: Follow TESTING.md checklist
4. Deploy: Use Vercel deployment guide
5. Production: Update Supabase redirect URLs
```

### Path C: Want to Understand the Code?
```
1. Read: README.md + TECHNICAL.md (20 min)
2. Explore: Check src/pages/api/ for route structure
3. Study: Look at src/lib/storage.ts for DB abstraction
4. Reference: Use ARCHITECTURE.md for data flows
5. Modify: Update as needed for your use case
```

### Path D: Want to Extend It?
```
1. Read: TECHNICAL.md + ARCHITECTURE.md (30 min)
2. Understand: Storage layer, LLM chain, auth flow
3. Plan: What feature to add?
4. Implement: Follow patterns already established
5. Test: Use TESTING.md checklist to validate
```

---

## 🔑 Environment Setup

### Minimal Setup (Works Immediately)
```powershell
npm install
npm run dev
# Visit http://localhost:3000
# No auth, heuristic task extraction (no LLM)
```

### Recommended Setup (10 minutes)
1. Get free API key: https://ai.google.dev → Get API Key
2. Add to `.env.local`:
```bash
GEMINI_API_KEY=your_key_here
```
3. Restart `npm run dev`
4. Distill will now use Google Gemini Flash

### Full Setup (30 minutes)
1. Create Supabase project: https://supabase.com
2. Add to `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```
3. Configure redirect URL in Supabase: `http://localhost:3000/auth/callback`
4. Restart and visit `/auth/login`

---

## 📁 Project Structure

**Core Pages**:
- `/` — Journal (create entries, distill, view modal)
- `/tasks` — Task board (active + completed)
- `/auth/login` — Sign in with magic link

**Key Files**:
- `src/pages/api/distill.ts` — LLM integration
- `src/lib/storage.ts` — Database abstraction
- `src/lib/useAuth.tsx` — Authentication context
- `src/styles/globals.css` — Arcade theme

**More Info**: See [ARCHITECTURE.md](./ARCHITECTURE.md) for full directory tree.

---

## ✅ Testing & Validation

### Quick Smoke Test
```
1. npm install ✓
2. npm run dev ✓
3. Create entry ✓
4. Distill → See tasks ✓
5. Go to /tasks ✓
6. Mark task done ✓
```

### Full Integration Testing
See [TESTING.md](./TESTING.md) for comprehensive test suites (A-F).

---

## 🐛 Troubleshooting

### App won't start
```powershell
# Clear node_modules and reinstall
rm -r node_modules
npm install
npm run dev
```

### Magic link not working
- Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Verify redirect URL in Supabase: Auth → Providers → Email → Redirect URLs
- Check spam folder for email

### Distill not working
- Check `.env.local` has `GEMINI_API_KEY` (or `GROQ_API_KEY`/`OPENAI_API_KEY`)
- Verify API key is valid (not expired)
- Try without key → should use heuristic extraction

### Real-time sync not working
- Check browser console (F12 → Console) for errors
- Verify `npm run dev` is running custom server (not `next dev`)
- Look for "● LIVE" indicator in nav bar

---

## 🎨 Arcade Theme

JustWrite uses a custom arcade/retro game aesthetic:
- **Colors**: Black background (#000), Neon aqua (#00ffd5), Magenta (#ff3bff)
- **Font**: Press Start 2P (loaded via Google Fonts)
- **Style**: Glowing text, animated modals, pixelated UI

Customize in `src/styles/globals.css` by changing CSS variables:
```css
:root {
  --bg: #000000;
  --fg: #ffffff;
  --accent: #00ffd5;
}
```

---

## 📊 What's Included

✅ **Built**:
- Journal entry creation
- AI-powered task distillation
- Task board with done/not-done toggle
- Real-time sync across tabs
- User authentication (optional)
- Arcade-themed UI

❌ **Not Built (but could be)**:
- Brainstorm canvas
- Voice input
- Mobile app
- Collaborative editing
- AI task prioritization

---

## 🚀 Deploy to Production

### Vercel (Recommended, 2 minutes)
```powershell
npm install -g vercel
vercel --prod
```

Then:
1. Set environment variables in Vercel dashboard
2. Update Supabase redirect URL to production domain

### Self-Hosted (Docker)
See `QUICKSTART.md` for Docker setup.

---

## 💡 Next Steps

1. **Read** the [QUICKSTART.md](./QUICKSTART.md)
2. **Run** the app with `npm run dev`
3. **Test** with the [TESTING.md](./TESTING.md) checklist
4. **Deploy** to Vercel or your server
5. **Extend** by following patterns in the code

---

## 📖 Reference Docs

| Document | Purpose |
|----------|---------|
| [README.md](./README.md) | Project overview |
| [QUICKSTART.md](./QUICKSTART.md) | Setup guide (first-time users) |
| [AUTH_SETUP.md](./AUTH_SETUP.md) | Supabase authentication |
| [TECHNICAL.md](./TECHNICAL.md) | Architecture & implementation |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Data flows & structure |
| [TESTING.md](./TESTING.md) | Integration test checklist |
| [SUMMARY.md](./SUMMARY.md) | Implementation summary |
| [COMPLETION_REPORT.md](./COMPLETION_REPORT.md) | What was delivered |
| [.github/copilot-instructions.md](./.github/copilot-instructions.md) | AI coding guidelines |

---

## 🤔 Questions?

- **How do I...?** → Check [QUICKSTART.md](./QUICKSTART.md)
- **How does...work?** → Check [TECHNICAL.md](./TECHNICAL.md)
- **What was built?** → Check [COMPLETION_REPORT.md](./COMPLETION_REPORT.md)
- **Where do I...?** → Check [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 🎉 Ready?

Let's go! 🚀

```powershell
npm install
npm run dev
```

Then open `http://localhost:3000` and start journaling.

---

**Happy writing!** 📝✨

Built with ❤️ using Next.js, React, TypeScript, Socket.io, Supabase, and Google Gemini API.
