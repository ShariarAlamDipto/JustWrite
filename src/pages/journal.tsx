import React, { useState, useEffect, useCallback } from 'react'
import MobileShell from '@/components/layout/MobileShell'
import JournalCard, { TodayCard } from '@/components/cards/JournalCard'
import JournalEditor from '@/components/editors/JournalEditor'
import { useAuth } from '@/lib/useAuth'
import { useTheme } from '@/lib/ThemeContext'
import type { JournalEntry, ListFilter } from '@/lib/jw-types'

type View = 'list' | 'editor'

const CACHE_KEY = (uid: string) => `jw:journal:${uid}`

// ── Map raw snake_case DB row → JournalEntry camelCase ───────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toJournalEntry(raw: any): JournalEntry {
  return {
    id:         raw.id,
    userId:     raw.user_id,
    createdAt:  raw.created_at,
    updatedAt:  raw.updated_at,
    body:       raw.content ?? '',
    title:      raw.title ?? undefined,
    mood:       raw.mood ?? undefined,
    wordCount:  raw.word_count ?? 0,
    isPrivate:  raw.is_private ?? false,
    isLocked:   raw.is_locked ?? false,
    source:     raw.source ?? 'typed',
    tags:       raw.tags ?? [],
    segment:    'journal',
  }
}

// ── Tiny localStorage cache helpers ──────────────────────────────────────────
function readCache(uid: string): JournalEntry[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY(uid))
    return raw ? (JSON.parse(raw) as JournalEntry[]) : []
  } catch {
    return []
  }
}

function writeCache(uid: string, data: JournalEntry[]) {
  try {
    localStorage.setItem(CACHE_KEY(uid), JSON.stringify(data.slice(0, 50)))
  } catch { /* quota exceeded — ignore */ }
}

const DEFAULT_FILTER: ListFilter = { query: '', showPrivate: true, sort: 'newest' }

export default function JournalPage() {
  const { user, token } = useAuth()
  const { isDark } = useTheme()

  // ── Start with cached data so the list renders immediately ──────────────────
  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    if (typeof window === 'undefined') return []
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('jw:journal:'))
    if (keys.length) {
      try { return JSON.parse(localStorage.getItem(keys[0]) ?? '[]') } catch { return [] }
    }
    return []
  })
  // Only show skeleton when there is truly no cached data at all
  const [loading, setLoading] = useState(entries.length === 0)
  const [view, setView] = useState<View>('list')
  const [activeEntry, setActiveEntry] = useState<Partial<JournalEntry> | null>(null)
  const [filter] = useState<ListFilter>(DEFAULT_FILTER)
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())

  // ── Fetch fresh entries (silent refresh if cached data already shown) ────────
  const fetchEntries = useCallback(async () => {
    if (!user || !token) return
    try {
      const res = await fetch('/api/entries?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const fresh: JournalEntry[] = (data.entries ?? []).map(toJournalEntry)
      setEntries(fresh)
      writeCache(user.id, fresh)
    } catch { /* network error — keep showing cached */ }
    finally { setLoading(false) }
  }, [user, token])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayEntry = entries.find((e) => (e.createdAt ?? '').startsWith(todayStr))

  const filtered = entries.filter((e) => {
    if (!filter.query) return true
    const q = filter.query.toLowerCase()
    return (e.body ?? '').toLowerCase().includes(q) || (e.title ?? '').toLowerCase().includes(q)
  })

  const handleSave = async (data: { title?: string; body: string; isPrivate: boolean; mood?: number }) => {
    if (!user || !token) return
    if (activeEntry?.id) {
      const res = await fetch(`/api/entries/${activeEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: data.body, mood: data.mood }),
      })
      if (res.ok) {
        const { entry: updated } = await res.json()
        setEntries((prev) => prev.map((e) => e.id === activeEntry.id
          ? { ...e, body: updated.content ?? e.body, mood: updated.mood ?? e.mood }
          : e
        ))
      }
    } else {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: data.body, source: 'text', mood: data.mood }),
      })
      if (res.ok) {
        const { entry: created } = await res.json()
        const mapped = toJournalEntry(created)
        setEntries((prev) => {
          const next = [mapped, ...prev]
          writeCache(user.id, next)
          return next
        })
        setActiveEntry(mapped)
      }
    }
  }

  if (view === 'editor') {
    return (
      <JournalEditor
        entry={activeEntry ?? undefined}
        isDark={isDark}
        onSave={handleSave}
        onBack={() => { setView('list'); setActiveEntry(null); fetchEntries() }}
      />
    )
  }

  return (
    <MobileShell activeTab="journal" isDark={isDark}>
      <div className="px-4 pt-5 pb-2">
        <h1
          className="text-2xl font-bold mb-4"
          style={{ color: isDark ? '#F2F0EB' : '#1A1A1A', letterSpacing: '-0.025em' }}
        >
          Journal
        </h1>

        <TodayCard
          isDark={isDark}
          hasEntry={!!todayEntry}
          wordCount={todayEntry?.wordCount}
          onClick={() => { setActiveEntry(todayEntry ?? null); setView('editor') }}
        />
      </div>

      <div className="px-4 pt-4 pb-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl animate-pulse"
                 style={{ background: isDark ? '#1C1C1C' : '#EEECE8' }} />
          ))
        ) : (
          filtered
            .filter((e) => !(e.createdAt ?? '').startsWith(todayStr))
            .map((entry) => (
              <JournalCard
                key={entry.id}
                entry={entry}
                isDark={isDark}
                isUnlocked={unlockedIds.has(entry.id)}
                onUnlock={() => setUnlockedIds((prev) => new Set(prev).add(entry.id))}
                onClick={() => { setActiveEntry(entry); setView('editor') }}
              />
            ))
        )}
      </div>
    </MobileShell>
  )
}
