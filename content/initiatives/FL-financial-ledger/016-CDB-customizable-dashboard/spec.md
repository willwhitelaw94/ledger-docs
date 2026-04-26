---
title: "Feature Specification: Customizable Dashboard (Business Overview)"
---

# Feature Specification: Customizable Dashboard (Business Overview)

**Epic**: 016-CDB
**Created**: 2026-03-14
**Status**: Draft
**Initiative**: FL — MoneyQuest Ledger
**Phase**: 4 (Post-Core)
**Design Direction**: Super Modern — Xero-inspired widget customisation

---

## Context

The Business Overview dashboard is the first screen every user sees after logging in. It is the command centre for the workspace — surfacing cash position, outstanding receivables and payables, tasks requiring action, and financial health at a glance.

The current dashboard is a fixed layout. Every user sees the same widgets in the same order, with no way to remove irrelevant panels or reorder by priority. A bookkeeper whose primary job is reconciliation needs the bank account and reconciliation widgets front and centre. A business owner cares most about cash in/out and profitability. An accountant reviewing a client's books may want P&L and journal entry status at the top.

This epic adds a **widget customisation layer** on top of the existing dashboard. Users can enter an edit mode, show or hide individual widgets (including per-bank-account visibility), and drag widgets into their preferred order. The layout is saved per user per workspace, so it persists across sessions and devices.

The existing widget components (bank accounts, invoices owed, bills to pay, tasks, P&L MTD, recent journal entries, reconciliation health) are already built. This epic is the customisation system that sits on top — not a rebuild of the widgets themselves.

### What Xero Does Well

Xero's "Edit homepage" is the reference design. Key behaviours worth matching:
- A single "Edit dashboard" toggle enters edit mode — no separate settings page
- In edit mode, each widget shows a drag handle (top) and a remove button (–)
- An "Add widget" button opens a modal listing hidden widgets with toggle switches
- Bank accounts are listed individually in the add/show modal — not treated as a single widget
- Layout is saved per screen size (desktop vs mobile) so the mobile experience is separately optimised
- "How it works" onboarding panel appears the first time a user enters edit mode

This spec does not require the per-screen-size layout splitting in the first version — a single layout order that works responsively is sufficient for MVP.

### Widget Catalogue

The full set of available widgets in this version:

| Widget ID | Display Name | Description |
|-----------|-------------|-------------|
| `bank_account:{id}` | Bank account name | Per-account card showing balance, reconciliation status, CTA |
| `invoices_owed` | Invoices owed to you | AR outstanding total with aging bar chart |
| `bills_to_pay` | Bills to pay | AP outstanding total with aging bar chart |
| `tasks` | Tasks | Actionable items (reconcile, overdue, approvals) |
| `profit_loss_mtd` | Profit & Loss (MTD) | Net profit with revenue/expense breakdown |
| `cash_in_out` | Cash in and out | 6-month bar chart of cash inflows and outflows |
| `recent_journal_entries` | Recent journal entries | Last 5 journal entries with status |
| `reconciliation_health` | Reconciliation health | Progress bars per bank account |

Bank account widgets are dynamic — the catalogue automatically includes all active bank accounts for the workspace, each individually toggle-able.

### Aging Bar Charts (New Widget Capability)

The **invoices owed** and **bills to pay** widgets currently show a single outstanding total. This spec adds aging bar charts:

- **Invoices owed aging**: bars grouped as Older, This week, Next 7 days, Next 14 days, From [date+] — amounts owed in each bucket
- **Bills to pay aging**: same grouping but for AP
- **Cash in and out**: 6-month grouped bar chart (cash in = receipts, cash out = payments, per calendar month)

The aging charts require new lightweight summary endpoints — fetching full invoice/bill lists to the frontend just to aggregate into 5 buckets is not practical at scale. Two new read-only endpoints return pre-aggregated bucket totals: one for AR aging (invoices) and one for AP aging (bills). Each returns the total outstanding amount per weekly due-date bucket (Older, This week, Next 7–14 days, Next 14–28 days, From 28 days+). The cash in/out chart similarly uses a new monthly cash summary endpoint rather than raw payment records.

### Dependencies

| Direction | Epic | Relationship |
|-----------|------|-------------|
| **Depends on** | 002-CLE Core Ledger Engine | Workspace context, tenant scoping |
| **Depends on** | 003-AUT Auth & Multi-tenancy | User identity for per-user layout persistence |
| **Depends on** | 004-BFR Bank Feeds & Reconciliation | Bank account list for dynamic widget catalogue |
| **Depends on** | 005-IAR Invoicing & AR/AP | Invoice/bill data for aging charts |
| **Builds on** | Existing dashboard | Widget components already exist — this adds the customisation layer |

---

## User Scenarios & Testing

### User Story 1 — Enter Edit Mode and Remove a Widget (Priority: P1)

A business owner opens the dashboard and finds the "Recent journal entries" widget unnecessary for their daily use. They click "Edit dashboard", see the dashboard enter edit mode with drag handles and remove buttons on every widget, and click the minus button on "Recent journal entries". The widget disappears. They click "Done" and the simplified layout is saved.

**Why this priority**: The core value proposition of widget customisation is hiding irrelevant panels. This is the simplest edit a user can make and validates the full edit → save → persist loop.

**Independent Test**: Can be fully tested by entering edit mode, removing one widget, saving, and refreshing the page — confirms the widget stays hidden and the save persists.

**Acceptance Scenarios**:

1. **Given** a logged-in user on the dashboard, **When** they click "Edit dashboard", **Then** the dashboard enters edit mode — each widget shows a drag handle icon and a remove (–) button, and an "Add widget" button appears in the header.
2. **Given** the dashboard is in edit mode, **When** the user clicks the remove button on a widget, **Then** that widget is immediately removed from the visible layout.
3. **Given** the user has removed a widget and clicks "Done", **When** they navigate away and return to the dashboard, **Then** the removed widget remains hidden and the saved layout is shown.
4. **Given** a user has a saved layout, **When** they log in on a different browser, **Then** their saved layout is shown (layout is server-persisted, not browser-local).
5. **Given** the user has removed a widget in edit mode, **When** they click "Cancel" instead of "Done", **Then** the removed widget reappears and the layout reverts to the state it was in before entering edit mode.

---

### User Story 2 — Add a Hidden Widget Back (Priority: P1)

A bookkeeper previously hid the "Profit & Loss (MTD)" widget. Their manager asks them to review the monthly numbers. They click "Edit dashboard", then "Add widget", see a list of hidden widgets with toggles, and turn P&L back on. The widget reappears on the dashboard.

**Why this priority**: Show and hide are symmetrical operations — the feature is incomplete if users can only remove but not restore widgets.

**Independent Test**: Can be tested by hiding a widget, then using "Add widget" to restore it, confirming the widget reappears and the updated layout persists.

**Acceptance Scenarios**:

1. **Given** the dashboard is in edit mode, **When** the user clicks "Add widget", **Then** a panel or modal opens showing all currently hidden widgets with toggle switches, grouped into "Bank accounts" and "Widgets" sections.
2. **Given** the add widget panel is open and a widget is currently hidden, **When** the user toggles it on, **Then** the widget is added back to the bottom of the visible layout.
3. **Given** the add widget panel is open and a widget is currently visible, **When** the user toggles it off, **Then** the widget is removed from the layout — the panel acts as a unified show/hide control.
4. **Given** bank accounts are listed individually in the panel, **When** the user hides a specific bank account (e.g., "Petty Cash Card"), **Then** only that account's card is removed; other bank account cards remain visible.

---

### User Story 3 — Reorder Widgets by Dragging (Priority: P2)

A reconciliation-focused bookkeeper wants their reconciliation health widget near the top of the widget section. They enter edit mode and drag the reconciliation health card above the P&L widget. They click "Done" and the new order is saved. (Bank account cards are always pinned at the top and are not draggable.)

**Why this priority**: Drag-to-reorder is the most powerful personalisation tool. It is P2 because hide/show delivers the majority of the value and can ship first.

**Independent Test**: Can be tested by dragging one widget above another, saving, and refreshing — confirms the custom order persists.

**Acceptance Scenarios**:

1. **Given** the dashboard is in edit mode, **When** the user clicks and holds the drag handle on a widget, **Then** the widget becomes draggable — other widgets visually shift to indicate the drop position.
2. **Given** a user is dragging a widget, **When** they release it over a new position, **Then** the widget snaps into that position and the surrounding widgets reflow accordingly.
3. **Given** the user has reordered widgets and clicks "Done", **When** they refresh the dashboard, **Then** the custom order is preserved.
4. **Given** a user on a touch device (tablet/mobile), **When** they long-press and drag a widget handle, **Then** the drag-to-reorder interaction works correctly on touch.

---

### User Story 4 — Aging Bar Charts on AR/AP Widgets (Priority: P2)

A credit controller opens the dashboard and wants to know not just the total outstanding balance, but which invoices are coming due this week versus which are already overdue. The "Invoices owed to you" widget now shows a grouped bar chart — lighter bars for upcoming, darker bars for overdue amounts — broken into weekly aging buckets.

**Why this priority**: Aging charts add significant diagnostic value to the AR/AP widgets. They are P2 because they enrich existing widgets rather than introducing new functionality.

**Independent Test**: Can be tested with demo data by verifying the aging buckets display correct amounts for invoices with known due dates, and that the bars correctly reflect overdue vs upcoming distribution.

**Acceptance Scenarios**:

1. **Given** a workspace has invoices with varying due dates, **When** the user views the "Invoices owed to you" widget, **Then** a bar chart is shown with buckets: Older (overdue >14 days), This week, Next 7–14 days, Next 14–28 days, and From [28 days+].
2. **Given** a workspace has no overdue invoices, **When** the user views the AR widget, **Then** the older/overdue bucket bar is absent or zero, and all bars appear in a non-alert colour.
3. **Given** invoices exist in the overdue bucket, **When** the user views the AR widget, **Then** the overdue bar is visually distinct (darker or alert colour) to draw attention.
4. **Given** a workspace has bills with varying due dates, **When** the user views the "Bills to pay" widget, **Then** the same aging chart pattern is applied to AP outstanding amounts.
5. **Given** the "Cash in and out" widget is visible, **When** the user views it, **Then** a 6-month grouped bar chart shows monthly cash inflows (receipts) and outflows (payments) side by side, with the current month highlighted.

---

### User Story 5 — First-Time Edit Mode Onboarding (Priority: P3)

A new workspace owner has never customised the dashboard. The first time they click "Edit dashboard", a brief "How it works" panel appears at the top of the dashboard explaining that they can add, remove, and reorder widgets, and that the layout is saved for their account.

**Why this priority**: Onboarding is a nice-to-have polish item. The feature works without it; it only reduces confusion for first-time users.

**Independent Test**: Can be tested by clearing the "has seen edit mode onboarding" flag and re-entering edit mode — confirms the panel appears exactly once.

**Acceptance Scenarios**:

1. **Given** a user has never entered edit mode before, **When** they click "Edit dashboard", **Then** an onboarding panel appears at the top of the edit canvas explaining drag-to-reorder, show/hide, and that the layout is saved.
2. **Given** a user has previously dismissed the onboarding panel, **When** they re-enter edit mode, **Then** the onboarding panel does not reappear.
3. **Given** the onboarding panel is visible, **When** the user clicks a dismiss button, **Then** the panel closes and the dismissed state is saved so it never shows again.

---

### Edge Cases

- What happens when a user has hidden all widgets? The dashboard shows an empty state with a prompt to "Add widget".
- What happens if a bank account is deleted after it was added to a user's saved layout? The orphaned entry is silently ignored and the bank account widget simply doesn't render.
- What happens if a new bank account is connected after a user has saved a layout? New bank accounts default to visible and are appended to the end of the bank account section.
- What happens to the layout if a new workspace-level widget type is added in a future release? New widgets default to visible for all users until they choose to hide them — existing saved layouts are extended, not overwritten.
- What happens when a user shares a workspace with another user? Layouts are per-user — each user has their own independent layout for the same workspace.
- What happens on mobile when a user has set a specific order on desktop? The same layout order applies responsively; mobile renders a single-column stacked version of the same order.

---

## Requirements

### Functional Requirements

- **FR-001**: The dashboard MUST have an "Edit dashboard" button in the page header that enters edit mode.
- **FR-001a**: In edit mode, all widget content MUST be non-interactive — clicks are captured by the drag/remove system only. Navigation links, CTA buttons, and other interactive elements inside widgets are disabled until edit mode is exited.
- **FR-002**: In edit mode, every visible widget MUST display a drag handle and a remove (–) button.
- **FR-003**: Clicking the remove button on a widget MUST immediately remove it from the visible layout without a confirmation step.
- **FR-004**: In edit mode, an "Add widget" control MUST be accessible that opens a panel listing all hidden widgets with toggle switches.
- **FR-005**: The "Add widget" panel MUST list bank accounts individually (one toggle per bank account) under a "Bank accounts" group heading.
- **FR-006**: The "Add widget" panel MUST list all non-bank-account widgets under a "Widgets" group heading.
- **FR-007**: Toggling a widget off in the "Add widget" panel MUST have the same effect as clicking the remove button — the widget is hidden.
- **FR-008**: Bank account cards MUST always appear as a group at the top of the dashboard and are not reorderable relative to other widget types. Individual bank account cards can be shown or hidden but not repositioned.
- **FR-008a**: All non-bank-account widgets below the bank accounts section MUST be freely reorderable via drag-and-drop using their drag handle.
- **FR-009**: The edit mode header MUST show both a "Done" button (saves and exits) and a "Cancel" button (discards all changes made in the current edit session and exits).
- **FR-009a**: Clicking "Done" MUST save the current layout (order + visibility) to the server and exit edit mode.
- **FR-009b**: Clicking "Cancel" MUST discard all changes made since entering edit mode — the layout reverts to the state it was in when edit mode was entered.
- **FR-010**: The saved layout MUST be loaded from the server on every dashboard visit — not from browser storage.
- **FR-011**: Layout MUST be scoped per user per workspace — two users in the same workspace each have their own independent layout.
- **FR-011a**: All workspace roles (owner, accountant, bookkeeper, approver, auditor, client) MUST be able to customise their own dashboard layout. Dashboard personalisation is a user preference, not a financial action, and is not role-restricted.
- **FR-012**: A dedicated AR aging summary endpoint MUST return pre-aggregated outstanding amounts grouped into weekly due-date buckets: Older (overdue >14 days), This week, Next 7–14 days, Next 14–28 days, and From 28 days+.
- **FR-012a**: The "Invoices owed to you" widget MUST display these aging buckets as a bar chart using data from the AR aging summary endpoint.
- **FR-013**: A dedicated AP aging summary endpoint MUST return the same bucket structure for outstanding bills.
- **FR-013a**: The "Bills to pay" widget MUST display the AP aging bar chart using data from the AP aging summary endpoint.
- **FR-014**: A dedicated cash summary endpoint MUST return monthly cash inflow and outflow totals for the last 6 calendar months.
- **FR-014a**: The "Cash in and out" widget MUST display a 6-month grouped bar chart (cash in vs cash out per month) using data from the cash summary endpoint.
- **FR-015**: If a user has hidden all widgets, the dashboard MUST display an empty state with a prompt to add widgets.
- **FR-016**: New bank accounts added to a workspace MUST default to visible on the dashboard for all users.
- **FR-017**: If a bank account referenced in a saved layout no longer exists, its widget entry MUST be silently skipped — no error shown to the user.
- **FR-018**: The first time a user enters edit mode, an onboarding explanation panel MUST be shown; subsequent entries MUST NOT show it again.

### Key Entities

- **DashboardLayout**: Represents a user's saved widget configuration for a specific workspace. Attributes: user, workspace, ordered list of widget slots (type + optional bank account ID), visibility state per slot, onboarding dismissed flag.
- **WidgetSlot**: An entry in a layout's ordered list. Attributes: widget type identifier, optional bank account ID (for bank account widgets), visible (boolean), position (integer order).
- **WidgetCatalogue**: The system-defined list of available widget types for a workspace. Dynamically includes one entry per active bank account plus all fixed widget types.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can enter edit mode, make changes (hide, reorder, add), and save their layout in under 60 seconds for typical use (3–5 widget changes).
- **SC-002**: A saved layout loads correctly on the next page visit — zero cases of layout reverting to default after a confirmed save.
- **SC-003**: Drag-to-reorder works without error on desktop (mouse) and tablet (touch) — zero stuck drag states in functional testing.
- **SC-004**: Aging bar charts on AR and AP widgets correctly reflect the workspace's invoice/bill due dates — verified against known test data with 100% accuracy.
- **SC-005**: The "Add widget" panel correctly reflects current widget visibility state — no widget appears as hidden when it is actually visible, and vice versa.
- **SC-006**: Layout is correctly isolated per user — User A's changes do not affect User B's layout in the same workspace.
- **SC-007**: The first-time onboarding panel appears exactly once per user per workspace — never on a repeat visit to edit mode.

---

## Clarifications

### Session 2026-03-14

- Q: When should the layout save to the server? -> A: Only on "Done" (explicit save). "Cancel" discards all changes made in the session.
- Q: Are widgets interactive while in edit mode? -> A: No — all widget content is non-interactive in edit mode; clicks are captured by the drag/remove system only.
- Q: Can bank account cards be dragged into arbitrary positions? -> A: No — bank account cards are pinned as a group at the top. Only non-bank widgets below are reorderable.
- Q: How are aging chart buckets computed? -> A: New lightweight backend summary endpoints (AR aging, AP aging, cash monthly) return pre-aggregated bucket totals. No full list fetching to the frontend.
- Q: Which roles can customise their dashboard? -> A: All roles — dashboard personalisation is a user preference and is not role-restricted.
