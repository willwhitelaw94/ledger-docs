---
title: "Feature Specification: Practice Client Groups, Staff Teams & Review Chains"
---

# Feature Specification: Practice Client Groups, Staff Teams & Review Chains

**Feature Branch**: `074-practice-client-groups-teams`
**Created**: 2026-04-01
**Status**: Draft
**Epic**: 074-PCG
**Initiative**: FL -- Financial Ledger Platform
**Effort**: M (3--4 sprints)
**Depends On**: 027-PMV (complete -- practice tasks, member assignments, workspace groups), 072-JTW (in progress -- practice jobs, timesheets), 072-WKP (in progress -- workpapers)

### Out of Scope

- **Financial consolidation** -- existing `WorkspaceGroup` model handles net worth consolidation, eliminations, and snapshots. This epic creates a separate, simpler client grouping mechanism for practice organisation.
- **Engagement letters / proposals** -- see 073-PBI.
- **Practice billing rates by team** -- V1 uses flat cost rate per staff member (from 072-JTW). Team-based billing rates are a future enhancement.
- **External team member profiles** -- V1 uses the existing `users` table. No separate staff profile entity.

---

## Overview

MoneyQuest Ledger's practice management (027-PMV) has a basic team member system: users are invited to a practice with a role of "owner" or "member", then assigned to individual client workspaces. Team members currently live under Settings -- a flat list with invite/remove capabilities. There is no concept of **teams** (grouping staff by function) or **client groups** (grouping clients for organisational and reporting purposes).

Accounting firms organise around two axes:

1. **Client Groups** -- partners "own" groups of clients. "HAILSTONE, Benjamin Group" contains the 5 clients that Benjamin is responsible for. Groups carry metadata (taxable group, exclude from reporting) and define the review chain: Benjamin is the final reviewer for all work in his group.

2. **Staff Teams** -- employees are grouped by function and seniority. A Tax Team has a partner, a senior, and two juniors. When a junior is assigned as preparer on a workpaper, the system knows the review chain by walking up the team hierarchy.

These two concepts intersect: a **client group has a partner** (its head), and the partner's **team members** (managers, seniors, juniors) service that group's clients. When a preparer from the team is assigned to work for a client in the group, the reviewer and final reviewer auto-populate from the team hierarchy.

**Competitor context**: Xero Practice Manager (XPM) has a "Groups" tab on the Practice Clients page with group name, client count, taxable group flag, and exclude-from-reporting flag. Groups are editable via a simple modal. XPM also has a Contacts tab showing people associated with client entities. Karbon has team-based workload management. FYI (now Xero Workpapers) auto-fills preparer/reviewer/final reviewer based on the engagement team structure.

---

## User Scenarios & Testing

### User Story 1 -- Practice Client Groups (Priority: P1)

A practice partner organises their clients into named groups. Each group has a partner as its head, contains a set of client workspaces, and carries metadata for reporting. The Practice Clients page gets a tabbed layout (Clients | Archived | Groups | Contacts) with Groups as a dedicated tab.

**Why this priority**: Client groups are the organisational backbone of a practice. They determine who is responsible for which clients, drive workpaper review chains, and enable grouped reporting. Every other feature in this epic depends on groups existing.

**Independent Test**: A partner creates a group "HAILSTONE, Benjamin Group", assigns 5 client workspaces to it, marks it as a taxable group, and sees it listed on the Groups tab with correct client count.

**Acceptance Scenarios**:

1. **Given** I am a practice owner, **When** I navigate to /practice/clients, **Then** I see a tabbed layout with tabs: Clients (count), Archived (count), Groups (count), Contacts (count). Each tab shows its count badge.

2. **Given** I click the "Groups" tab, **When** the tab loads, **Then** I see a searchable table of all client groups with columns: Group Name (sortable), Number of Clients, Taxable Group (checkbox), Excluded from Reporting (checkbox), and row actions (Edit, Delete).

3. **Given** I click "Create Group", **When** the dialog opens, **Then** I can enter: Group Name (required, unique within practice), Partner (dropdown filtered to practice owners + members with team_role of "manager" or "partner" in any team -- the group head), Taxable Group (checkbox), Exclude from Reporting (checkbox). Optionally add clients during creation.

4. **Given** a group "HAILSTONE, Benjamin Group" exists, **When** I click "Edit", **Then** a dialog opens pre-filled with the group's details. I can rename it, change the partner, toggle taxable/exclude flags, and add/remove client workspaces.

5. **Given** a group has 5 clients, **When** I view the group's detail (click row or expand), **Then** I see the list of client workspaces in the group with their status, plus the partner and assigned team members.

6. **Given** I delete a group, **When** confirmed, **Then** the group is removed but the client workspaces remain connected to the practice (groups are organisational only -- deleting a group doesn't disconnect clients).

7. **Given** the "Taxable Group" flag is checked, **When** reports are generated, **Then** clients in this group are aggregated together for tax reporting purposes (e.g., family groups filed as a unit).

8. **Given** the "Exclude from Reporting" flag is checked, **When** practice-wide reports are generated, **Then** this group's clients are excluded from aggregate practice reporting (e.g., internal test entities, pro-bono clients).

---

### User Story 2 -- Staff Teams with Hierarchy (Priority: P1)

A practice manager creates staff teams to organise employees by function and define review chains. Each team has a hierarchical structure: Partner > Manager > Senior > Junior. This hierarchy drives the auto-fill of workpaper review chains and supports utilisation reporting by team.

**Why this priority**: Staff teams provide the structure needed for workpaper review chain auto-fill (072-WKP dependency) and team-level WIP/utilisation reporting (072-JTW dependency). Without teams, every assignment is manual.

**Independent Test**: A manager creates a "Tax Team" with Benjamin as Partner, Sarah as Manager, and Emma as Junior. When Emma is assigned as preparer on a workpaper for a client in Benjamin's group, the system suggests Sarah as Reviewer and Benjamin as Final Reviewer.

**Acceptance Scenarios**:

1. **Given** I am a practice owner, **When** I navigate to /practice/settings/teams (or a new "Teams" nav item), **Then** I see a list of all staff teams with team name, member count, and the partner/lead.

2. **Given** I click "Create Team", **When** the dialog opens, **Then** I can enter: Team Name (required) and add members with a team role. Team roles are: Partner, Manager, Senior, Junior (fixed hierarchy -- Partner is highest).

3. **Given** a "Tax Team" exists with members, **When** I view the team, **Then** I see all members listed with their team role, ordered by hierarchy (Partner at top, Juniors at bottom).

4. **Given** I add Sarah as "Manager" to the Tax Team, **When** saved, **Then** Sarah appears in the team roster. A practice member can belong to multiple teams (e.g., Sarah is Manager on Tax Team AND Senior on Audit Team).

5. **Given** a team has a hierarchy of Partner > Manager > Senior > Junior, **When** a Junior (Emma) is assigned as preparer on a workpaper, **Then** the system suggests review chain by walking up the hierarchy: next level up = Reviewer (Sarah, Manager), top level = Final Reviewer (Benjamin, Partner). If multiple people exist at a level (e.g., two Managers), the user picks from a dropdown.

6. **Given** a team has only 2 levels (Partner + Junior, no Manager), **When** a Junior is assigned as preparer, **Then** the system suggests the Partner as both Reviewer and Final Reviewer (or just Reviewer if only 2-tier review is configured).

7. **Given** I remove a member from a team, **When** confirmed, **Then** they are removed from the team but remain a practice member. Existing workpaper assignments are not changed (they were already assigned by name).

---

### User Story 3 -- Teams Assigned to Client Groups (Priority: P1)

Client groups and staff teams are linked: a team (or individual team members) can be assigned to service a client group. This means "the Tax Team handles all clients in the HAILSTONE, Benjamin Group". The partner heading the client group is typically the partner from the assigned team.

**Why this priority**: This is the bridge between the two concepts. Without linking teams to groups, the workpaper review chain auto-fill has no context to determine which team hierarchy applies to a given client.

**Independent Test**: The Tax Team is assigned to "HAILSTONE, Benjamin Group". When viewing Benjamin's group, I see the Tax Team listed. When creating a workpaper for any client in the group, the preparer dropdown prioritises Tax Team members, and the review chain follows the Tax Team hierarchy.

**Acceptance Scenarios**:

1. **Given** I am editing a client group, **When** I open the "Team" section, **Then** I can assign one or more staff teams to the group. The partner of the primary assigned team becomes the group's head (or I can override the partner manually).

2. **Given** a client group has the Tax Team assigned, **When** I view the group, **Then** I see the team members listed with their roles. The group detail shows: Partner (group head), assigned team(s), and client list.

3. **Given** I create a workpaper for "Smith Pty Ltd" (which is in Benjamin's group, serviced by Tax Team), **When** I assign Emma (Junior, Tax Team) as preparer, **Then** the Reviewer field auto-suggests Sarah (Manager, Tax Team) and Final Reviewer auto-suggests Benjamin (Partner, Tax Team).

4. **Given** multiple teams are assigned to a group, **When** a preparer is assigned, **Then** the system uses the team that the preparer belongs to for the review chain suggestion. If the preparer is in multiple assigned teams, the user is prompted to pick which team context to use.

5. **Given** a client is not in any group, **When** a preparer is assigned to a workpaper, **Then** no auto-fill occurs. The reviewer and final reviewer must be manually selected from all practice members.

---

### User Story 4 -- Enhanced Practice Clients Page (Priority: P1)

The Practice Clients page is restructured with a Xero-style tabbed layout. The current single-view client list becomes the "Clients" tab. New tabs are added for Archived, Groups, and Contacts.

**Why this priority**: This is the UI surface that exposes groups and contacts to users. The current page has groups hidden in a side sheet -- they need to be first-class.

**Independent Test**: The Practice Clients page loads with 4 tabs. Each tab shows accurate counts. Switching between tabs preserves search/filter state within each tab.

**Acceptance Scenarios**:

1. **Given** I navigate to /practice/clients, **When** the page loads, **Then** I see tabs: "Clients 17", "Archived 3", "Groups 3", "Contacts 3" (counts from API). Default tab is "Clients".

2. **Given** I am on the "Clients" tab, **When** I view the table, **Then** it shows the existing client list (active, connected workspaces) with current columns: Client, Status, Role, Groups, Connected date, Actions.

3. **Given** I am on the "Archived" tab, **When** I view the table, **Then** I see workspaces where `archived_at IS NOT NULL` on the `practice_workspaces` row. Actions include "Unarchive" (sets `archived_at = null`, returns workspace to the Clients tab) and "Disconnect" (removes the practice-workspace relationship entirely, cascade-removing client group memberships).

4. **Given** I am on the "Groups" tab, **When** I view the table, **Then** I see the group list as described in User Story 1 with Create Group button in the top-right corner.

5. **Given** I am on the "Contacts" tab, **When** I view the table, **Then** I see all contacts (people) across all client workspaces in a unified view. Columns: Contact Name, Email Address, Phone Number, Mobile Number, Clients (count of workspaces they appear in). When a client is archived, their contacts remain visible here for reuse.

6. **Given** I search on the Contacts tab, **When** I type a name, **Then** the contact list filters across name, email, and phone fields.

7. **Given** I am a practice member (not owner) assigned to 3 client workspaces, **When** I view the Contacts tab, **Then** I only see contacts from those 3 workspaces. A practice owner sees contacts from all connected workspaces.

---

### User Story 5 -- Staff Page with All Staff & Teams Tabs (Priority: P1)

Staff management is promoted from the Settings page to a dedicated top-level nav item at `/practice/staff`. The page uses a tabbed layout matching Xero's pattern: "All Staff" tab (table of all practice members) and a "Teams" dropdown/tab (team management). The existing "Tasks" nav item is removed -- tasks are now accessed exclusively through Jobs (072-JTW).

**Why this priority**: Staff teams are the organisational backbone that drives review chain auto-fill and utilisation reporting. Burying team management in Settings is insufficient. Xero gives Staff a top-level nav item under Practice -- we should too.

**Independent Test**: Navigating to /practice/staff shows all practice members with their teams, assigned workspaces, and weekly capacity hours. The "Tasks" nav item no longer appears in the practice shell.

**Acceptance Scenarios**:

1. **Given** I navigate to /practice/staff, **When** the page loads, **Then** I see a tabbed layout with "All Staff" (default) and "Teams" tabs. The practice nav bar shows "Staff" between "Jobs" and "Requests" -- "Tasks" nav link is removed from `practice-shell.tsx` (the page file at `/practice/tasks/page.tsx` is preserved for 072-JTW to repurpose).

2. **Given** I am on the "All Staff" tab, **When** I view the table, **Then** I see all practice members with columns: Name, Email, Practice Role (Owner/Member), Teams (badges), Assigned Workspaces (count), Weekly Capacity, and Actions.

3. **Given** I click on a team member, **When** the detail panel opens, **Then** I see: their profile info, team memberships with roles, workspace assignments with roles, and (from 072-JTW) current utilisation / hours logged.

4. **Given** I click "Invite Member", **When** the dialog opens, **Then** I can invite by email (existing flow) and optionally assign them to a team with a role during the invite process.

5. **Given** I view a member's row, **When** I look at the Teams column, **Then** I see badges for each team they belong to (e.g., "Tax Team (Manager)", "Audit Team (Senior)").

6. **Given** I click the "Teams" tab, **When** the tab loads, **Then** I see a list of all staff teams with team name, member count, partner/lead name, and actions (Edit, Delete). I can create new teams from here.

---

### Edge Cases

- **Partner assigned to multiple groups**: A partner can head multiple client groups. Each group's review chain is independent.
- **Staff member in multiple teams**: A member can have different roles in different teams (Manager in Tax, Senior in Audit). The review chain uses the team that is assigned to the client's group. For ceiling checks, the user's **highest** rank across all teams is used.
- **Group with no team assigned**: Works like today -- no auto-fill, manual reviewer selection.
- **Team with no Partner**: The highest-level member becomes the Final Reviewer suggestion. System warns that the team has no Partner.
- **Client in multiple groups**: Allowed but discouraged. When creating a workpaper, if the client is in multiple groups with different teams, the user picks which group context to use.
- **Deleting a team**: Hard delete. Existing workpaper assignments are preserved (assigned by user_id, not by team reference). Pivot rows (`practice_team_members`, `practice_client_group_teams`) cascade delete. Future assignments lose auto-fill for that team.
- **Removing group head (partner)**: Blocked. The `RemovePracticeMember` action returns a 422 error listing groups that must be reassigned first. This prevents orphaned groups and forces explicit client handover.
- **Workspace disconnected from practice**: All `practice_client_group_workspaces` rows for that workspace are cascade-deleted. The group's client count updates automatically. The workspace remains in any `WorkspaceGroup` (consolidation) it belongs to -- those are separate.
- **Workspace archived from practice**: The workspace remains in client groups (archiving is different from disconnection). The "Clients" tab hides archived workspaces; the "Archived" tab shows them. Groups still show their total client count including archived workspaces.
- **Preparer not in any group's team**: No auto-fill occurs silently. Manual reviewer selection is always available (FR-PCG-014). No prompt or warning -- the user simply picks reviewers manually.
- **User with no team membership checking ceilings**: Users with no team membership have an effective rank of 0 (below Junior=1). They cannot perform actions gated by any ceiling unless they are a practice owner.

---

## Requirements

### Functional Requirements

**Client Groups**

- **FR-PCG-001**: System MUST provide a `practice_client_groups` entity (distinct from `workspace_groups`) with: name (required, max 255 chars, unique per practice_id), practice_id, partner_user_id (group head), is_taxable (boolean, default false), is_excluded_from_reporting (boolean, default false), created_by_user_id, timestamps.
- **FR-PCG-002**: System MUST support a many-to-many relationship between client groups and practice workspaces via `practice_client_group_workspaces` pivot table (FK to `workspaces.id`). The store/update action MUST validate that the workspace is connected to the practice (exists in `practice_workspaces` with `accepted_at IS NOT NULL`).
- **FR-PCG-003**: System MUST support assigning one or more staff teams to a client group via `practice_client_group_teams` pivot table.
- **FR-PCG-004**: Client groups MUST be scoped by practice_id. A group cannot contain workspaces from another practice.
- **FR-PCG-005**: Deleting a client group MUST NOT disconnect the client workspaces from the practice.
- **FR-PCG-006**: System MUST provide a `/counts` endpoint returning counts for each tab (active clients, archived, groups, contacts).

**Staff Teams**

- **FR-PCG-007**: System MUST provide a `practice_teams` entity with: name, practice_id, created_by_user_id, timestamps.
- **FR-PCG-008**: System MUST provide a `practice_team_members` pivot table with: practice_team_id, user_id, team_role (enum: partner, manager, senior, junior), timestamps. Unique on (practice_team_id, user_id).
- **FR-PCG-009**: Team roles MUST have a fixed hierarchy: Partner (4) > Manager (3) > Senior (2) > Junior (1). The numeric rank is used for review chain resolution.
- **FR-PCG-010**: A practice member MAY belong to multiple teams with different roles in each.
- **FR-PCG-011**: Removing a member from a team MUST NOT affect their existing workpaper assignments.

**Review Chain Auto-fill**

- **FR-PCG-012**: When a preparer is assigned to a workpaper for a client, the system MUST attempt to auto-fill Reviewer and Final Reviewer by: (1) finding the client's group, (2) finding the team assigned to that group, (3) if the preparer is in that team, walking up the hierarchy to find the next role above as Reviewer and the top role (Partner) as Final Reviewer. This logic is exposed via a standalone `GET /practice/suggest-reviewers` endpoint (see FR-PCG-025) that 072-WKP's UI calls.
- **FR-PCG-013**: If multiple people exist at the suggested reviewer level, the system MUST present a dropdown for the user to choose. Auto-fill is a suggestion, not a hard assignment.
- **FR-PCG-014**: If no group, no team, or the preparer is not in the group's team, no auto-fill occurs. Manual selection is always available.

**Enhanced Clients Page**

- **FR-PCG-015**: Practice Clients page MUST use a tabbed layout with tabs: Clients, Archived, Groups, Contacts.
- **FR-PCG-016**: Each tab MUST show a count badge sourced from a dedicated counts endpoint.
- **FR-PCG-017**: Groups tab MUST show a data table with: Group Name, Number of Clients, Taxable Group, Excluded from Reporting, Partner, and row-level Edit/Delete actions.
- **FR-PCG-018**: Contacts tab MUST show a unified view of all contacts aggregated from client workspaces (006-CCM `contacts` table) with server-side pagination (25 per page). Columns: Contact Name, Email, Phone, Mobile, Clients (count of workspaces they appear in). Contacts are already lightweight people-of-interest records — no user login required. For non-owner practice members, the query MUST be scoped to workspaces they are assigned to via `practice_member_assignments`. Practice owners see contacts from all connected workspaces.

**Authorisation**

- **FR-PCG-019**: Permission to manage client groups, staff teams, and team membership MUST be controlled by configurable practice action ceilings stored in a new `practice_action_ceilings` table with `(practice_id, action_key, min_team_role_rank)`. Default ceilings seeded on practice creation: `manage_client_groups: 4 (Partner)`, `manage_team_membership: 3 (Manager)`, `create_delete_teams: 4 (Partner)`. Ceilings are configured at /practice/settings/ceilings (extending existing UI). This is a separate table from the existing `permission_ceilings` table which gates workspace-level permissions.
- **FR-PCG-020**: All practice members MUST be able to view client groups and staff teams regardless of permission ceilings.
- **FR-PCG-021**: Client group and team data MUST be scoped by practice_id -- no cross-practice data access.
- **FR-PCG-022**: Default practice action ceilings MUST be seeded when a practice is created (via `SetupPractice` action). Defaults: `manage_client_groups: 4`, `manage_team_membership: 3`, `create_delete_teams: 4`. Practices can customise these at /practice/settings/ceilings.
- **FR-PCG-023**: Practice action ceilings MUST use team hierarchy ranks for comparison: Partner (4) >= Manager (3) >= Senior (2) >= Junior (1). "Managers & Above" means team_role rank >= 3. A user's effective rank is determined by their **highest** team_role across all teams they belong to. Practice owners always bypass ceilings regardless of team membership.
- **FR-PCG-024**: When a workspace is disconnected from a practice (the `practice_workspaces` row is removed), all `practice_client_group_workspaces` rows referencing that workspace MUST be cascade-deleted. The group's client count updates accordingly.
- **FR-PCG-025**: System MUST provide a `GET /practice/suggest-reviewers` endpoint accepting `workspace_id` and `preparer_user_id` query parameters. Response shape: `{ reviewer: { id, name } | null, final_reviewer: { id, name } | null, team_name: string | null, ambiguous: boolean, candidates: { reviewers: User[], final_reviewers: User[] } }`. When `ambiguous` is true, the UI presents `candidates` as dropdown options instead of auto-filling.
- **FR-PCG-026**: System MUST provide a `GET /practice/contacts` endpoint returning paginated contacts aggregated from client workspaces. Accepts `search`, `page`, `per_page` query parameters. Scoped to assigned workspaces for non-owner practice members (via `practice_member_assignments`), all connected workspaces for owners.
- **FR-PCG-027**: System MUST support archiving a practice workspace via `PATCH /practice/clients/{practiceWorkspace}/archive`. This sets an `archived_at` timestamp on `practice_workspaces`. Archived workspaces appear on the "Archived" tab. "Reconnect" (unarchive) sets `archived_at = null`. Archiving does NOT remove the workspace from client groups.
- **FR-PCG-028**: System MUST prevent removing a practice member who is the `partner_user_id` on any client group. The `RemovePracticeMember` action MUST return a 422 validation error listing the groups that need reassignment before the member can be removed.
- **FR-PCG-029**: API routes for client groups MUST use the prefix `/practice/client-groups` to avoid collision with existing `/practice/groups` consolidation routes. Routes: `GET /practice/client-groups` (index), `POST /practice/client-groups` (store), `PATCH /practice/client-groups/{practiceClientGroup}` (update), `DELETE /practice/client-groups/{practiceClientGroup}` (destroy), `POST /practice/client-groups/{practiceClientGroup}/workspaces` (add workspaces), `DELETE /practice/client-groups/{practiceClientGroup}/workspaces/{workspaceId}` (remove workspace), `POST /practice/client-groups/{practiceClientGroup}/teams` (assign team), `DELETE /practice/client-groups/{practiceClientGroup}/teams/{practiceTeamId}` (remove team). Team routes: `GET /practice/teams` (index), `POST /practice/teams` (store), `PATCH /practice/teams/{practiceTeam}` (update), `DELETE /practice/teams/{practiceTeam}` (destroy), `POST /practice/teams/{practiceTeam}/members` (add member), `PATCH /practice/teams/{practiceTeam}/members/{userId}` (update member role), `DELETE /practice/teams/{practiceTeam}/members/{userId}` (remove member).

### Key Entities

- **PracticeClientGroup** (table: `practice_client_groups`): A named grouping of client workspaces within a practice. Fields: id, practice_id, name (unique per practice), partner_user_id (FK to users), is_taxable (boolean), is_excluded_from_reporting (boolean), created_by_user_id, timestamps. Hard delete (no SoftDeletes). Cascade: deleting a group deletes its pivot rows in `practice_client_group_workspaces` and `practice_client_group_teams`.
- **practice_client_group_workspaces** (pivot table): Links client groups to workspaces. Fields: practice_client_group_id (FK, cascade on delete), workspace_id (FK to workspaces), timestamps. Unique on (practice_client_group_id, workspace_id). Rows are also cascade-deleted when a workspace is disconnected from the practice.
- **practice_client_group_teams** (pivot table): Links client groups to staff teams. Fields: practice_client_group_id (FK, cascade on delete), practice_team_id (FK, cascade on delete), timestamps. Unique on (practice_client_group_id, practice_team_id).
- **PracticeTeam** (table: `practice_teams`): A named grouping of staff members with hierarchy. Fields: id, practice_id, name, created_by_user_id, timestamps. Hard delete (no SoftDeletes). Cascade: deleting a team deletes its pivot rows in `practice_team_members` and `practice_client_group_teams`.
- **practice_team_members** (pivot table): Links users to teams with a role. Fields: practice_team_id (FK, cascade on delete), user_id (FK to users), team_role (enum: partner/manager/senior/junior), timestamps. Unique on (practice_team_id, user_id).
- **PracticeActionCeiling** (table: `practice_action_ceilings`): Configurable practice-level action gates. Fields: id, practice_id (FK to practices), action_key (string, e.g., `manage_client_groups`), min_team_role_rank (integer, 1-4), timestamps. Unique on (practice_id, action_key). Distinct from `permission_ceilings` which gates workspace-level data access permissions.

### Relationship to Existing Entities

```
Practice
  |-- PracticeClientGroup (new)
  |     |-- Workspaces (many-to-many via pivot, cascade on disconnect)
  |     |-- PracticeTeam (many-to-many via pivot)
  |     \-- Partner (User, via partner_user_id FK -- removal blocked if groups exist)
  |
  |-- PracticeTeam (new)
  |     |-- Members (many-to-many via pivot, with team_role)
  |     \-- PracticeClientGroups (many-to-many via pivot)
  |
  |-- PracticeActionCeiling (new)
  |     \-- Gates practice management actions by min_team_role_rank
  |
  |-- PracticeWorkspace (existing, extended with archived_at)
  |     \-- PracticeClientGroups (many-to-many via pivot)
  |
  |-- WorkspaceGroup (existing -- consolidation only, unchanged)
  |
  |-- PermissionCeiling (existing -- workspace permission ceilings, unchanged)
  |
  \-- practice_users (existing pivot)
        \-- PracticeTeamMember entries (via user_id)
```

### Relationship to Other Epics

- **072-JTW (Jobs, Timesheets, WIP)**: Staff teams feed team-level utilisation reporting. The `weekly_capacity_minutes` on practice_users (from 072-JTW) is displayed on the team members page.
- **072-WKP (Workpapers)**: The review chain auto-fill (FR-PCG-012) provides Reviewer and Final Reviewer suggestions when a preparer is assigned to a workpaper. The workpaper UI calls a "suggest reviewers" endpoint that uses the team/group structure.
- **073-PBI (Proposals & Billing)**: Client groups may drive billing grouping in future (e.g., bill all clients in a taxable group together).

---

## Success Criteria

### Measurable Outcomes

- **SC-PCG-001**: A practice owner can create a client group, assign 5 clients, and assign a team within 60 seconds.
- **SC-PCG-002**: When a preparer is assigned to a workpaper for a grouped client, reviewer suggestions appear within 500ms.
- **SC-PCG-003**: The Practice Clients page loads all 4 tab counts in a single API call, rendering within 1 second.
- **SC-PCG-004**: Team hierarchy correctly resolves review chains for 2-tier, 3-tier, and 4-tier team structures (verified in integration tests).
- **SC-PCG-005**: Client group membership does not interfere with existing workspace group (consolidation) functionality.
- **SC-PCG-006**: Practice members in the "Contacts" tab are searchable across name, email, and phone -- results appear within 300ms.

---

## Clarifications

### Session 2026-04-01

- Q: Should client groups reuse the existing `WorkspaceGroup` model? --> A: No. WorkspaceGroup is specialised for financial consolidation (net worth, eliminations, snapshots). Client groups are a simpler organisational concept. Create a new `PracticeClientGroup` entity.
- Q: Is the team hierarchy fixed at 4 tiers (Partner/Manager/Senior/Junior)? --> A: Yes. The 3-tier workpaper review workflow (Prepare/Review/Final Review) maps to any 3+ consecutive tiers. For 2-tier teams (Partner + Junior), the Partner serves as both reviewer and final reviewer. The hierarchy is fixed -- firms understand Partner > Manager > Senior > Junior universally.
- Q: What does "Taxable Group" mean? --> A: It marks that the group's clients are reported together for tax purposes (e.g., a family group whose entities are filed as a taxable unit). This is metadata for reporting -- it doesn't change any ledger behaviour.
- Q: Can a client be in multiple groups? --> A: Yes, but discouraged. The primary use case is one client per group. If a client is in multiple groups, the workpaper review chain asks the user which group context to use.
- Q: Where do teams live in the navigation? --> A: Staff and teams get a top-level nav item "Staff" at /practice/staff (between Jobs and Requests), with "All Staff" and "Teams" tabs. This replaces the "Tasks" nav item, which is removed since tasks are now accessed exclusively through Jobs (072-JTW).
- Q: Why remove the Tasks nav item? --> A: Tasks are now nested under Jobs (072-JTW). The flat task board at /practice/tasks was a temporary solution before jobs existed. With jobs as the primary entity, tasks are accessed from within a job's detail page or via the "All Tasks" view on the jobs page. A separate Tasks nav item is redundant.
- Q: Where do contacts on the Contacts tab come from? --> A: The existing `contacts` table from each client workspace (006-CCM), aggregated cross-workspace at the practice level. Contacts are already lightweight people-of-interest records (customers, suppliers, etc.) — no user login required. No separate practice_contacts table needed.
- Q: Who can manage teams and groups? --> A: Configurable via permission ceilings at the practice level (extending existing /practice/settings/ceilings). Each practice sets thresholds like "Manage team membership: Managers & Above". Uses team hierarchy ranks (Partner=4, Manager=3, Senior=2, Junior=1). Practice owners always bypass ceilings.

### Self-Clarification 2026-04-01

**Q1 (Domain & Data Model)**: The `PracticeClientGroup` uses `practice_client_group_workspaces` to link to workspaces. Should this reference `workspace_id` directly (from `workspaces` table) or `practice_workspace_id` (from `practice_workspaces` pivot), given that only workspaces connected to the practice should be eligible?
- **Option A**: FK to `workspaces.id` with an application-level check that the workspace is connected to the practice.
- **Option B**: FK to `practice_workspaces.id` to enforce at the DB level that only connected workspaces can be in groups.
- **Option C**: FK to `workspaces.id` with a composite unique on `(practice_client_group_id, workspace_id)` and a validation check in the action.
- **Answer**: Option C. FK to `workspaces.id` with action-level validation. This mirrors how `workspace_group_members` references `workspace_id` directly in the existing `WorkspaceGroup` model. Using `practice_workspaces.id` would create a fragile coupling -- if a workspace is disconnected and reconnected, the `practice_workspaces` row gets a new ID. Validation in the store/update action ensures the workspace belongs to the practice.
- **Spec update**: FR-PCG-002 clarified. Add edge case for workspace disconnection.

**Q2 (Edge Cases & Failure Handling)**: When a workspace is disconnected from a practice (the `practice_workspaces` row is deleted or `accepted_at` nulled), what happens to its membership in client groups?
- **Option A**: Cascade delete the `practice_client_group_workspaces` row automatically.
- **Option B**: Keep the group membership but mark it as stale/inactive. Show a warning badge on the group.
- **Option C**: Keep the group membership silently; if the workspace reconnects it reappears.
- **Answer**: Option A. Cascade removal via a listener or the disconnect action. A disconnected workspace is no longer a practice client -- keeping it in groups creates phantom members. The spec's existing FR-PCG-005 says deleting a *group* doesn't disconnect workspaces; this is the converse (disconnecting a workspace cleans up group memberships). Consistent with how `workspace_group_members` handles workspace removal.
- **Spec update**: New edge case added. New FR-PCG-024 added.

**Q3 (Functional Scope & Behavior)**: The spec says the review chain auto-fill triggers "when a preparer is assigned to a workpaper." The 072-WKP spec defines Preparer/Reviewer/Final Reviewer fields on the workpaper model, but 072-WKP has no auto-fill logic. Should 074-PCG ship a standalone `SuggestReviewers` action/endpoint that 072-WKP calls, or should 074-PCG modify the workpaper assignment UI directly?
- **Option A**: 074-PCG ships a `POST /practice/suggest-reviewers` endpoint. 072-WKP's UI calls it when a preparer is assigned. Loose coupling.
- **Option B**: 074-PCG modifies 072-WKP's workpaper assignment controller to inject suggestions inline.
- **Answer**: Option A. A standalone `GET /practice/suggest-reviewers?workspace_id=X&preparer_user_id=Y` endpoint returns `{ reviewer: User|null, final_reviewer: User|null, team: string, ambiguous: boolean }`. This keeps 074-PCG decoupled from 072-WKP's models. The workpaper UI simply calls this endpoint and pre-fills the dropdowns. If 072-WKP is not yet built, the endpoint is still testable independently.
- **Spec update**: FR-PCG-012 clarified with endpoint shape. New FR-PCG-025 added for the endpoint contract.

**Q4 (Interaction & UX Flow)**: The Contacts tab aggregates contacts from client workspace `contacts` tables. Since contacts are workspace-scoped and the practice may have 50+ client workspaces, how should the backend query work? A cross-workspace aggregation query could be expensive.
- **Option A**: Query `contacts` table with `WHERE workspace_id IN (...)` using the practice's connected workspace IDs. Paginate server-side.
- **Option B**: Create a materialised/cached practice_contacts view that syncs periodically.
- **Option C**: Lazy-load contacts per workspace as the user expands rows.
- **Answer**: Option A. Direct query with server-side pagination. The `contacts` table already has a `workspace_id` index from existing workspace queries. The practice typically has 10-50 connected workspaces; `WHERE workspace_id IN (...)` with pagination (25 per page) is efficient. No need for materialisation at this scale. The same pattern is used by `GetAdvisorDashboard` which queries across all practice workspaces.
- **Spec update**: FR-PCG-018 clarified to specify server-side pagination. New FR-PCG-026 for the contacts endpoint.

**Q5 (Domain & Data Model)**: The `PermissionCeiling` model currently stores a flat list of permission strings per practice. FR-PCG-019 introduces a different ceiling concept: "Manage client groups: Partners & Above" based on team hierarchy rank. Should this reuse the existing `permission_ceilings` table or create a new `practice_action_ceilings` table with `(practice_id, action_key, min_team_role_rank)`?
- **Option A**: Reuse `permission_ceilings` with a naming convention like `pcg.manage-groups` as the permission string.
- **Option B**: New `practice_action_ceilings` table with `action_key` (string) and `min_team_role_rank` (integer).
- **Answer**: Option B. The existing `permission_ceilings` table stores workspace-level permission strings (e.g., `invoice.create`) that are intersected with role templates in `PermissionResolver`. Practice-level action ceilings are conceptually different: they gate *practice management actions* (not workspace data access) by *team hierarchy rank* (not by permission string). A new `practice_action_ceilings` table with `(practice_id, action_key, min_team_role_rank, created_at, updated_at)` is cleaner. Default rows seeded on practice creation.
- **Spec update**: FR-PCG-019 and FR-PCG-023 updated. New entity added to Key Entities.

**Q6 (Integration & Dependencies)**: The existing `practice_users` pivot only has `role` as `owner|member`. Team roles (partner/manager/senior/junior) live on `practice_team_members`. When checking ceilings ("Managers & Above"), what happens if a user is in multiple teams with different ranks (Manager in Tax Team, Junior in Audit Team)?
- **Option A**: Use the user's highest team_role rank across all teams.
- **Option B**: Use the team_role rank from the specific team assigned to the client group being acted upon.
- **Option C**: Use a "primary team role" field on the practice_users pivot.
- **Answer**: Option A. Use the highest team_role rank across all teams the user belongs to. This is the simplest and most permissive interpretation: if you're a Manager on any team, you have Manager-level practice capabilities. Context-specific rank (Option B) would be confusing -- "I can create groups for Tax Team's clients but not Audit Team's clients" makes no sense. The ceiling is a practice-wide capability gate, not a per-team gate.
- **Spec update**: FR-PCG-023 updated to specify highest-rank-wins resolution.

**Q7 (Functional Scope & Behavior)**: FR-PCG-006 says the counts endpoint returns counts for "active clients, archived, groups, contacts." What defines an "archived" client workspace? The `practice_workspaces` table has no `is_archived` column, and the `PracticeWorkspace` model has `accepted_at` and `expires_at` but no archive concept.
- **Option A**: Add an `archived_at` timestamp to `practice_workspaces`.
- **Option B**: Treat "Archived" as workspaces where `accepted_at IS NULL` (pending/disconnected).
- **Option C**: Treat "Archived" as workspaces where the underlying workspace has `is_archived = true` (if such a column exists on `workspaces`).
- **Answer**: Option A. Add `archived_at` nullable timestamp to `practice_workspaces`. Archiving is a practice-side action (the accountant decides they no longer actively manage this client). It's distinct from disconnection (which removes the relationship entirely) and from the workspace's own status. The "Archived" tab shows rows where `archived_at IS NOT NULL`. The "Clients" tab shows rows where `accepted_at IS NOT NULL AND archived_at IS NULL`. "Reconnect" on the Archived tab sets `archived_at = null`.
- **Spec update**: Acceptance scenario 3 (User Story 4) updated. New FR-PCG-027 added for archiving.

**Q8 (Terminology & Consistency)**: The spec uses "partner_user_id" on `PracticeClientGroup` to identify the group head. But "partner" is also a team_role enum value. Could this cause confusion? Should the column be renamed to `head_user_id` or `lead_user_id`?
- **Option A**: Keep `partner_user_id` -- it matches accounting firm terminology where the group head is always a Partner.
- **Option B**: Use `head_user_id` -- more generic, allows a Manager to head a group without semantic mismatch.
- **Answer**: Option A. Keep `partner_user_id`. In Australian accounting practice, client groups are universally "owned" by a Partner. Even when a Manager operationally runs a group, the Partner is the responsible party for regulatory purposes. The FK name accurately reflects domain language. The team_role enum context is different (a user's role within a team vs. who heads a group).
- **Spec update**: No change needed -- confirming existing spec language.

**Q9 (Edge Cases & Failure Handling)**: What happens when the `partner_user_id` on a client group references a user who is later removed from the practice (`practice_users` row deleted)?
- **Option A**: Cascade set `partner_user_id = null` and flag the group as "needs partner."
- **Option B**: Block practice member removal if they head any client groups (force reassignment first).
- **Option C**: Allow removal but show a warning badge on orphaned groups.
- **Answer**: Option B. Block removal with a validation error: "Cannot remove [user] from practice -- they are the partner on [N] client groups. Reassign groups first." This prevents orphaned groups and forces explicit handover. Consistent with how accounting practices handle partner departures (clients are formally transferred, not abandoned).
- **Spec update**: Edge case updated. New FR-PCG-028 added.

**Q10 (Interaction & UX Flow)**: The "Groups" tab on the Practice Clients page currently lives in a side Sheet (slide-out panel) with a simple list view. The spec proposes promoting this to a full tab with a DataTable. Should the existing Sheet-based group management be removed entirely, or kept as a quick-access shortcut?
- **Option A**: Remove the Sheet entirely. Groups are managed exclusively from the Groups tab.
- **Option B**: Keep the Sheet as a lightweight quick-access panel; the Groups tab is the full-featured view.
- **Answer**: Option A. Remove the Sheet. Having two surfaces for the same data creates maintenance burden and UX confusion. The Groups tab replaces the Sheet with a richer experience (DataTable with sorting, search, partner column, team assignment). The existing `CreateGroupDialog` component can be reused on the new Groups tab.
- **Spec update**: No FR change needed -- implicit in FR-PCG-015/017.

**Q11 (Domain & Data Model)**: Should `PracticeTeam` and `PracticeClientGroup` be soft-deletable (SoftDeletes trait) or hard-deleted?
- **Option A**: Soft delete both -- allows undo and preserves historical references.
- **Option B**: Hard delete both -- they're organisational only, no financial data hangs off them.
- **Option C**: Soft delete teams (referenced by historical workpaper assignments), hard delete groups.
- **Answer**: Option B. Hard delete both. Teams and groups are organisational containers, not financial records. FR-PCG-011 already specifies that removing a team member doesn't affect existing workpaper assignments (assignments are by user_id, not team reference). There's no audit requirement to preserve deleted team/group records. If a team is deleted, the `practice_team_members` and `practice_client_group_teams` pivot rows cascade delete.
- **Spec update**: Key Entities section updated with cascade behaviour.

**Q12 (Constraints & Tradeoffs)**: The spec says "a staff team can be assigned to a client group." Should there be a concept of a "primary" team when multiple teams are assigned to one group? The review chain logic needs to know which team hierarchy to use.
- **Option A**: No primary team concept. The review chain uses the team that the preparer belongs to (FR-PCG-012 already handles this).
- **Option B**: Add an `is_primary` boolean on the `practice_client_group_teams` pivot.
- **Answer**: Option A. No primary team concept needed. FR-PCG-012 already specifies that the review chain resolves by finding which team the *preparer* belongs to among the group's assigned teams. If the preparer is in multiple assigned teams, the user picks (acceptance scenario 4, User Story 3). The "primary" concept would add complexity without solving a real ambiguity.
- **Spec update**: No change needed -- confirming existing spec logic.

**Q13 (Non-Functional Quality)**: The contacts aggregation query crosses workspace boundaries (joining `contacts` from multiple workspaces). Should there be a practice-level permission check that prevents non-owner practice members from seeing contacts across ALL client workspaces, or does practice membership imply visibility across all connected workspaces?
- **Option A**: Practice membership implies visibility of all contacts across all connected workspaces. No per-workspace filtering.
- **Option B**: Contacts tab only shows contacts from workspaces the practice member is assigned to (via `practice_member_assignments`).
- **Answer**: Option B. Filter by assigned workspaces via `practice_member_assignments`. Practice owners see all contacts. This is consistent with how practice members have scoped access: a junior assigned to 5 client workspaces shouldn't see contacts from the other 45. The query adds `WHERE workspace_id IN (SELECT workspace_id FROM practice_member_assignments WHERE user_id = ? AND practice_id = ?)` for non-owners, or all practice workspace IDs for owners.
- **Spec update**: FR-PCG-018 updated with assignment-scoped visibility. New acceptance scenario added to User Story 4.

**Q14 (Completion Signals)**: How does the system determine which `practice_client_group_teams` entry to use for review chain auto-fill when a preparer is assigned? The spec says "find the client's group, find the team assigned to that group." But a client in group A (with Tax Team) and group B (with Audit Team) is ambiguous. What is the UX when the preparer is NOT in any of the group's teams?
- **Option A**: Show a warning "No team match found" and skip auto-fill silently.
- **Option B**: Show a prompt asking the user to select a team for the review chain context, even if the preparer isn't in any of them.
- **Answer**: Option A. If the preparer is not in any team assigned to the client's groups, the auto-fill simply doesn't fire (FR-PCG-014 already covers this: "no auto-fill occurs. Manual selection is always available."). No prompt. The common case is that the preparer IS in the team -- the edge case of an outsider preparer just falls back to manual assignment.
- **Spec update**: No change needed -- FR-PCG-014 already covers this.

**Q15 (Integration & Dependencies)**: The existing `WorkspaceGroupController` at `/practice/groups` manages consolidation groups. The new `PracticeClientGroupController` also needs routes under `/practice/`. What URL prefix should client group routes use to avoid collision?
- **Option A**: `/practice/client-groups` for the new entity, keeping `/practice/groups` for consolidation.
- **Option B**: Rename consolidation groups to `/practice/consolidation-groups` and use `/practice/groups` for client groups.
- **Option C**: Use `/practice/client-groups` and leave consolidation routes unchanged.
- **Answer**: Option C. Use `/practice/client-groups` for all CRUD routes. The existing `/practice/groups` routes for `WorkspaceGroupController` remain untouched. This avoids breaking existing frontend API calls and clearly distinguishes the two concepts in the URL namespace. Routes: `GET/POST /practice/client-groups`, `PATCH/DELETE /practice/client-groups/{practiceClientGroup}`.
- **Spec update**: New FR-PCG-029 added with route structure.

**Q16 (Functional Scope & Behavior)**: User Story 5 says "The 'Tasks' nav item is removed." The practice-shell.tsx currently has Tasks at `/practice/tasks` with a full kanban/table board. Should the Tasks page file be deleted as part of 074-PCG, or just the nav link removed (page still accessible by direct URL)?
- **Option A**: Remove both the nav link and the page file. Tasks are only accessed via Jobs.
- **Option B**: Remove the nav link but keep the page file as an unlisted route for backward compatibility.
- **Answer**: Option B. Remove the nav link from `practice-shell.tsx` but keep the page file at `/practice/tasks/page.tsx` intact. The 072-JTW epic will decide whether to repurpose it (e.g., as an "All Tasks" cross-job view) or remove it. 074-PCG should only change what's in its scope: the nav bar and the new Staff page.
- **Spec update**: Acceptance scenario 1 (User Story 5) clarified.

**Q17 (Domain & Data Model)**: Should `practice_team_members` have an `added_by_user_id` column for audit tracking, consistent with `created_by_user_id` on `PracticeClientGroup` and `PracticeTeam`?
- **Option A**: Yes, add `added_by_user_id` FK to track who added the member.
- **Option B**: No, rely on activity log / audit trail for this tracking.
- **Answer**: Option B. No dedicated column. The `created_by_user_id` on the parent `PracticeTeam` tracks who created the team. Individual member additions are lower-stakes operations that don't need a persistent FK. If audit tracking is needed, use the existing activity log system (Spatie activitylog). Adding `added_by_user_id` to every pivot row adds column clutter for minimal value.
- **Spec update**: No change needed.

**Q18 (Interaction & UX Flow)**: The Create Group dialog (acceptance scenario 3, User Story 1) allows selecting a Partner from "practice owners/senior members." What exact filter should this dropdown use? All practice_users? Only those with team_role >= Partner? Only practice owners?
- **Option A**: All practice_users (anyone can head a group).
- **Option B**: Only users who have team_role = "partner" in at least one team.
- **Option C**: Only practice_users with pivot role = "owner" OR team_role >= "manager" in any team.
- **Answer**: Option C. The dropdown shows practice owners plus any member with team_role of "manager" or higher in any team. This reflects reality: partners head groups, but senior managers sometimes do too. Juniors and seniors without management responsibility shouldn't be group heads. The query: `practice_users WHERE role = 'owner' OR user_id IN (SELECT user_id FROM practice_team_members WHERE team_role IN ('partner', 'manager'))`.
- **Spec update**: Acceptance scenario 3 (User Story 1) updated with specific filter criteria.

**Q19 (Edge Cases & Failure Handling)**: What is the maximum number of teams that can be assigned to a single client group? And should there be a limit on group name length?
- **Option A**: No limit on team assignments. Group name max 255 chars (standard string column).
- **Option B**: Max 5 teams per group. Group name max 100 chars.
- **Answer**: Option A. No practical limit on team assignments (unlikely a group has more than 2-3 teams). Group name uses a standard `string` column (255 chars in PostgreSQL). No artificial limits needed -- the UI naturally constrains this. Validation: group name required, min 1 char, max 255 chars, unique within practice.
- **Spec update**: FR-PCG-001 updated with name uniqueness constraint.

**Q20 (Misc / Placeholders)**: The spec mentions FR-PCG-022 is missing (numbering jumps from FR-PCG-021 to FR-PCG-023). Is this intentional or an oversight?
- **Option A**: Intentional gap (reserved for future use).
- **Option B**: Renumber to be sequential.
- **Answer**: Option B. This was an oversight. The gap should be filled. FR-PCG-022 is assigned to the new requirement for practice_action_ceilings default seeding (see Q5 answer).
- **Spec update**: FR-PCG-022 added for default ceiling seeding.
