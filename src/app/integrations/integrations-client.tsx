"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MotionPreset } from "@/components/ui/motion-preset";
import {
  Users,
  Landmark,
  MessageSquare,
  Shield,
  Building2,
  Database,
  Calendar,
  ArrowRight,
  ArrowLeftIcon,
  HeartPulseIcon,
  DollarSignIcon,
  SettingsIcon,
  ShieldIcon,
  BrainCircuitIcon,
  ServerIcon,
  ScaleIcon,
  type LucideIcon,
} from "lucide-react";
import {
  CATEGORY_META,
  type Integration,
  type IntegrationCategory,
} from "@/lib/integration-types";
import type { DomainData, Domain } from "@/lib/domain-types";

// ---------------------------------------------------------------------------
// Integration category config
// ---------------------------------------------------------------------------

const CATEGORY_ICONS: Record<IntegrationCategory, LucideIcon> = {
  crm: Users,
  finance: Landmark,
  communication: MessageSquare,
  auth: Shield,
  government: Building2,
  data: Database,
  booking: Calendar,
};

// ---------------------------------------------------------------------------
// Domain cluster config (mirrors domains-client.tsx)
// ---------------------------------------------------------------------------

const CLUSTER_ICONS: Record<string, LucideIcon> = {
  clinical: HeartPulseIcon,
  financial: DollarSignIcon,
  operations: SettingsIcon,
  identity: ShieldIcon,
  ai: BrainCircuitIcon,
  platform: ServerIcon,
  compliance: ScaleIcon,
};

const CLUSTER_COLORS: Record<
  string,
  { bg: string; border: string; dot: string; text: string }
> = {
  clinical: {
    bg: "bg-rose-500/8",
    border: "border-rose-500/20",
    dot: "bg-rose-400",
    text: "text-rose-400",
  },
  financial: {
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/20",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
  },
  operations: {
    bg: "bg-blue-500/8",
    border: "border-blue-500/20",
    dot: "bg-blue-400",
    text: "text-blue-400",
  },
  identity: {
    bg: "bg-amber-500/8",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
    text: "text-amber-400",
  },
  ai: {
    bg: "bg-violet-500/8",
    border: "border-violet-500/20",
    dot: "bg-violet-400",
    text: "text-violet-400",
  },
  platform: {
    bg: "bg-cyan-500/8",
    border: "border-cyan-500/20",
    dot: "bg-cyan-400",
    text: "text-cyan-400",
  },
  compliance: {
    bg: "bg-orange-500/8",
    border: "border-orange-500/20",
    dot: "bg-orange-400",
    text: "text-orange-400",
  },
};

const defaultColors = {
  bg: "bg-zinc-500/8",
  border: "border-zinc-500/20",
  dot: "bg-zinc-400",
  text: "text-zinc-400",
};

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function getStatusColor(maturity: string): string {
  const lower = maturity.toLowerCase();
  if (lower.includes("production") || lower.includes("active"))
    return "bg-emerald-500";
  if (lower.includes("planned") || lower.includes("pending"))
    return "bg-amber-400";
  if (lower.includes("development") || lower.includes("pilot"))
    return "bg-sky-400";
  return "bg-muted-foreground/50";
}

function StatusDot({ maturity }: { maturity: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${getStatusColor(maturity)}`}
      />
      <span
        className={`relative inline-flex h-2.5 w-2.5 rounded-full ${getStatusColor(maturity)}`}
      />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Filtered domain map — shows only domains related to selected integration
// ---------------------------------------------------------------------------

function FilteredDomainMap({
  domainData,
  relatedSlugs,
  integrationTitle,
}: {
  domainData: DomainData;
  relatedSlugs: Set<string>;
  integrationTitle: string;
}) {
  const domainMap = useMemo(() => {
    const map = new Map<string, Domain>();
    for (const d of domainData.domains) map.set(d.slug, d);
    return map;
  }, [domainData.domains]);

  // Filter clusters to only show ones with related domains
  const relevantClusters = useMemo(() => {
    return domainData.clusters
      .map((cluster) => ({
        ...cluster,
        domains: cluster.domains.filter((d) => relatedSlugs.has(d.slug)),
      }))
      .filter((cluster) => cluster.domains.length > 0);
  }, [domainData.clusters, relatedSlugs]);

  if (relevantClusters.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/50 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No domain connections documented for {integrationTitle} yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          {integrationTitle} touches{" "}
          <strong className="text-foreground">{relatedSlugs.size}</strong>{" "}
          domain{relatedSlugs.size !== 1 ? "s" : ""} across{" "}
          <strong className="text-foreground">
            {relevantClusters.length}
          </strong>{" "}
          cluster{relevantClusters.length !== 1 ? "s" : ""}
        </span>
      </div>

      {relevantClusters.map((cluster) => {
        const colors = CLUSTER_COLORS[cluster.id] || defaultColors;
        const Icon = CLUSTER_ICONS[cluster.id] || SettingsIcon;

        return (
          <div key={cluster.id}>
            <div className="mb-2 flex items-center gap-2">
              <div className={cn("size-2 rounded-full", colors.dot)} />
              <Icon className={cn("size-3.5", colors.text)} />
              <span className={cn("text-xs font-medium", colors.text)}>
                {cluster.label}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {cluster.domains.map((domain) => (
                <div
                  key={domain.slug}
                  className={cn(
                    "rounded-lg border p-3",
                    colors.bg,
                    colors.border
                  )}
                >
                  <p className="text-sm font-medium leading-tight">
                    {domain.title}
                  </p>
                  {domain.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {domain.description}
                    </p>
                  )}
                  {domain.relatedDomains.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {domain.relatedDomains.slice(0, 4).map((rel) => {
                        const relDomain = domainMap.get(rel);
                        return (
                          <span
                            key={rel}
                            className={cn(
                              "inline-block rounded px-1.5 py-0.5 text-[10px]",
                              relatedSlugs.has(rel)
                                ? cn(colors.text, "bg-background/50")
                                : "text-muted-foreground bg-muted/30"
                            )}
                          >
                            {relDomain?.title ?? rel.replace(/-/g, " ")}
                          </span>
                        );
                      })}
                      {domain.relatedDomains.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{domain.relatedDomains.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Integration card in the hub
// ---------------------------------------------------------------------------

function IntegrationHubItem({
  integration,
  isSelected,
  onSelect,
}: {
  integration: Integration;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-all duration-200",
        isSelected
          ? "bg-primary/10 ring-1 ring-primary/30"
          : "hover:bg-muted/50"
      )}
    >
      <StatusDot maturity={integration.maturity} />
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "text-sm font-medium",
            isSelected && "text-primary"
          )}
        >
          {integration.title}
        </span>
        <p className="truncate text-xs text-muted-foreground">
          {integration.description}
        </p>
      </div>
      {integration.relatedDomains.length > 0 && (
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          {integration.relatedDomains.length}
        </Badge>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

export function IntegrationsClient({
  integrations,
  domainData,
}: {
  integrations: Integration[];
  domainData: DomainData;
}) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const selected = useMemo(
    () => integrations.find((i) => i.slug === selectedSlug) ?? null,
    [integrations, selectedSlug]
  );

  const relatedSlugs = useMemo(
    () => new Set(selected?.relatedDomains ?? []),
    [selected]
  );

  // Group by category
  const grouped = useMemo(() => {
    const g: Record<IntegrationCategory, Integration[]> = {
      crm: [],
      finance: [],
      communication: [],
      auth: [],
      government: [],
      data: [],
      booking: [],
    };
    for (const i of integrations) g[i.category].push(i);
    return g;
  }, [integrations]);

  const categories = useMemo(
    () =>
      (Object.keys(CATEGORY_META) as IntegrationCategory[]).filter(
        (cat) => grouped[cat].length > 0
      ),
    [grouped]
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        {/* Hero */}
        <MotionPreset
          fade
          blur
          slide={{ direction: "up", offset: 30 }}
          delay={0}
        >
          <div className="mb-16 text-center">
            <Badge variant="secondary" className="mb-4">
              Integrations
            </Badge>
            <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
              External Systems
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              How TC Portal connects to external services. Select an integration
              to see which domains it touches.
            </p>
          </div>
        </MotionPreset>

        {/* Main layout: integration list + domain map */}
        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          {/* Left: integration list grouped by category */}
          <div className="space-y-6">
            <MotionPreset
              fade
              slide={{ direction: "up", offset: 20 }}
              delay={0.05}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Integrations
                </h2>
                <span className="text-xs text-muted-foreground">
                  {integrations.length} systems
                </span>
              </div>
            </MotionPreset>

            {categories.map((category, catIdx) => {
              const Icon = CATEGORY_ICONS[category];
              const meta = CATEGORY_META[category];
              return (
                <MotionPreset
                  key={category}
                  fade
                  slide={{ direction: "up", offset: 20 }}
                  delay={catIdx * 0.04 + 0.1}
                >
                  <Card className="border-border/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider">
                          {meta.label}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-0.5">
                      {grouped[category].map((integration) => (
                        <IntegrationHubItem
                          key={integration.slug}
                          integration={integration}
                          isSelected={selectedSlug === integration.slug}
                          onSelect={() =>
                            setSelectedSlug(
                              selectedSlug === integration.slug
                                ? null
                                : integration.slug
                            )
                          }
                        />
                      ))}
                    </CardContent>
                  </Card>
                </MotionPreset>
              );
            })}
          </div>

          {/* Right: domain map (filtered when an integration is selected) */}
          <div className="space-y-6">
            <MotionPreset
              fade
              slide={{ direction: "up", offset: 20 }}
              delay={0.05}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Domain Map
                </h2>
                {selected && (
                  <button
                    onClick={() => setSelectedSlug(null)}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowLeftIcon className="size-3" />
                    Show all
                  </button>
                )}
              </div>
            </MotionPreset>

            {selected ? (
              /* Filtered view: selected integration detail + related domains */
              <div className="space-y-6">
                {/* Integration detail */}
                <MotionPreset fade slide={{ direction: "up", offset: 20 }} delay={0}>
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <StatusDot maturity={selected.maturity} />
                      <span className="text-lg font-semibold">
                        {selected.title}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {
                          CATEGORY_META[selected.category]
                            .label
                        }
                      </Badge>
                    </div>
                    {selected.description && (
                      <p className="text-sm text-muted-foreground">
                        {selected.description}
                      </p>
                    )}
                    <div className="space-y-1.5">
                      {selected.what && (
                        <div className="flex gap-2 text-sm">
                          <span className="shrink-0 font-medium text-muted-foreground">
                            What
                          </span>
                          <span>{selected.what}</span>
                        </div>
                      )}
                      {selected.who && (
                        <div className="flex gap-2 text-sm">
                          <span className="shrink-0 font-medium text-muted-foreground">
                            Who
                          </span>
                          <span>{selected.who}</span>
                        </div>
                      )}
                      {selected.keyFlow && (
                        <div className="flex gap-2 text-sm">
                          <span className="shrink-0 font-medium text-muted-foreground">
                            Flow
                          </span>
                          <span className="flex flex-wrap items-center gap-1 text-muted-foreground">
                            {selected.keyFlow
                              .split(/\s*(?:→|-->|->)\s*/)
                              .map((step, i, arr) => (
                                <span
                                  key={i}
                                  className="flex items-center gap-1"
                                >
                                  <span className="rounded bg-background/60 px-1.5 py-0.5 text-xs font-medium text-foreground">
                                    {step}
                                  </span>
                                  {i < arr.length - 1 && (
                                    <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                                  )}
                                </span>
                              ))}
                          </span>
                        </div>
                      )}
                    </div>
                    {selected.maturity && (
                      <div className="flex items-center gap-2 pt-1">
                        <Badge
                          variant={
                            selected.maturity
                              .toLowerCase()
                              .includes("production")
                              ? "default"
                              : "outline"
                          }
                        >
                          {selected.maturity}
                        </Badge>
                        {selected.pod && (
                          <span className="text-xs text-muted-foreground">
                            Pod: {selected.pod}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
                </MotionPreset>

                <Separator />

                {/* Filtered domain map */}
                <MotionPreset fade slide={{ direction: "up", offset: 20 }} delay={0.1}>
                <FilteredDomainMap
                  domainData={domainData}
                  relatedSlugs={relatedSlugs}
                  integrationTitle={selected.title}
                />
                </MotionPreset>
              </div>
            ) : (
              /* Default view: full domain map with all clusters, dimmed */
              <div className="space-y-4">
                <MotionPreset fade slide={{ direction: "up", offset: 15 }} delay={0.1}>
                <p className="text-sm text-muted-foreground">
                  {domainData.domains.length} domains across{" "}
                  {domainData.clusters.length} clusters. Select an integration
                  to filter.
                </p>
                </MotionPreset>

                {domainData.clusters.map((cluster, clusterIdx) => {
                  const colors =
                    CLUSTER_COLORS[cluster.id] || defaultColors;
                  const Icon = CLUSTER_ICONS[cluster.id] || SettingsIcon;

                  return (
                    <MotionPreset key={cluster.id} fade slide={{ direction: "up", offset: 20 }} delay={clusterIdx * 0.05 + 0.15}>
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <div
                          className={cn(
                            "size-2 rounded-full",
                            colors.dot
                          )}
                        />
                        <Icon
                          className={cn("size-3.5", colors.text)}
                        />
                        <span
                          className={cn(
                            "text-xs font-medium",
                            colors.text
                          )}
                        >
                          {cluster.label}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {cluster.domains.length}
                        </Badge>
                      </div>
                      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                        {cluster.domains.map((domain) => (
                          <div
                            key={domain.slug}
                            className="rounded-lg border border-border/50 p-2.5"
                          >
                            <p className="text-sm font-medium leading-tight truncate">
                              {domain.title}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                              {domain.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    </MotionPreset>
                  );
                })}

                {/* Legend */}
                <MotionPreset fade slide={{ direction: "up", offset: 15 }} delay={0.3}>
                <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                  <span className="text-xs text-muted-foreground font-medium">
                    Clusters:
                  </span>
                  {domainData.clusters.map((cluster) => {
                    const colors =
                      CLUSTER_COLORS[cluster.id] || defaultColors;
                    return (
                      <div
                        key={cluster.id}
                        className="flex items-center gap-1.5"
                      >
                        <div
                          className={cn(
                            "size-2 rounded-full",
                            colors.dot
                          )}
                        />
                        <span className="text-xs text-muted-foreground">
                          {cluster.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                </MotionPreset>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
