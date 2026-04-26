---
title: "Feature Specification: Celebration UI — Milestone Moments & Delight System"
---

# Feature Specification: Celebration UI — Milestone Moments & Delight System

**Parent Epic**: `036-GMF-gamification`
**Created**: 2026-04-02
**Status**: Draft

## Overview

Users invest real effort maintaining their books — reconciling transactions, processing invoices, clearing their intray. When they hit a milestone, the app should **feel something back**. The Celebration UI is a cross-cutting visual system that triggers delightful moments (confetti bursts, achievement cards, progress completions) when users reach milestones across the platform.

This is not a gimmick — it's the emotional payoff that makes habits stick. Research shows that immediate positive reinforcement after completing a task increases the likelihood of repeating it by 3-4x. A bookkeeper who clears 200 transactions and sees a satisfying "All Clear" burst will do it again next week. One who sees a blank screen might not.

### Design Principles

1. **Delightful but brief** — celebrations last 2-4 seconds, never block workflow
2. **Earned, not random** — every celebration is tied to a real accomplishment
3. **Progressively impressive** — a 4-week streak gets a toast; a 52-week streak gets the full show
4. **Respectful of preference** — users who prefer minimal UI can disable celebrations entirely
5. **The ring is the brand** — the progress ring is the universal celebration symbol (completing ring = achievement)

### Two Celebration Tiers

| Tier | Trigger Examples | Visual Treatment |
|------|-----------------|------------------|
| **Moment** (lightweight) | Streak maintained, first invoice sent, CoA complete | Toast notification with icon + message, auto-dismisses in 4 seconds |
| **Milestone** (full celebration) | All Clear queue empty, streak milestone (12/26/52 weeks), first reconciliation complete, zero intray items | Full-screen overlay with confetti burst, completing ring animation, stats, optional badge unlock |

## User Scenarios & Testing

### User Story 1 — Queue Cleared Celebration (Priority: P1)

A bookkeeper who reconciles the last unmatched bank transaction, clears the last overdue invoice, or resolves the last intray item wants a satisfying moment of completion — not just an empty screen.

**Why this priority**: The emotional payoff of clearing a queue is the highest-impact, lowest-cost gamification mechanic. It directly reinforces the habit of staying on top of bookkeeping.

**Independent Test**: Can be tested by reconciling the final unmatched bank transaction in a workspace and verifying the celebration overlay appears.

**Acceptance Scenarios**:

1. **Given** a user with 3 unmatched bank transactions, **When** they reconcile the last one, **Then** a full-screen "All Clear" celebration appears with confetti, a completing ring animation, the count of items cleared in this session, and a "Keep going" dismiss action.
2. **Given** a user who resolves the last item in their intray, **When** the intray count reaches zero, **Then** the same celebration overlay appears with "Intray Clear" messaging.
3. **Given** a user who pays the last overdue invoice, **When** no overdue invoices remain, **Then** the celebration fires with "No Overdue Invoices" messaging.
4. **Given** a celebration is showing, **When** the user presses Escape or clicks outside the card, **Then** the celebration dismisses immediately.
5. **Given** a user who clears a queue for the 3rd time this month, **When** the celebration fires, **Then** it includes a running count ("3rd All Clear this month!").

---

### User Story 2 — Milestone Setup Completions (Priority: P1)

A new user who finishes setting up their Chart of Accounts, connects their first bank account, or completes onboarding wants to know they've made real progress — a sense of "I'm on track."

**Why this priority**: First-time completions are the highest-churn moments. A celebration at setup milestones reduces abandonment during onboarding.

**Acceptance Scenarios**:

1. **Given** a user who has just finished configuring their Chart of Accounts (all required accounts created), **When** they save the final account, **Then** a Milestone celebration appears: "Chart of Accounts Complete — you're ready to start tracking."
2. **Given** a user who connects their first bank feed, **When** the connection succeeds, **Then** a Moment toast appears: "Bank connected — transactions will start flowing in."
3. **Given** a user who posts their first journal entry, **When** the entry is posted, **Then** a Moment toast appears: "First entry posted — your ledger is live."
4. **Given** a user who sends their first invoice, **When** the invoice is sent, **Then** a Moment toast appears with encouragement: "First invoice sent."

---

### User Story 3 — Streak Milestone Celebrations (Priority: P1)

A user who maintains a bookkeeping habit for a significant period (4 weeks, 12 weeks, 26 weeks, 52 weeks) wants recognition that their discipline is paying off.

**Why this priority**: Streak milestones are the core retention mechanic. Without celebration at these thresholds, streaks are just numbers — the emotional reinforcement is what drives long-term habit formation.

**Acceptance Scenarios**:

1. **Given** a user who maintains a reconciliation streak for 4 consecutive weeks, **When** the 4th week completes, **Then** a Milestone celebration appears: "4 Week Streak — Monthly Master" with a badge unlock.
2. **Given** a user who reaches a 12-week streak, **When** the milestone is hit, **Then** a more impressive celebration appears (larger confetti burst, premium badge) with their streak history visualised as mini-rings.
3. **Given** a user who reaches a 52-week streak, **When** the milestone is hit, **Then** the most impressive celebration fires — extended confetti, golden ring completion, "Annual Champion" badge, with a shareable achievement card.
4. **Given** a user with a streak milestone, **When** the celebration shows a badge unlock, **Then** the badge is immediately visible in their profile achievement section.

---

### User Story 4 — Celebration Preferences (Priority: P2)

A user who finds celebrations distracting wants to reduce or disable them without losing the underlying achievement tracking.

**Why this priority**: Not everyone wants confetti. Respecting user preference prevents the feature from becoming annoying and ensures achievements are still recorded even when visual celebrations are turned off.

**Acceptance Scenarios**:

1. **Given** a user in workspace settings, **When** they navigate to display preferences, **Then** they see a "Celebrations" toggle with three options: Full (default), Minimal (toasts only, no full-screen), and Off.
2. **Given** a user with celebrations set to "Minimal", **When** they clear a queue, **Then** they see a brief toast notification instead of the full-screen overlay.
3. **Given** a user with celebrations set to "Off", **When** they hit any milestone, **Then** no visual celebration is shown, but the achievement is still recorded and badges are still awarded.
4. **Given** a user who changes their preference from Off to Full, **When** they next hit a milestone, **Then** the celebration fires as normal — no backlog of missed celebrations is replayed.

---

### User Story 5 — Achievement History (Priority: P2)

A user wants to see a record of their past achievements, milestones, and celebrations — a "trophy case" that shows their journey.

**Why this priority**: Achievement history gives long-term users a sense of progress and makes badges meaningful beyond the moment of earning.

**Acceptance Scenarios**:

1. **Given** a user who clicks their avatar or navigates to their profile, **When** they view the achievements section, **Then** they see a grid of earned badges with dates, plus a timeline of milestone events.
2. **Given** a user with 5 earned badges, **When** they hover over a badge, **Then** they see the badge name, description, and date earned.
3. **Given** a user with no achievements yet, **When** they view the achievements section, **Then** they see upcoming milestones they can work towards (e.g., "Reconcile for 4 weeks to earn Monthly Master").
4. **Given** a practice manager viewing a client workspace, **When** they view the workspace's achievement history, **Then** they see the workspace-level achievements (not individual user achievements from that workspace).

---

### User Story 6 — Practice-Visible Client Celebrations (Priority: P3)

A practice manager wants to see when their clients hit milestones, so they can acknowledge progress and identify disengaged clients.

**Why this priority**: Extends celebration value to the practice relationship — advisors can congratulate clients and spot those falling behind.

**Acceptance Scenarios**:

1. **Given** a practice manager viewing their client list, **When** a client workspace hits an "All Clear" or streak milestone, **Then** a small celebration indicator (badge icon, flame) appears on that client's card.
2. **Given** a practice manager viewing a client's health card, **When** the client recently earned a badge, **Then** the most recent badge is shown with "Earned 2 days ago."

---

### Edge Cases

- What happens when a celebration fires during a page navigation? The celebration is cancelled — never shown on a page the user has already left.
- What happens when two milestones are hit simultaneously (e.g., All Clear + streak milestone)? The higher-tier celebration fires with both achievements stacked (badge unlock shown within the All Clear overlay).
- What happens on mobile / small screens? Full-screen celebrations scale down to a centered card with reduced confetti particle count.
- What happens when a user clears a queue but another item arrives within seconds (e.g., bank feed sync)? The celebration fires based on the moment of clearance. If new items arrive after, they don't retroactively cancel the celebration.
- What happens during a free trial? Full celebration system is available — gamification is not tier-gated.
- What happens if the user is on a slow connection? Confetti is CSS/canvas-based (no network requests). The celebration overlay renders immediately from local state.

## Requirements

### Functional Requirements

**Celebration Trigger System**
- **FR-001**: System MUST support two celebration tiers: Moment (toast, 4-second auto-dismiss) and Milestone (full-screen overlay with confetti and ring animation, manual dismiss).
- **FR-002**: System MUST trigger Milestone celebrations for: queue fully cleared (reconciliation, intray, overdue invoices), streak milestones (4, 12, 26, 52 weeks), and first-time setup completions (Chart of Accounts configured, first bank connected).
- **FR-003**: System MUST trigger Moment celebrations for: streak maintained (weekly), first journal entry posted, first invoice sent, first bank reconciliation completed.
- **FR-004**: System MUST prevent duplicate celebrations for the same milestone within the same session.
- **FR-005**: System MUST stack simultaneous achievements into a single celebration (e.g., All Clear + badge unlock shown together).

**Celebration Visuals**
- **FR-006**: Milestone celebrations MUST include: confetti particle burst, a progress ring completing to 100%, achievement title and description, session stats (items cleared, time, streak length), and an optional badge unlock card.
- **FR-007**: Moment celebrations MUST include: an icon, achievement title, brief description, and auto-dismiss after 4 seconds.
- **FR-008**: Celebrations MUST be dismissable via Escape key, clicking outside the overlay, or the dismiss button.
- **FR-009**: The progress ring MUST be the universal visual symbol across all celebration types — a ring completing represents achievement.

**User Preferences**
- **FR-010**: System MUST allow users to set celebration preference: Full (default), Minimal (toasts only), or Off (no visuals, achievements still recorded).
- **FR-011**: System MUST persist celebration preference per user across sessions.
- **FR-012**: System MUST continue recording achievements and awarding badges regardless of celebration display preference.

**Achievement History**
- **FR-013**: System MUST maintain a chronological record of all achievements per user.
- **FR-014**: System MUST display earned badges in a grid format accessible from the user's profile area.
- **FR-015**: System MUST show upcoming (unearned) milestones as motivation for users with few achievements.

**Cross-Context Integration**
- **FR-016**: Celebrations MUST fire in all application contexts: workspace dashboard, intray, bank reconciliation, invoice list, and practice dashboard.
- **FR-017**: Queue-cleared celebrations MUST include a running "All Clear" count for the current month ("3rd All Clear this month!").
- **FR-018**: Streak milestone celebrations MUST scale in visual impressiveness with streak length (4 weeks = standard, 52 weeks = premium animation).

### Key Entities

- **Achievement Event**: A recorded milestone occurrence. Has a user, workspace (optional), event type (all_clear, streak_milestone, first_time, setup_complete), payload (context data), and timestamp.
- **Badge**: A visual award earned at milestone thresholds. Has a name, description, icon, tier (bronze, silver, gold, platinum), source type, and date earned.
- **Celebration Preference**: A user-level setting controlling celebration display (full, minimal, off). Persisted across sessions.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 70% of users who trigger an "All Clear" celebration return to clear the same queue again within 7 days.
- **SC-002**: Users who see setup completion celebrations have a 25% higher onboarding completion rate than those who don't.
- **SC-003**: Less than 5% of users disable celebrations entirely within the first 3 months.
- **SC-004**: Average time-to-dismiss for Milestone celebrations is 2-5 seconds (users are engaging, not immediately closing).
- **SC-005**: Users with streak milestone celebrations have 30% longer average streak lengths than users before the feature launched.
