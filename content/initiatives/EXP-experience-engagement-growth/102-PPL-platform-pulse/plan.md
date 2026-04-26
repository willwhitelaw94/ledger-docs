---
title: "Implementation Plan: Platform Pulse"
---

# Implementation Plan: Platform Pulse

**Spec**: [./spec.md](./spec.md)
**Created**: 2026-04-19
**Status**: Draft

## Technical Context

### Technology Stack

- **Backend**: Laravel 12, PHP 8.4, PostgreSQL (local dev), Spatie event-sourcing v7
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind v3, shadcn/ui, TanStack Query v5, Zustand v5
- **Scheduler**: Laravel scheduler (`routes/console.php`) running Artisan command every 5 min for metrics, daily for history snapshot
- **Map**: MapLibre GL JS (open/free, no licensing) with OpenFreeMap tiles or self-hosted
- **Graph**: Reuse Node Graph Engine (epic 071-NOD) if available in `frontend/src/components/`; fall back to React Flow (`reactflow` npm) if 071-NOD is not yet built
- **Animation**: Custom CountUp hook using `requestAnimationFrame`; respects `prefers-reduced-motion`

### Dependencies

- **002-CLE Core Ledger Engine** (complete) — `AccountBalance`, `JournalEntry`, `JournalEntryLine` tables
- **003-AUT Auth & Multi-tenancy** (complete) — `is_super_admin` on users, `/admin` route gating
- **011-MCY Multi-Currency** (complete) — `exchange_rates` table for FX conversion
- **071-NOD Node Graph Engine** — **STATUS NEEDS VERIFICATION**: no files found in `frontend/src/components/` matching `node-graph` or `NodeGraph`. Memory claims it's complete but search finds it only in `routes/api.php`. Plan mitigates by making Phase 3 dependent on verified 071-NOD, with React Flow fallback.
- **Workspace address data** — existing `country` column confirmed; street/city/postcode audit needed in Phase 2

### Constraints

- **Performance**: Metrics API responds in < 200ms (reads from materialised table, no recomputation). Map renders 10K pins via clustering. Graph stays responsive to 500 nodes.
- **Privacy**: Pulse feed anonymises workspace name (first word, 20 char cap); entries over $1M suppressed amount.
- **Accessibility**: Respect `prefers-reduced-motion`. Ticker is a live region; screen-readers announce updated values.
- **Auth**: Every new endpoint under `/api/v1/admin/*` — existing `is_super_admin` middleware enforced.
- **Tenancy**: Metrics aggregate _across_ workspaces — explicitly crosses the tenant boundary. All aggregate queries must run outside the tenant scope using raw/unscoped queries.

---

## Gate 3: Architecture Pre-Check Notes

Running Gate 3 checklist against the **spec inputs**:

| Area | Finding | Action |
|------|---------|--------|
| Aggregate roots | No new aggregate roots — metrics derive from existing event-sourced JE + AccountBalance projector | None |
| Events | No new events | None |
| Projectors | **New**: `PlatformMetricsProjector` OR scheduled recompute. Decision: **scheduled recompute** (simpler, predictable, runs every 5m) | Documented |
| Multi-tenancy | Aggregates cross tenants — requires unscoped queries | Use `Workspace::query()->withoutGlobalScopes()` or direct DB facade |
| 071-NOD assumption | Cannot verify 071-NOD UI exists | Phase 3 gated on verification; fallback = React Flow |
| Map licensing | MapLibre + OpenFreeMap = no API key, no per-load cost | Documented |
| Currency mixing | Existing FX infra (011-MCY) handles it; no new columns needed | None |
| Permission model | `is_super_admin` already gates `/admin` — no new permissions | None |
| N+1 risk | Map endpoint must eager-load workspace.organisation; pulse feed must eager-load journalEntry.workspace | Call out in Phase 1 |

No RED FLAGS.

---

## Design Decisions

### Data Model (new tables)

#### `platform_metrics`

Materialised summary table, one row per metric.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `metric_key` | string | e.g. `aul`, `monthly_transaction_flow` |
| `value_cents` | bigint | All money as cents |
| `currency` | char(3) | Always `AUD` for now |
| `computation_rule` | text | Human-readable description of the rule used |
| `refreshed_at` | timestamp | |
| `excluded_workspace_count` | int | Workspaces excluded (e.g., missing FX rate) |

**Seed**: One row per metric key, inserted by migration.

#### `platform_metrics_history`

Append-only daily snapshot.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `metric_key` | string | FK-ish, not enforced |
| `snapshot_date` | date | Unique (metric_key, snapshot_date) |
| `value_cents` | bigint | |
| `currency` | char(3) | |

Index: `(metric_key, snapshot_date DESC)` for sparkline queries.

#### `platform_settings`

Key/value table, super-admin-owned.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `key` | string unique | e.g. `target.aul`, `target.monthly_transaction_flow` |
| `value` | jsonb | Flexible shape |
| `updated_by_user_id` | FK users | |
| `updated_at` | timestamp | |

**Seeded defaults**: `target.aul = 100_000_000_000` (cents = $1B), `target.monthly_transaction_flow = 10_000_000_000` (cents = $100M).

#### Workspace address — no new columns needed

Confirm `country` exists. If street/city/postcode missing, defer to a future epic; this plan relies on `country` as minimum viable data (country centroid fallback).

### API Contracts

All new endpoints under `/api/v1/admin/*`, protected by existing `is_super_admin` middleware.

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/v1/admin/platform-pulse/ticker` | `{ aul: { value_cents, target_cents, refreshed_at, history: [{date, value_cents}] }, flow: { ... }, excluded_workspaces: N }` |
| GET | `/api/v1/admin/platform-pulse/pulse` | `{ entries: [{ workspace_name_first_word, amount_cents \| null, posted_at, is_large: bool }] }` (20 most recent) |
| PUT | `/api/v1/admin/platform-pulse/targets` | Body: `{ key: string, value_cents: int }`; returns updated setting |
| GET | `/api/v1/admin/platform-pulse/map` | `{ pins: [{ workspace_id, name, org_name, plan_tier, lat, lng, location_source: 'address'\|'country_centroid' }], no_location: [{ workspace_id, name, org_name, plan_tier }] }` |
| GET | `/api/v1/admin/platform-pulse/graph` | `{ nodes: [{ id, type, label, plan_tier?, child_count }], edges: [{ from, to }] }` |

All responses use Laravel API Resources (no raw arrays). Types mirrored in `frontend/src/types/platform-pulse.ts`.

### Backend Work (Laravel)

**Actions** (Lorisleiva Actions, `AsAction` trait):
- `app/Actions/Admin/PlatformPulse/ComputeAul.php` — sums positive balances on asset-type ChartAccounts, converts to AUD, returns cents + excluded-workspace count
- `app/Actions/Admin/PlatformPulse/ComputeTransactionFlow.php` — sums absolute debit-line amounts from journal entries posted in last 30 days
- `app/Actions/Admin/PlatformPulse/RefreshPlatformMetrics.php` — orchestrator; calls both compute actions, writes to `platform_metrics`
- `app/Actions/Admin/PlatformPulse/SnapshotMetricsHistory.php` — reads current `platform_metrics`, appends to history
- `app/Actions/Admin/PlatformPulse/GetPulseFeed.php` — 20 most recent JEs, anonymises workspace name, redacts amounts > $1M
- `app/Actions/Admin/PlatformPulse/BuildPlatformMap.php` — assembles map pins + no-location list
- `app/Actions/Admin/PlatformPulse/BuildPlatformGraph.php` — assembles graph nodes + edges

**Artisan commands** (`app/Console/Commands/`):
- `platform-pulse:refresh-metrics` — runs every 5 min
- `platform-pulse:snapshot-history` — runs daily at 00:05

**Controller** (thin):
- `app/Http/Controllers/Api/Admin/PlatformPulseController.php` — 5 endpoints; delegates to actions

**Form Requests** (only for the PUT):
- `app/Http/Requests/Admin/UpdatePlatformTargetRequest.php` — validates `key` is known, `value_cents` is positive int

**Models** (new):
- `app/Models/Central/PlatformMetric.php`
- `app/Models/Central/PlatformMetricHistory.php`
- `app/Models/Central/PlatformSetting.php`

These are **central** (not tenant-scoped) — they describe the platform, not a workspace.

**Migrations**: 3 new migrations (platform_metrics, platform_metrics_history, platform_settings) + seeder for defaults.

**Seeder**: `database/seeders/PlatformSettingsSeeder.php` seeds default targets.

### Frontend Work (Next.js)

**Route**: Enhance `frontend/src/app/(admin)/admin/page.tsx`.

**Components** (new under `frontend/src/components/admin/platform-pulse/`):
- `PlatformPulseTicker.tsx` — hero band, two big numbers with progress bars + sparklines
- `MetricOdometer.tsx` — animated count-up, respects `prefers-reduced-motion`
- `MetricSparkline.tsx` — 30-day trend line via recharts
- `PulseFeed.tsx` — vertical scrolling list, auto-refresh via TanStack Query `refetchInterval: 60_000`
- `PlatformMap.tsx` — MapLibre wrapper with cluster layer
- `PlatformGraph.tsx` — reuses 071-NOD component; fallback wraps React Flow
- `PlatformMapTabs.tsx` — tabbed container (Geographic | Graph)
- `PlatformTargetsModal.tsx` — super-admin-only editor for targets

**Hooks** (new under `frontend/src/hooks/`):
- `usePlatformPulseTicker.ts` — TanStack Query, `refetchInterval: 5 * 60_000` (align with backend refresh cadence)
- `usePlatformPulsePulse.ts` — `refetchInterval: 60_000`
- `usePlatformPulseMap.ts` — cached; no polling
- `usePlatformPulseGraph.ts` — cached; no polling
- `useUpdatePlatformTarget.ts` — mutation, invalidates ticker on success

**Types** (new):
- `frontend/src/types/platform-pulse.ts` — all response types

**Utilities**:
- `frontend/src/lib/format-money.ts` — extend existing to support abbreviated format ($247M, $1.2B)
- `frontend/src/lib/country-centroids.ts` — static map of ISO country → [lat, lng]

### UI Component reuse notes

- Reuse `StatusTabs` or `Tabs` primitive for Geographic | Graph toggle
- Reuse `Card`, `CardHeader`, `CardContent`
- Reuse existing `Progress` component for target bars
- Reuse `Badge` for plan-tier chips in tooltips

---

## Implementation Phases

### Phase 1: Platform Pulse Ticker (P1) — Sprint 1

**Goal**: Ship the ticker band. Data exists; this is assembly.

- 3 new migrations (platform_metrics, platform_metrics_history, platform_settings)
- 3 models (Central)
- `ComputeAul`, `ComputeTransactionFlow`, `RefreshPlatformMetrics`, `SnapshotMetricsHistory`, `GetPulseFeed` actions
- Artisan commands + scheduler entries in `routes/console.php`
- `PlatformPulseController` with `ticker`, `pulse`, `targets` endpoints
- `UpdatePlatformTargetRequest` form request
- API Resources
- Frontend: `PlatformPulseTicker`, `MetricOdometer`, `MetricSparkline`, `PulseFeed`, `PlatformTargetsModal`
- TanStack Query hooks
- Admin overview page renders ticker above existing KPI cards
- Tests: unit tests for compute actions, feature tests for endpoints + auth, browser test for ticker render

### Phase 2: Platform Map — Geographic (P2) — Sprint 2

**Goal**: Pins on a map.

- `BuildPlatformMap` action
- `map` endpoint
- `country-centroids.ts` static data
- `PlatformMapTabs`, `PlatformMap` components
- MapLibre GL integration (install `maplibre-gl` + `react-map-gl`)
- Plan-tier filter UI
- "No location" sidebar
- Tests: feature test for map endpoint, browser test for map render + click pin

### Phase 3: Platform Map — Graph (P3) — Sprint 3

**Goal**: Node graph.

- **Gating check**: verify 071-NOD component exists in `frontend/src/components/`. If not, either (a) build 071-NOD first as a prerequisite, or (b) substitute React Flow and update 071-NOD status to "deferred"
- `BuildPlatformGraph` action
- `graph` endpoint
- `PlatformGraph` component
- Accounts toggle (default off)
- Tests: feature test for graph endpoint, browser test for toggle

---

## Testing Strategy

### Phase 1 tests

**Unit**
- `ComputeAul` — with mixed-currency workspaces, excluded workspace count
- `ComputeTransactionFlow` — trailing-30-day window correctness, debit-only summation
- `GetPulseFeed` — anonymisation (first word), large-entry amount suppression

**Feature**
- `GET /api/v1/admin/platform-pulse/ticker` — 200 for super admin, 403 for non-super-admin
- `GET /api/v1/admin/platform-pulse/pulse` — shape assertions, ordering
- `PUT /api/v1/admin/platform-pulse/targets` — validation + persistence
- Empty platform case — endpoints respond with zeros, no errors

**Browser (Playwright)**
- Super admin opens `/admin` → ticker headline numbers render
- Odometer animates on load
- Targets modal editable by super admin
- `prefers-reduced-motion` suppresses odometer animation

### Phase 2 tests

**Feature**
- Map endpoint returns pins + no-location
- Filter by plan tier

**Browser**
- Open map tab → pins visible
- Click pin → tooltip shows workspace metadata
- No-location sidebar visible

### Phase 3 tests

**Feature**
- Graph endpoint returns expected node/edge count

**Browser**
- Toggle accounts → accounts nodes appear/disappear
- Pan/zoom responsive

### Test Execution Checklist

- [ ] Phase 1: unit + feature passing
- [ ] Phase 1: browser passing
- [ ] Phase 2: feature + browser passing
- [ ] Phase 3: feature + browser passing
- [ ] Full suite green before merge

---

## Gate 3 Post-Check

| # | Check | Status | Note |
|---|-------|--------|------|
| 1 | Vertical slice identified | PASS | Phase 1 ships value on its own |
| 2 | Aggregate boundary respected | N/A | No new aggregates |
| 3 | Events are granular facts | N/A | No new events |
| 4 | Projectors identified | PASS | Scheduled recompute chosen over projector (documented) |
| 5 | Single projector queue | N/A | Not using projector |
| 6 | Multi-tenancy: tenant scoping | PASS | Explicitly crosses tenant boundary; aggregate queries use unscoped DB access |
| 7 | Central vs tenant separation clear | PASS | All 3 new tables are central (not workspace-scoped) |
| 8 | Frontend TypeScript types | PASS | `types/platform-pulse.ts` defined, no `any` |
| 9 | API Resources used | PASS | All responses via Resource classes |
| 10 | Form Requests for mutations | PASS | `UpdatePlatformTargetRequest` for PUT |
| 11 | Lorisleiva Actions used | PASS | All business logic in AsAction classes |
| 12 | No hardcoded UI business logic | PASS | Targets come from API |
| 13 | Performance: N+1 prevented | PASS | Eager-loads called out for map + pulse |
| 14 | Server vs client components explicit | PASS | `/admin/page.tsx` is client (useAuth); platform-pulse components are client (TanStack Query) |
| 15 | Forms use RHF + Zod | PASS | Targets modal uses RHF + Zod |
| 16 | State: TanStack for server, Zustand for client | PASS | No new Zustand stores needed |

**Gate 3 result**: PASS

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| 071-NOD component doesn't actually exist yet | Medium | High (blocks Phase 3) | Verify in Phase 3 kickoff; substitute React Flow if needed |
| Aggregate query slow on large platform | Low | Medium | Scheduled recompute, not per-request; add index on `journal_entries.posted_at` if missing |
| MapLibre + OpenFreeMap rate limits | Low | Low | Self-host tiles if ever hit; easy swap |
| Pulse feed leaks customer identity via workspace name | Low | High | First-word truncation + $1M amount suppression, reviewed in Phase 1 QA |
| Mixed-currency accuracy | Medium | Low | Exchange rate staleness shown explicitly via `excluded_workspace_count` |
| Animation causes motion-sickness | Low | Medium | `prefers-reduced-motion` respected |
| Country-centroid pins misleading | Medium | Low | Always paired with "No location" sidebar nudge |

---

## Next Steps

1. Run `/speckit-tasks` to generate the task breakdown
2. Verify 071-NOD status before committing to Phase 3 approach
3. Begin Phase 1 implementation (backend actions first, then frontend)
