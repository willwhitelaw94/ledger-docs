---
title: "Implementation Plan: Activity Feed — The Harbour Front Door"
---

# Implementation Plan: Activity Feed — The Harbour Front Door

**Branch**: `055-ACF-activity-feed` | **Date**: 2026-03-19 | **Spec**: [spec.md](/initiatives/FL-financial-ledger/055-ACF-activity-feed/spec)
**Status**: Draft

## Summary

Build a workspace-scoped activity feed that consolidates notifications, attention items, and activity history into one living stream. Backend: ActivityItem model + CreateActivityItem action + 9 API endpoints + event listeners that dual-write alongside existing notifications. Frontend: three-section feed page (Needs Attention, Live Ticker, Insights placeholder) with infinite scroll, inline actions, sidebar badge, and keyboard shortcuts.

## Technical Context

**Language/Version**: PHP 8.4 / Laravel 12 (backend), TypeScript / Next.js 16 (frontend)
**Primary Dependencies**: Spatie laravel-event-sourcing v7 (event listeners), Lorisleiva Actions, Spatie Laravel Data, TanStack Query v5 + TanStack Virtual (frontend)
**Storage**: SQLite (local dev), single-database multi-tenancy via `workspace_id`
**Testing**: Pest v4 (Feature + Browser)
**Performance Goals**: Initial page < 200ms, next page < 100ms, counts endpoint < 50ms
**Constraints**: Cursor-based pagination (not offset), fire-and-forget item creation, 90-day auto-prune

## Design Decisions

### ActivityItem vs Notification — Parallel Systems

ActivityItem is a **workspace-wide timeline** visible to all members with appropriate permissions. Notifications are **targeted alerts** to specific users. They coexist:

- Phase 1: ActivityItem system built alongside notifications
- Phase 2: Event listeners dual-write to both
- Phase 3: Notification UI deprecated in favour of Activity Feed

### Type as Enum, Not String

The spec uses `type: string` — we'll use an `ActivityType` enum for type safety and label/icon resolution, matching the `NotificationType` pattern.

### Feed is a Separate Page, Not a Dashboard Replacement

The feed lives at `/activity` as its own route. The existing `/home` dashboard stays as-is. `G then F` navigates to the feed. We can promote it to default landing later based on user feedback.

### Action Buttons Navigate, Don't Mutate Inline

All "Needs Attention" action buttons are navigation links (e.g., "Classify" → `/feed?status=pending`, "Send Reminder" → `/invoices/{uuid}`). No inline mutations in Phase 1 — keeps complexity low, avoids per-action-type confirmation dialogs and error handling.

### User-Configurable Visibility

Users choose what activity categories/types to see. Default: show everything. Settings stored as user preference (future — not Phase 1). Phase 1: all workspace activity visible to all members, but the architecture supports per-user filtering later.

### Rename Existing "Feed" to "Data Sources"

The existing feed pipeline (`/feed`, FeedSource/FeedItem) is renamed to "Data Sources" (`/data-sources`) in the sidebar. "Feed" is claimed for the activity stream. This aligns with the spec's vision — "Feed" is the primary activity surface.

### Simplified Scope for Phase 1

- **No Insights section** (Phase 4, depends on 051-EHS, 052-ABN, 053-PLS)
- **No News category** (Phase 4, requires external data sources)
- **No real-time push** — polling only (30s for counts, "new items" banner for ticker)
- **Group key dedup** kept simple: upsert within 1 hour window for matching `group_key`

### Demo Seeder

Seed 50-100 activity items for demo personas across the last 30 days. Mix of action items (5-8 pinned) and activity items spanning all types. This ensures the feed looks alive on first demo load.

## Data Model

### ActivityItem (Tenant-scoped)

```
ActivityItem
├── id: bigint PK (auto-increment)
├── uuid: uuid (unique, route key)
├── workspace_id: FK → workspaces (indexed)
├── category: ActivityCategory enum (action, activity)  — news/insight added Phase 4
├── type: ActivityType enum (see below)
├── source: string (ledger, invoicing, banking, feed_pipeline, auth, system)
├── priority: ActivityPriority enum (critical, high, normal, low)
├── title: string (max 255)
├── body: text (nullable, markdown)
├── data: json (nullable, type-specific payload)
├── actor_id: FK → users (nullable)
├── subject_type: string (nullable, uses morph map)
├── subject_id: bigint (nullable)
├── action_url: string (nullable, frontend deep link)
├── group_key: string (nullable, max 255, for dedup batching)
├── status: ActivityItemStatus enum (active, read, actioned, dismissed, expired)
├── is_pinned: boolean (default false)
├── read_at: timestamp (nullable)
├── actioned_at: timestamp (nullable)
├── dismissed_at: timestamp (nullable)
├── expires_at: timestamp (nullable)
├── created_at: timestamp
├── updated_at: timestamp
```

**Indexes**:
- `[workspace_id, status, created_at]` — main feed query
- `[workspace_id, category, status]` — filtered feed + action count
- `[workspace_id, is_pinned, status]` — pinned actions query
- `[workspace_id, group_key, created_at]` — dedup lookup
- `[workspace_id, read_at]` — unread count

**Morph map addition**: Add `'activity_item' => ActivityItem::class` to `AppServiceProvider::morphMap()`.

### Enums

```php
// app/Enums/Activity/ActivityCategory.php
enum ActivityCategory: string {
    case Action = 'action';
    case Activity = 'activity';
    // Phase 4: case News = 'news'; case Insight = 'insight';
}

// app/Enums/Activity/ActivityType.php
enum ActivityType: string {
    // Actions (need attention)
    case TxnClassify = 'txn_classify';
    case InvoiceApprove = 'invoice_approve';
    case InvoiceOverdue = 'invoice_overdue';
    case BillDue = 'bill_due';
    case PeriodClose = 'period_close';
    case ReconciliationGap = 'reconciliation_gap';
    case FeedError = 'feed_error';

    // Activity (what happened)
    case TxnSynced = 'txn_synced';
    case TxnClassified = 'txn_classified';
    case JePosted = 'je_posted';
    case JeApproved = 'je_approved';
    case JeRejected = 'je_rejected';
    case JeReversed = 'je_reversed';
    case InvoiceSent = 'invoice_sent';
    case InvoicePaid = 'invoice_paid';
    case PaymentReceived = 'payment_received';
    case ContactCreated = 'contact_created';
    case RuleMatched = 'rule_matched';
    case UserAction = 'user_action';

    public function label(): string { /* match */ }
    public function icon(): string { /* match */ }
    public function defaultCategory(): ActivityCategory { /* match */ }
    public function defaultPriority(): ActivityPriority { /* match */ }
}

// app/Enums/Activity/ActivityPriority.php
enum ActivityPriority: string {
    case Critical = 'critical';
    case High = 'high';
    case Normal = 'normal';
    case Low = 'low';
}

// app/Enums/Activity/ActivityItemStatus.php
enum ActivityItemStatus: string {
    case Active = 'active';
    case Read = 'read';
    case Actioned = 'actioned';
    case Dismissed = 'dismissed';
    case Expired = 'expired';
}
```

### Relationships

```php
// ActivityItem model
workspace() → BelongsTo Workspace
actor() → BelongsTo User (nullable)
subject() → MorphTo (nullable) — uses morph map (invoice, journal_entry, bank_transaction, contact, job)

// Workspace model (add)
activityItems() → HasMany ActivityItem
```

## API Contracts

All routes workspace-scoped via `SetWorkspaceContext` middleware.

### Endpoints

| Method | Path | Controller Method | Auth | Description |
|--------|------|-------------------|------|-------------|
| GET | `/api/v1/activity` | `index` | `Gate::authorize('viewAny', ActivityItem::class)` | Paginated feed, cursor-based |
| GET | `/api/v1/activity/counts` | `counts` | `Gate::authorize('viewAny', ActivityItem::class)` | Category counts + unread + actions |
| GET | `/api/v1/activity/actions` | `actions` | `Gate::authorize('viewAny', ActivityItem::class)` | Pinned action items only |
| GET | `/api/v1/activity/{activityItem}` | `show` | `Gate::authorize('view', $activityItem)` | Single item detail |
| PATCH | `/api/v1/activity/{activityItem}/read` | `markRead` | Policy `markRead` | Mark as read |
| PATCH | `/api/v1/activity/{activityItem}/action` | `markActioned` | Policy `markActioned` | Mark as actioned |
| PATCH | `/api/v1/activity/{activityItem}/dismiss` | `dismiss` | Policy `dismiss` | Dismiss from feed |
| POST | `/api/v1/activity/dismiss-all` | `dismissAll` | `Gate::authorize('dismissAll', ActivityItem::class)` | Bulk dismiss by category/type |
| POST | `/api/v1/activity/mark-all-read` | `markAllRead` | `Gate::authorize('markAllRead', ActivityItem::class)` | Mark all as read |

### Query Parameters (index)

| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by ActivityCategory value |
| `source` | string | Filter by source |
| `priority` | string | Filter by ActivityPriority value |
| `status` | string | Filter by ActivityItemStatus value |
| `pinned` | boolean | Filter pinned items only |
| `cursor` | string | Cursor for pagination |
| `per_page` | int | Items per page (default 20, max 50) |

### Response Shape

```json
{
  "data": [{
    "uuid": "abc-123",
    "category": "action",
    "category_label": "Needs Attention",
    "type": "txn_classify",
    "type_label": "Transactions Need Classification",
    "type_icon": "inbox",
    "source": "feed_pipeline",
    "priority": "high",
    "priority_colour": "amber",
    "title": "5 transactions need classification",
    "body": null,
    "data": { "count": 5 },
    "actor": { "name": "System", "avatar": null },
    "subject_url": null,
    "action_url": "/feed?status=pending",
    "is_pinned": true,
    "status": "active",
    "read_at": null,
    "created_at": "2026-03-19T10:30:00Z",
    "relative_time": "2 minutes ago"
  }],
  "meta": {
    "next_cursor": "eyJ...",
    "per_page": 20
  }
}
```

### Counts Response

```json
{
  "total_unread": 12,
  "total_actions": 3,
  "by_category": {
    "action": 3,
    "activity": 42
  }
}
```

## File Changes

### New Files (Backend)

| File | Purpose |
|------|---------|
| `app/Models/Tenant/ActivityItem.php` | Model with scopes, relationships, HasUuids |
| `app/Enums/Activity/ActivityCategory.php` | Category enum |
| `app/Enums/Activity/ActivityType.php` | Type enum with label/icon/defaults |
| `app/Enums/Activity/ActivityPriority.php` | Priority enum |
| `app/Enums/Activity/ActivityItemStatus.php` | Status enum |
| `app/Actions/Activity/CreateActivityItem.php` | Action with group_key dedup logic |
| `app/Http/Controllers/Api/ActivityItemController.php` | 9 endpoint methods |
| `app/Http/Resources/ActivityItemResource.php` | API Resource |
| `app/Policies/ActivityItemPolicy.php` | Authorization policy |
| `app/Http/Requests/Activity/DismissAllRequest.php` | Form request for bulk dismiss |
| `database/migrations/2026_03_19_200001_create_activity_items_table.php` | Migration |
| `app/Listeners/Activity/` | 8 separate listeners registered on same domain events as notification listeners |
| `tests/Feature/Api/ActivityItemApiTest.php` | API tests |

### New Files (Frontend)

| File | Purpose |
|------|---------|
| `frontend/src/types/activity.ts` | TypeScript types matching API resource |
| `frontend/src/hooks/use-activity.ts` | TanStack Query hooks (useActivity, useActivityCounts, useActivityActions) |
| `frontend/src/app/(dashboard)/activity/page.tsx` | Feed page |
| `frontend/src/components/activity/ActivityFeed.tsx` | Main feed layout (3 sections) |
| `frontend/src/components/activity/ActivityActions.tsx` | Pinned actions section |
| `frontend/src/components/activity/ActionItemCard.tsx` | Single action card with inline buttons |
| `frontend/src/components/activity/ActivityTicker.tsx` | Infinite scroll ticker |
| `frontend/src/components/activity/TickerFilters.tsx` | Category tabs + source filter |
| `frontend/src/components/activity/TickerItem.tsx` | Single ticker row |
| `frontend/src/components/activity/NewItemsBanner.tsx` | "X new items" click-to-refresh |
| `frontend/src/components/activity/ActivityEmpty.tsx` | Empty state |

### Modified Files

| File | Change |
|------|--------|
| `app/Providers/AppServiceProvider.php` | Add `activity_item` to morph map, register ActivityItemPolicy |
| `routes/api.php` | Add activity routes |
| `app/Listeners/Notifications/*.php` | No changes — activity listeners are separate classes |
| `frontend/src/components/layout/app-sidebar.tsx` | Rename "Feed" → "Data Sources", add new "Feed" item for activity with badge count |
| `frontend/src/lib/navigation.ts` | Add `/activity` route, rename existing feed route to `/data-sources` |
| `frontend/src/app/(dashboard)/feed/` | Rename directory to `data-sources/` |
| `database/seeders/DemoPersonasSeeder.php` | Add activity item seeding (50-100 items) |

## Frontend Component Architecture

### Component Tree

```
activity/
├── page.tsx                    ← Page wrapper, data fetching orchestration
├── ActivityFeed.tsx            ← Layout: actions + ticker + insights placeholder
├── ActivityActions.tsx         ← Pinned actions section with count badge
│   └── ActionItemCard.tsx      ← Single action: icon, title, inline buttons
├── ActivityTicker.tsx          ← Infinite scroll container (TanStack Virtual)
│   ├── TickerFilters.tsx       ← StatusTabs for categories + source dropdown
│   ├── NewItemsBanner.tsx      ← "N new items — click to load"
│   └── TickerItem.tsx          ← Single row: avatar, title, amount, time, link
└── ActivityEmpty.tsx           ← Empty state illustration
```

### Data Fetching Hooks

```typescript
// use-activity.ts
useActivity(filters)        → useInfiniteQuery, cursor-based, GET /activity
useActivityCounts()         → useQuery, polls 30s, GET /activity/counts
useActivityActions()        → useQuery, polls 30s, GET /activity/actions
useMarkRead(uuid)           → useMutation, PATCH /activity/{uuid}/read
useMarkActioned(uuid)       → useMutation, PATCH /activity/{uuid}/action
useDismiss(uuid)            → useMutation, PATCH /activity/{uuid}/dismiss, optimistic update
useDismissAll(params)       → useMutation, POST /activity/dismiss-all
useMarkAllRead()            → useMutation, POST /activity/mark-all-read
```

### TypeScript Types

```typescript
// types/activity.ts
type ActivityCategory = 'action' | 'activity';
type ActivityType = 'txn_classify' | 'je_posted' | /* ... */;
type ActivityPriority = 'critical' | 'high' | 'normal' | 'low';
type ActivityItemStatus = 'active' | 'read' | 'actioned' | 'dismissed' | 'expired';

type ActivityItem = {
  uuid: string;
  category: ActivityCategory;
  category_label: string;
  type: ActivityType;
  type_label: string;
  type_icon: string;
  source: string;
  priority: ActivityPriority;
  priority_colour: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  actor: { name: string; avatar: string | null } | null;
  subject_url: string | null;
  action_url: string | null;
  is_pinned: boolean;
  status: ActivityItemStatus;
  read_at: string | null;
  created_at: string;
  relative_time: string;
};

type ActivityCounts = {
  total_unread: number;
  total_actions: number;
  by_category: Record<ActivityCategory, number>;
};
```

### Keyboard Shortcuts

Already defined in CLAUDE.md: `G then F` → Feed. Additional per-page shortcuts:

| Shortcut | Action | Component |
|----------|--------|-----------|
| `J` / `K` | Move selection down/up in ticker | ActivityTicker |
| `Enter` | Open selected item's action_url | TickerItem |
| `X` | Dismiss selected item | TickerItem |
| `R` | Mark selected item as read | TickerItem |

### Sidebar Badge

Poll `useActivityCounts()` every 30s. Show red badge on "Feed" nav item when `total_actions > 0`. Optimistic decrement on dismiss/action mutations.

## Implementation Phases

### Phase 1: Core Model + API (Backend) — ~2 days

1. Create migration with indexes
2. Create ActivityItem model with scopes, relationships, HasUuids
3. Create 4 enums in `app/Enums/Activity/`
4. Create CreateActivityItem action with group_key dedup
5. Create ActivityItemResource
6. Create ActivityItemPolicy (viewAny, view, markRead, markActioned, dismiss, dismissAll, markAllRead)
7. Create ActivityItemController (9 methods)
8. Create DismissAllRequest form request
9. Add routes to api.php
10. Register policy + morph map in AppServiceProvider
11. Write feature tests (CRUD, cursor pagination, filtering, dedup, authorization)

### Phase 2: Frontend — Feed UI — ~3 days

1. Create TypeScript types
2. Create TanStack Query hooks with polling
3. Build TickerItem component
4. Build ActivityTicker with infinite scroll (TanStack Virtual)
5. Build TickerFilters with StatusTabs
6. Build NewItemsBanner
7. Build ActionItemCard with inline action buttons
8. Build ActivityActions section
9. Build ActivityFeed layout (3 sections)
10. Build page.tsx
11. Add sidebar badge count with polling
12. Add keyboard shortcuts
13. Build ActivityEmpty state

### Phase 3: Wire Up Event Sources — ~1 day

1. Add `CreateActivityItem::run()` calls to existing notification listeners:
   - `NotifyApproversOnJeSubmitted` → activity type `JePosted`
   - `NotifyBookkeeperOnJeApproved` → activity type `JeApproved`
   - `NotifyBookkeeperOnJeRejected` → activity type `JeRejected`
   - `NotifyOwnersOnBankFeedSynced` → activity type `TxnSynced`
   - `NotifyOwnersOnBankFeedError` → activity type `FeedError`
   - `NotifyOwnersOnInvoicePaid` → activity type `InvoicePaid`
   - `NotifyInvoiceSender` → activity type `InvoiceSent`
   - `NotifyOnJobShareViewed` → no activity item (too granular)
2. Create new listeners for events not in notification system:
   - Invoice submitted for approval → `InvoiceApprove` (action)
   - Invoice overdue check (artisan command) → `InvoiceOverdue` (action)
   - Contact created → `ContactCreated` (activity)
3. Add pruning command: `php artisan activity:prune` — delete dismissed/expired > 90 days

### Phase 4: News + Insights (Future — not this epic)

- External news sources (RBA, ASX, ATO)
- Health Score integration (051-EHS)
- Nudge integration (052-ABN)
- Pulse Report integration (053-PLS)
- `ActivityCategory::News` and `ActivityCategory::Insight` enum cases

## Testing Strategy

### Feature Tests (~20 tests)

- ActivityItem CRUD (create via action, list, show, mark read, dismiss)
- Cursor-based pagination (forward pagination, per_page limits)
- Filtering (by category, source, priority, status, pinned)
- Counts endpoint (by_category, total_unread, total_actions)
- Actions endpoint (only pinned active items)
- Bulk operations (dismiss-all, mark-all-read)
- Group key dedup (same key within 1 hour updates, different key creates new)
- Authorization (workspace scoping, non-member denied)
- Pruning command (dismissed > 90 days deleted, active items untouched)

### Browser Tests (~5 tests)

- Feed page loads with three sections visible
- Infinite scroll loads next page
- Dismiss action item decrements badge
- Filter by category shows correct items
- Keyboard navigation (J/K selection, Enter to open)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Feed query slow at scale (10k+ items) | Low | Medium | Cursor pagination + composite indexes, no offset queries |
| Polling overhead (30s counts) | Low | Low | Counts query is a single GROUP BY, < 50ms |
| Dual-write complexity in listeners | Medium | Low | Each listener adds 1 CreateActivityItem call, wrapped in try/catch |
| Group key dedup race condition | Low | Low | Acceptable — worst case is a duplicate item, not data loss |

## Gate 3: Architecture Check

| Section | Check | Status |
|---------|-------|--------|
| **1. Technical Feasibility** | Architecture approach clear | PASS — follows existing Notification pattern |
| | Existing patterns leveraged | PASS — Actions, Resources, Policies, TanStack Query |
| | No impossible requirements | PASS |
| | Performance considered | PASS — cursor pagination, indexes, polling intervals |
| | Security considered | PASS — workspace scoping, policy auth |
| **2. Data & Integration** | Data model understood | PASS — ActivityItem with polymorphic subject |
| | API contracts clear | PASS — 9 endpoints defined |
| | Dependencies identified | PASS — no new packages needed |
| | Integration points mapped | PASS — dual-write via existing listeners |
| | DTO persistence explicit | PASS — CreateActivityItem action handles creation |
| **3. Implementation** | File changes identified | PASS — 13 new backend, 11 new frontend, 5 modified |
| | Risk areas noted | PASS — see risk assessment |
| | Testing approach defined | PASS — ~20 feature + ~5 browser tests |
| | Rollback possible | PASS — new table, no schema changes to existing tables |
| **4. Resource & Scope** | Scope matches spec | PASS — Phase 1-3 only, Phase 4 deferred |
| | Effort reasonable | PASS — ~6 days across 3 phases |
| **5. Laravel Practices** | Lorisleiva Actions | PASS — CreateActivityItem uses AsAction |
| | Model route binding | PASS — UUID route key |
| | Policies | PASS — ActivityItemPolicy |
| | No hardcoded frontend logic | PASS — all business logic in API |
| | Feature flags | N/A — not behind a flag |
| | Event sourcing granular | N/A — ActivityItem is not event-sourced |
| **6-8. Frontend (Next.js)** | TypeScript strict | PASS — all types defined |
| | TanStack Query for server state | PASS — useActivity, useActivityCounts, useActivityActions |
| | Component decomposition | PASS — 11 components, single responsibility each |
| | shadcn/ui reused | PASS — StatusTabs, Badge, Button, ScrollArea |

**Gate 3 Result: PASS**

## Development Clarifications

### Session 2026-03-19

- Q: Should the Feed page replace the current entity dashboard, or live alongside it? → A: **Separate page** — `/activity` as its own route, dashboard stays as-is
- Q: How should "Needs Attention" action buttons work? → A: **Navigate only** — all action buttons are links to relevant pages, no inline mutations
- Q: Should activity items be user-scoped or workspace-scoped visibility? → A: **Configurable per user** — default show everything, architecture supports per-user filtering later (not Phase 1)
- Q: What should the sidebar nav item be called? → A: **Feed** — rename existing feed pipeline to "Data Sources", claim "Feed" for activity stream
- Q: Should we seed demo activity items? → A: **Yes, seed 50-100 items** — mix of actions and activity across last 30 days
- Q: Should dismissed/actioned items still appear in the ticker? → A: **Remove from feed entirely** — only visible if explicitly filtered by `status=dismissed`
- Q: How should the "New items" banner work? → A: **Banner with count** — poll every 30s, show "N new items" banner, click to prepend. Prevents layout shifts while scrolling
- Q: Should activity page use standard or full-width layout? → A: **Standard layout** — same sidebar + content area as every other page, actions at top, ticker below
- Q: Rename feed pipeline in this epic or defer? → A: **Rename in this epic** — clean break, `/feed` → `/data-sources` while touching sidebar anyway
- Q: Should ActivityItem creation be sync or queued? → A: **Synchronous** — single INSERT < 1ms, no queue infrastructure needed. Can queue later at scale
- Q: Cursor pagination implementation? → A: **`created_at` + `id` compound cursor** — Laravel's native `cursorPaginate()`, covered by composite index
- Q: Should counts endpoint be cached? → A: **Always fresh** — single indexed GROUP BY < 50ms, no caching needed at current scale
- Q: Add redirect for old `/feed` URLs after rename? → A: **No redirect** — internal app, no SEO concerns, users find new location via sidebar
- Q: Demo seeder timestamps? → A: **Realistic timestamps** — spread across last 30 days with recent bias, action items within last 3 days
- Q: Phase 3 listeners — add to existing or separate classes? → A: **Separate listener classes** — new `app/Listeners/Activity/` directory, registered on same events, independent lifecycle from notifications

## Next Steps

1. Run `/speckit-tasks` to generate tasks.md
2. Run `/speckit-implement` to start development
