"use client";

import { cn } from "@/lib/utils";
import type { Initiative } from "@/lib/initiatives";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarSeparator } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TcLogo } from "@/components/tc-logo";
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
} from "lucide-react";

export const RAIL_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ADHOC: ZapIcon,
  "Budgets-And-Finance": BanknoteIcon,
  "Clinical-And-Care-Plan": HeartPulseIcon,
  "Consumer-Lifecycle": UsersIcon,
  "Consumer-Mobile": SmartphoneIcon,
  Infrastructure: WrenchIcon,
  "Partner-Management": HandshakeIcon,
  "Supplier-Management": TruckIcon,
  "Coordinator-Management": HandshakeIcon,
  "Work-Management": ClipboardListIcon,
};

export function InitiativeRail({
  initiatives,
  activeSlug,
  onSelect,
}: {
  initiatives: Initiative[];
  activeSlug?: string | null;
  onSelect: (initiative: Initiative) => void;
}) {
  return (
    <>
      {/* Icon Rail (fixed left) */}
      <div className="fixed inset-y-0 left-0 z-30 hidden w-[60px] flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-14 items-center justify-center">
          <a href="/" className="flex items-center justify-center">
            <TcLogo />
          </a>
        </div>
        <SidebarSeparator />
        <ScrollArea className="flex-1">
          <div className="flex flex-col items-center gap-1 py-2">
            {initiatives.map((initiative) => {
              const isActive = initiative.slug === activeSlug;
              const Icon = RAIL_ICON_MAP[initiative.slug] || ClipboardListIcon;
              return (
                <Tooltip key={initiative.slug}>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={() => onSelect(initiative)}
                        className={cn(
                          "relative flex size-10 items-center justify-center rounded-lg transition-colors",
                          "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                          isActive &&
                            "bg-sidebar-accent text-sidebar-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-full before:bg-primary",
                        )}
                      >
                        <Icon className="size-5" />
                      </button>
                    }
                  />
                  <TooltipContent side="right" className="text-xs">
                    {initiative.title}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </ScrollArea>
      </div>
      {/* Spacer to push content right */}
      <div className="hidden w-[60px] shrink-0 md:block" />
    </>
  );
}
