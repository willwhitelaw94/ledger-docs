"use client"

import { useState } from "react"
import { motion, AnimatePresence, type TargetAndTransition, type Transition } from "motion/react"
import { cn } from "@/lib/utils"
import { PlayIcon, RotateCcwIcon } from "lucide-react"

const animations = [
  {
    name: "Fade In",
    class: "fade-in",
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.3 },
  },
  {
    name: "Scale In",
    class: "scale-in",
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
  {
    name: "Slide Up",
    class: "slide-up",
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { type: "spring" as const, stiffness: 300, damping: 26 },
  },
  {
    name: "Slide Down",
    class: "slide-down",
    initial: { opacity: 0, y: -16 },
    animate: { opacity: 1, y: 0 },
    transition: { type: "spring" as const, stiffness: 300, damping: 26 },
  },
  {
    name: "Slide Right",
    class: "slide-right",
    initial: { opacity: 0, x: -16 },
    animate: { opacity: 1, x: 0 },
    transition: { type: "spring" as const, stiffness: 300, damping: 26 },
  },
]

const durations = [
  { name: "100ms", value: 100, use: "Hover states, micro-interactions" },
  { name: "150ms", value: 150, use: "Buttons, toggles, small state changes" },
  { name: "200ms", value: 200, use: "Dropdowns, tooltips, panels" },
  { name: "300ms", value: 300, use: "Modals, page transitions, large reveals" },
]

const easings = [
  { name: "ease-out", value: "cubic-bezier(0, 0, 0.2, 1)", use: "Entrances (most common)" },
  { name: "ease-in", value: "cubic-bezier(0.4, 0, 1, 1)", use: "Exits" },
  { name: "ease-in-out", value: "cubic-bezier(0.4, 0, 0.2, 1)", use: "Moving between states" },
  { name: "spring", value: "type: 'spring', stiffness: 300, damping: 24", use: "Bouncy, natural motion" },
]

const patterns = [
  {
    name: "Modal",
    desc: "Scale + fade",
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { type: "spring" as const, stiffness: 300, damping: 26 },
  },
  {
    name: "Dropdown",
    desc: "Slide down + fade",
    initial: { opacity: 0, y: -8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.15 },
  },
  {
    name: "Toast",
    desc: "Slide right + fade",
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 100 },
    transition: { type: "spring" as const, stiffness: 300, damping: 26 },
  },
  {
    name: "Collapsible",
    desc: "Height + fade",
    initial: { opacity: 0, height: 0 },
    animate: { opacity: 1, height: "auto" as const },
    exit: { opacity: 0, height: 0 },
    transition: { duration: 0.2 },
  },
]

function AnimationDemo({
  name,
  initial,
  animate,
  transition,
}: {
  name: string
  initial: TargetAndTransition
  animate: TargetAndTransition
  transition: Transition
}) {
  const [key, setKey] = useState(0)

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="h-28 flex items-center justify-center bg-muted/20 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={key}
            initial={initial}
            animate={animate}
            transition={transition}
            className="w-16 h-10 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center"
          >
            <span className="text-[10px] font-mono text-primary">div</span>
          </motion.div>
        </AnimatePresence>
        <button
          type="button"
          onClick={() => setKey((k) => k + 1)}
          className="absolute top-2 right-2 rounded-md p-1.5 hover:bg-muted transition-colors"
          title="Replay animation"
        >
          <RotateCcwIcon className="size-3 text-muted-foreground" />
        </button>
      </div>
      <div className="p-3 border-t">
        <p className="text-xs font-medium">{name}</p>
      </div>
    </div>
  )
}

function PatternDemo({ pattern }: { pattern: typeof patterns[number] }) {
  const [visible, setVisible] = useState(true)

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="h-28 flex items-center justify-center bg-muted/20 relative">
        <AnimatePresence mode="wait">
          {visible && (
            <motion.div
              initial={pattern.initial}
              animate={pattern.animate}
              exit={pattern.exit}
              transition={pattern.transition}
              className="w-24 h-14 rounded-md bg-card border shadow-md flex items-center justify-center"
            >
              <span className="text-[10px] font-mono text-muted-foreground">{pattern.name}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => {
            setVisible(false)
            setTimeout(() => setVisible(true), 300)
          }}
          className="absolute top-2 right-2 rounded-md p-1.5 hover:bg-muted transition-colors"
          title="Replay"
        >
          <PlayIcon className="size-3 text-muted-foreground" />
        </button>
      </div>
      <div className="p-3 border-t">
        <p className="text-xs font-medium">{pattern.name}</p>
        <p className="text-[10px] text-muted-foreground">{pattern.desc}</p>
      </div>
    </div>
  )
}

export function MotionShowcase() {
  return (
    <div className="space-y-10">
      {/* Animations */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Entrance Animations</h3>
        <p className="text-sm text-muted-foreground mb-4">Click the replay button to see each animation.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {animations.map((a) => (
            <AnimationDemo key={a.name} {...a} />
          ))}
        </div>
      </div>

      {/* Transition Patterns */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Transition Patterns</h3>
        <p className="text-sm text-muted-foreground mb-4">Common enter/exit patterns used across the app.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {patterns.map((p) => (
            <PatternDemo key={p.name} pattern={p} />
          ))}
        </div>
      </div>

      {/* Durations */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Duration Tokens</h3>
        <div className="space-y-2">
          {durations.map((d) => (
            <div key={d.name} className="flex items-center gap-4 rounded-lg border px-4 py-3">
              <span className="w-14 shrink-0 text-xs font-mono text-primary font-semibold tabular-nums">{d.name}</span>
              <div className="flex-1">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full bg-primary/40 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.value / 300) * 100}%` }}
                    transition={{ duration: d.value / 1000 }}
                  />
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{d.use}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Easing */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Easing Curves</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {easings.map((e) => (
            <div key={e.name} className="rounded-lg border p-4">
              <p className="text-sm font-medium">{e.name}</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-1 break-all">{e.value}</p>
              <p className="text-xs text-muted-foreground mt-2">{e.use}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Guidelines */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Guidelines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">Do</p>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>Use spring physics for interactive elements</li>
              <li>Keep durations under 300ms for UI transitions</li>
              <li>Match entrance/exit curves to context</li>
              <li>Animate opacity with transforms for performance</li>
            </ul>
          </div>
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Don&apos;t</p>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>Animate layout properties (width, height, top, left)</li>
              <li>Use long durations for small state changes</li>
              <li>Add animation for the sake of animation</li>
              <li>Ignore prefers-reduced-motion</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
