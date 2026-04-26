---
title: "Feature Specification: Repeating Entries"
---

# Feature Specification: Repeating Entries

**Feature Branch**: `feature/024-rpt-repeating-entries`
**Created**: 2026-03-14
**Status**: Draft

## User Scenarios & Testing

### User Story 1 — Save an Existing Document as Repeating (Priority: P1)

A business owner has just created a monthly invoice for a regular customer (e.g., $2,200 cleaning service to ABC Corp). Instead of recreating this invoice next month, they click "Save as Repeating" and configure it to repeat monthly. The system captures the full document — contact, line items, accounts, tax codes, amounts — and schedules it to auto-create on the 1st of each month.

**Why this priority**: This is the core value proposition. Without the ability to create templates from existing documents, nothing else in the module works.

**Independent Test**: Can be fully tested by creating an invoice, saving it as repeating, and verifying the template appears in the repeating list with correct schedule and payload.

**Acceptance Scenarios**:

1. **Given** a user is viewing an approved invoice, **When** they click "Save as Repeating", **Then** a modal opens with frequency, start date, end date, and max occurrences fields — pre-filled with sensible defaults (monthly, starting next month, no end date).
2. **Given** a user is viewing a bill, **When** they click "Save as Repeating", **Then** the same modal opens with the bill's contact, lines, and accounts captured.
3. **Given** a user is viewing a posted manual journal, **When** they click "Save as Repeating", **Then** the template captures the debit/credit lines and description.
4. **Given** a user submits the repeating modal, **Then** a template is created and appears in the Repeating list with status "Active", the correct frequency, and next due date.
5. **Given** a user sets frequency to "Quarterly" starting 2026-04-01, **Then** the next due date is 2026-04-01 and subsequent dates are 2026-07-01, 2026-10-01, etc.

---

### User Story 2 — View and Manage Repeating Templates (Priority: P1)

A bookkeeper wants to see all repeating entries across the workspace — invoices, bills, and journals — in one place. They navigate to the Repeating page and see a table showing each template's name, type, contact, frequency, next due date, and status. They can pause, resume, edit, or delete any template.

**Why this priority**: Users need visibility and control over what's scheduled. Without this, templates are invisible and unmanageable.

**Independent Test**: Can be tested by navigating to /repeating and verifying templates are listed with correct details and actions work.

**Acceptance Scenarios**:

1. **Given** the workspace has 5 repeating templates (3 invoices, 1 bill, 1 journal), **When** the user navigates to /repeating, **Then** all 5 appear in the table with columns: Name, Type, Contact, Frequency, Next Due, Last Run, Status.
2. **Given** a template with status "Active", **When** the user clicks "Pause", **Then** the status changes to "Paused" and the template will not execute until resumed.
3. **Given** a paused template, **When** the user clicks "Resume", **Then** the status changes to "Active" and the next due date is recalculated from today.
4. **Given** any template, **When** the user clicks "Edit", **Then** they can modify the schedule (frequency, end date, occurrences) and the document payload (lines, amounts, contact).
5. **Given** any template, **When** the user clicks "Delete" and confirms, **Then** the template is permanently removed.
6. **Given** the user is on the Repeating page, **When** they filter by type (Invoice / Bill / Journal), **Then** only templates of that type are shown.

---

### User Story 3 — Automatic Document Creation (Priority: P1)

The system runs a daily scheduled process that checks all active templates. For any template where the next due date has arrived, the system automatically creates the corresponding document (invoice, bill, or manual journal) using the stored payload. The template's schedule advances to the next occurrence.

**Why this priority**: This is the automation that delivers the time-saving value. Without it, templates are just saved drafts.

**Independent Test**: Can be tested by creating a template with next due date = today, running the scheduled process, and verifying the document was created.

**Acceptance Scenarios**:

1. **Given** an active invoice template with next due date = today, **When** the scheduled process runs, **Then** a new draft invoice is created with the template's contact, lines, accounts, and amounts.
2. **Given** the invoice was created successfully, **Then** the template's next due date advances by one frequency period, and occurrences completed increments by 1.
3. **Given** a template with occurrences remaining = 1, **When** the process creates the final document, **Then** the template status changes to "Completed" and no further documents are created.
4. **Given** a template with end date = yesterday, **When** the process runs, **Then** the template is marked "Completed" and no document is created.
5. **Given** a template with invalid payload (e.g., deleted contact), **When** the process runs, **Then** the document is skipped, an error is logged in the execution history, and the template is flagged for review.
6. **Given** the process has already run today for a template, **When** it runs again (e.g., retry), **Then** no duplicate document is created.

---

### User Story 4 — Execution History (Priority: P2)

A business owner wants to see what the repeating module has done — which documents were auto-created, when, and whether any failed. Each template has a history tab showing a chronological log of executions.

**Why this priority**: Provides transparency and auditability. Important but not blocking for the core create/manage/execute flow.

**Independent Test**: Can be tested by running the scheduled process, then viewing the template's history and verifying the log entry exists.

**Acceptance Scenarios**:

1. **Given** the scheduled process created an invoice from a template, **When** the user views the template's history, **Then** they see an entry with: date, document type, document number (linked), and status "Success".
2. **Given** the process failed to create a document (e.g., validation error), **When** the user views the history, **Then** they see an entry with status "Failed" and the error reason.
3. **Given** a template with 12 months of history, **When** the user views the history, **Then** entries are paginated or scrollable, ordered most recent first.

---

### User Story 5 — Repeating Tab on Index Pages (Priority: P2)

The invoices, bills, and manual journals index pages each gain a "Repeating" status tab (alongside the existing All / Draft / Paid etc. tabs). Clicking it shows only documents that were auto-generated from repeating templates, making it easy to distinguish scheduled from manually created entries.

**Why this priority**: Nice-to-have for filtering, but the core module works without it.

**Independent Test**: Can be tested by auto-creating a document via the scheduler, then checking it appears under the "Repeating" tab on the relevant index page.

**Acceptance Scenarios**:

1. **Given** the invoices index page, **When** the user clicks the "Repeating" tab, **Then** only invoices that were generated by a repeating template are shown.
2. **Given** a manually created invoice, **Then** it does NOT appear under the "Repeating" tab.
3. **Given** the "Repeating" tab is active, **Then** each row shows the template name as a secondary label (e.g., "Monthly — ABC Corp Cleaning").

---

### User Story 6 — Dashboard Upcoming Widget (Priority: P3)

The workspace dashboard shows a small widget: "Upcoming Repeating Entries" — listing the next 5 templates due within the coming 7 days. Each entry shows the template name, type icon, amount, and due date. Clicking navigates to the template detail.

**Why this priority**: Quality-of-life improvement. Useful but the module is fully functional without it.

**Independent Test**: Can be tested by creating templates due within 7 days and verifying they appear on the dashboard.

**Acceptance Scenarios**:

1. **Given** 3 templates are due within the next 7 days, **When** the user views the dashboard, **Then** the widget shows those 3 entries with name, type, amount, and date.
2. **Given** no templates are due within 7 days, **Then** the widget shows "No repeating entries due this week".

---

### Edge Cases

- What happens when a template's contact is deleted? — The execution should fail gracefully, log the error, and flag the template for review.
- What happens when a template's chart account is deactivated? — Same as above — fail, log, flag.
- What happens when the workspace currency changes after a template was created? — Templates store amounts in the original currency. If the workspace base currency changes, existing templates continue using their stored currency.
- What happens when the scheduler runs during a deployment (mid-migration)? — The process should be idempotent. If a template's document was partially created, the next run should detect and skip it.
- What happens when a user edits a template that's due today? — The edit takes effect immediately. If the process hasn't run yet, the next execution uses the updated payload.
- Can a paused template accumulate missed periods? — No. When resumed, the next due date is recalculated from today, not from when it was paused. Missed periods are skipped.

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to create repeating templates from existing invoices, bills, and manual journals via a "Save as Repeating" action. Access is governed by the underlying document permission — users who can create invoices can create invoice templates, etc.
- **FR-002**: Each template MUST store: document type, frequency, start date, optional end date, optional max occurrences, and the full document payload (contact, lines, accounts, amounts, tax codes).
- **FR-003**: Supported frequencies MUST include: weekly, fortnightly, monthly, quarterly, yearly.
- **FR-004**: System MUST automatically create documents when a template's next due date arrives, via a daily scheduled process. All auto-created documents MUST land in "draft" status regardless of the source document's status.
- **FR-005**: System MUST advance the template's schedule after each successful execution and track occurrences completed.
- **FR-006**: System MUST prevent duplicate document creation if the scheduled process runs multiple times for the same period.
- **FR-007**: System MUST mark templates as "Completed" when they reach their end date or exhaust their max occurrences.
- **FR-008**: Users MUST be able to view all repeating templates in a dedicated list page with filtering by type and status.
- **FR-009**: Users MUST be able to pause, resume, edit, and delete repeating templates.
- **FR-010**: System MUST log every execution attempt (success or failure) with timestamp, document reference, and error details.
- **FR-011**: System MUST gracefully handle invalid template payloads (deleted contacts, deactivated accounts) by skipping execution, logging the error, and flagging the template.
- **FR-012**: When a paused template is resumed, the next due date MUST be recalculated from the current date — missed periods are not backfilled.
- **FR-013**: Documents created by repeating templates MUST be tagged with the source template reference so they can be filtered on index pages.
- **FR-014**: The workspace dashboard SHOULD display upcoming repeating entries due within the next 7 days.
- **FR-015**: There is no limit on the number of active templates per workspace.
- **FR-016**: When the scheduler catches up after downtime, it MUST create only one document per template (the current period), not backfill missed periods.

### Key Entities

- **Repeating Template**: The schedule definition — stores document type, frequency, schedule bounds, active/paused/completed status, and the full document payload as structured data. One template produces many documents over time.
- **Execution Log**: A record of each time the system attempted to create a document from a template — stores the outcome (success/failure), the created document reference, timestamp, and any error details.
- **Generated Document**: An invoice, bill, or manual journal created by the automated process — identical to manually created documents but tagged with the source template reference.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can create a repeating template from any invoice, bill, or manual journal in under 30 seconds.
- **SC-002**: 100% of due templates are processed within 1 hour of their due date.
- **SC-003**: Zero duplicate documents created across any scheduling period.
- **SC-004**: Users can view, pause, resume, edit, and delete templates without navigating away from the repeating list page.
- **SC-005**: All execution attempts are logged with full traceability from template to generated document.

## Clarifications

### Session 2026-03-14
- Q: Which roles can create/manage repeating templates? -> A: Mirrors underlying document permissions — if you can create invoices, you can create invoice templates
- Q: What happens when a paused template is resumed? -> A: Next due date recalculated from today. Missed periods are skipped, not backfilled.
- Q: What status should auto-created documents land in? -> A: Always "draft" — user reviews before approving
- Q: Should there be a limit on active templates per workspace? -> A: No limit
- Q: When scheduler catches up after downtime, backfill or current only? -> A: Current period only — one document per catch-up, no backfill
