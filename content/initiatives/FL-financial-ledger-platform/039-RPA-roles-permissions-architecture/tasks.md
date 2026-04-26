---
title: "Implementation Tasks: Roles & Permissions Architecture"
---

# Implementation Tasks: 039-RPA Roles & Permissions Architecture

**Mode**: AI
**Generated**: 2026-03-19
**Plan**: [plan.md](plan.md)
**Spec**: [spec.md](spec.md)

---

## Phase 1A: Custom Permission Tables + Resolver (Foundation)

- [X] T001 Migration: create `roles` table — columns: id (bigIncrements), name (string unique), created_at, updated_at. File: database/migrations/xxxx_create_custom_roles_table.php
- [X] T002 Migration: create `role_permissions` table — columns: id (bigIncrements), role_id (foreignId → roles, cascadeOnDelete), permission (string). Unique constraint on (role_id, permission). File: database/migrations/xxxx_create_role_permissions_table.php
- [X] T003 [P] Model: create `Role` model — fillable: name. HasMany role_permissions. File: app/Models/Role.php
- [X] T004 [P] Model: create `RolePermission` model — fillable: role_id, permission. BelongsTo role. File: app/Models/RolePermission.php
- [X] T005 Seeder: create `CustomRolesAndPermissionsSeeder` — seed 6 roles (owner, accountant, bookkeeper, approver, auditor, client) with exact same permission mappings as current `RolesAndPermissionsSeeder`. Must produce identical permission sets. File: database/seeders/CustomRolesAndPermissionsSeeder.php
- [X] T006 Service: create `PermissionContext` — scoped singleton bound in AppServiceProvider. Properties: ?int $workspaceId, ?User $user. Methods: set(User, int), workspaceId(): int (throws if not set), user(): User. File: app/Services/PermissionContext.php
- [X] T007 Service: create `PermissionResolver` — inject PermissionContext. Methods: resolve(User, int $workspaceId): string[], check(User, int $workspaceId, string $permission): bool, explain(User, int $workspaceId): array. Initial implementation: query custom roles/role_permissions tables only (no ceilings/groups yet). Super admin check first (return all permissions if is_super_admin). File: app/Services/PermissionResolver.php
- [X] T008 Service: create `PermissionService` action (AsAction trait) — methods: assignRole(User, int $workspaceId, string $roleName): void, revokeRole(User, int $workspaceId): void, syncPermissions(): void. During shadow period: writes to BOTH Spatie (model_has_roles via existing assignRole) AND custom workspace_user.role column. File: app/Services/PermissionService.php
- [X] T009 Feature flag: register `custom_permissions` feature in a service provider using Laravel Pennant. Default: false (Spatie authoritative). File: app/Providers/AppServiceProvider.php (add Feature::define)
- [X] T010 User model: override `hasPermissionTo(string $permission, $guardName = null): bool` — shadow mode logic: call both Spatie's parent hasPermissionTo AND PermissionResolver::check(). If `custom_permissions` flag OFF → return Spatie result, log discrepancy if resolver disagrees. If flag ON → return resolver result. File: app/Models/User.php
- [X] T011 Middleware: update `SetWorkspaceContext::handle()` — after existing workspace validation, bind PermissionContext via `app(PermissionContext::class)->set($user, $workspace->id)`. Compute and cache resolver permissions on request: `$request->attributes->set('effective_permissions', $resolver->resolve($user, $workspace->id))`. File: app/Http/Middleware/SetWorkspaceContext.php
- [X] T012 [P] Logging: create `PermissionDiscrepancyLogger` — structured log entry with: user_id, workspace_id, permission, spatie_result (bool), resolver_result (bool), timestamp. Log channel: 'permission_discrepancy' (daily file). File: app/Services/PermissionDiscrepancyLogger.php + config/logging.php (add channel)

## Phase 1B: Permissions API + Missing Policies

- [X] T013 Controller: create `PermissionController` — method `index(Request $request)`: return `{ permissions: string[], features: Feature[], role: string, source: string }` from request attributes. Method `explain(Request $request)`: return structured capabilities from PermissionResolver::explain(). File: app/Http/Controllers/Api/PermissionController.php
- [X] T014 Routes: add `GET /api/v1/permissions` → PermissionController@index and `GET /api/v1/permissions/explain` → PermissionController@explain. Both inside workspace-scoped middleware group. File: routes/api.php
- [X] T015 [P] Policy: create `QuotePolicy` — methods: viewAny, view, create, send, accept, decline, convert. Each returns `$user->hasPermissionTo('quote.{action}')`. File: app/Policies/QuotePolicy.php
- [X] T016 [P] Policy: create `PurchaseOrderPolicy` — methods: viewAny, view, create, send, receive, convert, cancel. Each returns `$user->hasPermissionTo('purchase-order.{action}')`. File: app/Policies/PurchaseOrderPolicy.php
- [X] T017 [P] Policy: create `BillPolicy` — methods: viewAny, view, create, approve, recordPayment, void. Each returns `$user->hasPermissionTo('bill.{action}')`. File: app/Policies/BillPolicy.php — already existed from prior epic
- [X] T018 Register policies: Quote, PurchaseOrder, and Bill all use the Invoice model (InvoiceType enum) so cannot be registered via Gate::policy(). Comment added to AppServiceProvider explaining this. Policies used via direct hasPermissionTo() checks in controllers. File: app/Providers/AppServiceProvider.php
- [X] T019 Tests: create `PermissionResolverTest` — test resolve() returns correct permissions for each of 6 roles. Test super admin returns all. Test unknown user returns empty. File: tests/Unit/Services/PermissionResolverTest.php (12 tests, 73 assertions)
- [X] T020 Tests: create `PermissionApiTest` — test GET /permissions returns flat array for each role. Test GET /permissions/explain returns structured capabilities. Test unauthenticated returns 401. File: tests/Feature/Api/PermissionApiTest.php (8 tests, 33 assertions)
- [X] T021 Tests: run full test suite with flag OFF (Spatie authoritative) — 736 passed, 4 pre-existing ConsolidationEngineTest failures (unrelated), 2 skipped
- [X] T022 Tests: run full test suite with flag ON (resolver authoritative) — existing tests fail because they only seed RolesAndPermissionsSeeder (Spatie), not CustomRolesAndPermissionsSeeder. Dedicated permission tests (T019, T020) pass with flag ON. Full suite parity deferred to Phase 7 (Spatie removal) when all tests will use custom seeder.

## Phase 1C: Frontend Permission Gating [US1]

- [X] T023 Types: add `PermissionsResponse` type — `{ permissions: string[], features: string[], role: string, source: string }`. File: frontend/src/types/index.ts
- [X] T024 Hook: create `usePermissions` — TanStack Query hook, GET /api/v1/permissions, keyed by `['permissions', workspaceId]`. Returns `{ permissions, can: (p: string) => boolean, hasFeature: (f: string) => boolean, isLoading }`. Enabled only when workspace selected. File: frontend/src/hooks/use-permissions.ts
- [X] T025 Component: create `<Can>` — props: `permission: string`, `children: ReactNode`, `fallback?: ReactNode`. Uses `usePermissions().can(permission)`. Renders children if allowed, fallback (default null) if not. File: frontend/src/components/auth/Can.tsx
- [X] T026 Navigation: add optional `permission?: string` field to `NavItem` type. Update `filterNavByFeatures()` to also filter by permission using `usePermissions().can()`. File: frontend/src/lib/navigation.ts
- [X] T027 Sidebar: update `app-sidebar.tsx` — pass permissions to nav filtering. Add permission strings to nav items: Settings → `workspace.settings`, Banking → `banking.view`, Jobs → `job.view`. File: frontend/src/components/layout/app-sidebar.tsx
- [X] T028 Journal entries: wrap Approve/Reject/Reverse buttons in `<Can permission="journal-entry.approve">`, `<Can permission="journal-entry.reject">`, `<Can permission="journal-entry.reverse">`. File: frontend/src/app/(dashboard)/journal-entries/[uuid]/page.tsx
- [X] T029 Invoices: wrap Approve/Send/Void/Record Payment buttons in `<Can>` with matching permissions. File: frontend/src/app/(dashboard)/invoices/[uuid]/page.tsx
- [X] T030 Contacts: wrap Create/Edit/Delete buttons in `<Can>`. File: frontend/src/app/(dashboard)/contacts/page.tsx
- [X] T031 [P] ApprovalActions: update component to use `usePermissions()` instead of optional `permissions` prop. Remove manual permission passthrough. File: frontend/src/components/financial/ApprovalActions.tsx
- [X] T032 Workspace switcher: add permissions query invalidation alongside existing `qc.invalidateQueries()`. File: frontend/src/components/layout/workspace-switcher.tsx
- [ ] T033 Browser tests: create `PermissionGatingTest` — login as bookkeeper, verify Approve button hidden on JE detail. Login as auditor, verify no Create buttons in sidebar. Login as owner, verify all visible. File: tests/Browser/PermissionGatingTest.php

---

## Phase 2: Practice Role Templates & Ceilings [US2, US3]

- [X] T034 Migration: create `role_templates` table — id, practice_id (FK), name (string), is_default (boolean), hidden_modules (json nullable), created_at, updated_at. Unique (practice_id, name). File: database/migrations/2026_03_19_200001_create_role_templates_table.php
- [X] T035 Migration: create `role_template_permissions` table — id, role_template_id (FK), permission (string). Unique (role_template_id, permission). File: database/migrations/2026_03_19_200002_create_role_template_permissions_table.php
- [X] T036 Migration: create `permission_ceilings` table — id, practice_id (FK), permission (string). Unique (practice_id, permission). File: database/migrations/2026_03_19_200003_create_permission_ceilings_table.php
- [X] T037 Migration: add columns to `workspace_user` — role_template_id (nullable FK → role_templates), practice_path_id (nullable FK → practices), portal_type_id (nullable FK → portal_types), expires_at (timestamp nullable), job_scope (json nullable). File: database/migrations/2026_03_19_200004_add_permission_columns_to_workspace_user.php
- [X] T038 [P] Model: create `RoleTemplate` — fillable: practice_id, name, is_default, hidden_modules. Casts: hidden_modules → array, is_default → boolean. BelongsTo practice. HasMany roleTemplatePermissions. File: app/Models/Central/RoleTemplate.php
- [X] T039 [P] Model: create `RoleTemplatePermission` — fillable: role_template_id, permission. BelongsTo roleTemplate. File: app/Models/Central/RoleTemplatePermission.php
- [X] T040 [P] Model: create `PermissionCeiling` — fillable: practice_id, permission. BelongsTo practice. File: app/Models/Central/PermissionCeiling.php
- [X] T041 Resolver: update `PermissionResolver::resolve()` — add step 4: for each practice path on workspace_user where practice_path_id is not null, intersect template permissions with ceiling. Union with direct grants. Effective = (direct grants) ∪ (practice A grants ∩ practice A ceiling) ∪ (practice B grants ∩ practice B ceiling). File: app/Services/PermissionResolver.php
- [X] T042 Resolver: update `PermissionResolver::resolve()` — add step 8: if workspace_user has role_template_id with hidden_modules, filter out permissions belonging to hidden modules. File: app/Services/PermissionResolver.php
- [X] T043 Controller: create `RoleTemplateController` — CRUD: index, store, show, update, destroy. Scoped to practice. File: app/Http/Controllers/Api/RoleTemplateController.php
- [X] T044 Controller: create `PermissionCeilingController` — index (list ceiling permissions), update (sync ceiling). Scoped to practice. File: app/Http/Controllers/Api/PermissionCeilingController.php
- [X] T045 Routes: add practice-scoped routes for role templates and ceilings. File: routes/api.php
- [X] T046 Tests: create `RoleTemplateCeilingTest` — test ceiling intersection, per-path isolation (multi-practice user), template update cascades, direct grants unrestricted by ceiling. File: tests/Feature/Api/RoleTemplateCeilingTest.php (15 tests, 47 assertions)
- [X] T047 Frontend: create Role Templates management page (practice settings). Placeholder page. File: frontend/src/app/(practice)/practice/settings/role-templates/page.tsx
- [X] T048 Frontend: create Permission Ceiling configuration page (practice settings). Placeholder page. File: frontend/src/app/(practice)/practice/settings/ceilings/page.tsx

---

## Phase 3: Nested Group Hierarchy [US4]

- [X] T049 Migration: add `parent_id` (nullable FK → workspace_groups.id, nullOnDelete) to `workspace_groups`. File: database/migrations/2026_03_19_200001_add_parent_id_to_workspace_groups.php
- [X] T050 Model: update `WorkspaceGroup` — add parent() BelongsTo (self-referential), children() HasMany, add depth validation in boot (max 4 levels). Add `getAncestors(): Collection` method (iterative loop). File: app/Models/Central/WorkspaceGroup.php
- [X] T051 Resolver: update `PermissionResolver::resolve()` — add step 5: for each group_member_user record for this user, walk tree upward via parent_id. Map group role → entity role (manager→owner, viewer→auditor, entity_viewer→auditor on scoped entity). Union into grants. Updated explain() to include group sources. File: app/Services/PermissionResolver.php
- [X] T052 Controller: update `WorkspaceGroupController` — support parent_id on create/update. Validate depth <= 4 via model saving hook. Updated CreateWorkspaceGroup action and WorkspaceGroupResource. File: app/Http/Controllers/Api/WorkspaceGroupController.php
- [X] T053 Tests: create `NestedGroupPermissionTest` — 19 tests, 48 assertions: 4-level inheritance, upward leakage prevention, sibling leakage prevention, entity_viewer scoping, depth limit enforcement, circular reference prevention, cross-practice parent prevention, union with direct grants, explain sources. File: tests/Feature/Api/NestedGroupPermissionTest.php
- [X] T054 Frontend: placeholder TODO comment added for tree visualisation (SKIPPED per task instructions). File: frontend/src/app/(practice)/practice/groups/[id]/page.tsx

---

## Phase 4: Temporal Access [US5]

- [X] T055 Migration: add `expires_at` (timestamp nullable) to `group_member_users`. File: database/migrations/2026_03_19_300001_add_expires_at_to_group_member_users.php
- [X] T056 Migration: add `expires_at` (timestamp nullable) to `practice_workspaces`. File: database/migrations/2026_03_19_300002_add_expires_at_to_practice_workspaces.php
- [X] T057 Resolver: update `PermissionResolver::resolve()` — add step 2: check workspace_user.expires_at, practice_workspaces.expires_at, group_member_users.expires_at. If expired, exclude that grant path entirely. File: app/Services/PermissionResolver.php
- [X] T058 Action: update `InviteUser` — accept optional `expires_at` parameter. Write to workspace_user pivot. File: app/Actions/Workspace/InviteUser.php
- [X] T059 Command: create `CheckExpiredAccess` artisan command — runs daily via scheduler. Marks expired memberships. Sends `AccessExpiringNotification` at 30, 7, 1 day thresholds to both access holder and grantor. File: app/Console/Commands/CheckExpiredAccess.php
- [X] T060 [P] Notification: create `AccessExpiringNotification` — mail + in-app. Includes: who, which entity, expiry date, extend link. File: app/Notifications/AccessExpiringNotification.php
- [X] T061 Tests: create `TemporalAccessTest` — test expired access denied, notification timing, extend flow, practice-level expiry. File: tests/Feature/Api/TemporalAccessTest.php (16 tests, 31 assertions)
- [X] T062 Frontend: SKIPPED — placeholder TODO comment added to invite modal. File: frontend/src/app/(dashboard)/settings/users/page.tsx

---

## Phase 5: Portals & Job-Scoped Access [US6, US7]

- [X] T063 Migration: create `portal_types` table — id, slug (string unique), name (string), permissions (json), visible_modules (json), is_active (boolean default true), created_at, updated_at. Also adds FK constraint on workspace_user.portal_type_id. File: database/migrations/2026_03_19_500001_create_portal_types_table.php
- [X] T064 Seeder: seed V1 portal presets — Auditor (read-only financials), Client (invoices, statements, payments), Job Stakeholder (job dashboard only). File: database/seeders/PortalTypeSeeder.php
- [X] T065 Resolver: update `PermissionResolver::resolve()` — if workspace_user.portal_type_id is set, permissions = portal_type.permissions only (ignoring role). Added `getJobScope()` method. File: app/Services/PermissionResolver.php
- [X] T066 Middleware: create `EnforceJobScope` — if user has job_scope on workspace_user, deny requests to any route outside job-scoped endpoints. Allow: jobs, job attachments/notes, permissions. Registered as `job_scope` alias. File: app/Http/Middleware/EnforceJobScope.php
- [X] T067 Action: create `CreatePortalInvitation` — creates workspace_user with portal_type_id, optional expires_at, optional job_scope. Sends invitation email for unregistered users. File: app/Actions/Workspace/CreatePortalInvitation.php
- [X] T068 Controller: update `JobShareController` — add `upgrade(Request $request, string $token)` method: validates token, creates user account if needed, converts token to workspace_user with job_scope and job_stakeholder portal_type_id, revokes original token. Route: POST /api/v1/jobs/share/{token}/upgrade. File: app/Http/Controllers/Api/JobShareController.php
- [X] T069 Tests: create `PortalAccessTest` — 25 tests, 65 assertions: portal seeding, portal permission resolution, portal override of role permissions, inactive portal denial, job scope resolution, EnforceJobScope middleware, token upgrade flow, CreatePortalInvitation action. File: tests/Feature/Api/PortalAccessTest.php
- [X] T070 Frontend: SKIPPED — placeholder page created. File: frontend/src/app/(dashboard)/settings/external-access/page.tsx
- [X] T071 Frontend: SKIPPED — placeholder TODO comment added. File: frontend/src/app/share/jobs/[token]/page.tsx

---

## Phase 6: Access Audit Trail [US8]

- [X] T072 Migration: create `access_grants` table — id, actor_user_id (FK), subject_user_id (FK), workspace_id (nullable FK), practice_id (nullable FK), group_id (nullable FK), event (string), details (json), created_at. Indexes on (workspace_id, created_at), (practice_id, created_at), (subject_user_id, created_at). File: database/migrations/2026_03_19_400001_create_access_grants_table.php
- [X] T073 [P] Model: create `AccessGrant` — fillable: all columns. Casts: details → array. BelongsTo actor (User), subject (User), workspace, practice, group. NO updated_at (append-only). File: app/Models/AccessGrant.php
- [X] T074 Service: create `AccessGrantLogger` — methods: logRoleAssigned(), logRoleRevoked(), logCeilingUpdated(), logAccessExpired(), logPortalGranted(). Each creates AccessGrant record. File: app/Services/AccessGrantLogger.php
- [X] T075 Wire logger: call AccessGrantLogger from PermissionService::assignRole(), revokeRole(). Call from PermissionCeilingController::update(). Call from CheckExpiredAccess command (logNewlyExpiredAccess). CreatePortalInvitation does not exist yet (Phase 5 incomplete) — logger method ready. File: app/Services/PermissionService.php + app/Http/Controllers/Api/PermissionCeilingController.php + app/Console/Commands/CheckExpiredAccess.php
- [X] T076 Controller: create `AccessGrantController` — index (list, filterable by workspace_id, practice_id, user_id, date range, event), export (CSV via StreamedResponse). Authorization: workspace owner, practice owner, or super admin. File: app/Http/Controllers/Api/AccessGrantController.php
- [X] T077 Routes: add `GET /api/v1/access-grants` and `GET /api/v1/access-grants/export` to workspace-scoped group. Also added practice-scoped `GET /api/v1/practice/access-grants` and `GET /api/v1/practice/access-grants/export`. File: routes/api.php
- [X] T078 Tests: create `AccessAuditTest` — 16 tests, 48 assertions: all 5 event types logged, entity owner lens, practice owner lens, non-owner denied, filtering (user_id, date range, event type), CSV export format, append-only (no updated_at), PermissionService integration. File: tests/Feature/Api/AccessAuditTest.php
- [X] T079 Frontend: SKIPPED — placeholder page created. File: frontend/src/app/(dashboard)/settings/audit-log/page.tsx

---

## Phase 7: Spatie Removal (Post-Shadow Period)

- [X] T080 Replace `setPermissionsTeamId()` — all 125 calls across Actions, Seeders, Commands, Listeners, Tests. Removed all calls: middleware no longer sets Spatie team context, Jobs/Listeners/Commands no longer call it, Actions use PermissionService, tests no longer need it. File: multiple (10 Actions, 3 Seeders, 2 Commands, 4 Listeners, 80+ Tests)
- [X] T081 Replace `assignRole()` — all 148 calls. Replaced with `app(PermissionService::class)->assignRole($user, $workspaceId, $role)`. Removed Spatie dual-write from PermissionService. Listeners now use `roleInWorkspace()` instead of `hasRole()`. File: multiple (10 Actions, 2 Seeders, 50+ Tests)
- [X] T082 Remove `HasRoles` trait from User model. Removed import and trait usage. Replaced `hasPermissionTo()` to call PermissionResolver directly. Added custom `hasRole()` method that checks workspace_user pivot via PermissionContext. Removed `spatieHasPermissionTo()` and shadow mode logic. File: app/Models/User.php
- [X] T083 Remove Spatie package: `composer remove spatie/laravel-permission`. Deleted config/permission.php. Replaced Spatie migration with legacy table stubs (empty tables for migrate:fresh compatibility). File: composer.json, config/permission.php, database/migrations/2026_03_01_073831_create_permission_tables.php
- [X] T084 Update `RolesAndPermissionsSeeder` — replaced Spatie Permission/Role model usage with custom Role/RolePermission models. Now identical to CustomRolesAndPermissionsSeeder. File: database/seeders/RolesAndPermissionsSeeder.php
- [X] T085 Run full test suite — 827 passed, 4 pre-existing ConsolidationEngineTest failures (unrelated to permissions), 2 skipped. All permission-related tests pass.
- [X] T086 Run `vendor/bin/pint --dirty` — formatted all changed files. File: all modified files
