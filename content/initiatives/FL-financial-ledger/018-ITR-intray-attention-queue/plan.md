# 018+020 Combined Epic — Intray & AI Assistant Integration

## Plan

**Status**: Ready for Dev
**Estimated effort**: 5 days
**Scope**: V1 — Page-based Intray with AI read-only integration. Chat write actions deferred to V2.

---

## Architectural Decisions (from clarification)

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Intray data model | **Computed UNION query** — not a stored model. Single `GetIntrayItems` action aggregates across domain tables. No new migration. Composite key `{type}:{uuid}` for item identity. |
| 2 | AI mutation safety | **V2** — Chat stays read-only in V1. When added in V2, use two-phase propose-then-execute with frontend confirmation card. |
| 3 | Badge freshness | **TanStack Query 60s poll** + optimistic decrements on action. Single `/intray/count` endpoint runs parallel COUNTs. No WebSockets. |
| 4 | Source extensibility | **Single Action with per-source methods** + `IntrayItemData` DTO. Each source is one private method. Easy to add more. |
| 5 | AI tool response size | **Summary list (max 10)** via `get_intray_items` tool + per-category counts. Same `GetIntrayItems` action with `mode=summary`. |
| 6 | Intray vs Inbox coexistence | **Both live**. `/inbox` remains for power users / bulk review. `/intray` is the unified queue linking to detail pages. |
| 7 | V1 category scope | **3 categories**: inbox docs (pending_review), draft bills, overdue invoices. Expand in V2 (unreconciled bank txns, pending JEs). |

---

## V1 Scope

### In Scope
- `/intray` page with 3 item categories, StatusTabs, DataTable
- Individual actions (view, confirm, reject) linking to existing detail pages
- Sidebar nav item with badge count + keyboard shortcut `G then T`
- Dashboard widget showing category counts + "View All" link
- AI chat tool `get_intray_items` (read-only summary)
- `IntrayItemData` DTO for canonical item shape
- Feature tests for aggregation + permissions

### Deferred to V2
- Chat write actions (confirm/reject inbox items via conversation)
- Bulk actions on intray items
- Additional categories (unreconciled bank txns, pending JE approval)
- Real-time push notifications
- Snooze/dismiss (requires `intray_dismissals` table)
- Context panel in chat showing current intray item

---

## Task Breakdown

### Phase 1: Backend (Day 1-2)

#### Task 1.1: IntrayItemData DTO
**File**: `app/Data/IntrayItemData.php`

```php
class IntrayItemData extends Data
{
    public function __construct(
        public readonly string $type,       // 'inbox_item', 'draft_bill', 'overdue_invoice'
        public readonly string $uuid,
        public readonly string $title,
        public readonly string $subtitle,
        public readonly string $urgency,    // 'high', 'medium', 'low'
        public readonly int $amount_cents,
        public readonly ?string $due_date,
        public readonly Carbon $created_at,
        public readonly ?array $meta = null,
    ) {}
}
```

#### Task 1.2: GetIntrayItems Action
**File**: `app/Actions/Intray/GetIntrayItems.php`

Lorisleiva Action with `AsAction` trait. Accepts:
- `int $workspaceId`
- `?string $category` — filter to one category (null = all)
- `string $mode` — `'full'` (paginated, grouped) or `'summary'` (flat top-10)
- `int $limit` — default 20

Three private methods:
- `getInboxItems($wsId)` → InboxItem where status=pending_review → urgency by ai_confidence (<80% = high)
- `getDraftBills($wsId)` → Invoice where type=bill, status=draft → urgency=medium
- `getOverdueInvoices($wsId)` → Invoice where type=invoice, status in (sent, partial, viewed), due_date < today → urgency by days overdue (>30d = high, >7d = medium, else low)

Returns `Collection<IntrayItemData>` sorted by urgency desc, then created_at asc.

#### Task 1.3: GetIntrayCounts Action
**File**: `app/Actions/Intray/GetIntrayCounts.php`

Runs three parallel `COUNT(*)` queries (indexed, fast):
```php
[
    'inbox_items' => InboxItem::where('workspace_id', $wsId)->where('status', 'pending_review')->count(),
    'draft_bills' => Invoice::where('workspace_id', $wsId)->where('type', 'bill')->where('status', 'draft')->count(),
    'overdue_invoices' => Invoice::where('workspace_id', $wsId)->where('type', 'invoice')
        ->whereIn('status', ['sent', 'partial', 'viewed'])->where('due_date', '<', now())->count(),
    'total' => /* sum of above */,
]
```

#### Task 1.4: IntrayController
**File**: `app/Http/Controllers/Api/IntrayController.php`

Three endpoints:
- `GET /intray` — calls `GetIntrayItems::run(mode: 'full')`, returns paginated grouped response
- `GET /intray/counts` — calls `GetIntrayCounts::run()`, returns `{inbox_items: N, draft_bills: N, overdue_invoices: N, total: N}`
- `GET /intray/badge` — returns `{count: N}` (just the total, for sidebar badge)

Authorization: `Gate::authorize('viewAny', InboxItem::class)` — reuse inbox permission for V1 (any user who can see inbox can see intray).

#### Task 1.5: Routes
**File**: `routes/api.php`

```php
Route::middleware(['auth:sanctum', 'workspace'])->prefix('v1')->group(function () {
    Route::get('intray', [IntrayController::class, 'index']);
    Route::get('intray/counts', [IntrayController::class, 'counts']);
    Route::get('intray/badge', [IntrayController::class, 'badge']);
});
```

#### Task 1.6: Chat Tool — get_intray_items
**File**: `frontend/src/app/api/chat/route.ts`

Add tool #8:
```typescript
get_intray_items: tool({
  description: 'Get items that need user attention — overdue invoices, draft bills, inbox documents pending review',
  inputSchema: z.object({}),
  execute: async () => laravelFetch('intray?mode=summary&limit=10'),
})
```

Returns summary with counts + top 10 items. AI narrates: "You have 3 documents to review, 2 draft bills, and 1 overdue invoice..."

#### Task 1.7: Feature Tests
**File**: `tests/Feature/Intray/IntrayApiTest.php`

Tests:
- Returns inbox items with status pending_review
- Returns draft bills
- Returns overdue invoices (not draft, not paid, past due)
- Does NOT return paid/voided invoices
- Does NOT return confirmed inbox items
- Respects workspace_id scoping (no cross-tenant leakage)
- Badge count matches sum of categories
- Unauthenticated returns 401
- Unprivileged role returns 403

---

### Phase 2: Frontend — Intray Page (Day 2-3)

#### Task 2.1: useIntray Hook
**File**: `frontend/src/hooks/use-intray.ts`

```typescript
const intrayKeys = {
  all: ['intray'],
  items: (params) => [...intrayKeys.all, 'items', params],
  counts: () => [...intrayKeys.all, 'counts'],
  badge: () => [...intrayKeys.all, 'badge'],
};

export function useIntrayItems(params?) { ... }    // GET /intray
export function useIntrayCounts() { ... }          // GET /intray/counts
export function useIntrayBadge() {                 // GET /intray/badge
  return useQuery({
    queryKey: intrayKeys.badge(),
    queryFn: ...,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
```

#### Task 2.2: Intray Page
**File**: `frontend/src/app/(dashboard)/intray/page.tsx`

Layout:
- PageContainer with title "Intray" and subtitle "Items that need your attention"
- StatusTabs: All | Inbox Documents | Draft Bills | Overdue Invoices (with counts from `/intray/counts`)
- DataTable with columns:
  - Type icon (Inbox/FileText/AlertCircle) + Title
  - Subtitle (supplier name, contact, etc.)
  - Amount (formatted with `formatMoney`)
  - Date (formatted with `formatDate`)
  - Urgency badge (High=red, Medium=amber, Low=muted)
  - Action button → links to detail page (`/inbox/{uuid}`, `/bills/{uuid}`, `/invoices/{uuid}`)
- Keyboard shortcut `G then T` to navigate here
- Empty state: "All clear — nothing needs your attention" with a checkmark icon

#### Task 2.3: Intray Types
**File**: `frontend/src/types/intray.ts`

```typescript
export type IntrayItemType = 'inbox_item' | 'draft_bill' | 'overdue_invoice';
export type IntrayUrgency = 'high' | 'medium' | 'low';

export interface IntrayItem {
  type: IntrayItemType;
  uuid: string;
  title: string;
  subtitle: string;
  urgency: IntrayUrgency;
  amount_cents: number;
  due_date: string | null;
  created_at: string;
  meta?: Record<string, unknown>;
}

export interface IntrayCounts {
  inbox_items: number;
  draft_bills: number;
  overdue_invoices: number;
  total: number;
}
```

---

### Phase 3: Navigation + Dashboard (Day 3-4)

#### Task 3.1: Sidebar Badge
**File**: `frontend/src/components/layout/app-sidebar.tsx`

Add intray nav item with badge count from `useIntrayBadge()`:
```tsx
{ title: "Intray", url: "/intray", icon: InboxIcon, shortcut: "G then T", badge: intrayBadgeCount }
```

Position in sidebar: after "Feed", before "Accounts".

Badge rendering: use the existing badge pattern — red dot or count badge. Hidden when count is 0. Shows "99+" when over 99.

#### Task 3.2: Keyboard Shortcut
**Files**: `frontend/src/hooks/use-keyboard-shortcuts.ts`, `frontend/src/lib/navigation.ts`

Add `G then T` → navigate to `/intray` (T for Tray, matching CLAUDE.md spec).

#### Task 3.3: Dashboard Widget
**File**: `frontend/src/app/(dashboard)/dashboard/page.tsx`

Add an `IntrayWidget` to the dashboard widget registry:
- Card with title "Attention" and a link "View all →"
- Shows 3 rows, one per category: icon + label + count
- Example: `📬 Inbox Documents — 3` / `📄 Draft Bills — 2` / `⚠️ Overdue — 1`
- Only shows categories with count > 0
- Hidden entirely when total count is 0 (same pattern as gamification widget)
- Data from `useIntrayCounts()` with 60s stale time

---

### Phase 4: Tests + Polish (Day 4-5)

#### Task 4.1: Browser Tests
**File**: `tests/Browser/IntrayTest.php`

- Login as admin → navigate to `/intray` → verify page loads
- Verify StatusTabs show correct counts
- Click through to inbox item detail → verify navigation works
- Click through to invoice detail → verify navigation works
- Verify empty state when no items

#### Task 4.2: Polish
- Verify urgency badge colors match design pattern (high=red, medium=amber, low=muted)
- Verify date formatting uses AU locale
- Verify avatar initials on items where applicable
- Verify DataTable empty state uses the new Inbox icon pattern
- Verify badge count updates after confirming an inbox item (optimistic decrement)

---

## File Map

### New Files (Backend)
```
app/Data/IntrayItemData.php
app/Actions/Intray/GetIntrayItems.php
app/Actions/Intray/GetIntrayCounts.php
app/Http/Controllers/Api/IntrayController.php
tests/Feature/Intray/IntrayApiTest.php
tests/Browser/IntrayTest.php
```

### New Files (Frontend)
```
frontend/src/app/(dashboard)/intray/page.tsx
frontend/src/hooks/use-intray.ts
frontend/src/types/intray.ts
```

### Modified Files
```
routes/api.php                                    — add 3 intray routes
frontend/src/app/api/chat/route.ts                — add get_intray_items tool
frontend/src/components/layout/app-sidebar.tsx     — add intray nav + badge
frontend/src/hooks/use-keyboard-shortcuts.ts       — add G then T
frontend/src/lib/navigation.ts                     — add /intray
frontend/src/app/(dashboard)/dashboard/page.tsx    — add IntrayWidget
frontend/src/components/layout/keyboard-shortcuts-overlay.tsx — add G then T
```

---

## V2 Roadmap (not in this plan)

1. **Chat write actions**: `confirm_inbox_item` + `reject_inbox_item` tools with two-phase confirmation UX
2. **Additional categories**: unreconciled bank transactions (>7d old), journal entries pending approval
3. **Bulk actions**: select multiple → approve/reject/dismiss
4. **Snooze/dismiss**: `intray_dismissals` table, per-user state
5. **Real-time push**: WebSocket badge updates when new items arrive
6. **Context panel**: chat sidebar shows intray item detail when discussing it
