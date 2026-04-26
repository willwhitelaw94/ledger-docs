---
title: "Feature Specification: Custom Request Templates & Client Questionnaires"
---

# Feature Specification: Custom Request Templates & Client Questionnaires

**Feature Branch**: `077-custom-request-templates`
**Created**: 2026-04-01
**Status**: Draft
**Epic**: 077-CRQ
**Initiative**: FL -- Financial Ledger Platform
**Effort**: M (3--4 sprints)
**Depends On**: 027-PMV (complete -- practice management), Client Requests (complete -- free-form request lifecycle)

### Out of Scope

- **E-signatures on responses** -- deferred to 059-DGS (Document Governance & Signing).
- **Automated follow-ups / reminders** -- deferred to 066-WFA (Workflow Automation). V1 is manual send.
- **Client portal (external)** -- V1 questionnaires are answered within the workspace. A public link for unauthenticated clients is deferred to 022-CPV / 058-CPT.
- **Payment collection within questionnaires** -- no embedded payment forms.
- **Template marketplace** -- sharing templates between practices is deferred.
- **Bulk re-send** -- resending a questionnaire to multiple workspaces that already received it is V2. V1 allows sending to new workspaces only.
- **Branching across sections** -- conditional logic in V1 only shows/hides questions within the same section. Cross-section skip logic (e.g. "skip entire Rental section") is deferred to V2.

---

## Overview

Accounting practices spend significant time chasing clients for the same information every engagement cycle. "Have you sold any shares?", "Upload your PAYG summaries", "Do you have a rental property?" -- these questions are asked every tax return, every BAS period, every new client onboarding. Currently, MoneyQuest's client request system is **free-form** -- the practice types a subject and description, and the client replies with text or attachments. This works for ad-hoc requests but fails for structured, repeatable information gathering.

**Competitor context**: XPM has a basic template builder (sections, questions with answer types like yes/no/text/file, preview mode, publish workflow). It's functional but visually dated -- grey backgrounds, "Untitled section" defaults, clunky radio buttons, no conditional logic, no AI assistance. Karbon has "Client Tasks" with checklists. TaxDome has "Organizers" -- multi-page questionnaires with conditional logic and e-signatures. Ignition (proposal tool) has questionnaire templates for engagement scoping.

**Our opportunity**: Build a modern, beautiful questionnaire system that leapfrogs XPM's basic template builder with:
- A polished drag-and-drop builder (Typeform/Notion-quality, not Google Forms 2015)
- AI-suggested questions based on engagement type
- Conditional logic (show/hide based on answers)
- Pre-built template library for common AU accounting engagements
- Auto-save responses so clients can come back later
- Progress tracking for the practice ("3 of 12 questions answered")

---

## User Scenarios & Testing

### User Story 1 -- Template Builder (Priority: P1)

A practice partner creates a reusable questionnaire template (e.g. "FY26 Individual Tax Return Checklist") with sections and questions. The builder is visual, drag-and-drop, and supports multiple question types.

**Why this priority**: Templates must exist before questionnaires can be sent to clients. The builder is the core authoring experience.

**Acceptance Scenarios**:

1. **Given** I am a practice member, **When** I navigate to `/practice/settings/templates`, **Then** I see a list of all questionnaire templates with name, question count, last modified, and status (draft/published).

2. **Given** I click "New Template", **When** the builder opens, **Then** I see a split-view: left sidebar with sections (vertical stepper), right panel with the active section's questions. A template starts with one "Welcome" section (non-removable, customisable intro text) and one untitled section.

3. **Given** I am in the builder, **When** I add a question to a section, **Then** I can choose from the following answer types:
   - **Yes/No** -- toggle or radio with optional "explain" text field on one answer
   - **Short text** -- single-line text input (max 500 characters)
   - **Long text** -- multi-line textarea (max 5000 characters)
   - **Number** -- numeric input with optional prefix (e.g. "$") and decimal control (0-4 decimal places)
   - **Amount** -- currency input (integer cents, formatted with $ and commas)
   - **Date** -- date picker (single date, no range)
   - **Single select** -- dropdown with custom options (2-50 options)
   - **Multi select** -- checkbox list with custom options (2-50 options)
   - **File upload** -- drag-and-drop file area, multiple files allowed (max 10 files per question, max 20 MB each), restricted to the same file types as the existing File model (`pdf, jpg, jpeg, png, gif, webp, csv, txt, xls, xlsx, doc, docx`). Files are uploaded to the workspace's S3 path via the existing attachment infrastructure and stored as file references in the JSON answer.
   - **Table** -- rows x columns grid for structured data (e.g. "List all rental properties: Address | Annual Rent | Expenses"). Columns defined at design time (2-10 columns). Clients add rows dynamically (max 50 rows).

4. **Given** I have added a question, **When** I configure it, **Then** I can set: question text (required, max 1000 chars), helper tip (optional, max 500 chars, shown as hint text below the question), required/optional toggle, and answer type. Question text supports plain text only (no rich text/markdown).

5. **Given** I have multiple questions in a section, **When** I drag a question, **Then** I can reorder questions within the section via drag-and-drop.

6. **Given** I have multiple sections, **When** I drag a section in the sidebar, **Then** I can reorder sections. The "Welcome" section always stays first.

7. **Given** I am editing a template, **When** I click "Preview", **Then** a modal shows the client-facing view of the questionnaire exactly as the client will see it, with a yellow banner: "Preview mode -- responses won't be saved." I can interact with all question types.

8. **Given** I have finished building, **When** I click "Publish", **Then** the template status changes from "draft" to "published" and the `version` integer increments. Published templates can be sent to clients. Editing a published template reverts the template status back to "draft" (the same row is edited, not cloned). Re-publishing increments the version again.

9. **Given** a template has been sent to clients, **When** I edit it, **Then** changes apply only to future sends. In-flight questionnaires (already sent, not yet submitted) use the `template_snapshot` JSON captured at send time. The `template_version` on `sent_questionnaires` records which publish version was used for traceability.

10. **Given** a template has at least one section with at least one question (excluding the welcome section), **When** I click "Publish", **Then** the publish succeeds. **Given** a template has no questions, **When** I click "Publish", **Then** validation fails with "Template must have at least one question before publishing."

---

### User Story 2 -- AI-Suggested Questions (Priority: P2)

When creating a new template, the practice can describe the engagement type and the AI suggests relevant questions pre-populated into sections.

**Acceptance Scenarios**:

1. **Given** I create a new template and enter the name "FY26 Individual Tax Return", **When** I click "Suggest questions", **Then** the AI generates a structured set of sections and questions appropriate for an Australian individual tax return (e.g. "Income" section with "Did you receive salary/wages?", "Deductions" section with "Did you work from home?", "Capital Gains" section with "Did you sell shares or property?").

2. **Given** the AI has suggested questions, **When** the suggestions appear, **Then** each suggestion has an "Add" / "Skip" action. I can add individual questions or "Add all" for a section.

3. **Given** I have added AI-suggested questions, **When** I view them in the builder, **Then** they are fully editable -- I can change wording, reorder, delete, or add more manually.

4. **Given** the AI suggests questions, **When** they include yes/no types, **Then** the AI also suggests conditional follow-up questions (e.g. "Did you sell shares?" -> Yes -> "Upload your share trading summary").

---

### User Story 3 -- Conditional Logic (Priority: P2)

Questions can be shown or hidden based on answers to previous questions. This reduces questionnaire fatigue -- clients only see what's relevant to them.

**Acceptance Scenarios**:

1. **Given** I am editing a yes/no question, **When** I click "Add condition", **Then** I can specify: "If answer is [Yes/No], then show question [dropdown of subsequent questions in the same section]". Conditions can only target questions that appear later in the same section (no backward references, no cross-section references in V1).

2. **Given** a single-select question "Employment type" with options "Employee", "Contractor", "Both", **When** I add a condition, **Then** I can specify: "If answer is 'Contractor', then show question 'ABN'" and "If answer is 'Employee', then show question 'PAYG Summary upload'". Only yes/no and single-select question types can be condition triggers. Multi-select, number, text, and other types cannot trigger conditions in V1.

3. **Given** a client is filling in the questionnaire and answers "No" to "Do you have a rental property?", **When** the next question would be "Upload rental summary" (conditional on Yes), **Then** the rental summary question is hidden and the client proceeds to the next visible question.

4. **Given** a client changes their answer from "Yes" to "No" on a conditional trigger, **When** the dependent questions become hidden, **Then** any answers already entered in those hidden questions are preserved in the database (not deleted) but excluded from the submitted response view. The practice review screen shows these hidden answers in a collapsed "Conditional (hidden)" group for transparency.

---

### User Story 4 -- Send Questionnaire to Client (Priority: P1)

A practice member sends a published template to one or more client workspaces. The questionnaire appears in the client's workspace as an action item.

**Acceptance Scenarios**:

1. **Given** I have a published template, **When** I click "Send to client", **Then** a dialog appears where I select: client workspace(s) (multi-select from connected practice workspaces only), due date (optional), and custom message (optional, prepended to the welcome section). The send dialog only shows workspaces that have an accepted `PracticeWorkspace` connection.

2. **Given** I send the questionnaire, **When** it reaches the client workspace, **Then** it appears in the client's questionnaire list at `/questionnaires` with status "pending", the template name, due date, and practice name. Questionnaires are a separate model (`SentQuestionnaire`) from free-form `ClientRequest` records -- they are not subtypes of `ClientRequest`.

3. **Given** multiple questionnaires are sent to the same client, **When** the client views their list, **Then** each questionnaire is a separate item with its own progress and due date. Sending the same template to the same workspace multiple times creates separate `SentQuestionnaire` records (e.g. FY25 and FY26 tax return questionnaires from the same template).

4. **Given** I am a practice member, **When** I view `/practice/requests`, **Then** sent questionnaires appear in a separate "Questionnaires" tab alongside the existing "Requests" tab (using `StatusTabs`). Questionnaires show response progress ("7 of 12 answered") and status (pending/in-progress/submitted/reviewed). The existing `/practice/questionnaires` endpoint serves this list.

---

### User Story 5 -- Client Fills In Questionnaire (Priority: P1)

A client (workspace user) receives a questionnaire and answers the questions section by section. Responses auto-save. The client submits when done.

**Acceptance Scenarios**:

1. **Given** I am a workspace user with a pending questionnaire, **When** I open it, **Then** I see the welcome section with the practice's branding (practice name, optional message), a "Get started" button, and reassurance text: "Your responses are automatically saved" and "You can come back to this later."

2. **Given** I click "Get started", **When** the first question section loads, **Then** I see a split view: left sidebar with a vertical stepper showing all sections (numbered, with completion state), right panel with the active section's questions.

3. **Given** I answer a question, **When** I move to the next question or section, **Then** my answer is auto-saved (debounced 500ms). A subtle "Saved" indicator confirms persistence.

4. **Given** I am on section 2 of 4, **When** I close the browser and return later, **Then** I resume exactly where I left off with all previous answers preserved.

5. **Given** I have answered all required questions, **When** I click "Submit", **Then** the questionnaire status changes to "submitted", the practice receives an in-app notification (via existing 024-NTF infrastructure), and I see a confirmation: "Your responses have been sent to [Practice name]." The `SubmitQuestionnaireResponses` action validates all required questions are answered before transitioning status.

6. **Given** I have submitted, **When** I view the questionnaire again, **Then** I see my answers in read-only mode. I cannot edit after submission unless the practice "re-opens" it. Re-opened questionnaires transition to `re_opened` status and allow further edits.

7. **Given** a question is required and I haven't answered it, **When** I try to submit, **Then** the section containing the unanswered required question is highlighted in the sidebar stepper, and the specific question shows a validation error. Required hidden questions (hidden by conditional logic where the trigger condition is not met) are excluded from the required check.

8. **Given** multiple users in the same workspace have access, **When** they open the same questionnaire, **Then** any workspace member can answer questions. Each answer records `answered_by_user_id` for audit. The last writer wins (no real-time collaboration in V1). Any workspace member can submit.

---

### User Story 6 -- Practice Reviews Responses (Priority: P1)

A practice member reviews the client's submitted responses, with the ability to add internal notes and re-open for corrections.

**Acceptance Scenarios**:

1. **Given** a client has submitted a questionnaire, **When** I open it from `/practice/requests`, **Then** I see the client's responses in a clean read-only view, section by section, with file attachments downloadable inline.

2. **Given** I am reviewing responses, **When** I click on a specific answer, **Then** I can add an internal note (visible only to practice members, not the client) like "Need to verify this amount" or "Follow up re: rental deductions".

3. **Given** I need the client to correct or add information, **When** I click "Re-open", **Then** the questionnaire status changes back to "in-progress" with an optional message to the client explaining what needs correction. The client receives a notification.

4. **Given** I am satisfied with the responses, **When** I click "Mark as reviewed", **Then** the questionnaire status changes to "reviewed" (terminal state -- cannot transition further), `reviewed_at` and `reviewed_by_user_id` are recorded. The questionnaire can optionally be linked to an existing `PracticeJob` for the same workspace. Linking is a manual selection from a dropdown of the client's active practice jobs -- not automatic.

---

### User Story 7 -- Template Library (Priority: P3)

Pre-built templates for common Australian accounting engagements, available as starting points.

**Acceptance Scenarios**:

1. **Given** I click "New Template", **When** the creation dialog appears, **Then** I can choose "Start from scratch" or "Use a template" with a gallery of pre-built options.

2. **Pre-built templates include**:
   - Individual Tax Return (FY) -- income sources, deductions, capital gains, rental properties, private health
   - Company/Trust Tax Return -- financial statements, related party transactions, distributions
   - BAS Preparation -- GST summary, PAYG withholding, adjustments
   - New Client Onboarding -- business details, entity structure, key contacts, access credentials
   - Year-End Checklist -- outstanding invoices, accruals, prepayments, stocktake

3. **Given** I select a pre-built template, **When** it loads in the builder, **Then** all questions and sections are fully editable. The template is a deep copy created as a new `RequestTemplate` with `is_system = false` -- changes don't affect the original system template.

4. **Given** pre-built templates exist, **When** they are created, **Then** they are seeded via a `RequestTemplateSeeder` (similar to CoA templates in `database/seeders/Templates/`). System templates have `is_system = true` and `practice_id = null`. They are cloned into the practice's own templates when selected, with `is_system = false` and the practice's `practice_id`.

---

## Technical Design

### Data Model

> **Note**: These tables live in the **central** database (not tenant-scoped). Models are in `app/Models/Central/`. This is consistent with the existing `ClientRequest`, `PracticeTask`, and `PracticeJob` models which are all central/practice-scoped. The `workspace_id` FK on `sent_questionnaires` identifies the target client workspace.

```
request_templates
├── id (PK)
├── uuid (unique, used in API routes)
├── practice_id (FK practices)
├── name (string, max 255)
├── description (text, nullable, max 1000)
├── status (draft | published | archived) -- RequestTemplateStatus enum
├── version (int, starts at 1, incremented on each publish)
├── welcome_title (string, nullable)
├── welcome_message (text, nullable -- rich text for practice intro)
├── is_system (bool, default false -- marks pre-built library templates)
├── created_by_user_id (FK users, nullable)
├── timestamps

request_template_sections
├── id (PK)
├── request_template_id (FK, cascadeOnDelete)
├── title (string, max 255)
├── description (text, nullable)
├── sort_order (int, 0-based)
├── is_welcome (bool, first section only)
├── timestamps

request_template_questions
├── id (PK)
├── section_id (FK request_template_sections, cascadeOnDelete)
├── question_text (text, max 1000)
├── helper_tip (text, nullable, max 500)
├── answer_type (string) -- QuestionAnswerType enum
├── is_required (bool, default false)
├── sort_order (int, 0-based)
├── options (JSON, nullable -- for select types: [{label, value}])
├── table_columns (JSON, nullable -- for table type: [{label, type}])
├── condition (JSON, nullable -- {question_id, operator, value})
├── number_prefix (string, nullable, max 10 -- e.g. "$")
├── decimal_places (tinyint, nullable, 0-4)
├── timestamps

sent_questionnaires
├── id (PK)
├── uuid (unique, used in API routes)
├── request_template_id (FK, nullable, nullOnDelete -- template may be deleted)
├── template_version (int -- which publish version was snapshotted)
├── workspace_id (FK workspaces, cascadeOnDelete)
├── practice_id (FK practices, cascadeOnDelete)
├── sent_by_user_id (FK users, nullable)
├── due_date (date, nullable)
├── custom_message (text, nullable)
├── status (pending | in_progress | submitted | reviewed | re_opened) -- QuestionnaireStatus enum
├── submitted_at (timestamp, nullable)
├── reviewed_at (timestamp, nullable)
├── reviewed_by_user_id (FK users, nullable)
├── template_snapshot (JSON -- full template structure frozen at send time)
├── task_suggestions (JSON, nullable -- AI-generated task breakdown, US8)
├── timestamps

questionnaire_responses
├── id (PK)
├── questionnaire_id (FK sent_questionnaires, cascadeOnDelete)
├── question_id (unsigned bigint -- references question id from template_snapshot, NOT an FK)
├── answer (JSON, nullable -- flexible: string, number, boolean, array, file refs)
├── answered_by_user_id (FK users, nullable)
├── answered_at (timestamp, nullable)
├── timestamps
├── UNIQUE(questionnaire_id, question_id) -- one answer per question per questionnaire

questionnaire_notes (internal practice notes on responses)
├── id (PK)
├── questionnaire_id (FK sent_questionnaires, cascadeOnDelete)
├── question_id (unsigned bigint, nullable -- null = general note on whole questionnaire)
├── body (text, max 5000)
├── created_by_user_id (FK users, nullable)
├── timestamps
```

### Key Architectural Decisions

1. **Template versioning via snapshot**: When a questionnaire is sent, the full template structure is serialised as JSON into `template_snapshot` via `RequestTemplate::toSnapshot()`. This ensures in-flight questionnaires are immune to template edits. The `template_version` integer tracks which publish version was used. The snapshot includes all sections, questions, options, conditions, and formatting metadata. The client-facing filler reads exclusively from the snapshot, never from the live template tables.

2. **Answer storage as JSON**: Each response stores the answer as a JSON value. Answer shapes by type:
   - **yes_no**: `true` or `false` (boolean), with optional `{"value": true, "explanation": "..."}`
   - **short_text / long_text**: `"string value"`
   - **number / amount**: `42` or `4200` (amount in cents)
   - **date**: `"2026-04-01"` (ISO 8601 date string)
   - **single_select**: `"option_value"`
   - **multi_select**: `["option_a", "option_b"]`
   - **file_upload**: `[{"file_id": 123, "filename": "payg.pdf", "size_bytes": 204800}]`
   - **table**: `[{"Address": "10 Smith St", "Annual Rent": 52000, "Expenses": 8000}, ...]`

3. **Conditional logic in builder only**: Conditions are evaluated client-side (Next.js) when the client fills in the questionnaire. The backend stores all answers regardless of visibility -- conditions only affect the UI rendering. The condition JSON shape is `{question_id: int, operator: "equals" | "not_equals", value: mixed}`. V1 only supports `equals` and `not_equals` operators.

4. **Stepper component reuse**: The client-facing questionnaire uses the `<Stepper>` component from `frontend/src/components/ui/stepper.tsx` (vertical variant) for section navigation, creating a polished split-view experience.

5. **Central models, not tenant-scoped**: All 077-CRQ models live in `app/Models/Central/` (consistent with `ClientRequest`, `PracticeTask`, `PracticeJob`). Templates are scoped to `practice_id`. Questionnaires are scoped to both `practice_id` and `workspace_id`. No `workspace_id` global scope is applied -- access control is enforced in controllers via explicit practice/workspace ownership checks.

6. **File uploads use existing infrastructure**: Questionnaire file uploads go through the existing S3 attachment pipeline. Files are uploaded via a dedicated `POST /api/v1/questionnaires/{uuid}/upload` endpoint, which returns a file reference (id, filename, size). The file reference is then saved as part of the answer JSON via the normal `saveAnswer` endpoint. Files are stored against the client's `workspace_id` for correct tenant isolation.

### File Structure

```
app/
├── Models/Central/                     # Central models (practice-scoped, not tenant-scoped)
│   ├── RequestTemplate.php             # EXISTS
│   ├── RequestTemplateSection.php      # EXISTS
│   ├── RequestTemplateQuestion.php     # EXISTS
│   ├── SentQuestionnaire.php           # EXISTS
│   ├── QuestionnaireResponse.php       # EXISTS
│   └── QuestionnaireNote.php           # EXISTS
├── Enums/Practice/
│   ├── RequestTemplateStatus.php       # EXISTS (draft, published, archived)
│   ├── QuestionnaireStatus.php         # EXISTS (pending, in_progress, submitted, reviewed, re_opened)
│   └── QuestionAnswerType.php          # EXISTS (yes_no, short_text, long_text, etc.)
├── Actions/Practice/
│   ├── CreateRequestTemplate.php       # EXISTS
│   ├── PublishRequestTemplate.php      # EXISTS
│   ├── SendQuestionnaire.php           # EXISTS
│   ├── SubmitQuestionnaireResponses.php # EXISTS
│   ├── ReviewQuestionnaire.php         # EXISTS
│   └── GenerateTasksFromResponses.php  # NEW -- AI response-to-task agent (US8, P2)
├── Http/Controllers/Api/
│   ├── RequestTemplateController.php   # EXISTS -- template CRUD + practice-side questionnaire list
│   └── QuestionnaireController.php     # EXISTS -- workspace-side fill + practice-side review/notes

frontend/src/
├── app/(practice)/practice/
│   └── settings/templates/
│       ├── page.tsx                    # Template list
│       └── [id]/
│           └── page.tsx               # Template builder
├── app/(dashboard)/
│   └── questionnaires/
│       ├── page.tsx                    # Client questionnaire list
│       └── [id]/
│           └── page.tsx               # Client fills in questionnaire
├── components/questionnaire/
│   ├── template-builder.tsx           # Drag-and-drop builder (uses @dnd-kit/core + @dnd-kit/sortable)
│   ├── question-editor.tsx            # Individual question config panel
│   ├── section-sidebar.tsx            # Left sidebar with section stepper
│   ├── questionnaire-filler.tsx       # Client-facing fill-in view
│   ├── questionnaire-review.tsx       # Practice reviews submitted responses
│   ├── question-types/                # Renderers per answer type (shared between builder preview and filler)
│   │   ├── yes-no.tsx
│   │   ├── text-input.tsx
│   │   ├── amount-input.tsx
│   │   ├── date-input.tsx
│   │   ├── select-input.tsx
│   │   ├── file-upload.tsx
│   │   └── table-input.tsx
│   ├── template-preview.tsx           # Preview modal (read-only render of template)
│   └── task-suggestions-panel.tsx     # AI-generated task review panel (US8, P2)
├── hooks/
│   └── use-questionnaires.ts          # TanStack Query hooks for questionnaire CRUD
```

### Dependencies

- **@dnd-kit/core + @dnd-kit/sortable** -- drag-and-drop for sections and questions (already proven pattern, lightweight)
- **AI SDK v4** (`streamText`) -- for AI question suggestions and response-to-task agent
- No other new dependencies -- uses existing shadcn/ui primitives, Zustand, TanStack Query

---

## Agentic Workflow: Response-to-Task Pipeline

### User Story 8 -- AI Response Agent (Priority: P2)

When a client submits a completed questionnaire, an AI agent reviews the responses and generates a structured task breakdown for the practice staff -- like a senior accountant reading the answers and writing up the work brief.

**Why this priority**: This is the key differentiator from XPM. Their questionnaires collect information; ours **interpret it and create work**. The agent turns passive data collection into an active workflow trigger.

**Flow**:

```
Client submits questionnaire
        ↓
Practice member opens response review screen
        ↓
Practice member clicks "Generate Tasks" (manual trigger, not automatic)
        ↓
AI agent reads all responses + template context + practice staff + linked jobs
        ↓
Agent generates structured task breakdown:
  - Task title + description (referencing specific client answers)
  - Suggested staff assignment (matched by name from 072-JTW staff allocations)
  - Estimated time (hours)
  - Priority (based on due date proximity + complexity signals)
  - Required follow-ups (missing info, unclear answers flagged as isFollowUp: true)
        ↓
Practice member reviews AI-generated tasks in a "Review & Approve" panel
        ↓
Approved tasks → PracticeTask records linked to PracticeJob (072-JTW)
```

**Acceptance Scenarios**:

1. **Given** a client has submitted a questionnaire for "FY26 Individual Tax Return", **When** the practice opens the response, **Then** alongside the answers they see an "AI Task Suggestions" panel with a list of generated tasks (e.g. "Process salary income from PAYG summary", "Calculate home office deductions -- client reported 180 days WFH", "Review capital gains -- client sold 3 ASX holdings").

2. **Given** the AI has generated task suggestions, **When** I view each suggestion, **Then** I see: task title, description (referencing specific client answers), suggested assignee, estimated hours, and priority. Each task has "Approve", "Edit", or "Dismiss" actions.

3. **Given** I click "Approve" on a task suggestion, **When** confirmed, **Then** the task is created as a practice task linked to the relevant practice job (if one exists for this client engagement) with the AI-generated title, description, assignee, and time estimate.

4. **Given** I click "Approve All", **When** confirmed, **Then** all non-dismissed task suggestions are created as practice tasks in bulk.

5. **Given** the client answered "Yes" to "Do you have a rental property?" but did not upload a rental summary, **When** the AI generates tasks, **Then** one task is specifically: "Follow up: request rental property summary from [Client name] -- marked as having rental but no document uploaded." This task is flagged as a follow-up, not processing work.

6. **Given** the client's answers reveal complexity (e.g. multiple rental properties, CGT events, overseas income), **When** the AI generates the task breakdown, **Then** total estimated hours are higher and the AI flags it to the practice: "This return may require senior review -- complex CGT and foreign income detected."

7. **Given** a practice has a practice job "FY26 Tax Return - Smith Pty Ltd" linked to this client, **When** tasks are approved, **Then** they are automatically linked to that job and their estimated hours contribute to the job's time budget tracking (072-JTW WIP).

---

### User Story 9 -- Answer Bot (Priority: P3)

A practice can attach an AI "answer bot" to a questionnaire template. When a client is filling in the questionnaire and gets stuck, they can ask the bot for help understanding what's being asked or what documents they need.

**Acceptance Scenarios**:

1. **Given** a template has "Answer Bot" enabled, **When** a client is filling in the questionnaire, **Then** a small chat bubble appears in the bottom-right corner with the practice's branding. Clicking it opens a conversational AI panel.

2. **Given** I am a client stuck on a question like "Did you make any personal super contributions?", **When** I ask the bot "What does this mean?", **Then** the bot explains in plain language: "This means any extra money you put into your super fund yourself, on top of what your employer contributes. Check your super fund statement for 'personal contributions' or 'voluntary contributions'."

3. **Given** the bot is scoped to the questionnaire context, **When** a client asks an unrelated question (e.g. "What's the weather?"), **Then** the bot politely redirects: "I can help with questions about this form. Which question are you stuck on?"

4. **Given** the bot helps a client, **When** the practice reviews responses, **Then** they can see a "Bot assisted" indicator on questions where the client interacted with the bot, with a link to the chat transcript.

### Technical Design: AI Integration

**Question Suggestion** (User Story 2, P2):
- Endpoint: `POST /api/v1/practice/request-templates/{requestTemplate:uuid}/suggest-questions`
- Backend: new `SuggestTemplateQuestions` action. Uses AI SDK `streamObject` (not `streamText`) with a Zod schema to produce structured sections/questions.
- System prompt context: template name, description, Australian accounting domain knowledge, existing questions already in the template (to avoid duplicates).
- Zod output schema:
  ```
  z.object({
    sections: z.array(z.object({
      title: z.string(),
      questions: z.array(z.object({
        text: z.string(),
        answerType: z.enum(['yes_no', 'short_text', 'long_text', 'number', 'amount', 'date', 'single_select', 'multi_select', 'file_upload', 'table']),
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
- Frontend streams results and renders an "Add / Skip" UI per suggestion. "Add all" adds an entire suggested section. Suggestions are ephemeral (not persisted) -- they are only added when the user explicitly accepts them.
- Rate limit: 5 suggestion requests per template per minute (debounce in frontend, enforce in backend).

**Response-to-Task Agent** (User Story 8, P2):
- **Not** auto-triggered on submission. The practice member manually clicks "Generate tasks" from the questionnaire review screen. This avoids unwanted AI costs and gives the practice control.
- Action: `GenerateTasksFromResponses` (Lorisleiva action)
- Uses AI SDK `streamObject` via a Next.js route handler `POST /api/questionnaires/{uuid}/generate-tasks` which proxies to the Laravel backend.
- Zod output schema:
  ```
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
- System prompt includes: all submitted responses (answers + question text), template structure from snapshot, practice staff list (names + roles from 027-PMV `StaffAllocation` model), existing `PracticeJob` for this workspace (name, time budget, due date).
- `suggestedAssignee` is a staff member name (string), not an ID. The frontend matches it to practice members for the "Approve" flow.
- Results stored in `sent_questionnaires.task_suggestions` (JSON column, already exists) until approved/dismissed.
- "Approve" creates a `PracticeTask` linked to the relevant `PracticeJob` via `practice_job_id`. If no job exists, the task is created without a job link.
- "Approve All" creates all non-dismissed tasks in a single batch.

**Answer Bot** (User Story 9, P3):
- Endpoint: `POST /api/v1/questionnaires/{sentQuestionnaire:uuid}/chat`
- Uses AI SDK `streamText` via the existing chat infrastructure pattern from 021-AIQ (`frontend/src/app/api/chat/route.ts`).
- System prompt constrained to: the specific template's questions and helper tips from `template_snapshot`, general Australian accounting terminology. The bot cannot access workspace financial data -- it only explains the questions.
- Chat history scoped per user per questionnaire. Stored in a new `questionnaire_bot_messages` table (simple: `id, questionnaire_id, user_id, role, content, timestamps`). Max 50 messages per conversation.
- The practice review screen shows a "Bot assisted" badge on questions where the client interacted with the bot, with an expandable transcript. This is derived by matching `questionnaire_bot_messages` to question context.

---

## Clarifications

Decisions made during spec refinement, documented for traceability. Each resolves an ambiguity identified during analysis.

### C1. Relationship between `SentQuestionnaire` and `ClientRequest`

**Ambiguity**: The spec mentions questionnaires appearing "alongside free-form requests" but doesn't clarify whether a sent questionnaire is a subtype of `ClientRequest` or a separate entity.

**Decision**: `SentQuestionnaire` is a **completely separate model** from `ClientRequest`. They share no database table, no polymorphic relationship, and no common base class. On the practice UI at `/practice/requests`, they appear in separate tabs ("Requests" and "Questionnaires") within the same page, using `StatusTabs`. This aligns with the existing codebase where routes are already separated (`/practice/requests/*` for `ClientRequestController` and `/practice/questionnaires/*` for `RequestTemplateController`).

### C2. Template versioning strategy -- edit-in-place vs. clone-on-edit

**Ambiguity**: "Editing a published template creates a new draft version" could mean (a) clone the template row, or (b) revert the same row back to draft.

**Decision**: **Edit-in-place** (option b). Editing a published template reverts its status to `draft`. There is only ever one row per template. Re-publishing increments the `version` integer. The `template_snapshot` on already-sent questionnaires ensures in-flight responses are unaffected. This is simpler than maintaining version chains and aligns with the existing `RequestTemplate` model which has no `parent_id` or version chain columns.

### C3. Template deletion guard

**Ambiguity**: Can a template be deleted if it has been sent to clients?

**Decision**: Yes. The `sent_questionnaires.request_template_id` FK is `nullable` with `nullOnDelete`. If a template is deleted, existing sent questionnaires remain intact because they carry the full `template_snapshot`. The `destroy` action should show a confirmation warning if `questionnaires()->exists()`: "This template has been sent to X clients. Deleting it will not affect in-progress questionnaires."

### C4. Who can build templates -- authorization

**Ambiguity**: "A practice partner creates a reusable questionnaire template" -- but which practice roles can create/edit/delete templates?

**Decision**: Template management uses the existing `RequestTemplate` policy (already exists with `Gate::authorize()` calls in `RequestTemplateController`). Any practice member can view templates. Create/update/publish/delete require practice membership. No additional granular permissions are needed in V1 -- all practice members are trusted to manage templates. If role-based restrictions are needed later, the policy can be tightened.

### C5. Auto-save debounce and conflict handling

**Ambiguity**: "Auto-save (debounced 500ms)" -- what happens if two workspace users answer the same question simultaneously?

**Decision**: Last writer wins. The `QuestionnaireResponse` has a `UNIQUE(questionnaire_id, question_id)` constraint and uses `updateOrCreate`. Each save records `answered_by_user_id` and `answered_at` for audit. No real-time collaboration, no optimistic locking in V1. The 500ms debounce is client-side only. If the network request fails, the frontend retries up to 3 times with exponential backoff and shows a persistent "Save failed" toast after exhaustion.

### C6. Required question validation on submit -- conditional questions

**Ambiguity**: If a required question is hidden by conditional logic, does it block submission?

**Decision**: No. Required questions hidden by an unmet condition are excluded from the required-field validation check at submit time. The `SubmitQuestionnaireResponses` action evaluates conditions from the `template_snapshot` against the current responses to determine which required questions are actually visible, and only validates those.

### C7. File upload mechanism for questionnaire answers

**Ambiguity**: The spec lists "File upload" as a question type but doesn't specify how files flow through the system.

**Decision**: A new endpoint `POST /api/v1/questionnaires/{sentQuestionnaire:uuid}/upload` handles file uploads. Files are stored via the existing S3 infrastructure using the workspace's storage path (tenant isolation). The endpoint returns `{file_id, filename, size_bytes, mime_type}`. The file reference array is then saved as the answer JSON via the normal `saveAnswer` endpoint. File type restrictions use the same allowlist as `App\Models\Tenant\File` (pdf, jpg, jpeg, png, gif, webp, csv, txt, xls, xlsx, doc, docx). Max 10 files per question, max 20 MB each.

### C8. Table question type -- column types and validation

**Ambiguity**: Table columns have a `type` field in JSON but the spec doesn't define what types are supported.

**Decision**: Table column types in V1 are: `text` (default), `number`, and `amount` (cents). Column definitions are set at design time and frozen in the snapshot. Clients add/remove rows dynamically (max 50 rows per table question). Each cell is validated client-side against its column type. The answer JSON is an array of objects keyed by column label.

### C9. Welcome section -- questions allowed?

**Ambiguity**: The welcome section is described as having "customisable intro text" but it's unclear whether it can contain questions.

**Decision**: The welcome section (`is_welcome = true`) is **intro-only** -- it contains the `welcome_title` and `welcome_message` rich text from the template, plus any `custom_message` from the send. It cannot contain questions. The builder UI hides the "Add question" button for the welcome section. This section always renders as a landing/intro page in the client filler.

### C10. System template seeding -- `practice_id` nullable

**Ambiguity**: System templates have `is_system = true`, but the `request_templates` table has `practice_id` as a required FK.

**Decision**: The `practice_id` FK constraint should be made nullable (it currently uses `constrained()->cascadeOnDelete()`). System templates seeded by `RequestTemplateSeeder` will have `practice_id = null` and `is_system = true`. When a practice selects a system template, a deep copy is created with the practice's `practice_id` and `is_system = false`. The system templates are hidden from the normal `forPractice` scope and only surfaced via a dedicated "template gallery" query. **Migration update needed**: alter `practice_id` to be nullable on `request_templates`.

### C11. Questionnaire progress calculation

**Ambiguity**: "Progress tracking (3 of 12 questions answered)" -- does this count conditional/hidden questions?

**Decision**: Progress counts only **visible** questions. The denominator is total questions minus hidden-by-condition questions. The numerator is answered visible questions. Both `totalQuestions()` and `answeredCount()` methods on `SentQuestionnaire` currently do simple counts -- they need to be enhanced to accept responses and evaluate conditions against the snapshot to exclude hidden questions. For the practice-side list view (where computing visibility is expensive), a simpler "X of Y answered" using raw counts is acceptable as an approximation.

### C12. Re-open flow -- what the client sees

**Ambiguity**: When a practice re-opens a questionnaire, what exactly happens on the client side?

**Decision**: The status transitions from `submitted` to `re_opened`. The client receives an in-app notification with the practice's optional message. When the client opens the questionnaire, all previous answers are pre-filled and editable. The filler shows a banner: "Your accountant has re-opened this questionnaire for updates. [Practice message if provided]." The client submits again normally, transitioning back to `submitted`.

### C13. Answer Bot enable/disable granularity

**Ambiguity**: "A practice can attach an AI answer bot" -- is this per-template or per-sent-questionnaire?

**Decision**: Per-template. A boolean `answer_bot_enabled` field on `request_templates` (default `false`). When enabled, all questionnaires sent from that template will show the bot. There is no per-send override in V1. The setting is included in the `template_snapshot` so the client filler can check it without querying the live template.

### C14. Task suggestion persistence and re-generation

**Ambiguity**: Can the practice regenerate task suggestions? What happens to previously generated suggestions?

**Decision**: Yes. Clicking "Generate tasks" replaces any existing `task_suggestions` JSON on the `sent_questionnaires` row. Previously approved tasks (already created as `PracticeTask` records) are not affected -- they exist independently. The UI shows "Regenerate" if suggestions already exist, with a warning: "This will replace existing suggestions. Already-approved tasks are not affected."

### C15. Archiving a template -- effect on sent questionnaires

**Ambiguity**: What happens to in-flight questionnaires when their source template is archived?

**Decision**: Archiving only affects the template's visibility in the template list (it no longer shows in the "send" dropdown). In-flight questionnaires continue normally because they use the `template_snapshot`. Archived templates can be un-archived by changing status back to `draft` (requires re-publishing before sending again).

### C16. Maximum template size limits

**Ambiguity**: No limits specified for sections per template or questions per section.

**Decision**: V1 limits: max 20 sections per template, max 50 questions per section, max 200 questions per template total. These are validated in the `update` controller method. The `template_snapshot` JSON size is implicitly bounded by these limits (estimated max ~200 KB for a fully loaded template).

### C17. Duplicate question IDs in snapshot

**Ambiguity**: `question_id` in `questionnaire_responses` references the snapshot -- but what if question IDs from the live template are reused after deletion?

**Decision**: This is not a problem because `question_id` references the original auto-increment `id` from `request_template_questions` at the time the snapshot was taken. These IDs are globally unique (auto-increment PKs). Even if a question is deleted and a new one created with a different ID, the snapshot preserves the original ID. The `updateOrCreate` in `saveAnswer` uses `(questionnaire_id, question_id)` as the composite key, which is unique within a single questionnaire's snapshot.

### C18. Notification strategy

**Ambiguity**: Several stories mention notifications but don't specify the mechanism.

**Decision**: All notifications use the existing 024-NTF in-app notification infrastructure. Notification events:
- **Questionnaire sent**: client workspace receives notification ("New questionnaire from [Practice]: [Template name]")
- **Questionnaire submitted**: practice members receive notification ("[Client workspace] submitted [Template name]")
- **Questionnaire re-opened**: client workspace receives notification ("[Practice] has re-opened [Template name] for updates")
- **Questionnaire overdue**: no automatic overdue notification in V1 (deferred to 066-WFA automated reminders)

### C19. Builder auto-save

**Ambiguity**: The client filler has auto-save, but what about the template builder? Does the practice user's work auto-save?

**Decision**: The builder does **not** auto-save. The practice user explicitly saves via a "Save" button (PATCH to `update` endpoint). This is intentional -- template editing is a deliberate authoring activity, not a fill-in-the-blanks flow. Unsaved changes trigger a browser `beforeunload` warning. The builder UI shows a "dirty" indicator when there are unsaved changes.

### C20. Keyboard shortcuts

**Ambiguity**: No keyboard shortcuts defined for the questionnaire builder or filler.

**Decision**: Per CLAUDE.md conventions, the following shortcuts apply:
- **Builder page** (`/practice/settings/templates/[id]`): `Cmd+Enter` to save, `Escape` to cancel/go back, `N` to add new question to current section.
- **Filler page** (`/questionnaires/[id]`): `Cmd+Enter` to submit (when all required answered), `Tab` / `Shift+Tab` to navigate between questions, `Enter` to advance to next section.
- **Practice review page**: `E` to add note on selected answer, `Cmd+Enter` to mark as reviewed.
- All shortcuts registered in the `?` help overlay.
