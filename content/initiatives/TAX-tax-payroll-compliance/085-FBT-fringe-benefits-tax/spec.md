---
title: "Feature Specification: Fringe Benefits Tax"
---

# Feature Specification: Fringe Benefits Tax

**Epic**: 085-FBT | **Created**: 2026-04-01 | **Status**: Draft
**Depends on**: 064-PAY (Payroll & HR)

---

## Problem Statement

Employers providing non-cash benefits (cars, entertainment, loans, housing) to employees must calculate and pay Fringe Benefits Tax (FBT) at 47%. The FBT year runs April-March. Benefits must be classified by type, grossed-up, and reported on STP. MoneyQuest has no FBT tracking.

## Scope

### In Scope (P1)
- Fringe benefit register: track benefits by employee, type, and FBT year
- Benefit types: car (statutory formula + operating cost), entertainment, expense payment, loan, housing, property, residual
- Taxable value calculation per benefit type
- Type 1 (GST-creditable) and Type 2 (non-GST) gross-up rates
- FBT liability calculation per quarter and annually
- Employee reportable fringe benefits amount (RFBA) for STP/payslip

### In Scope (P2)
- Car benefit calculator (statutory formula method and operating cost method comparison)
- Otherwise deductible rule (employee declaration collection)
- Exempt benefits identification (minor benefits < $300, work-related items)
- FBT return preparation (annual summary)
- Journal entry automation for FBT accrual
- Integration with 079-STP for RFBA reporting

### Out of Scope
- FBT return lodgement with ATO
- Salary packaging / novated lease management
- Entertainment register (separate from benefit tracking)

## Key Entities
- `FringeBenefit` — employee_id, benefit_type, fbt_year, taxable_value, gross_up_type, grossed_up_value
- `FbtCalculation` — workspace_id, fbt_year, quarter, total_type1, total_type2, liability
- `CarBenefit` — fringe_benefit_id, vehicle_details, statutory_percentage, cost_price, km_travelled

## Success Criteria
- FBT liability matches ATO FBT calculator within $10
- RFBA correctly reported per employee on payslips and STP
- Car benefit comparison (statutory vs operating cost) in < 3 clicks
