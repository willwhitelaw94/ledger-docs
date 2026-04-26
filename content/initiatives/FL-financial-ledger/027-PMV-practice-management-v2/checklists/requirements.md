---
title: "Requirements Checklist: Practice Management v2"
---

# Requirements Checklist: Practice Management v2

**Epic**: 027-PMV
**Date**: 2026-03-15

## Content Quality

- [x] No implementation details (no mention of API, database, migration, component)
- [x] Focused on user value and business outcomes
- [x] Written in plain English with active voice
- [x] Uses MoneyQuest domain terminology correctly (practice, workspace, accountant)
- [x] Before/after examples illustrate the change
- [x] Competitor context referenced without over-specifying

## Requirement Completeness

- [x] All 34 functional requirements are testable (FR-001 through FR-034)
- [x] Zero [NEEDS CLARIFICATION] markers remaining
- [x] Each user story has acceptance scenarios in Given/When/Then format
- [x] Edge cases identified and documented (6 edge cases)
- [x] Priority levels assigned (P1 x3, P2 x3, P3 x1)
- [x] Dependencies identified (015-ACT, 012-ATT, 024-NTF)

## INVEST Validation

| Story | I | N | V | E | S | T | Status |
|-------|---|---|---|---|---|---|--------|
| US1 — Onboarding Wizard | Yes | Yes | Yes | Yes | Yes (1 sprint) | Yes (9 scenarios) | PASS |
| US2 — Create Client Workspace | Yes | Yes | Yes | Yes | Yes (< 1 sprint) | Yes (4 scenarios) | PASS |
| US3 — Per-Accountant Assignment | Yes | Yes | Yes | Yes | Yes (1 sprint) | Yes (7 scenarios) | PASS |
| US4 — Workspace Grouping | Yes | Yes | Yes | Yes | Yes (1 sprint) | Yes (7 scenarios) | PASS |
| US5 — Practice Task Board | Yes | Yes | Yes | Yes | Yes (1 sprint) | Yes (8 scenarios) | PASS |
| US6 — Recurring Templates | Partial* | Yes | Yes | Yes | Yes (< 1 sprint) | Yes (6 scenarios) | PASS |
| US7 — Client Workbooks | Yes | Yes | Yes | Yes | Yes (1 sprint) | Yes (6 scenarios) | PASS |

*US6 depends on US5 (task board) existing first. All other stories are independent.

## Feature Readiness

- [x] Success criteria defined (8 measurable outcomes)
- [x] Key entities identified (9 entities)
- [x] Migration path for existing practices documented (FR-012, edge case)
- [x] Privacy boundary clear (FR-018 — grouping invisible to workspace owners)

## Overall: PASS
