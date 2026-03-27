import React, { useState } from 'react'

interface PrivacyToggleProps {
  isPrivate: boolean
  onChange: (val: boolean) => void
  isDark: boolean
  /** Show as compact icon-only (inside editor headers) */
  compact?: boolean
}

export default function PrivacyToggle({ isPrivate, onChange, isDark, compact = false }: PrivacyToggleProps) {
  const [confirming, setConfirming] = useState(false)

  const handlePress = () => {
    if (!isPrivate) {
      // Turning on: immediate
      onChange(true)
    } else {
      // Turning off: confirm once
      if (confirming) {
        onChange(false)
        setConfirming(false)
      } else {
        setConfirming(true)
        setTimeout(() => setConfirming(false), 3000)
      }
    }
  }

  const lockColor = isPrivate ? '#E0B877' : isDark ? '#636060' : '#C8C5C0'

  if (compact) {
    return (
      <button
        onClick={handlePress}
        className="flex items-center justify-center w-8 h-8 rounded-xl
                   transition-all duration-200 active:scale-90"
        style={{
          background: isPrivate ? 'rgba(224,184,119,0.15)' : 'transparent',
        }}
        aria-label={isPrivate ? 'Private — tap to unlock' : 'Make private'}
        title={isPrivate ? 'Private entry' : 'Make private'}
      >
        <LockIcon locked={isPrivate} color={lockColor} size={16} />
      </button>
    )
  }

  return (
    <button
      onClick={handlePress}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl
                 transition-all duration-200 active:scale-95"
      style={{
        background: isPrivate
          ? 'rgba(224,184,119,0.15)'
          : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      }}
      aria-label={isPrivate ? 'Private' : 'Make private'}
    >
      <LockIcon locked={isPrivate} color={lockColor} size={15} />
      <span
        className="text-xs font-medium"
        style={{ color: isPrivate ? '#E0B877' : isDark ? '#636060' : '#9E9B96' }}
      >
        {confirming ? 'Tap again to unlock' : isPrivate ? 'Private' : 'Make private'}
      </span>
    </button>
  )
}

function LockIcon({ locked, color, size }: { locked: boolean; color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      {locked ? (
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      ) : (
        <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
      )}
    </svg>
  )
}

// ── Privacy overlay — blurs and locks a card in the list ──────────────────────
interface PrivacyOverlayProps {
  isDark: boolean
  onUnlock: () => void
}

export function PrivacyOverlay({ isDark, onUnlock }: PrivacyOverlayProps) {
  return (
    <button
      onClick={onUnlock}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center
                 gap-2 rounded-2xl backdrop-blur-sm transition-all active:scale-[0.98]"
      style={{
        background: isDark
          ? 'rgba(19,19,19,0.7)'
          : 'rgba(247,246,242,0.7)',
      }}
      aria-label="Unlock private entry"
    >
      <LockIcon locked size={20} color="#E0B877" />
      <span className="text-xs font-medium" style={{ color: '#E0B877' }}>
        Private
      </span>
    </button>
  )
}
