---
title: "Implementation Tasks: Activity Feed"
---

# Implementation Tasks: Activity Feed

**Mode**: AI | **Plan**: plan.md | **Generated**: 2026-03-19

## Phase 1: Foundation — Migration, Enums, Model

- [x] T001 Migration: Create `database/migrations/2026_03_20_100001_create_activity_items_table.php`. Columns: `id` bigIncrements, `uuid` uuid unique, `workspace_id` foreignId→workspaces, `category` string(20), `type` string(50), `source` string(50), `priority` string(20) default 'normal', `title` string(255), `body` text nullable, `data` json nullable, `actor_id` foreignId→users nullable, `subject_type` string(50) nullable, `subject_id` unsignedBigInteger nullable, `action_url` string(500) nullable, `group_key` string(255) nullable, `status` string(20) default 'active', `is_pinned` boolean default false, `read_at` timestamp nullable, `actioned_at` timestamp nullable, `dismissed_at` timestamp nullable, `expires_at` timestamp nullable, timestamps. Indexes: `[workspace_id, status, created_at]`, `[workspace_id, category, status]`, `[workspace_id, is_pinned, status]`, `[workspace_id, group_key, created_at]`, `[workspace_id, read_at]`.

- [x] T002 [P] Enum: `app/Enums/Activity/ActivityCategory.php` — backed string enum. Cases: `Action = 'action'`, `Activity = 'activity'`. Methods: `label(): string` (match: Action→'Needs Attention', Activity→'Activity').

- [x] T003 [P] Enum: `app/Enums/Activity/ActivityPriority.php` — backed string enum. Cases: `Critical = 'critical'`, `High = 'high'`, `Normal = 'normal'`, `Low = 'low'`. Methods: `label(): string`, `colour(): string` (Critical→'red', High→'amber', Normal→'default', Low→'muted').

- [x] T004 [P] Enum: `app/Enums/Activity/ActivityItemStatus.php` — backed string enum. Cases: `Active = 'active'`, `Read = 'read'`, `Actioned = 'actioned'`, `Dismissed = 'dismissed'`, `Expired = 'expired'`.

- [x] T005 [P] Enum: `app/Enums/Activity/ActivityType.php` — backed string enum. Action cases: `TxnClassify = 'txn_classify'`, `InvoiceApprove = 'invoice_approve'`, `InvoiceOverdue = 'invoice_overdue'`, `BillDue = 'bill_due'`, `PeriodClose = 'period_close'`, `ReconciliationGap = 'reconciliation_gap'`, `FeedError = 'feed_error'`. Activity cases: `TxnSynced = 'txn_synced'`, `TxnClassified = 'txn_classified'`, `JePosted = 'je_posted'`, `JeApproved = 'je_approved'`, `JeRejected = 'je_rejected'`, `JeReversed = 'je_reversed'`, `InvoiceSent = 'invoice_sent'`, `InvoicePaid = 'invoice_paid'`, `PaymentReceived = 'payment_received'`, `ContactCreated = 'contact_created'`, `RuleMatched = 'rule_matched'`, `UserAction = 'user_action'`. Methods: `label(): string`, `icon(): string` (return Heroicon name), `defaultCategory(): ActivityCategory`, `defaultPriority(): ActivityPriority`.

- [x] T006 Model: `app/Models/Tenant/ActivityItem.php`. Uses `HasUuids`. Route key: `uuid`. Fillable: all columns except id/uuid/timestamps. Casts: `category` → ActivityCategory, `type` → ActivityType, `priority` → ActivityPriority, `status` → ActivityItemStatus, `data` → 'json', `is_pinned` → 'boolean', `read_at` → 'datetime', `actioned_at` → 'datetime', `dismissed_at` → 'datetime', `expires_at` → 'datetime'. Relationships: `workspace()` BelongsTo Workspace, `actor()` BelongsTo User (nullable), `subject()` MorphTo (nullable). Scopes: `scopeActive($q)` → where status not in [dismissed, expired], `scopeActions($q)` → where category=action AND status=active, `scopeForCategory($q, ActivityCategory $cat)`, `scopeUnread($q)` → whereNull read_at, `scopePinned($q)` → where is_pinned=true, `scopeForWorkspace($q, int $workspaceId)` → where workspace_id=$workspaceId.

- [x] T007 Register in `app/Providers/AppServiceProvider.php`: Add `'activity_item' => \App\Models\Tenant\ActivityItem::class` to the existing `Relation::morphMap()` array. Add `Gate::policy(ActivityItem::class, ActivityItemPolicy::class)` in `boot()`.

## Phase 2: Core Action + Policy + Resource

- [x] T008 Action: `app/Actions/Activity/CreateActivityItem.php`. Uses `AsAction` trait. Method `handle(int $workspaceId, ActivityType $type, string $title, ?string $source = null, ?ActivityCategory $category = null, ?ActivityPriority $priority = null, ?string $body = null, ?array $data = null, ?int $actorId = null, ?string $subjectType = null, ?int $subjectId = null, ?string $actionUrl = null, ?string $groupKey = null, bool $isPinned = false, ?Carbon $expiresAt = null): ActivityItem`. Logic: if `$category` null, use `$type->defaultCategory()`. If `$priority` null, use `$type->defaultPriority()`. If `$source` null, derive from type (ledger types→'ledger', invoice types→'invoicing', etc.). Group key dedup: if `$groupKey` not null, query `ActivityItem::where('workspace_id', $workspaceId)->where('group_key', $groupKey)->where('created_at', '>=', now()->subHour())->whereNull('read_at')->first()` — if found, update its `title`, `data`, `updated_at` and return it; else create new. Set `is_pinned` = true when category is Action. Return created/updated ActivityItem.

- [x] T009 [P] Policy: `app/Policies/ActivityItemPolicy.php`. Methods: `viewAny(User $user): bool` → `$user->hasPermissionTo('activity-item.view')` (always true for workspace members — add permission to RolesAndPermissionsSeeder). `view(User $user, ActivityItem $item): bool` → same. `markRead(User $user, ActivityItem $item): bool` → true (any member). `markActioned(User $user, ActivityItem $item): bool` → true. `dismiss(User $user, ActivityItem $item): bool` → true. `dismissAll(User $user): bool` → true. `markAllRead(User $user): bool` → true.

- [x] T010 [P] Resource: `app/Http/Resources/ActivityItemResource.php`. `toArray()` returns: `uuid`, `category` → `$this->category->value`, `category_label` → `$this->category->label()`, `type` → `$this->type->value`, `type_label` → `$this->type->label()`, `type_icon` → `$this->type->icon()`, `source`, `priority` → `$this->priority->value`, `priority_colour` → `$this->priority->colour()`, `title`, `body`, `data`, `actor` → `$this->actor ? ['name' => $this->actor->name, 'avatar' => null] : null`, `subject_url` → resolve from subject_type using same pattern as NotificationResource (match morph alias to frontend path), `action_url`, `is_pinned`, `status` → `$this->status->value`, `read_at` → `$this->read_at?->toIso8601String()`, `created_at` → `$this->created_at->toIso8601String()`, `relative_time` → `$this->created_at->diffForHumans()`.

- [x] T011 [P] Form Request: `app/Http/Requests/Activity/DismissAllRequest.php`. `authorize()`: `return $this->user()->can('dismissAll', ActivityItem::class)`. `rules()`: `['category' => 'nullable|string', 'type' => 'nullable|string']`.

- [x] T012 Update `database/seeders/RolesAndPermissionsSeeder.php`: Add `'activity-item.view'` permission. Assign to all 6 roles (owner, accountant, bookkeeper, approver, auditor, client).

## Phase 3: Controller + Routes

- [x] T013 Controller: `app/Http/Controllers/Api/ActivityItemController.php`. 9 methods:

  `index(Request $request)`: `Gate::authorize('viewAny', ActivityItem::class)`. Query `ActivityItem::where('workspace_id', $request->workspace_id)`. Apply filters: `?category` → `forCategory()`, `?source` → `where('source', ...)`, `?priority` → `where('priority', ...)`, `?status` → `where('status', ...)`, `?pinned` → `pinned()`. Default filter: `active()` scope (exclude dismissed/expired) unless `?status` explicitly set. Order by `created_at DESC, id DESC`. Return `ActivityItemResource::collection($query->cursorPaginate($request->input('per_page', 20)))`.

  `counts(Request $request)`: `Gate::authorize('viewAny', ActivityItem::class)`. Query workspace-scoped. Return JSON: `total_unread` (whereNull read_at, active scope, count), `total_actions` (actions scope, count), `by_category` (active scope, groupBy category, selectRaw count).

  `actions(Request $request)`: `Gate::authorize('viewAny', ActivityItem::class)`. Query workspace-scoped, `actions()` scope, order by priority (critical first, then high, normal, low) then `created_at DESC`. Return `ActivityItemResource::collection($query->get())`.

  `show(ActivityItem $activityItem)`: `Gate::authorize('view', $activityItem)`. Return `new ActivityItemResource($activityItem)`.

  `markRead(ActivityItem $activityItem)`: `Gate::authorize('markRead', $activityItem)`. Update: `status` → Read (only if Active), `read_at` → now(). Return resource.

  `markActioned(ActivityItem $activityItem)`: `Gate::authorize('markActioned', $activityItem)`. Update: `status` → Actioned, `actioned_at` → now(), `is_pinned` → false. Return resource.

  `dismiss(ActivityItem $activityItem)`: `Gate::authorize('dismiss', $activityItem)`. Update: `status` → Dismissed, `dismissed_at` → now(), `is_pinned` → false. Return 204.

  `dismissAll(DismissAllRequest $request)`: Build query on workspace_id + active scope. If `category` param, filter by it. If `type` param, filter by it. Bulk update: `status` → Dismissed, `dismissed_at` → now(), `is_pinned` → false. Return JSON `{ dismissed_count: N }`.

  `markAllRead(Request $request)`: `Gate::authorize('markAllRead', ActivityItem::class)`. Bulk update workspace-scoped, `unread()` scope: `read_at` → now(), `status` → Read (where status=Active). Return JSON `{ updated_count: N }`.

- [x] T014 Routes: In `routes/api.php`, inside the workspace-scoped middleware group (`['auth:sanctum', SetWorkspaceContext::class]`), add:
  ```php
  Route::prefix('activity')->group(function () {
      Route::get('counts', [ActivityItemController::class, 'counts']);
      Route::get('actions', [ActivityItemController::class, 'actions']);
      Route::post('dismiss-all', [ActivityItemController::class, 'dismissAll']);
      Route::post('mark-all-read', [ActivityItemController::class, 'markAllRead']);
      Route::get('/', [ActivityItemController::class, 'index']);
      Route::get('{activityItem}', [ActivityItemController::class, 'show']);
      Route::patch('{activityItem}/read', [ActivityItemController::class, 'markRead']);
      Route::patch('{activityItem}/action', [ActivityItemController::class, 'markActioned']);
      Route::patch('{activityItem}/dismiss', [ActivityItemController::class, 'dismiss']);
  });
  ```
  Note: named routes before `{activityItem}` wildcard to avoid route conflicts.

## Phase 4: Feature Tests [US1-US6]

- [x] T015 Tests: `tests/Feature/Api/ActivityItemApiTest.php`. Standard test setup: `uses(RefreshDatabase::class)`, `beforeEach` seeds `RolesAndPermissionsSeeder`, creates user/org/workspace, attaches user as owner, assigns role, sets `$wsHeaders`. Tests:

  1. `it lists activity items for workspace` — create 3 items, GET /activity, assert 200, assert 3 items returned with correct resource shape (uuid, category, type, title, etc.)
  2. `it uses cursor pagination` — create 25 items, GET /activity?per_page=10, assert 10 items + next_cursor in meta. GET with cursor, assert next 10.
  3. `it filters by category` — create 2 action + 3 activity items, GET /activity?category=action, assert 2 items.
  4. `it filters by source` — create items with different sources, GET /activity?source=ledger, assert correct subset.
  5. `it filters by priority` — create items with different priorities, GET /activity?priority=high, assert correct subset.
  6. `it excludes dismissed and expired by default` — create active + dismissed + expired items, GET /activity, assert only active returned. GET /activity?status=dismissed, assert dismissed returned.
  7. `it returns counts by category` — create known items, GET /activity/counts, assert total_unread, total_actions, by_category match.
  8. `it returns pinned action items` — create 2 pinned action + 3 activity items, GET /activity/actions, assert 2 items, ordered by priority then created_at.
  9. `it shows single activity item` — create item, GET /activity/{uuid}, assert 200 with full resource.
  10. `it marks item as read` — create active item, PATCH /activity/{uuid}/read, assert status=read, read_at set.
  11. `it marks item as actioned` — create active pinned item, PATCH /activity/{uuid}/action, assert status=actioned, actioned_at set, is_pinned=false.
  12. `it dismisses item` — create item, PATCH /activity/{uuid}/dismiss, assert 204, item status=dismissed.
  13. `it bulk dismisses by category` — create 3 action + 2 activity items, POST /activity/dismiss-all {category: 'action'}, assert dismissed_count=3, activity items untouched.
  14. `it marks all as read` — create 5 unread items, POST /activity/mark-all-read, assert updated_count=5, all have read_at.
  15. `it deduplicates by group_key within 1 hour` — CreateActivityItem::run with group_key='test', assert created. Run again with same group_key, assert item updated (not duplicated). Run with same key but item is >1 hour old (manually set created_at), assert new item created.
  16. `it scopes to workspace` — create item in workspace A, query from workspace B, assert 0 items.
  17. `it denies access to non-workspace members` — create item, query as user not in workspace, assert 403.

## Phase 5: Frontend Types + Hooks [US1-US6]

- [x] T016 [P] TypeScript types: `frontend/src/types/activity.ts`. Define: `ActivityCategory = 'action' | 'activity'`, `ActivityType` union of all 19 type values, `ActivityPriority = 'critical' | 'high' | 'normal' | 'low'`, `ActivityItemStatus = 'active' | 'read' | 'actioned' | 'dismissed' | 'expired'`, `ActivityItem` type matching resource shape (uuid, category, category_label, type, type_label, type_icon, source, priority, priority_colour, title, body, data, actor, subject_url, action_url, is_pinned, status, read_at, created_at, relative_time), `ActivityCounts` type (total_unread, total_actions, by_category), `ActivityFilters` type (category?, source?, priority?, status?, pinned?).

- [x] T017 Hooks: `frontend/src/hooks/use-activity.ts`. Follow existing hook patterns in `frontend/src/hooks/`. Import from `@tanstack/react-query`.

  `useActivity(filters: ActivityFilters)` → `useInfiniteQuery` with `queryKey: ['activity', filters]`, `queryFn` calls `GET /api/v1/activity` with filter params + cursor, `getNextPageParam` extracts `meta.next_cursor`, `initialPageParam: undefined`. Returns pages of ActivityItem[].

  `useActivityCounts()` → `useQuery` with `queryKey: ['activity-counts']`, `queryFn` calls `GET /api/v1/activity/counts`, `refetchInterval: 30000`. Returns ActivityCounts.

  `useActivityActions()` → `useQuery` with `queryKey: ['activity-actions']`, `queryFn` calls `GET /api/v1/activity/actions`, `refetchInterval: 30000`. Returns ActivityItem[].

  `useMarkRead()` → `useMutation` calling `PATCH /api/v1/activity/{uuid}/read`. On success, invalidate `['activity']` and `['activity-counts']`.

  `useMarkActioned()` → `useMutation` calling `PATCH /api/v1/activity/{uuid}/action`. On success, invalidate `['activity']`, `['activity-counts']`, `['activity-actions']`.

  `useDismiss()` → `useMutation` calling `PATCH /api/v1/activity/{uuid}/dismiss`. Optimistic update: remove item from cache. On success, invalidate counts + actions.

  `useDismissAll()` → `useMutation` calling `POST /api/v1/activity/dismiss-all`. On success, invalidate all activity queries.

  `useMarkAllRead()` → `useMutation` calling `POST /api/v1/activity/mark-all-read`. On success, invalidate all activity queries.

## Phase 6: Frontend Components [US1-US5]

- [x] T018 [US2] Component: `frontend/src/components/activity/TickerItem.tsx`. Props: `item: ActivityItem`, `isSelected: boolean`, `onSelect: () => void`. Renders single row: left icon (from `type_icon`), actor avatar or source icon, title text, body snippet (if present), `relative_time` on right, priority indicator (coloured dot for critical/high). Entire row is a link to `action_url` or `subject_url`. Selected state: highlighted background. Use shadcn/ui `cn()` for conditional classes.

- [x] T019 [US2] Component: `frontend/src/components/activity/TickerFilters.tsx`. Props: `activeCategory: ActivityCategory | 'all'`, `onCategoryChange: (cat) => void`, `activeSource: string | null`, `onSourceChange: (source) => void`. Renders: StatusTabs with tabs: All, Needs Attention (action), Activity. Source dropdown filter (Select from shadcn/ui) with options: All Sources, Ledger, Invoicing, Banking, Feed Pipeline, Auth, System.

- [x] T020 [US6] Component: `frontend/src/components/activity/NewItemsBanner.tsx`. Props: `count: number`, `onRefresh: () => void`. Renders: animated slide-down banner "N new items — click to load" when count > 0. Click calls onRefresh. Use shadcn/ui Button variant ghost. Animate with CSS transition.

- [x] T021 [US2] Component: `frontend/src/components/activity/ActivityTicker.tsx`. Props: `filters: ActivityFilters`. Uses `useActivity(filters)` hook. Renders TickerFilters at top, NewItemsBanner below (tracks new items by comparing latest created_at on 30s poll), then scrollable list of TickerItem components. Infinite scroll: `useInView` from `react-intersection-observer` on sentinel element at bottom, calls `fetchNextPage` when visible. Flatten pages into single array. Track selected index for keyboard nav (J/K/Enter/X/R shortcuts via `useHotkeys`).

- [x] T022 [US3] Component: `frontend/src/components/activity/ActionItemCard.tsx`. Props: `item: ActivityItem`, `onDismiss: (uuid: string) => void`. Renders: priority colour bar on left (critical=red, high=amber), icon, title, body snippet. Action button(s): primary button text derived from type (TxnClassify→"Classify", InvoiceApprove→"Review", InvoiceOverdue→"Send Reminder", BillDue→"View", FeedError→"Reconnect", etc.) — all buttons are `<Link>` to `action_url`. Dismiss button (X icon) calls onDismiss. Animate out on dismiss.

- [x] T023 [US1] Component: `frontend/src/components/activity/ActivityActions.tsx`. Props: none (fetches own data). Uses `useActivityActions()` hook. Renders section header "Needs Attention" with Badge showing count. Maps action items to ActionItemCard components. Uses `useDismiss()` mutation for dismiss handler. If no action items, render nothing (section hidden).

- [x] T024 Component: `frontend/src/components/activity/ActivityEmpty.tsx`. Renders empty state: illustration, "All caught up" heading, "No activity yet in this workspace" subtext. Use existing empty state pattern from codebase.

- [x] T025 [US1] Component: `frontend/src/components/activity/ActivityFeed.tsx`. Props: none (page-level layout). State: `activeCategory` (default 'all'), `activeSource` (default null). Renders: ActivityActions section at top (only if action items exist), ActivityTicker below with filters derived from state. Pass category/source filters to ActivityTicker. If no items at all, show ActivityEmpty.

- [x] T026 [US1] Page: `frontend/src/app/(dashboard)/activity/page.tsx`. Renders PageContainer with title "Feed", breadcrumbs [{label: "Home", href: "/home"}, {label: "Feed"}]. Contains ActivityFeed component. Register keyboard shortcuts: `G then F` should already work from global nav.

## Phase 7: Sidebar Badge + Rename [US5]

- [x] T027 [US5] Sidebar badge: In `frontend/src/components/layout/app-sidebar.tsx`, import `useActivityCounts`. In the sidebar nav item for "Feed", add Badge component showing `total_actions` count when > 0. Badge: red background, white text, small size. Use existing Badge from shadcn/ui.

- [x] T028 Rename feed pipeline in sidebar: In `frontend/src/components/layout/app-sidebar.tsx`, rename the existing "Feed" nav item label to "Data Sources". Update its href from `/feed` to `/data-sources`. Add new "Feed" nav item above it pointing to `/activity` with the badge from T027. Update shortcut: existing `G then F` should point to `/activity`.

- [x] T029 [P] Rename feed pipeline route: Move `frontend/src/app/(dashboard)/feed/` directory to `frontend/src/app/(dashboard)/data-sources/`. Update any imports or references. Update `frontend/src/lib/navigation.ts` if it contains feed route references.

## Phase 8: Event Listeners [US2]

- [x] T030 Listener: `app/Listeners/Activity/LogJeSubmittedActivity.php`. Listens to `JournalEntrySubmitted::class`. In `handle(JournalEntrySubmitted $event)`: resolve JournalEntry from event, call `CreateActivityItem::run(workspaceId: $entry->workspace_id, type: ActivityType::JePosted, title: "JE #{$entry->number} submitted — {$entry->memo}", source: 'ledger', actorId: $entry->created_by, subjectType: 'journal_entry', subjectId: $entry->id, actionUrl: "/journal-entries/{$entry->uuid}")`. Wrap in try/catch, log errors.

- [x] T031 [P] Listener: `app/Listeners/Activity/LogJeApprovedActivity.php`. Listens to `JournalEntryApproved::class`. Similar to T030 but type: `ActivityType::JeApproved`, title: "JE #{$entry->number} approved".

- [x] T032 [P] Listener: `app/Listeners/Activity/LogJeRejectedActivity.php`. Listens to `JournalEntryRejected::class`. Type: `ActivityType::JeRejected`, title: "JE #{$entry->number} rejected".

- [x] T033 [P] Listener: `app/Listeners/Activity/LogInvoiceSentActivity.php`. Listens to `InvoiceSent::class`. Type: `ActivityType::InvoiceSent`, title: "Invoice #{$invoice->number} sent to {$invoice->contact->name}".

- [x] T034 [P] Listener: `app/Listeners/Activity/LogInvoicePaidActivity.php`. Listens to `InvoicePaymentReceived::class`. Type: `ActivityType::InvoicePaid`, title: "Invoice #{$invoice->number} paid".

- [x] T035 [P] Listener: `app/Listeners/Activity/LogTransactionReconciledActivity.php`. Listens to `TransactionReconciled::class`. Type: `ActivityType::TxnClassified`, title derived from event.

- [x] T036 [P] Listener: `app/Listeners/Activity/LogFeedItemProcessedActivity.php`. Listens to `FeedItemProcessed::class`. Type: `ActivityType::TxnSynced`, title derived from event.

- [x] T037 Register all listeners in `app/Providers/EventServiceProvider.php`. Add activity listeners to the `$listen` array alongside existing notification/gamification listeners for each event.

## Phase 9: Pruning Command + Demo Seeder

- [x] T038 Command: `app/Console/Commands/PruneActivityItems.php`. Artisan command `activity:prune`. Deletes ActivityItems where status in [dismissed, expired] AND updated_at < 90 days ago. Output count of pruned items. Register in `routes/console.php` as daily schedule.

- [x] T039 Demo seeder: In `database/seeders/DemoPersonasSeeder.php`, add method `seedActivityItems()`. Create 50-100 ActivityItem records spread across last 30 days using `Carbon::now()->subDays(rand(0, 30))->subHours(rand(0, 23))`. Bias recent: 60% of items in last 7 days. Mix: ~70% activity category, ~30% action category. Action items: last 3 days only, 5-8 pinned. Types: sample from all ActivityType cases. Sources: rotate through ledger, invoicing, banking, feed_pipeline. Actor: randomly pick from seeded demo users. Subject: link to existing demo JournalEntries, Invoices, Contacts where applicable. Call `seedActivityItems()` at end of `run()`.

## Phase 10: Keyboard Shortcuts + Polish

- [x] T040 Keyboard shortcuts on activity page: In ActivityTicker component, use `useHotkeys` from `react-hotkeys-hook`. `j` → move selection down, `k` → move selection up, `enter` → navigate to selected item's action_url/subject_url, `x` → dismiss selected item via useDismiss mutation, `r` → mark selected as read via useMarkRead mutation. Shortcuts must not fire when focus is in input/textarea (use `enableOnFormTags: false` option or equivalent).

- [x] T041 Run `vendor/bin/pint --dirty` to format all new PHP files. Run `php artisan test --filter=ActivityItem` to verify all tests pass.
