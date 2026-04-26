"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  RotateCcwIcon,
  CheckCircle2Icon,
  CircleIcon,
  TargetIcon,
  TrendingUpIcon,
  ShieldCheckIcon,
  UsersIcon,
  LightbulbIcon,
  SearchIcon,
} from "lucide-react"

type Rating = 1 | 2 | 3 | 4 | 5

interface Question {
  id: string
  text: string
  hint: string
}

interface Category {
  id: string
  title: string
  weight: string
  icon: React.ReactNode
  description: string
  color: string
  questions: Question[]
}

const CATEGORIES: Category[] = [
  {
    id: "discovery",
    title: "Discovery & Problem Solving",
    weight: "20%",
    icon: <SearchIcon className="size-4" />,
    description: "Breaking down complex problems, root-causing bugs, and unblocking the squad.",
    color: "text-violet-500",
    questions: [
      {
        id: "d1",
        text: "When I encounter a complex bug, do I correctly identify the root cause on my first investigation?",
        hint: "Target: >= 90% correctly root-caused on first attempt",
      },
      {
        id: "d2",
        text: "When the team escalates a hard technical problem to me, can I resolve it without needing to escalate further?",
        hint: "Target: Resolve >= 80% of escalated issues without further escalation",
      },
      {
        id: "d3",
        text: "Do I present multiple solution approaches with clear trade-offs, rather than jumping to a single answer?",
        hint: "Shows depth of analysis and respects team input",
      },
      {
        id: "d4",
        text: "Would my stakeholders rate my problem-solving ability as 4/5 or higher?",
        hint: "Target: >= 4.0/5 CSAT from internal stakeholders",
      },
      {
        id: "d5",
        text: "Do I proactively investigate and understand the full context before proposing a fix?",
        hint: "Building the big picture before sprinting into code",
      },
    ],
  },
  {
    id: "delivery",
    title: "Delivery & Velocity",
    weight: "20%",
    icon: <TargetIcon className="size-4" />,
    description: "Delivering complex features reliably and setting the pace for the squad.",
    color: "text-blue-500",
    questions: [
      {
        id: "v1",
        text: "Do I consistently complete >= 90% of my committed story points each sprint?",
        hint: "Target: >= 90% sprint commitment completion",
      },
      {
        id: "v2",
        text: "Are my PRs typically reviewed and merged within 2 business days of opening?",
        hint: "Target: < 2 business days average PR cycle time",
      },
      {
        id: "v3",
        text: "Are my effort estimates usually within 15% of the actual time taken?",
        hint: "Target: Within 15% estimation accuracy",
      },
      {
        id: "v4",
        text: "Do I break down large features into well-scoped, independently deliverable pieces?",
        hint: "Key to predictable delivery and reduced risk",
      },
      {
        id: "v5",
        text: "Would my peers and leads rate my delivery reliability at 4/5 or higher?",
        hint: "Target: >= 4.0/5 from 360 feedback",
      },
    ],
  },
  {
    id: "quality",
    title: "Quality & Execution",
    weight: "20%",
    icon: <ShieldCheckIcon className="size-4" />,
    description: "Shipping production-grade code with minimal rework and setting the quality bar.",
    color: "text-emerald-500",
    questions: [
      {
        id: "q1",
        text: "Do fewer than 10% of my completed stories require rework after merge?",
        hint: "Target: < 10% rework rate",
      },
      {
        id: "q2",
        text: "Do fewer than 5% of features I deliver result in production bugs?",
        hint: "Target: < 5% defect escape rate",
      },
      {
        id: "q3",
        text: "Are >= 85% of my PRs approved on the first review pass without major changes?",
        hint: "Target: >= 85% first-pass approval rate",
      },
      {
        id: "q4",
        text: "Do I review others' PRs within 4 hours during business hours?",
        hint: "Target: < 4 hour code review turnaround",
      },
      {
        id: "q5",
        text: "Is my code well-tested, well-documented, and following our agreed patterns?",
        hint: "Raising the quality bar for the whole squad",
      },
    ],
  },
  {
    id: "culture",
    title: "Culture & Collaboration",
    weight: "20%",
    icon: <UsersIcon className="size-4" />,
    description: "Being the squad's technical anchor, leading by example, and supporting others.",
    color: "text-amber-500",
    questions: [
      {
        id: "c1",
        text: "Do I provide >= 5 substantive code reviews per week (not just approvals)?",
        hint: "Target: >= 5 substantive reviews/week",
      },
      {
        id: "c2",
        text: "Do I spend >= 2 hours per week pairing with or guiding L1-L2 engineers?",
        hint: "Target: >= 2 hours/week pairing with junior engineers",
      },
      {
        id: "c3",
        text: "Do I attend >= 90% of sprint ceremonies (standups, planning, retros)?",
        hint: "Target: >= 90% ceremony attendance",
      },
      {
        id: "c4",
        text: "Do I flag risks and blockers proactively rather than waiting to be asked?",
        hint: "Key leadership behaviour at L3",
      },
      {
        id: "c5",
        text: "Would my team rate my collaboration and supportiveness at 4/5 or higher?",
        hint: "Target: >= 4.0/5 from 360 and manager assessment",
      },
    ],
  },
  {
    id: "innovation",
    title: "Innovation & Growth",
    weight: "20%",
    icon: <LightbulbIcon className="size-4" />,
    description: "Driving continuous improvement in tools, practices, and personal technical depth.",
    color: "text-orange-500",
    questions: [
      {
        id: "i1",
        text: "Am I actively and effectively using AI tools (Claude, Copilot) in my daily workflow?",
        hint: "Not just installed — genuinely accelerating my work",
      },
      {
        id: "i2",
        text: "Have I implemented >= 2 process or tooling improvements this quarter?",
        hint: "Target: >= 2 improvements per quarter",
      },
      {
        id: "i3",
        text: "Have I written >= 1 ADR or design document this quarter?",
        hint: "Target: >= 1 ADR or design doc per quarter",
      },
      {
        id: "i4",
        text: "Am I advancing in at least one skill area or deepening an existing one?",
        hint: "Target: Progress in >= 1 skill area per review period",
      },
      {
        id: "i5",
        text: "Would stakeholders rate my innovation and initiative at 4/5 or higher?",
        hint: "Target: >= 4.0/5 CSAT from internal stakeholders",
      },
    ],
  },
]

const RATING_LABELS: Record<Rating, { label: string; color: string }> = {
  1: { label: "Strongly Disagree", color: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20" },
  2: { label: "Disagree", color: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  3: { label: "Neutral", color: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" },
  4: { label: "Agree", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  5: { label: "Strongly Agree", color: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20" },
}

function RatingButton({ value, selected, onClick }: { value: Rating; selected: boolean; onClick: () => void }) {
  const { label, color } = RATING_LABELS[value]
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all",
        selected
          ? color
          : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/50"
      )}
    >
      {value} — {label}
    </button>
  )
}

function CategorySection({
  category,
  ratings,
  onRate,
  isOpen,
  onToggle,
}: {
  category: Category
  ratings: Record<string, Rating>
  onRate: (questionId: string, rating: Rating) => void
  isOpen: boolean
  onToggle: () => void
}) {
  const answered = category.questions.filter((q) => ratings[q.id] !== undefined).length
  const total = category.questions.length
  const isComplete = answered === total
  const avg = isComplete
    ? category.questions.reduce((sum, q) => sum + (ratings[q.id] || 0), 0) / total
    : null

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/30"
      >
        <span className={cn("shrink-0", category.color)}>{category.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{category.title}</span>
            <span className="text-[11px] text-muted-foreground font-mono">{category.weight}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{category.description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isComplete ? (
              <CheckCircle2Icon className="size-3.5 text-emerald-500" />
            ) : (
              <CircleIcon className="size-3.5" />
            )}
            <span className="font-mono">{answered}/{total}</span>
          </div>
          {avg !== null && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                avg >= 4 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                avg >= 3 ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" :
                "bg-red-500/15 text-red-600 dark:text-red-400"
              )}
            >
              {avg.toFixed(1)}
            </span>
          )}
          {isOpen ? (
            <ChevronUpIcon className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDownIcon className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border/40">
          {category.questions.map((question, idx) => (
            <div
              key={question.id}
              className={cn(
                "px-4 py-4",
                idx < category.questions.length - 1 && "border-b border-border/30"
              )}
            >
              <div className="flex items-start gap-2 mb-3">
                <span className="text-xs font-mono text-muted-foreground/60 mt-0.5 shrink-0">
                  {idx + 1}.
                </span>
                <div>
                  <p className="text-sm text-foreground leading-relaxed">{question.text}</p>
                  <p className="text-xs text-muted-foreground mt-1 italic">{question.hint}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 ml-5">
                {([1, 2, 3, 4, 5] as Rating[]).map((value) => (
                  <RatingButton
                    key={value}
                    value={value}
                    selected={ratings[question.id] === value}
                    onClick={() => onRate(question.id, value)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ScoreSummary({ ratings }: { ratings: Record<string, Rating> }) {
  const categoryScores = CATEGORIES.map((cat) => {
    const answered = cat.questions.filter((q) => ratings[q.id] !== undefined)
    if (answered.length === 0) return { ...cat, avg: null, complete: false }
    const avg = answered.reduce((sum, q) => sum + ratings[q.id], 0) / answered.length
    return { ...cat, avg, complete: answered.length === cat.questions.length }
  })

  const allComplete = categoryScores.every((c) => c.complete)
  const totalAnswered = Object.keys(ratings).length
  const totalQuestions = CATEGORIES.reduce((sum, c) => sum + c.questions.length, 0)

  const overallAvg = allComplete
    ? categoryScores.reduce((sum, c) => sum + (c.avg || 0), 0) / categoryScores.length
    : null

  return (
    <div className="rounded-xl border border-border/60 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Your Self-Assessment Summary</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalAnswered}/{totalQuestions} questions answered
          </p>
        </div>
        {overallAvg !== null && (
          <div className="text-right">
            <div
              className={cn(
                "text-2xl font-bold tabular-nums",
                overallAvg >= 4 ? "text-emerald-500" :
                overallAvg >= 3 ? "text-yellow-500" :
                "text-red-500"
              )}
            >
              {overallAvg.toFixed(1)}
            </div>
            <div className="text-[11px] text-muted-foreground">overall</div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {categoryScores.map((cat) => (
          <div key={cat.id} className="flex items-center gap-3">
            <span className={cn("shrink-0", cat.color)}>{cat.icon}</span>
            <span className="text-xs flex-1 truncate">{cat.title}</span>
            <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  cat.avg !== null && cat.avg >= 4 ? "bg-emerald-500" :
                  cat.avg !== null && cat.avg >= 3 ? "bg-yellow-500" :
                  cat.avg !== null ? "bg-red-500" :
                  "bg-muted"
                )}
                style={{ width: cat.avg !== null ? `${(cat.avg / 5) * 100}%` : "0%" }}
              />
            </div>
            <span className="text-xs font-mono text-muted-foreground w-8 text-right tabular-nums">
              {cat.avg !== null ? cat.avg.toFixed(1) : "—"}
            </span>
          </div>
        ))}
      </div>

      {allComplete && (
        <div className="rounded-lg border border-border/40 bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUpIcon className="size-4 text-muted-foreground" />
            <span className="text-xs font-semibold">Performance-Culture Matrix Placement</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {overallAvg !== null && overallAvg >= 3.5
              ? "Your self-assessment suggests you're in the High Performance zone (>= 3.5). Combined with your culture score from 360 feedback, this positions you in Quadrant A (Stars) or B (Training) of the Performance-Culture Matrix."
              : "Your self-assessment suggests areas for growth to reach the High Performance zone (>= 3.5). Consider focusing on the lowest-scoring categories and discussing with your Team Lead."}
          </p>
          {overallAvg !== null && overallAvg >= 3.5 && (
            <div className="flex gap-3 pt-1">
              <div className="flex-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 p-2 text-center">
                <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Quadrant A — Stars</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">High Performance + High Culture</div>
              </div>
              <div className="flex-1 rounded-md bg-amber-500/10 border border-amber-500/20 p-2 text-center">
                <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Quadrant B — Training</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Low Performance + High Culture</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function SelfEvaluation() {
  const [ratings, setRatings] = useState<Record<string, Rating>>({})
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(["discovery"]))

  const handleRate = useCallback((questionId: string, rating: Rating) => {
    setRatings((prev) => ({ ...prev, [questionId]: rating }))
  }, [])

  const toggleCategory = useCallback((categoryId: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }, [])

  const handleReset = useCallback(() => {
    setRatings({})
    setOpenCategories(new Set(["discovery"]))
  }, [])

  const totalAnswered = Object.keys(ratings).length

  return (
    <div className="not-prose space-y-4 my-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Self-Evaluation</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rate yourself honestly on each question. This is for your own reflection — no data is stored.
          </p>
        </div>
        {totalAnswered > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
          >
            <RotateCcwIcon className="size-3" />
            Reset
          </button>
        )}
      </div>

      <ScoreSummary ratings={ratings} />

      <div className="space-y-2">
        {CATEGORIES.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            ratings={ratings}
            onRate={handleRate}
            isOpen={openCategories.has(category.id)}
            onToggle={() => toggleCategory(category.id)}
          />
        ))}
      </div>

      <div className="rounded-lg border border-dashed border-border/60 p-3 text-xs text-muted-foreground space-y-1">
        <p><strong>How to use this:</strong> Answer each question as honestly as you can. Use the results to:</p>
        <ul className="list-disc ml-4 space-y-0.5">
          <li>Prepare for your 1:1 with your Team Lead</li>
          <li>Identify areas to focus on before your next 360 review</li>
          <li>Track your own growth over time (screenshot your summary)</li>
          <li>Guide your quarterly goal-setting conversations</li>
        </ul>
        <p className="italic mt-2">Nothing is saved or sent anywhere. Refresh the page to start over.</p>
      </div>
    </div>
  )
}
