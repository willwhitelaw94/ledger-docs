---
title: "Feature Specification: Document Governance & Signing"
---

# Feature Specification: Document Governance & Signing

**Feature Branch**: `059-DGS-document-governance-signing`
**Created**: 2026-03-20
**Status**: Draft
**Epic**: 059-DGS
**Initiative**: FL — Financial Ledger Platform
**Effort**: L (3-4 sprints)
**Depends On**: 012-ATT (complete), 056-FEX (in progress), 027-PMV (complete)

### Out of Scope

- **Full PDF annotation** — v1 is view-only; no in-document text fields, checkboxes, or drag-and-drop signature placement
- **Witness / co-signing order** — all signatories sign independently in any order; sequential signing deferred
- **Non-PDF formats** — only PDF documents supported; Word/image conversion deferred
- **Wet signature upload** — no scan-and-attach workflow; digital signatures only
- **Advanced template editor** — merge fields are simple string replacement; no WYSIWYG document builder
- **External (non-platform) signing** — signatories must have a MoneyQuest account or accept an invitation to create one
- **Qualified digital signatures (PKI)** — v1 uses consent-based electronic signatures per Australian Electronic Transactions Act 1999; PKI/certificate-based signing deferred

---

## Overview

Practices need clients to sign governance documents (engagement letters, authority to act, privacy consents, year-end sign-offs) but currently rely on email attachments, wet signatures, or third-party tools like DocuSign. This epic delivers an in-platform document signing workflow: practices upload PDFs, select signatories, and track signing status across all clients from a central governance dashboard. Clients review documents inline and sign with typed name + consent confirmation. Every action is audit-logged with IP, timestamp, and user agent. A signature certificate page is appended to the final PDF as an immutable legal record.

---

## User Stories

### Practice Manager

- **US-01**: As a practice manager, I want to upload a PDF and send it to one or more clients for signing, so I can manage governance documents without leaving the platform.
- **US-02**: As a practice manager, I want a central dashboard showing all documents across all clients with their signing status, so I can see what is outstanding at a glance.
- **US-03**: As a practice manager, I want to create reusable document templates with merge fields, so I can generate personalised engagement letters without re-uploading each time.
- **US-04**: As a practice manager, I want to bulk-send a template to multiple clients at once, so I can distribute annual engagement letters efficiently.
- **US-05**: As a practice manager, I want to set expiry dates on documents and send automated reminders, so clients are prompted to sign without manual follow-up.
- **US-06**: As a practice manager, I want to download a signed PDF with an appended signature certificate, so I have a legally defensible record.
- **US-07**: As a practice manager, I want to view a full audit trail for any document, so I can prove who viewed and signed it, when, and from where.

### Practice Staff (Accountant / Bookkeeper)

- **US-08**: As a practice staff member, I want to send documents for signing on behalf of the practice, so the manager does not become a bottleneck.
- **US-09**: As a practice staff member, I want to resend reminders for overdue documents, so I can follow up directly.

### Client User

- **US-10**: As a client, I want to receive a notification when a document requires my signature, so I know action is needed.
- **US-11**: As a client, I want to view the document inline in my browser without downloading it, so I can review it quickly.
- **US-12**: As a client, I want to sign a document by typing my name and confirming consent, so I can complete signing in under 30 seconds.
- **US-13**: As a client, I want to decline a document with a reason, so I can communicate objections without email.
- **US-14**: As a client, I want to see all documents awaiting my signature in one place, so I do not miss anything.

---

## Functional Requirements

### FR1: Signing Document Model & Lifecycle

- **FR1.1**: A signing document record tracks: practice_id, workspace_id (target client workspace), title, description, file_path (original PDF), status, created_by, sent_at, expires_at, completed_at, cancelled_at.
- **FR1.2**: Document lifecycle states: `draft` -> `sent` -> `completed` | `expired` | `cancelled`.
- **FR1.3**: A document moves to `completed` when ALL signatories have signed.
- **FR1.4**: A document moves to `expired` when `expires_at` passes and not all signatories have signed.
- **FR1.5**: A practice user with `signing-document.cancel` permission can cancel a document at any time before completion (moves to `cancelled`). Only `owner` and `manager` roles may cancel; accountants and bookkeepers must escalate. A document in `sent` status where at least one signatory has signed can still be cancelled (the partial signatures are preserved in the audit trail but the document is no longer actionable).
- **FR1.6**: Signed documents are **immutable** — cannot be modified, re-sent, or deleted after any signatory has signed. Immutability is enforced at the Action layer: `UpdateSigningDocument` checks for any signatory with `status = signed` and throws `DomainException` if found. The `SoftDeletes` trait is NOT used on `SigningDocument` — documents are never deleted, only cancelled.
- **FR1.7**: Each document has a UUID used in URLs and API references (never expose integer IDs). The model uses `getRouteKeyName()` returning `'uuid'` for route model binding, consistent with the existing `Notification` model pattern.
- **FR1.8**: If a signatory declines, the document remains in `sent` status (other signatories can still sign). A document only has a `declined` status in the StatusTabs as a virtual filter — it matches documents where ANY signatory has declined but the document is not yet completed/cancelled/expired. The `signing_documents.status` column never stores `declined`.

### FR2: Practice Document Upload & Send

- **FR2.1**: Practice user uploads a PDF (max 20MB, matching `Attachment::MAX_FILE_SIZE_KB = 20480`). Only `application/pdf` MIME type accepted (not the full `Attachment::ALLOWED_MIMES` list). Files are stored at `signing-documents/{practice_id}/{uuid}.pdf` on the configured filesystem disk, following the `UploadAttachment` action's pattern of `Storage::disk($disk)->put()`.
- **FR2.2**: Practice user adds a title, optional description, and selects one or more signatories (minimum 1, maximum 10).
- **FR2.3**: Signatories can be: (a) users with access to the target workspace, or (b) contacts on the target workspace (matched by email — must have an email address). Contact-based signatories who do not have a MoneyQuest account receive an invitation email to register. Once they register and the contact record is linked to their user account, the `signing_document_signatories.user_id` is backfilled so they can access the signing flow.
- **FR2.4**: Practice user optionally sets an expiry date (default: 30 days from send).
- **FR2.5**: On send, document status moves from `draft` to `sent`, `sent_at` is recorded, and notifications are dispatched to all signatories.
- **FR2.6**: Practice user can save a document as draft without sending.
- **FR2.7**: Practice user can add/remove signatories while document is in `draft` status only.

### FR3: Client Signing Experience

- **FR3.1**: Client accesses signing via: (a) email notification link, or (b) `/documents/signing` page in their dashboard.
- **FR3.2**: Document is rendered inline using react-pdf (PDF.js-based). View-only — no editing or annotation.
- **FR3.3**: Client must scroll through or view the entire document before the sign button becomes active (basic read-confirmation). For multi-page PDFs, the client must navigate to the last page. For single-page PDFs, the document must be scrolled into view for at least 3 seconds. This is a UX gate only — not enforced server-side (the `POST /sign` endpoint does not verify scroll state, but `viewed_at` must be set before signing is permitted).
- **FR3.4**: After reviewing, client sees the signature capture panel below the document.
- **FR3.5**: On signing, the system records: signatory user_id, timestamp (UTC), IP address, user agent string, and signature data.
- **FR3.6**: Client can decline the document with a required reason (free text, max 500 chars). Decline notification sent to the practice.
- **FR3.7**: Once signed, the client sees a confirmation screen with the signed timestamp and can download the signed PDF.

### FR4: Signature Capture Methods

- **FR4.1**: **Primary method — Typed signature**: Client types their full legal name into a text input, checks an "I agree" consent checkbox with the text: _"I, [typed name], confirm that I have read and understood this document and agree to its terms. I acknowledge this constitutes my electronic signature under the Electronic Transactions Act 1999 (Cth)."_ Then clicks "Sign Document".
- **FR4.2**: **Optional method — Drawn signature**: Canvas-based signature pad where the client draws their signature with mouse/touch. Stored as a base64-encoded PNG (maximum 200KB after encoding — canvas is capped at 400x150px to keep payload size reasonable). Displayed on the signature certificate. On mobile, the signature pad renders full-width with landscape orientation hint. The drawn signature is sent inline in the JSON payload (not as a file upload) to keep the signing action atomic.
- **FR4.3**: Both methods record the same audit metadata (IP, timestamp, user agent).
- **FR4.4**: The typed name must match the signatory's name on record (case-insensitive comparison). If it does not match, show a warning but allow signing (people use different name forms).

### FR5: Practice Governance Dashboard

- **FR5.1**: Located at `/practice/documents` — central view of all signing documents across all connected workspaces.
- **FR5.2**: StatusTabs for filtering: All, Draft, Awaiting Signature, Completed, Expired, Declined, Cancelled. Note: `Declined` is a virtual status — the counts endpoint calculates it as documents in `sent` status where at least one signatory has `status = declined`. The `signing_documents.status` column does not store `declined` (see FR1.8).
- **FR5.3**: Each row shows: document title, client workspace name, signatory count (signed/total), status, sent date, expiry date.
- **FR5.4**: Click a row to open document detail: PDF preview, signatory list with individual statuses, audit trail timeline, actions (resend reminder, cancel, download signed copy).
- **FR5.5**: Counts endpoint for StatusTabs: `GET /api/v1/practice/signing-documents/counts`.
- **FR5.6**: Search by document title or client workspace name.
- **FR5.7**: Sort by: sent date (default), expiry date, title, status.

### FR6: Document Templates & Merge Fields

- **FR6.1**: Practice creates templates at `/practice/settings/document-templates`.
- **FR6.2**: A template has: name, category (engagement, privacy, authority, compliance, other), file_path (PDF with merge field placeholders), merge_fields (JSON array of field names found in the document).
- **FR6.3**: Supported merge fields (simple string replacement in PDF text layer):
  - `{{client_name}}` — workspace entity name
  - `{{practice_name}}` — practice firm name
  - `{{date}}` — current date (DD/MM/YYYY)
  - `{{financial_year}}` — e.g., "2025-26"
  - `{{workspace_name}}` — workspace display name
  - `{{abn}}` — workspace ABN
  - `{{signatory_name}}` — individual signatory's name (populated per signatory)
- **FR6.4**: When generating a document from a template, the system replaces merge fields and produces a new PDF stored as the signing document's file. Merge field replacement operates on the PDF text layer using a PHP PDF library (e.g., FPDI + FPDF or equivalent). If a merge field placeholder exists in the template but no value is available (e.g., workspace has no ABN), the placeholder is replaced with an empty string. Validation: the system logs a warning if unrecognised `{{...}}` patterns remain in the generated PDF.
- **FR6.5**: Templates can be updated or archived. Archiving prevents new use but does not affect previously generated documents. When a template PDF file is updated (replaced), the old file is preserved and a new `file_path` is written. Previously generated signing documents retain their own copy of the PDF (generated at send time), so template updates never retroactively change sent documents.
- **FR6.6**: Template categories are used for filtering in the template library and when selecting a template for a new document.

### FR7: Bulk Send

- **FR7.1**: From the governance dashboard, practice user selects "Bulk Send" -> chooses a template -> selects target workspaces (multi-select from connected workspaces).
- **FR7.2**: For each selected workspace, the system generates a personalised document from the template (merge fields populated per workspace).
- **FR7.3**: Default signatory for bulk send: the workspace owner. Practice user can override per workspace before confirming.
- **FR7.4**: Bulk send creates individual signing document records per workspace (not a single grouped record) — each tracks independently.
- **FR7.5**: Bulk send confirmation screen shows a preview list: workspace name, signatory, expiry date. Practice user confirms before dispatch.
- **FR7.6**: Maximum 50 documents per bulk send operation. Bulk send is processed synchronously in a single request (not queued) to provide immediate feedback. The 60-second timeout target (SC-05) is achievable because PDF generation with merge field replacement is a lightweight text-substitution operation per document. If performance becomes an issue at scale, this can be moved to a queued job with polling in v2.

### FR8: Reminders & Expiry

- **FR8.1**: Practice user can manually resend a reminder for any document in `sent` status where at least one signatory has not signed.
- **FR8.2**: Automated reminders: system sends a reminder email at 7 days before expiry and 1 day before expiry (configurable per practice in settings).
- **FR8.3**: When a document reaches its `expires_at` timestamp, a scheduled command marks it as `expired` and notifies the practice.
- **FR8.4**: Practice user can extend the expiry date of an active document (updates `expires_at`).
- **FR8.5**: Expired documents can be re-sent as a new document (clones the original with a new expiry).
- **FR8.6**: Reminder cooldown: minimum 24 hours between reminders to the same signatory (prevents spam).

### FR9: Audit Trail & Signature Certificate

- **FR9.1**: Every action on a signing document creates an event record: `created`, `sent`, `viewed`, `signed`, `declined`, `reminded`, `expired`, `cancelled`, `downloaded`.
- **FR9.2**: Each event records: document_id, event_type, actor user_id, IP address, user agent, metadata JSON, created_at (UTC).
- **FR9.3**: Audit trail is viewable on the document detail page as a timeline.
- **FR9.4**: After all signatories have signed, the system generates a **signature certificate page** and appends it to the PDF. The certificate is generated server-side as a new PDF page using a PHP PDF library (FPDI/FPDF or TCPDF). The certificate includes:
  - Document title and UUID
  - List of all signatories with: name, email, signed timestamp (UTC), IP address, signature method (typed/drawn)
  - If drawn signature was used: the signature image (decoded from base64 and embedded as PNG)
  - Hash (SHA-256) of the original document for tamper evidence
  - Hash (SHA-256) of the signed PDF (including certificate page) stored in `signing_document_events` metadata for post-hoc verification
  - Statement: "This document was electronically signed via MoneyQuest. Signatures are compliant with the Electronic Transactions Act 1999 (Cth)."
- **FR9.5**: The signed PDF with appended certificate is stored as a separate file at `signing-documents/{practice_id}/{uuid}-signed.pdf`. The original PDF is preserved unchanged at its original path. Both files are accessible to practice users via the download endpoint; clients can only download the signed version after completion.
- **FR9.6**: Audit trail records are immutable — no edits or deletions permitted.

### FR10: Notifications

- **FR10.1**: **Signing request** — email + in-app notification to each signatory when document is sent. Email includes: document title, practice name, expiry date, and a direct link to review and sign. The email link format is `{FRONTEND_URL}/documents/signing/{uuid}` and requires authentication. Unauthenticated users are redirected to login with a `redirect` query parameter back to the signing page. New notification types `SigningRequested`, `SigningSigned`, `SigningDeclined`, `SigningCompleted`, `SigningExpired` are added to the `NotificationType` enum.
- **FR10.2**: **Document viewed** — in-app notification to practice when a signatory first views the document.
- **FR10.3**: **Document signed** — email + in-app notification to practice when a signatory signs. If all signatories complete, a separate "fully signed" notification.
- **FR10.4**: **Document declined** — email + in-app notification to practice with the decline reason.
- **FR10.5**: **Reminder** — email to signatory for pending signature (manual or automated).
- **FR10.6**: **Document expired** — in-app notification to practice.
- **FR10.7**: Email notifications use the existing email infrastructure (023-EML). Signing emails are sent via `NotificationMailer::send()` with new `EmailNotificationType` cases. A new `NotificationCategory::Signing` is added for notification preference opt-out (clients can disable signing email reminders but not the initial signing request).

---

## Data Model

### signing_documents (central — practice-owned)

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| uuid | char(36) UNIQUE | Public identifier |
| practice_id | bigint FK | Practice that owns the document |
| workspace_id | bigint FK | Target client workspace |
| title | varchar(255) | Document title |
| description | text nullable | Optional description / instructions |
| original_file_path | varchar(500) | Path to uploaded/generated PDF |
| signed_file_path | varchar(500) nullable | Path to PDF with appended signature certificate |
| file_hash | varchar(64) | SHA-256 hash of original PDF |
| status | varchar(20) | draft, sent, completed, expired, cancelled (never `declined` — see FR1.8) |
| template_id | bigint FK nullable | Source template if generated from template |
| created_by | bigint FK (users) | Practice user who created |
| sent_at | timestamp nullable | When sent to signatories |
| expires_at | timestamp nullable | Signing deadline |
| completed_at | timestamp nullable | When all signatories signed |
| cancelled_at | timestamp nullable | When cancelled by practice |
| last_reminded_at | timestamp nullable | Last reminder sent |
| created_at | timestamp | |
| updated_at | timestamp | |

### signing_document_signatories

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| signing_document_id | bigint FK | |
| user_id | bigint FK nullable | If signatory is a platform user. Uses `nullOnDelete()` — if user is deleted, signatory record preserved with denormalised name/email |
| contact_id | bigint FK nullable | If signatory is a workspace contact. Uses `nullOnDelete()` — if contact is deleted, signatory record preserved |
| email | varchar(255) | Signatory email (denormalised for lookup — always populated regardless of user_id/contact_id) |
| name | varchar(255) | Signatory name (denormalised — always populated) |
| status | varchar(20) | pending, viewed, signed, declined |
| signature_method | varchar(20) nullable | typed, drawn |
| typed_name | varchar(255) nullable | Name as typed by signatory |
| signature_image | text nullable | Base64-encoded drawn signature PNG |
| consent_text | text nullable | Full consent statement shown at signing |
| decline_reason | text nullable | Reason if declined |
| signed_at | timestamp nullable | |
| viewed_at | timestamp nullable | First view timestamp |
| ip_address | varchar(45) nullable | IPv4 or IPv6 |
| user_agent | text nullable | Browser user agent string |
| last_reminded_at | timestamp nullable | |
| created_at | timestamp | |
| updated_at | timestamp | |

### signing_document_templates (central — practice-owned)

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| uuid | char(36) UNIQUE | |
| practice_id | bigint FK | |
| name | varchar(255) | Template name |
| category | varchar(50) | engagement, privacy, authority, compliance, other |
| file_path | varchar(500) | Path to template PDF |
| merge_fields | json | Array of merge field names found in the document |
| is_archived | boolean default false | |
| created_by | bigint FK (users) | |
| created_at | timestamp | |
| updated_at | timestamp | |

### signing_document_events (audit log — append-only)

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| signing_document_id | bigint FK | |
| event_type | varchar(30) | created, sent, viewed, signed, declined, reminded, expired, cancelled, downloaded |
| user_id | bigint FK nullable | Actor (null for system events like expiry) |
| ip_address | varchar(45) nullable | |
| user_agent | text nullable | |
| metadata | json nullable | Additional context (e.g., decline reason, signatory_id) |
| created_at | timestamp | Immutable — no updated_at |

---

## API Endpoints

### Practice Endpoints (require practice membership)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/practice/signing-documents` | List all signing documents (filterable by status, workspace) |
| GET | `/api/v1/practice/signing-documents/counts` | Status counts for StatusTabs |
| POST | `/api/v1/practice/signing-documents` | Create signing document (draft) |
| GET | `/api/v1/practice/signing-documents/{uuid}` | Document detail with signatories and audit trail |
| PATCH | `/api/v1/practice/signing-documents/{uuid}` | Update draft document (title, description, expiry) |
| POST | `/api/v1/practice/signing-documents/{uuid}/send` | Send document to signatories |
| POST | `/api/v1/practice/signing-documents/{uuid}/cancel` | Cancel document |
| POST | `/api/v1/practice/signing-documents/{uuid}/remind` | Resend reminder to unsigned signatories |
| POST | `/api/v1/practice/signing-documents/{uuid}/extend` | Extend expiry date |
| GET | `/api/v1/practice/signing-documents/{uuid}/download` | Download signed PDF (or original if not yet signed) |
| POST | `/api/v1/practice/signing-documents/bulk-send` | Bulk send from template |
| GET | `/api/v1/practice/signing-documents/{uuid}/events` | Audit trail events |

### Practice Template Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/practice/document-templates` | List templates |
| POST | `/api/v1/practice/document-templates` | Create template |
| GET | `/api/v1/practice/document-templates/{uuid}` | Template detail |
| PATCH | `/api/v1/practice/document-templates/{uuid}` | Update template |
| POST | `/api/v1/practice/document-templates/{uuid}/archive` | Archive template |

### Signatory / Client Endpoints (workspace-scoped)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/signing-requests` | List documents awaiting current user's signature |
| GET | `/api/v1/signing-requests/{uuid}` | Document detail for signatory (PDF URL, status) |
| POST | `/api/v1/signing-requests/{uuid}/view` | Record that signatory has viewed the document |
| POST | `/api/v1/signing-requests/{uuid}/sign` | Submit signature (typed_name, consent, optional drawn signature) |
| POST | `/api/v1/signing-requests/{uuid}/decline` | Decline with reason |
| GET | `/api/v1/signing-requests/{uuid}/pdf` | Stream PDF file (proxy — no file paths exposed) |

---

## UI/UX Requirements

### Practice Pages

- **`/practice/documents`** — Governance dashboard
  - StatusTabs: All | Draft | Awaiting | Completed | Expired | Declined | Cancelled
  - DataTable with columns: Title, Client, Signatories (2/3 signed), Status badge, Sent, Expires
  - "New Document" button (shortcut: `N`)
  - "Bulk Send" button
  - Search bar (shortcut: `/`)

- **`/practice/documents/new`** — Create signing document
  - Step 1: Upload PDF or select from template
  - Step 2: Add title, description, select target workspace
  - Step 3: Add signatories (search users/contacts by name or email)
  - Step 4: Set expiry date, review, and send (or save as draft)

- **`/practice/documents/{uuid}`** — Document detail
  - Split view: PDF preview (left) + signatory status list & audit timeline (right)
  - Action buttons: Send (if draft), Remind, Cancel, Extend Expiry, Download
  - Signatory cards showing: name, email, status badge, signed/viewed timestamp

- **`/practice/settings/document-templates`** — Template library
  - Grid/list of templates with name, category badge, merge fields count, created date
  - Upload new template, edit metadata, archive

### Client Pages

- **`/documents/signing`** — Client signing inbox
  - List of documents awaiting signature with title, from (practice name), sent date, expires date
  - Click to open signing flow

- **`/documents/signing/{uuid}`** — Signing flow
  - Full-width PDF viewer (react-pdf) with page navigation
  - After scrolling/viewing: signature panel slides up from bottom
  - Typed name input + consent checkbox + "Sign Document" button
  - Optional: "Draw Signature" toggle to switch to canvas pad
  - Decline button with reason textarea
  - Confirmation screen after signing with download link

### Shared Components

- `<PdfViewer>` — react-pdf wrapper with page navigation, zoom, full-screen toggle
- `<SignatureCapture>` — typed name input + consent checkbox + optional drawn canvas
- `<SignatoryStatusList>` — list of signatories with status badges and timestamps
- `<AuditTimeline>` — chronological event list with icons per event type
- `<DocumentStatusBadge>` — colour-coded status badge (draft=grey, sent=blue, completed=green, expired=amber, declined=red, cancelled=grey)

---

## Acceptance Criteria

### US-01: Upload & Send Document
- [ ] Practice user can upload a PDF up to 20MB
- [ ] Practice user can add 1-10 signatories (users or contacts with email)
- [ ] Sending transitions status from draft to sent and records sent_at
- [ ] Notification dispatched to each signatory on send
- [ ] Document with no signatories cannot be sent (validation error)

### US-02: Governance Dashboard
- [ ] Dashboard lists all signing documents for the practice
- [ ] StatusTabs show correct counts from `/counts` endpoint
- [ ] Filtering by status works correctly
- [ ] Search by title or workspace name returns matching results
- [ ] Clicking a row navigates to document detail

### US-03: Document Templates
- [ ] Practice can create a template by uploading a PDF
- [ ] Merge fields are detected from the PDF text layer and stored
- [ ] Generating a document from a template replaces merge fields with actual values
- [ ] Archived templates do not appear in the template selector

### US-04: Bulk Send
- [ ] Practice can select a template and multiple target workspaces
- [ ] Individual signing documents are created per workspace with correct merge field values
- [ ] Maximum 50 documents per bulk send enforced
- [ ] Confirmation screen shows preview before dispatch

### US-05: Reminders & Expiry
- [ ] Manual reminder can be sent for documents with unsigned signatories
- [ ] Automated reminders fire at 7 days and 1 day before expiry
- [ ] 24-hour cooldown between reminders per signatory enforced
- [ ] Expired documents are marked as expired by scheduled command
- [ ] Practice can extend expiry date of an active document

### US-10: Client Notification
- [ ] Client receives email with document title, practice name, and signing link
- [ ] Client receives in-app notification visible in notification centre
- [ ] Signing link navigates directly to the document signing flow

### US-11 & US-12: View & Sign
- [ ] PDF renders inline in browser (no download required to view)
- [ ] Sign button is disabled until document has been scrolled/viewed
- [ ] Typing name and checking consent enables the Sign button
- [ ] Signing records: typed_name, timestamp, IP address, user agent
- [ ] After signing, signatory status updates to `signed`
- [ ] When all signatories complete, document status moves to `completed`

### US-13: Decline
- [ ] Client can decline with a required reason (1-500 chars)
- [ ] Decline updates signatory status to `declined`
- [ ] Practice receives notification with the decline reason

### FR9: Audit Trail & Certificate
- [ ] Every action creates an event record with IP, user agent, timestamp
- [ ] Signature certificate page appended to PDF after all signatories sign
- [ ] Certificate includes: document UUID, all signatory details, SHA-256 hash, legal statement
- [ ] Signed PDF is stored separately from original (original preserved)
- [ ] Audit events cannot be modified or deleted

### Security & Immutability
- [ ] Documents with any signed signatories cannot be modified or deleted
- [ ] Signatories can only access documents they are listed on
- [ ] Practice users can only access documents belonging to their practice
- [ ] All signing endpoints validate workspace/practice membership
- [ ] File paths are never exposed in API responses (use signed URLs or proxy endpoint)

---

## Scheduled Commands

| Command | Schedule | Description |
|---------|----------|-------------|
| `signing:expire-documents` | Hourly | Mark documents past `expires_at` as `expired`, notify practice |
| `signing:send-reminders` | Daily 9am AEST | Send automated reminders at 7-day and 1-day thresholds |

---

## Permissions

New permissions added to the practice permission set. These follow the existing `PracticeTaskPolicy` pattern — Spatie Permission's `hasPermissionTo()` check, scoped to the practice context (not workspace team context). Practice membership is validated by looking up `$request->user()->practices()->first()` in the controller (same as `PracticeTaskController`). Client-side signing endpoints do NOT use practice permissions — they are gated by signatory record lookup (the user must be listed as a signatory on the document).

| Permission | Roles |
|------------|-------|
| `signing-document.view` | owner, manager, accountant, bookkeeper |
| `signing-document.create` | owner, manager, accountant |
| `signing-document.send` | owner, manager, accountant |
| `signing-document.cancel` | owner, manager |
| `signing-document.manage-templates` | owner, manager |
| `signing-document.bulk-send` | owner, manager |

---

## Success Criteria

- **SC-01**: Document upload to signing request sent in under 60 seconds (3 clicks: upload, add signatory, send).
- **SC-02**: Client can view and sign a document in under 30 seconds from clicking the email link.
- **SC-03**: Signature certificate correctly appends to PDF with all signatory metadata.
- **SC-04**: Audit trail captures every action — no gaps between created and completed.
- **SC-05**: Bulk send of 50 documents completes within 60 seconds.
- **SC-06**: Zero cross-practice data leakage — practice A cannot see practice B's documents.
- **SC-07**: Signed documents are immutable — no API endpoint allows modification after signing.

---

## Clarifications

The following 20 clarification questions were identified during spec review, answered based on codebase patterns and project conventions.

### Authorization & Permissions

**1. Are signing permissions practice-scoped or workspace-scoped? How are they enforced?**

- (a) Workspace-scoped via Spatie Permission team mode (like `journal-entry.view`)
- (b) Practice-scoped via practice membership check + `hasPermissionTo()` (like `PracticeTaskPolicy`)
- (c) Custom middleware that checks both practice and workspace access
- **Decision: (b)** — Practice-scoped via practice membership check. The practice endpoints follow the existing `PracticeTaskController` pattern: resolve the user's practice via `$request->user()->practices()->first()`, then check `signing_document.practice_id` matches. Permissions use `hasPermissionTo()` on practice-scoped Spatie roles. Client signing endpoints bypass practice permissions entirely — access is gated by the signatory record (`signing_document_signatories.user_id = auth user`).

**2. Who can cancel a document that has been sent but has partial signatures — and what happens to the existing signatures?**

- (a) Only `owner` role can cancel after partial signatures
- (b) `owner` and `manager` roles can cancel (matching `signing-document.cancel` permission), partial signatures are preserved in audit trail
- (c) No one can cancel after any signature — must wait for expiry
- **Decision: (b)** — `owner` and `manager` roles can cancel at any point before `completed` status. Partial signatures remain on the signatory records and in the audit trail as an immutable historical record. The document moves to `cancelled` status. This mirrors how the `InvoiceStatus::Voided` transition preserves payment history while preventing further action.

**3. Can a bookkeeper view documents they did not create, or only their own?**

- (a) Bookkeepers see all practice documents (same as accountant view)
- (b) Bookkeepers only see documents they created
- (c) Bookkeepers see documents for workspaces they are assigned to (via `PracticeMemberAssignment`)
- **Decision: (c)** — Bookkeepers see documents for workspaces they are assigned to, following the `PracticeTaskController` pattern which scopes by `PracticeMemberAssignment.workspace_id`. Owners and managers see all documents across the practice. This prevents information leakage between client portfolios.

### Data Model Edge Cases

**4. What happens to a signing document if the signatory's user account is deleted?**

- (a) Cascade delete the signatory record (lose signing data)
- (b) `nullOnDelete()` on `user_id` FK — signatory record preserved with denormalised name/email
- (c) Block user deletion if they have pending signing documents
- **Decision: (b)** — Use `nullOnDelete()` on both `user_id` and `contact_id` foreign keys. The `email` and `name` columns are denormalised specifically for this scenario — the signatory's identity is preserved even if their account is removed. This matches the `practice_tasks.assignee_id` pattern which uses `nullOnDelete()`. Signed records and audit trail remain intact as legal evidence.

**5. Where are signing document PDFs stored (filesystem disk), and what is the storage path convention?**

- (a) Same disk as attachments (`config('filesystems.default')`) with path `signing-documents/{practice_id}/{uuid}.pdf`
- (b) A dedicated `signing` disk configured separately
- (c) Vercel Blob storage
- **Decision: (a)** — Use the default filesystem disk, matching the `UploadAttachment` action's `Storage::disk(config('filesystems.default'))` pattern. Path convention: `signing-documents/{practice_id}/{uuid}.pdf` for originals, `signing-documents/{practice_id}/{uuid}-signed.pdf` for completed documents with certificate. Template PDFs stored at `signing-templates/{practice_id}/{uuid}.pdf`. This keeps all document storage under one disk while maintaining clear path separation.

**6. The data model has `signing_documents` as "central — practice-owned". Does this table need a `workspace_id` global scope?**

- (a) Yes, add workspace global scope like tenant models
- (b) No, scope by `practice_id` instead since these are practice-owned central models
- (c) Scope by both `practice_id` and `workspace_id`
- **Decision: (b)** — No workspace global scope. These are central models owned by the practice, not workspace-scoped tenant models. They follow the same pattern as `PracticeTask` which uses `practice_id` scoping in the controller rather than a global scope. The `workspace_id` column exists for filtering and navigation but is not the primary access control dimension. The model class lives in `app/Models/Central/SigningDocument.php`.

### Signature Legality

**7. What specific metadata must be captured at signing time to satisfy the Electronic Transactions Act 1999 (Cth)?**

- (a) Only typed name and timestamp
- (b) Typed name, timestamp, IP address, user agent, consent text shown, and method (typed/drawn)
- (c) All of (b) plus a hashed copy of the document at the moment of each individual signature
- **Decision: (c)** — In addition to the metadata already specified (typed name, timestamp UTC, IP, user agent, consent text, method), a SHA-256 hash of the original document is stored per-signatory in the `signing_document_events` metadata. This proves each signatory signed the same document. The `file_hash` column on `signing_documents` stores the original hash at upload time; the event metadata records it again at sign time for independent verification.

**8. How is tamper detection enforced after the signed PDF is generated?**

- (a) SHA-256 hash of original only (already in the spec)
- (b) SHA-256 hash of original + SHA-256 hash of the final signed PDF, both stored in the audit event
- (c) Full PKI certificate-based signing of the final PDF
- **Decision: (b)** — The original document hash is recorded at upload time (`signing_documents.file_hash`). After the certificate page is appended and the signed PDF is generated, a SHA-256 hash of the complete signed PDF is computed and stored in the `signing_document_events` metadata for the `completed` event. This allows post-hoc verification: re-hash the stored file and compare. PKI signing is explicitly out of scope for v1 but this hash chain provides strong tamper evidence.

### State Transitions

**9. What happens when one signatory declines but others have not yet signed? Does the document move to a `declined` status?**

- (a) Document immediately moves to `declined` status, blocking remaining signatories
- (b) Document stays in `sent` status; other signatories can still sign; `declined` is a virtual filter in StatusTabs
- (c) Practice is prompted to decide: cancel or continue
- **Decision: (b)** — The document remains in `sent` status. The decline affects only the individual signatory record (`signing_document_signatories.status = declined`). Other signatories can proceed. The `Declined` tab in StatusTabs is a virtual filter: it queries documents in `sent` status that have at least one signatory with `status = declined`. The practice can choose to cancel the document, extend it, or wait for the remaining signatories. This is more flexible than blocking everyone because of one person's objection.

**10. Can a signatory who declined later change their mind and sign?**

- (a) No, decline is final — practice must re-send a new document
- (b) Yes, the signatory can sign if the document is still in `sent` status and not expired
- (c) Only if the practice explicitly "resets" their status
- **Decision: (a)** — Decline is final for that signatory record. If the client changes their mind, the practice must cancel and re-send a new document (or the client contacts the practice to request a new copy). This preserves the audit trail integrity — the decline reason and timestamp are a permanent record. Allowing status reversal would complicate the immutability guarantees and the audit trail.

### Template System

**11. What happens if a merge field placeholder in the template PDF has no corresponding value (e.g., workspace has no ABN)?**

- (a) Leave the `{{abn}}` placeholder text visible in the generated PDF
- (b) Replace with empty string (placeholder disappears)
- (c) Show validation error and prevent generation
- **Decision: (b)** — Replace with empty string. This is the most practical approach for bulk send where some workspaces may have ABNs and others may not. The system logs a warning when unrecognised `{{...}}` patterns remain after replacement (indicating typos in the template). A preview step in the UI lets the practice review the generated document before sending.

**12. If a template's PDF file is updated after documents have been generated from it, what happens to the existing documents?**

- (a) Existing documents are retroactively updated
- (b) Existing documents keep their copy; only new documents use the updated template
- (c) Template updates are blocked if documents have been generated from it
- **Decision: (b)** — Documents generated from a template get their own independent copy of the PDF at generation time (stored at `signing-documents/{practice_id}/{uuid}.pdf`). Template updates only affect future documents. This is consistent with the spec's immutability principle and prevents accidental modification of sent documents.

### Notification Details

**13. What is the email subject line format for signing request notifications?**

- (a) "Document requires your signature"
- (b) "[Practice Name] — Please sign: [Document Title]"
- (c) "Signing Request: [Document Title]"
- **Decision: (b)** — `"[Practice Name] — Please sign: [Document Title]"`. Including the practice name gives context in the inbox (the client may have multiple practices). The email body follows the existing `NotificationMailer` pattern and includes: document title, practice name, description (if provided), expiry date, and a prominent "Review & Sign" CTA button linking to `/documents/signing/{uuid}`.

**14. Can clients opt out of signing reminder emails via notification preferences?**

- (a) No — all signing emails are mandatory
- (b) Clients can opt out of reminders but not the initial signing request
- (c) Clients can opt out of all signing emails
- **Decision: (b)** — A new `NotificationCategory::Signing` is added. The initial signing request email and decline/completion confirmations are mandatory (cannot be opted out). Reminder emails check the client's `NotificationPreference` for the `Signing` category and skip if disabled. This follows the existing `NotificationMailer::isEnabled()` pattern where auth-related emails bypass preference checks.

### Frontend UX

**15. Should the `<PdfViewer>` for signing be the existing `document-preview.tsx` component or a new purpose-built component?**

- (a) Reuse the existing `DocumentPreview` component as-is
- (b) Extract the `PdfViewer` from `document-preview.tsx` into a shared component and extend it for signing
- (c) Build a completely new PDF viewer component
- **Decision: (b)** — Extract the existing `PdfViewer` function from `document-preview.tsx` into a standalone `<PdfViewer>` component at `components/shared/pdf-viewer.tsx`. The signing page extends it with: scroll tracking (to enable sign button), full-screen mode, and a bottom-docked signature panel. The existing `DocumentPreview` dialog wrapper is refactored to import from the shared component. This avoids code duplication while keeping the signing-specific UX separate.

**16. How does the signing experience work on mobile devices?**

- (a) Mobile signing is not supported in v1
- (b) Full mobile support with responsive layout — PDF viewer stacks above signature panel
- (c) Mobile-optimised: simplified view with page-by-page navigation and tap-to-zoom
- **Decision: (b)** — Full mobile support is required since clients may receive signing links on their phone. The PDF viewer renders full-width with page navigation (no side-by-side split). The signature panel appears below the PDF after the last page is viewed. The drawn signature canvas renders full-width (landscape hint via CSS) at 400x150px. The consent checkbox text is readable at mobile font sizes. The "Sign Document" button is sticky at the bottom of the viewport for easy thumb access.

### Performance

**17. How should large PDFs (10+ pages, close to 20MB) be handled in the browser?**

- (a) Load all pages at once via react-pdf
- (b) Lazy-load pages as the user scrolls (react-pdf supports this)
- (c) Server-side render thumbnails and only load the current page's full resolution
- **Decision: (b)** — Lazy-load pages using react-pdf's built-in page rendering. Only the current page and adjacent pages are rendered at full resolution. The existing `PdfViewer` in `document-preview.tsx` already renders one page at a time with navigation controls — the signing viewer follows the same approach. For the scroll-to-complete requirement, the client tracks which pages have been navigated to (not rendered simultaneously), so memory usage stays low.

**18. How are the governance dashboard queries optimised for practices with hundreds of documents?**

- (a) No special optimisation — paginate and filter
- (b) Composite indexes on `(practice_id, status)` and `(practice_id, workspace_id)` plus cursor pagination
- (c) Materialised view or cache layer
- **Decision: (b)** — Add composite indexes on `(practice_id, status)` and `(practice_id, workspace_id, status)` to the migration. Standard offset-based pagination (matching the existing `PracticeTaskController` pattern of `paginate(25)`). The counts endpoint uses a single `GROUP BY status` query (matching the `BasController::counts()` pattern). Search uses `LIKE` on `title` and joins to `workspaces.name`. No caching needed in v1 — the query patterns are standard and well-indexed.

### Security

**19. How are PDF files served to signatories without exposing internal file paths?**

- (a) Signed URLs with time-limited tokens (e.g., 15-minute expiry)
- (b) Proxy endpoint that streams the file through the API after access validation
- (c) Public URLs with UUID-based obscurity
- **Decision: (b)** — A proxy download endpoint (`GET /api/v1/signing-requests/{uuid}/pdf`) authenticates the request, validates the user is a listed signatory, then streams the PDF via `Storage::download()`. File paths are never returned in API responses. This matches the pattern used by the existing attachment download endpoint. For practice users, the download endpoint at `GET /api/v1/practice/signing-documents/{uuid}/download` performs the same proxy pattern with practice membership validation.

**20. How should the signing flow be tested end-to-end, including audit trail verification?**

- (a) Unit tests only — mock PDF operations
- (b) Feature tests for API endpoints + browser tests for the signing UX flow
- (c) Feature tests for API + unit tests for PDF generation + browser test for happy path only
- **Decision: (c)** — Three layers of testing following project conventions. **Feature tests** (~20 tests): CRUD endpoints, permission checks (bookkeeper cannot cancel), lifecycle transitions, bulk send validation, expiry command, reminder cooldown, cross-practice isolation. Use `RefreshDatabase` + `RolesAndPermissionsSeeder` setup matching existing test patterns. **Unit tests** (~5 tests): PDF certificate generation (mock the PDF library, verify hash computation, verify certificate page content), merge field replacement, status transition validation. **Browser tests** (~3-5 tests): happy path signing flow (upload, send, view, sign), decline flow, governance dashboard navigation. Audit trail assertions verify event count and types between document creation and completion — no gaps allowed per SC-04. Signatures are not mocked in feature tests — the full Action layer runs with real audit event recording.

---

## Addendum: Xero Portal Gap Assessment & Signing Packs

**Added**: 2026-04-01
**Context**: Assessment of the Xero Portal signing workflow (powered by Adobe Acrobat Sign) against the current spec and implementation. This addendum introduces the **Signing Pack** concept and additional gaps identified.

### Xero Portal Signing Workflow (Observed)

The Xero Portal groups documents into a **signing pack** sent to clients. Example observed:

- **Pack title**: "CareVicinity Pty Ltd - 2025FY Financial Statements & Tax Return"
- **Documents in pack**:
  1. `CareVicinity Pty Ltd - 2025FY Cover Letter.pdf` — **View only** (no signature required)
  2. `CareVicinity Pty Ltd - 2025FY Financial Statements.pdf` — **Review & Sign**
  3. `2025_CTR_CareVicinityPtyLtd.pdf` — **Review & Sign**
- **Client experience**: Pack appears in a "To Do" section; after all documents are signed, the pack moves to "Done" with individual "Signed X ago" timestamps and download links
- **Signing method**: Adobe Acrobat Sign embedded viewer with "Start" button, "Next Required" field navigation, draw/type signature
- **Practice branding**: Practice logo (Hailstone Advisory) displayed on the signing page
- **Consent**: Adobe Terms of Use + Privacy Policy consent before signing

### Gap Analysis

| # | Gap | Severity | Current State | Resolution |
|---|-----|----------|---------------|------------|
| G1 | **No Signing Pack concept** | HIGH | Documents are independent — no grouping entity | New `signing_packs` + `signing_pack_documents` tables (see below) |
| G2 | **No view-only documents in a pack** | HIGH | Every document is assumed to require signing | `requires_signing` boolean on pack-document pivot |
| G3 | **No Upload signature method** | MEDIUM | Only `typed` and `drawn` in `SignatureMethod` enum | Add `Uploaded` case — pre-saved signature image file |
| G4 | **No To Do / Done client portal** | MEDIUM | Client signing inbox exists but no pack-level grouping | New portal page with To Do / Done sections per pack |
| G5 | **No practice branding on signing page** | LOW | No logo shown to client during signing | Pull `practices.logo_url` into signing portal UI |
| G6 | **No per-document signed timestamp in pack** | LOW | `signed_at` tracked per signatory, not surfaced per doc in a pack | Derive from `signing_document_signatories.signed_at` per document |

### What's Already Strong (No Gaps)

- ✅ PDF viewer (FR3.2 specifies react-pdf inline viewer)
- ✅ Drawn + typed signature capture (FR4.1, FR4.2)
- ✅ Australian legal compliance (Electronic Transactions Act 1999 consent)
- ✅ SHA-256 file hash integrity
- ✅ Full audit trail (IP, user agent, timestamps, event log)
- ✅ Signing certificate PDF generation (FR9.4)
- ✅ Notifications (FR10)
- ✅ Reminders & expiry (FR8)
- ✅ Download signed documents

---

### Extension: Signing Pack Data Model

A **Signing Pack** groups multiple documents into a single bundle sent to one or more signatories. Each document in the pack can either require a signature or be view/download-only.

```
Practice ─── creates ─── SigningPack ─── contains ─── SigningPackDocument(s)
                              │                            │
                              │                            ├── requires_signing: true  → "Review & Sign"
                              │                            └── requires_signing: false → "View" / "Download"
                              │
                              └── sent to ─── SigningPackSignatory(s)
                                                    │
                                                    ├── signs each required document individually
                                                    ├── captured: IP, User-Agent, timestamp per doc
                                                    └── pack status: completed when all required docs signed
```

#### New Migration: `create_signing_packs_tables`

```php
// database/migrations/2026_04_01_100001_create_signing_packs_tables.php

Schema::create('signing_packs', function (Blueprint $table) {
    $table->id();
    $table->char('uuid', 36)->unique();
    $table->foreignId('practice_id')->constrained('practices')->cascadeOnDelete();
    $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
    $table->string('title', 255);                          // e.g. "CareVicinity Pty Ltd - 2025FY Financial Statements & Tax Return"
    $table->text('description')->nullable();
    $table->string('status', 20)->default('draft');         // draft, sent, completed, expired, cancelled
    $table->foreignId('created_by')->constrained('users');
    $table->timestamp('sent_at')->nullable();
    $table->timestamp('expires_at')->nullable();
    $table->timestamp('completed_at')->nullable();
    $table->timestamp('cancelled_at')->nullable();
    $table->timestamp('last_reminded_at')->nullable();
    $table->timestamps();

    $table->index(['practice_id', 'status']);
    $table->index(['practice_id', 'workspace_id', 'status']);
});

Schema::create('signing_pack_documents', function (Blueprint $table) {
    $table->id();
    $table->foreignId('signing_pack_id')->constrained('signing_packs')->cascadeOnDelete();
    $table->foreignId('signing_document_id')->constrained('signing_documents')->cascadeOnDelete();
    $table->boolean('requires_signing')->default(true);     // false = view/download only (e.g. cover letter)
    $table->unsignedSmallInteger('sort_order')->default(0); // display order within the pack
    $table->timestamps();

    $table->unique(['signing_pack_id', 'signing_document_id']);
    $table->index('signing_pack_id');
});

Schema::create('signing_pack_signatories', function (Blueprint $table) {
    $table->id();
    $table->foreignId('signing_pack_id')->constrained('signing_packs')->cascadeOnDelete();
    $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
    $table->foreignId('contact_id')->nullable()->constrained('contacts')->nullOnDelete();
    $table->string('email', 255);
    $table->string('name', 255);
    $table->string('status', 20)->default('pending');       // pending, viewed, in_progress, completed, declined
    $table->timestamp('viewed_at')->nullable();
    $table->timestamp('completed_at')->nullable();          // all required docs in pack signed
    $table->text('decline_reason')->nullable();
    $table->string('ip_address', 45)->nullable();
    $table->text('user_agent')->nullable();
    $table->timestamp('last_reminded_at')->nullable();
    $table->timestamps();

    $table->index('signing_pack_id');
    $table->index(['user_id', 'status']);
});

Schema::create('signing_pack_events', function (Blueprint $table) {
    $table->id();
    $table->foreignId('signing_pack_id')->constrained('signing_packs')->cascadeOnDelete();
    $table->string('event_type', 30);
    $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
    $table->string('ip_address', 45)->nullable();
    $table->text('user_agent')->nullable();
    $table->json('metadata')->nullable();
    $table->timestamp('created_at')->nullable();

    $table->index(['signing_pack_id', 'event_type']);
});
```

#### Add `signing_pack_id` to `signing_documents`

```php
// database/migrations/2026_04_01_100002_add_signing_pack_id_to_signing_documents.php

Schema::table('signing_documents', function (Blueprint $table) {
    $table->foreignId('signing_pack_id')
        ->nullable()
        ->after('template_id')
        ->constrained('signing_packs')
        ->nullOnDelete();
    $table->index('signing_pack_id');
});
```

#### New Enums

**`SigningPackStatus`** — mirrors `SigningDocumentStatus` with same transitions:

```php
enum SigningPackStatus: string
{
    case Draft = 'draft';
    case Sent = 'sent';
    case Completed = 'completed';
    case Expired = 'expired';
    case Cancelled = 'cancelled';
}
```

**`PackSignatoryStatus`** — includes `in_progress` for partial signing within a pack:

```php
enum PackSignatoryStatus: string
{
    case Pending = 'pending';
    case Viewed = 'viewed';
    case InProgress = 'in_progress';  // signed some but not all required docs
    case Completed = 'completed';     // all required docs signed
    case Declined = 'declined';
}
```

#### Updated Enum: `SignatureMethod`

```php
enum SignatureMethod: string
{
    case Typed = 'typed';
    case Drawn = 'drawn';
    case Uploaded = 'uploaded';   // NEW — pre-saved signature image upload
}
```

The uploaded signature follows the same storage pattern as drawn signatures (`base64-encoded PNG` in `signature_image` column) but is sourced from a file upload rather than a canvas drawing. Max file size: 500KB. Accepted formats: PNG, JPG (converted to PNG on server before storage). The `SignDocumentRequest` validation rule for `signature_image` increases from `max:300000` to `max:500000` to accommodate uploaded images.

#### New Models

**`SigningPack`** — central model at `app/Models/Central/SigningPack.php`:
- Relationships: `practice()`, `workspace()`, `createdBy()`, `documents()` (BelongsToMany via pivot), `signatories()`, `events()`
- Helper methods: `requiredDocuments()`, `viewOnlyDocuments()`, `allSignatoriesCompleted()`
- Scopes: `forPractice()`, `forWorkspace()`, `status()`

**`SigningPackSignatory`** — at `app/Models/Central/SigningPackSignatory.php`:
- Relationships: `pack()`, `user()`, `contact()`

**`SigningPackEvent`** — at `app/Models/Central/SigningPackEvent.php`:
- Append-only, no `updated_at`

#### New Actions

| Action | Purpose |
|--------|---------|
| `CreateSigningPack` | Creates pack with documents (view-only and sign-required) + signatories in draft |
| `SendSigningPack` | Transitions to Sent, creates document-level signatories for each required doc, sends notifications |
| `SignPackDocument` | Signs a specific document in a pack; updates pack signatory to `in_progress` or `completed` |
| `DeclineSigningPack` | Declines at pack level |
| `CancelSigningPack` | Cancels pack + all child documents |
| `CheckPackCompletion` | All pack signatories completed → pack status = completed |
| `RemindPackSignatories` | Sends reminders to pending pack signatories |
| `RecordPackEvent` | Append-only pack event log |

#### New API Endpoints

**Practice-facing (pack management):**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/practice/signing-packs` | List packs (filterable) |
| GET | `/api/v1/practice/signing-packs/counts` | Status counts |
| POST | `/api/v1/practice/signing-packs` | Create draft pack |
| GET | `/api/v1/practice/signing-packs/{pack}` | Pack detail |
| PATCH | `/api/v1/practice/signing-packs/{pack}` | Update draft |
| POST | `/api/v1/practice/signing-packs/{pack}/send` | Send pack |
| POST | `/api/v1/practice/signing-packs/{pack}/cancel` | Cancel pack |
| POST | `/api/v1/practice/signing-packs/{pack}/remind` | Remind signatories |
| GET | `/api/v1/practice/signing-packs/{pack}/events` | Audit trail |
| DELETE | `/api/v1/practice/signing-packs/{pack}` | Delete draft |
| GET | `/api/v1/practice/signing-packs/{pack}/documents/{doc}/download` | Download document |
| GET | `/api/v1/practice/signing-packs/{pack}/certificate/{signatory}` | Download signing certificate |

**Client-facing (signing portal):**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/signing-portal` | List assigned packs (To Do + Done) |
| GET | `/api/v1/signing-portal/{pack}` | Pack detail with docs and status |
| POST | `/api/v1/signing-portal/{pack}/view` | Mark pack viewed |
| POST | `/api/v1/signing-portal/{pack}/documents/{doc}/sign` | Sign a specific document |
| POST | `/api/v1/signing-portal/{pack}/decline` | Decline pack |
| GET | `/api/v1/signing-portal/{pack}/documents/{doc}/download` | Download document |
| GET | `/api/v1/signing-portal/{pack}/documents/{doc}/preview` | Temporary URL for PDF viewer |
| GET | `/api/v1/signing-portal/{pack}/certificate` | Download own signing certificate |

#### Client Portal UX: To Do / Done

The signing portal page (`/portal/signing`) mirrors Xero's layout:

```
┌──────────────────────────────────────────────────────────┐
│  [Practice Logo]          Signing Portal        [Logout] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  To do                                                   │
│  ┌────────────────────────────────────────────────────┐  │
│  │ CareVicinity Pty Ltd - 2025FY Financial Statements │  │
│  │ & Tax Return                                       │  │
│  │ ┌──────────────────────────────────────────────┐   │  │
│  │ │ 📄 Cover Letter.pdf                    View  │   │  │
│  │ │ 📄 Financial Statements.pdf    Review & Sign │   │  │
│  │ │ 📄 2025_CTR_CareVicinity.pdf   Review & Sign │   │  │
│  │ └──────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Done                                                    │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 📄 Company Tax Return 2025 - Movemart Pty Ltd      │  │
│  │    Signed a month ago                    Download  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Signature Capture: Upload Tab

The existing `<SignatureCapture>` component (FR4.1, FR4.2) gains a third tab:

```
┌─────────────────────────────────────────────────┐
│  ┌─────────┐  ┌─────────┐  ┌──────────┐        │
│  │  Draw   │  │  Type   │  │  Upload  │  ← NEW │
│  └─────────┘  └─────────┘  └──────────┘        │
│                                                  │
│  Upload your signature                           │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │  [Drop signature image here or click to    │  │
│  │   browse]                                  │  │
│  │                                            │  │
│  │  Accepted: PNG, JPG — max 500KB            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  [Preview of uploaded signature]         │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────┐  ┌──────────┐                         │
│  │ Clear │  │  Accept  │                         │
│  └──────┘  └──────────┘                         │
└─────────────────────────────────────────────────┘
```

#### Backward Compatibility

- **Standalone documents** (not part of a pack) continue to work via the existing `SigningDocumentController` and `SigningRequestController` endpoints
- `signing_pack_id` on `signing_documents` is nullable — existing documents without a pack are unaffected
- The existing frontend hooks (`useSigningDocuments`, `useSigningRequests`) remain for standalone documents
- New hooks (`useSigningPacks`, `useSigningPortal`) are added for pack-based workflows
- Practices can use either standalone documents or packs — the governance dashboard shows both

#### Implementation Phases (Addendum)

These phases extend the original spec's implementation order:

**Phase A (Pack Infrastructure):** New migration, models, enums, `CreateSigningPack`, `SendSigningPack`, `CancelSigningPack`, `CheckPackCompletion`, `RecordPackEvent`, `SigningPackController`, routes, tests.

**Phase B (Client Portal + Upload Signature):** `SigningPortalController`, `SignPackDocument` action, upload signature method, portal pages (To Do / Done), `SignatureCapture` upload tab.

**Phase C (Polish):** Practice branding on portal, per-document timestamps, pack-level certificate generation, reminder scheduling for packs.

---

### Updated Out of Scope

The following item from the original "Out of Scope" section is now **in scope** via this addendum:

- ~~**Wet signature upload** — no scan-and-attach workflow; digital signatures only~~ → **Now supported**: `SignatureMethod::Uploaded` allows clients to upload a pre-saved signature image (PNG/JPG, max 500KB)

The following remain out of scope:
- Full PDF annotation / drag-and-drop signature placement
- Sequential signing order (all signatories sign independently)
- Non-PDF formats
- Advanced template WYSIWYG editor
- PKI / certificate-based digital signatures
