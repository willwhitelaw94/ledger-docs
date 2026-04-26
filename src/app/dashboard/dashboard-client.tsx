"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { Initiative, Epic } from "@/lib/initiatives";
import { claimBounty, unclaimBounty, generateEpicSummary } from "./actions";
import { InternalHeader } from "@/components/internal-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  SidebarInset,
  SidebarProvider,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TcLogo } from "@/components/tc-logo";
import { InitiativeRail, RAIL_ICON_MAP } from "@/components/initiative-rail";
import {
  BanknoteIcon,
  HeartPulseIcon,
  UsersIcon,
  SmartphoneIcon,
  HandshakeIcon,
  WrenchIcon,
  TruckIcon,
  ClipboardListIcon,
  ZapIcon,
  PackageIcon,
  ChevronRightIcon,
  FileTextIcon,
  LightbulbIcon,
  PencilRulerIcon,
  ListChecksIcon,
  MapIcon,
  ArrowLeftIcon,
  KeyboardIcon,
  CheckIcon,
  CodeIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ExternalLinkIcon,
  XIcon,
  SearchIcon,
  MonitorIcon,
  TrophyIcon,
  BarChart3Icon,
  HomeIcon,
  MenuIcon,
  LayoutGridIcon,
  ListIcon,
  DownloadIcon,
  PrinterIcon,
  Columns3Icon,
  GripVerticalIcon,
  ChevronDownIcon,
} from "lucide-react";

/* ── Phase definitions ── */

const PHASES = [
  { id: "idea", label: "Discovery", icon: LightbulbIcon },
  { id: "spec", label: "Spec", icon: FileTextIcon },
  { id: "design", label: "Design", icon: PencilRulerIcon },
  { id: "dev", label: "Build", icon: CodeIcon },
  { id: "qa", label: "QA", icon: ShieldCheckIcon },
  { id: "release", label: "Release", icon: SparklesIcon },
] as const;

const GATE_IDS = ["idea", "spec", "design", "dev", "qa"];

type PhaseState = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  completed: boolean;
  isCurrent: boolean;
  gate?: { passed: boolean; date?: string; notes?: string; pr?: string };
};

function getPhaseStates(epic: Epic): PhaseState[] {
  const isReleased = [
    "release",
    "active",
    "ready for implementation",
  ].includes(epic.status.toLowerCase());

  if (isReleased) {
    return PHASES.map((phase) => ({
      ...phase,
      completed: true,
      isCurrent: false,
      gate: epic.gates[phase.id],
    }));
  }

  const hasGates = Object.keys(epic.gates).length > 0;

  if (hasGates) {
    let foundCurrent = false;
    return PHASES.map((phase) => {
      if (phase.id === "release") {
        return {
          ...phase,
          completed: false,
          isCurrent: false,
          gate: undefined,
        };
      }
      const gate = epic.gates[phase.id];
      const completed = gate?.passed === true;
      let isCurrent = false;
      if (!completed && !foundCurrent) {
        isCurrent = true;
        foundCurrent = true;
      }
      return { ...phase, completed, isCurrent, gate };
    });
  }

  // No gates — infer from status
  const statusPhaseIndex: Record<string, number> = {
    idea: 0,
    draft: 0,
    triaged: 0,
    backlog: -1,
    "to do": -1,
    planned: 1,
    planning: 1,
    design: 2,
    "in progress": 3,
    in_progress: 3,
    "peer review": 3,
    qa: 4,
    "ready for qa": 4,
    blocked: -1,
    "on hold": -1,
  };

  const currentIdx = statusPhaseIndex[epic.status.toLowerCase()] ?? -1;

  return PHASES.map((phase, i) => ({
    ...phase,
    completed: currentIdx >= 0 && i < currentIdx,
    isCurrent: i === currentIdx,
    gate: undefined,
  }));
}

/* ── Icon & colour maps ── */

const iconMap: Record<string, React.ReactNode> = {
  ADHOC: <ZapIcon />,
  "Budgets-And-Finance": <BanknoteIcon />,
  "Clinical-And-Care-Plan": <HeartPulseIcon />,
  "Consumer-Lifecycle": <UsersIcon />,
  "Consumer-Mobile": <SmartphoneIcon />,
  "Coordinator-Management": <HandshakeIcon />,
  Infrastructure: <WrenchIcon />,
  "Supplier-Management": <TruckIcon />,
  "Work-Management": <ClipboardListIcon />,
};

const statusDotColor: Record<string, string> = {
  "in progress": "bg-blue-500",
  in_progress: "bg-blue-500",
  design: "bg-purple-500",
  planning: "bg-amber-500",
  planned: "bg-amber-500",
  backlog: "bg-muted-foreground/40",
  blocked: "bg-red-500",
  "on hold": "bg-orange-500",
  qa: "bg-teal-500",
  "ready for qa": "bg-teal-500",
  "ready for implementation": "bg-emerald-500",
  release: "bg-emerald-500",
  "peer review": "bg-indigo-500",
  idea: "bg-pink-500",
  draft: "bg-muted-foreground/40",
  triaged: "bg-cyan-500",
  "to do": "bg-muted-foreground/40",
  active: "bg-emerald-500",
};

const statusBadgeColors: Record<string, string> = {
  "in progress": "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  in_progress: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  design: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  planning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  planned: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  backlog: "bg-muted text-muted-foreground",
  blocked: "bg-red-500/15 text-red-700 dark:text-red-400",
  "on hold": "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  qa: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  "ready for qa": "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  "ready for implementation":
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  release: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "peer review": "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  idea: "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  draft: "bg-muted text-muted-foreground",
  triaged: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  "to do": "bg-muted text-muted-foreground",
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

const artifactIcons: Record<string, React.ReactNode> = {
  "idea-brief": <LightbulbIcon className="size-3.5" />,
  spec: <FileTextIcon className="size-3.5" />,
  design: <PencilRulerIcon className="size-3.5" />,
  plan: <MapIcon className="size-3.5" />,
  tasks: <ListChecksIcon className="size-3.5" />,
  index: <FileTextIcon className="size-3.5" />,
};

/* ── Completeness helper for sorting ── */

/** Returns a 0–100 score representing how far along an epic is. */
function getEpicCompleteness(epic: Epic): number {
  const isReleased = ["release", "active", "ready for implementation"].includes(
    epic.status.toLowerCase()
  );
  if (isReleased) return 100;

  const hasGates = Object.keys(epic.gates).length > 0;
  if (hasGates) {
    const passed = GATE_IDS.filter((g) => epic.gates[g]?.passed).length;
    return Math.round((passed / GATE_IDS.length) * 100);
  }

  // Infer from status
  const statusWeight: Record<string, number> = {
    backlog: 0, "to do": 0, draft: 5, idea: 5, triaged: 10,
    planned: 20, planning: 20, design: 40, "in progress": 60,
    in_progress: 60, "peer review": 70, qa: 80, "ready for qa": 80,
    blocked: 30, "on hold": 30,
  };
  return statusWeight[epic.status.toLowerCase()] ?? 0;
}

/** Sort epics: priority first (urgent→high→medium→low→none), then in-progress, then completeness, then alpha. */
function sortEpicsByCompleteness(epics: Epic[]): Epic[] {
  return [...epics].sort((a, b) => {
    // Priority first (lower number = higher priority)
    const aPri = normalizePriority(a.priority);
    const bPri = normalizePriority(b.priority);
    if (aPri !== bPri) return aPri - bPri;
    // Then active epics
    const aActive = ["in progress", "in_progress"].includes(a.status.toLowerCase()) ? 1 : 0;
    const bActive = ["in progress", "in_progress"].includes(b.status.toLowerCase()) ? 1 : 0;
    if (bActive !== aActive) return bActive - aActive;
    // Then completeness
    const diff = getEpicCompleteness(b) - getEpicCompleteness(a);
    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title);
  });
}

/* ── Small components ── */

function StatusDot({ status }: { status: string }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "size-2 shrink-0 rounded-full cursor-default",
              statusDotColor[status.toLowerCase()] || "bg-muted-foreground/40"
            )}
          />
        }
      />
      <TooltipContent side="right" className="text-xs capitalize">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/* ── Linear-style priority icons ── */

function normalizePriority(raw?: string): number {
  if (!raw) return 4;
  const lower = raw.toLowerCase().trim();
  if (lower === "urgent" || lower === "p0") return 0;
  if (lower === "high" || lower === "p1") return 1;
  if (lower === "medium" || lower === "p2") return 2;
  if (lower === "low" || lower === "p3") return 3;
  return 4; // no priority
}

const priorityConfig: Record<number, { label: string; color: string; bars: number }> = {
  0: { label: "Urgent", color: "text-red-500", bars: 4 },
  1: { label: "High", color: "text-orange-500", bars: 3 },
  2: { label: "Medium", color: "text-amber-500", bars: 2 },
  3: { label: "Low", color: "text-blue-500", bars: 1 },
  4: { label: "No priority", color: "text-muted-foreground/40", bars: 0 },
};

function PriorityIcon({ priority, className }: { priority?: string; className?: string }) {
  const level = normalizePriority(priority);
  const config = priorityConfig[level];

  if (level === 0) {
    // Urgent: exclamation mark style like Linear
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span className={cn("shrink-0 cursor-default", className)}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={config.color}>
                <path d="M3 1.5h10l-1.5 9h-7L3 1.5z" fill="currentColor" opacity="0.9" />
                <circle cx="8" cy="13.5" r="1.5" fill="currentColor" />
              </svg>
            </span>
          }
        />
        <TooltipContent side="top" className="text-xs">{config.label}</TooltipContent>
      </Tooltip>
    );
  }

  // Bar-style icon like Linear (1-4 bars)
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className={cn("shrink-0 cursor-default", className)}>
            <svg width="14" height="14" viewBox="0 0 16 16" className={config.color}>
              {[0, 1, 2, 3].map((i) => (
                <rect
                  key={i}
                  x={1 + i * 3.5}
                  y={12 - (i + 1) * 2.5}
                  width="2.5"
                  height={(i + 1) * 2.5}
                  rx="0.5"
                  fill="currentColor"
                  opacity={i < config.bars ? 1 : 0.2}
                />
              ))}
            </svg>
          </span>
        }
      />
      <TooltipContent side="top" className="text-xs">{config.label}</TooltipContent>
    </Tooltip>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-xs capitalize",
        statusBadgeColors[status] || "bg-muted text-muted-foreground"
      )}
    >
      {status}
    </Badge>
  );
}

function MiniPhaseIndicator({ epic }: { epic: Epic }) {
  const states = getPhaseStates(epic);
  return (
    <div className="flex items-center gap-1">
      {states.map((state) => (
        <div
          key={state.id}
          className={cn(
            "size-1.5 rounded-full transition-colors",
            state.completed && "bg-emerald-500",
            state.isCurrent && "bg-blue-500",
            !state.completed && !state.isCurrent && "bg-muted-foreground/20"
          )}
        />
      ))}
    </div>
  );
}

/* Phase → artifact mapping */
const phaseArtifactMap: Record<string, string> = {
  idea: "idea-brief",
  spec: "spec",
  design: "design",
  dev: "plan",
  qa: "tasks",
};

function PhaseProgress({
  epic,
  onPhaseClick,
}: {
  epic: Epic;
  onPhaseClick?: (artifact: string) => void;
}) {
  const states = getPhaseStates(epic);

  return (
    <Card className="shadow-none border-border/50">
      <CardContent className="px-6 py-5">
        <div className="flex items-start">
          {states.map((state, i) => {
            const artifact = phaseArtifactMap[state.id];
            const hasDoc = artifact && epic.artifacts.includes(artifact);
            const isClickable = hasDoc && onPhaseClick;

            return (
            <Fragment key={state.id}>
              <div className="flex flex-col items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => isClickable && onPhaseClick(artifact)}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                    state.completed &&
                      "border-emerald-500 bg-emerald-500/10",
                    state.isCurrent &&
                      "border-blue-500 bg-blue-500/10 shadow-[0_0_12px_rgba(59,130,246,0.25)]",
                    !state.completed &&
                      !state.isCurrent &&
                      "border-muted-foreground/20",
                    isClickable && "cursor-pointer hover:scale-110 hover:shadow-md",
                    !isClickable && "cursor-default"
                  )}
                >
                  {state.completed ? (
                    <CheckIcon className="size-4 text-emerald-500" />
                  ) : (
                    <state.icon
                      className={cn(
                        "size-4",
                        state.isCurrent
                          ? "text-blue-500"
                          : "text-muted-foreground/30"
                      )}
                    />
                  )}
                </button>
                <span
                  className={cn(
                    "text-[11px] font-medium whitespace-nowrap",
                    state.completed &&
                      "text-emerald-600 dark:text-emerald-400",
                    state.isCurrent && "text-blue-600 dark:text-blue-400",
                    !state.completed &&
                      !state.isCurrent &&
                      "text-muted-foreground/40"
                  )}
                >
                  {state.label}
                </span>
                {state.gate?.date && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {new Date(state.gate.date).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                )}
              </div>
              {i < states.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 rounded-full mt-5 mx-1",
                    state.completed
                      ? "bg-emerald-500/40"
                      : "bg-muted-foreground/15"
                  )}
                />
              )}
            </Fragment>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Markdown helpers ── */

type Heading = { level: number; text: string; id: string };

function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  for (const line of markdown.split("\n")) {
    const match = line.match(/^(#{1,4})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2]
        .replace(/\[(.+?)\]\(.+?\)/g, "$1")
        .replace(/[*_`#]/g, "")
        .trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      if (text) headings.push({ level, text, id });
    }
  }
  return headings;
}

function childrenToText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(childrenToText).join("");
  if (children && typeof children === "object" && "props" in children) {
    return childrenToText(
      (children as React.ReactElement<{ children?: React.ReactNode }>).props
        .children
    );
  }
  return "";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const markdownHeadingComponents: Record<string, React.ComponentType<any>> = {
  h1: ({ children, node: _n, ...props }: any) => (
    <h1
      id={slugify(childrenToText(children))}
      className="scroll-mt-20"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, node: _n, ...props }: any) => (
    <h2
      id={slugify(childrenToText(children))}
      className="scroll-mt-20"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, node: _n, ...props }: any) => (
    <h3
      id={slugify(childrenToText(children))}
      className="scroll-mt-20"
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, node: _n, ...props }: any) => (
    <h4
      id={slugify(childrenToText(children))}
      className="scroll-mt-20"
      {...props}
    >
      {children}
    </h4>
  ),
};
/* eslint-enable @typescript-eslint/no-explicit-any */

function TableOfContents({ headings }: { headings: Heading[] }) {
  return (
    <nav className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
      <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-4">
        On this page
      </p>
      <div className="relative border-l border-border/40">
        <div className="flex flex-col gap-0.5">
          {headings.map((heading) => (
            <a
              key={heading.id}
              href={`#${heading.id}`}
              className={cn(
                "block text-[12px] leading-relaxed text-muted-foreground/70 transition-all duration-150 hover:text-foreground -ml-px border-l-2 border-transparent hover:border-primary",
                heading.level <= 2 && "font-medium text-muted-foreground pl-3 py-1",
                heading.level === 3 && "pl-5 py-0.5",
                heading.level === 4 && "pl-7 py-0.5 text-[11px]"
              )}
            >
              {heading.text}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

/* ── Animation variants ── */

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

const fadeSlide = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { type: "spring" as const, stiffness: 300, damping: 26 },
};

/* ── Bounty claim badge + modal ── */

function BountyBadge({
  epic,
  onClaimed,
  onUnclaimed,
}: {
  epic: Epic;
  onClaimed: (name: string) => void;
  onUnclaimed: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const isClaimed = !!epic.bountyClaimedBy;

  async function handleClaim() {
    if (!name.trim()) return;
    setSaving(true);
    const result = await claimBounty(epic.initiative, epic.slug, name.trim());
    setSaving(false);
    if (result.success) {
      onClaimed(name.trim());
      setOpen(false);
      setName("");
    }
  }

  async function handleUnclaim() {
    setSaving(true);
    const result = await unclaimBounty(epic.initiative, epic.slug);
    setSaving(false);
    if (result.success) {
      onUnclaimed();
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs cursor-pointer transition-colors hover:bg-accent",
              isClaimed
                ? "border-amber-500/30 text-amber-600 dark:text-amber-400"
                : "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            )}
          >
            ${epic.bountyValue!.toLocaleString()}
            {epic.bountyClaimedBy && (
              <span className="font-sans">· {epic.bountyClaimedBy}</span>
            )}
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isClaimed ? "Bounty Claimed" : "Claim Bounty"}
          </DialogTitle>
          <DialogDescription>
            {isClaimed
              ? `This $${epic.bountyValue!.toLocaleString()} bounty was claimed by ${epic.bountyClaimedBy}${epic.bountyClaimedDate ? ` on ${epic.bountyClaimedDate}` : ""}.`
              : `Claim the $${epic.bountyValue!.toLocaleString()} bounty for ${epic.title}.`}
          </DialogDescription>
        </DialogHeader>
        {isClaimed ? (
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnclaim}
              disabled={saving}
            >
              {saving ? "Removing..." : "Remove Claim"}
            </Button>
          </DialogFooter>
        ) : (
          <>
            <div className="py-2">
              <Input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleClaim()}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleClaim} disabled={saving || !name.trim()}>
                {saving ? "Claiming..." : "Claim Bounty"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Main layout ── */


export function DashboardShell({
  initiatives,
  embedded = false,
}: {
  initiatives: Initiative[];
  embedded?: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedInitiative, setSelectedInitiative] =
    useState<Initiative | null>(null);
  const [selectedEpic, setSelectedEpic] = useState<Epic | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [epicSort, setEpicSort] = useState<"alpha" | "stage" | "priority">("stage");
  const [hideBacklog, setHideBacklog] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [draggedEpicSlug, setDraggedEpicSlug] = useState<string | null>(null);
  const [epicOrder, setEpicOrder] = useState<Record<string, string[]>>({});
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [artifactContent, setArtifactContent] = useState<string | null>(null);
  const [artifactLoading, setArtifactLoading] = useState(false);
  const [mockupTabsExpanded, setMockupTabsExpanded] = useState(false);
  const [mockupViewer, setMockupViewer] = useState<{
    url: string;
    title: string;
    epicTitle: string;
    initiative: string;
    epicSlug: string;
    allMockups: { name: string; path: string; group?: string }[];
  } | null>(null);

  // Hydrate from URL params on mount and when searchParams change (e.g. rail clicks from orchestrator)
  useEffect(() => {
    const i = searchParams.get("i");
    const e = searchParams.get("e");
    const a = searchParams.get("a");
    if (i) {
      const init = initiatives.find((x) => x.slug === i);
      if (init) {
        setSelectedInitiative(init);
        setPanelOpen(true);
        if (e) {
          const epic = init.epics.find((x) => x.slug === e);
          if (epic) {
            setSelectedEpic(epic);
            if (a) setSelectedArtifact(a);
            else setSelectedArtifact(null);
          } else {
            setSelectedEpic(null);
            setSelectedArtifact(null);
          }
        } else {
          setSelectedEpic(null);
          setSelectedArtifact(null);
        }
      }
    } else {
      setSelectedInitiative(null);
      setSelectedEpic(null);
      setSelectedArtifact(null);
      setPanelOpen(false);
    }
  }, [searchParams, initiatives]);

  // Sync state to URL (push so back button works)
  const updateUrl = useCallback(
    (init: Initiative | null, epic: Epic | null, artifact: string | null) => {
      const params = new URLSearchParams();
      if (init) params.set("i", init.slug);
      if (epic) params.set("e", epic.slug);
      if (artifact) params.set("a", artifact);
      const qs = params.toString();
      router.push("/dashboard" + (qs ? "?" + qs : ""), { scroll: false });
    },
    [router]
  );

  // Restore state from URL on popstate (back/forward)
  const restoreFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const i = params.get("i");
    const e = params.get("e");
    const a = params.get("a");

    if (i) {
      const init = initiatives.find((x) => x.slug === i);
      if (init) {
        setSelectedInitiative(init);
        setPanelOpen(true);
        if (e) {
          const epic = init.epics.find((x) => x.slug === e);
          if (epic) {
            setSelectedEpic(epic);
            setSelectedArtifact(a || null);
          } else {
            setSelectedEpic(null);
            setSelectedArtifact(null);
          }
        } else {
          setSelectedEpic(null);
          setSelectedArtifact(null);
        }
      }
    } else {
      setSelectedInitiative(null);
      setSelectedEpic(null);
      setSelectedArtifact(null);
      setPanelOpen(false);
    }
  }, [initiatives]);

  useEffect(() => {
    const onPopState = () => restoreFromUrl();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [restoreFromUrl]);

  // Fetch artifact content on demand
  useEffect(() => {
    if (!selectedArtifact || !selectedEpic || !selectedInitiative) {
      setArtifactContent(null);
      return;
    }
    // Check if already cached on the epic object
    if (selectedEpic.artifactContent[selectedArtifact]) {
      setArtifactContent(selectedEpic.artifactContent[selectedArtifact]);
      return;
    }
    let cancelled = false;
    setArtifactLoading(true);
    setArtifactContent(null);
    fetch(`/api/artifact?initiative=${selectedEpic.initiative}&epic=${selectedEpic.slug}&artifact=${selectedArtifact}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.content) {
          // Cache it on the epic so we don't re-fetch
          selectedEpic.artifactContent[selectedArtifact] = data.content;
          setArtifactContent(data.content);
        }
        setArtifactLoading(false);
      })
      .catch(() => {
        if (!cancelled) setArtifactLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedArtifact, selectedEpic, selectedInitiative]);

  function handleRailClick(initiative: Initiative) {
    if (selectedInitiative?.slug === initiative.slug && panelOpen) {
      setPanelOpen(false);
    } else {
      setSelectedInitiative(initiative);
      setSelectedEpic(null);
      setSelectedArtifact(null);
      setPanelOpen(true);
      updateUrl(initiative, null, null);
    }
  }

  function selectEpic(epic: Epic, initiative: Initiative) {
    setSelectedInitiative(initiative);
    setSelectedEpic(epic);
    setSelectedArtifact(null);
    setAiSummary(null);
    updateUrl(initiative, epic, null);
  }

  // Stage ordering for sort
  const stageOrder: Record<string, number> = {
    "in progress": 0,
    in_progress: 0,
    "peer review": 1,
    design: 2,
    planning: 3,
    planned: 3,
    qa: 4,
    "ready for qa": 4,
    blocked: 5,
    "on hold": 6,
    idea: 7,
    draft: 7,
    triaged: 8,
    backlog: 9,
    "to do": 9,
    "ready for implementation": 10,
    release: 11,
    active: 11,
  };

  const BACKLOG_STATUSES = ["backlog", "to do", "draft", "triaged"];

  const COMPLETED_STATUSES = ["release", "active", "ready for implementation"];

  function filterAndSortEpics(epics: Epic[]): Epic[] {
    let filtered = epics;
    if (hideBacklog) {
      filtered = filtered.filter((e) => !BACKLOG_STATUSES.includes(e.status.toLowerCase()));
    }
    if (hideCompleted) {
      filtered = filtered.filter((e) => !COMPLETED_STATUSES.includes(e.status.toLowerCase()));
    }

    return [...filtered].sort((a, b) => {
      if (epicSort === "stage") {
        const aOrder = stageOrder[a.status.toLowerCase()] ?? 99;
        const bOrder = stageOrder[b.status.toLowerCase()] ?? 99;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.title.localeCompare(b.title);
      }
      if (epicSort === "priority") {
        const aPri = normalizePriority(a.priority);
        const bPri = normalizePriority(b.priority);
        if (aPri !== bPri) return aPri - bPri;
        return a.title.localeCompare(b.title);
      }
      return a.title.localeCompare(b.title);
    });
  }


  // Drag-to-reorder handlers for list view
  function handleDragStart(e: React.DragEvent, slug: string) {
    setDraggedEpicSlug(slug);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", slug);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, targetSlug: string, initSlug: string) {
    e.preventDefault();
    const sourceSlug = e.dataTransfer.getData("text/plain");
    if (!sourceSlug || sourceSlug === targetSlug) {
      setDraggedEpicSlug(null);
      return;
    }

    setEpicOrder((prev) => {
      const currentOrder = prev[initSlug] ?? filterAndSortEpics(
        initiatives.find((i) => i.slug === initSlug)?.epics ?? []
      ).map((ep) => ep.slug);

      const order = [...currentOrder];
      const fromIdx = order.indexOf(sourceSlug);
      const toIdx = order.indexOf(targetSlug);
      if (fromIdx === -1 || toIdx === -1) return prev;

      order.splice(fromIdx, 1);
      order.splice(toIdx, 0, sourceSlug);

      return { ...prev, [initSlug]: order };
    });
    setDraggedEpicSlug(null);
  }

  function handleDragEnd() {
    setDraggedEpicSlug(null);
  }

  // Get ordered epics (custom order if set, otherwise filtered/sorted)
  function getOrderedEpics(init: Initiative): Epic[] {
    const sorted = filterAndSortEpics(init.epics);
    const customOrder = epicOrder[init.slug];
    if (!customOrder) return sorted;

    // Re-apply filters but use custom order
    const slugSet = new Set(sorted.map((e) => e.slug));
    const epicMap = new Map(sorted.map((e) => [e.slug, e]));
    const ordered: Epic[] = [];
    for (const slug of customOrder) {
      if (slugSet.has(slug)) {
        ordered.push(epicMap.get(slug)!);
        slugSet.delete(slug);
      }
    }
    // Append any new epics not in the custom order
    for (const slug of slugSet) {
      ordered.push(epicMap.get(slug)!);
    }
    return ordered;
  }

  return (
    <>
    <SidebarProvider
      open={panelOpen}
      onOpenChange={setPanelOpen}
      style={{ "--sidebar-width": "18rem" } as CSSProperties}
    >
      {!embedded && (
        <InitiativeRail
          initiatives={initiatives}
          activeSlug={panelOpen ? selectedInitiative?.slug : null}
          onSelect={handleRailClick}
        />
      )}

      {/* ── Expandable epic panel ── */}
      <div
        className={cn(
          "fixed inset-y-0 left-[60px] z-20 hidden w-[var(--sidebar-width)] border-r border-sidebar-border bg-card transition-transform duration-200 ease-in-out md:flex md:flex-col",
          panelOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-sidebar-border px-4">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-semibold truncate text-sidebar-foreground">
              {selectedInitiative?.title ?? "Select an initiative"}
            </span>
            {selectedInitiative && (
              <span className="text-[11px] text-sidebar-foreground/50">
                {selectedInitiative.epics.length} epics
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            className="shrink-0 rounded-md p-1 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <XIcon className="size-4" />
          </button>
        </div>
        <ScrollArea className="flex-1">
          {selectedInitiative && (
            <div className="px-2 py-2">
              <div className="flex items-center justify-between px-2 pb-1.5">
                <p className="text-[11px] font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                  Epics
                </p>
                <div className="flex items-center gap-1">
                  {/* Sort toggle */}
                  <div className="flex items-center rounded border border-sidebar-border/50 p-px">
                    {(["stage", "alpha", "priority"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setEpicSort(mode)}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors",
                          epicSort === mode
                            ? "bg-sidebar-accent text-sidebar-foreground"
                            : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70"
                        )}
                      >
                        {mode === "stage" ? "Stage" : mode === "alpha" ? "A-Z" : "P1→"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filter toggles */}
              <div className="mb-1.5 flex flex-col gap-0.5">
                {selectedInitiative.epics.some((e) => BACKLOG_STATUSES.includes(e.status.toLowerCase())) && (
                  <button
                    type="button"
                    onClick={() => setHideBacklog(!hideBacklog)}
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-[10px] text-sidebar-foreground/40 transition-colors hover:text-sidebar-foreground/70"
                  >
                    <span className={cn(
                      "flex size-3 items-center justify-center rounded border transition-colors",
                      hideBacklog
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-sidebar-foreground/20"
                    )}>
                      {hideBacklog && <CheckIcon className="size-2" />}
                    </span>
                    Hide backlog ({selectedInitiative.epics.filter((e) => BACKLOG_STATUSES.includes(e.status.toLowerCase())).length})
                  </button>
                )}
                {selectedInitiative.epics.some((e) => COMPLETED_STATUSES.includes(e.status.toLowerCase())) && (
                  <button
                    type="button"
                    onClick={() => setHideCompleted(!hideCompleted)}
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-[10px] text-sidebar-foreground/40 transition-colors hover:text-sidebar-foreground/70"
                  >
                    <span className={cn(
                      "flex size-3 items-center justify-center rounded border transition-colors",
                      hideCompleted
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-sidebar-foreground/20"
                    )}>
                      {hideCompleted && <CheckIcon className="size-2" />}
                    </span>
                    Hide completed ({selectedInitiative.epics.filter((e) => COMPLETED_STATUSES.includes(e.status.toLowerCase())).length})
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-0.5">
                {filterAndSortEpics(selectedInitiative.epics).map(
                  (epic) => (
                    <div key={epic.slug} className="group flex items-center">
                      <button
                        type="button"
                        onClick={() =>
                          selectEpic(epic, selectedInitiative)
                        }
                        className={cn(
                          "flex flex-1 min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                          "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                          selectedEpic?.slug === epic.slug &&
                            "bg-sidebar-accent text-sidebar-foreground font-medium"
                        )}
                      >
                        <StatusDot status={epic.status} />
                        <span className="truncate">{epic.title}</span>
                      </button>
                      <div className="flex shrink-0 items-center">
                        {epic.mockups.length > 0 && (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  type="button"
                                  className="flex size-5 items-center justify-center rounded-md text-purple-400/50 hover:text-purple-400 hover:bg-sidebar-accent transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const m = epic.mockups[0];
                                    setMockupTabsExpanded(false);
                                    setMockupViewer({
                                      url: `/api/mockup?path=${m.path}`,
                                      title: m.name,
                                      epicTitle: epic.title,
                                      initiative: epic.initiative,
                                      epicSlug: epic.slug,
                                      allMockups: epic.mockups,
                                    });
                                  }}
                                >
                                  <MonitorIcon className="size-3" />
                                </button>
                              }
                            />
                            <TooltipContent side="right" className="text-xs">
                              View mockup ({epic.mockups.length})
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {epic.linearUrl ? (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <a
                                  href={epic.linearUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex size-5 items-center justify-center rounded-md text-sidebar-foreground/30 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLinkIcon className="size-3" />
                                </a>
                              }
                            />
                            <TooltipContent side="right" className="text-xs">
                              Open in Linear
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="size-5" />
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ── Main area ── */}
      <SidebarInset
        className={cn(
          "transition-[margin] duration-200 ease-in-out",
          panelOpen && "md:ml-[var(--sidebar-width)]"
        )}
      >
        {!embedded && (
        <InternalHeader>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors md:hidden"
          >
            <MenuIcon className="size-5" />
          </button>
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <button
              type="button"
              onClick={() => {
                setSelectedInitiative(null);
                setSelectedEpic(null);
                setSelectedArtifact(null);
                setPanelOpen(false);
                updateUrl(null, null, null);
              }}
              className={cn(
                "rounded-md px-2 py-1 transition-colors hover:text-foreground",
                !selectedInitiative && "font-medium text-foreground"
              )}
            >
              Initiatives
            </button>
            {selectedInitiative && (
              <>
                <ChevronRightIcon className="size-3.5 shrink-0" />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEpic(null);
                    setSelectedArtifact(null);
                    updateUrl(selectedInitiative, null, null);
                  }}
                  className={cn(
                    "max-w-[180px] truncate rounded-md px-2 py-1 transition-colors hover:text-foreground",
                    !selectedEpic && "font-medium text-foreground"
                  )}
                >
                  {selectedInitiative.title}
                </button>
              </>
            )}
            {selectedEpic && (
              <>
                <ChevronRightIcon className="size-3.5 shrink-0 hidden sm:block" />
                <button
                  type="button"
                  onClick={() => { setSelectedArtifact(null); updateUrl(selectedInitiative, selectedEpic, null); }}
                  className={cn(
                    "max-w-[180px] truncate rounded-md px-2 py-1 transition-colors hover:text-foreground hidden sm:block",
                    !selectedArtifact && "font-medium text-foreground"
                  )}
                >
                  {selectedEpic.title}
                </button>
              </>
            )}
            {selectedArtifact && (
              <>
                <ChevronRightIcon className="size-3.5 shrink-0 hidden md:block" />
                <span className="max-w-[180px] truncate rounded-md px-2 py-1 font-medium capitalize text-foreground hidden md:block">
                  {selectedArtifact.replace(/-/g, " ")}
                </span>
              </>
            )}
          </nav>
        </InternalHeader>
        )}

        <div className="flex-1 px-4 py-6 sm:px-6">
          <AnimatePresence mode="wait">
            {/* ── Epic detail view ── */}
            {selectedEpic ? (
              <motion.div
                key={`epic-${selectedEpic.slug}`}
                {...fadeSlide}
                className={cn("mx-auto space-y-6", selectedArtifact ? "max-w-5xl" : "max-w-3xl")}
              >
                {/* Epic header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      {selectedEpic.prefix && (
                        <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {selectedEpic.prefix}
                        </span>
                      )}
                      <h1 className="text-2xl font-bold tracking-tight">
                        {selectedEpic.title}
                      </h1>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedInitiative?.title}
                    </p>
                    {selectedEpic.summary && (
                      <p className="mt-2 text-sm text-muted-foreground/80 max-w-xl">
                        {selectedEpic.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Mockup button */}
                    {selectedEpic.mockups.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const m = selectedEpic.mockups[0];
                          setMockupTabsExpanded(false);
                          setMockupViewer({
                            url: `/api/mockup?path=${m.path}`,
                            title: m.name,
                            epicTitle: selectedEpic.title,
                            initiative: selectedEpic.initiative,
                            epicSlug: selectedEpic.slug,
                            allMockups: selectedEpic.mockups,
                          });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-400 transition-colors hover:bg-purple-500/20"
                      >
                        <MonitorIcon className="size-3" />
                        Mockup
                        {selectedEpic.mockups.length > 1 && (
                          <span className="text-purple-400/60">({selectedEpic.mockups.length})</span>
                        )}
                      </button>
                    )}
                    {/* Linear button */}
                    {selectedEpic.linearUrl && (
                      <a
                        href={selectedEpic.linearUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <ExternalLinkIcon className="size-3" />
                        Linear
                      </a>
                    )}
                    {selectedEpic.bountyValue != null &&
                      selectedEpic.bountyValue > 0 && (
                        <BountyBadge
                          epic={selectedEpic}
                          onClaimed={(name) => {
                            selectedEpic.bountyClaimedBy = name;
                            selectedEpic.bountyClaimedDate = new Date().toISOString().split("T")[0];
                            setSelectedEpic({ ...selectedEpic });
                          }}
                          onUnclaimed={() => {
                            selectedEpic.bountyClaimedBy = undefined;
                            selectedEpic.bountyClaimedDate = undefined;
                            setSelectedEpic({ ...selectedEpic });
                          }}
                        />
                      )}
                    <PriorityIcon priority={selectedEpic.priority} />
                    <StatusBadge status={selectedEpic.status} />
                  </div>
                </div>

                {/* Phase progress stepper */}
                <PhaseProgress
                  epic={selectedEpic}
                  onPhaseClick={(artifact) => {
                    setSelectedArtifact(artifact);
                    updateUrl(selectedInitiative, selectedEpic, artifact);
                  }}
                />

                {/* Document grid */}
                {selectedEpic.artifacts.filter((a) => a !== "index").length > 0 && !selectedArtifact && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-medium text-muted-foreground">
                      Documents
                    </h2>
                    <motion.div
                      className="grid gap-3 sm:grid-cols-2"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {selectedEpic.artifacts.filter((a) => a !== "index").map((artifact) => (
                        <motion.div key={artifact} variants={itemVariants}>
                          <Card
                            className="cursor-pointer shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                            onClick={() => { setSelectedArtifact(artifact); updateUrl(selectedInitiative, selectedEpic, artifact); }}
                          >
                            <CardContent className="flex items-center gap-3 p-4">
                              <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                                {artifactIcons[artifact] || (
                                  <FileTextIcon className="size-3.5" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium capitalize">
                                  {artifact.replace(/-/g, " ")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {artifact}.md
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                )}

                {/* Artifact content viewer */}
                {selectedArtifact && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 24,
                      }}
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <button
                          onClick={() => { setSelectedArtifact(null); updateUrl(selectedInitiative, selectedEpic, null); }}
                          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <ArrowLeftIcon className="size-3.5" />
                          Documents
                        </button>
                        <Separator
                          orientation="vertical"
                          className="h-4"
                        />
                        <div className="flex items-center gap-2">
                          {artifactIcons[selectedArtifact] || (
                            <FileTextIcon className="size-3.5" />
                          )}
                          <span className="text-sm font-medium capitalize">
                            {selectedArtifact.replace(/-/g, " ")}
                          </span>
                        </div>
                        <div className="ml-auto flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  onClick={() => window.open(`/api/download?initiative=${selectedEpic.initiative}&epic=${selectedEpic.slug}&artifact=${selectedArtifact}&format=md`)}
                                  className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                >
                                  <DownloadIcon className="size-3.5" />
                                  <span className="hidden sm:inline">MD</span>
                                </button>
                              }
                            />
                            <TooltipContent side="bottom" className="text-xs">Download Markdown</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  onClick={() => window.open(`/api/download?initiative=${selectedEpic.initiative}&epic=${selectedEpic.slug}&artifact=${selectedArtifact}&format=html`)}
                                  className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                >
                                  <PrinterIcon className="size-3.5" />
                                  <span className="hidden sm:inline">Print</span>
                                </button>
                              }
                            />
                            <TooltipContent side="bottom" className="text-xs">Open printable version</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      {artifactLoading ? (
                        <Card className="shadow-none">
                          <CardContent className="flex items-center justify-center p-12">
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
                              Loading document...
                            </div>
                          </CardContent>
                        </Card>
                      ) : artifactContent ? (() => {
                        const content = artifactContent;
                        const headings = extractHeadings(content);
                        return (
                          <div className="flex gap-8">
                            <Card className="shadow-none flex-1 min-w-0">
                              <CardContent className="p-6 sm:p-8">
                                <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-lg prose-h3:text-base prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-a:text-primary prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-hr:border-border prose-table:text-sm prose-th:text-left prose-th:font-medium">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={markdownHeadingComponents}
                                  >
                                    {content}
                                  </ReactMarkdown>
                                </div>
                              </CardContent>
                            </Card>
                            {headings.length > 2 && (
                              <aside className="hidden xl:block w-52 shrink-0 self-stretch">
                                <TableOfContents headings={headings} />
                              </aside>
                            )}
                          </div>
                        );
                      })() : null}
                    </motion.div>
                  )}
              </motion.div>
            ) : selectedInitiative ? (
              /* ── Initiative detail — epic grid ── */
              <motion.div
                key={`initiative-${selectedInitiative.slug}`}
                {...fadeSlide}
                className="mx-auto max-w-4xl"
              >
                <div className="mb-6 flex items-end justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                      {selectedInitiative.title}
                    </h1>
                    {selectedInitiative.description && (
                      <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
                        {selectedInitiative.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Filter toggles */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setHideCompleted(!hideCompleted)}
                        className={cn(
                          "rounded-md px-2 py-1 text-xs transition-colors",
                          hideCompleted
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {hideCompleted ? "Show" : "Hide"} completed
                      </button>
                      {selectedInitiative.epics.some((e) => BACKLOG_STATUSES.includes(e.status.toLowerCase())) && (
                        <button
                          type="button"
                          onClick={() => setHideBacklog(!hideBacklog)}
                          className={cn(
                            "rounded-md px-2 py-1 text-xs transition-colors",
                            hideBacklog
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {hideBacklog ? "Show" : "Hide"} backlog
                        </button>
                      )}
                    </div>
                    {/* Sort */}
                    <div className="flex items-center rounded-lg border p-0.5">
                      {(["stage", "alpha", "priority"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setEpicSort(mode)}
                          className={cn(
                            "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                            epicSort === mode
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {mode === "stage" ? "Stage" : mode === "alpha" ? "A\u2013Z" : "Priority"}
                        </button>
                      ))}
                    </div>
                    {/* View toggle */}
                    <div className="flex items-center rounded-lg border p-0.5">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={cn(
                          "rounded-md p-1.5 transition-colors",
                          viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <LayoutGridIcon className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={cn(
                          "rounded-md p-1.5 transition-colors",
                          viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <ListIcon className="size-3.5" />
                      </button>
                      <a
                        href={`/dashboard?mode=plan?initiative=${selectedInitiative.slug}`}
                        className="rounded-md p-1.5 transition-colors text-muted-foreground hover:text-foreground"
                        title="Planning"
                      >
                        <Columns3Icon className="size-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
                {viewMode === "grid" ? (
                  <motion.div
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {filterAndSortEpics(selectedInitiative.epics).map((epic) => (
                      <motion.div
                        key={epic.slug}
                        variants={itemVariants}
                        whileHover={{
                          y: -2,
                          transition: { duration: 0.15 },
                        }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <Card
                          className="h-full cursor-pointer shadow-none transition-shadow duration-200 hover:shadow-md"
                          onClick={() =>
                            selectEpic(epic, selectedInitiative)
                          }
                        >
                          <CardContent className="flex h-full flex-col gap-3 p-4">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium">
                                {epic.title}
                              </p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <PriorityIcon priority={epic.priority} />
                                <StatusBadge status={epic.status} />
                              </div>
                            </div>
                            {epic.summary && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {epic.summary}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-auto">
                              <MiniPhaseIndicator epic={epic} />
                              {epic.artifacts.filter((a) => a !== "index").length > 0 && (
                                <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                  <FileTextIcon className="size-3" />
                                  {epic.artifacts.filter((a) => a !== "index").length} doc{epic.artifacts.filter((a) => a !== "index").length !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : viewMode === "list" ? (
                  <motion.div
                    className="space-y-0.5"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {getOrderedEpics(selectedInitiative).map((epic) => {
                      const docCount = epic.artifacts.filter((a) => a !== "index").length;
                      return (
                        <motion.div
                          key={epic.slug}
                          variants={itemVariants}
                          draggable
                          onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, epic.slug)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e as unknown as React.DragEvent, epic.slug, selectedInitiative.slug)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "group rounded-lg transition-colors",
                            draggedEpicSlug === epic.slug && "opacity-40"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => selectEpic(epic, selectedInitiative)}
                            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/50"
                          >
                            <GripVerticalIcon className="size-3 shrink-0 text-muted-foreground/20 cursor-grab group-hover:text-muted-foreground/50 transition-colors" />
                            <PriorityIcon priority={epic.priority} />
                            <span className="flex-1 min-w-0 text-sm font-medium truncate">{epic.title}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <MiniPhaseIndicator epic={epic} />
                              {docCount > 0 && (
                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                  <FileTextIcon className="size-3" />
                                  {docCount}
                                </span>
                              )}
                              <StatusBadge status={epic.status} />
                            </div>
                          </button>
                        </motion.div>
                      );
                    })}
                    {epicOrder[selectedInitiative.slug] && (
                      <p className="pt-2 text-center text-[10px] text-muted-foreground">
                        Custom order active — drag to reorder
                      </p>
                    )}
                  </motion.div>
                ) : null}
              </motion.div>
            ) : (
              /* ── All initiatives overview ── */
              <motion.div
                key="all-initiatives"
                {...fadeSlide}
                className="mx-auto max-w-4xl"
              >
                <div className="mb-6">
                  <h1 className="text-2xl font-bold tracking-tight">
                    All Initiatives
                  </h1>
                </div>

                <motion.div
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {initiatives.map((initiative) => {
                    const inProg = initiative.epics.filter(
                      (e) =>
                        e.status === "in progress" ||
                        e.status === "in_progress"
                    ).length;
                    const released = initiative.epics.filter((e) =>
                      [
                        "release",
                        "active",
                        "ready for implementation",
                      ].includes(e.status.toLowerCase())
                    ).length;

                    // Gate-based progress
                    const totalGates =
                      initiative.epics.length * GATE_IDS.length;
                    let passedGates = 0;
                    for (const epic of initiative.epics) {
                      const isReleased = [
                        "release",
                        "active",
                        "ready for implementation",
                      ].includes(epic.status.toLowerCase());
                      for (const gid of GATE_IDS) {
                        if (epic.gates[gid]?.passed || isReleased)
                          passedGates++;
                      }
                    }
                    const pct =
                      totalGates > 0
                        ? Math.round((passedGates / totalGates) * 100)
                        : 0;

                    return (
                      <motion.div
                        key={initiative.slug}
                        variants={itemVariants}
                        whileHover={{
                          y: -2,
                          transition: { duration: 0.15 },
                        }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <Card
                          className="h-full cursor-pointer shadow-none transition-shadow duration-200 hover:shadow-md"
                          onClick={() => handleRailClick(initiative)}
                        >
                          <CardContent className="flex h-full flex-col gap-3 p-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground [&>svg]:size-4">
                                {iconMap[initiative.slug] || (
                                  <ClipboardListIcon />
                                )}
                              </div>
                              <p className="text-sm font-semibold">
                                {initiative.title}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                              {initiative.description ||
                                initiative.epics
                                  .slice(0, 3)
                                  .map((e) => e.title)
                                  .join(", ") +
                                  (initiative.epics.length > 3 ? "..." : "")}
                            </p>
                            <div className="space-y-2 mt-auto">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                  {initiative.epics.length} epics
                                </span>
                                <div className="flex items-center gap-2">
                                  {inProg > 0 && (
                                    <span className="text-blue-600 dark:text-blue-400">
                                      {inProg} active
                                    </span>
                                  )}
                                  {released > 0 && (
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                      {released} shipped
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Progress value={pct} className="h-1" />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SidebarInset>

      {/* ── Mobile navigation drawer ── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="text-sm">Initiatives</SheetTitle>
            <SheetDescription className="sr-only">Navigate initiatives and epics</SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 h-[calc(100dvh-4rem)]">
            <div className="py-2">
              {initiatives.map((initiative) => {
                const Icon = RAIL_ICON_MAP[initiative.slug] || ClipboardListIcon;
                const isSelected = selectedInitiative?.slug === initiative.slug;
                return (
                  <div key={initiative.slug}>
                    <button
                      type="button"
                      onClick={() => {
                        handleRailClick(initiative);
                        if (!isSelected) return;
                        setMobileOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-accent",
                        isSelected && "bg-accent font-medium"
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{initiative.title}</span>
                      <ChevronRightIcon className={cn(
                        "ml-auto size-3.5 text-muted-foreground/50 transition-transform",
                        isSelected && "rotate-90"
                      )} />
                    </button>
                    {isSelected && (
                      <div className="py-1 pl-7">
                        {sortEpicsByCompleteness(initiative.epics).map((epic) => (
                          <button
                            key={epic.slug}
                            type="button"
                            onClick={() => {
                              selectEpic(epic, initiative);
                              setMobileOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center gap-2 px-4 py-1.5 text-xs transition-colors hover:bg-accent rounded-md",
                              selectedEpic?.slug === epic.slug && "bg-accent font-medium"
                            )}
                          >
                            <StatusDot status={epic.status} />
                            <span className="truncate">{epic.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

    </SidebarProvider>

      {/* ── Full-screen mockup viewer ── */}
      <AnimatePresence>
        {mockupViewer && (() => {
          const groups = new Map<string, typeof mockupViewer.allMockups>();
          for (const m of mockupViewer.allMockups) {
            const key = m.group || "Mockups";
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(m);
          }

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] flex flex-col bg-background"
            >
              {/* Top nav bar */}
              <div className="shrink-0 border-b bg-card">
                {/* Title row */}
                <div className="flex h-10 items-center justify-between px-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MonitorIcon className="size-4 text-purple-400 shrink-0" />
                    <span className="text-sm font-semibold truncate">{mockupViewer.epicTitle}</span>
                    <span className="text-border">·</span>
                    <span className="text-xs text-muted-foreground truncate">{mockupViewer.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={mockupViewer.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
                    >
                      <ExternalLinkIcon className="size-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setMockupViewer(null)}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
                    >
                      <XIcon className="size-4" />
                    </button>
                  </div>
                </div>
                {/* Grouped page tabs — collapsible when many groups */}
                {(() => {
                  const allEntries = [...groups.entries()];
                  const hasMultipleGroups = allEntries.length > 1;
                  // Find which group the active URL belongs to
                  const activeGroup = allEntries.find(([, items]) =>
                    items.some((m) => `/api/mockup?path=${m.path}` === mockupViewer.url)
                  )?.[0];

                  return (
                    <div className="px-4 pb-2.5">
                      {hasMultipleGroups && (
                        <button
                          type="button"
                          onClick={() => setMockupTabsExpanded((v) => !v)}
                          className="flex items-center gap-1 mb-1 text-[10px] font-medium text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        >
                          <ChevronDownIcon className={cn("size-3 transition-transform", !mockupTabsExpanded && "-rotate-90")} />
                          {mockupTabsExpanded ? "Collapse" : `${allEntries.length} design variants`}
                        </button>
                      )}
                      <div className="flex flex-col gap-1 max-h-[40vh] overflow-y-auto">
                        {allEntries
                          .filter(([group]) => !hasMultipleGroups || mockupTabsExpanded || group === activeGroup)
                          .map(([group, items]) => (
                          <div key={group} className="flex items-center gap-1 min-h-[24px]">
                            <span className="shrink-0 w-28 text-[9px] font-semibold text-muted-foreground/40 uppercase tracking-wider truncate">
                              {group}
                            </span>
                            <div className="flex items-center gap-0.5 overflow-x-auto">
                              {items.map((m) => {
                                const url = `/api/mockup?path=${m.path}`;
                                const isActive = mockupViewer.url === url;
                                return (
                                  <button
                                    key={m.path}
                                    type="button"
                                    onClick={() =>
                                      setMockupViewer({
                                        ...mockupViewer,
                                        url,
                                        title: m.name,
                                      })
                                    }
                                    className={cn(
                                      "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
                                      isActive
                                        ? "bg-purple-500/15 text-purple-400"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                  >
                                    {m.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Iframe */}
              <div className="flex-1">
                <iframe
                  src={mockupViewer.url}
                  className="h-full w-full border-0"
                  title={`Mockup: ${mockupViewer.title}`}
                />
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </>
  );
}
