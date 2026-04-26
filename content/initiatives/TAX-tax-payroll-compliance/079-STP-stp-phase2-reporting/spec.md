---
title: "Feature Specification: STP Phase 2 Reporting"
---

# Feature Specification: STP Phase 2 Reporting

**Epic**: 079-STP | **Created**: 2026-04-01 | **Status**: Draft
**Depends on**: 064-PAY (Payroll & HR)

---

## Problem Statement

Single Touch Payroll Phase 2 requires employers to report detailed pay information to the ATO per pay event, replacing payment summaries. STP2 introduces disaggregated gross, income types, country codes, and child support deductions. Non-compliance results in penalties. MoneyQuest currently calculates payroll but cannot submit to the ATO.

## Scope

### In Scope (P1 — Gateway)
- STP Phase 2 payload construction per ATO specification
- Pay event reporting: create, update, full file replacement
- Integration with certified DSP gateway (e.g., MessageXchange, Ozedi)
- Submission status tracking (pending, accepted, rejected, error)
- Error parsing and user-friendly error messages
- Re-submission workflow for rejected events
- Update event for corrections (amendment indicator)

### In Scope (P2 — Compliance)
- Finalisation declaration (end of financial year)
- Employment termination event reporting
- Closely held employee reporting (quarterly option)
- Voluntary tax filing numbers (TFN) exemption handling
- Child support deduction and garnishee reporting
- Income type disaggregation (salary/wages, allowances, ETPs, lump sum, directors fees)
- Country code for foreign employment income

### In Scope (P3 — Operations)
- STP submission dashboard (monthly/quarterly summary)
- Bulk resubmission for prior period corrections
- ATO pre-fill data reconciliation
- STP audit trail with full payload history
- Multi-ABN reporting (practice submitting on behalf of clients)

### Out of Scope
- Becoming a certified DSP (use existing gateway)
- myGov portal integration
- Tax return preparation
- BAS lodgement via STP (separate 044-TAX epic)

## Key Entities
- `StpSubmission` — Per pay event: pay_run_id, payload_json, submission_id, status, gateway_response, submitted_at
- `StpGatewayConfig` — Workspace-level gateway credentials (provider, api_key, ABN, BMS ID)
- `StpPayload` — Constructed payload cache per pay run (disaggregated gross, income types, deductions)

## Success Criteria
- 100% payload compliance with ATO STP Phase 2 specification
- Submission to gateway < 5 seconds per pay event
- Rejection rate < 1% for correctly entered payroll data
- Full audit trail of every submission and response
