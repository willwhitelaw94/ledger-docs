---
title: "Implementation Tasks: Workspace File Explorer"
---

# Implementation Tasks: Workspace File Explorer

**Mode**: AI | **Date**: 2026-03-20 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

---

## Phase 1: Foundation — Migrations, Models, Permissions

- [X] T001 Migration: `create_file_folders_table` — columns: `id` (bigIncrements), `uuid` (uuid unique), `workspace_id` (foreignId constrained to workspaces), `parent_id` (foreignId nullable constrained to file_folders), `name` (string 100), timestamps. Indexes: `workspace_id`, composite `workspace_id + parent_id`. File: `database/migrations/xxxx_create_file_folders_table.php`

- [X] T002 Migration: `create_files_table` — columns: `id` (bigIncrements), `uuid` (uuid unique), `workspace_id` (foreignId constrained to workspaces), `folder_id` (foreignId nullable constrained to file_folders onDelete set null), `original_filename` (string 255), `stored_path` (string 500), `disk` (string 20 default 'local'), `mime_type` (string 100), `size_bytes` (unsignedBigInteger), `uploaded_by` (foreignId constrained to users), `last_accessed_at` (timestamp nullable), timestamps. Indexes: `workspace_id`, `folder_id`, composite `workspace_id + mime_type`, composite `workspace_id + original_filename`, composite `workspace_id + last_accessed_at desc`. File: `database/migrations/xxxx_create_files_table.php`

- [X] T003 [P] Model: `FileFolder` — fillable: `uuid`, `workspace_id`, `parent_id`, `name`. Relationships: `workspace()` BelongsTo Workspace, `parent()` BelongsTo FileFolder (nullable), `children()` HasMany FileFolder, `files()` HasMany File. Boot: auto-generate uuid on creating. File: `app/Models/Tenant/FileFolder.php`

- [X] T004 [P] Model: `File` — fillable: `uuid`, `workspace_id`, `folder_id`, `original_filename`, `stored_path`, `disk`, `mime_type`, `size_bytes`, `uploaded_by`, `last_accessed_at`. Casts: `size_bytes` → integer, `last_accessed_at` → datetime. Relationships: `workspace()` BelongsTo Workspace, `folder()` BelongsTo FileFolder (nullable), `uploadedByUser()` BelongsTo User, `attachments()` MorphMany Attachment (as attachable). Use `HasAttachments` trait. Constants: `MAX_FILE_SIZE_KB = 20480`, `ALLOWED_MIMES` and `ALLOWED_EXTENSIONS` matching Attachment model. Boot: auto-generate uuid on creating. File: `app/Models/Tenant/File.php`

- [X] T005 Update `Relation::morphMap()` in `AppServiceProvider::boot()` — add `'file' => \App\Models\Tenant\File::class`. File: `app/Providers/AppServiceProvider.php`

- [X] T006 [P] Update `RolesAndPermissionsSeeder` — add 3 new permissions: `file.view`, `file.create`, `file.delete`. Assign to roles: owner (all 3), accountant (all 3), bookkeeper (all 3), approver (file.view only), auditor (file.view only), client (file.view only). File: `database/seeders/RolesAndPermissionsSeeder.php`

- [X] T007 [P] Policy: `FilePolicy` — methods: `viewAny` (file.view), `view` (file.view), `create` (file.create), `update` (file.create), `delete` (file.delete). Each returns `$user->hasPermissionTo('permission.name')`. Register in `AppServiceProvider::boot()` via `Gate::policy(File::class, FilePolicy::class)`. File: `app/Policies/FilePolicy.php`

- [X] T008 [P] Policy: `FolderPolicy` — methods: `viewAny` (file.view), `create` (file.create), `update` (file.create), `delete` (file.delete). Delegates to same file permissions. Register in `AppServiceProvider::boot()` via `Gate::policy(FileFolder::class, FolderPolicy::class)`. File: `app/Policies/FolderPolicy.php`

- [X] T009 [P] Service: `StorageQuotaService` — static methods: `getUsage(Workspace $workspace): int` (sum of `files.size_bytes` + `attachments.size_bytes` for workspace), `getLimit(Organisation $organisation): int` (return bytes based on PlanTier: Trial=524288000, Starter=2147483648, Professional=10737418240, Enterprise=53687091200), `hasCapacity(Workspace $workspace, int $additionalBytes): bool`, `checkOrFail(Workspace $workspace, int $additionalBytes): void` (abort 422 if over quota with usage/limit in response). File: `app/Services/StorageQuotaService.php`

---

## Phase 2: Core Actions & Form Requests

- [X] T010 Action: `UploadFile` — AsAction trait. `handle(Workspace $workspace, User $user, UploadedFile $uploadedFile, ?FileFolder $folder = null): File`. Validates MIME type + file size. Calls `StorageQuotaService::checkOrFail()`. Stores file via `Storage::disk()->putFile()`. Creates File record. Returns File model. File: `app/Actions/Files/UploadFile.php`

- [X] T011 [P] Action: `DeleteFile` — AsAction trait. `handle(File $file): void`. Deletes physical file from disk via `Storage::disk($file->disk)->delete($file->stored_path)`. Deletes all related Attachment rows (links). Deletes File record. File: `app/Actions/Files/DeleteFile.php`

- [X] T012 [P] Action: `MoveFile` — AsAction trait. `handle(File $file, ?FileFolder $folder): File`. Updates `file.folder_id`. Validates target folder belongs to same workspace. Returns updated File. File: `app/Actions/Files/MoveFile.php`

- [X] T013 [P] Action: `LinkFileToRecord` — AsAction trait. `handle(File $file, Model $record): Attachment`. Creates Attachment row with `attachable_type` + `attachable_id` pointing to the record, copies file metadata (original_filename, stored_path, disk, mime_type, size_bytes) from File, sets `uploaded_by` from File. Prevents duplicate links (same file + same record). Returns Attachment. File: `app/Actions/Files/LinkFileToRecord.php`

- [X] T014 [P] Action: `UnlinkFileFromRecord` — AsAction trait. `handle(File $file, Attachment $attachment): void`. Verifies attachment belongs to the file (attachable_type = 'file', attachable_id = file.id). Deletes Attachment row. Does NOT delete the physical file. File: `app/Actions/Files/UnlinkFileFromRecord.php`

- [X] T015 [P] Action: `BulkFileOperation` — AsAction trait. `handle(Workspace $workspace, string $operation, array $fileUuids, ?string $folderUuid = null): array`. Operations: 'delete' (calls DeleteFile for each), 'move' (calls MoveFile for each), 'download' (returns array of file paths for zip). Returns result summary. File: `app/Actions/Files/BulkFileOperation.php`

- [X] T016 Form Request: `StoreFileRequest` — authorize: `$this->user()->can('create', File::class)`. Rules: `file` required|file|max:20480|mimes matching allowed list, `folder_id` nullable|exists:file_folders,uuid (scoped to workspace). File: `app/Http/Requests/Files/StoreFileRequest.php`

- [X] T017 [P] Form Request: `MoveFileRequest` — authorize: `$this->user()->can('update', File::class)`. Rules: `folder_id` nullable|exists:file_folders,uuid (scoped to workspace). File: `app/Http/Requests/Files/MoveFileRequest.php`

- [X] T018 [P] Form Request: `LinkFileRequest` — authorize: `$this->user()->can('create', File::class)`. Rules: `record_type` required|in:invoice,bill,journal_entry,contact,job, `record_uuid` required|uuid. Validate record exists in workspace via `after()` hook. File: `app/Http/Requests/Files/LinkFileRequest.php`

- [X] T019 [P] Form Request: `BulkFileRequest` — authorize: based on operation (delete needs file.delete, move needs file.create). Rules: `operation` required|in:delete,move,download, `file_uuids` required|array|min:1, `file_uuids.*` required|uuid|exists:files,uuid (scoped to workspace), `folder_uuid` required_if:operation,move|exists:file_folders,uuid. File: `app/Http/Requests/Files/BulkFileRequest.php`

- [X] T020 [P] Form Request: `StoreFolderRequest` — authorize: `$this->user()->can('create', FileFolder::class)`. Rules: `name` required|string|max:100, `parent_id` nullable|exists:file_folders,uuid (scoped to workspace). Validate max 2 levels depth in `after()`: if parent has a parent, reject. File: `app/Http/Requests/Folders/StoreFolderRequest.php`

- [X] T021 [P] Form Request: `UpdateFolderRequest` — authorize: `$this->user()->can('update', $this->route('folder'))`. Rules: `name` required|string|max:100. File: `app/Http/Requests/Folders/UpdateFolderRequest.php`

---

## Phase 3: API Resources & Controllers

- [X] T022 Resource: `FileResource` — returns: `uuid`, `source` ('file'), `original_filename`, `mime_type`, `size_bytes`, `type_category` (computed: documents/spreadsheets/images/other based on mime_type), `folder` (FolderResource if folder_id set, null otherwise), `linked_records` (array of `{type, uuid, label}` from attachments relationship where attachable_type != 'file'), `uploaded_by` (object with `id`, `name`), `preview_url` ("/api/v1/files/{uuid}/preview"), `download_url` ("/api/v1/files/{uuid}/download"), `is_previewable` (true for image/* and application/pdf), `last_accessed_at`, `created_at`. File: `app/Http/Resources/FileResource.php`

- [X] T023 [P] Resource: `FolderResource` — returns: `uuid`, `name`, `parent` (FolderResource if parent_id set, null otherwise), `file_count` (count of files in folder), `has_subfolders` (boolean), `created_at`. File: `app/Http/Resources/FolderResource.php`

- [X] T024 Controller: `FileController` — 12 methods. File: `app/Http/Controllers/Api/FileController.php`
  - `index(Request)`: Gate::authorize viewAny File. Query `File::where('workspace_id', ...)` with `when()` filters: search (LIKE on original_filename), type (mime_type category mapping), folder_id, sort + sort_dir. Paginate 50. Return FileResource::collection.
  - `counts(Request)`: Gate::authorize viewAny File. `selectRaw('mime_type, count(*)')` grouped, map to type categories. Return JSON.
  - `storage(Request)`: Gate::authorize viewAny File. Call StorageQuotaService::getUsage + getLimit. Return JSON `{used_bytes, limit_bytes, percentage}`.
  - `store(StoreFileRequest)`: Call UploadFile action. Return FileResource 201.
  - `show(Request, File $file)`: Gate::authorize view. Update `last_accessed_at`. Return FileResource.
  - `download(Request, File $file)`: Gate::authorize view. Return Storage::download response with original filename.
  - `preview(Request, File $file)`: Gate::authorize view. Return Storage::response with inline content-disposition.
  - `destroy(Request, File $file)`: Gate::authorize delete. Call DeleteFile action. Return 204.
  - `move(MoveFileRequest, File $file)`: Call MoveFile action. Return FileResource.
  - `link(LinkFileRequest, File $file)`: Resolve record from request. Call LinkFileToRecord action. Return AttachmentResource 201.
  - `unlink(Request, File $file, Attachment $attachment)`: Gate::authorize update. Call UnlinkFileFromRecord action. Return 204.
  - `bulk(BulkFileRequest)`: Call BulkFileOperation action. Return JSON result.

- [X] T025 [P] Controller: `FolderController` — 4 methods. File: `app/Http/Controllers/Api/FolderController.php`
  - `index(Request)`: Gate::authorize viewAny FileFolder. Query all workspace folders with children and file counts. Return FolderResource::collection.
  - `store(StoreFolderRequest)`: Create FileFolder. Return FolderResource 201.
  - `update(UpdateFolderRequest, FileFolder $folder)`: Update name. Return FolderResource.
  - `destroy(Request, FileFolder $folder)`: Gate::authorize delete. Check no children (abort 422 if subfolders exist). Move contained files to parent_id (or null). Delete folder. Return 204.

- [X] T026 Register routes in `routes/api.php` — inside workspace-scoped group. Add:
  ```
  Route::get('files', [FileController::class, 'index']);
  Route::get('files/counts', [FileController::class, 'counts']);
  Route::get('files/storage', [FileController::class, 'storage']);
  Route::post('files', [FileController::class, 'store']);
  Route::post('files/bulk', [FileController::class, 'bulk']);
  Route::get('files/{file:uuid}', [FileController::class, 'show']);
  Route::get('files/{file:uuid}/download', [FileController::class, 'download']);
  Route::get('files/{file:uuid}/preview', [FileController::class, 'preview']);
  Route::delete('files/{file:uuid}', [FileController::class, 'destroy']);
  Route::patch('files/{file:uuid}/move', [FileController::class, 'move']);
  Route::post('files/{file:uuid}/link', [FileController::class, 'link']);
  Route::delete('files/{file:uuid}/link/{attachment:uuid}', [FileController::class, 'unlink']);
  Route::get('folders', [FolderController::class, 'index']);
  Route::post('folders', [FolderController::class, 'store']);
  Route::patch('folders/{folder:uuid}', [FolderController::class, 'update']);
  Route::delete('folders/{folder:uuid}', [FolderController::class, 'destroy']);
  ```

---

## Phase 4: Backend Tests

- [X] T027 Feature Test: `FileControllerTest` — ~20 tests. Seed RolesAndPermissionsSeeder in beforeEach. Test: index returns files for workspace, index excludes other workspace files, index search filters by filename, index type filter works, index pagination at 50, counts returns correct type counts, storage returns usage and limit, store uploads file and creates record, store rejects unsupported mime type, store rejects file over 20MB, store blocks upload when quota exceeded, show returns file detail and updates last_accessed_at, download returns file with original filename, preview returns inline response, destroy deletes file and physical storage, destroy deletes linked attachments, move changes folder_id, link creates attachment record, unlink removes attachment record, bulk delete removes multiple files, bulk move moves multiple files, permission denied for client role upload, permission denied for auditor role delete. File: `tests/Feature/Api/FileControllerTest.php`

- [X] T028 [P] Feature Test: `FolderControllerTest` — ~10 tests. Test: index returns workspace folders, store creates folder, store creates subfolder, store rejects 3rd level nesting, update renames folder, destroy moves files to parent, destroy prevents deletion with subfolders, permission denied for client role create, folders scoped to workspace. File: `tests/Feature/Api/FolderControllerTest.php`

---

## Phase 5: Frontend — Types, Hooks, Navigation [US1]

- [X] T029 [P] TypeScript types — define `File`, `Folder`, `FileResource`, `FolderResource`, `StorageUsage`, `FileCounts`, `FileFilterParams`, `BulkOperation` types matching API response shapes. File: `frontend/src/types/files.ts`

- [X] T030 TanStack Query hooks — create all hooks. File: `frontend/src/hooks/use-files.ts`
  - `fileKeys` query key factory: `all`, `list(params)`, `detail(uuid)`, `counts`, `storage`
  - `useFiles(params?: FileFilterParams)` — GET /files with search, type, folder_id, sort, per_page
  - `useFile(uuid: string)` — GET /files/{uuid}
  - `useFileCounts()` — GET /files/counts
  - `useStorageUsage()` — GET /files/storage
  - `useUploadFile()` — POST /files with FormData, invalidates list + counts + storage
  - `useDeleteFile()` — DELETE /files/{uuid}, invalidates list + counts + storage
  - `useMoveFile()` — PATCH /files/{uuid}/move, invalidates list
  - `useLinkFile()` — POST /files/{uuid}/link, invalidates detail
  - `useUnlinkFile()` — DELETE /files/{uuid}/link/{attachmentUuid}, invalidates detail
  - `useBulkOperation()` — POST /files/bulk, invalidates list + counts + storage
  - `folderKeys` query key factory
  - `useFolders()` — GET /folders
  - `useCreateFolder()` — POST /folders, invalidates folders
  - `useRenameFolder()` — PATCH /folders/{uuid}, invalidates folders
  - `useDeleteFolder()` — DELETE /folders/{uuid}, invalidates folders + list

- [X] T031 Update sidebar navigation — add Files nav item: `{ url: '/files', title: 'Files', icon: FolderOpen (from lucide-react), shortcut: 'G then E' }`. Position in primaryNav. File: `frontend/src/lib/navigation.ts`

---

## Phase 6: Frontend — File List Page [US1] [US5]

- [X] T032 Page: `/files` — client component. Renders `FileExplorer` client component. Added to both `(dashboard)` and `w/[slug]/(dashboard)` layout groups. File: `frontend/src/app/(dashboard)/files/page.tsx` + `frontend/src/app/w/[slug]/(dashboard)/files/page.tsx`

- [X] T033 Component: `FileExplorer` — 'use client'. Main layout component. Three-column layout: folder sidebar (left, collapsible), file list (center), detail panel (right, slide-out). Manages state: `activeFolder`, `selectedFiles`, `selectedFile`, `searchQuery`, `typeFilter`, `sortBy`. Wires up all child components. File: `frontend/src/components/files/file-explorer.tsx`

- [X] T034 [P] Component: `FileList` — renders DataTable (TanStack Table v8) with columns: checkbox (multi-select), file type icon, filename, size (formatted), uploaded by, date, linked record. Supports sort by clicking column headers. Shows pagination controls. Props: `files`, `isLoading`, `selectedFiles`, `onSelectFiles`, `onFileClick`, `onSort`. File: `frontend/src/components/files/file-list.tsx`

- [X] T035 [P] Component: `FileTypeFilter` — uses StatusTabs pattern. Tabs: All, Documents, Spreadsheets, Images, Other. Shows count per tab from `useFileCounts()`. Props: `activeType`, `onTypeChange`, `counts`. File: `frontend/src/components/files/file-type-filter.tsx`

- [X] T036 [P] Component: `StorageUsageBar` — shows progress bar with `{used} / {limit}` text. Colour changes: green (<70%), amber (70-90%), red (>90%). Props: `usedBytes`, `limitBytes`. File: `frontend/src/components/files/storage-usage-bar.tsx`

- [X] T037 [P] Component: `BulkActionsBar` — visible when `selectedFiles.length > 0`. Buttons: Download, Move to Folder, Delete. Shows "{N} files selected". Triggers `useBulkOperation()`. Confirm dialog before bulk delete. Props: `selectedFiles`, `onClearSelection`. File: `frontend/src/components/files/bulk-actions-bar.tsx`

- [X] T038 [P] Component: `EmptyState` — illustrated empty state when workspace has no files. Shows upload icon, "No files yet" heading, "Upload your first file" subtext, upload button. File: `frontend/src/components/files/empty-state.tsx`

---

## Phase 7: Frontend — Upload [US2]

- [X] T039 Component: `FileUploadZone` — drag-and-drop zone + "Upload" button. Accepts multiple files. Client-side validation: file type (ALLOWED_EXTENSIONS), file size (20 MB max). Shows upload progress per file. On quota exceeded (422 response), shows usage/limit and upgrade prompt. Calls `useUploadFile()` for each file. Props: `folderId` (nullable, current folder context). File: `frontend/src/components/files/file-upload-zone.tsx`

---

## Phase 8: Frontend — Folders [US3]

- [X] T040 Component: `FolderTree` — sidebar folder navigation. Shows flat list of root folders, expandable to show subfolders. "New Folder" button at top. Click folder to navigate into it (sets `activeFolder`). Context menu: Rename, Delete. Props: `folders`, `activeFolder`, `onFolderSelect`. File: `frontend/src/components/files/folder-tree.tsx`

- [X] T041 [P] Component: `FolderBreadcrumbs` — breadcrumb trail: Root > Folder > Subfolder. Each segment clickable to navigate. Shows current folder name. Props: `folder` (nullable), `onNavigate`. File: `frontend/src/components/files/folder-breadcrumbs.tsx`

- [X] T042 [P] Component: `FileMoveDialog` — dialog with folder picker. Shows folder tree with radio selection. Includes "Root" option. Confirms move via `useMoveFile()` or `useBulkOperation('move')`. Props: `fileUuids`, `onClose`. File: `frontend/src/components/files/file-move-dialog.tsx`

---

## Phase 9: Frontend — Detail Panel & Linking [US1] [US4]

- [X] T043 Component: `FileDetailPanel` — slide-out panel (right side, 420px). Shows: file preview (PDF embed or image tag for previewable types, file icon for others), metadata (filename, type, size, uploader, date), linked records list (each with unlink button), action buttons (Download, Delete, Move, Link). Props: `fileUuid`, `onClose`. File: `frontend/src/components/files/file-detail-panel.tsx`

- [X] T044 [P] Component: `FileLinkDialog` — search dialog for linking file to record. Tabs: Invoices, Bills, Contacts, Journal Entries, Jobs. Search input queries existing records. Select record + confirm creates link via `useLinkFile()`. Props: `fileUuid`, `onClose`. File: `frontend/src/components/files/file-link-dialog.tsx`

---

## Phase 10: Frontend — Recents [US6]

- [X] T045 Component: `RecentFiles` — horizontal scrollable row of 10 most recent files (by `last_accessed_at` desc, falling back to `created_at`). Each shows thumbnail/icon + filename. Click opens detail panel. Only visible at root level (not inside folders). Props: `onFileClick`. File: `frontend/src/components/files/recent-files.tsx`

---

## Phase 11: Keyboard Shortcuts & Polish

- [X] T046 Register keyboard shortcuts on `/files` page — using `useHotkeys` (react-hotkeys-hook). Shortcuts: `N` (toggle upload zone), `/` (focus search input), `Escape` (close detail panel / clear selection). File: `frontend/src/components/files/file-explorer.tsx`

- [X] T047 [P] Update keyboard shortcut help overlay — add `G then E` → "Files" in the navigation shortcuts section. File: `frontend/src/components/layout/keyboard-shortcuts-overlay.tsx`

- [X] T048 Frontend TypeScript compilation verified — `npx tsc --noEmit` passes with zero errors in new files. Pre-existing errors in other files are unrelated.

---

## Phase 12: Browser Tests

- [X] T049 Browser Test: `FilesTest` — ~10 tests. Login as admin. Test: navigate to /files via sidebar, upload a file via upload button, verify file appears in list, click file to open detail panel, create a folder, navigate into folder, delete a file with confirmation, bulk select and delete, search by filename filters list, empty state shown when no files. File: `tests/Browser/FilesTest.php`
