import React, { useRef, useEffect, useState, useCallback } from 'react'
import PrivacyToggle from '@/components/ui/PrivacyToggle'
import MetaLabel from '@/components/ui/MetaLabel'
import { TagInput } from '@/components/ui/TagChip'
import VoiceCapture from '@/components/voice/VoiceCapture'
import { countWords, autoTitle } from '@/lib/jw-utils'
import type { Idea } from '@/lib/jw-types'

interface IdeaEditorProps {
  idea?: Partial<Idea>
  isDark: boolean
  onSave: (data: { title?: string; body: string; isPrivate: boolean; tags: string[] }) => void
  onBack: () => void
  onConvertToNote?: () => void
  startWithVoice?: boolean
}

export default function IdeaEditor({
  idea, isDark, onSave, onBack, onConvertToNote, startWithVoice = false,
}: IdeaEditorProps) {
  const [body, setBody] = useState(idea?.body ?? '')
  const [tags, setTags] = useState<string[]>(idea?.tags ?? [])
  const [isPrivate, setIsPrivate] = useState(idea?.isPrivate ?? false)
  const [showVoice, setShowVoice] = useState(startWithVoice)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved')
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wordCount = countWords(body)
  const derivedTitle = body ? autoTitle(body) : undefined

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.style.height = 'auto'
      bodyRef.current.style.height = `${bodyRef.current.scrollHeight}px`
    }
  }, [body])

  useEffect(() => {
    if (!startWithVoice) bodyRef.current?.focus()
  }, [startWithVoice])

  const scheduleSave = useCallback(() => {
    setSaveStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      onSave({ title: derivedTitle, body, isPrivate, tags })
      setSaveStatus('saved')
    }, 1200)
  }, [body, tags, isPrivate, derivedTitle, onSave])

  useEffect(() => {
    if (body) scheduleSave()
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [body, tags, isPrivate, scheduleSave])

  const handleVoiceTranscript = (text: string) => {
    setBody((prev) => (prev ? prev + '\n\n' + text : text))
    setShowVoice(false)
    setTimeout(() => bodyRef.current?.focus(), 100)
  }

  const handleDone = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (body.trim()) onSave({ title: derivedTitle, body, isPrivate, tags })
    onBack()
  }

  return (
    <div
      className="flex flex-col min-h-dvh"
      style={{ background: isDark ? '#0d0d0d' : '#fafafa' }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-4 py-3 gap-2 sticky top-0 z-10"
        style={{
          background: isDark ? 'rgba(13,13,13,0.95)' : 'rgba(250,250,250,0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
        }}
      >
        <button
          onClick={handleDone}
          className="flex items-center gap-1 text-sm font-medium active:opacity-60"
          style={{ color: '#3182ce' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Ideas
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: isDark ? '#4A4A4A' : '#9ca3af' }}>
            {saveStatus === 'saving' ? 'Saving…' : body ? '✓' : ''}
          </span>

          {/* Convert to Note */}
          {onConvertToNote && body.trim() && (
            <button
              onClick={onConvertToNote}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium
                         transition-all active:scale-90"
              style={{ background: 'rgba(49,130,206,0.12)', color: '#3182ce' }}
              title="Convert to Note"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              → Note
            </button>
          )}

          {/* Voice */}
          <button
            onClick={() => setShowVoice((v) => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90"
            style={{
              background: showVoice ? 'rgba(229,62,62,0.15)' : 'transparent',
              color: showVoice ? '#e53e3e' : isDark ? '#666666' : '#9ca3af',
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

          <PrivacyToggle isPrivate={isPrivate} onChange={setIsPrivate} isDark={isDark} compact />
        </div>
      </header>

      {/* ── Voice panel ────────────────────────────────────────────────────── */}
      {showVoice && (
        <div
          className="mx-4 mt-3 overflow-hidden animate-slide-up"
          style={{ background: isDark ? '#1a1a1a' : '#FFFFFF', border: `1px solid ${isDark ? '#2a2a2a' : '#e5e5e5'}`, borderRadius: '8px' }}
        >
          <VoiceCapture isDark={isDark} onTranscript={handleVoiceTranscript} />
        </div>
      )}

      {/* ── Writing surface ────────────────────────────────────────────────── */}
      <div className="flex-1 px-5 pt-4 pb-24">
        {/* Auto-derived title preview */}
        {derivedTitle && body.length > 20 && (
          <p
            className="text-xs mb-3 animate-fade-in"
            style={{ color: '#3182ce', letterSpacing: '0.04em' }}
          >
            IDEA · {derivedTitle}
          </p>
        )}

        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What's the idea?"
          className="jw-input w-full resize-none leading-relaxed"
          style={{
            fontSize: '17px',
            color: isDark ? '#D8D5CF' : '#2A2824',
            lineHeight: 1.7,
            minHeight: '50vh',
          }}
        />

        {/* Tag input */}
        <div className="mt-4">
          <TagInput
            tags={tags}
            onChange={setTags}
            isDark={isDark}
            accent="#3182ce"
            placeholder="Add tags…"
          />
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div
        className="sticky bottom-0 px-5 py-3"
        style={{
          background: isDark ? 'rgba(13,13,13,0.9)' : 'rgba(250,250,250,0.9)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        }}
      >
        <MetaLabel
          createdAt={idea?.createdAt ?? new Date().toISOString()}
          isDark={isDark}
          wordCount={wordCount}
          source={idea?.source}
        />
      </div>
    </div>
  )
}
