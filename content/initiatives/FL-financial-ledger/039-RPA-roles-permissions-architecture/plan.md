---
title: "Implementation Plan: Roles & Permissions Architecture"
---

# Implementation Plan: Roles & Permissions Architecture

**Spec**: [spec.md](spec.md)
**Created**: 2026-03-19
**Status**: Draft

## Technical Context

### Technology Stack
- Backend: Laravel 12, PHP 8.4, SQLite (local dev)
- Frontend: Next.js 16, React 19, TypeScript, TanStack Query v5, Zustand v5
- Auth: Sanctum cookie-based SPA auth (no change in this epic)
- Current permissions: Spatie Permission v11 with team mode (workspace_id as team FK) — being replaced

### Dependencies
- Spatie Permission v11 — being removed (225 `hasPermissionTo`, 148 `assignRole`, 125 `setPermissionsTeamId` calls across 35 files)
- Laravel Pennant — feature flags (existing, stays as-is)
- Spatie laravel-event-sourcing v7 — for JE/Invoice aggregates (unaffected)
- Lorisleiva Actions — business logic pattern (unaffected)

### Constraints
- 590+ existing tests must pass throughout migration (same inputs, same outputs)
- Per-request permission resolution only (~1-3ms budget with eager loading)
- No Redis dependency for launch (per-request caching only)
- Financial compliance: no stale permissions, no cross-tenant data leaks

## Gate 3: Architecture Check

### 1. Technical Feasibility — PASS
- Architecture is a PermissionResolver service wrapping Laravel's native Gate/Policy system
- Migration from Spatie is mechanical: override `hasPermissionTo()` on User model during transition
- All existing patterns leveraged (Actions, Policies, middleware, Form Requests)

### 2. Data & Integration — PASS
- Data model fully defined (see below)
- API contracts clear (2 new endpoints + mutations via existing patterns)
- Spatie's 5 tables replaced by 4 custom tables + column additions to existing pivots
- Integration points: SetWorkspaceContext middleware, 31 policies, seeder

### 3. Implementation Approach — PASS
- 6-phase implementation with Spatie removal in Phase 1 (foundation, lowest risk)
- Each phase has independent tests validating it
- Rollback: Spatie package stays in composer.json until Phase 1 is fully green

### 4. Resource & Scope — PASS
- Phase 1 (Spatie replacement + permissions API) is the critical path
- Phases 2-6 are additive — each can ship independently

### 5. Laravel Best Practices — PASS
- PermissionService as Lorisleiva Action (AsAction trait)
- No hardcoded business logic in frontend — permissions come from API
- Model route binding throughout
- Policies return granular responses
- Feature flags dual-gated (backend middleware + API response)

### 6. Frontend Standards — PASS (Next.js/React override from CLAUDE.md)
- All components TypeScript strict
- TanStack Query for permissions data (no useState for server state)
- Zustand for cached permission set
- `<Can>` wrapper component for permission gating

## Design Decisions

### Data Model

#### New Tables

**`roles`** (replaces Spatie's roles table)
```
id              bigint PK
name            string (unique) — owner, accountant, bookkeeper, approver, auditor, client
created_at      timestamp
updated_at      timestamp
```

**`role_permissions`** (replaces Spatie's role_has_permissions)
```
id              bigint PK
role_id         bigint FK → roles.id
permission      string — e.g. 'journal-entry.view'
unique(role_id, permission)
```

**`role_templates`** (NEW — practice-scoped)
```
id              bigint PK
practice_id     bigint FK → practices.id
name            string — e.g. 'Tax Reviewer', 'Full Access Accountant'
is_default      boolean default false
hidden_modules  json nullable — ['lending', 'personal_ledger']
created_at      timestamp
updated_at      timestamp
unique(practice_id, name)
```

**`role_template_permissions`** (NEW)
```
id              bigint PK
role_template_id bigint FK → role_templates.id
permission       string
unique(role_template_id, permission)
```

**`permission_ceilings`** (NEW — practice-scoped)
```
id              bigint PK
practice_id     bigint FK → practices.id
permission      string
unique(practice_id, permission)
```
Note: ceiling is a whitelist — only listed permissions are allowed. If a permission is NOT in the ceiling, practice staff cannot hold it regardless of entity-level role.

**`portal_types`** (NEW — system-defined presets)
```
id              bigint PK
slug            string unique — 'auditor', 'client', 'job_stakeholder'
name            string — 'Auditor Portal'
permissions     json — ['report.trial-balance', 'report.balance-sheet', ...]
visible_modules json — ['reports', 'journal-entries']
is_active       boolean default true
created_at      timestamp
updated_at      timestamp
```

**`access_grants`** (NEW — audit log)
```
id              bigint PK
actor_user_id   bigint FK → users.id (who made the change)
subject_user_id bigint FK → users.id (who was affected)
workspace_id    bigint nullable FK → workspaces.id
practice_id     bigint nullable FK → practices.id
group_id        bigint nullable FK → workspace_groups.id
event           string — 'role_assigned', 'role_revoked', 'ceiling_updated', 'access_expired', 'portal_granted'
details         json — { role: 'accountant', source: 'direct', previous_role: 'bookkeeper' }
created_at      timestamp
index(workspace_id, created_at)
index(practice_id, created_at)
index(subject_user_id, created_at)
```

#### Modified Tables

**`workspace_user`** — add columns:
```
role_template_id    bigint nullable FK → role_templates.id (if assigned via practice template)
practice_path_id    bigint nullable FK → practices.id (which practice granted this, null = direct)
portal_type_id      bigint nullable FK → portal_types.id (if portal access)
expires_at          timestamp nullable
job_scope           json nullable — [42, 67] (job IDs if job-scoped access)
```

**`workspace_groups`** — add column:
```
parent_id           bigint nullable FK → workspace_groups.id (self-referential, max depth 4)
```

**`group_member_users`** — add column:
```
expires_at          timestamp nullable (for temporal group membership)
```

**`practice_workspaces`** — add column:
```
expires_at          timestamp nullable (for temporal practice-entity assignments)
```

#### Removed Tables (after migration)
- `permissions` (Spatie)
- `roles` (Spatie — replaced by custom `roles`)
- `model_has_permissions` (Spatie)
- `model_has_roles` (Spatie)
- `role_has_permissions` (Spatie)

### Workspace Context: PermissionContext (replaces setPermissionsTeamId)

```php
class PermissionContext
{
    public ?int $workspaceId = null;
    public ?User $user = null;

    public function set(User $user, int $workspaceId): void
    public function workspaceId(): int  // throws if not set
}
```

- Bound as a scoped singleton in the container (`$this->app->scoped(PermissionContext::class)`)
- `SetWorkspaceContext` middleware sets it for HTTP requests
- Artisan commands and queued jobs set it explicitly before permission checks
- Tests set it in `beforeEach` (replaces `setPermissionsTeamId()`)
- `User::hasPermissionTo()` override reads workspace_id from `app(PermissionContext::class)`

### Core Service: PermissionResolver

```php
class PermissionResolver
{
    /**
     * Compute effective permissions for a user on a workspace.
     *
     * Resolution chain:
     * 1. Super admin? → return ALL permissions
     * 2. Check temporal validity (expires_at)
     * 3. Collect direct grants (workspace_user.role → role_permissions)
     * 4. Collect practice grants (per practice path: template permissions ∩ ceiling)
     * 5. Collect group grants (walk tree upward, map group role → entity role)
     * 6. Union all grant sets
     * 7. Filter by feature flags (hide permissions for disabled modules)
     * 8. Filter by template hidden_modules (if practice-assigned)
     * 9. Return flat string[]
     */
    public function resolve(User $user, int $workspaceId): array

    /**
     * Explain WHY each permission is granted or denied.
     * Used by /permissions/explain endpoint.
     */
    public function explain(User $user, int $workspaceId): array

    /**
     * Check a single permission (called by User::hasPermissionTo override).
     */
    public function check(User $user, int $workspaceId, string $permission): bool
}
```

### API Contracts

**`GET /api/v1/permissions`** — flat permissions array
```json
{
  "permissions": ["journal-entry.view", "journal-entry.create", "invoice.view"],
  "features": ["invoicing", "banking", "jobs"],
  "role": "bookkeeper",
  "source": "direct"
}
```

**`GET /api/v1/permissions/explain`** — structured debug view
```json
{
  "capabilities": {
    "journal-entry.view": { "allowed": true, "sources": ["direct:bookkeeper"] },
    "journal-entry.approve": { "allowed": false, "sources": [], "blocked_by": "practice_ceiling:ABC Accounting" },
    "lending.view": { "allowed": false, "sources": [], "blocked_by": "feature_flag:lending_disabled" }
  }
}
```

**`GET /api/v1/access-grants`** — audit log (filterable)
```
?workspace_id=5&from=2026-01-01&to=2026-03-19
?practice_id=2&user_id=12
```

### Frontend Components

**`usePermissions` hook** (TanStack Query)
```typescript
function usePermissions(): {
  permissions: string[];
  features: string[];
  can: (permission: string) => boolean;
  hasFeature: (feature: string) => boolean;
  isLoading: boolean;
}
```

**`<Can>` wrapper component**
```tsx
<Can permission="invoice.create">
  <Button>New Invoice</Button>
</Can>

<Can permission="invoice.approve" fallback={null}>
  <Button onClick={approve}>Approve</Button>
</Can>
```

**Sidebar filtering** — extend `NavItem` with `permission?` field alongside existing `featureKey?`.

## Implementation Phases

### Phase 1: Foundation — Spatie Replacement + Permissions API (P1)

**Goal**: Replace Spatie with custom permission system. Zero behaviour change. All 590+ tests pass.

**Migration strategy: Shadow mode with feature flag (Laravel Pennant)**
- Build the custom resolver alongside Spatie
- Feature flag `custom_permissions` controls which system is authoritative
- Flag OFF = Spatie (production behaviour, default)
- Flag ON = custom resolver
- Both systems run on every request when flag is OFF — log discrepancies where results differ
- Once zero discrepancies confirmed, flip flag ON globally and remove Spatie in a follow-up PR

**Backend tasks**:
1. Create migrations: `roles`, `role_permissions` tables
2. Create `PermissionResolver` service with `resolve()`, `check()`, `explain()`
3. Create `PermissionService` action (AsAction) with `assignRole()`, `revokeRole()`, `syncPermissions()`
4. Create data migration: seed custom `roles` + `role_permissions` from existing Spatie seeder data
5. Create `custom_permissions` feature flag (Laravel Pennant)
6. Override `hasPermissionTo()` on User model → shadow mode: calls both Spatie AND resolver, logs discrepancies, returns Spatie result when flag OFF, resolver result when flag ON
7. Update `SetWorkspaceContext` middleware to compute + cache permissions on request object
8. Create `PermissionService` wrappers that write to BOTH Spatie AND custom tables during shadow period
9. Create `PermissionController` with `index()` and `explain()` endpoints
10. Create missing policies: QuotePolicy, PurchaseOrderPolicy, BillPolicy
11. Create discrepancy logging (structured log with user_id, workspace_id, permission, spatie_result, resolver_result)
12. Run full test suite with flag OFF (Spatie authoritative) — must be 590+ tests green
13. Run full test suite with flag ON (resolver authoritative) — must be 590+ tests green
14. **Follow-up PR (after shadow period)**: Replace `setPermissionsTeamId()` calls, replace `assignRole()` calls across 10 Actions and 2 Seeders, remove Spatie package, `HasRoles` trait, config, migration

**Frontend tasks**:
14. Create `usePermissions` hook (TanStack Query, keyed by workspace_id)
15. Create `<Can>` component
16. Add `permission` field to `NavItem` type
17. Update `app-sidebar.tsx` to filter by permissions
18. Update `ApprovalActions.tsx` to receive permissions from `usePermissions` hook
19. Update key action buttons across pages (journal entries, invoices, bills, contacts, jobs, banking)

### Phase 2: Practice Role Templates & Ceilings (P1)

**Goal**: Practices can define role templates and permission ceilings for their staff.

**Backend tasks**:
1. Create migrations: `role_templates`, `role_template_permissions`, `permission_ceilings`
2. Add `role_template_id`, `practice_path_id` to `workspace_user` pivot
3. Create `RoleTemplateController` — CRUD for templates
4. Create `PermissionCeilingController` — manage ceiling permissions
5. Update `PermissionResolver::resolve()` — add ceiling intersection logic for practice paths
6. Update `InviteUser` action — support template-based assignment
7. Create `PracticeTypeSeeder` — seed default templates per practice type
8. Write tests: ceiling enforcement, per-path ceiling isolation, template updates cascade

**Frontend tasks**:
9. Practice settings: Role Templates management page
10. Practice settings: Permission Ceiling configuration page
11. Staff assignment modal: template selector dropdown
12. Effective permissions viewer: show ceiling-limited permissions with explanation

### Phase 3: Nested Group Hierarchy (P2)

**Goal**: Groups can nest with `parent_id`. Group roles map to entity roles with downward inheritance.

**Backend tasks**:
1. Add `parent_id` to `workspace_groups` migration
2. Add depth validation (max 4 levels) in WorkspaceGroup model/action
3. Update `PermissionResolver::resolve()` — walk group tree upward to collect inherited roles
4. Update `GroupController` — support creating subgroups, moving groups
5. Write tests: inheritance, depth limit, upward leakage prevention

**Frontend tasks**:
6. Group view: tree visualisation of nested groups
7. Group creation: parent group selector

### Phase 4: Temporal Access (P2)

**Goal**: Access can expire automatically with notifications.

**Backend tasks**:
1. Add `expires_at` to `workspace_user`, `practice_workspaces`, `group_member_users` pivots
2. Update `PermissionResolver::resolve()` — check expires_at, deny if expired
3. Update `InviteUser` action — accept optional `expires_at`
4. Create `CheckExpiredAccess` artisan command (daily cron) — mark expired, send notifications at 30/7/1 day thresholds
5. Create notification: AccessExpiringNotification (sent to both sides)
6. Write tests: expiry enforcement, notification timing, expired state visibility

**Frontend tasks**:
7. Invite modal: optional expiry date picker
8. Members list: expiry badges, "Expired" section, extend/re-invite buttons

### Phase 5: Portals & Job-Scoped Access (P2-P3)

**Goal**: External stakeholders access scoped views. Job share tokens upgrade to authenticated access.

**Backend tasks**:
1. Create `portal_types` migration + seed V1 presets (Auditor, Client, Job Stakeholder)
2. Add `portal_type_id`, `job_scope` to `workspace_user` pivot
3. Update `PermissionResolver::resolve()` — portal types define available permissions
4. Create portal invitation flow (action + controller)
5. Create job-scoped access middleware — restrict to permitted job IDs only
6. Create share token → authenticated access upgrade flow in `JobShareController`
7. Write tests: portal scoping, job isolation, token upgrade

**Frontend tasks**:
8. External Access settings page (entity owner view)
9. Portal layout variant (simplified sidebar for portal users)
10. Job share dashboard: "Create Account" upgrade CTA

### Phase 6: Access Audit Trail (P3)

**Goal**: All permission changes logged with dual-lens viewing.

**Backend tasks**:
1. Create `access_grants` migration
2. Create `AccessGrantLogger` service — called from PermissionService on every mutation
3. Create `AccessGrantController` — list, filter, export
4. Wire logger into: role assignment, revocation, ceiling changes, expiry events, portal grants
5. Write tests: comprehensive audit coverage, export format

**Frontend tasks**:
6. Access audit log page (entity owner lens + practice owner lens)
7. Filters: user, entity, date range
8. Export button (CSV/PDF)

## Testing Strategy

### Phase 1 Tests (Critical — validates Spatie removal)
- **Unit**: PermissionResolver.resolve(), PermissionResolver.check(), PermissionService.assignRole()
- **Feature**: All 590+ existing tests pass unchanged (same inputs, same outputs)
- **Feature**: New permission API endpoints return correct data per role
- **Browser**: Login as each demo persona, verify correct UI visibility

### Phase 2 Tests
- **Unit**: Ceiling intersection logic, template cascading
- **Feature**: Practice staff permissions capped by ceiling, template CRUD
- **Feature**: Per-path ceiling isolation (multi-practice user on same entity)

### Phase 3 Tests
- **Unit**: Tree traversal, depth validation
- **Feature**: Group inheritance, upward leakage prevention

### Phase 4 Tests
- **Unit**: Expiry checking, notification scheduling
- **Feature**: Access denied after expiry, notification delivery

### Phase 5 Tests
- **Feature**: Portal scoping, job isolation, token upgrade flow

### Phase 6 Tests
- **Feature**: Audit log completeness, dual-lens filtering, export

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Spatie removal breaks tests | Low | High | Override `hasPermissionTo` first (zero-change migration), run tests after each step |
| Permission resolution too slow | Low | Medium | Per-request caching, eager loading. Benchmark at Phase 1 before proceeding |
| Practice ceiling edge cases | Medium | Medium | Comprehensive unit tests for multi-practice, multi-path scenarios |
| Group tree traversal N+1 | Low | Medium | Single recursive CTE query, max 4 levels |
| Frontend permission cache stale | Low | High | Invalidate on workspace switch, refetch on navigation |

## Development Clarifications

### Session 2026-03-19
- Q: Phase 1 migration strategy — big bang, parallel run, or shadow mode? → A: Shadow mode with feature flag (Laravel Pennant). Both systems run on every request, log discrepancies, Spatie authoritative when flag OFF, resolver authoritative when flag ON. Remove Spatie in follow-up PR after zero discrepancies confirmed.
- Q: How should the PermissionResolver get workspace context without global state? → A: Scoped context object (PermissionContext) bound per-request in the container. Middleware sets it for HTTP. Commands/jobs set explicitly. Properly dependency-injected, mockable, no global state.
- Q: Dual-write strategy during shadow period? → A: PermissionService writes to both Spatie and custom tables explicitly. No triggers, no events. Easy to grep and remove Spatie writes after shadow period.

## Next Steps

1. Run `/speckit-tasks` to generate tasks.md from this plan
2. Begin Phase 1 implementation (Spatie replacement is the critical path)
