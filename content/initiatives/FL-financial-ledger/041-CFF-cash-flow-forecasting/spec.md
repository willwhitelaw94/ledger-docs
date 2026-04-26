---
title: "Feature Specification: Cash Flow Forecasting"
---

# Feature Specification: Cash Flow Forecasting

**Feature Branch**: `041-CFF-cash-flow-forecasting`
**Created**: 2026-03-19
**Status**: Draft
**Epic**: 041-CFF
**Initiative**: FL — Financial Ledger Platform
**Effort**: L (4 sprints)
**Depends On**: 005-IAR (complete), 004-BFR (complete), 024-RPT (complete), 011-MCY (complete)

### Out of Scope

- **AI/ML-powered forecasting** — v1 uses historical averages and known commitments, not machine learning models
- **Multi-workspace consolidated forecast** — v1 forecasts per workspace only; group-level cash flow deferred to 028-CFT integration
- **Cash flow statement (indirect method)** — this is a forecast/projection tool, not an accrual-to-cash reconciliation report
- **Automatic bank balance fetching for forecast seed** — v1 uses the most recent reconciled balance; real-time balance polling deferred
- **Budget vs forecast variance** — budget comparison requires 042-BDG; forecast stands alone in v1
- **Scenario sharing/saving** — v1 scenarios are ephemeral per session, not persisted or shareable

---

## Overview

Businesses fail not because they're unprofitable but because they run out of cash. MoneyQuest has all the data needed to predict cash flow — outstanding invoices, upcoming bills, recurring templates, bank balances, and historical patterns — but currently shows only a static snapshot. This feature adds forward-looking cash flow projections: a rolling 13-week (90-day) forecast built from known commitments plus predicted patterns, updated daily, with cash shortfall warnings before they become crises.

---

## User Scenarios & Testing

### User Story 1 — View Cash Flow Forecast (Priority: P1)

A business owner wants to see a forward-looking view of their cash position over the next 90 days, based on known commitments and historical patterns. Today they have no way to answer "will I have enough cash next month?" without exporting data to a spreadsheet. The forecast page gives them a single chart that answers this question at a glance.

**Why this priority**: The forecast is the core deliverable — the reason this epic exists. Without the visualisation, all other stories (warnings, drill-down, scenarios) have no home. Every other story depends on the forecast engine being in place.

**Independent Test**: Can be tested by seeding outstanding invoices, upcoming bills, and recurring templates, then verifying the forecast chart shows expected inflows, outflows, and projected balance for each week.

**Acceptance Scenarios**:

1. **Given** a workspace with outstanding invoices, bills due, and recurring entries, **When** the user navigates to the Cash Flow Forecast page, **Then** they see a 13-week rolling chart showing projected weekly inflows (green), outflows (red), and net cash position (line).

2. **Given** an invoice for $10,000 due in 14 days, **When** the forecast renders, **Then** the $10,000 appears as a projected inflow in the corresponding week, adjusted by the contact's historical payment behaviour (e.g., average 7 days late).

3. **Given** no data exists for a workspace (no invoices, bills, recurring entries, or bank balance), **When** the forecast page loads, **Then** a helpful empty state explains what data feeds the forecast and suggests connecting a bank account or creating invoices.

4. **Given** the forecast has been generated, **When** the user returns to the page the next day, **Then** the forecast has been regenerated with updated data (daily refresh).

5. **Given** the workspace has a reconciled bank balance of $50,000, **When** the forecast renders, **Then** the starting balance for week 1 is $50,000 and each subsequent week's projected balance builds from there.

---

### User Story 2 — Cash Shortfall Warnings (Priority: P1)

A business owner wants to be proactively warned when the forecast predicts their cash balance will drop below a configurable threshold, giving them time to chase invoices, delay expenses, or arrange finance. Without warnings, the forecast is a passive report; with them, it becomes a safety net.

**Why this priority**: The forecast is useful but passive. Shortfall warnings are the actionable trigger that prevents cash crises — the difference between "I can see a problem" and "I was told about a problem in time to act."

**Independent Test**: Can be tested by setting a minimum cash threshold, seeding data that causes projected balance to dip below it, and verifying the warning appears on the forecast page and as a notification.

**Acceptance Scenarios**:

1. **Given** a user has set a minimum cash threshold of $20,000, **When** the forecast projects the balance will drop to $12,000 in week 6, **Then** a warning banner appears on the forecast page and a notification is sent: "Cash shortfall of $8,000 projected in 6 weeks."

2. **Given** a shortfall warning is active, **When** the user records a new payment that resolves the projected shortfall, **Then** the warning is automatically cleared on the next forecast regeneration.

3. **Given** no minimum threshold is configured, **When** the forecast shows a negative projected balance, **Then** a warning still appears for projected negative balances (hard floor at $0).

4. **Given** a user has configured a threshold, **When** the forecast is regenerated daily, **Then** shortfall notifications are only sent once per shortfall period (not repeated daily for the same projected shortfall).

5. **Given** a shortfall warning exists, **When** the user views the forecast chart, **Then** the shortfall zone is visually highlighted (e.g., red shading below the threshold line).

---

### User Story 3 — Forecast Data Sources Breakdown (Priority: P2)

An accountant wants to understand exactly what's driving the forecast — which invoices, bills, and recurring entries contribute to each week's projection — so they can validate the numbers and explain them to the business owner. Trust requires transparency.

**Why this priority**: Users won't act on a forecast they can't audit. The drill-down capability is what separates a credible planning tool from a black-box estimate.

**Independent Test**: Can be tested by clicking on a specific week in the forecast and verifying the drill-down shows individual contributing items with correct amounts and source types.

**Acceptance Scenarios**:

1. **Given** the forecast shows $25,000 inflow in week 3, **When** the user clicks on that week's inflow bar, **Then** a detail panel shows the individual invoices expected to be paid that week with amounts and contact names.

2. **Given** recurring entries contribute to the forecast, **When** the user views the data sources for a week, **Then** recurring items are shown with a "Recurring" badge and the template name.

3. **Given** historical pattern-based predictions contribute to a week's projection, **When** the user views the data sources, **Then** pattern-based items are shown with a "Predicted" badge and the confidence percentage.

4. **Given** bills due contribute to the forecast, **When** the user clicks on a week's outflow bar, **Then** the detail panel shows individual bills with amounts, supplier names, and due dates.

5. **Given** a forecast item links to an invoice, **When** the user clicks on that item in the detail panel, **Then** they navigate to the invoice detail page.

---

### User Story 4 — Scenario Modelling (Priority: P3)

A business owner wants to ask "what if" questions — what if a major invoice is delayed, what if we take on a new expense — and see the impact on the forecast before making decisions. Scenario modelling turns the forecast from a reporting tool into a planning tool.

**Why this priority**: Lower priority because the base forecast delivers most of the value on its own. Scenario modelling is a power-user feature that adds planning capability but is not essential for the core "will I run out of cash?" question.

**Independent Test**: Can be tested by adding a hypothetical expense, verifying the forecast adjusts, then clearing the scenario and verifying it returns to baseline.

**Acceptance Scenarios**:

1. **Given** the user is on the forecast page, **When** they click "Add scenario" and enter a hypothetical expense of $50,000 in week 4, **Then** the forecast updates to show the impact with a "Scenario" overlay distinguishable from the base forecast.

2. **Given** the user wants to model a delayed invoice, **When** they drag an expected inflow from week 2 to week 6 on the chart, **Then** the forecast recalculates with the delayed payment and both the original and new positions are visible.

3. **Given** an active scenario is applied, **When** the user clicks "Clear scenario", **Then** the forecast returns to the base projection with all scenario modifications removed.

4. **Given** a scenario causes a new shortfall, **When** the forecast recalculates with the scenario overlay, **Then** the shortfall warning appears in the scenario view (but does not trigger a notification — scenarios are hypothetical).

---

### Edge Cases

- **No invoices, bills, or recurring entries**: The forecast shows only the current bank balance as a flat line with a prompt to add data sources.
- **Foreign currency invoices/bills**: Forecasted amounts are converted to base currency at current exchange rates. An FX note indicates which items were converted and the rate used.
- **Paused recurring templates**: Excluded from the forecast entirely. Resumed templates are included from the next forecast regeneration.
- **Stale bank feed sync**: If bank feed sync is overdue by more than 48 hours, a warning badge shows that the starting balance may be stale.
- **Contact with no payment history**: When historical average days-to-pay is unavailable for a contact, the system falls back to the invoice due date (zero adjustment).
- **Voided or cancelled invoices/bills**: Excluded from the forecast. If an invoice is voided after forecast generation, the next daily regeneration removes it.
- **Partially paid invoices**: Only the remaining balance is included in the forecast, not the original amount.
- **Overdue invoices**: Included in the forecast at the current week (expected imminently) with a visual indicator showing they are past due, adjusted by the contact's historical lateness.

---

## Requirements

### Functional Requirements

**Forecast Engine**
- **FR-001**: System MUST generate a rolling 13-week (90-day) cash flow forecast updated daily via a scheduled command.
- **FR-002**: Forecast MUST incorporate: outstanding invoices (AR), upcoming bills (AP), recurring entry templates, and current bank balances as the starting position.
- **FR-003**: System MUST adjust invoice inflow timing based on the contact's historical average days-to-pay. If no history exists, fall back to the invoice due date.
- **FR-004**: System MUST exclude paused recurring templates from projections.
- **FR-005**: System MUST convert foreign currency amounts to base currency at the current exchange rate for the forecast.
- **FR-006**: System MUST only include remaining balances for partially paid invoices and bills.
- **FR-007**: Forecast MUST be regenerated daily. A manual "Refresh" action MUST also be available.

**Shortfall Warnings**
- **FR-008**: System MUST allow users to set a minimum cash threshold per workspace.
- **FR-009**: System MUST display a warning banner on the forecast page when the projected balance drops below the configured threshold.
- **FR-010**: System MUST send a notification when a new shortfall is projected, integrated with Notifications (024-NTF) and the Intray (018-ITR).
- **FR-011**: System MUST NOT send duplicate notifications for the same projected shortfall period on subsequent daily regenerations.
- **FR-012**: System MUST warn on projected negative balances even when no threshold is configured (hard floor at $0).

**Drill-Down & Transparency**
- **FR-013**: System MUST provide drill-down from each forecast week to the contributing items (invoices, bills, recurring entries, predictions).
- **FR-014**: System MUST distinguish known commitments from pattern-based predictions with visual indicators ("Known", "Recurring", "Predicted") and confidence percentages on predicted items.
- **FR-015**: Drill-down items MUST link to their source entity (invoice detail, bill detail, recurring template).

**Scenario Modelling**
- **FR-016**: System MUST support basic scenario modelling with hypothetical inflows/outflows overlaid on the base forecast.
- **FR-017**: Scenarios MUST be ephemeral (session-only, not persisted to the database).
- **FR-018**: Scenario modifications MUST NOT trigger shortfall notifications.

**Visualisation**
- **FR-019**: Forecast chart MUST show weekly inflows (green bars), outflows (red bars), and net cash position (line) for 13 weeks.
- **FR-020**: Shortfall zones MUST be visually highlighted on the chart (red shading below threshold line).
- **FR-021**: Empty state MUST explain data sources and guide the user to connect bank accounts or create invoices/bills.

### Key Entities

- **Cash Flow Forecast**: A daily-generated projection with weekly buckets containing projected inflows, outflows, and net balance. Stored per workspace. Fields: `workspace_id`, `generated_at`, `starting_balance`, `currency_code`.
- **Forecast Item**: An individual projected transaction within a forecast week. Fields: `forecast_id`, `week_number`, `source_type` (invoice, bill, recurring, predicted), `source_id` (polymorphic reference), `amount` (cents, integer), `expected_date`, `confidence_pct` (nullable, for predictions), `direction` (inflow/outflow), `contact_name`, `description`.
- **Cash Threshold**: A user-configured minimum cash balance per workspace. Fields: `workspace_id`, `minimum_balance` (cents, integer), `notify_user_id`.
- **Forecast Scenario**: A temporary (non-persisted) overlay with hypothetical items. Fields: `type` (add_item, move_item), `week_number`, `amount`, `direction`, `label`.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Forecast accuracy within +/-15% of actual cash position 4 weeks out, measured after 6 months of production use with workspaces that have 3+ months of invoicing history.
- **SC-002**: 80% of workspaces with active invoicing view the forecast page at least once per month within 3 months of launch.
- **SC-003**: Users who configure cash thresholds report zero unexpected cash shortfalls that were detectable from existing data patterns.
- **SC-004**: Forecast page loads in under 3 seconds for workspaces with up to 500 outstanding invoices/bills.
- **SC-005**: Daily forecast regeneration completes within 60 seconds per workspace.
- **SC-006**: Drill-down panel opens in under 1 second when clicking a forecast week.
- **SC-007**: All forecast amounts are accurate to the cent — inflows match sum of contributing invoice balances, outflows match sum of contributing bill balances.
- **SC-008**: Shortfall notifications are delivered within 5 minutes of the daily forecast regeneration completing.

---

## Clarifications

### Session 2026-03-19

- **Q**: How should the starting balance be determined? **A**: Use the most recent reconciled bank balance across all bank accounts in the workspace. Sum all bank account balances to get the aggregate starting position. If no bank accounts are connected, start from $0 and show a prompt to connect one.
- **Q**: Should the forecast include tax obligations (BAS/GST)? **A**: Not in v1. Tax forecasting requires integration with the BAS report and tax agent workflows. The forecast covers cash movements from invoices, bills, and recurring entries only.
- **Q**: How far back should historical payment behaviour look? **A**: 12 months of payment history per contact. If a contact has fewer than 3 paid invoices, fall back to the invoice due date (no adjustment).
- **Q**: Should the forecast be visible to all workspace roles? **A**: Visible to owner, accountant, and bookkeeper roles. Approver, auditor, and client roles do not see the forecast page (gated by a new `forecast.view` permission).
- **Q**: How should the forecast handle credit notes? **A**: Credit notes reduce the outstanding balance of invoices they are allocated against. The forecast uses the net receivable amount after credit note allocations.
- **Q**: What happens when a forecast is regenerated mid-day via the manual Refresh action? **A**: The existing forecast is replaced entirely. There is no versioning or history of past forecasts in v1.
- **Q**: Should pattern-based predictions be included in v1? **A**: V1 includes basic same-period-last-year patterns (e.g., "you typically receive $X in revenue in March based on last March"). Full seasonal/trend analysis deferred to v2.
