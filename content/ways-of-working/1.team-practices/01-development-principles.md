---
title: Development Principles
description: Core principles, non-negotiables, and development guardrails that define how we build
---

These are our development principles. They're not a workflow step—they're the guardrails that inform every decision we make.

---

## Core Principle: Spec-Driven Development

**The spec is the product. Code is just the implementation detail.**

With AI handling implementation, the bottleneck shifts from "writing code" to "knowing what to build." Our commitment to specs means:

- **Specs come first** - We think before we code
- **Specs drive implementation** - AI implements against the spec, not imagination
- **Specs stay alive** - When implementation reveals gaps, we update the spec
- **Specs are testable** - Every statement in a spec must be verifiable

This isn't bureaucracy. This is how we ensure AI produces what we actually want.

---

## Core Principle: Visualization Before Planning

**See it before you plan it.**

Planning without visualization leads to misaligned implementation. Our workflow ensures:

1. **Idea** - Capture the problem (what are we solving?)
2. **Specify** - Detail the solution (what should it do?)
3. **Clarify** - Challenge the spec from multiple angles
4. **Visualize** - Create mockups and design specs (what will users see?)
5. **Plan** - Plan implementation based on what we've visualized (how do we build it?)
6. **Task** - Break planning into discrete work
7. **Implement** - Build it

Visualization happens *before* planning. Always. This ensures design decisions inform technical decisions, not the other way around.

---

## Core Principle: Product Engineering

**The lines between roles blur in the best ways.**

Product engineering means:

- **Designers** can execute prototypes via AI without waiting for developers
- **Business people** can build proof-of-concepts to test ideas
- **Developers** orchestrate AI for faster, better implementations
- **Everyone** contributes design thinking, technical judgment, and business perspective

We're not expecting one person to be everything. We're expecting everyone to have breadth—8/10 across technical, product, and commercial—not 10/10 in one area and 2/10 in others.

---

## Core Principle: Team Values in Practice

Our company values—Choice, Excellence, Integrity, Innovation, Ownership, Wellbeing—aren't just nice words. They directly shape how we build.

**See [Keystones of Care](/guides/how-trilogy-works/keystones-of-care/)** **for the full breakdown of each value and how it applies to product and engineering.**

---

## Non-Negotiables

### 1. Specs Must Exist Before Implementation

No code without a spec. A spec can be rough, but it must exist and be approved before implementation starts.

### 2. Tests Cover All Changes

Every change must be programmatically tested. Unit tests, feature tests, or integration tests—pick what fits. Untested code doesn't ship.

### 3. Design Specs Before Technical Plans

Mockups and design specs come before implementation planning. Technical decisions should be informed by design decisions, not the reverse.

### 4. Specs Reflect Reality

When implementation reveals something the spec missed, update the spec first. The spec is the source of truth—keep it accurate.

### 5. No Undocumented Decisions

Major decisions (architecture, data model, API design) must be documented in the spec. "We decided in a standup" doesn't count.

### 6. Code Review is Mandatory

Every change gets reviewed. This isn't punishment—it's how we catch issues and share knowledge.

### 7. Context is Preserved

Documentation lives close to code. Specs are in `.tc-docs/src/content/docs/initiatives/`, not in forgotten Confluence pages. Context compounds when it's accessible.

---

## How We Work Together

### Collaboration Cadence

- **Daily** - Team standups for sync
- **Fortnightly** - Sprint planning with dev and design teams
- **Pre-sprint** - Cross-functional catch-ups with business and POs
- **Quarterly** - Big Room Planning with all product and dev
- **Monthly** - Showcases and demos
- **Ad-hoc** - Retros when needed

### Showtime

Regular showcases aren't optional. They serve multiple purposes:

- **Visibility** - The team sees what's shipping
- **Recognition** - Great work gets celebrated
- **Context building** - Everyone understands the bigger picture
- **Feedback loops** - Early input drives better outcomes

### Innovation (20%)

One day per week for approved project work:

- Build tools or products you want to build
- Explore new technologies
- Improve internal processes
- Improve the Trilogy customer or worker experience

Not slack time. Structured innovation. The best ideas come from people closest to problems.

---

## Spec Document Structure

Not every feature needs every artifact. Scale to complexity. A minimal spec includes:

```text
src/content/docs/initiatives/[initiative]/[epic]/
├── idea.md              # Problem and initial concept
├── spec.md              # Detailed specification
├── design.md       # UI/UX details and mockups (BEFORE plan)
├── plan.md              # Implementation approach
├── tasks.md             # Work breakdown
└── meta.yaml            # Jira sync and metadata
```

For larger features or epics, add:

- `db-spec.md` - Data model changes
- `test-plan.md` - Test coverage strategy
- `RACI.md` - Accountability matrix

---

## Source of Truth

| Artifact          | Owner          | When                        |
| ----------------- | -------------- | --------------------------- |
| **Spec**          | Team / Product | Before implementation       |
| **Code**          | Developers     | During/after implementation |
| **Design**        | Designers      | Before implementation       |
| **Tests**         | Developers     | Always—same time as code    |
| **Documentation** | Everyone       | Always                      |

The **spec is authoritative**. Code that doesn't match the spec is a bug—either in the code or the spec.

---

## Decision Making

When you're unsure about a decision:

1. **Check these principles first** - Do they guide this?
2. **Check the spec** - Is it already decided?
3. **Check the design spec** - What did the mockups show?
4. **Ask the team** - Bring it to standup or slack
5. **Update the spec** - Document the decision for next time

---

## Amendments

These principles evolve. If you find a non-negotiable that no longer makes sense, or a principle that isn't working:

1. **Propose the change** - Document why it should change
2. **Get agreement** - Discuss with leads and the team
3. **Update this document** - Make the change explicit
4. **Migrate existing work** - Update specs that were written under the old rules

**Current Version**: 1.0 | **Ratified**: January 2026 | **Last Amended**: January 2026

---

## Next Steps

- **New to the project?** Read [Team Philosophy](./00-team-philosophy) to understand our collaboration model
- **Building with AI?** Check out [Claude Code](/ways-of-working/claude-code) to understand how we leverage Claude
- **Getting started?** See [Getting Started](/overview/getting-started/) for your first week

These principles are the foundation. Everything else builds on them.
