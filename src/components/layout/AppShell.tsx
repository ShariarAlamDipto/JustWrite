import React, { useState } from 'react'
import { Nav } from '@/components/Nav'
import BottomNav from './BottomNav'
import GlobalFAB from '@/components/creation/GlobalFAB'
import CreationSheet from '@/components/creation/CreationSheet'
import { useRouter } from 'next/router'
import type { TabId, CreationTarget } from '@/lib/jw-types'

interface AppShellProps {
  children: React.ReactNode
  activeTab: TabId
  isDark: boolean
}

export default function AppShell({ children, activeTab, isDark }: AppShellProps) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleTabChange = (tab: TabId) => {
    const routes: Record<TabId, string> = {
      journal: '/journal',
      ideas: '/ideas',
      notes: '/notes',
      connect: '/connect',
    }
    router.push(routes[tab])
  }

  const handleCreate = (target: CreationTarget) => {
    setSheetOpen(false)
    const map: Record<string, string> = {
      journal: '/journal?new=1',
      idea: '/ideas?new=1',
      note: '/notes?new=1',
      'record-idea': '/ideas?new=1&voice=1',
      'record-note': '/notes?new=1&voice=1',
    }
    router.push(map[target.type] ?? '/journal')
  }

  return (
    <>
      {/* Top nav — visible only on desktop (sm and above) */}
      <div className="hidden sm:block">
        <Nav />
      </div>

      {/* Page content */}
      <div
        className="sm:container"
        style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}
      >
        {children}
      </div>

      {/* Bottom nav — mobile only */}
      <div className="block sm:hidden">
        <BottomNav activeTab={activeTab} onChange={handleTabChange} isDark={isDark} />
        <GlobalFAB onTap={() => setSheetOpen(true)} isDark={isDark} sheetOpen={sheetOpen} />
        {sheetOpen && (
          <CreationSheet isDark={isDark} onSelect={handleCreate} onClose={() => setSheetOpen(false)} />
        )}
      </div>
    </>
  )
}
