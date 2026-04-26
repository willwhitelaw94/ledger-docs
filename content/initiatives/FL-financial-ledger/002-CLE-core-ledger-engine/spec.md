---
title: "Feature Specification: Core Ledger Engine"
---

# Feature Specification: Core Ledger Engine

**Epic**: 002-CLE
**Created**: 2026-03-01
**Status**: Draft
**Initiative**: FL — MoneyQuest Ledger
**Phase**: 1 (Sprints 1–4)
**Design Direction**: Super Modern

---

## Context

The Core Ledger Engine is the foundational layer of MoneyQuest Ledger. Every financial feature — bank feeds, invoicing, reporting, job costing — depends on this engine. It provides event-sourced double-entry accounting, chart of accounts management, period control, and the projector system that drives all downstream reads.

This epic has **zero dependencies** on other epics. All other epics depend on it.

### Architectural Context

- **Single-database multi-tenancy** — all tenants share one Aurora PostgreSQL database, scoped by `tenant_id` via Stancl/Tenancy v3.9. Migration path to database-per-tenant preserved.
- **Event sourcing** — all financial mutations are recorded as immutable events via Spatie laravel-event-sourcing v7. The ledger IS events. Projectors rebuild read models.
- **Amounts as integers** — all monetary values stored in cents to eliminate floating-point precision errors.
- **Reversal-only corrections** — posted entries are never mutated. Errors are corrected via reversal entries.
- **Accrual accounting only** — revenue and expenses recognised when earned/incurred.

### Dependencies

| Direction | Epic | Relationship |
|-----------|------|-------------|
| **Blocks** | 003-AUT Auth & Multi-tenancy | Needs journal entry + CoA to exist |
| **Blocks** | 004-BFR Bank Feeds & Reconciliation | Reconciliation creates journal entries |
| **Blocks** | 005-IAR Invoicing & AR/AP | Invoices post journal entries |
| **Blocks** | 007-FRC Financial Reporting | Reports read from projectors |
| **Blocks** | 008-JCT Job Costing | Job tags on journal entry lines |
| **Independent** | 009-BIL Billing & Monetisation | Billing is central layer, not tenant |

---

## User Scenarios & Testing

### User Story 1 — Double-Entry Journal Entries (Priority: P1)

An accountant creates, reviews, and posts journal entries. Every entry enforces the fundamental accounting invariant: debits must equal credits. Entries follow a three-stage approval workflow (Draft → Pending Approval → Posted) enforcing separation of duties. Once posted, entries are immutable — errors are corrected via reversal entries that create a mirror image, preserving a complete audit trail. All financial mutations are recorded as events for tamper-proof history.

**Why this priority**: The journal entry is the core primitive of the entire system. Every other financial feature — invoicing, reconciliation, reports, job costing — ultimately creates journal entries. Without this, nothing works.

**Independent Test**: An accountant can create a balanced journal entry, submit it for approval, have it approved and posted, see updated account balances, and reverse it if needed — delivering a functional general ledger.

**Acceptance Scenarios**:

1. **Given** an accountant is creating a journal entry, **When** they add lines where total debits ($1,500.00) do not equal total credits ($1,200.00), **Then** the system prevents saving and displays "Debits ($1,500.00) do not equal Credits ($1,200.00) — difference of $300.00"
2. **Given** an accountant creates a balanced journal entry with date, memo, and line items, **When** they save it as draft, **Then** the entry is stored with status "Draft", a `JournalEntryCreated` event is recorded in the event store, and no account balances are affected
3. **Given** a draft journal entry exists, **When** the bookkeeper submits it for approval, **Then** status changes to "Pending Approval", a `JournalEntrySubmitted` event is recorded, and all users with the Approver role receive a notification
4. **Given** a pending journal entry exists, **When** an Approver reviews and approves it, **Then** status changes to "Posted", a `JournalEntryPosted` event is recorded, and the AccountBalance projector updates the affected accounts' running totals in real-time
5. **Given** a posted journal entry contains an error, **When** the accountant initiates a reversal with a reason, **Then** a mirror entry is created (debits become credits, credits become debits), a `JournalEntryReversed` event links to the original, the original entry remains unchanged, and account balances are updated to reflect the net zero effect
6. **Given** an accounting period is closed (e.g., June 2025), **When** a user attempts to post an entry dated within that period, **Then** the system rejects it with "Cannot post to closed period: June 2025"
7. **Given** all amounts are stored as integers (cents), **When** an entry line is created for $1,234.56, **Then** the system stores 123456 internally and displays "$1,234.56" in the UI with correct thousand separators and decimal formatting
8. **Given** a journal entry has 20 line items, **When** the user saves, **Then** the system validates that the sum of all debit lines equals the sum of all credit lines before persisting, and all 20 lines are stored atomically as a single event
9. **Given** a user wants to create a journal entry from a previous one, **When** they select "Copy Entry" on an existing posted entry, **Then** a new draft is created with the same line items, accounts, and amounts — but a new date and no memo pre-filled

---

### User Story 2 — Chart of Accounts Management (Priority: P1)

A bookkeeper or accountant manages the workspace's chart of accounts — creating, editing, archiving, and organising accounts in a hierarchical tree structure. The chart supports industry-specific templates (Australian Standard, Aged Care, Construction, Professional Services, Hospitality, Retail) that can be selected during workspace setup. System accounts (Accounts Receivable, Accounts Payable, GST Collected, GST Paid, Retained Earnings) are locked and cannot be deleted or renamed. Each account carries a default tax code for automated GST handling on transactions.

**Why this priority**: The chart of accounts is the structural backbone — every journal entry references accounts, every report groups by account type, and the entire financial model is shaped by the CoA structure.

**Independent Test**: A user can select an industry template, see the pre-configured account tree, create custom accounts, assign tax codes, and archive unused accounts — delivering a personalised accounting structure ready for transaction entry.

**Acceptance Scenarios**:

1. **Given** a new workspace is being set up, **When** the user selects the "Aged Care" chart of accounts template, **Then** the system seeds industry-specific accounts (funding revenue, service delivery costs, client trust accounts, etc.) with correct categories, codes, and default tax codes
2. **Given** a user is creating a new account, **When** they enter code "41100", name "Consulting Revenue", type "Revenue", and tax code "GST", **Then** the account is created under parent 41000 (Sales) and appears in the correct hierarchical position in the account tree
3. **Given** a system account (e.g., 22000 GST Collected), **When** a user attempts to delete or rename it, **Then** the system prevents the action with "System accounts cannot be modified"
4. **Given** an account has posted transactions, **When** a user attempts to delete it, **Then** the system prevents deletion and suggests archiving instead: "This account has 47 posted transactions. Would you like to archive it instead?"
5. **Given** the account hierarchy supports a maximum of 3 levels, **When** a user tries to create a 4th-level child account, **Then** the system prevents it with "Maximum account depth of 3 levels reached"
6. **Given** an account is created with tax code "GST" (10%), **When** a transaction is posted to this account without overriding the tax code, **Then** the system automatically applies 10% GST and allocates the tax portion to the GST Collected or GST Paid system account
7. **Given** the user has a populated chart of accounts, **When** they view the CoA management page, **Then** accounts are displayed in a collapsible tree grouped by type (Assets → Liabilities → Equity → Revenue → Expenses) with account codes, names, current balances, and tax codes visible
8. **Given** a user searches the chart of accounts, **When** they type "revenue" in the search field, **Then** only accounts matching by name or code are shown, with the tree auto-expanded to reveal matches

---

### User Story 3 — Accounting Period Management (Priority: P1)

An accountant manages accounting periods — opening, closing, and locking fiscal periods to control when journal entries can be posted. The system supports monthly and quarterly periods within a configurable fiscal year. Year-end close is virtual — the P&L rollup to Retained Earnings is calculated by projectors on-the-fly, requiring no manual closing entries.

**Why this priority**: Period control is essential for financial integrity. Without it, users could post entries to prior periods and corrupt historical reports. Virtual year-end close eliminates a major pain point from traditional accounting software.

**Independent Test**: An accountant can close a period, confirm that no new entries can be posted to it, and see that the year-end P&L balance correctly rolls into Retained Earnings on the Balance Sheet — without creating manual closing entries.

**Acceptance Scenarios**:

1. **Given** a workspace has fiscal year starting 1 July, **When** the system initialises periods, **Then** 12 monthly periods are created (Jul–Jun) with status "Open" and labelled with the correct fiscal year
2. **Given** an accounting period for March 2026 is open, **When** the accountant closes it, **Then** the period status changes to "Closed" and any attempt to post a journal entry dated in March 2026 is rejected
3. **Given** a closed period, **When** the accountant needs to post a correction, **Then** they can temporarily re-open the period (with audit log entry), post the correction, and re-close it
4. **Given** the fiscal year has ended (30 June 2026), **When** the accountant views the Balance Sheet as at 1 July 2026, **Then** the Retained Earnings account includes the prior year's net profit/loss calculated by the P&L projector — no manual closing journal entry required
5. **Given** multiple periods are open, **When** the accountant bulk-closes all periods before a date, **Then** each period is closed sequentially and the operation is logged as a single audit event

---

### User Story 4 — Event Sourcing & Projector System (Priority: P1)

The system records every financial mutation as an immutable event in a time-ordered append-only store. Projectors consume these events to build and maintain read-optimised views (account balances, general ledger, trial balance). Events are never deleted or modified — they are the source of truth. Snapshots are taken periodically to optimise replay performance.

**Why this priority**: Event sourcing IS the ledger. Without it, there is no audit trail, no replay capability, and no tamper-proof history. The projector system is how every report and balance in the system gets its data.

**Independent Test**: A developer can replay all events for a workspace and verify that projector state exactly matches the current read models — proving the event store is the single source of truth.

**Acceptance Scenarios**:

1. **Given** a journal entry is posted, **When** the `JournalEntryPosted` event is stored, **Then** it contains the full entry payload (all lines, amounts, accounts, date, memo, user) and is assigned a monotonically increasing sequence number
2. **Given** the AccountBalance projector is running, **When** a `JournalEntryPosted` event arrives, **Then** it updates the running balance for each affected account (incrementing debits, incrementing credits, updating net balance)
3. **Given** 50,000 events exist for a workspace, **When** a full replay is triggered, **Then** all projectors rebuild from event #1 and the resulting state matches the current read models exactly
4. **Given** a snapshot was taken at event #10,000, **When** a replay is triggered, **Then** the system loads the snapshot and replays only events #10,001+ — completing in under 30 seconds for 50K total events
5. **Given** the event-projector queue has exactly 1 worker process, **When** two events arrive simultaneously, **Then** they are processed sequentially in order — guaranteeing projector consistency
6. **Given** an event has been stored, **When** any user or process attempts to modify or delete it, **Then** the system rejects the operation — events are append-only and immutable

---

### Edge Cases

- **Concurrent posting**: Two users approve the same pending journal entry simultaneously → optimistic locking ensures only one succeeds; the second receives a conflict warning
- **Event store corruption**: If a projector falls out of sync → full replay from events (or last snapshot) restores correct state. Alert ops team.
- **Extremely large entries**: A journal entry with 200+ lines → system accepts up to 500 lines per entry; validates balance across all lines atomically
- **Account deletion with child accounts**: Attempting to delete a parent account with active children → system prevents deletion and lists dependent child accounts
- **Period gap**: User tries to close periods out of order (e.g., close April while March is open) → system warns but allows, as some businesses reconcile out of order
- **Fiscal year change**: User tries to change fiscal year after first transaction → system prevents it (FR-CLE-024)
- **Duplicate account codes**: Creating an account with a code that already exists → system rejects with "Account code 41100 already exists in this workspace"
- **Zero-amount lines**: A journal entry line with $0.00 → system rejects lines with zero amounts as they serve no accounting purpose
- **Very old reversals**: Reversing a 2-year-old posted entry → system creates the reversal in the current open period, not the original period
- **Snapshot divergence**: Snapshot state doesn't match replay state → system flags the discrepancy, alerts ops, and rebuilds from full replay

---

## Requirements

### Functional Requirements

**Double-Entry Accounting**
- **FR-CLE-001**: System MUST enforce double-entry balance (sum of debits = sum of credits) on every journal entry before recording
- **FR-CLE-002**: System MUST store all financial amounts as integers (cents) to prevent floating-point precision errors. Display layer converts to dollars with 2 decimal places.
- **FR-CLE-003**: System MUST support reversal entries (never mutation) for error correction on posted entries. Reversals create a linked mirror entry.
- **FR-CLE-004**: System MUST enforce the journal entry workflow: Draft → Pending Approval → Posted. Only Approver role can transition to Posted.
- **FR-CLE-005**: System MUST prevent modification of posted journal entries. Only reversal is permitted.
- **FR-CLE-006**: System MUST support journal entry memos, dates, and reference numbers
- **FR-CLE-007**: System MUST support up to 500 lines per journal entry
- **FR-CLE-008**: System MUST reject journal entry lines with zero amounts
- **FR-CLE-009**: System MUST support "Copy Entry" to create a new draft from an existing entry

**Event Sourcing**
- **FR-CLE-010**: System MUST record all financial mutations as immutable events via Spatie laravel-event-sourcing v7
- **FR-CLE-011**: System MUST assign monotonically increasing sequence numbers to events within each tenant scope
- **FR-CLE-012**: Events MUST be append-only — no modification or deletion permitted under any circumstance
- **FR-CLE-013**: System MUST store the full event payload including all line items, amounts, accounts, user, and timestamp
- **FR-CLE-014**: System MUST use exactly 1 worker process for the event-projector queue to guarantee ordering
- **FR-CLE-015**: System MUST take aggregate snapshots every 100 events to optimise replay performance
- **FR-CLE-016**: System MUST support full replay from events (or last snapshot) to rebuild all projector state

**Projectors**
- **FR-CLE-017**: System MUST maintain an AccountBalance projector — running balance per account updated on every posted entry
- **FR-CLE-018**: System MUST maintain a GeneralLedger projector — chronological list of all posted entries per account
- **FR-CLE-019**: System MUST maintain a TrialBalance projector — debit/credit totals per account for a given period
- **FR-CLE-020**: Reports MUST read exclusively from projector tables, never from raw events

**Chart of Accounts**
- **FR-CLE-021**: System MUST support a hierarchical chart of accounts with 5-digit codes and maximum 3-level depth
- **FR-CLE-022**: System MUST provide industry-specific CoA templates: Australian Standard, Aged Care, Construction, Professional Services, Hospitality, Retail
- **FR-CLE-023**: System MUST lock system accounts (Accounts Receivable, Accounts Payable, GST Collected, GST Paid, Retained Earnings) against deletion and renaming
- **FR-CLE-024**: System MUST lock fiscal year start and base currency after the first journal entry is posted
- **FR-CLE-025**: System MUST enforce unique account codes within a workspace
- **FR-CLE-026**: System MUST support default tax codes per account for automated GST handling
- **FR-CLE-027**: System MUST support archiving accounts (soft-disable) as an alternative to deletion when transactions exist
- **FR-CLE-028**: System MUST prevent deletion of parent accounts that have active child accounts

**Accounting Periods**
- **FR-CLE-029**: System MUST support monthly accounting periods within a configurable fiscal year
- **FR-CLE-030**: System MUST enforce period locks — no entries can be posted to a closed period
- **FR-CLE-031**: System MUST support temporary re-opening of closed periods with audit logging
- **FR-CLE-032**: System MUST implement virtual year-end close — P&L rollup to Retained Earnings calculated by projectors, no manual closing entries required
- **FR-CLE-033**: System MUST support bulk-closing of multiple periods

**Accrual Accounting**
- **FR-CLE-034**: System MUST support accrual accounting only — revenue and expenses recognised when earned/incurred, not when cash is received/paid

**Tax Codes**
- **FR-CLE-035**: System MUST provide Australian GST tax codes: GST (10%), GST-Free (0%), Input-Taxed, Export, BAS Excluded
- **FR-CLE-036**: Tax codes MUST support effective dates — historical transactions retain original rates when rates change
- **FR-CLE-037**: System MUST automatically allocate tax portions to GST Collected (sales) or GST Paid (purchases) system accounts

**Tenant Scoping**
- **FR-CLE-038**: All ledger data (events, projections, accounts, periods) MUST be scoped by `tenant_id` — no cross-tenant data access
- **FR-CLE-039**: System MUST host all data in AWS ap-southeast-2 (Sydney) for ATO DSP compliance

### Key Entities

- **JournalEntry**: The core financial primitive. Contains a date, memo, reference, status (Draft/Pending Approval/Posted/Reversed), and a set of balanced debit/credit lines. Immutable once posted. Belongs to a Tenant.
- **JournalEntryLine**: A single debit or credit within a journal entry. References a ChartAccount, carries an amount (integer cents), an optional tax code override, and optional tags (job, tracking category). The sum of all debit lines must equal the sum of all credit lines.
- **ChartAccount**: An account in the chart of accounts. Has a code (5-digit), name, type (Asset/Liability/Equity/Revenue/Expense), optional parent account, default tax code, and status (Active/Archived). System accounts are flagged and locked.
- **AccountingPeriod**: A fiscal period (monthly) with a start date, end date, and status (Open/Closed/Locked). Controls when journal entries can be posted.
- **TaxCode**: GST classification with a code, name, rate (percentage as integer basis points), BAS field mapping, and effective date range.
- **StoredEvent**: Spatie event sourcing record — the immutable append-only log of all financial mutations. Contains event class, payload (JSON), aggregate UUID, sequence number, and timestamp.
- **Snapshot**: Periodic capture of aggregate state at a point in time. Used to optimise event replay by providing a starting point.

---

## Success Criteria

### Measurable Outcomes

- **SC-CLE-001**: Journal entry creation enforces double-entry balance with zero tolerance — 0% unbalanced entries can be posted
- **SC-CLE-002**: Event sourcing replay can rebuild all projections for a workspace with 500K events in under 10 minutes
- **SC-CLE-003**: AccountBalance projector updates within 500ms of a journal entry being posted
- **SC-CLE-004**: Chart of accounts tree renders with 500+ accounts in under 2 seconds
- **SC-CLE-005**: Period close operation completes in under 3 seconds regardless of transaction volume
- **SC-CLE-006**: Zero cross-tenant data leakage — verified by automated tests querying without tenant scope
- **SC-CLE-007**: All system accounts present and locked after workspace creation with any template
- **SC-CLE-008**: Virtual year-end close produces identical Retained Earnings figure to manual close method — verified by parallel calculation test
