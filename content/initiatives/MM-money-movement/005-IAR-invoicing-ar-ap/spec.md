---
title: "Feature Specification: Invoicing & AR/AP"
---

# Feature Specification: Invoicing & AR/AP

**Epic**: 005-IAR
**Created**: 2026-03-11
**Status**: Draft
**Initiative**: FL — MoneyQuest Ledger
**Phase**: 3 (Sprints 9–12)
**Design Direction**: Super Modern

---

## Context

Invoicing & AR/AP is the commercial engine of MoneyQuest Ledger. While the Core Ledger Engine (002-CLE) provides the immutable double-entry journal and Bank Feeds (004-BFR) brings in external truth from bank statements, this epic generates the internal truth — the invoices sent to customers, the bills received from suppliers, and the payments that flow between them. Every invoice posted, every payment allocated, every credit note applied creates journal entries in the traditional special journals (Sales Journal, Purchases Journal, Cash Receipts Journal, Cash Payments Journal, General Journal) that flow through to the Core Ledger Engine.

The module is built on the same event-sourcing foundation as the rest of the platform — every invoice mutation flows through an `InvoiceAggregate` (AR) or `BillAggregate` (AP), ensuring a tamper-proof audit trail and full state rebuild capability. Payment allocation follows FIFO by default with manual override, and batch payments (RECBATCH for AR, PAYBATCH for AP) bundle multiple documents into a single bank-reconcilable entry.

### Architectural Context

- **Event-sourced documents** — all invoice and bill state transitions (create, approve, send, payment, void, credit note) are recorded as immutable events via `InvoiceAggregate` and `BillAggregate`. Projectors maintain read models.
- **Traditional special journals** — Invoice Posted creates SJ entries (debit AR, credit Revenue). Bill Posted creates PJ entries (debit Expense, credit AP). Payment received creates CRJ entries (debit Bank, credit AR). Payment made creates CPJ entries (debit AP, credit Bank). Adjustments create GJ entries.
- **Single-database multi-tenancy** — all tenants share one Aurora PostgreSQL database, scoped by `tenant_id` via Stancl/Tenancy v3.9.
- **Amounts as integers (cents)** — all monetary values (subtotal, tax, total, payments, line amounts) stored as `bigInteger` cents, consistent with 002-CLE.
- **Line-level detail** — each invoice/bill line carries quantity (x100 for 2-decimal precision), unit price, tax, chart account, and optional job tag.
- **Optimistic locking** — `version` column on invoices and bills prevents concurrent edit conflicts.
- **Batch payments** — RECBATCH (CRJ) bundles multiple AR invoices into one receipt; PAYBATCH (CPJ) bundles multiple AP bills into one payment. Each batch produces a single TotalAmount matching one bank statement line for clean reconciliation with 004-BFR.
- **Contacts pre-exist** — contacts (customers, suppliers, or both) with name, type, ABN, and payment terms are managed by 006-CCM and are a prerequisite for creating invoices and bills.

### Dependencies

| Direction | Epic | Relationship |
|-----------|------|-------------|
| **Depends on** | 002-CLE Core Ledger Engine | Journal entries, chart of accounts, tax codes, accounting periods |
| **Depends on** | 003-AUT Auth & Multi-tenancy | Tenant scoping, user roles, permissions |
| **Related** | 004-BFR Bank Feeds & Reconciliation | Payment reconciliation via CPJ/CRJ; batch payments (PAYBATCH/RECBATCH) match to single bank statement lines |
| **Related** | 006-CCM Contacts & Client Management | Invoices/bills belong to contacts; contacts carry payment terms and ABN |
| **Blocks** | 007-FRC Financial Reporting | AR/AP aging, revenue/expense data feeds into financial reports |
| **Integrates with** | 008-JCT Job Costing | Invoice/bill lines can tag a job for project profitability tracking |
| **Integrates with** | 011-MCY Multi-Currency | Currency field stored per document (default AUD), ready for FX |
| **Integrates with** | 012-ATT Attachments | File attachments on invoices and bills via S3 |

---

## User Scenarios & Testing

### User Story 1 — Sales Invoice Creation & Lifecycle (Priority: P1)

A bookkeeper creates invoices for customers, adding line items with descriptions, quantities, unit prices, account codes, and tax codes. The system calculates line totals, subtotals, tax, and grand total automatically. Invoices follow a strict lifecycle: Draft -> Approved -> Sent -> Partially Paid -> Paid, with Voided reachable from non-terminal states. Each state transition is event-sourced. Invoice Posted (approval) creates a Sales Journal entry debiting Accounts Receivable and crediting Revenue per line. Optimistic locking prevents concurrent edit conflicts.

**Why this priority**: Invoice creation is the entry point for all accounts receivable. Without it, businesses cannot bill customers or track revenue. The SJ entry is the foundational accounting event.

**Independent Test**: A bookkeeper can create an invoice with multiple line items, approve it (triggering an SJ entry that debits AR and credits Revenue), send it, record partial and full payments, and see the invoice transition through all lifecycle states — delivering a complete AR workflow with double-entry integrity.

**Acceptance Scenarios**:

1. **Given** a bookkeeper is creating an invoice, **When** they select a customer contact, set issue date 2026-03-01 and due date 2026-03-15, add a line item "Consulting Services" with quantity 200 (2.00 units), unit price 15000 ($150.00), account "41000 Sales Revenue", and tax code "GST", **Then** the system calculates line amount as 30000 ($300.00), tax as 3000 ($30.00), saves the invoice with status "Draft", and assigns auto-generated invoice number INV-000001
2. **Given** a bookkeeper adds 3 line items with amounts $300.00, $150.00, and $50.00, each with 10% GST, **When** they save the invoice, **Then** subtotal = 50000 ($500.00), tax_total = 5000 ($50.00), total = 55000 ($550.00), amount_due = 55000, all stored as integer cents
3. **Given** the invoice number prefix is configured as "INV-" with 6-digit padding, **When** a bookkeeper creates the 42nd invoice in this workspace, **Then** the system assigns INV-000042 — numbering is sequential per workspace and per type (invoice vs credit_note)
4. **Given** a draft invoice exists, **When** an approver approves it, **Then** status transitions to "Approved", an `InvoiceApproved` event is stored, and a Sales Journal (SJ) entry is created in the Core Ledger Engine: debit Accounts Receivable (11200) for $550.00, credit Sales Revenue (41000) for $500.00, credit GST Collected (21300) for $50.00 — one credit line per invoice line account
5. **Given** an approved invoice, **When** the user marks it as sent, **Then** status transitions to "Sent", `sent_at` timestamp is recorded, and an `InvoiceSent` event is stored — the invoice is now eligible to receive payments
6. **Given** a user attempts to save an invoice with no line items, **When** validation runs, **Then** the system rejects with "At least 1 line item is required"
7. **Given** a user attempts to save an invoice with total <= 0 (e.g., all lines are zero or negative), **When** validation runs, **Then** the system rejects with "Invoice total must be greater than zero"
8. **Given** a user attempts to create an invoice for a supplier-only contact, **When** validation runs, **Then** the system rejects with "Invoices can only be created for customer or both-type contacts"
9. **Given** two users have the same invoice open for editing (version 3), **When** User A saves changes (version becomes 4), and User B then saves their changes referencing version 3, **Then** User B receives a 409 Conflict error: "This invoice has been modified by another user — please refresh and try again"
10. **Given** a draft invoice with no payments, **When** an authorised user voids it with reason "Created in error", **Then** status transitions to "Voided", `voided_at` is set, an `InvoiceVoided` event is stored with the reason, and the SJ entry (if already posted via approval) is reversed via a contra SJ entry
11. **Given** payment terms of Net 30 are set on the contact, **When** a bookkeeper creates an invoice with issue date 2026-03-01 and leaves due date blank, **Then** the system auto-calculates due date as 2026-03-31 based on the contact's default payment terms
12. **Given** a sent invoice with due date 2026-03-15 and today is 2026-03-20, **When** the system evaluates the invoice, **Then** it is flagged as "Overdue" — a computed state (not a stored transition) based on payable status + past due_date + amount_due > 0

---

### User Story 2 — Purchase Bill Creation & Lifecycle (Priority: P1)

A bookkeeper enters bills received from suppliers, adding line items with descriptions, quantities, unit prices, expense accounts, and tax codes. Bills mirror the invoice lifecycle but for payables: Draft -> Approved -> Partially Paid -> Paid, with Voided reachable from non-terminal states. Bill Posted (approval) creates a Purchases Journal entry debiting Expense per line and crediting Accounts Payable. Each bill carries the supplier's reference number for matching against supplier statements.

**Why this priority**: Bills are the mirror image of invoices for the payables side. Without bill tracking, businesses cannot manage their obligations, schedule payments, or produce accurate AP aging reports.

**Independent Test**: A bookkeeper can enter a supplier bill with multiple line items and a supplier reference number, approve it (triggering a PJ entry that debits Expense and credits AP), record partial and full payments, and see the bill transition through all lifecycle states — delivering a complete AP workflow.

**Acceptance Scenarios**:

1. **Given** a bookkeeper is entering a bill, **When** they select a supplier contact, set issue date 2026-03-05, due date 2026-04-04, supplier reference "SUP-REF-8842", and add a line item "Office Supplies" with quantity 100 (1.00 unit), unit price 45000 ($450.00), account "51000 Office Expenses", tax code "GST", **Then** the system calculates line amount as 45000 ($450.00), tax as 4500 ($45.00), saves the bill with status "Draft", and assigns auto-generated bill number BILL-000001
2. **Given** a draft bill exists, **When** an approver approves it, **Then** status transitions to "Approved", a `BillApproved` event is stored, and a Purchases Journal (PJ) entry is created: debit Office Expenses (51000) for $450.00, debit GST Paid (11400) for $45.00, credit Accounts Payable (21000) for $495.00
3. **Given** a user creates a bill for a customer-only contact (not a supplier), **When** validation runs, **Then** the system rejects with "Bills can only be created for supplier or both-type contacts"
4. **Given** a bill with supplier_reference "SUP-REF-8842", **When** another bill is created for the same supplier with the same supplier_reference, **Then** the system warns "Duplicate supplier reference detected for this contact" but allows save (soft warning, not hard block)
5. **Given** an approved bill, **When** a user records a payment of $200.00 against the $495.00 total, **Then** amount_paid = 20000, amount_due = 29500, status = "Partially Paid", and a `BillPaymentMade` event is stored
6. **Given** a partially-paid bill with $295.00 remaining, **When** a user records a payment of $295.00, **Then** amount_paid = 49500, amount_due = 0, status = "Paid", and `paid_at` timestamp is set
7. **Given** an approved bill with no payments, **When** a user voids it with reason "Supplier cancelled order", **Then** status = "Voided", the PJ entry is reversed via a contra PJ entry, and a `BillVoided` event is stored
8. **Given** a bill with recorded payments, **When** a user attempts to void it, **Then** the system rejects with "Cannot void a bill with payments — issue a credit note instead"

---

### User Story 3 — Payment Allocation — Accounts Receivable (Priority: P1)

An accountant records payments received from customers and allocates them against one or more outstanding invoices. The system supports FIFO auto-allocation (oldest invoice first by due date) and manual allocation override. Partial payments are tracked at the invoice level. Overpayments are held as a credit balance on the contact's account. Batch receipts (RECBATCH) bundle multiple invoice payments into a single CRJ entry that matches one bank statement line for clean reconciliation.

**Why this priority**: Payment allocation closes the AR loop. Businesses need to know which invoices are paid, which are partially paid, and which customers have outstanding balances. The CRJ entry is essential for bank reconciliation via 004-BFR.

**Independent Test**: An accountant can record a $5,000 payment, auto-allocate it across 3 invoices via FIFO (paying the oldest first), see each invoice's amount_due update, and find a single CRJ entry (debit Bank, credit AR for $5,000) that will reconcile against a single bank deposit line — delivering efficient multi-invoice payment processing.

**Acceptance Scenarios**:

1. **Given** a customer has 3 outstanding invoices: INV-001 ($1,000, due 2026-02-15), INV-002 ($2,500, due 2026-03-01), INV-003 ($3,000, due 2026-03-15), **When** the accountant records a payment of $4,000 and selects FIFO auto-allocation, **Then** the system allocates: INV-001 = $1,000 (fully paid, status -> Paid), INV-002 = $2,500 (fully paid, status -> Paid), INV-003 = $500 (partially paid, amount_due = $2,500, status -> Partially Paid)
2. **Given** the same scenario, **When** the accountant selects manual allocation and assigns $2,000 to INV-002 and $2,000 to INV-003, **Then** INV-001 remains Sent ($1,000 due), INV-002 -> Partially Paid ($500 due), INV-003 -> Partially Paid ($1,000 due) — manual allocation overrides FIFO
3. **Given** a payment of $4,000 is allocated across invoices, **When** the payment is confirmed, **Then** a single Cash Receipts Journal (CRJ) entry is created: debit Bank (11000) for $4,000, credit Accounts Receivable (11200) for $4,000 — with a reference linking to each allocated invoice
4. **Given** a customer pays $6,500 against $6,500 total outstanding (all 3 invoices), **When** the payment is recorded as a batch receipt (RECBATCH), **Then** a single CRJ entry for $6,500 is created with individual allocation lines for each invoice, and all 3 invoices transition to Paid
5. **Given** a customer pays $7,000 against $6,500 total outstanding, **When** the accountant records the payment, **Then** $6,500 is allocated to invoices and the remaining $500 is recorded as an overpayment credit balance on the contact's account — available for future invoice allocation
6. **Given** a payment has been recorded against an invoice in error, **When** the accountant reverses the payment allocation, **Then** the CRJ entry is reversed (debit AR, credit Bank), the invoice's amount_paid decreases, the status reverts appropriately (e.g., Paid -> Partially Paid or Sent), and a `PaymentAllocationReversed` event is stored
7. **Given** a batch receipt (RECBATCH) bundles 5 invoices, **When** the system creates the CRJ entry, **Then** the TotalAmount equals the sum of all 5 allocations, each allocation references its specific invoice, and the single CRJ total matches what will appear as one line on the bank statement
8. **Given** a user attempts to create a batch receipt mixing sales invoices and purchase bills, **When** validation runs, **Then** the system rejects with "Cannot mix invoices and bills in a single batch payment"

---

### User Story 4 — Payment Allocation — Accounts Payable (Priority: P1)

An accountant records payments made to suppliers and allocates them against one or more outstanding bills. The AP payment workflow mirrors AR but creates CPJ entries (debit AP, credit Bank). FIFO auto-allocation applies oldest bill first. Batch payments (PAYBATCH) bundle multiple bill payments into a single CPJ entry for bank reconciliation.

**Why this priority**: AP payment allocation is the mirror of AR — essential for managing supplier obligations and producing accurate AP aging. The CPJ entry integrates directly with bank reconciliation via 004-BFR.

**Independent Test**: An accountant can record a $3,000 payment to a supplier, auto-allocate it across 2 bills via FIFO, see each bill's amount_due update, and find a single CPJ entry (debit AP, credit Bank for $3,000) that reconciles against a single bank withdrawal — delivering efficient multi-bill payment processing.

**Acceptance Scenarios**:

1. **Given** a supplier has 2 outstanding bills: BILL-001 ($1,200, due 2026-02-20), BILL-002 ($2,800, due 2026-03-10), **When** the accountant records a payment of $3,000 and selects FIFO auto-allocation, **Then** BILL-001 = $1,200 (fully paid, status -> Paid), BILL-002 = $1,800 (partially paid, amount_due = $1,000, status -> Partially Paid)
2. **Given** the accountant selects manual allocation, **When** they assign the full $3,000 to BILL-002, **Then** BILL-001 remains Approved ($1,200 due), BILL-002 -> Paid ($0 due)
3. **Given** a payment of $3,000 is allocated across bills, **When** the payment is confirmed, **Then** a single Cash Payments Journal (CPJ) entry is created: debit Accounts Payable (21000) for $3,000, credit Bank (11000) for $3,000
4. **Given** a supplier payment of $4,000 is recorded as a batch payment (PAYBATCH) covering both bills ($1,200 + $2,800), **When** the system creates the CPJ entry, **Then** a single CPJ entry for $4,000 is created, both bills transition to Paid, and the single CPJ total matches what will appear as one line on the bank statement
5. **Given** a supplier pays $5,000 against $4,000 total outstanding, **When** the accountant records the payment, **Then** $4,000 is allocated to bills and the remaining $1,000 is recorded as a prepayment/overpayment credit on the contact's account
6. **Given** a batch payment (PAYBATCH) bundles 8 bills to the same supplier, **When** the system processes it, **Then** each bill is individually updated, a single CPJ entry is created with TotalAmount matching the sum, and a `BatchPaymentProcessed` event is stored with the full allocation breakdown
7. **Given** a payment allocation to a bill was made in error, **When** the accountant reverses it, **Then** the CPJ entry is reversed (debit Bank, credit AP), the bill's amount_paid decreases, the status reverts, and a `PaymentAllocationReversed` event is stored

---

### User Story 5 — Credit Notes (Priority: P1)

A bookkeeper creates credit notes to reduce amounts owed. Sales credit notes reduce AR (customer owes less); purchase credit notes reduce AP (we owe less to supplier). Credit notes follow their own lifecycle: Draft -> Approved -> Applied/Refunded. Once approved, a credit note can be applied against an outstanding invoice/bill (reducing the balance) or refunded to a bank account (cash refund). Credit Note Posted creates reversal journal entries in the appropriate special journal.

**Why this priority**: Credit notes are the standard accounting mechanism for handling returns, discounts, and billing errors without voiding the original document. They maintain the audit trail while correcting balances.

**Independent Test**: A bookkeeper can create a sales credit note for $200 against an original $1,000 invoice, approve it (creating a reversal SJ entry), apply it to the invoice (reducing amount_due to $800), and verify the AR balance reflects the reduction — delivering proper credit note handling.

**Acceptance Scenarios**:

1. **Given** a customer disputes $200 on invoice INV-000010 ($1,000 total), **When** the bookkeeper creates a sales credit note with line "Disputed services - Q1 adjustment", amount $200, linked to INV-000010, **Then** the credit note is saved as type "credit_note" with number CN-000001, status "Draft", and `credit_note_for_uuid` references INV-000010
2. **Given** a draft sales credit note for $200, **When** the approver approves it, **Then** status transitions to "Approved", and a reversal SJ entry is created: debit Sales Revenue (41000) for $200, credit Accounts Receivable (11200) for $200 — reversing the original revenue recognition
3. **Given** an approved sales credit note for $200 linked to INV-000010 (outstanding $1,000), **When** the user applies the credit note to the invoice, **Then** INV-000010's amount_due decreases to $800, the credit note status transitions to "Applied", and a `CreditNoteApplied` event is stored linking the credit note to the invoice
4. **Given** an approved sales credit note for $200 with no outstanding invoice to apply it against, **When** the user issues a refund to the customer's bank account, **Then** a CRJ reversal entry is created: debit Accounts Receivable (11200) for $200, credit Bank (11000) for $200, and the credit note status transitions to "Refunded"
5. **Given** a purchase credit note from a supplier for $150, **When** the approver approves it, **Then** a reversal PJ entry is created: debit Accounts Payable (21000) for $150, credit Office Expenses (51000) for $150 — reducing our liability
6. **Given** an approved purchase credit note for $150 linked to BILL-000005 (outstanding $500), **When** the user applies it, **Then** BILL-000005's amount_due decreases to $350, and the credit note status transitions to "Applied"
7. **Given** a credit note for $300 is applied to an invoice with only $200 outstanding, **When** the user attempts the application, **Then** the system rejects with "Credit note amount ($300.00) exceeds invoice outstanding balance ($200.00)" — partial application is required instead
8. **Given** a credit note for $300 against an invoice with $200 outstanding, **When** the user applies $200 (partial), **Then** $200 is applied to the invoice (now Paid), $100 remains as unapplied credit on the contact's account, and the credit note status remains "Approved" (partially applied)
9. **Given** an already fully-applied credit note, **When** a user attempts to apply it again, **Then** the system rejects with "This credit note has been fully applied — no remaining balance"

---

### User Story 6 — Debit & Credit Adjustments (Priority: P1)

An accountant creates debit adjustments (increase amount owed) and credit adjustments (decrease amount owed) against contacts or specific invoices/bills. These handle edge cases that don't fit standard invoicing: late fees, write-offs, settlement discounts, error corrections, and minor balance reconciliation. Both create General Journal (GJ) entries with a full audit trail.

**Why this priority**: Adjustments are essential for real-world accounting where not everything fits neatly into invoices and credit notes. Late fees, write-offs, and rounding corrections are daily occurrences.

**Independent Test**: An accountant can create a $50 debit adjustment (late fee) against a customer's account, see the customer's AR balance increase, apply it to a specific invoice, and verify a GJ entry was created — delivering flexible balance management.

**Acceptance Scenarios**:

1. **Given** a customer has an overdue invoice INV-000015, **When** the accountant creates a debit adjustment for $50 with reason "Late payment fee" and account "42000 Late Fees Revenue", **Then** the system creates a GJ entry: debit Accounts Receivable (11200) for $50, credit Late Fees Revenue (42000) for $50, and the customer's AR balance increases by $50
2. **Given** a debit adjustment of $50 is created for a specific invoice INV-000015, **When** the adjustment is posted, **Then** INV-000015's amount_due increases by $50 (e.g., from $1,000 to $1,050), and the adjustment is linked to the invoice
3. **Given** a customer has an outstanding balance of $45.20 that the business decides to write off, **When** the accountant creates a credit adjustment with reason "Bad debt write-off" and account "69000 Bad Debts", **Then** a GJ entry is created: debit Bad Debts (69000) for $45.20, credit Accounts Receivable (11200) for $45.20, and the customer's AR balance decreases by $45.20
4. **Given** a settlement discount of 2% is agreed with a customer on a $5,000 invoice, **When** the accountant creates a credit adjustment for $100 with reason "2% early payment discount" and account "43000 Discounts Allowed", **Then** a GJ entry is created: debit Discounts Allowed (43000) for $100, credit Accounts Receivable (11200) for $100, and the invoice's amount_due decreases to $4,900
5. **Given** an AP credit adjustment for a supplier, **When** the accountant creates it with reason "Volume rebate received" and amount $500, **Then** a GJ entry is created: debit Accounts Payable (21000) for $500, credit Rebates Received (42500) for $500 — reducing what we owe the supplier
6. **Given** an AP debit adjustment for a supplier, **When** the accountant creates it with reason "Freight surcharge correction" and amount $75, **Then** a GJ entry is created: debit Freight Expense (52000) for $75, credit Accounts Payable (21000) for $75 — increasing what we owe
7. **Given** an adjustment is posted, **When** the user views the adjustment detail, **Then** it shows: type (debit/credit), amount, reason, date, account, linked invoice/bill (optional), contact, created_by user, and the GJ entry reference
8. **Given** an adjustment was made in error, **When** the accountant reverses it, **Then** a contra GJ entry is created reversing the original, and the contact's balance and any linked invoice/bill amounts are restored

---

### User Story 7 — Invoice Branding & Delivery (Priority: P2)

A business owner customises their invoice appearance with branding (logo, colours, footer text, ABN, payment instructions) and sends invoices to customers via email with PDF attachment. Customers can view and download invoices through a secure customer portal accessed via magic link authentication. The system tracks delivery events (sent, viewed, downloaded).

**Why this priority**: Branding and delivery are not required for core accounting but are essential for a professional customer experience. Magic link portals reduce support requests ("can you resend my invoice?").

**Independent Test**: A business owner can upload a logo, set brand colours, send an invoice via email with a branded PDF, and verify the customer can open the magic link, view the invoice in the portal, and download the PDF — delivering a professional end-to-end invoicing experience.

**Acceptance Scenarios**:

1. **Given** a business owner navigates to Invoice Settings > Branding, **When** they upload a logo (PNG/JPG, max 2MB), set primary colour #2C4C79, add footer text "Thank you for your business", ABN "12 345 678 901", and payment instructions "BSB: 062-000, Account: 12345678", **Then** the branding template is saved tenant-scoped and previewed in real-time
2. **Given** a branding template is configured, **When** an invoice PDF is generated, **Then** the PDF includes: logo (top left), business name and ABN, invoice number and dates, customer details, line items table, subtotal/tax/total, payment instructions (bottom), footer text, and brand colour accents
3. **Given** an approved or sent invoice, **When** the user clicks "Send via Email", **Then** the system generates a branded PDF, sends an email to the contact's email address with the PDF attached, includes a magic link to the customer portal, records `sent_at` timestamp, and stores an `InvoiceEmailed` event
4. **Given** a customer receives an invoice email, **When** they click the magic link, **Then** they are authenticated (no password required), taken to a secure portal page showing the invoice details, with options to download the PDF and view payment instructions
5. **Given** a magic link, **When** it is accessed, **Then** the system records an `InvoiceViewed` event with timestamp and IP address — subsequent views update `last_viewed_at`
6. **Given** a customer downloads the PDF from the portal, **When** the download completes, **Then** an `InvoiceDownloaded` event is recorded
7. **Given** a magic link was generated 30 days ago, **When** the customer attempts to access it, **Then** the link has expired — the customer sees "This link has expired. Please contact [business name] for a new link." The business can resend the invoice to generate a fresh magic link
8. **Given** an invoice has been sent, **When** the user views the invoice detail, **Then** a delivery timeline shows: Sent (date/time), Viewed (date/time or "Not yet viewed"), Downloaded (date/time or "Not yet downloaded")

---

### User Story 8 — Recurring Invoices & Bills (Priority: P2)

A bookkeeper sets up recurring templates for invoices and bills that repeat on a schedule (weekly, fortnightly, monthly, quarterly, annually). The system auto-generates documents as Draft or auto-Approved based on configuration. Each recurrence has a start date, optional end date, and tracks the next occurrence. Editing the template does not affect previously generated documents.

**Why this priority**: Recurring transactions eliminate manual re-entry for subscription billing, regular supplier charges, and retainer invoices. This is a significant time saver but depends on the core invoice/bill lifecycle being solid first.

**Independent Test**: A bookkeeper can create a monthly recurring invoice template, see the system auto-generate the first invoice on the scheduled date as a Draft, approve it, and verify the next occurrence date has advanced by one month — delivering automated document generation.

**Acceptance Scenarios**:

1. **Given** a bookkeeper creates a recurring invoice template, **When** they configure: contact "Acme Corp", frequency "Monthly", start date 2026-04-01, end date 2026-12-31, auto-generation mode "Draft", with 2 line items, **Then** the template is saved with `next_occurrence` = 2026-04-01 and status "Active"
2. **Given** a recurring template with `next_occurrence` = 2026-04-01, **When** the daily scheduler runs on 2026-04-01, **Then** the system auto-generates an invoice from the template with issue_date = 2026-04-01, due_date calculated from contact's payment terms, status "Draft", and advances `next_occurrence` to 2026-05-01
3. **Given** a recurring template with auto-generation mode "Auto-Approve", **When** a document is generated, **Then** it is created with status "Approved" and the corresponding journal entry (SJ or PJ) is posted immediately
4. **Given** a recurring template with end date 2026-12-31, **When** the last occurrence (2026-12-01) is generated, **Then** the template status changes to "Completed" and no further documents are generated
5. **Given** a recurring template with no end date (indefinite), **When** occurrences are generated, **Then** they continue indefinitely until the user pauses or deactivates the template
6. **Given** an active recurring template, **When** the bookkeeper edits the template (changes a line item from $500 to $600), **Then** the template updates, future generated documents use $600, but previously generated documents retain their original $500 amount
7. **Given** a recurring template, **When** the bookkeeper pauses it, **Then** status changes to "Paused", no further documents are generated, and the `next_occurrence` is preserved for when the template is resumed
8. **Given** the scheduler attempts to generate a recurring document but the contact has been archived, **When** generation fails, **Then** the template status changes to "Error", an `RecurringGenerationFailed` event is stored with the error reason, and the user is notified in-app
9. **Given** a monthly recurring bill template for a supplier, **When** the bookkeeper configures it with frequency "Monthly", start date 2026-04-15, and supplier reference prefix "RENT-", **Then** each generated bill has supplier_reference = "RENT-2026-04", "RENT-2026-05", etc. — auto-incrementing the reference per occurrence

---

### User Story 9 — Aging Reports — AR & AP (Priority: P1)

An accountant views aging reports that categorise outstanding invoices and bills into time buckets based on how overdue they are. The AR aging report shows what customers owe the business; the AP aging report shows what the business owes suppliers. Reports support filtering by contact and date range, with both summary and detail views. Aging data is critical for credit control, cash flow planning, and supplier payment prioritisation.

**Why this priority**: Aging reports are the primary tool for cash flow management and credit control. They are read-only reports but are essential for daily financial management decisions.

**Independent Test**: An accountant can view the AR aging report, see invoices correctly categorised into Current, 1-30, 31-60, 61-90, and 90+ day buckets, filter by a specific customer, and verify the totals match the sum of outstanding invoices for that customer — delivering actionable receivables visibility.

**Acceptance Scenarios**:

1. **Given** a customer has invoices: INV-001 (due today, $1,000 outstanding), INV-002 (due 20 days ago, $500), INV-003 (due 45 days ago, $750), INV-004 (due 100 days ago, $200), **When** the accountant views the AR aging report, **Then** the report shows: Current = $1,000, 1-30 days = $500, 31-60 days = $750, 61-90 days = $0, 90+ days = $200, Total = $2,450
2. **Given** the AP aging report, **When** the accountant views it, **Then** bills are categorised into the same 5 buckets (Current, 1-30, 31-60, 61-90, 90+) based on days past due_date, showing what the business owes suppliers
3. **Given** the AR aging summary view, **When** the accountant views it, **Then** each row shows: contact name, Current, 1-30, 31-60, 61-90, 90+, and Total columns — one row per customer with outstanding balances
4. **Given** the AR aging detail view for a specific customer, **When** the accountant drills down, **Then** each outstanding invoice is listed with: invoice_number, issue_date, due_date, original total, amount_paid, amount_due, days overdue, and aging bucket
5. **Given** the aging report, **When** the accountant filters by contact "Acme Corp", **Then** only Acme Corp's outstanding documents are shown, with bucket totals recalculated for that contact only
6. **Given** the aging report, **When** the accountant sets the "as at" date to 2026-02-28 (a past date), **Then** the report recalculates aging buckets as of that date — using due dates relative to 2026-02-28 instead of today, and only including documents that were outstanding on that date
7. **Given** a fully-paid invoice and a voided invoice, **When** the aging report runs, **Then** neither appears — only documents with payable status (Sent, Approved, Partially Paid) and amount_due > 0 are included
8. **Given** the AR aging report, **When** the accountant exports it, **Then** a CSV file is generated with all columns and rows matching the on-screen report

---

### User Story 10 — File Attachments (Priority: P2)

A user attaches files (PDFs, images, documents) to invoices and bills for supporting documentation — original supplier invoices, purchase orders, receipts, contracts. Files are stored in S3 with tenant-scoped paths. Users can view, download, and delete attachments from the invoice/bill detail page.

**Why this priority**: Attachments are a supporting feature that enhances audit readiness and document management but is not required for core accounting workflows.

**Independent Test**: A bookkeeper can upload a PDF scan of a supplier invoice to a bill, see it listed in the attachments section, download it, and verify the file is intact — delivering document management for financial records.

**Acceptance Scenarios**:

1. **Given** a user views an invoice or bill detail page, **When** they click "Attach File" and select a PDF (invoice-scan.pdf, 2.5MB), **Then** the file is uploaded to S3 at path `tenants/{tenant_id}/attachments/invoices/{document_uuid}/invoice-scan.pdf`, a metadata record is created, and the file appears in the attachments list with filename, size, upload date, and uploaded_by user
2. **Given** an attachment exists on a bill, **When** the user clicks "Download", **Then** the system generates a presigned S3 URL (valid for 5 minutes) and initiates the download
3. **Given** an attachment exists, **When** the user clicks "Delete" and confirms, **Then** the S3 object is soft-deleted (moved to a deleted prefix for 30-day retention), the metadata record is soft-deleted, and the attachment no longer appears in the list
4. **Given** a user attempts to upload a file larger than 10MB, **When** validation runs, **Then** the system rejects with "File size exceeds the 10MB limit"
5. **Given** a user attempts to upload an executable (.exe, .sh, .bat), **When** validation runs, **Then** the system rejects with "File type not allowed" — only PDF, PNG, JPG, JPEG, GIF, DOC, DOCX, XLS, XLSX, CSV, and TXT are permitted
6. **Given** a user in workspace A, **When** they attempt to access an attachment belonging to workspace B (e.g., by manipulating the S3 path), **Then** the system returns 403 Forbidden — attachment access is validated against tenant_id
7. **Given** an invoice with 5 attachments, **When** the user views the attachment list, **Then** all 5 are displayed with: filename, file type icon, file size (human-readable), upload date, and uploaded_by — sorted by upload date descending

---

### Edge Cases

- **Concurrent invoice editing (optimistic locking)**: Two users edit the same invoice simultaneously. User A saves first (version 3 -> 4). User B attempts to save referencing version 3 -> 409 Conflict error with "This document has been modified by another user — please refresh and try again." The version column is checked in the aggregate's `apply()` method before persisting events.
- **Payment exceeding invoice total (overpayment)**: Payment of $1,200 against a $1,000 invoice. $1,000 is allocated to the invoice (status -> Paid). $200 is recorded as overpayment credit on the contact's account. The CRJ entry debits Bank for $1,200 and credits AR for $1,000 + credits Overpayment Liability for $200.
- **Voiding an invoice with partial payments**: Void is blocked — "Cannot void an invoice with payments — issue a credit note instead." The user must: (1) create a credit note for the remaining balance, (2) reverse the partial payment if needed, (3) apply the credit note. This preserves the audit trail.
- **Credit note exceeding invoice balance**: Credit note for $500 against an invoice with $300 outstanding. Full application is blocked — partial application allows $300 to be applied, leaving $200 as unapplied credit on the contact's account.
- **Applying payment to wrong invoice (undo/reallocate)**: Payment allocation can be reversed via `PaymentAllocationReversed` event. The CRJ/CPJ entry is reversed (contra entry), the invoice/bill's amount_paid decreases, status reverts, and the payment amount is available for reallocation.
- **Invoice numbering gaps (deleted drafts)**: Draft invoices that are voided create gaps in the numbering sequence (e.g., INV-000005 voided -> next invoice is INV-000006, no INV-000005 replacement). This is intentional — gaps are acceptable for audit trail integrity. The sequential counter never decrements.
- **Recurring invoice generation failure**: If auto-generation fails (contact archived, chart account deleted, etc.), the template status changes to "Error", the next_occurrence is NOT advanced, an `RecurringGenerationFailed` event logs the reason, and the user is notified. The template can be fixed and manually retried.
- **Tax code changes after invoice approval**: Tax codes are locked at approval time. If a tax code's rate changes after an invoice is approved, the invoice retains the original rate. Any correction requires a credit note and re-invoice.
- **Contact deleted with outstanding invoices**: Contacts with outstanding invoices/bills (amount_due > 0) cannot be archived — the system blocks with "This contact has outstanding documents. Resolve all balances before archiving."
- **Rounding on multi-line invoices with tax**: Tax is calculated per line (line_amount * tax_rate), not on the subtotal. Remainder cents from rounding are allocated to the last line. The sum of per-line tax equals tax_total. This matches Xero's per-line tax calculation.
- **Zero-amount invoices**: Invoices with total <= 0 are rejected at creation. Zero-amount lines are allowed (e.g., "No charge" courtesy items) as long as the invoice total is positive.
- **Backdated invoices into closed accounting periods**: If the issue_date falls within a locked period (002-CLE accounting period), the SJ/PJ entry creation fails with "Cannot post to a closed accounting period." The invoice can still be created as Draft but cannot be approved until the period is reopened or the date is changed.
- **Batch payment currency restrictions**: Batch payments (RECBATCH/PAYBATCH) are base currency only (AUD). Invoices/bills in foreign currencies cannot be included in batch payments — they must be paid individually.
- **Partial credit note application with tax**: When a credit note for $110 (inc. $10 GST) is partially applied ($55), the tax portion is prorated: $50 base + $5 GST. The reversal journal entry reflects the prorated amounts.

---

## Requirements

### Functional Requirements

**Invoice Lifecycle**

- **FR-IAR-001**: System MUST support creating invoices with auto-generated sequential numbers per workspace and per type — INV-NNNNNN for invoices, CN-NNNNNN for credit notes, BILL-NNNNNN for bills
- **FR-IAR-002**: System MUST enforce the invoice status workflow: Draft -> Approved -> Sent -> Partially Paid -> Paid. Voided is reachable from Draft, Approved, Sent, and Partially Paid. Overdue is a computed state (payable status + past due_date + amount_due > 0), not a stored transition
- **FR-IAR-003**: System MUST enforce the bill status workflow: Draft -> Approved -> Partially Paid -> Paid. Voided is reachable from Draft, Approved, and Partially Paid. Bills do not have a "Sent" state
- **FR-IAR-004**: System MUST prevent voiding invoices or bills that have recorded payments — user must issue a credit note instead
- **FR-IAR-005**: System MUST record all invoice mutations as immutable events via `InvoiceAggregate` (InvoiceCreated, InvoiceApproved, InvoiceSent, InvoicePaymentReceived, InvoiceVoided, InvoiceCreditNoteApplied)
- **FR-IAR-006**: System MUST record all bill mutations as immutable events via `BillAggregate` (BillCreated, BillApproved, BillPaymentMade, BillVoided, BillCreditNoteApplied)
- **FR-IAR-007**: System MUST rebuild read models from events via `InvoiceProjector` and `BillProjector`
- **FR-IAR-008**: Paid and Voided MUST be terminal statuses — no further transitions allowed
- **FR-IAR-009**: System MUST implement optimistic locking via a `version` column — concurrent edits produce 409 Conflict errors

**Invoice & Bill Lines**

- **FR-IAR-010**: System MUST support document lines with description, quantity (integer x100 for 2-decimal precision), unit_price (cents), calculated amount (cents), tax_code, tax_amount (cents), chart_account_id, optional job_id, and sort_order
- **FR-IAR-011**: System MUST calculate line amount as `(quantity / 100) * unit_price` server-side
- **FR-IAR-012**: System MUST calculate tax per line as `line_amount * tax_rate` with remainder cents allocated to the last line
- **FR-IAR-013**: System MUST require at least 1 line item per document
- **FR-IAR-014**: System MUST reject documents where calculated total <= 0
- **FR-IAR-015**: System MUST validate that due_date is on or after issue_date
- **FR-IAR-016**: System MUST auto-calculate due_date from contact's payment terms (Net 7/14/30/60/90) when due_date is not explicitly provided

**Journal Entry Creation (Special Journals)**

- **FR-IAR-017**: Invoice Approved MUST create a Sales Journal (SJ) entry: debit Accounts Receivable for total amount, credit Revenue account per line, credit GST Collected per tax line
- **FR-IAR-018**: Bill Approved MUST create a Purchases Journal (PJ) entry: debit Expense account per line, debit GST Paid per tax line, credit Accounts Payable for total amount
- **FR-IAR-019**: AR Payment Received MUST create a Cash Receipts Journal (CRJ) entry: debit Bank account, credit Accounts Receivable
- **FR-IAR-020**: AP Payment Made MUST create a Cash Payments Journal (CPJ) entry: debit Accounts Payable, credit Bank account
- **FR-IAR-021**: Debit and Credit Adjustments MUST create a General Journal (GJ) entry with the specified accounts, amounts, and full reason/audit trail
- **FR-IAR-022**: Sales Credit Note Approved MUST create a reversal SJ entry: debit Revenue, credit Accounts Receivable
- **FR-IAR-023**: Purchase Credit Note Approved MUST create a reversal PJ entry: debit Accounts Payable, credit Expense
- **FR-IAR-024**: Invoice/Bill Voided (if previously approved) MUST create a contra journal entry reversing the original SJ/PJ entry
- **FR-IAR-025**: All journal entries MUST be created via the Core Ledger Engine (002-CLE) and MUST reference the source document (invoice/bill UUID)

**Payment Allocation**

- **FR-IAR-026**: System MUST support FIFO auto-allocation — allocating payment to the oldest outstanding document first (by due_date ascending)
- **FR-IAR-027**: System MUST support manual allocation — user specifies exact amounts per document
- **FR-IAR-028**: System MUST support partial payments — a single payment can be split across multiple documents, and a document can receive multiple partial payments
- **FR-IAR-029**: System MUST track overpayments as credit balance on the contact's account, available for future allocation
- **FR-IAR-030**: System MUST support batch receipts (RECBATCH) — bundle multiple AR invoice payments into a single CRJ entry with TotalAmount matching one bank statement line
- **FR-IAR-031**: System MUST support batch payments (PAYBATCH) — bundle multiple AP bill payments into a single CPJ entry with TotalAmount matching one bank statement line
- **FR-IAR-032**: System MUST NOT allow mixing invoices and bills in a single batch payment
- **FR-IAR-033**: System MUST NOT include credit notes, prepayments, or overpayments in batch payments
- **FR-IAR-034**: Batch payments MUST be base currency only (AUD)
- **FR-IAR-035**: System MUST support payment allocation reversal — reversing the CRJ/CPJ entry and restoring document balances

**Credit Notes**

- **FR-IAR-036**: System MUST support sales credit notes (reduce AR) and purchase credit notes (reduce AP), both sharing the document data model with type = "credit_note"
- **FR-IAR-037**: Credit notes MUST follow lifecycle: Draft -> Approved -> Applied/Refunded
- **FR-IAR-038**: Credit notes MAY reference the original invoice/bill via `credit_note_for_uuid`
- **FR-IAR-039**: System MUST support applying a credit note to an outstanding invoice/bill — reducing the document's amount_due
- **FR-IAR-040**: System MUST prevent applying a credit note amount exceeding the target document's outstanding balance (full application blocked; partial application required)
- **FR-IAR-041**: System MUST support refunding a credit note to a bank account — creating a reversal CRJ/CPJ entry
- **FR-IAR-042**: System MUST track unapplied credit note balances on the contact's account

**Debit & Credit Adjustments**

- **FR-IAR-043**: System MUST support debit adjustments — increasing the amount owed by a contact (additional charges, error corrections, late fees)
- **FR-IAR-044**: System MUST support credit adjustments — decreasing the amount owed by a contact (discounts, write-offs, error corrections)
- **FR-IAR-045**: Both adjustment types MUST create GJ entries via the Core Ledger Engine with the specified account, amount, reason, and full audit trail
- **FR-IAR-046**: Adjustments MAY be applied to a specific invoice/bill (modifying its amount_due) or to the contact's general account balance
- **FR-IAR-047**: System MUST support adjustment reversal via contra GJ entry

**Invoice Branding & Delivery**

- **FR-IAR-048**: System MUST support tenant-scoped invoice branding: logo (PNG/JPG, max 2MB), primary colour, footer text, ABN, and payment instructions
- **FR-IAR-049**: System MUST generate branded PDF invoices from the configured template
- **FR-IAR-050**: System MUST support email delivery with PDF attachment and magic link to customer portal
- **FR-IAR-051**: System MUST provide a customer portal with magic link authentication — view invoice details, download PDF
- **FR-IAR-052**: Magic links MUST expire after 30 days — expired links show an informational message directing the customer to contact the business
- **FR-IAR-053**: System MUST track delivery events: InvoiceEmailed (sent_at), InvoiceViewed (viewed_at, IP), InvoiceDownloaded (downloaded_at)

**Recurring Transactions**

- **FR-IAR-054**: System MUST support recurring invoice and bill templates with configurable frequency: weekly, fortnightly, monthly, quarterly, annually
- **FR-IAR-055**: System MUST support auto-generation modes: "Draft" (generate as draft for manual approval) and "Auto-Approve" (generate and approve automatically)
- **FR-IAR-056**: Templates MUST have start_date, optional end_date (or indefinite), and system-managed next_occurrence
- **FR-IAR-057**: Editing a template MUST NOT affect previously generated documents
- **FR-IAR-058**: System MUST support pausing and resuming recurring templates — preserving next_occurrence
- **FR-IAR-059**: System MUST handle generation failures gracefully — template status set to "Error", next_occurrence not advanced, user notified, and `RecurringGenerationFailed` event stored

**Aging Reports**

- **FR-IAR-060**: System MUST provide AR aging report with 5 buckets: Current, 1-30 days, 31-60 days, 61-90 days, 90+ days overdue
- **FR-IAR-061**: System MUST provide AP aging report with the same 5-bucket structure
- **FR-IAR-062**: Aging MUST include only documents with payable status and amount_due > 0
- **FR-IAR-063**: Aging MUST calculate buckets based on days since due_date relative to the report date (default: today)
- **FR-IAR-064**: System MUST support "as at" date parameter — calculating aging as of a historical date
- **FR-IAR-065**: Aging response MUST include: summary (count + total per bucket per contact), total_outstanding, and per-document detail (number, contact, due_date, total, amount_due, days_overdue, bucket)
- **FR-IAR-066**: System MUST support filtering aging reports by contact
- **FR-IAR-067**: System MUST support exporting aging reports as CSV

**File Attachments**

- **FR-IAR-068**: System MUST support attaching files to invoices and bills — stored in S3 at `tenants/{tenant_id}/attachments/{document_type}/{document_uuid}/{filename}`
- **FR-IAR-069**: System MUST enforce allowed file types: PDF, PNG, JPG, JPEG, GIF, DOC, DOCX, XLS, XLSX, CSV, TXT
- **FR-IAR-070**: System MUST enforce maximum file size of 10MB per attachment
- **FR-IAR-071**: System MUST generate presigned S3 URLs for downloads (valid 5 minutes)
- **FR-IAR-072**: Attachment deletion MUST soft-delete (moved to deleted prefix with 30-day retention)

**Contact Integration**

- **FR-IAR-073**: Invoices MUST belong to a contact of type "customer" or "both" — supplier-only contacts cannot receive invoices
- **FR-IAR-074**: Bills MUST belong to a contact of type "supplier" or "both" — customer-only contacts cannot receive bills
- **FR-IAR-075**: Contacts with outstanding documents (amount_due > 0) MUST NOT be archivable
- **FR-IAR-076**: System MUST track per-contact credit balance (overpayments, unapplied credit notes)

**Authorization**

- **FR-IAR-077**: System MUST enforce granular permissions: `invoice.view`, `invoice.create`, `invoice.approve`, `invoice.send`, `invoice.record-payment`, `invoice.void`, `bill.view`, `bill.create`, `bill.approve`, `bill.record-payment`, `bill.void`, `adjustment.create`, `adjustment.reverse`
- **FR-IAR-078**: Owner and Accountant roles MUST have all invoice, bill, and adjustment permissions
- **FR-IAR-079**: Bookkeeper role MUST have view and create permissions for invoices and bills, but NOT approve or void
- **FR-IAR-080**: Approver role MUST have view, approve, send, and record-payment permissions for invoices and bills
- **FR-IAR-081**: Auditor and Client roles MUST have view-only permissions (read-only across all documents)

**Tenant Scoping**

- **FR-IAR-082**: All data (invoices, bills, lines, payments, credit notes, adjustments, templates, attachments, branding) MUST be scoped by tenant_id — no cross-tenant access
- **FR-IAR-083**: Document numbers MUST be unique and sequential within each workspace and type combination
- **FR-IAR-084**: Job ID references on document lines MUST be validated against the current workspace

**Audit Trail & Events**

- **FR-IAR-085**: System MUST record events for all invoice lifecycle actions: InvoiceCreated, InvoiceApproved, InvoiceSent, InvoicePaymentReceived, InvoiceVoided, InvoiceCreditNoteApplied
- **FR-IAR-086**: System MUST record events for all bill lifecycle actions: BillCreated, BillApproved, BillPaymentMade, BillVoided, BillCreditNoteApplied
- **FR-IAR-087**: System MUST record events for payment allocation: PaymentAllocated, PaymentAllocationReversed, BatchPaymentProcessed
- **FR-IAR-088**: System MUST record events for adjustments: DebitAdjustmentCreated, CreditAdjustmentCreated, AdjustmentReversed
- **FR-IAR-089**: System MUST record events for credit notes: CreditNoteApproved, CreditNoteApplied, CreditNoteRefunded
- **FR-IAR-090**: System MUST record events for recurring templates: RecurringTemplateCreated, RecurringDocumentGenerated, RecurringGenerationFailed, RecurringTemplatePaused, RecurringTemplateResumed
- **FR-IAR-091**: System MUST record events for delivery: InvoiceEmailed, InvoiceViewed, InvoiceDownloaded
- **FR-IAR-092**: All events MUST include: tenant_id, user_id, timestamp, and the full payload of the action

### Key Entities

- **Invoice**: The core AR billing document. Contains UUID, auto-generated invoice_number (INV-NNNNNN), type (invoice/credit_note), contact reference, dates (issue, due), monetary totals (subtotal, tax_total, total, amount_paid, amount_due in cents), status (Draft/Approved/Sent/PartiallyPaid/Paid/Voided), currency (ISO 4217, default AUD), version (optimistic locking), optional credit_note_for_uuid, reference, notes, terms, payment_terms, and user tracking (created_by, approved_by). Soft-deletable. Belongs to a Workspace.
- **Bill**: The core AP payables document. Mirrors Invoice structure with bill_number (BILL-NNNNNN), type (bill/credit_note), supplier_reference field, and AP-specific status workflow (no "Sent" state). Managed by `BillAggregate`.
- **DocumentLine**: A single line item within an invoice or bill. Polymorphic (belongs to Invoice or Bill). Carries description, quantity (x100), unit_price (cents), calculated amount (cents), tax_code, tax_amount (cents), chart_account_id for GL mapping, optional job_id for project tracking, and sort_order.
- **Payment**: A payment recorded against an invoice or bill. Polymorphic. Carries amount (cents), payment_date, payment_method (cash/bank_transfer/card/cheque/other), reference, notes, recorded_by user, optional journal_entry_id for GL linking, and allocation details (which documents received what amounts).
- **PaymentAllocation**: A join record linking a Payment to one or more documents with specific allocation amounts. Enables FIFO and manual allocation tracking. Stores payment_id, document_id, document_type, allocated_amount (cents), allocated_at.
- **BatchPayment**: A group of payment allocations bundled into a single CRJ/CPJ entry. Stores batch_type (RECBATCH/PAYBATCH), total_amount (cents), bank_account_id, journal_entry_id, payment_date, and list of included allocations.
- **CreditNote**: Implemented as an Invoice or Bill with type = "credit_note". Additional tracking: applied_amount (cents), unapplied_amount (cents), status (Draft/Approved/Applied/PartiallyApplied/Refunded).
- **Adjustment**: A debit or credit adjustment against a contact's account or specific document. Stores type (debit/credit), amount (cents), reason, chart_account_id (contra account), contact_id, optional document reference, journal_entry_id, created_by, and reversal_of_id (for reversals).
- **ContactBalance**: Aggregate balance tracker per contact. Stores contact_id, ar_balance (cents), ap_balance (cents), credit_balance (cents — overpayments + unapplied credit notes), last_calculated_at. Maintained by projectors.
- **RecurringTemplate**: A template for auto-generating invoices or bills. Stores document_type (invoice/bill), contact_id, frequency (weekly/fortnightly/monthly/quarterly/annually), start_date, end_date (nullable), next_occurrence, auto_generation_mode (draft/auto_approve), status (Active/Paused/Completed/Error), and the template line items.
- **InvoiceBranding**: Tenant-scoped branding configuration. Stores logo_path (S3), primary_colour (hex), footer_text, abn, payment_instructions, and tenant_id.
- **InvoiceDelivery**: Tracks invoice delivery events. Stores invoice_id, email_sent_at, magic_link_token (hashed), magic_link_expires_at, viewed_at, last_viewed_at, downloaded_at, recipient_email, and IP address logs.
- **DocumentAttachment**: Metadata for files attached to invoices/bills. Stores document_id, document_type, filename, file_path (S3), file_size (bytes), mime_type, uploaded_by, uploaded_at, deleted_at (soft delete).
- **InvoiceAggregate**: Event-sourced aggregate root managing invoice lifecycle. Maintains in-memory state (status, total, amountPaid, version) and enforces business rules (valid transitions, no overpayment, void guards, optimistic locking).
- **BillAggregate**: Event-sourced aggregate root managing bill lifecycle. Mirrors InvoiceAggregate with AP-specific rules.
- **InvoiceProjector / BillProjector**: Consume domain events and maintain the read models. Generate sequential document numbers during projection.

---

## Success Criteria

### Measurable Outcomes

- **SC-IAR-001**: Invoice and bill creation enforces at least 1 line item and positive total — 0% invalid documents can be created
- **SC-IAR-002**: Status workflow transitions are enforced by the aggregate — 0% invalid state transitions possible (verified by exhaustive test coverage of all transition paths)
- **SC-IAR-003**: Overpayment handling works correctly — payments exceeding document total are split into allocation + contact credit balance with zero data loss
- **SC-IAR-004**: FIFO auto-allocation correctly prioritises oldest documents first — verified by test with 10+ documents of varying due dates
- **SC-IAR-005**: Batch payments (RECBATCH/PAYBATCH) produce a single journal entry whose TotalAmount matches the sum of all allocations — verified by integration test matching CRJ/CPJ total to bank statement amount
- **SC-IAR-006**: Every Invoice Posted event produces a balanced SJ entry (debits = credits) via the Core Ledger Engine — verified by double-entry integrity check on all journal entries
- **SC-IAR-007**: Every Bill Posted event produces a balanced PJ entry (debits = credits) — same verification as SC-IAR-006
- **SC-IAR-008**: Credit note application correctly reduces target document's amount_due and creates reversal journal entries — verified by balance check before and after application
- **SC-IAR-009**: Debit and credit adjustments create balanced GJ entries and correctly modify contact/document balances — verified by ledger balance reconciliation
- **SC-IAR-010**: Optimistic locking prevents concurrent edit data loss — concurrent save produces 409 Conflict for the slower user, zero silent overwrites
- **SC-IAR-011**: Aging reports accurately categorise all outstanding documents — bucket assignment matches manual calculation for 100% of test cases across all 5 buckets
- **SC-IAR-012**: Cross-tenant document isolation verified — automated tests confirm documents from workspace A are invisible to workspace B
- **SC-IAR-013**: Document number generation is unique and sequential per workspace — no gaps (except voided drafts) or duplicates under concurrent creation
- **SC-IAR-014**: All permission grants are enforced — bookkeeper cannot approve, approver cannot create, auditor/client cannot mutate (verified by authorization tests for all 13 permissions)
- **SC-IAR-015**: Invoice PDF generation with branding completes in under 3 seconds per invoice
- **SC-IAR-016**: Magic link customer portal loads invoice details in under 2 seconds
- **SC-IAR-017**: Recurring template generation processes all due templates within the daily scheduler window with zero missed occurrences under normal conditions
- **SC-IAR-018**: Tax rounding on multi-line documents produces zero cent loss or gain — verified by summing per-line tax against tax_total
- **SC-IAR-019**: Payment allocation reversal correctly restores all document balances and creates contra journal entries — verified by full round-trip test (allocate -> reverse -> verify balances match original)
- **SC-IAR-020**: File attachment upload, download, and deletion work correctly with tenant-scoped S3 paths — zero cross-tenant access possible

---

## Xero Parity & Differentiation

### Xero Patterns We Match
- **Invoice lifecycle**: Draft -> Approved -> Sent -> Paid with partial payments — our Invoice and Bill status workflows follow the same progression
- **Credit notes**: Create, approve, apply to invoice, or refund to bank — our credit note lifecycle mirrors Xero's with the same application and refund mechanics
- **Payment allocation**: Apply a payment to one or more invoices, with partial payments tracked per invoice — our FIFO + manual allocation covers the same use cases
- **Batch payments**: Xero's batch payment bundles multiple bills into one AP payment — our PAYBATCH (CPJ) and RECBATCH (CRJ) implement the same pattern
- **Invoice branding**: Logo, colours, payment details on PDF — our branding configuration covers the same customisation options
- **Repeating invoices**: Scheduled generation with editable templates — our recurring transactions match Xero's scheduling model
- **Aging reports**: Current, 30, 60, 90, 90+ day buckets by contact — our aging reports use the same standard bucket structure
- **Statement of account**: Per-contact view of all transactions — our contact balance + aging detail view provides equivalent functionality
- **Write-offs and adjustments**: Xero uses credit notes and manual journals — our dedicated debit/credit adjustment feature provides a more streamlined workflow

### Where We Beat Xero
- **FIFO auto-allocation**: Xero requires manual selection of which invoices to pay; we offer one-click FIFO allocation that automatically pays the oldest invoices first, with manual override available
- **Debit/credit adjustments as first-class entities**: Xero requires manual journal entries for late fees, write-offs, and corrections; we provide purpose-built adjustment workflows with reason tracking and automatic balance updates
- **Event-sourced audit trail**: Xero provides a transaction history view; we provide a complete, immutable event stream that can reconstruct any document's full state at any point in time
- **Optimistic locking with clear UX**: Xero silently overwrites concurrent edits; we detect conflicts and present the user with a clear resolution path
- **Batch payment validation**: Xero allows creating batch payments that may fail processing; we validate all allocations upfront (correct amounts, no mixing of AR/AP, base currency only) before creating the batch
- **Aging "as at" date**: Xero aging is always as-of-today; we support historical aging — calculating buckets as of any past date for period-end reporting
- **Credit note partial application**: Xero applies credit notes in full or not at all; we support partial application with the remainder tracked as contact credit
- **Delivery tracking**: Xero shows "Sent" status; we track Sent, Viewed, and Downloaded with timestamps — giving businesses visibility into customer engagement
- **Magic link expiry with clear messaging**: Xero's online invoices don't expire; we expire magic links after 30 days for security while providing clear re-request instructions

### Xero Limitations We Avoid
- **No payment allocation API**: Xero's payment allocation is limited via API; we build allocation as a first-class API-driven feature
- **Batch payment restrictions**: Xero batch payments are limited to approved bills; we support the same restriction but with clearer validation messages and pre-check
- **Credit note complexity**: Xero's credit note application requires multiple steps; we streamline with direct "Apply to Invoice" from the credit note detail page
- **Recurring invoice inflexibility**: Xero's repeating invoices cannot be paused and resumed; we support pause/resume with preserved scheduling
- **Adjustment audit trail**: Xero adjustments via manual journals lose the connection to the original invoice; our adjustments maintain explicit document references

---

## Design Decisions

### Line Item Grid — TanStack Table (Universal Component)

All line item editing across the platform uses a single reusable `<LineItemGrid>` component built on TanStack Table + React Virtual (already in stack from 004-BFR Cash Coding). This applies to:

- **Sales Invoice lines** — description, quantity, unit price, account, tax code, amount
- **Purchase Bill lines** — description, quantity, unit price, account, tax code, amount
- **Manual Journal lines** — account, description, debit, credit, tax code
- **Credit Note lines** — description, quantity, unit price, account, tax code, amount
- **Debit/Credit Adjustment lines** — account, description, amount, tax code
- **Split transactions (004-BFR)** — account, description, amount, tax code
- **Cash Coding grid (004-BFR)** — contact, account, tax code, description

Features:
- Editable cells with dropdown pickers (account, tax code, contact)
- Auto-calculate line totals, subtotal, tax, grand total
- Add/remove/reorder rows
- Tab between cells, Enter to confirm, keyboard-first
- Paste from clipboard (Excel/Sheets compatibility)
- Drag-and-drop row reordering
- Consistent UX across all modules — learn once, use everywhere

---

## Clarifications

### Session 2026-03-11
- Q: What component should be used for line item editing across invoices, bills, journals, and adjustments? -> A: TanStack Table + React Virtual — single reusable `<LineItemGrid>` component. No additional library. Consistent grid-based editing UX across all modules: AR invoices, AP bills, manual journals, credit notes, adjustments, split transactions, and cash coding.

---

## Out of Scope

- **Multi-currency invoicing**: All invoices and bills are in AUD for this phase. Currency field is stored and ready for 011-MCY but FX conversion, gain/loss calculation, and multi-currency aging are deferred.
- **Automated payment collection**: Stripe/PayPal/direct debit integration for auto-collecting invoice payments is deferred. The customer portal is view/download only.
- **Purchase order matching**: 3-way matching (PO -> Bill -> Receipt) is deferred to a future phase. Bills stand alone without PO reference.
- **Inventory integration**: Invoice lines do not deduct from inventory or update stock levels. Inventory management is a separate future feature.
- **Advanced billing workflows**: Milestone billing, progress invoicing, deposit invoices, and retainer management are deferred.
- **OCR bill capture**: Automatic extraction of bill data from scanned/photographed supplier invoices is deferred. Bills are entered manually.
- **Customer portal payments**: Customers can view and download invoices but cannot make payments through the portal. Payment recording is bookkeeper-initiated.
- **Statement of account PDF**: Per-contact PDF statements are deferred. The contact balance and aging detail view serves as the interim equivalent.
- **Payment reminders**: Automated overdue payment reminder emails are deferred. Overdue flagging in the aging report is the initial approach.
- **Approval workflows (multi-step)**: Single approver model only. Multi-step approval chains (e.g., manager -> finance director for amounts over $10,000) are deferred.
