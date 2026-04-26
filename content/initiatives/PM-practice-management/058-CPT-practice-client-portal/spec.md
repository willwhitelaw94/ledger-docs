---
title: "Feature Specification: Practice Client Portal"
---

# Feature Specification: Practice Client Portal

**Feature Branch**: `058-CPT-practice-client-portal`
**Created**: 2026-03-20
**Status**: Draft
**Epic**: 058-CPT
**Initiative**: FL — Financial Ledger Platform
**Effort**: L (3-4 sprints)
**Depends On**: 027-PMV (complete), 015-ACT (complete), 012-ATT (complete)

### Out of Scope

- **Full helpdesk / ticketing system** — client requests are lightweight intake, not Zendesk
- **SLA tracking or escalation rules** — v1 is manual triage only
- **Client-to-client messaging** — requests go to the practice, not between clients
- **Practice task templates UI** — templates CRUD already exists via API; frontend for templates is a separate polish task
- **Email-based request creation** — v1 requires in-app form; email-to-ticket deferred
- **Mobile app** — responsive web only
- **Bulk task assignment to clients** — v1 assigns one workspace per task

---

## Overview

Practice task infrastructure exists in the backend (PracticeTask, templates, comments, status logs) but has zero frontend UI. Clients cannot see tasks or raise requests to their practice. This epic delivers:

1. **Practice Task Board** — kanban UI at `/practice/tasks` for practice staff
2. **Client Task Checklist** — simple list at `/tasks` in the workspace dashboard for clients
3. **Task Visibility Controls** — `internal` vs `shared` toggle on tasks
4. **Client Request Tickets** — new `ClientRequest` model for structured client-to-practice intake
5. **Practice Request Pipeline** — inbox at `/practice/requests` for triaging client requests
6. **Request-to-Task Conversion** — one-click conversion from client request to practice task
7. **Shared Comments & Attachments** — visibility-filtered comments on shared tasks
8. **Notifications** — in-app notifications for task assignments, request updates, completions

---

## User Stories

### Practice Manager / Staff

**US-01**: As a practice member, I want a kanban board of all my practice tasks so I can see workload at a glance.

**US-02**: As a practice member, I want to filter the task board by workspace, assignee, due date, and template so I can focus on specific client work.

**US-03**: As a practice member, I want to drag tasks between columns (To Do, In Progress, Blocked, Done) to update status.

**US-04**: As a practice member, I want to toggle a task's visibility to `shared` so the client can see it on their dashboard.

**US-05**: As a practice member, I want to see incoming client requests in a pipeline view so I can triage them.

**US-06**: As a practice member, I want to convert a client request into a practice task with one click so I don't have to re-enter details.

**US-07**: As a practice member, I want to respond to a client request (visible comment) so the client knows I'm working on it.

**US-08**: As a practice member, I want to add internal comments on tasks that clients cannot see.

### Client User (Workspace Member)

**US-09**: As a client, I want to see tasks assigned to me by my practice in a simple checklist so I know what's expected of me.

**US-10**: As a client, I want to mark a task as complete so my practice knows I've done my part.

**US-11**: As a client, I want to raise a request to my practice via a structured form so I don't have to email or phone.

**US-12**: As a client, I want to track the status of my requests so I know when something is being worked on.

**US-13**: As a client, I want to add comments and attachments to shared tasks so I can provide information my practice needs.

---

## Functional Requirements

### FR1: Practice Task Board

The kanban board at `/practice/tasks` consumes the existing `GET /api/v1/practice/tasks` endpoint.

- **FR1.1**: Four columns: To Do, In Progress, Blocked, Done
- **FR1.2**: Drag-and-drop between columns calls `PATCH /practice/tasks/{id}/status`
- **FR1.3**: Filter bar: workspace (dropdown), assignee (dropdown), due date range, template (dropdown)
- **FR1.4**: Task card shows: title, workspace name, assignee avatar, due date, overdue badge, comment count, visibility icon (eye = shared, lock = internal)
- **FR1.5**: Click card opens slide-over with full detail: description, comments, status history, attachments
- **FR1.6**: "New Task" button opens creation form (title, description, workspace, assignee, due date, visibility)
- **FR1.7**: Bulk actions via multi-select: assign, set due date, change status, toggle visibility. Bulk endpoint accepts up to 50 task IDs per request. All tasks must belong to the same practice (validated server-side).
- **FR1.8**: StatusTabs above board: All, To Do, In Progress, Blocked, Done, Overdue — with counts
- **FR1.9**: List view toggle (table) using existing `?view=list` query param. List view paginates at 25 per page. Kanban view loads all non-done tasks (`per_page: 200`) to allow drag-and-drop.
- **FR1.10**: Column counts shown in column headers

### FR2: Client Task Checklist

Simple checklist at `/tasks` in the workspace dashboard for workspace members.

- **FR2.1**: Shows only tasks where `visibility = 'shared'` AND `workspace_id` matches the current workspace
- **FR2.2**: List view — checkbox, title, due date, status badge, overdue indicator
- **FR2.3**: Client can mark task as complete (checkbox calls existing `PATCH /my-tasks/{id}/complete`). The `completeMyTask` endpoint must also verify `visibility = 'shared'` before allowing completion. Any workspace member (not just the assignee) can complete shared tasks for their workspace.
- **FR2.4**: Click task opens detail panel: description, comments (shared only), attachments
- **FR2.5**: Client can add comments to shared tasks. All client comments default to `visibility = 'shared'` (clients cannot post internal comments).
- **FR2.6**: Client can upload attachments to shared tasks
- **FR2.7**: Sidebar badge shows count of incomplete shared tasks for the workspace. Uses a lightweight `GET /my-tasks/count` endpoint (single `COUNT(*)` query).
- **FR2.8**: Empty state: "No tasks from your accountant. All caught up!"

### FR3: Task Visibility Controls

- **FR3.1**: Add `visibility` column to `practice_tasks` table: `enum('internal', 'shared')`, default `'internal'`
- **FR3.2**: Practice members can toggle visibility via the task detail or bulk action
- **FR3.3**: `GET /my-tasks` endpoint MUST filter to `visibility = 'shared'` only (already scoped to assignee + workspace). Note: the current `myTasks` method scopes by `assignee_id`. For the client portal, this should be relaxed to show all shared tasks for the workspace (not just those assigned to the current user), since workspace members need to see all tasks their practice has shared. Update query to filter by `workspace_id` + `visibility = 'shared'` instead of `assignee_id` + `workspace_id`.
- **FR3.4**: `GET /practice/tasks/{id}/comments` — when accessed by a client, filter out comments where `visibility = 'internal'`. Client access determined by checking if the requesting user belongs to the task's workspace and the task has `visibility = 'shared'`.
- **FR3.5**: Add `visibility` column to `practice_task_comments` table: `enum('internal', 'shared')`, default `'shared'`
- **FR3.6**: Practice members can mark individual comments as internal when posting
- **FR3.7**: Changing task visibility from `shared` to `internal` removes it from client view immediately. No notification sent for this change — the task simply disappears from the client checklist.

### FR4: Client Request Tickets

New `ClientRequest` model for structured client-to-practice intake.

- **FR4.1**: Client submits request via form at `/requests/new` in workspace dashboard
- **FR4.2**: Form fields: category (select), subject (text), description (textarea), urgency (select), attachments (file upload)
- **FR4.3**: Categories: `general`, `tax`, `payroll`, `compliance`, `reporting`, `other`
- **FR4.4**: Urgency levels: `low`, `normal` (default), `high`
- **FR4.5**: Request status pipeline: `new` → `acknowledged` → `in_progress` → `resolved` → `closed`. Valid transitions enforced via `canTransitionTo()` method on `ClientRequestStatus` enum (same pattern as `InvoiceStatus`). Allowed transitions: `new` → `acknowledged` | `closed`; `acknowledged` → `in_progress` | `closed`; `in_progress` → `resolved` | `closed`; `resolved` → `closed`; `closed` → (terminal). Client can only trigger `new` → `closed` (cancel). All other transitions require practice membership.
- **FR4.6**: Client can view their requests at `/requests` with status badges
- **FR4.7**: Client can add follow-up comments to their own requests
- **FR4.8**: Client can cancel a request if status is `new` (sets status to `closed` with reason `cancelled`)
- **FR4.9**: A workspace must have an accepted practice connection (`practice_workspaces` with non-null `accepted_at`) to submit requests. The `store` endpoint validates this and returns 422 if no connected practice exists.
- **FR4.10**: The `practice_id` is auto-resolved from the workspace's connected practice — the client does not select or see the practice ID.

### FR5: Practice Request Pipeline

Inbox at `/practice/requests` for triaging incoming client requests.

- **FR5.1**: Table/list view with columns: subject, workspace (client), category, urgency, status, created date, assignee
- **FR5.2**: StatusTabs: All, New, Acknowledged, In Progress, Resolved — with counts. Counts endpoint uses `GROUP BY status` query scoped to the practice (same pattern as `ContactController::counts`).
- **FR5.3**: Filter by: workspace, category, urgency, assignee
- **FR5.4**: Sort by: created date (default newest first), urgency, due date
- **FR5.5**: Click request opens detail panel: full description, client comments, practice response thread, attachments
- **FR5.6**: "Acknowledge" button — transitions `new` → `acknowledged` and notifies client
- **FR5.7**: "Assign" action — assign a practice member to handle the request. Assignee must be a member of the practice (validated via `practice_users` pivot).
- **FR5.8**: Urgency badges: low (grey), normal (blue), high (red)
- **FR5.9**: New request count badge in practice sidebar navigation. Uses `GET /practice/requests/pending-count` (single `COUNT(*)` where status = 'new').

### FR6: Request-to-Task Conversion

- **FR6.1**: "Convert to Task" button on any client request detail. Button disabled if request already has a linked task (prevent duplicate conversion).
- **FR6.2**: Opens pre-filled task creation form: title = request subject, description = request description, workspace = request workspace
- **FR6.3**: Practice member selects assignee and due date, then confirms
- **FR6.4**: Creates a `PracticeTask` with `visibility = 'shared'` and links it to the `ClientRequest` via `client_request_id` FK on the task. One request can only be linked to one task (unique constraint on `client_request_id`).
- **FR6.5**: Sets request status to `in_progress` automatically
- **FR6.6**: Client sees the converted task in their checklist AND the request status updates

### FR7: Shared Comments & Attachments

- **FR7.1**: Task comments use existing `practice_task_comments` table with new `visibility` column
- **FR7.2**: Client request comments stored in new `client_request_comments` table (same schema as practice_task_comments). Client request comments do NOT have a visibility column — all comments on requests are visible to both parties (no internal request comments in v1).
- **FR7.3**: Practice members see all comments (internal + shared); clients see only `shared` comments
- **FR7.4**: Attachments on shared tasks use the existing polymorphic attachment system (012-ATT). Add `practice_task` to the morph map in `AppServiceProvider` alongside `client_request`.
- **FR7.5**: Attachments on client requests use the same polymorphic system with `client_request` morph type
- **FR7.6**: File upload on comments: attach files inline with a comment. Implementation: the comment `body` references attachment IDs; attachments are uploaded separately via the existing attachment endpoints and linked to the parent (task or request) — not embedded in the comment record.

### FR8: Notifications

All notifications use the existing `CreateNotification` action and `NotificationType` enum. New enum cases must be added for each notification type below.

- **FR8.1**: Task assigned to client → in-app notification to all workspace members with role `owner` or `accountant` for the workspace. Uses new `NotificationType::TaskSharedWithClient`. Only fires when visibility is changed to `shared`, not on every task update.
- **FR8.2**: Task marked complete by client → in-app notification to practice assignee (the `assignee_id` on the task). If no assignee, notify the task creator (`created_by_user_id`). Uses new `NotificationType::ClientTaskCompleted`.
- **FR8.3**: New client request submitted → in-app notification to practice members assigned to that workspace via `PracticeMemberAssignment`. If no members are assigned to the workspace, notify all practice owners. Uses new `NotificationType::ClientRequestSubmitted`.
- **FR8.4**: Request status changed → in-app notification to the client who raised it (`created_by_user_id`). Uses new `NotificationType::ClientRequestStatusChanged`.
- **FR8.5**: New comment on shared task → notify the other party (practice comment → workspace owners, client comment → practice assignee). Uses new `NotificationType::TaskCommentAdded`. Dedup: do not notify the commenter themselves.
- **FR8.6**: Task overdue → daily digest notification to practice assignee. Sent via a new `SendOverdueTaskNotifications` artisan command scheduled daily in `routes/console.php`. Only sends one notification per task per day (dedup by checking existing unread notification for same subject). Uses new `NotificationType::TaskOverdue`.

---

## Data Model

### New Table: `client_requests`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `practice_id` | FK → practices, cascadeOnDelete | The practice this request is directed to |
| `workspace_id` | FK → workspaces, cascadeOnDelete | The client workspace raising the request |
| `created_by_user_id` | FK → users, nullOnDelete | The client user who submitted |
| `assigned_to_user_id` | FK → users, nullable, nullOnDelete | Practice member assigned to handle |
| `category` | string | general, tax, payroll, compliance, reporting, other |
| `subject` | string(255) | |
| `description` | text, nullable | |
| `urgency` | string | low, normal, high |
| `status` | string, default `'new'` | new, acknowledged, in_progress, resolved, closed |
| `closed_reason` | string, nullable | resolved, cancelled |
| `resolved_at` | timestamp, nullable | |
| `closed_at` | timestamp, nullable | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

Indexes: `[practice_id, status]`, `[workspace_id, status]`, `assigned_to_user_id`

FK behaviour: `practice_id` and `workspace_id` use `cascadeOnDelete` (if the practice or workspace is deleted, associated requests are cleaned up — matches `practice_tasks` migration pattern). `created_by_user_id` and `assigned_to_user_id` use `nullOnDelete` (user account deletion does not destroy request history).

### New Table: `client_request_comments`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `client_request_id` | FK → client_requests, cascadeOnDelete | |
| `user_id` | FK → users, nullable, nullOnDelete | |
| `body` | text | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### Modified Table: `practice_tasks`

| Column | Change |
|--------|--------|
| `visibility` | ADD string, default `'internal'` — values: `internal`, `shared` |
| `client_request_id` | ADD FK → client_requests, nullable, nullOnDelete — link to source request if converted. Unique constraint to prevent duplicate conversions. |

Index: add `[practice_id, visibility]` for efficient filtering of shared tasks.

### Modified Table: `practice_task_comments`

| Column | Change |
|--------|--------|
| `visibility` | ADD string, default `'shared'` — values: `internal`, `shared` |

### New Enums

- `App\Enums\Practice\ClientRequestCategory` — general, tax, payroll, compliance, reporting, other (backed string enum with `label()` method)
- `App\Enums\Practice\ClientRequestStatus` — new, acknowledged, in_progress, resolved, closed (backed string enum with `label()` and `canTransitionTo()` methods, following `InvoiceStatus` pattern)
- `App\Enums\Practice\ClientRequestUrgency` — low, normal, high (backed string enum with `label()` and `color()` methods for badge rendering)
- `App\Enums\Practice\TaskVisibility` — internal, shared (backed string enum with `label()` method)

All enums placed in `app/Enums/Practice/` subdirectory (first enums in this namespace — creates the directory).

---

## API Endpoints

### New Endpoints — Client Requests (Practice Side)

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| GET | `/api/v1/practice/requests` | ClientRequestController@index | List all requests for the practice |
| GET | `/api/v1/practice/requests/counts` | ClientRequestController@counts | Status counts for StatusTabs |
| GET | `/api/v1/practice/requests/pending-count` | ClientRequestController@pendingCount | Count of `new` requests for nav badge |
| GET | `/api/v1/practice/requests/{clientRequest}` | ClientRequestController@show | Request detail |
| PATCH | `/api/v1/practice/requests/{clientRequest}/status` | ClientRequestController@updateStatus | Transition status |
| PATCH | `/api/v1/practice/requests/{clientRequest}/assign` | ClientRequestController@assign | Assign practice member |
| POST | `/api/v1/practice/requests/{clientRequest}/convert` | ClientRequestController@convertToTask | Convert to PracticeTask |
| GET | `/api/v1/practice/requests/{clientRequest}/comments` | ClientRequestController@comments | List comments |
| POST | `/api/v1/practice/requests/{clientRequest}/comments` | ClientRequestController@addComment | Add comment |

### New Endpoints — Client Requests (Workspace Side)

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| GET | `/api/v1/client-requests` | ClientRequestController@myRequests | List requests for current workspace |
| POST | `/api/v1/client-requests` | ClientRequestController@store | Submit new request |
| GET | `/api/v1/client-requests/{clientRequest}` | ClientRequestController@showMine | View own request detail |
| POST | `/api/v1/client-requests/{clientRequest}/comments` | ClientRequestController@addClientComment | Add follow-up comment |
| PATCH | `/api/v1/client-requests/{clientRequest}/cancel` | ClientRequestController@cancel | Cancel own request |

Workspace-side endpoints live inside the existing `SetWorkspaceContext` middleware group in `routes/api.php` (same as `my-tasks`). Practice-side endpoints live inside the existing `auth:sanctum` practice prefix group.

### Modified Endpoints — Tasks

| Method | Path | Change |
|--------|------|--------|
| PATCH | `/api/v1/practice/tasks/{id}` | Accept `visibility` field; add `visibility` to `$fillable` on PracticeTask model |
| POST | `/api/v1/practice/tasks` | Accept `visibility` field |
| GET | `/api/v1/my-tasks` | Filter to `visibility = 'shared'` only; broaden scope to all workspace shared tasks (not just assignee) |
| GET | `/api/v1/my-tasks/count` | NEW — count of incomplete shared tasks for sidebar badge |
| GET | `/api/v1/practice/tasks/{id}/comments` | Accept `visibility` filter param; client requests auto-filter to `shared` |
| POST | `/api/v1/practice/tasks/{id}/comments` | Accept `visibility` field (practice only); client comments forced to `shared` |
| GET | `/api/v1/practice/tasks/counts` | NEW — status counts for kanban StatusTabs |

### New Endpoints — Task Bulk Actions

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/api/v1/practice/tasks/bulk` | Bulk update: status, assignee, due_date, visibility. Max 50 IDs per request. |

---

## UI/UX Requirements

### Practice Side

**`/practice/tasks` — Task Board**
- Default view: kanban with 4 columns (To Do, In Progress, Blocked, Done)
- Toggle to list view (table) via ViewToggle component
- Filter bar above board: workspace select, assignee select, due date range, template select
- StatusTabs above filters: All | To Do | In Progress | Blocked | Done | Overdue
- "New Task" primary button top-right with `N` keyboard shortcut
- Task slide-over on card click: title, description, workspace, assignee, due date, visibility toggle, comments tab, status history tab, attachments tab
- Drag-and-drop uses existing kanban patterns from invoices/bills
- Loading state: skeleton cards in each column (3 placeholder cards per column)
- Error state: inline error banner with retry button above the board

**`/practice/requests` — Request Pipeline**
- Table layout with StatusTabs: All | New | Acknowledged | In Progress | Resolved
- "New" count badge pulses when > 0
- Click row opens detail slide-over: subject, description, client info, urgency badge, timeline of status changes, comment thread, "Convert to Task" button, "Acknowledge" / "Resolve" action buttons
- Practice sidebar nav item: "Requests" with count badge
- Paginated at 25 per page (server-side pagination)
- Loading state: table skeleton rows. Error state: full-page error with retry.

### Workspace (Client) Side

**`/tasks` — My Tasks**
- Simple checklist layout (not kanban)
- Each row: checkbox, task title, due date, overdue badge
- Click row expands inline or opens slide-over: description, shared comments, attachments, "Mark Complete" button
- Sidebar nav item: "Tasks" with pending count badge, shortcut `G then K`
- Loading state: skeleton list with 5 placeholder rows. Error state: inline error with retry.

**`/requests` — My Requests**
- List of submitted requests with status badges
- "New Request" button top-right
- Click row opens detail: subject, description, status timeline, comment thread
- Empty state: "Need help from your accountant? Raise a request."
- Disabled state: if no connected practice, show informational banner: "Connect with an accountant to raise requests." with link to `/settings/integrations`.

**`/requests/new` — New Request Form**
- Form fields: category (select), subject (input), description (textarea), urgency (select, default normal), attachments (dropzone)
- Submit creates request and redirects to `/requests` with success toast
- Uses React Hook Form + Zod validation
- Submit button disabled while submitting (prevent double-submit)

### Navigation Updates

- Practice sidebar (`practice-shell.tsx`): add "Tasks" (link to `/practice/tasks`) and "Requests" (link to `/practice/requests`) with count badges. Insert between "Jobs" and "Tax" in the existing `practiceNav` array.
- Workspace sidebar (`navigation.ts`): add "Tasks" (link to `/tasks`) and "Requests" (link to `/requests`) under a "Practice" section — only visible when workspace has a connected practice. Conditioned on a `has_connected_practice` boolean returned in the workspace API response.
- Add keyboard shortcut `G then K` for Tasks to `chordShortcuts` in `navigation.ts`. Add `k: "/tasks"` entry.

---

## Acceptance Criteria

### US-01 / US-02 / US-03 — Practice Task Board
- [ ] Kanban renders 4 columns with task cards from `GET /practice/tasks`
- [ ] Drag-and-drop updates task status via API and moves card to new column
- [ ] Filters by workspace, assignee, due date, template all work
- [ ] StatusTabs show correct counts from `/practice/tasks/counts`
- [ ] List view toggle works

### US-04 — Task Visibility
- [ ] New `visibility` column defaults to `internal`
- [ ] Toggle visibility on task detail updates the field
- [ ] Tasks with `visibility = 'internal'` do NOT appear in `GET /my-tasks`
- [ ] Tasks with `visibility = 'shared'` appear in client checklist

### US-05 / US-06 / US-07 — Practice Request Pipeline
- [ ] `GET /practice/requests` returns requests for the practice, filterable by status/workspace/urgency
- [ ] "Acknowledge" transitions `new` → `acknowledged`
- [ ] "Convert to Task" creates a PracticeTask with `client_request_id` set, visibility `shared`, and request status → `in_progress`
- [ ] Practice comment on request is visible to client
- [ ] Duplicate conversion is prevented (409 if request already has a linked task)

### US-08 — Internal Comments
- [ ] Comment with `visibility = 'internal'` is NOT returned when client fetches comments
- [ ] Comment with `visibility = 'shared'` is returned to both practice and client

### US-09 / US-10 — Client Task Checklist
- [ ] `/tasks` page shows only `shared` tasks for the current workspace
- [ ] Marking complete calls `PATCH /my-tasks/{id}/complete` and updates UI
- [ ] Sidebar badge shows correct pending count

### US-11 / US-12 — Client Requests
- [ ] `POST /client-requests` creates a request with status `new`
- [ ] `GET /client-requests` returns only requests for the current workspace
- [ ] Status transitions are reflected in the client's request detail
- [ ] Client can cancel a `new` request
- [ ] Cannot submit request if workspace has no connected practice (422)

### US-13 — Shared Comments & Attachments
- [ ] Client can add comments to shared tasks
- [ ] Client can upload attachments to shared tasks via polymorphic attachment system
- [ ] Attachments on client requests work via `client_request` morph type

### FR8 — Notifications
- [ ] Task assignment to client triggers in-app notification
- [ ] Task completion by client triggers notification to practice assignee
- [ ] New client request triggers notification to assigned practice members
- [ ] Request status change triggers notification to client

---

## Technical Notes

### Existing Infrastructure (Do NOT Rebuild)

- `PracticeTask` model — CRUD, scopes, relationships (all exist)
- `PracticeTaskComment` model — create, list (exists)
- `PracticeTaskStatusLog` model — auto-logged on status change (exists)
- `PracticeTaskTemplate` model — templates, recurrence, workspace linking (exists)
- `CreatePracticeTask` action — creates task + initial status log (exists)
- `UpdateTaskStatus` action — logs transition + updates status (exists)
- `PracticeTaskController` — index, store, update, updateStatus, destroy, comments, addComment, myTasks, completeMyTask (all exist)
- `PracticeTaskTemplateController` — full CRUD + generate (exists)

### New Backend Components

- `ClientRequest` model in `app/Models/Central/`
- `ClientRequestComment` model in `app/Models/Central/`
- `ClientRequestController` in `app/Http/Controllers/Api/`
- `StoreClientRequestRequest` Form Request in `app/Http/Requests/Practice/` (validates category, subject, description, urgency, workspace connection)
- `UpdateClientRequestStatusRequest` Form Request in `app/Http/Requests/Practice/` (validates status transition via `canTransitionTo()`)
- `CreateClientRequest` action in `app/Actions/Practice/`
- `ConvertRequestToTask` action in `app/Actions/Practice/`
- `ClientRequestResource` in `app/Http/Resources/`
- `ClientRequestCommentResource` in `app/Http/Resources/`
- `ClientRequestPolicy` in `app/Policies/`
- `ClientRequestCategory` enum in `app/Enums/Practice/`
- `ClientRequestStatus` enum in `app/Enums/Practice/`
- `ClientRequestUrgency` enum in `app/Enums/Practice/`
- `TaskVisibility` enum in `app/Enums/Practice/`
- Migration: `create_client_requests_table` + `add_visibility_to_practice_tasks`
- Add `client_request` and `practice_task` to morph map in `AppServiceProvider`
- New `NotificationType` enum cases: `TaskSharedWithClient`, `ClientTaskCompleted`, `ClientRequestSubmitted`, `ClientRequestStatusChanged`, `TaskCommentAdded`, `TaskOverdue`
- New `SendOverdueTaskNotifications` artisan command in `app/Console/Commands/`
- New `NotifyOnClientRequest` listener in `app/Listeners/Notifications/`
- New `NotifyOnTaskCompletion` listener in `app/Listeners/Notifications/`

### New Frontend Components

- `frontend/src/app/(practice)/practice/tasks/page.tsx` — practice task board
- `frontend/src/app/(practice)/practice/requests/page.tsx` — practice request pipeline
- `frontend/src/app/(dashboard)/tasks/page.tsx` — client task checklist
- `frontend/src/app/(dashboard)/requests/page.tsx` — client request list
- `frontend/src/app/(dashboard)/requests/new/page.tsx` — new request form
- `frontend/src/components/practice/task-board.tsx` — kanban board component
- `frontend/src/components/practice/task-card.tsx` — kanban card
- `frontend/src/components/practice/task-detail-panel.tsx` — slide-over detail
- `frontend/src/components/practice/request-pipeline.tsx` — request table
- `frontend/src/components/practice/request-detail-panel.tsx` — request slide-over
- `frontend/src/components/tasks/client-task-list.tsx` — client checklist
- `frontend/src/components/tasks/client-request-form.tsx` — request form
- `frontend/src/hooks/use-practice-tasks.ts` — TanStack Query hooks for practice tasks
- `frontend/src/hooks/use-client-requests.ts` — TanStack Query hooks for client requests
- `frontend/src/types/practice-task.ts` — TypeScript types
- `frontend/src/types/client-request.ts` — TypeScript types

### Practice-Side Frontend Route Paths

Note: practice pages live under `frontend/src/app/(practice)/practice/` to match the existing pattern. The spec references `/practice/tasks` and `/practice/requests` as URL paths — the file paths are `practice/tasks/page.tsx` and `practice/requests/page.tsx` inside the `(practice)` route group, consistent with the existing `/practice/clients`, `/practice/jobs`, etc.

---

## Clarifications

The following 20 clarification questions were identified during spec review. Each is answered based on existing codebase patterns and conventions.

### Authorization & Permissions

**C-01: What permissions are needed for client requests? Do we need new Spatie permissions or reuse existing practice-task permissions?**

Options:
- (a) Reuse `practice-task.*` permissions for both tasks and requests
- (b) Add new `client-request.view`, `client-request.create`, etc. permissions
- (c) No permissions — practice membership check is sufficient (like current PracticeTaskController)

**Decision: (c)** — The existing `PracticeTaskController` does not use Spatie permissions for practice-side operations. It checks `$request->user()->practices()->first()` and verifies `$practiceTask->practice_id === $practice->id`. The `PracticeTaskPolicy` exists with Spatie permission checks, but the controller does not use it (it uses inline `abort_unless` checks). Client requests should follow the same pattern: practice membership for practice-side endpoints, workspace membership (via `SetWorkspaceContext` middleware) for client-side endpoints. Adding new Spatie permissions would be inconsistent with the current practice task implementation. The `practice-task.*` permissions in `RolesAndPermissionsSeeder` are workspace-scoped (for workspace users viewing tasks assigned to them), not practice-scoped.

**C-02: Which workspace roles can submit client requests? Can all roles (owner, accountant, bookkeeper, etc.) raise requests, or only certain roles?**

Options:
- (a) All workspace roles can submit requests
- (b) Only owner and accountant roles
- (c) Only owner, accountant, and bookkeeper roles
- (d) Any workspace member (no role check — workspace membership is sufficient)

**Decision: (d)** — The workspace-side endpoints sit inside the `SetWorkspaceContext` middleware which already verifies the user has access to the workspace. Since client requests are a communication channel (not a financial mutation), any workspace member should be able to raise requests. This matches how `my-tasks` works — no role-based restriction, just workspace membership. The practice will triage all incoming requests regardless of who submitted them.

### Data Model Edge Cases

**C-03: What happens to client requests when a practice disconnects from a workspace (PracticeWorkspace record deleted)?**

Options:
- (a) Cascade delete all client requests for that workspace-practice pair
- (b) Soft-delete / archive them (add `archived_at` column)
- (c) Orphan them — requests remain but become inaccessible from both sides
- (d) Keep them read-only — visible in history but no new actions allowed

**Decision: (d)** — The `practice_workspaces` table uses `cascadeOnDelete` on both `practice_id` and `workspace_id` FKs, but the PracticeWorkspace row itself is deleted on disconnect (not the practice or workspace). Since `client_requests` has its own FKs to `practices` and `workspaces` (not to `practice_workspaces`), the requests survive disconnection. The practice-side index endpoint already scopes by `practice_id`, so requests remain visible to the practice. The client-side endpoint scopes by `workspace_id`, so requests remain visible to the client. However, status transitions should be blocked if the practice-workspace connection no longer exists — the `updateStatus` endpoint should verify the connection is still active before allowing transitions. This gives both sides an audit trail without allowing stale interactions.

**C-04: What FK behaviour should `client_request_id` on `practice_tasks` use — cascadeOnDelete or nullOnDelete?**

Options:
- (a) `cascadeOnDelete` — deleting a client request deletes the linked task
- (b) `nullOnDelete` — deleting a client request nulls out the FK on the task
- (c) `restrictOnDelete` — cannot delete a client request that has a linked task

**Decision: (b) `nullOnDelete`** — This matches the pattern used for `template_id` on `practice_tasks` (see migration: `.nullOnDelete()`). The task has independent value after creation and should survive even if the source request is deleted. Nulling the FK preserves the task while removing the linkage.

### API Design

**C-05: Should the practice-side request list be paginated or return all results (like the kanban task board)?**

Options:
- (a) Always paginate at 25 per page (like task list view)
- (b) Return all results (like kanban board view)
- (c) Paginate by default, with `?per_page=all` override

**Decision: (a)** — The request pipeline is a table/list view (not kanban), so it should paginate at 25 per page, matching the existing `PracticeTaskController::index` list view behaviour (`$query->paginate(25)`). Requests accumulate over time (unlike active tasks which cycle through statuses), so unbounded queries would degrade. The counts endpoint provides status totals without loading all records.

**C-06: How should the bulk task update endpoint validate that all task IDs belong to the requesting user's practice?**

Options:
- (a) Load all tasks, check each one, reject entire batch if any fail
- (b) Load all tasks, silently skip tasks that fail authorization
- (c) Use `whereIn` scoped to practice_id, return 422 if count mismatch

**Decision: (c)** — Use `PracticeTask::where('practice_id', $practice->id)->whereIn('id', $ids)` and compare the resulting count against the input count. If they differ, return 422 with a message indicating some IDs were not found or not authorized. This is efficient (single query) and explicit (no silent skipping). Maximum 50 IDs per request to bound query complexity.

### State Transitions

**C-07: Can a client request go directly from `new` to `in_progress` (skipping `acknowledged`), or must it follow the linear pipeline?**

Options:
- (a) Strict linear pipeline: must go through each status in order
- (b) Allow skipping `acknowledged` — `new` can go directly to `in_progress`
- (c) Flexible — any forward transition is allowed

**Decision: (b)** — The `acknowledged` status exists as a courtesy signal to the client ("we've seen your request"). In practice, a team member may immediately start working on a request. Requiring them to click "Acknowledge" then "Start" is unnecessary friction. The `canTransitionTo()` method should allow: `new` → `acknowledged` | `in_progress` | `closed`; `acknowledged` → `in_progress` | `closed`; `in_progress` → `resolved` | `closed`; `resolved` → `closed`. This matches real workflow while maintaining the pipeline structure.

**C-08: Can a `resolved` request be reopened, or is it terminal?**

Options:
- (a) `resolved` is terminal — must create a new request
- (b) `resolved` can go back to `in_progress` (reopen)
- (c) `resolved` can go to `closed` only, but client can create a follow-up request

**Decision: (c)** — Keeping `resolved` as a near-terminal state (only `closed` as next step) prevents messy back-and-forth on old requests. If the issue recurs, the client submits a new request, which creates a clean audit trail. The practice can add a final comment before closing. This keeps the pipeline simple and avoids the complexity of reopen cycles that plague full ticketing systems (which is explicitly out of scope).

### Notification Details

**C-09: Which notification channel should be used — in-app only, or also email?**

Options:
- (a) In-app only (via `CreateNotification` action)
- (b) In-app + email for critical notifications (new request, overdue)
- (c) In-app + email for all notification types
- (d) In-app, with email opt-in per notification type via `NotificationPreference`

**Decision: (a)** — The existing notification system (`CreateNotification` action, `Notification` model, `NotificationType` enum) is in-app only. The `NotificationPreference` model exists but only controls email notification categories (`NotificationCategory` enum), and the email categories are a separate system (workspace invitations, invoice sent, etc.). Adding email for practice portal notifications would require extending the email infrastructure significantly. v1 should be in-app only, consistent with how all other notification listeners work (e.g., `NotifyApproversOnJeSubmitted`). Email can be added in a follow-up epic.

**C-10: How should notification deduplication work for comment notifications? If multiple comments are added quickly, should each trigger a separate notification?**

Options:
- (a) One notification per comment, no dedup
- (b) Batch/debounce — aggregate comments within a 5-minute window into one notification
- (c) One notification per task per day for comment activity
- (d) One notification per comment, but collapse in the notification UI

**Decision: (a)** — One notification per comment with no server-side dedup. This is consistent with how the existing system works (every JE submission creates individual notifications for each approver). The frontend notification panel already groups notifications by type/subject, providing visual grouping. Server-side debouncing adds significant complexity (queued jobs, time windows) that is not justified for v1. The only exception is `FR8.6` (overdue digest), which explicitly deduplicates by checking for existing unread notifications for the same task.

### Frontend UX

**C-11: Should the client task checklist show completed tasks, or only active ones?**

Options:
- (a) Show only active tasks (not done) — matching current `myTasks` which filters `status != 'done'`
- (b) Show all tasks with completed ones greyed out / struck through
- (c) Default to active, with a toggle to show completed

**Decision: (c)** — Default to active tasks (matching the current `myTasks` query which excludes `done`), with a "Show completed" toggle that removes the status filter. This gives clients a clean default view focused on what they need to do, while allowing them to verify past completions. The toggle adds `?include_done=1` to the API request. Completed tasks render with a checked checkbox, strikethrough title, and muted text.

**C-12: What happens in the workspace sidebar if the workspace has no connected practice — should "Tasks" and "Requests" nav items be hidden entirely or shown as disabled?**

Options:
- (a) Hidden entirely — nav items only render when `has_connected_practice` is true
- (b) Shown but disabled with a tooltip explaining why
- (c) Shown and clickable, but the page shows an empty/connect state

**Decision: (a)** — Hidden entirely. This matches the spec's existing statement ("only visible when workspace has a connected practice") and follows the `featureKey` pattern in `navigation.ts` where nav items are filtered out based on feature flags. The workspace API response should include a `has_connected_practice` boolean (derived from `$workspace->practices()->whereNotNull('accepted_at')->exists()`). The frontend conditionally renders the "Practice" nav section based on this flag.

### Integration with Existing Systems

**C-13: The existing `myTasks` endpoint filters by `assignee_id`. For the client portal, should shared tasks be visible to ALL workspace members or only the specific assignee?**

Options:
- (a) Only the assignee (current behaviour) — `assignee_id` must match the requesting user
- (b) All workspace members — any user in the workspace sees all shared tasks
- (c) Workspace owners + assignee — owners see all, assignee sees their own

**Decision: (b)** — All workspace members should see all shared tasks for their workspace. The `assignee_id` on a practice task represents the practice member assigned to do the work, not a workspace user. In the client portal context, the workspace is the "client" and all members of that workspace should see what their practice is doing for them. The `myTasks` endpoint should be updated to filter by `workspace_id` + `visibility = 'shared'` (dropping the `assignee_id` filter). This also solves the edge case where a practice creates a shared task but doesn't assign it to anyone — the task should still appear in the client checklist.

**C-14: Should the `completeMyTask` endpoint continue to check `assignee_id` matches the requesting user, or should any workspace member be able to complete a shared task?**

Options:
- (a) Keep `assignee_id` check — only the assigned user can complete
- (b) Any workspace member can complete — check `workspace_id` + `visibility = 'shared'`
- (c) Workspace owners can complete any task, others only their own

**Decision: (b)** — Consistent with C-13, any workspace member should be able to complete a shared task. The current `abort_unless($practiceTask->assignee_id === $request->user()->id)` should be updated to verify the user belongs to the task's workspace and the task has `visibility = 'shared'`. This handles cases where the practice assigns a task to "the client" (the workspace) rather than a specific person within the workspace.

### Performance

**C-15: How should the kanban board handle N+1 queries when loading tasks with workspace, assignee, comments, and status history?**

Options:
- (a) Eager load everything on the index query
- (b) Eager load workspace + assignee on index; lazy load comments + status history on card click
- (c) Use separate API calls for card detail data

**Decision: (b)** — The existing `PracticeTaskController::index` already eager-loads `workspace`, `assignee`, `createdBy` and uses `withCount('comments')` — this is sufficient for the kanban card rendering (title, workspace name, assignee avatar, comment count). Comments and status history are only needed when the slide-over opens, so they should be loaded on demand via the existing `GET /practice/tasks/{id}/comments` endpoint and a new `GET /practice/tasks/{id}/status-log` endpoint (or include status logs in the show endpoint). This keeps the initial kanban load fast even with hundreds of tasks.

**C-16: Should the practice request counts endpoint compute overdue counts, and if so, how?**

Options:
- (a) No overdue concept for requests — requests have no due date
- (b) Add a `due_date` column to client requests and compute overdue
- (c) Compute "stale" count based on age (e.g., requests in `new` status for > 48 hours)

**Decision: (a)** — Client requests do not have a `due_date` column in the data model (this is intentional — they are intake, not assignments). Adding a due date would push requests toward a full ticketing system (out of scope). The counts endpoint groups by `status` only, matching the StatusTabs definition (All, New, Acknowledged, In Progress, Resolved). SLA/staleness tracking is explicitly out of scope for v1.

### Testing

**C-17: What tests are needed for this feature? What is the minimum test coverage?**

Options:
- (a) Feature tests only (API endpoint tests)
- (b) Feature tests + browser tests
- (c) Feature tests + unit tests for enums/actions + browser tests

**Decision: (c)** — Following the existing testing strategy:
- **Feature tests** (~15-20 tests): ClientRequest CRUD, status transitions, comment visibility filtering, request-to-task conversion, authorization (practice membership, workspace membership), cross-practice isolation, bulk task updates. Follow `PracticeTaskTest.php` setup pattern.
- **Unit tests** (~5 tests): `ClientRequestStatus::canTransitionTo()` exhaustive transition matrix, enum label methods.
- **Browser tests** (~8 tests): Practice task board renders, kanban drag-and-drop, client task checklist renders, client request submission flow, request detail slide-over, task visibility toggle. Follow existing `tests/Browser/` patterns with `browserLogin()`.

**C-18: How should tests verify that a client cannot see internal comments?**

Options:
- (a) Test at the API level — assert internal comments are excluded from response
- (b) Test at the model/query level — assert the scope filters correctly
- (c) Both API and model level tests

**Decision: (a)** — Test at the API level, consistent with existing feature test patterns. Create a shared task with both internal and shared comments, then make a request as a workspace user to the comments endpoint and assert the response only contains shared comments. Also verify that a practice user making the same request sees all comments. This is the most valuable test because it exercises the full middleware + controller + query pipeline.

### Migration & Rollout

**C-19: Should this feature be gated behind a feature flag (Laravel Pennant)?**

Options:
- (a) No feature flag — available to all workspaces immediately
- (b) Feature flag on workspace side only (client tasks/requests visibility)
- (c) Feature flag on both practice and workspace side
- (d) No feature flag, but conditioned on having a connected practice (natural gate)

**Decision: (d)** — No feature flag needed. The feature has a natural gate: workspace-side UI only appears when a practice is connected (`has_connected_practice`), and practice-side UI only appears for users who belong to a practice. The existing `CheckFeature` middleware requires workspace context, but practice endpoints run outside workspace context, making Pennant flags awkward. The practice-side task board and request pipeline are simply new pages in the practice shell — no gating needed. This matches how practice management (027-PMV) was rolled out without feature flags.

**C-20: How should the migration handle existing `practice_tasks` rows that don't have a `visibility` value?**

Options:
- (a) Default all existing tasks to `internal` (safest — nothing leaks to clients)
- (b) Default all existing tasks to `shared` (most useful — clients see existing tasks immediately)
- (c) Run a one-time backfill script based on some heuristic

**Decision: (a)** — Default all existing tasks to `internal`. The migration adds the column with `->default('internal')`, so all existing rows get `internal` automatically. This is the safe default because no existing tasks were created with the intent of being shared with clients (the feature didn't exist). Practice members can then selectively toggle tasks to `shared` as needed. This prevents any accidental data exposure and is consistent with the spec's stated default (`FR3.1`).
