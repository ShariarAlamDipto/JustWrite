import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import AppShell from '@/components/layout/AppShell'
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
  const router = useRouter()

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

  // Handle ?new=1 (from FAB) — consume immediately to prevent reopen loop
  useEffect(() => {
    if (router.query.new === '1') {
      setActiveEntry(null)
      setView('editor')
      router.replace('/journal', undefined, { shallow: true })
    }
  }, [router.query.new]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle ?id=<uuid> (from Connect deep link) — consume immediately to prevent reopen after onBack
  useEffect(() => {
    if (router.query.id && entries.length) {
      const found = entries.find((e) => e.id === router.query.id)
      if (found) {
        setActiveEntry(found)
        setView('editor')
        router.replace('/journal', undefined, { shallow: true })
      }
    }
  }, [router.query.id, entries]) // eslint-disable-line react-hooks/exhaustive-deps

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
    <AppShell activeTab="journal" isDark={isDark}>
      <div className="px-4 pt-4 pb-2">
        <h1
          className="text-lg font-semibold mb-3"
          style={{ color: isDark ? '#f5f5f5' : '#1a1a1a' }}
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

      <div className="px-4 pt-3 pb-4 space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse"
                 style={{ background: isDark ? '#1a1a1a' : '#f0f0f0', borderRadius: '8px' }} />
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
    </AppShell>
  )
}
