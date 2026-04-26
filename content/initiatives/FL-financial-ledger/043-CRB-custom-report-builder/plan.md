---
title: "Implementation Plan: Custom Report Builder"
---

# Implementation Plan: Custom Report Builder

**Epic**: 043-CRB
**Branch**: `043-CRB-custom-report-builder`
**Status**: Planning

---

## 1. Technical Context

### Stack

- **Backend**: Laravel 12 (PHP 8.4), SQLite, Pest v4
- **Frontend**: Next.js 16, React 19, TypeScript, TanStack Query v5, Zustand v5, React Hook Form + Zod, shadcn/ui
- **Auth**: Sanctum cookie-based SPA auth, custom Role/RolePermission system
- **Tenancy**: Single-database multi-tenancy via `workspace_id` scoping + `SetWorkspaceContext` middleware
- **Event Sourcing**: Spatie laravel-event-sourcing v7 (journal entries only)

### Key Dependencies

| Dependency | Location | Usage |
|---|---|---|
| `AccountBalanceProjector` | `app/Projectors/AccountBalanceProjector.php` | Pre-computed summary balances for fast aggregation |
| `JournalEntryLine` model | `app/Models/Tenant/JournalEntryLine.php` | Source of truth for drill-down queries |
| `AccountBalance` model | `app/Models/Tenant/AccountBalance.php` | Read model with `debit_total`, `credit_total`, `balance` per account |
| `ChartAccount` model | `app/Models/Tenant/ChartAccount.php` | Account metadata, types, parent hierarchy |
| `PlanTier` enum | `app/Enums/PlanTier.php` | Feature gating via `features()` array |
| `CheckFeature` middleware | `app/Http/Middleware/CheckFeature.php` | Route-level feature flag enforcement |
| `RolesAndPermissionsSeeder` | `database/seeders/RolesAndPermissionsSeeder.php` | Permission definitions per role |
| `ReportController` | `app/Http/Controllers/Api/ReportController.php` | Existing standard reports (reference pattern) |
| DomPDF | New dependency | Server-side PDF generation |
| PhpSpreadsheet | New dependency | Excel export with formulas and grouping |

### Constraints

- **SQLite compatibility**: All queries must use `strftime('%Y-%m', entry_date)` for date grouping, not MySQL/Postgres functions
- **No result caching**: Financial reports must always reflect live posted data
- **Amounts as integers (cents)**: All monetary values stored and computed in cents, formatted for display only
- **50 templates per workspace**: Enforced at API level
- **Professional/Enterprise tiers only**: Gated via `custom_reports` feature flag

---

## 2. Gate 3 Architecture Check

### 2.1 Technical Feasibility

| Check | Status | Notes |
|---|---|---|
| Architecture approach clear | Pass | Hybrid query strategy: AccountBalance projector for summaries, JE lines for drill-down. Streaming via chunked JSON for progressive rendering |
| Existing patterns leveraged | Pass | Follows ContactController CRUD pattern, CreateMeeting action pattern, Meeting model pattern |
| No impossible requirements | Pass | All requirements buildable with existing stack |
| Performance considered | Pass | Composite indexes on `journal_entry_lines`, streaming mitigates latency, drill-down queries are narrow |
| Security considered | Pass | Workspace-scoped queries, permission-gated endpoints, no cross-tenant access |

### 2.2 Data & Integration

| Check | Status | Notes |
|---|---|---|
| Data model understood | Pass | 3 new models: ReportTemplate, ReportSchedule, ReportExecution. All workspace-scoped |
| API contracts clear | Pass | 15 endpoints defined in spec clarification #16 |
| Dependencies identified | Pass | DomPDF, PhpSpreadsheet (new packages). All internal dependencies complete |
| Integration points mapped | Pass | Reads from JE lines + AccountBalance. Scheduled delivery via email infrastructure (023-EML) |
| DTO persistence explicit | Pass | Config stored as JSON column, validated via Zod (frontend) and array validation (backend) |

### 2.3 Frontend Standards (Next.js/React)

| Check | Status | Notes |
|---|---|---|
| All components use TypeScript | Pass | Every `.tsx` file with strict types, no `any` |
| Props typed with interfaces/types | Pass | `type Props = { ... }` for all components |
| Server/client components explicit | Pass | Builder UI is `'use client'`, index page is `'use client'` (uses DataTable) |
| Data fetching via TanStack Query | Pass | `use-report-templates.ts` hooks for all API calls |
| Client state via Zustand | Pass | `report-builder-store.ts` for builder config state (filters, groupings, column layout) |
| Forms use React Hook Form + Zod | Pass | Template save/edit forms, schedule forms |
| API client typed | Pass | TypeScript types in `types/report-template.ts` matching API Resources |

### 2.4 Event Sourcing Standards

Not directly applicable -- custom reports read from existing projector data and JE lines. No new aggregates or events.

### 2.5 Multi-Tenancy Standards

| Check | Status | Notes |
|---|---|---|
| All tenant models scoped | Pass | `workspace_id` on ReportTemplate, ReportSchedule, ReportExecution |
| Central vs tenant separation clear | Pass | All 3 new models are tenant-scoped |
| No cross-tenant queries | Pass | Every query filters by `workspace_id` |
| Tenant context set in middleware | Pass | Routes use `SetWorkspaceContext` middleware |
| Tests verify isolation | Pass | Test plan includes tenant isolation assertions |

### 2.6 Laravel Backend Standards

| Check | Status | Notes |
|---|---|---|
| Use Lorisleiva Actions | Pass | `GenerateCustomReport`, `CreateReportTemplate`, `ExportReportPdf`, `ExportReportExcel`, `ProcessScheduledReports` |
| API Resources for responses | Pass | `ReportTemplateResource`, `ReportScheduleResource`, `ReportExecutionResource` |
| Model route binding | Pass | UUID-based route binding on ReportTemplate |
| Sanctum cookie auth | Pass | All routes behind `auth:sanctum` |
| Feature flags dual-gated | Pass | `CheckFeature` middleware + frontend feature check |
| No hardcoded business logic in frontend | Pass | All query logic, aggregation, and date resolution in backend actions |

### 2.7 Implementation Approach

| Check | Status | Notes |
|---|---|---|
| File changes identified | Pass | See sections 5 and 6 |
| Risk areas noted | Pass | Streaming response, complex query builder, Excel formula generation |
| Testing approach defined | Pass | See section 8 |
| Rollback possible | Pass | Feature-flagged, migrations are additive only |

---

## 3. Data Model

### 3.1 ReportTemplate

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | Auto-increment |
| `uuid` | string(36) | Public identifier, unique |
| `workspace_id` | bigint FK | Tenant scoping |
| `name` | string(255) | User-defined name (required) |
| `description` | text nullable | Optional description |
| `config` | JSON | Full report definition (see spec clarification #7 for schema) |
| `is_shared` | boolean | Default false |
| `share_mode` | string nullable | `null`, `read_only`, or `editable` |
| `created_by` | bigint FK -> users | Creator |
| `updated_by` | bigint FK -> users nullable | Last modifier |
| `last_run_at` | datetime nullable | Most recent generation timestamp |
| `run_count` | integer | Default 0 |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### 3.2 ReportSchedule

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `uuid` | string(36) | Public identifier |
| `workspace_id` | bigint FK | Tenant scoping |
| `report_template_id` | bigint FK | Template to execute |
| `frequency` | string | `daily`, `weekly`, `monthly` |
| `day_of_week` | integer nullable | 0-6 for weekly |
| `day_of_month` | integer nullable | 1-28 for monthly |
| `time_of_day` | string | HH:MM, default `08:00` |
| `timezone` | string | From workspace timezone |
| `recipients` | JSON | Array of email addresses |
| `export_format` | string | `pdf` or `xlsx`, default `pdf` |
| `is_active` | boolean | Default true |
| `next_due_at` | datetime | Next execution (UTC) |
| `last_executed_at` | datetime nullable | |
| `created_by` | bigint FK -> users | |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### 3.3 ReportExecution

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `uuid` | string(36) | Public identifier |
| `workspace_id` | bigint FK | Tenant scoping |
| `report_template_id` | bigint FK nullable | Null for ad-hoc reports |
| `report_schedule_id` | bigint FK nullable | Non-null for scheduled executions |
| `config_snapshot` | JSON | Frozen config copy for audit |
| `status` | string | `completed`, `failed` |
| `row_count` | integer | Data rows returned |
| `duration_ms` | integer | Generation time in ms |
| `export_path` | string nullable | Storage path to file |
| `export_format` | string nullable | `pdf` or `xlsx` |
| `error_message` | text nullable | Error detail if failed |
| `executed_by` | bigint FK -> users nullable | Null for scheduled |
| `executed_at` | datetime | |
| `created_at` | datetime | |

---

## 4. API Contracts

### 4.1 Report Templates

| Method | Route | Controller@Method | Permission | Notes |
|---|---|---|---|---|
| `GET` | `/api/v1/report-templates` | `ReportTemplateController@index` | `report.custom-view` | List own + shared templates |
| `POST` | `/api/v1/report-templates` | `ReportTemplateController@store` | `report.custom` | Create template (max 50/workspace) |
| `GET` | `/api/v1/report-templates/{uuid}` | `ReportTemplateController@show` | `report.custom-view` | Show template with config |
| `PATCH` | `/api/v1/report-templates/{uuid}` | `ReportTemplateController@update` | `report.custom` | Update (owner or editable shared) |
| `DELETE` | `/api/v1/report-templates/{uuid}` | `ReportTemplateController@destroy` | `report.custom` | Delete (owner only) |
| `POST` | `/api/v1/report-templates/{uuid}/duplicate` | `ReportTemplateController@duplicate` | `report.custom` | Clone template |

### 4.2 Report Generation

| Method | Route | Controller@Method | Permission | Notes |
|---|---|---|---|---|
| `POST` | `/api/v1/report-templates/generate` | `ReportTemplateController@generate` | `report.custom-view` | Ad-hoc generation from config payload. Streamed response |
| `POST` | `/api/v1/report-templates/{uuid}/generate` | `ReportTemplateController@generateFromTemplate` | `report.custom-view` | Generate from saved template. Streamed response |
| `GET` | `/api/v1/report-templates/{uuid}/drill-down` | `ReportTemplateController@drillDown` | `report.custom-view` | Query params: `account_id`, `period_start`, `period_end` |
| `POST` | `/api/v1/report-templates/{uuid}/export/{format}` | `ReportTemplateController@export` | `report.custom-view` | `format` = `pdf` or `xlsx`. Returns file download |

### 4.3 Report Schedules

| Method | Route | Controller@Method | Permission | Notes |
|---|---|---|---|---|
| `GET` | `/api/v1/report-schedules` | `ReportScheduleController@index` | `report.custom` | List schedules |
| `POST` | `/api/v1/report-schedules` | `ReportScheduleController@store` | `report.custom` | Create schedule |
| `PATCH` | `/api/v1/report-schedules/{uuid}` | `ReportScheduleController@update` | `report.custom` | Update schedule |
| `DELETE` | `/api/v1/report-schedules/{uuid}` | `ReportScheduleController@destroy` | `report.custom` | Delete schedule |

### 4.4 Report Executions

| Method | Route | Controller@Method | Permission | Notes |
|---|---|---|---|---|
| `GET` | `/api/v1/report-executions` | `ReportExecutionController@index` | `report.custom` | Execution history |

### 4.5 Streaming Response Format

The `generate` and `generateFromTemplate` endpoints return `Content-Type: text/event-stream` (SSE). Events:

```
event: meta
data: {"title":"Monthly Board Report","date_range":{"start":"2025-07-01","end":"2026-06-30"},"column_headers":["Jul","Aug",...,"Jun","Total"]}

event: group
data: {"type":"revenue","label":"Revenue","accounts":[{"id":12,"code":"4000","name":"Sales Revenue","values":[12000,15000,...]}],"subtotal":[...]}

event: group
data: {"type":"expense","label":"Expenses","accounts":[...],"subtotal":[...]}

event: totals
data: {"grand_total":[...],"row_count":42,"duration_ms":1230}

event: done
data: {}
```

### 4.6 Drill-Down Response

```json
{
  "data": [
    {
      "journal_entry_uuid": "abc-123",
      "entry_number": "JE-0042",
      "entry_date": "2026-01-15",
      "description": "Office supplies purchase",
      "direction": "debit",
      "amount": 15000,
      "contact_name": "Officeworks",
      "job_name": "Facility A"
    }
  ],
  "meta": {
    "account_id": 45,
    "account_name": "Office Supplies",
    "period_start": "2026-01-01",
    "period_end": "2026-01-31",
    "total": 452000,
    "count": 12
  }
}
```

---

## 5. Backend File Plan

### New Files

| File | Purpose |
|---|---|
| `database/migrations/2026_03_19_000001_create_report_templates_table.php` | ReportTemplate, ReportSchedule, ReportExecution tables + composite indexes on JE lines |
| `app/Models/Tenant/ReportTemplate.php` | Model with `config` JSON cast, relationships, UUID boot |
| `app/Models/Tenant/ReportSchedule.php` | Model with `recipients` JSON cast, `next_due_at` datetime cast |
| `app/Models/Tenant/ReportExecution.php` | Model with `config_snapshot` JSON cast |
| `app/Enums/ReportColumnLayout.php` | Enum: `Monthly`, `Quarterly`, `Annual`, `TotalOnly` |
| `app/Enums/ReportRowGrouping.php` | Enum: `AccountType`, `TrackingCategory`, `Job`, `Contact` |
| `app/Enums/ReportShareMode.php` | Enum: `ReadOnly`, `Editable` |
| `app/Enums/ReportScheduleFrequency.php` | Enum: `Daily`, `Weekly`, `Monthly` |
| `app/Enums/ReportExecutionStatus.php` | Enum: `Completed`, `Failed` |
| `app/Http/Controllers/Api/ReportTemplateController.php` | Template CRUD + generate + drill-down + export (10 methods) |
| `app/Http/Controllers/Api/ReportScheduleController.php` | Schedule CRUD (4 methods) |
| `app/Http/Controllers/Api/ReportExecutionController.php` | Execution index (1 method) |
| `app/Http/Requests/Report/StoreReportTemplateRequest.php` | Validation for template creation |
| `app/Http/Requests/Report/UpdateReportTemplateRequest.php` | Validation for template update |
| `app/Http/Requests/Report/GenerateReportRequest.php` | Validation for ad-hoc generation config |
| `app/Http/Requests/Report/StoreReportScheduleRequest.php` | Validation for schedule creation |
| `app/Http/Requests/Report/UpdateReportScheduleRequest.php` | Validation for schedule update |
| `app/Http/Requests/Report/ExportReportRequest.php` | Validation for export format |
| `app/Http/Resources/ReportTemplateResource.php` | API resource |
| `app/Http/Resources/ReportScheduleResource.php` | API resource |
| `app/Http/Resources/ReportExecutionResource.php` | API resource |
| `app/Actions/Reporting/GenerateCustomReport.php` | Core query builder + streaming. Hybrid strategy: AccountBalance for summaries, JE lines for drill-down |
| `app/Actions/Reporting/ResolveDateRange.php` | Resolves relative date ranges (current_fy, last_quarter, etc.) using workspace `fiscal_year_start_month` |
| `app/Actions/Reporting/BuildReportColumns.php` | Generates column headers from date range + layout |
| `app/Actions/Reporting/CreateReportTemplate.php` | Template creation action with 50-template limit enforcement |
| `app/Actions/Reporting/DuplicateReportTemplate.php` | Clone template with "(Copy)" suffix |
| `app/Actions/Reporting/DrillDownReportCell.php` | Queries JE lines for a specific account + period |
| `app/Actions/Reporting/ExportReportPdf.php` | DomPDF generation with landscape/portrait logic |
| `app/Actions/Reporting/ExportReportExcel.php` | PhpSpreadsheet with SUM formulas, row grouping, freeze panes |
| `app/Actions/Reporting/ProcessScheduledReports.php` | Artisan command action: find due schedules, generate, email |
| `app/Policies/ReportTemplatePolicy.php` | Authorization: viewAny, view, create, update, delete, duplicate, generate, export |
| `app/Policies/ReportSchedulePolicy.php` | Authorization for schedules |
| `app/Console/Commands/ProcessScheduledReportsCommand.php` | `reports:process-scheduled` artisan command |
| `app/Mail/ScheduledReportMail.php` | Mailable with PDF/XLSX attachment |
| `tests/Feature/Api/ReportTemplateTest.php` | Template CRUD + generation tests |
| `tests/Feature/Api/ReportScheduleTest.php` | Schedule CRUD tests |
| `tests/Feature/Api/CustomReportGenerationTest.php` | Report generation accuracy, streaming, drill-down |
| `tests/Feature/Api/ReportExportTest.php` | PDF and Excel export tests |

### Modified Files

| File | Change |
|---|---|
| `routes/api.php` | Add report-templates, report-schedules, report-executions routes with `CheckFeature` middleware |
| `database/seeders/RolesAndPermissionsSeeder.php` | Add `report.custom` and `report.custom-view` to role permission lists |
| `app/Enums/PlanTier.php` | Add `custom_reports` to Professional and Enterprise `features()` arrays |
| `app/Providers/AppServiceProvider.php` | Register `ReportTemplatePolicy` and `ReportSchedulePolicy` via `Gate::policy()` |
| `routes/console.php` | Add `reports:process-scheduled` to daily schedule |
| `frontend/src/lib/navigation.ts` | Add "Custom Reports" sub-item under reports nav |
| `frontend/src/types/index.ts` | Add workspace feature flag `custom_reports` |

---

## 6. Frontend File Plan

### New Files

| File | Purpose |
|---|---|
| `frontend/src/types/report-template.ts` | TypeScript types: `ReportTemplate`, `ReportConfig`, `ReportSchedule`, `ReportExecution`, `ReportStreamEvent`, `DrillDownRow` |
| `frontend/src/hooks/use-report-templates.ts` | TanStack Query hooks: `useReportTemplates`, `useReportTemplate`, `useCreateReportTemplate`, `useUpdateReportTemplate`, `useDeleteReportTemplate`, `useDuplicateReportTemplate` |
| `frontend/src/hooks/use-report-generation.ts` | SSE streaming hook: `useReportGeneration` (connects to SSE, accumulates groups progressively), `useDrillDown`, `useExportReport` |
| `frontend/src/hooks/use-report-schedules.ts` | TanStack Query hooks for schedule CRUD |
| `frontend/src/stores/report-builder.ts` | Zustand store: builder config state (data sources, filters, groupings, column layout, comparisons), dirty tracking, undo support |
| `frontend/src/app/(dashboard)/reports/custom/page.tsx` | Custom reports index: template list with DataTable, StatusTabs (All/My Reports/Shared), "New Report" button |
| `frontend/src/app/(dashboard)/reports/custom/new/page.tsx` | Report builder with empty config |
| `frontend/src/app/(dashboard)/reports/custom/[uuid]/page.tsx` | Report builder pre-populated from template, auto-runs on load |
| `frontend/src/app/(dashboard)/reports/custom/[uuid]/edit/page.tsx` | Same builder, edit mode |
| `frontend/src/components/reports/ReportBuilder.tsx` | Main builder container: sidebar config panel + results area |
| `frontend/src/components/reports/ReportConfigPanel.tsx` | Left sidebar: data source picker, filters, grouping, column layout, comparisons |
| `frontend/src/components/reports/DataSourcePicker.tsx` | Account type checkboxes + individual account multi-select |
| `frontend/src/components/reports/ReportFilterPanel.tsx` | Job, tracking category, contact, date range, entry type filters |
| `frontend/src/components/reports/DateRangePicker.tsx` | Relative presets dropdown + absolute date inputs |
| `frontend/src/components/reports/ColumnLayoutSelector.tsx` | Radio group: monthly/quarterly/annual/total_only |
| `frontend/src/components/reports/ComparisonToggle.tsx` | Checkboxes: prior period, prior year, budget, variance % |
| `frontend/src/components/reports/ReportResultsTable.tsx` | Progressive-rendering table: sticky account column, horizontal scroll, grouped rows with subtotals |
| `frontend/src/components/reports/ReportGroupRow.tsx` | Collapsible group header with subtotal |
| `frontend/src/components/reports/ReportAccountRow.tsx` | Account data row with cell values |
| `frontend/src/components/reports/DrillDownPanel.tsx` | Inline expandable panel showing JE lines for a clicked cell |
| `frontend/src/components/reports/ReportToolbar.tsx` | Top toolbar: report title, save, export, schedule buttons + keyboard shortcuts |
| `frontend/src/components/reports/SaveTemplateDialog.tsx` | Dialog: name, description, share mode |
| `frontend/src/components/reports/ScheduleDialog.tsx` | Dialog: frequency, day, time, recipients, format |
| `frontend/src/components/reports/ReportEmptyState.tsx` | Empty state when no data matches filters |
| `frontend/src/components/reports/ReportLoadingSkeleton.tsx` | Skeleton UI during streaming |
| `frontend/src/components/reports/ExportFormatPicker.tsx` | Dropdown: PDF, Excel |

### Modified Files

| File | Change |
|---|---|
| `frontend/src/lib/navigation.ts` | Add `{ title: "Custom Reports", url: "/reports/custom" }` to `reportsNav[0].items` |
| `frontend/src/stores/shortcuts.ts` | Register builder-specific shortcuts (Cmd+Enter, Cmd+S, Cmd+Shift+E) |

---

## 7. Implementation Phases

### Phase 1: Foundation (Backend)

**Goal**: Database schema, models, enums, permissions, feature flag.

- Migration: 3 tables (report_templates, report_schedules, report_executions) + composite indexes on `journal_entry_lines`
- 3 Eloquent models with casts, relationships, UUID boot
- 5 enums (ReportColumnLayout, ReportRowGrouping, ReportShareMode, ReportScheduleFrequency, ReportExecutionStatus)
- Add `report.custom` and `report.custom-view` permissions to seeder
- Add `custom_reports` to PlanTier Professional/Enterprise features
- Register policies in AppServiceProvider

### Phase 2: Report Generation Engine (Backend)

**Goal**: The core report query builder with streaming output.

- `ResolveDateRange` action: resolve 11 relative presets using workspace `fiscal_year_start_month`
- `BuildReportColumns` action: generate column headers from resolved date range + layout
- `GenerateCustomReport` action: the core engine
  - Parse config (data sources, filters, groupings, comparisons)
  - Query `journal_entry_lines` grouped by `chart_account_id` + period (using `strftime` for SQLite)
  - Apply filters: job_ids, tracking category IDs (JSON column), contact_ids, date range, entry types
  - Compute sign-adjusted net movement per account per period
  - Group accounts by account type (or tracking category/job/contact)
  - Compute subtotals and grand totals
  - Handle comparison columns (prior period/year shift, budget lookup)
  - Stream response via SSE (meta -> groups -> totals -> done)
- `DrillDownReportCell` action: query JE lines for single account + period with joins to journal_entries, contacts, jobs

### Phase 3: Template CRUD (Backend)

**Goal**: Save, load, update, duplicate, share report configurations.

- `ReportTemplateController` with 6 CRUD methods (index, store, show, update, destroy, duplicate)
- `CreateReportTemplate` action with 50-template limit enforcement
- `DuplicateReportTemplate` action with "(Copy)" name suffix
- 3 Form Requests (Store, Update, Generate)
- `ReportTemplateResource` API resource
- `ReportTemplatePolicy` with ownership/sharing logic
- Wire generation endpoints (generate, generateFromTemplate, drillDown) into controller

### Phase 4: Export (Backend)

**Goal**: PDF via DomPDF, Excel via PhpSpreadsheet.

- Install `barryvdh/laravel-dompdf` and `phpoffice/phpspreadsheet`
- `ExportReportPdf` action: Blade template -> DomPDF, landscape for 4+ columns, header/footer
- `ExportReportExcel` action: PhpSpreadsheet with `=SUM()` formulas, `setOutlineLevel` for grouped rows, freeze panes, number formatting
- `ReportExecution` model: log every generation with config_snapshot, duration_ms, row_count
- Export endpoint in controller, returns file download
- Storage at `storage/app/reports/{workspace_id}/` with 30-day auto-purge

### Phase 5: Scheduled Reports (Backend)

**Goal**: Automated report delivery via email.

- `ReportScheduleController` with CRUD (4 methods)
- `ReportScheduleResource`, `ReportExecutionResource`
- `StoreReportScheduleRequest`, `UpdateReportScheduleRequest`
- `ProcessScheduledReports` action: find due schedules, generate report, export, email
- `ProcessScheduledReportsCommand`: `reports:process-scheduled`, registered in `routes/console.php` for daily execution
- `ScheduledReportMail` mailable with PDF/XLSX attachment
- `ReportSchedulePolicy`
- Handle failures: log execution with `failed` status, send error notification

### Phase 6: Frontend -- Report Builder UI

**Goal**: The interactive builder interface with live preview and streaming results.

- `report-builder.ts` Zustand store: config state, dirty tracking
- `useReportGeneration` hook: SSE connection, progressive group accumulation
- `ReportBuilder.tsx`: split layout (config panel left, results right)
- `ReportConfigPanel.tsx`: collapsible sections for data sources, filters, groupings, layout, comparisons
- `DataSourcePicker.tsx`: account type checkboxes + searchable account multi-select
- `ReportFilterPanel.tsx`: job/tracking/contact selectors + date range picker
- `DateRangePicker.tsx`: relative presets dropdown + custom date inputs
- `ColumnLayoutSelector.tsx` and `ComparisonToggle.tsx`
- `ReportResultsTable.tsx`: progressive rendering, sticky first column, horizontal scroll
- `ReportGroupRow.tsx` and `ReportAccountRow.tsx`: grouped display with subtotals
- `DrillDownPanel.tsx`: inline expansion on cell click, loads JE lines via `useDrillDown`
- `ReportToolbar.tsx`: title input, Generate (Cmd+Enter), Save (Cmd+S), Export (Cmd+Shift+E)
- `ReportLoadingSkeleton.tsx` and `ReportEmptyState.tsx`
- Keyboard shortcuts via `useHotkeys`

### Phase 7: Frontend -- Template Management

**Goal**: Index page, save/share dialogs, scheduling UI.

- Custom reports index page (`/reports/custom/page.tsx`): DataTable with name, last run, run count, shared status
- Template detail pages: `/reports/custom/new`, `/reports/custom/[uuid]`, `/reports/custom/[uuid]/edit`
- `SaveTemplateDialog.tsx`: name, description, share mode (private/read-only/editable)
- `ScheduleDialog.tsx`: frequency, day, time, recipients, export format
- `ExportFormatPicker.tsx`: PDF/Excel dropdown
- `use-report-templates.ts` and `use-report-schedules.ts` TanStack Query hooks
- Navigation update: add "Custom Reports" to `reportsNav`
- Permission-based UI hiding (`Can` component)
- `N` keyboard shortcut on index page

### Phase 8: Tests & Polish

**Goal**: Comprehensive test coverage and edge case handling.

- Feature tests: template CRUD (auth, validation, 50-limit, sharing modes)
- Feature tests: report generation accuracy (monthly grouping, quarterly, annual, total_only)
- Feature tests: comparison columns (prior period, prior year, budget)
- Feature tests: drill-down (correct JE lines, filters applied)
- Feature tests: export (PDF generated, Excel with formulas)
- Feature tests: schedule CRUD and processing
- Feature tests: permission enforcement (report.custom vs report.custom-view)
- Feature tests: feature flag gating (Starter workspace denied)
- Feature tests: tenant isolation (workspace A cannot see workspace B templates)
- Edge case tests: deleted accounts, empty results, inactive tracking options
- Browser tests: builder interaction, save flow, export download

---

## 8. Testing Strategy

### Unit Tests

- `ResolveDateRange`: all 11 relative presets with various `fiscal_year_start_month` values
- `BuildReportColumns`: column generation for each layout type
- Config validation: ensure invalid configs are rejected

### Feature Tests (API)

- **Template CRUD**: create, read, update, delete, duplicate with permission checks
- **50-template limit**: enforcement at API level
- **Generation**: verify output data accuracy against known JE line data
- **Streaming**: verify SSE event sequence (meta -> groups -> totals -> done)
- **Drill-down**: verify correct JE lines returned for account + period
- **Export**: PDF and Excel file generation (verify file exists, correct format)
- **Schedules**: CRUD, processing command, email delivery
- **Permissions**: `report.custom` vs `report.custom-view` role enforcement
- **Feature flag**: `custom_reports` gating on plan tier
- **Tenant isolation**: workspace scoping on all queries

### Browser Tests (Playwright)

- Builder page loads, config panel visible
- Select account types, generate report, verify table renders
- Click cell, verify drill-down panel expands
- Save template, verify it appears in index
- Export button triggers download

### Test Data Setup

```php
beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    // Create workspace with Professional tier (custom_reports enabled)
    // Seed chart accounts (revenue, expense types)
    // Create posted journal entries with lines across multiple months
    // Create jobs and tracking categories for filter testing
});
```

---

## 9. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Streaming SSE complexity in Next.js | Medium | Medium | Use `EventSource` API or `fetch` with `ReadableStream`. Test with chunked responses early |
| Complex query builder edge cases (empty periods, missing accounts) | Medium | Low | Extensive unit tests for `GenerateCustomReport` action |
| Excel formula generation complexity | Medium | Low | PhpSpreadsheet is well-documented. Build formulas incrementally, test with LibreOffice |
| Performance on large datasets (100K+ JE lines) | Low | High | Composite indexes, streaming, narrow drill-down queries. Load test with seeded data |
| SQLite date grouping differences | Low | Medium | Use `strftime()` consistently. Test all date grouping logic on SQLite |
| DomPDF rendering limitations (wide tables) | Low | Low | Landscape orientation, font-size reduction, truncation for very wide reports |

---

## 10. Development Clarifications

Decisions embedded from the 22 spec clarifications:

1. **Hybrid query strategy**: AccountBalance projector for summary aggregations, JE lines for drill-down detail. No new projectors needed.
2. **JSON config column**: Flexible, extensible schema on `ReportTemplate.config`. No normalized tables for report configuration.
3. **Streaming via SSE**: Progressive rendering with `text/event-stream`. Events: `meta`, `group` (one per account group), `totals`, `done`.
4. **No result caching**: Financial data must always be live. `config_snapshot` on ReportExecution is for audit, not cache.
5. **Relative date ranges**: 11 presets resolved at runtime using workspace `fiscal_year_start_month`.
6. **Three account selection modes**: by AccountType enum, by individual account_ids, exclude archived toggle. Combinable.
7. **Inline drill-down**: Expandable rows below clicked cells, not page navigation. Narrow JE line queries.
8. **Permission split**: `report.custom` (create/edit/manage) for owner/accountant. `report.custom-view` (run shared) for bookkeeper/approver/auditor/client.
9. **50 templates per workspace**: Hard limit enforced in `CreateReportTemplate` action.
10. **Professional/Enterprise only**: `custom_reports` feature flag in PlanTier.
11. **Comparison columns**: prior_period (shift by period length), prior_year (shift by 12 months), budget (from budgets table), variance_as_percentage.
12. **Export specifics**: PDF via DomPDF (landscape for 4+ columns, header/footer). Excel via PhpSpreadsheet (SUM formulas, outline levels, freeze panes).
13. **Schedule frequencies**: daily, weekly (day_of_week 0-6), monthly (day_of_month 1-28). No quarterly/yearly.
14. **Sharing model**: private (default), read_only, editable. Workspace is the sharing boundary.
15. **Out of scope**: Formula rows, cross-workspace reports, charts, versioning, column reordering, conditional formatting, public sharing, real-time collaboration.
