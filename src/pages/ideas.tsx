import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import MobileShell from '@/components/layout/MobileShell'
import IdeaCard, { QuickCapture } from '@/components/cards/IdeaCard'
import IdeaEditor from '@/components/editors/IdeaEditor'
import { useAuth } from '@/lib/useAuth'
import { useTheme } from '@/lib/ThemeContext'
import type { Idea } from '@/lib/jw-types'

type View = 'list' | 'editor'

// ── Map raw snake_case DB row → Idea camelCase ────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toIdea(raw: any): Idea {
  return {
    id:                  raw.id,
    userId:              raw.user_id,
    createdAt:           raw.created_at,
    updatedAt:           raw.updated_at,
    body:                raw.content ?? '',
    title:               raw.title ?? undefined,
    isPrivate:           raw.is_private ?? false,
    isLocked:            raw.is_locked ?? false,
    source:              raw.source ?? 'typed',
    tags:                raw.tags ?? [],
    segment:             'ideas',
    convertedToNoteId:   raw.converted_to_note_id ?? undefined,
    voiceTranscriptId:   raw.voice_transcript_id ?? undefined,
  }
}

export default function IdeasPage() {
  const { user, token } = useAuth()
  const { isDark } = useTheme()
  const router = useRouter()
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('list')
  const [activeIdea, setActiveIdea] = useState<Partial<Idea> | null>(null)
  const [startWithVoice, setStartWithVoice] = useState(false)
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())

  // Handle ?new=1, ?voice=1 (from FAB) — consume immediately to prevent reopen loop
  useEffect(() => {
    if (router.query.new === '1') {
      setStartWithVoice(router.query.voice === '1')
      setActiveIdea(null)
      setView('editor')
      router.replace('/ideas', undefined, { shallow: true })
    }
  }, [router.query.new]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle ?id=<uuid> (from Connect deep link) — consume immediately
  useEffect(() => {
    if (router.query.id && ideas.length) {
      const found = ideas.find((i) => i.id === router.query.id)
      if (found) {
        setActiveIdea(found)
        setView('editor')
        router.replace('/ideas', undefined, { shallow: true })
      }
    }
  }, [router.query.id, ideas]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user || !token) return
    setLoading(true)
    fetch('/api/entries?type=idea', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setIdeas((data.entries ?? []).map(toIdea)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, token])

  const handleSave = async (data: { title?: string; body: string; isPrivate: boolean; tags: string[] }) => {
    if (!user) return
    if (activeIdea?.id) {
      const res = await fetch(`/api/entries/${activeIdea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        // Entries API accepts `content` not `body`
        body: JSON.stringify({ content: data.body }),
      })
      if (res.ok) {
        const { entry: updated } = await res.json()
        setIdeas((prev) => prev.map((i) => i.id === activeIdea.id ? { ...i, ...toIdea(updated) } : i))
      }
    } else {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: data.body, type: 'idea', source: startWithVoice ? 'voice' : 'typed' }),
      })
      if (res.ok) {
        const { entry: created } = await res.json()
        const mapped = toIdea(created)
        setIdeas((prev) => [mapped, ...prev])
        setActiveIdea(mapped)
        setStartWithVoice(false)
      }
    }
  }

  const handleQuickCapture = async (text: string) => {
    if (!user) return
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: text, type: 'idea', source: 'typed' }),
    })
    if (res.ok) {
      const { entry: created } = await res.json()
      setIdeas((prev) => [toIdea(created), ...prev])
    }
  }

  const handleConvertToNote = async () => {
    if (!user || !activeIdea?.id) return
    const res = await fetch('/api/entries/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ideaId: activeIdea.id }),
    })
    if (res.ok) {
      router.push('/notes')
    }
  }

  if (view === 'editor') {
    return (
      <IdeaEditor
        idea={activeIdea ?? undefined}
        isDark={isDark}
        onSave={handleSave}
        onBack={() => { setView('list'); setActiveIdea(null); setStartWithVoice(false) }}
        onConvertToNote={activeIdea?.id ? handleConvertToNote : undefined}
        startWithVoice={startWithVoice}
      />
    )
  }

  return (
    <MobileShell activeTab="ideas" isDark={isDark}>
      <div className="pt-4">
        <div className="px-4 mb-1">
          <h1
            className="text-lg font-semibold"
            style={{ color: isDark ? '#f5f5f5' : '#1a1a1a' }}
          >
            Ideas
          </h1>
        </div>

        {/* Quick capture — always visible */}
        <QuickCapture
          isDark={isDark}
          onSubmit={handleQuickCapture}
          onVoice={() => {
            setStartWithVoice(true)
            setActiveIdea(null)
            setView('editor')
          }}
        />

        {/* Ideas list */}
        <div className="px-4 pt-2 pb-4 space-y-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse"
                style={{ background: isDark ? '#1a1a1a' : '#f0f0f0', borderRadius: '8px' }}
              />
            ))
          ) : ideas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💡</div>
              <p style={{ color: 'var(--muted)' }}>Capture your first idea above</p>
            </div>
          ) : (
            ideas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                isDark={isDark}
                isUnlocked={unlockedIds.has(idea.id)}
                onUnlock={() => setUnlockedIds((prev) => new Set(prev).add(idea.id))}
                onClick={() => {
                  setActiveIdea(idea)
                  setView('editor')
                }}
              />
            ))
          )}
        </div>
      </div>
    </MobileShell>
  )
}
