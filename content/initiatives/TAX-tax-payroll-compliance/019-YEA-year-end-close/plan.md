---
title: "Implementation Plan: Year-End Close"
---

# Implementation Plan: Year-End Close

**Epic**: 019-YEA | **Date**: 2026-03-15 | **Spec**: [spec.md](./spec.md)

## Summary

Build a guided year-end close workflow on top of the existing accounting periods infrastructure. Adds: journal entry type enum (year-end adjustment), a four-step close checklist with period close records, automated retained earnings rollover, workpaper notes with file attachments, Owner unlock with audit trail, and report-level adjustment filtering. The backend infrastructure for periods, JE aggregates, trial balance, and polymorphic notes already exists — this epic extends them.

## Technical Context

**Backend**: Laravel 12, PHP 8.4, Pest testing, Spatie event-sourcing v7
**Frontend**: Next.js 16, React 19, TypeScript, TanStack Query v5, shadcn/ui
**Database**: SQLite (local), amounts as integers (cents)
**Auth**: Sanctum cookie SPA auth, Spatie Permission (teams mode)

### What Already Exists

| Component | Location | Status |
|-----------|----------|--------|
| `AccountingPeriod` model | `app/Models/Tenant/AccountingPeriod.php` | Complete — Open/Closed/Locked status |
| `PeriodStatus` enum | `app/Enums/PeriodStatus.php` | Complete — Open, Closed, Locked |
| Period actions | `app/Actions/Ledger/{Create,Close,Lock,Reopen}Period.php` | Complete — basic transitions |
| `AccountingPeriodController` | `app/Http/Controllers/Api/AccountingPeriodController.php` | Complete — CRUD + close/lock/reopen |
| `AccountingPeriodPolicy` | `app/Policies/AccountingPeriodPolicy.php` | Complete — period.close, period.lock, period.reopen |
| `JournalEntryAggregate` | `app/Aggregates/JournalEntryAggregate.php` | Complete — no entry_type field yet |
| `JournalEntry` model | `app/Models/Tenant/JournalEntry.php` | Complete — no entry_type field yet |
| Trial balance endpoint | `ReportController::trialBalance()` | Complete — calculates from AccountBalance |
| Balance sheet action | `Actions/Reporting/GenerateBalanceSheet.php` | Complete — already calculates current_year_earnings |
| `AccountSubType::RETAINED_EARNINGS` | `app/Enums/AccountSubType.php` | Complete — exists and maps to Equity |
| Polymorphic notes (TipTap) | `app/Models/Tenant/Note.php` + `HasNotes` trait | Complete — JE, Invoice, Contact, Job |
| Polymorphic attachments | `app/Models/Tenant/Attachment.php` + `HasAttachments` trait | Complete |
| Permissions | `RolesAndPermissionsSeeder` | Complete — period.close/lock/reopen exist |
| Frontend periods page | `frontend/src/app/(dashboard)/settings/accounting-periods/page.tsx` | Complete — table + actions |
| Frontend hooks | `frontend/src/hooks/use-accounting-periods.ts` | Complete — CRUD + close/lock/reopen |

### What Needs Building

| Component | Type | Effort |
|-----------|------|--------|
| `JournalEntryType` enum | New | Tiny |
| Add `entry_type` to journal entries | Migration + model + aggregate | Small |
| `PeriodCloseRecord` model + migration | New | Small |
| `PeriodCloseEvent` model (audit timeline) | New | Small |
| `InitiateYearEndClose` action | New | Small |
| `CalculateRetainedEarningsRollover` action | New | Medium |
| `ConfirmRetainedEarningsRollover` action | New | Medium |
| `SignOffPeriodClose` action | New | Small |
| `UnlockPeriod` action | New (extends existing ReopenPeriod) | Small |
| Year-end close API endpoints | Extend AccountingPeriodController | Medium |
| Period lock validation in JE aggregate | Extend guard | Small |
| Frontend close workflow wizard | New page/component | Large |
| Frontend workpapers section | New component | Medium |
| Report filtering for adjustments | Extend ReportController | Small |
| Permissions update | Seeder update | Tiny |

## Design Decisions

### Data Model

**New enum: `JournalEntryType`**

```
JournalEntryType:
  - STANDARD (default for all existing entries)
  - YEAR_END_ADJUSTMENT (posted by accountant during close)
  - CLOSING_ENTRY (system-generated retained earnings rollover)
```

**Add `entry_type` column to `journal_entries` table** (migration):

```
alter journal_entries:
  - entry_type: string, default 'standard'
```

**New table: `period_close_records`**

```
period_close_records:
  - id: bigIncrements
  - workspace_id: FK workspaces
  - accounting_period_id: FK accounting_periods (unique per workspace)
  - status: string (in_progress|completed)
  - step_1_locked_at: timestamp, nullable
  - step_1_locked_by: FK users, nullable
  - step_2_reviewed_at: timestamp, nullable
  - step_2_reviewed_by: FK users, nullable
  - step_2_tb_balanced: boolean, nullable
  - step_2_fx_acknowledged: boolean, default false
  - step_3_posted_at: timestamp, nullable
  - step_3_posted_by: FK users, nullable
  - step_3_closing_entry_uuid: string, nullable (FK journal_entries.uuid)
  - step_3_net_profit: integer, nullable (cents)
  - step_4_signed_off_at: timestamp, nullable
  - step_4_signed_off_by: FK users, nullable
  - step_4_comment: text, nullable
  - unlocked_at: timestamp, nullable
  - unlocked_by: FK users, nullable
  - unlock_reason: text, nullable
  - timestamps
  - unique: (workspace_id, accounting_period_id)
```

**New table: `period_close_events`** (audit timeline)

```
period_close_events:
  - id: bigIncrements
  - period_close_record_id: FK period_close_records
  - event_type: string (locked|trial_balance_reviewed|retained_earnings_posted|signed_off|unlocked)
  - user_id: FK users
  - metadata: json, nullable (e.g. unlock_reason, tb_balanced, net_profit)
  - created_at: timestamp
```

**Extend `accounting_periods` table**:

No schema change needed — the status transitions (Open → Locked → Closed) already exist in `PeriodStatus`. The close record tracks the workflow steps.

**State transitions**:

```
Period: Open → Locked (Step 1) → Closed (Step 4 sign-off)
                ↓ (Owner unlock)
              Open (reset)

Close Record: in_progress → completed
                ↓ (Owner unlock)
              deleted (new record on re-close)
```

### API Contracts

**Year-End Close Workflow** (extend `AccountingPeriodController`):

| Method | Endpoint | Purpose | FR |
|--------|----------|---------|-----|
| POST | `/api/v1/accounting-periods/{id}/year-end-close` | Initiate close workflow, create record | FR-005, FR-006 |
| GET | `/api/v1/accounting-periods/{id}/close-record` | Get close record with steps status | FR-006 |
| POST | `/api/v1/accounting-periods/{id}/close-record/lock` | Step 1: Lock period | FR-007, FR-030 |
| GET | `/api/v1/accounting-periods/{id}/close-record/trial-balance` | Step 2: Get TB for period | FR-009 |
| POST | `/api/v1/accounting-periods/{id}/close-record/review-trial-balance` | Step 2: Acknowledge TB | FR-010 |
| GET | `/api/v1/accounting-periods/{id}/close-record/retained-earnings-preview` | Step 3: Preview closing entry | FR-015 |
| POST | `/api/v1/accounting-periods/{id}/close-record/confirm-retained-earnings` | Step 3: Post closing entry | FR-016 |
| POST | `/api/v1/accounting-periods/{id}/close-record/sign-off` | Step 4: Sign off | FR-011 |
| POST | `/api/v1/accounting-periods/{id}/unlock` | Owner unlock locked period | FR-031 |
| GET | `/api/v1/accounting-periods/{id}/close-record/timeline` | Audit timeline events | FR-028 |

**Workpapers** (polymorphic notes — already supported, extend morph map):

| Method | Endpoint | Purpose | FR |
|--------|----------|---------|-----|
| GET | `/api/v1/period-close/{id}/notes` | List workpaper notes | FR-021 |
| POST | `/api/v1/period-close/{id}/notes` | Create workpaper note | FR-021 |
| GET | `/api/v1/period-close/{id}/attachments` | List attachments | FR-023 |
| POST | `/api/v1/period-close/{id}/attachments` | Upload attachment | FR-023 |

**Journal Entry Extension**:

| Method | Endpoint | Purpose | FR |
|--------|----------|---------|-----|
| (existing) | `POST /api/v1/journal-entries` | Add `entry_type` field | FR-001 |
| (existing) | `GET /api/v1/journal-entries` | Filter by entry_type | FR-003 |

### UI Components (Next.js)

| Component | Location | Purpose |
|-----------|----------|---------|
| `YearEndCloseWizard` | `frontend/src/components/year-end/close-wizard.tsx` | Four-step wizard container |
| `Step1LockPeriod` | `frontend/src/components/year-end/step-lock.tsx` | Lock with unreconciled warning |
| `Step2TrialBalance` | `frontend/src/components/year-end/step-trial-balance.tsx` | TB review with FX warning |
| `Step3RetainedEarnings` | `frontend/src/components/year-end/step-retained-earnings.tsx` | Preview + confirm closing entry |
| `Step4SignOff` | `frontend/src/components/year-end/step-sign-off.tsx` | Sign-off form |
| `CloseTimeline` | `frontend/src/components/year-end/close-timeline.tsx` | Audit event timeline |
| `WorkpapersList` | `frontend/src/components/year-end/workpapers-list.tsx` | Workpaper notes list |
| `WorkpaperEditor` | `frontend/src/components/year-end/workpaper-editor.tsx` | TipTap rich text editor |
| `UnlockDialog` | `frontend/src/components/year-end/unlock-dialog.tsx` | Owner unlock with reason |
| `use-year-end-close.ts` | `frontend/src/hooks/use-year-end-close.ts` | TanStack Query hooks |
| Close detail page | `frontend/src/app/(dashboard)/settings/accounting-periods/[id]/close/page.tsx` | Close workflow page |

### Permission Update

Current permissions cover `period.close`, `period.lock`, `period.reopen`. Need to add:
- `period.unlock` — Owner only (unlock a locked period)
- `period.sign_off` — Accountant + Owner (year-end sign-off)

Entry type restriction is role-based logic in the JE aggregate guard, not a separate permission — Accountant + Owner can post year-end adjustments, Bookkeeper cannot.

## Implementation Phases

### Phase 1: Backend Foundation (Entry Type + Close Record)

**Goal**: Add entry_type to journal entries, create period close record infrastructure.

1. **Enum**: Create `JournalEntryType` — STANDARD, YEAR_END_ADJUSTMENT, CLOSING_ENTRY
2. **Migration**: Add `entry_type` column to `journal_entries` (default 'standard')
3. **Model**: Update `JournalEntry` — add `entry_type` to fillable/casts
4. **Aggregate**: Update `JournalEntryAggregate::create()` — accept optional `entry_type`, include in `JournalEntryCreated` event
5. **Projector**: Update `JournalEntryProjector::onJournalEntryCreated()` — write `entry_type`
6. **Migration**: Create `period_close_records` table
7. **Migration**: Create `period_close_events` table
8. **Model**: Create `PeriodCloseRecord` with relationships + step completion methods
9. **Model**: Create `PeriodCloseEvent`
10. **Resource**: Create `PeriodCloseRecordResource`, `PeriodCloseEventResource`
11. **Morph map**: Add `period_close_record` to `Relation::morphMap()` for notes/attachments

### Phase 2: Backend Close Workflow (Actions + API)

**Goal**: Build the four-step close workflow actions and API endpoints.

1. **Action**: `InitiateYearEndClose` — creates PeriodCloseRecord, validates period is Open
2. **Action**: `LockPeriodForClose` — locks period (Step 1), checks unreconciled bank txns, requires acknowledgement if any, logs event
3. **Guard**: Update `JournalEntryAggregate::create()` — reject entries dated in locked period UNLESS entry_type is YEAR_END_ADJUSTMENT and user is Accountant/Owner
4. **Action**: `ReviewTrialBalance` — marks Step 2 complete, records whether TB balanced and FX acknowledged, logs event
5. **Action**: `CalculateRetainedEarningsRollover` — sums revenue/expense account balances for period, identifies Retained Earnings account (or auto-creates code 3200), returns proposed closing entry lines
6. **Action**: `ConfirmRetainedEarningsRollover` — posts the closing entry via JournalEntryAggregate with entry_type CLOSING_ENTRY, marks Step 3 complete, logs event
7. **Action**: `SignOffPeriodClose` — records signer name/timestamp/comment, sets period status to Closed, marks Step 4 + record as completed, logs event
8. **Action**: `UnlockPeriod` — Owner only, requires reason, resets period to Open, deletes close record, logs unlock event
9. **Controller**: Add endpoints to `AccountingPeriodController` for all workflow steps
10. **Form Requests**: `InitiateCloseRequest`, `LockForCloseRequest`, `ReviewTrialBalanceRequest`, `ConfirmRetainedEarningsRequest`, `SignOffCloseRequest`, `UnlockPeriodRequest`
11. **Permissions**: Add `period.unlock`, `period.sign_off` to seeder
12. **Tests**: Full workflow tests, permission tests, lock enforcement tests

### Phase 3: Backend Extensions (Workpapers + Reports)

**Goal**: Workpaper notes on close records, report filtering by entry type.

1. **Trait**: Add `HasNotes` and `HasAttachments` to `PeriodCloseRecord`
2. **Routes**: Polymorphic notes/attachments routes for `period-close/{id}`
3. **Visibility**: Workpaper notes restricted to Accountant + Owner (policy check in NoteController)
4. **Report**: Extend `ReportController::generalLedger()` — add `entry_type` filter param
5. **Report**: Extend `ReportController::trialBalance()` — add `adjustments_only` filter
6. **Resource**: Update `JournalEntryResource` to include `entry_type`
7. **Tests**: Workpaper CRUD, visibility restriction, report filtering

### Phase 4: Frontend — Close Workflow

**Goal**: Build the close workflow wizard and integrate into accounting periods page.

1. **Page**: Create `/settings/accounting-periods/[id]/close/page.tsx` — close workflow page
2. **Hooks**: Create `use-year-end-close.ts` — initiate, lock, review TB, preview RE, confirm RE, sign off, unlock, timeline
3. **Component**: `YearEndCloseWizard` — step indicator + content container
4. **Component**: `Step1LockPeriod` — lock button, unreconciled txn warning with acknowledge
5. **Component**: `Step2TrialBalance` — inline TB table, balance check, FX warning for multi-currency
6. **Component**: `Step3RetainedEarnings` — preview closing entry lines table, confirm button with warning
7. **Component**: `Step4SignOff` — name (pre-filled), date, comment textarea, submit
8. **Component**: `CloseTimeline` — vertical timeline of close events
9. **Component**: `UnlockDialog` — reason textarea, confirm (Owner only)
10. **Integration**: Update accounting periods page — add "Year-End Close" button for open periods, show close status badge

### Phase 5: Frontend — Workpapers + Report Filters

**Goal**: Workpapers UI and report-level adjustment visibility.

1. **Component**: `WorkpapersList` — list workpaper notes with TipTap preview
2. **Component**: `WorkpaperEditor` — TipTap editor for creating/editing notes
3. **Integration**: Add workpapers tab to close workflow page (visible after Step 1)
4. **Filter**: Add entry_type filter to journal entries list page
5. **Filter**: Add "Adjustments only" toggle to general ledger report
6. **Badge**: Show "Year-End Adjustment" / "Closing Entry" badge on JE list and detail

## Testing Strategy

### Phase 1–2 Tests (Backend)

- **Feature**: Full close workflow — initiate → lock → review TB → confirm RE → sign off
- **Feature**: Lock enforcement — reject standard JE in locked period, allow year-end adjustment
- **Feature**: Retained earnings calculation matches P&L net profit
- **Feature**: Closing entry is immutable (reject edit/delete)
- **Feature**: Owner unlock resets period and deletes close record
- **Feature**: Unlock requires reason
- **Feature**: Permission tests — bookkeeper cannot initiate close, client cannot see workpapers
- **Feature**: Unreconciled txn warning on lock
- **Feature**: Auto-create Retained Earnings account (code 3200) if missing
- **Unit**: `CalculateRetainedEarningsRollover` with known account balances

### Phase 3 Tests

- **Feature**: Workpaper notes CRUD on close record
- **Feature**: Workpapers hidden from client/auditor roles
- **Feature**: General ledger filters by entry_type

### Phase 4–5 Tests (Playwright)

- **E2E**: Navigate to period, initiate close, step through wizard
- **E2E**: Year-End Adjustment badge visible on JE list
- **E2E**: Close workflow page renders all steps

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Closing entry calculation off by rounding | Low | High | Use integer cents throughout, test with known balances |
| Concurrent close attempts by two users | Low | Medium | Unique constraint on period_close_records, optimistic locking |
| Lock bypass via bank feed import | Medium | High | Check period lock in bank feed import action, reject backdated txns |
| Multi-currency FX not posted before close | Medium | Medium | FX warning on Step 2, soft block with acknowledgement |
| Large chart of accounts slows RE preview | Low | Low | RE calculation queries AccountBalance (already aggregated), not raw lines |

## Dependencies

- **002-CLE** — Core Ledger Engine (JournalEntryAggregate, AccountBalance)
- **007-FRC** — Financial Reporting (trial balance, balance sheet)
- **003-AUT** — Auth & Multi-tenancy (permissions, workspace scoping)
- **012-ATT** — Attachments (workpaper file uploads)
- **011-MCY** — Multi-Currency (FX warning logic)

## Next Steps

1. Run `/speckit-tasks` to generate implementation tasks from this plan
2. Start with Phase 1 (backend foundation) — entry_type + close record models
