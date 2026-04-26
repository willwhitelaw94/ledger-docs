---
title: "Sprint Estimation"
description: "Story points, sizing guide, and estimation philosophy"
---

**Agile estimation is just that: an estimate. Not a blood-oath.**

---

## Story Point Scale

| Points | Size | Description | Effort |
|--------|------|-------------|--------|
| **0** | - | No effort required, or effort with no business value delivered. Example: behavioural change from a Retrospective | Minutes |
| **1** | XXS | Developers understand most requirements, relatively easy. Probably the smallest item in the Sprint | < 30 mins |
| **2** | XS | A little thought or problem-solving required, but we've done this a lot. Or it sounds XXS but we want to hedge | ~1 hour |
| **3** | S | We've done this a lot, we know what needs to be done. May be a few extra steps. Unlikely to need research | ~2 hours |
| **5** | M | Medium complexity. Probably half a day's worth of effort | ~4 hours |
| **8** | L | Large piece of work and complexity. Will require a day's worth of effort | ~1 day |
| **13** | XL | Complex work encompassing several days. Most developers will need assistance from someone else on the team. Probably one of the largest items that can be completed within a Sprint | 2-3 days |
| **21** | XXL | Complex with many unknowns, requires multiple assumptions. Should be broken down into smaller tasks | ~1 week |
| **31** | XXXL | Too complex for one Sprint. Must be broken down. Large size indicates more risk, assumptions, and dependencies | > 1 week |

---

## Estimation Guidelines

### When to Use Each Size

::callout{icon="i-lucide-gauge"}
**Quick Reference**

- **1-3 points**: Well-understood, low-risk work
- **5-8 points**: Standard feature work with some complexity
- **13 points**: Complex but achievable in a sprint
- **21+ points**: Needs breakdown before committing
::

### Red Flags

If you're estimating **21 or higher**, stop and ask:

1. Can this be split into smaller stories?
2. What are the unknowns we need to resolve first?
3. Should we do a spike first?

---

## Estimation is Relative

Story points measure **relative complexity**, not time.

A 2-point story isn't necessarily twice as fast as a 1-point story—it's roughly twice as complex.

### Why Relative?

- Different developers work at different speeds
- The same developer works at different speeds on different days
- Complexity is more consistent than time across team members

---

## Estimation Tips

### Do

- Compare to previous stories the team has completed
- Include testing, code review, and deployment in your estimate
- Consider unknowns and risk
- Estimate as a team (Planning Poker)

### Don't

- Treat estimates as commitments
- Estimate in isolation
- Forget about edge cases and error handling
- Ignore the "Definition of Done"

---

## When Estimates Are Wrong

Estimates will be wrong. That's okay.

Use the variance to:
- Improve future estimates
- Identify hidden complexity in certain areas
- Surface process issues (blocked work, unclear requirements)

**Track velocity over time, not individual story accuracy.**

---

## Related

- [Small Batch Sizing](/overview/team-practices/small-batch-sizing) - Breaking work into deliverable chunks
- [Sprint Planning](/overview/team-practices/sprint-planning) - How we plan sprints
- [Backlog Refinement](/overview/team-practices/backlog-refinement) - Preparing stories for estimation
