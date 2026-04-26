---
title: "Feature Specification: Intray — Unified Attention Queue"
---

# Feature Specification: Intray — Unified Attention Queue

**Feature Branch**: `018-ITR-intray-attention-queue`
**Created**: 2026-03-14
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — View All Pending Actions in One Place (Priority: P1)

A bookkeeper or accountant logs in each morning and wants to know immediately what needs attention across the entire ledger — without visiting each section separately. They open the Intray page and see every outstanding item grouped by category: unmatched bank transactions, draft invoices awaiting approval, overdue invoices, bills due soon, and unreconciled items.

**Why this priority**: The core value of the Intray. Without this, users must navigate to Banking, Invoices, Bills, and Journal Entries individually to discover what needs attention. This is the single highest-impact productivity improvement.

**Independent Test**: Can be tested in isolation by seeding the workspace with representative data (overdue invoices, draft invoices, unmatched transactions, due bills) and verifying all items surface correctly on the Intray page.

**Acceptance Scenarios**:

1. **Given** a workspace with overdue invoices, draft invoices, unmatched bank transactions, and bills due within 7 days, **When** the user navigates to `/intray`, **Then** all items appear grouped by category with their relevant details (description, amount, due date or age).
2. **Given** all outstanding items have been actioned, **When** the user visits `/intray`, **Then** an "All clear" empty state is shown confirming there is nothing pending.
3. **Given** the user is on the Intray page, **When** they click any item, **Then** they are taken to the relevant detail page for that item (e.g. the invoice detail page, the bank reconciliation page).
4. **Given** a workspace with no data, **When** the user visits `/intray`, **Then** the empty state is shown immediately without errors.

---

### User Story 2 — Intray Badge Count in Navigation (Priority: P1)

A user navigating anywhere in the application can see at a glance how many items need attention, via a badge on the Intray nav link. The count updates whenever items are actioned or new items arrive.

**Why this priority**: Without the badge, the Intray is passive — users must remember to visit it. The badge makes attention-needed state ambient and impossible to miss, turning the Intray into an always-on prompt.

**Independent Test**: Can be tested by creating outstanding items and verifying the badge appears with the correct count, then resolving items and confirming the count decreases.

**Acceptance Scenarios**:

1. **Given** there are 7 items pending across all categories, **When** the user is on any page, **Then** the Intray navigation link shows a badge with "7".
2. **Given** all items are actioned, **When** the user is on any page, **Then** the Intray badge is not shown.
3. **Given** a new overdue invoice is created, **When** the badge is next viewed, **Then** the count has increased by 1.
4. **Given** there are more than 99 pending items, **When** the badge is shown, **Then** it displays "99+" rather than the exact number.

---

### User Story 3 — Dashboard Intray Widget (Priority: P2)

The dashboard shows a compact Intray widget displaying the top 5 highest-priority pending items with a "View all" link to the full Intray page. This gives users an at-a-glance status without requiring them to leave the dashboard.

**Why this priority**: The dashboard is the landing page after login. Surfacing the top items there reduces the steps needed to start working through the queue. Lower priority than the full page because the full page delivers the core value independently.

**Independent Test**: Can be tested with 5 or more pending items — verify the widget shows exactly 5, in priority order, and the "View all" link navigates to `/intray`.

**Acceptance Scenarios**:

1. **Given** there are 8 pending items, **When** the user views the dashboard, **Then** the Intray widget shows exactly 5 items and a "View all (8)" link.
2. **Given** there are 3 pending items, **When** the user views the dashboard, **Then** the Intray widget shows all 3 items with no "View all" link.
3. **Given** there are no pending items, **When** the user views the dashboard, **Then** the Intray widget shows an "All clear" message.
4. **Given** the user clicks "View all", **When** the page loads, **Then** they are taken to `/intray` showing the complete list.

---

### User Story 4 — Items Resolve Automatically When Actioned (Priority: P2)

When a user actions an item from its detail page (e.g. approves a draft invoice, reconciles a bank transaction), that item disappears from the Intray without any manual step. The Intray reflects the current state of the ledger at all times.

**Why this priority**: Without automatic resolution, the Intray becomes stale and loses trust. Users would need to manually dismiss items, which defeats the purpose.

**Independent Test**: Can be tested by actioning a specific item (e.g. approving an invoice) and verifying it no longer appears in the Intray or badge count on next load.

**Acceptance Scenarios**:

1. **Given** a draft invoice appears in the Intray, **When** the user approves it from the invoice detail page, **Then** that invoice no longer appears in the Intray.
2. **Given** an unmatched bank transaction appears in the Intray, **When** the user reconciles it from the bank reconciliation page, **Then** that transaction no longer appears in the Intray.
3. **Given** a bill due soon appears in the Intray, **When** payment is recorded against it, **Then** that bill no longer appears in the Intray.

---

### Edge Cases

- What happens when there are hundreds of items? The full Intray page must paginate or load incrementally — not render all items at once.
- What if an item belongs to multiple categories (e.g. an invoice that is both overdue AND unreconciled)? It must appear once, under its primary category.
- What if a user does not have permission to view a particular category (e.g. an auditor role)? Items for restricted categories must not appear.
- What if the count changes while the user is on the Intray page? The list should reflect current state on each page visit; live real-time push updates are out of scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a dedicated `/intray` page accessible from the main navigation.
- **FR-002**: The Intray MUST surface items from at least the following categories: unmatched bank transactions, draft invoices awaiting approval, overdue invoices, bills due within 7 days, and unreconciled bank transactions.
- **FR-003**: Items on the Intray page MUST be grouped by category with a visible category heading and item count.
- **FR-004**: Each Intray item MUST display: a descriptive label (e.g. invoice number or transaction description), the associated amount, and the relevant date (due date, transaction date, or age).
- **FR-005**: Each Intray item MUST link directly to the relevant detail or action page for that item.
- **FR-006**: The navigation MUST display a badge on the Intray link showing the total count of pending items across all categories.
- **FR-007**: The badge MUST NOT be shown when there are zero pending items.
- **FR-008**: The badge MUST display "99+" when the count exceeds 99.
- **FR-009**: The dashboard MUST include a compact Intray widget showing the top 5 highest-priority pending items.
- **FR-010**: The dashboard widget MUST include a "View all" link to `/intray` showing the total count when there are more than 5 items.
- **FR-011**: Items MUST be removed from the Intray automatically when their underlying state changes to resolved (e.g. invoice approved, transaction reconciled).
- **FR-012**: The Intray MUST show a clear empty state when there are no pending items.
- **FR-013**: The Intray MUST respect workspace-level permissions — items the current user cannot action MUST NOT appear.
- **FR-014**: Category "bills due soon" threshold MUST be configurable per workspace (default: 7 days).
- **FR-015**: Within each category, items MUST be sorted by date ascending — the oldest or most overdue item appears first.

### Key Entities

- **Intray Item**: A representation of a single actionable ledger event — carries a category, label, amount, date, urgency level, and a link to the relevant page. Not a stored entity; derived on demand from existing ledger data.
- **Intray Category**: A logical grouping of items (e.g. "Unmatched Transactions", "Overdue Invoices"). Each category has a priority order that determines sort position on the page and widget.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can see all items requiring attention across all ledger domains within 3 seconds of landing on `/intray`.
- **SC-002**: The navigation badge count accurately reflects the total pending item count within 1 page refresh of an item being actioned.
- **SC-003**: Zero items from restricted categories appear for users without the required permissions, verified across all 6 workspace roles.
- **SC-004**: The dashboard widget renders in under 1 second and shows correct top-5 items matching the full Intray list ordering.
- **SC-005**: 100% of items that are actioned (approved, reconciled, paid) are removed from the Intray on next page load with no manual dismissal required.

## Clarifications

### Session 2026-03-14

- Q: Within each category, how should items be sorted? → A: By date ascending — oldest/most overdue first (most urgent surfaced at top)
