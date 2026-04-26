---
title: Team Philosophy
description: Team philosophy, collaboration cadence, and innovation culture at Trilogy
---

How we build together - the collaboration model that makes AI-assisted development work.

---

## Context is Kings

Before we jump inot a problem, we make sure we try to build the big picture. Clear intent, good documentation, and structured thinking *before* we sprint into code - these aren't just AI requirements. They're the foundation of effective teamwork.

The goal: everyone has the context they need to make good decisions.

## Collaboration Cadence

Building shared context requires regular touchpoints. Here's our rhythm:

| Cadence         | Meeting                 | Who                              | Led By                           |
| --------------- | ----------------------- | -------------------------------- | -------------------------------- |
| **Daily**       | Standups                | Within teams                     | Team members                     |
| **Fortnightly** | Sprint planning         | Dev / Design teams               | Engineering / Squad Team Leads   |
| **Pre-sprint**  | Product catch-ups       | Cross-functional (business, POs) | Product Owners                   |
| **Quarterly**   | Big Room Planning (BRP) | All Product & Dev                | Product & Engineering Leadership |
| **Monthly**     | Demos / Showcases       | Everyone                         | Presenting teams                 |
| **Ad-hoc**      | Retros                  | Teams as needed                  | Team facilitator                 |

**The goal of these meetings:**

- Have the right stakeholders in the room
- Surface questions early
- Stay aligned on short-, medium-, and long-term direction

Lean and practical. Not meetings for the sake of meetings.

## Why In-Person Matters

There are things that happen faster in person:

- **Onboarding new team members** - Context transfer is exponentially faster face-to-face
- **Collaborating through problems** - Whiteboard moments, quick pairing
- **Building broader context** - Commercial (business) and product (customer) awareness
- **Water-cooler moments** - The unplanned conversations that solve problems

AI is compressing the gap between product and engineering. Product work is becoming more technical. Engineering is becoming more product-led. Building that cross-functional context is easier when you're physically together.

## Documentation Close to Code

We're merging business documentation into the codebase itself. That is where this document lives.

**Why?**

- AI agents can access it alongside code
- Reduces context-switching
- Non-technical users can access via Claude Desktop or internal tooling

**What this looks like:**

- Spec files live in `.tc-docs/content/initiatives/`
- Claude slash-commands automate common workflows
- Business requirements stay in sync with implementation

The goal: documentation that's *useful* because it's *accessible* - to both humans and AI.

## Execution Modes: Prescriptive vs Exploratory

Not all work is created equal. Some needs to be executed. Other work needs to be discovered.

### Top-Down (Prescriptive)

Work is defined upfront. Requirements are clear. Success is measurable. Just get it done.

**Characteristics:**

- Known scope
- Clear acceptance criteria
- Predictable effort
- Progress is linear

**Examples:**

- CRM migration to Portal
- Regulatory compliance features
- Data migration tasks
- Bug fixes with known root cause

**How to execute:** Fast shipping, minimal spec, iterate on feedback. Don't gold-plate unknowns.

### Bottom-Up (Exploratory)

Work emerges through iteration. Requirements clarify as you build. Success is learned.

**Characteristics:**

- Uncertain scope
- Hypothesis-driven
- Unpredictable effort
- Progress is cyclical

**Examples:**

- New product features
- UX improvements
- Performance optimization
- Innovation initiatives

**How to execute:** Small hypothesis → ship → learn → refine. Don't over-spec before validation.

### The Key Insight

Matching the approach to the work type is half the battle. Don't apply bottom-up discovery to prescriptive tasks. Don't apply top-down thinking to exploratory problems.

## Product Engineering: Cross-Functional Collaboration

The lines between roles are blurring—and that's a good thing.

### The Model

Product engineering is where **Product** (vision & strategy), **Technology** (execution & architecture), **User Experience** (design & usability), and **Business** (outcomes & value) overlap. Great solutions live in that intersection.

When all four perspectives inform decisions, you get:

- Features that people want to use
- Systems that scale and perform
- Outcomes that drive real business value
- Teams that move together, not in silos

### Why This Matters

Historically, building software meant strict role separation: Designers → Developers → Business, with information flowing one direction and handoffs creating friction.

Now, the best teams work differently:

- **Designers** can execute prototypes directly using AI
- **Business people** can build proof-of-concepts
- **Developers** orchestrate AI to build faster, focus on quality
- **Everyone** contributes design thinking, technical judgment, and business perspective

This isn't about one person doing everything. It's about all perspectives being present, valued, and balanced in every decision.

### Building This Culture

**Enable Everyone:** Give designers and business people access to Claude Code. Train them on pair prompting basics.

**Create Safe Spaces:** Prototypes aren't production. Let people experiment without fear of breaking things.

**Value Speed:** A rough prototype in an hour beats a perfect spec in a week. You learn more from building than from planning.

**Maintain Quality Gates:** Fast prototyping doesn't mean sloppy production. Keep standards high for what ships.

## Broadening Beyond Your Domain

AI raises the floor on technical execution. What differentiates engineers now is *breadth*.

The most valuable engineers aren't 10/10 technical, 2/10 product, 2/10 commercial. They're **8/10 across all three**—technical, product, and commercial.

## Spec-Driven Development

The spec is the product. Code is just the implementation detail.

With AI handling implementation, the bottleneck shifts from "writing code" to "knowing what to build." The spec becomes the primary artifact—the instruction set for AI.

**See ****[Spec-Driven Development](/ways-of-working/spec-driven-development/)****** **for the complete step-by-step workflow and patterns.**

## Staying Ahead of the Curve

The software development paradigm is changing dramatically. We're investing in:

- **Well-structured ways of working** - Repeatable, researched, tested
- **AI tooling proficiency** - Everyone learns Claude Code, not just enthusiasts
- **Spec-driven development** - Clear intent before code
- **Documentation culture** - Context that compounds

The goal isn't just to use AI tools. It's to be *great* at using AI tools - and to build the team structures that make that possible.

---

*Now let's get into the tools themselves.*
