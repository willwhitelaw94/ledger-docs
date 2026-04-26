---
title: "Feature Specification: Activity Feed — The Harbour Front Door"
---

# Feature Specification: Activity Feed — The Harbour Front Door

**Feature Branch**: `055-ACF-activity-feed`
**Created**: 2026-03-19
**Status**: Draft
**Epic**: 055-ACF
**Initiative**: FL-financial-ledger
**Effort**: Large (4 phases)
**Depends On**: 048-FPL (Feed Pipeline Infrastructure), 024-NTF (Existing Notifications)

## Out of Scope (v1 Boundaries)

- **Cross-workspace aggregation** — v1 is per-workspace only. Aggregated `/home` feed across all workspaces is a future iteration.
- **Real-time WebSocket push** — v1 uses polling (30s). WebSocket/SSE upgrade is Phase 5+.
- **External news sources** — RBA rates, market close, compliance updates require external data integrations (Phase 4).
- **Insight cards** — Health score (051-EHS), nudges (052-ABN), and pulse (053-PLS) integration deferred to Phase 4.
- **AI-prioritised feed ranking** — v1 uses chronological ordering with pinned actions. ML-based smart ordering is future.
- **Mobile push notifications** — v1 is in-app feed only. Push notifications are a separate concern.

## Overview

The Activity Feed is the front door of MoneyQuest. It's where users land, and it answers three questions instantly: What needs my attention? What's happening right now? What should I know? This isn't a notification list — it's a Bloomberg terminal meets Linear meets Superhuman — a unified stream that blends actions, activity, news, and insights into one living, breathing view that makes users open MoneyQuest first thing every morning.

Today, a bookkeeper managing 8 entities has to click into each workspace, check banking, check invoices, check the inbox. The Activity Feed eliminates all of that — one screen, everything happening across the workspace, prioritised and filterable. For the universal ledger vision, this is the surface where all data sources converge: bank transactions, share prices, property valuations, AI document processing, team actions, compliance deadlines. The feed pipeline (048-FPL) is the engine. This is the dashboard.

## User Scenarios & Testing

### User Story 1 — Entity Dashboard Activity Feed (Priority: P1)

A user opens MoneyQuest and immediately sees what's happening and what needs attention. The feed replaces the current dashboard as the primary landing view, with three distinct sections — pinned actions at top, a chronological ticker of all workspace activity, and a collapsible insights panel. Users can toggle between Feed view and the existing charts/summary dashboard.

**Why this priority**: The feed is the entire value proposition of this epic. Without the three-section layout rendering correctly, nothing else matters.

**Independent Test**: Can be fully tested by logging in, navigating to the workspace dashboard, and verifying the three sections render with appropriate content.

**Acceptance Scenarios**:

1. **Given** I navigate to the entity dashboard, **When** the feed loads, **Then** I see three sections: Needs Attention (pinned actions with badge count), Live Ticker (chronological activity stream with infinite scroll), and Insights (collapsible panel).
2. **Given** I have 5 unclassified transactions and 1 overdue invoice, **When** I view Needs Attention, **Then** I see both items with inline action buttons (Classify, Send Reminder) sorted by priority (critical first).
3. **Given** the ticker has 100+ items, **When** I scroll down, **Then** items load progressively via cursor-based infinite scroll without interrupting the pinned actions section.
4. **Given** I prefer the traditional dashboard, **When** I toggle the view switcher, **Then** I see the existing charts/summary dashboard instead of the feed.

---

### User Story 2 — Live Ticker (Priority: P1)

A user wants to see a real-time stream of everything happening in the workspace — bank syncs, journal entries, invoices, payments, document processing, and team actions — as a chronological feed with rich context for each item.

**Why this priority**: The ticker is the core content of the feed. It must render diverse activity types with appropriate icons, avatars, amounts, and deep links.

**Independent Test**: Can be tested by triggering various workspace actions (posting a JE, syncing a bank account) and verifying items appear in the ticker with correct metadata.

**Acceptance Scenarios**:

1. **Given** a bank sync just completed, **When** the ticker updates, **Then** I see "Bank sync: 12 new transactions from ANZ" with a timestamp and the ANZ source icon.
2. **Given** Emma just posted a journal entry, **When** it appears in the ticker, **Then** I see "JE #1043 posted by Emma — Office Supplies $450" with Emma's avatar and a clickable link to the JE detail page.
3. **Given** I filter by "Banking" source, **When** the ticker reloads, **Then** I only see bank-related activity (syncs, classifications, reconciliations) and the filter persists across navigation.
4. **Given** a batched event with `group_key` (e.g., "8 transactions auto-classified via rules"), **When** it appears, **Then** it shows as a single grouped item with the aggregate count, not 8 individual items.

---

### User Story 3 — Inline Actions (Priority: P1)

A user wants to take quick actions on attention items without leaving the feed — classify transactions, approve invoices, send reminders, reconnect bank feeds — all from the action card itself.

**Why this priority**: Inline actions are what differentiate the feed from a passive notification list. They turn the feed into a command centre where work gets done.

**Independent Test**: Can be tested by clicking inline action buttons on various action item types and verifying the action completes and the item transitions correctly.

**Acceptance Scenarios**:

1. **Given** "5 transactions need classification" is in Needs Attention, **When** I click "Classify", **Then** I'm navigated to `/feed?status=pending` with those items ready for processing.
2. **Given** "Invoice #238 overdue" is pinned, **When** I click "Send Reminder", **Then** a reminder email is sent and the item moves from Needs Attention to the ticker as "Reminder sent for Invoice #238".
3. **Given** I dismiss an action item, **When** I click the dismiss button, **Then** it animates out of the Needs Attention section and the action count badge decrements immediately (optimistic update).
4. **Given** I click "Approve" on "Invoice #1042 awaiting your approval", **When** the approval succeeds, **Then** the action item is marked as actioned and a new "Invoice #1042 approved" activity item appears in the ticker.

---

### User Story 4 — Feed Filtering (Priority: P2)

A user wants to filter the feed to focus on specific categories or sources — viewing only banking activity, only action items, or only items from a specific time range — to cut through noise and find what matters.

**Why this priority**: Filtering is essential for power users managing busy workspaces, but the default unfiltered view must work well first (P1 stories).

**Independent Test**: Can be tested by applying various filter combinations and verifying the ticker content updates correctly.

**Acceptance Scenarios**:

1. **Given** I'm viewing the ticker, **When** I click the "Activity" category tab, **Then** I see only activity items (not actions, news, or insights).
2. **Given** I select source filter "Invoicing", **When** applied, **Then** I see only invoice-related events (sent, paid, overdue, approved).
3. **Given** I'm on the "Actions only" tab, **When** I view it, **Then** I see all pending action items sorted by priority (critical first, then high, normal, low).
4. **Given** I apply multiple filters (category + source), **When** both are active, **Then** they combine as AND logic — only items matching both filters are shown.

---

### User Story 5 — Badge Count in Sidebar (Priority: P1)

A user wants to see at a glance how many items need attention without navigating to the feed — a persistent badge on the sidebar "Feed" navigation item that updates in real time.

**Why this priority**: The badge count is the hook that draws users into the feed. It must be visible on every page and update without manual refresh.

**Independent Test**: Can be tested by creating action items and verifying the sidebar badge increments, then actioning items and verifying it decrements.

**Acceptance Scenarios**:

1. **Given** I have 7 active action items, **When** I look at the sidebar on any page, **Then** the "Feed" nav item shows a red badge with "7".
2. **Given** I action an item from the feed, **When** it resolves, **Then** the badge decrements to "6" immediately via optimistic update.
3. **Given** no action items exist, **When** I look at the sidebar, **Then** no badge is shown (not "0").
4. **Given** I'm on a different page (e.g., Invoices), **When** a new action item is created by the system, **Then** the badge updates within 30 seconds via polling.

---

### User Story 6 — Polling & Freshness (Priority: P2)

A user wants the feed to feel alive without manual refresh — new items should surface automatically and the feed should indicate when new content is available.

**Why this priority**: Without freshness, the feed feels stale and users won't trust it as a real-time source of truth. But polling is acceptable for v1 (WebSockets are future).

**Independent Test**: Can be tested by triggering background activity (bank sync) while the feed is open and verifying the "New items" banner appears.

**Acceptance Scenarios**:

1. **Given** the feed is visible, **When** new activity occurs (bank sync completes, JE posted by another user), **Then** a "New items" banner appears at the top of the ticker. Clicking it scrolls to top and shows the new items.
2. **Given** the feed is in the background (user is on a different page), **When** new action items arrive, **Then** the sidebar badge updates via polling every 30 seconds.
3. **Given** the user has been away for hours, **When** they return to the feed, **Then** the feed refreshes automatically on mount and shows all new items since last visit.

---

### User Story 7 — Insights Section (Priority: P3)

A user wants smart insights surfaced in the feed — health scores, spending nudges, and pulse report summaries — without needing to navigate to separate analytics pages.

**Why this priority**: Insights depend on 051-EHS, 052-ABN, and 053-PLS which are separate epics. The insights section is a container that will populate as those features ship.

**Independent Test**: Can be tested once insight-generating epics are available, by verifying insight items render correctly in the collapsible section.

**Acceptance Scenarios**:

1. **Given** the health score updated (051-EHS), **When** I view the insights section, **Then** I see "Health Score: 74 (+2 this week)" with a sparkline visualisation.
2. **Given** a nudge was generated (052-ABN), **When** it appears in insights, **Then** I see the nudge text with "Helpful" / "Not relevant" feedback buttons.
3. **Given** a monthly Pulse Report is ready (053-PLS), **When** it appears, **Then** I see a summary card with a "View Full Report" link.
4. **Given** no insight-generating features are active for this workspace, **When** I view the feed, **Then** the insights section is hidden entirely (not shown as empty).

---

### Edge Cases

- **What happens when a workspace has zero activity?** The feed shows an empty state with onboarding prompts ("Connect a bank account", "Create your first invoice") instead of blank space.
- **What happens with group_key deduplication?** If a `group_key` item already exists within the last hour and is unread, the existing item is updated (count incremented, title refreshed) instead of creating a duplicate.
- **What happens when an action item's subject is deleted?** The action item is auto-expired. The `action_url` deep link gracefully handles missing subjects (404 with context, not a crash).
- **What happens when a user has no permission to action an item?** The inline action button is hidden for that user. The item is still visible as informational.
- **What happens to dismissed/expired items?** Items with status `dismissed` or `expired` older than 90 days are auto-purged by a nightly scheduled command.
- **What happens when the feed has thousands of items?** Cursor-based pagination ensures consistent performance. The initial page loads 20 items; subsequent pages load on scroll.
- **What happens during the notification migration?** The existing `Notification` model (024-NTF) continues to work in parallel. Event listeners dual-write to both systems during the transition period (Phase 2 → Phase 3).
- **What about tenant isolation?** All `ActivityItem` records are scoped by `workspace_id`. The global scope prevents any cross-tenant data leakage. Tests verify isolation.

## Feed Architecture

### Three Sections, One Stream

```
+---------------------------------------------+
|  NEEDS ATTENTION (badge count)               |
|  Pinned action items - things YOU must do    |
|  Dismissible, actionable inline              |
+---------------------------------------------+
|  LIVE TICKER                                 |
|  Chronological stream of all activity        |
|  Infinite scroll, auto-refreshes             |
|  Filterable by type, source, date            |
+---------------------------------------------+
|  INSIGHTS (collapsible)                      |
|  Health score, nudges, pulse summary         |
|  Refreshes weekly or on-demand               |
+---------------------------------------------+
```

### Feed Item Taxonomy

Every item in the feed is an `ActivityItem` with a `category` and `source`:

#### Category: Action (needs attention)

| Type | Source | Example | Inline Action |
|------|--------|---------|---------------|
| `txn_classify` | Feed Pipeline | "5 bank transactions need classification" | Classify / Skip |
| `invoice_approve` | Invoicing | "Invoice #1042 awaiting your approval" | Approve / Reject |
| `invoice_overdue` | Invoicing | "Invoice #238 is 7 days overdue ($4,500)" | Send Reminder |
| `bill_due` | Bills | "3 bills due this week ($12,300 total)" | View / Pay |
| `document_review` | AI Inbox | "2 documents processed — review classifications" | Review |
| `period_close` | Accounting | "March period closes in 3 days" | Close Period |
| `reconciliation_gap` | Banking | "Bank balance $2,340 off from ledger" | Reconcile |
| `feed_error` | Feed Pipeline | "Basiq sync failed — auth expired" | Reconnect |
| `bas_deadline` | Compliance | "Q3 BAS due April 28 (12 days)" | Prepare BAS |

#### Category: Activity (what happened)

| Type | Source | Example |
|------|--------|---------|
| `txn_synced` | Feed Pipeline | "Bank sync: 12 new transactions from ANZ" |
| `txn_classified` | Feed Pipeline | "8 transactions auto-classified via rules" |
| `je_posted` | Ledger | "JE #1043 posted by Emma — Office Supplies $450" |
| `je_approved` | Ledger | "JE #1042 approved by Sarah" |
| `je_reversed` | Ledger | "JE #1038 reversed by Sarah — reason: duplicate" |
| `invoice_sent` | Invoicing | "Invoice #240 sent to Acme Corp ($8,500)" |
| `invoice_paid` | Invoicing | "Invoice #235 paid by Widget Co ($3,200)" |
| `payment_received` | Payments | "Payment $3,200 from Widget Co allocated" |
| `contact_created` | Contacts | "New contact: Brisbane Plumbing Pty Ltd" |
| `document_processed` | AI Inbox | "Receipt from Officeworks auto-classified as expense" |
| `revaluation` | Asset Feeds | "Property AVM update: Cremorne +$12,000" |
| `dividend_received` | Sharesight | "BHP dividend: $750 (500 shares x $1.50)" |
| `price_change` | Asset Feeds | "BHP.AX $46.80 +1.2% — portfolio +$400" |
| `rule_matched` | Feed Pipeline | "Rule 'Woolworths -> Groceries' matched 3 items" |
| `user_action` | Auth | "Emma logged in" |
| `workspace_joined` | Auth | "Mike invited as bookkeeper" |

#### Category: News (external information)

| Type | Source | Example |
|------|--------|---------|
| `rate_change` | RBA / Interest | "RBA rate decision: held at 4.10%" |
| `market_close` | Market Data | "ASX200 closed 8,142 +0.3% — your portfolio +$1,200" |
| `compliance_update` | ATO / Regulatory | "ATO: Single Touch Payroll Phase 2 deadline extended" |
| `dividend_announced` | Sharesight | "BHP announces $1.50 dividend — ex-date March 28" |
| `property_update` | RP Data | "Cremorne median price up 2.1% this quarter" |

#### Category: Insight (smart analysis)

| Type | Source | Example |
|------|--------|---------|
| `health_score` | 051-EHS | "Health Score: 74 (+2 this week) — cash flow improving" |
| `nudge` | 052-ABN | "Office supplies spend 2.3x your usual this month" |
| `pulse_available` | 053-PLS | "Monthly Pulse Report ready — view insights" |
| `anomaly` | 040-AND | "Unusual: $8,500 payment to new vendor 'XYZ Services'" |
| `benchmark` | 034-IBR | "Your rent/revenue ratio (18%) is above industry median (12%)" |

### Creation Pattern

Any part of the system creates activity items via a simple action:

```php
CreateActivityItem::run(
    workspaceId: $workspace->id,
    category: ActivityCategory::Activity,
    type: 'je_posted',
    source: 'ledger',
    title: "JE #{$entry->number} posted — {$entry->memo}",
    data: ['journal_entry_id' => $entry->id, 'amount' => $entry->total],
    actorId: $user->id,
    subjectType: 'journal_entry',
    subjectId: $entry->id,
    actionUrl: "/journal-entries/{$entry->uuid}",
);
```

For batched items (e.g., "12 new bank transactions"), use `group_key`:

```php
CreateActivityItem::run(
    workspaceId: $workspace->id,
    category: ActivityCategory::Activity,
    type: 'txn_synced',
    source: 'feed_pipeline',
    title: "Bank sync: {$count} new transactions from {$source->name}",
    data: ['feed_source_id' => $source->id, 'count' => $count],
    groupKey: "txn_synced:{$source->id}",
);
```

Group key deduplication: if a `group_key` item already exists within the last hour and is unread, update it instead of creating a duplicate.

### Migration from Existing Notifications

The existing `Notification` model (024-NTF) and its 8 event listeners continue to work. The Activity Feed is a **new, parallel system** — not a replacement. Over time, notification events will also create `ActivityItem` records so they appear in the feed.

- Phase 1: ActivityItem system built alongside notifications.
- Phase 2: Event listeners dual-write to both Notification and ActivityItem.
- Phase 3: Notifications UI deprecated in favour of Activity Feed.

### Frontend Component Tree

```
ActivityFeed (page-level)
+-- ActivityActions (pinned section)
|   +-- ActionItemCard (expandable, with inline action buttons)
|   +-- ActionBadge (count)
+-- ActivityTicker (infinite scroll section)
|   +-- TickerFilters (category tabs + source dropdown)
|   +-- NewItemsBanner ("3 new items - click to refresh")
|   +-- TickerList (virtualised infinite scroll)
|       +-- TickerItem (single activity row)
|           +-- ActorAvatar / SourceIcon
|           +-- Title + Body
|           +-- Amount (if applicable)
|           +-- RelativeTime
|           +-- ActionLink (deep link to subject)
+-- ActivityInsights (collapsible section)
|   +-- HealthScoreCard (sparkline + score)
|   +-- NudgeCard (dismissible insight)
|   +-- PulseCard (report summary)
+-- ActivityEmpty (empty state when no items)
```

### Data Fetching

- **Actions**: `useQuery` — fetches `/api/v1/activity/actions`, polls every 30s
- **Ticker**: `useInfiniteQuery` — cursor-based infinite scroll, polls for new items
- **Counts**: `useQuery` — fetches `/api/v1/activity/counts`, polls every 30s for badge
- **Insights**: `useQuery` — fetches on mount, refreshes on demand

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `G then F` | Navigate to Feed (already reserved) |
| `J` / `K` | Move selection down / up in ticker |
| `Enter` | Open selected item's subject |
| `X` | Dismiss selected item |
| `R` | Mark selected item as read |

## Requirements

### Functional Requirements

**Activity Item Model & Creation**

- **FR-001**: System MUST provide an `ActivityItem` model scoped by `workspace_id` with category, type, source, priority, title, body, data (JSON), actor, polymorphic subject, action URL, group key, and status tracking fields.
- **FR-002**: System MUST provide a `CreateActivityItem` action that any part of the system can call to emit activity items with full payload (category, type, source, title, data, actor, subject, action URL).
- **FR-003**: System MUST implement group key deduplication: if a `group_key` item already exists within the last hour and is unread, update the existing item instead of creating a duplicate.
- **FR-004**: Activity item creation MUST NOT slow the triggering action — use fire-and-forget dispatch pattern.
- **FR-005**: System MUST support polymorphic subjects via morph map (invoice, journal_entry, bank_transaction, contact, job, feed_source).

**API Endpoints**

- **FR-006**: System MUST provide a paginated feed endpoint (`GET /api/v1/activity`) with cursor-based pagination and filters for category, source, priority, status, and pinned.
- **FR-007**: System MUST provide a counts endpoint (`GET /api/v1/activity/counts`) returning counts by category, total unread, and total active actions.
- **FR-008**: System MUST provide an actions-only endpoint (`GET /api/v1/activity/actions`) returning only pinned, unactioned action items.
- **FR-009**: System MUST provide status mutation endpoints: mark as read, mark as actioned, dismiss (single item), bulk dismiss by category/type, and mark all as read.
- **FR-010**: All API responses MUST use Laravel API Resources with typed response shapes including `relative_time`, `priority_colour`, and `category_label` computed fields.

**Feed Sections**

- **FR-011**: System MUST render three feed sections: Needs Attention (pinned actions with badge count), Live Ticker (chronological infinite scroll), and Insights (collapsible).
- **FR-012**: Needs Attention section MUST show action items sorted by priority (critical, high, normal, low) with inline action buttons specific to each action type.
- **FR-013**: Live Ticker MUST support cursor-based infinite scroll loading 20 items per page.
- **FR-014**: Insights section MUST be collapsible and hidden entirely when no insight-generating features are active.

**Filtering & Navigation**

- **FR-015**: System MUST support filtering by category (tabs) and source (dropdown), combinable as AND logic.
- **FR-016**: System MUST display a red badge count on the sidebar "Feed" nav item showing the count of active action items.
- **FR-017**: Sidebar badge MUST update via polling every 30 seconds and decrement optimistically when items are actioned.

**Freshness & Polling**

- **FR-018**: System MUST poll for new items every 30 seconds when the feed is visible, showing a "New items" banner rather than auto-inserting (to prevent layout shift).
- **FR-019**: System MUST poll action counts every 30 seconds on all pages (for sidebar badge updates).

**Event Source Integration**

- **FR-020**: System MUST dual-write to both Notification and ActivityItem during the migration period, with existing notification listeners continuing to function.
- **FR-021**: System MUST wire up initial event sources in Phase 1: JE posted/approved/reversed, bank sync completed, invoice sent/paid/overdue, and feed pipeline errors.
- **FR-022**: System MUST support all activity types defined in the feed item taxonomy (9 action types, 16 activity types, 5 news types, 5 insight types).

**Lifecycle & Cleanup**

- **FR-023**: System MUST auto-expire action items whose subject has been resolved (e.g., overdue invoice gets paid).
- **FR-024**: System MUST prune dismissed/expired items older than 90 days via a nightly scheduled command.

**Tenant Isolation**

- **FR-025**: All ActivityItem records MUST be scoped by `workspace_id` with a global scope preventing cross-tenant data access.
- **FR-026**: Tests MUST verify tenant isolation — a user in Workspace A cannot see ActivityItems from Workspace B.

### Key Entities

- **ActivityItem**: The core feed item model. Tenant-scoped (`workspace_id`). Has `uuid` for API exposure, `category` (action/activity/news/insight), `type` (granular event type string), `source` (originating system), `priority` (critical/high/normal/low), `title` (short display text), `body` (optional markdown detail), `data` (JSON payload with type-specific IDs, amounts, counts), `actor_id` (nullable FK to users — who triggered it), `subject_type`/`subject_id` (polymorphic reference to the related entity), `action_url` (deep link), `group_key` (for batching similar items), `status` (active/read/actioned/dismissed/expired), `is_pinned` (boolean — pinned items appear in Needs Attention), and timestamp fields (`read_at`, `actioned_at`, `dismissed_at`, `expires_at`). Scopes: `active`, `actions`, `forCategory`, `unread`, `pinned`.

- **ActivityCategory** (enum): `action` (needs user attention), `activity` (something happened), `news` (external information), `insight` (smart analysis).

- **ActivityPriority** (enum): `critical` (red — immediate action), `high` (amber — soon), `normal` (default), `low` (subtle).

- **ActivityItemStatus** (enum): `active`, `read`, `actioned`, `dismissed`, `expired`.

### API Contracts

```
GET    /api/v1/activity                    — paginated feed (cursor-based infinite scroll)
                                             ?category=action|activity|news|insight
                                             ?source=feed_pipeline|ledger|invoicing|...
                                             ?priority=critical|high
                                             ?status=active|read
                                             ?pinned=true
GET    /api/v1/activity/counts             — counts by category + total unread + total actions
GET    /api/v1/activity/actions            — only action items (pinned, unactioned)
GET    /api/v1/activity/{uuid}             — single item detail
PATCH  /api/v1/activity/{uuid}/read        — mark as read
PATCH  /api/v1/activity/{uuid}/action      — mark as actioned (dismiss from action list)
PATCH  /api/v1/activity/{uuid}/dismiss     — dismiss (hide from feed)
POST   /api/v1/activity/dismiss-all        — bulk dismiss by category or type
POST   /api/v1/activity/mark-all-read      — mark all as read
```

### Response Shape

```json
{
  "data": [
    {
      "uuid": "abc-123",
      "category": "action",
      "category_label": "Needs Attention",
      "type": "txn_classify",
      "source": "feed_pipeline",
      "priority": "high",
      "priority_colour": "amber",
      "title": "5 transactions need classification",
      "body": null,
      "data": { "feed_source_id": "uuid-456", "count": 5 },
      "actor": { "name": "System", "avatar": null },
      "action_url": "/feed?status=pending",
      "is_pinned": true,
      "status": "active",
      "read_at": null,
      "created_at": "2026-03-19T10:30:00Z",
      "relative_time": "2 minutes ago"
    }
  ],
  "meta": {
    "next_cursor": "eyJ...",
    "per_page": 20
  }
}
```

## Implementation Phases

### Phase 1: Core Model + Creation + API (Backend)

- ActivityItem model, migration, enums
- CreateActivityItem action with group_key dedup
- API endpoints (list, counts, actions, read, dismiss)
- ActivityItemPolicy + resource
- Wire up 3-4 existing events to dual-write (JE posted, bank sync, invoice paid, invoice overdue)

### Phase 2: Frontend — Feed UI

- TypeScript types, hooks (useActivity, useActivityCounts, useActivityActions)
- TickerItem, TickerList (infinite scroll), TickerFilters
- ActionItemCard, ActivityActions section
- Feed page with three-section layout
- Sidebar badge count with polling
- Keyboard shortcuts

### Phase 3: Wire Up All Event Sources

- All existing notification listeners dual-write to ActivityItem
- Feed pipeline events (sync, classify, error) create activity items
- Invoice lifecycle events (sent, paid, overdue)
- Contact/job/period events
- Feed source health events

### Phase 4: News + Insights Integration

- External news items (RBA rates, market close — requires data sources)
- Health score integration (051-EHS)
- Nudge integration (052-ABN)
- Pulse report integration (053-PLS)
- Insights section UI

## Non-Functional Requirements

- Feed MUST load initial page (20 items) in < 200ms.
- Infinite scroll next page MUST load in < 100ms (cursor-based, indexed).
- Action count polling every 30 seconds, < 50ms response.
- Activity item creation MUST NOT slow the triggering action (fire-and-forget dispatch).
- Group key dedup: max 1 item per group_key per hour.
- Pruning: dismissed/expired items older than 90 days auto-purged nightly.
- MUST handle workspaces with 10,000+ activity items without degradation.

## Success Criteria

- **SC-001**: Feed initial page (20 items) loads in under 200ms for workspaces with up to 10,000 activity items.
- **SC-002**: Sidebar badge count accurately reflects active action items within 30 seconds of state change.
- **SC-003**: 80%+ of workspace activity (JE, invoices, banking, contacts) generates corresponding feed items within 5 seconds of the triggering action.
- **SC-004**: Users with feed access check the feed at least once per session (measured by feed page view rate > 70% of sessions).
- **SC-005**: Action items resolved via inline actions (without navigating away from feed) account for 30%+ of all action resolutions.
- **SC-006**: Group key deduplication reduces feed noise — batched events (bank syncs, auto-classifications) show as single items, not individual rows.
- **SC-007**: Zero cross-tenant data leakage — tenant isolation tests pass for all ActivityItem queries.
- **SC-008**: Existing notification system continues to function without degradation during dual-write migration period.

## Clarifications

### Session 2026-03-19

- Q: Is this a replacement for the notification system (024-NTF)? A: **No, it's a parallel system.** The existing notification model continues to work. During migration, event listeners dual-write to both. Eventually the notifications UI is deprecated in favour of the feed — but the backend transition is gradual.
- Q: Does the feed aggregate across workspaces? A: **Not in v1.** The feed is per-workspace. Cross-workspace aggregation on `/home` is a future iteration once the per-workspace feed is proven.
- Q: Why polling instead of WebSockets? A: **Simplicity for v1.** 30-second polling is adequate for the initial release. WebSocket/SSE upgrade is planned but not worth the infrastructure complexity for launch.
- Q: What consolidates into this epic? A: **024-NTF** (Notifications), **018-ITR** (Intray/Attention Queue), and the activity portion of **050-UAF** (User Activity Feed). This epic unifies all three concepts into one feed surface.
- Q: How are action items created? A: **Any system component calls `CreateActivityItem::run()`.** It's a simple action, not an event listener. Event listeners in Phase 3 will call this action to dual-write.
- Q: What about the Insights section dependencies? A: **Phase 4.** Insights require 051-EHS (Health Score), 052-ABN (Nudges), and 053-PLS (Pulse Reports). The insights section container ships in Phase 2 but populates only when those features are available.
