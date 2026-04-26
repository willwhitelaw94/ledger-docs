---
title: "Implementation Tasks: Practice Management v2"
---

# Implementation Tasks: Practice Management v2

**Mode**: AI (agent-executable)
**Generated**: 2026-03-15
**Total Tasks**: 68
**Stories**: US1–US7

---

## Phase 1: Foundation — Migrations & Models (blocking for all)

- [ ] T001 Migration: create `practice_member_assignments` table — columns: id, practice_id (FK practices cascadeOnDelete), user_id (FK users cascadeOnDelete), workspace_id (FK workspaces cascadeOnDelete), role (string default 'accountant'), is_primary (boolean default false), timestamps. Unique: [practice_id, user_id, workspace_id]. Indexes: [practice_id, workspace_id], [practice_id, user_id]. File: `database/migrations/2026_03_15_300001_create_practice_member_assignments_table.php`

- [ ] T002 [P] Migration: create `workspace_groups` table — columns: id, practice_id (FK practices cascadeOnDelete), name (string), created_by_user_id (FK users nullable nullOnDelete), timestamps. Index: [practice_id]. File: `database/migrations/2026_03_15_300002_create_workspace_groups_table.php`

- [ ] T003 [P] Migration: create `workspace_group_members` table — columns: id, workspace_group_id (FK workspace_groups cascadeOnDelete), workspace_id (FK workspaces cascadeOnDelete). Unique: [workspace_group_id, workspace_id]. File: `database/migrations/2026_03_15_300003_create_workspace_group_members_table.php`

- [ ] T004 [P] Migration: create `practice_tasks` table — columns: id, practice_id (FK practices cascadeOnDelete), workspace_id (FK workspaces nullable cascadeOnDelete), assignee_id (FK users nullable nullOnDelete), created_by_user_id (FK users nullable nullOnDelete), template_id (FK practice_task_templates nullable nullOnDelete), title (string), description (text nullable), status (string default 'to_do'), due_date (date nullable), sort_order (integer default 0), completed_at (timestamp nullable), timestamps. Indexes: [practice_id, status], [practice_id, workspace_id], [assignee_id]. File: `database/migrations/2026_03_15_300004_create_practice_tasks_table.php`

- [ ] T005 [P] Migration: create `practice_task_comments` table — columns: id, practice_task_id (FK practice_tasks cascadeOnDelete), user_id (FK users nullable nullOnDelete), body (text), timestamps. File: `database/migrations/2026_03_15_300005_create_practice_task_comments_table.php`

- [ ] T006 [P] Migration: create `practice_task_status_log` table — columns: id, practice_task_id (FK practice_tasks cascadeOnDelete), user_id (FK users nullable), from_status (string nullable), to_status (string), created_at (timestamp). File: `database/migrations/2026_03_15_300006_create_practice_task_status_log_table.php`

- [ ] T007 [P] Migration: create `practice_task_templates` table — columns: id, practice_id (FK practices cascadeOnDelete), name (string), description (text nullable), sub_tasks (json), recurrence (string nullable), recurrence_config (json nullable), default_assignee_role (string nullable), next_due_date (date nullable), archived_at (timestamp nullable), timestamps. Indexes: [practice_id, archived_at], [next_due_date]. File: `database/migrations/2026_03_15_300007_create_practice_task_templates_table.php`

- [ ] T008 [P] Migration: create `practice_task_template_workspaces` table — columns: id, template_id (FK practice_task_templates cascadeOnDelete), workspace_id (FK workspaces cascadeOnDelete). Unique: [template_id, workspace_id]. File: `database/migrations/2026_03_15_300008_create_practice_task_template_workspaces_table.php`

- [ ] T009 [P] Migration: create `workbooks` table — columns: id, practice_id (FK practices cascadeOnDelete), workspace_id (FK workspaces cascadeOnDelete), template_id (FK workbook_templates nullable nullOnDelete), name (string), created_by_user_id (FK users nullable nullOnDelete), timestamps. Index: [practice_id, workspace_id]. File: `database/migrations/2026_03_15_300009_create_workbooks_table.php`

- [ ] T010 [P] Migration: create `workbook_items` table — columns: id, workbook_id (FK workbooks cascadeOnDelete), description (string), sort_order (integer default 0), is_completed (boolean default false), completed_by_user_id (FK users nullable), completed_at (timestamp nullable), timestamps. File: `database/migrations/2026_03_15_300010_create_workbook_items_table.php`

- [ ] T011 [P] Migration: create `workbook_templates` table — columns: id, practice_id (FK practices cascadeOnDelete), name (string), items (json), timestamps. File: `database/migrations/2026_03_15_300011_create_workbook_templates_table.php`

- [ ] T012 Model: `PracticeMemberAssignment` — namespace `App\Models\Central`. Fillable: practice_id, user_id, workspace_id, role, is_primary. Relations: `practice()` BelongsTo Practice, `user()` BelongsTo User, `workspace()` BelongsTo Workspace. Scope: `scopePrimary($q)` → where('is_primary', true). File: `app/Models/Central/PracticeMemberAssignment.php`

- [ ] T013 [P] Model: `WorkspaceGroup` — namespace `App\Models\Central`. Fillable: practice_id, name, created_by_user_id. Relations: `practice()` BelongsTo Practice, `createdBy()` BelongsTo User, `workspaces()` BelongsToMany Workspace via workspace_group_members. File: `app/Models/Central/WorkspaceGroup.php`

- [ ] T014 [P] Model: `PracticeTask` — namespace `App\Models\Central`. Fillable: practice_id, workspace_id, assignee_id, created_by_user_id, template_id, title, description, status, due_date, sort_order, completed_at. Casts: due_date → date, completed_at → datetime. Relations: `practice()`, `workspace()`, `assignee()`, `createdBy()`, `template()`, `comments()` HasMany, `statusLogs()` HasMany. Scopes: `scopeForWorkspace($q, $id)`, `scopeForAssignee($q, $id)`, `scopeOverdue($q)` → where('due_date', '<', today())->where('status', '!=', 'done'). File: `app/Models/Central/PracticeTask.php`

- [ ] T015 [P] Model: `PracticeTaskComment` — namespace `App\Models\Central`. Fillable: practice_task_id, user_id, body. Relations: `task()` BelongsTo PracticeTask, `user()` BelongsTo User. File: `app/Models/Central/PracticeTaskComment.php`

- [ ] T016 [P] Model: `PracticeTaskStatusLog` — namespace `App\Models\Central`. Fillable: practice_task_id, user_id, from_status, to_status. No updated_at (set $timestamps = false, use only created_at). File: `app/Models/Central/PracticeTaskStatusLog.php`

- [ ] T017 [P] Model: `PracticeTaskTemplate` — namespace `App\Models\Central`. Fillable: practice_id, name, description, sub_tasks, recurrence, recurrence_config, default_assignee_role, next_due_date, archived_at. Casts: sub_tasks → array, recurrence_config → array, next_due_date → date, archived_at → datetime. Relations: `practice()`, `workspaces()` BelongsToMany Workspace via practice_task_template_workspaces. Scopes: `scopeActive($q)` → whereNull('archived_at'), `scopeDue($q)` → where('next_due_date', '<=', today())->active(). File: `app/Models/Central/PracticeTaskTemplate.php`

- [ ] T018 [P] Model: `Workbook` — namespace `App\Models\Central`. Fillable: practice_id, workspace_id, template_id, name, created_by_user_id. Relations: `practice()`, `workspace()`, `template()` BelongsTo WorkbookTemplate, `items()` HasMany WorkbookItem, `createdBy()`. Accessor: `progress` → items completed / total * 100 (integer %). File: `app/Models/Central/Workbook.php`

- [ ] T019 [P] Model: `WorkbookItem` — namespace `App\Models\Central`. Fillable: workbook_id, description, sort_order, is_completed, completed_by_user_id, completed_at. Casts: is_completed → boolean, completed_at → datetime. Use `HasAttachments` trait (existing). Relations: `workbook()`, `completedBy()`. File: `app/Models/Central/WorkbookItem.php`

- [ ] T020 [P] Model: `WorkbookTemplate` — namespace `App\Models\Central`. Fillable: practice_id, name, items. Casts: items → array. Relations: `practice()`. File: `app/Models/Central/WorkbookTemplate.php`

- [ ] T021 Update morph map in `app/Providers/AppServiceProvider.php` — add `'workbook_item' => \App\Models\Central\WorkbookItem::class` to `Relation::morphMap()` array.

- [ ] T022 Add relations to `app/Models/Central/Practice.php` — `memberAssignments()` HasMany PracticeMemberAssignment, `workspaceGroups()` HasMany WorkspaceGroup, `tasks()` HasMany PracticeTask, `taskTemplates()` HasMany PracticeTaskTemplate, `workbooks()` HasMany Workbook, `workbookTemplates()` HasMany WorkbookTemplate.

- [ ] T023 Run `php artisan migrate` — verify all 11 new tables created successfully.

---

## Phase 2: Core Actions (blocking for controllers)

### US1 — Onboarding Wizard

- [ ] T024 Action: `BatchInvitePracticeMembers` — handle(Practice $practice, array $emails): array. Loop emails, strtolower+trim, find User, skip if hasMember or no account, attach as member. Return ['invited' => [...], 'skipped' => [...]]. File: `app/Actions/Practice/BatchInvitePracticeMembers.php`

- [ ] T025 Form Request: `BatchInvitePracticeMembersRequest` — authorize: user must be practice owner (stash practice on attributes). Rules: emails required|array|min:1|max:20, emails.* required|email|distinct. File: `app/Http/Requests/Practice/BatchInvitePracticeMembersRequest.php`

### US2 — Create Client Workspace

_(Backend already exists: `CreateClientWorkspace` action + `CreateClientWorkspaceRequest` + route. Only frontend needed — see Phase 4.)_

### US3 — Per-Accountant Assignment

- [ ] T026 Action: `AssignMemberToWorkspace` — handle(Practice $practice, User $user, Workspace $workspace, string $role = 'accountant', bool $isPrimary = false): PracticeMemberAssignment. Checks user is practice member. Creates assignment. If isPrimary, unset other primaries for this workspace. Grants Spatie role + workspace_users pivot. File: `app/Actions/Practice/AssignMemberToWorkspace.php`

- [ ] T027 [P] Action: `RevokeMemberAssignment` — handle(PracticeMemberAssignment $assignment): void. Remove Spatie role for workspace. Check if user has other access (direct invite) before detaching from workspace_users. Delete assignment. File: `app/Actions/Practice/RevokeMemberAssignment.php`

- [ ] T028 [P] Action: `SetPrimaryAccountant` — handle(Practice $practice, Workspace $workspace, User $user): PracticeMemberAssignment. Unset all is_primary for this practice+workspace. Set the target assignment's is_primary = true. File: `app/Actions/Practice/SetPrimaryAccountant.php`

- [ ] T029 Action: `MigrateBlanketToGranularAssignment` — handle(): int. Query all practice_workspaces with accepted_at not null. For each, get practice members from practice_users. Create PracticeMemberAssignment for each member×workspace with role from practice_workspaces.workspace_role. Set first owner as primary. Return count of assignments created. File: `app/Actions/Practice/MigrateBlanketToGranularAssignment.php`

- [ ] T030 Command: `MigratePracticeAssignments` — thin command calling MigrateBlanketToGranularAssignment::run(). Register in routes/console.php (one-time, not scheduled). File: `app/Console/Commands/MigratePracticeAssignments.php`

- [ ] T031 Form Request: `AssignMemberRequest` — authorize: user must be practice owner. Rules: user_id required|exists:users,id, role required|in:accountant,bookkeeper,auditor, is_primary nullable|boolean. File: `app/Http/Requests/Practice/AssignMemberRequest.php`

- [ ] T032 [P] Resource: `PracticeMemberAssignmentResource` — returns: id, user (id, name, email), workspace_id, role, is_primary, created_at. File: `app/Http/Resources/PracticeMemberAssignmentResource.php`

- [ ] T033 Controller: `PracticeMemberAssignmentController` — methods: index(Request, int $workspaceId), store(AssignMemberRequest, int $workspaceId), update(Request, PracticeMemberAssignment), destroy(Request, PracticeMemberAssignment). All return PracticeMemberAssignmentResource. File: `app/Http/Controllers/Api/PracticeMemberAssignmentController.php`

### US4 — Workspace Grouping

- [ ] T034 Action: `CreateWorkspaceGroup` — handle(Practice $practice, User $user, string $name, array $workspaceIds = []): WorkspaceGroup. Create group. Attach workspaces (remove from previous groups first). File: `app/Actions/Practice/CreateWorkspaceGroup.php`

- [ ] T035 [P] Action: `UpdateWorkspaceGroup` — handle(WorkspaceGroup $group, array $data): WorkspaceGroup. Update name. File: `app/Actions/Practice/UpdateWorkspaceGroup.php`

- [ ] T036 [P] Action: `DeleteWorkspaceGroup` — handle(WorkspaceGroup $group): void. Delete group (cascade removes memberships, workspaces preserved). File: `app/Actions/Practice/DeleteWorkspaceGroup.php`

- [ ] T037 [P] Action: `AddWorkspaceToGroup` — handle(WorkspaceGroup $group, Workspace $workspace): void. Remove from any existing group first. Attach to new group. File: `app/Actions/Practice/AddWorkspaceToGroup.php`

- [ ] T038 [P] Action: `RemoveWorkspaceFromGroup` — handle(WorkspaceGroup $group, Workspace $workspace): void. Detach workspace from group. File: `app/Actions/Practice/RemoveWorkspaceFromGroup.php`

- [ ] T039 Resource: `WorkspaceGroupResource` — returns: id, name, workspace_count, workspaces (array of {id, name, stats}), created_at. File: `app/Http/Resources/WorkspaceGroupResource.php`

- [ ] T040 Controller: `WorkspaceGroupController` — methods: index, store, update, destroy, addMember, removeMember. File: `app/Http/Controllers/Api/WorkspaceGroupController.php`

### US5 — Practice Tasks

- [ ] T041 Action: `CreatePracticeTask` — handle(Practice $practice, User $createdBy, array $data): PracticeTask. Create task. Log initial status in practice_task_status_log (from_status null, to_status 'to_do'). File: `app/Actions/Practice/CreatePracticeTask.php`

- [ ] T042 [P] Action: `UpdatePracticeTask` — handle(PracticeTask $task, array $data): PracticeTask. Update fields (title, description, assignee_id, workspace_id, due_date). File: `app/Actions/Practice/UpdatePracticeTask.php`

- [ ] T043 [P] Action: `UpdateTaskStatus` — handle(PracticeTask $task, string $newStatus, User $user): PracticeTask. Log in practice_task_status_log. Update task status. Set completed_at if 'done', clear if moving out of 'done'. File: `app/Actions/Practice/UpdateTaskStatus.php`

- [ ] T044 Form Request: `StorePracticeTaskRequest` — authorize: user is practice member. Rules: title required|string|max:255, description nullable|string, workspace_id nullable|integer|exists:workspaces,id, assignee_id nullable|integer|exists:users,id, due_date nullable|date, status in:to_do,in_progress,blocked,done. File: `app/Http/Requests/Practice/StorePracticeTaskRequest.php`

- [ ] T045 [P] Resource: `PracticeTaskResource` — returns: id, title, description, status, due_date, is_overdue (computed), sort_order, workspace (id, name), assignee (id, name), created_by (id, name), template_id, comments_count, completed_at, created_at. File: `app/Http/Resources/PracticeTaskResource.php`

- [ ] T046 Controller: `PracticeTaskController` — methods: index (with filters: workspace_id, assignee_id, status, due_date, view=kanban|list; paginate 25 for list, all for kanban), store, update, updateStatus, destroy, comments, addComment. Scope tasks by user's assigned workspaces (FR-035). File: `app/Http/Controllers/Api/PracticeTaskController.php`

### US6 — Recurring Templates

- [ ] T047 Action: `CreateTaskTemplate` — handle(Practice $practice, array $data): PracticeTaskTemplate. Create template with sub_tasks, recurrence, recurrence_config. Calculate and set next_due_date. File: `app/Actions/Practice/CreateTaskTemplate.php`

- [ ] T048 [P] Action: `GenerateRecurringTasks` — handle(): int. Query PracticeTaskTemplate::due()->with('workspaces', 'practice.memberAssignments'). For each template×workspace: create PracticeTask with sub-task titles, assign to primary accountant or default role. Calculate and update next_due_date. Return count created. File: `app/Actions/Practice/GenerateRecurringTasks.php`

- [ ] T049 Command: `ProcessDuePracticeTemplates` — thin command calling GenerateRecurringTasks::run(). File: `app/Console/Commands/ProcessDuePracticeTemplates.php`

- [ ] T050 Register in `routes/console.php`: `Schedule::command('practice:process-templates')->daily()->at('06:00');`

- [ ] T051 Resource: `PracticeTaskTemplateResource` — returns: id, name, description, sub_tasks, recurrence, recurrence_config, default_assignee_role, next_due_date, workspace_count, archived_at, created_at. File: `app/Http/Resources/PracticeTaskTemplateResource.php`

- [ ] T052 Controller: `PracticeTaskTemplateController` — methods: index (active only), store, update, destroy (archive), restore, linkWorkspaces, generateNow. File: `app/Http/Controllers/Api/PracticeTaskTemplateController.php`

### US7 — Workbooks

- [ ] T053 Action: `CreateWorkbook` — handle(Practice $practice, Workspace $workspace, User $createdBy, string $name, ?int $templateId = null): Workbook. If templateId provided, populate items from template. File: `app/Actions/Practice/CreateWorkbook.php`

- [ ] T054 [P] Action: `UpdateWorkbookItem` — handle(WorkbookItem $item, User $user, array $data): WorkbookItem. Toggle is_completed, set completed_by_user_id and completed_at if completing, clear if uncompleting. File: `app/Actions/Practice/UpdateWorkbookItem.php`

- [ ] T055 Resource: `WorkbookResource` — returns: id, name, workspace_id, progress (int %), items (array of {id, description, sort_order, is_completed, completed_by, completed_at}), created_at. File: `app/Http/Resources/WorkbookResource.php`

- [ ] T056 Controller: `WorkbookController` — methods: index(workspaceId), store(workspaceId), show, destroy, updateItem. File: `app/Http/Controllers/Api/WorkbookController.php`

- [ ] T057 [P] Controller: `WorkbookTemplateController` — methods: index, store, update, destroy. File: `app/Http/Controllers/Api/WorkbookTemplateController.php`

---

## Phase 3: Routes

- [ ] T058 Register all new routes in `routes/api.php` under the existing `practice` prefix group (auth:sanctum). Add: POST practice/members/batch-invite, GET/POST/PATCH/DELETE practice/workspaces/{workspaceId}/assignments and assignments/{id}, GET/POST/PATCH/DELETE practice/groups and groups/{id}/members, GET/POST/PATCH/DELETE practice/tasks and tasks/{id}/status and tasks/{id}/comments, GET/POST/PATCH/DELETE practice/task-templates and templates/{id}/restore and templates/{id}/workspaces and templates/{id}/generate, GET/POST/DELETE practice/workspaces/{workspaceId}/workbooks and workbooks/{id} and workbooks/{id}/items/{itemId}, GET/POST/PATCH/DELETE practice/workbook-templates. Also add workspace-scoped: GET my-tasks, PATCH my-tasks/{id}/complete (with SetWorkspaceContext middleware).

---

## Phase 4: Frontend — US1 Onboarding Wizard [P1]

- [ ] T059 Add TypeScript types to `frontend/src/types/index.ts` — PracticeMemberAssignment {id, user: {id, name, email}, workspace_id, role, is_primary, created_at}, WorkspaceGroupType {id, name, workspace_count, workspaces: Array<{id, name, stats}>, created_at}, PracticeTaskType {id, title, description, status, due_date, is_overdue, sort_order, workspace, assignee, created_by, template_id, comments_count, completed_at, created_at}, PracticeTaskTemplateType {id, name, description, sub_tasks, recurrence, recurrence_config, default_assignee_role, next_due_date, workspace_count, archived_at}, WorkbookType {id, name, workspace_id, progress, items, created_at}, WorkbookItemType {id, description, sort_order, is_completed, completed_by, completed_at}.

- [ ] T060 Extend `frontend/src/hooks/use-practice.ts` — add hooks: useBatchInviteMembers() POST /practice/members/batch-invite, useWorkspaceAssignments(workspaceId) GET, useAssignMember(workspaceId) POST, useUpdateAssignment() PATCH, useRevokeAssignment() DELETE, useWorkspaceGroups() GET /practice/groups, useCreateGroup() POST, useUpdateGroup() PATCH, useDeleteGroup() DELETE, useAddToGroup(groupId) POST, useRemoveFromGroup(groupId) DELETE, usePracticeTasks(filters) GET /practice/tasks, useCreateTask() POST, useUpdateTask() PATCH, useUpdateTaskStatus() PATCH, useDeleteTask() DELETE, useTaskComments(taskId) GET, useAddTaskComment(taskId) POST, useTaskTemplates() GET, useCreateTemplate() POST, useUpdateTemplate() PATCH, useArchiveTemplate() DELETE, useRestoreTemplate() POST, useLinkTemplateWorkspaces() POST, useGenerateFromTemplate() POST, useWorkbooks(workspaceId) GET, useCreateWorkbook() POST, useWorkbook(id) GET, useDeleteWorkbook() DELETE, useUpdateWorkbookItem() PATCH, useWorkbookTemplates() GET, useCreateWorkbookTemplate() POST, useMyTasks() GET /my-tasks (workspace-scoped), useCompleteMyTask() PATCH.

- [ ] T061 Rewrite `frontend/src/app/(practice)/practice/setup/page.tsx` — 4-step wizard. Single React Hook Form instance at parent. Step indicator (numbered circles). Step 1: Firm Details (name*, ABN, email, phone) with Zod schema per step. Step 2: Invite Team — multi-email input (comma-separated or one per line), useBatchInviteMembers mutation, show results (invited vs skipped), Skip button. Step 3: Add First Client — Business Name*, Entity Type* (select), Currency (default AUD), Industry Template (select), OR "Share invite link" toggle showing practice invite URL with copy button, Skip button. Step 4: Success — summary of what was set up, "Go to Dashboard" button. Back/Next navigation. Per-step Zod validation before advancing.

- [ ] T062 Create `frontend/src/app/(practice)/practice/clients/new/page.tsx` — Create Client Workspace form. Fields: Business Name (required), Entity Type (required, select from pty_ltd/trust/sole_trader/partnership/smsf/not_for_profit), Base Currency (default AUD), Fiscal Year Start (default July), Industry Template (select), Owner Email (optional). useCreateClientWorkspace mutation. On success redirect to /practice/clients. Cancel returns to /practice/clients.

---

## Phase 5: Frontend — US3 Assignment + US4 Grouping [P1/P2]

- [ ] T063 Create Team Assignment panel component for workspace detail — `frontend/src/components/practice/team-assignment-panel.tsx`. Props: workspaceId. Shows list of all practice members with toggle (assigned/not), role dropdown (accountant/bookkeeper/auditor), primary accountant radio. Uses useWorkspaceAssignments, useAssignMember, useRevokeAssignment, usePracticeMembers hooks. Renders as a sheet/dialog.

- [ ] T064 Update `frontend/src/app/(practice)/practice/page.tsx` (dashboard) — filter workspace cards by user's assignments (usePracticeDashboard already returns workspaces, but filter client-side or update backend). Show primary accountant name on workspace cards. Show workbook progress if available. Show groups as collapsible card sections with aggregate stats. One-time migration banner (dismiss via localStorage flag).

- [ ] T065 Update `frontend/src/app/(practice)/practice/clients/page.tsx` — add "New Group" button + dialog (name input + workspace multi-select). Show groups in Firm Workspaces tab. Add-to-group action on workspace rows. Remove-from-group action.

---

## Phase 6: Frontend — US5 Task Board + US6 Templates [P2]

- [ ] T066 Rewrite `frontend/src/app/(practice)/practice/jobs/page.tsx` — Replace placeholder with full task board. Kanban view (default): 4 columns (To Do, In Progress, Blocked, Done) with @dnd-kit/core for drag-and-drop. Task cards show: title, workspace name badge, assignee avatar, due date (red if overdue). List view toggle: TanStack Table with server-side pagination (25/page), columns: Title, Client, Assignee, Due Date, Status, Created. Filters bar: workspace dropdown, assignee dropdown, status multi-select, due date range, "My Tasks" toggle. "New Task" button opens dialog: title*, description, workspace (dropdown), assignee (dropdown — practice members + workspace users for selected workspace), due date, status. Task detail slide-over panel on card click: edit all fields, comments section, status change log. Create Zustand store `frontend/src/stores/practice-task-filters.ts` to persist filter selections.

- [ ] T067 Create `frontend/src/app/(practice)/practice/jobs/templates/page.tsx` — Template list page. Table: name, recurrence, linked workspace count, next due date, status (active/archived). "New Template" button → form: name*, description, sub-tasks (dynamic list with add/remove/reorder), recurrence (select: weekly/monthly/quarterly/annually/custom), default assignee role. Template detail: edit fields, link/unlink workspaces, "Generate Now" button, archive/restore.

---

## Phase 7: Frontend — US7 Workbooks + Client Tasks [P3]

- [ ] T068 Create workbook components and integrate — workbook list on workspace detail (within practice view), "New Workbook" dialog (name, template selector), workbook detail page with checklist (toggle items, attach files via existing attachment system, show completed-by and date). Show workbook progress % on dashboard workspace cards. Create `frontend/src/app/(practice)/practice/workbook-templates/page.tsx` for template management. Add "Tasks from your accountant" section to `frontend/src/app/(dashboard)/page.tsx` (workspace dashboard) — query useMyTasks(), render cards with title, description, due date, "Mark Complete" button using useCompleteMyTask().

---

## Phase 8: Tests

- [ ] T069 Feature test file `tests/Feature/Api/PracticeOnboardingTest.php` — tests: it_batch_invites_multiple_members, it_skips_already_existing_members_in_batch, it_validates_email_array_max_20, it_rejects_batch_invite_as_non_owner, it_creates_client_workspace_from_practice_ui.

- [ ] T070 [P] Feature test file `tests/Feature/Api/PracticeAssignmentTest.php` — tests: it_assigns_member_to_workspace_with_role, it_revokes_member_assignment, it_sets_primary_accountant, it_prevents_duplicate_assignment, it_scopes_dashboard_to_assigned_workspaces, it_preserves_existing_access_during_migration.

- [ ] T071 [P] Feature test file `tests/Feature/Api/WorkspaceGroupTest.php` — tests: it_creates_workspace_group, it_adds_workspace_to_group, it_enforces_one_group_per_workspace, it_deletes_group_without_deleting_workspaces, it_returns_aggregate_stats_for_group, it_hides_groups_from_workspace_owners.

- [ ] T072 [P] Feature test file `tests/Feature/Api/PracticeTaskTest.php` — tests: it_creates_practice_task, it_updates_task_status_and_logs_change, it_scopes_tasks_by_workspace_assignment, it_assigns_task_to_workspace_user, it_filters_tasks_by_workspace_and_assignee, it_paginates_task_list_view, it_allows_workspace_user_to_complete_task, it_shows_client_tasks_on_workspace_dashboard.

- [ ] T073 [P] Feature test file `tests/Feature/Api/PracticeTaskTemplateTest.php` — tests: it_creates_task_template_with_recurrence, it_generates_recurring_tasks_from_template, it_archives_template_on_delete, it_restores_archived_template, it_links_workspaces_to_template, it_generates_one_off_from_template.

- [ ] T074 [P] Feature test file `tests/Feature/Api/WorkbookTest.php` — tests: it_creates_workbook_from_template, it_toggles_workbook_item_completion, it_attaches_file_to_workbook_item, it_calculates_workbook_progress_percentage, it_returns_workbook_progress_on_dashboard.

- [ ] T075 Browser test `tests/Browser/PracticeOnboardingTest.php` — it_completes_full_onboarding_wizard (navigate to /practice/setup, fill step 1, skip step 2, skip step 3, verify dashboard).

- [ ] T076 [P] Browser test `tests/Browser/PracticeTaskBoardTest.php` — it_shows_kanban_columns_on_practice_jobs_page, it_creates_task_from_new_task_dialog.

---

## Phase 9: Polish

- [ ] T077 Run `vendor/bin/pint --dirty` on all new PHP files.
- [ ] T078 Run `php artisan test --compact` — verify all tests pass.
