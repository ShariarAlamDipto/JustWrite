import React from 'react'
import type { Idea } from '@/lib/jw-types'
import MetaLabel from '@/components/ui/MetaLabel'
import TagChip from '@/components/ui/TagChip'
import { PrivacyOverlay } from '@/components/ui/PrivacyToggle'
import { truncate } from '@/lib/jw-utils'

interface IdeaCardProps {
  idea: Idea
  isDark: boolean
  onClick: () => void
  onUnlock?: () => void
  isUnlocked?: boolean
}

export default function IdeaCard({ idea, isDark, onClick, onUnlock, isUnlocked = false }: IdeaCardProps) {
  const isBlurred = idea.isPrivate && !isUnlocked

  return (
    <article
      className="relative jw-card jw-card-press overflow-hidden"
      onClick={!isBlurred ? onClick : undefined}
      style={{ cursor: isBlurred ? 'default' : 'pointer' }}
    >
      {isBlurred && onUnlock && <PrivacyOverlay isDark={isDark} onUnlock={onUnlock} />}

      <div className={`px-4 py-3 ${isBlurred ? 'jw-private-blur' : ''}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <MetaLabel
            createdAt={idea.createdAt}
            updatedAt={idea.updatedAt}
            isDark={isDark}
            source={idea.source}
            expandable
          />

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Voice indicator */}
            {idea.source === 'voice' && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-2xs font-medium"
                style={{ background: 'rgba(229,62,62,0.12)', color: '#e53e3e' }}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                </svg>
                Voice
              </span>
            )}
            {/* Converted badge */}
            {idea.convertedToNoteId && (
              <span
                className="px-2 py-0.5 rounded-lg text-2xs font-medium"
                style={{ background: 'rgba(49,130,206,0.12)', color: '#3182ce' }}
              >
                → Note
              </span>
            )}
            {/* Private */}
            {idea.isPrivate && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                   stroke="#E0B877" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            )}
          </div>
        </div>

        {/* Title if exists */}
        {idea.title && (
          <h3
            className="font-semibold mb-1.5 leading-snug"
            style={{ fontSize: '15px', color: isDark ? '#f5f5f5' : '#1a1a1a' }}
          >
            {idea.title}
          </h3>
        )}

        {/* Body */}
        <p
          className="leading-relaxed mb-3"
          style={{ fontSize: '14px', color: isDark ? '#9ca3af' : '#525252', lineHeight: 1.6 }}
        >
          {truncate(idea.body, 180)}
        </p>

        {/* Tags */}
        {idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {idea.tags.slice(0, 4).map((tag) => (
              <TagChip key={tag} tag={tag} isDark={isDark} />
            ))}
            {idea.tags.length > 4 && (
              <span className="text-2xs" style={{ color: isDark ? '#666666' : '#9ca3af' }}>
                +{idea.tags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

    </article>
  )
}

// ── Quick capture bar — always pinned at top of Ideas screen ─────────────────
interface QuickCaptureProps {
  isDark: boolean
  onSubmit: (text: string) => void
  onVoice: () => void
}

export function QuickCapture({ isDark, onSubmit, onVoice }: QuickCaptureProps) {
  const [text, setText] = React.useState('')
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    if (!text.trim()) return
    onSubmit(text.trim())
    setText('')
    textareaRef.current?.blur()
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      className="mx-4 mt-3 mb-2 overflow-hidden"
      style={{
        background: isDark ? '#1a1a1a' : '#ffffff',
        border: `1px solid ${isDark ? '#2a2a2a' : '#e5e5e5'}`,
        borderRadius: '8px',
      }}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Capture an idea…"
        rows={2}
        className="jw-input w-full px-4 pt-3 pb-2 text-sm resize-none"
        style={{
          color: isDark ? '#f5f5f5' : '#1a1a1a',
          minHeight: '64px',
          maxHeight: '160px',
        }}
      />

      <div
        className="flex items-center justify-between px-3 pb-2"
        style={{ borderTop: `1px solid ${isDark ? '#242424' : '#F0EDE8'}` }}
      >
        {/* Voice button */}
        <button
          onClick={onVoice}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs
                     transition-colors active:scale-90"
          style={{ color: isDark ? '#a0a0a0' : '#9ca3af' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          Voice
        </button>

        {/* Save button */}
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="px-3 py-1 rounded text-xs font-semibold
                     transition-all duration-150 active:scale-95 disabled:opacity-30"
          style={{
            background: text.trim() ? '#3182ce' : (isDark ? '#242424' : '#F0EDE8'),
            color: text.trim() ? '#fff' : (isDark ? '#666666' : '#9ca3af'),
          }}
        >
          Save idea
        </button>
      </div>
    </div>
  )
}
