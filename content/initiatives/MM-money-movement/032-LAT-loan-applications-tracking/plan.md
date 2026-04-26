---
title: "Implementation Plan: Loan Applications & Tracking"
---

# Implementation Plan: Loan Applications & Tracking

**Branch**: `feature/032-LAT-loan-applications-tracking` | **Date**: 2026-03-15 | **Spec**: [spec.md](./spec.md)

## Summary

Build a toggleable Loans module with a generic Financial Schedule Engine at its core. Users can track loans as borrower (liability) or lender (asset), with automated amortization schedules, auto-generated journal entries on repayment, inter-entity lending with cross-workspace sync, and bank feed matching. The Financial Schedule Engine is designed for reuse by 033-FAR (depreciation) and future modules.

## Technical Context

**Language/Version**: PHP 8.4 (Laravel 12) + TypeScript (Next.js 16, React 19)
**Primary Dependencies**: Spatie laravel-event-sourcing v7, Spatie Permission, TanStack Query v5, TanStack Table v8, React Hook Form + Zod
**Storage**: SQLite (local dev), PostgreSQL (production)
**Testing**: Pest v4 (Feature + Unit) + Playwright (Browser)
**Target Platform**: Web SPA (Next.js frontend consuming Laravel API)
**Constraints**: All amounts as integers (cents), interest rates as basis points (integer), workspace-scoped via `tenant_id`

## Gate 3: Architecture Check

### 1. Technical Feasibility — PASS

| Check | Status |
|-------|--------|
| Architecture approach clear | ✅ Lorisleiva Actions, Eloquent models, API Resources, Financial Schedule Engine as service |
| Existing patterns leveraged | ✅ Follows Invoice/Contact/Banking patterns exactly |
| No impossible requirements | ✅ Standard financial formulas (PMT/IPMT/PPMT), cross-workspace JE sync |
| Performance considered | ✅ 30-year mortgage = 360 schedule rows — manageable. Server-side pagination for register |
| Security considered | ✅ Workspace-scoped, policy-based authorization, inter-entity invitations require acceptance |

### 2. Data & Integration — PASS

| Check | Status |
|-------|--------|
| Data model understood | ✅ 6 new tables + 2 enums |
| API contracts clear | ✅ ~18 endpoints defined below |
| Dependencies identified | ✅ Core Ledger (JE creation), Contacts, Chart of Accounts, Bank Feeds |
| Integration points mapped | ✅ JE generation via existing CreateJournalEntry action, bank feed matching via SuggestMatches |
| DTO persistence explicit | ✅ Spatie Data classes for loan creation payload (nested schedule config) |

### 3. Implementation Approach — PASS

| Check | Status |
|-------|--------|
| File changes identified | ✅ Listed per phase below |
| Risk areas noted | ✅ Cross-workspace sync, amortization precision, schedule recalculation |
| Testing approach defined | ✅ Unit tests for math, feature tests for API, browser tests for flows |
| Rollback possible | ✅ Feature flag + module toggle, new tables only (no schema changes to existing tables) |

### 4. Resource & Scope — PASS

| Check | Status |
|-------|--------|
| Scope matches spec | ✅ 26 FRs mapped to 4 phases |
| Effort reasonable | ✅ M (3-4 sprints) |
| Skills available | ✅ Standard Laravel + React patterns |

### 5. Laravel Best Practices — PASS

| Check | Status |
|-------|--------|
| No hardcoded business logic | ✅ All calculation logic in Actions/Services, frontend renders |
| Use Lorisleiva Actions | ✅ All business logic in Actions with AsAction trait |
| Model route binding | ✅ Controllers use `Loan $loan` not `int $id` |
| Sanctum cookie auth | ✅ Existing auth infrastructure |
| Feature flags dual-gated | ✅ Module toggle on workspace + CheckModule middleware |
| Event sourcing granular | ✅ Not event-sourced — loans are CRUD with JE integration (JEs remain event-sourced) |
| Migrations schema-only | ✅ New tables only |

### 6. Frontend Standards (Next.js/React) — PASS

| Check | Status |
|-------|--------|
| All components use TypeScript | ✅ Every .tsx file, strict TypeScript, no `any` |
| Props typed with interfaces/types | ✅ `type Props = { ... }` pattern |
| TanStack Query for server state | ✅ `use-loans.ts` hook with query/mutation |
| Forms use React Hook Form + Zod | ✅ Loan creation form with Zod schema |
| API client typed | ✅ Response types in `types/loans.ts` |
| Component library reused | ✅ Existing shadcn/ui components |

### Pre-Check Notes
- Loans are NOT event-sourced (unlike invoices/JEs). They are standard CRUD — the JEs they generate are event-sourced via existing JournalEntryAggregate.
- Inter-entity sync crosses workspace boundaries — needs careful tenant scoping. The lender's workspace context must be temporarily set when creating the mirror JE.
- The Financial Schedule Engine is a service class, not an Eloquent model — it calculates schedules and delegates JE creation to existing actions.

---

## Design Decisions

### Data Model

#### New Enums

```php
// app/Enums/LoanType.php
enum LoanType: string {
    case Mortgage = 'mortgage';
    case Vehicle = 'vehicle';
    case Personal = 'personal';
    case Business = 'business';
    case LineOfCredit = 'line_of_credit';
    case Student = 'student';
    case Other = 'other';
}

// app/Enums/LoanDirection.php
enum LoanDirection: string {
    case Borrower = 'borrower';  // liability
    case Lender = 'lender';      // asset/receivable
}

// app/Enums/LoanStatus.php
enum LoanStatus: string {
    case Applied = 'applied';
    case Approved = 'approved';
    case Funded = 'funded';
    case Active = 'active';
    case PaidOff = 'paid_off';
    case Declined = 'declined';
    case Cancelled = 'cancelled';
}

// app/Enums/InterestMethod.php
enum InterestMethod: string {
    case ReducingBalance = 'reducing_balance';
    case FlatRate = 'flat_rate';
}

// app/Enums/RepaymentFrequency.php
enum RepaymentFrequency: string {
    case Weekly = 'weekly';
    case Fortnightly = 'fortnightly';
    case Monthly = 'monthly';
}

// app/Enums/ScheduleEntryStatus.php
enum ScheduleEntryStatus: string {
    case Scheduled = 'scheduled';
    case Paid = 'paid';
    case Missed = 'missed';
    case Overpaid = 'overpaid';
}

// app/Enums/LoanInvitationStatus.php
enum LoanInvitationStatus: string {
    case Pending = 'pending';
    case Accepted = 'accepted';
    case Declined = 'declined';
    case Cancelled = 'cancelled';
}
```

#### New Tables

**loans**
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| uuid | uuid | unique, route binding |
| workspace_id | bigint FK | tenant scoping |
| name | string | e.g., "Mortgage — 123 Main St" |
| type | enum(LoanType) | |
| direction | enum(LoanDirection) | borrower or lender |
| original_amount | bigint | cents |
| current_balance | bigint | cents, updated on repayment |
| interest_rate | int | basis points (650 = 6.50%) |
| interest_method | enum(InterestMethod) | |
| term_months | int nullable | null for Line of Credit |
| start_date | date | |
| repayment_frequency | enum(RepaymentFrequency) | |
| repayment_amount | bigint | cents, scheduled amount per period |
| status | enum(LoanStatus) | |
| contact_id | bigint FK nullable | linked counterparty Contact |
| chart_account_id | bigint FK | auto-created asset/liability account |
| interest_account_id | bigint FK | auto-created interest expense/income account |
| linked_loan_id | bigint FK nullable | self-ref for inter-entity linked loan |
| linked_workspace_id | bigint nullable | the other workspace in inter-entity loans |
| funded_at | datetime nullable | |
| paid_off_at | datetime nullable | |
| custom_type_label | string nullable | when type = 'other' |
| created_by | bigint FK | |
| timestamps + soft deletes | | |

**loan_schedule_entries**
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| loan_id | bigint FK | |
| period_number | int | 1-based |
| due_date | date | |
| payment_amount | bigint | cents |
| principal_amount | bigint | cents |
| interest_amount | bigint | cents |
| remaining_balance | bigint | cents after this payment |
| status | enum(ScheduleEntryStatus) | |
| journal_entry_id | bigint FK nullable | linked JE when paid |
| paid_at | datetime nullable | |

**loan_repayments**
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| uuid | uuid | |
| loan_id | bigint FK | |
| workspace_id | bigint FK | |
| date | date | |
| amount | bigint | cents |
| principal_amount | bigint | cents |
| interest_amount | bigint | cents |
| journal_entry_id | bigint FK | auto-created JE |
| schedule_entry_id | bigint FK nullable | matched schedule row |
| bank_transaction_id | bigint FK nullable | if matched from bank feed |
| notes | text nullable | |
| created_by | bigint FK | |
| timestamps | | |

**loan_invitations**
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| uuid | uuid | |
| lender_workspace_id | bigint FK | |
| borrower_workspace_id | bigint FK | |
| loan_id | bigint FK | lender's loan record |
| status | enum(LoanInvitationStatus) | |
| terms_snapshot | json | immutable copy of loan terms at invitation time |
| signed_by | bigint FK nullable | user who accepted |
| signed_at | datetime nullable | |
| declined_at | datetime nullable | |
| created_by | bigint FK | |
| timestamps | | |

**loan_status_transitions**
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| loan_id | bigint FK | |
| from_status | enum(LoanStatus) nullable | |
| to_status | enum(LoanStatus) | |
| transitioned_by | bigint FK | |
| notes | text nullable | |
| created_at | datetime | |

**financial_schedules** *(generic engine table)*
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| workspace_id | bigint FK | |
| schedulable_type | string | morph type: 'loan', 'asset', 'lease' |
| schedulable_id | bigint | |
| calculation_method | string | 'pmt_reducing', 'flat_rate', 'straight_line', 'diminishing_value' |
| frequency | string | weekly, fortnightly, monthly, quarterly, annually |
| start_date | date | |
| end_date | date nullable | |
| next_run_date | date nullable | for daily job scheduling |
| is_active | boolean | |
| timestamps | | |

### API Contracts

#### Loan CRUD
| Method | Endpoint | Action | Auth |
|--------|----------|--------|------|
| GET | `/api/v1/loans` | ListLoans | loan.view |
| POST | `/api/v1/loans` | CreateLoan | loan.create |
| GET | `/api/v1/loans/{uuid}` | ShowLoan | loan.view |
| PATCH | `/api/v1/loans/{uuid}` | UpdateLoan | loan.update |
| DELETE | `/api/v1/loans/{uuid}` | DeleteLoan | loan.delete |

#### Loan Actions
| Method | Endpoint | Action | Auth |
|--------|----------|--------|------|
| POST | `/api/v1/loans/{uuid}/transition` | TransitionLoanStatus | loan.manage |
| POST | `/api/v1/loans/{uuid}/repayments` | RecordRepayment | loan.create |
| GET | `/api/v1/loans/{uuid}/repayments` | ListRepayments | loan.view |
| GET | `/api/v1/loans/{uuid}/schedule` | GetSchedule | loan.view |

#### Inter-Entity
| Method | Endpoint | Action | Auth |
|--------|----------|--------|------|
| POST | `/api/v1/loans/{uuid}/invite` | SendLoanInvitation | loan.manage |
| GET | `/api/v1/loan-invitations` | ListInvitations | loan.view |
| POST | `/api/v1/loan-invitations/{uuid}/accept` | AcceptInvitation | loan.approve |
| POST | `/api/v1/loan-invitations/{uuid}/decline` | DeclineInvitation | loan.approve |
| POST | `/api/v1/loans/{uuid}/link` | LinkToEntity | loan.manage |

#### Dashboard & Reports
| Method | Endpoint | Action | Auth |
|--------|----------|--------|------|
| GET | `/api/v1/dashboard/loans` | LoanDashboardWidget | loan.view |
| GET | `/api/v1/reports/loans` | LoanSummaryReport | report.general-ledger |

#### Bank Feed Integration
| Method | Endpoint | Action | Auth |
|--------|----------|--------|------|
| GET | `/api/v1/loans/{uuid}/suggested-matches` | SuggestBankMatches | loan.view |

### UI Components

#### Frontend File Structure

```
frontend/src/
├── app/(dashboard)/loans/
│   ├── page.tsx                    # Loan Register (list)
│   ├── new/page.tsx                # Create Loan form
│   ├── [uuid]/
│   │   ├── page.tsx                # Loan Detail
│   │   ├── components/
│   │   │   ├── LoanSummary.tsx     # Summary card
│   │   │   ├── AmortizationTable.tsx # Schedule table
│   │   │   ├── RepaymentHistory.tsx # Repayment list with JE links
│   │   │   ├── RepaymentSheet.tsx  # Record repayment slide-over
│   │   │   ├── StatusTransition.tsx # Status change actions
│   │   │   └── LoanProgress.tsx    # Payoff progress bar
│   │   └── edit/page.tsx           # Edit Loan
│   └── invitations/
│       └── page.tsx                # Incoming loan invitations
├── app/(dashboard)/dashboard/components/
│   └── widgets/
│       └── loan-widget.tsx         # Dashboard loans widget
├── components/loans/
│   ├── LoanForm.tsx                # Shared create/edit form
│   ├── LoanInvitationCard.tsx      # Invitation accept/decline
│   └── TermsAgreement.tsx          # Reusable terms & sign component
├── hooks/
│   ├── use-loans.ts                # TanStack Query hooks
│   ├── use-loan-invitations.ts     # Invitation hooks
│   └── use-loan-schedule.ts        # Schedule hooks
└── types/
    └── loans.ts                    # All loan types
```

#### Key Component Details

**LoanForm.tsx** — Create/edit form
- Uses React Hook Form + Zod validation
- Fields: name, type, direction, amount, interest rate, interest method, term, start date, frequency, repayment amount, contact (searchable select)
- Conditional: Line of Credit hides term/amortization fields
- Zod schema validates amounts > 0, rate >= 0, term > 0 (unless LOC)

**AmortizationTable.tsx** — Schedule display
- TanStack Table v8 with virtual scrolling (30-year mortgage = 360 rows)
- Columns: #, Date, Payment, Principal, Interest, Balance, Status
- Paid rows highlighted green, missed rows highlighted red
- Summary row: total paid, total remaining, total interest

**TermsAgreement.tsx** — Reusable terms component
- Props: `terms: LoanTerms`, `onSign: () => void`, `signed?: SignatureRecord`
- Renders formatted loan terms in a scrollable document-style panel
- "Accept & Sign" button at bottom
- After signing: shows signatory name, timestamp, read-only

**RepaymentSheet.tsx** — Record repayment slide-over
- Pre-fills next scheduled amount from amortization schedule
- User can adjust amount (overpayment/partial)
- Shows principal/interest split preview before confirming
- Bank account selector for the credit side of the JE

---

## Implementation Phases

### Phase 1: Foundation (Sprint 1)

**Goal**: Loan model, enums, migrations, CRUD, amortization calculation engine.

**Backend Files**:
- `app/Enums/LoanType.php`
- `app/Enums/LoanDirection.php`
- `app/Enums/LoanStatus.php`
- `app/Enums/InterestMethod.php`
- `app/Enums/RepaymentFrequency.php`
- `app/Enums/ScheduleEntryStatus.php`
- `app/Enums/LoanInvitationStatus.php`
- `app/Models/Tenant/Loan.php`
- `app/Models/Tenant/LoanScheduleEntry.php`
- `app/Models/Tenant/LoanRepayment.php`
- `app/Models/Tenant/LoanStatusTransition.php`
- `database/migrations/xxxx_create_loans_table.php`
- `database/migrations/xxxx_create_loan_schedule_entries_table.php`
- `database/migrations/xxxx_create_loan_repayments_table.php`
- `database/migrations/xxxx_create_loan_status_transitions_table.php`
- `app/Services/AmortizationCalculator.php` — PMT/IPMT/PPMT calculations
- `app/Services/FinancialScheduleEngine.php` — generic schedule engine
- `database/migrations/xxxx_create_financial_schedules_table.php`
- `app/Models/Tenant/FinancialSchedule.php`
- `app/Actions/Loan/CreateLoan.php`
- `app/Actions/Loan/UpdateLoan.php`
- `app/Actions/Loan/DeleteLoan.php`
- `app/Actions/Loan/GenerateAmortizationSchedule.php`
- `app/Http/Controllers/Api/LoanController.php`
- `app/Http/Resources/LoanResource.php`
- `app/Http/Resources/LoanScheduleEntryResource.php`
- `app/Http/Requests/Loan/StoreLoanRequest.php`
- `app/Http/Requests/Loan/UpdateLoanRequest.php`
- `app/Policies/LoanPolicy.php`
- `app/Data/LoanData.php` — Spatie Data class for creation payload
- `database/seeders/RolesAndPermissionsSeeder.php` — add loan permissions
- `routes/api.php` — add loan routes

**Permissions to add**:
```
loan.view, loan.create, loan.update, loan.delete, loan.manage, loan.approve
```

**Role assignments**:
- owner: all loan permissions
- accountant: all loan permissions
- bookkeeper: loan.view, loan.create, loan.update
- approver: loan.view, loan.approve
- auditor: loan.view
- client: loan.view

**Tests**:
- `tests/Unit/Services/AmortizationCalculatorTest.php` — PMT accuracy tests (reducing balance, flat rate, 0% interest, various terms)
- `tests/Feature/Api/LoanApiTest.php` — CRUD, auth, workspace scoping

### Phase 2: Repayments & Lifecycle (Sprint 2)

**Goal**: Record repayments with auto JE, status transitions, schedule recalculation on overpayment.

**Backend Files**:
- `app/Actions/Loan/RecordRepayment.php` — creates JE via existing CreateJournalEntry action
- `app/Actions/Loan/TransitionLoanStatus.php` — status transitions with validation
- `app/Actions/Loan/RecalculateSchedule.php` — recalculate after overpayment
- `app/Http/Requests/Loan/RecordRepaymentRequest.php`
- `app/Http/Requests/Loan/TransitionStatusRequest.php`
- `app/Http/Resources/LoanRepaymentResource.php`
- Auto-create chart accounts in CreateLoan action (liability or asset + interest expense/income)
- Opening JE on "Funded" transition
- Auto Paid Off on zero balance

**Bank Feed Integration**:
- Extend `app/Actions/Banking/SuggestMatches.php` to include loan repayment suggestions
- Match by: amount ± 5% tolerance, within ±3 days of scheduled date

**Tests**:
- `tests/Unit/Services/AmortizationCalculatorTest.php` — add recalculation tests
- `tests/Feature/Api/LoanApiTest.php` — add repayment, status transition, overpayment, bank feed match tests

### Phase 3: Frontend & Inter-Entity (Sprint 3)

**Goal**: All frontend pages + inter-entity lending flow.

**Frontend Files**: All files listed in UI Components section above.

**Backend — Inter-Entity**:
- `app/Models/Tenant/LoanInvitation.php`
- `database/migrations/xxxx_create_loan_invitations_table.php`
- `app/Actions/Loan/SendLoanInvitation.php`
- `app/Actions/Loan/AcceptLoanInvitation.php` — creates mirror loan + opening JEs on both sides
- `app/Actions/Loan/DeclineLoanInvitation.php`
- `app/Actions/Loan/LinkToEntity.php` — convert standalone to inter-entity
- `app/Actions/Loan/SyncRepaymentToLender.php` — create mirror JE on lender workspace
- `app/Http/Controllers/Api/LoanInvitationController.php`
- `app/Http/Resources/LoanInvitationResource.php`
- `app/Http/Requests/Loan/SendInvitationRequest.php`
- `app/Http/Requests/Loan/AcceptInvitationRequest.php`

**Cross-workspace sync pattern**:
```php
// In SyncRepaymentToLender action:
// 1. Get lender's loan via linked_loan_id + linked_workspace_id
// 2. Temporarily set workspace context to lender's workspace
// 3. Create mirror JE via CreateJournalEntry
// 4. Update lender's loan balance
// 5. Restore original workspace context
// Wrap in DB transaction for atomicity
```

**Frontend Types** (`types/loans.ts`):
```typescript
type Loan = {
  uuid: string;
  name: string;
  type: LoanType;
  direction: LoanDirection;
  original_amount: number;
  current_balance: number;
  interest_rate: number;
  interest_method: InterestMethod;
  term_months: number | null;
  start_date: string;
  repayment_frequency: RepaymentFrequency;
  repayment_amount: number;
  status: LoanStatus;
  contact: Contact | null;
  chart_account: ChartAccount;
  next_payment_date: string | null;
  next_payment_amount: number | null;
  progress_percent: number;
  total_interest_paid: number;
  total_interest_remaining: number;
  is_inter_entity: boolean;
  linked_workspace_name: string | null;
};

type LoanScheduleEntry = { ... };
type LoanRepayment = { ... };
type LoanInvitation = { ... };
type LoanTerms = { ... };  // for TermsAgreement component
```

**Tests**:
- `tests/Feature/Api/LoanInvitationApiTest.php` — send, accept, decline, cross-workspace sync
- `tests/Browser/LoansTest.php` — create loan, view schedule, record repayment, register filtering

### Phase 4: Polish (Sprint 4)

**Goal**: Dashboard widget, reporting, daily schedule job, navigation integration.

**Backend**:
- `app/Console/Commands/RunFinancialSchedules.php` — daily Artisan command
- `routes/console.php` — schedule daily
- `app/Actions/Loan/GenerateLoanReport.php`
- Dashboard endpoint for loan widget data

**Frontend**:
- Dashboard loan widget
- Loan summary report page
- Sidebar navigation item (conditional on module enabled)
- Keyboard shortcuts: `G then L` → Go to Loans
- `?` overlay updated with loan shortcuts

**Tests**:
- `tests/Feature/Api/LoanApiTest.php` — add dashboard widget, report tests
- `tests/Unit/Commands/RunFinancialSchedulesTest.php`

---

## Testing Strategy

### Test Coverage by Phase

**Phase 1 — Foundation** (~15 tests):
- Unit: AmortizationCalculator (PMT reducing balance, PMT flat rate, 0% interest, weekly/fortnightly/monthly, edge cases)
- Feature: Loan CRUD (create, read, update, delete, validation, auth, workspace scoping)

**Phase 2 — Repayments & Lifecycle** (~20 tests):
- Unit: Schedule recalculation (overpayment reduce term, reduce payment, partial payment)
- Feature: Record repayment (auto JE, principal/interest split, overpayment, balance cap, auto Paid Off)
- Feature: Status transitions (valid transitions, invalid transitions, opening JE on funded)
- Feature: Bank feed matching (suggest match, accept match)

**Phase 3 — Inter-Entity** (~15 tests):
- Feature: Send invitation, accept (mirror loan + JEs), decline, cancel
- Feature: Cross-workspace repayment sync (JE on lender side)
- Feature: Link standalone to entity
- Browser: Create loan, view schedule, record repayment, register

**Phase 4 — Polish** (~10 tests):
- Unit: Daily schedule command
- Feature: Dashboard widget data, loan report
- Browser: Dashboard widget, navigation

**Total: ~60 tests**

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Amortization rounding errors over 30-year term | Medium | High | Final payment adjusts to exact remaining balance. Unit tests verify total matches to the cent. |
| Cross-workspace sync fails mid-transaction | Low | High | DB transaction wraps both workspace JE creations. Failure rolls back both sides. |
| Schedule recalculation on overpayment loses precision | Medium | Medium | Recalculate from current balance, not from original — fresh PMT calculation each time. |
| Module toggle not yet built | High | Medium | Build basic `enabled_modules` JSON on workspace as part of Phase 1. Other modules can adopt later. |
| Bank feed matching false positives | Medium | Low | Suggestions only — user must confirm. Tight tolerance (±5% amount, ±3 days). |
