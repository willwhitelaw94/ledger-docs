---
title: "Feature Specification: Gamification — Streaks, Challenges & Rewards"
---

# Feature Specification: Gamification — Streaks, Challenges & Rewards

**Feature Branch**: `036-GMF-gamification`
**Created**: 2026-03-16
**Status**: Draft

## Overview

Accounting is a discipline, not a one-off task. Users who stay on top of their books weekly have healthier businesses — but most procrastinate until tax time. This feature introduces gamification mechanics that turn routine bookkeeping into a satisfying habit loop.

The gamification system is built as a **generic achievement event bus** — streaks, goals (037-GLS), "all clear" moments, and milestones all feed into a unified celebration and badge system. This isn't RPG-style XP and levels — it's progress rings, streak flames, and quantified value ("MoneyQuest saved you 14 hours this month").

### Core Mechanics

1. **Streaks** — consecutive period completions for habits (reconcile weekly, process transactions daily)
2. **Progress Rings** — three concentric rings (Reconcile, Invoice, Review) that fill daily/weekly — the primary dashboard visual
3. **Challenges** — user-defined or practice-suggested goals with custom frequency and thresholds
4. **Badges** — earned at milestone thresholds from any achievement source (streaks, goals, "all clear" moments)
5. **"All Clear" Celebrations** — full-screen celebratory moment when a queue is fully cleared (zero unmatched transactions, no overdue invoices)
6. **Money/Time Saved Counter** — quantified value display using real system data + industry benchmarks
7. **Workspace Health Indicator** — positive "health glow" for owners, operational "streak flame" for practice managers

### Dual Scope: User + Workspace

Streaks exist at two levels:
- **User streaks** — personal habit tracking. "I reconciled 3 weeks in a row." Aggregated on `/home` across all workspaces.
- **Workspace streaks** — team health metric. Anyone completing the task maintains the workspace streak. Visible to practice managers.

### Completion Thresholds (Duolingo Model)

Any activity in the period maintains the streak (low friction, keeps the habit). Full queue clearance earns a "Perfect Period" bonus badge. A sole trader coding 3 transactions keeps their streak. An accountant clearing 200 gets "Perfect Week."

### Plan Tier: Free for All

Gamification is available on every plan including Starter and free trial. Its purpose is retention — gating it behind a paywall defeats the point. Practice-suggested templates naturally require a practice connection (Professional+ implied).

## User Scenarios & Testing

### User Story 1 — Progress Rings Dashboard (Priority: P1)

A business owner wants to see at a glance how consistently they've been keeping their books up to date, with visual progress rings for key accounting habits.

**Why this priority**: Progress rings are the primary visual face of gamification — the first thing users see on their dashboard.

**Independent Test**: Can be fully tested by logging in and viewing the progress rings on the dashboard, seeing fill levels for default habits.

**Acceptance Scenarios**:

1. **Given** a user who has reconciled their bank transactions 3 weeks in a row, **When** they view their workspace dashboard, **Then** they see three concentric progress rings (Reconcile, Invoice, Review) with the Reconcile ring filled and a "3 weeks" streak count.
2. **Given** a user with no activity in a tracked habit for the current period, **When** they view their dashboard, **Then** the corresponding ring shows empty with a subtle "at risk" pulse animation.
3. **Given** a user who has never engaged with gamification, **When** they first see the rings, **Then** default habits are shown (Reconcile, Process Transactions, Review Reports) with prompts to start.
4. **Given** a user on the `/home` page, **When** they view their personal dashboard, **Then** they see aggregated user-level streaks across all their workspaces.

---

### User Story 2 — Automatic Streak Tracking (Priority: P1)

A bookkeeper wants their streaks to update automatically when they complete routine tasks, without needing to manually check anything off.

**Why this priority**: Manual tracking adds friction and defeats the purpose. Streaks must be effortless to maintain.

**Independent Test**: Can be tested by reconciling a bank account and immediately seeing the reconciliation streak increment.

**Acceptance Scenarios**:

1. **Given** a user with a "Reconcile weekly" streak, **When** they reconcile at least one bank transaction this week, **Then** the streak count increments automatically (any activity maintains the streak).
2. **Given** a user with a "Process transactions daily" streak at 5 days, **When** they miss a day without processing any transactions, **Then** the streak resets to 0 the following day.
3. **Given** a user who reconciles on Monday, **When** they reconcile again on Thursday of the same week, **Then** the weekly streak does not double-count — it remains at the current week's count.
4. **Given** a user completing a task that satisfies multiple streak criteria, **When** the action completes, **Then** all applicable streaks (both user-level and workspace-level) are updated simultaneously.
5. **Given** a user who clears ALL unmatched transactions in a period, **When** the queue reaches zero, **Then** they earn a "Perfect Week" bonus badge in addition to maintaining the streak.

---

### User Story 3 — Create Custom Challenges (Priority: P1)

A business owner wants to set personal bookkeeping challenges with their own frequency and target, like "Code all bank transactions every Tuesday" or "Send all invoices within 24 hours".

**Why this priority**: Default streaks cover common habits, but custom challenges let users build discipline around their specific pain points.

**Independent Test**: Can be tested by creating a custom challenge, completing the required action, and seeing the challenge progress update.

**Acceptance Scenarios**:

1. **Given** a user on the Challenges page, **When** they click "New Challenge", **Then** they can select a task type, set a frequency (daily, weekly, fortnightly, monthly), and name their challenge.
2. **Given** a custom challenge "Reconcile every Friday", **When** the user reconciles on a Friday, **Then** the challenge shows as completed for that period.
3. **Given** a custom challenge, **When** the user wants to pause it (e.g., during holidays), **Then** they can pause without breaking their streak, and resume later.
4. **Given** a user with 5 active challenges, **When** they try to create a 6th, **Then** the system allows it (no arbitrary limit on active challenges).

---

### User Story 4 — Practice-Suggested Challenge Templates (Priority: P2)

A financial advisor practice wants to create challenge templates ("Good Money Habits") and suggest them to connected client workspaces, encouraging consistent bookkeeping discipline.

**Why this priority**: Practices setting discipline for clients is a key differentiator. It turns gamification from individual motivation into advisor-guided accountability.

**Independent Test**: Can be tested by a practice creating a template, verifying it appears in connected client workspaces as a suggestion, and the client opting in.

**Acceptance Scenarios**:

1. **Given** a practice manager on the practice dashboard, **When** they click "Create Challenge Template", **Then** they can define a challenge with name, task type, frequency, and description.
2. **Given** a practice has created a "Reconcile Weekly" template, **When** a connected client workspace views their Challenges page, **Then** the template appears as "Suggested by [Practice Name]" with an "Activate" button.
3. **Given** a client activates a practice-suggested challenge, **When** they maintain the streak, **Then** the practice dashboard shows the client's streak status alongside other clients.
4. **Given** a client ignores a suggested challenge, **When** the practice manager views their dashboard, **Then** they can see which clients have adopted vs not adopted the suggestion — but cannot force activation.
5. **Given** a workspace connected to multiple practices, **When** both practices suggest challenges, **Then** all suggestions appear, attributed to their respective practices.

---

### User Story 5 — Earn Badges and Milestones (Priority: P2)

A user wants to earn recognisable milestones when they hit streak targets, giving them a sense of accomplishment and motivation to continue.

**Why this priority**: Badges are the reward mechanism that makes streaks meaningful. Without them, streaks are just numbers.

**Independent Test**: Can be tested by maintaining a streak to a milestone threshold and verifying the badge appears.

**Acceptance Scenarios**:

1. **Given** a user who reaches a 4-week reconciliation streak, **When** the milestone is hit, **Then** a "Monthly Master" badge is awarded with a celebratory animation.
2. **Given** a user who has earned 3 badges, **When** they view their profile or streaks page, **Then** all earned badges are displayed with the date earned.
3. **Given** a milestone threshold, **When** the user reaches it, **Then** a toast notification celebrates the achievement (e.g., "You've reconciled 12 weeks straight!").
4. **Given** badge milestones at 1 week, 4 weeks, 12 weeks, 26 weeks, and 52 weeks, **When** a user hits each threshold, **Then** they receive progressively more impressive badges.
5. **Given** a user hits a goal milestone (037-GLS), **When** the goal target is reached, **Then** the gamification system awards a goal-specific badge (e.g., "Revenue Target Hit") and triggers the same celebration animation.
6. **Given** a user clears all items in the intray (018-ITR), **When** the intray reaches zero, **Then** an "All Clear" full-screen celebration moment is shown.

---

### User Story 6 — Streak Recovery (Priority: P2)

A bookkeeper who missed one period doesn't want to lose a long streak entirely. They want a grace mechanism or recovery option.

**Why this priority**: Losing a 20-week streak to one missed week is demoralising and causes users to disengage entirely.

**Independent Test**: Can be tested by missing one period on a long streak and using the recovery mechanism.

**Acceptance Scenarios**:

1. **Given** a user with a 10-week streak who misses one week, **When** they complete the task the following week, **Then** they are offered a "streak recovery" that preserves their streak (with a visual indicator that recovery was used).
2. **Given** a user who has already used a recovery this month, **When** they miss another period, **Then** the streak resets (one recovery per month).
3. **Given** a recovered streak, **When** the user views their streak history, **Then** the recovered week is visually distinct (e.g., lighter colour or dotted border).

---

### User Story 7 — "All Clear" Celebrations (Priority: P1)

A bookkeeper who clears their entire reconciliation queue, all overdue invoices, or the full intray wants a satisfying moment of completion — not just an empty screen.

**Why this priority**: The emotional payoff of clearing a queue is the most cost-effective gamification mechanic. It costs almost nothing to build and has outsized impact on satisfaction.

**Independent Test**: Can be tested by clearing all unmatched bank transactions and verifying the celebration appears.

**Acceptance Scenarios**:

1. **Given** a user reconciles the last unmatched bank transaction, **When** the reconciliation queue reaches zero, **Then** a full-screen "All Clear" celebration is shown with a satisfying animation and the count of items cleared this session.
2. **Given** a user resolves the last item in the intray (018-ITR), **When** the intray count reaches zero, **Then** an "All Clear" celebration is shown.
3. **Given** a user who has seen the "All Clear" celebration before, **When** they clear a queue again, **Then** the celebration is shown again (it never gets old) but with a running count ("3rd All Clear this month!").
4. **Given** a user who prefers minimal UI, **When** they have disabled gamification, **Then** no celebration is shown — just the standard empty state.

---

### User Story 8 — Money Saved / Time Saved Counter (Priority: P2)

A business owner wants to see the quantified value MoneyQuest has delivered — how much time and money the platform has saved them.

**Why this priority**: Quantified value reinforcement makes the subscription feel worth it and gives users talking points for referrals.

**Independent Test**: Can be tested by verifying the counter calculates correctly based on auto-matched reconciliations, duplicate payments caught, and online invoice payments.

**Acceptance Scenarios**:

1. **Given** a workspace with 200 auto-matched bank transactions this month, **When** the user views their dashboard, **Then** a "Time Saved" counter shows "6.7 hours saved this month" (200 × 2 min industry benchmark per manual reconciliation).
2. **Given** anomaly detection (040-AND) caught a $3,200 duplicate payment, **When** the user views their counter, **Then** "Money Saved" shows "$3,200 in duplicate payments caught."
3. **Given** the user clicks on the counter, **When** the detail view opens, **Then** they see the formula breakdown: "200 transactions auto-matched × 2 min avg manual entry = 400 min = 6.7 hrs."
4. **Given** a workspace with no activity, **When** the counter is viewed, **Then** it shows "$0 / 0 hours" with a prompt: "Start reconciling to see your savings grow."

---

### User Story 9 — Workspace Health Indicator (Priority: P2)

A workspace shows a visual health indicator that reflects how consistently bookkeeping habits are maintained. Workspace owners see a positive "health glow"; practice managers see operational "streak flames."

**Why this priority**: Makes workspace health instantly scannable without reading numbers.

**Independent Test**: Can be tested by maintaining workspace streaks and verifying the indicator brightness changes.

**Acceptance Scenarios**:

1. **Given** a workspace with all streaks active and recent activity, **When** the workspace owner views their dashboard, **Then** a "health glow" indicator shows bright and vibrant.
2. **Given** a workspace with broken streaks and overdue items, **When** the workspace owner views their dashboard, **Then** the health glow is dim with a gentle prompt to catch up.
3. **Given** a practice manager with 10 client workspaces, **When** they view their practice dashboard, **Then** each workspace shows a flame icon — bright for consistent workspaces, dim/warning for neglected ones.
4. **Given** a practice manager, **When** they sort by flame status, **Then** workspaces needing attention appear at the top.

---

### User Story 10 — Team Streaks & Practice Leaderboard (Priority: P3)

An accounting firm managing multiple clients wants to see which workspaces are being maintained consistently and which are falling behind.

**Why this priority**: Extends gamification to the practice/team level, but only relevant for multi-workspace users.

**Independent Test**: Can be tested by viewing the practice dashboard and seeing streak summaries across client workspaces.

**Acceptance Scenarios**:

1. **Given** a practice manager with 10 client workspaces, **When** they view the practice dashboard, **Then** they see a streaks leaderboard showing which workspaces are up to date.
2. **Given** a workspace that hasn't been reconciled in 3 weeks, **When** the practice manager views the leaderboard, **Then** it's flagged with a warning flame indicator.

---

### Edge Cases

- What happens when a workspace is created mid-week? Streaks start from the first full period after creation, not retroactively.
- What happens when the user changes their challenge frequency? The streak resets to 0 with the new frequency.
- What happens in a workspace with no bank account connected? Reconciliation streaks are hidden; only applicable streaks are shown.
- What happens when multiple users share a workspace? Workspace streaks are shared — anyone completing the task maintains the workspace streak. User streaks are personal to each user.
- What happens during a free trial? Full gamification is available to encourage engagement and conversion.
- What about period boundaries? Weeks run Monday 00:00 to Sunday 23:59 in the workspace's configured timezone. Monthly periods align to calendar months.
- What about timezone differences across users in the same workspace? The workspace timezone is authoritative for streak period boundaries, not the user's local timezone.
- What happens when a workspace is connected to multiple practices? Challenge suggestions from all practices are shown, attributed to each practice.
- What happens when an achievement fires from 037-GLS goals? The gamification event bus handles it — goal milestones trigger the same badge/celebration pipeline as streak milestones.

## Requirements

### Functional Requirements

**Streaks & Progress Rings**
- **FR-001**: System MUST automatically track streaks for predefined habits: bank reconciliation, transaction processing, invoice sending, and report review.
- **FR-002**: System MUST track streaks at two levels: user-scoped (personal, aggregated on `/home`) and workspace-scoped (team metric, visible to practice managers).
- **FR-003**: System MUST use a tiered completion model: any activity in the period maintains the streak; full queue clearance earns a "Perfect Period" bonus badge.
- **FR-004**: System MUST reset a streak to zero when the user misses a full period without completing the required task.
- **FR-005**: System MUST display progress rings (3 concentric rings: Reconcile, Invoice, Review) as the primary dashboard gamification visual.
- **FR-006**: System MUST use Monday-to-Sunday weeks and calendar months in the workspace's configured timezone for period boundaries.

**Challenges & Practice Templates**
- **FR-007**: System MUST allow users to create custom challenges with a name, task type, and frequency (daily, weekly, fortnightly, monthly).
- **FR-008**: System MUST support pausing challenges without breaking the streak, with an explicit resume action.
- **FR-009**: System MUST allow practices to create challenge templates that appear as "Suggested by [Practice Name]" in connected client workspaces.
- **FR-010**: Practice-suggested challenges MUST be opt-in only — clients choose to activate, practices cannot force them.

**Badges & Celebrations**
- **FR-011**: System MUST award badges at predefined milestone thresholds (1, 4, 12, 26, 52 consecutive periods).
- **FR-012**: System MUST show celebratory feedback (animation or toast) when milestones are reached.
- **FR-013**: System MUST implement "All Clear" full-screen celebrations when a queue is fully cleared (reconciliation, intray, overdue invoices).
- **FR-014**: System MUST implement the gamification system as a generic achievement event bus — streaks, goals (037-GLS), "all clear" moments, and external milestones all trigger badges/celebrations through the same pipeline.

**Money/Time Saved**
- **FR-015**: System MUST display a "Money Saved / Time Saved" counter using real system data (auto-matched transactions, duplicate payments caught) multiplied by industry benchmark time/cost estimates.
- **FR-016**: System MUST provide drill-down showing the formula breakdown when users click on the counter.

**Workspace Health & Practice Dashboard**
- **FR-017**: System MUST display a workspace health indicator: positive "health glow" for workspace owners, operational "streak flame" for practice managers.
- **FR-018**: System MUST support practice-level streak aggregation showing which client workspaces are consistently maintained.
- **FR-019**: System MUST show adoption rates for practice-suggested challenge templates on the practice dashboard.

**UI Integration**
- **FR-020**: System MUST integrate gamification across: workspace dashboard (rings, streaks), `/home` page (aggregated user streaks), notifications (024-NTF) for at-risk alerts, intray (018-ITR) for streak-at-risk items.
- **FR-021**: System MUST display ambient UI hints: flame icon next to nav items with active streaks, streak count on sidebar badges.
- **FR-022**: System MUST send a single streak-at-risk notification at 75% of the period elapsed (e.g., Friday for weekly streaks). Ambient indicators (flame, rings, intray) are always-on.
- **FR-023**: System MUST only show streaks relevant to the workspace's active features (e.g., no reconciliation streak if no bank account connected).
- **FR-024**: System MUST allow users to dismiss or hide gamification elements if they prefer a minimal interface.

**Plan Tier**
- **FR-025**: Gamification MUST be available on all plans including Starter ($29/mo) and free trial. No tier gating.

### Key Entities

- **Streak**: Tracks consecutive period completions for a specific habit. Has a current count, best-ever count, last completed date, frequency, status (active, at-risk, broken, paused), scope (user or workspace), and perfect-period flag.
- **Challenge**: A user-defined or system-default goal with a name, task type, frequency, and associated streak. Can be paused and resumed. May be linked to a practice-suggested template.
- **Challenge Template**: A practice-created challenge definition that can be suggested to connected client workspaces. Has a name, task type, frequency, description, and practice reference.
- **Badge**: An achievement earned at a milestone threshold from any source (streak, goal, "all clear"). Has a name, icon, description, tier, date earned, and source type.
- **Achievement Event**: A generic event emitted when any achievement-worthy action occurs (streak milestone, goal hit, queue cleared). Consumed by the badge/celebration pipeline.
- **Value Counter**: A per-workspace running total of money saved and time saved, calculated from system data + industry benchmarks.

### Deferred to Future

- **Accounting Quizzes** — originally Story 6 (P3). Deferred entirely. Quizzes are a content problem (hundreds of questions needed) with marginal engagement uplift vs the core streak/challenge loop. Revisit if users request educational content.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users with active streaks reconcile their accounts 3x more frequently than users without streaks.
- **SC-002**: 60% of users who see the progress rings engage with at least one streak within their first month.
- **SC-003**: Average streak length across all users reaches 4+ consecutive periods within 3 months of launch.
- **SC-004**: Users with 10+ week streaks have 40% higher retention than users without streaks.
- **SC-005**: 30% of users create at least one custom challenge within their first 2 months.
- **SC-006**: 50% of practice-suggested challenge templates are activated by at least one client workspace.
- **SC-007**: "All Clear" celebration triggers at least once per active workspace per month.
- **SC-008**: Money/Time Saved counter shows non-zero values for 80%+ of workspaces with bank feeds connected.

---

## Clarifications

### Session 2026-03-19

- Q: Where do streaks live — workspace-scoped, user-scoped, or both? → A: **Both.** Workspace streaks are a team health metric (practice managers). User streaks are personal habit tracking (aggregated on `/home`).
- Q: Can practices create and push challenge templates to client workspaces? → A: **Practices suggest, clients opt in.** Templates appear as "Suggested by [Practice Name]" — clients choose to activate. Practices see adoption rates.
- Q: What counts as "completing" a streak task? → A: **Tiered (Duolingo model).** Any activity maintains the streak (low friction). Full queue clearance earns "Perfect Period" bonus badge.
- Q: Where does gamification surface in the UI? → A: **Full integration + ambient hints.** Workspace dashboard (rings), `/home` (aggregated), notifications (at-risk), intray (streak-at-risk items), plus ambient cues (flame icons on nav, sidebar badges).
- Q: Is gamification gated by plan tier? → A: **Free for all tiers.** Available on Starter, Professional, Enterprise, and free trial. Retention is the goal — gating defeats the purpose.
- Q: When does a "week" or "month" reset? → A: **Monday-to-Sunday, workspace timezone.** Calendar months for monthly periods. Simple and predictable.
- Q: Where do quiz questions come from? → A: **Deferred entirely.** Quizzes are a content problem with marginal uplift. Ship streaks/challenges/badges first, revisit if users request educational content.
- Q: Which additional gamification tactics to include? → A: **Progress Rings** (primary visual), **"All Clear" celebrations** (emotional payoff), **Money/Time Saved counter** (quantified value), **Workspace Streak Flame** (practice scannable health). No RPG/XP systems — too overkill for professional accounting.
- Q: Should hitting a goal milestone (037-GLS) trigger a badge? → A: **Yes.** Gamification system is a generic achievement event bus. Goals, streaks, "all clear" moments all feed into the same badge/celebration pipeline.
- Q: Workspace health indicator — who sees it? → A: **Both, different framing.** Owners see positive "health glow" (brighter = better). Practice managers see operational "streak flames" (dim = needs attention).
- Q: How often to nudge about at-risk streaks? → A: **Single nudge at 75% of period elapsed.** One notification only (Friday for weekly, 6pm for daily). Ambient indicators (flame, rings, intray) always-on regardless.
- Q: Onboarding quest? → A: **Separate epic.** Gamified onboarding checklist (connect bank → reconcile 10 transactions → send first invoice → review P&L) is valuable but belongs in its own onboarding epic, not 036-GMF.
- Q: Design challenge paradigm selection? → A: **Ring Rachel (dashboard/widgets) as foundation + Ambient Alex (contextual/ambient) badges in profile dropdown.** Feed Frankie (timeline) rejected for workspace dashboard but feed pattern may suit `/home` aggregation.
- Q: Ring as universal symbol? → A: **Yes.** Progress rings on dashboard, health rings on practice, streak history as mini rings, "All Clear" as ring completing. The ring IS the gamification brand.
- Q: Where do badges live? → A: **User profile dropdown (Ambient Alex pattern).** Click avatar → expanded dropdown with badge icon grid, stats, hover tooltips. No dedicated page for MVP.
