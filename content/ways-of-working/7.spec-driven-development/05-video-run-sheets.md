---
title: "Video Run Sheets"
description: "Scripted walkthroughs for recording feature development tutorials and product demos"
---

## Purpose

These run sheets provide structured dot-point scripts for recording video walkthroughs. They demonstrate the full TC WoW lifecycle - from research through to production - using real feature examples.

---

## End-to-End Tutorial: Incidents & Management Plans

A full lifecycle walkthrough showing how to take an idea from zero to production using the TC WoW quality gates.

### Intro

- "This is how we build features at Trilogy Care - from research through to code"
- Show the gates overview: Idea (Gate 0) > Spec (Gate 1) > Design (Gate 2) > Architecture (Gate 3) > Code Quality (Gate 4) > QA (Gate 5) > Release (Gate 6)

---

### Act 1: Research

- Start with a vague need: "clinical team needs better incident tracking"
- Pull context from multiple sources:
  - Teams chat / Fireflies transcripts (what clinicians are actually saying)
  - Existing portal - show what's there today (risks, notes, tasks)
  - Competitor / industry research (what does good look like?)
- Capture findings in a research doc (`/trilogy-research`)
- **Key output:** we now understand the problem space

---

### Act 2: Formulate the Idea (Gate 0)

- Distill research into a clear problem statement
  - Care Partners lack visibility into incidents and management plans - they're working without contextual awareness of what's happened and what's in place
- Define who it's for (personas: care managers, clinical governance, ops, care partners)
- Articulate the opportunity: incidents linked to risks linked to management plans
- Create the initiative with `/trilogy-idea`
- Run `/trilogy-idea-handover` — validates brief, creates Linear epic in **Backlog**
- **Key output:** idea brief with problem, audience, RACI, HOD acknowledgement

---

### Act 3: Draft the Spec (Gate 1: Backlog → Start)

- Write user stories (INVEST criteria)
  - "As a care manager, I can log an incident against a participant"
  - "As clinical governance, I can see all incidents this week with linked risks"
  - "As a care manager, I can create a management plan with a recurring cycle"
  - "As a clinician, I can link a management plan to a risk and to past incidents"
- Define acceptance criteria (Given/When/Then)
- Document edge cases, out of scope, dependencies
- Run `/trilogy-spec-handover` — Gate 1 checklist, moves Linear to **Start**
- **Key output:** validated spec document

---

### Act 4: Design Thinking (Gate 2: Start → Dev)

- Design kickoff (`/trilogy-design`) - not pixels yet, just thinking
  - User flows: how does logging an incident actually work step by step?
  - Information architecture: where do management plans live in the nav?
  - Edge cases from a UX perspective
- Mockups / wireframes
- Run `/trilogy-design-handover` — Gate 2 checklist, moves Linear to **Dev**
- **Key output:** design artefacts ready for dev handover

---

### Act 5: Architecture & Planning (Gate 3)

- Technical planning (`/speckit-plan`)
  - Data model: incidents table, management_plans table, pivot to risks
  - API design: endpoints, validation, authorization
  - Frontend: which pages, components, composables
  - Migration strategy, queue jobs, notifications
- Break into implementable tickets
- Run Gate 3 checklist - will the structure hold?
- **Key output:** architecture doc + sized tickets

---

### Act 6: Implementation (Gate 4: Dev → QA)

- Write the code
  - Models, migrations, factories
  - Controllers, data classes, policies
  - Vue pages, components
  - Tests (Pest)
- Run Pint, run tests, 80%+ coverage
- Run `/trilogy-dev-handover` — Gate 4 checklist, creates PR, moves Linear to **QA**
- **Key output:** PR with passing tests, QA notes, acceptance criteria verified

---

### Act 7: QA & Release (Gates 5 & 6)

- QA validation against acceptance criteria
- `/trilogy-qa` — Gate 5: does it actually work? Moves Linear to **Review**
- `/trilogy-release` — Gate 6: release checklist, moves Linear to **Completed**
- Ship it

---

### Closing

- Recap the full loop: Research > Idea (Gate 0) > Spec (Gate 1) > Design (Gate 2) > Architecture (Gate 3) > Code (Gate 4) > QA (Gate 5) > Release (Gate 6)
- "Every feature goes through this. The gates catch problems early. Linear tracks where every piece of work sits."
- Show the final result: incidents + management plans live in the portal

---

## Feature Deep Dive: Incidents Management

### Opening / Context

- Show the current state - search for "incidents" in the portal, demonstrate there's no dedicated module yet
- Acknowledge any existing groundwork (related fields on care plans, risk registers, notes)
- Frame the problem: incidents happen, tracked in spreadsheets/emails, disconnected from the participant's risk profile. Care Partners can't see incidents or management plans - they lack the contextual awareness needed to deliver safe, informed care

### Why Incidents in the Portal

- Direct association between incidents and participant risk profiles
- Real-time visibility - X incidents reviewed per week by clinical governance
- Pattern detection - recurring incidents for the same participant flag escalating risk
- Compliance trail - NDIS/Aged Care Quality Standards require documented incident response
- Reduces double-handling - one place to log, triage, investigate, close out
- Notifications to relevant stakeholders (care managers, clinical leads) on creation

### Key Screens / Flow

- Log new incident (who, what, when, where, severity, immediate actions taken)
- Link to participant profile + their active risks
- Triage / categorise (clinical, behavioural, medication, environmental, other)
- Investigation notes + root cause
- Actions taken / corrective actions
- Close out with outcome
- Dashboard: incidents by type, by severity, by time period, overdue investigations

---

## Feature Deep Dive: Management Plans

### Opening / Context

- Explain what clinical teams currently do - cyclical care workflows that repeat on a schedule
- These are living, circular loops - not one-off tasks, not static documents
- Currently managed outside the portal (spreadsheets, Word docs, verbal handovers)
- Frame: a management plan is like a recurring case with a schedule, review cycle, and linked actions

### What is a Management Plan?

- A structured, repeating clinical workflow attached to a participant
- Has a defined cycle (daily, weekly, fortnightly, monthly, quarterly)
- Each cycle generates tasks/actions that need completing
- Tracks adherence - was the plan followed this cycle? What was the outcome?
- Think of it as: **Schedule > Execute > Record > Review > Adjust > Repeat**

### Why Management Plans in the Portal

- Overlap with tasks - but purpose-built for clinical recurring workflows
- Attachable to risks - "this participant has a falls risk, here's the management plan for it"
- Attachable to incidents - "incident occurred, here's the management plan that should have prevented it / will prevent recurrence"
- Visibility for the whole care team - not just the person who wrote the plan
- Audit trail - every cycle recorded, every deviation documented
- Replaces ad-hoc reminders with structured accountability

### Key Screens / Flow

- Create management plan (participant, category, description, goals)
- Set schedule / cycle (frequency, start date, review date)
- Define actions per cycle (what needs to happen each time)
- Link to risks (e.g. falls risk, medication risk, skin integrity)
- Cycle execution view - tick off actions, record notes/outcomes
- Review & adjust - was the plan effective? Modify for next cycle
- Dashboard: active plans, overdue cycles, plans linked to open incidents

---

## Tying It Together

- Show how incidents, management plans, and risks all link to the same participant
- **Incident happens** > linked to a risk > triggers review of the management plan
- **Management plan cycle missed** > flags as overdue > could explain an incident
- **Risk escalation** > "3 incidents in 30 days + management plan non-adherence" = automatic flag
- Combined governance dashboard: weekly review showing incidents, plan adherence, risk status
- Export / reporting for board papers, audit prep, NDIS reportable incidents
