---
title: "Implementation Tasks: Repeating Entries"
---

# Implementation Tasks: Repeating Entries

**Epic**: 024-RPT | **Generated**: 2026-03-14 | **Mode**: AI
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

---

## Phase 1: Backend Foundation — Migrations, Model, Enums

- [X] T001 Migration: `extend_recurring_templates_table` — add `status` string default 'active' (values: active, paused, completed), add `last_executed_at` timestamp nullable. Backfill: `UPDATE recurring_templates SET status = CASE WHEN is_active = 1 THEN 'active' ELSE 'paused' END`. File: `database/migrations/2026_03_15_100001_extend_recurring_templates_for_repeating.php`

- [X] T002 Migration: `create_recurring_template_executions_table` — columns: `id` bigint PK, `recurring_template_id` FK recurring_templates cascadeOnDelete, `workspace_id` FK workspaces cascadeOnDelete, `status` string not null (success/failed), `document_type` string not null (invoice/bill/journal_entry), `document_id` bigint nullable, `error_message` text nullable, `executed_at` timestamp not null, `created_at` timestamp. Index: `(recurring_template_id, executed_at DESC)`. File: `database/migrations/2026_03_15_100002_create_recurring_template_executions_table.php`

- [X] T003 Migration: `add_recurring_template_id_to_invoices` — add `recurring_template_id` bigint nullable FK recurring_templates nullOnDelete to `invoices` table. Index on `recurring_template_id`. File: `database/migrations/2026_03_15_100003_add_recurring_template_id_to_invoices.php`

- [X] T004 Migration: `add_recurring_template_id_to_journal_entries` — add `recurring_template_id` bigint nullable FK recurring_templates nullOnDelete to `journal_entries` table. Index on `recurring_template_id`. File: `database/migrations/2026_03_15_100004_add_recurring_template_id_to_journal_entries.php`

- [X] T005 [P] Enum: `RecurringTemplateStatus` — cases: Active, Paused, Completed. String-backed. File: `app/Enums/RecurringTemplateStatus.php`

- [X] T006 [P] Enum: `RecurringTemplateType` — cases: Invoice, Bill, JournalEntry (values: 'invoice', 'bill', 'journal_entry'). String-backed. File: `app/Enums/RecurringTemplateType.php`

- [X] T007 Model: `RecurringTemplateExecution` — `$fillable = ['recurring_template_id', 'workspace_id', 'status', 'document_type', 'document_id', 'error_message', 'executed_at']`, cast `executed_at` to datetime. `belongsTo(RecurringTemplate::class)`. Global scope on `workspace_id`. File: `app/Models/Tenant/RecurringTemplateExecution.php`

- [X] T008 Update `RecurringTemplate` model — add `status` to `$fillable`, cast `status` to `RecurringTemplateStatus`, cast `type` to `RecurringTemplateType`, cast `last_executed_at` to datetime. Add `hasMany(RecurringTemplateExecution::class, 'recurring_template_id')` relationship. Update `isDue()` to check `$this->status === RecurringTemplateStatus::Active` instead of `$this->is_active`. File: `app/Models/Tenant/RecurringTemplate.php`

- [X] T009 Update `Invoice` model — add `recurring_template_id` to `$fillable`. Add `belongsTo(RecurringTemplate::class)` relationship. File: `app/Models/Tenant/Invoice.php`

- [X] T010 Update `JournalEntry` model — add `recurring_template_id` to `$fillable`. Add `belongsTo(RecurringTemplate::class)` relationship. File: `app/Models/Tenant/JournalEntry.php`

- [X] T011 Run `php artisan migrate` and verify all 4 migrations succeed.

---

## Phase 2: Backend — Actions & Scheduler

- [X] T012 [US3] Extend `ProcessRecurringTemplate` action — dispatch based on `$template->type`: `invoice` calls `CreateInvoice::run(workspaceId, contactId, issueDate: next_due_date, dueDate: calculated from template, lines, createdBy, ...)`, `bill` calls `CreateBill::run(...)` with same pattern, `journal_entry` keeps existing `CreateJournalEntry::run(...)` logic. After creation, set `recurring_template_id` on the created document. Log execution to `RecurringTemplateExecution` (success). On exception: log execution (failed) with error message, don't advance schedule. File: `app/Actions/Recurring/ProcessRecurringTemplate.php`

- [X] T013 [US3] Add idempotency guard to `ProcessRecurringTemplate` — before processing, check if `$template->last_executed_at` is within the current frequency period (e.g., for monthly: same month+year). If already executed this period, skip silently. After successful execution, set `$template->last_executed_at = now()`. File: `app/Actions/Recurring/ProcessRecurringTemplate.php`

- [X] T014 [US3] Create `ProcessDueTemplates` artisan command — `php artisan recurring:process`. Query `RecurringTemplate::where('status', 'active')->where('next_due_date', '<=', today())`. For each, call `ProcessRecurringTemplate::run($template, systemUserId)`. Use workspace's first owner as `createdBy`. Log count of processed/skipped/failed to console output. File: `app/Console/Commands/ProcessDueTemplates.php`

- [X] T015 [US3] Register `ProcessDueTemplates` in scheduler — add `$schedule->command('recurring:process')->daily()->at('06:00')` to `routes/console.php` (or `app/Console/Kernel.php` if it exists). File: `routes/console.php`

---

## Phase 3: Backend — API Endpoints

- [X] T016 [US1] Endpoint: `POST /api/v1/recurring-templates/from-invoice/{uuid}` — load Invoice by uuid + workspace_id, extract `template_data` from invoice (contact_id, lines with chart_account_id/description/quantity/unit_price/tax_code/job_id, reference, notes, terms, currency). Validate request body: `name`, `frequency`, `start_date`, `next_due_date`, `end_date?`, `occurrences_remaining?`. Create RecurringTemplate with type='invoice'. Return 201. Gate: user must have `invoice.create` permission. File: `app/Http/Controllers/Api/RecurringTemplateController.php`

- [X] T017 [P][US1] Endpoint: `POST /api/v1/recurring-templates/from-bill/{uuid}` — same pattern as T016 but loads Invoice where type='bill', sets template type='bill', gate: `bill.create` permission. File: `app/Http/Controllers/Api/RecurringTemplateController.php`

- [X] T018 [P][US1] Endpoint: `POST /api/v1/recurring-templates/from-journal/{uuid}` — load JournalEntry by uuid + workspace_id, extract `template_data` (lines with chart_account_id/direction/amount, memo). Gate: `journal-entry.create` permission. File: `app/Http/Controllers/Api/RecurringTemplateController.php`

- [X] T019 [US2] Endpoint: `POST /api/v1/recurring-templates/{id}/pause` — set `status = 'paused'`. Return 200. File: `app/Http/Controllers/Api/RecurringTemplateController.php`

- [X] T020 [US2] Endpoint: `POST /api/v1/recurring-templates/{id}/resume` — set `status = 'active'`, recalculate `next_due_date` from today based on frequency. Return 200. File: `app/Http/Controllers/Api/RecurringTemplateController.php`

- [X] T021 [US4] Endpoint: `GET /api/v1/recurring-templates/{id}/executions` — return paginated `RecurringTemplateExecution` ordered by `executed_at DESC`, 20 per page. File: `app/Http/Controllers/Api/RecurringTemplateController.php`

- [X] T022 [P][US2] Endpoint: `GET /api/v1/recurring-templates/counts` — `selectRaw('status, count(*) as count')->groupBy('status')->pluck('count', 'status')`. File: `app/Http/Controllers/Api/RecurringTemplateController.php`

- [X] T023 [P][US6] Endpoint: `GET /api/v1/recurring-templates/upcoming` — query active templates where `next_due_date` between today and today+7days, limit 5, order by `next_due_date ASC`. Return `['data' => [...]]`. File: `app/Http/Controllers/Api/RecurringTemplateController.php`

- [X] T024 Routes: add all new routes to `routes/api.php` BEFORE the `recurring-templates/{id}` route. `from-invoice/{uuid}`, `from-bill/{uuid}`, `from-journal/{uuid}`, `{id}/pause`, `{id}/resume`, `{id}/executions`, `counts`, `upcoming`. File: `routes/api.php`

- [X] T025 Update existing `store` validation in `RecurringTemplateController` — expand `type` rule to `'in:journal_entry,invoice,bill'`. Update `template_data` validation to handle invoice/bill payload shape (contact_id, lines with quantity/unit_price/chart_account_id). File: `app/Http/Controllers/Api/RecurringTemplateController.php`

---

## Phase 4: Frontend — Hooks & Types

- [X] T026 [P] TypeScript types: add to `frontend/src/types/index.ts` — `RecurringTemplate { id: number; name: string; type: 'invoice' | 'bill' | 'journal_entry'; frequency: string; status: 'active' | 'paused' | 'completed'; start_date: string; end_date: string | null; next_due_date: string; occurrences_remaining: number | null; occurrences_completed: number; last_executed_at: string | null; template_data: Record<string, unknown>; created_at: string; }` and `RecurringTemplateExecution { id: number; status: 'success' | 'failed'; document_type: string; document_id: number | null; error_message: string | null; executed_at: string; }`. File: `frontend/src/types/index.ts`

- [X] T027 TanStack Query hook: `useRecurringTemplates(params?)` — GET `/api/v1/recurring-templates` with optional `type`, `status`, `include_inactive` params. Also `useRecurringTemplate(id)` for single. File: `frontend/src/hooks/use-recurring-templates.ts`

- [X] T028 [P] TanStack Query hook: `useRecurringTemplateCounts()` — GET `/api/v1/recurring-templates/counts`. File: `frontend/src/hooks/use-recurring-templates.ts`

- [X] T029 [P] TanStack Query hook: `useUpcomingRepeating()` — GET `/api/v1/recurring-templates/upcoming`. File: `frontend/src/hooks/use-recurring-templates.ts`

- [X] T030 [P] TanStack Query hook: `useTemplateExecutions(templateId)` — GET `/api/v1/recurring-templates/{id}/executions`. File: `frontend/src/hooks/use-recurring-templates.ts`

- [X] T031 Mutation hooks: `useCreateTemplateFromInvoice()` — POST `from-invoice/{uuid}`, `useCreateTemplateFromBill()` — POST `from-bill/{uuid}`, `useCreateTemplateFromJournal()` — POST `from-journal/{uuid}`, `usePauseTemplate()` — POST `{id}/pause`, `useResumeTemplate()` — POST `{id}/resume`, `useDeleteTemplate()` — DELETE `{id}`. All invalidate `recurring-templates` query. File: `frontend/src/hooks/use-recurring-templates.ts`

---

## Phase 5: Frontend — Repeating List Page [US2]

- [X] T032 [US2] Page: `/repeating/page.tsx` — DataTable with columns: Name (link), Type (badge), Contact, Frequency, Next Due, Last Run, Status (badge). StatusTabs: All / Active / Paused / Completed. Search by name. Row actions: View, Pause/Resume (conditional), Edit, Delete. Uses `useRecurringTemplates()` with status filter from active tab, `useRecurringTemplateCounts()` for tab badges. File: `frontend/src/app/(dashboard)/repeating/page.tsx`

- [X] T033 [P][US2] Add "Repeating" to sidebar navigation — icon: `Repeat` from lucide-react, url: `/repeating`. File: `frontend/src/lib/navigation.ts` (note: `G then R` shortcut not added because `r` is already bound to `/reports`)

---

## Phase 6: Frontend — Save as Repeating Modal [US1]

- [X] T034 [US1] Component: `SaveAsRepeatingModal` — Dialog with React Hook Form + Zod. Fields: `name` (string, pre-filled from document), `frequency` (select: weekly/fortnightly/monthly/quarterly/yearly, default monthly), `start_date` (date picker, default 1st of next month), `end_date` (optional date picker), `occurrences_remaining` (optional number). Props: `open: boolean`, `onOpenChange`, `onSubmit: (data) => void`, `defaultName: string`. File: `frontend/src/components/repeating/save-as-repeating-modal.tsx`

- [X] T035 [US1] Wire modal into invoice detail page — add "Save as Repeating" button (Repeat icon) in actions area. On click, open `SaveAsRepeatingModal`. On submit, call `useCreateTemplateFromInvoice().mutate(uuid, formData)`. Toast success + link to /repeating. File: `frontend/src/app/(dashboard)/invoices/[uuid]/page.tsx`

- [X] T036 [P][US1] Wire modal into bill detail page — same pattern as T035, using `useCreateTemplateFromBill()`. File: `frontend/src/app/(dashboard)/bills/[uuid]/page.tsx`

- [X] T037 [P][US1] Wire modal into journal entry detail page — same pattern, using `useCreateTemplateFromJournal()`. Read the JE detail page first to find where to place the button. File: `frontend/src/app/(dashboard)/journal-entries/[uuid]/page.tsx`

---

## Phase 7: Frontend — Execution History & Polish [US4, US5, US6]

- [X] T038 [US4] Component: `ExecutionHistoryPanel` — Sheet/slide-over showing paginated execution log for a template. Each row: date, status badge (success green / failed red), document number (linked to `/invoices/{uuid}` or `/journal-entries/{uuid}`), error message if failed. Uses `useTemplateExecutions(templateId)`. File: `frontend/src/components/repeating/execution-history-panel.tsx`

- [X] T039 [US4] Wire history panel into repeating list page — add "History" action to row dropdown. Opens `ExecutionHistoryPanel` with the template ID. File: `frontend/src/app/(dashboard)/repeating/page.tsx`

- [X] T040 [US5] Add "Repeating" tab to invoice index StatusTabs — filter invoices where `recurring_template_id IS NOT NULL`. Add `recurring_template_id` filter param to `useInvoices` hook. File: `frontend/src/app/(dashboard)/invoices/sales/page.tsx` and `frontend/src/hooks/use-invoices.ts`

- [X] T041 [P][US5] Add "Repeating" tab to bills index StatusTabs — same pattern. File: `frontend/src/app/(dashboard)/bills/page.tsx` and `frontend/src/hooks/use-bills.ts`

- [X] T042 [P][US5] Add "Repeating" tab to journal entries index StatusTabs — same pattern. File: `frontend/src/app/(dashboard)/journal-entries/page.tsx` and `frontend/src/hooks/use-journal-entries.ts`

- [X] T043 [US6] Dashboard widget: `UpcomingRepeatingWidget` — card showing next 5 due templates within 7 days. Each row: type icon (Receipt/FileText), name, amount (from template_data), due date. Empty state: "No repeating entries due this week". Uses `useUpcomingRepeating()`. File: `frontend/src/components/dashboard/upcoming-repeating-widget.tsx`

- [X] T044 [US6] Wire widget into dashboard page — add `UpcomingRepeatingWidget` to the dashboard layout. File: `frontend/src/app/(dashboard)/dashboard/page.tsx`

---

## Phase 8: Tests & Polish

- [X] T045 [P] Pest feature test: `RecurringTemplateApiTest` — test from-invoice creates template with correct payload, from-bill creates template, from-journal creates template, pause sets status to paused, resume recalculates next_due_date, counts returns correct shape, upcoming returns templates due within 7 days, 401 unauthenticated. File: `tests/Feature/Api/RecurringTemplateApiTest.php`

- [X] T046 [P] Pest feature test: `ProcessDueTemplatesTest` — test command processes due invoice template and creates draft invoice, processes due bill template and creates draft bill, processes due JE template and creates JE, skips paused templates, skips already-executed templates (idempotency), marks completed when occurrences exhausted, logs execution success/failure. File: `tests/Feature/Api/ProcessDueTemplatesTest.php`

- [X] T047 [P] Browser test: `RepeatingTest` — auth guard redirect, page renders with columns, StatusTabs visible, "Save as Repeating" button on invoice detail page. File: `tests/Browser/RepeatingTest.php`

- [X] T048 Run `vendor/bin/pint --dirty` — fix any formatting issues.

- [X] T049 Run TypeScript check — all repeating/recurring files clean (0 new errors). Pre-existing errors in banking/settings unchanged.
