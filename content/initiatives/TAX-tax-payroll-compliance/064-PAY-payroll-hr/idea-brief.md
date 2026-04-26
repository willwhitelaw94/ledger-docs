---
title: "Idea Brief: Payroll & HR"
---

# Idea Brief: Payroll & HR

**Epic**: 064-PAY
**Created**: 2026-03-21
**Initiative**: FL — MoneyQuest Ledger
**Status**: Idea (Mega Epic — requires deep research)

---

## Problem Statement

Small businesses using MoneyQuest need to pay employees and comply with Australian payroll obligations. Without built-in payroll:

- **Separate systems** — payroll in a third-party app, then manually journal wages/super/PAYG into the ledger
- **Compliance risk** — Australian payroll law is complex (STP, super guarantee, award rates, leave accruals, payroll tax)
- **No employee visibility** — can't see headcount, staff costs, or leave balances alongside financial data
- **Double entry** — pay runs done externally, then re-keyed as journal entries

## Possible Solution

A **Payroll & HR module** integrated directly into the ledger — employees, pay runs, STP reporting, super, leave, and auto-posted journal entries. Xero Payroll is the reference model.

**Key capabilities (research required for each):**

### Employees & HR
- Employee records (personal details, tax file number, bank details, super fund)
- Employment type (full-time, part-time, casual, contractor)
- Pay rates (hourly, salary, allowances, deductions)
- Award interpretation (Modern Awards — research which to support)
- Headcount dashboard widget (HR metrics card — entity-level employee count, cost)
- Employee linked to entity/workspace

### Pay Runs
- Pay run creation (select employees, period, calculate gross/net)
- PAYG withholding (tax tables — ATO publishes annually)
- Superannuation guarantee (currently 11.5%, increasing to 12%)
- Leave accruals (annual, personal/carer's, long service)
- Allowances and deductions (meal, travel, uniform, salary sacrifice)
- Pay slips (PDF generation, email to employee)

### Compliance (Australian Law)
- **Single Touch Payroll (STP Phase 2)** — report to ATO on every pay event
- **Superannuation** — calculate, report, and pay to super funds (SuperStream)
- **PAYG withholding** — correct tax withheld per ATO tax tables
- **Payroll tax** — state-based (NSW, VIC, QLD thresholds differ)
- **Fair Work** — minimum wage, award rates, overtime, penalty rates
- **Leave entitlements** — NES minimums (4 weeks annual, 10 days personal)
- **Termination** — final pay calculations, unused leave payout, ETP reporting

### Ledger Integration
- Chart of accounts: Wages Expense, PAYG Liability, Super Liability, Net Wages Payable (clearing account)
- Auto-posted journal entries per pay run
- BAS integration (W1 wages, W2 PAYG withheld)
- Payroll summary reports

## Benefits

- **Single system** — payroll + accounting in one place, no re-keying
- **Auto journals** — pay run → journal entries automatically
- **STP compliance** — lodge directly from MoneyQuest
- **Employee dashboard** — headcount, wage costs, leave balances as dashboard widgets
- **Competitive parity** — Xero, MYOB, and QuickBooks all offer payroll

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | — |
| **A** | — |
| **C** | — |
| **I** | — |

## Assumptions & Dependencies

- Depends on: 002-CLE (ledger for journal entries)
- Depends on: 062-ITM (potential: pay items as catalogue items)
- ATO STP API access required (research: registration, testing, certification)
- SuperStream gateway integration (research: clearing houses vs direct)
- Tax table data must be updated annually (ATO publishes new tables each July)
- Award interpretation is extremely complex — may need to partner with an award engine

## Risks

- **Regulatory complexity** — Australian payroll law is vast; getting it wrong has legal consequences
- **STP certification** — ATO requires software providers to be certified for STP reporting
- **Award interpretation** — 100+ Modern Awards with different pay rates, penalties, allowances
- **Ongoing maintenance** — tax tables, super rates, and thresholds change annually
- **Scope creep** — payroll is a rabbit hole; must define clear MVP boundaries

## Estimated Effort

**T-shirt size**: XL (Extra Large) — Mega Epic

- **Research phase**: 2-3 sprints (compliance, STP API, super, awards)
- **Phase 1**: Employee records + basic pay runs + PAYG + super calc — 3 sprints
- **Phase 2**: STP reporting + pay slips + leave management — 3 sprints
- **Phase 3**: Award interpretation + payroll tax + advanced features — 3+ sprints

## Proceed to Spec?

**YES** — but **research first**. This needs deep investigation into ATO STP requirements, super obligations, award interpretation feasibility, and competitive analysis (Xero Payroll, KeyPay, Employment Hero).

## Research Required

1. **ATO STP Phase 2** — API spec, certification process, reporting format
2. **Superannuation** — SuperStream protocol, clearing house options, contribution types
3. **PAYG tax tables** — data format, annual update process, scale types
4. **Modern Awards** — which awards to support initially, interpretation engine options (KeyPay API?)
5. **Xero Payroll** — feature set, UX patterns, what works well
6. **Chart of accounts** — standard payroll GL structure (wages clearing, super liability, PAYG liability)
7. **State payroll tax** — thresholds per state, calculation methods
8. **Leave accruals** — NES entitlements, pro-rata calculations, leave loading
