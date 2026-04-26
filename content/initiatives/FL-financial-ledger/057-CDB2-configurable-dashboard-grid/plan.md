---
title: "Implementation Plan: Configurable Dashboard Grid"
---

# Implementation Plan: Configurable Dashboard Grid

**Spec**: [spec.md](/initiatives/FL-financial-ledger/057-CDB2-configurable-dashboard-grid/spec)
**Created**: 2026-03-20
**Status**: Draft

---

## Technical Context

### Technology Stack

- **Backend**: Laravel 12, PHP 8.4, SQLite (local dev)
- **Frontend**: Next.js 16, React 19, TypeScript (strict)
- **Grid library**: `react-grid-layout` + `@types/react-grid-layout` (NEW)
- **Charts**: Recharts (already installed)
- **State**: Zustand v5 (dashboard grid store), TanStack Query v5 (widget data)
- **UI**: shadcn/ui Card, Badge, Button, Sheet, DropdownMenu, Dialog, Skeleton
- **Animations**: motion/react (already installed)
- **Existing drag**: @dnd-kit (retained for non-dashboard list reordering)

### Dependencies

| Dependency | Status | Notes |
|-----------|--------|-------|
| `react-grid-layout` | NEW — install | Grid engine, ~40KB gzipped |
| `@types/react-grid-layout` | NEW — install | TypeScript definitions |
| Recharts | Already installed | Charts in widget tiles |
| @dnd-kit | Already installed | NOT used for dashboard grid (only other list UIs) |
| TanStack Query | Already installed | Each widget fetches its own data |
| Zustand | Already installed | New `useDashboardGridStore` |

### Constraints

- **SQLite for dev**: JSON column stores tiles array. SQLite handles JSON natively.
- **Tenant isolation**: Entity dashboards scoped by `workspace_id`; home dashboards have `workspace_id = NULL`.
- **No breaking changes**: Old `dashboard_layouts` table kept for 90-day rollback. Lazy migration on first load.
- **Performance**: Max 24 tiles per dashboard. Parallel widget data fetching. Auto-refresh intervals (60s KPI, 5min charts).
- **Mobile**: < 768px = single-column stack, no grid. Grid only >= 768px.

---

## Gate 3: Architecture Check

### 1. Technical Feasibility

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | 12-col grid via react-grid-layout, serialized to JSON, CRUD API |
| Existing patterns leveraged | PASS | Actions pattern, API Resources, TanStack Query hooks, Zustand stores |
| No impossible requirements | PASS | All requirements buildable with chosen stack |
| Performance considered | PASS | Max 24 tiles, parallel fetching, auto-refresh intervals, row height constant |
| Security considered | PASS | Layout scoped per user, policy enforces ownership, no cross-tenant access |

### 2. Data & Integration

| Check | Status | Notes |
|-------|--------|-------|
| Data model understood | PASS | Single `dashboards` table, UUID PK, JSON tiles column |
| API contracts clear | PASS | 11 endpoints defined (CRUD + duplicate + catalogue) |
| Dependencies identified | PASS | react-grid-layout (new), migration from dashboard_layouts |
| Integration points mapped | PASS | Existing widget data endpoints reused, new catalogue endpoint |
| DTO persistence explicit | PASS | Tiles stored as JSON, validated via Form Request rules |

### 3. Implementation Approach

| Check | Status | Notes |
|-------|--------|-------|
| File changes identified | PASS | See Implementation Phases below |
| Risk areas noted | PASS | Migration from old format, responsive breakpoints, chart resize |
| Testing approach defined | PASS | Feature tests for API, browser tests for grid interactions |
| Rollback possible | PASS | Old table retained 90 days, feature can be reverted by restoring old dashboard page |

### 4. Resource & Scope

| Check | Status | Notes |
|-------|--------|-------|
| Scope matches spec | PASS | No v2 features (sharing, undo/redo, widget config) |
| Effort reasonable | PASS | Large (L) — 5 phases, ~40 files |
| Skills available | PASS | React, TypeScript, Laravel — all established in codebase |

### 5. Laravel Best Practices

| Check | Status | Notes |
|-------|--------|-------|
| No hardcoded business logic | PASS | Widget catalogue from API, presets from backend config |
| Use Lorisleiva Actions | PASS | 7 new Actions (Create, Update, Delete, Duplicate, List, GetCatalogue, MigrateOldLayout) |
| Model route binding | PASS | `Dashboard $dashboard` in controller methods |
| Migrations schema-only | PASS | Migration creates table; preset seeding via separate action |
| Feature flags dual-gated | N/A | No feature flag for this — replaces existing dashboard |

### 6. Next.js/React TypeScript Standards (CLAUDE.md override)

| Check | Status | Notes |
|-------|--------|-------|
| All components use TypeScript | PASS | Every `.tsx` file, strict mode, no `any` |
| Props typed with interfaces/types | PASS | Each widget has `type Props = { widgetId, config? }` |
| TanStack Query for all server state | PASS | Each widget has its own query hook |
| Client state via Zustand | PASS | `useDashboardGridStore` for edit state |
| Forms use React Hook Form + Zod | N/A | No forms in this epic (dashboard names use simple Dialog input) |
| Server/client components explicit | PASS | Dashboard page is `'use client'`, widget data hooks are client-side |

### 7. Component Decomposition

| Check | Status | Notes |
|-------|--------|-------|
| Single rendering responsibility | PASS | Each widget is self-contained; grid engine separate from widget rendering |
| Sub-components identified | PASS | See Widget Component Architecture below |

**Gate 3 Result: PASS** — No red flags.

---

## Data Model

### New Table: `dashboards`

```sql
CREATE TABLE dashboards (
    id          TEXT PRIMARY KEY,              -- UUID
    user_id     BIGINT NOT NULL,              -- FK → users.id
    workspace_id BIGINT NULL,                  -- FK → workspaces.id (NULL = home dashboard)
    name        VARCHAR(100) NOT NULL,
    is_default  BOOLEAN NOT NULL DEFAULT 0,
    tiles       TEXT NOT NULL DEFAULT '[]',    -- JSON array of TileLayout
    created_at  TIMESTAMP NULL,
    updated_at  TIMESTAMP NULL,

    UNIQUE(user_id, workspace_id, name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_dashboards_user_workspace ON dashboards(user_id, workspace_id, is_default);
```

### Migration: Add `migrated_at` to `dashboard_layouts`

```sql
ALTER TABLE dashboard_layouts ADD COLUMN migrated_at TIMESTAMP NULL;
```

### Model: `Dashboard`

```php
// app/Models/Tenant/Dashboard.php
class Dashboard extends Model
{
    use HasUuids;

    protected $fillable = ['user_id', 'workspace_id', 'name', 'is_default', 'tiles'];

    protected function casts(): array
    {
        return [
            'tiles' => 'array',
            'is_default' => 'boolean',
        ];
    }

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
```

---

## API Contracts

### Entity Dashboard Endpoints (workspace-scoped)

| Method | Path | Action | Request | Response |
|--------|------|--------|---------|----------|
| GET | `/api/v1/dashboards` | ListDashboards | — | `DashboardResource[]` |
| POST | `/api/v1/dashboards` | CreateDashboard | `{ name, preset?, tiles? }` | `DashboardResource` |
| GET | `/api/v1/dashboards/{dashboard}` | GetDashboard | — | `DashboardResource` |
| PUT | `/api/v1/dashboards/{dashboard}` | UpdateDashboard | `{ name?, tiles?, is_default? }` | `DashboardResource` |
| DELETE | `/api/v1/dashboards/{dashboard}` | DeleteDashboard | — | `204` |
| POST | `/api/v1/dashboards/{dashboard}/duplicate` | DuplicateDashboard | `{ name }` | `DashboardResource` |
| GET | `/api/v1/dashboard/widget-catalogue` | GetWidgetCatalogue | — | `WidgetDefinition[]` |

### Home Dashboard Endpoints (user-scoped, no workspace)

| Method | Path | Action | Request | Response |
|--------|------|--------|---------|----------|
| GET | `/api/v1/home/dashboards` | ListHomeDashboards | — | `DashboardResource[]` |
| POST | `/api/v1/home/dashboards` | CreateHomeDashboard | `{ name, preset?, tiles? }` | `DashboardResource` |
| PUT | `/api/v1/home/dashboards/{dashboard}` | UpdateHomeDashboard | `{ name?, tiles?, is_default? }` | `DashboardResource` |
| DELETE | `/api/v1/home/dashboards/{dashboard}` | DeleteHomeDashboard | — | `204` |

### DashboardResource Shape

```json
{
  "id": "uuid",
  "name": "Dashboard",
  "is_default": true,
  "tiles": [
    { "i": "kpi_cash_position", "x": 0, "y": 0, "w": 3, "h": 2, "minW": 2, "minH": 2 },
    { "i": "chart_cash_flow",   "x": 0, "y": 2, "w": 6, "h": 3, "minW": 4, "minH": 3 }
  ],
  "created_at": "2026-03-20T...",
  "updated_at": "2026-03-20T..."
}
```

### WidgetDefinition Shape

```json
{
  "id": "kpi_cash_position",
  "name": "Cash Position",
  "category": "kpi",
  "description": "Current total bank balance across all accounts",
  "icon": "Wallet",
  "default_size": { "w": 3, "h": 2 },
  "min_size": { "w": 2, "h": 2 },
  "max_size": { "w": 12, "h": 6 },
  "requires_feature": null
}
```

---

## Frontend Component Architecture

### New Files

```
frontend/src/
├── types/
│   └── dashboard-grid.ts                    — TileLayout, Dashboard, WidgetDefinition types
├── stores/
│   └── use-dashboard-grid-store.ts          — Zustand: editing, draft, active dashboard
├── hooks/
│   ├── use-dashboards.ts                    — CRUD hooks (list, create, update, delete, duplicate)
│   ├── use-widget-catalogue.ts              — Widget catalogue query
│   └── use-widget-data/
│       ├── use-kpi-data.ts                  — Shared KPI data hook (revenue, expenses, profit, AR, AP)
│       ├── use-cash-flow-data.ts            — Cash flow chart data
│       ├── use-aging-data.ts                — AR/AP aging buckets
│       ├── use-journal-entries-data.ts       — Recent JEs
│       ├── use-bank-account-data.ts          — Per-bank-account data
│       ├── use-reconciliation-data.ts        — Reconciliation health
│       ├── use-repeating-data.ts             — Upcoming recurring templates
│       └── use-unmatched-data.ts             — Unmatched transactions
├── components/
│   └── dashboard/
│       ├── DashboardGrid.tsx                — react-grid-layout wrapper (core grid engine)
│       ├── DashboardSwitcher.tsx            — Dropdown: switch, create, rename, delete dashboards
│       ├── DashboardEditBar.tsx             — Edit/Done/Cancel toolbar
│       ├── WidgetLibrarySidebar.tsx          — Sheet with categorised widget list + search
│       ├── WidgetTile.tsx                   — Card wrapper with drag handle + remove button
│       ├── WidgetRenderer.tsx               — Maps widgetId → component (lazy-loaded)
│       ├── EmptyDashboard.tsx               — Empty state prompt
│       ├── NewDashboardDialog.tsx           — Name + preset selection dialog
│       ├── widgets/
│       │   ├── kpi/
│       │   │   ├── KpiCard.tsx              — Shared KPI card shell (value, trend, sparkline)
│       │   │   ├── KpiCashPosition.tsx
│       │   │   ├── KpiRevenueMtd.tsx
│       │   │   ├── KpiExpensesMtd.tsx
│       │   │   ├── KpiNetProfitMtd.tsx
│       │   │   ├── KpiArOutstanding.tsx
│       │   │   ├── KpiApOutstanding.tsx
│       │   │   ├── KpiUnreconciled.tsx
│       │   │   ├── KpiOverdueInvoices.tsx
│       │   │   └── KpiTaxEstimate.tsx
│       │   ├── charts/
│       │   │   ├── ChartCard.tsx            — Shared chart card shell (title, responsive container)
│       │   │   ├── ChartCashFlow.tsx
│       │   │   ├── ChartPnlTrend.tsx
│       │   │   ├── ChartArAging.tsx
│       │   │   ├── ChartApAging.tsx
│       │   │   ├── ChartRevenueBreakdown.tsx
│       │   │   ├── ChartExpenseBreakdown.tsx
│       │   │   ├── ChartBankBalances.tsx
│       │   │   └── ChartBudgetVsActual.tsx
│       │   ├── lists/
│       │   │   ├── ListCard.tsx             — Shared list card shell (title, table, "View all")
│       │   │   ├── ListRecentJournals.tsx
│       │   │   ├── ListOverdueInvoices.tsx
│       │   │   ├── ListUpcomingBills.tsx
│       │   │   ├── ListUpcomingRepeating.tsx
│       │   │   ├── ListRecentPayments.tsx
│       │   │   └── ListUnmatchedTxns.tsx
│       │   ├── status/
│       │   │   ├── StatusReconciliation.tsx
│       │   │   ├── StatusPeriod.tsx
│       │   │   ├── StatusCompliance.tsx
│       │   │   └── StatusEntityHealth.tsx
│       │   ├── bank/
│       │   │   └── BankAccountWidget.tsx
│       │   ├── activity/
│       │   │   ├── TasksAttention.tsx
│       │   │   ├── TasksMyTasks.tsx
│       │   │   ├── ActivityFeed.tsx
│       │   │   └── AiInsights.tsx
│       │   └── home/
│       │       ├── HomeEntities.tsx
│       │       ├── HomeNetWorthHero.tsx
│       │       ├── HomeAlerts.tsx
│       │       └── HomeQuickActions.tsx
│       └── presets.ts                       — Preset tile layouts (Simple, Advanced, Bookkeeper, Owner)
└── app/
    ├── w/[slug]/(dashboard)/dashboard/
    │   └── page.tsx                         — REWRITE: entity dashboard with grid
    └── (home)/home/
        └── page.tsx                         — MODIFY: add grid below welcome section
```

### Modified Files

```
Backend:
├── routes/api.php                           — Add dashboard CRUD routes + widget-catalogue
├── app/Http/Controllers/Api/DashboardGridController.php  — NEW controller
├── app/Http/Controllers/Api/HomeDashboardController.php  — NEW controller
├── app/Actions/Dashboard/                   — 7 new actions
├── app/Http/Requests/Dashboard/             — 4 new form requests
├── app/Http/Resources/DashboardResource.php — NEW resource
├── app/Http/Resources/WidgetDefinitionResource.php — NEW resource
├── app/Models/Tenant/Dashboard.php          — NEW model
├── app/Policies/DashboardPolicy.php         — NEW policy (update existing)
├── database/migrations/                     — 2 new migrations
└── app/Providers/AppServiceProvider.php     — Register Dashboard policy

Frontend:
├── frontend/package.json                    — Add react-grid-layout
├── frontend/src/stores/use-dashboard-edit-store.ts  — DELETE (replaced)
└── frontend/src/types/dashboard.ts          — REPLACE with dashboard-grid.ts
```

---

## Implementation Phases

### Phase 1: Backend Foundation (DB + API)

**Goal**: New `dashboards` table, model, CRUD API, widget catalogue endpoint.

**Files**:
1. `database/migrations/xxxx_create_dashboards_table.php` — Schema
2. `database/migrations/xxxx_add_migrated_at_to_dashboard_layouts.php` — Migration flag
3. `app/Models/Tenant/Dashboard.php` — Model with HasUuids, casts, user relation
4. `app/Policies/DashboardPolicy.php` — viewAny (true), view/update/delete (owner check)
5. `app/Http/Resources/DashboardResource.php` — id, name, is_default, tiles, timestamps
6. `app/Http/Resources/WidgetDefinitionResource.php` — Widget metadata resource
7. `app/Http/Requests/Dashboard/StoreDashboardRequest.php` — name (required, max:100), preset, tiles
8. `app/Http/Requests/Dashboard/UpdateDashboardRequest.php` — name, tiles, is_default (all optional)
9. `app/Actions/Dashboard/ListDashboards.php` — Fetch for user+workspace, auto-create default if none
10. `app/Actions/Dashboard/CreateDashboard.php` — Create with preset tiles or blank, enforce 10-limit
11. `app/Actions/Dashboard/UpdateDashboard.php` — Update tiles/name, handle is_default atomically
12. `app/Actions/Dashboard/DeleteDashboard.php` — Prevent deleting last dashboard
13. `app/Actions/Dashboard/DuplicateDashboard.php` — Clone tiles with new name
14. `app/Actions/Dashboard/GetWidgetCatalogue.php` — Static definitions + dynamic bank accounts
15. `app/Actions/Dashboard/MigrateOldLayout.php` — Read old `dashboard_layouts`, convert to grid format
16. `app/Http/Controllers/Api/DashboardGridController.php` — CRUD + duplicate + catalogue
17. `app/Http/Controllers/Api/HomeDashboardController.php` — Home CRUD (no workspace scope)
18. `routes/api.php` — Register all new routes
19. `app/Providers/AppServiceProvider.php` — Register Dashboard policy

**Tests** (Phase 1):
- `tests/Feature/Api/DashboardGridTest.php` — CRUD operations, preset creation, 10-limit enforcement, default toggling, duplicate, delete-last prevention, widget catalogue
- `tests/Feature/Api/HomeDashboardTest.php` — Home CRUD, 3-limit, no workspace scope
- `tests/Feature/Api/DashboardMigrationTest.php` — Old layout → new grid format conversion

### Phase 2: Frontend Grid Engine

**Goal**: `react-grid-layout` integration, edit mode, Zustand store, dashboard page rewrite.

**Files**:
1. Install `react-grid-layout` + types
2. `frontend/src/types/dashboard-grid.ts` — TileLayout, Dashboard, WidgetDefinition, DashboardCollection
3. `frontend/src/stores/use-dashboard-grid-store.ts` — isEditing, draftTiles, activeDashboardId, libraryOpen
4. `frontend/src/hooks/use-dashboards.ts` — useListDashboards, useCreateDashboard, useUpdateDashboard, useDeleteDashboard, useDuplicateDashboard
5. `frontend/src/hooks/use-widget-catalogue.ts` — useWidgetCatalogue query
6. `frontend/src/components/dashboard/DashboardGrid.tsx` — ResponsiveGridLayout wrapper, breakpoints, rowHeight=80, compactType='vertical', edit mode overlay
7. `frontend/src/components/dashboard/WidgetTile.tsx` — Card wrapper, drag handle (GripVertical), remove button (X), non-interactive overlay in edit mode
8. `frontend/src/components/dashboard/DashboardEditBar.tsx` — Edit/Done/Cancel + Add Widget button
9. `frontend/src/components/dashboard/WidgetRenderer.tsx` — Switch on widgetId → lazy-load component
10. `frontend/src/components/dashboard/EmptyDashboard.tsx` — "Add widgets to get started"
11. `frontend/src/app/w/[slug]/(dashboard)/dashboard/page.tsx` — REWRITE: fetch dashboards, render grid, edit mode

**Key implementation detail**: `react-grid-layout` CSS must be imported (`react-grid-layout/css/styles.css`, `react-resizable/css/styles.css`). Override grid item styles with Tailwind to match shadcn/ui aesthetic.

### Phase 3: Widget Components (KPI + Charts)

**Goal**: Build the 18 KPI and chart widget components with real data.

**Files**:
1. `frontend/src/components/dashboard/widgets/kpi/KpiCard.tsx` — Shared shell: Card with metric label (Geist Sans, text-sm), value (Geist Mono, text-2xl), trend arrow, optional sparkline
2. 10 KPI widget files — Each wraps KpiCard with its own data hook
3. `frontend/src/components/dashboard/widgets/charts/ChartCard.tsx` — Shared shell: Card with title, ResponsiveContainer for Recharts, ResizeObserver for re-render
4. 8 chart widget files — Each wraps ChartCard with specific Recharts config
5. Data hooks in `frontend/src/hooks/use-widget-data/` — One per data source, with `refetchInterval`

**Design language** (from shadcn studio inspiration):
- KPI cards: zinc/neutral Card, large monospace value, small muted label above, trend badge (green up / red down) to the right, mini sparkline (30px tall) at bottom edge
- Chart cards: full-bleed Recharts inside Card, muted axis labels, primary colour for main series, primary/20 for secondary, no grid lines (clean look), rounded bar corners

### Phase 4: Widget Components (Lists + Status + Bank + Activity)

**Goal**: Build remaining 14 widget components.

**Files**:
1. `frontend/src/components/dashboard/widgets/lists/ListCard.tsx` — Shared shell: Card with title, compact table (5 rows max), "View all →" link at bottom
2. 6 list widget files — Each wraps ListCard with TanStack Table mini-config
3. 4 status widget files — StatusReconciliation (progress bars per account), StatusPeriod (open/closed badges), StatusCompliance (checklist), StatusEntityHealth (score ring)
4. `frontend/src/components/dashboard/widgets/bank/BankAccountWidget.tsx` — Account name, masked number, balance (Geist Mono), last txn date, reconciliation %, "Reconcile" button
5. 4 activity widget files — TasksAttention, TasksMyTasks, ActivityFeed, AiInsights

### Phase 5: Dashboard Switcher + Presets + Home Grid + Migration

**Goal**: Multi-dashboard support, preset system, home screen grid, old layout migration.

**Files**:
1. `frontend/src/components/dashboard/DashboardSwitcher.tsx` — DropdownMenu: list dashboards, active indicator, context menu (Set default, Rename, Duplicate, Delete), "+ New Dashboard"
2. `frontend/src/components/dashboard/NewDashboardDialog.tsx` — Dialog: name input, preset radio cards with thumbnail, "Create" button
3. `frontend/src/components/dashboard/presets.ts` — Exported preset tile arrays (Simple, Advanced, Bookkeeper, BusinessOwner, HomeDefault)
4. `frontend/src/app/(home)/home/page.tsx` — MODIFY: replace static grid below welcome with DashboardGrid using home dashboard API
5. Home widget components: `HomeEntities.tsx`, `HomeNetWorthHero.tsx`, `HomeAlerts.tsx`, `HomeQuickActions.tsx`
6. Keyboard shortcuts: `Cmd+E` toggle edit, `Escape` cancel, `Cmd+Enter` save
7. Delete old `frontend/src/stores/use-dashboard-edit-store.ts`
8. Delete old `frontend/src/app/w/[slug]/(dashboard)/dashboard/components/widget-grid.tsx`
9. Delete old `frontend/src/app/w/[slug]/(dashboard)/dashboard/components/customise-dashboard-sheet.tsx`
10. Delete old `frontend/src/app/w/[slug]/(dashboard)/dashboard/components/edit-mode-bar.tsx`

**Tests** (Phase 5):
- `tests/Browser/DashboardGridTest.php` — Edit mode toggle, add widget, resize, save, switch dashboard, create new dashboard, responsive collapse

---

## Testing Strategy

### Feature Tests (Pest)

| Test File | Covers |
|-----------|--------|
| `DashboardGridTest.php` | CRUD: create, list, get, update, delete, duplicate |
| | Preset creation (Simple, Advanced, Bookkeeper, Owner) |
| | 10-dashboard limit enforcement |
| | Default toggling (atomic unset/set) |
| | Delete-last prevention |
| | Tiles JSON validation |
| | Ownership isolation (user A can't see user B's dashboards) |
| `HomeDashboardTest.php` | Home CRUD (no workspace scope) |
| | 3-dashboard limit |
| | Separate from workspace dashboards |
| `DashboardMigrationTest.php` | Old layout → grid conversion |
| | Widget ID mapping (invoices_owed → chart_ar_aging, etc.) |
| | Dropped widgets (loans, fixed_assets) |
| | Bank account tile creation |
| | migrated_at stamp |
| | Idempotency (second load doesn't re-migrate) |
| `WidgetCatalogueTest.php` | Returns static + dynamic bank widgets |
| | Respects active bank accounts only |
| | Feature-flagged widgets marked |

### Browser Tests (Playwright via Pest)

| Test File | Covers |
|-----------|--------|
| `DashboardGridBrowserTest.php` | Edit mode toggle (Cmd+E) |
| | Widget visible after add |
| | Widget removed after remove |
| | Save persists across page reload |
| | Cancel reverts changes |
| | Dashboard switcher dropdown |
| | New dashboard creation |
| | Responsive: single column on mobile viewport |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `react-grid-layout` React 19 compat | Low | High | Library actively maintained; test early in Phase 2 |
| Chart resize jank | Medium | Medium | Use ResizeObserver with debounce (200ms); test with 12 charts |
| Migration data loss | Low | High | Old table kept 90 days; lazy migration is idempotent |
| 24-widget dashboard performance | Medium | Medium | Parallel fetching + staggered refetch intervals; browser test with max tiles |
| CSS conflicts (RGL styles vs Tailwind) | Medium | Low | Override RGL classes with Tailwind in a scoped stylesheet |

---

## Keyboard Shortcuts

| Shortcut | Action | Scope |
|----------|--------|-------|
| `Cmd/Ctrl + E` | Toggle edit mode | Dashboard page |
| `Escape` | Cancel edit mode (discard) | Dashboard page (edit mode) |
| `Cmd/Ctrl + Enter` | Save and exit edit mode | Dashboard page (edit mode) |

These must be added to the `?` shortcut overlay and NOT fire when focus is in an input.

---

## Next Steps

1. Run `/speckit-tasks` to generate the implementation task list
2. Start Phase 1 (backend) — can be done independently of frontend
3. Phase 2 (grid engine) can start in parallel once `react-grid-layout` is installed
