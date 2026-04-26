---
title: "Implementation Plan: Practice Management v2"
---

# Implementation Plan: Practice Management v2

**Branch**: `feature/027-PMV-practice-management-v2` | **Date**: 2026-03-15 | **Spec**: [spec.md](./spec.md)

## Summary

Transform practice management from a connection layer into a daily-use operational tool. Five capability areas: multi-step onboarding wizard, per-accountant workspace assignment, workspace grouping (client families), practice task board with recurring templates, and client engagement workbooks. All build on the existing 015-ACT foundation.

## Technical Context

**Language/Version**: PHP 8.4 (Laravel 12), TypeScript (Next.js 16, React 19)
**Primary Dependencies**: Spatie Permission (teams mode), Spatie laravel-event-sourcing v7, TanStack Query v5, React Hook Form + Zod, Zustand v5
**Storage**: SQLite (local), single-database multi-tenancy with `workspace_id` scoping
**Testing**: Pest v4 (feature + browser via Playwright)
**Target Platform**: Web SPA (Next.js frontend + Laravel API)
**Constraints**: Amounts in cents, reversal-only for posted entries, Sanctum cookie auth

## Gate 3: Architecture Check

### 1. Technical Feasibility

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | Extends existing practice models, adds new central tables |
| Existing patterns leveraged | PASS | Lorisleiva Actions, Form Requests, API Resources, TanStack Query hooks |
| No impossible requirements | PASS | All 39 FRs buildable with current stack |
| Performance considered | PASS | Virtual scrolling for Kanban 100+ tasks, server-side pagination for list view |
| Security considered | PASS | Per-accountant assignment scopes data access, workspace grouping practice-side only |

### 2. Data & Integration

| Check | Status | Notes |
|-------|--------|-------|
| Data model understood | PASS | 6 new tables, 1 modified table — see Data Model section |
| API contracts clear | PASS | 25 new endpoints across 6 controllers |
| Dependencies identified | PASS | 015-ACT (complete), 012-ATT (complete), 024-NTF (partial) |
| Integration points mapped | PASS | SetWorkspaceContext middleware unchanged, new PracticeAssignment check |
| DTO persistence explicit | PASS | Form Request validated() → Action params, no toArray() into create() |

### 3. Implementation Approach

| Check | Status | Notes |
|-------|--------|-------|
| File changes identified | PASS | See Implementation Phases |
| Risk areas noted | PASS | Migration from blanket → granular access is highest risk |
| Testing approach defined | PASS | Feature tests per phase, browser tests for wizard + task board |
| Rollback possible | PASS | Migration preserves existing access, new tables are additive |

### 4. Resource & Scope

| Check | Status | Notes |
|-------|--------|-------|
| Scope matches spec | PASS | 7 stories, 39 FRs — no over-engineering |
| Effort reasonable | PASS | 5 sprints, 1 developer |
| Skills available | PASS | Solo dev, full-stack |

### 5. Laravel Best Practices

| Check | Status | Notes |
|-------|--------|-------|
| Use Lorisleiva Actions | PASS | All business logic in Actions |
| Form Requests for validation | PASS | Every mutation endpoint has a Form Request |
| API Resources for responses | PASS | All responses wrapped in Resources |
| Model route binding | PASS | Controllers use Model instances |
| Sanctum cookie auth | PASS | All practice routes under `auth:sanctum` middleware |
| Migrations schema-only | PASS | Data migration for blanket→granular in a separate seeder/command |

### 6. Next.js/React Standards (CLAUDE.md Overrides)

| Check | Status | Notes |
|-------|--------|-------|
| All components TypeScript | PASS | Every `.tsx` file uses strict TypeScript |
| Props typed with interfaces | PASS | Types defined in `types/index.ts` |
| No `any` types | PASS | All API response types defined |
| TanStack Query for server state | PASS | Hooks in `use-practice.ts` (extended) |
| Zustand for client state | PASS | Practice task board filters in Zustand store |
| React Hook Form + Zod | PASS | Onboarding wizard, create client form, task form |
| Multi-step wizard uses single useForm | PASS | Wizard parent holds single form instance, per-step Zod validation |

### Overall: PASS — No red flags

---

## Data Model

### New Tables

#### `practice_member_assignments`

Per-accountant workspace assignment. Replaces blanket access from `practice_workspaces`.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| practice_id | FK practices | cascadeOnDelete |
| user_id | FK users | cascadeOnDelete |
| workspace_id | FK workspaces | cascadeOnDelete |
| role | string | accountant, bookkeeper, auditor |
| is_primary | boolean | default false — one primary per workspace |
| created_at, updated_at | timestamps | |

Unique: `[practice_id, user_id, workspace_id]`
Index: `[practice_id, workspace_id]` for "who's assigned to this workspace?"
Index: `[practice_id, user_id]` for "what workspaces is this member assigned to?"

#### `workspace_groups`

Practice-side grouping of related workspaces (e.g., "Smith Family").

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| practice_id | FK practices | cascadeOnDelete |
| name | string | e.g., "Smith Family" |
| created_by_user_id | FK users | nullOnDelete |
| created_at, updated_at | timestamps | |

Index: `[practice_id]`

#### `workspace_group_members`

Join table: which workspaces belong to which group.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| workspace_group_id | FK workspace_groups | cascadeOnDelete |
| workspace_id | FK workspaces | cascadeOnDelete |

Unique: `[workspace_group_id, workspace_id]`
Constraint: workspace can only be in one group — enforced in Action, not DB (simpler migration).

#### `practice_tasks`

Named `practice_tasks` to avoid collision with Laravel's `jobs` queue table and existing `project_jobs`.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| practice_id | FK practices | cascadeOnDelete |
| workspace_id | FK workspaces | nullable, cascadeOnDelete |
| assignee_id | FK users | nullable, nullOnDelete |
| created_by_user_id | FK users | nullOnDelete |
| template_id | FK practice_task_templates | nullable, nullOnDelete |
| title | string | required |
| description | text | nullable |
| status | string | to_do, in_progress, blocked, done |
| due_date | date | nullable |
| sort_order | integer | default 0, for Kanban column ordering |
| completed_at | timestamp | nullable |
| created_at, updated_at | timestamps | |

Index: `[practice_id, status]` for Kanban columns
Index: `[practice_id, workspace_id]` for per-workspace filtering
Index: `[assignee_id]` for "My Tasks" filter

#### `practice_task_comments`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| practice_task_id | FK practice_tasks | cascadeOnDelete |
| user_id | FK users | nullOnDelete |
| body | text | |
| created_at, updated_at | timestamps | |

#### `practice_task_status_log`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| practice_task_id | FK practice_tasks | cascadeOnDelete |
| user_id | FK users | nullable |
| from_status | string | nullable (null for creation) |
| to_status | string | |
| created_at | timestamp | |

#### `practice_task_templates`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| practice_id | FK practices | cascadeOnDelete |
| name | string | e.g., "Quarterly BAS" |
| description | text | nullable |
| sub_tasks | json | array of {title, sort_order} |
| recurrence | string | nullable: weekly, monthly, quarterly, annually, custom |
| recurrence_config | json | nullable: {day_of_week, day_of_month, months, custom_days} |
| default_assignee_role | string | nullable: primary_accountant, or specific role |
| next_due_date | date | nullable — calculated, used by scheduler |
| archived_at | timestamp | nullable — soft delete |
| created_at, updated_at | timestamps | |

Index: `[practice_id, archived_at]` for active templates
Index: `[next_due_date]` for scheduled job query

#### `practice_task_template_workspaces`

Join table: which workspaces are linked to a template.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| template_id | FK practice_task_templates | cascadeOnDelete |
| workspace_id | FK workspaces | cascadeOnDelete |

Unique: `[template_id, workspace_id]`

#### `workbooks`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| practice_id | FK practices | cascadeOnDelete |
| workspace_id | FK workspaces | cascadeOnDelete |
| template_id | FK workbook_templates | nullable, nullOnDelete |
| name | string | e.g., "2026 Tax Return" |
| created_by_user_id | FK users | nullOnDelete |
| created_at, updated_at | timestamps | |

Index: `[practice_id, workspace_id]`

#### `workbook_items`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| workbook_id | FK workbooks | cascadeOnDelete |
| description | string | |
| sort_order | integer | default 0 |
| is_completed | boolean | default false |
| completed_by_user_id | FK users | nullable |
| completed_at | timestamp | nullable |
| created_at, updated_at | timestamps | |

Attachments via existing polymorphic `attachments` table (morph map: `workbook_item`).

#### `workbook_templates`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| practice_id | FK practices | cascadeOnDelete |
| name | string | e.g., "Tax Return Checklist" |
| items | json | array of {description, sort_order} |
| created_at, updated_at | timestamps | |

---

## API Contracts

### Practice Onboarding (extends PracticeController)

| Method | Path | Action | Notes |
|--------|------|--------|-------|
| POST | `/v1/practice/members/batch-invite` | `batchInviteMembers` | Up to 20 emails |

### Practice Member Assignments (new controller)

| Method | Path | Action | Notes |
|--------|------|--------|-------|
| GET | `/v1/practice/workspaces/{workspaceId}/assignments` | `index` | List assignments for a workspace |
| POST | `/v1/practice/workspaces/{workspaceId}/assignments` | `store` | Assign member to workspace |
| PATCH | `/v1/practice/workspaces/{workspaceId}/assignments/{id}` | `update` | Change role or primary flag |
| DELETE | `/v1/practice/workspaces/{workspaceId}/assignments/{id}` | `destroy` | Revoke assignment |

### Workspace Groups (new controller)

| Method | Path | Action | Notes |
|--------|------|--------|-------|
| GET | `/v1/practice/groups` | `index` | List all groups with members |
| POST | `/v1/practice/groups` | `store` | Create group |
| PATCH | `/v1/practice/groups/{id}` | `update` | Rename group |
| DELETE | `/v1/practice/groups/{id}` | `destroy` | Delete group (workspaces preserved) |
| POST | `/v1/practice/groups/{id}/members` | `addMember` | Add workspace to group |
| DELETE | `/v1/practice/groups/{id}/members/{workspaceId}` | `removeMember` | Remove workspace from group |

### Practice Tasks (new controller)

| Method | Path | Action | Notes |
|--------|------|--------|-------|
| GET | `/v1/practice/tasks` | `index` | List/filter tasks (paginated for list, all for Kanban) |
| POST | `/v1/practice/tasks` | `store` | Create task |
| PATCH | `/v1/practice/tasks/{id}` | `update` | Update task fields |
| PATCH | `/v1/practice/tasks/{id}/status` | `updateStatus` | Move task (logs status change) |
| DELETE | `/v1/practice/tasks/{id}` | `destroy` | Delete task |
| GET | `/v1/practice/tasks/{id}/comments` | `comments` | List comments |
| POST | `/v1/practice/tasks/{id}/comments` | `addComment` | Add comment |

### Task Templates (new controller)

| Method | Path | Action | Notes |
|--------|------|--------|-------|
| GET | `/v1/practice/task-templates` | `index` | List active templates |
| POST | `/v1/practice/task-templates` | `store` | Create template |
| PATCH | `/v1/practice/task-templates/{id}` | `update` | Update template |
| DELETE | `/v1/practice/task-templates/{id}` | `destroy` | Archive (soft delete) |
| POST | `/v1/practice/task-templates/{id}/restore` | `restore` | Restore archived template |
| POST | `/v1/practice/task-templates/{id}/workspaces` | `linkWorkspaces` | Assign workspaces |
| POST | `/v1/practice/task-templates/{id}/generate` | `generateNow` | One-off generation |

### Workbooks (new controller)

| Method | Path | Action | Notes |
|--------|------|--------|-------|
| GET | `/v1/practice/workspaces/{workspaceId}/workbooks` | `index` | List workbooks for workspace |
| POST | `/v1/practice/workspaces/{workspaceId}/workbooks` | `store` | Create workbook |
| GET | `/v1/practice/workbooks/{id}` | `show` | Workbook with items |
| DELETE | `/v1/practice/workbooks/{id}` | `destroy` | Delete workbook |
| PATCH | `/v1/practice/workbooks/{id}/items/{itemId}` | `updateItem` | Toggle complete, update description |

### Workbook Templates

| Method | Path | Action | Notes |
|--------|------|--------|-------|
| GET | `/v1/practice/workbook-templates` | `index` | List templates |
| POST | `/v1/practice/workbook-templates` | `store` | Create template |
| PATCH | `/v1/practice/workbook-templates/{id}` | `update` | Update template |
| DELETE | `/v1/practice/workbook-templates/{id}` | `destroy` | Delete template |

### Workspace-Side (client task visibility)

| Method | Path | Action | Notes |
|--------|------|--------|-------|
| GET | `/v1/my-tasks` | `index` | Workspace-scoped: tasks assigned to current user |
| PATCH | `/v1/my-tasks/{id}/complete` | `complete` | Mark task as done (workspace user) |

---

## Implementation Phases

### Phase 1: Onboarding + Create Client (Sprint 1)

**Backend:**
- Migration: `practice_member_assignments` table
- Action: `BatchInvitePracticeMembers` (emails array → invited/skipped results)
- Action: `MigrateToGranularAssignment` (one-time migration command)
- Form Request: `BatchInvitePracticeMembersRequest` (emails array, max 20)
- Route: `POST /v1/practice/members/batch-invite`
- Update `PracticeController::createClientWorkspace` response to include full workspace resource

**Frontend:**
- Replace `/practice/setup` single form with 4-step wizard
  - Step 1: Firm Details (React Hook Form + Zod, same fields as today)
  - Step 2: Invite Team (multi-email input, batch invite mutation)
  - Step 3: Add First Client (create workspace form OR show invite link)
  - Step 4: Success (redirect to dashboard)
- New `/practice/clients/new` page (Create Client Workspace form)
- Update `use-practice.ts` hooks: `useBatchInvite()`, `useCreateClientWorkspace()`

**Tests:**
- `it_batch_invites_multiple_members`
- `it_skips_already_existing_members_in_batch`
- `it_validates_email_array_max_20`
- `it_creates_client_workspace_from_practice`
- Browser: `it_completes_full_onboarding_wizard`

### Phase 2: Per-Accountant Assignment (Sprint 2)

**Backend:**
- Model: `PracticeMemberAssignment` in `app/Models/Central/`
- Actions: `AssignMemberToWorkspace`, `RevokeMemberAssignment`, `SetPrimaryAccountant`
- Controller: `PracticeMemberAssignmentController` (CRUD)
- Form Requests: `AssignMemberRequest`, `UpdateAssignmentRequest`
- Resource: `PracticeMemberAssignmentResource`
- Command: `MigrateBlanketToPracticeAssignments` — one-time migration
- Update `GetAdvisorDashboard` action to filter by assignments (not blanket access)
- Update practice dashboard API to respect assignment scoping

**Frontend:**
- Team Assignment panel on workspace detail (toggle members, role selector, primary accountant)
- Update practice dashboard to filter by assigned workspaces
- One-time banner component for migration notification
- Update `use-practice.ts`: `useWorkspaceAssignments()`, `useAssignMember()`, `useRevokeMember()`

**Tests:**
- `it_assigns_member_to_workspace_with_role`
- `it_revokes_member_assignment`
- `it_sets_primary_accountant`
- `it_prevents_duplicate_assignment`
- `it_scopes_dashboard_to_assigned_workspaces`
- `it_preserves_existing_access_during_migration`

### Phase 3: Workspace Grouping (Sprint 3)

**Backend:**
- Migrations: `workspace_groups`, `workspace_group_members`
- Models: `WorkspaceGroup`, `WorkspaceGroupMember` in `app/Models/Central/`
- Actions: `CreateWorkspaceGroup`, `UpdateWorkspaceGroup`, `DeleteWorkspaceGroup`, `AddWorkspaceToGroup`, `RemoveWorkspaceFromGroup`
- Controller: `WorkspaceGroupController`
- Resource: `WorkspaceGroupResource` (with nested workspace stats)
- Update dashboard API to return grouped structure

**Frontend:**
- Group cards on practice dashboard (collapsible, aggregate stats)
- "New Group" dialog on client list
- Add-to-group action (checkbox + dropdown)
- Update `use-practice.ts`: `useWorkspaceGroups()`, `useCreateGroup()`, `useAddToGroup()`, `useRemoveFromGroup()`

**Tests:**
- `it_creates_workspace_group`
- `it_adds_workspace_to_group`
- `it_enforces_one_group_per_workspace`
- `it_deletes_group_without_deleting_workspaces`
- `it_returns_aggregate_stats_for_group`
- `it_hides_groups_from_workspace_owners`

### Phase 4: Task Management + Recurring (Sprint 4)

**Backend:**
- Migrations: `practice_tasks`, `practice_task_comments`, `practice_task_status_log`, `practice_task_templates`, `practice_task_template_workspaces`
- Models: `PracticeTask`, `PracticeTaskComment`, `PracticeTaskStatusLog`, `PracticeTaskTemplate` in `app/Models/Central/`
- Actions: `CreatePracticeTask`, `UpdatePracticeTask`, `UpdateTaskStatus`, `CreateTaskTemplate`, `GenerateRecurringTasks`
- Controllers: `PracticeTaskController`, `PracticeTaskTemplateController`
- Command: `ProcessDuePracticeTemplates` — daily scheduled job
- Schedule: add to `routes/console.php` at 06:00
- Resources: `PracticeTaskResource`, `PracticeTaskTemplateResource`
- Workspace-side: `MyTasksController` for client-visible tasks
- Route: `GET /v1/my-tasks` (workspace-scoped, SetWorkspaceContext middleware)

**Frontend:**
- Replace `/practice/jobs` placeholder with Kanban board
  - 4 columns: To Do, In Progress, Blocked, Done
  - Drag-and-drop via `@dnd-kit/core`
  - Virtual scrolling for 100+ tasks
  - Task detail panel (slide-over)
- List view toggle (TanStack Table, server-side pagination 25/page)
- Filters: workspace, assignee, status, due date, "My Tasks"
- `/practice/jobs/templates` page (template CRUD)
- "Tasks from your accountant" section on workspace dashboard
- New hooks: `usePracticeTasks()`, `useCreateTask()`, `useUpdateTaskStatus()`, `useTaskTemplates()`
- New Zustand store: `practice-task-filters.ts` (persists filter state)

**Tests:**
- `it_creates_practice_task`
- `it_updates_task_status_and_logs_change`
- `it_scopes_tasks_by_workspace_assignment`
- `it_generates_recurring_tasks_from_template`
- `it_archives_template_on_delete`
- `it_shows_client_tasks_on_workspace_dashboard`
- `it_allows_workspace_user_to_complete_task`
- Browser: `it_drags_task_between_kanban_columns`

### Phase 5: Workbooks + Polish (Sprint 5)

**Backend:**
- Migrations: `workbooks`, `workbook_items`, `workbook_templates`
- Models: `Workbook`, `WorkbookItem`, `WorkbookTemplate` in `app/Models/Central/`
- Add `workbook_item` to morph map in AppServiceProvider (for attachments)
- Add `HasAttachments` trait to `WorkbookItem`
- Actions: `CreateWorkbook`, `UpdateWorkbookItem`, `CreateWorkbookTemplate`
- Controllers: `WorkbookController`, `WorkbookTemplateController`
- Resources: `WorkbookResource` (with items + progress %), `WorkbookTemplateResource`
- Update dashboard workspace card API to include workbook progress

**Frontend:**
- Workbook detail page (checklist with completion toggles, file attachment per item)
- "New Workbook" dialog on workspace detail
- Workbook progress bar on dashboard workspace cards
- `/practice/workbook-templates` page (or section in settings)
- Update hooks: `useWorkbooks()`, `useCreateWorkbook()`, `useToggleWorkbookItem()`, `useWorkbookTemplates()`

**Tests:**
- `it_creates_workbook_from_template`
- `it_toggles_workbook_item_completion`
- `it_attaches_file_to_workbook_item`
- `it_calculates_workbook_progress_percentage`
- `it_returns_workbook_progress_on_dashboard`

---

## Testing Strategy

### Test Coverage by Phase

| Phase | Feature Tests | Browser Tests |
|-------|---------------|---------------|
| Phase 1 | 5 (batch invite, create workspace) | 1 (onboarding wizard) |
| Phase 2 | 6 (assignment CRUD, migration, scoping) | 0 |
| Phase 3 | 6 (groups CRUD, stats, privacy) | 0 |
| Phase 4 | 8 (tasks CRUD, recurring, client-side) | 1 (Kanban drag) |
| Phase 5 | 5 (workbooks, items, attachments, progress) | 0 |
| **Total** | **30** | **2** |

### Test Execution Checklist

- [ ] Phase 1: Feature tests passing, browser test passing
- [ ] Phase 2: All assignment tests passing, dashboard scoping verified
- [ ] Phase 3: Group tests passing, aggregate stats correct
- [ ] Phase 4: Task + template tests passing, scheduled job tested, Kanban browser test passing
- [ ] Phase 5: Workbook tests passing, attachment integration verified
- [ ] Final: Full `php artisan test --compact` green

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Blanket → granular migration breaks existing access | Medium | High | Auto-assign all existing members; banner for awareness; reversible via command |
| Task management scope creep | Medium | Medium | Strict out-of-scope list; no client-facing features beyond "Mark Complete" |
| Kanban drag-and-drop performance with 200+ tasks | Low | Medium | Virtual scrolling, status-based queries, optimistic updates |
| Workspace group aggregate stats slow for large practices | Low | Low | Eager load counts, cache per-group stats with 5-min TTL |

---

## Next Steps

1. Run `/speckit-tasks` to generate tasks.md
2. Run `/speckit-implement` to start development
3. Run `/trilogy-clarify dev` if any technical decisions need refinement
