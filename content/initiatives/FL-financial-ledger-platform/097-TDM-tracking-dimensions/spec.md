---
title: "Feature Specification: Tracking Dimensions"
---

# Feature Specification: Tracking Dimensions

**Epic**: 097-TDM
**Created**: 2026-04-01
**Status**: Draft
**Initiative**: FL -- MoneyQuest Ledger

---

## Context

MoneyQuest already supports job-based cost tracking (008-JCT) where journal entry lines and invoice lines can be tagged with a `job_id` for profitability analysis. It also has a foundational `TrackingCategory` / `TrackingOption` model pair created alongside the jobs module, with basic CRUD endpoints on the `JobController`. Journal entry lines store a `tracking` JSON column, but it is not validated, not surfaced in reports, not available on invoice or bill lines, and not wired into any analytical reporting.

Xero offers "Tracking Categories" but limits workspaces to exactly 2 dimensions. MYOB provides 5 "categories". MoneyQuest will support **up to 5 custom tracking dimensions** per workspace, giving accountants the analytical flexibility they need for departmental, regional, fund, or cost-centre reporting without arbitrary limits.

Tracking dimensions are **additional to jobs** -- they coexist. A journal entry line can carry a `job_id` AND dimension values simultaneously. Jobs are for project-level profitability. Dimensions are for cross-cutting analytical segmentation.

### What Already Exists

| Component | Status | Notes |
|-----------|--------|-------|
| `TrackingCategory` model | Basic CRUD | `workspace_id`, `name`, `is_active`. No limit enforcement. |
| `TrackingOption` model | Basic CRUD | `tracking_category_id`, `name`, `is_active`, `sort_order` |
| `tracking` JSON column on `journal_entry_lines` | Exists, unvalidated | Cast to `array`, no schema enforcement |
| `tracking` JSON column on `invoice_lines` | Does not exist | Needs migration |
| `tracking` JSON column on `bill_lines` (via `invoice_lines` for bills) | Does not exist | Bills share the `invoice_lines` table |
| API endpoints | 3 routes on `JobController` | List categories, create category, create option |
| Report filtering by dimension | Does not exist | Reports have no dimension awareness |
| Budget dimension scoping | Partial | `Budget` model has `tracking_category_id` and `tracking_option_value` columns |

### Scope Boundary

**In scope**: Dimension management settings UI, workspace limit enforcement (max 5), dimension tagging on JE/invoice/bill lines, validation of dimension values against active options, report filtering and grouping by dimension, GL dimension columns, bulk dimension tagging, CSV import/export with dimension values.

**Out of scope**: Dimension-based access control (restricting users to see only their department's data), dimension inheritance rules (auto-assigning dimensions based on account or contact), AI-suggested dimension tagging (future 020-AIB integration), dimension-aware bank reconciliation rule matching.

### Dependencies

| Direction | Epic | Relationship |
|-----------|------|-------------|
| **Depends on** | 002-CLE Core Ledger Engine | Dimension values stored on journal entry lines |
| **Depends on** | 003-AUT Auth & Multi-tenancy | Workspace scoping, role-based permissions |
| **Depends on** | 008-JCT Job Costing & Tracking | Existing TrackingCategory/TrackingOption models |
| **Integrates with** | 005-IAR Invoicing & AR/AP | Invoice and bill lines carry dimension values |
| **Integrates with** | 007-FRC Financial Reporting | P&L, BS, TB, GL filterable/groupable by dimension |
| **Integrates with** | 029-BGT Budgets | Budget scoping by tracking dimension |
| **Integrates with** | 043-CRB Custom Report Builder | Dimension as a grouping/filter field in custom reports |
| **Integrates with** | 046-DMI Data Migration & Import | CSV import/export includes dimension columns |

---

## User Scenarios & Testing

### User Story 1 -- Manage Tracking Dimensions (Priority: P1)

As a workspace owner or accountant, I want to create and manage up to 5 tracking dimensions (e.g., Region, Department, Cost Centre, Project, Fund) with named values for each, so that I can tag financial transactions for multi-dimensional analytical reporting.

**Why this priority**: Dimensions must exist before any transaction tagging or report filtering can happen. This is the foundational configuration step.

**Independent Test**: An accountant navigates to Settings > Tracking Dimensions, creates a "Region" dimension with values "NSW", "VIC", "QLD", creates a "Department" dimension with values "Engineering", "Marketing", "Sales", and sees both listed with correct value counts.

**Acceptance Scenarios**:

1. **Given** I am an owner or accountant in a workspace with no tracking dimensions, **When** I navigate to Settings > Tracking Dimensions and create a dimension named "Region", **Then** it is created with `is_active = true` and appears in the dimension list with 0 values.

2. **Given** a "Region" dimension exists, **When** I add values "NSW", "VIC", and "QLD", **Then** all three are created with auto-assigned sort orders (0, 1, 2) and appear under the Region dimension in the settings page.

3. **Given** a workspace already has 5 active tracking dimensions, **When** I attempt to create a 6th dimension, **Then** the system rejects with a validation error: "Maximum of 5 tracking dimensions per workspace" (422).

4. **Given** a workspace has 5 dimensions and one is deactivated (`is_active = false`), **When** I attempt to create a new dimension, **Then** the system still rejects because the limit counts all dimensions (active and inactive), not just active ones.

5. **Given** "Region" already exists in my workspace, **When** I try to create another dimension named "Region", **Then** the system rejects with "This tracking dimension already exists in this workspace" (422).

6. **Given** a "Department" dimension has values "Engineering" and "Marketing", **When** I reorder them by dragging "Marketing" above "Engineering", **Then** the sort_order values are updated and the new order persists on page refresh.

7. **Given** I deactivate the value "QLD" under the "Region" dimension, **When** a user creates a new journal entry, **Then** "QLD" does not appear in the dimension value picker, but existing transactions tagged "QLD" retain their tagging.

8. **Given** I deactivate the entire "Region" dimension, **When** a user creates a new journal entry, **Then** the "Region" dimension does not appear as a tagging option, but existing transactions with Region values retain their data.

9. **Given** a dimension has values in use on posted journal entries, **When** I attempt to delete the dimension, **Then** the system rejects with "Cannot delete a tracking dimension that is in use on posted entries. Deactivate it instead." (422).

10. **Given** I am a bookkeeper or client role user, **When** I navigate to Settings, **Then** I do not see the Tracking Dimensions management section because I lack the `workspace.settings` permission.

---

### User Story 2 -- Tag Transactions with Dimension Values (Priority: P1)

As a bookkeeper or accountant, I want to tag each line of a journal entry, invoice, or bill with values from any active tracking dimension, so that the transaction is classified for analytical reporting.

**Why this priority**: Tagging is the core data-entry interaction. Without it, dimensions are configuration with no utility.

**Independent Test**: A bookkeeper creates a journal entry with two lines. Line 1 is tagged Region = "NSW" and Department = "Engineering". Line 2 is tagged Region = "VIC" with no department. Both lines save successfully and the tags appear when viewing the journal entry detail.

**Acceptance Scenarios**:

1. **Given** workspace has dimensions "Region" (NSW, VIC, QLD) and "Department" (Engineering, Marketing), **When** I create a journal entry and tag line 1 with Region = "NSW" and Department = "Engineering", **Then** the line's `tracking` JSON is saved as `{"Region": "NSW", "Department": "Engineering"}` and the entry is created successfully.

2. **Given** the same workspace dimensions, **When** I create a journal entry and leave all dimension fields empty on a line, **Then** the line saves with `tracking = null` and no validation error (dimensions are optional).

3. **Given** I tag a line with Region = "NSW", **When** I view the journal entry detail, **Then** the Region value "NSW" is displayed alongside the line's account, amount, and description.

4. **Given** a workspace has no active tracking dimensions, **When** I create a journal entry, **Then** no dimension picker fields appear on the line items.

5. **Given** I try to tag a line with Region = "INVALID_VALUE" (a value that does not exist in the Region dimension), **When** the request is submitted, **Then** the server rejects with a 422 validation error specifying the invalid tracking value.

6. **Given** I am creating an invoice (accounts receivable), **When** I add a line item, **Then** I can optionally tag it with dimension values AND a job -- both coexist on the same line.

7. **Given** I am creating a bill (accounts payable), **When** I add a line item, **Then** I can optionally tag it with dimension values using the same dimension picker as invoices and journal entries.

8. **Given** an invoice with dimension-tagged lines is approved and posted, **When** the system generates journal entry lines from the invoice, **Then** the `tracking` JSON is copied from the invoice line to the corresponding journal entry line.

9. **Given** a repeating template has lines with dimension values, **When** the template generates a new draft document, **Then** the generated document's lines carry the same dimension values as the template.

---

### User Story 3 -- Filter and Group Reports by Dimension (Priority: P1)

As an accountant, I want to filter any financial report (Profit & Loss, Balance Sheet, Trial Balance) by a tracking dimension value, and optionally group reports to show a breakdown by dimension, so that I can analyse financial performance by region, department, or any other dimension.

**Why this priority**: Dimensional reporting is the entire purpose of tracking dimensions. Without it, tagging is busywork with no payoff.

**Independent Test**: An accountant runs a Profit & Loss report filtered by Region = "NSW" and sees only revenue and expense lines from transactions tagged with Region = "NSW". They then run the same report grouped by Region and see separate P&L columns for NSW, VIC, and QLD, plus a Total column.

**Acceptance Scenarios**:

1. **Given** the workspace has a "Region" dimension and posted journal entries tagged with Region = "NSW" and Region = "VIC", **When** I run a Profit & Loss report with filter `tracking_region=NSW`, **Then** only journal entry lines where `tracking->Region = 'NSW'` are included in the report calculations.

2. **Given** the same data, **When** I run a P&L report with `group_by=Region`, **Then** the report returns separate columns for each Region value (NSW, VIC, QLD) plus a Total column, showing revenue and expense totals per region.

3. **Given** the workspace has dimensions "Region" and "Department", **When** I run a P&L report with filter `tracking_region=NSW` AND `group_by=Department`, **Then** the report is filtered to NSW-only data and grouped by Department within that filter.

4. **Given** some journal entry lines have no Region value (`tracking` is null or has no Region key), **When** I run a report grouped by Region, **Then** those untagged lines appear under an "Unallocated" column.

5. **Given** the workspace has tracking dimensions, **When** I run a Trial Balance report, **Then** the dimension filter and group-by controls are available with the same behaviour as the P&L.

6. **Given** the workspace has tracking dimensions, **When** I run a Balance Sheet report filtered by a dimension, **Then** only lines tagged with that dimension value contribute to the balance -- with untagged lines excluded from the filtered view.

7. **Given** I am using the Custom Report Builder (043-CRB), **When** I configure a custom report, **Then** tracking dimensions appear as available filter and group-by fields.

---

### User Story 4 -- Dimension Columns in General Ledger (Priority: P2)

As an accountant, I want the General Ledger report to show tracking dimension values as additional columns on each transaction line, so that I can see at a glance how each transaction was classified.

**Why this priority**: The GL is the detailed transaction register. Dimension columns enhance its utility as an audit trail, but the P&L/BS dimension filtering (Story 3) delivers more analytical value first.

**Independent Test**: An accountant runs the General Ledger for a revenue account and sees dimension columns "Region" and "Department" alongside Date, Description, Debit, Credit, and Balance.

**Acceptance Scenarios**:

1. **Given** the workspace has active dimensions "Region" and "Department", **When** I view the General Ledger report, **Then** the table includes a column for each active dimension, showing the value from each line's `tracking` JSON.

2. **Given** a journal entry line is tagged with Region = "NSW" but has no Department value, **When** the GL renders, **Then** the Region column shows "NSW" and the Department column is blank (not "null" or "N/A").

3. **Given** the GL has dimension columns, **When** I click a column header for a dimension, **Then** the GL can be sorted by that dimension value.

4. **Given** the GL has dimension columns, **When** I export the GL to CSV, **Then** the exported file includes the dimension columns with their values.

---

### User Story 5 -- Bulk Dimension Tagging (Priority: P2)

As a bookkeeper, I want to select multiple posted journal entry lines and apply a tracking dimension value in bulk, so that I can retroactively classify transactions without editing each one individually.

**Why this priority**: Many businesses set up dimensions after they already have transaction history. Bulk tagging makes dimensions useful retroactively rather than only prospectively.

**Independent Test**: A bookkeeper filters the General Ledger to an expense account, selects 10 untagged journal entry lines, applies Region = "NSW" in bulk, and all 10 lines now show Region = "NSW".

**Acceptance Scenarios**:

1. **Given** I am viewing journal entry lines in the General Ledger or transaction list, **When** I select 5 lines using checkboxes and choose "Set Tracking Dimension" from the bulk actions menu, **Then** I see a modal with a dimension picker (dropdown of active dimensions) and a value picker.

2. **Given** I have selected 5 lines and chosen Region = "VIC" in the bulk action modal, **When** I click "Apply", **Then** all 5 lines have their `tracking` JSON updated to include `"Region": "VIC"` while preserving any existing dimension values (e.g., Department remains unchanged).

3. **Given** 3 of the 5 selected lines already have Region = "NSW", **When** I apply Region = "VIC" in bulk, **Then** all 5 lines now have Region = "VIC" (the previous Region value is overwritten, other dimensions are preserved).

4. **Given** I select lines from a posted journal entry, **When** I apply a bulk dimension tag, **Then** the dimension values are updated without modifying the journal entry's posted status, amounts, or accounts (dimension tagging is metadata, not a financial mutation).

5. **Given** I attempt to bulk-tag more than 200 lines at once, **When** I click "Apply", **Then** the system accepts the request and processes it (no artificial line limit, but the request uses a single database transaction).

6. **Given** a bulk tag operation, **When** it completes, **Then** an activity log entry records the change: "Bulk-tagged 5 lines with Region = VIC" with the user and timestamp.

---

### User Story 6 -- Dimension Values in CSV Import and Export (Priority: P2)

As a bookkeeper, I want dimension values included when I export transactions to CSV and accepted when I import transactions from CSV, so that dimension data flows seamlessly in and out of MoneyQuest.

**Why this priority**: Import/export is essential for migration and integration scenarios but depends on the dimension management and tagging infrastructure being in place.

**Independent Test**: A bookkeeper exports journal entries to CSV and sees columns for each active dimension. They modify a file and re-import it with dimension values, and the imported entries are correctly tagged.

**Acceptance Scenarios**:

1. **Given** the workspace has dimensions "Region" and "Department", **When** I export journal entries to CSV, **Then** the exported file includes columns named "Tracking: Region" and "Tracking: Department" with the value from each line's `tracking` JSON.

2. **Given** a CSV file has a column "Tracking: Region" with value "NSW", **When** I import it, **Then** the imported journal entry line has `tracking = {"Region": "NSW"}`.

3. **Given** a CSV file references a dimension value that does not exist (e.g., "Tracking: Region" = "WA" but "WA" is not an option), **When** I import it, **Then** the import logs a warning for that row and skips the invalid dimension value (does not reject the entire row).

4. **Given** a CSV file has no tracking dimension columns, **When** I import it, **Then** the import proceeds normally with `tracking = null` on all lines.

5. **Given** the workspace has 3 dimensions but the CSV only includes 1 dimension column, **When** I import it, **Then** only the provided dimension is set; the other 2 remain null.

---

### User Story 7 -- Dimension Management API (Priority: P1)

As a developer integrating with the MoneyQuest API, I want full CRUD endpoints for tracking dimensions and their values, so that external systems can programmatically manage and query dimension configurations.

**Why this priority**: The existing 3 endpoints on JobController are insufficient (no update, no delete, no dedicated controller). A proper resource controller is needed before the frontend can be built.

**Independent Test**: An API consumer creates a dimension, adds values, updates a value's name, reorders values, deactivates a dimension, and lists all dimensions -- all via REST endpoints.

**Acceptance Scenarios**:

1. **Given** I call `POST /api/v1/tracking-dimensions` with `{"name": "Region"}`, **When** the workspace has fewer than 5 dimensions, **Then** a new dimension is created and returned with `id`, `name`, `is_active`, and empty `options` array.

2. **Given** I call `GET /api/v1/tracking-dimensions`, **When** the workspace has 3 active and 1 inactive dimension, **Then** only the 3 active dimensions are returned (with `options` included). Passing `?include_inactive=true` returns all 4.

3. **Given** I call `PATCH /api/v1/tracking-dimensions/{id}` with `{"name": "Sales Region"}`, **When** the dimension exists and the new name is unique in the workspace, **Then** the dimension name is updated and returned.

4. **Given** I call `DELETE /api/v1/tracking-dimensions/{id}`, **When** the dimension has no values in use on any transaction lines, **Then** the dimension and all its values are permanently deleted.

5. **Given** I call `DELETE /api/v1/tracking-dimensions/{id}`, **When** the dimension has values referenced by posted journal entry lines, **Then** the system rejects with 422 and message "Cannot delete a tracking dimension that is in use on posted entries. Deactivate it instead."

6. **Given** I call `POST /api/v1/tracking-dimensions/{id}/options` with `{"name": "QLD"}`, **When** the option name is unique within the dimension, **Then** the option is created with auto-assigned `sort_order` and returned.

7. **Given** I call `PATCH /api/v1/tracking-dimensions/{id}/options/{optionId}` with `{"name": "Queensland"}`, **When** the option exists, **Then** the name is updated. Existing transaction lines tagged "QLD" are migrated to "Queensland" (value rename propagation).

8. **Given** I call `POST /api/v1/tracking-dimensions/{id}/reorder` with `{"option_ids": [3, 1, 2]}`, **When** all IDs belong to the dimension, **Then** `sort_order` is updated to match the provided order.

9. **Given** I call `PATCH /api/v1/tracking-dimensions/{id}/options/{optionId}` with `{"is_active": false}`, **When** the option is deactivated, **Then** it no longer appears in dimension pickers but existing tagged lines retain the value.

---

### Edge Cases

- **Dimension limit enforcement**: The 5-dimension limit counts all dimensions (active + inactive). Deleting a dimension frees a slot; deactivating does not.
- **JSON column querying**: PostgreSQL `jsonb` operators (`->`, `->>`, `@>`) are used for filtering journal entry lines by dimension value. An index on `tracking` using GIN is needed for performance.
- **Tracking JSON schema**: The `tracking` column stores `{"DimensionName": "OptionValue"}` -- keys are dimension names (strings), values are option names (strings). This avoids foreign key lookups during reporting queries.
- **Dimension name rename**: When a dimension is renamed (e.g., "Region" to "Sales Region"), all `tracking` JSON keys on existing lines must be updated. This is a batch operation processed synchronously for small datasets or queued for large ones (>10,000 lines). The threshold for queuing is 10,000 affected lines across both `journal_entry_lines` and `invoice_lines` tables combined. Queued renames use a standard Laravel job dispatched to the default queue. The rename is atomic within each table (single `UPDATE` with `jsonb_set`/key-rename SQL).
- **Option value rename**: When an option is renamed (e.g., "QLD" to "Queensland"), all `tracking` JSON values matching the old name under that dimension key must be updated. Same synchronous/queued threshold as dimension renames (10,000 lines). The old value is matched exactly (case-sensitive).
- **Concurrent dimension edits**: Two users editing the same dimension simultaneously -- last write wins. No optimistic locking on dimensions (low contention).
- **Invoice-to-JE tracking propagation**: When an invoice is approved and generates journal entries, the `tracking` JSON must be copied from each `invoice_line` to the corresponding `journal_entry_line`. This propagation happens in the `InvoiceProjector` (or the `ApproveInvoice` action) when it creates the JE lines -- the existing line-mapping loop passes through the `tracking` key from each invoice line to the JE line payload.
- **Reversed journal entries**: Reversals copy the original line's tracking values to the reversal lines. Dimension values are preserved for audit trail.
- **Null vs empty**: `tracking = null` and `tracking = {}` are both treated as "no dimensions assigned". The system normalises `{}` to `null` on save.
- **Mixed-dimension lines**: Within a single journal entry, different lines can have different dimension values. Line 1 might be Region = "NSW", Department = "Engineering" while Line 2 is Region = "VIC" with no Department.
- **Budget dimension scoping**: The existing `Budget` model's `tracking_category_id` and `tracking_option_value` columns continue to work. Budget variance reports respect dimension filtering. No migration of existing budget columns is needed -- the `Budget` model already references `tracking_category_id` as a foreign key and `tracking_option_value` as a string. These columns continue to work for budget scoping.
- **Dimension name character limits**: Dimension names are limited to 100 characters (matching the existing `StoreTrackingCategoryRequest` validation rule `max:100`). Option names are also limited to 100 characters.
- **Option count per dimension**: No hard limit on the number of options per dimension. Practical usability suggests keeping under 200 options per dimension for dropdown performance, but no server-side enforcement. If a dimension exceeds 50 options, the frontend picker uses a searchable dropdown (combobox) instead of a plain select.
- **Dimension name case sensitivity**: Dimension names are case-insensitive for uniqueness checks (`LOWER(name)` comparison), but stored as the user entered them. "Region" and "region" cannot coexist.
- **Tracking validation on draft vs posted**: Tracking values are validated against active options only when a transaction is being posted (or approved for invoices/bills). Draft entries may reference inactive options to allow in-progress editing. This mirrors how other fields like `chart_account_id` are validated.
- **Deleting an option**: An option can only be deleted if it is not referenced by any `tracking` JSON value on posted journal entry lines or invoice lines. If in use, the option must be deactivated instead. The "in use" check queries both `journal_entry_lines` and `invoice_lines` tables using `tracking->>'{DimensionName}' = '{OptionName}'`.
- **Balance Sheet grouping**: Balance Sheet reports support dimension filtering but NOT grouping by dimension. Balance Sheet dimension filtering is useful (e.g., "show me assets tagged to NSW"), but grouping would produce columns that do not balance individually, which is misleading. P&L is the primary grouped report.

---

## Requirements

### Functional Requirements

**Dimension Management**

- **FR-TDM-001**: System MUST support creating tracking dimensions with a name unique per workspace
- **FR-TDM-002**: System MUST enforce a maximum of 5 tracking dimensions per workspace (active + inactive combined)
- **FR-TDM-003**: System MUST support updating dimension name with cascading rename across all `tracking` JSON keys on affected lines
- **FR-TDM-004**: System MUST support deactivating a dimension (hides from pickers, retains data)
- **FR-TDM-005**: System MUST support deleting a dimension only when it has no values referenced by posted transaction lines
- **FR-TDM-006**: System MUST support creating, updating, reordering, and deactivating options within a dimension
- **FR-TDM-007**: System MUST support renaming an option value with cascading update across all `tracking` JSON values on affected lines
- **FR-TDM-008**: Dimension options MUST be ordered by `sort_order` and support drag-and-drop reordering

**Transaction Tagging**

- **FR-TDM-009**: Journal entry lines MUST support optional `tracking` JSON containing key-value pairs of `{DimensionName: OptionValue}`. The existing `tracking` column already exists on `journal_entry_lines` and is cast to `array` on `JournalEntryLine`. No migration needed for JE lines.
- **FR-TDM-010**: Invoice lines MUST support optional `tracking` JSON with the same schema as journal entry lines. A migration adds `json('tracking')->nullable()` to the `invoice_lines` table. The `InvoiceLine` model adds `'tracking'` to `$fillable` and `'tracking' => 'array'` to `casts()`.
- **FR-TDM-011**: Bill lines (stored in `invoice_lines` for type = bill) MUST support optional `tracking` JSON. No separate migration needed -- bills reuse `invoice_lines`.
- **FR-TDM-012**: System MUST validate that tracking dimension names match active workspace dimensions and values match active options for that dimension. Validation is performed in a shared `ValidatesTrackingDimensions` trait (or a reusable validation rule class) used by `StoreJournalEntryRequest`, `UpdateJournalEntryRequest`, `StoreInvoiceRequest`, and `StoreBillRequest`. The validation only enforces active options when the entry is being submitted/approved (not on draft saves).
- **FR-TDM-013**: Dimension tagging MUST coexist with `job_id` tagging -- a line can have both
- **FR-TDM-014**: When an invoice or bill is approved and generates journal entries, `tracking` JSON MUST be copied from source line to generated JE line. The `InvoiceProjector::onInvoiceCreated()` already maps line fields -- `tracking` must be added to the `InvoiceLine::create()` call and passed through in the `InvoiceCreated` event payload.
- **FR-TDM-015**: Repeating templates MUST preserve `tracking` JSON on generated documents. The `RecurringTemplate.template_data` JSON column already stores the full document payload including lines. No schema change needed -- `tracking` is included in the lines array within `template_data` naturally when the template is created from a document that has tracking values.

**Report Filtering & Grouping**

- **FR-TDM-016**: Profit & Loss report MUST support filtering by any tracking dimension value. `GenerateProfitAndLoss::aggregateByAccount()` adds a `WHERE journal_entry_lines.tracking->>'{DimensionName}' = '{Value}'` clause when a tracking filter is provided. New optional parameters: `?tracking_dimension={name}&tracking_value={value}`.
- **FR-TDM-017**: Profit & Loss report MUST support grouping by any tracking dimension, showing one column per value plus "Unallocated" and "Total". New optional parameter: `?group_by_dimension={name}`. The action runs one aggregation query per dimension value (including a `WHERE tracking->>'{name}' IS NULL` query for Unallocated). Maximum query count = number of option values + 1 (Unallocated) + 1 (Total). This is acceptable because options per dimension are typically under 20.
- **FR-TDM-018**: Balance Sheet report MUST support filtering by tracking dimension value (same parameter pattern as P&L). Balance Sheet does NOT support `group_by_dimension` -- grouping by dimension on a balance sheet produces columns that do not individually balance, which is misleading.
- **FR-TDM-019**: Trial Balance report MUST support filtering by tracking dimension value. When filtered, the trial balance recomputes from filtered `journal_entry_lines` rather than using the pre-computed `account_balances` table.
- **FR-TDM-020**: General Ledger MUST display tracking dimension values as additional columns (one column per active dimension). `GenerateGeneralLedger` includes `$txn->tracking` in each transaction line output. The frontend renders one column per active workspace dimension.
- **FR-TDM-021**: General Ledger MUST support sorting and filtering by dimension columns. Sorting is frontend-only (client-side sort on the rendered table). Filtering uses the same `tracking->>` query parameter pattern as P&L.
- **FR-TDM-022**: Report dimension filters and group-by controls MUST use dropdown pickers populated from the workspace's active dimensions and their active options. The frontend fetches dimensions from `GET /api/v1/tracking-dimensions` and renders cascading selects: dimension first, then value.
- **FR-TDM-023**: Untagged lines (null tracking or missing dimension key) MUST appear under "Unallocated" when reports are grouped by dimension

**Bulk Operations**

- **FR-TDM-024**: System MUST support bulk-tagging selected journal entry lines with a dimension value. The endpoint accepts `{line_ids: int[], dimension_name: string, option_value: string}`. Line IDs are validated for workspace ownership. Bulk tagging operates on `journal_entry_lines` only (not invoice lines -- invoice lines are edited through the invoice form).
- **FR-TDM-025**: Bulk tagging MUST merge the new dimension value into each line's existing `tracking` JSON (preserving other dimensions). Uses PostgreSQL `jsonb_set()` in a single UPDATE query: `UPDATE journal_entry_lines SET tracking = jsonb_set(COALESCE(tracking, '{}'), '{DimensionName}', '"OptionValue"') WHERE id IN (...)`.
- **FR-TDM-026**: Bulk tagging MUST be audited in the activity log with user, timestamp, dimension, value, and affected line count. Since the project does not use `spatie/laravel-activitylog`, the audit record is written as a `WorkspaceActivity` model entry (using the existing `ActivityFeed` infrastructure from 055-ACF). The entry records: `{action: 'bulk_tag', dimension: 'Region', value: 'NSW', line_count: 5, user_id: ...}`.

**Import & Export**

- **FR-TDM-027**: CSV export of journal entries and invoices MUST include one column per active tracking dimension
- **FR-TDM-028**: CSV import MUST accept tracking dimension columns and validate values against active options
- **FR-TDM-029**: Invalid dimension values in CSV import MUST be logged as warnings, not row-level rejections

**Authorization**

- **FR-TDM-030**: Dimension management (create, update, delete, deactivate) MUST require `workspace.settings` permission
- **FR-TDM-031**: Dimension tagging on transaction lines MUST follow the parent transaction's permissions (e.g., `journal-entry.create`, `invoice.create`)
- **FR-TDM-032**: Viewing dimension values in reports MUST follow existing report permissions (`report.trial-balance`, `report.profit-loss`, etc.)

**Tenant Scoping**

- **FR-TDM-033**: All tracking dimensions and options MUST be scoped by `workspace_id` -- no cross-workspace access
- **FR-TDM-034**: Dimension validation on transaction lines MUST verify dimensions and values belong to the current workspace

### Non-Functional Requirements

- **NFR-TDM-001**: Report queries filtering by tracking dimension MUST complete in under 2 seconds for workspaces with up to 100,000 journal entry lines
- **NFR-TDM-002**: A GIN index on `journal_entry_lines.tracking` MUST be created for PostgreSQL JSON query performance
- **NFR-TDM-003**: Dimension rename cascading (updating JSON keys across lines) MUST process up to 10,000 lines synchronously; larger datasets MUST be queued
- **NFR-TDM-004**: Bulk dimension tagging MUST execute within a single database transaction for consistency
- **NFR-TDM-005**: The tracking dimension settings page MUST load in under 1 second for workspaces with 5 dimensions and 50 values each

### Key Entities

- **TrackingCategory** (table: `tracking_categories`): A user-defined analytical dimension. Max 5 per workspace. Has `workspace_id`, `name` (unique per workspace), `is_active`. Example: "Region", "Department", "Cost Centre". Existing model at `app/Models/Tenant/TrackingCategory.php` -- no schema changes needed, but the model gains a `workspace` scope and `activeOptions()` relationship.
- **TrackingOption** (table: `tracking_options`): A value within a tracking dimension. Has `tracking_category_id`, `name` (unique per category), `is_active`, `sort_order`. Example: "NSW", "VIC", "QLD" under the "Region" dimension. Existing model at `app/Models/Tenant/TrackingOption.php` -- no schema changes needed.
- **JournalEntryLine.tracking**: JSON column storing dimension assignments as `{"DimensionName": "OptionValue"}`. Multiple dimensions per line. Nullable. Already exists in migration `2026_03_01_000013`, already cast to `array` in model, already written by `JournalEntryProjector`. No migration needed.
- **InvoiceLine.tracking**: JSON column (to be added via migration) with identical schema to `JournalEntryLine.tracking`. Migration: `$table->json('tracking')->nullable()->after('sort_order')`. Model update: add `'tracking'` to `$fillable`, add `'tracking' => 'array'` to `casts()`.
- **Budget.tracking_category_id / tracking_option_value**: Existing columns on `budgets` table. No changes needed -- these continue to reference tracking categories for budget scoping.

### Required Migrations

1. `add_tracking_to_invoice_lines_table` -- Adds `json('tracking')->nullable()` to `invoice_lines`
2. `add_gin_index_to_journal_entry_lines_tracking` -- Adds GIN index: `CREATE INDEX idx_je_lines_tracking ON journal_entry_lines USING GIN (tracking jsonb_path_ops)`
3. `add_gin_index_to_invoice_lines_tracking` -- Adds GIN index on `invoice_lines.tracking` (same pattern)

### API Endpoints

A new `TrackingDimensionController` replaces the existing 3 routes on `JobController`. The old routes (`tracking-categories` on `JobController`) are removed and replaced with the dedicated controller below.

| Method | Path | Description | Permission | Auth Pattern |
|--------|------|-------------|------------|-------------|
| `GET` | `/api/v1/tracking-dimensions` | List workspace dimensions with options | `job.view` (existing) | `Gate::authorize()` inline (read endpoint) |
| `POST` | `/api/v1/tracking-dimensions` | Create a dimension | `workspace.settings` | Form Request |
| `PATCH` | `/api/v1/tracking-dimensions/{id}` | Update dimension name or status | `workspace.settings` | Form Request |
| `DELETE` | `/api/v1/tracking-dimensions/{id}` | Delete unused dimension | `workspace.settings` | Form Request (authorize resolves model, checks in-use) |
| `POST` | `/api/v1/tracking-dimensions/{id}/options` | Add option to dimension | `workspace.settings` | Form Request |
| `PATCH` | `/api/v1/tracking-dimensions/{id}/options/{optionId}` | Update option name or status | `workspace.settings` | Form Request |
| `DELETE` | `/api/v1/tracking-dimensions/{id}/options/{optionId}` | Delete unused option | `workspace.settings` | Form Request |
| `POST` | `/api/v1/tracking-dimensions/{id}/reorder` | Reorder options | `workspace.settings` | Form Request |
| `POST` | `/api/v1/journal-entry-lines/bulk-tag` | Bulk-tag lines with dimension value | `journal-entry.update` | Form Request |

The `GET` endpoint uses `Gate::authorize()` inline (per project conventions for read endpoints). All mutation endpoints use Form Requests with `authorize()` methods. The `job.view` permission is reused for the read endpoint because tracking dimensions were originally part of the jobs domain and this avoids adding a new permission that would need to be seeded across all existing workspaces.

### Tracking JSON Schema

```json
// Example: Line tagged with two dimensions
{
  "Region": "NSW",
  "Department": "Engineering"
}

// Example: Line tagged with one dimension
{
  "Cost Centre": "CC-100"
}

// Example: Untagged line
null
```

Keys are dimension names (matching `tracking_categories.name`). Values are option names (matching `tracking_options.name`). This denormalised approach avoids joins during report aggregation queries.

---

## Frontend Implementation Notes

### Settings Page (Settings > Tracking Dimensions)

- Route: `/settings/tracking-dimensions` (new page under existing settings layout)
- List all dimensions with expand/collapse to show options
- "Add Dimension" button (disabled when count >= 5 with tooltip explaining limit)
- Each dimension shows: name, active/inactive toggle, value count, expand arrow
- Expanded view shows sortable option list with drag handles (`@dnd-kit/sortable`)
- Inline edit for dimension and option names (click-to-edit, blur-to-save)
- Delete button (with confirmation dialog explaining the "in use" guard)
- Keyboard shortcut: `N` to add new dimension when settings page is focused
- Data fetching: TanStack Query hook `useTrackingDimensions()` calling `GET /api/v1/tracking-dimensions?include_inactive=true`
- Mutations: individual TanStack Query mutation hooks for each CRUD operation with optimistic updates on reorder
- Navigation shortcut addition: the existing `G then S` shortcut goes to Settings -- no new navigation shortcut needed. The tracking dimensions page is a sub-page within Settings.

### Transaction Line Dimension Picker

- Appears below each line item (JE, invoice, bill) as a row of compact dropdown selectors
- One dropdown per active dimension, labelled with dimension name
- Placeholder text: "Select..." (not "None" -- empty means untagged)
- Dropdown lists only active options for that dimension, sorted by `sort_order`
- If a dimension has more than 50 options, use a searchable combobox (shadcn `Combobox`) instead of a plain `Select`
- Can be left empty (dimensions are optional per line)
- When workspace has 0 active dimensions, the dimension picker row is hidden entirely
- The dimension list is fetched once per form mount via `useTrackingDimensions()` (active only) and shared across all lines via React context or prop drilling (only 1 level deep -- parent form to line component)
- On mobile: dimension pickers collapse to a single "Tracking" button that opens a sheet/drawer with the dimension fields

### Report Controls

- "Filter by Dimension" dropdown added to P&L, BS, TB, GL report toolbars
- Cascading selects: first pick a dimension, then pick a value (or "All")
- "Group by Dimension" dropdown (P&L only): pick a dimension to split columns. Not available on Balance Sheet (see edge cases). Trial Balance dimension grouping is a future enhancement.
- Report table dynamically adds/removes columns when group-by is changed
- URL query parameters store the active filter/group-by state for shareable report links: `?tracking_dimension=Region&tracking_value=NSW&group_by_dimension=Department`

---

## Success Criteria

### Measurable Outcomes

- **SC-TDM-001**: Workspace can create exactly 5 dimensions and is rejected on the 6th -- verified by test
- **SC-TDM-002**: Journal entry lines with `tracking` JSON are correctly filtered in P&L report -- verified by test comparing filtered totals against manual calculation
- **SC-TDM-003**: P&L grouped by dimension produces correct per-value columns with totals that sum to the ungrouped report total -- verified by test
- **SC-TDM-004**: Dimension rename cascades correctly -- all affected `tracking` JSON keys updated, verified by querying lines before and after rename
- **SC-TDM-005**: Invoice-to-JE tracking propagation preserves dimension values -- verified by approving an invoice with tagged lines and checking the generated JE lines
- **SC-TDM-006**: Bulk tagging 100 lines completes in under 3 seconds and updates all lines correctly -- verified by integration test
- **SC-TDM-007**: CSV export includes dimension columns and CSV import with dimension values creates correctly tagged lines -- verified by round-trip test
- **SC-TDM-008**: Untagged lines appear under "Unallocated" in grouped reports -- verified by test with a mix of tagged and untagged lines

---

## Clarifications

Decisions made during spec refinement, resolving ambiguities across 10 categories.

### 1. Controller Architecture (Functional Scope)

**Q**: Should the new tracking dimension endpoints live on the existing `JobController` or get a dedicated controller?
**A**: A new `TrackingDimensionController` is created. The existing 3 routes on `JobController` (`trackingCategories`, `storeTrackingCategory`, `storeTrackingOption`) are migrated to the new controller and the old routes are removed. Tracking dimensions are conceptually separate from jobs -- they just happened to be scaffolded alongside jobs in 008-JCT. A dedicated controller follows the project convention of one resource per controller.

### 2. Permission for Reading Dimensions (Authorization)

**Q**: The spec says `job.view` for the GET endpoint. Should a new permission be created since dimensions are now a first-class feature?
**A**: Reuse `job.view`. Adding a new permission (e.g., `tracking-dimension.view`) would require seeding it across all existing workspaces and updating all 6 roles in `RolesAndPermissionsSeeder`. Since every role that can create transactions already has `job.view`, reusing it avoids a migration burden with no practical access-control benefit. If dimensions later need separate access control, a permission can be added then.

### 3. Form Request Placement (Domain & Data Model)

**Q**: Where do the new Form Requests live -- under `Requests/Job/` (existing) or a new `Requests/TrackingDimension/` directory?
**A**: New directory `app/Http/Requests/TrackingDimension/`. The existing `StoreTrackingCategoryRequest` and `StoreTrackingOptionRequest` under `Requests/Job/` are moved to this new directory and updated. This matches the project convention of domain-scoped request directories.

### 4. Tracking Validation Shared Logic (Integration)

**Q**: How is tracking JSON validated across JE, invoice, and bill create/update requests without duplicating validation logic?
**A**: A reusable `ValidateTrackingDimensions` invokable validation rule class (implementing `Illuminate\Contracts\Validation\ValidationRule`) is created at `app/Rules/ValidateTrackingDimensions.php`. It accepts the workspace ID and validates that all keys in the `tracking` JSON are active dimension names and all values are active option names for that dimension. Used in Form Requests as: `'lines.*.tracking' => ['nullable', 'array', new ValidateTrackingDimensions($this->input('workspace_id'))]`.

### 5. Invoice-to-JE Tracking Propagation Mechanism (Integration)

**Q**: How exactly does the tracking JSON flow from invoice lines to JE lines when an invoice is approved?
**A**: The `InvoiceProjector::onInvoiceCreated()` already maps invoice line fields to `InvoiceLine::create()` -- `tracking` is added to this mapping. When an invoice is approved and a JE is generated (via the `InvoiceAggregate` or approval action), the JE creation event payload includes `tracking` from each invoice line. The `JournalEntryProjector` already writes `'tracking' => $line['tracking'] ?? null` on each JE line. The gap is only in the `InvoiceCreated` event payload and the `InvoiceProjector` -- both need to include `tracking` in their line data.

### 6. Dimension Rename Queuing Threshold (Non-Functional)

**Q**: The spec says "synchronous for small datasets, queued for large ones (>10,000 lines)" but does not specify how the count is determined or what queue.
**A**: The rename action counts affected lines across both `journal_entry_lines` and `invoice_lines` using `tracking->>'{old_name}' IS NOT NULL`. If the combined count exceeds 10,000, the rename is dispatched as a standard Laravel queued job on the `default` queue. The API returns `202 Accepted` with a message "Dimension rename is being processed" for queued renames, and `200 OK` for synchronous ones. The rename job is idempotent -- safe to retry.

### 7. Balance Sheet Dimension Grouping (Functional Scope)

**Q**: The spec lists Balance Sheet filtering (FR-TDM-018) but also mentions "group-by controls" generically. Does BS support grouping?
**A**: No. Balance Sheet supports dimension filtering only, not grouping. Grouping a Balance Sheet by dimension would produce per-value columns that do not individually balance (Assets = Liabilities + Equity), which is misleading for accountants. P&L is the only report that supports `group_by_dimension`. Trial Balance grouping may be added in a future iteration.

### 8. Bulk Tagging Scope (Functional Scope)

**Q**: Can bulk tagging apply to invoice lines too, or only JE lines?
**A**: JE lines only. Invoice lines are edited through the invoice form (edit invoice -> update line tracking). Bulk tagging is designed for the GL/transaction list view where users are working with posted JE lines retroactively. The endpoint is `POST /api/v1/journal-entry-lines/bulk-tag`.

### 9. Bulk Tag: Clear Dimension (Edge Cases)

**Q**: Can bulk tagging clear (remove) a dimension value, or only set one?
**A**: Both. The endpoint accepts `option_value: string | null`. When `null`, the dimension key is removed from the tracking JSON (`jsonb - '{DimensionName}'`). This lets users bulk-untag lines that were incorrectly classified.

### 10. Activity Log Infrastructure (Integration)

**Q**: The spec references "activity log" for bulk tagging audit. The codebase does not have `spatie/laravel-activitylog`. What is used?
**A**: The existing Activity Feed infrastructure from epic 055-ACF. The bulk tag operation creates an activity feed entry using whatever model/mechanism 055-ACF established. If 055-ACF uses a `WorkspaceActivity` or `ActivityFeedItem` model, the bulk tag action writes to it. The entry includes: action type, dimension name, option value, affected line count, user ID, and timestamp.

### 11. Option Deletion vs Deactivation (Edge Cases)

**Q**: Can an option be hard-deleted? Under what conditions?
**A**: An option can be hard-deleted only if it is not referenced by any `tracking` JSON value on any `journal_entry_lines` or `invoice_lines` row in the workspace. The check uses `tracking->>'{DimensionName}' = '{OptionName}'`. If in use, the API returns 422 with "Cannot delete an option that is in use on transaction lines. Deactivate it instead." This mirrors the dimension-level deletion guard.

### 12. Dimension Name Uniqueness Case Sensitivity (Domain & Data Model)

**Q**: Is dimension name uniqueness case-sensitive?
**A**: Case-insensitive. The database already has a `UNIQUE(workspace_id, name)` constraint on `tracking_categories`. The `StoreTrackingDimensionRequest` and `UpdateTrackingDimensionRequest` validate uniqueness using `LOWER(name)` comparison in the `after()` hook to prevent "Region" and "region" from coexisting. The value stored preserves the user's original casing.

### 13. Maximum Options Per Dimension (Constraints)

**Q**: Is there a hard limit on the number of options per dimension?
**A**: No hard server-side limit. The frontend uses a searchable combobox (shadcn `Combobox`) instead of a plain `Select` when a dimension has more than 50 options, ensuring usability at scale. In practice, most dimensions have under 20 options (regions, departments, cost centres).

### 14. Tracking on Draft Entries (Edge Cases)

**Q**: Are tracking values validated against active options when saving a draft entry, or only on submit/approve?
**A**: Only on submit/approve. Draft entries may reference options that were active when the draft was started but have since been deactivated. This avoids blocking users from saving in-progress work. The validation rule checks option `is_active` status only when the entry transitions from draft to pending/posted. This is consistent with how other reference fields behave on drafts.

### 15. GL Sorting by Dimension (Functional Scope)

**Q**: Is GL sorting by dimension done server-side or client-side?
**A**: Client-side. The GL API returns tracking values as part of each transaction line. The frontend TanStack Table handles sorting by dimension columns locally. Server-side dimension sorting would require complex `ORDER BY tracking->>'{name}'` clauses that add minimal value given GL result sets are typically under 1,000 rows per account per period.

### 16. Report API Parameter Names (Terminology)

**Q**: What are the exact query parameter names for dimension filtering and grouping on report endpoints?
**A**: `tracking_dimension` (string, the dimension name) and `tracking_value` (string, the option value) for filtering. `group_by_dimension` (string, the dimension name) for P&L grouping. Example: `GET /api/v1/reports/profit-and-loss?start_date=2026-01-01&end_date=2026-03-31&tracking_dimension=Region&tracking_value=NSW&group_by_dimension=Department`.

### 17. CSV Column Naming Convention (Terminology)

**Q**: What prefix is used for dimension columns in CSV export/import?
**A**: `Tracking: {DimensionName}` (e.g., "Tracking: Region", "Tracking: Department"). The colon-space separator makes it easy to programmatically identify and parse tracking columns during import. This matches the pattern already described in User Story 6.

### 18. Handling Stale Tracking Data (Edge Cases)

**Q**: If a dimension is deleted (after passing the "not in use" check), what happens to the `tracking` JSON keys on lines that were tagged before the option was removed?
**A**: Dimensions can only be deleted if they have no values in use. This means no `tracking` JSON references exist. Therefore no orphaned keys can exist after deletion. If a dimension is deactivated (not deleted), its keys remain in the `tracking` JSON and are still visible in reports and GL -- they just cannot be assigned to new lines.

### 19. P&L Grouping Query Strategy (Non-Functional)

**Q**: Does the P&L grouped report run one query per dimension value, or a single query with GROUP BY?
**A**: One aggregation query per dimension value plus one for "Unallocated" (where the tracking key is null/missing). A single `GROUP BY tracking->>'{name}'` query is an alternative but would require significant refactoring of `GenerateProfitAndLoss::aggregateByAccount()` to handle the pivoted output. The per-value approach reuses the existing `aggregateByAccount()` method with an additional WHERE clause, is simpler, and performs acceptably because dimension values are typically under 20. Each query is fast (<100ms) with the GIN index.

### 20. Existing JobController Route Deprecation (Completion Signals)

**Q**: When the 3 existing tracking routes on `JobController` are replaced, is there a deprecation period?
**A**: No deprecation period. The existing routes have no external API consumers (they are only used by the Next.js frontend). The old routes are removed in the same PR that adds the new `TrackingDimensionController` routes. The frontend is updated simultaneously to use the new endpoint paths. The old `StoreTrackingCategoryRequest` and `StoreTrackingOptionRequest` files under `Requests/Job/` are deleted.
