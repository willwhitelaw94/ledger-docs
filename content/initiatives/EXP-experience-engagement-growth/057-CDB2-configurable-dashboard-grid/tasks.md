---
title: "Implementation Tasks: Configurable Dashboard Grid"
---

# Implementation Tasks: Configurable Dashboard Grid

**Epic**: 057-CDB2
**Mode**: AI Agent
**Generated**: 2026-03-21
**Total Tasks**: 62
**Phases**: 5

---

## Phase 1: Backend Foundation (DB + Model + API)

### 1A: Migrations & Model

- [ ] T001 Migration: Create `dashboards` table. File: `database/migrations/2026_03_21_000001_create_dashboards_table.php`. Columns: `id` (uuid, primary), `user_id` (foreignId, constrained to users, cascadeOnDelete), `workspace_id` (foreignId nullable, constrained to workspaces, nullOnDelete), `name` (string 100), `is_default` (boolean default false), `tiles` (json default '[]'), `timestamps()`. Add unique index on `['user_id', 'workspace_id', 'name']`. Add index on `['user_id', 'workspace_id', 'is_default']`.

- [ ] T002 Migration: Add `migrated_at` to `dashboard_layouts`. File: `database/migrations/2026_03_21_000002_add_migrated_at_to_dashboard_layouts.php`. Add nullable `timestamp` column `migrated_at` to `dashboard_layouts` table.

- [ ] T003 [P] Model: Create `Dashboard`. File: `app/Models/Tenant/Dashboard.php`. Use `HasUuids` trait. `$fillable = ['user_id', 'workspace_id', 'name', 'is_default', 'tiles']`. Casts: `tiles` → `array`, `is_default` → `boolean`. Relations: `user()` → `BelongsTo(User::class)`. Scope: `scopeForUser($query, int $userId, ?int $workspaceId)` → filters by user_id and workspace_id (handles NULL for home).

- [ ] T004 [P] Policy: Create `DashboardPolicy`. File: `app/Policies/DashboardPolicy.php`. Methods: `viewAny()` → return true (all roles can view their own). `view(User $user, Dashboard $dashboard)` → `$dashboard->user_id === $user->id`. `create()` → return true. `update(User $user, Dashboard $dashboard)` → `$dashboard->user_id === $user->id`. `delete(User $user, Dashboard $dashboard)` → `$dashboard->user_id === $user->id`. Register in `AppServiceProvider::boot()` via `Gate::policy(Dashboard::class, DashboardPolicy::class)`.

- [ ] T005 [P] Resource: Create `DashboardResource`. File: `app/Http/Resources/DashboardResource.php`. Return: `id`, `name`, `is_default`, `tiles` (pass through array), `created_at` (Carbon toISOString), `updated_at` (Carbon toISOString).

- [ ] T006 [P] Resource: Create `WidgetDefinitionResource`. File: `app/Http/Resources/WidgetDefinitionResource.php`. Return: `id`, `name`, `category`, `description`, `icon`, `default_size` (object: w, h), `min_size` (object: w, h), `max_size` (object: w, h), `requires_feature` (nullable string).

### 1B: Form Requests

- [ ] T007 [P] FormRequest: `StoreDashboardRequest`. File: `app/Http/Requests/Dashboard/StoreDashboardRequest.php`. `authorize()` → `$this->user()->can('create', Dashboard::class)`. Rules: `name` (required, string, max:100), `preset` (nullable, string, in:blank,simple,advanced,bookkeeper,business_owner), `tiles` (nullable, array), `tiles.*.i` (required_with:tiles, string), `tiles.*.x` (required_with:tiles, integer, min:0, max:11), `tiles.*.y` (required_with:tiles, integer, min:0), `tiles.*.w` (required_with:tiles, integer, min:1, max:12), `tiles.*.h` (required_with:tiles, integer, min:1, max:6). After hook: validate user has < 10 dashboards for this workspace (or < 3 for home where workspace_id is null).

- [ ] T008 [P] FormRequest: `UpdateDashboardRequest`. File: `app/Http/Requests/Dashboard/UpdateDashboardRequest.php`. `authorize()` → resolve Dashboard from route `dashboard` UUID, stash on `$this->attributes->set('dashboard', $dashboard)`, return `$this->user()->can('update', $dashboard)`. Rules: `name` (nullable, string, max:100), `is_default` (nullable, boolean), `tiles` (nullable, array) with same tile validation as Store. After hook: if name changed, validate uniqueness within user+workspace scope.

- [ ] T009 [P] FormRequest: `DuplicateDashboardRequest`. File: `app/Http/Requests/Dashboard/DuplicateDashboardRequest.php`. `authorize()` → resolve Dashboard, check can('view', $dashboard). Rules: `name` (required, string, max:100). After hook: validate < 10 dashboards limit and name uniqueness.

### 1C: Actions

- [ ] T010 Action: `ListDashboards`. File: `app/Actions/Dashboard/ListDashboards.php`. Use `AsAction`. `handle(int $userId, ?int $workspaceId): Collection`. Query `Dashboard::forUser($userId, $workspaceId)->orderBy('created_at')`. If collection is empty: check for old `dashboard_layouts` record → if exists, call `MigrateOldLayout::run()`. If still empty after migration check: call `CreateDashboard::run()` with preset based on user's workspace role (bookkeeper → 'bookkeeper', owner/accountant → 'simple', others → 'simple'), `is_default: true`, name: 'Dashboard'. Return collection.

- [ ] T011 Action: `CreateDashboard`. File: `app/Actions/Dashboard/CreateDashboard.php`. Use `AsAction`. `handle(int $userId, ?int $workspaceId, string $name, ?string $preset = null, ?array $tiles = null, bool $isDefault = false): Dashboard`. If `$preset` is not null and `$tiles` is null: load tiles from preset config (call `DashboardPresets::get($preset)`). If `$isDefault`: wrap in transaction — unset existing default for user+workspace, then create with is_default=true. Create Dashboard with `Str::uuid()`, return it.

- [ ] T012 Action: `UpdateDashboard`. File: `app/Actions/Dashboard/UpdateDashboard.php`. Use `AsAction`. `handle(Dashboard $dashboard, array $data): Dashboard`. If `$data['is_default']` is true: wrap in transaction — `Dashboard::forUser($dashboard->user_id, $dashboard->workspace_id)->where('is_default', true)->update(['is_default' => false])` then `$dashboard->update(['is_default' => true])`. For name and tiles: `$dashboard->update(Arr::only($data, ['name', 'tiles']))`. Return fresh.

- [ ] T013 Action: `DeleteDashboard`. File: `app/Actions/Dashboard/DeleteDashboard.php`. Use `AsAction`. `handle(Dashboard $dashboard): void`. Count remaining dashboards for user+workspace. If count <= 1: `abort(422, 'Cannot delete the only dashboard.')`. If `$dashboard->is_default`: `abort(422, 'Cannot delete the default dashboard. Set another as default first.')`. Delete.

- [ ] T014 Action: `DuplicateDashboard`. File: `app/Actions/Dashboard/DuplicateDashboard.php`. Use `AsAction`. `handle(Dashboard $source, string $newName): Dashboard`. Create new Dashboard with same user_id, workspace_id, tiles as source, name = $newName, is_default = false. Return new.

- [ ] T015 Action: `GetWidgetCatalogue`. File: `app/Actions/Dashboard/GetWidgetCatalogue.php`. Use `AsAction`. `handle(int $workspaceId): array`. Build static array of widget definitions (id, name, category, description, icon, default_size, min_size, max_size, requires_feature) for all ~40 widgets from spec. For bank accounts: query `BankAccount::where('workspace_id', $workspaceId)->where('is_active', true)->get()` and generate one `bank_{id}` entry per account with the account name. For `ai_insights`: set `requires_feature: 'ai_chatbot'`. For `status_entity_health`: set `requires_feature: 'entity_health_score'`. Return merged array.

- [ ] T016 Action: `MigrateOldLayout`. File: `app/Actions/Dashboard/MigrateOldLayout.php`. Use `AsAction`. `handle(int $userId, int $workspaceId): ?Dashboard`. Find `DashboardLayout::where('user_id', $userId)->where('workspace_id', $workspaceId)->whereNull('migrated_at')->first()`. If null: return null. Read `$old->layout`. Map old widget IDs to new tile positions stacked vertically (y increments by default height): `invoices_owed` → `chart_ar_aging` (w:4,h:3), `bills_to_pay` → `chart_ap_aging` (w:4,h:3), `tasks` → `tasks_attention` (w:4,h:3), `profit_loss_mtd` → `kpi_net_profit_mtd` (w:3,h:2) AND `chart_pnl_trend` (w:6,h:3), `cash_in_out` → `chart_cash_flow` (w:6,h:3), `recent_journal_entries` → `list_recent_journals` (w:6,h:3), `reconciliation_health` → `status_reconciliation` (w:4,h:3), `upcoming_repeating` → `list_upcoming_repeating` (w:4,h:3), `revenue_goal` → `kpi_revenue_mtd` (w:2,h:2), `intray` → skip (already mapped via tasks). Drop `loans` and `fixed_assets`. Map bank account IDs → `bank_{id}` (w:4,h:2). Place tiles in 2-column layout where possible (KPIs side-by-side at y=0, charts below). Create Dashboard record. Stamp `$old->update(['migrated_at' => now()])`. Return Dashboard.

- [ ] T017 [P] Config: `DashboardPresets`. File: `app/Support/DashboardPresets.php`. Static class with `get(string $key): array` returning tile arrays for: `blank` (empty []), `simple` (5 tiles from spec), `advanced` (11 tiles), `bookkeeper` (8 tiles), `business_owner` (7 tiles), `home_default` (4 tiles: home_net_worth_hero 12x2, home_entities 12x3, home_alerts 6x2, home_quick_actions 4x2). Each tile: `['i' => widgetId, 'x' => col, 'y' => row, 'w' => width, 'h' => height, 'minW' => min, 'minH' => min]`.

### 1D: Controllers & Routes

- [ ] T018 Controller: `DashboardGridController`. File: `app/Http/Controllers/Api/DashboardGridController.php`. Methods: `index(Request $request)` → Gate::authorize viewAny, call ListDashboards::run, return DashboardResource collection. `store(StoreDashboardRequest $request)` → CreateDashboard::run, return DashboardResource 201. `show(Request $request, Dashboard $dashboard)` → Gate::authorize view, return DashboardResource. `update(UpdateDashboardRequest $request)` → get dashboard from $request->attributes, UpdateDashboard::run, return DashboardResource. `destroy(Request $request, Dashboard $dashboard)` → Gate::authorize delete, DeleteDashboard::run, return 204. `duplicate(DuplicateDashboardRequest $request, Dashboard $dashboard)` → DuplicateDashboard::run, return DashboardResource 201. `widgetCatalogue(Request $request)` → GetWidgetCatalogue::run, return WidgetDefinitionResource collection.

- [ ] T019 Controller: `HomeDashboardController`. File: `app/Http/Controllers/Api/HomeDashboardController.php`. Same CRUD as DashboardGridController but workspace_id is always NULL. `index`: ListDashboards::run($userId, null). `store`: CreateDashboard::run($userId, null, ...). No widgetCatalogue method (home catalogue is static).

- [ ] T020 Routes: Add to `routes/api.php` inside workspace-scoped middleware group. Entity dashboards: `Route::apiResource('dashboards', DashboardGridController::class)->parameters(['dashboards' => 'dashboard:id'])`. Add `Route::post('dashboards/{dashboard:id}/duplicate', [DashboardGridController::class, 'duplicate'])`. Add `Route::get('dashboard/widget-catalogue', [DashboardGridController::class, 'widgetCatalogue'])`. Home dashboards (auth-only, no workspace middleware): `Route::prefix('home')->group(fn () => Route::apiResource('dashboards', HomeDashboardController::class)->parameters(['dashboards' => 'dashboard:id']))`.

### 1E: Tests

- [ ] T021 Test: `DashboardGridTest`. File: `tests/Feature/Api/DashboardGridTest.php`. Seed RolesAndPermissionsSeeder. Tests: list returns empty-then-auto-created default, create with preset 'simple' returns 5 tiles, create with preset 'advanced' returns 11 tiles, update tiles persists, update is_default atomically switches, delete returns 204, delete last dashboard returns 422, delete default dashboard returns 422, duplicate creates copy with new name, 10-dashboard limit returns 422 on 11th create, widget catalogue includes bank accounts, widget catalogue excludes inactive banks, tiles validation rejects x > 11 and w > 12 and h > 6.

- [ ] T022 Test: `HomeDashboardTest`. File: `tests/Feature/Api/HomeDashboardTest.php`. Tests: home CRUD works without workspace_id header, 3-dashboard limit, home dashboards isolated from workspace dashboards.

- [ ] T023 Test: `DashboardMigrationTest`. File: `tests/Feature/Api/DashboardMigrationTest.php`. Create old DashboardLayout with `['invoices_owed', 'bills_to_pay', 'cash_in_out']` widgets. Call ListDashboards. Assert new Dashboard created with chart_ar_aging, chart_ap_aging, chart_cash_flow tiles. Assert old record has migrated_at set. Assert second call doesn't re-migrate.

---

## Phase 2: Frontend Grid Engine

### 2A: Dependencies & Types

- [ ] T024 Install: `cd frontend && npm install react-grid-layout && npm install -D @types/react-grid-layout`. Verify package.json updated.

- [ ] T025 [P] Types: Create `frontend/src/types/dashboard-grid.ts`. Export types: `TileLayout = { i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number; maxW?: number; maxH?: number; config?: Record<string, unknown> }`. `Dashboard = { id: string; name: string; is_default: boolean; tiles: TileLayout[]; created_at: string; updated_at: string }`. `WidgetDefinition = { id: string; name: string; category: 'kpi' | 'chart' | 'list' | 'status' | 'bank' | 'activity' | 'home'; description: string; icon: string; default_size: { w: number; h: number }; min_size: { w: number; h: number }; max_size: { w: number; h: number }; requires_feature: string | null }`. `WidgetCategory = { key: string; label: string; widgets: WidgetDefinition[] }`.

### 2B: Store & Hooks

- [ ] T026 Store: Create `frontend/src/stores/use-dashboard-grid-store.ts`. Zustand store with: `isEditing: boolean`, `draftTiles: TileLayout[] | null`, `activeDashboardId: string | null`, `libraryOpen: boolean`. Actions: `enterEditMode(tiles: TileLayout[])` → set isEditing true, clone tiles to draftTiles. `exitEditMode()` → set isEditing false, draftTiles null, libraryOpen false. `updateDraftLayout(tiles: TileLayout[])` → set draftTiles. `addTile(tile: TileLayout)` → append to draftTiles. `removeTile(widgetId: string)` → filter from draftTiles. `setActiveDashboard(id: string)` → set activeDashboardId. `toggleLibrary()` → toggle libraryOpen.

- [ ] T027 Hook: Create `frontend/src/hooks/use-dashboards.ts`. Using TanStack Query + `api` client. `useListDashboards()` → GET `/dashboards`, queryKey `['dashboards']`, returns `Dashboard[]`. `useCreateDashboard()` → POST `/dashboards`, mutation, invalidates `['dashboards']`. `useUpdateDashboard()` → PUT `/dashboards/{id}`, mutation, invalidates `['dashboards']`. `useDeleteDashboard()` → DELETE `/dashboards/{id}`, mutation, invalidates `['dashboards']`. `useDuplicateDashboard()` → POST `/dashboards/{id}/duplicate`, mutation, invalidates `['dashboards']`. `useListHomeDashboards()` → GET `/home/dashboards` (no workspace header), queryKey `['home-dashboards']`. `useCreateHomeDashboard()`, `useUpdateHomeDashboard()`, `useDeleteHomeDashboard()` — same pattern for home.

- [ ] T028 [P] Hook: Create `frontend/src/hooks/use-widget-catalogue.ts`. `useWidgetCatalogue()` → GET `/dashboard/widget-catalogue`, queryKey `['widget-catalogue']`, staleTime: 5 minutes, returns `WidgetDefinition[]`. Export helper `groupByCategory(defs: WidgetDefinition[]): WidgetCategory[]` that groups and sorts by category.

### 2C: Grid Components

- [ ] T029 Component: `DashboardGrid.tsx`. File: `frontend/src/components/dashboard/DashboardGrid.tsx`. Import `Responsive, WidthProvider` from `react-grid-layout`. Import RGL CSS (`react-grid-layout/css/styles.css`, `react-resizable/css/styles.css`). `const ResponsiveGridLayout = WidthProvider(Responsive)`. Props: `type Props = { tiles: TileLayout[]; isEditing: boolean; onLayoutChange: (layout: TileLayout[]) => void }`. Render `<ResponsiveGridLayout>` with: `breakpoints={{ xl: 1280, lg: 1024, md: 768, sm: 0 }}`, `cols={{ xl: 12, lg: 8, md: 6, sm: 1 }}`, `rowHeight={80}`, `compactType="vertical"`, `isDraggable={isEditing}`, `isResizable={isEditing}`, `draggableHandle=".drag-handle"`, `onLayoutChange` maps RGL layout items to TileLayout and calls prop. Children: map tiles to `<div key={tile.i} data-grid={tile}>` wrapping `<WidgetTile>` → `<WidgetRenderer>`.

- [ ] T030 Component: `WidgetTile.tsx`. File: `frontend/src/components/dashboard/WidgetTile.tsx`. Props: `type Props = { widgetId: string; isEditing: boolean; onRemove: (id: string) => void; children: React.ReactNode }`. Render shadcn Card with: if isEditing → show drag handle (GripVertical icon with className `drag-handle cursor-grab active:cursor-grabbing`) at top-left, remove button (X icon) at top-right, and a transparent overlay `pointer-events-none` on children to block interaction. Always render children inside `<CardContent className="h-full overflow-hidden p-4">`.

- [ ] T031 Component: `WidgetRenderer.tsx`. File: `frontend/src/components/dashboard/WidgetRenderer.tsx`. Props: `type Props = { widgetId: string; config?: Record<string, unknown> }`. Use a `switch` on widgetId prefix: `kpi_*` → lazy-load from `./widgets/kpi/`, `chart_*` → `./widgets/charts/`, `list_*` → `./widgets/lists/`, `status_*` → `./widgets/status/`, `bank_*` → `./widgets/bank/BankAccountWidget` with `accountId` extracted from `bank_{id}`, `tasks_*` / `activity_*` / `ai_*` → `./widgets/activity/`, `home_*` → `./widgets/home/`. Use `React.lazy()` + `<Suspense fallback={<Skeleton className="h-full w-full" />}>`. Unknown widgetId → render "Unknown widget" Card.

- [ ] T032 Component: `DashboardEditBar.tsx`. File: `frontend/src/components/dashboard/DashboardEditBar.tsx`. Props: `type Props = { isEditing: boolean; onEdit: () => void; onSave: () => void; onCancel: () => void; onAddWidget: () => void }`. When not editing: render `<Button variant="outline" size="sm" onClick={onEdit}>Edit<kbd>E</kbd></Button>`. When editing: render row with `<Button onClick={onAddWidget}>Add Widget</Button>`, spacer, `<Button variant="ghost" onClick={onCancel}>Cancel<kbd>Esc</kbd></Button>`, `<Button onClick={onSave}>Done<kbd>⌘↵</kbd></Button>`.

- [ ] T033 Component: `EmptyDashboard.tsx`. File: `frontend/src/components/dashboard/EmptyDashboard.tsx`. Render centered empty state: LayoutDashboard icon (lucide), "No widgets yet" heading, "Add widgets to build your dashboard" description, `<Button onClick={onAddWidget}>Add Widget</Button>`.

- [ ] T034 Component: `WidgetLibrarySidebar.tsx`. File: `frontend/src/components/dashboard/WidgetLibrarySidebar.tsx`. Use shadcn Sheet (side="right", width ~360px). Props: `type Props = { open: boolean; onOpenChange: (open: boolean) => void; catalogue: WidgetCategory[]; activeTileIds: string[]; onAdd: (def: WidgetDefinition) => void }`. Render: search Input at top, filter catalogue by search. Map categories → collapsible sections. Each widget: Card with icon, name, description, size badge. If `activeTileIds.includes(def.id)` → show "Added" badge (greyed). If `def.requires_feature` and feature not available → show "Upgrade" badge. Else → `<Button size="sm" onClick={() => onAdd(def)}>Add</Button>`.

### 2D: Page Rewrite

- [ ] T035 Page: Rewrite `frontend/src/app/w/[slug]/(dashboard)/dashboard/page.tsx`. Delete existing ~1800-line file. New implementation: `'use client'`. Hooks: `useListDashboards()`, `useUpdateDashboard()`, `useWidgetCatalogue()`. Store: `useDashboardGridStore`. Find active dashboard (by activeDashboardId or first is_default). Render: `<DashboardSwitcher>` (Phase 5 — for now just show dashboard name), `<DashboardEditBar>`, if no tiles → `<EmptyDashboard>`, else `<DashboardGrid tiles={...} isEditing={...}>`. `<WidgetLibrarySidebar>`. Edit mode flow: enterEditMode clones tiles → drag/resize updates draftTiles → Done calls updateDashboard mutation with draftTiles → exitEditMode. Cancel calls exitEditMode (discards draft). Keyboard shortcuts: `Cmd+E` toggle edit, `Escape` cancel, `Cmd+Enter` save.

- [ ] T036 Delete old files: Remove `frontend/src/stores/use-dashboard-edit-store.ts`, `frontend/src/app/w/[slug]/(dashboard)/dashboard/components/widget-grid.tsx`, `frontend/src/app/w/[slug]/(dashboard)/dashboard/components/customise-dashboard-sheet.tsx`, `frontend/src/app/w/[slug]/(dashboard)/dashboard/components/edit-mode-bar.tsx`, `frontend/src/app/w/[slug]/(dashboard)/dashboard/components/edit-mode-onboarding.tsx`. Update any imports that referenced these.

---

## Phase 3: KPI & Chart Widgets

### 3A: Shared Widget Shells

- [ ] T037 Component: `KpiCard.tsx`. File: `frontend/src/components/dashboard/widgets/kpi/KpiCard.tsx`. Props: `type Props = { label: string; value: string; trend?: { direction: 'up' | 'down' | 'flat'; percentage: string }; sparklineData?: number[]; isLoading: boolean; error?: string; onRetry?: () => void }`. Render: shadcn Card, full height. Loading → Skeleton. Error → error message + Retry button. Normal: `<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>`, `<p className="text-2xl font-bold font-mono tabular-nums">{value}</p>`, trend badge (ArrowUp/ArrowDown icon, green/red bg), optional mini sparkline via Recharts LineChart (30px tall, no axes, primary stroke).

- [ ] T038 Component: `ChartCard.tsx`. File: `frontend/src/components/dashboard/widgets/charts/ChartCard.tsx`. Props: `type Props = { title: string; isLoading: boolean; error?: string; onRetry?: () => void; children: React.ReactNode }`. Render: shadcn Card, CardHeader with title (text-sm font-medium), CardContent with `<ResponsiveContainer width="100%" height="100%">` wrapping children. Loading → Skeleton. Error → retry. Use ResizeObserver to trigger re-render key on container size change (forces Recharts to redraw).

- [ ] T039 Component: `ListCard.tsx`. File: `frontend/src/components/dashboard/widgets/lists/ListCard.tsx`. Props: `type Props = { title: string; viewAllHref: string; isLoading: boolean; error?: string; onRetry?: () => void; children: React.ReactNode }`. Render: Card, title in header, children (table) in content, "View all →" Link at bottom. Loading → 5 skeleton rows.

### 3B: KPI Widgets (10)

- [ ] T040 [P] Widget: `KpiCashPosition.tsx`. File: `frontend/src/components/dashboard/widgets/kpi/KpiCashPosition.tsx`. Hook: `useQuery` → GET `/banking/accounts` (existing endpoint), sum all active account balances. Display: "Cash Position", formatted total, no trend (v1). refetchInterval: 60_000.

- [ ] T041 [P] Widget: `KpiRevenueMtd.tsx`. File: `frontend/src/components/dashboard/widgets/kpi/KpiRevenueMtd.tsx`. Hook: `useQuery` → GET `/reports/profit-loss` with current month params (existing endpoint), extract revenue total. Display: "Revenue MTD", formatted amount. refetchInterval: 60_000.

- [ ] T042 [P] Widget: `KpiExpensesMtd.tsx`. Same pattern as T041 but extract expenses total. File: `frontend/src/components/dashboard/widgets/kpi/KpiExpensesMtd.tsx`.

- [ ] T043 [P] Widget: `KpiNetProfitMtd.tsx`. Same pattern, extract net profit. File: `frontend/src/components/dashboard/widgets/kpi/KpiNetProfitMtd.tsx`.

- [ ] T044 [P] Widget: `KpiArOutstanding.tsx`. File: `frontend/src/components/dashboard/widgets/kpi/KpiArOutstanding.tsx`. Hook: `useQuery` → GET `/invoices/aging-summary` (existing endpoint), extract `total_outstanding`. Display: "AR Outstanding". refetchInterval: 60_000.

- [ ] T045 [P] Widget: `KpiApOutstanding.tsx`. Same pattern for bills. File: `frontend/src/components/dashboard/widgets/kpi/KpiApOutstanding.tsx`. Hook: GET `/bills/aging-summary`.

- [ ] T046 [P] Widget: `KpiUnreconciled.tsx`. File: `frontend/src/components/dashboard/widgets/kpi/KpiUnreconciled.tsx`. Hook: GET `/banking/transactions?status=unmatched&per_page=1` (use total from pagination meta). Display: "Unreconciled", count.

- [ ] T047 [P] Widget: `KpiOverdueInvoices.tsx`. File: `frontend/src/components/dashboard/widgets/kpi/KpiOverdueInvoices.tsx`. Hook: GET `/invoices?status=overdue&per_page=1`, extract total count + sum from meta/summary. Display: "Overdue Invoices", count + amount.

- [ ] T048 [P] Widget: `KpiTaxEstimate.tsx`. File: `frontend/src/components/dashboard/widgets/kpi/KpiTaxEstimate.tsx`. Hook: GET `/tax/bas-summary` (if endpoint exists, else show "Coming soon" empty state). Display: "Tax Estimate". refetchInterval: 300_000 (5min — tax data changes slowly).

- [ ] T049 [P] Widget: `KpiNetWorth.tsx`. File: `frontend/src/components/dashboard/widgets/kpi/KpiNetWorth.tsx`. Hook: GET `/consolidation/net-worth` (existing home endpoint — only available in home context). Display: "Net Worth", formatted total. If not in home context, show "Available on home screen" message.

### 3C: Chart Widgets (8)

- [ ] T050 [P] Widget: `ChartCashFlow.tsx`. File: `frontend/src/components/dashboard/widgets/charts/ChartCashFlow.tsx`. Hook: GET `/payments/cash-summary` (existing). Recharts BarChart, grouped bars: cash_in (primary), cash_out (primary/30). X-axis: month labels. Rounded bar corners (radius={[4,4,0,0]}). refetchInterval: 300_000.

- [ ] T051 [P] Widget: `ChartPnlTrend.tsx`. File: `frontend/src/components/dashboard/widgets/charts/ChartPnlTrend.tsx`. Hook: GET `/reports/profit-loss-trend` (may need new endpoint — if not exists, aggregate 6 monthly P&L calls). Recharts AreaChart, revenue line (emerald) + expenses line (red) + net area (primary/10). refetchInterval: 300_000.

- [ ] T052 [P] Widget: `ChartArAging.tsx`. File: `frontend/src/components/dashboard/widgets/charts/ChartArAging.tsx`. Hook: GET `/invoices/aging-summary`. Recharts BarChart, horizontal bars for each bucket (Older, This week, 7-14d, 14-28d, 28d+). Overdue bars in red/amber, upcoming in primary. refetchInterval: 300_000.

- [ ] T053 [P] Widget: `ChartApAging.tsx`. Same pattern as T052 for bills. File: `frontend/src/components/dashboard/widgets/charts/ChartApAging.tsx`. Hook: GET `/bills/aging-summary`.

- [ ] T054 [P] Widget: `ChartRevenueBreakdown.tsx`. File: `frontend/src/components/dashboard/widgets/charts/ChartRevenueBreakdown.tsx`. Hook: GET `/reports/profit-loss` with category breakdown. Recharts PieChart/donut of revenue by account category. Top 5 categories + "Other". refetchInterval: 300_000.

- [ ] T055 [P] Widget: `ChartExpenseBreakdown.tsx`. Same pattern for expenses. File: `frontend/src/components/dashboard/widgets/charts/ChartExpenseBreakdown.tsx`.

- [ ] T056 [P] Widget: `ChartBankBalances.tsx`. File: `frontend/src/components/dashboard/widgets/charts/ChartBankBalances.tsx`. Hook: GET `/banking/balance-trend` (may need new endpoint). Recharts LineChart, one line per bank account. refetchInterval: 300_000. If endpoint doesn't exist, show "Coming soon" empty state.

- [ ] T057 [P] Widget: `ChartBudgetVsActual.tsx`. File: `frontend/src/components/dashboard/widgets/charts/ChartBudgetVsActual.tsx`. Hook: GET `/budgets/comparison` (depends on budget feature). Recharts grouped BarChart: budget vs actual per category. If no budget data, show empty state. refetchInterval: 300_000.

---

## Phase 4: List, Status, Bank & Activity Widgets

### 4A: List Widgets (6)

- [ ] T058 [P] Widget: `ListRecentJournals.tsx`. File: `frontend/src/components/dashboard/widgets/lists/ListRecentJournals.tsx`. Hook: GET `/journal-entries?per_page=10&sort=-created_at`. Render ListCard with compact table: date, reference, description, amount, status badge. viewAllHref: `/w/{slug}/journal-entries`. refetchInterval: 300_000.

- [ ] T059 [P] Widget: `ListOverdueInvoices.tsx`. File: `frontend/src/components/dashboard/widgets/lists/ListOverdueInvoices.tsx`. Hook: GET `/invoices?status=overdue&per_page=10&sort=-due_date`. Table: contact, invoice#, due date, days overdue (red badge), amount. viewAllHref: `/w/{slug}/invoices?status=overdue`.

- [ ] T060 [P] Widget: `ListUpcomingBills.tsx`. File: `frontend/src/components/dashboard/widgets/lists/ListUpcomingBills.tsx`. Hook: GET `/bills?status=approved&per_page=10&sort=due_date` (next 14 days). Table: supplier, bill#, due date, amount. viewAllHref: `/w/{slug}/bills`.

- [ ] T061 [P] Widget: `ListUpcomingRepeating.tsx`. File: `frontend/src/components/dashboard/widgets/lists/ListUpcomingRepeating.tsx`. Hook: GET `/recurring-templates?per_page=5&sort=next_due_date` (existing). Table: template name, frequency, next due, amount. viewAllHref: `/w/{slug}/settings/recurring`.

- [ ] T062 [P] Widget: `ListRecentPayments.tsx`. File: `frontend/src/components/dashboard/widgets/lists/ListRecentPayments.tsx`. Hook: GET `/payments?per_page=10&sort=-payment_date` (existing). Table: date, reference, payee, amount. viewAllHref: `/w/{slug}/payments`.

- [ ] T063 [P] Widget: `ListUnmatchedTxns.tsx`. File: `frontend/src/components/dashboard/widgets/lists/ListUnmatchedTxns.tsx`. Hook: GET `/banking/transactions?status=unmatched&per_page=10`. Table: date, description, amount, bank account. viewAllHref: `/w/{slug}/banking/transactions?status=unmatched`.

### 4B: Status Widgets (4)

- [ ] T064 [P] Widget: `StatusReconciliation.tsx`. File: `frontend/src/components/dashboard/widgets/status/StatusReconciliation.tsx`. Hook: GET `/banking/accounts` (existing). For each active account: calculate reconciled % from `reconciled_balance / current_balance`. Render: Card with list of accounts, each with name + Progress bar (shadcn Progress component). Green if > 90%, amber if 50-90%, red if < 50%.

- [ ] T065 [P] Widget: `StatusPeriod.tsx`. File: `frontend/src/components/dashboard/widgets/status/StatusPeriod.tsx`. Hook: GET `/accounting-periods` (existing). Render: Card with current period highlighted, status badges (Open/Closed/Locked). Show last 6 periods.

- [ ] T066 [P] Widget: `StatusCompliance.tsx`. File: `frontend/src/components/dashboard/widgets/status/StatusCompliance.tsx`. Hook: GET `/tax/obligations` (if exists) or static checklist. Render: Card with upcoming BAS/IAS due dates, lodgement status, next action.

- [ ] T067 [P] Widget: `StatusEntityHealth.tsx`. File: `frontend/src/components/dashboard/widgets/status/StatusEntityHealth.tsx`. Hook: GET `/entity-health-score` (depends on 051-EHS epic). If endpoint exists: render score ring (0-100) with colour gradient. If not: render "Coming soon" empty state.

### 4C: Bank & Activity Widgets (5)

- [ ] T068 [P] Widget: `BankAccountWidget.tsx`. File: `frontend/src/components/dashboard/widgets/bank/BankAccountWidget.tsx`. Props: `type Props = { accountId: string }`. Hook: GET `/banking/accounts/{accountId}` (existing). Render: Card with account name, masked number (text-xs muted), current balance (font-mono text-xl), last transaction date, reconciliation % (Progress bar), "Reconcile" Button linking to `/w/{slug}/banking/transactions?account={id}`.

- [ ] T069 [P] Widget: `TasksAttention.tsx`. File: `frontend/src/components/dashboard/widgets/activity/TasksAttention.tsx`. Hook: GET `/intray?per_page=10` (existing). Render: ListCard with items needing attention: overdue invoices, unreconciled txns, pending approvals. Each with icon, description, action link.

- [ ] T070 [P] Widget: `TasksMyTasks.tsx`. File: `frontend/src/components/dashboard/widgets/activity/TasksMyTasks.tsx`. Hook: GET `/practice/tasks?assigned_to=me&per_page=10` (existing practice endpoint). Render: ListCard with task name, client, due date, status badge. If not a practice user, show "Practice tasks unavailable" empty state.

- [ ] T071 [P] Widget: `ActivityFeed.tsx`. File: `frontend/src/components/dashboard/widgets/activity/ActivityFeed.tsx`. Hook: GET `/activity-feed?per_page=10` (depends on 055-ACF epic). If endpoint exists: render timeline-style feed with avatar, action, timestamp. If not: show "Coming soon" empty state.

- [ ] T072 [P] Widget: `AiInsights.tsx`. File: `frontend/src/components/dashboard/widgets/activity/AiInsights.tsx`. Hook: GET `/ai/insights` (depends on AI chatbot). If available: render 3-5 AI-generated financial observations as cards. If not: render "Upgrade to unlock AI Insights" prompt with requires_feature gate.

---

## Phase 5: Dashboard Switcher, Presets, Home Grid & Cleanup

### 5A: Dashboard Switcher & Presets

- [ ] T073 Component: `DashboardSwitcher.tsx`. File: `frontend/src/components/dashboard/DashboardSwitcher.tsx`. Props: `type Props = { dashboards: Dashboard[]; activeDashboardId: string; onSwitch: (id: string) => void; onCreateNew: () => void; onSetDefault: (id: string) => void; onRename: (id: string, name: string) => void; onDuplicate: (id: string) => void; onDelete: (id: string) => void }`. Render: DropdownMenu trigger showing current dashboard name (ChevronDown icon). DropdownMenuContent: list all dashboards with radio indicator for active, each with DropdownMenuSub for context menu (Set as default, Rename, Duplicate, Delete). Delete disabled for last/default dashboard. Separator, then "+ New Dashboard" item.

- [ ] T074 Component: `NewDashboardDialog.tsx`. File: `frontend/src/components/dashboard/NewDashboardDialog.tsx`. Props: `type Props = { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (name: string, preset: string) => void; existingNames: string[] }`. Render: Dialog with input for name (required, max 100, no duplicate names), RadioGroup for preset (Blank, Simple, Advanced, Bookkeeper, Business Owner) each with mini grid thumbnail (pure CSS 12-col visual), "Create" Button.

- [ ] T075 [P] Config: `presets.ts`. File: `frontend/src/components/dashboard/presets.ts`. Export `DASHBOARD_PRESETS` — record mapping preset key to `{ name: string; tiles: TileLayout[] }` matching the exact tile positions from spec.md (Simple: 5 tiles, Advanced: 11 tiles, Bookkeeper: 8 tiles, BusinessOwner: 7 tiles). Also export `HOME_DEFAULT_PRESET: TileLayout[]` with home_net_worth_hero, home_entities, home_alerts, home_quick_actions.

### 5B: Home Grid

- [ ] T076 [P] Component: `HomeEntities.tsx`. File: `frontend/src/components/dashboard/widgets/home/HomeEntities.tsx`. Hook: `useWorkspaces()` (existing). Render: grid of workspace cards (reuse existing design from home page — entity icon, name, net position, assets, liabilities). Clickable to enter workspace.

- [ ] T077 [P] Component: `HomeNetWorthHero.tsx`. File: `frontend/src/components/dashboard/widgets/home/HomeNetWorthHero.tsx`. Hook: `useMyNetWorthDetail()` (existing). Render: large net worth figure (font-mono text-4xl), assets/liabilities breakdown, sparkline trend. Reuse visual logic from existing home page hero section.

- [ ] T078 [P] Component: `HomeAlerts.tsx`. File: `frontend/src/components/dashboard/widgets/home/HomeAlerts.tsx`. Hook: `useHomeSummary()` (existing). Render: stat chips for overdue invoices, outstanding bills, pending approvals, unreconciled txns (reuse existing colorMap pattern).

- [ ] T079 [P] Component: `HomeQuickActions.tsx`. File: `frontend/src/components/dashboard/widgets/home/HomeQuickActions.tsx`. Render: 4 action buttons — New Invoice, New Bill, New Journal Entry, New Contact. Each links to the default workspace's creation page.

- [ ] T080 Page: Modify `frontend/src/app/(home)/home/page.tsx`. Keep the welcome header section (avatar, greeting, date, practice portal button, sign out). Replace everything below the welcome section with: `useListHomeDashboards()`, `<DashboardSwitcher>`, `<DashboardEditBar>`, `<DashboardGrid>` using home dashboard tiles. Home widget library only shows `home_*` category. First visit auto-creates default home dashboard with `HOME_DEFAULT_PRESET`.

### 5C: Keyboard Shortcuts

- [ ] T081 Keyboard: Add shortcuts to entity dashboard page. Use `useHotkeys` from `react-hotkeys-hook`. `mod+e` → toggle edit mode (only fires outside inputs). `escape` → cancel edit mode. `mod+enter` → save and exit edit mode. Add these to the `?` keyboard shortcut help overlay in `frontend/src/components/layout/keyboard-shortcuts-overlay.tsx`.

### 5D: Cleanup

- [ ] T082 Delete: Remove `frontend/src/types/dashboard.ts` (replaced by `dashboard-grid.ts`). Update all imports across codebase that referenced old types. Check `frontend/src/hooks/use-dashboard-layout.ts` — if no longer used, delete it.

- [ ] T083 Update: Modify `frontend/src/app/w/[slug]/(dashboard)/layout.tsx` if it references old dashboard edit store or components. Ensure sidebar still works. Verify workspace context flows correctly to dashboard page.

### 5E: Browser Tests

- [ ] T084 Test: `tests/Browser/DashboardGridTest.php`. Tests: login → navigate to dashboard → verify grid renders with default preset tiles. Enter edit mode (click Edit button) → verify drag handles visible. Add a widget from library → verify it appears on grid. Click Done → refresh → verify layout persisted. Click Cancel → verify layout reverted. Create new dashboard → verify it appears in switcher. Switch dashboards → verify different layouts load. Responsive: resize viewport to 600px → verify single-column stack.
