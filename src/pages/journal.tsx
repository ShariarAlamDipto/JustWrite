import React, { useState, useEffect, useCallback, useRef, memo } from 'react'
import { useRouter } from 'next/router'
import { Nav } from '@/components/Nav'
import { useAuth } from '@/lib/useAuth'
import { useTheme } from '@/lib/ThemeContext'
import { getRandomPrompt, PROMPT_CATEGORIES } from '@/lib/prompts'
import type { JournalPrompt } from '@/lib/prompts'
import type { JournalEntry } from '@/lib/jw-types'
import StreakBox from '@/components/ui/StreakBox'
import { MOOD_MIN, MOOD_MAX, MOOD_DEFAULT, getMoodLabel } from '@/lib/mood'
import { decryptContent } from '@/lib/clientEncryption'

type WritingMode = 'guided' | 'blank'
const WRITING_MODE_KEY = 'jw-journal-writing-mode'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toJournalEntry(raw: any): JournalEntry {
  return {
    id:         raw.id,
    userId:     raw.user_id,
    createdAt:  raw.created_at,
    updatedAt:  raw.updated_at,
    body:       raw.content ?? '',
    title:      raw.title ?? undefined,
    mood:       raw.mood ?? undefined,
    wordCount:  raw.word_count ?? 0,
    isPrivate:  raw.is_private ?? false,
    isLocked:   raw.is_locked ?? false,
    source:     raw.source ?? 'typed',
    tags:       raw.tags ?? [],
    segment:    'journal',
  }
}

/**
 * Journal entries are stored as plain text. A phone still running an older
 * build writes them gzip-compressed and encrypted, so reads normalise both
 * formats and the list stays readable throughout the rollout. Plain text is
 * returned untouched, with no key derivation.
 */
async function toReadableText(raw: string, userId?: string): Promise<string> {
  if (!raw || !userId) return raw ?? ''
  const isLegacyFormat =
    raw.startsWith('enc2:') || raw.startsWith('enc:') || raw.startsWith('gz:')
  if (!isLegacyFormat) return raw
  try {
    return await decryptContent(raw, userId)
  } catch {
    return raw
  }
}

/** Best-effort error text from a failed API response. */
async function readApiError(res: Response, fallback: string): Promise<string> {
  try {
    const json = await res.json()
    if (json?.error && typeof json.error === 'string') return json.error
  } catch {
    // Non-JSON body (e.g. a proxy error page) — fall through.
  }
  if (res.status === 401) return 'Your session expired. Please sign in again.'
  return `${fallback} (${res.status})`
}

// ── Entry card ──────────────────────────────────────────────────────────────
const EntryCard = memo(function EntryCard({
  entry,
  onClick,
}: {
  entry: JournalEntry
  onClick: (entry: JournalEntry) => void
}) {
  const date = new Date(entry.createdAt)
  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return (
    <div style={cardStyles.card} onClick={() => onClick(entry)}>
      <div style={cardStyles.meta}>
        <span style={{ ...cardStyles.badge, background: 'var(--accent-glow)', color: 'var(--accent-bright)', border: '1px solid var(--accent)' }}>
          {dateStr}
        </span>
        <span style={cardStyles.time}>{timeStr}</span>
        {entry.mood !== undefined && entry.mood !== null && (
          <span style={cardStyles.mood}>{getMoodLabel(entry.mood as unknown as number)}</span>
        )}
      </div>
      {entry.title && (
        <p style={{ ...cardStyles.preview, fontWeight: 600, color: 'var(--fg)' }}>{entry.title}</p>
      )}
      <p style={cardStyles.preview}>
        {(entry.body ?? '').slice(0, 150)}{(entry.body ?? '').length > 150 ? '…' : ''}
      </p>
    </div>
  )
})

const cardStyles: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '1rem 1.25rem',
    transition: 'all 0.15s ease',
    cursor: 'pointer',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.625rem',
    fontSize: '12px',
    flexWrap: 'wrap' as const,
  },
  badge: {
    padding: '0.125rem 0.5rem',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500,
  },
  time: {
    color: 'var(--muted)',
  },
  mood: {
    color: 'var(--fg-dim)',
    fontSize: '12px',
  },
  preview: {
    fontSize: '14px',
    lineHeight: 1.6,
    color: 'var(--fg-dim)',
    margin: '0 0 0.25rem',
  },
}

// ── Entry detail modal ───────────────────────────────────────────────────────
const EntryModal = memo(function EntryModal({
  entry,
  onClose,
  onUpdate,
  onDelete,
  token,
}: {
  entry: JournalEntry | null
  onClose: () => void
  onUpdate: (e: JournalEntry) => void
  onDelete: (id: string) => void
  token: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(entry?.body ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (entry) setEditContent(entry.body ?? '')
    setError(null)
  }, [entry])

  if (!entry) return null

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: editContent }),
      })
      if (!res.ok) {
        setError(await readApiError(res, 'Could not save your changes.'))
        return
      }
      const { entry: updated } = await res.json()
      onUpdate(toJournalEntry(updated))
      setIsEditing(false)
    } catch {
      setError('Could not reach the server. Your changes are still here — try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this entry?')) return
    const res = await fetch(`/api/entries/${entry.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      onDelete(entry.id)
      onClose()
    }
  }

  const date = new Date(entry.createdAt)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <div>
            <span className="entry-type-badge entry-type-journal">Journal</span>
            <span style={{ marginLeft: '0.75rem', color: 'var(--muted)', fontSize: '13px' }}>
              {date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            style={{ minHeight: '200px', marginBottom: '1rem' }}
            autoFocus
          />
        ) : (
          <div style={{
            background: 'var(--input-bg)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.7,
            maxHeight: '300px',
            overflow: 'auto',
          }}>
            {entry.body}
          </div>
        )}
        {error && <p style={styles.error} role="alert">{error}</p>}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isEditing ? (
            <>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn" onClick={() => { setIsEditing(false); setEditContent(entry.body ?? '') }}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button className="btn" onClick={() => setIsEditing(true)}>Edit</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
})

// ── Page ──────────────────────────────────────────────────────────────────────
export default function JournalPage() {
  const { user, token } = useAuth()
  const { isDark: _isDark } = useTheme()
  const [content, setContent] = useState('')
  const [mood, setMood] = useState(MOOD_DEFAULT)
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [dailyPrompts, setDailyPrompts] = useState<JournalPrompt[]>([])
  const [promptAnswers, setPromptAnswers] = useState<string[]>(['', ''])
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const router = useRouter()
  const [stats, setStats] = useState<{
    stats: { currentStreak: number; longestStreak: number }
    level: { current: number; title: string }
    motivationalMessage?: string
    yearCalendar: Record<string, number>
  } | null>(null)
  const [writingMode, setWritingMode] = useState<WritingMode>('guided')

  useEffect(() => {
    const saved = window.localStorage.getItem(WRITING_MODE_KEY)
    if (saved === 'guided' || saved === 'blank') setWritingMode(saved)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(WRITING_MODE_KEY, writingMode)
  }, [writingMode])

  useEffect(() => {
    if (user && token) {
      fetchEntries()
      fetchStats()
      setDailyPrompts([getRandomPrompt(), getRandomPrompt()])
    }
  }, [user, token]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats', { headers: { Authorization: `Bearer ${token ?? ''}` } })
      if (res.ok) setStats(await res.json())
    } catch { /* ignore */ }
  }, [token])

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/entries?limit=50', { headers: { Authorization: `Bearer ${token ?? ''}` } })
      if (res.ok) {
        const json = await res.json()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const normalized = await Promise.all((json.entries ?? []).map(async (raw: any) => {
          const entry = toJournalEntry(raw)
          return {
            ...entry,
            body: await toReadableText(entry.body ?? '', user?.id),
            title: entry.title ? await toReadableText(entry.title, user?.id) : entry.title,
          }
        }))
        setEntries(normalized)
      }
    } finally {
      setLoading(false)
    }
  }, [token, user?.id])

  // Deep link: /journal?id=<entryId> (used by Connect) opens that entry.
  // Journal loads the most recent 50 entries; an older one simply isn't in
  // range, and the page still lands on the journal list.
  const openedFromQuery = useRef<string | null>(null)
  useEffect(() => {
    if (!router.isReady || !entries.length) return
    const { id } = router.query
    const entryId = typeof id === 'string' ? id : null
    if (!entryId || openedFromQuery.current === entryId) return
    const match = entries.find((e) => e.id === entryId)
    if (!match) return
    openedFromQuery.current = entryId
    setSelectedEntry(match)
  }, [router.isReady, router.query, entries])

  const handleSave = useCallback(async () => {
    if (!content.trim() && promptAnswers.every((a) => !a.trim())) return
    setSaving(true)
    setSaveError(null)
    const answerParts = promptAnswers
      .map((ans, i) => ans.trim() ? `**${dailyPrompts[i]?.text ?? ''}**\n${ans.trim()}` : '')
      .filter(Boolean)
    const fullContent = [content.trim(), ...answerParts].filter(Boolean).join('\n\n')
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ content: fullContent, mood, source: 'text' }),
      })
      if (!res.ok) {
        // Never clear the editor on failure — the draft is the only copy.
        setSaveError(await readApiError(res, 'Could not save your entry.'))
        return
      }
      const { entry } = await res.json()
      setEntries((prev) => [toJournalEntry(entry), ...prev])
      setContent('')
      setMood(MOOD_DEFAULT)
      setPromptAnswers(['', ''])
      fetchStats()
    } catch {
      setSaveError('Could not reach the server. Your entry is still here — try again.')
    } finally {
      setSaving(false)
    }
  }, [content, mood, promptAnswers, dailyPrompts, token, fetchStats])

  const handleEntryUpdate = useCallback((updated: JournalEntry) => {
    setEntries((prev) => prev.map((e) => e.id === updated.id ? updated : e))
    setSelectedEntry(updated)
  }, [])

  const handleEntryDelete = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  return (
    <>
      <Nav />
      <main style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={styles.title}>Journal</h1>
              <p style={styles.subtitle}>Write freely. Build new today.</p>
            </div>
            {stats && (
              <div style={styles.statsWidget}>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>{stats.stats.currentStreak}</span>
                  <span style={styles.statLabel}>day streak</span>
                </div>
                <div style={styles.statItem}>
                  <span style={styles.statValue}>Lv {stats.level.current}</span>
                  <span style={styles.statLabel}>{stats.level.title}</span>
                </div>
              </div>
            )}
          </div>
          {stats?.motivationalMessage && (
            <p style={styles.motivational}>{stats.motivationalMessage}</p>
          )}
        </header>

        {stats && (
          <StreakBox
            calendar={stats.yearCalendar}
            currentStreak={stats.stats.currentStreak}
            longestStreak={stats.stats.longestStreak}
          />
        )}

        {/* Guided vs. blank-page mode */}
        <div style={styles.modeToggle} role="tablist" aria-label="Writing mode">
          <button
            role="tab"
            aria-selected={writingMode === 'guided'}
            className="btn btn-sm"
            onClick={() => setWritingMode('guided')}
            style={writingMode === 'guided' ? styles.modeButtonActive : styles.modeButton}
          >
            Guided Prompts
          </button>
          <button
            role="tab"
            aria-selected={writingMode === 'blank'}
            className="btn btn-sm"
            onClick={() => setWritingMode('blank')}
            style={writingMode === 'blank' ? styles.modeButtonActive : styles.modeButton}
          >
            Blank Page
          </button>
        </div>

        {/* Daily prompts */}
        {writingMode === 'guided' && (
          <section style={styles.promptSection}>
            <div style={styles.promptHeader}>
              <span style={styles.promptLabel}>Today&apos;s Prompts</span>
              <button
                className="btn btn-sm"
                onClick={() => { setDailyPrompts([getRandomPrompt(), getRandomPrompt()]); setPromptAnswers(['', '']) }}
                style={{ fontSize: '12px' }}
              >
                Surprise me
              </button>
            </div>
            <div style={styles.promptList}>
              {dailyPrompts.map((prompt, idx) => (
                <div key={prompt.id + idx} style={styles.promptCard}>
                  <span style={styles.promptCategory}>
                    {PROMPT_CATEGORIES.find((c) => c.id === prompt.category)?.label}
                  </span>
                  <p style={styles.promptText}>{prompt.text}</p>
                  <textarea
                    value={promptAnswers[idx] ?? ''}
                    onChange={(e) => {
                      const next = [...promptAnswers]
                      next[idx] = e.target.value
                      setPromptAnswers(next)
                    }}
                    placeholder="Write your answer here..."
                    style={styles.promptAnswerArea}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Free write */}
        <section style={styles.editorSection}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={writingMode === 'blank' ? 'Write anything you want. No prompts, no rules.' : "What's on your mind?"}
            style={writingMode === 'blank' ? { ...styles.textarea, minHeight: '320px' } : styles.textarea}
          />
          <div style={styles.moodSection}>
            <label style={styles.moodLabel}>
              <span>Mood</span>
              <span style={{ marginLeft: '0.5rem', fontWeight: 500 }}>{getMoodLabel(mood)}</span>
            </label>
            <input
              type="range"
              min={MOOD_MIN}
              max={MOOD_MAX}
              value={mood}
              onChange={(e) => setMood(Number(e.target.value))}
              className="mood-slider"
            />
          </div>
          {saveError && <p style={styles.error} role="alert">{saveError}</p>}
          <button
            onClick={handleSave}
            disabled={saving || (!content.trim() && promptAnswers.every((a) => !a.trim()))}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
        </section>

        {/* Entries list */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Your Entries</h2>
            {!loading && <span style={styles.count}>{entries.length}</span>}
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="spinner" />
            </div>
          ) : entries.length === 0 ? (
            <div style={styles.empty}>
              <p style={styles.emptyTitle}>No entries yet</p>
              <p style={styles.emptyHint}>Start writing above to create your first journal entry</p>
            </div>
          ) : (
            <div style={styles.entryList}>
              {entries.map((e) => (
                <EntryCard key={e.id} entry={e} onClick={setSelectedEntry} />
              ))}
            </div>
          )}
        </section>
      </main>

      {selectedEntry && (
        <EntryModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onUpdate={handleEntryUpdate}
          onDelete={handleEntryDelete}
          token={token ?? ''}
        />
      )}
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: { maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem 4rem' },
  header: { marginBottom: '1.5rem' },
  title: { fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 700, margin: 0, color: 'var(--fg)', letterSpacing: '-0.02em' },
  subtitle: { fontSize: '14px', color: 'var(--muted)', margin: '0.375rem 0 0' },
  statsWidget: { display: 'flex', gap: '1rem', flexWrap: 'wrap' as const },
  statItem: { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: '0.125rem' },
  statValue: { fontSize: '16px', fontWeight: 700, color: 'var(--accent-bright)' },
  statLabel: { fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  motivational: { fontSize: '13px', color: 'var(--fg-dim)', marginTop: '0.75rem', fontStyle: 'italic' as const },
  modeToggle: { display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' },
  modeButton: { fontSize: '13px' },
  modeButtonActive: { fontSize: '13px', borderColor: 'var(--accent)', color: 'var(--accent-bright)', background: 'var(--accent-glow)' },
  promptSection: { marginBottom: '1.5rem' },
  promptHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' },
  promptLabel: { fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  promptList: { display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
  promptCard: { background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)' },
  promptCategory: { fontSize: '11px', fontWeight: 600, color: 'var(--accent-bright)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  promptText: { fontSize: '15px', lineHeight: 1.6, color: 'var(--fg)', margin: '0.625rem 0' },
  promptAnswerArea: { width: '100%', minHeight: '80px', background: 'var(--input-bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.875rem', fontSize: '14px', lineHeight: 1.6, resize: 'vertical' as const, marginTop: '0.625rem' },
  editorSection: { background: 'var(--bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem', border: '1px solid var(--border)' },
  textarea: { width: '100%', minHeight: '120px', background: 'var(--input-bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem', fontSize: '15px', lineHeight: 1.6, resize: 'vertical' as const },
  moodSection: { marginTop: '1rem', padding: '0.875rem', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' },
  moodLabel: { display: 'flex', alignItems: 'center', marginBottom: '0.5rem', fontSize: '13px', color: 'var(--fg-dim)' },
  error: {
    fontSize: '13px',
    color: 'var(--danger)',
    border: '1px solid var(--danger)',
    borderRadius: 'var(--radius-md)',
    padding: '0.625rem 0.875rem',
    margin: '1rem 0 0',
  },
  section: { marginBottom: '2rem' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' },
  sectionTitle: { fontSize: '12px', fontWeight: 600, margin: 0, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  count: { fontSize: '12px', color: 'var(--accent-bright)', background: 'var(--accent-glow)', padding: '0.125rem 0.5rem', borderRadius: '12px', fontWeight: 500 },
  entryList: { display: 'flex', flexDirection: 'column' as const, gap: '0.75rem' },
  empty: { textAlign: 'center' as const, padding: '2.5rem 1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' },
  emptyTitle: { fontSize: '16px', fontWeight: 500, color: 'var(--fg)', margin: '0 0 0.375rem' },
  emptyHint: { fontSize: '14px', color: 'var(--muted)', margin: 0 },
}
