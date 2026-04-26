"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import type { GlossaryCategory, GlossaryTerm } from "@/lib/glossary";
import { InternalHeader } from "@/components/internal-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  BookOpenIcon,
  SearchIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

export function GlossaryClient({
  categories,
}: {
  categories: GlossaryCategory[];
}) {
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const totalTerms = categories.reduce(
    (sum, c) => sum + c.terms.length,
    0,
  );

  function filterTerms(terms: GlossaryTerm[]) {
    if (!searchQuery) return terms;
    const q = searchQuery.toLowerCase();
    return terms.filter(
      (t) =>
        t.term.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q) ||
        (t.acronym && t.acronym.toLowerCase().includes(q)),
    );
  }

  /** Group terms by section within a category, preserving alphabetical order within each group. */
  function groupBySection(terms: GlossaryTerm[]) {
    const sections: { name: string; terms: GlossaryTerm[] }[] = [];
    const seen = new Set<string>();

    for (const t of terms) {
      if (!seen.has(t.section)) {
        seen.add(t.section);
        sections.push({ name: t.section, terms: [] });
      }
      sections.find((s) => s.name === t.section)!.terms.push(t);
    }

    // Sort terms alphabetically within each section
    for (const s of sections) {
      s.terms.sort((a, b) => a.term.localeCompare(b.term));
    }

    return sections;
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <InternalHeader>
        {selectedTerm ? (
          <button
            type="button"
            onClick={() => setSelectedTerm(null)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" />
            Glossary
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
            <span className="font-medium text-foreground">Glossary</span>
          </nav>
        )}
      </InternalHeader>

      {/* Content */}
      <div className="flex-1 px-4 py-6 sm:px-6">
        <AnimatePresence mode="wait">
          {selectedTerm ? (
            <motion.div
              key={`term-${selectedTerm.term}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="mx-auto max-w-3xl"
            >
              <div className="mb-6">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {selectedTerm.category}
                  </Badge>
                  {selectedTerm.section && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedTerm.section}
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {selectedTerm.term}
                </h1>
                {selectedTerm.acronym &&
                  selectedTerm.acronym !== selectedTerm.term && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedTerm.acronym}
                    </p>
                  )}
              </div>
              <Card className="shadow-none">
                <CardContent className="p-6 sm:p-8">
                  <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
                    {selectedTerm.definition.split("\n").map((line, i) => {
                      const trimmed = line.trim();
                      if (trimmed.startsWith("- ")) {
                        return (
                          <div
                            key={i}
                            className="flex items-start gap-2 py-0.5 text-sm text-muted-foreground"
                          >
                            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                            <span>{trimmed.slice(2)}</span>
                          </div>
                        );
                      }
                      return (
                        <p
                          key={i}
                          className="text-sm text-muted-foreground leading-relaxed"
                        >
                          {trimmed}
                        </p>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="glossary-overview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="mx-auto max-w-5xl"
            >
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Glossary
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {totalTerms} terms across {categories.length} categories
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filter terms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 w-full rounded-lg border border-input/50 bg-muted/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              </div>

              <Tabs defaultValue="all">
                <TabsList className="mb-6">
                  <TabsTrigger value="all">All</TabsTrigger>
                  {categories.map((cat) => (
                    <TabsTrigger
                      key={cat.id}
                      value={cat.id}
                      className="hidden sm:inline-flex"
                    >
                      {cat.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="all">
                  {categories.map((cat) => {
                    const filtered = filterTerms(cat.terms);
                    if (filtered.length === 0) return null;
                    const sections = groupBySection(filtered);
                    return (
                      <div key={cat.id} className="mb-8">
                        <div className="mb-3 flex items-center gap-2">
                          <BookOpenIcon className="size-4 text-muted-foreground" />
                          <h2 className="text-sm font-medium text-muted-foreground">
                            {cat.label}
                          </h2>
                          <Badge variant="secondary" className="text-[10px]">
                            {filtered.length}
                          </Badge>
                        </div>
                        {sections.map((section) => (
                          <div key={section.name} className="mb-4">
                            {section.name && (
                              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                                {section.name}
                              </h3>
                            )}
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {section.terms.map((term) => (
                                <TermCard
                                  key={`${cat.id}-${term.term}`}
                                  term={term}
                                  onSelect={setSelectedTerm}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                        <Separator className="mt-6" />
                      </div>
                    );
                  })}
                </TabsContent>

                {categories.map((cat) => (
                  <TabsContent key={cat.id} value={cat.id}>
                    {(() => {
                      const filtered = filterTerms(cat.terms);
                      if (filtered.length === 0) {
                        return (
                          <p className="py-12 text-center text-sm text-muted-foreground">
                            No terms match your filter.
                          </p>
                        );
                      }
                      const sections = groupBySection(filtered);
                      return sections.map((section) => (
                        <div key={section.name} className="mb-6">
                          {section.name && (
                            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                              {section.name}
                            </h3>
                          )}
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {section.terms.map((term) => (
                              <TermCard
                                key={`${cat.id}-${term.term}`}
                                term={term}
                                onSelect={setSelectedTerm}
                              />
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </TabsContent>
                ))}
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TermCard({
  term,
  onSelect,
}: {
  term: GlossaryTerm;
  onSelect: (term: GlossaryTerm) => void;
}) {
  const truncated =
    term.definition.length > 100
      ? term.definition.slice(0, 100) + "..."
      : term.definition;

  return (
    <Card
      className="cursor-pointer shadow-none transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
      onClick={() => onSelect(term)}
    >
      <CardContent className="flex flex-col gap-1.5 p-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium leading-tight">{term.term}</p>
          {term.acronym && term.acronym !== term.term && (
            <Badge
              variant="secondary"
              className="text-[10px] shrink-0"
            >
              {term.acronym}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {truncated}
        </p>
      </CardContent>
    </Card>
  );
}
