---
title: "Feature Specification: Platform Integrations"
---

# Feature Specification: Platform Integrations

**Epic**: 010-PLT
**Created**: 2026-03-01
**Status**: Draft
**Initiative**: FL — MoneyQuest Ledger
**Phase**: 4 (Sprints 13–16)
**Design Direction**: Super Modern

---

## Context

The Platform Integrations module connects MoneyQuest Ledger to external financial data providers, starting with Basiq for automated Australian bank feeds. It builds on the existing manual bank import infrastructure (004-BFR) by adding provider authentication, automatic transaction syncing, and webhook-driven updates.

> **Current State**: The infrastructure for bank integrations is in place — models support provider fields (`provider`, `provider_account_id`, `last_synced_at`, `external_id`), the 3-pass matching engine works, and the feature gate (`bank_feeds`) is plan-tier-gated. What's missing is the actual external provider connectivity.

### Architectural Context

- **Provider abstraction** — BankAccount model supports `provider` field (basiq|manual) and `provider_account_id` for external linking.
- **Idempotent import** — BankTransaction `external_id` ensures duplicate transactions from provider syncs are skipped.
- **Existing matching engine** — SuggestMatches action provides 3-pass matching (exact, fuzzy, rule-based) that works regardless of import source.
- **Feature gated** — bank_feeds feature requires Starter+ plan; reconciliation requires Professional+.
- **Webhook-ready** — routes and controllers for webhook handlers need to be created outside the auth middleware stack.

### Dependencies

| Direction | Epic | Relationship |
|-----------|------|-------------|
| **Depends on** | 004-BFR Bank Feeds & Reconciliation | Built on bank account/transaction models and matching engine |
| **Depends on** | 003-AUT Auth & Multi-tenancy | Workspace scoping, Sanctum auth |
| **Depends on** | 009-BIL Billing & Monetisation | bank_feeds feature gated by plan tier |
| **Integrates with** | 002-CLE Core Ledger Engine | Reconciled transactions create journal entries |

---

## User Scenarios & Testing

### User Story 1 — Bank Account Connection (Priority: P1)

A user connects their Australian bank account via Basiq, authorising MoneyQuest Ledger to retrieve transaction data. The connection flow uses Basiq's consent UI and stores the provider account reference for ongoing sync.

**Why this priority**: Connection is the prerequisite for all automated bank feeds. Without it, users must manually import transactions.

**Independent Test**: A user can initiate a bank connection, complete Basiq consent, and see their bank account appear in MoneyQuest Ledger with provider = "basiq" and last_synced_at set.

**Acceptance Scenarios**:

1. **Given** a user initiates a bank connection, **When** they complete the Basiq consent flow, **Then** a BankAccount is created with provider = "basiq", provider_account_id set, and last_synced_at initialised
2. **Given** a user on the Trial plan (max_bank_feeds = 0), **When** they attempt to connect a bank, **Then** the system rejects — feature gated by plan tier
3. **Given** a Starter-plan user with 1 connected bank (max = 1), **When** they attempt to connect another, **Then** the system rejects — bank feed limit reached
4. **Given** a user disconnects a bank account, **When** the provider link is removed, **Then** the account remains in the system (with transactions) but provider is set to "manual" and syncing stops

---

### User Story 2 — Automatic Transaction Sync (Priority: P1)

The system automatically retrieves new transactions from connected bank accounts, either via periodic polling or webhook-driven updates. Duplicate transactions are skipped using the `external_id` idempotency key.

**Why this priority**: Automatic sync is the primary value proposition of bank integrations — eliminating manual data entry.

**Independent Test**: After connecting a bank, new transactions appear automatically in the transaction list, with duplicates skipped and the existing matching engine suggesting reconciliation candidates.

**Acceptance Scenarios**:

1. **Given** a connected Basiq bank account, **When** a sync is triggered, **Then** new transactions are imported with external_id, raw_data (original payload), and correct amounts/dates
2. **Given** transactions with external_ids that already exist, **When** a sync runs, **Then** those transactions are skipped (idempotent import)
3. **Given** new transactions are imported, **When** the user views them, **Then** the SuggestMatches engine provides reconciliation suggestions as normal
4. **Given** a sync completes, **When** the bank account is refreshed, **Then** last_synced_at is updated to the current timestamp

---

### User Story 3 — Webhook Processing (Priority: P2)

The system receives webhook notifications from Basiq when new transactions are available, triggering an on-demand sync rather than waiting for the next polling interval.

**Why this priority**: Webhooks provide real-time updates but depend on the sync infrastructure being in place first.

**Independent Test**: A Basiq webhook notification triggers a transaction sync for the relevant bank account, and new transactions appear without manual intervention.

**Acceptance Scenarios**:

1. **Given** a Basiq webhook is received for a connected account, **When** the payload signature is verified, **Then** a sync job is dispatched for that bank account
2. **Given** an invalid webhook signature, **When** the webhook is received, **Then** the system rejects with 401 — no sync is triggered
3. **Given** a webhook for an unknown provider_account_id, **When** the webhook is received, **Then** the system logs a warning and returns 200 (no error to prevent Basiq retries)

---

### Edge Cases

- **Basiq API downtime**: Sync fails → retry with exponential backoff; bank account shows last_synced_at from previous successful sync
- **Rate limiting**: Basiq rate limit hit → queue retry with appropriate delay
- **Duplicate webhook**: Same webhook delivered twice → idempotent import prevents duplicate transactions
- **Account closure**: Bank account closed at the bank → Basiq reports closure; provider status updated but account and history preserved
- **Large historical import**: Initial connection pulls 90 days of history → batch import with progress tracking
- **Multi-currency bank account**: Foreign currency bank account connected → transactions stored in account currency with exchange rate lookup

---

## Requirements

### Functional Requirements

**Provider Connection**

- **FR-PLT-001**: System MUST support connecting bank accounts via Basiq provider using their consent/OAuth flow
- **FR-PLT-002**: Connected accounts MUST store provider = "basiq" and provider_account_id for ongoing reference
- **FR-PLT-003**: System MUST enforce bank feed limits per plan tier (Trial: 0, Starter: 1, Professional: 3, Enterprise: unlimited)
- **FR-PLT-004**: System MUST support disconnecting a provider (revert to manual, stop syncing, preserve transaction history)

**Transaction Sync**

- **FR-PLT-005**: System MUST support automatic transaction retrieval from Basiq for connected accounts
- **FR-PLT-006**: Imported transactions MUST use external_id for idempotent deduplication
- **FR-PLT-007**: Imported transactions MUST store raw_data (original provider payload) for audit
- **FR-PLT-008**: System MUST update last_synced_at on successful sync completion
- **FR-PLT-009**: Synced transactions MUST integrate with the existing SuggestMatches engine for reconciliation

**Webhooks**

- **FR-PLT-010**: System MUST expose a webhook endpoint outside the auth middleware stack
- **FR-PLT-011**: Webhook handler MUST verify payload signatures before processing
- **FR-PLT-012**: Valid webhooks MUST dispatch async sync jobs for the relevant bank account
- **FR-PLT-013**: Webhook endpoint MUST return 200 for unknown accounts (prevent provider retries)

**Error Handling**

- **FR-PLT-014**: Failed syncs MUST retry with exponential backoff
- **FR-PLT-015**: System MUST log sync failures with provider error details for debugging
- **FR-PLT-016**: System MUST handle provider API rate limiting gracefully

**Tenant Scoping**

- **FR-PLT-017**: All provider data MUST be scoped by workspace_id — no cross-workspace bank account access
- **FR-PLT-018**: Webhook handlers MUST resolve workspace from provider_account_id before processing

### Key Entities

- **BankAccount** (existing, extended): Adds provider (basiq|manual), provider_account_id, and last_synced_at fields for external provider linking.
- **BankTransaction** (existing, extended): Uses external_id for idempotent import and raw_data for original provider payload storage.
- **Basiq Provider Service** (planned): API client for Basiq consent flow, transaction retrieval, and connection management.
- **Webhook Controller** (planned): Receives and validates Basiq webhook notifications, dispatches sync jobs.
- **Sync Job** (planned): Queued job that retrieves transactions from Basiq and runs ImportBankTransactions action.

---

## Success Criteria

### Measurable Outcomes

- **SC-PLT-001**: Bank connection flow completes successfully via Basiq consent — account appears with provider = "basiq"
- **SC-PLT-002**: Automatic sync imports new transactions without duplicates — verified by running sync twice with same data
- **SC-PLT-003**: Webhook-triggered sync processes within 30 seconds of notification receipt
- **SC-PLT-004**: Plan-tier bank feed limits enforced — Starter blocked from connecting a second bank
- **SC-PLT-005**: Synced transactions integrate seamlessly with the existing 3-pass matching engine
- **SC-PLT-006**: Failed syncs retry automatically without manual intervention
