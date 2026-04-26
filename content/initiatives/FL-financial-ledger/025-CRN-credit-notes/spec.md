---
title: "Feature Specification: Credit Notes & Allocations"
---

# Feature Specification: Credit Notes & Allocations

**Epic**: 025-CRN
**Status**: Draft
**Created**: 2026-03-14

## Problem Statement

When an invoice has been sent or partially paid, it cannot be voided — the aggregate already prevents this with "Cannot void an invoice with payments recorded. Issue a credit note instead." But there's no way to actually issue a credit note yet. Accountants and bookkeepers currently have no mechanism to handle returns, overcharges, billing errors, or early payment discounts once an invoice has been actioned.

The same applies to bills (AP) — suppliers issue credit notes that need to be recorded and allocated against outstanding bills.

## Existing Infrastructure

The codebase already has significant scaffolding:

- `InvoiceType::CreditNote` and `InvoiceType::BillCreditNote` enums exist
- `InvoiceAggregate::createInvoice()` accepts `creditNoteForUuid` parameter
- `InvoiceProjector` generates `CN-000001` / `BCN-000001` numbering
- Invoice model has `credit_note_for_uuid` column
- Frontend types have `credit_note` type and `credit_note_prefix` setting
- Invoice settings page has a "Credit Note Prefix" field

What's missing: creation actions, allocation logic, GL impact on approval, API endpoints, and frontend UI.

## User Stories

### US1 — Create Credit Note Against Sales Invoice [P1]

**As a** bookkeeper or accountant,
**I want to** create a credit note linked to an existing sales invoice,
**so that** I can formally reduce the amount owed by a customer.

**Acceptance Criteria:**
- Can create a credit note from an invoice detail page ("Issue Credit Note" button)
- Credit note is pre-populated with the original invoice's lines (editable — can partial credit)
- Credit note total cannot exceed the original invoice's outstanding amount (amount_due)
- Credit note is created with type `credit_note` and linked via `credit_note_for_uuid`
- Credit note follows same status flow: Draft → Approved → Allocated
- Credit note has its own sequential number (CN-000001)

### US2 — Create Supplier Credit Note Against Bill [P1]

**As a** bookkeeper or accountant,
**I want to** record a credit note received from a supplier against an existing bill,
**so that** I can reduce the amount I owe to that supplier.

**Acceptance Criteria:**
- Can create a bill credit note from a bill detail page
- Pre-populated with original bill lines (editable for partial credits)
- Total cannot exceed bill's outstanding amount
- Type `bill_credit_note`, numbered BCN-000001
- Same status flow as sales credit notes

### US3 — Credit Note GL Impact on Approval [P1]

**As an** accountant,
**I want** credit notes to create reversing journal entries when approved,
**so that** the general ledger correctly reflects the reduction in revenue/expense.

**Acceptance Criteria:**
- Sales credit note approval: Debit Revenue, Credit Accounts Receivable
- Bill credit note approval: Debit Accounts Payable, Credit Expense
- Journal entry is linked to the credit note (same as invoice approval JE pattern)
- Tax amounts are reversed proportionally
- Credit note GL entries appear in the General Ledger report

### US4 — Allocate Credit Note to Invoice [P1]

**As a** bookkeeper,
**I want to** allocate an approved credit note against one or more outstanding invoices for the same contact,
**so that** the customer's balance is reduced without needing a cash refund.

**Acceptance Criteria:**
- Can allocate from credit note detail page
- Shows list of outstanding invoices for the same contact
- Can allocate partial amounts (split credit across multiple invoices)
- Total allocations cannot exceed credit note total
- When allocated: invoice's `amount_paid` increases, `amount_due` decreases
- Fully allocated credit note transitions to status "Paid" (mirroring Xero's model)
- Allocation recorded as a special payment type on the invoice (not cash — credit note reference)

### US5 — Standalone Credit Note (No Linked Invoice) [P2]

**As a** bookkeeper,
**I want to** create a credit note without linking it to a specific invoice,
**so that** I can handle general goodwill credits, bulk adjustments, or credits from prior periods.

**Acceptance Criteria:**
- "New Credit Note" button on credit notes list page
- Must select a contact
- Line items entered manually (no pre-population)
- Can be allocated to any outstanding invoices for that contact
- Or can be refunded (recorded as a refund payment)

### US6 — Credit Note Refund [P2]

**As a** bookkeeper,
**I want to** record a cash refund against an unallocated credit note,
**so that** I can handle cases where the customer gets money back rather than a credit.

**Acceptance Criteria:**
- "Record Refund" action on approved, unallocated credit notes
- Refund amount cannot exceed unallocated credit balance
- Creates journal entry: Debit AR (or AP for bills), Credit Bank/Cash
- Marks credit note as Paid once fully refunded/allocated

### US7 — Credit Notes in Aging Report [P2]

**As an** accountant,
**I want** credit notes to appear in the AR/AP aging report,
**so that** I can see the true net position per contact.

**Acceptance Criteria:**
- Unallocated credit notes appear as negative amounts in aging
- Aging report shows net balance per contact (invoices minus credits)
- Credit notes age from their issue date

### US8 — Credit Notes List Page [P1]

**As a** bookkeeper,
**I want** a dedicated view for credit notes,
**so that** I can see all credits issued, their allocation status, and remaining balance.

**Acceptance Criteria:**
- Filterable list: Sales Credit Notes / Bill Credit Notes
- Columns: Number, Contact, Date, Total, Allocated, Remaining, Status
- Quick filters: Unallocated, Partially Allocated, Fully Allocated
- Click through to credit note detail

## Functional Requirements

### FR1 — Credit Note Creation
- Credit notes use the existing `InvoiceAggregate` and `Invoice` model with type discrimination
- When created from an invoice: lines are copied, `credit_note_for_uuid` is set
- When standalone: `credit_note_for_uuid` is null
- Credit note total stored as positive integer (display as negative in reports)

### FR2 — Credit Note Status Flow
```
Draft → Approved → Sent (optional) → Allocated/Paid
                                    ↘ Voided
```
- "Allocated" is equivalent to "Paid" for credit notes (fully applied)
- Partially allocated credit notes remain in "Sent" status with reduced `amount_due`

### FR3 — Allocation Model
- New `credit_note_allocations` table: credit_note_id, invoice_id, amount, allocated_at, allocated_by
- One credit note can allocate to many invoices (same contact only)
- One invoice can receive allocations from many credit notes
- Allocation is an event: `CreditNoteAllocated` recorded on the credit note aggregate
- Allocation triggers `InvoicePaymentReceived` on the target invoice aggregate (with credit note reference)

### FR4 — GL Impact
- On approval: reversing journal entry (opposite of invoice approval JE)
- On allocation: no additional GL entry (the credit note's JE already adjusted revenue/expense; the invoice's payment reduces AR/AP)
- On refund: JE for cash movement (Debit AR/AP, Credit Bank)

### FR5 — Permissions
- Same as invoice permissions: `invoice.create`, `invoice.approve`, `invoice.record-payment`
- Credit notes are invoices with a different type — no separate permission set needed

### FR6 — Numbering
- Already implemented in projector: `CN-000001`, `BCN-000001`
- Prefix configurable via workspace invoice settings (`credit_note_prefix`)

## Key Entities

### CreditNoteAllocation (new)
| Field | Type | Description |
|-------|------|-------------|
| id | bigint | PK |
| workspace_id | int | Tenant scope |
| credit_note_id | int | FK → invoices (type=credit_note) |
| invoice_id | int | FK → invoices (target invoice) |
| amount | int | Allocation amount in cents |
| allocated_at | datetime | When allocated |
| allocated_by | int | FK → users |

## Success Criteria

- Bookkeeper can create, approve, and allocate a credit note in under 2 minutes
- Credit note GL entries balance correctly (debit = credit)
- Aging report reflects net position per contact
- Allocation cannot exceed credit note total or invoice outstanding
- All existing invoice tests continue to pass (credit notes extend, not break)

## Out of Scope

- Automatic credit note generation from returns/disputes
- PDF/email sending of credit notes (defer to email infrastructure epic 023-EML)
- Multi-currency credit notes (defer — credit note must match invoice currency)
- Recurring credit notes
- Quotes and purchase orders (use draft invoices/bills instead — see architecture decision)
