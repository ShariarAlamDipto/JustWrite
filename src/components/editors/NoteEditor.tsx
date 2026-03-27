import React, { useRef, useEffect, useState, useCallback } from 'react'
import PrivacyToggle from '@/components/ui/PrivacyToggle'
import MetaLabel from '@/components/ui/MetaLabel'
import { TagInput } from '@/components/ui/TagChip'
import VoiceCapture from '@/components/voice/VoiceCapture'
import { countWords } from '@/lib/jw-utils'
import type { Note, NoteBlock } from '@/lib/jw-types'

interface NoteEditorProps {
  note?: Partial<Note>
  isDark: boolean
  onSave: (data: {
    title: string
    blocks: NoteBlock[]
    isPrivate: boolean
    tags: string[]
    icon?: string
  }) => void
  onBack: () => void
  startWithVoice?: boolean
}

const ICONS = ['📝', '💡', '🔖', '⭐', '🧠', '🎯', '🔍', '📚', '💼', '🌱']

function makeBlock(type: NoteBlock['type'], content = ''): NoteBlock {
  return { id: crypto.randomUUID(), type, content }
}

function blocksToText(blocks: NoteBlock[]): string {
  return blocks.map((b) => b.content).join('\n')
}

export default function NoteEditor({
  note, isDark, onSave, onBack, startWithVoice = false,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [icon, setIcon] = useState(note?.icon ?? '📝')
  const [blocks, setBlocks] = useState<NoteBlock[]>(
    note?.blocks?.length ? note.blocks : [makeBlock('paragraph')]
  )
  const [tags, setTags] = useState<string[]>(note?.tags ?? [])
  const [isPrivate, setIsPrivate] = useState(note?.isPrivate ?? false)
  const [showVoice, setShowVoice] = useState(startWithVoice)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved')
  const [activeBlockId, setActiveBlockId] = useState<string>(blocks[0]?.id ?? '')
  const [showSlash, setShowSlash] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')

  const titleRef = useRef<HTMLInputElement>(null)
  const blockRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map())
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wordCount = countWords(blocksToText(blocks))

  useEffect(() => {
    if (!startWithVoice) titleRef.current?.focus()
  }, [startWithVoice])

  // Auto-grow textarea to fit content
  const growBlock = useCallback((id: string) => {
    const el = blockRefs.current.get(id)
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useEffect(() => {
    blocks.forEach((b) => growBlock(b.id))
  }, [blocks, growBlock])

  // ── Auto-save ────────────────────────────────────────────────────────────────

  const scheduleSave = useCallback(() => {
    setSaveStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      onSave({ title, blocks, isPrivate, tags, icon })
      setSaveStatus('saved')
    }, 1200)
  }, [title, blocks, isPrivate, tags, icon, onSave])

  useEffect(() => {
    if (title || blocks.some((b) => b.content)) scheduleSave()
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [title, blocks, isPrivate, tags, scheduleSave])

  const handleDone = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    onSave({ title, blocks, isPrivate, tags, icon })
    onBack()
  }

  // ── Block operations ─────────────────────────────────────────────────────────

  const updateBlock = (id: string, content: string) => {
    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, content } : b))
  }

  const insertBlockAfter = (id: string, type: NoteBlock['type'] = 'paragraph') => {
    const newBlock = makeBlock(type)
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id)
      return [...prev.slice(0, idx + 1), newBlock, ...prev.slice(idx + 1)]
    })
    setActiveBlockId(newBlock.id)
    setTimeout(() => blockRefs.current.get(newBlock.id)?.focus(), 50)
  }

  const removeBlock = (id: string) => {
    setBlocks((prev) => {
      if (prev.length === 1) return [makeBlock('paragraph')]
      const idx = prev.findIndex((b) => b.id === id)
      const next = [...prev.slice(0, idx), ...prev.slice(idx + 1)]
      const focusIdx = Math.max(0, idx - 1)
      setTimeout(() => blockRefs.current.get(next[focusIdx]?.id)?.focus(), 50)
      return next
    })
  }

  const convertBlock = (id: string, type: NoteBlock['type']) => {
    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, type } : b))
    setShowSlash(false)
    setSlashFilter('')
    setTimeout(() => blockRefs.current.get(id)?.focus(), 50)
  }

  // ── Keyboard handling ─────────────────────────────────────────────────────────

  const handleBlockKey = (e: React.KeyboardEvent<HTMLTextAreaElement>, block: NoteBlock) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (showSlash) { setShowSlash(false); setSlashFilter('') }
      else insertBlockAfter(block.id)
    } else if (e.key === 'Backspace' && block.content === '') {
      e.preventDefault()
      removeBlock(block.id)
    } else if (e.key === 'Escape') {
      if (showSlash) { setShowSlash(false); setSlashFilter('') }
      if (showIconPicker) setShowIconPicker(false)
    }
  }

  const handleBlockChange = (block: NoteBlock, value: string) => {
    if (value === '/' && block.content === '') {
      setShowSlash(true)
      setSlashFilter('')
      updateBlock(block.id, value)
      return
    }
    if (showSlash) {
      const slashIdx = value.lastIndexOf('/')
      if (slashIdx >= 0) {
        setSlashFilter(value.slice(slashIdx + 1))
      } else {
        setShowSlash(false)
        setSlashFilter('')
      }
    }
    updateBlock(block.id, value)
  }

  // ── Voice ────────────────────────────────────────────────────────────────────

  const handleVoiceTranscript = (text: string) => {
    const activeBlock = blocks.find((b) => b.id === activeBlockId)
    if (activeBlock?.content === '') {
      updateBlock(activeBlockId, text)
    } else {
      insertBlockAfter(activeBlockId)
      // The new block is at idx+1 after state update — refocus after next render
      setTimeout(() => {
        const newBlock = blockRefs.current.get(activeBlockId)
        if (newBlock) updateBlock(activeBlockId, text)
      }, 60)
    }
    setShowVoice(false)
    setTimeout(() => blockRefs.current.get(activeBlockId)?.focus(), 120)
  }

  // ── Slash menu options ────────────────────────────────────────────────────────

  const SLASH_OPTIONS: { label: string; type: NoteBlock['type']; icon: string }[] = [
    { label: 'Paragraph', type: 'paragraph', icon: '¶' },
    { label: 'Heading 1', type: 'heading1', icon: 'H1' },
    { label: 'Heading 2', type: 'heading2', icon: 'H2' },
    { label: 'Bullet list', type: 'bullet', icon: '•' },
    { label: 'Quote', type: 'quote', icon: '"' },
    { label: 'Divider', type: 'divider', icon: '—' },
  ]

  const filteredSlash = SLASH_OPTIONS.filter((o) =>
    o.label.toLowerCase().includes(slashFilter.toLowerCase())
  )

  // ── Block styles ─────────────────────────────────────────────────────────────

  const blockStyle = (type: NoteBlock['type']): React.CSSProperties => {
    const base: React.CSSProperties = { color: isDark ? '#D8D5CF' : '#2A2824', lineHeight: 1.75 }
    if (type === 'heading1') return { ...base, fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', color: isDark ? '#F2F0EB' : '#1A1A1A' }
    if (type === 'heading2') return { ...base, fontSize: '18px', fontWeight: 600, letterSpacing: '-0.01em', color: isDark ? '#F2F0EB' : '#1A1A1A' }
    if (type === 'quote') return { ...base, fontSize: '16px', fontStyle: 'italic', color: isDark ? '#9A9792' : '#6B6862' }
    return { ...base, fontSize: '16px' }
  }

  const blockClassName = (type: NoteBlock['type']) => {
    let base = 'jw-input w-full resize-none leading-relaxed select-text'
    if (type === 'bullet') base += ' pl-5'
    if (type === 'quote') base += ' pl-4'
    return base
  }

  return (
    <>
      {/* ── Transparent overlay to dismiss icon picker / slash menu on outside tap ── */}
      {(showIconPicker || showSlash) && (
        <div
          className="fixed inset-0 z-10"
          style={{ WebkitTapHighlightColor: 'transparent' }}
          onPointerDown={() => {
            setShowIconPicker(false)
            setShowSlash(false)
            setSlashFilter('')
          }}
        />
      )}

      <div
        className="flex flex-col min-h-dvh"
        style={{ background: isDark ? '#131313' : '#F7F6F2', touchAction: 'pan-y' }}
      >
        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <header
          className="flex items-center justify-between px-4 py-2 gap-2 sticky top-0 z-20"
          style={{
            background: isDark ? 'rgba(19,19,19,0.95)' : 'rgba(247,246,242,0.95)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
            minHeight: '52px',
          }}
        >
          {/* Back — min 44px tap target */}
          <button
            onPointerDown={handleDone}
            className="flex items-center gap-1 text-sm font-medium"
            style={{ color: '#7EA8C4', minHeight: '44px', minWidth: '44px', touchAction: 'manipulation' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Notes
          </button>

          <div className="flex items-center gap-1">
            <span className="text-xs" style={{ color: isDark ? '#4A4A4A' : '#C8C5C0' }}>
              {saveStatus === 'saving' ? 'Saving…' : (title || blocks.some((b) => b.content)) ? '✓' : ''}
            </span>

            {/* Voice */}
            <button
              onPointerDown={(e) => { e.stopPropagation(); setShowVoice((v) => !v) }}
              className="flex items-center justify-center rounded-xl transition-all active:scale-90"
              style={{
                minWidth: '44px', minHeight: '44px', touchAction: 'manipulation',
                background: showVoice ? 'rgba(212,120,120,0.15)' : 'transparent',
                color: showVoice ? '#D47878' : isDark ? '#636060' : '#C8C5C0',
              }}
              aria-label="Voice input"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>

            <PrivacyToggle isPrivate={isPrivate} onChange={setIsPrivate} isDark={isDark} compact />
          </div>
        </header>

        {/* ── Voice panel ─────────────────────────────────────────────────────── */}
        {showVoice && (
          <div
            className="mx-4 mt-3 rounded-2xl overflow-hidden"
            style={{ background: isDark ? '#1C1C1C' : '#FFFFFF', border: `1px solid ${isDark ? '#2E2E2E' : '#E8E5DF'}` }}
          >
            <VoiceCapture isDark={isDark} onTranscript={handleVoiceTranscript} />
          </div>
        )}

        {/* ── Writing surface ──────────────────────────────────────────────────── */}
        <div className="flex-1 px-5 pt-5 pb-24" style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

          {/* Icon + Title row */}
          <div className="flex items-start gap-3 mb-4">

            {/* Icon picker — z-index 30 so it sits above the overlay (z-10) */}
            <div className="relative" style={{ zIndex: showIconPicker ? 30 : 'auto' }}>
              <button
                onPointerDown={(e) => { e.stopPropagation(); setShowIconPicker((v) => !v) }}
                className="text-3xl flex items-center justify-center rounded-2xl transition-all active:scale-90"
                style={{
                  width: '48px', height: '48px', touchAction: 'manipulation',
                  background: isDark ? '#1C1C1C' : '#EEECE8',
                }}
              >
                {icon}
              </button>

              {showIconPicker && (
                <div
                  className="absolute top-14 left-0 p-2 rounded-2xl grid grid-cols-5 gap-1"
                  style={{
                    background: isDark ? '#1C1C1C' : '#FFFFFF',
                    border: `1px solid ${isDark ? '#2E2E2E' : '#E8E5DF'}`,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                    zIndex: 30,
                  }}
                >
                  {ICONS.map((em) => (
                    <button
                      key={em}
                      onPointerDown={(e) => { e.stopPropagation(); setIcon(em); setShowIconPicker(false) }}
                      className="text-xl flex items-center justify-center rounded-xl active:scale-90"
                      style={{
                        width: '36px', height: '36px', touchAction: 'manipulation',
                        background: icon === em ? (isDark ? '#2A2A2A' : '#F0EDE8') : 'transparent',
                      }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              className="jw-input flex-1 font-semibold select-text"
              style={{
                fontSize: '24px',
                color: isDark ? '#F2F0EB' : '#1A1A1A',
                letterSpacing: '-0.02em',
                paddingTop: '8px',
                touchAction: 'manipulation',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  blockRefs.current.get(blocks[0]?.id)?.focus()
                }
              }}
            />
          </div>

          {/* Blocks */}
          <div className="relative">
            {blocks.map((block, idx) => {
              if (block.type === 'divider') {
                return (
                  <div key={block.id} className="flex items-center gap-3 py-2 my-2">
                    <div className="flex-1 h-px" style={{ background: isDark ? '#2E2E2E' : '#E8E5DF' }} />
                    <button
                      onPointerDown={() => removeBlock(block.id)}
                      className="text-xs opacity-40 active:opacity-80"
                      style={{ minWidth: '28px', minHeight: '28px', color: isDark ? '#636060' : '#9E9B96', touchAction: 'manipulation' }}
                    >
                      ✕
                    </button>
                    <div className="flex-1 h-px" style={{ background: isDark ? '#2E2E2E' : '#E8E5DF' }} />
                  </div>
                )
              }

              return (
                <div key={block.id} className="relative">
                  {block.type === 'bullet' && (
                    <span
                      className="absolute left-0 top-3 text-sm pointer-events-none select-none"
                      style={{ color: isDark ? '#636060' : '#9E9B96' }}
                    >
                      •
                    </span>
                  )}
                  <textarea
                    ref={(el) => {
                      if (el) blockRefs.current.set(block.id, el)
                      else blockRefs.current.delete(block.id)
                    }}
                    value={block.content}
                    placeholder={idx === 0 && blocks.length === 1 ? 'Start writing… (type / for commands)' : ''}
                    onChange={(e) => { handleBlockChange(block, e.target.value); growBlock(block.id) }}
                    onKeyDown={(e) => handleBlockKey(e, block)}
                    onFocus={() => setActiveBlockId(block.id)}
                    className={blockClassName(block.type)}
                    style={{
                      ...blockStyle(block.type),
                      minHeight: '28px',
                      touchAction: 'manipulation',
                      WebkitUserSelect: 'text',
                      userSelect: 'text',
                      borderLeft: block.type === 'quote'
                        ? `2px solid ${isDark ? '#4A4A4A' : '#D0CCC8'}`
                        : undefined,
                    }}
                    rows={1}
                  />
                </div>
              )
            })}

            {/* Slash command menu — z-index 30, above overlay (z-10) */}
            {showSlash && filteredSlash.length > 0 && (
              <div
                className="absolute w-52 rounded-2xl overflow-hidden"
                style={{
                  background: isDark ? '#1C1C1C' : '#FFFFFF',
                  border: `1px solid ${isDark ? '#2E2E2E' : '#E8E5DF'}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                  marginTop: '4px',
                  zIndex: 30,
                }}
              >
                {filteredSlash.map((opt) => (
                  <button
                    key={opt.type}
                    onPointerDown={(e) => {
                      // Prevent textarea blur so cursor stays
                      e.preventDefault()
                      convertBlock(activeBlockId, opt.type)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left active:opacity-70"
                    style={{
                      color: isDark ? '#D8D5CF' : '#2A2824',
                      fontSize: '14px',
                      touchAction: 'manipulation',
                      minHeight: '44px',
                    }}
                  >
                    <span
                      className="flex items-center justify-center rounded-lg text-xs font-bold flex-shrink-0"
                      style={{ width: '24px', height: '24px', background: isDark ? '#2A2A2A' : '#EEECE8', color: '#7EA8C4' }}
                    >
                      {opt.icon}
                    </span>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="mt-6">
            <TagInput tags={tags} onChange={setTags} isDark={isDark} accent="#7EA8C4" placeholder="Add tags…" />
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        <div
          className="sticky bottom-0 px-5 py-3"
          style={{
            background: isDark ? 'rgba(19,19,19,0.9)' : 'rgba(247,246,242,0.9)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
          }}
        >
          <MetaLabel
            createdAt={note?.createdAt ?? new Date().toISOString()}
            updatedAt={note?.updatedAt}
            isDark={isDark}
            wordCount={wordCount}
            expandable
          />
        </div>
      </div>
    </>
  )
}
