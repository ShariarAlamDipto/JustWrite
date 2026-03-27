import React, { useState, useEffect, useRef } from 'react'
import type { GraphNode, GraphEdge, Pattern, Backlink, Segment } from '@/lib/jw-types'

interface ConnectViewProps {
  isDark: boolean
  nodes: GraphNode[]
  edges: GraphEdge[]
  patterns: Pattern[]
  backlinks: Backlink[]
  onNodeClick: (id: string, segment: Segment) => void
}

type Section = 'related' | 'patterns' | 'map'

const SEGMENT_COLOR: Record<Segment, string> = {
  journal: '#3182ce',
  ideas: '#4299e1',
  notes: '#63b3ed',
}

// ── Force-directed graph (simple spring layout) ────────────────────────────────

interface LayoutNode extends GraphNode {
  vx: number
  vy: number
}

function useGraphLayout(nodes: GraphNode[], edges: GraphEdge[], width: number, height: number) {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})

  useEffect(() => {
    if (!nodes.length) return

    const layoutNodes: LayoutNode[] = nodes.map((n, i) => ({
      ...n,
      vx: 0, vy: 0,
      x: n.x ?? width / 2 + Math.cos((i / nodes.length) * Math.PI * 2) * 120,
      y: n.y ?? height / 2 + Math.sin((i / nodes.length) * Math.PI * 2) * 120,
    }))

    const edgeMap = new Map<string, string[]>()
    for (const e of edges) {
      if (!edgeMap.has(e.source)) edgeMap.set(e.source, [])
      if (!edgeMap.has(e.target)) edgeMap.set(e.target, [])
      edgeMap.get(e.source)!.push(e.target)
      edgeMap.get(e.target)!.push(e.source)
    }

    const REPEL = 3000
    const ATTRACT = 0.04
    const DAMPEN = 0.88
    const STEPS = 80

    for (let step = 0; step < STEPS; step++) {
      // Repulsion between all node pairs
      for (let i = 0; i < layoutNodes.length; i++) {
        for (let j = i + 1; j < layoutNodes.length; j++) {
          const a = layoutNodes[i]
          const b = layoutNodes[j]
          const dx = (b.x ?? 0) - (a.x ?? 0)
          const dy = (b.y ?? 0) - (a.y ?? 0)
          const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
          const force = REPEL / (dist * dist)
          a.vx -= (dx / dist) * force
          a.vy -= (dy / dist) * force
          b.vx += (dx / dist) * force
          b.vy += (dy / dist) * force
        }
      }

      // Attraction along edges
      for (const e of edges) {
        const a = layoutNodes.find((n) => n.id === e.source)
        const b = layoutNodes.find((n) => n.id === e.target)
        if (!a || !b) continue
        const dx = (b.x ?? 0) - (a.x ?? 0)
        const dy = (b.y ?? 0) - (a.y ?? 0)
        a.vx += dx * ATTRACT
        a.vy += dy * ATTRACT
        b.vx -= dx * ATTRACT
        b.vy -= dy * ATTRACT
      }

      // Integrate + center attraction + dampen
      for (const n of layoutNodes) {
        n.vx += (width / 2 - (n.x ?? 0)) * 0.005
        n.vy += (height / 2 - (n.y ?? 0)) * 0.005
        n.vx *= DAMPEN
        n.vy *= DAMPEN
        n.x = (n.x ?? 0) + n.vx
        n.y = (n.y ?? 0) + n.vy
        // Keep within bounds
        n.x = Math.max(24, Math.min(width - 24, n.x ?? 0))
        n.y = Math.max(24, Math.min(height - 24, n.y ?? 0))
      }
    }

    const result: Record<string, { x: number; y: number }> = {}
    for (const n of layoutNodes) result[n.id] = { x: n.x ?? 0, y: n.y ?? 0 }
    setPositions(result)
  }, [nodes, edges, width, height])

  return positions
}

// ── Graph Map view ─────────────────────────────────────────────────────────────

function GraphMap({ nodes, edges, isDark, onNodeClick }: {
  nodes: GraphNode[]
  edges: GraphEdge[]
  isDark: boolean
  onNodeClick: (id: string, segment: Segment) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ width: 320, height: 400 })
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDims({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }
    update()
    const ro = new ResizeObserver(update)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const positions = useGraphLayout(nodes, edges, dims.width, dims.height)

  if (!nodes.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
             stroke={isDark ? '#4A4A4A' : '#C8C5C0'} strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="3"/>
          <circle cx="4" cy="6" r="2"/>
          <circle cx="20" cy="6" r="2"/>
          <circle cx="4" cy="18" r="2"/>
          <circle cx="20" cy="18" r="2"/>
          <line x1="6" y1="7" x2="10" y2="10"/>
          <line x1="18" y1="7" x2="14" y2="10"/>
          <line x1="6" y1="17" x2="10" y2="14"/>
          <line x1="18" y1="17" x2="14" y2="14"/>
        </svg>
        <p className="text-sm" style={{ color: isDark ? '#636060' : '#9E9B96' }}>
          Connect notes and ideas to see the map
        </p>
      </div>
    )
  }

  const nodeRadius = (n: GraphNode) => Math.max(8, Math.min(20, 8 + n.degree * 2))

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: '420px' }}>
      <svg width={dims.width} height={dims.height} className="absolute inset-0">
        {/* Edges */}
        {edges.map((e, i) => {
          const a = positions[e.source]
          const b = positions[e.target]
          if (!a || !b) return null
          return (
            <line
              key={i}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}
              strokeWidth={e.type === 'link' ? 1.5 : 1}
              strokeDasharray={e.type === 'tag' ? '4 4' : undefined}
            />
          )
        })}
      </svg>

      {/* Nodes */}
      {nodes.map((node) => {
        const pos = positions[node.id]
        if (!pos) return null
        const r = nodeRadius(node)
        const color = SEGMENT_COLOR[node.segment]
        const isSelected = selected === node.id

        return (
          <button
            key={node.id}
            onClick={() => {
              setSelected(node.id)
              onNodeClick(node.id, node.segment)
            }}
            className="absolute transition-transform active:scale-90"
            style={{
              left: pos.x - r,
              top: pos.y - r,
              width: r * 2,
              height: r * 2,
              borderRadius: '50%',
              background: color,
              opacity: isSelected ? 1 : 0.7,
              boxShadow: isSelected
                ? `0 0 0 3px ${isDark ? '#0d0d0d' : '#fafafa'}, 0 0 0 5px ${color}`
                : 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            title={node.title}
          />
        )
      })}

      {/* Selected label */}
      {selected && (() => {
        const node = nodes.find((n) => n.id === selected)
        const pos = positions[selected]
        if (!node || !pos) return null
        return (
          <div
            className="absolute pointer-events-none px-2 py-1 rounded-lg text-xs font-medium"
            style={{
              left: pos.x + 14,
              top: pos.y - 10,
              background: isDark ? '#1C1C1C' : '#FFFFFF',
              border: `1px solid ${isDark ? '#2E2E2E' : '#E8E5DF'}`,
              color: isDark ? '#D8D5CF' : '#2A2824',
              maxWidth: '120px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {node.title || 'Untitled'}
          </div>
        )
      })()}
    </div>
  )
}

// ── Main ConnectView ──────────────────────────────────────────────────────────

export default function ConnectView({
  isDark, nodes, edges, patterns, backlinks, onNodeClick,
}: ConnectViewProps) {
  const [section, setSection] = useState<Section>('related')

  const tabs: { id: Section; label: string }[] = [
    { id: 'related', label: 'Related' },
    { id: 'patterns', label: 'Patterns' },
    { id: 'map', label: 'Map' },
  ]

  return (
    <div
      className="flex flex-col min-h-dvh"
      style={{ background: isDark ? '#0d0d0d' : '#fafafa' }}
    >
      {/* Section tabs */}
      <div
        className="flex gap-1 px-4 pt-4 pb-2"
        style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSection(tab.id)}
            className="px-4 py-1.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: section === tab.id
                ? (isDark ? 'rgba(49,130,206,0.15)' : 'rgba(49,130,206,0.1)')
                : 'transparent',
              color: section === tab.id
                ? '#3182ce'
                : (isDark ? '#636060' : '#9E9B96'),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Related ────────────────────────────────────────────────────────── */}
      {section === 'related' && (
        <div className="flex-1 px-4 py-4 space-y-3">
          {backlinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                   stroke={isDark ? '#4A4A4A' : '#C8C5C0'} strokeWidth="1.5" strokeLinecap="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <p className="text-sm text-center" style={{ color: isDark ? '#636060' : '#9E9B96' }}>
                Use [[note title]] in your notes<br/>to create connections
              </p>
            </div>
          ) : (
            backlinks.map((bl) => (
              <button
                key={bl.noteId}
                onClick={() => onNodeClick(bl.noteId, 'notes')}
                className="w-full text-left jw-card px-4 py-3 jw-card-press"
              >
                <p
                  className="font-medium text-sm mb-1"
                  style={{ color: isDark ? '#F2F0EB' : '#1A1A1A' }}
                >
                  {bl.noteTitle}
                </p>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: isDark ? '#7A7774' : '#8A8680' }}
                >
                  {bl.excerpt}
                </p>
              </button>
            ))
          )}
        </div>
      )}

      {/* ── Patterns ───────────────────────────────────────────────────────── */}
      {section === 'patterns' && (
        <div className="flex-1 px-4 py-4 space-y-2">
          {patterns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                   stroke={isDark ? '#4A4A4A' : '#C8C5C0'} strokeWidth="1.5" strokeLinecap="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
              <p className="text-sm" style={{ color: isDark ? '#636060' : '#9E9B96' }}>
                Add tags to your writing to see patterns
              </p>
            </div>
          ) : (
            patterns.map((p) => {
              const barMax = Math.max(...patterns.map((x) => x.count))
              const barPct = (p.count / barMax) * 100

              return (
                <button
                  key={p.tag}
                  onClick={() => onNodeClick(p.representative.id, p.representative.segment)}
                  className="w-full text-left px-4 py-3 rounded-2xl transition-all active:scale-[0.99]"
                  style={{
                    background: isDark ? '#1C1C1C' : '#FFFFFF',
                    border: `1px solid ${isDark ? '#2E2E2E' : '#E8E5DF'}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-sm font-medium"
                      style={{ color: isDark ? '#D8D5CF' : '#2A2824' }}
                    >
                      #{p.tag}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: isDark ? '#636060' : '#9E9B96' }}
                    >
                      {p.count} {p.count === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                  {/* Bar */}
                  <div
                    className="h-1 rounded-full overflow-hidden"
                    style={{ background: isDark ? '#2A2A2A' : '#F0EDE8' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barPct}%`,
                        background: SEGMENT_COLOR[p.representative.segment],
                        opacity: 0.7,
                      }}
                    />
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}

      {/* ── Map ────────────────────────────────────────────────────────────── */}
      {section === 'map' && (
        <div className="flex-1 px-4 py-4">
          {/* Legend */}
          <div className="flex gap-3 mb-4">
            {(Object.entries(SEGMENT_COLOR) as [Segment, string][]).map(([seg, color]) => (
              <div key={seg} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: color }}
                />
                <span className="text-xs capitalize" style={{ color: isDark ? '#636060' : '#9E9B96' }}>
                  {seg}
                </span>
              </div>
            ))}
          </div>

          <GraphMap
            nodes={nodes}
            edges={edges}
            isDark={isDark}
            onNodeClick={onNodeClick}
          />

          <p
            className="text-xs text-center mt-3"
            style={{ color: isDark ? '#4A4A4A' : '#C8C5C0' }}
          >
            {nodes.length} nodes · {edges.length} connections
          </p>
        </div>
      )}
    </div>
  )
}
