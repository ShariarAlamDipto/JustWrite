import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Nav } from '@/components/Nav'
import ConnectView from '@/components/connect/ConnectView'
import { useAuth } from '@/lib/useAuth'
import type { GraphNode, GraphEdge, Pattern, Backlink, Segment } from '@/lib/jw-types'

interface ConnectData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  patterns: Pattern[]
  backlinks: Backlink[]
}

export default function ConnectPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<ConnectData>({
    nodes: [],
    edges: [],
    patterns: [],
    backlinks: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)

    // Fetch graph data from existing graph endpoint + derive patterns from entries
    Promise.all([
      fetch('/api/graph', {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.ok ? r.json() : { nodes: [], edges: [] }),
      fetch('/api/entries?limit=200', {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.ok ? r.json() : { entries: [] }),
    ])
      .then(([graphData, entriesData]) => {
        const entries: any[] = entriesData.entries ?? []

        // Build patterns from tag counts.
        // Raw entries are snake_case: created_at, content, no type field.
        const tagMap = new Map<string, { count: number; lastSeen: string; rep: any }>()
        for (const e of entries) {
          const createdAt = e.created_at ?? e.createdAt ?? ''
          for (const tag of e.tags ?? []) {
            const existing = tagMap.get(tag)
            if (!existing || createdAt > existing.lastSeen) {
              tagMap.set(tag, {
                count: (existing?.count ?? 0) + 1,
                lastSeen: createdAt,
                rep: e,
              })
            } else {
              existing.count += 1
            }
          }
        }

        const patterns: Pattern[] = Array.from(tagMap.entries())
          .map(([tag, v]) => ({
            tag,
            count: v.count,
            lastSeen: v.lastSeen,
            representative: {
              id: v.rep.id,
              title: v.rep.title ?? (v.rep.content ?? v.rep.body ?? '').slice(0, 40) ?? 'Untitled',
              segment: 'journal' as Segment,
            },
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20)

        // Map graph nodes to our type
        const nodes: GraphNode[] = (graphData.nodes ?? []).map((n: any) => ({
          id: n.id,
          title: n.title ?? n.label ?? 'Untitled',
          segment: (n.type ?? n.segment ?? 'notes') as Segment,
          degree: n.degree ?? 1,
        }))

        // API returns `links` not `edges`
        const edges: GraphEdge[] = (graphData.links ?? graphData.edges ?? []).map((e: any) => ({
          source: e.source,
          target: e.target,
          type: (e.type ?? 'link') as GraphEdge['type'],
        }))

        // Backlinks = edges where target is a note
        const backlinks: Backlink[] = edges
          .filter((e) => e.type === 'backlink')
          .map((e) => {
            const node = nodes.find((n) => n.id === e.source)
            return {
              noteId: e.source,
              noteTitle: node?.title ?? 'Untitled',
              excerpt: '',
            }
          })

        setData({ nodes, edges, patterns, backlinks })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, token])

  const handleNodeClick = (id: string, segment: Segment) => {
    switch (segment) {
      case 'journal': router.push(`/journal?id=${id}`); break
      case 'ideas':   router.push(`/ideas?id=${id}`); break
      case 'notes':   router.push(`/notes?id=${id}`); break
    }
  }

  return (
    <>
      <Nav />
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
        <header style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: 'var(--fg)', letterSpacing: '-0.02em' }}>
            Connect
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '0.375rem 0 0' }}>
            Discover patterns and connections across your writing
          </p>
        </header>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner" />
          </div>
        ) : (
          <ConnectView
            isDark={false}
            nodes={data.nodes}
            edges={data.edges}
            patterns={data.patterns}
            backlinks={data.backlinks}
            onNodeClick={handleNodeClick}
          />
        )}
      </main>
    </>
  )
}
