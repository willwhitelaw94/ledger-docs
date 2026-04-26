"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Persona, PersonaGroup } from "@/lib/persona-types";
import { GROUP_META } from "@/lib/persona-types";
import { InternalHeader } from "@/components/internal-header";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SearchIcon,
  UsersIcon,
  ShieldCheckIcon,
  SettingsIcon,
  LinkIcon,
  XIcon,
  ArrowRightIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GROUP_ICONS: Record<
  PersonaGroup,
  React.ComponentType<{ className?: string }>
> = {
  primary: UsersIcon,
  secondary: ShieldCheckIcon,
  operations: SettingsIcon,
};

const GROUP_COLORS: Record<PersonaGroup, string> = {
  primary: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  secondary: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  operations: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PersonasClient({ personas }: { personas: Persona[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedSlug, setPinnedSlug] = useState<string | null>(null);

  const pinnedPersona = useMemo(
    () => (pinnedSlug ? personas.find((p) => p.slug === pinnedSlug) : null),
    [pinnedSlug, personas],
  );

  // Build set of visible slugs when pinned (pinned + its related)
  const visibleSlugs = useMemo(() => {
    if (!pinnedPersona) return null;
    return new Set<string>([pinnedPersona.slug, ...pinnedPersona.relatedSlugs]);
  }, [pinnedPersona]);

  const groups = (["primary", "secondary", "operations"] as const).map(
    (id) => ({
      id,
      ...GROUP_META[id],
      personas: personas.filter((p) => p.group === id),
    }),
  );

  function filterPersonas(list: Persona[]) {
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.goals.some((g) => g.toLowerCase().includes(q)) ||
        p.painPoints.some((pp) => pp.toLowerCase().includes(q)),
    );
  }

  function handleCardClick(slug: string) {
    setPinnedSlug((prev) => (prev === slug ? null : slug));
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <InternalHeader>
        <UsersIcon className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Personas</span>
      </InternalHeader>

      {/* Content */}
      <div className="flex-1 px-4 py-6 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className="mx-auto max-w-5xl"
        >
          {/* Title + search */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Personas</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {personas.length} personas across the Support at Home service
                delivery model
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter personas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-lg border border-input/50 bg-muted/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          {/* Pinned banner */}
          {pinnedPersona && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <LinkIcon className="size-3 text-primary/70" />
                Showing{" "}
                <span className="font-medium text-foreground">
                  {pinnedPersona.title}
                </span>{" "}
                and {visibleSlugs ? visibleSlugs.size - 1 : 0} connected
                personas
              </div>
              <button
                type="button"
                onClick={() => setPinnedSlug(null)}
                className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
              >
                <XIcon className="size-3" />
                Clear
              </button>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="all">
            <TabsList className="mb-6">
              <TabsTrigger value="all">All</TabsTrigger>
              {groups.map((g) => (
                <TabsTrigger
                  key={g.id}
                  value={g.id}
                  className="hidden sm:inline-flex"
                >
                  {g.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* All tab */}
            <TabsContent value="all">
              {groups.map((g) => {
                const filtered = filterPersonas(g.personas);
                if (filtered.length === 0) return null;
                const Icon = GROUP_ICONS[g.id];

                const hasVisibleCards =
                  !visibleSlugs ||
                  filtered.some((p) => visibleSlugs.has(p.slug));

                return (
                  <div
                    key={g.id}
                    className={cn(
                      "mb-8 transition-all duration-200",
                      visibleSlugs && !hasVisibleCards && "hidden",
                    )}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Icon className="size-4 text-muted-foreground" />
                      <h2 className="text-sm font-medium text-muted-foreground">
                        {g.label}
                      </h2>
                      <Badge variant="secondary" className="text-[10px]">
                        {filtered.length}
                      </Badge>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {filtered.map((p) => (
                        <PersonaCard
                          key={p.slug}
                          persona={p}
                          isPinned={pinnedSlug === p.slug}
                          isRelated={
                            visibleSlugs !== null &&
                            pinnedSlug !== p.slug &&
                            visibleSlugs.has(p.slug)
                          }
                          isHidden={
                            visibleSlugs !== null && !visibleSlugs.has(p.slug)
                          }
                          onTogglePin={handleCardClick}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {filterPersonas(personas).length === 0 && (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No personas match your filter.
                </p>
              )}
            </TabsContent>

            {/* Per-group tabs */}
            {groups.map((g) => (
              <TabsContent key={g.id} value={g.id}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {filterPersonas(g.personas).map((p) => (
                    <PersonaCard
                      key={p.slug}
                      persona={p}
                      isPinned={pinnedSlug === p.slug}
                      isRelated={
                        visibleSlugs !== null &&
                        pinnedSlug !== p.slug &&
                        visibleSlugs.has(p.slug)
                      }
                      isHidden={
                        visibleSlugs !== null && !visibleSlugs.has(p.slug)
                      }
                      onTogglePin={handleCardClick}
                    />
                  ))}
                </div>
                {filterPersonas(g.personas).length === 0 && (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No personas match your filter.
                  </p>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Persona card — click to pin connections, link arrow to navigate
// ---------------------------------------------------------------------------

function PersonaCard({
  persona,
  isPinned,
  isRelated,
  isHidden,
  onTogglePin,
}: {
  persona: Persona;
  isPinned: boolean;
  isRelated: boolean;
  isHidden: boolean;
  onTogglePin: (slug: string) => void;
}) {
  const Icon = GROUP_ICONS[persona.group];

  if (isHidden) return null;

  return (
    <a
      href={`/personas/${persona.slug}`}
      className={cn(
        "group flex items-center gap-3 rounded-lg border border-border/50 px-3.5 py-3 transition-all duration-150",
        isPinned && "ring-2 ring-primary/40 shadow-sm",
        isRelated && "ring-1 ring-primary/20 bg-primary/[0.03]",
        !isPinned && !isRelated && "hover:border-border hover:bg-muted/30",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          GROUP_COLORS[persona.group],
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{persona.title}</p>
        {persona.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {persona.description}
          </p>
        )}
      </div>
      <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
    </a>
  );
}
