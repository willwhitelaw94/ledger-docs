---
title: "Feature Specification: Practice Jobs, Timesheets & WIP"
---

# Feature Specification: Practice Jobs, Timesheets & WIP

**Feature Branch**: `072-jobs-timesheets-wip`
**Created**: 2026-03-31
**Status**: Draft
**Epic**: 072-JTW
**Initiative**: FL -- Financial Ledger Platform
**Effort**: L (5--6 sprints)
**Depends On**: 027-PMV (complete -- practice tasks, member assignments, workspace groups), 008-JCT (complete -- workspace-level job costing model)

### Out of Scope

The following are explicitly excluded from this epic and deferred to future work:

- **Practice billing / invoicing** -- generating invoices to clients for accounting services rendered (separate from the client's own ledger invoicing). Deferred to a future practice billing epic.
- **Engagement letters and proposals** -- scoping, pricing, e-signatures. Consider Ignition integration first.
- **Leave management** -- tracking staff leave/holidays for capacity calculations. Use a simple "available hours per week" setting for now.
- **Approval workflows for timesheets** -- manager sign-off on time entries. V1 is trust-based; approval chains can layer on via 060-ACH.
- **Billing rates per client or per service** -- V1 uses a single cost rate per staff member. Variable billing rates are a future enhancement.
- **Expense tracking against jobs** -- disbursements, out-of-pocket costs. Deferred to practice billing epic.
- **AI-assisted time tracking** -- Chrome extension, desktop widget, and AI-powered auto-suggestion of time entries from activity signals (browser history, calendar, email). This is a standalone epic (073-ATT or similar) that builds on the timesheet data model from this epic. Vision: make time tracking enjoyable and invisible rather than a Monday morning chore.

---

## Overview

MoneyQuest Ledger's practice management (027-PMV) delivered task boards, member assignments, workspace grouping, and recurring templates. However, the task system is flat -- tasks exist in a single pool with no concept of the **job** (engagement) they belong to. Accounting firms don't think in tasks; they think in **jobs**: "FY26 Tax Return for Smith Pty Ltd" is a job. That job has a time budget (8 hours), staff allocated to it (Sarah: 5h, Tom: 3h), and actual time logged against it via timesheets. The gap between budgeted and actual time is **WIP (Work In Progress)** -- the core metric partners use to manage profitability and staff utilisation.

This epic introduces:

1. **Practice Jobs** -- engagement-level work items that group tasks and carry time budgets. Distinct from workspace-level `project_jobs` (008-JCT), which track financial profitability from posted ledger entries. Practice jobs track the *accounting firm's effort* against client work.
2. **Time Budgets** -- each practice job gets an estimated time budget in hours. Budgets can be broken down by staff member (staff allocations).
3. **Staff Allocations** -- assigning team members to jobs with a budgeted number of hours. This is the "scheduling" layer that answers: "Does Sarah have capacity for more work this week?"
4. **Timesheets** -- staff log time against practice jobs. Time entries record duration, date, description, and whether the time is billable. Running timers supported.
5. **WIP Tracking** -- actual hours vs budgeted hours per job, per staff member, and firm-wide. Utilisation dashboards show capacity and workload distribution.

**Competitor context**: XPM leads on job/time/billing integration within the Xero ecosystem. Karbon has strong WIP reporting and resource planning. TaxDome has a Time Utilisation Dashboard comparing capacity vs actual hours. Jetpack Workflow tracks budgeted vs actual time with internal cost rates. All competitors treat jobs-with-time-budgets as the foundational unit of practice work -- tasks are children of jobs, not standalone items.

**User research insight** (H&W session 2026-04-01): In practice, timesheets are overwhelmingly filled in **retrospectively** -- typically Monday morning for the previous week, piecing together from browser history, Outlook calendar, and memory. Real-time timer usage is aspirational but rare. The grid must prioritise fast retrospective entry (keyboard-navigable, tab between cells). Future opportunity: AI-assisted time capture that auto-suggests entries from activity signals (deferred -- not this epic). Key practice reports needed: staff productivity %, utilisation %, realisation, write-offs, billable hours, per-partner P&L.

**Relationship to 008-JCT**: The existing `project_jobs` table (workspace-level) tracks *financial* job profitability from posted journal entry lines. Practice jobs (this epic) track *effort* -- the accounting firm's time investment. A practice job MAY be linked to a workspace-level `project_job` for cross-referencing, but they serve different purposes and live in different scopes (practice-scoped vs workspace-scoped).

---

## User Scenarios & Testing

### User Story 1 -- Practice Job Creation & Management (Priority: P1)

A practice partner creates jobs to represent engagements -- "FY26 Tax Return - Smith Pty Ltd", "Monthly BAS - Jones Trust", "Audit - Acme Corp". Each job is linked to a client workspace, has a status, time budget, and due date. Jobs are the top-level container that tasks are organised under.

**Why this priority**: Jobs must exist before time can be budgeted, staff allocated, or timesheets logged. Every other feature in this epic depends on the job entity.

**Independent Test**: A partner can create a job "FY26 Tax Return - Smith Pty Ltd" with a 10-hour budget and due date of 31 Oct 2026, see it on the jobs board, and find existing practice tasks grouped under it.

**Acceptance Scenarios**:

1. **Given** I am a practice member, **When** I navigate to /practice/jobs, **Then** I see a list of all practice jobs grouped by status (Active, On Hold, Completed, Cancelled) with workspace name, assignee, budget, progress, and due date visible.

2. **Given** I click "New Job", **When** I fill in: name (required), client workspace (dropdown of assigned workspaces), description, time budget (hours), due date, and assignee (primary staff member), **Then** the job is created with status "active" and appears on the board.

3. **Given** a practice job "FY26 Tax Return - Smith" exists, **When** I view its detail page, **Then** I see: job metadata (name, workspace, status, budget, due date), a list of tasks belonging to this job, staff allocations with budgeted hours, time entries logged against it, and a WIP summary (budgeted vs actual hours).

4. **Given** existing practice tasks are unassigned to any job, **When** I edit a task, **Then** I can assign it to a practice job via a dropdown. Tasks already belonging to a job show the job name as a badge.

5. **Given** I create a new task from within a job's detail page, **When** the task is created, **Then** it is automatically linked to that job.

6. **Given** a job has a time budget of 10 hours and 7 hours logged, **When** I view the job card, **Then** it shows a progress bar at 70% with "7h / 10h" and colour-codes amber (>80%) or red (>100%) when over budget.

7. **Given** I change a job's status to "completed", **When** the status is saved, **Then** all linked tasks with status "to_do" or "in_progress" are flagged with a "Job completed" banner (not auto-closed -- the practice may still have wrap-up tasks).

---

### User Story 2 -- Staff Allocations (Priority: P1)

A practice manager schedules work by allocating staff members to jobs with budgeted hours. "Sarah gets 5 hours on the Smith tax return, Tom gets 3 hours." This answers two questions: (1) Who is responsible for this job? (2) Does each staff member have enough -- or too much -- work?

**Why this priority**: Staff allocation is the core scheduling mechanism for accounting firms. Without it, the partner cannot plan capacity or balance workload. This is what distinguishes a practice management tool from a simple task tracker.

**Independent Test**: A manager allocates Sarah 5h and Tom 3h to a job with 10h budget. The staff allocation panel shows 8h of 10h allocated (2h unallocated). Sarah's personal capacity view shows 5h committed to this job out of her 40h weekly capacity.

**Acceptance Scenarios**:

1. **Given** I am viewing a job's detail page, **When** I open the "Staff Allocations" panel, **Then** I see a list of practice members with an "hours budgeted" input for each, plus the total allocated vs job budget.

2. **Given** a job has a 10h budget, **When** I allocate Sarah 5h and Tom 3h, **Then** the panel shows "8h / 10h allocated" with 2h remaining. The sum of allocations is not required to equal the job budget (under- or over-allocation is allowed with a visual warning for over-allocation).

3. **Given** I allocate Sarah 5h to "Smith Tax Return", **When** I view Sarah's capacity for the week containing the job's due date, **Then** those 5h appear as committed capacity, reducing her available hours.

4. **Given** a staff member has 40h/week capacity and 35h allocated across all jobs for a given week, **When** I try to allocate an additional 8h to a new job due that week, **Then** the system shows a warning "Sarah is over-allocated (43h / 40h this week)" but does not prevent the allocation.

5. **Given** a staff allocation exists, **When** time is logged against that job by that staff member, **Then** the allocation row shows actual vs budgeted (e.g., "3.5h / 5h logged").

---

### User Story 3 -- Timesheets (Priority: P1)

Staff members log time against practice jobs. Time entries capture what was done, how long it took, and whether it's billable. A running timer lets staff start/stop tracking in real-time, or they can manually enter time after the fact.

**Why this priority**: Time logging is the data source for WIP tracking, utilisation reporting, and future practice billing. Without timesheets, all budgets and allocations are theoretical.

**Independent Test**: A staff member starts a timer on "Smith Tax Return", works for 45 minutes, stops the timer, adds a description "Reviewed bank statements", and the entry appears in the job's time log and on their personal timesheet for today.

**Acceptance Scenarios**:

1. **Given** I am a practice member, **When** I navigate to /practice/timesheets, **Then** I see my timesheet for the current week with daily columns, rows per job, and total hours per day and per job.

2. **Given** I click a cell in the timesheet grid (job row x day column), **When** I enter "1.5" (hours), **Then** a time entry is created for that job on that date. I can optionally add a description.

3. **Given** I click the timer icon on a job (from the jobs page, task board, or timesheet), **When** the timer starts, **Then** a running timer appears in the header bar showing elapsed time and job name. Clicking stop saves the entry.

4. **Given** a running timer has been active for 47 minutes, **When** I stop it, **Then** the time is recorded as 0.78h (rounded to nearest 6-minute increment / 0.1h). I can adjust the duration before saving.

5. **Given** I have logged time entries across 3 jobs today, **When** I view my daily total, **Then** I see the sum of all entries. The weekly view shows totals per day and a grand total for the week.

6. **Given** I am a practice manager, **When** I view /practice/timesheets with the "Team" toggle, **Then** I see all practice members' time entries for the selected week. I can filter by staff member, job, or workspace.

7. **Given** a time entry exists, **When** I edit it, **Then** I can change the duration, description, date, job, and billable flag. Deleting an entry is also supported.

8. **Given** time entries exist, **When** they are logged against a job, **Then** the job's WIP summary updates in real-time (actual hours increases, budget remaining decreases).

---

### User Story 4 -- WIP Dashboard & Utilisation (Priority: P2)

A practice partner wants a bird's-eye view of firm health: Which jobs are over budget? Which staff members are under-utilised? What's the total WIP (unbilled work) across the firm? The WIP dashboard answers these questions with at-a-glance metrics and drill-down capability.

**Why this priority**: WIP and utilisation are the metrics partners use to manage firm profitability. Without visibility, they're flying blind. Competitor parity: XPM, Karbon, TaxDome, and Canopy all have this.

**Independent Test**: A partner views the WIP dashboard and sees: firm-wide utilisation at 72%, Sarah at 85% (green), Tom at 45% (amber), and 3 jobs flagged as over-budget. Clicking a job drills into its time breakdown.

**Acceptance Scenarios**:

1. **Given** I am a practice owner/manager, **When** I navigate to /practice/reports/wip (or a WIP tab on the dashboard), **Then** I see a firm-wide WIP summary: total budgeted hours, total actual hours, total WIP hours (budgeted - actual), and firm-wide utilisation percentage.

2. **Given** the dashboard is loaded, **When** I view the "Jobs" section, **Then** I see a table of all active jobs with: job name, workspace, budget hours, actual hours, remaining hours, % complete, status (on track / at risk / over budget), and due date. Colour-coded: green (<80% of budget used), amber (80-100%), red (>100%).

3. **Given** the dashboard is loaded, **When** I view the "Staff" section, **Then** I see a table of all practice members with: name, weekly capacity (configurable, default 40h), hours logged this week, hours allocated this week, utilisation % (logged / capacity), and availability (capacity - allocated). Colour-coded: green (60-85%), amber (<60% or >85%), red (>100%).

4. **Given** I click on a staff member in the utilisation table, **When** the detail panel opens, **Then** I see their job allocations for the selected period, time entries, and a weekly heatmap of hours logged.

5. **Given** I click on a job in the WIP table, **When** I drill down, **Then** I see a per-staff breakdown of budgeted vs actual hours, plus the task list for that job.

6. **Given** the dashboard has a date range selector, **When** I change the range to "Last Quarter", **Then** all metrics recalculate for that period.

---

### User Story 5 -- Tasks Organised by Job on the Jobs Page (Priority: P1)

The current /practice/jobs page shows a flat kanban of tasks. It needs to be reorganised so that **jobs are the primary entity**, with tasks nested under them. The page becomes a job-centric view where you can expand a job to see its tasks, or view all tasks across jobs with a job filter.

**Why this priority**: This is the original request -- "task management organised by jobs". The flat task board is useful but doesn't reflect how accounting firms think about work. Jobs provide the grouping and budgeting context that tasks alone cannot.

**Independent Test**: The /practice/jobs page shows job cards (not raw tasks). Expanding "Smith Tax Return" reveals its 4 tasks. The "All Tasks" tab still shows the flat kanban for quick task management, but each task card now shows its parent job.

**Acceptance Scenarios**:

1. **Given** I navigate to /practice/jobs, **When** the page loads, **Then** I see jobs as the primary entities -- either as a list/table or as cards grouped by status (Active, On Hold, Completed). Each job card shows: name, workspace, assignee, budget progress, task count, and due date.

2. **Given** I click on a job card, **When** the detail view opens, **Then** I see the job's metadata, staff allocations, WIP summary, and a nested task list (kanban or list view scoped to that job's tasks).

3. **Given** the "Tasks" tab is selected on the jobs page, **When** I view the task kanban, **Then** each task card displays a job badge showing which job it belongs to. Tasks without a job show "Unassigned".

4. **Given** I create a new task, **When** the create dialog opens, **Then** there is a "Job" dropdown field that lets me assign the task to an existing practice job. This field is optional -- tasks can still exist without a job.

5. **Given** I filter by a specific job, **When** the filter is applied, **Then** only tasks belonging to that job are shown.

6. **Given** unassigned tasks exist (tasks not linked to any job), **When** I view the jobs page, **Then** an "Unassigned Tasks" section (or virtual job) shows tasks that haven't been linked to a job yet. This encourages cleanup without forcing it.

---

### Edge Cases

- **Job deleted with time entries**: Jobs with time entries cannot be deleted -- only archived (status = cancelled). Time entries are never orphaned.
- **Staff member removed from practice**: Their time entries remain on the job. Their allocations are flagged as "member removed" for the manager to reassign budget.
- **Over-budget jobs**: The system warns but never prevents work from continuing. Over-budget is informational, not a hard stop.
- **Timer left running overnight**: Timers persist across sessions (stored server-side). A daily cleanup job caps any timer running >12h and notifies the user.
- **Concurrent timers**: Only one timer can be active per user at a time. Starting a new timer stops the current one (with a confirmation if >5 minutes elapsed).
- **Time entry rounding**: Entries are stored in minutes. Display rounding (nearest 6-min / 0.1h) is UI-only. Raw minutes are preserved for accurate reporting.
- **Workspace disconnected from practice**: Active jobs for that workspace are archived. Time entries remain for historical reporting.
- **Practice task already on two pages**: The existing /practice/tasks page continues to show the flat task view. /practice/jobs becomes the job-centric view. Both read from the same `practice_tasks` table -- the only difference is the new `practice_job_id` FK for grouping.

---

## Requirements

### Functional Requirements

**Practice Jobs**

- **FR-JTW-001**: System MUST provide a practice job entity with: name, description, practice_id, workspace_id, status (active/on_hold/completed/cancelled), time_budget_minutes, due_date, assignee_id (primary staff), created_by_user_id, and optional link to workspace-level project_job_id.
- **FR-JTW-002**: System MUST support job statuses via `PracticeJobStatus` PHP enum: `active`, `on_hold`, `completed`, `cancelled`. No transition enforcement in V1 (any-to-any allowed). All transitions logged in `practice_job_status_log` with timestamp and user.
- **FR-JTW-003**: System MUST display jobs on /practice/jobs as the primary entity with workspace name, status, budget progress, task count, and due date.
- **FR-JTW-004**: Practice tasks MUST support an optional `practice_job_id` foreign key to group tasks under a job.
- **FR-JTW-005**: Job list MUST support filtering by workspace, assignee, status, and due date range.
- **FR-JTW-006**: Creating a task from within a job's detail page MUST auto-set the task's practice_job_id.
- **FR-JTW-007**: Jobs with time entries MUST NOT be deletable -- only archivable (status = cancelled).

**Staff Allocations**

- **FR-JTW-008**: System MUST support allocating practice members to practice jobs with a budgeted number of minutes.
- **FR-JTW-009**: Total staff allocations for a job are not required to equal the job's time budget. Over- and under-allocation MUST trigger visual warnings but not hard blocks.
- **FR-JTW-010**: Staff allocation view MUST show actual hours logged vs budgeted hours per staff member per job.
- **FR-JTW-011**: Each practice member MUST have a configurable weekly capacity (default 40h / 2400 minutes) stored at the practice_users pivot level.
- **FR-JTW-011b**: Each practice member MAY have an optional `cost_rate_cents` (internal hourly cost in cents) stored at the practice_users pivot level. When populated, WIP reports show dollar values (WIP value = hours × cost rate) alongside hours. This is the firm's internal cost, NOT a client billing rate (billing is out of scope).

**Timesheets**

- **FR-JTW-012**: System MUST support time entries with: practice_id, user_id, practice_job_id, date, duration_minutes, description, billable (boolean, default true), timer_started_at (nullable), and created_at.
- **FR-JTW-013**: System MUST provide a weekly timesheet grid view (job rows x day columns) for each staff member. Default view is the current week. Users can navigate to any past week via arrows or a date picker. This supports the common pattern of retrospective entry (e.g., filling in last week on Monday morning).
- **FR-JTW-014**: System MUST support a running timer per user. Only one timer active at a time. Timer state persisted server-side.
- **FR-JTW-015**: Stopping a timer MUST create a time entry with duration calculated from elapsed time. User can adjust before saving.
- **FR-JTW-016**: Time entries MUST be editable (duration, description, date, job, billable) and deletable.
- **FR-JTW-017**: System MUST provide a team timesheet view for managers showing all members' entries for a selected week.
- **FR-JTW-018**: Time entry duration MUST be stored in minutes (integer). UI displays in decimal hours (e.g., 1.5h = 90 minutes) with rounding to nearest 6-minute increment for display.
- **FR-JTW-019**: A daily cleanup job MUST cap any timer running > 12 hours and notify the user.
- **FR-JTW-019b**: System MUST support a configurable soft submission deadline per practice (default: Monday 9:00am). After the deadline, staff see a "Timesheet overdue" banner. Managers see a "Late timesheets" count on the practice dashboard. No hard lock — staff can still edit past weeks at any time. Trust-based model consistent with V1 scope.
- **FR-JTW-019c**: The running timer indicator MUST be visible in both the practice shell header and the workspace sidebar header. Staff frequently switch between portals; the timer must persist visually. Admin portal excluded.
- **FR-JTW-019d**: A timesheet grid cell MAY contain multiple time entries for the same job on the same day. The cell displays the aggregate total. Clicking/focusing the cell expands a mini-panel showing individual entries with description and duration.
- **FR-JTW-019e**: Time entry `date` is a DATE column (no time component). No timezone conversion. `timer_started_at` is a full UTC timestamp. The resulting entry's `date` defaults to the user's current calendar day (determined client-side).

**WIP & Utilisation**

- **FR-JTW-020**: System MUST calculate per-job WIP: budgeted minutes, actual minutes (sum of time entries), remaining minutes, and percentage complete.
- **FR-JTW-021**: System MUST calculate per-staff utilisation: hours logged / weekly capacity, expressed as a percentage.
- **FR-JTW-022**: System MUST provide a WIP dashboard with: firm-wide totals, per-job breakdown (with over-budget flagging), and per-staff utilisation.
- **FR-JTW-023**: WIP dashboard MUST support date range filtering (this week, last week, this month, this quarter, custom range).
- **FR-JTW-024**: Per-job WIP MUST colour-code: green (<80% budget used), amber (80--100%), red (>100%).
- **FR-JTW-025**: Per-staff utilisation MUST colour-code: green (60--85%), amber (<60% or >85%), red (>100%).
- **FR-JTW-025b**: When staff members have `cost_rate_cents` populated, WIP dashboard MUST show dollar-valued columns alongside hours: WIP value (actual hours × cost rate), budget value (budgeted hours × cost rate), and variance. Dollar values appear only when cost rates are configured — hours-only view is the fallback.
- **FR-JTW-025c**: System MUST provide practice-level productivity reports: staff productivity % (billable hours / total hours), utilisation % (logged hours / capacity), and realisation % (future — deferred to billing epic, placeholder column). These are the core metrics partners use to manage firm profitability.

**Authorisation**

- **FR-JTW-026**: All practice job, allocation, and timesheet data MUST be scoped by practice_id.
- **FR-JTW-027**: Practice members MUST only see jobs and timesheets for workspaces they are assigned to (consistent with FR-035 from 027-PMV).
- **FR-JTW-028**: Practice owners MUST be able to view and edit all jobs, allocations, and timesheets for their practice.
- **FR-JTW-029**: Non-owner practice members MUST be able to edit their own time entries and view jobs they are allocated to. They MUST NOT edit other members' time entries.
- **FR-JTW-030**: Authorisation uses the existing `practice_users` pivot role (owner/member). No new Spatie permissions in V1. Owners CRUD everything. Members: create/update jobs, manage allocations on their jobs, CRUD own time entries, view others' time entries read-only.
- **FR-JTW-031**: All new models (PracticeJob, StaffAllocation, TimeEntry, PracticeJobStatusLog) MUST live in `app/Models/Central/` — scoped by `practice_id`, consistent with existing PracticeTask pattern.

### Key Entities

- **PracticeJob** (table: `practice_jobs`): An engagement-level unit of work within a practice. Carries name, description, workspace_id, status, time_budget_minutes, due_date, assignee_id (primary), and optional link to workspace-level project_job. Practice-scoped. Has many tasks, allocations, and time entries.
- **PracticeJobStatusLog** (table: `practice_job_status_log`): Audit trail of status changes. Fields: practice_job_id, user_id, from_status, to_status, created_at.
- **StaffAllocation** (table: `practice_staff_allocations`): Links a practice member to a practice job with budgeted minutes. Fields: practice_job_id, user_id, budgeted_minutes. Unique on [practice_job_id, user_id].
- **TimeEntry** (table: `practice_time_entries`): A record of time spent on a practice job. Fields: practice_id, user_id, practice_job_id, date, duration_minutes, description, billable, timer_started_at, created_at, updated_at.
- **PracticeTask.practice_job_id** (migration addition): New nullable FK on existing `practice_tasks` table linking a task to its parent practice job.
- **practice_users.weekly_capacity_minutes** (migration addition): New column on the `practice_users` pivot table storing each member's weekly capacity (default 2400 = 40h).
- **practice_users.cost_rate_cents** (migration addition): New nullable integer column on the `practice_users` pivot table storing each member's internal hourly cost in cents. Used for dollar-valued WIP and productivity reporting. Not a client billing rate.

### Relationship to Existing Entities

```
Practice
  |-- PracticeJob (new)
  |     |-- StaffAllocation (new) --> User
  |     |-- TimeEntry (new) --> User
  |     |-- PracticeTask (existing, via new FK)
  |     |-- PracticeJobStatusLog (new)
  |     \-- Workspace (existing, via FK)
  |
  |-- PracticeTask (existing)
  |     \-- practice_job_id (new nullable FK)
  |
  \-- practice_users (existing pivot)
        \-- weekly_capacity_minutes (new column)
```

---

## Success Criteria

### Measurable Outcomes

- **SC-JTW-001**: A practice member can create a job, allocate staff, and log a time entry within 2 minutes of navigating to /practice/jobs.
- **SC-JTW-002**: The timesheet grid allows entering a full day's time across 4 jobs in under 60 seconds (keyboard-navigable, spreadsheet-mode grid — arrow keys navigate cells, typing immediately enters edit mode, Tab moves right, Enter moves down, Escape cancels, auto-save on blur).
- **SC-JTW-003**: WIP dashboard loads in under 2 seconds for a practice with 100 active jobs and 500 time entries.
- **SC-JTW-004**: Staff utilisation percentages match manual calculation (logged hours / capacity * 100) verified in integration tests.
- **SC-JTW-005**: Over-budget jobs are visually flagged within 1 second of the time entry that pushes them over.
- **SC-JTW-006**: Existing practice tasks continue to function unchanged -- the practice_job_id FK is nullable and tasks without a job remain fully functional.
- **SC-JTW-007**: Running timer persists across page navigations and browser refreshes. Timer state is server-side, not localStorage.
- **SC-JTW-008**: Practice members only see jobs/timesheets for their assigned workspaces -- no data leakage (consistent with 027-PMV workspace scoping).

---

## Clarifications

### Session 2026-03-31

- Q: What is the relationship between practice jobs (this epic) and workspace-level project_jobs (008-JCT)? --> A: They are distinct entities serving different purposes. Practice jobs track the firm's effort/time; project_jobs track financial profitability from posted ledger entries. An optional FK links them for cross-referencing but they are not the same table.
- Q: Should tasks be required to belong to a job? --> A: No. The practice_job_id on tasks is nullable. Unassigned tasks appear in an "Unassigned" section. This preserves backward compatibility with existing task workflows.
- Q: Where do timesheets live in the navigation? --> A: New nav item "Timesheets" on the practice shell, between "Tasks" and "Requests".
- Q: What about billing rates and invoicing clients for time? --> A: Out of scope for this epic. V1 tracks time budgets and actuals. Practice billing (generating invoices to clients for services) is a future epic that will build on this data.
- Q: Can non-owner practice members view other members' time entries? --> A: Yes for viewing (needed for coordination). Only owners/managers can edit other members' entries. Members can only edit their own.
- Q: What is "WIP" in this context? --> A: Work In Progress = time budgeted but not yet billed. Since we don't have practice billing yet, WIP in V1 = budgeted hours - actual hours logged. When billing is added, WIP will also include unbilled time entries.
- Q: How does this relate to the existing /practice/jobs page? --> A: The existing page shows a flat task kanban. This epic transforms it into a job-centric view where jobs are the primary entity and tasks are nested under them. The flat task view remains available on /practice/tasks.

### Session 2026-04-01

- Q: Timer persistence model — heartbeat vs start/stop timestamps? --> A: Start/stop timestamps (B). Server stores `timer_started_at`; duration = `now - timer_started_at` on stop. 12h cleanup handles abandoned timers. Users can adjust duration before saving. Matches XPM/Harvest pattern.
- Q: Timesheet week navigation — current week only, two-week view, or any-week navigable? --> A: Any week navigable with current week as default (C). Week arrows + date picker. Supports the common retrospective entry pattern where staff fill in last week on Monday morning (piecing together from calendar/email/history).
- Q: Should V1 store an internal cost rate per staff member for dollar-valued WIP? --> A: Yes, optional `cost_rate_cents` on practice_users pivot. When populated, WIP reports show dollar values alongside hours (WIP value = hours × cost rate). This is the firm's internal cost, not a billing rate. Enables productivity metrics: staff productivity %, utilisation %, and dollar-valued WIP. Realisation % deferred to billing epic.
- Q: Timesheet grid keyboard navigation model? --> A: Full spreadsheet mode (B). Arrow keys navigate cells, typing immediately enters edit mode (like Excel). Tab moves right, Enter moves down, Escape cancels. Auto-save on blur. No click needed to start editing. This matches Excel muscle memory and makes the "4 jobs in 60 seconds" target achievable.
- Q: Configurable submission deadline model? --> A: Soft deadline with configurable day/time per practice (default Monday 9:00am). After the deadline, staff see a "Timesheet overdue" banner; managers see a "Late timesheets" count. No hard lock — staff can still edit past weeks. Trust-based model consistent with V1 scope.
- Q: Should PracticeJobStatus use a PHP enum, and are status transitions enforced? --> A: PHP enum (`PracticeJobStatus`) with values: `active`, `on_hold`, `completed`, `cancelled`. No transition enforcement in V1 — any-to-any is allowed. Jobs don't have a strict lifecycle like invoices; partners need flexibility to reopen completed jobs or reactivate cancelled ones. All transitions are logged in `practice_job_status_log` regardless.
- Q: Where does "Timesheets" sit in the practice shell navigation? --> A: New top-level nav item between "Jobs" and "Staff". Timesheets are a daily-use surface for every practice member; nesting them increases friction. XPM and Karbon both treat timesheets as top-level. Icon: `Clock` (lucide). The practice shell nav becomes: Dashboard, Clients, Jobs, Timesheets, Staff, Requests, Documents, Tax, Reports, Settings.
- Q: What happens to the current /practice/jobs page (flat task kanban) when practice jobs are introduced? --> A: /practice/jobs becomes the job-centric view (job list/table as primary entity). A "Tasks" tab within the page header shows the existing flat task kanban, preserving backward compatibility. Each task card in the kanban shows its parent job as a badge. The existing /practice/tasks route redirects to /practice/jobs?tab=tasks.
- Q: How are existing practice tasks handled when the practice_job_id FK is added? --> A: No migration backfill. Existing tasks keep `practice_job_id = NULL`. They appear in an "Unassigned Tasks" section on the jobs page (per acceptance scenario 6 of User Story 5). Practices categorise them organically over time. No fake "Unassigned" job records created.
- Q: How is manual time input stored — exact minutes or rounded to 6-minute increments? --> A: Store exactly what the user enters, converted to integer minutes (1.5h = 90 min, 0.25h = 15 min). Rounding to nearest 0.1h (6-minute increment) is display-only in the UI and reports. Timer-generated entries calculate exact elapsed minutes. This preserves accuracy for reporting while keeping the grid output clean.
- Q: Should time entries have an activity type field beyond the billable boolean? --> A: No, V1 uses the billable boolean only. The description field captures what was done. Activity type categorisation (tax prep, admin, meeting, etc.) is a natural V2 enhancement once practices have time entry data and can articulate their taxonomy. Keeping V1 lean avoids per-practice configuration overhead.
- Q: Does the running timer persist across practice portal and workspace portal navigation? --> A: Yes. The timer is visible in both the practice shell header and the workspace sidebar header. Practice staff frequently switch to client workspaces to do actual work; the timer must stay visible to avoid forgotten timers. Timer state is server-side (FR-JTW-014). Admin portal excluded.
- Q: How does the team timesheet view handle large practices? --> A: Default view is "My Timesheet" (personal). A "Team" toggle loads all practice members' entries for the selected week. V1 loads all members when toggled (no pagination) — most practices have 5-15 staff. Staff member and job filters available on the team view. Pagination deferred until practices exceed 50 members.
- Q: Do practice jobs support recurring/automatic creation (e.g., auto-create "Monthly BAS" job each month)? --> A: No, V1 creates jobs manually. The existing `practice_task_templates` system handles recurring task generation. A partner creates a job like "Monthly BAS - April 2026" manually, then templates auto-generate tasks under it. Recurring job creation is a V2 enhancement.
- Q: What permissions model applies to practice jobs, allocations, and timesheets? --> A: Use the existing `practice_users` pivot role (owner/member). No new Spatie permissions. Owners can CRUD everything. Members can: create/update jobs, manage allocations on jobs they're allocated to, CRUD their own time entries, view (not edit) other members' time entries. Consistent with the existing PracticeTaskController pattern which uses pivot role checks.
- Q: Where does the WIP dashboard live — new page or tab on existing reports? --> A: Tab on the existing /practice/reports page. Add tabs: "Overview" (existing content), "WIP" (per-job WIP with over-budget flagging), "Utilisation" (per-staff utilisation metrics). The practice dashboard (/practice) shows summary KPI cards (firm utilisation %, overdue timesheets, over-budget jobs) that deep-link to the relevant reports tab.
- Q: How are timezones handled for time entry dates? --> A: The `date` column is a DATE type (no time component), representing the calendar day the work was done. No timezone conversion. "Monday 24 March" is stored as `2026-03-24`. The `timer_started_at` column is a full UTC timestamp for calculating elapsed duration, but the resulting time entry's `date` defaults to the user's current calendar day (determined client-side).
- Q: Can a timesheet grid cell contain multiple time entries for the same job on the same day? --> A: Yes. A cell displays the total hours for that job+day combination. Clicking/focusing the cell expands a mini-panel showing individual entries (each with its own description and duration). This supports working on the same job at different times of day with different descriptions. XPM and Harvest both support this pattern.
- Q: What is the empty state for a practice with no jobs? --> A: Standard empty state pattern: icon (Briefcase), heading "No jobs yet", subtitle "Jobs group tasks and track time budgets for client engagements", primary CTA button "Create Your First Job". Consistent with empty states across MoneyQuest. No onboarding wizard.
- Q: Where do practice job models live — Central or Tenant namespace? --> A: Central (`app/Models/Central/`). Practice jobs are scoped by `practice_id`, not `workspace_id`. They sit alongside `PracticeTask`, `PracticeMemberAssignment`, and other practice entities. The `workspace_id` FK references which client workspace the job relates to, but the primary scope is practice. `StaffAllocation`, `TimeEntry`, and `PracticeJobStatusLog` also go in Central.
