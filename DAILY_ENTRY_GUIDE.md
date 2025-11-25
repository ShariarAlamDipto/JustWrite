# Daily Entry Template - Complete Guide

## 🎯 Overview

JustWrite now features a **comprehensive daily entry template** with expandable sections that keep the interface minimal while supporting deep journaling, mood tracking, gratitude practice, and AI-powered task extraction.

**Access**: Navigate to **✍️ New Entry** from the main menu or visit `/entry`

---

## 🎨 UI Structure

### Default View (Always Visible)
1. **Title** (optional) — Quick label for search
2. **Mood** — Emoji slider + intensity scale
3. **Your Thoughts** — Free-form journal writing
4. **Gratitude** — 3-line gratitude practice

### Expandable Sections
5. **Guided Prompts** — 10 science-backed prompts (collapsed by default)
6. **AI Analysis Button** — Generate summary + extract tasks
7. **AI Summary** — 1-2 line AI-generated summary
8. **Extracted To-Dos** — Editable task list with If-Then plans

---

## ✨ Features Breakdown

### 1. **Mood Tracking**
- **Emoji Slider**: 10-level mood scale (😢 to 🌟)
- **Intensity Scale**: 0–10 slider showing emotional intensity
- **Persistent**: Saved with each entry for mood trends over time

**Why**: Mood tracking + intensity helps identify patterns and correlations with life events (evidence-based in emotion regulation research).

---

### 2. **Quick Gratitude (3 Things)**
- Three short text fields
- Encourages capturing small + big wins
- **Copy**: "Write even tiny things — small wins count."

**Science**: Daily gratitude boosts positive affect and wellbeing (Emmons, UC Davis).

---

### 3. **10 Science-Backed Prompts**

All prompts are collapsible and optional. Each includes:
- **Question** — The prompt itself
- **Rationale** — Why this matters (backed by research)
- **Checkbox** — Toggle to answer or skip
- **Text Area** — Answer appears only when selected

#### Categories:

**Morning / Planning** (Turn thought → action)
1. "What are the top 3 outcomes I want from today?"
   - *Rationale*: Forces prioritization; primes goal-directed behavior
   
2. "If I get interrupted, what will I do to still make progress?"
   - *Rationale*: Implementation intentions dramatically increase follow-through

**Gratitude / Positive Affect**
3. "List three things you're grateful for today — small or big."
   - *Rationale*: Short daily gratitude boosts positive affect

4. "What went well yesterday?"
   - *Rationale*: Reinforces learning from small wins; increases optimism

**Emotional Processing / CBT**
5. "What situation caused the strongest emotion today? (Describe: what happened, thought, intensity 0–10)"
   - *Rationale*: Structured recording helps identify automatic thoughts; core CBT move

6. "Now list one realistic alternative thought or interpretation."
   - *Rationale*: Reappraisal decreases emotional intensity (evidence-based CBT technique)

**Reflection & Learning**
7. "What's one lesson I learned recently that I want to keep in mind?"
   - *Rationale*: Promotes metacognition; consolidates learning

8. "What's the one thing I can do in the next 24 hours that would make tomorrow noticeably better?"
   - *Rationale*: Keeps journal→action funnel tight; candidates for tasks

**Expressive / Stress**
9. "If you could say one honest thing right now, what is it? (10 minutes of free writing)"
   - *Rationale*: Uncensored long writing has therapeutic effects (PMC research)

**Micro-planning / Closure**
10. "Pick 1 extracted task and write its next step (one sentence)."
    - *Rationale*: Breaking tasks into immediate next steps reduces friction

---

### 4. **AI Analysis & Task Extraction**

**Button**: "✨ ANALYZE WITH AI"

**What it does**:
1. Combines all entry data (title, freeText, gratitude, prompt answers)
2. Calls LLM to generate 1–2 line summary
3. Extracts candidate tasks using `/api/brainstorm` endpoint
4. Displays both summary + extracted tasks

**Advanced Features**:
- **If-Then Plans**: Add implementation intention for each task
  - Example: "If I start work → Then I'll fix the bug first"
  - Evidence-based behavior change technique (Cancer Control Division)
  
- **Task Approval**: User must explicitly select tasks before adding to to-do board
- **Priority Detection**: AI tags tasks as high/medium/low

**When to Use**:
- After writing >100 words (expressive entries)
- When planning your day (from morning planning prompts)
- When extracting action items from emotional/stressful entries

---

## 🧠 How AI Treats Different Entry Types

### **Gratitude & "What Went Well"**
→ Mapped to separate "wellbeing timeline" (future feature)
→ Shows positive affect trends over time

### **CBT Structure (Prompts 5–6)**
If user answers situation + thought + emotion prompts:
→ Surface CBT thought-record card
→ Offer short coach guidance

**UX Copy**: "Not feeling great? Try: What happened → What I thought → What I felt"

### **Expressive Writing (Prompt 9)**
If entry >100 words + emotional/stressful:
→ Offer "Analyze & Extract" button
→ Summarize + optionally convert coping steps into tasks
→ Show therapeutic affirmation

### **Implementation Intentions**
For 1–2 high-priority tasks:
→ Suggest one-tap "If X → Then Y" conversion
→ Nudge backed by behavior science

---

## 💾 Auto-Save & Persistence

- **Auto-saves** every 2 seconds after changes (if logged in)
- **Status indicator**: Shows "💾 Saving..." → "✓ Saved"
- Entry data includes:
  - `title`
  - `content` (freeText)
  - `metadata`:
    - `mood` (1–10)
    - `moodIntensity` (0–10)
    - `gratitude` (array of strings)
    - `promptAnswers` (dict of prompt ID → answer)

---

## 🔗 Data Flow

```
User writes entry
        ↓
Auto-saves to DB every 2 seconds
        ↓
User clicks "ANALYZE WITH AI"
        ↓
POST /api/brainstorm (task extraction)
        ↓
POST /api/distill (summary generation)
        ↓
Display summary + extracted tasks
        ↓
User selects tasks + adds If-Then plans
        ↓
POST /api/tasks (adds to to-do board)
```

---

## 🛠️ Technical Implementation

### Components
- **`entry.tsx`** — Main page, layout, collapsible sections
- **`MoodSlider.tsx`** — Mood emoji selector + intensity slider
- **`PromptCard.tsx`** — Individual prompt with checkbox + answer area
- **`AIExtractedTasks.tsx`** — Task list with If-Then plan inputs

### API Endpoints Used
- **`POST /api/entries`** — Save entry with metadata
- **`POST /api/brainstorm`** — Extract tasks from text
- **`POST /api/distill`** — Generate summary (modified to support `customText`)
- **`POST /api/tasks`** — Add tasks to to-do board

### Environment Requirements
- `GROQ_API_URL` and `GROQ_API_KEY` for LLM task extraction
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for auth

---

## 🎮 UX Copy Throughout

| Section | Copy | Purpose |
|---------|------|---------|
| Gratitude | "Write even tiny things — small wins count." | Encourage small wins |
| CBT Prompts | "Not feeling great? Try: Situation → Thought → Emotion" | Guide structure |
| Planning | "Pick one thing to 'defend' with an if-then plan." | Prioritization nudge |
| AI Button | "Generates summary & extracts actionable tasks" | Explain feature |
| Tasks | "Implementation intentions increase follow-through" | Explain If-Then value |

---

## 🚀 Usage Scenarios

### Morning Planning Session
1. Open **New Entry**
2. Answer Prompt 1: "Top 3 outcomes today?"
3. Answer Prompt 2: "If-Then plan for interruptions?"
4. Click "ANALYZE WITH AI"
5. Review extracted tasks, add If-Then plans
6. Add to to-do board

**Time**: ~5–10 minutes

### Evening Reflection
1. Open **New Entry**
2. Write free-form in **Your Thoughts** (~5–10 min)
3. Add 3 gratitudes in **Gratitude** section
4. Optional: Answer Prompts 7–8 (Reflection & Learning)
5. Click "ANALYZE WITH AI" to extract lessons as tasks
6. Save

**Time**: ~10–15 minutes

### Heavy/Stressful Entry
1. Open **New Entry**
2. Choose Prompt 5: "What situation caused strongest emotion?"
3. Write situation, thought, intensity
4. Answer Prompt 6: "Alternative thought?"
5. Click "ANALYZE WITH AI"
6. Review summary + suggested coping tasks
7. Add tasks if helpful

**Time**: ~10–20 minutes (therapeutic write)

---

## 📊 Future Extensions

1. **Wellbeing Timeline**: Dashboard showing gratitude + mood trends
2. **CBT Thought Records**: Dedicated card for situation/thought/emotion/alternative pattern
3. **Voice Notes**: Mic button → transcribe + auto-suggest tasks
4. **Prompt Rotation**: Show different prompts each day
5. **Habit Streaks**: "X day gratitude streak" badges
6. **Export**: PDF/email weekly/monthly journals
7. **Tags**: Auto-tag entries with mood, category, themes

---

## ✅ Testing Checklist

- [ ] Can create new entry with all sections
- [ ] Mood slider changes emoji + intensity reflects visually
- [ ] Gratitude text saves (all 3 fields)
- [ ] Can toggle prompts on/off, answers appear/disappear
- [ ] "ANALYZE WITH AI" calls Groq + distill APIs
- [ ] Extracted tasks appear in list
- [ ] Can select/deselect tasks
- [ ] Can add If-Then plans for selected tasks
- [ ] "ADD TO TO-DO LIST" button adds tasks to `/tasks` page
- [ ] Auto-save status shows correctly
- [ ] Entry data persists after page reload
- [ ] All sections expand/collapse smoothly
- [ ] Mobile responsive (single column)

---

## 🎓 Science References

- **Implementation Intentions**: Gollwitzer, P. M. (1999) — "If-then plans" increase follow-through
- **Gratitude**: Emmons, R.A. & McCullough, M.E. (2003) — Daily gratitude → wellbeing
- **CBT Thought Records**: Beck, A.T. (1964) — Cognitive Therapy for depression
- **Expressive Writing**: Pennebaker, J.W. (2004) — Health benefits of long writing sessions
- **Metacognition**: Schraw, G. & Dennison, R.S. (1994) — Learning via reflection
- **Behavioral Change**: Prochaska & DiClemente (1983) — Stages of change model

---

See `entry.tsx` and component files for implementation details.
