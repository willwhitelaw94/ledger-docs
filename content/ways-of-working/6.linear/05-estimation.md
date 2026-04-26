---
title: "Estimation in Linear"
description: "How estimation works at story and task level in Linear"
---

> Two-level estimation: high-level on stories, detailed on sub-issues.

---

## The Two-Level Approach

| Level | Who | When | Purpose |
|-------|-----|------|---------|
| **Story (Issue)** | Team/Tech Lead | Planning | Rough sizing for capacity planning |
| **Task (Sub-issue)** | Tech Lead/Dev | Breakdown | Detailed estimates for execution |

---

## Story-Level Estimation

When a story is created from a spec, it gets a **high-level estimate** based on complexity.

### Story Point Scale

| Points | Size | Description | Effort |
|--------|------|-------------|--------|
| **1** | XXS | Well-understood, minimal effort | < 30 mins |
| **2** | XS | A little thought required | ~1 hour |
| **3** | S | We know what needs to be done | ~2 hours |
| **5** | M | Medium complexity | ~4 hours |
| **8** | L | Large, requires a day | ~1 day |
| **13** | XL | Complex, one of the largest in a sprint | 2-3 days |
| **21** | XXL | Should be broken down | ~1 week |

**See full guide:** [Sprint Estimation](/overview/team-practices/sprint-estimation)

---

## Task-Level Estimation (Sub-issues)

Once the tech lead breaks down a story into sub-issues, each task gets its own estimate.

### Why Estimate at Both Levels?

| Story Estimate | Task Estimates | Purpose |
|----------------|----------------|---------|
| 8 points | - | Capacity planning: "This story is about a day of work" |
| | 2 + 3 + 2 + 1 = 8 | Execution tracking: "Here's exactly what needs doing" |

The sum of task estimates should roughly equal the story estimate. If not, it's a signal to revisit the story scope.

---

## Linear Estimation Settings

In Linear, estimates can be configured per team:

1. Go to **Team Settings** → **Workflow**
2. Enable **Estimates**
3. Choose scale: Points (Fibonacci) or Hours

---

## Open Questions (To Investigate)

::alert{type="warning"}
These questions need answers before we finalize our Linear workflow.
::

### 1. Velocity Calculation

**Question:** Sub-issues can have points, but do those points roll into cycle velocity metrics? Or does Linear only count parent issue points for capacity planning?

**Why it matters:** If velocity only counts parent issues, we need to estimate at story level consistently. If it counts sub-issues, we could estimate only at task level.

---

### 2. Cycle Board Visibility

**Question:** You need to toggle "Show sub-issues" to see tasks on the board. Is that acceptable for the dev workflow?

**Why it matters:** If devs primarily work from the board, sub-issues need to be visible without extra clicks.

---

### 3. Filtering Across Projects

**Question:** Can you build a view like "show me all sub-issues in Dev phase (milestone) across all projects"? Or is milestone filtering scoped to a single project?

**Why it matters:** Tech leads may want to see all dev work across projects in one view.

---

### 4. Triage Workflow

**Question:** Do sub-issues go through triage, or only parent issues?

**Why it matters:** If a dev creates a sub-issue for a bug they found, does it need triage? Or is it automatically in the parent's workflow?

---

### 5. SpecKit Integration

**Question:** Will the tooling that generates stories/tasks need updating to create Linear issues + sub-issues instead of Jira stories + tasks?

**Why it matters:** Our Claude-based spec sync currently creates Jira tickets. We need to update this for Linear.

---

## Recommended Approach (Pending Investigation)

Until we answer the questions above:

1. **Estimate at story level** for planning
2. **Break down into sub-issues** without estimates initially
3. **Track actual time** to calibrate future estimates
4. **Re-evaluate** once we understand Linear's velocity calculation

---

## Related

- [Sprint Estimation](/ways-of-working/team-practices/15-sprint-estimation) — Full estimation philosophy
- [Structure & Hierarchy](./02-structure) — Issues and sub-issues explained
- [Views & Workflows](./04-views-workflows) — Cycles and boards
