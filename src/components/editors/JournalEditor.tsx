import React, { useRef, useEffect, useState, useCallback } from 'react'
import PrivacyToggle from '@/components/ui/PrivacyToggle'
import MetaLabel from '@/components/ui/MetaLabel'
import VoiceCapture from '@/components/voice/VoiceCapture'
import { countWords } from '@/lib/jw-utils'
import type { JournalEntry } from '@/lib/jw-types'

interface JournalEditorProps {
  entry?: Partial<JournalEntry>
  isDark: boolean
  onSave: (data: { title?: string; body: string; isPrivate: boolean; mood?: number }) => void
  onBack: () => void
  autoFocus?: boolean
}

export default function JournalEditor({ entry, isDark, onSave, onBack, autoFocus = true }: JournalEditorProps) {
  const [title, setTitle] = useState(entry?.title ?? '')
  const [body, setBody] = useState(entry?.body ?? '')
  const [isPrivate, setIsPrivate] = useState(entry?.isPrivate ?? false)
  const [mood, setMood] = useState<number | undefined>(entry?.mood)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [showVoice, setShowVoice] = useState(false)
  const [showMood, setShowMood] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wordCount = countWords(body)

  // Auto-grow textarea
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.style.height = 'auto'
      bodyRef.current.style.height = `${bodyRef.current.scrollHeight}px`
    }
  }, [body])

  useEffect(() => {
    if (autoFocus) bodyRef.current?.focus()
  }, [autoFocus])

  // Debounced auto-save
  const scheduleSave = useCallback(() => {
    setSaveStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      onSave({ title: title || undefined, body, isPrivate, mood })
      setSaveStatus('saved')
    }, 1500)
  }, [title, body, isPrivate, mood, onSave])

  useEffect(() => {
    if (body || title) scheduleSave()
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [body, title, isPrivate, mood, scheduleSave])

  const handleVoiceTranscript = (text: string) => {
    setBody((prev) => (prev ? prev + '\n\n' + text : text))
    setShowVoice(false)
  }

  const handleDone = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    onSave({ title: title || undefined, body, isPrivate, mood })
    onBack()
  }

  const moodEmoji = (m: number) => ['😞', '😕', '😐', '🙂', '😊'][Math.floor((m - 1) / 2)] ?? '😐'

  return (
    <div
      className="flex flex-col min-h-dvh"
      style={{ background: isDark ? '#131313' : '#F7F6F2' }}
    >
      {/* ── Editor header ──────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-4 py-3 gap-2 sticky top-0 z-10"
        style={{
          background: isDark ? 'rgba(19,19,19,0.95)' : 'rgba(247,246,242,0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
        }}
      >
        {/* Back */}
        <button
          onClick={handleDone}
          className="flex items-center gap-1 text-sm font-medium transition-opacity active:opacity-60"
          style={{ color: '#C9A97A' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Journal
        </button>

        {/* Status + actions */}
        <div className="flex items-center gap-2">
          {/* Save status */}
          <span className="text-xs" style={{ color: isDark ? '#4A4A4A' : '#C8C5C0' }}>
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' && body ? '✓' : ''}
          </span>

          {/* Mood toggle */}
          <button
            onClick={() => setShowMood((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-base
                       transition-all active:scale-90"
            style={{ background: showMood ? 'rgba(201,169,122,0.15)' : 'transparent' }}
            aria-label="Set mood"
          >
            {mood ? moodEmoji(mood) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke={isDark ? '#636060' : '#C8C5C0'} strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 13s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            )}
          </button>

          {/* Voice */}
          <button
            onClick={() => setShowVoice((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90"
            style={{
              background: showVoice ? 'rgba(212,120,120,0.15)' : 'transparent',
              color: showVoice ? '#D47878' : isDark ? '#636060' : '#C8C5C0',
            }}
            aria-label="Voice input"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>

          {/* Privacy */}
          <PrivacyToggle isPrivate={isPrivate} onChange={setIsPrivate} isDark={isDark} compact />
        </div>
      </header>

      {/* ── Voice panel ────────────────────────────────────────────────── */}
      {showVoice && (
        <div
          className="mx-4 mt-3 rounded-2xl overflow-hidden"
          style={{ background: isDark ? '#1C1C1C' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#E8E5DF'}` }}
        >
          <VoiceCapture isDark={isDark} onTranscript={handleVoiceTranscript} />
        </div>
      )}

      {/* ── Mood selector ──────────────────────────────────────────────── */}
      {showMood && (
        <div className="flex items-center justify-center gap-3 py-3 px-4 animate-slide-up">
          {[1, 3, 5, 7, 9].map((m) => (
            <button
              key={m}
              onClick={() => { setMood(m); setShowMood(false) }}
              className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-90"
              style={{
                background: mood === m ? 'rgba(201,169,122,0.15)' : 'transparent',
                transform: mood === m ? 'scale(1.1)' : undefined,
              }}
            >
              <span className="text-2xl">{moodEmoji(m)}</span>
              <span className="text-2xs" style={{ color: isDark ? '#636060' : '#9E9B96' }}>
                {['Low', 'Meh', 'Okay', 'Good', 'Great'][Math.floor(m / 2)]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Writing surface ────────────────────────────────────────────── */}
      <div className="flex-1 px-5 pt-4 pb-24">
        {/* Optional title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="jw-input w-full mb-3 font-semibold"
          style={{
            fontSize: '22px',
            color: isDark ? '#F2F0EB' : '#1A1A1A',
            letterSpacing: '-0.015em',
          }}
        />

        {/* Body — the main writing area */}
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Start writing…"
          className="jw-input w-full resize-none leading-relaxed"
          style={{
            fontSize: '16px',
            color: isDark ? '#D8D5CF' : '#2A2824',
            lineHeight: 1.75,
            minHeight: '60vh',
          }}
        />
      </div>

      {/* ── Passive footer ─────────────────────────────────────────────── */}
      <div
        className="sticky bottom-0 flex items-center justify-between px-5 py-3"
        style={{
          background: isDark ? 'rgba(19,19,19,0.9)' : 'rgba(247,246,242,0.9)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        }}
      >
        <MetaLabel
          createdAt={entry?.createdAt ?? new Date().toISOString()}
          updatedAt={new Date().toISOString()}
          isDark={isDark}
          wordCount={wordCount}
          expandable
        />
        {mood && (
          <span className="text-sm">{moodEmoji(mood)}</span>
        )}
      </div>
    </div>
  )
}
