---
title: "Requirements Checklist: Virtual Cards (020-VCA)"
---

# Requirements Checklist: Virtual Cards (020-VCA)

**Validated**: 2026-03-14

---

## Content Quality

| Check | Status |
|-------|--------|
| No implementation details (APIs, databases, frameworks) | ✅ PASS |
| Written for business stakeholders, not developers | ✅ PASS |
| Active voice throughout | ✅ PASS |
| No technical jargon (no "webhook", "MCC", "AFSL", "API") | ✅ PASS |
| Concrete examples in user stories | ✅ PASS |

---

## Requirement Completeness

| Check | Status |
|-------|--------|
| No [NEEDS CLARIFICATION] markers remaining | ✅ PASS |
| All functional requirements are testable | ✅ PASS |
| All success criteria are measurable with specific numbers | ✅ PASS |
| Key entities defined without implementation details | ✅ PASS |
| Out of scope section explicitly defined | ✅ PASS |

---

## INVEST Validation

| Story | I | N | V | E | S | T | Result |
|-------|---|---|---|---|---|---|--------|
| US-1: Issue a card | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | PASS |
| US-2: Transaction auto-posts | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | PASS |
| US-3: Receipt capture | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | PASS |
| US-4: Update spend controls | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | PASS |
| US-5: Freeze/unfreeze | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | PASS |
| US-6: Admin spend dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | PASS |
| US-7: Cardholder view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | PASS |

---

## Feature Readiness

| Check | Status |
|-------|--------|
| Acceptance criteria defined for all user stories | ✅ PASS |
| Edge cases documented | ✅ PASS |
| Priority levels assigned (P1/P2/P3) | ✅ PASS |
| Success criteria tied to business metrics (020-VCA business.md) | ✅ PASS |
| Dependencies identified (Airwallex commercial terms, legal review) | ✅ PASS — noted in idea-brief.md and business.md |

---

## Pre-Spec Blockers (from idea-brief.md)

| Blocker | Status |
|---------|--------|
| Airwallex commercial terms (minimum volumes, revenue share) | ⚠️ OPEN — requires commercial conversation with Airwallex |
| Legal review of CAR structure under Tranche 1A payments legislation | ⚠️ OPEN — requires engagement with payments law firm |

> **Note**: The spec is complete and ready. These blockers must be resolved before development begins, but do not prevent spec handover or design work.

---

## Overall Result

**PASS** — Spec is publication-ready. Pre-spec blockers are external (commercial + legal) and do not affect spec quality.
