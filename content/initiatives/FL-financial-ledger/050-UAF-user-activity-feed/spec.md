---
title: "Feature Specification: User Activity Feed"
---

# Feature Specification: User Activity Feed

**Feature Branch**: `feature/050-uaf`
**Created**: 2026-03-19
**Status**: Draft
**Epic**: 050-UAF
**Initiative**: FL — Financial Ledger Platform
**Effort**: L (4 sprints)
**Depends On**: 048-FPL (feed pipeline), 005-IAR (invoicing), 003-AUT (auth), 027-PMV (practice management)

### Out of Scope

- **Entity-level feed** — the per-workspace data feed (bank transactions, Redbook, stock tickers flowing into JEs) is handled by 018-ITR Intray / Attention Queue. This epic is the cross-workspace user-level aggregation only.
- **WebSocket real-time push** — v1 uses 30-second polling for badge count updates. WebSocket upgrade deferred until daily active user volume justifies the infrastructure.
- **Email digest delivery** — v1 defines the preferences model and UI for email digest configuration but does not implement the actual email sending. Depends on 023-EML Email Infrastructure for digest rendering and scheduling.
- **Custom feed item types** — v1 ships with the 10 system-defined feed item types listed below. User-defined or plugin-based feed types deferred.
- **AI-powered prioritisation** — v1 uses rule-based priority (critical > high > normal > low). ML-driven priority ranking deferred to a future iteration.
- **Push notifications** — mobile/desktop push for feed items deferred to 024-NTF Notifications.

---

## Overview

The User Activity Feed is a cross-workspace attention stream on the user-level dashboard — the "personal mission control" for every MoneyQuest user. Unlike entity feeds (which show data flowing into a specific workspace), the user feed aggregates items needing attention across ALL workspaces: bank transactions to reconcile, invoices to approve, documents to review, anomalies to investigate, and system notifications. One infinite-scrolling feed, prioritised and grouped, designed to be the first thing users see every morning.

---

## User Scenarios & Testing

### User Story 1 — Cross-Workspace Feed (Priority: P1)

A bookkeeper managing 8 client workspaces opens MoneyQuest and wants a single view of everything needing their attention — without switching between workspaces to check each one. The feed aggregates items from all workspaces in reverse-chronological order, each tagged with workspace context, so the bookkeeper can triage their entire workload from one screen.

**Why this priority**: The cross-workspace feed is the core value proposition. Without it, users must manually switch between workspaces to discover what needs attention — the exact friction this epic eliminates. Every other story (filtering, inline actions, badges) depends on this feed existing and loading correctly.

**Independent Test**: Log in as a bookkeeper assigned to 3+ workspaces. Verify the Activity Feed on the home dashboard shows items from all workspaces. Verify each item displays the workspace name. Verify scrolling past 20 items triggers infinite scroll loading. Click a feed item that requires workspace context and verify navigation to the correct workspace and page.

**Acceptance Scenarios**:

1. **Given** I log in and land on my user dashboard, **When** I view the Activity Feed, **Then** I see items from all my workspaces in reverse-chronological order, each tagged with the workspace name and colour.

2. **Given** the feed has 200+ items, **When** I scroll down, **Then** items load progressively via infinite scroll with a loading indicator, using cursor-based pagination.

3. **Given** I click a feed item, **When** it requires workspace context (e.g., reconcile a transaction), **Then** I am navigated to the correct workspace and page with the item pre-selected.

4. **Given** I have no pending items across any workspace, **When** I view the Activity Feed, **Then** I see an empty state with a congratulatory message and no broken UI.

---

### User Story 2 — Feed Filtering & Prioritisation (Priority: P1)

A user with a busy feed — 50+ items from 10 workspaces — wants to focus on specific types or workspaces. They apply filters to narrow the feed and rely on visual priority indicators to spot critical items first, like anomaly alerts and overdue approvals.

**Why this priority**: Without filtering, the feed becomes noise for power users. An accountant managing 20 workspaces needs to quickly isolate "all bank transactions" or "everything from Acme Corp". Prioritisation ensures critical items (errors, anomalies, overdue approvals) are visually prominent without requiring the user to scroll through the entire feed.

**Independent Test**: View an unfiltered feed with mixed item types. Apply a type filter for "Bank Transactions" and verify only bank transaction items appear. Apply a workspace filter for a specific workspace and verify only that workspace's items appear. Verify high-priority items display red/amber badges.

**Acceptance Scenarios**:

1. **Given** I am viewing the feed, **When** I apply a type filter (e.g., "Bank Transactions" only), **Then** the feed shows only bank transaction items across all workspaces.

2. **Given** I apply a workspace filter, **When** I select "Acme Corp", **Then** I see only items from that workspace.

3. **Given** I apply both a type filter and a workspace filter, **When** the feed updates, **Then** I see only items matching both filters simultaneously.

4. **Given** an unfiltered feed, **When** items load, **Then** high-priority items (anomalies, errors, overdue approvals) appear with visual emphasis (red/amber badges).

5. **Given** I apply a filter, **When** I close and reopen the feed, **Then** my filter selections are persisted (localStorage via Zustand store).

---

### User Story 3 — Feed Badges & Counts (Priority: P1)

A user wants to see at a glance how many items need attention without opening the feed. The sidebar badge and grouped counts in the feed header provide this awareness, updating in near-real-time as items are actioned.

**Why this priority**: The badge is the engagement hook. It drives users to open the feed. Without visible counts, users have no reason to check the feed proactively. The badge also validates inline actions — when a user approves an invoice and sees the count decrement, it reinforces the "getting things done" loop.

**Independent Test**: Verify the sidebar shows a badge count next to "Home". Action an item from the feed. Verify the badge decrements without a page refresh. Verify the feed header shows grouped counts by type.

**Acceptance Scenarios**:

1. **Given** I am anywhere in the app, **When** I look at the sidebar, **Then** I see a badge count next to "Home" showing total pending feed items.

2. **Given** the badge shows "23", **When** I approve an invoice from the feed, **Then** the badge updates to "22" in real-time (optimistic update).

3. **Given** I have items across types, **When** I view the feed header, **Then** I see grouped counts: "12 transactions · 5 approvals · 3 documents · 3 alerts".

4. **Given** I have zero pending items, **When** I look at the sidebar, **Then** no badge is displayed (not a "0" badge).

---

### User Story 4 — Inline Actions (Priority: P2)

A user wants to take quick actions on feed items without navigating away from the feed. Expanding a feed item inline reveals a summary and action buttons, enabling rapid triage — approve an invoice, confirm a bank classification, dismiss a notification — all without losing context.

**Why this priority**: Inline actions are the productivity multiplier. Without them, every feed item requires a full page navigation and back-navigation, turning a 2-second action into a 10-second round trip. However, the feed is functional without inline actions (users can click through), making this P2 rather than P1.

**Independent Test**: Expand an invoice approval feed item inline. Verify the invoice summary (number, amount, requester) is displayed. Click "Approve" inline. Verify the item animates out of the feed and the count decrements. Expand a bank transaction item and verify the AI-suggested classification is shown with confirm/override options.

**Acceptance Scenarios**:

1. **Given** a feed item is an invoice approval, **When** I expand it inline, **Then** I see the invoice summary and can Approve or Reject without leaving the feed.

2. **Given** a feed item is a bank transaction classification, **When** I expand it, **Then** I see the AI-suggested classification and can confirm or override inline.

3. **Given** I take an inline action, **When** it succeeds, **Then** the item animates out of the feed (or updates to "completed" state) and the count badge decrements.

4. **Given** I take an inline action, **When** it fails (e.g., network error), **Then** the item reverts to its previous state with an error toast, and the optimistic count update rolls back.

---

### User Story 5 — Feed Preferences (Priority: P3)

A user wants to control what appears in their feed and how they are notified. An accountant managing 20 workspaces may want to suppress system notifications and prioritise items from their top 5 clients. Preferences give users control over signal-to-noise ratio.

**Why this priority**: Preferences are a refinement layer. The feed works without them — all items appear for all users. P3 because the value is incremental (noise reduction) rather than foundational. The email digest preference is defined in the model but actual email delivery depends on 023-EML infrastructure.

**Independent Test**: Navigate to Settings > Feed Preferences. Toggle off "System Notifications". Verify system notification items no longer appear in the feed. Set 3 priority workspaces. Verify items from those workspaces appear first in the feed.

**Acceptance Scenarios**:

1. **Given** I am on Settings > Feed Preferences, **When** I toggle off "System Notifications", **Then** system notification items no longer appear in my feed.

2. **Given** I configure "Email digest", **When** I choose "Daily at 8am", **Then** the preference is saved (actual email delivery depends on 023-EML integration).

3. **Given** I am an accountant managing 20 workspaces, **When** I set priority workspaces, **Then** items from those workspaces appear first in the feed, above items from non-priority workspaces.

4. **Given** I have customised my preferences, **When** I log in on a different device, **Then** my preferences are applied (server-side, not localStorage).

---

### Edge Cases

- **Empty feed state**: When a user has zero pending items across all workspaces, the feed displays a congratulatory empty state — not a broken or blank page. The badge count hides entirely (no "0" badge).

- **Workspace removed mid-session**: When a user is removed from a workspace while viewing the feed, items from that workspace remain visible until the next fetch. On the next poll/scroll, those items are filtered out and the counts update.

- **Bulk item creation (feed flood)**: When a bank feed sync creates 200+ transactions, the system batches them into a single feed item using `group_key` (e.g., "15 unclassified transactions in Acme Corp") rather than creating 200 individual items.

- **Concurrent inline actions**: When a user rapidly actions multiple feed items, each optimistic update is tracked independently. If one fails, only that item rolls back — other successful actions are unaffected.

- **Feed item source deleted**: When the underlying entity (e.g., an invoice) is deleted after a feed item is created, clicking the feed item shows a "This item is no longer available" message and offers to dismiss the feed item.

- **User with 50+ workspaces**: The feed must handle users with 50+ workspaces and 1000+ pending items without degradation. Cursor-based pagination and indexed queries ensure consistent performance regardless of volume.

- **Duplicate feed items**: When multiple events generate overlapping feed items (e.g., an invoice is submitted and then re-submitted), the system deduplicates using `group_key` to avoid showing the same logical item twice.

- **Pruning timing**: Actioned/dismissed items older than 90 days are automatically pruned by a nightly job. Unactioned items are never pruned — they represent work to do.

---

## Requirements

### Functional Requirements

**Feed Core**
- **FR-001**: System MUST aggregate feed items from all workspaces the user has access to, scoped by `user_id`, displayed in reverse-chronological order.
- **FR-002**: System MUST support 10 feed item types: `bank_transaction`, `invoice_approval`, `document_inbox`, `anomaly_alert`, `period_reminder`, `feed_error`, `task_assigned`, `revaluation_summary`, `system_notification`, `workspace_invitation`.
- **FR-003**: System MUST assign a priority to each feed item: `critical`, `high`, `normal`, or `low`. High-priority items display with visual emphasis (red/amber badges).
- **FR-004**: System MUST support item batching via `group_key` — similar items from the same workspace are collapsed into a single feed item with a count (e.g., "15 unclassified transactions in Acme Corp").

**Feed Pagination & Performance**
- **FR-005**: System MUST use cursor-based pagination for the feed endpoint to support infinite scroll without offset drift when new items are added.
- **FR-006**: System MUST support filtering by item type, workspace, and priority via query parameters on the feed endpoint.
- **FR-007**: System MUST provide a counts endpoint returning grouped counts by type for the feed header summary.

**Feed Item Lifecycle**
- **FR-008**: Each feed item MUST have a status: `unread`, `read`, `actioned`, or `dismissed`.
- **FR-009**: System MUST support marking items as read, actioned, or dismissed via individual PATCH endpoints.
- **FR-010**: System MUST support bulk dismiss by type and/or workspace.
- **FR-011**: System MUST prune actioned/dismissed items older than 90 days via a nightly scheduled job. Unactioned items MUST NOT be pruned.

**Feed Item Creation**
- **FR-012**: Any part of the system MUST be able to create feed items by dispatching a `CreateUserFeedItem` job — fire-and-forget, eventually consistent.
- **FR-013**: Feed item creation MUST NOT slow down the triggering action — dispatch is asynchronous.

**Feed Badges**
- **FR-014**: Sidebar MUST display a badge count next to "Home" showing total pending (unread + read but unactioned) feed items.
- **FR-015**: Badge count MUST update via polling every 30 seconds. Optimistic updates MUST decrement the badge immediately when an inline action succeeds.

**Inline Actions**
- **FR-016**: Feed items MUST support inline expansion showing a summary and contextual action buttons (approve/reject, confirm/override, dismiss).
- **FR-017**: Inline actions MUST use optimistic updates with rollback on failure.

**Feed Preferences**
- **FR-018**: System MUST allow users to toggle visibility of each feed item type via a preferences endpoint.
- **FR-019**: System MUST allow users to designate priority workspaces whose items appear first in the feed.
- **FR-020**: System MUST allow users to configure email digest frequency (off, daily, weekly). Actual email delivery depends on 023-EML integration.
- **FR-021**: Feed preferences MUST be stored server-side and apply across all devices.

**API Endpoints**
- **FR-022**: `GET /api/v1/user/feed` — paginated feed (cursor-based for infinite scroll), filterable by type, workspace, priority.
- **FR-023**: `GET /api/v1/user/feed/counts` — grouped counts by type.
- **FR-024**: `PATCH /api/v1/user/feed/{id}/read` — mark as read.
- **FR-025**: `PATCH /api/v1/user/feed/{id}/action` — mark as actioned.
- **FR-026**: `PATCH /api/v1/user/feed/{id}/dismiss` — dismiss.
- **FR-027**: `POST /api/v1/user/feed/dismiss-all` — bulk dismiss by type/workspace.
- **FR-028**: `GET /api/v1/user/feed/preferences` — get feed preferences.
- **FR-029**: `PATCH /api/v1/user/feed/preferences` — update feed preferences.

**Frontend**
- **FR-030**: Frontend MUST use TanStack Query `useInfiniteQuery` for the infinite scroll feed with cursor-based pagination.
- **FR-031**: Frontend MUST use TanStack Virtual for rendering only visible items in long feeds.
- **FR-032**: Frontend MUST use a Zustand store for feed filter state, persisted to localStorage.
- **FR-033**: Frontend MUST display each feed item with workspace name, colour, type icon, priority badge, timestamp, and action button(s).

### Key Entities

- **UserFeedItem**: A central (NOT tenant-scoped) model representing a single attention item for a user. Scoped by `user_id` with `workspace_id` for filtering. Contains `type` (enum of 10 item types), `priority` (critical/high/normal/low), `title`, `body` (nullable, for expanded inline view), `data` (JSON — type-specific payload with IDs, amounts, counts), `action_url` (deep link into workspace page), `status` (unread/read/actioned/dismissed), `group_key` (nullable — for batching similar items), `created_at`, and `actioned_at` (nullable). Central table because the feed spans workspaces.

- **UserFeedPreference**: A central model storing per-user feed configuration. Contains `user_id`, `hidden_types` (JSON array of suppressed feed item types), `priority_workspace_ids` (JSON array of workspace IDs to prioritise), `email_digest_frequency` (off/daily/weekly), and `email_digest_time` (time of day for digest delivery).

- **FeedItemType** (enum): `bank_transaction`, `invoice_approval`, `document_inbox`, `anomaly_alert`, `period_reminder`, `feed_error`, `task_assigned`, `revaluation_summary`, `system_notification`, `workspace_invitation`.

- **FeedPriority** (enum): `critical`, `high`, `normal`, `low`.

- **FeedItemStatus** (enum): `unread`, `read`, `actioned`, `dismissed`.

### Feed Item Type Reference

| Type | Source Epic | Example | Inline Action |
|------|------------|---------|---------------|
| `bank_transaction` | 048-FPL | "15 unclassified transactions in Acme Corp" | Reconcile |
| `invoice_approval` | 005-IAR | "Invoice #1042 from Sarah awaiting your approval" | Approve/Reject |
| `document_inbox` | 019-AIX | "3 new documents processed by AI — review classifications" | Review |
| `anomaly_alert` | 040-AND | "Potential duplicate payment: $3,300 to Office Supplies Co" | Investigate |
| `period_reminder` | Accounting Periods | "March 2026 period closes in 3 days" | Close Period |
| `feed_error` | 048-FPL | "Basiq sync failed for Smith Family Trust — auth expired" | Reconnect |
| `task_assigned` | 027-PMV | "New task: Prepare BAS for Q3 — due April 28" | Open Task |
| `revaluation_summary` | 049-APF | "Monthly revaluation: portfolio up $12,400 across 3 entities" | View Details |
| `system_notification` | Various | "MoneyQuest update: Batch payments now available" | Dismiss/Learn More |
| `workspace_invitation` | 003-AUT | "You've been invited to join 'Johnson Family Office'" | Accept/Decline |

---

## Success Criteria

- **SC-001**: Feed loads initial page (20 items) in under 200ms for a user with 50+ workspaces.
- **SC-002**: Infinite scroll loads next page in under 100ms using cursor-based indexed queries.
- **SC-003**: Feed item creation does not add measurable latency to the triggering action (async dispatch).
- **SC-004**: Badge counts update within 30 seconds of a change via polling.
- **SC-005**: Feed handles users with 50+ workspaces and 1000+ pending items without performance degradation.
- **SC-006**: Pruning job completes nightly, removing actioned/dismissed items older than 90 days.
- **SC-007**: Inline actions complete optimistically in under 100ms from user click to UI update.
- **SC-008**: Filter state persists across page navigations and browser refreshes.
- **SC-009**: Zero feed items leak across users — `user_id` scoping is enforced at the query level, not just middleware.

---

## Clarifications

### Session 2026-03-19

- Q: Why is the UserFeedItem table central (not tenant-scoped)? → A: The feed spans workspaces. A bookkeeper managing 8 client workspaces needs to see items from all 8 in a single query. Tenant-scoping would require 8 separate queries and cross-database joins. Central table with `user_id` as primary scope and `workspace_id` for filtering.

- Q: Why cursor-based pagination instead of offset-based? → A: Offset-based breaks when new items are added while the user is scrolling. If 5 new items arrive while viewing page 2, offset-based page 3 duplicates 5 items from page 2. Cursor-based uses `created_at` + `id` as the cursor, immune to insertions.

- Q: How are feed items created? → A: Fire-and-forget. Any Action, Listener, or Observer dispatches a `CreateUserFeedItem` job with the item payload. The feed is eventually consistent — a few seconds of delay is acceptable. The creation job handles group_key deduplication and batching.

- Q: How does group_key batching work? → A: When a feed item is created with a `group_key` that matches an existing unactioned item for the same user, the existing item's count is incremented and its timestamp updated rather than creating a duplicate. Example: 50 bank transactions from a sync become one item: "15 unclassified transactions in Acme Corp".

- Q: Real-time updates — polling or WebSocket? → A: Polling every 30 seconds for v1. The counts endpoint is lightweight (single indexed query). WebSocket upgrade deferred until DAU volume justifies the infrastructure cost. Optimistic updates on inline actions provide perceived real-time behaviour.

- Q: Feed preferences — client-side or server-side? → A: Server-side for preferences (hidden types, priority workspaces, digest config) so they apply across devices. Client-side (Zustand + localStorage) for ephemeral filter state (current type/workspace filter selection) since that is session-specific.

- Q: What happens to feed items when a user loses workspace access? → A: Items from that workspace remain in the database but are filtered out of query results. The query joins against workspace membership, so revoked access automatically excludes those items. No cleanup job needed.

- Q: Dependencies — does 050-UAF require 048-FPL, 040-AND, etc. to be complete? → A: No. The feed infrastructure (model, API, frontend) is independent. Feed item creation is a simple job dispatch that any epic can call. Dependencies are soft — each source epic adds its own `CreateUserFeedItem` dispatches when ready. The feed works with zero items and progressively fills as source epics integrate.
