import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import MobileShell from '@/components/layout/MobileShell'
import NoteCard, { NotesEmpty } from '@/components/cards/NoteCard'
import NoteEditor from '@/components/editors/NoteEditor'
import { useAuth } from '@/lib/useAuth'
import { useTheme } from '@/lib/ThemeContext'
import type { Note, NoteBlock } from '@/lib/jw-types'

type View = 'list' | 'editor'

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

  // Handle ?voice=1 and ?id=... from routing
  useEffect(() => {
    if (router.query.voice === '1') {
      setStartWithVoice(true)
      setActiveNote(null)
      setView('editor')
    }
    if (router.query.id && notes.length) {
      const found = notes.find((n) => n.id === router.query.id)
      if (found) { setActiveNote(found); setView('editor') }
    }
  }, [router.query, notes])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    fetch('/api/notes', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : { notes: [] })
      .then((data) => setNotes(data.notes ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

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
        const updated = await res.json()
        setNotes((prev) => prev.map((n) => n.id === activeNote.id ? { ...n, ...updated } : n))
      }
    } else {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...data, source: startWithVoice ? 'voice' : 'typed' }),
      })
      if (res.ok) {
        const created = await res.json()
        setNotes((prev) => [created, ...prev])
        setActiveNote(created)
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
