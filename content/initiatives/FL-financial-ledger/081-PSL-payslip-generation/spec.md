---
title: "Feature Specification: Payslip Generation & Distribution"
---

# Feature Specification: Payslip Generation & Distribution

**Epic**: 081-PSL | **Created**: 2026-04-01 | **Status**: Draft
**Depends on**: 064-PAY (Payroll & HR), 023-EML (Email Infrastructure)

---

## Problem Statement

Employers are legally required to provide payslips within 1 business day of payment. MoneyQuest calculates pay but has no payslip generation, PDF rendering, or distribution mechanism.

## Scope

### In Scope (P1)
- Payslip PDF template with employer details, employee details, pay period, gross breakdown, deductions (PAYG, super, HELP), net pay, YTD totals, leave balances
- Bulk PDF generation per pay run (all employees)
- Individual payslip download from pay run detail
- Email distribution of payslips on finalisation (opt-in per employee)
- Payslip history per employee (accessible from employee detail page)

### In Scope (P2)
- Customisable payslip template (logo, colours, additional fields)
- Employee self-service payslip portal (view/download own payslips)
- Payslip archive with S3 storage and retention policy
- Batch reissue for corrections
- Payslip preview before finalisation

### Out of Scope
- Physical mail distribution
- Payment summary (replaced by STP2)

## Key Entities
- `Payslip` — Generated per PayRunLine: employee_id, pay_run_id, pdf_path, emailed_at, viewed_at
- `PayslipTemplate` — Workspace-configurable template settings (logo, custom fields, footer text)
