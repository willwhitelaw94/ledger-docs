---
title: "Feature Specification: Payroll & HR"
---

# Feature Specification: Payroll & HR

**Feature Branch**: `064-PAY-payroll-hr`
**Created**: 2026-03-21
**Status**: Draft
**Epic**: 064-PAY
**Initiative**: FL -- Financial Ledger Platform
**Effort**: XL (Mega Epic -- 9+ sprints across 3 phases)
**Depends On**: 002-CLE (complete -- core ledger engine for journal entries), 044-TAX (complete -- BAS integration for W1/W2 fields)

### Out of Scope

- **Direct ATO STP certification (DSP registration)** -- STP submission will use an integration gateway for v1; pursuing DSP certification directly requires 3-6 months of conformance testing and is deferred to a later phase
- **Award interpretation engine** -- Modern Awards have 100+ variations with complex penalty rate calculations; v1 supports manual pay rates only (salary and hourly). Award engines like Employment Hero can be integrated later
- **Payroll tax (state-based)** -- only affects employers with $1M+ annual wages; most small businesses are below all state thresholds. State tracking is captured from day one but calculation is deferred
- **Long service leave** -- state-specific accrual rules vary significantly (7-10 year qualifying periods, different rates per state, portable schemes in some industries). Deferred to Phase 3+
- **Timesheets and rostering** -- time tracking integration is a separate feature. v1 uses manual hours entry per pay run
- **Employee self-service portal** -- employee-facing login for viewing payslips and requesting leave is a Phase 2 enhancement
- **Employment Termination Payments (ETP)** -- complex tax treatment with different caps and rates; deferred until termination processing is built in Phase 2
- **Fringe benefits tracking** -- FBT is a separate annual obligation with its own reporting; out of scope for payroll MVP
- **Multi-state payroll tax apportionment** -- grouped entity threshold sharing across states is deferred
- **ABA file generation** -- bank payment files for bulk wage transfers deferred to Phase 2 (employers can pay via normal bank transfer in v1)
- **SuperStream/clearing house integration** -- electronic super payment to funds via clearing house; v1 calculates the liability and posts the journal entry but super is remitted manually or via the employer's existing super payment method

---

## Overview

MoneyQuest users who employ staff currently manage payroll in a separate system and manually re-key wages, PAYG withholding, and superannuation as journal entries into the ledger. This creates double handling, introduces errors, and fragments the financial picture -- employee costs are invisible until month-end reconciliation.

This epic builds a native payroll engine within MoneyQuest. Employees are set up with personal details, tax file number, bank account, and super fund. Pay runs calculate gross wages, PAYG withholding (using ATO Schedule 1 coefficient formulas), superannuation guarantee at 12%, and leave accruals. When a pay run is finalised, the system automatically posts a compound journal entry debiting wages expense and crediting PAYG liability, super liability, leave provisions, and net wages payable -- closing the loop between payroll and the general ledger without manual data entry.

**Critical regulatory context**: Payday Super commences 1 July 2026, requiring employers to pay superannuation within 7 days of each payday (replacing quarterly). The payroll engine is designed from the start for per-pay-run super calculations, not quarterly.

STP Phase 2 reporting to the ATO is handled via an integration gateway for v1 (the SBR2/XBRL protocol is too complex for initial build). This allows MoneyQuest to offer compliant payroll reporting while deferring the multi-month DSP certification process.

---

## Phasing

### Phase 1 -- Payroll Engine MVP (3 sprints)

The minimum viable payroll that replaces external payroll for small businesses (1-20 employees, salary and hourly workers, no award complexity).

| Story | Capability | Priority |
|-------|-----------|----------|
| US1 | Employee records (personal, tax, bank, super) | P1 |
| US2 | Create and process a pay run | P1 |
| US3 | PAYG withholding calculation | P1 |
| US4 | Superannuation calculation | P1 |
| US5 | Auto-posted pay run journal entries | P1 |

**Exit criteria**: A business owner can add employees, run payroll, see correct PAYG and super calculated, and have journal entries posted to the ledger automatically.

### Phase 2 -- Compliance and Visibility (3 sprints)

Leave management, pay slips, STP reporting, and BAS integration -- the features that make payroll genuinely useful day-to-day and compliant with ATO obligations.

| Story | Capability | Priority |
|-------|-----------|----------|
| US6 | Leave accrual and balances | P2 |
| US7 | Pay slips | P2 |
| US8 | BAS integration (W1, W2 fields) | P2 |
| US9 | STP Phase 2 reporting (via gateway) | P2 |

**Exit criteria**: Employees receive pay slips, leave balances accrue correctly, payroll data flows into BAS, and pay events are reported to the ATO via STP.

### Phase 3 -- Advanced Features (3+ sprints)

Employee dashboard, pay history, termination processing, allowances/deductions, HELP/HECS, ABA file generation, employee self-service, SuperStream integration, and ultimately direct DSP certification.

| Story | Capability | Priority |
|-------|-----------|----------|
| US10 | Pay history and reporting | P3 |

**Exit criteria**: Full payroll reporting, termination handling, and advanced payroll features for complex employment arrangements.

---

## User Scenarios & Testing

### User Story 1 -- Add an Employee (Priority: P1)

A business owner hiring their first employee wants to set up the employee's payroll details in MoneyQuest so they can be included in pay runs. Today this information lives in a spreadsheet or external payroll system with no connection to the accounting ledger.

**Why this priority**: Employees are the foundational entity for payroll. Nothing else works without employee records. This is the entry point for the entire module.

**Independent Test**: Can be tested by creating an employee record and verifying all required fields are captured and validated. No other payroll features are required.

**Acceptance Scenarios**:

1. **Given** the business owner has payroll enabled for their workspace, **When** they navigate to Payroll and click "Add Employee", **Then** they see a form capturing: first name, last name, date of birth, email, phone, start date, employment type (full-time, part-time, casual), pay basis (salary or hourly), pay rate, and work state/territory.

2. **Given** the employee form is open, **When** the business owner enters the employee's tax file number (TFN), **Then** the system validates it is a 9-digit number and stores it securely. If no TFN is provided, the system flags the employee for "no TFN" withholding (Scale 4 -- 47% flat rate).

3. **Given** the employee form includes tax declaration details, **When** the business owner selects whether the employee claims the tax-free threshold, has a HELP/HECS debt, and their residency status, **Then** the system determines the correct tax scale (Scale 1: no threshold, Scale 2: threshold claimed, Scale 3: foreign resident, Scale 4: no TFN).

4. **Given** the employee form includes bank details, **When** the business owner enters BSB and account number, **Then** the system validates the BSB is 6 digits and the account number is 6-9 digits.

5. **Given** the employee form includes super fund details, **When** the business owner enters the fund name, USI (Unique Superannuation Identifier), and member number, **Then** the system stores the super fund for use in superannuation calculations.

6. **Given** an employee has been created, **When** the business owner views the employee list, **Then** they see a table showing: employee name, employment type, pay rate, start date, and status (active/inactive).

7. **Given** an employee needs to be updated (e.g., pay rise, new bank details), **When** the business owner edits the employee record, **Then** the changes take effect from the next pay run. The previous details are retained in history for audit.

8. **Given** an employee leaves the business, **When** the business owner marks them as "terminated" with a cessation date and reason, **Then** the employee is excluded from future pay runs and their termination details are recorded for STP finalisation.

---

### User Story 2 -- Create and Process a Pay Run (Priority: P1)

A business owner wants to pay their employees for a pay period. They need to select which employees to pay, confirm hours worked (for hourly employees), review the calculated amounts, and finalise the pay run. Today this is done in an external system and then manually journalled.

**Why this priority**: The pay run is the core transaction of payroll -- everything else (PAYG, super, leave, STP) hangs off it. Without pay runs, there is no payroll.

**Independent Test**: Can be tested by creating a pay run for employees with known rates/hours and verifying the gross, net, and component calculations match expected values.

**Acceptance Scenarios**:

1. **Given** active employees exist in the workspace, **When** the business owner clicks "New Pay Run", **Then** they see a form to select: pay period type (weekly, fortnightly, monthly), pay period start date, pay period end date, and payment date.

2. **Given** a pay run has been created, **When** the system loads the pay run details, **Then** all active employees are included with their pay pre-filled: salaried employees show their per-period salary amount; hourly employees show their hourly rate with a blank hours field to be filled in.

3. **Given** an hourly employee, **When** the business owner enters 38 hours at $30/hour, **Then** the gross pay shows $1,140.00 and PAYG, super, and net are calculated accordingly.

4. **Given** a salaried employee earning $80,000/year paid fortnightly, **When** the pay run calculates, **Then** the gross pay shows $3,076.92 (80,000 / 26 fortnights) with corresponding PAYG and super calculations.

5. **Given** the pay run shows calculated amounts for all employees, **When** the business owner reviews the summary, **Then** they see per-employee breakdown (gross, PAYG withheld, super, net pay) and pay run totals (total gross, total PAYG, total super, total net).

6. **Given** the business owner has reviewed the pay run, **When** they click "Finalise Pay Run", **Then** the pay run status changes from "Draft" to "Finalised", journal entries are auto-posted (see US5), and the pay run becomes immutable.

7. **Given** a finalised pay run contains an error, **When** the business owner needs to correct it, **Then** they must create a new pay run with an adjustment (add or deduct) for the affected employee in the next period -- finalised pay runs cannot be edited or deleted.

8. **Given** no employees are active in the workspace, **When** the business owner attempts to create a pay run, **Then** the system shows a message directing them to add employees first.

---

### User Story 3 -- PAYG Withholding Calculation (Priority: P1)

The system needs to calculate the correct amount of tax to withhold from each employee's pay, following ATO Schedule 1 formulas. Incorrect withholding exposes the employer to ATO penalties and leaves employees with unexpected tax bills at year-end.

**Why this priority**: PAYG withholding is a legal obligation on every pay event. Getting the calculation wrong has direct financial and compliance consequences. This must be correct from the first pay run.

**Independent Test**: Can be tested by calculating PAYG for known earnings amounts across each tax scale and comparing results against the ATO's published tax table lookup values.

**Acceptance Scenarios**:

1. **Given** an employee claims the tax-free threshold (Scale 2) and earns $1,000 gross per week, **When** the pay run calculates PAYG, **Then** the withheld amount matches the ATO Schedule 1 formula: `y = ax - b` where `a` and `b` are the coefficients for the employee's weekly earning range.

2. **Given** an employee does NOT claim the tax-free threshold (Scale 1 -- second job), **When** the pay run calculates PAYG for the same $1,000/week, **Then** the withheld amount is higher than Scale 2 (no tax-free threshold benefit) and matches the Scale 1 coefficients.

3. **Given** an employee has not provided a TFN (Scale 4), **When** the pay run calculates PAYG, **Then** the system withholds at the flat rate of 47% of gross pay.

4. **Given** an employee is a foreign resident (Scale 3), **When** the pay run calculates PAYG, **Then** the system uses Scale 3 coefficients (no tax-free threshold, no Medicare levy, foreign resident rates apply).

5. **Given** the pay run is fortnightly, **When** the system calculates PAYG, **Then** it converts the fortnightly earnings to a weekly equivalent (divide by 2), applies the weekly formula, and multiplies the result by 2 to get the fortnightly withholding. Monthly pay runs use the equivalent conversion (multiply by 12, divide by 52, calculate, multiply by 52/12).

6. **Given** the employee has a HELP/HECS debt flagged on their record, **When** the pay run calculates, **Then** the HELP repayment amount is calculated separately using Schedule 8 coefficients and added to the total withholding amount.

7. **Given** the ATO publishes updated tax table coefficients (annually each July), **When** the new financial year begins, **Then** the updated coefficients are used for all pay runs with a payment date on or after 1 July.

---

### User Story 4 -- Superannuation Calculation (Priority: P1)

The system must calculate the employer's superannuation guarantee obligation for each employee based on their ordinary time earnings. With Payday Super commencing 1 July 2026, super must be calculated and tracked per pay run, not quarterly.

**Why this priority**: Super guarantee is a mandatory employer obligation. Under-payment triggers the Super Guarantee Charge (SGC) which includes interest and penalties. Payday Super makes per-pay-run accuracy critical.

**Independent Test**: Can be tested by calculating super for known OTE amounts and verifying the result equals 12% of ordinary time earnings, respecting the maximum contribution base.

**Acceptance Scenarios**:

1. **Given** a full-time employee with gross pay of $5,000 (all ordinary time), **When** the pay run calculates super, **Then** the super guarantee amount is $600.00 (12% of $5,000).

2. **Given** an employee earns overtime in addition to ordinary hours, **When** the pay run calculates super, **Then** the super is calculated on ordinary time earnings only -- overtime is excluded from the super base.

3. **Given** an employee's quarterly earnings exceed the maximum super contribution base ($62,500 for 2025-26), **When** the pay run calculates super, **Then** the super is capped at 12% of the maximum contribution base for that quarter. Earnings above the cap do not attract additional super.

4. **Given** a casual employee who earns $450 in a pay period, **When** the pay run calculates super, **Then** super is calculated on the full amount -- there is no minimum earnings threshold for super guarantee (the $450/month threshold was removed from 1 July 2022).

5. **Given** an employee has a salary sacrifice arrangement, **When** the pay run calculates, **Then** the salary sacrifice amount reduces the employee's gross taxable pay but the employer's SG obligation is still calculated on the pre-sacrifice ordinary time earnings.

6. **Given** a pay run is finalised, **When** the business owner views the super liability, **Then** they see the total super payable per fund (grouped by each employee's nominated super fund), with a due date reflecting the 7-day Payday Super requirement.

---

### User Story 5 -- Auto-Posted Pay Run Journal Entries (Priority: P1)

When a pay run is finalised, the system must automatically post a compound journal entry to the general ledger -- debiting wages expense and crediting the relevant liability accounts. This is the key integration that eliminates double-entry between payroll and accounting.

**Why this priority**: Automatic journal posting is the core value proposition of integrated payroll. Without it, users still need to manually journal payroll -- the same problem that exists today with separate systems.

**Independent Test**: Can be tested by finalising a pay run and inspecting the resulting journal entry. Verify all debits equal all credits and the correct accounts are used.

**Acceptance Scenarios**:

1. **Given** a pay run is finalised with total gross wages of $10,000, PAYG withheld of $2,200, super of $1,200, and leave accrued of $769, **When** the journal entry is posted, **Then** the following entry is created:
   - Debit: Wages and Salaries Expense -- $10,000 (gross wages)
   - Debit: Superannuation Expense -- $1,200 (employer SG)
   - Credit: PAYG Withholding Payable -- $2,200 (tax withheld)
   - Credit: Superannuation Payable -- $1,200 (super owed to funds)
   - Credit: Annual Leave Provision -- $769 (leave accrued this period)
   - Credit: Net Wages Payable -- $5,831 (net pay owed to employees)

2. **Given** the pay run journal entry is posted, **When** the business owner views the journal entry, **Then** the entry references the pay run (linked to the pay run record) with a description including the pay period dates (e.g., "Pay Run: 1 Mar - 14 Mar 2026").

3. **Given** the pay run journal entry is posted, **When** the business owner views the Wages and Salaries Expense account, **Then** the period's wage costs are visible alongside other expenses, contributing to the Profit and Loss report.

4. **Given** the employer pays the net wages to employees via bank transfer, **When** the bank transaction is reconciled, **Then** it clears the Net Wages Payable account (debit Net Wages Payable, credit Bank).

5. **Given** the employer remits PAYG to the ATO, **When** the payment is reconciled, **Then** it clears the PAYG Withholding Payable account (debit PAYG Withholding Payable, credit Bank).

6. **Given** the employer pays super to the employee's fund, **When** the payment is reconciled, **Then** it clears the Superannuation Payable account (debit Superannuation Payable, credit Bank).

7. **Given** the workspace does not yet have payroll-specific chart of accounts, **When** the first employee is added, **Then** the system ensures all required payroll accounts exist (Wages Expense, PAYG Withholding Payable, Superannuation Payable, Annual Leave Provision, Net Wages Payable) -- seeding any that are missing from the existing `has_employees` overlay.

---

### User Story 6 -- Leave Accrual and Balances (Priority: P2)

An employee wants to know how much leave they have available. The business owner needs leave balances tracked automatically based on hours worked, visible on the employee record, and deducted when leave is taken during a pay run.

**Why this priority**: Leave tracking is not required for the first pay run but is essential for ongoing payroll. Incorrect leave records create disputes and legal exposure. This is the first feature employees themselves care about.

**Independent Test**: Can be tested by running multiple pay periods and verifying leave accrual matches the NES formula, then applying leave taken and checking the balance reduces correctly.

**Acceptance Scenarios**:

1. **Given** a full-time employee has completed a pay period (fortnightly, 76 ordinary hours), **When** the pay run is finalised, **Then** the employee accrues annual leave of 5.846 hours (76 hours * 4 weeks / 52 weeks) and personal leave of 2.923 hours (76 hours * 10 days / 52 weeks / 5 days).

2. **Given** a part-time employee works 20 hours per week, **When** the pay run is finalised, **Then** annual leave accrues pro-rata: 20/38 of the full-time accrual rate. Personal leave accrues similarly.

3. **Given** a casual employee, **When** the pay run is finalised, **Then** no leave accrues (casuals receive a 25% loading in lieu of leave entitlements).

4. **Given** an employee takes 3 days (22.8 hours) of annual leave during a pay period, **When** the business owner records the leave in the pay run, **Then** the employee is paid for those hours as "annual leave taken" (included in gross pay), and the leave balance is reduced by 22.8 hours.

5. **Given** an employee's leave balance is displayed on their record, **When** the business owner views the employee detail page, **Then** they see current balances for annual leave and personal/carer's leave, including accrued-to-date, taken-to-date, and net balance in hours.

6. **Given** an employee is terminated, **When** the final pay run is processed, **Then** all accrued but untaken annual leave is paid out at the employee's current rate. Personal/carer's leave is not paid out (per NES).

7. **Given** leave has accrued across multiple pay periods, **When** the financial year ends, **Then** unused leave balances roll over to the next year (no use-it-or-lose-it for NES entitlements).

---

### User Story 7 -- Pay Slips (Priority: P2)

After each pay run, employees must receive a pay slip detailing their gross pay, deductions, super, net pay, and leave balances. Pay slips are a legal requirement under Fair Work -- employers must issue them within 1 working day of payment.

**Why this priority**: Pay slips are a legal obligation, not optional. However, they are not required to calculate and post payroll -- they are an output artefact. Phase 1 can run without them temporarily, but they must follow quickly.

**Independent Test**: Can be tested by generating a pay slip for a completed pay run and verifying all required fields are present and amounts are correct.

**Acceptance Scenarios**:

1. **Given** a pay run has been finalised, **When** the system generates pay slips, **Then** each employee's pay slip includes: employer name and ABN, employee name, pay period dates, payment date, gross earnings (itemised by type), PAYG withheld, super contribution, any deductions, net pay, and year-to-date totals for gross, PAYG, and super.

2. **Given** the employee has leave balances, **When** the pay slip is generated, **Then** it shows current leave balances for annual leave and personal/carer's leave (in hours).

3. **Given** a pay slip has been generated, **When** the business owner views the pay run, **Then** they can download individual pay slips as PDF or download all pay slips for the pay run as a single combined PDF.

4. **Given** the employee has an email address on file, **When** the pay run is finalised, **Then** the business owner can send pay slips via email to all employees (or selected employees) with a single action.

5. **Given** a historical pay run, **When** the business owner or employee needs to retrieve an old pay slip, **Then** pay slips are accessible from the employee's record under a "Pay History" tab, listed by pay period.

---

### User Story 8 -- BAS Integration for W1 and W2 Fields (Priority: P2)

When the business prepares their BAS (Business Activity Statement), the payroll data must automatically flow into the W1 (total wages paid) and W2 (PAYG withheld) fields. Today, businesses manually calculate these figures from their payroll system and enter them into the BAS.

**Why this priority**: BAS is lodged quarterly (or monthly). Getting W1 and W2 wrong triggers ATO penalties. Automatic population from payroll data eliminates manual calculation errors and saves time during BAS preparation.

**Independent Test**: Can be tested by running pay runs for a quarter and verifying the BAS W1 and W2 fields match the sum of gross wages and PAYG withheld from all pay runs in that period.

**Acceptance Scenarios**:

1. **Given** pay runs have been finalised for a BAS period (quarter or month), **When** the business owner opens BAS preparation, **Then** the W1 field (total salary, wages and other payments) is auto-populated with the sum of gross wages from all pay runs in the period.

2. **Given** the W1 field is populated, **When** the business owner views the W2 field (amounts withheld from salary and wages), **Then** it is auto-populated with the sum of PAYG withheld from all pay runs in the period.

3. **Given** the payroll data populates W1 and W2, **When** the business owner reviews the BAS, **Then** they can drill down from W1 to see each contributing pay run, and from W2 to see the corresponding PAYG amounts per pay run.

4. **Given** a pay run was finalised after the BAS period end but relates to that period, **When** the BAS calculates W1 and W2, **Then** the system includes pay runs based on the pay period dates (not the finalisation date) to ensure correct period attribution.

5. **Given** no payroll feature is enabled for the workspace, **When** the business owner opens BAS preparation, **Then** W1 and W2 fields are blank (or zero) with a note that payroll integration is available.

---

### User Story 9 -- STP Phase 2 Reporting via Gateway (Priority: P2)

After each pay run, the system must report payment details to the ATO via Single Touch Payroll Phase 2. For v1, this is achieved through an STP gateway integration rather than direct ATO submission, avoiding the multi-month DSP certification process while still meeting employer reporting obligations.

**Why this priority**: STP reporting is mandatory for all employers. Without it, MoneyQuest payroll cannot be used as a compliant payroll system -- employers would still need to report via another tool. However, it is not required for the core payroll calculation engine to function.

**Independent Test**: Can be tested by finalising a pay run and verifying the STP payload is constructed correctly with all Phase 2 disaggregated fields, then confirming the gateway accepts the submission.

**Acceptance Scenarios**:

1. **Given** a pay run has been finalised, **When** the system prepares the STP submission, **Then** it constructs a payload containing per-employee: gross (disaggregated into salary/wages, overtime, bonuses), PAYG withheld, superannuation (SG, salary sacrifice if applicable), and the employee's tax treatment code (6-character code reflecting their tax scale, threshold claim, HELP status, and Medicare variations).

2. **Given** the STP payload is ready, **When** the system submits via the gateway, **Then** it receives a confirmation receipt and records the submission status against the pay run (submitted, accepted, rejected).

3. **Given** the ATO rejects an STP submission with errors, **When** the error response is received, **Then** the system displays the specific error details and allows the business owner to correct the data and resubmit.

4. **Given** it is end of financial year, **When** the business owner triggers STP finalisation, **Then** the system sends a finalisation event for each employee declaring that all reporting for the financial year is complete. This must happen by 14 July following EOFY.

5. **Given** an employee's details need correction after a pay event has been reported, **When** the business owner submits an STP update event, **Then** the corrected data replaces the previous submission for that employee and period.

6. **Given** the STP gateway is unavailable, **When** the pay run is finalised, **Then** the STP submission is queued and retried automatically. The pay run itself is not blocked by STP submission failure -- payroll processing and STP reporting are decoupled.

---

### User Story 10 -- Pay History and Reporting (Priority: P3)

A business owner or their accountant wants to view payroll history and generate reports for analysis, audit, or compliance. They need to see past pay runs, employee earnings over time, total payroll costs by period, and super contributions by fund.

**Why this priority**: Reporting enhances visibility but is not required for the core payroll workflow. The ledger journal entries already provide financial reporting via existing reports (P&L, Balance Sheet). Payroll-specific reports add convenience and detail.

**Independent Test**: Can be tested by running multiple pay periods and generating reports, then verifying totals match the sum of individual pay runs.

**Acceptance Scenarios**:

1. **Given** multiple pay runs have been finalised, **When** the business owner views the Pay Run History page, **Then** they see a list of all pay runs ordered by payment date, showing: period dates, payment date, total gross, total PAYG, total super, total net, number of employees, and status.

2. **Given** the business owner wants to see an individual employee's pay history, **When** they view the employee's record, **Then** a "Pay History" section shows all pay runs the employee was included in, with per-period breakdowns of gross, PAYG, super, leave taken, and net pay.

3. **Given** the business owner needs a payroll summary report for a date range, **When** they generate the report, **Then** it shows: total wages by employee, total PAYG withheld, total super by fund, total leave accrued and taken, and a grand total row.

4. **Given** an accountant is reviewing payroll for year-end, **When** they generate a financial year summary, **Then** they see per-employee totals for the year: gross earnings, PAYG withheld, super paid, leave balances -- matching what will appear on the employee's income statement via STP finalisation.

5. **Given** the business owner wants to understand payroll costs by period, **When** they view the payroll dashboard widget, **Then** they see a summary card showing: current period payroll cost, headcount, average cost per employee, and trend compared to the previous period.

---

### Edge Cases

- **What happens when an employee has no TFN?** -- The system applies Scale 4 (47% flat rate withholding) and displays a warning on the employee record and every pay run. The employee has 28 days from start date to provide a TFN before the employer must withhold at the maximum rate.

- **What happens when an employee starts or finishes mid-period?** -- The pay run allows manual adjustment of hours/days for partial periods. Salaried employees' pay is pro-rated based on the number of working days in the partial period relative to the full period.

- **What happens when the tax year changes (1 July)?** -- Pay runs with a payment date on or after 1 July use the new financial year's tax table coefficients. Pay runs for work performed before 1 July but paid after 1 July use the new year's tables (the payment date determines the tax year, not the work period).

- **What happens when two pay runs overlap for the same employee?** -- The system prevents creating a pay run that overlaps with an existing finalised pay run for the same employee and pay period type. Draft pay runs can coexist temporarily.

- **What happens when the employer is below the super contribution base threshold?** -- There is no minimum threshold for super guarantee (the $450/month threshold was removed from 1 July 2022). Super is calculated on all ordinary time earnings regardless of amount.

- **What happens when an employee works across multiple entities in the same group?** -- Each workspace processes its own payroll independently. An employee can exist in multiple workspaces with different employment records. Only one workspace should have the tax-free threshold claimed -- the system warns if the same TFN appears across workspaces with the threshold claimed on more than one.

- **What happens if the STP gateway rejects a submission after the pay run is finalised?** -- The pay run remains finalised and the journal entries stand. STP is a reporting obligation, not a payroll calculation -- a rejected STP submission does not invalidate the pay run. The error is flagged for correction and resubmission.

- **What happens when an employee's super fund details are missing?** -- The system cannot finalise a pay run for an employee without a nominated super fund (or a stapled super fund from the ATO). The business owner must either enter the fund details or select the business's default fund.

---

## Requirements

### Functional Requirements

**Employee Management**

- **FR-001**: System MUST allow creating employee records with: first name, last name, date of birth, email, phone, residential address, start date, employment type (full-time, part-time, casual), pay basis (salary or hourly), pay rate, and work state/territory.
- **FR-002**: System MUST capture tax declaration details per employee: TFN (validated 9-digit), tax-free threshold claim (yes/no), HELP/HECS debt (yes/no), residency status (resident, foreign resident, working holiday maker), and Medicare levy variations.
- **FR-003**: System MUST determine the correct ATO tax scale (1-6) from the employee's tax declaration details and store the resulting 6-character tax treatment code.
- **FR-004**: System MUST capture employee bank details: BSB (validated 6-digit) and account number (validated 6-9 digits).
- **FR-005**: System MUST capture super fund details per employee: fund name, USI (Unique Superannuation Identifier), and member number. If no fund is nominated, the workspace's default fund is used.
- **FR-006**: System MUST support employee statuses: active, inactive, and terminated. Terminated employees require a cessation date and reason code (voluntary, ill health, deceased, redundancy, dismissal, contract end, transfer).
- **FR-007**: System MUST maintain a change history for employee records, capturing what changed, when, and by whom.
- **FR-008**: System MUST validate that a TFN is not claiming the tax-free threshold on more than one employment record within the same organisation group.

**Pay Runs**

- **FR-009**: System MUST support pay period types: weekly, fortnightly, and monthly.
- **FR-010**: System MUST allow creating a pay run by selecting a pay period type, period start date, period end date, and payment date.
- **FR-011**: System MUST auto-populate pay run lines for all active employees based on their pay basis and rate: salary employees show the calculated per-period amount; hourly employees show rate with editable hours.
- **FR-012**: System MUST calculate per employee: gross pay, PAYG withheld, superannuation guarantee, leave accruals (when enabled), and net pay (gross minus PAYG minus employee deductions).
- **FR-013**: System MUST display a pay run summary showing per-employee and total figures for gross, PAYG, super, deductions, and net.
- **FR-014**: System MUST support pay run statuses: draft and finalised. Finalised pay runs are immutable -- corrections require a new pay run with adjustment entries.
- **FR-015**: System MUST prevent creating overlapping pay runs for the same employee and pay period type.

**PAYG Withholding**

- **FR-016**: System MUST calculate PAYG withholding using the ATO Schedule 1 coefficient formula: `y = ax - b`, where `a` and `b` are looked up from the coefficient table based on the employee's tax scale and weekly earnings.
- **FR-017**: System MUST support at minimum tax Scales 1 (no threshold), 2 (threshold claimed), 3 (foreign resident), and 4 (no TFN).
- **FR-018**: System MUST convert pay period earnings to weekly equivalent before applying the formula, then convert the result back to the pay period amount (fortnightly: divide/multiply by 2; monthly: multiply by 12/52 then by 52/12).
- **FR-019**: System MUST calculate HELP/HECS/SFSS additional withholding via Schedule 8 coefficients when the employee has a study loan debt flagged.
- **FR-020**: System MUST use the tax table coefficients effective for the financial year in which the payment date falls.

**Superannuation**

- **FR-021**: System MUST calculate superannuation guarantee at 12% of ordinary time earnings per pay run.
- **FR-022**: System MUST exclude overtime from the super calculation base (overtime is not OTE).
- **FR-023**: System MUST respect the maximum super contribution base when calculating SG, capping the contribution at 12% of the quarterly maximum ($62,500 for 2025-26).
- **FR-024**: System MUST calculate super for all employees regardless of earnings amount (no minimum threshold since 1 July 2022).
- **FR-025**: System MUST track super liability per employee per super fund, grouped for payment.

**Journal Entries**

- **FR-026**: System MUST auto-post a compound journal entry when a pay run is finalised, debiting: Wages and Salaries Expense (gross) and Superannuation Expense (SG); crediting: PAYG Withholding Payable, Superannuation Payable, Annual Leave Provision (if leave accrual enabled), and Net Wages Payable.
- **FR-027**: System MUST ensure the journal entry debits equal credits (balanced entry).
- **FR-028**: System MUST link the journal entry to the pay run record for traceability.
- **FR-029**: System MUST seed missing payroll chart of accounts when the payroll module is first activated for a workspace: Wages and Salaries Expense, Superannuation Expense, PAYG Withholding Payable, Superannuation Payable, Annual Leave Provision, and Net Wages Payable (clearing).

**Leave Management**

- **FR-030**: System MUST accrue annual leave per pay run for full-time and part-time employees at the NES rate: ordinary hours worked multiplied by (4 weeks / 52 weeks).
- **FR-031**: System MUST accrue personal/carer's leave per pay run for full-time and part-time employees at the NES rate: 10 days per year pro-rated by hours worked.
- **FR-032**: System MUST NOT accrue leave for casual employees.
- **FR-033**: System MUST allow recording leave taken during a pay run, deducting from the employee's leave balance and including the leave payment in gross pay.
- **FR-034**: System MUST display current leave balances on the employee record: accrued, taken, and net balance in hours.
- **FR-035**: System MUST carry forward unused leave balances indefinitely (no use-it-or-lose-it).
- **FR-036**: System MUST pay out all accrued untaken annual leave on employee termination. Personal/carer's leave is not paid out.

**Pay Slips**

- **FR-037**: System MUST generate a pay slip per employee per finalised pay run containing: employer name and ABN, employee name, pay period dates, payment date, gross earnings (itemised), PAYG withheld, super contribution, deductions, net pay, year-to-date totals, and leave balances.
- **FR-038**: System MUST allow downloading pay slips as PDF (individual or bulk for entire pay run).
- **FR-039**: System MUST allow sending pay slips via email to employees.

**BAS Integration**

- **FR-040**: System MUST populate BAS field W1 (total salary, wages and other payments) from the sum of gross wages in pay runs for the BAS period.
- **FR-041**: System MUST populate BAS field W2 (amounts withheld from salary and wages) from the sum of PAYG withheld in pay runs for the BAS period.
- **FR-042**: System MUST attribute pay runs to BAS periods based on pay period dates (not finalisation date).

**STP Reporting**

- **FR-043**: System MUST construct STP Phase 2 payloads per pay event with disaggregated fields: gross, PAYG, overtime, bonuses, allowances, deductions, super (SG and salary sacrifice), employee tax treatment code, income type code, and employment basis code.
- **FR-044**: System MUST submit STP payloads to the configured gateway after each pay run finalisation.
- **FR-045**: System MUST record STP submission status per pay run: pending, submitted, accepted, rejected.
- **FR-046**: System MUST support STP update events for corrections and STP finalisation events for EOFY.
- **FR-047**: System MUST decouple STP submission from pay run processing -- a gateway failure does not block pay run finalisation.

**Reporting**

- **FR-048**: System MUST provide a pay run history list showing all pay runs with period dates, totals, and status.
- **FR-049**: System MUST provide per-employee pay history showing all pay runs they participated in with period breakdowns.
- **FR-050**: System MUST provide a payroll summary report for a date range showing totals by employee, by account, and grand totals.

### Key Entities

- **Employee**: A person employed by the workspace. Holds personal details, tax declaration (determines withholding), bank account, super fund, pay basis and rate, employment type, status, and leave balances. Scoped to a single workspace.

- **Pay Run**: A batch payroll event for a pay period. Contains the period type (weekly/fortnightly/monthly), period dates, payment date, and status (draft/finalised). Links to multiple Pay Run Lines (one per employee).

- **Pay Run Line**: One employee's pay within a pay run. Contains calculated gross, PAYG withheld, super, leave accrued, leave taken, deductions, and net pay. Immutable after the pay run is finalised.

- **Leave Balance**: Running tally of leave accrued and taken per employee per leave type (annual, personal). Updated by each pay run. Read model rebuilt from pay run history.

- **STP Submission**: Record of an STP payload sent to the ATO gateway. Linked to a pay run. Contains the payload, submission timestamp, gateway response, and status (pending/submitted/accepted/rejected).

- **Tax Table**: Reference data containing ATO Schedule 1 coefficients (a, b values per earning range per tax scale). Updated annually. Not editable by users.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A business owner can complete a pay run from start to finish (create, enter hours, review, finalise) in under 5 minutes for a business with 10 employees.

- **SC-002**: PAYG withholding amounts calculated by the system match the ATO's published tax table lookup values within $1.00 rounding tolerance for all supported tax scales.

- **SC-003**: Superannuation amounts calculated by the system exactly match 12% of ordinary time earnings, respecting the maximum contribution base cap.

- **SC-004**: Journal entries auto-posted from pay runs balance to zero (debits equal credits) with 100% reliability.

- **SC-005**: Leave accrual calculations match the NES formula within 0.01 hours tolerance per pay period.

- **SC-006**: BAS fields W1 and W2 auto-populated from payroll data match the manual calculation (sum of gross wages and PAYG withheld for the period) with 100% accuracy.

- **SC-007**: Pay slips contain all fields required by Fair Work Act section 536 and are available within 1 day of pay run finalisation.

- **SC-008**: STP payloads are submitted to the gateway within 24 hours of pay run finalisation, with an acceptance rate of 95%+ on first submission.

- **SC-009**: 80% of users who previously used external payroll transition to MoneyQuest payroll within 3 months of feature launch, as measured by payroll module activation rate.

- **SC-010**: Zero manual journal entries required for payroll-related accounting after pay runs are finalised -- the auto-posted entries cover all payroll accounts.

---

## Assumptions and Dependencies

### Assumptions

- The target user for Phase 1 is a small business owner (1-20 employees) with straightforward payroll: salaried and hourly workers, no complex award interpretation
- ATO tax table coefficients for 2025-26 are already published and will remain unchanged until 1 July 2026
- The super guarantee rate is 12% and has reached its legislated cap -- no further increases are expected
- Payday Super takes effect 1 July 2026 as legislated (no further deferrals)
- An STP gateway service exists that accepts payroll data via REST API and handles ATO SBR2 submission (specific provider to be selected during planning)
- The existing `has_employees` chart of accounts overlay provides most required accounts; only Net Wages Payable (clearing) needs to be added

### Dependencies

- **002-CLE** (complete): Core ledger engine for journal entry creation
- **044-TAX** (complete): BAS report generation for W1/W2 field integration
- **STP Gateway** (external): Third-party STP submission service (to be selected)
- **ATO Tax Tables**: Annual coefficient data from ATO (published each July)

---

## Regulatory References

| Obligation | Authority | Key Requirement |
|-----------|-----------|-----------------|
| PAYG Withholding | ATO Schedule 1 (NAT 1004) | Withhold tax per coefficient formula `y = ax - b` |
| Superannuation Guarantee | Superannuation Guarantee Act 1992 | 12% of OTE, max contribution base |
| Payday Super | Treasury Laws Amendment (Payday Super) Act 2025 | Super paid within 7 days of payday from 1 Jul 2026 |
| Single Touch Payroll | Tax Administration Act 1953, Div 389 | Report every pay event electronically to ATO |
| Pay Slips | Fair Work Act 2009, s536 | Issue within 1 working day of payment |
| Annual Leave | Fair Work Act 2009, NES Part 2-2 Div 6 | 4 weeks/year, accrues from day 1, paid out on termination |
| Personal/Carer's Leave | Fair Work Act 2009, NES Part 2-2 Div 7 | 10 days/year, accrues from day 1, not paid on termination |
| TFN Declaration | Income Tax Assessment Act 1936, s202D | Employee must declare within 28 days of starting |
