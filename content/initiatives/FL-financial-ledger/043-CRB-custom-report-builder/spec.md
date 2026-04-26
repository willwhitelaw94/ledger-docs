---
title: "Feature Specification: Custom Report Builder"
---

# Feature Specification: Custom Report Builder

**Feature Branch**: `043-CRB-custom-report-builder`
**Created**: 2026-03-19
**Status**: Draft

## Overview

MoneyQuest ships standard financial reports (P&L, Balance Sheet, Trial Balance, Cash Flow, GL, Aging, BAS). But businesses need custom views — a board report with specific KPIs, a grant acquittal showing expenses by funding source, or a management report with only certain account groups. Today, users export to Excel and manually build these.

The Custom Report Builder lets users create personalised reports by selecting data sources (accounts, tracking categories, jobs, periods), choosing layout and grouping, applying filters, and saving them as reusable templates. Reports can be scheduled for email delivery and exported to PDF/Excel.

## User Scenarios & Testing

### User Story 1 — Create a Custom Report (Priority: P1)

An accountant wants to build a report that shows revenue and expenses for a specific job, grouped by tracking category, with monthly columns for the current financial year.

**Why this priority**: The ability to create a custom report is the core feature. Everything else builds on this.

**Independent Test**: Can be tested by selecting accounts, applying a job filter, choosing monthly column layout, and verifying the output matches expected data.

**Acceptance Scenarios**:

1. **Given** the user opens the Report Builder, **When** they select "Revenue" and "Expense" account groups, filter by Job "Facility A", choose "Monthly columns" for FY2026, and click "Generate", **Then** a table renders showing each account's monthly totals with row and column subtotals.
2. **Given** a generated report, **When** the user adds a grouping by Tracking Category "Department", **Then** the rows are grouped by department with sub-totals per department.
3. **Given** a generated report, **When** the user removes a filter or changes the date range, **Then** the report updates live without needing to re-run from scratch.

---

### User Story 2 — Save and Reuse Report Templates (Priority: P1)

A business owner wants to save a custom report configuration so they can re-run it next month without rebuilding it.

**Why this priority**: Without saving, the builder is a one-off tool. Saved templates make it a workflow.

**Independent Test**: Can be tested by creating a report, saving it, navigating away, returning, and verifying the saved template reproduces the same report with updated data.

**Acceptance Scenarios**:

1. **Given** the user has built a custom report, **When** they click "Save as Template" and give it a name, **Then** the template appears in their "My Reports" list.
2. **Given** a saved template "Monthly Board Report", **When** the user opens it next month, **Then** the report generates with the same configuration but current-period data.
3. **Given** a saved template, **When** the user edits and re-saves it, **Then** the template is updated (not duplicated).

---

### User Story 3 — Export to PDF and Excel (Priority: P1)

An accountant wants to export custom reports for board meetings, grant acquittals, and external stakeholders.

**Why this priority**: Reports that can't leave the system are half as useful. Export is table stakes.

**Independent Test**: Can be tested by generating a report and exporting to both PDF and Excel, verifying formatting and data accuracy.

**Acceptance Scenarios**:

1. **Given** a generated custom report, **When** the user clicks "Export to PDF", **Then** a formatted PDF is downloaded with the workspace name, report title, date range, and correct number formatting.
2. **Given** a generated custom report, **When** the user clicks "Export to Excel", **Then** an XLSX file is downloaded with formula-linked totals and proper column widths.
3. **Given** a report with grouped rows, **When** exported to Excel, **Then** groups are preserved using Excel's built-in grouping feature.

---

### User Story 4 — Schedule Report Delivery (Priority: P3)

A business owner wants to receive a specific report by email on the first of every month without logging in.

**Why this priority**: Scheduled delivery is powerful but lower priority than interactive report building.

**Independent Test**: Can be tested by scheduling a report, advancing time, and verifying the email is sent with the PDF attachment.

**Acceptance Scenarios**:

1. **Given** a saved report template, **When** the user clicks "Schedule" and selects "Monthly on 1st at 8am", **Then** a schedule is created and confirmed.
2. **Given** a scheduled report, **When** the schedule fires, **Then** the report is generated with current data and emailed as a PDF to the configured recipients.
3. **Given** a scheduled report that fails to generate, **When** the error occurs, **Then** the user receives a notification that the scheduled report failed.

---

### Edge Cases

- What happens when a report references a deleted account? The account name is shown with a "[Deleted]" suffix and its historical data is still included.
- What happens when a report has no data for the selected filters? An empty state shows "No data matches your filters" with suggestions to broaden criteria.
- What happens when a tracking category is renamed? Reports reference tracking categories by ID, not name — the new name is reflected automatically.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a report builder interface with data source selection (account groups, individual accounts), filters (jobs, tracking categories, contacts, date range), and layout options (monthly/quarterly/annual columns, row grouping).
- **FR-002**: System MUST allow saving report configurations as reusable templates with a user-defined name.
- **FR-003**: System MUST export custom reports to PDF and Excel formats with proper formatting.
- **FR-004**: System MUST support row grouping by account type, tracking category, job, or contact.
- **FR-005**: System MUST support comparative periods (current vs prior period/year) as additional columns.
- **FR-006**: System MUST update report output live as filters and groupings are changed (no "re-run" button).
- **FR-007**: System MUST support scheduled email delivery of saved reports (daily, weekly, monthly) with PDF attachment.
- **FR-008**: System MUST use a hybrid data strategy — summary-level aggregations (monthly/quarterly/annual totals by account) read from AccountBalanceProjector pre-computed data. Drill-down into individual transactions queries journal_entry_lines with tight filters. Database indexes on `journal_entry_lines` must cover `workspace_id`, `chart_account_id`, `entry_date`, `job_id`, and `tracking_category_id` with composite indexes for common report patterns (workspace + date range + account).
- **FR-009**: System MUST scope all report data to the current workspace (tenant isolation).
- **FR-010**: System MUST support sharing saved templates with other workspace users (read-only or editable).
- **FR-011**: System MUST use deferred/streaming data loading for report generation. The API returns a skeleton response immediately and streams account group data progressively (chunked JSON or SSE). The frontend renders rows as they arrive — first account group visible in under 1 second. No full-dataset blocking.
- **FR-012**: System MUST support drill-down on any summary cell. Clicking a cell (e.g. "March — Office Supplies — $4,520") expands the row inline to show the individual journal entry lines that make up that total. The drill-down query uses tight filters and does not reload the full report.

### Key Entities

- **Report Template**: A saved report configuration. Attributes: uuid, workspace_id, name (string, required), description (nullable text), config (JSON — stores the full report definition: `{ data_sources: { account_ids: int[], account_group_ids: int[] }, filters: { job_ids: int[], tracking_category_ids: int[], contact_ids: int[], date_range: { start: string, end: string, relative?: string } }, groupings: string[], column_layout: 'monthly'|'quarterly'|'annual'|'total_only', comparisons: { prior_period: boolean, prior_year: boolean } }`), is_shared (boolean, default false), created_by (user_id FK), created_at, updated_at. Can be personal or shared with workspace.
- **Report Schedule**: A recurring schedule attached to a template with frequency, time, and email recipients.
- **Report Execution**: A record of a generated report with timestamp, parameters used, and export file reference.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 40% of Professional/Enterprise workspaces create at least one custom report within 3 months of launch.
- **SC-002**: Custom reports generate in under 5 seconds for workspaces with up to 100K journal entry lines. Index performance must be verified under load.
- **SC-003**: 25% of saved report templates are re-run at least 3 times (proving reuse value).
- **SC-004**: Scheduled report delivery has 99%+ success rate.

---

## Clarifications

### Session 2026-03-19
- Q: What is the underlying data source for custom reports? → A: Journal entry lines (the ledger) — the source of truth. Same base data as all standard reports. Not projector read models. Indexes on journal_entry_lines must cover workspace_id, chart_account_id, entry_date, job_id, tracking_category_id with composite indexes for common report patterns. Performance is critical for large datasets (100K+ lines).
- Q: Should custom report building have its own permission? → A: New permission `report.custom` — separates "view standard reports" from "build custom reports". Owner/accountant get create + manage. Bookkeeper/approver can view shared templates but not build. Keeps the builder as a power-user feature.
- Q: Should custom reports query JE lines live or use pre-aggregated data? → A: Hybrid approach. Summary-level reports (monthly totals by account) use AccountBalanceProjector data which is already pre-computed. When users drill into a specific cell to see individual transactions, that query hits journal_entry_lines with tight filters (workspace + account + date range). Fast summaries from projector, accurate detail from ledger on demand.
- Q: How should the report configuration be stored? → A: JSON column on ReportTemplate. The config is a flexible, nested structure (`data_sources`, `filters`, `groupings`, `column_layout`, `comparisons`). Easy to version, easy to extend, no schema migration when adding new filter types. Not normalized relational tables.
- Q: How should drill-down work when users click a summary cell? → A: Inline expansion — rows expand below the clicked cell showing individual journal entry lines. Keeps context, no page navigation. User sees the summary row, clicks, and JE lines appear in a collapsible section below (like Xero's GL report). The drill-down query hits journal_entry_lines with tight filters (workspace + account + date range).
- Q: How should the report data load and render? → A: Deferred loading with streaming. API returns a lightweight skeleton immediately, then streams aggregated data as it's computed (chunked JSON or SSE). Frontend renders rows progressively — user sees first account group in <1s while the rest loads. Avoids blocking the UI for large datasets and sidesteps the 5s timeout concern. Similar pattern to how the AI chatbot streams responses.

#### Batch 2 — Remaining Gaps (2026-03-19)

**7. ReportTemplate — Full Attribute List**

- Q: What are the complete attributes for the ReportTemplate model?
- A: The full model:

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | Auto-increment |
| `uuid` | string(36) | Public identifier, unique |
| `workspace_id` | bigint FK | Tenant scoping (required) |
| `name` | string(255) | User-defined name (required) |
| `description` | text nullable | Optional description |
| `config` | JSON | Full report definition (see JSON schema below) |
| `is_shared` | boolean | Default false. When true, visible to all workspace users |
| `share_mode` | string nullable | `null` (private), `read_only`, or `editable`. Only applies when `is_shared = true` |
| `created_by` | bigint FK → users | The user who created the template |
| `updated_by` | bigint FK → users nullable | Last user to modify |
| `last_run_at` | datetime nullable | Timestamp of most recent generation |
| `run_count` | integer | Default 0. Tracks reuse for SC-003 |
| `created_at` | datetime | |
| `updated_at` | datetime | |

**Config JSON schema:**
```json
{
  "data_sources": {
    "account_type_filters": ["revenue", "expense"],
    "account_ids": [12, 45],
    "include_archived": false
  },
  "filters": {
    "job_ids": [3, 7],
    "tracking_filters": [
      { "category_id": 1, "option_ids": [2, 5] }
    ],
    "contact_ids": [10],
    "date_range": {
      "type": "relative",
      "relative": "current_fy",
      "start": null,
      "end": null
    },
    "entry_types": ["standard", "adjustment"]
  },
  "layout": {
    "column_layout": "monthly",
    "row_grouping": "account_type",
    "show_zero_balances": false,
    "show_account_codes": true
  },
  "comparisons": {
    "prior_period": false,
    "prior_year": false,
    "budget": false,
    "variance_as_percentage": false
  }
}
```

**8. ReportSchedule — Full Attribute List**

- Q: What are the attributes and frequency options for ReportSchedule?
- A: Follows the RecurringTemplate pattern already in the codebase:

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `uuid` | string(36) | Public identifier |
| `workspace_id` | bigint FK | Tenant scoping |
| `report_template_id` | bigint FK | The template to execute |
| `frequency` | string | `daily`, `weekly`, `monthly` |
| `day_of_week` | integer nullable | 0-6 (Mon-Sun). For weekly schedules |
| `day_of_month` | integer nullable | 1-28. For monthly schedules. Capped at 28 to avoid month-length edge cases |
| `time_of_day` | string | HH:MM in workspace timezone. Default `08:00` |
| `timezone` | string | Inherited from workspace `timezone` field at creation |
| `recipients` | JSON | Array of email addresses. Must include at least one. Example: `["sarah@example.com"]` |
| `export_format` | string | `pdf` or `xlsx`. Default `pdf` |
| `is_active` | boolean | Default true |
| `next_due_at` | datetime | Next scheduled execution (UTC) |
| `last_executed_at` | datetime nullable | |
| `created_by` | bigint FK → users | |
| `created_at` | datetime | |
| `updated_at` | datetime | |

Frequency options are intentionally limited to 3 (daily/weekly/monthly). No quarterly or yearly — those are niche and users can just re-run manually. Matches the subset of RecurringTemplate frequencies that make sense for report delivery.

**9. ReportExecution — Full Attribute List**

- Q: What are the attributes for ReportExecution? Should it cache results?
- A: Execution is an audit log of generated reports, not a cache. Reports always query live data.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `uuid` | string(36) | Public identifier |
| `workspace_id` | bigint FK | Tenant scoping |
| `report_template_id` | bigint FK nullable | Null if ad-hoc (unsaved) report |
| `report_schedule_id` | bigint FK nullable | Non-null only for scheduled executions |
| `config_snapshot` | JSON | Frozen copy of the config used at generation time |
| `status` | string | `completed`, `failed` |
| `row_count` | integer | Number of data rows returned |
| `duration_ms` | integer | Generation time in milliseconds |
| `export_path` | string nullable | Storage path to exported file (PDF/XLSX), if exported |
| `export_format` | string nullable | `pdf` or `xlsx` |
| `error_message` | text nullable | Error detail if status = failed |
| `executed_by` | bigint FK → users nullable | Null for scheduled (system-triggered) executions |
| `executed_at` | datetime | |
| `created_at` | datetime | |

No result caching. Reports are lightweight enough with the hybrid query strategy (projector summaries + filtered JE lines for drill-down). Caching introduces stale-data risk that's unacceptable for financial reports. The `config_snapshot` preserves what was run for audit purposes. Export files stored in Laravel's `storage/app/reports/{workspace_id}/` directory, auto-purged after 30 days.

**10. Relative Date Ranges**

- Q: How do relative date ranges work (e.g., "Current FY", "Last Quarter")?
- A: The `date_range` object in config supports both relative and absolute modes. Relative ranges resolve at query time using the workspace's `fiscal_year_start_month`.

Supported relative presets:
| Key | Resolves To |
|-----|-------------|
| `current_fy` | Current financial year (based on `fiscal_year_start_month`) |
| `last_fy` | Previous financial year |
| `current_quarter` | Current calendar quarter |
| `last_quarter` | Previous calendar quarter |
| `current_month` | Current calendar month |
| `last_month` | Previous calendar month |
| `last_3_months` | Rolling 3 months ending today |
| `last_6_months` | Rolling 6 months ending today |
| `last_12_months` | Rolling 12 months ending today |
| `year_to_date` | Jan 1 to today |
| `fy_to_date` | FY start to today |

When `type` is `relative`, `start` and `end` are null in the stored config and computed at runtime. When `type` is `absolute`, `start` and `end` are ISO date strings. The API response includes the resolved `start` and `end` dates so the frontend always knows the actual range displayed.

**11. Account Group Selection**

- Q: How do users select which accounts appear in the report — by type, by parent, or individually?
- A: Three selection modes, combinable:

1. **By AccountType** — `account_type_filters`: array of `AccountType` enum values (`asset`, `liability`, `equity`, `revenue`, `expense`). Selects all accounts of those types. This is the primary selection method (e.g., "Revenue + Expense" for a P&L-style report).
2. **Individual accounts** — `account_ids`: array of specific `chart_account_id` values. Additive — these accounts are included even if their type is not in `account_type_filters`. Useful for cherry-picking specific accounts.
3. **Exclude archived** — `include_archived`: boolean (default false). Archived accounts excluded unless explicitly toggled on.

No "by parent" grouping as a selection mode. Parent/child hierarchy is a display concern handled by `row_grouping`. The CoA tree structure is flat in the query (all leaf accounts), and the frontend indents children under parents based on `parent_id` relationships when `row_grouping` is `account_type`.

**12. Column Layout Options**

- Q: What exactly do monthly/quarterly/annual column layouts mean?
- A: Column layout controls how the date range is sliced into columns:

| Layout | Columns Generated |
|--------|-------------------|
| `monthly` | One column per calendar month within the date range. E.g., Jul-Jun = 12 columns |
| `quarterly` | One column per calendar quarter. Partial quarters included at boundaries |
| `annual` | One column per financial year. Useful for multi-year comparisons |
| `total_only` | Single "Total" column — no time slicing. Just aggregate for the full date range |

Each column shows the net movement (debits minus credits, sign-adjusted for account normal balance) for that period. Row totals appear as the rightmost column. Column sub-totals appear at each grouping boundary.

For `monthly` with a full FY, that is 12 data columns + 1 total column = 13 columns. The frontend uses horizontal scroll with sticky account-name column for wide reports. No virtual column rendering needed — 13 columns is manageable.

**13. Comparison Columns**

- Q: How do prior period, prior year, and budget comparisons work?
- A: Comparison columns are optional additions to the right of each data column:

| Comparison | What it shows |
|------------|---------------|
| `prior_period` | Same layout, shifted back by one period length. E.g., if the report is FY2026 monthly, prior_period shows FY2025 monthly. Each month column gets a "Prior" sub-column |
| `prior_year` | Same as prior_period but always shifts by exactly 12 months. Differs from prior_period only when the date range is not a full year |
| `budget` | Budget amounts from the `budgets` + `budget_lines` tables for the same accounts and periods. Only available if the workspace has an active budget for the matching fiscal year |
| `variance_as_percentage` | When true, adds a "Var %" column showing `((actual - comparison) / comparison) * 100`. Applied to whichever comparison is active |

Comparisons double (or triple) the column count. The API computes comparison data in the same streaming pass — one account group at a time, with actual + comparison values side by side. Frontend renders sub-columns under each period header.

**Budget comparison** depends on epic 043 shipping after budgets are populated. If no budget exists for the period, budget columns show dashes (not zeros). This is a soft dependency — the feature works without budgets, it just shows empty comparison columns.

**14. Export Format Details**

- Q: What are the PDF layout and Excel formatting specifics?
- A:

**PDF Export:**
- Landscape orientation for reports with 4+ columns, portrait for total_only or narrow reports
- Header: workspace name, report title, date range, "Generated on {date}" timestamp
- Footer: page numbers
- Generated server-side via a Laravel action (DomPDF or similar — no browser rendering)
- Grouped rows use indentation, not collapsible sections (flat PDF)
- Amounts formatted with workspace `base_currency` symbol and thousand separators
- Maximum practical size: ~500 rows. Reports exceeding this get a warning suggesting Excel export

**Excel Export:**
- Uses PhpSpreadsheet (already a common Laravel package)
- Formula-linked subtotals and grand totals (`=SUM()` references, not hardcoded values)
- Excel row grouping (`setOutlineLevel`) for grouped rows — users can collapse/expand in Excel
- Column headers frozen (freeze panes at row 1)
- Account name column frozen (freeze panes at column A)
- Number format: `#,##0.00` for amounts (no currency symbol in cells — currency noted in header)
- Worksheet named after the report template name (truncated to 31 chars per Excel limit)

**15. Sharing Model**

- Q: How does template sharing work — personal vs shared, read-only vs editable?
- A: Three sharing states:

| `is_shared` | `share_mode` | Behavior |
|-------------|--------------|----------|
| `false` | `null` | **Private** — only the creator can see, edit, run, schedule, or delete |
| `true` | `read_only` | **Shared read-only** — all workspace users with `report.custom` (or `report.custom-view` for bookkeeper/approver) can run and export. Only the creator can edit or delete |
| `true` | `editable` | **Shared editable** — all workspace users with `report.custom` can edit. Creator can still delete. Other editors can "Save as Copy" to fork |

Permission split:
- `report.custom` — create, edit, delete own templates, run any shared template. Granted to: owner, accountant
- `report.custom-view` — run shared templates only, no create/edit. Granted to: bookkeeper, approver, auditor, client

No per-user sharing (sharing with specific users). The workspace is the sharing boundary. This keeps it simple and matches how Xero/QBO handle report sharing.

**16. Route Structure**

- Q: What are the frontend and API routes?
- A:

**Frontend routes** (under `(dashboard)/`):
| Route | Page |
|-------|------|
| `/reports/custom` | Custom reports index — list of saved templates + "New Report" button |
| `/reports/custom/new` | Report builder — blank canvas |
| `/reports/custom/{uuid}` | Report builder — loaded from saved template |
| `/reports/custom/{uuid}/edit` | Edit template config (same builder UI, pre-populated) |

The builder and viewer are the same component — building IS viewing. `/reports/custom/new` opens the builder with empty config. `/reports/custom/{uuid}` opens the builder pre-populated and auto-runs. No separate "view" vs "edit" pages — the builder is always interactive.

Navigation: add "Custom Reports" as a sub-item under the existing "Reports" nav group in `reportsNav`. Keyboard shortcut `G then R` already goes to `/reports`.

**API routes** (all workspace-scoped, under `middleware('workspace')`):
| Method | Route | Controller Method | Permission |
|--------|-------|-------------------|------------|
| `GET` | `/api/v1/report-templates` | `index` | `report.custom-view` |
| `POST` | `/api/v1/report-templates` | `store` | `report.custom` |
| `GET` | `/api/v1/report-templates/{uuid}` | `show` | `report.custom-view` |
| `PATCH` | `/api/v1/report-templates/{uuid}` | `update` | `report.custom` + ownership or editable |
| `DELETE` | `/api/v1/report-templates/{uuid}` | `destroy` | `report.custom` + ownership |
| `POST` | `/api/v1/report-templates/{uuid}/duplicate` | `duplicate` | `report.custom` |
| `POST` | `/api/v1/report-templates/generate` | `generate` | `report.custom-view` |
| `POST` | `/api/v1/report-templates/{uuid}/generate` | `generateFromTemplate` | `report.custom-view` |
| `GET` | `/api/v1/report-templates/{uuid}/drill-down` | `drillDown` | `report.custom-view` |
| `POST` | `/api/v1/report-templates/{uuid}/export/{format}` | `export` | `report.custom-view` |
| `GET` | `/api/v1/report-schedules` | `index` | `report.custom` |
| `POST` | `/api/v1/report-schedules` | `store` | `report.custom` |
| `PATCH` | `/api/v1/report-schedules/{uuid}` | `update` | `report.custom` |
| `DELETE` | `/api/v1/report-schedules/{uuid}` | `destroy` | `report.custom` |
| `GET` | `/api/v1/report-executions` | `index` | `report.custom` |

The `generate` endpoint accepts a config payload directly (for unsaved/in-progress reports). The `generateFromTemplate` endpoint uses the saved template's config with optional overrides (e.g., different date range). Both stream the response.

**17. Dependencies on Existing Epics**

- Q: What existing epics does this depend on?
- A:

| Dependency | Epic | Status | Hard/Soft |
|------------|------|--------|-----------|
| Journal entry lines + ChartAccount | 002-CLE | Complete | **Hard** — core data source |
| AccountBalanceProjector | 002-CLE | Complete | **Hard** — summary aggregations |
| AccountingPeriod + fiscal_year_start_month | 003-AUT / 013-WSP | Complete | **Hard** — relative date resolution |
| Tracking categories + options | 002-CLE | Complete | **Hard** — filtering and grouping |
| Jobs (project_jobs) | 008-JCT | Complete | **Hard** — job filtering |
| Contacts | 006-CCM | Complete | **Hard** — contact filtering |
| Budgets + BudgetLines | Budgets epic | Complete | **Soft** — budget comparison columns. Works without budgets |
| Email infrastructure | 023-EML | Complete | **Soft** — scheduled report delivery. Builder works without email |
| Permissions seeder | 003-AUT | Complete | **Hard** — new permissions must be added to seeder |
| Standard reports (ReportController) | 007-FRC | Complete | Reference only — custom builder is independent |

No blocking dependencies. All hard dependencies are complete.

**18. Out-of-Scope Declarations**

Explicitly out of scope for this epic:
- **Calculated/formula rows** — no user-defined formulas like "Gross Margin = Revenue - COGS". Only system-generated subtotals and totals. Formula rows are a future enhancement.
- **Cross-workspace reports** — custom reports query one workspace only. Consolidated reports across workspace groups are handled by 028-CFT (ConsolidatedReportController).
- **Chart/graph visualisation** — this epic delivers tabular reports only. Dashboard charts and graph widgets are a separate initiative.
- **Report versioning/history** — no version history for template config changes. The `config_snapshot` on ReportExecution preserves what was run, but there is no "revert to previous version" feature.
- **Custom column ordering** — columns follow chronological order (left to right). Users cannot reorder columns.
- **Row-level conditional formatting** — no colour coding, highlighting, or threshold alerts on report rows. Plain tabular output.
- **Public/external sharing** — reports cannot be shared via public link. Export to PDF/Excel and email manually. Scheduled delivery to external emails is the only external distribution mechanism.
- **Real-time collaboration** — no multi-user simultaneous editing of a template. Last-write-wins on save.
- **Custom report types beyond P&L-style** — this builder produces "account-based period reports" (accounts as rows, periods as columns). It does not produce aging reports, cash flow statements, or other structurally different report types. Those remain as standard reports.

**19. Additional Edge Cases**

- Q: What happens when the workspace's fiscal year start month changes after a template with `current_fy` relative date is saved?
- A: The template resolves `current_fy` at runtime using the workspace's current `fiscal_year_start_month`. If it changes, the report adjusts automatically. This is correct behaviour — the template says "show me the current FY" and the FY definition comes from the workspace.

- Q: What happens when a scheduled report has no data (e.g., no transactions in the period)?
- A: The report generates successfully with an empty data set. The PDF/email is still sent with a note "No transactions found for this period." The execution record shows `status: completed, row_count: 0`. No error, no suppression.

- Q: What happens when a template references jobs or tracking options that have been deleted or deactivated?
- A: Jobs and tracking options are referenced by ID in the config. If a job is deleted, its JE lines still exist in the ledger — the report still shows historical data for that job. The filter simply matches `job_id` in the JE lines, which remain even after the job is soft-deleted or archived. Deactivated tracking options work the same way — the filter matches by ID against historical JE line data. The builder UI shows deactivated items with a "(inactive)" suffix so users know the filter targets an inactive entity.

- Q: What happens when a user without `report.custom` permission tries to access the builder?
- A: The frontend hides the "Custom Reports" nav item and "New Report" button for users without `report.custom`. Direct URL access to `/reports/custom/new` shows a 403 page. Users with `report.custom-view` can access `/reports/custom` (index) and `/reports/custom/{uuid}` (view/run) but not `/reports/custom/new` or the edit endpoint.

- Q: What is the maximum number of templates per workspace?
- A: 50 templates per workspace. Enforced at the API level in the `store` action. This prevents abuse and keeps the template list manageable. Professional/Enterprise tiers only — Starter and Trial do not get custom reports (gated by `custom_reports` feature flag in PlanTier).

- Q: How are report templates handled when a workspace is deleted (soft delete)?
- A: Templates are workspace-scoped and follow the workspace's lifecycle. Soft-deleted workspaces retain their templates. No cascade delete. If the workspace is restored, templates are available again.

**20. Plan Tier Gating**

- Q: Which plan tiers get access to custom reports?
- A: Add `custom_reports` to PlanTier feature lists:
  - Trial: No
  - Starter: No
  - Professional: Yes
  - Enterprise: Yes

This aligns with the success criteria targeting "Professional/Enterprise workspaces" (SC-001). The feature is gated via `CheckFeature` middleware on the API routes (`middleware('feature:custom_reports')`) and hidden in the frontend when the workspace feature flag is off.

**21. Performance & Caching Strategy**

- Q: What are the performance targets and caching approach?
- A:
  - **Target**: Reports generate in under 5 seconds for workspaces with up to 100K journal entry lines (SC-002)
  - **No result caching** — financial reports must always reflect current posted data. Caching introduces stale-data risk
  - **Query optimisation**: Composite indexes on `journal_entry_lines` for `(workspace_id, chart_account_id, entry_date)` and `(workspace_id, job_id, entry_date)`. These cover the primary query patterns
  - **Streaming mitigates perceived latency** — first account group renders in <1s, remaining groups stream progressively
  - **Drill-down queries are narrow** — single account + single period + workspace. Always fast even at scale
  - **SQLite compatibility** — all queries use standard SQL. `strftime('%Y-%m', entry_date)` for monthly grouping (SQLite-compatible). No MySQL/Postgres-specific functions
  - **Large report warning** — if the config would produce >500 rows, show a warning suggesting narrower filters or Excel export. Not a hard block, just a UX hint

**22. Keyboard Shortcuts**

Per CLAUDE.md requirements, the report builder needs shortcuts:

| Shortcut | Action | Context |
|----------|--------|---------|
| `N` | New report template | Custom reports index |
| `Cmd+Enter` | Generate/refresh report | Builder page |
| `Cmd+S` | Save template | Builder page |
| `Cmd+Shift+E` | Export (opens format picker) | Builder page with results |
| `Escape` | Close drill-down / go back | Builder page |

These are registered in the `?` shortcut overlay per convention.
