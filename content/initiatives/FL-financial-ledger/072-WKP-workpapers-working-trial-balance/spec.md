---
title: "Feature Specification: Workpapers & Working Trial Balance"
---

# Feature Specification: Workpapers & Working Trial Balance

**Feature Branch**: `072-WKP-workpapers-working-trial-balance`
**Created**: 2026-03-31
**Status**: Draft
**Epic**: 072-WKP
**Initiative**: FL — Financial Ledger Platform
**Effort**: XL (6 sprints)
**Depends On**: 002-CLE (complete — core ledger engine), 015-ACT (complete — practice management), 019-YEA (partial — year-end close & adjusting entries), 012-ATT (complete — attachments), 027-PMV (complete — practice management v2), 023-EML (partial — email infrastructure for client queries)

### Out of Scope

- **Inter-company adjusting journals** — posting journals across entities from the WTB interface (future: family loan matrix, inter-entity reconciliation)
- **Automated workpaper generation** — AI-assisted workpaper preparation from ledger data
- **Audit management** — formal audit planning, risk assessment, and audit programme tracking (separate epic)
- **Consolidated working trial balance** — rolling up WTB across multiple entities in a family group (deferred to 028-CFT)
- **Standard audit procedures** — tick marks, leading/trailing schedules, PBC tracking
- **Client-facing workpaper sharing** — workpapers are internal to the practice; client visibility is out of scope
- **Time tracking on workpapers** — practice billing per workpaper is out of scope (separate practice billing epic)

---

## Overview

Accounting practices preparing year-end accounts, tax returns, and compliance work rely on a structured workpaper system to document their work, reconcile account balances, and track review progress. Today, this is done in Excel workbooks with multiple tabs — one per account or reconciliation area. MoneyQuest Ledger's year-end close (019-YEA) provides basic workpaper notes attached to period close records, but lacks the structured, account-level workpaper system that practices use daily.

This epic delivers two connected capabilities:

1. **Working Trial Balance (WTB)** — a practice-facing view of every account balance with current year, prior year, variance, and the ability to post adjusting journal entries directly. Each account links to its supporting workpaper.

2. **Workpapers** — a structured workpaper system grouped by traditional reconciliation categories (Bank Reconciliation, Accounts Receivable, Fixed Assets, etc.), each containing individual account workpapers with status tracking, document attachments, notes, and a multi-role review workflow (preparer → reviewer → partner sign-off).

Client queries raised during workpaper preparation flow into the **Requests** ticketing system for email-based follow-up — distinct from internal practice **Tasks**.

**Competitor context**: CaseWare leads on structured workpapers with audit trail. MYOB Practice leads on WTB with adjusting journal integration. BGL leads on SMSF workpapers with ATO-aligned templates. This spec adopts the strongest patterns from each while integrating with MoneyQuest's existing ledger engine and practice management infrastructure.

---

## User Scenarios & Testing

### User Story 1 — Working Trial Balance: View Balances with Variance (Priority: P1)

An accountant opens a client workspace at year-end and needs to see every account's current year balance alongside the prior year balance, with the variance between them calculated automatically. This is the starting point for all year-end work — the accountant scans the WTB to identify accounts that need attention, large variances that require explanation, and balances that need adjustment.

**Why this priority**: The WTB is the central navigation hub for year-end work. Every other feature in this epic (adjusting journals, workpapers, status tracking) hangs off the WTB. Without it, accountants have no consolidated view of the work to be done.

**Independent Test**: Can be tested by creating a workspace with chart accounts, posting transactions for the current and prior year, navigating to the WTB, and verifying all accounts display with correct current year balance, prior year balance, and variance.

**Acceptance Scenarios**:

1. **Given** I am an Accountant or Owner viewing a client workspace, **When** I navigate to the Working Trial Balance page, **Then** I see a table listing every chart account grouped by account type (Assets, Liabilities, Equity, Revenue, Expenses) with columns: Account Code, Account Name, Current Year Balance, Prior Year Balance, Variance, Adjusted Balance, and Workpaper Status.

2. **Given** a chart account has transactions in both the current and prior year, **When** the WTB loads, **Then** the Current Year Balance shows the sum of all posted transactions for the current accounting period, the Prior Year Balance shows the sum for the prior period, and the Variance is calculated as Current Year minus Prior Year.

3. **Given** a chart account has no transactions in the current year but had a balance in the prior year, **When** the WTB loads, **Then** Current Year Balance shows zero, Prior Year Balance shows the historical amount, and Variance shows the full decrease.

4. **Given** no adjusting journals have been posted for an account, **When** the WTB loads, **Then** the Adjusted Balance column equals the Current Year Balance.

5. **Given** the WTB is displayed, **When** I click on an account row, **Then** I am navigated to that account's workpaper detail page where I can reconcile back to the WTB balance.

6. **Given** the WTB is displayed, **When** I apply a filter for "Large Variance (>10%)", **Then** only accounts where the absolute variance exceeds 10% of the prior year balance are shown.

7. **Given** I am a Bookkeeper role, **When** I navigate to the WTB, **Then** I can view the WTB in read-only mode — I cannot post adjusting journals or change workpaper statuses.

---

### User Story 2 — Post Adjusting Journals from the Working Trial Balance (Priority: P1)

An accountant reviewing the WTB identifies an account that needs a year-end adjustment (e.g., accrued expenses, depreciation, prepayment reversal). They want to post the adjusting journal directly from the WTB without navigating to the journal entry page. The WTB immediately reflects the adjusted balance.

**Why this priority**: Adjusting journals are the core action accountants take from the WTB. If they have to leave the WTB to post adjustments, the workflow breaks — they lose context and must navigate back. This tight integration is what makes the WTB a working tool rather than just a report.

**Independent Test**: Can be tested by viewing the WTB, clicking "Add Journal" on an account, posting a balanced adjusting entry, and verifying the Adjusted Balance column updates without leaving the page.

**Acceptance Scenarios**:

1. **Given** I am viewing the WTB as an Accountant or Owner, **When** I click "Add Journal" on an account row, **Then** a journal entry form opens (modal or slide-over) pre-populated with the current account and the entry type defaulting to "Year-End Adjustment".

2. **Given** I am in the adjusting journal form, **When** I add debit/credit lines, enter a memo, and submit a balanced entry, **Then** the journal entry is posted with entry type "Year-End Adjustment" and the WTB's Adjusted Balance column for the affected accounts updates immediately.

3. **Given** an adjusting journal has been posted from the WTB, **When** I view the WTB, **Then** the Adjusted Balance column shows Current Year Balance plus/minus all adjusting journal entries for that account, and a badge shows the number of adjusting entries.

4. **Given** I click on the adjusting entries badge for an account, **When** the detail opens, **Then** I see a list of all adjusting journal entries affecting that account with date, memo, amount, and a link to each full journal entry.

5. **Given** I attempt to post an unbalanced adjusting journal, **When** I submit, **Then** the system rejects the entry with a validation error — debits must equal credits.

6. **Given** the accounting period is locked, **When** I attempt to add an adjusting journal from the WTB, **Then** the system allows it — Year-End Adjustment entries are exempt from period lock (per 019-YEA FR-008).

---

### User Story 3 — Workpaper Groups and Account-Level Workpapers (Priority: P1)

An accountant needs their workpapers organised by reconciliation category — just like the tabs in their traditional Excel workbook. Each category (e.g., "Bank Reconciliation", "Accounts Receivable", "Fixed Assets") contains the individual accounts from the ledger that belong to that area, with their current and prior year balances.

**Why this priority**: The workpaper tab structure is how every accountant in Australia (and globally) organises their year-end work. Without this grouping, workpapers are a flat list of accounts — which is how the WTB already works. The grouping adds the workflow dimension.

**Independent Test**: Can be tested by navigating to the Workpapers tab, viewing the default groups, clicking into a group, and verifying the individual account workpapers display with correct balances.

**Acceptance Scenarios**:

1. **Given** I am an Accountant or Owner viewing a client workspace, **When** I navigate to the Workpapers tab, **Then** I see workpapers grouped by category. Default categories include: Cash & Bank, Accounts Receivable, Inventory, Prepayments, Fixed Assets, Intangible Assets, Accounts Payable, Provisions, Loans & Borrowings, Equity, Revenue, Cost of Sales, Operating Expenses, Other Income & Expenses, Tax.

2. **Given** a workpaper group "Cash & Bank" exists, **When** I click into it, **Then** I see the individual chart accounts that belong to this group (e.g., "ANZ Business Account", "CBA Trust Account"), each showing: Account Code, Account Name, Current Year Balance, Prior Year Balance, and Workpaper Status.

3. **Given** a new workspace is set up, **When** the accountant first accesses Workpapers, **Then** the system auto-generates workpaper groups based on chart account types and categories, mapping each account to its natural workpaper group.

4. **Given** the default grouping doesn't suit the practice, **When** the accountant edits the workpaper structure, **Then** they can create custom groups, rename groups, move accounts between groups, and delete empty groups. Custom grouping is saved per workspace per period.

5. **Given** a workpaper group contains 5 accounts, **When** I view the group, **Then** I see an aggregate status summary (e.g., "2 of 5 completed") and the group's overall status is derived from the lowest-status workpaper within it.

---

### User Story 4 — Workpaper Status Workflow with Multi-Role Assignment (Priority: P1)

An accountant (preparer) works through each workpaper — reconciling the balance, attaching supporting documents, and marking it as ready for review. A senior accountant (reviewer) then checks the work and either approves it or sends it back for rework. Finally, a partner (final reviewer) signs off on the completed workpaper. Each workpaper moves through a configurable status workflow.

**Why this priority**: The multi-role review workflow is what makes this a practice management tool rather than just a file storage system. It enforces quality control, tracks who did what, and ensures every workpaper goes through proper review before the year-end is finalised.

**Independent Test**: Can be tested by assigning a preparer, reviewer, and final reviewer to a workpaper, then moving the workpaper through each status and verifying assignments, permissions, and audit trail at each step.

**Acceptance Scenarios**:

1. **Given** a workpaper for an account exists, **When** I view its status, **Then** the status is one of the configurable statuses. Default statuses are: Not Started, In Progress, Client Query, Rework Required, Ready for Review, Ready for Final Review, Completed, Finalised.

2. **Given** a practice wants different statuses, **When** the practice owner navigates to Practice Settings > Workpaper Statuses, **Then** they can add, rename, reorder, and remove statuses. The minimum set (Not Started, In Progress, Completed) cannot be removed.

3. **Given** a workpaper, **When** I view its assignments panel, **Then** I see three assignable roles: Preparer, Reviewer, and Final Reviewer. Each can be assigned to any practice member with access to the workspace.

4. **Given** I am the assigned Preparer, **When** I complete my reconciliation work and set the status to "Ready for Review", **Then** the Reviewer is notified (in-app notification) that the workpaper is ready for their review.

5. **Given** I am the assigned Reviewer, **When** I review the workpaper and find issues, **Then** I can set the status to "Rework Required" with a note explaining what needs correction. The Preparer is notified.

6. **Given** I am the assigned Reviewer, **When** I approve the workpaper, **Then** I set the status to "Ready for Final Review" and the Final Reviewer (partner) is notified.

7. **Given** I am the assigned Final Reviewer (partner), **When** I sign off the workpaper, **Then** the status moves to "Finalised" and the workpaper is locked — no further edits to the status or content unless an Accountant or Owner explicitly reopens it.

8. **Given** a workpaper has been moved through statuses, **When** I view the workpaper's activity log, **Then** I see a timeline of every status change with: who changed it, when, from which status, to which status, and any notes.

---

### User Story 5 — Attach Documents and Files to Workpapers (Priority: P1)

An accountant reconciling a bank account needs to attach the bank statement PDF to the workpaper. An accountant reviewing fixed assets needs to attach the depreciation schedule. Every workpaper needs the ability to attach supporting documents that tie back to the balance shown on the WTB.

**Why this priority**: Document attachment is what makes a workpaper a workpaper — without supporting evidence, it's just a status tracker. The attachment proves the balance is correct.

**Independent Test**: Can be tested by opening a workpaper, attaching a PDF, and verifying the file appears linked to the workpaper with the correct metadata.

**Acceptance Scenarios**:

1. **Given** I am viewing an account-level workpaper, **When** I click "Attach File", **Then** I can upload one or more files (PDF, Excel, CSV, images) that are linked to this workpaper.

2. **Given** files have been attached to a workpaper, **When** I view the workpaper, **Then** I see a list of attachments with: file name, file type, uploaded by, uploaded date, and file size. I can preview or download each file.

3. **Given** I am attaching a bank statement to a "Cash & Bank" workpaper, **When** the upload completes, **Then** the file is stored using the existing attachment system (012-ATT) and linked to this specific workpaper and account.

4. **Given** a workpaper has the status "Finalised", **When** I attempt to attach or delete files, **Then** the system prevents it — finalised workpapers are locked. An Accountant or Owner must reopen the workpaper first.

5. **Given** multiple files are attached to a workpaper, **When** I view the workpaper, **Then** I can reorder the attachments by drag-and-drop to control the presentation order.

---

### User Story 6 — Add Notes and Client Queries to Workpapers (Priority: P2)

An accountant reconciling an account discovers a discrepancy or needs additional information from the client (e.g., a missing bank statement). They add a note to the workpaper. If the note is a client query, it flows into the Requests ticketing system for email-based follow-up.

**Why this priority**: Notes capture the preparer's reasoning and the reviewer's feedback. Client queries are the bridge between internal workpaper preparation and external client communication. Without notes, the workpaper has no narrative. Without client queries, the accountant must track missing information separately.

**Independent Test**: Can be tested by adding a note to a workpaper, marking it as a client query, and verifying it creates a Request in the ticketing system.

**Acceptance Scenarios**:

1. **Given** I am viewing a workpaper, **When** I click "Add Note", **Then** I can enter a free-text note with my name and timestamp auto-recorded.

2. **Given** I am adding a note, **When** I toggle "Client Query" on, **Then** the note is flagged as a client query and the workpaper status is automatically updated to "Client Query".

3. **Given** a client query note has been added, **When** the note is saved, **Then** a Request is created in the Requests ticketing system with: the query text, the workspace, the account reference, and the workpaper reference. The Request can be emailed to the client.

4. **Given** a client query Request has been resolved (client provides the document), **When** the Request is closed, **Then** the workpaper's client query note is updated with a "Resolved" indicator and the workpaper status can be moved forward.

5. **Given** multiple notes exist on a workpaper, **When** I view the workpaper, **Then** notes are displayed in chronological order with the author, timestamp, and client query flag for each.

6. **Given** I am the assigned Reviewer, **When** I review a workpaper, **Then** I can add reviewer notes that are visually distinct from preparer notes (e.g., different colour or label).

---

### User Story 7 — Pro-Forma Workpaper Templates (Priority: P2)

An accountant clicking into an account from the WTB lands on a workpaper page with a pro-forma template that guides them through the reconciliation. For a bank account, the template shows: opening balance, add receipts, less payments, closing balance per bank statement, reconciling items, and balance per ledger. For fixed assets, it shows: opening cost, additions, disposals, closing cost, opening depreciation, charge, closing depreciation, net book value.

**Why this priority**: Templates reduce errors and ensure consistency. Without them, every preparer builds their reconciliation differently. Templates also make review faster because the reviewer knows exactly where to find each piece of information.

**Independent Test**: Can be tested by clicking into a bank account workpaper and verifying the bank reconciliation template loads with the correct structure and the ledger balance pre-populated.

**Acceptance Scenarios**:

1. **Given** I click into a chart account from the WTB or Workpapers tab, **When** the workpaper page loads and the account is a bank account, **Then** a bank reconciliation template is displayed with fields for: opening balance, add deposits, less withdrawals, closing balance per statement, add outstanding deposits, less unpresented cheques, adjusted bank balance, and balance per ledger (pre-populated from the WTB).

2. **Given** the account is a fixed asset account, **When** the workpaper loads, **Then** a fixed asset schedule template is displayed with fields for: opening cost, additions, disposals, closing cost, opening accumulated depreciation, depreciation charge, closing accumulated depreciation, and net book value.

3. **Given** the account does not match a specific template category, **When** the workpaper loads, **Then** a generic reconciliation template is shown with: ledger balance, supporting detail (free-form area), and reconciliation to WTB.

4. **Given** a practice has custom template needs, **When** the practice owner navigates to Practice Settings > Workpaper Templates, **Then** they can create, edit, and manage custom pro-forma templates that are available across all client workspaces.

5. **Given** a workpaper has been partially filled in using a template, **When** I leave and return to the workpaper, **Then** all entered data is preserved — the template data is saved with the workpaper.

6. **Given** a template includes a "Balance per Ledger" field, **When** the workpaper loads, **Then** this field is auto-populated from the WTB current year balance and is read-only — it always reflects the live ledger balance.

---

### User Story 8 — Workpaper Progress Dashboard (Priority: P3)

A practice manager wants to see workpaper completion progress across all client workspaces from the practice dashboard — how many workpapers are complete, how many are in progress, and which clients are falling behind.

**Why this priority**: This is a reporting/monitoring feature that adds visibility but does not block core workpaper functionality. It becomes valuable once multiple preparers are working across multiple clients.

**Independent Test**: Can be tested by creating workpapers across 3 client workspaces with varying statuses, then viewing the practice dashboard and verifying progress metrics are accurate.

**Acceptance Scenarios**:

1. **Given** I am a practice manager viewing the practice dashboard, **When** workpapers exist across client workspaces, **Then** each client workspace card shows a workpaper completion summary: "X of Y workpapers finalised" with a progress bar.

2. **Given** client workspaces have workpapers at various statuses, **When** I navigate to a "Workpaper Overview" page in the practice portal, **Then** I see a table of all clients with columns: Client Name, Total Workpapers, Not Started, In Progress, Client Query, Ready for Review, Completed, Finalised, and overall completion percentage.

3. **Given** I am viewing the workpaper overview, **When** I filter by "Client Query", **Then** I see only clients that have workpapers in "Client Query" status — highlighting where work is blocked waiting on client information.

4. **Given** a workspace has all workpapers finalised, **When** I view the practice dashboard, **Then** the workspace card shows a "Workpapers Complete" indicator.

---

### Edge Cases

- **Account added mid-year after workpapers are generated**: When a new chart account is created during the current period, a workpaper stub is auto-created and assigned to the appropriate workpaper group based on account type. It starts at "Not Started" status.
- **Account deleted or deactivated**: If a chart account is deactivated and has no current year balance, the workpaper remains visible with a "Deactivated" label and zero balance. It can be marked as "Not Applicable" or finalised with a zero-balance note.
- **Concurrent editing**: If two users open the same workpaper simultaneously, the system uses optimistic concurrency — the second save shows a conflict warning and offers to merge or overwrite.
- **Prior year balance changes**: If prior year balances are restated (e.g., error correction in a prior period), the WTB automatically reflects the updated prior year figures. Workpapers that reference prior year data are flagged for re-review.
- **Workpaper for accounts with no transactions**: Accounts with zero balance in both years still appear on the WTB and Workpapers tab. The accountant can mark these as "Not Applicable" with a single click.
- **Practice with no custom statuses**: If the practice has not configured custom statuses, the default set is used. The defaults cannot be deleted, only extended.
- **Client query raised but Requests system not configured**: If the email/Requests system is not yet set up for the workspace, the client query note is created but the "Email to Client" action is disabled with a message directing the user to configure email settings.
- **Bulk status updates**: An accountant with 50 "Not Applicable" accounts should be able to select multiple workpapers and bulk-update their status in one action.
- **Workpaper for a period that is already closed (019-YEA)**: Workpapers can still be added and edited for closed periods — the year-end close locks journal entries, not workpapers (consistent with 019-YEA FR-026).

---

## Requirements

### Functional Requirements

**Working Trial Balance**

- **FR-001**: System MUST display a Working Trial Balance page for each workspace showing every chart account with: Account Code, Account Name, Current Year Balance, Prior Year Balance, Variance (Current - Prior), Adjusted Balance, and Workpaper Status.
- **FR-002**: WTB accounts MUST be grouped by account type: Assets, Liabilities, Equity, Revenue, Expenses — with subtotals per group and a grand total.
- **FR-003**: Current Year Balance MUST be calculated from all posted journal entry lines for the current accounting period (per workspace accounting period settings).
- **FR-004**: Prior Year Balance MUST be calculated from all posted journal entry lines for the immediately preceding accounting period.
- **FR-005**: Adjusted Balance MUST equal Current Year Balance plus the net of all "Year-End Adjustment" journal entry lines for that account in the current period.
- **FR-006**: System MUST provide an "Add Journal" action on each WTB account row that opens a journal entry form pre-populated with the selected account and entry type "Year-End Adjustment".
- **FR-007**: Adjusting journals posted from the WTB MUST be standard journal entries (going through `JournalEntryAggregate` event sourcing) with entry type "Year-End Adjustment". They are NOT a separate entity.
- **FR-008**: The WTB MUST update the Adjusted Balance column in real-time after an adjusting journal is posted, without requiring a full page reload.
- **FR-009**: Each WTB account row MUST link to its corresponding workpaper detail page.
- **FR-010**: The WTB MUST support filtering: by account type, by variance threshold (>10%, >25%, >50%), by workpaper status, and by accounts with/without adjustments.
- **FR-011**: The WTB MUST be accessible to Accountant, Owner, and Bookkeeper (read-only) roles. Client and Auditor roles MUST NOT see the WTB.

**Workpaper Groups**

- **FR-012**: System MUST organise workpapers into configurable groups. Default groups are derived from chart account categories: Cash & Bank, Accounts Receivable, Inventory, Prepayments, Fixed Assets, Intangible Assets, Accounts Payable, Provisions, Loans & Borrowings, Equity, Revenue, Cost of Sales, Operating Expenses, Other Income & Expenses, Tax.
- **FR-013**: System MUST auto-generate workpaper groups and assign accounts to groups when the Workpapers tab is first accessed for a workspace/period. Assignment is based on chart account type and sub-type.
- **FR-014**: Accountant and Owner roles MUST be able to create, rename, reorder, and delete workpaper groups. Accounts can be moved between groups.
- **FR-015**: Each workpaper group MUST display an aggregate status summary showing the count of workpapers at each status within the group.
- **FR-016**: Workpaper group configuration MUST be saved per workspace per accounting period — different periods can have different groupings.

**Workpaper Entity**

- **FR-017**: Each chart account within a workpaper group MUST have a corresponding Workpaper entity for the current period. Workpapers are the core trackable unit.
- **FR-018**: Each Workpaper MUST display: Account Code, Account Name, Current Year Balance, Prior Year Balance, and Status.
- **FR-019**: Workpapers MUST support file attachments (PDF, Excel, CSV, images) using the existing attachment system (012-ATT).
- **FR-020**: Workpapers MUST support free-text notes with author name and timestamp.
- **FR-021**: Workpaper notes MUST support a "Client Query" flag. When flagged, the workpaper status auto-updates to "Client Query" and a Request is created in the Requests ticketing system.
- **FR-022**: When a client query Request is resolved, the corresponding workpaper note MUST be updated with a "Resolved" indicator.

**Status Workflow**

- **FR-023**: Workpaper statuses MUST be configurable per practice. Default statuses: Not Started, In Progress, Client Query, Rework Required, Ready for Review, Ready for Final Review, Completed, Finalised.
- **FR-024**: The minimum status set (Not Started, In Progress, Completed) MUST NOT be removable.
- **FR-025**: System MUST support three assignable roles per workpaper: Preparer, Reviewer, and Final Reviewer. Each can be assigned to any practice member with access to the workspace.
- **FR-026**: Status transitions MUST trigger in-app notifications to the relevant assignee (e.g., "Ready for Review" notifies the Reviewer).
- **FR-027**: The "Finalised" status MUST lock the workpaper — no edits to status, notes, or attachments unless an Accountant or Owner explicitly reopens it.
- **FR-028**: System MUST log every status change with: who, when, from-status, to-status, and optional note. This forms the workpaper audit trail.
- **FR-029**: System MUST support bulk status updates — selecting multiple workpapers and setting them to the same status in one action.

**Pro-Forma Templates**

- **FR-030**: System MUST provide built-in pro-forma workpaper templates for common reconciliation types: Bank Reconciliation, Accounts Receivable Aging, Fixed Asset Schedule, Loan Reconciliation, Tax Reconciliation, Generic Reconciliation.
- **FR-031**: Bank Reconciliation template MUST include: Opening Balance, Add Deposits, Less Withdrawals, Closing Balance per Statement, Outstanding Deposits, Unpresented Cheques, Adjusted Bank Balance, and Balance per Ledger (auto-populated from WTB).
- **FR-032**: Fixed Asset Schedule template MUST include: Opening Cost, Additions, Disposals, Closing Cost, Opening Accumulated Depreciation, Depreciation Charge, Closing Accumulated Depreciation, and Net Book Value.
- **FR-033**: The "Balance per Ledger" field in all templates MUST be auto-populated from the WTB current year balance and MUST be read-only.
- **FR-034**: Practices MUST be able to create, edit, and manage custom pro-forma templates from Practice Settings > Workpaper Templates.
- **FR-035**: Template data entered by the preparer MUST be persisted with the workpaper and preserved across sessions.

**Client Queries & Requests Integration**

- **FR-036**: Client query notes on workpapers MUST create a corresponding Request in the Requests ticketing system.
- **FR-037**: Requests created from workpaper client queries MUST reference the source workspace, account, and workpaper for traceability.
- **FR-038**: Requests MUST be distinct from Tasks — Requests are client-facing (emailable), Tasks are internal practice work items.
- **FR-039**: If the Requests/email system is not configured for the workspace, client query notes MUST still be creatable but the "Email to Client" action MUST be disabled with a configuration prompt.

**Practice Dashboard Integration**

- **FR-040**: Each client workspace card on the practice dashboard MUST display workpaper completion summary when workpapers exist: "X of Y finalised" with a progress indicator.
- **FR-041**: System MUST provide a Workpaper Overview page in the practice portal showing workpaper progress across all client workspaces with filtering by status.

### Key Entities

- **Working Trial Balance**: A computed view (not a stored entity) derived from chart accounts, journal entry lines for current and prior periods, and adjusting entries. Grouped by account type with subtotals.
- **Workpaper Group**: A named category for organising workpapers within a workspace/period. Attributes: workspace, period, name, display order, is_default (boolean). Examples: "Cash & Bank", "Accounts Receivable".
- **Workpaper**: The core trackable unit — one per chart account per period. Attributes: workspace, period, chart_account, workpaper_group, status, preparer (user), reviewer (user), final_reviewer (user), template_type, template_data (JSON), created_at, updated_at.
- **Workpaper Note**: A timestamped note on a workpaper. Attributes: workpaper, author (user), body (text), is_client_query (boolean), request_id (nullable — link to Requests system), resolved_at (nullable), created_at.
- **Workpaper Status Configuration**: Practice-level configurable status list. Attributes: practice, name, display_order, colour, is_system (boolean — true for minimum statuses that cannot be removed).
- **Workpaper Template**: A reusable pro-forma structure. Attributes: practice (nullable — null for system defaults), name, template_type, field_definitions (JSON), is_system (boolean).
- **Workpaper Activity Log**: An immutable record of every status change. Attributes: workpaper, user, from_status, to_status, note, created_at.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: An accountant can view the complete WTB for a workspace with up to 200 accounts in under 3 seconds (page load to all data rendered).
- **SC-002**: Posting an adjusting journal from the WTB updates the Adjusted Balance column within 1 second without a full page reload.
- **SC-003**: Workpaper status changes trigger notifications to the relevant assignee within 30 seconds.
- **SC-004**: A practice with 20 client workspaces can view the Workpaper Overview page with aggregate progress for all clients in under 5 seconds.
- **SC-005**: 100% of workpaper status changes are recorded in the activity log with the required fields (who, when, from, to, note). Zero status changes occur without an audit trail entry.
- **SC-006**: Client query notes created on workpapers produce corresponding Requests in the ticketing system with correct source references — zero orphaned queries.
- **SC-007**: Template "Balance per Ledger" fields always match the live WTB balance — zero drift between the template field and the actual ledger balance.
- **SC-008**: Finalised workpapers cannot be edited by any user until explicitly reopened — zero unauthorised modifications to finalised workpapers.

---

## Clarifications

### Session 2026-03-31

- Q: Is the WTB a separate page or a tab within the workspace? → A: Two separate tabs on the workspace year-end/practice view: "Working Trial Balance" tab and "Workpapers" tab. Both are accessible from workspace navigation under a "Year-End" or "Compliance" section.
- Q: Can you post inter-company journals from the WTB? → A: No, not in v1. Future feature: family loan matrix where inter-entity loan balances must match (e.g., "Care Vicinity Loan" in Entity A must match "Care Vicinity Tax Loan" in Entity B), with entity loan reconciliation workpapers. Deferred to 028-CFT (Consolidation & Family Tree).
- Q: How do Workpapers relate to 019-YEA (Year-End Close) workpapers? → A: 019-YEA workpapers are simple rich-text notes attached to a period close record. This epic (072-WKP) delivers the full structured workpaper system with account-level tracking, status workflow, templates, and multi-role review. The 072-WKP system supersedes the 019-YEA workpaper notes for practices that adopt it. Both can coexist — 019-YEA notes are attached to the close record, 072-WKP workpapers are attached to individual accounts.
- Q: How are Requests different from Tasks? → A: Requests are client-facing — they represent queries that get emailed to clients (e.g., "Please provide your December bank statement"). Tasks are internal practice work items (e.g., "Prepare Q4 BAS for Smith Pty Ltd"). They are separate entities in separate systems. A workpaper client query creates a Request, not a Task.
- Q: Is the Workpaper entity already built? → A: Yes, the workpaper is its own entity. This spec defines the full feature set around it.
- Q: Should workpaper statuses be shared across all clients or per-client? → A: Per practice — the status configuration is set once at the practice level and applies to all client workspaces under that practice.

---

**Status**: Draft — ready for review
