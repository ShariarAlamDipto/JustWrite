import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import MobileShell from '@/components/layout/MobileShell'
import IdeaCard, { QuickCapture } from '@/components/cards/IdeaCard'
import IdeaEditor from '@/components/editors/IdeaEditor'
import { useAuth } from '@/lib/useAuth'
import { useTheme } from '@/lib/ThemeContext'
import type { Idea } from '@/lib/jw-types'

type View = 'list' | 'editor'

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

  // Handle ?voice=1 from creation sheet
  useEffect(() => {
    if (router.query.voice === '1') {
      setStartWithVoice(true)
      setActiveIdea(null)
      setView('editor')
    }
  }, [router.query.voice])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    fetch('/api/entries?type=idea', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setIdeas(data.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const handleSave = async (data: { title?: string; body: string; isPrivate: boolean; tags: string[] }) => {
    if (!user) return
    if (activeIdea?.id) {
      const res = await fetch(`/api/entries/${activeIdea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...data, type: 'idea' }),
      })
      if (res.ok) {
        const updated = await res.json()
        setIdeas((prev) => prev.map((i) => i.id === activeIdea.id ? { ...i, ...updated } : i))
      }
    } else {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...data, type: 'idea', source: startWithVoice ? 'voice' : 'typed' }),
      })
      if (res.ok) {
        const created = await res.json()
        setIdeas((prev) => [created, ...prev])
        setActiveIdea(created)
        setStartWithVoice(false)
      }
    }
  }

  const handleQuickCapture = async (text: string) => {
    if (!user) return
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body: text, isPrivate: false, tags: [], type: 'idea', source: 'typed' }),
    })
    if (res.ok) {
      const created = await res.json()
      setIdeas((prev) => [created, ...prev])
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
      <div className="pt-5">
        <div className="px-4 mb-1">
          <h1
            className="text-2xl font-bold"
            style={{ color: isDark ? '#F2F0EB' : '#1A1A1A', letterSpacing: '-0.025em' }}
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
        <div className="px-4 pt-2 pb-4 space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-2xl animate-pulse"
                style={{ background: isDark ? '#1C1C1C' : '#EEECE8' }}
              />
            ))
          ) : ideas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div
                className="w-16 h-16 rounded-3xl flex items-center justify-center"
                style={{ background: isDark ? 'rgba(126,184,160,0.1)' : 'rgba(126,184,160,0.08)' }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7EB8A0"
                     strokeWidth="1.5" strokeLinecap="round">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                </svg>
              </div>
              <p className="text-sm text-center" style={{ color: isDark ? '#636060' : '#9E9B96', lineHeight: 1.6 }}>
                Capture your first idea above<br/>or tap the mic to record
              </p>
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
