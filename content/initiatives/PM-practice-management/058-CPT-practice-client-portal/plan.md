---
title: "Implementation Plan: Practice Client Portal"
---

# Implementation Plan: Practice Client Portal

**Branch**: `feature/058-CPT-practice-client-portal` | **Date**: 2026-03-20 | **Spec**: [spec.md](/initiatives/FL-financial-ledger/058-CPT-practice-client-portal/spec)

## Summary

Deliver a two-sided practice-client communication layer: a kanban task board and request pipeline for practice staff, plus a task checklist and request form for workspace clients. Builds entirely on the existing 027-PMV practice task infrastructure (PracticeTask, comments, status logs, templates) without rebuilding anything.

## Technical Context

**Language/Version**: PHP 8.4 (Laravel 12), TypeScript (Next.js 16, React 19)
**Primary Dependencies**: Spatie Permission (teams mode), TanStack Query v5, React Hook Form + Zod, Zustand v5
**Storage**: SQLite (local), single-database multi-tenancy with `workspace_id` scoping
**Testing**: Pest v4 (feature + browser via Playwright)
**Target Platform**: Web SPA (Next.js frontend + Laravel API)
**Depends On**: 027-PMV (complete), 015-ACT (complete), 012-ATT (complete), 024-NTF (complete)

---

## Gate 3: Architecture Check

### 1. Technical Feasibility

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | Extends existing PracticeTask model + controller, adds new ClientRequest model |
| Existing patterns leveraged | PASS | Lorisleiva Actions, inline `abort_unless` auth (matches PracticeTaskController), API Resources, TanStack Query hooks |
| No impossible requirements | PASS | All FRs buildable with current stack |
| Performance considered | PASS | Kanban loads all non-done tasks (`per_page: 200`); request pipeline paginates at 25; sidebar badges use single `COUNT(*)` queries |
| Security considered | PASS | Practice membership check for practice-side, `SetWorkspaceContext` middleware for client-side, comment visibility filtering |

### 2. Data & Integration

| Check | Status | Notes |
|-------|--------|-------|
| Data model understood | PASS | 2 new tables (`client_requests`, `client_request_comments`), 2 modified tables (`practice_tasks`, `practice_task_comments`) |
| API contracts clear | PASS | 14 new endpoints + 7 modified endpoints across 1 new controller + 1 modified controller |
| Dependencies identified | PASS | 027-PMV (complete), 012-ATT (complete), 024-NTF (complete) |
| Integration points mapped | PASS | Morph map additions for attachments, `NotificationType` enum extension, `navigation.ts` updates |
| DTO persistence explicit | PASS | Form Request `validated()` passed to Action params, no `toArray()` into `create()` |

### 3. Implementation Approach

| Check | Status | Notes |
|-------|--------|-------|
| File changes identified | PASS | See File Manifest (~55 files) |
| Risk areas noted | PASS | `myTasks` scope change (assignee_id to workspace_id) is highest risk — existing clients may rely on current behaviour |
| Testing approach defined | PASS | Feature tests per phase, unit tests for enums, browser tests for key flows |
| Rollback possible | PASS | All schema changes are additive; new visibility column defaults to `internal` (safe) |

### 4. Laravel Best Practices

| Check | Status | Notes |
|-------|--------|-------|
| Use Lorisleiva Actions | PASS | `CreateClientRequest`, `ConvertRequestToTask`, `UpdateClientRequestStatus`, `BulkUpdateTasks` |
| Form Requests for mutations | PASS | `StoreClientRequestRequest`, `UpdateClientRequestStatusRequest`, `AssignClientRequestRequest`, `BulkUpdateTasksRequest` |
| API Resources for responses | PASS | `ClientRequestResource`, `ClientRequestCommentResource`, updated `PracticeTaskResource` |
| Model route binding | PASS | Controllers use Model instances |
| Sanctum cookie auth | PASS | Practice routes under `auth:sanctum`; workspace routes under `SetWorkspaceContext` |

### 5. Next.js/React Standards

| Check | Status | Notes |
|-------|--------|-------|
| All components TypeScript | PASS | Every `.tsx` file uses strict TypeScript |
| Props typed with interfaces | PASS | Types in `types/client-request.ts` and extended `types/index.ts` |
| No `any` types | PASS | All API response types defined |
| TanStack Query for server state | PASS | Hooks in `use-client-requests.ts`, extended `use-practice.ts` |
| Zustand for client state | PASS | Task board filter/selection state in Zustand store |
| React Hook Form + Zod | PASS | Client request form, task creation form |

### Overall: PASS — No red flags

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Practice Staff Side                          │
│                                                                     │
│  /practice/tasks ──── Kanban Board ──── GET /practice/tasks         │
│  /practice/requests ── Pipeline ─────── GET /practice/requests      │
│                                                                     │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────────┐   │
│  │ PracticeTask │  │  ClientRequest  │  │ ConvertRequestToTask │   │
│  │  (existing)  │──│    (new)        │──│     (new action)     │   │
│  │ + visibility │  │ + comments      │  └──────────────────────┘   │
│  │ + request_id │  │ + status flow   │                              │
│  └──────────────┘  └─────────────────┘                              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │  Shared via        │
                    │  visibility='shared'│
                    │  + workspace_id    │
                    └─────────┬──────────┘
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                      Client (Workspace) Side                        │
│                                                                     │
│  /tasks ───── Checklist ──── GET /my-tasks (visibility=shared)      │
│  /requests ── List ───────── GET /client-requests                   │
│  /requests/new ── Form ───── POST /client-requests                  │
│                                                                     │
│  Guarded by: SetWorkspaceContext middleware                         │
│  Nav visible only when: has_connected_practice = true               │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **No new Spatie permissions** (C-01) — Practice-side endpoints use inline `abort_unless` practice membership checks, matching the existing `PracticeTaskController` pattern. Client-side endpoints rely on `SetWorkspaceContext` middleware for workspace membership.

2. **No feature flag** (C-19) — Natural gate: workspace-side UI only appears when a practice is connected (`has_connected_practice` boolean on workspace API response). Practice-side pages are simply new nav items in the practice shell.

3. **Visibility defaults to `internal`** (C-20) — All existing tasks remain invisible to clients. Practice members opt-in by toggling visibility to `shared`.

4. **`myTasks` scope broadened** (C-13) — Changes from `assignee_id` + `workspace_id` to `workspace_id` + `visibility = 'shared'`. All workspace members see all shared tasks, not just their personally assigned tasks.

5. **Request status transitions follow `InvoiceStatus::canTransitionTo()` pattern** — The `ClientRequestStatus` enum implements `canTransitionTo()` with the same pattern as `InvoiceStatus`.

6. **`ClientRequest` is a Central model** — Like `PracticeTask`, it lives in `app/Models/Central/` because it spans the practice-workspace boundary (not scoped to a single tenant).

---

## Data Model

### New Table: `client_requests`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `practice_id` | FK practices, cascadeOnDelete | |
| `workspace_id` | FK workspaces, cascadeOnDelete | |
| `created_by_user_id` | FK users, nullable, nullOnDelete | |
| `assigned_to_user_id` | FK users, nullable, nullOnDelete | |
| `category` | string | general, tax, payroll, compliance, reporting, other |
| `subject` | string(255) | |
| `description` | text, nullable | |
| `urgency` | string, default `'normal'` | low, normal, high |
| `status` | string, default `'new'` | new, acknowledged, in_progress, resolved, closed |
| `closed_reason` | string, nullable | resolved, cancelled |
| `resolved_at` | timestamp, nullable | |
| `closed_at` | timestamp, nullable | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

Indexes: `[practice_id, status]`, `[workspace_id, status]`, `assigned_to_user_id`

### New Table: `client_request_comments`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `client_request_id` | FK client_requests, cascadeOnDelete | |
| `user_id` | FK users, nullable, nullOnDelete | |
| `body` | text | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### Modified Table: `practice_tasks`

| Column | Change |
|--------|--------|
| `visibility` | ADD string, default `'internal'` |
| `client_request_id` | ADD FK client_requests, nullable, nullOnDelete, unique |

Index: `[practice_id, visibility]`

### Modified Table: `practice_task_comments`

| Column | Change |
|--------|--------|
| `visibility` | ADD string, default `'shared'` |

---

## API Contracts

### New Endpoints — Client Requests (Practice Side)

| Method | Path | Controller Method | Notes |
|--------|------|-------------------|-------|
| GET | `/practice/requests` | `ClientRequestController@index` | Paginated at 25, filterable |
| GET | `/practice/requests/counts` | `ClientRequestController@counts` | `GROUP BY status` for StatusTabs |
| GET | `/practice/requests/pending-count` | `ClientRequestController@pendingCount` | `COUNT(*)` where status=new |
| GET | `/practice/requests/{clientRequest}` | `ClientRequestController@show` | With comments + linked task |
| PATCH | `/practice/requests/{clientRequest}/status` | `ClientRequestController@updateStatus` | Validates transitions via `canTransitionTo()` |
| PATCH | `/practice/requests/{clientRequest}/assign` | `ClientRequestController@assign` | Practice member assignment |
| POST | `/practice/requests/{clientRequest}/convert` | `ClientRequestController@convertToTask` | Creates PracticeTask, links via FK |
| GET | `/practice/requests/{clientRequest}/comments` | `ClientRequestController@comments` | All comments |
| POST | `/practice/requests/{clientRequest}/comments` | `ClientRequestController@addComment` | Practice comment |

### New Endpoints — Client Requests (Workspace Side)

| Method | Path | Controller Method | Notes |
|--------|------|-------------------|-------|
| GET | `/client-requests` | `ClientRequestController@myRequests` | Scoped by workspace_id |
| POST | `/client-requests` | `ClientRequestController@store` | Validates practice connection |
| GET | `/client-requests/{clientRequest}` | `ClientRequestController@showMine` | Ownership verified |
| POST | `/client-requests/{clientRequest}/comments` | `ClientRequestController@addClientComment` | Client follow-up |
| PATCH | `/client-requests/{clientRequest}/cancel` | `ClientRequestController@cancel` | Only if status=new |

### Modified Endpoints — Tasks

| Method | Path | Change |
|--------|------|--------|
| POST | `/practice/tasks` | Accept `visibility` field |
| PATCH | `/practice/tasks/{id}` | Accept `visibility` field |
| GET | `/practice/tasks/counts` | NEW — status counts for kanban StatusTabs |
| PATCH | `/practice/tasks/bulk` | NEW — bulk update (max 50 IDs) |
| GET | `/my-tasks` | Filter by `visibility='shared'` + `workspace_id` (drop `assignee_id` filter) |
| GET | `/my-tasks/count` | NEW — count of incomplete shared tasks |
| PATCH | `/my-tasks/{id}/complete` | Verify `visibility='shared'` + workspace membership (drop `assignee_id` check) |
| GET | `/practice/tasks/{id}/comments` | Filter by visibility when accessed by workspace user |
| POST | `/practice/tasks/{id}/comments` | Accept `visibility` field; force `shared` for workspace users |

---

## Implementation Phases

### Phase 1: Backend Foundation + Task Board UI (Sprint 1)

**~18 tasks, estimated 2-3 days**

#### Backend — Migrations & Enums (6 tasks)

**Task 1.1**: Create migration `2026_03_22_200001_add_client_portal_tables.php`
- `client_requests` table with all columns, indexes, FKs
- `client_request_comments` table
- Add `visibility` (string, default `'internal'`) and `client_request_id` (FK, nullable, unique, nullOnDelete) columns to `practice_tasks`
- Add `visibility` (string, default `'shared'`) column to `practice_task_comments`
- Add index `[practice_id, visibility]` to `practice_tasks`
- Follow existing migration pattern from `2026_03_15_300003_create_practice_tasks_table.php`

**Task 1.2**: Create `app/Enums/Practice/TaskVisibility.php`
- Backed string enum: `Internal = 'internal'`, `Shared = 'shared'`
- Methods: `label()` — "Internal", "Shared"
- First enum in `app/Enums/Practice/` subdirectory

**Task 1.3**: Create `app/Enums/Practice/ClientRequestCategory.php`
- Cases: `General`, `Tax`, `Payroll`, `Compliance`, `Reporting`, `Other`
- Methods: `label()`

**Task 1.4**: Create `app/Enums/Practice/ClientRequestStatus.php`
- Cases: `New`, `Acknowledged`, `InProgress`, `Resolved`, `Closed`
- Methods: `label()`, `canTransitionTo()` — follows `InvoiceStatus` pattern
- Transitions: `New` -> `Acknowledged|InProgress|Closed`; `Acknowledged` -> `InProgress|Closed`; `InProgress` -> `Resolved|Closed`; `Resolved` -> `Closed`; `Closed` -> (terminal)

**Task 1.5**: Create `app/Enums/Practice/ClientRequestUrgency.php`
- Cases: `Low`, `Normal`, `High`
- Methods: `label()`, `color()` — low=grey, normal=blue, high=red

**Task 1.6**: Add 6 new cases to `app/Enums/NotificationType.php`
- `TaskSharedWithClient = 'task_shared_with_client'`
- `ClientTaskCompleted = 'client_task_completed'`
- `ClientRequestSubmitted = 'client_request_submitted'`
- `ClientRequestStatusChanged = 'client_request_status_changed'`
- `TaskCommentAdded = 'task_comment_added'`
- `TaskOverdue = 'task_overdue'`
- Update `label()`, `icon()`, `filterCategory()` match arms

#### Backend — Models (2 tasks)

**Task 1.7**: Create `app/Models/Central/ClientRequest.php`
- Fillable: `practice_id`, `workspace_id`, `created_by_user_id`, `assigned_to_user_id`, `category`, `subject`, `description`, `urgency`, `status`, `closed_reason`, `resolved_at`, `closed_at`
- Casts: `category` -> `ClientRequestCategory`, `status` -> `ClientRequestStatus`, `urgency` -> `ClientRequestUrgency`, `resolved_at` -> `datetime`, `closed_at` -> `datetime`
- Relationships: `practice()`, `workspace()`, `createdBy()`, `assignedTo()`, `comments()`, `linkedTask()` (hasOne PracticeTask via `client_request_id`)
- Scopes: `forPractice($practiceId)`, `forWorkspace($workspaceId)`

**Task 1.8**: Create `app/Models/Central/ClientRequestComment.php`
- Fillable: `client_request_id`, `user_id`, `body`
- Relationships: `clientRequest()`, `user()`

#### Backend — Model Modifications (2 tasks)

**Task 1.9**: Update `app/Models/Central/PracticeTask.php`
- Add `visibility`, `client_request_id` to `$fillable`
- Add cast: `visibility` -> `TaskVisibility`
- Add relationship: `clientRequest()` (belongsTo ClientRequest)
- Add scope: `scopeShared($query)` — `where('visibility', 'shared')`

**Task 1.10**: Update `app/Providers/AppServiceProvider.php`
- Add `'practice_task' => PracticeTask::class` and `'client_request' => ClientRequest::class` to `Relation::morphMap()`

#### Backend — Task Endpoint Modifications (4 tasks)

**Task 1.11**: Update `PracticeTaskController::store()` — accept `visibility` field in validation rules

**Task 1.12**: Update `PracticeTaskController::update()` — accept `visibility` field in validation rules

**Task 1.13**: Add `PracticeTaskController::counts()` method
- `GROUP BY status` scoped to practice, matching `ContactController::counts` pattern
- Include overdue count (separate query: `due_date < today AND status != done`)
- New route: `GET /practice/tasks/counts`

**Task 1.14**: Add `PracticeTaskController::bulkUpdate()` method
- Accept `ids` (array, max 50), `status`, `assignee_id`, `due_date`, `visibility` (all optional)
- Validate all IDs belong to user's practice via count comparison
- Return 422 if count mismatch
- New route: `PATCH /practice/tasks/bulk`

#### Backend — Updated PracticeTaskResource (1 task)

**Task 1.15**: Update `app/Http/Resources/PracticeTaskResource.php`
- Add `visibility` field
- Add `client_request_id` field
- Add `client_request` nested resource (whenLoaded)

#### Backend — myTasks Modifications (2 tasks)

**Task 1.16**: Update `PracticeTaskController::myTasks()` method
- Change scope from `assignee_id = user` to `workspace_id = request workspace_id`
- Add filter: `visibility = 'shared'`
- Support `?include_done=1` query param (default excludes done)

**Task 1.17**: Update `PracticeTaskController::completeMyTask()` method
- Change authorization from `assignee_id === user->id` to workspace membership + `visibility = 'shared'`
- Verify user belongs to task's workspace via `Workspace::find($task->workspace_id)->users()->where('users.id', $user->id)->exists()`
- Add `PracticeTaskController::myTasksCount()` — `COUNT(*)` where `workspace_id` + `visibility='shared'` + `status != 'done'`
- New route: `GET /my-tasks/count`

#### Frontend — Practice Task Board (1 task)

**Task 1.18**: Create practice task board page + components
- `frontend/src/app/(practice)/practice/tasks/page.tsx` — page wrapper
- `frontend/src/components/practice/task-board.tsx` — kanban board with 4 columns (To Do, In Progress, Blocked, Done), drag-and-drop via `@dnd-kit/core`
- `frontend/src/components/practice/task-card.tsx` — card with title, workspace, assignee avatar, due date, overdue badge, comment count, visibility icon
- `frontend/src/components/practice/task-detail-panel.tsx` — slide-over with full detail, visibility toggle, comments tab, status history tab
- `frontend/src/components/practice/task-filter-bar.tsx` — workspace select, assignee select, due date range, template select
- StatusTabs above board: All | To Do | In Progress | Blocked | Done | Overdue
- ViewToggle for list/kanban views
- "New Task" button with `N` keyboard shortcut and creation form dialog
- Uses existing kanban drag-and-drop patterns from invoice/bill pages
- Update `use-practice.ts`: add `usePracticeTaskCounts()` hook, add `useBulkUpdateTasks()` hook
- Update practice-shell.tsx: add "Tasks" nav item between "Jobs" and "Tax"

---

### Phase 2: Client Request System (Sprint 2)

**~16 tasks, estimated 2-3 days**

#### Backend — ClientRequest Actions (3 tasks)

**Task 2.1**: Create `app/Actions/Practice/CreateClientRequest.php`
- Accepts workspace, practice, user, validated data
- Creates `ClientRequest` with status `new`
- Follows `CreatePracticeTask` pattern (action creates record, controller calls action)

**Task 2.2**: Create `app/Actions/Practice/UpdateClientRequestStatus.php`
- Accepts `ClientRequest`, new status string, user
- Validates transition via `ClientRequestStatus::canTransitionTo()`
- Sets `resolved_at` when transitioning to `resolved`
- Sets `closed_at` and `closed_reason` when transitioning to `closed`
- Returns updated request

**Task 2.3**: Create `app/Actions/Practice/ConvertRequestToTask.php`
- Accepts `ClientRequest`, user, optional assignee_id, optional due_date
- Checks request doesn't already have a linked task (return 409)
- Creates `PracticeTask` via `CreatePracticeTask` action with `visibility = 'shared'`, `client_request_id` set
- Updates request status to `in_progress` via `UpdateClientRequestStatus`
- Returns created task

#### Backend — Form Requests (3 tasks)

**Task 2.4**: Create `app/Http/Requests/Practice/StoreClientRequestRequest.php`
- Validates: `category` (required, in enum values), `subject` (required, string, max 255), `description` (nullable, string), `urgency` (in enum values, default normal), `attachment_ids` (nullable, array)
- `authorize()`: returns true (workspace membership handled by `SetWorkspaceContext` middleware)
- `after()` hook: validate workspace has connected practice (`practice_workspaces` with non-null `accepted_at`), return 422 if not

**Task 2.5**: Create `app/Http/Requests/Practice/UpdateClientRequestStatusRequest.php`
- Validates: `status` (required, in enum values)
- `authorize()`: resolves `ClientRequest`, verifies practice membership, stashes on `$this->attributes`
- `after()` hook: validates `canTransitionTo()` on current status

**Task 2.6**: Create `app/Http/Requests/Practice/AssignClientRequestRequest.php`
- Validates: `assigned_to_user_id` (required, integer)
- `authorize()`: verifies practice membership
- `after()` hook: validates assignee is a practice member

#### Backend — Controller + Resources (4 tasks)

**Task 2.7**: Create `app/Http/Controllers/Api/ClientRequestController.php`
- Practice-side methods: `index`, `counts`, `pendingCount`, `show`, `updateStatus`, `assign`, `convertToTask`, `comments`, `addComment`
- Workspace-side methods: `myRequests`, `store`, `showMine`, `addClientComment`, `cancel`
- Practice methods: resolve practice via `$request->user()->practices()->first()` + `abort_unless`, matching `PracticeTaskController` pattern
- Workspace methods: use `workspace_id` from request (set by `SetWorkspaceContext` middleware)
- `index`: paginate at 25, filter by status/workspace/category/urgency/assignee, eager load workspace + createdBy + assignedTo
- `counts`: `GROUP BY status` scoped to practice
- `pendingCount`: `COUNT(*)` where `status = 'new'`
- `convertToTask`: delegates to `ConvertRequestToTask` action, returns 409 if already converted
- `cancel`: only if status = `new`, sets status to `closed` with reason `cancelled`

**Task 2.8**: Create `app/Http/Resources/ClientRequestResource.php`
- Fields: id, practice_id, workspace (whenLoaded), created_by (whenLoaded), assigned_to (whenLoaded), category (value + label), subject, description, urgency (value + label + color), status (value + label), closed_reason, resolved_at, closed_at, linked_task (whenLoaded), comments_count (whenCounted), created_at, updated_at
- Follows `PracticeTaskResource` pattern

**Task 2.9**: Create `app/Http/Resources/ClientRequestCommentResource.php`
- Fields: id, user (whenLoaded), body, created_at

**Task 2.10**: Register routes in `routes/api.php`
- Practice-side routes inside existing `Route::middleware(['auth:sanctum'])->prefix('practice')` group
- Workspace-side routes inside existing `SetWorkspaceContext` middleware group (alongside `my-tasks`)

#### Frontend — Client Request Pages (6 tasks)

**Task 2.11**: Create `frontend/src/types/client-request.ts`
- Types: `ClientRequestCategory`, `ClientRequestUrgency`, `ClientRequestStatus`, `ClientRequest`, `ClientRequestComment`

**Task 2.12**: Create `frontend/src/hooks/use-client-requests.ts`
- Query key factory: `clientRequestKeys`
- Practice hooks: `usePracticeRequests(filters)`, `usePracticeRequestCounts()`, `usePracticeRequestPendingCount()`, `usePracticeRequest(id)`, `useUpdateRequestStatus()`, `useAssignRequest()`, `useConvertRequestToTask()`, `usePracticeRequestComments(id)`, `useAddPracticeRequestComment(id)`
- Client hooks: `useMyRequests(workspaceId)`, `useSubmitRequest()`, `useMyRequest(id)`, `useAddClientRequestComment(id)`, `useCancelRequest()`

**Task 2.13**: Create practice request pipeline page + components
- `frontend/src/app/(practice)/practice/requests/page.tsx` — page wrapper
- `frontend/src/components/practice/request-pipeline.tsx` — table with StatusTabs (All | New | Acknowledged | In Progress | Resolved), filters, pagination
- `frontend/src/components/practice/request-detail-panel.tsx` — slide-over with description, urgency badge, status timeline, comment thread, "Acknowledge"/"Resolve"/"Convert to Task" action buttons
- Urgency badges: low=grey, normal=blue, high=red
- Update `practice-shell.tsx`: add "Requests" nav item with pending count badge

**Task 2.14**: Create client request list page
- `frontend/src/app/(dashboard)/requests/page.tsx` — list of submitted requests with status badges
- "New Request" button top-right
- Click row opens detail slide-over (subject, description, status timeline, comment thread)
- Empty state: "Need help from your accountant? Raise a request."
- Disabled state: if no connected practice, show banner linking to `/settings/integrations`

**Task 2.15**: Create client request form page
- `frontend/src/app/(dashboard)/requests/new/page.tsx`
- `frontend/src/components/tasks/client-request-form.tsx` — React Hook Form + Zod
- Fields: category (select), subject (input), description (textarea), urgency (select, default normal), attachments (dropzone using existing attachment upload component)
- Submit disabled while submitting
- Redirect to `/requests` with success toast on submit

**Task 2.16**: Add `useMyTasksCount()` hook to `use-practice.ts`
- Calls `GET /my-tasks/count`
- Used for sidebar badge

---

### Phase 3: Client Task View + Comments (Sprint 3)

**~12 tasks, estimated 2 days**

#### Backend — Comment Visibility (3 tasks)

**Task 3.1**: Update `PracticeTaskController::comments()` method
- Accept `visibility` filter param
- When request comes from a workspace user (not practice member), auto-filter to `visibility = 'shared'`
- Detect client access: check if requesting user belongs to the task's workspace AND task has `visibility = 'shared'`

**Task 3.2**: Update `PracticeTaskController::addComment()` method
- Accept `visibility` field from practice members (default `shared`)
- Force `visibility = 'shared'` for workspace users
- Create comment with visibility column

**Task 3.3**: Create client-side task comment/attachment endpoints
- New route: `POST /my-tasks/{practiceTask}/comments` — client adds comment (forced `visibility = 'shared'`)
- New route: `GET /my-tasks/{practiceTask}/comments` — client gets shared comments only
- Verify task `visibility = 'shared'` and user belongs to task's workspace

#### Frontend — Client Task Checklist (5 tasks)

**Task 3.4**: Create client task checklist page
- `frontend/src/app/(dashboard)/tasks/page.tsx`
- `frontend/src/components/tasks/client-task-list.tsx` — checklist layout
- Each row: checkbox, task title, due date, overdue badge, status
- Click row opens slide-over: description, shared comments, attachments, "Mark Complete" button
- "Show completed" toggle (default off, adds `?include_done=1`)
- Completed tasks: checked checkbox, strikethrough title, muted text
- Empty state: "No tasks from your accountant. All caught up!"

**Task 3.5**: Create task detail panel for client view
- `frontend/src/components/tasks/client-task-detail-panel.tsx` — slide-over
- Description, shared comments thread, attachment list/upload, "Mark Complete" button
- Comment input for adding client comments
- Attachment upload via existing polymorphic attachment components

**Task 3.6**: Update `use-practice.ts` hooks for client task comments
- `useMyTaskComments(taskId)` — `GET /my-tasks/{id}/comments`
- `useAddMyTaskComment(taskId)` — `POST /my-tasks/{id}/comments`
- Update `useMyTasks()` to accept `include_done` param

**Task 3.7**: Update sidebar navigation — workspace side
- Add "Tasks" and "Requests" nav items to `navigation.ts` `primaryNav` array
- Condition on `has_connected_practice` (new boolean from workspace API)
- Add `k: "/tasks"` to `chordShortcuts` in `navigation.ts`
- "Tasks" shows pending count badge via `useMyTasksCount()` hook
- Items placed in a "Practice" section group, only visible with connected practice

**Task 3.8**: Update workspace API response
- Add `has_connected_practice` boolean to workspace response
- Derived from `$workspace->practices()->whereNotNull('accepted_at')->exists()` (via `practice_workspaces` table)
- Update `WorkspaceResource` or `WorkspaceDetailResource` to include this field

#### Frontend — Practice Shell Updates (4 tasks)

**Task 3.9**: Update practice-shell.tsx nav with count badges
- "Tasks" nav item with count of non-done tasks
- "Requests" nav item with count of `new` requests (pulsing badge when > 0)
- Import count hooks from `use-practice.ts` and `use-client-requests.ts`

**Task 3.10**: Add task comment visibility controls to practice task detail panel
- Toggle on each comment: "Internal" / "Shared" indicator
- When posting new comment, "Post as internal" checkbox (default unchecked = shared)
- Internal comments show lock icon, shared comments show eye icon

**Task 3.11**: Add visibility toggle to task card and detail panel
- Eye icon (shared) / Lock icon (internal) on task card
- Toggle switch in task detail panel
- Calls `PATCH /practice/tasks/{id}` with `visibility` field

**Task 3.12**: Add bulk action toolbar for task board
- Multi-select via checkboxes on task cards
- Toolbar appears when selections > 0: Assign, Set Due Date, Change Status, Toggle Visibility
- Calls `PATCH /practice/tasks/bulk`
- Max 50 selections

---

### Phase 4: Notifications + Polish (Sprint 4)

**~12 tasks, estimated 2 days**

#### Backend — Notifications (6 tasks)

**Task 4.1**: Create `app/Listeners/Notifications/NotifyOnTaskShared.php`
- Triggered when task visibility changes to `shared`
- Notifies workspace owners/accountants of the task's workspace
- Uses `NotificationType::TaskSharedWithClient`
- Called from `PracticeTaskController::update()` when visibility changes

**Task 4.2**: Create `app/Listeners/Notifications/NotifyOnClientTaskCompleted.php`
- Triggered when client marks task complete via `completeMyTask`
- Notifies practice assignee (or task creator if no assignee)
- Uses `NotificationType::ClientTaskCompleted`

**Task 4.3**: Create `app/Listeners/Notifications/NotifyOnClientRequestSubmitted.php`
- Triggered when client submits a request
- Notifies practice members assigned to the workspace (via `PracticeMemberAssignment`)
- Falls back to all practice owners if no assignments
- Uses `NotificationType::ClientRequestSubmitted`

**Task 4.4**: Create `app/Listeners/Notifications/NotifyOnClientRequestStatusChanged.php`
- Triggered when practice changes request status
- Notifies the client who raised it (`created_by_user_id`)
- Uses `NotificationType::ClientRequestStatusChanged`

**Task 4.5**: Create `app/Listeners/Notifications/NotifyOnTaskCommentAdded.php`
- Practice comment on shared task -> notify workspace owners
- Client comment on shared task -> notify practice assignee
- Uses `NotificationType::TaskCommentAdded`
- Dedup: do not notify the commenter

**Task 4.6**: Create `app/Console/Commands/SendOverdueTaskNotifications.php`
- Query: `practice_tasks` where `due_date < today` AND `status != 'done'` AND `visibility = 'shared'` (or all tasks? spec says practice assignee)
- Dedup: check existing unread notification for same task (same `subject_type` + `subject_id` + `type`)
- Notify practice assignee (or creator if no assignee)
- Register in `routes/console.php`: `Schedule::command('tasks:notify-overdue')->dailyAt('07:00')`
- Uses `NotificationType::TaskOverdue`

#### Frontend — Polish (6 tasks)

**Task 4.7**: Loading states for all new pages
- Task board: skeleton cards (3 per column)
- Request pipeline: skeleton table rows
- Client task list: skeleton list (5 rows)
- Client request list: skeleton list rows

**Task 4.8**: Error states for all new pages
- Task board: inline error banner with retry button
- Request pipeline: full-page error with retry
- Client pages: inline error with retry

**Task 4.9**: Keyboard shortcuts
- Practice task board: `N` to create new task
- Client task list: `J`/`K` for navigation, `Enter` to open detail, `Escape` to close
- Add `G then K` chord shortcut for Tasks in workspace sidebar

**Task 4.10**: Empty states
- Practice task board: "No tasks yet. Create your first task."
- Practice requests: "No requests from clients yet."
- Client tasks: "No tasks from your accountant. All caught up!"
- Client requests: "Need help from your accountant? Raise a request."

**Task 4.11**: Integration with existing attachment system
- Add `practice_task` and `client_request` to polymorphic attachment routes
- Reuse existing attachment upload/list components from 012-ATT
- Attachment routes: `POST /{parentType}/{parentId}/attachments`, `GET /{parentType}/{parentId}/attachments`, `DELETE /attachments/{attachment}`

**Task 4.12**: Wire up notification triggers in controllers
- Call notification listeners/actions from controller methods (not event-based, matching existing pattern where listeners are called directly from actions/controllers)
- Task shared: call from `update()` when visibility changes to `shared`
- Task completed: call from `completeMyTask()`
- Request submitted: call from `store()`
- Request status changed: call from `updateStatus()`
- Comment added: call from `addComment()` / `addClientComment()`

---

## File Manifest

### Migrations (1 file)

| File | Action |
|------|--------|
| `database/migrations/2026_03_22_200001_add_client_portal_tables.php` | CREATE |

### Models (2 new, 1 modified)

| File | Action |
|------|--------|
| `app/Models/Central/ClientRequest.php` | CREATE |
| `app/Models/Central/ClientRequestComment.php` | CREATE |
| `app/Models/Central/PracticeTask.php` | MODIFY — add `visibility`, `client_request_id` to fillable, add cast, add relationships, add scope |

### Enums (4 new, 1 modified)

| File | Action |
|------|--------|
| `app/Enums/Practice/TaskVisibility.php` | CREATE |
| `app/Enums/Practice/ClientRequestCategory.php` | CREATE |
| `app/Enums/Practice/ClientRequestStatus.php` | CREATE |
| `app/Enums/Practice/ClientRequestUrgency.php` | CREATE |
| `app/Enums/NotificationType.php` | MODIFY — add 6 cases + update match arms |

### Actions (3 new)

| File | Action |
|------|--------|
| `app/Actions/Practice/CreateClientRequest.php` | CREATE |
| `app/Actions/Practice/UpdateClientRequestStatus.php` | CREATE |
| `app/Actions/Practice/ConvertRequestToTask.php` | CREATE |

### Controllers (1 new, 1 modified)

| File | Action |
|------|--------|
| `app/Http/Controllers/Api/ClientRequestController.php` | CREATE |
| `app/Http/Controllers/Api/PracticeTaskController.php` | MODIFY — add `counts()`, `bulkUpdate()`, `myTasksCount()`; update `myTasks()`, `completeMyTask()`, `comments()`, `addComment()`, `store()`, `update()` |

### Form Requests (3 new)

| File | Action |
|------|--------|
| `app/Http/Requests/Practice/StoreClientRequestRequest.php` | CREATE |
| `app/Http/Requests/Practice/UpdateClientRequestStatusRequest.php` | CREATE |
| `app/Http/Requests/Practice/AssignClientRequestRequest.php` | CREATE |

### Resources (2 new, 1 modified)

| File | Action |
|------|--------|
| `app/Http/Resources/ClientRequestResource.php` | CREATE |
| `app/Http/Resources/ClientRequestCommentResource.php` | CREATE |
| `app/Http/Resources/PracticeTaskResource.php` | MODIFY — add `visibility`, `client_request_id`, `client_request` fields |

### Notification Listeners (5 new)

| File | Action |
|------|--------|
| `app/Listeners/Notifications/NotifyOnTaskShared.php` | CREATE |
| `app/Listeners/Notifications/NotifyOnClientTaskCompleted.php` | CREATE |
| `app/Listeners/Notifications/NotifyOnClientRequestSubmitted.php` | CREATE |
| `app/Listeners/Notifications/NotifyOnClientRequestStatusChanged.php` | CREATE |
| `app/Listeners/Notifications/NotifyOnTaskCommentAdded.php` | CREATE |

### Console Commands (1 new)

| File | Action |
|------|--------|
| `app/Console/Commands/SendOverdueTaskNotifications.php` | CREATE |

### Routes (2 modified)

| File | Action |
|------|--------|
| `routes/api.php` | MODIFY — add practice request routes + workspace client-request routes + new task routes |
| `routes/console.php` | MODIFY — add `tasks:notify-overdue` schedule |

### Providers (1 modified)

| File | Action |
|------|--------|
| `app/Providers/AppServiceProvider.php` | MODIFY — add `practice_task` and `client_request` to morph map |

### Workspace API (1 modified)

| File | Action |
|------|--------|
| `app/Http/Resources/WorkspaceDetailResource.php` (or `WorkspaceResource.php`) | MODIFY — add `has_connected_practice` boolean |

### Frontend Pages (5 new)

| File | Action |
|------|--------|
| `frontend/src/app/(practice)/practice/tasks/page.tsx` | CREATE |
| `frontend/src/app/(practice)/practice/requests/page.tsx` | CREATE |
| `frontend/src/app/(dashboard)/tasks/page.tsx` | CREATE |
| `frontend/src/app/(dashboard)/requests/page.tsx` | CREATE |
| `frontend/src/app/(dashboard)/requests/new/page.tsx` | CREATE |

### Frontend Components (10 new, 1 modified)

| File | Action |
|------|--------|
| `frontend/src/components/practice/task-board.tsx` | CREATE |
| `frontend/src/components/practice/task-card.tsx` | CREATE |
| `frontend/src/components/practice/task-detail-panel.tsx` | CREATE |
| `frontend/src/components/practice/task-filter-bar.tsx` | CREATE |
| `frontend/src/components/practice/request-pipeline.tsx` | CREATE |
| `frontend/src/components/practice/request-detail-panel.tsx` | CREATE |
| `frontend/src/components/tasks/client-task-list.tsx` | CREATE |
| `frontend/src/components/tasks/client-task-detail-panel.tsx` | CREATE |
| `frontend/src/components/tasks/client-request-form.tsx` | CREATE |
| `frontend/src/components/tasks/client-request-list.tsx` | CREATE |
| `frontend/src/components/practice/practice-shell.tsx` | MODIFY — add Tasks + Requests nav items with badges |

### Frontend Hooks (1 new, 1 modified)

| File | Action |
|------|--------|
| `frontend/src/hooks/use-client-requests.ts` | CREATE |
| `frontend/src/hooks/use-practice.ts` | MODIFY — add `usePracticeTaskCounts()`, `useBulkUpdateTasks()`, `useMyTasksCount()`, `useMyTaskComments()`, `useAddMyTaskComment()`, update `useMyTasks()` |

### Frontend Types (1 new, 1 modified)

| File | Action |
|------|--------|
| `frontend/src/types/client-request.ts` | CREATE |
| `frontend/src/types/index.ts` | MODIFY — add `visibility` to `PracticeTask` interface, add `has_connected_practice` to workspace type |

### Frontend Navigation (1 modified)

| File | Action |
|------|--------|
| `frontend/src/lib/navigation.ts` | MODIFY — add `k: "/tasks"` to chordShortcuts, add Tasks/Requests to primaryNav (conditionally) |

### Tests (3 new files)

| File | Action |
|------|--------|
| `tests/Feature/Api/ClientRequestTest.php` | CREATE |
| `tests/Unit/Enums/ClientRequestStatusTest.php` | CREATE |
| `tests/Browser/PracticeClientPortalTest.php` | CREATE |

---

## Risk Register

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| `myTasks` scope change breaks existing clients | High | Medium | The current `myTasks` endpoint filters by `assignee_id`. Changing to `workspace_id` + `visibility='shared'` will return different results. Since no frontend currently consumes `myTasks` in production (only the hook exists), risk is low. Add `visibility='shared'` filter first (returns nothing since default is `internal`), then broaden scope. |
| PracticeTask comments without visibility column | Medium | Low | Existing comments have no `visibility` column. Migration adds it with default `'shared'`. All existing comments become visible to clients if a task is set to `shared`. This is acceptable since no tasks are currently `shared`. |
| Morph map additions break existing attachments | Low | Low | Adding `practice_task` and `client_request` to morph map is additive — existing morph types are unchanged. |
| Kanban drag-and-drop performance with 200+ tasks | Medium | Low | Existing invoice/bill kanban handles similar volumes. Use `@dnd-kit/core` with virtualized containers if needed. |
| Practice-workspace disconnection leaves stale requests | Low | Low | Requests survive disconnection by design (C-03). Status transitions blocked if connection no longer exists. |

### Dependencies

| Dependency | Status | Risk |
|------------|--------|------|
| 027-PMV (Practice Management v2) | Complete | None — all required models/controllers/actions exist |
| 012-ATT (File Attachments) | Complete | None — polymorphic attachment system ready |
| 024-NTF (Notifications) | Complete | None — `CreateNotification` action and `NotificationType` enum exist |
| 015-ACT (Accountant Practice) | Complete | None — practice model and advisor connections exist |

---

## Testing Strategy

### Feature Tests (~18 tests) — `tests/Feature/Api/ClientRequestTest.php`

**Client Request CRUD:**
- `it creates a client request with valid data`
- `it rejects request when workspace has no connected practice` (422)
- `it lists requests scoped to workspace`
- `it allows client to cancel a new request`
- `it prevents client from cancelling non-new request`

**Request Status Transitions:**
- `it transitions request new to acknowledged`
- `it transitions request new to in_progress` (skip acknowledged)
- `it prevents invalid status transitions`
- `it assigns practice member to request`
- `it rejects non-practice-member assignment`

**Request-to-Task Conversion:**
- `it converts request to task with shared visibility`
- `it prevents duplicate conversion` (409)
- `it sets request status to in_progress after conversion`

**Task Visibility & Client Access:**
- `it excludes internal tasks from my-tasks endpoint`
- `it includes shared tasks in my-tasks endpoint`
- `it allows any workspace member to complete shared task`
- `it filters internal comments from client view`
- `it forces client comments to shared visibility`

**Authorization:**
- `it prevents cross-practice request access`

### Unit Tests (~5 tests) — `tests/Unit/Enums/ClientRequestStatusTest.php`

- `it allows valid transitions from new`
- `it allows valid transitions from acknowledged`
- `it allows valid transitions from in_progress`
- `it prevents transitions from closed` (terminal)
- `it returns correct labels for all statuses`

### Browser Tests (~8 tests) — `tests/Browser/PracticeClientPortalTest.php`

- `it renders practice task board with kanban columns`
- `it creates a new task from the task board`
- `it toggles task visibility to shared`
- `it renders client task checklist with shared tasks`
- `it completes a task from client checklist`
- `it submits a client request via form`
- `it renders practice request pipeline with status tabs`
- `it converts a request to a task`

### Test Setup Pattern

```php
// Follow PracticeTaskTest setup — seed permissions, create practice + workspace + users
beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->practiceUser = User::factory()->create();
    $this->practice = Practice::create(['name' => 'Test Practice', 'organisation_id' => $org->id]);
    $this->practice->users()->attach($this->practiceUser->id);
    // ... workspace setup with connected practice ...
});
```
