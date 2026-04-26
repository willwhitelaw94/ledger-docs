"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  BookOpenIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  SearchIcon,
} from "lucide-react";

type SearchableDoc = {
  title: string;
  description?: string;
  section: string;
  href: string;
};

type SearchableEpic = {
  title: string;
  status: string;
  initiative: string;
  initiativeSlug: string;
  slug: string;
};

type GlobalSearchProps = {
  docs?: SearchableDoc[];
  epics?: SearchableEpic[];
  className?: string;
};

const statusDotColor: Record<string, string> = {
  "in progress": "bg-blue-500",
  in_progress: "bg-blue-500",
  design: "bg-purple-500",
  planning: "bg-amber-500",
  planned: "bg-amber-500",
  backlog: "bg-muted-foreground/40",
  blocked: "bg-red-500",
  "on hold": "bg-orange-500",
  qa: "bg-teal-500",
  "ready for qa": "bg-teal-500",
  "ready for implementation": "bg-emerald-500",
  release: "bg-emerald-500",
  "peer review": "bg-indigo-500",
  idea: "bg-pink-500",
  draft: "bg-muted-foreground/40",
  triaged: "bg-cyan-500",
  "to do": "bg-muted-foreground/40",
  active: "bg-emerald-500",
};

export function GlobalSearch({ docs = [], epics = [], className }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Group epics by initiative
  const epicsByInitiative = new Map<string, SearchableEpic[]>();
  for (const epic of epics) {
    const list = epicsByInitiative.get(epic.initiative) || [];
    list.push(epic);
    epicsByInitiative.set(epic.initiative, list);
  }

  // Group docs by section
  const docsBySection = new Map<string, SearchableDoc[]>();
  for (const doc of docs) {
    const list = docsBySection.get(doc.section) || [];
    list.push(doc);
    docsBySection.set(doc.section, list);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-input/50 bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          className
        )}
      >
        <SearchIcon className="size-3.5" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="pointer-events-none hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium sm:inline">
          &#8984;K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search across docs and initiatives"
      >
        <Command
          filter={(value, search) => {
            const v = value.toLowerCase();
            const s = search.toLowerCase().trim();
            if (!s) return 1;
            // Exact substring match
            if (v.includes(s)) return 1;
            // Match each search word independently
            const words = s.split(/\s+/);
            if (words.every((w) => v.includes(w))) return 1;
            return 0;
          }}
        >
          <CommandInput placeholder="Search docs, initiatives, epics..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            {/* Docs */}
            {docsBySection.size > 0 && (
              <>
                {Array.from(docsBySection.entries()).map(([section, sectionDocs]) => (
                  <CommandGroup key={`doc-${section}`} heading={section}>
                    {sectionDocs.map((doc) => (
                      <CommandItem
                        key={doc.href}
                        value={`doc ${doc.title} ${doc.description ?? ""} ${doc.section}`}
                        onSelect={() => {
                          setOpen(false);
                          window.location.href = doc.href;
                        }}
                      >
                        <BookOpenIcon className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{doc.title}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
                {epicsByInitiative.size > 0 && <CommandSeparator />}
              </>
            )}

            {/* Epics */}
            {Array.from(epicsByInitiative.entries()).map(([initiative, initEpics]) => (
              <CommandGroup key={`epic-${initiative}`} heading={initiative}>
                {initEpics.map((epic) => (
                  <CommandItem
                    key={epic.slug}
                    value={`epic ${epic.title} ${epic.initiative} ${epic.status}`}
                    onSelect={() => {
                      setOpen(false);
                      // Navigate to dashboard with epic context
                      window.location.href = `/dashboard?i=${epic.initiativeSlug}&e=${epic.slug}`;
                    }}
                  >
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        statusDotColor[epic.status.toLowerCase()] || "bg-muted-foreground/40"
                      )}
                    />
                    <span className="truncate">{epic.title}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground capitalize">
                      {epic.status}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
