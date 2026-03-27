import React from 'react'
import type { Note } from '@/lib/jw-types'
import MetaLabel from '@/components/ui/MetaLabel'
import TagChip from '@/components/ui/TagChip'
import { PrivacyOverlay } from '@/components/ui/PrivacyToggle'
import { truncate } from '@/lib/jw-utils'

interface NoteCardProps {
  note: Note
  isDark: boolean
  onClick: () => void
  onUnlock?: () => void
  isUnlocked?: boolean
}

export default function NoteCard({ note, isDark, onClick, onUnlock, isUnlocked = false }: NoteCardProps) {
  const isBlurred = note.isPrivate && !isUnlocked
  const blocks = note.blocks ?? []
  const tags = note.tags ?? []
  const preview = blocks.find((b) => b.type === 'paragraph' && b.content.trim())?.content ?? ''

  return (
    <article
      className="relative jw-card jw-card-press overflow-hidden"
      onClick={!isBlurred ? onClick : undefined}
      style={{ cursor: isBlurred ? 'default' : 'pointer' }}
    >
      {isBlurred && onUnlock && <PrivacyOverlay isDark={isDark} onUnlock={onUnlock} />}

      <div className={`px-4 py-3 ${isBlurred ? 'jw-private-blur' : ''}`}>
        {/* Title row */}
        <div className="flex items-start gap-3 mb-1">
          <span className="text-xl flex-shrink-0 mt-0.5">{note.icon}</span>
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold leading-snug truncate"
              style={{
                fontSize: '16px',
                color: isDark ? '#f5f5f5' : '#1a1a1a',
                letterSpacing: '-0.01em',
              }}
            >
              {note.title || 'Untitled'}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
            {note.isPinned && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#3182ce" stroke="none">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            )}
            {note.isPrivate && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                   stroke="#E0B877" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            )}
          </div>
        </div>

        {/* Preview */}
        {preview && (
          <p
            className="mb-3 leading-relaxed ml-8"
            style={{ fontSize: '13px', color: isDark ? '#a0a0a0' : '#a0a0a0', lineHeight: 1.55 }}
          >
            {truncate(preview, 120)}
          </p>
        )}

        {/* Footer: date + tags */}
        <div className="flex items-center justify-between gap-2 ml-8">
          <MetaLabel
            createdAt={note.createdAt}
            updatedAt={note.updatedAt}
            isDark={isDark}
            wordCount={note.wordCount}
            expandable
          />

          {tags.length > 0 && (
            <div className="flex gap-1 overflow-hidden">
              {tags.slice(0, 2).map((tag) => (
                <TagChip key={tag} tag={tag} isDark={isDark} />
              ))}
              {tags.length > 2 && (
                <span className="text-2xs" style={{ color: isDark ? '#666666' : '#9ca3af' }}>
                  +{tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

    </article>
  )
}

// ── Empty state for Notes list ────────────────────────────────────────────────
export function NotesEmpty({ isDark, onCreate }: { isDark: boolean; onCreate: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">📝</div>
      <p style={{ color: 'var(--fg-dim)', marginBottom: '1rem' }}>No notes yet</p>
      <button className="btn btn-primary" onClick={onCreate}>
        Create first note
      </button>
    </div>
  )
}
