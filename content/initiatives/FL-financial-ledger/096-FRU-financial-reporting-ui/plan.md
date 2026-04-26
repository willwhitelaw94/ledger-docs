---
title: "Technical Architecture Plan: Financial Reporting UI"
---

# Technical Architecture Plan: Financial Reporting UI

**Epic**: 096-FRU | **Created**: 2026-04-01 | **Status**: Draft
**Spec**: [096-FRU Spec](/initiatives/FL-financial-ledger/096-FRU-financial-reporting-ui/spec)

---

## 1. Architecture Overview

### Design Philosophy

This epic upgrades the existing five report pages and adds six new report types behind a composable **ReportViewer** pattern. The ReportViewer is a visible layout component (not a renderless hook) that wraps every standard report page with a shared toolbar, date preset logic, comparison toggle, drill-down accordion, and export actions. Individual report pages supply only their data-fetching hook, column definitions, and row rendering.

### Component Hierarchy

```
ReportViewer (layout wrapper)
├── ReportStandardToolbar (date presets, comparison toggle, export buttons)
│   ├── DatePresetSelector (preset chips + custom date pickers)
│   ├── ComparisonModeSelector (toggle + mode dropdown)
│   └── ReportExportButtons (CSV, Print/PDF)
├── {children} — report-specific table body
│   ├── ReportSectionHeader (e.g. "Revenue", "Assets")
│   ├── ReportAccountRow (clickable, supports drill-down)
│   │   └── DrillDownAccordion (lazy-loaded transaction detail)
│   └── ReportTotalRow (non-clickable subtotal/grand total)
└── ReportPrintHeader (@media print only — workspace name, title, date range)
```

### Key Decisions

1. **ReportViewer is NOT the existing `ReportToolbar` from `frontend/src/components/reports/ReportToolbar.tsx`**. That component belongs to the Custom Report Builder (043-CRB) and manages template names, run counts, and schedule dialogs. The new `ReportStandardToolbar` is purpose-built for standard reports with date presets, comparison, and export.

2. **Existing report components in `frontend/src/components/reports/`** (DrillDownPanel, ComparisonToggle, ReportAccountRow, etc.) were built for the Custom Report Builder. Where their interfaces align, they will be reused. Where they diverge, new components are created under `frontend/src/components/reports/standard/`.

3. **CSV export is frontend-only** — serialised from data already loaded by TanStack Query. No new backend CSV endpoints.

4. **PDF export uses `@media print`** — no server-side PDF generation in P1.

5. **Drill-down uses the existing `DrillDownReportCell` action** (`app/Actions/Reporting/DrillDownReportCell.php`) which already returns journal entry lines by account and date range. It needs pagination support added (cursor-based, 100 rows per page).

6. **Date presets are calculated on the frontend** using a `useDatePresets` hook that reads `fiscal_year_start_month` from `useOrganisationSettings()`. The existing backend `ResolveDateRange` action is NOT called per-request — preset resolution happens client-side for instant UI responsiveness.

---

## 2. Backend Changes

### 2.1 New Actions

| Action | File Path | Purpose |
|--------|-----------|---------|
| `GenerateTrialBalance` | `app/Actions/Reporting/GenerateTrialBalance.php` | Extract trial balance logic from `ReportController::trialBalance()` into a proper action. Accept `as_at_date` param to compute from JE lines (matching `GenerateBalanceSheet` pattern). Fall back to `AccountBalance` projector when no date is specified. Add optional `compare_as_at_date` for comparison. |
| `GenerateCashFlow` | `app/Actions/Reporting/GenerateCashFlow.php` | Direct-method Cash Flow Statement. Query posted JE lines grouped by `chart_accounts.cash_flow_category` (operating/investing/financing) within a date range. Return sections with account-level breakdowns and section totals. Accept optional comparison date range. |
| `GenerateAgedReceivables` | `app/Actions/Reporting/GenerateAgedReceivables.php` | Query `invoices` where `type = invoice`, `status IN (sent, overdue, partial)`, grouped by `contact_id`. Compute aging buckets (Current, 1-30, 31-60, 61-90, 90+) based on difference between `as_at_date` and `due_date`. Use `amount_due` (not `total_amount`) for partially paid invoices. |
| `GenerateAgedPayables` | `app/Actions/Reporting/GenerateAgedPayables.php` | Same structure as Aged Receivables but queries `invoices` where `type = bill`. Grouped by supplier `contact_id`. Same aging bucket logic. |
| `GenerateGstSummary` | `app/Actions/Reporting/GenerateGstSummary.php` | Simplified view of GST data. Reuses the same JE line + tax code join from `GenerateBasReport` but outputs: total GST collected, total GST paid, net GST position, and breakdown by tax code. Accept optional comparison date range. |
| `GenerateAccountTransactions` | `app/Actions/Reporting/GenerateAccountTransactions.php` | Single-account transaction list with opening balance, running balance, closing balance. Very similar to `GenerateGeneralLedger` single-account mode but adds server-side pagination (100 per page) via cursor. |
| `GenerateBudgetVsActual` | `app/Actions/Reporting/GenerateBudgetVsActual.php` | Join `budget_lines` with actual JE line aggregates by `chart_account_id` and `period` (month). For each account-month, return budget amount, actual amount, and variance. Requires a `budget_id` parameter. |

### 2.2 Modified Actions

| Action | Change |
|--------|--------|
| `GenerateBalanceSheet` | Add optional `compareAsAtDate` parameter. When provided, run `getBalancesAsAt()` and `calculateCurrentYearEarnings()` twice and merge comparison data with variance into each section row. Return `comparison_*` and `variance_*` fields matching the `GenerateProfitAndLoss` pattern. |
| `DrillDownReportCell` | Add cursor-based pagination: accept optional `cursor` (date string) and `limit` (default 100) params. Return `has_more` boolean and `next_cursor` in response metadata. Add total transaction count to `meta.total_count`. |

### 2.3 New API Endpoints

All under the existing workspace-scoped middleware group in `routes/api.php`:

```php
// Standard report endpoints (add alongside existing report routes)
Route::get('reports/drill-down/{accountId}', [ReportController::class, 'drillDown']);
Route::get('reports/cash-flow', [ReportController::class, 'cashFlow']);
Route::get('reports/aged-receivables', [ReportController::class, 'agedReceivables']);
Route::get('reports/aged-payables', [ReportController::class, 'agedPayables']);
Route::get('reports/gst-summary', [ReportController::class, 'gstSummary']);
Route::get('reports/account-transactions', [ReportController::class, 'accountTransactions']);
Route::get('reports/budget-vs-actual', [ReportController::class, 'budgetVsActual']);

// Report presets CRUD
Route::get('report-presets', [ReportPresetController::class, 'index']);
Route::post('report-presets', [ReportPresetController::class, 'store']);
Route::patch('report-presets/{uuid}', [ReportPresetController::class, 'update']);
Route::delete('report-presets/{uuid}', [ReportPresetController::class, 'destroy']);
```

### 2.4 Modified Endpoints

| Endpoint | Change |
|----------|--------|
| `GET /reports/trial-balance` | Add `as_at_date` and `compare_as_at_date` query params. Delegate to new `GenerateTrialBalance` action. Preserve existing no-param behaviour (projector-based). |
| `GET /reports/balance-sheet` | Add `compare_as_at_date` query param. Pass to extended `GenerateBalanceSheet` action. |

### 2.5 New Form Requests

| Class | File Path | Auth Permission |
|-------|-----------|-----------------|
| `TrialBalanceRequest` | `app/Http/Requests/Report/TrialBalanceRequest.php` | `report.trial-balance` |
| `DrillDownRequest` | `app/Http/Requests/Report/DrillDownRequest.php` | Any report permission (user must have at least one `report.*` permission) |
| `CashFlowRequest` | `app/Http/Requests/Report/CashFlowRequest.php` | `report.balance-sheet` |
| `AgedReceivablesRequest` | `app/Http/Requests/Report/AgedReceivablesRequest.php` | `report.balance-sheet` |
| `AgedPayablesRequest` | `app/Http/Requests/Report/AgedPayablesRequest.php` | `report.balance-sheet` |
| `GstSummaryRequest` | `app/Http/Requests/Report/GstSummaryRequest.php` | BAS permission (inline check as per existing `bas()` method) |
| `AccountTransactionsRequest` | `app/Http/Requests/Report/AccountTransactionsRequest.php` | `report.general-ledger` |
| `BudgetVsActualRequest` | `app/Http/Requests/Report/BudgetVsActualRequest.php` | `report.profit-loss` |
| `StoreReportPresetRequest` | `app/Http/Requests/Report/StoreReportPresetRequest.php` | No additional permission (any authenticated user) |
| `UpdateReportPresetRequest` | `app/Http/Requests/Report/UpdateReportPresetRequest.php` | Owner check (user_id matches) |

### 2.6 New Controller

| Controller | File Path | Purpose |
|------------|-----------|---------|
| `ReportPresetController` | `app/Http/Controllers/Api/ReportPresetController.php` | CRUD for saved report configurations. `index()` returns presets for current user + workspace. `store()` enforces 20-preset limit per user per workspace. |

### 2.7 New Model

| Model | File Path | Table |
|-------|-----------|-------|
| `ReportPreset` | `app/Models/Tenant/ReportPreset.php` | `report_presets` |

Fillable: `workspace_id`, `user_id`, `uuid`, `name`, `report_type`, `config` (JSON cast).

Scoped by `workspace_id` (global scope). Has `belongsTo` relationships to `Workspace` and `User`.

---

## 3. Frontend Architecture

### 3.1 ReportViewer Component

**File**: `frontend/src/components/reports/standard/ReportViewer.tsx`

```typescript
type ReportDateMode = 'period' | 'point_in_time';

type ComparisonMode = 'vs_prior_period' | 'vs_same_period_last_year' | 'vs_budget' | null;

type DatePreset =
  | 'this_month' | 'last_month'
  | 'this_quarter' | 'last_quarter'
  | 'this_financial_year' | 'last_financial_year'
  | 'year_to_date' | 'custom';

interface ReportViewerProps {
  title: string;
  dateMode: ReportDateMode;
  comparisonEnabled: boolean;
  comparisonModes?: ComparisonMode[]; // which modes to offer
  drillDownEnabled: boolean;
  children: (params: ReportRenderParams) => React.ReactNode;
  extraToolbar?: React.ReactNode; // e.g. account selector for GL
}

interface ReportRenderParams {
  dateRange: { startDate: string; endDate: string } | { asAtDate: string };
  comparison: ComparisonMode;
  comparisonDateRange: { startDate: string; endDate: string } | { asAtDate: string } | null;
  expandedAccountId: number | null;
  onToggleDrillDown: (accountId: number) => void;
  onExportCsv: (data: CsvExportData) => void;
}
```

The `ReportViewer` manages:
- Date preset state (default: "This Financial Year" for period, today for point-in-time)
- Comparison mode state
- Comparison date calculation (prior period, same period last year)
- Drill-down accordion state (one account at a time)
- Export CSV handler (frontend serialisation)
- Print handler (triggers `window.print()`)
- Debounced parameter changes (300ms via existing `useDebounce` hook from `frontend/src/hooks/use-debounce.ts`)
- Stale-while-revalidate loading (previous data stays visible, subtle toolbar spinner)

### 3.2 ReportStandardToolbar

**File**: `frontend/src/components/reports/standard/ReportStandardToolbar.tsx`

Renders the toolbar strip at the top of every standard report:

```
[This Month] [Last Month] [This Quarter] [Last Quarter] [This FY] [Last FY] [YTD] [Custom ▾]
                                            [Compare: Off ▾]   [Export CSV] [Print / PDF]
```

- Preset chips are `Button variant="outline"` with `size="sm"`, active state uses `variant="secondary"`
- Comparison is a dropdown-toggle: Off / vs Prior Period / vs Same Period Last Year / vs Budget
- "vs Budget" only appears when `comparisonModes` includes it
- Export CSV and Print are icon buttons with tooltips
- On mobile (`< sm`), export buttons collapse into a `DropdownMenu` with "..." trigger

### 3.3 DatePresetSelector

**File**: `frontend/src/components/reports/standard/DatePresetSelector.tsx`

- Renders preset chips for period and point-in-time modes
- For point-in-time: presets resolve to the last day of the selected period (e.g. "This Month" = last day of current month, "This FY" = today)
- Uses `useOrganisationSettings()` to read `fiscal_year_start_month`
- "Custom" shows inline `SimpleDatePicker` components (existing component from `frontend/src/components/financial/SimpleDatePicker.tsx`)

### 3.4 useDatePresets Hook

**File**: `frontend/src/hooks/use-date-presets.ts`

Client-side preset resolution. Mirrors the logic in the backend `ResolveDateRange` action but runs instantly in the browser. Accepts `fiscalYearStartMonth` and `dateMode` ('period' | 'point_in_time'). Returns resolved date ranges for each preset key.

```typescript
function useDatePresets(fiscalYearStartMonth: number): {
  resolvePreset: (preset: DatePreset, mode: ReportDateMode) => ResolvedDateRange;
  resolveComparisonRange: (
    currentRange: ResolvedDateRange,
    mode: ComparisonMode
  ) => ResolvedDateRange | null;
}
```

### 3.5 DrillDownAccordion

**File**: `frontend/src/components/reports/standard/DrillDownAccordion.tsx`

Renders as an expanded `<tr>` below the clicked account row (matches the existing `DrillDownPanel` pattern from `frontend/src/components/reports/DrillDownPanel.tsx`). Key differences from the CRB version:

- Uses cursor-based pagination with a "Load more" button (not infinite scroll)
- Shows "Showing X of Y transactions" counter
- Journal entry reference links open in new tab (`target="_blank"`)
- Skeleton loader while loading (not full-page skeleton)
- `Escape` keypress collapses the drill-down (keyboard accessible per NFR-006)

Data fetching uses a new `useDrillDown` hook.

### 3.6 ComparisonColumns

**File**: `frontend/src/components/reports/standard/ComparisonColumns.tsx`

Utility component that renders the comparison, variance ($), and variance (%) cells for a report row:

- Formats variance with `+`/`-` prefix
- Colours: `text-money-positive` (green) for favourable, `text-money-negative` (red) for unfavourable
- Accessibility: up-arrow or down-arrow icon accompanies colour (WCAG 1.4.1)
- Variance `%` shows "--" when comparison amount is zero

### 3.7 CSV Export Utility

**File**: `frontend/src/lib/csv-export.ts`

Frontend utility function:

```typescript
function exportReportCsv(config: {
  filename: string;       // e.g. "trial-balance_2026-04-01"
  headers: string[];
  rows: (string | number)[][];
}): void
```

- Amounts converted from cents to decimal dollars (divide by 100)
- No currency symbols — raw numbers for spreadsheet formulas
- Triggers browser download via `Blob` + `URL.createObjectURL`
- Filename format: `{report-type}_{YYYY-MM-DD}.csv`

### 3.8 Print Stylesheet

**File**: `frontend/src/app/globals.css` (append `@media print` block)

```css
@media print {
  /* Hide app chrome */
  [data-slot="sidebar"],
  [data-slot="header"],
  .report-toolbar,
  .report-export-buttons { display: none !important; }

  /* Show print header */
  .report-print-header { display: block !important; }

  /* Page setup */
  @page { margin: 15mm 10mm; }

  /* Landscape for wide reports */
  .report-print-landscape { @page { size: landscape; } }

  /* Table formatting */
  table { width: 100%; font-size: 10pt; }
  .tabular-nums { font-variant-numeric: tabular-nums; }
}
```

### 3.9 ReportPrintHeader

**File**: `frontend/src/components/reports/standard/ReportPrintHeader.tsx`

Hidden in normal view (`hidden print:block`). Shows:
- Workspace name (from workspace store)
- Report title
- Date range or "As at" date
- Comparison mode summary text (if active)

### 3.10 New TanStack Query Hooks

**File**: `frontend/src/hooks/use-reports.ts` (extend existing file)

New hooks to add:

```typescript
// Drill-down (lazy, called on row click)
function useDrillDown(accountId: number, startDate: string, endDate: string, cursor?: string)

// New reports
function useCashFlow(startDate?: string, endDate?: string, compareStartDate?: string, compareEndDate?: string)
function useAgedReceivables(asAtDate?: string)
function useAgedPayables(asAtDate?: string)
function useGstSummary(startDate?: string, endDate?: string, compareStartDate?: string, compareEndDate?: string)
function useAccountTransactions(accountId?: number, startDate?: string, endDate?: string, page?: number)
function useBudgetVsActual(budgetId?: number)

// Report presets
function useReportPresets()
function useCreateReportPreset()
function useUpdateReportPreset()
function useDeleteReportPreset()

// Extended existing hooks — add comparison params
function useTrialBalance(asAtDate?: string, compareAsAtDate?: string)
function useBalanceSheet(asAtDate?: string, compareAsAtDate?: string)
function useProfitAndLoss(from?: string, to?: string, compareFrom?: string, compareTo?: string, budgetId?: number)
```

### 3.11 New TypeScript Types

**File**: `frontend/src/types/index.ts` (extend)

```typescript
// Drill-down
interface DrillDownRow { ... }
interface DrillDownResponse { meta: DrillDownMeta; rows: DrillDownRow[]; has_more: boolean; next_cursor: string | null; }

// Aged Receivables/Payables
interface AgedRow { contact_id: number; contact_name: string; current: number; days_1_30: number; days_31_60: number; days_61_90: number; days_90_plus: number; total: number; }
interface AgedReport { as_at_date: string; rows: AgedRow[]; totals: { ... }; }
interface AgedDrillDownRow { invoice_number: string; date: string; due_date: string; total_amount: number; amount_due: number; }

// Cash Flow
interface CashFlowSection { category: string; accounts: CashFlowAccountRow[]; total: number; }
interface CashFlowReport { period: DatePeriod; sections: CashFlowSection[]; net_change: number; opening_cash: number; closing_cash: number; }

// GST Summary
interface GstSummaryReport { period: DatePeriod; gst_collected: number; gst_paid: number; net_gst: number; breakdown: GstBreakdownRow[]; }

// Budget vs Actual
interface BudgetVsActualRow { account_id: number; code: string; name: string; periods: BvaPeriod[]; ytd: BvaPeriod; }
interface BvaPeriod { budget: number; actual: number; variance: number; variance_percent: number | null; }

// Report Preset
interface ReportPreset { uuid: string; name: string; report_type: string; config: ReportPresetConfig; created_at: string; }
interface ReportPresetConfig { date_mode: string; date_preset: string; custom_start: string | null; custom_end: string | null; comparison_mode: string | null; filters: Record<string, unknown>; }
```

---

## 4. Report-by-Report Implementation

### 4.1 Trial Balance (Upgrade — P1)

**Current state**: `frontend/src/app/(dashboard)/reports/trial-balance/page.tsx` — basic table with single `SimpleDatePicker`. Backend reads from `AccountBalance` projector with no date filtering.

**Changes**:

- **Backend**: Extract inline logic from `ReportController::trialBalance()` into `GenerateTrialBalance` action. Add `as_at_date` param (compute from JE lines when specified, projector when not). Add `compare_as_at_date` param. Create `TrialBalanceRequest` form request with `report.trial-balance` permission.
- **Frontend**: Wrap in `ReportViewer` with `dateMode: 'point_in_time'`, `comparisonEnabled: true`, `comparisonModes: ['vs_prior_period', 'vs_same_period_last_year']`. Add comparison columns (Prior Debit, Prior Credit, Movement). Add drill-down on account rows. Add CSV export. Add print layout.
- **Hook**: Extend `useTrialBalance(asAtDate, compareAsAtDate)`.

### 4.2 Profit & Loss (Upgrade — P1)

**Current state**: `frontend/src/app/(dashboard)/reports/profit-and-loss/page.tsx` — basic table with From/To date pickers. Backend already supports comparison params but frontend does not use them.

**Changes**:

- **Backend**: Add optional `budget_id` param to `GenerateProfitAndLoss`. When provided, join `budget_lines` for each revenue/expense account and return budget amounts alongside actuals. The existing `formatSection()` method is extended with budget data.
- **Frontend**: Wrap in `ReportViewer` with `dateMode: 'period'`, `comparisonEnabled: true`, `comparisonModes: ['vs_prior_period', 'vs_same_period_last_year', 'vs_budget']`. Add comparison columns with variance highlighting (green for favourable, red for unfavourable — direction-aware: revenue above budget = green, expenses above budget = red). Add drill-down on account rows. Replace `SectionRows` component with shared `ReportSectionHeader` + `ReportAccountRow`.
- **Hook**: Extend `useProfitAndLoss(from, to, compareFrom, compareTo, budgetId)`.

### 4.3 Balance Sheet (Upgrade — P1)

**Current state**: `frontend/src/app/(dashboard)/reports/balance-sheet/page.tsx` — basic table with single date picker. No comparison.

**Changes**:

- **Backend**: Add `compare_as_at_date` param to `GenerateBalanceSheet`. Run `getBalancesAsAt()` and `calculateCurrentYearEarnings()` twice. Return comparison fields matching `GenerateProfitAndLoss` structure. Create modified `BalanceSheetRequest` accepting `compare_as_at_date`.
- **Frontend**: Wrap in `ReportViewer` with `dateMode: 'point_in_time'`, `comparisonEnabled: true`, `comparisonModes: ['vs_prior_period', 'vs_same_period_last_year', 'vs_budget']`. Add comparison columns for each section. Add drill-down. Replace `SectionRows` with shared components.
- **Hook**: Extend `useBalanceSheet(asAtDate, compareAsAtDate)`.

### 4.4 General Ledger (Upgrade — P1)

**Current state**: `frontend/src/app/(dashboard)/reports/general-ledger/page.tsx` — basic table with account selector and date pickers.

**Changes**:

- **Backend**: Add server-side pagination (50 per page) to `GenerateGeneralLedger` when a single account is selected. Add `page` and `per_page` params. Add 5,000 row cap for "All Accounts" mode with `truncated` flag in response. No comparison changes (GL is transaction-level).
- **Frontend**: Wrap in `ReportViewer` with `dateMode: 'period'`, `comparisonEnabled: false`, `drillDownEnabled: false` (GL already shows transaction detail). Add `extraToolbar` for the account `AccountCombobox` selector (reuse existing `frontend/src/components/financial/AccountCombobox.tsx`). Add pagination controls. Add CSV export (all pages). Add print layout.
- **Hook**: Extend `useGeneralLedger(accountId, from, to, page)`.

### 4.5 BAS Report (Upgrade — P1)

**Current state**: `frontend/src/app/(dashboard)/reports/bas/page.tsx`. Already functional.

**Changes**:

- **Frontend only**: Wrap in `ReportViewer` with `dateMode: 'period'`, `comparisonEnabled: false` (BAS is a compliance report, comparison not applicable), `drillDownEnabled: false`. Add CSV export. Add print layout. No backend changes needed.

### 4.6 Cash Flow Statement (New — P2)

**Backend**: New `GenerateCashFlow` action. Queries posted JE lines for accounts with a `cash_flow_category` value, grouped by category. Computes net cash movement per account. Calculates opening/closing cash balance from bank-type accounts. Supports comparison params.

**Frontend**: New page at `frontend/src/app/(dashboard)/reports/cash-flow/page.tsx` (currently a "Coming Soon" placeholder). Uses `ReportViewer` with `dateMode: 'period'`, `comparisonEnabled: true`, `drillDownEnabled: true`. Three collapsible sections (Operating, Investing, Financing) with account-level breakdown.

**Prerequisite**: `cash_flow_category` migration and CoA seeder update (see Section 6).

### 4.7 Aged Receivables (New — P2)

**Backend**: New `GenerateAgedReceivables` action. Queries `invoices` where `type = 'invoice'`, `status IN ('sent', 'overdue', 'partial')`, calculates aging buckets based on `due_date` vs `as_at_date`. Groups by `contact_id` with invoice-level drill-down.

**Frontend**: New page at `frontend/src/app/(dashboard)/reports/aged-receivables/page.tsx`. Uses `ReportViewer` with `dateMode: 'point_in_time'`, `comparisonEnabled: false`, `drillDownEnabled: true` (drill-down shows individual invoices, not JE lines). Custom drill-down renders invoice rows, not the standard JE line drill-down.

### 4.8 Aged Payables (New — P2)

**Backend**: New `GenerateAgedPayables` action. Mirror of Aged Receivables for `type = 'bill'`.

**Frontend**: New page at `frontend/src/app/(dashboard)/reports/aged-payables/page.tsx`. Same structure as Aged Receivables.

### 4.9 GST Summary (New — P2)

**Backend**: New `GenerateGstSummary` action. Reuses the JE line + tax code join pattern from `GenerateBasReport` (`app/Actions/Tax/GenerateBasReport.php`). Returns simplified output: total GST collected, total GST paid, net GST, breakdown by tax code.

**Frontend**: New page at `frontend/src/app/(dashboard)/reports/gst-summary/page.tsx`. Uses `ReportViewer` with `dateMode: 'period'`, `comparisonEnabled: true` (vs prior quarter), `drillDownEnabled: false`.

### 4.10 Account Transactions (New — P2)

**Backend**: New `GenerateAccountTransactions` action. Single-account transaction list with opening balance, running balance, closing balance. Server-side pagination (100 per page, cursor-based). Very similar to `GenerateGeneralLedger` single-account mode with dedicated pagination.

**Frontend**: New page at `frontend/src/app/(dashboard)/reports/account-transactions/page.tsx`. Uses `ReportViewer` with `dateMode: 'period'`, `comparisonEnabled: false`, `drillDownEnabled: false`. Account selector in `extraToolbar` via `AccountCombobox`. Pagination controls at table footer.

### 4.11 Budget vs Actual (New — P2)

**Backend**: New `GenerateBudgetVsActual` action. Accepts `budget_id`. Joins `budget_lines` (grouped by `chart_account_id` and `period`) with actual JE line aggregates for matching accounts and date ranges. Returns per-account, per-period columns with budget/actual/variance.

**Frontend**: New page at `frontend/src/app/(dashboard)/reports/budget-vs-actual/page.tsx`. Uses `ReportViewer` with `dateMode: 'period'` (auto-set to budget's fiscal year range), `comparisonEnabled: false`, `drillDownEnabled: true`. Budget selector dropdown in `extraToolbar`. 12 month columns with Budget/Actual/Variance sub-columns. On `< lg` screens, only YTD summary shown with expand option. Print uses landscape with condensed font.

---

## 5. Shared Infrastructure

### 5.1 Date Presets

Frontend-only calculation in `useDatePresets` hook. Presets available:

| Preset Key | Label | Period Mode Resolution | Point-in-Time Resolution |
|------------|-------|----------------------|--------------------------|
| `this_month` | This Month | 1st to last day of current month | Last day of current month |
| `last_month` | Last Month | 1st to last day of prior month | Last day of prior month |
| `this_quarter` | This Quarter | 1st day of current quarter to today | Today |
| `last_quarter` | Last Quarter | Full prior calendar quarter | Last day of prior quarter |
| `this_financial_year` | This Financial Year | FY start to FY end (using `fiscal_year_start_month`) | Today |
| `last_financial_year` | Last Financial Year | Prior full FY | Last day of prior FY |
| `year_to_date` | Year to Date | FY start to today | Today |
| `custom` | Custom | User-selected From/To | User-selected date |

Default preset on first load: `this_financial_year` for period reports, today for point-in-time.

### 5.2 Comparison Period Calculation

Handled by `resolveComparisonRange()` in `useDatePresets`:

- **vs Prior Period**: Comparison period has the same length as current, immediately preceding. For preset-based ranges, uses the natural prior unit (prior month for "This Month", prior quarter for "This Quarter", prior FY for "This FY"). For custom ranges, subtracts the range length in days.
- **vs Same Period Last Year**: Subtracts one year from both start and end dates.
- **vs Budget**: Frontend passes `budget_id` to the API. The backend joins budget data. The comparison date range is the budget's fiscal year (auto-determined from the selected budget).

### 5.3 CSV Generation

Frontend-only. The `exportReportCsv()` utility in `frontend/src/lib/csv-export.ts`:

1. Accepts headers array and rows array (matching visible table columns)
2. Converts cent amounts to decimal dollars (`amount / 100`)
3. Handles special characters (quotes, commas) via proper CSV escaping
4. Generates `Blob` with `text/csv` MIME type
5. Triggers download via temporary `<a>` element with `download` attribute
6. Filename: `{report-slug}_{today YYYY-MM-DD}.csv`

Each report page defines its own `buildCsvData()` function that maps report data to the CSV format, including comparison columns when active.

### 5.4 Print Styles (`@media print`)

Added to `frontend/src/app/globals.css`:

- Hide sidebar (`[data-slot="sidebar"]`), header (`[data-slot="header"]`), toolbar controls, and export buttons
- Show `ReportPrintHeader` component (hidden in normal view via `hidden print:block`)
- Page margins: `@page { margin: 15mm 10mm; }`
- Reports with 5+ columns add `.report-print-landscape` class: `@page { size: landscape; }`
- Table font size reduced to 10pt for print density
- Page numbers via `@page` counter-increment rules (Chrome/Firefox support)
- Expanded drill-down sections are included in print; collapsed sections are excluded

### 5.5 Keyboard Shortcuts

- `Escape` — collapse open drill-down (handled by `ReportViewer` via `useHotkeys`)
- `Cmd+P` / `Ctrl+P` — browser default print (not intercepted, just works)
- Standard navigation shortcuts (`G then F` for reports, etc.) already handled globally

---

## 6. Database Changes

### 6.1 `report_presets` Table (New)

**Migration**: `database/migrations/2026_04_XX_000001_create_report_presets_table.php`

```php
Schema::create('report_presets', function (Blueprint $table) {
    $table->id();
    $table->string('uuid', 36)->unique();
    $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('name', 255);
    $table->string('report_type', 50); // enum: trial_balance, profit_and_loss, etc.
    $table->json('config');
    $table->timestamps();

    $table->index(['workspace_id', 'user_id']);
});
```

### 6.2 `cash_flow_category` Column on `chart_accounts` (New)

**Migration**: `database/migrations/2026_04_XX_000002_add_cash_flow_category_to_chart_accounts.php`

```php
Schema::table('chart_accounts', function (Blueprint $table) {
    $table->string('cash_flow_category', 20)->nullable()->after('sub_type');
    // Values: 'operating', 'investing', 'financing'
});
```

**Enum**: `app/Enums/CashFlowCategory.php`

```php
enum CashFlowCategory: string
{
    case Operating = 'operating';
    case Investing = 'investing';
    case Financing = 'financing';
}
```

**Default inference logic** (applied in CoA seeders and as a one-time backfill in the migration):

| AccountType / SubType | Default Category |
|----------------------|------------------|
| Asset / `bank`, `cash` | Operating |
| Asset / `accounts_receivable` | Operating |
| Asset / `fixed_asset`, `motor_vehicle`, `computer_equipment`, `office_equipment`, `accumulated_depreciation` | Investing |
| Asset / `investment`, `listed_securities`, `cryptocurrency`, `managed_funds`, `investment_property` | Investing |
| Liability / `accounts_payable`, `current_liability`, `gst_collected` | Operating |
| Liability / `non_current_liability`, `term_liability` | Financing |
| Equity / all | Financing |
| Revenue / all | Operating |
| Expense / all | Operating |

### 6.3 Model Update: `ChartAccount`

Add `cash_flow_category` to `$fillable` and `casts` in `app/Models/Tenant/ChartAccount.php`:

```php
protected $fillable = [
    // ... existing
    'cash_flow_category',
];

protected function casts(): array
{
    return [
        // ... existing
        'cash_flow_category' => CashFlowCategory::class,
    ];
}
```

---

## 7. Task Breakdown

Tasks are ordered by dependency. Tasks within the same phase can be parallelised.

### Phase 1: Shared Infrastructure (P1 foundation — no report pages changed yet)

| # | Task | Files | Depends On | Est |
|---|------|-------|------------|-----|
| 1.1 | Create `useDatePresets` hook with fiscal year support | `frontend/src/hooks/use-date-presets.ts` | -- | 0.5d |
| 1.2 | Create `exportReportCsv` utility | `frontend/src/lib/csv-export.ts` | -- | 0.25d |
| 1.3 | Create `ReportPrintHeader` component | `frontend/src/components/reports/standard/ReportPrintHeader.tsx` | -- | 0.25d |
| 1.4 | Add `@media print` styles to globals.css | `frontend/src/app/globals.css` | -- | 0.25d |
| 1.5 | Create `DatePresetSelector` component | `frontend/src/components/reports/standard/DatePresetSelector.tsx` | 1.1 | 0.5d |
| 1.6 | Create `ComparisonColumns` component (variance display) | `frontend/src/components/reports/standard/ComparisonColumns.tsx` | -- | 0.5d |
| 1.7 | Create `ReportStandardToolbar` component | `frontend/src/components/reports/standard/ReportStandardToolbar.tsx` | 1.5, 1.6 | 0.5d |
| 1.8 | Create `ReportViewer` layout component | `frontend/src/components/reports/standard/ReportViewer.tsx` | 1.7, 1.2, 1.3, 1.4 | 1d |
| 1.9 | Create `DrillDownAccordion` component with pagination | `frontend/src/components/reports/standard/DrillDownAccordion.tsx` | -- | 0.5d |
| 1.10 | Add new TypeScript types for all reports | `frontend/src/types/index.ts` | -- | 0.5d |
| 1.11 | Add `useDrillDown` hook with cursor pagination | `frontend/src/hooks/use-reports.ts` | 1.10 | 0.25d |

### Phase 2: Backend — Trial Balance Refactor & Drill-Down Pagination (P1)

| # | Task | Files | Depends On | Est |
|---|------|-------|------------|-----|
| 2.1 | Create `GenerateTrialBalance` action (extract from controller) | `app/Actions/Reporting/GenerateTrialBalance.php` | -- | 0.5d |
| 2.2 | Create `TrialBalanceRequest` form request | `app/Http/Requests/Report/TrialBalanceRequest.php` | -- | 0.25d |
| 2.3 | Refactor `ReportController::trialBalance()` to use action | `app/Http/Controllers/Api/ReportController.php` | 2.1, 2.2 | 0.25d |
| 2.4 | Add comparison to `GenerateBalanceSheet` | `app/Actions/Reporting/GenerateBalanceSheet.php`, `app/Http/Requests/Report/BalanceSheetRequest.php` | -- | 0.5d |
| 2.5 | Add cursor pagination to `DrillDownReportCell` | `app/Actions/Reporting/DrillDownReportCell.php` | -- | 0.5d |
| 2.6 | Create `DrillDownRequest` and wire drill-down route | `app/Http/Requests/Report/DrillDownRequest.php`, `app/Http/Controllers/Api/ReportController.php`, `routes/api.php` | 2.5 | 0.25d |
| 2.7 | Add `budget_id` support to `GenerateProfitAndLoss` for vs Budget comparison | `app/Actions/Reporting/GenerateProfitAndLoss.php` | -- | 0.5d |
| 2.8 | Add pagination to `GenerateGeneralLedger` | `app/Actions/Reporting/GenerateGeneralLedger.php` | -- | 0.5d |
| 2.9 | Write feature tests for TB refactor, BS comparison, drill-down pagination | `tests/Feature/Api/ReportTest.php` | 2.3, 2.4, 2.6 | 1d |

### Phase 3: Frontend — Upgrade Existing Reports (P1)

| # | Task | Files | Depends On | Est |
|---|------|-------|------------|-----|
| 3.1 | Upgrade Trial Balance page with ReportViewer | `frontend/src/app/(dashboard)/reports/trial-balance/page.tsx` | 1.8, 2.3 | 0.5d |
| 3.2 | Upgrade P&L page with ReportViewer, comparison, drill-down | `frontend/src/app/(dashboard)/reports/profit-and-loss/page.tsx` | 1.8, 2.7 | 0.75d |
| 3.3 | Upgrade Balance Sheet page with ReportViewer, comparison | `frontend/src/app/(dashboard)/reports/balance-sheet/page.tsx` | 1.8, 2.4 | 0.5d |
| 3.4 | Upgrade General Ledger page with ReportViewer, pagination | `frontend/src/app/(dashboard)/reports/general-ledger/page.tsx` | 1.8, 2.8 | 0.5d |
| 3.5 | Upgrade BAS Report page with ReportViewer (frontend only) | `frontend/src/app/(dashboard)/reports/bas/page.tsx` | 1.8 | 0.25d |
| 3.6 | Extend `use-reports.ts` hooks with comparison params | `frontend/src/hooks/use-reports.ts` | 1.10 | 0.5d |
| 3.7 | Write browser tests for upgraded report pages | `tests/Browser/ReportingTest.php` | 3.1-3.5 | 1d |

### Phase 4: Backend — New Report Actions (P2)

| # | Task | Files | Depends On | Est |
|---|------|-------|------------|-----|
| 4.1 | Create `cash_flow_category` migration + enum + model update | `database/migrations/...`, `app/Enums/CashFlowCategory.php`, `app/Models/Tenant/ChartAccount.php` | -- | 0.5d |
| 4.2 | Create `GenerateCashFlow` action + request + route | `app/Actions/Reporting/GenerateCashFlow.php`, `app/Http/Requests/Report/CashFlowRequest.php` | 4.1 | 1d |
| 4.3 | Create `GenerateAgedReceivables` action + request + route | `app/Actions/Reporting/GenerateAgedReceivables.php`, `app/Http/Requests/Report/AgedReceivablesRequest.php` | -- | 0.75d |
| 4.4 | Create `GenerateAgedPayables` action + request + route | `app/Actions/Reporting/GenerateAgedPayables.php`, `app/Http/Requests/Report/AgedPayablesRequest.php` | -- | 0.5d |
| 4.5 | Create `GenerateGstSummary` action + request + route | `app/Actions/Reporting/GenerateGstSummary.php`, `app/Http/Requests/Report/GstSummaryRequest.php` | -- | 0.5d |
| 4.6 | Create `GenerateAccountTransactions` action + request + route | `app/Actions/Reporting/GenerateAccountTransactions.php`, `app/Http/Requests/Report/AccountTransactionsRequest.php` | -- | 0.5d |
| 4.7 | Create `GenerateBudgetVsActual` action + request + route | `app/Actions/Reporting/GenerateBudgetVsActual.php`, `app/Http/Requests/Report/BudgetVsActualRequest.php` | -- | 0.75d |
| 4.8 | Wire all new routes in `routes/api.php` | `routes/api.php`, `app/Http/Controllers/Api/ReportController.php` | 4.2-4.7 | 0.25d |
| 4.9 | Write feature tests for all new report endpoints | `tests/Feature/Api/ReportNewTest.php` | 4.8 | 1.5d |

### Phase 5: Backend — Report Presets CRUD (P2)

| # | Task | Files | Depends On | Est |
|---|------|-------|------------|-----|
| 5.1 | Create `report_presets` migration | `database/migrations/...` | -- | 0.25d |
| 5.2 | Create `ReportPreset` model | `app/Models/Tenant/ReportPreset.php` | 5.1 | 0.25d |
| 5.3 | Create `ReportPresetController` with CRUD + 20-preset limit | `app/Http/Controllers/Api/ReportPresetController.php` | 5.2 | 0.5d |
| 5.4 | Create form requests for presets | `app/Http/Requests/Report/StoreReportPresetRequest.php`, `app/Http/Requests/Report/UpdateReportPresetRequest.php` | 5.2 | 0.25d |
| 5.5 | Wire preset routes in `routes/api.php` | `routes/api.php` | 5.3, 5.4 | 0.1d |
| 5.6 | Write feature tests for preset CRUD | `tests/Feature/Api/ReportPresetTest.php` | 5.5 | 0.5d |

### Phase 6: Frontend — New Report Pages (P2)

| # | Task | Files | Depends On | Est |
|---|------|-------|------------|-----|
| 6.1 | Build Cash Flow Statement page | `frontend/src/app/(dashboard)/reports/cash-flow/page.tsx` | 1.8, 4.2 | 0.75d |
| 6.2 | Build Aged Receivables page (with invoice drill-down) | `frontend/src/app/(dashboard)/reports/aged-receivables/page.tsx` | 1.8, 4.3 | 0.75d |
| 6.3 | Build Aged Payables page | `frontend/src/app/(dashboard)/reports/aged-payables/page.tsx` | 1.8, 4.4 | 0.5d |
| 6.4 | Build GST Summary page | `frontend/src/app/(dashboard)/reports/gst-summary/page.tsx` | 1.8, 4.5 | 0.5d |
| 6.5 | Build Account Transactions page | `frontend/src/app/(dashboard)/reports/account-transactions/page.tsx` | 1.8, 4.6 | 0.5d |
| 6.6 | Build Budget vs Actual page | `frontend/src/app/(dashboard)/reports/budget-vs-actual/page.tsx` | 1.8, 4.7 | 1d |
| 6.7 | Add new report hooks to `use-reports.ts` | `frontend/src/hooks/use-reports.ts` | 1.10, 4.8 | 0.5d |

### Phase 7: Frontend — Presets & Index Upgrade (P2)

| # | Task | Files | Depends On | Est |
|---|------|-------|------------|-----|
| 7.1 | Add preset hooks (`useReportPresets`, mutations) | `frontend/src/hooks/use-reports.ts` | 5.5 | 0.25d |
| 7.2 | Create `SavePresetDialog` component | `frontend/src/components/reports/standard/SavePresetDialog.tsx` | 7.1 | 0.5d |
| 7.3 | Integrate save/load preset into `ReportViewer` | `frontend/src/components/reports/standard/ReportViewer.tsx` | 7.2 | 0.5d |
| 7.4 | Upgrade reports index page with new groups + saved presets section | `frontend/src/app/(dashboard)/reports/page.tsx` | 7.1, 6.1-6.6 | 0.5d |
| 7.5 | Write browser tests for new report pages and presets | `tests/Browser/ReportingNewTest.php` | 6.1-6.6, 7.4 | 1d |

### Phase 8: Polish (P3)

| # | Task | Files | Depends On | Est |
|---|------|-------|------------|-----|
| 8.1 | Multi-period comparison (up to 12 months side-by-side) | `ReportViewer`, `ReportStandardToolbar`, hooks | 3.2 | 1.5d |
| 8.2 | Print layout QA and refinement (Chrome, Safari, Firefox) | `globals.css`, `ReportPrintHeader` | 3.1-3.5 | 1d |
| 8.3 | Report scheduling (email PDF delivery) | Backend + frontend | 043-CRB infrastructure | 2d |

### Estimated Total

| Phase | Effort |
|-------|--------|
| Phase 1: Shared Infrastructure | 4.5d |
| Phase 2: Backend P1 | 4.25d |
| Phase 3: Frontend P1 | 4d |
| Phase 4: Backend P2 new reports | 5.75d |
| Phase 5: Backend P2 presets | 1.85d |
| Phase 6: Frontend P2 new pages | 4d |
| Phase 7: Frontend P2 presets + index | 2.75d |
| Phase 8: P3 polish | 4.5d |
| **Total** | **~31.5d** |

P1 (Phases 1-3): ~12.75 days
P2 (Phases 4-7): ~14.35 days
P3 (Phase 8): ~4.5 days

---

## Appendix: File Inventory

### New Files (Backend)

```
app/Actions/Reporting/GenerateTrialBalance.php
app/Actions/Reporting/GenerateCashFlow.php
app/Actions/Reporting/GenerateAgedReceivables.php
app/Actions/Reporting/GenerateAgedPayables.php
app/Actions/Reporting/GenerateGstSummary.php
app/Actions/Reporting/GenerateAccountTransactions.php
app/Actions/Reporting/GenerateBudgetVsActual.php
app/Enums/CashFlowCategory.php
app/Http/Controllers/Api/ReportPresetController.php
app/Http/Requests/Report/TrialBalanceRequest.php
app/Http/Requests/Report/DrillDownRequest.php
app/Http/Requests/Report/CashFlowRequest.php
app/Http/Requests/Report/AgedReceivablesRequest.php
app/Http/Requests/Report/AgedPayablesRequest.php
app/Http/Requests/Report/GstSummaryRequest.php
app/Http/Requests/Report/AccountTransactionsRequest.php
app/Http/Requests/Report/BudgetVsActualRequest.php
app/Http/Requests/Report/StoreReportPresetRequest.php
app/Http/Requests/Report/UpdateReportPresetRequest.php
app/Models/Tenant/ReportPreset.php
database/migrations/2026_04_XX_000001_create_report_presets_table.php
database/migrations/2026_04_XX_000002_add_cash_flow_category_to_chart_accounts.php
tests/Feature/Api/ReportNewTest.php
tests/Feature/Api/ReportPresetTest.php
tests/Browser/ReportingNewTest.php
```

### New Files (Frontend)

```
frontend/src/components/reports/standard/ReportViewer.tsx
frontend/src/components/reports/standard/ReportStandardToolbar.tsx
frontend/src/components/reports/standard/DatePresetSelector.tsx
frontend/src/components/reports/standard/ComparisonColumns.tsx
frontend/src/components/reports/standard/DrillDownAccordion.tsx
frontend/src/components/reports/standard/ReportPrintHeader.tsx
frontend/src/components/reports/standard/SavePresetDialog.tsx
frontend/src/hooks/use-date-presets.ts
frontend/src/lib/csv-export.ts
frontend/src/app/(dashboard)/reports/aged-receivables/page.tsx
frontend/src/app/(dashboard)/reports/aged-payables/page.tsx
frontend/src/app/(dashboard)/reports/gst-summary/page.tsx
frontend/src/app/(dashboard)/reports/account-transactions/page.tsx
frontend/src/app/(dashboard)/reports/budget-vs-actual/page.tsx
```

### Modified Files

```
app/Http/Controllers/Api/ReportController.php — add 7 new methods + refactor trialBalance
app/Actions/Reporting/GenerateBalanceSheet.php — add comparison support
app/Actions/Reporting/GenerateProfitAndLoss.php — add budget_id param
app/Actions/Reporting/GenerateGeneralLedger.php — add pagination
app/Actions/Reporting/DrillDownReportCell.php — add cursor pagination
app/Models/Tenant/ChartAccount.php — add cash_flow_category to fillable/casts
app/Http/Requests/Report/BalanceSheetRequest.php — add compare_as_at_date
routes/api.php — add 11 new routes
frontend/src/hooks/use-reports.ts — extend existing hooks + add new hooks
frontend/src/types/index.ts — add new report types
frontend/src/app/globals.css — add @media print styles
frontend/src/app/(dashboard)/reports/page.tsx — add new report groups + saved presets section
frontend/src/app/(dashboard)/reports/trial-balance/page.tsx — refactor to use ReportViewer
frontend/src/app/(dashboard)/reports/profit-and-loss/page.tsx — refactor to use ReportViewer
frontend/src/app/(dashboard)/reports/balance-sheet/page.tsx — refactor to use ReportViewer
frontend/src/app/(dashboard)/reports/general-ledger/page.tsx — refactor to use ReportViewer
frontend/src/app/(dashboard)/reports/bas/page.tsx — refactor to use ReportViewer
frontend/src/app/(dashboard)/reports/cash-flow/page.tsx — replace Coming Soon with real implementation
tests/Feature/Api/ReportTest.php — add tests for TB refactor, BS comparison, drill-down
```
