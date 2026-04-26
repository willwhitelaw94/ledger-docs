---
title: "Feature Specification: Workspace File Explorer"
---

# Feature Specification: Workspace File Explorer

**Feature Branch**: `056-FEX-file-explorer`
**Created**: 2026-03-20
**Status**: Approved (Gate 1 passed 2026-03-20)

## Overview

Each workspace needs a central place to store, browse, and organise documents. Today, files can only be attached to specific records (invoices, journal entries, contacts, jobs, bank transactions). There is no way to upload a standalone document, browse all workspace files in one view, or organise documents into folders.

The Workspace File Explorer gives every business entity a `/files` page — a lightweight document area where users can upload files independently of any record, organise them in folders, search across all workspace documents (both standalone and record-attached), and link files to records after the fact.

Think of it as Xero's "Files" section: simple, workspace-scoped, and purpose-built for accounting document management — not a full-blown cloud storage product.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse All Workspace Files in One Place (Priority: P1)

A bookkeeper needs to find a supplier contract they uploaded last month. Instead of hunting through individual invoices, contacts, and journal entries, they open the `/files` page and see every document across the workspace — both standalone uploads and files attached to records. They can search by filename, filter by type, and sort by date.

**Why this priority**: Without a central browsable view, users have no way to discover or locate files across the workspace. This is the foundational capability.

**Independent Test**: Seed a workspace with attachments on several records and standalone files. Open `/files` and verify all documents appear in a single searchable list.

**Acceptance Scenarios**:

1. **Given** a workspace has files attached to invoices, contacts, and journal entries, **When** the user opens `/files`, **Then** all files across the workspace are listed in a single view with filename, type, size, upload date, and linked record (if any).
2. **Given** the file list is displayed, **When** the user types a search term, **Then** results are filtered by filename in real time.
3. **Given** the file list is displayed, **When** the user filters by file type (e.g. PDF, Images, Spreadsheets), **Then** only files matching that type are shown.
4. **Given** the file list is displayed, **When** the user clicks a file, **Then** a detail panel opens showing a file preview (for PDFs and images), metadata, and the linked record (if any) with a link to navigate to that record.
5. **Given** the workspace has more than 50 files, **When** the user opens `/files`, **Then** the list is paginated with server-side pagination, loading 50 files per page.
6. **Given** the workspace has no files, **When** the user opens `/files`, **Then** an illustrated empty state is displayed with a prompt to upload their first file.

---

### User Story 2 — Upload Standalone Files (Priority: P1)

An accountant receives a trust deed via email. It doesn't belong to any specific invoice or journal entry — it's a general workspace document. They open `/files`, drag the PDF into the upload zone, and the file is stored against the workspace. No record link required.

**Why this priority**: Today, every file must be attached to a record. Users have no way to store general workspace documents like contracts, compliance certificates, or reference materials.

**Independent Test**: Upload a PDF to `/files` without linking it to any record. Verify it appears in the file list and can be previewed and downloaded.

**Acceptance Scenarios**:

1. **Given** the user is on the `/files` page, **When** they drag a file onto the upload zone or click the upload button, **Then** the file is uploaded and appears in the file list as a standalone document (no linked record).
2. **Given** the user uploads a file, **When** the upload completes, **Then** the file shows the uploader's name, upload date, file size, and type.
3. **Given** the user uploads multiple files at once, **When** the upload completes, **Then** all files appear in the list individually.
4. **Given** the user attempts to upload an unsupported file type, **When** the upload is attempted, **Then** a clear error message is shown and the file is not stored.
5. **Given** the user uploads a file exceeding the maximum size (20 MB), **When** the upload is attempted, **Then** a clear error message is shown.
6. **Given** the workspace has reached its storage quota, **When** the user attempts to upload a file, **Then** the upload is blocked with a message showing the current usage, the plan limit, and a prompt to upgrade.

---

### User Story 3 — Organise Files in Folders (Priority: P2)

A business owner wants to keep their workspace documents tidy. They create folders — "Contracts", "Tax Returns", "Insurance" — and move files into them. Folders can be nested one level deep (e.g. "Contracts / Suppliers").

**Why this priority**: Without folders, the file list becomes unwieldy as the workspace accumulates documents. Basic organisation is essential for any document area to be useful long-term.

**Independent Test**: Create a folder, upload a file into it, create a subfolder, move a file into the subfolder. Verify the folder structure is navigable and files appear in the correct locations.

**Acceptance Scenarios**:

1. **Given** the user is on the `/files` page, **When** they click "New Folder" and enter a name, **Then** a folder is created and appears in the file list.
2. **Given** a folder exists, **When** the user clicks on it, **Then** the view navigates into the folder showing its contents, with a breadcrumb trail back to the root.
3. **Given** files exist at the root level, **When** the user selects files and chooses "Move to folder", **Then** the files are moved into the selected folder.
4. **Given** a folder exists, **When** the user creates a subfolder inside it, **Then** the subfolder appears within the parent folder (maximum one level of nesting).
5. **Given** a user attempts to create a third level of nesting, **When** the action is attempted, **Then** it is prevented with a message explaining the two-level limit.
6. **Given** a folder contains files, **When** the user renames the folder, **Then** the folder name is updated and all contained files remain intact.
7. **Given** a folder contains files but no subfolders, **When** the user deletes the folder, **Then** all files in the folder are moved to the parent folder (or root if there is no parent) and the folder is removed.
8. **Given** a folder contains subfolders, **When** the user attempts to delete the folder, **Then** the deletion is prevented with a message explaining that subfolders must be emptied or deleted first.

---

### User Story 4 — Link Files to Records After Upload (Priority: P2)

A bookkeeper uploaded a supplier statement last week as a standalone file. Today, they're reconciling and want to attach it to the relevant bill. From the file detail panel, they click "Link to record", search for the bill, and the file is now associated with that bill — visible both in `/files` and on the bill's attachment list.

**Why this priority**: Standalone uploads are more useful when they can be connected to records later. This bridges the gap between the file explorer and the existing attachment system.

**Independent Test**: Upload a standalone file. Link it to an existing invoice. Verify the file appears on both the `/files` page (showing the linked record) and the invoice's attachment list.

**Acceptance Scenarios**:

1. **Given** a standalone file exists in the file explorer, **When** the user opens the file detail panel and clicks "Link to record", **Then** a search dialog appears allowing them to search across invoices, bills, contacts, journal entries, and jobs.
2. **Given** the user selects a record to link, **When** they confirm, **Then** the file is linked to that record and the linked record name appears on the file in the explorer.
3. **Given** a file is linked to a record, **When** the user views that record's detail page, **Then** the file appears in the record's attachment list.
4. **Given** a file is linked to a record, **When** the user unlinks it from the file detail panel, **Then** the file reverts to a standalone document and is removed from the record's attachment list.
5. **Given** a file is already linked to a record, **When** the user attempts to link it to a second record, **Then** the file is linked to both records (a file can be linked to multiple records).

---

### User Story 5 — Download, Delete, and Bulk Operations (Priority: P1)

A user needs to download a copy of a document or remove a file that was uploaded in error. They can download individual files or select multiple files for bulk download. Deletion requires confirmation and respects permissions. Bulk operations allow users to efficiently manage many files at once.

**Why this priority**: Download and delete are fundamental file operations. Without them, the file explorer is a one-way street. Bulk operations prevent tedious one-by-one management.

**Independent Test**: Upload a file, download it, verify the downloaded file matches. Delete a file, verify it no longer appears in the list. Select multiple files, move them to a folder in bulk, then bulk delete them.

**Acceptance Scenarios**:

1. **Given** a file exists in the explorer, **When** the user clicks the download button, **Then** the file is downloaded to their device with the original filename.
2. **Given** multiple files are selected, **When** the user clicks "Download", **Then** all selected files are downloaded (individually or as a zip archive).
3. **Given** a standalone file exists, **When** the user clicks "Delete" and confirms, **Then** the file is permanently removed from the workspace.
4. **Given** a file is linked to a record, **When** the user deletes it from the explorer, **Then** it is removed from both the explorer and the record's attachment list, with a warning shown before confirmation.
5. **Given** a user with the "client" role, **When** they attempt to delete a file, **Then** the action is denied — only owner, accountant, and bookkeeper roles can delete files.
6. **Given** multiple files are selected, **When** the user clicks "Move to folder" from the bulk actions bar, **Then** all selected files are moved to the chosen folder.
7. **Given** multiple files are selected, **When** the user clicks "Delete" from the bulk actions bar and confirms, **Then** all selected files are permanently removed, with linked-file warnings shown where applicable.

---

### User Story 6 — Recent Files Quick Access (Priority: P3)

When a user first opens `/files`, they see their most recently uploaded or viewed files at the top — a "Recents" section — before the full folder/file tree. This saves time for users who are working with the same documents repeatedly.

**Why this priority**: A quality-of-life improvement that makes the file explorer feel more responsive and personal, but not essential for the core experience.

**Independent Test**: Upload three files at different times. Open `/files` and verify the most recently uploaded file appears first in the Recents section.

**Acceptance Scenarios**:

1. **Given** the user opens `/files`, **When** the page loads, **Then** a "Recent" section at the top shows the 10 most recently uploaded or accessed files across all folders.
2. **Given** the user clicks on a file to preview it, **When** they return to `/files` later, **Then** that file appears in the Recents section.

---

### Edge Cases

- **Record deletion**: When a record with linked files is deleted (e.g. a voided invoice), the files remain in the explorer as standalone documents — unlinking from the deleted record automatically.
- **Duplicate filenames**: Two files can have the same filename. Both are stored independently. The file list shows upload date and uploader to differentiate.
- **Storage quota exceeded**: The system displays current usage and warns before the limit is reached. Upload is blocked when the quota is exceeded, with a prompt to upgrade the plan or free up space.
- **AI Document Inbox (019-AIX)**: Not a hard dependency. When AIX is built, confirmed inbox items that produce attachments will surface in the file explorer. The file explorer works independently without AIX. FR-022 is a "when available" integration.
- **External sharing**: Not in this epic. External sharing (signed URLs, client portal access) is a future consideration.
- **Workspace deletion**: All files are permanently deleted with the workspace after the retention period.
- **Folder deletion**: Deleting a folder moves its contained files to the parent folder (or root). Folders containing subfolders cannot be deleted until subfolders are emptied or deleted first. This prevents accidental file loss.
- **File versioning**: Explicitly out of scope for this epic. Uploading a file with the same name as an existing file creates a new independent file — no automatic overwrite or version chain. File versioning adds significant complexity and is deferred to a future iteration.
- **Practice advisor access**: Practice advisors with an active connection to a client workspace can view and download files (read-only). They cannot upload, move, or delete files unless they also hold a direct workspace role (accountant/bookkeeper/owner). This matches the existing practice management access pattern.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each workspace MUST have a `/files` page accessible from the main navigation sidebar with the keyboard shortcut `G then L`.
- **FR-002**: The `/files` page MUST display all files in the workspace — both standalone uploads and files attached to records — in a unified list view.
- **FR-003**: Each file in the list MUST show: filename, file type icon, file size, upload date, uploader name, linked record (if any), and folder location.
- **FR-004**: Users MUST be able to search files by filename with real-time filtering.
- **FR-005**: Users MUST be able to filter files by type category: All, Documents (PDF, DOC, DOCX), Spreadsheets (XLS, XLSX, CSV), Images (JPG, PNG, GIF, WEBP), and Other.
- **FR-006**: Users MUST be able to sort files by name, date uploaded, size, or type.
- **FR-007**: Users MUST be able to upload files via drag-and-drop or file picker, with or without linking to a record.
- **FR-008**: Supported file types MUST match the existing attachment system: PDF, JPG, JPEG, PNG, GIF, WEBP, CSV, TXT, XLS, XLSX, DOC, DOCX.
- **FR-009**: Maximum file size MUST be 20 MB per file, matching the existing attachment limit.
- **FR-010**: Users MUST be able to create folders and subfolders (maximum two levels deep: root > folder > subfolder).
- **FR-011**: Users MUST be able to move files between folders via a "Move to" action.
- **FR-012**: Users MUST be able to rename folders.
- **FR-013**: Clicking a file MUST open a detail panel showing: file preview (PDF and image types), full metadata, linked records, and action buttons (download, delete, link/unlink, move).
- **FR-014**: Users MUST be able to link a standalone file to one or more records (invoice, bill, journal entry, contact, job) via a search dialog.
- **FR-015**: Users MUST be able to unlink a file from a record, reverting it to a standalone document.
- **FR-016**: Users MUST be able to download individual files or multiple selected files.
- **FR-017**: Users MUST be able to delete files with a confirmation dialog. Deleting a linked file MUST remove it from the associated record's attachment list.
- **FR-018**: When a record with linked files is deleted or voided, the linked files MUST remain in the explorer as standalone documents.
- **FR-019**: The `/files` page MUST show a "Recent" section displaying the 10 most recently uploaded or accessed files.
- **FR-020**: Access to the `/files` page MUST be available to all workspace roles. File upload, move, link, and delete actions MUST be restricted to owner, accountant, and bookkeeper roles. Approver, auditor, and client roles have read-only access (view and download only). Practice advisors with an active workspace connection have read-only access (view and download); they cannot upload, move, or delete files unless they also hold a direct workspace role.
- **FR-021**: The file explorer MUST display workspace storage usage (total size of all files) in the page header, showing current usage against the plan quota.
- **FR-022**: Files from confirmed AI Document Inbox items (019-AIX) MUST appear in the file explorer automatically, linked to the record they created. This is a "when available" integration — the file explorer works independently without AIX.
- **FR-023**: The file list MUST use server-side pagination for workspaces with more than 50 files, loading 50 files per page.
- **FR-024**: Storage quotas MUST be enforced per workspace based on the billing plan tier: Trial — 500 MB, Starter — 2 GB, Professional — 10 GB, Enterprise — 50 GB. Uploads MUST be blocked when the quota is exceeded, with a clear message showing current usage, the plan limit, and a prompt to upgrade.
- **FR-025**: Users MUST be able to select multiple files and perform bulk operations: bulk delete, bulk move-to-folder, and bulk download. Bulk link-to-record is not supported in this version.
- **FR-026**: Deleting a folder MUST move all contained files to the parent folder (or root if no parent). Folders containing subfolders MUST NOT be deletable until all subfolders are removed first.
- **FR-027**: When the workspace has no files, the `/files` page MUST display an illustrated empty state with an upload prompt.

### Key Entities

- **File** (new model): A document stored in the workspace. The `File` model is separate from the existing `Attachment` model. Standalone uploads create `File` records. Carries: filename, mime type, file size (bytes), stored path, disk, uploader (user), upload date, folder (optional), workspace scope. A file can exist without being linked to any record.
- **Folder**: A workspace-scoped organisational container. Has a name, optional parent folder (one level of nesting), and belongs to a workspace. Folders are empty containers — they do not have permissions independent of the workspace.
- **File-Record Link**: When a file is linked to a record (invoice, bill, journal entry, contact, job), an `Attachment` row is created pointing to the `File`. A file can have zero or many links. Existing `Attachment` rows (created before the file explorer) remain unchanged — the explorer queries both the `File` table and the `Attachment` table to present a unified view of all workspace documents.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can find any workspace document within 15 seconds using search or folder navigation.
- **SC-002**: Uploading a standalone file takes under 10 seconds for a typical 2 MB document.
- **SC-003**: 100% of files attached to records via the existing attachment system are visible in the file explorer without any migration or manual action.
- **SC-004**: Users can link a standalone file to a record in under 3 clicks from the file detail panel.
- **SC-005**: Zero files from one workspace are visible to users of another workspace.
- **SC-006**: Files survive record deletion — when a linked record is voided or removed, the file remains accessible as a standalone document.

---

## Clarifications

Decisions made during spec review on 2026-03-20.

### Q1: Data Model — File vs Attachment

**Decision**: New `File` model separate from `Attachment`. Standalone files are `File` records. Linking a file to a record creates an `Attachment` row pointing to the `File`. Existing `Attachment` rows remain unchanged — the explorer queries both tables to present a unified view.

### Q2: Storage Quotas

**Decision**: Tied to billing plan tiers via the existing `PlanTier` enum and `FeatureGate` service. Quotas per workspace: Trial — 500 MB, Starter — 2 GB, Professional — 10 GB, Enterprise — 50 GB. Usage is displayed in the file explorer page header. Uploads are blocked when the quota is exceeded with a message showing usage, the plan limit, and a prompt to upgrade.

### Q3: Folder Deletion Behaviour

**Decision**: Deleting a folder moves all contained files to the parent folder (or root if no parent). Folders cannot be deleted while containing subfolders — subfolders must be emptied or deleted first. This prevents accidental file loss while keeping the operation simple.

### Q4: Practice Management Access

**Decision**: Practice advisors with an active connection to a client workspace can view and download files (read-only), matching their existing access pattern from 015-ACT and 027-PMV. They cannot upload, move, or delete files unless they also hold a direct workspace role (accountant/bookkeeper/owner).

### Q5: File Versioning

**Decision**: Explicitly out of scope for V1. Each upload creates a new independent file, even if the filename matches an existing file. The file list differentiates by upload date and uploader. File versioning adds significant complexity and is deferred to a future iteration.

### Q6: Keyboard Navigation Shortcut

**Decision**: `G then L` (for fiLes) since `G then F` is already assigned to Feed.

### Q7: Pagination

**Decision**: Server-side pagination for workspaces with more than 50 files, loading 50 files per page. Matches the project-wide convention from the Data Grid Standards.

### Q8: Bulk Operations

**Decision**: Support bulk delete, bulk move-to-folder, and bulk download via multi-select. Bulk link-to-record is out of scope for V1 — the record search dialog is designed for single-file linking and extending it to bulk would add significant complexity.

### Q9: Empty State

**Decision**: Show an illustrated empty state with upload prompt when the workspace has no files, following the project's existing empty state patterns.

### Q10: AI Document Inbox (019-AIX) Dependency

**Decision**: Not a hard dependency. FR-022 is a "when available" integration — the file explorer works independently. When AIX is built, confirmed items will surface in the explorer automatically.
