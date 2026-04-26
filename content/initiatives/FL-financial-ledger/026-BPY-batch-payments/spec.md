---
title: "Feature Specification: Batch Payments & ABA File Export"
---

# Feature Specification: Batch Payments & ABA File Export

**Epic**: 026-BPY
**Created**: 2026-03-14
**Status**: Draft
**Initiative**: FL — MoneyQuest Ledger
**Phase**: 5 (Sprints 17–18)
**Design Direction**: Super Modern

---

## Context

Batch Payments is the AP payment execution engine for MoneyQuest Ledger. When a bookkeeper or accountant has a queue of approved supplier bills, they need to pay them efficiently — selecting multiple bills, reviewing the payment run, and exporting a single ABA file to upload to their online banking portal. This is the standard workflow for Australian businesses paying multiple suppliers at once.

The module extends the existing `BatchPayment` and `BatchPaymentLine` models (already implemented in 005-IAR) with a full multi-step payment workflow UI and ABA file export. A single batch maps to one bank statement line, enabling clean 1:1 reconciliation in 004-BFR.

The ABA (Australian Banking Association) file format (also called DE — Direct Entry) is the standard format accepted by all major Australian banks (Commonwealth, ANZ, Westpac, NAB, Bendigo, etc.) for batch EFT payments. The file contains a descriptive record (header), one detail record per payee, and a total record (footer).

### What We've Already Built (005-IAR backend)

- `BatchPayment` model with uuid, bank_account_id, batch_date, total_amount, payment_count, status (draft/processing/completed/failed), reference, narration
- `BatchPaymentLine` model with invoice_id, amount, reference, status (pending/completed/failed), error_message
- `CreateBatchPayment` action — creates draft batch with lines
- `ProcessBatchPayment` action — iterates lines calling `RecordInvoicePayment` per line, creates consolidated journal entry, updates status
- API routes: `GET/POST /v1/batch-payments`, `GET /v1/batch-payments/{uuid}`, `POST /v1/batch-payments/{uuid}/process`
- Frontend: bills list multi-select → "Make Payment" bulk action → `/bills/pay` entry page → `/bills/pay/summary` → batch detail

### What This Epic Adds

- **ABA file generation** — `GenerateAbaFile` action + `GET /v1/batch-payments/{uuid}/aba` endpoint
- **Planned payment date** — `planned_payment_date` on bills for scheduling
- **"Add Planned Date" bulk action** on bills list
- **Payee banking details** — BSB + account number on contacts for ABA payee records
- **Remittance advice emails** — send PDF remittance to payees after batch processes
- **Batch detail enhancements** — Print Batch PDF, Send Remittance, Mark as Reconciled
- **Bank account ABA settings** — BSB, financial institution code, APCA user ID per bank account

---

## User Scenarios & Testing

### User Story 1 — Multi-Select Bills and Create Batch (Priority: P1)

A bookkeeper selects multiple approved bills from the bills list, clicks "Make Payment", reviews the payment run on a dedicated page showing payee, reference, due date, and payment amount per line, then confirms to create the batch.

**Acceptance Scenarios**:

1. **Given** a bookkeeper is on the bills list with 3 approved bills selected, **When** they click "Make Payment", **Then** they are taken to `/bills/pay` with those 3 bills pre-populated in an editable table
2. **Given** the payment entry page is shown, **When** the bookkeeper changes a payment amount to less than the full balance, **Then** a partial payment is recorded and the bill transitions to "Partial" status
3. **Given** a bill is in "Draft" or "Voided" status, **When** it is selected and "Make Payment" is clicked, **Then** it is excluded from the batch and a toast explains why
4. **Given** the bookkeeper has no bills selected, **When** they click "Make Payment", **Then** the button is disabled or shows a validation error

---

### User Story 2 — Payment Entry Page (Priority: P1)

The payment entry page (`/bills/pay`) mirrors Xero's batch payment UI — a header bar with Pay from / Payment date / Reference, and a table with one row per bill. All amounts are editable. The bookkeeper can remove individual rows before confirming.

**Acceptance Scenarios**:

1. **Given** the payment entry page loads, **When** the bookkeeper views the table, **Then** they see Payee, Reference from bill, Payee reference (editable), Due date, Due amount (original), and Payment amount (editable, defaults to full balance)
2. **Given** the bookkeeper changes a payment amount to 0 for a row, **When** they try to continue, **Then** a validation error is shown ("Amount must be greater than 0")
3. **Given** a row is removed from the table, **When** the bookkeeper clicks "Continue", **Then** only the remaining rows are included in the batch
4. **Given** no bank account is selected, **When** the bookkeeper clicks "Continue to payment summary", **Then** the action is blocked with a validation error

---

### User Story 3 — Payment Summary & Batch Processing (Priority: P1)

After reviewing the batch, the bookkeeper clicks "Finish and view batch" which processes the batch (calls `ProcessBatchPayment`), marks all bill lines as completed, and navigates to the batch detail page.

**Acceptance Scenarios**:

1. **Given** a batch has been created (status: draft), **When** the bookkeeper clicks "Finish and view batch", **Then** the batch is processed, all bill statuses update to Paid (if full payment), and the batch status becomes "Completed"
2. **Given** one line in the batch fails during processing (e.g., bill already paid), **When** processing completes, **Then** the entire batch is rolled back atomically — no payments are recorded, the batch status returns to "Draft", and the failed line shows the specific error message so the bookkeeper can fix and reprocess
3. **Given** a batch is completed, **When** the bookkeeper views the batch detail, **Then** each line shows a green checkmark and the batch shows "Completed" status with completed_at timestamp

---

### User Story 4 — ABA File Generation (Priority: P1)

After a batch is processed, the bookkeeper can download an ABA file to upload to their bank's online banking portal for the actual EFT payments to be made.

**Why this priority**: The ABA file is the bridge between the accounting system and the bank. Without it, bookkeepers must manually enter each payment in online banking. This is the core time-saving feature of batch payments.

**Acceptance Scenarios**:

1. **Given** a completed batch, **When** the bookkeeper clicks "Export Batch File (ABA)", **Then** a valid `.aba` file is downloaded containing: descriptive record (header), one detail record per payee with BSB/account/amount/payee name/reference, and a total record (footer)
2. **Given** a payee contact has no BSB or account number set, **When** generating the ABA file, **Then** that payee is flagged with an error ("Missing banking details") and the file cannot be generated until resolved
3. **Given** the bank account has no APCA user ID configured, **When** the bookkeeper tries to export ABA, **Then** a prompt to configure bank account ABA settings is shown
4. **Given** a valid ABA file is generated, **When** opened in a text editor, **Then** it conforms to the CEMTEX/DE standard: fixed-width records, BSB in NNN-NNN format, amounts in cents (9 chars right-padded), transaction codes (50 for credit), indicator blank/W/X/Y

---

### User Story 5 — Payee Banking Details on Contacts (Priority: P1)

Contacts need BSB and account number fields to be included in ABA file detail records.

**Acceptance Scenarios**:

1. **Given** a contact edit form, **When** the bookkeeper adds BSB "062-000" and account number "12345678", **Then** the values are saved and validated (BSB format NNN-NNN, account number max 9 digits)
2. **Given** a contact has BSB and account number, **When** an ABA file is generated for a batch containing that contact, **Then** the detail record uses those banking details as the credit entry

---

### User Story 6 — Planned Payment Date on Bills (Priority: P2)

Bookkeepers can set a "planned payment date" on bills to schedule when they intend to pay. This feeds into a cash flow forecast and helps prioritise the payment run.

**Acceptance Scenarios**:

1. **Given** a bookkeeper selects multiple bills on the bills list, **When** they click "Add Planned Date" bulk action, **Then** a date picker popover appears and the selected date is saved to all selected bills as `planned_payment_date`
2. **Given** a bill has a planned payment date, **When** viewed on the bills list, **Then** the planned date is shown in a "Planned" column (toggleable via column visibility)
3. **Given** a bill's planned payment date has passed without payment, **When** the bills list loads, **Then** that bill appears in the "Overdue" tab or is highlighted

---

### User Story 7 — Remittance Advice (Priority: P2)

After a batch is processed, the system can send remittance advice emails to each payee, or the bookkeeper can download a PDF remittance for a payee.

**Acceptance Scenarios**:

1. **Given** a completed batch, **When** the bookkeeper clicks "Send Remittance", **Then** a confirmation dialog shows the list of payees and their email addresses, and on confirmation, remittance emails are queued
2. **Given** a contact has no email address, **When** sending remittance, **Then** that payee is listed as "No email on file" and skipped with a warning
3. **Given** "Print Batch PDF" is clicked, **Then** a PDF is generated showing the batch header (Pay from / Date / Reference) and the payee table with amounts

---

### User Story 8 — Bank Account ABA Settings (Priority: P1)

Bank accounts need additional ABA-specific fields: BSB, financial institution code (3-char abbreviation e.g. "CBA", "ANZ", "WBC"), and APCA user ID (numeric, assigned by the bank).

**Acceptance Scenarios**:

1. **Given** a bank account settings form, **When** the bookkeeper fills in BSB, financial institution code, and APCA user ID, **Then** these values are saved and used in ABA file generation
2. **Given** a batch is being exported to ABA, **When** the descriptive record is generated, **Then** it uses the bank account's BSB, institution code, and APCA user ID in the correct fixed-width positions

---

## Data Model

### Existing Models (already built)

```
batch_payments
  id, uuid, workspace_id, bank_account_id, batch_date, total_amount,
  payment_count, status (enum: draft/processing/completed/failed),
  reference, narration, completed_at, created_by, timestamps

batch_payment_lines
  id, batch_payment_id, invoice_id, amount, reference,
  status (enum: pending/completed/failed), error_message, timestamps
```

### New Fields Required

```
invoices (add)
  planned_payment_date  date nullable

contacts (add)
  bsb                   string(7) nullable    -- format NNN-NNN
  bank_account_number   string(9) nullable    -- max 9 digits

bank_accounts (add)
  bsb                   string(7) nullable
  financial_institution string(3) nullable    -- e.g. CBA, ANZ, WBC
  apca_user_id          string(6) nullable    -- numeric, up to 6 chars
```

### ABA File Format (CEMTEX/DE Standard)

```
Type 0 — Descriptive Record (header, 1 per file)
  Position 1:     Record type indicator "0"
  Position 2-8:   BSB (bank-state-branch) of originating account NNN-NNN
  Position 9-17:  Account number (right-justified, blank-filled)
  Position 18:    Sequence number "01"
  Position 19-20: Name of user supplying file (bank abbreviation, 3 chars)
  Position 21-26: APCA user identification number (right-justified, zero-filled)
  Position 27-56: Description of entries (30 chars, blank-padded)
  Position 57-62: Date of processing DDMMYY
  Position 63-120: Blank

Type 1 — Detail Record (1 per payee)
  Position 1:     Record type "1"
  Position 2-8:   BSB of target account NNN-NNN
  Position 9-17:  Account number (right-justified, blank-filled)
  Position 18:    Indicator (blank = normal, W/X/Y = withholding tax variants)
  Position 19-20: Transaction code "50" (credit)
  Position 21-29: Amount in cents (right-justified, zero-filled, 9 chars)
  Position 30-61: Title of account (32 chars, blank-padded)
  Position 62-79: Lodgement reference (18 chars, blank-padded)
  Position 80-87: Trace BSB NNN-NNN (originating account BSB)
  Position 88-96: Trace account number (originating account number)
  Position 97-112: Name of remitter (16 chars, blank-padded)
  Position 113-120: Withholding tax amount (right-justified, zero-filled, 8 chars)

Type 7 — Total Record (footer, 1 per file)
  Position 1:     Record type "7"
  Position 2-8:   BSB "999-999" (file total indicator)
  Position 9-20:  Blank
  Position 21-29: Net total amount (right-justified, zero-filled)
  Position 30-38: Credit total amount (right-justified, zero-filled)
  Position 39-47: Debit total amount (right-justified, zero-filled)
  Position 48-74: Blank
  Position 75-80: Count of type 1 records (right-justified, zero-filled)
  Position 81-120: Blank
```

---

## Architecture

### Backend

- `GenerateAbaFile` action — takes batch UUID, validates all lines have payee banking details, builds ABA string, returns content
- `GET /v1/batch-payments/{uuid}/aba` — streams ABA file as attachment
- `AddPlannedPaymentDate` action — bulk updates `planned_payment_date` on multiple invoices
- `PATCH /v1/bills/planned-date` — bulk endpoint accepting `{ bill_ids: [], planned_payment_date: string }`
- Contact update to include `bsb`, `bank_account_number` in `$fillable` and API resource
- Bank account update to include `bsb`, `financial_institution`, `apca_user_id`
- `SendRemittanceAdvice` action — queues `RemittanceAdviceEmail` Mailable per payee

### Frontend

- `/bills/pay` — payment entry page (built)
- `/bills/pay/summary` — payment summary page (built)
- "Add Planned Date" bulk action on bills list — date popover
- Contacts form — add BSB + account number fields
- Bank account settings — add BSB, institution code, APCA user ID
- Batch detail — "Export Batch File (ABA)" button calls `/aba` endpoint
- Batch detail — "Send Remittance" triggers dialog with payee email list

### Permissions

- `batch_payments.create` — bookkeeper, accountant, owner
- `batch_payments.process` — bookkeeper, accountant, owner
- `batch_payments.export_aba` — bookkeeper, accountant, owner

---

## Dependencies

| Direction | Epic | Relationship |
|-----------|------|-------------|
| **Depends on** | 005-IAR Invoicing & AR/AP | BatchPayment model, ProcessBatchPayment action, bill statuses |
| **Depends on** | 004-BFR Bank Feeds | Batch total maps to single bank statement line for reconciliation |
| **Depends on** | 006-CCM Contacts | Payee banking details (BSB, account number) stored on contacts |
| **Depends on** | 023-EML Email Infrastructure | Remittance advice email delivery |

---

## Out of Scope

- Debit batches (direct debits from customers) — AR batch receipts are future
- ABA file import (parsing incoming ABA files from bank) — covered by 004-BFR
- BECS NPP (New Payments Platform) / PayID — future integration
- International wire transfer (SWIFT) — future

---

## Non-Functional Requirements

- ABA file generation must complete in < 500ms for batches up to 500 lines
- ABA files must pass CBA, ANZ, Westpac, NAB format validation
- Planned payment date bulk update must handle up to 200 bills in a single request
- Remittance emails queued via Laravel Queue — not synchronous

---

## Completion Signals

- [ ] Multi-select bills → Make Payment → `/bills/pay` → create batch
- [ ] ABA file downloads with correct fixed-width format, passes bank validation
- [ ] Contacts have BSB + account number fields, used in ABA generation
- [ ] Bank accounts have BSB + institution + APCA user ID fields
- [ ] Planned payment date bulk action on bills list
- [ ] Send Remittance queues `RemittanceAdviceEmail` per payee
- [ ] Print Batch PDF renders header + payee table
- [ ] Tests: ABA file format validation, batch creation, planned date bulk update, remittance email queuing

---

## Clarifications

### Session 2026-03-14
- Q: Is this a new epic separate from 005-IAR? -> A: Yes — 026-BPY, big enough to stand alone given ABA file complexity
- Q: ABA file format variant? -> A: Standard CEMTEX/DE, all major Australian banks
- Q: Should planned payment date affect bill status? -> A: Not automatically — informational only, used for cash flow forecasting
