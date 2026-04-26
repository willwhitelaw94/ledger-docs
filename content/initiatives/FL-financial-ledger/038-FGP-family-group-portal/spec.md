---
title: "Feature Specification: Family & Owner Groups (Home Experience)"
---

# Feature Specification: Family & Owner Groups (Home Experience)

**Feature Branch**: `038-FGP-family-group-portal`
**Created**: 2026-03-17
**Updated**: 2026-03-19
**Status**: Draft (revised — merged with /home experience)
**Epic**: 038-FGP
**Initiative**: FL — Financial Ledger Platform
**Effort**: L (4 sprints)
**Depends On**: 028-CFT (complete), 027-PMV (complete), 055-ACF (specced), 051-EHS (specced)

### Out of Scope

- **New data models for groups** — v1 reuses the existing `WorkspaceGroup`, `WorkspaceGroupMember`, and `GroupInvitation` models from 027-PMV/028-CFT. No new group tables.
- **Practice group changes** — this epic only adds owner-created groups. Practice group behaviour (027-PMV) is unchanged.
- **Real-time activity streaming** — activity feed on /home uses polling, not WebSockets. Real-time deferred to 055-ACF v2.
- **Group-level budgets or targets** — no cross-entity budgeting in v1.
- **Custom dashboard layouts** — /home layout is fixed in v1. Customisable widget arrangements deferred.
- **Mobile-native /home** — responsive web only. Native app deferred.
- **AI-powered group insights** — no AI-generated commentary or suggestions on the /home page in v1.

---

## Overview

Users managing multiple entities — a sole trader with a company, trust, SMSF, and personal ledger — need a unified home screen that shows everything at once. This epic extends the existing `WorkspaceGroup` model (built for practice managers in 027-PMV/028-CFT) to support **owner-created groups**, and builds the `/home` page into a proper multi-entity command centre. One model, two use cases: practice groups for accountants, owner groups for entity owners.

### What Changed (2026-03-19)

The original spec envisioned a separate "Family Group Portal." That concept has been absorbed into the `/home` experience because:

1. **Practice groups already exist** (027-PMV) — `WorkspaceGroup` with hierarchy, consolidation, invitations
2. **Owner groups are the same data model** — just `practice_id = null`, created by the entity owner
3. **The `/home` page is where this lives** — not a separate portal
4. **Activity Feed (055-ACF)** handles the cross-workspace notification stream
5. **Entity Health Score (051-EHS)** provides per-entity health on the grid

### Architecture: One Model, Two Use Cases

```
WorkspaceGroup
├── Practice Group (practice_id set)
│   ├── Created by practice manager
│   ├── Groups client workspaces for operational management
│   ├── Practice sees: tasks, streaks, health flames, consolidation
│   └── Client sees: read-only group membership
│
└── Owner Group (practice_id null, created_by_user_id set)
    ├── Created by entity owner from /home
    ├── Groups their own workspaces ("Family", "Business Holdings", "Investments")
    ├── Owner sees: consolidated net worth, health scores, activity, gamification
    └── Can invite other users with tiered permissions (manager/viewer/entity-viewer)
```

---

## User Scenarios & Testing

### User Story 1 — Create Owner Group from /home (Priority: P1)

A user managing 5 entities — a company, a trust, an SMSF, a personal ledger, and a side business — logs into /home and sees them all listed individually. They want to organise related entities into named groups so they can see consolidated views and keep things tidy. Today, only practice managers can create groups. This story gives entity owners the same power.

**Why this priority**: Group creation is the foundational action for everything else in this epic. Without the ability to create owner groups, there is no /home grouping experience, no consolidated view for owners, and no invitation flow. Every other story depends on owner groups existing.

**Independent Test**: Can be tested by logging in as a user who owns 5 workspaces, creating a group with 3 of them, and verifying the group appears on /home with the remaining 2 workspaces in the ungrouped section.

**Acceptance Scenarios**:

1. **Given** I am on /home and own 5 workspaces, **When** I click "Create Group", **Then** I see a modal where I can name the group (e.g., "Smith Family") and select which of my workspaces to include via checkboxes.

2. **Given** I create a group "Business Holdings" with 3 workspaces, **When** I view /home, **Then** I see the group as a card showing: group name, consolidated net worth, entity count, and a health summary.

3. **Given** I have ungrouped workspaces after creating a group, **When** I view /home, **Then** the ungrouped workspaces appear in an "Ungrouped" section below my groups.

4. **Given** I own only 1 workspace, **When** I view /home, **Then** I see the entity card directly without any group creation prompt — groups are optional and only useful with 2+ entities.

5. **Given** I create an owner group, **When** the group is saved, **Then** the `workspace_groups` record has `practice_id = null` and `created_by_user_id` set to my user ID.

---

### User Story 2 — /home Entity Grid (Priority: P1)

A user with 8 entities logs into /home and needs to see all their entities at a glance with key metrics — cash position, health, streak status, and recent activity. Today's /home page is a basic workspace selector. This story transforms it into a multi-entity command centre with rich entity cards.

**Why this priority**: The entity grid is the primary visual interface of /home. Even users who don't create groups need this view. It replaces the basic workspace list with actionable, information-dense cards that reduce the need to click into each workspace individually.

**Independent Test**: Can be tested by seeding a user with 8 workspaces (varying health scores, balances, and activity timestamps), loading /home, and verifying all 8 entity cards render with correct data.

**Acceptance Scenarios**:

1. **Given** I have 8 workspaces, **When** I view /home, **Then** I see a grid of entity cards, each showing: workspace name, entity type icon, cash balance, health score badge (from 051-EHS), streak flame (from 036-GMF), and last activity timestamp.

2. **Given** an entity has a health score below 40, **When** I view the grid, **Then** that entity card shows a red health indicator to draw attention.

3. **Given** I click an entity card, **When** I am redirected, **Then** I land on that workspace's dashboard (`/dashboard` with workspace context set).

4. **Given** I have entities in groups and ungrouped, **When** I view /home, **Then** grouped entities appear under their group headers and ungrouped entities appear in a separate "Ungrouped" section.

5. **Given** the grid is loading, **When** health scores and balances are still being fetched, **Then** the entity cards render immediately with name and type, and health/balance data populates asynchronously (no blocking spinner).

---

### User Story 3 — Consolidated Group View (Priority: P2)

A user clicks into their "Smith Family" group and wants to see the combined financial picture across all 3 entities — total net worth, a consolidated balance sheet, and per-entity breakdowns with health scores. This reuses the 028-CFT consolidation engine but surfaces it through the owner group experience rather than the practice portal.

**Why this priority**: Consolidation is the "wow" feature that justifies groups beyond organisation. However, it depends on groups existing (Story 1) and the entity grid being in place (Story 2) as the navigation surface. The 028-CFT consolidation engine already works — this story is about wiring it to the owner group context.

**Independent Test**: Can be tested by creating an owner group with 3 workspaces that have known balance sheet data, navigating to the group detail view, and verifying the consolidated net worth matches the manual sum.

**Acceptance Scenarios**:

1. **Given** I have a group "Smith Family" with 3 entities, **When** I click the group card on /home, **Then** I see: consolidated net worth (headline number), consolidated balance sheet summary (from 028-CFT), and per-entity breakdown cards with health scores.

2. **Given** one entity in the group is a trust and another is personal, **When** I view the group consolidation, **Then** inter-entity positions (e.g., loans between trust and personal) are highlighted with an "inter-entity" badge.

3. **Given** the group has entities that use different base currencies, **When** consolidated, **Then** amounts are converted to the group's base currency (or the user's preferred currency) using the most recent exchange rate.

4. **Given** I am viewing the consolidated group view, **When** I click on a balance sheet line item, **Then** I see the per-entity drill-down showing each workspace's contribution (same pattern as 028-CFT).

---

### User Story 4 — Invite Family Members (Priority: P2)

A user wants to share their "Smith Family" group view with their spouse, who should see the combined net worth and entity summaries but not have access to modify anything or see individual transactions. The accountant-facing invitation flow (028-CFT) already exists — this story makes it available to entity owners with the same tiered permission model.

**Why this priority**: Invitations are the viral growth mechanism — every family member who sees their combined wealth becomes a potential user. However, the core /home and group experience must work for the owner first (P1 stories) before extending to invited users.

**Independent Test**: Can be tested by creating an owner group, inviting a new user as a Viewer, logging in as that user, and verifying they see the group on /home with summary-only access.

**Acceptance Scenarios**:

1. **Given** I own a group "Smith Family", **When** I click "Invite Member", **Then** I see a form to enter an email and select a permission level: Manager (full access), Viewer (read-only all entities), Entity Viewer (read-only specific entities).

2. **Given** my spouse accepts the invitation, **When** they log in and view /home, **Then** they see the "Smith Family" group with access limited to their permission level.

3. **Given** I invited someone as Entity Viewer for only the trust, **When** they view the group, **Then** they see only the trust entity summary — not my personal ledger, company, or any other entity.

4. **Given** I am a Manager on an owner group (invited, not the creator), **When** I access the group, **Then** I can invite other users and manage members, but I cannot delete the group.

5. **Given** I revoke a Viewer's access, **When** they next try to access the group, **Then** they see a "You no longer have access" message and the group disappears from their /home.

---

### User Story 5 — Group Activity Feed (Priority: P2)

A user viewing their group wants to see a merged activity stream from all entities — bank syncs, journal entry posts, invoices sent, revaluations — so they have a single timeline of what happened across their financial world. This integrates with the 055-ACF Activity Feed epic.

**Why this priority**: The activity feed adds temporal context to the static financial snapshot. It answers "what happened recently?" But it depends on 055-ACF being at least partially implemented, making it a P2 that can be delivered incrementally.

**Independent Test**: Can be tested by generating activity events across 3 workspaces in a group, loading the group view, and verifying the merged feed shows events from all 3 in reverse chronological order.

**Acceptance Scenarios**:

1. **Given** I'm viewing a group with 3 entities, **When** I look at the activity section, **Then** I see a merged activity stream from all entities in the group (bank syncs, JE posts, invoices, revaluations) in reverse chronological order.

2. **Given** the activity feed is displayed, **When** I filter by a specific entity, **Then** I see only that entity's activity within the group context.

3. **Given** an activity item references a specific workspace, **When** I click on it, **Then** I am navigated to the relevant page in that workspace's context.

---

### Edge Cases

- **What happens when a user owns only 1 workspace?** They see the entity card directly on /home. No group creation prompt. The "Create Group" button is visible but not emphasised.
- **What happens when a workspace belongs to both a practice group and an owner group?** Both group memberships are valid and independent. The workspace appears in the practice group for the accountant and in the owner group for the entity owner. Consolidation runs independently per group.
- **What happens when a user is both a workspace owner and an invited Viewer on another group?** /home shows their owned workspaces/groups AND any groups they've been invited to, in separate sections: "My Entities" and "Shared with Me".
- **What happens when a user removes all workspaces from a group?** The group becomes empty but persists (not auto-deleted). It shows "No entities in this group" with an option to add workspaces or delete the group.
- **What happens when the 055-ACF Activity Feed epic is not yet implemented?** The activity section on the group view shows a placeholder: "Activity feed coming soon." The rest of /home works independently.
- **What happens when two owner groups contain the same workspace?** A workspace can belong to multiple owner groups (e.g., "Family" and "Tax Entities"). Net worth calculations per group are independent — no deduplication across groups.
- **What happens when health score or balance data fails to load for an entity?** The entity card renders with name and type, and shows a "—" placeholder for health and balance. No error state — graceful degradation.

---

## Requirements

### Functional Requirements

**Owner Group CRUD**
- **FR-001**: System MUST allow users to create owner groups from /home by selecting workspaces they own. Owner groups have `practice_id = null` and `created_by_user_id` set.
- **FR-002**: System MUST support naming, renaming, and deleting owner groups.
- **FR-003**: System MUST allow adding and removing workspaces from an owner group after creation.
- **FR-004**: System MUST prevent users from adding workspaces they do not own to their owner group.
- **FR-005**: System MUST allow a workspace to belong to multiple owner groups simultaneously.

**Data Model**
- **FR-006**: Migration MUST add `created_by_user_id` (nullable FK to `users`) to the `workspace_groups` table.
- **FR-007**: Logic MUST enforce: if `practice_id` is set, it is a practice group; if `created_by_user_id` is set and `practice_id` is null, it is an owner group. Both null is invalid (enforced in validation).
- **FR-008**: System MUST reuse existing `WorkspaceGroup`, `WorkspaceGroupMember`, `GroupInvitation` models — no new group tables.

**/home Entity Grid**
- **FR-009**: System MUST render a grid of entity cards on /home showing: workspace name, entity type icon, cash balance, health score badge, streak flame, and last activity timestamp.
- **FR-010**: Entity cards MUST lazy-load health scores and balances via separate API calls — not blocking initial render.
- **FR-011**: System MUST display grouped entities under their group headers and ungrouped entities in an "Ungrouped" section.
- **FR-012**: Clicking an entity card MUST navigate to that workspace's dashboard.

**/home Page Layout**
- **FR-013**: /home MUST include: greeting header with global net worth and gamification summary, groups section with group cards, ungrouped entities section, entity grid (sortable/filterable), and quick actions (entities needing attention, upcoming deadlines).
- **FR-014**: Group cards MUST show: group name, consolidated net worth, entity count, and average health score.

**Consolidated Group View**
- **FR-015**: System MUST display consolidated net worth, consolidated balance sheet, and per-entity breakdown when a user opens an owner group.
- **FR-016**: System MUST reuse the 028-CFT consolidation engine for owner groups — same aggregation logic, same drill-down.
- **FR-017**: Inter-entity positions MUST be highlighted within the group consolidation view.
- **FR-018**: Multi-currency groups MUST convert to the group's base currency using the most recent exchange rate.

**Invitations & Permissions**
- **FR-019**: System MUST support four permission tiers for owner groups: Owner (full CRUD), Manager (invite/remove but not delete group), Viewer (read-only all entities), Entity Viewer (read-only specific entities).
- **FR-020**: System MUST allow group owners to invite users by email with a selected permission tier.
- **FR-021**: Entity Viewers MUST only see summaries of their assigned entities — not other entities in the group.
- **FR-022**: System MUST support revoking group access with immediate effect.
- **FR-023**: Invited Viewers MUST see shared groups on their /home under a "Shared with Me" section, separate from their own entities.

**Group Activity Feed**
- **FR-024**: System MUST display a merged activity stream from all entities in a group when viewing the group detail.
- **FR-025**: System MUST support filtering the group activity feed by individual entity.
- **FR-026**: Activity feed integration depends on 055-ACF. If not yet available, display a placeholder message.

**Existing Controller Reuse**
- **FR-027**: System MUST extend existing `HomeController::summary()` and `MyNetWorthController` — not replace them.
- **FR-028**: Owner group CRUD MUST reuse `WorkspaceGroupController` with a scope filter distinguishing practice-created from user-created groups.

### Key Entities

- **WorkspaceGroup** (extended): Adds `created_by_user_id` (nullable FK). When `practice_id` is null and `created_by_user_id` is set, it is an owner group. Existing fields (name, description, hierarchy) reused as-is.
- **WorkspaceGroupMember**: Existing model linking workspaces to groups. No changes needed — owner groups use the same membership structure.
- **GroupInvitation**: Existing model. Extended with permission tier (owner, manager, viewer, entity_viewer) and optional entity scope for Entity Viewer role.
- **Permission Tiers**: Owner (full CRUD), Manager (invite/remove, not delete group), Viewer (read-only all entities), Entity Viewer (read-only assigned entities). Stored on the group membership pivot or a new `group_user_permissions` table.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: /home loads within 2 seconds for users with up to 20 entities (entity cards render immediately, health/balance data lazy-loads).
- **SC-002**: A user with 5 workspaces can create an owner group and see it on /home within 3 clicks (Create Group > name + select > save).
- **SC-003**: Consolidated net worth on an owner group matches the 028-CFT consolidation output for the same workspaces (same engine, same result).
- **SC-004**: Invited Viewers see only the data permitted by their tier — Viewer sees all entity summaries, Entity Viewer sees only assigned entities. Zero cross-permission data leakage (verified by tests).
- **SC-005**: Entity grid health scores and balances load asynchronously — initial /home render is not blocked by slow health/balance queries.
- **SC-006**: A workspace can belong to both a practice group and an owner group simultaneously without data conflicts or permission leakage.
- **SC-007**: Group invitation to viewing the group on /home takes under 60 seconds (invite, accept, see group).
- **SC-008**: The activity feed (when 055-ACF is available) shows events from all group entities in a single merged stream, filterable by entity.

---

## Clarifications

### Session 2026-03-19

- Q: Why not create a separate portal for family groups? A: Practice groups (027-PMV) already have the data model — `WorkspaceGroup` with hierarchy, consolidation, invitations. Owner groups are the same model with `practice_id = null`. Building a separate portal would duplicate infrastructure. The `/home` page is the natural surface for owner groups.
- Q: Can a workspace belong to multiple owner groups? A: Yes. A workspace can appear in "Family" and "Tax Entities" simultaneously. Each group's consolidation runs independently — no deduplication across groups.
- Q: How do owner groups interact with practice groups? A: They are independent. A workspace can belong to a practice group (managed by the accountant) AND an owner group (managed by the entity owner) at the same time. No interference between the two.
- Q: Where are permission tiers stored? A: To be finalised during implementation. Two options: extend the existing `workspace_group_members` pivot with a `role` column, or create a new `group_user_permissions` table. The pivot approach is simpler if it fits.
- Q: What if the Activity Feed (055-ACF) is not built when 038-FGP ships? A: The activity section on /home and group views shows a placeholder. All other features (entity grid, groups, consolidation, invitations) work independently.
- Q: Should the /home greeting show global net worth even without groups? A: Yes. Global net worth is calculated across all owned workspaces, regardless of grouping. It always appears in the header.
- Q: How does the entity grid sort by default? A: By last activity (most recent first). Secondary sort options: name (alpha), health score (worst first), cash balance (highest first).
