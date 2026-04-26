---
title: "Feature Specification: Employment Termination Payments"
---

# Feature Specification: Employment Termination Payments

**Epic**: 084-ETP | **Created**: 2026-04-01 | **Status**: Draft
**Depends on**: 064-PAY (Payroll & HR), 079-STP (STP Phase 2), 080-LVM (Leave Management)

---

## Problem Statement

Employee termination requires calculating final pay including unused leave, redundancy pay, ETP components (life benefit, death benefit), and correct tax treatment per ATO rules. ETP tax rates differ from regular income and depend on preservation age, ETP type, and caps. Incorrect termination pay is a common source of underpayment claims.

## Scope

### In Scope (P1)
- Termination wizard: cessation date, cessation reason, final pay components
- Unused annual leave payout calculation (including leave loading where applicable)
- Unused personal/carer's leave payout (where applicable by award/agreement)
- Notice period payment (in lieu of notice)
- ETP classification: life benefit vs death benefit, genuine redundancy vs non-genuine
- Tax-free component calculation (per service year, up to ETP cap)
- Concessional tax rates for amounts within the ETP cap (age-dependent: 17% or 32%)
- Whole-of-income cap application
- Final pay run generation with termination pay components
- STP termination event reporting (via 079-STP)

### In Scope (P2)
- Genuine redundancy tax-free limit calculation (per ATO annual limits)
- Long service leave payout (state-specific rules)
- Pro-rata long service leave where applicable
- Termination checklist (return of property, system access, super finalisation)
- Post-termination pay adjustments (corrections after cessation)

### Out of Scope
- Unfair dismissal defence / Fair Work Commission process
- Outplacement services
- Restraint of trade enforcement

## Key Entities
- `TerminationPayment` — employee_id, cessation_date, cessation_reason, etp_type, components (JSON), tax_free_amount, taxable_amount, tax_withheld
- `EtpTaxTable` — financial_year, preservation_age, cap_amount, over_cap_rate, under_cap_rate

## Success Criteria
- ETP tax calculation matches ATO online calculator within $1
- Termination processed end-to-end in < 15 minutes
- STP termination event submitted automatically
