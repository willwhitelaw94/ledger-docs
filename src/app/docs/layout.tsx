import type { CSSProperties, ReactNode } from 'react'
import { getNavTree } from '@/lib/docs'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { TcLogo } from '@/components/tc-logo'
import { DocsSidebarNav } from './docs-sidebar'
import { DocsHeader } from './docs-header'

export default function DocsLayout({ children }: { children: ReactNode }) {
  const navTree = getNavTree()

  return (
    <div className="flex min-h-dvh w-full">
      <SidebarProvider
        defaultOpen
        style={{ '--sidebar-width': '15rem' } as CSSProperties}
      >
        <Sidebar collapsible="icon" className="[&_[data-slot=sidebar-inner]]:bg-card">
          <SidebarHeader className="h-14 flex-row items-center border-b px-3">
            <a href="/" className="flex items-center gap-2.5 overflow-hidden">
              <TcLogo size="sm" className="shrink-0" />
              <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-semibold truncate">TC-Docs</span>
                <span className="text-muted-foreground text-[11px] truncate">Documentation</span>
              </div>
            </a>
          </SidebarHeader>

          <SidebarContent>
            <DocsSidebarNav navTree={navTree} />
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-1 flex-col">
          <DocsHeader />

          <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
            <div className="mx-auto max-w-4xl">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </div>
  )
}
