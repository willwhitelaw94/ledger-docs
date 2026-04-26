---
title: "Feature Specification: Data Migration & Import"
---

# Feature Specification: Data Migration & Import

**Feature Branch**: `046-DMI-data-migration-import`
**Created**: 2026-03-19
**Status**: Draft
**Epic**: 046-DMI
**Initiative**: FL — Financial Ledger Platform
**Effort**: L (4 sprints)
**Depends On**: 002-CLE (complete), 006-CCM (complete), 005-IAR (complete), 004-BFR (complete)

### Out of Scope

- **Historical bank reconciliation status** — v1 imports transactions as unreconciled; migrating reconciliation state from the source system is deferred
- **Payroll data import** — employee records, pay runs, and superannuation data are not part of v1 migration
- **Inventory item import** — Xero/MYOB inventory items are imported as expense accounts with a warning; full inventory support deferred
- **Scheduled recurring imports** — v1 is one-shot migration; automatic periodic sync from source systems is deferred
- **Two-way sync** — data flows one direction (source → MoneyQuest); no write-back to Xero/MYOB/QuickBooks
- **Historical reporting period close state** — all periods import as open; locked/closed period status from source is not preserved
- **Attachment/document migration** — file attachments on invoices, bills, and contacts in the source system are not imported in v1

---

## Overview

Switching accounting software is the single biggest barrier to adoption. If importing data from Xero, MYOB, or QuickBooks feels like a week-long project, users won't switch. Linear nailed this — their Jira import is a one-click operation that maps everything automatically. MoneyQuest needs the same frictionless experience: a user should be able to migrate from Xero to MoneyQuest in under 30 minutes with zero data loss on the critical entities.

---

## User Scenarios & Testing

### User Story 1 — One-Click Xero Import (Priority: P1)

A business owner switching from Xero wants to connect their Xero account and have MoneyQuest automatically pull their chart of accounts, contacts, invoices, bills, and opening balances. Today they'd have to re-enter everything manually or hire someone to do it — a dealbreaker for most.

**Why this priority**: Xero is the #1 competitor in Australia. Frictionless Xero migration is the highest-leverage onboarding feature. Every day without it, potential users bounce at the "how do I get my data in?" step.

**Independent Test**: Can be tested using Xero's demo company API. Verify chart of accounts, contacts, and invoices are imported with correct mapping. No real Xero subscription required.

**Acceptance Scenarios**:

1. **Given** a new workspace, **When** the user clicks "Import from Xero" in onboarding, **Then** they are redirected to Xero OAuth to authorise read access.

2. **Given** Xero authorisation is complete, **When** the import begins, **Then** a progress screen shows each entity being imported with counts: "Chart of Accounts: 87 accounts imported", "Contacts: 234 imported", etc.

3. **Given** the import completes, **When** the user views their workspace, **Then** the chart of accounts matches Xero's structure, contacts are present with ABNs and payment terms, and outstanding invoices show correct amounts and statuses.

4. **Given** Xero has custom account codes that conflict with MoneyQuest's templates, **When** the import detects conflicts, **Then** a mapping review screen shows conflicts and lets the user resolve them before committing.

5. **Given** the import encounters an entity it can't map (e.g., a Xero-specific feature), **When** it's skipped, **Then** a summary at the end lists all skipped items with reasons.

---

### User Story 2 — MYOB Import (Priority: P1)

A bookkeeper migrating from MYOB wants the same seamless import experience. MYOB's data model differs from Xero's — different account type names, different field structures — but the end result should feel identical to the user.

**Why this priority**: MYOB is the #2 accounting platform in Australia. Together with Xero, these two cover 80%+ of the AU market. Supporting both on launch day doubles the addressable migration audience.

**Independent Test**: Can be tested with MYOB sandbox API or exported sample data. Verify MYOB-specific account types are correctly mapped to MoneyQuest equivalents.

**Acceptance Scenarios**:

1. **Given** a user selects "Import from MYOB", **When** they authorise the MYOB API connection, **Then** chart of accounts, contacts, invoices, and opening balances are imported with MYOB-to-MoneyQuest field mapping.

2. **Given** MYOB uses different account type terminology, **When** the import maps accounts, **Then** MYOB types are correctly mapped to MoneyQuest types (e.g., MYOB "Other Income" → MoneyQuest "Revenue").

---

### User Story 3 — QuickBooks Import (Priority: P2)

A business migrating from QuickBooks Online wants to import their data. The workflow mirrors Xero/MYOB but with QuickBooks-specific field mapping.

**Why this priority**: QuickBooks has a smaller AU market share than Xero/MYOB but is growing, especially among US-based clients of AU accountants. P2 because it covers the long tail rather than the core market.

**Independent Test**: Can be tested with QuickBooks sandbox API. Verify account types, contacts, and invoices import correctly with QuickBooks-specific mapping rules.

**Acceptance Scenarios**:

1. **Given** a user selects "Import from QuickBooks", **When** they authorise via OAuth, **Then** chart of accounts, contacts, invoices, and opening balances are imported with QuickBooks-to-MoneyQuest mapping.

---

### User Story 4 — CSV Import with Intelligent Mapping (Priority: P1)

A bookkeeper with exported CSV files (from any source) wants to upload them and have MoneyQuest intelligently suggest column mappings, preview the data, and import. This is the universal fallback — it works for any accounting system, any spreadsheet, any data format that can be exported to CSV.

**Why this priority**: CSV import is the universal fallback for any accounting system. It also covers manual spreadsheet data, niche accounting tools, and situations where API access isn't available. Every user can export a CSV.

**Independent Test**: Can be tested by uploading a sample CSV and verifying the column mapping wizard correctly suggests mappings and imports data. No external API dependencies.

**Acceptance Scenarios**:

1. **Given** the user uploads a contacts CSV, **When** the mapping wizard opens, **Then** it auto-detects columns: "Company Name" → Contact Name, "ABN" → ABN, "Email Address" → Email, with confidence indicators.

2. **Given** the auto-mapping has a wrong suggestion, **When** the user manually changes the mapping, **Then** the preview table updates to reflect the corrected mapping.

3. **Given** the mapping is confirmed, **When** the user clicks "Import", **Then** a preview shows the first 10 rows as they will appear in MoneyQuest, with validation errors highlighted (e.g., invalid ABN, missing required fields).

4. **Given** validation errors exist, **When** the user can fix them inline or skip erroneous rows, **Then** only valid rows are imported and a summary shows imported vs skipped counts.

5. **Given** the user is importing chart of accounts, **When** duplicate account codes are detected, **Then** the wizard highlights them and offers "Skip", "Replace", or "Rename" options.

---

### User Story 5 — Bank Statement Import (CSV/OFX) (Priority: P1)

A bookkeeper without a Basiq bank feed connection wants to manually upload bank statements in CSV or OFX format. Not all banks are covered by Basiq, and some users prefer manual uploads for control or compliance reasons.

**Why this priority**: Not all banks are covered by Basiq, and some users prefer manual uploads. This is the fallback for bank data entry and the only option for historical statement import.

**Independent Test**: Can be tested by uploading a sample OFX file and verifying transactions are imported with correct dates, amounts, and descriptions. No bank connection required.

**Acceptance Scenarios**:

1. **Given** the user uploads an OFX file, **When** it's parsed, **Then** transactions are imported with date, amount, description, and reference — mapped to the selected bank account.

2. **Given** the user uploads a CSV bank statement, **When** the column mapping wizard opens, **Then** it auto-detects Date, Amount (or Debit/Credit columns), Description, and Reference columns.

3. **Given** imported transactions overlap with existing bank feed transactions, **When** duplicates are detected (same date, amount, description), **Then** they are flagged and the user can skip or replace.

4. **Given** a CSV with a single "Amount" column (positive for credits, negative for debits), **When** the import processes, **Then** amounts are correctly normalised to the MoneyQuest always-positive + direction format.

---

### User Story 6 — Import History & Rollback (Priority: P2)

A user who imported bad data wants to undo the entire import rather than manually deleting hundreds of records. Import mistakes happen — wrong file, wrong mapping, wrong workspace. Without rollback, cleanup is painful and error-prone.

**Why this priority**: Import mistakes happen. Without rollback, cleanup is painful and error-prone. Rollback gives users confidence to try the import knowing they can undo it.

**Independent Test**: Can be tested by performing an import, then rolling it back, and verifying all imported records are removed and the workspace state is restored.

**Acceptance Scenarios**:

1. **Given** an import was completed 2 hours ago, **When** the user views Import History, **Then** they see the import with entity counts, timestamp, and a "Rollback" button.

2. **Given** the user clicks "Rollback", **When** confirmed, **Then** all records from that import batch are removed and a success message shows the count of removed items.

3. **Given** an import was completed 31 days ago, **When** the user views it, **Then** the "Rollback" button is disabled with a note "Rollback available for 30 days after import."

---

### Edge Cases

- What happens when a Xero import includes inventory items? Inventory items are imported as expense accounts (MoneyQuest doesn't support inventory). A warning is shown listing the converted items.
- What happens when a CSV file has inconsistent date formats? The mapping wizard detects the format and asks the user to confirm (e.g., "Is 01/02/2026 January 2nd or February 1st?").
- What happens when an import is interrupted midway? The import is atomic — if it fails, nothing is committed. The user can retry.
- What happens when opening balances don't balance? The import creates a "Historical Balancing" account for the difference and flags it for review.
- What happens when a rollback is attempted but imported records have been modified since import? The rollback proceeds but flags modified records for manual review rather than silently deleting user edits.
- What happens when the Xero/MYOB API rate-limits during a large import? The import retries with exponential backoff. The progress screen shows "Waiting for API rate limit..." rather than failing.
- What happens when a CSV file is too large (e.g., 100K rows)? The import processes in chunks with a progress bar. A hard limit of 500K rows per file is enforced with a clear error message.
- What happens when two users start imports on the same workspace simultaneously? The system prevents concurrent imports on the same workspace — the second user sees "Import already in progress" with the first user's name and start time.

---

## Requirements

### Functional Requirements

**Direct Integrations**
- **FR-001**: System MUST support one-click Xero import via OAuth API: chart of accounts, contacts, invoices, bills, and opening balances.
- **FR-002**: System MUST support one-click MYOB import via OAuth API with field mapping.
- **FR-003**: System MUST support QuickBooks Online import via OAuth API.
- **FR-004**: Direct imports MUST show real-time progress with entity-by-entity counts.
- **FR-005**: Direct imports MUST surface mapping conflicts and let users resolve before committing.
- **FR-006**: Direct imports MUST handle API rate limiting with exponential backoff and user-visible status.

**CSV/File Import**
- **FR-007**: System MUST support CSV import for contacts, chart of accounts, invoices, bills, journal entries, and opening balances.
- **FR-008**: CSV import MUST provide an intelligent column mapping wizard with auto-detection and confidence indicators.
- **FR-009**: CSV import MUST preview the first 10 rows as they will appear after import, with inline validation errors.
- **FR-010**: CSV import MUST support duplicate detection with Skip, Replace, or Rename options.
- **FR-011**: CSV import MUST support inline error correction — users can fix validation errors in the preview before committing.

**Bank Statement Import**
- **FR-012**: System MUST support OFX bank statement import with automatic field parsing.
- **FR-013**: System MUST support CSV bank statement import with column mapping wizard.
- **FR-014**: Bank statement imports MUST deduplicate against existing transactions (bank feed or prior imports).
- **FR-015**: Bank statement imports MUST normalise amounts to always-positive with direction enum.

**Import Management**
- **FR-016**: System MUST maintain import history with entity counts, timestamps, and source type.
- **FR-017**: System MUST support import rollback within 30 days of import.
- **FR-018**: Imports MUST be atomic — partial failures roll back entirely.
- **FR-019**: System MUST handle opening balance imbalances by creating a "Historical Balancing" account for the difference.
- **FR-020**: System MUST prevent concurrent imports on the same workspace.
- **FR-021**: System MUST tag all imported records with their import batch ID for rollback traceability.

### Key Entities

- **Import Batch**: A record of an import operation. Fields: `id`, `workspace_id`, `source_type` (xero, myob, quickbooks, csv, ofx), `entity_type` (contacts, chart_of_accounts, invoices, bills, journal_entries, bank_transactions, opening_balances), `record_count`, `skipped_count`, `error_count`, `status` (pending, in_progress, completed, failed, rolled_back), `started_at`, `completed_at`, `rolled_back_at`, `rollback_eligible_until`, `started_by_user_id`.
- **Import Mapping**: A saved column-to-field mapping for CSV imports. Fields: `id`, `workspace_id`, `source_name` (e.g., "Xero Contacts Export"), `entity_type`, `column_mappings` (JSON — source column → MoneyQuest field), `date_format`, `reusable` (boolean). Reusable for recurring imports from the same source.
- **Import Conflict**: A detected conflict during import. Fields: `id`, `import_batch_id`, `entity_type`, `source_identifier` (e.g., account code, contact name), `conflict_type` (duplicate_code, unmappable_field, type_mismatch, balance_mismatch), `resolution` (skip, replace, rename, auto_resolved), `resolved_by_user_id`, `details` (JSON with context).

---

## Success Criteria

- **SC-001**: Xero-to-MoneyQuest migration completes in under 30 minutes for workspaces with up to 10K records.
- **SC-002**: 80%+ of CSV column mappings are auto-detected correctly (user doesn't need to change them).
- **SC-003**: 50% of new workspaces use at least one import path during onboarding.
- **SC-004**: Import rollback requests are under 5% of total imports (indicating data quality is good).
- **SC-005**: Zero data loss on critical entities (contacts, chart of accounts, outstanding invoices/bills) verified by automated comparison between source and imported data.
- **SC-006**: Bank statement deduplication correctly identifies 95%+ of overlapping transactions without false positives.
- **SC-007**: Import atomicity verified — no partial records left behind on failure (tested with intentional mid-import failures).

---

## Clarifications

### Session 2026-03-19

- Q: Which entities are imported via direct integrations (Xero/MYOB/QuickBooks)? → A: Chart of accounts, contacts, invoices, bills, and opening balances. Historical transactions are not imported — only outstanding/open documents and balances as at migration date.
- Q: Should CSV column mappings be saved for reuse? → A: Yes. If a bookkeeper imports contacts from the same Xero export format monthly, the saved mapping should auto-apply on the next upload.
- Q: How are opening balance imbalances handled? → A: The import creates a "Historical Balancing" account (equity type) for the difference and flags it for review. This matches standard accounting practice for migration balancing entries.
- Q: What is the rollback window? → A: 30 days from import completion. After 30 days, imported records are considered permanent and rollback is disabled.
- Q: Should imports create journal entries via the event-sourced aggregate? → A: Opening balances create a single "Opening Balance" journal entry through JournalEntryAggregate. Imported invoices/bills use their respective aggregates. This preserves the event-sourcing guarantee for all financial data.
- Q: How does the system handle imports on workspaces that already have data? → A: Imports are additive. Duplicate detection prevents double-entry. A warning is shown: "This workspace already has data. Import will add to existing records." The user must confirm before proceeding.
