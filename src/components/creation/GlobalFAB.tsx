import React from 'react'

interface GlobalFABProps {
  onTap: () => void
  isDark: boolean
  sheetOpen: boolean
}

export default function GlobalFAB({ onTap, isDark, sheetOpen }: GlobalFABProps) {
  return (
    <button
      onClick={onTap}
      aria-label={sheetOpen ? 'Close menu' : 'Create new'}
      className="fixed z-40 flex items-center justify-center rounded-full
                 shadow-fab dark:shadow-fab-dark transition-all duration-200
                 active:scale-90"
      style={{
        bottom: 'calc(72px + env(safe-area-inset-bottom) + 16px)',
        right: '20px',
        width: '52px',
        height: '52px',
        background: isDark ? '#F2F0EB' : '#1A1A1A',
        color: isDark ? '#1A1A1A' : '#F2F0EB',
      }}
    >
      {/* Rotates + → × when sheet open */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        style={{
          transform: sheetOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <line x1="10" y1="3" x2="10" y2="17" />
        <line x1="3" y1="10" x2="17" y2="10" />
      </svg>
    </button>
  )
}
