---
title: "Feature Specification: File Attachments"
---

# Feature Specification: File Attachments

**Feature Branch**: `012-att-file-attachments`
**Created**: 2026-03-11
**Status**: Draft
**Input**: Idea Brief — 012-ATT File Attachments

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Upload Attachment to Accounting Object (Priority: P1)

As an accountant or bookkeeper, I want to upload a file (receipt, invoice PDF, bank statement) to an accounting object so that I have supporting evidence linked directly to the relevant record.

**Why this priority**: Core capability — without upload, the entire feature has no value. Every other story depends on this.

**Independent Test**: Upload a file to an invoice, verify it appears in the attachment list, and confirm the file is stored and retrievable.

**Acceptance Scenarios**:

1. **Given** an existing invoice, **When** the user uploads a PDF file under 20MB, **Then** the file is stored and linked to the invoice, and the attachment appears in the invoice's attachment list with filename, size, and upload date.
2. **Given** an existing journal entry, **When** the user uploads a JPG receipt image, **Then** the file is stored and linked to the journal entry.
3. **Given** any supported accounting object (invoice, journal entry, bank transaction, contact, job), **When** the user uploads a file, **Then** the system accepts the upload and links it to that object.
4. **Given** a file exceeding the maximum allowed size (20MB), **When** the user attempts to upload it, **Then** the system rejects the upload with a clear error message.
5. **Given** a file with a disallowed type (e.g., `.exe`, `.bat`), **When** the user attempts to upload it, **Then** the system rejects the upload with a clear error message.

---

### User Story 2 — List and View Attachments (Priority: P1)

As a user viewing an accounting object, I want to see all attachments associated with it so that I can access supporting documents without leaving the system.

**Why this priority**: Users must be able to see what's been uploaded. Viewing is the immediate complement to uploading.

**Independent Test**: Navigate to an invoice with attachments, verify the attachment list displays filenames, sizes, types, and upload dates. Click an attachment to preview or download it.

**Acceptance Scenarios**:

1. **Given** an invoice with 3 attachments, **When** the user views the invoice detail, **Then** all 3 attachments are listed with filename, file size, file type, and upload date.
2. **Given** an invoice with no attachments, **When** the user views the invoice detail, **Then** an empty state message is shown (e.g., "No attachments").
3. **Given** an attachment that is an image (JPG, PNG), **When** the user clicks it, **Then** an inline preview is displayed.
4. **Given** an attachment that is a PDF, **When** the user clicks it, **Then** it opens in a new browser tab or inline viewer.

---

### User Story 3 — Download Attachment (Priority: P1)

As a user, I want to download an attachment so that I can save it locally or share it outside the system.

**Why this priority**: Download is essential for audit workflows — auditors need to extract and save supporting documents.

**Independent Test**: Click download on an attachment, verify the correct file is downloaded with its original filename.

**Acceptance Scenarios**:

1. **Given** an attachment on a journal entry, **When** the user clicks download, **Then** the original file downloads with its original filename.
2. **Given** an attachment stored in cloud storage, **When** the user requests download, **Then** a secure, time-limited download link is provided (link expires after a short period).

---

### User Story 4 — Delete Attachment (Priority: P2)

As an accountant or bookkeeper, I want to delete an attachment that was uploaded in error so that the record only contains relevant supporting documents.

**Why this priority**: Necessary for data hygiene, but less frequent than upload/view/download. Slightly lower priority because incorrect uploads are the exception, not the norm.

**Independent Test**: Delete an attachment from an invoice, verify it no longer appears in the list and the file is removed from storage.

**Acceptance Scenarios**:

1. **Given** an invoice with an attachment, **When** an authorised user deletes the attachment, **Then** the attachment is removed from the list and the stored file is deleted.
2. **Given** an attachment on a posted (immutable) journal entry, **When** a user attempts to delete it, **Then** the system allows deletion (attachments are supplementary, not part of the immutable ledger entry).
3. **Given** a user without delete permission, **When** they attempt to delete an attachment, **Then** the system returns a permission denied error.

---

### User Story 5 — Drag-and-Drop Upload in UI (Priority: P2)

As a bookkeeper working through a batch of invoices, I want to drag files from my desktop onto an invoice to attach them quickly, rather than using a file picker dialog.

**Why this priority**: UX enhancement that significantly speeds up workflows, but the feature works with a standard file picker alone. Nice-to-have on top of the core upload.

**Independent Test**: Drag a file onto the attachment drop zone of an invoice, verify it uploads and appears in the attachment list.

**Acceptance Scenarios**:

1. **Given** a user on the invoice detail page, **When** they drag a file over the attachment area, **Then** a visual drop zone indicator appears.
2. **Given** a user drags a valid file and drops it on the drop zone, **When** the drop completes, **Then** the file uploads and appears in the attachment list with a progress indicator.
3. **Given** a user drags multiple files at once, **When** they drop them, **Then** all valid files are uploaded (up to the per-object attachment limit).

---

### User Story 6 — Attachment Permissions by Role (Priority: P2)

As a workspace owner, I want attachment actions to respect role-based permissions so that auditors can view/download but not upload or delete, and clients have read-only access.

**Why this priority**: Security and compliance — roles must be enforced to maintain audit integrity.

**Independent Test**: Log in as an auditor, verify you can view and download attachments but cannot upload or delete. Log in as a client, verify view and download only.

**Acceptance Scenarios**:

1. **Given** a user with the "owner" or "accountant" role, **When** they access attachments, **Then** they can upload, view, download, and delete.
2. **Given** a user with the "bookkeeper" role, **When** they access attachments, **Then** they can upload, view, and download, but not delete.
3. **Given** a user with the "auditor" or "client" role, **When** they access attachments, **Then** they can view and download only.
4. **Given** a user with the "approver" role, **When** they access attachments, **Then** they can view and download only.

---

### Edge Cases

- What happens when a user uploads a file with the same filename as an existing attachment on the same object? → System stores both; filenames do not need to be unique per object.
- What happens when the maximum attachment count per object is reached? → System rejects the upload with a clear error message stating the limit.
- What happens when the parent object is deleted? → All associated attachments and their stored files are also deleted.
- What happens when a file upload fails midway (network interruption)? → No partial file or attachment record is created; the operation is atomic.
- What happens when storage is unavailable (disk full, S3 outage)? → System returns a clear error and does not create an orphaned attachment record.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow file uploads to the following object types: Invoice, Journal Entry, Bank Transaction, Contact, Job.
- **FR-002**: System MUST store attachments with metadata: original filename, file size (bytes), MIME type, upload timestamp, and uploading user.
- **FR-003**: System MUST enforce a maximum file size of 20MB per file.
- **FR-004**: System MUST enforce an allowlist of MIME types: PDF, JPEG, PNG, GIF, WEBP, CSV, XLSX, XLS, DOC, DOCX, TXT.
- **FR-005**: System MUST enforce a maximum of 10 attachments per object.
- **FR-006**: System MUST support file storage on local disk (for development/testing) and cloud object storage (for production), switchable via configuration.
- **FR-007**: System MUST namespace stored files by tenant and parent object to prevent cross-tenant file access.
- **FR-008**: System MUST generate secure, time-limited download URLs for cloud-stored files (expiry: 30 minutes).
- **FR-009**: System MUST delete the stored file when an attachment record is deleted.
- **FR-010**: System MUST delete all attachments when the parent object is deleted.
- **FR-011**: System MUST enforce role-based permissions: upload (owner, accountant, bookkeeper), delete (owner, accountant), view/download (all roles with object access).
- **FR-012**: System MUST prevent users from accessing attachments belonging to other tenants.
- **FR-013**: System MUST expose attachments via a dedicated endpoint per parent object (e.g., `GET /invoices/{uuid}/attachments`), not embedded in parent responses.
- **FR-014**: System MUST include `attachments_count` (integer) and `attachments_size_bytes` (integer, total bytes) in parent object API responses.
- **FR-015**: System MUST support uploading multiple files in a single request (batch upload, up to the per-object limit).
- **FR-016**: Attachments MUST be immutable once uploaded — no in-place file replacement or renaming. To correct a mistake, the user deletes and re-uploads.
- **FR-017**: System MUST route all file uploads through the server API (not direct-to-storage). The server validates, stores, and creates the attachment record atomically.
- **FR-018**: MIME type allowlist validation is sufficient file safety for MVP. No virus/malware scanning required.

### Key Entities

- **Attachment**: A file linked to an accounting object. Attributes: original filename, stored file path, file size, MIME type, upload timestamp, uploading user, parent object reference (polymorphic — type + ID).
- **Attachable Objects**: Invoice, Journal Entry, Bank Transaction, Contact, Job — any object that can have files attached.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can upload a file and see it in the attachment list within 3 seconds for files under 5MB.
- **SC-002**: All 5 supported object types accept attachments with identical behaviour.
- **SC-003**: Files uploaded by Tenant A are never accessible to Tenant B, verified by automated tests.
- **SC-004**: Switching between local and cloud storage requires only a configuration change — no code changes.
- **SC-005**: 100% of attachment operations (upload, list, download, delete) are covered by automated tests using fake storage (no real filesystem or cloud dependency in CI).
- **SC-006**: Role-based permissions are enforced for all attachment operations, verified by automated tests for each role.

## Clarifications

### Session 2026-03-11
- Q: Should attachments be immutable, replaceable, or renameable? → A: Immutable. Delete and re-upload to correct mistakes.
- Q: Should the system scan uploaded files for malware? → A: No scanning for MVP. MIME type allowlist is sufficient for trusted internal users.
- Q: How should attachments be included in parent API responses? → A: Separate endpoint only (`GET /parent/{uuid}/attachments`). Parent response includes `attachments_count` integer.
- Q: Should uploads go through Laravel API or direct-to-S3? → A: Through Laravel API. Atomic validation + storage + record creation. 20MB max makes proxying fine.
- Q: Should the API return total attachment size per object? → A: Yes. Include both `attachments_count` and `attachments_size_bytes` on parent responses to future-proof for storage quotas.
