---
title: "Feature Specification: Scenario Planning Engine"
---

# Feature Specification: Scenario Planning Engine

**Feature Branch**: `068-scenario-planning-engine`
**Created**: 2026-03-22
**Status**: Draft
**Input**: Multi-variable financial modelling tool that lets users create named scenarios to model different financial futures across 1-20 year horizons.

---

## User Scenarios & Testing

### User Story 1 — Create a Named Scenario (Priority: P1)

As a business owner or accountant, I want to create a named scenario with adjustable financial variables so I can model a possible future for my business or personal finances.

**Why this priority**: Without scenario creation, there is no product. This is the foundational capability that every other story depends on.

**Independent Test**: Can be fully tested by creating a scenario, naming it, setting variables, and verifying the baseline financial snapshot is captured from real ledger data.

**Acceptance Scenarios**:

1. **Given** a workspace with 6+ months of posted journal entries, **When** I click "New Scenario" and enter a name, **Then** the system captures a baseline snapshot of my current financial position (assets, liabilities, revenue, expenses, cash) from real ledger data.

2. **Given** the scenario builder form, **When** I adjust the revenue growth slider to +15%, **Then** the numeric input beside the slider updates to 15% and the value is stored against the scenario.

3. **Given** the scenario builder with all 5 variables set, **When** I select a 10-year time horizon and click "Project", **Then** the system calculates a year-by-year projection and displays a line chart showing net worth, cash, revenue, and expenses over 10 years.

4. **Given** a workspace with fewer than 180 days of posted entries, **When** I create a new scenario, **Then** the system shows an informational banner: "This scenario is based on limited data. Add 6+ months of transactions for more accurate baselines."

5. **Given** a scenario with a Budget baseline source selected, **When** the projection runs, **Then** revenue and expense starting figures come from the active budget rather than trailing 12-month actuals.

---

### User Story 2 — View Projection Results (Priority: P1)

As a user who has created a scenario, I want to see a clear projection of my future financial position so I can understand the impact of my assumptions.

**Why this priority**: The projection output is the core value of the feature. Without results, scenario creation is meaningless.

**Independent Test**: Can be tested by opening a scenario with cached projections and verifying the chart and summary table render correctly.

**Acceptance Scenarios**:

1. **Given** a scenario with a completed projection, **When** I open the scenario detail page, **Then** I see a line chart with year-by-year projections and a summary table showing key metrics at year 0, 5, 10, and final year.

2. **Given** the projection chart, **When** I toggle series visibility (net worth, cash, revenue, expenses), **Then** the corresponding line appears or disappears from the chart.

3. **Given** a projected scenario, **When** I hover over a data point on the chart, **Then** a tooltip shows the exact values for that year across all visible metrics.

4. **Given** a scenario where projections show cash going negative, **Then** the chart highlights the crossover point and the summary table shows the year when cash is projected to run out.

5. **Given** the projection summary table, **Then** all monetary values are displayed using the workspace's currency format with proper thousand separators.

---

### User Story 3 — Compare Scenarios Side-by-Side (Priority: P1)

As an accountant advising a client, I want to compare up to 3 scenarios side-by-side so I can show the client how different assumptions lead to different outcomes.

**Why this priority**: Comparison is what transforms scenarios from a toy into a planning tool. It is the primary value proposition for advisory practices.

**Independent Test**: Can be tested by creating 2-3 scenarios with different variables, selecting them for comparison, and verifying the overlay chart and comparison table render correctly.

**Acceptance Scenarios**:

1. **Given** 2-3 scenarios selected from the scenario list via checkboxes, **When** I click "Compare", **Then** I am taken to a comparison page showing an overlay chart with one line per scenario in distinct colours.

2. **Given** the comparison page, **When** I switch the outcome metric selector from "Net Worth" to "Cash", **Then** the overlay chart updates to show cash projections for all selected scenarios.

3. **Given** the comparison page, **Then** a side-by-side summary table is shown with scenario names as columns and metrics (net worth, cash, revenue, expenses, assets, liabilities) as rows, showing values at the final projected year.

4. **Given** the comparison page URL, **Then** the URL includes scenario IDs as query parameters so it can be bookmarked and shared.

---

### User Story 4 — Sensitivity Analysis (Priority: P2)

As a business owner, I want to see which variable has the biggest impact on my outcome so I can focus my strategy on what matters most.

**Why this priority**: Sensitivity analysis adds decision-making power beyond raw projections. It answers "where should I focus?" — a high-value advisory insight.

**Independent Test**: Can be tested by opening a scenario's tornado chart and verifying variables are ranked by impact magnitude.

**Acceptance Scenarios**:

1. **Given** a scenario with a completed projection, **When** I view the sensitivity analysis section, **Then** a tornado chart shows each variable as a horizontal bar, sorted by total impact spread (most impactful at top).

2. **Given** the tornado chart, **Then** each bar extends left (variable decreased) and right (variable increased) from the centre value, showing the projected outcome at each extreme.

3. **Given** a scenario where revenue growth has 3x more impact than interest rate on net worth, **Then** the revenue growth bar is visually wider than the interest rate bar and appears higher in the chart.

4. **Given** the tornado chart, **When** I hover over a bar, **Then** a tooltip shows the exact projected outcome values for the low, centre, and high cases.

---

### User Story 5 — Manage Scenario Lifecycle (Priority: P2)

As a user with multiple scenarios, I want to organise them by status so I can keep my active plans separate from archived experiments.

**Why this priority**: Without lifecycle management, the scenario list becomes cluttered as users create and abandon scenarios over time.

**Independent Test**: Can be tested by creating scenarios, changing their statuses, and verifying the status tabs filter correctly.

**Acceptance Scenarios**:

1. **Given** the scenario list page, **Then** StatusTabs show "Draft", "Active", and "Archived" with counts for each status.

2. **Given** a draft scenario, **When** I click "Activate", **Then** the scenario status changes to Active and the counts update.

3. **Given** an active scenario, **When** I click "Archive", **Then** the scenario moves to the Archived tab and is no longer shown in the Active list.

4. **Given** the scenario list, **When** I click "Duplicate" on an existing scenario, **Then** a new draft scenario is created with the same variables but a fresh baseline snapshot from current data, named "[Original Name] (Copy)".

5. **Given** a scenario I created, **When** I click "Delete", **Then** the scenario is permanently removed after a confirmation prompt.

---

### User Story 6 — Auto-Generated Base Case (Priority: P2)

As a new user exploring scenario planning, I want the system to automatically create a "Base Case" scenario so I have a starting point to compare against.

**Why this priority**: Reduces friction for first-time users. The base case gives immediate value without requiring the user to understand variable adjustment.

**Independent Test**: Can be tested by navigating to the scenario list in a workspace that has never used scenarios and verifying a Base Case exists.

**Acceptance Scenarios**:

1. **Given** a workspace with no existing scenarios, **When** I visit the scenarios page for the first time, **Then** a "Base Case" scenario is auto-created with all variables set to 0% (no change from current trajectory) and a 10-year horizon.

2. **Given** the auto-generated Base Case, **Then** it is marked with a "Base Case" badge and cannot be deleted (only archived).

3. **Given** the Base Case exists, **When** I create a new scenario, **Then** the Base Case is automatically included as a comparison option.

---

### User Story 7 — Goal Overlay on Projections (Priority: P3)

As a user who has set financial goals, I want to see my goals overlaid on scenario projections so I can see whether a scenario gets me to my target.

**Why this priority**: Connecting scenarios to goals creates a feedback loop between planning and progress tracking. Deferred to P3 because it requires existing goals to be set up.

**Independent Test**: Can be tested by creating a scenario in a workspace that has active goals and verifying goal lines appear on the projection chart.

**Acceptance Scenarios**:

1. **Given** a workspace with a "Net Worth $2M by 2030" goal, **When** I view a scenario projection chart, **Then** a dashed horizontal line appears at the $2M mark with a label showing the goal name and target year.

2. **Given** a scenario projection that crosses a goal line, **Then** the intersection point is highlighted and the summary states "Goal achievable in Year X under this scenario."

3. **Given** a scenario projection that falls short of a goal, **Then** the summary states "Goal not reached — projected shortfall of $X at target date."

---

### User Story 8 — Dashboard Widget (Priority: P3)

As a business owner, I want a dashboard widget showing my active scenarios so I can see my planning at a glance without navigating to the full scenarios page.

**Why this priority**: Dashboard integration increases visibility and daily engagement with scenario planning. Lower priority because the full page must exist first.

**Independent Test**: Can be tested by adding the widget to a dashboard and verifying it shows active scenario summaries.

**Acceptance Scenarios**:

1. **Given** the dashboard widget catalogue, **Then** a "Scenario Outlook" widget is available for selection.

2. **Given** the widget is on my dashboard and I have active scenarios, **Then** the widget shows a mini projection chart of my most recently active scenario with the projected net worth at the final year.

3. **Given** the widget, **When** I click it, **Then** I am navigated to the full scenario detail page.

---

### Edge Cases

- **What happens when a workspace has zero financial data?** The user can still create a scenario — the baseline shows zeroes and projections are based purely on variable inputs. The informational banner guides the user to add data.
- **What happens when a user changes variables on an existing scenario?** The projection cache is invalidated and recalculated on the next view.
- **What happens when the underlying ledger data changes after a scenario was created?** The baseline snapshot is frozen — it does not update. The user can duplicate the scenario to get a fresh baseline.
- **What happens if a user tries to compare more than 3 scenarios?** The UI limits checkbox selection to 3 and disables further checkboxes with a tooltip: "Compare up to 3 scenarios at a time."
- **What happens when a scenario has no projection yet (draft, never projected)?** The scenario detail page shows the variable form without a chart, and a "Run Projection" button.

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to create, name, duplicate, and delete scenarios within a workspace.
- **FR-002**: System MUST capture a baseline financial snapshot at scenario creation time, including total assets, liabilities, equity, revenue run-rate, expense run-rate, and cash balance from real ledger data.
- **FR-003**: System MUST support 5 adjustable variables: revenue growth %, expense growth %, interest rate %, inflation rate %, and asset appreciation %.
- **FR-004**: System MUST allow users to select a time horizon of 1, 5, 10, or 20 years for projections.
- **FR-005**: System MUST calculate year-by-year deterministic projections using compound annual growth applied to the baseline snapshot.
- **FR-006**: System MUST support both "Actual" (trailing 12-month) and "Budget" baselines when creating a scenario.
- **FR-007**: System MUST allow users to compare up to 3 scenarios side-by-side with an overlay chart and summary table.
- **FR-008**: System MUST calculate sensitivity analysis for each variable and display results as a tornado chart ranked by impact magnitude.
- **FR-009**: System MUST support three scenario statuses: Draft, Active, and Archived, with StatusTabs and counts on the list page.
- **FR-010**: System MUST auto-generate a "Base Case" scenario (all variables at 0%, 10-year horizon) when a workspace first accesses the scenarios page.
- **FR-011**: System MUST cache projection results and invalidate the cache when variables or time horizon change.
- **FR-012**: System MUST display active goals as overlay lines on projection charts, showing whether the scenario achieves or falls short of each goal.
- **FR-013**: System MUST provide a dashboard widget showing the most recently active scenario's summary projection.
- **FR-014**: System MUST restrict scenario creation to users with the appropriate permission (owners and accountants) while allowing all workspace roles to view scenarios.
- **FR-015**: System MUST display all monetary values as formatted currency with proper separators, consistent with the workspace's currency settings.
- **FR-016**: System MUST support both business and personal ledger entity types, with appropriate label variations (e.g., "Revenue" vs "Income").
- **FR-017**: System MUST show an informational banner when a workspace has fewer than 180 days of posted entries.
- **FR-018**: System MUST support keyboard shortcuts for navigation, creation, and comparison consistent with the application's keyboard-first UX conventions.
- **FR-019**: System MUST provide a bookmarkable comparison URL that includes scenario identifiers as query parameters.

### Key Entities

- **Scenario**: A named financial projection model belonging to a workspace. Contains a frozen baseline snapshot, adjustable variables, time horizon, status (draft/active/archived), and cached projection results. Created by a user with appropriate permissions.
- **Baseline Snapshot**: A point-in-time capture of the workspace's financial position (assets, liabilities, equity, revenue, expenses, cash, asset category breakdown). Frozen at scenario creation — does not update when ledger data changes.
- **Variable Set**: The collection of adjustable parameters (revenue growth, expense growth, interest rate, inflation rate, asset appreciation) with values and units. Extensible schema for future modules.
- **Projection Cache**: The calculated year-by-year time series plus sensitivity analysis data. Invalidated when variables change, recalculated on demand.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can create a scenario, set variables, and view projections in under 2 minutes.
- **SC-002**: Projection calculations complete and display results within 3 seconds of the user clicking "Project".
- **SC-003**: Scenario comparison page loads and renders overlay charts for 3 scenarios within 2 seconds.
- **SC-004**: At least 50% of workspaces on Professional/Enterprise tiers create a scenario within 30 days of feature launch.
- **SC-005**: Users who create scenarios have 20%+ higher 90-day retention than those who don't.
- **SC-006**: Sensitivity tornado chart correctly ranks variables by impact in 100% of test cases against manually calculated projections.
- **SC-007**: 80%+ of surveyed accountants rate the scenario comparison feature as "useful" or "very useful" for client advisory.
