---
title: "Feature Specification: Client Report Templates (SPFR)"
---

# Feature Specification: Client Report Templates (SPFR)

**Feature Branch**: `076-CRT-client-report-templates`
**Created**: 2026-04-01
**Status**: Draft
**Epic**: 076-CRT
**Initiative**: FL — Financial Ledger Platform
**Effort**: L (5 sprints)
**Depends On**: 007-FRC (complete — financial reporting engine), 033-FAR (complete — fixed asset register), 015-ACT / 027-PMV (complete — practice management), 012-ATT (complete — attachments), 072-WKP (**hard dependency** — workpapers & WTB must be complete before CRT; financial statements always pull from WTB adjusted balances)

### Out of Scope

- **General Purpose Financial Reports (GPFR)** — this epic covers Special Purpose Financial Reports only. GPFR requires full AASB/IFRS compliance, which is a separate domain.
- **WYSIWYG page layout editor** — sections use structured content (rich text + field placeholders), not a drag-and-drop page designer. Full desktop-publishing-style layout is deferred.
- **Automated notes generation** — AI-assisted generation of Notes to Accounts from ledger data is a future enhancement.
- **Client-side editing** — clients receive the final PDF pack. They do not edit sections or sign within the report template system. Signing is handled by 059-DGS.
- **Consolidated group reports** — report packs for workspace groups (family trusts, corporate groups) pulling from multiple entities are deferred to 028-CFT.
- **SMSF audit tool integration** — ATO SMSF audit data file export is a separate compliance feature.
- **Cash flow statement (indirect method)** — 007-FRC has a placeholder for Cash Flow Statement but it is not yet built. If the backend is not available, the Cash Flow section type is included in templates but generates a "Coming Soon" placeholder in the PDF.

---

## Overview

When an accounting practice completes year-end work — adjusting journals, workpaper reconciliations, partner sign-off via the Working Trial Balance (072-WKP) — the final deliverable is a **client report pack**: a branded PDF document containing financial statements, statutory declarations, compilation reports, depreciation schedules, and notes to accounts. Today, this assembly happens outside MoneyQuest — in Word, Excel, or CaseWare — breaking the workflow and introducing reconciliation risk between the ledger and the delivered report.

This epic delivers a **report template system** that pulls adjusted financial data directly from the ledger into structured, entity-type-aware templates. Practices define templates once (or clone system defaults), then generate report packs per client per financial year with one click. Financial figures are always live from the ledger — no manual transcription.

**Key concepts**:

1. **Report Templates** — practice-owned, ordered collections of sections targeting a specific entity type. Lifecycle: Draft → Ready to Use → Archived.
2. **Report Sections** — individual components within a template: static text (declarations, notes), financial statements (P&L, Balance Sheet), schedules (depreciation, loans), and custom tables.
3. **Report Fields** — reusable data placeholders (`{{entity_name}}`, `{{director_names}}`, `{{preparer_firm}}`) that resolve at generation time from workspace, organisation, and practice data.
4. **Report Styles** — practice-level branding: logo, fonts, colours, headers/footers. Applied consistently across all templates and generated packs.
5. **Generated Report Packs** — versioned PDF documents produced for a specific workspace + financial year. Stored as attachments, emailable to clients.
6. **System Templates** — MoneyQuest-provided defaults per entity type that practices clone and customise.

**Competitor context**: Xero Practice Manager provides SPFR templates per entity type with Report Styles and Report Fields. CaseWare offers workpaper-to-report flow with conditional sections and prior-year rollforward. This spec combines both approaches while integrating with MoneyQuest's event-sourced ledger and WTB adjusted balances.

---

## User Scenarios & Testing

### User Story 1 — Browse and Manage Report Templates (Priority: P1)

A practice manager opens the Report Templates page in the practice portal and sees all available templates — both system-provided defaults ("Created by MoneyQuest") and custom templates their practice has built. Templates are organised by status: Ready to Use, Draft, and Archived. The practice manager can see at a glance which entity types are covered and which templates are available for use when generating client report packs.

**Why this priority**: The template index is the entry point for the entire feature. Without it, there is no way to view, create, or manage templates. Every other story depends on templates existing.

**Independent Test**: Can be tested by navigating to the Report Templates page, verifying system templates appear with correct entity types and "Created by MoneyQuest" attribution, and confirming the status tabs show accurate counts.

**Acceptance Scenarios**:

1. **Given** I am a practice manager or accountant viewing the practice portal, **When** I navigate to Report Templates, **Then** I see a table listing all templates with columns: Name, Description, Entity Type, Last Edited, and Created By. Templates are sorted by Last Edited (most recent first).

2. **Given** system templates exist, **When** I view the Report Templates page, **Then** I see default templates for each entity type (Company — Annual Accounts, Trust — Annual Accounts, Partnership — Annual Accounts, Sole Trader — Annual Accounts, Not-For-Profit — Association Report, SMSF — Annual Accounts) marked as "Created by MoneyQuest". I also see a "Management Report" template for internal reporting.

3. **Given** templates exist at various lifecycle stages, **When** I view the page, **Then** I see StatusTabs showing "Ready to Use", "Draft", and "Archived" with counts. The default view shows "Ready to Use" templates.

4. **Given** I am viewing a system template, **When** I attempt to edit it, **Then** the system prevents direct editing. I am offered "Clone Template" to create an editable copy under my practice.

5. **Given** I want a new template, **When** I click "New Template", **Then** I can choose to start from scratch or clone an existing template (system or custom). I must select an entity type for the new template.

6. **Given** I have a custom template in "Ready to Use" status, **When** I archive it, **Then** the template moves to "Archived" and is no longer available for generating report packs. It can be restored from the Archived tab.

7. **Given** I am a bookkeeper or client role, **When** I attempt to access Report Templates, **Then** access is denied — template management is restricted to practice-level roles (owner, accountant, practice manager).

---

### User Story 2 — Build and Edit a Report Template (Priority: P1)

A practice manager creates a new template for Company annual accounts or clones the system default and customises it. They add, remove, reorder, and configure sections — choosing which financial statements to include, writing the boilerplate text for the director's declaration and compilation report, and inserting report field placeholders that will resolve to client-specific data at generation time.

**Why this priority**: Template building is the core authoring experience. Without the ability to compose sections and insert fields, templates are empty shells. This is where the practice encodes their standard report structure.

**Independent Test**: Can be tested by creating a new template, adding sections of each type (static text, financial statement, schedule), inserting report field placeholders into static text sections, reordering sections, and saving. Reopening the template should show all sections and content preserved.

**Acceptance Scenarios**:

1. **Given** I am editing a template, **When** I view the template builder, **Then** I see an ordered list of sections with drag-and-drop reordering. Each section shows its name, type, and a toggle to enable/disable it.

2. **Given** I am adding a new section, **When** I click "Add Section", **Then** I can choose from four section types: Static Text, Financial Statement, Schedule, or Custom Table. I provide a section name and the section is added at the bottom of the list.

3. **Given** I am editing a Static Text section (e.g., Director's Declaration), **When** I open the section editor, **Then** I see a rich text editor with standard formatting (headings, bold, italic, lists, tables). An "Insert Field" button shows a picker listing all available report fields grouped by category (Entity, Practice, Period, People).

4. **Given** I insert `{{director_names}}` into a Director's Declaration section, **When** I preview the field, **Then** I see a placeholder badge showing "Director Names" that will resolve to the actual director names at generation time.

5. **Given** I am adding a Financial Statement section, **When** I select the section type, **Then** I choose which financial report to bind: Profit & Loss, Balance Sheet, Cash Flow Statement, or Trial Balance. The section configuration includes options for comparative period display and account grouping level (summary vs detail).

6. **Given** I am adding a Schedule section, **When** I select the section type, **Then** I choose which data source to bind: Depreciation Schedule (from 033-FAR), Loan Schedule, or Related Party Register. The schedule pulls live data at generation time.

7. **Given** I am adding a Custom Table section, **When** I select the section type, **Then** I can define columns and rows manually. This is used for ad-hoc disclosures that don't have a dedicated data source (e.g., contingent liabilities, subsequent events).

8. **Given** I have finished editing a template, **When** I set its status to "Ready to Use", **Then** the template is available for generating report packs. I can return it to "Draft" at any time.

9. **Given** I clone a system template, **When** the clone is created, **Then** all sections, content, and field placeholders are copied. The clone belongs to my practice and can be freely edited. The system template remains unchanged.

---

### User Story 3 — Manage Report Fields (Priority: P1)

A practice manager opens the Report Fields settings page and sees all available data placeholders. System-provided fields (entity name, ABN, reporting period) are listed alongside any custom fields the practice has created. The practice manager can create new custom fields for data points specific to their practice (e.g., a custom reference number, partner-in-charge name per client).

**Why this priority**: Report fields are the data bridge between templates and client-specific information. Without fields, static text sections have no way to personalise content per client. Fields must exist before templates can meaningfully use them.

**Independent Test**: Can be tested by viewing the Report Fields page, verifying all system fields are listed with their resolution source, creating a custom field, inserting it into a template section, and generating a report to verify it resolves correctly.

**Acceptance Scenarios**:

1. **Given** I navigate to Report Fields settings, **When** the page loads, **Then** I see a list of all available fields grouped by category: Entity (entity_name, abn, acn, registered_address), Period (reporting_period, reporting_date, comparative_period), People (director_names, trustee_name, partner_names, public_officer), Practice (preparer_name, preparer_firm, preparer_abn, registered_agent_number), and Generated (date_prepared, page_number, total_pages).

2. **Given** I view a system field, **When** I check its details, **Then** I see the field key (e.g., `{{entity_name}}`), a description of what it resolves to, which data source it pulls from, and which entity types it applies to (e.g., `{{director_names}}` applies to Company only, `{{trustee_name}}` applies to Trust and SMSF).

3. **Given** I want to add a custom field, **When** I click "New Field", **Then** I provide a field key, display name, description, and a default value (optional). Custom fields are resolved from a per-workspace key-value store that the practice populates when generating a report pack.

4. **Given** a field is used in one or more templates, **When** I attempt to delete it, **Then** the system warns me which templates reference the field and requires confirmation before deletion.

5. **Given** I am editing a Static Text section in the template builder, **When** I click "Insert Field", **Then** I see the full list of available fields (system + custom) and can insert any of them. Fields that do not apply to the template's entity type are shown but flagged with a warning (e.g., inserting `{{director_names}}` in a Sole Trader template shows "This field has no value for Sole Trader entities").

---

### User Story 4 — Configure Report Styles (Priority: P2)

A practice manager configures the visual branding for all report packs generated by their practice — uploading the firm's logo, selecting fonts, setting colours for headings and accents, and defining header/footer content (firm name, page numbers, confidentiality notice). These styles are applied consistently across all templates when generating PDFs.

**Why this priority**: Report Styles ensure every report pack looks professionally branded and consistent. However, reports can be generated without custom styles (system defaults apply), so this is P2 — valuable but not blocking.

**Independent Test**: Can be tested by configuring a logo, fonts, and colours in Report Styles, generating a report pack, and verifying the PDF reflects the configured branding.

**Acceptance Scenarios**:

1. **Given** I navigate to Report Styles in practice settings, **When** the page loads, **Then** I see configuration sections for: Logo (image upload), Fonts (heading font, body font), Colours (primary colour for headings, accent colour for highlights), and Header/Footer (content, page numbering format, confidentiality notice).

2. **Given** I upload a practice logo, **When** the upload completes, **Then** I see a preview of the logo as it will appear on the cover page and in the header of generated reports. Supported formats: PNG, JPG, SVG. Maximum size: 2MB.

3. **Given** I configure fonts and colours, **When** I click "Preview", **Then** I see a sample report page rendered with my branding choices so I can verify the look before saving.

4. **Given** no custom Report Styles have been configured, **When** a report pack is generated, **Then** the system uses sensible defaults: no logo, standard serif font for body text, sans-serif for headings, neutral colour palette, and page numbers in the footer.

5. **Given** Report Styles are configured, **When** any report pack is generated for any template, **Then** the styles are applied consistently — same logo, fonts, colours, and footer across all pages and all templates.

---

### User Story 5 — Generate a Report Pack for a Client (Priority: P1)

An accountant has completed year-end work for a client — the Working Trial Balance is reviewed, adjusting journals are posted, workpapers are signed off. Now they select a report template, review the report fields and narrative sections, and generate a PDF report pack. The financial statements in the pack pull directly from the ledger's adjusted balances, ensuring the report always matches the WTB.

**Why this priority**: Report generation is the culmination of the entire year-end workflow and the primary deliverable to the client. This is the reason the template system exists.

**Independent Test**: Can be tested by selecting a client workspace with posted transactions for a financial year, choosing a "Ready to Use" template matching the workspace's entity type, reviewing pre-populated fields, and generating a PDF. The PDF should contain all enabled sections with correct financial data and resolved field values.

**Acceptance Scenarios**:

1. **Given** I am viewing a client workspace as an accountant, **When** I navigate to "Generate Report Pack" (from the year-end / compliance area), **Then** I see a list of "Ready to Use" templates filtered to those matching the workspace's entity type. Templates for other entity types are hidden.

2. **Given** I select a template, **When** the generation wizard opens, **Then** I see the financial year selector (defaulting to the most recent completed period) and a preview of all sections in the template with their enable/disable toggles. Financial statement sections show a summary of the data that will be included.

3. **Given** the template has static text sections with report field placeholders, **When** I view the wizard, **Then** all system fields are pre-resolved with the workspace's data (entity name, ABN, directors, etc.). Custom fields show their current values from the workspace's field store, or prompt me to fill them in if empty.

4. **Given** I want to make a one-off edit to a narrative section for this specific report, **When** I click "Edit" on a static text section in the wizard, **Then** I can modify the text for this generation only. The underlying template is not changed.

5. **Given** all fields are resolved and sections are configured, **When** I click "Generate Report Pack", **Then** a PDF is produced containing all enabled sections in order, with: the cover page (logo, entity name, reporting period), each section rendered with resolved fields and live financial data, consistent branding from Report Styles, and page numbers throughout.

6. **Given** a financial statement section is bound to Profit & Loss, **When** the PDF is generated, **Then** the P&L data is pulled from the existing reporting engine (007-FRC) using the WTB adjusted balances for the selected financial year. The figures in the PDF match the WTB exactly.

7. **Given** a schedule section is bound to the Depreciation Schedule, **When** the PDF is generated, **Then** the depreciation data is pulled from the Fixed Asset Register (033-FAR) for the selected period, showing each asset's cost, accumulated depreciation, charge for the year, and net book value.

8. **Given** the report pack is generated, **When** it completes, **Then** the PDF is stored as a versioned document linked to the workspace and financial year. I can download it immediately. It appears in the Generated Reports list for this workspace.

9. **Given** I have previously generated a report pack for the same workspace and year, **When** I generate again (e.g., after a late adjustment), **Then** a new version is created. Both versions are retained. The most recent version is marked as current.

---

### User Story 6 — View and Manage Generated Report Packs (Priority: P2)

An accountant needs to find a previously generated report pack — perhaps to re-download it, email it to the client, or compare it with an earlier version. The Generated Reports page for a workspace shows all report packs with their generation date, template used, financial year, and version number.

**Why this priority**: Generated reports need a management interface, but the core value is in generation (Story 5). This is the retrieval and delivery layer.

**Independent Test**: Can be tested by generating two versions of a report pack for the same workspace/year, then navigating to Generated Reports and verifying both versions appear with correct metadata. Download and email actions should work.

**Acceptance Scenarios**:

1. **Given** report packs have been generated for a workspace, **When** I navigate to Generated Reports for that workspace, **Then** I see a list of all generated packs with: Template Name, Financial Year, Version Number, Generated By, Generated At, and File Size. The most recent version is highlighted as "Current".

2. **Given** I am viewing a generated report pack, **When** I click "Download", **Then** the PDF is downloaded to my device.

3. **Given** I am viewing a generated report pack, **When** I click "Email to Client", **Then** I can compose an email (subject, message) with the PDF attached, sent to the workspace's primary contact email. This uses the existing email infrastructure (023-EML).

4. **Given** multiple versions exist for the same workspace and year, **When** I view the version history, **Then** I see all versions with their generation timestamps and who generated them. I can download or preview any version.

5. **Given** I am viewing Generated Reports from the practice portal (cross-client view), **When** the page loads, **Then** I see all generated reports across all client workspaces, filterable by financial year, entity type, and generation date. This gives the practice manager visibility into which clients have received their report packs.

---

### User Story 7 — Prior-Year Rollforward (Priority: P2)

At the start of a new financial year, an accountant begins preparing the next year's report pack for a returning client. Rather than starting from scratch, the system carries forward the narrative sections (director's declaration text, accounting policy notes, compilation report wording) from the prior year's generated report. Financial data sections refresh automatically with the new year's figures.

**Why this priority**: Rollforward saves significant time on repeat clients — most narrative sections change minimally year-to-year. However, it requires at least one prior year's report to exist, making it a secondary workflow.

**Independent Test**: Can be tested by generating a report pack for Year 1, then starting a new generation for Year 2 on the same workspace, and verifying that narrative sections carry forward from Year 1 while financial data reflects Year 2 figures.

**Acceptance Scenarios**:

1. **Given** a report pack was generated for a workspace for the prior financial year, **When** I start generating a report pack for the current year, **Then** the system asks if I want to roll forward from the prior year's report or start fresh from the template.

2. **Given** I choose to roll forward, **When** the generation wizard loads, **Then** static text sections are pre-populated with the text from the prior year's generated report (including any one-off edits made during that generation). Financial statement and schedule sections show the current year's data.

3. **Given** narrative sections have been rolled forward, **When** I review the wizard, **Then** sections with year-specific references (e.g., "for the year ended 30 June 2025") are highlighted for review, prompting me to update date references. Report field placeholders automatically resolve to current year values.

4. **Given** the template has been updated since the prior year's report was generated (e.g., a new section was added), **When** I roll forward, **Then** new sections appear with their template defaults. Removed sections are not carried forward. Changed sections show the rolled-forward content, not the updated template content — preserving the prior year's customisations.

---

### User Story 8 — Management Report Template (Priority: P3)

A practice manager needs to produce internal management reports for clients — not statutory SPFR packs, but board reports, monthly management accounts, or internal briefings. Management reports use the same template system but are not bound to statutory entity-type requirements. They can mix and match financial statements with custom narrative sections freely.

**Why this priority**: Management reports extend the template system's value beyond year-end compliance, but they are not the primary use case. The statutory SPFR templates are the must-have; management reports are a natural extension.

**Independent Test**: Can be tested by creating a Management Report template without selecting an entity type, adding financial statement and custom sections, generating a report pack for any workspace, and verifying the PDF is produced without entity-type-specific validation.

**Acceptance Scenarios**:

1. **Given** I am creating a new template, **When** I select "Management Report" as the template category, **Then** the entity type field becomes optional — management reports can be used across any entity type.

2. **Given** a system Management Report template exists ("Created by MoneyQuest"), **When** I view its sections, **Then** it contains: Cover Page, Table of Contents, Financial Summary (P&L highlights, Balance Sheet highlights), Key Metrics, and Commentary sections.

3. **Given** I select a Management Report template for generation, **When** I choose the workspace and period, **Then** I can select any date range — not just full financial years. Management reports support monthly, quarterly, and custom date ranges.

4. **Given** a Management Report is generated, **When** I view the Generated Reports list, **Then** management reports are visually distinguished from statutory SPFR packs (e.g., a "Management" tag) so they are not confused with the formal year-end deliverables.

---

### Edge Cases

- **Workspace entity type does not match any template**: If a workspace has an entity type for which no "Ready to Use" template exists (e.g., Personal), the "Generate Report Pack" page shows a message directing the practice manager to create or clone a template for that entity type.
- **Report field with no data**: If a system field cannot be resolved (e.g., no directors recorded for a Company workspace), the field renders as "[Director Names — not set]" in the PDF with a yellow highlight, and the generation wizard warns the user before generating.
- **Template section references a data source not yet available**: If the Cash Flow Statement backend is not built, the section renders a "Data source not yet available" placeholder in the PDF. The section can still be included in templates for future use.
- **Concurrent template editing**: If two practice users edit the same template simultaneously, the system uses optimistic concurrency — the second save shows a conflict warning.
- **Large report packs**: Report packs with many financial statement sections (200+ accounts) must complete PDF generation within 30 seconds. If generation exceeds this, it is queued as a background job and the user is notified when complete.
- **Depreciation schedule with no assets**: If the workspace has no fixed assets, the Depreciation Schedule section renders "No fixed assets recorded for this period" rather than an empty table.
- **Template deletion**: Deleting a custom template does not delete previously generated report packs that used it. Generated packs are independent artefacts.
- **Practice with no templates configured**: If a practice has not created or cloned any templates, the "Generate Report Pack" page shows system templates available for cloning, with a prompt to set up the practice's templates.
- **Report field in wrong entity type context**: If `{{trustee_name}}` is used in a Company template, it resolves to an empty string with a note in the generation wizard warning that this field does not apply.

---

## Requirements

### Functional Requirements

**Report Templates**

- **FR-001**: System MUST provide a Report Templates page in the practice portal listing all templates (system and custom) with: Name, Description, Entity Type, Last Edited, Created By, and Status.
- **FR-002**: Templates MUST have a lifecycle with three statuses: Draft, Ready to Use, and Archived. Only "Ready to Use" templates are available for report generation.
- **FR-003**: System MUST ship default system templates for each entity type: Company (Pty Ltd), Trust, Partnership, Sole Trader, Not-For-Profit, and SMSF. A Management Report template MUST also be provided. System templates are marked "Created by MoneyQuest" and cannot be edited directly.
- **FR-004**: Users MUST be able to clone any template (system or custom) to create an editable copy owned by their practice.
- **FR-005**: Users MUST be able to create new templates from scratch, selecting an entity type (required for SPFR templates, optional for Management Reports).
- **FR-006**: Template management (create, edit, clone, archive, delete) MUST be restricted to practice-level roles: Owner, Practice Manager, and Accountant.
- **FR-007**: The Report Templates page MUST use StatusTabs showing counts per status: "Ready to Use (N)", "Draft (N)", "Archived (N)".

**Report Sections**

- **FR-008**: Each template MUST contain an ordered list of sections. Sections can be reordered via drag-and-drop.
- **FR-009**: System MUST support four section types: Static Text, Financial Statement, Schedule, and Custom Table.
- **FR-010**: Static Text sections MUST provide a rich text editor supporting headings, bold, italic, lists, and tables. The editor MUST support inserting report field placeholders via an "Insert Field" picker.
- **FR-011**: Financial Statement sections MUST bind to one of: Profit & Loss, Balance Sheet, Cash Flow Statement, or Trial Balance. Configuration options MUST include comparative period display and account grouping level (summary or detail).
- **FR-012**: Schedule sections MUST bind to one of: Depreciation Schedule (033-FAR), Loan Schedule, or Related Party Register. Schedules pull live data at generation time.
- **FR-013**: Custom Table sections MUST allow manual column and row definition for ad-hoc disclosures.
- **FR-014**: Each section MUST have an enable/disable toggle. Disabled sections are excluded from the generated PDF but remain in the template for future use.
- **FR-015**: System templates MUST include the correct default sections per entity type as defined in the idea brief (e.g., Company includes Director's Declaration, Compilation Report, P&L, Balance Sheet, Cash Flow Statement, Notes to Accounts, Detailed P&L Schedule).

**Report Fields**

- **FR-016**: System MUST provide built-in report fields grouped by category: Entity (entity_name, abn, acn, registered_address), Period (reporting_period, reporting_date, comparative_period), People (director_names, trustee_name, partner_names, public_officer), Practice (preparer_name, preparer_firm, preparer_abn, registered_agent_number), and Generated (date_prepared, page_number, total_pages).
- **FR-017**: Each system field MUST define which entity types it applies to (e.g., `director_names` applies to Pty Ltd only; `trustee_name` applies to Trust and SMSF).
- **FR-018**: System MUST resolve report fields at generation time from workspace data, organisation data, practice data, and period context.
- **FR-019**: Practices MUST be able to create custom report fields with a field key, display name, description, and optional default value. Custom field values are stored per workspace and populated during report generation.
- **FR-020**: System MUST warn users when a report field is inserted into a template for an entity type where the field does not apply.
- **FR-021**: Unresolvable fields MUST render as "[Field Name — not set]" with a visual highlight in the generated PDF. The generation wizard MUST warn the user about unresolved fields before generation.

**Report Styles**

- **FR-022**: System MUST provide a Report Styles configuration page at the practice level with: Logo upload (PNG, JPG, SVG; max 2MB), heading font, body font, primary colour, accent colour, and header/footer content (text, page numbering format, confidentiality notice).
- **FR-023**: Report Styles MUST be applied consistently to all generated report packs across all templates for the practice.
- **FR-024**: If no custom Report Styles are configured, the system MUST use sensible defaults (no logo, standard fonts, neutral colours, page numbers in footer).

**Report Generation**

- **FR-025**: System MUST provide a "Generate Report Pack" action accessible from the client workspace (year-end / compliance area). The action shows templates filtered to the workspace's entity type.
- **FR-026**: The generation wizard MUST display: financial year selector, section list with enable/disable toggles, pre-resolved report fields, and editable narrative sections for one-off customisation.
- **FR-027**: Financial Statement sections MUST pull data from the existing reporting engine (007-FRC) using WTB adjusted balances (072-WKP). 076-CRT hard-depends on 072-WKP — there is no fallback to raw ledger totals.
- **FR-028**: Schedule sections MUST pull live data from their bound data source (033-FAR for depreciation, etc.) for the selected financial year.
- **FR-029**: One-off edits to narrative sections during generation MUST NOT modify the underlying template. They apply only to the generated report pack.
- **FR-030**: System MUST generate a PDF containing all enabled sections in order, with: cover page (logo, entity name, reporting period), rendered sections with resolved fields and financial data, consistent branding from Report Styles, and sequential page numbering.
- **FR-031**: Generated report packs MUST be stored as versioned documents linked to the workspace and financial year. Multiple versions for the same workspace/year MUST coexist, with the most recent marked as "Current".
- **FR-032**: System MUST track generation metadata: template used, financial year, generated by (user), generated at (timestamp), and version number.

**Generated Reports Management**

- **FR-033**: System MUST provide a Generated Reports page per workspace listing all generated packs with: Template Name, Financial Year, Version Number, Generated By, Generated At, and File Size.
- **FR-034**: Users MUST be able to download any generated report pack as a PDF.
- **FR-035**: Users MUST be able to email a generated report pack to a client contact using the existing email infrastructure (023-EML).
- **FR-036**: System MUST provide a cross-client Generated Reports view in the practice portal showing all generated reports across all workspaces, filterable by financial year, entity type, and generation date.

**Prior-Year Rollforward**

- **FR-037**: When generating a report pack for a workspace that has a prior year's generated report, the system MUST offer to roll forward narrative sections from the prior year.
- **FR-038**: Rolled-forward narrative sections MUST carry the text from the prior year's generated report (including one-off edits), not the current template content.
- **FR-039**: Sections added to the template since the prior year MUST appear with their template defaults. Sections removed from the template MUST NOT be carried forward.
- **FR-040**: Report field placeholders in rolled-forward sections MUST resolve to current year values automatically.

**Management Reports**

- **FR-041**: Management Report templates MUST NOT require an entity type — they can be used with any workspace.
- **FR-042**: Management Reports MUST support flexible date ranges (monthly, quarterly, custom) — not just full financial years.
- **FR-043**: Generated management reports MUST be visually distinguished from statutory SPFR packs in the Generated Reports list.

**Clarification-Driven Requirements**

- **FR-044**: PDF rendering MUST be server-side. The generation wizard MUST show an HTML approximation for preview. The final PDF is rendered on the backend for deterministic output.
- **FR-045**: The template builder MUST be a full-page editor with sections listed in a left sidebar and a content editor on the right.
- **FR-046**: Static Text sections MUST use a TipTap rich text editor, consistent with the existing Notes feature in the codebase.
- **FR-047**: Custom report field keys MUST be validated for uniqueness against system field keys at creation time. System fields always take precedence.
- **FR-048**: Generated report packs MUST be stored at a dedicated path (`report-packs/{workspace_id}/{year}/`), NOT via the polymorphic Attachment system (012-ATT). Tracked via the GeneratedReport model.
- **FR-049**: Every generated report pack MUST include an auto-generated cover page (from Report Styles + template metadata) and an automatic Table of Contents (toggleable via Report Styles).
- **FR-050**: Custom Table sections MUST support static data only — no formulas or calculated fields.
- **FR-051**: If depreciation has not been finalised for the selected period, Schedule sections bound to the Depreciation Schedule MUST display a "preliminary" warning in the generation wizard and on the generated PDF page.
- **FR-052**: The "Email to Client" action MUST use a configurable email template with default text. Practices MUST be able to customise the default email body in Report Styles settings.
- **FR-053**: System MUST define dedicated permissions: `report-template.view`, `report-template.create`, `report-template.update`, `report-template.delete`, `report-template.generate`. These MUST be added to the roles and permissions seeder.
- **FR-054**: The generation wizard MUST support enable/disable toggles per section only — section reordering during generation is NOT supported. Reordering is a template-level action.
- **FR-055**: Version numbers for generated reports MUST be simple sequential integers (v1, v2, v3) per workspace per financial year.
- **FR-056**: The cross-client Generated Reports view MUST show all client workspaces for the selected financial year, including those with "Not Generated" status.
- **FR-057**: PDF generation MUST be synchronous for workspaces with fewer than 150 chart accounts. For larger workspaces, generation MUST be queued as a background job with user notification on completion.
- **FR-058**: Each GeneratedReport MUST store a snapshot of the template structure used (section names, types, ordering) for audit traceability.
- **FR-059**: Notes to Accounts MUST be implemented as multiple individual Static Text sections (one per note) within a template — not as a single monolithic section.
- **FR-060**: System templates MUST ship with full pre-written Australian boilerplate text for all statutory sections (declarations, compilation reports, accounting policy notes). Practices clone and customise.

### Key Entities

- **Report Template**: A practice-owned template defining the structure of a report pack. Attributes: practice (nullable for system templates), name, description, entity_type (nullable for Management Reports), category (spfr or management), status (draft, ready_to_use, archived), is_system (boolean), cloned_from (self-reference, nullable), created_by (user), section ordering.
- **Report Section**: An individual component within a template. Attributes: template, name, section_type (static_text, financial_statement, schedule, custom_table), display_order, is_enabled (boolean), content (rich text for static sections), data_binding (which report/schedule to pull), configuration (JSON — comparative period, grouping level, etc.).
- **Report Field**: A reusable data placeholder. Attributes: practice (nullable for system fields), field_key (e.g., "entity_name"), display_name, description, category (entity, period, people, practice, generated), applicable_entity_types (array), default_value (nullable), is_system (boolean).
- **Report Field Value**: Per-workspace custom field values. Attributes: workspace, report_field, value (string).
- **Report Style**: Practice-level branding configuration. Attributes: practice, logo_path, heading_font, body_font, primary_colour, accent_colour, header_content, footer_content, page_number_format.
- **Generated Report**: A produced PDF linked to a workspace and financial year. Attributes: workspace, template (snapshot reference), financial_year_start, financial_year_end, version_number, generated_by (user), generated_at (timestamp), file_path, file_size, is_current (boolean), section_overrides (JSON — one-off narrative edits), resolved_fields (JSON — snapshot of resolved field values at generation time).

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A practice can generate a complete report pack (cover page, 3 financial statements, 2 narrative sections, 1 schedule) for a workspace with 100+ accounts in under 30 seconds.
- **SC-002**: Financial figures in the generated PDF match the Working Trial Balance adjusted balances with zero discrepancy — 100% data integrity between the ledger and the delivered report.
- **SC-003**: A practice with 6 entity types can set up all default templates (by cloning system templates) within 30 minutes of first accessing the feature.
- **SC-004**: Report field placeholders resolve correctly for 100% of system fields where the underlying data exists in the workspace. Unresolvable fields are clearly flagged — zero silently missing data.
- **SC-005**: Prior-year rollforward preserves 100% of narrative customisations from the prior year's generated report, reducing repeat-client report preparation time by at least 50% compared to starting from scratch.
- **SC-006**: Generated report packs are stored as versioned documents — zero data loss from regeneration. All prior versions are retained and downloadable.
- **SC-007**: Report Styles (logo, fonts, colours) are applied consistently across all pages of a generated report — zero branding inconsistencies within a single PDF.
- **SC-008**: The practice portal cross-client view shows generation status for all client workspaces — practice managers can identify which clients have received report packs and which are outstanding without checking each workspace individually.

---

## Clarifications

### Session 2026-04-02

- Q: Should 076-CRT hard-depend on 072-WKP or launch independently with a fallback to raw ledger totals? → A: **Hard dependency on 072-WKP**. CRT always pulls from WTB adjusted balances. No temporary fallback — ensures data integrity from day one.
- Q: Should system templates ship with full pre-written boilerplate text for statutory sections? → A: **Yes — full boilerplate text**. System templates are immediately usable out of the box. Practices clone and customise. Matches Xero's approach.
- Q: PDF rendering — server-side or client-side? → A: **Server-side only**. Backend renders the PDF. The generation wizard shows an HTML approximation for preview, not the actual PDF. Deterministic rendering, no browser inconsistencies.
- Q: Template builder UX — inline or dedicated page? → A: **Full-page editor**. Sections listed in a left sidebar, content editor on the right. Matches the complexity of the authoring task.
- Q: Rich text editor for static text sections? → A: **TipTap** — already used in the codebase for Notes. Consistent with existing patterns.
- Q: Report field resolution order when system and custom keys collide? → A: **System fields take precedence**. Custom fields cannot use system field keys — validation rejects duplicates at creation.
- Q: Storage for generated report packs — Attachment system (012-ATT) or dedicated? → A: **Dedicated storage** at `report-packs/{workspace_id}/{year}/`. Tracked via `GeneratedReport` model, not the polymorphic Attachment system. Different lifecycle.
- Q: Cover page — configurable section or auto-generated? → A: **Auto-generated** from Report Styles + template metadata (entity name, reporting period, logo). Not a user-configurable section.
- Q: Table of Contents — automatic or optional? → A: **Automatic** — generated from enabled section names with page numbers. Controlled via a Report Style toggle (show/hide ToC).
- Q: Custom Table section — formulas or static data? → A: **Static data only**. No spreadsheet-style formulas. Custom tables are for ad-hoc disclosures.
- Q: How does the Depreciation Schedule handle a period where depreciation hasn't been finalised? → A: **Pull current data as-is** with a warning in the generation wizard: "Depreciation has not been finalised for this period. Figures may be preliminary."
- Q: "Email to Client" — configurable email template or plain message? → A: **Configurable email template** with default text. Practices customise the default email body in Report Styles settings.
- Q: Permission model — reuse existing or dedicated? → A: **Dedicated permissions**: `report-template.view`, `report-template.create`, `report-template.update`, `report-template.delete`, `report-template.generate`. Added to RolesAndPermissionsSeeder.
- Q: Generation wizard — allow section reordering or only enable/disable? → A: **Enable/disable only**. Reordering is a template-level action. Keeps the wizard simple.
- Q: Version numbering — sequential or date-based? → A: **Simple sequential** (v1, v2, v3) per workspace per financial year.
- Q: Cross-client Generated Reports view — include workspaces with no generated report? → A: **Yes** — show all client workspaces with "Not Generated" status for the selected financial year. Identifies outstanding work.
- Q: Financial Statement sections — summary only or configurable detail level? → A: **Configurable per section**. "Summary" shows account type groups with subtotals. "Detail" shows every account. Default: Summary for P&L and Balance Sheet, Detail for Trial Balance.
- Q: Synchronous or queued PDF generation? → A: **Synchronous for < 150 accounts, queued for larger reports**. 30-second timeout triggers queued generation with notification on completion.
- Q: Track which template version was used for each generated report? → A: **Yes** — store a snapshot of template structure (section names, types, ordering) in GeneratedReport metadata. Not full content, but enough for audit.
- Q: Template sharing between practices (marketplace)? → A: **Practice-private only** in v1. Template sharing is a future enhancement.
- Q: Notes to Accounts — single section or multiple sub-sections? → A: **Multiple sub-sections**. Each note is its own Static Text section (Note 1: Basis of Preparation, Note 2: Revenue, etc.). Full control over which notes to include and their ordering.
- Q: Comparative period in Financial Statement sections? → A: **Prior year only** in v1. Multi-period comparatives deferred to future management report enhancements.

---

**Status**: Draft — clarified, ready for implementation planning
