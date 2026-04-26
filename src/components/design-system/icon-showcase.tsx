"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import * as LucideIcons from "lucide-react"
import { CheckIcon, CopyIcon, SearchIcon } from "lucide-react"

// Common icons grouped by purpose
const iconGroups = [
  {
    title: "Actions",
    icons: [
      "Plus", "Minus", "X", "Check", "Pencil", "Trash2", "Copy", "Download",
      "Upload", "Share2", "ExternalLink", "RotateCcw", "RotateCw", "RefreshCw",
      "Save", "Send", "Play", "Pause", "Square",
    ],
  },
  {
    title: "Navigation",
    icons: [
      "ChevronDown", "ChevronUp", "ChevronLeft", "ChevronRight",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "ChevronsUpDown", "Menu", "MoreHorizontal", "MoreVertical",
    ],
  },
  {
    title: "Communication",
    icons: [
      "Mail", "MessageSquare", "MessageCircle", "Phone", "Video",
      "Bell", "BellOff", "AtSign", "Hash",
    ],
  },
  {
    title: "Interface",
    icons: [
      "Search", "Filter", "SlidersHorizontal", "Settings", "Eye", "EyeOff",
      "Lock", "Unlock", "Shield", "ShieldCheck", "Key",
      "Loader2", "Clock", "Calendar", "CalendarDays",
    ],
  },
  {
    title: "Content",
    icons: [
      "File", "FileText", "Folder", "FolderOpen", "Image", "Link",
      "Paperclip", "BookOpen", "Bookmark", "Tag", "Tags",
    ],
  },
  {
    title: "Data",
    icons: [
      "BarChart3", "TrendingUp", "TrendingDown", "PieChart", "Activity",
      "Database", "Table", "Grid3x3", "LayoutGrid", "List",
    ],
  },
  {
    title: "People",
    icons: [
      "User", "Users", "UserPlus", "UserMinus", "UserCheck",
      "CircleUser", "Contact",
    ],
  },
  {
    title: "Status",
    icons: [
      "CircleCheck", "CircleX", "AlertTriangle", "AlertCircle", "Info",
      "HelpCircle", "Ban", "Flame", "Zap", "Star", "Heart",
    ],
  },
]

const sizes = [
  { name: "size-3", px: "12px", use: "Inline / badge" },
  { name: "size-3.5", px: "14px", use: "Small buttons" },
  { name: "size-4", px: "16px", use: "Default" },
  { name: "size-5", px: "20px", use: "Buttons / nav" },
  { name: "size-6", px: "24px", use: "Headers" },
  { name: "size-8", px: "32px", use: "Feature / hero" },
]

function IconCell({ name }: { name: string }) {
  const [copied, setCopied] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = (LucideIcons as any)[name]
  if (!Icon) return null

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(`<${name}Icon className="size-4" />`)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="group flex flex-col items-center gap-2 rounded-lg border p-3 transition-all hover:bg-muted/50 hover:border-primary/30 hover:scale-105"
    >
      <Icon className="size-5 text-foreground" />
      <span className="text-[9px] font-mono text-muted-foreground truncate w-full text-center">
        {copied ? (
          <span className="text-green-500 flex items-center justify-center gap-0.5">
            <CheckIcon className="size-2.5" /> copied
          </span>
        ) : (
          name
        )}
      </span>
    </button>
  )
}

export function IconShowcase() {
  const [search, setSearch] = useState("")
  const query = search.toLowerCase()

  const filteredGroups = iconGroups
    .map((g) => ({
      ...g,
      icons: g.icons.filter((i) => i.toLowerCase().includes(query)),
    }))
    .filter((g) => g.icons.length > 0)

  return (
    <div className="space-y-10">
      {/* Search */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Icon Library</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Lucide icons — click any icon to copy the import. {iconGroups.reduce((a, g) => a + g.icons.length, 0)} icons shown.
        </p>
        <div className="relative w-full max-w-sm mb-6">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search icons..."
            className="w-full rounded-lg border bg-muted/50 pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      {/* Icon Groups */}
      {filteredGroups.map((group) => (
        <div key={group.title}>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">{group.title}</h4>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {group.icons.map((icon) => (
              <IconCell key={icon} name={icon} />
            ))}
          </div>
        </div>
      ))}

      {filteredGroups.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No icons match &quot;{search}&quot;</p>
      )}

      {/* Sizing Guide */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Sizing Guide</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {sizes.map((s) => (
            <div key={s.name} className="flex flex-col items-center gap-2 rounded-lg border p-3">
              <LucideIcons.Star className={cn(s.name, "text-primary")} />
              <div className="text-center">
                <p className="text-xs font-mono text-primary">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">{s.px} — {s.use}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
