---
title: "Implementation Plan: Consolidation & Family Tree"
---

# Implementation Plan: Consolidation & Family Tree

**Branch**: `feature/028-CFT-consolidation-family-tree` | **Date**: 2026-03-15 | **Spec**: [spec.md](./spec.md)

## Summary

Transform workspace groups into a hierarchical wealth management surface. Six capability areas: group hierarchy with parent/child relationships, consolidated balance sheet engine, consolidated P&L and net worth, inter-entity elimination, invitable groups with tiered permissions (Manager/Viewer/Entity Viewer), and the "My Net Worth" auto-group. Builds on 027-PMV's flat group infrastructure and 007-FRC's reporting engine.

## Technical Context

**Language/Version**: PHP 8.4 (Laravel 12), TypeScript (Next.js 16, React 19)
**Primary Dependencies**: Existing balance sheet/P&L report generation (007-FRC), workspace groups (027-PMV), chart of accounts classification system
**Storage**: SQLite (local), single-database multi-tenancy
**Testing**: Pest v4 (feature tests)
**Performance**: Consolidated data cached with 5-minute TTL (Laravel Cache)
**Constraints**: Same-currency consolidation only in v1, "Combined view — not audited" disclaimer

---

## Data Model

### Modified Tables

#### `workspace_group_members` (extend from 027-PMV)

| Column | Type | Notes |
|--------|------|-------|
| parent_member_id | FK workspace_group_members | nullable, self-referencing, nullOnDelete |
| relationship_type | string | nullable: subsidiary, related, personal |

#### `workspace_groups` (extend from 027-PMV)

| Column | Type | Notes |
|--------|------|-------|
| commentary | text | nullable — pinned note from Manager visible to Viewers |
| allow_magic_link | boolean | default false — group-level auth setting |
| is_virtual | boolean | default false — true for auto-generated "My Net Worth" groups |

### New Tables

#### `group_member_users`

Links users to groups with tiered roles. Separate from workspace_users — this is group-level access.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| workspace_group_id | FK workspace_groups | cascadeOnDelete |
| user_id | FK users | cascadeOnDelete |
| role | string | manager, viewer, entity_viewer |
| entity_scope_workspace_id | FK workspaces | nullable — only for entity_viewer role |
| show_amounts | boolean | default true — false means percentages only |
| invited_by_user_id | FK users | nullable |
| accepted_at | timestamp | nullable |
| magic_link_token | string(64) | nullable, unique |
| magic_link_expires_at | timestamp | nullable |
| created_at, updated_at | timestamps | |

Unique: `[workspace_group_id, user_id]`

#### `inter_entity_eliminations`

Pairs of accounts across workspaces marked for exclusion from consolidation.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| workspace_group_id | FK workspace_groups | cascadeOnDelete |
| workspace_a_id | FK workspaces | cascadeOnDelete |
| account_a_id | FK chart_accounts | cascadeOnDelete |
| workspace_b_id | FK workspaces | cascadeOnDelete |
| account_b_id | FK chart_accounts | cascadeOnDelete |
| amount | integer | cents |
| status | string | active, out_of_balance |
| created_by_user_id | FK users | nullable |
| created_at, updated_at | timestamps | |

#### `net_worth_snapshots`

Monthly snapshots for trend reporting.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| workspace_group_id | FK workspace_groups | cascadeOnDelete |
| snapshot_date | date | first of month |
| total_assets | integer | cents |
| total_liabilities | integer | cents |
| net_worth | integer | cents |
| per_entity | json | array of {workspace_id, assets, liabilities, net} |
| created_at | timestamp | |

Unique: `[workspace_group_id, snapshot_date]`

---

## API Contracts

### Group Hierarchy

| Method | Path | Action | Notes |
|--------|------|--------|-------|
| GET | `/v1/practice/groups/{id}/tree` | `tree` | Nested tree structure |
| PATCH | `/v1/practice/groups/{id}/members/{memberId}/parent` | `setParent` | Set parent_member_id |
| PATCH | `/v1/practice/groups/{id}/members/{memberId}/relationship` | `setRelationship` | Set relationship_type |

### Consolidated Reports

| Method | Path | Action | Notes |
|--------|------|--------|-------|
| GET | `/v1/groups/{id}/consolidated/balance-sheet` | `balanceSheet` | Cached, aggregated by account classification |
| GET | `/v1/groups/{id}/consolidated/pnl` | `pnl` | Date range params |
| GET | `/v1/groups/{id}/consolidated/net-worth` | `netWorth` | Current + trend data |
| POST | `/v1/groups/{id}/consolidated/refresh` | `refresh` | Bust cache |

### Eliminations

| Method | Path | Action | Notes |
|--------|------|--------|-------|
| GET | `/v1/groups/{id}/eliminations` | `index` | List active eliminations |
| POST | `/v1/groups/{id}/eliminations` | `store` | Create elimination pair |
| DELETE | `/v1/groups/{id}/eliminations/{eliminationId}` | `destroy` | Remove elimination |

### Group Invitations

| Method | Path | Action | Notes |
|--------|------|--------|-------|
| GET | `/v1/groups/{id}/members` | `index` | List group member users |
| POST | `/v1/groups/{id}/invite` | `invite` | Invite by email with role + show_amounts |
| DELETE | `/v1/groups/{id}/members/{userId}` | `revoke` | Revoke access |
| PATCH | `/v1/groups/{id}/settings` | `updateSettings` | commentary, allow_magic_link |
| GET | `/v1/groups/magic/{token}` | `magicLogin` | Magic link auth + redirect |

### My Net Worth

| Method | Path | Action | Notes |
|--------|------|--------|-------|
| GET | `/v1/my-net-worth` | `summary` | Widget data: net worth, entity breakdown |
| GET | `/v1/my-net-worth/detail` | `detail` | Full page data: trend, allocation, per-entity |

### Group Dashboard (Viewer)

| Method | Path | Action | Notes |
|--------|------|--------|-------|
| GET | `/v1/groups/{id}/dashboard` | `dashboard` | Role-adaptive: full for Manager, summary for Viewer |

---

## Implementation Phases

### Phase 1: Group Hierarchy (Sprint 1)

**Backend:**
- Migration: add `parent_member_id`, `relationship_type` to `workspace_group_members`
- Migration: add `commentary`, `allow_magic_link`, `is_virtual` to `workspace_groups`
- Action: `SetGroupMemberParent` — validate no circular refs, set parent_member_id
- Action: `GetGroupTree` — recursive query returning nested tree
- Controller: extend `WorkspaceGroupController` with `tree`, `setParent`, `setRelationship`
- Validation: circular hierarchy prevention (walk up parent chain)

**Frontend:**
- Family tree component: custom SVG/CSS (no library). Flexbox-positioned `<div>` nodes with SVG connector lines. Lightweight — max 4-10 nodes, 2-3 levels.
- Manager mode: drag to rearrange (HTML5 drag events, no @dnd-kit), right-click context menu for actions
- Viewer mode: read-only tree display

**Tests:** 6 tests (hierarchy CRUD, circular prevention, tree API, orphan promotion)

### Phase 2: Consolidation Engine (Sprint 2-3)

**Backend:**
- Service: `ConsolidationEngine` — core engine that aggregates balance sheet data across workspaces
  - Fetches balance sheet for each member workspace (reuses 007-FRC report generation)
  - Matches accounts by account_type + classification (not code)
  - Returns aggregated lines with per-workspace breakdown
  - Caches result with 5-minute TTL using `Cache::remember()`
- Action: `GetConsolidatedBalanceSheet` — calls engine, returns formatted data
- Action: `GetConsolidatedPnl` — same pattern for P&L with date range
- Action: `CalculateNetWorth` — total assets minus total liabilities
- Controller: `ConsolidatedReportController` (balance sheet, P&L, net worth, refresh)
- Resource: `ConsolidatedBalanceSheetResource`, `ConsolidatedPnlResource`

**Frontend:**
- Consolidated balance sheet page with drill-down (click line → per-workspace breakdown)
- Consolidated P&L with date range picker
- Net worth display (headline number)

**Tests:** 8 tests (aggregation accuracy, classification matching, cache behaviour, empty workspaces, drill-down data)

### Phase 3: Net Worth Snapshots & Trend (Sprint 3)

**Backend:**
- Migration: create `net_worth_snapshots` table
- Action: `GenerateNetWorthSnapshots` — queries all groups, calculates net worth, stores snapshot
- Command: `GenerateMonthlyNetWorthSnapshots` — scheduled 1st of each month
- Action: `GetNetWorthTrend` — returns 12-month snapshot history + current live calculation
- Register schedule in `routes/console.php`

**Frontend:**
- Net worth trend chart (line chart, 12 months)
- Month-over-month change indicator

**Tests:** 4 tests (snapshot generation, trend data, schedule runs, live + historical)

### Phase 4: Inter-Entity Elimination (Sprint 4)

**Backend:**
- Migration: create `inter_entity_eliminations` table
- Model: `InterEntityElimination`
- Action: `CreateElimination` — validate accounts exist in different workspaces within same group
- Action: `RemoveElimination`
- Action: `DetectOutOfBalanceEliminations` — flag mismatched amounts
- Update `ConsolidationEngine` to subtract eliminations from consolidated totals
- Controller: `EliminationController` (CRUD)

**Frontend:**
- Elimination management panel (accessible from consolidated balance sheet)
- "Less: Inter-entity eliminations" line on consolidated view
- Out-of-balance warning badge

**Tests:** 6 tests (create, remove, effect on consolidation, out-of-balance detection)

### Phase 5: Group Invitations & Permissions (Sprint 5)

**Backend:**
- Migration: create `group_member_users` table
- Model: `GroupMemberUser`
- Action: `InviteToGroup` — send email with role, show_amounts setting
- Action: `AcceptGroupInvitation`
- Action: `RevokeGroupAccess`
- Action: `GenerateMagicLink` — create token, send email with one-click login URL
- Action: `AuthenticateMagicLink` — validate token, create session, redirect to group dashboard
- Middleware: `GroupAccessMiddleware` — check user has group access, inject role into request
- Update all group endpoints to respect role-based access (Manager sees all, Viewer sees summary)

**Frontend:**
- Invite dialog (email, role selector, show_amounts toggle)
- Group members list with role badges, revoke action
- Group settings panel (commentary editor, magic link toggle)
- Magic link landing page

**Tests:** 8 tests (invite, accept, revoke, magic link auth, role-based access, show_amounts toggle)

### Phase 6: Group Dashboard & My Net Worth (Sprint 6)

**Backend:**
- Action: `GetGroupDashboard` — role-adaptive data (full for Manager, summary for Viewer)
- Action: `GetMyNetWorth` — auto-group calculation for current user's owned workspaces
- Controller: `GroupDashboardController` (dashboard, "view as client" toggle)
- Controller: `MyNetWorthController` (summary widget, full detail page)
- Asset allocation mapping: account classifications → friendly categories (Property, Cash, Investments, Super, Vehicles, Other)

**Frontend:**
- Group dashboard page (`/groups/{id}`) — two modes:
  - Manager: net worth, family tree, consolidated summary, entity cards, management controls
  - Viewer: net worth headline, entity breakdown bars, trend chart, asset allocation, commentary note, "Combined view — not audited" footer
- "View as Client" toggle for Managers
- `/net-worth` page — full personal net worth dashboard
- Dashboard widget — "My Net Worth: $X" banner on workspace dashboard
- Entity detail card (simplified: Total Assets, Total Liabilities, Net Position, top categories)

**Tests:** 6 tests (Manager vs Viewer content, auto-group generation, asset allocation mapping, widget data)

---

## Testing Strategy

| Phase | Feature Tests |
|-------|---------------|
| 1 Hierarchy | 6 |
| 2 Consolidation | 8 |
| 3 Snapshots | 4 |
| 4 Eliminations | 6 |
| 5 Invitations | 8 |
| 6 Dashboard | 6 |
| **Total** | **38** |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Consolidation accuracy errors | Medium | High | Extensive test coverage with known-value fixtures; "not audited" disclaimer |
| Cross-workspace query performance | Medium | Medium | 5-min cache TTL; pre-compute snapshots monthly; index account classifications |
| Elimination logic edge cases | High | Medium | v1 manual-only; out-of-balance detection flags issues for accountant review |
| Magic link security | Low | High | 24hr expiry, single-use tokens, always goes through auth (never public) |
| Chart of accounts classification gaps | Medium | Low | Fallback to account type if classification missing; "Uncategorised" bucket |
