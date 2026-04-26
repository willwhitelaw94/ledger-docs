---
title: "Implementation Plan: Tracking Dimensions"
---

# Implementation Plan: Tracking Dimensions

**Branch**: `feature/097-tdm-tracking-dimensions` | **Date**: 2026-04-01 | **Spec**: [spec.md](/initiatives/FL-financial-ledger/097-TDM-tracking-dimensions/spec)
**Scope**: P1 Backend + Frontend (US1-US3, US7), P2 Backend + Frontend (US4-US6)

## Summary

Elevates the existing `TrackingCategory` / `TrackingOption` model pair from basic job-adjacent CRUD into a first-class analytical dimension system. Workspaces can define up to 5 custom dimensions (Region, Department, Cost Centre, etc.) with named values. Dimension values are stored as denormalised JSON on `journal_entry_lines` and `invoice_lines`, validated against active options, and flow through invoice-to-JE propagation. Reports (P&L, BS, TB, GL) gain dimension filter and group-by capabilities using PostgreSQL `jsonb` operators backed by GIN indexes. Bulk tagging lets users retroactively classify posted JE lines. A new `TrackingDimensionController` replaces the 3 existing routes on `JobController`.

## Technical Context

**Language/Version**: PHP 8.4 (Laravel 12)
**Primary Dependencies**: Lorisleiva Actions, Spatie laravel-event-sourcing v7 (existing), PostgreSQL jsonb operators
**Storage**: PostgreSQL, single-database multi-tenancy via `workspace_id` scoping
**Testing**: Pest v4 (feature tests)
**Target Platform**: Laravel API consumed by Next.js 16 frontend
**Constraints**: Report queries < 2s for 100k JE lines, GIN indexes required, dimension rename sync/async threshold at 10,000 lines
**Scale**: Up to 5 dimensions per workspace, ~20 options per dimension typical, 100k+ JE lines per workspace

## Gate 3: Architecture Check

### 1. Technical Feasibility

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | Extends existing models (`TrackingCategory`, `TrackingOption`). New dedicated controller. JSON storage on transaction lines with GIN indexes for query performance |
| Existing patterns leveraged | PASS | Lorisleiva Actions, Form Requests, API Resources, existing `tracking` column on `journal_entry_lines`, existing model pair from 008-JCT |
| No impossible requirements | PASS | All FRs implementable with current stack. PostgreSQL `jsonb` operators handle filter/group queries. `jsonb_set()` handles bulk tagging |
| Performance considered | PASS | GIN indexes on both `journal_entry_lines.tracking` and `invoice_lines.tracking`. Per-value aggregation queries acceptable at < 20 dimension values |
| Security considered | PASS | Workspace-scoped. Dimension management gated by `workspace.settings` permission. Transaction tagging follows parent transaction permissions |

### 2. Data & Integration

| Check | Status | Notes |
|-------|--------|-------|
| Data model understood | PASS | No new tables. 1 column addition (`invoice_lines.tracking`). 2 GIN indexes. Existing `TrackingCategory` and `TrackingOption` models reused |
| API contracts clear | PASS | 1 new controller (`TrackingDimensionController`) with 8 resource endpoints + 1 bulk-tag endpoint. Replaces 3 existing routes on `JobController` |
| Dependencies identified | PASS | 002-CLE (complete), 003-AUT (complete), 005-IAR (complete), 007-FRC (complete), 008-JCT (complete), 046-DMI (complete), 055-ACF (complete) |
| Integration points mapped | PASS | Report actions (`GenerateProfitAndLoss`, `GenerateBalanceSheet`, `GenerateGeneralLedger`, `trialBalance`), invoice approval flow, CSV import/export, repeating templates |
| DTO persistence explicit | PASS | Form Request `validated()` to Action params. Tracking JSON is a flat `{string: string}` map -- no DTO needed |

### 3. Implementation Approach

| Check | Status | Notes |
|-------|--------|-------|
| File changes identified | PASS | See File Manifest below |
| Risk areas noted | PASS | Primary risk: dimension rename cascading across large JSON datasets. Mitigated by sync/async threshold (10k lines) and idempotent queued job |
| Testing approach defined | PASS | Feature tests for CRUD, validation, bulk tagging, report filtering/grouping, tenant isolation, cascading renames |
| Rollback possible | PASS | Migration adds one nullable column + indexes. All changes are additive. Rolling back removes the column and indexes |

### 4. Laravel Best Practices

| Check | Status | Notes |
|-------|--------|-------|
| Use Lorisleiva Actions | PASS | All business logic in `app/Actions/TrackingDimension/` |
| Form Requests for validation | PASS | Every mutation endpoint has a Form Request in `app/Http/Requests/TrackingDimension/` |
| API Resources for responses | PASS | `TrackingDimensionResource`, `TrackingOptionResource` |
| Model route binding | PASS | Integer ID binding via `findOrFail()` with workspace scoping |
| Sanctum cookie auth | PASS | All routes under `auth:sanctum` + `SetWorkspaceContext` middleware |
| Migrations schema-only | PASS | One migration for `invoice_lines.tracking` column + GIN indexes |

### 5. Event Sourcing Standards

| Check | Status | Notes |
|-------|--------|-------|
| Aggregate roots identified | N/A | No new aggregates. Tracking dimensions are configuration data (Eloquent CRUD). Transaction tagging is metadata on existing event-sourced JE/Invoice lines |
| Events are granular facts | N/A | No new stored events. Dimension values are carried in existing event payloads (`JournalEntryCreated`, `InvoiceCreated`) via the `tracking` field on lines |
| Projectors identified | PASS | Existing `JournalEntryProjector` and `InvoiceProjector` already handle `tracking` passthrough (JE) or need `tracking` added to line mapping (Invoice) |

### 6. Multi-Tenancy Standards

| Check | Status | Notes |
|-------|--------|-------|
| All models scoped | PASS | `TrackingCategory` already has `workspace_id`. `TrackingOption` scoped via `tracking_category_id` FK. All queries include workspace constraint |
| Central vs tenant separation clear | PASS | All tracking tables are workspace-scoped (tenant). No central tables |
| No cross-tenant queries | PASS | Every query constrains by `workspace_id`. Validation rule verifies dimensions belong to current workspace |
| Tenant context set in middleware | PASS | Routes behind `SetWorkspaceContext` middleware |
| Tests verify isolation | PASS | Test plan includes cross-workspace isolation tests |

### Overall: PASS -- No red flags

---

## Architecture Overview

### Dimension Data Flow

```
Settings (CRUD)                    Transaction Entry                    Reporting
─────────────────                  ──────────────────                   ─────────
TrackingCategory ──┐               JournalEntryLine                    P&L / BS / TB / GL
  name: "Region"   │               ┌──────────────────────┐            ┌────────────────────┐
  workspace_id     │               │ chart_account_id: 42  │            │ Filter:            │
  is_active: true  │               │ direction: debit      │            │   tracking->>'Region'│
                   │               │ amount: 150000        │            │   = 'NSW'           │
TrackingOption ────┘               │ tracking: {           │            │                     │
  name: "NSW"                      │   "Region": "NSW",   │──────────▶│ Group by:           │
  name: "VIC"                      │   "Department": "Eng" │            │   tracking->>'Region'│
  name: "QLD"                      │ }                     │            │   → NSW | VIC | QLD │
                                   └──────────────────────┘            │     | Unallocated   │
                                                                       └────────────────────┘
```

### Tracking JSON Schema

Keys are dimension names (strings matching `tracking_categories.name`). Values are option names (strings matching `tracking_options.name`). This denormalised approach avoids joins during report aggregation queries.

```json
{"Region": "NSW", "Department": "Engineering"}   // Two dimensions
{"Cost Centre": "CC-100"}                          // One dimension
null                                                // Untagged
```

Normalisation rule: `{}` is normalised to `null` on save. Both `null` and missing keys are treated as "untagged" for that dimension.

### Controller Migration

The 3 existing routes on `JobController` (`trackingCategories`, `storeTrackingCategory`, `storeTrackingOption`) are removed and replaced by a dedicated `TrackingDimensionController` with full CRUD. The old `StoreTrackingCategoryRequest` and `StoreTrackingOptionRequest` under `Requests/Job/` are deleted. The new controller uses `workspace.settings` permission for mutations and `job.view` for reads (reusing the existing permission to avoid a migration burden).

### Report Integration Architecture

Reports add optional `tracking_dimension` and `tracking_value` query parameters for filtering, plus `group_by_dimension` (P&L only) for columnar breakdown.

**Filtering**: Each report action's aggregation query gains a conditional `WHERE journal_entry_lines.tracking->>'{dimension}' = '{value}'` clause when tracking filter parameters are provided.

**Grouping (P&L only)**: The `GenerateProfitAndLoss::handle()` method, when `group_by_dimension` is provided, calls `aggregateByAccount()` once per option value (plus once for "Unallocated" where the key is null/missing). The result is a columnar structure with per-value P&L data plus a Total column. This reuses the existing `aggregateByAccount()` with an additional WHERE clause, avoiding a complex pivot refactor.

**Trial Balance**: When filtered by dimension, the trial balance recomputes from filtered `journal_entry_lines` rather than using the pre-computed `account_balances` table, since account balances do not store per-dimension breakdowns.

**Balance Sheet**: Supports filtering only, not grouping. Grouping a BS by dimension produces columns that do not individually balance (Assets = Liabilities + Equity), which would be misleading.

### Invoice-to-JE Tracking Propagation

When an invoice/bill is approved and generates journal entries:
1. The `InvoiceCreated` event payload already carries line data -- `tracking` must be included in the line array
2. The `InvoiceProjector::onInvoiceCreated()` creates `InvoiceLine` records -- add `tracking` to the `InvoiceLine::create()` call
3. When the approval action creates JE lines from invoice lines, the `tracking` JSON is copied from each `InvoiceLine` to the corresponding `JournalEntryLine`
4. Reversals copy the original line's tracking values to the reversal lines

### Bulk Tagging Strategy

Bulk tagging uses PostgreSQL `jsonb_set()` in a single UPDATE query:

```sql
UPDATE journal_entry_lines
SET tracking = jsonb_set(COALESCE(tracking, '{}'), '{Region}', '"NSW"')
WHERE id IN (1, 2, 3, 4, 5)
  AND journal_entry_id IN (
    SELECT id FROM journal_entries WHERE workspace_id = ?
  )
```

To clear a dimension value (untag):

```sql
UPDATE journal_entry_lines
SET tracking = tracking - 'Region'
WHERE id IN (1, 2, 3, 4, 5)
  AND journal_entry_id IN (
    SELECT id FROM journal_entries WHERE workspace_id = ?
  )
```

Both operations execute within a single database transaction. An `ActivityItem` is created to audit the operation.

### Dimension Rename Cascade

When a dimension name is renamed (e.g., "Region" to "Sales Region"), all `tracking` JSON keys on existing lines must be updated across both `journal_entry_lines` and `invoice_lines` tables.

```sql
-- PostgreSQL JSON key rename via remove old key + set new key
UPDATE journal_entry_lines
SET tracking = (tracking - 'Region') || jsonb_build_object('Sales Region', tracking->>'Region')
WHERE tracking ? 'Region'
  AND journal_entry_id IN (
    SELECT id FROM journal_entries WHERE workspace_id = ?
  )
```

**Threshold**: Count affected rows across both tables. If combined count <= 10,000, execute synchronously and return `200 OK`. If > 10,000, dispatch a `RenameDimensionJob` on the default queue and return `202 Accepted`.

Option value renames follow the same pattern with `jsonb_set()` on matching values.

---

## Database Migrations

### Migration 1: `add_tracking_to_invoice_lines_table`

```php
Schema::table('invoice_lines', function (Blueprint $table) {
    $table->json('tracking')->nullable()->after('sort_order');
});
```

### Migration 2: `add_gin_indexes_to_tracking_columns`

```php
// Raw SQL for GIN indexes -- Blueprint does not support jsonb_path_ops
DB::statement('CREATE INDEX idx_je_lines_tracking ON journal_entry_lines USING GIN (tracking jsonb_path_ops)');
DB::statement('CREATE INDEX idx_invoice_lines_tracking ON invoice_lines USING GIN (tracking jsonb_path_ops)');
```

The `jsonb_path_ops` operator class is optimal for containment queries (`@>`) which are used in report filtering and "in use" checks.

No new tables are needed. The existing `tracking_categories` and `tracking_options` tables are sufficient.

---

## File Manifest

### New Files

**Actions** (6 files):
- `app/Actions/TrackingDimension/CreateTrackingDimension.php` -- Create dimension with limit enforcement (max 5), workspace-scoped name uniqueness
- `app/Actions/TrackingDimension/UpdateTrackingDimension.php` -- Update name/status, cascade rename if name changed
- `app/Actions/TrackingDimension/DeleteTrackingDimension.php` -- Delete with "in use" guard
- `app/Actions/TrackingDimension/CreateTrackingOption.php` -- Create option with auto sort_order
- `app/Actions/TrackingDimension/UpdateTrackingOption.php` -- Update name/status, cascade value rename if name changed
- `app/Actions/TrackingDimension/DeleteTrackingOption.php` -- Delete with "in use" guard
- `app/Actions/TrackingDimension/ReorderTrackingOptions.php` -- Bulk update sort_order from provided ID array
- `app/Actions/TrackingDimension/BulkTagJournalEntryLines.php` -- Set or clear a dimension value on selected JE lines via `jsonb_set()` / `jsonb - key`

**Jobs** (1 file):
- `app/Jobs/RenameDimensionJob.php` -- Queued JSON key/value rename for datasets > 10,000 lines. Idempotent.

**Controller** (1 file):
- `app/Http/Controllers/Api/TrackingDimensionController.php` -- Full CRUD for dimensions and options, reorder, bulk-tag

**Form Requests** (8 files):
- `app/Http/Requests/TrackingDimension/StoreTrackingDimensionRequest.php` -- Validates name uniqueness (case-insensitive), 5-dimension limit
- `app/Http/Requests/TrackingDimension/UpdateTrackingDimensionRequest.php` -- Validates new name uniqueness excluding self
- `app/Http/Requests/TrackingDimension/DeleteTrackingDimensionRequest.php` -- Checks "in use" guard in `authorize()`
- `app/Http/Requests/TrackingDimension/StoreTrackingOptionRequest.php` -- Validates name uniqueness within dimension
- `app/Http/Requests/TrackingDimension/UpdateTrackingOptionRequest.php` -- Validates new name uniqueness excluding self
- `app/Http/Requests/TrackingDimension/DeleteTrackingOptionRequest.php` -- Checks "in use" guard in `authorize()`
- `app/Http/Requests/TrackingDimension/ReorderTrackingOptionsRequest.php` -- Validates all IDs belong to the dimension
- `app/Http/Requests/TrackingDimension/BulkTagRequest.php` -- Validates line IDs, dimension name, option value, workspace ownership

**Validation Rule** (1 file):
- `app/Rules/ValidateTrackingDimensions.php` -- Invokable validation rule (`ValidationRule` interface). Accepts workspace ID. Validates that all keys in a `tracking` JSON are active dimension names and all values are active option names. Used across JE, invoice, and bill Form Requests: `'lines.*.tracking' => ['nullable', 'array', new ValidateTrackingDimensions($this->input('workspace_id'))]`

**API Resources** (2 files):
- `app/Http/Resources/TrackingDimensionResource.php` -- Returns dimension with nested options, value count
- `app/Http/Resources/TrackingOptionResource.php` -- Returns option with name, is_active, sort_order

**Migration** (1 file):
- `database/migrations/xxxx_xx_xx_add_tracking_to_invoice_lines_and_gin_indexes.php` -- Adds `json('tracking')->nullable()` to `invoice_lines`, GIN indexes on both tables

**Tests** (1+ files):
- `tests/Feature/TrackingDimension/TrackingDimensionCrudTest.php` -- CRUD operations, limit enforcement, name uniqueness, deactivation
- `tests/Feature/TrackingDimension/TrackingDimensionTaggingTest.php` -- JE line tagging, validation, coexistence with job_id
- `tests/Feature/TrackingDimension/TrackingDimensionReportTest.php` -- P&L filtering, P&L grouping with Unallocated, BS filtering, TB filtering
- `tests/Feature/TrackingDimension/TrackingDimensionBulkTagTest.php` -- Bulk set, bulk clear, audit logging
- `tests/Feature/TrackingDimension/TrackingDimensionRenameTest.php` -- Dimension rename cascade, option rename cascade
- `tests/Feature/TrackingDimension/TrackingDimensionPermissionTest.php` -- Permission checks, tenant isolation

### Modified Files

**Models**:
- `app/Models/Tenant/TrackingCategory.php` -- Add `scopeForWorkspace()`, `activeOptions()` relationship, `scopeActive()`
- `app/Models/Tenant/InvoiceLine.php` -- Add `'tracking'` to `$fillable`, add `'tracking' => 'array'` to `casts()`

**Report Actions**:
- `app/Actions/Reporting/GenerateProfitAndLoss.php` -- Add `?string $trackingDimension`, `?string $trackingValue`, `?string $groupByDimension` parameters to `handle()`. Add WHERE clause to `aggregateByAccount()`. Add grouped P&L logic.
- `app/Actions/Reporting/GenerateBalanceSheet.php` -- Add `?string $trackingDimension`, `?string $trackingValue` parameters. Add WHERE clause to `getBalancesAsAt()` and `calculateCurrentYearEarnings()`.
- `app/Actions/Reporting/GenerateGeneralLedger.php` -- Add `?string $trackingDimension`, `?string $trackingValue` parameters. Add WHERE clause to `getTransactions()`. Include `$txn->tracking` in transaction line output.
- `app/Http/Controllers/Api/ReportController.php` -- Pass tracking parameters from request to report actions. Add WHERE clause to `trialBalance()` when tracking filter is present (recompute from JE lines instead of `account_balances`).

**Report Form Requests** (add tracking filter validation):
- `app/Http/Requests/Report/ProfitAndLossRequest.php` -- Add `tracking_dimension`, `tracking_value`, `group_by_dimension` rules
- `app/Http/Requests/Report/BalanceSheetRequest.php` -- Add `tracking_dimension`, `tracking_value` rules
- `app/Http/Requests/Report/GeneralLedgerRequest.php` -- Add `tracking_dimension`, `tracking_value` rules

**Transaction Form Requests** (add tracking validation):
- `app/Http/Requests/JournalEntry/StoreJournalEntryRequest.php` -- Add `'lines.*.tracking' => ['nullable', 'array', new ValidateTrackingDimensions(...)]`
- `app/Http/Requests/JournalEntry/UpdateJournalEntryRequest.php` -- Same tracking validation
- `app/Http/Requests/Invoice/StoreInvoiceRequest.php` -- Same tracking validation
- `app/Http/Requests/Invoice/StoreBillRequest.php` -- Same tracking validation (bills share invoice validation)

**Invoice/Bill Flow**:
- `app/Projectors/InvoiceProjector.php` -- Add `tracking` to `InvoiceLine::create()` call and JE line generation
- `app/Actions/Invoicing/ApproveInvoice.php` -- Pass `tracking` through when generating JE lines from invoice lines

**CSV Import/Export** (P2):
- `app/Actions/Import/ImportCsvRecords.php` -- Detect `Tracking: {name}` columns, map to `tracking` JSON
- `app/Actions/Reporting/ExportReportExcel.php` -- Include dimension columns in export

**Routes & Config**:
- `routes/api.php` -- Remove 3 old tracking routes from `JobController` section. Add new tracking-dimension resource routes + bulk-tag route.
- `app/Http/Controllers/Api/JobController.php` -- Remove `trackingCategories()`, `storeTrackingCategory()`, `storeTrackingOption()` methods

**Deleted Files**:
- `app/Http/Requests/Job/StoreTrackingCategoryRequest.php` -- Replaced by `Requests/TrackingDimension/StoreTrackingDimensionRequest.php`
- `app/Http/Requests/Job/StoreTrackingOptionRequest.php` -- Replaced by `Requests/TrackingDimension/StoreTrackingOptionRequest.php`

---

## API Routes

All routes under `auth:sanctum` + `SetWorkspaceContext` middleware.

### Tracking Dimensions (Settings)

| Method | Path | Controller Method | Permission | FR |
|--------|------|-------------------|------------|-----|
| GET | `/api/v1/tracking-dimensions` | `index` | `job.view` (inline `Gate::authorize`) | FR-TDM-033 |
| POST | `/api/v1/tracking-dimensions` | `store` | `workspace.settings` (Form Request) | FR-TDM-001, FR-TDM-002 |
| PATCH | `/api/v1/tracking-dimensions/{id}` | `update` | `workspace.settings` (Form Request) | FR-TDM-003, FR-TDM-004 |
| DELETE | `/api/v1/tracking-dimensions/{id}` | `destroy` | `workspace.settings` (Form Request) | FR-TDM-005 |
| POST | `/api/v1/tracking-dimensions/{id}/options` | `storeOption` | `workspace.settings` (Form Request) | FR-TDM-006 |
| PATCH | `/api/v1/tracking-dimensions/{id}/options/{optionId}` | `updateOption` | `workspace.settings` (Form Request) | FR-TDM-006, FR-TDM-007 |
| DELETE | `/api/v1/tracking-dimensions/{id}/options/{optionId}` | `destroyOption` | `workspace.settings` (Form Request) | FR-TDM-006 |
| POST | `/api/v1/tracking-dimensions/{id}/reorder` | `reorder` | `workspace.settings` (Form Request) | FR-TDM-008 |

### Bulk Tagging

| Method | Path | Controller Method | Permission | FR |
|--------|------|-------------------|------------|-----|
| POST | `/api/v1/journal-entry-lines/bulk-tag` | `TrackingDimensionController@bulkTag` | `journal-entry.update` (Form Request) | FR-TDM-024, FR-TDM-025 |

### Report Endpoints (Modified, not new)

Existing report endpoints gain optional query parameters:

| Endpoint | New Parameters | FR |
|----------|---------------|-----|
| `GET /api/v1/reports/profit-and-loss` | `tracking_dimension`, `tracking_value`, `group_by_dimension` | FR-TDM-016, FR-TDM-017 |
| `GET /api/v1/reports/balance-sheet` | `tracking_dimension`, `tracking_value` | FR-TDM-018 |
| `GET /api/v1/reports/trial-balance` | `tracking_dimension`, `tracking_value` | FR-TDM-019 |
| `GET /api/v1/reports/general-ledger` | `tracking_dimension`, `tracking_value` | FR-TDM-020, FR-TDM-021 |

---

## Backend Components

### TrackingDimensionController

Single controller handling all dimension and option CRUD, plus bulk tagging. Methods:

```php
class TrackingDimensionController extends Controller
{
    public function index(Request $request): JsonResponse           // GET list (Gate::authorize inline)
    public function store(StoreTrackingDimensionRequest $request)   // POST create dimension
    public function update(UpdateTrackingDimensionRequest $request, int $id)  // PATCH update dimension
    public function destroy(DeleteTrackingDimensionRequest $request, int $id) // DELETE dimension
    public function storeOption(StoreTrackingOptionRequest $request, int $id) // POST add option
    public function updateOption(UpdateTrackingOptionRequest $request, int $id, int $optionId) // PATCH option
    public function destroyOption(DeleteTrackingOptionRequest $request, int $id, int $optionId) // DELETE option
    public function reorder(ReorderTrackingOptionsRequest $request, int $id)  // POST reorder
    public function bulkTag(BulkTagRequest $request): JsonResponse  // POST bulk-tag JE lines
}
```

### ValidateTrackingDimensions Rule

Shared validation rule used across JE, invoice, and bill Form Requests:

```php
class ValidateTrackingDimensions implements ValidationRule
{
    public function __construct(private int $workspaceId) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (!is_array($value)) return;

        $dimensions = TrackingCategory::where('workspace_id', $this->workspaceId)
            ->where('is_active', true)
            ->with(['options' => fn ($q) => $q->where('is_active', true)])
            ->get()
            ->keyBy('name');

        foreach ($value as $dimensionName => $optionValue) {
            $dimension = $dimensions->get($dimensionName);
            if (!$dimension) {
                $fail("The tracking dimension \"{$dimensionName}\" does not exist or is inactive.");
                continue;
            }
            if (!$dimension->options->contains('name', $optionValue)) {
                $fail("The value \"{$optionValue}\" is not a valid option for dimension \"{$dimensionName}\".");
            }
        }
    }
}
```

This loads dimensions + options in a single query (with eager loading), then validates in-memory. Efficient for the typical case (1-5 dimensions, < 50 options each).

### Actions

**CreateTrackingDimension**: Enforces max 5 per workspace (counts all, including inactive). Creates with `is_active = true`. Returns created dimension with empty options.

**UpdateTrackingDimension**: If name changed, counts affected lines. If <= 10,000, renames JSON keys synchronously. If > 10,000, dispatches `RenameDimensionJob` and returns 202. If `is_active` changed, no cascade needed.

**DeleteTrackingDimension**: Checks if any `journal_entry_lines` or `invoice_lines` reference the dimension name in their `tracking` JSON. If in use, returns 422. If not, deletes dimension and all its options.

**UpdateTrackingOption**: If name changed, cascades value rename across tracking JSON. Same 10k threshold for sync vs queued. If `is_active` changed, no cascade needed.

**DeleteTrackingOption**: Checks if any lines reference the option value under its parent dimension. If in use, returns 422.

**BulkTagJournalEntryLines**: Validates line IDs belong to workspace. Validates dimension name and option value against active dimensions. Executes single `UPDATE` with `jsonb_set()` or `jsonb - key` (for clear). Creates `ActivityItem` audit record. Wrapped in DB transaction.

### "In Use" Check Query

Used by delete guards for both dimensions and options:

```sql
-- Dimension in use check
SELECT EXISTS (
    SELECT 1 FROM journal_entry_lines jel
    JOIN journal_entries je ON jel.journal_entry_id = je.id
    WHERE je.workspace_id = ?
    AND je.status = 'posted'
    AND jel.tracking ? 'Region'
) OR EXISTS (
    SELECT 1 FROM invoice_lines il
    JOIN invoices i ON il.invoice_id = i.id
    WHERE i.workspace_id = ?
    AND il.tracking ? 'Region'
);
```

The `?` operator (jsonb key exists) is fast with the GIN index.

---

## Frontend Components

### Settings Page: `/settings/tracking-dimensions`

New page under the existing settings layout.

**Data fetching**: `useTrackingDimensions(includeInactive: true)` TanStack Query hook calling `GET /api/v1/tracking-dimensions?include_inactive=true`.

**Layout**:
- Page title "Tracking Dimensions" with subtitle "Create up to 5 custom dimensions to classify transactions"
- "Add Dimension" button (disabled with tooltip when count >= 5)
- Dimension list with expand/collapse panels
- Each dimension row: name (click-to-edit), active/inactive toggle, option count badge, expand arrow, delete button
- Expanded panel: sortable option list with `@dnd-kit/sortable` drag handles, inline name editing, active/inactive toggle per option, delete button per option, "Add Option" input at bottom
- Keyboard shortcut: `N` to add new dimension

**Mutations**: Individual TanStack Query mutation hooks with optimistic updates for reorder operations. Invalidate dimension query on create/update/delete.

### Transaction Line Dimension Picker

Renders below each line item on JE, invoice, and bill create/edit forms.

**Data fetching**: `useTrackingDimensions()` (active only, no `include_inactive`). Fetched once per form mount and shared across all lines.

**Component**: `TrackingDimensionPicker`
- Row of compact dropdown selectors, one per active dimension
- Label: dimension name
- Placeholder: "Select..."
- Options: active options sorted by `sort_order`
- If dimension has > 50 options, use shadcn `Combobox` (searchable) instead of `Select`
- Empty = untagged (no required validation)
- Hidden entirely when workspace has 0 active dimensions
- Mobile: collapses to a "Tracking" button that opens a sheet/drawer

**Integration with React Hook Form**: Each line's `tracking` field is a `Record<string, string>` in the form schema. The picker reads/writes individual keys within this object.

### Report Controls

**"Filter by Dimension" dropdown**: Added to P&L, BS, TB, GL report toolbars. Two cascading selects: dimension name first, then option value (or "All"). Selecting a filter updates the URL query parameters and refetches the report.

**"Group by Dimension" dropdown**: P&L toolbar only. Single select of dimension name. When selected, the report table renders one column per option value plus "Unallocated" and "Total".

**URL state**: `?tracking_dimension=Region&tracking_value=NSW&group_by_dimension=Department` -- stored in URL for shareable links.

### GL Dimension Columns

The GL report table dynamically adds one column per active workspace dimension. Column values come from each transaction line's `tracking` JSON. Blank when untagged (not "null" or "N/A"). Sorting by dimension columns is client-side via TanStack Table.

### Bulk Tag Modal

Available in GL and transaction list views. Triggered from bulk actions menu after selecting JE line checkboxes.

**UI**: Modal with dimension select, option value select (or "Clear" option), "Apply" button, confirmation of affected line count.

---

## Report Integration Detail

### P&L with Dimension Filter

`GenerateProfitAndLoss::aggregateByAccount()` adds a conditional WHERE clause:

```php
->when($trackingDimension && $trackingValue, function ($query) use ($trackingDimension, $trackingValue) {
    $query->whereRaw("journal_entry_lines.tracking->>? = ?", [$trackingDimension, $trackingValue]);
})
```

### P&L with Dimension Grouping

`GenerateProfitAndLoss::handle()` when `$groupByDimension` is provided:

```php
// Fetch active options for the dimension
$options = TrackingOption::whereHas('category', fn ($q) =>
    $q->where('workspace_id', $workspaceId)->where('name', $groupByDimension)
)->where('is_active', true)->orderBy('sort_order')->pluck('name');

$grouped = [];
foreach ($options as $optionValue) {
    $grouped[$optionValue] = $this->aggregateByAccount(
        $workspaceId, $startDate, $endDate,
        trackingDimension: $groupByDimension,
        trackingValue: $optionValue
    );
}

// Unallocated: lines where dimension key is null or missing
$grouped['Unallocated'] = $this->aggregateByAccountUnallocated(
    $workspaceId, $startDate, $endDate, $groupByDimension
);
```

The `aggregateByAccountUnallocated()` method adds:
```php
->whereRaw("(journal_entry_lines.tracking->>? IS NULL OR journal_entry_lines.tracking IS NULL)", [$groupByDimension])
```

This per-value approach reuses the existing `aggregateByAccount()` method with minimal modification. Each query is fast (< 100ms with GIN index) and dimension values typically number under 20.

### BS with Dimension Filter

`GenerateBalanceSheet::getBalancesAsAt()` and `calculateCurrentYearEarnings()` both add the same conditional WHERE clause as P&L. No grouping support on BS.

### TB with Dimension Filter

`ReportController::trialBalance()` when tracking filter is present: bypasses `account_balances` read model and recomputes balances from filtered `journal_entry_lines` using the same aggregation pattern as P&L/BS.

### GL with Dimension Data

`GenerateGeneralLedger::getTransactions()` includes `$txn->tracking` in the output. The GL response includes tracking data per line:

```php
$lines[] = [
    'entry_date' => $txn->journalEntry->entry_date,
    // ... existing fields ...
    'tracking' => $txn->tracking,  // NEW
];
```

GL also supports the same `tracking_dimension` / `tracking_value` filter parameters.

---

## Bulk Operations

### Bulk Tag Endpoint

`POST /api/v1/journal-entry-lines/bulk-tag`

**Request body**:
```json
{
    "line_ids": [1, 2, 3, 4, 5],
    "dimension_name": "Region",
    "option_value": "NSW"          // null to clear the dimension
}
```

**Implementation** (`BulkTagJournalEntryLines` action):

1. Validate all `line_ids` belong to JE lines in the current workspace
2. Validate `dimension_name` is an active dimension in the workspace
3. Validate `option_value` is an active option (if not null)
4. Execute within `DB::transaction()`:
   - If `option_value` is not null (set):
     ```sql
     UPDATE journal_entry_lines
     SET tracking = jsonb_set(COALESCE(tracking, '{}'), '{Region}', '"NSW"')
     WHERE id IN (...)
     ```
   - If `option_value` is null (clear):
     ```sql
     UPDATE journal_entry_lines
     SET tracking = CASE
       WHEN tracking - 'Region' = '{}'::jsonb THEN NULL
       ELSE tracking - 'Region'
     END
     WHERE id IN (...)
     ```
5. Create `ActivityItem` audit record:
   ```php
   ActivityItem::create([
       'workspace_id' => $workspaceId,
       'category' => ActivityCategory::System,
       'type' => ActivityType::BulkUpdate,
       'title' => "Bulk-tagged {$count} lines with {$dimensionName} = {$optionValue}",
       'data' => ['dimension' => $dimensionName, 'value' => $optionValue, 'line_count' => $count],
       'actor_id' => $userId,
   ]);
   ```

**Response**: `200 OK` with `{ "message": "Tagged 5 lines", "affected_count": 5 }`

---

## CSV Import/Export (P2)

### Export

`ExportReportExcel` (and any CSV export action) includes one column per active workspace dimension:
- Column headers: `Tracking: Region`, `Tracking: Department`, etc.
- Values: extracted from each line's `tracking` JSON by dimension name key
- Blank when untagged

### Import

`ImportCsvRecords` detects columns with `Tracking: ` prefix:
1. Parse `Tracking: {name}` column headers to extract dimension names
2. For each row, build `tracking` JSON from matched columns
3. Validate values against active options
4. Invalid values: log warning on that row, skip the invalid dimension value (do not reject the row)
5. Missing dimension columns: leave those dimensions untagged (`null`)

---

## Task Breakdown

### Phase 1: Foundation (No dependencies)

| # | Task | Files | FR | Est |
|---|------|-------|----|-----|
| 1.1 | Migration: add `tracking` to `invoice_lines` + GIN indexes | `database/migrations/xxxx_add_tracking_to_invoice_lines_and_gin_indexes.php` | FR-TDM-010, NFR-TDM-002 | S |
| 1.2 | Update `InvoiceLine` model: add `tracking` to fillable + casts | `app/Models/Tenant/InvoiceLine.php` | FR-TDM-010 | XS |
| 1.3 | Enhance `TrackingCategory` model: add scopes, `activeOptions()` | `app/Models/Tenant/TrackingCategory.php` | FR-TDM-001 | XS |
| 1.4 | Create `ValidateTrackingDimensions` rule class | `app/Rules/ValidateTrackingDimensions.php` | FR-TDM-012 | S |
| 1.5 | Create API Resources: `TrackingDimensionResource`, `TrackingOptionResource` | `app/Http/Resources/` | -- | XS |

### Phase 2: Dimension CRUD (Depends on 1.1-1.5)

| # | Task | Files | FR | Est |
|---|------|-------|----|-----|
| 2.1 | Create `TrackingDimensionController` with all methods | `app/Http/Controllers/Api/TrackingDimensionController.php` | FR-TDM-001 to FR-TDM-008 | M |
| 2.2 | Create all 8 Form Requests in `Requests/TrackingDimension/` | `app/Http/Requests/TrackingDimension/*.php` | FR-TDM-001 to FR-TDM-008, FR-TDM-030 | M |
| 2.3 | Create CRUD Actions: Create, Update, Delete for dimensions and options | `app/Actions/TrackingDimension/` (6 files) | FR-TDM-001 to FR-TDM-007 | M |
| 2.4 | Create `ReorderTrackingOptions` action | `app/Actions/TrackingDimension/ReorderTrackingOptions.php` | FR-TDM-008 | XS |
| 2.5 | Create `RenameDimensionJob` for large dataset renames | `app/Jobs/RenameDimensionJob.php` | FR-TDM-003, FR-TDM-007, NFR-TDM-003 | S |
| 2.6 | Register routes, remove old `JobController` tracking methods | `routes/api.php`, `app/Http/Controllers/Api/JobController.php` | -- | S |
| 2.7 | Delete old Form Requests from `Requests/Job/` | Delete `StoreTrackingCategoryRequest.php`, `StoreTrackingOptionRequest.php` | -- | XS |
| 2.8 | Tests: Dimension CRUD, limit enforcement, name uniqueness, permissions | `tests/Feature/TrackingDimension/TrackingDimensionCrudTest.php` | FR-TDM-001 to FR-TDM-008, FR-TDM-030 to FR-TDM-034 | M |

### Phase 3: Transaction Tagging (Depends on 1.4, 2.6)

| # | Task | Files | FR | Est |
|---|------|-------|----|-----|
| 3.1 | Add tracking validation to JE Form Requests | `StoreJournalEntryRequest.php`, `UpdateJournalEntryRequest.php` | FR-TDM-009, FR-TDM-012 | S |
| 3.2 | Add tracking validation to Invoice/Bill Form Requests | `StoreInvoiceRequest.php`, `StoreBillRequest.php` | FR-TDM-010, FR-TDM-011, FR-TDM-012 | S |
| 3.3 | Invoice-to-JE tracking propagation | `InvoiceProjector.php`, `ApproveInvoice.php` | FR-TDM-014 | S |
| 3.4 | Tests: Tagging validation, propagation, coexistence with job_id | `tests/Feature/TrackingDimension/TrackingDimensionTaggingTest.php` | FR-TDM-009 to FR-TDM-015 | M |

### Phase 4: Report Integration (Depends on 1.1 GIN indexes)

| # | Task | Files | FR | Est |
|---|------|-------|----|-----|
| 4.1 | P&L: add tracking filter + group-by-dimension | `GenerateProfitAndLoss.php`, `ProfitAndLossRequest.php` | FR-TDM-016, FR-TDM-017, FR-TDM-023 | L |
| 4.2 | BS: add tracking filter | `GenerateBalanceSheet.php`, `BalanceSheetRequest.php` | FR-TDM-018 | S |
| 4.3 | TB: add tracking filter (recompute from JE lines) | `ReportController.php` | FR-TDM-019 | M |
| 4.4 | GL: add tracking data output + filter | `GenerateGeneralLedger.php`, `GeneralLedgerRequest.php` | FR-TDM-020, FR-TDM-021 | S |
| 4.5 | Tests: Report filtering, grouping, Unallocated column | `tests/Feature/TrackingDimension/TrackingDimensionReportTest.php` | FR-TDM-016 to FR-TDM-023 | L |

### Phase 5: Bulk Tagging (Depends on 2.6 routes)

| # | Task | Files | FR | Est |
|---|------|-------|----|-----|
| 5.1 | Create `BulkTagJournalEntryLines` action | `app/Actions/TrackingDimension/BulkTagJournalEntryLines.php` | FR-TDM-024, FR-TDM-025 | S |
| 5.2 | Create `BulkTagRequest` Form Request | `app/Http/Requests/TrackingDimension/BulkTagRequest.php` | FR-TDM-024 | S |
| 5.3 | Add bulk-tag route and controller method | `routes/api.php`, `TrackingDimensionController.php` | FR-TDM-024 | XS |
| 5.4 | Activity log for bulk operations | Integrated in `BulkTagJournalEntryLines` action | FR-TDM-026 | XS |
| 5.5 | Tests: Bulk tag set, clear, audit, workspace isolation | `tests/Feature/TrackingDimension/TrackingDimensionBulkTagTest.php` | FR-TDM-024 to FR-TDM-026, NFR-TDM-004 | M |

### Phase 6: Frontend - Settings (Depends on Phase 2 backend)

| # | Task | Files | FR | Est |
|---|------|-------|----|-----|
| 6.1 | `useTrackingDimensions` TanStack Query hook + mutation hooks | `frontend/src/hooks/use-tracking-dimensions.ts` | -- | S |
| 6.2 | Settings page: dimension list with CRUD, option management, drag-sort | `frontend/src/app/(dashboard)/settings/tracking-dimensions/page.tsx` | US1 | L |
| 6.3 | Add navigation entry under Settings sidebar | `frontend/src/lib/navigation.ts` or settings layout | -- | XS |

### Phase 7: Frontend - Transaction Tagging (Depends on Phase 3 backend, 6.1)

| # | Task | Files | FR | Est |
|---|------|-------|----|-----|
| 7.1 | `TrackingDimensionPicker` component (compact dropdowns per dimension) | `frontend/src/components/tracking/TrackingDimensionPicker.tsx` | US2 | M |
| 7.2 | Integrate picker into JE create/edit form | JE form component | FR-TDM-009 | S |
| 7.3 | Integrate picker into Invoice/Bill create/edit forms | Invoice/Bill form components | FR-TDM-010, FR-TDM-011 | S |

### Phase 8: Frontend - Reports (Depends on Phase 4 backend, 6.1)

| # | Task | Files | FR | Est |
|---|------|-------|----|-----|
| 8.1 | Dimension filter/group-by controls for report toolbar | `frontend/src/components/reports/DimensionReportFilter.tsx` | FR-TDM-022 | M |
| 8.2 | P&L grouped columns rendering | P&L report page | FR-TDM-017 | M |
| 8.3 | GL dimension columns | GL report page | FR-TDM-020 | S |
| 8.4 | Bulk tag modal in GL / transaction list | `frontend/src/components/tracking/BulkTagModal.tsx` | FR-TDM-024 | M |

### Phase 9: CSV Import/Export (P2, depends on Phase 2)

| # | Task | Files | FR | Est |
|---|------|-------|----|-----|
| 9.1 | CSV export: add dimension columns | `ExportReportExcel.php` | FR-TDM-027 | S |
| 9.2 | CSV import: detect + validate dimension columns | `ImportCsvRecords.php` | FR-TDM-028, FR-TDM-029 | M |
| 9.3 | Tests: CSV round-trip with dimensions | `tests/Feature/TrackingDimension/TrackingDimensionCsvTest.php` | FR-TDM-027 to FR-TDM-029 | S |

### Size Legend

- **XS**: < 30 minutes
- **S**: 30 min - 2 hours
- **M**: 2 - 4 hours
- **L**: 4 - 8 hours
