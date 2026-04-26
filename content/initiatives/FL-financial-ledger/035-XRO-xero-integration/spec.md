---
title: "Feature Specification: Xero Migration — One-Click Import"
---

# Feature Specification: Xero Migration — One-Click Import

**Feature Branch**: `035-XRO-xero-integration`
**Created**: 2026-03-16
**Updated**: 2026-03-19
**Status**: Draft (revised — Linear-style one-click philosophy)

## Overview

Switching from Xero to MoneyQuest should take 15 minutes, not 15 hours. This epic provides a friction-free migration tool inspired by Linear's Jira import — connect, map accounts (one screen), import everything, done.

The key insight: **minimise decisions, maximise automation**. AI suggests account mappings, sensible defaults cover 95% of cases, and the user only intervenes on genuinely ambiguous items. A completion bar makes progress tangible.

### Two Import Paths

1. **OAuth API Import** (primary) — Connect directly to Xero, pull everything automatically
2. **CSV Import** (fallback/Phase 0) — Drag-drop Xero's standard CSV exports for users who can't or don't want to grant OAuth access

### What Gets Imported

| Data Type | Import Order | Priority | Notes |
|-----------|-------------|----------|-------|
| Chart of Accounts | 1st | P1 | Foundation — everything references accounts |
| Contacts | 2nd | P1 | Customers + suppliers, needed for invoices |
| Invoices & Bills | 3rd | P1 | AR/AP balances for accurate financial position |
| Journal Entries | 4th | P2 | Full audit trail, opening balances |
| Bank Transactions | 5th | P3 | Historical reconciled transactions |
| Tracking Categories | Mapped | P2 | Mapped to MoneyQuest jobs |

### Entity Type Auto-Detection

When importing from Xero, the system auto-detects entity type from Xero org metadata and can **pre-create a workspace**:

- Xero org name → workspace name
- Xero org type → MoneyQuest entity type (company, sole trader, trust, etc.)
- Xero CoA → seeded from import (not our default templates)
- Skip onboarding questionnaire for imported workspaces

## The Flow — 5 Steps, Not 15

```
┌─────────────────────────────────────────────────┐
│ Step 1: CONNECT                                 │
│ "Connect your Xero account"                     │
│ [Connect Xero] button → OAuth redirect          │
│ ← 10 seconds                                    │
├─────────────────────────────────────────────────┤
│ Step 2: SELECT ORG                              │
│ "Which organisation?" (if multiple)             │
│ List of Xero orgs → select one                  │
│ Auto-detect entity type + create workspace      │
│ ← 5 seconds                                     │
├─────────────────────────────────────────────────┤
│ Step 3: MAP ACCOUNTS (the one real step)        │
│ ┌───────────────────────────────────────────┐   │
│ │ ████████████████████░░░░ 42/45 mapped     │   │
│ │                                           │   │
│ │ Xero Account          → MoneyQuest Type   │   │
│ │ ─────────────────────────────────────     │   │
│ │ ✅ Bank Account (1000) → Bank (auto)      │   │
│ │ ✅ Accounts Recv (1100)→ Asset (auto)     │   │
│ │ ✅ Sales Revenue (4000)→ Revenue (auto)   │   │
│ │ ⚠️  Suspense (9999)    → [Select type ▾]  │   │
│ │ ⚠️  Clearing Acct (8500)→ [Select type ▾] │   │
│ │ ⚠️  Old Drawings (3100) → [Select type ▾] │   │
│ │                                           │   │
│ │ 💡 AI suggested: "Suspense → Equity"      │   │
│ │                                           │   │
│ │ [Confirm & Import Everything]              │   │
│ └───────────────────────────────────────────┘   │
│ ← 2-5 minutes (only ambiguous accounts need you)│
├─────────────────────────────────────────────────┤
│ Step 4: IMPORT (progress ticker)                │
│ ┌───────────────────────────────────────────┐   │
│ │ Importing your data...                    │   │
│ │                                           │   │
│ │ ✅ Chart of Accounts    45 accounts       │   │
│ │ ✅ Contacts              128 contacts     │   │
│ │ ⏳ Invoices & Bills     342/567...        │   │
│ │ ⬚ Journal Entries       — waiting         │   │
│ │ ⬚ Bank Transactions     — waiting         │   │
│ │                                           │   │
│ │ ████████████████░░░░░░ 62%                │   │
│ └───────────────────────────────────────────┘   │
│ ← 5-10 minutes (runs in background)            │
├─────────────────────────────────────────────────┤
│ Step 5: DONE                                    │
│ ┌───────────────────────────────────────────┐   │
│ │ 🎉 Migration complete!                   │   │
│ │                                           │   │
│ │ 45 accounts · 128 contacts · 567 invoices │   │
│ │ 234 journal entries · 1,892 bank txns     │   │
│ │                                           │   │
│ │ 3 items need review (see below)           │   │
│ │                                           │   │
│ │ [Go to Dashboard]  [View Import Report]   │   │
│ └───────────────────────────────────────────┘   │
│ ← done                                          │
└─────────────────────────────────────────────────┘
```

## User Scenarios & Testing

### User Story 1 — Connect Xero (Priority: P1)

A workspace owner wants to connect their Xero account with one click to begin migration.

**Acceptance Scenarios**:

1. **Given** I'm on Settings > Integrations or the onboarding wizard, **When** I click "Connect Xero", **Then** I'm redirected to Xero's OAuth consent page.
2. **Given** I approve in Xero, **When** I'm redirected back, **Then** I see my Xero organisation name and a "Start Import" button.
3. **Given** I have multiple Xero orgs, **When** I return from OAuth, **Then** I see a list of orgs to select from.
4. **Given** my Xero token expires, **When** I next attempt an import, **Then** the system silently refreshes or prompts re-auth.

### User Story 2 — Account Mapping Screen (Priority: P1)

A user needs to map Xero accounts to MoneyQuest account types before import. This is the one screen that requires human input.

**Acceptance Scenarios**:

1. **Given** I've connected Xero, **When** the mapping screen loads, **Then** I see all Xero accounts with AI-suggested MoneyQuest type mappings pre-filled. A completion bar shows "42 of 45 mapped".
2. **Given** 42 of 45 accounts are auto-mapped, **When** I look at the 3 unmapped ones, **Then** they're highlighted with an amber ⚠️ indicator and an AI suggestion tooltip.
3. **Given** I select a mapping for an unmapped account, **When** I confirm it, **Then** the completion bar increments and the item turns green ✅.
4. **Given** all accounts are mapped (bar at 100%), **When** I click "Confirm & Import Everything", **Then** the import begins.
5. **Given** I disagree with an AI suggestion, **When** I click the dropdown, **Then** I can select any MoneyQuest account type from the full list.

### User Story 3 — One-Click Import with Progress (Priority: P1)

A user clicks "Import Everything" and watches their data flow in with a real-time progress ticker.

**Acceptance Scenarios**:

1. **Given** I click "Confirm & Import Everything", **When** the import starts, **Then** I see a progress screen showing each data type with a status (✅ done, ⏳ in progress, ⬚ waiting) and a record count.
2. **Given** the import is running, **When** contacts finish and invoices start, **Then** the contacts line shows ✅ with count, invoices show ⏳ with a counter incrementing, and the overall progress bar advances.
3. **Given** the import completes, **When** all data types are done, **Then** I see a summary card with total counts and a "Go to Dashboard" button.
4. **Given** some records failed (e.g., invoice referencing unmapped account), **When** the summary shows, **Then** I see "3 items need review" with expandable error details.

### User Story 4 — Import Idempotency (Priority: P1)

A user who ran a partial import (or wants to update) can re-run without creating duplicates.

**Acceptance Scenarios**:

1. **Given** I imported 500 invoices yesterday, **When** I run the import again today, **Then** the 500 existing invoices are skipped (matched by Xero ID) and only new ones are imported.
2. **Given** a Xero contact was updated since last import, **When** I re-import, **Then** the system flags the change and offers to update or skip.
3. **Given** a previous import failed midway, **When** I retry, **Then** it resumes from where it left off (already-imported records detected by xero_id).

### User Story 5 — CSV Fallback Import (Priority: P2)

A user who can't or doesn't want to use OAuth can import via Xero's standard CSV exports.

**Acceptance Scenarios**:

1. **Given** I'm on the import page, **When** I click "Import from CSV" instead of "Connect Xero", **Then** I see instructions: "Export these files from Xero: Chart of Accounts, Contacts, Invoices."
2. **Given** I drag-drop a Xero CoA CSV, **When** the file is parsed, **Then** I see the same account mapping screen with the same AI suggestions and completion bar.
3. **Given** I upload multiple CSVs (accounts + contacts + invoices), **When** I click "Import", **Then** the same progress ticker runs.

### User Story 6 — Workspace Auto-Creation from Xero (Priority: P2)

A new user going through onboarding wants to create their workspace directly from their Xero org, skipping the manual setup.

**Acceptance Scenarios**:

1. **Given** I'm in the onboarding wizard and connect Xero, **When** the org is detected, **Then** the workspace name pre-fills with the Xero org name, and entity type is auto-detected.
2. **Given** the Xero org is a "Company", **When** the workspace is created, **Then** the entity type is set to `pty_ltd` and the CoA is seeded from the Xero import (not our default template).
3. **Given** I imported from Xero during onboarding, **When** I reach the dashboard, **Then** I skip the onboarding questionnaire — my data IS my setup.

### User Story 7 — Import Report & History (Priority: P2)

A user wants to review what was imported and audit any issues.

**Acceptance Scenarios**:

1. **Given** an import completed, **When** I visit Settings > Integrations > Import History, **Then** I see past imports with date, source (Xero API / CSV), record counts per type, and status.
2. **Given** an import had 3 errors, **When** I expand the error section, **Then** I see specific records that failed with reasons (e.g., "Invoice INV-0042: contact 'ABC Corp' not found").
3. **Given** I click "View Report" on a past import, **Then** I see a full breakdown: imported counts, skipped (duplicate) counts, error counts, duration.

### User Story 8 — Export to Xero (Priority: P3)

An accountant managing a client transition wants to push JEs back to Xero during a transition period.

**Acceptance Scenarios**:

1. **Given** a connected Xero org, **When** I select journal entries to export, **Then** I see a preview of what will be sent.
2. **Given** I confirm the export, **When** it completes, **Then** a summary shows records created in Xero.

## Architecture

### Account Mapping Engine

The mapping engine auto-matches Xero account types to MoneyQuest types:

| Xero Type | MoneyQuest Type | Confidence |
|-----------|----------------|------------|
| BANK | asset (bank) | 100% — exact |
| CURRENT | asset (current) | 95% |
| FIXED | asset (fixed) | 95% |
| CURRLIAB | liability (current) | 95% |
| TERMLIAB | liability (non-current) | 95% |
| EQUITY | equity | 95% |
| REVENUE | revenue | 95% |
| DIRECTCOSTS | expense (cost of sales) | 90% |
| EXPENSE | expense | 90% |
| OVERHEADS | expense (overhead) | 90% |
| OTHERINCOME | revenue (other) | 85% |
| OTHEREXPENSE | expense (other) | 85% |
| DEPRECIATN | expense (depreciation) | 90% |
| PAYGLIABILITY | liability (payroll) | 80% |

Anything below 80% confidence → flagged as unmapped, AI suggests from account name analysis.

### AI Suggestion for Ambiguous Accounts

For unmapped accounts, the AI analyses the account name and description:
- "Suspense Account" → likely equity or clearing → suggest Equity
- "Directors Loan" → likely liability → suggest Current Liability
- "Retained Earnings" → equity → suggest Equity (Retained Earnings)
- "Clearing Account" → likely asset → suggest Current Asset

Uses the AI chatbot's existing infrastructure (021-AIQ) with a simple prompt.

### Data Models

```
XeroConnection (tenant-scoped)
├── workspace_id: FK
├── xero_tenant_id: string (Xero org ID)
├── xero_org_name: string
├── access_token: text (encrypted)
├── refresh_token: text (encrypted)
├── token_expires_at: datetime
├── status: enum (connected, disconnected, expired)
├── last_imported_at: datetime (nullable)
├── timestamps

ImportJob (tenant-scoped)
├── workspace_id: FK
├── xero_connection_id: FK (nullable — null for CSV imports)
├── source: enum (xero_api, csv)
├── status: enum (pending, mapping, importing, completed, failed)
├── data_types: json (which types to import: ['accounts', 'contacts', 'invoices', ...])
├── progress: json (per-type counts: {accounts: {total: 45, imported: 45, skipped: 0, errors: 0}})
├── account_mappings: json (xero_account_id → moneyquest_chart_account_id)
├── error_log: json (array of {record_type, xero_id, error_message})
├── started_at: datetime (nullable)
├── completed_at: datetime (nullable)
├── timestamps

ImportRecordMap (tenant-scoped — dedup registry)
├── workspace_id: FK
├── import_job_id: FK
├── xero_id: string (Xero entity ID)
├── record_type: string (account, contact, invoice, journal_entry, bank_transaction)
├── local_model_type: string (polymorphic)
├── local_model_id: int
├── timestamps
```

### Import Pipeline (per data type)

Each data type has an importer action:

```
ImportXeroAccounts::run(ImportJob $job)
├── Fetch from Xero API: GET /api.xro/2.0/Accounts
├── For each account:
│   ├── Check ImportRecordMap for existing xero_id → skip if exists
│   ├── Use job.account_mappings to find target MoneyQuest type
│   ├── Create ChartAccount with mapped type
│   ├── Create ImportRecordMap entry
│   └── Update job.progress
└── Return count

ImportXeroContacts::run(ImportJob $job)
├── Fetch from Xero API: GET /api.xro/2.0/Contacts (paginated)
├── For each contact:
│   ├── Check ImportRecordMap → skip if exists
│   ├── Map: name, email, phone, is_customer, is_supplier, ABN
│   ├── Create Contact
│   └── Create ImportRecordMap
└── Return count

ImportXeroInvoices::run(ImportJob $job)
├── Fetch from Xero API: GET /api.xro/2.0/Invoices?where=Date>=...
├── For each invoice:
│   ├── Check ImportRecordMap → skip if exists
│   ├── Resolve contact via ImportRecordMap (xero contact_id → local contact_id)
│   ├── Resolve line item accounts via account_mappings
│   ├── Create Invoice with lines, payments, status
│   └── Create ImportRecordMap
└── Return count

(Same pattern for JournalEntries, BankTransactions)
```

### Queue-Based Processing

Each data type runs as a separate queued job:

```
ImportJob created (status: mapping)
    ↓ user confirms account mappings
ImportJob updated (status: importing)
    ↓ dispatches:
    ├── ImportXeroAccountsJob (runs first, serial)
    ├── ImportXeroContactsJob (runs after accounts, serial)
    ├── ImportXeroInvoicesJob (runs after contacts, parallel with JEs)
    ├── ImportXeroJournalEntriesJob (runs after accounts, parallel with invoices)
    └── ImportXeroBankTransactionsJob (runs last)
    ↓ all complete
ImportJob updated (status: completed)
```

Frontend polls `GET /api/v1/import-jobs/{id}/progress` every 2 seconds during import.

## API Contracts

```
POST   /api/v1/xero/connect                    — initiate OAuth, return redirect URL
GET    /api/v1/xero/callback                    — handle OAuth callback
GET    /api/v1/xero/connection                  — current connection status
DELETE /api/v1/xero/connection                  — disconnect
POST   /api/v1/xero/import/start               — fetch Xero accounts, return mapping data
PATCH  /api/v1/xero/import/{id}/mappings        — save account mappings
POST   /api/v1/xero/import/{id}/confirm         — confirm mappings, begin import
GET    /api/v1/xero/import/{id}/progress        — poll import progress
GET    /api/v1/xero/import/{id}/report          — final import report
GET    /api/v1/xero/import/history              — past imports
POST   /api/v1/xero/import/csv                  — upload CSV files for fallback import
POST   /api/v1/xero/export                      — export selected records to Xero (P3)
GET    /api/v1/xero/import/{id}/suggest-mappings — AI suggestions for unmapped accounts
```

## Dependencies

- **Xero API** — OAuth 2.0, REST API v2.0. Well-documented, rate limited (60 calls/minute).
- **002-CLE** Core Ledger — JE creation
- **005-IAR** Invoicing — invoice/bill creation
- **006-CCM** Contacts — contact creation
- **021-AIQ** AI Chatbot — AI account mapping suggestions
- **013-WSP** Workspace Entity Setup — workspace auto-creation from Xero org

## Non-Functional Requirements

- Full migration (accounts + contacts + 12 months of invoices + JEs) must complete in < 15 minutes
- Account mapping AI suggestions must return within 3 seconds
- Import progress updates visible within 2 seconds of batch completing
- Zero duplicate records when import is re-run (idempotent via xero_id)
- Xero rate limiting (60 calls/min) handled with automatic backoff
- All Xero tokens encrypted at rest
- Import can be cancelled mid-flight — already-imported records retained
- 95%+ of Xero account types auto-mapped without human intervention

## Success Criteria

- **SC-001**: Full Xero migration in under 15 minutes (accounts + contacts + 12 months of data)
- **SC-002**: 95% of account types auto-mapped correctly without manual adjustment
- **SC-003**: Zero duplicates when same import runs twice
- **SC-004**: 80% of users who start the import wizard complete it
- **SC-005**: Progress updates visible within 2 seconds

## Clarifications

### Session 2026-03-19

- Q: Should importing invoices also import their Xero JEs? → A: **Import invoices only, generate JEs fresh.** MoneyQuest's InvoiceAggregate creates the corresponding JEs via our event-sourced system. Cleaner audit trail, consistent with our ledger.
- Q: How to handle Xero system accounts (AR, AP, GST)? → A: **Auto-lock system accounts.** System accounts are auto-matched to MoneyQuest equivalents and greyed out. Only user-created accounts appear in the mapping list. Completion bar starts at ~80%.
- Q: What date range should the default import cover? → A: **Current financial year only.** Import from fiscal year start to today. Historical years available via optional "Import more history" button.
- Q: Should an opening balance JE be auto-generated? → A: **Yes.** Pull Xero trial balance as at fiscal year start date. Create a single opening balance JE. Ensures balance sheet balances from day one of the imported period.
- Q: How to handle Xero tracking categories? → A: **Map to MoneyQuest jobs.** Each tracking category option becomes a job. Transaction lines tagged with tracking categories get the corresponding job_id. Note: Xero supports 2 tracking dimensions — MoneyQuest jobs are flat. Multi-dimensional tracking is a future enhancement for the core platform, not just Xero import.
- Q: How to handle Xero tax codes? → A: **Auto-map silently.** AU Xero tax codes (GST, BAS Excluded, GST Free) are standardised. Auto-map to MoneyQuest equivalents with no user input. Only flag non-AU or custom tax codes for review.
- Q: Multi-dimensional tracking categories? → A: **Noted as future platform enhancement.** Xero has 2 dimensions (e.g., Region + Department). MoneyQuest jobs are currently flat. For Xero import v1, map each dimension's options as separate jobs with a prefix (e.g., "Region: NSW", "Dept: Sales"). Native multi-dimensional tracking is a candidate for a future epic.
