---
title: "Feature Specification: Award Interpretation Engine"
---

# Feature Specification: Award Interpretation Engine

**Epic**: 078-AWD | **Created**: 2026-04-01 | **Status**: Draft
**Depends on**: 064-PAY (Payroll & HR)

---

## Problem Statement

Australian employers must comply with 100+ Modern Awards under the Fair Work Act. Each award defines minimum pay rates, overtime, penalty rates, allowances, and leave entitlements that vary by classification level, employment type, day of week, and time of day. Manual award interpretation is error-prone and exposes businesses to underpayment liability. The ATO and Fair Work Ombudsman actively audit payroll compliance.

## Scope

### In Scope (P1 — MVP)
- Award library: 20 most common Modern Awards (covering ~80% of Australian workforce)
- Classification levels per award (e.g., Clerks Award Level 1-5)
- Base hourly/weekly/annual rates per classification and employment type
- Overtime rates (time and a half, double time) by day type
- Penalty rates (Saturday, Sunday, public holiday)
- Casual loading calculation (25%)
- Award-linked minimum wage validation on pay runs
- Underpayment detection: flag when calculated pay < award minimum

### In Scope (P2 — Compliance)
- Expand to 50+ awards
- Allowance rules per award (meal, travel, uniform, tool)
- Shift loading rules (early morning, afternoon, night)
- Annualised salary reconciliation (BOOT test)
- Public holiday substitution rules by state/territory
- Award rate versioning (effective dates, FWC annual review rates)
- Junior/apprentice rate tables

### In Scope (P3 — Full Coverage)
- 100+ Modern Awards
- Enterprise Agreement (EA) import and interpretation
- Award comparison tool (for employer award selection)
- Automatic rate update ingestion from Fair Work Commission
- Award compliance audit report (historical pay vs minimum entitlements)

### Out of Scope
- Industrial relations advice
- Award classification recommendation (employer determines level)
- Dispute resolution workflow
- Direct Fair Work Ombudsman reporting

## Key Entities
- `Award` — Modern Award definition (code, name, effective_date, source_url)
- `AwardClassification` — Level within an award (level, title, employment_types)
- `AwardRate` — Rate table entry (classification_id, rate_type, day_type, multiplier, amount_cents, effective_from)
- `AwardAllowance` — Allowance definition (classification_id, type, amount_cents, frequency, conditions)
- `EmployeeAwardLink` — Maps employee to award + classification level

## Success Criteria
- Pay run flags 100% of underpayment scenarios vs award minimums
- Award rate lookup < 50ms per employee per pay run
- Rate updates applied within 24 hours of FWC gazette
- Zero false negatives on underpayment detection
