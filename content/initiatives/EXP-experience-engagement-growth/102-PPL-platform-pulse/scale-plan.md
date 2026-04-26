---
title: "Scale Plan: Entity Map"
---

# Scale Plan: Entity Map

**Epic**: 102-PPL Platform Pulse
**Page**: `/admin/map`
**Current state (2026-04-19)**: Loads every workspace with full metadata in one response, renders one DOM marker per pin. ~8 demo pins; untested at scale.

---

## Triggers

| Workspace count | Symptom | Action |
|-----------------|---------|--------|
| < 1,000 | Fine | No action |
| 1,000 – 20,000 | Map framerate drops, initial payload > 200KB | **Phase A** |
| 20,000 – 500,000 | Client clustering CPU > 100ms, LCP regresses | **Phase B** |
| > 500,000 | Server-side full-scan queries > 500ms | **Phase C** |

---

## Phase A — Client clustering + lean payload

**Aim**: smooth map up to ~50k–100k pins with no new infrastructure.

- Trim `BuildPlatformMap` response to the minimum: `{ id, slug, lat, lng, plan_tier }`. Drop `org_name`, `city`, `state`, `country` from the initial payload.
- Add `GET /admin/platform-pulse/map/workspace/{id}` for the popup — called only when a pin is clicked. Returns the full metadata.
- Wrap the action in `Cache::remember('platform-pulse-map:<filters-hash>', 300, ...)` with a 5-min TTL.
- Frontend: install `supercluster` (or `use-supercluster`), replace per-pin Markers with cluster bubbles that carry a count. Zooming in explodes clusters into smaller clusters or individual pins.
- Defer the no-location sidebar to a separate lazy call on open.

**Estimate**: half a day.

---

## Phase B — Bbox-viewport API + server clustering

**Aim**: handle millions of pins with bounded payload regardless of zoom.

- Endpoint becomes `GET /map?bbox=west,south,east,north&zoom=N&tier=...`.
- **Low zoom** (e.g. < 7): server returns pre-aggregated grid cells (hex or quadtree). Payload stays under ~500 cells.
- **High zoom** (≥ 7): server returns individual pins **within bbox** only, capped at `LIMIT 2000`.
- Precompute the grid-cell aggregates in a materialised `platform_map_cells` table, refreshed by a scheduled job (piggyback on the existing `platform-pulse:refresh-metrics` cron).
- Cache keyed by `(bbox snapped to grid, zoom bucket, plan-tier filter)`, 5-min TTL. Redis preferred once we have it; database cache driver is fine until then.
- Frontend emits viewport-change events, refetches with bbox query params. TanStack Query dedupes identical viewport hits.

**Estimate**: 2–3 days.

---

## Phase C — Spatial index + vector tiles

**Aim**: edge-rendered performance at continental scale.

- Add `GIST` index on `workspaces.location` (PostGIS `geography(Point)` column).
- Generate vector tiles server-side via `pg_tileserv` or a custom tile endpoint returning `.mvt`.
- Frontend switches from per-pin Markers to a MapLibre `source: "vector"` layer — rendering happens in the WebGL pipeline, not React DOM.
- Clustering done via MapLibre's native `cluster: true` property on the source.

**Estimate**: 1 week plus PostGIS enablement.

---

## Do-not-build-until checklist (Phase A)

Before starting Phase A, confirm **at least two** of:
- [ ] Pin count exceeds 1,000 across the platform
- [ ] Lighthouse mobile score on `/admin/map` < 70
- [ ] Users report map feeling laggy
- [ ] `/admin/platform-pulse/map` response exceeds 200 KB

Until those hit, clustering is premature.

---

## Related code

- `app/Actions/Admin/PlatformPulse/BuildPlatformMap.php` — current lean-but-unoptimised query
- `frontend/src/components/admin/platform-pulse/platform-map.tsx` — where the marker rendering happens
- `frontend/src/hooks/use-platform-pulse.ts` — `usePlatformPulseMap` hook, currently staleTime 5 min, no polling

## Not covered here

- **Address capture**: most workspaces today fall back to country centroid. Street-level geocoding is a separate epic — see workspace onboarding flow, not map performance.
- **Popup metadata privacy**: at scale, exposing workspace names across tenants is a super-admin-only concern; no change needed.
