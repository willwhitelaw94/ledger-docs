---
title: "Implementation Plan: Workspace File Explorer"
---

# Implementation Plan: Workspace File Explorer

**Branch**: `feature/056-FEX-file-explorer` | **Date**: 2026-03-20 | **Spec**: [spec.md](./spec.md)
**Status**: Draft

## Summary

Build a workspace-scoped file management system with a new `File` model (separate from `Attachment`), a `Folder` model for organisation, and a `/files` page in the Next.js frontend. The explorer displays both standalone `File` uploads and existing record-attached `Attachment` rows in a unified view. Linking a file to a record creates an `Attachment` row pointing back to the `File`.

---

## Technical Context

**Backend**: Laravel 12, PHP 8.4, SQLite (local), Pest v4
**Frontend**: Next.js 16, React 19, TypeScript, TanStack Query v5, Zustand v5, shadcn/ui
**Storage**: Local disk (dev), S3 ap-southeast-2 (production) — uses existing `filesystems.php` config
**Auth**: Sanctum cookie auth, Spatie Permission with workspace teams
**Testing**: Pest (Feature + Unit), Playwright (Browser)
**Constraints**: 20 MB max file size, storage quotas per PlanTier (500 MB → 50 GB), design for 10,000 files per workspace

### Dependencies
- Existing `Attachment` model + `HasAttachments` trait (read-only integration — no modifications)
- Existing `AttachmentResource` (for unified view query)
- `PlanTier` enum + `FeatureGate` service (storage quota enforcement)
- `SetWorkspaceContext` middleware (workspace scoping)
- `RolesAndPermissionsSeeder` (new permissions)

---

## Gate 3: Architecture Check

### 1. Technical Feasibility

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | New File/Folder models + controller, queries both tables for unified view |
| Existing patterns leveraged | PASS | Follows AttachmentController pattern, reuses UploadAttachment action pattern |
| No impossible requirements | PASS | All 27 FRs are buildable with existing infrastructure |
| Performance considered | PASS | Server-side pagination at 50 per page, indexed queries on workspace_id |
| Security considered | PASS | Workspace scoping, role-based permissions, file type validation |

### 2. Data & Integration

| Check | Status | Notes |
|-------|--------|-------|
| Data model understood | PASS | File (new), Folder (new), File→Attachment link (polymorphic) |
| API contracts clear | PASS | 12 endpoints defined below |
| Dependencies identified | PASS | No new packages, extends existing storage/auth infrastructure |
| Integration points mapped | PASS | File→Attachment bridging, PlanTier quota checks, sidebar nav |
| DTO persistence explicit | PASS | Actions accept validated data, not raw arrays |

### 3. Implementation Approach

| Check | Status | Notes |
|-------|--------|-------|
| File changes identified | PASS | See Source Code Structure below |
| Risk areas noted | PASS | Unified view query performance, multi-record linking |
| Testing approach defined | PASS | Feature tests per controller, browser tests for upload/browse |
| Rollback possible | PASS | Feature flag `file_explorer`, migration reversible |

### 4. Resource & Scope

| Check | Status | Notes |
|-------|--------|-------|
| Scope matches spec | PASS | No over-engineering — V1 scope only |
| Effort reasonable | PASS | ~2-3 sprints across 3 phases |
| Skills available | PASS | Standard Laravel + React patterns |

### 5. Laravel Best Practices

| Check | Status | Notes |
|-------|--------|-------|
| No hardcoded business logic | PASS | Quota limits from PlanTier, permissions from Spatie |
| Cross-platform reusability | PASS | All logic in API, frontend renders |
| Model route binding | PASS | Controllers use `File $file`, `Folder $folder` |
| Use Lorisleiva Actions | PASS | UploadFile, DeleteFile, MoveFile, LinkFileToRecord |
| Action authorization in authorize() | PASS | Auth checks in action authorize() |
| Data classes remain anemic | PASS | DTOs for file metadata only |
| Migrations schema-only | PASS | Schema only, seed data in seeders |
| Granular model policies | PASS | FilePolicy, FolderPolicy |

### 6. Frontend Standards (Next.js/React — per CLAUDE.md overrides)

| Check | Status | Notes |
|-------|--------|-------|
| All components use TypeScript | PASS | Every .tsx file strict TS |
| Props typed with interfaces/types | PASS | `type Props = { ... }` pattern |
| No `any` types | PASS | API response types in `types/files.ts` |
| TanStack Query for server state | PASS | `useFiles`, `useFolders`, `useUploadFile` hooks |
| Zustand for client state | PASS | File selection state, view preferences |
| Forms use React Hook Form + Zod | PASS | Folder create/rename forms |
| Server/client components explicit | PASS | Page = server, interactive components = client |

---

## Data Model

### New Tables

#### `files`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | Auto-increment |
| uuid | uuid | Unique, public identifier |
| workspace_id | bigint FK | Tenant scoping |
| folder_id | bigint FK nullable | Parent folder (null = root) |
| original_filename | string(255) | Display name |
| stored_path | string(500) | Storage path on disk |
| disk | string(20) | Storage disk (local, s3) |
| mime_type | string(100) | File MIME type |
| size_bytes | bigint | File size in bytes |
| uploaded_by | bigint FK | User who uploaded |
| last_accessed_at | timestamp nullable | For "Recents" feature |
| created_at | timestamp | |
| updated_at | timestamp | |

**Indexes**: `workspace_id`, `folder_id`, `workspace_id + mime_type`, `workspace_id + original_filename`, `workspace_id + last_accessed_at DESC`

#### `file_folders`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | Auto-increment |
| uuid | uuid | Unique, public identifier |
| workspace_id | bigint FK | Tenant scoping |
| parent_id | bigint FK nullable | Parent folder (null = root, max 2 levels) |
| name | string(100) | Folder display name |
| created_at | timestamp | |
| updated_at | timestamp | |

**Indexes**: `workspace_id`, `workspace_id + parent_id`

### Model Relationships

```
File belongsTo Workspace
File belongsTo Folder (nullable)
File belongsTo User (uploaded_by)
File morphMany Attachment (as attachable) — for record linking
Folder belongsTo Workspace
Folder belongsTo Folder (parent, nullable)
Folder hasMany Folder (children)
Folder hasMany File
```

### Unified View Query

The `/files` index endpoint queries **both** tables to present all workspace documents:

1. **File records** — standalone uploads and files in folders
2. **Attachment records** — existing attachments on records (invoice, JE, contact, etc.)

These are merged into a single paginated response using a union query or two separate queries merged in the resource layer. The `FileResource` normalises both sources into a common shape.

---

## API Contracts

### File Endpoints

| Method | Path | Action | Auth |
|--------|------|--------|------|
| GET | `/api/v1/files` | List all workspace files (unified view) | `file.view` |
| GET | `/api/v1/files/counts` | File type counts for filter tabs | `file.view` |
| GET | `/api/v1/files/storage` | Storage usage vs quota | `file.view` |
| POST | `/api/v1/files` | Upload standalone file | `file.create` |
| GET | `/api/v1/files/{uuid}` | Get file detail | `file.view` |
| GET | `/api/v1/files/{uuid}/download` | Download file | `file.view` |
| GET | `/api/v1/files/{uuid}/preview` | Preview file (inline) | `file.view` |
| DELETE | `/api/v1/files/{uuid}` | Delete file | `file.delete` |
| PATCH | `/api/v1/files/{uuid}/move` | Move file to folder | `file.create` |
| POST | `/api/v1/files/{uuid}/link` | Link file to record | `file.create` |
| DELETE | `/api/v1/files/{uuid}/link/{attachmentUuid}` | Unlink file from record | `file.create` |
| POST | `/api/v1/files/bulk` | Bulk operations (delete, move, download) | `file.create` / `file.delete` |

### Folder Endpoints

| Method | Path | Action | Auth |
|--------|------|--------|------|
| GET | `/api/v1/folders` | List workspace folders | `file.view` |
| POST | `/api/v1/folders` | Create folder | `file.create` |
| PATCH | `/api/v1/folders/{uuid}` | Rename folder | `file.create` |
| DELETE | `/api/v1/folders/{uuid}` | Delete folder (moves files to parent) | `file.delete` |

### Query Parameters (GET /files)

| Param | Type | Notes |
|-------|------|-------|
| search | string | Filename search (LIKE) |
| type | string | Filter: `documents`, `spreadsheets`, `images`, `other` |
| folder_id | uuid | Filter by folder (null = root + all attachments) |
| sort | string | `name`, `created_at`, `size_bytes`, `mime_type` |
| sort_dir | string | `asc`, `desc` |
| per_page | int | Default 50 |
| source | string | `all` (default), `files_only`, `attachments_only` |

### Response Shape (FileResource)

```json
{
  "uuid": "...",
  "source": "file|attachment",
  "original_filename": "contract.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 204800,
  "type_category": "documents",
  "folder": { "uuid": "...", "name": "Contracts" },
  "linked_records": [
    { "type": "invoice", "uuid": "...", "label": "INV-0042" }
  ],
  "uploaded_by": { "id": 1, "name": "Emma Chen" },
  "preview_url": "/api/v1/files/{uuid}/preview",
  "download_url": "/api/v1/files/{uuid}/download",
  "is_previewable": true,
  "last_accessed_at": "2026-03-20T10:00:00Z",
  "created_at": "2026-03-15T14:30:00Z"
}
```

---

## Source Code Structure

### Backend (New Files)

```
app/
├── Actions/Files/
│   ├── UploadFile.php              # Upload + store + quota check
│   ├── DeleteFile.php              # Delete file + linked attachments
│   ├── MoveFile.php                # Move to folder
│   ├── LinkFileToRecord.php        # Create Attachment pointing to File
│   ├── UnlinkFileFromRecord.php    # Remove Attachment link
│   └── BulkFileOperation.php       # Bulk delete, move, download
├── Http/
│   ├── Controllers/Api/
│   │   ├── FileController.php      # 12 endpoints
│   │   └── FolderController.php    # 4 endpoints
│   ├── Requests/Files/
│   │   ├── StoreFileRequest.php    # Upload validation
│   │   ├── MoveFileRequest.php     # Folder ID validation
│   │   ├── LinkFileRequest.php     # Record type + ID validation
│   │   └── BulkFileRequest.php     # Bulk operation validation
│   ├── Requests/Folders/
│   │   ├── StoreFolderRequest.php  # Name + parent validation
│   │   └── UpdateFolderRequest.php # Rename validation
│   └── Resources/
│       ├── FileResource.php        # Unified file response
│       └── FolderResource.php      # Folder response
├── Models/Tenant/
│   ├── File.php                    # New model
│   └── FileFolder.php             # New model
├── Policies/
│   ├── FilePolicy.php             # file.view, file.create, file.delete
│   └── FolderPolicy.php           # Delegates to file permissions
└── Services/
    └── StorageQuotaService.php     # Check/enforce per-tier quotas

database/migrations/
├── xxxx_create_files_table.php
└── xxxx_create_file_folders_table.php

database/seeders/
└── (update RolesAndPermissionsSeeder.php — add file.view, file.create, file.delete)

routes/api.php (add file + folder routes)

tests/Feature/Api/
├── FileControllerTest.php          # ~20 tests
└── FolderControllerTest.php        # ~10 tests
```

### Frontend (New Files)

```
frontend/src/
├── app/(dashboard)/files/
│   └── page.tsx                    # Files page (server component wrapper)
├── components/files/
│   ├── file-list.tsx               # Main file list with table
│   ├── file-detail-panel.tsx       # Slide-out detail with preview
│   ├── file-upload-zone.tsx        # Drag-drop upload area
│   ├── folder-breadcrumbs.tsx      # Breadcrumb navigation
│   ├── folder-tree.tsx             # Sidebar folder navigation
│   ├── file-type-filter.tsx        # Type category filter tabs
│   ├── file-link-dialog.tsx        # "Link to record" search dialog
│   ├── file-move-dialog.tsx        # "Move to folder" dialog
│   ├── bulk-actions-bar.tsx        # Multi-select action bar
│   ├── storage-usage-bar.tsx       # Quota usage indicator
│   └── recent-files.tsx            # Recent files section
├── hooks/
│   └── use-files.ts                # TanStack Query hooks (useFiles, useFolders, useUploadFile, etc.)
├── types/
│   └── files.ts                    # File, Folder, FileResource types
└── lib/navigation.ts              # (update — add /files nav item with G then L shortcut)
```

---

## Implementation Phases

### Phase 1: Foundation (Backend Core)

**Goal**: File and Folder models, migrations, CRUD API, permissions, storage quota service.

1. Create `files` and `file_folders` migrations
2. Create `File` and `FileFolder` models with relationships
3. Add `file.view`, `file.create`, `file.delete` permissions to `RolesAndPermissionsSeeder`
4. Create `FilePolicy` and `FolderPolicy`
5. Create `StorageQuotaService` (check usage against PlanTier limits)
6. Create Actions: `UploadFile`, `DeleteFile`, `MoveFile`
7. Create `FileController` with: index, store, show, download, preview, destroy, move
8. Create `FolderController` with: index, store, update, destroy
9. Create Form Requests: `StoreFileRequest`, `MoveFileRequest`, `StoreFolderRequest`, `UpdateFolderRequest`
10. Create `FileResource` and `FolderResource`
11. Register routes in `api.php`
12. Write Feature tests: FileControllerTest (~20 tests), FolderControllerTest (~10 tests)

**Deliverable**: Fully tested backend API for files and folders.

### Phase 2: Unified View + Linking (Backend Advanced)

**Goal**: Unified view combining File + Attachment records, record linking/unlinking, bulk operations.

1. Implement unified view query in `FileController::index` — merge File records with Attachment records (excluding Attachments that are linked to Files)
2. Create `/files/counts` endpoint (type category counts)
3. Create `/files/storage` endpoint (usage vs quota)
4. Create `LinkFileToRecord` action — creates Attachment row with `attachable_type = 'file'` pointing to the record
5. Create `UnlinkFileFromRecord` action — removes the Attachment link
6. Add link/unlink endpoints to FileController
7. Create `BulkFileOperation` action + endpoint
8. Handle record deletion cascade — when a record is deleted, Attachment links to Files become orphaned; File remains standalone
9. Write Feature tests for linking, bulk ops, unified view

**Deliverable**: Complete backend API including unified browsing and record linking.

### Phase 3: Frontend (Next.js)

**Goal**: `/files` page with full UI — list, upload, preview, folders, linking, bulk ops.

1. Create TypeScript types (`types/files.ts`)
2. Create TanStack Query hooks (`hooks/use-files.ts`)
3. Build `/files` page with layout:
   - Left: folder tree navigation
   - Center: file list with search, type filters, sort, pagination
   - Right: slide-out detail panel on file click
4. Build `FileUploadZone` — drag-drop + file picker, quota enforcement
5. Build `FileDetailPanel` — preview, metadata, linked records, actions
6. Build `FolderBreadcrumbs` + `FolderTree`
7. Build `FileTypeFilter` (StatusTabs pattern: All, Documents, Spreadsheets, Images, Other)
8. Build `FileLinkDialog` — search across record types
9. Build `FileMoveDialog` — folder picker
10. Build `BulkActionsBar` — multi-select toolbar
11. Build `StorageUsageBar` — quota indicator in page header
12. Build `RecentFiles` — top section with 10 most recent
13. Build empty state (illustrated, with upload CTA)
14. Add `/files` to sidebar navigation with `G then L` shortcut
15. Register keyboard shortcuts: `N` (new folder), `/` (search), `J/K` (navigate), `Enter` (open)
16. Write browser tests: upload, browse, folder navigation, delete

**Deliverable**: Complete /files page matching spec.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Unified view query performance at scale (10k files + attachments) | Medium | Medium | Index on workspace_id, server-side pagination, consider caching counts |
| File upload failures on slow connections | Low | Low | Client-side progress indicator, chunked upload for large files (future) |
| Storage quota race condition (concurrent uploads) | Low | Medium | Atomic quota check in UploadFile action using DB transaction |
| Attachment orphaning on record deletion | Low | Low | File remains standalone; no data loss. Covered by FR-018 |
| Morph map conflict with new File model | Low | High | Register `'file'` in morphMap in AppServiceProvider. Test thoroughly. |

---

## Testing Strategy

### Phase 1 Tests (~30 tests)

**Feature Tests (FileControllerTest)**:
- CRUD operations: list, upload, show, download, preview, delete
- Permission checks: owner/accountant/bookkeeper can upload, client/auditor cannot
- Workspace isolation: files from workspace A not visible to workspace B
- Storage quota enforcement: upload blocked when quota exceeded
- File type validation: reject unsupported MIME types
- File size validation: reject files over 20 MB

**Feature Tests (FolderControllerTest)**:
- CRUD: create, rename, delete
- Nesting: create subfolder, prevent 3rd level
- Deletion: files move to parent, prevent delete with subfolders
- Permission checks

### Phase 2 Tests (~15 tests)

- Unified view: File + Attachment records appear together
- Counts endpoint: correct counts per type category
- Storage endpoint: accurate usage calculation
- Link/unlink: create Attachment, verify bidirectional
- Bulk operations: multi-delete, multi-move
- Record deletion cascade: files survive

### Phase 3 Tests (~10 browser tests)

- Upload flow: drag-drop, verify file appears in list
- Browse: search, filter by type, sort, paginate
- Folder navigation: create folder, navigate, breadcrumbs
- Detail panel: click file, see preview + metadata
- Delete: confirm dialog, file removed
- Bulk select: select multiple, bulk delete
