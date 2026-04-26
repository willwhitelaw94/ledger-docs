---
title: "Implementation Tasks: Platform Pulse"
---

# Implementation Tasks: Platform Pulse

**Spec**: [./spec.md](./spec.md)
**Plan**: [./plan.md](./plan.md)
**Mode**: AI
**Created**: 2026-04-19

Legend: `[P]` = parallelisable (no dependency on prior task). `[US1]` = user story 1 (Ticker). `[US2]` = Geographic Map. `[US3]` = Account Graph.

---

## Phase 1: Foundation (blocks all stories)

- [ ] T001 Migration: `create_platform_metrics_table` — columns: `id`, `metric_key` (string, unique), `value_cents` (bigInteger), `currency` (char(3), default 'AUD'), `computation_rule` (text), `excluded_workspace_count` (integer, default 0), `refreshed_at` (timestamp, nullable), timestamps. File: `database/migrations/2026_04_19_000001_create_platform_metrics_table.php`
- [ ] T002 [P] Migration: `create_platform_metrics_history_table` — columns: `id`, `metric_key` (string), `snapshot_date` (date), `value_cents` (bigInteger), `currency` (char(3)), timestamps. Unique index on `(metric_key, snapshot_date)`. Index on `(metric_key, snapshot_date DESC)`. File: `database/migrations/2026_04_19_000002_create_platform_metrics_history_table.php`
- [ ] T003 [P] Migration: `create_platform_settings_table` — columns: `id`, `key` (string, unique), `value` (jsonb on pgsql, json on sqlite), `updated_by_user_id` (foreignId, nullable, constrained on users), timestamps. File: `database/migrations/2026_04_19_000003_create_platform_settings_table.php`
- [ ] T004 [P] Model: `PlatformMetric` (Central) — `$fillable`: metric_key, value_cents, currency, computation_rule, excluded_workspace_count, refreshed_at. `$casts`: value_cents int, excluded_workspace_count int, refreshed_at datetime. File: `app/Models/Central/PlatformMetric.php`
- [ ] T005 [P] Model: `PlatformMetricHistory` (Central) — `$fillable`: metric_key, snapshot_date, value_cents, currency. `$casts`: value_cents int, snapshot_date date. File: `app/Models/Central/PlatformMetricHistory.php`
- [ ] T006 [P] Model: `PlatformSetting` (Central) — `$fillable`: key, value, updated_by_user_id. `$casts`: value array. Static helper `get(string $key, $default = null)` and `set(string $key, $value, int $userId)`. File: `app/Models/Central/PlatformSetting.php`
- [ ] T007 Seeder: `PlatformSettingsSeeder` — seeds `target.aul` = 100_000_000_000 (cents = $1B) and `target.monthly_transaction_flow` = 10_000_000_000 (cents = $100M). Register in `DatabaseSeeder`. File: `database/seeders/PlatformSettingsSeeder.php`
- [ ] T008 Seeder: `PlatformMetricsSeeder` — inserts two rows: `aul` and `monthly_transaction_flow` both with value_cents=0, refreshed_at=null. Register in `DatabaseSeeder` after PlatformSettingsSeeder. File: `database/seeders/PlatformMetricsSeeder.php`

## Phase 2: Backend Actions (blocks controllers)

- [ ] T010 [P] [US1] Action: `ComputeAul` using `AsAction` — sums `account_balances.balance` WHERE `balance > 0` AND the joined `chart_accounts.account_type` = 'asset', joined across all workspaces. Uses `DB::table()` to bypass tenant scope. Converts non-AUD workspaces to AUD via latest `exchange_rates` row; excludes workspaces with no rate. Returns `['value_cents' => int, 'excluded_workspace_count' => int, 'computation_rule' => string]`. File: `app/Actions/Admin/PlatformPulse/ComputeAul.php`
- [ ] T011 [P] [US1] Action: `ComputeTransactionFlow` using `AsAction` — sums absolute debit amounts from `journal_entry_lines` WHERE parent `journal_entries.posted_at >= now()->subDays(30)` AND `line.direction = 'debit'`. Uses `DB::table()` to bypass tenant scope. FX conversion same as ComputeAul. Returns `['value_cents' => int, 'excluded_workspace_count' => int, 'computation_rule' => string]`. File: `app/Actions/Admin/PlatformPulse/ComputeTransactionFlow.php`
- [ ] T012 [US1] Action: `RefreshPlatformMetrics` using `AsAction` — calls `ComputeAul::run()` and `ComputeTransactionFlow::run()`, upserts rows in `platform_metrics` keyed by `metric_key`, sets `refreshed_at = now()`. Wrapped in DB transaction. File: `app/Actions/Admin/PlatformPulse/RefreshPlatformMetrics.php`
- [ ] T013 [US1] Action: `SnapshotMetricsHistory` using `AsAction` — reads all rows from `platform_metrics`, inserts into `platform_metrics_history` with `snapshot_date = today()`. Uses `updateOrInsert` on unique `(metric_key, snapshot_date)` so re-runs on same day are idempotent. File: `app/Actions/Admin/PlatformPulse/SnapshotMetricsHistory.php`
- [ ] T014 [US1] Action: `GetPulseFeed` using `AsAction` — returns 20 most recent journal entries across all workspaces (ordered `posted_at desc`), eager-loads workspace + organisation. For each: first word of workspace.name truncated to 20 chars, `is_large = abs(total_amount_cents) >= 100_000_000` (i.e., $1M), `amount_cents = is_large ? null : total_amount_cents`, `posted_at`. File: `app/Actions/Admin/PlatformPulse/GetPulseFeed.php`
- [ ] T015 [P] [US2] Action: `BuildPlatformMap` using `AsAction` — queries all workspaces with `Workspace::withoutGlobalScopes()->with('organisation')->get()`. For each: if workspace has full address (street+city+postcode+country), attempt geocoding (use cached geocode column on workspace — skip for MVP, just use country centroid). If only country, look up centroid + deterministic jitter using `crc32(workspace.id) % 100 / 1000` offset. Returns `['pins' => [...], 'no_location' => [...]]`. File: `app/Actions/Admin/PlatformPulse/BuildPlatformMap.php`
- [ ] T016 [P] [US3] Action: `BuildPlatformGraph` using `AsAction` — parameters `['include_accounts' => bool]`. Queries all organisations with workspaces and (optionally) chart accounts. Returns `['nodes' => [{id, type: 'organisation'|'workspace'|'account'|'account_group', label, plan_tier?, child_count}], 'edges' => [{from, to}]]`. If workspace has > 20 chart accounts, emit a single `account_group` node with `child_count = N` instead of individual account nodes. File: `app/Actions/Admin/PlatformPulse/BuildPlatformGraph.php`
- [ ] T017 [P] Static data: country centroid lookup. Populate `database/seeders/data/country_centroids.json` with ISO 3166-1 alpha-2 code → [lat, lng] for the top 20 countries (AU, NZ, US, GB, CA, IN, etc.). Used by `BuildPlatformMap`. File: `database/seeders/data/country_centroids.json`

## Phase 3: Controllers, Requests, Resources, Routes

- [ ] T020 [US1] Form Request: `UpdatePlatformTargetRequest` — `authorize()` returns `$this->user()?->is_super_admin === true`. `rules()`: `key` required string in `['target.aul', 'target.monthly_transaction_flow']`, `value_cents` required integer min:1. File: `app/Http/Requests/Admin/UpdatePlatformTargetRequest.php`
- [ ] T021 [P] API Resource: `PlatformTickerResource` — shape: `aul: { value_cents, target_cents, refreshed_at, history: [{date, value_cents}] }`, `flow: { ... same shape }`, `excluded_workspaces: int`. File: `app/Http/Resources/Admin/PlatformTickerResource.php`
- [ ] T022 [P] API Resource: `PulseFeedResource` — collection shape: `entries: [{workspace_name_first_word, amount_cents|null, posted_at, is_large}]`. File: `app/Http/Resources/Admin/PulseFeedResource.php`
- [ ] T023 [P] API Resource: `PlatformMapResource` — shape: `pins: [...], no_location: [...]`. File: `app/Http/Resources/Admin/PlatformMapResource.php`
- [ ] T024 [P] API Resource: `PlatformGraphResource` — shape: `nodes: [...], edges: [...]`. File: `app/Http/Resources/Admin/PlatformGraphResource.php`
- [ ] T025 Controller: `PlatformPulseController` with methods: `ticker()`, `pulse()`, `updateTargets(UpdatePlatformTargetRequest)`, `map()`, `graph(Request)`. Each delegates to the relevant Action and wraps in the appropriate Resource. File: `app/Http/Controllers/Api/Admin/PlatformPulseController.php`
- [ ] T026 Routes: register 5 routes under `/api/v1/admin/platform-pulse/*` inside the super-admin middleware group in `routes/api.php`: GET ticker, GET pulse, PUT targets, GET map, GET graph. Use `[PlatformPulseController::class, 'method']` signature.

## Phase 4: Scheduler

- [ ] T030 Artisan command: `platform-pulse:refresh-metrics` — signature `platform-pulse:refresh-metrics`, handle() calls `RefreshPlatformMetrics::run()` and logs `refreshed_at` to output. File: `app/Console/Commands/RefreshPlatformMetricsCommand.php`
- [ ] T031 Artisan command: `platform-pulse:snapshot-history` — signature `platform-pulse:snapshot-history`, handle() calls `SnapshotMetricsHistory::run()`. File: `app/Console/Commands/SnapshotPlatformMetricsHistoryCommand.php`
- [ ] T032 Scheduler: in `routes/console.php`, add `Schedule::command('platform-pulse:refresh-metrics')->everyFiveMinutes()->withoutOverlapping()` and `Schedule::command('platform-pulse:snapshot-history')->dailyAt('00:05')->withoutOverlapping()`.

## Phase 5: Frontend — Ticker (US1)

- [ ] T040 [P] [US1] Types: `frontend/src/types/platform-pulse.ts` — export `PlatformTicker`, `PulseFeed`, `PlatformMap`, `PlatformGraph`, `PlatformTarget`. Shapes mirror the API Resources.
- [ ] T041 [P] [US1] Utility: extend `frontend/src/lib/format-money.ts` with `formatMoneyAbbreviated(cents: number): string` returning `$0`, `$1.2K`, `$247M`, `$1.2B` (2 significant figures, K/M/B breakpoints).
- [ ] T042 [P] [US1] Hook: `usePlatformPulseTicker` — TanStack Query against `GET /api/v1/admin/platform-pulse/ticker`, staleTime 5*60_000, refetchInterval 5*60_000. File: `frontend/src/hooks/use-platform-pulse.ts`
- [ ] T043 [P] [US1] Hook: `usePlatformPulsePulse` — same file, refetchInterval 60_000.
- [ ] T044 [P] [US1] Hook: `useUpdatePlatformTarget` — mutation against `PUT /api/v1/admin/platform-pulse/targets`, invalidates `platform-pulse-ticker` on success. Same file.
- [ ] T045 [P] [US1] Component: `MetricOdometer` — props `{ valueCents: number; durationMs?: number }`. Uses `requestAnimationFrame` to count up from 0 to value over `durationMs` (default 1200). If `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, snap to final value immediately. Renders via `formatMoneyAbbreviated`. File: `frontend/src/components/admin/platform-pulse/metric-odometer.tsx`
- [ ] T046 [P] [US1] Component: `MetricSparkline` — props `{ data: Array<{date: string; value_cents: number}> }`. Uses recharts `<AreaChart>` with `var(--primary)` fill. 30-day trend. Height 40px, no axes, no tooltip. File: `frontend/src/components/admin/platform-pulse/metric-sparkline.tsx`
- [ ] T047 [US1] Component: `PlatformPulseTicker` — renders two metric tiles side by side: each tile has label ("Assets Under Ledger" / "Monthly Transaction Flow"), `<MetricOdometer />`, progress bar (using existing `<Progress />`) showing pct of target, `<MetricSparkline />` below, "% of $1B target" helper text. Uses `usePlatformPulseTicker`. Shows skeleton while loading. Shows "N workspaces excluded: no FX rate" warning chip if `excluded_workspaces > 0`. File: `frontend/src/components/admin/platform-pulse/platform-pulse-ticker.tsx`
- [ ] T048 [US1] Component: `PulseFeed` — renders 10 most recent entries vertically. Each: first word of workspace (bold), "posted" (muted), amount via `formatMoneyAbbreviated` OR "a large entry" if `is_large`, relative time via `date-fns` `formatDistanceToNow(..., { addSuffix: true })`. Tooltip on hover shows absolute UTC time. Uses `usePlatformPulsePulse`. File: `frontend/src/components/admin/platform-pulse/pulse-feed.tsx`
- [ ] T049 [US1] Component: `PlatformTargetsModal` — shadcn `<Dialog>` with RHF + Zod form. Two fields: AUL target (dollar input), Flow target (dollar input). Converts to cents on submit. Calls `useUpdatePlatformTarget` for each changed field. File: `frontend/src/components/admin/platform-pulse/platform-targets-modal.tsx`
- [ ] T050 [US1] Wire into admin overview: edit `frontend/src/app/(admin)/admin/page.tsx` to render `<PlatformPulseBand />` (new wrapper composing ticker + pulse + "Edit targets" trigger) above the existing KPI cards. File: `frontend/src/app/(admin)/admin/page.tsx`
- [ ] T051 [US1] Wrapper: `PlatformPulseBand` — horizontal layout: ticker on left (2/3 width), pulse feed on right (1/3 width). "Edit targets" settings icon button top-right opens `PlatformTargetsModal`. File: `frontend/src/components/admin/platform-pulse/platform-pulse-band.tsx`

## Phase 6: Frontend — Map (US2)

- [ ] T060 Install deps: `pnpm add maplibre-gl react-map-gl` in `frontend/`. Add `maplibre-gl/dist/maplibre-gl.css` import to the map component.
- [ ] T061 [P] [US2] Hook: `usePlatformPulseMap` — TanStack Query against `GET /api/v1/admin/platform-pulse/map`, staleTime 5*60_000, no polling. Same file as T042.
- [ ] T062 [US2] Component: `PlatformMap` — renders MapLibre map centred on Australia (lng=134, lat=-25, zoom=3). Uses OpenFreeMap style URL `https://tiles.openfreemap.org/styles/liberty`. Renders one `<Marker>` per pin, colour matched to plan tier via `PLAN_TIER_DOT_COLORS` (from `admin/page.tsx`). Plan-tier filter row above the map (reuses existing tab pattern). Tooltip on marker click with workspace name + org + "Open workspace" link to `/admin/workspaces/${id}`. File: `frontend/src/components/admin/platform-pulse/platform-map.tsx`
- [ ] T063 [US2] Component: `MapNoLocationSidebar` — right-side panel inside `<PlatformMapTabs />` showing the `no_location` list as a compact list of workspace names with plan-tier chips. File: `frontend/src/components/admin/platform-pulse/map-no-location-sidebar.tsx`
- [ ] T064 [US2] Component: `PlatformMapTabs` — tabbed container (Geographic | Graph). Default Geographic. Lives under the ticker on admin overview. File: `frontend/src/components/admin/platform-pulse/platform-map-tabs.tsx`
- [ ] T065 [US2] Wire into admin overview: add `<PlatformMapTabs />` below `<PlatformPulseBand />` in `frontend/src/app/(admin)/admin/page.tsx`.

## Phase 7: Frontend — Graph (US3)

- [ ] T070 Verification: before starting US3, `grep` and `find` for the 071-NOD component in `frontend/src/components/`. If not present, install React Flow (`pnpm add reactflow`) and use it as the fallback renderer. Document choice at top of `platform-graph.tsx`.
- [ ] T071 [P] [US3] Hook: `usePlatformPulseGraph` — TanStack Query against `GET /api/v1/admin/platform-pulse/graph?include_accounts={bool}`. Same file as T042.
- [ ] T072 [US3] Component: `PlatformGraph` — uses 071-NOD if present, else React Flow. Props `{ includeAccounts: boolean }`. Renders nodes with colour by type (org=dark, workspace=plan-tier colour, account=muted). Click a node opens the relevant `/admin` detail page. File: `frontend/src/components/admin/platform-pulse/platform-graph.tsx`
- [ ] T073 [US3] Wire toggle inside `<PlatformMapTabs />` — Graph tab shows `<PlatformGraph />` and a Switch labeled "Show accounts" (default off).

## Phase 8: Tests

- [ ] T080 [P] [US1] Unit test: `ComputeAul` — test with seeded workspaces in multiple currencies, verify exclusion of unconvertible workspaces. File: `tests/Unit/Admin/PlatformPulse/ComputeAulTest.php`
- [ ] T081 [P] [US1] Unit test: `ComputeTransactionFlow` — test trailing-30-day window boundary, verify debit-only summation. File: `tests/Unit/Admin/PlatformPulse/ComputeTransactionFlowTest.php`
- [ ] T082 [P] [US1] Unit test: `GetPulseFeed` — assert first-word truncation, $1M amount suppression. File: `tests/Unit/Admin/PlatformPulse/GetPulseFeedTest.php`
- [ ] T083 [US1] Feature test: `PlatformPulseTickerTest` — GET ticker as super admin (200), as normal user (403), empty platform returns zeros. File: `tests/Feature/Admin/PlatformPulseTickerTest.php`
- [ ] T084 [P] [US1] Feature test: `PlatformPulsePulseTest` — pulse feed shape + ordering. File: `tests/Feature/Admin/PlatformPulsePulseTest.php`
- [ ] T085 [P] [US1] Feature test: `PlatformPulseTargetsTest` — PUT updates setting; rejects unknown key; rejects non-super-admin. File: `tests/Feature/Admin/PlatformPulseTargetsTest.php`
- [ ] T086 [P] [US2] Feature test: `PlatformPulseMapTest` — map endpoint returns pins and no_location lists. File: `tests/Feature/Admin/PlatformPulseMapTest.php`
- [ ] T087 [P] [US3] Feature test: `PlatformPulseGraphTest` — graph endpoint with and without `include_accounts`; account-group summary when > 20 accounts. File: `tests/Feature/Admin/PlatformPulseGraphTest.php`
- [ ] T088 [US1] Browser test: super admin opens /admin, ticker renders with numbers, pulse feed renders, edit-targets modal opens. File: `tests/Browser/PlatformPulseTickerTest.php`

## Phase 9: Polish

- [ ] T090 Pint format: `vendor/bin/pint --dirty`
- [ ] T091 Run full test suite: `php artisan test --compact`
- [ ] T092 Type-check frontend: `cd frontend && pnpm run typecheck` (or `tsc --noEmit`)
- [ ] T093 Manual QA: open `/admin`, verify (a) ticker animates on load (b) `prefers-reduced-motion` disables animation (c) pulse feed shows real entries (d) map renders pins (e) graph tab loads. Document screenshots if meaningful.
- [ ] T094 Update memory: add note that 071-NOD UI status was verified (or React Flow fallback was used).

---

## Summary

- **Total tasks**: 66 (T001–T094 with gaps for grouping)
- **Per story**: US1 Ticker ≈ 30 tasks, US2 Map ≈ 10 tasks, US3 Graph ≈ 5 tasks
- **Parallel opportunities**: 20+ tasks marked [P] can run concurrently within their phase
- **MVP scope (P1 only)**: T001–T014, T020–T026, T030–T032, T040–T051, T080–T085, T088, T090–T094 — ship ticker + pulse without map/graph

---

## Next Steps

User has said "and then build" — proceeding directly to Phase 1. Starting with migrations (T001–T003) and models (T004–T006), then seeders (T007–T008), then moving into Phase 2 backend actions.
