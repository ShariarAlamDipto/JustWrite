// ─── JustWrite Core Types ──────────────────────────────────────────────────────

export type Segment = 'journal' | 'ideas' | 'notes'
export type EntrySource = 'typed' | 'voice'
export type PrivacyState = 'public' | 'private'

// ── Shared base for all writing objects ────────────────────────────────────────
export interface JWBase {
  id: string
  userId: string
  createdAt: string      // ISO — set server-side, never user-input
  updatedAt: string      // ISO — set server-side, never user-input
  isPrivate: boolean
  source: EntrySource
  tags: string[]
}

// ── Journal Entry ──────────────────────────────────────────────────────────────
export interface JournalEntry extends JWBase {
  segment: 'journal'
  title?: string          // optional — most journals start body-first
  body: string
  mood?: number           // 1-10, captured passively after writing
  wordCount: number
  isLocked: boolean       // locked entries require biometric to view
  lockedAt?: string
}

// ── Idea ──────────────────────────────────────────────────────────────────────
export interface Idea extends JWBase {
  segment: 'ideas'
  title?: string          // optional or auto-generated from first words
  body: string
  voiceTranscriptId?: string
  convertedToNoteId?: string  // null until converted
  isLocked: boolean
}

// ── Note ──────────────────────────────────────────────────────────────────────
export interface NoteBlock {
  id: string
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' |
        'bullet' | 'numbered' | 'quote' | 'code' | 'divider' | 'voice'
  content: string
  indent?: number
  voiceTranscriptId?: string  // for type='voice'
}

export interface Note extends JWBase {
  segment: 'notes'
  title: string
  icon: string
  blocks: NoteBlock[]
  isLocked: boolean
  isPinned: boolean
  coverUrl?: string
  linkedNoteIds: string[]    // bidirectional links
  parentId?: string          // for nested notes
  wordCount: number
}

// ── Voice Transcript ──────────────────────────────────────────────────────────
export interface VoiceTranscript {
  id: string
  userId: string
  segment: Segment
  targetId?: string       // journal entry / idea / note id if attached
  durationSec: number
  transcript: string
  createdAt: string
  status: 'recording' | 'processing' | 'done' | 'error'
}

// ── Connect / Discovery types ─────────────────────────────────────────────────
export interface Backlink {
  noteId: string
  noteTitle: string
  excerpt: string
}

export interface Pattern {
  tag: string
  count: number
  lastSeen: string
  representative: { id: string; title: string; segment: Segment }
}

export interface GraphNode {
  id: string
  title: string
  segment: Segment
  degree: number
  x?: number
  y?: number
}

export interface GraphEdge {
  source: string
  target: string
  type: 'link' | 'tag' | 'backlink'
}

// ── UI State ──────────────────────────────────────────────────────────────────
export type TabId = 'journal' | 'ideas' | 'notes' | 'connect'

export interface CreationTarget {
  type: 'journal' | 'idea' | 'note' | 'record-idea' | 'record-note'
}

export type VoiceCaptureState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'recording'; durationSec: number }
  | { status: 'processing' }
  | { status: 'done'; transcript: string; durationSec: number }
  | { status: 'error'; message: string }

export type PrivacyUnlockState = 'locked' | 'unlocking' | 'unlocked'

// ── Editor ────────────────────────────────────────────────────────────────────
export interface EditorState {
  isDirty: boolean
  saveStatus: 'saved' | 'saving' | 'error'
  wordCount: number
  charCount: number
}

// ── Filter / Sort ─────────────────────────────────────────────────────────────
export interface ListFilter {
  query: string
  tag?: string
  showPrivate: boolean
  sort: 'newest' | 'oldest' | 'updated'
}
