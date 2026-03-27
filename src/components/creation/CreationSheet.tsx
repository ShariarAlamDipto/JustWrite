import React, { useEffect, useRef } from 'react'
import type { CreationTarget } from '@/lib/jw-types'

interface CreationSheetProps {
  isDark: boolean
  onSelect: (target: CreationTarget) => void
  onClose: () => void
}

const actions: {
  type: CreationTarget['type']
  label: string
  sub: string
  icon: React.ReactNode
  accent: string
}[] = [
  {
    type: 'journal',
    label: "Today's Journal",
    sub: 'Continue your daily reflection',
    accent: '#3182ce',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <path d="M8 7h8M8 11h5"/>
      </svg>
    ),
  },
  {
    type: 'idea',
    label: 'New Idea',
    sub: 'Capture a thought or brainstorm',
    accent: '#3182ce',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="11" r="5"/>
        <path d="M10 16v4h4v-4"/>
        <path d="M12 2v1M4.22 4.22l.71.71M18.36 5.64l.71-.71M2 11h1M20 11h1"/>
      </svg>
    ),
  },
  {
    type: 'note',
    label: 'New Note',
    sub: 'Write something structured',
    accent: '#3182ce',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="8" y1="13" x2="16" y2="13"/>
        <line x1="8" y1="17" x2="12" y2="17"/>
      </svg>
    ),
  },
  {
    type: 'record-idea',
    label: 'Record an Idea',
    sub: 'Speak, auto-transcribe into Ideas',
    accent: '#e53e3e',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    ),
  },
  {
    type: 'record-note',
    label: 'Record a Note',
    sub: 'Speak, auto-transcribe into Notes',
    accent: '#e53e3e',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
        <path d="M17 6h2M17 9h2" strokeOpacity="0.5"/>
      </svg>
    ),
  },
]

export default function CreationSheet({ isDark, onSelect, onClose }: CreationSheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Scrim */}
      <div
        ref={overlayRef}
        className="jw-sheet-overlay"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="jw-sheet px-2 pt-1 pb-2">
        <div className="jw-sheet-handle" />

        <p
          className="text-center text-xs font-medium mb-3 mt-1"
          style={{ color: isDark ? '#636060' : '#9E9B96', letterSpacing: '0.06em' }}
        >
          CREATE
        </p>

        <div className="flex flex-col gap-1">
          {actions.map(({ type, label, sub, icon, accent }) => (
            <button
              key={type}
              onClick={() => onSelect({ type })}
              className="flex items-center gap-4 px-4 py-3.5 rounded-2xl
                         text-left transition-all duration-150 active:scale-[0.98]"
              style={{
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = `${accent}18`
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = isDark
                  ? 'rgba(255,255,255,0.04)'
                  : 'rgba(0,0,0,0.025)'
              }}
            >
              {/* Icon container */}
              <span
                className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl"
                style={{ background: `${accent}20`, color: accent }}
              >
                {icon}
              </span>

              {/* Text */}
              <span className="flex-1 min-w-0">
                <span
                  className="block text-sm font-semibold leading-tight"
                  style={{ color: isDark ? '#F2F0EB' : '#1A1A1A' }}
                >
                  {label}
                </span>
                <span
                  className="block text-xs mt-0.5 leading-snug"
                  style={{ color: isDark ? '#636060' : '#9E9B96' }}
                >
                  {sub}
                </span>
              </span>

              {/* Chevron */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                   stroke={isDark ? '#4A4A4A' : '#C8C5C0'} strokeWidth="2"
                   strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
