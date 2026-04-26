---
title: "Implementation Plan: Map Performance & Scale"
---

# Implementation Plan: Map Performance & Scale

**Spec**: [./spec.md](./spec.md)
**Parent Epic**: [102-PPL Platform Pulse](/initiatives/FL-financial-ledger/102-PPL-platform-pulse)
**Scale-plan reference**: [102-PPL/scale-plan.md](/initiatives/FL-financial-ledger/102-PPL-platform-pulse/scale-plan)
**Created**: 2026-04-19
**Status**: Draft

## Technical Context

### Technology Stack

- **Backend**: Laravel 12, PHP 8.4, PostgreSQL (no PostGIS for Phase A/B)
- **Frontend**: Next.js 16, React 19, TypeScript, MapLibre GL JS via `react-map-gl/maplibre`, `supercluster` (already installed)
- **Cache**: Laravel cache — DB driver today, Redis when multi-node (no code change required either way)
- **Scheduler**: Laravel scheduler — existing `platform-pulse:refresh-metrics` cron (every 5 min) is extended for grid-cell aggregation in Phase B
- **Auth**: Existing `is_super_admin` middleware on `/admin/*` — no changes

### Dependencies

- **102-PPL Platform Pulse** (shipped) — provides `BuildPlatformMap`, `PlatformPulseController@map`, `platform-map.tsx`, `usePlatformPulseMap` hook
- **`supercluster` npm package** — already present in `frontend/package.json` (installed mid-session during 102-PPL implementation before this epic was split out); no new install needed
- **PostGIS** — **NOT a dependency for Phase A or B.** Phase C only, and even Phase C is gated on a separate infra decision.

### Constraints

- **100-record threshold is hard** — FR-007 requires `> 100 = cluster, ≤ 100 = individual pins`. The implementation must branch deterministically, not use a fuzzy heuristic.
- **Backward compatibility** — the existing `/admin/platform-pulse/map` endpoint must continue to serve a valid response. The shape change is additive (extra fields can appear, old consumers don't break) but the lean payload means some fields are now absent on the bulk response. Coordinate frontend + backend changes in the same commit so the popup's missing-metadata problem is never observable in production.
- **Cache driver neutrality** — must work on DB cache driver (today's local dev) and Redis (production future). No driver-specific features beyond `Cache::remember` and `Cache::lock` (if added).
- **Phase boundaries are independently deployable** — Phase A ships alone; Phase B does not require Phase C; Phase C can be skipped entirely.

---

## Gate 3: Architecture Pre-Check Notes

Running Gate 3 checklist against spec inputs:

| Area | Finding | Action |
|------|---------|--------|
| Aggregate roots | No new aggregates — this is read-model/cache performance work | None |
| Events | No new events | None |
| Projectors | No new projectors. Phase B adds a scheduled aggregator command (not a projector) | Documented |
| Multi-tenancy | Explicitly crosses tenant boundary (super-admin map across all workspaces) — same pattern as 102-PPL | Continues using `Workspace::withoutGlobalScopes()` |
| Central vs tenant | `platform_map_cells` (Phase B) is **central** (describes the platform, not a workspace) | Documented |
| Frontend TypeScript types | All new API responses typed in `types/platform-pulse.ts` — extend existing types, no `any` | Documented |
| API Resources | All new responses via Laravel API Resource classes (not raw arrays) | Documented |
| Form Requests | No new mutations; GET endpoints use query validation inline | No form requests needed |
| Lorisleiva Actions | All business logic in `AsAction` classes under `app/Actions/Admin/PlatformPulse/` | Documented |
| TanStack Query | Viewport-change refetches use TanStack Query with a query-key that includes bbox + zoom; deduplication is automatic | Documented |
| Performance — N+1 | Map bulk query does not load workspace.organisation (lean payload); detail endpoint eager-loads organisation | Call out in Phase A |
| PostGIS scope | **Phase C only, gated on separate decision.** Not in A or B. | Explicit in plan |

**Red flags**: none.

---

## Design Decisions

### Data Model

#### Phase A — no schema changes

Phase A is pure application-layer work. No new tables, no migrations.

#### Phase B — new `platform_map_cells` table

Materialised pre-aggregation.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `grid_level` | smallint | 0–6 (one row per zoom bucket) |
| `grid_id` | string | Quadtree key (e.g. `2/3/5`) or hex index |
| `plan_tier` | string | Indexed; one row per (grid_level, grid_id, plan_tier) |
| `centroid_lat` | decimal(9,6) | Pre-computed cell centre |
| `centroid_lng` | decimal(9,6) | |
| `bounds_sw_lat` | decimal(9,6) | For zoom-to-fit when clicked |
| `bounds_sw_lng` | decimal(9,6) | |
| `bounds_ne_lat` | decimal(9,6) | |
| `bounds_ne_lng` | decimal(9,6) | |
| `pin_count` | int | |
| `refreshed_at` | timestamp | |

Index: `(grid_level, grid_id)` and `(grid_level, plan_tier)` for filtered queries. Table is truncate-and-rebuild on each scheduled run for simplicity.

#### Phase C — PostGIS (not in scope unless approved)

Adds `location geography(Point, 4326)` column to `workspaces` + GIST index. Backfill from existing `latitude`/`longitude`. **Do not build unless PostGIS is enabled on production.**

### API Contracts

All endpoints under `/api/v1/admin/platform-pulse/`, protected by existing `is_super_admin` middleware.

**Phase A changes**:

| Method | Path | Change | Response |
|--------|------|--------|----------|
| GET | `/platform-pulse/map` | Payload trimmed to lean fields; wrapped in 5-min cache | `{ pins: [{ id, slug, lat, lng, plan_tier }], truncated: false, count: N }` |
| GET | `/platform-pulse/map/workspace/{id}` | **NEW** | `{ id, slug, name, org_name, plan_tier, city, state, country, latitude, longitude, location_source }` |
| GET | `/platform-pulse/map/no-location` | **NEW** (separate lazy endpoint for the sidebar) | `{ workspaces: [{ id, name, org_name, plan_tier, country }] }` |

**Phase B additions**:

| Method | Path | Change | Response |
|--------|------|--------|----------|
| GET | `/platform-pulse/map?bbox=…&zoom=…&tier=…` | Accepts new query params | `{ pins: [...], truncated: bool, count: int }` OR `{ cells: [...] }` (depending on zoom) |

**Phase C additions (conditional)**:

| Method | Path | Change | Response |
|--------|------|--------|----------|
| GET | `/platform-pulse/tiles/{z}/{x}/{y}.mvt` | **NEW** (Phase C only) | Binary MVT payload |

All JSON responses continue using Laravel API Resources. Types in `frontend/src/types/platform-pulse.ts` extended accordingly.

### Backend Work (Laravel)

#### Phase A — files to change

**Actions** (`app/Actions/Admin/PlatformPulse/`):
- `BuildPlatformMap.php` — **modify**: trim response to lean fields (`id`, `slug`, `lat`, `lng`, `plan_tier`); remove `org_name`, `city`, `state`, `country`; keep existing country-centroid fallback logic; drop the "no_location" list out of this action entirely
- `GetWorkspaceMapDetail.php` — **new**: single-workspace lookup, eager-loads `organisation`, returns full popup metadata
- `GetNoLocationWorkspaces.php` — **new**: returns the "No location" list; called only by the sidebar's lazy endpoint

**Controllers** (`app/Http/Controllers/Api/Admin/`):
- `PlatformPulseController.php` — **modify**:
  - `map()` — wrap `BuildPlatformMap::run()` in `Cache::remember('platform-pulse:map:' . $filterHash, 300, ...)`
  - Add `workspaceDetail(Workspace $workspace)` method — delegates to `GetWorkspaceMapDetail`
  - Add `noLocation()` method — delegates to `GetNoLocationWorkspaces`

**Routes** (`routes/api.php`):
- Add two routes under the existing super-admin group:
  - `Route::get('admin/platform-pulse/map/workspace/{workspace}', [PlatformPulseController::class, 'workspaceDetail'])`
  - `Route::get('admin/platform-pulse/map/no-location', [PlatformPulseController::class, 'noLocation'])`

**API Resources** (new):
- `app/Http/Resources/Admin/MapPinResource.php` — lean pin shape
- `app/Http/Resources/Admin/WorkspaceMapDetailResource.php` — full popup shape

#### Phase B — files to change

**Actions**:
- `BuildPlatformMap.php` — **modify** again: accept `bbox`, `zoom`, `tier` args; branch on zoom (low → cells, high → pins); apply `LIMIT 2000` cap; return `truncated` flag
- `AggregatePlatformMapCells.php` — **new**: reads all workspaces, computes quadtree cell assignments per zoom level 0–6, writes to `platform_map_cells` (truncate-and-rebuild)
- `GetMapCells.php` — **new**: reads cells for a given `(zoom, bbox, tier)` from `platform_map_cells`

**Console Commands**:
- `app/Console/Commands/RefreshPlatformMetrics.php` — **modify**: extend to also call `AggregatePlatformMapCells::run()` at the end of its existing cadence. No new cron entry needed; piggybacks on existing 5-min scheduler.

**Models** (new):
- `app/Models/Central/PlatformMapCell.php` — thin Eloquent model over `platform_map_cells`

**Migrations** (new):
- `database/migrations/YYYY_MM_DD_create_platform_map_cells_table.php`

#### Phase C — files to change (conditional — only if PostGIS approved)

- New migration: `add_location_column_to_workspaces_table.php` — requires PostGIS extension
- New action: `GenerateMapTile.php` — computes `.mvt` from spatial index
- New controller method: `PlatformPulseController@tile`
- New route: `/admin/platform-pulse/tiles/{z}/{x}/{y}.mvt`
- Frontend: switch `PlatformMap` component from `<Marker>` nodes to `<Source type="vector">` + `<Layer>` with native `cluster: true`

### Frontend Work (Next.js)

#### Phase A — files to change

**Hooks** (`frontend/src/hooks/`):
- `use-platform-pulse.ts` — **modify**: update `usePlatformPulseMap` to use the lean response type; add new hook `useWorkspaceMapDetail(workspaceId)` for lazy popup fetch; add new hook `useNoLocationWorkspaces()` for the sidebar (enabled only when sidebar opened)

**Components** (`frontend/src/components/admin/platform-pulse/`):
- `platform-map.tsx` — **modify**: replace per-pin `<Marker>` rendering with a conditional:
  - If `count <= 100`: render individual `<Marker>` nodes (today's behaviour)
  - If `count > 100`: initialise `supercluster`, render cluster bubbles and individual leaves
  - On pin/leaf click: call `useWorkspaceMapDetail(id)` and populate the popup
- `platform-map-popup.tsx` — **new** (or inline in `platform-map.tsx`): handles lazy detail fetch, loading state, error state

**Types** (`frontend/src/types/platform-pulse.ts`):
- **Modify** `MapPin` to the lean shape
- **Add** `WorkspaceMapDetail` type
- **Add** `MapCluster` type (for supercluster output)

#### Phase B — files to change

- `use-platform-pulse.ts` — **modify**: `usePlatformPulseMap` accepts `bbox` + `zoom` args; debounces viewport changes at 300 ms; query key includes bbox + zoom bucket
- `platform-map.tsx` — **modify**:
  - Listen to `onMoveEnd` on the MapLibre map; compute bbox + zoom; pass to hook
  - Branch on response type: `pins` vs `cells`; render appropriate layer
  - Show "Zoom in to see all" hint when `truncated: true`
- `platform-map-cells.tsx` — **new**: renders grid cells as coloured polygons with count labels
- Types: add `MapCell` interface

#### Phase C — files to change (conditional)

- `platform-map.tsx` — swap `<Marker>`/`<Source type="geojson">` for `<Source type="vector" tiles={[tileUrl]}>` + MapLibre native clustering
- Remove supercluster usage (MapLibre handles it on GPU)

### UI Component reuse notes

- Reuse existing `Card`, `Badge`, `Button` primitives
- Reuse existing `PLAN_TIER_COLORS` constant in `platform-map.tsx` for cluster colour logic
- MapLibre's `NavigationControl` continues to provide zoom buttons

---

## Implementation Phases

### Phase A — Client clustering + lean payload + cache (P1 stories)

**Goal**: Eliminate payload bloat and DOM-marker bottleneck. Ship now as a pre-emptive polish regardless of current pin count.

**Scope**:
- Trim `BuildPlatformMap` payload (FR-001)
- Add `/map/workspace/{id}` endpoint + lazy popup fetch (FR-002, FR-003)
- Add `/map/no-location` endpoint + lazy sidebar fetch (FR-004)
- Wrap map response in `Cache::remember` with 5-min TTL and filter-aware key (FR-005, FR-006)
- Frontend: supercluster-based cluster bubbles above 100 records, individual pins at or below 100 (FR-007–FR-010)

**Tests** (Phase A):
- Feature test: `GET /map` returns lean shape (no `org_name`/`city`/`state`/`country`)
- Feature test: `GET /map/workspace/{id}` returns full shape; 403 for non-super-admin
- Feature test: `GET /map/no-location` returns workspaces missing location
- Feature test: second identical request within 5 min hits cache (mock cache hit assertion)
- Unit test: cache key includes filter set deterministically
- Browser test: seed 150 workspaces → cluster bubbles visible; seed 50 → individual pins visible; click cluster → zoom-to-bounds; click pin → popup fetches detail

**Duration estimate**: half a day.

### Phase B — Bbox-viewport API + server clustering (P2 stories)

**Goal**: Bounded payload regardless of platform size.

**Scope**:
- Extend `BuildPlatformMap` to accept `bbox`, `zoom`, `tier` (FR-011–FR-015)
- New `platform_map_cells` table + migration + Eloquent model
- New `AggregatePlatformMapCells` action, called from existing `platform-pulse:refresh-metrics` cron (FR-016–FR-019)
- New `GetMapCells` action for cell reads
- Frontend: viewport-debounced refetch, cell rendering at low zoom, truncation hint

**Trigger to start Phase B** (from scale-plan's do-not-build-until checklist):
- [ ] Pin count exceeds 20,000 across the platform, OR
- [ ] Client-side clustering CPU exceeds 100 ms, OR
- [ ] `/admin/platform-pulse/map` response exceeds 500 KB

**Tests** (Phase B):
- Feature test: `GET /map?bbox=…&zoom=8` returns pins within bbox only, capped at 2000, `truncated: true` when cap hit
- Feature test: `GET /map?zoom=3` returns cells, not pins
- Unit test: `AggregatePlatformMapCells` writes expected rows for a seeded set
- Unit test: antimeridian bbox (`west > east`) returns pins from both sides
- Browser test: pan map → new fetch fires with new bbox (debounced 300 ms)
- Browser test: zoom out below 7 → cells render; zoom in above 7 → pins render

**Duration estimate**: 2–3 days.

### Phase C — PostGIS + vector tiles (P3, gated)

**Goal**: Edge-rendered performance at continental scale.

**Scope** (conditional):
- Infra decision: enable PostGIS on production PostgreSQL
- Migration: `add_location` column + GIST index + backfill from `latitude`/`longitude`
- Tile endpoint: `/tiles/{z}/{x}/{y}.mvt`
- Frontend: MapLibre vector source with native cluster

**Trigger to start Phase C**:
- [ ] Pin count exceeds 500,000 AND server-side bbox queries exceed 500 ms, OR
- [ ] Product explicitly decides to invest in continental-scale performance
- [ ] PostGIS infra decision approved

**PostGIS Scope Flag**: **Phase C may be split off into its own dedicated epic** if the PostGIS infra decision is deferred or declined. The spec documents Phase C for completeness (FR-020–FR-022) but the plan acknowledges it can be removed from this epic without impacting Phase A/B deliverability. Default assumption: Phase C is out-of-scope for 103-MPS and, if approved, will become a new epic `104-PST PostGIS Spatial Tiles` (or similar).

**Duration estimate**: 1 week + PostGIS enablement (if in scope).

---

## Testing Strategy

### Phase A

**Unit tests**:
- Filter hash computation for cache key (deterministic across request order)
- Lean-payload shape assertion on `BuildPlatformMap` output

**Feature tests** (Laravel Pest):
- `tests/Feature/Admin/PlatformPulseMapTest.php` — extend existing 102-PPL test file:
  - `it returns lean payload without full metadata`
  - `it serves cached response on repeat requests`
  - `it returns workspace detail on /map/workspace/{id}`
  - `it returns 403 for non-super-admin on detail endpoint`
  - `it returns no-location list on /map/no-location`

**Browser tests** (Playwright):
- `tests/Browser/Admin/PlatformMapClusteringTest.php` — new:
  - Seed 150 workspaces → cluster bubbles visible with counts
  - Seed 50 workspaces → individual pins visible, no clusters
  - Click cluster → zoom animates, cluster splits
  - Click pin → popup opens, detail fetched lazily (network tab shows `/map/workspace/{id}` request)

### Phase B

**Unit tests**:
- `AggregatePlatformMapCells::handle()` with seeded workspaces of known coords — verify cells placed correctly
- Bbox containment logic — verify antimeridian wrap

**Feature tests**:
- Bbox + zoom params respected; response shape differs by zoom (cells vs pins)
- `truncated: true` flag present when pin cap hit
- Cache entries separated by bbox/zoom/tier combinations

**Browser tests**:
- Pan map → bbox param updates (debounced 300 ms)
- Zoom through threshold (7) → response type switches between cells and pins
- Low-zoom cell click → zoom-to-cell bounds

### Phase C (conditional)

**Unit tests**:
- MVT tile generation for a known bbox matches expected feature count

**Browser tests**:
- Vector source renders natively-clustered pins at continental zoom
- Pan/zoom latency under 300 ms on 1M-workspace test DB

### Test Execution Checklist

- [ ] Phase A: unit + feature passing
- [ ] Phase A: browser passing (with seeded data to exercise > 100 threshold)
- [ ] Phase B: unit + feature + browser passing (requires large-scale seed)
- [ ] Phase C (if approved): unit + feature + browser passing
- [ ] Full suite green before merge

---

## Gate 3 Post-Check

| # | Check | Status | Note |
|---|-------|--------|------|
| 1 | Vertical slice identified | PASS | Phase A ships value alone; B and C are additive |
| 2 | Aggregate boundary respected | N/A | No new aggregates (read-side caching + aggregation) |
| 3 | Events are granular facts | N/A | No new events |
| 4 | Projectors identified | PASS | No projector needed; scheduled aggregator piggybacks on existing cron (Phase B) |
| 5 | Single projector queue | N/A | No projector |
| 6 | Multi-tenancy: tenant scoping | PASS | Continues to use `Workspace::withoutGlobalScopes()` (same as 102-PPL) |
| 7 | Central vs tenant separation clear | PASS | `platform_map_cells` is central |
| 8 | Frontend TypeScript types | PASS | Extending `types/platform-pulse.ts`; no `any` |
| 9 | API Resources used | PASS | `MapPinResource`, `WorkspaceMapDetailResource` |
| 10 | Form Requests for mutations | N/A | No mutations; all GET |
| 11 | Lorisleiva Actions used | PASS | `GetWorkspaceMapDetail`, `GetNoLocationWorkspaces`, `AggregatePlatformMapCells`, `GetMapCells` |
| 12 | No hardcoded UI business logic | PASS | 100-record threshold checked server-side (`count` field) and client-side |
| 13 | Performance: N+1 prevented | PASS | Lean payload avoids loading organisation; detail endpoint eager-loads once per click |
| 14 | Server vs client components explicit | PASS | All map code is client-side (MapLibre requires it) |
| 15 | Forms use RHF + Zod | N/A | No forms |
| 16 | State: TanStack for server, Zustand for client | PASS | TanStack Query for map data; no new Zustand stores |

**Gate 3 result**: PASS

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Cache key combinatorial explosion (bbox × zoom × tier) | Medium | Medium | Snap bbox to a coarse grid, bucket zoom to integers, sort tier set deterministically; monitor cache memory after Phase B ships |
| Supercluster CPU hit on huge datasets | Low (Phase A), High (if Phase B not reached) | Medium | Phase B takes over before this becomes a problem; monitor via `performance.now()` on cluster load |
| PostGIS infra decision drags | N/A | N/A | Phase C is explicitly gated and separable; don't let it block Phase A/B |
| Popup detail endpoint called excessively on scroll-hover | Low | Low | Only fetched on click, not hover; session cache in the frontend avoids duplicate calls |
| Lean payload breaks existing consumers | Low | Medium | Only the super-admin map UI consumes this endpoint; coordinated commit keeps backend + frontend aligned |
| Antimeridian bbox bug | Medium | Low | Unit test covers explicitly; rare in practice (Australia-centric platform) |
| Cache stampede on first request after TTL | Medium | Low | Accept for now; 5-min TTL limits blast radius; add `Cache::lock()` if measured |

---

## Next Steps

1. Run `/speckit-tasks` to generate the task breakdown for Phase A
2. Begin Phase A implementation (backend first: `BuildPlatformMap` trim + new endpoints + cache; then frontend: supercluster + lazy popup)
3. Monitor pin count + client-clustering CPU after Phase A ships; hold Phase B until trigger thresholds hit
4. Separate infra decision on PostGIS — if approved, Phase C stays in this epic; if not, spin it into a new epic
