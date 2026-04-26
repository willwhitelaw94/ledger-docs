"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

const radiusScale = [
  { name: "rounded-none", value: "0px", tw: "rounded-none" },
  { name: "rounded-sm", value: "calc(var(--radius) * 0.6)", tw: "rounded-sm" },
  { name: "rounded-md", value: "calc(var(--radius) * 0.8)", tw: "rounded-md" },
  { name: "rounded-lg", value: "var(--radius)", tw: "rounded-lg" },
  { name: "rounded-xl", value: "calc(var(--radius) * 1.4)", tw: "rounded-xl" },
  { name: "rounded-2xl", value: "calc(var(--radius) * 1.8)", tw: "rounded-2xl" },
  { name: "rounded-3xl", value: "calc(var(--radius) * 2.2)", tw: "rounded-3xl" },
  { name: "rounded-full", value: "9999px", tw: "rounded-full" },
]

const shadowScale = [
  { name: "shadow-none", class: "shadow-none", desc: "No shadow" },
  { name: "shadow-sm", class: "shadow-sm", desc: "Subtle elevation" },
  { name: "shadow", class: "shadow", desc: "Default elevation" },
  { name: "shadow-md", class: "shadow-md", desc: "Cards, dropdowns" },
  { name: "shadow-lg", class: "shadow-lg", desc: "Modals, popovers" },
  { name: "shadow-xl", class: "shadow-xl", desc: "Prominent overlays" },
  { name: "shadow-2xl", class: "shadow-2xl", desc: "Maximum elevation" },
]

export function ShadowRadiusShowcase() {
  const [selectedRadius, setSelectedRadius] = useState("rounded-lg")
  const [selectedShadow, setSelectedShadow] = useState("shadow-md")

  return (
    <div className="space-y-10">
      {/* Interactive Playground */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Playground</h3>
        <p className="text-sm text-muted-foreground mb-4">Mix shadow and radius to preview combinations.</p>
        <div className="rounded-lg border overflow-hidden">
          <div className="p-8 flex items-center justify-center min-h-[200px] bg-muted/20">
            <div
              className={cn(
                "w-48 h-32 bg-card border border-border flex items-center justify-center transition-all duration-300",
                selectedRadius,
                selectedShadow,
              )}
            >
              <span className="text-xs text-muted-foreground font-mono">
                {selectedRadius} {selectedShadow}
              </span>
            </div>
          </div>
          <div className="p-4 border-t bg-muted/10 space-y-3">
            <div>
              <span className="text-xs text-muted-foreground mb-1.5 block">Radius</span>
              <div className="flex flex-wrap gap-1.5">
                {radiusScale.map((r) => (
                  <button
                    key={r.name}
                    type="button"
                    onClick={() => setSelectedRadius(r.tw)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-mono transition-colors",
                      selectedRadius === r.tw
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {r.name.replace("rounded-", "")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground mb-1.5 block">Shadow</span>
              <div className="flex flex-wrap gap-1.5">
                {shadowScale.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => setSelectedShadow(s.class)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-mono transition-colors",
                      selectedShadow === s.class
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s.name.replace("shadow-", "") || "default"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Border Radius Scale */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Border Radius Scale</h3>
        <p className="text-sm text-muted-foreground mb-4">Based on --radius: 0.625rem.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {radiusScale.map((r) => (
            <div key={r.name} className="text-center">
              <div
                className={cn("mx-auto w-16 h-16 bg-primary/10 border-2 border-primary/30", r.tw)}
              />
              <p className="mt-2 text-xs font-mono text-primary">{r.name}</p>
              <p className="text-[10px] text-muted-foreground">{r.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Shadow Scale */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Shadow Scale</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {shadowScale.map((s) => (
            <div key={s.name} className="text-center">
              <div
                className={cn("mx-auto w-full h-20 rounded-lg bg-card border border-border/50", s.class)}
              />
              <p className="mt-3 text-xs font-mono text-primary">{s.name}</p>
              <p className="text-[10px] text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
