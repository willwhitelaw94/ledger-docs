"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { TopicCategory, DomainTopic } from "@/lib/domain-topics";
import { InternalHeader } from "@/components/internal-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayersIcon,
  LightbulbIcon,
  UsersIcon,
  PlugIcon,
  ScaleIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from "lucide-react";

const CATEGORY_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  domains: LayersIcon,
  concepts: LightbulbIcon,
  personas: UsersIcon,
  integrations: PlugIcon,
  industry: ScaleIcon,
};

export function TopicsClient({
  categories,
}: {
  categories: TopicCategory[];
}) {
  const [selectedTopic, setSelectedTopic] = useState<DomainTopic | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const totalTopics = categories.reduce(
    (sum, c) => sum + c.topics.length,
    0
  );

  function filterTopics(topics: DomainTopic[]) {
    if (!searchQuery) return topics;
    const q = searchQuery.toLowerCase();
    return topics.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <InternalHeader>
        {selectedTopic ? (
          <button
            type="button"
            onClick={() => setSelectedTopic(null)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" />
            Topics
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
            <span className="font-medium text-foreground">Domain Topics</span>
          </nav>
        )}
      </InternalHeader>

      {/* Content */}
      <div className="flex-1 px-4 py-6 sm:px-6">
        <AnimatePresence mode="wait">
          {selectedTopic ? (
            <motion.div
              key={`topic-${selectedTopic.slug}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="mx-auto max-w-3xl"
            >
              <div className="mb-6">
                <Badge
                  variant="secondary"
                  className="mb-2 text-xs capitalize"
                >
                  {categories.find((c) => c.id === selectedTopic.category)
                    ?.label ?? selectedTopic.category}
                </Badge>
                <h1 className="text-2xl font-bold tracking-tight">
                  {selectedTopic.title}
                </h1>
                {selectedTopic.description && (
                  <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
                    {selectedTopic.description}
                  </p>
                )}
              </div>
              <Card className="shadow-none">
                <CardContent className="p-6 sm:p-8">
                  <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-lg prose-h3:text-base prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-a:text-primary prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-hr:border-border prose-table:text-sm prose-th:text-left prose-th:font-medium">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedTopic.content}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="topics-overview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="mx-auto max-w-5xl"
            >
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Domain Topics
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {totalTopics} topics across{" "}
                    {categories.length} categories
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filter topics..."
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
                    const filtered = filterTopics(cat.topics);
                    if (filtered.length === 0) return null;
                    const Icon =
                      CATEGORY_ICONS[cat.id] || LayersIcon;
                    return (
                      <div key={cat.id} className="mb-8">
                        <div className="mb-3 flex items-center gap-2">
                          <Icon className="size-4 text-muted-foreground" />
                          <h2 className="text-sm font-medium text-muted-foreground">
                            {cat.label}
                          </h2>
                          <Badge variant="secondary" className="text-[10px]">
                            {filtered.length}
                          </Badge>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {filtered.map((topic) => (
                            <TopicCard
                              key={topic.slug}
                              topic={topic}
                              onSelect={setSelectedTopic}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>

                {categories.map((cat) => (
                  <TabsContent key={cat.id} value={cat.id}>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {filterTopics(cat.topics).map((topic) => (
                        <TopicCard
                          key={topic.slug}
                          topic={topic}
                          onSelect={setSelectedTopic}
                        />
                      ))}
                    </div>
                    {filterTopics(cat.topics).length === 0 && (
                      <p className="py-12 text-center text-sm text-muted-foreground">
                        No topics match your filter.
                      </p>
                    )}
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

function TopicCard({
  topic,
  onSelect,
}: {
  topic: DomainTopic;
  onSelect: (topic: DomainTopic) => void;
}) {
  return (
    <Card
      className="cursor-pointer shadow-none transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
      onClick={() => onSelect(topic)}
    >
      <CardContent className="flex flex-col gap-1.5 p-4">
        <p className="text-sm font-medium leading-tight">{topic.title}</p>
        {topic.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {topic.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
