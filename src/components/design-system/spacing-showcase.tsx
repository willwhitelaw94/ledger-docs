"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

const spacingScale = [
  { name: "0", px: "0", rem: "0" },
  { name: "0.5", px: "2", rem: "0.125" },
  { name: "1", px: "4", rem: "0.25" },
  { name: "1.5", px: "6", rem: "0.375" },
  { name: "2", px: "8", rem: "0.5" },
  { name: "2.5", px: "10", rem: "0.625" },
  { name: "3", px: "12", rem: "0.75" },
  { name: "3.5", px: "14", rem: "0.875" },
  { name: "4", px: "16", rem: "1" },
  { name: "5", px: "20", rem: "1.25" },
  { name: "6", px: "24", rem: "1.5" },
  { name: "7", px: "28", rem: "1.75" },
  { name: "8", px: "32", rem: "2" },
  { name: "9", px: "36", rem: "2.25" },
  { name: "10", px: "40", rem: "2.5" },
  { name: "11", px: "44", rem: "2.75" },
  { name: "12", px: "48", rem: "3" },
  { name: "14", px: "56", rem: "3.5" },
  { name: "16", px: "64", rem: "4" },
  { name: "20", px: "80", rem: "5" },
  { name: "24", px: "96", rem: "6" },
  { name: "28", px: "112", rem: "7" },
  { name: "32", px: "128", rem: "8" },
  { name: "36", px: "144", rem: "9" },
  { name: "40", px: "160", rem: "10" },
  { name: "44", px: "176", rem: "11" },
  { name: "48", px: "192", rem: "12" },
]

const patterns = [
  { name: "Form field gap", value: "gap-2", px: "8px", desc: "Between label and input" },
  { name: "Form section gap", value: "gap-6", px: "24px", desc: "Between form groups" },
  { name: "Card padding", value: "p-4 / p-6", px: "16-24px", desc: "Internal card padding" },
  { name: "Section spacing", value: "py-10 / py-16", px: "40-64px", desc: "Between page sections" },
  { name: "Page inline padding", value: "px-4 sm:px-6", px: "16-24px", desc: "Responsive page padding" },
  { name: "Stack gap", value: "space-y-3", px: "12px", desc: "Vertical list/stack items" },
  { name: "Button gap", value: "gap-1.5", px: "6px", desc: "Icon + text inside buttons" },
  { name: "Badge padding", value: "px-2.5 py-0.5", px: "10/2px", desc: "Badge horizontal/vertical" },
]

const prefixes = ["p", "px", "py", "pt", "pr", "pb", "pl", "m", "mx", "my", "mt", "mr", "mb", "ml", "gap", "space-x", "space-y"]

export function SpacingShowcase() {
  const [selectedPrefix, setSelectedPrefix] = useState("p")
  const maxPx = 192

  return (
    <div className="space-y-10">
      {/* Spacing Scale */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Spacing Scale</h3>
        <p className="text-sm text-muted-foreground mb-4">Tailwind CSS spacing scale with visual representation.</p>
        <div className="space-y-0 divide-y rounded-lg border overflow-hidden">
          {spacingScale.map((s) => (
            <div key={s.name} className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 transition-colors group">
              <span className="w-10 shrink-0 text-xs font-mono text-primary tabular-nums text-right">{s.name}</span>
              <span className="w-12 shrink-0 text-[10px] font-mono text-muted-foreground tabular-nums">{s.px}px</span>
              <div className="flex-1 h-5 flex items-center">
                <div
                  className="h-3 rounded-sm bg-primary/20 border border-primary/30 transition-colors group-hover:bg-primary/40"
                  style={{ width: `${Math.max(2, (Number(s.px) / maxPx) * 100)}%` }}
                />
              </div>
              <span className="w-14 shrink-0 text-[10px] font-mono text-muted-foreground tabular-nums text-right">
                {s.rem}rem
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Prefix Builder */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Class Builder</h3>
        <p className="text-sm text-muted-foreground mb-4">Select a prefix to see the full class name.</p>
        <div className="rounded-lg border overflow-hidden">
          <div className="p-4 border-b flex flex-wrap gap-1.5">
            {prefixes.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedPrefix(p)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-mono transition-colors",
                  selectedPrefix === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="p-4 bg-muted/20 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {spacingScale.slice(0, 16).map((s) => (
              <div key={s.name} className="text-center">
                <div className="text-xs font-mono text-primary">{selectedPrefix}-{s.name}</div>
                <div className="text-[10px] text-muted-foreground">{s.px}px</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Common Patterns */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Common Patterns</h3>
        <p className="text-sm text-muted-foreground mb-4">Recommended spacing for common UI contexts.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {patterns.map((p) => (
            <div key={p.name} className="flex items-start gap-3 rounded-lg border p-4 hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono text-primary">{p.value}</p>
                <p className="text-[10px] text-muted-foreground">{p.px}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
