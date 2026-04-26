---
title: "Feature Specification: Map Performance & Scale"
---

# Feature Specification: Map Performance & Scale

**Feature Branch**: `feature/103-mps-map-performance-scale`
**Created**: 2026-04-19
**Status**: Approved (Gate 1 passed 2026-04-19)
**Parent Epic**: [102-PPL Platform Pulse](/initiatives/FL-financial-ledger/102-PPL-platform-pulse)
**Input**: Scale-plan follow-up to 102-PPL. Entity Map at `/admin/map` must render smoothly at platform sizes from demo (~8 pins) to millions of workspaces without blowing up payload size, browser framerate, or DB load.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Cluster view above 100 records (Priority: P1)

A super admin opens `/admin/map` on a platform with 2,400 workspaces. Instead of 2,400 individual DOM markers collapsing the browser, the map shows ~40 cluster bubbles each labelled with the count of pins it contains, coloured by the dominant plan tier in that cluster. Zooming in breaks clusters apart; at high zoom, individual pins appear. Below 100 records, individual pins render directly (no clustering) so small platforms retain the familiar pin-per-workspace view.

**Why this priority**: This is the hard product requirement — "if more than 100 records it should be clustered." Everything else in this epic supports it. Without this, the map is visually broken above ~1k workspaces and unusable above ~10k. The `supercluster` npm package is already installed and ready to use.

**Independent Test**: Seed the platform with 500 workspaces. Open `/admin/map`. Verify cluster bubbles render instead of individual pins. Click a cluster → zoom animates in and cluster splits. Zoom in far enough → individual pins appear. Seed only 50 workspaces → individual pins render directly, no clusters.

**Acceptance Scenarios**:

1. **Given** the platform has 101 or more workspaces with valid locations, **When** a super admin opens `/admin/map`, **Then** the map renders cluster bubbles (not individual pins) and each cluster shows its pin count as a number overlay.
2. **Given** the platform has 100 or fewer workspaces with valid locations, **When** a super admin opens `/admin/map`, **Then** the map renders one marker per workspace with no clustering.
3. **Given** a super admin clicks a cluster bubble, **When** the click is registered, **Then** the map zooms to that cluster's bounds and the cluster splits into smaller clusters or individual pins depending on the new zoom level.
4. **Given** cluster bubbles are visible, **When** the super admin hovers a cluster, **Then** the cluster's boundary (convex hull or bounding radius) is visually indicated and the tooltip shows the count.
5. **Given** an individual pin is rendered (not part of a cluster), **When** the super admin clicks it, **Then** the popup opens and shows workspace metadata (name, organisation, plan tier, "Open workspace" link).

---

### User Story 2 — Lazy popup metadata (Priority: P1)

When the map first loads, the payload is minimal — only what the renderer needs to place pins (id, slug, lat, lng, plan tier). Full workspace metadata (organisation name, city, state, country) is fetched only when a pin or cluster-leaf is clicked. This keeps the initial payload under 200 KB even on platforms with tens of thousands of workspaces, and eliminates waste (90%+ of pins are never clicked).

**Why this priority**: Directly enables Story 1 — without lean payload, client clustering just moves the bottleneck from rendering to data-transfer. Independent because it's a standalone API change and can be deployed without touching the clustering code; the existing popup would simply work against the new per-workspace detail endpoint.

**Independent Test**: Seed 1,000 workspaces. Open `/admin/map` with DevTools network open. Verify initial `/map` payload is < 100 KB and contains only `{id, slug, lat, lng, plan_tier}`. Click a pin → a separate `/map/workspace/{id}` request fires and returns full metadata. Click the same pin again → cached, no duplicate network request.

**Acceptance Scenarios**:

1. **Given** a super admin opens `/admin/map`, **When** the initial map data loads, **Then** the response body contains only the minimum fields needed for rendering: `id`, `slug`, `lat`, `lng`, `plan_tier`. No `org_name`, `city`, `state`, or `country`.
2. **Given** the map is rendered, **When** a super admin clicks a pin for the first time, **Then** a `GET /admin/platform-pulse/map/workspace/{id}` request is made and the popup shows the full metadata returned.
3. **Given** the popup has been opened for a workspace once in this session, **When** the same pin is clicked again, **Then** the popup opens from cache without a repeat network request.
4. **Given** the workspace detail fetch fails (network error, 404), **When** the popup tries to render, **Then** the popup shows "Details unavailable" with a retry action rather than silently failing.
5. **Given** the workspace detail endpoint is called by a non-super-admin user, **When** the request is authenticated, **Then** the response is 403 Forbidden (existing `is_super_admin` gate enforced).

---

### User Story 3 — Server-side map response cache (Priority: P1)

The map endpoint wraps its response in a 5-minute Laravel cache keyed by the filter set. Repeated loads by the same super admin, or by different super admins within 5 minutes, return the cached payload instantly without re-querying the workspaces table. Cache invalidates automatically after 5 minutes; no manual bust required.

**Why this priority**: Combined with Stories 1 + 2, this caps DB load at roughly one `SELECT` every 5 minutes regardless of how many super admins open the map. Essential before Phase B but trivial to implement — reuses Laravel cache (DB driver today).

**Independent Test**: Open `/admin/map` → observe DB query log shows a workspaces scan. Wait 10 seconds, reload → no DB scan (served from cache). Wait 6 minutes, reload → DB scan again (cache expired).

**Acceptance Scenarios**:

1. **Given** the map cache is cold, **When** a super admin loads `/admin/map`, **Then** the response is computed fresh, cached with a 5-minute TTL, and served.
2. **Given** the map cache is warm, **When** any super admin loads `/admin/map` within the TTL window, **Then** the cached response is served without re-querying the workspaces table.
3. **Given** the cache entry is older than 5 minutes, **When** the next request arrives, **Then** the stale entry is ignored and a fresh computation runs.
4. **Given** a super admin applies a plan-tier filter (e.g., `?tier=enterprise`), **When** the request is made, **Then** the cache key includes the filter so different filter sets have separate cache entries.
5. **Given** the cache driver is the DB driver (single-node Laravel today), **When** Redis is later configured, **Then** no code change is required — the `Cache::remember` call continues to work.

---

### User Story 4 — Bbox-viewport API (Priority: P2)

Instead of shipping every pin on every load, the map endpoint accepts bounding-box parameters (`?bbox=west,south,east,north&zoom=N`) and returns only the workspaces whose coordinates fall within that viewport, capped at 2,000 pins. As the super admin pans/zooms the map, the frontend refetches with the new viewport. Below 100 records total, the endpoint ignores the bbox and returns the full set (so Story 1's behaviour holds on small platforms).

**Why this priority**: Essential once a platform grows past ~20k workspaces — client-side supercluster starts hitting CPU limits. Independent of Story 5 (grid cells) because bbox-limited pins alone take the platform from 20k to ~500k before grid aggregation becomes necessary. Do not build until Phase A triggers fire (pin count > 20k OR client clustering CPU > 100ms).

**Independent Test**: Seed 50,000 workspaces across Australia. Open `/admin/map` zoomed to Sydney metro. Verify the request includes `?bbox=...&zoom=...` params. Verify the response contains ≤2,000 pins, all within the bbox. Pan to Perth → new request fires with new bbox. Pan back to Sydney within 5 minutes → served from cache.

**Acceptance Scenarios**:

1. **Given** the platform has more than 100 workspaces, **When** the map component mounts, **Then** the first request to `/admin/platform-pulse/map` includes `bbox` and `zoom` query parameters derived from the current viewport.
2. **Given** a bbox request arrives at the API, **When** the API processes it, **Then** only workspaces whose `(lat, lng)` fall within the bbox are returned, capped at `LIMIT 2000`.
3. **Given** the response is capped at 2,000 pins, **When** the cap is hit, **Then** the response includes a `truncated: true` flag and the frontend shows a "Zoom in to see all" hint.
4. **Given** the super admin pans the map, **When** the viewport change settles (debounced 300ms), **Then** a new bbox-scoped fetch fires.
5. **Given** the platform has 100 or fewer workspaces, **When** the map loads, **Then** the bbox params are ignored and the full pin set is returned (preserves Story 1 behaviour on small platforms).
6. **Given** the response is served from cache, **When** the same bbox + zoom + filter combination is requested again within 5 minutes, **Then** the cached response is returned (cache key incorporates bbox + zoom bucket).

---

### User Story 5 — Low-zoom grid aggregation (Priority: P2)

At low zoom levels (zoom < 7, roughly country-scale views), the map shows pre-computed grid cells instead of individual pins — a hex-or-quadtree grid where each cell shows the count of workspaces inside it. Grid cells are pre-aggregated by a scheduled job (piggybacking on the existing `platform-pulse:refresh-metrics` cron every 5 min) and written to a materialised `platform_map_cells` table. This keeps the payload under ~500 cells at any zoom regardless of platform size.

**Why this priority**: Complements Story 4. Even with bbox limiting, at zoom level 2 (whole world) the viewport contains every pin globally — bbox doesn't help. Grid aggregation keeps low-zoom views bounded. Hold until Phase B triggers fire.

**Independent Test**: Seed 1,000,000 workspaces globally. Open `/admin/map` at zoom 2. Verify the response is grid cells (not pins) capped at ~500. Zoom in to zoom 8 → response switches to bbox-limited pins. Inspect `platform_map_cells` table — populated by the scheduled job, not per-request.

**Acceptance Scenarios**:

1. **Given** the map is at zoom level less than 7, **When** the map endpoint receives the request, **Then** the response contains grid cells (each cell carries a centroid, bounds, and pin count) rather than individual pins.
2. **Given** the map is at zoom level 7 or greater, **When** the map endpoint receives the request, **Then** the response contains individual pins (subject to bbox + 2000 cap from Story 4).
3. **Given** grid cells are rendered, **When** a super admin clicks a cell, **Then** the map zooms to that cell's bounds; if the new zoom ≥ 7, the cell is replaced by individual pins.
4. **Given** the scheduled job runs, **When** it computes grid aggregates, **Then** it writes to a `platform_map_cells` table keyed by (grid_level, grid_id, plan_tier) so filtered queries stay bounded.
5. **Given** no workspaces have been added in the last 5 minutes, **When** the scheduled job runs, **Then** it may skip re-aggregation if the underlying workspace count has not changed (optimisation — not required for correctness).
6. **Given** a plan-tier filter is applied at low zoom, **When** the response is computed, **Then** grid cell counts reflect only workspaces matching the filter.

---

### Edge Cases

- **Exactly 100 records** — the clustering threshold is "> 100", so exactly 100 renders as individual pins; 101 renders as clusters. Explicit in FR-007.
- **Workspaces with no location** — continue to fall into the "No location" sidebar (unchanged from 102-PPL). Not included in the bbox/pin/cluster count.
- **Country-centroid pins jittered to the same cluster** — when multiple workspaces share `country = 'AU'` with no street address, the jitter keeps them near `[-25.27, 133.78]` but not colocated; supercluster treats them as distinct points and will cluster them naturally. No change.
- **Bbox crossing the antimeridian** (180° longitude) — e.g., a view over the Pacific. The API MUST handle `west > east` as "wraps the antimeridian" and return pins from both sides. (Edge case, rare, Phase B concern.)
- **Empty bbox** (user zooms into an ocean) — API returns an empty pin list plus `count: 0`. Frontend shows "No workspaces in this area" empty state.
- **Cache stampede on cold start** — first request after cache expiry triggers full recomputation; concurrent requests during that window may all hit the DB. Accept this; mitigate with `Cache::lock()` only if it becomes a measured problem (premature otherwise).
- **Super admin loses super-admin flag mid-session** — next map request returns 403; frontend clears cached map data, shows auth-error state. Existing behaviour from `/admin` middleware.
- **Filter applied at very low zoom with many tiers** — cache key grows combinatorially (bbox × zoom × tier-set). Cap tier-set in cache key to a canonical sort-order string; accept at most ~20 cache entries per bbox/zoom bucket.
- **Phase C PostGIS not yet enabled** — Phase C MUST NOT ship unless PostGIS is enabled on the production DB. A separate infra decision point gates Phase C.
- **Grid cell with zero pins** — not returned in the response (empty cells are omitted to reduce payload).

## Requirements *(mandatory)*

### Functional Requirements

#### Lean Payload & Lazy Metadata (P1)

- **FR-001**: The `GET /admin/platform-pulse/map` endpoint MUST return only the minimum fields needed for rendering: `id`, `slug`, `lat`, `lng`, `plan_tier`. It MUST NOT include `org_name`, `city`, `state`, or `country` in the initial payload.
- **FR-002**: A new endpoint `GET /admin/platform-pulse/map/workspace/{id}` MUST exist, returning the full workspace metadata (`org_name`, `city`, `state`, `country`, plus any fields required by the popup UI). It MUST enforce the existing `is_super_admin` gate.
- **FR-003**: The frontend popup MUST call the per-workspace endpoint lazily — only when a pin or cluster-leaf is clicked. It MUST cache the response for the session so repeated clicks on the same pin do not repeat the request.
- **FR-004**: The "No location" sidebar MUST be fetched by a separate lazy endpoint that is only called when the sidebar is opened, not on initial map load.

#### Server-Side Cache (P1)

- **FR-005**: The map endpoint response MUST be wrapped in a Laravel cache (`Cache::remember`) with a 5-minute TTL.
- **FR-006**: The cache key MUST incorporate the active filter set (plan-tier filter, future filters) so different filter combinations have separate cache entries. For Phase B, the cache key MUST additionally include the snapped-bbox and the zoom bucket.

#### Client Clustering (P1)

- **FR-007**: When the platform has **more than 100 workspaces with valid locations**, the map MUST render cluster bubbles using `supercluster` instead of individual DOM markers. When the count is 100 or fewer, individual pins MUST be rendered directly with no clustering. The "100 record threshold" is a hard product requirement.
- **FR-008**: Cluster bubbles MUST display the count of pins they contain as a visible number overlay.
- **FR-009**: Clicking a cluster MUST zoom the map to the cluster's bounds, causing the cluster to split into smaller clusters or individual pins.
- **FR-010**: Cluster colour MUST reflect the dominant plan tier in the cluster (e.g., the most common tier across the cluster's leaves).

#### Bbox-Viewport API (P2)

- **FR-011**: The map endpoint MUST accept optional `bbox=west,south,east,north` and `zoom=N` query parameters. When present, the endpoint MUST return only workspaces whose coordinates fall within the bbox.
- **FR-012**: Bbox-scoped responses MUST be capped at `LIMIT 2000` pins. When the cap is hit, the response MUST include `truncated: true` so the frontend can surface a "Zoom in" hint.
- **FR-013**: The frontend MUST emit a new bbox-scoped fetch whenever the map viewport changes, with 300ms debouncing so continuous panning does not spam the API.
- **FR-014**: When the total platform workspace count is 100 or fewer, the bbox parameters MUST be ignored and the full pin set MUST be returned (preserves FR-007 behaviour on small platforms).
- **FR-015**: The bbox API MUST handle antimeridian-crossing viewports correctly (i.e., when `west > east`, the bbox wraps the 180° meridian).

#### Low-Zoom Grid Aggregation (P2)

- **FR-016**: At zoom levels less than 7, the map endpoint MUST return pre-aggregated grid cells instead of individual pins. Each cell MUST carry: grid id, centroid lat/lng, bounds, pin count, dominant plan tier.
- **FR-017**: Grid cells MUST be pre-computed by a scheduled job that runs every 5 minutes, piggybacking on the existing `platform-pulse:refresh-metrics` cron. Output is written to a materialised `platform_map_cells` table.
- **FR-018**: At zoom level 7 or greater, the endpoint MUST return individual pins subject to the bbox + 2000 cap (FR-011, FR-012).
- **FR-019**: Grid cell counts MUST respect any active plan-tier filter. The `platform_map_cells` table MUST be keyed by `(grid_level, grid_id, plan_tier)` so filtered queries hit a covering index rather than scanning all cells.

#### Phase C — PostGIS + Vector Tiles (P3, optional)

- **FR-020**: (Phase C only — gated on separate infra decision) A `location` column of type `geography(Point)` MUST be added to the `workspaces` table, populated from the existing `latitude`/`longitude` columns, with a GIST spatial index.
- **FR-021**: (Phase C only) A tile endpoint `GET /admin/platform-pulse/tiles/{z}/{x}/{y}.mvt` MUST serve Mapbox Vector Tiles generated server-side from the spatial index. The frontend MUST switch from per-pin Markers to a MapLibre `source: "vector"` layer using native `cluster: true`.
- **FR-022**: (Phase C only) PostGIS MUST be enabled on the production database via a dedicated infra decision point before FR-020/021 ship. Phase C MUST NOT be implemented unless PostGIS is enabled.

### Key Entities

- **Map Pin (lean)** — the minimum renderable shape for a workspace. Attributes: `id`, `slug`, `lat`, `lng`, `plan_tier`. Returned in bulk by the map endpoint. Does NOT carry display metadata.
- **Workspace Map Detail** — full popup metadata, fetched lazily per workspace. Attributes: `name`, `org_name`, `plan_tier`, `city`, `state`, `country`, and any other fields the popup shows.
- **Map Cell** — a pre-aggregated grid cell for low-zoom views. Attributes: `grid_level`, `grid_id`, `centroid_lat`, `centroid_lng`, `bounds` (sw/ne corners), `pin_count`, `dominant_plan_tier`, optional per-tier counts. Computed by scheduled job, stored in `platform_map_cells` table.
- **Map Cache Entry** — a Laravel cache entry keyed by `map:bbox=<snapped>:zoom=<bucket>:tiers=<sorted>`. Value is the computed response payload. TTL 5 minutes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Initial map payload is under **100 KB** on a platform with up to 10,000 workspaces (Phase A target).
- **SC-002**: Map initial render (first paint after data arrives) is under **1 second** on a platform with up to 50,000 workspaces on mid-range hardware (Chrome, 8GB RAM, no network latency).
- **SC-003**: Client-side clustering computation (supercluster load + initial viewport cluster) is under **100 ms** for up to 50,000 pins.
- **SC-004**: After Phase B, the map remains interactive (pan/zoom latency under 300 ms) on a platform with **1,000,000 workspaces**.
- **SC-005**: Cache hit rate exceeds **90%** for map endpoint requests during a typical super-admin session, measured over a 5-minute window with repeated viewport interactions.
- **SC-006**: Workspace-detail fetch-on-click returns in under **200 ms** (single-workspace lookup, indexed).
- **SC-007**: Exactly **100 workspaces** renders as individual pins; exactly **101** renders as clusters — the threshold is precise.
- **SC-008**: The scheduled grid-aggregation job (Phase B) completes in under **30 seconds** on a platform with 1,000,000 workspaces.
- **SC-009**: Bbox-scoped responses are capped at exactly **2,000 pins**; `truncated: true` flag appears in the response body when the cap is hit — **100% of over-cap responses** carry the flag.
- **SC-010**: No DB-table scan exceeds **500 ms** for any map request on a platform of any supported size.

## Clarifications

### Session 2026-04-19 (self-clarified by PO)

- **Q**: Should the 100-record clustering threshold be exact or a soft suggestion? → **A**: Exact and hard — "> 100 = cluster, ≤ 100 = individual pins". This is FR-007 and a product requirement, not a performance heuristic.
- **Q**: Should the lean payload and lazy-popup be separate stories or one? → **A**: Separate (US2 is its own story). Lazy popup is an API change independent of clustering; could ship alone and still deliver value.
- **Q**: Where does cluster colour come from? → **A**: Dominant plan tier across the cluster's leaves (most common). Matches existing pin colour logic so clusters feel consistent with individual pins.
- **Q**: When should cache invalidate? → **A**: TTL only (5 min). No explicit bust on workspace create/update. Acceptable staleness for an ops-overview surface; reconsider if a use case demands fresher.
- **Q**: Should the workspace-detail endpoint return the same shape as the current map endpoint's per-pin object? → **A**: Superset — detail endpoint returns everything the current pin carries plus anything else the popup needs. Frontend merges detail into local cache, keyed by workspace id.
- **Q**: What zoom level is the grid/pin cutoff? → **A**: Zoom 7 (roughly regional-state scale). Below 7 = grid cells. 7 and above = individual pins (bbox-scoped).
- **Q**: Is PostGIS in scope for this epic? → **A**: **No by default.** Phase C (FR-020/021/022) is documented for completeness but is gated on a separate infra decision point. If PostGIS is approved, Phase C may ship as part of this epic; otherwise, Phase C spins off as its own epic. Phases A and B are fully deliverable on vanilla PostgreSQL.
- **Q**: What's the pin cap per bbox response? → **A**: 2,000. High enough that typical city-scale views are unaffected; low enough that payload stays bounded. `truncated: true` flag plus "Zoom in" UI hint when hit.
- **Q**: Should viewport refetch be debounced? → **A**: Yes, 300 ms. Continuous panning should not fire a request per frame; 300 ms is a standard UI debounce that feels instant but protects the API.
- **Q**: How do we handle the cache stampede on cold start? → **A**: Accept it for now. 5-min TTL means at most one stampede every 5 min per filter set. Add `Cache::lock()` only if production metrics show it's a real problem. Premature otherwise.
