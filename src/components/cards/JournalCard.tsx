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
  1: '#D47878', 2: '#D47878', 3: '#E0B877',
  4: '#E0B877', 5: '#9E9B96', 6: '#9E9B96',
  7: '#7EB8A0', 8: '#7EB8A0', 9: '#7EB8A0', 10: '#7EB8A0',
}

export default function JournalCard({ entry, isDark, onClick, onUnlock, isUnlocked = false }: JournalCardProps) {
  const isBlurred = entry.isPrivate && !isUnlocked
  const moodColor = entry.mood ? MOOD_COLORS[Math.round(entry.mood)] ?? '#9E9B96' : undefined

  return (
    <article
      className="relative jw-card jw-card-press overflow-hidden"
      onClick={!isBlurred ? onClick : undefined}
      style={{ cursor: isBlurred ? 'default' : 'pointer' }}
    >
      {/* Privacy overlay */}
      {isBlurred && onUnlock && <PrivacyOverlay isDark={isDark} onUnlock={onUnlock} />}

      <div className={`px-4 py-4 ${isBlurred ? 'jw-private-blur' : ''}`}>
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
              color: isDark ? '#F2F0EB' : '#1A1A1A',
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
            color: isDark ? '#9A9792' : '#6B6862',
            lineHeight: 1.6,
          }}
        >
          {truncate(entry.body, 160)}
        </p>
      </div>

      {/* Left accent strip — journal color */}
      <span
        className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full"
        style={{ background: '#C9A97A' }}
      />
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
        background: isDark ? '#1E1B17' : '#FDF8F2',
        border: `1.5px solid ${isDark ? '#3A3228' : '#EDE5D8'}`,
        borderRadius: '20px',
        padding: '20px',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: '#C9A97A', letterSpacing: '0.05em' }}>
            TODAY
          </p>
          <p className="font-semibold" style={{
            fontSize: '16px', color: isDark ? '#F2F0EB' : '#1A1A1A', letterSpacing: '-0.01em',
          }}>
            {today}
          </p>
          <p className="text-sm mt-1" style={{ color: isDark ? '#636060' : '#9E9B96' }}>
            {hasEntry ? `${wordCount ?? 0} words · Continue writing` : 'Start your daily entry'}
          </p>
        </div>

        <span
          className="flex items-center justify-center w-10 h-10 rounded-2xl flex-shrink-0"
          style={{ background: 'rgba(201,169,122,0.15)', color: '#C9A97A' }}
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
