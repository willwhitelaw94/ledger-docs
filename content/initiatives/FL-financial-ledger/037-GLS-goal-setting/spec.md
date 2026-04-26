---
title: "Feature Specification: Goal Setting & Financial Targets"
---

# Feature Specification: Goal Setting & Financial Targets

**Feature Branch**: `037-GLS-goal-setting`
**Created**: 2026-03-17
**Status**: Draft

## Overview

Users need a way to set, track, and measure progress toward financial goals at three distinct levels:

1. **User-level goals** — personal targets that span across workspaces (e.g., "grow my net worth to $2M"). These belong to the user, not any single workspace, and aggregate data from all workspaces the user has access to. Visible on the `/home` page.
2. **Workspace-level goals** — business targets within a single workspace (e.g., "$500K revenue this FY"). These track against a single workspace's ledger data. Visible on the workspace dashboard.
3. **Group-level goals** — family or group targets that aggregate across all workspaces in a group (e.g., "family net worth to $5M", "reduce total group debt by 20%"). Visible on the group dashboard.

Today, users can see their numbers in reports and dashboards, but there's no way to say "I want to hit $500K revenue this year" and track progress toward it. Goals bridge the gap between looking at numbers and acting on them. They turn passive reporting into active financial management. Goals integrate with the existing dashboard, budgets, and gamification (036-GMF) to create a cohesive motivation loop.

## User Scenarios & Testing

### User Story 1 — Create a Workspace Goal (Priority: P1)

A business owner wants to set a specific financial target for their workspace so they can track whether their business is on pace to hit it.

**Why this priority**: Creating goals is the foundation — without it, nothing else works.

**Independent Test**: Can be fully tested by creating a goal, setting a target amount and deadline, and seeing it appear on the goals page.

**Acceptance Scenarios**:

1. **Given** a user on the workspace Goals page, **When** they click "New Goal", **Then** they can select a goal type (revenue, expense, profit, savings, debt, custom), set a target amount, and choose a deadline.
2. **Given** a user creating a revenue goal, **When** they set a target of $500,000 by end of financial year, **Then** the goal is saved with scope `workspace` and immediately shows current progress based on actual revenue.
3. **Given** a user creating a goal, **When** they optionally link it to a specific account or account group, **Then** progress is tracked against that specific account's balance or activity.
4. **Given** a user creating a goal, **When** they select a time horizon (monthly, quarterly, annually, custom date), **Then** the deadline and pacing calculations adjust accordingly.

---

### User Story 2 — Track Workspace Goal Progress on Dashboard (Priority: P1)

A business owner wants to see at a glance how they're tracking against their workspace goals without navigating away from the dashboard.

**Why this priority**: Goals that aren't visible are goals that get forgotten. Dashboard presence is critical for daily engagement.

**Independent Test**: Can be tested by creating a workspace goal and verifying it appears as a widget on the workspace dashboard with correct progress calculations.

**Acceptance Scenarios**:

1. **Given** a user with 3 active workspace goals, **When** they view their workspace dashboard, **Then** a goals widget shows each goal with a progress bar, current value, target value, and pace indicator (ahead/behind/on track).
2. **Given** a revenue goal of $500K with $300K achieved halfway through the year, **When** the dashboard renders, **Then** the pace indicator shows "Ahead" (60% complete at 50% of time elapsed).
3. **Given** a goal with no activity yet, **When** the dashboard renders, **Then** the goal shows 0% progress with the full target amount remaining.
4. **Given** a user who prefers a minimal dashboard, **When** they hide the goals widget, **Then** it stays hidden until they re-enable it.

---

### User Story 3 — Goal Pacing and Projections (Priority: P1)

A bookkeeper wants to know whether the business is on track to hit a goal based on current trends, not just where they are today. Applies to goals at all scopes.

**Why this priority**: Knowing you're at 40% doesn't help unless you know whether 40% is good or bad for this point in time. Pacing turns raw numbers into actionable insight.

**Independent Test**: Can be tested by creating a goal, recording some activity, and verifying the projected end value and pace status are calculated correctly.

**Acceptance Scenarios**:

1. **Given** a quarterly revenue goal of $100K with $40K achieved in the first month, **When** the user views the goal detail, **Then** a projected end value of $120K is shown based on current run rate.
2. **Given** a goal that is behind pace, **When** the user views it, **Then** the required run rate to catch up is displayed (e.g., "Need $15K/week to hit target").
3. **Given** a goal with seasonal data from the previous year, **When** projections are calculated, **Then** the system uses historical seasonal patterns rather than simple linear extrapolation. [NEEDS CLARIFICATION: Should projections use prior-year seasonality, or is linear extrapolation sufficient for v1?]
4. **Given** a goal's detail page, **When** the user views the progress chart, **Then** a line chart shows actual progress vs. the ideal pace line over time.

---

### User Story 4 — Goal Categories and Templates (Priority: P2)

A sole trader wants to quickly set common goals without configuring everything from scratch, using pre-built templates relevant to their business type.

**Why this priority**: Reduces friction for goal creation. Templates encode best-practice targets for common business types.

**Independent Test**: Can be tested by selecting a goal template and verifying it pre-fills sensible defaults.

**Acceptance Scenarios**:

1. **Given** a user creating a new workspace goal, **When** they browse templates, **Then** they see categories: Revenue Growth, Cost Reduction, Profitability, Cash Flow, Debt Reduction, Savings.
2. **Given** a user selecting the "Revenue Growth" template, **When** they apply it, **Then** the goal is pre-filled with a 10% increase over last year's revenue, linked to revenue accounts, with a financial year deadline.
3. **Given** a user selecting a template, **When** they customise the pre-filled values, **Then** the changes are saved (templates are starting points, not locked).
4. **Given** a personal ledger workspace, **When** the user browses templates, **Then** they see personal finance templates: Emergency Fund, Net Worth Target, Debt Payoff, Savings Goal.
5. **Given** a user creating a user-level goal, **When** they browse templates, **Then** they see cross-workspace personal templates: Total Net Worth, Total Savings, Total Debt Reduction.
6. **Given** a group manager creating a group-level goal, **When** they browse templates, **Then** they see group templates: Group Net Worth, Group Revenue, Group Debt Reduction, Group Cash Reserves.

---

### User Story 5 — Goal Milestones and Checkpoints (Priority: P2)

A business owner wants to break a large annual goal into smaller milestones so progress feels achievable and they can course-correct early.

**Why this priority**: A $500K annual goal feels abstract. Monthly or quarterly milestones of $42K make it tangible and actionable.

**Independent Test**: Can be tested by creating a goal with milestones and verifying milestone completion triggers celebrations.

**Acceptance Scenarios**:

1. **Given** a user creating an annual goal (at any scope), **When** they enable milestones, **Then** the system auto-generates quarterly or monthly checkpoints based on the target and pacing.
2. **Given** a milestone of $125K by end of Q1, **When** actual revenue reaches $125K, **Then** the milestone is marked complete with a celebration notification.
3. **Given** a missed milestone, **When** the checkpoint date passes with the target not met, **Then** the user is notified with the shortfall amount and an adjusted pace for remaining milestones.
4. **Given** milestones on a goal, **When** the user views the goal detail chart, **Then** milestones appear as markers on the progress timeline.

---

### User Story 6 — Compare Workspace Goals to Budgets (Priority: P2)

An accountant wants to see how workspace financial goals align with the existing budget, identifying gaps between aspirational targets and planned spending.

**Why this priority**: Goals and budgets are complementary — goals are aspirational, budgets are operational. Showing the gap is valuable for planning.

**Independent Test**: Can be tested by creating a goal linked to an account that also has a budget, and verifying the comparison view shows both.

**Acceptance Scenarios**:

1. **Given** a revenue goal of $500K and a revenue budget of $400K for the same period, **When** the user views the goal detail, **Then** a comparison shows the $100K gap between the goal and the budget.
2. **Given** a goal linked to an expense account with a budget, **When** the user views both, **Then** actual spend is shown against both the budget line and the goal target.
3. **Given** a goal with no corresponding budget, **When** the user views the goal, **Then** a prompt suggests creating a budget to support the goal.

---

### User Story 7 — Goal Sharing and Accountability (Priority: P3)

A business owner working with their accountant wants to share workspace goals so both parties can track progress and discuss strategy during reviews.

**Why this priority**: Shared visibility creates accountability, but is not essential for individual goal tracking.

**Independent Test**: Can be tested by creating a goal and verifying it's visible to other workspace users with appropriate permissions.

**Acceptance Scenarios**:

1. **Given** a workspace with multiple users, **When** an owner creates a workspace goal, **Then** users with accountant or bookkeeper roles can also view it.
2. **Given** a practice manager viewing a client workspace, **When** the client has active goals, **Then** the practice manager can see goal progress in the client overview.
3. **Given** a goal that is significantly behind pace, **When** a practice manager views their client portfolio, **Then** at-risk goals are flagged across all client workspaces.

---

### User Story 8 — Goal History and Reflection (Priority: P3)

A business owner wants to look back at past goals to see which ones they hit, missed, and how their ambitions have evolved over time.

**Why this priority**: Historical context helps users set more realistic future goals and celebrate past achievements.

**Independent Test**: Can be tested by completing or expiring a goal and verifying it appears in the goals archive with final results.

**Acceptance Scenarios**:

1. **Given** a goal whose deadline has passed, **When** the user views the Goals page, **Then** it moves to a "Completed" or "Expired" section showing final achievement vs. target.
2. **Given** a completed goal that exceeded its target, **When** the user views it, **Then** a "Goal Exceeded" badge is shown with the overshoot percentage.
3. **Given** multiple past goals, **When** the user views goal history, **Then** they can see a year-over-year trend of goals set vs. goals achieved.

---

### User Story 9 — Create a User-Level Goal (Priority: P1)

A user with multiple workspaces (e.g., a sole trader with a business entity and a personal entity) wants to set a personal financial target that aggregates across all their workspaces — visible on the `/home` page, not tied to any single workspace.

**Why this priority**: User-level goals are the primary motivational surface for the `/home` page. Users think about their total financial picture, not just one entity at a time.

**Independent Test**: Can be tested by creating a user-level goal, verifying it aggregates balances from multiple workspaces, and confirming it appears on the `/home` page.

**Acceptance Scenarios**:

1. **Given** a user on the `/home` page, **When** they click "New Goal", **Then** they can create a goal with scope `user` and select a type: Net Worth, Total Savings, Total Debt Reduction, Total Income, or Custom.
2. **Given** a user with 3 workspaces, **When** they create a "Net Worth to $2M" goal, **Then** the system aggregates total assets minus total liabilities across all workspaces the user has access to and shows current progress.
3. **Given** a user-level goal, **When** the user views the `/home` page, **Then** the goal appears in a goals widget with progress bar, current aggregated value, target, and pace indicator.
4. **Given** a user-level goal, **When** the user adds or removes a workspace, **Then** the aggregated progress recalculates to include/exclude the changed workspace.
5. **Given** a user creating a user-level goal, **When** they optionally select specific workspaces to include (instead of all), **Then** progress is tracked only against the selected workspaces.
6. **Given** workspaces with different currencies, **When** a user-level goal aggregates across them, **Then** amounts are converted to the user's preferred currency using current exchange rates, with a note showing the conversion.

---

### User Story 10 — Track User-Level Goals on /home (Priority: P1)

A user wants their personal financial goals to be the centrepiece of the `/home` page, giving them a single view of their total financial trajectory.

**Why this priority**: The `/home` page is the first thing users see. User-level goals make it a motivational dashboard rather than just a workspace picker.

**Independent Test**: Can be tested by creating multiple user-level goals and verifying they render correctly on `/home` with accurate cross-workspace aggregation.

**Acceptance Scenarios**:

1. **Given** a user with 2 active user-level goals, **When** they load the `/home` page, **Then** each goal is displayed with a progress ring or bar, current aggregated value, target, pace, and projected completion.
2. **Given** a "Total Savings to $100K" goal, **When** the user's savings accounts across workspaces total $65K, **Then** the goal shows 65% progress with the correct pace indicator.
3. **Given** a user with no user-level goals, **When** they visit `/home`, **Then** a prompt encourages them to set their first personal financial goal with suggested templates.
4. **Given** a user-level goal, **When** they click on it from `/home`, **Then** a detail view shows the breakdown by workspace — how much each workspace contributes to the total.

---

### User Story 11 — Create a Group-Level Goal (Priority: P2)

A group manager (e.g., a parent managing a family group) wants to set financial targets that aggregate across all workspaces in the group — visible on the group dashboard.

**Why this priority**: Group goals enable families and business groups to track collective financial health. This extends the group dashboard from passive reporting to active target-setting.

**Independent Test**: Can be tested by creating a group-level goal, verifying it aggregates from group workspaces, and confirming it appears on the group dashboard.

**Acceptance Scenarios**:

1. **Given** a group manager on the group dashboard, **When** they click "New Goal", **Then** they can create a goal with scope `group`, selecting a type: Group Net Worth, Group Revenue, Group Debt Reduction, Group Cash Reserves, or Custom.
2. **Given** a family group with 4 workspaces, **When** a manager creates a "Family Net Worth to $5M" goal, **Then** the system aggregates total assets minus total liabilities across all workspaces in the group and shows current progress.
3. **Given** a group goal "Reduce Total Group Debt by 20%", **When** the goal is created, **Then** the system captures the baseline debt at creation time and tracks the percentage reduction from that baseline.
4. **Given** a group-level goal, **When** a new workspace is added to the group, **Then** the aggregated progress recalculates to include the new workspace.
5. **Given** a group-level goal, **When** a workspace is removed from the group, **Then** the progress recalculates to exclude it, with an audit note recording the change.

---

### User Story 12 — Track Group Goals on Group Dashboard (Priority: P2)

A group manager wants to see group-level goal progress on the group dashboard, giving the family or business group a shared sense of financial direction.

**Why this priority**: Group dashboards need actionable content beyond read-only aggregated reports. Goals make the group dashboard a management tool.

**Independent Test**: Can be tested by creating group goals and verifying they render on the group dashboard with correct aggregation.

**Acceptance Scenarios**:

1. **Given** a group with 3 active goals, **When** the group manager views the group dashboard, **Then** a goals widget shows each goal with progress, target, and pace indicator.
2. **Given** a group goal, **When** the manager clicks on it, **Then** a detail view shows the per-workspace breakdown — each workspace's contribution to the group total.
3. **Given** a group goal, **When** a group viewer (non-manager) visits the group dashboard, **Then** they can see goal progress but cannot create or edit goals.
4. **Given** group workspaces with different currencies, **When** a group goal aggregates across them, **Then** amounts are converted to the group's base currency using current exchange rates.

---

### User Story 13 — Group Goal Visibility for Practice Managers (Priority: P3)

A practice manager advising a family group wants to monitor group-level goals alongside individual workspace goals to provide holistic financial advice.

**Why this priority**: Practice managers already see individual workspace goals (Story 7). Group goals extend this to the consolidated view they use for family advisory.

**Independent Test**: Can be tested by verifying a practice manager connected to a group can see group goals in their practice dashboard.

**Acceptance Scenarios**:

1. **Given** a practice manager connected to a family group, **When** they view the group in their practice dashboard, **Then** group-level goals are visible with progress and pace.
2. **Given** a group goal that is significantly behind pace, **When** the practice manager views their portfolio, **Then** the at-risk group goal is flagged alongside at-risk workspace goals.
3. **Given** a practice manager, **When** they view a client's group goals, **Then** they can add comments or notes but cannot modify the goal targets (only group managers can).

---

### Edge Cases

- What happens when the linked account is deleted or archived? The goal continues tracking with a warning that the source account is no longer active.
- What happens when the workspace currency changes? Goals retain their original currency; a note shows the currency mismatch.
- What happens when a goal's deadline is in the past at creation? The system rejects it and asks for a future date.
- What happens with goals in a personal ledger workspace? Goal types shift to personal finance focus (net worth, savings, debt payoff) rather than business metrics.
- What happens when the financial year changes mid-goal? Goals aligned to "financial year" automatically adjust to the new year-end date.
- What happens when a user loses access to a workspace? User-level goals recalculate excluding that workspace. A history note records the change with the last known contribution.
- What happens when a workspace is removed from a group? Group-level goals recalculate excluding that workspace. An audit note records the removal and the workspace's last known contribution.
- What happens when workspaces in a user-level or group-level goal have different currencies? Amounts are converted to the goal's target currency using the latest available exchange rates. The goal detail shows a currency breakdown.
- What happens when a group is deleted? Group-level goals are archived with their final progress snapshot. They cannot be edited but remain visible in goal history.
- What happens when a user-level goal exists but the user has only one workspace? The goal still works — it simply tracks that single workspace. If more workspaces are added later, aggregation begins automatically.

## Requirements

### Functional Requirements

#### Goal Scoping

- **FR-001**: System MUST support three goal scopes: `user` (cross-workspace personal), `workspace` (single workspace), and `group` (cross-workspace group aggregate).
- **FR-002**: User-level goals MUST belong to a user (not a workspace) and aggregate data from all workspaces the user has access to, or a user-selected subset.
- **FR-003**: Workspace-level goals MUST belong to a workspace and track against that workspace's ledger data only.
- **FR-004**: Group-level goals MUST belong to a group and aggregate data from all workspaces within the group.

#### Goal Creation

- **FR-005**: System MUST allow users to create goals with a name, scope, type (revenue, expense, profit, savings, debt, net worth, custom), target amount, and deadline.
- **FR-006**: System MUST calculate goal progress automatically from actual ledger data (account balances, transaction totals) without manual input.
- **FR-007**: System MUST support linking workspace-level goals to specific chart accounts or account groups for targeted tracking.
- **FR-008**: System MUST support percentage-based targets (e.g., "reduce debt by 20%") by capturing a baseline value at goal creation time.

#### Pacing and Projections

- **FR-009**: System MUST display pace indicators (ahead, on track, behind) based on elapsed time vs. progress percentage.
- **FR-010**: System MUST show projected end values based on current run rate.
- **FR-011**: System MUST auto-generate milestones (monthly or quarterly checkpoints) when enabled on a goal.

#### Templates

- **FR-012**: System MUST provide goal templates with sensible defaults for common business and personal finance goals.
- **FR-013**: System MUST provide user-level goal templates (Total Net Worth, Total Savings, Total Debt Reduction).
- **FR-014**: System MUST provide group-level goal templates (Group Net Worth, Group Revenue, Group Debt Reduction, Group Cash Reserves).

#### Display and Dashboards

- **FR-015**: System MUST display workspace-level goal progress as a widget on the workspace dashboard.
- **FR-016**: System MUST display user-level goal progress on the `/home` page.
- **FR-017**: System MUST display group-level goal progress on the group dashboard.
- **FR-018**: System MUST show per-workspace breakdowns on user-level and group-level goal detail views.

#### Multi-Currency

- **FR-019**: User-level and group-level goals that aggregate across workspaces with different currencies MUST convert amounts to a single target currency using current exchange rates.

#### Lifecycle and History

- **FR-020**: System MUST archive goals when their deadline passes, preserving the final achievement for historical comparison.
- **FR-021**: System MUST notify users when milestones are reached or missed.
- **FR-022**: System MUST show goal-to-budget comparison when both exist for the same account and period (workspace-level goals only).

#### Visibility and Permissions

- **FR-023**: Workspace-level goals MUST be visible to all workspace users with view permissions (not just the creator).
- **FR-024**: Group-level goals MUST be visible to all group members. Only group managers can create or edit group goals.
- **FR-025**: User-level goals MUST be private to the user who created them.
- **FR-026**: Practice managers connected to a workspace or group MUST be able to view (but not edit) goals at the workspace and group level.

#### Aggregation Recalculation

- **FR-027**: User-level goals MUST recalculate when the user gains or loses access to workspaces.
- **FR-028**: Group-level goals MUST recalculate when workspaces are added to or removed from the group, with an audit trail of changes.

### Key Entities

- **Goal**: A financial target with a name, scope (`user`, `workspace`, `group`), type, target amount, deadline, pace status, and current progress. Scoped to a user, workspace, or group depending on scope. Can be active, completed, or expired.
- **GoalScope** (enum): `user` | `workspace` | `group` — determines ownership, aggregation strategy, and where the goal is displayed.
- **Goal Milestone**: An intermediate checkpoint within a goal, with a target amount and target date. Auto-generated or manually set.
- **Goal Template**: A pre-configured goal definition with default type, target formula (e.g., "10% above last year"), suggested deadline, and applicable scope(s).
- **Goal Progress Snapshot**: A periodic (daily) recording of goal progress for charting trends over time. For user/group goals, includes per-workspace breakdowns.
- **Goal Workspace Link**: For user-level goals with a workspace subset selection, tracks which workspaces are included. For group-level goals, derived from group membership.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 50% of active workspaces have at least one workspace-level goal set within 3 months of feature launch.
- **SC-002**: Users who set goals log in 2x more frequently than users without goals.
- **SC-003**: 70% of users who create a goal from a template complete the setup in under 60 seconds.
- **SC-004**: Goal progress calculations update within 5 minutes of a relevant transaction being posted.
- **SC-005**: 40% of goals with milestones trigger at least one milestone celebration within their first quarter.
- **SC-006**: 30% of users with multiple workspaces create at least one user-level goal within 3 months of feature launch.
- **SC-007**: 25% of groups with 2+ workspaces have at least one group-level goal set within 3 months of feature launch.
