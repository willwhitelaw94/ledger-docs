---
title: "Feature Specification: Document Storage Integration"
---

# Feature Specification: Document Storage Integration

**Feature Branch**: `061-DSI-document-storage-integration`
**Created**: 2026-03-22
**Status**: Draft
**Epic**: 061-DSI
**Initiative**: FL -- Financial Ledger Platform
**Effort**: M (2 sprints)
**Depends On**: 056-FEX (complete), 059-DGS (complete), 012-ATT (complete)

### Out of Scope

- **Cross-workspace file sharing** -- copying files between workspaces in a group is deferred
- **File versioning** -- tracking multiple versions of the same document is deferred
- **OCR / text extraction** -- no content indexing of stored documents
- **Folder templates** -- auto-creating standard folder structures per workspace type is deferred
- **Email-to-file** -- ingesting email attachments into the file explorer is deferred

---

## Overview

The file explorer (056-FEX) and document signing (059-DGS) are fully built but operate independently. Signed documents live in `signing-documents/{practice_id}/` and never appear in the workspace file explorer. Generated documents (invoices, reports) are not auto-filed. This epic bridges the gap: auto-filing signed and generated documents into the file explorer, adding file copy operations, logging file activity, enabling "send for signing" from the file explorer, and providing configurable auto-file rules per workspace.

---

## Functional Requirements

### FR1: Signed Document Auto-Filing

- **FR1.1**: When `CheckDocumentCompletion` marks a signing document as `completed`, dispatch an `AutoFileSignedDocument` action that creates a `File` record in the target workspace's file explorer. The call goes inside `CheckDocumentCompletion::handle()` after the status update and `RecordSigningEvent` call, wrapped in a try/catch so failures do not propagate.
- **FR1.2**: The `File` record is created by **copying** the original PDF from signing storage into the workspace files storage path (`files/{workspace_id}/{uuid}.pdf`). This avoids cross-concern path coupling and ensures `DeleteFile` can safely remove the file without affecting signing audit records. Fields: `original_filename` = `"{title} (Signed).pdf"`, `stored_path` = new workspace-scoped path, `disk` = `config('filesystems.default')`, `mime_type` = `application/pdf`, `size_bytes` from storage, `uploaded_by` = `signing_document.created_by` (the practice user who initiated signing).
- **FR1.3**: Target folder: a "Signed Documents" folder in the workspace, auto-created via `FileFolder::firstOrCreate(['workspace_id' => $workspaceId, 'name' => 'Signed Documents', 'parent_id' => null])` if it does not exist. The folder is a root-level folder (`parent_id = null`).
- **FR1.4**: The `File` record stores the signing document origin: `source_type = 'signing_document'`, `source_id = signing_document.id`. This links the file back to the audit trail.
- **FR1.5**: If auto-filing fails (e.g., storage path not found, quota exceeded), log a warning via `Log::warning()` but do not block the signing completion. The signing document status remains `completed`. Auto-filing does NOT check storage quota -- system-generated files bypass quota to avoid blocking critical document completion workflows.
- **FR1.6**: Auto-filing respects the workspace's auto-file rules (FR3). If a rule exists for `document_type = 'signing'`, use that folder instead of the default "Signed Documents" folder.

### FR2: File Copy Operation

- **FR2.1**: `POST /api/v1/files/{uuid}/copy` with `folder_id` (optional UUID, null = root). Creates a new `File` record in the target folder.
- **FR2.2**: Copy creates a new physical file on disk (via `Storage::copy()`) to avoid shared-path deletion issues. The new file gets a unique `stored_path` following the existing convention: `files/{workspace_id}/{new_uuid}.{extension}`.
- **FR2.3**: Copy preserves: `original_filename`, `mime_type`, `size_bytes`. Sets `uploaded_by` to the requesting user and `folder_id` to the target folder. Does NOT copy `source_type`/`source_id` -- the copy is a standalone file with no source lineage.
- **FR2.4**: Copy generates a new UUID for the new `File` record.
- **FR2.5**: Bulk copy via existing `POST /api/v1/files/bulk` endpoint -- add `copy` operation to `BulkFileOperation` alongside existing `move` and `delete`. For bulk copy, total size of all files is checked against quota before starting (not per-file).
- **FR2.6**: Copy checks workspace storage quota before proceeding via `StorageQuotaService::checkOrFail()`. Returns 422 if copying would exceed the quota.
- **FR2.7**: Copy is workspace-scoped only. The target `folder_id` must belong to the same workspace as the source file. Cross-workspace copy is out of scope.

### FR3: Auto-File Rules

- **FR3.1**: `AutoFileRule` model: `workspace_id`, `document_type` (enum), `target_folder_id` (FK to `file_folders`), `is_active` (boolean, default true).
- **FR3.2**: Supported `document_type` values: `signing`, `invoice`, `report`, `will`, `bill`, `credit_note`. Stored as a backed string enum `AutoFileDocumentType`.
- **FR3.3**: One rule per `document_type` per workspace (unique constraint on `[workspace_id, document_type]`).
- **FR3.4**: CRUD via workspace settings API. Only users with `file.manage` permission can create/update/delete rules. This is a **new permission** that must be added to `RolesAndPermissionsSeeder` -- granted to `owner` and `accountant` roles. Viewing rules requires `file.view`.
- **FR3.5**: When a document is generated or completed, the auto-filing system checks for an active rule matching the document type. If found, files into that folder. If not found, falls back to a default folder named after the document type (e.g., "Invoices", "Reports"), auto-created via `FileFolder::firstOrCreate()`.
- **FR3.6**: If the target folder referenced by a rule has been deleted (FK set to null via `nullOnDelete`), fall back to the default-named folder (not root), and log a warning.

### FR4: Generated Document Auto-Filing

- **FR4.1**: Define an `AutoFileDocument` action that accepts: `workspace_id`, `document_type` (enum), `stored_path`, `disk`, `filename`, `size_bytes`, `source_type`, `source_id`. Creates a `File` record in the appropriate folder per FR3 rules. Sets `uploaded_by` to the user who triggered generation (passed as parameter), or null if system-initiated.
- **FR4.2**: Integration hook for invoices (005-IAR): no `GenerateInvoicePdf` action currently exists. This integration is deferred to a follow-up when invoice PDF generation is implemented. The `AutoFileDocument` action will be ready to accept the call.
- **FR4.3**: Integration hook for reports (007-FRC): add a call to `AutoFileDocument::run(...)` in `ExportReportPdf` after the PDF is written to disk. Pass `document_type = 'report'`, `source_type = 'report'`, `source_id = null` (reports are not persisted models). The report PDF is stored at `reports/{workspace_id}/{uuid}.pdf` -- the auto-file action copies it into `files/{workspace_id}/` to maintain path consistency.
- **FR4.4**: Integration hook for wills (060-WEP): when a will PDF is generated, call `AutoFileDocument::run(...)` with `document_type = 'will'`. The will module is responsible for making this call.
- **FR4.5**: Auto-filing is opt-in per integration. Each module calls `AutoFileDocument` explicitly -- no global event listener. This keeps the dependency direction clear (modules depend on files, not the other way around).
- **FR4.6**: Auto-filing always creates the file if the action is called. There is no global "disable auto-filing" toggle. If a workspace has no rules configured, the action falls back to default folder names. Callers who want conditional behaviour should check before calling.

### FR5: File Activity Logging

- **FR5.1**: New `FileActivity` model: `file_id`, `event_type`, `user_id` (nullable for system events), `metadata` (JSON, nullable), `created_at` (no `updated_at` -- append-only). Workspace-scoped via `file_id -> files.workspace_id` (no direct `workspace_id` column needed).
- **FR5.2**: Event types: `uploaded`, `moved`, `copied`, `linked`, `unlinked`, `auto_filed`, `sent_for_signing`, `downloaded`, `deleted`.
- **FR5.3**: Log activity in existing actions: `UploadFile` logs `uploaded`, `MoveFile` logs `moved`, `CopyFile` logs `copied` (on the new file), `LinkFileToRecord` logs `linked`, `UnlinkFileFromRecord` logs `unlinked`, `AutoFileDocument` logs `auto_filed`, `DeleteFile` logs `deleted`. `FileController::download()` logs `downloaded`.
- **FR5.4**: Activity metadata includes contextual data: move logs `from_folder_id`, `from_folder_name`, `to_folder_id`, `to_folder_name`; link logs `linkable_type` and `linkable_id`; auto_filed logs `document_type` and `source_type`; copied logs `source_file_uuid`; sent_for_signing logs `signing_document_uuid`.
- **FR5.5**: Activity is viewable via `GET /api/v1/files/{uuid}/activity` endpoint. Returns paginated list (default 50 per page) of activities, newest first. Requires `file.view` permission.
- **FR5.6**: For auto-filed signing documents, the activity timeline can be combined with signing audit events (via `source_type = 'signing_document'` + `source_id`) on the frontend. No server-side merging needed.
- **FR5.7**: No retention policy for file activities. Activity logs are retained indefinitely (append-only). They cascade-delete when the parent file is deleted.
- **FR5.8**: The `deleted` event is logged before the file record is actually deleted. Since `file_activities` has `cascadeOnDelete` on `file_id`, the activity record will be removed with the file. This is acceptable -- deleted file history is not retained.

### FR6: Send for Signing from File Explorer

- **FR6.1**: `POST /api/v1/files/{uuid}/send-for-signing` creates a draft `SigningDocument` from the file. Only PDF files can be sent for signing (validate `mime_type = application/pdf`). Returns 422 for non-PDF files.
- **FR6.2**: The action copies the file to signing storage (`signing-documents/{practice_id}/{uuid}.pdf`) using `Storage::copy()`, creates a `SigningDocument` in `draft` status with `original_file_path` pointing to the signing storage copy, computes `file_hash` via `hash('sha256', ...)`, and returns the signing document UUID. The response includes a `redirect_url` to the signing document detail page.
- **FR6.3**: The user must have `file.view` permission on the workspace AND be a member of a practice connected to the workspace (via `practice_workspaces` pivot). Returns 403 if no practice connection. The practice is resolved via `$workspace->practices()->whereHas('users', fn($q) => $q->where('users.id', $user->id))->first()`.
- **FR6.4**: After signing completes, the signed copy auto-files back per FR1 (the standard auto-filing flow).
- **FR6.5**: The file's activity log records a `sent_for_signing` event with `signing_document_uuid` and `signing_document_title` in metadata.

### FR7: Workspace Document Settings

- **FR7.1**: Settings page at `/settings/documents` within the workspace settings area.
- **FR7.2**: List of auto-file rules with: document type label (human-readable from enum), target folder name (dropdown), active toggle (switch).
- **FR7.3**: Add/edit/delete rules. Folder dropdown populated from `GET /api/v1/folders`. "Add Rule" only shows document types not yet configured (respecting unique constraint). Delete rule with confirmation dialog.
- **FR7.4**: Default state for new workspaces: no rules (auto-filing uses default folder names).
- **FR7.5**: Guard the settings page with `file.manage` permission. Show read-only view for users with only `file.view`.

---

## Data Model

### New Table: `auto_file_rules`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `workspace_id` | FK -> workspaces, cascadeOnDelete | |
| `document_type` | varchar(30) | signing, invoice, report, will, bill, credit_note |
| `target_folder_id` | FK -> file_folders, nullable, nullOnDelete | Null = fall back to default-named folder |
| `is_active` | boolean, default true | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

Unique index: `[workspace_id, document_type]`

### New Table: `file_activities`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `file_id` | FK -> files, cascadeOnDelete | |
| `event_type` | varchar(30) | uploaded, moved, copied, linked, unlinked, auto_filed, sent_for_signing, downloaded, deleted |
| `user_id` | FK -> users, nullable, nullOnDelete | Null for system events |
| `metadata` | json, nullable | Contextual data per event type |
| `created_at` | timestamp | Append-only, no updated_at |

Index: `[file_id, created_at]`

### Modified Table: `files`

| Column | Change |
|--------|--------|
| `source_type` | ADD varchar(30), nullable -- origin: signing_document, invoice, report, will, etc. |
| `source_id` | ADD bigint unsigned, nullable -- ID of the source record |
| `uploaded_by` | ALTER to nullable -- system-generated files (auto-filed) may not have a user |

Index: `[source_type, source_id]` for reverse lookups (find the file created from a signing document).

### New Enum

- `App\Enums\AutoFileDocumentType` -- signing, invoice, report, will, bill, credit_note (backed string enum with `label()` and `defaultFolderName()` methods)

### New Permission

- `file.manage` -- added to `RolesAndPermissionsSeeder`, granted to `owner` and `accountant` roles

---

## API Endpoints

### New Endpoints

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| POST | `/api/v1/files/{uuid}/copy` | FileController@copy | Copy file to target folder |
| GET | `/api/v1/files/{uuid}/activity` | FileController@activity | File activity timeline |
| POST | `/api/v1/files/{uuid}/send-for-signing` | FileController@sendForSigning | Create signing document from file |
| GET | `/api/v1/auto-file-rules` | AutoFileRuleController@index | List workspace auto-file rules |
| POST | `/api/v1/auto-file-rules` | AutoFileRuleController@store | Create auto-file rule |
| PATCH | `/api/v1/auto-file-rules/{id}` | AutoFileRuleController@update | Update rule (folder, active toggle) |
| DELETE | `/api/v1/auto-file-rules/{id}` | AutoFileRuleController@destroy | Delete rule |

### Modified Endpoints

| Method | Path | Change |
|--------|------|--------|
| POST | `/api/v1/files/bulk` | Add `copy` operation to `BulkFileOperation` |
| GET | `/api/v1/files/{uuid}` | Include `source_type`, `source_id`, `source_label` in `FileResource` |

---

## Integration Points

### 059-DGS (Document Signing)

Hook into `CheckDocumentCompletion::handle()` -- after marking document as `completed` and recording the event, call `AutoFileSignedDocument::run($document)` wrapped in try/catch. This is a single-line addition (plus try/catch) to the existing action. The signing document's `original_file_path` is used as the source (since `signed_file_path` is never populated in the current codebase). If a future signing flow generates a merged/annotated signed PDF at `signed_file_path`, the action should prefer it.

### 060-WEP (Will & Estate Planning)

When the will builder generates a PDF, call `AutoFileDocument::run(...)` with `document_type = 'will'`. The will module is responsible for making this call.

### 005-IAR (Invoicing)

Deferred. No `GenerateInvoicePdf` action exists yet. When invoice PDF generation is implemented, it should call `AutoFileDocument::run(...)` with `document_type = 'invoice'`, `source_type = 'invoice'`, `source_id = invoice.id`.

### 007-FRC (Financial Reporting)

When a report is exported as PDF via `ExportReportPdf`, call `AutoFileDocument::run(...)` with `document_type = 'report'`. The report PDF at `reports/{workspace_id}/{uuid}.pdf` is copied to `files/{workspace_id}/` during auto-filing. Lower priority integration -- may be added in a follow-up.

---

## UI/UX Requirements

### File Explorer Enhancements

- **Context menu** on files: add "Copy to..." and "Send for Signing" (PDF only) actions. "Send for Signing" is only visible to users who belong to a practice connected to the workspace.
- **Activity tab**: new tab in `FileDetailPanel` (alongside existing info) showing chronological activity timeline via `file-activity-timeline.tsx`.
- **Source badge**: files created by auto-filing show a small badge (e.g., "Signed", "Invoice", "Report") on the file card/row in `file-list.tsx`. Badge text derived from `source_type`.
- **Drag-and-drop**: existing move behaviour -- no changes needed (already supported via `MoveFile` action).
- **Copy to dialog**: reuse `FileMoveDialog` pattern -- folder tree picker, confirm button. Named `FileCopyDialog`.

### Workspace Settings > Documents

- **`/settings/documents`** -- auto-file rules configuration
- Table of rules: document type (human label), target folder (name), active toggle (switch component)
- "Add Rule" button opens inline form: select document type (dropdown of `AutoFileDocumentType` values not yet configured for this workspace), select folder (dropdown from `GET /api/v1/folders`)
- Delete rule with confirmation
- Only visible to users with `file.manage` permission

### File Detail Panel

- New "Activity" tab alongside existing file info
- Timeline entries: icon per event type, user name (or "System"), relative timestamp, description sentence
- For auto-filed signing documents: clickable link to the signing document detail page (derived from `source_type = 'signing_document'` + `source_id`)

---

## Acceptance Criteria

### FR1: Signed Document Auto-Filing
- [ ] When all signatories sign, a `File` record appears in the workspace file explorer
- [ ] File is placed in "Signed Documents" folder (auto-created if needed)
- [ ] File is a physical copy in `files/{workspace_id}/` path (not a reference to signing storage)
- [ ] File record has `source_type = 'signing_document'` and `source_id` set
- [ ] Auto-filing failure does not block signing completion
- [ ] Custom auto-file rule for `signing` type overrides the default folder
- [ ] File activity log records an `auto_filed` event

### FR2: File Copy
- [ ] `POST /files/{uuid}/copy` creates a new file in the target folder
- [ ] Copied file has a new UUID and independent storage path
- [ ] Copied file does NOT inherit `source_type`/`source_id` from the original
- [ ] Bulk copy via `POST /files/bulk` with `operation = 'copy'` works
- [ ] Copy checks and respects storage quota (422 if exceeded)
- [ ] Copy within same workspace only -- cross-workspace copy returns 422

### FR3: Auto-File Rules
- [ ] CRUD on `auto_file_rules` via API works
- [ ] Unique constraint prevents duplicate rules per document type per workspace
- [ ] Deleted target folder causes graceful fallback to default-named folder
- [ ] `file.manage` permission is required for create/update/delete
- [ ] `file.manage` permission is added to RolesAndPermissionsSeeder for owner and accountant

### FR4: Generated Document Auto-Filing
- [ ] `AutoFileDocument` action creates a `File` record with correct folder and metadata
- [ ] Action always creates the file when called (no global disable toggle)
- [ ] Auto-filed documents are copied into `files/{workspace_id}/` path convention

### FR5: File Activity
- [ ] Upload, move, copy, link, unlink, auto-file, download, and delete events are logged
- [ ] `GET /files/{uuid}/activity` returns paginated activity list
- [ ] Activity metadata includes contextual details (folder names, linked record types)
- [ ] Activity records cascade-delete with the parent file

### FR6: Send for Signing
- [ ] `POST /files/{uuid}/send-for-signing` creates a draft signing document
- [ ] Non-PDF files return 422
- [ ] User without practice connection returns 403
- [ ] Activity log records `sent_for_signing` event
- [ ] Response includes signing document UUID and redirect URL

### FR7: Workspace Document Settings
- [ ] Settings page lists current auto-file rules
- [ ] User can add, edit, and delete rules
- [ ] Only users with `file.manage` permission can modify settings
- [ ] Users with only `file.view` see read-only view

---

## Technical Notes

### Existing Infrastructure (Do NOT Rebuild)

- `File` model -- CRUD, folder relationship, workspace scoping (exists)
- `FileFolder` model -- nested folders, workspace scoping (exists)
- `FileController` -- index, show, store, move, link, unlink, bulk, download, preview (exists)
- `FolderController` -- index, store, update, destroy (exists)
- `MoveFile` action -- moves file between folders (exists)
- `LinkFileToRecord` action -- creates polymorphic attachment link (exists)
- `BulkFileOperation` action -- bulk move and delete (exists)
- `UploadFile` action -- uploads file to storage at `files/{workspace_id}/{uuid}.{ext}` (exists)
- `DeleteFile` action -- removes file and storage (exists)
- `StorageQuotaService` -- usage and limit checks with plan tier limits (exists)
- `CheckDocumentCompletion` action -- marks signing docs complete (exists, hook point for FR1)
- `FileDetailPanel` component -- slide-over with preview, metadata, linked records (exists, extend with Activity tab)
- `FileMoveDialog` component -- folder tree picker (exists, clone pattern for FileCopyDialog)
- `use-files.ts` -- TanStack Query hooks for files and folders (exists, extend with copy/activity hooks)

### New Backend Components

- `AutoFileSignedDocument` action in `app/Actions/Files/` -- handles FR1
- `AutoFileDocument` action in `app/Actions/Files/` -- generic auto-filing for FR4
- `CopyFile` action in `app/Actions/Files/` -- handles FR2
- `SendFileForSigning` action in `app/Actions/Files/` -- handles FR6
- `LogFileActivity` action in `app/Actions/Files/` -- handles FR5
- `AutoFileRule` model in `app/Models/Tenant/`
- `FileActivity` model in `app/Models/Tenant/`
- `AutoFileRuleController` in `app/Http/Controllers/Api/`
- `AutoFileRuleResource` in `app/Http/Resources/`
- `FileActivityResource` in `app/Http/Resources/`
- `AutoFileDocumentType` enum in `app/Enums/`
- `StoreAutoFileRuleRequest` Form Request in `app/Http/Requests/Files/`
- `UpdateAutoFileRuleRequest` Form Request in `app/Http/Requests/Files/`
- `CopyFileRequest` Form Request in `app/Http/Requests/Files/`
- `SendFileForSigningRequest` Form Request in `app/Http/Requests/Files/`
- Migration: `create_auto_file_rules_table`, `create_file_activities_table`, `add_source_columns_to_files_table`
- Migration: `make_uploaded_by_nullable_on_files_table`
- Seeder update: add `file.manage` permission to `RolesAndPermissionsSeeder`

### New Frontend Components

- `frontend/src/app/w/[slug]/(dashboard)/settings/documents/page.tsx` -- auto-file rules settings
- `frontend/src/components/files/file-activity-timeline.tsx` -- activity timeline component
- `frontend/src/components/files/file-copy-dialog.tsx` -- folder picker for copy target
- `frontend/src/hooks/use-auto-file-rules.ts` -- TanStack Query hook for rules CRUD
- `frontend/src/hooks/use-file-activity.ts` -- TanStack Query hook for file activity
- `frontend/src/types/auto-file-rule.ts` -- TypeScript types for rules and activity

---

## Testing Strategy

### Feature Tests (Pest)

Tests live in `tests/Feature/Api/DocumentStorageIntegrationTest.php`:

1. **Auto-filing signed documents**: Create a signing document, mark all signatories as signed, call `CheckDocumentCompletion`, assert a `File` record exists in the "Signed Documents" folder with correct `source_type`/`source_id`.
2. **Auto-filing with custom rule**: Create an `AutoFileRule` for `signing` type pointing to a custom folder, complete a signing document, assert the file lands in the custom folder.
3. **Auto-filing failure resilience**: Mock `Storage::copy()` to throw, complete signing, assert signing document status is still `completed` and no `File` record exists.
4. **File copy**: Upload a file, POST copy, assert new UUID, assert new stored_path, assert quota decremented, assert original still exists.
5. **File copy quota check**: Set workspace near quota limit, attempt copy, assert 422.
6. **Bulk copy**: Upload 3 files, bulk copy, assert 3 new files created.
7. **Auto-file rules CRUD**: Create, read, update, delete rules. Assert unique constraint on duplicate `document_type`.
8. **Auto-file rules permission**: Assert bookkeeper/auditor/client roles get 403 on create/update/delete.
9. **File activity logging**: Upload a file, move it, copy it, assert 3 activity records with correct event_types and metadata.
10. **Activity endpoint pagination**: Create 60 activities, assert first page returns 50, second page returns 10.
11. **Send for signing**: Upload PDF, send for signing, assert signing document created in draft status, assert activity logged.
12. **Send for signing non-PDF**: Upload a DOCX, attempt send for signing, assert 422.
13. **Send for signing no practice**: User without practice connection, assert 403.
14. **Tenant isolation**: Create files in workspace A, assert workspace B cannot copy/view activity.

### Browser Tests (Playwright via Pest)

Deferred to a follow-up -- the file explorer page already has browser test coverage in `tests/Browser/`. New browser tests would cover:
- Copy dialog flow
- Activity tab in file detail panel
- Auto-file rules settings page

---

## Performance Considerations

- **File activity pagination**: Index on `[file_id, created_at]` ensures efficient queries. Default page size of 50 is sufficient.
- **Auto-file rules**: At most 6 rules per workspace (one per document type). No pagination needed for the settings page.
- **Bulk copy**: For large file counts (>10), consider queuing. For MVP, synchronous is acceptable since files are capped at 20MB each.
- **Folder firstOrCreate**: Uses a database-level unique constraint to prevent race conditions when two auto-file events fire simultaneously for the same workspace.

---

## Success Criteria

- **SC-01**: Signed document appears in file explorer within 2 seconds of signing completion.
- **SC-02**: File copy operation completes in under 5 seconds for files up to 20MB.
- **SC-03**: Auto-file rules CRUD responds in under 200ms.
- **SC-04**: File activity timeline loads in under 500ms for files with up to 100 events.
- **SC-05**: "Send for Signing" creates a draft signing document and redirects in under 3 seconds.

---

## Clarifications

20 clarification questions raised during spec review, answered from codebase analysis.

### File Storage (Q1--Q3)

**Q1: Which disk does the file explorer use, and does it match signing storage?**

Both use `config('filesystems.default')`. The `UploadFile` action sets `$disk = config('filesystems.default')` and stores at `files/{workspace_id}/{uuid}.{ext}`. The `UploadSigningDocument` action uses the same disk with path `signing-documents/{practice_id}/{uuid}.pdf`. They share the same disk but use different path prefixes. **Resolution**: Auto-filing copies files between paths on the same disk rather than creating cross-reference pointers. Updated FR1.2.

**Q2: Should auto-filed documents reference the original signing path (no duplication) or copy to workspace file storage?**

The original spec proposed referencing `signed_file_path` directly. This is problematic: (a) `signed_file_path` is never populated in the current codebase -- `CheckDocumentCompletion` does not set it; (b) `DeleteFile` calls `Storage::disk($file->disk)->delete($file->stored_path)` which would destroy the signing audit copy; (c) signing paths use `{practice_id}` scoping while files use `{workspace_id}` scoping. **Resolution**: Copy the file. The small storage cost is worth the safety. Use `original_file_path` as the source since `signed_file_path` is always null. Updated FR1.2.

**Q3: What path convention should copied files follow?**

Existing convention from `UploadFile` is `files/{workspace_id}/{uuid}.{extension}`. All auto-filed and copied files must follow this same convention for consistency with `DeleteFile` and `StorageQuotaService`. **Resolution**: Documented in FR2.2 and FR4.3.

### Auto-Filing Triggers (Q4--Q5)

**Q4: Where exactly in the signing flow should auto-filing be triggered?**

`CheckDocumentCompletion::handle()` is called from `SignDocument::handle()` after a signatory signs. It checks `allSignatoriesSigned()`, updates status to `Completed`, and records a `SigningEventType::Completed` event. The auto-filing call should go after the `RecordSigningEvent` call, wrapped in try/catch. `SignDocument::handle()` then checks completion status and sends its own notification. **Resolution**: Hook placement specified precisely in FR1.1 and Integration Points.

**Q5: Is auto-filing always-on by default, or does it require explicit opt-in per workspace?**

The original spec was ambiguous -- FR4.6 said "if the workspace has auto-filing disabled, the action is a no-op" but FR3.4 said "default state for new workspaces: no rules." This creates confusion about what happens when no rules exist. **Resolution**: Auto-filing always creates files when the action is called. If no custom rule exists, it falls back to a default-named folder (e.g., "Signed Documents", "Invoices"). Callers control opt-in by choosing whether to call the action. Updated FR4.6.

### File Move/Copy Permissions (Q6--Q7)

**Q6: What permission is required for copy? The `FilePolicy` only has `view`, `create`, and `delete`.**

The existing `FilePolicy` uses `file.view`, `file.create`, and `file.delete`. Copy is semantically a create operation (it produces a new file). **Resolution**: Copy requires `file.create` permission, checked via `CopyFileRequest::authorize()` calling `$this->user()->can('create', File::class)`.

**Q7: Can files be copied across workspaces?**

No. The `MoveFile` action already validates `$folder->workspace_id !== $file->workspace_id`. Copy follows the same pattern. Cross-workspace operations are explicitly out of scope. **Resolution**: Added FR2.7.

### Activity Logging (Q8--Q9)

**Q8: Should `FileActivity` have its own `workspace_id` column, or derive it from the file?**

The file already has `workspace_id`. Adding a redundant column creates consistency risk. Activity records are always queried via `file_id` (the API is `GET /files/{uuid}/activity`), so the join to get workspace scoping is through the file. **Resolution**: No `workspace_id` on `file_activities`. Scoping is inherited. Updated FR5.1.

**Q9: What happens to activity logs when a file is deleted? Is there a retention policy?**

`file_activities.file_id` has `cascadeOnDelete`, so activities are deleted with the file. There is no separate retention policy or archival requirement. The `deleted` event type exists for completeness but will be removed along with the file. This is acceptable for MVP -- if audit retention is needed later, soft-delete on files would preserve the chain. **Resolution**: Documented in FR5.7 and FR5.8.

### Integration with Signing (Q10--Q11)

**Q10: `signed_file_path` is never populated -- what file should be auto-filed?**

Confirmed: no code in the codebase ever writes to `signed_file_path`. The `SignDocument` action updates signatory records and metadata, but never generates a merged/annotated PDF. The only file that exists is `original_file_path`. **Resolution**: Auto-file from `original_file_path`. Name the file `"{title} (Signed).pdf"` to distinguish from the original. If a future signing flow populates `signed_file_path`, prefer it. Updated FR1.2 and Integration Points.

**Q11: `SigningDocument` is a Central model (not tenant-scoped) but has a `workspace_id`. How does the auto-filing bridge this?**

`SigningDocument` lives in `App\Models\Central` because it spans practice and workspace concerns. It has both `practice_id` and `workspace_id` FKs. The auto-filing action receives the `$document`, reads `$document->workspace_id` to determine the target workspace for the `File` record. No cross-model scoping issues because the `File` is created fresh in the tenant-scoped `files` table. **Resolution**: No spec change needed -- the current design handles this correctly.

### Integration with Invoices/Reports (Q12--Q13)

**Q12: Does a `GenerateInvoicePdf` action exist for the invoice integration hook?**

No. Searching the codebase for `GenerateInvoicePdf`, `invoice.*pdf`, or `pdf.*invoice` in `app/Actions/` yields no results. Invoice PDF generation does not exist yet. **Resolution**: Invoice auto-filing is deferred. Updated FR4.2 and Integration Points.

**Q13: How does `ExportReportPdf` store its output, and does it fit the auto-filing pattern?**

`ExportReportPdf::handle()` writes to `reports/{workspace_id}/{uuid}.pdf` using `storage_path("app/{$path}")` (local disk, outside of Laravel Storage facade). The auto-filing action needs to copy this file into the `files/{workspace_id}/` path. The action should use `Storage::put()` to read from the local path and write to the configured disk. **Resolution**: Report integration is documented but marked as lower priority. Updated FR4.3.

### Storage Quotas (Q14--Q15)

**Q14: Should auto-filed documents (system-generated) count against storage quota?**

`StorageQuotaService::getUsage()` sums `size_bytes` from the `files` table. Auto-filed documents create `File` records, so they automatically count. The question is whether auto-filing should be blocked when quota is exceeded. Blocking would mean a successfully signed document might not auto-file, which is confusing. **Resolution**: Auto-filed documents bypass quota checks. They still count toward usage (visible in the storage bar), but the system does not prevent their creation. Updated FR1.5.

**Q15: What are the storage limits per plan tier?**

From `StorageQuotaService`: Trial = 500MB, Starter = 2GB, Professional = 10GB, Enterprise = 50GB. These apply to the sum of `files` + `attachments` tables. Copy operations are the main quota concern (they duplicate physical storage). **Resolution**: No spec change -- documented for implementor awareness.

### Frontend UX (Q16--Q17)

**Q16: How should "Copy to..." be presented in the file detail panel?**

The existing `FileDetailPanel` has "Download", "Move", "Link", and "Delete" action buttons. "Copy to..." should use the same `FileMoveDialog` pattern (folder tree picker) but named `FileCopyDialog`. "Send for Signing" appears only for PDF files and only for users with a practice connection. **Resolution**: Added FileCopyDialog to frontend components list and updated UI/UX section.

**Q17: Should bulk copy show progress for large operations?**

For MVP, bulk copy is synchronous (matching existing bulk move/delete pattern in `BulkFileOperation`). The frontend `useBulkOperation` hook already handles loading states. Files are capped at 20MB each, so even 10 files = 200MB max, which completes in seconds on local/S3. **Resolution**: Synchronous for MVP. Added note in Performance Considerations about future queuing for >10 files.

### Performance (Q18--Q19)

**Q18: How will file activity scale for files with hundreds of events?**

The index `[file_id, created_at]` on `file_activities` handles this efficiently. Pagination at 50 per page means even 500 events only require 10 pages. The `FileActivity` model is append-only with no updates, so write contention is minimal. **Resolution**: Documented in Performance Considerations.

**Q19: Could `FileFolder::firstOrCreate()` race when two signing documents complete simultaneously for the same workspace?**

Yes, but `firstOrCreate` in Laravel uses `INSERT ... ON CONFLICT DO NOTHING` semantics (or equivalent). Combined with a unique index on `[workspace_id, name, parent_id]` on `file_folders`, this is safe. If the folder table does not have this unique index, one should be added. **Resolution**: Added note in Performance Considerations about database-level uniqueness.

### Testing Strategy (Q20)

**Q20: What test approach fits this feature -- unit, feature, or browser?**

The feature is primarily backend logic (auto-filing actions, copy, activity logging, permissions) with minor frontend additions. Feature tests (API-level) cover the critical paths: auto-filing flow, copy with quota, permission checks, tenant isolation. Browser tests for the new UI (activity tab, copy dialog, settings page) are lower priority and can follow in a subsequent sprint. **Resolution**: Added full Testing Strategy section with 14 specific test cases.
