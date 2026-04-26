---
title: "Feature Specification: State Payroll Tax"
---

# Feature Specification: State Payroll Tax

**Epic**: 083-SPT | **Created**: 2026-04-01 | **Status**: Draft
**Depends on**: 064-PAY (Payroll & HR)

---

## Problem Statement

Employers above state-specific thresholds must pay payroll tax (4.75%-6.85% depending on jurisdiction). Each state/territory has different thresholds, rates, exemptions, and grouping rules. MoneyQuest does not calculate or track payroll tax liability.

## Scope

### In Scope (P1)
- State payroll tax configuration per workspace (jurisdiction, threshold, rate)
- Monthly payroll tax liability calculation from finalised pay runs
- Payroll tax dashboard showing YTD wages, threshold remaining, estimated liability
- Grouping rules for related entities (common ownership reduces threshold)
- NSW, VIC, QLD rate tables (covering ~75% of Australian businesses)

### In Scope (P2)
- All 8 states/territories (SA, WA, TAS, NT, ACT)
- Mental health levy (VIC) and additional surcharges
- Exempt wages identification (apprentice exemptions, trainee rebates)
- Payroll tax return preparation (annual reconciliation)
- Interstate wage allocation for multi-state employers
- Journal entry automation for payroll tax accrual

### Out of Scope
- Direct lodgement with state revenue offices
- Payroll tax audit defence
- Contractor vs employee determination (sham contracting)

## Key Entities
- `PayrollTaxConfig` — Per workspace: jurisdiction, threshold_cents, rate_bps, grouping_id
- `PayrollTaxPeriod` — Monthly calculation: total_wages, exempt_wages, taxable_wages, tax_payable, status
- `PayrollTaxRate` — Reference data: state, financial_year, threshold, rate, mental_health_levy_rate
