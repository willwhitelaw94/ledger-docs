---
title: "Feature Specification: Bank Feeds & Reconciliation"
---

# Feature Specification: Bank Feeds & Reconciliation

**Epic**: 004-BFR
**Created**: 2026-03-11
**Status**: Draft
**Initiative**: FL — MoneyQuest Ledger
**Phase**: 2 (Sprints 5–8)
**Design Direction**: Super Modern

---

## Context

Bank Feeds & Reconciliation connects the ledger to the real world. While the Core Ledger Engine (002-CLE) provides the immutable event-sourced journal, bank feeds bring in external truth — actual bank transactions — and reconciliation is the process of matching that external truth to the internal ledger. This epic delivers automated bank connections via Basiq (CDR-accredited), manual statement import, a 3-pass reconciliation engine, and the rule system that makes reconciliation faster over time.

Every confirmed reconciliation match creates journal entries via the Core Ledger Engine. The reconciliation workspace is designed for power users who process hundreds of transactions daily — split-pane layout, keyboard shortcuts, batch operations, and progress tracking.

### Architectural Context

- **Bank feed provider**: Basiq — CDR-accredited, 135+ AU/NZ institutions, $0.50/user/month. Provider abstraction via `BankFeedProviderInterface` from day one.
- **Single-database multi-tenancy** — all tenants share one Aurora PostgreSQL database, scoped by `tenant_id` via Stancl/Tenancy v3.9.
- **Event sourcing** — confirmed reconciliation matches create journal entries via Spatie laravel-event-sourcing v7. Reconciliation actions (match, unmatch, split) are also event-sourced for full audit trail.
- **Amounts as integers** — all monetary values stored in cents, consistent with 002-CLE.
- **Queue processing** — dedicated `bank-feeds` queue with 2–10 workers, staggered daily sync at 6am AEST.
- **Circuit breaker** — Basiq API failures trigger circuit breaker pattern to prevent cascading failures and protect CDR consent tokens.

### Dependencies

| Direction | Epic | Relationship |
|-----------|------|-------------|
| **Depends on** | 002-CLE Core Ledger Engine | Reconciliation creates journal entries, references chart of accounts and tax codes |
| **Depends on** | 003-AUT Auth & Multi-tenancy | Tenant scoping, user roles, workspace permissions |
| **Blocks** | 007-FRC Financial Reporting | Reconciliation status feeds into report accuracy indicators |
| **Related** | 005-IAR Invoicing & AR/AP | Invoice payments can be matched to bank transactions |

---

## User Scenarios & Testing

### User Story 1 — Bank Account Connection via Basiq (Priority: P1)

A bookkeeper connects their client's bank accounts to MoneyQuest Ledger through the Basiq Connect UI widget. The flow guides the user through CDR consent with their chosen financial institution, supports multiple account types (transaction, savings, credit card, loan), and provides ongoing connection status monitoring. When consent expires or is revoked by the bank, the system surfaces the issue and provides a one-click reconnection flow.

**Why this priority**: Without bank connections, there are no bank transactions to reconcile. This is the entry point for the entire bank feeds pipeline.

**Independent Test**: A bookkeeper can connect a bank account via Basiq, see it appear in the connected accounts list with status "Active", observe transactions sync automatically, and reconnect when consent expires — delivering a live bank feed.

**Acceptance Scenarios**:

1. **Given** a bookkeeper navigates to Bank Feeds settings, **When** they click "Connect Bank Account", **Then** the Basiq Connect widget opens in a modal, displaying a searchable list of 135+ supported AU/NZ financial institutions
2. **Given** the user selects a financial institution (e.g., Commonwealth Bank), **When** they complete the CDR consent flow and authorise account access, **Then** the system receives the Basiq connection ID, stores it tenant-scoped, and displays all authorised accounts (transaction, savings, credit card, loan) for the user to select which to import
3. **Given** a bank connection is established, **When** the user views the Bank Accounts page, **Then** each connected account displays: institution name, account name, BSB/account number (last 4 digits masked), account type, connection status (Active/Expired/Revoked), last sync timestamp, and available balance
4. **Given** a connection has multiple accounts (e.g., 1 transaction + 1 savings + 1 credit card), **When** the user selects only the transaction and credit card accounts, **Then** only those accounts are activated for syncing — the savings account is stored but marked inactive and does not sync
5. **Given** a CDR consent token expires (typically after 12 months), **When** the user views the Bank Accounts page, **Then** the affected connection shows status "Expired" with an amber warning badge and a "Reconnect" button that initiates a new Basiq consent flow pre-populated with the same institution
6. **Given** a CDR consent is revoked by the end user at the bank, **When** the system detects the revocation during the next sync attempt, **Then** the connection status changes to "Revoked", a `BankConnectionRevoked` event is recorded, and the user is notified via in-app alert
7. **Given** a user wants to disconnect a bank account, **When** they click "Disconnect" and confirm, **Then** the Basiq connection is revoked via API, the local connection is soft-deleted, historical synced transactions are retained, and a `BankConnectionDisconnected` event is recorded

---

### User Story 2 — Bank Transaction Sync & Storage (Priority: P1)

The system automatically syncs bank transactions from connected accounts on a daily schedule (6am AEST, staggered per tenant) and stores them in a normalised raw transaction table. Users can also trigger a manual sync at any time. On first connection, a historical backfill retrieves up to 2 years of transaction history. Deduplication ensures no transaction is imported twice, even across overlapping sync windows.

**Why this priority**: Raw bank transactions are the input to the reconciliation engine. Without reliable sync and storage, there is nothing to reconcile.

**Independent Test**: A bookkeeper can connect an account, see historical transactions backfill, observe daily automatic syncs adding new transactions, trigger a manual sync, and verify no duplicates appear — delivering a reliable stream of bank data.

**Acceptance Scenarios**:

1. **Given** a bank account has just been connected, **When** the initial sync runs, **Then** the system retrieves up to 2 years of historical transactions from Basiq, normalises them (date, amount in cents, description, reference, balance, transaction type), and stores them in the `bank_transactions` table scoped by `tenant_id` and `bank_account_id`
2. **Given** the daily sync schedule is 6am AEST, **When** the scheduler triggers, **Then** each tenant's accounts are synced with a staggered offset (tenant hash mod 60 minutes) to distribute API load, processed via the dedicated `bank-feeds` queue with 2–10 workers
3. **Given** a user wants fresher data, **When** they click "Sync Now" on a connected account, **Then** an immediate sync job is dispatched to the `bank-feeds` queue, the button shows a spinner, and a toast confirms "Syncing... new transactions will appear shortly"
4. **Given** a sync retrieves transactions that overlap with previously synced data, **When** the system processes incoming transactions, **Then** deduplication matches on (provider_transaction_id + bank_account_id) and skips any transactions already stored, logging the count of duplicates skipped
5. **Given** a bank transaction is synced with amount -$45.50, **When** it is stored, **Then** the system records amount as -4550 (integer cents), preserves the original sign convention (negative = debit from account), and stores the raw provider description and any structured fields (merchant name, category) separately
6. **Given** a credit card account is connected, **When** transactions sync, **Then** the system correctly handles credit card sign conventions: charges are positive amounts (money owed), payments are negative amounts (money paid), and the running balance reflects the outstanding liability
7. **Given** the Basiq API returns an error during sync, **When** the circuit breaker threshold is reached (3 consecutive failures within 5 minutes), **Then** the circuit opens, further sync attempts for that connection are paused for 30 minutes, a `BankSyncCircuitOpened` event is recorded, and an alert is shown in the UI: "Bank sync temporarily paused — we'll retry automatically"
8. **Given** a sync is in progress, **When** the user triggers a manual sync for the same account, **Then** the system returns "Sync already in progress" and does not enqueue a duplicate job

---

### User Story 3 — CSV/OFX Bank Statement Import (Priority: P1)

A bookkeeper uploads bank statement files (CSV, OFX, QIF) for accounts that are not connected via Basiq — or to backfill historical data. For CSV files, a column mapping wizard guides the user through matching file columns to required fields. All imported transactions go through duplicate detection before being committed.

**Why this priority**: Not all bank accounts support CDR/Basiq, and many users need to import historical statements. This provides a universal fallback for getting bank data into the system.

**Independent Test**: A bookkeeper can upload a CSV file, map columns, preview the parsed transactions, confirm the import, and see the transactions appear in the bank transaction list with no duplicates — delivering statement import that works for any bank.

**Acceptance Scenarios**:

1. **Given** a bookkeeper navigates to a bank account's import page, **When** they upload a CSV file, **Then** the system parses the first 5 rows and presents a column mapping wizard showing detected columns (e.g., "Column A: Date", "Column B: Description", "Column C: Debit", "Column D: Credit") with dropdowns to map each to: Date, Description, Amount, Debit Amount, Credit Amount, Reference, Balance
2. **Given** the CSV has separate Debit and Credit columns, **When** the user maps both, **Then** the system merges them into a single signed amount (debits as negative, credits as positive) and validates that no row has values in both columns simultaneously
3. **Given** column mapping is complete, **When** the user clicks "Preview", **Then** the system displays all parsed transactions in a table with: date, description, amount (formatted as currency), reference — and highlights any rows with parsing errors (invalid dates, non-numeric amounts) in red with error descriptions
4. **Given** the preview shows 500 transactions, **When** the user selects a date range filter (e.g., 1 Jan 2026 – 31 Mar 2026), **Then** only transactions within that range are included in the import, and the count updates to reflect the filtered total
5. **Given** an OFX or QIF file is uploaded, **When** the system parses it, **Then** fields are automatically mapped using the standard file format specification — no manual column mapping is required
6. **Given** the system detects 15 potential duplicates (matching date + amount + description against existing bank transactions for this account), **When** the preview is shown, **Then** duplicate rows are flagged with a warning icon and "Possible duplicate" label, and a checkbox allows the user to skip or include each one
7. **Given** the user confirms the import, **When** the system processes a file with 10,000+ rows, **Then** the import runs as a queued job on the `bank-feeds` queue, a progress indicator shows percentage complete, and a notification is sent when finished: "Imported 9,847 transactions (153 duplicates skipped)"
8. **Given** an import job fails mid-processing (e.g., at row 5,000 of 10,000), **When** the failure is detected, **Then** all transactions from that import batch are rolled back atomically, the user is notified of the failure with the error details, and they can retry the upload

---

### User Story 4 — 3-Pass Reconciliation Engine (Priority: P1)

The reconciliation engine automatically suggests matches between bank transactions and ledger entries using a 3-pass algorithm. Pass 1 finds exact matches (amount + date + reference). Pass 2 finds fuzzy matches (amount within a date window, partial reference). Pass 3 applies saved user rules. Each match carries a confidence score. Users review grouped recommendations and can batch confirm, reject, or manually override matches. Confirmed matches create journal entries via the Core Ledger Engine.

**Why this priority**: Reconciliation is the core value proposition of bank feeds. Without the matching engine, bank transactions are just a list — reconciliation turns them into verified financial records.

**Independent Test**: A bookkeeper runs reconciliation on a bank account, sees auto-suggested matches with confidence scores, batch-confirms the high-confidence matches, manually matches a tricky transaction, and sees the matched count increase in the progress tracker — delivering efficient bank reconciliation.

**Acceptance Scenarios**:

1. **Given** a bank account has 200 unreconciled transactions and the ledger has corresponding entries, **When** the user clicks "Auto-Match" or opens the reconciliation workspace, **Then** the 3-pass engine runs: Pass 1 (exact: amount + date + reference), then Pass 2 (fuzzy: amount match within ±3 calendar days, partial reference or description similarity >70%), then Pass 3 (rule-based: saved user patterns) — each pass only processes transactions not matched by a prior pass
2. **Given** Pass 1 finds a bank transaction for -$1,250.00 on 15 Mar with reference "INV-2026-042" and a ledger entry for $1,250.00 on 15 Mar with reference "INV-2026-042", **When** the match is proposed, **Then** it shows confidence score 100% and match type "Exact" — amount, date, and reference all match
3. **Given** Pass 2 finds a bank transaction for -$850.00 on 17 Mar with description "SMITH JOHN" and a ledger entry for $850.00 on 15 Mar with reference "John Smith Payment", **When** the match is proposed, **Then** it shows confidence score 75% and match type "Fuzzy" — amount matches, date within ±3 days, partial name match
4. **Given** Pass 3 has a saved rule "Payee contains 'ATO' → match to account 22100 BAS Payments", **When** a bank transaction with description "ATO PAYMENT" is processed, **Then** the rule matches with confidence score 90% and match type "Rule" — and proposes creating a new journal entry to the mapped account
5. **Given** the engine has produced 150 match suggestions across all passes, **When** the user views the suggestions grouped by confidence level, **Then** they see: "Exact Matches (85)" in green, "Fuzzy Matches (45)" in amber, "Rule Matches (20)" in blue — each expandable to review individual matches
6. **Given** the user selects all 85 exact matches, **When** they click "Confirm Selected", **Then** the system batch-processes all confirmations: for each match, a `ReconciliationConfirmed` event is stored, the bank transaction status changes to "Reconciled", the linked ledger entry is marked as reconciled, and any required journal entries are created via the Core Ledger Engine
7. **Given** a suggested match is incorrect, **When** the user clicks "Reject", **Then** the match suggestion is removed, the bank transaction returns to "Unmatched", and the pair is excluded from future auto-matching for this reconciliation session
8. **Given** no automatic match was found for a bank transaction, **When** the user manually selects a ledger entry to match it against, **Then** the system creates a manual match with confidence "Manual (100%)", records a `ReconciliationManualMatch` event, and offers to save the pattern as a rule for future matching
9. **Given** a confirmed reconciliation match requires a new journal entry (e.g., bank charge with no existing ledger entry), **When** the user confirms, **Then** a journal entry is created in the Core Ledger Engine with status "Posted", the correct accounts and tax codes from the rule or user selection, and a reference linking back to the bank transaction ID
10. **Given** a reconciliation was confirmed in error, **When** the user clicks "Unmatch" on a reconciled transaction, **Then** the system records a `ReconciliationUnmatched` event, the bank transaction reverts to "Unmatched", the ledger entry is unmarked, and if a journal entry was auto-created by the reconciliation it is reversed via the CLE reversal mechanism

---

### User Story 5 — Reconciliation Workspace UX (Priority: P1)

The reconciliation workspace is a split-pane interface designed for power users who process hundreds of transactions per session. The left pane shows bank transactions, the right pane shows ledger entries. Keyboard shortcuts accelerate common actions. A progress bar tracks reconciliation completion. Filters narrow the working set. Undo provides a safety net for accidental matches.

**Why this priority**: The reconciliation engine's value is only realised if the UX makes it fast and ergonomic. Bookkeepers spend hours in this screen — every second saved per transaction compounds across thousands of transactions per month.

**Independent Test**: A bookkeeper can open the reconciliation workspace, use keyboard shortcuts to navigate and confirm matches, filter by date range and amount, see the progress bar advance as matches are confirmed, and undo a mistaken match — delivering a professional-grade reconciliation experience.

**Acceptance Scenarios**:

1. **Given** the user opens the reconciliation workspace for a bank account, **When** the page loads, **Then** a split-pane layout appears: left pane showing unreconciled bank transactions sorted by date descending, right pane showing unmatched ledger entries sorted by date descending, and a progress bar at the top showing "45 of 200 reconciled (22.5%)"
2. **Given** the user selects a bank transaction in the left pane, **When** they click on it or press Enter, **Then** the right pane automatically filters to show potential matching ledger entries (same or similar amount, nearby dates) with the best matches highlighted
3. **Given** a user wants to use keyboard shortcuts, **When** they press the following keys, **Then** the corresponding action occurs: `j/k` = navigate up/down in active pane, `Tab` = switch between panes, `Enter` = select/confirm match, `m` = manual match selected pair, `r` = reject suggested match, `u` = undo last action, `f` = open filter panel, `s` = run auto-match, `?` = show keyboard shortcut help overlay
4. **Given** the progress bar shows "180 of 200 reconciled (90%)", **When** the user confirms another match, **Then** the progress bar updates to "181 of 200 (90.5%)", the matched transactions are removed from both panes (or moved to a "Reconciled" tab), and the remaining unmatched count decreases
5. **Given** the user wants to narrow the working set, **When** they open the filter panel, **Then** they can filter by: date range (from/to), amount range (min/max), reconciliation status (Unmatched/Matched/All), description search, and account — filters apply to both panes simultaneously
6. **Given** the user accidentally confirmed a match, **When** they press `u` or click "Undo", **Then** the last reconciliation action is reversed, the transactions return to their previous state, and a toast confirms "Match undone"
7. **Given** the user has been working for a while, **When** they navigate away from the reconciliation workspace and return later, **Then** the workspace restores their last filter state and scroll position, preserving their working context

---

### User Story 6 — Bank Feed Rules Management (Priority: P2)

A bookkeeper creates and manages rules that automate reconciliation matching. Rules are created from reconciled transactions ("remember this pattern") or manually. Each rule defines pattern matching criteria (payee name, amount range, reference pattern) and auto-assigns an account, tax code, and description. Rules are workspace-scoped, priority-ordered, and can be individually enabled or disabled.

**Why this priority**: Rules compound reconciliation speed over time. After the first month of manual matching, rules handle the recurring patterns automatically — making each subsequent month faster.

**Independent Test**: A bookkeeper reconciles a bank fee transaction, saves it as a rule, sees the rule match automatically in the next reconciliation pass, and can edit, reorder, and disable the rule — delivering learning reconciliation that gets smarter over time.

**Acceptance Scenarios**:

1. **Given** a user has just manually matched a bank transaction (e.g., "ANZ MONTHLY FEE" → Bank Charges account), **When** the system prompts "Save this as a rule for future matching?", **Then** a rule creation form appears pre-populated with: pattern = "ANZ MONTHLY FEE" (contains match), target account = "Bank Charges", tax code = "BAS Excluded", description = "ANZ Monthly Account Fee"
2. **Given** a user is creating a rule manually, **When** they define the matching criteria, **Then** they can configure: payee/description pattern (contains, starts with, exact match, regex), amount range (exact, min–max, any), reference pattern (contains, starts with), and combination logic (all criteria must match)
3. **Given** a rule is saved with pattern "payee contains 'XERO' AND amount between $30.00–$35.00", **When** Pass 3 of the reconciliation engine processes a bank transaction with description "XERO MONTHLY SUB" and amount -$33.00, **Then** the rule matches and proposes: account = "Software Subscriptions", tax code = "GST", description = "Xero Monthly Subscription" with confidence 90%
4. **Given** 15 rules exist for a workspace, **When** the user views the Rules Management page, **Then** rules are displayed in priority order (1 = highest) with columns: priority, name, pattern summary, target account, tax code, status (enabled/disabled), match count (lifetime), and last matched date
5. **Given** two rules could both match the same transaction, **When** the engine processes the transaction, **Then** the rule with the higher priority (lower number) wins, and the lower-priority rule is not evaluated for that transaction
6. **Given** a rule is no longer relevant, **When** the user toggles it to "Disabled", **Then** the rule is preserved (not deleted) but excluded from Pass 3 matching until re-enabled
7. **Given** a user wants to reorder rules, **When** they drag-and-drop a rule from position 5 to position 2, **Then** all rules between positions 2–4 shift down by one, the reorder is persisted, and a `RulePriorityUpdated` event is recorded
8. **Given** a user edits an existing rule, **When** they change the target account from "Bank Charges" to "Office Expenses", **Then** the rule is updated, a `RuleUpdated` event is recorded, and future matches use the new target account — previously reconciled transactions are not affected

---

### User Story 7 — Split Transactions (Priority: P2)

A bookkeeper splits a single bank transaction across multiple ledger lines when the transaction covers multiple categories (e.g., a supplier payment that includes both goods and freight). Each split line can have a different account and tax code. The split lines must sum exactly to the original bank transaction amount. Completed splits can be saved as rules for recurring patterns.

**Why this priority**: Many real-world bank transactions cover multiple expense categories. Without split support, users must create manual journal entries and lose the direct link to the bank transaction.

**Independent Test**: A bookkeeper splits a $1,100 supplier payment into $1,000 "Cost of Goods" (GST) and $100 "Freight" (GST), confirms the split, and sees both lines posted to the ledger linked to the original bank transaction — delivering accurate multi-category allocation.

**Acceptance Scenarios**:

1. **Given** a user selects an unmatched bank transaction for -$1,100.00, **When** they click "Split Transaction", **Then** a split editor opens showing the original transaction details at the top and an editable line items table below with one pre-populated line for the full amount ($1,100.00)
2. **Given** the split editor is open, **When** the user adds a second line (Account: "Freight", Amount: $100.00, Tax: "GST"), **Then** the first line amount automatically adjusts to $1,000.00, and a running total shows "Split total: $1,100.00 / $1,100.00 (balanced)"
3. **Given** the user has entered split lines totalling $1,050.00 against a $1,100.00 bank transaction, **When** they attempt to confirm, **Then** the system prevents confirmation with "Split lines ($1,050.00) do not equal bank transaction ($1,100.00) — difference of $50.00"
4. **Given** a valid split with 3 lines, **When** the user confirms, **Then** the system creates a single journal entry with 3 debit lines (one per split) and a single credit line to the bank account, a `TransactionSplit` event is recorded, and the bank transaction status changes to "Reconciled (Split)"
5. **Given** a split involves amounts that don't divide evenly (e.g., $100 split 3 ways), **When** the system allocates cents, **Then** the first line gets the rounding remainder: $33.34 + $33.33 + $33.33 = $100.00 — no rounding loss
6. **Given** a user frequently splits transactions from the same supplier, **When** they check "Save as rule" on a confirmed split, **Then** a rule is created that auto-suggests the same split allocation when the pattern matches in future reconciliations
7. **Given** a split has been confirmed and posted, **When** the user wants to undo the split, **Then** the system reverses the journal entry via the CLE reversal mechanism, the bank transaction reverts to "Unmatched", and a `TransactionSplitReversed` event is recorded

---

### User Story 8 — Inter-Account Transfers (Priority: P2)

A bookkeeper identifies and records transfers between two connected bank accounts (e.g., moving money from a transaction account to a savings account). The system detects potential transfer pairs by matching equal-and-opposite amounts between accounts. A dedicated transfer transaction type ensures transfers are not double-counted in income or expense reports.

**Why this priority**: Without transfer handling, a $5,000 transfer between accounts would appear as both a $5,000 expense (from account A) and $5,000 income (to account B) — grossly distorting financial reports.

**Independent Test**: A bookkeeper matches a $5,000 withdrawal from a transaction account to a $5,000 deposit in a savings account as a transfer, and verifies it does not appear in the P&L — delivering accurate inter-account handling.

**Acceptance Scenarios**:

1. **Given** two connected bank accounts have matching transactions (Account A: -$5,000.00 on 10 Mar, Account B: +$5,000.00 on 10 Mar), **When** the system runs transfer detection, **Then** it proposes a transfer match showing both transactions side-by-side with confidence score and label "Possible Transfer"
2. **Given** a transfer match is proposed, **When** the user confirms it, **Then** the system creates a journal entry debiting the destination bank account (Account B) and crediting the source bank account (Account A), both transactions are marked "Reconciled (Transfer)", and a `TransferReconciled` event is recorded
3. **Given** a confirmed transfer, **When** the system categorises the journal entry, **Then** it uses a dedicated "Inter-Account Transfer" transaction type that is excluded from P&L reports (neither income nor expense) and only appears in the Balance Sheet as a movement between asset accounts
4. **Given** the transfer amounts don't match exactly (Account A: -$5,000.00, Account B: +$4,998.00 due to a bank fee), **When** the user wants to record this as a transfer, **Then** they can match the two transactions and allocate the $2.00 difference to a "Bank Fees" account, creating a 3-line journal entry
5. **Given** there is a 1-2 day lag between debit and credit appearing (Account A: -$5,000.00 on 10 Mar, Account B: +$5,000.00 on 12 Mar), **When** transfer detection runs, **Then** the system matches transactions across accounts within a ±5 day window and proposes the match
6. **Given** only one side of a transfer is connected (the source account is linked but the destination is not), **When** the user identifies a bank transaction as a transfer, **Then** they can manually record it as a transfer to an account in the chart of accounts, ensuring it is categorised correctly

---

### User Story 9 — Cash Coding (Priority: P1)

A bookkeeper switches to Cash Coding mode to bulk-categorise unmatched bank transactions in a spreadsheet-style grid. Each row is a bank transaction with editable cells for contact, account, tax code, and description. Rules auto-fill known patterns. The bookkeeper reviews, adjusts where needed, and posts all rows in one batch — creating CPJ/CRJ entries for each.

**Why this priority**: Cash Coding is the single biggest time-saver for high-volume bank accounts. Instead of reconciling transactions one by one, a bookkeeper can categorise 50+ transactions in minutes.

**Independent Test**: A bookkeeper opens Cash Coding for a bank account with 50 unmatched transactions, sees rules auto-fill 30 of them, manually fills the remaining 20, and posts all 50 in one batch — delivering bulk categorisation that's faster than Xero.

**Acceptance Scenarios**:

1. **Given** a bank account has 50 unmatched transactions, **When** the user switches to "Cash Coding" mode, **Then** a spreadsheet-style grid appears with columns: Date (read-only), Description (read-only), Amount (read-only), Contact (editable dropdown), Account (editable dropdown), Tax Code (editable dropdown), Description/Memo (editable text) — one row per transaction
2. **Given** the grid loads, **When** saved rules match any transactions, **Then** the matching rows are auto-filled with the rule's contact, account, tax code, and description — highlighted in blue to indicate rule-applied, editable if the user wants to override
3. **Given** a user is in the grid, **When** they press Tab, **Then** focus moves to the next editable cell in the row; when they reach the last cell in a row, Tab moves to the first editable cell in the next row — full keyboard navigation without mouse
4. **Given** a user types in a Contact cell, **When** they type 2+ characters, **Then** a dropdown filters matching contacts; selecting one fills the cell and offers to auto-fill the same contact for all rows with a matching bank description pattern
5. **Given** the user has filled all 50 rows, **When** they click "Post All", **Then** the system validates every row has contact + account + tax code, creates CPJ/CRJ journal entries for each via the Core Ledger Engine, marks all 50 bank transactions as "Reconciled", and shows a success toast: "50 transactions posted"
6. **Given** 5 rows are incomplete (missing account), **When** the user clicks "Post All", **Then** the system highlights the incomplete rows in red, scrolls to the first error, and shows "5 rows incomplete — fill required fields before posting"
7. **Given** a user wants to post only some rows, **When** they select 30 of 50 rows via checkboxes, **Then** "Post Selected (30)" button appears, and only the selected rows are posted — the remaining 20 stay unmatched in the grid
8. **Given** a posted batch contained an error, **When** the user clicks "Undo Last Batch" within the Cash Coding view, **Then** all journal entries from the last batch are reversed via CLE reversal, and the bank transactions revert to "Unmatched" in the grid

---

### Edge Cases

- **Basiq API downtime / rate limiting**: Circuit breaker opens after 3 consecutive failures within 5 minutes. Sync retries after 30 minutes with exponential backoff. UI shows "Sync temporarily paused" with last successful sync timestamp. Rate-limited requests are re-queued with appropriate delay headers.
- **CDR consent expiry mid-sync**: If a 401/403 is received during sync, the current batch is saved (partial sync), the connection status updates to "Expired", and the user is notified to reconnect. Already-synced transactions are retained.
- **Duplicate transactions from provider**: Deduplication on (provider_transaction_id + bank_account_id). If a provider re-sends a transaction with a different ID but identical details (date + amount + description), the system flags it as a potential duplicate for user review rather than auto-skipping.
- **Timezone handling**: All bank transaction dates are stored as date-only (no time component) in the bank's local timezone. Sync timestamps use UTC. Display uses the workspace's configured timezone. Cross-midnight transactions are assigned the date as reported by the bank.
- **Very large statement imports (10,000+ rows)**: Imports over 1,000 rows are processed as queued jobs with progress tracking. Memory-efficient streaming parser (chunked reads of 500 rows). Import is atomic — all or nothing on failure.
- **Concurrent reconciliation by multiple users**: Optimistic locking on bank transaction reconciliation status. If User A and User B both try to match the same bank transaction simultaneously, the first to confirm wins; the second receives "This transaction has already been reconciled by [user] — please refresh."
- **Bank transaction amount amendments by provider**: If a provider retroactively amends a transaction (rare but possible with pending transactions), the system detects the change on next sync via provider_transaction_id comparison, flags the transaction as "Amended", and if it was already reconciled, alerts the user to review the match.
- **Orphaned matches (ledger entry deleted after match)**: If a reconciled ledger entry is reversed or deleted via CLE, the linked bank transaction reverts to "Unmatched" automatically via an event listener on `JournalEntryReversed`.
- **Split transaction rounding (cents allocation)**: Remainder cents are always allocated to the first split line. Validation enforces split lines sum exactly to the bank transaction amount before confirmation. No implicit rounding.
- **Cross-midnight transactions**: Bank-reported date is authoritative. The system does not attempt to infer "correct" dates from timestamps — the date as provided by the bank/statement is stored and used for matching.
- **Negative amounts on credit cards (payments vs charges)**: Credit card transactions follow provider sign conventions. Charges (purchases) are stored as positive amounts (liability increase), payments to the card are stored as negative amounts (liability decrease). The reconciliation engine respects account type when interpreting sign.
- **Empty CSV/OFX files**: Files with headers but no data rows are rejected with "No transactions found in the uploaded file."
- **Malformed OFX/QIF files**: Parser validates structural integrity before processing. Malformed files are rejected with specific error messages (e.g., "Invalid OFX: missing STMTTRN element").
- **Rule conflicts**: When two enabled rules match the same transaction, the highest-priority rule (lowest priority number) wins. A warning is logged for the workspace admin to review overlapping rules.

---

## Requirements

### Functional Requirements

**Bank Feed Connection**
- **FR-BFR-001**: System MUST integrate with Basiq API via a `BankFeedProviderInterface` abstraction, allowing future provider swaps without modifying consumer code
- **FR-BFR-002**: System MUST embed the Basiq Connect UI widget for CDR consent and institution selection, supporting 135+ AU/NZ financial institutions
- **FR-BFR-003**: System MUST store bank connections tenant-scoped with: connection_id, institution_id, institution_name, status (active/expired/revoked/disconnected), consent_expiry_date, created_at, last_sync_at
- **FR-BFR-004**: System MUST support multiple account types per connection: transaction, savings, credit card, loan — each normalised to a common schema
- **FR-BFR-005**: System MUST monitor CDR consent status and surface expiry/revocation to users with reconnection flow
- **FR-BFR-006**: System MUST support soft-disconnection of bank accounts — historical data retained, syncing stopped
- **FR-BFR-007**: System MUST implement circuit breaker pattern for Basiq API: open after 3 consecutive failures within 5 minutes, half-open retry after 30 minutes, close on first success

**Bank Transaction Sync**
- **FR-BFR-008**: System MUST perform automated daily sync at 6am AEST with per-tenant staggering (tenant hash mod 60 minutes) via dedicated `bank-feeds` queue
- **FR-BFR-009**: System MUST support manual sync trigger with duplicate job prevention (no concurrent syncs per account)
- **FR-BFR-010**: System MUST store raw bank transactions with: provider_transaction_id, bank_account_id, tenant_id, date (date-only), amount (integer cents), description, reference, balance (integer cents), transaction_type, raw_provider_data (JSON), status (unmatched/reconciled/excluded), import_source (basiq/csv/ofx/qif)
- **FR-BFR-011**: System MUST deduplicate on (provider_transaction_id + bank_account_id) for API-synced transactions and (date + amount + description) for file imports with user confirmation
- **FR-BFR-012**: System MUST perform historical backfill of up to 2 years on first connection
- **FR-BFR-013**: System MUST handle credit card sign conventions correctly: charges as positive (liability increase), payments as negative (liability decrease)
- **FR-BFR-014**: System MUST record `BankTransactionsSynced` events with transaction count, sync duration, and any errors

**CSV/OFX/QIF Import**
- **FR-BFR-015**: System MUST accept CSV, OFX, and QIF file uploads with a maximum file size of 10MB
- **FR-BFR-016**: System MUST provide a column mapping wizard for CSV files, allowing mapping to: Date, Description, Amount (single column), Debit Amount, Credit Amount, Reference, Balance
- **FR-BFR-017**: System MUST auto-detect column mappings for OFX and QIF files using standard format specifications
- **FR-BFR-018**: System MUST display a preview of parsed transactions before import with error highlighting for invalid rows
- **FR-BFR-019**: System MUST support date range filtering on import preview to allow partial imports
- **FR-BFR-020**: System MUST detect potential duplicates against existing bank transactions and flag them in preview
- **FR-BFR-021**: System MUST process imports over 1,000 rows as queued jobs with progress tracking and atomic rollback on failure
- **FR-BFR-022**: System MUST use streaming/chunked parsing (500-row chunks) for memory efficiency on large files

**3-Pass Reconciliation Engine**
- **FR-BFR-023**: System MUST implement Pass 1 (Exact Match): match bank transactions to ledger entries where amount, date, and reference all match exactly
- **FR-BFR-024**: System MUST implement Pass 2 (Fuzzy Match): match where amount matches exactly, date is within ±3 calendar days, and description/reference similarity exceeds 70% (Levenshtein or similar algorithm)
- **FR-BFR-025**: System MUST implement Pass 3 (Rule Match): apply workspace-scoped rules in priority order to remaining unmatched transactions
- **FR-BFR-026**: Each pass MUST only process transactions not matched by a prior pass — no re-evaluation of matched transactions
- **FR-BFR-027**: System MUST assign confidence scores to all matches: Pass 1 = 100%, Pass 2 = 60–95% based on similarity metrics, Pass 3 = 90% for rule matches
- **FR-BFR-028**: System MUST support batch confirmation of multiple matches in a single operation
- **FR-BFR-029**: System MUST support match rejection — excluded pairs are not re-suggested in the same reconciliation session
- **FR-BFR-030**: System MUST support manual matching — user selects bank transaction and ledger entry to create a match
- **FR-BFR-031**: System MUST create journal entries via CLE when a reconciliation match is confirmed and no existing ledger entry is linked
- **FR-BFR-032**: System MUST support unmatching — reversing a confirmed match, reverting both sides to "Unmatched" and reversing any auto-created journal entries

**Reconciliation Workspace UX**
- **FR-BFR-033**: System MUST provide a split-pane layout: bank transactions (left), ledger entries (right), with resizable pane widths
- **FR-BFR-034**: System MUST support keyboard shortcuts: `j/k` (navigate), `Tab` (switch pane), `Enter` (confirm), `m` (manual match), `r` (reject), `u` (undo), `f` (filter), `s` (auto-match), `?` (help)
- **FR-BFR-035**: System MUST display reconciliation progress: matched count, unmatched count, total count, and percentage complete
- **FR-BFR-036**: System MUST support filtering by: date range, amount range, reconciliation status, description text search, and account
- **FR-BFR-037**: System MUST support undo of the last reconciliation action (match, unmatch, reject, split)
- **FR-BFR-038**: System MUST persist filter state and scroll position when navigating away and returning to the workspace

**Bank Feed Rules**
- **FR-BFR-039**: System MUST support rule creation from reconciled transactions with pre-populated pattern fields
- **FR-BFR-040**: System MUST support manual rule creation with configurable pattern matching: payee/description (contains, starts with, exact, regex), amount (exact, range, any), reference (contains, starts with)
- **FR-BFR-041**: Rules MUST specify target outputs: chart account, tax code, description — applied when the rule matches
- **FR-BFR-042**: Rules MUST be workspace-scoped (tenant_id) and priority-ordered (integer, 1 = highest)
- **FR-BFR-043**: System MUST support enabling/disabling individual rules without deletion
- **FR-BFR-044**: System MUST resolve rule conflicts by priority — highest priority (lowest number) wins when multiple rules match the same transaction
- **FR-BFR-045**: System MUST track rule usage: lifetime match count and last matched date

**Split Transactions**
- **FR-BFR-046**: System MUST support splitting a single bank transaction across multiple ledger lines with different accounts and tax codes per line
- **FR-BFR-047**: Split line amounts MUST sum exactly to the original bank transaction amount — no implicit rounding allowed
- **FR-BFR-048**: System MUST allocate remainder cents to the first split line when amounts don't divide evenly
- **FR-BFR-049**: Split confirmation MUST create a single journal entry with multiple lines via the CLE
- **FR-BFR-050**: System MUST support saving a split pattern as a rule for future auto-suggestion
- **FR-BFR-051**: System MUST support reversing a confirmed split via CLE reversal mechanism

**Inter-Account Transfers**
- **FR-BFR-052**: System MUST detect potential transfers by matching equal-and-opposite amounts between connected bank accounts within a ±5 day window
- **FR-BFR-053**: System MUST provide a dedicated "Inter-Account Transfer" transaction type that is excluded from P&L categorisation
- **FR-BFR-054**: System MUST support transfer matching with a difference allocation (e.g., bank fees) to a specified account
- **FR-BFR-055**: System MUST support manual transfer recording when only one side of the transfer is from a connected account

**Audit Trail & Events**
- **FR-BFR-056**: System MUST record events for all bank feed actions: `BankConnectionCreated`, `BankConnectionExpired`, `BankConnectionRevoked`, `BankConnectionDisconnected`, `BankTransactionsSynced`, `BankSyncCircuitOpened`, `BankSyncCircuitClosed`
- **FR-BFR-057**: System MUST record events for all reconciliation actions: `ReconciliationConfirmed`, `ReconciliationManualMatch`, `ReconciliationUnmatched`, `ReconciliationRejected`, `TransactionSplit`, `TransactionSplitReversed`, `TransferReconciled`
- **FR-BFR-058**: System MUST record events for rule management: `RuleCreated`, `RuleUpdated`, `RuleDeleted`, `RulePriorityUpdated`, `RuleToggled`
- **FR-BFR-059**: All events MUST include: tenant_id, user_id, timestamp, and the full payload of the action

**Tenant Scoping**
- **FR-BFR-060**: All bank feed data (connections, accounts, transactions, rules, reconciliation state) MUST be scoped by `tenant_id` — no cross-tenant data access
- **FR-BFR-061**: Basiq connection credentials and tokens MUST be stored encrypted and tenant-scoped
- **FR-BFR-062**: System MUST host all data in AWS ap-southeast-2 (Sydney) for ATO DSP and CDR compliance

**Queue Processing**
- **FR-BFR-063**: Bank feed sync jobs MUST use a dedicated `bank-feeds` queue with configurable worker count (2–10)
- **FR-BFR-064**: Sync jobs MUST implement retry logic: 3 attempts with exponential backoff (30s, 120s, 480s) before marking as failed
- **FR-BFR-065**: Failed sync jobs MUST be logged with error details and surfaced to the user in the UI

### Key Entities

- **BankConnection**: A CDR-authorised link to a financial institution via Basiq. Stores connection_id, institution details, consent status (active/expired/revoked/disconnected), consent_expiry_date, and tenant_id. One connection can have multiple BankAccounts.
- **BankAccount**: A single bank account within a connection. Stores provider_account_id, account_name, account_type (transaction/savings/credit_card/loan), BSB, account_number (masked), currency, status (active/inactive), and linked chart_account_id for reconciliation posting.
- **BankTransaction**: A raw transaction from a bank feed or file import. Stores provider_transaction_id, bank_account_id, date, amount (integer cents), description, reference, balance (integer cents), transaction_type, raw_provider_data (JSON), reconciliation_status (unmatched/reconciled/excluded), import_source, and import_batch_id.
- **ReconciliationMatch**: A link between a BankTransaction and a JournalEntry (or JournalEntryLine). Stores match_type (exact/fuzzy/rule/manual/split/transfer), confidence_score, matched_by_user_id, matched_at, rule_id (if rule-matched), and status (confirmed/rejected/reversed).
- **BankFeedRule**: A pattern matching rule for Pass 3 reconciliation. Stores name, pattern criteria (JSON: payee_pattern, amount_range, reference_pattern), target outputs (chart_account_id, tax_code_id, description), priority (integer), enabled (boolean), match_count, last_matched_at, and tenant_id.
- **ImportBatch**: Tracks a CSV/OFX/QIF file import. Stores filename, file_type, row_count, imported_count, duplicate_count, error_count, status (pending/processing/completed/failed), user_id, and tenant_id.

---

## Success Criteria

### Measurable Outcomes

- **SC-BFR-001**: Bank account connection via Basiq completes within 60 seconds from widget open to first transaction sync starting
- **SC-BFR-002**: Daily automated sync processes all tenant accounts within the 60-minute stagger window with zero missed syncs under normal Basiq API conditions
- **SC-BFR-003**: Historical backfill (2 years) completes within 5 minutes per bank account
- **SC-BFR-004**: CSV import of 10,000 transactions completes within 30 seconds including deduplication
- **SC-BFR-005**: 3-pass reconciliation engine processes 500 unmatched transactions in under 10 seconds
- **SC-BFR-006**: Pass 1 (exact match) achieves 100% precision — zero false positives
- **SC-BFR-007**: Pass 2 (fuzzy match) achieves a minimum of 85% precision with manual review on all suggestions
- **SC-BFR-008**: Reconciliation workspace renders split-pane view with 1,000+ transactions in under 2 seconds
- **SC-BFR-009**: Batch confirmation of 100 matches completes in under 5 seconds including journal entry creation
- **SC-BFR-010**: Keyboard shortcut actions execute in under 200ms perceived latency
- **SC-BFR-011**: Zero cross-tenant data leakage for bank connections, transactions, and rules — verified by automated tests
- **SC-BFR-012**: Circuit breaker correctly isolates Basiq API failures — zero cascading failures to other tenants or system components
- **SC-BFR-013**: Split transaction rounding produces zero cent loss or gain — verified by summing all split lines against original amounts
- **SC-BFR-014**: Inter-account transfers produce zero P&L impact — verified by report generation after transfer reconciliation
- **SC-BFR-015**: Rule-based matching (Pass 3) reduces manual reconciliation effort by 40% or more after 3 months of rule accumulation per workspace

---

## Xero Parity & Differentiation

### Xero Patterns We Match
- **Suggested matches**: Green-highlighted auto-matches (amount + date + description) — our Pass 1 exact matches
- **Find & Match**: Search outstanding invoices/bills to match against bank lines — our Pass 2 fuzzy matching + manual match
- **New transaction creation**: Unmatched lines get a form to create a new ledger entry (contact, account, tax) — our "create journal entry on confirm"
- **Bank rules**: Pattern matching on description keywords, amount ranges, contact names with auto-apply or suggest modes — our Pass 3 rule engine
- **Split transactions**: "Add a new line" to split across multiple accounts, must sum to bank total — our split transaction feature
- **Transfers tab**: Dedicated transfer recording between accounts, reconcile both sides — our inter-account transfer detection
- **Cash Coding**: Spreadsheet-style batch assignment of account codes and tax rates across multiple transactions — our batch confirmation with rules
- **Credit card handling**: Liability accounts, charges positive, payments negative — our credit card sign convention handling

### Where We Beat Xero
- **3-pass auto-matching**: Xero shows one suggestion at a time; we run all 3 passes upfront and present grouped recommendations by confidence level for batch review
- **Keyboard-first UX**: Xero reconciliation is mouse-heavy; we provide full keyboard navigation (j/k/Tab/Enter/m/r/u) for power users processing hundreds of transactions
- **Progress tracking**: Xero shows a badge count; we show a live progress bar with percentage and matched/unmatched/total counts
- **Confidence scores**: Xero shows green/no-match binary; we show granular confidence scores (60-100%) so users can prioritise review
- **Rule learning**: Xero rules are manually created; we prompt "Save as rule?" after every manual match, building the rule library organically
- **Split-as-rule**: Xero splits are one-off; we allow saving split patterns as rules for recurring multi-category transactions
- **Undo**: Xero has no undo in reconciliation; we support `u` to reverse the last action instantly
- **Filter persistence**: Xero resets filters on navigation; we persist filter state and scroll position across sessions

### Xero Limitations We Avoid
- **No API reconciliation**: Xero deliberately doesn't expose reconciliation via API — we build reconciliation as a first-class API-driven feature from day one
- **Sequential processing**: Xero processes transactions one at a time; we support batch operations on grouped matches
- **PDF statement import**: Xero requires CSV/OFX — we also require CSV/OFX/QIF (PDF OCR deferred but the import architecture supports future addition)
- **Feed disconnection pain**: Xero reconnection is manual and opaque; we surface CDR consent status proactively with one-click reconnect

---

## Clarifications

### Session 2026-03-11
- Q: Which roles can connect bank accounts and perform reconciliation? -> A: Bookkeeper, Accountant, and Org Owner all have full access to bank feed connection and reconciliation. Approver, Auditor, Client, and Customer roles have no access. Platform Admin has read-only visibility for support purposes.
- Q: What happens to bank transactions when a BankConnection is disconnected? -> A: Fully reconcilable. Disconnected account transactions remain in the reconciliation workspace and can still be matched, split, and transferred. No time limit or read-only lock.
- Q: Should reconciliation support matching one bank transaction to multiple ledger entries (many-to-one)? -> A: No — reconciliation stays 1:1. Maps to traditional special journals: CPJ (Cash Payments Journal) for money out, CRJ (Cash Receipts Journal) for money in. Follows Xero's Batch Payment pattern: PAYBATCH (CPJ — bundle bills into one AP payment) and RECBATCH (CRJ — bundle invoices into one AR receipt). Each batch has a TotalAmount matching the single bank statement line. Individual payments inside allocate to specific invoices. This keeps reconciliation clean (1 bank txn : 1 CPJ/CRJ entry) and pushes multi-invoice allocation to 005-IAR. Batch payments are base currency only (AUD). Cannot mix sales invoices and bills in one batch. Credit notes, prepayments, and overpayments excluded from batches.
- Q: Should new transaction creation during reconciliation require a contact/payee? -> A: Yes — contacts already exist in the system. Contact is a required field when creating new transactions during reconciliation. Use existing contact picker (searchable dropdown). Rules store contact reference for auto-fill on recurring transactions.
- Q: Should the reconciliation workspace include a Cash Coding mode? -> A: Yes — Phase 2. Spreadsheet-style grid view for bulk categorisation of unmatched bank transactions. Built with TanStack Table + React Virtual (already in stack) for consistency with all other tables in the app. Editable cells with dropdown pickers for contact, account, and tax code. Rules auto-fill known patterns. Full keyboard navigation (Tab between cells, Enter to confirm row). No additional library — custom editing UX built on TanStack.

---

## Out of Scope

- **ML-based matching**: Machine learning reconciliation models are deferred to a future phase. The 3-pass system (exact, fuzzy, rule-based) provides the foundation for ML training data collection.
- **Multi-currency bank feeds**: All bank transactions are assumed to be in AUD. Multi-currency support depends on 011-MCY.
- **Real-time transaction notifications**: Webhook-based instant transaction notifications from Basiq are deferred. Daily batch sync is the initial approach.
- **Bank feed analytics/dashboards**: Cash flow forecasting, spending categorisation, and trend analysis built on bank transaction data are deferred.
- **Direct bank API integrations**: Only Basiq is supported as the bank feed provider in this phase. The `BankFeedProviderInterface` enables future direct integrations.
- **Automated full reconciliation**: The system always requires human confirmation. No "auto-reconcile everything" mode — human-in-the-loop is a design principle, not a limitation.
- **Open Banking write access**: The system only reads bank transactions. Payment initiation via CDR/Open Banking is out of scope.
- **Bank account opening/management**: The system connects to existing bank accounts — it does not facilitate opening new accounts.
