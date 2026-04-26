---
title: "Feature Specification: Payroll Phase 2 — Compliance, Leave & Self-Service"
---

# Feature Specification: Payroll Phase 2 — Compliance, Leave & Self-Service

**Feature Branch**: `064-PAY-phase-2`
**Created**: 2026-04-19
**Status**: Draft
**Epic**: 064-PAY-Phase-2
**Initiative**: FL — Financial Ledger Platform
**Effort**: XL (12-15 sprints across 3 sub-phases)
**Depends On**: 064-PAY Phase 1 (complete — employees, pay runs, PAYG, super, auto-posted JEs), 023-EML (email infra), 024-NTF (notifications), 008-JCT (job costing — for timesheet allocation), 044-TAX (BAS — for STP-period reconciliation)

---

## Out of Scope (Deferred to Phase 3)

- **Modern Award interpretation engine** — penalty rates, allowances, classification mapping for the 100+ Modern Awards. Phase 2 supports manual rate entry and overtime tiers but no automated award compliance
- **State-specific Long Service Leave rules** — Phase 2 supports basic LSL accrual configurable per workspace; state-portable schemes (CoINVEST, QLeave, etc.) and state-specific qualifying periods are deferred
- **State-based Payroll Tax** — covered by separate epic 083-SPT (state thresholds, grouping, apportionment)
- **Full SuperStream / clearing house integration** — Phase 2 builds the data surface (super payment batches, remittance tracking, reference numbers) but defers actual SuperStream message construction and APRA fund file submission to Phase 3
- **Roster / shift scheduling** — timesheets in Phase 2 capture worked hours but do not include forward-looking shift planning, availability management, or roster publication
- **Multi-workspace payroll consolidation** — group payroll across multiple Ledgerly workspaces (e.g., consolidated reporting for related entities) is deferred
- **Native ATO STP submission (DSP certification)** — STP submission continues via integration gateway in Phase 2; direct DSP-certified submission is deferred
- **Single Touch Payroll Phase 3** — when/if the ATO publishes Phase 3 specifications, Phase 2 implementation must be designed for forward-compatibility but does not implement Phase 3 fields
- **Employee performance reviews / OKRs / talent management** — HR functionality is limited to payroll-relevant fields (cessation, leave, change log). Performance management is a separate product surface
- **Workers compensation premium calculation / declarations** — captured as an annual obligation outside the pay run
- **Salary packaging / FBT** — fringe benefits tax tracking (novated leases, packaged cars, meal cards) is deferred

---

## Overview

Phase 1 delivered the **payroll calculation engine**: a business owner can add employees, run a pay run, and have correct PAYG, super, and journal entries posted automatically. Phase 2 turns that engine into a **production-grade payroll platform** by adding the compliance, employee-facing, and operational features that every Australian employer needs to actually run payroll day-to-day.

The capabilities in this phase fall into three groups. **Compliance** (STP Phase 2 reporting, Payday Super remittance, EOY finalisation, payslips) takes the engine from "calculates correctly" to "meets ATO and Fair Work obligations". **Operations** (leave management, timesheets, pay calendars, pay templates, employee groups, deductions, garnishments) makes payroll workable for businesses with more than a handful of employees, complex pay structures, and mixed employment types. **Self-service** (employee portal extensions, onboarding) shifts data entry from the employer to the employee, dramatically reducing the admin burden that prevents most small businesses from adopting integrated payroll.

This phase deliberately avoids award interpretation. Modern Awards are a category of complexity (penalty rates by hour-of-day, allowances by classification, broken shift rules, sleepover rates, etc.) that competing products like Employment Hero and KeyPay specialise in. Ledgerly Phase 2 supports manual rate entry, overtime tiers (1.5x/2x/2.5x), and configurable allowances — enough for the vast majority of small businesses that pay above-award salaries or use simple hourly arrangements. Award engine integration is a Phase 3 decision (build vs. partner).

**Critical regulatory drivers for this phase**: (1) **Payday Super** commences 1 July 2026 — by the time Phase 2 ships, employers must be paying super within 7 days of each payday, not quarterly. The super payment batch and remittance workflow in this spec is non-negotiable for compliance. (2) **STP Phase 2** is already mandatory — every pay event must be reported with disaggregated income types, allowance categories, salary sacrifice breakdowns, and termination cessation reasons. (3) **Fair Work Act s536** requires payslips within 1 working day of payment, with specific minimum content. (4) **Privacy Act / TFN Rule 2015** govern how Tax File Numbers can be collected, stored, and displayed.

---

## Sub-Phasing

Phase 2 is large enough to require sub-phasing for delivery. Each sub-phase is shippable independently and unlocks tangible business value.

### Phase 2a — Leave, Timesheets & Operational Foundations (4-5 sprints)

The features that make payroll *workable* for any business with more than 3 employees. Before this sub-phase, the only way to pay an employee for leave is to manually adjust gross pay; after it, leave accrues automatically and is requested through proper workflows.

| Story | Capability | Priority |
|-------|-----------|----------|
| US1 | Leave types, accruals, balances | P1 |
| US2 | Leave requests, approvals, calendar | P1 |
| US3 | Public holidays (state-based) | P2 |
| US4 | Timesheets (entry, approval, pay run integration) | P1 |
| US5 | Pay calendars and scheduling | P1 |
| US6 | Pay templates and earnings lines | P1 |
| US7 | Employee groups and cost centre mapping | P2 |

**Exit criteria**: Employees accrue leave per pay run, request leave through a workflow, submit timesheets, and are paid through their assigned pay calendar with their pay template auto-applied.

### Phase 2b — STP, Super, EOY & Compliance (4-5 sprints)

The compliance layer that makes Ledgerly a usable system of record for ATO obligations. Without this sub-phase, employers still need a separate tool for STP and super remittance.

| Story | Capability | Priority |
|-------|-----------|----------|
| US8 | STP Phase 2 reporting (pay events, update events, full file replacement) | P1 |
| US9 | Super funds register, stapled fund handling | P1 |
| US10 | Super payment batches & remittance tracking (Payday Super) | P1 |
| US11 | Termination & final pay (ETP, unused leave, cessation reasons) | P1 |
| US12 | Deductions, garnishments & protected earnings | P2 |
| US13 | End of Year (income statements, ATO finalisation, year rollover) | P1 |

**Exit criteria**: Every pay run results in an STP filing; super liability batches into payment-ready remittances within 7 days; terminations produce correct ETP calculations and final pays; EOY finalisation submits income statements to the ATO.

### Phase 2c — Payslips, Employee Self-Service & Reports (3-4 sprints)

The visibility layer for both employers (reports) and employees (portal). The employee portal in this sub-phase extends the work specced separately in `employee-portal-spec.md`.

| Story | Capability | Priority |
|-------|-----------|----------|
| US14 | Payslips (PDF, email, re-issue, employee view) | P1 |
| US15 | Employee self-service portal extensions (leave, timesheets, profile) | P1 |
| US16 | Employee onboarding (self-onboard, bulk import, admin entry) | P2 |
| US17 | Payroll reports (Activity Summary, Leave Transactions, Super Accrual, Remuneration, Timesheet) | P1 |

**Exit criteria**: Every employee receives a compliant payslip on every pay run; employees can self-serve leave requests and timesheets through the portal; new employees can be onboarded via self-service or bulk import; employers have the standard suite of payroll reports.

---

## User Scenarios & Testing

### User Story 1 — Leave Types, Accruals & Balances (Priority: P1)

A business owner needs leave entitlements to accrue automatically per pay run, in line with NES requirements and the employee's employment type. Today (post-Phase 1) leave is invisible — there is no concept of an annual leave balance, no accrual on pay run finalisation, and no way to record leave taken.

**Why this priority**: Leave is the second-most-asked-about feature after pay calculation itself. Every pay run that does not accrue leave is a compliance gap. Without leave balances, the system cannot calculate termination payouts (US11), produce compliant payslips (US14), or support the leave request workflow (US2).

**Independent Test**: Run a pay run for a full-time employee with 76 hours and verify annual leave accrues 5.846 hours, personal leave accrues 2.923 hours, and casual employees accrue zero.

**Acceptance Scenarios**:

1. **Given** a workspace has payroll enabled, **When** an admin navigates to Settings → Payroll → Leave Types, **Then** they see a configurable list of leave types with sensible AU defaults pre-seeded: Annual, Personal/Carer's, Sick (alias of Personal), Long Service, Bereavement/Compassionate, Community Service, Parental (Paid), Parental (Unpaid), Time in Lieu (TIL), Birthday, Unpaid, Study.

2. **Given** the default leave types are seeded, **When** the admin views a leave type's settings, **Then** they see configurable fields: name, code (machine identifier), accrues (yes/no), accrual rate per ordinary hour, accrual cap (max balance, optional), paid (yes/no), included in OTE for super (yes/no), STP Phase 2 paid leave category (cash out, unused on termination, parental leave, workers comp, ancillary, other paid leave), and whether the leave can be cashed out.

3. **Given** a full-time employee completes a fortnightly pay run with 76 ordinary hours, **When** the pay run is finalised, **Then** the system creates leave accrual transactions: annual leave +5.846 hours (76 × 4/52), personal leave +2.923 hours (76 × 10/52/5 — i.e. 76 × 0.038 hours per ordinary hour), and basic long service leave +0.681 hours `[Assumption: LSL accrues at 1/60 of ordinary hours in Phase 2 as a workspace default — true state-specific rules deferred to Phase 3]`.

4. **Given** a part-time employee works 20 hours in the pay period, **When** the pay run is finalised, **Then** annual and personal leave accrue pro-rata to ordinary hours worked (no separate "part-time formula" — the rate per ordinary hour is the same).

5. **Given** a casual employee, **When** any pay run is finalised for them, **Then** no leave accrues. The employee detail page displays "Casual loading 25% in lieu of leave" instead of leave balances.

6. **Given** an employee takes 22.8 hours of annual leave, **When** the pay run is processed (with the leave entered as an earnings line of type "Annual Leave Taken"), **Then** the gross pay includes the 22.8 hours at the employee's ordinary rate, the leave balance reduces by 22.8 hours, and PAYG and super are calculated on the leave amount as normal (paid leave is OTE).

7. **Given** an employee has 50 hours of accrued annual leave, **When** the admin attempts to process leave taken for 60 hours, **Then** the system warns that the requested leave exceeds the balance and asks whether to (a) reduce to 50 hours and pay 10 hours unpaid, (b) allow negative balance with admin override, or (c) cancel.

8. **Given** an annual leave balance exceeds 8 weeks of accrual `[Assumption: 8-week threshold per Fair Work standard]`, **When** the employee detail page renders, **Then** an "excessive leave balance" warning displays with a suggestion to discuss leave planning (under Fair Work, employers can direct excessive leave to be taken).

9. **Given** the workspace fiscal year rolls over, **When** the new year begins, **Then** unused leave balances carry forward indefinitely (no use-it-or-lose-it for NES entitlements). YTD-taken counters reset to zero for the new financial year.

10. **Given** an employee requests leave cash-out for 38 hours of annual leave, **When** an admin processes the cash-out (requires written agreement attachment), **Then** the system pays the 38 hours at ordinary rate, deducts from the annual leave balance, and ensures the remaining balance is at least 4 weeks (the Fair Work minimum residual). The cash-out is reported via STP under the "Lump Sum W" / cash-out paid leave category.

**Edge Cases**:
- Leave taken on a public holiday: do not deduct from balance, pay at ordinary rate per Fair Work
- Negative leave balance allowed only with admin override and explicit justification
- Leave loading (17.5% on annual leave taken) configurable per employee — flag with `leave_loading_applies` and `leave_loading_rate_basis_points`
- Leave accrual paused during unpaid leave (employee on extended unpaid parental leave does not accrue annual or personal)

**Linked Functional Requirements**: FR-2.1 to FR-2.12

---

### User Story 2 — Leave Requests, Approvals & Org Calendar (Priority: P1)

An employee wants to request time off without emailing their manager. The manager wants to see who is away, approve or reject requests, and have approved leave automatically appear in the next pay run. The admin wants org-wide visibility of leave coverage.

**Why this priority**: Without a leave request workflow, leave is recorded by the employer manually entering it into a pay run after the fact. This is error-prone and creates no audit trail. The leave calendar is the single most commonly cited feature when small businesses describe what they need from payroll.

**Independent Test**: Submit a leave request as an employee, approve as a manager, verify it appears on the org calendar and is automatically pulled into the next pay run for the employee.

**Acceptance Scenarios**:

1. **Given** an employee with portal access, **When** they navigate to Portal → Leave → Request Leave, **Then** they see a form with: leave type (filtered to types they're entitled to), start date, end date, full-day or partial-day toggle, hours per day (defaults to their ordinary daily hours), reason (optional free text), supporting document upload (e.g., medical certificate for sick leave).

2. **Given** the employee submits a request, **When** the system processes it, **Then** the request is created with status `pending`, the employee's nominated approver is notified (in-app via 024-NTF and via email via 023-EML), and the request appears in the approver's "Pending Approvals" queue.

3. **Given** a manager views a pending leave request, **When** they approve it, **Then** the request status becomes `approved`, the employee is notified, the leave appears in the org calendar, and the leave is queued to be auto-applied to the next pay run that covers the leave dates.

4. **Given** a manager rejects a request, **When** they confirm with a rejection reason (required), **Then** the request status becomes `rejected`, the employee is notified with the reason, and no pay run change occurs.

5. **Given** a request is approved but the employee subsequently needs to cancel, **When** they cancel through the portal, **Then** the request status becomes `cancelled`, the leave is removed from the next pay run if not yet finalised, and the manager is notified. If the pay run has already finalised, the cancellation creates a "Leave Reversal" adjustment in the next pay run.

6. **Given** the admin needs to override an approval (e.g., manager unavailable, leave conflict), **When** they approve or reject from the admin Leave Requests view, **Then** the action is recorded in the audit log with the original approver and the override actor.

7. **Given** any user with payroll-view permission, **When** they navigate to Payroll → Leave Calendar, **Then** they see a month-view calendar showing all approved leave across the org, colour-coded by leave type, with employee names and leave-type tags. Hover shows hours and approver.

8. **Given** approved leave for a future pay period, **When** that pay run is created (manually or auto-scheduled), **Then** the leave is automatically pulled in as an earnings line on the affected employee's pay run line, deducting from the appropriate leave balance and reducing ordinary hours by the same amount.

9. **Given** a leave request spans a public holiday, **When** the system calculates leave hours, **Then** public holidays falling within the requested range are excluded from the leave deduction (per Fair Work — public holidays do not consume annual leave).

10. **Given** a manager is on leave themselves, **When** an approval request is sent to them, **Then** the request is automatically routed to their delegated approver if one is configured, otherwise it remains in the queue with a "manager unavailable" flag.

**Edge Cases**:
- Concurrent leave requests from same employee: prevent overlapping date ranges
- Backdated leave (start date before today) requires admin role to approve, not just manager
- Half-day leave: configurable per workspace whether to round to nearest half-day or allow arbitrary hours
- Leave during notice period (after termination notice given) — flag for review

**Linked Functional Requirements**: FR-2.13 to FR-2.22

---

### User Story 3 — Public Holidays (State-Based) (Priority: P2)

Australian public holidays differ by state and territory. A pay run that pays an employee for a day they didn't work because it was a public holiday should not deduct from their leave balance, and overtime/penalty rates may apply to work performed on a public holiday.

**Why this priority**: Public holidays are necessary for accurate leave calculation (US1), pay runs that span holidays (US5), and timesheet processing (US4). Without state-aware holidays, leave will deduct incorrectly across long weekends and holiday periods.

**Independent Test**: Configure holidays for NSW, run a pay run for a NSW employee covering Easter Monday, and verify the public holiday is paid as ordinary hours (not deducted from leave) and timesheet hours on that day are flagged as penalty-eligible.

**Acceptance Scenarios**:

1. **Given** a workspace, **When** the admin navigates to Settings → Payroll → Public Holidays, **Then** they see a year-by-year list of public holidays grouped by state/territory (NSW, VIC, QLD, WA, SA, TAS, NT, ACT, plus a "National" set).

2. **Given** the system is initialised, **When** the public holidays page loads, **Then** the standard AU public holidays for the current and next financial year are pre-seeded `[Assumption: holidays seeded from a maintained data file updated annually; no live API integration in Phase 2]`.

3. **Given** a state-specific holiday (e.g., Melbourne Cup Day, Friday before AFL Grand Final), **When** an employee's `work_state` is set to VIC, **Then** that holiday applies to their pay run; for non-VIC employees, it does not.

4. **Given** a regional holiday (e.g., a country show day), **When** the admin needs to add a custom holiday, **Then** they can create a workspace-level holiday with a date, name, applicable states (multi-select), and optional restriction to specific employee groups (US7).

5. **Given** a holiday falls on a Saturday or Sunday, **When** the holiday data is loaded, **Then** the substitute "in-lieu" day (typically the following Monday) is also flagged as a public holiday per state rules.

6. **Given** an employee's regular working day falls on a public holiday, **When** the pay run is calculated, **Then** the day is paid as ordinary hours (not as leave), labelled "Public Holiday — paid", and does not deduct from any leave balance.

7. **Given** an employee actually works on a public holiday, **When** the timesheet is processed, **Then** the hours can be paid at the workspace-configured penalty rate `[Assumption: workspace default penalty rate for public holiday work, e.g., 2.5x — actual award penalty rates deferred to Phase 3]`, with the rate visible per pay run line.

**Edge Cases**:
- Easter dates change yearly — must be calculated correctly through 2030+
- Some holidays are part-day (e.g., Christmas Eve afternoon in some states/agreements)
- Employees who work across state lines (rare) — `work_state` is the source of truth

**Linked Functional Requirements**: FR-2.23 to FR-2.28

---

### User Story 4 — Timesheets (Entry, Approval, Pay Run Integration) (Priority: P1)

Hourly employees, casuals, and shift workers need to record actual hours worked. Salaried employees may need to record time for cost centre / job allocation. Timesheets must flow into pay runs (replacing manual hours entry) and into job costing (linking to 008-JCT).

**Why this priority**: Without timesheets, pay runs require an admin to manually enter hours per employee per period. For a business with 20+ casual employees this is a 30-minute admin task per pay run, error-prone, and disconnected from any audit trail. Timesheets are also the only sensible way to do project/job costing for time-billed work.

**Independent Test**: Submit a timesheet as an employee (38 ordinary hours + 4 overtime hours), approve as a manager, create a pay run for the period and verify the hours pull through automatically with overtime at the configured 1.5x rate.

**Acceptance Scenarios**:

1. **Given** an employee with portal access, **When** they navigate to Portal → Timesheets → New, **Then** they see a weekly grid (default Mon-Sun) where they can enter hours per day, select a job/project (optional, links to 008-JCT), select an earnings type (ordinary / overtime tier 1 / overtime tier 2 / overtime tier 3 / public holiday / etc.), and add notes.

2. **Given** the workspace has timesheet templates configured (US6 implies a standard week pattern), **When** the employee starts a new timesheet, **Then** they can pre-fill from their template (e.g., "Standard 38-hour week: 7.6 hours Mon-Fri") and adjust as needed.

3. **Given** a completed timesheet, **When** the employee submits it, **Then** the timesheet status becomes `submitted`, the manager is notified, and the timesheet appears in the manager's approval queue. The employee cannot edit a submitted timesheet (only withdraw to redraft).

4. **Given** a manager views a submitted timesheet, **When** they approve it, **Then** the status becomes `approved`, the employee is notified, and the hours are queued for inclusion in the next applicable pay run.

5. **Given** a manager has many timesheets to approve, **When** they use bulk approval, **Then** they can multi-select timesheets and approve in one action (each is logged individually in audit).

6. **Given** a manager rejects a timesheet, **When** they provide a rejection reason, **Then** the timesheet returns to the employee with the reason, status becomes `rejected`, and the employee can re-edit and re-submit.

7. **Given** a pay run is being created for a period, **When** the system determines hours per employee, **Then** approved timesheets for the period are pulled in automatically. For employees with no timesheet for the period, the pay template default applies (US6).

8. **Given** a timesheet line is associated with a job, **When** the pay run is finalised, **Then** the labour cost is allocated to the job in 008-JCT (`debit Job WIP / credit Wages Allocated` if labour-on-cost is enabled, or simply tagged on the wages expense JE line for reporting).

9. **Given** an employee enters more than the configured ordinary hours threshold per day or week (e.g., >38 hours/week), **When** they save, **Then** the system prompts to allocate excess to overtime tier 1, 2, or 3, with the workspace's default allocation rules suggested.

10. **Given** an admin needs to enter a timesheet on behalf of an employee, **When** they navigate to Payroll → Timesheets → New (admin), **Then** they can enter hours for any active employee. Admin-entered timesheets can be auto-approved or routed for manager approval based on workspace settings.

11. **Given** a timesheet has been pulled into a finalised pay run, **When** anyone attempts to edit the timesheet, **Then** the system prevents the edit. Adjustments must be made via a new timesheet in a subsequent pay period.

**Edge Cases**:
- Timesheet spans pay period boundary: the system splits hours by date into the appropriate pay runs
- Casuals with no scheduled hours: timesheet is the only source of pay; missing timesheet means nil pay
- Public holiday hours: auto-flagged based on US3 holiday data
- Allowances tied to specific shifts (e.g., meal allowance for shifts > 6 hours) — flag captured but calculation deferred to Phase 3 award engine

**Linked Functional Requirements**: FR-2.29 to FR-2.40

---

### User Story 5 — Pay Calendars and Scheduling (Priority: P1)

A business may pay different employee groups on different schedules — weekly for casuals, fortnightly for salaried staff, monthly for executives. Each pay calendar has its own period boundaries, payment dates, and rollover rules (e.g., if payment date falls on a weekend, pay on the previous business day).

**Why this priority**: Phase 1 supports a single pay frequency per pay run created ad-hoc. To run real payroll without manual scheduling, the system needs named pay calendars that auto-generate the next pay run on schedule.

**Independent Test**: Create a fortnightly pay calendar starting 1 April 2026 with payment 5 days after period end, assign 3 employees to it, and verify pay runs auto-generate on schedule for the next 12 fortnights.

**Acceptance Scenarios**:

1. **Given** a workspace, **When** the admin navigates to Settings → Payroll → Pay Calendars, **Then** they see a list of pay calendars and can create a new one with: name (e.g., "Fortnightly Salaried"), frequency (weekly / fortnightly / twice-monthly / monthly / quarterly), period anchor (e.g., "Mon-Sun" for weekly, "1st-15th and 16th-EOM" for twice-monthly), payment date offset (days after period end), and weekend rollover rule (pay on previous business day / pay on next business day / no rollover).

2. **Given** a calendar exists, **When** the admin assigns employees, **Then** they select employees from a multi-select list. An employee can only be assigned to one pay calendar at a time (changing assignment requires confirmation that pending pay runs will be affected).

3. **Given** a fortnightly calendar starting 1 April 2026, **When** the system displays the calendar's upcoming periods, **Then** it shows the next 6 pay periods with: period start, period end, payment date (adjusted for weekends/holidays), and current status (scheduled / open / processing / finalised).

4. **Given** the system runs its daily scheduled job, **When** a pay calendar's next period is reaching its cutoff (e.g., 2 days before period end), **Then** a draft pay run is auto-created for that period, populated with assigned employees, and the admin is notified that a pay run is ready for review.

5. **Given** a payment date would fall on a weekend or public holiday, **When** the rollover rule is "previous business day", **Then** the payment date adjusts to the prior business day (skipping weekends and public holidays for the employee's `work_state`).

6. **Given** twice-monthly pay (15th and end-of-month), **When** February is processed, **Then** the second period correctly ends on 28 or 29 (leap year aware).

7. **Given** an employee changes pay calendars mid-financial-year, **When** the change is saved, **Then** the system records the change date, ensures no pay period overlap for that employee, and prevents the employee being included in the old calendar's subsequent runs.

8. **Given** quarterly pay frequency `[Assumption: quarterly is supported for directors-fee scenarios; non-standard but specified in scope]`, **When** the admin configures quarterly pay, **Then** payments align to financial quarters (Q1: Jul-Sep, Q2: Oct-Dec, Q3: Jan-Mar, Q4: Apr-Jun) by default, configurable.

**Edge Cases**:
- Calendar with no employees: do not auto-generate pay runs
- Out-of-cycle pay run (e.g., bonus payment) — admin can create one-off pay runs without a calendar
- Calendar deletion: prevented if any finalised pay run exists; allowed if only draft pay runs

**Linked Functional Requirements**: FR-2.41 to FR-2.49

---

### User Story 6 — Pay Templates & Earnings Lines (Priority: P1)

An employee's pay is rarely just "salary" — it's a combination of base pay, allowances (tool, meal, car, travel), recurring deductions (union, salary sacrifice), and possibly a recurring bonus. A pay template defines this structure once per employee so every pay run starts with the right lines.

**Why this priority**: Without pay templates, every pay run requires the admin to manually add allowances and deductions for each employee. Mistakes lead to compliance issues (missed allowances) or incorrect tax (salary-sacrifice handled wrong). Templates are also the prerequisite for STP Phase 2 disaggregated reporting (US8).

**Independent Test**: Configure an employee with a pay template containing salary $80,000 + tool allowance $25/week + union deduction $15/week, run a pay run, verify all three lines appear with correct amounts and STP categorisation.

**Acceptance Scenarios**:

1. **Given** the workspace has earnings types and deduction types seeded, **When** the admin views Settings → Payroll → Earnings & Deductions, **Then** they see configurable lists with AU defaults: Earnings (Ordinary Time, Overtime 1.5x, Overtime 2x, Overtime 2.5x, Annual Leave Taken, Personal Leave Taken, Public Holiday, Bonus, Commission, Director's Fees, Lump Sum A, Lump Sum B, Lump Sum D, Lump Sum E, Lump Sum W); Allowances (Car, Meal, Tool, Uniform, Travel, Laundry, Qualifications, Tasks, Other); Deductions (Union Fees, Salary Sacrifice — Super, Salary Sacrifice — Other, Workplace Giving, Child Support, Court Order, Other). Each carries a STP Phase 2 category code.

2. **Given** an admin views an employee's detail page, **When** they navigate to the Pay Template tab, **Then** they see the employee's recurring pay lines with: line type (earnings / allowance / deduction / reimbursement), name, amount or rate, frequency (per pay period / per hour), GL account override (optional), tracking category (optional, links to job / cost centre / employee group), STP category (auto-derived from line type), included in OTE for super (auto-derived but overridable).

3. **Given** an employee has a pay template configured, **When** a pay run is created for them, **Then** the pay run line is pre-populated with all template lines. The admin can adjust amounts or remove lines for that specific pay run without changing the template.

4. **Given** an allowance is taxable but excluded from super (e.g., car allowance per ATO), **When** the pay run calculates, **Then** PAYG includes the allowance in taxable earnings, super does NOT include the allowance in OTE, and the STP payload reports the allowance under its specific allowance type code (CD / MD / LD / TD / etc.).

5. **Given** a salary-sacrifice-to-super line of $200 per fortnight, **When** the pay run calculates, **Then** the employee's gross taxable pay is reduced by $200 (PAYG calculated on reduced gross), the employer SG continues to be calculated on pre-sacrifice OTE (per FR-022), and the salary sacrifice amount is added to the super liability for the employee, paid alongside SG to the same fund.

6. **Given** a bonus line is added one-off to a pay run, **When** the pay run calculates PAYG, **Then** the system uses Method B(ii) marginal tax calculation for bonuses (rather than the standard formula) `[Assumption: Method B(ii) is the AU standard for one-off bonuses — FR will reference ATO Schedule 5]`, with an option to override to Method A if the user prefers.

7. **Given** a pay template line has a GL account override, **When** the pay run is finalised, **Then** the auto-posted journal entry uses the override account for that line's wages expense (e.g., "Tool Allowance" expense rather than the default Wages Expense). This enables proper P&L expense categorisation.

8. **Given** a pay template line is tagged with a tracking category, **When** the journal entry is posted, **Then** the JE line carries the tracking tag so reports can slice payroll cost by job / cost centre / department.

9. **Given** an employee's pay rate or template changes, **When** the admin saves the change, **Then** an effective-from date is captured (per US14) — the change applies to pay runs whose `period_start >= effective_date`.

**Edge Cases**:
- Reimbursements (non-taxable, non-super-liable): include in net pay, exclude from STP gross, exclude from super OTE, exclude from W1 BAS field
- Negative earnings line (e.g., over-payment recovery): reduces gross — handle PAYG/super recalculation correctly
- Allowances above ATO reasonable thresholds: flag for additional withholding `[Assumption: Phase 2 flags but does not enforce — admin decision]`

**Linked Functional Requirements**: FR-2.50 to FR-2.62

---

### User Story 7 — Employee Groups & Cost Centre Mapping (Priority: P2)

Larger businesses divide employees into groups (R&D, G&A, Customer Service, Sales, etc.) for cost centre tracking, separate GL account mapping, and grouped reporting. The CEO wants P&L by department; the bookkeeper wants different wages-expense accounts per department.

**Why this priority**: Without groups, all wages post to a single Wages Expense account, making departmental P&L impossible. This is essential for any business with >20 employees but unnecessary for solo operators. Hence P2.

**Independent Test**: Create R&D and G&A groups, assign 5 employees to each, configure separate wages-expense GL accounts per group, run a pay run, and verify the auto-posted JE has correctly partitioned wages-expense debits by group.

**Acceptance Scenarios**:

1. **Given** a workspace, **When** the admin navigates to Settings → Payroll → Employee Groups, **Then** they see a CRUD list with: name, code, description, default wages-expense GL account, default super-expense GL account, default tracking category (links to existing tracking categories from 008-JCT or general).

2. **Given** groups exist, **When** the admin views an employee, **Then** they can assign the employee to one group (single-select). Group assignment is effective-dated (US14).

3. **Given** an employee is in the R&D group with R&D Wages Expense GL configured, **When** their pay run line is finalised, **Then** the auto-posted JE debits R&D Wages Expense (not the default Wages Expense) for that employee's gross pay, and similarly for super.

4. **Given** an employee's pay template has a line-level GL override (US6), **When** finalising, **Then** the line override takes precedence over the group default, which takes precedence over the workspace default.

5. **Given** the admin runs the Payroll Activity report, **When** they choose "Group by Employee Group", **Then** the report shows per-group totals for gross, PAYG, super, net, with drill-down to per-employee per-pay-run.

6. **Given** an employee changes groups mid-financial-year, **When** the change effective date is reached, **Then** subsequent pay runs use the new group's GL accounts; prior pay runs are unchanged.

**Edge Cases**:
- Employee not assigned to any group: defaults to workspace-level wages expense GL
- Group with no employees: persists, displays "0 employees" in list
- Group deletion blocked if any employees are currently assigned

**Linked Functional Requirements**: FR-2.63 to FR-2.68

---

### User Story 8 — STP Phase 2 Reporting (Pay Events, Update Events, Full File Replacement) (Priority: P1)

Every finalised pay run must produce an STP Phase 2 event submitted to the ATO via an integration gateway. Errors must be visible and correctable, prior submissions must be amendable, and EOY finalisation must replace prior payment summaries.

**Why this priority**: STP is mandatory. Without it, employers cannot use Ledgerly as a compliant payroll system — they would need a separate STP-capable tool. The Phase 1 spec includes US9 STP Reporting at P2; Phase 2 promotes this to P1 because by the time Phase 2 ships, STP is the *primary* compliance integration.

**Independent Test**: Finalise a pay run with 5 employees including one with overtime, one with salary sacrifice, one with a car allowance, and one with HELP — verify the STP Phase 2 payload contains correctly disaggregated fields per employee per the ATO Business Implementation Guide, and the gateway returns acceptance.

**Acceptance Scenarios**:

1. **Given** a pay run is finalised, **When** the STP submission is constructed, **Then** the payload includes per-employee fields per STP Phase 2 spec: Pay/Update Event indicator, Payer details (ABN, BMS ID, BMS Vendor ID), Payee TFN, Payee name, address, DOB, employment basis code (full-time / part-time / casual / labour hire / volunteer agreement / death beneficiary / non-employee), tax treatment code (6-character: claim type + STSL + Medicare reduction + Medicare exemption + Medicare surcharge + tax-free threshold), income type (SAW / CHP / IAA / WHM / SWP / FEI / JPD / VOL / LAB / OSP), country code (for foreign income types), period start, period end, payment date, gross (disaggregated: salary/wages, paid leave by category, allowances by type, overtime, bonuses & commissions, directors fees, CDEP), salary sacrifice (super / other), deductions (union / workplace giving / child support / other), PAYG, super liability (SG, RESC, salary sacrifice), and lump sums (A/B/D/E/W).

2. **Given** an employee has a HELP debt, **When** the STP payload is built, **Then** the tax treatment code includes the STSL component (e.g., position 2 = "S") and the calculated PAYG includes the HELP repayment amount.

3. **Given** a salary-sacrifice-to-super line, **When** the STP payload is built, **Then** the salary sacrifice amount appears in the salary sacrifice "S" sub-element and the gross is the post-sacrifice gross (not the pre-sacrifice).

4. **Given** a finalised pay run, **When** the STP submission is queued, **Then** an `STPSubmission` record is created with status `pending` and processed asynchronously (decoupled from pay run finalisation per FR-047 from Phase 1).

5. **Given** a queued STP submission, **When** the integration gateway accepts it, **Then** the submission status updates to `accepted`, the gateway-returned message ID is stored, and the pay run displays "STP filed" in the UI.

6. **Given** the gateway returns errors (validation failures, ATO rejection), **When** the response is received, **Then** the submission status updates to `rejected`, error details are stored per-employee where possible, and the user is alerted with a "Fix STP errors" call-to-action listing each error and the affected employee.

7. **Given** an STP submission has errors, **When** the user fixes the underlying data (e.g., wrong tax treatment code) and clicks "Resubmit", **Then** an Update Event is constructed and submitted (not a full Pay Event), referencing the original submission ID.

8. **Given** an admin discovers an error in a previously-accepted Pay Event (e.g., wrong gross for one employee), **When** they create a corrected Update Event from the pay run page, **Then** the Update Event submits the corrected per-employee data and the original Pay Event is marked "amended". The corrected YTD figures replace the prior YTD figures for that employee.

9. **Given** a major data corruption requires a clean reset, **When** the admin chooses "Full File Replacement" for a financial year, **Then** the system constructs a payload with all employees' YTD figures as of the most recent pay event, flagged as a Full File Replacement; the ATO uses this to overwrite all prior submissions for the year.

10. **Given** an STP submission cannot reach the gateway (network error), **When** the system detects the failure, **Then** the submission is automatically retried with exponential backoff (1 min, 5 min, 30 min, 2 hours, 12 hours, 24 hours), then alerts the admin if all retries fail.

11. **Given** a STP filing history view, **When** the admin navigates to Payroll → STP Filings, **Then** they see a list of all submissions ordered by submission date with: pay run reference, submission date, type (Pay Event / Update / Finalisation / Full File Replacement), status (pending / submitted / accepted / rejected / amended), employees count, total gross, gateway message ID, and a "view payload" action for debugging.

12. **Given** a workspace has not yet authorised an STP gateway connection, **When** they attempt to finalise a pay run, **Then** the pay run finalises (per FR-047 — STP is decoupled), but the STP submission status displays "no gateway configured" with a setup wizard link.

**Edge Cases**:
- Employee with no TFN: STP requires the placeholder "000000000" — verified by gateway pre-validation
- Foreign resident on a working holiday visa (income type WHM): tax treatment code differs, special tax rates
- Termination pay submitted in a Pay Event must include cessation reason code (US11)
- Update Event for a prior financial year: separate handling, may require Full File Replacement

**Linked Functional Requirements**: FR-2.69 to FR-2.85

---

### User Story 9 — Super Funds Register & Stapled Fund Handling (Priority: P1)

The workspace needs a registry of super funds employees pay into. Employees may nominate their own fund, or default to the workspace's nominated default fund, or — for new employees who don't nominate — be paid into their existing "stapled" fund as identified by the ATO.

**Why this priority**: The Super Choice rules and Stapled Super legislation (in effect since November 2021) require employers to follow specific steps when an employee starts. Without a fund register and stapled fund handling, the workspace cannot legally pay super for new employees who haven't nominated a fund.

**Independent Test**: Add a new APRA fund, an SMSF, and a default workspace fund. Create three employees: one with a nominated fund, one with no nomination (stapled), one new starter — verify each routes super to the correct destination.

**Acceptance Scenarios**:

1. **Given** the workspace, **When** the admin navigates to Settings → Payroll → Super Funds, **Then** they see two sections: APRA-regulated funds (with USI, ABN, fund name, address) and Self-Managed Super Funds (SMSFs — with ABN, fund name, ESA — Electronic Service Address, BSB and account for direct deposit).

2. **Given** the admin adds an APRA fund, **When** they enter the USI, **Then** the system validates the USI format and `[Assumption: in Phase 2, USI validation is format-only — full USI lookup against the ATO Fund Validation Service is deferred]` retrieves and stores the fund's name and ABN if recognised in the seeded fund list.

3. **Given** the admin adds an SMSF, **When** they enter ABN, fund name, ESA, BSB, account number, and account name, **Then** the system stores these and validates ABN format.

4. **Given** the workspace nominates a default fund (chosen from registered APRA funds), **When** an employee is added without a nominated fund, **Then** the workspace default applies for super payment routing.

5. **Given** a new employee is added, **When** they have no nominated fund, **Then** the employee record displays a "Request Stapled Fund" action that — when clicked — `[Assumption: in Phase 2, stapled fund request stores the request with a manual completion field; the actual ATO Stapled Super Fund API call is deferred to Phase 3]` records the request, displays guidance for the admin to query the ATO portal manually, and stores the returned stapled fund details.

6. **Given** an employee has a salary-sacrifice-to-super arrangement, **When** the pay run is processed, **Then** the salary sacrifice amount is paid to the same fund as the SG amount (not a separate fund) unless the employee has nominated a separate sacrifice fund.

7. **Given** an employee changes super funds mid-year, **When** the admin updates the employee's fund, **Then** the change is effective-dated; super calculated for pay runs with `period_start < effective_date` continues to be paid to the prior fund (already remitted), and pay runs after the change route to the new fund.

8. **Given** a super fund is associated with active employees, **When** the admin attempts to delete the fund, **Then** the deletion is blocked. The admin must reassign affected employees first.

**Edge Cases**:
- Employee with multiple funds (rare — e.g., split contributions): not supported in Phase 2 — flag as known limitation
- SMSF requires ESA for SuperStream messages (Phase 3 integration) — captured but not validated in Phase 2
- Employer's default fund must be a MySuper-authorised product

**Linked Functional Requirements**: FR-2.86 to FR-2.94

---

### User Story 10 — Super Payment Batches & Payday Super Remittance (Priority: P1)

From 1 July 2026, employers must pay super within 7 days of each payday (Payday Super). Phase 1 calculates the super liability per pay run and posts the journal entry; Phase 2 must aggregate that liability into a remittance batch, allow it to be authorised, marked as paid, and reconciled.

**Why this priority**: Payday Super is a hard regulatory deadline — non-compliance triggers Super Guarantee Charge (interest + penalties). Phase 2 must ship before or near 1 July 2026 with a working remittance flow.

**Independent Test**: Finalise three pay runs over a fortnight. Generate a super payment batch — verify it includes super liability from all three pay runs, grouped by fund, with payment due dates per Payday Super (7 days from each payday). Authorise the batch, mark as paid, and verify reconciliation against the Superannuation Payable account clears the liability.

**Acceptance Scenarios**:

1. **Given** finalised pay runs with super liability, **When** the admin navigates to Payroll → Super Payments, **Then** they see two views: "Pending Super" (super accrued but not yet batched, grouped by fund and aggregated across pay runs) and "Payment Batches" (history of created batches with status).

2. **Given** the Pending Super view, **When** displayed, **Then** each fund shows: total super owed, breakdown by employee, breakdown by pay run, earliest payment-due date (calculated as payment_date + 7 days for Payday Super), and a payment-due indicator (green = >3 days, amber = ≤3 days, red = overdue).

3. **Given** the admin creates a payment batch, **When** they select pay runs to include (or "all pending"), **Then** the system creates a `SuperPaymentBatch` record with: batch date, batch reference (auto-generated), included pay runs, per-fund per-employee breakdown, total amount.

4. **Given** a created batch with status `draft`, **When** the admin reviews and clicks "Authorise", **Then** the batch status becomes `authorised`, the user and timestamp are recorded, and the batch is ready for submission.

5. **Given** an authorised batch, **When** the admin clicks "Submit to Clearing House" `[Assumption: in Phase 2, this captures the intent and produces a payment file (CSV or simple SuperStream-compatible format) for manual upload to the workspace's clearing house. Full SuperStream API submission is deferred to Phase 3]`, **Then** a downloadable file is generated, the batch status becomes `submitted`, and a manual "Mark as Paid" action becomes available for when the funds clear.

6. **Given** a submitted batch, **When** the admin marks it "Paid" with the payment date and bank reference, **Then** the batch status becomes `paid`, an automatic JE is posted (debit Superannuation Payable, credit Bank — clearing the liability for the included super amounts), and the bank transaction can be reconciled against this payment.

7. **Given** a batch is partially paid (e.g., one fund rejects), **When** the admin records the partial payment, **Then** the rejected portion remains as outstanding liability and can be re-batched with a corrected reference.

8. **Given** Payday Super is in force, **When** super for a pay run is older than 7 days from payment date and not yet batched, **Then** an alert is raised on the Payroll dashboard and an in-app notification is sent to the admin.

9. **Given** the Super Payments list, **When** displayed, **Then** the admin sees columns matching Xero's Super Payments screen: Batch Date, Reference, Number of Funds, Number of Employees, Total Amount, Status, Payment Method, Date Paid, Action.

10. **Given** an SMSF with direct deposit (BSB + account), **When** a super payment batch includes the SMSF, **Then** the generated payment file includes the SMSF's bank details for direct deposit.

**Edge Cases**:
- Salary sacrifice and SG paid in the same batch — itemised separately for STP reporting
- Employee leaves mid-period — final super payment batched per Payday Super
- Voiding a batch: only allowed in `draft` status; once `authorised`, requires reversal

**Linked Functional Requirements**: FR-2.95 to FR-2.105

---

### User Story 11 — Termination & Final Pay (ETP, Cessation Reasons) (Priority: P1)

When an employee leaves, their final pay must include unused annual leave (paid out at ordinary rate, possibly with leave loading), unused long service leave (if accrued and over the qualifying period), and — for redundancies, golden handshakes, etc. — an Employment Termination Payment (ETP) with specific tax treatment. STP requires a cessation reason code on the termination event.

**Why this priority**: Phase 1 supports basic termination (mark inactive with cessation date and reason) but does not calculate final pay correctly. Without this, terminations produce incorrect pays and incorrect ATO reporting — both serious compliance gaps.

**Independent Test**: Terminate three employees: (1) voluntary resignation with 80 hours unused annual leave, (2) redundancy with $30,000 ex-gratia payment, (3) deceased employee — verify each produces correct final pay, ETP calculation where applicable, and STP cessation event with the right code.

**Acceptance Scenarios**:

1. **Given** an employee is being terminated, **When** the admin clicks "Terminate" on the employee detail page, **Then** they see a multi-step wizard: Step 1 — Cessation details (cessation date, cessation reason code per STP: V (voluntary), I (ill health), D (deceased), R (redundancy), F (dismissal), C (contract ended), T (transfer), N (non-genuine redundancy)); Step 2 — Final pay components (unused annual leave hours, unused LSL hours pre-1978/1978-1993/post-1993 splits, ETP amount with category, ex-gratia amounts); Step 3 — Review and create final pay run.

2. **Given** the cessation date is set, **When** the wizard displays, **Then** unused annual leave hours are pre-filled from the employee's current balance and unused LSL is pre-filled from the LSL balance.

3. **Given** unused annual leave is paid out, **When** the final pay run is calculated, **Then** the leave is paid at the employee's ordinary rate, leave loading (17.5%) is applied if `leave_loading_applies` is true, PAYG is calculated using the special "marginal rate" method (Schedule 7 lump-sum-on-termination calculation, NOT the standard tax tables), and the amount is reported via STP under "Lump Sum A — Annual Leave on Termination".

4. **Given** unused LSL is paid out, **When** calculated, **Then** the system splits LSL into pre-16-Aug-1978, 16-Aug-1978-to-17-Aug-1993, and post-17-Aug-1993 portions `[Assumption: split based on employee start date and continuous service — splits captured but admin can override]`, and applies the appropriate tax rates per ATO Schedule 7 (5% concessional rate for pre-1978, marginal for the rest).

5. **Given** an ETP is included (e.g., redundancy ex-gratia), **When** the admin specifies the ETP amount and category (Type O = standard ETP / Type R = bona fide redundancy / Type T = transitional), **Then** the system calculates the tax-free component for genuine redundancy (`base_amount + per_year_amount × completed_years_service` for the relevant financial year, e.g., $12,524 + $6,264 per year for 2025-26 `[Assumption: thresholds maintained as workspace-configurable reference data per FR]`), withholds tax on the taxable portion at the ETP cap rates, and reports via STP under the ETP element with the correct code.

6. **Given** the ETP exceeds the ETP cap ($245,000 for 2025-26 `[Assumption: cap maintained as workspace-configurable reference data]`), **When** PAYG is calculated, **Then** the excess above the cap is taxed at the top marginal rate; below the cap, ETP-cap rates apply (32% if under preservation age, 17% if at or above preservation age — both include Medicare).

7. **Given** the employee is deceased (cessation reason D), **When** the final pay is calculated, **Then** PAYG is not withheld on the death benefit ETP component (per ATO rules — death benefit ETPs have separate withholding rules paid to dependants/estate), the recipient is captured (estate or dependant), and the STP cessation event uses the death code.

8. **Given** the final pay run is finalised, **When** the auto-posted JE is created, **Then** it follows the same pattern as a normal pay run with additional credit lines for the leave provisions being cleared (debit Annual Leave Provision, credit Net Wages Payable for the leave-payout portion, isolating the provision-clearance from ordinary wages expense).

9. **Given** the final pay run has STP submitted, **When** the cessation event is sent, **Then** it includes the cessation date, cessation reason code, and the YTD figures for the employee (which become final for the financial year unless amended).

10. **Given** an employee is terminated and later rehired (rare), **When** the admin re-activates them, **Then** a confirmation prompt warns about ATO implications, and the employee record is reactivated with a new "rehire date" captured separately from the original `start_date` for service-period calculation.

**Edge Cases**:
- Termination with no annual leave balance: skip the leave-payout calculation but still file cessation STP
- Notice paid in lieu: treated as ordinary earnings (not ETP) — flag in wizard
- Genuine redundancy under preservation age: tax-free threshold is generous
- Garden leave: continue normal pay until cessation date, no ETP

**Linked Functional Requirements**: FR-2.106 to FR-2.118

---

### User Story 12 — Deductions, Garnishments & Protected Earnings (Priority: P2)

Beyond standard payroll deductions (union fees, salary sacrifice), employers must process court-ordered garnishments (child support via Services Australia, bankruptcy trustee orders, creditor orders). These have specific rules: a Protected Earnings Amount (PEA) below which earnings cannot be garnished, separate remittance to the garnishment authority, and STP reporting under the deductions element.

**Why this priority**: Without garnishment handling, employers receiving Services Australia child support notices (Section 72A garnishments) cannot comply correctly within Ledgerly — they would need a workaround. P2 because the volume is moderate and most small businesses can defer; but mandatory before any business-with-payroll customer scales.

**Independent Test**: Configure a child support garnishment of $300/fortnight with PEA of $400/week for an employee earning $1,500/fortnight. Verify the garnishment deducts $300, after-PEA earnings remain at least $800/fortnight, the garnishment routes to a separate Services Australia payable account, and STP reports it as a deduction.

**Acceptance Scenarios**:

1. **Given** an employee, **When** the admin navigates to the employee's Deductions tab, **Then** they see the recurring deductions from the pay template (US6) and a separate "Garnishments" section.

2. **Given** the admin adds a garnishment, **When** they enter: garnishment type (child support / bankruptcy / court order / creditor / other), payee details (Services Australia / trustee / court / creditor — name, ABN/reference, BSB and account if separate remittance), amount or formula (fixed amount per period, percentage of net pay, or "to the cap"), Protected Earnings Amount (PEA — if applicable), start date, end date (optional), and reference number, **Then** the garnishment is saved and applies to subsequent pay runs.

3. **Given** an employee has a $300/fortnight child support garnishment with PEA $400/week (i.e. $800/fortnight), **When** the pay run calculates and gross less PAYG less other deductions = $1,200, **Then** the garnishment deducts the full $300 (because $1,200 - $300 = $900, which is above the $800 PEA).

4. **Given** the same employee earns only $1,000 net before garnishment, **When** the garnishment would breach PEA ($1,000 - $300 = $700 < $800 PEA), **Then** the garnishment is reduced to $200 (the maximum that keeps net at PEA), the unpaid $100 is recorded as a "garnishment shortfall" carried forward to the next pay run, and the admin is alerted.

5. **Given** a finalised pay run with garnishments, **When** the auto-posted JE is created, **Then** garnishments credit a separate "Garnishments Payable — [authority]" liability account (one per garnishment authority) rather than Net Wages Payable, allowing separate remittance reconciliation.

6. **Given** a pay run with garnishments, **When** the STP payload is built, **Then** garnishments are included in the deductions element with the appropriate STP deduction type code (G = child support garnishment, P = child support deduction, etc.).

7. **Given** the admin pays the garnishment authority, **When** they record the payment, **Then** it clears the corresponding Garnishments Payable account (debit Garnishments Payable, credit Bank).

8. **Given** a garnishment with an end date or capped total, **When** the cap is reached or end date passes, **Then** subsequent pay runs do not include the garnishment, and the admin is notified that the garnishment has ended.

**Edge Cases**:
- Multiple garnishments on one employee: priority order matters (child support typically first by law)
- Bankruptcy trustee garnishment: usually 100% of "income beyond threshold" — trustee defines threshold
- Workplace giving deductions: pre-tax for income tax purposes — different from standard deductions

**Linked Functional Requirements**: FR-2.119 to FR-2.126

---

### User Story 13 — End of Year (Income Statements, Finalisation, Year Rollover) (Priority: P1)

At end of financial year, the employer must submit STP finalisation events declaring each employee's YTD figures are complete. This replaces the pre-2018 PAYG payment summaries — employees retrieve their "income statement" via myGov rather than receiving a paper summary. The new financial year requires updated tax tables and reset YTD counters.

**Why this priority**: EOY is a once-a-year hard deadline (14 July). Without correct finalisation, employees cannot lodge their tax returns and the employer is non-compliant. The year rollover (refresh tax tables, reset accruals) is required for any pay run after 1 July.

**Independent Test**: At the end of FY2025-26, finalise STP for all employees, verify each employee receives a finalisation event, no further submissions can be made for the year without unfinalising first, and the new year's tax tables apply from 1 July onward.

**Acceptance Scenarios**:

1. **Given** the financial year is approaching its end (e.g., June), **When** the admin navigates to Payroll → End of Year, **Then** they see a checklist: review YTD figures per employee, ensure all pay runs for the year are finalised, ensure all STP submissions are accepted, finalise STP, lock the financial year.

2. **Given** the admin reviews YTD figures, **When** the EOY page renders, **Then** a per-employee table shows: gross, allowances, deductions, PAYG, super (SG, RESC, salary sacrifice), termination payments, lump sums — sourced from the sum of all finalised pay run lines for the financial year. Discrepancies (e.g., un-submitted STP) are flagged.

3. **Given** all data is correct, **When** the admin clicks "Finalise STP for FY2025-26", **Then** the system constructs an STP Finalisation Event per employee containing the YTD figures, submits via the gateway, and on acceptance marks each employee's STP for the year as "finalised".

4. **Given** an employee's STP is finalised, **When** an employee logs into myGov and views their income statement, **Then** the status shows "Tax ready" `[Assumption: this is the ATO's ATO behaviour — no Ledgerly action required, just informational for the spec]`.

5. **Given** an admin discovers an error after finalisation, **When** they need to amend, **Then** they can submit an STP Amendment Event for the affected employee with corrected YTD figures (Update Event for that financial year). The income statement updates accordingly.

6. **Given** the new financial year begins, **When** any pay run with `payment_date >= 1 July` is created, **Then** the system uses the new year's PAYG tax table coefficients (refreshed annually — admin can manually trigger refresh from Settings → Payroll → Tax Tables), the new year's super contribution maximum base, the new year's ETP cap, and the new year's HELP repayment thresholds.

7. **Given** the new year begins, **When** any employee is viewed, **Then** YTD-taken counters for leave reset to zero (annual leave balance carries forward; "leave taken this FY" resets), and YTD earnings counters reset.

8. **Given** an admin needs to lock a financial year (preventing further pay runs in that year), **When** they click "Lock FY2025-26", **Then** all pay runs in the year become read-only (already are once finalised, but the year-lock prevents creation of new pay runs with `period_end <= 30 June` of that year), with admin override available with documented justification.

9. **Given** a year-end report, **When** the admin generates "Payroll EOY Summary", **Then** they see total wages, total PAYG, total super, total terminations, employee count, headcount, average salary — all per the financial year, exportable to CSV/PDF.

**Edge Cases**:
- Employee terminated mid-year: their STP cessation event already finalises their data — EOY finalisation re-confirms
- Foreign employees / WHM income type: separate finalisation flow but same mechanism
- Tax table changes mid-year (rare but possible — e.g., LMITO removal): apply from a published effective date

**Linked Functional Requirements**: FR-2.127 to FR-2.137

---

### User Story 14 — Payslips (PDF, Email, Re-issue, Employee View) (Priority: P1)

Every employee receives a payslip per pay run within 1 working day of payment, per Fair Work Act s536. The payslip must contain prescribed minimum content. Phase 1 stubs the concept; Phase 2 makes it real.

**Why this priority**: Legal obligation. Cannot ship Phase 2 without compliant payslips.

**Independent Test**: Finalise a pay run for 5 employees with mixed earnings (salary, hourly, allowances, leave taken, deductions). Generate payslips, email them, verify each contains all Fair Work-required fields and amounts match the pay run line.

**Acceptance Scenarios**:

1. **Given** a pay run is finalised, **When** the system generates payslips, **Then** each payslip includes (per Fair Work Act s536 / Fair Work Regulations 2009 r3.46): employer's name, employer's ABN, employee's name, payment date, pay period start and end, gross amount, net amount, breakdown of pay components (ordinary hours and rate, overtime hours and rate, allowances, bonuses, leave taken, etc.), all deductions (name, amount, account/payee where applicable), tax withheld, superannuation contribution (amount, fund name), and YTD totals for gross, tax, and super.

2. **Given** the payslip is generated as PDF, **When** rendered, **Then** it uses a clean professional template with the workspace's logo (configurable in Settings), employer contact details, and an "if you have a query, contact..." footer.

3. **Given** the admin views a finalised pay run, **When** they click "Generate Payslips", **Then** PDFs are generated for all employees in the pay run. They can download individual payslips, download all as a combined PDF, or download a ZIP of individual files.

4. **Given** the workspace has email configured (023-EML), **When** the admin clicks "Email Payslips", **Then** each employee with an email address receives a transactional email with their payslip attached as PDF and a brief notification text. Employees without email addresses are listed for manual handling.

5. **Given** the employee has portal access (US15), **When** the pay run finalises, **Then** the payslip is automatically published to their portal view (per the existing employee-portal-spec.md), and they receive a portal notification.

6. **Given** an admin discovers a payslip error (e.g., wrong template, typo in employer name), **When** they update the template and click "Re-issue Payslips", **Then** new PDFs are generated and the prior PDFs are marked superseded (audit trail).

7. **Given** a pay run that was reversed/voided (rare but possible via correction), **When** the original payslip exists, **Then** it is marked "VOID — superseded by [new pay run]" and a corrected payslip is issued.

8. **Given** a payslip is generated, **When** retrieved later from the employee record's "Pay History" tab, **Then** the same PDF is returned (deterministic — no regeneration with current data) so the historical record is preserved exactly.

9. **Given** the workspace settings include payslip preferences, **When** the admin configures: show YTD section yes/no, show leave balances yes/no, show employer's super expense yes/no, custom footer text, **Then** these preferences apply to all subsequently generated payslips.

**Edge Cases**:
- Employee with multiple deductions of the same type (e.g., two child support deductions): each listed separately
- Employee paid via multiple bank accounts (split): each account listed with split percentage and amount
- Year-end payslip (final pay of FY): include EOY-specific summary block

**Linked Functional Requirements**: FR-2.138 to FR-2.147

---

### User Story 15 — Employee Self-Service Portal Extensions (Priority: P1)

The employee portal (specced separately in `employee-portal-spec.md`) must be extended in Phase 2 to support: leave request submission and history, timesheet submission and history, profile updates with admin approval for sensitive fields, and document acknowledgements (e.g., terms of employment, policies).

**Why this priority**: The base portal (view payslips) is from `employee-portal-spec.md`. Without leave and timesheet self-service, employees still need to email/call admin for every leave or timesheet — defeating the purpose of self-service.

**Independent Test**: As an employee with portal access, submit a leave request, submit a timesheet, update phone number (auto-applied), update bank details (admin approval required), and verify each flow ends in the correct state.

**Acceptance Scenarios**:

1. **Given** an employee with portal access, **When** they log in, **Then** they see an extended portal navigation: Dashboard, Payslips (existing), Leave (new — balances, requests, submit new), Timesheets (new — list, submit new, edit drafts), Profile (new — view and update personal details), Documents (new — view payslip history, terms of employment, policies).

2. **Given** the Leave page, **When** displayed, **Then** the employee sees: current balances per leave type (annual, personal, LSL, etc.), upcoming approved leave (calendar view), pending requests, leave history (taken in current and prior FYs), and a "Request Leave" button (US2).

3. **Given** the Timesheets page, **When** displayed, **Then** the employee sees: current pay period timesheet (in progress or unsubmitted), submitted timesheets pending approval, approved timesheets in upcoming pay runs, and historical timesheets — each shows total hours and pay run reference (US4).

4. **Given** the Profile page, **When** the employee views, **Then** they see editable fields (auto-applied): phone number, address, emergency contact, communication preferences. Sensitive fields are read-only with a "Request Change" action: bank details, super fund nomination, name (legal name change), date of birth, TFN — these create change requests requiring admin approval.

5. **Given** an employee submits a sensitive change request (e.g., new bank details), **When** the request is created, **Then** the admin is notified, the change is held in "pending" state, and the change is applied only after admin approves. The audit log captures the request, approver, and effective date.

6. **Given** an employee uploads supporting documents (e.g., new TFN declaration after their TFN changes), **When** uploaded, **Then** the document attaches to the change request and is stored against the employee record (using existing 012-ATT attachment infrastructure).

7. **Given** an employee has the same email used in multiple workspaces (e.g., works for two Ledgerly customers), **When** they log in, **Then** they can switch between portal contexts via the existing workspace switcher, seeing each employer's portal independently.

8. **Given** a workspace uses document acknowledgements (e.g., updated employee handbook), **When** a new document is published with "requires acknowledgement", **Then** employees see a notification on next login, must view the document, and tick "I acknowledge" before continuing — recorded with timestamp.

**Edge Cases**:
- Employee on long-term leave with portal access: still receives notifications, still can submit leave requests for return-from-leave
- Terminated employee: portal access auto-revoked per `employee-portal-spec.md` FR-026
- Locked-out employee (forgot password): standard auth recovery flow applies

**Linked Functional Requirements**: FR-2.148 to FR-2.156

---

### User Story 16 — Employee Onboarding (Self-Onboard, Bulk Import, Admin Entry) (Priority: P2)

Three pathways to add employees: (1) admin manually enters everything, (2) admin invites employee to self-onboard via a secure link (employee fills TFN, bank, super, emergency contact themselves), (3) admin bulk-imports from CSV with validation. Phase 1 supports admin entry as a stub; Phase 2 makes it complete and adds the other two paths.

**Why this priority**: Onboarding drives adoption — if adding 20 employees takes 4 hours of admin entry, customers won't migrate from their current payroll. Self-onboard and bulk import remove that barrier. P2 because admin entry alone (Phase 1) works for very small businesses.

**Independent Test**: Send a self-onboard invite to an employee — verify the employee can complete all required fields, the data flows back into the employee record awaiting admin approval, and admin approval activates the employee. Separately, upload a CSV with 10 employees and verify dry-run preview catches errors before commit.

**Acceptance Scenarios**:

1. **Given** the admin clicks "Add Employee", **When** they choose entry method, **Then** they see three options: "I'll enter everything", "Send self-onboard invite to employee", "Bulk import from CSV".

2. **Given** the admin chooses "Send self-onboard invite", **When** they enter just the employee's name and email, **Then** an onboarding invitation is created with a secure token, an email is sent to the employee with a magic link, and the employee record is created with status `invited_onboarding`.

3. **Given** the employee clicks the link, **When** the onboarding form loads, **Then** they see a multi-step form: Step 1 — Personal (name, DOB, address, phone, emergency contact), Step 2 — Tax (TFN, residency, tax-free threshold claim, HELP/HECS, Medicare variations), Step 3 — Bank (BSB, account number — with optional split for multiple accounts), Step 4 — Super (choice: nominate fund / use employer default / request stapled fund lookup), Step 5 — Acknowledgements (terms, privacy notice).

4. **Given** the employee submits the onboarding form, **When** complete, **Then** the employee record is updated with their entries, status changes to `onboarding_pending_admin_review`, and the admin is notified.

5. **Given** the admin reviews the pending onboarding, **When** they approve, **Then** the employee status becomes `active`, they are eligible for inclusion in pay runs, and a welcome email is sent.

6. **Given** the admin chooses "Bulk import from CSV", **When** they download the template, **Then** they receive a CSV with all required and optional columns labelled with a sample row, plus a help sheet explaining valid values for each column (especially employment_type, tax_treatment_code, work_state, pay_basis, super_fund_usi).

7. **Given** the admin uploads a populated CSV, **When** they click "Validate (Dry Run)", **Then** the system parses every row, validates each field, checks for duplicates within the CSV and against existing employees, and shows a preview: green rows ready to import, amber rows with warnings (e.g., missing optional fields), red rows with blocking errors. No import occurs until the admin clicks "Commit".

8. **Given** the dry run shows errors, **When** the admin downloads the error report, **Then** they receive a CSV showing the original rows with an "errors" column explaining what's wrong per row.

9. **Given** the admin commits the import, **When** the import runs, **Then** valid rows create employee records (set to `active` status), invalid rows are skipped, and the result page shows a summary: created N, skipped M, with downloadable lists.

10. **Given** an employee's TFN is provided during onboarding, **When** stored, **Then** it is encrypted at rest (per Privacy Act / TFN Rule 2015), never displayed in full in the UI (masked as `XXX XXX 123`), and excluded from any API response that does not have an explicit unmask permission.

**Edge Cases**:
- Self-onboard token expiry: 14 days, can be regenerated by admin
- Partial onboarding: employee saves progress, returns to complete later
- Bulk import of an employee who already exists by email: skip with "already exists" warning

**Linked Functional Requirements**: FR-2.157 to FR-2.168

---

### User Story 17 — Payroll Reports (Activity, Leave, Super, Remuneration, Timesheet) (Priority: P1)

A standard suite of payroll reports, each filterable by date range, employee, employee group, and exportable to PDF and CSV. These are the reports an accountant or business owner expects to find in any payroll system.

**Why this priority**: Without reports, an accountant cannot reconcile payroll, prepare BAS, audit super liability, or analyse labour cost. Reports are how the system delivers visibility.

**Independent Test**: With a quarter of pay runs in the system, generate each of the five reports and verify totals tie to the underlying pay run lines, journal entries, and STP submissions.

**Acceptance Scenarios**:

1. **Given** the admin navigates to Payroll → Reports, **When** the page loads, **Then** they see report cards for: Payroll Activity Summary, Pay Run History, Leave Transactions, Super Accrual, Employee Remuneration, Payment Summary Details (per employee YTD), Timesheet Summary.

2. **Given** the Payroll Activity Summary, **When** the admin selects date range and (optional) employee group filter, **Then** they see a table with columns: Employee, Gross, Allowances, Deductions, PAYG, Super, Net, with a totals row. Drill into employee shows per-pay-run breakdown.

3. **Given** the Pay Run History, **When** displayed, **Then** the admin sees a list of pay runs matching Xero's screen format: Frequency (weekly/fortnightly/monthly), Period (start - end), Payment Date, Wages, Tax, Super, Net Pay, STP Filing Status (filed / not filed / failed), Action (view).

4. **Given** the Leave Transactions report, **When** filtered by employee and date range, **Then** the admin sees per-leave-type movements: Opening Balance, Accrued, Taken, Cashed Out, Adjustments, Closing Balance, with drill-down to individual transactions.

5. **Given** the Super Accrual Report, **When** generated for a date range, **Then** the admin sees: total super accrued, super paid (via batches), outstanding super liability, breakdown by fund and by employee. This must reconcile with the Superannuation Payable account balance.

6. **Given** the Employee Remuneration Report (sensitive — admin/HR-role only), **When** generated, **Then** the admin sees per-employee: annualised salary or hourly rate, leave loading, pay history, total cost (gross + super + leave provisions). Used for internal review, not external sharing.

7. **Given** the Payment Summary Details (per-employee YTD report), **When** generated for a financial year, **Then** for each employee the admin sees the aggregated YTD figures matching the STP-finalised data: gross by category, allowances by type, deductions by type, PAYG, super, lump sums, ETP — exactly mirroring what appears on the employee's myGov income statement.

8. **Given** the Timesheet Summary report, **When** generated for a date range, **Then** the admin sees per-employee total hours by earnings type (ordinary / overtime / public holiday / leave taken), per-job breakdown if jobs are tagged (008-JCT integration), and total cost per job/employee.

9. **Given** any report, **When** the admin clicks "Export", **Then** they can choose PDF (formatted) or CSV (raw data). PDF includes the workspace logo and report parameters in the header.

10. **Given** any report, **When** the user has limited role (e.g., bookkeeper without HR-sensitive access), **Then** the Employee Remuneration Report is hidden, and other reports may show summarised rather than per-employee data based on role permissions.

**Edge Cases**:
- Reports across financial years: include year-end markers, may require multiple super-rate periods
- Reports for terminated employees: include them up to cessation date
- Reports with no data: show empty state with a helpful "no pay runs in this period" message

**Linked Functional Requirements**: FR-2.169 to FR-2.180

---

### Edge Cases (Cross-Story)

- **Employee with no email address**: cannot use self-onboard or portal (US15, US16); admin must enter all data manually and distribute payslips outside the system
- **Pay run finalisation triggers many downstream events** (STP, super batch eligibility, payslip generation, leave balance updates, JE post): all must be transactional or eventually-consistent — failure in one (e.g., STP gateway) must not invalidate others (per Phase 1 FR-047)
- **Tax table refresh mid-year** (e.g., emergency budget changes): admin can manually trigger refresh; pay runs already finalised are not re-calculated
- **Time zone handling**: payment date is a date (not datetime); period boundaries are local-workspace-time
- **Privacy & TFN exposure**: TFN never appears in any UI in full, never in any API response without explicit `tfn.view` permission, never in any export, and is encrypted at rest
- **GDPR-style "right to be forgotten" requests**: blocked for terminated employees retained for 7 years per Australian record-keeping requirements (Fair Work Act s536C, Tax Administration Act); document this in privacy notices
- **Employee in multiple workspaces (e.g., works for two Ledgerly customers)**: each workspace has its own employee record; the same `user_id` can link to both. STP is per-workspace per ABN
- **Workspace changes its ABN mid-year** (rare): treated as a new entity for STP purposes — Full File Replacement under new ABN, finalisation under old ABN
- **Bulk operations** (bulk-invite, bulk-import, bulk-approve): must be idempotent and provide clear success/failure summaries
- **Leave taken across pay periods** (e.g., 4-week holiday spanning 3 fortnights): the leave is split across the affected pay runs proportionally

---

## Requirements

### Functional Requirements

#### Leave Management (US1, US2, US3)

- **FR-2.1**: System MUST support a configurable list of leave types per workspace, seeded with AU defaults (Annual, Personal/Carer's, Sick alias, Long Service basic, Bereavement, Community Service, Parental Paid, Parental Unpaid, TIL, Birthday, Unpaid, Study).
- **FR-2.2**: System MUST allow configuration per leave type: name, code, accrues yes/no, accrual rate per ordinary hour, accrual cap, paid yes/no, included in OTE for super yes/no, STP Phase 2 paid leave category, cashable yes/no.
- **FR-2.3**: System MUST accrue leave per pay run for full-time and part-time employees based on ordinary hours worked × accrual rate, scoped per leave type.
- **FR-2.4**: System MUST NOT accrue leave for casual employees (casual loading 25% applies in lieu).
- **FR-2.5**: System MUST display leave balances on the employee record per leave type: opening balance, accrued YTD, taken YTD, cashed out YTD, adjustments YTD, current balance.
- **FR-2.6**: System MUST support leave taken as a pay run earnings line, deducting from the employee's balance and including the amount in gross pay (and super OTE if leave is paid leave).
- **FR-2.7**: System MUST support leave loading (17.5% additional payment on annual leave taken) configurable per employee.
- **FR-2.8**: System MUST support annual leave cash-out per Fair Work conditions (written agreement attachment captured, residual must remain at least 4 weeks accrued).
- **FR-2.9**: System MUST carry forward leave balances indefinitely (no use-it-or-lose-it for NES leave).
- **FR-2.10**: System MUST support a leave request workflow: employee submits → manager approves/rejects → approved leave queued for next pay run.
- **FR-2.11**: System MUST notify approvers via in-app (024-NTF) and email (023-EML) when a leave request is submitted.
- **FR-2.12**: System MUST support delegated approvers per employee for when the primary approver is unavailable.
- **FR-2.13**: System MUST display an org-wide Leave Calendar showing all approved leave colour-coded by leave type.
- **FR-2.14**: System MUST automatically pull approved leave into the relevant pay run's affected employee line as an Earnings line (e.g., "Annual Leave Taken: 22.8 hours").
- **FR-2.15**: System MUST support backdated leave (start date < today) only with admin role; manager approval insufficient.
- **FR-2.16**: System MUST prevent overlapping leave requests for the same employee.
- **FR-2.17**: System MUST exclude public holidays from leave deductions (public holidays do not consume annual leave per Fair Work).
- **FR-2.18**: System MUST support cancellation of approved leave: if pay run not yet finalised, remove from pay run; if finalised, create a "Leave Reversal" adjustment in the next pay run.
- **FR-2.19**: System MUST log all leave events (request, approval, rejection, cancellation, override) in the employee change log with actor and timestamp.
- **FR-2.20**: System MUST support a configurable list of public holidays per workspace, with state/territory filtering and seeded AU defaults for the current and next financial year.
- **FR-2.21**: System MUST allow custom holidays at workspace level (e.g., regional show day) with applicable states and optional employee-group restriction.
- **FR-2.22**: System MUST handle weekend-substitute holidays (e.g., Christmas Day on Sunday → Monday in lieu) per state rules.
- **FR-2.23**: System MUST flag pay run hours falling on a public holiday (per employee `work_state`) as eligible for penalty rates `[Assumption: penalty rate calculation deferred to Phase 3 award engine; Phase 2 captures the flag and admin manually applies override rate]`.

#### Timesheets (US4)

- **FR-2.24**: System MUST support timesheet creation per employee per pay period with weekly grid layout (default Mon-Sun, configurable).
- **FR-2.25**: System MUST allow timesheet entries to specify: date, hours, earnings type (ordinary / overtime tier / public holiday / leave), job/project (links to 008-JCT), notes.
- **FR-2.26**: System MUST support timesheet templates (standard week pattern) per employee, pre-fillable on new timesheet creation.
- **FR-2.27**: System MUST support timesheet statuses: draft (employee), submitted, approved, rejected, paid (finalised in pay run).
- **FR-2.28**: System MUST notify the employee's nominated approver (manager) when a timesheet is submitted.
- **FR-2.29**: System MUST support bulk approval of multiple timesheets in one action with individual audit log entries.
- **FR-2.30**: System MUST automatically pull approved timesheets into pay runs whose period covers the timesheet dates.
- **FR-2.31**: System MUST allocate labour cost to jobs (008-JCT) when timesheet entries reference a job.
- **FR-2.32**: System MUST split timesheets that span pay-period boundaries by date into the appropriate pay runs.
- **FR-2.33**: System MUST allow admin entry of timesheets on behalf of employees, with optional auto-approval per workspace setting.
- **FR-2.34**: System MUST prevent edits to timesheets that have been pulled into a finalised pay run; corrections require a new timesheet in a subsequent period.
- **FR-2.35**: System MUST flag timesheet hours exceeding configured thresholds (>38 hours/week or >10 hours/day) and prompt for overtime tier allocation.

#### Pay Calendars (US5)

- **FR-2.36**: System MUST support pay calendars with configurable: name, frequency (weekly / fortnightly / twice-monthly / monthly / quarterly), period anchor, payment date offset, weekend rollover rule (previous-business-day / next-business-day / no-rollover).
- **FR-2.37**: System MUST assign each employee to exactly one pay calendar at any given time.
- **FR-2.38**: System MUST display the next 6 upcoming periods per pay calendar with calculated payment dates (adjusted for weekends/holidays).
- **FR-2.39**: System MUST auto-create a draft pay run X days before period end (default 2, configurable per calendar) and notify the admin.
- **FR-2.40**: System MUST handle twice-monthly pay (15th + EOM) including February's variable end-of-month (28 or 29).
- **FR-2.41**: System MUST allow employee re-assignment to a different pay calendar with confirmation that pending pay runs are affected.
- **FR-2.42**: System MUST prevent deletion of a pay calendar with any finalised pay run.

#### Pay Templates & Earnings Lines (US6)

- **FR-2.43**: System MUST support a configurable list of Earnings Types per workspace, seeded with AU defaults including: Ordinary, Overtime 1.5x, Overtime 2x, Overtime 2.5x, Annual Leave Taken, Personal Leave Taken, Public Holiday, Bonus, Commission, Director's Fees, Lump Sum A, Lump Sum B, Lump Sum D, Lump Sum E, Lump Sum W.
- **FR-2.44**: System MUST support a configurable list of Allowance Types with STP categorisation: Car (CD), Meal (MD), Tool (TD), Uniform/Laundry (LD), Travel (RD), Qualifications/Tasks (QN/KN), Other (OD).
- **FR-2.45**: System MUST support a configurable list of Deduction Types with STP categorisation: Union (F), Workplace Giving (W), Salary Sacrifice — Super (S), Salary Sacrifice — Other (X), Child Support Garnishment (G), Child Support Deduction (P), Other (D).
- **FR-2.46**: System MUST support per-employee pay templates with recurring lines: line type (earnings / allowance / deduction / reimbursement), name, amount or rate, frequency, optional GL account override, optional tracking category, STP category, included-in-OTE flag.
- **FR-2.47**: System MUST pre-populate pay run lines from each employee's pay template, allowing per-pay-run overrides without modifying the template.
- **FR-2.48**: System MUST exclude allowances flagged as non-OTE from super calculations while including them in PAYG calculations and STP gross.
- **FR-2.49**: System MUST handle salary sacrifice to super: reduce employee's gross taxable pay by the sacrifice amount, calculate employer SG on pre-sacrifice OTE, add the sacrifice amount to the super liability for the employee.
- **FR-2.50**: System MUST support PAYG calculation for one-off bonuses using ATO Schedule 5 Method B(ii) by default, with option to use Method A.
- **FR-2.51**: System MUST apply pay template GL account overrides at pay run finalisation, posting wages expense to the override account rather than the default.
- **FR-2.52**: System MUST tag JE lines with tracking categories from pay template lines for cost-centre / job reporting.
- **FR-2.53**: System MUST support reimbursements as a non-taxable, non-super-liable line type that adds to net pay but is excluded from STP gross and BAS W1.
- **FR-2.54**: System MUST handle negative earnings lines (over-payment recovery) with correct PAYG and super recalculation.

#### Employee Groups (US7)

- **FR-2.55**: System MUST support employee groups (CRUD) with: name, code, description, default wages-expense GL, default super-expense GL, default tracking category.
- **FR-2.56**: System MUST allow assigning each employee to one group (effective-dated).
- **FR-2.57**: System MUST apply group-default GL accounts to JE postings unless overridden at the pay template line level.
- **FR-2.58**: System MUST prevent group deletion when employees are currently assigned.
- **FR-2.59**: System MUST support reporting grouped by employee group (Payroll Activity Summary, etc.).

#### STP Phase 2 (US8)

- **FR-2.60**: System MUST construct STP Phase 2 payloads per finalised pay run with all required fields per the ATO STP Phase 2 Business Implementation Guide.
- **FR-2.61**: System MUST disaggregate gross into: salary/wages, paid leave (by category), allowances (by type), overtime, bonuses & commissions, directors fees, CDEP.
- **FR-2.62**: System MUST disaggregate salary sacrifice into super (S) and other (X).
- **FR-2.63**: System MUST construct the 6-character tax treatment code per employee per ATO rules (claim type, STSL, Medicare reduction, Medicare exemption, Medicare surcharge, tax-free threshold).
- **FR-2.64**: System MUST support all STP income type codes: SAW, CHP, IAA, WHM, SWP, FEI, JPD, VOL, LAB, OSP.
- **FR-2.65**: System MUST support Pay Events, Update Events (corrections), Full File Replacements, and Finalisation Events.
- **FR-2.66**: System MUST queue STP submissions asynchronously and decouple from pay run finalisation (gateway failure does not block pay run).
- **FR-2.67**: System MUST retry failed STP submissions with exponential backoff (1m, 5m, 30m, 2h, 12h, 24h) before alerting admin.
- **FR-2.68**: System MUST track STP submission status per pay run: pending, submitted, accepted, rejected, amended.
- **FR-2.69**: System MUST surface STP errors per employee with actionable detail and a "Resubmit" action that constructs an Update Event.
- **FR-2.70**: System MUST support manual creation of Update Events for prior pay runs to correct any per-employee field.
- **FR-2.71**: System MUST support manual creation of Full File Replacement events for a financial year.
- **FR-2.72**: System MUST display an STP Filings page showing all submissions with pay run reference, type, status, employees count, totals, gateway message ID, and view-payload action.

#### Super Funds & Payments (US9, US10)

- **FR-2.73**: System MUST support a Super Funds register per workspace with two types: APRA-regulated funds (USI, ABN, name, address) and SMSFs (ABN, name, ESA, BSB, account number, account name).
- **FR-2.74**: System MUST validate USI format and ABN format for super fund records.
- **FR-2.75**: System MUST support a workspace default super fund nominated from the registered APRA funds.
- **FR-2.76**: System MUST support per-employee super fund nomination with effective-dated changes.
- **FR-2.77**: System MUST support a Stapled Fund request per employee `[Assumption: Phase 2 captures the request and stores manually-retrieved stapled fund details; ATO Stapled Super Fund API integration deferred to Phase 3]`.
- **FR-2.78**: System MUST aggregate super liability across finalised pay runs into a Pending Super view, grouped by fund and employee.
- **FR-2.79**: System MUST display payment-due indicators (green/amber/red) based on Payday Super requirement (7 days from payment_date).
- **FR-2.80**: System MUST support Super Payment Batches with statuses: draft, authorised, submitted, paid, void.
- **FR-2.81**: System MUST allow admin to create batches by selecting pay runs (or "all pending"), generating batch reference, per-fund per-employee breakdown, totals.
- **FR-2.82**: System MUST require explicit authorisation step before batch submission, capturing approver and timestamp.
- **FR-2.83**: System MUST generate a payment file (CSV / SuperStream-compatible format) for download on batch submission `[Assumption: full SuperStream API submission deferred to Phase 3 — Phase 2 produces the file for manual upload to clearing house]`.
- **FR-2.84**: System MUST allow marking batch as paid with payment date and bank reference, posting an automatic JE (debit Super Payable, credit Bank).
- **FR-2.85**: System MUST handle partial payments (e.g., one fund rejects) by creating shortfall liability for re-batching.
- **FR-2.86**: System MUST alert admin via dashboard and notification when super for any pay run exceeds the Payday Super 7-day window without being batched.

#### Termination & Final Pay (US11)

- **FR-2.87**: System MUST support a termination wizard with: cessation date, cessation reason code (V/I/D/R/F/C/T/N), unused leave payout amounts (per leave type), ETP details (amount, category O/R/T, tax-free component calculation), ex-gratia amounts.
- **FR-2.88**: System MUST pre-fill unused leave hours from current balances at the cessation date.
- **FR-2.89**: System MUST calculate PAYG on unused annual leave using ATO Schedule 7 lump-sum-on-termination method (NOT standard tax tables).
- **FR-2.90**: System MUST calculate PAYG on unused LSL using Schedule 7, splitting by service period (pre-1978 / 1978-1993 / post-1993) where applicable, applying concessional rates per ATO rules.
- **FR-2.91**: System MUST calculate ETP tax-free components per ATO formula: `base_amount + per_year_amount × completed_years_service` for genuine redundancy ETPs (Type R), with thresholds maintained as workspace-configurable reference data.
- **FR-2.92**: System MUST calculate ETP withholding at the appropriate rate (32% if under preservation age, 17% if at/above, 47% above the ETP cap).
- **FR-2.93**: System MUST handle deceased-employee final pay (cessation reason D) without PAYG withholding on the death benefit ETP component.
- **FR-2.94**: System MUST report unused leave payouts via STP under "Lump Sum A" element.
- **FR-2.95**: System MUST report ETPs via STP under the ETP element with the correct category code.
- **FR-2.96**: System MUST submit a Cessation STP event with the cessation reason code at final pay finalisation.
- **FR-2.97**: System MUST handle rehire (re-activation of terminated employee) with new rehire date captured separately from original start date.

#### Deductions & Garnishments (US12)

- **FR-2.98**: System MUST support per-employee garnishments with: type (child support / bankruptcy / court order / creditor / other), payee details (name, ABN/reference, BSB and account if applicable), amount or formula (fixed / percentage / capped), Protected Earnings Amount, start date, end date, reference number.
- **FR-2.99**: System MUST enforce Protected Earnings Amount when calculating garnishments — reduce garnishment to maintain net at PEA, carry forward shortfall to next pay run.
- **FR-2.100**: System MUST post garnishment amounts to separate liability accounts (one per garnishment authority) rather than Net Wages Payable, enabling separate remittance reconciliation.
- **FR-2.101**: System MUST report garnishments via STP under the deductions element with appropriate type code (G / P / etc.).
- **FR-2.102**: System MUST support garnishment end conditions (cap reached, end date passed) with admin notification.
- **FR-2.103**: System MUST handle multiple garnishments on one employee with priority ordering (child support first by law).

#### End of Year (US13)

- **FR-2.104**: System MUST provide an End of Year page with checklist: review YTD figures, verify all pay runs finalised, verify all STP accepted, finalise STP, lock financial year.
- **FR-2.105**: System MUST aggregate YTD figures per employee from all finalised pay run lines for the financial year.
- **FR-2.106**: System MUST construct STP Finalisation Events per employee with YTD figures and submit via gateway.
- **FR-2.107**: System MUST track per-employee STP finalisation status per financial year.
- **FR-2.108**: System MUST support STP Amendment Events for finalised employees (post-finalisation corrections).
- **FR-2.109**: System MUST refresh PAYG tax table coefficients, super contribution maximum base, ETP cap, and HELP repayment thresholds on transition to a new financial year (1 July), with admin manual-refresh option.
- **FR-2.110**: System MUST reset per-employee YTD-taken counters (leave taken this FY, YTD earnings) at financial year start while preserving balances (annual leave balance carries forward).
- **FR-2.111**: System MUST support locking a financial year (preventing creation of new pay runs with `period_end <= 30 June` of that year), with documented admin override.
- **FR-2.112**: System MUST provide a Payroll EOY Summary report (totals per FY, per employee) exportable to PDF/CSV.

#### Payslips (US14)

- **FR-2.113**: System MUST generate a payslip PDF per employee per finalised pay run containing all Fair Work Act s536 / Reg 3.46 required fields: employer name, employer ABN, employee name, payment date, period start, period end, gross, net, breakdown of pay components, all deductions (name, amount, payee where applicable), tax withheld, super (amount, fund name), YTD totals (gross, tax, super).
- **FR-2.114**: System MUST use a configurable workspace template (logo, footer text, branding) for payslip rendering.
- **FR-2.115**: System MUST allow downloading individual payslips, combined PDF for an entire pay run, or ZIP of individual files.
- **FR-2.116**: System MUST support emailing payslips via 023-EML to all employees with email addresses, listing those without for manual handling.
- **FR-2.117**: System MUST publish payslip to portal (US15) automatically on pay run finalisation.
- **FR-2.118**: System MUST support payslip re-issue with audit trail, marking prior payslip as superseded.
- **FR-2.119**: System MUST preserve generated payslip PDFs immutably (no regeneration with current data) for historical retrieval.
- **FR-2.120**: System MUST support payslip preferences per workspace: show YTD yes/no, show leave balances yes/no, show employer's super expense yes/no, custom footer.
- **FR-2.121**: System MUST list multiple deductions of the same type separately (e.g., two child support garnishments shown as separate lines).

#### Employee Self-Service Portal Extensions (US15)

- **FR-2.122**: System MUST extend the employee portal with Leave (balances, requests, history), Timesheets (current period, history, submission), Profile (update personal/sensitive fields), Documents (payslip history, policies, acknowledgements) sections.
- **FR-2.123**: System MUST allow employees to update non-sensitive fields directly: phone, address, emergency contact, communication preferences.
- **FR-2.124**: System MUST require admin approval for sensitive field changes: bank details, super fund nomination, legal name, DOB, TFN. Changes are held in pending state until approved.
- **FR-2.125**: System MUST support document attachments on change requests (e.g., new TFN declaration) using existing 012-ATT infrastructure.
- **FR-2.126**: System MUST support document acknowledgements: workspace publishes a document with `requires_acknowledgement`, employee must view and tick to acknowledge before continuing portal use.
- **FR-2.127**: System MUST audit-log all employee portal actions: leave requests, timesheet submissions, profile changes (request and approval), document acknowledgements.

#### Employee Onboarding (US16)

- **FR-2.128**: System MUST support three onboarding pathways per workspace: admin manual entry, self-onboard invite, bulk CSV import.
- **FR-2.129**: System MUST support self-onboard invitations with secure tokens, magic-link emails, and 14-day token expiry.
- **FR-2.130**: System MUST present a multi-step self-onboarding form: Personal, Tax (TFN, residency, threshold, HELP, Medicare), Bank (with optional split for multiple accounts), Super (nominate / use default / request stapled), Acknowledgements.
- **FR-2.131**: System MUST hold self-onboarded employees in `onboarding_pending_admin_review` state until admin approves.
- **FR-2.132**: System MUST support CSV bulk import with: downloadable template, dry-run validation (parse, validate per row, check for duplicates), preview (green/amber/red rows), commit step.
- **FR-2.133**: System MUST provide downloadable error reports for failed CSV rows with specific error reasons per row.
- **FR-2.134**: System MUST encrypt TFNs at rest, mask in UI display (XXX XXX 123 format), and exclude from API responses without explicit `tfn.view` permission.

#### Reports (US17)

- **FR-2.135**: System MUST provide the Payroll Activity Summary report: per-employee table of Gross, Allowances, Deductions, PAYG, Super, Net for a date range with totals and group filtering.
- **FR-2.136**: System MUST provide the Pay Run History report matching standard format: Frequency, Period, Payment Date, Wages, Tax, Super, Net, STP Filing Status, Action.
- **FR-2.137**: System MUST provide the Leave Transactions report per employee per leave type: Opening, Accrued, Taken, Cashed Out, Adjustments, Closing, with drill-down to transactions.
- **FR-2.138**: System MUST provide the Super Accrual Report: total accrued, total paid, outstanding liability per fund per employee, reconcilable to Super Payable account balance.
- **FR-2.139**: System MUST provide the Employee Remuneration Report (admin/HR-role only): per-employee annualised salary or hourly rate, total cost (gross + super + leave provisions).
- **FR-2.140**: System MUST provide the Payment Summary Details report (per-employee YTD): aggregated YTD per the STP-finalised data, mirroring myGov income statement view.
- **FR-2.141**: System MUST provide the Timesheet Summary report: per-employee total hours by earnings type, per-job breakdown (008-JCT integration), total cost per job/employee.
- **FR-2.142**: System MUST support PDF and CSV export for all reports with workspace branding in PDF.
- **FR-2.143**: System MUST respect role-based visibility on reports (Employee Remuneration Report hidden from non-HR roles).

---

### Key Entities

- **LeaveType**: Configurable leave category per workspace. Fields: name, code, accrues, accrual_rate_per_ordinary_hour, accrual_cap_hours, paid, included_in_super_ote, stp_paid_leave_category, cashable, requires_certificate (sick), default_for_employment_types[]. Seeded with AU defaults.

- **LeaveBalance**: Running tally per employee per leave type. Fields: employee_id, leave_type_id, opening_balance_hours, accrued_ytd_hours, taken_ytd_hours, cashed_out_ytd_hours, adjustments_ytd_hours, current_balance_hours. Read model rebuilt from leave transactions.

- **LeaveTransaction**: Atomic leave movement (accrual, taken, cashout, adjustment, opening). Fields: employee_id, leave_type_id, transaction_type, hours, pay_run_id (nullable), leave_request_id (nullable), effective_date, notes, actor_user_id.

- **LeaveRequest**: Employee-initiated leave request. Fields: employee_id, leave_type_id, start_date, end_date, hours_per_day, total_hours, reason, supporting_document_attachment_id, status (pending / approved / rejected / cancelled), approver_user_id, approval_date, rejection_reason, applied_to_pay_run_id (nullable).

- **PublicHoliday**: Date marked as a public holiday. Fields: date, name, applicable_states[], custom (workspace-created vs seeded), employee_group_id (nullable for restriction).

- **PayCalendar**: Recurring pay schedule. Fields: name, frequency (weekly / fortnightly / twice_monthly / monthly / quarterly), period_anchor, payment_date_offset_days, weekend_rollover_rule (previous_business_day / next_business_day / none), auto_create_pay_run_days_before, active.

- **EmployeePayCalendarAssignment**: Effective-dated assignment of employee to pay calendar. Fields: employee_id, pay_calendar_id, effective_from, effective_to (nullable).

- **Timesheet**: Weekly time entry per employee. Fields: employee_id, period_start, period_end, status (draft / submitted / approved / rejected / paid), submitted_at, approver_user_id, approved_at, rejection_reason, applied_to_pay_run_id (nullable).

- **TimesheetLine**: Individual time entry within a timesheet. Fields: timesheet_id, date, hours, earnings_type_id, job_id (nullable, links to 008-JCT), notes, hourly_rate_override (nullable).

- **TimesheetTemplate**: Standard week pattern per employee. Fields: employee_id, monday_hours, tuesday_hours, ..., default_earnings_type_id, default_job_id (nullable).

- **EarningsType**: Configurable earnings line type per workspace. Fields: name, code, stp_phase2_category (e.g., "salary_wages", "overtime", "bonus", "commission", "directors_fees", "lump_sum_a"), default_rate_multiplier (e.g., 1.0 for ordinary, 1.5 for OT1), included_in_super_ote, includes_in_payg_taxable, default_gl_account_id.

- **AllowanceType**: Configurable allowance line type. Fields: name, code, stp_allowance_code (CD / MD / TD / LD / RD / QN / KN / OD), included_in_super_ote, taxable, default_gl_account_id.

- **DeductionType**: Configurable deduction line type. Fields: name, code, stp_deduction_code (F / W / S / X / G / P / D), pre_tax (e.g., salary sacrifice), default_gl_liability_account_id.

- **PayTemplate**: Per-employee recurring pay structure. Fields: employee_id, currency, leave_loading_applies, leave_loading_rate_basis_points (1750 = 17.5%), effective_from, effective_to (nullable).

- **PayTemplateLine**: Recurring line within an employee's pay template. Fields: pay_template_id, line_type (earnings / allowance / deduction / reimbursement), reference_type_id (FK to EarningsType / AllowanceType / DeductionType), name, amount_or_rate, frequency (per_period / per_hour), gl_account_override_id (nullable), tracking_category_id (nullable), included_in_super_ote_override (nullable — defaults to type's setting).

- **EmployeeGroup**: Department / cost centre. Fields: name, code, description, default_wages_expense_gl_account_id, default_super_expense_gl_account_id, default_tracking_category_id, active.

- **EmployeeGroupAssignment**: Effective-dated employee-to-group link. Fields: employee_id, employee_group_id, effective_from, effective_to (nullable).

- **STPSubmission**: Phase 1 entity, extended in Phase 2. Fields: pay_run_id (nullable for Finalisation Events), event_type (pay_event / update_event / finalisation / full_file_replacement), submission_payload (JSON), gateway_message_id, status (pending / submitted / accepted / rejected / amended), accepted_at, rejected_at, error_details (JSON), retry_count, next_retry_at, parent_submission_id (for Update Events referencing originals).

- **SuperFund**: Workspace-level super fund register. Fields: type (apra / smsf), name, abn, usi (apra only), esa (smsf only), bsb (smsf only), account_number (smsf only), account_name (smsf only), address, active, is_workspace_default.

- **EmployeeSuperFund**: Effective-dated employee-to-fund nomination. Fields: employee_id, super_fund_id, member_number, contribution_split_percentage (default 100), is_salary_sacrifice_destination, effective_from, effective_to (nullable).

- **StapledFundRequest**: Per-employee request for ATO-identified stapled fund. Fields: employee_id, requested_at, requested_by_user_id, response_received_at, response_super_fund_id (nullable), notes.

- **SuperPaymentBatch**: Aggregated super remittance. Fields: workspace_id, batch_reference, batch_date, status (draft / authorised / submitted / paid / void), authorised_by_user_id, authorised_at, submitted_at, paid_at, paid_via_bank_account_id (nullable), payment_reference, total_amount_cents.

- **SuperPaymentBatchLine**: Per-fund per-employee line in a super payment batch. Fields: super_payment_batch_id, super_fund_id, employee_id, pay_run_id, sg_amount_cents, salary_sacrifice_amount_cents, resc_amount_cents, total_amount_cents.

- **TerminationDetails**: Captured at termination wizard. Fields: employee_id, cessation_date, cessation_reason_code (V / I / D / R / F / C / T / N), final_pay_run_id, etp_amount_cents, etp_category (O / R / T), etp_tax_free_component_cents, etp_taxable_component_cents, ex_gratia_amount_cents, unused_leave_payouts_json, unused_lsl_split_json, deceased_recipient_details (nullable).

- **EmployeeGarnishment**: Court-ordered or other deduction with PEA. Fields: employee_id, garnishment_type (child_support / bankruptcy / court_order / creditor / other), payee_name, payee_abn_or_reference, payee_bsb (nullable), payee_account_number (nullable), amount_or_formula_json, protected_earnings_amount_cents, start_date, end_date (nullable), reference_number, total_capped_amount_cents (nullable), total_paid_to_date_cents, status (active / completed / paused).

- **EmployeeChangeRequest**: Pending sensitive-field change from portal. Fields: employee_id, requested_by_user_id (employee), field_name (bank_bsb / bank_account_number / super_fund_id / legal_name / dob / tfn), current_value (encrypted snapshot), proposed_value (encrypted), supporting_attachment_id (nullable), status (pending / approved / rejected), approver_user_id (nullable), approval_date (nullable), effective_from (nullable).

- **OnboardingInvitation**: Self-onboard token-based invitation. Fields: workspace_id, email, name, token (secure random), expires_at (default 14 days), accepted_at (nullable), employee_id (set when accepted/created), invited_by_user_id.

- **EmployeeBulkImportJob**: Async CSV import job. Fields: workspace_id, uploaded_file_attachment_id, status (uploaded / validated / committed / failed), dry_run_results_json, committed_results_json, started_at, completed_at, initiated_by_user_id.

- **PayslipDocument**: Generated PDF per pay run line. Fields: pay_run_line_id, generated_at, pdf_attachment_id, template_version, superseded_by_payslip_document_id (nullable), email_sent_at (nullable).

- **DocumentAcknowledgement**: Employee acknowledgement record. Fields: employee_id, document_attachment_id, document_title, requires_acknowledgement, acknowledged_at, acknowledged_by_user_id, version.

- **TaxTable**: Phase 1 entity, extended. Fields: financial_year, schedule_number (1 / 5 / 7 / 8 / 11), scale, coefficients_json (a, b values per range), effective_from, effective_to.

- **PayrollReferenceData**: Annual constants. Fields: financial_year, super_contribution_max_base_cents (e.g., $62,500 for 2025-26), etp_cap_cents (e.g., $245,000), etp_lifetime_cap_cents, redundancy_base_amount_cents, redundancy_per_year_amount_cents, help_repayment_thresholds_json, sg_rate_basis_points (1200 = 12%), preservation_age_table_json.

---

## Success Criteria

### Measurable Outcomes

- **SC-2.1**: An admin can complete a fortnightly pay run with 20 employees (mixed salary/hourly, with leave taken and timesheets) end-to-end in under 8 minutes.
- **SC-2.2**: Leave accrual calculations match the configured rate within 0.001 hours tolerance per pay run.
- **SC-2.3**: Approved leave requests automatically appear in the next applicable pay run with 100% reliability (no manual intervention required).
- **SC-2.4**: STP Phase 2 pay events submitted to the gateway have a first-submission acceptance rate of >=95%.
- **SC-2.5**: STP Update Events for corrections submit successfully within 60 seconds of admin action.
- **SC-2.6**: Super Payment Batches accurately aggregate super liability across pay runs with zero discrepancies against the Super Payable account balance.
- **SC-2.7**: Payday Super alerts fire for any super liability >5 days old (within the 7-day window) with 100% reliability.
- **SC-2.8**: Termination final pay calculations (unused leave, ETP) match ATO Schedule 7 calculations within $1.00 tolerance.
- **SC-2.9**: Payslips are generated within 30 seconds of pay run finalisation for pay runs of up to 100 employees.
- **SC-2.10**: Payslips contain 100% of Fair Work Act s536 / Reg 3.46 required fields (validated against checklist on every generated payslip).
- **SC-2.11**: Email payslip delivery achieves >=98% deliverability (via 023-EML transactional email infra).
- **SC-2.12**: Self-onboard completion rate (employees who finish all 5 steps after invitation) >=80% within 7 days of invitation.
- **SC-2.13**: Bulk import dry-run validates 1,000-row CSV files in under 10 seconds.
- **SC-2.14**: STP EOY Finalisation submits for all employees in a workspace in a single transaction with success rate >=99%.
- **SC-2.15**: Tax table refresh on 1 July transition occurs automatically with no admin intervention required for standard year-over-year changes.
- **SC-2.16**: Employees with portal access can submit a leave request in under 60 seconds end-to-end.
- **SC-2.17**: Garnishment calculations enforce Protected Earnings Amount with 100% accuracy (zero PEA breaches in any finalised pay run).
- **SC-2.18**: All payroll reports load within 5 seconds for a workspace with 50 employees and 12 months of pay history.
- **SC-2.19**: TFN never appears in any UI screen, API response, or export without explicit `tfn.view` role permission (enforced by automated security tests).
- **SC-2.20**: 70% of customers who use Phase 1 payroll have at least one employee on the portal within 60 days of Phase 2 launch.

---

## Assumptions and Dependencies

### Assumptions

- **Phase 1 is complete and stable** — employee CRUD, pay runs, PAYG calculation (Schedule 1 coefficients), super calc at 12%, auto-posted JEs are all working in production.
- **STP Phase 2 specification stable through 2026-27** — the ATO does not introduce STP Phase 3 or major Phase 2 amendments during the build window. If they do, scope adjustments will be needed.
- **Payday Super takes effect 1 July 2026 as legislated** — no further deferrals. Phase 2 must ship with Payday Super-compatible super remittance flow.
- **Super contribution maximum base, ETP cap, redundancy thresholds are workspace-configurable reference data** — annual updates are admin-triggered (or auto-loaded from a maintained reference dataset) rather than hardcoded.
- **STP integration gateway selection is decoupled from this spec** — the spec assumes a generic gateway that accepts STP Phase 2 payloads via REST and returns acknowledgement / errors. Specific provider (Ozedi, GovReports, others) is a planning decision.
- **SuperStream API integration is deferred to Phase 3** — Phase 2 generates payment files for manual upload to clearing house.
- **Public holiday data is maintained as a seeded reference dataset** — annual update process is documented but not automated via a live API.
- **State Long Service Leave portable schemes (CoINVEST, QLeave, etc.) are out of scope** — Phase 2 supports basic LSL accrual at workspace-configurable rate; state-specific portability is Phase 3.
- **Award interpretation is not in Phase 2** — overtime tiers (1.5x / 2x / 2.5x) and public holiday penalty rates are workspace-default values; per-Award penalty rules are Phase 3.
- **Multi-language support not required** — UI in English only.
- **Employees access portal via web** — no native mobile app in Phase 2; portal must be responsive.
- **TFN encryption uses Laravel encryption (AES-256-CBC) at rest** — same approach as existing sensitive fields in the codebase.
- **Financial year for AU is 1 July to 30 June** — no support for non-standard fiscal years on payroll (workspace fiscal year setting may differ for accounting but payroll uses 1 July).

### Dependencies

- **064-PAY Phase 1** (complete): employees, pay runs, PAYG, super, auto-posted JEs
- **023-EML** (complete): transactional email for invitations, payslips, notifications
- **024-NTF** (complete): in-app notifications for leave approvals, STP errors, payday super alerts
- **008-JCT** (complete): job costing for timesheet → labour cost allocation, tracking categories on JE lines
- **044-TAX** (complete): BAS reporting — Phase 2 must continue to feed W1/W2 (per Phase 1 FR-040, FR-041) and add reconciliation between BAS-period STP-reported figures and BAS W1/W2
- **012-ATT** (complete): polymorphic attachments — for leave certificates, change request supporting docs, employee documents
- **STP Gateway** (external — to be selected): third-party STP submission service
- **ATO STP Phase 2 Business Implementation Guide** (reference): the source of truth for payload structure
- **Super Fund Reference Data**: maintained list of APRA-regulated funds with USI/ABN — seeded and refreshed annually
- **Public Holiday Reference Data**: seeded AU public holidays per state for the next 5 years, refreshed annually
- **Payroll Reference Data**: seeded annual constants (super max base, ETP cap, redundancy thresholds, HELP repayment thresholds) updated each July

---

## Payroll Settings Page Architecture

This section consolidates all workspace-level payroll configuration into a single `/payroll/settings` page with 6 horizontal tabs, mirroring the established Xero Payroll Settings pattern. The intent is one canonical destination for "set this up once and forget it" configuration, separate from per-pay-run operations.

The 6 tabs are: **Organisation**, **Pay Frequencies**, **Holidays**, **Pay Items**, **Superannuation**, **Automatic Superannuation**.

`[Assumption: route is /payroll/settings within the existing payroll module; tabs use the existing tabbed-settings pattern from /settings (e.g., Periods, Exchange Rates) for visual consistency]`

### Tab 1 — Organisation

Three sub-panels: **Default GL Accounts**, **Payroll Tracking**, **Payslip Options**.

#### Default GL Accounts

Six dropdowns pre-populated from `chart_accounts`, each filtered to the appropriate account type. These provide the workspace defaults that seed the Phase 1 JE-posting logic and are overridable per Employee Group (existing FR-2.55).

- **Bank Account** (asset / cash) — used to debit on pay-run disbursement
- **PAYG Liability Account** (liability) — credited on pay-run finalisation, debited on PAYG remittance
- **Wages Expense Account** (expense) — debited for gross wages
- **Wages Payable Account** (liability) — credited for net wages prior to disbursement
- **Superannuation Liability Account** (liability) — credited on accrual, debited on payment
- **Superannuation Expense Account** (expense) — debited for employer super contribution

#### Payroll Tracking

Two optional dimensions that hook into existing 008-JCT tracking categories:

- **Track by Employee Group** (toggle) — when on, every pay-run JE line carries `tracking_category_id` derived from the employee's group
- **Track by Timesheet Category** (toggle) — when on, timesheet-driven JE lines carry the timesheet's selected tracking category

#### Payslip Options

Boolean checkboxes governing what appears on the generated payslip PDF (FR-2.113 prescribes the legally required minimum; these toggles add optional content):

- Show Annual Salary (default: on)
- Show Employment Basis (default: on)
- Show Hours Breakdown (default: on)
- Show Leave Balances (default: on — overlaps with FR-2.120 leave-balance toggle, this is the canonical control)
- Show YTD Totals (default: on — overlaps with FR-2.120 YTD toggle)
- Show Bank Account, masked (default: off)
- Show Superannuation Fund (default: on)

#### Functional Requirements — Organisation Tab

- **FR-2.144**: System MUST provide a `/payroll/settings` route with 6 horizontal tabs: Organisation, Pay Frequencies, Holidays, Pay Items, Superannuation, Automatic Superannuation.
- **FR-2.145**: System MUST allow workspace admin to nominate Default GL Accounts for: Bank, PAYG Liability, Wages Expense, Wages Payable, Superannuation Liability, Superannuation Expense — each a dropdown filtered to the matching `chart_accounts.account_type`.
- **FR-2.146**: System MUST seed Phase 1 JE-posting logic from these defaults when no Employee Group override exists (preserving existing FR-2.55 override behaviour).
- **FR-2.147**: System MUST validate that all six default GL accounts are set before any pay run can be finalised; surface a validation error directing the user to `/payroll/settings`.
- **FR-2.148**: System MUST support workspace-level "Track by Employee Group" toggle that, when enabled, attaches `tracking_category_id` (derived from the employee's group) to every pay-run JE line.
- **FR-2.149**: System MUST support workspace-level "Track by Timesheet Category" toggle that, when enabled, propagates the timesheet line's `tracking_category_id` (from 008-JCT) onto the corresponding pay-run JE line.
- **FR-2.150**: System MUST persist Payslip Options (annual salary / employment basis / hours breakdown / leave balances / YTD / bank account masked / super fund — each boolean) at workspace level, defaulting all to on except Bank Account which defaults to off.
- **FR-2.151**: System MUST honour Payslip Options at payslip-generation time (FR-2.113 et seq.); options act as renderer-level toggles, not as legal-minimum overrides — Fair Work s536 / Reg 3.46 fields remain mandatory regardless of toggle state.

### Tab 2 — Pay Frequencies

This tab surfaces the **Pay Calendars** already specified under US2 (Pay Calendars & Auto-Created Pay Runs) and FRs FR-2.13 to FR-2.22. No new requirements are added — the tab provides a CRUD list of `PayCalendar` records with their frequency, period anchor, payment date offset, weekend rollover rule, and auto-creation lead time.

`[Assumption: this tab is a thin presentation layer over the existing PayCalendar entity; no schema or behavioural changes from US2]`

### Tab 3 — Holidays

This tab surfaces the **Public Holidays** already specified under US3 (Public Holidays) and FRs FR-2.23 to FR-2.28, with two clarifications drawn from the Xero pattern.

- AU state filter dropdown: NSW / VIC / QLD / WA / SA / TAS / NT / ACT / National (the latter showing federal holidays only)
- National (federal) holidays seeded from the maintained reference dataset are **locked** — non-deletable, non-editable, displayed with a lock icon. State-level seeded holidays inherit the same lock. User-added custom holidays are fully deletable.

#### Functional Requirements — Holidays Tab

- **FR-2.152**: System MUST display Public Holidays grouped first by jurisdiction (National / per-state), with a state filter dropdown allowing the admin to narrow the view to a single jurisdiction.
- **FR-2.153**: System MUST mark seeded national and state public holidays as locked (`custom = false` per existing PublicHoliday entity), display a lock icon in the UI, and prevent edit/delete actions; only `custom = true` rows are user-editable.

### Tab 4 — Pay Items

This tab surfaces the existing earnings, deductions, and leave configuration with 4 sub-tabs matching the Xero pattern: **Earnings**, **Deductions**, **Reimbursements**, **Leave**.

- **Earnings** sub-tab — CRUD over `EarningsType` (existing FR-2.29 to FR-2.40). The "Add Earnings Item" dropdown MUST present all STP Phase 2 earnings categories so the admin can correctly classify each pay item:
  - Ordinary Time Earnings
  - Overtime Earnings
  - Allowance
  - Employment Termination Payments
  - Lump Sum E
  - Bonuses and Commissions
  - Lump Sum W
  - Directors Fees
  - Paid Parental Leave
  - Workers' Compensation
- **Deductions** sub-tab — CRUD over `DeductionType` (existing FR-2.41 to FR-2.49)
- **Reimbursements** sub-tab — **new** category not previously specified in detail. Reimbursements are non-taxable, non-super-liable, non-STP-reportable as wages, and post to a separate reimbursement expense account
- **Leave** sub-tab — CRUD over `LeaveType` (existing FR-2.1 to FR-2.12)

#### Functional Requirements — Pay Items Tab

- **FR-2.154**: System MUST provide a Pay Items tab with 4 sub-tabs (Earnings, Deductions, Reimbursements, Leave); each sub-tab presents the relevant CRUD list.
- **FR-2.155**: System MUST present an "Add Earnings Item" picker listing all STP Phase 2 earnings categories (Ordinary Time Earnings, Overtime Earnings, Allowance, ETP, Lump Sum E, Bonuses and Commissions, Lump Sum W, Directors Fees, Paid Parental Leave, Workers' Compensation) so each EarningsType is correctly tagged with its `stp_phase2_category` on creation.
- **FR-2.156**: System MUST support a `ReimbursementType` entity per workspace with fields: name, code, default_expense_gl_account_id, requires_receipt (boolean), description, active.
- **FR-2.157**: System MUST exclude reimbursements from PAYG-taxable gross, from super OTE base, and from STP gross/W1 reporting `[Assumption: standard ATO treatment — non-deductible expense reimbursements paid against substantiated receipts are not OTE per SGR 2009/2 and not assessable income to the employee]`.
- **FR-2.158**: System MUST post reimbursement amounts in pay-run JEs as a debit to the Reimbursement Expense Account nominated on the ReimbursementType (NOT Wages Expense), credit Net Wages Payable.

### Tab 5 — Superannuation

Workspace-wide Super Funds register — extends and replaces the lighter-weight `SuperFund` register described under US9 (Super Fund Register & Stapled Fund). The existing FRs FR-2.73 to FR-2.77 remain in force; this tab adds richer fund metadata and a seeded reference dataset.

#### Fund record fields

- **Name** (required)
- **Type**: Regulated APRA Fund / SMSF / Exempt Public Sector Fund (radio)
- **SPIN** — legacy 8-character identifier, optional (deprecated post-2014 but still surfaced for older funds)
- **USI** — Unique Superannuation Identifier, required for APRA funds, 17 characters (e.g., `SBI0001AU`); primary identifier for SuperStream routing
- **ABN** — required for SMSFs (11 digits, with checksum validation); optional for APRA funds (informational)
- **Electronic Service Address (ESA)** — required for SMSFs; alphanumeric reference issued by an SMSF messaging provider
- **Employer Number** — per-fund membership identifier assigned to the employer by the fund (used on contribution submissions)
- **Auto-Migrated Fund** — boolean flag indicating the fund is the result of a successor fund transfer (SFT); informational

#### Seed data

`[Assumption: seed dataset comprises the ~200 most-common APRA-regulated funds by membership, sourced from the ATO's Super Fund Lookup Dataset (SFLD) — refreshed annually; locked rows are non-deletable, edits are limited to "Employer Number" only]`. SMSFs and any non-seeded APRA funds are user-added.

#### Functional Requirements — Superannuation Tab

- **FR-2.159**: System MUST extend the SuperFund entity with: `type` (regulated_apra / smsf / exempt_public_sector), `spin` (nullable, 8 chars), `usi` (required for APRA, 17 chars), `abn` (11 digits, required for SMSF), `esa` (required for SMSF), `employer_number` (per-employer-per-fund membership ID), `auto_migrated` (boolean), `is_seeded` (boolean — flips the lock).
- **FR-2.160**: System MUST seed each new workspace with the maintained APRA-fund reference dataset (~200 most-common funds), with `is_seeded = true` and `is_workspace_default = false`.
- **FR-2.161**: System MUST validate USI format (17-character alphanumeric per APRA pattern) on save for APRA funds.
- **FR-2.162**: System MUST validate ABN checksum (11-digit modulus-89 algorithm) on save for SMSFs.
- **FR-2.163**: System MUST prevent deletion of any fund where `is_seeded = true`; allow editing only of the `employer_number` and `is_workspace_default` fields on seeded rows.
- **FR-2.164**: System MUST allow user-added SMSFs and non-seeded APRA funds with full CRUD (name, type, USI/ABN/ESA per type rules, employer_number, address).
- **FR-2.165**: System MUST surface a "Set as Default" action on any fund row that flips `is_workspace_default` (only one fund may be default per workspace; setting a new default unsets the prior).
- **FR-2.166**: System MUST present a "Refresh seeded funds" admin action that re-syncs the workspace's seeded rows against the latest SFLD dataset, preserving any per-row `employer_number` value.

### Tab 6 — Automatic Superannuation

Configures the workspace's connection to a super clearing house / SuperStream gateway, enabling one-click batch submission on finalised pay runs (extending US10 super remittance). Until this tab is configured, super batches must be downloaded as files for manual upload (existing FR-2.83 fallback).

`[Assumption: vendor selection between Beam, SuperChoice, ClickSuper, and equivalents is deferred to the planning phase; the spec captures the capability and contract surface independent of vendor]`

#### Captured fields

- **Registered Organisation Details** (read-only, derived from workspace org): ABN, Legal Name, Trading Name
- **Authoriser** — the user record nominated as the legally authorised approver for super payments. Captured fields: name, email, mobile, role/title. Must be a user of the workspace with the `super.authorise` permission.
- **Bank Account** — the workspace bank account that the clearing house will debit when remitting super
- **Clearing House Account Status** — connected / pending / disconnected; last-verified timestamp

#### Functional Requirements — Automatic Superannuation Tab

- **FR-2.167**: System MUST provide an Automatic Superannuation tab presenting registration status (connected / pending / disconnected), the registered organisation block (ABN, Legal Name, Trading Name — read-only from workspace), the nominated Authoriser, and the nominated debit Bank Account.
- **FR-2.168**: System MUST require Authoriser nomination (a workspace user with the `super.authorise` permission) before activation; the Authoriser's name, email, and mobile are submitted to the clearing house at registration.
- **FR-2.169**: System MUST allow the current Authoriser, and only the current Authoriser, to change the Authoriser nomination — preventing self-removal without a successor and protecting against unauthorised lateral takeover.
- **FR-2.170**: System MUST require re-authorisation when the registered ABN changes, the bank account changes, or after a 24-month inactivity window `[Assumption: 24-month re-authorisation cadence is a workspace policy default; the clearing house may impose a shorter cadence]`.
- **FR-2.171**: System MUST, when the clearing house is connected, expose a "Submit via clearing house" action on Super Payment Batches in `authorised` state (extending FR-2.83), replacing the file-download flow with an API submission.
- **FR-2.172**: System MUST track clearing house submission lifecycle on `SuperPaymentBatch`: clearing_house_message_id, submitted_at, accepted_at, paid_at, rejected_at, error_details — and reflect status transitions in the existing batch state machine (draft / authorised / submitted / paid / void).

---

## STP Integration Gateway — Readiness & Contract

Phase 1 left STP Gateway selection as a planning decision; this section formalises the **capability surface** the gateway must expose, the **HTTP contract** Ledgerly will speak to it, and the **registration / cutover / audit** flows the workspace admin will operate.

The intent is that vendor selection (Ozedi vs SuperChoice vs GovReports vs SSP-direct) is a commercial decision deferred to planning, but no requirement specified here is vendor-specific.

### Gateway Selection Criteria

`[Assumption: shortlist below is candidate-only; final vendor decision and contract negotiation occur in the planning phase]`

Shortlist:
- **Ozedi** — common Australian SMB-tier gateway, ATO-listed DSP
- **SuperChoice** — payroll-and-super combined provider
- **GovReports** — multi-channel reporting platform with STP coverage
- **SSP-direct** — direct registration as a Sending Service Provider with the ATO (highest control, highest operational burden)

Selection criteria (to be scored at planning):
1. STP Phase 2 full coverage (all income types, allowance categories, cessation reasons, lump sums)
2. Cost per submission (per-pay-event and per-finalisation)
3. Uptime SLA (target: >=99.9% monthly)
4. ATO-listed DSP (Digital Service Provider) status — non-negotiable
5. Support for Update Events and Full File Replacements (not just Pay Events)
6. Sandbox availability with realistic ATO-style acknowledgement responses
7. Authentication mechanism (preferred: machine-credential / OAuth2 client-credentials; fallback: API key)
8. Webhook or polling support for status updates
9. Support for Payday Super SG Superannuation Payment Date element (STP Phase 2 extension)

### Workspace-Level Credentials

Each workspace activating STP must provision the following, stored encrypted:

- **Software ID (SSID)** — issued by the ATO when the workspace registers the SBR2 software integration via Access Manager
- **ABN** — sourced from workspace organisation details (read-only on the STP settings page)
- **Branch Code** — for multi-branch employers; defaults to `001`
- **Authorised Contact** — the declarer captured for STP submissions per ATO requirements (name, role, phone, email)
- **Gateway API credentials** — vendor-specific (API key, OAuth client secret, machine credential certificate); stored using Laravel encryption (AES-256-CBC) consistent with TFN handling

### Registration Flow (Setup Wizard)

A first-time STP connect wizard with 5 steps:

1. **Confirm ABN + Branch** — read-only ABN from workspace, branch code editable (default `001`)
2. **Nominate Authorised Contact** — name, role, phone, email (declarer per ATO)
3. **Generate / Capture SSID** — wizard either (a) walks the admin through ATO Access Manager registration and pasting the SSID back, or (b) (preferred) initiates a machine-credential handshake with the gateway that returns the SSID
4. **Connection Test** — submits a "nil pay event" (zero-employee Pay Event) to the gateway and waits for an acceptance response
5. **Confirmation** — displays connected status, captures `activated_at` timestamp, transitions any parked pending submissions

Until the wizard completes successfully, pay runs **may still be finalised** (no blocking) but their STP submissions are queued in `pending_connection` state and surface a banner on the STP Filings page.

### Contract Surface (Gateway HTTP API)

The gateway MUST accept and respond to the following endpoints. Ledgerly is the client; the gateway is the server. All requests authenticated per the chosen mechanism (OAuth2 client credentials assumed below).

#### `POST /stp/pay-event`
Submit a pay event for a finalised pay run.

Request body (JSON):
```
{
  "workspace_id": "uuid",
  "submission_id": "ledgerly-internal-uuid",
  "pay_run_reference": "PR-2026-04-15-001",
  "abn": "12345678901",
  "branch_code": "001",
  "ssid": "encrypted",
  "period_start": "2026-04-01",
  "period_end": "2026-04-15",
  "payment_date": "2026-04-19",
  "declarer": { "name": "...", "role": "...", "phone": "...", "email": "..." },
  "employees": [
    {
      "tfn": "encrypted",
      "payee_id": "internal-employee-id",
      "name": "...",
      "income_type_code": "SAW",
      "tax_treatment_code": "RTSXXX",
      "gross": 0,
      "payg_withheld": 0,
      "super_liability_sg": 0,
      "super_payment_date": "2026-04-26",
      "categorised_earnings": [ { "category": "ordinary_time", "amount": 0 }, ... ],
      "allowances": [ { "code": "CD", "amount": 0 }, ... ],
      "deductions": [ { "code": "F", "amount": 0 }, ... ],
      "lump_sums": [ ... ],
      "salary_sacrifice_split": { "super_S": 0, "other_X": 0 },
      "ytd_totals": { ... }
    }
  ]
}
```

Response:
```
{ "gateway_message_id": "...", "status": "queued|accepted|rejected", "errors": [ ... ] }
```

#### `POST /stp/update-event`
Correction to a prior pay event. Body shape mirrors `/pay-event` with an additional `prior_gateway_message_id` field; only changed employees are submitted.

#### `POST /stp/full-file-replacement`
Replaces a prior submission entirely (used when an event has too many amendments to track via Update Events). Body includes `superseded_gateway_message_id`.

#### `POST /stp/finalisation`
End-of-financial-year finalisation event. Body includes financial year and per-employee final YTD totals; flags the EOY income statement as "Tax Ready" in myGov.

#### `GET /stp/submissions/{gateway_message_id}`
Polls the current status of a submission. Used as a fallback when webhook delivery is delayed.

#### `GET /stp/test-connection`
Lightweight handshake used by the registration wizard step 4 to verify credentials and connectivity. Returns gateway status, ATO-channel status, and a sandbox-vs-production indicator.

#### Webhook (gateway → Ledgerly)
Optional but preferred: gateway POSTs to `/api/v1/webhooks/stp/{workspace_id}` on submission status transitions (accepted / rejected). Payload includes `gateway_message_id`, new status, and error_details if rejected. Webhook signature verified via shared secret.

### Test Mode and Production Cutover

- A workspace-level **STP Mode** toggle: `sandbox` / `production`, set on the STP settings page
- In **sandbox**, all submissions route to the gateway sandbox environment; the gateway echoes simulated ATO-style acknowledgements; submissions are visible in the Filings page with a "SANDBOX" badge; never reach the ATO
- Production cutover is an explicit admin action requiring confirmation (typed workspace name) and captures `production_activated_at` and `production_activated_by_user_id`
- Once activated, the toggle is **disabled (locked) for 60 days** to prevent accidental data-pollution rollback `[Assumption: 60-day lock is a Trilogy / Ledgerly safety policy; not an ATO requirement]`. Beyond 60 days, an admin can request reversion which posts an audit-log entry but should be exceptionally rare

### Audit and Compliance

- Every STP submission persists: full request payload, full response payload, gateway_message_id, submitted_by_user_id, submitted_at, status transitions (with timestamps and source — webhook vs poll), error_details
- Submissions are **immutable** — no update or delete; corrections occur only via Update Events or Full File Replacements (existing FR-2.65)
- Retention: **7 years** per Tax Administration Act s262A and Fair Work Act s535 record-keeping requirements
- A read-only "STP Audit Log" view on the Filings page exposes the full submission history for any pay event

### Payday Super Implications

From 1 July 2026 (per the Treasury Laws Amendment (Payday Super) Act), super must be remitted within 7 days of payday. The STP Phase 2 schema accommodates this via the **SG Superannuation Payment Date** element on each employee record. The gateway MUST accept and forward this field unchanged to the ATO.

`[Assumption: gateway vendors will support this STP Phase 2 element by 1 July 2026; non-supporting vendors are disqualified at planning]`

### Functional Requirements — STP Gateway

- **FR-2.173**: System MUST provide a workspace-level STP Settings page (under `/payroll/settings` as a 7th sub-page or as a sibling page — `[Assumption: placement decided at planning; capabilities are independent of placement]`) capturing SSID, branch code, authorised contact, gateway credentials, and STP Mode (sandbox / production).
- **FR-2.174**: System MUST encrypt all gateway credentials and SSID at rest using Laravel encryption (AES-256-CBC), consistent with TFN handling per FR-2.134.
- **FR-2.175**: System MUST provide a 5-step Setup Wizard (Confirm ABN+Branch → Nominate Contact → Capture SSID → Connection Test (nil pay event) → Confirmation) and persist `activated_at` on success.
- **FR-2.176**: System MUST NOT block pay-run finalisation when STP is unconnected; queued submissions enter `pending_connection` state and surface a Filings-page banner.
- **FR-2.177**: System MUST submit Pay Events via `POST /stp/pay-event` with the contract payload defined in this section (workspace_id, submission_id, pay_run_reference, abn, branch_code, period dates, payment_date, declarer, per-employee block including TFN, income type, tax treatment code, categorised earnings, allowances, deductions, lump sums, salary sacrifice split, YTD totals, SG super payment date).
- **FR-2.178**: System MUST submit Update Events via `POST /stp/update-event` carrying `prior_gateway_message_id` and only the changed employee blocks.
- **FR-2.179**: System MUST submit Full File Replacement Events via `POST /stp/full-file-replacement` carrying `superseded_gateway_message_id` and the complete corrected payload.
- **FR-2.180**: System MUST submit Finalisation Events via `POST /stp/finalisation` per financial year, per workspace.
- **FR-2.181**: System MUST poll `GET /stp/submissions/{id}` as a fallback when no webhook acknowledgement is received within a configurable window (default 5 minutes), and on demand from the Filings page "Refresh status" action.
- **FR-2.182**: System MUST expose a webhook endpoint at `/api/v1/webhooks/stp/{workspace_id}` accepting status-transition payloads from the gateway, verifying signatures via a shared secret, and applying status updates idempotently by `gateway_message_id`.
- **FR-2.183**: System MUST support a workspace `stp_mode` toggle (sandbox / production); sandbox submissions are visibly badged "SANDBOX" on the Filings page and never reach the ATO.
- **FR-2.184**: System MUST require explicit production-cutover confirmation (typed workspace name) capturing `production_activated_at` and `production_activated_by_user_id`, and lock the `stp_mode` toggle for 60 days post-activation.
- **FR-2.185**: System MUST persist immutable submission records: full request payload, full response payload, gateway_message_id, submitted_by_user_id, submitted_at, status transition log (status, timestamp, source: webhook|poll|manual), error_details.
- **FR-2.186**: System MUST retain STP submission records for 7 years per Tax Administration Act s262A; deletion of submission records is prohibited (corrections via Update / Full File Replacement only).
- **FR-2.187**: System MUST include the SG Superannuation Payment Date STP Phase 2 element on every employee block in Pay Events from 1 July 2026 onward, derived from the workspace's payday-super calculation (FR-2.79).
- **FR-2.188**: System MUST present an STP Audit Log view on the Filings page, read-only, exposing the full submission history (request payload, response payload, all status transitions) for any pay event.

### Key Entities — STP Gateway Additions

- **STPGatewayConfig**: Workspace-level gateway connection record. Fields: workspace_id, gateway_vendor (ozedi / superchoice / govreports / ssp / other), ssid_encrypted, abn (denormalised from workspace), branch_code, authorised_contact_name, authorised_contact_role, authorised_contact_phone, authorised_contact_email, credentials_encrypted (JSON), stp_mode (sandbox / production), activated_at (nullable), production_activated_at (nullable), production_activated_by_user_id (nullable), production_lock_expires_at (nullable), webhook_shared_secret_encrypted, last_test_connection_at, last_test_connection_status.

- **STPSubmissionAuditEntry**: Immutable status-transition log per STPSubmission. Fields: stp_submission_id, status (pending / submitted / accepted / rejected / amended), source (webhook / poll / manual / system), occurred_at, actor_user_id (nullable), payload_snapshot_json (nullable for non-acknowledgement events), notes.

---

## Clarifications — Resolved

The following 30 decisions resolve ambiguities surfaced during self-clarification of this spec. Each represents a committed design call; they drive FR interpretation during planning. Any can be flipped on request before plan.md is written, but the defaults below are treated as canon for downstream work.

### Leave

1. **Leave accrual timing.** Accrual happens on pay-run finalise, based on ordinary hours worked in the pay period. Not on timesheet approval, not on time-of-work. This matches Xero behaviour and keeps accrual atomic with the already-audited pay run event.
2. **Full-time accrual formula.** Annual leave: `ordinary_hours × (152/1976)`. Personal leave: `ordinary_hours × (76/1976)`. 152 = 4 weeks × 38 hrs (NES). 76 = 10 days × 7.6 hrs (NES). 1976 = 52 × 38 ordinary hours per year. Part-time accrues on the same formula applied to actual ordinary hours.
3. **Casual loading.** Stored per-employee (not per-workspace). Default 25% per Fair Work Act. Applied to ordinary hours only — overtime uses its own multiplier and is not loaded.
4. **Leave paid rate.** Current base rate on the date leave is taken. No historical averaging. Matches Xero and simplifies audit.
5. **Leave cash-out tax treatment.** Cash-out of annual leave during employment is ordinary earnings (marginal tax). Only termination-time unused leave becomes Lump Sum A. STP categorisation: `paid leave — cash out in service`.
6. **Leave loading (17.5%).** Configurable per-employee boolean, OFF by default (modern award override required). When ON, loading is added as a separate earnings line on annual-leave-taken pay items and is STP-categorised as "annual leave loading".
7. **Public holidays inside leave periods.** The public holiday replaces leave for that day — balance is not deducted. Leave-request UI pre-calculates `leave_days = requested_days – public_holidays_in_range – weekends` using the employee's `work_state` holiday calendar.

### Timesheets

8. **Post-approval edits.** Admin-only, and the edit records a reason stored against the timesheet audit log. Employee self-edits after approval revert the status to `draft` and require re-approval.
9. **Pay-run import of timesheets.** Pay-run draft auto-pulls all approved timesheets within the pay period for in-scope employees. Admin sees and can override hours before finalise. Unapproved timesheets are surfaced as warnings, not hard blocks.
10. **Overtime thresholding.** Manual entry only for Phase 2 — no automatic conversion of hours >38/week into overtime. Employees log ordinary + overtime as separate line items on the timesheet. Award-based automatic conversion is Phase 3.

### Pay Calendars & Rates

11. **Calendars per employee.** One pay calendar assigned per employee at any point in time. Calendar changes are effective-dated (future only) and the prior calendar remains the source of truth for historical pay runs.
12. **Past-dated pay rate changes.** Blocked. Effective date must be ≥ today. Retro corrections are modelled as a one-off "Pay Adjustment" earnings line on the next pay run, preserving audit clarity.

### STP & Super

13. **Update Event triggers.** Any mutation to a finalised pay run automatically queues an STP Update Event. Admin can also manually trigger an Update Event from the pay run detail page without mutating the pay run (e.g., to correct a TFN typo that only affected STP reporting).
14. **STP failure and payroll blocking.** STP submission failures are non-blocking. The pay run remains finalised, wages are payable, and new pay runs can be finalised while the failed STP is being resolved. The STP failure is surfaced on the overview dashboard and via notification.
15. **Super batch scope.** Admin picks a date range (defaults to "last quarter" or "since last batch"). Preview groups unpaid super liability from finalised pay runs by fund with employee-level breakdown. Admin confirms, authoriser approves, clearing-house submits.
16. **Stapled fund lookup.** Out of scope for v1. Field captured on employee record; admin enters the stapled fund manually during onboarding based on the ATO letter or employee declaration. ATO Stapled Fund API integration deferred to Phase 3.
17. **Payday Super "payday" definition.** The payment date (not period end). The 7-day SG remittance window starts from `payment_date`. STP Pay Event includes the nominated super payment date per STP Phase 2 SG Payment Date element.
18. **STP test mode scope.** Workspace-level toggle (not per-pay-run). All STP submissions while the toggle is ON route to the gateway sandbox and never reach the ATO. Production cutover is a one-way door for 60 days (per FR-2.184) to prevent accidental re-entry to test mode mid-quarter.

### Payslips & Portal

19. **Payslip auto-email.** ON by default; configurable in Settings → Payroll → Organisation → Payslip Options. Fires on pay-run finalise, per-employee, using 023-EML transactional template. Can be disabled for workspaces that distribute payslips manually.
20. **Payslip PDF generation.** Stored as an immutable PDF attachment on finalise (posted to S3 via 012-ATT). Re-issues create a new PDF with a "Replaces payslip #X" footer; the original remains in history. No on-demand regeneration — the PDF on record is the canonical record.
21. **Portal access scope.** Invite-based per-employee. Admin triggers the invite from the employee detail page; the invite carries a signed token and expires in 14 days. Inviting is opt-in per employee, not bulk-default-on.
22. **Self-edit of sensitive fields.** Two-tier model. Tier 1 (address, phone, emergency contact, personal email) applies immediately with audit log. Tier 2 (bank account, super fund, TFN declaration changes) queues an admin approval task in the attention queue (018-ITR); the change is pending until approved and the old values continue to apply.

### Termination & Deductions

23. **Termination unused leave payout.** Final pay run for a terminated employee auto-populates with: unused annual leave × current rate, unused LSL × current rate (if eligible under state-specific rules — basic qualifying only in Phase 2), plus optional ETP component. Admin reviews and can override. Auto-population is a convenience; the admin still confirms every line.
24. **ETP cap enforcement.** Hard-enforced. Current FY ETP cap (Type R / Type O) is sourced from an annually-refreshed ATO rate table in the workspace, not hard-coded in the app. Excess above cap is split into a separate "ETP above cap" line with different tax treatment per ATO guidance.
25. **Deduction order of operations.** Strict sequence: `gross earnings → PAYG → statutory deductions (child support, court-ordered garnishments) → salary sacrifice (super, then non-super) → voluntary deductions (union, workplace giving) → net pay`. Statutory deductions run before salary sacrifice to preserve court order priority.
26. **Protected Earnings Amount.** Auto-enforced on child support and garnishments. The weekly PEA is sourced from the Services Australia annual rate table stored in the workspace (refreshed each FY). Child support is capped such that `gross – PAYG – child_support ≥ PEA`; any uncollected amount carries forward per CSRS rules.

### Structure & Reports

27. **Employee groups hierarchy.** Flat list for Phase 2. No parent/child cost centres. Hierarchical groups (e.g., "Sales → APAC → Sydney") deferred to Phase 3.
28. **Pay items scope.** Library lives at workspace level. Per-employee overrides happen through the employee's Pay Template (which selects pay items from the library and sets rates/amounts). Employee Groups don't own pay items — they only affect GL account mapping.
29. **Report export formats.** CSV and PDF for Phase 2. XLSX via the shared export utility from 043-CRB if available at implementation time; otherwise XLSX deferred.
30. **Financial year rollover.** Automatic on 1 July AEST. Prior FY locks 14 days after year-end (14 July) to give admins time to finalise STP without a permanent lock blocking corrections. After lock, corrections require an "unlock FY" admin action that logs who unlocked and why.

---

## Regulatory References

| Obligation | Authority | Key Requirement | Spec Sections |
|---|---|---|---|
| Single Touch Payroll Phase 2 | Tax Administration Act 1953, Div 389; ATO STP Phase 2 Business Implementation Guide | Report every pay event with disaggregated income types, allowance categories, salary sacrifice splits, cessation reasons | US8, FR-2.60 to FR-2.72 |
| Payday Super | Treasury Laws Amendment (Payday Super) Bill / Act 2025 | Super paid within 7 days of payday from 1 July 2026 | US10, FR-2.79, FR-2.86 |
| Superannuation Guarantee | Superannuation Guarantee (Administration) Act 1992 | 12% of OTE (FY2025-26 onward), max contribution base | US9, US10, FR-2.73 to FR-2.86 |
| Super Choice & Stapled Fund | Treasury Laws Amendment (Your Super, Your Choice) Act 2020 | Employer must follow stapled fund rules for new starters | US9, FR-2.77 |
| PAYG Withholding | Income Tax Assessment Act 1997; ATO Schedule 1 (NAT 1004) | Withhold per coefficient formula y = ax - b | Phase 1 (existing) |
| PAYG on Bonuses | ATO Schedule 5 (NAT 7905) | Method A / B(ii) for one-off payments | US6, FR-2.50 |
| PAYG on Termination | ATO Schedule 7 (NAT 3346) | Marginal-rate method for unused leave; concessional rates for pre-1978 LSL | US11, FR-2.89, FR-2.90 |
| PAYG on HELP/HECS/SFSS | ATO Schedule 8 (NAT 3539) | Additional withholding per study loan thresholds | Phase 1 (existing) |
| ETP Tax Treatment | Income Tax Assessment Act 1997, s82-130; ATO Schedule 11 (NAT 70980) | ETP cap, preservation age rates, Type O / R / T categorisation | US11, FR-2.91, FR-2.92 |
| Pay Slips | Fair Work Act 2009, s536; Fair Work Regulations 2009, r3.46 | Issue within 1 working day, prescribed minimum content | US14, FR-2.113 |
| Annual Leave | Fair Work Act 2009, NES Part 2-2 Div 6 | 4 weeks/year (5 for shift workers — out of scope), accrues from day 1, paid out on termination, max 8 weeks excessive balance threshold, residual 4 weeks after cash-out | US1, FR-2.3, FR-2.8 |
| Personal/Carer's Leave | Fair Work Act 2009, NES Part 2-2 Div 7 | 10 days/year, accrues from day 1, not paid out on termination | US1, FR-2.3 |
| Long Service Leave | State-specific Acts (NSW LSL Act 1955, VIC LSL Act 2018, etc.); portable schemes (CoINVEST, QLeave) | Generally 2 months after 10 years; varies by state | US1 (basic accrual only); state-specific deferred to Phase 3 |
| Public Holidays | Fair Work Act 2009, s115; state public holiday acts | Paid as ordinary hours if normally working day; penalty rates for work performed | US3, FR-2.20 to FR-2.23 |
| Garnishments — Child Support | Child Support (Registration and Collection) Act 1988, s72A | Protected Earnings Amount applies; remit to Services Australia | US12, FR-2.99 |
| Garnishments — Bankruptcy | Bankruptcy Act 1966 | Trustee deductions per income contribution scheme | US12, FR-2.98 |
| Privacy & TFN | Privacy Act 1988; TFN Rule 2015 (s17 of Privacy Act) | TFN collection limited to lawful purposes; secure storage; restricted access; cannot be used as identifier | FR-2.134, SC-2.19 |
| Record Keeping | Fair Work Act 2009, s535-536C; Tax Administration Act, s262A | Employee records (including pay records, leave, tax) retained 7 years | Cross-cutting; covered in privacy notice and data retention policy |
| Workers Compensation | State-specific Workers Comp Acts | Premium based on declared wages; annual declaration | Out of scope (captured as future epic) |
| Fringe Benefits Tax | Fringe Benefits Tax Assessment Act 1986 | Annual FBT return, RFB amounts on STP | Out of scope (deferred) |
| Workplace Giving | Tax Administration Act 1953 | Pre-tax deductions to DGRs; reported on STP | US12, FR-2.45 |

---

## Open Questions for Planning Phase

These are flagged inline above with `[Assumption: ...]` markers. Summarised here for visibility during plan.md generation:

1. **Long Service Leave default accrual rate** — Phase 2 assumes 1/60 of ordinary hours as a workspace-configurable default. State-specific rules (NSW = 8.667 weeks after 10 years, VIC = 8.667 weeks after 7 years pro-rata, etc.) deferred to Phase 3.
2. **Penalty rates for public holiday work** — Phase 2 uses workspace-configurable default (e.g., 2.5x). Per-Award penalty rules deferred to Phase 3.
3. **Stapled Super Fund API** — Phase 2 captures the request and stores manually-retrieved details. Live ATO Stapled Super Fund API integration deferred to Phase 3.
4. **SuperStream API** — Phase 2 generates payment files (CSV / SuperStream-compatible format) for manual upload. Native SuperStream message construction and submission deferred to Phase 3.
5. **STP Gateway selection** — vendor TBD during planning. Spec is gateway-agnostic.
6. **USI validation against ATO Fund Validation Service** — Phase 2 validates format only; live FVS lookup deferred.
7. **ETP / redundancy thresholds & HELP repayment thresholds** — Phase 2 maintains as workspace-configurable reference data refreshed annually. Source of truth is ATO published rates.
8. **Bonus tax method (A vs B(ii))** — Phase 2 defaults to Method B(ii), admin can override to Method A per pay run line.
9. **Excessive leave threshold** — Phase 2 assumes 8 weeks. Some Awards specify different thresholds — flag only, not enforce.
10. **Workspace fiscal year vs payroll year** — Phase 2 fixes payroll year to 1 July - 30 June regardless of workspace fiscal year setting. Worth confirming at planning.
