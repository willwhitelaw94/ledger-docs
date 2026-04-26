---
title: "Implementation Plan: Credit Notes & Allocations"
---

# Implementation Plan: Credit Notes & Allocations

**Spec**: [spec.md](./spec.md)
**Created**: 2026-03-14
**Status**: Draft

## Technical Context

### Technology Stack
- Backend: Laravel 12, PHP 8.4, Spatie Event Sourcing v7
- Frontend: Next.js 16, React 19, TypeScript, TanStack Query v5
- Database: SQLite (local dev), single-database multi-tenancy
- Auth: Sanctum cookie SPA + Spatie Permission teams mode

### Existing Infrastructure (60% done)
| Component | Status | Notes |
|-----------|--------|-------|
| `InvoiceType::CreditNote` / `BillCreditNote` | Done | Enum with `isBillType()`, `isInvoiceType()` helpers |
| `InvoiceAggregate::createInvoice()` | Done | Accepts `creditNoteForUuid` parameter |
| `InvoiceProjector` numbering | Done | Generates `CN-000001`, `BCN-000001` |
| `Invoice` model `credit_note_for_uuid` | Done | Column + fillable |
| `InvoiceController::index()` | Done | Already filters `whereIn('type', ['invoice', 'credit_note'])` |
| `CreateInvoice` action | Done | Accepts `type` and `creditNoteForUuid` params |
| Frontend `credit_note_prefix` setting | Done | In workspace invoice settings |
| Frontend type definitions | Done | `credit_note` type in hooks |
| Invoice approval → GL entry | **Not done** | No JE created on approval for invoices OR credit notes |
| Allocation model | **Not done** | No table or logic |
| Credit note creation action | **Not done** | No dedicated action to copy lines from source invoice |
| Credit note API endpoints | **Not done** | No dedicated routes |
| Credit note frontend pages | **Not done** | No UI |

### Dependencies
- Existing `InvoiceAggregate` + 5 events (Created, Approved, Sent, PaymentReceived, Voided)
- Existing `InvoiceProjector` with numbering
- Existing `CreateInvoice` action with line normalization
- Existing invoice permissions (`invoice.create`, `invoice.approve`, etc.)
- Existing `InvoiceController` with type filtering

### Constraints
- Credit notes use the SAME `Invoice` model with type discrimination — no separate model
- Credit note totals stored as positive integers (negation is display-only)
- Allocation must be same-contact only
- Credit note currency must match source invoice currency
- Event sourcing: allocation is an event on the credit note aggregate, payment is an event on the invoice aggregate

### Pre-Check Notes
1. **Invoice approval has no GL entry** — discovered during research. The `ApproveInvoice` action only calls `aggregate->approve()->persist()`, and the projector only updates status. No journal entry is created. This is a known gap but OUT OF SCOPE for this epic — credit notes will follow the same pattern (approval = status change only, no JE). GL posting for invoices/credit notes should be a separate epic.
2. **Contact type validation** — `CreateInvoice` validates customer-only contacts. Bill credit notes need supplier contacts. The existing action checks `$contact->isCustomer()` which will block bill credit notes. Need to make contact type validation type-aware.

## Design Decisions

### Data Model

#### CreditNoteAllocation (NEW TABLE)
| Column | Type | Constraints |
|--------|------|-------------|
| id | bigint | PK, auto-increment |
| workspace_id | int | FK → workspaces, indexed |
| credit_note_id | int | FK → invoices (type=credit_note) |
| invoice_id | int | FK → invoices (target invoice) |
| amount | int | Positive integer (cents) |
| allocated_at | datetime | |
| allocated_by | int | FK → users |
| created_at | timestamp | |

**Indexes**: `(workspace_id, credit_note_id)`, `(workspace_id, invoice_id)`

#### Invoice Model Changes
- Add `remaining_credit` computed accessor: `total - amount_paid` (for credit notes, `amount_paid` tracks allocations + refunds)
- Add `creditNoteAllocations()` HasMany relationship
- Add `allocationsReceived()` HasMany relationship (from target invoice side)
- Add `sourceCreditNotes()` relationship via `credit_note_for_uuid`
- Add scopes: `scopeCreditNotes()`, `scopeUnallocated()`

### New Events
| Event | Aggregate | Payload |
|-------|-----------|---------|
| `CreditNoteAllocated` | InvoiceAggregate (credit note) | workspaceId, invoiceId, amount, allocatedBy |

No new `CreditNoteRefunded` event needed — refunds use the existing `InvoicePaymentReceived` event on the credit note aggregate (a refund reduces `amount_due` just like a payment).

### API Contracts

All credit note endpoints use the existing `InvoiceController` with type discrimination. New endpoints:

| Method | Path | Action | Description |
|--------|------|--------|-------------|
| POST | `/invoices` | store | Create credit note (type=credit_note, credit_note_for_uuid optional) |
| POST | `/invoices/{uuid}/approve` | approve | Approve credit note (same as invoice) |
| POST | `/credit-notes/{uuid}/allocate` | allocate | **NEW** — Allocate credit to invoice(s) |
| GET | `/credit-notes/{uuid}/allocatable-invoices` | allocatableInvoices | **NEW** — List outstanding invoices for same contact |

Credit note CRUD (list, show, update, void) uses existing invoice endpoints with `type` filter.

### UI Components

| Component | Location | Description |
|-----------|----------|-------------|
| Credit Note Create Form | Reuse invoice form | Same line item form, pre-populated from source invoice |
| "Issue Credit Note" button | Invoice detail page | Navigates to create form with lines pre-filled |
| Allocation Panel | Credit note detail page | Shows outstanding invoices, input amounts, allocate button |
| Credit Notes List | `/invoices/credit-notes` | Filtered invoice list (type=credit_note) |
| Allocation History | Credit note + invoice detail | Shows allocation records |

## Implementation Phases

### Phase 1: Backend Foundation (Migration + Model)
- Create `credit_note_allocations` migration
- Create `CreditNoteAllocation` model with relationships
- Add relationships and scopes to `Invoice` model
- Create `CreditNoteAllocated` event
- Update `InvoiceAggregate` with `allocateCreditNote()` method + guards
- Update `InvoiceProjector` to handle `CreditNoteAllocated`

### Phase 2: Backend Actions & API
- Create `CreateCreditNote` action (wraps `CreateInvoice` with line-copying from source invoice)
- Create `AllocateCreditNote` action (records allocation on CN aggregate, records payment on invoice aggregate)
- Fix `CreateInvoice` contact validation for bill types (supplier check)
- Add `CreditNoteController` with allocate + allocatable-invoices endpoints
- Add `CreditNoteAllocationResource`
- Add routes
- Update `InvoiceResource` to include allocation data for credit notes

### Phase 3: Backend Tests
- Test credit note creation (from invoice + standalone)
- Test allocation (single invoice, multiple invoices, over-allocation guard)
- Test bill credit note creation
- Test allocation reduces invoice amount_due
- Test fully allocated CN transitions to Paid
- Test permissions (bookkeeper can create, client cannot)

### Phase 4: Frontend
- Add `useCreditNotes` hook (filtered `useInvoices` + allocation mutations)
- "Issue Credit Note" button on invoice detail page
- Credit note create page (pre-populated lines from source)
- Allocation panel on credit note detail page
- Credit notes list page at `/invoices/credit-notes`
- Update invoice detail to show received allocations

### Phase 5: Polish
- TypeScript verification (`npx tsc --noEmit`)
- Pint formatting (`vendor/bin/pint --dirty`)
- Full test suite regression check

## Architecture Decisions

### Why not a separate CreditNote model?
Credit notes ARE invoices with a different type. They share: line items, contacts, status flow, numbering, permissions, and event sourcing. A separate model would duplicate all of this. Type discrimination on the existing `Invoice` model is cleaner — Xero, QuickBooks, and MYOB all do this.

### Why allocations are events on the CN aggregate (not the invoice aggregate)?
The credit note "owns" the allocation — it's the CN's balance being reduced. The target invoice receives a payment (via `InvoicePaymentReceived`), which is the existing pattern. This keeps the invoice aggregate simple and puts allocation business logic where it belongs.

### Why no GL entries on approval (yet)?
The existing invoice approval doesn't create journal entries either. Adding GL posting for credit notes without doing it for invoices would be inconsistent. Both should be done together in a future "Invoice GL Posting" epic. For now, credit notes follow the same pattern as invoices: approval = status change.

### Contact validation for bill types
`CreateInvoice` currently validates `$contact->isCustomer()`. For bill credit notes, we need `$contact->isSupplier()`. Rather than adding conditional logic to `CreateInvoice`, the new `CreateCreditNote` action will handle contact validation itself and pass through to `CreateInvoice` with validation already done.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Over-allocation (race condition) | Low | High | DB transaction + aggregate guard in `AllocateCreditNote` |
| Cross-contact allocation | Low | High | Guard in aggregate + validation in action |
| Existing invoice tests break | Low | Med | Credit notes extend, don't modify existing code paths |
| No GL entries confuses accountants | Med | Med | Clear status labels; defer to GL posting epic |

## Next Steps

1. Run `/speckit-tasks` to generate tasks.md
2. Implement Phase 1-5
3. Run `/trilogy-dev-handover` (Gate 4: Code Quality)
