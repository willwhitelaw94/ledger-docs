---
title: "Feature Specification: Quotes & Purchase Orders"
---

# Feature Specification: Quotes & Purchase Orders

**Feature Branch**: `031-QPO-quotes-purchase-orders`
**Created**: 2026-03-15
**Status**: Approved (Gate 1 passed 2026-03-15)
**Epic**: 031-QPO
**Initiative**: FL — Financial Ledger Platform
**Effort**: M (2 sprints)
**Depends On**: 005-IAR (complete — Invoice model, line items, contacts)

### Out of Scope

- **Multi-currency quotes/POs** — uses workspace base currency only (same as invoices)
- **Quote approval workflows** — no internal approval chain. Quotes go directly from draft to sent.
- **Partial delivery on POs** — v1 is all-or-nothing (received or not). Partial receiving deferred.
- **Quote versioning** — no revision history. Edit the quote directly.
- **Automated quote expiry** — v1 requires manual status change. Scheduled expiry deferred.

### Architectural Decision

Quotes and Purchase Orders extend the existing `Invoice` model by adding new values to `InvoiceType` enum and new statuses to `InvoiceStatus` enum. No new tables. This leverages existing line items, contacts, attachments, notes, and PDF generation.

---

## Overview

Quotes and Purchase Orders are pre-transaction documents that sit before invoices and bills in the business workflow. A quote is a proposal to a customer — when accepted, it converts to an invoice. A purchase order is a commitment to a supplier — when goods are received, it converts to a bill. Both use the same data structure as invoices (line items, contact, amounts) but have distinct status flows and numbering sequences.

---

## User Scenarios & Testing

### User Story 1 — Create and Send a Quote (Priority: P1)

A business owner wants to send a quote to a potential customer for a landscaping job. They create a quote with line items (design, materials, labour), set an expiry date, and email it to the customer. The customer accepts, and the business converts it to an invoice with one click.

**Why this priority**: Quotes are the entry point of the sales cycle. Without them, businesses skip straight to invoicing — losing the negotiation step.

**Independent Test**: Create a quote, send it, mark as accepted, convert to invoice, verify the invoice has the same line items.

**Acceptance Scenarios**:

1. **Given** I navigate to /quotes/new, **When** I fill in contact, line items, issue date, and expiry date, **Then** a quote is created with type "quote", status "draft", and a number like QUO-0001.

2. **Given** I have a draft quote, **When** I click "Send", **Then** the status changes to "sent" and the contact receives the quote via email (using existing email infrastructure).

3. **Given** a sent quote, **When** the customer verbally accepts, I click "Mark as Accepted", **Then** the status changes to "accepted".

4. **Given** an accepted quote, **When** I click "Convert to Invoice", **Then** a new invoice is created with the same contact, line items, and amounts. The quote status changes to "converted". The new invoice is linked to the original quote.

5. **Given** a sent quote, **When** the customer declines, I click "Mark as Declined", **Then** the status changes to "declined". The quote cannot be converted.

6. **Given** a sent quote with an expiry date in the past, **When** I view the quote, **Then** it shows an "Expired" badge. I can still manually accept or decline it.

7. **Given** I view /quotes, **When** the page loads, **Then** I see a list of all quotes with columns: Number, Contact, Amount, Status, Issue Date, Expiry Date. Filterable by status.

---

### User Story 2 — Create and Receive a Purchase Order (Priority: P1)

A business owner needs to order $5,000 of materials from a supplier. They create a purchase order with line items, send it to the supplier, and mark it as received when the goods arrive. The PO then converts to a bill for payment.

**Why this priority**: POs complete the procurement cycle. Without them, businesses create bills after the fact — losing the tracking of what was ordered vs received.

**Independent Test**: Create a PO, send it, mark as received, convert to bill, verify the bill has the same line items.

**Acceptance Scenarios**:

1. **Given** I navigate to /purchase-orders/new, **When** I fill in supplier contact, line items, and expected delivery date, **Then** a purchase order is created with type "purchase_order", status "draft", and a number like PO-0001.

2. **Given** I have a draft PO, **When** I click "Send to Supplier", **Then** the status changes to "sent".

3. **Given** a sent PO, **When** goods arrive and I click "Mark as Received", **Then** the status changes to "received".

4. **Given** a received PO, **When** I click "Convert to Bill", **Then** a new bill is created with the same supplier, line items, and amounts. The PO status changes to "converted". The new bill is linked to the original PO.

5. **Given** a sent PO, **When** I need to cancel it, I click "Cancel", **Then** the status changes to "cancelled". It cannot be converted.

6. **Given** I view /purchase-orders, **When** the page loads, **Then** I see all POs with columns: Number, Supplier, Amount, Status, Issue Date, Expected Delivery.

---

### User Story 3 — Quote/PO Settings (Priority: P2)

A business owner wants to customise their quote and PO number prefixes and starting numbers.

**Why this priority**: Businesses that already use quotes/POs externally need numbering continuity.

**Independent Test**: Change the quote prefix to "EST-" and next number to 500, create a quote, verify it's numbered "EST-0500".

**Acceptance Scenarios**:

1. **Given** I navigate to workspace settings, **When** I view the "Documents" section, **Then** I see prefix and next number fields for: Invoices, Credit Notes, Quotes, and Purchase Orders.

2. **Given** I set quote prefix to "EST-" and next number to 500, **When** I create a new quote, **Then** it's numbered "EST-0500".

3. **Given** I set PO prefix to "ORDER-", **When** I create a new purchase order, **Then** it's numbered "ORDER-0001".

---

### User Story 4 — Quote/PO on Contact Detail (Priority: P2)

Quotes and POs for a contact should be visible on their detail page alongside invoices and bills.

**Why this priority**: Users need to see the full relationship history with a contact — quotes sent, POs issued, invoices, bills.

**Acceptance Scenarios**:

1. **Given** I view a contact's detail page, **When** the contact has quotes, **Then** I see a "Quotes" tab/section showing all quotes for this contact.

2. **Given** a contact has purchase orders, **When** I view their detail, **Then** I see a "Purchase Orders" section.

---

### User Story 5 — Duplicate Quote/PO (Priority: P3)

A user wants to create a new quote based on a previous one — same line items, different contact or updated prices.

**Acceptance Scenarios**:

1. **Given** I am viewing an existing quote, **When** I click "Duplicate", **Then** a new draft quote is created with the same line items and amounts, but a new number and today's date. I can edit before saving.

---

### Edge Cases

- What happens when a quote is converted but the invoice is later voided? The quote stays "converted" — no automatic revert. User can create a new quote if needed.
- What happens when a PO is partially received? V1 doesn't support partial — it's all or nothing. Mark as received when complete.
- Can a quote be edited after sending? Yes — returns to "draft" status (like invoices).
- Can multiple invoices be created from one quote? No — one quote converts to one invoice. Duplicate the quote for a new version.
- What if the contact is deleted after a quote is sent? Quote retains the contact reference (soft delete pattern already exists on contacts).

---

## Requirements

### Functional Requirements

**Types & Statuses**
- **FR-001**: System MUST add `Quote` and `PurchaseOrder` values to the InvoiceType enum.
- **FR-002**: System MUST add quote statuses: `quoted` (sent), `accepted`, `declined`, `expired`, `converted`.
- **FR-003**: System MUST add PO statuses: `ordered` (sent), `received`, `cancelled`, `converted`.
- **FR-004**: Status transitions MUST be validated — e.g., only "sent" quotes can be accepted.

**CRUD**
- **FR-005**: System MUST support creating, editing, and deleting draft quotes with the same line item structure as invoices.
- **FR-006**: System MUST support creating, editing, and deleting draft purchase orders with the same line item structure as bills.
- **FR-007**: Quotes MUST have an optional expiry date field.
- **FR-008**: Purchase orders MUST have an optional expected delivery date field.

**Numbering**
- **FR-009**: Quotes MUST use a separate numbering sequence from invoices (default prefix: "QUO-").
- **FR-010**: Purchase orders MUST use a separate numbering sequence from bills (default prefix: "PO-").
- **FR-011**: Prefixes and next numbers MUST be configurable in workspace settings (in the existing invoice_settings JSON).

**Conversion**
- **FR-012**: Accepted quotes MUST be convertible to invoices with one action. Line items, contact, and amounts are copied. The quote's status becomes "converted" and stores the resulting invoice UUID.
- **FR-013**: Received POs MUST be convertible to bills with one action. Same copy pattern. PO status becomes "converted" with the resulting bill UUID.
- **FR-014**: The resulting invoice/bill MUST display a link back to the original quote/PO.
- **FR-015**: Conversion MUST be a one-time action — a converted quote cannot be converted again.

**Sending**
- **FR-016**: Quotes MUST be sendable via email using the existing email infrastructure (023-EML).
- **FR-017**: POs MUST be sendable via email to the supplier contact.

**Duplication**
- **FR-018**: System MUST support duplicating a quote or PO into a new draft with the same line items.

**Listing & Filtering**
- **FR-019**: System MUST provide /quotes and /purchase-orders list pages with status filtering.
- **FR-020**: Quotes and POs MUST appear on contact detail pages alongside invoices and bills.

### Key Entities

- **Quote**: An Invoice record with `type: 'quote'`. Has expiry_date, separate numbering (QUO-). Statuses: draft, quoted, accepted, declined, expired, converted.
- **Purchase Order**: An Invoice record with `type: 'purchase_order'`. Has expected_delivery_date, separate numbering (PO-). Statuses: draft, ordered, received, cancelled, converted.
- **Converted Reference**: A `converted_to_uuid` field on the Invoice model linking a quote/PO to its resulting invoice/bill.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A quote can be created, sent, accepted, and converted to an invoice in under 2 minutes.
- **SC-002**: A purchase order can be created, sent, received, and converted to a bill in under 2 minutes.
- **SC-003**: Converted invoices/bills retain 100% of line items, amounts, and contact data from the original quote/PO.
- **SC-004**: Quote and PO number sequences are independent from invoice/bill sequences.
- **SC-005**: Existing invoice and bill functionality is unaffected (zero regressions).
