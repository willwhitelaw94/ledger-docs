---
title: "Feature Specification: SuperStream Integration"
---

# Feature Specification: SuperStream Integration

**Epic**: 082-SST | **Created**: 2026-04-01 | **Status**: Draft
**Depends on**: 064-PAY (Payroll & HR)

---

## Problem Statement

Payday Super commences 1 July 2026, requiring employers to pay super within 7 days of each pay day (replacing quarterly). SuperStream is the ATO's data and payment standard for super contributions. MoneyQuest calculates super but cannot submit contributions electronically.

## Scope

### In Scope (P1)
- SuperStream message construction per ATO specification
- Integration with a certified SuperStream gateway (e.g., Beam, SuperChoice)
- Contribution file generation per pay run (employer SG, salary sacrifice, voluntary)
- Fund validation via USI lookup (Unique Superannuation Identifier)
- Submission tracking: pending, submitted, accepted, rejected, partial
- Payday Super compliance: auto-trigger contribution submission within 7 days of payment_date

### In Scope (P2)
- SMSF (Self-Managed Super Fund) electronic rollovers
- Contribution corrections and amendments
- Member registration messages (new employee → fund)
- Contribution reconciliation against bank payments
- Super fund ABN/USI directory search
- Quarterly maximum contribution base enforcement

### Out of Scope
- Super fund selection advice
- SMSF compliance/audit
- Super fund performance comparison

## Key Entities
- `SuperContribution` — Per employee per pay run: amount, fund_usi, member_number, contribution_type
- `SuperSubmission` — Batch submission: pay_run_id, gateway_ref, status, submitted_at, response
- `SuperFund` — Cached fund directory: name, USI, ABN, product_name
