---
title: "Hierarchical Permission System — Research Document"
description: "Research into patterns for building a custom hierarchical multi-scope permission system in Laravel, potentially replacing or extending Spatie."
created: 2026-03-19
topic: "Hierarchical Permission Architecture"
sources_searched:
  web:
    - https://workos.com/blog/how-to-design-multi-tenant-rbac-saas
    - https://www.cerbos.dev/blog/3-most-common-authorization-designs-for-saas-products
    - https://www.aserto.com/blog/authorization-101-multi-tenant-rbac
    - https://dev.to/d_isaenko_dev/how-i-built-a-complete-multi-tenancy-system-for-my-laravel-saas-without-spatie-227a
    - https://github.com/saeedvir/laravel-permissions
    - https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
    - https://sunyday.net/spatie-permission-vs-bouncer/
    - https://laravel.com/docs/12.x/authorization
  codebase:
    - app/Http/Middleware/SetWorkspaceContext.php
    - database/seeders/RolesAndPermissionsSeeder.php
    - app/Policies/ (31 policies)
    - .tc-docs/content/initiatives/FL-financial-ledger/039-RPA-roles-permissions-architecture/spec.md
---

# Hierarchical Permission System — Research Document

## Executive Summary

This research investigates patterns for building a custom hierarchical, multi-scope permission system in Laravel. The MoneyQuest spec (039-RPA) calls for five nested scopes (platform > practice > group > entity > feature module), permission ceilings, role templates, temporal access, and portal abstractions. The current Spatie Permission setup (6 roles, ~95 permissions, 31 policies, team mode) works well for single-entity workspace RBAC but lacks the layered resolution, ceiling mechanics, and group inheritance the product requires.

The key architectural decision is: **keep Spatie as the storage/query layer for workspace-level permissions, but build a custom `PermissionResolver` service on top** that computes effective permissions by intersecting entity grants with practice ceilings and group inheritance. This is the pattern used by most production multi-tenant SaaS platforms — a resolution layer that combines multiple permission sources into a single computed result.

## Architectural Patterns Found

### Pattern 1 — Hybrid Role Templates (Recommended)

Source: WorkOS, Cerbos, multiple SaaS architecture guides.

Combine global base templates with tenant-level customization. Tenants clone, extend, or override templates rather than creating entirely custom roles.

**Schema:**
- `role_templates` — immutable global baseline (e.g., "Bookkeeper", "Accountant")
- `roles` — with optional `template_id` reference and `is_custom` flag
- Tenant-scoped permission overrides

**Pros:** 80% of customers use defaults, 20% customize. Prevents "role explosion."
**Cons:** Need a diff/comparison UI to prevent near-duplicate custom roles.
**Confidence:** HIGH — confirmed across 3+ sources (WorkOS, Cerbos, Aserto).

### Pattern 2 — Permission Ceilings (AWS IAM Boundaries Pattern)

Source: AWS IAM Permission Boundaries, MoneyQuest 039-RPA spec.

A ceiling (boundary) sets the **maximum** permissions an entity can grant. Effective permission = intersection of (granted permissions) AND (ceiling). The ceiling never grants — it only restricts.

**Formula:**
```
effective_permission = entity_role_permissions ∩ practice_ceiling
```

**Implementation:**
```php
class PermissionResolver
{
    public function resolve(User $user, Workspace $workspace): EffectivePermissions
    {
        $entityPermissions = $this->getEntityRolePermissions($user, $workspace);
        $practiceCeiling = $this->getPracticeCeiling($user, $workspace);

        if ($practiceCeiling) {
            return $entityPermissions->intersect($practiceCeiling);
        }

        return $entityPermissions;
    }
}
```

**Pros:** Battle-tested pattern (AWS uses it at massive scale). Simple set intersection. Practice owners get hard guarantees.
**Cons:** Users can be confused when granted a role but some permissions are "missing" due to ceiling. Need clear UI indication.
**Confidence:** HIGH — this is the AWS IAM model, widely proven.

### Pattern 3 — 5-Level Priority Resolution Chain

Source: Dev.to article on Laravel multi-tenancy without Spatie.

Authorization checks follow a priority-based chain:

1. **Super Admin** — bypasses all checks
2. **Practice Owner (of connected practice)** — full entity access
3. **Revoked** — explicitly blocked permissions override everything below
4. **Individual Grant** — explicitly granted permissions override role
5. **Role-Based** — inherited from assigned roles

**Pros:** Clear precedence. Explicit revocations are a powerful compliance tool.
**Cons:** Complexity in explaining to users why they have/lack access. Debugging is harder.
**Confidence:** MEDIUM — one detailed implementation source, aligns with NIST RBAC models.

### Pattern 4 — Group Inheritance with Downward Propagation

Source: Aserto, WorkOS, MoneyQuest 039-RPA spec.

Permissions flow **downward** through a group tree. A manager at level 1 has access to all entities at levels 2, 3, 4. A viewer at level 3 can only see entities in their branch.

**Implementation Options:**
- **Closure table** — precomputed ancestor/descendant pairs for fast queries
- **Nested set** — left/right values on each node
- **Materialized path** — `/group1/group2/group3` string for LIKE queries
- **Recursive CTE** — query-time traversal (simplest but slowest)

**For max depth of 4 levels**, a simple `parent_id` with recursive CTE or even 4 self-joins is practical. No need for closure tables at this scale.

**Confidence:** HIGH — standard tree permission pattern, multiple sources.

### Pattern 5 — Configuration-Driven Permission Registration

Source: Dev.to Laravel without Spatie article.

All permissions centralized in a config file. `AuthServiceProvider` iterates through config, registering each as a Laravel Gate. No database-driven permission definitions.

**Pros:** Fast boot, no DB queries for permission definitions, easy to version control.
**Cons:** Cannot add permissions at runtime, requires deployment for changes.
**Applicability:** Good for the base permission catalog. MoneyQuest already uses a seeder which is similar. The config approach would be faster at boot time.
**Confidence:** MEDIUM — one implementation source, but the pattern is sound for static permission catalogs.

## Caching Strategies — Pros and Cons

| Strategy | Pros | Cons | Best For |
|----------|------|------|----------|
| **Per-request (array cache)** | Zero stale data. No cache invalidation complexity. | Recalculates on every request. Multiple DB queries. | Simple apps, < 1000 users |
| **Per-request with eager load** | Single query per request. Zero staleness. | Still one query per request. | MoneyQuest P1 (recommended starting point) |
| **Short TTL (5 min)** | Reduces DB load. Near-realtime updates. | 5-min window of stale permissions after changes. | High-traffic apps with infrequent permission changes |
| **Cache + event invalidation** | Best of both — cached until changed, then instantly refreshed. | Invalidation complexity. Must catch ALL mutation paths. | Production MoneyQuest (recommended P2) |
| **Session-based** | Survives page navigations. No DB after login. | Stale until re-login or manual refresh. Role changes invisible mid-session. | NOT recommended for financial software |

**Recommended approach for MoneyQuest:**
1. **P1**: Per-request eager load. Single query: `SELECT permissions FROM computed cache WHERE user_id = ? AND workspace_id = ?`. Cache the result in a request-scoped singleton.
2. **P2**: Add event-driven invalidation. When any role/permission/ceiling changes, bust the cache key `perm:{workspaceId}:{userId}`. Use Redis with a 5-min TTL as a safety net.
3. **Critical rule**: Cache keys MUST include `workspace_id`. Missing tenant context in cache keys enables cross-tenant leaks.

**Cache key format:**
```
perm:{workspaceId}:{userId}:{ceilingVersion}
```

## Using Laravel's Native Gate/Policy Without Spatie

Laravel's built-in authorization is fully capable of replacing Spatie for the resolution layer. The key components:

### Gates — For Global/Scope Checks

```php
// In AuthServiceProvider::boot()
Gate::define('access-workspace', function (User $user, Workspace $workspace) {
    return $user->workspaces()->where('workspace_id', $workspace->id)->exists();
});

// Dynamic permission registration from config/DB
foreach ($permissions as $permission) {
    Gate::define($permission, function (User $user) use ($permission) {
        return app(PermissionResolver::class)
            ->userCan($user, $permission, request()->attributes->get('workspace'));
    });
}
```

### Policies — For Model-Scoped Checks

Policies continue to work exactly as they do now. The only change is the underlying check:

```php
// Current (Spatie):
return $user->hasPermissionTo('journal-entry.approve');

// Custom resolver:
return app(PermissionResolver::class)
    ->userCan($user, 'journal-entry.approve', $this->workspace());
```

### What Spatie Gives You That You'd Need to Rebuild

| Feature | Effort to Rebuild |
|---------|-------------------|
| Role-permission assignment (DB tables + Eloquent) | Low — simple pivot tables |
| `hasPermissionTo()` / `hasRole()` methods on User | Low — trait with resolver calls |
| Team mode (workspace scoping) | Medium — need workspace-aware queries |
| Permission caching | Medium — need cache invalidation strategy |
| `assignRole()` / `syncPermissions()` | Low — pivot operations |
| Blade directives (`@can`, `@role`) | FREE — these are Laravel's, not Spatie's |
| Middleware (`role:admin`) | Low — custom middleware wrapping resolver |
| Wildcard permissions (`posts.*`) | Medium — pattern matching in resolver |

### Recommendation

**Keep Spatie for workspace-level role/permission storage. Build the `PermissionResolver` on top.** Reasons:
- Spatie's team mode already handles workspace-scoped role assignment
- The 31 existing policies don't need to change — only the underlying `hasPermissionTo()` call gets routed through the resolver
- Replacing Spatie entirely is ~2 weeks of work for marginal benefit
- The resolver handles the NEW concerns (ceilings, groups, temporal) that Spatie cannot

## Database Schema Patterns for Multi-Scope Permissions

### Option A — Extend Existing Schema (Recommended)

Keep Spatie's tables. Add new tables for the new scopes:

```
-- EXISTING (keep as-is)
roles                    -- Spatie: id, name, guard_name, team_id
permissions              -- Spatie: id, name, guard_name
role_has_permissions     -- Spatie: role_id, permission_id
model_has_roles          -- Spatie: model_id, model_type, role_id, team_id
model_has_permissions    -- Spatie: model_id, model_type, permission_id, team_id

-- NEW: Practice role templates
practice_role_templates
    id, practice_id, name, slug, description, is_default, created_at, updated_at

practice_role_template_permissions
    template_id, permission_id

-- NEW: Practice permission ceilings
practice_permission_ceilings
    id, practice_id, version, created_at, updated_at

practice_ceiling_permissions
    ceiling_id, permission_id      -- permissions IN the ceiling (allowed)

-- NEW: Temporal access
workspace_users (extend existing pivot)
    + expires_at (nullable datetime)
    + expired_by (nullable user_id — for manual revocation)

practice_workspace_assignments
    id, practice_id, workspace_id, user_id, role_template_id,
    assigned_by, expires_at, created_at, updated_at

-- NEW: Group hierarchy
workspace_groups
    id, name, parent_id (self-ref FK), organisation_id,
    max_depth CHECK, created_at, updated_at

workspace_group_members
    group_id, workspace_id

group_member_users
    id, group_id, user_id, role (manager|viewer|entity_viewer),
    entity_scope_workspace_id (nullable — for entity_viewer),
    expires_at, created_at, updated_at

-- NEW: Access audit log
access_grants
    id (ulid), actor_id, target_user_id, workspace_id,
    action (granted|revoked|changed|expired),
    scope (platform|practice|group|entity),
    details (json — old_role, new_role, permissions changed),
    created_at

-- NEW: Portal types
portal_types
    id, slug, name, description, permissions (json array),
    ui_sections (json array), created_at, updated_at
```

### Option B — Full Custom Schema (Not Recommended)

Replace Spatie entirely with a unified permissions table. Higher upfront cost, marginal long-term benefit given MoneyQuest's current 31 policies and 95 permissions all work fine with Spatie.

## Alternative Laravel Packages

### Bouncer (JosephSilber/bouncer)

- Supports role hierarchies via `roles.level` field
- Permissions ("abilities") can be owned — scoped to specific model instances
- More dynamic than Spatie (runtime permission creation/revocation)
- **Does NOT support teams/multi-tenancy natively** — would need custom scoping
- **Verdict:** Not better than Spatie for MoneyQuest's needs. Lacks team mode.

### Laratrust (santigarcor/laratrust)

- Has built-in Teams functionality (similar to Spatie team mode)
- Fork of old Entrust package
- **Replaces Laravel's Gate/Policy system** — cannot use `@can` syntax
- **Verdict:** Disqualified. Overriding Laravel's native auth is a dealbreaker.

### saeedvir/laravel-permissions

- Wildcard permissions (`posts.*`)
- Expirable roles and permissions (`expires_at`)
- Super admin role
- Multiple guard support
- **Verdict:** Interesting for temporal permissions and wildcards. Smaller community than Spatie. Could be a reference implementation for `expires_at` patterns.

### Custom (No Package)

- Full control, no package constraints
- Must build: caching, cache invalidation, middleware, traits, Blade directives
- 2-3 weeks of infrastructure work before any business logic
- **Verdict:** Only if Spatie fundamentally cannot be extended. For MoneyQuest, the resolver-on-top pattern avoids this.

## Synthesis

### Consolidated Architectural Recommendation

1. **Keep Spatie** as the workspace-level role/permission storage engine (team mode, role assignment, permission definitions)
2. **Build a `PermissionResolver` service** that computes effective permissions from multiple sources:
   - Workspace role permissions (from Spatie)
   - Practice ceiling intersection (new)
   - Group inheritance resolution (new)
   - Temporal access enforcement (new)
   - Super admin bypass (existing)
3. **Expose a `/api/v1/permissions` endpoint** that returns the resolved permission set for the current user + workspace
4. **Cache resolved permissions** per-request initially, add Redis cache with event invalidation in P2
5. **Policies stay unchanged** — the 31 existing policies route through the resolver instead of directly calling Spatie's `hasPermissionTo()`
6. **Frontend caches permissions** in Zustand store, refreshes on workspace switch and navigation

### Effective Permission Resolution Flow

```
User requests action on Workspace W

1. Is user super admin? → ALLOW ALL
2. Has user's access expired? (workspace_users.expires_at) → DENY
3. Get user's entity role permissions (Spatie team mode, workspace W)
4. Is user connected via a Practice?
   a. YES → Get practice ceiling for that practice
   b. Effective = entity_permissions ∩ practice_ceiling
   c. NO → Effective = entity_permissions
5. Is user connected via a Group?
   a. YES → Resolve group-inherited permissions (walk up tree)
   b. Union with entity-level permissions
6. Check if requested permission is in effective set → ALLOW or DENY
7. Log access decision to audit trail (async)
```

### Open Questions

1. [ ] Should practice ceilings be versioned? (Spec says yes for re-evaluation, but adds schema complexity)
2. [ ] How do portal types interact with practice ceilings? (A lender portal has its own scope — does the practice ceiling also apply?)
3. [ ] Should the `PermissionResolver` be a singleton or request-scoped? (Request-scoped avoids stale state, singleton with invalidation is faster)
4. [ ] What happens when a user belongs to multiple practices that both connect to the same entity? (Spec says "most permissive effective role, but each practice's ceiling still applies independently" — this means we need per-practice resolution, not a merged ceiling)
5. [ ] Should we precompute effective permissions into a cache table (`computed_permissions`) or compute on-the-fly? (Precompute is faster but requires invalidation on every role/ceiling/group change)

### Recommended Next Steps

- Use this research to inform the implementation plan for 039-RPA
- Start with User Story 1 (Permissions API + Frontend Gating) — it unblocks everything
- Build the `PermissionResolver` service as the core abstraction from day one, even if P1 only resolves workspace-level Spatie permissions
- Add ceiling, group, and temporal resolution in subsequent phases
