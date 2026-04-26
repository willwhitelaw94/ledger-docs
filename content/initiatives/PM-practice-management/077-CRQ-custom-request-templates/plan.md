---
title: "Implementation Plan: Custom Request Templates & Client Questionnaires"
---

# Implementation Plan: Custom Request Templates & Client Questionnaires (077-CRQ)

**Epic**: 077-CRQ
**Created**: 2026-04-01
**Spec**: [spec.md](./spec.md)

---

## 1. Technical Context

### Stack

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 12, PHP 8.4, PostgreSQL |
| Event sourcing | **Not used** -- templates and questionnaires are central CRUD (not tenant-scoped, not event-sourced) |
| Business logic | Lorisleiva Actions (`AsAction` trait) |
| Auth | Sanctum cookies, Spatie Permission (team mode) |
| API responses | Laravel API Resources |
| Validation | Form Requests (mutations), `Gate::authorize()` (reads) |
| Frontend | Next.js 16, React 19, TypeScript (strict) |
| Server state | TanStack Query v5 |
| Client state | Zustand v5 (builder dirty state, active section tracking) |
| UI primitives | shadcn/ui |
| Forms | React Hook Form + Zod |
| Drag-and-drop | @dnd-kit/core + @dnd-kit/sortable (already installed) |
| AI | AI SDK v4 (`@ai-sdk/anthropic`, `@ai-sdk/react`) -- `streamObject` for structured generation, `streamText` for answer bot |

### Key Dependencies

| Dependency | Status | Relationship |
|-----------|--------|-------------|
| 027-PMV Practice Management v2 | Complete | `Practice`, `PracticeJob`, `PracticeTask`, `StaffAllocation` models |
| Client Requests (free-form) | Complete | `ClientRequest` model, `/practice/requests` UI |
| 024-NTF In-App Notifications | Complete | Notification dispatch for send/submit/reopen events |
| 012-ATT File Attachments | Complete | S3 upload pipeline for file_upload question type |
| 021-AIQ AI Financial Chatbot | Complete | `streamText` pattern in `frontend/src/app/api/chat/route.ts` |

### Existing Codebase Readiness

**Backend (fully prepared -- P1 CRUD already built)**:

| Component | Status | File |
|-----------|--------|------|
| `RequestTemplate` model | EXISTS | `app/Models/Central/RequestTemplate.php` |
| `RequestTemplateSection` model | EXISTS | `app/Models/Central/RequestTemplateSection.php` |
| `RequestTemplateQuestion` model | EXISTS | `app/Models/Central/RequestTemplateQuestion.php` |
| `SentQuestionnaire` model | EXISTS | `app/Models/Central/SentQuestionnaire.php` |
| `QuestionnaireResponse` model | EXISTS | `app/Models/Central/QuestionnaireResponse.php` |
| `QuestionnaireNote` model | EXISTS | `app/Models/Central/QuestionnaireNote.php` |
| `RequestTemplateStatus` enum | EXISTS | `app/Enums/Practice/RequestTemplateStatus.php` (draft, published, archived) |
| `QuestionnaireStatus` enum | EXISTS | `app/Enums/Practice/QuestionnaireStatus.php` (pending, in_progress, submitted, reviewed, re_opened) |
| `QuestionAnswerType` enum | EXISTS | `app/Enums/Practice/QuestionAnswerType.php` (10 types) |
| `RequestTemplatePolicy` | EXISTS | `app/Policies/RequestTemplatePolicy.php` |
| `RequestTemplateController` | EXISTS | `app/Http/Controllers/Api/RequestTemplateController.php` (index, counts, show, store, update, destroy, publish, archive, send, questionnaires, showQuestionnaire) |
| `QuestionnaireController` | EXISTS | `app/Http/Controllers/Api/QuestionnaireController.php` (index, show, saveAnswer, submit, review, addNote) |
| `CreateRequestTemplate` action | EXISTS | `app/Actions/Practice/CreateRequestTemplate.php` |
| `PublishRequestTemplate` action | EXISTS | `app/Actions/Practice/PublishRequestTemplate.php` |
| `SendQuestionnaire` action | EXISTS | `app/Actions/Practice/SendQuestionnaire.php` |
| `SubmitQuestionnaireResponses` action | EXISTS | `app/Actions/Practice/SubmitQuestionnaireResponses.php` |
| `ReviewQuestionnaire` action | EXISTS | `app/Actions/Practice/ReviewQuestionnaire.php` |
| `RequestTemplateResource` | EXISTS | `app/Http/Resources/RequestTemplateResource.php` |
| `SentQuestionnaireResource` | EXISTS | `app/Http/Resources/SentQuestionnaireResource.php` |
| `StoreRequestTemplateRequest` | EXISTS | `app/Http/Requests/Practice/StoreRequestTemplateRequest.php` |
| `SendQuestionnaireRequest` | EXISTS | `app/Http/Requests/Practice/SendQuestionnaireRequest.php` |
| Migration (6 tables) | EXISTS | `database/migrations/2026_04_02_770001_create_request_template_tables.php` |
| Permissions (5) | EXISTS | `RolesAndPermissionsSeeder` -- `request-template.view/create/update/delete/send` |
| API routes (16 endpoints) | EXISTS | `routes/api.php` -- full CRUD + questionnaire lifecycle |

**Backend (needs creation)**:

| Component | Status | Purpose |
|-----------|--------|---------|
| `GenerateTasksFromResponses` action | NEW | AI response-to-task agent (US8, P2) |
| `SuggestTemplateQuestions` action | NEW | AI question suggestion (US2, P2) -- backend context assembly only |
| `RequestTemplateSeeder` | NEW | System templates for template library (US7, P3) |
| `answer_bot_enabled` column on `request_templates` | NEW | Per-template answer bot toggle (US9, P3) |
| `questionnaire_bot_messages` table + model | NEW | Chat history for answer bot (US9, P3) |
| `practice_id` nullable migration | NEW | Allow `practice_id = null` for system templates (US7, P3) |
| File upload endpoint | NEW | `POST /questionnaires/{uuid}/upload` for file_upload question type |
| Conditional-aware submit validation | MODIFY | `SubmitQuestionnaireResponses` must evaluate conditions (C6) |

**Frontend (nothing exists -- all new)**:

No frontend components, pages, hooks, or types exist for questionnaires or request templates. The entire frontend is new work.

---

## 2. Gate 3: Architecture Checklist

### 2.1 Technical Feasibility

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | Backend CRUD complete; frontend is new pages + components |
| Existing patterns leveraged | PASS | Follows practice management patterns (central models, practice-scoped) |
| No impossible requirements | PASS | All spec items achievable with existing tech stack |
| Performance considered | PASS | Template snapshot avoids live joins; auto-save is per-question with debounce |
| Security considered | PASS | Practice ownership verified in controllers; workspace scoping on questionnaires; file uploads via existing S3 pipeline |

### 2.2 Data & Integration

| Check | Status | Notes |
|-------|--------|-------|
| Data model understood | PASS | 6 tables already migrated; 2 more needed for P3 (bot messages, practice_id nullable) |
| API contracts clear | PASS | 16 existing endpoints + 3 new (suggest, generate-tasks, upload) |
| Dependencies identified | PASS | All dependencies complete; no blocking concerns |
| Integration points mapped | PASS | Notifications via 024-NTF, file uploads via 012-ATT, tasks via 027-PMV PracticeTask |
| DTO persistence explicit | PASS | Template snapshot JSON captures full structure at send time |

### 2.3 Implementation Approach

| Check | Status | Notes |
|-------|--------|-------|
| File changes identified | PASS | See Section 8 (full file inventory) |
| Risk areas noted | PASS | Drag-and-drop builder is the most complex frontend component (see Section 9) |
| Testing approach defined | PASS | ~30 Pest tests + ~10 browser tests (Section 7) |
| Rollback possible | PASS | Central models (not tenant-scoped); all frontend new; no migration conflicts |

### 2.4 Resource & Scope

| Check | Status | Notes |
|-------|--------|-------|
| Scope matches spec | PASS | 4 phases matching P1-P3 priorities |
| Effort reasonable | PASS | Estimated 3-4 sprints (M t-shirt) |
| Skills available | PASS | All patterns exist in codebase |

### 2.5 Laravel Best Practices

| Check | Status | Notes |
|-------|--------|-------|
| Use Lorisleiva Actions | PASS | All existing actions use `AsAction`; new actions follow same pattern |
| API Resources for responses | PASS | `RequestTemplateResource`, `SentQuestionnaireResource` both exist |
| Model route binding | PASS | Controllers use `RequestTemplate $requestTemplate` and `SentQuestionnaire $sentQuestionnaire` with UUID route key |
| Sanctum cookie auth | PASS | Same auth as all practice/workspace routes |
| No hardcoded business logic in frontend | PASS | Conditional evaluation in frontend is UI-only; all state transitions in backend |
| Migrations schema-only | PASS | Existing migration creates all 6 tables; new migrations additive only |

### 2.6 Next.js/React Standards (CLAUDE.md Gate Overrides)

| Check | Status | Notes |
|-------|--------|-------|
| All components use TypeScript | PASS | Every `.tsx` file will use strict TypeScript |
| Props typed with types | PASS | All component props use `type Props = {}` |
| No `any` types | PASS | Full TypeScript types for templates, questionnaires, responses, AI suggestions |
| Shared types identified | PASS | `questionnaire.ts` in `frontend/src/types/` |
| Component library reused | PASS | Reuses shadcn/ui (`Stepper`, `Button`, `Input`, `Sheet`, `Dialog`), existing `DataTable`, `StatusTabs` |
| Server/client components explicit | PASS | All questionnaire pages are `'use client'` (state, effects, drag-and-drop) |
| Data fetching via TanStack Query | PASS | `use-questionnaires.ts` hook for all server state |
| Forms use React Hook Form + Zod | PASS | Template builder form and question editor use RHF + Zod |
| API client typed | PASS | All API calls typed with request/response types matching API Resources |

---

## 3. Architecture Overview

### 3.1 System Architecture

```
Practice Member                              Client (Workspace User)
      |                                              |
      v                                              v
Template Builder (/practice/settings/templates)   Questionnaire Filler (/questionnaires/[id])
      |                                              |
      |  Create/Edit/Publish/Send                    |  SaveAnswer/Submit
      v                                              v
RequestTemplateController ──────────────────> QuestionnaireController
      |                                              |
      |  toSnapshot() on send                        |  updateOrCreate per answer
      v                                              v
request_templates ──(snapshot)──> sent_questionnaires ──> questionnaire_responses
      |                                              |
      |  AI suggest (P2)                             |  AI answer bot (P3)
      v                                              v
SuggestTemplateQuestions                      Answer Bot Chat
(streamObject via Next.js route)              (streamText via Next.js route)
                                                     |
                                              questionnaire_bot_messages
```

### 3.2 Template Lifecycle

```
    [Create]
        |
        v
    DRAFT ──[Publish]──> PUBLISHED ──[Send]──> SentQuestionnaire (snapshot)
        ^                    |                        |
        |                    |                        v
        +──[Edit]────────────+                   PENDING
                                                    |
                                              [First answer]
                                                    |
                                                    v
                                              IN_PROGRESS
                                                    |
                                                [Submit]
                                                    |
                                                    v
                                              SUBMITTED
                                                /        \
                                        [Review]        [Re-open]
                                            |                |
                                            v                v
                                        REVIEWED        RE_OPENED
                                        (terminal)          |
                                                        [Submit]
                                                            |
                                                            v
                                                        SUBMITTED
```

### 3.3 Data Flow: Central Models (Not Tenant-Scoped)

All 077-CRQ models live in `app/Models/Central/`. This is consistent with `ClientRequest`, `PracticeTask`, and `PracticeJob`. Templates are scoped to `practice_id`. Questionnaires are scoped to both `practice_id` (sender) and `workspace_id` (recipient). No `workspace_id` global scope -- access control is enforced explicitly in controllers.

### 3.4 AI Integration Points

| Feature | User Story | Priority | AI SDK Method | Next.js Route | Backend Action |
|---------|-----------|----------|---------------|---------------|----------------|
| Question Suggestion | US2 | P2 | `streamObject` | `POST /api/questionnaires/suggest` | `SuggestTemplateQuestions` (context assembly) |
| Response-to-Task Agent | US8 | P2 | `streamObject` | `POST /api/questionnaires/[uuid]/generate-tasks` | `GenerateTasksFromResponses` (context assembly) |
| Answer Bot | US9 | P3 | `streamText` | `POST /api/questionnaires/[uuid]/chat` | Direct route handler (no Laravel action) |

All AI calls go through Next.js route handlers (not Laravel endpoints) because AI SDK streaming runs in the Node.js runtime. The Laravel backend provides context data via standard API endpoints. The Next.js route handlers fetch context from Laravel, compose prompts, and stream responses.

---

## 4. Database

### 4.1 Existing Tables (Already Migrated)

All 6 core tables exist in `database/migrations/2026_04_02_770001_create_request_template_tables.php`:

- `request_templates` -- template definitions, practice-scoped
- `request_template_sections` -- ordered sections within templates
- `request_template_questions` -- questions within sections, with answer types and conditions
- `sent_questionnaires` -- snapshots sent to client workspaces
- `questionnaire_responses` -- per-question answers with audit trail
- `questionnaire_notes` -- practice-internal notes on responses

### 4.2 New Migration: System Template Support (P3)

```
2026_04_03_770002_make_request_templates_practice_id_nullable.php

ALTER TABLE request_templates
  ALTER COLUMN practice_id DROP NOT NULL;
  -- practice_id remains FK with cascadeOnDelete
  -- System templates: practice_id = NULL, is_system = true
```

### 4.3 New Migration: Answer Bot (P3)

```
2026_04_03_770003_add_answer_bot_to_request_templates.php

ALTER TABLE request_templates
  ADD COLUMN answer_bot_enabled BOOLEAN NOT NULL DEFAULT false;
```

### 4.4 New Migration: Bot Messages (P3)

```
2026_04_03_770004_create_questionnaire_bot_messages_table.php

questionnaire_bot_messages
  id                      bigint PK AUTO_INCREMENT
  questionnaire_id        bigint NOT NULL FK -> sent_questionnaires(id) ON DELETE CASCADE
  user_id                 bigint NOT NULL FK -> users(id) ON DELETE CASCADE
  role                    varchar(20) NOT NULL  -- 'user' | 'assistant'
  content                 text NOT NULL
  question_context_id     bigint NULLABLE  -- which question the user was asking about
  created_at              timestamp
  updated_at              timestamp

INDEX (questionnaire_id, user_id)
INDEX (questionnaire_id, question_context_id)
```

### 4.5 New Migration: File Upload Endpoint (P1)

No additional migration needed. File uploads use the existing S3 infrastructure. File references are stored as JSON within `questionnaire_responses.answer` (array of `{file_id, filename, size_bytes, mime_type}`).

---

## 5. Backend Components

### 5.1 Existing API Endpoints (16 routes, already implemented)

**Practice-side (template management)**:

| Method | Endpoint | Controller | Status |
|--------|----------|------------|--------|
| `GET` | `/api/v1/practice/request-templates` | `RequestTemplateController@index` | EXISTS |
| `GET` | `/api/v1/practice/request-templates/counts` | `RequestTemplateController@counts` | EXISTS |
| `POST` | `/api/v1/practice/request-templates` | `RequestTemplateController@store` | EXISTS |
| `GET` | `/api/v1/practice/request-templates/{uuid}` | `RequestTemplateController@show` | EXISTS |
| `PATCH` | `/api/v1/practice/request-templates/{uuid}` | `RequestTemplateController@update` | EXISTS |
| `DELETE` | `/api/v1/practice/request-templates/{uuid}` | `RequestTemplateController@destroy` | EXISTS |
| `POST` | `/api/v1/practice/request-templates/{uuid}/publish` | `RequestTemplateController@publish` | EXISTS |
| `POST` | `/api/v1/practice/request-templates/{uuid}/archive` | `RequestTemplateController@archive` | EXISTS |
| `POST` | `/api/v1/practice/request-templates/{uuid}/send` | `RequestTemplateController@send` | EXISTS |
| `GET` | `/api/v1/practice/questionnaires` | `RequestTemplateController@questionnaires` | EXISTS |
| `GET` | `/api/v1/practice/questionnaires/{uuid}` | `RequestTemplateController@showQuestionnaire` | EXISTS |

**Workspace-side (questionnaire lifecycle)**:

| Method | Endpoint | Controller | Status |
|--------|----------|------------|--------|
| `GET` | `/api/v1/questionnaires` | `QuestionnaireController@index` | EXISTS |
| `GET` | `/api/v1/questionnaires/{uuid}` | `QuestionnaireController@show` | EXISTS |
| `POST` | `/api/v1/questionnaires/{uuid}/answer` | `QuestionnaireController@saveAnswer` | EXISTS |
| `POST` | `/api/v1/questionnaires/{uuid}/submit` | `QuestionnaireController@submit` | EXISTS |

**Practice-side (review)**:

| Method | Endpoint | Controller | Status |
|--------|----------|------------|--------|
| `POST` | `/api/v1/practice/questionnaires/{uuid}/review` | `QuestionnaireController@review` | EXISTS |
| `POST` | `/api/v1/practice/questionnaires/{uuid}/notes` | `QuestionnaireController@addNote` | EXISTS |

### 5.2 New API Endpoints

| Method | Endpoint | Controller | Priority | Purpose |
|--------|----------|------------|----------|---------|
| `POST` | `/api/v1/questionnaires/{uuid}/upload` | `QuestionnaireController@upload` | P1 | File upload for file_upload question type |
| `GET` | `/api/v1/practice/request-templates/system` | `RequestTemplateController@systemTemplates` | P3 | List system templates for template gallery |
| `POST` | `/api/v1/practice/request-templates/{uuid}/clone-system` | `RequestTemplateController@cloneSystem` | P3 | Clone a system template into the practice |
| `GET` | `/api/v1/practice/questionnaires/{uuid}/context` | `RequestTemplateController@questionnaireContext` | P2 | Fetch full context (responses + staff + jobs) for AI task generation |
| `GET` | `/api/v1/practice/request-templates/{uuid}/suggest-context` | `RequestTemplateController@suggestContext` | P2 | Fetch template context for AI question suggestion |
| `GET` | `/api/v1/questionnaires/{uuid}/bot-messages` | `QuestionnaireController@botMessages` | P3 | Chat history for answer bot |

AI streaming endpoints live in Next.js route handlers (not Laravel):

| Method | Next.js Route | Priority | Purpose |
|--------|--------------|----------|---------|
| `POST` | `/api/questionnaires/suggest` | P2 | Stream AI-suggested questions via `streamObject` |
| `POST` | `/api/questionnaires/[uuid]/generate-tasks` | P2 | Stream AI task suggestions via `streamObject` |
| `POST` | `/api/questionnaires/[uuid]/chat` | P3 | Answer bot streaming via `streamText` |

### 5.3 New Backend Actions

**`SuggestTemplateQuestions`** (P2)

```php
// app/Actions/Practice/SuggestTemplateQuestions.php
// Assembles context for AI question suggestion.
// Called by Next.js route handler to get template name, description,
// existing questions (to avoid duplicates), and AU accounting domain context.
// Returns JSON context payload -- AI generation happens in Next.js.
```

**`GenerateTasksFromResponses`** (P2)

```php
// app/Actions/Practice/GenerateTasksFromResponses.php
// Assembles context for AI task generation from submitted responses.
// Gathers: template_snapshot, all responses with question text,
// practice staff list (StaffAllocation), linked PracticeJob (name, time budget, due date).
// Returns JSON context payload -- AI generation happens in Next.js.
// Approved task suggestions are created as PracticeTask records via CreatePracticeTask action.
```

### 5.4 Backend Modifications

**`SubmitQuestionnaireResponses` -- conditional-aware validation (P2)**

The existing action naively checks all `is_required` questions. It must be enhanced to evaluate conditions from the `template_snapshot` against current responses, excluding hidden required questions from the validation check.

```php
// Enhanced logic:
// 1. Collect all responses as question_id => answer map
// 2. For each required question, check if it has a condition
// 3. If condition exists, evaluate: find trigger question's answer, check operator + value
// 4. If condition is unmet (question hidden), exclude from required check
// 5. Only validate visible required questions have non-null answers
```

**`QuestionnaireController@upload` -- file upload endpoint (P1)**

```php
// POST /api/v1/questionnaires/{uuid}/upload
// Validates: workspace ownership, questionnaire is editable (pending/in_progress/re_opened)
// Validates: file type allowlist (pdf, jpg, jpeg, png, gif, webp, csv, txt, xls, xlsx, doc, docx)
// Validates: max 20 MB per file
// Stores via existing S3 infrastructure under workspace's storage path
// Returns: { file_id, filename, size_bytes, mime_type }
```

**`PublishRequestTemplate` -- validation guard (P1)**

The existing action increments version and sets status. It must also validate that the template has at least one question (excluding welcome section) before allowing publish.

**`RequestTemplate` model -- `answer_bot_enabled` in snapshot (P3)**

The `toSnapshot()` method must include `answer_bot_enabled` so the client filler can check it without querying the live template.

---

## 6. Frontend Architecture

### 6.1 New Pages

| Route | Component | Priority | Description |
|-------|-----------|----------|-------------|
| `/practice/settings/templates` | `TemplateListPage` | P1 | Template list with StatusTabs (Draft/Published/Archived), counts, CRUD |
| `/practice/settings/templates/[id]` | `TemplateBuilderPage` | P1 | Split-view builder: section sidebar + question editor |
| `/questionnaires` | `QuestionnaireListPage` | P1 | Client-facing list of received questionnaires with progress |
| `/questionnaires/[id]` | `QuestionnaireFillerPage` | P1 | Client fills in questionnaire: stepper + question renderers |

### 6.2 New Components

**Template Builder** (`frontend/src/components/questionnaire/template-builder.tsx`):
- Split view: left sidebar with draggable sections (vertical stepper), right panel with active section's questions
- Welcome section pinned at position 0, non-removable, editable intro text only
- Sections reorderable via `@dnd-kit/sortable`
- Questions reorderable within section via `@dnd-kit/sortable`
- "Add section" button at bottom of sidebar
- "Add question" button at bottom of right panel (hidden for welcome section)
- Dirty state tracking via Zustand store; `beforeunload` warning on unsaved changes
- "Save" button (PATCH), "Preview" button (modal), "Publish" button (POST)
- Keyboard: `Cmd+Enter` to save, `N` to add question, `Escape` to cancel

**Question Editor** (`frontend/src/components/questionnaire/question-editor.tsx`):
- Inline editing of question text, helper tip, required toggle
- Answer type dropdown (10 types from `QuestionAnswerType` enum)
- Type-specific config: options editor for select types, column editor for table type, prefix/decimal for number type
- Condition builder for yes/no and single_select questions (target question dropdown)
- Delete question button with confirmation
- React Hook Form field registration for each question within the parent form

**Section Sidebar** (`frontend/src/components/questionnaire/section-sidebar.tsx`):
- Vertical stepper using shadcn `Stepper` component (vertical variant)
- Draggable sections via `@dnd-kit/sortable`
- Section title inline editing
- Completion state icons (in filler mode)
- Active section highlighting

**Questionnaire Filler** (`frontend/src/components/questionnaire/questionnaire-filler.tsx`):
- Split view: left stepper (read-only sections), right panel with questions
- Auto-save: debounced 500ms per answer via `saveAnswer` endpoint
- Retry: 3 attempts with exponential backoff on network failure
- "Saved" indicator (subtle toast or inline status)
- Resume: loads existing responses, positions at last answered section
- Conditional logic: client-side evaluation hides/shows questions based on trigger answers
- Hidden question answers preserved in DB but excluded from UI rendering
- Submit button validates visible required questions
- Re-opened state shows banner with practice message

**Question Type Renderers** (`frontend/src/components/questionnaire/question-types/`):
Shared between builder preview and filler. Each renderer handles both display and input modes.

| File | Question Type | Input Component |
|------|--------------|----------------|
| `yes-no.tsx` | Yes/No | Toggle or radio with optional explain textarea |
| `text-input.tsx` | Short Text / Long Text | `Input` (single-line) or `Textarea` (multi-line) with char count |
| `amount-input.tsx` | Amount / Number | Formatted currency input (Amount) or numeric with optional prefix (Number) |
| `date-input.tsx` | Date | shadcn `DatePicker` |
| `select-input.tsx` | Single Select / Multi Select | `Select` (dropdown) or checkbox group |
| `file-upload.tsx` | File Upload | Drag-and-drop area, max 10 files, 20 MB each, type-restricted |
| `table-input.tsx` | Table | Dynamic rows x fixed columns grid, max 50 rows |

**Template Preview** (`frontend/src/components/questionnaire/template-preview.tsx`):
- Modal rendering the client-facing view of the template
- Yellow banner: "Preview mode -- responses won't be saved."
- All question types interactive but answers discarded

**Questionnaire Review** (`frontend/src/components/questionnaire/questionnaire-review.tsx`):
- Practice-side read-only view of submitted responses
- Section-by-section layout with answers rendered by type
- Per-answer internal note (click to add, visible only to practice)
- "Conditional (hidden)" collapsed group for answers to hidden questions
- File attachments downloadable inline
- "Re-open" and "Mark as reviewed" action buttons
- Optional PracticeJob linking dropdown

**Task Suggestions Panel** (`frontend/src/components/questionnaire/task-suggestions-panel.tsx`) (P2):
- "Generate Tasks" button triggers AI streaming
- Streaming task list with title, description, assignee, hours, priority
- Per-task actions: Approve, Edit, Dismiss
- "Approve All" bulk action
- Complexity flag alert banner
- "Regenerate" with warning if suggestions already exist

### 6.3 New Types

```typescript
// frontend/src/types/questionnaire.ts

export type QuestionAnswerType =
  | 'yes_no' | 'short_text' | 'long_text' | 'number' | 'amount'
  | 'date' | 'single_select' | 'multi_select' | 'file_upload' | 'table';

export type RequestTemplateStatus = 'draft' | 'published' | 'archived';
export type QuestionnaireStatus = 'pending' | 'in_progress' | 'submitted' | 'reviewed' | 're_opened';

export interface QuestionCondition {
  question_id: number;
  operator: 'equals' | 'not_equals';
  value: boolean | string;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface TableColumn {
  label: string;
  type: 'text' | 'number' | 'amount';
}

export interface TemplateQuestion {
  id: number;
  question_text: string;
  helper_tip: string | null;
  answer_type: QuestionAnswerType;
  answer_type_label: string;
  is_required: boolean;
  sort_order: number;
  options: SelectOption[] | null;
  table_columns: TableColumn[] | null;
  condition: QuestionCondition | null;
  number_prefix: string | null;
  decimal_places: number | null;
}

export interface TemplateSection {
  id: number;
  title: string;
  description: string | null;
  sort_order: number;
  is_welcome: boolean;
  questions: TemplateQuestion[];
}

export interface RequestTemplate {
  id: number;
  uuid: string;
  practice_id: number | null;
  name: string;
  description: string | null;
  status: RequestTemplateStatus;
  status_label: string;
  version: number;
  welcome_title: string | null;
  welcome_message: string | null;
  is_system: boolean;
  created_by: { id: number; name: string } | null;
  sections: TemplateSection[];
  question_count: number;
  created_at: string;
  updated_at: string;
}

export interface QuestionnaireResponse {
  question_id: number;
  answer: unknown;  // varies by question type
  answered_at: string | null;
}

export interface QuestionnaireNote {
  id: number;
  question_id: number | null;
  body: string;
  created_by: { id: number; name: string } | null;
  created_at: string;
}

export interface SentQuestionnaire {
  id: number;
  uuid: string;
  template_name: string;
  template_version: number;
  workspace_id: number;
  workspace: { id: number; name: string } | null;
  practice_id: number;
  sent_by: { id: number; name: string } | null;
  due_date: string | null;
  custom_message: string | null;
  status: QuestionnaireStatus;
  status_label: string;
  total_questions: number;
  answered_count: number;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: { id: number; name: string } | null;
  template_snapshot: {
    name: string;
    version: number;
    welcome_title: string | null;
    welcome_message: string | null;
    sections: TemplateSection[];
  } | null;
  responses: QuestionnaireResponse[] | null;
  notes: QuestionnaireNote[] | null;
  task_suggestions: TaskSuggestion[] | null;
  created_at: string;
}

// AI types (P2)
export interface TaskSuggestion {
  title: string;
  description: string;
  suggestedAssignee: string | null;
  estimatedHours: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isFollowUp: boolean;
  relatedQuestionIds: number[];
}

export interface AISuggestedQuestion {
  text: string;
  answerType: QuestionAnswerType;
  helperTip: string | null;
  isRequired: boolean;
  options: SelectOption[] | null;
  conditionalFollowUp: {
    triggerValue: boolean | string;
    question: { text: string; answerType: QuestionAnswerType };
  } | null;
}

export interface AISuggestedSection {
  title: string;
  questions: AISuggestedQuestion[];
}
```

### 6.4 New TanStack Query Hook

```typescript
// frontend/src/hooks/use-questionnaires.ts
// TanStack Query hooks:

// Practice-side (template management):
//   useRequestTemplates(params)           -- template list with status filter
//   useRequestTemplateCounts()            -- StatusTab counts
//   useRequestTemplate(uuid)             -- single template for builder
//   useCreateRequestTemplate()           -- mutation
//   useUpdateRequestTemplate()           -- mutation (save builder state)
//   useDeleteRequestTemplate()           -- mutation
//   usePublishRequestTemplate()          -- mutation
//   useArchiveRequestTemplate()          -- mutation
//   useSendQuestionnaire()              -- mutation (send to workspaces)
//   useSystemTemplates()                 -- system template gallery (P3)
//   useCloneSystemTemplate()            -- mutation (P3)

// Practice-side (questionnaire review):
//   usePracticeQuestionnaires(params)    -- sent questionnaire list
//   usePracticeQuestionnaire(uuid)      -- single questionnaire with responses + notes
//   useReviewQuestionnaire()            -- mutation (review/reopen)
//   useAddQuestionnaireNote()           -- mutation
//   useGenerateTasks()                  -- mutation (AI task generation, P2)

// Workspace-side (client filling):
//   useQuestionnaires()                  -- client's questionnaire list
//   useQuestionnaire(uuid)              -- single questionnaire with snapshot + responses
//   useSaveAnswer()                     -- mutation (auto-save per question)
//   useSubmitQuestionnaire()            -- mutation
//   useUploadQuestionnaireFile()        -- mutation (file upload)
```

### 6.5 Zustand Stores

```typescript
// frontend/src/stores/template-builder-store.ts
// Tracks:
//   activeSectionId: number | null       -- which section is selected in sidebar
//   isDirty: boolean                     -- unsaved changes indicator
//   setDirty(dirty: boolean): void
//   setActiveSection(id: number): void
```

No other new stores needed. Questionnaire filler state lives in React Hook Form + TanStack Query cache.

### 6.6 Keyboard Shortcuts

| Page | Shortcut | Action |
|------|----------|--------|
| Template builder | `Cmd+Enter` | Save template |
| Template builder | `N` | Add new question to current section |
| Template builder | `Escape` | Cancel / go back |
| Questionnaire filler | `Cmd+Enter` | Submit questionnaire |
| Questionnaire filler | `Tab` / `Shift+Tab` | Navigate between questions |
| Questionnaire filler | `Enter` | Advance to next section |
| Practice review | `E` | Add note on selected answer |
| Practice review | `Cmd+Enter` | Mark as reviewed |

All shortcuts registered in the `?` help overlay per CLAUDE.md conventions.

---

## 7. AI Integration

### 7.1 Question Suggestion (US2, P2)

**Flow**:
1. Practice member clicks "Suggest questions" in template builder
2. Frontend calls `POST /api/questionnaires/suggest` (Next.js route handler)
3. Route handler fetches template context from Laravel: `GET /api/v1/practice/request-templates/{uuid}/suggest-context`
4. Context includes: template name, description, existing questions (to avoid duplicates)
5. Route handler calls `streamObject` with Anthropic provider and Zod schema
6. System prompt includes Australian accounting domain knowledge and engagement type patterns
7. Frontend streams results, renders "Add / Skip" UI per suggestion
8. "Add all" adds an entire suggested section
9. Rate limit: 5 requests per template per minute (debounce in frontend, enforce in route handler)

**Zod output schema**:
```typescript
z.object({
  sections: z.array(z.object({
    title: z.string(),
    questions: z.array(z.object({
      text: z.string(),
      answerType: z.enum([...QuestionAnswerType values]),
      helperTip: z.string().optional(),
      isRequired: z.boolean(),
      options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
      conditionalFollowUp: z.object({
        triggerValue: z.union([z.boolean(), z.string()]),
        question: z.object({ text: z.string(), answerType: z.string() }),
      }).optional(),
    })),
  })),
})
```

### 7.2 Response-to-Task Agent (US8, P2)

**Flow**:
1. Practice member opens submitted questionnaire review screen
2. Clicks "Generate Tasks" (manual trigger -- not automatic)
3. Frontend calls `POST /api/questionnaires/[uuid]/generate-tasks` (Next.js route handler)
4. Route handler fetches context from Laravel: `GET /api/v1/practice/questionnaires/{uuid}/context`
5. Context includes: all responses with question text, template structure, practice staff list (names + roles), linked PracticeJob (name, time budget, due date)
6. Route handler calls `streamObject` with task breakdown schema
7. Results stored in `sent_questionnaires.task_suggestions` JSON column
8. Practice member reviews tasks: Approve, Edit, or Dismiss each
9. "Approve" creates a `PracticeTask` via `CreatePracticeTask` action, linked to PracticeJob if one exists
10. "Approve All" creates all non-dismissed tasks in bulk

**Zod output schema**:
```typescript
z.object({
  tasks: z.array(z.object({
    title: z.string(),
    description: z.string(),
    suggestedAssignee: z.string().optional(),
    estimatedHours: z.number(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    isFollowUp: z.boolean(),
    relatedQuestionIds: z.array(z.number()),
  })),
  complexityFlag: z.string().optional(),
  totalEstimatedHours: z.number(),
})
```

**`suggestedAssignee`** is a staff member name (string), not an ID. The frontend matches it against practice members for the approval flow.

### 7.3 Answer Bot (US9, P3)

**Flow**:
1. Template has `answer_bot_enabled = true` (set in builder)
2. Client opens questionnaire, sees chat bubble (bottom-right corner with practice branding)
3. Client asks about a question, sends message via `POST /api/questionnaires/[uuid]/chat`
4. Next.js route handler uses `streamText` with Anthropic provider
5. System prompt constrained to: template's questions + helper tips from `template_snapshot`, general Australian accounting terminology
6. Bot cannot access workspace financial data -- only explains questions
7. Chat history stored in `questionnaire_bot_messages` table, max 50 messages per user per questionnaire
8. Practice review screen shows "Bot assisted" badge on questions where client interacted

---

## 8. Implementation Phases & Task Breakdown

### Phase 1: Frontend Core (Sprint 1) -- P1

Backend is complete. This phase builds the entire frontend for template management and questionnaire filling.

**Prerequisites**: None (all backend endpoints exist).

| # | Task | Dependencies | Est |
|---|------|-------------|-----|
| 1.1 | Create `frontend/src/types/questionnaire.ts` with all TypeScript types | None | 0.5d |
| 1.2 | Create `frontend/src/hooks/use-questionnaires.ts` with all TanStack Query hooks (template CRUD + questionnaire lifecycle) | 1.1 | 1d |
| 1.3 | Build question type renderers (7 files in `question-types/`) -- shared between builder and filler | 1.1 | 2d |
| 1.4 | Build `section-sidebar.tsx` -- vertical stepper with drag-and-drop sections | 1.1 | 1d |
| 1.5 | Build `question-editor.tsx` -- inline question config with answer type switching, condition builder | 1.3 | 1.5d |
| 1.6 | Build `template-builder.tsx` -- split-view with section sidebar + question editor, drag-and-drop for sections and questions, dirty state tracking | 1.4, 1.5 | 2d |
| 1.7 | Build `template-preview.tsx` -- modal preview with all question type renderers | 1.3, 1.6 | 0.5d |
| 1.8 | Build template list page (`/practice/settings/templates/page.tsx`) with StatusTabs, counts, CRUD actions | 1.2 | 1d |
| 1.9 | Build template builder page (`/practice/settings/templates/[id]/page.tsx`) with save/preview/publish/archive | 1.6, 1.7, 1.8 | 1d |
| 1.10 | Add file upload endpoint `QuestionnaireController@upload` (backend) | None | 0.5d |
| 1.11 | Build `questionnaire-filler.tsx` -- stepper + question renderers, auto-save (debounced 500ms), conditional logic evaluation, resume, submit | 1.3, 1.10 | 2.5d |
| 1.12 | Build questionnaire list page (`/questionnaires/page.tsx`) -- client-facing list with progress | 1.2 | 0.5d |
| 1.13 | Build questionnaire filler page (`/questionnaires/[id]/page.tsx`) -- welcome screen + filler | 1.11, 1.12 | 1d |
| 1.14 | Build `questionnaire-review.tsx` -- practice-side response view with notes, re-open, mark reviewed, PracticeJob linking | 1.3, 1.2 | 1.5d |
| 1.15 | Add "Questionnaires" tab to `/practice/requests` using existing StatusTabs | 1.2, 1.14 | 0.5d |
| 1.16 | Enhance `PublishRequestTemplate` action: validate at least one question exists | None | 0.25d |
| 1.17 | Keyboard shortcuts for builder, filler, and review pages + `?` overlay registration | 1.9, 1.13, 1.14 | 0.5d |
| 1.18 | Notifications: send events on questionnaire sent/submitted/re-opened via 024-NTF | None | 0.5d |

**Sprint 1 total estimate**: ~17 days

### Phase 2: AI Features (Sprint 2) -- P2

| # | Task | Dependencies | Est |
|---|------|-------------|-----|
| 2.1 | Create `SuggestTemplateQuestions` action (context assembly) | Phase 1 | 0.5d |
| 2.2 | Add `suggest-context` endpoint to `RequestTemplateController` | 2.1 | 0.25d |
| 2.3 | Create Next.js route handler `POST /api/questionnaires/suggest` with `streamObject` | 2.2 | 1d |
| 2.4 | Build AI suggestion UI in template builder: streaming results, Add/Skip per question, Add All per section | 2.3 | 1.5d |
| 2.5 | Enhance `SubmitQuestionnaireResponses`: conditional-aware required validation | Phase 1 | 1d |
| 2.6 | Create `GenerateTasksFromResponses` action (context assembly: responses + staff + jobs) | Phase 1 | 1d |
| 2.7 | Add `questionnaireContext` endpoint to `RequestTemplateController` | 2.6 | 0.25d |
| 2.8 | Create Next.js route handler `POST /api/questionnaires/[uuid]/generate-tasks` with `streamObject` | 2.7 | 1d |
| 2.9 | Build `task-suggestions-panel.tsx` with streaming task list, Approve/Edit/Dismiss, Approve All, PracticeTask creation | 2.8 | 2d |
| 2.10 | Integrate task suggestions panel into questionnaire review page | 2.9, 1.14 | 0.5d |

**Sprint 2 total estimate**: ~9 days

### Phase 3: Template Library & Answer Bot (Sprint 3) -- P3

| # | Task | Dependencies | Est |
|---|------|-------------|-----|
| 3.1 | Migration: make `practice_id` nullable on `request_templates` | None | 0.25d |
| 3.2 | Create `RequestTemplateSeeder` with 5 system templates (Individual Tax, Company/Trust Tax, BAS Prep, New Client Onboarding, Year-End Checklist) | 3.1 | 2d |
| 3.3 | Add `systemTemplates` and `cloneSystem` endpoints to `RequestTemplateController` | 3.1 | 0.5d |
| 3.4 | Build template gallery UI in "New Template" dialog: Start from scratch vs Use a template | 3.3 | 1d |
| 3.5 | Migration: add `answer_bot_enabled` to `request_templates` | None | 0.25d |
| 3.6 | Migration: create `questionnaire_bot_messages` table | None | 0.25d |
| 3.7 | Create `QuestionnaireBotMessage` model in `app/Models/Central/` | 3.6 | 0.25d |
| 3.8 | Add `answer_bot_enabled` to `RequestTemplate` model, `toSnapshot()`, and `RequestTemplateResource` | 3.5 | 0.25d |
| 3.9 | Add answer bot toggle to template builder settings | 3.8 | 0.25d |
| 3.10 | Create Next.js route handler `POST /api/questionnaires/[uuid]/chat` with `streamText` | 3.7 | 1d |
| 3.11 | Build answer bot chat bubble component in questionnaire filler | 3.10 | 1.5d |
| 3.12 | Add `botMessages` endpoint to `QuestionnaireController` | 3.7 | 0.25d |
| 3.13 | Add "Bot assisted" badge + transcript to questionnaire review screen | 3.12 | 0.5d |

**Sprint 3 total estimate**: ~8 days

### Phase 4: Testing & Polish (Sprint 4)

| # | Task | Dependencies | Est |
|---|------|-------------|-----|
| 4.1 | Backend feature tests: template CRUD, publish validation, send, questionnaire lifecycle, file upload, conditional submit validation | Phase 1-2 | 2d |
| 4.2 | Backend feature tests: AI context endpoints, system templates, answer bot messages | Phase 2-3 | 1d |
| 4.3 | Browser tests: template builder (create, edit, drag-and-drop, preview, publish) | Phase 1 | 1.5d |
| 4.4 | Browser tests: questionnaire filler (fill, auto-save, conditional logic, submit) | Phase 1 | 1.5d |
| 4.5 | Browser tests: practice review (view responses, add notes, re-open, mark reviewed) | Phase 1 | 1d |
| 4.6 | Polish: loading states, error handling, empty states, responsive design | All | 1d |
| 4.7 | Accessibility: focus management, ARIA labels, keyboard navigation | All | 0.5d |

**Sprint 4 total estimate**: ~8.5 days

---

## 9. Testing Strategy

### 9.1 Backend Feature Tests (Pest)

| Test File | Tests | Covers |
|-----------|-------|--------|
| `tests/Feature/Api/RequestTemplateTest.php` | ~12 | Template CRUD, publish validation (no questions = 422), version increment, archive, workspace isolation |
| `tests/Feature/Api/QuestionnaireTest.php` | ~10 | Send, save answer, auto-save status transition, submit (all required answered), submit (conditional hidden excluded), re-open, review |
| `tests/Feature/Api/QuestionnaireFileUploadTest.php` | ~5 | File upload: valid file, type restriction, size limit, workspace ownership, editable status check |
| `tests/Feature/Api/RequestTemplateAuthTest.php` | ~5 | Permission checks: view/create/update/delete/send per role |
| `tests/Feature/Api/SystemTemplateTest.php` | ~3 | System template list, clone into practice, cloned template is independent |

### 9.2 Browser Tests (Playwright via Pest)

| Test File | Tests | Covers |
|-----------|-------|--------|
| `tests/Browser/RequestTemplateTest.php` | ~6 | Template list loads, create template, edit sections/questions, preview, publish, send |
| `tests/Browser/QuestionnaireTest.php` | ~6 | Questionnaire list loads, fill in answers, auto-save indicator, conditional hide/show, submit, review |

### 9.3 Key Test Scenarios

1. Create template with sections and questions, verify persisted correctly
2. Publish template with no questions (excluding welcome section) -- expect 422
3. Publish template, send to workspace, verify `template_snapshot` captured
4. Edit published template, verify status reverts to draft
5. Send same template to same workspace twice -- two separate `SentQuestionnaire` records
6. Save answer, verify `updateOrCreate` behaviour (idempotent per question_id)
7. Auto-save transitions status from `pending` to `in_progress` on first answer
8. Submit with unanswered required question -- expect 422
9. Submit with hidden required question (condition unmet) -- expect success
10. Re-open submitted questionnaire, verify status is `re_opened` and client can edit
11. Mark as reviewed -- terminal state, no further transitions
12. File upload: valid PDF, oversized file (>20 MB), disallowed type (.exe)
13. Template deletion with existing sent questionnaires -- questionnaires unaffected
14. System template clone creates independent copy with practice's `practice_id`
15. Permission checks: roles without `request-template.create` get 403

---

## 10. File Inventory

### New Files (Backend)

| File | Priority | Purpose |
|------|----------|---------|
| `app/Actions/Practice/SuggestTemplateQuestions.php` | P2 | AI question suggestion context assembly |
| `app/Actions/Practice/GenerateTasksFromResponses.php` | P2 | AI response-to-task context assembly |
| `app/Models/Central/QuestionnaireBotMessage.php` | P3 | Answer bot chat history model |
| `database/migrations/2026_04_03_770002_make_request_templates_practice_id_nullable.php` | P3 | System template support |
| `database/migrations/2026_04_03_770003_add_answer_bot_to_request_templates.php` | P3 | Answer bot toggle |
| `database/migrations/2026_04_03_770004_create_questionnaire_bot_messages_table.php` | P3 | Bot chat history table |
| `database/seeders/RequestTemplateSeeder.php` | P3 | 5 system templates for AU accounting |
| `tests/Feature/Api/RequestTemplateTest.php` | P1 | Template CRUD tests |
| `tests/Feature/Api/QuestionnaireTest.php` | P1 | Questionnaire lifecycle tests |
| `tests/Feature/Api/QuestionnaireFileUploadTest.php` | P1 | File upload tests |
| `tests/Feature/Api/RequestTemplateAuthTest.php` | P1 | Permission tests |
| `tests/Feature/Api/SystemTemplateTest.php` | P3 | System template tests |
| `tests/Browser/RequestTemplateTest.php` | P1 | E2E template builder tests |
| `tests/Browser/QuestionnaireTest.php` | P1 | E2E questionnaire filler tests |

### New Files (Frontend)

| File | Priority | Purpose |
|------|----------|---------|
| `frontend/src/types/questionnaire.ts` | P1 | TypeScript types for templates, questionnaires, AI suggestions |
| `frontend/src/hooks/use-questionnaires.ts` | P1 | TanStack Query hooks for all endpoints |
| `frontend/src/stores/template-builder-store.ts` | P1 | Zustand store for builder dirty state |
| `frontend/src/app/(practice)/practice/settings/templates/page.tsx` | P1 | Template list page |
| `frontend/src/app/(practice)/practice/settings/templates/[id]/page.tsx` | P1 | Template builder page |
| `frontend/src/app/(dashboard)/questionnaires/page.tsx` | P1 | Client questionnaire list |
| `frontend/src/app/(dashboard)/questionnaires/[id]/page.tsx` | P1 | Client questionnaire filler |
| `frontend/src/components/questionnaire/template-builder.tsx` | P1 | Drag-and-drop builder |
| `frontend/src/components/questionnaire/question-editor.tsx` | P1 | Question configuration panel |
| `frontend/src/components/questionnaire/section-sidebar.tsx` | P1 | Draggable section stepper |
| `frontend/src/components/questionnaire/questionnaire-filler.tsx` | P1 | Client fill-in view with auto-save |
| `frontend/src/components/questionnaire/questionnaire-review.tsx` | P1 | Practice review of submitted responses |
| `frontend/src/components/questionnaire/template-preview.tsx` | P1 | Preview modal |
| `frontend/src/components/questionnaire/question-types/yes-no.tsx` | P1 | Yes/No renderer |
| `frontend/src/components/questionnaire/question-types/text-input.tsx` | P1 | Short/Long text renderer |
| `frontend/src/components/questionnaire/question-types/amount-input.tsx` | P1 | Amount/Number renderer |
| `frontend/src/components/questionnaire/question-types/date-input.tsx` | P1 | Date picker renderer |
| `frontend/src/components/questionnaire/question-types/select-input.tsx` | P1 | Single/Multi select renderer |
| `frontend/src/components/questionnaire/question-types/file-upload.tsx` | P1 | File upload renderer |
| `frontend/src/components/questionnaire/question-types/table-input.tsx` | P1 | Table grid renderer |
| `frontend/src/components/questionnaire/task-suggestions-panel.tsx` | P2 | AI task review panel |
| `frontend/src/app/api/questionnaires/suggest/route.ts` | P2 | AI question suggestion route handler |
| `frontend/src/app/api/questionnaires/[uuid]/generate-tasks/route.ts` | P2 | AI task generation route handler |
| `frontend/src/app/api/questionnaires/[uuid]/chat/route.ts` | P3 | Answer bot route handler |

### Modified Files (Backend)

| File | Priority | Change |
|------|----------|--------|
| `app/Http/Controllers/Api/QuestionnaireController.php` | P1 | Add `upload` method for file uploads; add `botMessages` method (P3) |
| `app/Http/Controllers/Api/RequestTemplateController.php` | P2 | Add `suggestContext`, `questionnaireContext` methods (P2); add `systemTemplates`, `cloneSystem` methods (P3) |
| `app/Actions/Practice/PublishRequestTemplate.php` | P1 | Add validation: at least one question required |
| `app/Actions/Practice/SubmitQuestionnaireResponses.php` | P2 | Enhance with conditional-aware required validation |
| `app/Models/Central/RequestTemplate.php` | P3 | Add `answer_bot_enabled` to fillable/casts, include in `toSnapshot()` |
| `app/Http/Resources/RequestTemplateResource.php` | P3 | Add `answer_bot_enabled` field |
| `routes/api.php` | P1-P3 | Add upload route (P1), context routes (P2), system template routes (P3), bot routes (P3) |

### Modified Files (Frontend)

| File | Priority | Change |
|------|----------|--------|
| `frontend/src/lib/navigation.ts` | P1 | Add `/practice/settings/templates` nav item (practice sidebar) |
| `frontend/src/components/practice/practice-shell.tsx` | P1 | Add "Templates" nav link under Settings section |
| Practice requests page | P1 | Add "Questionnaires" tab using StatusTabs |
| Dashboard sidebar | P1 | Add "Questionnaires" nav link for workspace users |

---

## 11. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Drag-and-drop builder complexity | High | Medium | Use @dnd-kit (already installed, proven in codebase). Start with basic reordering, add nested DnD (sections containing questions) incrementally. |
| Auto-save reliability | Medium | Low | Debounce 500ms, retry 3x with exponential backoff, persistent "Save failed" toast after exhaustion. Test with network throttling. |
| Template snapshot size | Low | Low | Max 200 questions x ~200 bytes = ~40 KB. Well within JSON column limits. |
| Conditional logic edge cases | Medium | Medium | V1 restricts to same-section forward references only (no backward, no cross-section). Conditions evaluated client-side with server storing all answers regardless. |
| AI suggestion quality | Low | Medium | Rate-limited (5/min). Suggestions are ephemeral -- user must explicitly accept. No automatic insertion. |
| AI task generation cost | Medium | Low | Manual trigger only (no auto-run on submit). Practice controls when/whether to generate. Cost is one Anthropic API call per click. |
| File upload size limits | Low | Low | 20 MB per file, 10 files per question. Matches existing attachment infrastructure. |
