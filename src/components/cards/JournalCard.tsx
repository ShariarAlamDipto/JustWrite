import React from 'react'
import type { JournalEntry } from '@/lib/jw-types'
import MetaLabel from '@/components/ui/MetaLabel'
import { PrivacyOverlay } from '@/components/ui/PrivacyToggle'
import { truncate } from '@/lib/jw-utils'

interface JournalCardProps {
  entry: JournalEntry
  isDark: boolean
  onClick: () => void
  onUnlock?: () => void
  isUnlocked?: boolean
}

const MOOD_COLORS: Record<number, string> = {
  1: '#e53e3e', 2: '#e53e3e', 3: '#a0a0a0',
  4: '#a0a0a0', 5: '#a0a0a0', 6: '#a0a0a0',
  7: '#3182ce', 8: '#3182ce', 9: '#3182ce', 10: '#3182ce',
}

export default function JournalCard({ entry, isDark, onClick, onUnlock, isUnlocked = false }: JournalCardProps) {
  const isBlurred = entry.isPrivate && !isUnlocked
  const moodColor = entry.mood ? MOOD_COLORS[Math.round(entry.mood)] ?? '#9ca3af' : undefined

  return (
    <article
      className="relative jw-card jw-card-press overflow-hidden"
      onClick={!isBlurred ? onClick : undefined}
      style={{ cursor: isBlurred ? 'default' : 'pointer' }}
    >
      {/* Privacy overlay */}
      {isBlurred && onUnlock && <PrivacyOverlay isDark={isDark} onUnlock={onUnlock} />}

      <div className={`px-4 py-3 ${isBlurred ? 'jw-private-blur' : ''}`}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <MetaLabel
            createdAt={entry.createdAt}
            updatedAt={entry.updatedAt}
            isDark={isDark}
            wordCount={entry.wordCount}
            source={entry.source}
            expandable
          />

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mood dot */}
            {moodColor && (
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: moodColor }}
                title={`Mood ${entry.mood}/10`}
              />
            )}
            {/* Private lock */}
            {entry.isPrivate && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                   stroke="#E0B877" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            )}
          </div>
        </div>

        {/* Optional title */}
        {entry.title && (
          <h3
            className="font-semibold mb-1 leading-snug"
            style={{
              fontSize: '16px',
              color: isDark ? '#f5f5f5' : '#1a1a1a',
              letterSpacing: '-0.01em',
            }}
          >
            {entry.title}
          </h3>
        )}

        {/* Body preview */}
        <p
          className="leading-relaxed"
          style={{
            fontSize: '14px',
            color: isDark ? '#9ca3af' : '#525252',
            lineHeight: 1.6,
          }}
        >
          {truncate(entry.body, 160)}
        </p>
      </div>

    </article>
  )
}

// ── Today's journal card — prominent CTA when no entry yet ───────────────────
interface TodayCardProps {
  isDark: boolean
  onClick: () => void
  hasEntry: boolean
  wordCount?: number
}

export function TodayCard({ isDark, onClick, hasEntry, wordCount }: TodayCardProps) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <button
      onClick={onClick}
      className="w-full jw-card-press text-left overflow-hidden"
      style={{
        background: isDark ? '#1a1a1a' : '#ffffff',
        border: `1px solid ${isDark ? '#2a2a2a' : '#e5e5e5'}`,
        borderRadius: '8px',
        padding: '14px 16px',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: '#3182ce', letterSpacing: '0.05em' }}>
            TODAY
          </p>
          <p className="font-semibold" style={{
            fontSize: '16px', color: isDark ? '#f5f5f5' : '#1a1a1a', letterSpacing: '-0.01em',
          }}>
            {today}
          </p>
          <p className="text-sm mt-1" style={{ color: isDark ? '#666666' : '#9ca3af' }}>
            {hasEntry ? `${wordCount ?? 0} words · Continue writing` : 'Start your daily entry'}
          </p>
        </div>

        <span
          className="flex items-center justify-center w-8 h-8 rounded flex-shrink-0"
          style={{ background: 'rgba(49,130,206,0.15)', color: '#3182ce' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {hasEntry ? (
              <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>
            ) : (
              <><path d="M12 5v14M5 12h14"/></>
            )}
          </svg>
        </span>
      </div>
    </button>
  )
}
