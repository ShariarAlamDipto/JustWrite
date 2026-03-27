import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import MobileShell from '@/components/layout/MobileShell'
import ConnectView from '@/components/connect/ConnectView'
import { useAuth } from '@/lib/useAuth'
import { useTheme } from '@/lib/ThemeContext'
import type { GraphNode, GraphEdge, Pattern, Backlink, Segment } from '@/lib/jw-types'

interface ConnectData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  patterns: Pattern[]
  backlinks: Backlink[]
}

export default function ConnectPage() {
  const { user, token } = useAuth()
  const { isDark } = useTheme()
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

        // Build patterns from tag counts
        const tagMap = new Map<string, { count: number; lastSeen: string; rep: any }>()
        for (const e of entries) {
          for (const tag of e.tags ?? []) {
            const existing = tagMap.get(tag)
            if (!existing || e.createdAt > existing.lastSeen) {
              tagMap.set(tag, {
                count: (existing?.count ?? 0) + 1,
                lastSeen: e.createdAt,
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
              title: v.rep.title ?? v.rep.body?.slice(0, 40) ?? 'Untitled',
              segment: (v.rep.type ?? 'journal') as Segment,
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
    <MobileShell activeTab="connect" isDark={isDark}>
      <div className="pt-5 px-4 mb-2">
        <h1
          className="text-2xl font-bold"
          style={{ color: isDark ? '#F2F0EB' : '#1A1A1A', letterSpacing: '-0.025em' }}
        >
          Connect
        </h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#3182ce', borderTopColor: 'transparent' }}
          />
        </div>
      ) : (
        <ConnectView
          isDark={isDark}
          nodes={data.nodes}
          edges={data.edges}
          patterns={data.patterns}
          backlinks={data.backlinks}
          onNodeClick={handleNodeClick}
        />
      )}
    </MobileShell>
  )
}
