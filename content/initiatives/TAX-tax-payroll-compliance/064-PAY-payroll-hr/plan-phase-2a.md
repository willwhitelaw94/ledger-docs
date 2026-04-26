---
title: "Implementation Plan: Payroll Phase 2a — Leave, Timesheets, Operations"
---

# Implementation Plan: Payroll Phase 2a — Leave, Timesheets, Operations

**Feature Branch**: `064-PAY-phase-2a`
**Created**: 2026-04-19
**Status**: Draft
**Epic**: 064-PAY-Phase-2a
**Initiative**: FL — Financial Ledger Platform
**Effort**: 5 sprints (~10 weeks, 1 cross-functional squad)
**Depends On**: 064-PAY Phase 1 (complete), 023-EML (complete), 024-NTF (complete), 008-JCT (complete), 012-ATT (complete)
**Spec**: `phase-2-spec.md` (Sub-Phase 2a — US1, US2, US3, US4, US5, US6, US7)
**Out of Scope (deferred to 2b/2c)**: STP Phase 2, Super Funds Register, Super Payment Batches, Termination/ETP, Garnishments, EOY, Payslip PDFs, Employee Portal extensions, Onboarding, Reports suite, Payroll Settings tabs 5 & 6 (Superannuation, Automatic Superannuation).

---

## 1. Architecture Overview

Phase 1 shipped the **pay-run calculation engine** as a conventional Eloquent domain under `app/Domains/Payroll/`: `Employee`, `PayRun`, `PayRunLine`, `PaygTaxTable`, plus a small `CreatePayRun` / `CalculatePayRunLine` / `FinalisePayRun` action trio. The finalise action transactionally closes a pay run, posts a compound journal entry through the existing `JournalEntryAggregate`, and emits `PayRunFinalised` (an Eloquent-level event, not an event-sourced event).

Phase 2a threads new capabilities **around** that engine without destabilising it. No existing migration is rewritten, no existing aggregate is rebased, and no new projector joins the ledger-projector queue. The new surface area is six sibling modules — **Leave**, **Public Holidays**, **Timesheets**, **Pay Calendars**, **Pay Items & Templates**, **Employee Groups** — each hanging off the same `Employee` + `PayRun` pair.

### 1.1 Module diagram

```
                 ┌─────────────────────────────────────────────┐
                 │           app/Domains/Payroll/              │
                 │                                             │
                 │   ┌──────────┐        ┌────────────────┐    │
                 │   │ Employee │────┬───│   PayRun       │    │
                 │   └──────────┘    │   │ (Phase 1 core) │    │
                 │        │          │   └────────┬───────┘    │
                 │        │          │            │            │
                 │        ▼          ▼            ▼            │
                 │   ┌──────────┐ ┌──────────┐ ┌────────────┐  │
                 │   │ Pay      │ │ Employee │ │ PayRunLine │  │
                 │   │ Template │ │  Group   │ │            │  │
                 │   └──────────┘ └──────────┘ └────────────┘  │
                 │        │          │            ▲            │
                 │        ▼          │            │            │
                 │   ┌──────────┐    │        (pulled from)    │
                 │   │ PayItems │    │            │            │
                 │   │(Earnings,│    │   ┌────────┴──────────┐ │
                 │   │Deducts,  │    │   │ Timesheet +       │ │
                 │   │Reimb,    │    │   │ TimesheetEntry    │ │
                 │   │Leave)    │    │   └────────┬──────────┘ │
                 │   └────┬─────┘    │            │            │
                 │        │          │            │            │
                 │        │     ┌────┴────┐       │            │
                 │        └────▶│ Pay     │◀──────┘            │
                 │              │ Calendar│                     │
                 │              └─────────┘                     │
                 │                                              │
                 │   ┌────────────┐   ┌──────────┐              │
                 │   │ LeaveType  │──▶│ Leave    │              │
                 │   │ LeaveBal   │   │ Request  │              │
                 │   │ LeaveAccr  │◀──┤ + Days   │              │
                 │   └─────┬──────┘   └──────────┘              │
                 │         │                                    │
                 │         └──◀── (accrual at finalise) ◀── PayRun
                 │                                              │
                 │   ┌───────────────────┐                      │
                 │   │ PublicHoliday     │                      │
                 │   │ (workspace-scoped)│                      │
                 │   └───────────────────┘                      │
                 └──────────────────────────────────────────────┘

              External to module:
              ─  008-JCT (Job) receives labour cost allocations
              ─  023-EML sends leave/timesheet approval emails
              ─  024-NTF posts in-app notifications
              ─  012-ATT stores leave supporting documents
```

### 1.2 Event flow for pay-run finalise in 2a

Phase 1's `FinalisePayRun` action is the atomic pivot point. Phase 2a extends it inside the same DB transaction — no new async projector, no new aggregate.

```
FinalisePayRun (existing Phase 1 action)
  DB::transaction:
    1. Recalc all PayRunLines (Phase 1)
    2. Update PayRun.status = Finalised (Phase 1)
    3. Post compound JE via JournalEntryAggregate (Phase 1)
       ├─ Wages Expense DR  (new: split by EmployeeGroup GL override)
       ├─ PAYG Payable CR    (Phase 1)
       ├─ Super Payable CR   (Phase 1)
       └─ Net Wages Payable CR (Phase 1)
    ──────────── Phase 2a additions below ────────────
    4. For each PayRunLine:
       a. Compute ordinary_hours (from timesheet pull OR pay-template default)
       b. Build LeaveAccrual rows for every accruing LeaveType
          (idempotent — unique(pay_run_id, employee_id, leave_type_id))
       c. Apply accruals to LeaveBalance
    5. Mark any LeaveRequest rows as applied_to_pay_run_id
    6. Mark any Timesheet rows as paid (status → 'paid', applied_to_pay_run_id)
    7. Fire PayRunFinalised event (Laravel-level, for listener-based work)
```

All six steps complete in a single transaction. If any fail, the pay-run finalisation rolls back atomically. The JE is still primary — leave accruals never run without a successful ledger post.

The accrual calculator is a **service class**, not an aggregate:

```
LeaveAccrualCalculator::accrue(PayRun $payRun): Collection<LeaveAccrual>
  For each PayRunLine → Employee
    Skip if EmploymentType::Casual
    For each LeaveType where accrues = true
      hours = payRunLine.ordinary_hours × leaveType.accrual_rate_per_ordinary_hour
      hours = cap against leaveType.accrual_cap_hours
      emit LeaveAccrual row (idempotent)
```

### 1.3 Why not event-sourced for leave

Per Planning Decision #1, LeaveRequest is a read model with state transitions on a status column. Three reasons:

1. **Replay cost**. The existing event-sourcing config (`dispatch_events_from_aggregate_roots: false`, single worker on the ledger queue) is tuned for the journal entry firehose. Adding LeaveRequested / LeaveApproved / LeaveRejected events doubles the event rate without a matching need — there's no "rebuild leave state from events" use case a projector would serve.
2. **Authorship vs facts**. An approved leave request is closer to an approved invoice than to a posted JE. Invoices are event-sourced (`InvoiceAggregate`) because their lifecycle touches the ledger in multiple stages. A leave request touches the ledger at exactly one point — pay-run finalise — and the existing `JournalEntryAggregate` already captures that. Double-booking the audit trail would be wasteful.
3. **Idempotency is cheaper via DB constraints**. `UNIQUE(pay_run_id, employee_id, leave_type_id)` on `leave_accruals` gives us "one accrual per pay run per employee per leave type" deterministically. A projector would have to replicate that with idempotency keys.

LeaveRequest therefore lives as an Eloquent model with:
- `status` column enum (pending / approved / rejected / cancelled)
- State transitions gated by policy + form request
- Audit trail via `EmployeeChangeLog` (Phase 1 model, extended)
- No aggregate, no stored events, no projector

### 1.4 What is NOT changing

- No new Spatie aggregates
- No new Spatie projectors
- No new worker queues
- No schema change to Phase 1 tables except: (a) `employees.employee_group_id` FK, (b) `pay_runs.pay_calendar_id` FK
- No change to `FinalisePayRun`'s JE-posting contract — the existing posting runs first, accrual runs after, same transaction
- No change to `PaygTaxTable` seeding or coefficient formula
- No change to existing endpoint signatures — all new routes are additions

---

## 2. Data Model — Migrations

Sixteen new tables, two Phase 1 schema additions. All tables carry `workspace_id` with a global scope via the existing `BelongsToWorkspace` trait. All monetary fields are `unsignedBigInteger` cents. All hours fields are `decimal(8,4)` (4 dp for accrual precision per SC-2.2).

### 2.1 Sprint-by-sprint migration inventory

| Sprint | Migrations created | New tables | Phase 1 table changes |
|--------|-------------------|------------|----------------------|
| 1 | 5 | `leave_types`, `leave_balances`, `leave_accruals`, `leave_requests`, `leave_request_days` | — |
| 2 | 1 | `public_holidays` | — |
| 3 | 3 | `timesheets`, `timesheet_entries`, `timesheet_templates` | — |
| 4 | 5 | `pay_calendars`, `employee_pay_calendar`, `employee_pay_history`, `pay_items`, `pay_templates` + `pay_template_lines` (single migration) | `pay_runs` adds `pay_calendar_id` (nullable FK) |
| 5 | 2 | `employee_groups` | `employees` adds `employee_group_id` (nullable FK) |

Total: **16 migrations**, **16 new tables**, **2 Phase 1 alterations**.

### 2.2 Table definitions

#### `leave_types` (Sprint 1)

Per-workspace leave catalogue. Seeded with AU defaults per FR-2.1.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `workspace_id` | bigint, FK, NOT NULL | global scope |
| `name` | string(64) | "Annual", "Personal/Carer's", etc. |
| `code` | string(32) | machine identifier, unique per workspace |
| `accrues` | boolean, default true | |
| `accrual_rate_per_ordinary_hour` | decimal(10,6), nullable | e.g. 0.076923 for annual (152/1976) |
| `accrual_cap_hours` | decimal(8,2), nullable | null = uncapped |
| `paid` | boolean, default true | |
| `included_in_super_ote` | boolean, default true | |
| `stp_paid_leave_category` | string(32) | "cash_out_in_service" / "unused_on_termination" / "parental" / "workers_comp" / "ancillary" / "other_paid" — used by 2b |
| `cashable` | boolean, default false | |
| `requires_certificate` | boolean, default false | flags sick leave |
| `default_for_employment_types` | json, nullable | array of EmploymentType values |
| `is_seeded` | boolean, default false | locks seeded rows in UI |
| `timestamps` + `soft_deletes` | | |
| **Indexes** | `UNIQUE(workspace_id, code)`, index on `workspace_id` | |

#### `leave_balances` (Sprint 1)

Per employee per leave type. Mutated inside pay-run finalise transaction (Decision #4).

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `workspace_id` | bigint, FK | |
| `employee_id` | bigint, FK | |
| `leave_type_id` | bigint, FK | |
| `opening_balance_hours` | decimal(10,4), default 0 | captured at employee start |
| `accrued_ytd_hours` | decimal(10,4), default 0 | resets at FY start |
| `taken_ytd_hours` | decimal(10,4), default 0 | resets at FY start |
| `cashed_out_ytd_hours` | decimal(10,4), default 0 | resets at FY start |
| `adjustments_ytd_hours` | decimal(10,4), default 0 | admin overrides |
| `current_balance_hours` | decimal(10,4), default 0 | live tally, carries FY rollover |
| `last_accrued_pay_run_id` | bigint, FK nullable | for idempotency & debugging |
| `timestamps` | | |
| **Indexes** | `UNIQUE(employee_id, leave_type_id)`, index on `workspace_id` | |

#### `leave_accruals` (Sprint 1)

Immutable ledger of every accrual event. One row per `(pay_run, employee, leave_type)`. Idempotency per Decision #5.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `workspace_id` | bigint, FK | |
| `pay_run_id` | bigint, FK | |
| `employee_id` | bigint, FK | |
| `leave_type_id` | bigint, FK | |
| `accrual_type` | enum('accrual','opening','adjustment','cashout','taken','reversal') | drives filtering |
| `hours` | decimal(10,4) | positive = add to balance, negative = deduct |
| `ordinary_hours_basis` | decimal(8,2), nullable | the hours figure the rate was applied to |
| `rate_applied` | decimal(10,6), nullable | snapshot of rate at calc time |
| `leave_request_id` | bigint, FK nullable | set when accrual_type = taken |
| `notes` | string(255), nullable | |
| `actor_user_id` | bigint, FK nullable | null for system-generated |
| `effective_date` | date | drives YTD rollover & reports |
| `created_at` | timestamp | no updated_at — immutable |
| **Indexes** | `UNIQUE(pay_run_id, employee_id, leave_type_id, accrual_type)`, index on `(employee_id, leave_type_id, effective_date)` | |

Note: uniqueness includes `accrual_type` so that `accrual` and `taken` can both exist per (pay_run, employee, leave_type).

#### `leave_requests` (Sprint 1)

State-machine-backed Eloquent model. Not event-sourced (Decision #1).

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `workspace_id` | bigint, FK | |
| `employee_id` | bigint, FK | |
| `leave_type_id` | bigint, FK | |
| `start_date` | date | |
| `end_date` | date | |
| `hours_per_day` | decimal(5,2) | default from employee ordinary daily hours |
| `total_hours` | decimal(8,2) | computed server-side, excludes PH + weekends |
| `reason` | text, nullable | |
| `status` | enum('pending','approved','rejected','cancelled') | FR-2.10 |
| `submitted_by_user_id` | bigint, FK | employee's user_id |
| `submitted_at` | timestamp | |
| `approver_user_id` | bigint, FK nullable | |
| `approved_at` | timestamp, nullable | |
| `rejected_at` | timestamp, nullable | |
| `rejection_reason` | text, nullable | |
| `cancelled_at` | timestamp, nullable | |
| `cancelled_reason` | text, nullable | |
| `override_by_user_id` | bigint, FK nullable | admin override of manager |
| `applied_to_pay_run_id` | bigint, FK nullable | set on finalise |
| `supporting_attachment_id` | bigint, FK nullable | via 012-ATT |
| `timestamps` + `soft_deletes` | | |
| **Indexes** | index on `(workspace_id, status)`, index on `(employee_id, start_date, end_date)` for overlap checks, index on `applied_to_pay_run_id` | |

#### `leave_request_days` (Sprint 1)

Day-level breakdown. Enables "exclude public holidays" per FR-2.17 and weekend handling per Decision #7.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `leave_request_id` | bigint, FK cascade | |
| `date` | date | |
| `hours` | decimal(5,2) | 0 if PH or weekend |
| `is_public_holiday` | boolean, default false | |
| `is_weekend` | boolean, default false | |
| `is_deducted` | boolean, default true | false if PH/weekend |
| **Indexes** | `UNIQUE(leave_request_id, date)` | |

#### `public_holidays` (Sprint 2)

Workspace-scoped per Decision #9. Seeded from data.gov.au annually.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `workspace_id` | bigint, FK | |
| `date` | date | |
| `name` | string(128) | |
| `applicable_states` | json | array: ['NSW','VIC',...] or ['ALL'] |
| `jurisdiction_level` | enum('national','state','custom') | |
| `is_seeded` | boolean, default false | locks row — FR-2.153 |
| `is_in_lieu` | boolean, default false | weekend substitutes — FR-2.22 |
| `substitutes_for_date` | date, nullable | when in_lieu |
| `employee_group_id` | bigint, FK nullable | FR-2.21 |
| `notes` | string(255), nullable | |
| `timestamps` + `soft_deletes` | | |
| **Indexes** | `UNIQUE(workspace_id, date, name, jurisdiction_level)`, index on `(workspace_id, date)` | |

#### `timesheets` (Sprint 3)

One per employee per period. Nullable FK to pay_run set on import.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `workspace_id` | bigint, FK | |
| `employee_id` | bigint, FK | |
| `period_start` | date | Monday (configurable) |
| `period_end` | date | Sunday |
| `status` | enum('draft','submitted','approved','rejected','paid') | FR-2.27 |
| `submitted_at` | timestamp, nullable | |
| `approver_user_id` | bigint, FK nullable | |
| `approved_at` | timestamp, nullable | |
| `rejected_at` | timestamp, nullable | |
| `rejection_reason` | text, nullable | |
| `applied_to_pay_run_id` | bigint, FK nullable | set on import per Decision #8 |
| `total_hours` | decimal(8,2), default 0 | denormalised sum of entries |
| `notes` | text, nullable | |
| `created_by_user_id` | bigint, FK | employee OR admin (FR-2.33) |
| `auto_approved` | boolean, default false | for admin-entered with setting |
| `timestamps` | | |
| **Indexes** | `UNIQUE(employee_id, period_start, period_end)`, index on `(workspace_id, status)`, index on `applied_to_pay_run_id` | |

#### `timesheet_entries` (Sprint 3)

One row per day per earnings-type per job (an employee can enter ordinary + overtime on the same day = 2 rows).

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `timesheet_id` | bigint, FK cascade | |
| `date` | date | |
| `hours` | decimal(5,2) | |
| `earnings_type_id` | bigint, FK | references `pay_items` where kind='earnings' |
| `job_id` | bigint, FK nullable | links to 008-JCT `project_jobs` |
| `rate_override_cents` | bigint, nullable | overrides employee default rate |
| `notes` | string(255), nullable | |
| **Indexes** | index on `(timesheet_id, date)`, index on `job_id` | |

#### `timesheet_templates` (Sprint 3)

Per-employee standard week pattern (FR-2.26).

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `workspace_id` | bigint, FK | |
| `employee_id` | bigint, FK | |
| `monday_hours`, `tuesday_hours`, ..., `sunday_hours` | decimal(5,2), default 0 | |
| `default_earnings_type_id` | bigint, FK | |
| `default_job_id` | bigint, FK nullable | |
| `timestamps` | | |
| **Indexes** | `UNIQUE(employee_id)` | |

#### `pay_calendars` (Sprint 4)

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `workspace_id` | bigint, FK | |
| `name` | string(64) | |
| `frequency` | enum('weekly','fortnightly','twice_monthly','monthly','quarterly') | FR-2.36 |
| `period_anchor` | json | `{ start_dow: 'monday' }` for weekly, `{ split_days: [15, -1] }` for twice-monthly |
| `payment_date_offset_days` | smallint, default 5 | |
| `weekend_rollover_rule` | enum('previous_business_day','next_business_day','none'), default 'previous_business_day' | |
| `auto_create_pay_run_days_before` | smallint, default 2 | when to cut the draft |
| `active` | boolean, default true | |
| `first_period_start` | date | anchor for schedule math |
| `timestamps` + `soft_deletes` | | |
| **Indexes** | index on `(workspace_id, active)` | |

#### `employee_pay_calendar` (Sprint 4)

Effective-dated pivot per Decision #11.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `workspace_id` | bigint, FK | |
| `employee_id` | bigint, FK | |
| `pay_calendar_id` | bigint, FK | |
| `effective_from` | date | >= today (Decision #12) |
| `effective_to` | date, nullable | set when a new assignment supersedes |
| `timestamps` | | |
| **Indexes** | index on `(employee_id, effective_from)`, `UNIQUE(employee_id, effective_from)` | |

#### `employee_pay_history` (Sprint 4)

Versioned effective-dated snapshots per Decision #6. Pay-run calc reads the most recent row where `effective_from <= period_end`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `workspace_id` | bigint, FK | |
| `employee_id` | bigint, FK | |
| `effective_from` | date | |
| `effective_to` | date, nullable | |
| `pay_basis` | enum('salary','hourly') | snapshot |
| `pay_rate_cents` | bigint | snapshot |
| `annual_salary_cents` | bigint, nullable | |
| `ordinary_hours_per_week` | decimal(5,2) | for pro-rata calc |
| `employment_type` | string(16) | snapshot |
| `leave_loading_applies` | boolean | |
| `leave_loading_rate_basis_points` | smallint, default 1750 | 17.5% |
| `casual_loading_rate_basis_points` | smallint, default 2500 | 25% (Decision #3) |
| `pay_template_id` | bigint, FK nullable | the active template at that moment |
| `employee_group_id` | bigint, FK nullable | the assigned group at that moment |
| `change_reason` | string(128), nullable | |
| `changed_by_user_id` | bigint, FK | |
| `timestamps` | | |
| **Indexes** | index on `(employee_id, effective_from)`, `UNIQUE(employee_id, effective_from)` | |

On save of any pay-affecting field on `Employee`, a new `employee_pay_history` row is written and the previous row's `effective_to` is set to `new.effective_from - 1 day`. This is Decision #12's "past-dated changes blocked" path.

#### `pay_items` (Sprint 4)

Workspace library per Decision #28. Single table with a `kind` discriminator rather than four tables.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `workspace_id` | bigint, FK | |
| `kind` | enum('earnings','deduction','reimbursement','leave') | |
| `name` | string(64) | |
| `code` | string(32) | |
| `stp_category` | string(32), nullable | FR-2.155 picker |
| `stp_allowance_code` | string(8), nullable | CD/MD/TD/LD/RD/QN/KN/OD (FR-2.44) |
| `stp_deduction_code` | string(8), nullable | F/W/S/X/G/P/D (FR-2.45) |
| `default_rate_multiplier` | decimal(5,2), default 1.0 | 1.0 ordinary, 1.5 OT1, 2.0 OT2 |
| `included_in_super_ote` | boolean, default true | FR-2.48 |
| `included_in_payg_taxable` | boolean, default true | |
| `pre_tax` | boolean, default false | salary sacrifice |
| `default_gl_account_id` | bigint, FK nullable | chart_accounts override |
| `default_liability_gl_account_id` | bigint, FK nullable | for deductions |
| `requires_receipt` | boolean, default false | reimbursements (FR-2.156) |
| `leave_type_id` | bigint, FK nullable | only when kind=leave |
| `is_seeded` | boolean, default false | |
| `active` | boolean, default true | |
| `timestamps` + `soft_deletes` | | |
| **Indexes** | `UNIQUE(workspace_id, kind, code)`, index on `(workspace_id, kind, active)` | |

#### `pay_templates` and `pay_template_lines` (Sprint 4, single migration)

`pay_templates`:
| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `workspace_id` | bigint, FK | |
| `employee_id` | bigint, FK | |
| `effective_from` | date | |
| `effective_to` | date, nullable | |
| `currency` | char(3), default 'AUD' | |
| `leave_loading_applies` | boolean, default false | |
| `leave_loading_rate_basis_points` | smallint, default 1750 | |
| `timestamps` | | |
| **Indexes** | index on `(employee_id, effective_from)` | |

`pay_template_lines`:
| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `pay_template_id` | bigint, FK cascade | |
| `pay_item_id` | bigint, FK | |
| `position` | smallint | display order |
| `amount_cents` | bigint, nullable | for fixed lines |
| `rate_per_hour_cents` | bigint, nullable | for per-hour lines |
| `frequency` | enum('per_period','per_hour') | |
| `quantity` | decimal(8,4), default 1.0 | e.g. 38 hours per week |
| `gl_account_override_id` | bigint, FK nullable | FR-2.51 |
| `tracking_category_id` | bigint, FK nullable | FR-2.52 (links to 008-JCT) |
| `included_in_super_ote_override` | boolean, nullable | null = inherit from pay_item |
| `notes` | string(255), nullable | |
| **Indexes** | index on `pay_template_id` | |

#### `employee_groups` (Sprint 5)

Flat cost-centre list per Decision #27.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `workspace_id` | bigint, FK | |
| `name` | string(64) | |
| `code` | string(32) | |
| `description` | string(255), nullable | |
| `default_wages_expense_gl_account_id` | bigint, FK | |
| `default_super_expense_gl_account_id` | bigint, FK | |
| `default_tracking_category_id` | bigint, FK nullable | |
| `active` | boolean, default true | |
| `timestamps` + `soft_deletes` | | |
| **Indexes** | `UNIQUE(workspace_id, code)`, index on `(workspace_id, active)` | |

### 2.3 Phase 1 table additions

| Table | Column | Sprint |
|-------|--------|--------|
| `employees` | `employee_group_id` (bigint, FK, nullable) | 5 |
| `pay_runs` | `pay_calendar_id` (bigint, FK, nullable) | 4 |

Effective-dating of `employee_group_id` is handled by `employee_pay_history.employee_group_id` snapshots — the FK on `employees` is the *current* value for convenience queries.

### 2.4 Seed data

| Seeder | Runs when | Source |
|--------|-----------|--------|
| `LeaveTypesSeeder` | New workspace creation (hook into `CreateWorkspace` action) | AU NES defaults (Annual, Personal/Carer's, LSL basic 1/60 per ordinary hour, Bereavement, Community, Parental Paid, Parental Unpaid, TIL, Birthday, Unpaid, Study) — all marked `is_seeded=true` |
| `PublicHolidaysSeeder` | Workspace creation + yearly artisan `payroll:seed-public-holidays` | data.gov.au PH dataset (Decision #9) |
| `PayItemsSeeder` | New workspace creation | AU defaults per FR-2.43/44/45 |

Seeded rows are locked (`is_seeded=true` enforces UI read-only except for per-workspace fields like `employer_number` — which don't exist on these three). New workspace onboarding runs all three seeders inside the workspace-creation transaction.

---

## 3. Backend Architecture

All code lives under `app/Domains/Payroll/` following the Phase 1 precedent. Each sub-domain gets its own namespace folder.

### 3.1 Actions

Lorisleiva Actions, `AsAction` trait. Listed by domain with FR traceability.

#### Leave domain (Sprint 1 + 2)

| Action | Inputs | Side effects | Satisfies |
|--------|--------|--------------|-----------|
| `Leave\CreateLeaveType` | name, code, accrual_rate, cap, stp_category, cashable | Insert `leave_types` row | FR-2.1, FR-2.2 |
| `Leave\UpdateLeaveType` | leave_type_id, fields | Update; blocks if `is_seeded=true` for locked fields | FR-2.2 |
| `Leave\SeedDefaultLeaveTypes` | workspace_id | Idempotent insert of AU defaults | FR-2.1 |
| `Leave\OpenLeaveBalance` | employee_id, leave_type_id, opening_hours | Insert `leave_balances` row + opening accrual | FR-2.5 |
| `Leave\CalculateLeaveAccruals` | PayRun $payRun (service-style) | Returns `Collection<LeaveAccrual>`; **does NOT persist** | FR-2.3, FR-2.4 |
| `Leave\ApplyLeaveAccruals` | PayRun $payRun, Collection<LeaveAccrual> | Inserts accruals (idempotent unique), updates balances | FR-2.3, SC-2.2 |
| `Leave\CreateLeaveRequest` | employee_id, leave_type_id, dates, hours_per_day, reason, attachment | Inserts `leave_requests` + `leave_request_days`, calculates PH/weekend exclusions, fires `LeaveRequestSubmitted` | FR-2.10, FR-2.16, FR-2.17 |
| `Leave\ApproveLeaveRequest` | leave_request_id, approver_user_id | Status → approved, emits `LeaveRequestApproved`, writes `EmployeeChangeLog` | FR-2.10, FR-2.11 |
| `Leave\RejectLeaveRequest` | leave_request_id, reason | Status → rejected, emits `LeaveRequestRejected` | FR-2.10 |
| `Leave\CancelLeaveRequest` | leave_request_id, reason | Status → cancelled; if `applied_to_pay_run_id` is set + pay run unfinalised, remove line; if finalised, defer reversal to next PR | FR-2.18 |
| `Leave\OverrideLeaveApproval` | leave_request_id, admin_user_id | Logs override; used when manager unavailable | FR-2.10, FR-2.15 |
| `Leave\ProcessLeaveCashOut` | employee_id, leave_type_id, hours, attachment_id | Validates residual >= 4 weeks; creates `cashout` leave accrual; creates pay run line | FR-2.8 |
| `Leave\AdjustLeaveBalance` | employee_id, leave_type_id, delta_hours, reason | Creates `adjustment` leave accrual; audit-logged; admin only | FR-2.5 |
| `Leave\PullApprovedLeaveIntoPayRun` | PayRun $payRun | For each approved LR overlapping period, adds PayRunLine for `Annual Leave Taken` etc. and marks LR.applied_to_pay_run_id | FR-2.14 |

#### Public Holidays (Sprint 2)

| Action | Inputs | Side effects | Satisfies |
|--------|--------|--------------|-----------|
| `PublicHolidays\SeedPublicHolidays` | workspace_id, financial_year | Idempotent load from data.gov.au JSON | FR-2.20, FR-2.22 |
| `PublicHolidays\CreateCustomHoliday` | name, date, states, group_id | Insert row with `jurisdiction_level='custom'` | FR-2.21 |
| `PublicHolidays\UpdateCustomHoliday` | holiday_id, fields | Blocks seeded rows | FR-2.153 |
| `PublicHolidays\DeleteCustomHoliday` | holiday_id | Blocks seeded rows | FR-2.153 |
| `PublicHolidays\RefreshSeededHolidays` | workspace_id, financial_year | Re-runs seed; preserves customs | — |

#### Timesheets (Sprint 3)

| Action | Inputs | Side effects | Satisfies |
|--------|--------|--------------|-----------|
| `Timesheets\CreateTimesheet` | employee_id, period_start, period_end | Insert draft row | FR-2.24 |
| `Timesheets\AddTimesheetEntry` | timesheet_id, date, hours, earnings_type_id, job_id | Insert entry; recalc total_hours; enforces edit lock if timesheet is `paid` | FR-2.25, FR-2.34 |
| `Timesheets\UpdateTimesheetEntry` | entry_id, fields | Blocks if parent is `paid` (Decision #8) | FR-2.34 |
| `Timesheets\DeleteTimesheetEntry` | entry_id | Blocks if parent is `paid` | FR-2.34 |
| `Timesheets\SubmitTimesheet` | timesheet_id | Status → submitted; fires `TimesheetSubmitted` | FR-2.27, FR-2.28 |
| `Timesheets\ApproveTimesheet` | timesheet_id, approver_user_id | Status → approved; fires `TimesheetApproved` | FR-2.27 |
| `Timesheets\BulkApproveTimesheets` | timesheet_ids[], approver_user_id | Loops Approve with individual audit entries | FR-2.29 |
| `Timesheets\RejectTimesheet` | timesheet_id, reason | Status → rejected; fires `TimesheetRejected` | FR-2.27 |
| `Timesheets\CreateTimesheetTemplate` | employee_id, daily_hours, defaults | Insert/upsert | FR-2.26 |
| `Timesheets\ImportTimesheetsIntoPayRun` | PayRun $payRun | For each approved TS overlapping period, create PayRunLines per earnings_type; set applied_to_pay_run_id; marks as `paid` on finalise | FR-2.30, FR-2.32 |
| `Timesheets\SplitTimesheetByPayPeriod` | timesheet, boundary_date | Internal helper for period-boundary straddling | FR-2.32 |

#### Pay Calendars (Sprint 4)

| Action | Inputs | Side effects | Satisfies |
|--------|--------|--------------|-----------|
| `PayCalendars\CreatePayCalendar` | name, frequency, anchor, offset, rollover rule | Insert row | FR-2.36 |
| `PayCalendars\UpdatePayCalendar` | calendar_id, fields | Blocks if any finalised PR uses it | FR-2.42 |
| `PayCalendars\DeletePayCalendar` | calendar_id | Blocks if any finalised PR uses it | FR-2.42 |
| `PayCalendars\AssignEmployeeToPayCalendar` | employee_id, calendar_id, effective_from | Insert `employee_pay_calendar` row, close previous | FR-2.37, FR-2.41 |
| `PayCalendars\CalculateNextPeriods` | calendar_id, n=6 | Returns list of (period_start, period_end, payment_date) applying rollover rule | FR-2.38 |
| `PayCalendars\CreateDueDraftPayRuns` | (runs via scheduled command) | For each active calendar, if next period cutoff <= today + auto_create_days, create draft PR; idempotent on (calendar_id, period_start) | FR-2.39, Decision #14 |

#### Pay Items & Templates (Sprint 4)

| Action | Inputs | Side effects | Satisfies |
|--------|--------|--------------|-----------|
| `PayItems\CreatePayItem` | kind, name, code, stp_category, ote flag, gl_account | Insert row | FR-2.43/44/45 |
| `PayItems\UpdatePayItem` | pay_item_id, fields | Blocks seeded edits except `default_gl_account_id` | — |
| `PayItems\DeletePayItem` | pay_item_id | Blocks if used by any pay_template_line or timesheet_entry | — |
| `PayItems\SeedDefaultPayItems` | workspace_id | Idempotent AU defaults | FR-2.43/44/45 |
| `PayTemplates\CreatePayTemplate` | employee_id, effective_from, lines[] | Insert template + lines; closes prior template via effective_to | FR-2.46, FR-2.9 (effective dating) |
| `PayTemplates\UpdatePayTemplate` | template_id, lines[] | If template has produced a finalised PR, force new version instead (Decision #12) | FR-2.46 |
| `PayTemplates\AddTemplateLine` / `UpdateTemplateLine` / `DeleteTemplateLine` | | CRUD on lines of current template version | — |
| `PayTemplates\ApplyTemplateToPayRunLine` | pay_run_line_id | Pre-populates earnings/allowance/deduction/reimbursement sub-lines | FR-2.47 |

#### Employee Groups (Sprint 5)

| Action | Inputs | Side effects | Satisfies |
|--------|--------|--------------|-----------|
| `EmployeeGroups\CreateEmployeeGroup` | name, code, gl_accounts, tracking_category | Insert | FR-2.55 |
| `EmployeeGroups\UpdateEmployeeGroup` | group_id, fields | Update | FR-2.55 |
| `EmployeeGroups\DeleteEmployeeGroup` | group_id | Blocks if any employee currently assigned | FR-2.58 |
| `EmployeeGroups\AssignEmployeeToGroup` | employee_id, group_id, effective_from | Writes `employee_pay_history` row with new `employee_group_id`; updates `employees.employee_group_id` for latest | FR-2.56 |

#### Payroll Settings (Sprint 5)

| Action | Inputs | Side effects | Satisfies |
|--------|--------|--------------|-----------|
| `Settings\UpdatePayrollSettings` | workspace_id, default_gl_accounts, tracking_toggles, payslip_options | Upsert `payroll_settings` row (workspace-keyed) | FR-2.144 to FR-2.151 |

**Note**: The Phase 1 `FinalisePayRun` action is extended, not replaced. The extension is a single added method `applyLeaveAccruals(PayRun $payRun): void` invoked as the final step inside the existing transaction. No other Phase 1 action is modified.

### 3.2 API endpoints

All routes are registered in `routes/api.php` under a new `Route::prefix('payroll')->middleware(['auth:sanctum','workspace.context'])` group. All mutations require the relevant policy method returning true.

#### Sprint 1 — Leave

| Method | Path | Controller@method | Policy | Form Request / Data DTO |
|--------|------|-------------------|--------|-------------------------|
| GET | `/payroll/leave-types` | `LeaveTypeController@index` | `leave.view` | — |
| POST | `/payroll/leave-types` | `LeaveTypeController@store` | `leave.manage` | `StoreLeaveTypeRequest` |
| PATCH | `/payroll/leave-types/{id}` | `LeaveTypeController@update` | `leave.manage` | `UpdateLeaveTypeRequest` |
| GET | `/payroll/employees/{employee}/leave-balances` | `LeaveBalanceController@index` | `employee.view` | — |
| GET | `/payroll/leave-requests` | `LeaveRequestController@index` | `leave.view` | — |
| GET | `/payroll/leave-requests/counts` | `LeaveRequestController@counts` | `leave.view` | — |
| POST | `/payroll/leave-requests` | `LeaveRequestController@store` | `leave.create` | `StoreLeaveRequestRequest` + `LeaveRequestData` DTO |
| GET | `/payroll/leave-requests/{id}` | `LeaveRequestController@show` | `leave.view` | — |
| POST | `/payroll/leave-requests/{id}/approve` | `LeaveRequestController@approve` | `leave.approve` | `ApproveLeaveRequestRequest` |
| POST | `/payroll/leave-requests/{id}/reject` | `LeaveRequestController@reject` | `leave.approve` | `RejectLeaveRequestRequest` |
| POST | `/payroll/leave-requests/{id}/cancel` | `LeaveRequestController@cancel` | `leave.cancel` | `CancelLeaveRequestRequest` |
| POST | `/payroll/leave-cash-outs` | `LeaveCashOutController@store` | `leave.cashout` | `StoreLeaveCashOutRequest` |
| POST | `/payroll/leave-balances/{balance}/adjust` | `LeaveBalanceController@adjust` | `leave.adjust` | `AdjustLeaveBalanceRequest` |

Count endpoint returns `{ pending: N, approved: N, rejected: N, cancelled: N }` for StatusTabs.

#### Sprint 2 — Public Holidays + Leave Calendar

| Method | Path | Controller@method | Policy | Request |
|--------|------|-------------------|--------|---------|
| GET | `/payroll/public-holidays` | `PublicHolidayController@index` | `payroll.settings.view` | — |
| POST | `/payroll/public-holidays` | `PublicHolidayController@store` | `payroll.settings.manage` | `StorePublicHolidayRequest` |
| PATCH | `/payroll/public-holidays/{id}` | `PublicHolidayController@update` | `payroll.settings.manage` | `UpdatePublicHolidayRequest` |
| DELETE | `/payroll/public-holidays/{id}` | `PublicHolidayController@destroy` | `payroll.settings.manage` | — |
| POST | `/payroll/public-holidays/refresh-seed` | `PublicHolidayController@refreshSeed` | `payroll.settings.manage` | — |
| GET | `/payroll/leave-calendar` | `LeaveCalendarController@index` | `leave.view` | query: `from`, `to`, `group_id?`, `employee_id?` |

#### Sprint 3 — Timesheets

| Method | Path | Controller@method | Policy | Request |
|--------|------|-------------------|--------|---------|
| GET | `/payroll/timesheets` | `TimesheetController@index` | `timesheet.view` | — |
| GET | `/payroll/timesheets/counts` | `TimesheetController@counts` | `timesheet.view` | — |
| POST | `/payroll/timesheets` | `TimesheetController@store` | `timesheet.create` | `StoreTimesheetRequest` |
| GET | `/payroll/timesheets/{id}` | `TimesheetController@show` | `timesheet.view` | — |
| PATCH | `/payroll/timesheets/{id}` | `TimesheetController@update` | `timesheet.update` | `UpdateTimesheetRequest` |
| DELETE | `/payroll/timesheets/{id}` | `TimesheetController@destroy` | `timesheet.delete` | — |
| POST | `/payroll/timesheets/{id}/submit` | `TimesheetController@submit` | `timesheet.submit` | — |
| POST | `/payroll/timesheets/{id}/approve` | `TimesheetController@approve` | `timesheet.approve` | — |
| POST | `/payroll/timesheets/{id}/reject` | `TimesheetController@reject` | `timesheet.approve` | `RejectTimesheetRequest` |
| POST | `/payroll/timesheets/bulk-approve` | `TimesheetController@bulkApprove` | `timesheet.approve` | `BulkApproveTimesheetsRequest` |
| POST | `/payroll/timesheets/{id}/entries` | `TimesheetEntryController@store` | `timesheet.update` | `StoreTimesheetEntryRequest` + `TimesheetEntryData` DTO |
| PATCH | `/payroll/timesheet-entries/{id}` | `TimesheetEntryController@update` | `timesheet.update` | `UpdateTimesheetEntryRequest` |
| DELETE | `/payroll/timesheet-entries/{id}` | `TimesheetEntryController@destroy` | `timesheet.update` | — |
| GET | `/payroll/employees/{employee}/timesheet-template` | `TimesheetTemplateController@show` | `employee.view` | — |
| PUT | `/payroll/employees/{employee}/timesheet-template` | `TimesheetTemplateController@upsert` | `employee.update` | `UpsertTimesheetTemplateRequest` |

#### Sprint 4 — Pay Calendars + Pay Items + Pay Templates

| Method | Path | Controller@method | Policy | Request |
|--------|------|-------------------|--------|---------|
| GET | `/payroll/pay-calendars` | `PayCalendarController@index` | `payroll.settings.view` | — |
| POST | `/payroll/pay-calendars` | `PayCalendarController@store` | `payroll.settings.manage` | `StorePayCalendarRequest` |
| GET | `/payroll/pay-calendars/{id}` | `PayCalendarController@show` | `payroll.settings.view` | — |
| PATCH | `/payroll/pay-calendars/{id}` | `PayCalendarController@update` | `payroll.settings.manage` | `UpdatePayCalendarRequest` |
| DELETE | `/payroll/pay-calendars/{id}` | `PayCalendarController@destroy` | `payroll.settings.manage` | — |
| GET | `/payroll/pay-calendars/{id}/upcoming-periods` | `PayCalendarController@upcomingPeriods` | `payroll.settings.view` | — |
| POST | `/payroll/pay-calendars/{id}/assign-employees` | `PayCalendarController@assignEmployees` | `payroll.settings.manage` | `AssignEmployeesToPayCalendarRequest` |
| GET | `/payroll/pay-items` | `PayItemController@index` | `payroll.settings.view` | query: `kind?` |
| POST | `/payroll/pay-items` | `PayItemController@store` | `payroll.settings.manage` | `StorePayItemRequest` |
| PATCH | `/payroll/pay-items/{id}` | `PayItemController@update` | `payroll.settings.manage` | `UpdatePayItemRequest` |
| DELETE | `/payroll/pay-items/{id}` | `PayItemController@destroy` | `payroll.settings.manage` | — |
| GET | `/payroll/employees/{employee}/pay-template` | `PayTemplateController@show` | `employee.view` | — |
| POST | `/payroll/employees/{employee}/pay-template` | `PayTemplateController@store` | `employee.update` | `StorePayTemplateRequest` + `PayTemplateData` DTO |
| PATCH | `/payroll/pay-templates/{id}` | `PayTemplateController@update` | `employee.update` | `UpdatePayTemplateRequest` |

#### Sprint 5 — Employee Groups + Settings + Timesheet→PR import

| Method | Path | Controller@method | Policy | Request |
|--------|------|-------------------|--------|---------|
| GET | `/payroll/employee-groups` | `EmployeeGroupController@index` | `payroll.settings.view` | — |
| POST | `/payroll/employee-groups` | `EmployeeGroupController@store` | `payroll.settings.manage` | `StoreEmployeeGroupRequest` |
| PATCH | `/payroll/employee-groups/{id}` | `EmployeeGroupController@update` | `payroll.settings.manage` | `UpdateEmployeeGroupRequest` |
| DELETE | `/payroll/employee-groups/{id}` | `EmployeeGroupController@destroy` | `payroll.settings.manage` | — |
| POST | `/payroll/employees/{employee}/assign-group` | `EmployeeGroupController@assignEmployee` | `employee.update` | `AssignEmployeeGroupRequest` |
| GET | `/payroll/settings` | `PayrollSettingsController@show` | `payroll.settings.view` | — |
| PATCH | `/payroll/settings` | `PayrollSettingsController@update` | `payroll.settings.manage` | `UpdatePayrollSettingsRequest` |
| POST | `/payroll/pay-runs/{payRun}/pull-timesheets` | `PayRunController@pullTimesheets` | `payrun.update` | — |

### 3.3 Form Requests

Each mutation gets a Form Request in `app/Domains/Payroll/Http/Requests/` following Phase 1 naming.

**Sprint 1**: `StoreLeaveTypeRequest`, `UpdateLeaveTypeRequest`, `StoreLeaveRequestRequest`, `ApproveLeaveRequestRequest`, `RejectLeaveRequestRequest`, `CancelLeaveRequestRequest`, `StoreLeaveCashOutRequest`, `AdjustLeaveBalanceRequest`.

**Sprint 2**: `StorePublicHolidayRequest`, `UpdatePublicHolidayRequest`.

**Sprint 3**: `StoreTimesheetRequest`, `UpdateTimesheetRequest`, `StoreTimesheetEntryRequest`, `UpdateTimesheetEntryRequest`, `BulkApproveTimesheetsRequest`, `RejectTimesheetRequest`, `UpsertTimesheetTemplateRequest`.

**Sprint 4**: `StorePayCalendarRequest`, `UpdatePayCalendarRequest`, `AssignEmployeesToPayCalendarRequest`, `StorePayItemRequest`, `UpdatePayItemRequest`, `StorePayTemplateRequest`, `UpdatePayTemplateRequest`.

**Sprint 5**: `StoreEmployeeGroupRequest`, `UpdateEmployeeGroupRequest`, `AssignEmployeeGroupRequest`, `UpdatePayrollSettingsRequest`.

**Pattern** (same as Phase 1 `StorePayRunRequest`): `authorize()` calls `$this->user()->can('X', Y)`; for action-style endpoints (approve/reject/cancel), the target model is pre-loaded in `authorize()` and stashed on `$this->attributes` to avoid a second query in the controller.

**After() validators** are used for:
- `LeaveRequest` overlap check — no pending/approved LR with overlapping dates for same employee (FR-2.16)
- `LeaveCashOut` residual check — balance - cashout_hours >= 4 weeks (FR-2.8)
- `PayCalendar` — cannot change frequency if any finalised PR exists
- `PayTemplate` — effective_from must be today or future (Decision #12)

### 3.4 Policies

Policies live in `app/Domains/Payroll/Policies/` and are registered in `AppServiceProvider::boot()`.

| Policy | Model | Methods |
|--------|-------|---------|
| `LeaveTypePolicy` | `LeaveType` | viewAny, view, create, update, delete |
| `LeaveRequestPolicy` | `LeaveRequest` | viewAny, view, create, update, approve, cancel, override |
| `LeaveBalancePolicy` | `LeaveBalance` | view, adjust |
| `PublicHolidayPolicy` | `PublicHoliday` | viewAny, view, create, update, delete |
| `TimesheetPolicy` | `Timesheet` | viewAny, view, create, update, delete, submit, approve |
| `PayCalendarPolicy` | `PayCalendar` | viewAny, view, create, update, delete |
| `PayItemPolicy` | `PayItem` | viewAny, view, create, update, delete |
| `PayTemplatePolicy` | `PayTemplate` | viewAny, view, create, update |
| `EmployeeGroupPolicy` | `EmployeeGroup` | viewAny, view, create, update, delete |
| `PayrollSettingsPolicy` | — (singleton) | view, manage |

Each method body is `return $user->hasPermissionTo('permission.name');` — no complex logic (follows Phase 1 Policy conventions).

### 3.5 Permissions

Added to `RolesAndPermissionsSeeder`. Naming per Decision #17 (singular).

**New permissions** (30 total):

Leave: `leave.view`, `leave.create`, `leave.manage`, `leave.approve`, `leave.cancel`, `leave.adjust`, `leave.cashout`

Timesheets: `timesheet.view`, `timesheet.create`, `timesheet.update`, `timesheet.delete`, `timesheet.submit`, `timesheet.approve`

Payroll operations: `payrun.update` (Phase 1 permission extended), `employee.view`, `employee.update` (Phase 1), `payroll.settings.view`, `payroll.settings.manage`

**Role grants** (appended to Phase 1 role matrix):

| Permission | owner | accountant | bookkeeper | approver | auditor | client |
|------------|-------|------------|------------|----------|---------|--------|
| leave.view | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| leave.create | ✓ | ✓ | ✓ | — | — | — |
| leave.approve | ✓ | ✓ | — | ✓ | — | — |
| leave.manage / adjust / cashout | ✓ | ✓ | — | — | — | — |
| timesheet.view / create / update | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| timesheet.approve | ✓ | ✓ | — | ✓ | — | — |
| payroll.settings.* | ✓ | ✓ | — | — | — | — |

Separation-of-duties rule extended: within a workspace, a user with `timesheet.approve` cannot have `timesheet.create` for their own timesheets (self-approval blocked in policy).

### 3.6 Data DTOs (Spatie Laravel Data)

In `app/Domains/Payroll/Data/`:

- `LeaveRequestData` — payload for StoreLeaveRequestRequest with nested `days: LeaveRequestDayData[]`
- `LeaveRequestDayData` — date, hours, is_public_holiday, is_weekend
- `TimesheetEntryData` — date, hours, earnings_type_id, job_id, rate_override_cents, notes
- `PayTemplateData` — lines: `PayTemplateLineData[]`
- `PayTemplateLineData` — pay_item_id, amount_cents?, rate_per_hour_cents?, frequency, quantity, gl_account_override_id?, tracking_category_id?, included_in_super_ote_override?
- `PayCalendarAnchorData` — union shape for weekly/fortnightly/twice-monthly/monthly/quarterly

Flat endpoints (leave types, employee groups, pay items) use `$request->validated()` directly — no DTO needed.

### 3.7 Eloquent model additions

New Eloquent models under `app/Domains/Payroll/Models/`:

`LeaveType`, `LeaveBalance`, `LeaveAccrual`, `LeaveRequest`, `LeaveRequestDay`, `PublicHoliday`, `Timesheet`, `TimesheetEntry`, `TimesheetTemplate`, `PayCalendar`, `EmployeePayCalendar`, `EmployeePayHistory`, `PayItem`, `PayTemplate`, `PayTemplateLine`, `EmployeeGroup`, `PayrollSettings` (singleton per workspace).

Relationships on existing Phase 1 models:

**Employee** adds:
- `leaveBalances(): HasMany`
- `leaveRequests(): HasMany`
- `timesheets(): HasMany`
- `timesheetTemplate(): HasOne`
- `currentPayCalendar(): HasOneThrough` via `employee_pay_calendar` where today between effective_from/to
- `payHistory(): HasMany` → EmployeePayHistory
- `currentPayHistory(): HasOne` — most recent where effective_from <= today
- `currentPayTemplate(): HasOne` via currentPayHistory
- `employeeGroup(): BelongsTo`
- `scopeInGroup($query, $groupId)`

**PayRun** adds:
- `payCalendar(): BelongsTo`
- `leaveAccruals(): HasMany`
- `linkedTimesheets(): HasMany` via `applied_to_pay_run_id` on Timesheet
- `linkedLeaveRequests(): HasMany` via `applied_to_pay_run_id` on LeaveRequest

Enums (new, in `app/Enums/`):
- `LeaveRequestStatus`
- `LeaveAccrualType`
- `TimesheetStatus`
- `PayCalendarFrequency`
- `WeekendRolloverRule`
- `PayItemKind`

### 3.8 Service classes

Not Actions — internal services under `app/Domains/Payroll/Services/`:

- `LeaveAccrualCalculator` — stateless; `accrue(PayRun): Collection<LeaveAccrual>`; unit-tested in isolation
- `PublicHolidayCalendar` — `holidaysForState(string $state, DateRange): Collection<PublicHoliday>` with 24h cache
- `TimesheetToPayRunImporter` — coordinates timesheet → pay run line translation
- `PayCalendarScheduler` — pure calculation of period/payment dates applying rollover rules
- `EmployeePayHistoryResolver` — `resolveAsOf(Employee, Date): EmployeePayHistory` — used by all pay-run calculators

These are not AsAction classes because they don't form user-facing commands — they're dependencies injected into Actions.

### 3.9 Artisan commands

In `app/Console/Commands/Payroll/`:

| Command | Schedule | Purpose |
|---------|----------|---------|
| `payroll:create-due-pay-runs` | Daily at 06:00 AEST | Iterates active `pay_calendars`, calls `PayCalendars\CreateDueDraftPayRuns`. Idempotent on `(pay_calendar_id, period_start)`. Decision #14 |
| `payroll:seed-public-holidays {--year=} {--workspace=}` | Manual + annual cron 1 Mar | Fetches data.gov.au dataset, upserts per workspace. Decision #9 |
| `payroll:seed-leave-types {--workspace=}` | Run on workspace creation | Idempotent seed of AU leave types |
| `payroll:seed-pay-items {--workspace=}` | Run on workspace creation | Idempotent seed of AU pay items |
| `payroll:rollover-ytd {--year=}` | 1 July AEST (scheduled) | Resets `accrued_ytd_hours`, `taken_ytd_hours`, `cashed_out_ytd_hours`, `adjustments_ytd_hours` on all `leave_balances`. Preserves `current_balance_hours`. Decision #30 (partial — full FY lock is 2b) |

`CreateWorkspace` action (existing Phase 1) gets three new post-create hooks calling the seed commands inline (or via dispatched sync jobs).

### 3.10 Feature flags (Laravel Pennant)

Per Decision #12, hierarchical gating:

- `payroll` (parent — Phase 1)
  - `payroll.leave` (Sprint 1-2)
  - `payroll.timesheets` (Sprint 3)
  - `payroll.stp` (2b — stubbed in 2a, never enabled)
  - `payroll.portal` (2c — stubbed in 2a, never enabled)

Middleware `feature:payroll.leave` guards `/payroll/leave-*` routes. Each child flag checks the parent first (implemented in FeatureResolver). API responses include `features.payroll.leave: true/false` so the frontend can hide nav.

### 3.11 Event/listener wiring

No Spatie stored events. Laravel-level events in `app/Events/Payroll/`:

- `LeaveRequestSubmitted` → listener sends email to approver via 023-EML + creates notification via 024-NTF
- `LeaveRequestApproved` → listener notifies employee
- `LeaveRequestRejected` → listener notifies employee
- `TimesheetSubmitted` → listener notifies approver
- `TimesheetApproved` → listener notifies employee
- `TimesheetRejected` → listener notifies employee
- `PayRunFinalised` (Phase 1 existing — subscribed to by two new listeners):
  - `ApplyLeaveAccrualsListener` — calls `Leave\ApplyLeaveAccruals` (SYNC per Decision #13)
  - `MarkImportedTimesheetsPaidListener` — sets `timesheets.status='paid'` for linked rows

Note: leave accrual runs **inside** the existing FinalisePayRun transaction, not via async listener, to preserve atomicity (Section 1.2). The listener pattern is reserved for email/notification side effects only.

---

## 4. Frontend Architecture

All frontend code follows Next.js 16 / React 19 / TypeScript strict / Tailwind v3 conventions per `CLAUDE.md`. Data fetching via TanStack Query v5, forms via React Hook Form + Zod, client state via Zustand where needed.

### 4.1 Route tree

All routes go under `frontend/src/app/w/[slug]/(dashboard)/payroll/`:

**Existing (Phase 1)**:
- `/payroll` — dashboard
- `/payroll/employees`
- `/payroll/employees/[id]`
- `/payroll/pay-runs`
- `/payroll/pay-runs/[id]`

**New Sprint 1**:
- `/payroll/leave` — list page with StatusTabs (Pending / Approved / Rejected / Cancelled)
- `/payroll/leave/new` — request form
- `/payroll/leave/[id]` — detail + approve/reject/cancel

**New Sprint 2**:
- `/payroll/leave/calendar` — month-view calendar (tab on `/payroll/leave`)
- `/payroll/settings/holidays` — Tab 3 of settings

**New Sprint 3**:
- `/payroll/timesheets` — list with StatusTabs
- `/payroll/timesheets/new` — weekly grid entry form
- `/payroll/timesheets/[id]` — detail + approve/reject

**New Sprint 4**:
- `/payroll/settings/pay-frequencies` — Tab 2 (pay calendars CRUD)
- `/payroll/settings/pay-items` — Tab 4 (earnings, deductions, reimbursements, leave sub-tabs)
- `/payroll/employees/[id]` — extended with **Pay Template** tab

**New Sprint 5**:
- `/payroll/settings` — parent page, 6 tabs (only 4 implemented in 2a — Organisation, Pay Frequencies, Holidays, Pay Items; Superannuation and Automatic Superannuation rendered as disabled/"Coming in 2b" placeholders per FR-2.144)
- `/payroll/settings/organisation` — Tab 1 (default GL, tracking toggles, payslip options)
- `/payroll/settings/employee-groups` — Employee Groups CRUD (outside the 6-tab settings pane but linked from it — follows the pattern from chart-of-accounts vs tracking categories)
- `/payroll/employees/[id]` — extended with **Employee Group** assignment + **Leave Balances** card

### 4.2 Page breakdown

| Page | Components | Hooks | Notes |
|------|-----------|-------|-------|
| `/payroll/leave` | `LeaveRequestTable`, `StatusTabs`, `DataTableToolbar` | `useLeaveRequests`, `useLeaveRequestCounts` | Xero-style "To review" + history tabs |
| `/payroll/leave/new` | `LeaveRequestForm` (date pickers, leave type select, hours calc) | `useLeaveTypes`, `useCreateLeaveRequest` | Calculates PH/weekend exclusion client-side for preview; server validates |
| `/payroll/leave/[id]` | `LeaveRequestDetail`, `LeaveRequestDayBreakdown`, approval buttons | `useLeaveRequest`, `useApproveLeaveRequest`, `useRejectLeaveRequest`, `useCancelLeaveRequest` | |
| `/payroll/leave/calendar` | `LeaveCalendarMonth` (CSS grid), `LeavePillLegend` | `useLeaveCalendar` | Colour-coded by leave type |
| `/payroll/settings/holidays` | `PublicHolidayTable`, `StateFilter`, `HolidayLockIcon` | `usePublicHolidays`, `useCreatePublicHoliday` etc. | Lock icon on seeded rows |
| `/payroll/timesheets` | `TimesheetTable`, `StatusTabs`, period selector | `useTimesheets`, `useTimesheetCounts`, `useBulkApproveTimesheets` | Bulk approve action |
| `/payroll/timesheets/new` | `TimesheetWeeklyGrid` (7-day grid, entries per earnings type), `TimesheetTemplateApply` | `useTimesheetTemplate`, `useCreateTimesheet`, `useAddTimesheetEntry` | Apply template pre-fills |
| `/payroll/timesheets/[id]` | `TimesheetDetail`, `TimesheetEntryList`, approve/reject | `useTimesheet`, `useApproveTimesheet`, `useRejectTimesheet` | |
| `/payroll/settings/pay-frequencies` | `PayCalendarTable`, `PayCalendarForm`, `UpcomingPeriodsPreview` | `usePayCalendars`, `useUpcomingPeriods` | Shows next 6 periods per calendar |
| `/payroll/settings/pay-items` | 4 sub-tabs each with a `PayItemTable`, `PayItemForm` keyed by kind; STP category picker per FR-2.155 | `usePayItems(kind)`, `useCreatePayItem`, `useUpdatePayItem` | |
| `/payroll/employees/[id]` (Pay Template tab) | `PayTemplateEditor` (line add/edit/delete, GL override picker, tracking category picker), `EffectiveDatingBanner` | `usePayTemplate`, `useUpdatePayTemplate` | Read-only historical view when browsing past templates |
| `/payroll/employees/[id]` (Leave Balances card) | `LeaveBalanceCard` (per leave type: current / accrued YTD / taken YTD) | `useLeaveBalances` | |
| `/payroll/employees/[id]` (Group assignment) | `EmployeeGroupSelect` with effective-from date | `useEmployeeGroups`, `useAssignEmployeeGroup` | |
| `/payroll/settings/organisation` | 3 panels: `DefaultGLAccountsForm`, `PayrollTrackingToggles`, `PayslipOptionsForm` | `usePayrollSettings`, `useUpdatePayrollSettings` | |
| `/payroll/settings/employee-groups` | `EmployeeGroupTable`, `EmployeeGroupForm` | `useEmployeeGroups` etc. | |

### 4.3 New hooks

In `frontend/src/hooks/payroll/`:

- `use-leave.ts` — all leave types, balances, requests, calendar
- `use-timesheets.ts` — all timesheet hooks
- `use-pay-calendars.ts`
- `use-pay-items.ts`
- `use-pay-templates.ts`
- `use-employee-groups.ts`
- `use-public-holidays.ts`
- `use-payroll-settings.ts`

Each file follows the Phase 1 hook pattern (one `useX()` for list, `useXCounts()` for StatusTabs, mutation hooks using `useMutation` with optimistic invalidation of the list query key).

### 4.4 TypeScript types

Extend `frontend/src/types/payroll.ts` (existing Phase 1 file) with new interfaces matching API Resources:

`LeaveType`, `LeaveBalance`, `LeaveAccrual`, `LeaveRequest`, `LeaveRequestDay`, `LeaveRequestStatus`, `PublicHoliday`, `Timesheet`, `TimesheetEntry`, `TimesheetTemplate`, `TimesheetStatus`, `PayCalendar`, `PayCalendarFrequency`, `WeekendRolloverRule`, `PayItem`, `PayItemKind`, `PayTemplate`, `PayTemplateLine`, `EmployeeGroup`, `EmployeePayHistory`, `PayrollSettings`.

Zod schemas for each form:
- `leaveRequestSchema`
- `timesheetEntrySchema`
- `payCalendarSchema`
- `payItemSchema`
- `payTemplateLineSchema`
- `employeeGroupSchema`
- `payrollSettingsSchema`

### 4.5 Navigation changes

`frontend/src/lib/navigation.ts` — extend Payroll group:

Existing nav items (Phase 1): Dashboard, Employees, Pay Runs, Settings.

Add: **Leave** (icon: Calendar, link: `/payroll/leave`, shortcut: `G then L`), **Timesheets** (icon: Clock, link: `/payroll/timesheets`, shortcut: `G then M`). Also add keyboard shortcuts to `CLAUDE.md`'s reserved list — `G then L` and `G then M` — after checking neither is currently bound.

Settings link already exists; update to land on `/payroll/settings` (tab router). Sub-nav within settings is the 6 horizontal tabs; 2a implements 4 of them and renders 5 & 6 as disabled placeholders.

Shortcut hints on buttons:
- `<Button>New Leave Request <kbd>N</kbd></Button>` on `/payroll/leave`
- `<Button>New Timesheet <kbd>N</kbd></Button>` on `/payroll/timesheets`

### 4.6 Component reuse

Reuse from existing shadcn/ui + `components/data-table/`:
- `DataTable` for all list pages
- `StatusTabs` with `/counts` endpoint per each list
- `ViewToggle` — not used in 2a (no kanban variants needed)
- Existing form primitives (Form, Input, Select, DatePicker)
- `AttachmentDropzone` from 012-ATT for leave supporting docs

New shared components:
- `WeeklyHoursGrid` (used by `TimesheetWeeklyGrid` and the leave request day breakdown) — 7-column grid component
- `EffectiveDatingBanner` — reusable "changes take effect from DD-MM" banner
- `KbdHint` — already exists; applied to new N buttons

---

## 5. Sprint Breakdown

Five sprints, each ~2 weeks, one cross-functional squad (BE + FE + QA). Each sprint ends with a demoable outcome.

### Sprint 1 — Leave Foundation

**Goal**: Leave accrues correctly on pay-run finalise and can be requested/approved through the UI.

**Stories**: US1 (P1), US2 (P1) — partial (calendar in Sprint 2).

**Backend deliverables**:
- Migrations: `leave_types`, `leave_balances`, `leave_accruals`, `leave_requests`, `leave_request_days` (5)
- Models + Enums: `LeaveType`, `LeaveBalance`, `LeaveAccrual`, `LeaveRequest`, `LeaveRequestDay`, `LeaveRequestStatus`, `LeaveAccrualType`
- Actions: 12 leave actions (see §3.1)
- Service: `LeaveAccrualCalculator`
- Extension of Phase 1 `FinalisePayRun` to call `ApplyLeaveAccruals` inside transaction
- Seeder: `LeaveTypesSeeder` + hook into `CreateWorkspace`
- Endpoints: 13 routes (see §3.2 Sprint 1)
- Policies: `LeaveTypePolicy`, `LeaveRequestPolicy`, `LeaveBalancePolicy`
- Permissions added to `RolesAndPermissionsSeeder`
- Feature flag `payroll.leave`

**Frontend deliverables**:
- Pages: `/payroll/leave`, `/payroll/leave/new`, `/payroll/leave/[id]`
- Components: `LeaveRequestTable`, `LeaveRequestForm`, `LeaveRequestDetail`, `LeaveRequestDayBreakdown`, `LeaveBalanceCard` (for employee page)
- Hooks: `use-leave.ts`
- Types + Zod schemas for LeaveType, LeaveRequest, LeaveBalance
- Employee detail page: add `LeaveBalanceCard`
- Nav update: add Leave

**Testing**:
- Pest Feature: `LeaveAccrualTest`, `LeaveRequestCrudTest`, `LeaveApprovalTest`, `LeaveCashOutTest`, `LeaveBalanceAdjustmentTest` (covers FR-2.1 through FR-2.19)
- Pest Unit: `LeaveAccrualCalculatorTest` (casual = 0, part-time pro-rata, FT 76h = 5.846 annual + 2.923 personal, accrual cap enforcement, idempotency on re-finalise)
- Pest Feature: `LeavePermissionsTest` (role-by-role matrix)
- Playwright: `LeaveTest.php` — leave request happy path (submit → approve → appears as employee balance change after pay run finalise)

**Demo-able outcome**: Run a pay run for 3 employees (FT, PT, casual). Show zero-accrual for casual, 5.846h annual for FT, pro-rata for PT. Submit a leave request as FT employee, approve, verify balance deducts. Show audit log.

**Dependencies**: Phase 1 complete. 023-EML and 024-NTF for notifications.

**Risks**: Accrual rounding (fractional hours to 4 dp). Accrual inside finalise transaction — if it deadlocks, we need to pull back to async (unlikely but flagged in risk register).

**Sprint 1 metrics**: 5 migrations, 13 endpoints, ~35 Pest tests, 1 Playwright spec.

---

### Sprint 2 — Public Holidays + Leave Calendar Polish

**Goal**: State-aware public holidays seeded and respected in leave calculations; org-wide leave calendar view.

**Stories**: US2 (complete — calendar), US3 (P2 — complete).

**Backend deliverables**:
- Migration: `public_holidays`
- Model + Enum: `PublicHoliday`, `JurisdictionLevel`
- Actions: 5 PH actions + `LeaveCalendarController@index`
- Service: `PublicHolidayCalendar` with 24h workspace cache
- Artisan: `payroll:seed-public-holidays` fetching data.gov.au
- Integration into `CreateLeaveRequest` — PH exclusion from deducted days
- Endpoints: 6 routes (see §3.2 Sprint 2)
- Policy: `PublicHolidayPolicy`

**Frontend deliverables**:
- Pages: `/payroll/settings/holidays`, `/payroll/leave/calendar`
- Components: `PublicHolidayTable`, `StateFilter`, `HolidayLockIcon`, `LeaveCalendarMonth`, `LeavePillLegend`
- Hook: `use-public-holidays.ts`
- Leave request form: inline day breakdown respecting PH + weekends with live recalculation

**Testing**:
- Pest Feature: `PublicHolidaySeedTest`, `PublicHolidayCrudTest`, `LeaveWithPublicHolidayTest` (Easter Monday example), `LeaveCalendarTest`
- Pest Unit: `PublicHolidayCalendarTest` (state filtering, weekend-substitute, custom holidays, group restriction)
- Pest Unit: `LeaveRequestDayCalculatorTest` — ensures PH and weekends are excluded
- Playwright: extend `LeaveTest.php` with PH scenario

**Demo-able outcome**: Configure NSW employee. Submit 5-day leave spanning Easter Monday. System deducts 4 days from balance (not 5). Show leave calendar month view with multiple employees' approved leave colour-coded.

**Dependencies**: Sprint 1 complete. Access to data.gov.au PH dataset.

**Risks**: data.gov.au schema drift between years; state-specific holidays (Melbourne Cup Day, Show Day) may not all be in the federal dataset — needs manual supplementation. Flagged in §6.

**Sprint 2 metrics**: 1 migration, 6 endpoints, ~20 Pest tests, 1 Playwright spec extension.

---

### Sprint 3 — Timesheets Foundation

**Goal**: Timesheet entry, approval, and job allocation. Admin entry supported. No pay-run pull yet (that's Sprint 5).

**Stories**: US4 (P1) — partial (no pay-run import).

**Backend deliverables**:
- Migrations: `timesheets`, `timesheet_entries`, `timesheet_templates` (3)
- Models + Enum: `Timesheet`, `TimesheetEntry`, `TimesheetTemplate`, `TimesheetStatus`
- Actions: 11 timesheet actions (see §3.1)
- Endpoints: 15 routes
- Policy: `TimesheetPolicy`
- Permissions
- Feature flag `payroll.timesheets`
- Integration: timesheet entries link to 008-JCT `project_jobs`

**Frontend deliverables**:
- Pages: `/payroll/timesheets`, `/payroll/timesheets/new`, `/payroll/timesheets/[id]`
- Components: `TimesheetTable`, `TimesheetWeeklyGrid`, `TimesheetDetail`, `TimesheetEntryList`, `TimesheetTemplateApply`
- Shared: `WeeklyHoursGrid` — new shared component
- Hooks: `use-timesheets.ts`
- Employee detail: timesheet template editor tab
- Nav update: add Timesheets

**Testing**:
- Pest Feature: `TimesheetCrudTest`, `TimesheetSubmissionTest`, `TimesheetApprovalTest`, `TimesheetBulkApproveTest`, `TimesheetTemplateTest`, `TimesheetPermissionsTest`, `TimesheetEditLockTest` (post-approval + post-paid edits)
- Pest Unit: `TimesheetTotalHoursCalculatorTest`, `TimesheetSplitByPayPeriodTest`
- Playwright: `TimesheetTest.php` — submit/approve happy path

**Demo-able outcome**: Casual employee submits weekly timesheet with 30 ordinary + 5 OT1 hours across a job. Manager bulk-approves multiple timesheets in one action. Show audit log of individual approvals.

**Dependencies**: Sprint 1 complete (roles/policies pattern); 008-JCT for job selection.

**Risks**: Weekly grid UX — many edge cases (splitting entries by earnings type per day). Overtime threshold prompting may spark debate (Decision #10 keeps it manual for 2a — defer auto-convert to Phase 3).

**Sprint 3 metrics**: 3 migrations, 15 endpoints, ~30 Pest tests, 1 Playwright spec.

---

### Sprint 4 — Pay Calendars + Pay Items + Pay Templates + Auto-create Pay Runs

**Goal**: Pay calendars generate draft pay runs automatically. Workspace pay item library. Per-employee pay templates with GL override and tracking categories. Effective-dating versioning for pay-affecting changes.

**Stories**: US5 (P1 — complete), US6 (P1 — complete), effective-dating foundation.

**Backend deliverables**:
- Migrations: `pay_calendars`, `employee_pay_calendar`, `employee_pay_history`, `pay_items`, `pay_templates` + `pay_template_lines`, Phase 1 `pay_runs.pay_calendar_id` addition (5 migrations, last one combines templates+lines)
- Models + Enums: all of `PayCalendar`, `EmployeePayCalendar`, `EmployeePayHistory`, `PayItem`, `PayTemplate`, `PayTemplateLine`, `PayCalendarFrequency`, `WeekendRolloverRule`, `PayItemKind`
- Actions: 6 pay-calendar actions, 4 pay-item actions, 3 pay-template actions
- Services: `PayCalendarScheduler`, `EmployeePayHistoryResolver`
- Seeder: `PayItemsSeeder` (hooked into `CreateWorkspace`)
- Artisan: `payroll:create-due-pay-runs` + scheduled in `console.php` (06:00 AEST daily)
- Endpoints: 14 routes (see §3.2 Sprint 4)
- Policies: `PayCalendarPolicy`, `PayItemPolicy`, `PayTemplatePolicy`
- Permissions added
- Extend Phase 1 `CreatePayRun`: when invoked from scheduled command, uses pay_calendar + assigned employees; when invoked ad-hoc, preserves existing behaviour
- Extend Phase 1 `CalculatePayRunLine`: reads pay template lines (earnings, allowances, deductions, reimbursements) + applies `EmployeePayHistoryResolver` for rate as-of period_end
- Extend Phase 1 JE posting: respects pay template line GL overrides (line > group > workspace default) and tracking categories

**Frontend deliverables**:
- Pages: `/payroll/settings/pay-frequencies`, `/payroll/settings/pay-items` (4 sub-tabs), employee detail Pay Template tab
- Components: `PayCalendarTable`, `PayCalendarForm`, `UpcomingPeriodsPreview`, `PayItemTable` (×4), `PayItemForm` (×4) with STP picker, `PayTemplateEditor`, `EffectiveDatingBanner`
- Hooks: `use-pay-calendars.ts`, `use-pay-items.ts`, `use-pay-templates.ts`
- Types + Zod schemas

**Testing**:
- Pest Feature: `PayCalendarCrudTest`, `PayCalendarScheduleTest`, `AutoCreateDuePayRunsTest` (idempotency), `TwiceMonthlyFebruaryLeapTest`, `WeekendRolloverTest`, `PayItemCrudTest`, `PayTemplateCrudTest`, `PayTemplateEffectiveDatingTest`, `PayTemplateGLOverrideTest`, `SalarySacrificeSuperTest` (FR-2.49)
- Pest Unit: `PayCalendarSchedulerTest` (exhaustive — all 5 frequencies × all 3 rollover rules × PH-on-payment-date × leap year Feb), `EmployeePayHistoryResolverTest`
- Pest Feature: `PayRunWithTemplateIntegrationTest` (finalise pay run using templates, verify JE splits by GL override)
- Playwright: extend pay-run finalise Playwright spec to cover template-driven gross

**Demo-able outcome**: Create a fortnightly pay calendar. Assign 3 employees with pay templates (salary + car allowance + union deduction). Daily scheduled command creates draft pay run 2 days before period end. Admin reviews, finalises. JE splits wages expense by GL override (e.g. tool allowance on its own expense account).

**Dependencies**: Sprints 1-3 complete for role patterns; Phase 1 JE posting must accept GL override at line level (extension required, not breaking change).

**Risks**: Effective-dating correctness on pay-run calc is the highest-risk item in 2a — calculators must read the right `EmployeePayHistory` row based on `period_end`. If missed, salary changes backdate. Mitigation: mandatory `EmployeePayHistoryResolver` injection into every pay calculator + explicit test coverage (§6 risk register).

Twice-monthly February + leap year edge case is notorious — dedicated test required.

**Sprint 4 metrics**: 5 migrations, 14 endpoints, ~45 Pest tests, 1 Playwright spec extension. Biggest sprint.

---

### Sprint 5 — Employee Groups + Settings Page + Timesheet→Pay-Run Import + Hardening

**Goal**: Employee Groups with GL mapping. Consolidated `/payroll/settings` tabbed page. Timesheet pull into pay-run draft. Performance + E2E polish.

**Stories**: US7 (P2 — complete), US4 (complete — timesheet import), overall hardening.

**Backend deliverables**:
- Migration: `employee_groups`, Phase 1 `employees.employee_group_id` addition
- Model + Policy: `EmployeeGroup`, `EmployeeGroupPolicy`
- Actions: 4 employee-group actions
- Settings: `PayrollSettings` model (workspace-singleton), `UpdatePayrollSettings` action, `PayrollSettingsPolicy`
- Endpoints: 8 routes (see §3.2 Sprint 5)
- Extend Phase 1 JE posting: 3-tier GL precedence (pay_template_line override > employee_group default > workspace default)
- Complete `ImportTimesheetsIntoPayRun` action + endpoint; hook listener `MarkImportedTimesheetsPaidListener` on `PayRunFinalised`
- Permissions: `payroll.settings.*`
- Artisan: `payroll:rollover-ytd` (scheduled 1 July)

**Frontend deliverables**:
- Pages: `/payroll/settings` (tabbed shell rendering Organisation / Pay Frequencies / Holidays / Pay Items / Superannuation (disabled) / Automatic Superannuation (disabled)); `/payroll/settings/organisation`; `/payroll/settings/employee-groups`
- Components: `DefaultGLAccountsForm`, `PayrollTrackingToggles`, `PayslipOptionsForm`, `EmployeeGroupTable`, `EmployeeGroupForm`, `EmployeeGroupSelect`
- Employee detail: group assignment with effective-from, "Pull Timesheets into Pay Run" button on pay run detail page
- Hooks: `use-employee-groups.ts`, `use-payroll-settings.ts`

**Testing**:
- Pest Feature: `EmployeeGroupCrudTest`, `EmployeeGroupGLOverrideTest`, `EmployeeGroupAssignmentEffectiveDatingTest`, `PayrollSettingsTest`, `TimesheetPayRunImportTest`, `GLPrecedenceThreeTierTest` (line > group > workspace)
- Pest Unit: extend `FinalisePayRunJournalEntryTest` to cover 3-tier GL precedence
- Playwright: complete `TimesheetTest.php` to cover pull-into-pay-run end-to-end
- **Hardening**:
  - Load test: pay run with 100 employees, verify finalise (including leave accrual + timesheet pull) completes in <30s (SC-2.9 proxy)
  - Permissions matrix test: all 30 new permissions × 6 roles enforced
  - TFN leakage test: automated grep across new API Resources + audit log entries for any TFN exposure (SC-2.19 — hard gate before release)
  - Leave accrual drift test: 52 weekly pay runs × 10 employees, assert closing balance matches opening + sum of accruals - sum of taken within 0.001 hours per SC-2.2

**Demo-able outcome**: R&D and G&A employee groups with separate wages-expense GLs. 10 timesheets across mixed groups, admin pulls into pay run, finalises. Single pay run JE shows wages expense split correctly between R&D Wages Expense and G&A Wages Expense based on group. Payroll Activity Summary report shows group totals (report itself is 2c — demo shows the raw JE tags).

**Dependencies**: Sprints 1-4 complete.

**Risks**: 3-tier GL precedence implementation risk — requires touching Phase 1 JE posting. Regression risk high. Mitigation: snapshot test of current Phase 1 JE output for 5 canonical pay runs; new code must preserve those outputs byte-for-byte when no group/template overrides are configured.

**Sprint 5 metrics**: 2 migrations, 8 endpoints, ~35 Pest tests, 1 Playwright spec completion + hardening suite.

---

### Sprint totals summary

| Sprint | Migrations | Endpoints | New tables | Pest tests | Playwright specs |
|--------|-----------|-----------|------------|------------|-----------------|
| 1 | 5 | 13 | 5 | ~35 | 1 new |
| 2 | 1 | 6 | 1 | ~20 | 1 extend |
| 3 | 3 | 15 | 3 | ~30 | 1 new |
| 4 | 5 | 14 | 6 | ~45 | 1 extend |
| 5 | 2 | 8 | 1 | ~35 | 1 extend |
| **Total** | **16** | **56** | **16** | **~165** | **3 new + 3 extends** |

80%+ line coverage target on new code per Decision #19.

---

## 6. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | Effective-dating wrong row selected in pay-run calc (salary changes applied too early/late) | Med | High | Mandatory `EmployeePayHistoryResolver` injection; unit tests with ±1 day boundary cases; snapshot test against Phase 1 outputs when no history rows present |
| R2 | Leave accrual rounding drift over 52 weeks | Med | Med | 4 dp storage; `LeaveAccrualCalculator` unit test with 52-iteration drift assertion <0.001h; SC-2.2 contract |
| R3 | data.gov.au PH dataset schema change or outage during seed run | Low | Low | Artisan command caches last-good dataset to disk; fallback uses cached; Sprint 2 tests use a frozen fixture |
| R4 | Timesheet period straddles pay period — wrong allocation | Med | Med | `TimesheetSplitByPayPeriod` helper splits by date; dedicated test case for boundary scenarios |
| R5 | Casual loading + overtime interaction — 25% loading applied to OT by mistake | Low | Med | Phase 1 decision (#3) restricts loading to ordinary hours only; test asserts OT hours don't get loaded |
| R6 | Pay calendar weekend/holiday rollover — edge cases (PH on Monday after weekend, etc.) | Med | Med | `PayCalendarSchedulerTest` is exhaustive (5 freq × 3 rules × PH combos); flagged for design review at Sprint 4 start |
| R7 | Sprint 1 scope — leave surface area is big | Med | Med | Calendar view deferred to Sprint 2; accrual + request CRUD + approval is the core |
| R8 | Leave accrual inside FinalisePayRun transaction causes lock contention | Low | High | Load-tested in Sprint 5; if contention shows, pull accrual out to async listener with a compensating "accrual-failed" audit row and admin alert. Not preferred but fallback |
| R9 | 3-tier GL precedence breaks Phase 1 JE output | Med | High | Snapshot test of Phase 1 canonical pay runs before/after; Sprint 5 regression test is blocking |
| R10 | Pay template effective-dating used for backdated fix → wrong amount on already-finalised PR | Med | Med | Decision #12 blocks past-dated effective_from; admin-override path forces a Pay Adjustment line in next PR instead |
| R11 | Spatie Permission team context not set for leave/timesheet routes (results in 403 storm) | Low | High | `SetWorkspaceContext` middleware already handles this (Phase 1); add assertion in `LeavePermissionsTest` and `TimesheetPermissionsTest` |
| R12 | Twice-monthly Feb 29 leap year bug | Low | Low | Dedicated test; uses `DateTimeImmutable` not manual day math |
| R13 | Feature flag child (`payroll.leave`) enabled while parent (`payroll`) disabled — inconsistent UI | Low | Low | `FeatureResolver` enforces parent-first check on any child |
| R14 | LeaveRequest overlap check miss (same employee submits two overlapping requests via race) | Low | Med | Form Request `after()` + DB advisory lock on `(employee_id)` during insert |
| R15 | Scheduled command `payroll:create-due-pay-runs` fires twice on DST change or manual retrigger | Low | Med | Idempotent on `(pay_calendar_id, period_start)` UNIQUE — cannot double-create |

---

## 7. Open Questions (for humans)

These are commercial/legal rather than technical and need human sign-off before the relevant sprint begins. They do not block plan approval.

1. **Jurisdictions seeded on day one.** Sprint 2 seeds public holidays from data.gov.au for all 8 states + ACT + National. Legal/compliance needs to confirm whether NT and ACT need specific treatment on day one, or whether a "pilot states" (NSW+VIC+QLD) subset is acceptable for early customers.

2. **LSL accrual default rate — 1/60 per ordinary hour.** Confirmed in Phase 2 spec assumption; Phase 3 will introduce state-portable schemes. Need CFO sign-off that the 1/60 default (approximately the NSW-style 8.667 weeks after 10 years) is acceptable as a single cross-state default for 2a.

3. **Casual loading default — 25%.** Decision #3 stores per-employee. Confirm with legal that 25% is safe as the employer default without award-level overrides shipping in 2a.

4. **Leave loading (17.5%) OFF by default.** Decision #6. Confirm with CFO and legal — most awards require it, but storing it as explicit-opt-in is safer from a liability angle than silently defaulting ON.

5. **Leave accrual paused during unpaid leave.** Spec edge case mentions pausing during extended unpaid parental. Need product decision: auto-pause (complex, risky) vs admin-manual-pause (simple, explicit).

6. **data.gov.au licence redistribution.** Confirm ODbL-style licence allows redistributing seeded PH data through our product.

7. **Timesheet auto-approval for admin-entered.** FR-2.33 says "optionally". Need product preference for default — off (safer) or on (quicker for admins entering on employees' behalf).

8. **Employee-group reassignment handling of in-flight pay runs.** Decision #6 + #27 are flat groups + effective-dated. But if admin changes a group mid-pay-period, should the pay run in-flight use the old or new group's GL? Current plan: use old (locked at pay-run creation). Confirm.

9. **Pay calendar frequency — quarterly.** FR-2.41 states "for directors-fee scenarios". Confirm this is a real demand before shipping; if not, drop to simplify `PayCalendarScheduler`.

10. **Pay item "Parental Leave Paid" STP category.** Pick list in FR-2.155 includes "Paid Parental Leave" — confirm this includes both employer-funded and government-funded parental leave (different STP codes).

Items marked `[Planning TBD:]` inline elsewhere in this plan — none remain. All were resolved by the 20 planning decisions or are captured in this section.

---

## 8. Gate 3 (Architecture) Checklist Mapping

Cross-reference against `.tc-wow/gates/03-architecture.md` checkpoints.

### Section: Laravel Backend Overrides

| Check | Plan coverage |
|-------|---------------|
| Use Lorisleiva Actions | §3.1 — every state change is an Action with `AsAction`; no logic in controllers |
| Laravel Data for DTOs | §3.6 — DTOs reserved for nested payloads (LeaveRequest, TimesheetEntry, PayTemplate); flat endpoints use `$request->validated()` per CLAUDE.md |
| API Resources for responses | All new controllers return `new XResource($model)` per Phase 1 precedent — no raw arrays |
| Model route binding | Controllers use `{employee}`, `{payRun}`, `{id}` patterns; Phase 1 uses UUID lookup — 2a adds the same where relevant |
| Sanctum cookie auth | No change from Phase 1 |
| Feature flags dual-gated | §3.10 — `payroll.leave`, `payroll.timesheets` children of parent `payroll`, checked in middleware + returned in API response |
| Event sourcing granular | N/A for 2a — Planning Decision #1/#2/#3. No new aggregates or events. Plan explicitly notes this |
| No hardcoded business logic in frontend | All accrual math, PH exclusion, overtime thresholds live server-side. Frontend only renders |

### Section: Event Sourcing Standards

| Check | Plan coverage |
|-------|---------------|
| Aggregate roots identified | **N/A — no new aggregates in 2a** per Decision #1-3 |
| Events are granular facts | N/A |
| Events carry full payload | N/A |
| Projectors identified | **No new projectors in 2a** per Decision #3 — preserves single-worker ordering |
| Single projector queue | Preserved by not adding new projectors |
| Snapshots planned | N/A for 2a (Phase 1 policy unchanged) |
| Replay strategy documented | N/A for 2a; Phase 1 snapshot-every-100-events policy unchanged |

### Section: Multi-Tenancy Standards

| Check | Plan coverage |
|-------|---------------|
| All tenant models scoped | §2 — every new table has `workspace_id` FK; every model uses `BelongsToWorkspace` trait global scope |
| Central vs tenant separation clear | All 16 new tables are workspace-scoped (tenant). No central tables added |
| No cross-tenant queries | §3.4 policies + global scopes prevent; `LeaveRequestOverlapCheck` scoped to `employee_id` which is already workspace-bound |
| Tenant context set in middleware | `SetWorkspaceContext` unchanged from Phase 1; new routes inherit |
| Tests verify isolation | Every Pest Feature test includes a "cannot see another workspace's rows" case (Phase 1 pattern) |

### Section: Frontend Standards (Next.js/React)

| Check | Plan coverage |
|-------|---------------|
| All components use TypeScript | §4 — all new components `.tsx` strict |
| Props typed with interfaces/types | Same |
| No `any` types planned | §4.4 — types match API Resources |
| Shared types identified | `frontend/src/types/payroll.ts` extended (existing file) |
| Component library reused | §4.6 — StatusTabs, DataTable, Form primitives reused |
| Server/client components explicit | New pages are `'use client'` for interactivity; server components where possible (list pages can be hybrid) |
| Data fetching via TanStack Query | §4.3 — every hook is TanStack Query |
| Client state via Zustand | No new Zustand stores needed for 2a — leave/timesheet forms are fully TanStack Query + React Hook Form |
| Forms use React Hook Form + Zod | §4.4 — Zod schemas for every form |
| API client typed | Extends existing `frontend/src/lib/api/payroll.ts` typed client |

### Section: Code Quality Standards (§04)

| Check | Plan coverage |
|-------|---------------|
| No unused imports / variables | Enforced via ESLint in CI (unchanged) |
| Naming conventions | camelCase functions, PascalCase components |
| Loading/error states | Every TanStack Query hook + mutation has standard loading + error UI per Phase 1 pattern |
| Data Grid Standards | TanStack Table v8 via `DataTable` shared component |
| Server-side pagination >50 | All list endpoints paginate (15/page default) |
| Pest tests for all new actions/endpoints | §5 per-sprint test list |

### Section: Playwright E2E

| Check | Plan coverage |
|-------|---------------|
| Browser tests for user-visible flows | §5 — 3 new Playwright specs (leave, timesheets, pay-run-with-template) + 3 extensions |
| Persona logins for RBAC scenarios | Leave approval test uses `PERSONA_ADMIN` vs `PERSONA_BOOKKEEPER` to verify approval denial |

### Flags that do NOT apply

- Section "Vue TypeScript Standards" — overridden by CLAUDE.md Next.js/React equivalents
- Event sourcing section — Decision #1/#2/#3 mean no aggregates or projectors added in 2a
- Section "Multi-Step Wizards" — no wizards in 2a (termination wizard is 2b)

---

## End of plan-phase-2a.md
