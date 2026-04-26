---
title: "Requirements Checklist: 024-NTF In-App Notifications & Activity Feed"
---

# Requirements Checklist: 024-NTF In-App Notifications & Activity Feed

**Date**: 2026-03-15
**Spec**: `/initiatives/FL-financial-ledger/024-NTF-notifications-activity-feed/spec.md`

---

## Content Quality

- [x] Spec is written in business language — no mention of controllers, models, Vue components, database tables, or framework internals
- [x] All user stories use active voice ("Workspace members can…" not "Notifications can be seen…")
- [x] No TC-Portal-specific terminology bleeds in (e.g. "Package", "Recipient") — domain is correctly MoneyQuest Ledger
- [x] Delivery mechanism decision (polling vs Reverb) is captured as a business decision with rationale, not an implementation instruction
- [x] Out-of-scope section is explicit — email delivery, PWA push, Reverb real-time, preferences UI, audit log, reconciliation notifications, bill due reminders, workspace invitation notifications are all excluded with reasons
- [x] Edge cases cover the meaningful failure and boundary scenarios (multi-workspace context, network failure, deleted records, role changes, bulk creation)

---

## Requirement Completeness

- [x] All 7 user stories have at least one Given/When/Then acceptance scenario
- [x] Every acceptance scenario is written so that QA can verify it in the browser or via API without knowing the implementation
- [x] No `[NEEDS CLARIFICATION]` markers remain in the spec
- [x] Functional requirements are numbered FR-001 through FR-024 — all are traceable
- [x] Each functional requirement is testable as stated (behaviour is specified, not approach)
- [x] Key entities section documents the Notification and NotificationType entities in business terms
- [x] Success criteria are measurable with specific numbers (response time, record count thresholds, zero duplicates)

---

## User Story Quality (INVEST)

### US1 — Notification Bell

- [x] Independent: testable by seeding notification records without domain events
- [x] Negotiable: details of badge styling, icon choice, animation left to design
- [x] Valuable: eliminates "did it work?" anxiety; keeps users in app
- [x] Estimable: clear scope — header component, polling, panel, mark-read
- [x] Small: fits in one sprint alongside the data layer
- [x] Testable: 7 Given/When/Then scenarios covering badge display, panel content, mark-read, empty state, poll update

### US2 — Activity Feed Page

- [x] Independent: testable by seeding notifications; no dependency on bell being built
- [x] Negotiable: layout, filter UI, pagination style left to design
- [x] Valuable: gives power users full history; enables "View all" destination
- [x] Estimable: clear scope — page, pagination, type filter, bulk mark-read, dismiss
- [x] Small: fits in one sprint alongside bell
- [x] Testable: 6 Given/When/Then scenarios covering pagination, filtering, bulk mark-read, dismiss, 90-day cutoff, empty state

### US3 — JE Approval Notifications

- [x] Independent: testable at the data layer by firing events; no UI dependency
- [x] Negotiable: notification wording is negotiable within the spec
- [x] Valuable: directly resolves the approval workflow coordination pain point
- [x] Estimable: clear scope — two listeners (submitted, approved/rejected), scoped to workspace roles
- [x] Small: backend-only story; fits comfortably within Sprint 1
- [x] Testable: 5 Given/When/Then scenarios including edge cases (no approver role, self-approval guard)

### US4 — Invoice Lifecycle Notifications

- [x] Independent: testable by firing individual invoice events in isolation
- [x] Negotiable: which users receive each notification type is negotiable
- [x] Valuable: closes the loop on sent invoices; prevents silent overdue cash flow gaps
- [x] Estimable: four listeners (sent, viewed, paid, overdue); overdue requires a scheduled check
- [x] Small: backend-only story; overdue check complexity is bounded by FR-017 deduplication requirement
- [x] Testable: 5 Given/When/Then scenarios including workspace scoping and once-only overdue firing

### US5 — Job Share Viewed Notification

- [x] Independent: testable by directly firing the JobShareLinkViewed event; no CPV UI required
- [x] Negotiable: 24-hour deduplication window is negotiable
- [x] Valuable: delivers the CPV viral moment payoff
- [x] Estimable: one listener; deduplication logic is the bounded complexity
- [x] Small: single listener with deduplication guard; fits in Sprint 1
- [x] Testable: 3 Given/When/Then scenarios including deduplication and graceful handling when link owner has left

### US6 — Bank Feed Notifications

- [x] Independent: testable by triggering bank feed sync events independently
- [x] Negotiable: notification wording and recipient roles are negotiable
- [x] Valuable: eliminates need for users to poll the banking section for sync outcomes
- [x] Estimable: two listeners (synced, error); straightforward event wiring
- [x] Small: backend-only; fits in Sprint 1
- [x] Testable: 3 Given/When/Then scenarios including no-deduplication-across-syncs rule

### US7 — Mark All Read and Dismiss

- [x] Independent: testable via direct API calls without any notification-generating events
- [x] Negotiable: dismiss vs soft-delete behaviour is negotiable
- [x] Valuable: essential for usability — without bulk mark-read the bell is permanently polluted
- [x] Estimable: two actions (bulk mark-read, individual dismiss); bounded complexity
- [x] Small: primarily API + frontend interaction; fits within Sprint 2
- [x] Testable: 4 Given/When/Then scenarios including idempotent mark-all-read

---

## Feature Readiness

- [x] All priority-1 stories (US1, US2, US3, US4, US7) are independently testable and deliverable
- [x] Priority-2 stories (US5, US6) have explicit external dependencies documented (022-CPV for US5, bank feed sync events for US6)
- [x] The Reverb upgrade path is documented in FR-023 so the architecture decision does not need to be re-litigated in the design or dev phases
- [x] The NotificationPreference future-compatibility note is in the Key Entities section so the dev phase knows to include the `type` field without building the preferences UI
- [x] FR numbering is sequential and complete (FR-001 to FR-024) — design and dev can reference them in plan.md and tasks.md
- [x] Success criteria (SC-001 to SC-006) provide QA with quantitative pass/fail thresholds

---

## Gate 1 Readiness

- [ ] `/trilogy-clarify spec` session recorded in spec Clarifications section
- [ ] `/trilogy-clarify business` complete — `business.md` created
- [x] No unresolved `[NEEDS CLARIFICATION]` markers
- [x] Business problem stated (zero visibility of workspace activity)
- [x] Stakeholder impact identified (bookkeepers, approvers, owners, accountants, clients via CPV)
- [ ] RACI updated with named Accountable person (currently `—`)
