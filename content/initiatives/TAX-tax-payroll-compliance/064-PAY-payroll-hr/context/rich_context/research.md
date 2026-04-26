---
title: "064-PAY Payroll & HR — Research Document"
created: 2026-03-21
topic: "Australian Payroll Requirements for Double-Entry Accounting SaaS"
sources_searched:
  web:
    - ato.gov.au (STP, PAYG, Super, tax tables)
    - softwaredevelopers.ato.gov.au (DSP certification, STP API)
    - sbr.gov.au (SBR2 message format)
    - fairwork.gov.au (NES, leave entitlements)
    - revenue.nsw.gov.au (payroll tax)
    - sro.vic.gov.au (payroll tax)
    - api.keypay.com.au (Employment Hero API)
    - central.xero.com (Xero Payroll)
    - scalesuite.com.au (industry guides)
  codebase:
    - database/seeders/Templates/json/overlays/has_employees.json
    - app/Enums/AccountSubType.php
    - database/seeders/Templates/AustralianStandardCoA.php
---

# 064-PAY Payroll & HR — Research Document

## Executive Summary

Australian payroll is one of the most regulation-heavy features a SaaS accounting product can build. The core obligations are: (1) calculate gross-to-net pay including PAYG withholding via ATO-published tax table formulas, (2) calculate and pay superannuation guarantee at 12% of ordinary time earnings, (3) report every pay event to the ATO via Single Touch Payroll Phase 2, (4) track leave accruals per National Employment Standards, and (5) handle state-based payroll tax if total wages exceed thresholds.

STP Phase 2 reporting uses the SBR2/XBRL protocol via the ATO's ebMS3 web service — this is not a simple REST API. Becoming a certified Digital Service Provider (DSP) requires passing the ATO's conformance testing in their External Vendor Testing Environment (EVTE) and completing their Operational Security Framework questionnaire. This is a multi-month process.

A critical upcoming change: **Payday Super** takes effect **1 July 2026**, requiring employers to pay superannuation at the same time as wages (currently quarterly). This fundamentally changes the super payment workflow and makes payroll-super integration even more tightly coupled.

The build-vs-integrate decision is significant. Employment Hero (formerly KeyPay) offers a white-label payroll API that QuickBooks Australia already uses. Integrating via their API would deliver STP-certified, award-aware payroll without building the compliance engine from scratch. The trade-off is dependency on a third party for a core feature and ongoing per-employee costs.

**Recommended MVP**: Employee records + basic pay runs (salary/hourly) + PAYG withholding + super calculation + auto-posted journal entries + STP reporting (via integration partner or direct certification). Defer award interpretation, payroll tax, and advanced leave management to later phases.

---

## 1. ATO Single Touch Payroll (STP) Phase 2

### What STP Is

Single Touch Payroll is a mandatory ATO reporting framework. Every time an employer runs payroll (a "pay event"), the payroll software must electronically report detailed payment information to the ATO. This replaced the old annual payment summary process — there are no more group certificates or payment summaries.

**Source**: [ATO Single Touch Payroll](https://www.ato.gov.au/businesses-and-organisations/hiring-and-paying-your-workers/single-touch-payroll)

### Reporting Frequency

- **Every pay event** — each time wages are paid, an STP report must be submitted
- **Update events** — corrections or amendments between pay runs
- **Finalisation event** — end-of-financial-year declaration (due by **14 July** following EOFY)
- Closely held payees (directors, family members of private companies with <=19 employees) can report quarterly

### What Data is Reported (Phase 2 Disaggregation)

STP Phase 2 significantly expanded the data reported. The gross amount is now **disaggregated** into separate components:

| Field | Description |
|-------|-------------|
| **Gross** | Residual gross (after removing separately itemised amounts) |
| **PAYG Withholding** | Tax withheld (excluding ETP tax) |
| **Overtime** | Typically irregular, not OTE |
| **Bonuses and Commissions** | Typically irregular payments |
| **Directors' Fees** | Payments to company directors |
| **Salary Sacrifice (super)** | Pre-tax super contributions via salary sacrifice |
| **Salary Sacrifice (other)** | Other pre-tax salary sacrifice amounts |
| **Exempt Foreign Income** | For foreign employment income |
| **Lump Sum payments** | Types A, B, D, E, W |
| **Allowances** | Separately itemised by type (see below) |
| **Deductions** | Union fees, workplace giving, etc. |
| **Superannuation** | Employer SG, salary sacrifice, employer additional |
| **Reportable Fringe Benefits** | FBT amounts |
| **ETP (Employment Termination Payments)** | On termination |

### Income Type Codes

Every employee payment line must be tagged with an income type:

| Code | Type | Description |
|------|------|-------------|
| **SAW** | Salary & Wages | Default for most employees |
| **CHP** | Closely Held Payees | Directors/family of private companies (<=19 employees) |
| **WHM** | Working Holiday Makers | Visa subclass 417 or 462 |
| **FEI** | Foreign Employment Income | Australian residents working overseas |
| **IAA** | Inbound Assignees | Foreign workers assigned to Australia |
| **SWP** | Seasonal Worker Program | Government-approved seasonal workers |
| **JPD** | Joint Petroleum Development | Legacy — amendments for <=2019-20 only |
| **VOL** | Voluntary Agreement | Contractors with voluntary withholding agreements |
| **LAB** | Labour Hire | Labour hire firm reporting to contractors |
| **OSP** | Other Specified Payments | Per Taxation Administration Regulations 2017 reg 27 |

**Source**: [ATO Income Types](https://www.ato.gov.au/businesses-and-organisations/hiring-and-paying-your-workers/single-touch-payroll/in-detail/single-touch-payroll-phase-2-employer-reporting-guidelines/reporting-the-amounts-you-have-paid/income-types)

### Allowance Type Codes

| Code | Type | Examples |
|------|------|---------|
| **CD** | Cents per Kilometre | Car/travel allowance |
| **AD** | Award Transport | Transport/fares per award |
| **LD** | Laundry | Uniform washing allowance |
| **MD** | Overtime Meals | Meal allowance for overtime |
| **TD** | Tools | Tool replacement, equipment |
| **KN** | Task Allowances | Dirty work, height, first aid |
| **QN** | Qualification | Professional development, licences |
| **OD** | Other | Any other allowance type |

### Employment Basis Codes

| Code | Meaning |
|------|---------|
| **F** | Full-time |
| **P** | Part-time |
| **C** | Casual |
| **L** | Labour hire |
| **V** | Voluntary agreement |
| **D** | Death beneficiary |
| **N** | Non-employee |

### Cessation Reason Codes (on termination)

| Code | Reason | Description |
|------|--------|-------------|
| **V** | Voluntary | Resignation, retirement, domestic necessity, abandonment |
| **I** | Ill Health | Medical condition preventing continued employment, T&PD |
| **D** | Deceased | Death of employee |
| **R** | Redundancy | Genuine redundancy or approved Early Retirement Scheme |
| **F** | Dismissal | Performance, inefficiency, or misconduct |
| **C** | Contract Cessation | End of contract, seasonal work, task completion, casual no longer required |
| **T** | Transfer | Administrative transfer across payroll systems, MOG, outsourcing |

**Source**: [ATO — When an Employee Transfers or Leaves](https://www.ato.gov.au/businesses-and-organisations/hiring-and-paying-your-workers/single-touch-payroll/in-detail/single-touch-payroll-phase-2-employer-reporting-guidelines/when-an-employee-transfers-or-leaves)

### Tax Treatment Code (6 characters)

Each employee has a 6-character tax treatment code reported in STP:

| Position | Field | Values |
|----------|-------|--------|
| **1** | Tax scale category | R=Regular, A=Actor, C=Horticulturist/Shearer, S=Senior/Pensioner, H=Working Holiday Maker, W=Seasonal Worker, F=Foreign Resident, N=No TFN, D=ATO-defined, V=Voluntary agreement |
| **2** | Tax-free threshold | T=Claimed, N=Not claimed, D=Daily casual (Scale 1) |
| **3** | Study/Training Loan | S=STSL applies, X=Not applicable |
| **4** | Medicare Levy Surcharge | 1/2/3=Tier level, X=Not applicable |
| **5** | Medicare Levy Exemption | H=Half, F=Full, X=Not applicable |
| **6** | Medicare Levy Reduction | 0-9 or A=Dependants count, X=Not applicable |

Example: `RTXXXX` = Regular employee, tax-free threshold claimed, no loans, no Medicare variations.

**Source**: [ATO — How to Report Employment and Tax Information](https://www.ato.gov.au/businesses-and-organisations/hiring-and-paying-your-workers/single-touch-payroll/in-detail/single-touch-payroll-phase-2-employer-reporting-guidelines/how-to-report-employment-and-tax-information-through-stp-phase-2)

### API/Submission Format

STP does **not** use a simple REST/JSON API. The technical stack is:

| Layer | Technology |
|-------|-----------|
| **Transport** | ATO ebMS3 (OASIS ebXML Messaging) |
| **Message format** | SBR2 XBRL (Standard Business Reporting) |
| **Service** | PAYEVNT.0004 (2020) — STP Phase 2 message type |
| **Authentication** | Machine-to-Machine (M2M) via ATO's cloud software authentication |
| **Testing** | External Vendor Testing Environment (EVTE) |

The message payload is constructed in XML format following SBR XBRL standards. This is significantly more complex than a typical REST API integration.

**Source**: [ATO Software Developers — STP](https://softwaredevelopers.ato.gov.au/STP), [SBR.gov.au — Employer Obligations](https://www.sbr.gov.au/digital-service-providers/developer-tools/australian-taxation-office-ato/employer-obligations-eo)

### Software Certification Process (DSP Registration)

To submit STP data directly to the ATO, a software vendor must become a registered **Digital Service Provider (DSP)**:

1. **Register** as a DSP on the ATO's Online Services for DSPs portal
2. **Implement** the PAYEVNT.0004 message format per SBR2 specifications
3. **Build and test** in the **EVTE** (External Vendor Testing Environment)
4. **Complete conformance testing** — SBR is a **self-certification** process, testing against both submit and update service actions
5. **Complete the DSP Operational Security Framework (OSF) Questionnaire** — demonstrate compliance with security controls
6. **Get whitelisted** — upon passing OSF and conformance, the software is approved for production

This process takes **3-6 months minimum** and requires dedicated developer effort. Steps 3-6 can run in parallel.

Key documents:
- [STP Business Implementation Guide (BIG)](https://www.sbr.gov.au/sites/default/files/ato_payevnt.0004_2020_business_implementation_guide.docx)
- [STP Document Library](https://softwaredevelopers.ato.gov.au/STPdocumentlibrary)
- [DSP Requirements](https://softwaredevelopers.ato.gov.au/RequirementsforDSPs)
- [Meeting Requirements](https://softwaredevelopers.ato.gov.au/operational_framework/meeting-requirements)

### Finalisation (EOFY)

- **Deadline**: 14 July following end of financial year (e.g., 14 July 2026 for FY 2025-26)
- **Closely held payees**: 30 September
- A finalisation event tells the ATO that reporting is complete for that employee for that FY
- Employee income statements become available in myGov after finalisation
- Pre-fills the employee's tax return
- Cannot finalise if no pay events were reported during the FY
- Late finalisation may attract ATO penalties

**Source**: [ATO — End-of-Year Finalisation](https://www.ato.gov.au/businesses-and-organisations/hiring-and-paying-your-workers/single-touch-payroll/start-reporting/end-of-year-finalisation-through-stp)

---

## 2. Superannuation

### Current Rates

| Financial Year | SG Rate | Maximum Contribution Base (per quarter) |
|---------------|---------|----------------------------------------|
| 2024-25 | 11.5% | $62,270 |
| **2025-26** | **12%** | **$62,500** |
| 2026-27+ | 12% (legislated cap reached) | ~$65,070 (indexed) |

The super guarantee rate reached its legislated final rate of **12%** on 1 July 2025. This is the rate MoneyQuest should implement as the baseline.

**Source**: [ATO — Super Guarantee](https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee)

### Ordinary Time Earnings (OTE)

Super is calculated on **ordinary time earnings**, which includes:
- Base salary/wages
- Allowances (generally)
- Shift loadings (for ordinary hours)
- Bonuses and commissions (if attributable to ordinary hours)
- Paid leave (annual, personal, long service)

Does **not** include:
- Overtime payments
- Reimbursements
- Workers' compensation payments
- Some one-off payments

### Contribution Types

| Type | Category | Tax Treatment | Cap (2025-26) |
|------|----------|--------------|---------------|
| **Superannuation Guarantee (SG)** | Concessional | 15% in fund | $30,000 total concessional |
| **Salary Sacrifice** | Concessional | 15% in fund (pre-tax) | Counts toward $30,000 cap |
| **Employer Additional** | Concessional | 15% in fund | Counts toward $30,000 cap |
| **Personal Deductible** | Concessional | 15% in fund | Counts toward $30,000 cap |
| **After-Tax (non-concessional)** | Non-concessional | No additional tax | $120,000/year |

**Source**: [ATO — Concessional and Non-Concessional Contributions](https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/caps-limits-and-tax-on-super-contributions/understanding-concessional-and-non-concessional-contributions)

### CRITICAL: Payday Super (1 July 2026)

**This is happening now.** From 1 July 2026:
- Employers must pay super **at the same time as wages** (not quarterly)
- Contributions must arrive in the employee's super fund within **7 calendar days** of payday
- Whether weekly, fortnightly, or monthly — super frequency matches pay frequency
- The ATO Small Business Superannuation Clearing House (SBSCH) **closed to new users** on 1 October 2025 and closes entirely on **30 June 2026**

**Impact on MoneyQuest**: Super payment integration must be designed for per-pay-run frequency from the start, not quarterly. This is a significant architectural consideration.

**Source**: [ATO — Payday Super](https://www.ato.gov.au/about-ato/new-legislation/in-detail/superannuation/payday-superannuation), [Fair Work — Payday Super](https://www.fairwork.gov.au/newsroom/news/payday-super-new-rules-starting-1-july-2026)

### SuperStream

SuperStream is the mandatory electronic standard for super contributions:

- **All** employer super contributions must be sent electronically in a standard format
- Money and data are linked by a unique **Payment Reference Number (PRN)**
- Employers can make all contributions in a **single transaction** to multiple funds
- **Clearing houses** act as intermediaries — employer sends one payment, clearing house distributes to each employee's fund

#### Clearing House Options

| Option | Description | Status |
|--------|-------------|--------|
| ATO SBSCH | Free for businesses with <20 employees | **Closing 30 June 2026** |
| Commercial clearing houses | Beam, QuickSuper (AustralianSuper), etc. | Active |
| Payroll software integration | Many payroll apps (Xero, Employment Hero) act as SuperStream gateways | Active |
| Direct to fund | Large employers can connect directly | Complex |

For MoneyQuest, the practical approach is either:
1. **Integrate with a commercial clearing house API** (e.g., Beam, QuickSuper)
2. **Partner with a payroll engine** (Employment Hero) that handles SuperStream
3. **Become a SuperStream gateway** (extremely complex, not recommended for MVP)

**Source**: [ATO — SuperStream](https://www.ato.gov.au/businesses-and-organisations/super-for-employers/paying-super-contributions/how-to-pay-super/superstream-for-employers)

---

## 3. PAYG Withholding

### Tax Table Structure

The ATO publishes tax tables annually (effective 1 July). For **software developers**, the key document is:

- **Schedule 1 (NAT 1004)** — Statement of formulas for calculating amounts to be withheld
- **Schedule 8 (NAT 3539)** — Study and training support loan (STSL) components

### Formula: `y = ax - b`

Where:
- `y` = weekly withholding amount (dollars)
- `x` = weekly earnings (whole dollars + 99 cents)
- `a` = coefficient (effective tax rate for the bracket)
- `b` = constant (adjustment)

The ATO provides coefficient tables with **earning ranges** and corresponding `a` and `b` values for each tax scale.

**Source**: [ATO — Schedule 1](https://www.ato.gov.au/tax-rates-and-codes/payg-withholding-schedule-1-statement-of-formulas-for-calculating-amounts-to-be-withheld)

### Tax Scales

| Scale | Applies To | Description |
|-------|-----------|-------------|
| **Scale 1** | No tax-free threshold | Resident, did NOT claim tax-free threshold (second job) |
| **Scale 2** | Tax-free threshold claimed | Resident, claimed tax-free threshold (primary job) |
| **Scale 3** | Foreign residents | Non-resident for tax purposes |
| **Scale 4** | No TFN provided | Flat rate: 47% (residents), 45% (foreign residents) |
| **Scale 5** | Full Medicare levy exemption | Resident, full exemption claimed |
| **Scale 6** | Half Medicare levy exemption | Resident, half exemption claimed |

### Implementation Notes

- The **same formula structure** applies to weekly, fortnightly, monthly, and quarterly periods — convert earnings to weekly equivalent first
- For fortnightly: divide by 2 to get weekly, calculate, multiply by 2
- For monthly: multiply by 12, divide by 52 to get weekly, calculate, multiply by 52/12
- **HELP/HECS/SFSS/TSL** additional withholding is calculated separately via Schedule 8 coefficients
- Scales 1, 2, 5, 6 include the **Medicare levy** in the coefficients (currently 2%)
- Tax offsets (e.g., low-income tax offset) are built into the coefficient values — no separate calculation needed
- **No changes** to Schedule 1 for 2025-26 (tax cuts announced but don't take effect until 2026-27)

**Source**: [ATO Software Developers — 2025 PAYG Tax Tables](https://softwaredevelopers.ato.gov.au/2025-pay-you-go-payg-withholding-tax-tables), [ATO — Coefficients](https://www.ato.gov.au/tax-rates-and-codes/payg-withholding-schedule-1-statement-of-formulas-for-calculating-amounts-to-be-withheld/coefficients-to-use-in-formulas-for-withholding-from-weekly-payments)

### TFN Declarations

Every employee must provide a TFN declaration (or complete one online) which determines:
- Whether they claim the tax-free threshold (only on one job)
- Whether they have a HELP/HECS, VSL, SFSS, or TSL debt
- Whether they claim Medicare levy exemption/reduction
- Their residency status

This data maps directly to the tax scale and the 6-character tax treatment code reported in STP.

**Source**: [ATO — TFN Declaration](https://www.ato.gov.au/forms-and-instructions/tfn-declaration)

### Irregular Payments (Schedule 5)

Bonuses, back-pay, commissions, and other irregular payments use **Schedule 5** (different calculation method — typically annualise the payment, calculate marginal tax, then pro-rate back).

---

## 4. Leave Entitlements (National Employment Standards)

### Annual Leave

| Aspect | Rule |
|--------|------|
| **Entitlement** | 4 weeks (152 hours) per year for full-time employees |
| **Part-time** | Pro-rata based on ordinary hours: `(weekly hours / 38) * 152` |
| **Casual** | No annual leave (compensated via 25% casual loading) |
| **Accrual rate** | 7.6923% of ordinary hours worked (152 / 1,976) |
| **Per-period formula** | `ordinary_hours * (4 / 52)` per week |
| **Accrual starts** | From first day of employment (including probation) |
| **Accumulation** | Rolls over — no use-it-or-lose-it |
| **Leave loading** | 17.5% (where applicable per award/agreement) |
| **On termination** | All accrued untaken leave must be paid out |

**Source**: [Fair Work — Annual Leave](https://www.fairwork.gov.au/leave/annual-leave)

### Personal/Carer's Leave

| Aspect | Rule |
|--------|------|
| **Entitlement** | 10 days per year (76 hours) for full-time employees |
| **Part-time** | Pro-rata based on ordinary hours |
| **Casual** | 2 days unpaid carer's leave per occasion |
| **Accrual** | Progressive from first day of employment |
| **Accumulation** | Rolls over year to year (unlimited accumulation) |
| **On termination** | **Not** paid out (unlike annual leave) |
| **Evidence** | Employer can request medical certificate or statutory declaration |

### Compassionate/Bereavement Leave

- 2 days per occasion (paid for permanent employees, unpaid for casuals)

### Long Service Leave (State-Based)

Long service leave is **not** a federal NES entitlement — it varies by state:

| State | Entitlement | After | Pro-Rata |
|-------|-------------|-------|----------|
| **NSW** | 2 months (8.67 weeks) | 10 years | After 5 years (certain circumstances) |
| **VIC** | 1 week per 60 weeks worked (~0.867 weeks/year) | 7 years access | After 7 years |
| **QLD** | 8.6667 weeks | 10 years | After 7 years (termination) |
| **SA** | 13 weeks | 10 years | After 7 years (termination) |
| **WA** | 8.6667 weeks | 10 years continuous | After 7 years (certain circumstances) |
| **TAS** | 8.6667 weeks | 10 years | After 7 years (termination) |
| **ACT** | 6.0667 weeks | 7 years | After 5 years (termination) |
| **NT** | 13 weeks | 10 years | After 7 years (termination) |

**Complexity note**: Some industries have **portable long service leave schemes** (construction, community services, cleaning) where leave accrues across employers.

**Source**: [Fair Work — Long Service Leave](https://www.fairwork.gov.au/leave/long-service-leave), [Scale Suite — Leave by State](https://www.scalesuite.com.au/resources/leave-entitlements-by-state-2026)

### Parental Leave

- 12 months unpaid parental leave (can request additional 12 months)
- Government-funded Paid Parental Leave: up to 22 weeks (increasing to 26 weeks by July 2026) at National Minimum Wage
- Keep-in-touch days: up to 10 days during leave period

### Other NES Leave

- **Community service leave** — jury duty (make-up pay), emergency/rescue activities
- **Family and domestic violence leave** — 10 days paid per year (since Feb 2023)

---

## 5. Xero Payroll Deep Dive

### Feature Set

Xero Payroll (included in Xero's Australian accounting plans) provides:

| Feature | Details |
|---------|---------|
| **Employee records** | Personal details, TFN, bank details, super fund, employment type |
| **Pay templates** | Configurable per employee — earnings, deductions, super, leave, reimbursements |
| **Pay runs** | Select period, enter hours/leave, auto-calculate gross/PAYG/super/net |
| **STP Phase 2** | Automatic submission to ATO after each pay run |
| **Super** | Calculate SG, salary sacrifice, employer additional |
| **Leave management** | Annual, personal/carer's, long service — accrual and balance tracking |
| **Pay slips** | PDF generation and email to employees |
| **ABA file** | Generate bank file for bulk salary payments |
| **Xero Me** | Employee self-service — view payslips, request leave, submit timesheets |
| **Employee self-onboarding** | New employees complete their own tax/super/bank details online (launched March 2026) |
| **Timesheet integration** | Billable hours tracking synced with payroll |

### Setup Process (Xero)

1. **Payroll settings** — bank account, payroll calendar (weekly/fortnightly/monthly), STP connection
2. **Pay items** — define earnings rates (ordinary, overtime, holiday), deductions, allowances, leave types
3. **Employee setup** — personal details, employment type, income type, employment basis, start date, modern award (optional), ordinary earnings rate, TFN declaration details, bank account, super fund
4. **Pay template** — per-employee configuration of which pay items apply and default amounts/hours

### Pay Run UX Flow

1. Navigate to Payroll > Pay Runs > New Pay Run
2. Select pay calendar and period dates
3. System pre-fills from pay templates — hours, rates, leave taken pulled from timesheets
4. Manually adjust hours, add bonuses/allowances, record leave taken
5. Review calculated gross, PAYG, super, net per employee
6. **Post** the pay run — records hit the general ledger
7. **Download ABA file** for bank transfer
8. STP data automatically submitted to ATO
9. Pay slips generated and emailable

### What Users Like

- Seamless accounting-to-payroll integration
- Automatic STP submission
- Employee self-service (Xero Me)
- Clean, simple UX for basic payroll
- Direct general ledger posting

### What Users Dislike / Limitations

- **No award interpretation** — no built-in Modern Award engine; cannot auto-calculate penalty rates, overtime rates per award, or shift loadings. Users must manually configure pay items.
- **Employee limits per plan** — Grow plan: 5 employees; higher plans charge per additional employee ($5-$10/month each)
- **Bulk operations are poor** — adding a new deduction category requires editing each employee individually
- **Limited reporting** — payroll-specific reports are basic; users want more analytical capability
- **No phone support** — email only, which is frustrating for payroll emergencies
- **Complex payrolls** — Xero themselves recommend third-party apps like KeyPay/Employment Hero for complex payroll scenarios
- **Multi-entity friction** — cannot view two company files simultaneously

**Source**: [Xero Payroll Guide — Scale Suite](https://www.scalesuite.com.au/resources/payroll-in-xero), [Xero — Pay Templates](https://central.xero.com/s/article/Create-or-edit-a-pay-template-for-an-employee)

---

## 6. Chart of Accounts for Payroll

### Standard GL Structure

MoneyQuest already has a partial payroll CoA via the `has_employees` overlay. Here is the complete recommended structure:

#### Liability Accounts (Current Liabilities — 2XXXX)

| Code | Account | Sub-Type | Purpose |
|------|---------|----------|---------|
| 21300 | PAYG Withholding Payable | `payg_withholding` | Tax withheld from employees, owed to ATO |
| 21400 | Superannuation Payable | `superannuation_payable` | SG + salary sacrifice owed to super funds |
| 21500 | Annual Leave Provision | `annual_leave_provision` | Accrued leave liability |
| 21600 | Long Service Leave Provision | `long_service_leave` | LSL liability (already in AccountSubType) |
| 21700 | Wages Payable (Clearing) | `wages_payable` | Net pay owed to employees (clears on payment) |
| 21800 | Workers' Compensation Payable | `workers_comp` | WorkCover/icare premiums owed |
| 21900 | Payroll Tax Payable | `payroll_tax` | State payroll tax liability |

#### Expense Accounts (5XXXX)

| Code | Account | Sub-Type | Purpose |
|------|---------|----------|---------|
| 52100 | Wages & Salaries | `wages` | Gross wages (incl. all earnings before tax) |
| 52110 | Superannuation | `superannuation` | Employer SG contribution expense |
| 52120 | PAYG Expense | `payg_expense` | Employer payroll tax obligations |
| 52130 | Workers' Compensation | (new) | WorkCover premium expense |
| 52140 | Leave Loading | (new) | 17.5% annual leave loading |
| 52150 | Staff Amenities | (new) | Optional — staff welfare expenses |

**Existing in codebase**: The `has_employees.json` overlay already seeds 21300, 21400, 21500, 52100, 52110, 52120. We need to add Wages Payable (clearing), Workers' Comp, Payroll Tax, and LSL Provision.

### Pay Run Journal Entry Structure

A single pay run generates one compound journal entry:

```
DEBIT   52100  Wages & Salaries          $5,000.00   (Gross wages)
DEBIT   52110  Superannuation Expense      $600.00   (12% SG on OTE)
  CREDIT  21300  PAYG Withholding Payable           $1,100.00   (Tax withheld)
  CREDIT  21400  Superannuation Payable               $600.00   (Super owed)
  CREDIT  21500  Annual Leave Provision                $384.62   (Leave accrued)
  CREDIT  21700  Wages Payable (Clearing)            $3,515.38  (Net pay to employees)
```

When the employer **pays** the employees (bank transfer):
```
DEBIT   21700  Wages Payable (Clearing)  $3,515.38
  CREDIT  11000  Bank Account                       $3,515.38
```

When the employer **remits PAYG** to ATO:
```
DEBIT   21300  PAYG Withholding Payable  $1,100.00
  CREDIT  11000  Bank Account                       $1,100.00
```

When the employer **pays super** to funds:
```
DEBIT   21400  Superannuation Payable      $600.00
  CREDIT  11000  Bank Account                         $600.00
```

### BAS Integration (W1, W2 Labels)

| BAS Label | Field | Source |
|-----------|-------|--------|
| **W1** | Total salary, wages and other payments | Sum of gross payments subject to withholding (Wages & Salaries account activity) |
| **W2** | Amounts withheld from salary and wages | Sum of PAYG withheld (PAYG Withholding Payable credits) |
| **W3** | Other amounts withheld | Voluntary agreements, labour hire, etc. |
| **W4** | Total amounts withheld | W2 + W3 |

**Note**: If reporting via STP, the W1 amounts are **pre-filled** from STP data — employers no longer need to manually report W1 on their BAS. W2 still needs to be reported.

**Source**: [ATO — PAYG Withholding on BAS](https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/business-activity-statements-bas/pay-as-you-go-payg-withholding)

---

## 7. Payroll Tax (State-Based)

Payroll tax is a state/territory tax on employers whose **total Australian taxable wages** exceed the state's threshold. It is separate from PAYG withholding.

### 2025-26 Rates and Thresholds

| State/Territory | Annual Threshold | Monthly Threshold | Rate |
|----------------|------------------|-------------------|------|
| **NSW** | $1,200,000 | $100,000 | 5.45% |
| **VIC** | $1,000,000 (from Jul 2025) | $83,333 | 4.85% |
| **QLD** | $1,300,000 | $108,333 | 4.75% (4.95% if wages >$6.5M) |
| **WA** | $1,000,000 | $83,333 | 5.5% |
| **SA** | $1,500,000 | $125,000 | 4.95% |
| **TAS** | $1,250,000 | $104,167 | 4.0% (6.1% above $2M) |
| **ACT** | $2,000,000 | $166,667 | 6.85% |
| **NT** | $1,500,000 | $125,000 | 5.5% |

### Key Rules

- Tax is paid on wages **exceeding** the threshold
- Multi-state employers must **apportion** the threshold based on the proportion of wages paid in each state
- **Grouping provisions** — related entities are grouped and share a single threshold
- **Lodgement**: Monthly returns in most states, with an annual reconciliation
- **Taxable wages** include: gross wages, super contributions, fringe benefits, contractor payments (in some states), termination payments
- Most small businesses (total wages <$1M) will be **below all state thresholds** and owe zero payroll tax

### MVP Implication

Payroll tax only affects employers with $1M+ in annual wages. For MVP targeting small businesses, payroll tax calculation can be **deferred** to a later phase. However, the data model should track which state employees are based in from the start.

**Source**: [Revenue NSW — Payroll Tax](https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/payroll-tax/lodge-and-pay-returns/thresholds-and-rates), [SRO VIC — Payroll Tax](https://www.sro.vic.gov.au/payroll-tax/changes-payroll-tax-threshold)

---

## 8. MVP Scope Recommendation

### Build vs. Integrate Decision Matrix

| Approach | Pros | Cons | Effort |
|----------|------|------|--------|
| **Build from scratch** | Full control, no per-employee costs, deep ledger integration | STP certification (3-6 months), SuperStream complexity, ongoing compliance maintenance, award engine | 12+ months |
| **Integrate Employment Hero (KeyPay) API** | STP-certified already, award interpretation, SuperStream built-in, white-label option | Per-employee cost, API dependency, less control over UX, integration complexity | 3-4 months |
| **Hybrid: Build core + integrate STP** | Own the payroll engine, use a gateway for STP/SuperStream submission | Still need to build PAYG calculations, leave engine; gateway costs | 6-8 months |
| **Integration only (no built-in payroll)** | Minimal effort, focus on core accounting | Users still re-key data, no competitive advantage | 2-3 months |

### Recommended: Hybrid Build (Phase 1 Core + STP Integration Partner)

Build the payroll engine natively in MoneyQuest (pay runs, PAYG calculation, super calculation, leave accrual, journal posting) but use an **STP gateway/sending service** for ATO submission rather than building the full SBR2/XBRL stack. Several services exist that accept payroll data via REST API and handle the ATO submission protocol.

This gives MoneyQuest:
- Full control over the UX and data model
- Deep ledger integration (the key differentiator)
- Avoid the 3-6 month STP certification process initially
- Option to pursue direct DSP certification later

### MVP Feature Set (Phase 1)

**Must Have (P0)**:
- [ ] Employee records (personal details, TFN, bank account, super fund, employment type/basis)
- [ ] TFN declaration capture (determines tax scale)
- [ ] Pay rates (salary annual, hourly rate)
- [ ] Pay run creation (select employees, period, review, post)
- [ ] PAYG withholding calculation (ATO Schedule 1 formula — Scales 1-4 minimum)
- [ ] Superannuation guarantee calculation (12% of OTE)
- [ ] Net pay calculation (gross - PAYG - deductions - salary sacrifice)
- [ ] Auto-posted journal entries per pay run (wages, PAYG, super, net pay clearing)
- [ ] Pay slip generation (PDF)
- [ ] STP Phase 2 submission (via integration partner initially)
- [ ] BAS W1/W2 integration (payroll data flows into BAS report)

**Should Have (P1)**:
- [ ] Leave accruals (annual leave, personal/carer's leave)
- [ ] Leave requests and approvals
- [ ] Leave balance tracking and payout on termination
- [ ] STP finalisation (EOFY)
- [ ] Allowances (car, meals, tools, uniform)
- [ ] Deductions (union fees, salary sacrifice)
- [ ] Employee self-service (view payslips, leave balances)
- [ ] Pay slip email delivery
- [ ] ABA file generation for bank payments
- [ ] Termination processing (final pay, unused leave, cessation reason code)

**Could Have (P2)**:
- [ ] HELP/HECS/SFSS additional withholding (Schedule 8)
- [ ] Medicare levy exemption/reduction handling (Scales 5, 6)
- [ ] Working Holiday Maker tax rates
- [ ] Foreign resident handling
- [ ] Salary sacrifice (super and other)
- [ ] Employment Termination Payments (ETP) tax calculation
- [ ] SuperStream payment integration (clearing house API)
- [ ] Payroll tax calculation (state-based)
- [ ] Workers' compensation tracking
- [ ] Headcount dashboard widget

**Deferred (Phase 3+)**:
- [ ] Modern Award interpretation engine
- [ ] Overtime and penalty rate calculations per award
- [ ] Timesheet integration
- [ ] Rostering
- [ ] Direct ATO DSP certification (own SBR2 submission)
- [ ] Leave loading (17.5%)
- [ ] Long service leave (state-based calculations)
- [ ] Portable long service leave schemes
- [ ] Parental leave tracking
- [ ] Fringe benefits tracking and reporting
- [ ] Multi-state payroll tax apportionment
- [ ] Fair Work compliance checking

### Third-Party Integration Alternatives

If building payroll is too large for the current roadmap, these are viable integration partners:

| Provider | API | STP Certified | Award Engine | White-Label | Pricing Model |
|----------|-----|--------------|--------------|-------------|---------------|
| **Employment Hero (KeyPay)** | REST API (comprehensive) | Yes | Yes | Yes (QuickBooks uses it) | Per-employee/month |
| **Xero Payroll** | Xero API | Yes | No | No | Included in Xero plan |
| **Tanda** | REST API | Via Employment Hero | Partial | No | Per-employee/month |
| **Deputy** | REST API | Via partner | No (timesheets only) | No | Per-user/month |
| **Payroller** | Limited API | Yes | No | No | Free for <4 employees |

**Employment Hero (KeyPay)** is the strongest integration candidate because:
1. Their API is well-documented at `api.keypay.com.au`
2. They already power QuickBooks Australia's payroll as a white-label
3. They handle STP, SuperStream, and award interpretation
4. REST API with OAuth 2.0 authentication
5. Rate limits: 5 requests/second per API key (payroll API)

**Source**: [Employment Hero API](https://api.keypay.com.au/australia/guides/Home), [Employment Hero API Specs](https://api.keypay.com.au/)

---

## Appendix A: Key Numbers Reference

| Item | Value | Effective |
|------|-------|-----------|
| Super Guarantee rate | 12% | 1 Jul 2025 |
| Maximum Super Contribution Base | $62,500/quarter | 2025-26 |
| Concessional contributions cap | $30,000/year | 2025-26 |
| Non-concessional contributions cap | $120,000/year | 2025-26 |
| Tax-free threshold | $18,200/year | Ongoing |
| Medicare levy | 2% | Ongoing |
| No-TFN withholding rate | 47% (residents) | Ongoing |
| STP finalisation deadline | 14 July | Annual |
| Payday Super commencement | 1 July 2026 | Upcoming |
| Annual leave | 4 weeks (152 hours) FT | NES |
| Personal/carer's leave | 10 days (76 hours) FT | NES |
| Family/domestic violence leave | 10 days paid | NES |
| Annual leave accrual rate | 7.6923% of ordinary hours | NES |
| Annual leave loading | 17.5% (where applicable) | Award-dependent |
| Casual loading | 25% | NES minimum |

## Appendix B: Existing Codebase Support

MoneyQuest already has foundational payroll support:

**AccountSubType enum** (`app/Enums/AccountSubType.php`):
- `PAYG_WITHHOLDING` — PAYG liability account type
- `SUPERANNUATION_PAYABLE` — Super liability account type
- `ANNUAL_LEAVE_PROVISION` — Leave provision liability
- `LONG_SERVICE_LEAVE` — LSL provision liability
- `WAGES` — Wages expense type
- `SUPERANNUATION` — Super expense type
- `PAYG_EXPENSE` — PAYG expense type

**CoA overlay** (`database/seeders/Templates/json/overlays/has_employees.json`):
- 6 accounts seeded when `has_employees` flag is true
- Accounts: 21300 (PAYG), 21400 (Super Payable), 21500 (Annual Leave), 52100 (Wages), 52110 (Super Expense), 52120 (PAYG Expense)

**Missing from codebase** (needed for payroll):
- Wages Payable / Net Wages Clearing account (liability)
- Workers' Compensation Payable (liability)
- Payroll Tax Payable (liability)
- Workers' Compensation Expense
- Leave Loading Expense

## Appendix C: ATO Resource Links

| Resource | URL |
|----------|-----|
| STP Overview | https://www.ato.gov.au/businesses-and-organisations/hiring-and-paying-your-workers/single-touch-payroll |
| STP Phase 2 Reporting Guidelines | https://www.ato.gov.au/businesses-and-organisations/hiring-and-paying-your-workers/single-touch-payroll/in-detail/single-touch-payroll-phase-2-employer-reporting-guidelines |
| STP Quick Reference Guide | https://www.ato.gov.au/.../stp-phase-2-reporting-quick-reference-guide |
| ATO Software Developers — STP | https://softwaredevelopers.ato.gov.au/STP |
| STP Document Library | https://softwaredevelopers.ato.gov.au/STPdocumentlibrary |
| DSP Requirements | https://softwaredevelopers.ato.gov.au/RequirementsforDSPs |
| Schedule 1 — PAYG Formulas | https://www.ato.gov.au/tax-rates-and-codes/payg-withholding-schedule-1-statement-of-formulas-for-calculating-amounts-to-be-withheld |
| Schedule 8 — STSL Formulas | https://www.ato.gov.au/tax-rates-and-codes/schedule-8-calculating-help-ssl-tsl-and-sfss-components |
| Tax Tables Overview | https://www.ato.gov.au/tax-rates-and-codes/tax-tables-overview |
| Super Guarantee Rates | https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee |
| Payday Super | https://www.ato.gov.au/about-ato/new-legislation/in-detail/superannuation/payday-superannuation |
| SuperStream | https://www.ato.gov.au/businesses-and-organisations/super-for-employers/paying-super-contributions/how-to-pay-super/superstream-for-employers |
| Fair Work — Annual Leave | https://www.fairwork.gov.au/leave/annual-leave |
| Fair Work — Long Service Leave | https://www.fairwork.gov.au/leave/long-service-leave |
| TFN Declaration | https://www.ato.gov.au/forms-and-instructions/tfn-declaration |
| BAS PAYG Labels | https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/business-activity-statements-bas/pay-as-you-go-payg-withholding |
| Employment Hero API | https://api.keypay.com.au/australia/guides/Home |
| Xero Payroll | https://central.xero.com/s/article/Create-or-edit-a-pay-template-for-an-employee |

## Appendix D: Open Questions

1. [ ] **STP gateway selection** — Which STP sending service to integrate with? Options: MessageXchange, direct DSP cert, or embed via Employment Hero. Research specific gateway APIs and pricing.
2. [ ] **SuperStream clearing house** — Which clearing house to integrate with for super payments? Beam? QuickSuper? Or partner with Employment Hero?
3. [ ] **Award interpretation strategy** — Build vs. integrate. If integrate, Employment Hero has an award interpretation engine. If build, which awards to support first? (Clerks, Hospitality, General Retail, Manufacturing are most common.)
4. [ ] **Payday Super readiness** — Since this takes effect 1 July 2026 (now), the super payment workflow must handle per-pay-run frequency. Does this change the MVP scope?
5. [ ] **Employee data encryption** — TFN, bank details, and super fund details are sensitive PII. What encryption approach for at-rest storage? (ATO requires specific security controls for DSPs.)
6. [ ] **Tax table update process** — ATO publishes new coefficients each July. How should MoneyQuest handle annual updates? Config file? Database table? Seeder?
7. [ ] **Multi-workspace employees** — Can an employee exist across multiple workspaces (e.g., same person working for two entities)? This affects TFN declaration handling (only one job claims tax-free threshold).
