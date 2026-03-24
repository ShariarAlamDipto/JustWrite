import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Nav } from '@/components/Nav';
import { useAuth } from '@/lib/useAuth';
import { useRouter } from 'next/router';

// SSR-safe import — canvas won't render on server
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  rawId: string;
  type: 'entry' | 'note' | 'task' | 'voice' | 'keyword';
  label: string;
  mood?: number;
  source?: string;
  wordCount?: number;
  blockCount?: number;
  status?: string;
  priority?: string;
  entryId?: string;
  hasTranscript?: boolean;
  duration?: number;
  frequency?: number;
  icon?: string;
  isEncrypted?: boolean;
  createdAt?: string;
  // force-graph adds these at runtime
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'extracted' | 'keyword' | 'similar' | 'mention' | 'wikilink';
}

type ColorMode = 'mood' | 'source' | 'recency' | 'type';
type LayoutMode = 'force' | 'timeline';

// ─── Color helpers ────────────────────────────────────────────────────────────

function moodColor(mood: number | undefined): string {
  if (mood === undefined) return '#4a5568';
  if (mood < 20) return '#e53e3e';
  if (mood < 40) return '#dd6b20';
  if (mood < 60) return '#d69e2e';
  if (mood < 80) return '#38a169';
  return '#3182ce';
}

function recencyColor(createdAt: string | undefined): string {
  if (!createdAt) return '#4a5568';
  const days = (Date.now() - new Date(createdAt).getTime()) / 86400000;
  if (days < 1)  return '#63b3ed';
  if (days < 7)  return '#4299e1';
  if (days < 30) return '#3182ce';
  if (days < 90) return '#2c5282';
  return '#2a4365';
}

function typeColor(type: GraphNode['type']): string {
  const map: Record<string, string> = {
    entry:   '#4299e1',
    note:    '#9f7aea',
    task:    '#48bb78',
    voice:   '#38b2ac',
    keyword: '#ed8936',
  };
  return map[type] || '#718096';
}

function nodeColor(node: GraphNode, mode: ColorMode): string {
  if (node.type === 'keyword') return '#ed8936';
  if (node.type === 'task') {
    if (node.status === 'done') return '#38a169';
    if (node.priority === 'high') return '#e53e3e';
    return '#d69e2e';
  }
  switch (mode) {
    case 'mood':    return moodColor(node.mood);
    case 'recency': return recencyColor(node.createdAt);
    case 'source':  return node.source === 'brainstorm' ? '#9f7aea' : node.source === 'voice' ? '#38b2ac' : '#4299e1';
    case 'type':    return typeColor(node.type);
    default:        return typeColor(node.type);
  }
}

function nodeRadius(node: GraphNode): number {
  if (node.type === 'keyword')  return 4 + Math.min((node.frequency || 1) * 1.5, 10);
  if (node.type === 'task')     return 5;
  if (node.type === 'voice')    return 7;
  if (node.type === 'note')     return 6 + Math.min((node.blockCount || 0) * 0.3, 8);
  // entry — size by word count
  return 5 + Math.min((node.wordCount || 0) / 120, 10);
}

function linkColor(link: GraphLink): string {
  const type = link.type;
  if (type === 'extracted') return 'rgba(72,187,120,0.4)';
  if (type === 'keyword')   return 'rgba(237,137,54,0.3)';
  if (type === 'similar')   return 'rgba(66,153,225,0.25)';
  return 'rgba(160,174,192,0.25)';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GraphPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // UI state
  const [colorMode, setColorMode] = useState<ColorMode>('type');
  const [layout, setLayout] = useState<LayoutMode>('force');
  const [search, setSearch] = useState('');
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [filterPanel, setFilterPanel] = useState(false);

  // Filters
  const [showEntries, setShowEntries] = useState(true);
  const [showNotes, setShowNotes]     = useState(true);
  const [showTasks, setShowTasks]     = useState(true);
  const [showVoice, setShowVoice]     = useState(true);
  const [showKeywords, setShowKeywords] = useState(true);
  const [moodMin, setMoodMin] = useState(0);
  const [moodMax, setMoodMax] = useState(100);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [authLoading, user, router]);

  // Measure container
  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Load graph data
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch('/api/graph', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.nodes) setGraphData(d);
        else setError('Failed to load graph data');
      })
      .catch(() => setError('Network error loading graph'))
      .finally(() => setLoading(false));
  }, [token]);

  // Apply timeline layout: pin nodes to X=date, Y=mood
  useEffect(() => {
    if (layout !== 'timeline' || !graphData.nodes.length) return;
    const entries = graphData.nodes.filter(n => n.type === 'entry' && n.createdAt);
    if (!entries.length) return;

    const dates = entries.map(n => new Date(n.createdAt!).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const dateRange = maxDate - minDate || 1;
    const W = dimensions.width - 120;
    const H = dimensions.height - 80;

    setGraphData(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => {
        if (n.type === 'entry' && n.createdAt) {
          const t = new Date(n.createdAt).getTime();
          return {
            ...n,
            fx: -W / 2 + ((t - minDate) / dateRange) * W,
            fy: H / 2 - ((n.mood ?? 50) / 100) * H,
          };
        }
        // unpin non-entry nodes in timeline
        return { ...n, fx: undefined, fy: undefined };
      }),
    }));
  }, [layout, graphData.nodes.length, dimensions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Unpin all when switching back to force
  useEffect(() => {
    if (layout === 'force') {
      setGraphData(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => ({ ...n, fx: undefined, fy: undefined })),
      }));
    }
  }, [layout]);

  // Filtered data
  const filteredData = useMemo(() => {
    const typeAllowed = (n: GraphNode) => {
      if (n.type === 'entry'   && !showEntries)  return false;
      if (n.type === 'note'    && !showNotes)     return false;
      if (n.type === 'task'    && !showTasks)     return false;
      if (n.type === 'voice'   && !showVoice)     return false;
      if (n.type === 'keyword' && !showKeywords)  return false;
      return true;
    };

    const moodAllowed = (n: GraphNode) => {
      if (n.type !== 'entry') return true;
      const m = n.mood ?? 50;
      return m >= moodMin && m <= moodMax;
    };

    const searchAllowed = (n: GraphNode) => {
      if (!search) return true;
      return n.label.toLowerCase().includes(search.toLowerCase());
    };

    const visibleIds = new Set(
      graphData.nodes
        .filter(n => typeAllowed(n) && moodAllowed(n))
        .map(n => n.id)
    );

    const nodes = graphData.nodes
      .filter(n => visibleIds.has(n.id))
      .map(n => ({ ...n, _dimmed: search ? !searchAllowed(n) : false }));

    const links = graphData.links.filter(l => {
      const sid = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
      const tid = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
      return visibleIds.has(sid) && visibleIds.has(tid);
    });

    return { nodes, links };
  }, [graphData, showEntries, showNotes, showTasks, showVoice, showKeywords, moodMin, moodMax, search]);

  // Canvas draw callback
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const r = nodeRadius(node);
    const color = nodeColor(node, colorMode);
    const dimmed = (node as any)._dimmed;
    const isSelected = selectedNode?.id === node.id;
    const isHovered  = hoveredNode?.id === node.id;

    ctx.globalAlpha = dimmed ? 0.15 : 1;

    // Glow on selected/hovered
    if (isSelected || isHovered) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI);
      ctx.fillStyle = color + '40';
      ctx.fill();
    }

    // Node shape
    ctx.beginPath();
    if (node.type === 'task') {
      // Diamond
      ctx.moveTo(node.x, node.y - r);
      ctx.lineTo(node.x + r, node.y);
      ctx.lineTo(node.x, node.y + r);
      ctx.lineTo(node.x - r, node.y);
      ctx.closePath();
    } else if (node.type === 'note') {
      // Rounded square
      const s = r * 1.2;
      const rc = s * 0.3;
      ctx.moveTo(node.x - s + rc, node.y - s);
      ctx.lineTo(node.x + s - rc, node.y - s);
      ctx.quadraticCurveTo(node.x + s, node.y - s, node.x + s, node.y - s + rc);
      ctx.lineTo(node.x + s, node.y + s - rc);
      ctx.quadraticCurveTo(node.x + s, node.y + s, node.x + s - rc, node.y + s);
      ctx.lineTo(node.x - s + rc, node.y + s);
      ctx.quadraticCurveTo(node.x - s, node.y + s, node.x - s, node.y + s - rc);
      ctx.lineTo(node.x - s, node.y - s + rc);
      ctx.quadraticCurveTo(node.x - s, node.y - s, node.x - s + rc, node.y - s);
      ctx.closePath();
    } else {
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    }

    ctx.fillStyle = color;
    ctx.fill();

    // Selected ring
    if (isSelected) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();
    }

    // Label at sufficient zoom
    const labelThreshold = node.type === 'keyword' ? 2.5 : 1.5;
    if (globalScale >= labelThreshold || isSelected || isHovered) {
      const label = node.label.length > 18 ? node.label.slice(0, 16) + '…' : node.label;
      ctx.font = `${isSelected ? 600 : 400} ${Math.max(3, 10 / globalScale)}px system-ui, sans-serif`;
      ctx.fillStyle = dimmed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.9)';
      ctx.textAlign = 'center';
      ctx.fillText(label, node.x, node.y + r + 8 / globalScale);
    }

    ctx.globalAlpha = 1;
  }, [colorMode, selectedNode, hoveredNode]);

  const handleNodeHover = useCallback((node: GraphNode | null, _prev: GraphNode | null) => {
    setHoveredNode(node);
    document.body.style.cursor = node ? 'pointer' : 'default';
  }, []);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node);
  }, []);

  const handleNodeRightClick = useCallback((node: GraphNode) => {
    if (node.type === 'entry') router.push('/');
    if (node.type === 'note')  router.push('/notes');
    if (node.type === 'task')  router.push('/tasks');
  }, [router]);

  const handleBgClick = useCallback(() => setSelectedNode(null), []);

  const resetView = useCallback(() => {
    graphRef.current?.zoomToFit(400, 40);
  }, []);

  const stats = useMemo(() => ({
    entries:  graphData.nodes.filter(n => n.type === 'entry').length,
    notes:    graphData.nodes.filter(n => n.type === 'note').length,
    tasks:    graphData.nodes.filter(n => n.type === 'task').length,
    keywords: graphData.nodes.filter(n => n.type === 'keyword').length,
    links:    graphData.links.length,
  }), [graphData]);

  if (authLoading || !user) return null;

  return (
    <>
      <Nav />
      <div style={pageWrap}>

        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div style={toolbar}>
          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search nodes…"
            style={searchInput}
          />

          {/* Layout toggle */}
          <div style={segmented}>
            {(['force', 'timeline'] as LayoutMode[]).map(m => (
              <button
                key={m}
                style={{ ...segBtn, ...(layout === m ? segBtnActive : {}) }}
                onClick={() => setLayout(m)}
              >
                {m === 'force' ? '⬡ Force' : '⏱ Timeline'}
              </button>
            ))}
          </div>

          {/* Color mode */}
          <div style={segmented}>
            {(['type', 'mood', 'recency', 'source'] as ColorMode[]).map(m => (
              <button
                key={m}
                style={{ ...segBtn, ...(colorMode === m ? segBtnActive : {}) }}
                onClick={() => setColorMode(m)}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {/* Filter panel toggle */}
          <button
            style={{ ...iconBtn, ...(filterPanel ? iconBtnActive : {}) }}
            onClick={() => setFilterPanel(f => !f)}
            title="Filters"
          >
            ⚙ Filters
          </button>

          {/* Reset view */}
          <button style={iconBtn} onClick={resetView} title="Reset view">
            ⊙ Reset
          </button>

          {/* Stats */}
          <div style={statsRow}>
            <StatPill label="Entries"  count={stats.entries}  color="#4299e1" />
            <StatPill label="Notes"    count={stats.notes}    color="#9f7aea" />
            <StatPill label="Tasks"    count={stats.tasks}    color="#48bb78" />
            <StatPill label="Keywords" count={stats.keywords} color="#ed8936" />
          </div>
        </div>

        {/* ── Main area ────────────────────────────────────────────────────── */}
        <div style={mainArea}>

          {/* Filter panel */}
          {filterPanel && (
            <aside style={filterAside}>
              <div style={filterTitle}>Filters</div>

              <div style={filterSection}>
                <div style={filterLabel}>Node types</div>
                {[
                  { label: 'Journal Entries', value: showEntries,  set: setShowEntries,  color: '#4299e1' },
                  { label: 'Notes',           value: showNotes,    set: setShowNotes,    color: '#9f7aea' },
                  { label: 'Tasks',           value: showTasks,    set: setShowTasks,    color: '#48bb78' },
                  { label: 'Voice',           value: showVoice,    set: setShowVoice,    color: '#38b2ac' },
                  { label: 'Keywords',        value: showKeywords, set: setShowKeywords, color: '#ed8936' },
                ].map(({ label, value, set, color }) => (
                  <label key={label} style={checkRow}>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={e => set(e.target.checked)}
                      style={{ accentColor: color }}
                    />
                    <span style={{ color: 'var(--fg-dim)', fontSize: '13px' }}>{label}</span>
                  </label>
                ))}
              </div>

              <div style={filterSection}>
                <div style={filterLabel}>Mood range (entries)</div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={moodVal}>{moodMin}</span>
                  <input type="range" min={0} max={100} value={moodMin}
                    onChange={e => setMoodMin(+e.target.value)} style={rangeInput} />
                  <input type="range" min={0} max={100} value={moodMax}
                    onChange={e => setMoodMax(+e.target.value)} style={rangeInput} />
                  <span style={moodVal}>{moodMax}</span>
                </div>
              </div>

              <div style={filterSection}>
                <div style={filterLabel}>Legend</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {[
                    { shape: '●', color: '#4299e1', label: 'Journal entry' },
                    { shape: '■', color: '#9f7aea', label: 'Note page' },
                    { shape: '◆', color: '#48bb78', label: 'Task (done)' },
                    { shape: '◆', color: '#e53e3e', label: 'Task (high priority)' },
                    { shape: '●', color: '#38b2ac', label: 'Voice entry' },
                    { shape: '●', color: '#ed8936', label: 'Keyword cluster' },
                  ].map(({ shape, color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '12px', color: 'var(--fg-dim)' }}>
                      <span style={{ color, fontSize: '14px' }}>{shape}</span>
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {layout === 'timeline' && (
                <div style={{ ...filterSection, background: 'rgba(66,153,225,0.08)', borderRadius: 'var(--radius-md)', padding: '0.75rem', border: '1px solid rgba(66,153,225,0.2)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--fg-dim)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--fg)' }}>Timeline mode</strong><br />
                    X axis = date · Y axis = mood score<br />
                    Each entry is a point in your mental state over time.
                  </div>
                </div>
              )}
            </aside>
          )}

          {/* Graph canvas */}
          <div ref={containerRef} style={canvasWrap}>
            {loading ? (
              <div style={centerMsg}>
                <div className="spinner" />
                <span style={{ color: 'var(--muted)', marginTop: '1rem' }}>Loading your mind map…</span>
              </div>
            ) : error ? (
              <div style={centerMsg}>
                <span style={{ color: 'var(--danger)' }}>{error}</span>
              </div>
            ) : filteredData.nodes.length === 0 ? (
              <div style={centerMsg}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🕸</div>
                <div style={{ color: 'var(--fg)', fontWeight: 600 }}>No nodes to show</div>
                <div style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '0.25rem' }}>
                  Adjust filters or write some entries and notes first.
                </div>
              </div>
            ) : (
              <ForceGraph2D
                ref={graphRef}
                graphData={filteredData}
                width={dimensions.width}
                height={dimensions.height}
                backgroundColor="#0d0d0d"
                nodeCanvasObject={paintNode}
                nodeCanvasObjectMode={() => 'replace'}
                nodeRelSize={6}
                linkColor={linkColor as any}
                linkWidth={(l: any) => l.type === 'extracted' ? 1.5 : 0.75}
                linkDirectionalParticles={(l: any) => l.type === 'extracted' ? 2 : 0}
                linkDirectionalParticleWidth={1.5}
                linkDirectionalParticleColor={(l: any) => linkColor(l as any)}
                onNodeHover={handleNodeHover as any}
                onNodeClick={handleNodeClick as any}
                onNodeRightClick={handleNodeRightClick as any}
                onBackgroundClick={handleBgClick}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
                cooldownTicks={layout === 'timeline' ? 0 : 100}
                nodeLabel={() => ''}
                enableZoomInteraction
                enablePanInteraction
              />
            )}

            {/* Hover preview card */}
            {hoveredNode && !selectedNode && (
              <NodeCard node={hoveredNode} style={hoverCard} />
            )}

            {/* Timeline axis labels */}
            {layout === 'timeline' && !loading && filteredData.nodes.length > 0 && (
              <div style={timelineHint}>
                <span>← Older</span>
                <span style={{ color: 'var(--muted)', fontSize: '11px' }}>
                  X = Date · Y = Mood (0–100)
                </span>
                <span>Newer →</span>
              </div>
            )}
          </div>

          {/* Selected node detail panel */}
          {selectedNode && (
            <aside style={detailPanel}>
              <button style={closeBtn} onClick={() => setSelectedNode(null)}>×</button>
              <NodeDetail node={selectedNode} onNavigate={(path) => router.push(path)} />
            </aside>
          )}
        </div>
      </div>

      <style>{`
        .spinner {
          width: 32px; height: 32px;
          border: 2px solid var(--border);
          border-top-color: var(--accent-bright);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type=range] { accent-color: var(--accent-bright); }
      `}</style>
    </>
  );
}

// ─── Node Card (hover + detail) ───────────────────────────────────────────────

function NodeCard({ node, style }: { node: GraphNode; style?: React.CSSProperties }) {
  const typeLabel: Record<string, string> = {
    entry: 'Journal Entry', note: 'Note', task: 'Task',
    voice: 'Voice Entry', keyword: 'Keyword',
  };
  const dateStr = node.createdAt
    ? new Date(node.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div style={{ ...nodeCardBase, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>
          {typeLabel[node.type] || node.type}
        </span>
        {node.mood !== undefined && (
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: moodColor(node.mood), fontWeight: 700 }}>
            Mood {node.mood}
          </span>
        )}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)', marginBottom: '0.375rem', lineHeight: 1.3 }}>
        {node.label}
      </div>
      {dateStr && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{dateStr}</div>}
      {node.type === 'keyword' && (
        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '0.25rem' }}>
          Appears in {node.frequency} items
        </div>
      )}
      {node.type === 'task' && (
        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '0.25rem', display: 'flex', gap: '0.5rem' }}>
          <span style={{ color: node.status === 'done' ? '#38a169' : '#d69e2e' }}>
            {node.status === 'done' ? '✓ Done' : '○ Todo'}
          </span>
          <span>· {node.priority} priority</span>
        </div>
      )}
      {node.type === 'voice' && node.hasTranscript && (
        <div style={{ fontSize: '11px', color: '#38b2ac', marginTop: '0.25rem' }}>✓ Transcribed</div>
      )}
    </div>
  );
}

function NodeDetail({ node, onNavigate }: { node: GraphNode; onNavigate: (p: string) => void }) {
  const typeLabel: Record<string, string> = {
    entry: 'Journal Entry', note: 'Note', task: 'Task',
    voice: 'Voice Entry', keyword: 'Keyword',
  };
  const navTarget: Partial<Record<string, string>> = {
    entry: '/', note: '/notes', task: '/tasks', voice: '/voice',
  };

  return (
    <div style={detailInner}>
      <div style={detailType}>{typeLabel[node.type] || node.type}</div>
      <div style={detailTitle}>{node.label}</div>

      {node.createdAt && (
        <div style={detailMeta}>
          {new Date(node.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      )}

      <div style={detailGrid}>
        {node.mood !== undefined && <DetailStat label="Mood" value={`${node.mood}/100`} color={moodColor(node.mood)} />}
        {node.wordCount !== undefined && node.wordCount > 0 && <DetailStat label="Words" value={String(node.wordCount)} />}
        {node.blockCount !== undefined && <DetailStat label="Blocks" value={String(node.blockCount)} />}
        {node.status && <DetailStat label="Status" value={node.status === 'done' ? '✓ Done' : '○ Open'} color={node.status === 'done' ? '#38a169' : '#d69e2e'} />}
        {node.priority && <DetailStat label="Priority" value={node.priority} />}
        {node.frequency && <DetailStat label="Frequency" value={`${node.frequency} items`} />}
        {node.source && <DetailStat label="Source" value={node.source} />}
        {node.isEncrypted && <DetailStat label="Encrypted" value="Yes" color="#9f7aea" />}
      </div>

      {navTarget[node.type] && (
        <button style={navBtn} onClick={() => onNavigate(navTarget[node.type]!)}>
          Open in {typeLabel[node.type]} →
        </button>
      )}
    </div>
  );
}

function DetailStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={detailStatBox}>
      <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: color || 'var(--fg)', marginTop: '2px' }}>{value}</div>
    </div>
  );
}

function StatPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block' }} />
      {count} {label}
    </span>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const pageWrap: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: 'calc(100vh - 56px)',
  overflow: 'hidden',
  background: '#0d0d0d',
};

const toolbar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.625rem',
  padding: '0.625rem 1rem',
  borderBottom: '1px solid #1e1e1e',
  background: '#111',
  flexWrap: 'wrap',
  flexShrink: 0,
};

const searchInput: React.CSSProperties = {
  background: '#1a1a1a',
  border: '1px solid #2a2a2a',
  borderRadius: '6px',
  color: '#f5f5f5',
  fontSize: '13px',
  padding: '0.375rem 0.75rem',
  outline: 'none',
  fontFamily: 'inherit',
  width: '180px',
};

const segmented: React.CSSProperties = {
  display: 'flex',
  background: '#1a1a1a',
  border: '1px solid #2a2a2a',
  borderRadius: '6px',
  overflow: 'hidden',
};

const segBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#666',
  fontSize: '12px',
  padding: '0.375rem 0.625rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s ease',
  whiteSpace: 'nowrap',
};

const segBtnActive: React.CSSProperties = {
  background: '#2a2a2a',
  color: '#f5f5f5',
};

const iconBtn: React.CSSProperties = {
  background: '#1a1a1a',
  border: '1px solid #2a2a2a',
  borderRadius: '6px',
  color: '#666',
  fontSize: '12px',
  padding: '0.375rem 0.625rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s ease',
  whiteSpace: 'nowrap',
};

const iconBtnActive: React.CSSProperties = {
  background: '#2a2a2a',
  color: '#f5f5f5',
  borderColor: '#3a3a3a',
};

const statsRow: React.CSSProperties = {
  display: 'flex',
  gap: '0.875rem',
  marginLeft: 'auto',
  flexWrap: 'wrap',
};

const mainArea: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
  position: 'relative',
};

const filterAside: React.CSSProperties = {
  width: '220px',
  flexShrink: 0,
  background: '#111',
  borderRight: '1px solid #1e1e1e',
  overflowY: 'auto',
  padding: '1rem 0.875rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const filterTitle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#666',
};

const filterSection: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const filterLabel: React.CSSProperties = {
  fontSize: '11px',
  color: '#666',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  fontWeight: 600,
};

const checkRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  cursor: 'pointer',
};

const moodVal: React.CSSProperties = {
  fontSize: '11px',
  color: '#666',
  minWidth: '24px',
};

const rangeInput: React.CSSProperties = {
  flex: 1,
  height: '4px',
};

const canvasWrap: React.CSSProperties = {
  flex: 1,
  position: 'relative',
  overflow: 'hidden',
};

const centerMsg: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};

const hoverCard: React.CSSProperties = {
  position: 'absolute',
  top: '1rem',
  right: '1rem',
  pointerEvents: 'none',
};

const nodeCardBase: React.CSSProperties = {
  background: 'rgba(20,20,20,0.95)',
  border: '1px solid #2a2a2a',
  borderRadius: '10px',
  padding: '0.875rem 1rem',
  minWidth: '180px',
  maxWidth: '240px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  backdropFilter: 'blur(8px)',
};

const detailPanel: React.CSSProperties = {
  width: '280px',
  flexShrink: 0,
  background: '#111',
  borderLeft: '1px solid #1e1e1e',
  overflowY: 'auto',
  position: 'relative',
};

const closeBtn: React.CSSProperties = {
  position: 'absolute',
  top: '0.75rem',
  right: '0.75rem',
  background: 'transparent',
  border: '1px solid #2a2a2a',
  color: '#666',
  width: '26px',
  height: '26px',
  borderRadius: '50%',
  cursor: 'pointer',
  fontSize: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
  padding: 0,
};

const detailInner: React.CSSProperties = {
  padding: '1.5rem 1rem 2rem',
};

const detailType: React.CSSProperties = {
  fontSize: '10px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#666',
  fontWeight: 700,
  marginBottom: '0.5rem',
};

const detailTitle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 700,
  color: '#f5f5f5',
  lineHeight: 1.3,
  marginBottom: '0.5rem',
};

const detailMeta: React.CSSProperties = {
  fontSize: '12px',
  color: '#666',
  marginBottom: '1rem',
};

const detailGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.5rem',
  marginBottom: '1.25rem',
};

const detailStatBox: React.CSSProperties = {
  background: '#1a1a1a',
  borderRadius: '6px',
  padding: '0.5rem 0.625rem',
};

const navBtn: React.CSSProperties = {
  background: '#3182ce',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  padding: '0.625rem 1rem',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  width: '100%',
  textAlign: 'center',
};

const timelineHint: React.CSSProperties = {
  position: 'absolute',
  bottom: '1rem',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: '2rem',
  fontSize: '11px',
  color: '#666',
  pointerEvents: 'none',
  background: 'rgba(0,0,0,0.6)',
  padding: '0.375rem 1rem',
  borderRadius: '20px',
};
