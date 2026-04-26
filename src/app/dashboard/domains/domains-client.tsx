"use client";

import { useState, useRef, useCallback, useMemo, type ComponentPropsWithoutRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { DomainData, Domain } from "@/lib/domains";
import { InternalHeader } from "@/components/internal-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  NetworkIcon,
  LayoutGridIcon,
  SearchIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
  HeartPulseIcon,
  DollarSignIcon,
  SettingsIcon,
  ShieldIcon,
  BrainCircuitIcon,
  ServerIcon,
  ScaleIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Cluster config
// ---------------------------------------------------------------------------

const CLUSTER_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  clinical: HeartPulseIcon,
  financial: DollarSignIcon,
  operations: SettingsIcon,
  identity: ShieldIcon,
  ai: BrainCircuitIcon,
  platform: ServerIcon,
  compliance: ScaleIcon,
};

const CLUSTER_COLORS: Record<string, { bg: string; border: string; dot: string; text: string }> = {
  clinical: { bg: "bg-rose-500/8", border: "border-rose-500/20", dot: "bg-rose-400", text: "text-rose-400" },
  financial: { bg: "bg-emerald-500/8", border: "border-emerald-500/20", dot: "bg-emerald-400", text: "text-emerald-400" },
  operations: { bg: "bg-blue-500/8", border: "border-blue-500/20", dot: "bg-blue-400", text: "text-blue-400" },
  identity: { bg: "bg-amber-500/8", border: "border-amber-500/20", dot: "bg-amber-400", text: "text-amber-400" },
  ai: { bg: "bg-violet-500/8", border: "border-violet-500/20", dot: "bg-violet-400", text: "text-violet-400" },
  platform: { bg: "bg-cyan-500/8", border: "border-cyan-500/20", dot: "bg-cyan-400", text: "text-cyan-400" },
  compliance: { bg: "bg-orange-500/8", border: "border-orange-500/20", dot: "bg-orange-400", text: "text-orange-400" },
};

const defaultColors = { bg: "bg-zinc-500/8", border: "border-zinc-500/20", dot: "bg-zinc-400", text: "text-zinc-400" };

const springTransition = { type: "spring" as const, stiffness: 300, damping: 26 };

// ---------------------------------------------------------------------------
// Heading anchors & TOC helpers
// ---------------------------------------------------------------------------

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

interface TocEntry {
  id: string;
  text: string;
  level: number;
}

function extractHeadings(markdown: string): TocEntry[] {
  const entries: TocEntry[] = [];
  for (const line of markdown.split("\n")) {
    const match = line.match(/^(#{2,3})\s+(.+)/);
    if (match) {
      const text = match[2].replace(/\*\*/g, "").trim();
      entries.push({ id: slugify(text), text, level: match[1].length });
    }
  }
  return entries;
}

function HeadingWithAnchor({
  level,
  children,
  ...props
}: ComponentPropsWithoutRef<"h2"> & { level: 2 | 3 }) {
  const text =
    typeof children === "string"
      ? children
      : Array.isArray(children)
        ? children.map((c) => (typeof c === "string" ? c : "")).join("")
        : "";
  const id = slugify(text);
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <Tag id={id} className="scroll-mt-20 group" {...props}>
      <a href={`#${id}`} className="no-underline hover:underline">
        {children}
      </a>
    </Tag>
  );
}

// ---------------------------------------------------------------------------
// Interactive cluster graph — hover to show connections
// ---------------------------------------------------------------------------

function ClusterGraph({
  data,
  onNodeClick,
}: {
  data: DomainData;
  onNodeClick: (domain: Domain) => void;
}) {
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build lookup maps
  const domainMap = useMemo(() => {
    const map = new Map<string, Domain>();
    for (const d of data.domains) map.set(d.slug, d);
    return map;
  }, [data.domains]);

  // Get related domains for the hovered node
  const hoveredDomain = hoveredSlug ? domainMap.get(hoveredSlug) : null;
  const relatedSet = useMemo(() => {
    if (!hoveredDomain) return new Set<string>();
    const set = new Set(hoveredDomain.relatedDomains);
    // Also find domains that reference the hovered domain
    for (const d of data.domains) {
      if (d.relatedDomains.includes(hoveredDomain.slug)) {
        set.add(d.slug);
      }
    }
    return set;
  }, [hoveredDomain, data.domains]);

  return (
    <div ref={containerRef} className="space-y-6">
      {data.clusters.map((cluster) => {
        const colors = CLUSTER_COLORS[cluster.id] || defaultColors;
        const Icon = CLUSTER_ICONS[cluster.id] || SettingsIcon;
        return (
          <div key={cluster.id}>
            <div className="mb-3 flex items-center gap-2">
              <div className={cn("size-2 rounded-full", colors.dot)} />
              <Icon className={cn("size-4", colors.text)} />
              <h3 className={cn("text-sm font-medium", colors.text)}>
                {cluster.label}
              </h3>
              <Badge variant="secondary" className="text-[10px]">
                {cluster.domains.length}
              </Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {cluster.domains.map((domain) => {
                const isHovered = hoveredSlug === domain.slug;
                const isRelated = relatedSet.has(domain.slug);
                const isDimmed = hoveredSlug !== null && !isHovered && !isRelated;

                return (
                  <button
                    key={domain.slug}
                    type="button"
                    onClick={() => onNodeClick(domain)}
                    onMouseEnter={() => setHoveredSlug(domain.slug)}
                    onMouseLeave={() => setHoveredSlug(null)}
                    className={cn(
                      "group relative rounded-lg border p-3 text-left transition-all duration-200",
                      isHovered
                        ? cn(colors.bg, colors.border, "shadow-md scale-[1.02] z-40")
                        : isRelated
                          ? cn(colors.bg, colors.border, "shadow-sm")
                          : "border-border/50 bg-card hover:border-border hover:shadow-sm",
                      isDimmed && "opacity-30",
                    )}
                  >
                    <p className="text-sm font-medium leading-tight truncate">
                      {domain.title}
                    </p>
                    {domain.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                        {domain.description}
                      </p>
                    )}
                    {/* Connection count indicator */}
                    {domain.relatedDomains.length > 0 && (
                      <div className="mt-2 flex items-center gap-1">
                        <div className="flex -space-x-1">
                          {domain.relatedDomains.slice(0, 4).map((_, i) => (
                            <div
                              key={i}
                              className={cn(
                                "size-1.5 rounded-full border border-background",
                                isHovered || isRelated ? colors.dot : "bg-zinc-600",
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {domain.relatedDomains.length} connection{domain.relatedDomains.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                    {/* Hover tooltip showing connections */}
                    {isHovered && domain.relatedDomains.length > 0 && (
                      <div className="absolute -bottom-1 left-0 right-0 translate-y-full z-50 rounded-md border border-border bg-zinc-900 p-2 shadow-xl">
                        <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                          Connected to
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {domain.relatedDomains.map((rel) => {
                            const relDomain = domainMap.get(rel);
                            return (
                              <span
                                key={rel}
                                className={cn(
                                  "inline-block rounded px-1.5 py-0.5 text-[10px]",
                                  colors.bg, colors.text,
                                )}
                              >
                                {relDomain?.title ?? rel.replace(/-/g, " ")}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
        <span className="text-xs text-muted-foreground font-medium">Clusters:</span>
        {data.clusters.map((cluster) => {
          const colors = CLUSTER_COLORS[cluster.id] || defaultColors;
          return (
            <div key={cluster.id} className="flex items-center gap-1.5">
              <div className={cn("size-2 rounded-full", colors.dot)} />
              <span className="text-xs text-muted-foreground">{cluster.label}</span>
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Hover a domain to highlight its connections. Click to view details.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

export function DomainsClient({ data }: { data: DomainData }) {
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"graph" | "grid">("graph");

  const handleNodeClick = useCallback(
    (domain: Domain) => {
      setSelectedDomain(domain);
    },
    [],
  );

  function filterDomains(domains: Domain[]) {
    if (!searchQuery) return domains;
    const q = searchQuery.toLowerCase();
    return domains.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.slug.toLowerCase().includes(q),
    );
  }

  const totalDomains = data.domains.length;

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <InternalHeader>
        {selectedDomain ? (
          <button
            type="button"
            onClick={() => setSelectedDomain(null)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" />
            Domains
          </button>
        ) : (
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <a
              href="/dashboard"
              className="rounded-md px-2 py-1 transition-colors hover:text-foreground"
            >
              Initiatives
            </a>
            <ChevronRightIcon className="size-3.5" />
            <span className="font-medium text-foreground">Domain Map</span>
            <ChevronRightIcon className="size-3.5" />
            <a
              href="/dashboard/glossary"
              className="rounded-md px-2 py-1 transition-colors hover:text-foreground"
            >
              Glossary
            </a>
          </nav>
        )}
      </InternalHeader>

      {/* Content */}
      <div className="flex-1 px-4 py-6 sm:px-6">
        <AnimatePresence mode="wait">
          {selectedDomain ? (
            /* ---- Detail view ---- */
            <motion.div
              key={`domain-${selectedDomain.slug}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springTransition}
              className="mx-auto max-w-5xl"
            >
              {(() => {
                const toc = extractHeadings(selectedDomain.content);
                const showToc = toc.length >= 3;
                return (
                  <div className={showToc ? "flex gap-10" : ""}>
                    {/* Main content */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-6">
                        <Badge variant="secondary" className="mb-2 text-xs capitalize">
                          {data.clusters.find((c) => c.id === selectedDomain.cluster)
                            ?.label ?? selectedDomain.cluster}
                        </Badge>
                        <h1 className="text-2xl font-bold tracking-tight">
                          {selectedDomain.title}
                        </h1>
                        {selectedDomain.description && (
                          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
                            {selectedDomain.description}
                          </p>
                        )}
                      </div>

                      {/* Related domains */}
                      {selectedDomain.relatedDomains.length > 0 && (
                        <div className="mb-4">
                          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Related Domains
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedDomain.relatedDomains.map((rel) => {
                              const relDomain = data.domains.find(
                                (d) => d.slug === rel,
                              );
                              return (
                                <button
                                  key={rel}
                                  type="button"
                                  onClick={() => {
                                    if (relDomain) setSelectedDomain(relDomain);
                                  }}
                                  className="inline-flex items-center rounded-md border border-border/50 bg-muted/50 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted"
                                >
                                  {relDomain?.title ?? rel.replace(/-/g, " ")}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <Card className="shadow-none">
                        <CardContent className="p-6 sm:p-8">
                          <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-lg prose-h3:text-base prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-a:text-primary prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-hr:border-border prose-table:text-sm prose-th:text-left prose-th:font-medium">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h2: (props) => <HeadingWithAnchor level={2} {...props} />,
                                h3: (props) => <HeadingWithAnchor level={3} {...props} />,
                              }}
                            >
                              {selectedDomain.content}
                            </ReactMarkdown>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Sticky sidebar TOC */}
                    {showToc && (
                      <motion.aside
                        initial={{ opacity: 0, x: 15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ ...springTransition, delay: 0.15 }}
                        className="sticky top-20 hidden h-fit w-48 shrink-0 xl:block"
                      >
                        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                          On this page
                        </p>
                        <nav className="flex flex-col gap-1.5 border-l">
                          {toc.map((entry) => (
                            <a
                              key={entry.id}
                              href={`#${entry.id}`}
                              className={cn(
                                "text-xs text-muted-foreground transition-colors hover:text-foreground",
                                entry.level === 2 ? "pl-3" : "pl-5",
                              )}
                            >
                              {entry.text}
                            </a>
                          ))}
                        </nav>
                      </motion.aside>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          ) : (
            /* ---- Overview ---- */
            <motion.div
              key="domains-overview"
              initial={false}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={springTransition}
              className="mx-auto max-w-6xl"
            >
              {/* Title bar */}
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Domain Map
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {totalDomains} domains across{" "}
                    {data.clusters.length} clusters
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* View toggle */}
                  <div className="flex items-center rounded-lg border border-input/50 bg-muted/50 p-0.5">
                    <button
                      type="button"
                      onClick={() => setView("graph")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                        view === "graph"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <NetworkIcon className="size-3.5" />
                      Graph
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("grid")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                        view === "grid"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <LayoutGridIcon className="size-3.5" />
                      List
                    </button>
                  </div>
                  {/* Search */}
                  <div className="relative w-full sm:w-60">
                    <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Filter domains..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 w-full rounded-lg border border-input/50 bg-muted/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                </div>
              </div>

              {/* Graph view — cluster-based interactive layout */}
              {view === "graph" && !searchQuery && (
                <ClusterGraph data={data} onNodeClick={handleNodeClick} />
              )}

              {/* List / filtered view */}
              {(view === "grid" || searchQuery) && (
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  {data.clusters.map((cluster, ci) => {
                    const filtered = filterDomains(cluster.domains);
                    if (filtered.length === 0) return null;
                    const colors = CLUSTER_COLORS[cluster.id] || defaultColors;
                    const Icon = CLUSTER_ICONS[cluster.id] || SettingsIcon;
                    return (
                      <div key={cluster.id}>
                        {ci > 0 && <Separator />}
                        {/* Cluster header row */}
                        <div className="flex items-center gap-2 bg-muted/30 px-4 py-2">
                          <div className={cn("size-2 rounded-full", colors.dot)} />
                          <Icon className={cn("size-3.5", colors.text)} />
                          <span className="text-xs font-medium text-muted-foreground">
                            {cluster.label}
                          </span>
                          <Badge variant="secondary" className="text-[10px]">
                            {filtered.length}
                          </Badge>
                        </div>
                        {/* Domain rows */}
                        {filtered.map((domain) => (
                          <button
                            key={domain.slug}
                            type="button"
                            onClick={() => setSelectedDomain(domain)}
                            className="flex w-full items-center gap-4 border-t border-border/30 px-4 py-2.5 text-left transition-colors hover:bg-muted/30"
                          >
                            <span className="text-sm font-medium truncate min-w-[160px] max-w-[240px]">
                              {domain.title}
                            </span>
                            <span className="flex-1 text-xs text-muted-foreground truncate hidden sm:block">
                              {domain.description}
                            </span>
                            {domain.relatedDomains.length > 0 && (
                              <span className="shrink-0 text-[10px] text-muted-foreground/70">
                                {domain.relatedDomains.length} connection{domain.relatedDomains.length !== 1 ? "s" : ""}
                              </span>
                            )}
                            <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground/50" />
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
