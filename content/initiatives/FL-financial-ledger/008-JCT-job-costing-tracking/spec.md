---
title: "Feature Specification: Job Costing & Tracking"
---

# Feature Specification: Job Costing & Tracking

**Epic**: 008-JCT
**Created**: 2026-03-01
**Status**: Complete
**Initiative**: FL — MoneyQuest Ledger
**Phase**: 2 (Sprints 5–8)
**Design Direction**: Super Modern

---

## Context

The Job Costing & Tracking module enables businesses to create projects/jobs, track costs and revenue against them via journal entry and invoice line tagging, and measure profitability with budget variance analysis. It also provides tracking categories — customisable dimensions (e.g., Department, Location) with options for cross-cutting analytical reporting.

Jobs integrate deeply with the Core Ledger Engine and Invoicing modules — any journal entry line or invoice line can be tagged with a `job_id`, enabling automatic profitability calculation from posted financial data.

### Architectural Context

- **Job profitability from the ledger** — costs and revenue are calculated directly from posted journal entry lines tagged with the job_id, respecting account type (expense = cost, revenue = revenue) and debit/credit direction.
- **Budget tracking** — jobs carry an optional budget (in cents) for variance monitoring.
- **Table name: `project_jobs`** — avoids conflict with Laravel's built-in `jobs` queue table.
- **Tracking categories** — independent of jobs; provide dimensional tagging for journal entry lines via the `tracking` JSON column.
- **No event sourcing** — jobs are standard CRUD entities (not event-sourced like journal entries or invoices).
- **No soft-delete** — jobs are never deleted. Status transitions (active → completed/cancelled) are the management pattern. No destroy endpoint exists.

> **Status enum**: The backend `JobStatus` enum has 4 cases (Active, Completed, OnHold, Cancelled). The frontend TypeScript type mirrors these as `"active" | "completed" | "on_hold" | "cancelled"`.

### Dependencies

| Direction | Epic | Relationship |
|-----------|------|-------------|
| **Depends on** | 002-CLE Core Ledger Engine | Profitability reads from posted journal entry lines |
| **Depends on** | 003-AUT Auth & Multi-tenancy | Workspace scoping, role-based permissions |
| **Integrates with** | 005-IAR Invoicing & AR/AP | Invoice lines can tag a job_id for revenue tracking |
| **Integrates with** | 006-CCM Contacts & Client Mgmt | Jobs optionally link to a contact (client) |
| **Feeds into** | 007-FRC Financial Reporting | Job-tagged lines visible in General Ledger |

---

## User Scenarios & Testing

### User Story 1 — Job Creation & Management (Priority: P1)

A bookkeeper creates and manages jobs/projects with codes, names, budgets, and optional client contacts. Jobs have statuses (Active, Completed, On Hold, Cancelled) and can be searched, filtered, and updated.

**Why this priority**: Jobs must exist before any financial data can be tagged to them. Creation is the entry point for all job costing.

**Independent Test**: A bookkeeper can create a job with code "WEB-001", name "Website Redesign", budget $30,000, and a client contact — then find it in the job list filtered by status "active".

**Acceptance Scenarios**:

1. **Given** a bookkeeper creates a job with code "JOB-001", name "Website Redesign", budget 3000000 ($30,000), and a client contact, **When** the job is saved, **Then** it is created with status "active" and all fields persisted
2. **Given** a job "JOB-001" exists in the workspace, **When** a user attempts to create another job with code "JOB-001", **Then** the system rejects with "This job code already exists in this workspace" (422)
3. **Given** 3 jobs exist with statuses active, completed, and on_hold, **When** a user lists jobs filtered by status "active", **Then** only the active job is returned
4. **Given** a user searches jobs by name "redesign", **When** the list is returned, **Then** jobs matching by name or code are included
5. **Given** a job exists, **When** a user updates name, status to "completed", and budget, **Then** all fields are updated and the fresh job is returned
6. **Given** required fields code and name are missing, **When** the create request is submitted, **Then** a 422 validation error is returned
7. **Given** end_date is before start_date, **When** the job is created, **Then** validation rejects with "end_date must be after or equal to start_date"

---

### User Story 2 — Job Profitability Analysis (Priority: P1)

An accountant or bookkeeper views the profitability of a job — revenue, costs, profit, margin percentage, and budget utilisation. Profitability is calculated in real-time from posted journal entry lines tagged to the job.

**Why this priority**: Profitability is the core purpose of job costing. Without it, jobs are just labels with no financial insight.

**Independent Test**: An accountant can view a job's profitability after posting a $20,000 revenue entry and an $8,000 expense entry tagged to it — seeing profit of $12,000, margin of 60%, and budget remaining of $22,000 against a $30,000 budget.

**Acceptance Scenarios**:

1. **Given** a job with budget $30,000 and posted entries: $20,000 revenue (credit to revenue account) and $8,000 expense (debit to expense account), **When** the profitability endpoint is called, **Then** the response includes: `revenue` = 2000000, `costs` = 800000, `profit` = 1200000, `margin_percent` = 60.00 (float, 2 decimal places), `budget` = 3000000, `budget_remaining` = 2200000, `budget_used_percent` = 26.67 (float, 2 decimal places)
2. **Given** a job with no posted entries, **When** profitability is calculated, **Then** revenue = 0, costs = 0, profit = 0, margin_percent = 0.00, budget_remaining = budget, budget_used_percent = 0.00
3. **Given** only draft (not posted) entries are tagged to a job, **When** profitability is calculated, **Then** they are excluded — only posted entries count
4. **Given** the job list is requested with `include_profitability=true`, **When** the response is returned, **Then** each job includes its profitability summary inline

---

### User Story 3 — Tracking Categories & Options (Priority: P2)

An accountant manages tracking categories (e.g., "Department", "Location") with ordered options (e.g., "Engineering", "Marketing"). These provide customisable dimensional analysis for journal entry lines.

**Why this priority**: Tracking categories are a supplementary analysis tool. They enhance reporting but aren't required for core job costing.

**Independent Test**: An accountant can create a "Department" tracking category, add "Engineering" and "Marketing" options, and see them listed with correct sort order.

**Acceptance Scenarios**:

1. **Given** a user creates tracking category "Department", **When** the category is saved, **Then** it is created with is_active = true and belongs to the workspace
2. **Given** "Department" category exists, **When** a user adds options "Engineering" and "Marketing", **Then** both are created with auto-assigned sort_order (0 and 1)
3. **Given** categories listed, **When** the response is returned, **Then** each category includes its options ordered by sort_order
4. **Given** "Department" already exists in the workspace, **When** a user creates another "Department", **Then** the system rejects with "This tracking category already exists in this workspace" (422)

---

### Edge Cases

- **Job code uniqueness**: Codes unique per workspace — workspace A and workspace B can both have "JOB-001"
- **Profitability with zero revenue**: margin_percent = 0.00 when revenue is zero (division by zero guarded — not NaN or Infinity)
- **Profitability with zero budget**: budget_used_percent = 0.00 and budget_remaining = 0 when budget is null or zero
- **Profitability with negative profit**: margin_percent can be negative (costs exceed revenue) — no floor at 0
- **Job deletion**: No delete endpoint exists — jobs are managed via status transitions (active → completed/cancelled). DELETE requests return 405 Method Not Allowed
- **Cross-workspace job tagging**: Invoice line or JE line with job_id from another workspace → rejected by Form Request validation
- **Reversed entries tagged to job**: Reversed entries are still posted → they appear in profitability but the reversal nets them out
- **Large number of tagged entries**: Profitability calculation queries all posted lines for the job — performance depends on index on (workspace_id, job_id) in journal_entry_lines

---

## Requirements

### Functional Requirements

**Job CRUD**

- **FR-JCT-001**: System MUST support creating jobs with code (unique per workspace, max 20 chars), name, optional description, contact_id, start_date, end_date, budget (cents), and currency
- **FR-JCT-002**: System MUST enforce unique job codes per workspace via after() validation hook
- **FR-JCT-003**: System MUST support job statuses via JobStatus enum: Active, Completed, On Hold, Cancelled
- **FR-JCT-004**: System MUST support updating job name, description, status, contact_id, dates, and budget
- **FR-JCT-005**: Job list MUST support filtering by status, contact_id, and free-text search (name and code)
- **FR-JCT-006**: Job list MUST be paginated (50 per page) and ordered by code

**Profitability**

- **FR-JCT-007**: System MUST calculate job profitability from posted journal entry lines tagged with the job_id
- **FR-JCT-008**: Revenue MUST be calculated from credit-normal revenue accounts (credits - debits)
- **FR-JCT-009**: Costs MUST be calculated from debit-normal expense accounts (debits - credits)
- **FR-JCT-010**: Profit = revenue - costs; margin_percent = (profit / revenue) × 100, rounded to 2 decimal places. Returns 0.00 when revenue = 0 (division guard)
- **FR-JCT-011**: Budget tracking: budget_remaining = budget - costs; budget_used_percent = (costs / budget) × 100, rounded to 2 decimal places. Returns 0.00 when budget is null or zero
- **FR-JCT-012**: Only posted journal entries (status = posted) MUST be included in profitability calculations

**Tracking Categories**

- **FR-JCT-013**: System MUST support creating tracking categories with a name unique per workspace
- **FR-JCT-014**: System MUST support adding ordered options to tracking categories with auto-assigned sort_order
- **FR-JCT-015**: Tracking categories MUST list with their options ordered by sort_order
- **FR-JCT-016**: System MUST support filtering inactive categories via `include_inactive` parameter

**Integration**

- **FR-JCT-017**: Journal entry lines MUST support optional job_id tagging (FK to project_jobs)
- **FR-JCT-018**: Invoice lines MUST support optional job_id tagging (FK to project_jobs)
- **FR-JCT-019**: Job_id references on invoice lines MUST be validated against the current workspace to prevent cross-workspace tagging

**Authorization**

- **FR-JCT-020**: System MUST enforce permissions: `job.view`, `job.create`, `job.update`
- **FR-JCT-021**: Owner, Accountant, and Bookkeeper roles MUST have all job permissions
- **FR-JCT-022**: Approver, Auditor, and Client roles MUST have `job.view` only (read-only)

**Tenant Scoping**

- **FR-JCT-023**: All job data MUST be scoped by workspace_id — no cross-workspace access
- **FR-JCT-024**: Job codes MUST be unique within each workspace (not globally)

### Key Entities

- **Job** (table: `project_jobs`): A project or job tracked for cost analysis. Carries code, name, description, status (JobStatus enum), optional contact, dates, budget (cents), and currency. Profitability is calculated on-demand from tagged journal entry lines.
- **TrackingCategory**: A customisable dimension for analytical reporting (e.g., "Department", "Location"). Unique name per workspace. Has many TrackingOptions.
- **TrackingOption**: An option within a tracking category (e.g., "Engineering", "Marketing"). Ordered by sort_order. Unique name per category.
- **JobStatus**: Enum with 4 cases — Active, Completed, OnHold, Cancelled. Each has a human-readable label.

---

## Success Criteria

### Measurable Outcomes

- **SC-JCT-001**: Job profitability calculation matches manual verification — revenue, costs, profit, and margin all agree with test data
- **SC-JCT-002**: Budget tracking accurately reflects costs against budget — budget_remaining and budget_used_percent verified in integration test
- **SC-JCT-003**: Job code uniqueness enforced per workspace — duplicate codes rejected with clear validation error
- **SC-JCT-004**: Cross-workspace job tagging prevented — invoice lines with foreign workspace job_id rejected (verified by test)
- **SC-JCT-005**: Tracking category and option CRUD works correctly with sort ordering and workspace scoping
- **SC-JCT-006**: Only posted entries contribute to profitability — draft and reversed entries excluded or netted
