import React from 'react'

interface TagChipProps {
  tag: string
  isDark: boolean
  onRemove?: () => void
  onClick?: () => void
  active?: boolean
  accent?: string
}

export default function TagChip({ tag, isDark, onRemove, onClick, active, accent }: TagChipProps) {
  const bg = active
    ? `${accent ?? '#3182ce'}20`
    : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
  const color = active
    ? (accent ?? '#3182ce')
    : isDark ? '#8A8882' : '#9E9B96'

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs
                 font-medium transition-all duration-150"
      style={{ background: bg, color, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      #{tag}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
          aria-label={`Remove tag ${tag}`}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </span>
  )
}

// ── Tag input row — type to add tags ─────────────────────────────────────────
interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  isDark: boolean
  accent?: string
  placeholder?: string
}

export function TagInput({ tags, onChange, isDark, accent, placeholder = 'Add tag…' }: TagInputProps) {
  const [input, setInput] = React.useState('')

  const addTag = (raw: string) => {
    const tag = raw.replace(/^#/, '').toLowerCase().trim()
    if (tag && !tags.includes(tag)) onChange([...tags, tag])
    setInput('')
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault()
      if (input.trim()) addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <TagChip
          key={tag}
          tag={tag}
          isDark={isDark}
          accent={accent}
          active
          onRemove={() => onChange(tags.filter((t) => t !== tag))}
        />
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => { if (input.trim()) addTag(input) }}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="jw-input text-xs flex-1 min-w-[80px]"
        style={{
          color: isDark ? '#F2F0EB' : '#1A1A1A',
          minWidth: '80px',
        }}
      />
    </div>
  )
}
