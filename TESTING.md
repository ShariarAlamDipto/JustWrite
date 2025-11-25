# JustWrite Integration Testing Checklist

Test all features end-to-end after setup.

## Pre-Flight Checklist

- [ ] Run `npm install` successfully
- [ ] Create `.env.local` with Supabase keys (or leave empty for public mode)
- [ ] Set LLM key (GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY)
- [ ] Run `npm run dev` — server starts without errors
- [ ] Visit `http://localhost:3000` — page loads

## Test Suite A: Public Mode (No Auth)

Run without Supabase keys in `.env.local` (or with empty values).

### A1: Create Entry
- [ ] Navigate to `http://localhost:3000`
- [ ] Type text in textarea (e.g., "I need to fix the bug in auth flow, then write docs")
- [ ] Click **SAVE ENTRY**
- [ ] Entry appears in "RECENT ENTRIES" list below
- [ ] Entry shows correct timestamp

### A2: Distill to Tasks
- [ ] Click **DISTILL** on an entry
- [ ] Modal opens (DistillView)
- [ ] Modal shows entry preview (first ~120 chars)
- [ ] Modal shows "AI SUMMARY" (or heuristic extraction if no LLM key)
- [ ] Modal shows "TASKS" section with extracted tasks
- [ ] Each task shows title, description, priority
- [ ] Click **ADD TO TO-DO** button

### A3: View Task Board
- [ ] Redirected to `/tasks` page
- [ ] **ACTIVE** section shows newly added tasks
- [ ] Each task item shows title, description, priority
- [ ] Click **✓** button on a task

### A4: Mark Task Done
- [ ] Task moves to **COMPLETED** section
- [ ] Completed task shows strikethrough title
- [ ] Click **✓** again to un-complete
- [ ] Task moves back to **ACTIVE** section

### A5: Real-time Sync (Optional)
- [ ] Open app in 2 browser tabs side-by-side
- [ ] In tab 1, create a new entry
- [ ] In tab 2, should see entry appear instantly (no refresh needed)
- [ ] Look for "● LIVE" indicator in nav bar
- [ ] Check browser console (F12 → Console) for Socket.io logs

### A6: UI Polish Check
- [ ] Nav bar displays with "📝 Journal" and "✓ Tasks" links
- [ ] Buttons have glow effect on hover
- [ ] Modal has slide-up animation
- [ ] Loading indicators show "…" while processing
- [ ] Colors match arcade theme (black bg, neon accents)
- [ ] Text readable at small sizes (mobile-friendly)

## Test Suite B: Authenticated Mode (With Supabase)

Requires `.env.local` with Supabase keys set.

### B1: Sign Up with Magic Link
- [ ] Navigate to `http://localhost:3000/auth/login`
- [ ] Page shows "JustWrite" title and email input
- [ ] Type valid email address
- [ ] Click **SEND MAGIC LINK** button
- [ ] Page shows "✓ Check your-email@example.com for a magic link to sign in!"
- [ ] Check inbox (and spam folder) for email from Supabase
- [ ] Email contains a link like `http://localhost:3000/auth/callback?code=...`

### B2: Callback & Session
- [ ] Click magic link in email
- [ ] Browser navigates to `/auth/callback`
- [ ] Page shows "Signing you in..." briefly
- [ ] After 1-2 seconds, redirected to `http://localhost:3000`
- [ ] Nav bar shows your email address (top right)
- [ ] Logout button appears next to email

### B3: Create Entry as Authenticated User
- [ ] Write entry text in textarea
- [ ] Click **SAVE ENTRY**
- [ ] Entry saved and appears in list
- [ ] Open browser DevTools (F12 → Application → LocalStorage)
- [ ] Verify `sb:token` key exists (JWT token from Supabase)

### B4: Distill with Auth
- [ ] Click **DISTILL** on entry
- [ ] Modal opens with summary and tasks
- [ ] DistillView correctly integrates with Supabase auth
- [ ] Click **ADD TO TO-DO**
- [ ] Tasks created and assigned to authenticated user

### B5: Task Board with Auth
- [ ] Navigate to `/tasks`
- [ ] Only tasks created by this user appear
- [ ] Toggle tasks done/not done
- [ ] Verify API responses include auth headers

### B6: Logout
- [ ] Click **Logout** button in nav bar
- [ ] Redirected to `/auth/login`
- [ ] Check LocalStorage → `sb:token` key removed
- [ ] Try accessing `/tasks` → redirected to login

### B7: Session Persistence
- [ ] Sign in via magic link
- [ ] Refresh page (Cmd/Ctrl+R)
- [ ] Still logged in (no redirect to login)
- [ ] Create entry, then refresh
- [ ] Entry still visible

## Test Suite C: LLM Integration

Test with each provider.

### C1: Gemini Flash (Recommended)
- [ ] Set `GEMINI_API_KEY` in `.env.local`
- [ ] Restart dev server
- [ ] Create entry with detailed text
- [ ] Click **DISTILL**
- [ ] Modal shows AI-generated summary (not heuristic)
- [ ] Tasks extracted from entry text
- [ ] Check browser console for `[LLM] Gemini` log

### C2: Groq
- [ ] Set `GROQ_API_URL` and `GROQ_API_KEY` in `.env.local`
- [ ] Remove or comment out `GEMINI_API_KEY`
- [ ] Restart dev server
- [ ] Repeat C1 test
- [ ] Check console for `[LLM] Groq` log

### C3: OpenAI
- [ ] Set `OPENAI_API_KEY` in `.env.local`
- [ ] Remove other LLM keys
- [ ] Restart dev server
- [ ] Repeat C1 test
- [ ] Check console for `[LLM] OpenAI` log

### C4: Fallback (Heuristic)
- [ ] Remove/comment out all LLM keys in `.env.local`
- [ ] Restart dev server
- [ ] Create entry
- [ ] Click **DISTILL**
- [ ] Modal shows heuristic extraction (no actual AI call)
- [ ] Check console for `[LLM] Heuristic` log

## Test Suite D: Error Handling

### D1: Network Errors
- [ ] Open DevTools → Network tab → Throttle to "Offline"
- [ ] Try to create entry
- [ ] Error message shows or gracefully degrades
- [ ] App doesn't crash

### D2: Invalid Entry
- [ ] Try to create entry with only whitespace
- [ ] Button disabled or entry rejected
- [ ] No empty entries in list

### D3: LLM Timeout
- [ ] Set invalid LLM key in `.env.local`
- [ ] Create entry and distill
- [ ] Distill should timeout or fall back to heuristic
- [ ] App doesn't hang or show broken state

### D4: Auth Token Expiry
- [ ] Sign in via magic link
- [ ] Manually delete `sb:token` from LocalStorage (DevTools → Application)
- [ ] Try to create entry
- [ ] Should get 401 error or redirect to login
- [ ] App handles gracefully

## Test Suite E: Browser Compatibility

Test on different browsers (if available):

- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (macOS)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

For each:
- [ ] Pages load correctly
- [ ] Buttons clickable
- [ ] Text readable
- [ ] No console errors (F12 → Console)

## Test Suite F: Performance

### F1: Load Time
- [ ] Open DevTools → Performance tab
- [ ] Record while navigating to home page
- [ ] Time to interactive < 3 seconds
- [ ] First contentful paint < 2 seconds

### F2: Response Time
- [ ] Create entry → logs time to POST response
- [ ] Should be < 500ms (local) or < 1s (with LLM)

### F3: Memory
- [ ] Open DevTools → Memory tab
- [ ] Create 10+ entries
- [ ] Memory usage stable (not continuously growing)

## Smoke Tests (Quick Daily)

After each change, run these:

```
1. npm install
2. npm run dev
3. Create entry → Distill → View tasks
4. Check no console errors (F12)
5. Test login (if Supabase enabled)
6. Check "● LIVE" indicator appears
```

## Known Issues & Workarounds

### Socket.io not connecting
- Check custom `server.js` is being used (port 3000 should show both HTTP and WS)
- Restart dev server
- Check browser console for WebSocket errors

### Supabase auth redirect fails
- Verify redirect URL in Supabase dashboard matches exactly
- For localhost: `http://localhost:3000/auth/callback`
- For production: `https://your-domain.com/auth/callback`

### LLM key errors
- Verify key format (no leading/trailing spaces)
- Check key is for correct provider (Gemini vs Groq vs OpenAI)
- Regenerate key if needed

### Tasks not filtering by user
- Auth middleware is in place but storage layer doesn't filter by user_id yet
- This is a TODO for future: update `src/lib/storage.ts` to accept `userId` param

## Reporting Issues

If something breaks:
1. Check console logs (F12 → Console)
2. Check network tab (F12 → Network)
3. Verify `.env.local` is set correctly
4. Try `npm run dev` restart
5. Check Discord/GitHub issues for similar problems

## Sign-Off Checklist

- [ ] All test suites A, B, C, D pass
- [ ] No console errors
- [ ] App feels responsive (< 2s load time)
- [ ] UI looks polished (matches arcade theme)
- [ ] Ready for demo or production
