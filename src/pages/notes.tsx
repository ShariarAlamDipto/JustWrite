import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import MobileShell from '@/components/layout/MobileShell'
import NoteCard, { NotesEmpty } from '@/components/cards/NoteCard'
import NoteEditor from '@/components/editors/NoteEditor'
import { useAuth } from '@/lib/useAuth'
import { useTheme } from '@/lib/ThemeContext'
import type { Note, NoteBlock } from '@/lib/jw-types'

type View = 'list' | 'editor'

// ── Map raw snake_case DB row → Note camelCase ─────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toNote(raw: any): Note {
  return {
    id:            raw.id,
    userId:        raw.user_id ?? '',
    createdAt:     raw.created_at ?? '',
    updatedAt:     raw.updated_at ?? '',
    isPrivate:     raw.is_locked ?? false,
    isLocked:      raw.is_locked ?? false,
    isPinned:      raw.is_pinned ?? false,
    source:        raw.source ?? 'typed',
    tags:          raw.tags ?? [],
    title:         raw.title ?? 'Untitled',
    icon:          raw.icon ?? '',
    blocks:        raw.blocks ?? [],
    coverUrl:      raw.cover_url ?? undefined,
    parentId:      raw.parent_id ?? undefined,
    linkedNoteIds: raw.linked_note_ids ?? [],
    wordCount:     raw.word_count ?? 0,
    segment:       'notes',
  }
}

export default function NotesPage() {
  const { user, token } = useAuth()
  const { isDark } = useTheme()
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('list')
  const [activeNote, setActiveNote] = useState<Partial<Note> | null>(null)
  const [startWithVoice, setStartWithVoice] = useState(false)
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())

  // Handle ?new=1, ?voice=1 (from FAB) and ?id=<uuid> (from Connect deep link)
  useEffect(() => {
    if (router.query.new === '1') {
      setStartWithVoice(router.query.voice === '1')
      setActiveNote(null)
      setView('editor')
    }
    if (router.query.id && notes.length) {
      const found = notes.find((n) => n.id === router.query.id)
      if (found) { setActiveNote(found); setView('editor') }
    }
  }, [router.query, notes])

  useEffect(() => {
    if (!user || !token) return
    setLoading(true)
    fetch('/api/notes', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : { notes: [] })
      .then((data) => setNotes((data.notes ?? []).map(toNote)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, token])

  const handleSave = async (data: {
    title: string
    blocks: NoteBlock[]
    isPrivate: boolean
    tags: string[]
    icon?: string
  }) => {
    if (!user) return

    if (activeNote?.id) {
      const res = await fetch(`/api/notes/${activeNote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const { note: updated } = await res.json()
        setNotes((prev) => prev.map((n) => n.id === activeNote.id ? toNote(updated) : n))
      }
    } else {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...data, source: startWithVoice ? 'voice' : 'typed' }),
      })
      if (res.ok) {
        const { note: created } = await res.json()
        const mapped = toNote(created)
        setNotes((prev) => [mapped, ...prev])
        setActiveNote(mapped)
        setStartWithVoice(false)
      }
    }
  }

  if (view === 'editor') {
    return (
      <NoteEditor
        note={activeNote ?? undefined}
        isDark={isDark}
        onSave={handleSave}
        onBack={() => { setView('list'); setActiveNote(null); setStartWithVoice(false) }}
        startWithVoice={startWithVoice}
      />
    )
  }

  // Sort: pinned first, then by updatedAt desc
  const sorted = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return b.updatedAt > a.updatedAt ? 1 : -1
  })

  return (
    <MobileShell activeTab="notes" isDark={isDark}>
      <div className="pt-5 px-4 mb-3">
        <h1
          className="text-2xl font-bold"
          style={{ color: isDark ? '#F2F0EB' : '#1A1A1A', letterSpacing: '-0.025em' }}
        >
          Notes
        </h1>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl animate-pulse"
              style={{ background: isDark ? '#1C1C1C' : '#EEECE8' }}
            />
          ))
        ) : sorted.length === 0 ? (
          <NotesEmpty
            isDark={isDark}
            onCreate={() => {
              setActiveNote(null)
              setView('editor')
            }}
          />
        ) : (
          sorted.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isDark={isDark}
              isUnlocked={unlockedIds.has(note.id)}
              onUnlock={() => setUnlockedIds((prev) => new Set(prev).add(note.id))}
              onClick={() => {
                setActiveNote(note)
                setView('editor')
              }}
            />
          ))
        )}
      </div>
    </MobileShell>
  )
}
