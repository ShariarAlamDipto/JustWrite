import React from 'react'
import type { TabId } from '@/lib/jw-types'

interface BottomNavProps {
  activeTab: TabId
  onChange: (tab: TabId) => void
  isDark: boolean
}

const tabs: { id: TabId; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    id: 'journal',
    label: 'Journal',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        {active && <path d="M8 7h8M8 11h5" strokeWidth="1.5"/>}
      </svg>
    ),
  },
  {
    id: 'ideas',
    label: 'Ideas',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="11" r="5"/>
        <path d="M10 16v4h4v-4"/>
        <path d="M12 2v1M12 20v1M4.22 4.22l.71.71M18.36 18.36l.71.71M2 11h1M20 11h1M4.22 17.78l.71-.71M18.36 5.64l.71-.71"/>
        {active && <circle cx="12" cy="11" r="2.5" fill="currentColor" stroke="none" opacity="0.3"/>}
      </svg>
    ),
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        {active ? (
          <>
            <line x1="8" y1="13" x2="16" y2="13"/>
            <line x1="8" y1="17" x2="12" y2="17"/>
          </>
        ) : (
          <line x1="8" y1="13" x2="16" y2="13"/>
        )}
      </svg>
    ),
  },
  {
    id: 'connect',
    label: 'Connect',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="2"/>
        <circle cx="5" cy="7" r="1.5"/>
        <circle cx="19" cy="7" r="1.5"/>
        <circle cx="5" cy="17" r="1.5"/>
        <circle cx="19" cy="17" r="1.5"/>
        <path d="M7 8l3.5 3M16.5 8L13 11M7 16l3.5-3M16.5 16L13 13"/>
        {active && (
          <>
            <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" opacity="0.4"/>
          </>
        )}
      </svg>
    ),
  },
]

const ACCENT_COLORS: Record<TabId, string> = {
  journal: '#3182ce',
  ideas:   '#3182ce',
  notes:   '#3182ce',
  connect: '#3182ce',
}

export default function BottomNav({ activeTab, onChange, isDark }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: isDark
          ? 'rgba(13, 13, 13, 0.95)'
          : 'rgba(250, 250, 250, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}
    >
      <div className="flex items-center justify-around px-1 pt-1 pb-1">
        {tabs.map(({ id, label, icon }) => {
          const isActive = activeTab === id
          const accentColor = ACCENT_COLORS[id]

          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded
                         transition-all duration-200 active:scale-95 min-w-[56px]"
              style={{
                color: isActive
                  ? accentColor
                  : isDark ? '#666666' : '#9ca3af',
                background: isActive
                  ? 'rgba(49,130,206,0.1)'
                  : 'transparent',
              }}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              {icon(isActive)}
              <span
                className="text-2xs font-medium leading-none"
                style={{
                  color: isActive
                    ? accentColor
                    : isDark ? '#666666' : '#9ca3af',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '10px',
                  letterSpacing: '0.02em',
                }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
