---
title: "Feature Specification: Budget Management"
---

# Feature Specification: Budget Management

**Feature Branch**: `029-BGT-budgets`
**Created**: 2026-03-15
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Create a Budget (Priority: P1)

An accountant or business owner wants to set financial targets for the year ahead. They create a new budget, give it a name (e.g. "FY2026 Operating Budget"), choose a cadence (monthly, quarterly, or annual), and enter figures for income and expense accounts. The budget grid shows all chart of accounts grouped by section, with editable cells for each period. They can tab between cells, fill a row across all remaining periods with one click, or type a total and have it distributed evenly.

**Why this priority**: Without the ability to create and save a budget, no other budget feature is meaningful. This is the foundation.

**Independent Test**: Can be fully tested by creating a new budget with a name, selecting monthly cadence, entering figures for at least two accounts, and verifying the budget is saved and visible in the budget list.

**Acceptance Scenarios**:

1. **Given** a workspace with a chart of accounts, **When** a user navigates to Budgets and clicks "New Budget", **Then** a form appears with a Name field, Cadence selector (Monthly / Quarterly / Annual), and a date range picker.
2. **Given** a new budget form with Monthly cadence selected, **When** the user submits the form, **Then** a budget grid opens showing all income and expense accounts as rows, with 12 editable month columns ordered from the workspace's fiscal year start month.
3. **Given** an open budget grid, **When** the user clicks a cell and types a value, **Then** the cell enters edit mode, accepts the value, and moves focus to the next cell on Tab or Enter.
4. **Given** a cell with a value entered, **When** the user clicks "Apply to all remaining months", **Then** that value is copied to all subsequent period columns in the same row.
5. **Given** a row with no values, **When** the user types an annual total into the row header and clicks "Distribute evenly", **Then** the total is divided equally across all period columns.
6. **Given** a budget with data entered, **When** the user clicks "Save Budget", **Then** the budget is persisted and appears in the budgets list with its name, fiscal year, and cadence.

---

### User Story 2 — AI-Assisted Budget Entry (Priority: P2)

Instead of filling in cells manually, a user types a natural language instruction into an AI input field — e.g. "Set revenue to $50k evenly across the year" or "Increase all expense accounts by 10% compared to last year" — and the system interprets the instruction and populates the relevant cells automatically. The user can review and adjust before saving.

**Why this priority**: This is a significant differentiator from traditional tools like Xero and is tightly integrated with the AIQ chatbot epic (021-AIQ). It dramatically reduces the time to create a budget, especially for new workspaces.

**Independent Test**: Can be tested by typing a natural language instruction for a single account row, verifying the cells are populated correctly, and confirming the user can edit the result before saving.

**Acceptance Scenarios**:

1. **Given** an open budget grid, **When** the user types "50k evenly across the year" into the AI input for a revenue account row, **Then** all 12 monthly cells are populated with approximately $4,167.
2. **Given** a workspace with prior year actuals, **When** the user types "same as last year" into the AI input, **Then** the budget grid is pre-populated with values matching the prior year's actuals for each account and period.
3. **Given** a pre-populated budget grid, **When** the user types "increase all expenses by 15%", **Then** all expense account cells are multiplied by 1.15 and updated in the grid.
4. **Given** an AI-populated budget grid, **When** the user edits individual cells manually, **Then** the manual values override the AI values and are preserved on save.
5. **Given** an ambiguous AI instruction, **When** the system cannot confidently interpret it, **Then** a clarification prompt is shown explaining what information is needed.

---

### User Story 3 — Budget vs Actuals Comparison (Priority: P2)

A business owner or accountant wants to track how actual financial performance compares to the budget. They open a saved budget and switch to "vs Actuals" view, which shows the budgeted figure, the actual ledger figure, and the variance (in dollars and percentage) for each account and period.

**Why this priority**: The comparison view transforms a static plan into an active management tool. Without it, budgets are only useful at creation time.

**Independent Test**: Can be tested independently by loading a budget with saved figures against a workspace that has posted journal entries, verifying variance figures are calculated correctly.

**Acceptance Scenarios**:

1. **Given** a saved budget with figures, **When** the user opens it and clicks "vs Actuals", **Then** each row shows three sub-columns per period: Budget, Actual, and Variance.
2. **Given** an actuals column for a period, **When** the actual figure is less than the budgeted figure for an income account, **Then** the variance is displayed in red with a negative sign.
3. **Given** an actuals column for a period, **When** the actual figure exceeds the budget for an expense account, **Then** the variance is displayed in red (over budget).
4. **Given** a budget vs actuals view, **When** the user applies a date range filter, **Then** only the selected periods are shown.
5. **Given** a budget vs actuals view, **When** the user clicks "Export", **Then** a CSV or PDF is downloaded containing all budget, actual, and variance figures.

---

### User Story 4 — Multiple Budget Scenarios (Priority: P3)

A finance team wants to maintain multiple budget versions for the same fiscal year — e.g. "FY2026 Base", "FY2026 Conservative", "FY2026 Growth" — and switch between them to compare scenarios.

**Why this priority**: Multiple scenarios are valuable for planning but not critical for the core budget workflow. A workspace can function fully with a single budget.

**Independent Test**: Can be tested by creating two budgets for the same fiscal year with different figures, and verifying both are independently viewable and editable without affecting each other.

**Acceptance Scenarios**:

1. **Given** an existing budget, **When** the user clicks "Duplicate", **Then** a copy is created with the same figures and the name suffixed with "(Copy)".
2. **Given** multiple budgets for the same fiscal year, **When** the user opens the budgets list, **Then** all budgets are listed with their name, fiscal year, cadence, and last modified date.
3. **Given** a budget vs actuals view, **When** the user switches to a different budget scenario, **Then** the variance figures update to reflect the selected budget's figures against the same actuals.

---

### User Story 5 — Quarterly and Annual Cadence (Priority: P3)

A user who plans at a higher level wants to create a budget with quarterly or annual columns instead of monthly. They select "Quarterly" cadence and the grid shows 4 period columns. Selecting "Annual" shows a single column for the full year.

**Why this priority**: Monthly is the most common cadence and covers most use cases. Quarterly and annual modes are useful for high-level planning but can be introduced after the core monthly grid.

**Independent Test**: Can be tested by creating a budget with Quarterly cadence and verifying the grid shows 4 columns aligned to fiscal quarters, with correct period labels.

**Acceptance Scenarios**:

1. **Given** the "New Budget" form, **When** the user selects "Quarterly" cadence, **Then** the budget grid shows 4 columns (Q1–Q4) aligned to the workspace's fiscal year.
2. **Given** a quarterly budget, **When** the user enters a value in Q1, **Then** the value applies to the entire quarter (months 1–3 of the fiscal year).
3. **Given** the "New Budget" form, **When** the user selects "Annual" cadence, **Then** the budget grid shows a single column for the full fiscal year total.

---

### Edge Cases

- What happens when a workspace has no chart of accounts? (Show empty state with prompt to set up accounts first)
- What happens when a budget's fiscal year doesn't match the workspace's current fiscal year setting? (Budget retains its original period labels; a warning is shown if the fiscal year start month changes)
- What happens if actuals include transactions in foreign currencies? (Actuals are shown in the workspace base currency; FX conversion uses the rate at transaction date)
- What happens when an AI instruction references an account that doesn't exist? (Show a clarification prompt listing the closest matching accounts)
- What happens if the user enters a negative value in a cell? (Allowed — negative income or expense adjustments are valid accounting entries)
- Can a budget be deleted? (Yes, with a confirmation prompt. Deletion is permanent and removes all budget lines.)
- What happens when a new account is added to the chart of accounts after a budget is created? (The new account appears as a row with all zero values in existing budgets)

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to create a named budget for a specific fiscal year with a chosen cadence (Monthly, Quarterly, or Annual).
- **FR-002**: The budget grid MUST display income and expense accounts grouped by section. By default, only accounts with at least one budgeted value are shown. Zero-value accounts are collapsed but expandable per section so users can add them to the budget.
- **FR-003**: Period columns MUST be ordered from the workspace's fiscal year start month (e.g. July → June for Australian fiscal year).
- **FR-004**: Cells for periods that have been formally closed in the Accounting Periods module MUST be read-only. Cells for open or future periods MUST remain editable.
- **FR-005**: Users MUST be able to navigate between editable cells using Tab and Enter keys.
- **FR-006**: Users MUST be able to apply a single cell's value to all remaining period columns in the same row ("fill right").
- **FR-007**: Users MUST be able to enter a total for a row and distribute it evenly across all period columns. Any cent-level rounding remainder MUST be applied to the first period column.
- **FR-008**: The grid MUST display running totals per row, section subtotals (Total Income, Total Expenses), and a Net Profit/Loss row.
- **FR-009**: The budget grid MUST provide two AI input surfaces: (1) a global prompt bar at the top of the grid for whole-budget instructions (e.g. "populate all expenses with last year + 10%"), and (2) a per-row AI trigger on each account row for single-row instructions (e.g. "make rent $3,500/month").
- **FR-010**: The AI input MUST support at minimum: even distribution ("$X evenly"), prior year copy ("same as last year"), percentage adjustment ("increase by X%"), and quarterly phasing ("Q1 $X, Q2 $Y"). When "same as last year" is invoked, the system MUST prompt the user to choose the data source: prior year actuals (posted journal entries) or a prior year budget (if one exists for that fiscal year).
- **FR-011**: AI-populated cells MUST be visually distinguishable from manually entered cells until the user saves.
- **FR-012**: Users MUST be able to compare budget figures against actual ledger data in a "vs Actuals" view showing Budget, Actual, and Variance columns. Actuals MUST be sourced from posted journal entry lines only — pending and draft entries are excluded.
- **FR-013**: Variance MUST be shown in both dollar amount and percentage. Unfavourable variances MUST be visually highlighted.
- **FR-014**: The vs Actuals view MUST support date range filtering to show a subset of periods.
- **FR-015**: Users MUST be able to maintain multiple budgets per workspace (e.g. different scenarios or years).
- **FR-016**: Users MUST be able to duplicate an existing budget to create a new scenario.
- **FR-017**: Budget figures MUST be stored and retrieved in the workspace base currency, as integer cent values.
- **FR-018**: A new chart of accounts entry added after a budget is created MUST appear in existing budgets with zero values.
- **FR-019**: Only users with the Owner or Accountant role MUST be permitted to create, edit, or delete budgets. Approver and Auditor roles MUST have read-only access to budgets and the vs Actuals view. Bookkeeper and Client roles MUST NOT have access to budgets.
- **FR-020**: If a user navigates away from the budget grid with unsaved changes, the system MUST display a confirmation prompt warning of unsaved changes, with options to Save or Discard before leaving.
- **FR-021**: The budgets list MUST display each budget's name, fiscal year, cadence, status (Draft / Active / Archived), and last modified date. Users MUST be able to archive a budget without deleting it. Only one budget per fiscal year may have Active status — setting a budget to Active MUST automatically demote any other Active budget for that fiscal year to Draft.
- **FR-022**: The dashboard revenue goal widget MUST source its target figure from the workspace's Active budget (total budgeted income for the current fiscal year). If no Active budget exists, the widget MUST show an empty state with a prompt to create a budget. The existing manual target input on the dashboard is superseded by this behaviour.

### Key Entities

- **Budget**: A named financial plan for a specific fiscal year. Has a name, cadence (monthly/quarterly/annual), fiscal year, date range, status (Draft / Active / Archived), and belongs to a workspace.
- **Budget Line**: A single account's budgeted figure for a single period. Links to a chart of accounts entry, a period identifier, and stores the amount in cents.
- **Budget Period**: Represents a column in the grid — a month, quarter, or full year, identified by a start and end date within the budget's fiscal year.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a fully populated monthly budget for a standard chart of accounts (50 accounts) in under 10 minutes using the manual grid.
- **SC-002**: Users can create a fully populated annual budget using AI-assisted natural language entry in under 3 minutes.
- **SC-003**: The budget vs actuals view loads and renders with correct variance figures in under 2 seconds for a 12-month budget with up to 100 account rows.
- **SC-004**: 100% of AI-interpreted budget instructions that reference valid accounts produce a correct grid population (zero hallucinated account references).
- **SC-005**: Multiple budget scenarios can coexist per workspace without any data leakage between them.
- **SC-006**: Actuals figures shown in the vs Actuals view match the figures produced by the Profit & Loss report for the same period and account groupings.

---

## Clarifications

### Session 2026-03-15

- Q: Should the budget grid show all accounts or only accounts with values? → A: Show only accounts with budgeted values by default; zero-value accounts are collapsed but expandable per section (FR-002)
- Q: What determines whether a period cell is read-only? → A: Formally closed accounting periods (from the Accounting Periods module) are read-only; open and future periods are editable (FR-004)
- Q: Where does the AI input live — global, per-row, or both? → A: Both — a global prompt bar for whole-budget instructions and a per-row AI trigger for individual account rows (FR-009)
- Q: What is the actuals data source for vs Actuals? → A: Posted journal entry lines only — pending and draft entries excluded (FR-012)
- Q: Who can create and edit budgets? → A: Owner and Accountant only; Approver/Auditor read-only; Bookkeeper/Client no access (FR-019)
- Q: What happens with unsaved changes on navigate away? → A: Warn with Save/Discard confirmation — no auto-save (FR-020)
- Q: What does the budgets list page show? → A: Name, fiscal year, cadence, status (Draft/Active/Archived), last modified. Budgets can be archived without deletion (FR-021)
- Q: How should rounding remainders be handled in "distribute evenly"? → A: Remainder applied to the first period (FR-007)
- Q: Should budgets cover income AND expenses, or expenses only? → A: Always full P&L structure; income rows can be left at zero — no separate mode needed (FR-002 already covers this)
- Q: What is the source for "same as last year" AI instruction? → A: User picks at the time — either prior year actuals or a prior year budget (FR-010)
- Q: Should the dashboard revenue goal widget link to the budget module? → A: Yes — widget pulls from the workspace's Active budget; manual target input removed (FR-022)
- Q: Should the dashboard expense by category widget show budget vs actuals bars? → A: No — out of scope. Budget tracking lives in the budget vs actuals view only.
- Q: Can multiple budgets be Active simultaneously? → A: No — only one Active budget per fiscal year. Setting Active auto-demotes the previous Active to Draft (FR-021)
- Q: Should import (CSV upload) be in scope? → A: No — export only (CSV + PDF). Import is out of scope; AI-assisted entry covers bulk population.
- Q: Should balance sheet accounts be included in the budget grid? → A: No — P&L accounts only (income + expenses). Balance sheet budgeting is out of scope.
