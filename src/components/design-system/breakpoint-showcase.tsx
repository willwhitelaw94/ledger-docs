"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  MonitorIcon,
  TabletIcon,
  SmartphoneIcon,
  MonitorSmartphoneIcon,
} from "lucide-react"

const breakpoints = [
  { name: "sm", value: "640px", icon: SmartphoneIcon, desc: "Mobile landscape" },
  { name: "md", value: "768px", icon: TabletIcon, desc: "Tablet portrait" },
  { name: "lg", value: "1024px", icon: TabletIcon, desc: "Tablet landscape / small desktop" },
  { name: "xl", value: "1280px", icon: MonitorIcon, desc: "Desktop" },
  { name: "2xl", value: "1536px", icon: MonitorSmartphoneIcon, desc: "Wide desktop" },
]

const responsivePatterns = [
  {
    name: "Sidebar Layout",
    classes: "hidden lg:block",
    desc: "Sidebar hidden on mobile, visible on desktop",
  },
  {
    name: "Card Grid",
    classes: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    desc: "1 column → 2 columns → 3 columns",
  },
  {
    name: "Table → Cards",
    classes: "hidden md:table / md:hidden",
    desc: "Cards on mobile, table on tablet+",
  },
  {
    name: "Navigation",
    classes: "md:hidden / hidden md:flex",
    desc: "Hamburger on mobile, nav bar on desktop",
  },
  {
    name: "Typography",
    classes: "text-2xl md:text-3xl lg:text-4xl",
    desc: "Progressive type scaling",
  },
  {
    name: "Padding",
    classes: "px-4 sm:px-6 lg:px-10",
    desc: "Tighter on mobile, spacious on desktop",
  },
  {
    name: "Modal Width",
    classes: "w-full sm:max-w-md lg:max-w-lg",
    desc: "Full-width mobile, constrained desktop",
  },
  {
    name: "Flex Direction",
    classes: "flex-col sm:flex-row",
    desc: "Stack on mobile, row on tablet+",
  },
]

export function BreakpointShowcase() {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const update = () => setWidth(window.innerWidth)
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const activeBreakpoint =
    width >= 1536
      ? "2xl"
      : width >= 1280
        ? "xl"
        : width >= 1024
          ? "lg"
          : width >= 768
            ? "md"
            : width >= 640
              ? "sm"
              : "base"

  return (
    <div className="space-y-10">
      {/* Current Viewport */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Current Viewport</h3>
        <p className="text-sm text-muted-foreground mb-4">Resize your browser to see breakpoints change.</p>
        <div className="rounded-lg border p-6 bg-muted/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-3xl font-bold tabular-nums">{width}px</p>
              <p className="text-sm text-muted-foreground">
                Active breakpoint: <span className="font-mono text-primary font-semibold">{activeBreakpoint}</span>
              </p>
            </div>
          </div>

          {/* Visual ruler */}
          <div className="relative h-10 rounded-md bg-muted overflow-hidden">
            {breakpoints.map((bp) => {
              const pos = (parseInt(bp.value) / 1920) * 100
              return (
                <div
                  key={bp.name}
                  className="absolute top-0 h-full border-l border-dashed border-muted-foreground/30"
                  style={{ left: `${pos}%` }}
                >
                  <span className="absolute -top-0.5 left-1 text-[9px] font-mono text-muted-foreground">
                    {bp.name}
                  </span>
                </div>
              )
            })}
            <div
              className="absolute top-0 h-full bg-primary/20 transition-all duration-200"
              style={{ width: `${Math.min(100, (width / 1920) * 100)}%` }}
            >
              <div className="absolute right-0 top-0 h-full w-0.5 bg-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Breakpoint Reference */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Breakpoint Reference</h3>
        <p className="text-sm text-muted-foreground mb-4">Mobile-first — styles apply at the breakpoint and above.</p>
        <div className="space-y-0 divide-y rounded-lg border overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-2.5 bg-muted/30">
            <span className="w-12 text-xs font-medium text-muted-foreground">base</span>
            <span className="w-16 text-xs font-mono text-muted-foreground">0px</span>
            <span className="flex-1 text-xs text-muted-foreground">All devices (default)</span>
            <span className={cn("size-2 rounded-full", activeBreakpoint === "base" ? "bg-primary" : "bg-muted-foreground/20")} />
          </div>
          {breakpoints.map((bp) => {
            const BpIcon = bp.icon
            const isActive = width >= parseInt(bp.value)
            return (
              <div
                key={bp.name}
                className={cn(
                  "flex items-center gap-4 px-4 py-2.5 transition-colors",
                  isActive && "bg-primary/5"
                )}
              >
                <span className="w-12 text-xs font-mono font-semibold text-primary">{bp.name}</span>
                <span className="w-16 text-xs font-mono text-muted-foreground tabular-nums">{bp.value}</span>
                <BpIcon className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground/40")} />
                <span className="flex-1 text-xs text-muted-foreground">{bp.desc}</span>
                <span className={cn("size-2 rounded-full", isActive ? "bg-primary" : "bg-muted-foreground/20")} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Responsive Patterns */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Common Responsive Patterns</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {responsivePatterns.map((p) => (
            <div key={p.name} className="rounded-lg border p-4 hover:bg-muted/30 transition-colors">
              <p className="text-sm font-medium mb-1">{p.name}</p>
              <p className="text-xs font-mono text-primary mb-1">{p.classes}</p>
              <p className="text-xs text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
