---
title: "Feature Specification: Roles & Permissions Architecture"
---

# Feature Specification: Roles & Permissions Architecture

**Feature Branch**: `feature/039-rpa`
**Created**: 2026-03-19
**Status**: Draft
**Epic**: 039-RPA
**Initiative**: FL — Financial Ledger Platform
**Effort**: XL (6 sprints)
**Depends On**: 027-PMV (complete), 003-AUT (complete), 009-BIL (complete)

### Out of Scope

- **Authentication provider migration** — login, SSO, SAML, MFA, session management handled by companion epic **040-AUM Auth Provider Migration**. This epic is authorization only.
- **Redis permission caching** — v1 uses per-request computation (~1-3ms with eager loading). Redis TTL + event invalidation deferred until traffic data justifies it.
- **Custom portal configuration** — v1 ships system-defined portal presets only. Configurable portals deferred to a future iteration.
- **Automatic portal type detection** — entity owners manually select a portal type from presets; no AI or rule-based suggestion.
- **Cross-workspace journal entries** — each workspace maintains its own ledger; permissions span workspaces but ledger entries do not.
- **Fine-grained field-level permissions** — v1 operates at the action level (view, create, approve, etc.), not per-field visibility.

---

## Overview

MoneyQuest Ledger's permission system today is flat: 6 workspace roles, ~95 Spatie Permission entries, and middleware that resolves one workspace at a time. This works for a single entity but cannot express the five nested scopes the product vision requires — platform, practice, group, entity, and feature module. This epic replaces Spatie Permission with a custom PermissionResolver that supports practice role templates, permission ceilings (AWS IAM-style boundaries), nested group inheritance, temporal access, and external stakeholder portals. The result is a single authorization engine that answers "who can do what, where, and when" across every scope — while keeping the frontend clean by exposing a permissions API that drives UI gating.

---

### Architectural Decision: Replace Spatie Permission with Custom PermissionResolver

Research (see `research.md`) evaluated three approaches: (A) keep Spatie and build above it, (B) replace Spatie entirely, (C) extend Spatie with middleware. Initial research recommended (A), but after further analysis the decision is **(B) — replace Spatie entirely with a custom permission system.**

Rationale for replacing:
- The PermissionResolver is the single source of truth regardless — keeping Spatie underneath means maintaining two permission systems (Spatie's 5 tables + custom tables for ceilings, templates, groups, portals, audit).
- Spatie's `setPermissionsTeamId()` is a global function that sets state on a singleton. This is fragile when resolving permissions across multiple entities (group inheritance needs to check permissions on 5+ entities in a single request).
- Spatie provides only: 5 database tables, `assignRole()`, `hasPermissionTo()`, and the `HasRoles` trait. No middleware, no wildcards, no events, no custom models are used. The value-add is minimal.
- The migration is mechanical, not complex: 31 policies (find/replace), 148 `assignRole` calls, 80+ test fixtures. All 590+ existing tests validate the migration (same inputs, same outputs).
- Follows the AWS IAM Permissions Boundaries pattern: ceilings never grant, they only restrict.

Migration path:
1. Build the custom `PermissionResolver` service + new database tables
2. Implement `PermissionService` (assignRole, revokeRole, syncPermissions) as the single API for permission mutations
3. Override `hasPermissionTo()` on the User model to call the resolver (all 225 existing calls work unchanged during migration)
4. Migrate existing role/permission data from Spatie tables to new tables
5. Replace `setPermissionsTeamId()` calls — the resolver takes `workspace_id` as a parameter, no global state
6. Remove Spatie package, `HasRoles` trait, Spatie migration, config
7. All 590+ tests validate the migration — same inputs, same outputs

Caching strategy: Per-request computation only (no Redis cache). The resolver computes effective permissions once at the start of each request in `SetWorkspaceContext` middleware, stores the result on the request object. Fresh every request, simple, correct, ~1-3ms with eager loading. Redis caching deferred to a future optimisation pass when traffic data justifies it.

### Current State

- **What works**: Spatie Permission with team mode, 6 workspace roles (owner/accountant/bookkeeper/approver/auditor/client), ~95 granular permissions, 31 policies registered in AppServiceProvider, `SetWorkspaceContext` middleware setting team context.
- **What's missing**: No permissions API endpoint for the frontend. No frontend hooks or UI gating. No practice-scoped role templates. No nested group hierarchy. No permission ceilings. No temporal access (expires_at). No portal abstraction for external stakeholders. Missing policies for Quotes, Purchase Orders, and Bills.

---

## User Scenarios & Testing

### User Story 1 — Permissions API & Frontend Gating (Priority: P1)

As a workspace user, I see only the navigation items and action buttons that I have permission to use, so that the interface is clean and I'm never confused by disabled features I can't access.

Every other permission story depends on the frontend being able to query and enforce permissions. This unblocks all UI work.

**Why this priority**: The permissions API is the foundation layer. Without it, practices cannot template roles, ceilings cannot be visualised, and group inheritance cannot be surfaced. Every P2 and P3 story assumes the frontend already knows what the user can do.

**Independent Test**: Log in as a bookkeeper. Verify the "Approve" button on journal entries is hidden. Verify the "Settings" nav item is hidden. Log in as an owner. Verify everything is visible. Change the bookkeeper's role mid-session and verify the UI updates on next navigation.

**Acceptance Scenarios**:

1. **Given** I am authenticated with a workspace selected, **When** I request `GET /api/v1/permissions`, **Then** I receive a flat array of all permission strings I hold for that workspace (e.g., `{ permissions: ["invoice.view", "invoice.create"] }`).

2. **Given** I am a bookkeeper, **When** I view the invoice list, **Then** the "Approve" and "Void" action buttons are not rendered.

3. **Given** I am an auditor, **When** I view the sidebar navigation, **Then** I see all view-only sections but no "Create" or "New" buttons anywhere.

4. **Given** I am an owner, **When** I view any page, **Then** all actions and navigation items are visible.

5. **Given** my role changes mid-session (e.g., downgraded by workspace owner), **When** I navigate to a new page, **Then** my permissions refresh and the UI updates accordingly.

6. **Given** I request `GET /api/v1/permissions/explain`, **Then** I receive structured capabilities with source attribution (direct, practice_ceiling, group_inheritance, feature_flag) for admin/settings pages and practice owner oversight.

---

### User Story 2 — Practice Role Templates (Priority: P1)

As a practice owner, I define role templates that control what level of access my firm's staff receive when assigned to client entities, so that I maintain consistent access policies across all client files.

Practices (accounting firms, lending companies, tax agents) are the primary power users. Without role templates, every staff-to-entity assignment is ad hoc and error-prone.

**Why this priority**: Role templates are the mechanism through which practices scale. A firm with 50 client entities and 10 staff cannot manage 500 individual permission assignments. Templates reduce this to ~5 template definitions. They also enable practice-type defaults (accounting firm vs lending company vs tax agent), which are critical for onboarding.

**Independent Test**: Create a practice. Define a "Tax Reviewer" template with read-only financials + period sign-off. Assign a staff member to a client entity using that template. Verify the staff member has exactly those permissions and no more.

**Acceptance Scenarios**:

1. **Given** I am a practice owner, **When** I create a role template, **Then** I can select from the full list of entity-level permissions to include and optionally restrict which feature modules are visible to staff using this template.

2. **Given** I have a role template defined, **When** I assign a practice member to a client entity, **Then** I can select which template governs their access.

3. **Given** a staff member is assigned via template, **When** the template is updated (permission added or removed), **Then** the staff member's effective permissions on all assigned entities update accordingly.

4. **Given** a practice has templates defined, **When** a new staff member joins the practice, **Then** the default template is suggested during assignment.

5. **Given** my practice type is "accounting firm", **When** I view the template management page for the first time, **Then** system-provided default templates appropriate to accounting firms are pre-populated.

---

### User Story 3 — Permission Ceilings (Priority: P1)

As a practice owner, I set maximum permission boundaries for my staff, so that even if a client entity owner grants broader access, my staff can never exceed the ceiling I've defined.

Critical for compliance and professional liability. A practice must guarantee that a bookkeeper can never approve journal entries on any client file, regardless of what the client entity owner tries to grant.

**Why this priority**: Ceilings are the compliance backbone. Without them, a client entity owner could inadvertently (or deliberately) grant a junior practice staff member dangerous permissions like `journal-entry.approve` or `period.close`. For regulated professions (CPA firms, tax agents), the inability to enforce maximum boundaries is a deal-breaker.

**Independent Test**: Set a practice ceiling that excludes `journal-entry.approve`. Have a client entity owner try to assign the accountant role (which includes approve) to a practice staff member. Verify the effective permission does not include approve.

**Acceptance Scenarios**:

1. **Given** a practice has a ceiling that excludes `journal-entry.approve`, **When** a client entity owner assigns a practice member the "accountant" role, **Then** the member's effective permissions exclude `journal-entry.approve`.

2. **Given** a practice ceiling is in place, **When** a practice owner views their staff's effective permissions on any entity, **Then** the ceiling-limited permissions are clearly indicated (e.g., struck-through or badged as "ceiling restricted").

3. **Given** a practice changes their ceiling to become more restrictive, **When** the change is saved, **Then** all existing staff assignments are immediately re-evaluated against the new ceiling.

4. **Given** a staff member has permissions through both direct entity access AND practice-granted access, **When** the ceiling is evaluated, **Then** the ceiling only restricts the practice-granted path — direct entity grants remain unrestricted.

---

### User Story 4 — Nested Group Hierarchy (Priority: P2)

As a group manager, I organise entities into a hierarchical structure (e.g., Holdings Co > AU Operations > individual entities), so that I can manage permissions and view consolidated data at any level of the tree.

Enables corporate structures, family trusts, and multi-entity businesses to be represented naturally. Required for consolidated reporting and inherited access.

**Why this priority**: Group hierarchy extends the flat workspace groups from 027-PMV into a proper organisational tree. While not blocking day-to-day accounting, it is required for consolidated reporting (028-CFT) and for any business with a holding company structure. P2 because the P1 stories (API, templates, ceilings) deliver value for single-entity and flat-group use cases first.

**Independent Test**: Create a top-level group "Smith Holdings". Add a subgroup "AU Trading". Add two entities to AU Trading. Assign a viewer at the Smith Holdings level. Verify they can see all entities in both the top group and the AU Trading subgroup.

**Acceptance Scenarios**:

1. **Given** I am a group manager, **When** I create a subgroup within an existing group, **Then** the subgroup appears nested under the parent in the group view.

2. **Given** a user has "manager" role at the top-level group, **When** they navigate to any entity within any nested subgroup, **Then** they have full manager access inherited from the top level.

3. **Given** a user has "viewer" role at a subgroup level, **When** they navigate to the parent group's consolidated view, **Then** they can only see data from entities within their subgroup, not the full parent group.

4. **Given** a group hierarchy exists, **When** I view it, **Then** the maximum nesting depth is 4 levels (top group > subgroup > sub-subgroup > entity).

5. **Given** a user has "entity_viewer" role scoped to one entity via `entity_scope_workspace_id`, **When** they view the group, **Then** they see only that single entity's data.

---

### User Story 5 — Temporal Access (Priority: P2)

As a workspace owner, I grant time-limited access to external parties (auditors, seasonal staff, temporary advisors), so that access automatically expires without manual intervention.

Auditor engagements end, tax season staff rotate out, and advisory relationships are project-based. Forgetting to revoke access is a compliance risk.

**Why this priority**: Temporal access is a compliance and risk reduction feature. It prevents the "forgotten auditor" problem where an external party retains access months after their engagement ends. P2 because the system works without it (manual revocation) but is significantly riskier. Pairs with the access audit trail (Story 8) for a complete compliance picture.

**Independent Test**: Invite an auditor with access expiring 2026-06-30. Verify they can access the workspace before that date. Verify they are denied access on 2026-07-01. Verify the workspace owner sees the upcoming expiry in their members list.

**Acceptance Scenarios**:

1. **Given** I am a workspace owner, **When** I invite a user, **Then** I can optionally set an expiry date for their access.

2. **Given** a user has time-limited access, **When** the current date passes the expiry, **Then** the user is denied access to the workspace on their next request.

3. **Given** a user has time-limited access, **When** I view the members list, **Then** I see the expiry date and a visual indicator when expiry is within 30 days.

4. **Given** a user's access has expired, **When** the workspace owner views the members list, **Then** the expired member is shown in an "Expired" section with an option to re-invite or extend.

5. **Given** a user's access is expiring, **When** the expiry is 30 days, 7 days, and 1 day away, **Then** both the access holder AND the entity owner (or practice owner who granted access) receive a notification with the option to extend or let expire.

6. **Given** a practice assigns staff to a client entity, **When** the assignment includes an expiry, **Then** the same temporal rules apply at the practice-entity level.

---

### User Story 6 — External Stakeholder Portals (Priority: P2)

As a lender, auditor, or external stakeholder, I access a scoped view of an entity's financial data through a portal, so that I see only what's relevant to my role without navigating the full application.

Lending companies, external auditors, and family members each need different slices of financial data. This is the "many lenses" vision — same ledger, different views.

**Why this priority**: Portals are what transform MoneyQuest from "accounting tool" to "financial data platform". They create the network effect — every lender, auditor, or family member who receives a portal invitation becomes a potential user. P2 because the underlying permission infrastructure (P1 stories) must exist first, and the V1 portal types are preset-only (not custom-configurable).

**Independent Test**: Create a lending portal invitation for an entity. Log in as the lender. Verify they see only financial statements, loan covenants, and specific reports. Verify they cannot see individual transactions, contacts, or invoices.

**Acceptance Scenarios**:

1. **Given** a workspace owner creates a portal invitation, **When** they select the "Lender" portal type, **Then** the invitation is pre-configured with read-only access to financial statements and loan-related data only.

2. **Given** a lender accesses the portal, **When** they navigate the application, **Then** they see a simplified UI with only the permitted sections — no sidebar clutter from features they can't access.

3. **Given** an auditor portal is created, **When** the auditor logs in, **Then** they have read-only access to all financial data for a specified date range only (temporal + data scoping combined).

4. **Given** a portal exists, **When** the workspace owner views their "External Access" settings, **Then** they see all active portals, who has access, what they can see, and when access expires.

---

### User Story 7 — Job-Scoped Access (Priority: P3)

As a workspace owner, I invite an external party to view reporting on a specific job/project only, without granting them access to the wider entity.

Extends the existing job share token pattern (which is public/anonymous) to authenticated, permission-controlled access. Useful for subcontractors, project stakeholders, and clients who only care about one project.

**Why this priority**: Job-scoped access is a niche but valuable extension. It builds on the existing anonymous share token infrastructure (008-JCT) and adds authentication, audit trails, and expiry. P3 because it serves a smaller user segment (project-based businesses) and the anonymous token already provides basic functionality.

**Independent Test**: Invite a user with access scoped to Job #42. Verify they can see Job #42's profitability, transactions, and attachments. Verify they cannot see any other jobs, invoices, or entity-level data.

**Acceptance Scenarios**:

1. **Given** I am a workspace owner, **When** I invite a user with job-scoped access, **Then** I can select one or more specific jobs they can view.

2. **Given** a user has job-scoped access, **When** they log in, **Then** they see only the job dashboard for their permitted jobs — not the entity-level dashboard.

3. **Given** a user has job-scoped access, **When** they attempt to access any entity-level page (invoices, contacts, chart of accounts), **Then** they are denied.

4. **Given** a user has job-scoped access and the job is marked complete, **When** they access the portal, **Then** they see the final state as read-only (no further updates).

5. **Given** an anonymous job share token has been sent, **When** the recipient clicks "Create Account" from the shared dashboard, **Then** their token converts to an authenticated job-scoped membership with full audit trail and expiry support.

6. **Given** an anonymous share token exists, **When** the recipient creates an account via the upgrade flow, **Then** the original token is revoked and replaced by the authenticated membership.

---

### User Story 8 — Access Audit Trail (Priority: P3)

As a workspace owner or practice owner, I view a complete history of who has been granted access, when, by whom, and when access was revoked, so that I can demonstrate compliance to auditors and regulators.

Financial data access is regulated. Being able to answer "who had access to this entity's data in the last 12 months" is a compliance requirement.

**Why this priority**: The audit trail is the compliance capstone. It is not needed for the permission system to function, but it is required for any regulated entity to adopt the product. P3 because it adds observability to a system that already works — it does not enable new capabilities, it makes existing ones auditable.

**Independent Test**: Grant and revoke access for 3 different users over a week. View the access audit log. Verify all grants, revocations, and changes are recorded with timestamps and the actor who made the change.

**Acceptance Scenarios**:

1. **Given** any permission change occurs (grant, revoke, role change, expiry), **When** I view the access audit log, **Then** I see the change with timestamp, who made it, what changed, and the affected user.

2. **Given** I am an entity owner, **When** I view the audit log, **Then** I see all access events for my entity (including which practice staff accessed it), filterable by user or date range.

3. **Given** I am a practice owner, **When** I view the audit log, **Then** I see all my staff's access events across all client entities, filterable by entity, staff member, or date range.

4. **Given** a compliance request, **When** I export the audit log, **Then** I receive a structured report of all access events for the requested period, scoped by entity or practice depending on who requested it.

---

### Edge Cases

- **Multi-practice overlap on same entity**: When a user belongs to multiple practices that both have access to the same entity, per-path ceilings apply. Each practice's ceiling only applies to permissions granted through that practice. Effective permissions = (Practice A grants intersection Practice A ceiling) union (Practice B grants intersection Practice B ceiling). Each practice governs its own relationship independently.

- **Group deletion with child entities**: When a group is deleted but the entities within it still exist, entities are detached from the group but retain their own access. Group-level permissions are revoked.

- **Direct + practice access to same entity**: When a user has both direct entity access AND practice-inherited access, direct entity grants are unrestricted — no ceiling applies. Practice ceiling only applies to permissions granted through the practice-entity relationship. Effective = (direct grants) union (practice grants intersection practice ceiling). A user who owns an entity AND works at a practice that services that entity gets full owner permissions from the direct path. The practice ceiling only governs their access to other client entities assigned through the practice.

- **Temporal expiry mid-session**: When temporal access expires mid-session, the next API request is denied. Frontend refreshes permissions on navigation and shows an "access expired" message.

- **Practice removed from client entity**: When a practice is removed from a client entity, all practice staff lose access immediately. An audit event is recorded.

- **Maximum group nesting depth**: When a user attempts to create a 5th nesting level, the system prevents it and the UI shows a depth limit warning.

- **Spatie migration data integrity**: During the Spatie-to-custom migration, if a user has roles in Spatie that do not map to a new-system role, the migration logs a warning and assigns the most restrictive matching role rather than silently dropping the user.

- **Concurrent permission mutations**: When two admins simultaneously change the same user's permissions, the last write wins. The audit trail records both changes, making conflicts visible after the fact.

---

## Requirements

### Functional Requirements

**Scope 1: Platform**
- **FR-001**: System MUST support a super admin role that can access all workspaces, practices, and groups across the platform.
- **FR-002**: System MUST provide a platform administration dashboard accessible only to super admins.

**Scope 2: Practice**
- **FR-003**: System MUST allow practice owners to define role templates — named sets of entity-level permissions AND module visibility restrictions.
- **FR-004**: System MUST allow practice owners to define permission ceilings — maximum boundaries that no staff member can exceed regardless of entity-level grants.
- **FR-005**: System MUST support multiple practice types (accounting firm, lending company, tax agent, financial services) with type-specific default templates.
- **FR-006**: System MUST enforce practice ceilings by computing effective permissions as the intersection of (entity role permissions) AND (practice ceiling).
- **FR-007**: When a practice role template is updated, system MUST re-evaluate all active staff assignments against the new template.

**Scope 3: Group**
- **FR-008**: System MUST support nested groups with a maximum depth of 4 levels.
- **FR-009**: System MUST inherit permissions downward through the group tree — a manager at level 1 has manager access to all levels below.
- **FR-010**: System MUST prevent upward permission leakage — a viewer at level 3 cannot see data from level 1 or 2 entities outside their branch.
- **FR-011**: System MUST support three group-level roles that map to entity-level roles: manager maps to owner on all entities below, viewer maps to auditor (read-only) on all entities below, entity_viewer maps to auditor on a single scoped entity. Group role is syntactic sugar for bulk entity role assignment — permissions resolve at entity level via the PermissionResolver.

**Scope 4: Entity (Workspace)**
- **FR-012**: System MUST expose an API endpoint (`GET /api/v1/permissions`) that returns the authenticated user's effective permissions for the current workspace as a flat string array (e.g., `{ permissions: ["invoice.view", "invoice.create"] }`). A separate debug endpoint (`GET /api/v1/permissions/explain`) MUST return structured capabilities with source attribution (direct, practice_ceiling, group_inheritance, feature_flag) for admin/settings pages and practice owner oversight.
- **FR-013**: System MUST support temporal access with an optional `expires_at` on workspace memberships, practice assignments, and group memberships.
- **FR-014**: When access expires, system MUST deny all subsequent requests and retain the membership record in an "expired" state for audit purposes.
- **FR-015**: System MUST support job-scoped access — a user can be granted access to specific jobs within a workspace without full workspace access.
- **FR-016**: System MUST record all permission changes (grants, revocations, role changes, expiry events) in an access audit log with timestamp, actor, and details.

**Scope 5: Feature Module**
- **FR-017**: System MUST support per-entity feature flags that control which modules are available (lending, tax, personal ledger, etc.).
- **FR-018**: Feature flags MUST be enforced at both the API level (middleware) and included in the permissions API response for frontend gating.

**Frontend**
- **FR-019**: Frontend MUST fetch and cache the user's permissions for the active workspace using a TanStack Query hook (e.g., `usePermissions()`).
- **FR-020**: Frontend MUST hide navigation items and action buttons that the user lacks permission for. A shared `<PermissionGate permission="invoice.approve">` component MUST wrap any conditionally-rendered UI.
- **FR-021**: Frontend MUST refresh permissions when the user switches workspaces or navigates to a new page (not on every render — cached with invalidation).

**Spatie Migration**
- **FR-022**: System MUST replace Spatie Permission entirely with a custom PermissionResolver. The User model's `hasPermissionTo()` method MUST be overridden to call the resolver so all 225 existing call sites work unchanged during migration.
- **FR-023**: System MUST provide a `PermissionService` class (assignRole, revokeRole, syncPermissions) as the single API for permission mutations, replacing all direct Spatie calls.
- **FR-024**: System MUST migrate existing role/permission data from Spatie tables to the new schema with zero data loss.

**Missing Policies**
- **FR-025**: System MUST have policies for Quotes, Purchase Orders, and Bills, matching the permissions already defined in the seeder.

### Key Entities

- **RoleTemplate**: A named, practice-scoped set of entity-level permissions AND module visibility restrictions. Belongs to a Practice. Defines which of the ~95 permissions are granted, and which feature modules are hidden from staff (one-way restriction — templates can hide modules but never enable modules the entity hasn't paid for). Applied when assigning staff to entities.

- **PermissionCeiling**: A practice-scoped maximum boundary. Defines the highest permissions any practice staff can hold on any entity, regardless of entity-level grants. Stored as a set of permission strings representing the ceiling. Effective permissions = (entity role grants) intersection (practice ceiling).

- **AccessGrant**: An audit log entry recording every permission change. Records: who changed, what changed, when, the actor, and the affected user/entity. Immutable — entries are append-only, never updated or deleted.

- **PortalType**: A system-defined preset defining a scoped view — which permissions, which UI sections, and which data filters apply. Entity owners select from presets but cannot customise them (custom configuration deferred to future iteration). The architecture supports any number of portal types via a single `portal_types` table — adding a new stakeholder type is a new row, not new code.

  **V1 presets** (ship first):
  - **Accountant/Bookkeeper** — full or partial ledger access (via practice role templates)
  - **Auditor** — read-only all financial data, time-bounded
  - **Client** — limited read (invoices, statements, payments owed)
  - **Job Stakeholder** — scoped to specific jobs only

  **Future presets** (architecture supports, not yet built):
  - **Lender** — financial statements, loan covenants, specific ratios
  - **Wealth Advisor** — net worth, asset allocation, investment accounts, cross-entity consolidated view
  - **Money Coach** — budgets, spending patterns, cash flow, goals (pairs with 037-GLS Goal Setting)
  - **Tax Agent** — BAS/tax reports, period sign-off, lodgement data
  - **Mortgage Broker** — income verification, asset/liability summary, specific date ranges
  - **Financial Planner** — retirement projections, insurance, superannuation, full financial picture
  - **Family Member** — simplified net worth view, specific entity visibility (via group entity_viewer)
  - **Trustee** — trust-specific view with distributions, beneficiary reporting
  - **Insurer** — asset valuations, risk-relevant financial data
  - **Franchise Head Office** — consolidated performance across franchisee entities

- **WorkspaceGroup.parent_id**: Self-referential foreign key enabling nested group hierarchy.

- **workspace_users.expires_at**: Temporal access column on the workspace membership pivot.

- **practice_workspaces.expires_at**: Temporal access column on the practice-entity pivot.

- **group_member_users.expires_at**: Temporal access column on the group membership.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A bookkeeper logging into any entity sees zero action buttons they cannot use — 100% frontend permission enforcement.
- **SC-002**: Practice owners can assign staff to client entities in under 30 seconds by selecting a pre-defined role template.
- **SC-003**: Permission ceiling violations are caught 100% of the time — no practice staff member can ever exceed their practice's ceiling.
- **SC-004**: Group hierarchy supports at least 50 entities across 4 nesting levels without performance degradation on permission resolution.
- **SC-005**: Temporal access expires within 1 minute of the expiry time — no stale sessions persist.
- **SC-006**: Access audit log captures 100% of permission change events with zero gaps.
- **SC-007**: The permissions API endpoint (`GET /api/v1/permissions`) responds in under 50ms for a user with access to 20+ entities.
- **SC-008**: External stakeholders (lenders, auditors) can access their portal within 2 minutes of receiving an invitation.
- **SC-009**: Spatie Permission is fully removed — zero references to `HasRoles` trait, `setPermissionsTeamId()`, or Spatie permission tables remain in the codebase after migration.
- **SC-010**: All 590+ existing tests pass after the Spatie-to-custom migration with zero behaviour changes.

---

## Clarifications

### Session 2026-03-19

- Q: Spatie Permission: keep, extend, or replace? → A: Replace entirely. Initial research recommended keeping Spatie, but further analysis showed maintaining two permission systems (Spatie tables + custom tables) adds complexity without value. Spatie only provides 5 tables, assignRole(), hasPermissionTo(), and HasRoles trait — all trivially replaceable. The migration is mechanical (31 policies, 148 assignRole calls, 80+ test fixtures) and validated by 590+ existing tests.

- Q: How does the PermissionResolver integrate with existing policies? → A: Override `hasPermissionTo` on the User model during migration so all 225 existing calls work unchanged. Then progressively replace with Laravel's native `Gate::authorize()` / `$user->can()`. New PermissionService handles all mutations (assignRole, revokeRole, syncPermissions). No global state — workspace_id passed as parameter, not via singleton.

- Q: Auth provider migration (WorkOS, SSO, SAML)? → A: Out of scope for this epic. Separate companion epic created: 040-AUM Auth Provider Migration.

- Q: When a user reaches an entity through multiple practices, how do ceilings combine? → A: Per-path ceilings. Each practice's ceiling only applies to permissions granted through that practice. Effective permissions = (Practice A grants intersection Practice A ceiling) union (Practice B grants intersection Practice B ceiling). Each practice governs its own relationship independently.

- Q: Direct entity access vs practice-granted access — how do ceilings interact? → A: Direct entity grants (via workspace_users pivot) are unrestricted — no ceiling applies. Practice ceilings only govern permissions granted through the practice-entity relationship. A user who directly owns an entity AND works at a practice that services it gets full owner permissions from the direct path. The ceiling only applies to other client entities assigned through the practice.

- Q: Group inheritance — does a group role grant entity-level permissions or just visibility? → A: Group role maps directly to an entity role. Manager maps to owner on all entities below. Viewer maps to auditor (read-only) on all entities below. Entity_viewer maps to auditor on their one scoped entity. Group role is syntactic sugar for bulk entity role assignment. Permissions resolve at entity level via the PermissionResolver.

- Q: Who can view the access audit log? → A: Both entity owners and practice owners with full visibility. Entity owners see all access to their entity (including practice staff). Practice owners see all their staff's access across all client entities. Same audit data, two lenses — scoped by entity or practice depending on the viewer.

- Q: Temporal access notifications before expiry? → A: Notify both sides. The access holder AND the entity/practice owner who granted access receive notifications at 30 days, 7 days, and 1 day before expiry with option to extend or let expire.

- Q: Can practice role templates restrict feature modules or just permissions? → A: Both (option C). Templates define permissions AND module visibility. One-way restriction — templates can hide modules from staff but never enable modules the entity hasn't paid for. A tax agent's bookkeepers don't need to see the lending module even if it's enabled on the client entity.

- Q: Frontend permissions API format? → A: Flat string array for the main endpoint (GET /api/v1/permissions). Separate debug endpoint (GET /api/v1/permissions/explain) returns structured capabilities with source attribution (direct, practice_ceiling, group_inheritance, feature_flag) for admin/settings pages and practice owner oversight.

- Q: PermissionResolver caching strategy? → A: Per-request only for launch. Compute once in SetWorkspaceContext middleware, store on request object. No Redis cache. ~1-3ms with eager loading. Redis TTL + event invalidation deferred to future optimisation when traffic data justifies it.

- Q: Job-scoped access vs existing anonymous share tokens? → A: Coexist with upgrade path. Anonymous tokens stay for quick one-off shares. Add "Convert to authenticated access" flow — recipient creates account, token converts to permanent job-scoped membership with audit trail and expiry. Original token revoked on conversion.

- Q: Portal types — configurable per entity or system-defined presets? → A: System-defined presets only for launch. V1 ships with Accountant/Bookkeeper, Auditor, Client, Job Stakeholder. Architecture supports 10+ future portal types (Lender, Wealth Advisor, Money Coach, Tax Agent, Mortgage Broker, Financial Planner, Family Member, Trustee, Insurer, Franchise Head Office) — each is a new row in portal_types, not new code. Configurable portals deferred to future iteration.
