---
title: "Requirements Checklist: Year-End Close"
---

# Requirements Checklist: Year-End Close (019-YEA)

**Date**: 2026-03-14
**Spec**: `019-YEA-year-end-close/spec.md`

---

## Content Quality

| Check | Status | Notes |
|-------|--------|-------|
| No implementation details (no API, database, code mentions) | PASS | Spec uses business language throughout |
| Written for business stakeholders | PASS | Plain English, no technical jargon |
| Uses MoneyQuest Ledger terminology (Workspace, Accountant, Accounting Period, Workpaper) | PASS | All domain terms used correctly |
| Active voice throughout | PASS | "Accountants can...", "The system MUST..." |
| Concrete examples included where helpful | PASS | Before/After scenario in idea brief, edge cases are specific |
| No embedded implementation checklists | PASS | Requirements only describe outcomes |

---

## Requirement Completeness

| Check | Status | Notes |
|-------|--------|-------|
| All user stories have Given/When/Then acceptance criteria | PASS | 6 stories, all with GWT scenarios |
| INVEST criteria met per story | PASS | Each story is independent and testable |
| Functional requirements are numbered (FR-001 onward) | PASS | FR-001 to FR-029 |
| All FRs are testable without knowing implementation | PASS | Each FR describes observable outcomes |
| Success criteria are measurable | PASS | SC-001 to SC-006 with specific metrics |
| [NEEDS CLARIFICATION] markers used sparingly (max 3) | PASS | 3 markers: Retained Earnings auto-create, unreconciled transaction block, period unlock |
| Key entities are defined | PASS | 6 entities defined |
| Edge cases are documented | PASS | 8 edge cases covering boundary conditions |

---

## Feature Readiness

| Check | Status | Notes |
|-------|--------|-------|
| All 4 feature areas covered (Adjusting Entries, Close Workflow, Retained Earnings, Workpapers) | PASS | US1-US6 map to all 4 areas |
| Role-based access specified for each capability | PASS | Owner/Accountant vs. Bookkeeper/Client defined per story and FR |
| Retained earnings calculation logic described at business level | PASS | FR-014 and FR-015 specify what is calculated and how it is displayed |
| Workpaper visibility rules defined | PASS | FR-024 specifies Client/Auditor exclusion |
| Atomic close entry failure mode covered | PASS | SC-006 and edge cases |
| Dependency on existing capabilities noted | PASS | Adjusting entries build on 002-CLE; workpapers on 012-ATT notes system |

---

## Outstanding Items (for /trilogy-clarify spec)

1. **Retained Earnings account auto-creation** — should the system create a Retained Earnings account automatically if absent, or require manual setup? Currently marked [NEEDS CLARIFICATION] in US3.
2. **Unreconciled transactions on lock** — hard block or soft warning? Currently marked [NEEDS CLARIFICATION] in Edge Cases.
3. **Owner unlock capability** — should Owners be able to unlock a period after it is locked? Currently marked [NEEDS CLARIFICATION] in Edge Cases.
4. **Multi-year workspaces** — the spec does not specify whether the close workflow supports multiple fiscal years in the same workspace simultaneously. Likely to be clarified during spec review.
5. **Partial-year close** — the spec assumes year-end close is for a full 12-month period. Whether accountants can use this workflow for quarter-end or month-end closes is unspecified.
