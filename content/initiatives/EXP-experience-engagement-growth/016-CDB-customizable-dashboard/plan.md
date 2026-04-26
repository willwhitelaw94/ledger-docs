---
title: "Implementation Plan: Customizable Dashboard (016-CDB)"
---

# Implementation Plan: Customizable Dashboard (016-CDB)

**Branch**: `016-CDB-customizable-dashboard` | **Date**: 2026-03-14 | **Spec**: [spec.md](/initiatives/FL-financial-ledger/016-CDB-customizable-dashboard/spec.md)

---

## Summary

Add a widget customisation layer to the existing Business Overview dashboard. Users can enter edit mode, show/hide widgets (including per-bank-account toggles), and drag non-bank widgets into their preferred order. Layouts are saved per user per workspace. Three new backend summary endpoints provide pre-aggregated data for the AR aging, AP aging, and cash in/out bar charts. The widget components themselves are already built — this plan covers only the customisation system and chart enhancements.

---

## Technical Context

**Language/Version**: PHP 8.4 / TypeScript (strict)
**Backend**: Laravel 12, Lorisleiva Actions, Spatie Laravel Data, API Resources
**Frontend**: Next.js 16, React 19, TanStack Query v5, Zustand v5, Tailwind CSS
**Database**: SQLite (local dev), single-database multi-tenancy (`workspace_id` scoping)
**Testing**: Pest v4, PHPUnit 12
**Performance Goals**: Layout save/load < 300ms; aging chart data < 200ms
**Constraints**: Layout scoped per user per workspace; bank accounts pinned at top, non-bank widgets freely reorderable

---

## Gate 3: Architecture Pre-Check

### Pre-Check Findings

| Area | Finding | Resolution in Plan |
|------|---------|-------------------|
| Aging endpoint bucket shape | Existing `/invoices/aging` and `/bills/aging` use past-due buckets (1_30, 31_60, etc.), not forward-looking weekly buckets needed for the dashboard chart | Add `?view=dashboard` param to return Xero-style weekly buckets alongside existing shape |
| No cash flow summary endpoint | No existing `/payments/cash-summary` endpoint | New action + endpoint in Phase 1 |
| No `dashboard_layouts` table | Per-user layout persistence requires a new table | New migration + model in Phase 1 |
| Drag-and-drop library | No DnD library in frontend currently | Add `@dnd-kit/core` + `@dnd-kit/sortable` (React-native, accessibility-friendly) |

### Gate 3 Checklist

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | ✅ Pass | Layout table + API + DnD-kit |
| Existing patterns leveraged | ✅ Pass | Follows Actions + Resources + TanStack Query patterns |
| No impossible requirements | ✅ Pass | All items buildable |
| Performance considered | ✅ Pass | Summary endpoints return aggregates, not full lists |
| Security considered | ✅ Pass | Layout scoped by workspace_id + user_id; Gate::authorize on all endpoints |
| Data model understood | ✅ Pass | `dashboard_layouts` table defined below |
| API contracts clear | ✅ Pass | 4 endpoints defined |
| Dependencies identified | ✅ Pass | dnd-kit, existing aging endpoints |
| All TypeScript — no `any` | ✅ Pass | Types defined for all API responses |
| TanStack Query for server state | ✅ Pass | `useDashboardLayout` hook wraps all API calls |
| Zustand for edit mode UI state | ✅ Pass | Edit mode (entering/exiting, drag state) is client-only UI state |
| No hardcoded business logic in frontend | ✅ Pass | Widget catalogue built from API response (available bank accounts from `/bank-accounts`) |
| Lorisleiva Actions | ✅ Pass | `GetDashboardLayout`, `SaveDashboardLayout`, `GetAgingSummary`, `GetCashSummary` |
| Authorization in `authorize()` | ✅ Pass | All actions authorize via `$user->can()` in `authorize()` |
| Model route binding | ✅ Pass | No `int $id` — workspace from middleware |
| No event sourcing needed | ✅ Pass | Dashboard layout is a mutable preference, not a financial event |

**Gate 3 Result: ✅ PASS**

---

## Data Model

### New Table: `dashboard_layouts`

```
dashboard_layouts
├── id                     bigint, PK
├── workspace_id           bigint, FK → workspaces.id, cascadeOnDelete
├── user_id                bigint, FK → users.id, cascadeOnDelete
├── layout                 json  — ordered array of widget slots (see shape below)
├── onboarding_dismissed   boolean, default false
├── created_at
└── updated_at

UNIQUE (workspace_id, user_id)
```

**Layout JSON shape:**
```json
{
  "bank_accounts": ["ba_uuid_1", "ba_uuid_2"],
  "widgets": ["invoices_owed", "bills_to_pay", "tasks", "profit_loss_mtd", "cash_in_out", "recent_journal_entries", "reconciliation_health"]
}
```

- `bank_accounts`: ordered array of bank account UUIDs that are visible. Omitted = hidden.
- `widgets`: ordered array of widget IDs that are visible. Order = display order. Omitted = hidden.

### New Model: `DashboardLayout`

```php
app/Models/Tenant/DashboardLayout.php
- workspace_id, user_id, layout (cast: array), onboarding_dismissed (cast: bool)
- Unique constraint: workspace_id + user_id
```

---

## API Contracts

### 1. GET `/dashboard/layout`

Returns the current user's layout for the active workspace. If no saved layout exists, returns the default (all widgets visible, all bank accounts visible, alphabetical order).

**Response:**
```json
{
  "data": {
    "bank_accounts": [
      { "id": "uuid", "name": "Business Cheque", "masked": "****1234", "visible": true }
    ],
    "widgets": [
      { "id": "invoices_owed", "visible": true },
      { "id": "bills_to_pay", "visible": true },
      { "id": "tasks", "visible": true },
      { "id": "profit_loss_mtd", "visible": true },
      { "id": "cash_in_out", "visible": true },
      { "id": "recent_journal_entries", "visible": true },
      { "id": "reconciliation_health", "visible": true }
    ],
    "onboarding_dismissed": false
  }
}
```

The response merges the saved layout with the live bank account list — new bank accounts default to visible.

### 2. PUT `/dashboard/layout`

Saves the current user's layout for the active workspace.

**Request body:**
```json
{
  "bank_accounts": ["uuid1", "uuid2"],
  "widgets": ["invoices_owed", "tasks", "bills_to_pay", "profit_loss_mtd"],
  "onboarding_dismissed": true
}
```

**Response:** `200 OK` with updated layout resource.

### 3. GET `/invoices/aging?view=dashboard`

Extends the existing aging endpoint. Without `?view=dashboard`, returns the existing past-due bucket shape. With `?view=dashboard`, returns forward-looking weekly buckets for the Xero-style chart.

**Response (view=dashboard):**
```json
{
  "summary": {
    "older": 0,
    "this_week": 2500,
    "next_7_14_days": 1800,
    "next_14_28_days": 4200,
    "from_28_days": 1100
  },
  "total_outstanding": 9600
}
```

### 4. GET `/bills/aging?view=dashboard`

Same shape as above, applied to AP outstanding bills.

### 5. GET `/payments/cash-summary`

Returns monthly cash inflows and outflows for the last 6 calendar months.

**Response:**
```json
{
  "data": [
    { "month": "2025-10", "label": "Oct", "cash_in": 15400, "cash_out": 12800 },
    { "month": "2025-11", "label": "Nov", "cash_in": 18200, "cash_out": 14100 },
    ...
  ]
}
```

---

## Frontend Architecture

### New Files

```
frontend/src/
├── hooks/
│   └── use-dashboard-layout.ts        # TanStack Query: GET + PUT layout
├── stores/
│   └── use-dashboard-edit-store.ts    # Zustand: edit mode UI state (isEditing, draft layout)
├── app/(dashboard)/dashboard/
│   ├── page.tsx                       # Updated: reads layout, renders widget grid
│   ├── components/
│   │   ├── edit-mode-bar.tsx          # "Edit dashboard" / "Done" / "Cancel" header bar
│   │   ├── add-widget-panel.tsx       # Sheet/drawer: show/hide toggles
│   │   ├── widget-grid.tsx            # Sortable DnD container for non-bank widgets
│   │   ├── edit-mode-onboarding.tsx   # First-time explanation panel
│   │   └── charts/
│   │       ├── aging-bar-chart.tsx    # Shared: AR/AP aging bar chart
│   │       └── cash-flow-chart.tsx    # Cash in/out 6-month bars
└── types/
    └── dashboard.ts                   # DashboardLayout, WidgetSlot, AgingSummary, CashSummary types
```

### State Architecture

**Server state** (TanStack Query via `use-dashboard-layout.ts`):
- `useGetLayout()` — fetches saved layout on dashboard mount
- `useSaveLayout()` — mutation called on "Done"

**Client UI state** (Zustand `use-dashboard-edit-store.ts`):
- `isEditing: boolean` — toggle edit mode
- `draftLayout: LayoutState` — in-memory copy mutated during edit; discarded on Cancel, committed on Done
- `enterEditMode()` — copies server layout to draft
- `exitEditMode(save: boolean)` — if save=true, calls `useSaveLayout` mutation; if false, discards draft

### TypeScript Types

```typescript
// frontend/src/types/dashboard.ts

type WidgetId =
  | 'invoices_owed'
  | 'bills_to_pay'
  | 'tasks'
  | 'profit_loss_mtd'
  | 'cash_in_out'
  | 'recent_journal_entries'
  | 'reconciliation_health';

type BankAccountSlot = {
  id: string;
  name: string;
  masked: string | null;
  visible: boolean;
};

type WidgetSlot = {
  id: WidgetId;
  visible: boolean;
};

type DashboardLayout = {
  bank_accounts: BankAccountSlot[];
  widgets: WidgetSlot[];
  onboarding_dismissed: boolean;
};

type AgingSummary = {
  summary: {
    older: number;
    this_week: number;
    next_7_14_days: number;
    next_14_28_days: number;
    from_28_days: number;
  };
  total_outstanding: number;
};

type CashSummaryMonth = {
  month: string;
  label: string;
  cash_in: number;
  cash_out: number;
};
```

### Drag-and-Drop

Use `@dnd-kit/core` + `@dnd-kit/sortable`:
- `<SortableContext>` wraps non-bank widget cards
- Each widget card is a `<SortableItem>` — drag handle is the only trigger
- Drag handle cursor and visual affordance only visible in edit mode
- On drag end, update `draftLayout.widgets` order in the Zustand store

---

## Implementation Phases

### Phase 1: Backend — Layout Persistence + Aging Endpoints

**Migration:**
- `2026_03_14_100001_create_dashboard_layouts_table.php`

**New files:**
- `app/Models/Tenant/DashboardLayout.php`
- `app/Actions/Dashboard/GetDashboardLayout.php`
- `app/Actions/Dashboard/SaveDashboardLayout.php`
- `app/Actions/Dashboard/GetCashSummary.php`
- `app/Http/Controllers/Api/DashboardController.php`
- `app/Http/Resources/DashboardLayoutResource.php`
- `app/Http/Resources/CashSummaryResource.php`
- `app/Policies/DashboardLayoutPolicy.php`

**Modified files:**
- `app/Http/Controllers/Api/InvoiceController.php` — add `?view=dashboard` branch to `aging()`
- `app/Http/Controllers/Api/BillController.php` — same
- `routes/api.php` — add `GET/PUT dashboard/layout`, `GET payments/cash-summary`
- `app/Providers/AppServiceProvider.php` — register `DashboardLayoutPolicy`

**Tests:**
- `tests/Feature/Api/DashboardLayoutApiTest.php`
  - GET returns default layout when none saved
  - GET merges new bank accounts into saved layout
  - PUT saves layout, persists on subsequent GET
  - Per-user isolation: User A's layout unaffected by User B's changes
  - `?view=dashboard` on aging endpoint returns weekly bucket shape
  - Cash summary returns 6 months of data

### Phase 2: Frontend — Edit Mode + Layout Persistence

**New files:** (all listed in Frontend Architecture above)

**Modified files:**
- `frontend/src/app/(dashboard)/dashboard/page.tsx` — integrate layout query, render widget grid based on layout
- `frontend/package.json` — add `@dnd-kit/core`, `@dnd-kit/sortable`

**What to build:**
1. `use-dashboard-layout.ts` — `useGetLayout()` and `useSaveLayout()` hooks
2. `use-dashboard-edit-store.ts` — Zustand store for edit mode draft state
3. `edit-mode-bar.tsx` — sticky header with Edit/Done/Cancel
4. `widget-grid.tsx` — `SortableContext` wrapping reorderable widget cards
5. `add-widget-panel.tsx` — Sheet with bank account + widget toggles
6. `edit-mode-onboarding.tsx` — dismissible explanation panel (shown once)
7. Wire `page.tsx` to render from layout state

### Phase 3: Frontend — Chart Enhancements

1. `aging-bar-chart.tsx` — Recharts v2.15.4 `<BarChart>` consuming `AgingSummary` (follow existing P&L card patterns)
2. `cash-flow-chart.tsx` — Grouped bar chart consuming `CashSummary`
3. Update `InvoicesOwedCard` to fetch `?view=dashboard` aging and render chart
4. Update `BillsToPayCard` same
5. Add `CashInOutCard` widget (currently listed in widget catalogue but not yet implemented)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| DnD-kit accessibility on touch devices | Low | Medium | dnd-kit has first-class pointer events + touch support; test on iPad |
| Layout migration diverges from bank account reality | Low | Low | `GetDashboardLayout` always merges with live bank account list; orphaned IDs silently skipped |
| Aging bucket definition differs from existing reports | Medium | Low | `?view=dashboard` param keeps old shape intact; new shape only used by dashboard chart |
| Recharts version compatibility | Low | Low | Recharts v2.15.4 already installed — use existing patterns from P&L card |

---

## Next Steps

1. `/speckit-tasks` — Generate task breakdown from this plan
2. Run `cd frontend && npm ls recharts` to confirm chart library availability before Phase 3
