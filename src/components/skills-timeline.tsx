'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import type { Phase, Skill } from '@/lib/skills'
import { AGENTS } from '@/lib/skills'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  SearchIcon,
  TerminalIcon,
  ShieldCheckIcon,
  CheckCircle2Icon,
} from 'lucide-react'

const typeStyles: Record<string, { dot: string; label: string }> = {
  core: { dot: 'bg-primary', label: 'Core' },
  support: { dot: 'bg-muted-foreground', label: 'Support' },
  contextual: { dot: 'bg-amber-500', label: 'Contextual' },
}

const prefixColors: Record<string, string> = {
  speckit: 'text-blue-500 bg-blue-500/10',
  trilogy: 'text-emerald-500 bg-emerald-500/10',
  hod: 'text-pink-500 bg-pink-500/10',
  dev: 'text-amber-500 bg-amber-500/10',
  other: 'text-muted-foreground bg-muted',
}

export function SkillsTimeline({ phases }: { phases: Phase[] }) {
  const [activePhase, setActivePhase] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  const filteredPhases = phases.map((phase) => ({
    ...phase,
    skills: phase.skills.filter((skill) => {
      const matchesSearch =
        !search ||
        skill.name.toLowerCase().includes(search.toLowerCase()) ||
        skill.description.toLowerCase().includes(search.toLowerCase())
      const matchesType = !typeFilter || skill.type === typeFilter
      return matchesSearch && matchesType
    }),
  }))

  const hasResults = filteredPhases.some((p) => p.skills.length > 0)
  const agent = selectedAgent ? AGENTS[selectedAgent] : null

  return (
    <div className="space-y-8">
      {/* Search and filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          <button
            onClick={() => setTypeFilter(null)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              !typeFilter ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            All
          </button>
          {Object.entries(typeStyles).map(([type, style]) => (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? null : type)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                typeFilter === type ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className={cn('size-1.5 rounded-full', style.dot)} />
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-[1.0625rem] top-0 bottom-0 w-px bg-border" />

        <div className="space-y-2">
          {filteredPhases.map((phase) => {
            const isExpanded = activePhase === phase.id
            const hasSkills = phase.skills.length > 0
            const isHidden = !hasSkills && (search || typeFilter)

            if (isHidden) return null

            const phaseAgents = (phase.agents ?? [])
              .map((id) => AGENTS[id])
              .filter(Boolean)

            return (
              <div key={phase.id} className="relative">
                {/* Phase node on timeline */}
                <button
                  type="button"
                  onClick={() => setActivePhase(isExpanded ? null : phase.id)}
                  className={cn(
                    'group flex w-full items-center gap-4 rounded-lg px-1 py-3 text-left transition-colors hover:bg-muted/50',
                    isExpanded && 'bg-muted/50'
                  )}
                >
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      'relative z-10 flex size-[2.125rem] shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors',
                      isExpanded
                        ? phase.color.replace('bg-', 'bg-').replace('/10', '/20') + ' border-current'
                        : 'bg-card border-border'
                    )}
                  >
                    {phase.gateNumber != null ? phase.gateNumber : '·'}
                  </div>

                  <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{phase.title}</span>
                      {phase.gate && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <ShieldCheckIcon className="size-2.5" />
                          {phase.gate}
                        </Badge>
                      )}
                      {/* Agent avatars */}
                      {phaseAgents.length > 0 && (
                        <div className="flex items-center -space-x-1.5 ml-1">
                          {phaseAgents.map((a) => (
                            <Tooltip key={a.id}>
                              <TooltipTrigger
                                render={
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedAgent(a.id)
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.stopPropagation()
                                        setSelectedAgent(a.id)
                                      }
                                    }}
                                    className="relative flex size-7 items-center justify-center rounded-full border-2 border-card overflow-hidden bg-muted cursor-pointer transition-all hover:scale-110 hover:border-primary hover:z-10"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={a.avatar} alt={a.name} className="size-full" />
                                  </span>
                                }
                              />
                              <TooltipContent side="top" className="text-xs">
                                {a.name}
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {phase.skills.length} skill{phase.skills.length !== 1 ? 's' : ''}
                      </span>
                      <motion.span
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        className="text-muted-foreground"
                      >
                        ›
                      </motion.span>
                    </div>
                  </div>
                </button>

                {/* Expanded skill cards */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-[2.5625rem] pb-4 space-y-2">
                        {phase.skills.map((skill, i) => (
                          <motion.div
                            key={skill.name}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                          >
                            <SkillCard skill={skill} />
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        {!hasResults && (
          <div className="ml-[2.5625rem] py-12 text-center text-sm text-muted-foreground">
            No skills match your search.
          </div>
        )}
      </div>

      {/* Agent detail modal */}
      <Dialog open={!!selectedAgent} onOpenChange={(open) => !open && setSelectedAgent(null)}>
        <DialogContent className="sm:max-w-md">
          {agent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full overflow-hidden bg-muted ring-2 ring-primary/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={agent.avatar} alt={agent.name} className="size-full" />
                  </div>
                  <div>
                    <DialogTitle>{agent.name}</DialogTitle>
                    <DialogDescription>{agent.role}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {agent.description}
                </p>
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Responsibilities
                  </h4>
                  <ul className="space-y-1.5">
                    {agent.responsibilities.map((r) => (
                      <li key={r} className="flex items-start gap-2 text-sm">
                        <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
                {agent.skills.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                      Skills Used
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {agent.skills.map((s) => (
                        <Badge key={s} variant="secondary" className="font-mono text-[10px]">
                          /{s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SkillCard({ skill }: { skill: Skill }) {
  const style = typeStyles[skill.type]

  return (
    <Card className="shadow-none transition-shadow hover:shadow-md">
      <CardContent className="flex items-start gap-3 p-3">
        <div className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md', prefixColors[skill.prefix])}>
          <TerminalIcon className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <code className="text-sm font-semibold">/{skill.name}</code>
            <span className={cn('size-1.5 rounded-full', style.dot)} title={style.label} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            {skill.description}
          </p>
        </div>
        <Badge variant="outline" className={cn('shrink-0 font-mono text-[9px]', prefixColors[skill.prefix])}>
          {skill.prefix}
        </Badge>
      </CardContent>
    </Card>
  )
}
