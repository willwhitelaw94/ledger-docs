---
title: "Implementation Plan: Repeating Entries"
---

# Implementation Plan: Repeating Entries

**Spec**: [spec.md](./spec.md)
**Created**: 2026-03-14
**Status**: Draft

## Technical Context

### Technology Stack
- Backend: Laravel 12, PHP 8.4, Lorisleiva Actions
- Frontend: Next.js 16, React 19, TypeScript, TanStack Query + Table
- Database: SQLite (dev), MySQL (prod)
- Scheduling: Laravel Task Scheduling (`php artisan schedule:run`)

### Existing Infrastructure (Already Built)
- `RecurringTemplate` model with full scheduling logic (`isDue()`, `advanceToNextDueDate()`)
- `recurring_templates` migration with workspace scoping, frequency, occurrences, `template_data` JSON
- `RecurringTemplateController` with CRUD + process endpoint (7 routes)
- `ProcessRecurringTemplate` action (currently JE-only)
- Settings page at `/settings/recurring` listing templates
- `StatusTabs` and `KanbanBoard` shared components (built this session)

### What Needs to Be Built
1. **Extend ProcessRecurringTemplate** to dispatch to invoice/bill creation actions
2. **Execution log table** — track every run attempt with outcome
3. **`recurring_template_id` column** on invoices and journal_entries for source tracking
4. **Idempotency guard** — `last_executed_at` on templates to prevent duplicates
5. **Artisan command** — `ProcessDueTemplates` for scheduler
6. **Bill type support** — extend `type` enum to include `bill`
7. **Frontend /repeating page** — dedicated list with StatusTabs
8. **"Save as Repeating" modal** — on invoice, bill, and JE detail pages
9. **Dashboard widget** — upcoming entries due this week

### Dependencies
- `CreateInvoice` action (005-IAR) — for invoice template execution
- `CreateBill` action — for bill template execution
- `CreateJournalEntry` action (002-CLE) — already wired
- `StatusTabs` component — already built

### Constraints
- Scheduler must be idempotent — safe to re-run without duplicates
- Template payloads must be validated before execution (contacts/accounts may be deleted)
- Templates are workspace-scoped — no cross-tenant execution

## Design Decisions

### Data Model

#### RecurringTemplate (EXTEND existing)
Add columns:
- `status` enum: `active`, `paused`, `completed` (replaces boolean `is_active`)
- `last_executed_at` timestamp nullable (idempotency guard)
- Expand `type` to include `bill`

#### RecurringTemplateExecution (NEW)
- `id` bigint PK
- `recurring_template_id` FK → recurring_templates
- `workspace_id` FK → workspaces (denormalised)
- `status` enum: `success`, `failed`
- `document_type` string (invoice, bill, journal_entry)
- `document_id` bigint nullable (polymorphic — the created document)
- `error_message` text nullable
- `executed_at` timestamp
- `created_at` timestamp

#### Invoice / JournalEntry (EXTEND existing)
Add column:
- `recurring_template_id` bigint nullable FK → recurring_templates

### API Contracts

Existing routes are sufficient for CRUD. Add:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/recurring-templates/counts` | Status counts for tabs |
| GET | `/api/v1/recurring-templates/{id}/executions` | Execution history for a template |
| POST | `/api/v1/recurring-templates/from-invoice/{uuid}` | Create template from existing invoice |
| POST | `/api/v1/recurring-templates/from-bill/{uuid}` | Create template from existing bill |
| POST | `/api/v1/recurring-templates/from-journal/{uuid}` | Create template from existing JE |
| POST | `/api/v1/recurring-templates/{id}/pause` | Pause a template |
| POST | `/api/v1/recurring-templates/{id}/resume` | Resume (recalculate next_due_date) |
| GET | `/api/v1/recurring-templates/upcoming` | Next 5 due within 7 days (dashboard widget) |

### UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `SaveAsRepeatingModal` | `components/repeating/` | Modal form: frequency, start, end, occurrences |
| `RepeatingListPage` | `app/(dashboard)/repeating/page.tsx` | Full DataTable with StatusTabs (Active/Paused/Completed) |
| `ExecutionHistoryPanel` | `components/repeating/` | Slide-over or expandable showing execution log |
| `UpcomingRepeatingWidget` | Dashboard component | Card listing next 5 due entries |

## Implementation Phases

### Phase 1: Backend Foundation (US3)
- Migration: add `status` enum + `last_executed_at` to recurring_templates
- Migration: create `recurring_template_executions` table
- Migration: add `recurring_template_id` to invoices + journal_entries
- Update RecurringTemplate model: status enum, executions relationship
- Extend ProcessRecurringTemplate to handle invoice + bill types
- Add idempotency guard (check `last_executed_at` against current period)
- Create `ProcessDueTemplates` artisan command
- Register in `app/Console/Kernel.php` or `routes/console.php` (daily)

### Phase 2: API Endpoints (US1, US2, US4)
- "From document" endpoints (from-invoice, from-bill, from-journal)
- Pause/resume endpoints
- Execution history endpoint
- Counts endpoint for tabs
- Upcoming endpoint for dashboard widget
- Update store validation to accept `bill` type

### Phase 3: Frontend — Repeating List Page (US2)
- `/repeating/page.tsx` with DataTable, StatusTabs (All/Active/Paused/Completed), type filter
- Row actions: Pause, Resume, Edit, Delete
- Template detail slide-over with execution history

### Phase 4: Frontend — Save as Repeating (US1)
- `SaveAsRepeatingModal` component (React Hook Form + Zod)
- Wire into invoice detail page (`/invoices/[uuid]`)
- Wire into bill detail page (`/bills/[uuid]`)
- Wire into journal entry detail page (`/journal-entries/[uuid]`)
- Extract document payload into template_data format

### Phase 5: Frontend — Polish (US5, US6)
- "Repeating" tab on invoice/bill/journal index pages
- Dashboard upcoming widget
- Add `/repeating` to sidebar navigation
- Pest feature tests for all new endpoints
- Browser tests for repeating list page

## Testing Strategy

### Phase 1 Tests
- Unit: ProcessRecurringTemplate for invoice/bill/JE dispatch, idempotency guard, status transitions
- Feature: ProcessDueTemplates command processes due templates, skips paused, handles errors

### Phase 2 Tests
- Feature: from-invoice/bill/journal endpoints create correct templates
- Feature: pause/resume recalculates next_due_date
- Feature: execution history returns correct log

### Phase 3-5 Tests
- Browser: /repeating page renders, StatusTabs work, row actions work
- Browser: "Save as Repeating" modal on invoice/bill/JE detail pages

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Template payload drift (schema changes) | Low | Medium | Validate payload before execution, log and flag on failure |
| Duplicate creation on scheduler retry | Low | High | `last_executed_at` idempotency check per frequency period |
| Deleted contact/account in template | Medium | Low | Validate references exist before dispatch, skip + log |
| Large template_data JSON | Low | Low | Cap line items at 50 per template |

## Gate 3: Architecture Check

| Check | Status |
|-------|--------|
| Architecture approach clear | PASS — extending existing RecurringTemplate infrastructure |
| Existing patterns leveraged | PASS — uses Lorisleiva Actions, existing creation actions |
| No impossible requirements | PASS — all FRs achievable with existing stack |
| Performance considered | PASS — daily cron, indexed queries, bounded execution |
| Security considered | PASS — workspace-scoped, permission-gated |
| Data model understood | PASS — 1 new table, 2 column additions, 1 model extension |
| API contracts clear | PASS — 8 new endpoints defined |
| Dependencies identified | PASS — CreateInvoice, CreateBill, CreateJournalEntry actions |
| Integration points mapped | PASS — scheduler, 3 detail pages, 3 index pages, dashboard |
| Scope matches spec | PASS — 6 user stories, phased delivery |
| Use Lorisleiva Actions | PASS — ProcessRecurringTemplate already uses AsAction |
| Migrations schema-only | PASS — no data operations in migrations |

**Gate 3 Result: PASS**

## Next Steps

1. Run `/speckit-tasks` to generate tasks.md
2. Run `/speckit-implement` to start development
