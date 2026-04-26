---
title: "Implementation Tasks: Year-End Close"
---

# Implementation Tasks: Year-End Close

**Epic**: 019-YEA | **Mode**: AI | **Generated**: 2026-03-15

---

## Phase 1: Backend Foundation — Enums, Migrations, Models

- [X] T001 Enum: Create `JournalEntryType` — cases: STANDARD('standard'), YEAR_END_ADJUSTMENT('year_end_adjustment'), CLOSING_ENTRY('closing_entry'). File: `app/Enums/JournalEntryType.php`

- [X] T002 Migration: Add `entry_type` column to `journal_entries` table — `$table->string('entry_type')->default('standard')->after('status')`. File: `database/migrations/2026_03_15_100001_add_entry_type_to_journal_entries.php`

- [X] T003 Model: Update `JournalEntry` — add `entry_type` to `$fillable`, add `'entry_type' => JournalEntryType::class` to `casts()`. File: `app/Models/Tenant/JournalEntry.php`

- [X] T004 Event: Update `JournalEntryCreated` — add `public readonly ?string $entryType = null` parameter (nullable, defaults null for backward compat). File: `app/Events/Ledger/JournalEntryCreated.php`

- [X] T005 Aggregate: Update `JournalEntryAggregate::createEntry()` — add `?string $entryType = null` parameter, pass to `JournalEntryCreated` event. File: `app/Aggregates/JournalEntryAggregate.php`

- [X] T006 Projector: Update `JournalEntryProjector::onJournalEntryCreated()` — write `'entry_type' => $event->entryType ?? 'standard'` to JournalEntry::create(). File: `app/Projectors/JournalEntryProjector.php`

- [X] T007 [P] Migration: Create `period_close_records` table — columns: `id` bigIncrements, `workspace_id` FK workspaces, `accounting_period_id` FK accounting_periods, `status` string default 'in_progress', `step_1_locked_at` timestamp nullable, `step_1_locked_by` FK users nullable, `step_2_reviewed_at` timestamp nullable, `step_2_reviewed_by` FK users nullable, `step_2_tb_balanced` boolean nullable, `step_2_fx_acknowledged` boolean default false, `step_3_posted_at` timestamp nullable, `step_3_posted_by` FK users nullable, `step_3_closing_entry_uuid` string nullable, `step_3_net_profit` integer nullable, `step_4_signed_off_at` timestamp nullable, `step_4_signed_off_by` FK users nullable, `step_4_comment` text nullable, `unlocked_at` timestamp nullable, `unlocked_by` FK users nullable, `unlock_reason` text nullable, timestamps. Unique constraint on `(workspace_id, accounting_period_id)`. File: `database/migrations/2026_03_15_100002_create_period_close_records_table.php`

- [X] T008 [P] Migration: Create `period_close_events` table — columns: `id` bigIncrements, `period_close_record_id` FK period_close_records (cascade delete), `event_type` string (locked|trial_balance_reviewed|retained_earnings_posted|signed_off|unlocked), `user_id` FK users, `metadata` json nullable, `created_at` timestamp. File: `database/migrations/2026_03_15_100003_create_period_close_events_table.php`

- [X] T009 Model: Create `PeriodCloseRecord` — fillable: all columns from T007 except id/timestamps. Casts: `step_1_locked_at`/`step_2_reviewed_at`/`step_3_posted_at`/`step_4_signed_off_at`/`unlocked_at` as datetime, `step_2_tb_balanced`/`step_2_fx_acknowledged` as boolean, `step_3_net_profit` as integer. Relationships: `accountingPeriod()` BelongsTo, `workspace()` BelongsTo, `events()` HasMany PeriodCloseEvent, `step1LockedBy()`/`step2ReviewedBy()`/`step3PostedBy()`/`step4SignedOffBy()`/`unlockedBy()` BelongsTo User. Helper methods: `currentStep(): int` (returns 1-4 based on which steps are complete), `isCompleted(): bool`. Use `HasNotes`, `HasAttachments` traits. File: `app/Models/Tenant/PeriodCloseRecord.php`

- [X] T010 Model: Create `PeriodCloseEvent` — fillable: `period_close_record_id`, `event_type`, `user_id`, `metadata`. Casts: `metadata` as array. Relationship: `closeRecord()` BelongsTo PeriodCloseRecord, `user()` BelongsTo User. No timestamps (uses `created_at` only — set `$timestamps = false`, add `created_at` to fillable and cast as datetime). File: `app/Models/Tenant/PeriodCloseEvent.php`

- [X] T011 Resource: Create `PeriodCloseRecordResource` — return all step fields, nested `events` relation (when loaded), computed `current_step`. File: `app/Http/Resources/PeriodCloseRecordResource.php`

- [X] T012 [P] Resource: Create `PeriodCloseEventResource` — return `event_type`, `user` (id + name), `metadata`, `created_at`. File: `app/Http/Resources/PeriodCloseEventResource.php`

- [X] T013 Morph map: Add `'period_close_record' => PeriodCloseRecord::class` to `Relation::morphMap()` in `AppServiceProvider::boot()`. File: `app/Providers/AppServiceProvider.php`

- [X] T014 Model: Add `closeRecord()` HasOne PeriodCloseRecord relationship to `AccountingPeriod`. File: `app/Models/Tenant/AccountingPeriod.php`

- [X] T015 Resource: Update `AccountingPeriodResource` — include `close_record` (when loaded) using PeriodCloseRecordResource. File: `app/Http/Resources/AccountingPeriodResource.php`

- [X] T016 Permissions: Add `'period.unlock'` and `'period.sign_off'` to permissions array in seeder. Grant `period.unlock` to owner only. Grant `period.sign_off` to owner + accountant. File: `database/seeders/RolesAndPermissionsSeeder.php`

- [X] T017 Resource: Update `JournalEntryResource` — include `entry_type` field in response. File: `app/Http/Resources/JournalEntryResource.php`

---

## Phase 2: Backend Close Workflow — Actions + API

- [X] T018 [US2] Action: Create `InitiateYearEndClose` — validates period is Open, creates PeriodCloseRecord with status='in_progress', creates PeriodCloseEvent(event_type='initiated'). Uses `AsAction`. Params: `AccountingPeriod $period, int $userId`. Returns `PeriodCloseRecord`. File: `app/Actions/Ledger/InitiateYearEndClose.php`

- [X] T019 [US2] Action: Create `LockPeriodForClose` — loads close record for period, validates step 1 not already done, calls existing `LockPeriod::run()`, updates close record `step_1_locked_at`/`step_1_locked_by`, creates PeriodCloseEvent(event_type='locked'). Check unreconciled bank transactions via `BankTransaction::where('workspace_id', ...)->where('is_reconciled', false)->whereBetween('date', [$period->start_date, $period->end_date])->count()` — if count > 0, require `$acknowledgeUnreconciled = true` param or throw ValidationException. Uses `AsAction`. File: `app/Actions/Ledger/LockPeriodForClose.php`

- [X] T020 [US2] Aggregate guard: Add `guardPeriodLock()` to `JournalEntryAggregate::createEntry()` — before recording event, query `AccountingPeriod` for the entry_date. If period is Locked AND entryType is NOT 'year_end_adjustment', throw DomainException("Cannot post to locked period"). If period is Closed (any status), always reject. Add `$entryType` parameter awareness. File: `app/Aggregates/JournalEntryAggregate.php`

- [X] T021 [US2] Action: Create `ReviewTrialBalance` — loads close record, validates step 1 complete + step 2 not done, marks `step_2_reviewed_at`/`step_2_reviewed_by`/`step_2_tb_balanced`/`step_2_fx_acknowledged`, creates PeriodCloseEvent(event_type='trial_balance_reviewed', metadata: {balanced, fx_acknowledged}). Uses `AsAction`. Params: `AccountingPeriod $period, int $userId, bool $tbBalanced, bool $fxAcknowledged`. File: `app/Actions/Ledger/ReviewTrialBalance.php`

- [X] T022 [US3] Action: Create `CalculateRetainedEarningsRollover` — sums `AccountBalance` for all revenue accounts (AccountType::Revenue) and expense accounts (AccountType::Expense) scoped to workspace and period date range. Revenue total - Expense total = net profit. Finds or auto-creates Retained Earnings account (AccountSubType::RETAINED_EARNINGS, code '3200', type Equity). Builds proposed closing entry lines: debit each revenue account, credit each expense account, net to RE account. Returns array `['net_profit' => int, 'retained_earnings_account_id' => int, 'lines' => array]`. Uses `AsAction`. File: `app/Actions/Ledger/CalculateRetainedEarningsRollover.php`

- [X] T023 [US3] Action: Create `ConfirmRetainedEarningsRollover` — loads close record, validates step 2 complete + step 3 not done, calls `CalculateRetainedEarningsRollover` to get lines, posts closing entry via `JournalEntryAggregate::createEntry()` with entryType='closing_entry', auto-submits and auto-approves in same aggregate, updates close record `step_3_posted_at`/`step_3_posted_by`/`step_3_closing_entry_uuid`/`step_3_net_profit`, creates PeriodCloseEvent(event_type='retained_earnings_posted', metadata: {net_profit, closing_entry_uuid}). Uses `AsAction`. File: `app/Actions/Ledger/ConfirmRetainedEarningsRollover.php`

- [X] T024 [US2] Action: Create `SignOffPeriodClose` — loads close record, validates step 3 complete + step 4 not done, updates `step_4_signed_off_at`/`step_4_signed_off_by`/`step_4_comment`, sets close record status='completed', calls `ClosePeriod::run()` to set period status=Closed, creates PeriodCloseEvent(event_type='signed_off', metadata: {comment}). Uses `AsAction`. Params: `AccountingPeriod $period, int $userId, ?string $comment`. File: `app/Actions/Ledger/SignOffPeriodClose.php`

- [X] T025 [US2] Action: Create `UnlockPeriod` — validates period is Locked (not Closed), validates user has `period.unlock` permission, requires `$reason` string. Sets period status back to Open via `ReopenPeriod::run()`, deletes the PeriodCloseRecord, creates a new PeriodCloseEvent on a fresh ephemeral record OR logs unlock directly (event_type='unlocked', metadata: {reason, previous_close_record_id}). Uses `AsAction`. Params: `AccountingPeriod $period, int $userId, string $reason`. File: `app/Actions/Ledger/UnlockPeriod.php`

- [X] T026 Form Requests: Create 6 Form Request classes in `app/Http/Requests/AccountingPeriod/`:
  - `InitiateCloseRequest` — authorize: `$this->user()->can('close', $period)`. No body rules.
  - `LockForCloseRequest` — authorize: `$this->user()->can('lock', $period)`. Rules: `acknowledge_unreconciled` boolean sometimes required.
  - `ReviewTrialBalanceRequest` — authorize: `$this->user()->can('close', $period)`. Rules: `tb_balanced` required boolean, `fx_acknowledged` boolean.
  - `ConfirmRetainedEarningsRequest` — authorize: `$this->user()->can('close', $period)`. No body rules.
  - `SignOffCloseRequest` — authorize: `$this->user()->can('signOff', $period)`. Rules: `comment` nullable string max:1000.
  - `UnlockPeriodRequest` — authorize: `$this->user()->can('unlock', $period)`. Rules: `reason` required string max:1000.
  Each resolves the period via `AccountingPeriod::where('workspace_id', ...)->findOrFail($this->route('id'))` in authorize() and stashes on `$this->attributes`.

- [X] T027 Policy: Update `AccountingPeriodPolicy` — add `signOff()` method returning `$user->hasPermissionTo('period.sign_off')`, add `unlock()` method returning `$user->hasPermissionTo('period.unlock')`. File: `app/Policies/AccountingPeriodPolicy.php`

- [X] T028 Controller: Add 7 new methods to `AccountingPeriodController`:
  - `initiateClose(InitiateCloseRequest $request, int $id)` — POST `{id}/year-end-close` → InitiateYearEndClose::run()
  - `closeRecord(Request $request, int $id)` — GET `{id}/close-record` → load period.closeRecord.events, return PeriodCloseRecordResource
  - `lockForClose(LockForCloseRequest $request, int $id)` — POST `{id}/close-record/lock` → LockPeriodForClose::run()
  - `trialBalanceForClose(Request $request, int $id)` — GET `{id}/close-record/trial-balance` → call existing trial balance logic scoped to period
  - `reviewTrialBalance(ReviewTrialBalanceRequest $request, int $id)` — POST `{id}/close-record/review-trial-balance` → ReviewTrialBalance::run()
  - `retainedEarningsPreview(Request $request, int $id)` — GET `{id}/close-record/retained-earnings-preview` → CalculateRetainedEarningsRollover::run()
  - `confirmRetainedEarnings(ConfirmRetainedEarningsRequest $request, int $id)` — POST `{id}/close-record/confirm-retained-earnings` → ConfirmRetainedEarningsRollover::run()
  - `signOff(SignOffCloseRequest $request, int $id)` — POST `{id}/close-record/sign-off` → SignOffPeriodClose::run()
  - `unlock(UnlockPeriodRequest $request, int $id)` — POST `{id}/unlock` → UnlockPeriod::run()
  - `closeTimeline(Request $request, int $id)` — GET `{id}/close-record/timeline` → PeriodCloseEventResource::collection()
  File: `app/Http/Controllers/Api/AccountingPeriodController.php`

- [X] T029 Routes: Add close workflow routes in `routes/api.php` under the accounting-periods group:
  ```
  POST   accounting-periods/{id}/year-end-close
  GET    accounting-periods/{id}/close-record
  POST   accounting-periods/{id}/close-record/lock
  GET    accounting-periods/{id}/close-record/trial-balance
  POST   accounting-periods/{id}/close-record/review-trial-balance
  GET    accounting-periods/{id}/close-record/retained-earnings-preview
  POST   accounting-periods/{id}/close-record/confirm-retained-earnings
  POST   accounting-periods/{id}/close-record/sign-off
  POST   accounting-periods/{id}/unlock
  GET    accounting-periods/{id}/close-record/timeline
  ```
  File: `routes/api.php`

---

## Phase 3: Backend Extensions — Workpapers + Report Filters

- [X] T030 [P] [US4] Routes: Add polymorphic notes/attachments routes for `period-close/{id}` — reuse existing NoteController and AttachmentController pattern. File: `routes/api.php`

- [X] T031 [US5] Controller: Update `ReportController` — add `entry_type` query param filter to `generalLedger()` method. When `entry_type=year_end_adjustment`, filter JE lines. Add `adjustments_only` boolean param to `trialBalance()` to scope to adjustment entries only. File: `app/Http/Controllers/Api/ReportController.php`

- [X] T032 [US5] Controller: Update `JournalEntryController` — add `entry_type` filter to index query. When `?entry_type=year_end_adjustment`, scope results. File: `app/Http/Controllers/Api/JournalEntryController.php`

- [X] T033 [US1] Action: Update `CreateJournalEntry` — accept optional `$entryType` param (default 'standard'), pass to `JournalEntryAggregate::createEntry()`. Validate that only Accountant/Owner can use 'year_end_adjustment' type. File: `app/Actions/Ledger/CreateJournalEntry.php`

- [X] T034 [US1] Request: Update `StoreJournalEntryRequest` — add `entry_type` rule: `'entry_type' => ['sometimes', 'string', Rule::in(['standard', 'year_end_adjustment'])]`. Add `after()` validation: if entry_type is 'year_end_adjustment', verify user has accountant/owner role. File: `app/Http/Requests/JournalEntry/StoreJournalEntryRequest.php`

---

## Phase 4: Backend Tests

- [X] T035 [P] Test: Full close workflow — initiate → lock → review TB → confirm RE → sign off. Verify period transitions Open → Locked → Closed. Verify close record status transitions in_progress → completed. Verify all 4 step timestamps populated. File: `tests/Feature/Api/YearEndCloseApiTest.php`

- [X] T036 [P] Test: Lock enforcement — create JE dated in locked period as bookkeeper → assert 422. Create JE dated in locked period as accountant with entry_type=year_end_adjustment → assert 201. Create standard JE in locked period as owner → assert 422. File: `tests/Feature/Api/YearEndCloseApiTest.php`

- [X] T037 [P] Test: Retained earnings calculation — seed workspace with known revenue ($10,000) and expense ($6,000) account balances. Run CalculateRetainedEarningsRollover. Assert net_profit = 400000 (cents). Assert RE account credited. Assert all revenue/expense accounts zeroed. File: `tests/Feature/Api/YearEndCloseApiTest.php`

- [X] T038 [P] Test: Owner unlock — lock period, then unlock as owner with reason. Assert period status returns to Open. Assert close record deleted. Assert PeriodCloseEvent with type 'unlocked' exists. Assert accountant role cannot unlock (403). File: `tests/Feature/Api/YearEndCloseApiTest.php`

- [X] T039 [P] Test: Fully Closed period cannot be reopened or unlocked — close a period through all 4 steps. Assert POST to unlock returns 422. Assert POST to reopen returns 422. File: `tests/Feature/Api/YearEndCloseApiTest.php`

- [X] T040 [P] Test: Permission tests — bookkeeper cannot initiate close (403). Client cannot view close record (403). Auditor can view close timeline but not workpapers. File: `tests/Feature/Api/YearEndCloseApiTest.php`

- [X] T041 [P] Test: Unreconciled bank transaction warning — seed unreconciled txns in period. POST lock without `acknowledge_unreconciled` → assert 422 with count. POST lock with `acknowledge_unreconciled=true` → assert success. File: `tests/Feature/Api/YearEndCloseApiTest.php`

- [X] T042 [P] Test: Auto-create Retained Earnings account — workspace with no RE account. Run CalculateRetainedEarningsRollover. Assert ChartAccount created with code '3200', sub_type RETAINED_EARNINGS, type Equity. File: `tests/Feature/Api/YearEndCloseApiTest.php`

- [X] T043 [P] Test: Entry type filter on JE list — create standard + adjustment entries. GET journal-entries?entry_type=year_end_adjustment → assert only adjustment entries returned. File: `tests/Feature/Api/YearEndCloseApiTest.php`

- [X] T044 [P] Test: Report entry_type filter — create mixed entries. GET general-ledger?entry_type=year_end_adjustment → assert filtered. GET trial-balance?adjustments_only=true → assert scoped. File: `tests/Feature/Api/YearEndCloseApiTest.php`

---

## Phase 5: Frontend — Types + Hooks

- [X] T045 [P] Types: Create `frontend/src/types/year-end.ts` — export types:
  - `PeriodCloseRecord`: id, workspace_id, accounting_period_id, status, step_1_locked_at/by, step_2_reviewed_at/by, step_2_tb_balanced, step_2_fx_acknowledged, step_3_posted_at/by, step_3_closing_entry_uuid, step_3_net_profit, step_4_signed_off_at/by, step_4_comment, unlocked_at/by, unlock_reason, current_step, events
  - `PeriodCloseEvent`: id, event_type, user (id + name), metadata, created_at
  - `RetainedEarningsPreview`: net_profit, retained_earnings_account_id, lines (chart_account_id, account_name, direction, amount)[]
  - `TrialBalanceRow`: account_id, account_code, account_name, debit, credit

- [X] T046 Hook: Create `frontend/src/hooks/use-year-end-close.ts` — TanStack Query hooks:
  - `useCloseRecord(periodId)` — GET close-record, returns PeriodCloseRecord
  - `useInitiateClose(periodId)` — POST year-end-close mutation, invalidates close-record + periods
  - `useLockForClose(periodId)` — POST close-record/lock mutation, params: { acknowledge_unreconciled?: boolean }
  - `useCloseTrialBalance(periodId)` — GET close-record/trial-balance
  - `useReviewTrialBalance(periodId)` — POST close-record/review-trial-balance mutation
  - `useRetainedEarningsPreview(periodId)` — GET close-record/retained-earnings-preview
  - `useConfirmRetainedEarnings(periodId)` — POST close-record/confirm-retained-earnings mutation
  - `useSignOff(periodId)` — POST close-record/sign-off mutation, params: { comment?: string }
  - `useUnlockPeriod(periodId)` — POST unlock mutation, params: { reason: string }
  - `useCloseTimeline(periodId)` — GET close-record/timeline

---

## Phase 6: Frontend — Close Workflow Wizard

- [X] T047 [US2] Page: Create close workflow page at `frontend/src/app/(dashboard)/settings/accounting-periods/[id]/close/page.tsx` — fetches period + close record via hooks, renders YearEndCloseWizard. Breadcrumb: Settings > Accounting Periods > [Period Label] > Close.

- [X] T048 [US2] Component: Create `frontend/src/components/year-end/close-wizard.tsx` — `YearEndCloseWizard` parent component. Props: `period: AccountingPeriod, closeRecord: PeriodCloseRecord`. Renders vertical step indicator (4 steps) with status badges (Not Started/In Progress/Complete). Renders active step content component. Owner sees UnlockDialog button when period is Locked.

- [X] T049 [US2] Component: Create `frontend/src/components/year-end/step-lock.tsx` — `StepLockPeriod`. Shows period date range, current status. If unreconciled txns exist, shows warning card with count + "Proceed anyway" checkbox. Lock button calls `useLockForClose`. Disabled after step complete (shows green check + locked_by name + timestamp).

- [X] T050 [US2] Component: Create `frontend/src/components/year-end/step-trial-balance.tsx` — `StepTrialBalance`. Fetches trial balance via `useCloseTrialBalance`. Renders table: Account Code | Account Name | Debit | Credit. Shows total row with balance check (green if equal, red warning if not). For multi-currency workspaces: shows FX warning alert if unrealised gains/losses detected. Acknowledge button calls `useReviewTrialBalance` with `tb_balanced` and `fx_acknowledged` booleans.

- [X] T051 [US3] Component: Create `frontend/src/components/year-end/step-retained-earnings.tsx` — `StepRetainedEarnings`. Fetches preview via `useRetainedEarningsPreview`. Shows net profit summary card (formatted as currency). Renders proposed closing entry lines table: Account | Direction | Amount. Confirm button with destructive variant + confirmation dialog ("This will post the closing entry. This action cannot be undone."). Calls `useConfirmRetainedEarnings` on confirm.

- [X] T052 [US2] Component: Create `frontend/src/components/year-end/step-sign-off.tsx` — `StepSignOff`. React Hook Form + Zod schema: `{ comment: z.string().max(1000).optional() }`. Pre-filled signer name (current user), date (today, read-only). Comment textarea. Submit calls `useSignOff`. Shows success state after completion with confetti or check animation.

- [X] T053 [US6] Component: Create `frontend/src/components/year-end/close-timeline.tsx` — `CloseTimeline`. Fetches events via `useCloseTimeline`. Renders vertical timeline: icon per event_type, user name, formatted timestamp, metadata preview. Event types: initiated → locked → trial_balance_reviewed → retained_earnings_posted → signed_off (+ unlocked if applicable).

- [X] T054 [US2] Component: Create `frontend/src/components/year-end/unlock-dialog.tsx` — `UnlockDialog`. Dialog/sheet with: warning text explaining consequences, mandatory reason textarea (React Hook Form + Zod: `{ reason: z.string().min(10).max(1000) }`), destructive confirm button. Calls `useUnlockPeriod`. Only rendered for Owner role.

- [X] T055 [US2] Integration: Update accounting periods page — add "Year-End Close" button on each open period row (visible to Accountant/Owner). For periods with existing close records, show close progress badge (Step X/4). Link button navigates to `/settings/accounting-periods/[id]/close`. For Closed periods, show "View Close Record" link instead. File: `frontend/src/app/(dashboard)/settings/accounting-periods/page.tsx`

---

## Phase 7: Frontend — Workpapers + Report Filters

- [X] T056 [P] [US4] Component: Create `frontend/src/components/year-end/workpapers-list.tsx` — `WorkpapersList`. Lists notes on the close record via existing notes hooks (polymorphic). Each note shows: author, date, first-line preview, attachment count. Add/Edit opens WorkpaperEditor. Delete with confirmation dialog. Only visible to Accountant/Owner.

- [X] T057 [P] [US4] Component: Create `frontend/src/components/year-end/workpaper-editor.tsx` — `WorkpaperEditor`. TipTap rich text editor (reuse existing note editor pattern from detail pages). Supports: headings, bold, italic, bullet/numbered lists. Save/cancel buttons. Attachment upload section (drag-drop, reuse existing attachment upload component).

- [X] T058 [US4] Integration: Add Workpapers tab to close workflow page — visible after Step 1 (period locked). Tab alongside the wizard steps or as a sidebar panel. Uses WorkpapersList + WorkpaperEditor. File: `frontend/src/app/(dashboard)/settings/accounting-periods/[id]/close/page.tsx`

- [X] T059 [US1] Integration: Update JE list page — add `entry_type` filter dropdown (All / Standard / Year-End Adjustment / Closing Entry). Show entry type badge on each row. File: `frontend/src/app/(dashboard)/journal-entries/page.tsx`

- [X] T060 [US1] Integration: Update JE detail page — show "Year-End Adjustment" or "Closing Entry" badge in header when applicable. File: `frontend/src/app/(dashboard)/journal-entries/[uuid]/page.tsx`

- [X] T061 [US1] Integration: Update new JE form — add entry type selector (dropdown: Standard / Year-End Adjustment). Only visible to Accountant/Owner roles. Default to Standard. File: `frontend/src/app/(dashboard)/journal-entries/new/page.tsx`

- [X] T062 [US5] Integration: Add "Adjustments Only" toggle filter to general ledger report page. File: `frontend/src/app/(dashboard)/reports/general-ledger/page.tsx` (or equivalent)

---

## Phase 8: Polish + Final Tests

- [X] T063 Run `vendor/bin/pint --dirty` to format all new/modified PHP files.

- [X] T064 Run `php artisan test --compact` — verify all existing + new tests pass.

- [X] T065 [P] Playwright test: Navigate to accounting periods, initiate close for a period, verify wizard renders 4 steps. File: `frontend/e2e/year-end-close.spec.ts`

- [X] T066 [P] Playwright test: Verify "Year-End Adjustment" badge visible on JE list when adjustment entries exist. File: `frontend/e2e/year-end-close.spec.ts`

---

## Summary

| Metric | Count |
|--------|-------|
| **Total tasks** | 66 |
| **Phase 1 (Foundation)** | 17 |
| **Phase 2 (Close Workflow)** | 12 |
| **Phase 3 (Extensions)** | 5 |
| **Phase 4 (Backend Tests)** | 10 |
| **Phase 5 (Frontend Types/Hooks)** | 2 |
| **Phase 6 (Frontend Wizard)** | 9 |
| **Phase 7 (Frontend Workpapers/Reports)** | 7 |
| **Phase 8 (Polish)** | 4 |
| **Parallelizable tasks [P]** | 18 |
| **P1 tasks (MVP)** | T001–T044, T045–T055 (core close workflow) |
| **P2 tasks** | T056–T058 (workpapers), T059–T062 (report filters) |
| **P3 tasks** | T053, T065–T066 (audit timeline, e2e) |
