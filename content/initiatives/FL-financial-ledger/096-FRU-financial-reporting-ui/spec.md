---
title: "Feature Specification: Financial Reporting UI"
---

# Feature Specification: Financial Reporting UI

**Epic**: 096-FRU | **Created**: 2026-04-01 | **Status**: Draft
**Depends on**: 007-FRC (Financial Reporting & Compliance), 029-BGT (Budgets), 091-RDD (Report Drill-Down & Comparison)
**Initiative**: FL -- MoneyQuest Ledger

---

## Problem Statement

MoneyQuest has five working report endpoints (Trial Balance, P&L, Balance Sheet, General Ledger, BAS) and frontend pages for each -- but the pages are basic data tables with simple date pickers. Users cannot compare periods, drill into account balances, export to PDF or CSV, or save report configurations. Competing products (Xero, QBO) offer rich reporting with comparison columns, drill-down, presets, and export as baseline features. Without these capabilities, users export raw data to Excel for analysis that should happen inside the app.

This epic upgrades the existing report pages and adds new report types, bringing MoneyQuest reporting to parity with Xero's standard reporting suite.

---

## Scope

### In Scope (P1 -- Core Reporting Upgrade)
- Composable `ReportViewer` layout component shared by all standard reports
- Report toolbar: date range with presets, comparison toggle, export buttons
- Comparison columns: current vs prior period with $ and % variance
- Drill-down: click any account line to expand transaction detail inline
- CSV export for all reports
- PDF export via browser print with `@media print` stylesheet
- Upgrade existing reports: Trial Balance, P&L, Balance Sheet, General Ledger

### In Scope (P2 -- New Reports & Budget Comparison)
- Cash Flow Statement (requires new backend action)
- Aged Receivables report (invoices by age bucket)
- Aged Payables report (bills by age bucket)
- GST Summary report (collected vs paid, net position)
- Account Transactions report (single account with running balance)
- Budget vs Actual report (side-by-side with variance)
- P&L and Balance Sheet comparison against budget
- Saved report configurations (named presets with date range, comparison, filters)

### In Scope (P3 -- Polish)
- Multi-period comparison (up to 12 months side-by-side)
- Print layout with company header, report title, date range, page numbers via `@media print`
- Report scheduling (email PDF to stakeholders -- builds on 043-CRB infrastructure)

### Out of Scope
- Custom report builder (covered by 043-CRB)
- Consolidated reports across workspace groups (covered by 028-CFT)
- Chart/graph visualisations within reports (separate initiative)
- BI tool connectors (Tableau, Power BI)
- Natural language report queries (covered by 021-AIQ)
- Tracking category breakdown within standard reports (future enhancement)

---

## Architecture Context

### Existing Infrastructure

Reports are served by `ReportController` with 5 endpoints, each delegating to a dedicated Action:

| Endpoint | Action | Status |
|----------|--------|--------|
| `GET /reports/trial-balance` | Inline query on `AccountBalance` projector | Complete |
| `GET /reports/profit-and-loss` | `GenerateProfitAndLoss` | Complete (supports comparison params) |
| `GET /reports/balance-sheet` | `GenerateBalanceSheet` | Complete |
| `GET /reports/general-ledger` | `GenerateGeneralLedger` | Complete |
| `GET /reports/bas` | `GenerateBasReport` | Complete |

The P&L action already accepts `compare_start_date` and `compare_end_date` parameters and returns comparison data with variance. The frontend does not currently use these parameters.

Frontend pages live at `frontend/src/app/(dashboard)/reports/` with TanStack Query hooks in `frontend/src/hooks/use-reports.ts`. Each page is a standalone `'use client'` component with its own date picker -- there is no shared toolbar or layout.

### Backend Changes Required

| Change | Report | Reason |
|--------|--------|--------|
| Add comparison params to Trial Balance | Trial Balance | Currently uses `AccountBalance` projector with no date filtering |
| Add comparison params to Balance Sheet | Balance Sheet | Currently accepts only `as_at_date`, no comparison |
| Add drill-down endpoint | All | New endpoint: `GET /reports/drill-down/{account_id}` returning journal entry lines |
| Add Cash Flow Statement action | Cash Flow | Backend placeholder only -- no action exists |
| Add Aged Receivables action | Aged Receivables | New action querying invoices by due date buckets |
| Add Aged Payables action | Aged Payables | New action querying bills by due date buckets |
| Add GST Summary action | GST Summary | May reuse BAS data with simplified output |
| Add Account Transactions endpoint | Account Transactions | Similar to General Ledger single-account mode |
| Add Budget vs Actual action | Budget vs Actual | Joins budget_lines with ledger actuals |
| Add CSV export endpoint | All | Server-side CSV generation or frontend-only |
| Add saved presets CRUD | All | `ReportPreset` model (see 091-RDD spec) |

### Dependencies

| Direction | Epic | Relationship |
|-----------|------|-------------|
| **Depends on** | 007-FRC | Existing report endpoints and actions |
| **Depends on** | 005-IAR | Invoice/bill data for aging reports |
| **Depends on** | 029-BGT | Budget data for Budget vs Actual |
| **Depends on** | 044-TAX | Tax code and BAS field data for GST Summary |
| **Soft dep** | 043-CRB | ReportTemplate model exists; saved presets may reuse or extend this |
| **Soft dep** | 091-RDD | Spec covers drill-down and comparison -- this epic implements it |

---

## User Scenarios & Testing

### User Story 1 -- Report Toolbar with Date Presets (Priority: P1)

A business owner opens the Profit & Loss report and wants to quickly view this month's figures without manually setting dates. They click a preset button ("This Month") and the report updates immediately. They then want to see last quarter, so they click "Last Quarter" and the dates adjust to the prior calendar quarter boundaries.

**Why this priority**: The date preset toolbar is the foundation for every other reporting upgrade. Every report page uses it.

**Independent Test**: Can be tested by opening any report, clicking each preset, and verifying the date range updates correctly relative to today's date and the workspace's fiscal year start month.

**Acceptance Scenarios**:

1. **Given** a user opens the P&L report, **When** they click "This Month", **Then** the date range is set to the first and last day of the current calendar month, and the report data refreshes.
2. **Given** a user opens the P&L report, **When** they click "This Quarter", **Then** the date range is set to the first day of the current calendar quarter through today.
3. **Given** a user opens the P&L report, **When** they click "This Financial Year", **Then** the date range starts at the workspace's fiscal year start month and ends today. The fiscal year start month is read from `useOrganisationSettings()` (already available via `fiscal_year_start_month`, defaults to 7 for Australian FY).
4. **Given** a user opens the P&L report, **When** they click "Last Financial Year", **Then** the date range covers the previous financial year (e.g. 1 July 2024 -- 30 June 2025 for Australian FY).
5. **Given** a user opens the P&L report, **When** they click "Custom" and select specific dates, **Then** the report renders for that exact range.
6. **Given** the toolbar is rendered, **When** the user views the available presets, **Then** the following presets are available: This Month, Last Month, This Quarter, Last Quarter, This Financial Year, Last Financial Year, Year to Date, Custom. For point-in-time reports (TB, BS), the preset resolves to a single "as at" date (the last day of the selected period).
7. **Given** the report toolbar loads for the first time with no saved configuration, **When** no date is pre-selected, **Then** the default preset is "This Financial Year" for period reports and today's date for point-in-time reports.

---

### User Story 2 -- Comparison Period Toggle (Priority: P1)

An accountant viewing the P&L wants to see how this quarter compares to the same quarter last year. They enable the "Compare" toggle and select "Same Period Last Year". The report adds comparison columns showing last year's figures alongside current figures, with dollar and percentage variance.

**Why this priority**: Period comparison is the single most-requested reporting feature and the P&L backend already supports it.

**Independent Test**: Can be tested by generating a P&L for a period with known data, enabling comparison against a prior period with known data, and verifying variance calculations.

**Acceptance Scenarios**:

1. **Given** the P&L report is showing data for Q1 2026, **When** the user enables comparison and selects "vs Prior Period", **Then** the report adds columns for Q4 2025 (the immediately preceding quarter of equal length) with each account showing current amount, comparison amount, variance ($), and variance (%). The comparison period length always matches the current period length.
2. **Given** the P&L report is showing data for March 2026, **When** the user enables comparison and selects "vs Same Period Last Year", **Then** the report adds columns for March 2025.
3. **Given** the P&L report is showing data for FY2026, **When** the user enables comparison and selects "vs Budget", **Then** the report adds columns showing budget amounts from the active budget for FY2026, with variance calculated as actual minus budget.
4. **Given** a comparison is active and an account exists in the current period but not the comparison period, **When** the report renders, **Then** the comparison amount shows $0.00 and variance equals the full current amount.
5. **Given** a comparison is active and the comparison amount for an account is zero, **When** variance percentage is calculated, **Then** the percentage column shows "--" (not division by zero).
6. **Given** the comparison toggle is enabled, **When** the user switches comparison mode from "vs Prior Period" to "vs Same Period Last Year", **Then** the comparison data updates without a full page reload.

---

### User Story 3 -- Inline Drill-Down (Priority: P1)

An accountant viewing the Trial Balance notices an unexpected balance in the "Office Supplies" account. They click the account row and it expands accordion-style to reveal every journal entry line that makes up that balance, showing date, reference, narration, debit, credit, and a link to the source journal entry.

**Why this priority**: Drill-down transforms reports from static summaries into interactive investigation tools. It eliminates the need to leave the report and manually search the General Ledger.

**Independent Test**: Can be tested by generating a Trial Balance with at least one account that has posted entries, clicking the account row, and verifying the expanded section shows the correct transactions matching the report's date range.

**Acceptance Scenarios**:

1. **Given** the Trial Balance is displayed, **When** a user clicks an account row with a non-zero balance, **Then** the row expands below to show a transaction table with columns: Date, Reference, Narration, Debit, Credit.
2. **Given** an expanded drill-down showing transactions, **When** the user clicks the same account row header again, **Then** the drill-down collapses.
3. **Given** a P&L report for March 2026, **When** the user drills into a revenue account, **Then** only journal entry lines dated within March 2026 for that account are shown.
4. **Given** drill-down is open for an account, **When** the user clicks a journal entry reference link, **Then** they are navigated to the journal entry detail page in a new tab (to preserve report state).
5. **Given** a report with 50+ accounts, **When** the user expands one account's drill-down, **Then** other accounts remain collapsed and the page scrolls to keep the expanded section visible. Only one drill-down can be open at a time (expanding a new one collapses the previous).
6. **Given** a drill-down is loading (large account with many transactions), **When** the request is in progress, **Then** a skeleton loader is shown within the expanded row area.
7. **Given** a drill-down for an account, **When** transactions are displayed, **Then** the sum of debits minus credits in the drill-down matches the account's balance shown in the parent report row.

---

### User Story 4 -- CSV Export (Priority: P1)

A bookkeeper needs to send the Trial Balance to an external auditor who works in Excel. They click "Export CSV" and a CSV file downloads with the report data formatted for spreadsheet import -- proper headers, amounts as numbers (not formatted strings), and the date range noted in the filename.

**Why this priority**: CSV export is the minimum viable export capability and unblocks users who currently copy-paste from the browser.

**Independent Test**: Can be tested by generating any report, clicking "Export CSV", opening the downloaded file in a spreadsheet application, and verifying all data rows, headers, and amounts are correct.

**Acceptance Scenarios**:

1. **Given** the Trial Balance is displayed, **When** the user clicks "Export CSV", **Then** a CSV file downloads with filename format `trial-balance_YYYY-MM-DD.csv`.
2. **Given** a P&L with comparison columns active, **When** the user exports to CSV, **Then** the CSV includes all visible columns: Account, Current Amount, Comparison Amount, Variance ($), Variance (%).
3. **Given** any report, **When** exported to CSV, **Then** monetary amounts are exported as decimal dollars (e.g. `1234.56` not `123456` cents) without currency symbols, suitable for spreadsheet formulas. This matches user expectations for CSV data (accountants expect dollar amounts, not cents).
4. **Given** the General Ledger report filtered to a single account, **When** exported to CSV, **Then** the CSV includes only that account's transactions.
5. **Given** a report with zero rows (empty period), **When** exported to CSV, **Then** the CSV downloads with headers only and no data rows.

---

### User Story 5 -- PDF Export via Print (Priority: P1)

An accountant needs to include the Balance Sheet in a board pack. They click "Print / PDF" and the browser opens a print-optimised view that hides the sidebar, navigation, and toolbar controls, expands the table to full width, and adds a header with the company name, report title, and date range. They print to PDF from the browser dialog.

**Why this priority**: PDF output is required for board packs, audit files, and client deliverables. Browser print with `@media print` styles avoids server-side PDF generation complexity.

**Independent Test**: Can be tested by triggering the print dialog on any report page and verifying the print preview shows the correct layout with headers and without navigation elements.

**Acceptance Scenarios**:

1. **Given** any report is displayed, **When** the user clicks "Print / PDF" (or presses Cmd+P), **Then** the browser print dialog opens with a print-optimised layout.
2. **Given** the print layout is active, **When** the user views the print preview, **Then** the sidebar, top navigation bar, toolbar controls, and footer are hidden.
3. **Given** the print layout is active, **When** the user views the header area, **Then** it shows the workspace name, report title (e.g. "Profit & Loss"), and the date range (e.g. "1 January 2026 -- 31 March 2026").
4. **Given** a report that spans multiple printed pages, **When** printed, **Then** each page includes the report title and date range in the header, and page numbers in the footer (e.g. "Page 1 of 3").
5. **Given** a report with comparison columns (5+ total columns), **When** printed, **Then** the print layout automatically switches to landscape orientation via `@page { size: landscape }` and all columns are visible without overflow.
6. **Given** a report with an expanded drill-down, **When** printed, **Then** the drill-down transactions are included in the print output. Collapsed sections are excluded.
7. **Given** the user clicks "Print / PDF", **When** the print dialog opens, **Then** the toolbar preset/comparison controls themselves are hidden from print but a text summary of the active settings (date range, comparison mode) is shown in the print header.

---

### User Story 6 -- Composable ReportViewer Component (Priority: P1)

A developer is building the Account Transactions report. Instead of building a toolbar, export buttons, and drill-down mechanism from scratch, they use the shared `ReportViewer` component which provides the standard toolbar, date preset logic, comparison toggle, export actions, and drill-down expansion pattern. They only need to supply the report-specific data fetching hook and row rendering.

**Why this priority**: Without a shared component, each report page duplicates toolbar, export, and drill-down logic. The ReportViewer ensures consistency and reduces maintenance.

**Independent Test**: Can be tested by verifying that all report pages use the same ReportViewer component and that changing a toolbar behaviour (e.g. adding a new preset) propagates to all reports.

**Acceptance Scenarios**:

1. **Given** a developer renders `<ReportViewer>` with a report configuration, **When** the component mounts, **Then** it renders the standard toolbar with date presets, comparison toggle, and export buttons.
2. **Given** the ReportViewer is configured for a "point-in-time" report (e.g. Trial Balance, Balance Sheet), **When** the toolbar renders, **Then** it shows a single "As at" date picker instead of a "From / To" range.
3. **Given** the ReportViewer is configured for a "period" report (e.g. P&L, General Ledger), **When** the toolbar renders, **Then** it shows "From" and "To" date pickers with presets.
4. **Given** the ReportViewer is configured with `drillDownEnabled: true`, **When** a user clicks an account row, **Then** the component handles expansion state and calls the drill-down data fetching hook for that account.
5. **Given** the ReportViewer is configured with `comparisonEnabled: false` (e.g. for General Ledger), **When** the toolbar renders, **Then** the comparison toggle is not shown.
6. **Given** a report page using ReportViewer, **When** the user triggers export, **Then** the ReportViewer calls the configured export handler with the current data and parameters.
7. **Given** a report page with ReportViewer, **When** the user changes date parameters rapidly (e.g. clicking multiple presets), **Then** API requests are debounced (300ms) using the existing `useDebounce` hook to avoid redundant calls.
8. **Given** a report page with ReportViewer, **When** the report data is loading, **Then** the previous data remains visible (not cleared) and a subtle loading indicator appears in the toolbar (not a full skeleton replacement).

---

### User Story 7 -- Upgraded Trial Balance (Priority: P1)

An accountant generates the Trial Balance and wants to compare it against the prior year-end position to identify accounts with significant movement. They enable comparison, select "vs Same Period Last Year", and see side-by-side debit/credit columns for both periods.

**Why this priority**: The Trial Balance is the most frequently used report and currently has no comparison capability.

**Acceptance Scenarios**:

1. **Given** the Trial Balance page loads, **When** the user views the toolbar, **Then** it uses the ReportViewer component with an "As at" date picker and comparison toggle.
2. **Given** comparison is enabled with "vs Same Period Last Year", **When** the report renders, **Then** additional columns appear: Prior Debit, Prior Credit, and Movement (current balance minus prior balance).
3. **Given** the Trial Balance, **When** a user clicks an account row, **Then** drill-down expands showing all posted journal entry lines for that account up to the "as at" date.
4. **Given** the Trial Balance with comparison, **When** exported to CSV, **Then** all columns are included: Code, Account, Current Debit, Current Credit, Prior Debit, Prior Credit, Movement.
5. **Given** the existing Trial Balance endpoint reads from the `AccountBalance` projector (cumulative, no date filtering), **When** comparison is added, **Then** the backend must be refactored to accept an `as_at_date` parameter and compute balances from journal entry lines up to that date (matching the P&L aggregation pattern in `GenerateProfitAndLoss`), falling back to the projector when no date is specified for performance.

---

### User Story 8 -- Upgraded Profit & Loss (Priority: P1)

An accountant generates the P&L for the current financial year and compares it to the budget to identify areas of overspend. They enable "vs Budget" comparison and see budget amounts alongside actuals with variance highlighting.

**Why this priority**: The P&L is the primary performance report. Budget comparison makes it actionable.

**Acceptance Scenarios**:

1. **Given** the P&L page loads, **When** the user views the page, **Then** it uses the ReportViewer component with From/To date range and comparison toggle.
2. **Given** the P&L with "vs Budget" comparison enabled, **When** the report renders, **Then** each account row shows: Actual, Budget, Variance ($), Variance (%).
3. **Given** an expense account where actual exceeds budget, **When** the variance is displayed, **Then** the variance is shown in red (unfavourable).
4. **Given** a revenue account where actual exceeds budget, **When** the variance is displayed, **Then** the variance is shown in green (favourable).
5. **Given** no active budget exists for the selected period, **When** "vs Budget" is selected, **Then** a message is shown: "No budget found for this period" and comparison columns show "--".
6. **Given** the P&L report, **When** a user drills into a revenue account, **Then** the drill-down shows journal entry lines for that account within the selected date range.

---

### User Story 9 -- Upgraded Balance Sheet (Priority: P1)

An accountant generates the Balance Sheet as at quarter-end and compares it to the previous quarter-end to understand how the financial position has changed.

**Acceptance Scenarios**:

1. **Given** the Balance Sheet page loads, **When** the user views the page, **Then** it uses the ReportViewer component with an "As at" date picker and comparison toggle.
2. **Given** comparison is enabled with "vs Prior Period" and the current date is 31 March, **When** the report renders, **Then** comparison columns show the Balance Sheet as at 31 December (prior quarter-end).
3. **Given** the Balance Sheet with comparison, **When** the user views the equity section, **Then** Current Year Earnings is shown for both the current and comparison periods.
4. **Given** the Balance Sheet, **When** a user drills into an asset account, **Then** the drill-down shows all journal entry lines for that account up to the "as at" date.

---

### User Story 10 -- Upgraded General Ledger (Priority: P1)

An accountant uses the General Ledger to investigate transactions in a specific account. The upgraded version uses the ReportViewer toolbar for consistent date selection and adds pagination for large accounts.

**Acceptance Scenarios**:

1. **Given** the General Ledger page loads, **When** the user views the page, **Then** it uses the ReportViewer component with From/To date range, an account selector, and export buttons.
2. **Given** the General Ledger is filtered to a single account with 500+ transactions, **When** the report renders, **Then** transactions are paginated (50 per page) with navigation controls.
3. **Given** the General Ledger is filtered to a single account, **When** exported to CSV, **Then** all transactions are included (not just the current page).
4. **Given** the General Ledger, **When** the user selects "All Accounts" (no account filter), **Then** transactions are grouped by account with sub-headers and per-account opening/closing balances. This mode is not paginated per-account but is capped at 5,000 total rows to prevent browser memory issues, with a warning when the cap is reached suggesting the user filter to a specific account.
5. **Given** the General Ledger, **When** comparison is not applicable (the GL is a transaction-level report, not a summary), **Then** the comparison toggle is hidden for this report.

---

### User Story 11 -- Cash Flow Statement (Priority: P2)

A business owner wants to understand where cash came from and where it went during the quarter. The Cash Flow Statement categorises cash movements into operating, investing, and financing activities using the direct method.

**Why this priority**: The Cash Flow Statement is a standard financial report but requires a new backend action. It depends on account categorisation into cash flow activity types.

**Acceptance Scenarios**:

1. **Given** the Cash Flow page loads, **When** the user selects a date range, **Then** the report shows three sections: Operating Activities, Investing Activities, and Financing Activities.
2. **Given** cash flow data exists, **When** the report renders, **Then** each section lists accounts with their net cash movement, and a section total.
3. **Given** the report is generated, **When** all sections are totalled, **Then** Net Change in Cash equals the difference between the opening and closing cash balance for the period.
4. **Given** the Cash Flow Statement, **When** comparison is enabled, **Then** prior period cash flows are shown alongside current with variance.
5. **Given** a workspace with no cash flow account categorisation, **When** the Cash Flow page loads, **Then** a setup prompt is shown with a link to Chart of Accounts settings explaining that accounts need a `cash_flow_category` assignment (operating/investing/financing). The `cash_flow_category` column must be added to the `chart_accounts` table as a nullable string enum. Default categorisation is inferred from `AccountType` and `sub_type` during CoA seeding (e.g. bank accounts = operating, fixed asset accounts = investing, loan accounts = financing).

---

### User Story 12 -- Aged Receivables Report (Priority: P2)

A business owner wants to see which customers owe money and how overdue those amounts are. The Aged Receivables report groups outstanding invoices into aging buckets: Current, 1--30 days, 31--60 days, 61--90 days, and 90+ days overdue.

**Why this priority**: Aged receivables is a core debtor management report. It requires invoice data from 005-IAR.

**Acceptance Scenarios**:

1. **Given** the user navigates to the Aged Receivables report, **When** the report loads with an "As at" date, **Then** outstanding (unpaid or partially paid) invoices are grouped by customer and aged into buckets: Current, 1--30, 31--60, 61--90, 90+ days.
2. **Given** a customer has invoices in multiple aging buckets, **When** the report renders, **Then** the customer row shows amounts in each bucket column and a total column.
3. **Given** the report is displayed, **When** the user clicks a customer row, **Then** drill-down expands to show individual invoices with invoice number, date, due date, amount, and amount outstanding.
4. **Given** an invoice is partially paid, **When** aged, **Then** only the outstanding balance (not the original amount) appears in the appropriate bucket.
5. **Given** the report is generated, **When** the footer row is displayed, **Then** it shows column totals for each aging bucket and a grand total.
6. **Given** the report, **When** exported to CSV, **Then** the export includes customer name, each aging bucket amount, and total -- one row per customer.

---

### User Story 13 -- Aged Payables Report (Priority: P2)

An accountant wants to see upcoming supplier payment obligations. The Aged Payables report groups outstanding bills by supplier into the same aging buckets as Aged Receivables.

**Acceptance Scenarios**:

1. **Given** the user navigates to the Aged Payables report, **When** the report loads with an "As at" date, **Then** outstanding bills are grouped by supplier and aged into buckets: Current, 1--30, 31--60, 61--90, 90+ days.
2. **Given** the report is displayed, **When** the user clicks a supplier row, **Then** drill-down expands to show individual bills with bill number, date, due date, amount, and amount outstanding.
3. **Given** the report, **When** the user views the totals, **Then** the report shows a grand total of all outstanding payables across all suppliers.

---

### User Story 14 -- GST Summary Report (Priority: P2)

An accountant preparing for BAS lodgement wants a simplified view of GST collected on sales versus GST paid on purchases, showing the net GST position for the period.

**Acceptance Scenarios**:

1. **Given** the user navigates to the GST Summary report, **When** they select a date range (typically a quarter), **Then** the report shows: Total GST Collected (output tax on sales), Total GST Paid (input tax on purchases), and Net GST Payable (or refundable).
2. **Given** GST data exists, **When** the report renders, **Then** a breakdown table shows GST amounts grouped by tax code (GST, GST-Free, Input Taxed, etc.) with net amounts and tax amounts.
3. **Given** the GST Summary, **When** comparison is enabled with "vs Prior Quarter", **Then** comparison columns show the prior quarter's GST figures with variance.
4. **Given** the GST Summary report, **When** exported to CSV, **Then** the export includes the tax code breakdown and summary totals.

---

### User Story 15 -- Account Transactions Report (Priority: P2)

An accountant wants to see every transaction in a single account for a date range, with opening balance, running balance, and closing balance -- essentially the General Ledger for one account, presented as a standalone report with full toolbar and export.

**Acceptance Scenarios**:

1. **Given** the user navigates to the Account Transactions report, **When** the page loads, **Then** an account selector is shown (searchable dropdown of all chart accounts).
2. **Given** the user selects an account and date range, **When** the report generates, **Then** it shows opening balance, each transaction (date, reference, narration, debit, credit, running balance), and closing balance.
3. **Given** the Account Transactions report, **When** comparison is enabled, **Then** comparison is NOT supported for this report (it is a transaction-level report, not a summary). The comparison toggle is hidden. Users who need to compare transaction volumes should use the P&L or Trial Balance with drill-down instead.
4. **Given** a large account with 1000+ transactions, **When** the report generates, **Then** transactions are paginated with 100 per page, and CSV export includes all transactions.
5. **Given** the user clicks a transaction's journal entry reference, **When** navigated, **Then** they arrive at the journal entry detail page.

---

### User Story 16 -- Budget vs Actual Report (Priority: P2)

A business owner wants a dedicated report comparing their annual budget against actual results, showing each account's budgeted amount, actual amount, and variance for the full year broken down by month.

**Why this priority**: While Budget vs Actual is available as a comparison mode on P&L, a dedicated report provides monthly column breakdown that the P&L comparison does not offer.

**Acceptance Scenarios**:

1. **Given** the user navigates to the Budget vs Actual report, **When** the page loads, **Then** a budget selector lists all budgets for the workspace.
2. **Given** a budget is selected, **When** the report generates, **Then** it shows rows for each account with columns: Account, and for each budget period (month/quarter): Budget, Actual, Variance.
3. **Given** a monthly budget, **When** the report renders, **Then** 12 month columns are shown, each with Budget/Actual/Variance sub-columns, plus a YTD total column.
4. **Given** an expense account where actual exceeds budget in March, **When** the March variance is displayed, **Then** it is shown in red with a negative sign (unfavourable).
5. **Given** no budget exists for the workspace, **When** the user navigates to Budget vs Actual, **Then** an empty state is shown with a link to create a budget.

---

### User Story 17 -- Saved Report Configurations (Priority: P2)

An accountant frequently runs the P&L for the current financial year with "vs Budget" comparison enabled. They want to save this configuration as "Monthly P&L vs Budget" so they can re-run it with one click next month without re-selecting all the options.

**Why this priority**: Saved presets turn one-off report generation into a repeatable workflow. They reduce friction for frequent reporting tasks.

**Acceptance Scenarios**:

1. **Given** a user has configured a report with specific date preset, comparison mode, and any filters, **When** they click "Save Configuration", **Then** a dialog prompts for a name and saves the configuration.
2. **Given** a saved configuration "Monthly P&L vs Budget", **When** the user opens the reports index page, **Then** their saved configurations appear in a "Saved Reports" section above the standard report cards.
3. **Given** a saved configuration uses a relative date preset (e.g. "This Financial Year"), **When** the user loads it next month, **Then** the date range resolves to the current financial year at load time (not the dates from when it was saved).
4. **Given** a saved configuration, **When** the user clicks it on the reports index, **Then** the corresponding report page opens with all saved parameters pre-applied.
5. **Given** a saved configuration, **When** the user clicks "Delete" on it, **Then** the configuration is removed after confirmation.
6. **Given** a saved configuration, **When** another workspace member views the reports index, **Then** they do not see other users' saved configurations (presets are per-user, per-workspace).
7. **Given** a user already has 20 saved configurations, **When** they attempt to save another, **Then** an error message is shown: "Maximum of 20 saved reports reached. Delete an existing one to save a new one." This prevents unbounded growth.
8. **Given** a saved configuration, **When** the user is currently viewing that report with matching parameters, **Then** a "Update" option is available alongside "Save as New" to overwrite the existing preset with current settings.

---

### User Story 18 -- Reports Index Upgrade (Priority: P1)

The reports index page (`/reports`) needs to include the new report types and the saved configurations section.

**Acceptance Scenarios**:

1. **Given** the user navigates to `/reports`, **When** the page loads, **Then** reports are organised into groups: Financial Statements (P&L, Balance Sheet, Cash Flow), Ledger & Balances (Trial Balance, General Ledger, Account Transactions), Receivables & Payables (Aged Receivables, Aged Payables), Tax & Compliance (BAS Report, GST Summary), Performance (Budget vs Actual).
2. **Given** the user has saved report configurations, **When** the page loads, **Then** a "Saved Reports" section appears above the report groups showing each saved preset with its name and report type.
3. **Given** the Cash Flow Statement backend is not yet built, **When** the Cash Flow card is displayed, **Then** it shows a "Coming Soon" badge (existing behaviour).
4. **Given** the workspace does not have the `bas_lodgement` feature flag enabled, **When** the page loads, **Then** the "Tax & Compliance" group (BAS Report, GST Summary) is hidden entirely. Feature flag state is checked via the existing `/api/v1/features` endpoint already consumed by the frontend.
5. **Given** the existing reports index already has groups defined in `reportGroups` array in `frontend/src/app/(dashboard)/reports/page.tsx`, **When** the upgrade is implemented, **Then** the existing array is extended with the new report types and groups (Receivables & Payables, Performance) rather than rewriting the component from scratch.

---

## Edge Cases

- **Empty workspace (no posted entries)**: All reports return empty data with zero totals. Drill-down shows "No transactions found." CSV export downloads headers only.
- **Comparison period with no data**: Comparison columns show $0.00. Variance equals the full current period amount. Variance percentage shows "--".
- **Account deleted after entries posted**: Account still appears in reports with its historical name. Drill-down still works. The account may show as "(Deleted)" if soft-deleted.
- **Budget deleted while "vs Budget" is active**: Comparison mode falls back to showing "--" for budget columns with a banner: "The selected budget no longer exists."
- **Very large General Ledger (10,000+ transactions for one account)**: Drill-down loads first 100 transactions with a "Load more" button. CSV export includes all transactions.
- **Printing a report with drill-down expanded**: All expanded drill-down sections are included in the print output. Collapsed sections are omitted.
- **Concurrent report parameter changes**: Each parameter change triggers a new API call. Rapid changes debounce requests (300ms) to avoid redundant API calls.
- **Fiscal year start month changes**: Reports using relative date presets (e.g. "This Financial Year") recalculate dynamically from the workspace's current `fiscal_year_start_month`.
- **Multi-currency workspace**: All report amounts are shown in the workspace's base currency. Foreign currency amounts are converted at the entry's exchange rate. No FX revaluation in standard reports.
- **BAS report on Starter plan**: The BAS and GST Summary report cards are hidden for workspaces without the `bas_lodgement` feature flag.
- **Browser print header/footer**: Browser-native headers/footers (URL, date) can conflict with custom print headers. The `@media print` styles use `@page` rules to suppress default browser headers. Note: `@page` margin rules can suppress browser chrome in Chrome and Firefox, but Safari has limited support. The print stylesheet should set `@page { margin: 15mm 10mm; }` and use fixed-position header/footer elements within the margin area.
- **URL state for report parameters**: Date range, comparison mode, and account filters are NOT synced to URL query params in P1. This keeps the implementation simple and avoids complexity with URL parsing/encoding. Saved presets serve the "shareable report" use case. URL state sync can be added in a future iteration if needed.
- **Drill-down on grouped/subtotalled rows**: Report sections with subtotal rows (e.g. "Total Revenue" in P&L) are NOT drillable. Only individual account rows support drill-down. The subtotal row cursor should be `default` (not `pointer`).
- **Mobile viewport**: Report tables are horizontally scrollable on mobile. The toolbar wraps to a stacked layout on screens narrower than `sm` breakpoint. Print/export buttons collapse into a single "..." dropdown menu on mobile.

---

## Requirements

### Functional Requirements

**ReportViewer Component**

- **FR-001**: System MUST provide a composable `ReportViewer` component that renders a standard toolbar, table area, and export controls for all standard report pages.
- **FR-002**: ReportViewer MUST support two date modes: "point-in-time" (single date picker for Trial Balance, Balance Sheet, Aged reports) and "period" (From/To range for P&L, GL, Cash Flow, BAS).
- **FR-003**: ReportViewer MUST provide date presets: This Month, Last Month, This Quarter, Last Quarter, This Financial Year, Last Financial Year, Year to Date, Custom.
- **FR-004**: Financial year presets MUST resolve using the workspace's `fiscal_year_start_month` setting.
- **FR-005**: ReportViewer MUST support an optional comparison toggle with modes: vs Prior Period, vs Same Period Last Year, vs Budget.
- **FR-006**: ReportViewer MUST provide export actions: CSV and Print/PDF.
- **FR-007**: ReportViewer MUST support optional drill-down on table rows via an accordion expansion pattern.

**Comparison Columns**

- **FR-008**: When comparison is enabled, the report table MUST show additional columns: comparison amount, variance ($), and variance (%).
- **FR-009**: Variance percentage MUST display "--" when the comparison amount is zero (avoiding division by zero).
- **FR-010**: Favourable variances (revenue above budget/prior, expenses below budget/prior) MUST be styled in green. Unfavourable variances MUST be styled in red.
- **FR-011**: Budget comparison MUST source data from the `budgets` and `budget_lines` tables for the matching fiscal year and accounts.

**Drill-Down**

- **FR-012**: Clicking an account row in any report MUST expand an inline section showing the journal entry lines that compose that account's balance.
- **FR-013**: Drill-down MUST be scoped to the report's active date range (or "up to" date for point-in-time reports).
- **FR-014**: Drill-down rows MUST include: date, journal entry reference (as a link), narration, debit amount, credit amount.
- **FR-015**: Drill-down data MUST be fetched on-demand (lazy loaded) via a dedicated API endpoint, not pre-loaded with the report.
- **FR-016**: Drill-down for accounts with 100+ transactions MUST paginate with a "Load more" mechanism.

**CSV Export**

- **FR-017**: CSV export MUST include all visible columns including comparison and variance columns when active.
- **FR-018**: CSV amounts MUST be exported as decimal dollars (e.g. `1234.56`) without currency symbols or formatting.
- **FR-019**: CSV filename MUST follow the pattern `{report-type}_{YYYY-MM-DD}.csv` using today's date.
- **FR-020**: CSV export MUST include all data rows regardless of pagination state.

**PDF / Print**

- **FR-021**: `@media print` styles MUST hide sidebar, navigation, toolbar controls, and page footer.
- **FR-022**: Print layout MUST add a header with workspace name, report title, and date range.
- **FR-023**: Print layout MUST include page numbers via CSS `@page` counter rules.
- **FR-024**: Reports with 5+ columns MUST use landscape orientation in print layout via `@page { size: landscape }`.

**New Reports**

- **FR-025**: System MUST provide an Aged Receivables report grouping outstanding invoices by customer into aging buckets: Current, 1--30, 31--60, 61--90, 90+ days overdue.
- **FR-026**: System MUST provide an Aged Payables report grouping outstanding bills by supplier into the same aging buckets.
- **FR-027**: System MUST provide a GST Summary report showing GST collected, GST paid, and net GST position for a date range.
- **FR-028**: System MUST provide an Account Transactions report showing all transactions for a single account with opening balance, running balance, and closing balance.
- **FR-029**: System MUST provide a Budget vs Actual report showing budgeted amounts alongside actual ledger amounts with variance for each account and period.
- **FR-030**: System MUST provide a Cash Flow Statement using the direct method, categorising cash movements into Operating, Investing, and Financing activities.

**Saved Configurations**

- **FR-031**: System MUST allow users to save a report configuration (report type, date preset, comparison mode, filters) as a named preset.
- **FR-032**: Saved configurations MUST use relative date presets where applicable, resolving to current dates at load time.
- **FR-033**: Saved configurations MUST be per-user and workspace-scoped.
- **FR-034**: System MUST display saved configurations on the reports index page for quick access.
- **FR-035**: System MUST allow users to delete saved configurations.

**Reports Index**

- **FR-036**: The reports index page MUST display all standard and new report types organised into logical groups.
- **FR-037**: Reports gated by feature flags (BAS, GST Summary) MUST be hidden when the feature is not available.
- **FR-038**: Reports not yet implemented (Cash Flow) MUST show a "Coming Soon" badge.

**Permissions**

- **FR-041**: New report types (Aged Receivables, Aged Payables, GST Summary, Account Transactions, Budget vs Actual, Cash Flow) MUST reuse existing report permissions. Aged Receivables/Payables use `report.balance-sheet` permission (they are financial position reports). GST Summary uses the existing BAS permission check. Account Transactions uses `report.general-ledger`. Budget vs Actual uses `report.profit-loss`. Cash Flow uses `report.balance-sheet`. New permissions are NOT added to avoid seeder churn -- the existing 4 report permissions provide sufficient granularity.
- **FR-042**: Saved report presets CRUD requires no additional permission -- any user who can view a report can save a preset for that report. Presets are per-user so there is no cross-user data risk.

**Keyboard Shortcuts**

- **FR-039**: Report pages MUST support `Cmd+P` / `Ctrl+P` to trigger the print dialog (browser default, not intercepted).
- **FR-040**: Report pages MUST support `Escape` to collapse any open drill-down.

### Key Entities

**ReportPreset** (new model -- workspace + user scoped)

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | Auto-increment |
| `uuid` | string(36) | Public identifier |
| `workspace_id` | bigint FK | Tenant scoping |
| `user_id` | bigint FK | The user who saved the preset |
| `name` | string(255) | User-defined name (required) |
| `report_type` | string | Enum: `trial_balance`, `profit_and_loss`, `balance_sheet`, `general_ledger`, `cash_flow`, `aged_receivables`, `aged_payables`, `gst_summary`, `account_transactions`, `budget_vs_actual` |
| `config` | JSON | `{ date_mode, date_preset, custom_start, custom_end, comparison_mode, filters }` |
| `created_at` | datetime | |
| `updated_at` | datetime | |

**Config JSON schema:**
```json
{
  "date_mode": "period",
  "date_preset": "this_financial_year",
  "custom_start": null,
  "custom_end": null,
  "comparison_mode": "vs_budget",
  "filters": {
    "account_id": null,
    "budget_id": null
  }
}
```

### Non-Functional Requirements

- **NFR-001**: Drill-down MUST render within 1 second for accounts with fewer than 10,000 transactions.
- **NFR-002**: Comparison data MUST add no more than 500ms to report generation time.
- **NFR-003**: CSV export for reports with up to 10,000 rows MUST complete within 3 seconds.
- **NFR-004**: Print stylesheet MUST produce clean output in Chrome, Safari, and Firefox.
- **NFR-005**: All report API queries MUST be scoped by `workspace_id` -- no cross-workspace data leakage.
- **NFR-006**: Drill-down expand/collapse MUST be keyboard accessible (Enter/Space to toggle, Escape to collapse).
- **NFR-007**: Variance colours (green/red) MUST not rely on colour alone -- an up/down arrow icon or +/- prefix MUST accompany the colour to support colour-blind users.
- **NFR-008**: Report tables MUST use semantic `<table>` elements (not CSS grid) with proper `<thead>` and `<th scope="col">` for screen reader compatibility. The existing shadcn `Table` component already satisfies this.

---

## API Changes Required

### Modified Endpoints

| Endpoint | Change |
|----------|--------|
| `GET /reports/trial-balance` | Refactor to accept `as_at_date` (compute from JE lines instead of projector when date is specified) and optional `compare_as_at_date` for comparison. Existing no-date behaviour preserved (reads from `AccountBalance` projector for speed). Extract into a `GenerateTrialBalance` action to match the pattern of other report actions. |
| `GET /reports/balance-sheet` | Add optional `compare_as_at_date` param. The existing `GenerateBalanceSheet` action is extended with comparison logic mirroring `GenerateProfitAndLoss`. |

### New Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/reports/drill-down/{account_id}` | Fetch journal entry lines for an account within a date range |
| `GET` | `/reports/cash-flow` | Cash Flow Statement (direct method) |
| `GET` | `/reports/aged-receivables` | Outstanding invoices by customer and aging bucket |
| `GET` | `/reports/aged-payables` | Outstanding bills by supplier and aging bucket |
| `GET` | `/reports/gst-summary` | GST collected vs paid for a date range |
| `GET` | `/reports/account-transactions` | Single account transactions with running balance |
| `GET` | `/reports/budget-vs-actual` | Budget amounts vs actual ledger amounts |
| `GET` | `/report-presets` | List saved presets for current user |
| `POST` | `/report-presets` | Save a new preset |
| `PATCH` | `/report-presets/{uuid}` | Update an existing preset's config |
| `DELETE` | `/report-presets/{uuid}` | Delete a saved preset |

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: 70% of users who view a report use the date preset buttons instead of manual date entry within 30 days of launch.
- **SC-002**: Drill-down is used on at least 30% of report views (measured by drill-down API calls vs report page views).
- **SC-003**: CSV or PDF export is used on at least 20% of report views.
- **SC-004**: At least 25% of active workspaces save at least one report preset within 60 days of launch.
- **SC-005**: Drill-down renders in under 1 second for accounts with fewer than 10,000 transactions.
- **SC-006**: Report comparison adds no more than 500ms to report generation.
- **SC-007**: All report pages pass `@media print` visual QA in Chrome, Safari, and Firefox.

---

## Clarifications

### Session 2026-04-01

- Q: Should the ReportViewer be a layout wrapper or a renderless hook? A: A visible layout component (`<ReportViewer>`) that wraps the report table. It renders the toolbar, handles date state, and provides export/drill-down callbacks. Individual report pages supply a render function for the table body. This keeps the toolbar visually consistent across all reports.
- Q: Should CSV export happen on the frontend or backend? A: Frontend-generated CSV from the data already loaded in the browser. Avoids a separate API endpoint for CSV. The data is already fetched by TanStack Query -- the export button serialises it. Exception: if drill-down is expanded and the user exports, only the visible data is exported (drill-down data is included if expanded, excluded if collapsed).
- Q: Should PDF export use a server-side library (DomPDF) or browser print? A: Browser print with `@media print` styles for P1. This avoids server-side PDF complexity and gives users native browser print-to-PDF. Server-side PDF (via DomPDF) can be added in P3 for scheduled report delivery which requires server-side rendering.
- Q: How does comparison work for point-in-time reports (Trial Balance, Balance Sheet)? A: "vs Prior Period" for a Balance Sheet as at 31 March would show comparison as at the prior quarter-end or prior month-end (depending on the active date preset). "vs Same Period Last Year" would show the same date one year prior. The comparison date is calculated from the current "as at" date and the active preset's period length.
- Q: Should the ReportPreset model reuse the existing ReportTemplate from 043-CRB? A: No. ReportTemplate is a custom report builder artefact with complex config (data sources, groupings, column layouts). ReportPreset is much simpler -- it just saves the toolbar state (date preset, comparison mode, filters) for a standard report page. Different models for different purposes.
- Q: Where do aging bucket boundaries come from? A: Hardcoded at Current (not yet due), 1--30, 31--60, 61--90, 90+ days. Based on the difference between the "as at" date and the invoice/bill due date. Not configurable per workspace in P1.

### Session 2026-04-02 (autonomous)

- Q: What is the default date preset when a report page loads with no saved configuration? → A: "This Financial Year" for period reports (P&L, GL, BAS, GST Summary, Budget vs Actual, Cash Flow), today's date for point-in-time reports (TB, BS, Aged Receivables, Aged Payables). This matches Xero's behaviour and the most common use case. The current hardcoded Jan 1-to-today default in the existing P&L page is replaced.

- Q: "Last Year" in the preset list -- is this calendar year or financial year? → A: Financial year. The preset is labelled "Last Financial Year" (not "Last Year") to avoid ambiguity. All year-based presets use the workspace's `fiscal_year_start_month` from `useOrganisationSettings()`. There is no separate "Last Calendar Year" preset -- users can use Custom for that edge case.

- Q: How does "vs Prior Period" determine the comparison period length for custom date ranges? → A: The comparison period always has the same length as the current period. For a custom range of 45 days ending March 15, the prior period is the preceding 45 days (Jan 29 -- March 14). For preset-based ranges, the prior period uses the natural prior unit (prior month, prior quarter, prior financial year).

- Q: Should drill-down allow multiple rows open simultaneously, or one at a time? → A: One at a time (accordion pattern). Expanding account B collapses account A. This keeps the UI clean and avoids excessive API calls. It matches the existing accordion patterns in the codebase (e.g. banking reconciliation).

- Q: Should journal entry reference links in drill-down navigate away from the report or open in a new tab? → A: Open in a new tab (`target="_blank"`) to preserve report state. Users investigating a report should not lose their place, date selection, or comparison configuration.

- Q: How are CSV amounts formatted -- cents (integers) or dollars (decimals)? → A: Decimal dollars (e.g. `1234.56`). While the API returns cents internally, accountants expect dollar amounts in CSV exports for direct use in spreadsheets. The frontend divides by 100 during CSV serialisation.

- Q: What loading behaviour should the ReportViewer show when parameters change? → A: Keep previous data visible (stale-while-revalidate pattern) with a subtle spinner in the toolbar area. Do NOT replace the table with a full skeleton on parameter changes -- only show skeletons on initial load when there is no previous data. This matches TanStack Query's `keepPreviousData` / `placeholderData` pattern already available.

- Q: Should date range, comparison mode, and filters be synced to URL query parameters? → A: No, not in P1. URL state sync adds complexity (encoding, parsing, back/forward navigation) with limited benefit. Saved presets cover the "shareable/repeatable report" use case. URL sync can be added later if user feedback warrants it.

- Q: What happens to existing report page tests when the UI is upgraded? → A: Existing report page components are refactored in place (not new routes). The existing TanStack Query hooks in `use-reports.ts` are extended with comparison params rather than replaced. The existing `SimpleDatePicker` component continues to be used within the ReportViewer toolbar -- it is composed into the date preset system, not replaced.

- Q: Can subtotal/section header rows (e.g. "Total Revenue") be drilled into? → A: No. Only individual account rows with a non-zero balance support drill-down. Section headers and total rows show `cursor: default` and do not respond to clicks. This avoids the complexity of aggregating drill-down data across multiple accounts.

- Q: How does the General Ledger report handle the "All Accounts" mode with potentially thousands of transactions? → A: Capped at 5,000 total rows across all accounts. If the total exceeds 5,000, a warning banner is shown: "Showing first 5,000 transactions. Filter to a specific account to see all transactions." CSV export in All Accounts mode also respects this cap. This prevents browser tab crashes.

- Q: Do new report types need new permissions in `RolesAndPermissionsSeeder`? → A: No. New reports reuse existing permissions to avoid seeder churn: Aged Receivables/Payables use `report.balance-sheet`, GST Summary uses BAS permission, Account Transactions uses `report.general-ledger`, Budget vs Actual uses `report.profit-loss`, Cash Flow uses `report.balance-sheet`. The 6 existing roles already have these permissions assigned appropriately.

- Q: How does the Cash Flow Statement work given `ChartAccount` has no `cash_flow_category` column? → A: A migration adds `cash_flow_category` (nullable string enum: `operating`, `investing`, `financing`) to `chart_accounts`. CoA seeding infers defaults from `AccountType`/`sub_type` (bank = operating, fixed asset = investing, loan = financing). Accounts without a category are classified as "operating" by default. The setup prompt only appears if zero accounts have been categorised.

- Q: What is the maximum number of saved report presets per user per workspace? → A: 20. This prevents unbounded storage growth and is enforced at the API level (the POST endpoint returns 422 when the limit is reached). The limit is generous enough that no reasonable user would hit it.

- Q: How are variance colours handled for accessibility (colour-blind users)? → A: Green/red variance colours are supplemented with directional indicators: favourable variances show a small up-arrow icon and "+" prefix, unfavourable show down-arrow and "-" prefix. This satisfies WCAG 1.4.1 (Use of Color). The existing `text-money-positive` / `text-money-negative` CSS classes are extended with these indicators.

- Q: Which reports support the "vs Budget" comparison mode? → A: Only P&L and Balance Sheet. The Trial Balance does not support budget comparison (budgets are not structured by debit/credit). The "vs Budget" option is only shown in the comparison dropdown when the report type supports it. Budget data comes from the `budgets` and `budget_lines` tables (epic 029-BGT).

- Q: Should the Budget vs Actual report (US16) show monthly columns horizontally or vertically? → A: Horizontally (months as columns) matching standard accounting layout. For workspaces with monthly budgets this means 12 month columns x 3 sub-columns (Budget/Actual/Variance) = 36 data columns. On screens narrower than `lg`, only the YTD summary columns are shown with an option to expand. Print uses landscape with condensed font size.

- Q: Does the "vs Budget" comparison require a budget selector when multiple budgets exist? → A: If exactly one budget exists for the selected period, it is auto-selected. If multiple exist, a dropdown appears in the toolbar letting the user choose. If none exist, the "vs Budget" option is disabled with a tooltip: "No budget exists for this period."

- Q: What is the drill-down pagination strategy for very large accounts? → A: The drill-down endpoint returns the first 100 rows sorted by date ascending, with a `has_more` flag and `next_cursor` (date-based cursor). A "Load more" button at the bottom of the drill-down loads the next 100. No infinite scroll -- explicit button click to load more. The total count is shown: "Showing 100 of 1,247 transactions."

- Q: Should the existing Cash Flow Forecast report page (`/reports/cash-flow-forecast`) be affected by this epic? → A: No. The Cash Flow Forecast is a forward-looking projection (epic 041-CFF) and is architecturally different from the historical Cash Flow Statement. They coexist as separate report cards in the "Financial Statements" group on the reports index. The Cash Flow Statement shows historical data; the Forecast shows projected data.

- Q: How does the reports index handle the mobile viewport with many report cards? → A: The existing `sm:grid-cols-2 lg:grid-cols-3` grid pattern continues. Report groups stack vertically. The "Saved Reports" section at the top uses a horizontal scroll of compact card chips on mobile (similar to StatusTabs) rather than the full card grid.
