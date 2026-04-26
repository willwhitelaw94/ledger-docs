"use client"

import { cn } from "@/lib/utils"

export function ContentSteps({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 space-y-0">
      {children}
    </div>
  )
}

export function ContentStep({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <div className="relative flex gap-4 pb-8 last:pb-0">
      {/* Vertical line */}
      <div className="flex flex-col items-center">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-xs font-semibold text-primary" />
        <div className="w-px flex-1 bg-border" />
      </div>

      <div className={cn("flex-1 pb-2", title ? "pt-0.5" : "pt-1")}>
        {title && (
          <h4 className="mb-2 text-sm font-semibold text-foreground">{title}</h4>
        )}
        <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none prose-p:text-muted-foreground prose-li:text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  )
}
