---
title: "Feature Specification: Practice Management v2"
---

# Feature Specification: Practice Management v2

**Feature Branch**: `027-PMV-practice-management-v2`
**Created**: 2026-03-15
**Status**: Approved (Gate 1 passed 2026-03-15)
**Epic**: 027-PMV
**Initiative**: FL — Financial Ledger Platform
**Effort**: L (5 sprints)
**Depends On**: 015-ACT (complete), 012-ATT (complete), 024-NTF (partial)

### Out of Scope

The following are explicitly excluded from this epic and deferred to future work:

- **Time tracking and billing** — practice billing for accounting services
- **Engagement letters** — proposals, e-signatures, scope definition (consider Ignition integration)
- **Email integration / triage** — centralised inbox for client communications
- **Client portal enhancements** — client-facing portal beyond task visibility
- **Practice-level financial reporting** — revenue per client, WIP, utilisation dashboards
- **Structured data collection** — organizers/questionnaires (TaxDome-style)
- **Workflow pipeline automation** — stage-based automations with triggers

---

## Overview

MoneyQuest Ledger's practice management foundation (015-ACT) delivered core infrastructure — practice identity, invite links, workspace connections, and an advisor dashboard. However, the experience stops at "connected" without enabling the daily workflow of managing clients. Practices today face a dead-end onboarding (single form, empty dashboard), blanket team access (every accountant sees every client), flat client lists (no grouping for related entities), and zero in-platform task management. This epic transforms practice management from a connection layer into a daily-use operational tool.

**Competitor context**: Karbon leads on client manager assignment and email triage. TaxDome leads on client grouping (Account/Contact separation) and pipeline-based workflow automation. Canopy leads on full client portal with engagement checklists. This spec adopts the strongest patterns from each while staying true to MoneyQuest's architecture.

---

## User Scenarios & Testing

### User Story 1 — Guided Practice Onboarding Wizard (Priority: P1)

A sole practitioner or firm partner registers on MoneyQuest and wants to set up their accounting practice. Today they fill in a single form (name, ABN, email) and land on an empty dashboard with no guidance. The new onboarding wizard walks them through four steps: firm details, invite their team, add their first client workspace, and a success confirmation — so they reach a populated dashboard within 5 minutes.

**Why this priority**: First impressions determine whether a practice continues using the platform. The current dead-end onboarding is the #1 drop-off point. Every other feature in this epic requires a practice to exist with at least one team member and one client — onboarding is the prerequisite.

**Independent Test**: Can be tested by creating a new user, navigating to /practice/setup, and completing the full wizard. Delivers value immediately — user has a practice, a team member invited, and a client workspace created.

**Acceptance Scenarios**:

1. **Given** I am a logged-in user with no practice, **When** I navigate to /practice, **Then** I am redirected to a multi-step onboarding wizard showing Step 1 of 4 with a progress indicator.

2. **Given** I am on Step 1 (Firm Details), **When** I fill in Practice Name (required), ABN, Contact Email, and Phone, and click "Next", **Then** my practice is created, I become the owner, and the wizard advances to Step 2.

3. **Given** I am on Step 2 (Invite Team), **When** I enter one or more email addresses and click "Send Invitations", **Then** each email matching an existing user is added as a practice member, emails not matching an existing user are listed as "No account found — they'll need to register first", and a summary shows invited vs skipped.

4. **Given** I am on Step 2 (Invite Team), **When** I click "Skip this step", **Then** the wizard advances to Step 3 without inviting anyone.

5. **Given** I am on Step 3 (Add First Client), **When** I fill in Business Name, Entity Type, Currency, and Industry Template, and click "Create Workspace", **Then** a new client workspace is created and linked to my practice with all practice members granted accountant access.

6. **Given** I am on Step 3, **When** I choose "Share invite link instead", **Then** I see my practice's invite URL with a copy button, allowing me to send it to a client who already has a workspace.

7. **Given** I am on Step 3, **When** I click "Skip this step", **Then** the wizard advances to Step 4.

8. **Given** I am on Step 4 (Success), **When** I click "Go to Dashboard", **Then** I land on the practice dashboard showing any workspaces created or connected during onboarding.

9. **Given** I have already completed onboarding, **When** I navigate to /practice/setup, **Then** I am redirected to /practice (the dashboard) instead of seeing the wizard again.

---

### User Story 2 — Create Client Workspace from Practice (Priority: P1)

A practice member wants to create a new workspace for a client they're about to start managing — e.g., a new business client. Today there is no UI for this despite the backend capability existing. The practice member needs a "New Client" page where they enter the business details, and the system creates the workspace, links it to the practice, and optionally invites the business owner.

**Why this priority**: Creating client workspaces is the most common action after onboarding. Without it, the practice-to-client connection flow is incomplete — practices must ask clients to register first, which reverses the natural workflow (accountant sets up the books, then hands access to the client).

**Independent Test**: Can be tested by navigating to /practice/clients/new, filling the form, and verifying the new workspace appears in the practice dashboard with all practice members granted access.

**Acceptance Scenarios**:

1. **Given** I am a practice member, **When** I navigate to /practice/clients/new, **Then** I see a form with: Business Name (required), Entity Type (required), Base Currency (default AUD), Fiscal Year Start (default July), Industry Template, and Owner Email (optional).

2. **Given** I fill in the required fields and click "Create Workspace", **When** creation succeeds, **Then** the workspace is created, linked to my practice as "accepted", all current practice members are granted access with the accountant role, and I am redirected to the client list with the new workspace highlighted.

3. **Given** I provide an Owner Email, **When** the workspace is created, **Then** the business owner receives an invitation email to join their workspace as the owner.

4. **Given** I click "Cancel", **When** the form is abandoned, **Then** I return to the client list with no workspace created.

---

### User Story 3 — Per-Accountant Workspace Assignment (Priority: P1)

A practice owner managing a 5-person team wants to assign specific accountants to specific clients rather than everyone seeing everything. Today all practice members get blanket accountant access to every linked workspace. The owner needs a way to control which team members can access which client workspaces, with the ability to set different roles (accountant, bookkeeper, read-only) per assignment.

**Why this priority**: This is the most-requested capability for multi-person practices. Without it, a junior bookkeeper sees the same clients as the senior partner, creating noise and potential compliance issues. Karbon's "Client Manager" concept validates this as essential for any serious practice tool.

**Independent Test**: Can be tested by assigning 2 of 5 practice members to a specific workspace, then verifying the other 3 cannot access it. Additionally, verify that the primary accountant badge appears on the dashboard card.

**Acceptance Scenarios**:

1. **Given** I am a practice owner viewing a connected workspace's detail, **When** I open the "Team Assignment" panel, **Then** I see a list of all practice members with toggles to grant/revoke access to this workspace.

2. **Given** I toggle a practice member on for a workspace, **When** I select their role (accountant, bookkeeper, or auditor) and save, **Then** that member gains access to the workspace with the selected role, and other unassigned members do not have access. The "auditor" role provides read-only access across all workspace domains.

3. **Given** a workspace has multiple assigned members, **When** I designate one as "Primary Accountant", **Then** that member's name appears on the workspace card in the practice dashboard, and they are the default assignee for new tasks related to this workspace.

4. **Given** I revoke a member's access to a workspace, **When** the change is saved, **Then** that member can no longer access the workspace, their role is removed, and they no longer see it on their practice dashboard.

5. **Given** a new workspace is connected to the practice (via any connection method), **When** no explicit assignment has been made, **Then** the practice owner is automatically assigned as the primary accountant, and other members have no access until explicitly assigned.

6. **Given** I am a practice member (not owner), **When** I view the practice dashboard, **Then** I only see workspaces I have been explicitly assigned to — not all practice-linked workspaces.

7. **Given** a workspace currently has blanket access (pre-v2 connection), **When** the system migrates to per-accountant assignment, **Then** all currently-connected members are automatically assigned to all their current workspaces (preserving existing access), a one-time banner informs the practice owner about the new Team Assignment feature, and the owner can then adjust assignments at their discretion.

---

### User Story 4 — Workspace Grouping / Client Families (Priority: P2)

A practice accountant manages the Smith family's financial affairs across three workspaces: "Smith Family Trust", "Smith Pty Ltd", and "Smith SMSF". Today these appear as three unrelated cards on the dashboard. The accountant wants to group them under "Smith Family" so they appear together, with aggregate stats showing the combined health of all three entities.

**Why this priority**: Client grouping is critical for any practice managing more than 10 entities. TaxDome and Karbon both treat this as a core feature. For MoneyQuest, it reduces dashboard clutter and enables future consolidated reporting across related entities.

**Independent Test**: Can be tested by creating a group, adding 3 workspaces, and verifying the dashboard renders them as a collapsed group with aggregate metrics.

**Acceptance Scenarios**:

1. **Given** I am a practice member, **When** I click "New Group" on the client list page, **Then** I can enter a group name (e.g., "Smith Family") and select workspaces to include.

2. **Given** a group "Smith Family" contains 3 workspaces, **When** I view the practice dashboard, **Then** I see a single group card showing: group name, number of entities, combined pending approvals count, combined overdue invoices count, and last activity across all entities.

3. **Given** I click on a group card, **When** the group expands, **Then** I see individual workspace cards for each entity in the group, each with their own stats and "Open" button.

4. **Given** I am on the client list page, **When** I drag a workspace into an existing group (or use a checkbox + "Add to Group" action), **Then** the workspace is added to that group.

5. **Given** a workspace belongs to a group, **When** I remove it from the group, **Then** it appears as a standalone card again on the dashboard. The workspace itself is unaffected.

6. **Given** I delete a group, **When** the group is removed, **Then** all workspaces in the group become standalone cards. No workspaces are deleted.

7. **Given** I am a workspace owner (not a practice member), **When** I view my workspace, **Then** I see no indication of any group — grouping is a practice-side concept only.

---

### User Story 5 — Practice Task Board (Priority: P2)

A practice accountant needs to track work items across their client portfolio — e.g., "Prepare Q3 BAS for Smith Pty Ltd", "Chase outstanding documents from Jones Trust", "Review year-end for Acme Corp". Today they track these in spreadsheets or email. The practice task board gives them a Kanban view of all tasks across clients, with due dates, assignees, and status tracking.

**Why this priority**: Task management is the daily operational layer that every competitor offers (Karbon, TaxDome, Canopy, Jetpack Workflow). Without it, MoneyQuest is a connection tool, not a practice management tool. This is the feature that drives daily active usage.

**Independent Test**: Can be tested by creating 3 tasks across 2 client workspaces, viewing them on the Kanban board, and moving one through statuses. Delivers immediate value as a task tracker.

**Acceptance Scenarios**:

1. **Given** I am a practice member, **When** I navigate to /practice/jobs (currently placeholder), **Then** I see a Kanban board with columns: To Do, In Progress, Blocked, Done.

2. **Given** I click "New Task", **When** I fill in: title (required), description, client workspace (dropdown of my assigned workspaces), assignee (dropdown of practice members assigned to that workspace OR workspace users such as the business owner), due date, and status, **Then** the task is created and appears in the correct column.

3. **Given** I drag a task card from "To Do" to "In Progress", **When** I release it, **Then** the task status is updated and the card appears in the new column.

4. **Given** tasks exist across multiple client workspaces, **When** I filter by a specific workspace, **Then** only tasks for that workspace are shown. Practice members only see tasks for workspaces they are assigned to, plus any tasks directly assigned to them.

5. **Given** tasks exist with different assignees, **When** I filter by "My Tasks", **Then** only tasks assigned to me are shown.

6. **Given** a task has a due date in the past and status is not "Done", **When** the task card renders, **Then** the due date is highlighted in red to indicate it is overdue.

7. **Given** I click on a task card, **When** the detail panel opens, **Then** I can edit all fields, add comments/notes, and see an activity log of status changes.

8. **Given** I toggle to "List View", **When** the view switches, **Then** I see a sortable table of all tasks with columns: Title, Client, Assignee, Due Date, Status, and Created Date.

9. **Given** I assign a task to a workspace user (e.g., the business owner), **When** that user logs into their workspace, **Then** they can see the task assigned to them with the title, description, and due date — giving the practice a lightweight way to request actions from clients (e.g., "Upload Q3 bank statements").

---

### User Story 6 — Recurring Task Templates (Priority: P2)

A practice manager wants to set up recurring work templates — e.g., "Quarterly BAS" that auto-creates a set of tasks every quarter for each applicable client. Today there is no automation for recurring practice work. The manager creates a template once, assigns it to client workspaces, and the system generates tasks on schedule.

**Why this priority**: Recurring work is the bread and butter of accounting practices (BAS quarterly, tax returns annually, monthly bookkeeping). Every competitor has this. Without it, practices must manually create the same tasks every period.

**Independent Test**: Can be tested by creating a recurring template with a quarterly schedule, assigning it to a workspace, and verifying tasks are auto-generated when the schedule triggers.

**Acceptance Scenarios**:

1. **Given** I am a practice owner or manager, **When** I navigate to /practice/jobs/templates, **Then** I see a list of existing templates and a "New Template" button.

2. **Given** I create a new template, **When** I fill in: template name (e.g., "Quarterly BAS"), description, a checklist of sub-tasks, recurrence schedule (weekly, monthly, quarterly, annually, custom), and default assignee role, **Then** the template is saved.

3. **Given** a template "Quarterly BAS" exists, **When** I assign it to workspaces "Smith Pty Ltd" and "Jones Trust", **Then** those workspaces are linked to the template.

4. **Given** a template's recurrence date arrives, **When** the schedule triggers, **Then** a new task is auto-created for each linked workspace with the template's sub-tasks, assigned to the workspace's primary accountant (or template default role), and due date calculated from the recurrence rule.

5. **Given** I edit a template's sub-task list, **When** I save, **Then** future auto-generated tasks use the updated sub-task list. Already-created tasks are not modified.

6. **Given** I want to create a one-off task from a template, **When** I select "Create from Template" on the task board, **Then** I choose a template and a workspace, and a single task instance is created without setting up recurrence.

---

### User Story 7 — Client Engagement Workbooks (Priority: P3)

A practice accountant starts a new engagement with a client — e.g., "2026 Tax Return for Smith Pty Ltd". They need a structured checklist of steps to complete, with the ability to attach documents to each step and track overall progress. The workbook acts as the accountant's playbook for that specific engagement, visible on the workspace card as a progress indicator.

**Why this priority**: Engagement checklists are how practices ensure nothing gets missed during complex multi-step work (tax returns, audits, year-end close). Canopy and TaxDome both have this. It's lower priority than the task board because tasks can serve as a lightweight substitute, but workbooks add the structure and document attachment layer.

**Independent Test**: Can be tested by creating a workbook for a workspace, completing checklist items with document attachments, and verifying the progress percentage appears on the dashboard card.

**Acceptance Scenarios**:

1. **Given** I am viewing a client workspace in practice mode, **When** I click "New Workbook", **Then** I can enter: workbook name (e.g., "2026 Tax Return"), select a template (or start blank), and the workbook is created with its checklist items.

2. **Given** a workbook has 10 checklist items, **When** I complete 6 of them, **Then** the workbook shows "60% complete" and the practice dashboard card for this workspace shows the workbook progress.

3. **Given** a checklist item exists, **When** I click "Attach File", **Then** I can upload a document that is linked to that specific checklist item (using the existing attachment system).

4. **Given** a checklist item is marked complete, **When** I view the workbook, **Then** the item shows a completed state with the date completed and who completed it.

5. **Given** workbook templates exist, **When** I create a new workbook and select "From Template", **Then** the checklist items are pre-populated from the template.

6. **Given** a workspace has multiple workbooks (e.g., "2025 Tax Return" and "2026 Tax Return"), **When** I view the workspace workbooks, **Then** I see all workbooks with their completion status, sortable by date.

---

### Edge Cases

- What happens when a practice member is removed from the practice but has tasks assigned? Tasks remain assigned but are flagged as "unassigned (member removed)" for the practice owner to reassign.
- What happens when a workspace is disconnected from a practice but has active tasks? Tasks are archived with a "workspace disconnected" status. They remain visible in a read-only archive view.
- What happens when a workspace belongs to multiple groups? A workspace can only belong to one group at a time. Adding it to a new group removes it from the previous group (with confirmation).
- What happens when the recurrence schedule for a template is changed? Future instances follow the new schedule. Already-generated tasks are unaffected.
- What happens during onboarding if the user closes the browser mid-wizard? Progress is preserved server-side. Returning to /practice/setup resumes at the last incomplete step.
- What happens when a practice owner assigns themselves a read-only role on a workspace? The system prevents this — practice owners always have full access to all practice-linked workspaces.

---

## Requirements

### Functional Requirements

**Onboarding**
- **FR-001**: System MUST provide a multi-step onboarding wizard with 4 steps: Firm Details, Invite Team, Add First Client, and Success.
- **FR-002**: System MUST support batch invitation of up to 20 team members by email in a single request.
- **FR-003**: System MUST allow skipping of the Invite Team and Add First Client steps.
- **FR-004**: System MUST remember onboarding progress if the user leaves and returns.

**Client Workspace Creation**
- **FR-005**: System MUST provide a dedicated page for creating client workspaces from within the practice interface.
- **FR-006**: System MUST automatically link newly created workspaces to the practice with accepted status.
- **FR-007**: System MUST grant all assigned practice members the appropriate role in newly created workspaces.

**Per-Accountant Assignment**
- **FR-008**: System MUST allow practice owners to assign or revoke individual team members' access to specific workspaces.
- **FR-009**: System MUST support role selection per assignment: accountant, bookkeeper, or auditor (read-only). These map to existing Spatie Permission roles.
- **FR-010**: System MUST support designating one team member as "Primary Accountant" per workspace.
- **FR-011**: System MUST default to owner-only assignment for new workspace connections (replacing blanket access).
- **FR-012**: System MUST auto-migrate existing blanket access to explicit assignments on deploy, preserving all current access. A one-time banner MUST inform practice owners about the new Team Assignment feature.
- **FR-013**: Practice members MUST only see workspaces they are explicitly assigned to on their dashboard.

**Workspace Grouping**
- **FR-014**: System MUST allow any practice member to create, rename, delete, and manage membership of workspace groups. Groups are collaborative — not restricted to owners.
- **FR-015**: System MUST display groups as collapsible cards on the practice dashboard with aggregate statistics.
- **FR-016**: System MUST limit each workspace to one group at a time.
- **FR-017**: Deleting a group MUST NOT delete the workspaces within it.
- **FR-018**: Workspace grouping MUST be invisible to workspace owners — it is practice-side only.

**Task Management**
- **FR-019**: System MUST provide a task entity with: title, description, client workspace, assignee (practice member or workspace user), due date, status (to_do, in_progress, blocked, done), and comments.
- **FR-020**: System MUST display tasks in a Kanban board view with drag-and-drop status changes. Kanban columns MUST use virtual scrolling for practices with 100+ tasks.
- **FR-021**: System MUST display tasks in an alternative list/table view with server-side pagination (25 per page).
- **FR-022**: System MUST support filtering tasks by workspace, assignee, status, and due date.
- **FR-023**: System MUST highlight overdue tasks (past due date, not done).
- **FR-024**: System MUST log status changes with timestamp and user for each task.
- **FR-035**: Practice members MUST only see tasks for workspaces they are assigned to, plus tasks directly assigned to them.
- **FR-036**: Tasks assigned to workspace users (non-practice members) MUST appear as a "Tasks from your accountant" section on the workspace dashboard, showing title, description, due date, and a "Mark Complete" button.

**Notifications**
- **FR-037**: System MUST notify a user when a task is assigned to them (practice member or workspace user).
- **FR-038**: System MUST send a daily digest notification for tasks that are overdue (past due date, not done), grouped by workspace.

**Recurring Templates**
- **FR-025**: System MUST support task templates with a name, description, sub-task checklist, and recurrence schedule.
- **FR-026**: System MUST auto-generate task instances from templates via a scheduled background job (daily). Tasks are created when the recurrence date arrives.
- **FR-027**: System MUST allow templates to be assigned to multiple workspaces.
- **FR-028**: System MUST assign auto-generated tasks to the workspace's primary accountant by default.
- **FR-029**: Editing a template MUST affect only future generated tasks, not existing ones.
- **FR-039**: Deleting a template MUST soft-delete (archive) it — existing tasks remain, no new tasks are generated. Archived templates can be restored.

**Client Workbooks**
- **FR-030**: System MUST support workbooks (named checklists) per workspace with completion tracking.
- **FR-031**: System MUST display workbook progress percentage on the practice dashboard workspace card.
- **FR-032**: System MUST support file attachment per checklist item (using the existing attachment system).
- **FR-033**: System MUST support workbook templates for common engagement types.
- **FR-034**: Completing a checklist item MUST record who completed it and when.

### Key Entities

- **Practice** (existing): Accounting firm identity with members and workspace connections.
- **Practice Member Assignment**: Links a practice member to a specific workspace with a role (accountant/bookkeeper/read-only) and primary accountant flag.
- **Workspace Group**: A named collection of related workspaces within a practice (e.g., "Smith Family"). Practice-scoped, not visible to workspace owners.
- **Practice Task**: A unit of work tied to a client workspace — has title, description, assignee, due date, status, and comments.
- **Task Template**: A reusable definition of a task with sub-tasks and a recurrence schedule. Can be linked to multiple workspaces.
- **Task Comment**: A timestamped note on a task, authored by a practice member.
- **Workbook**: A named engagement checklist for a workspace — has a title, template origin, and completion state.
- **Workbook Item**: A single checklist step within a workbook — has a description, completion state, completed-by, and optional file attachment.
- **Workbook Template**: A reusable set of checklist items for common engagement types.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A new practice user can complete onboarding (firm details + at least one team invite + first client workspace) in under 5 minutes.
- **SC-002**: Practice owners can assign specific team members to specific workspaces within 30 seconds per assignment.
- **SC-003**: A practice with 20+ workspaces can organise them into groups and navigate to any workspace within 2 clicks from the dashboard.
- **SC-004**: Practice members can create, assign, and move tasks through statuses with zero page reloads (drag-and-drop Kanban).
- **SC-005**: Auto-generated recurring tasks appear on the task board within 1 minute of their scheduled creation time.
- **SC-006**: Workbook progress percentage updates in real-time as checklist items are completed.
- **SC-007**: Practice members see only their assigned workspaces — no data leakage from unassigned workspaces.
- **SC-008**: Existing practices with blanket access experience zero disruption during migration to per-accountant assignment (all existing access preserved until explicitly changed).

---

## Clarifications

### Session 2026-03-15

- Q: Does "read-only" map to an existing Spatie role or a new one? → A: Maps to the existing `auditor` role (read-only across all domains + audit log).
- Q: Should migration from blanket to granular access be automatic or opt-in? → A: Auto-migrate on deploy with a one-time banner informing the practice owner about the new Team Assignment feature.
- Q: Are tasks scoped to the practice or individual members? → A: Scoped by workspace assignment — members see tasks for their assigned workspaces plus tasks directly assigned to them. Tasks can also be assigned to workspace users (clients), giving practices a lightweight way to request actions from clients.
- Q: What is explicitly out of scope? → A: Time tracking/billing, engagement letters, email integration/triage, client portal enhancements, practice-level financial reporting, structured data collection, workflow pipeline automation.
- Q: How are recurring tasks generated? → A: Scheduled background job running daily (e.g., midnight), checks which templates are due, creates tasks.
- Q: Where do workspace users (clients) see tasks assigned to them? → A: A "Tasks from your accountant" section on their existing workspace dashboard — title, description, due date, and "Mark Complete" button. No new page needed.
- Q: Who can manage workspace groups? → A: Any practice member. Groups are a collaborative organisational tool, not a security boundary.
- Q: What notifications should trigger from practice tasks? → A: Minimal set — task assigned to you, and daily digest of overdue tasks. Start lean, expand later.
- Q: What happens when a task template is deleted but has active recurring tasks? → A: Soft delete (archive). Existing tasks remain, no new tasks generated. Template can be restored.
- Q: Pagination strategy for task board? → A: Server-side pagination (25/page) for list view, virtual scrolling for Kanban columns. Matches existing app patterns and CLAUDE.md standards.
