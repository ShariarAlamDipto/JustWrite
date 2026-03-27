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
  const [noteLoading, setNoteLoading] = useState(false)

  // Fetch full note (with blocks) before opening editor — prevents empty-block autosave overwriting real content
  const openNote = async (note: Note) => {
    if (!token) return
    setNoteLoading(true)
    try {
      const res = await fetch(`/api/notes/${note.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const { note: full } = await res.json()
        setActiveNote(toNote(full))
      } else {
        setActiveNote(note) // fallback to list item
      }
    } catch {
      setActiveNote(note) // fallback on network error
    } finally {
      setNoteLoading(false)
      setView('editor')
    }
  }

  // Handle ?new=1, ?voice=1 (from FAB) and ?id=<uuid> (from Connect deep link).
  // Consume query params immediately via router.replace to prevent reopen on back+refetch.
  useEffect(() => {
    if (router.query.new === '1') {
      setStartWithVoice(router.query.voice === '1')
      setActiveNote(null)
      setView('editor')
      router.replace('/notes', undefined, { shallow: true })
    }
  }, [router.query.new]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (router.query.id && notes.length) {
      const found = notes.find((n) => n.id === router.query.id)
      if (found) {
        router.replace('/notes', undefined, { shallow: true })
        openNote(found)
      }
    }
  }, [router.query.id, notes]) // eslint-disable-line react-hooks/exhaustive-deps

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
        // Map isPrivate → is_locked (API field name)
        body: JSON.stringify({ ...data, is_locked: data.isPrivate }),
      })
      if (res.ok) {
        const { note: updated } = await res.json()
        setNotes((prev) => prev.map((n) => n.id === activeNote.id ? toNote(updated) : n))
      }
    } else {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        // Map isPrivate → is_locked (API field name)
        body: JSON.stringify({ ...data, is_locked: data.isPrivate, source: startWithVoice ? 'voice' : 'typed' }),
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
      <div className="pt-4 px-4 mb-2">
        <h1
          className="text-lg font-semibold"
          style={{ color: isDark ? '#f5f5f5' : '#1a1a1a' }}
        >
          Notes
        </h1>
      </div>

      <div className="px-4 pb-4 space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse"
              style={{ background: isDark ? '#1a1a1a' : '#f0f0f0', borderRadius: '8px' }}
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
              onClick={() => openNote(note)}
            />
          ))
        )}
      </div>
    </MobileShell>
  )
}
