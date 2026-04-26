---
title: "Implementation Tasks: Map Performance & Scale"
---

# Implementation Tasks: Map Performance & Scale

**Spec**: [./spec.md](./spec.md)
**Plan**: [./plan.md](./plan.md)
**Mode**: AI
**Created**: 2026-04-19

Legend: `[P]` = parallelisable (no dependency on prior task). `[US1]`–`[US5]` = user story IDs from spec.md. **Phase A** = ship now (P1). **Phase B** = ship when trigger thresholds hit (P2). **Phase C** = gated on PostGIS infra decision (P3).

---

## Phase A — Client clustering + lean payload + cache (P1)

### A.1 Backend — lean payload + cache + detail + no-location

- [x] T001 [P] [US2] API Resource: `MapPinResource` — lean shape `{ id, slug, lat, lng, plan_tier }`. File: `app/Http/Resources/Admin/MapPinResource.php`
- [x] T002 [P] [US2] API Resource: `WorkspaceMapDetailResource` — full popup shape `{ id, slug, name, org_name, plan_tier, city, state, country, latitude, longitude, location_source }`. File: `app/Http/Resources/Admin/WorkspaceMapDetailResource.php`
- [x] T003 [US1] Modify `BuildPlatformMap::handle()` — return lean shape `{ pins: [...], count: int }` with only `id`, `slug`, `lat`, `lng`, `plan_tier` per pin. Drop `org_name`, `city`, `state`, `country`, `name` from the bulk pin shape. Drop the `no_location` array from this action entirely (moved to new action). Keep existing country-centroid + jitter fallback. Still uses `Workspace::withoutGlobalScopes()`. File: `app/Actions/Admin/PlatformPulse/BuildPlatformMap.php`
- [x] T004 [P] [US2] New action: `GetWorkspaceMapDetail` using `AsAction` — takes `Workspace $workspace`, eager-loads `organisation:id,name,plan_tier`, returns array matching `WorkspaceMapDetailResource`. Includes country-centroid fallback for `location_source`. File: `app/Actions/Admin/PlatformPulse/GetWorkspaceMapDetail.php`
- [x] T005 [P] [US2] New action: `GetNoLocationWorkspaces` using `AsAction` — returns workspaces with null `latitude` or null `longitude`, shape `[{ id, name, org_name, plan_tier, country }]`, eager-loads organisation. Still uses `Workspace::withoutGlobalScopes()`. File: `app/Actions/Admin/PlatformPulse/GetNoLocationWorkspaces.php`
- [x] T006 [US3] Modify `PlatformPulseController::map()` — wrap `BuildPlatformMap::run()` in `Cache::remember($cacheKey, 300, fn() => BuildPlatformMap::run(...))`. Cache key: `'platform-pulse:map:v3:' . md5($request->input('tier', 'all'))`. File: `app/Http/Controllers/Api/Admin/PlatformPulseController.php`
- [x] T007 [US2] Add `PlatformPulseController::workspaceDetail(Workspace $workspace)` — delegates to `GetWorkspaceMapDetail`, wraps in `WorkspaceMapDetailResource`. Same file as T006.
- [x] T008 [US4] Add `PlatformPulseController::noLocation()` — delegates to `GetNoLocationWorkspaces`, returns as plain JSON `{ data: { workspaces: [...] } }`. Same file as T006.
- [x] T009 [US2][US4] Add two routes under the existing `admin` super-admin group in `routes/api.php`:
  - `Route::get('platform-pulse/map/workspace/{workspace}', [PlatformPulseController::class, 'workspaceDetail'])`
  - `Route::get('platform-pulse/map/no-location', [PlatformPulseController::class, 'noLocation'])`
  File: `routes/api.php`

### A.2 Backend — tests

- [x] T010 [P] [US1] Feature test: `PlatformPulseMapLeanPayloadTest` — asserts `/admin/platform-pulse/map` response has only `id`, `slug`, `lat`, `lng`, `plan_tier` per pin (no `name`, `org_name`, `city`, `state`, `country`); asserts `count` field present. File: `tests/Feature/Admin/PlatformPulseMapLeanPayloadTest.php`
- [x] T011 [P] [US3] Feature test: `PlatformPulseMapCacheTest` — calls map endpoint twice, mocks `Cache::shouldReceive('remember')` to assert the closure is only invoked once; asserts cache key differs when `tier` query param differs. File: `tests/Feature/Admin/PlatformPulseMapCacheTest.php`
- [x] T012 [P] [US2] Feature test: `WorkspaceMapDetailTest` — `GET /admin/platform-pulse/map/workspace/{id}` returns full detail for super admin (200), returns 403 for a non-super-admin user, returns 404 for non-existent workspace. File: `tests/Feature/Admin/WorkspaceMapDetailTest.php`
- [x] T013 [P] [US4] Feature test: `NoLocationWorkspacesTest` — seeds a workspace with null lat, asserts it appears in `/map/no-location`; seeds a workspace with lat+lng, asserts it does NOT appear. File: `tests/Feature/Admin/NoLocationWorkspacesTest.php`

### A.3 Frontend — types + hooks

- [x] T020 [P] [US1] Modify `frontend/src/types/platform-pulse.ts`:
  - Change `MapPin` to lean shape: `{ workspace_id: number; slug: string; lat: number; lng: number; plan_tier: string }`. Remove `name`, `org_name`, `city`, `state`, `country`, `location_source` from this type.
  - Add new `WorkspaceMapDetail` type matching `WorkspaceMapDetailResource` shape.
  - Add `PlatformMap` type (wrapping): `{ pins: MapPin[]; count: number }`. (Remove `no_location` from `PlatformMap`.)
  - Add `MapNoLocationResponse` type: `{ workspaces: Array<{ id: number; name: string; org_name: string; plan_tier: string; country: string | null }> }`.
- [x] T021 [US1] Modify `usePlatformPulseMap` hook in `frontend/src/hooks/use-platform-pulse.ts` to match new lean `PlatformMap` response type. Keep `staleTime: 5 * 60 * 1000`, no polling.
- [x] T022 [P] [US2] Add new hook `useWorkspaceMapDetail(workspaceId: number | null)` in the same file. Uses `useQuery` with `enabled: workspaceId !== null`, query key `['platform-pulse', 'map', 'workspace', workspaceId]`, hits `/admin/platform-pulse/map/workspace/{id}`, `staleTime: 10 * 60 * 1000`.
- [x] T023 [P] [US4] Add new hook `useNoLocationWorkspaces(enabled: boolean)` in the same file. Uses `useQuery` with passed-in `enabled` flag (so it fires only when the sidebar is opened). Hits `/admin/platform-pulse/map/no-location`, `staleTime: 5 * 60 * 1000`.

### A.4 Frontend — clustering

- [x] T030 [US1] Modify `frontend/src/components/admin/platform-pulse/platform-map.tsx`:
  - Replace the direct `.map((pin) => <Marker>)` rendering with a conditional cluster-or-individual branch.
  - When `data.count <= 100`: render one `<Marker>` per pin (current behaviour).
  - When `data.count > 100`: initialise a Supercluster instance, load pins as GeoJSON features `{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { pinId, slug, planTier } }`; listen to the map's `onMoveEnd` event to get current `zoom` + `bounds`; call `supercluster.getClusters(bbox, zoom)`; render each returned feature as either a **cluster bubble** (if `properties.cluster === true`) or an **individual pin** (leaf).
  - Cluster bubble: circle with a count label inside, coloured by dominant `plan_tier` (compute on the client by looking up all pins in the cluster via `supercluster.getLeaves(clusterId, Infinity)` — precompute majority tier once on data load and attach to the supercluster point properties to avoid recomputation on every zoom).
  - On cluster click: `map.easeTo({ center: [lng, lat], zoom: supercluster.getClusterExpansionZoom(clusterId) })`.
  - On individual pin click: open popup, trigger `useWorkspaceMapDetail(pinId)`, render popup contents with detail data (show skeleton while loading).
  - Supercluster config: `{ radius: 60, maxZoom: 16, minPoints: 2 }`. Construct once via `useMemo` keyed on `data?.pins` and `data?.count`.
- [x] T031 [P] [US2] Extract the popup body into a small inline component inside `platform-map.tsx` — takes `workspaceId` + `onClose`, uses `useWorkspaceMapDetail`, renders skeleton/error/content states. Keeps the existing "Jump In" button (wired to `useRouter` + `setCurrentWorkspace`).
- [x] T032 [P] [US4] Modify `frontend/src/components/admin/platform-pulse/map-no-location-sidebar.tsx` — replace the direct read of `data.no_location` (no longer in the map response) with `useNoLocationWorkspaces({ enabled: true })`. Pass `enabled` from parent so it only fires when the sidebar is open. Keep the "Jump in" link on each row (fix the old bug — use router + setCurrentWorkspace rather than a stale `/admin/workspaces/{id}` link).
- [x] T033 [US1] Cluster-bubble styling in the same file as T030 — cluster bubble sizes (small/medium/large) based on point count: `<10` = 28px, `<100` = 36px, `<1000` = 44px, `≥1000` = 52px. Inner count text scales accordingly. Use `PLAN_TIER_COLORS` constant (already exported from `platform-map.tsx`).

### A.5 Frontend — tests

- [x] T040 [P] [US1] Browser test: `tests/Browser/Admin/PlatformMapClusteringTest.php`:
  - Seed 150 workspaces with coords scattered across AU.
  - Sign in as super admin, navigate to `/admin/map`.
  - Assert cluster bubbles are visible (look for elements with test id `data-testid="map-cluster"`); assert no individual `data-testid="map-pin"` are visible at the default zoom.
  - Click a cluster; assert map zooms in; assert some clusters split.
- [x] T041 [P] [US1] Browser test: same file, second scenario — seed 50 workspaces. Assert individual pins visible, no clusters.
- [x] T042 [P] [US2] Browser test: same file, third scenario — click a pin; assert popup opens; assert network call to `/admin/platform-pulse/map/workspace/{id}` fired (check via `page()->requests()` if Playwright helper exposes it; otherwise assert popup text contains the workspace's full name which only the detail endpoint can provide).

### A.6 Cleanup

- [x] T050 Remove now-unused fields from `PlatformMap` type and any stale references. Run `vendor/bin/pint --dirty`.
- [x] T051 Run `cd frontend && npx tsc --noEmit` — zero errors in `platform-pulse/` files.
- [x] T052 Run `php artisan test --filter=PlatformPulse` — all green.
- [x] T053 Update `.tc-docs/content/initiatives/FL-financial-ledger/103-MPS-map-performance-scale/meta.yaml` — set `gates.code_quality.passed: true` and `date: 2026-04-19` after T051+T052 pass.

---

## Phase B — Bbox-viewport API + server clustering (P2 — DO NOT START UNTIL TRIGGERS HIT)

**Start triggers (from plan.md):**
- [ ] Pin count exceeds 20,000 across the platform, OR
- [ ] Client-side clustering CPU exceeds 100 ms in profiling, OR
- [ ] `/admin/platform-pulse/map` response exceeds 500 KB

### B.1 Backend — bbox + cells

- [ ] T100 Migration: `create_platform_map_cells_table` — columns: `id`, `grid_level` (smallInteger), `grid_id` (string), `plan_tier` (string, nullable), `centroid_lat` (decimal(9,6)), `centroid_lng` (decimal(9,6)), `bounds_sw_lat`, `bounds_sw_lng`, `bounds_ne_lat`, `bounds_ne_lng` (all decimal(9,6)), `pin_count` (integer), `refreshed_at` (timestamp), timestamps. Unique index on `(grid_level, grid_id, plan_tier)`. Index on `(grid_level, plan_tier)`. File: `database/migrations/YYYY_MM_DD_create_platform_map_cells_table.php`
- [ ] T101 [P] Model: `PlatformMapCell` (Central) — `$fillable` matches migration columns; `$casts`: all decimals cast to float, `refreshed_at` to datetime. File: `app/Models/Central/PlatformMapCell.php`
- [ ] T102 [P] New action: `AggregatePlatformMapCells` using `AsAction` — reads all workspaces with `withoutGlobalScopes()`, computes quadtree cell assignments per zoom level 0–6 (use a simple quadtree: `gridId = $zoom . '/' . floor($x) . '/' . floor($y)` where `(x, y)` come from Web Mercator tile-math). Groups by `(grid_level, grid_id, plan_tier)`. Computes centroid and bounds per cell. Truncates `platform_map_cells` and bulk-inserts fresh rows in a transaction. File: `app/Actions/Admin/PlatformPulse/AggregatePlatformMapCells.php`
- [ ] T103 [P] New action: `GetMapCells` using `AsAction` — parameters `int $zoom, float $west, float $south, float $east, float $north, ?string $tier`. Queries `platform_map_cells` where `grid_level = min($zoom, 6)` and centroid within bbox (handles antimeridian wrap via `OR` on `lng`). Applies optional tier filter. Returns array of cell shapes. File: `app/Actions/Admin/PlatformPulse/GetMapCells.php`
- [ ] T104 Modify `BuildPlatformMap::handle()` again — accept optional `?array $bbox = null, ?int $zoom = null, ?string $tier = null`. Branch:
  - If total count ≤ 100: ignore bbox/zoom, return full pin set (preserves Story 1 behaviour on small platforms).
  - Else if `zoom < 7`: delegate to `GetMapCells::run(...)`, return `{ cells: [...], count: int }`.
  - Else: return pins `where lat BETWEEN south AND north AND lng BETWEEN west AND east` (antimeridian-aware), `LIMIT 2000`, set `truncated: true` if >=2000 rows. File: `app/Actions/Admin/PlatformPulse/BuildPlatformMap.php`
- [ ] T105 Modify `PlatformPulseController::map()` — read `bbox`, `zoom`, `tier` query params; validate bbox as `west,south,east,north` float tuple in range; pass to `BuildPlatformMap::run(...)`; include all three in cache key. File: `app/Http/Controllers/Api/Admin/PlatformPulseController.php`
- [ ] T106 Modify `RefreshPlatformMetricsCommand::handle()` — after existing metric refresh, call `AggregatePlatformMapCells::run()`. File: `app/Console/Commands/RefreshPlatformMetricsCommand.php`

### B.2 Backend — tests

- [ ] T110 [P] Unit test: `AggregatePlatformMapCellsTest` — seed 20 workspaces at known coords across two states, run action, assert expected `platform_map_cells` rows exist (right `grid_level`, `grid_id`, `pin_count`). File: `tests/Unit/Admin/PlatformPulse/AggregatePlatformMapCellsTest.php`
- [ ] T111 [P] Feature test: `PlatformMapBboxTest` — requests `/map?bbox=150,-34,152,-33&zoom=8` and asserts returned pins are all within bbox. Also tests antimeridian wrap (`?bbox=179,-50,-179,50`). File: `tests/Feature/Admin/PlatformMapBboxTest.php`
- [ ] T112 [P] Feature test: same file, second scenario — requests `/map?zoom=3` and asserts response shape is `{ cells: [...] }`, not `{ pins: [...] }`.
- [ ] T113 [P] Feature test: same file, third scenario — seed 2001 workspaces within a bbox, request that bbox, assert `truncated: true` and `pins.length === 2000`.

### B.3 Frontend — viewport + cells

- [ ] T120 Modify `usePlatformPulseMap` — accept optional `{ bbox, zoom, tier }` args; include them in query key; debounce viewport changes via a 300 ms `useDebouncedValue` hook (add that utility if not present). File: `frontend/src/hooks/use-platform-pulse.ts`
- [ ] T121 [P] Type additions in `frontend/src/types/platform-pulse.ts`: `MapCell` (with `centroid`, `bounds`, `pin_count`, `plan_tier`); extend `PlatformMap` to be discriminated union of `{ pins: MapPin[]; count: number; truncated?: boolean }` vs `{ cells: MapCell[]; count: number }`.
- [ ] T122 Modify `frontend/src/components/admin/platform-pulse/platform-map.tsx`:
  - Hook up `onMoveEnd` to compute current `bounds` + `zoom`, pass to `usePlatformPulseMap`.
  - Branch on response shape (`'cells' in data` vs `'pins' in data`).
  - When cells: render each as a semi-transparent polygon (via `<Source type="geojson">` + `<Layer type="fill">`) with centred count label.
  - When pins: existing Supercluster branch from Phase A handles rendering.
  - Show a small bottom-right chip "Zoom in to see all" when `truncated === true`.
- [ ] T123 [P] On cell click: `map.fitBounds([[cell.bounds_sw_lng, cell.bounds_sw_lat], [cell.bounds_ne_lng, cell.bounds_ne_lat]], { padding: 40 })`. Implemented inside `platform-map.tsx`.

### B.4 Frontend — tests

- [ ] T130 [P] Browser test: `tests/Browser/Admin/PlatformMapViewportTest.php`:
  - Seed 30,000 workspaces.
  - Load `/admin/map`; assert first request contains `bbox=` and `zoom=` params.
  - Zoom out to zoom 3; assert cells render (via `data-testid="map-cell"`); assert no pin markers.
  - Zoom in to zoom 9; assert pins render.
  - Pan the map; assert a new request fires after 300 ms debounce.

### B.5 Cleanup

- [ ] T150 `vendor/bin/pint --dirty`
- [ ] T151 `cd frontend && npx tsc --noEmit` clean
- [ ] T152 Full test suite `php artisan test` green
- [ ] T153 Update `meta.yaml` with Phase B completion date

---

## Phase C — PostGIS + vector tiles (P3 — GATED ON INFRA DECISION)

**DO NOT START.** Phase C requires:
1. PostGIS extension approved for production
2. Separate decision on whether to keep Phase C in this epic or split into new epic `104-PST PostGIS Spatial Tiles`

If approved: tasks will be generated at that time (see plan.md §"Phase C — files to change").

---

## Summary

- **Phase A**: 22 tasks (T001–T053). Backend = 9 tasks, backend tests = 4, frontend = 10, cleanup = 4. Parallel opportunities: 14 tasks marked [P].
- **Phase B**: 24 tasks (T100–T153). Gated on trigger thresholds.
- **Phase C**: Not enumerated (gated on infra decision).

**MVP scope** = Phase A only. Ships independently and delivers the 100-record clustering threshold, lean payload, server cache, and lazy popup.

---

## Next Steps

User has said proceed — continuing to `/speckit-implement` for Phase A. Starting with backend (T001–T009), then backend tests (T010–T013), then frontend (T020–T033), then frontend tests + cleanup (T040–T053).
