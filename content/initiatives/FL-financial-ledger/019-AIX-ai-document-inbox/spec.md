---
title: "Feature Specification: AI Document Inbox"
---

# Feature Specification: AI Document Inbox

**Feature Branch**: `019-AIX-ai-document-inbox`
**Created**: 2026-03-14
**Status**: Draft

## Overview

Each workspace gets a unique, permanent email address (e.g. `acme@inbox.moneyquest.app`). Anyone — suppliers, staff, the business owner — can forward or email financial documents to this address. The AI reads each document, extracts structured data, cross-references existing contacts and accounts, and creates draft ledger documents for a human to review and confirm before anything is posted.

The result is a frictionless document capture channel: no manual data entry, no special apps — just forward the email.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Each Workspace Gets a Unique Inbox Address (Priority: P1)

A business owner sets up their workspace and immediately receives a dedicated inbox email address. They copy this address and share it with their suppliers: "Please send all invoices to this address." From that point forward, supplier invoices arrive in the ledger automatically without any manual uploading.

**Why this priority**: This is the foundational capability. Without a unique, stable address per workspace, no other part of the inbox works.

**Independent Test**: Create a workspace and verify a unique inbox address is generated. Send a test email to that address and verify it is received and associated with the correct workspace.

**Acceptance Scenarios**:

1. **Given** a workspace is created, **When** the owner views workspace settings, **Then** a unique inbox email address is displayed (e.g. `acme-co@inbox.moneyquest.app`).
2. **Given** the inbox address is displayed, **When** the owner copies and shares it with a supplier, **Then** emails sent to that address arrive in the workspace's inbox queue.
3. **Given** two different workspaces exist, **When** each receives their inbox address, **Then** the addresses are different and emails route to the correct workspace independently.
4. **Given** an email is sent to a workspace inbox address, **When** the email arrives, **Then** the sender's email address and the document attachments are both captured.

---

### User Story 2 — AI Processes Incoming Documents and Extracts Data (Priority: P1)

A supplier emails their invoice PDF to the workspace inbox address. Within minutes, the AI has read the PDF, identified it as a supplier invoice, extracted the supplier name, invoice number, line items, amounts, GST, and due date — and created a draft bill in the ledger pre-filled with all of this information.

**Why this priority**: Without AI extraction, the inbox is just a file store. The extraction is what eliminates manual data entry.

**Independent Test**: Send a standard supplier invoice PDF to the inbox and verify the resulting draft bill contains correct supplier name, total amount, due date, and at least one line item.

**Acceptance Scenarios**:

1. **Given** a supplier invoice PDF is emailed to the inbox, **When** the AI processes it, **Then** a draft bill is created with supplier, invoice number, issue date, due date, line items, and total amount pre-filled.
2. **Given** the supplier already exists as a contact in the workspace, **When** the AI processes the document, **Then** the draft bill is linked to the existing contact — not a duplicate.
3. **Given** the supplier does not exist as a contact, **When** the AI processes the document, **Then** a suggested new contact is created in draft state alongside the draft bill for the user to confirm.
4. **Given** a receipt image (JPG/PNG) is attached rather than a PDF, **When** the AI processes it, **Then** data is still extracted and a draft document is created.
5. **Given** the AI cannot confidently determine the document type, **When** processing completes, **Then** the document is flagged as "needs review" with the raw extracted text visible, rather than silently failing.

---

### User Story 3 — Review Queue: Confirm or Reject AI Drafts (Priority: P1)

A bookkeeper opens the `/inbox` page each morning and works through the AI-generated drafts. Each item shows the original document alongside the AI's interpretation. The bookkeeper can confirm (which posts the draft to the ledger), edit fields before confirming, or reject (which archives the item without posting).

**Why this priority**: Human review is non-negotiable before anything posts to the ledger. The review queue is the trust layer between AI extraction and the books.

**Independent Test**: Seed the inbox queue with 3 processed items. Verify the bookkeeper can confirm one (creating a real bill), edit-then-confirm another, and reject the third — and that all three transition to the correct state.

**Acceptance Scenarios**:

1. **Given** a processed inbox item is awaiting review, **When** the bookkeeper opens it, **Then** they see the original document (PDF/image) on one side and the AI's extracted fields on the other.
2. **Given** the bookkeeper reviews the extracted fields and they are correct, **When** they click "Confirm", **Then** the draft bill/invoice is created in the ledger and the inbox item is marked as processed.
3. **Given** the bookkeeper wants to correct a field before confirming, **When** they edit the field inline and click "Confirm", **Then** the corrected values are used to create the ledger document.
4. **Given** the bookkeeper determines the document is not relevant, **When** they click "Reject", **Then** the item is archived and no ledger document is created.
5. **Given** the inbox has 10 items, **When** the bookkeeper confirms item 3, **Then** the queue advances automatically to item 4 without returning to the list.

---

### User Story 4 — Manual Upload as Alternative to Email (Priority: P2)

A user has a document on their desktop that didn't arrive by email. They drag and drop it onto the `/inbox` page and it enters the same AI processing queue as emailed documents — no special treatment needed.

**Why this priority**: Email forwarding is the primary channel but not always available. Manual upload provides a fallback without requiring a separate workflow.

**Independent Test**: Drag a PDF onto the inbox upload zone, verify it appears in the queue and the AI processes it identically to an emailed document.

**Acceptance Scenarios**:

1. **Given** the user is on the `/inbox` page, **When** they drag a PDF or image onto the upload zone, **Then** the document enters the processing queue and the AI processes it.
2. **Given** the user uploads a document manually, **When** the AI produces a draft, **Then** the draft appears in the review queue alongside emailed documents with no visual distinction.
3. **Given** the user attempts to upload an unsupported file type (e.g. `.xlsx`, `.docx`), **When** the upload is attempted, **Then** a clear error message is shown and the file is not added to the queue.

---

### User Story 5 — Inbox Address Displayed in Settings (Priority: P2)

Workspace owners and accountants can find, copy, and share the workspace inbox address from the workspace settings page. They can also see a QR code or copyable link for sharing with suppliers.

**Why this priority**: If users can't easily find and share the address, adoption stalls. Settings is the natural home for this.

**Independent Test**: Navigate to workspace settings and verify the inbox address is shown with a one-click copy button.

**Acceptance Scenarios**:

1. **Given** the user is on the workspace settings page, **When** they look for the inbox address, **Then** it is displayed prominently with a copy-to-clipboard button.
2. **Given** the user clicks the copy button, **When** they paste elsewhere, **Then** the full inbox email address is pasted correctly.
3. **Given** the workspace inbox address is displayed, **When** the owner shares it with a supplier, **Then** emails from any sender to that address are accepted and processed.

---

### Edge Cases

- What if the same invoice is emailed twice? Duplicate detection should flag the second as a potential duplicate based on supplier + invoice number + amount.
- What if an email has no attachments — just body text (e.g. a remittance advice in the email body)? The AI should attempt to extract data from the email body as well as attachments.
- What if an email has multiple attachments? Each attachment should be processed as a separate inbox item.
- What if the AI extraction takes longer than expected? The item should show a "Processing…" state in the queue and update when complete — the user should not have to refresh.
- What if a confirmed bill is later found to be a duplicate? Standard ledger reversal processes apply — the inbox does not add special handling for post-confirmation errors.
- What file types are supported? At minimum: PDF, JPG, PNG. Stretch: HEIC (iPhone photos of receipts).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each workspace MUST have a unique, permanent inbox email address generated at workspace creation time.
- **FR-002**: The inbox email address MUST be displayed in workspace settings with a one-click copy action.
- **FR-003**: Emails sent to the workspace inbox address MUST be received and associated with the correct workspace, regardless of the sender's email address.
- **FR-004**: Attachments from incoming emails MUST be extracted and individually queued for AI processing (one inbox item per attachment).
- **FR-005**: The AI MUST attempt to classify each document into one of the following types: supplier invoice (→ draft bill), receipt (→ suggest match to unreconciled bank transaction), customer payment remittance (→ link to existing outstanding invoice), bank statement (→ store as attachment, no draft created), or unknown (→ flag for manual review).
- **FR-005a**: For receipts, the AI MUST extract amount, date, and merchant name and attempt to match against unreconciled bank transactions within ±3 days and ±5% of the extracted amount.
- **FR-005b**: For customer payment remittances, the AI MUST extract payment amount, reference, and payer name and attempt to link to an outstanding invoice by contact name or reference number.
- **FR-006**: For supplier invoice documents, the AI MUST extract: supplier name, invoice number, issue date, due date, line item descriptions, quantities, unit prices, tax amounts, and total amount.
- **FR-007**: When a supplier name matches an existing contact, the AI MUST link the draft document to that contact automatically.
- **FR-008**: When a supplier name does not match any existing contact, the AI MUST create a suggested new contact in draft state for the user to confirm.
- **FR-009**: The `/inbox` page MUST display all pending inbox items in a review queue, ordered by received date ascending (oldest first).
- **FR-010**: Each inbox item in the review queue MUST show: document type classification, sender, received date, AI confidence level, and extracted total amount.
- **FR-010a**: Inbox items with AI confidence below 80% MUST be visually flagged as "Needs Review" in the queue and the review detail view MUST highlight which fields have low confidence.
- **FR-011**: The review detail view MUST display the original document (rendered PDF or image) alongside the AI-extracted fields in an editable form.
- **FR-012**: Users MUST be able to confirm an inbox item, which creates the corresponding draft ledger document (bill, etc.) and marks the inbox item as processed.
- **FR-013**: Users MUST be able to edit any AI-extracted field before confirming.
- **FR-014**: Users MUST be able to reject an inbox item, which archives it without creating any ledger document.
- **FR-015**: The system MUST support manual document upload via drag-and-drop or file picker on the `/inbox` page, processing uploads identically to emailed documents.
- **FR-016**: Supported file types MUST include at minimum: PDF, JPG, PNG.
- **FR-017**: The system MUST detect potential duplicate documents (same supplier + invoice number + amount) and flag them in the review queue before confirmation.
- **FR-018**: The inbox MUST have its own separate navigation badge showing the count of pending-review inbox items. This badge is independent of the `018-ITR` attention queue badge — the two are distinct signals (new documents arrived vs. ledger actions required).
- **FR-019**: Inbox items in "Processing" state MUST update to show extracted data without requiring a page refresh.
- **FR-020**: The email body text MUST be processed by the AI when no attachment is present, to handle remittance advices or simple invoice emails.
- **FR-021**: Confirmed and rejected inbox items MUST be retained and viewable for 12 months from their received date, after which they MAY be purged.
- **FR-022**: Access to the `/inbox` page MUST be restricted to workspace roles: owner, accountant, and bookkeeper. Auditor and client roles MUST NOT access or action inbox items.

### Key Entities

- **Inbox Item**: Represents a single document received via email or manual upload. Has a status lifecycle: `received` → `processing` → `pending_review` → `confirmed` / `rejected`. Carries: source (email/upload), sender, received_at, raw file, document type classification, extracted data payload, AI confidence score, and linked ledger document (once confirmed).
- **Inbox Address**: The unique email address assigned to a workspace. Permanent and immutable after generation.
- **Extracted Data**: The structured output of AI processing — fields vary by document type (invoice fields differ from receipt fields). Stored alongside the inbox item so users can review what the AI found.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A supplier invoice emailed to the workspace inbox address produces a ready-to-review draft bill within 60 seconds of the email being sent.
- **SC-002**: AI extraction correctly identifies supplier name, total amount, and due date on at least 85% of standard AU/NZ supplier invoice PDFs without user correction.
- **SC-003**: Bookkeepers can review and confirm a correctly-extracted inbox item in under 30 seconds.
- **SC-004**: Duplicate detection prevents the same invoice being posted twice in 100% of cases where supplier + invoice number + amount match exactly.
- **SC-005**: Manual upload produces an identical processing outcome to email delivery — verified for PDF, JPG, and PNG formats.
- **SC-006**: Zero inbox items from one workspace are visible to users of another workspace.

---

## Clarifications

### Session 2026-03-14

- Q: Output actions for non-invoice document types? → A: Receipts suggest matching to unreconciled bank transactions (±3 days, ±5% amount); remittances link to existing outstanding invoices by contact/reference; bank statements stored as attachment only; unknown types flagged for manual review.
- Q: AI confidence threshold for mandatory human review? → A: 80% — items below 80% confidence are flagged "Needs Review"; individual low-confidence fields are highlighted in the review detail view.
- Q: Inbox item retention period? → A: 12 months — confirmed and rejected items retained for 12 months from received date, aligning with AU/NZ financial record-keeping requirements.
- Q: Which roles can access the inbox? → A: Owner, accountant, and bookkeeper — these roles own the document creation workflow. Approver, auditor, and client roles are excluded.
- Q: Inbox nav badge — separate or combined with 018-ITR badge? → A: Separate badges — inbox badge counts pending-review documents; intray badge counts outstanding ledger actions. Different urgency signals, should not be merged.
