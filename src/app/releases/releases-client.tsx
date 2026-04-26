"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Release } from "@/lib/releases";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  SearchIcon,
  ZapIcon,
  AlertTriangleIcon,
  FlameIcon,
} from "lucide-react";

const impactConfig: Record<
  string,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  high: { label: "High Impact", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: FlameIcon },
  medium: { label: "Medium Impact", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: AlertTriangleIcon },
  low: { label: "Low Impact", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: ZapIcon },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ReleasesTimeline({
  releases,
}: {
  releases: Release[];
}) {
  const [search, setSearch] = useState("");
  const [impactFilter, setImpactFilter] = useState<string | null>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => { hasAnimated.current = true; }, 600);
    return () => clearTimeout(timer);
  }, []);

  const filtered = releases.filter((r) => {
    if (impactFilter && r.impact !== impactFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.version.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 md:py-16">
      {/* Header */}
      <div className="mb-8 space-y-3 text-center md:mb-12">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Release Notes
        </h1>
        <p className="text-muted-foreground text-lg">
          What&apos;s been shipped, fixed, and improved.
        </p>
      </div>

      {/* Search + Filter */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search releases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-input/50 bg-muted/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          <button
            onClick={() => setImpactFilter(null)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              !impactFilter
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          {(["high", "medium", "low"] as const).map((level) => {
            const cfg = impactConfig[level];
            const ImpactIcon = cfg.icon;
            const isActive = impactFilter === level;
            return (
              <button
                key={level}
                onClick={() => setImpactFilter(isActive ? null : level)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  isActive
                    ? cn("bg-muted", cfg.color)
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ImpactIcon className="size-3" />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative min-h-[200px]">
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No releases match your search.
          </p>
        )}
        {(() => {
          let lastYear: string | null = null;
          let globalIndex = 0;
          return filtered.map((release) => {
            const impact = impactConfig[release.impact] || impactConfig.low;
            const ImpactIcon = impact.icon;
            const rawDate = release.releaseDate || release.date || "";
            const date = rawDate ? formatDate(rawDate) : "";
            const year = rawDate ? new Date(rawDate).getFullYear().toString() : "";
            const showYearLabel = year && year !== lastYear;
            if (showYearLabel) lastYear = year;
            const index = globalIndex++;

            return (
              <div key={release.slug}>
                {showYearLabel && (
                  <div className="relative flex w-full gap-3 md:gap-6 mb-2">
                    <div className="hidden w-32 shrink-0 md:block" />
                    <div className="flex flex-col items-center">
                      <div className="size-6" />
                    </div>
                    <div className="flex-1 pl-1 md:pl-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                        {year}
                      </p>
                    </div>
                  </div>
                )}
                <motion.div
                  initial={hasAnimated.current ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: hasAnimated.current ? 0 : index * 0.05,
                    type: "spring",
                    stiffness: 300,
                    damping: 26,
                  }}
                  className="relative flex w-full gap-3 md:gap-6"
                >
                  {/* Left column — version + date (desktop) */}
                  <div className="sticky top-20 hidden w-32 shrink-0 self-start pt-1 text-right md:block">
                    <Badge variant="outline" className="mb-1 font-mono text-xs">
                      {release.version}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{date}</p>
                  </div>

                  {/* Timeline dot + line */}
                  <div className="flex flex-col items-center">
                    <div className="sticky top-20 z-10 flex size-6 items-center justify-center">
                      <span className="bg-primary/20 flex size-4.5 shrink-0 items-center justify-center rounded-full">
                        <span className="bg-primary size-3 rounded-full" />
                      </span>
                    </div>
                    {index < filtered.length - 1 && (
                      <span className="-mt-2.5 w-px flex-1 border-l border-border" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-10 pl-1 md:pl-3">
                    {/* Mobile version + date */}
                    <div className="mb-2 flex items-center gap-2 md:hidden">
                      <Badge variant="outline" className="font-mono text-xs">
                        {release.version}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{date}</span>
                    </div>

                    <Link
                      href={`/releases/${release.slug}`}
                      className="group block w-full text-left"
                    >
                      <Card className="shadow-none transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h3 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                              {release.title}
                            </h3>
                            <Badge
                              variant="outline"
                              className={cn("shrink-0 text-[10px]", impact.color)}
                            >
                              <ImpactIcon className="size-3" />
                              {impact.label}
                            </Badge>
                          </div>
                          {release.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {release.description}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                </motion.div>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
