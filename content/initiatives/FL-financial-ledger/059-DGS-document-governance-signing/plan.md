---
title: "Implementation Plan: Document Governance & Signing"
---

# Implementation Plan: Document Governance & Signing

**Branch**: `feature/059-DGS-document-governance-signing` | **Date**: 2026-03-20 | **Spec**: [spec.md](/initiatives/FL-financial-ledger/059-DGS-document-governance-signing/spec)

## Summary

In-platform document signing workflow for accounting practices. Practices upload PDFs (engagement letters, authorities to act, privacy consents), send to client signatories, and track signing status from a central governance dashboard. Clients review documents inline and sign with typed name + consent confirmation. Every action is audit-logged with IP, timestamp, and user agent. A signature certificate page is appended to the final PDF as an immutable legal record. Includes template system with merge fields and bulk send.

## Technical Context

**Language/Version**: PHP 8.4 (Laravel 12), TypeScript (Next.js 16, React 19)
**Primary Dependencies**: Spatie Permission (teams mode), TanStack Query v5, React Hook Form + Zod, react-pdf (already installed), signature_pad (new)
**Storage**: SQLite (local), single-database multi-tenancy — signing documents are central (practice-owned), not workspace-scoped
**Testing**: Pest v4 (feature + browser via Playwright)
**Target Platform**: Web SPA (Next.js frontend + Laravel API)
**Constraints**: PDF-only uploads, consent-based electronic signatures (not PKI), max 20MB per PDF, max 10 signatories per document, max 50 documents per bulk send

## Gate 3: Architecture Check

### 1. Technical Feasibility

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | Central models owned by practice, follows `PracticeTask` pattern |
| Existing patterns leveraged | PASS | Lorisleiva Actions, Form Requests, API Resources, TanStack Query hooks |
| No impossible requirements | PASS | All FRs buildable with current stack + FPDI/TCPDF for PDF manipulation |
| Performance considered | PASS | Bulk send of 50 docs is lightweight text substitution, synchronous within 60s |
| Security considered | PASS | Proxy download endpoints, practice-scoped access, immutability enforcement at Action layer |

### 2. Data & Integration

| Check | Status | Notes |
|-------|--------|-------|
| Data model understood | PASS | 4 new tables: `signing_documents`, `signing_document_signatories`, `signing_document_templates`, `signing_document_events` |
| API contracts clear | PASS | 18 endpoints across 3 controllers |
| Dependencies identified | PASS | 012-ATT (complete), 027-PMV (complete), 023-EML (complete) |
| Integration points mapped | PASS | Notification system (024-NTF), email infrastructure (023-EML), attachment patterns (012-ATT) |
| DTO persistence explicit | PASS | Form Request validated() to Action params, no toArray() into create() |

### 3. Implementation Approach

| Check | Status | Notes |
|-------|--------|-------|
| File changes identified | PASS | See File Manifest |
| Risk areas noted | PASS | PDF text-layer manipulation, merge field replacement, large PDF browser rendering |
| Testing approach defined | PASS | Feature tests, unit tests (hash/PDF), browser tests (signing flow) |
| Rollback possible | PASS | All new tables are additive, no existing tables modified |

### 4. Laravel Best Practices

| Check | Status | Notes |
|-------|--------|-------|
| Use Lorisleiva Actions | PASS | All business logic in Actions under `app/Actions/Signing/` |
| Form Requests for validation | PASS | Every mutation endpoint has a Form Request |
| API Resources for responses | PASS | All responses wrapped in Resources |
| Model route binding | PASS | UUID-based route binding via `getRouteKeyName()` |
| Sanctum cookie auth | PASS | All practice routes under `auth:sanctum` middleware |
| Migrations schema-only | PASS | Permissions seeded via `RolesAndPermissionsSeeder` update |

### 5. Next.js/React Standards

| Check | Status | Notes |
|-------|--------|-------|
| All components TypeScript | PASS | Every `.tsx` file uses strict TypeScript |
| Props typed with interfaces | PASS | Types defined in `types/signing.ts` |
| No `any` types | PASS | All API response types defined |
| TanStack Query for server state | PASS | Hooks in `use-signing.ts` |
| React Hook Form + Zod | PASS | Document creation form, signature capture form |
| Existing components reused | PASS | Extract `PdfViewer` from `document-preview.tsx` into shared component |

### Overall: PASS — No red flags

---

## Architecture Overview

### Document Lifecycle

```
                    ┌─────────┐
                    │  DRAFT  │ ◄── Practice creates, uploads PDF, adds signatories
                    └────┬────┘
                         │ send()
                    ┌────▼────┐
              ┌─────│  SENT   │─────┐
              │     └────┬────┘     │
              │          │          │
         expires_at  all signed  cancel()
              │          │          │
        ┌─────▼───┐ ┌───▼─────┐ ┌──▼───────┐
        │ EXPIRED │ │COMPLETED│ │CANCELLED │
        └─────────┘ └─────────┘ └──────────┘
```

- `draft`: document created, signatories can be added/removed, PDF can be replaced
- `sent`: notifications dispatched, signatories can view/sign/decline; document is immutable once any signatory has signed
- `completed`: all signatories signed; signature certificate appended to PDF
- `expired`: `expires_at` passed without full completion; set by scheduled command
- `cancelled`: practice user cancelled (owner/manager only)

The `declined` status is a virtual StatusTabs filter only -- it matches documents in `sent` status where any signatory has `status = declined`. The `signing_documents.status` column never stores `declined`.

### Storage Architecture

PDFs are stored on the default filesystem disk (matching `UploadAttachment` pattern):

| File | Path | When Created |
|------|------|-------------|
| Original PDF | `signing-documents/{practice_id}/{uuid}.pdf` | Upload or template generation |
| Signed PDF + certificate | `signing-documents/{practice_id}/{uuid}-signed.pdf` | All signatories complete |
| Template PDF | `signing-templates/{practice_id}/{uuid}.pdf` | Template upload |

File paths are never exposed in API responses. Two proxy endpoints stream files after access validation:
- `GET /api/v1/signing-requests/{uuid}/pdf` -- signatory access (validates user is listed signatory)
- `GET /api/v1/practice/signing-documents/{uuid}/download` -- practice access (validates practice membership)

### Hash Chain for Tamper Evidence

1. **Upload time**: SHA-256 hash of original PDF computed and stored in `signing_documents.file_hash`
2. **Sign time**: each signatory's `signed` event metadata includes the `file_hash` (proves they signed the same document)
3. **Completion time**: signature certificate page appended to PDF; SHA-256 hash of the complete signed PDF stored in the `completed` event metadata
4. **Verification**: re-hash stored files and compare against recorded hashes

Hash computation in PHP:
```php
$hash = hash('sha256', Storage::disk($disk)->get($path));
```

### Immutability Enforcement

- `SoftDeletes` trait is NOT used on `SigningDocument` -- documents are never deleted, only cancelled
- `UpdateSigningDocument` action checks for any signatory with `status = signed` and throws `DomainException` if modification is attempted
- `signing_document_events` table has no `updated_at` column -- events are append-only
- Signed PDF stored as a separate file; original preserved unchanged

### Security Model

- **Practice users**: access gated by practice membership (`$user->practices()->first()`) + Spatie Permission (`signing-document.view`, etc.)
- **Bookkeeper scoping**: bookkeepers see only documents for workspaces they are assigned to (via `PracticeMemberAssignment`), matching `PracticeTaskController` pattern
- **Client signatories**: access gated by signatory record lookup (`signing_document_signatories.user_id = auth user`)
- **File access**: proxy endpoints with authentication + authorization; no direct file URLs

---

## Data Model

### New Tables

#### `signing_documents` (central -- practice-owned)

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| uuid | char(36) UNIQUE | Public identifier, route model binding key |
| practice_id | bigint FK (practices) | cascadeOnDelete |
| workspace_id | bigint FK (workspaces) | cascadeOnDelete |
| title | varchar(255) | Document title |
| description | text nullable | Optional description/instructions |
| original_file_path | varchar(500) | Path to uploaded/generated PDF |
| signed_file_path | varchar(500) nullable | Path to signed PDF with certificate |
| file_hash | varchar(64) | SHA-256 hash of original PDF |
| status | varchar(20) | draft, sent, completed, expired, cancelled |
| template_id | bigint FK nullable (signing_document_templates) | Source template |
| created_by | bigint FK (users) | Practice user who created |
| sent_at | timestamp nullable | |
| expires_at | timestamp nullable | Default: 30 days from send |
| completed_at | timestamp nullable | |
| cancelled_at | timestamp nullable | |
| last_reminded_at | timestamp nullable | |
| created_at | timestamp | |
| updated_at | timestamp | |

Indexes: `(practice_id, status)`, `(practice_id, workspace_id, status)`, `(uuid)` UNIQUE

#### `signing_document_signatories`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| signing_document_id | bigint FK | cascadeOnDelete |
| user_id | bigint FK nullable | nullOnDelete -- preserved with denormalised name/email |
| contact_id | bigint FK nullable | nullOnDelete |
| email | varchar(255) | Always populated (denormalised) |
| name | varchar(255) | Always populated (denormalised) |
| status | varchar(20) | pending, viewed, signed, declined |
| signature_method | varchar(20) nullable | typed, drawn |
| typed_name | varchar(255) nullable | |
| signature_image | text nullable | Base64-encoded drawn signature PNG |
| consent_text | text nullable | Full consent statement shown at signing |
| decline_reason | text nullable | |
| signed_at | timestamp nullable | |
| viewed_at | timestamp nullable | |
| ip_address | varchar(45) nullable | IPv4 or IPv6 |
| user_agent | text nullable | |
| last_reminded_at | timestamp nullable | |
| created_at | timestamp | |
| updated_at | timestamp | |

Indexes: `(signing_document_id)`, `(user_id, status)` for signing requests query

#### `signing_document_templates` (central -- practice-owned)

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| uuid | char(36) UNIQUE | |
| practice_id | bigint FK (practices) | cascadeOnDelete |
| name | varchar(255) | |
| category | varchar(50) | engagement, privacy, authority, compliance, other |
| file_path | varchar(500) | Path to template PDF |
| merge_fields | json | Array of merge field names |
| is_archived | boolean default false | |
| created_by | bigint FK (users) | nullOnDelete |
| created_at | timestamp | |
| updated_at | timestamp | |

Index: `(practice_id, is_archived)`

#### `signing_document_events` (audit log -- append-only)

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| signing_document_id | bigint FK | cascadeOnDelete |
| event_type | varchar(30) | created, sent, viewed, signed, declined, reminded, expired, cancelled, downloaded |
| user_id | bigint FK nullable | Actor (null for system events) |
| ip_address | varchar(45) nullable | |
| user_agent | text nullable | |
| metadata | json nullable | e.g., decline reason, signatory_id, file_hash |
| created_at | timestamp | No updated_at -- immutable |

Index: `(signing_document_id, event_type)`

---

## API Contracts

### Practice Signing Document Controller

| Method | Path | Action | Notes |
|--------|------|--------|-------|
| GET | `/v1/practice/signing-documents` | `index` | Paginated list, filterable by status, workspace_id, search |
| GET | `/v1/practice/signing-documents/counts` | `counts` | Status counts for StatusTabs |
| POST | `/v1/practice/signing-documents` | `store` | Create draft (multipart: PDF file + metadata) |
| GET | `/v1/practice/signing-documents/{uuid}` | `show` | Detail with signatories + audit trail |
| PATCH | `/v1/practice/signing-documents/{uuid}` | `update` | Update draft (title, description, expiry) |
| POST | `/v1/practice/signing-documents/{uuid}/send` | `send` | Transition draft to sent |
| POST | `/v1/practice/signing-documents/{uuid}/cancel` | `cancel` | Cancel document |
| POST | `/v1/practice/signing-documents/{uuid}/remind` | `remind` | Resend reminder to unsigned signatories |
| POST | `/v1/practice/signing-documents/{uuid}/extend` | `extend` | Extend expiry date |
| GET | `/v1/practice/signing-documents/{uuid}/download` | `download` | Proxy download signed/original PDF |
| POST | `/v1/practice/signing-documents/bulk-send` | `bulkSend` | Bulk send from template |
| GET | `/v1/practice/signing-documents/{uuid}/events` | `events` | Audit trail events |

### Practice Document Template Controller

| Method | Path | Action | Notes |
|--------|------|--------|-------|
| GET | `/v1/practice/document-templates` | `index` | List active templates |
| POST | `/v1/practice/document-templates` | `store` | Create template (multipart: PDF + metadata) |
| GET | `/v1/practice/document-templates/{uuid}` | `show` | Template detail |
| PATCH | `/v1/practice/document-templates/{uuid}` | `update` | Update metadata |
| POST | `/v1/practice/document-templates/{uuid}/archive` | `archive` | Archive template |

### Signing Request Controller (client-facing)

| Method | Path | Action | Notes |
|--------|------|--------|-------|
| GET | `/v1/signing-requests` | `index` | Documents awaiting current user's signature |
| GET | `/v1/signing-requests/{uuid}` | `show` | Document detail for signatory |
| POST | `/v1/signing-requests/{uuid}/view` | `markViewed` | Record first view |
| POST | `/v1/signing-requests/{uuid}/sign` | `sign` | Submit signature |
| POST | `/v1/signing-requests/{uuid}/decline` | `decline` | Decline with reason |
| GET | `/v1/signing-requests/{uuid}/pdf` | `streamPdf` | Proxy PDF stream |

---

## Third-Party Dependencies

### PHP (Backend)

| Package | Purpose | Notes |
|---------|---------|-------|
| `setasign/fpdi` | Read existing PDF pages | MIT license, well-maintained, used for importing PDF pages |
| `tecnickcom/tcpdf` | Generate signature certificate page | LGPL-3.0, the de facto PHP PDF generation library |

FPDI reads the original PDF pages; TCPDF generates the signature certificate page; FPDI+TCPDF combine them into the final signed PDF. Both packages are mature, production-grade, and widely used together.

Install:
```bash
composer require setasign/fpdi tecnickcom/tcpdf
```

### JavaScript (Frontend)

| Package | Purpose | Notes |
|---------|---------|-------|
| `react-pdf` | PDF viewer | Already installed (used in `document-preview.tsx`) |
| `signature_pad` | Drawn signature canvas | MIT license, 5k+ stars, framework-agnostic, lightweight |

Install:
```bash
cd frontend && npm install signature_pad
```

---

## Implementation Phases

### Phase 1: Backend Foundation + Document Upload (Sprint 1)

**Migrations:**
- `database/migrations/2026_03_20_100001_create_signing_documents_table.php` -- all 4 tables in a single migration file (signing_documents, signing_document_signatories, signing_document_templates, signing_document_events) with composite indexes

**Enums:**
- `app/Enums/Signing/SigningDocumentStatus.php` -- `draft`, `sent`, `completed`, `expired`, `cancelled`
- `app/Enums/Signing/SigningSignatoryStatus.php` -- `pending`, `viewed`, `signed`, `declined`
- `app/Enums/Signing/SigningEventType.php` -- `created`, `sent`, `viewed`, `signed`, `declined`, `reminded`, `expired`, `cancelled`, `downloaded`
- `app/Enums/Signing/SignatureMethod.php` -- `typed`, `drawn`
- `app/Enums/Signing/DocumentTemplateCategory.php` -- `engagement`, `privacy`, `authority`, `compliance`, `other`

**Models:**
- `app/Models/Central/SigningDocument.php` -- `getRouteKeyName()` returns `'uuid'`, relationships to practice, workspace, signatories, events, template, createdBy. No `SoftDeletes`.
- `app/Models/Central/SigningDocumentSignatory.php` -- relationships to document, user, contact
- `app/Models/Central/SigningDocumentTemplate.php` -- `getRouteKeyName()` returns `'uuid'`, relationship to practice
- `app/Models/Central/SigningDocumentEvent.php` -- no `updated_at` (`const UPDATED_AT = null`), relationship to document and user

**Actions:**
- `app/Actions/Signing/UploadSigningDocument.php` -- validates PDF MIME type, stores file at `signing-documents/{practice_id}/{uuid}.pdf`, computes SHA-256 hash, creates `SigningDocument` record in `draft` status, creates `created` audit event
- `app/Actions/Signing/UpdateSigningDocument.php` -- checks immutability (throws `DomainException` if any signatory has `status = signed`), updates title/description/expires_at
- `app/Actions/Signing/AddSignatory.php` -- validates document is in `draft` status, validates max 10 signatories, creates `SigningDocumentSignatory` with denormalised name/email
- `app/Actions/Signing/RemoveSignatory.php` -- validates document is in `draft` status
- `app/Actions/Signing/SendSigningDocument.php` -- validates at least 1 signatory, transitions to `sent`, records `sent_at`, creates `sent` audit event, dispatches notifications to all signatories
- `app/Actions/Signing/CancelSigningDocument.php` -- validates document is not `completed`, transitions to `cancelled`, records `cancelled_at`, creates `cancelled` audit event
- `app/Actions/Signing/RecordSigningEvent.php` -- generic audit event creator (used by all actions); captures IP, user agent, metadata

**Controllers:**
- `app/Http/Controllers/Api/SigningDocumentController.php` -- practice-scoped, 12 methods (index, counts, store, show, update, send, cancel, remind, extend, download, bulkSend, events). Resolves practice via `$request->user()->practices()->first()`. Scopes bookkeeper access via `PracticeMemberAssignment`.

**Form Requests:**
- `app/Http/Requests/Signing/StoreSigningDocumentRequest.php` -- validates PDF file (max 20MB, `application/pdf` MIME), title (required, max 255), description (nullable), workspace_id (required, exists), signatories (array, min 1, max 10)
- `app/Http/Requests/Signing/UpdateSigningDocumentRequest.php` -- title, description, expires_at (nullable, date, after:today)
- `app/Http/Requests/Signing/SendSigningDocumentRequest.php` -- authorize checks `signing-document.send` permission
- `app/Http/Requests/Signing/CancelSigningDocumentRequest.php` -- authorize checks `signing-document.cancel` permission

**Policy:**
- `app/Policies/SigningDocumentPolicy.php` -- `viewAny`, `view`, `create`, `send`, `cancel`, `manageTemplates`, `bulkSend` methods using `hasPermissionTo()`

**Resources:**
- `app/Http/Resources/SigningDocumentResource.php` -- includes signatory summary (signed_count/total_count), status, timestamps; never includes file paths
- `app/Http/Resources/SigningDocumentSignatoryResource.php` -- name, email, status, timestamps
- `app/Http/Resources/SigningDocumentEventResource.php` -- event_type, actor name, metadata, timestamp

**Routes:**
- Add practice signing document routes to `routes/api.php` inside the existing `Route::middleware(['auth:sanctum'])->prefix('practice')` group

**Permissions seeder update:**
- Update `database/seeders/RolesAndPermissionsSeeder.php` to add 6 new permissions: `signing-document.view`, `signing-document.create`, `signing-document.send`, `signing-document.cancel`, `signing-document.manage-templates`, `signing-document.bulk-send`

**Practice frontend (document list + upload):**
- `frontend/src/app/(practice)/practice/documents/page.tsx` -- governance dashboard with StatusTabs, DataTable, search, sort
- `frontend/src/app/(practice)/practice/documents/new/page.tsx` -- multi-step form: upload PDF or select template, add title/description/workspace, add signatories, set expiry, review and send/save
- `frontend/src/types/signing.ts` -- TypeScript types for all signing API responses
- `frontend/src/hooks/use-signing.ts` -- TanStack Query hooks for practice signing endpoints

**Tests (Phase 1):**
- `it_creates_signing_document_as_draft`
- `it_validates_pdf_only_upload`
- `it_validates_max_file_size_20mb`
- `it_computes_sha256_hash_on_upload`
- `it_adds_signatories_to_draft_document`
- `it_prevents_adding_more_than_10_signatories`
- `it_sends_document_and_transitions_to_sent`
- `it_prevents_sending_document_with_no_signatories`
- `it_cancels_document`
- `it_prevents_modification_after_signing`
- `it_prevents_bookkeeper_from_cancelling`
- `it_scopes_documents_to_practice`
- `it_scopes_bookkeeper_view_to_assigned_workspaces`
- `it_creates_audit_events_for_all_actions`

### Phase 2: Client Signing Experience (Sprint 2)

**Actions:**
- `app/Actions/Signing/MarkDocumentViewed.php` -- sets `viewed_at` on signatory record (first view only, idempotent), creates `viewed` audit event with IP/user agent, sends "document viewed" notification to practice
- `app/Actions/Signing/SignDocument.php` -- validates signatory is in `pending` or `viewed` status, validates `viewed_at` is set, records typed_name/consent_text/signature_method/signature_image/ip_address/user_agent, transitions signatory to `signed`, creates `signed` audit event with `file_hash` in metadata, checks if all signatories are now signed and if so triggers completion flow
- `app/Actions/Signing/DeclineDocument.php` -- validates signatory is in `pending` or `viewed` status, records decline_reason, transitions signatory to `declined`, creates `declined` audit event, sends notification to practice
- `app/Actions/Signing/CompleteSigningDocument.php` -- transitions document to `completed`, records `completed_at`, generates signature certificate page (Phase 4 generates the actual PDF; Phase 2 stores a placeholder), creates `completed` audit event

**Controllers:**
- `app/Http/Controllers/Api/SigningRequestController.php` -- client-facing, 6 methods (index, show, markViewed, sign, decline, streamPdf). Access gated by signatory record lookup: `SigningDocumentSignatory::where('user_id', auth()->id())->where('signing_document_id', ...)->firstOrFail()`. No practice permissions -- purely signatory-based access.

**Form Requests:**
- `app/Http/Requests/Signing/SignDocumentRequest.php` -- typed_name (required, string, max 255), consent (required, boolean, accepted), signature_method (required, in:typed,drawn), signature_image (nullable, string, max 300000 -- ~200KB base64 + overhead)
- `app/Http/Requests/Signing/DeclineDocumentRequest.php` -- reason (required, string, min 1, max 500)

**Routes:**
- Add signing request routes to `routes/api.php` inside the workspace-scoped middleware group:
  - `GET /signing-requests` -- list
  - `GET /signing-requests/{signingDocument:uuid}` -- show
  - `POST /signing-requests/{signingDocument:uuid}/view` -- mark viewed
  - `POST /signing-requests/{signingDocument:uuid}/sign` -- sign
  - `POST /signing-requests/{signingDocument:uuid}/decline` -- decline
  - `GET /signing-requests/{signingDocument:uuid}/pdf` -- stream PDF

**Frontend -- shared PDF viewer:**
- `frontend/src/components/shared/pdf-viewer.tsx` -- extracted from `document-preview.tsx`. Standalone `<PdfViewer>` component with props: `url`, `onPageChange`, `onAllPagesViewed`, `totalPagesViewed` callback. Includes page navigation, zoom controls, full-screen toggle.
- Refactor `frontend/src/components/attachments/document-preview.tsx` to import `PdfViewer` from the shared component (no behavioral change, just extraction)

**Frontend -- signature capture:**
- `frontend/src/components/signing/signature-capture.tsx` -- `<SignatureCapture>` component with:
  - Typed name input (React Hook Form + Zod validation)
  - Name match warning (case-insensitive compare against signatory name on record)
  - Consent checkbox with legal text
  - Toggle to drawn signature mode
  - Canvas signature pad (uses `signature_pad` library, 400x150px, outputs base64 PNG)
  - "Sign Document" button (disabled until name entered + consent checked + document viewed)
  - "Decline" button with reason textarea

**Frontend -- signing flow pages:**
- `frontend/src/app/(dashboard)/documents/signing/page.tsx` -- client signing inbox. Lists documents awaiting signature with title, practice name, sent date, expiry date. Click opens signing flow.
- `frontend/src/app/(dashboard)/documents/signing/[uuid]/page.tsx` -- signing flow page. Full-width `PdfViewer` with scroll/page tracking. After all pages viewed, signature panel slides up. Confirmation screen after signing with download link.
- `frontend/src/app/w/[slug]/(dashboard)/documents/signing/page.tsx` -- workspace-scoped mirror of signing inbox
- `frontend/src/app/w/[slug]/(dashboard)/documents/signing/[uuid]/page.tsx` -- workspace-scoped mirror of signing flow

**Frontend -- signing hooks:**
- Add to `frontend/src/hooks/use-signing.ts`: `useSigningRequests()`, `useSigningRequest(uuid)`, `useMarkViewed()`, `useSignDocument()`, `useDeclineDocument()`, signing request query keys

**Frontend -- navigation:**
- Update `frontend/src/lib/navigation.ts`: add "Documents" nav item under primary nav with sub-item "Signing" at `/documents/signing` (with `FileSignature` icon from lucide-react)

**Tests (Phase 2):**
- `it_lists_signing_requests_for_authenticated_user`
- `it_does_not_show_requests_for_other_users`
- `it_marks_document_as_viewed`
- `it_records_viewed_at_only_on_first_view`
- `it_signs_document_with_typed_signature`
- `it_signs_document_with_drawn_signature`
- `it_rejects_signing_without_prior_view`
- `it_rejects_signing_already_signed_document`
- `it_declines_document_with_reason`
- `it_does_not_allow_signing_after_decline`
- `it_completes_document_when_all_signatories_sign`
- `it_streams_pdf_only_to_listed_signatory`

### Phase 3: Templates + Governance Dashboard (Sprint 3)

**Actions:**
- `app/Actions/Signing/CreateDocumentTemplate.php` -- validates PDF, stores at `signing-templates/{practice_id}/{uuid}.pdf`, scans PDF text layer for `{{...}}` patterns and stores detected merge fields in JSON column
- `app/Actions/Signing/UpdateDocumentTemplate.php` -- updates metadata (name, category). If new PDF uploaded, stores at new path, preserves old file, re-scans merge fields.
- `app/Actions/Signing/ArchiveDocumentTemplate.php` -- sets `is_archived = true`
- `app/Actions/Signing/GenerateFromTemplate.php` -- reads template PDF via FPDI, replaces merge fields in text layer using TCPDF, stores generated PDF at `signing-documents/{practice_id}/{uuid}.pdf`, computes SHA-256 hash, creates `SigningDocument` linked to template. Merge field values resolved from workspace and practice models.
- `app/Actions/Signing/BulkSendFromTemplate.php` -- validates max 50 workspaces, iterates workspaces, calls `GenerateFromTemplate` + `SendSigningDocument` for each. Default signatory: workspace owner. Returns array of created document UUIDs.

**Merge field resolution:**

| Field | Source |
|-------|--------|
| `{{client_name}}` | `Workspace::name` |
| `{{practice_name}}` | `Practice::name` |
| `{{date}}` | `now()->format('d/m/Y')` |
| `{{financial_year}}` | Computed from workspace fiscal year settings |
| `{{workspace_name}}` | `Workspace::name` |
| `{{abn}}` | `Workspace::abn` (empty string if null) |
| `{{signatory_name}}` | Signatory's name (populated per signatory) |

Missing values are replaced with empty string. Unrecognised `{{...}}` patterns remaining after replacement trigger a `Log::warning()`.

**Controllers:**
- `app/Http/Controllers/Api/DocumentTemplateController.php` -- practice-scoped, 5 methods (index, store, show, update, archive). Authorize via `signing-document.manage-templates` permission.

**Form Requests:**
- `app/Http/Requests/Signing/StoreDocumentTemplateRequest.php` -- name (required, max 255), category (required, in enum values), file (required, PDF, max 20MB)
- `app/Http/Requests/Signing/UpdateDocumentTemplateRequest.php` -- name, category, file (optional replacement PDF)
- `app/Http/Requests/Signing/BulkSendRequest.php` -- template_id (required, exists), workspace_ids (required, array, max 50), expires_at (nullable, date, after:today), signatory_overrides (nullable, array keyed by workspace_id)

**Resources:**
- `app/Http/Resources/DocumentTemplateResource.php` -- uuid, name, category, merge_fields, is_archived, created_at

**Routes:**
- Add template routes to `routes/api.php` in practice group
- Add bulk-send route to practice signing documents group

**Frontend -- practice document detail:**
- `frontend/src/app/(practice)/practice/documents/[uuid]/page.tsx` -- document detail page. Split view: PDF preview (left) + signatory status list and audit timeline (right). Action buttons: Send (if draft), Remind, Cancel, Extend Expiry, Download.
- `frontend/src/components/signing/signatory-status-list.tsx` -- `<SignatoryStatusList>` component showing name, email, status badge, signed/viewed timestamps
- `frontend/src/components/signing/audit-timeline.tsx` -- `<AuditTimeline>` component rendering chronological event list with icons per event type
- `frontend/src/components/signing/document-status-badge.tsx` -- `<DocumentStatusBadge>` colour-coded badge (draft=grey, sent=blue, completed=green, expired=amber, declined=red, cancelled=grey)

**Frontend -- templates:**
- `frontend/src/app/(practice)/practice/settings/document-templates/page.tsx` -- template library page. Grid/list of templates with name, category badge, merge fields count, created date. Upload new, edit metadata, archive.
- `frontend/src/components/signing/template-form.tsx` -- create/edit template form

**Frontend -- bulk send:**
- `frontend/src/components/signing/bulk-send-dialog.tsx` -- dialog for bulk send: template selector, workspace multi-select, expiry date, signatory overrides, confirmation preview

**Frontend -- hooks additions:**
- Add to `frontend/src/hooks/use-signing.ts`: `useDocumentTemplates()`, `useCreateTemplate()`, `useUpdateTemplate()`, `useArchiveTemplate()`, `useBulkSend()`, `useSigningDocumentDetail(uuid)`, `useSigningDocumentEvents(uuid)`, `useRemindSignatories()`, `useExtendExpiry()`

**Tests (Phase 3):**
- `it_creates_document_template_with_merge_fields_detected`
- `it_archives_template`
- `it_generates_document_from_template_with_merge_field_replacement`
- `it_replaces_missing_merge_fields_with_empty_string`
- `it_bulk_sends_to_multiple_workspaces`
- `it_enforces_max_50_workspaces_per_bulk_send`
- `it_prevents_bookkeeper_from_managing_templates`
- `it_returns_correct_status_counts`
- `it_searches_documents_by_title_and_workspace_name`

### Phase 4: Audit Trail + Notifications + Polish (Sprint 4)

**Actions:**
- `app/Actions/Signing/GenerateSignatureCertificate.php` -- uses TCPDF to generate a certificate page containing: document title, UUID, all signatory details (name, email, signed timestamp UTC, IP, signature method), drawn signature images (decoded from base64, embedded as PNG), SHA-256 hash of original document, legal statement. Uses FPDI to append certificate page to original PDF. Computes SHA-256 hash of final signed PDF. Stores at `signing-documents/{practice_id}/{uuid}-signed.pdf`. Updates `signing_documents.signed_file_path`.
- `app/Actions/Signing/SendSigningReminder.php` -- validates 24-hour cooldown per signatory (`last_reminded_at`), sends reminder email via `NotificationMailer`, updates `last_reminded_at` on signatory record, creates `reminded` audit event
- `app/Actions/Signing/ExtendExpiry.php` -- validates document is in `sent` status, updates `expires_at`, creates audit event

**Console Commands:**
- `app/Console/Commands/ExpireSigningDocuments.php` -- `signing:expire-documents`. Queries `signing_documents` where `status = sent` and `expires_at < now()`. Transitions each to `expired`, creates `expired` audit event, notifies practice. Registered hourly in `routes/console.php`.
- `app/Console/Commands/SendSigningReminders.php` -- `signing:send-reminders`. Queries documents in `sent` status with unsigned signatories approaching expiry (7 days and 1 day thresholds). Checks reminder cooldown (24h). Sends via `NotificationMailer`. Registered daily at 09:00 AEST in `routes/console.php`.

**Notification integration:**
- Update `app/Enums/NotificationType.php` -- add cases: `SigningRequested`, `SigningSigned`, `SigningDeclined`, `SigningCompleted`, `SigningExpired`, `SigningReminder`
- Update `app/Enums/NotificationCategory.php` -- add case: `SIGNING`
- Update `app/Enums/EmailNotificationType.php` -- add cases: `SIGNING_REQUESTED`, `SIGNING_REMINDER`, `SIGNING_COMPLETED`, `SIGNING_DECLINED`
- Create notification listeners in `app/Listeners/Notifications/` for signing events (following existing listener pattern)

**Schedule registration:**
- Update `routes/console.php`:
  ```php
  Schedule::command('signing:expire-documents')->hourly();
  Schedule::command('signing:send-reminders')->dailyAt('09:00')->timezone('Australia/Sydney');
  ```

**PDF certificate generation (unit-testable service):**
- `app/Services/Signing/CertificateGenerator.php` -- pure service class (not an Action) that accepts document data + signatory data and returns PDF binary. This allows unit testing without touching the database. Called by `GenerateSignatureCertificate` action.

**Frontend polish:**
- Update `frontend/src/app/(practice)/practice/documents/[uuid]/page.tsx` -- integrate audit timeline, download signed PDF, remind button with cooldown indicator
- `frontend/src/components/signing/signature-certificate-preview.tsx` -- read-only preview of certificate data (for the document detail page, not the actual PDF page)
- Update practice layout navigation to include "Documents" link

**Notification preferences UI:**
- Update existing notification preferences page to include Signing category toggle

**Browser tests:**
- `tests/Browser/SigningDocumentTest.php`:
  - `it_uploads_and_sends_document_for_signing` -- practice flow: upload PDF, add signatory, send, verify dashboard shows document
  - `it_signs_document_as_client` -- client flow: navigate to signing inbox, open document, view PDF, type name, accept consent, sign, verify confirmation
  - `it_declines_document_as_client` -- client flow: open document, decline with reason, verify status
  - `it_shows_governance_dashboard_with_status_tabs` -- practice flow: navigate to documents page, verify StatusTabs render, click through filters

**Remaining feature tests (Phase 4):**
- `it_generates_signature_certificate_page`
- `it_computes_dual_hash_chain`
- `it_stores_signed_pdf_separately_from_original`
- `it_sends_manual_reminder_with_24h_cooldown`
- `it_expires_documents_via_scheduled_command`
- `it_sends_automated_reminders_at_thresholds`
- `it_extends_expiry_date`
- `it_records_ip_and_user_agent_on_all_signing_events`

**Unit tests:**
- `tests/Unit/Signing/CertificateGeneratorTest.php`:
  - `it_generates_certificate_pdf_with_all_signatory_details`
  - `it_embeds_drawn_signature_images`
  - `it_includes_sha256_hash_on_certificate`
- `tests/Unit/Signing/HashComputationTest.php`:
  - `it_computes_sha256_hash_of_file_contents`
  - `it_detects_file_tampering_via_hash_mismatch`
- `tests/Unit/Signing/MergeFieldReplacementTest.php`:
  - `it_replaces_all_supported_merge_fields`
  - `it_replaces_missing_fields_with_empty_string`
  - `it_logs_warning_for_unrecognised_patterns`

---

## File Manifest

### Migrations

| File | Purpose |
|------|---------|
| `database/migrations/2026_03_20_100001_create_signing_documents_table.php` | All 4 tables + indexes |

### Enums

| File | Purpose |
|------|---------|
| `app/Enums/Signing/SigningDocumentStatus.php` | draft, sent, completed, expired, cancelled |
| `app/Enums/Signing/SigningSignatoryStatus.php` | pending, viewed, signed, declined |
| `app/Enums/Signing/SigningEventType.php` | created, sent, viewed, signed, declined, reminded, expired, cancelled, downloaded |
| `app/Enums/Signing/SignatureMethod.php` | typed, drawn |
| `app/Enums/Signing/DocumentTemplateCategory.php` | engagement, privacy, authority, compliance, other |

### Models

| File | Purpose |
|------|---------|
| `app/Models/Central/SigningDocument.php` | Main document model |
| `app/Models/Central/SigningDocumentSignatory.php` | Per-signatory record |
| `app/Models/Central/SigningDocumentTemplate.php` | Reusable template |
| `app/Models/Central/SigningDocumentEvent.php` | Append-only audit event |

### Actions

| File | Purpose |
|------|---------|
| `app/Actions/Signing/UploadSigningDocument.php` | Upload PDF, compute hash, create draft |
| `app/Actions/Signing/UpdateSigningDocument.php` | Update draft metadata (immutability check) |
| `app/Actions/Signing/AddSignatory.php` | Add signatory to draft |
| `app/Actions/Signing/RemoveSignatory.php` | Remove signatory from draft |
| `app/Actions/Signing/SendSigningDocument.php` | Transition draft to sent, notify |
| `app/Actions/Signing/CancelSigningDocument.php` | Cancel document |
| `app/Actions/Signing/MarkDocumentViewed.php` | Record first view |
| `app/Actions/Signing/SignDocument.php` | Capture signature, check completion |
| `app/Actions/Signing/DeclineDocument.php` | Decline with reason |
| `app/Actions/Signing/CompleteSigningDocument.php` | Transition to completed, trigger certificate |
| `app/Actions/Signing/GenerateSignatureCertificate.php` | Append certificate page to PDF |
| `app/Actions/Signing/RecordSigningEvent.php` | Generic audit event creator |
| `app/Actions/Signing/CreateDocumentTemplate.php` | Upload template, detect merge fields |
| `app/Actions/Signing/UpdateDocumentTemplate.php` | Update template metadata/PDF |
| `app/Actions/Signing/ArchiveDocumentTemplate.php` | Soft-archive template |
| `app/Actions/Signing/GenerateFromTemplate.php` | Generate document from template with merge fields |
| `app/Actions/Signing/BulkSendFromTemplate.php` | Bulk send to multiple workspaces |
| `app/Actions/Signing/SendSigningReminder.php` | Manual/automated reminder with cooldown |
| `app/Actions/Signing/ExtendExpiry.php` | Extend document expiry date |

### Services

| File | Purpose |
|------|---------|
| `app/Services/Signing/CertificateGenerator.php` | Pure PDF certificate generation (unit-testable) |
| `app/Services/Signing/MergeFieldResolver.php` | Resolve merge field values from workspace/practice data |

### Controllers

| File | Purpose |
|------|---------|
| `app/Http/Controllers/Api/SigningDocumentController.php` | Practice signing document CRUD + lifecycle |
| `app/Http/Controllers/Api/DocumentTemplateController.php` | Practice template CRUD |
| `app/Http/Controllers/Api/SigningRequestController.php` | Client-facing signing flow |

### Form Requests

| File | Purpose |
|------|---------|
| `app/Http/Requests/Signing/StoreSigningDocumentRequest.php` | Create document validation |
| `app/Http/Requests/Signing/UpdateSigningDocumentRequest.php` | Update draft validation |
| `app/Http/Requests/Signing/SendSigningDocumentRequest.php` | Send authorization |
| `app/Http/Requests/Signing/CancelSigningDocumentRequest.php` | Cancel authorization |
| `app/Http/Requests/Signing/SignDocumentRequest.php` | Signature capture validation |
| `app/Http/Requests/Signing/DeclineDocumentRequest.php` | Decline validation |
| `app/Http/Requests/Signing/StoreDocumentTemplateRequest.php` | Template creation |
| `app/Http/Requests/Signing/UpdateDocumentTemplateRequest.php` | Template update |
| `app/Http/Requests/Signing/BulkSendRequest.php` | Bulk send validation |
| `app/Http/Requests/Signing/ExtendExpiryRequest.php` | Extend expiry validation |

### Policies

| File | Purpose |
|------|---------|
| `app/Policies/SigningDocumentPolicy.php` | Permission checks for practice signing operations |

### Resources

| File | Purpose |
|------|---------|
| `app/Http/Resources/SigningDocumentResource.php` | Document with signatory summary |
| `app/Http/Resources/SigningDocumentSignatoryResource.php` | Signatory detail |
| `app/Http/Resources/SigningDocumentEventResource.php` | Audit event |
| `app/Http/Resources/DocumentTemplateResource.php` | Template detail |

### Console Commands

| File | Purpose |
|------|---------|
| `app/Console/Commands/ExpireSigningDocuments.php` | Hourly: mark expired documents |
| `app/Console/Commands/SendSigningReminders.php` | Daily 9am AEST: automated reminders |

### Routes

| File | Change |
|------|--------|
| `routes/api.php` | Add practice signing document routes, template routes, signing request routes |
| `routes/console.php` | Register `signing:expire-documents` hourly + `signing:send-reminders` daily |

### Enum Updates (existing files)

| File | Change |
|------|--------|
| `app/Enums/NotificationType.php` | Add 6 signing notification types |
| `app/Enums/NotificationCategory.php` | Add `SIGNING` case |
| `app/Enums/EmailNotificationType.php` | Add 4 signing email types |

### Seeder Updates

| File | Change |
|------|--------|
| `database/seeders/RolesAndPermissionsSeeder.php` | Add 6 `signing-document.*` permissions to practice roles |

### Frontend Pages

| File | Purpose |
|------|---------|
| `frontend/src/app/(practice)/practice/documents/page.tsx` | Governance dashboard |
| `frontend/src/app/(practice)/practice/documents/new/page.tsx` | Create signing document (multi-step form) |
| `frontend/src/app/(practice)/practice/documents/[uuid]/page.tsx` | Document detail (split view) |
| `frontend/src/app/(practice)/practice/settings/document-templates/page.tsx` | Template library |
| `frontend/src/app/(dashboard)/documents/signing/page.tsx` | Client signing inbox |
| `frontend/src/app/(dashboard)/documents/signing/[uuid]/page.tsx` | Client signing flow |
| `frontend/src/app/w/[slug]/(dashboard)/documents/signing/page.tsx` | Workspace-scoped signing inbox |
| `frontend/src/app/w/[slug]/(dashboard)/documents/signing/[uuid]/page.tsx` | Workspace-scoped signing flow |

### Frontend Components

| File | Purpose |
|------|---------|
| `frontend/src/components/shared/pdf-viewer.tsx` | Extracted standalone PDF viewer with scroll tracking |
| `frontend/src/components/signing/signature-capture.tsx` | Typed + drawn signature capture panel |
| `frontend/src/components/signing/signatory-status-list.tsx` | Signatory list with status badges |
| `frontend/src/components/signing/audit-timeline.tsx` | Chronological event timeline |
| `frontend/src/components/signing/document-status-badge.tsx` | Colour-coded status badge |
| `frontend/src/components/signing/bulk-send-dialog.tsx` | Bulk send wizard dialog |
| `frontend/src/components/signing/template-form.tsx` | Template create/edit form |
| `frontend/src/components/signing/signature-certificate-preview.tsx` | Certificate data preview |

### Frontend Hooks & Types

| File | Purpose |
|------|---------|
| `frontend/src/hooks/use-signing.ts` | TanStack Query hooks for all signing endpoints |
| `frontend/src/types/signing.ts` | TypeScript types for signing API responses |

### Frontend Updates (existing files)

| File | Change |
|------|--------|
| `frontend/src/components/attachments/document-preview.tsx` | Refactor to import shared `PdfViewer` |
| `frontend/src/lib/navigation.ts` | Add "Documents" nav item with "Signing" sub-item |

### Tests

| File | Purpose |
|------|---------|
| `tests/Feature/Signing/SigningDocumentTest.php` | ~14 tests: CRUD, lifecycle, permissions, scoping |
| `tests/Feature/Signing/SigningRequestTest.php` | ~12 tests: view, sign, decline, access control |
| `tests/Feature/Signing/DocumentTemplateTest.php` | ~9 tests: templates, merge fields, bulk send |
| `tests/Feature/Signing/SigningCommandTest.php` | ~4 tests: expire command, reminder command |
| `tests/Unit/Signing/CertificateGeneratorTest.php` | ~3 tests: PDF generation, hash, signature images |
| `tests/Unit/Signing/HashComputationTest.php` | ~2 tests: SHA-256 computation, tamper detection |
| `tests/Unit/Signing/MergeFieldReplacementTest.php` | ~3 tests: merge fields, missing values, warnings |
| `tests/Browser/SigningDocumentTest.php` | ~4 tests: upload+send, sign, decline, dashboard |

---

## Testing Strategy

### Test Coverage by Phase

| Phase | Feature Tests | Unit Tests | Browser Tests |
|-------|---------------|------------|---------------|
| Phase 1 | 14 (CRUD, lifecycle, permissions, scoping) | 0 | 0 |
| Phase 2 | 12 (view, sign, decline, access) | 0 | 0 |
| Phase 3 | 9 (templates, merge fields, bulk send) | 3 (merge fields) | 0 |
| Phase 4 | 8 (certificate, reminders, expiry, hash) | 5 (certificate, hash) | 4 (signing flows) |
| **Total** | **43** | **8** | **4** |

### Test Setup Pattern

All feature tests follow the existing workspace test setup:

```php
uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $this->user = User::factory()->create();
    // ... org + workspace + practice setup ...

    $this->practice->users()->attach($this->user->id, ['role' => 'owner']);
    setPermissionsTeamId($this->practice->id);
    $this->user->assignRole('owner');
});
```

### Critical Test Assertions

- **Cross-practice isolation**: practice A cannot see practice B's documents
- **Bookkeeper scoping**: bookkeeper sees only assigned workspace documents
- **Immutability**: no modification after any signatory has signed
- **Audit completeness**: event count and types between created and completed -- no gaps (SC-04)
- **Hash chain integrity**: file_hash at upload matches hash in signing event metadata
- **Reminder cooldown**: 24-hour minimum between reminders enforced

---

## Risk Register

### PDF Processing

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| FPDI cannot read certain PDF versions (PDF 2.0) | Low | Medium | FPDI supports PDF 1.0-1.7 (covers 99%+ of PDFs); validate on upload and return user-friendly error for unsupported versions |
| Merge field replacement fails on PDFs with embedded fonts | Medium | Medium | Merge fields operate on text layer only; if text is not extractable (image-based PDF), log warning and proceed without replacement; template upload UI shows detected merge fields for validation |
| TCPDF certificate page generation is slow for large documents | Low | Low | Certificate is a single page; generation time is constant regardless of original document size |
| Large PDFs (close to 20MB) cause memory issues during hash computation | Low | Medium | PHP streams file reading; `hash_file('sha256', $path)` is memory-efficient |

### Legal Compliance

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Electronic signatures challenged in court | Low | High | Comprehensive audit trail (IP, timestamp, user agent, consent text) meets Electronic Transactions Act 1999 (Cth) requirements; signature certificate provides self-contained evidence |
| Consent text changes after deployment | Low | Medium | Consent text stored per-signatory at signing time (not referenced from config); historical signatures are self-documenting |
| GDPR/privacy concerns with IP logging | Low | Medium | IP addresses are necessary for legal evidence; privacy policy updated to disclose; data retention follows platform policy |

### Performance

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Bulk send of 50 documents exceeds 60-second timeout | Low | Medium | Merge field replacement is lightweight text substitution; if performance degrades, move to queued job with polling in v2 |
| Large PDF rendering in browser causes poor UX | Medium | Medium | react-pdf lazy-loads pages (one at a time); existing `PdfViewer` pattern handles this well |
| Governance dashboard slow with hundreds of documents | Low | Low | Composite indexes on `(practice_id, status)` and `(practice_id, workspace_id, status)`; standard offset pagination (25/page) |

### Security

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| File path exposure in API responses | Low | High | Proxy endpoints stream files; paths never in responses; enforced at Resource layer |
| Cross-practice document access | Low | Critical | Practice membership check on every request; feature tests verify isolation |
| Signatory accesses document they are not listed on | Low | High | Access gated by signatory record lookup, not just authentication |
