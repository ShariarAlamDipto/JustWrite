import { useState, useEffect, useMemo, memo } from 'react';
import { Nav } from '@/components/Nav';
import { BlockEditor } from '@/components/notes/BlockEditor';
import { useAuth } from '@/lib/useAuth';
import { useRouter } from 'next/router';
import { useNotes, type NoteListItem } from '@/hooks/useNotes';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotesPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const {
    notes,
    selectedNote,
    loadingList,
    loadingNote,
    saving,
    loadNotes,
    openNote,
    createNote,
    deleteNote,
    togglePin,
    handleEditorChange,
  } = useNotes(user, token);

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) loadNotes();
  }, [user, loadNotes]);

  // ── Derived: all tags across notes ────────────────────────────────────────
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of notes) {
      const m = note.title.matchAll(/#(\w+)/g);
      for (const match of m) counts.set(match[1].toLowerCase(), (counts.get(match[1].toLowerCase()) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
  }, [notes]);

  // ── Filtered notes (memoized) ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    return notes.filter(n => {
      const matchesSearch = !search || n.title.toLowerCase().includes(search.toLowerCase());
      const matchesTag = !tagFilter || n.title.toLowerCase().includes(`#${tagFilter}`);
      return matchesSearch && matchesTag;
    });
  }, [notes, search, tagFilter]);

  const pinned = useMemo(() => filtered.filter(n => n.is_pinned), [filtered]);
  const unpinned = useMemo(() => filtered.filter(n => !n.is_pinned), [filtered]);

  // Backlinks come from the note detail (fetched by API when note is opened)
  const backlinks = selectedNote?.backlinks ?? [];

  if (authLoading || !user) return null;

  return (
    <>
      <Nav />
      <div style={pageLayout}>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside style={{ ...sidebar, ...(sidebarOpen ? {} : sidebarHidden) }}>
          <div style={sidebarHeader}>
            <span style={sidebarTitle}>Notes</span>
            <button style={newNoteBtn} onClick={createNote} title="New note">+</button>
          </div>

          <div style={searchWrap}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes…"
              style={searchInput}
            />
          </div>

          {allTags.length > 0 && (
            <div style={tagChipRow}>
              {allTags.slice(0, 12).map(tag => (
                <button
                  key={tag}
                  style={{ ...tagChip, ...(tagFilter === tag ? tagChipActive : {}) }}
                  onClick={() => setTagFilter(t => t === tag ? null : tag)}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          <div style={noteList}>
            {loadingList ? (
              <div style={emptyMsg}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={emptyMsg}>
                {search ? 'No results' : 'No notes yet'}
                {!search && (
                  <button style={createFirstBtn} onClick={createNote}>
                    Create your first note
                  </button>
                )}
              </div>
            ) : (
              <>
                {pinned.length > 0 && (
                  <>
                    <div style={sectionLabel}>Pinned</div>
                    {pinned.map(n => (
                      <NoteRow
                        key={n.id}
                        note={n}
                        active={selectedNote?.id === n.id}
                        onOpen={() => openNote(n.id)}
                        onDelete={() => deleteNote(n.id)}
                        onPin={() => togglePin(n.id, n.is_pinned)}
                      />
                    ))}
                    <div style={sectionDivider} />
                  </>
                )}
                {unpinned.map(n => (
                  <NoteRow
                    key={n.id}
                    note={n}
                    active={selectedNote?.id === n.id}
                    onOpen={() => openNote(n.id)}
                    onDelete={() => deleteNote(n.id)}
                    onPin={() => togglePin(n.id, n.is_pinned)}
                  />
                ))}
              </>
            )}
          </div>
        </aside>

        {/* ── Editor pane ──────────────────────────────────────────────────── */}
        <main style={editorPane}>
          {/* Mobile sidebar toggle */}
          <button
            style={sidebarToggle}
            onClick={() => setSidebarOpen(o => !o)}
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>

          {loadingNote ? (
            <div style={centerMsg}><div className="spinner" /></div>
          ) : selectedNote ? (
            <>
              {/* Save status */}
              <div style={saveStatus}>
                {saving === 'saving' && <span style={{ color: 'var(--muted)' }}>Saving…</span>}
                {saving === 'saved'  && <span style={{ color: 'var(--success)', opacity: 0.7 }}>Saved</span>}
                {saving === 'error'  && <span style={{ color: 'var(--danger)' }}>Save failed</span>}
              </div>
              <div style={editorScroll}>
                <BlockEditor
                  key={selectedNote.id}
                  noteId={selectedNote.id}
                  title={selectedNote.title}
                  icon={selectedNote.icon}
                  blocks={selectedNote.blocks || []}
                  onChange={handleEditorChange}
                  noteTitles={notes.filter(n => n.id !== selectedNote.id)}
                />

                {backlinks.length > 0 && (
                  <div style={backlinksPanel}>
                    <div style={backlinksTitle}>Linked from</div>
                    {backlinks.map(bl => (
                      <div
                        key={bl.id}
                        style={backlinkRow}
                        onClick={() => openNote(bl.id)}
                      >
                        <span style={{ fontSize: '13px', marginRight: '0.375rem' }}>{bl.icon || '📄'}</span>
                        <span style={{ fontSize: '13px', color: 'var(--accent-bright)' }}>{bl.title || 'Untitled'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={emptyEditor}>
              <div style={emptyEditorIcon}>📝</div>
              <div style={emptyEditorTitle}>Your second brain</div>
              <div style={emptyEditorSub}>
                Select a note or create a new one to start writing.
              </div>
              <button style={emptyEditorBtn} onClick={createNote}>
                + New Note
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Hover styles for drag handles and note rows */}
      <style>{`
        .drag-handle { opacity: 0 !important; }
        div[draggable]:hover .drag-handle { opacity: 1 !important; }
        .note-row-actions { opacity: 0 !important; }
        .note-row:hover .note-row-actions { opacity: 1 !important; }
        .note-row:hover { background: var(--bg-card) !important; }
        .backlink-row:hover { background: var(--bg-card) !important; }
        textarea::placeholder { color: var(--muted); }
        textarea:focus { outline: none; }
        .note-row.active-note { background: var(--bg-card) !important; }
      `}</style>
    </>
  );
}

// ─── Note row in sidebar ──────────────────────────────────────────────────────

const NoteRow = memo(function NoteRow({
  note, active, onOpen, onDelete, onPin,
}: {
  note: NoteListItem;
  active: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onPin: () => void;
}) {
  return (
    <div
      className={`note-row${active ? ' active-note' : ''}`}
      style={noteRowStyle}
      onClick={onOpen}
    >
      <span style={noteRowIcon}>{note.icon || '📄'}</span>
      <span style={noteRowTitle}>{note.title || 'Untitled'}</span>
      <span className="note-row-actions" style={noteRowActions} onClick={e => e.stopPropagation()}>
        <button style={rowAction} onClick={onPin} title={note.is_pinned ? 'Unpin' : 'Pin'}>
          {note.is_pinned ? '📌' : '⊕'}
        </button>
        <button style={{ ...rowAction, color: 'var(--danger)' }} onClick={onDelete} title="Delete">
          ×
        </button>
      </span>
    </div>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const pageLayout: React.CSSProperties = {
  display: 'flex',
  height: 'calc(100vh - 56px)',
  overflow: 'hidden',
};

const sidebar: React.CSSProperties = {
  width: '240px',
  flexShrink: 0,
  borderRight: '1px solid var(--border)',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg-elevated)',
  transition: 'width 0.2s ease',
  overflow: 'hidden',
};

const sidebarHidden: React.CSSProperties = {
  width: 0,
  borderRight: 'none',
};

const sidebarHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '1rem 1rem 0.5rem',
  flexShrink: 0,
};

const sidebarTitle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
};

const newNoteBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--fg)',
  width: '26px',
  height: '26px',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  fontSize: '18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
  padding: 0,
};

const searchWrap: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  flexShrink: 0,
};

const searchInput: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--fg)',
  fontSize: '12px',
  padding: '0.375rem 0.625rem',
  outline: 'none',
  fontFamily: 'inherit',
};

const noteList: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '0.25rem 0.5rem 1rem',
};

const sectionLabel: React.CSSProperties = {
  fontSize: '10px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  padding: '0.5rem 0.5rem 0.25rem',
};

const sectionDivider: React.CSSProperties = {
  height: '1px',
  background: 'var(--border)',
  margin: '0.5rem 0.5rem',
};

const noteRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  transition: 'background 0.1s ease',
  position: 'relative',
};

const noteRowIcon: React.CSSProperties = {
  fontSize: '14px',
  flexShrink: 0,
};

const noteRowTitle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--fg)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: 1,
};

const noteRowActions: React.CSSProperties = {
  display: 'flex',
  gap: '0.125rem',
  flexShrink: 0,
  transition: 'opacity 0.15s ease',
};

const rowAction: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--muted)',
  cursor: 'pointer',
  fontSize: '14px',
  padding: '2px 4px',
  borderRadius: 'var(--radius-sm)',
  fontFamily: 'inherit',
};

const emptyMsg: React.CSSProperties = {
  color: 'var(--muted)',
  fontSize: '13px',
  textAlign: 'center',
  padding: '2rem 1rem',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.75rem',
};

const createFirstBtn: React.CSSProperties = {
  background: 'var(--accent-bright)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  padding: '0.5rem 1rem',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const editorPane: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  position: 'relative',
};

const sidebarToggle: React.CSSProperties = {
  position: 'absolute',
  top: '0.75rem',
  left: '0.75rem',
  zIndex: 10,
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  color: 'var(--muted)',
  borderRadius: 'var(--radius-md)',
  width: '28px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: '11px',
};

const saveStatus: React.CSSProperties = {
  position: 'absolute',
  top: '0.875rem',
  right: '1rem',
  fontSize: '12px',
  zIndex: 10,
};

const editorScroll: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  paddingTop: '2.5rem',
};

const centerMsg: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const emptyEditor: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.75rem',
  color: 'var(--fg-dim)',
};

const emptyEditorIcon: React.CSSProperties = {
  fontSize: '3rem',
  opacity: 0.4,
};

const emptyEditorTitle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 600,
  color: 'var(--fg)',
};

const emptyEditorSub: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--muted)',
  textAlign: 'center',
  maxWidth: '280px',
};

const emptyEditorBtn: React.CSSProperties = {
  marginTop: '0.5rem',
  background: 'var(--accent-bright)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  padding: '0.625rem 1.25rem',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const backlinksPanel: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
  padding: '1.5rem 2rem 3rem',
  borderTop: '1px solid var(--border)',
};

const backlinksTitle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  marginBottom: '0.75rem',
};

const backlinkRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '0.375rem 0.5rem',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  transition: 'background 0.1s ease',
};

const tagChipRow: React.CSSProperties = {
  display: 'flex',
  gap: '0.25rem',
  padding: '0 0.75rem 0.5rem',
  overflowX: 'auto',
  flexShrink: 0,
  scrollbarWidth: 'none',
};

const tagChip: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--muted)',
  borderRadius: '999px',
  padding: '2px 8px',
  fontSize: '11px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  fontFamily: 'inherit',
  flexShrink: 0,
  transition: 'all 0.1s ease',
};

const tagChipActive: React.CSSProperties = {
  background: 'var(--accent)',
  borderColor: 'var(--accent)',
  color: '#fff',
};
