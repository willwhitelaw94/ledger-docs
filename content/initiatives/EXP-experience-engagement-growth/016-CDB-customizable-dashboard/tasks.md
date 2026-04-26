---
title: "Implementation Tasks: Customizable Dashboard (016-CDB)"
---

# Implementation Tasks: Customizable Dashboard (016-CDB)

**Mode**: AI agent | **Plan**: [plan.md](/initiatives/FL-financial-ledger/016-CDB-customizable-dashboard/plan.md) | **Date**: 2026-03-14

---

## Phase 1 — Foundation: Migration + Model + Policy

- [X] T001 Migration: create `database/migrations/2026_03_14_100001_create_dashboard_layouts_table.php` — `Schema::create('dashboard_layouts', fn(Blueprint $table) => [$table->id(), $table->foreignId('workspace_id')->constrained()->cascadeOnDelete(), $table->foreignId('user_id')->constrained()->cascadeOnDelete(), $table->json('layout')->nullable(), $table->boolean('onboarding_dismissed')->default(false), $table->timestamps(), $table->unique(['workspace_id', 'user_id'])])`. Run `php artisan migrate`.

- [X] T002 Model: create `app/Models/Tenant/DashboardLayout.php` — namespace `App\Models\Tenant`, extends `Model`, `$fillable = ['workspace_id', 'user_id', 'layout', 'onboarding_dismissed']`, `$casts = ['layout' => 'array', 'onboarding_dismissed' => 'boolean']`. No global scope needed (queried always by workspace_id + user_id pair). Add `@property array|null $layout` and `@property bool $onboarding_dismissed` PHPDoc.

- [X] T003 [P] Policy: create `app/Policies/DashboardLayoutPolicy.php` — namespace `App\Policies`, methods: `viewAny(User $user): bool` returns `true` (all authenticated workspace users), `view(User $user, DashboardLayout $layout): bool` returns `$layout->user_id === $user->id`, `create(User $user): bool` returns `true`, `update(User $user, DashboardLayout $layout): bool` returns `$layout->user_id === $user->id`. No permission-based checks — layout is a personal preference, not a financial action.

---

## Phase 2 — Backend: Actions + Resources + Controller + Routes

- [X] T004 [P] Action: create `app/Actions/Dashboard/GetDashboardLayout.php` — `use AsAction`. `handle(int $workspaceId, int $userId): array`. Fetch `DashboardLayout::where('workspace_id', $workspaceId)->where('user_id', $userId)->first()`. Fetch active bank accounts: `BankAccount::where('workspace_id', $workspaceId)->where('is_active', true)->get()`. Build response: if no saved layout, return default (all bank accounts visible in natural order, all 7 widget IDs visible in default order: `['invoices_owed','bills_to_pay','tasks','profit_loss_mtd','cash_in_out','recent_journal_entries','reconciliation_health']`). If saved, merge saved bank_accounts array (preserving order + visibility) with live bank account list — new accounts not in saved layout default to visible appended at end; orphaned UUIDs silently dropped. Return shape: `['bank_accounts' => [...], 'widgets' => [...], 'onboarding_dismissed' => bool]`.

- [X] T005 [P] Action: create `app/Actions/Dashboard/SaveDashboardLayout.php` — `use AsAction`. `handle(int $workspaceId, int $userId, array $bankAccounts, array $widgets, bool $onboardingDismissed): DashboardLayout`. Use `DashboardLayout::updateOrCreate(['workspace_id' => $workspaceId, 'user_id' => $userId], ['layout' => ['bank_accounts' => $bankAccounts, 'widgets' => $widgets], 'onboarding_dismissed' => $onboardingDismissed])`. Return the model.

- [X] T006 [P] Action: create `app/Actions/Dashboard/GetCashSummary.php` — `use AsAction`. `handle(int $workspaceId): array`. Query `Payment` model: for each of the last 6 calendar months (from start of month 5 months ago to end of current month), sum `amount` where `type = 'receipt'` (cash_in) and `type = 'payment'` (cash_out) grouped by month. Use `DB::table('payments')->where('workspace_id', $workspaceId)->whereIn('type', ['receipt','payment'])->where('payment_date', '>=', now()->subMonths(5)->startOfMonth())->selectRaw("strftime('%Y-%m', payment_date) as month, type, SUM(amount) as total")->groupBy('month','type')->get()`. Pivot into array of `['month' => '2025-10', 'label' => 'Oct', 'cash_in' => int, 'cash_out' => int]` for all 6 months (fill 0 for months with no data). Return array sorted oldest → newest.

- [X] T007 Resource: create `app/Http/Resources/DashboardLayoutResource.php` — extends `JsonResource`. `toArray()` returns `['bank_accounts' => $this->resource['bank_accounts'], 'widgets' => $this->resource['widgets'], 'onboarding_dismissed' => $this->resource['onboarding_dismissed']]`. Note: resource wraps the array returned by `GetDashboardLayout`, not the model directly.

- [X] T008 [P] Resource: create `app/Http/Resources/CashSummaryResource.php` — extends `JsonResource`. `toArray()` returns `['month' => $this->resource['month'], 'label' => $this->resource['label'], 'cash_in' => $this->resource['cash_in'], 'cash_out' => $this->resource['cash_out']]`.

- [X] T009 Controller: create `app/Http/Controllers/Api/DashboardController.php` — namespace `App\Http\Controllers\Api`, extends `Controller`. Two methods:
  1. `layout(Request $request): JsonResponse` — `Gate::authorize('viewAny', DashboardLayout::class)`, call `GetDashboardLayout::run($request->integer('workspace_id'), $request->user()->id)`, return `response()->json(['data' => new DashboardLayoutResource($result)])`.
  2. `saveLayout(Request $request): JsonResponse` — `Gate::authorize('create', DashboardLayout::class)`, validate `['bank_accounts' => 'array', 'bank_accounts.*' => 'string', 'widgets' => 'array', 'widgets.*' => 'string', 'onboarding_dismissed' => 'boolean']`, call `SaveDashboardLayout::run($request->integer('workspace_id'), $request->user()->id, $request->input('bank_accounts', []), $request->input('widgets', []), $request->boolean('onboarding_dismissed'))`, return `response()->json(['data' => new DashboardLayoutResource(GetDashboardLayout::run(...))])`.
  3. `cashSummary(Request $request): JsonResponse` — `abort_if(!$request->user()->hasPermissionTo('journal_entry.view'), 403)`, call `GetCashSummary::run($request->integer('workspace_id'))`, return `response()->json(['data' => CashSummaryResource::collection(collect($result))])`.

- [X] T010 Register policy: in `app/Providers/AppServiceProvider.php` `boot()` method, add `Gate::policy(DashboardLayout::class, DashboardLayoutPolicy::class)` following existing pattern.

- [X] T011 Routes: in `routes/api.php` inside the workspace-scoped middleware group, add:
  ```
  Route::get('dashboard/layout', [DashboardController::class, 'layout']);
  Route::put('dashboard/layout', [DashboardController::class, 'saveLayout']);
  Route::get('payments/cash-summary', [DashboardController::class, 'cashSummary']);
  ```
  Add `DashboardController` import.

- [X] T012 Extend `InvoiceController::aging()`: in `app/Http/Controllers/Api/InvoiceController.php`, after the existing `$invoices` query, add a branch: `if ($request->input('view') === 'dashboard') { return $this->agingDashboardSummary($invoices); }`. Add private method `agingDashboardSummary(Collection $invoices): JsonResponse` — compute buckets keyed `older`, `this_week`, `next_7_14_days`, `next_14_28_days`, `from_28_days` based on `$invoice->due_date` relative to `now()`. Bucket logic: `older` = due_date < today (overdue), `this_week` = due within 0–7 days, `next_7_14_days` = 7–14 days, `next_14_28_days` = 14–28 days, `from_28_days` = >28 days. Return `response()->json(['summary' => $buckets, 'total_outstanding' => array_sum($buckets)])`.

- [X] T013 Extend `BillController::aging()`: same as T012 but in `app/Http/Controllers/Api/BillController.php`. Identical bucket logic applied to bills with `amount_due > 0` and status in `['sent','partially_paid','overdue']`.

---

## Phase 3 — Tests

- [X] T014 Feature test: create `tests/Feature/Api/DashboardLayoutApiTest.php` using Pest. Seed `RolesAndPermissionsSeeder`, create user + workspace + assign owner role. `wsHeaders = ['X-Workspace-Id' => $workspace->id]`. Test cases:
  1. `GET dashboard/layout` returns default layout (7 widgets visible, bank accounts from workspace) when no saved layout exists.
  2. `PUT dashboard/layout` with `{bank_accounts: ['uuid1'], widgets: ['tasks','invoices_owed'], onboarding_dismissed: true}` returns 200 and subsequent `GET` returns saved layout.
  3. Per-user isolation — User B's `PUT` does not change User A's layout.
  4. `GET dashboard/layout` with a new bank account added after layout was saved — new account appears as visible in the response.
  5. `GET invoices/aging?view=dashboard` returns shape with keys `older, this_week, next_7_14_days, next_14_28_days, from_28_days`.
  6. `GET bills/aging?view=dashboard` returns same shape for AP.
  7. `GET payments/cash-summary` returns array of 6 months with `cash_in` and `cash_out` keys.

---

## Phase 4 — Frontend: Types + Dependencies + Hooks + Store

- [X] T015 [P] TypeScript types: create `frontend/src/types/dashboard.ts` — export `WidgetId` union type (7 values: `'invoices_owed' | 'bills_to_pay' | 'tasks' | 'profit_loss_mtd' | 'cash_in_out' | 'recent_journal_entries' | 'reconciliation_health'`), `BankAccountSlot` type (`id: string; name: string; masked: string | null; visible: boolean`), `WidgetSlot` type (`id: WidgetId; visible: boolean`), `DashboardLayout` type (`bank_accounts: BankAccountSlot[]; widgets: WidgetSlot[]; onboarding_dismissed: boolean`), `AgingSummary` type (`summary: { older: number; this_week: number; next_7_14_days: number; next_14_28_days: number; from_28_days: number }; total_outstanding: number`), `CashSummaryMonth` type (`month: string; label: string; cash_in: number; cash_out: number`).

- [X] T016 Install deps: run `cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` and verify no peer dep conflicts.

- [X] T017 [P] Hook: create `frontend/src/hooks/use-dashboard-layout.ts` — `'use client'`. Export `useGetLayout()`: `useQuery({ queryKey: ['dashboard-layout'], queryFn: () => api.get<{ data: DashboardLayout }>('/dashboard/layout').then(r => r.data.data) })`. Export `useSaveLayout()`: `useMutation({ mutationFn: (layout: { bank_accounts: string[]; widgets: WidgetId[]; onboarding_dismissed: boolean }) => api.put('/dashboard/layout', layout), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard-layout'] }) })`. Use the existing `api` axios instance from `@/lib/api`.

- [X] T018 [P] Zustand store: create `frontend/src/stores/use-dashboard-edit-store.ts` — `'use client'`. `import { create } from 'zustand'`. State shape: `isEditing: boolean`, `draftLayout: DashboardLayout | null`. Actions: `enterEditMode: (currentLayout: DashboardLayout) => void` — sets `isEditing: true`, `draftLayout: structuredClone(currentLayout)`; `exitEditMode: () => void` — sets `isEditing: false`, `draftLayout: null`; `toggleWidgetVisibility: (widgetId: WidgetId) => void` — toggles `visible` on matching widget in `draftLayout.widgets`; `toggleBankAccountVisibility: (accountId: string) => void` — toggles `visible` on matching account in `draftLayout.bank_accounts`; `reorderWidgets: (activeId: WidgetId, overId: WidgetId) => void` — moves active widget to position of over widget in `draftLayout.widgets` (only affects visible widgets order); `dismissOnboarding: () => void` — sets `draftLayout.onboarding_dismissed: true`.

---

## Phase 5 — Frontend: Edit Mode UI (US1, US2, US3, US5)

- [X] T019 [US1] Edit mode bar: create `frontend/src/app/(dashboard)/dashboard/components/edit-mode-bar.tsx` — `'use client'`. Props: none (reads from store). When `isEditing = false`: render `<Button variant="outline" size="sm" onClick={enterEditMode}>Edit dashboard</Button>` aligned to top-right of PageContainer header area. When `isEditing = true`: render a bar with `<Button onClick={handleDone}>Done</Button>` and `<Button variant="ghost" onClick={handleCancel}>Cancel</Button>` and `<Button variant="outline" onClick={() => setAddWidgetOpen(true)}><Plus /> Add widget</Button>`. `handleDone` calls `useSaveLayout` mutation with `{ bank_accounts: draftLayout.bank_accounts.filter(b => b.visible).map(b => b.id), widgets: draftLayout.widgets.filter(w => w.visible).map(w => w.id), onboarding_dismissed: draftLayout.onboarding_dismissed }`, then `exitEditMode()`. `handleCancel` calls `exitEditMode()`.

- [X] T020 [US2] Add widget panel: create `frontend/src/app/(dashboard)/dashboard/components/add-widget-panel.tsx` — `'use client'`. Props: `open: boolean; onClose: () => void`. Renders a `<Sheet>` (from `@/components/ui/sheet`). Two sections: **Bank accounts** — for each `BankAccountSlot` in `draftLayout?.bank_accounts`, render a row with account name + masked number + `<Switch checked={account.visible} onCheckedChange={() => toggleBankAccountVisibility(account.id)} />`. **Widgets** — for each `WidgetSlot` in `draftLayout?.widgets`, render a row with widget display name (map from ID to label: `invoices_owed` → "Invoices owed to you", etc.) + `<Switch checked={widget.visible} onCheckedChange={() => toggleWidgetVisibility(widget.id)} />`. Footer: `<Button onClick={onClose}>Done</Button>`.

- [X] T021 [US3] Widget grid with DnD: create `frontend/src/app/(dashboard)/dashboard/components/widget-grid.tsx` — `'use client'`. Props: `children: React.ReactNode; widgetIds: WidgetId[]; isEditing: boolean`. Uses `DndContext` from `@dnd-kit/core` and `SortableContext`, `useSortable` from `@dnd-kit/sortable`. `onDragEnd` handler calls `reorderWidgets(activeId, overId)` from store. When `isEditing = false`, render children without drag wrapper. When `isEditing = true`, wrap each child in a sortable item that shows a `<GripVertical>` handle. The drag handle is the only trigger (`activator: useSortable({ handle: true })`).

- [X] T022 [US5] Onboarding panel: create `frontend/src/app/(dashboard)/dashboard/components/edit-mode-onboarding.tsx` — `'use client'`. Props: `visible: boolean; onDismiss: () => void`. Renders a card/banner only when `visible = true` AND `isEditing = true` AND `!draftLayout?.onboarding_dismissed`. Content: heading "How it works", body "Make the experience your own by adding, removing, and reordering widgets. Your layout is saved to your account." Dismiss button calls `dismissOnboarding()` from store and `onDismiss()`. Do NOT show after dismissed (`onboarding_dismissed = true` in layout).

- [X] T023 [US1,US2,US3] Wire `page.tsx`: update `frontend/src/app/(dashboard)/dashboard/page.tsx`. Add `const { data: layout, isLoading: layoutLoading } = useGetLayout()`. Add `const { isEditing, draftLayout, enterEditMode } = useDashboardEditStore()`. `activeLayout = isEditing ? draftLayout : layout`. Render bank account cards only for `activeLayout.bank_accounts.filter(b => b.visible)`. Render non-bank widgets using `<WidgetGrid widgetIds={visibleWidgets} isEditing={isEditing}>` where `visibleWidgets = activeLayout.widgets.filter(w => w.visible).map(w => w.id)`. Map each widget ID to its component. Wrap page header with `<EditModeBar>`. Pass `onboarding_dismissed` to `<EditModeOnboarding>`. Apply `pointer-events-none select-none opacity-90` to widget cards when `isEditing = true` (non-interactive in edit mode).

---

## Phase 6 — Frontend: Chart Enhancements (US4)

- [X] T024 [P] Aging bar chart: create `frontend/src/app/(dashboard)/dashboard/components/charts/aging-bar-chart.tsx` — `'use client'`. Props: `data: AgingSummary; isLoading: boolean`. Use Recharts `<BarChart>` (same import pattern as P&L card). X-axis labels: `['Older', 'This week', '7–14 days', '14–28 days', '28+ days']`. Single `<Bar dataKey="amount" fill="var(--color-primary)" radius={[4,4,0,0]}>`. Overdue bucket (`older`) uses `fill="var(--color-destructive)"`. Format Y-axis with `formatMoneyCompact`. Show `<Skeleton>` when loading.

- [X] T025 [P] Cash flow chart: create `frontend/src/app/(dashboard)/dashboard/components/charts/cash-flow-chart.tsx` — `'use client'`. Props: `data: CashSummaryMonth[]; isLoading: boolean`. Use Recharts `<BarChart>` with two `<Bar>` components: `cash_in` (primary/green fill) and `cash_out` (destructive/red fill). X-axis: `month.label`. Grouped bars (`layout="vertical"` or default grouped). Format Y-axis with `formatMoneyCompact`. Legend showing "Cash in" / "Cash out". Show `<Skeleton>` when loading.

- [X] T026 [US4] Update `InvoicesOwedCard`: in `frontend/src/app/(dashboard)/dashboard/page.tsx` (or inline component), add `const { data: arAging, isLoading: agingLoading } = useQuery({ queryKey: ['invoices-aging-dashboard'], queryFn: () => api.get<AgingSummary>('/invoices/aging?view=dashboard').then(r => r.data) })`. Render `<AgingBarChart data={arAging} isLoading={agingLoading} />` below the outstanding total in `InvoicesOwedCard`. Keep existing total/count/overdue rows above the chart.

- [X] T027 [US4] Update `BillsToPayCard`: same pattern as T026 but `queryKey: ['bills-aging-dashboard']`, endpoint `/bills/aging?view=dashboard`. Render `<AgingBarChart>` inside `BillsToPayCard`.

- [X] T028 [US4] Add `CashInOutCard` widget: in `frontend/src/app/(dashboard)/dashboard/page.tsx`, add `const { data: cashSummary, isLoading: cashLoading } = useQuery({ queryKey: ['cash-summary'], queryFn: () => api.get<{ data: CashSummaryMonth[] }>('/payments/cash-summary').then(r => r.data.data) })`. Create `CashInOutCard` component in-file or as separate file — `<Card>` with header "Cash in and out · Last 6 months", renders `<CashFlowChart data={cashSummary} isLoading={cashLoading} />`. Wire into widget grid under ID `cash_in_out`. Remove the existing stub/placeholder if present.

---

## Phase 7 — Polish + Quality

- [X] T029 [P] Run `vendor/bin/pint --dirty` and fix any formatting issues in modified PHP files.

- [X] T030 [P] Run `php artisan test --compact` — all existing 232+ tests must pass. Fix any regressions.

- [X] T031 Verify TypeScript: run `cd frontend && npx tsc --noEmit` — zero type errors. Fix any `any` types or missing type annotations in new files.
