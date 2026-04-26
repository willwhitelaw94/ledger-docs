---
title: "Requirements Checklist: Risk Management & Insurance Register"
---

# Requirements Checklist: Risk Management & Insurance Register

**Epic**: 069-RMI
**Created**: 2026-03-22
**Status**: Not Started

---

## Sprint 1 -- Insurance Register

### Insurance Policy CRUD
- [ ] **FR-001**: Create, view, update, and delete insurance policies within a workspace
- [ ] **FR-002**: 16 insurance policy types supported (Public Liability through Other)
- [ ] **FR-003**: Required fields enforced: policy number, policy type, provider name, coverage amount, annual premium, start date, end date, status
- [ ] **FR-004**: Optional fields supported: contact (broker), asset, excess, payment frequency, auto-renew, notes, document
- [ ] **FR-005**: Four policy statuses: Active, Pending Renewal, Expired, Cancelled
- [ ] **FR-006**: All monetary amounts stored as integers (cents)
- [ ] **FR-007**: Policy can be linked to a specific asset
- [ ] **FR-008**: Policy can be linked to a contact record (broker/provider)
- [ ] **FR-045**: Document attachments on insurance policies via existing attachment system

### Renewal Reminders
- [ ] **FR-009**: Daily scheduled check for policies approaching end date
- [ ] **FR-010**: Notifications generated at 30, 14, 7, and 1 day intervals before end date
- [ ] **FR-011**: Each reminder interval fires only once per policy
- [ ] **FR-012**: Auto-transition to "Expired" on end date when auto-renew is off
- [ ] **FR-013**: Auto-transition to "Pending Renewal" on end date when auto-renew is on
- [ ] **FR-014**: Manual renewal creates new policy record and archives previous

### Permissions (Insurance)
- [ ] **FR-036** (partial): `insurance.manage` permission created and enforced
- [ ] **FR-037** (partial): `risk.view` permission grants read access to insurance data
- [ ] **FR-038** (partial): `insurance.manage` granted to owner, accountant, bookkeeper
- [ ] **FR-041**: Workspace scoping enforced on all insurance data

### General
- [ ] **FR-043**: Monetary values formatted using workspace currency settings
- [ ] **FR-044** (partial): Keyboard shortcuts for insurance register navigation and creation

---

## Sprint 2 -- Risk Register

### Risk Item CRUD
- [ ] **FR-020**: Create, view, update, and delete risk items within a workspace
- [ ] **FR-021**: 7 fixed risk categories: Investment, Market, Liquidity, Insurance, Compliance, Operational, Credit
- [ ] **FR-022**: 5x5 likelihood-impact scoring matrix (1-5 each axis)
- [ ] **FR-023**: Risk score calculated as likelihood x impact (1-25)
- [ ] **FR-024**: Risk level assigned: Low (1-5), Medium (6-12), High (13-19), Critical (20-25)
- [ ] **FR-025**: 5-status lifecycle: Identified, Assessed, Mitigating, Accepted, Closed
- [ ] **FR-026**: Description, mitigation plan, and next review date tracked
- [ ] **FR-027**: Optional link to asset and/or insurance policy
- [ ] **FR-028**: Notification generated when next review date arrives or passes

### Risk Visualisation
- [ ] **FR-029**: 5x5 heat map with risk items plotted by likelihood/impact, colour-coded by level

### Coverage Gap Analysis
- [ ] **FR-015**: Uninsured asset detection (no linked active policy for insurable asset classes)
- [ ] **FR-016**: Underinsured asset detection (coverage < 80% of market value)
- [ ] **FR-017**: Lapsed coverage detection (expired policy with time since expiry)
- [ ] **FR-018**: Coverage gap summary: total asset value, insured value, ratio, gap counts
- [ ] **FR-019**: Uses latest market value from price feeds or recorded current value

### Permissions (Risk)
- [ ] **FR-036** (complete): All 6 permissions created: risk.view, risk.create, risk.update, risk.delete, risk.review, insurance.manage
- [ ] **FR-037**: risk.view granted to all 6 roles
- [ ] **FR-038**: risk.create, risk.update granted to owner, accountant, bookkeeper
- [ ] **FR-039**: risk.delete granted to owner and accountant only
- [ ] **FR-040**: risk.review granted to owner, accountant, approver

---

## Sprint 3 -- Dashboard and Metrics

### Dashboard Widgets
- [ ] **FR-034**: "Risk Summary" widget registered in catalogue (counts by level, renewals count, mini concentration chart)
- [ ] **FR-035**: "Insurance Renewals" widget registered in catalogue (upcoming renewals sorted by expiry)

### Portfolio Risk Metrics
- [ ] **FR-030**: Asset class concentration calculated as % of total portfolio per class
- [ ] **FR-031**: Configurable concentration threshold (default 60%) with warning display
- [ ] **FR-032**: Insurance coverage ratio calculated (total coverage / total insurable asset value)
- [ ] **FR-033**: Threshold-based colouring: green (>80%), amber (50-80%), red (<50%)

### Group-Level Views
- [ ] **FR-042**: Group-level aggregation across workspace group using existing membership model

### General
- [ ] **FR-044** (complete): All keyboard shortcuts implemented for risk and insurance pages

---

## Success Criteria Verification

- [ ] **SC-001**: Insurance policy creation under 90 seconds (manual UX test)
- [ ] **SC-002**: Renewal notifications generated within 24 hours of entering reminder window
- [ ] **SC-003**: Coverage gap analysis identifies 100% of gaps in test scenarios
- [ ] **SC-004**: Risk item creation with scoring under 60 seconds (manual UX test)
- [ ] **SC-005**: Heat map renders all active risks in correct cells with correct colours
- [ ] **SC-006**: Concentration calculation matches manual values within 0.1%
- [ ] **SC-007**: Coverage ratio calculation matches manual values within 0.1%
- [ ] **SC-008**: Tenant isolation verified by tests (no cross-workspace data access)
- [ ] **SC-009**: Role-based permissions enforced (forbidden response for unauthorised users)
- [ ] **SC-010**: Adoption metric baseline established for tracking post-launch

---

## User Stories Coverage

| Story | Title | Priority | Sprint | Status |
|-------|-------|----------|--------|--------|
| US-01 | Record an Insurance Policy | P1 | 1 | [ ] |
| US-02 | Receive Insurance Renewal Reminders | P1 | 1 | [ ] |
| US-03 | Identify Insurance Coverage Gaps | P1 | 2 | [ ] |
| US-04 | Register a Risk Item | P1 | 2 | [ ] |
| US-05 | View the Risk Heat Map | P2 | 2 | [ ] |
| US-06 | Review and Update Risk Items | P2 | 2 | [ ] |
| US-07 | View Portfolio Concentration Analysis | P2 | 3 | [ ] |
| US-08 | View Insurance Coverage Ratio | P2 | 3 | [ ] |
| US-09 | Risk Summary Dashboard Widget | P3 | 3 | [ ] |
| US-10 | Insurance Renewals Dashboard Widget | P3 | 3 | [ ] |
