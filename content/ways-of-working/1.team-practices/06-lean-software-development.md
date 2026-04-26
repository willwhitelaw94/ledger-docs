---
title: Lean Software Development
description: Our lean workflow from problem discovery to validated learning
---

::callout{color="amber" icon="i-lucide-octagon-alert"}
**Work can be stopped at any stage.** If the value to the business no longer exists, we should not just go through the motions. Kill work that isn't valuable.
::

::callout{icon="i-lucide-info"}
**Not all work needs this process.** This is for unknown, big pieces of work, or new ideas. Well-understood work can skip straight to Build.
::

---

## The Lean Workflow

```text
Problem → Explore → Validate → Build → Measure → Learn
                                              ↓
                                         [Iterate]
```

Each stage has clear entry/exit criteria and accountable people.

---

## 1. Problem Stage

**Frame everything as a problem to solve, not a solution.**

Everything in lean should start its life as a problem. The purpose of this stage is to breakdown, reframe, and refine problems.

### How

1. Create a Jira ticket in the Design Backlog containing:
   - Clear outline of the problem (no solutions)
   - Miro of existing workflow or proposed workflow
   - Examples of how others have solved this problem (rough drawings welcome)
   - Any deadlines
   - Any other resources
2. Set up a meeting with CPO, HOD of Solution, or Lead Designer

### Who

- Designer
- Ideator
- Business / CPO / HOD
- PM

### Exit Criteria

- Everyone has a clear understanding of the problem, the **WHY**, and the benefits of doing or not doing this work
- Decision made: move forward or archive
- **Important**: Archive rejected problems—this ensures the company stays innovative
- Clear accountable person assigned to move to Explore stage
- Rough deadline for delivery (if proceeding)

---

## 2. Explore Stage

**Let imaginations go and explore different ideas to solve the problem.**

We want to get really acquainted with user needs and pain points. **Seek out members of the business** who are currently working in this area or experiencing this pain.

### How

The accountable person would:

- **User research** - Interviews, user behaviour recordings, speaking to support and operations team members
- **Quant research** - Explore the problem, cut the data
- **Qual research** - What are other tools doing in this problem space?
- **Early technical investigations** - Based on solution concepts

Once comfortable with the problem space (and business is still OK to proceed), kick off an [Ideation Meeting](/overview/team-practices/ideation-meeting).

### Who

- Designer
- Ideator
- Business / CPO / HOD
- Engineering Team
- PM

### Exit Criteria

- Wireframes or write-up of options to choose from
- Go / No-go decision
- PM notified for any Go decisions

---

## 3. Validate Stage

**Choose solutions, prepare for build, discard alternatives.**

At this stage we:

- Choose solution(s) to move forward with
- Prepare solution to be code-ready (high fidelity designs)
- Discard or move back alternative solutions that are de-scoped

### How

1. Dev team provides high-level estimates for proposed solutions
2. Dev team weighs in on their preferred option
3. Meeting with relevant stakeholders to decide which solution to proceed with

### Who

- Designer
- Business / CPO / HOD
- Engineering Team
- PM

### Exit Criteria

- Solution(s) picked
- Any Architecture Decision Record (ADR) completed
- High fidelity designs started
- PM notified to schedule this work

---

## 4. Build Stage

**Write code.**

Designers should work closely with devs:

- Attend [Story Kick Offs](/overview/team-practices/10-story-kick-offs-desk-checks)
- Attend standups
- Answer questions
- Ensure all relevant information is communicated

### Who

- Engineering Team
- Designer (supporting)
- PM (tracking)

### Exit Criteria

- Code complete and deployed
- Feature reaches end users

---

## 5. Measure Stage

**Once code reaches users, this is NOT the finish line. This is the START line.**

### Data Collection

Gather data on how the idea is performing:

- User engagement
- Conversion rates
- Customer feedback
- Error rates
- Performance metrics

### Actionable Metrics

Metrics should:

- Demonstrate cause-and-effect relationships
- Provide insights into what's working and what's not
- Be tied to business outcomes

### Feedback Loop

Data collected feeds back to the development team, allowing refinement based on real-world usage.

### Who

- PM
- Designer
- Engineering Team
- Business stakeholders

---

## 6. Learn Stage

**Analyse, validate, and improve.**

### Analyse Data

Identify patterns, trends, and areas for improvement from collected metrics.

### Validate Learning

Rigorously demonstrate progress and learnings from the data. What hypotheses were confirmed or rejected?

### Iterative Improvement

Based on lessons learned:

- Refine the idea
- Prepare for the next iteration
- Or decide to stop (if value isn't there)

### Who

- PM
- Designer
- Engineering Team
- Business stakeholders

### Exit Criteria

- Learnings documented
- Decision made: iterate, expand, or stop
- If iterating: return to appropriate stage (Problem, Explore, or Build)

---

## Stage Summary

| Stage        | Purpose                           | Key Output                            |
| ------------ | --------------------------------- | ------------------------------------- |
| **Problem**  | Define and understand the problem | Clear problem statement, go/no-go     |
| **Explore**  | Research and ideate solutions     | Wireframes, options to evaluate       |
| **Validate** | Choose and prepare solution       | ADR, high-fidelity designs, estimates |
| **Build**    | Write and deploy code             | Working feature in production         |
| **Measure**  | Collect real-world data           | Actionable metrics and feedback       |
| **Learn**    | Analyse and decide next steps     | Validated learnings, iteration plan   |

---

## When to Use This Process

| Use Full Process              | Skip to Build                         |
| ----------------------------- | ------------------------------------- |
| New features with uncertainty | Bug fixes                             |
| Strategic initiatives         | Well-understood enhancements          |
| Significant UX changes        | Tech debt / refactoring               |
| Cross-team projects           | Compliance requirements (known scope) |

---

## Related

- [Ideation Meeting](/overview/team-practices/ideation-meeting) - Generating and evaluating ideas
- [Story Kick Offs and Desk Checks](/overview/team-practices/10-story-kick-offs-desk-checks) - Starting stories well
- [Metrics Roadmap](/overview/team-practices/05-metrics-roadmap) - What we measure
