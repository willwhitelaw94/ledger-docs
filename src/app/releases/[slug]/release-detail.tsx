"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Release } from "@/lib/releases";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeftIcon,
  CalendarIcon,
  RocketIcon,
  HashIcon,
  FlameIcon,
  AlertTriangleIcon,
  ZapIcon,
  GithubIcon,
} from "lucide-react";

const impactConfig: Record<
  string,
  { label: string; color: string }
> = {
  high: { label: "High Impact", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  medium: { label: "Medium Impact", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  low: { label: "Low Impact", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function JumpToLinks({ contentRef }: { contentRef: React.RefObject<HTMLDivElement | null> }) {
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);

  const extractHeadings = useCallback(() => {
    if (!contentRef.current) return;
    const els = contentRef.current.querySelectorAll("h2[id], h3[id]");
    const items: { id: string; text: string; level: number }[] = [];
    els.forEach((el) => {
      const id = el.getAttribute("id");
      const text = el.textContent?.replace(/#$/, "").trim();
      const level = el.tagName === "H2" ? 2 : 3;
      if (id && text) items.push({ id, text, level });
    });
    if (items.length > 0) setHeadings(items);
  }, [contentRef]);

  useEffect(() => {
    const timers = [
      setTimeout(extractHeadings, 100),
      setTimeout(extractHeadings, 400),
    ];
    return () => timers.forEach(clearTimeout);
  }, [extractHeadings]);

  if (headings.length === 0) return null;

  return (
    <aside className="hidden xl:block w-56 shrink-0">
      <div className="sticky top-20">
        <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <HashIcon className="size-3" />
          On this page
        </div>
        <nav className="flex flex-col gap-0.5 max-h-[calc(100vh-8rem)] overflow-y-auto">
          {headings.map((h) => (
            <a
              key={h.id}
              href={`#${h.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth" });
              }}
              className={cn(
                "text-xs text-muted-foreground transition-colors hover:text-foreground py-1 px-2 rounded-md hover:bg-accent leading-snug",
                h.level === 3 && "pl-4 text-[11px]"
              )}
              title={h.text}
            >
              {h.text}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}

export function ReleaseDetail({
  release,
  children,
}: {
  release: Release;
  children: React.ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 md:py-16">
      <Link
        href="/releases"
        className="mb-6 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        All Releases
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Badge variant="outline" className="font-mono text-xs">
            {release.version}
          </Badge>
          {impactConfig[release.impact] && (
            <Badge
              variant="outline"
              className={cn("text-xs", impactConfig[release.impact].color)}
            >
              {impactConfig[release.impact].label}
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {release.title}
        </h1>
        {release.description && (
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            {release.description}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
          {release.date && (
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="size-3.5" />
              Staged {formatDate(release.date)}
            </span>
          )}
          {release.releaseDate && (
            <>
              {release.date && <span className="text-border">·</span>}
              <span className="flex items-center gap-1.5">
                <RocketIcon className="size-3.5" />
                Released {formatDate(release.releaseDate)}
              </span>
            </>
          )}
          {release.githubUrl && (
            <>
              <span className="text-border">·</span>
              <a
                href={release.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <GithubIcon className="size-3.5" />
                {release.version}
              </a>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        <Card className="shadow-none flex-1 min-w-0">
          <CardContent className="p-6 sm:p-8">
            <div
              ref={contentRef}
              className="prose prose-sm prose-zinc dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-lg prose-h2:mt-8 prose-h2:pt-6 prose-h2:border-t prose-h2:border-border prose-h3:text-base prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-a:text-primary prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-hr:border-border prose-table:text-sm prose-th:text-left prose-th:font-medium"
            >
              {children}
            </div>
          </CardContent>
        </Card>

        <JumpToLinks contentRef={contentRef} />
      </div>
    </div>
  );
}
