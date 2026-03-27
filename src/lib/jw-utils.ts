// ─── JustWrite Utility Functions ──────────────────────────────────────────────

import type { Segment } from './jw-types'

// ── Passive date/time labels — never ask user to enter manually ────────────────
export function passiveTimeLabel(isoDate: string | undefined | null): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  if (isNaN(date.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function fullDateLabel(isoDate: string | undefined | null): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  if (isNaN(date.getTime())) return ''
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  if (isToday) return `Today · ${timeStr}`
  if (isYesterday) return `Yesterday · ${timeStr}`
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  }) + ` · ${timeStr}`
}

export function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

// ── Word count ─────────────────────────────────────────────────────────────────
export function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

// ── Auto-generate idea title from first words ──────────────────────────────────
export function autoTitle(body: string, maxWords = 5): string {
  const words = body.trim().split(/\s+/).slice(0, maxWords)
  const title = words.join(' ')
  return words.length < body.trim().split(/\s+/).length ? title + '…' : title
}

// ── Extract #tags from text ────────────────────────────────────────────────────
export function extractTags(text: string): string[] {
  const matches = text.match(/#(\w+)/g) ?? []
  return [...new Set(matches.map(t => t.slice(1).toLowerCase()))]
}

// ── Extract [[wikilinks]] ──────────────────────────────────────────────────────
export function extractWikilinks(text: string): string[] {
  const matches = text.match(/\[\[([^\]]+)\]\]/g) ?? []
  return [...new Set(matches.map(m => m.slice(2, -2).trim()))]
}

// ── Segment config (colors, labels, icons) ────────────────────────────────────
export const SEGMENT_CONFIG: Record<Segment, {
  label: string
  dotClass: string
  accentColor: string
  bgClass: string
}> = {
  journal: {
    label: 'Journal',
    dotClass: 'jw-dot-journal',
    accentColor: '#3182ce',
    bgClass: 'bg-journal-bg dark:bg-journal-dark/10',
  },
  ideas: {
    label: 'Ideas',
    dotClass: 'jw-dot-ideas',
    accentColor: '#3182ce',
    bgClass: 'bg-ideas-bg dark:bg-ideas-dark/10',
  },
  notes: {
    label: 'Notes',
    dotClass: 'jw-dot-notes',
    accentColor: '#3182ce',
    bgClass: 'bg-notes-bg dark:bg-notes-dark/10',
  },
}

// ── Duration format for voice ─────────────────────────────────────────────────
export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ── Truncate text for card previews ──────────────────────────────────────────
export function truncate(text: string | undefined | null, maxChars = 140): string {
  if (!text) return ''
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars).trimEnd() + '…'
}
