"use client"

import { useState, useSyncExternalStore, useCallback } from "react"
import { cn } from "@/lib/utils"

// Global tab state store — shared between ContentTabs and sibling ContentTab elements.
// This is needed because MDX compilation doesn't preserve parent-child nesting,
// so ContentTab elements end up as siblings rather than children of ContentTabs.
const tabStores = new Map<string, { active: string; listeners: Set<() => void> }>()
let storeCounter = 0

function getOrCreateStore(defaultTab: string) {
  const id = `tabs-${++storeCounter}`
  tabStores.set(id, { active: defaultTab, listeners: new Set() })
  return id
}

function getActiveTab(storeId: string): string {
  return tabStores.get(storeId)?.active ?? ""
}

function setActiveTab(storeId: string, label: string) {
  const store = tabStores.get(storeId)
  if (!store) return
  store.active = label
  store.listeners.forEach((fn) => fn())
}

function subscribe(storeId: string, callback: () => void) {
  const store = tabStores.get(storeId)
  if (!store) return () => {}
  store.listeners.add(callback)
  return () => store.listeners.delete(callback)
}

// Module-level "current tabs group" — set by the most recently rendered ContentTabs,
// read by ContentTab elements that follow it in the render tree.
let currentTabsStoreId = ""

export function ContentTabs({
  defaultTab,
  tabLabels: tabLabelsJson,
  children,
}: {
  defaultTab?: string
  tabLabels?: string
  children: React.ReactNode
}) {
  const labels: string[] = tabLabelsJson ? JSON.parse(tabLabelsJson) : []
  const [storeId] = useState(() => {
    const id = getOrCreateStore(defaultTab ?? labels[0] ?? "")
    currentTabsStoreId = id
    return id
  })

  // Keep currentTabsStoreId updated on each render
  currentTabsStoreId = storeId

  const active = useSyncExternalStore(
    useCallback((cb: () => void) => subscribe(storeId, cb), [storeId]),
    () => getActiveTab(storeId),
    () => defaultTab ?? labels[0] ?? ""
  )

  if (labels.length === 0) return <>{children}</>

  return (
    <div className="my-6 overflow-hidden rounded-lg border border-border">
      <div className="flex overflow-x-auto border-b border-border bg-muted/30">
        {labels.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => setActiveTab(storeId, label)}
            className={cn(
              "flex-1 whitespace-nowrap px-4 py-2.5 text-[13px] font-medium transition-all",
              "border-b-2 border-transparent",
              active === label
                ? "border-b-primary text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  )
}

export function ContentTab({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  // Capture the current tabs group at first render
  const [storeId] = useState(() => currentTabsStoreId)

  const isActive = useSyncExternalStore(
    useCallback((cb: () => void) => subscribe(storeId, cb), [storeId]),
    () => getActiveTab(storeId) === label,
    () => true // SSR: show all tabs
  )

  return (
    <div
      className={cn(
        isActive ? "block" : "hidden",
        "prose prose-sm prose-zinc dark:prose-invert max-w-none",
        "prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-p:text-muted-foreground prose-li:text-muted-foreground",
        "prose-strong:text-foreground prose-a:text-primary",
        "prose-h3:first:mt-0 prose-p:first:mt-0"
      )}
    >
      {children}
    </div>
  )
}
