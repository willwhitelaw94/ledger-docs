"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { HomeIcon, ChevronDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// ---------------------------------------------------------------------------
// Nav structure
// ---------------------------------------------------------------------------

type NavLink = { href: string; label: string };

type NavItemDef =
  | { type: "link"; href: string; label: string; icon?: boolean }
  | { type: "dropdown"; label: string; items: NavLink[] }
  | { type: "separator" };

const ITEMS: NavItemDef[] = [
  { type: "link", href: "/", label: "Home", icon: true },
  { type: "link", href: "/dashboard", label: "Initiatives" },
  {
    type: "dropdown",
    label: "SDD",
    items: [
      { href: "/sdd", label: "Process" },
      { href: "/dashboard/domains", label: "Domains" },
      { href: "/skills", label: "Skills" },
      { href: "/integrations", label: "Integrations" },
    ],
  },

  {
    type: "dropdown",
    label: "Design",
    items: [
      { href: "/personas", label: "Personas" },
    ],
  },
  { type: "link", href: "/releases", label: "Releases" },

  { type: "separator" },

  { type: "link", href: "/docs", label: "Docs" },
];

// Flatten all links for active-state matching
const ALL_LINKS = ITEMS.flatMap((item) => {
  if (item.type === "link") return [item];
  if (item.type === "dropdown") return item.items.map((i) => ({ ...i, type: "link" as const }));
  return [];
});

function isLinkActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return (
    pathname === href ||
    (pathname.startsWith(href + "/") &&
      !ALL_LINKS.some(
        (other) =>
          other.href !== href &&
          other.href.startsWith(href) &&
          pathname.startsWith(other.href),
      ))
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InternalNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex items-center gap-0.5", className)}>
      {ITEMS.map((item, idx) => {
        if (item.type === "separator") {
          return (
            <div
              key={`sep-${idx}`}
              className="mx-1.5 h-4 w-px bg-border/60"
            />
          );
        }

        if (item.type === "link") {
          const isActive = isLinkActive(item.href, pathname);
          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                isActive
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.icon && <HomeIcon className="size-3.5" />}
              {item.label}
            </a>
          );
        }

        // Dropdown
        const hasActiveChild = item.items.some((link) =>
          isLinkActive(link.href, pathname),
        );

        return (
          <DropdownMenu key={item.label}>
            <DropdownMenuTrigger
              className={cn(
                "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors outline-none",
                hasActiveChild
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              <ChevronDownIcon className="size-3 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={6}>
              {item.items.map((link) => {
                const isActive = isLinkActive(link.href, pathname);
                return (
                  <DropdownMenuItem
                    key={link.href}
                    className={cn(
                      "cursor-pointer",
                      isActive && "font-medium text-foreground",
                    )}
                  >
                    <a href={link.href} className="flex w-full">
                      {link.label}
                    </a>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </nav>
  );
}
