---
title: "Feature Specification: MoneyQuest Ledger"
---

# Feature Specification: MoneyQuest Ledger

**Created**: 2026-03-01
**Status**: Draft
**Input**: Complete Architecture guide + SaaS Starter Kit analysis + Money Quest Business Plan

---

## User Scenarios & Testing

### User Story 1 — Tenant Onboarding & Workspace Setup (Priority: P1)

A business owner signs up for Financial Ledger, creates their organisation, and sets up their first set of books. They choose their industry (aged care, SMB), configure their fiscal year, select a default Australian chart of accounts, and invite team members with appropriate roles. Each workspace operates on its own subdomain (`{slug}.app.com.au`) with fully isolated financial data.

**Why this priority**: Without onboarding, no other feature is usable. This is the entry point for every customer.

**Independent Test**: A new user can sign up, create an organisation, provision a workspace with chart of accounts, and invite a team member — all delivering immediate value as a configured accounting environment.

**Acceptance Scenarios**:

1. **Given** a new user visits the signup page, **When** they complete registration with email, password, MFA setup, and organisation name, **Then** an organisation is created, a default workspace is provisioned with its own database, and the user is redirected to `{slug}.app.com.au/dashboard`
2. **Given** a workspace is being created, **When** the user selects "Australian Standard" chart of accounts, **Then** the system seeds accounts 11000–55000 with correct categories (Assets, Liabilities, Equity, Revenue, Expenses), system accounts locked, and default GST tax codes applied
3. **Given** an organisation owner is on the team management page, **When** they invite a user with the "Bookkeeper" role, **Then** the invitee receives an email, can accept, and upon login has permissions to create/edit transactions and reconcile — but cannot approve journal entries or modify the chart of accounts
4. **Given** a user belongs to multiple organisations, **When** they use the tenant switcher, **Then** they are redirected to the target workspace's subdomain with their session preserved, and they see only that workspace's data
5. **Given** MFA is mandatory per ATO DSP requirements, **When** a user attempts to disable MFA, **Then** the system prevents it and displays a compliance notice

---

### User Story 2 — Double-Entry Journal Entries (Priority: P1)

An accountant creates, reviews, and posts journal entries. Every entry enforces the double-entry invariant (debits must equal credits). Entries are immutable once posted — errors are corrected via reversal entries, preserving a complete audit trail. All financial events are recorded via event sourcing for tamper-proof history.

**Why this priority**: The journal entry is the core primitive of the entire accounting system. Every other financial feature (invoicing, reconciliation, reports) depends on it.

**Independent Test**: An accountant can create a balanced journal entry, post it, see updated account balances, and reverse it if needed — delivering a functional general ledger.

**Acceptance Scenarios**:

1. **Given** an accountant is creating a journal entry, **When** they add lines where total debits ($1,500.00) do not equal total credits ($1,200.00), **Then** the system prevents saving and displays "Debits ($1,500.00) ≠ Credits ($1,200.00)"
2. **Given** an accountant creates a balanced journal entry with memo and date, **When** they save it as draft, **Then** the entry is stored with status "draft" and a `JournalEntryCreated` event is recorded
3. **Given** a draft journal entry exists, **When** the bookkeeper submits it for approval, **Then** status changes to "pending_approval" and all users with the "Approver" role are notified
4. **Given** a pending journal entry exists, **When** an Approver reviews and approves it, **Then** status changes to "posted", a `JournalEntryPosted` event is recorded, and account balance projectors update the affected accounts' running totals
4. **Given** a posted journal entry contains an error, **When** the accountant reverses it with a reason, **Then** a mirror entry is created (debits ↔ credits), a `JournalEntryReversed` event is recorded, and the original entry remains unchanged in the event store
5. **Given** an accounting period is closed (e.g., June 2025), **When** a user attempts to post an entry dated within that period, **Then** the system rejects it with "Cannot post to closed period: June 2025"
6. **Given** all amounts are stored as integers (cents), **When** an entry line is created for $1,234.56, **Then** the system stores 123456 internally and displays $1,234.56 in the UI

---

### User Story 3 — Chart of Accounts Management (Priority: P1)

A bookkeeper or accountant manages the organisation's chart of accounts — creating, editing, archiving, and organising accounts in a hierarchical structure. System accounts (AR, AP, GST Collected, GST Paid, Retained Earnings) are locked and cannot be deleted. Each account carries a default tax code for automated GST handling.

**Why this priority**: The chart of accounts is the structural backbone — journal entries, reports, and reconciliation all reference it.

**Independent Test**: A user can create custom accounts, organise them in a hierarchy, and assign tax codes — delivering a personalised accounting structure.

**Acceptance Scenarios**:

1. **Given** a user is creating a new account, **When** they enter code "41100", name "Consulting Revenue", type "Revenue", and tax code "GST", **Then** the account is created under parent 41000 (Sales) and appears in the correct position in the account tree
2. **Given** a system account (e.g., 22000 GST Collected), **When** a user attempts to delete or rename it, **Then** the system prevents the action with "System accounts cannot be modified"
3. **Given** an account has posted transactions, **When** a user attempts to delete it, **Then** the system prevents deletion and suggests archiving instead
4. **Given** the account hierarchy supports 3 levels maximum, **When** a user tries to create a 4th-level child account, **Then** the system prevents it with "Maximum account depth of 3 levels reached"
5. **Given** an account is created with tax code "GST" (10%), **When** a transaction is posted to this account without overriding the tax code, **Then** the system automatically applies 10% GST and allocates the tax portion to the GST Collected/Paid account

---

### User Story 4 — Bank Feed Connection & Transaction Sync (Priority: P1)

A business owner connects their Australian bank accounts via Basiq's CDR-accredited platform. The system syncs transactions automatically (daily at 6am AEST) and on-demand. Raw bank transactions are stored immutably with full provider data preserved. Each transaction includes enriched data (merchant name, ABN, ANZSIC category) from Basiq.

**Why this priority**: Bank feeds are the lifeblood of modern accounting — without them, all transaction entry is manual, which is the primary pain point the platform solves.

**Independent Test**: A user can connect a bank account, see synced transactions with enriched merchant data, and trigger a manual sync — delivering automated transaction capture.

**Acceptance Scenarios**:

1. **Given** a user clicks "Connect Bank Account", **When** Basiq's Connect UI widget opens, **Then** the user can select their bank, authenticate via CDR consent, and upon success the system stores the connection with masked account number and BSB
2. **Given** a bank connection is active, **When** the daily 6am AEST sync job runs, **Then** new transactions since `last_synced_at` are fetched via cursor pagination, normalised (amounts always positive with direction enum), and stored in `raw_bank_transactions` with `reconciliation_status = 'unmatched'`
3. **Given** Basiq returns a transaction with merchant "COLES SUPERMARKETS", ABN "12345678901", and ANZSIC code "4111", **When** the transaction is stored, **Then** the enriched data is preserved and available for auto-categorisation rules
4. **Given** a transaction with `external_id = "txn_abc123"` already exists, **When** the sync job encounters the same transaction again, **Then** it updates the existing record (upsert on composite key `tenant_id + provider + external_id`) rather than creating a duplicate
5. **Given** a bank connection has failed 5 consecutive sync attempts, **When** the circuit breaker triggers, **Then** auto-sync is disabled for that connection, the user is notified, and a manual "Retry Connection" button is shown
6. **Given** a bank account is connected, **When** the user maps it to chart account 11010 (Business Cheque Account), **Then** all future reconciled transactions from this bank feed create journal entries against that account

---

### User Story 5 — Bank Reconciliation (Priority: P1)

A bookkeeper reconciles bank transactions against accounting records using a 4-pass matching engine. The system automatically suggests matches with confidence scores, and the user confirms, overrides, or creates new entries. High-confidence matches (≥90%) are auto-reconciled. The UX follows a split-pane layout with unmatched transactions on the left and matching options on the right.

**Why this priority**: Reconciliation is where an accounting SaaS earns or loses users. It converts raw bank data into posted accounting entries — the core value loop.

**Independent Test**: A user can view unmatched bank transactions, see suggested matches with confidence percentages, confirm a match with one click, and create new expense entries — delivering automated bookkeeping.

**Acceptance Scenarios**:

1. **Given** a bank transaction for $450.00 on 15 March exists, **When** Pass 1 (exact match) finds an invoice for exactly $450.00 with matching reference number dated 15 March, **Then** the match is suggested with 95%+ confidence and auto-reconciled
2. **Given** a bank transaction for $448.50 on 17 March exists, **When** Pass 2 (fuzzy match) finds an invoice for $450.00 dated 14 March (within ±3 day and ±2% tolerance), **Then** the match is suggested with 72-90% confidence and shown as "High Confidence Suggestion"
3. **Given** a bank transaction description contains "STRIPE", **When** Pass 3 (rule-based) finds a tenant rule "IF description CONTAINS 'STRIPE' THEN match to 41000 Sales Revenue with GST", **Then** the rule is applied and the match is suggested for confirmation
4. **Given** a bank deposit of $1,350.00, **When** the user selects "Find & Match" and searches invoices, **Then** they can select multiple invoices ($450 + $450 + $450) that sum to the deposit amount (1-to-many matching)
5. **Given** the user confirms a suggested match, **When** they click "Confirm", **Then** a `BankTransactionMatched` event is recorded, the bank transaction status becomes "reconciled", the corresponding journal entry is posted, and the match feeds back into ML training data
6. **Given** an unmatched bank transaction, **When** the user clicks "Create New" and selects "Office Supplies" with GST, **Then** a new expense journal entry is created (Dr Office Supplies + Dr GST Paid, Cr Bank), and the bank transaction is marked reconciled
7. **Given** a bank transaction is personal/non-business, **When** the user clicks "Exclude", **Then** a `BankTransactionExcluded` event is recorded and the transaction no longer appears in the reconciliation queue
8. **Given** 42 items remain unmatched, **When** the reconciliation page loads, **Then** a progress indicator shows "42 items to reconcile" and updates in real-time as items are resolved
9. **Given** 8 unmatched bank transactions all match the rule "STRIPE → Sales Revenue", **When** the reconciliation view loads, **Then** they are grouped together under "8 transactions matching STRIPE → Sales Revenue" with a single "Confirm All" button
10. **Given** the user is in the reconciliation queue, **When** they press arrow keys, **Then** focus moves between transactions; Enter confirms the suggested match; C opens "Create New"; E excludes; S opens split

---

### User Story 6 — Financial Reporting (Priority: P2)

An accountant generates standard financial reports — Profit & Loss, Balance Sheet, Trial Balance, Cash Flow Statement, and General Ledger. Reports are built from event-sourced projections (never raw events), support comparative periods, and can be exported to PDF and Excel. All reports reflect only posted journal entries.

**Why this priority**: Reports are the primary output of an accounting system — they inform business decisions, satisfy compliance, and are required for BAS lodgement.

**Independent Test**: A user can generate a P&L for a given period, see revenue vs expenses with correct totals, and export to PDF — delivering actionable financial intelligence.

**Acceptance Scenarios**:

1. **Given** journal entries have been posted for Q1 2026, **When** the user generates a Profit & Loss for "1 Jan 2026 – 31 Mar 2026", **Then** the report shows all revenue and expense accounts with their period totals, subtotals by category, and a net profit/loss figure
2. **Given** the user generates a Balance Sheet as at 31 March 2026, **When** the report renders, **Then** Assets = Liabilities + Equity (the accounting equation holds), and the report includes Current Year Earnings calculated from the P&L projector
3. **Given** the user requests a Trial Balance, **When** the report generates, **Then** total debits equal total credits across all accounts, with opening balance, period movement, and closing balance columns
4. **Given** the user wants comparative reporting, **When** they select "Compare with previous period", **Then** the P&L shows current period alongside the prior period with variance amounts and percentages
5. **Given** the user clicks "Export to Excel", **When** the export completes, **Then** a formatted spreadsheet is downloaded with proper number formatting, account hierarchy indentation, and formula-linked totals

---

### User Story 7 — GST & BAS Reporting (Priority: P2)

An accountant prepares and reviews Business Activity Statement (BAS) reports for ATO lodgement. The system automatically calculates GST collected (1A), GST paid (1B), and other BAS fields from posted journal entries tagged with tax codes. The BAS can be lodged via SBR2 gateway integration or exported for manual lodgement.

**Why this priority**: GST compliance is mandatory for Australian businesses. Automated BAS preparation saves hours of manual work and reduces errors.

**Independent Test**: A user can view a draft BAS for a quarter, see auto-calculated GST totals matching their posted transactions, and export or lodge it.

**Acceptance Scenarios**:

1. **Given** a quarterly period has ended, **When** the user opens BAS preparation, **Then** the system displays auto-calculated totals for: G1 (Total Sales), 1A (GST on Sales), 1B (GST on Purchases), and the net GST payable/refundable
2. **Given** an invoice was posted with tax code "GST" for $1,100 (inc. GST), **When** the BAS projector processes it, **Then** $100 appears in field 1A (GST Collected) and $1,000 in G1 (Total Sales excl. GST)
3. **Given** a purchase was posted with tax code "GST on Expenses" for $550 (inc. GST), **When** the BAS projector processes it, **Then** $50 appears in field 1B (GST on Purchases)
4. **Given** the user reviews and approves the draft BAS, **When** they click "Lodge via SBR2", **Then** the BAS is submitted through the accredited gateway, a confirmation reference is returned, and a settlement journal entry is auto-posted (Dr GST Collected, Cr GST Paid, Dr/Cr ATO Settlement)
5. **Given** a transaction is tagged "BAS Excluded", **When** the BAS report generates, **Then** that transaction is excluded from all BAS field calculations
6. **Given** a business has an ABN and is registered for GST, **When** they issue an invoice to another GST-registered business, **Then** the invoice displays GST as a separate line item with the supplier's ABN

---

### User Story 8 — Invoicing & Accounts Receivable (Priority: P2)

A business creates, sends, and tracks invoices to their customers. Invoices follow a full lifecycle (Draft → Approved → Sent → Partial Payment → Fully Paid). The system prevents overpayment, supports partial payments with FIFO allocation, and maintains an aging report (Current / 1-30 / 31-60 / 61-90 / 90+ days).

**Why this priority**: Invoicing is how businesses get paid. AR tracking directly impacts cash flow visibility.

**Independent Test**: A user can create an invoice, send it to a customer, record a payment, and see the invoice status update — delivering end-to-end receivables management.

**Acceptance Scenarios**:

1. **Given** a user creates an invoice with line items totalling $2,200 (inc. 10% GST), **When** they save it, **Then** the invoice is stored as draft with GST calculated automatically ($200 GST, $2,000 net), and no journal entry is posted yet
2. **Given** a draft invoice is approved, **When** it is sent to the customer, **Then** a journal entry is posted (Dr Accounts Receivable $2,200, Cr Sales Revenue $2,000, Cr GST Collected $200), an `InvoiceSent` event is recorded, and the customer receives the invoice via email
3. **Given** an invoice for $2,200 is outstanding, **When** a $1,000 partial payment is received, **Then** the invoice status changes to "Partially Paid", `amount_remaining` updates to $1,200, and a payment journal entry is posted (Dr Bank $1,000, Cr Accounts Receivable $1,000)
4. **Given** an invoice for $2,200 has $200 remaining, **When** a payment of $300 is attempted, **Then** the system prevents overpayment with "Payment ($300) exceeds outstanding balance ($200)"
5. **Given** multiple invoices are outstanding for a customer, **When** a lump payment is received, **Then** the system allocates using FIFO (oldest invoice first) by default, with an option for the user to manually allocate
6. **Given** invoices exist at various stages of aging, **When** the user views the Aging Report, **Then** they see outstanding amounts bucketed by Current, 1-30, 31-60, 61-90, and 90+ days with customer-level drill-down

---

### User Story 9 — Bills & Accounts Payable (Priority: P2)

A bookkeeper records bills from suppliers, tracks payment due dates, and manages the accounts payable workflow. Bills mirror the invoice lifecycle from the expense side. Batch payment runs can be prepared for multiple bills.

**Why this priority**: AP management prevents missed payments, late fees, and maintains supplier relationships.

**Independent Test**: A user can record a supplier bill, schedule it for payment, and mark it paid — delivering payables tracking.

**Acceptance Scenarios**:

1. **Given** a user creates a bill from a supplier for $3,300 (inc. GST), **When** they save and approve it, **Then** a journal entry is posted (Dr Expense Account $3,000, Dr GST Paid $300, Cr Accounts Payable $3,300)
2. **Given** bills are approaching their due dates, **When** the user views the AP dashboard, **Then** they see bills sorted by due date with overdue items highlighted in red
3. **Given** multiple bills are selected for payment, **When** the user initiates a batch payment run, **Then** the system generates payment journal entries for each bill and marks them as paid

---

### User Story 10 — Subscription Billing & Plan Management (Priority: P2)

The platform owner manages customer subscriptions via Stripe. Billing lives in the central database (not tenant databases) and supports hybrid pricing: base plan tiers + per-entity (sets of books) + per-seat (users) + transaction overage. The system handles trials, upgrades, downgrades, and dunning automatically.

**Why this priority**: Revenue collection is essential for the platform's sustainability. Billing must work independently of tenant database state.

**Independent Test**: A customer can subscribe to a plan, add extra workspaces, invite team members, and see usage reflected in their billing — delivering self-service subscription management.

**Acceptance Scenarios**:

1. **Given** a new customer selects the "Professional" plan ($59/month), **When** they enter payment details, **Then** a Stripe subscription is created with the base price, and the organisation's billing status is set to "active"
2. **Given** a customer on the Professional plan creates a 3rd workspace (1 included), **When** the workspace is provisioned, **Then** the subscription automatically adds a per-entity line item at $15/month for the 2 additional workspaces
3. **Given** a customer's payment fails, **When** Stripe's Smart Retries exhaust, **Then** the subscription status transitions to "past_due", the customer sees a billing warning banner, and after the grace period it moves to "unpaid" with limited access
4. **Given** Australian GST applies at 10%, **When** a customer without an ABN is billed, **Then** GST is added to the invoice total; **When** a customer provides a valid ABN, **Then** reverse charge is applied and GST is not charged
5. **Given** billing webhooks arrive at `/stripe/webhook`, **When** a `customer.subscription.updated` event is received, **Then** the system updates the local subscription state based on the Stripe object's actual status (not the event sequence)

---

### User Story 11 — Role-Based Access Control & Separation of Duties (Priority: P2)

An organisation administrator manages user roles and permissions scoped to each workspace. The system enforces separation of duties — users who create journal entries cannot approve them. Roles include Owner, Admin, Accountant, Bookkeeper, Approver, Auditor, and Client, each with distinct permission sets.

**Why this priority**: Financial software requires strict access control for compliance, fraud prevention, and audit readiness.

**Independent Test**: An admin can assign roles to team members, and the system correctly restricts actions based on those roles.

**Acceptance Scenarios**:

1. **Given** a user has the "Bookkeeper" role in Workspace A and "Auditor" role in Workspace B, **When** they switch to Workspace B, **Then** they can only view data (read-only) and cannot create or modify any transactions
2. **Given** a user has both "Bookkeeper" (creates entries) and "Approver" (approves entries) roles assigned, **When** the admin saves this configuration, **Then** the system rejects it with "Separation of duties violation: Bookkeeper and Approver roles are mutually exclusive"
3. **Given** a user with "Client" role logs in, **When** they navigate the workspace, **Then** they can only view selected financial reports shared with them and cannot access the general ledger, bank feeds, or settings
4. **Given** the audit log is enabled, **When** any user performs a financial action (create, post, reverse, reconcile), **Then** the action is recorded with timestamp, user ID, IP address, and the full event payload

---

### User Story 12 — Multi-Currency Support (Priority: P3)

A business operating internationally records transactions in foreign currencies. Each entry stores both the transaction currency amount and the AUD base amount at the locked exchange rate. Month-end revaluation of outstanding foreign balances generates unrealised FX gain/loss entries.

**Why this priority**: Important for businesses with international operations but not required for the core Australian aged care use case.

**Independent Test**: A user can create a USD invoice, record payment at the spot rate, and see FX gain/loss calculated — delivering multi-currency accounting.

**Acceptance Scenarios**:

1. **Given** a user creates an invoice for USD 1,000, **When** the exchange rate is AUD/USD 0.65, **Then** the system records the transaction amount as USD 1,000 and the base amount as AUD 1,538.46
2. **Given** an outstanding USD receivable exists at AUD 1,538.46, **When** month-end revaluation runs with AUD/USD at 0.67, **Then** the system creates an unrealised FX adjustment entry for the difference and posts it to account 8200 (Unrealised FX Gain/Loss)
3. **Given** a USD payment is received, **When** the actual AUD amount differs from the original booking rate, **Then** the system posts a realised FX gain/loss to account 8100

---

### User Story 13 — Per-Client Funding & Budget Tracking (Priority: P3)

An organisation tracks funding allocations per client from any source (government programs, NDIS, grants, internal budgets). Each client has a configurable budget with allocation amounts, drawdown tracking, and co-payment obligations. The module is program-agnostic — it works for aged care (Support at Home, NDIS), disability services, or any per-client funded service model.

**Why this priority**: Core differentiator for service-based organisations managing client budgets. Versatile enough to serve aged care, disability, and broader funded services markets.

**Independent Test**: A coordinator can set up a client's budget, record service deliveries against it, and see the remaining balance — delivering per-client funding visibility.

**Acceptance Scenarios**:

1. **Given** a client has a funding allocation of $50,000/year from "Support at Home", **When** the coordinator views their funding dashboard, **Then** they see total allocation, amount spent, amount committed, and remaining balance — broken down by funding source if multiple exist
2. **Given** a service is delivered for 2 hours at $65/hour, **When** the coordinator records the service against the client, **Then** $130 is deducted from the client's funding allocation and a journal entry is posted against the appropriate revenue account
3. **Given** a client has a co-payment obligation of 15%, **When** an invoice is generated for a $1,000 service, **Then** it shows $850 funded and $150 client contribution with transparent fee disclosure
4. **Given** a funding period ends, **When** the administrator generates a reconciliation report, **Then** it shows total funding received vs. services delivered per client with unspent or overspent amounts flagged
5. **Given** a client has multiple funding sources (e.g., government + family top-up), **When** a service is recorded, **Then** the system allocates costs to funding sources by configurable priority order

---

### User Story 14 — Stripe Connect for Tenant Invoice Payments (Priority: P3)

A business enables their customers to pay invoices online via the platform. Stripe Connect Express accounts handle KYC/identity verification for each tenant. The platform takes a configurable commission on processed payments.

**Why this priority**: Online invoice payments improve cash flow and reduce manual payment processing, but require tenant-level Stripe onboarding.

**Independent Test**: A tenant can complete Stripe Express onboarding, their customer can pay an invoice online, and funds settle to the tenant's bank account.

**Acceptance Scenarios**:

1. **Given** a tenant clicks "Enable Online Payments", **When** they complete the Stripe Express onboarding flow, **Then** their Express account is connected, KYC is handled by Stripe, and they see a payout dashboard
2. **Given** a tenant sends an invoice with online payment enabled, **When** the customer clicks "Pay Now", **Then** they're presented with a Stripe-hosted payment page, and upon successful payment a `PaymentReceived` event is recorded and the invoice is updated
3. **Given** the platform commission is 1.5%, **When** a $1,000 invoice payment is processed, **Then** $15 is retained by the platform and $985 (minus Stripe fees) settles to the tenant's connected bank account

---

### User Story 15 — Real-Time Collaboration & Notifications (Priority: P3)

Multiple users working in the same workspace see real-time updates when transactions are created, reconciliations are completed, or entries are posted. The system uses WebSocket connections (Laravel Reverb) for live updates and sends email/in-app notifications for important events.

**Why this priority**: Improves team productivity and prevents conflicting work, but the system functions without it.

**Independent Test**: Two users are viewing the reconciliation queue simultaneously — when one confirms a match, the other sees the item disappear from their queue in real-time.

**Acceptance Scenarios**:

1. **Given** two bookkeepers are viewing the reconciliation queue, **When** User A confirms a match, **Then** User B sees the item removed from their queue within 2 seconds without page refresh
2. **Given** a batch bank sync completes with 45 new transactions, **When** the sync finishes, **Then** all active users in that workspace see a notification "45 new transactions imported"
3. **Given** a journal entry requires approval, **When** a bookkeeper creates and submits it, **Then** all users with the "Approver" role receive an in-app and email notification

---

### User Story 16 — Inter-Entity Transactions & Consolidated Reporting (Priority: P2)

An organisation with multiple workspaces (e.g., separate entities for different aged care facilities) records transactions between them. The system creates linked journal entries in both workspaces via intercompany receivable/payable accounts. At the organisation level, consolidated P&L and Balance Sheet reports aggregate all workspaces and auto-eliminate inter-entity items. Available on Enterprise tier only.

**Why this priority**: Key differentiator from Xero/MYOB. Critical for multi-entity aged care providers managing multiple facilities under one organisation.

**Independent Test**: An admin creates an inter-entity transaction between two workspaces, and the consolidated Balance Sheet shows the correct combined position with intercompany balances eliminated.

**Acceptance Scenarios**:

1. **Given** Workspace A owes Workspace B $5,000 for shared services, **When** the accountant records an inter-entity transaction, **Then** Workspace A posts (Dr Shared Services Expense $5,000, Cr Intercompany Payable - B $5,000) and Workspace B simultaneously posts (Dr Intercompany Receivable - A $5,000, Cr Shared Services Revenue $5,000)
2. **Given** both workspaces have posted entries, **When** the org admin generates a consolidated P&L, **Then** the inter-entity revenue and expense are eliminated and only external transactions remain
3. **Given** the consolidated Balance Sheet is generated, **When** intercompany receivable/payable balances exist, **Then** they are eliminated and the report shows only external assets and liabilities
4. **Given** a user is on the Starter or Professional plan, **When** they attempt to access inter-entity transactions or consolidated reports, **Then** they see an upgrade prompt for the Enterprise tier

---

### User Story 17 — Credit Notes & Refunds (Priority: P2)

A bookkeeper issues credit notes against invoices when goods are returned, services are disputed, or billing errors occur. Credit notes can be applied to future invoices or refunded directly. The system automatically posts reversal journal entries.

**Why this priority**: Essential for complete AR management. Without credit notes, error correction requires voiding entire invoices.

**Independent Test**: A user creates a credit note against an invoice, applies it to a future invoice, and sees both balances correctly adjusted.

**Acceptance Scenarios**:

1. **Given** an invoice for $2,200 was sent, **When** a credit note for $500 is issued against it, **Then** the system posts a reversal entry (Dr Sales Revenue / GST Collected, Cr Accounts Receivable $500) and the invoice outstanding balance reduces to $1,700
2. **Given** a credit note of $500 exists for a customer, **When** a new invoice for $1,000 is created, **Then** the user can apply the credit, reducing the new invoice balance to $500
3. **Given** a credit note cannot be applied to a future invoice, **When** the user processes a refund, **Then** a payment journal entry is posted (Dr Accounts Receivable, Cr Bank) and the credit note is marked as refunded

---

### User Story 18 — Job Costing & Project Tracking (Priority: P2)

A business tracks revenue and costs against specific jobs, projects, or engagements. Jobs can be nested hierarchically (Client → Project → Phase → Task). Every journal entry, invoice, and bill line can be tagged to a job. Job profitability reports show revenue vs. costs vs. budget per job with roll-up to parent levels.

**Why this priority**: Essential for service businesses (aged care, consulting, construction) that need to track profitability per client engagement. Key differentiator over basic accounting tools.

**Independent Test**: A user creates a job, tags invoices and expenses to it, and generates a job profitability report showing margin — delivering per-engagement financial visibility.

**Acceptance Scenarios**:

1. **Given** a user creates a hierarchical job structure (Client: "Trilogy Care" → Project: "Facility A Staffing" → Phase: "Q1 2026"), **When** viewing the job list, **Then** they see a tree structure with expandable levels and roll-up totals at each level
2. **Given** a journal entry line is being created, **When** the user tags it to a job, **Then** the cost is allocated to that job and visible in job reports
3. **Given** an invoice is created for "Facility A Staffing" with 3 line items, **When** each line is tagged to a different phase, **Then** revenue is allocated to the correct phase and rolls up to the project and client levels
4. **Given** a job has a budget of $50,000, **When** the user views the job dashboard, **Then** they see budget vs. actual (revenue and costs), percentage consumed, estimated margin, and remaining budget
5. **Given** multiple jobs exist at various hierarchy levels, **When** the user generates a Job Profitability Report, **Then** it shows revenue, direct costs, gross margin, and margin % per job — with drill-down from client → project → phase
6. **Given** a bill line is tagged to a job, **When** the bill is approved, **Then** the expense appears in the job's cost breakdown alongside any directly posted journal entries

---

### User Story 19 — Hierarchical Client & Budget Management (Priority: P2)

Clients (contacts) can be organised hierarchically — parent organisations with child entities, departments, or individuals. Budgets are assigned at any level and roll up. This supports aged care providers with multiple facilities, corporate clients with departments, or any organisation needing tiered budget tracking.

**Why this priority**: Enables the per-client funding model (Story 13) to work at scale with complex organisational structures. Critical for aged care with multiple facilities and funding streams.

**Independent Test**: A user creates a parent client with child entities, assigns budgets at both levels, and sees roll-up totals — delivering hierarchical financial tracking.

**Acceptance Scenarios**:

1. **Given** a parent client "Trilogy Care" exists, **When** a user creates child clients "Facility A" and "Facility B" under it, **Then** the client list shows a tree structure and financials roll up from children to parent
2. **Given** "Facility A" has a budget of $200,000 and "Facility B" has $150,000, **When** viewing "Trilogy Care" (parent), **Then** the combined budget shows $350,000 with a breakdown by child entity
3. **Given** an invoice is raised against "Facility A", **When** the user views "Trilogy Care" reports, **Then** the revenue appears both at the facility level and rolled up to the parent
4. **Given** a funding source is assigned at the parent level, **When** services are delivered to child entities, **Then** drawdowns are tracked per child but the overall funding balance is managed at the parent level

---

### Edge Cases

- What happens when a tenant's database becomes unavailable? Billing and auth continue via the central database; the user sees a "workspace temporarily unavailable" message
- How does the system handle a bank returning duplicate transactions across syncs? Composite unique key on `(tenant_id, provider, external_id)` prevents duplicates via upsert
- What happens when a bank transaction transitions from pending to cleared? Only `posted` transactions are imported; pending transactions are ignored to avoid phantom entries
- How does the system handle a reversed bank transaction? Match reversals to originals (same amount, opposite direction, similar date) and create corrective journal entries
- What happens when Basiq's CDR consent expires? Monitor expiry dates, prompt re-consent 14 days before expiry, disable auto-sync on expiry
- What happens when a user is removed from an organisation while they have draft journal entries? Draft entries are retained but reassigned to the workspace admin; the removed user loses access immediately
- How does the system handle concurrent reconciliation of the same transaction? Optimistic locking — if User B tries to reconcile a transaction User A just reconciled, they see "This transaction was reconciled by [User A] moments ago"
- What happens during a tenant database migration failure? The migration pipeline rolls back, the tenant remains on the previous schema version, and an alert is raised to ops

---

## Requirements

### Functional Requirements

**Core Accounting**
- **FR-001**: System MUST enforce double-entry balance (debits = credits) on every journal entry before recording
- **FR-002**: System MUST store all financial amounts as integers (cents) to prevent floating-point precision errors
- **FR-003**: System MUST record all financial mutations as immutable events via Spatie Event Sourcing v7
- **FR-004**: System MUST support reversal entries (never mutation) for error correction on posted entries
- **FR-005**: System MUST enforce accounting period locks — no entries can be posted to a closed period
- **FR-006**: System MUST maintain an Australian chart of accounts with standard 4-5 digit codes and 3-level hierarchy
- **FR-007**: System MUST lock system accounts (AR, AP, GST Collected, GST Paid, Retained Earnings) against deletion

**Bank Feeds & Reconciliation**
- **FR-008**: System MUST integrate with Basiq for Australian bank feed connectivity (135+ institutions, CDR-accredited)
- **FR-009**: System MUST sync bank transactions daily at 6am AEST with staggered random delay (0-300 seconds)
- **FR-010**: System MUST store raw bank transactions with full provider data preserved in a JSON column
- **FR-011**: System MUST normalise transaction amounts to always-positive with a separate direction enum (debit/credit)
- **FR-012**: System MUST enforce idempotency via composite unique key on `(tenant_id, provider, external_id)`
- **FR-013**: System MUST implement a 3-pass reconciliation engine for MVP: exact → fuzzy → rule-based (ML smart match deferred to post-MVP)
- **FR-014**: System MUST auto-reconcile matches with ≥90% confidence after ≥3 confirmed matches for that pattern
- **FR-015**: System MUST support 1-to-many and many-to-1 matching (batch deposits, partial payments)
- **FR-016**: System MUST implement a circuit breaker disabling auto-sync after 5 consecutive failures

**Reporting & Compliance**
- **FR-017**: System MUST generate financial reports (P&L, Balance Sheet, Trial Balance, Cash Flow, GL) from projections
- **FR-018**: System MUST calculate BAS fields (G1, 1A, 1B) from posted entries tagged with Australian tax codes
- **FR-019**: System MUST support BAS lodgement via SBR2 accredited gateway
- **FR-020**: System MUST maintain aging reports for AR and AP (Current / 1-30 / 31-60 / 61-90 / 90+ days)
- **FR-021**: System MUST support comparative period reporting with variance amounts and percentages
- **FR-022**: System MUST export reports to PDF and Excel formats

**Multi-Tenancy & Auth**
- **FR-023**: System MUST provide database-per-tenant isolation via Stancl/Tenancy v3.9
- **FR-024**: System MUST identify tenants by subdomain (`{slug}.app.com.au`)
- **FR-025**: System MUST enforce mandatory MFA (cannot be disabled) per ATO DSP requirements
- **FR-026**: System MUST enforce 30-minute session timeout
- **FR-027**: System MUST implement brute-force lockout after 5 failed login attempts
- **FR-028**: System MUST support the Org → Tenant → User hierarchy with scoped roles per workspace
- **FR-029**: System MUST enforce separation of duties (mutually exclusive role pairs)
- **FR-030**: System MUST log all security-relevant events with 12+ month retention

**Billing**
- **FR-031**: System MUST store all billing state in the central database (not tenant databases)
- **FR-032**: System MUST support hybrid pricing: base plan + per-entity + per-seat + transaction overage
- **FR-033**: System MUST handle Australian GST on subscriptions via Stripe Tax
- **FR-034**: System MUST validate ABNs against the Australian Business Register

**Invoicing & AP**
- **FR-035**: System MUST support the full invoice lifecycle: Draft → Approved → Sent → Payment → Paid
- **FR-036**: System MUST prevent overpayment at the domain level
- **FR-037**: System MUST support FIFO payment allocation with manual override
- **FR-038**: System MUST support bill recording and AP tracking with due date management

**Attachments**
- **FR-043**: System MUST support file uploads (receipts, statements, documents) to S3 with per-tenant key prefix
- **FR-044**: System MUST allow attachments to be linked to journal entries, invoices, bills, and bank transactions
- **FR-045**: System MUST support accrual accounting only — revenue/expenses recognised when earned/incurred

**Invoice Delivery**
- **FR-046**: System MUST send invoices via email with branded PDF attachment
- **FR-047**: System MUST provide a customer portal where recipients can view invoices, payment history, and make online payments

**Data Portability & Retention**
- **FR-050**: System MUST support full data export (CSV/JSON) of chart of accounts, journal entries, contacts, invoices, bills, and bank transactions
- **FR-051**: System MUST soft-delete workspaces with a 90-day reactivation grace period, then archive to cold storage
- **FR-052**: System MUST maintain a 7-year ATO-compliant archive of all financial data regardless of subscription status
- **FR-053**: Tax codes MUST support effective dates — historical transactions retain original rates when rates change

**Customer Portal**
- **FR-054**: System MUST provide a customer portal for invoice recipients accessible via magic link (no password required)
- **FR-055**: Magic links MUST expire after payment or 30 days, whichever comes first

**Inter-Entity & Consolidation (Enterprise tier)**
- **FR-057**: System MUST support inter-entity transactions via linked journal entries with intercompany receivable/payable accounts across workspaces
- **FR-058**: System MUST auto-post mirror entries in both workspaces when an inter-entity transaction is created
- **FR-059**: System MUST generate consolidated P&L and Balance Sheet across all org workspaces with automatic elimination of inter-entity items
- **FR-060**: Inter-entity and consolidated reporting features MUST be gated to Enterprise tier ($99/mo)

**Credit Notes**
- **FR-061**: System MUST support credit notes against invoices with automatic reversal journal entries
- **FR-062**: Credit notes MUST be applicable to future invoices or refundable directly

**Bank Feeds — Account Types**
- **FR-063**: System MUST support bank feed connections for transaction accounts, savings, credit cards, loans, and merchant facilities

**Pricing Tiers**
- **FR-064**: Starter tier ($29/mo) MUST include 1 workspace, 1 user, core accounting, chart of accounts, bank feed, and reconciliation
- **FR-065**: Professional tier ($59/mo) MUST include up to 3 workspaces, 5 users, invoicing, AP, BAS reporting, recurring transactions, and customer portal
- **FR-066**: Enterprise tier ($99/mo) MUST include unlimited workspaces and users, inter-entity transactions, consolidated reporting, and priority support
- **FR-067**: Additional workspaces MUST be available at $15/mo each beyond tier inclusion
- **FR-068**: Additional users MUST be available at $5/mo each beyond tier inclusion

**Notifications**
- **FR-069**: System MUST provide an in-app notification centre (bell icon with dropdown) for workspace events
- **FR-070**: System MUST send email notifications for important events (approval requests, payment received, overdue invoices, sync failures)
- **FR-071**: Users MUST be able to configure notification preferences per event type (in-app, email, both, none)

**Public API**
- **FR-073**: System MUST expose a documented, versioned REST API for third-party integrations
- **FR-074**: API MUST support API key authentication with per-key rate limiting
- **FR-075**: API MUST cover: chart of accounts, journal entries, contacts, invoices, bills, bank transactions, and reports

**Search**
- **FR-076**: System MUST provide a unified global search across contacts, invoices, bills, journal entries, bank transactions, and accounts
- **FR-077**: Search MUST support queries by name, number, amount, reference, and description

**Bank Statement Import**
- **FR-080**: System MUST support manual bank statement upload in CSV and OFX formats
- **FR-081**: CSV import MUST provide a column mapping wizard for flexible file formats
- **FR-082**: Imported transactions MUST be deduplicated against existing bank feed transactions via amount + date + description matching

**Concurrency**
- **FR-083**: System MUST implement optimistic locking on editable records (invoices, bills, contacts, journal entry drafts)
- **FR-084**: When a conflict is detected, system MUST warn the user, show the diff, and let them overwrite or discard

**Trial**
- **FR-085**: New customers MUST receive a 14-day free trial with full Professional tier access, no credit card required
- **FR-086**: System MUST prompt for payment method before trial expiry and restrict access to read-only if trial lapses without conversion

**Job Costing**
- **FR-091**: System MUST support hierarchical job/project structures (Client → Project → Phase → Task, up to 4 levels)
- **FR-092**: Every journal entry line, invoice line, and bill line MUST optionally accept a job tag
- **FR-093**: System MUST generate Job Profitability Reports showing revenue, direct costs, gross margin, and margin % per job with drill-down across hierarchy levels
- **FR-094**: Jobs MUST support budget tracking with budget vs. actual comparison and remaining balance

**Hierarchical Clients**
- **FR-095**: Contacts (clients/suppliers) MUST support parent-child hierarchy with unlimited depth
- **FR-096**: Financial data (revenue, costs, budgets) MUST roll up from child contacts to parent contacts

**Tracking Categories (Dimensions)**
- **FR-100**: System MUST support unlimited user-defined tracking categories (e.g., Department, Location, Region, Cost Centre) per workspace
- **FR-101**: Tracking categories MUST be taggable on any journal entry line, invoice line, and bill line
- **FR-102**: Reports MUST support filtering and grouping by tracking category

**Reconciliation UX**
- **FR-105**: Reconciliation engine MUST group similar unmatched transactions with the same suggested match for batch confirmation
- **FR-106**: System MUST always require human confirmation — no fully automated creation from rules
- **FR-107**: System MUST support batch reconciliation — confirm multiple grouped suggestions with one action

**Batch Operations**
- **FR-108**: System MUST support bulk approve of pending journal entries
- **FR-109**: System MUST support bulk reconcile of suggested bank transaction matches
- **FR-110**: System MUST support bulk delete of draft journal entries, invoices, and bills
- **FR-111**: System MUST support bulk send of approved invoices

**AI Features (Post-MVP Phase 2)**
- **FR-117**: System MUST detect anomalous transactions: amount outliers, duplicate payments, unexpected vendors — and flag for review
- **FR-118**: System MUST provide basic cash flow forecasting based on recurring transaction patterns and outstanding invoices/bills

**Outbound Webhooks**
- **FR-119**: System MUST support configurable outbound webhook URLs per workspace for key events (invoice.paid, payment.received, reconciliation.completed, etc.)
- **FR-120**: Webhooks MUST include retry logic (3 attempts with exponential backoff) and a delivery log

**Budget Tracker Module**
- **FR-121**: Budget Tracker MUST be available as a paid add-on ($20/mo) on any pricing tier
- **FR-122**: Budget Tracker activation/deactivation MUST be managed via Stripe subscription items

**Time to Value**
- **FR-123**: Onboarding flow (signup → wizard → bank connection → first transactions) MUST be completable in under 10 minutes

**Onboarding**
- **FR-114**: System MUST provide a guided setup wizard for new workspaces: Org name → Industry → Fiscal year → CoA template → Connect bank → Invite team
- **FR-115**: System MUST persist an onboarding checklist until all setup steps are completed
- **FR-116**: System MUST offer industry-specific chart of accounts templates: Australian Standard, Aged Care, Construction, Professional Services, Hospitality, Retail

**Keyboard Shortcuts**
- **FR-112**: Reconciliation view MUST support full keyboard navigation: arrow keys (navigate), Enter (confirm match), C (create new), E (exclude), S (split)
- **FR-113**: System MUST provide a keyboard shortcut reference accessible via ? key

**Data Migration**
- **FR-103**: System MUST support CSV import of chart of accounts, contacts, opening balances, and historical invoices
- **FR-104**: CSV import MUST include a column mapping wizard with preview and validation before commit

**Invoice Management**
- **FR-097**: Draft/unsent invoices MUST support voiding (deletes invoice and reversal entry)
- **FR-098**: Sent/paid invoices MUST only be corrected via credit notes (no voiding)
- **FR-099**: Invoices MUST support tenant branding: logo upload, brand colour, custom footer text, payment instructions, and ABN display

**Per-Client Funding**
- **FR-087**: System MUST support per-client funding allocations from configurable funding sources (program-agnostic)
- **FR-088**: System MUST track drawdowns, commitments, and remaining balance per client per funding source
- **FR-089**: System MUST support co-payment calculations with configurable client contribution percentages
- **FR-090**: System MUST support multiple funding sources per client with priority-based allocation

**Workspace Settings**
- **FR-078**: Fiscal year start and base currency MUST be locked after the first journal entry is posted in a workspace
- **FR-079**: Display preferences (date format, number format) MUST be changeable at any time

**Split Transactions**
- **FR-072**: System MUST support splitting a single bank transaction across multiple account lines with different tax codes and amounts

**Dashboard**
- **FR-056**: System MUST display a financial summary dashboard showing cash position, P&L snapshot, outstanding invoices/bills, bank balances, reconciliation queue count, and recent activity

**Recurring Transactions**
- **FR-048**: System MUST support recurring templates for journal entries, invoices, and bills
- **FR-049**: System MUST support configurable frequency (weekly, fortnightly, monthly, quarterly, yearly) with start/end dates

**Infrastructure**
- **FR-039**: System MUST host all data in AWS ap-southeast-2 (Sydney) for ATO DSP compliance
- **FR-040**: System MUST encrypt all data at rest with AES-256 via AWS KMS
- **FR-041**: System MUST use TLS 1.2+ for all data in transit
- **FR-042**: System MUST use exactly 1 process for the event-projector queue to guarantee event ordering

### Key Entities

- **Organisation**: The paying customer entity. Owns billing subscription, SSO config, and user roster. Has many Tenants.
- **Tenant/Workspace**: A set of books with its own database, chart of accounts, fiscal year, and currency. Belongs to an Organisation.
- **User**: A person who can belong to multiple Organisations and Tenants with different roles at each level.
- **Journal Entry**: The core financial primitive. Contains balanced debit/credit lines, enforces double-entry invariant. Immutable once posted.
- **Journal Entry Line**: A single debit or credit within a journal entry. References a chart account and optionally a tax code.
- **Chart Account**: An account in the chart of accounts with code, name, type (Asset/Liability/Equity/Revenue/Expense), parent, and default tax code.
- **Raw Bank Transaction**: Immutable record from bank feed provider. Stores amount, direction, descriptions (raw + clean), merchant data, ANZSIC category, and full provider response.
- **Bank Account**: A connected bank account mapped to a chart account. Stores masked number, BSB, and balance snapshots.
- **Bank Feed Rule**: Per-tenant auto-matching rule with match criteria, target account, GST code, and priority.
- **Invoice**: A receivable document with line items, tax calculations, customer reference, and payment tracking.
- **Bill**: A payable document (mirror of Invoice) from a supplier.
- **Accounting Period**: A fiscal period (month/quarter/year) with open/closed/locked status.
- **Tax Code**: GST classification (GST, GST-Free, Input-Taxed, Export, BAS Excluded) with rate and BAS field mapping.
- **Contact**: A customer or supplier with ABN, address, email, phone, payment terms, credit limit, and default accounts. Supports parent-child hierarchy for organisational structures. Used on invoices and bills.
- **Job/Project**: A trackable cost centre with hierarchical structure (Client → Project → Phase → Task, up to 4 levels). Carries budget, revenue, and cost allocations. Every transaction line can be tagged to a job.
- **Recurring Transaction**: A template for auto-generating journal entries, invoices, or bills on a configurable schedule (daily/weekly/monthly/quarterly/yearly) with start/end dates.
- **Tracking Category**: A user-defined dimension (Department, Location, Region, Cost Centre) with a list of values. Taggable on any transaction line for dimensional reporting.
- **Stored Event**: Spatie event sourcing record — the immutable append-only log of all financial mutations.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can complete bank account connection and first sync in under 3 minutes
- **SC-002**: 4-pass reconciliation engine auto-matches ≥60% of transactions without human intervention within 90 days of use
- **SC-003**: Journal entry creation enforces double-entry balance with zero tolerance — 0% unbalanced entries can be posted
- **SC-004**: Financial reports (P&L, Balance Sheet) generate in under 5 seconds for tenants with up to 100,000 events
- **SC-005**: BAS preparation time reduced from manual calculation (2-4 hours) to review-and-lodge (15 minutes)
- **SC-006**: System handles 1,000 concurrent tenants with database-per-tenant isolation without cross-tenant data leakage
- **SC-007**: All data remains in AWS ap-southeast-2, verifiable via infrastructure audit — 100% ATO DSP compliance
- **SC-008**: Event sourcing replay can rebuild all projections for a tenant with 500K events in under 10 minutes
- **SC-009**: 99.9% uptime SLA with <1 minute RTO via Aurora Global Database failover
- **SC-010**: Platform achieves first 10 paying tenants within 6 months of launch

---

## Clarifications

### Session 2026-03-01

- Q: Is Money Quest (B2C) in scope? → A: **Separate product.** Financial Ledger is B2B accounting SaaS only. Money Quest is a future standalone project.
- Q: Should MVP start with DB-per-tenant or shared DB? → A: **DB-per-tenant from day 1.** Avoids painful migration later, meets ATO DSP isolation requirements immediately.
- Q: Frontend architecture — Next.js or Inertia? → A: **Decoupled Next.js 16.** Independent frontend deployment, API reusability for future mobile apps.
- Q: Canonical term for a 'set of books'? → A: **Workspace.** Modern SaaS convention. "Tenant" used internally only.

- Q: Journal entry approval flow? → A: **Yes — Draft → Pending Approval → Posted.** Enforces separation of duties. Bookkeeper creates, Approver reviews.
- Q: Contact/Customer/Supplier entity? → A: **Full contact management.** Dedicated Contact entity with ABN, address, payment terms, credit limits.
- Q: Recurring transactions in MVP? → A: **Yes — MVP feature.** Recurring journal entries, invoices, and bills with configurable frequency.
- Q: Target launch market? → A: **Both — generic core + aged care module.** Generic accounting core with optional aged care funding module.
- Q: Invoice delivery method? → A: **Both — email with PDF + customer portal.** Branded PDF via email plus a customer portal for self-service invoice viewing and payment history.
- Q: Accounting method? → A: **Accrual only.** Revenue/expenses recognized when earned/incurred. Standard for GST-registered businesses.
- Q: ML reconciliation (Pass 4) in MVP? → A: **Defer to post-MVP.** Passes 1-3 (exact, fuzzy, rule-based) cover 70-80%. ML needs real usage training data.
- Q: File attachments? → A: **S3 storage with entity linking.** Upload to S3 (per-tenant prefix), link to journal entries, invoices, bills, bank transactions.
- Q: Expected scale? → A: **2-10 tenants at launch, 50-100 at 12 months.** Trilogy Care + CareVicinity as design partners, controlled growth.
- Q: SSO at launch? → A: **No.** Email + password + MFA only for MVP. Add SAML/OIDC when enterprise clients request it.
- Q: Email service? → A: **AWS SES.** Already in AWS ecosystem, cheap, good deliverability.
- Q: Dashboard? → A: **Financial summary dashboard.** Cash position, P&L snapshot, outstanding invoices/bills, bank balances, reconciliation queue count, recent activity.
- Q: Year-end close approach? → A: **Virtual close.** P&L rollup to Retained Earnings calculated by projectors on-the-fly. No manual closing entries. Used by Xero/QuickBooks.
- Q: Bank feed rules scope? → A: **Workspace-scoped.** Each workspace has its own matching rules. Simpler isolation.
- Q: Payment terms? → A: **Net 7/14/30/60/90 + custom.** Standard AU payment terms with custom terms per contact.
- Q: Inventory/COGS tracking? → A: **No inventory.** Focus on service-based businesses. COGS via manual journal entries only.
- Q: Data export for leaving tenants? → A: **Full export to CSV/JSON.** Chart of accounts, journal entries, contacts, invoices, bills, bank transactions.
- Q: Customer portal authentication? → A: **Magic link / token-based.** Unique secure link in invoice email, no password. Expires after payment or 30 days.
- Q: Data retention on cancellation? → A: **Soft delete + 90-day grace.** Data retained 90 days for reactivation. Archived to cold storage after. 7-year ATO archive maintained.
- Q: Tax code rate changes? → A: **Effective-dated tax codes.** Tax codes have start/end dates. New rate applies from effective date. Historical transactions retain original rate.
- Q: Credit notes & refunds? → A: **Full credit note workflow.** Create against invoices, apply to future invoices or refund. Reversal journal entries auto-posted.
- Q: Bank accounts per workspace? → A: **Unlimited.** No hard limit. Most SMBs have 2-5 (operating, savings, credit card, loan). Aged care may have more for funding streams.
- Q: Inter-account transfers? → A: **Dedicated transfer type + inter-entity transactions.** Key differentiator — support transfers between workspaces/entities within an organisation, not just between accounts within a workspace.
- Q: Audit trail visibility? → A: **Tiered.** Users see activity log (who/what/when). Admins see full detail (IP, user agent, payloads). Auditor role sees everything read-only.
- Q: Inter-entity transactions? → A: **Linked journal entries.** Transaction in Workspace A creates mirror entry in Workspace B via intercompany receivable/payable accounts. Both sides balanced independently.
- Q: Consolidated reporting? → A: **Yes — with elimination.** Consolidated P&L and Balance Sheet across all org workspaces. Auto-eliminate inter-entity transactions.
- Q: Inter-entity/consolidation pricing tier? → A: **Enterprise tier ($99/mo) only.** Reserve as enterprise differentiator. Starter/Professional get single-workspace reporting.
- Q: Bank feed account types? → A: **All account types.** Transaction accounts, savings, credit cards, loans, merchant facilities. Basiq supports all via CDR.
- Q: Pricing tiers? → A: **3 tiers.** Starter ($29/mo): 1 workspace, 1 user, basic accounting + bank feed. Professional ($59/mo): 3 workspaces, 5 users, invoicing, BAS. Enterprise ($99/mo): unlimited, inter-entity, consolidation, priority support.
- Q: Notification system? → A: **In-app + email.** Bell icon with dropdown + email for important events. User-configurable preferences per notification type.
- Q: Mixed-use GST expenses? → A: **Split transaction support.** User splits a transaction into multiple lines with different tax codes. Business portion claims GST, personal doesn't.
- Q: Payroll (PAYG/super)? → A: **Out of scope.** No payroll in MVP. Users use dedicated payroll systems. Import payroll journals via API or manual entry.
- Q: Public API? → A: **Yes — REST API from day 1.** API already exists for Next.js. Document and version for third-party use. Enables payroll import, CRM sync, custom integrations.
- Q: Global search? → A: **Yes — unified search.** Search bar finds contacts, invoices, bills, journal entries, bank transactions, and accounts by number/name/amount/reference.
- Q: Mobile experience? → A: **Responsive web for MVP, native mobile app later.** React Native or Flutter app post-MVP using the same API.
- Q: Workspace settings mutability? → A: **Set at creation, changeable before first transaction.** Fiscal year and base currency locked after first journal entry posted. Display preferences changeable anytime.
- Q: Manual bank statement import? → A: **Yes — CSV + OFX import.** Upload statements as fallback when Basiq lacks coverage. Column mapping, deduplication against existing transactions.
- Q: Multi-user editing conflicts? → A: **Optimistic locking with warning.** Warn second user that record was modified. Show diff. User decides to overwrite or discard.
- Q: Aged care funding scope? → A: **Generic funding tracking.** Flexible per-client budget tracking not tied to any specific government program. More versatile than Support at Home-specific.
- Q: Trial period? → A: **14-day free trial, no card required.** Full Professional tier access. Credit card collected at conversion.
- Q: Custom reports? → A: **Standard reports only for MVP.** P&L, BS, TB, CF, GL, Aging, BAS. Custom builder deferred.
- Q: Void vs credit note? → A: **Both.** Void for draft/unsent invoices (deletes). Credit note for sent/paid invoices (offsetting document).
- Q: Invoice branding? → A: **Logo + colours + custom fields.** Upload logo, brand colour, custom footer, payment instructions, ABN.
- Q: Scheduled report delivery? → A: **Defer to post-MVP.** On-demand generation and export only for MVP.
- Q: Job costing & hierarchical budgets? → A: **Yes — advanced job costing with hierarchical client/budget structure.** Clients can have sub-clients/projects. Budgets are hierarchical with roll-up reporting.
- Q: Time tracking in job costing? → A: **Financial allocations only.** No built-in timesheets. Integrate with external time tracking (Harvest, Toggl) via API.
- Q: Data migration from Xero/MYOB? → A: **CSV import of key data.** Import chart of accounts, contacts, opening balances, historical invoices. Manual mapping wizard.
- Q: Tracking dimensions beyond jobs? → A: **Yes — configurable tracking categories.** User-defined dimensions (Department, Location, Region, Cost Centre) taggable on any transaction line.
- Q: Product name? → A: **MoneyQuest Ledger.**
- Q: Tracking categories limit? → A: **Unlimited categories.** User creates as many dimensions as needed. Each with unlimited values.
- Q: Auto-create from bank rules? → A: **No auto-create. Human in the loop always, but grouped recommendations for speed.** System groups similar transactions with the same suggested match, user bulk-confirms groups with one action. Fast but controlled.
- Q: Batch operations? → A: **Yes — key batch ops.** Bulk approve journal entries, bulk reconcile suggested matches, bulk delete drafts, bulk send invoices.
- Q: Keyboard shortcuts? → A: **Full keyboard navigation.** Arrow keys to navigate, Enter to confirm, C to create, E to exclude, S to split. Xero-inspired reconciliation shortcuts.
- Q: Onboarding flow? → A: **Guided wizard.** Step-by-step: Org name → Industry → Fiscal year → CoA template → Connect bank → Invite team. Checklist persists until completed.
- Q: Chart of accounts templates? → A: **Multiple industry templates.** Australian Standard, Aged Care, Construction, Professional Services, Hospitality, Retail. Pre-configured accounts and tax codes.
- Q: Aged care module name? → A: **Budget Tracker.** Generic name covering client budgets, job budgets, and funding allocations.
- Q: Receipt scanning? → A: **Defer to mobile app.** Web app supports file upload only. Camera capture is a native mobile app feature.
- Q: AI features? → A: **Anomaly detection + cash flow forecast.** Flag unusual transactions (outliers, duplicates, unexpected vendors). Basic cash flow projection from recurring patterns.
- Q: Outbound webhooks? → A: **Yes — configurable webhooks.** Tenants configure URLs for events: invoice.paid, payment.received, reconciliation.completed.
- Q: Time-to-first-value? → A: **Under 10 minutes.** Signup → wizard → connect bank → first transactions visible in under 10 minutes.
- Q: Budget Tracker pricing? → A: **Separate add-on ($20/mo).** Available on any tier as a paid module. Maximises revenue and flexibility.

### Out of Scope (Confirmed)

- Money Quest B2C gamified personal finance app
- Micro-investing features (ASX integration)
- Gamification engine (levels, quests, leaderboards)
- Financial coaching / expert consultations
- Flutter mobile app
- Inventory / stock tracking / COGS automation
- ML reconciliation engine (Pass 4) — deferred to post-MVP
- SSO (SAML/OIDC) — deferred until enterprise demand
- Cash-basis accounting method
- Payroll (PAYG withholding, superannuation, STP, payslips)
- Full inventory / stock management
