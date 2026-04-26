"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { CheckIcon, CopyIcon } from "lucide-react"

type ColourSwatch = {
  name: string
  value: string
  textDark?: boolean
}

type ColourGroup = {
  title: string
  description?: string
  colours: ColourSwatch[]
}

const semanticTokens: ColourGroup = {
  title: "Semantic Tokens",
  description: "Design tokens mapped to CSS custom properties. These adapt to light/dark mode automatically.",
  colours: [
    { name: "background", value: "var(--background)" },
    { name: "foreground", value: "var(--foreground)", textDark: true },
    { name: "primary", value: "var(--primary)", textDark: true },
    { name: "primary-foreground", value: "var(--primary-foreground)" },
    { name: "secondary", value: "var(--secondary)" },
    { name: "secondary-foreground", value: "var(--secondary-foreground)", textDark: true },
    { name: "muted", value: "var(--muted)" },
    { name: "muted-foreground", value: "var(--muted-foreground)", textDark: true },
    { name: "accent", value: "var(--accent)" },
    { name: "accent-foreground", value: "var(--accent-foreground)", textDark: true },
    { name: "destructive", value: "var(--destructive)", textDark: true },
    { name: "border", value: "var(--border)" },
    { name: "input", value: "var(--input)" },
    { name: "ring", value: "var(--ring)", textDark: true },
  ],
}

const chartColours: ColourGroup = {
  title: "Chart Palette",
  description: "Five colours for data visualisation, optimised for accessibility.",
  colours: [
    { name: "chart-1", value: "var(--chart-1)" },
    { name: "chart-2", value: "var(--chart-2)", textDark: true },
    { name: "chart-3", value: "var(--chart-3)", textDark: true },
    { name: "chart-4", value: "var(--chart-4)", textDark: true },
    { name: "chart-5", value: "var(--chart-5)", textDark: true },
  ],
}

const sidebarColours: ColourGroup = {
  title: "Sidebar Tokens",
  colours: [
    { name: "sidebar", value: "var(--sidebar)" },
    { name: "sidebar-foreground", value: "var(--sidebar-foreground)", textDark: true },
    { name: "sidebar-primary", value: "var(--sidebar-primary)", textDark: true },
    { name: "sidebar-accent", value: "var(--sidebar-accent)" },
    { name: "sidebar-border", value: "var(--sidebar-border)" },
  ],
}

const tailwindNeutrals: ColourGroup = {
  title: "Zinc Scale",
  description: "Neutral palette used across the interface.",
  colours: [
    { name: "zinc-50", value: "#fafafa" },
    { name: "zinc-100", value: "#f4f4f5" },
    { name: "zinc-200", value: "#e4e4e7" },
    { name: "zinc-300", value: "#d4d4d8" },
    { name: "zinc-400", value: "#a1a1aa", textDark: true },
    { name: "zinc-500", value: "#71717a", textDark: true },
    { name: "zinc-600", value: "#52525b", textDark: true },
    { name: "zinc-700", value: "#3f3f46", textDark: true },
    { name: "zinc-800", value: "#27272a", textDark: true },
    { name: "zinc-900", value: "#18181b", textDark: true },
    { name: "zinc-950", value: "#09090b", textDark: true },
  ],
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="opacity-0 group-hover:opacity-100 transition-opacity"
    >
      {copied ? (
        <CheckIcon className="size-3 text-green-500" />
      ) : (
        <CopyIcon className="size-3 text-current" />
      )}
    </button>
  )
}

function SwatchGrid({ group }: { group: ColourGroup }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-1">{group.title}</h3>
      {group.description && (
        <p className="text-sm text-muted-foreground mb-4">{group.description}</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {group.colours.map((c) => (
          <div key={c.name} className="group">
            <div
              className={cn(
                "h-16 rounded-lg border border-border/50 flex items-end p-2 transition-transform hover:scale-105",
              )}
              style={{ backgroundColor: c.value }}
            >
              <div className="flex items-center gap-1.5 w-full">
                <span
                  className={cn(
                    "text-[10px] font-mono truncate flex-1",
                    c.textDark ? "text-white/80" : "text-black/60"
                  )}
                >
                  {c.name}
                </span>
                <CopyButton text={c.value.startsWith("var") ? `var(--${c.name})` : c.value} />
              </div>
            </div>
            <p className="mt-1 text-[10px] font-mono text-muted-foreground truncate">
              {c.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ColourPalette() {
  return (
    <div className="space-y-10">
      <SwatchGrid group={semanticTokens} />
      <SwatchGrid group={chartColours} />
      <SwatchGrid group={sidebarColours} />
      <SwatchGrid group={tailwindNeutrals} />
    </div>
  )
}
