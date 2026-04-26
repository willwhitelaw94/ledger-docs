---
title: "Implementation Tasks: Custom Report Builder"
---

# Implementation Tasks: Custom Report Builder

**Epic**: 043-CRB
**Branch**: `043-CRB-custom-report-builder`

---

## Phase 1: Foundation

- [ ] T001 [P1] Create migration `database/migrations/2026_03_19_000001_create_report_templates_table.php` with three tables: `report_templates` (id, uuid, workspace_id, name, description, config JSON, is_shared bool default false, share_mode string nullable, created_by FK users, updated_by FK users nullable, last_run_at datetime nullable, run_count int default 0, timestamps), `report_schedules` (id, uuid, workspace_id, report_template_id FK, frequency string, day_of_week int nullable, day_of_month int nullable, time_of_day string default '08:00', timezone string, recipients JSON, export_format string default 'pdf', is_active bool default true, next_due_at datetime, last_executed_at datetime nullable, created_by FK users, timestamps), `report_executions` (id, uuid, workspace_id, report_template_id FK nullable, report_schedule_id FK nullable, config_snapshot JSON, status string, row_count int, duration_ms int, export_path string nullable, export_format string nullable, error_message text nullable, executed_by FK users nullable, executed_at datetime, created_at). Add composite indexes on `journal_entry_lines`: `(workspace_id, chart_account_id, entry_date)` via `journal_entries` join pattern and standalone index on `job_id`.

- [ ] T002 [P1] Create model `app/Models/Tenant/ReportTemplate.php` extending `Model` with: `$fillable` array (workspace_id, name, description, config, is_shared, share_mode, created_by, updated_by, last_run_at, run_count), `casts()` returning `['config' => 'array', 'is_shared' => 'boolean', 'last_run_at' => 'datetime', 'share_mode' => ReportShareMode::class]`, UUID generation in `booted()` static method, relationships: `workspace()` BelongsTo Workspace, `creator()` BelongsTo User (created_by), `updater()` BelongsTo User (updated_by), `schedules()` HasMany ReportSchedule, `executions()` HasMany ReportExecution. Follow `app/Models/Tenant/Meeting.php` pattern.

- [ ] T003 [P1] Create model `app/Models/Tenant/ReportSchedule.php` extending `Model` with: `$fillable` array (workspace_id, report_template_id, frequency, day_of_week, day_of_month, time_of_day, timezone, recipients, export_format, is_active, next_due_at, last_executed_at, created_by), `casts()` returning `['recipients' => 'array', 'is_active' => 'boolean', 'next_due_at' => 'datetime', 'last_executed_at' => 'datetime', 'frequency' => ReportScheduleFrequency::class]`, UUID generation in `booted()`, relationships: `template()` BelongsTo ReportTemplate, `creator()` BelongsTo User, `executions()` HasMany ReportExecution.

- [ ] T004 [P1] Create model `app/Models/Tenant/ReportExecution.php` extending `Model` with: `$fillable` array (workspace_id, report_template_id, report_schedule_id, config_snapshot, status, row_count, duration_ms, export_path, export_format, error_message, executed_by, executed_at), `casts()` returning `['config_snapshot' => 'array', 'executed_at' => 'datetime', 'status' => ReportExecutionStatus::class]`, UUID generation in `booted()`, `UPDATED_AT = null`, relationships: `template()` BelongsTo ReportTemplate (nullable), `schedule()` BelongsTo ReportSchedule (nullable), `executor()` BelongsTo User (executed_by, nullable).

- [ ] T005 [P1] Create enum `app/Enums/ReportColumnLayout.php` as `enum ReportColumnLayout: string` with cases: `Monthly = 'monthly'`, `Quarterly = 'quarterly'`, `Annual = 'annual'`, `TotalOnly = 'total_only'`. Add `label(): string` method.

- [ ] T006 [P1] Create enum `app/Enums/ReportRowGrouping.php` as `enum ReportRowGrouping: string` with cases: `AccountType = 'account_type'`, `TrackingCategory = 'tracking_category'`, `Job = 'job'`, `Contact = 'contact'`. Add `label(): string` method.

- [ ] T007 [P1] Create enum `app/Enums/ReportShareMode.php` as `enum ReportShareMode: string` with cases: `ReadOnly = 'read_only'`, `Editable = 'editable'`. Add `label(): string` method.

- [ ] T008 [P1] Create enum `app/Enums/ReportScheduleFrequency.php` as `enum ReportScheduleFrequency: string` with cases: `Daily = 'daily'`, `Weekly = 'weekly'`, `Monthly = 'monthly'`. Add `label(): string` method.

- [ ] T009 [P1] Create enum `app/Enums/ReportExecutionStatus.php` as `enum ReportExecutionStatus: string` with cases: `Completed = 'completed'`, `Failed = 'failed'`. Add `label(): string` method.

- [ ] T010 [P1] Update `database/seeders/RolesAndPermissionsSeeder.php`: add `'report.custom'` and `'report.custom-view'` to `allPermissions()`. Add both to `accountantPermissions()`. Add only `'report.custom-view'` to `bookkeeperPermissions()`, `approverPermissions()`, `auditorPermissions()`, and `clientPermissions()`.

- [ ] T011 [P1] Update `app/Enums/PlanTier.php`: add `'custom_reports'` string to the `features()` array for `Professional` and `Enterprise` cases only. Trial and Starter do not include it.

- [ ] T012 [P1] Create policy `app/Policies/ReportTemplatePolicy.php` with methods: `viewAny(User $user): bool` returns `$user->hasPermissionTo('report.custom-view')`, `view(User $user, ReportTemplate $template): bool` returns true if user has `report.custom-view` AND (template is owned by user OR template `is_shared` is true), `create(User $user): bool` returns `$user->hasPermissionTo('report.custom')`, `update(User $user, ReportTemplate $template): bool` returns true if user has `report.custom` AND (user is creator OR `share_mode` is `editable`), `delete(User $user, ReportTemplate $template): bool` returns true if user has `report.custom` AND user is `created_by`, `duplicate(User $user, ReportTemplate $template): bool` returns `$user->hasPermissionTo('report.custom')` AND template is viewable, `generate(User $user): bool` returns `$user->hasPermissionTo('report.custom-view')`, `export(User $user): bool` returns `$user->hasPermissionTo('report.custom-view')`.

- [ ] T013 [P1] Create policy `app/Policies/ReportSchedulePolicy.php` with methods: `viewAny`, `create`, `update`, `delete` all checking `$user->hasPermissionTo('report.custom')`. Update and delete additionally check the schedule's template is owned by the user.

- [ ] T014 [P1] Register both policies in `app/Providers/AppServiceProvider.php` `boot()` method: `Gate::policy(ReportTemplate::class, ReportTemplatePolicy::class)` and `Gate::policy(ReportSchedule::class, ReportSchedulePolicy::class)`.

- [ ] T015 [P1] Run migration and verify: `php artisan migrate`, confirm 3 tables created, confirm JE line indexes exist. Run `php artisan test --compact` to ensure no regressions.

---

## Phase 2: Report Generation Engine

- [ ] T016 [P1] Create action `app/Actions/Reporting/ResolveDateRange.php` with `AsAction` trait. Method `handle(string $type, ?string $relative, ?string $start, ?string $end, int $fiscalYearStartMonth): array` returning `['start' => string, 'end' => string]`. Implement all 11 relative presets: `current_fy` (fiscal year start to fiscal year end based on `$fiscalYearStartMonth`), `last_fy`, `current_quarter`, `last_quarter`, `current_month`, `last_month`, `last_3_months`, `last_6_months`, `last_12_months`, `year_to_date`, `fy_to_date`. For `absolute` type, return start/end as-is. Use `Carbon` for date math.

- [ ] T017 [P1] Create action `app/Actions/Reporting/BuildReportColumns.php` with `AsAction` trait. Method `handle(string $start, string $end, ReportColumnLayout $layout): array` returning array of `['key' => string, 'label' => string, 'start' => string, 'end' => string]`. For `monthly`: one entry per calendar month using `strftime('%Y-%m')` compatible keys. For `quarterly`: one per calendar quarter. For `annual`: one per year (fiscal year boundary). For `total_only`: single entry spanning full range. Always append a `total` column.

- [ ] T018 [P1] Create action `app/Actions/Reporting/GenerateCustomReport.php` with `AsAction` trait. Method `handle(int $workspaceId, array $config, ?int $templateId = null): \Symfony\Component\HttpFoundation\StreamedResponse`. Core logic:
  1. Call `ResolveDateRange::run()` to get absolute start/end from config `filters.date_range`
  2. Call `BuildReportColumns::run()` to get period columns from resolved range + `layout.column_layout`
  3. Resolve account IDs: union of accounts matching `data_sources.account_type_filters` types AND `data_sources.account_ids` individual accounts, excluding archived unless `include_archived` is true
  4. Query `journal_entry_lines` joined to `journal_entries` (where `status = 'posted'`, `workspace_id` scoped, `entry_date` between start/end), filtered by `job_ids`, `contact_ids`, `entry_types`, tracking category filters (JSON `tracking` column)
  5. Group by `chart_account_id` + period key (using `strftime('%Y-%m', journal_entries.entry_date)` for monthly, similar for quarterly/annual)
  6. Compute sign-adjusted net movement per account per period (debit - credit for debit-normal, credit - debit for credit-normal)
  7. If comparisons enabled, run parallel queries shifted by period length (prior_period) or 12 months (prior_year), and/or budget lookup
  8. Group accounts by `layout.row_grouping` (default `account_type`)
  9. Stream SSE events: `meta` (title, resolved date range, column headers), one `group` per account group (accounts array with values, subtotal), `totals` (grand total), `done`
  10. Record `ReportExecution` with config_snapshot, duration_ms, row_count, status

- [ ] T019 [P1] Create action `app/Actions/Reporting/DrillDownReportCell.php` with `AsAction` trait. Method `handle(int $workspaceId, int $accountId, string $periodStart, string $periodEnd): array`. Query `journal_entry_lines` joined to `journal_entries`, `contacts`, `project_jobs` where `workspace_id` matches, `chart_account_id` matches, `entry_date` between periodStart/periodEnd, `status = 'posted'`. Return array of rows with: `journal_entry_uuid`, `entry_number`, `entry_date`, `description`, `direction`, `amount`, `contact_name`, `job_name`. Also return meta: `account_id`, `account_name`, `period_start`, `period_end`, `total`, `count`.

---

## Phase 3: Template CRUD

- [ ] T020 [P1] Create action `app/Actions/Reporting/CreateReportTemplate.php` with `AsAction` trait. Method `handle(int $workspaceId, int $userId, array $validated): ReportTemplate`. Enforce 50-template limit: `ReportTemplate::where('workspace_id', $workspaceId)->count() >= 50` throws `ValidationException`. Create template with UUID, workspace_id, created_by, and validated fields. Follow `app/Actions/Meeting/CreateMeeting.php` pattern.

- [ ] T021 [P1] Create action `app/Actions/Reporting/DuplicateReportTemplate.php` with `AsAction` trait. Method `handle(ReportTemplate $template, int $userId): ReportTemplate`. Clone template with `name` appended with " (Copy)", `is_shared = false`, `share_mode = null`, `created_by = $userId`, `run_count = 0`, `last_run_at = null`.

- [ ] T022 [P1] Create form request `app/Http/Requests/Report/StoreReportTemplateRequest.php`: `authorize()` returns `$this->user()->can('create', ReportTemplate::class)`. Rules: `name` required string max:255, `description` nullable string, `config` required array, `config.data_sources` required array, `config.data_sources.account_type_filters` nullable array of strings (in: asset, liability, equity, revenue, expense), `config.data_sources.account_ids` nullable array of integers, `config.data_sources.include_archived` boolean, `config.filters` required array, `config.filters.date_range` required array, `config.filters.date_range.type` required string (in: relative, absolute), `config.layout` required array, `config.layout.column_layout` required string (in: monthly, quarterly, annual, total_only), `config.layout.row_grouping` required string (in: account_type, tracking_category, job, contact), `is_shared` boolean, `share_mode` nullable string (in: read_only, editable).

- [ ] T023 [P1] Create form request `app/Http/Requests/Report/UpdateReportTemplateRequest.php`: `authorize()` resolves template via `ReportTemplate::where('uuid', $this->route('uuid'))->where('workspace_id', $this->input('workspace_id'))->firstOrFail()`, stashes on `$this->attributes->set('reportTemplate', $template)`, returns `$this->user()->can('update', $template)`. Rules: same as Store but all fields optional (sometimes).

- [ ] T024 [P1] Create form request `app/Http/Requests/Report/GenerateReportRequest.php`: `authorize()` returns `$this->user()->can('generate', ReportTemplate::class)` (policy method on class, not instance). Rules: `config` required array with same nested validation as StoreReportTemplateRequest config rules.

- [ ] T025 [P1] Create API resource `app/Http/Resources/ReportTemplateResource.php`: return `['uuid', 'name', 'description', 'config', 'is_shared', 'share_mode', 'created_by' => ['id', 'name', 'email'], 'updated_by' => optional, 'last_run_at', 'run_count', 'is_owner' => $this->created_by === request()->user()->id, 'can_edit' => ..., 'schedules_count' => $this->whenCounted('schedules'), 'created_at', 'updated_at']`.

- [ ] T026 [P1] Create controller `app/Http/Controllers/Api/ReportTemplateController.php` extending Controller. Methods:
  - `index(Request $request): AnonymousResourceCollection` — `Gate::authorize('viewAny', ReportTemplate::class)`, query templates where `workspace_id` matches AND (created_by = user OR is_shared = true), order by `updated_at` desc, paginate. Return `ReportTemplateResource::collection()`.
  - `store(StoreReportTemplateRequest $request): ReportTemplateResource` — call `CreateReportTemplate::run()`.
  - `show(Request $request, string $uuid): ReportTemplateResource` — find by uuid + workspace_id, `Gate::authorize('view', $template)`, return resource.
  - `update(UpdateReportTemplateRequest $request, string $uuid): ReportTemplateResource` — get from `$request->attributes->get('reportTemplate')`, update with validated data.
  - `destroy(Request $request, string $uuid): JsonResponse` — find, `Gate::authorize('delete', $template)`, delete, return message.
  - `duplicate(Request $request, string $uuid): ReportTemplateResource` — find, `Gate::authorize('duplicate', $template)`, call `DuplicateReportTemplate::run()`.

- [ ] T027 [P1] Add generation methods to `ReportTemplateController`:
  - `generate(GenerateReportRequest $request): StreamedResponse` — call `GenerateCustomReport::run($request->integer('workspace_id'), $request->validated('config'))`. Return streamed SSE response.
  - `generateFromTemplate(Request $request, string $uuid): StreamedResponse` — find template, `Gate::authorize('view', $template)`, increment `run_count` and `last_run_at`, call `GenerateCustomReport::run()` with template config (merged with any request overrides). Return streamed SSE response.
  - `drillDown(Request $request, string $uuid): JsonResponse` — validate `account_id`, `period_start`, `period_end` query params, call `DrillDownReportCell::run()`, return JSON.
  - `export(Request $request, string $uuid, string $format): BinaryFileResponse` — find template, generate report data (non-streaming), call `ExportReportPdf::run()` or `ExportReportExcel::run()` based on format, log ReportExecution, return file download.

- [ ] T028 [P1] Add routes to `routes/api.php` inside the workspace-scoped middleware group. Add `use App\Http\Controllers\Api\ReportTemplateController;` import. Wrap in feature check: `Route::middleware(['feature:custom_reports'])->group(function () { ... })`. Routes:
  ```
  Route::get('report-templates', [ReportTemplateController::class, 'index']);
  Route::post('report-templates', [ReportTemplateController::class, 'store']);
  Route::get('report-templates/{uuid}', [ReportTemplateController::class, 'show']);
  Route::patch('report-templates/{uuid}', [ReportTemplateController::class, 'update']);
  Route::delete('report-templates/{uuid}', [ReportTemplateController::class, 'destroy']);
  Route::post('report-templates/{uuid}/duplicate', [ReportTemplateController::class, 'duplicate']);
  Route::post('report-templates/generate', [ReportTemplateController::class, 'generate']);
  Route::post('report-templates/{uuid}/generate', [ReportTemplateController::class, 'generateFromTemplate']);
  Route::get('report-templates/{uuid}/drill-down', [ReportTemplateController::class, 'drillDown']);
  Route::post('report-templates/{uuid}/export/{format}', [ReportTemplateController::class, 'export']);
  ```

---

## Phase 4: Export

- [ ] T029 [P2] Install export dependencies: `composer require barryvdh/laravel-dompdf phpoffice/phpspreadsheet`.

- [ ] T030 [P2] Create action `app/Actions/Reporting/ExportReportPdf.php` with `AsAction` trait. Method `handle(array $reportData, string $title, array $dateRange, string $currency, int $workspaceId): string` returning storage path. Create a Blade view at `resources/views/reports/custom-report-pdf.blade.php` with: workspace name header, report title, date range subtitle, "Generated on" timestamp, table with column headers and grouped rows (indented account names under group headers), subtotals in bold, grand total row, amounts formatted with thousand separators and currency symbol, footer with page numbers. Use DomPDF: landscape orientation when column count >= 4, portrait otherwise. Save to `storage/app/reports/{workspaceId}/{uuid}.pdf`. Return the path.

- [ ] T031 [P2] Create action `app/Actions/Reporting/ExportReportExcel.php` with `AsAction` trait. Method `handle(array $reportData, string $title, array $dateRange, array $columns, int $workspaceId): string` returning storage path. Use PhpSpreadsheet: create worksheet named after template (truncated to 31 chars), write column headers in row 1 (Account Code, Account Name, then period labels, Total), freeze panes at row 2 column C, format amount cells as `#,##0.00`, for each group: write group header row, set outline level on account rows, write `=SUM()` formulas for subtotals (referencing actual cell ranges, not hardcoded values), write grand total row with `=SUM()` of subtotal cells. Save to `storage/app/reports/{workspaceId}/{uuid}.xlsx`. Return the path.

- [ ] T032 [P2] Add auto-purge logic: create artisan command `app/Console/Commands/PurgeOldReportExports.php` (`reports:purge-exports`) that deletes files in `storage/app/reports/` older than 30 days and their corresponding `ReportExecution` `export_path` references (set to null). Register in `routes/console.php` for daily execution.

---

## Phase 5: Scheduled Reports

- [ ] T033 [P3] Create form request `app/Http/Requests/Report/StoreReportScheduleRequest.php`: `authorize()` returns `$this->user()->can('create', ReportSchedule::class)`. Rules: `report_template_uuid` required string exists:report_templates,uuid, `frequency` required string in:daily,weekly,monthly, `day_of_week` required_if:frequency,weekly integer between:0,6, `day_of_month` required_if:frequency,monthly integer between:1,28, `time_of_day` required string regex:/^\d{2}:\d{2}$/, `recipients` required array min:1, `recipients.*` required email, `export_format` required string in:pdf,xlsx. Pre-load template in `authorize()` and stash on attributes.

- [ ] T034 [P3] Create form request `app/Http/Requests/Report/UpdateReportScheduleRequest.php`: similar to Store but fields are optional where appropriate. `authorize()` resolves schedule and checks ownership.

- [ ] T035 [P3] Create API resource `app/Http/Resources/ReportScheduleResource.php`: return `['uuid', 'template' => ReportTemplateResource (minimal), 'frequency', 'day_of_week', 'day_of_month', 'time_of_day', 'timezone', 'recipients', 'export_format', 'is_active', 'next_due_at', 'last_executed_at', 'created_at']`.

- [ ] T036 [P3] Create API resource `app/Http/Resources/ReportExecutionResource.php`: return `['uuid', 'template_name' => $this->template?->name, 'config_snapshot', 'status', 'row_count', 'duration_ms', 'export_format', 'has_export' => !is_null($this->export_path), 'error_message', 'executed_by' => $this->executor?->name, 'executed_at', 'created_at']`.

- [ ] T037 [P3] Create controller `app/Http/Controllers/Api/ReportScheduleController.php` with methods: `index(Request $request)` — `Gate::authorize('viewAny', ReportSchedule::class)`, query by workspace_id with template eager load, return collection. `store(StoreReportScheduleRequest $request)` — compute `next_due_at` from frequency/day/time/timezone, create schedule. `update(UpdateReportScheduleRequest $request, string $uuid)` — get from attributes, update, recompute `next_due_at`. `destroy(Request $request, string $uuid)` — find, authorize, delete.

- [ ] T038 [P3] Create controller `app/Http/Controllers/Api/ReportExecutionController.php` with single method: `index(Request $request)` — `Gate::authorize('viewAny', ReportTemplate::class)` (reuse permission), query by workspace_id optionally filtered by `report_template_id`, order by `executed_at` desc, paginate, return `ReportExecutionResource::collection()`.

- [ ] T039 [P3] Add schedule and execution routes to `routes/api.php` inside the `feature:custom_reports` group:
  ```
  Route::get('report-schedules', [ReportScheduleController::class, 'index']);
  Route::post('report-schedules', [ReportScheduleController::class, 'store']);
  Route::patch('report-schedules/{uuid}', [ReportScheduleController::class, 'update']);
  Route::delete('report-schedules/{uuid}', [ReportScheduleController::class, 'destroy']);
  Route::get('report-executions', [ReportExecutionController::class, 'index']);
  ```

- [ ] T040 [P3] Create action `app/Actions/Reporting/ProcessScheduledReports.php` with `AsAction` trait. Method `handle(): int` returning count of processed schedules. Query `ReportSchedule::where('is_active', true)->where('next_due_at', '<=', now())->with('template')->get()`. For each: generate report data (non-streaming), export to configured format, email via `ScheduledReportMail`, log `ReportExecution` (completed or failed), compute and update `next_due_at`, update `last_executed_at`. Wrap each schedule in try/catch — failures log execution with `failed` status and continue.

- [ ] T041 [P3] Create artisan command `app/Console/Commands/ProcessScheduledReportsCommand.php`: name `reports:process-scheduled`, calls `ProcessScheduledReports::run()`, outputs count processed. Register in `routes/console.php` with `Schedule::command('reports:process-scheduled')->everyFiveMinutes()`.

- [ ] T042 [P3] Create mailable `app/Mail/ScheduledReportMail.php`: constructor takes `ReportTemplate $template`, `string $filePath`, `string $format`. Build with subject "Report: {template.name} — {date}", attach file from storage path, body text with workspace name, report name, date range, and "Generated automatically by MoneyQuest".

---

## Phase 6: Frontend — Report Builder UI

- [ ] T043 [P1] Create TypeScript types at `frontend/src/types/report-template.ts`:
  ```typescript
  type ReportConfig = {
    data_sources: {
      account_type_filters: string[];
      account_ids: number[];
      include_archived: boolean;
    };
    filters: {
      job_ids: number[];
      tracking_filters: { category_id: number; option_ids: number[] }[];
      contact_ids: number[];
      date_range: { type: 'relative' | 'absolute'; relative?: string; start?: string; end?: string };
      entry_types: string[];
    };
    layout: {
      column_layout: 'monthly' | 'quarterly' | 'annual' | 'total_only';
      row_grouping: 'account_type' | 'tracking_category' | 'job' | 'contact';
      show_zero_balances: boolean;
      show_account_codes: boolean;
    };
    comparisons: {
      prior_period: boolean;
      prior_year: boolean;
      budget: boolean;
      variance_as_percentage: boolean;
    };
  };
  type ReportTemplate = { uuid: string; name: string; description: string | null; config: ReportConfig; is_shared: boolean; share_mode: 'read_only' | 'editable' | null; created_by: { id: number; name: string; email: string }; last_run_at: string | null; run_count: number; is_owner: boolean; can_edit: boolean; schedules_count: number; created_at: string; updated_at: string };
  type ReportSchedule = { uuid: string; template: ReportTemplate; frequency: string; day_of_week: number | null; day_of_month: number | null; time_of_day: string; timezone: string; recipients: string[]; export_format: string; is_active: boolean; next_due_at: string; last_executed_at: string | null; created_at: string };
  type ReportExecution = { uuid: string; template_name: string | null; status: string; row_count: number; duration_ms: number; export_format: string | null; has_export: boolean; error_message: string | null; executed_by: string | null; executed_at: string; created_at: string };
  type ReportStreamGroup = { type: string; label: string; accounts: { id: number; code: string; name: string; parent_id: number | null; values: number[]; comparison_values?: number[]; budget_values?: number[]; variance_percentages?: number[] }[]; subtotal: number[] };
  type ReportStreamMeta = { title: string; date_range: { start: string; end: string }; column_headers: string[] };
  type DrillDownRow = { journal_entry_uuid: string; entry_number: string; entry_date: string; description: string; direction: string; amount: number; contact_name: string | null; job_name: string | null };
  ```

- [ ] T044 [P1] Create Zustand store at `frontend/src/stores/report-builder.ts`: state includes `config: ReportConfig` (with sensible defaults: account_type_filters `['revenue', 'expense']`, relative `current_fy`, column_layout `monthly`, row_grouping `account_type`), `isDirty: boolean`, `templateUuid: string | null`, `templateName: string`, `templateDescription: string`. Actions: `setDataSources(partial)`, `setFilters(partial)`, `setLayout(partial)`, `setComparisons(partial)`, `loadFromTemplate(template: ReportTemplate)`, `reset()`, `markClean()`. Use `immer` middleware for immutable updates.

- [ ] T045 [P1] Create hook `frontend/src/hooks/use-report-generation.ts` with `useReportGeneration()`: accepts `config: ReportConfig`, returns `{ meta, groups, totals, isGenerating, error, generate }`. The `generate(workspaceId, config, templateUuid?)` function initiates a `fetch()` POST to the SSE endpoint, reads the stream via `ReadableStream` / `TextDecoder`, parses SSE events (`meta`, `group`, `totals`, `done`), and appends to state arrays progressively. Also export `useDrillDown(templateUuid: string)` — a TanStack Query mutation that POSTs to drill-down endpoint with `account_id`, `period_start`, `period_end` params, returns `DrillDownRow[]`. Also export `useExportReport(templateUuid: string)` — mutation that triggers file download via `POST /report-templates/{uuid}/export/{format}` and handles blob response.

- [ ] T046 [P1] Create component `frontend/src/components/reports/ReportBuilder.tsx` (`'use client'`): main container with flex layout — left panel (ReportConfigPanel, ~320px) and right area (ReportToolbar + ReportResultsTable or ReportEmptyState). Reads config from Zustand store. On mount, if `templateUuid` prop provided, fetch template and call `loadFromTemplate()`. Auto-generates report when config changes (debounced 500ms) per FR-006 (live update). Registers keyboard shortcuts: `Cmd+Enter` to force generate, `Cmd+S` to open save dialog, `Cmd+Shift+E` to open export picker, `Escape` to close drill-down.

- [ ] T047 [P1] Create component `frontend/src/components/reports/ReportConfigPanel.tsx`: collapsible accordion sections using shadcn Accordion: "Data Sources" (DataSourcePicker), "Filters" (ReportFilterPanel), "Layout" (ColumnLayoutSelector + row grouping select + show_zero_balances + show_account_codes toggles), "Comparisons" (ComparisonToggle). All update Zustand store on change.

- [ ] T048 [P1] Create component `frontend/src/components/reports/DataSourcePicker.tsx`: account type checkboxes (Asset, Liability, Equity, Revenue, Expense) from `AccountType` values. Multi-select combobox for individual accounts (fetched via existing `useChartAccounts` or similar hook, searchable). Toggle for `include_archived`.

- [ ] T049 [P1] Create component `frontend/src/components/reports/ReportFilterPanel.tsx`: date range picker (DateRangePicker component), job multi-select (using existing `useJobs` hook), tracking category filter (category dropdown -> option multi-select, addable rows), contact multi-select (using existing `useContacts` hook), entry type checkboxes (standard, adjustment, closing_entry).

- [ ] T050 [P1] Create component `frontend/src/components/reports/DateRangePicker.tsx`: Select dropdown with relative presets (current_fy, last_fy, current_quarter, last_quarter, current_month, last_month, last_3_months, last_6_months, last_12_months, year_to_date, fy_to_date) plus "Custom" option. When "Custom" selected, show two date inputs (start, end). Display resolved date range text below.

- [ ] T051 [P1] Create component `frontend/src/components/reports/ColumnLayoutSelector.tsx`: RadioGroup with options: Monthly, Quarterly, Annual, Total Only. Uses shadcn RadioGroup.

- [ ] T052 [P1] Create component `frontend/src/components/reports/ComparisonToggle.tsx`: checkboxes for `prior_period`, `prior_year`, `budget`, `variance_as_percentage`. Budget checkbox disabled with tooltip if workspace has no active budget.

- [ ] T053 [P1] Create component `frontend/src/components/reports/ReportResultsTable.tsx`: renders streamed report data progressively. Structure: table with sticky first column (account name), horizontal scroll for period columns. Renders `ReportGroupRow` for each group (collapsible header with group label and subtotal), `ReportAccountRow` for each account within group. Comparison sub-columns rendered under each period header when active. Grand total row at bottom. Click handler on amount cells to trigger drill-down. Show `ReportLoadingSkeleton` for groups not yet received during streaming.

- [ ] T054 [P1] Create component `frontend/src/components/reports/ReportGroupRow.tsx`: clickable group header row with group label (e.g., "Revenue"), subtotal values across columns, bold styling, collapsible via chevron icon. Uses `data-group` attribute for keyboard navigation.

- [ ] T055 [P1] Create component `frontend/src/components/reports/ReportAccountRow.tsx`: account row with optional code prefix, account name (indented if child via `parent_id`), period values formatted via `formatMoney()` from `@/lib/money`. Each value cell is clickable (triggers drill-down). Negative values shown in parentheses or red.

- [ ] T056 [P1] Create component `frontend/src/components/reports/DrillDownPanel.tsx`: inline expandable panel below clicked row. Shows loading spinner while fetching, then DataTable of JE lines with columns: Date, Entry #, Description, Debit/Credit, Contact, Job. "Close" button or Escape to collapse. Uses `useDrillDown` hook.

- [ ] T057 [P1] Create component `frontend/src/components/reports/ReportToolbar.tsx`: flex row with: editable report title input (for unsaved) or display title (for saved), "Generate" button with `Cmd+Enter` kbd badge, "Save" button with `Cmd+S` kbd badge (opens SaveTemplateDialog), "Export" dropdown button with `Cmd+Shift+E` kbd badge (ExportFormatPicker), "Schedule" button (opens ScheduleDialog, only for saved templates). Show `run_count` and `last_run_at` for saved templates.

- [ ] T058 [P1] Create component `frontend/src/components/reports/ReportEmptyState.tsx`: shown when report generates but returns zero rows. Message: "No data matches your filters" with suggestions to broaden date range or account selection.

- [ ] T059 [P1] Create component `frontend/src/components/reports/ReportLoadingSkeleton.tsx`: skeleton rows matching table structure, animated shimmer. Show during streaming for groups not yet received.

---

## Phase 7: Frontend — Template Management

- [ ] T060 [P1] Create hook `frontend/src/hooks/use-report-templates.ts` following `frontend/src/hooks/use-meetings.ts` pattern. Export: `useReportTemplates(params?: { page?, per_page?, search? })` — GET `/report-templates`, `useReportTemplate(uuid: string)` — GET `/report-templates/{uuid}`, `useCreateReportTemplate()` — POST mutation, `useUpdateReportTemplate()` — PATCH mutation, `useDeleteReportTemplate()` — DELETE mutation, `useDuplicateReportTemplate()` — POST mutation to `/report-templates/{uuid}/duplicate`. All invalidate `['report-templates']` query key on success.

- [ ] T061 [P3] Create hook `frontend/src/hooks/use-report-schedules.ts`: `useReportSchedules()`, `useCreateReportSchedule()`, `useUpdateReportSchedule()`, `useDeleteReportSchedule()`. Follow same TanStack Query mutation pattern.

- [ ] T062 [P1] Create page `frontend/src/app/(dashboard)/reports/custom/page.tsx` (`'use client'`): PageContainer with title "Custom Reports", breadcrumbs `[{ label: "Reports" }, { label: "Custom Reports" }]`. Actions: `Can` permission="report.custom" wrapping "New Report" button linking to `/reports/custom/new` with `N` kbd badge. Body: DataTable with columns: Name (linked to `/reports/custom/{uuid}`), Description (truncated), Last Run (relative date), Runs (count), Shared (badge), Actions (dropdown: Open, Edit, Duplicate, Delete). Search filter. Use `useReportTemplates` hook. Register `N` keyboard shortcut to navigate to `/reports/custom/new`.

- [ ] T063 [P1] Create page `frontend/src/app/(dashboard)/reports/custom/new/page.tsx`: renders `ReportBuilder` component with no `templateUuid` prop. PageContainer with title "New Custom Report", breadcrumbs `[{ label: "Reports" }, { label: "Custom Reports", href: "/reports/custom" }, { label: "New Report" }]`.

- [ ] T064 [P1] Create page `frontend/src/app/(dashboard)/reports/custom/[uuid]/page.tsx`: renders `ReportBuilder` component with `templateUuid` from route params. Fetches template on mount, auto-generates.

- [ ] T065 [P1] Create page `frontend/src/app/(dashboard)/reports/custom/[uuid]/edit/page.tsx`: renders `ReportBuilder` component with `templateUuid` and `editMode={true}` props. Same as view but enables save on existing template.

- [ ] T066 [P1] Create component `frontend/src/components/reports/SaveTemplateDialog.tsx`: Dialog with React Hook Form + Zod schema: `name` (required, max 255), `description` (optional), `is_shared` checkbox, `share_mode` radio (read_only/editable, only visible when is_shared). Submit calls `useCreateReportTemplate` (new) or `useUpdateReportTemplate` (existing). Close on success, show toast.

- [ ] T067 [P3] Create component `frontend/src/components/reports/ScheduleDialog.tsx`: Dialog with React Hook Form + Zod: `frequency` select (daily/weekly/monthly), `day_of_week` select (conditional on weekly), `day_of_month` select (conditional on monthly), `time_of_day` time input, `recipients` tag input (email validation), `export_format` select (PDF/Excel). Submit calls `useCreateReportSchedule` or `useUpdateReportSchedule`.

- [ ] T068 [P1] Create component `frontend/src/components/reports/ExportFormatPicker.tsx`: DropdownMenu with two items: "Export as PDF" and "Export as Excel (XLSX)". On click, calls `useExportReport` mutation with the selected format. Shows loading spinner on the button during download.

- [ ] T069 [P1] Update `frontend/src/lib/navigation.ts`: add `{ title: "Custom Reports", url: "/reports/custom" }` to the `reportsNav[0].items` array after the existing report items.

- [ ] T070 [P1] Register report builder keyboard shortcuts in `frontend/src/stores/shortcuts.ts` (or wherever global shortcuts are registered): add entries for `Cmd+Enter` (generate), `Cmd+S` (save template), `Cmd+Shift+E` (export), scoped to the builder page context. Add `N` shortcut to the custom reports index page for "New Report".

---

## Phase 8: Tests & Polish

- [ ] T071 [P1] Create `tests/Feature/Api/ReportTemplateTest.php` with Pest. `beforeEach`: seed `RolesAndPermissionsSeeder`, create user + org + workspace (Professional tier), attach user as owner, set workspace headers. Tests:
  - `it('lists report templates for workspace')` — create 3 templates (2 owned, 1 shared by another user), GET index, assert 3 returned
  - `it('creates a report template')` — POST with valid config, assert 201, assert template in DB with correct workspace_id and created_by
  - `it('enforces 50-template limit')` — create 50 templates, POST 51st, assert 422
  - `it('shows a report template by uuid')` — GET show, assert config JSON returned correctly
  - `it('updates own template')` — PATCH with new name, assert 200
  - `it('prevents updating another user shared read-only template')` — create template by user B with share_mode=read_only, PATCH as user A, assert 403
  - `it('allows updating shared editable template')` — create by user B with share_mode=editable, PATCH as user A, assert 200
  - `it('deletes own template')` — DELETE, assert 200, assert soft deleted or hard deleted
  - `it('prevents deleting another user template')` — DELETE template owned by user B, assert 403
  - `it('duplicates a template')` — POST duplicate, assert new template with "(Copy)" suffix, different uuid
  - `it('denies access for starter tier workspace')` — workspace with Starter plan, assert 403 on all endpoints

- [ ] T072 [P1] Create `tests/Feature/Api/CustomReportGenerationTest.php` with Pest. `beforeEach`: seed permissions, create workspace with Professional tier, seed chart accounts (revenue type: "Sales" id=1, expense type: "Rent" id=2), create 3 posted journal entries with lines across Jan, Feb, Mar 2026. Tests:
  - `it('generates a monthly report with correct totals')` — POST generate with config selecting revenue+expense, absolute date range Jan-Mar 2026, monthly layout. Parse SSE stream events, verify meta has 4 columns (Jan, Feb, Mar, Total), verify group data has correct per-month amounts matching seeded JE lines
  - `it('generates a total-only report')` — single Total column, verify amounts sum correctly
  - `it('filters by job_id')` — seed JE lines on different jobs, filter by one job, verify only matching lines included
  - `it('handles empty results gracefully')` — filter by non-existent job, verify empty groups with zero totals
  - `it('respects workspace isolation')` — create second workspace with JE data, generate report in first workspace, verify no cross-contamination
  - `it('generates from saved template')` — save template, POST generateFromTemplate, verify run_count incremented and last_run_at updated

- [ ] T073 [P1] Add drill-down tests to `CustomReportGenerationTest.php`:
  - `it('returns drill-down JE lines for account and period')` — GET drill-down with account_id, period_start, period_end, verify correct JE lines returned with entry_number, description, amount, direction
  - `it('drill-down respects workspace scoping')` — verify no cross-workspace JE lines

- [ ] T074 [P1] Create `tests/Feature/Api/ReportExportTest.php` with Pest:
  - `it('exports report as PDF')` — POST export/pdf, assert 200, assert Content-Type contains pdf, assert file exists in storage
  - `it('exports report as Excel')` — POST export/xlsx, assert 200, assert Content-Type contains spreadsheet
  - `it('logs report execution on export')` — verify ReportExecution record created with correct status, duration_ms, export_format

- [ ] T075 [P1] Add permission enforcement tests across all test files:
  - `it('denies bookkeeper from creating templates')` — assign bookkeeper role, POST store, assert 403
  - `it('allows bookkeeper to view shared templates')` — assign bookkeeper role (has report.custom-view), GET index with shared template, assert 200
  - `it('allows bookkeeper to generate from shared template')` — POST generateFromTemplate, assert 200 (streaming response)
  - `it('denies client from creating schedules')` — assert 403

- [ ] T076 [P3] Create `tests/Feature/Api/ReportScheduleTest.php` with Pest:
  - `it('creates a schedule for a template')` — POST with frequency=monthly, day_of_month=1, verify schedule created with computed next_due_at
  - `it('updates a schedule')` — PATCH with new frequency, verify next_due_at recomputed
  - `it('deletes a schedule')` — DELETE, verify removed
  - `it('processes due scheduled reports')` — create schedule with next_due_at in the past, run `ProcessScheduledReports::run()`, verify ReportExecution created with status=completed, verify next_due_at advanced

- [ ] T077 [P2] Run full test suite: `php artisan test --compact`. Verify zero failures. Run `vendor/bin/pint --dirty` to format all new files.

- [ ] T078 [P2] Add composite indexes migration verification: seed 10K+ journal entry lines, run a report generation, verify response time is under 5 seconds. Log `duration_ms` in ReportExecution.

---

## Summary

**Total tasks**: 78
**Phase breakdown**:
- Phase 1 (Foundation): T001-T015 (15 tasks)
- Phase 2 (Report Generation Engine): T016-T019 (4 tasks)
- Phase 3 (Template CRUD): T020-T028 (9 tasks)
- Phase 4 (Export): T029-T032 (4 tasks)
- Phase 5 (Scheduled Reports): T033-T042 (10 tasks)
- Phase 6 (Frontend Builder UI): T043-T059 (17 tasks)
- Phase 7 (Frontend Template Management): T060-T070 (11 tasks)
- Phase 8 (Tests & Polish): T071-T078 (8 tasks)

**Priority breakdown**:
- P1 (must-have): 64 tasks
- P2 (important): 5 tasks
- P3 (nice-to-have): 9 tasks
