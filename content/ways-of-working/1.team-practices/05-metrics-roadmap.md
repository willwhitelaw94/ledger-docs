---
title: Metrics Roadmap
description: Engineering metrics we track and why they matter
---

> "You can't manage what you don't measure."
> — Peter Drucker

---

## Why We Measure

**Kaizen** is a Japanese word meaning constant improvement. Every day is an opportunity to improve, even if it is only 1%.

Having metrics allows us to understand if we are actually improving—not just feeling busy.

Metrics help with:

- **Visibility for managers** - Understand team health and progress
- **Self-awareness for teams** - Know if we're getting better
- **Focus** - Direct energy where it matters most

---

## Which Metric?

There isn't a "ONE" metric. **It will change over time based on where the team is at.**

### Current Focus: PR Times (Feb 2025)

Based on findings from the last 90 days, our biggest improvement opportunity is **PR review times**.

::callout{color="amber" icon="i-lucide-target"}
**The Golden Rule**: PR review time should be **half** the development time.

| Development Time | Target PR Review Time |
| ---------------- | --------------------- |
| 1 day            | 4 hours               |
| 2 days           | 1 day                 |
| Half day         | 2 hours               |
::

### Why PR Times?

Our PR times are not following the golden rule. We already have good PR practices, so the next step is to introduce [Story Kick Offs and Desk Checks](/overview/team-practices/10-story-kick-offs-desk-checks) to reduce rework and front-load feedback.

---

## DORA Metrics

The **DORA (DevOps Research and Assessment)** metrics are industry-standard measures of software delivery performance.

| Metric                      | What It Measures                     | Why It Matters                                  |
| --------------------------- | ------------------------------------ | ----------------------------------------------- |
| **Deployment Frequency**    | How often we deploy to production    | Higher frequency = smaller batches = lower risk |
| **Lead Time for Changes**   | Time from commit to production       | Shorter = faster value delivery                 |
| **Change Failure Rate**     | % of deployments causing failures    | Lower = higher quality                          |
| **Time to Restore Service** | How quickly we recover from failures | Shorter = better resilience                     |

### Performance Levels

| Level      | Deployment Frequency | Lead Time        | Change Failure Rate | Time to Restore |
| ---------- | -------------------- | ---------------- | ------------------- | --------------- |
| **Elite**  | Multiple per day     | < 1 hour         | 0-15%               | < 1 hour        |
| **High**   | Weekly to monthly    | 1 day - 1 week   | 16-30%              | < 1 day         |
| **Medium** | Monthly to 6 monthly | 1 week - 1 month | 16-30%              | 1 day - 1 week  |
| **Low**    | < once per 6 months  | > 1 month        | 16-30%              | > 1 week        |

---

## PR Metrics

### PR Cycle Time

Time from PR opened to PR merged.

| Component                | Description                            |
| ------------------------ | -------------------------------------- |
| **Time to First Review** | How long until someone looks at the PR |
| **Review Time**          | Time spent in review cycles            |
| **Time to Merge**        | Time from approval to merge            |

**Target**: PRs should be reviewed within 24 hours, merged within 48 hours.

### PR Size

| Size   | Lines Changed | Expected Review Time |
| ------ | ------------- | -------------------- |
| Small  | < 200         | Same day             |
| Medium | 200-500       | 1-2 days             |
| Large  | 500+          | Consider splitting   |

---

## Cycle Time

**Cycle Time** = Time from work started to work completed (deployed).

```text
[Work Started] → [In Progress] → [Review] → [Done] → [Deployed]
         |___________________ Cycle Time ___________________|
```

### What Affects Cycle Time?

- PR size and complexity
- Review queue depth
- Testing time
- Deployment frequency
- Blockers and dependencies

### Reducing Cycle Time

- Smaller batches of work
- Faster PR reviews
- Automated testing
- Continuous deployment
- Reducing WIP

---

## Lead Time

**Lead Time** = Time from work requested to work delivered.

```text
[Requested] → [Backlog] → [Started] → [Done] → [Deployed]
    |________________________ Lead Time _____________________|
                        |_______ Cycle Time _______|
```

Lead time includes:

- Time in backlog (waiting to start)
- Cycle time (active work)

---

## Work in Progress (WIP)

**Little's Law**: `Lead Time = WIP / Throughput`

To reduce lead time, either:

1. Reduce WIP (fewer things in flight)
2. Increase throughput (complete more work)

### WIP Limits

| Stage      | Recommended WIP Limit |
| ---------- | --------------------- |
| Per person | 1-2 items             |
| Per team   | Team size × 1.5       |

---

## How We Track

| Metric       | Tool        | Frequency  |
| ------------ | ----------- | ---------- |
| DORA metrics | GitHub / CI | Weekly     |
| PR metrics   | GitHub      | Weekly     |
| Cycle time   | Jira        | Per sprint |
| Lead time    | Jira        | Per sprint |
| WIP          | Jira board  | Daily      |

---

## Using Metrics Well

### Do

- Use metrics to identify trends and patterns
- Compare against your own baseline
- Focus on improvement, not blame
- Share metrics transparently with the team

### Don't

- Use metrics to compare individuals
- Optimize for the metric instead of the outcome
- Ignore context (holidays, incidents, etc.)
- Set arbitrary targets without understanding

---

## Related

- [Cycle and Lead Time](/overview/team-practices/cycle-and-lead-time) - Deep dive on flow metrics
- [WIP Limits](/overview/team-practices/wip-limits) - Managing work in progress
- [Sprint Estimation](/overview/team-practices/02-sprint-estimation) - Story points and sizing
