"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

const typeScale = [
  { name: "text-xs", size: "12px", lineHeight: "16px", sample: "Extra small text" },
  { name: "text-sm", size: "14px", lineHeight: "20px", sample: "Small text" },
  { name: "text-base", size: "16px", lineHeight: "24px", sample: "Base body text" },
  { name: "text-lg", size: "18px", lineHeight: "28px", sample: "Large text" },
  { name: "text-xl", size: "20px", lineHeight: "28px", sample: "Extra large text" },
  { name: "text-2xl", size: "24px", lineHeight: "32px", sample: "Heading level" },
  { name: "text-3xl", size: "30px", lineHeight: "36px", sample: "Section heading" },
  { name: "text-4xl", size: "36px", lineHeight: "40px", sample: "Page title" },
  { name: "text-5xl", size: "48px", lineHeight: "1", sample: "Display" },
  { name: "text-6xl", size: "60px", lineHeight: "1", sample: "Hero" },
]

const fontWeights = [
  { name: "font-thin", weight: "100" },
  { name: "font-extralight", weight: "200" },
  { name: "font-light", weight: "300" },
  { name: "font-normal", weight: "400" },
  { name: "font-medium", weight: "500" },
  { name: "font-semibold", weight: "600" },
  { name: "font-bold", weight: "700" },
  { name: "font-extrabold", weight: "800" },
  { name: "font-black", weight: "900" },
]

const headingLevels = [
  { tag: "H1", class: "text-4xl font-bold", usage: "Page titles" },
  { tag: "H2", class: "text-3xl font-semibold", usage: "Section headings" },
  { tag: "H3", class: "text-2xl font-semibold", usage: "Sub-sections" },
  { tag: "H4", class: "text-xl font-semibold", usage: "Card titles" },
  { tag: "H5", class: "text-lg font-medium", usage: "Group labels" },
  { tag: "H6", class: "text-base font-medium", usage: "Small headings" },
]

export function TypographyShowcase() {
  const [previewText, setPreviewText] = useState("The quick brown fox jumps over the lazy dog")
  const [previewSize, setPreviewSize] = useState("text-2xl")
  const [previewWeight, setPreviewWeight] = useState("font-normal")

  return (
    <div className="space-y-10">
      {/* Font Family */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Font Families</h3>
        <p className="text-sm text-muted-foreground mb-4">Two font families for interface and code.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border p-5">
            <p className="text-xs font-mono text-muted-foreground mb-2">font-sans — Geist</p>
            <p className="text-2xl font-sans">Aa Bb Cc Dd Ee Ff Gg Hh</p>
            <p className="text-sm text-muted-foreground mt-2">
              0123456789 !@#$%^&amp;*()
            </p>
          </div>
          <div className="rounded-lg border p-5">
            <p className="text-xs font-mono text-muted-foreground mb-2">font-mono — Geist Mono</p>
            <p className="text-2xl font-mono">Aa Bb Cc Dd Ee Ff Gg Hh</p>
            <p className="text-sm font-mono text-muted-foreground mt-2">
              0123456789 !@#$%^&amp;*()
            </p>
          </div>
        </div>
      </div>

      {/* Playground */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Playground</h3>
        <p className="text-sm text-muted-foreground mb-4">Experiment with type combinations.</p>
        <div className="rounded-lg border overflow-hidden">
          <div className="p-6 min-h-[120px] flex items-center justify-center border-b">
            <p className={cn(previewSize, previewWeight, "text-center transition-all")}>
              {previewText}
            </p>
          </div>
          <div className="p-4 bg-muted/30 space-y-3">
            <input
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              placeholder="Type preview text..."
            />
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Size:</span>
                <select
                  value={previewSize}
                  onChange={(e) => setPreviewSize(e.target.value)}
                  className="rounded-md border bg-background px-2 py-1 text-xs"
                >
                  {typeScale.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name} ({t.size})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Weight:</span>
                <select
                  value={previewWeight}
                  onChange={(e) => setPreviewWeight(e.target.value)}
                  className="rounded-md border bg-background px-2 py-1 text-xs"
                >
                  {fontWeights.map((w) => (
                    <option key={w.name} value={w.name}>
                      {w.name} ({w.weight})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground">
              className=&quot;{previewSize} {previewWeight}&quot;
            </p>
          </div>
        </div>
      </div>

      {/* Type Scale */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Type Scale</h3>
        <p className="text-sm text-muted-foreground mb-4">Tailwind CSS type scale reference.</p>
        <div className="space-y-0 divide-y rounded-lg border overflow-hidden">
          {typeScale.map((t) => (
            <div key={t.name} className="flex items-baseline gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
              <span className="w-20 shrink-0 text-xs font-mono text-muted-foreground">{t.name}</span>
              <span className="w-16 shrink-0 text-xs text-muted-foreground tabular-nums">{t.size}</span>
              <span className={cn(t.name, "truncate")}>{t.sample}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Font Weights */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Font Weights</h3>
        <div className="space-y-0 divide-y rounded-lg border overflow-hidden">
          {fontWeights.map((w) => (
            <div key={w.name} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
              <span className="w-28 shrink-0 text-xs font-mono text-muted-foreground">{w.name}</span>
              <span className="w-10 shrink-0 text-xs text-muted-foreground tabular-nums">{w.weight}</span>
              <span className="text-lg" style={{ fontWeight: Number(w.weight) }}>
                The quick brown fox
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Heading Levels */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Heading Levels</h3>
        <p className="text-sm text-muted-foreground mb-4">Recommended heading hierarchy.</p>
        <div className="space-y-4">
          {headingLevels.map((h) => (
            <div key={h.tag} className="flex items-baseline gap-4 rounded-lg border px-4 py-3">
              <span className="w-10 shrink-0 text-xs font-mono text-primary font-semibold">{h.tag}</span>
              <div className="flex-1 min-w-0">
                <p className={cn(h.class, "truncate")}>{h.tag} Heading</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{h.usage}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
