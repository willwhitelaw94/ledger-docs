---
title: "Requirements Checklist: Accountant & Practice Management"
---

# Requirements Checklist: Accountant & Practice Management

**Epic**: 015-ACT
**Spec Version**: Draft
**Checklist Date**: 2026-03-14

---

## Content Quality

| Check | Status | Notes |
|-------|--------|-------|
| No implementation details (no API, database, component, migration mentions) | PASS | Spec uses business language throughout |
| Written for business stakeholders, not developers | PASS | Plain English, no technical jargon |
| Active voice used throughout | PASS | "Accountants can...", "System MUST..." |
| MoneyQuest Ledger terminology used (Workspace, Accountant, Practice) | PASS | Consistent terminology applied |
| No technical stack references (Laravel, Next.js, React, SQL) | PASS | None present |
| Concrete examples included where appropriate | PASS | File naming convention example in FR-034 |

---

## Requirement Completeness

| Check | Status | Notes |
|-------|--------|-------|
| No unresolved [NEEDS CLARIFICATION] markers | PARTIAL | 1 marker remains in US6 Scenario 5 — locked period override policy |
| All functional requirements are numbered (FR-001 to FR-035) | PASS | 35 numbered FRs |
| All functional requirements are independently testable | PASS | Each FR describes a specific, verifiable behaviour |
| Success criteria are measurable (include numbers/timeframes) | PASS | All 7 SCs have quantifiable targets |
| Success criteria are technology-agnostic | PASS | No framework or infrastructure references |
| Key entities are identified and described | PASS | 5 entities: Practice Client, Practice Note, Workspace Invitation, Ownership Transfer, Reclassification |
| Edge cases are documented | PASS | 7 edge cases covering revoked access, delivery failure, duplicate notes, invalid reclassification, bulk report failures, note deletion, suspended accounts |

---

## User Story Quality (INVEST)

| Story | Independent | Negotiable | Valuable | Estimable | Small | Testable | Overall |
|-------|-------------|------------|----------|-----------|-------|----------|---------|
| US1: Advisor Dashboard | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| US2: Practice Client List | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| US3: Invite by Email | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| US4: Ownership Transfer | PASS (depends on US3) | PASS | PASS | PASS | PASS | PASS | PASS |
| US5: Create & Handoff | PASS (depends on US3+US4) | PASS | PASS | PASS | PASS | PASS | PASS |
| US6: Reclassify Transactions | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| US7: Bulk Reports | PASS | PASS | PASS | PASS | PASS | PASS | PASS |

**Note on US4 and US5**: These stories have explicit dependencies on prior stories (US3). This is documented and intentional — they are independent in the sense that each delivers a discrete, testable increment of value once prerequisites are met.

---

## Acceptance Criteria Quality

| Check | Status | Notes |
|-------|--------|-------|
| All ACs follow Given/When/Then format | PASS | All 37 scenarios use the format |
| ACs are specific enough to write a Playwright test from | PASS | Role names, field names, and counts are explicit |
| No AC requires implementation knowledge to verify | PASS | All ACs describe observable UI/system behaviour |
| Happy path and unhappy path covered per story | PASS | Each story includes at least one error/edge scenario |
| Role-based access is specified in ACs where relevant | PASS | US6 explicitly calls out roles that cannot reclassify |

---

## Feature Readiness

| Check | Status | Notes |
|-------|--------|-------|
| Out of scope items are listed | PASS | 6 explicit out-of-scope items |
| Dependencies are identified | PASS | 003-AUT (complete), 002-CLE (complete), 013-WSP (prerequisite noted) |
| Success criteria defined | PASS | 7 measurable outcomes |
| Open clarification items are flagged | PASS | 1 [NEEDS CLARIFICATION] marker — locked period reclassification policy |

---

## Open Items Before Gate 1

- [ ] Resolve [NEEDS CLARIFICATION] in US6 Scenario 5: Can `accountant` or `owner` override a locked accounting period to reclassify? Recommend: yes, with a second confirmation prompt and mandatory reason.
- [ ] Run `/trilogy-clarify spec` to refine FR completeness (especially around the reclassification locked-period behaviour and practice note character limits).
- [ ] Run `/trilogy-clarify business` to confirm success metrics and ROI alignment.
- [ ] Confirm 013-WSP dependency timeline before scheduling 015-ACT for design.
