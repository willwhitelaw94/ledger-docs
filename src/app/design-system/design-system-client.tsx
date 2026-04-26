"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "@/lib/utils"
import { ColourPalette } from "@/components/design-system/colour-palette"
import { TypographyShowcase } from "@/components/design-system/typography-showcase"
import { SpacingShowcase } from "@/components/design-system/spacing-showcase"
import { ShadowRadiusShowcase } from "@/components/design-system/shadow-radius-showcase"
import { IconShowcase } from "@/components/design-system/icon-showcase"
import { MotionShowcase } from "@/components/design-system/motion-showcase"
import { BreakpointShowcase } from "@/components/design-system/breakpoint-showcase"
import {
  PaletteIcon,
  TypeIcon,
  SpaceIcon,
  BoxIcon,
  SmileIcon,
  ZapIcon,
  MonitorIcon,
} from "lucide-react"

const sections = [
  {
    id: "colours",
    label: "Colours",
    icon: PaletteIcon,
    component: ColourPalette,
    description: "Semantic tokens, chart palette, and neutral scale",
  },
  {
    id: "typography",
    label: "Typography",
    icon: TypeIcon,
    component: TypographyShowcase,
    description: "Font families, type scale, weights, and heading levels",
  },
  {
    id: "spacing",
    label: "Spacing",
    icon: SpaceIcon,
    component: SpacingShowcase,
    description: "Spacing scale, class builder, and common patterns",
  },
  {
    id: "shadows-radius",
    label: "Shadows & Radius",
    icon: BoxIcon,
    component: ShadowRadiusShowcase,
    description: "Elevation levels, border radius, and interactive playground",
  },
  {
    id: "icons",
    label: "Icons",
    icon: SmileIcon,
    component: IconShowcase,
    description: "Searchable Lucide icon library with copy-to-clipboard",
  },
  {
    id: "motion",
    label: "Motion",
    icon: ZapIcon,
    component: MotionShowcase,
    description: "Animations, transitions, easing curves, and guidelines",
  },
  {
    id: "breakpoints",
    label: "Breakpoints",
    icon: MonitorIcon,
    component: BreakpointShowcase,
    description: "Responsive breakpoints, viewport indicator, and patterns",
  },
]

export function DesignSystemClient() {
  const [activeSection, setActiveSection] = useState("colours")
  const active = sections.find((s) => s.id === activeSection)!
  const ActiveComponent = active.component

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-16">
      {/* Hero */}
      <div className="mb-10 space-y-3 text-center md:mb-14">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Design System
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Foundations, tokens, and interactive showcases. Everything you need to
          build consistent interfaces.
        </p>
        <p className="text-xs text-muted-foreground">
          Synced from{" "}
          <a
            href="https://www.figma.com/design/ojTCI9yefnl9ORYEVrv2WJ/Trilogy-Care-Design-System"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Figma Design System
          </a>
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Section Navigation — sticky sidebar on desktop, horizontal scroll on mobile */}
        <nav className="lg:w-56 shrink-0">
          <div className="lg:sticky lg:top-20">
            {/* Mobile: horizontal scroll */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 lg:hidden">
              {sections.map((s) => {
                const Icon = s.icon
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSection(s.id)}
                    className={cn(
                      "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors shrink-0",
                      activeSection === s.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="size-3.5" />
                    {s.label}
                  </button>
                )
              })}
            </div>

            {/* Desktop: vertical nav */}
            <div className="hidden lg:flex lg:flex-col lg:gap-1">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                Foundations
              </p>
              {sections.map((s) => {
                const Icon = s.icon
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSection(s.id)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all text-left",
                      activeSection === s.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", activeSection === s.id ? "text-primary" : "")} />
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
            >
              <div className="mb-8">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {active.label}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {active.description}
                </p>
              </div>
              <ActiveComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
