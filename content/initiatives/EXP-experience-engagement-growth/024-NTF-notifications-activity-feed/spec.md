---
title: "Feature Specification: In-App Notifications & Activity Feed"
---

# Feature Specification: In-App Notifications & Activity Feed

**Epic**: 024-NTF
**Feature Branch**: `feature/024-NTF-notifications-activity-feed`
**Created**: 2026-03-15
**Status**: Draft

---

## Overview

MoneyQuest Ledger currently has zero visibility of workspace activity. Domain events fire and are stored via the event-sourcing infrastructure, but nothing surfaces them to users. Approval workflows stall because approvers have no signal, invoice moments pass unacknowledged, and the job share viewed moment from epic 022-CPV has no payoff.

This specification covers an in-app notification system: a header bell icon with unread badge, a slide-out notification panel, a full activity feed page, and the server-side listeners that generate notification records from existing domain events.

The delivery mechanism for MVP is **polling at a 30-second interval** for the unread count endpoint. Laravel Reverb (WebSocket push) is documented as the future upgrade path but is not in scope for this epic.

---

## User Scenarios & Testing

### User Story 1 — Notification Bell (Priority: P1)

Workspace members see a bell icon in the application header that shows a badge count of unread notifications. Clicking the bell opens a dropdown panel listing the ten most recent notifications. Opening the panel marks those notifications as read, clearing the badge. A "View all" link navigates to the full activity feed.

**Why this priority**: The bell is the entry point for every other notification story. Without it nothing else is reachable. It is also the single highest-impact surface for reducing "did it work?" anxiety and keeping users in the app.

**Independent Test**: Can be tested by seeding a notification record for the logged-in user in the current workspace and verifying the bell badge, panel, and mark-read behaviour without any domain events needing to fire.

**Acceptance Scenarios**:

1. **Given** a workspace member has at least one unread notification, **When** they view any page of the application, **Then** the bell icon in the header displays a red badge showing the unread count (up to 99; shows "99+" beyond that).

2. **Given** a workspace member has no unread notifications, **When** they view any page, **Then** the bell icon is displayed without a badge.

3. **Given** a workspace member clicks the bell icon, **When** the dropdown panel opens, **Then** it shows up to the ten most recent notifications in reverse chronological order, each displaying: a type icon, a title, a body excerpt, a relative timestamp (e.g. "3 minutes ago"), and a read/unread indicator.

4. **Given** the notification dropdown is open, **When** the panel renders, **Then** all notifications visible in the panel are marked as read and the badge count decrements accordingly.

5. **Given** the notification dropdown is open and the user has more than ten notifications, **When** they click "View all", **Then** they are navigated to the full activity feed page at `/notifications`.

6. **Given** a workspace member has zero notifications, **When** they open the bell dropdown, **Then** an empty state message is shown: "No notifications yet."

7. **Given** the application polls the unread count endpoint every 30 seconds, **When** a new notification is created for the user in the current workspace, **Then** the badge count updates at the next poll cycle without a full page reload.

---

### User Story 2 — Activity Feed Page (Priority: P1)

Workspace members can visit a dedicated activity feed page that shows their full notification history for the current workspace, paginated and filterable by notification type.

**Why this priority**: The bell dropdown only shows ten items. Power users — accountants, owners — need to review a longer history. This is also the canonical destination for the "View all" link and for any deep-linked notification that is no longer in the top ten.

**Independent Test**: Can be tested by seeding 30 notifications of varied types for a user and verifying pagination, type filtering, and mark-read behaviour on the activity feed page independently of the bell component.

**Acceptance Scenarios**:

1. **Given** a workspace member navigates to `/notifications`, **When** the page loads, **Then** all their notifications for the current workspace are shown in reverse chronological order, paginated at 25 per page.

2. **Given** the activity feed is open, **When** a workspace member selects a type filter (e.g. "Approvals"), **Then** only notifications of that type are shown; the pagination resets to page 1.

3. **Given** the activity feed is open, **When** a workspace member clicks "Mark all as read", **Then** all unread notifications in the current workspace are marked as read and the header bell badge clears.

4. **Given** the activity feed is open and a notification is unread, **When** the workspace member clicks the dismiss button on that notification, **Then** the notification is removed from the list and is no longer counted in the unread badge.

5. **Given** a workspace member has notifications older than 90 days, **When** they view the activity feed, **Then** those notifications are not shown (they have been purged from the system).

6. **Given** a workspace member has zero notifications, **When** they visit the activity feed, **Then** a clear empty state is shown with a heading "No activity yet" and a sub-line "Notifications will appear here when workspace events occur."

---

### User Story 3 — Journal Entry Approval Notifications (Priority: P1)

When a bookkeeper submits a journal entry for approval, all users in the workspace with the approver role receive a notification. When an approver approves or rejects the entry, the submitting bookkeeper receives a notification with the outcome.

**Why this priority**: Approval workflow friction is the most-reported operational pain point. Without this notification, the bookkeeper–approver handoff requires out-of-app coordination (Slack, email, phone). This story directly resolves that gap.

**Independent Test**: Can be tested by creating a journal entry, triggering the submitted event, and verifying a notification record exists for each approver in the workspace — without needing the bell or activity feed UI to be complete.

**Acceptance Scenarios**:

1. **Given** a bookkeeper submits a journal entry for approval, **When** the entry status changes to "Awaiting Approval", **Then** every user in the workspace who holds the approver role receives a notification with the title "Journal entry awaiting approval" and a body that includes the journal entry reference and the submitting bookkeeper's name.

2. **Given** an approver approves a journal entry, **When** the entry status changes to "Approved", **Then** the bookkeeper who submitted the entry receives a notification with the title "Journal entry approved" and a body that includes the journal entry reference and the approving user's name.

3. **Given** an approver rejects a journal entry, **When** the entry status changes to "Rejected", **Then** the bookkeeper who submitted the entry receives a notification with the title "Journal entry rejected", the rejecting user's name, and the rejection reason if one was provided.

4. **Given** a workspace has no users with the approver role, **When** a bookkeeper submits a journal entry, **Then** no approval notifications are created (the entry follows its normal flow without notification delivery errors).

5. **Given** a bookkeeper holds both the bookkeeper and approver roles in a workspace, **When** they submit a journal entry, **Then** they do not receive an approver notification for their own submission.

---

### User Story 4 — Invoice Lifecycle Notifications (Priority: P1)

Workspace members are notified at key moments in the invoice lifecycle: when an invoice is sent, when it is viewed by the recipient, when payment is received, and when an invoice becomes overdue.

**Why this priority**: Invoice events are high-value signals for owners and accountants. "Your client viewed the invoice" closes the loop on a sent invoice and reduces chase-up calls. "Invoice overdue" prevents silent cash flow problems.

**Independent Test**: Can be tested by triggering each invoice lifecycle event (sent, viewed, paid, overdue) in isolation and asserting the correct notification records are created for the correct workspace users.

**Acceptance Scenarios**:

1. **Given** an invoice is sent to a client, **When** the `InvoiceSent` event fires, **Then** the workspace member who sent the invoice receives a confirmation notification: "Invoice #[number] sent to [client name]."

2. **Given** a payment is recorded against an invoice, **When** the `InvoicePaid` event fires, **Then** the workspace member who raised the invoice (and the workspace owner if different) receive a notification: "Invoice #[number] paid — [amount] received from [client name]."

4. **Given** an invoice's due date passes without full payment, **When** the overdue check runs, **Then** workspace members with the owner or accountant role receive a notification: "Invoice #[number] is overdue — [amount] outstanding from [client name]." This notification fires once per invoice (not repeatedly on subsequent days).

5. **Given** an invoice notification fires for a workspace, **When** the notification is created, **Then** it is scoped to the workspace in which the invoice exists; users in other workspaces do not receive it.

---

### User Story 5 — Job Share Viewed Notification (Priority: P2)

When a client opens a public job dashboard link (generated via the 022-CPV epic), the workspace member who generated the link receives a notification.

**Why this priority**: This is the emotional payoff of the CPV epic — the moment where a builder sees "your client just viewed it." It has high product delight value but depends on 022-CPV shipping the `JobShareLinkViewed` event, making it P2 relative to the infrastructure stories.

**Independent Test**: Can be tested by directly firing the `JobShareLinkViewed` event for a seeded job share link and asserting the correct notification is created for the link's owner, independently of the CPV frontend.

**Acceptance Scenarios**:

1. **Given** a workspace member has generated a public job dashboard link for a job, **When** a client opens that link, **Then** the workspace member who generated the link receives a notification: "Your client viewed the [Job Name] dashboard."

2. **Given** the same client opens the same job dashboard link multiple times within a 24-hour window, **When** the second and subsequent views occur, **Then** no additional notifications are created. Deduplication is based on the share token — one notification per token per 24-hour window regardless of IP or session. The 24-hour window resets at midnight UTC.

3. **Given** a job share link is viewed but the workspace member who generated the link has left the workspace, **When** the event fires, **Then** no notification is created and no error is raised.

---

### User Story 6 — Bank Feed Notifications (Priority: P2)

Workspace members with the owner or accountant role are notified when a bank feed sync completes (with a count of unmatched transactions) or when a bank feed sync fails with an error.

**Why this priority**: Bank feed sync is a background operation. Without a notification, users must navigate to the banking section to discover whether the sync ran and how many transactions need attention. This story eliminates that polling behaviour.

**Independent Test**: Can be tested by triggering the bank feed sync completed and sync error events in isolation and asserting notification records are created for the correct users, independently of the bell or feed UI.

**Acceptance Scenarios**:

1. **Given** a bank feed sync job completes successfully, **When** the sync finishes, **Then** workspace members with the owner or accountant role receive a notification: "Bank feed synced — [N] new transactions, [M] unmatched." If all transactions matched, the body reads "Bank feed synced — all [N] transactions matched."

2. **Given** a bank feed sync job encounters an error, **When** the sync fails, **Then** workspace members with the owner or accountant role receive a notification: "Bank feed sync failed — [bank account name]. Check your bank feed connection."

3. **Given** a bank account syncs multiple times in one day, **When** each sync completes, **Then** a notification is created for each sync event (no deduplication across syncs within a day — each sync is a distinct event the user needs visibility of, e.g. morning auto-sync and manual midday sync).

---

### User Story 7 — Mark All Read and Dismiss (Priority: P1)

Workspace members can mark all notifications as read in bulk and can dismiss (delete) individual notifications from the activity feed.

**Why this priority**: Without bulk mark-read, a user returning after a busy day faces dozens of unread badges with no fast path to clear them. Dismiss allows housekeeping of resolved or irrelevant notifications.

**Independent Test**: Can be tested by seeding 20 unread notifications and verifying the mark-all-read and individual dismiss endpoints respond correctly and the badge count reflects the changes.

**Acceptance Scenarios**:

1. **Given** a workspace member has multiple unread notifications, **When** they click "Mark all as read" (available on both the bell dropdown and the activity feed page), **Then** all notifications in the current workspace for that user are marked as read and the bell badge clears to zero.

2. **Given** a workspace member is viewing the activity feed, **When** they click the dismiss button on a notification, **Then** that notification is removed from the list, the unread count decrements if it was unread, and the list reflows without a full page reload.

3. **Given** a workspace member has already dismissed a notification, **When** they revisit the activity feed, **Then** the dismissed notification is not shown.

4. **Given** a workspace member clicks "Mark all as read" when they have zero unread notifications, **When** the action fires, **Then** the system responds without error and the UI shows no change.

---

### Edge Cases

- What happens when a user belongs to multiple workspaces and switches workspace? Notification context switches with the workspace — the bell count and feed reflect only the current workspace's notifications.
- What happens when the notification polling request fails (network error)? The bell badge retains its last known count and the request is retried at the next 30-second interval. No error is surfaced to the user unless the failure persists for more than 3 consecutive cycles.
- What happens when a notification references a journal entry or invoice that has since been deleted or reversed? The notification is preserved with its original title and body. The deep-link navigates to the domain section with a "Record not found" state rather than a 404.
- What happens when 100+ notifications are created in rapid succession (e.g. a bulk import)? The system must not create duplicate notification records for events that are designed to fire once (e.g. bank feed synced). Listeners must include deduplication guards where specified.
- What happens when an overdue invoice notification fires and the invoice is subsequently paid before the user reads the notification? The notification remains in the feed as a historical record. It is not retracted.
- What happens when a workspace member's role changes (e.g. bookkeeper promoted to approver)? Future notifications follow the new role. Past notifications are not affected.
- What happens to notifications when a user leaves a workspace? Their notification records for that workspace are retained in the database for audit purposes but are inaccessible to the user (they have no workspace access).

---

## Requirements

### Functional Requirements

- **FR-001**: The system MUST store notification records with the following attributes: user identifier, workspace identifier, notification type, title, body, polymorphic subject reference (type and identifier), actor identifier (nullable), read timestamp (nullable), dismissed timestamp (nullable), and creation timestamp.

- **FR-002**: The system MUST expose a notification type classification covering: `je_submitted`, `je_approved`, `je_rejected`, `invoice_sent`, `invoice_paid`, `invoice_overdue`, `job_share_viewed`, `bank_feed_synced`, `bank_feed_error`, and `reconciliation_completed`. The `invoice_viewed` type is explicitly excluded from MVP — no public invoice view link exists yet.

- **FR-003**: The application header MUST display a bell icon on every authenticated page within a workspace. The bell MUST show a numeric badge when the user has unread notifications in the current workspace. The badge MUST display "99+" when the unread count exceeds 99.

- **FR-004**: The application MUST poll the unread notification count endpoint at a 30-second interval while the user is in an authenticated workspace session. The badge count MUST update without a full page reload.

- **FR-005**: Clicking the bell icon MUST open a dropdown panel showing up to the 10 most recent notifications for the user in the current workspace. Each notification in the panel MUST show: a type icon, a title, a body excerpt, a relative timestamp, and a visual indicator of read or unread status.

- **FR-006**: Opening the notification dropdown panel MUST mark all displayed notifications as read. The badge count MUST decrement to reflect the newly read notifications.

- **FR-007**: The notification dropdown panel MUST include a "View all" link that navigates to the activity feed at `/notifications`.

- **FR-007a**: Each notification MUST include a deep link to the specific domain record that triggered it (e.g. clicking "Journal entry approved" navigates to `/journal-entries/{uuid}`; clicking "Invoice paid" navigates to `/invoices/{uuid}`). If the referenced record no longer exists, the link navigates to the domain section root with a "Record not found" message.

- **FR-008**: The application MUST provide an activity feed page at `/notifications` displaying all non-dismissed notifications for the user in the current workspace, paginated at 25 per page, in reverse chronological order.

- **FR-009**: The activity feed page MUST provide a type filter control allowing users to filter notifications by category. Available filter categories: All, Approvals, Invoicing, Banking, Jobs.

- **FR-010**: The system MUST allow users to mark all notifications as read in a single action, available from both the bell dropdown and the activity feed page.

- **FR-011**: The system MUST allow users to dismiss (delete) individual notifications from the activity feed. Dismissed notifications MUST NOT appear in the feed or be counted in the unread badge.

- **FR-012**: The system MUST create a notification for every user in the current workspace who holds the approver role when a journal entry is submitted for approval.

- **FR-013**: The system MUST create a notification for the bookkeeper who submitted a journal entry when that entry is approved or rejected by an approver.

- **FR-014**: The system MUST create a notification for the workspace member who sent the invoice when it is successfully sent — confirming delivery. Owners and accountants are not notified on send; they receive the higher-value `invoice_paid` and `invoice_overdue` signals instead.

- ~~**FR-015**~~: `invoice_viewed` notification removed from scope — no public invoice view link exists in this epic. Deferred to a future public invoice portal epic.

- **FR-016**: The system MUST create a notification for all workspace members with the owner or accountant role when an invoice is paid. If the invoice raiser is a bookkeeper (not an owner/accountant), they also receive the notification. Duplicate recipients are de-duped — no user receives more than one `invoice_paid` notification per payment event.

- **FR-017**: The system MUST create a notification for workspace members with the owner or accountant role when an invoice becomes overdue. This notification MUST fire once per invoice, not on each subsequent day the invoice remains overdue.

- **FR-018**: The system MUST create a notification for the workspace member who generated a public job dashboard share link when a client opens that link, subject to the deduplication rule: no more than one notification per link per 24-hour window per viewer session.

- **FR-019**: The system MUST create a notification for workspace members with the owner or accountant role when a bank feed sync completes, including the count of new and unmatched transactions.

- **FR-020**: The system MUST create a notification for workspace members with the owner or accountant role when a bank feed sync fails.

- **FR-021**: All notifications MUST be scoped to the workspace in which the triggering event occurred. A user in multiple workspaces MUST see separate notification streams per workspace, switching with workspace context.

- **FR-022**: Notifications older than 90 days MUST be automatically purged from the system. A scheduled job MUST run this purge daily.

- **FR-023**: The system architecture MUST be designed so that real-time WebSocket delivery via Laravel Reverb can be added as an upgrade without replacing the polling mechanism. The unread count endpoint required for polling MUST remain available as a fallback even when Reverb is active.

- **FR-024**: A user MUST NOT receive an approval notification for a journal entry they themselves submitted, even if they hold both the bookkeeper and approver roles in the workspace.

### Key Entities

- **Notification**: Represents a single notification for a specific user in a specific workspace. Key attributes: user identifier, workspace identifier, type (from the NotificationType classification), title, plain-text body, polymorphic subject reference (the triggering domain record), actor identifier (the user who caused the event, nullable for system-generated notifications), read timestamp (null when unread, set when read), dismissed timestamp (null when active, set when dismissed), creation timestamp. Notifications are immutable after creation — they are read or dismissed, never edited.

- **NotificationType**: A classification of the eleven notification categories listed in FR-002. Each type maps to a display icon and a filter category for the activity feed.

- **NotificationPreference** (future scope — not in this epic): A per-user per-workspace record that will allow opt-out by category. Noted here so the data model for Notification records includes enough metadata (type) to support preference filtering when that epic ships.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Journal entry approval workflows require zero out-of-app coordination — approvers discover pending entries via the notification bell within 30 seconds of submission (one poll cycle).

- **SC-002**: The unread count endpoint responds in under 200 milliseconds for workspaces with up to 10,000 notification records, ensuring the 30-second polling cycle does not degrade perceived performance.

- **SC-003**: The activity feed page loads and renders the first 25 notifications in under 1 second for a user with up to 1,000 notification records.

- **SC-004**: The daily purge job removes notifications older than 90 days without causing table lock contention or degrading application response times during business hours.

- **SC-005**: Zero duplicate notifications are created for events that have explicit deduplication requirements (overdue invoice fires once; job share viewed fires at most once per 24-hour window per viewer session).

- **SC-006**: Switching workspace clears and reloads the notification bell badge and dropdown to reflect only the newly selected workspace's notifications, completing within one poll cycle (30 seconds).

---

## Out of Scope

The following are explicitly excluded from this epic and should not be specced or built here:

- **Email notification delivery** — covered by 023-EML. This epic creates in-app notification records only.
- **Push notifications to mobile browsers (PWA)** — web-only for MVP.
- **Real-time WebSocket delivery via Laravel Reverb** — polling is the MVP delivery mechanism. Reverb is documented as a future upgrade path (FR-023) but is not built in this epic.
- **Notification preferences UI** — a per-user per-workspace preference toggle (opt-out by category) is noted in the data model for future compatibility but is not built here.
- **Full audit log** — a complete change history for every model mutation is a separate epic. This epic covers only the specific notification trigger list in FR-012 through FR-020.
- **Reconciliation completed notifications** — listed in the NotificationType enum for completeness but the reconciliation lifecycle events need validation before a listener is wired up; deferred to a follow-on task.
- **Bill due reminder notifications** — noted in the idea brief but excluded from MVP scope to keep the trigger list focused.
- **Workspace invitation and ownership transfer notifications** — noted in the idea brief but excluded from MVP scope.

---

## Clarifications

### Session 2026-03-15 (Spec authored)

- Q: Real-time transport — Reverb or polling for MVP? → A: Polling at 30-second interval for MVP. Reverb is the documented upgrade path. FR-023 ensures architecture is Reverb-ready without building it now.
- Q: Bell-only or bell plus dedicated activity feed? → A: Both ship in this epic. The bell (US1) and the activity feed page (US2) are both P1 — the dropdown is not useful without the "View all" destination.
- Q: Notification scope — per-workspace or global? → A: Per-workspace. Bell badge, dropdown, and feed all reflect only the current workspace. Switching workspace updates the context.
- Q: Retention period? → A: 90 days hard purge via a daily scheduled job (FR-022). No user-configurable retention.
- Q: Preference granularity for MVP? → A: No preference UI in this epic. The data model (NotificationType on each record) is designed to support per-category opt-out when a future preferences epic ships.

### Session 2026-03-15 (Clarify spec)

- Q: Notification deep links — navigate to specific record or section root? → A: Deep link to specific record (FR-007a). Falls back to section root with "Record not found" if deleted.
- Q: invoice_viewed notification — in scope? → A: Removed. No public invoice view link exists. Deferred to future public invoice portal epic.
- Q: Who receives invoice_sent notification? → A: The bookkeeper who sent it only (confirmation). Owners/accountants get invoice_paid and invoice_overdue instead (higher value signals).
- Q: Activity feed URL — /activity, /notifications, or /inbox? → A: /notifications — separate from /inbox which is reserved for the AI Document Inbox (019-AIX). The bell "View all" link navigates to /notifications.
- Q: Auto-mark-read on bell open or manual only? → A: Auto-mark on open (FR-006). Matches expected bell behaviour.
- Q: Bank feed sync notification frequency — every sync or debounced? → A: Every sync that completes fires a notification. No deduplication within a day — each sync is a distinct event users need visibility of. Bank accounts may sync on different schedules (auto + manual).
- Q: invoice_paid recipients — invoice raiser only, or all owners/accountants? → A: All workspace members with owner or accountant role receive the notification. If the invoice raiser is a bookkeeper, they also receive it. De-duped so no user gets duplicate notifications per payment event (FR-016).
- Q: job_share_viewed dedup mechanism — IP, session, or token? → A: Per share token, one notification per 24-hour window. Window resets at midnight UTC. No IP or session tracking required — simpler and avoids privacy concerns.
