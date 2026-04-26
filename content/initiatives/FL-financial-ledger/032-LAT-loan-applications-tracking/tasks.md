---
title: "Implementation Tasks: Loan Applications & Tracking"
---

# Implementation Tasks: Loan Applications & Tracking

**Mode**: AI Agent
**Generated**: 2026-03-16
**Total Tasks**: 62
**Phases**: 4

---

## Phase 1: Foundation — Enums, Migrations, Models, Services, CRUD

### Enums (all parallelizable)

- [ ] T001 [P] Enum: `LoanType` — cases: Mortgage('mortgage'), Vehicle('vehicle'), Personal('personal'), Business('business'), LineOfCredit('line_of_credit'), Student('student'), Other('other'). Backed string enum. File: `app/Enums/LoanType.php`
- [ ] T002 [P] Enum: `LoanDirection` — cases: Borrower('borrower'), Lender('lender'). Backed string enum. File: `app/Enums/LoanDirection.php`
- [ ] T003 [P] Enum: `LoanStatus` — cases: Applied('applied'), Approved('approved'), Funded('funded'), Active('active'), PaidOff('paid_off'), Declined('declined'), Cancelled('cancelled'). Backed string enum. File: `app/Enums/LoanStatus.php`
- [ ] T004 [P] Enum: `InterestMethod` — cases: ReducingBalance('reducing_balance'), FlatRate('flat_rate'). Backed string enum. File: `app/Enums/InterestMethod.php`
- [ ] T005 [P] Enum: `RepaymentFrequency` — cases: Weekly('weekly'), Fortnightly('fortnightly'), Monthly('monthly'). Backed string enum. File: `app/Enums/RepaymentFrequency.php`
- [ ] T006 [P] Enum: `ScheduleEntryStatus` — cases: Scheduled('scheduled'), Paid('paid'), Missed('missed'), Overpaid('overpaid'). Backed string enum. File: `app/Enums/ScheduleEntryStatus.php`
- [ ] T007 [P] Enum: `LoanInvitationStatus` — cases: Pending('pending'), Accepted('accepted'), Declined('declined'), Cancelled('cancelled'). Backed string enum. File: `app/Enums/LoanInvitationStatus.php`

### Migrations (sequential — depend on enums)

- [ ] T008 Migration: `create_financial_schedules_table` — columns: id, workspace_id (FK workspaces), schedulable_type (string), schedulable_id (bigint), calculation_method (string), frequency (string), start_date (date), end_date (date nullable), next_run_date (date nullable), is_active (boolean default true), timestamps. Index on [workspace_id, schedulable_type, schedulable_id]. Index on [next_run_date, is_active]. File: `database/migrations/2026_03_16_100001_create_financial_schedules_table.php`
- [ ] T009 Migration: `create_loans_table` — columns: id, uuid (uuid unique), workspace_id (FK workspaces), name (string), type (string), direction (string), original_amount (bigint), current_balance (bigint), interest_rate (integer), interest_method (string), term_months (integer nullable), start_date (date), repayment_frequency (string), repayment_amount (bigint), status (string default 'active'), contact_id (FK contacts nullable), chart_account_id (FK chart_accounts), interest_account_id (FK chart_accounts), linked_loan_id (FK loans nullable), linked_workspace_id (bigint nullable), funded_at (datetime nullable), paid_off_at (datetime nullable), custom_type_label (string nullable), created_by (FK users), timestamps, softDeletes. Index on [workspace_id, status]. Index on [workspace_id, direction]. File: `database/migrations/2026_03_16_100002_create_loans_table.php`
- [ ] T010 Migration: `create_loan_schedule_entries_table` — columns: id, loan_id (FK loans cascade), period_number (integer), due_date (date), payment_amount (bigint), principal_amount (bigint), interest_amount (bigint), remaining_balance (bigint), status (string default 'scheduled'), journal_entry_id (FK journal_entries nullable), paid_at (datetime nullable). Index on [loan_id, period_number]. Index on [loan_id, status]. File: `database/migrations/2026_03_16_100003_create_loan_schedule_entries_table.php`
- [ ] T011 Migration: `create_loan_repayments_table` — columns: id, uuid (uuid unique), loan_id (FK loans cascade), workspace_id (FK workspaces), date (date), amount (bigint), principal_amount (bigint), interest_amount (bigint), journal_entry_id (FK journal_entries), schedule_entry_id (FK loan_schedule_entries nullable), bank_transaction_id (FK bank_transactions nullable), notes (text nullable), created_by (FK users), timestamps. Index on [loan_id, date]. File: `database/migrations/2026_03_16_100004_create_loan_repayments_table.php`
- [ ] T012 Migration: `create_loan_status_transitions_table` — columns: id, loan_id (FK loans cascade), from_status (string nullable), to_status (string), transitioned_by (FK users), notes (text nullable), created_at (datetime). Index on [loan_id]. File: `database/migrations/2026_03_16_100005_create_loan_status_transitions_table.php`

### Models (depend on migrations)

- [ ] T013 [P] Model: `FinancialSchedule` — $fillable: workspace_id, schedulable_type, schedulable_id, calculation_method, frequency, start_date, end_date, next_run_date, is_active. Casts: start_date (date), end_date (date), next_run_date (date), is_active (boolean). Relations: schedulable() morphTo, workspace() BelongsTo. Scope: scopeActive(), scopeDueOnOrBefore(Carbon $date). File: `app/Models/Tenant/FinancialSchedule.php`
- [ ] T014 [P] Model: `Loan` — $fillable: all columns from migration except id/timestamps. Casts: type (LoanType), direction (LoanDirection), status (LoanStatus), interest_method (InterestMethod), repayment_frequency (RepaymentFrequency), start_date (date), funded_at (datetime), paid_off_at (datetime), original_amount (integer), current_balance (integer), repayment_amount (integer), interest_rate (integer). Relations: workspace() BelongsTo, contact() BelongsTo, chartAccount() BelongsTo, interestAccount() BelongsTo, linkedLoan() BelongsTo(self), scheduleEntries() HasMany(LoanScheduleEntry), repayments() HasMany(LoanRepayment), statusTransitions() HasMany(LoanStatusTransition), financialSchedule() MorphOne(FinancialSchedule), creator() BelongsTo(User). Scopes: scopeActive(), scopeBorrower(), scopeLender(). Route binding via uuid. Use SoftDeletes. File: `app/Models/Tenant/Loan.php`
- [ ] T015 [P] Model: `LoanScheduleEntry` — $fillable: loan_id, period_number, due_date, payment_amount, principal_amount, interest_amount, remaining_balance, status, journal_entry_id, paid_at. Casts: status (ScheduleEntryStatus), due_date (date), paid_at (datetime), all amounts (integer). Relations: loan() BelongsTo, journalEntry() BelongsTo(JournalEntry). File: `app/Models/Tenant/LoanScheduleEntry.php`
- [ ] T016 [P] Model: `LoanRepayment` — $fillable: uuid, loan_id, workspace_id, date, amount, principal_amount, interest_amount, journal_entry_id, schedule_entry_id, bank_transaction_id, notes, created_by. Casts: date (date), all amounts (integer). Relations: loan() BelongsTo, journalEntry() BelongsTo(JournalEntry), scheduleEntry() BelongsTo(LoanScheduleEntry), bankTransaction() BelongsTo(BankTransaction), creator() BelongsTo(User). Route binding via uuid. File: `app/Models/Tenant/LoanRepayment.php`
- [ ] T017 [P] Model: `LoanStatusTransition` — $fillable: loan_id, from_status, to_status, transitioned_by, notes. Casts: from_status (LoanStatus), to_status (LoanStatus), created_at (datetime). $timestamps = false (only created_at). Relations: loan() BelongsTo, transitionedBy() BelongsTo(User). File: `app/Models/Tenant/LoanStatusTransition.php`

### Services (depend on models)

- [ ] T018 Service: `AmortizationCalculator` — Static methods: `calculateReducingBalance(int $principal, int $rateBasicPoints, int $termMonths, RepaymentFrequency $frequency): array` returns array of ['period' => int, 'payment' => int, 'principal' => int, 'interest' => int, 'balance' => int]. `calculateFlatRate(...)` same signature. `calculatePaymentAmount(int $principal, int $rateBasisPoints, int $termMonths, RepaymentFrequency $frequency): int`. Helper: `periodsPerYear(RepaymentFrequency): int` (weekly=52, fortnightly=26, monthly=12). All amounts in cents. Final period adjusts to exactly zero remaining. Handle 0% interest (all principal, no interest). File: `app/Services/AmortizationCalculator.php`
- [ ] T019 Service: `FinancialScheduleEngine` — Methods: `createSchedule(Model $schedulable, string $calculationMethod, string $frequency, Carbon $startDate, ?Carbon $endDate): FinancialSchedule`. `runDueSchedules(?Carbon $date = null): int` — finds all active schedules with next_run_date <= $date, processes each, returns count. `processSchedule(FinancialSchedule $schedule): void` — delegates to appropriate handler based on schedulable_type. For 'loan' type: finds next scheduled entry, creates JE via RecordRepayment action if auto-pay enabled. File: `app/Services/FinancialScheduleEngine.php`

### Permissions & Policy

- [ ] T020 Update `RolesAndPermissionsSeeder` — add permissions: 'loan.view', 'loan.create', 'loan.update', 'loan.delete', 'loan.manage', 'loan.approve'. Assign to roles: owner (all), accountant (all), bookkeeper (view, create, update), approver (view, approve), auditor (view), client (view). File: `database/seeders/RolesAndPermissionsSeeder.php`
- [ ] T021 Policy: `LoanPolicy` — methods: viewAny, view, create, update, delete, manage, approve. Each returns `$user->hasPermissionTo('loan.{ability}')`. Register in `AppServiceProvider::boot()` via `Gate::policy(Loan::class, LoanPolicy::class)`. File: `app/Policies/LoanPolicy.php`

### Data & Requests

- [ ] T022 [P] Data: `LoanData` — Spatie Data class with properties: name (string), type (LoanType), direction (LoanDirection), original_amount (int), interest_rate (int), interest_method (InterestMethod), term_months (?int), start_date (string), repayment_frequency (RepaymentFrequency), repayment_amount (int), contact_id (?int), custom_type_label (?string). Validation rules matching spec. File: `app/Data/LoanData.php`
- [ ] T023 [P] Request: `StoreLoanRequest` — authorize via `$this->user()->can('create', Loan::class)`. Rules: name required string max:255, type required LoanType enum, direction required LoanDirection enum, original_amount required integer min:1, interest_rate required integer min:0, interest_method required InterestMethod enum, term_months nullable integer min:1, start_date required date, repayment_frequency required RepaymentFrequency enum, repayment_amount required integer min:1, contact_id nullable exists:contacts,id, custom_type_label nullable string max:255. After hook: validate term_months required unless type is line_of_credit. File: `app/Http/Requests/Loan/StoreLoanRequest.php`
- [ ] T024 [P] Request: `UpdateLoanRequest` — authorize via `$this->user()->can('update', $loan)`. Same rules as Store but all optional (PATCH). Pre-load loan in authorize via route uuid + workspace_id. File: `app/Http/Requests/Loan/UpdateLoanRequest.php`

### Actions (depend on services, data, permissions)

- [ ] T025 Action: `CreateLoan` — AsAction trait. `handle(LoanData $data, int $workspaceId, int $userId): Loan`. Steps: 1) Auto-create chart accounts (liability or asset based on direction + interest expense/income account) via ChartAccount::create with name derived from loan name. 2) Create Loan record. 3) Generate amortization schedule via AmortizationCalculator (skip for Line of Credit). 4) Create FinancialSchedule record. 5) Record initial status transition. Return loan with relations loaded. File: `app/Actions/Loan/CreateLoan.php`
- [ ] T026 Action: `UpdateLoan` — AsAction trait. `handle(Loan $loan, array $validated): Loan`. Only allow updates when status is applied/approved (not yet funded). File: `app/Actions/Loan/UpdateLoan.php`
- [ ] T027 Action: `DeleteLoan` — AsAction trait. `handle(Loan $loan): void`. Validate no repayments exist (FR-013). Soft delete loan + cascade schedule entries. Delete auto-created chart accounts if no JEs reference them. File: `app/Actions/Loan/DeleteLoan.php`
- [ ] T028 Action: `GenerateAmortizationSchedule` — AsAction trait. `handle(Loan $loan): void`. Deletes existing schedule entries (if recalculating). Calls AmortizationCalculator based on loan's interest_method. Creates LoanScheduleEntry rows for each period. File: `app/Actions/Loan/GenerateAmortizationSchedule.php`

### Resources & Controller

- [ ] T029 [P] Resource: `LoanResource` — returns all loan fields + computed: next_payment_date (from first scheduled entry), next_payment_amount, progress_percent (1 - current_balance/original_amount * 100), total_interest_paid (sum of repayment interest_amounts), total_interest_remaining (sum of remaining schedule interest_amounts), is_inter_entity (linked_loan_id !== null), linked_workspace_name. Includes: contact (whenLoaded), chartAccount (whenLoaded). File: `app/Http/Resources/LoanResource.php`
- [ ] T030 [P] Resource: `LoanScheduleEntryResource` — returns all fields. File: `app/Http/Resources/LoanScheduleEntryResource.php`
- [ ] T031 Controller: `LoanController` — methods: index (paginated, filterable by status/type/direction, sorted), store (delegates to CreateLoan action), show (single loan with schedule + repayments), update (delegates to UpdateLoan), destroy (delegates to DeleteLoan), schedule (returns schedule entries for a loan). Route model binding via uuid. Authorize reads via `Gate::authorize('viewAny/view', Loan::class/$loan)`. File: `app/Http/Controllers/Api/LoanController.php`

### Routes

- [ ] T032 Add loan routes to `routes/api.php` — inside workspace-scoped middleware group. `Route::apiResource('loans', LoanController::class)`. `Route::get('loans/{loan}/schedule', [LoanController::class, 'schedule'])`. Use `{loan}` parameter with uuid route binding. File: `routes/api.php`

### Module Toggle Foundation

- [ ] T033 Add `enabled_modules` JSON column to workspaces table — migration: `$table->json('enabled_modules')->nullable()`. Add cast to Workspace model: `'enabled_modules' => 'array'`. Add helper method `hasModule(string $module): bool`. Default modules per entity type set in workspace creation. File: `database/migrations/2026_03_16_100006_add_enabled_modules_to_workspaces.php` + update `app/Models/Central/Workspace.php`

### Phase 1 Tests

- [ ] T034 Unit test: `AmortizationCalculatorTest` — test cases: reducing balance $10,000/8%/12mo/monthly (verify 12 rows, final balance = 0, total payments match), flat rate same params (verify equal interest each period), 0% interest (all principal), weekly frequency (52 periods/year), fortnightly (26), 30-year mortgage (360 rows, final balance = 0), rounding (total of all payments equals principal + total interest to the cent). File: `tests/Unit/Services/AmortizationCalculatorTest.php`
- [ ] T035 Feature test: `LoanApiTest` — test cases: create loan (borrower mortgage, lender personal, line of credit without term), show loan with schedule, update loan (only when applied/approved), delete loan (no repayments OK, with repayments 422), list loans (filtered by status, type, direction), auth (bookkeeper can create, auditor cannot, workspace scoping prevents cross-tenant). File: `tests/Feature/Api/LoanApiTest.php`

---

## Phase 2: Repayments & Lifecycle (depends on Phase 1)

### Requests

- [ ] T036 [P] Request: `RecordRepaymentRequest` — authorize via `$this->user()->can('create', Loan::class)`. Pre-load loan in authorize(). Rules: date required date, amount required integer min:1, bank_account_id required exists:chart_accounts,id, notes nullable string. After hook: validate amount <= loan current_balance (FR-015). File: `app/Http/Requests/Loan/RecordRepaymentRequest.php`
- [ ] T037 [P] Request: `TransitionStatusRequest` — authorize via `$this->user()->can('manage', $loan)`. Pre-load loan in authorize(). Rules: status required LoanStatus enum, notes nullable string, bank_account_id required_if:status,funded (for opening JE). After hook: validate transition is legal (applied→approved→funded→active, applied/approved→declined, any→cancelled). File: `app/Http/Requests/Loan/TransitionStatusRequest.php`

### Actions

- [ ] T038 Action: `RecordRepayment` — AsAction trait. `handle(Loan $loan, array $data, int $userId): LoanRepayment`. Steps: 1) Find next scheduled entry (or use current balance for unscheduled). 2) Calculate principal/interest split from schedule (or recalculate for overpayment). 3) Cap amount at current_balance (FR-015). 4) Create JE via existing CreateJournalEntry: borrower = DR loan account (principal) + DR interest expense (interest), CR bank account; lender = DR bank + CR loan receivable (principal) + CR interest income (interest). 5) Create LoanRepayment record linking to JE and schedule entry. 6) Update schedule entry status to 'paid'/'overpaid'. 7) Update loan current_balance. 8) If current_balance <= 0, auto-transition to PaidOff. 9) If inter-entity, call SyncRepaymentToLender. File: `app/Actions/Loan/RecordRepayment.php`
- [ ] T039 Action: `TransitionLoanStatus` — AsAction trait. `handle(Loan $loan, LoanStatus $newStatus, int $userId, ?int $bankAccountId = null, ?string $notes = null): Loan`. Validate allowed transitions. On funded: create opening JE (DR bank, CR loan liability for borrower; inverse for lender), set funded_at, generate schedule if not exists. On paid_off: set paid_off_at. Record LoanStatusTransition. File: `app/Actions/Loan/TransitionLoanStatus.php`
- [ ] T040 Action: `RecalculateSchedule` — AsAction trait. `handle(Loan $loan, string $strategy = 'reduce_term'): void`. Delete future scheduled entries (status = 'scheduled'). Recalculate from current_balance over remaining term (reduce_payment) or with same payment amount (reduce_term). Regenerate LoanScheduleEntry rows. Update FinancialSchedule end_date. File: `app/Actions/Loan/RecalculateSchedule.php`

### Resources & Controller Updates

- [ ] T041 Resource: `LoanRepaymentResource` — returns all fields + journalEntry (whenLoaded), scheduleEntry (whenLoaded). File: `app/Http/Resources/LoanRepaymentResource.php`
- [ ] T042 Update `LoanController` — add methods: repayments (GET loans/{loan}/repayments — paginated list), recordRepayment (POST loans/{loan}/repayments — delegates to RecordRepayment), transition (POST loans/{loan}/transition — delegates to TransitionLoanStatus). File: `app/Http/Controllers/Api/LoanController.php`

### Routes Update

- [ ] T043 Add repayment + transition routes — `Route::get('loans/{loan}/repayments', [LoanController::class, 'repayments'])`. `Route::post('loans/{loan}/repayments', [LoanController::class, 'recordRepayment'])`. `Route::post('loans/{loan}/transition', [LoanController::class, 'transition'])`. File: `routes/api.php`

### Bank Feed Integration

- [ ] T044 Extend `SuggestMatches` action — add loan repayment matching logic: find active loans in workspace, for each loan's next scheduled entry, check if bank transaction amount is within ±5% of scheduled payment_amount AND transaction date is within ±3 days of scheduled due_date. Return suggested matches alongside existing reconciliation suggestions. File: `app/Actions/Banking/SuggestMatches.php`

### Phase 2 Tests

- [ ] T045 Feature test: `LoanApiTest` additions — test cases: record repayment (auto JE created, balance reduced, schedule entry marked paid), overpayment (excess to principal, schedule recalculated), repayment exceeds balance (capped, auto Paid Off), status transitions (applied→approved→funded with opening JE, funded→active, invalid transitions rejected), opening JE on funded (verify DR bank CR liability for borrower), auto Paid Off on zero balance. File: `tests/Feature/Api/LoanApiTest.php`
- [ ] T046 Unit test: `AmortizationCalculatorTest` additions — test cases: recalculate after overpayment (reduce term strategy, reduce payment strategy), partial payment handling. File: `tests/Unit/Services/AmortizationCalculatorTest.php`

---

## Phase 3: Frontend & Inter-Entity (depends on Phase 2)

### Frontend Types

- [ ] T047 [P] Types: `loans.ts` — define types: LoanType (union of enum strings), LoanDirection, LoanStatus, InterestMethod, RepaymentFrequency, ScheduleEntryStatus, LoanInvitationStatus, Loan (full response shape from LoanResource), LoanScheduleEntry, LoanRepayment, LoanInvitation, LoanTerms (for TermsAgreement), LoanFormValues (for React Hook Form), LoanFilters (status, type, direction). File: `frontend/src/types/loans.ts`

### Frontend Hooks

- [ ] T048 [P] Hook: `use-loans.ts` — TanStack Query hooks: useLoans(filters) query, useLoan(uuid) query, useCreateLoan() mutation, useUpdateLoan() mutation, useDeleteLoan() mutation, useRecordRepayment(uuid) mutation, useTransitionStatus(uuid) mutation. Invalidate queries on mutations. File: `frontend/src/hooks/use-loans.ts`
- [ ] T049 [P] Hook: `use-loan-schedule.ts` — TanStack Query hook: useLoanSchedule(uuid) query returning LoanScheduleEntry[]. File: `frontend/src/hooks/use-loan-schedule.ts`
- [ ] T050 [P] Hook: `use-loan-invitations.ts` — TanStack Query hooks: useLoanInvitations() query, useAcceptInvitation() mutation, useDeclineInvitation() mutation, useSendInvitation(loanUuid) mutation. File: `frontend/src/hooks/use-loan-invitations.ts`

### Frontend Components

- [ ] T051 Component: `LoanForm.tsx` — React Hook Form + Zod. Fields: name (input), type (select from LoanType), direction (radio borrower/lender), original_amount (currency input, cents), interest_rate (percentage input, basis points), interest_method (select), term_months (number, hidden for LOC), start_date (date picker), repayment_frequency (select), repayment_amount (currency input), contact_id (searchable contact select). Zod schema: amounts > 0, rate >= 0, term > 0 unless LOC. File: `frontend/src/components/loans/LoanForm.tsx`
- [ ] T052 Component: `TermsAgreement.tsx` — Props: terms: LoanTerms, onSign: () => void, signed?: { name: string, date: string }. Renders scrollable panel with formatted loan terms (amount, rate, term, frequency, repayment, total interest). "Accept & Sign" button. After signing: read-only with signatory + timestamp. Reusable for future agreements. File: `frontend/src/components/loans/TermsAgreement.tsx`

### Frontend Pages

- [ ] T053 Page: Loan Register — paginated table (TanStack Table v8) with columns: Name, Type, Direction, Original Amount, Current Balance, Rate, Next Payment, Status, Progress. Filters: status, type, direction. Summary row: total debt (borrower), total receivable (lender). "New Loan" button with `N` shortcut. Empty state when no loans. File: `frontend/src/app/(dashboard)/loans/page.tsx`
- [ ] T054 Page: Create Loan — renders LoanForm, on submit calls useCreateLoan mutation, redirects to loan detail on success. File: `frontend/src/app/(dashboard)/loans/new/page.tsx`
- [ ] T055 Page: Loan Detail — tabs: Summary, Schedule, Repayments. Summary tab: LoanSummary card + StatusTransition actions + LoanProgress bar. Schedule tab: AmortizationTable (TanStack Table, virtual scroll for 360 rows, paid=green, missed=red). Repayments tab: RepaymentHistory list with JE links. "Record Repayment" button opens RepaymentSheet slide-over. Sub-components in `[uuid]/components/`: LoanSummary.tsx, AmortizationTable.tsx, RepaymentHistory.tsx, RepaymentSheet.tsx, StatusTransition.tsx, LoanProgress.tsx. File: `frontend/src/app/(dashboard)/loans/[uuid]/page.tsx`
- [ ] T056 Page: Edit Loan — renders LoanForm pre-filled with existing data. Only accessible when status is applied/approved. File: `frontend/src/app/(dashboard)/loans/[uuid]/edit/page.tsx`

### Inter-Entity Backend

- [ ] T057 Model: `LoanInvitation` — $fillable: uuid, lender_workspace_id, borrower_workspace_id, loan_id, status, terms_snapshot, signed_by, signed_at, declined_at, created_by. Casts: status (LoanInvitationStatus), terms_snapshot (array), signed_at (datetime), declined_at (datetime). Relations: lenderWorkspace() BelongsTo(Workspace), borrowerWorkspace() BelongsTo(Workspace), loan() BelongsTo(Loan), signedBy() BelongsTo(User). Route binding via uuid. File: `app/Models/Tenant/LoanInvitation.php`
- [ ] T058 Migration: `create_loan_invitations_table` — columns per plan data model. File: `database/migrations/2026_03_16_100007_create_loan_invitations_table.php`
- [ ] T059 Actions: Inter-entity lending — `SendLoanInvitation` (creates invitation with terms_snapshot from loan), `AcceptLoanInvitation` (creates mirror loan on borrower workspace, opening JEs on both sides, sets linked_loan_id/linked_workspace_id on both, records signature), `DeclineLoanInvitation` (sets status declined), `LinkToEntity` (converts standalone to inter-entity by sending invitation), `SyncRepaymentToLender` (on borrower repayment: temp set workspace to lender, create mirror JE, update lender loan balance, restore context — all in DB transaction). Files: `app/Actions/Loan/SendLoanInvitation.php`, `app/Actions/Loan/AcceptLoanInvitation.php`, `app/Actions/Loan/DeclineLoanInvitation.php`, `app/Actions/Loan/LinkToEntity.php`, `app/Actions/Loan/SyncRepaymentToLender.php`
- [ ] T060 Controller + Resource + Routes: `LoanInvitationController` — methods: index (list incoming invitations for workspace), accept, decline. Resource: `LoanInvitationResource`. Routes: GET loan-invitations, POST loan-invitations/{invitation}/accept, POST loan-invitations/{invitation}/decline, POST loans/{loan}/invite, POST loans/{loan}/link. Files: `app/Http/Controllers/Api/LoanInvitationController.php`, `app/Http/Resources/LoanInvitationResource.php`, `app/Http/Requests/Loan/SendInvitationRequest.php`, `app/Http/Requests/Loan/AcceptInvitationRequest.php`, update `routes/api.php`

### Inter-Entity Frontend

- [ ] T061 Page: Loan Invitations — list of incoming invitations with status. Each card shows terms summary via TermsAgreement component. Accept/Decline buttons. File: `frontend/src/app/(dashboard)/loans/invitations/page.tsx`, `frontend/src/components/loans/LoanInvitationCard.tsx`

### Phase 3 Tests

- [ ] T062 Feature test: `LoanInvitationApiTest` — test cases: send invitation (terms snapshot created), accept (mirror loan created on borrower, opening JEs both sides, linked_loan_id set), decline (no impact on lender), cross-workspace repayment sync (borrower pays → lender JE auto-created), link standalone to entity. File: `tests/Feature/Api/LoanInvitationApiTest.php`
- [ ] T063 Browser test: `LoansTest` — test cases: create loan via form, view amortization schedule, record repayment, loan register filtering, status transition. File: `tests/Browser/LoansTest.php`

---

## Phase 4: Polish — Dashboard, Reports, Schedule Job, Navigation

- [ ] T064 Artisan command: `RunFinancialSchedules` — daily command. Finds active FinancialSchedule records with next_run_date <= today. For each: processes the schedule (loan repayment auto-post if configured). Updates next_run_date. Logs count processed. Register in `routes/console.php` with `Schedule::command('schedules:run')->daily()`. File: `app/Console/Commands/RunFinancialSchedules.php`
- [ ] T065 Action: `GenerateLoanReport` — AsAction trait. Returns collection of loans with: original_amount, current_balance, total_interest_paid, total_interest_remaining, projected_payoff_date. Filterable by loan type. File: `app/Actions/Loan/GenerateLoanReport.php`
- [ ] T066 Dashboard endpoint — add `GET /api/v1/dashboard/loans` to DashboardController or LoanController. Returns: total_debt (sum of borrower current_balances), total_receivable (sum of lender current_balances), upcoming_payments (next 3 scheduled entries across all loans), largest_loan_progress. File: update `app/Http/Controllers/Api/LoanController.php` or `DashboardController.php`, add route to `routes/api.php`
- [ ] T067 Frontend: Dashboard loan widget — displays total debt, total receivable, next 3 upcoming payments, payoff progress for largest loan. Empty state when no loans. Conditional on loans module enabled. File: `frontend/src/app/(dashboard)/dashboard/components/widgets/loan-widget.tsx`
- [ ] T068 Frontend: Loan report page — table view of all loans with report data. Filter by type. Export button (CSV). File: `frontend/src/app/(dashboard)/reports/loans/page.tsx`
- [ ] T069 Navigation: Add "Loans" to sidebar — conditional on `enabled_modules` including 'loans'. Shortcut: `G then L`. Add to `?` help overlay. File: update `frontend/src/lib/navigation.ts`, update `frontend/src/components/layout/sidebar.tsx`
- [ ] T070 Phase 4 tests — Feature: dashboard loans endpoint (totals, upcoming payments, empty workspace), loan report (filtered, totals match). Unit: RunFinancialSchedules command (processes due schedules, skips inactive, updates next_run_date). Files: `tests/Feature/Api/LoanApiTest.php` (additions), `tests/Unit/Commands/RunFinancialSchedulesTest.php`
