import React, { useState, useRef, useEffect } from 'react'
import type { TabId } from '@/lib/jw-types'

interface TopBarProps {
  tabId: TabId
  title: string
  onSearch?: (query: string) => void
  onFilter?: () => void
  onProfile?: () => void
  isDark: boolean
  subtitle?: string
  rightAction?: React.ReactNode
}

const ACCENT_COLORS: Record<TabId, string> = {
  journal: '#C9A97A',
  ideas:   '#7EB8A0',
  notes:   '#7EA8C4',
  connect: '#B47EA8',
}

export default function TopBar({
  tabId, title, onSearch, onFilter, onProfile, isDark, subtitle, rightAction,
}: TopBarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const accent = ACCENT_COLORS[tabId]

  useEffect(() => {
    if (isSearchOpen) inputRef.current?.focus()
  }, [isSearchOpen])

  const handleSearch = (value: string) => {
    setQuery(value)
    onSearch?.(value)
  }

  const closeSearch = () => {
    setIsSearchOpen(false)
    setQuery('')
    onSearch?.('')
  }

  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-2 px-4 transition-all duration-200"
      style={{
        height: '52px',
        paddingTop: 'env(safe-area-inset-top)',
        background: isDark
          ? 'rgba(19, 19, 19, 0.92)'
          : 'rgba(247, 246, 242, 0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
      }}
    >
      {isSearchOpen ? (
        // ── Search mode ──────────────────────────────────────────────────────
        <div className="flex-1 flex items-center gap-2 animate-slide-up">
          <div
            className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#666' : '#999'}
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}…`}
              className="jw-input flex-1 text-sm"
              style={{ color: isDark ? '#F2F0EB' : '#1A1A1A' }}
            />
          </div>
          <button
            onClick={closeSearch}
            className="text-sm font-medium transition-colors px-1"
            style={{ color: accent }}
          >
            Cancel
          </button>
        </div>
      ) : (
        // ── Normal mode ───────────────────────────────────────────────────────
        <>
          <div className="flex-1 min-w-0">
            <h1
              className="font-semibold truncate"
              style={{
                fontSize: '17px',
                letterSpacing: '-0.01em',
                color: isDark ? '#F2F0EB' : '#1A1A1A',
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-2xs leading-none mt-0.5" style={{ color: isDark ? '#636060' : '#9E9B96' }}>
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            {rightAction}

            {onSearch && (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-xl transition-colors active:scale-90"
                style={{ color: isDark ? '#8A8882' : '#9E9B96' }}
                aria-label="Search"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
            )}

            {onFilter && (
              <button
                onClick={onFilter}
                className="p-2 rounded-xl transition-colors active:scale-90"
                style={{ color: isDark ? '#8A8882' : '#9E9B96' }}
                aria-label="Filter"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/>
                  <line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </button>
            )}

            {onProfile && (
              <button
                onClick={onProfile}
                className="w-8 h-8 rounded-full flex items-center justify-center ml-0.5
                           transition-all active:scale-90"
                style={{
                  background: `${accent}22`,
                  color: accent,
                  fontSize: '13px',
                  fontWeight: 600,
                }}
                aria-label="Profile"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </button>
            )}
          </div>
        </>
      )}
    </header>
  )
}
