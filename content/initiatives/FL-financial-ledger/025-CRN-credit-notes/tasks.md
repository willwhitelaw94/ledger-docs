---
title: "Implementation Tasks: Credit Notes & Allocations"
---

# Implementation Tasks: Credit Notes & Allocations

**Epic**: 025-CRN
**Mode**: AI
**Generated**: 2026-03-14

---

## Phase 1: Backend Foundation (Migration + Model + Event)

- [ ] T001 Migration: Create `credit_note_allocations` table — columns: `id` (bigIncrements), `workspace_id` (unsignedInteger, FK workspaces), `credit_note_id` (unsignedBigInteger, FK invoices), `invoice_id` (unsignedBigInteger, FK invoices), `amount` (bigInteger), `allocated_at` (dateTime), `allocated_by` (unsignedBigInteger, FK users, nullable), `created_at` (timestamp). Indexes: `(workspace_id, credit_note_id)`, `(workspace_id, invoice_id)`. File: `database/migrations/2026_03_14_100001_create_credit_note_allocations_table.php`

- [ ] T002 Model: Create `CreditNoteAllocation` — fillable: workspace_id, credit_note_id, invoice_id, amount, allocated_at, allocated_by. Casts: allocated_at→datetime, amount→integer. Relationships: `creditNote(): BelongsTo(Invoice)`, `invoice(): BelongsTo(Invoice)`, `allocatedByUser(): BelongsTo(User)`, `workspace(): BelongsTo(Workspace)`. File: `app/Models/Tenant/CreditNoteAllocation.php`

- [ ] T003 Update `Invoice` model — add relationships: `creditNoteAllocations(): HasMany(CreditNoteAllocation, 'credit_note_id')`, `allocationsReceived(): HasMany(CreditNoteAllocation, 'invoice_id')`, `sourceInvoice(): BelongsTo(Invoice, 'credit_note_for_uuid', 'uuid')`, `creditNotes(): HasMany(Invoice, 'credit_note_for_uuid', 'uuid')`. Add scopes: `scopeCreditNotes($query)` — `whereIn('type', ['credit_note', 'bill_credit_note'])`, `scopeUnallocated($query)` — credit notes where `amount_due > 0`. Add accessor: `remaining_credit` — alias for `amount_due` (semantic clarity for credit notes). File: `app/Models/Tenant/Invoice.php`

- [ ] T004 [P] Event: Create `CreditNoteAllocated` — extends `ShouldBeStored`. Properties: `workspaceId` (int), `invoiceUuid` (string, target invoice), `amount` (int, cents), `allocatedBy` (int). File: `app/Events/Invoicing/CreditNoteAllocated.php`

- [ ] T005 Update `InvoiceAggregate` — add method `allocateCreditNote(int $workspaceId, string $invoiceUuid, int $amount, int $allocatedBy): self`. Guards: amount > 0, amount <= remaining credit (track via `$allocatedTotal` state rebuilt from `CreditNoteAllocated` events). Records `CreditNoteAllocated` event. Add `applyCreditNoteAllocated(CreditNoteAllocated $event)` to track state. File: `app/Aggregates/InvoiceAggregate.php`

- [ ] T006 Update `InvoiceProjector` — add `onCreditNoteAllocated(CreditNoteAllocated $event)` handler. Creates `CreditNoteAllocation` record. Updates credit note's `amount_paid` += amount, `amount_due` -= amount. If `amount_due == 0`, set status to `Paid`. File: `app/Projectors/InvoiceProjector.php`

## Phase 2: Backend Actions & API

- [ ] T007 Action: Create `CreateCreditNote` — wraps `CreateInvoice`. Parameters: `workspaceId`, `contactId`, `issueDate`, `dueDate`, `lines`, `createdBy`, `sourceInvoiceUuid?` (nullable), `isBillType` (bool, default false). Logic: (1) if sourceInvoiceUuid provided, load source invoice, validate contact matches, validate total <= source invoice's amount_due; (2) set type = `isBillType ? InvoiceType::BillCreditNote : InvoiceType::CreditNote`; (3) delegate to `CreateInvoice::run()` with `creditNoteForUuid: sourceInvoiceUuid`. File: `app/Actions/Invoicing/CreateCreditNote.php`

- [ ] T008 Action: Create `AllocateCreditNote` — parameters: `creditNoteUuid`, `allocations` (array of `['invoice_uuid' => string, 'amount' => int]`), `allocatedBy`. Logic: (1) load credit note, verify type is credit_note or bill_credit_note, verify status is Approved/Sent/PartiallyPaid; (2) load all target invoices, verify same contact_id, verify each is payable (Sent/PartiallyPaid/Overdue), verify each amount <= target invoice's amount_due; (3) verify total allocation amount <= credit note's amount_due; (4) DB::transaction: for each allocation, call `InvoiceAggregate::retrieve($creditNoteUuid)->allocateCreditNote(...)->persist()`; then for each target invoice, call `InvoiceAggregate::retrieve($targetUuid)->recordPayment(amount, now(), 'credit_note', $creditNoteUuid, null, $allocatedBy)->persist()`. File: `app/Actions/Invoicing/AllocateCreditNote.php`

- [ ] T009 Fix `CreateInvoice` contact validation — currently `validateContact()` checks `$contact->isCustomer()` unconditionally. Update to: if type is bill or bill_credit_note → validate `$contact->isSupplier()`; if type is invoice or credit_note → validate `$contact->isCustomer()`. File: `app/Actions/Invoicing/CreateInvoice.php`

- [ ] T010 [P] Form Request: Create `AllocateCreditNoteRequest` — authorize: load credit note via `$this->route('uuid')`, stash on attributes, check `$this->user()->can('recordPayment', $creditNote)`. Rules: `allocations` required array min:1, `allocations.*.invoice_uuid` required uuid, `allocations.*.amount` required integer min:1. File: `app/Http/Requests/Invoice/AllocateCreditNoteRequest.php`

- [ ] T011 [P] Resource: Create `CreditNoteAllocationResource` — fields: id, credit_note_id, invoice_id, invoice_number (from invoice relation), amount, allocated_at, allocated_by. File: `app/Http/Resources/CreditNoteAllocationResource.php`

- [ ] T012 Update `InvoiceResource` — add `credit_note_for_uuid` field. Add `allocations` field: `CreditNoteAllocationResource::collection($this->whenLoaded('creditNoteAllocations'))`. Add `allocations_received` field: `CreditNoteAllocationResource::collection($this->whenLoaded('allocationsReceived'))`. File: `app/Http/Resources/InvoiceResource.php`

- [ ] T013 Update `StoreInvoiceRequest` — expand `type` rule to allow: `in:invoice,credit_note,bill,bill_credit_note`. File: `app/Http/Requests/Invoice/StoreInvoiceRequest.php`

- [ ] T014 Controller: Create `CreditNoteController` — two methods only. (1) `allocate(AllocateCreditNoteRequest $request, string $uuid): JsonResponse` — calls `AllocateCreditNote::run()`, returns 200 with message. (2) `allocatableInvoices(Request $request, string $uuid): AnonymousResourceCollection` — loads credit note, finds invoices where `contact_id` matches, `workspace_id` matches, type matches (invoice for CN, bill for BCN), status in [sent, partially_paid, overdue], `amount_due > 0`, returns `InvoiceResource::collection()`. Authorize with `$this->authorize('view', $creditNote)`. File: `app/Http/Controllers/Api/CreditNoteController.php`

- [ ] T015 Update `InvoiceController::index()` — already filters `whereIn('type', ['invoice', 'credit_note'])`. Ensure `show()` eagerly loads `creditNoteAllocations.invoice` and `allocationsReceived.creditNote` when the invoice is a credit note or has allocations. File: `app/Http/Controllers/Api/InvoiceController.php`

- [ ] T016 [P] Update `BillController::index()` — verify it filters `whereIn('type', ['bill', 'bill_credit_note'])`. Ensure `show()` eagerly loads allocations same as InvoiceController. File: `app/Http/Controllers/Api/BillController.php`

- [ ] T017 Routes: Add credit note routes inside the workspace middleware group. `POST /credit-notes/{uuid}/allocate` → `CreditNoteController@allocate`. `GET /credit-notes/{uuid}/allocatable-invoices` → `CreditNoteController@allocatableInvoices`. File: `routes/api.php`

- [ ] T018 [P] Register `CreditNoteAllocation` in morph map — add `'credit_note_allocation' => CreditNoteAllocation::class` in `AppServiceProvider::boot()`. File: `app/Providers/AppServiceProvider.php`

## Phase 3: Backend Tests

- [ ] T019 Test: Credit note creation from source invoice — creates invoice, creates credit note linked via `credit_note_for_uuid`, verifies CN type, CN number prefix, CN lines match source, CN total <= source amount_due, CN contact matches source. File: `tests/Feature/Api/CreditNoteApiTest.php`

- [ ] T020 Test: Standalone credit note creation — creates credit note without `credit_note_for_uuid`, verifies it works, can be allocated to any invoice for same contact. File: `tests/Feature/Api/CreditNoteApiTest.php`

- [ ] T021 Test: Bill credit note creation — creates bill, creates bill_credit_note, verifies BCN prefix, supplier contact validation works. File: `tests/Feature/Api/CreditNoteApiTest.php`

- [ ] T022 Test: Allocate credit note to single invoice — approve CN, allocate full amount to one invoice, verify invoice amount_paid increased, invoice amount_due decreased, CN amount_due decreased, CN status transitions to Paid when fully allocated. File: `tests/Feature/Api/CreditNoteApiTest.php`

- [ ] T023 Test: Allocate credit note to multiple invoices — approve CN, allocate partial amounts to 2 invoices, verify each invoice updated correctly, CN remains PartiallyPaid until fully allocated. File: `tests/Feature/Api/CreditNoteApiTest.php`

- [ ] T024 Test: Over-allocation guard — try to allocate more than CN's amount_due, expect 422 or aggregate exception. File: `tests/Feature/Api/CreditNoteApiTest.php`

- [ ] T025 Test: Cross-contact allocation guard — try to allocate CN to invoice with different contact_id, expect validation error. File: `tests/Feature/Api/CreditNoteApiTest.php`

- [ ] T026 Test: Allocatable invoices endpoint — verify it returns only same-contact, payable invoices with amount_due > 0, excludes voided/draft/paid invoices. File: `tests/Feature/Api/CreditNoteApiTest.php`

- [ ] T027 Test: Permission checks — verify bookkeeper can create CN, client cannot create CN, approver can approve CN. File: `tests/Feature/Api/CreditNoteApiTest.php`

## Phase 4: Frontend

- [ ] T028 Update `Invoice` type — add `credit_note_for_uuid?: string | null`, `allocations?: CreditNoteAllocation[]`, `allocations_received?: CreditNoteAllocation[]`. Add new type `CreditNoteAllocation`: `{ id: number, credit_note_id: number, invoice_id: number, invoice_number?: string, amount: number, allocated_at: string, allocated_by: number | null }`. File: `frontend/src/types/index.ts`

- [ ] T029 Hook: Create `useCreditNotes` — query key factory `creditNoteKeys`. Hooks: `useCreditNotes(params)` → GET `/invoices` with `type=credit_note` filter (reuse invoice endpoint), `useAllocatableInvoices(uuid)` → GET `/credit-notes/{uuid}/allocatable-invoices`, `useAllocateCreditNote()` → POST `/credit-notes/{uuid}/allocate` (invalidates both invoiceKeys and creditNoteKeys on success). File: `frontend/src/hooks/use-credit-notes.ts`

- [ ] T030 Page: Credit Notes list — at `/invoices/credit-notes`. Reuse sales page pattern (DataTable + StatusTabs + ViewToggle). Columns: Number (CN-prefix, link to detail), Contact, Date, Total, Allocated (total - amount_due), Remaining (amount_due), Status. Status tabs: All, Draft, Approved, Unallocated (sent with amount_due > 0), Partially Allocated, Fully Allocated (paid), Voided. Actions button: "New Credit Note" linking to `/invoices/new?type=credit_note`. File: `frontend/src/app/(dashboard)/invoices/credit-notes/page.tsx`

- [ ] T031 Update invoice create form — accept `type` and `sourceInvoiceUuid` from URL search params (`?type=credit_note&source=<uuid>`). When source UUID provided: fetch source invoice, pre-populate contact (locked), lines (editable), and pass `credit_note_for_uuid` in payload. When type is `credit_note`: change page title to "New Credit Note", change submit button to "Create Credit Note". File: `frontend/src/app/(dashboard)/invoices/new/page.tsx`

- [ ] T032 "Issue Credit Note" button on invoice detail page — show button when invoice status is sent/partial/overdue/paid (any status where voiding isn't possible). Button navigates to `/invoices/new?type=credit_note&source=${invoice.uuid}`. File: `frontend/src/app/(dashboard)/invoices/[uuid]/page.tsx`

- [ ] T033 Allocation panel on credit note detail page — when viewing a credit note (type === 'credit_note' or 'bill_credit_note'): show "Allocations" section below line items. If unallocated balance > 0 and status is approved/sent/partially_paid: show allocation form — fetches allocatable invoices via `useAllocatableInvoices(uuid)`, renders table with checkbox + amount input per invoice, "Allocate" submit button. Below form: show existing allocations table (invoice number, amount, date). File: `frontend/src/app/(dashboard)/invoices/[uuid]/page.tsx`

- [ ] T034 Update invoice detail page — show "Allocations Received" section when `allocations_received` has entries. Table: Credit Note #, Amount, Date. Link credit note number to its detail page. File: `frontend/src/app/(dashboard)/invoices/[uuid]/page.tsx`

- [ ] T035 Navigation: Add "Credit Notes" sub-item under Invoices nav. Update primaryNav: change Invoices entry to include `items`: `[{ title: "Sales Invoices", url: "/invoices/sales" }, { title: "Credit Notes", url: "/invoices/credit-notes" }]`. File: `frontend/src/lib/navigation.ts`

## Phase 5: Polish

- [ ] T036 TypeScript verification — run `cd frontend && npx tsc --noEmit`, fix any type errors.

- [ ] T037 [P] Pint formatting — run `vendor/bin/pint --dirty` on all changed PHP files.

- [ ] T038 [P] Full test suite — run `php artisan test --compact`, verify no regressions. Verify credit note tests pass: `php artisan test --filter=CreditNote`.

---

## Summary

| Metric | Count |
|--------|-------|
| **Total tasks** | 38 |
| **Phase 1 (Foundation)** | 6 |
| **Phase 2 (Actions & API)** | 12 |
| **Phase 3 (Tests)** | 9 |
| **Phase 4 (Frontend)** | 8 |
| **Phase 5 (Polish)** | 3 |
| **Parallel opportunities** | T004, T010, T011, T016, T018, T037, T038 |
| **MVP scope (P1 stories)** | T001–T035 (US1–US4, US8) |
| **P2 stories (US5–US7)** | Covered by existing tasks — standalone CN via T007/T031, refund via existing RecordPayment, aging via existing aging endpoint |
