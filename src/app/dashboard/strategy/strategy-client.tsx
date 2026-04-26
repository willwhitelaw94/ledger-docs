"use client";

import { useMemo, useState, useCallback, useRef, useTransition } from "react";
import type { DragEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Initiative, Epic } from "@/lib/initiatives";
import { updateEpicPriority } from "@/app/dashboard/actions";
import { InternalHeader } from "@/components/internal-header";
import { InitiativeRail } from "@/components/initiative-rail";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LayoutGridIcon,
  SearchIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  LayersIcon,
  BanknoteIcon,
  FilterIcon,
  FileTextIcon,
  CameraIcon,
} from "lucide-react";

/* ── Constants ── */

const STATUS_BADGE_COLORS: Record<string, string> = {
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
  release: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "peer review": "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  idea: "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

const GATE_ORDER = ["idea", "spec", "design", "dev", "qa"] as const;

type PriorityColumn = "P0" | "P1" | "P2" | "P3" | "unranked";

const PRIORITY_COLUMNS: {
  id: PriorityColumn;
  label: string;
  description: string;
  dotColor: string;
  bgTint: string;
}[] = [
  { id: "P0", label: "Urgent", description: "Critical blocker or compliance risk. Must be resolved immediately — actively disrupting users or business operations.", dotColor: "bg-rose-500", bgTint: "bg-rose-500/5 dark:bg-rose-500/5 bg-rose-50" },
  { id: "P1", label: "High", description: "Significant business value or user impact. Scheduled for the current quarter and actively planned.", dotColor: "bg-red-500", bgTint: "bg-red-500/5 dark:bg-red-500/5 bg-red-50" },
  { id: "P2", label: "Medium", description: "Important improvement with clear value. Planned for this or next quarter depending on capacity.", dotColor: "bg-amber-500", bgTint: "bg-amber-500/5 dark:bg-amber-500/5 bg-amber-50" },
  { id: "P3", label: "Low", description: "Nice to have. Will be picked up when higher priorities are clear, or as part of related work.", dotColor: "bg-emerald-500", bgTint: "bg-emerald-500/5 dark:bg-emerald-500/5 bg-emerald-50" },
  { id: "unranked", label: "No Priority", description: "Not yet triaged or deliberately deprioritised. Needs review at next BRP.", dotColor: "bg-zinc-500", bgTint: "bg-zinc-500/5 dark:bg-zinc-500/5 bg-zinc-100" },
];

type StageColumn = "in progress" | "design" | "planning" | "idea" | "backlog" | "blocked" | "qa" | "release";

const STAGE_COLUMNS: {
  id: StageColumn;
  label: string;
  description: string;
  dotColor: string;
  bgTint: string;
}[] = [
  { id: "backlog", label: "Backlog", description: "Not yet triaged. Awaiting review or prioritisation.", dotColor: "bg-slate-500", bgTint: "bg-slate-500/5 dark:bg-slate-500/5 bg-slate-50" },
  { id: "idea", label: "Idea", description: "Problem identified, idea brief in progress or complete.", dotColor: "bg-pink-500", bgTint: "bg-pink-500/5 dark:bg-pink-500/5 bg-pink-50" },
  { id: "planning", label: "Planning", description: "Spec and requirements being refined. Ready for design.", dotColor: "bg-amber-500", bgTint: "bg-amber-500/5 dark:bg-amber-500/5 bg-amber-50" },
  { id: "design", label: "Design", description: "UX/UI design in progress. Mockups and flows being created.", dotColor: "bg-purple-500", bgTint: "bg-purple-500/5 dark:bg-purple-500/5 bg-purple-50" },
  { id: "in progress", label: "In Progress", description: "Active development. Architecture, coding, and PR creation.", dotColor: "bg-blue-500", bgTint: "bg-blue-500/5 dark:bg-blue-500/5 bg-blue-50" },
  { id: "qa", label: "QA", description: "Testing and validation. Functional, cross-browser, accessibility.", dotColor: "bg-teal-500", bgTint: "bg-teal-500/5 dark:bg-teal-500/5 bg-teal-50" },
  { id: "release", label: "Released", description: "Shipped to production. Release notes and comms complete.", dotColor: "bg-emerald-500", bgTint: "bg-emerald-500/5 dark:bg-emerald-500/5 bg-emerald-50" },
  { id: "blocked", label: "Blocked", description: "Waiting on a dependency, decision, or external factor.", dotColor: "bg-red-500", bgTint: "bg-red-500/5 dark:bg-red-500/5 bg-red-50" },
];

const STAGE_ALIASES: Record<string, StageColumn> = {
  in_progress: "in progress",
  "peer review": "in progress",
  planned: "planning",
  draft: "idea",
  triaged: "backlog",
  "to do": "backlog",
  "ready for qa": "qa",
  "on hold": "blocked",
  active: "release",
  "ready for implementation": "release",
};

function normalizeStage(status: string): StageColumn {
  const lower = status.toLowerCase().trim();
  return STAGE_ALIASES[lower] ?? (STAGE_COLUMNS.some((c) => c.id === lower) ? lower as StageColumn : "backlog");
}

const INITIATIVE_COLORS: Record<string, string> = {
  "Budgets-And-Finance": "bg-amber-500",
  "Clinical-And-Care-Plan": "bg-rose-500",
  "Consumer-Lifecycle": "bg-blue-500",
  "Consumer-Mobile": "bg-violet-500",
  "Coordinator-Management": "bg-emerald-500",
  Infrastructure: "bg-slate-500",
  "Supplier-Management": "bg-orange-500",
  "Work-Management": "bg-cyan-500",
  ADHOC: "bg-pink-500",
};

/* ── Linear-style priority icon ── */

const PRIORITY_ICON_CONFIG: Record<PriorityColumn, { color: string; bars: number }> = {
  P0: { color: "text-red-500", bars: 0 },
  P1: { color: "text-orange-500", bars: 3 },
  P2: { color: "text-amber-500", bars: 2 },
  P3: { color: "text-blue-500", bars: 1 },
  unranked: { color: "text-muted-foreground/40", bars: 0 },
};

function LinearPriorityIcon({ id, className }: { id: PriorityColumn; className?: string }) {
  const config = PRIORITY_ICON_CONFIG[id];

  if (id === "P0") {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={cn(config.color, className)}>
        <path d="M3 1.5h10l-1.5 9h-7L3 1.5z" fill="currentColor" opacity="0.9" />
        <circle cx="8" cy="13.5" r="1.5" fill="currentColor" />
      </svg>
    );
  }

  if (id === "unranked") {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" className={cn(config.color, className)}>
        <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 3" />
      </svg>
    );
  }

  return (
    <svg width="14" height="14" viewBox="0 0 16 16" className={cn(config.color, className)}>
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
  );
}

/* ── Helpers ── */

function normalizePriority(raw?: string): PriorityColumn {
  if (!raw) return "unranked";
  const v = raw.trim().toLowerCase();
  if (v === "p0" || v === "urgent") return "P0";
  if (v === "p1" || v === "high") return "P1";
  if (v === "p2" || v === "medium") return "P2";
  if (v === "p3" || v === "low") return "P3";
  return "unranked";
}

/** Map kanban column back to the YAML priority value */
function priorityColToYaml(col: PriorityColumn): string {
  const map: Record<PriorityColumn, string> = {
    P0: "P0", P1: "P1", P2: "P2", P3: "P3", unranked: "",
  };
  return map[col];
}

type FlatEpic = Epic & {
  initiativeTitle: string;
  initiativeSlug: string;
  priorityCol: PriorityColumn;
  stageCol: StageColumn;
};

/* ── Gate dots component ── */

function GateDots({ epic }: { epic: Epic }) {
  return (
    <div className="flex items-center gap-1">
      {GATE_ORDER.map((gateId) => {
        const passed = epic.gates[gateId]?.passed === true;
        return (
          <Tooltip key={gateId}>
            <TooltipTrigger>
              <span
                className={cn(
                  "block size-1.5 rounded-full",
                  passed ? "bg-emerald-500" : "bg-muted-foreground/30",
                )}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs capitalize">
              {gateId} {passed ? "(passed)" : ""}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

/* ── Epic card for Kanban ── */

function EpicCard({ epic, hideStatus, index = 0 }: { epic: FlatEpic; hideStatus?: boolean; index?: number }) {
  const docCount = epic.artifacts.length;
  const statusLabel = epic.status.charAt(0).toUpperCase() + epic.status.slice(1);
  const href = `/dashboard?i=${epic.initiativeSlug}&e=${epic.slug}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26, delay: index * 0.03 }}
    >
    <Link href={href} onMouseDown={(e) => e.stopPropagation()}>
    <Card className="group/card border-border/40 bg-card transition-all hover:border-border hover:shadow-md cursor-pointer">
      <CardContent className="px-2.5 py-2">
        {/* Row 1: prefix + title + status */}
        <div className="flex items-center gap-1.5 min-w-0">
          {epic.prefix && (
            <Badge variant="secondary" className="text-[9px] font-mono shrink-0 px-1 py-0">
              {epic.prefix}
            </Badge>
          )}
          <span className="text-xs font-medium leading-tight truncate flex-1 min-w-0">
            {epic.title}
          </span>
          {!hideStatus && (
            <Badge
              variant="secondary"
              className={cn(
                "shrink-0 text-[9px] capitalize px-1.5 py-0",
                STATUS_BADGE_COLORS[epic.status.toLowerCase()] || "bg-muted text-muted-foreground",
              )}
            >
              {statusLabel}
            </Badge>
          )}
        </div>

        {/* Summary */}
        {epic.summary && (
          <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground leading-snug">
            {epic.summary}
          </p>
        )}

        {/* Row 2: gates + meta */}
        <div className="mt-1.5 flex items-center justify-between">
          <GateDots epic={epic} />
          <div className="flex items-center gap-1.5">
            {epic.bountyValue != null && epic.bountyValue > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] font-medium text-amber-500">
                <BanknoteIcon className="size-2.5" />
                ${epic.bountyValue >= 1000 ? `${epic.bountyValue / 1000}k` : epic.bountyValue}
              </span>
            )}
            {docCount > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                <FileTextIcon className="size-2.5" />
                {docCount}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </Link>
    </motion.div>
  );
}

/* ── Priority Kanban Column (droppable) ── */

function PriorityKanbanColumn({
  column,
  epics,
  onDrop,
  dragEnabled = true,
}: {
  column: (typeof PRIORITY_COLUMNS)[number];
  epics: FlatEpic[];
  onDrop: (epicSlug: string, targetColumn: PriorityColumn, targetIndex: number) => void;
  dragEnabled?: boolean;
}) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const columnRef = useRef<HTMLDivElement>(null);

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      const columnEl = columnRef.current;
      if (!columnEl) return;

      const cards = columnEl.querySelectorAll("[data-epic-card]");
      const mouseY = e.clientY;
      let insertIndex = epics.length;

      for (let i = 0; i < cards.length; i++) {
        const rect = cards[i].getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (mouseY < midY) {
          insertIndex = i;
          break;
        }
      }

      setDragOverIndex(insertIndex);
    },
    [epics.length],
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const columnEl = columnRef.current;
    if (columnEl && relatedTarget && columnEl.contains(relatedTarget)) return;
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const epicSlug = e.dataTransfer.getData("text/plain");
      if (epicSlug) {
        onDrop(epicSlug, column.id, dragOverIndex ?? epics.length);
      }
      setDragOverIndex(null);
    },
    [column.id, dragOverIndex, epics.length, onDrop],
  );

  return (
    <div
      className={cn("flex flex-col rounded-lg p-2 min-w-[150px]", column.bgTint)}
      onDragOver={dragEnabled ? handleDragOver : undefined}
      onDragLeave={dragEnabled ? handleDragLeave : undefined}
      onDrop={dragEnabled ? handleDrop : undefined}
      ref={columnRef}
    >
      {/* Column header */}
      <div className="mb-3 flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger className="flex items-center gap-2">
            <LinearPriorityIcon id={column.id} className="shrink-0" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {column.label}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            {column.description}
          </TooltipContent>
        </Tooltip>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          {epics.length}
        </Badge>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2" data-column={column.id}>
        {epics.map((epic, i) => (
          <div key={epic.slug}>
            {dragOverIndex === i && (
              <div className="mb-1 h-0.5 rounded-full bg-blue-500" />
            )}
            <div
              data-epic-card
              draggable={dragEnabled}
              onDragStart={dragEnabled ? (e) => {
                e.dataTransfer.setData("text/plain", epic.slug);
                e.dataTransfer.effectAllowed = "move";
                requestAnimationFrame(() => {
                  (e.currentTarget as HTMLElement).style.opacity = "0.5";
                });
              } : undefined}
              onDragEnd={dragEnabled ? (e) => {
                (e.currentTarget as HTMLElement).style.opacity = "1";
              } : undefined}
            >
              <EpicCard epic={epic} index={i} />
            </div>
          </div>
        ))}
        {dragOverIndex === epics.length && epics.length > 0 && (
          <div className="h-0.5 rounded-full bg-blue-500" />
        )}
        {epics.length === 0 && (
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border/30 py-8">
            <p className="text-xs text-muted-foreground/50">{dragEnabled ? "Drop epics here" : "No epics"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Priority Kanban view ── */

function PriorityKanbanView({ epics, onPriorityChange, hideBacklog }: { epics: FlatEpic[]; onPriorityChange?: (epic: FlatEpic, newPriority: PriorityColumn) => void; hideBacklog?: boolean }) {
  const isDragEnabled = !!onPriorityChange;
  const visibleColumns = hideBacklog ? PRIORITY_COLUMNS.filter((c) => c.id !== "unranked") : PRIORITY_COLUMNS;
  const [epicOrder, setEpicOrder] = useState<FlatEpic[]>(epics);

  // Sync when upstream epics change (search filter)
  const epicSlugsKey = epics.map((e) => e.slug).join(",");
  const [prevKey, setPrevKey] = useState(epicSlugsKey);
  if (epicSlugsKey !== prevKey) {
    setPrevKey(epicSlugsKey);
    // Preserve order of existing epics, append new ones
    const ordered: FlatEpic[] = [];
    const incoming = new Map(epics.map((e) => [e.slug, e]));
    for (const e of epicOrder) {
      if (incoming.has(e.slug)) {
        ordered.push(incoming.get(e.slug)!);
        incoming.delete(e.slug);
      }
    }
    for (const e of incoming.values()) ordered.push(e);
    setEpicOrder(ordered);
  }

  const columnEpics = useMemo(() => {
    const map: Record<PriorityColumn, FlatEpic[]> = {
      P0: [], P1: [], P2: [], P3: [], unranked: [],
    };
    for (const epic of epicOrder) {
      map[epic.priorityCol].push(epic);
    }
    return map;
  }, [epicOrder]);

  const handleDrop = useCallback(
    (epicSlug: string, targetColumn: PriorityColumn, targetIndex: number) => {
      const epic = epicOrder.find((e) => e.slug === epicSlug);
      if (!epic) return;

      const columnChanged = epic.priorityCol !== targetColumn;

      setEpicOrder((prev) => {
        const found = prev.find((e) => e.slug === epicSlug);
        if (!found) return prev;

        // Remove from current position
        const without = prev.filter((e) => e.slug !== epicSlug);
        const updated = { ...found, priorityCol: targetColumn };

        // Find the correct position in the flat array
        let insertAt = 0;
        let colCount = 0;
        for (let i = 0; i < without.length; i++) {
          if (without[i].priorityCol === targetColumn) {
            if (colCount === targetIndex) {
              insertAt = i;
              break;
            }
            colCount++;
          }
          insertAt = i + 1;
        }

        const result = [...without];
        result.splice(insertAt, 0, updated);
        return result;
      });

      // Persist to YAML if column changed
      if (columnChanged && onPriorityChange) {
        onPriorityChange(epic, targetColumn);
      }
    },
    [epicOrder, onPriorityChange],
  );

  return (
    <div className="pb-4">
      <div className="flex gap-3">
        {visibleColumns.map((col, colIdx) => (
          <motion.div key={col.id} className="flex-1 min-w-0" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26, delay: colIdx * 0.05 }}>
            <PriorityKanbanColumn
              column={col}
              epics={columnEpics[col.id]}
              onDrop={handleDrop}
              dragEnabled={isDragEnabled}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Swimlane droppable cell ── */

function SwimlaneDropCell({
  column,
  epics,
  onDrop,
  dragEnabled = true,
}: {
  column: (typeof PRIORITY_COLUMNS)[number];
  epics: FlatEpic[];
  onDrop: (epicSlug: string, targetColumn: PriorityColumn) => void;
  dragEnabled?: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={cn(
        "flex-1 min-w-[130px] min-h-[50px] space-y-1.5 rounded-md p-1 transition-colors",
        isDragOver && "bg-blue-500/10 ring-1 ring-blue-500/30",
      )}
      onDragOver={dragEnabled ? (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsDragOver(true);
      } : undefined}
      onDragLeave={dragEnabled ? (e) => {
        const related = e.relatedTarget as HTMLElement | null;
        if (related && e.currentTarget.contains(related)) return;
        setIsDragOver(false);
      } : undefined}
      onDrop={dragEnabled ? (e) => {
        e.preventDefault();
        e.stopPropagation();
        const epicSlug = e.dataTransfer.getData("text/plain");
        if (epicSlug) onDrop(epicSlug, column.id);
        setIsDragOver(false);
      } : undefined}
    >
      {epics.map((epic, i) => (
        <div
          key={epic.slug}
          draggable={dragEnabled}
          className={dragEnabled ? "cursor-grab active:cursor-grabbing" : undefined}
          onDragStart={dragEnabled ? (e) => {
            e.dataTransfer.setData("text/plain", epic.slug);
            e.dataTransfer.effectAllowed = "move";
            requestAnimationFrame(() => {
              (e.currentTarget as HTMLElement).style.opacity = "0.5";
            });
          } : undefined}
          onDragEnd={dragEnabled ? (e) => {
            (e.currentTarget as HTMLElement).style.opacity = "1";
          } : undefined}
        >
          <EpicCard epic={epic} index={i} />
        </div>
      ))}
      {epics.length === 0 && isDragOver && (
        <div className="flex items-center justify-center rounded border-2 border-dashed border-blue-500/30 py-4">
          <p className="text-[10px] text-blue-400/60">Drop here</p>
        </div>
      )}
    </div>
  );
}

/* ── Priority Kanban with initiative swimlanes ── */

function PriorityKanbanSwimlaneView({
  epics,
  initiatives,
  onPriorityChange,
  hideBacklog,
}: {
  epics: FlatEpic[];
  initiatives: Initiative[];
  onPriorityChange?: (epic: FlatEpic, newPriority: PriorityColumn) => void;
  hideBacklog?: boolean;
}) {
  const isDragEnabled = !!onPriorityChange;
  const visibleColumns = hideBacklog ? PRIORITY_COLUMNS.filter((c) => c.id !== "unranked") : PRIORITY_COLUMNS;
  const [epicState, setEpicState] = useState(epics);

  // Sync when upstream epics change (search/filter)
  const epicSlugsKey = epics.map((e) => e.slug).join(",");
  const [prevKey, setPrevKey] = useState(epicSlugsKey);
  if (epicSlugsKey !== prevKey) {
    setPrevKey(epicSlugsKey);
    const incoming = new Map(epics.map((e) => [e.slug, e]));
    const ordered: FlatEpic[] = [];
    for (const e of epicState) {
      if (incoming.has(e.slug)) {
        ordered.push(incoming.get(e.slug)!);
        incoming.delete(e.slug);
      }
    }
    for (const e of incoming.values()) ordered.push(e);
    setEpicState(ordered);
  }

  const initiativeRows = useMemo(() => {
    return initiatives
      .map((init) => {
        const initEpics = epicState.filter((e) => e.initiativeSlug === init.slug);
        const colMap: Record<PriorityColumn, FlatEpic[]> = {
          P0: [], P1: [], P2: [], P3: [], unranked: [],
        };
        for (const epic of initEpics) {
          colMap[epic.priorityCol].push(epic);
        }
        return { initiative: init, epics: initEpics, colMap };
      })
      .filter((r) => r.epics.length > 0);
  }, [initiatives, epicState]);

  const handleDrop = useCallback(
    (epicSlug: string, targetColumn: PriorityColumn) => {
      const epic = epicState.find((e) => e.slug === epicSlug);
      if (!epic || epic.priorityCol === targetColumn) return;

      // Optimistic UI update
      setEpicState((prev) =>
        prev.map((e) =>
          e.slug === epicSlug ? { ...e, priorityCol: targetColumn } : e,
        ),
      );

      // Persist to YAML
      if (onPriorityChange) onPriorityChange(epic, targetColumn);
    },
    [epicState, onPriorityChange],
  );

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto" onDragOver={(e) => e.preventDefault()}>
        <div className="min-w-[900px]">
          {/* Column headers */}
          <div className="flex gap-2 mb-4">
            <div className="w-[140px] shrink-0" />
            {visibleColumns.map((col) => {
              const count = epicState.filter((e) => e.priorityCol === col.id).length;
              return (
                <div key={col.id} className="flex-1 min-w-[130px]">
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-2">
                        <LinearPriorityIcon id={col.id} className="shrink-0" />
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                          {col.label}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        {col.description}
                      </TooltipContent>
                    </Tooltip>
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      {count}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Swimlane rows */}
          {initiativeRows.map(({ initiative, epics: initEpics, colMap }) => (
            <Collapsible key={initiative.slug} defaultOpen className="group/swim">
              <div className="mb-4 rounded-lg border border-border/30 bg-card/50">
                <CollapsibleTrigger className="flex w-full items-center gap-2.5 border-b border-border/20 px-4 py-2.5 text-left transition-colors hover:bg-muted/30">
                  <ChevronRightIcon className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]/swim:rotate-90" />
                  <span
                    className={cn(
                      "size-2.5 rounded-full shrink-0",
                      INITIATIVE_COLORS[initiative.slug] || "bg-muted-foreground",
                    )}
                  />
                  <span className="text-sm font-semibold tracking-tight">
                    {initiative.title}
                  </span>
                  {initiative.owner && initiative.owner !== "TBD" && (
                    <span className="text-xs text-muted-foreground">
                      {initiative.owner}
                    </span>
                  )}
                  <Badge variant="secondary" className="text-[10px]">
                    {initEpics.length} epic{initEpics.length !== 1 ? "s" : ""}
                  </Badge>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="flex gap-2 p-2">
                    <div className="w-[140px] shrink-0" />
                    {visibleColumns.map((col) => (
                      <SwimlaneDropCell
                        key={col.id}
                        column={col}
                        epics={colMap[col.id]}
                        onDrop={handleDrop}
                        dragEnabled={isDragEnabled}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      </div>
    </div>
  );
}


/* ── Stage Kanban Column ── */

function StageKanbanColumn({
  column,
  epics,
}: {
  column: (typeof STAGE_COLUMNS)[number];
  epics: FlatEpic[];
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={cn("size-2 rounded-full", column.dotColor)} />
        <span className="text-xs font-medium text-muted-foreground">{column.label}</span>
        <Badge variant="secondary" className="ml-auto text-[10px]">{epics.length}</Badge>
      </div>
      <div className={cn("flex flex-1 flex-col gap-2 rounded-lg border border-dashed border-border/40 p-2 min-h-[120px]", column.bgTint)}>
        {epics.map((epic, i) => (
          <EpicCard key={epic.slug} epic={epic} hideStatus index={i} />
        ))}
        {epics.length === 0 && (
          <div className="flex flex-1 items-center justify-center">
            <span className="text-[10px] text-muted-foreground/40">No epics</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Stage Kanban view ── */

function StageKanbanView({ epics, hideBacklog }: { epics: FlatEpic[]; hideBacklog?: boolean }) {
  const visibleColumns = hideBacklog ? STAGE_COLUMNS.filter((c) => c.id !== "backlog") : STAGE_COLUMNS;

  const columnEpics = useMemo(() => {
    const map: Record<StageColumn, FlatEpic[]> = {
      "in progress": [], design: [], planning: [], idea: [], backlog: [], blocked: [], qa: [], release: [],
    };
    for (const epic of epics) map[epic.stageCol].push(epic);
    return map;
  }, [epics]);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="inline-flex min-w-full gap-3">
        {visibleColumns.map((col, colIdx) => (
          <motion.div key={col.id} className="flex-1 min-w-[150px]" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26, delay: colIdx * 0.05 }}>
            <StageKanbanColumn column={col} epics={columnEpics[col.id]} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Stage Kanban with initiative swimlanes ── */

function StageKanbanSwimlaneView({
  epics,
  initiatives,
  hideBacklog,
}: {
  epics: FlatEpic[];
  initiatives: Initiative[];
  hideBacklog?: boolean;
}) {
  const visibleColumns = hideBacklog ? STAGE_COLUMNS.filter((c) => c.id !== "backlog") : STAGE_COLUMNS;

  const initiativeGroups = useMemo(() => {
    const grouped: Record<string, FlatEpic[]> = {};
    for (const epic of epics) {
      if (!grouped[epic.initiativeSlug]) grouped[epic.initiativeSlug] = [];
      grouped[epic.initiativeSlug].push(epic);
    }
    return initiatives
      .filter((init) => grouped[init.slug]?.length)
      .map((init) => {
        const initEpics = grouped[init.slug];
        const colMap: Record<StageColumn, FlatEpic[]> = {
          "in progress": [], design: [], planning: [], idea: [], backlog: [], blocked: [], qa: [], release: [],
        };
        for (const epic of initEpics) colMap[epic.stageCol].push(epic);
        return { initiative: init, initEpics, colMap };
      });
  }, [epics, initiatives]);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="min-w-[900px]">
        <div className="flex gap-2 px-2 mb-3">
          <div className="w-[140px] shrink-0" />
          {visibleColumns.map((col) => {
            const count = epics.filter((e) => e.stageCol === col.id).length;
            return (
              <div key={col.id} className="flex-1 min-w-[100px] flex items-center gap-1.5 px-1">
                <span className={cn("size-2 rounded-full", col.dotColor)} />
                <span className="text-xs font-medium text-muted-foreground">{col.label}</span>
                <Badge variant="secondary" className="ml-auto text-[10px]">{count}</Badge>
              </div>
            );
          })}
        </div>
        {initiativeGroups.map(({ initiative, initEpics, colMap }) => (
          <div key={initiative.slug} className="mb-4 rounded-lg border border-border/30 bg-card/50">
            <div className="flex items-center gap-2.5 border-b border-border/20 px-4 py-2.5">
              <span className={cn("size-2.5 rounded-full shrink-0", INITIATIVE_COLORS[initiative.slug] || "bg-muted-foreground")} />
              <span className="text-sm font-semibold tracking-tight">{initiative.title}</span>
              {initiative.owner && initiative.owner !== "TBD" && (
                <span className="text-xs text-muted-foreground">{initiative.owner}</span>
              )}
              <Badge variant="secondary" className="text-[10px]">
                {initEpics.length} epic{initEpics.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="flex gap-2 p-2">
              <div className="w-[140px] shrink-0" />
              {visibleColumns.map((col) => (
                <div key={col.id} className={cn("flex-1 min-w-[100px] rounded-md border border-dashed border-border/30 p-1.5 min-h-[60px] flex flex-col gap-1.5", col.bgTint)}>
                  {colMap[col.id].map((epic, i) => (
                    <EpicCard key={epic.slug} epic={epic} hideStatus index={i} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── BRP Snapshot export ── */

function exportBrpSnapshot(epics: FlatEpic[], initiatives: Initiative[]) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });

  const grouped: Record<string, FlatEpic[]> = {};
  for (const col of PRIORITY_COLUMNS) grouped[col.id] = [];
  for (const epic of epics) grouped[epic.priorityCol].push(epic);

  let md = `# BRP Priority Snapshot\n\n`;
  md += `**Date:** ${dateStr} at ${timeStr}  \n`;
  md += `**Epics:** ${epics.length} across ${initiatives.length} initiatives\n\n---\n\n`;

  for (const col of PRIORITY_COLUMNS) {
    const colEpics = grouped[col.id];
    md += `## ${col.label} (${colEpics.length})\n\n`;
    if (colEpics.length === 0) {
      md += `_No epics_\n\n`;
    } else {
      for (const epic of colEpics) {
        md += `- **${epic.title}** — ${epic.initiativeTitle}`;
        if (epic.status) md += ` · _${epic.status}_`;
        if (epic.bountyValue) md += ` · $${epic.bountyValue.toLocaleString()}`;
        md += `\n`;
        if (epic.summary) md += `  ${epic.summary}\n`;
      }
      md += `\n`;
    }
  }

  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `brp-snapshot-${now.toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Main component ── */

export function StrategyClient({
  initiatives,
  readOnly = false,
  embedded = false,
}: {
  initiatives: Initiative[];
  readOnly?: boolean;
  embedded?: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const selectedInitiative = searchParams.get("initiative") ?? "all";
  const hideBacklog = searchParams.get("hideBacklog") === "1";
  const [isPending, startTransition] = useTransition();
  const [flash, setFlash] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [groupBy, setGroupBy] = useState<"priority" | "stage">("priority");
  const [activeTab, setActiveTab] = useState<0 | 1>(0);

  const setSelectedInitiative = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") {
        params.delete("initiative");
      } else {
        params.set("initiative", value);
        setActiveTab(0);
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "/dashboard?mode=plan", { scroll: false });
    },
    [searchParams, router],
  );

  const toggleHideBacklog = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (hideBacklog) {
      params.delete("hideBacklog");
    } else {
      params.set("hideBacklog", "1");
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "/dashboard?mode=plan", { scroll: false });
  }, [searchParams, hideBacklog, router]);

  // Flatten all epics with initiative metadata and priority
  const allEpics: FlatEpic[] = useMemo(
    () =>
      initiatives.flatMap((init) =>
        init.epics.map((epic) => ({
          ...epic,
          initiativeTitle: init.title,
          initiativeSlug: init.slug,
          priorityCol: normalizePriority(epic.priority),
          stageCol: normalizeStage(epic.status),
        })),
      ),
    [initiatives],
  );

  // Filter epics by search + initiative
  const filteredEpics = useMemo(() => {
    let result = allEpics;
    if (selectedInitiative !== "all") {
      result = result.filter((e) => e.initiativeSlug === selectedInitiative);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.initiativeTitle.toLowerCase().includes(q) ||
          (e.prefix && e.prefix.toLowerCase().includes(q)) ||
          (e.summary && e.summary.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [allEpics, searchQuery, selectedInitiative]);

  const totalEpics = allEpics.length;

  const handlePriorityChange = useCallback(
    (epic: FlatEpic, newPriority: PriorityColumn) => {
      const label = PRIORITY_COLUMNS.find((c) => c.id === newPriority)?.label ?? newPriority;
      startTransition(async () => {
        const result = await updateEpicPriority(
          epic.initiativeSlug,
          epic.slug,
          priorityColToYaml(newPriority),
        );
        if (result.success) {
          setFlash({ type: "success", message: `${epic.title} → ${label}` });
        } else {
          setFlash({ type: "error", message: `Failed: ${result.error}` });
        }
        setTimeout(() => setFlash(null), 3000);
      });
    },
    [],
  );

  return (
    <div className={embedded ? "" : "min-h-dvh flex"}>
      {!embedded && (
        <InitiativeRail
          initiatives={initiatives}
          activeSlug={selectedInitiative !== "all" ? selectedInitiative : null}
          onSelect={(init) => setSelectedInitiative(init.slug)}
        />
      )}
      <div className="flex-1 min-w-0 flex flex-col">
      {!embedded && (
        <InternalHeader>
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/dashboard" className="rounded-md px-2 py-1 transition-colors hover:text-foreground">Initiatives</Link>
            <ChevronRightIcon className="size-3.5" />
            <span className="font-medium text-foreground">Planning</span>
          </nav>
        </InternalHeader>
      )}

      {/* Flash alert */}
      {flash && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={cn(
            "fixed top-4 right-4 z-50 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg",
            flash.type === "success"
              ? "bg-emerald-500/90 text-white"
              : "bg-red-500/90 text-white",
          )}
        >
          {flash.message}
        </motion.div>
      )}

      <motion.div
        className="flex-1 px-4 py-6 sm:px-6"
        initial={{ opacity: 0, scale: 0.97, originX: 0.5, originY: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.05 }}
      >
        <div className="mx-auto">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 0 | 1)}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-lg border p-0.5">
                  {(["priority", "stage"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setGroupBy(m)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        groupBy === m
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {m === "priority" ? "Priority" : "Stage"}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {filteredEpics.length}{filteredEpics.length !== totalEpics ? `/${totalEpics}` : ""} epics
                  {isPending && <span className="ml-1.5 text-primary">Saving...</span>}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Swimlanes — only when viewing all initiatives */}
                {selectedInitiative === "all" && (
                  <button type="button" onClick={() => setActiveTab(1)} className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors", activeTab === 1 ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                    <LayersIcon className="size-3" />Swimlanes
                  </button>
                )}
                {/* Kanban */}
                <button type="button" onClick={() => setActiveTab(0)} className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors", activeTab === 0 ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  <LayoutGridIcon className="size-3" />Kanban
                </button>
                {/* Initiative filter */}
                <div className="relative">
                  <FilterIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={selectedInitiative}
                    onChange={(e) => setSelectedInitiative(e.target.value)}
                    className="h-8 appearance-none rounded-lg border border-input/50 bg-muted/50 pl-9 pr-8 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="all">All Initiatives</option>
                    {initiatives.map((init) => (
                      <option key={init.slug} value={init.slug}>
                        {init.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
                {/* Search */}
                <div className="relative w-48">
                  <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" placeholder="Filter..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 w-full rounded-lg border border-input/50 bg-muted/50 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" />
                </div>
                <button type="button" onClick={toggleHideBacklog} className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors", hideBacklog ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
                  <FilterIcon className="size-3" />Backlog
                </button>
                <button type="button" onClick={() => exportBrpSnapshot(filteredEpics, initiatives)} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                  <CameraIcon className="size-3" />Snapshot
                </button>
              </div>
            </div>
            <TabsContent value={0}>
              <motion.div key={`kanban-${groupBy}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26 }}>
                {groupBy === "priority" ? (
                  <PriorityKanbanView epics={filteredEpics} onPriorityChange={readOnly ? undefined : handlePriorityChange} hideBacklog={hideBacklog} />
                ) : (
                  <StageKanbanView epics={filteredEpics} hideBacklog={hideBacklog} />
                )}
              </motion.div>
            </TabsContent>
            <TabsContent value={1}>
              <motion.div key={`swimlanes-${groupBy}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26 }}>
                {groupBy === "priority" ? (
                  <PriorityKanbanSwimlaneView epics={filteredEpics} initiatives={initiatives} onPriorityChange={readOnly ? undefined : handlePriorityChange} hideBacklog={hideBacklog} />
                ) : (
                  <StageKanbanSwimlaneView epics={filteredEpics} initiatives={initiatives} hideBacklog={hideBacklog} />
                )}
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
      </div>
    </div>
  );
}
