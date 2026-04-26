"use client";

import { useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import type { Initiative } from "@/lib/initiatives";
import { InitiativeRail } from "@/components/initiative-rail";
import { InternalHeader } from "@/components/internal-header";
import {
  LayoutGridIcon,
  KanbanIcon,
  ChevronRightIcon,
  MenuIcon,
} from "lucide-react";

import { DashboardShell } from "./dashboard-client";
import { StrategyClient } from "./strategy/strategy-client";

/* ── Mode toggle ── */

function ModeToggle({
  mode,
  onChange,
}: {
  mode: "view" | "plan";
  onChange: (mode: "view" | "plan") => void;
}) {
  return (
    <div className="flex items-center rounded-lg border p-0.5">
      {([
        { id: "view" as const, label: "View", icon: LayoutGridIcon },
        { id: "plan" as const, label: "Plan", icon: KanbanIcon },
      ]).map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            mode === id
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

/* ── Main orchestrator ── */

export function DashboardOrchestrator({
  initiatives,
  readOnly,
}: {
  initiatives: Initiative[];
  readOnly: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode") === "plan" ? "plan" : "view";

  const setMode = useCallback(
    (newMode: "view" | "plan") => {
      const params = new URLSearchParams(searchParams.toString());
      if (newMode === "plan") {
        params.set("mode", "plan");
      } else {
        params.delete("mode");
      }
      // Clear mode-specific params when switching
      if (newMode === "view") {
        params.delete("initiative");
        params.delete("hideBacklog");
      }
      if (newMode === "plan") {
        params.delete("i");
        params.delete("e");
        params.delete("a");
      }
      const qs = params.toString();
      router.replace(qs ? `/dashboard?${qs}` : "/dashboard", { scroll: false });
    },
    [searchParams, router],
  );

  const handleRailSelect = useCallback(
    (initiative: Initiative) => {
      const params = new URLSearchParams(searchParams.toString());
      if (mode === "view") {
        params.set("i", initiative.slug);
        params.delete("e");
        params.delete("a");
      } else {
        params.set("initiative", initiative.slug);
      }
      const qs = params.toString();
      router.replace(qs ? `/dashboard?${qs}` : "/dashboard", { scroll: false });
    },
    [searchParams, router, mode],
  );

  const activeRailSlug =
    mode === "view"
      ? searchParams.get("i") ?? null
      : searchParams.get("initiative") !== "all"
        ? searchParams.get("initiative")
        : null;

  return (
    <div className="min-h-dvh flex">
      <InitiativeRail
        initiatives={initiatives}
        activeSlug={activeRailSlug}
        onSelect={handleRailSelect}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <InternalHeader>
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Initiatives</span>
          </nav>
          <div className="ml-3">
            <ModeToggle mode={mode} onChange={setMode} />
          </div>
        </InternalHeader>

        <motion.div
          className="flex-1 w-full"
          animate={{
            maxWidth: mode === "plan" ? "100%" : "72rem",
          }}
          transition={{ type: "spring", stiffness: 200, damping: 28 }}
          style={{ margin: "0 auto", width: "100%" }}
        >
          <AnimatePresence mode="wait">
            {mode === "view" ? (
              <motion.div
                key="view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <DashboardShell initiatives={initiatives} embedded />
              </motion.div>
            ) : (
              <motion.div
                key="plan"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <StrategyClient
                  initiatives={initiatives}
                  readOnly={readOnly}
                  embedded
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
