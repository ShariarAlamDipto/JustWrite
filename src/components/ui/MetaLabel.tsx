import React from 'react'
import { passiveTimeLabel, fullDateLabel } from '@/lib/jw-utils'

interface MetaLabelProps {
  createdAt: string
  updatedAt?: string
  isDark: boolean
  /** Show full expanded date on tap */
  expandable?: boolean
  wordCount?: number
  source?: 'typed' | 'voice'
}

export default function MetaLabel({
  createdAt, updatedAt, isDark, expandable = false, wordCount, source,
}: MetaLabelProps) {
  const [expanded, setExpanded] = React.useState(false)
  const mutedColor = isDark ? '#636060' : '#9E9B96'

  const dateStr = expanded
    ? fullDateLabel(createdAt)
    : passiveTimeLabel(updatedAt ?? createdAt)

  const isEdited = updatedAt && updatedAt !== createdAt
  const label = isEdited && !expanded
    ? `Edited ${passiveTimeLabel(updatedAt!)}`
    : dateStr

  return (
    <button
      onClick={expandable ? () => setExpanded((v) => !v) : undefined}
      className="flex items-center gap-1.5 select-none"
      style={{
        cursor: expandable ? 'pointer' : 'default',
        pointerEvents: expandable ? 'auto' : 'none',
      }}
    >
      {/* Source icon */}
      {source === 'voice' && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={mutedColor}
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        </svg>
      )}

      <span className="text-xs leading-none" style={{ color: mutedColor }}>
        {label}
      </span>

      {/* Word count */}
      {wordCount !== undefined && wordCount > 0 && (
        <>
          <span style={{ color: isDark ? '#333' : '#D8D5CF' }}>·</span>
          <span className="text-xs leading-none" style={{ color: mutedColor }}>
            {wordCount}w
          </span>
        </>
      )}
    </button>
  )
}
