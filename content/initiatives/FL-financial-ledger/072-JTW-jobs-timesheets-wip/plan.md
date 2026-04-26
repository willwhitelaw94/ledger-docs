---
title: "Implementation Plan: Practice Jobs, Timesheets & WIP"
---

# Implementation Plan: Practice Jobs, Timesheets & WIP

**Branch**: `072-jobs-timesheets-wip` | **Date**: 2026-04-01 | **Spec**: [spec.md](/initiatives/FL-financial-ledger/072-JTW-jobs-timesheets-wip/spec)
**Epic**: 072-JTW | **Effort**: L (5-6 sprints) | **Priority**: P1

## Summary

Add practice-scoped jobs, staff allocations, timesheets (with running timer), and WIP/utilisation reporting to the practice portal. Jobs group existing practice tasks into engagements with time budgets. Staff log time via a keyboard-navigable spreadsheet grid. WIP dashboard shows per-job and per-staff metrics with colour-coded thresholds.

---

## Technical Context

**Backend**: Laravel 12, PHP 8.4, PostgreSQL
**Frontend**: Next.js 16, React 19, TypeScript, shadcn/ui, TanStack Query v5, Zustand v5
**Auth**: Sanctum cookie SPA + practice_users pivot role checks (owner/member)
**Testing**: Pest v4 (Feature + Unit) + Playwright browser tests
**Performance**: WIP dashboard <2s for 100 jobs / 500 time entries (SC-JTW-003)
**Constraints**: All time values stored as integer minutes. All money values as integer cents. Models scoped by practice_id in Central namespace.

### Dependencies

| Dependency | Status | Impact |
|-----------|--------|--------|
| 027-PMV Practice Management v2 | Complete | PracticeTask model, practice_users pivot, workspace groups |
| 008-JCT Job Costing & Tracking | Complete | project_jobs table (optional FK cross-reference) |
| PracticeTaskController patterns | Existing | Auth pattern, route structure, action conventions |
| react-hotkeys-hook | Existing | Keyboard shortcuts for timesheet grid |

---

## Gate 3: Architecture Check

### 1. Technical Feasibility — PASS

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | Follows existing PracticeTask pattern exactly |
| Existing patterns leveraged | PASS | Central models, Lorisleiva Actions, pivot role auth |
| No impossible requirements | PASS | All FRs are standard CRUD + aggregation |
| Performance considered | PASS | Indexed queries, GROUP BY aggregation for WIP |
| Security considered | PASS | practice_id scoping, pivot role checks, no cross-practice leakage |

### 2. Data & Integration — PASS

| Check | Status | Notes |
|-------|--------|-------|
| Data model understood | PASS | 4 new tables, 2 column additions to existing tables |
| API contracts clear | PASS | ~15 new endpoints under /api/practice/ |
| Dependencies identified | PASS | No new packages required |
| Integration points mapped | PASS | PracticeTask FK addition, practice_users pivot columns |
| DTO persistence explicit | PASS | Actions receive validated data, not raw DTOs |

### 3. Implementation Approach — PASS

| Check | Status | Notes |
|-------|--------|-------|
| File changes identified | PASS | See phase breakdown below |
| Risk areas noted | PASS | Spreadsheet grid UX, timer cross-portal visibility |
| Testing approach defined | PASS | Feature tests per endpoint, browser tests for grid |
| Rollback possible | PASS | Feature flag + nullable FK means safe rollback |

### 4. Resource & Scope — PASS

| Check | Status | Notes |
|-------|--------|-------|
| Scope matches spec | PASS | No over-engineering beyond spec FRs |
| Effort reasonable | PASS | L estimate (5-6 sprints) appropriate for 5 user stories |
| Skills available | PASS | Standard Laravel + React patterns |

### 5. Laravel Best Practices — PASS

| Check | Status | Notes |
|-------|--------|-------|
| Use Lorisleiva Actions | PASS | All business logic in Actions |
| Model route binding | PASS | Controllers receive PracticeJob, not int $id |
| No hardcoded business logic | PASS | Status enum, thresholds configurable |
| Migrations schema-only | PASS | No data operations in migrations |
| Feature flags dual-gated | PASS | `practice_timesheets` Pennant flag + API response |

### 6. Frontend Standards (Next.js/React Override) — PASS

| Check | Status | Notes |
|-------|--------|-------|
| All components TypeScript | PASS | .tsx strict, no any |
| Props typed with interfaces | PASS | Type definitions for all API responses |
| TanStack Query for server state | PASS | Hooks for jobs, allocations, time entries, WIP |
| Zustand for client state | PASS | Timer store (cross-portal), grid navigation state |
| React Hook Form + Zod | PASS | Job create/edit forms |
| shadcn/ui components reused | PASS | Command, Popover, Table, Badge, Progress, Tabs |

---

## Data Model

### New Tables

#### `practice_jobs`

| Column | Type | Constraints |
|--------|------|-------------|
| id | bigint PK | auto-increment |
| practice_id | bigint FK | practices.id, CASCADE, indexed |
| workspace_id | bigint FK | workspaces.id, SET NULL, nullable |
| name | varchar(255) | required |
| description | text | nullable |
| status | varchar(20) | PracticeJobStatus enum, default 'active' |
| time_budget_minutes | int | nullable (0 = no budget) |
| due_date | date | nullable |
| assignee_id | bigint FK | users.id, SET NULL, nullable |
| created_by_user_id | bigint FK | users.id, CASCADE |
| project_job_id | bigint FK | project_jobs.id, SET NULL, nullable |
| created_at | timestamp | |
| updated_at | timestamp | |

**Indexes**: `[practice_id, status]`, `[practice_id, workspace_id]`, `[assignee_id]`, `[due_date]`

#### `practice_job_status_log`

| Column | Type | Constraints |
|--------|------|-------------|
| id | bigint PK | auto-increment |
| practice_job_id | bigint FK | practice_jobs.id, CASCADE |
| user_id | bigint FK | users.id, CASCADE |
| from_status | varchar(20) | nullable (null for creation) |
| to_status | varchar(20) | required |
| created_at | timestamp | |

#### `practice_staff_allocations`

| Column | Type | Constraints |
|--------|------|-------------|
| id | bigint PK | auto-increment |
| practice_job_id | bigint FK | practice_jobs.id, CASCADE |
| user_id | bigint FK | users.id, CASCADE |
| budgeted_minutes | int | required |
| created_at | timestamp | |
| updated_at | timestamp | |

**Unique**: `[practice_job_id, user_id]`

#### `practice_time_entries`

| Column | Type | Constraints |
|--------|------|-------------|
| id | bigint PK | auto-increment |
| practice_id | bigint FK | practices.id, CASCADE |
| user_id | bigint FK | users.id, CASCADE |
| practice_job_id | bigint FK | practice_jobs.id, CASCADE |
| date | date | required |
| duration_minutes | int | required |
| description | text | nullable |
| billable | boolean | default true |
| timer_started_at | timestamp | nullable (UTC) |
| created_at | timestamp | |
| updated_at | timestamp | |

**Indexes**: `[practice_id, user_id, date]`, `[practice_job_id]`, `[user_id, date]`

### Existing Table Modifications

#### `practice_tasks` — add column

| Column | Type | Constraints |
|--------|------|-------------|
| practice_job_id | bigint FK | practice_jobs.id, SET NULL, nullable |

#### `practice_users` — add columns

| Column | Type | Constraints |
|--------|------|-------------|
| weekly_capacity_minutes | int | default 2400 (40h) |
| cost_rate_cents | int | nullable |
| timesheet_submission_day | tinyint | default 1 (Monday, 0=Sun..6=Sat) |
| timesheet_submission_hour | tinyint | default 9 (9:00am) |

### Enums

```php
// app/Enums/PracticeJobStatus.php
enum PracticeJobStatus: string
{
    case Active = 'active';
    case OnHold = 'on_hold';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
}
```

### Entity Relationship Diagram

```
Practice (existing)
├── PracticeJob (new) ──────────────> Workspace (existing, nullable FK)
│   ├── StaffAllocation (new) ──────> User (existing)
│   ├── TimeEntry (new) ────────────> User (existing)
│   ├── PracticeTask (existing) ←── practice_job_id (new nullable FK)
│   ├── PracticeJobStatusLog (new)
│   └── ProjectJob (existing, optional FK cross-ref)
│
├── practice_users (existing pivot)
│   ├── weekly_capacity_minutes (new)
│   ├── cost_rate_cents (new)
│   └── timesheet_submission_day/hour (new)
```

---

## API Contracts

All endpoints under `Route::middleware(['auth:sanctum'])->prefix('practice')`.

### Practice Jobs

| Method | Endpoint | Action | Auth |
|--------|----------|--------|------|
| GET | /jobs | List jobs (filtered) | member |
| GET | /jobs/counts | Status counts for tabs | member |
| POST | /jobs | Create job | member |
| GET | /jobs/{job} | Job detail + WIP summary | member |
| PATCH | /jobs/{job} | Update job | member (own) / owner (all) |
| PATCH | /jobs/{job}/status | Change status | member |
| DELETE | /jobs/{job} | Delete (only if no time entries) | owner |

### Staff Allocations

| Method | Endpoint | Action | Auth |
|--------|----------|--------|------|
| GET | /jobs/{job}/allocations | List allocations for job | member |
| POST | /jobs/{job}/allocations | Create/update allocation | member (allocated) / owner |
| DELETE | /jobs/{job}/allocations/{allocation} | Remove allocation | owner |

### Time Entries

| Method | Endpoint | Action | Auth |
|--------|----------|--------|------|
| GET | /time-entries | List entries (week/user/job filter) | member |
| GET | /time-entries/weekly | Timesheet grid data (job rows × day columns) | member |
| POST | /time-entries | Create entry | member (own) |
| PATCH | /time-entries/{entry} | Update entry | member (own) / owner (all) |
| DELETE | /time-entries/{entry} | Delete entry | member (own) / owner (all) |

### Timer

| Method | Endpoint | Action | Auth |
|--------|----------|--------|------|
| GET | /timer | Get active timer state | member |
| POST | /timer/start | Start timer on a job | member |
| POST | /timer/stop | Stop timer + create entry | member |

### WIP & Utilisation

| Method | Endpoint | Action | Auth |
|--------|----------|--------|------|
| GET | /reports/wip | WIP summary (jobs + firm totals) | member |
| GET | /reports/utilisation | Staff utilisation for period | member |
| GET | /reports/wip/jobs/{job} | Per-job staff breakdown | member |

### Staff Settings

| Method | Endpoint | Action | Auth |
|--------|----------|--------|------|
| PATCH | /members/{user}/capacity | Update weekly capacity + cost rate | owner |

---

## Implementation Phases

### Phase 1: Foundation — Data Model & Job CRUD (Sprint 1)

**Backend:**
- Migration: `create_practice_jobs_table` (includes status_log, staff_allocations)
- Migration: `create_practice_time_entries_table`
- Migration: `add_practice_job_id_to_practice_tasks`
- Migration: `add_capacity_columns_to_practice_users`
- Enum: `PracticeJobStatus`
- Models: `PracticeJob`, `PracticeJobStatusLog`, `StaffAllocation`, `TimeEntry` (all in `app/Models/Central/`)
- Actions: `CreatePracticeJob`, `UpdatePracticeJob`, `UpdatePracticeJobStatus`, `DeletePracticeJob`
- Controller: `PracticeJobController` (CRUD + counts)
- API Resources: `PracticeJobResource`, `PracticeJobCollection`
- Routes: /api/practice/jobs/*
- Feature flag: `practice_timesheets` via Pennant

**Frontend:**
- Types: `PracticeJob`, `PracticeJobStatus`, `StaffAllocation`, `TimeEntry` in `types/practice.ts`
- Hook: `use-practice-jobs.ts` (TanStack Query)
- Page: `/practice/jobs` — refactor to job-centric view with StatusTabs (Jobs tab + Tasks tab)
- Component: `PracticeJobCard` — name, workspace, assignee, budget progress bar, task count, due date
- Component: `CreateJobDialog` — React Hook Form + Zod (name, workspace, budget, due date, assignee)
- Page: `/practice/jobs/[id]` — job detail with tabs (Overview, Tasks, Allocations, Time Log)
- Empty state for no jobs

**Tests:**
- Feature: PracticeJobController CRUD (8-10 tests)
- Feature: Auth — member vs owner access (4 tests)
- Feature: Job deletion blocked when time entries exist (1 test)
- Unit: PracticeJobStatus enum (1 test)

### Phase 2: Staff Allocations (Sprint 2)

**Backend:**
- Actions: `UpsertStaffAllocation`, `RemoveStaffAllocation`
- Controller: `PracticeStaffAllocationController`
- API Resource: `StaffAllocationResource`
- Routes: /api/practice/jobs/{job}/allocations
- Action: `UpdateStaffCapacity` (weekly_capacity_minutes, cost_rate_cents)
- Extend PracticeJob resource to include allocation summary

**Frontend:**
- Component: `StaffAllocationPanel` — inline edit grid (member × budgeted hours)
- Component: `CapacityBadge` — over/under allocation warning
- Hook: `use-staff-allocations.ts`
- Integrate into job detail page (Allocations tab)
- Staff settings: capacity + cost rate on /practice/staff page or /practice/settings

**Tests:**
- Feature: Allocation CRUD (4 tests)
- Feature: Over-allocation warning calculation (2 tests)
- Feature: Capacity update (2 tests)

### Phase 3: Timesheets & Timer (Sprint 3-4)

**Backend:**
- Actions: `CreateTimeEntry`, `UpdateTimeEntry`, `DeleteTimeEntry`
- Actions: `StartTimer`, `StopTimer`
- Controller: `PracticeTimeEntryController` (CRUD + weekly grid endpoint)
- Controller: `PracticeTimerController` (start/stop/status)
- API Resources: `TimeEntryResource`, `TimesheetGridResource` (grouped by job × day)
- Artisan command: `practice:cleanup-timers` (cap >12h timers, scheduled daily)
- Routes: /api/practice/time-entries/*, /api/practice/timer/*

**Frontend:**
- Hook: `use-time-entries.ts`, `use-timer.ts`
- Store: `timer.ts` (Zustand — cross-portal timer state, polled from API)
- Page: `/practice/timesheets` — weekly grid view
- Component: `TimesheetGrid` — spreadsheet-mode grid (arrow keys, type-to-enter, auto-save on blur)
- Component: `TimesheetCell` — shows total hours, expands to show individual entries on click
- Component: `TimesheetWeekPicker` — arrows + date picker for week navigation
- Component: `TeamTimesheetToggle` — my/team switch with member/job filters
- Component: `RunningTimerIndicator` — shown in PracticeShell header + workspace sidebar
- Component: `TimerStopDialog` — adjust duration + add description before saving
- Practice shell nav: add "Timesheets" between Jobs and Staff (Clock icon)

**Tests:**
- Feature: TimeEntry CRUD (6 tests)
- Feature: Timer start/stop lifecycle (4 tests)
- Feature: Timer cleanup command (2 tests)
- Feature: Weekly grid aggregation endpoint (3 tests)
- Feature: Multi-entry per cell (2 tests)
- Feature: Auth — own entries vs others' entries (3 tests)
- Browser: Timesheet grid keyboard navigation (3 tests)
- Browser: Timer start/stop flow (2 tests)

### Phase 4: WIP Dashboard & Utilisation (Sprint 5)

**Backend:**
- Actions: `CalculateJobWip`, `CalculateStaffUtilisation`, `CalculateFirmMetrics`
- Controller: `PracticeWipReportController` (firm summary, per-job, per-staff)
- API Resources: `WipSummaryResource`, `StaffUtilisationResource`
- Routes: /api/practice/reports/wip, /api/practice/reports/utilisation

**Frontend:**
- Hook: `use-wip-reports.ts`
- Page: `/practice/reports` — add WIP and Utilisation tabs
- Component: `WipJobsTable` — job name, workspace, budget/actual/remaining, % complete, status badge (green/amber/red), due date
- Component: `StaffUtilisationTable` — name, capacity, logged, allocated, utilisation %, availability, colour-coded
- Component: `FirmWipSummary` — top-level KPI cards (total budget, actual, WIP, firm utilisation %)
- Component: `WipJobDetail` — drill-down per-staff breakdown for a job
- Component: `StaffDetailPanel` — job allocations, time entries, weekly heatmap
- Component: `DateRangeSelector` — this week / last week / month / quarter / custom
- Practice dashboard: add KPI cards that deep-link to WIP/Utilisation tabs

**Tests:**
- Feature: WIP calculation accuracy (4 tests)
- Feature: Utilisation calculation matches manual (2 tests)
- Feature: Date range filtering (3 tests)
- Feature: Dollar-valued WIP when cost_rate_cents populated (2 tests)

### Phase 5: Polish & Edge Cases (Sprint 5-6)

**Backend:**
- Soft submission deadline: overdue timesheet detection query
- Job completion: flag linked tasks with "Job completed" status
- Workspace disconnection: archive active jobs for disconnected workspace
- Staff removal: flag allocations as "member removed"

**Frontend:**
- Component: `TimesheetOverdueBanner` — shown after submission deadline
- Component: `LateTimesheetsCount` — manager dashboard widget
- Component: `JobCompletedBanner` — on tasks belonging to completed jobs
- Keyboard shortcuts: register timesheet shortcuts in `?` help overlay
- Empty states for all new pages
- Loading skeletons for grid and tables

**Tests:**
- Feature: Submission deadline detection (2 tests)
- Feature: Job completion flags tasks (2 tests)
- Feature: Workspace disconnect archives jobs (1 test)
- Browser: Full flow — create job, allocate, log time, view WIP (1 test)

---

## File Changes Summary

### New Files (~40 files)

**Backend (20 files):**
- 4 migrations
- 1 enum
- 4 models (Central/)
- 8 actions (Practice/)
- 3 controllers (Api/)
- 6 API resources
- 1 artisan command

**Frontend (20 files):**
- 1 type file extension
- 4 hooks
- 1 Zustand store
- 2 pages
- ~12 components

### Modified Files (~8 files)

- `routes/api.php` — add practice job/timesheet/timer/report routes
- `app/Models/Central/PracticeTask.php` — add `practiceJob()` relationship
- `app/Providers/AppServiceProvider.php` — register Pennant flag
- `frontend/src/components/practice/practice-shell.tsx` — add Timesheets nav + timer indicator
- `frontend/src/components/layout/app-sidebar.tsx` — add timer indicator to workspace sidebar
- `frontend/src/lib/navigation.ts` — (if needed for shortcut registration)
- `frontend/src/types/practice.ts` or `types/index.ts` — add new types

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Spreadsheet grid UX complexity | Medium | High | Use proven pattern (TanStack Table + custom cell editing). Prototype early in Phase 3. |
| Timer state across portals | Medium | Medium | Zustand store polls API every 30s. Server is source of truth. |
| WIP performance at scale | Low | Medium | Indexed queries, GROUP BY aggregation. Benchmark with 100 jobs / 500 entries. |
| practice_job_id FK breaking existing tasks | Low | High | Nullable FK, no migration backfill, existing tasks unaffected. |
| Multi-entry cells adding grid complexity | Medium | Medium | Start with single-entry cells, add multi-entry expansion in Phase 3b if time allows. |

---

## Testing Strategy

### Test Counts by Phase

| Phase | Feature | Unit | Browser | Total |
|-------|---------|------|---------|-------|
| 1. Jobs | 13 | 1 | 0 | 14 |
| 2. Allocations | 8 | 0 | 0 | 8 |
| 3. Timesheets | 20 | 0 | 5 | 25 |
| 4. WIP | 11 | 0 | 0 | 11 |
| 5. Polish | 5 | 0 | 1 | 6 |
| **Total** | **57** | **1** | **6** | **64** |

### Test Execution

```bash
# Run all 072-JTW tests
php artisan test --filter=PracticeJob
php artisan test --filter=TimeEntry
php artisan test --filter=Timer
php artisan test --filter=Wip

# Browser tests
FRONTEND_URL=http://localhost:3001 vendor/bin/pest tests/Browser/TimesheetTest.php
```

---

## Next Steps

1. `/speckit-tasks` — Generate implementation task list from this plan
2. `/trilogy-clarify-dev` — Refine technical approach if needed
3. `/trilogy-db-visualiser` — Interactive canvas DB schema for this epic
