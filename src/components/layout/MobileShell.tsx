import React, { useState } from 'react'
import { useRouter } from 'next/router'
import BottomNav from './BottomNav'
import GlobalFAB from '@/components/creation/GlobalFAB'
import CreationSheet from '@/components/creation/CreationSheet'
import type { TabId, CreationTarget } from '@/lib/jw-types'

interface MobileShellProps {
  children: React.ReactNode
  activeTab: TabId
  isDark: boolean
}

export default function MobileShell({ children, activeTab, isDark }: MobileShellProps) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleTabChange = (tab: TabId) => {
    router.push(`/${tab === 'journal' ? '' : tab}`)
  }

  const handleCreate = (target: CreationTarget) => {
    setSheetOpen(false)
    switch (target.type) {
      case 'journal':      router.push('/journal?new=1'); break
      case 'idea':         router.push('/ideas?new=1'); break
      case 'note':         router.push('/notes?new=1'); break
      case 'record-idea':  router.push('/ideas?new=1&voice=1'); break
      case 'record-note':  router.push('/notes?new=1&voice=1'); break
    }
  }

  return (
    <div
      className="relative flex flex-col min-h-dvh overflow-hidden select-none"
      style={{ background: isDark ? '#0d0d0d' : '#fafafa' }}
    >
      {/* Main content — scrolls behind fixed nav */}
      <main className="flex-1 overflow-y-auto overscroll-contain" style={{ paddingBottom: '72px' }}>
        {children}
      </main>

      {/* Bottom navigation */}
      <BottomNav activeTab={activeTab} onChange={handleTabChange} isDark={isDark} />

      {/* Global floating action button */}
      <GlobalFAB onTap={() => setSheetOpen(true)} isDark={isDark} sheetOpen={sheetOpen} />

      {/* Creation sheet */}
      {sheetOpen && (
        <CreationSheet
          isDark={isDark}
          onSelect={handleCreate}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  )
}
