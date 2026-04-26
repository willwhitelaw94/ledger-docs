"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import type { Gate, FlatEpic } from "@/lib/gates";
import type { Phase, Skill, Agent } from "@/lib/skills";
import { InternalHeader } from "@/components/internal-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChevronRightIcon,
  CircleCheckIcon,
  FileTextIcon,
  LightbulbIcon,
  PaletteIcon,
  CodeIcon,
  TestTubeIcon,
  RocketIcon,
  SearchIcon,
  ShieldCheckIcon,
  BrainCircuitIcon,
  TerminalIcon,
  BookOpenIcon,
  WrenchIcon,
  SettingsIcon,
  ArrowRightIcon,
  BotIcon,
  XIcon,
  AlertTriangleIcon,
  LayersIcon,
} from "lucide-react";

/* ── Phase icons ── */

const PHASE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  research: SearchIcon,
  ideation: LightbulbIcon,
  spec: FileTextIcon,
  design: PaletteIcon,
  planning: ShieldCheckIcon,
  dev: CodeIcon,
  review: CircleCheckIcon,
  qa: TestTubeIcon,
  release: RocketIcon,
  docs: BookOpenIcon,
  tooling: WrenchIcon,
};

/* ── Phase colors ── */

const PHASE_COLORS: Record<string, { gradient: string; ring: string; bg: string; text: string; dot: string; border: string }> = {
  research:  { gradient: "from-slate-500 to-slate-400",   ring: "ring-slate-500/30",   bg: "bg-slate-500/10",   text: "text-slate-400",   dot: "bg-slate-400",   border: "border-slate-500/30" },
  ideation:  { gradient: "from-pink-500 to-pink-400",     ring: "ring-pink-500/30",    bg: "bg-pink-500/10",    text: "text-pink-400",    dot: "bg-pink-400",    border: "border-pink-500/30" },
  spec:      { gradient: "from-blue-500 to-blue-400",     ring: "ring-blue-500/30",    bg: "bg-blue-500/10",    text: "text-blue-400",    dot: "bg-blue-400",    border: "border-blue-500/30" },
  design:    { gradient: "from-purple-500 to-purple-400", ring: "ring-purple-500/30",  bg: "bg-purple-500/10",  text: "text-purple-400",  dot: "bg-purple-400",  border: "border-purple-500/30" },
  planning:  { gradient: "from-amber-500 to-amber-400",   ring: "ring-amber-500/30",   bg: "bg-amber-500/10",   text: "text-amber-400",   dot: "bg-amber-400",   border: "border-amber-500/30" },
  dev:       { gradient: "from-emerald-500 to-emerald-400", ring: "ring-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400", border: "border-emerald-500/30" },
  review:    { gradient: "from-indigo-500 to-indigo-400", ring: "ring-indigo-500/30",  bg: "bg-indigo-500/10",  text: "text-indigo-400",  dot: "bg-indigo-400",  border: "border-indigo-500/30" },
  qa:        { gradient: "from-teal-500 to-teal-400",     ring: "ring-teal-500/30",    bg: "bg-teal-500/10",    text: "text-teal-400",    dot: "bg-teal-400",    border: "border-teal-500/30" },
  release:   { gradient: "from-green-500 to-green-400",   ring: "ring-green-500/30",   bg: "bg-green-500/10",   text: "text-green-400",   dot: "bg-green-400",   border: "border-green-500/30" },
  docs:      { gradient: "from-orange-500 to-orange-400", ring: "ring-orange-500/30",  bg: "bg-orange-500/10",  text: "text-orange-400",  dot: "bg-orange-400",  border: "border-orange-500/30" },
  tooling:   { gradient: "from-zinc-500 to-zinc-400",     ring: "ring-zinc-500/30",    bg: "bg-zinc-500/10",    text: "text-zinc-400",    dot: "bg-zinc-400",    border: "border-zinc-500/30" },
};

const defaultPhaseColor = { gradient: "from-zinc-500 to-zinc-400", ring: "ring-zinc-500/30", bg: "bg-zinc-500/10", text: "text-zinc-400", dot: "bg-zinc-400", border: "border-zinc-500/30" };

/* ── Artifacts per phase ── */

const PHASE_ARTIFACTS: Record<string, { name: string; description: string }[]> = {
  research: [
    { name: "research.md", description: "Structured findings from all sources" },
  ],
  ideation: [
    { name: "idea-brief.md", description: "Problem statement, goals, RACI, success metrics" },
  ],
  spec: [
    { name: "spec.md", description: "User stories with acceptance criteria (Given/When/Then)" },
    { name: "business.md", description: "Business outcomes, ROI, stakeholder alignment" },
  ],
  design: [
    { name: "design.md", description: "UX decisions, UI patterns, components, accessibility" },
    { name: "mockups/", description: "HTML/Tailwind prototypes or ASCII wireframes" },
    { name: "journey.md", description: "Stakeholder journey maps with touchpoints" },
  ],
  planning: [
    { name: "plan.md", description: "Architecture, phases, constraints, technical approach" },
    { name: "tasks.md", description: "Implementation tasks by story with dependencies" },
    { name: "db-spec.md", description: "Database schema changes and migrations" },
  ],
  dev: [
    { name: "Pull Request", description: "One PR per story, linked to Linear" },
  ],
  review: [
    { name: "PR Review", description: "Gate 3 & 4 checklist validation" },
  ],
  qa: [
    { name: "qa-plan.md", description: "Test cases from acceptance criteria" },
    { name: "test-report.md", description: "Browser test results with evidence" },
    { name: "*.spec.ts", description: "Codified Playwright E2E tests" },
  ],
  release: [
    { name: "release-notes.md", description: "Multi-audience release communication" },
    { name: "changelog", description: "Tagged release with changelog" },
  ],
};

/* ── Skill type order + styles ── */

const SKILL_TYPE_ORDER: Skill["type"][] = ["core", "contextual", "support"];

const SKILL_TYPE_STYLES: Record<string, { dot: string; label: string; labelClass: string }> = {
  core:        { dot: "bg-primary",          label: "Core",        labelClass: "text-foreground/80 font-semibold" },
  contextual:  { dot: "bg-amber-500",         label: "Contextual",  labelClass: "text-amber-500/80 font-medium" },
  support:     { dot: "bg-muted-foreground",  label: "Support",     labelClass: "text-muted-foreground/70" },
};

const PREFIX_COLORS: Record<string, string> = {
  speckit: "text-blue-400 bg-blue-500/10",
  trilogy: "text-emerald-400 bg-emerald-500/10",
  hod:     "text-pink-400 bg-pink-500/10",
  dev:     "text-amber-400 bg-amber-500/10",
  other:   "text-muted-foreground bg-muted",
};

/* ── Gate mapping ── */

const GATE_ID_MAP: Record<number, string> = {
  0: "idea",
  1: "spec",
  2: "design",
  3: "architecture",
  4: "code-quality",
  5: "qa",
  6: "release",
};

const spring = { type: "spring" as const, stiffness: 300, damping: 26 };

/* ── Gate Detail Modal ── */

function GateModal({
  gate,
  open,
  onClose,
  colors,
}: {
  gate: Gate;
  open: boolean;
  onClose: () => void;
  colors: typeof defaultPhaseColor;
}) {
  // Close on Escape
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="gate-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="gate-panel"
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            onKeyDown={handleKey}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-background shadow-2xl ring-1 ring-foreground/10 outline-none focus:outline-none p-6"
            tabIndex={-1}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={cn("flex size-8 items-center justify-center rounded-lg bg-gradient-to-br", colors.gradient)}>
                  <ShieldCheckIcon className="size-4 text-white" />
                </div>
                <h2 className="text-base font-semibold">
                  Gate {gate.number}: {gate.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            {/* Gate question */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className={cn("rounded-xl border p-4 mb-4", colors.bg, colors.border)}
            >
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                Gate Question
              </p>
              <p className="text-sm italic leading-relaxed">&ldquo;{gate.question}&rdquo;</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">{gate.owner}</Badge>
                {gate.skill && (
                  <Badge variant="secondary" className="text-xs font-mono">{gate.skill}</Badge>
                )}
                <Badge variant="secondary" className="text-xs">{gate.linearTransition}</Badge>
              </div>
            </motion.div>

            {/* Checklist sections */}
            {gate.sections.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-4"
              >
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                  Checklist
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {gate.sections.map((section, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12 + i * 0.04 }}
                    >
                      <Card className="shadow-none">
                        <CardContent className="p-3">
                          <h4 className="text-xs font-semibold mb-2">{section.title}</h4>
                          <div className="space-y-1.5">
                            {section.checks.map((check, ci) => (
                              <div key={ci} className="flex items-start gap-2 text-xs">
                                <CircleCheckIcon className="size-3 mt-0.5 shrink-0 text-emerald-500" />
                                <span className="text-muted-foreground">{check.item}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Failed advice */}
            {gate.failedAdvice && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
              >
                <Card className="shadow-none border-amber-500/30 bg-amber-500/5">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangleIcon className="size-3.5 text-amber-500 shrink-0" />
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        What if the gate fails?
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{gate.failedAdvice}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Phase Node ── */

function PhaseNode({
  phase,
  isSelected,
  onClick,
  index,
}: {
  phase: Phase;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}) {
  const Icon = PHASE_ICONS[phase.id] || SettingsIcon;
  const colors = PHASE_COLORS[phase.id] || defaultPhaseColor;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: index * 0.05 }}
      className="group relative flex flex-col items-center gap-2.5 outline-none"
    >
      <div
        className={cn(
          "relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br transition-all duration-300 shadow-sm",
          colors.gradient,
          isSelected && "ring-4 scale-110 shadow-lg",
          isSelected && colors.ring,
          !isSelected && "hover:scale-105 hover:shadow-md opacity-70 hover:opacity-90",
        )}
      >
        <Icon className="size-7 text-white" />
      </div>

      <span
        className={cn(
          "text-xs font-medium transition-colors whitespace-nowrap",
          isSelected ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {phase.title}
      </span>
    </motion.button>
  );
}

/* ── Phase connector — with optional inline gate node ── */

function PhaseConnector({
  index,
  gate,
  phaseColors,
  isActiveGate,
  onGateClick,
}: {
  index: number;
  gate?: Gate | null;
  phaseColors?: typeof defaultPhaseColor;
  isActiveGate?: boolean;
  onGateClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ ...spring, delay: index * 0.05 + 0.025 }}
      className="hidden sm:flex items-center self-start mt-8"
    >
      <div className="h-px w-3 bg-border/60 md:w-4" />

      {gate && phaseColors && onGateClick ? (
        /* Inline gate checkpoint */
        <button
          type="button"
          onClick={onGateClick}
          className="group relative flex flex-col items-center gap-1 outline-none"
        >
          <motion.div
            animate={isActiveGate ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className={cn(
              "flex size-7 items-center justify-center rounded-lg border-2 transition-all duration-200",
              isActiveGate
                ? cn("bg-gradient-to-br shadow-md", phaseColors.gradient, "border-transparent")
                : "border-border/50 bg-background hover:border-border group-hover:scale-110",
            )}
          >
            <ShieldCheckIcon
              className={cn(
                "size-3.5 transition-colors",
                isActiveGate ? "text-white" : "text-muted-foreground/50 group-hover:text-muted-foreground",
              )}
            />
          </motion.div>
          <span
            className={cn(
              "text-[9px] font-medium whitespace-nowrap transition-colors leading-none",
              isActiveGate ? phaseColors.text : "text-muted-foreground/40 group-hover:text-muted-foreground/60",
            )}
          >
            G{gate.number}
          </span>
        </button>
      ) : (
        /* Plain arrow for no-gate transition */
        <>
          <div className="h-px w-1 bg-border/60" />
          <ArrowRightIcon className="size-2.5 -ml-0.5 text-muted-foreground/30" />
          <div className="h-px w-1 bg-border/60" />
        </>
      )}

      <div className="h-px w-3 bg-border/60 md:w-4" />
    </motion.div>
  );
}

/* ── Skill Row ── */

function SkillRow({ skill, index }: { skill: Skill; index: number }) {
  const typeStyle = SKILL_TYPE_STYLES[skill.type] || SKILL_TYPE_STYLES.support;
  const prefixColor = PREFIX_COLORS[skill.prefix] || PREFIX_COLORS.other;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...spring, delay: index * 0.025 }}
      className="flex items-start gap-2.5 rounded-lg border border-border/40 px-3 py-2.5 transition-colors hover:bg-muted/30"
    >
      <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", typeStyle.dot)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("rounded px-1.5 py-0.5 font-mono text-[11px] font-medium", prefixColor)}>
            /{skill.name}
          </span>
          <span className={cn("text-[10px]", typeStyle.labelClass)}>{typeStyle.label}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {skill.description}
        </p>
      </div>
    </motion.div>
  );
}

/* ── Main component ── */

export function SddProcessClient({
  gates,
  epicsByGate,
  phases,
  agents,
  totalSkills,
}: {
  gates: Gate[];
  epicsByGate: Record<string, FlatEpic[]>;
  phases: Phase[];
  agents: Record<string, Agent>;
  totalSkills: number;
}) {
  const workflowPhases = phases.filter((p) =>
    ["research", "ideation", "spec", "design", "planning", "dev", "review", "qa", "release"].includes(p.id),
  );

  const [selectedPhaseId, setSelectedPhaseId] = useState(workflowPhases[0]?.id || "research");
  const [gateModalOpen, setGateModalOpen] = useState(false);

  const selectedPhase = workflowPhases.find((p) => p.id === selectedPhaseId) || workflowPhases[0];
  const colors = PHASE_COLORS[selectedPhase.id] || defaultPhaseColor;

  // Find matching gate
  const matchingGate = useMemo(() => {
    if (selectedPhase.gateNumber == null) return null;
    const gateId = GATE_ID_MAP[selectedPhase.gateNumber];
    return gates.find((g) => g.id === gateId) ?? null;
  }, [selectedPhase, gates]);

  // Get epics at this gate
  const phaseEpics = useMemo(() => {
    if (!matchingGate) return [];
    return epicsByGate[matchingGate.id] || [];
  }, [matchingGate, epicsByGate]);

  // Get agents for this phase
  const phaseAgents = useMemo(() => {
    if (!selectedPhase.agents) return [];
    return selectedPhase.agents.map((id) => agents[id]).filter(Boolean);
  }, [selectedPhase, agents]);

  // Sort skills: core → contextual → support
  const sortedSkills = useMemo(() => {
    return [...selectedPhase.skills].sort((a, b) => {
      return SKILL_TYPE_ORDER.indexOf(a.type) - SKILL_TYPE_ORDER.indexOf(b.type);
    });
  }, [selectedPhase]);

  const artifacts = PHASE_ARTIFACTS[selectedPhase.id] || [];

  const Icon = PHASE_ICONS[selectedPhase.id] || SettingsIcon;

  return (
    <div className="min-h-dvh flex flex-col">
      <InternalHeader>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">SDD Process</span>
        </nav>
      </InternalHeader>

      <div className="flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="mb-8"
          >
            <h1 className="text-2xl font-bold tracking-tight">Story-Driven Development</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {workflowPhases.length} phases &middot; {gates.length} quality gates &middot; {totalSkills} skills
            </p>
          </motion.div>

          {/* Phase stepper */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.05 }}
          >
            <Card className="mb-8 shadow-none">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-center gap-2 sm:gap-0">
                  {workflowPhases.map((phase, i) => {
                    // Gate fires at the END of a phase, before the next phase begins
                    // So show the gate on the connector AFTER this phase node
                    const gateForConnector = phase.gateNumber != null
                      ? gates.find((g) => g.id === GATE_ID_MAP[phase.gateNumber!]) ?? null
                      : null;
                    const connectorColors = PHASE_COLORS[phase.id] || defaultPhaseColor;
                    const isActiveGate = phase.id === selectedPhaseId && gateForConnector != null;

                    return (
                      <div key={phase.id} className="flex items-start">
                        <PhaseNode
                          phase={phase}
                          isSelected={phase.id === selectedPhaseId}
                          onClick={() => setSelectedPhaseId(phase.id)}
                          index={i}
                        />
                        {i < workflowPhases.length - 1 && (
                          <PhaseConnector
                            index={i}
                            gate={gateForConnector}
                            phaseColors={connectorColors}
                            isActiveGate={isActiveGate}
                            onGateClick={gateForConnector ? () => {
                              setSelectedPhaseId(phase.id);
                              setGateModalOpen(true);
                            } : undefined}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Phase detail */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedPhase.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={spring}
              className="space-y-6"
            >
              {/* Phase header + gate pill */}
              <div className="flex items-start gap-4">
                <div className={cn("flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm", colors.gradient)}>
                  <Icon className="size-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl font-bold tracking-tight">{selectedPhase.title}</h2>
                    {matchingGate ? (
                      <button
                        type="button"
                        onClick={() => setGateModalOpen(true)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all hover:shadow-sm",
                          colors.bg, colors.text, colors.border,
                        )}
                      >
                        <ShieldCheckIcon className="size-3" />
                        Gate {selectedPhase.gateNumber}: {matchingGate.title}
                        <ChevronRightIcon className="size-3 opacity-60" />
                      </button>
                    ) : (
                      <span className="rounded-full border border-border/40 px-3 py-1 text-xs text-muted-foreground">
                        No gate
                      </span>
                    )}
                  </div>
                  {matchingGate && (
                    <p className="mt-1 text-sm text-muted-foreground italic line-clamp-1">
                      &ldquo;{matchingGate.question}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              {/* Two-column: Skills | Artifacts + Agent */}
              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

                {/* Skills — ordered core → contextual → support */}
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <TerminalIcon className="size-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Skills
                    </h3>
                    <Badge variant="secondary" className="text-[10px]">{selectedPhase.skills.length}</Badge>
                  </div>

                  {/* Group by type */}
                  {SKILL_TYPE_ORDER.map((type) => {
                    const group = sortedSkills.filter((s) => s.type === type);
                    if (group.length === 0) return null;
                    const typeStyle = SKILL_TYPE_STYLES[type];
                    const startIndex = sortedSkills.findIndex((s) => s.type === type);
                    return (
                      <div key={type} className="mb-4">
                        <div className="mb-2 flex items-center gap-1.5">
                          <span className={cn("size-1.5 rounded-full", typeStyle.dot)} />
                          <span className={cn("text-[11px] uppercase tracking-wider", typeStyle.labelClass)}>
                            {typeStyle.label}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {group.map((skill, i) => (
                            <SkillRow key={skill.name} skill={skill} index={startIndex + i} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right column: Artifacts + Agent */}
                <div className="space-y-6">

                  {/* Artifacts */}
                  {artifacts.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <LayersIcon className="size-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          Artifacts
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {artifacts.map((artifact, i) => (
                          <motion.div
                            key={artifact.name}
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ ...spring, delay: i * 0.04 }}
                            className={cn("rounded-lg border p-3", colors.bg, colors.border)}
                          >
                            <p className="text-sm font-mono font-medium">{artifact.name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{artifact.description}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Agent — compact */}
                  {phaseAgents.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <BotIcon className="size-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          Agent{phaseAgents.length > 1 ? "s" : ""}
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {phaseAgents.map((agent) => (
                          <div
                            key={agent.id}
                            className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2.5"
                          >
                            <img
                              src={agent.avatar}
                              alt=""
                              className="size-8 rounded-full shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium leading-tight">{agent.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{agent.role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Epics at gate — compact */}
                  {matchingGate && phaseEpics.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <BrainCircuitIcon className="size-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          Epics at Gate
                        </h3>
                        <Badge variant="secondary" className="text-[10px]">{phaseEpics.length}</Badge>
                      </div>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {phaseEpics.map((epic, i) => (
                          <motion.a
                            key={`${epic.initiativeSlug}-${epic.slug}`}
                            href={`/dashboard?i=${epic.initiativeSlug}&e=${epic.slug}`}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ ...spring, delay: i * 0.025 }}
                            className="flex items-center gap-2 rounded-md border border-border/40 px-2.5 py-1.5 text-xs transition-colors hover:bg-muted/30"
                          >
                            {epic.prefix && (
                              <Badge variant="secondary" className="text-[9px] font-mono shrink-0">
                                {epic.prefix}
                              </Badge>
                            )}
                            <span className="font-medium truncate">{epic.title}</span>
                          </motion.a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Gate detail modal */}
      {matchingGate && (
        <GateModal
          gate={matchingGate}
          open={gateModalOpen}
          onClose={() => setGateModalOpen(false)}
          colors={colors}
        />
      )}
    </div>
  );
}
