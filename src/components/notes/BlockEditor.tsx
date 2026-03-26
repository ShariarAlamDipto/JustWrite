import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BlockType =
  | 'paragraph' | 'h1' | 'h2' | 'h3'
  | 'bullet' | 'numbered' | 'toggle'
  | 'quote' | 'code' | 'callout' | 'divider';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  indent: number;
  open?: boolean;
  icon?: string;
}

interface BlockEditorProps {
  noteId: string;
  title: string;
  icon: string | null;
  blocks: Block[];
  onChange: (title: string, icon: string | null, blocks: Block[]) => void;
  readOnly?: boolean;
  noteTitles?: { id: string; title: string; icon: string | null }[];
}

// ─── Slash menu items ─────────────────────────────────────────────────────────

const SLASH_ITEMS: { type: BlockType; label: string; description: string; symbol: string }[] = [
  { type: 'paragraph', label: 'Text',        description: 'Plain paragraph',          symbol: '¶' },
  { type: 'h1',        label: 'Heading 1',   description: 'Large section title',      symbol: 'H1' },
  { type: 'h2',        label: 'Heading 2',   description: 'Medium section title',     symbol: 'H2' },
  { type: 'h3',        label: 'Heading 3',   description: 'Small section title',      symbol: 'H3' },
  { type: 'bullet',    label: 'Bullet List', description: 'Unordered list item',      symbol: '•' },
  { type: 'numbered',  label: 'Numbered',    description: 'Ordered list item',        symbol: '1.' },
  { type: 'toggle',    label: 'Toggle',      description: 'Collapsible section',      symbol: '▶' },
  { type: 'quote',     label: 'Quote',       description: 'Highlighted blockquote',   symbol: '"' },
  { type: 'code',      label: 'Code',        description: 'Code block (monospace)',   symbol: '<>' },
  { type: 'callout',   label: 'Callout',     description: 'Highlighted note box',     symbol: '💡' },
  { type: 'divider',   label: 'Divider',     description: 'Horizontal separator',     symbol: '—' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newBlock(type: BlockType = 'paragraph'): Block {
  return { id: crypto.randomUUID(), type, content: '', indent: 0, open: true, icon: '💡' };
}

function isMultiline(type: BlockType) {
  return type === 'paragraph' || type === 'quote' || type === 'code' || type === 'callout';
}

// ─── Slash Menu ───────────────────────────────────────────────────────────────

interface SlashMenuProps {
  query: string;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}

function SlashMenu({ query, onSelect, onClose }: SlashMenuProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const filtered = SLASH_ITEMS.filter(
    item => !query || item.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => { setActiveIdx(0); }, [query]);

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter')     { e.preventDefault(); e.stopPropagation(); if (filtered[activeIdx]) onSelect(filtered[activeIdx].type); }
      if (e.key === 'Escape')    { onClose(); }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [filtered, activeIdx, onSelect, onClose]);

  if (!filtered.length) return null;

  return (
    <div style={slashStyles.menu} onMouseDown={e => e.preventDefault()}>
      <div style={slashStyles.hint}>Block type</div>
      {filtered.map((item, idx) => (
        <div
          key={item.type}
          style={{ ...slashStyles.item, ...(idx === activeIdx ? slashStyles.itemActive : {}) }}
          onMouseEnter={() => setActiveIdx(idx)}
          onMouseDown={() => onSelect(item.type)}
        >
          <span style={slashStyles.symbol}>{item.symbol}</span>
          <span>
            <div style={slashStyles.label}>{item.label}</div>
            <div style={slashStyles.desc}>{item.description}</div>
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Wikilink Menu ────────────────────────────────────────────────────────────

interface WikilinkMenuProps {
  query: string;
  notes: { id: string; title: string; icon: string | null }[];
  onSelect: (title: string) => void;
  onClose: () => void;
}

function WikilinkMenu({ query, notes, onSelect, onClose }: WikilinkMenuProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const filtered = notes.filter(
    n => !query || n.title.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);

  useEffect(() => { setActiveIdx(0); }, [query]);

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter')     { e.preventDefault(); e.stopPropagation(); if (filtered[activeIdx]) onSelect(filtered[activeIdx].title); }
      if (e.key === 'Escape')    { onClose(); }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [filtered, activeIdx, onSelect, onClose]);

  if (!filtered.length) return null;

  return (
    <div style={slashStyles.menu} onMouseDown={e => e.preventDefault()}>
      <div style={slashStyles.hint}>Link to note</div>
      {filtered.map((note, idx) => (
        <div
          key={note.id}
          style={{ ...slashStyles.item, ...(idx === activeIdx ? slashStyles.itemActive : {}) }}
          onMouseEnter={() => setActiveIdx(idx)}
          onMouseDown={() => onSelect(note.title)}
        >
          <span style={slashStyles.symbol}>{note.icon || '📄'}</span>
          <span style={slashStyles.label}>{note.title || 'Untitled'}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Individual block ─────────────────────────────────────────────────────────

interface BlockItemProps {
  block: Block;
  index: number;
  numberedIndex: number;
  isFocused: boolean;
  showSlash: boolean;
  slashQuery: string;
  onFocus: () => void;
  onChange: (content: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  onSlashSelect: (type: BlockType) => void;
  onSlashClose: () => void;
  showWiki: boolean;
  wikiQuery: string;
  wikiNotes: { id: string; title: string; icon: string | null }[];
  onWikiSelect: (title: string) => void;
  onWikiClose: () => void;
  onToggle: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  autoFocus: boolean;
}

function BlockItem({
  block, index, numberedIndex, isFocused,
  showSlash, slashQuery,
  onFocus, onChange, onKeyDown,
  onSlashSelect, onSlashClose,
  showWiki, wikiQuery, wikiNotes, onWikiSelect, onWikiClose,
  onToggle, onDragStart, onDragOver, onDrop,
  autoFocus,
}: BlockItemProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, [block.content, block.type]);

  // Focus when isFocused changes
  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [isFocused]);

  if (block.type === 'divider') {
    return (
      <div
        style={{ ...blockWrap, paddingTop: '0.25rem', paddingBottom: '0.25rem' }}
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <div style={dividerStyle} />
      </div>
    );
  }

  const prefix = block.type === 'bullet'
    ? <span style={prefixStyle}>{'  '.repeat(block.indent)}•</span>
    : block.type === 'numbered'
    ? <span style={prefixStyle}>{numberedIndex}.</span>
    : block.type === 'toggle'
    ? <span style={{ ...prefixStyle, cursor: 'pointer', userSelect: 'none' }} onClick={onToggle}>{block.open ? '▾' : '▸'}</span>
    : null;

  const inputStyle = getInputStyle(block.type);

  return (
    <div
      style={{ ...blockWrap, paddingLeft: `${block.indent * 1.5}rem` }}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Drag handle */}
      <div style={dragHandle} className="drag-handle" title="Drag to reorder">⠿</div>

      {/* Block prefix (bullet/number/toggle arrow) */}
      {prefix}

      {/* Callout icon */}
      {block.type === 'callout' && (
        <span style={calloutIcon}>{block.icon || '💡'}</span>
      )}

      <div style={{ position: 'relative', flex: 1 }}>
        <textarea
          ref={inputRef}
          value={block.content}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          autoFocus={autoFocus}
          rows={1}
          placeholder={getPlaceholder(block.type, isFocused)}
          spellCheck
          style={inputStyle}
        />
        {showSlash && (
          <div style={slashStyles.anchor}>
            <SlashMenu
              query={slashQuery}
              onSelect={onSlashSelect}
              onClose={onSlashClose}
            />
          </div>
        )}
        {showWiki && (
          <div style={slashStyles.anchor}>
            <WikilinkMenu
              query={wikiQuery}
              notes={wikiNotes}
              onSelect={onWikiSelect}
              onClose={onWikiClose}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main BlockEditor ─────────────────────────────────────────────────────────

export function BlockEditor({ noteId, title, icon, blocks: initialBlocks, onChange, readOnly, noteTitles = [] }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>(
    initialBlocks.length > 0 ? initialBlocks : [newBlock()]
  );
  const [titleValue, setTitleValue] = useState(title);
  const [iconValue, setIconValue] = useState(icon);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [slashBlockId, setSlashBlockId] = useState<string | null>(null);
  const [slashQuery, setSlashQuery] = useState('');
  const [wikiBlockId, setWikiBlockId] = useState<string | null>(null);
  const [wikiQuery, setWikiQuery] = useState('');
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [newBlockId, setNewBlockId] = useState<string | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Sync blocks when noteId changes
  useEffect(() => {
    setBlocks(initialBlocks.length > 0 ? initialBlocks : [newBlock()]);
    setTitleValue(title);
    setIconValue(icon);
    setFocusedId(null);
    setSlashBlockId(null);
  }, [noteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent on every change
  useEffect(() => {
    onChange(titleValue, iconValue, blocks);
  }, [blocks, titleValue, iconValue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-resize title
  useEffect(() => {
    const el = titleRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
  }, [titleValue]);

  const updateBlock = useCallback((id: string, content: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
  }, []);

  const changeBlockType = useCallback((id: string, type: BlockType) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, type, content: b.content.startsWith('/') ? '' : b.content } : b));
    setSlashBlockId(null);
    setSlashQuery('');
    setFocusedId(id);
  }, []);

  const handleKeyDown = useCallback((
    e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
    block: Block,
    index: number
  ) => {
    // Enter → new paragraph below (unless Shift+Enter in multiline block)
    if (e.key === 'Enter' && !(e.shiftKey && isMultiline(block.type))) {
      if (slashBlockId) return; // slash menu handles enter
      e.preventDefault();
      const nb = newBlock();
      setBlocks(prev => {
        const next = [...prev];
        next.splice(index + 1, 0, nb);
        return next;
      });
      setNewBlockId(nb.id);
      setFocusedId(nb.id);
      setSlashBlockId(null);
    }

    // Backspace on empty block → delete and focus previous
    if (e.key === 'Backspace' && block.content === '' && blocks.length > 1) {
      e.preventDefault();
      setBlocks(prev => prev.filter(b => b.id !== block.id));
      const prevBlock = blocks[index - 1] ?? blocks[index + 1];
      if (prevBlock) setFocusedId(prevBlock.id);
      setSlashBlockId(null);
    }

    // Tab → indent / Shift+Tab → unindent
    if (e.key === 'Tab') {
      e.preventDefault();
      setBlocks(prev => prev.map(b =>
        b.id === block.id
          ? { ...b, indent: e.shiftKey ? Math.max(0, b.indent - 1) : Math.min(4, b.indent + 1) }
          : b
      ));
    }

    // Arrow navigation between blocks
    if (e.key === 'ArrowUp' && index > 0) {
      const el = e.currentTarget as HTMLTextAreaElement;
      if (el.selectionStart === 0) {
        e.preventDefault();
        setFocusedId(blocks[index - 1].id);
      }
    }
    if (e.key === 'ArrowDown' && index < blocks.length - 1) {
      const el = e.currentTarget as HTMLTextAreaElement;
      if (el.selectionStart === el.value.length) {
        e.preventDefault();
        setFocusedId(blocks[index + 1].id);
      }
    }
  }, [blocks, slashBlockId]);

  const applyWikilink = useCallback((blockId: string, selectedTitle: string) => {
    setBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      const lastOpen = b.content.lastIndexOf('[[');
      if (lastOpen === -1) return b;
      return { ...b, content: b.content.slice(0, lastOpen) + `[[${selectedTitle}]] ` };
    }));
    setWikiBlockId(null);
    setWikiQuery('');
    setFocusedId(blockId);
  }, []);

  const handleChange = useCallback((block: Block, value: string) => {
    // Slash command detection
    if (value === '/') {
      setSlashBlockId(block.id);
      setSlashQuery('');
      setWikiBlockId(null);
    } else if (slashBlockId === block.id) {
      if (value.startsWith('/')) {
        setSlashQuery(value.slice(1));
      } else {
        setSlashBlockId(null);
        setSlashQuery('');
      }
    }

    // Wikilink detection: find last `[[` in value
    const lastOpen = value.lastIndexOf('[[');
    if (lastOpen !== -1 && !value.slice(lastOpen).includes(']]')) {
      const query = value.slice(lastOpen + 2);
      setWikiBlockId(block.id);
      setWikiQuery(query);
      setSlashBlockId(null);
    } else if (wikiBlockId === block.id) {
      setWikiBlockId(null);
      setWikiQuery('');
    }

    updateBlock(block.id, value);
  }, [slashBlockId, wikiBlockId, updateBlock]);

  const handleDrop = useCallback((targetId: string) => {
    if (!dragSourceId || dragSourceId === targetId) return;
    setBlocks(prev => {
      const src = prev.find(b => b.id === dragSourceId)!;
      const without = prev.filter(b => b.id !== dragSourceId);
      const targetIdx = without.findIndex(b => b.id === targetId);
      const next = [...without];
      next.splice(targetIdx, 0, src);
      return next;
    });
    setDragSourceId(null);
  }, [dragSourceId]);

  // Count numbered list items
  let numberedCount = 0;

  return (
    <div style={editorContainer}>
      {/* Cover placeholder (future: image upload) */}

      {/* Icon + Title */}
      <div style={titleArea}>
        <button
          style={iconBtn}
          title="Change icon"
          onClick={() => {
            const emoji = prompt('Enter an emoji for this note:', iconValue || '📝');
            if (emoji !== null) setIconValue(emoji.trim() || null);
          }}
        >
          {iconValue || '📝'}
        </button>
        <textarea
          ref={titleRef}
          value={titleValue}
          onChange={e => setTitleValue(e.target.value)}
          placeholder="Untitled"
          rows={1}
          style={titleInput}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              setFocusedId(blocks[0]?.id ?? null);
            }
          }}
        />
      </div>

      {/* Blocks */}
      <div style={blocksArea}>
        {blocks.map((block, index) => {
          if (block.type === 'numbered') numberedCount++;
          else numberedCount = 0;

          return (
            <BlockItem
              key={block.id}
              block={block}
              index={index}
              numberedIndex={numberedCount}
              isFocused={focusedId === block.id}
              showSlash={slashBlockId === block.id}
              slashQuery={slashQuery}
              onFocus={() => setFocusedId(block.id)}
              onChange={val => handleChange(block, val)}
              onKeyDown={e => handleKeyDown(e, block, index)}
              onSlashSelect={type => changeBlockType(block.id, type)}
              onSlashClose={() => { setSlashBlockId(null); setSlashQuery(''); }}
              showWiki={wikiBlockId === block.id}
              wikiQuery={wikiQuery}
              wikiNotes={noteTitles}
              onWikiSelect={selectedTitle => applyWikilink(block.id, selectedTitle)}
              onWikiClose={() => { setWikiBlockId(null); setWikiQuery(''); }}
              onToggle={() => setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, open: !b.open } : b))}
              onDragStart={() => setDragSourceId(block.id)}
              onDragOver={e => { e.preventDefault(); }}
              onDrop={() => handleDrop(block.id)}
              autoFocus={newBlockId === block.id}
            />
          );
        })}

        {/* Add block button */}
        <button
          style={addBlockBtn}
          onClick={() => {
            const nb = newBlock();
            setBlocks(prev => [...prev, nb]);
            setNewBlockId(nb.id);
            setFocusedId(nb.id);
          }}
        >
          + Add block
        </button>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function getPlaceholder(type: BlockType, focused: boolean): string {
  if (!focused) return '';
  const map: Partial<Record<BlockType, string>> = {
    paragraph: "Write something, or type '/' for commands…",
    h1: 'Heading 1',
    h2: 'Heading 2',
    h3: 'Heading 3',
    bullet: 'List item',
    numbered: 'List item',
    toggle: 'Toggle heading',
    quote: 'Quote',
    code: 'Code',
    callout: 'Callout text',
  };
  return map[type] ?? '';
}

function getInputStyle(type: BlockType): React.CSSProperties {
  const base: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
    color: 'var(--fg)',
    lineHeight: 1.65,
    padding: '2px 0',
    overflowY: 'hidden',
    display: 'block',
  };
  const variants: Partial<Record<BlockType, React.CSSProperties>> = {
    h1: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2, padding: '4px 0' },
    h2: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.3, padding: '3px 0' },
    h3: { fontSize: '1.15rem', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.4, padding: '2px 0' },
    quote: {
      borderLeft: '3px solid var(--accent-bright)',
      paddingLeft: '1rem',
      fontStyle: 'italic',
      color: 'var(--fg-dim)',
    },
    code: {
      fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
      fontSize: '0.875rem',
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-md)',
      padding: '0.75rem 1rem',
      color: '#7dd3fc',
      lineHeight: 1.7,
    },
    callout: {
      background: 'rgba(49, 130, 206, 0.08)',
      borderRadius: 'var(--radius-md)',
      padding: '0.75rem',
      border: '1px solid rgba(49, 130, 206, 0.2)',
    },
  };
  return { ...base, ...(variants[type] || { fontSize: '1rem' }) };
}

const editorContainer: React.CSSProperties = {
  flex: 1,
  maxWidth: '720px',
  margin: '0 auto',
  padding: '2rem 2rem 6rem',
  width: '100%',
};

const titleArea: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.75rem',
  marginBottom: '1.5rem',
};

const iconBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontSize: '2.5rem',
  lineHeight: 1,
  padding: '0.25rem',
  borderRadius: 'var(--radius-md)',
  flexShrink: 0,
  transition: 'background 0.15s ease',
};

const titleInput: React.CSSProperties = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  resize: 'none',
  fontFamily: 'inherit',
  fontSize: '2.25rem',
  fontWeight: 700,
  color: 'var(--fg)',
  letterSpacing: '-0.03em',
  lineHeight: 1.2,
  padding: '0.25rem 0',
  overflowY: 'hidden',
  width: '100%',
};

const blocksArea: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
};

const blockWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.5rem',
  position: 'relative',
  borderRadius: 'var(--radius-sm)',
  padding: '0.125rem 0.25rem',
  transition: 'background 0.1s ease',
};

const dragHandle: React.CSSProperties = {
  color: 'var(--muted)',
  fontSize: '14px',
  cursor: 'grab',
  opacity: 0,
  transition: 'opacity 0.15s ease',
  userSelect: 'none',
  flexShrink: 0,
  paddingTop: '4px',
  lineHeight: 1,
};

const prefixStyle: React.CSSProperties = {
  color: 'var(--fg-dim)',
  fontSize: '1rem',
  flexShrink: 0,
  paddingTop: '3px',
  lineHeight: 1.65,
  minWidth: '1.25rem',
};

const calloutIcon: React.CSSProperties = {
  fontSize: '1.1rem',
  flexShrink: 0,
  paddingTop: '3px',
  lineHeight: 1.65,
};

const dividerStyle: React.CSSProperties = {
  height: '1px',
  background: 'var(--border)',
  width: '100%',
  margin: '0.5rem 0',
};

const addBlockBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--muted)',
  cursor: 'pointer',
  fontSize: '13px',
  padding: '0.5rem 0.25rem',
  textAlign: 'left',
  marginTop: '0.5rem',
  fontFamily: 'inherit',
  transition: 'color 0.15s ease',
};

const slashStyles = {
  anchor: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    zIndex: 200,
  },
  menu: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    padding: '0.375rem',
    minWidth: '240px',
    maxHeight: '320px',
    overflowY: 'auto' as const,
  },
  hint: {
    fontSize: '10px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--muted)',
    padding: '0.25rem 0.5rem',
    marginBottom: '0.125rem',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 0.625rem',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'background 0.1s ease',
  },
  itemActive: {
    background: 'var(--bg-card)',
  },
  symbol: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--fg-dim)',
    flexShrink: 0,
    fontFamily: '"JetBrains Mono", monospace',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--fg)',
  },
  desc: {
    fontSize: '11px',
    color: 'var(--muted)',
    marginTop: '1px',
  },
};
