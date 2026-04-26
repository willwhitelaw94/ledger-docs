"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import type { ChangelogEntry } from "@/lib/changelog";
import { InternalHeader } from "@/components/internal-header";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircleIcon,
  PlusCircleIcon,
  RocketIcon,
  SearchIcon,
  ChevronRightIcon,
  CalendarIcon,
  ExternalLinkIcon,
  GitCommitHorizontalIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TYPE_META: Record<
  ChangelogEntry["type"],
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    border: string;
    dot: string;
  }
> = {
  gate: {
    label: "Gate",
    icon: CheckCircleIcon,
    border: "border-l-emerald-500",
    dot: "bg-emerald-500",
  },
  "epic-created": {
    label: "Epic",
    icon: PlusCircleIcon,
    border: "border-l-blue-500",
    dot: "bg-blue-500",
  },
  release: {
    label: "Release",
    icon: RocketIcon,
    border: "border-l-orange-500",
    dot: "bg-orange-500",
  },
  commit: {
    label: "Commit",
    icon: GitCommitHorizontalIcon,
    border: "border-l-zinc-500",
    dot: "bg-zinc-500",
  },
};

const TAB_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "gate", label: "Gates" },
  { value: "epic-created", label: "Epics" },
  { value: "release", label: "Releases" },
  { value: "commit", label: "Commits" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function monthKey(date: string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ChangelogClient({ entries }: { entries: ChangelogEntry[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filtered = useMemo(() => {
    let result = entries;
    if (activeTab !== "all") {
      result = result.filter((e) => e.type === activeTab);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          (e.initiative && e.initiative.toLowerCase().includes(q)) ||
          (e.epicPrefix && e.epicPrefix.toLowerCase().includes(q))
      );
    }
    return result;
  }, [entries, activeTab, searchQuery]);

  // Group by month
  const grouped = useMemo(() => {
    const map = new Map<string, ChangelogEntry[]>();
    for (const entry of filtered) {
      const key = monthKey(entry.date);
      const arr = map.get(key);
      if (arr) {
        arr.push(entry);
      } else {
        map.set(key, [entry]);
      }
    }
    // Sort month keys descending (already sorted entries within each month)
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) {
      counts[e.type] = (counts[e.type] ?? 0) + 1;
    }
    return counts;
  }, [entries]);

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <InternalHeader>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <a
            href="/dashboard"
            className="rounded-md px-2 py-1 transition-colors hover:text-foreground"
          >
            Initiatives
          </a>
          <ChevronRightIcon className="size-3.5" />
          <span className="font-medium text-foreground">Activity Feed</span>
        </nav>
      </InternalHeader>

      {/* Content */}
      <div className="flex-1 px-4 py-6 sm:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key="changelog-feed"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="mx-auto max-w-3xl"
          >
            {/* Title + Search */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Activity Feed
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {entries.length} events across initiatives, releases, and commits
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search activity..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input/50 bg-muted/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                />
              </div>
            </div>

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
            >
              <TabsList className="mb-6">
                {TAB_FILTERS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                    {tab.value !== "all" && typeCounts[tab.value] ? (
                      <span className="ml-1.5 text-[10px] text-muted-foreground">
                        {typeCounts[tab.value]}
                      </span>
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* All tab content shares the same renderer */}
              {TAB_FILTERS.map((tab) => (
                <TabsContent key={tab.value} value={tab.value}>
                  {grouped.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      No activity matches your filter.
                    </p>
                  ) : (
                    <div className="space-y-8">
                      {grouped.map(([key, monthEntries]) => (
                        <MonthGroup
                          key={key}
                          label={monthLabel(key)}
                          entries={monthEntries}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Month group                                                        */
/* ------------------------------------------------------------------ */

function MonthGroup({
  label,
  entries,
}: {
  label: string;
  entries: ChangelogEntry[];
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <CalendarIcon className="size-3.5 text-muted-foreground" />
        <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
        <Badge variant="secondary" className="text-[10px]">
          {entries.length}
        </Badge>
      </div>

      {/* Timeline */}
      <div className="relative ml-3 border-l border-border pl-6 space-y-2">
        {entries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Entry card                                                         */
/* ------------------------------------------------------------------ */

function EntryCard({ entry }: { entry: ChangelogEntry }) {
  const meta = TYPE_META[entry.type];
  const Icon = meta.icon;

  return (
    <div className="relative group">
      {/* Timeline dot */}
      <div
        className={cn(
          "absolute -left-[31px] top-3 size-2.5 rounded-full ring-2 ring-background",
          meta.dot
        )}
      />

      <div
        className={cn(
          "rounded-lg border border-border/60 bg-card px-4 py-3 transition-colors hover:bg-muted/40",
          "border-l-2",
          meta.border
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                {entry.epicPrefix && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-mono px-1.5 py-0"
                  >
                    {entry.epicPrefix}
                  </Badge>
                )}
                {entry.releaseVersion && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono px-1.5 py-0"
                  >
                    v{entry.releaseVersion}
                  </Badge>
                )}
                {entry.commitHash && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-mono px-1.5 py-0 text-muted-foreground"
                  >
                    {entry.commitHash.slice(0, 7)}
                  </Badge>
                )}
                <span className="text-sm font-medium leading-tight">
                  {entry.title}
                </span>
              </div>
              {entry.description && entry.type !== "commit" && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                  {entry.description}
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                {entry.initiative && <span>{entry.initiative}</span>}
                {entry.commitType && (
                  <span className="rounded bg-muted px-1 py-0.5 font-mono">
                    {entry.commitType}
                  </span>
                )}
                {(entry.initiative || entry.commitType) && entry.date && (
                  <span className="text-border">|</span>
                )}
                <span>{formatDate(entry.date)}</span>
              </div>
            </div>
          </div>

          {/* Action links */}
          <div className="flex items-center gap-1.5 shrink-0">
            {entry.prUrl && (
              <a
                href={entry.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                title="Pull Request"
              >
                <ExternalLinkIcon className="size-3.5" />
              </a>
            )}
            {entry.url && (
              <a
                href={entry.url}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                title="View"
              >
                <ChevronRightIcon className="size-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
