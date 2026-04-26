---
title: "Idea Brief: Map Performance & Scale"
---

# Idea Brief: Map Performance & Scale

**Created**: 2026-04-19
**Author**: Will Whitelaw
**Epic Code**: 103-MPS
**Initiative**: FL-financial-ledger
**Parent Epic**: [102-PPL Platform Pulse](/initiatives/FL-financial-ledger/102-PPL-platform-pulse) — see [scale-plan.md](/initiatives/FL-financial-ledger/102-PPL-platform-pulse/scale-plan)

---

## Problem Statement (What)

The Entity Map at `/admin/map` ships with 102-PPL as a lean, unoptimised MVP — one DOM marker per workspace, all metadata returned in one payload, no caching, no viewport awareness. It works at demo scale (~8 pins) and falls apart at platform scale.

- **Payload bloat** — every request returns full metadata for every workspace (org name, city, state, country, plan tier) regardless of whether the user ever clicks a pin
- **DOM marker rendering** — `react-map-gl` Marker components are React DOM nodes; framerate collapses above ~1k pins on mid-range hardware
- **No caching** — every super-admin page load recomputes the full map from the workspaces table
- **No viewport awareness** — zooming to Sydney still fetches pins from Perth, London, and Auckland
- **Low-zoom illegibility** — at continental zoom, Australia becomes a solid red blob of overlapping markers with no clustering
- **Unbounded query** — `Workspace::withoutGlobalScopes()->get()` will scan the entire table on a platform with millions of workspaces

**Current State**: ~8 demo pins. Fine today. Untested above 1k workspaces. The parent epic (102-PPL) explicitly deferred scaling to a follow-up — that follow-up is this epic.

---

## Possible Solution (How)

Three progressive phases, each gated by real-world trigger thresholds. Ship Phase A now (as a preventive measure and platform polish), hold Phase B until pin count warrants it, hold Phase C until continental-scale performance matters.

- **Phase A — Client clustering + lean payload**: trim `BuildPlatformMap` to `{ id, slug, lat, lng, plan_tier }` only; add popup-detail endpoint; wrap in 5-min cache; frontend uses `supercluster` (already installed) to cluster pins above 100 records
- **Phase B — Bbox-viewport API + server clustering**: endpoint accepts `bbox` + `zoom` params; low-zoom returns pre-aggregated grid cells from a materialised `platform_map_cells` table; high-zoom returns pins within viewport capped at 2000; cache keyed on snapped-bbox + zoom bucket
- **Phase C — Spatial index + vector tiles**: add PostGIS `geography(Point)` column + GIST index; generate `.mvt` vector tiles server-side; MapLibre renders via WebGL source instead of per-pin React Markers

**Example**:
```
// Before (102-PPL MVP)
GET /admin/platform-pulse/map
→ { pins: [ { id, name, slug, org_name, plan_tier, city, state, country, lat, lng }, ... 50,000 items ] }
→ 50,000 DOM Markers mounted at once, framerate ~5 fps at continental zoom

// After Phase A (this epic)
GET /admin/platform-pulse/map  (cached 5 min)
→ { pins: [ { id, slug, lat, lng, plan_tier }, ... ] }  ← 70% smaller payload
→ supercluster groups into ~50 cluster bubbles at zoom 3, explodes on zoom-in
→ Click pin: GET /admin/platform-pulse/map/workspace/{id} for full metadata

// After Phase B
GET /admin/platform-pulse/map?bbox=144.9,-38.1,145.3,-37.7&zoom=10
→ Server returns ≤2000 pins for that viewport, cached per snapped bbox
```

---

## Benefits (Why)

**User/Client Experience**:
- Map loads and pans smoothly even with 1M+ workspaces — no freeze, no loading spinner for 10 seconds
- Low-zoom view is readable (clusters with counts) rather than a solid blob
- Popup opens instantly (metadata fetched lazily, not shipped upfront)

**Operational Efficiency**:
- Server response time stays bounded regardless of platform size (viewport-limited, cache-hit likely)
- No surprise DB load when investor demos happen on a platform with lots of workspaces
- DB cache driver adequate for Phase A/B; Redis only required if/when we exceed multi-node deploy

**Business Value**:
- Removes a known scale cliff before it becomes a production incident
- Investor demos stay credible at any platform size — a demo-killer bug prevented
- Geographic map becomes a reusable pattern for future maps (entity concentration, practice client reach)

**ROI**: Not a direct-revenue feature. Strategic ROI: prevents platform-pulse map from becoming unusable at growth, preserves demo credibility, unblocks the universal-ledger vision's scale narrative.

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | Will Whitelaw (PO, Dev) |
| **A** | Will Whitelaw |
| **C** | — |
| **I** | — |

---

## Assumptions & Dependencies, Risks

**Assumptions**:
- 102-PPL MVP (`BuildPlatformMap`, `/admin/platform-pulse/map` endpoint, `platform-map.tsx`) is shipped and stable
- `supercluster` npm package (already in `frontend/package.json`) is sufficient for client clustering up to ~50–100k pins
- Laravel cache (DB driver today, Redis later) and existing `platform-pulse:refresh-metrics` scheduler are reusable for Phase B cell aggregation
- "More than 100 records = cluster" is a hard product requirement, not a preference

**Dependencies**:
- **102-PPL Platform Pulse** (complete) — map MVP
- **Phase C only**: PostGIS extension enabled on PostgreSQL (local dev uses vanilla PostgreSQL; enabling PostGIS is a separate infra decision)
- Existing `SetWorkspaceContext` middleware + `is_super_admin` gate — no changes needed

**Risks**:
- **Phase C PostGIS scope** (MEDIUM) → Mitigation: treat PostGIS enablement as a separate epic gated by Phase B metrics; do not bundle PostGIS migration into this epic unless a dedicated decision point approves it
- **Cache invalidation races** (LOW) → Mitigation: 5-min TTL is short enough that stale pins are acceptable; no explicit bust on workspace create
- **Premature optimisation** (MEDIUM) → Mitigation: scale-plan's "do-not-build-until" checklist applied per phase; Phase B only starts when Phase A hits trigger thresholds
- **Supercluster memory on huge datasets** (LOW) → Mitigation: Phase B (server clustering) takes over before client-side supercluster gets overwhelmed

---

## Estimated Effort

**~2 sprints / ~3 weeks total** (phased — Phase A is immediate, B/C deferred until triggers hit)

- **Phase A — Client clustering + lean payload**: half a day (1–2 story points). Ship now regardless of pin count as a polish + pre-emptive measure.
- **Phase B — Bbox-viewport API + server clustering**: 2–3 days (5–8 story points). Hold until pin count > 20k OR client-side clustering CPU > 100ms.
- **Phase C — PostGIS + vector tiles**: 1 week + PostGIS enablement (8–13 story points). Hold until pin count > 500k OR continental-zoom latency > 500ms. **May be split off as its own epic depending on PostGIS infra decision.**

---

## Proceed to PRD?

**YES** — most of the analysis already exists in 102-PPL's `scale-plan.md`. SDD process formalises the 100-record clustering requirement, locks the API contract for Phase B, and ensures Phase C's PostGIS scope is explicitly decided rather than drifting in.

---

## Decision

- [x] **Approved** - Proceed to PRD
- [ ] **Needs More Information** - —
- [ ] **Declined** - —

**Approval Date**: 2026-04-19

---

## Next Steps

**If Approved**:
1. [x] `/trilogy-idea-handover` — Gate 0 (meta.yaml, Linear skipped — FL initiative has no Linear project)
2. [x] `/speckit-specify` — generate spec.md
3. [x] `/trilogy-clarify spec` — self-clarified (10 questions answered inline)
4. [ ] `/trilogy-spec-handover` — Gate 1
5. [ ] `/speckit-tasks` — break into implementation tasks
6. [ ] `/speckit-implement` — build Phase A

---

**Notes**: `supercluster` was installed in `frontend/package.json` mid-session before this epic was formalised — it's ready to use for Phase A without additional install. The 100-record clustering threshold is treated as a hard FR (FR-007) in the spec, not a soft preference.
