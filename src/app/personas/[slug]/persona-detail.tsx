"use client";

import { useState } from "react";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { Persona, DiscoverySession } from "@/lib/persona-types";
import { GROUP_META } from "@/lib/persona-types";
import { InternalHeader } from "@/components/internal-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeftIcon,
  TargetIcon,
  AlertTriangleIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
  EyeIcon,
  ChevronDownIcon,
  NotebookPenIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Color config
// ---------------------------------------------------------------------------

const GROUP_BADGE_COLORS: Record<string, string> = {
  primary:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  secondary:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  operations:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

const PROSE_CLASSES =
  "prose prose-sm prose-zinc dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-lg prose-h3:text-base prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-a:text-primary prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-hr:border-border prose-table:text-sm prose-th:text-left prose-th:font-medium";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PersonaDetailPage({ persona }: { persona: Persona }) {
  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <InternalHeader>
        <a
          href="/personas"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" />
          Personas
        </a>
      </InternalHeader>

      {/* Content */}
      <div className="flex-1 px-4 py-6 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className="mx-auto max-w-3xl"
        >
          {/* Header */}
          <div className="mb-6">
            <Badge
              variant="outline"
              className={cn(
                "mb-2 text-xs",
                GROUP_BADGE_COLORS[persona.group],
              )}
            >
              {GROUP_META[persona.group].label}
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight">
              {persona.title}
            </h1>
            {persona.description && (
              <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
                {persona.description}
              </p>
            )}
          </div>

          {/* Goals + Pain Points */}
          {(persona.goals.length > 0 || persona.painPoints.length > 0) && (
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              {persona.goals.length > 0 && (
                <Card className="shadow-none border-emerald-200 dark:border-emerald-900">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <TargetIcon className="size-3.5" />
                      Goals
                    </div>
                    <ul className="space-y-1">
                      {persona.goals.map((g) => (
                        <li
                          key={g}
                          className="text-xs text-muted-foreground flex gap-1.5"
                        >
                          <span className="text-emerald-500 mt-0.5 shrink-0">
                            &bull;
                          </span>
                          {g}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {persona.painPoints.length > 0 && (
                <Card className="shadow-none border-red-200 dark:border-red-900">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                      <AlertTriangleIcon className="size-3.5" />
                      Pain Points
                    </div>
                    <ul className="space-y-1">
                      {persona.painPoints.map((pp) => (
                        <li
                          key={pp}
                          className="text-xs text-muted-foreground flex gap-1.5"
                        >
                          <span className="text-red-400 mt-0.5 shrink-0">
                            &bull;
                          </span>
                          {pp}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Discovery Sessions */}
          <DiscoverySessions sessions={persona.sessions} />

          {/* Full content */}
          <Card className="shadow-none">
            <CardContent className="p-6 sm:p-8">
              <div className={PROSE_CLASSES}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {persona.content}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Discovery Sessions section
// ---------------------------------------------------------------------------

function DiscoverySessions({ sessions }: { sessions: DiscoverySession[] }) {
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <NotebookPenIcon className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Discovery Sessions</h2>
        <Badge variant="secondary" className="text-[10px]">
          {sessions.length}
        </Badge>
      </div>

      {sessions.length === 0 ? (
        <Card className="shadow-none border-dashed">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">
              No discovery sessions recorded yet. Add a session file to the{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                shadowing/
              </code>{" "}
              directory.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => {
            const isExpanded = expandedSlug === session.slug;
            return (
              <Card key={session.slug} className="shadow-none overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSlug(isExpanded ? null : session.slug)
                  }
                  className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {session.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {session.date && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="size-3" />
                          {session.date}
                        </span>
                      )}
                      {session.participant && (
                        <span className="flex items-center gap-1">
                          <UserIcon className="size-3" />
                          {session.participant}
                        </span>
                      )}
                      {session.observer && (
                        <span className="flex items-center gap-1">
                          <EyeIcon className="size-3" />
                          {session.observer}
                        </span>
                      )}
                      {session.duration && (
                        <span className="flex items-center gap-1">
                          <ClockIcon className="size-3" />
                          {session.duration}
                        </span>
                      )}
                    </div>
                  </div>
                  {session.status && (
                    <Badge
                      variant={
                        session.status === "complete" ? "default" : "secondary"
                      }
                      className="shrink-0 text-[10px]"
                    >
                      {session.status}
                    </Badge>
                  )}
                  <ChevronDownIcon
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      isExpanded && "rotate-180",
                    )}
                  />
                </button>

                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Separator />
                    <CardContent className="p-6">
                      <div className={PROSE_CLASSES}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {session.content}
                        </ReactMarkdown>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
