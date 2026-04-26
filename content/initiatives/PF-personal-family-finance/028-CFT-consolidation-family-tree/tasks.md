---
title: "Implementation Tasks: Consolidation & Family Tree"
---

# Implementation Tasks: Consolidation & Family Tree

**Mode**: AI (agent-executable)
**Generated**: 2026-03-15
**Total Tasks**: 62
**Stories**: US1–US7

---

## Phase 1: Foundation — Migrations & Models

- [ ] T001 Migration: add columns to `workspace_group_members` — parent_member_id (FK self nullable nullOnDelete), relationship_type (string nullable). File: `database/migrations/2026_03_15_400001_add_hierarchy_to_workspace_group_members.php`

- [ ] T002 [P] Migration: add columns to `workspace_groups` — commentary (text nullable), allow_magic_link (boolean default false), is_virtual (boolean default false). File: `database/migrations/2026_03_15_400002_add_group_settings.php`

- [ ] T003 [P] Migration: create `group_member_users` — id, workspace_group_id (FK cascadeOnDelete), user_id (FK cascadeOnDelete), role (string: manager/viewer/entity_viewer), entity_scope_workspace_id (FK nullable), show_amounts (boolean default true), invited_by_user_id (FK nullable), accepted_at (timestamp nullable), magic_link_token (string(64) nullable unique), magic_link_expires_at (timestamp nullable), timestamps. Unique: [workspace_group_id, user_id]. File: `database/migrations/2026_03_15_400003_create_group_member_users_table.php`

- [ ] T004 [P] Migration: create `inter_entity_eliminations` — id, workspace_group_id (FK cascadeOnDelete), workspace_a_id (FK cascadeOnDelete), account_a_id (FK chart_accounts cascadeOnDelete), workspace_b_id (FK cascadeOnDelete), account_b_id (FK chart_accounts cascadeOnDelete), amount (integer), status (string default 'active'), created_by_user_id (FK nullable), timestamps. File: `database/migrations/2026_03_15_400004_create_inter_entity_eliminations_table.php`

- [ ] T005 [P] Migration: create `net_worth_snapshots` — id, workspace_group_id (FK cascadeOnDelete), snapshot_date (date), total_assets (integer), total_liabilities (integer), net_worth (integer), per_entity (json), created_at (timestamp). Unique: [workspace_group_id, snapshot_date]. File: `database/migrations/2026_03_15_400005_create_net_worth_snapshots_table.php`

- [ ] T006 Update model `WorkspaceGroup` — add fillable: commentary, allow_magic_link, is_virtual. Add casts: allow_magic_link → boolean, is_virtual → boolean. Add relations: memberUsers() HasMany GroupMemberUser, eliminations() HasMany InterEntityElimination, snapshots() HasMany NetWorthSnapshot. Add scope: scopeVirtual($q) → where('is_virtual', true). File: `app/Models/Central/WorkspaceGroup.php`

- [ ] T007 [P] Update model `workspace_group_members` pivot — since this is a BelongsToMany pivot on WorkspaceGroup, we need a dedicated model. Create `WorkspaceGroupMember` model at `app/Models/Central/WorkspaceGroupMember.php` — fillable: workspace_group_id, workspace_id, parent_member_id, relationship_type. Relations: parent() BelongsTo self, children() HasMany self via parent_member_id, workspace() BelongsTo Workspace, group() BelongsTo WorkspaceGroup.

- [ ] T008 [P] Model: `GroupMemberUser` at `app/Models/Central/GroupMemberUser.php` — fillable: workspace_group_id, user_id, role, entity_scope_workspace_id, show_amounts, invited_by_user_id, accepted_at, magic_link_token, magic_link_expires_at. Casts: show_amounts → boolean, accepted_at → datetime, magic_link_expires_at → datetime. Relations: group() BelongsTo WorkspaceGroup, user() BelongsTo User, entityScope() BelongsTo Workspace, invitedBy() BelongsTo User.

- [ ] T009 [P] Model: `InterEntityElimination` at `app/Models/Central/InterEntityElimination.php` — fillable: workspace_group_id, workspace_a_id, account_a_id, workspace_b_id, account_b_id, amount, status, created_by_user_id. Relations: group(), workspaceA(), workspaceB(), accountA() BelongsTo ChartAccount, accountB() BelongsTo ChartAccount, createdBy().

- [ ] T010 [P] Model: `NetWorthSnapshot` at `app/Models/Central/NetWorthSnapshot.php` — fillable: workspace_group_id, snapshot_date, total_assets, total_liabilities, net_worth, per_entity. Casts: snapshot_date → date, per_entity → array. Relations: group().

- [ ] T011 Run `php artisan migrate` — verify all new tables and columns created.

---

## Phase 2: Group Hierarchy Actions & API

- [ ] T012 Action: `SetGroupMemberParent` at `app/Actions/Consolidation/SetGroupMemberParent.php` — handle(WorkspaceGroupMember $member, ?int $parentMemberId): WorkspaceGroupMember. Validate no circular ref (walk up parent chain). Set parent_member_id. File: `app/Actions/Consolidation/SetGroupMemberParent.php`

- [ ] T013 [P] Action: `GetGroupTree` at `app/Actions/Consolidation/GetGroupTree.php` — handle(WorkspaceGroup $group): array. Query all WorkspaceGroupMember for group, build nested tree structure. Return array of nodes with {id, workspace_id, workspace_name, entity_type, relationship_type, net_position, children: []}. File: `app/Actions/Consolidation/GetGroupTree.php`

- [ ] T014 Add hierarchy endpoints to `WorkspaceGroupController` — tree(WorkspaceGroup): calls GetGroupTree, returns JSON. setParent(Request, WorkspaceGroup, int $memberId): validates parent_member_id, calls SetGroupMemberParent. setRelationship(Request, WorkspaceGroup, int $memberId): validates relationship_type in:subsidiary,related,personal, updates directly.

- [ ] T015 Register routes in `routes/api.php` under practice prefix: GET practice/groups/{workspaceGroup}/tree, PATCH practice/groups/{workspaceGroup}/members/{memberId}/parent, PATCH practice/groups/{workspaceGroup}/members/{memberId}/relationship.

---

## Phase 3: Consolidation Engine

- [ ] T016 Service: `ConsolidationEngine` at `app/Services/ConsolidationEngine.php`. Methods: consolidatedBalanceSheet(WorkspaceGroup $group): array — fetches balance sheet for each member workspace using existing report generation, matches accounts by type+classification, sums amounts, returns aggregated lines with per-workspace breakdown. Uses Cache::remember() with 5-min TTL keyed by "group:{id}:balance_sheet".

- [ ] T017 [P] Method on ConsolidationEngine: consolidatedPnl(WorkspaceGroup $group, Carbon $from, Carbon $to): array — same pattern but for revenue/expense accounts within date range.

- [ ] T018 [P] Method on ConsolidationEngine: netWorth(WorkspaceGroup $group): array — calls consolidatedBalanceSheet, sums total_assets and total_liabilities, returns {total_assets, total_liabilities, net_worth, per_entity: [{workspace_id, name, assets, liabilities, net}]}.

- [ ] T019 [P] Method on ConsolidationEngine: applyEliminations(array $balanceSheet, WorkspaceGroup $group): array — query InterEntityElimination for group, subtract elimination amounts from consolidated totals, add "Less: Inter-entity eliminations" line.

- [ ] T020 Method on ConsolidationEngine: refreshCache(WorkspaceGroup $group): void — forget cache keys for balance sheet, P&L, net worth.

- [ ] T021 Action: `GetConsolidatedBalanceSheet` at `app/Actions/Consolidation/GetConsolidatedBalanceSheet.php` — wraps ConsolidationEngine::consolidatedBalanceSheet().

- [ ] T022 [P] Action: `GetConsolidatedPnl` at `app/Actions/Consolidation/GetConsolidatedPnl.php` — wraps engine.

- [ ] T023 [P] Action: `CalculateNetWorth` at `app/Actions/Consolidation/CalculateNetWorth.php` — wraps engine.

- [ ] T024 Resource: `ConsolidatedBalanceSheetResource` at `app/Http/Resources/ConsolidatedBalanceSheetResource.php` — formats aggregated lines with per-workspace drill-down.

- [ ] T025 [P] Resource: `ConsolidatedPnlResource` at `app/Http/Resources/ConsolidatedPnlResource.php`.

- [ ] T026 Controller: `ConsolidatedReportController` at `app/Http/Controllers/Api/ConsolidatedReportController.php` — methods: balanceSheet(WorkspaceGroup), pnl(Request, WorkspaceGroup) with from/to params, netWorth(WorkspaceGroup), refresh(WorkspaceGroup).

- [ ] T027 Register routes: GET groups/{workspaceGroup}/consolidated/balance-sheet, GET groups/{workspaceGroup}/consolidated/pnl, GET groups/{workspaceGroup}/consolidated/net-worth, POST groups/{workspaceGroup}/consolidated/refresh. Under auth:sanctum middleware.

---

## Phase 4: Net Worth Snapshots & Eliminations

- [ ] T028 Action: `GenerateNetWorthSnapshots` at `app/Actions/Consolidation/GenerateNetWorthSnapshots.php` — handle(): int. Query all non-virtual workspace_groups. For each, calculate net worth via engine, create NetWorthSnapshot with snapshot_date = first of current month. Skip if snapshot already exists for this month. Return count.

- [ ] T029 Command: `GenerateMonthlyNetWorthSnapshots` at `app/Console/Commands/GenerateMonthlyNetWorthSnapshots.php` — thin command calling GenerateNetWorthSnapshots::run().

- [ ] T030 Register schedule: `Schedule::command('consolidation:monthly-snapshots')->monthlyOn(1, '02:00');` in routes/console.php.

- [ ] T031 Action: `GetNetWorthTrend` at `app/Actions/Consolidation/GetNetWorthTrend.php` — handle(WorkspaceGroup $group): array. Query last 12 snapshots. Append current live net worth as "current month". Return array of {date, net_worth, total_assets, total_liabilities}.

- [ ] T032 [P] Action: `CreateElimination` at `app/Actions/Consolidation/CreateElimination.php` — handle(WorkspaceGroup $group, array $data): InterEntityElimination. Validate both workspaces are in the group. Create record. Refresh consolidation cache.

- [ ] T033 [P] Action: `RemoveElimination` at `app/Actions/Consolidation/RemoveElimination.php` — handle(InterEntityElimination $elimination): void. Delete. Refresh cache.

- [ ] T034 Controller: `EliminationController` at `app/Http/Controllers/Api/EliminationController.php` — index(WorkspaceGroup), store(Request, WorkspaceGroup), destroy(InterEntityElimination).

- [ ] T035 Register routes: GET/POST groups/{workspaceGroup}/eliminations, DELETE groups/{workspaceGroup}/eliminations/{elimination}. Under auth:sanctum.

---

## Phase 5: Group Invitations & Magic Links

- [ ] T036 Action: `InviteToGroup` at `app/Actions/Consolidation/InviteToGroup.php` — handle(WorkspaceGroup $group, User $inviter, string $email, string $role, bool $showAmounts = true, ?int $entityScopeWorkspaceId = null): GroupMemberUser. Find or validate user. Create GroupMemberUser with accepted_at = null. If group.allow_magic_link, generate magic_link_token (Str::random(64)) with 24hr expiry. Send invitation email.

- [ ] T037 [P] Action: `AcceptGroupInvitation` at `app/Actions/Consolidation/AcceptGroupInvitation.php` — handle(GroupMemberUser $membership): GroupMemberUser. Set accepted_at = now(). Return.

- [ ] T038 [P] Action: `RevokeGroupAccess` at `app/Actions/Consolidation/RevokeGroupAccess.php` — handle(GroupMemberUser $membership): void. Delete membership.

- [ ] T039 [P] Action: `AuthenticateMagicLink` at `app/Actions/Consolidation/AuthenticateMagicLink.php` — handle(string $token): array. Find GroupMemberUser by magic_link_token where expires_at > now(). Auth::login(user). Return {group_id, redirect_url}. Invalidate token after use.

- [ ] T040 Controller: `GroupInvitationController` at `app/Http/Controllers/Api/GroupInvitationController.php` — index(WorkspaceGroup), invite(Request, WorkspaceGroup), revoke(WorkspaceGroup, User), updateSettings(Request, WorkspaceGroup) for commentary + allow_magic_link.

- [ ] T041 [P] Controller: `MagicLinkController` at `app/Http/Controllers/Api/MagicLinkController.php` — authenticate(string $token) calls AuthenticateMagicLink, redirects to group dashboard.

- [ ] T042 Middleware: `GroupAccessMiddleware` at `app/Http/Middleware/GroupAccessMiddleware.php` — resolve group from route, check user has GroupMemberUser with accepted_at. Inject role and show_amounts into request attributes.

- [ ] T043 Register routes: GET/POST groups/{workspaceGroup}/invite, DELETE groups/{workspaceGroup}/members/{user}, PATCH groups/{workspaceGroup}/settings under auth:sanctum. GET groups/magic/{token} (public, no auth required). Apply GroupAccessMiddleware to consolidated report routes.

---

## Phase 6: Group Dashboard & My Net Worth

- [ ] T044 Action: `GetGroupDashboard` at `app/Actions/Consolidation/GetGroupDashboard.php` — handle(WorkspaceGroup $group, string $role, bool $showAmounts): array. If role=manager: return full data (net worth, tree, consolidated summary, entity cards, eliminations count, commentary). If role=viewer: return summary (net worth or percentages based on showAmounts, entity breakdown, trend, asset allocation, commentary). If role=entity_viewer: return single entity summary.

- [ ] T045 [P] Action: `GetMyNetWorth` at `app/Actions/Consolidation/GetMyNetWorth.php` — handle(User $user): array. Find or create virtual WorkspaceGroup for user (is_virtual=true). Add all user's owned workspaces. Calculate net worth via engine. Return {net_worth, entity_breakdown, trend}.

- [ ] T046 [P] Action: `MapAssetAllocation` at `app/Actions/Consolidation/MapAssetAllocation.php` — handle(array $balanceSheetLines): array. Map account classifications to friendly categories: Property, Cash & Bank, Investments, Superannuation, Vehicles & Equipment, Other Assets. Return [{category, amount, percentage}].

- [ ] T047 Controller: `GroupDashboardController` at `app/Http/Controllers/Api/GroupDashboardController.php` — dashboard(Request, WorkspaceGroup): reads role from middleware, calls GetGroupDashboard. viewAsClient(Request, WorkspaceGroup): forces viewer role regardless of actual role.

- [ ] T048 [P] Controller: `MyNetWorthController` at `app/Http/Controllers/Api/MyNetWorthController.php` — summary(Request): calls GetMyNetWorth, returns widget data. detail(Request): returns full data with trend + allocation.

- [ ] T049 Register routes: GET groups/{workspaceGroup}/dashboard (with GroupAccessMiddleware), GET groups/{workspaceGroup}/dashboard/preview (manager only). GET my-net-worth, GET my-net-worth/detail under auth:sanctum.

---

## Phase 7: Frontend — Hierarchy & Tree

- [ ] T050 Add TypeScript types to `frontend/src/types/index.ts` — GroupTreeNode {id, workspace_id, workspace_name, entity_type, relationship_type, net_position, children}, ConsolidatedLine {classification, label, amount, per_entity}, NetWorthData {total_assets, total_liabilities, net_worth, per_entity, trend}, AssetAllocation {category, amount, percentage}, GroupDashboardData {net_worth, tree, entity_breakdown, trend, asset_allocation, commentary, eliminations_count}, Elimination {id, workspace_a, account_a, workspace_b, account_b, amount, status}.

- [ ] T051 [P] Add hooks to `frontend/src/hooks/use-consolidation.ts` (new file) — useGroupTree(groupId), useSetMemberParent(groupId), useConsolidatedBalanceSheet(groupId), useConsolidatedPnl(groupId, from, to), useNetWorth(groupId), useRefreshConsolidation(groupId), useEliminations(groupId), useCreateElimination(groupId), useRemoveElimination(), useGroupDashboard(groupId), useGroupMembers(groupId), useInviteToGroup(groupId), useRevokeGroupAccess(groupId), useUpdateGroupSettings(groupId), useMyNetWorth(), useMyNetWorthDetail().

- [ ] T052 Create family tree component at `frontend/src/components/consolidation/family-tree.tsx` — renders GroupTreeNode[] as an interactive tree. Manager mode: draggable nodes. Viewer mode: read-only. Each node shows: entity name, type badge, net position, relationship label on connection lines.

---

## Phase 8: Frontend — Dashboard & Net Worth

- [ ] T053 Create group dashboard page at `frontend/src/app/(practice)/practice/groups/[id]/page.tsx` — role-adaptive. Manager view: net worth headline, family tree component, consolidated balance sheet summary (top accounts), consolidated P&L summary, entity cards with health metrics, management controls (invite, eliminations, settings). Viewer mode: net worth headline (big), entity breakdown bars with percentages, trend chart (line, 12 months), asset allocation (pie/donut), commentary note card, "Combined view — not audited" footer.

- [ ] T054 [P] Create /net-worth page at `frontend/src/app/(dashboard)/net-worth/page.tsx` — personal net worth dashboard. Big net worth number, entity breakdown, trend chart, asset allocation. Uses useMyNetWorthDetail(). Only shows for users with 2+ owned workspaces.

- [ ] T055 [P] Add "My Net Worth" widget to workspace dashboard — update `frontend/src/app/(dashboard)/dashboard/page.tsx` to show a banner card at the top: "My Net Worth: $X" with entity mini-breakdown and "View Details" link to /net-worth. Uses useMyNetWorth(). Only renders for users with 2+ workspaces.

- [ ] T056 [P] Create group invite dialog component at `frontend/src/components/consolidation/invite-to-group.tsx` — email input, role selector (Manager/Viewer/Entity Viewer), entity scope dropdown (only for Entity Viewer), show_amounts toggle. Uses useInviteToGroup().

- [ ] T057 [P] Create group settings panel at `frontend/src/components/consolidation/group-settings.tsx` — commentary textarea, allow_magic_link toggle, members list with role badges and revoke action. Uses useUpdateGroupSettings(), useGroupMembers().

- [ ] T058 [P] Create elimination management panel at `frontend/src/components/consolidation/elimination-panel.tsx` — list of active eliminations, "Add Elimination" form (select workspace A + account, workspace B + account, amount). Uses useEliminations(), useCreateElimination(), useRemoveElimination().

---

## Phase 9: Tests

- [ ] T059 Feature test `tests/Feature/Api/GroupHierarchyTest.php` — 6 tests: set parent, get tree, prevent circular, orphan promotion, set relationship type, remove parent.

- [ ] T060 [P] Feature test `tests/Feature/Api/ConsolidationTest.php` — 8 tests: consolidated balance sheet accuracy, account classification matching, per-workspace drill-down, cache hit/miss, empty workspace handling, P&L date range, net worth calculation, refresh cache.

- [ ] T061 [P] Feature test `tests/Feature/Api/EliminationTest.php` — 4 tests: create elimination, effect on consolidation, remove elimination, out-of-balance detection.

- [ ] T062 [P] Feature test `tests/Feature/Api/GroupInvitationTest.php` — 6 tests: invite viewer, invite entity viewer, accept invitation, revoke access, magic link auth, show_amounts toggle.

- [ ] T063 [P] Feature test `tests/Feature/Api/NetWorthTest.php` — 4 tests: monthly snapshot generation, trend data, auto-group for individuals, asset allocation mapping.

- [ ] T064 [P] Feature test `tests/Feature/Api/GroupDashboardTest.php` — 4 tests: manager vs viewer content, view-as-client toggle, commentary visible to viewers, entity viewer scope.

---

## Phase 10: Polish

- [ ] T065 Run `vendor/bin/pint --dirty` on all new PHP files.
- [ ] T066 Run `php artisan test --compact` — verify all tests pass.
