---
title: "Feature Specification: Financial Learning Hub"
---

# Feature Specification: Financial Learning Hub

**Feature Branch**: `062-EDU-financial-learning-hub`
**Created**: 2026-03-22
**Status**: Draft
**Epic**: 062-EDU
**Initiative**: FL -- Financial Ledger Platform
**Effort**: XL (5-6 sprints)
**Depends On**: 021-AIQ (complete), 036-GMF (complete), 016-CDB (complete), 027-PMV (complete), 051-EHS (complete)

### Out of Scope

- **Video hosting** -- embed only (YouTube, Vimeo, Loom)
- **Certificate generation** -- deferred to v2
- **Community forums / discussion** -- no peer-to-peer threads
- **Live webinar streaming** -- use external tools via meeting links
- **Payment for premium content** -- included in platform subscription
- **SCORM/xAPI compliance** -- simple progress tracking only
- **Content versioning** -- v1 edits overwrite
- **Offline access / PWA caching** -- online-only; deferred to v2
- **Rich text editing for clients** -- clients consume content only; practice members use TipTap for authoring

---

## Overview

Practices repeatedly explain the same foundational financial concepts to multiple clients. Clients with low financial literacy disengage and create higher support overhead. This epic delivers a personalized financial learning hub integrating with the AI chatbot (021-AIQ), gamification (036-GMF), calendar (016-CDB), and practice management (027-PMV).

---

## User Stories

**US-01**: As a client, I want to browse learning content relevant to my entity type so I can improve my understanding.
**US-02**: As a client, I want to follow structured learning paths so I can build knowledge progressively.
**US-03**: As a client, I want to use interactive calculators pre-filled with my workspace data.
**US-04**: As a client, I want the AI assistant to explain reports and concepts in plain language.
**US-05**: As a client, I want to take quizzes and earn badges so learning feels rewarding.
**US-06**: As a client, I want to see my Financial Literacy Score and progress.
**US-07**: As a client, I want to book an advisory session directly from a learning topic.
**US-08**: As a client, I want to see content my practice has recommended for me.
**US-09**: As a practice member, I want to create custom educational content for my clients.
**US-10**: As a practice member, I want to assign learning paths to specific clients or workspace groups.
**US-11**: As a practice member, I want to see completion rates and literacy scores across all my clients.
**US-12**: As a practice member, I want to receive session bookings from clients studying specific topics.

---

## Functional Requirements

### FR1: Learning Content Library

- **FR1.1**: `LearningContent` model: title, slug, type (`article|video|calculator|quiz`), body (rich text via TipTap JSON -- same format as Notes epic), video_url (embed URL), category, difficulty, estimated_duration_minutes, entity_types (JSON array of `EntityType` values), is_platform (boolean), practice_id (nullable FK)
- **FR1.2**: Categories via `LearningContentCategory` enum: tax, superannuation, estate_planning, budgeting, investing, compliance, business_finance, personal_finance
- **FR1.3**: Difficulty via `LearningDifficulty` enum: beginner, intermediate, advanced
- **FR1.4**: Platform content seeded via idempotent `LearningContentSeeder` (20-30 default articles). Called from `DemoPersonasSeeder` chain. Uses `updateOrCreate` on slug to be re-runnable. Covers all 7 entity types with at least 2 articles each.
- **FR1.5**: Practice-created content scoped by `practice_id`, visible only to connected workspaces (verified via `PracticeWorkspace` where `accepted_at IS NOT NULL` and not expired)
- **FR1.6**: Searchable by title, category, difficulty, entity_type
- **FR1.7**: Content viewer renders articles (TipTap JSON to HTML via read-only TipTap instance), video embeds (sandboxed iframe -- YouTube, Vimeo, Loom only), or routes to calculator/quiz. Video URLs validated against allowlisted domains.
- **FR1.8**: Practice content authoring uses the existing TipTap editor component from the Notes epic (see `frontend/src/components/notes/tiptap-editor.tsx`). No new rich text editor.
- **FR1.9**: Content body stored as TipTap JSON (not HTML) for consistent rendering. Maximum body size: 100KB.

### FR2: Learning Paths

- **FR2.1**: `LearningPath` model: name, slug, description, difficulty, entity_type_filter (nullable), is_platform, practice_id (nullable)
- **FR2.2**: `LearningPathItem` join model: learning_path_id, learning_content_id, position (integer ordering). Items are strictly sequential -- no branching or prerequisite logic in v1.
- **FR2.3**: Default paths per entity type seeded by `LearningContentSeeder`: Personal/Sole Trader ("Personal Finance Fundamentals", "Tax Basics"), SMSF ("SMSF Compliance", "Investment Strategy", "BDBN Guide"), Trust ("Trust Administration", "Distribution Planning"), Pty Ltd/Partnership ("Business Finance", "BAS & GST", "Payroll Obligations"), NFP ("NFP Compliance", "Grant Reporting")
- **FR2.4**: `LearningProgress` model: user_id, learning_content_id, workspace_id, status (not_started/in_progress/completed), started_at, completed_at, time_spent_seconds. Unique on `[user_id, learning_content_id, workspace_id]`.
- **FR2.5**: Path progress = `completed_items / total_items * 100`. Completing all items triggers a `path_complete` badge via existing `AwardBadge` action.
- **FR2.6**: Paths have no prerequisites on other paths. A user can start any path at any time regardless of other path progress.

### FR3: Interactive Calculators

All calculators are React client components. Each pre-fills from workspace data where possible. All calculations are client-side only -- no server-side computation.

- **FR3.1**: **Compound Interest** -- principal, rate, frequency, years. No pre-fill (generic calculator).
- **FR3.2**: **Tax Estimator** -- income input, Australian brackets (2025-26 FY) + Medicare levy (2%). Pre-fills from P&L revenue via `/api/v1/learning/calculators/prefill`. Includes disclaimer: "Estimate only. Does not account for deductions, offsets, or individual circumstances. Consult your tax advisor."
- **FR3.3**: **Retirement Planner** -- age, super balance, contributions, returns. Pre-fills from SMSF workspace asset balances (only when workspace `entity_type === 'smsf'`). Disclaimer: "Projection only. Not financial advice."
- **FR3.4**: **Loan Repayment** -- principal, rate, term. Pre-fills from first active `Loan` model (032-LAT) fields: `current_balance`, `interest_rate`, `term_months`. Disclaimer: "Based on standard amortization. Actual repayments may vary."
- **FR3.5**: **Net Worth Tracker** -- read-only summary from `PersonalAsset` and `PersonalDebt` models (030-PLG). Only shown for workspaces with `entity_type === 'personal'`.
- **FR3.6**: Calculator usage logged to `LearningProgress` (type=calculator, one progress record per calculator type per user per workspace). Each unique calculator counts toward literacy score -- repeat usage of the same calculator does not increase score.

### FR4: AI Learning Assistant

Extends existing AI chatbot (021-AIQ) -- no new streaming infrastructure.

- **FR4.1**: Educational system prompt variant appended to the existing system prompt (in `frontend/src/app/api/chat/route.ts`) when triggered via `[learn]` prefix in message or "Explain this" button. Appended context: `"The user is asking for a plain-language educational explanation. Use simple terms, analogies, and examples. Avoid jargon. If explaining a report, describe what each section means and why it matters for their business."` This is a prompt prefix, not a separate AI config or model.
- **FR4.2**: "Explain this to me" button on report pages (P&L, Balance Sheet, Trial Balance, BAS) opens AI chat panel with a pre-composed message containing the report name, date range, and key totals as context. Uses the existing chat route -- no new API endpoint.
- **FR4.3**: Quiz generation: `POST /api/v1/learning/content/{id}/generate-quiz` -- AI generates 5 MCQ questions from content body using the workspace AI config model (defaults to `claude-haiku-4-5`). Persisted to `quizzes` table. Rate-limited to 1 generation per content item per workspace per hour. If generation fails, returns 503 with user-friendly message.
- **FR4.4**: Recommendations: `GET /api/v1/learning/recommendations` -- rule-based only (no AI call): filter by workspace `entity_type`, prioritise assigned content, then path membership order, exclude completed. Returns up to 10 items.

### FR5: Financial Literacy Score

Follows the `CalculateEntityHealthScore` action pattern (051-EHS): single action, upsert current record, record history.

- **FR5.1**: `FinancialLiteracyScore` model: user_id, workspace_id, score (0-100), level, component counts, calculated_at. Unique on `[user_id, workspace_id]`.
- **FR5.2**: Score formula via `CalculateLiteracyScore` action: content completed (2pts each, max 40) + quizzes passed (5pts each, max 30) + calculators used (3pts each, max 15) + advisory sessions attended (5pts each, max 15). The action queries actual counts from `learning_progress`, `quiz_results`, and `meetings` (type=advisory, status=completed) each time -- no stale cached counts.
- **FR5.3**: `LiteracyLevel` enum: Novice (0-20), Learner (21-40), Competent (41-60), Proficient (61-80), Expert (81-100) with `label()`, `colour()`, `minScore()`. Colour values: Novice=#9ca3af, Learner=#f59e0b, Competent=#3b82f6, Proficient=#8b5cf6, Expert=#10b981.
- **FR5.4**: Recalculated synchronously on: content completion (via `POST .../progress`), quiz pass (via `POST .../submit`), calculator use (via `POST .../log`), advisory session completion (via existing meeting completion flow). No decay -- score only increases. No scheduled recalculation.
- **FR5.5**: Gamification badges awarded via existing `AwardBadge` action (see `app/Actions/Gamification/AwardBadge.php`). Badge types: `literacy_novice` (Bronze, score >= 1), `literacy_learner` (Silver, score >= 21), `literacy_competent` (Gold, score >= 41), `literacy_proficient` (Gold, score >= 61), `literacy_expert` (Diamond, score >= 81), `path_complete` (Silver, per path), `quiz_master_bronze` (Bronze, 1 quiz passed), `quiz_master_gold` (Gold, 5 quizzes passed). Uses `source_type: 'literacy_score'` for literacy badges and `source_type: 'quiz_result'` for quiz badges.
- **FR5.6**: `FinancialLiteracyScoreHistory` model (like `HealthScoreHistory`): workspace_id, user_id, score, sub_scores (JSON), calculated_at. Records every recalculation for trend display.

### FR6: Practice Content Curation

- **FR6.1**: `ContentAssignment` model: practice_id, assignable_type/assignable_id (polymorphic -- `learning_content` or `learning_path` via morph map), workspace_id, assigned_by_user_id, due_date (nullable), assigned_at
- **FR6.2**: Assign individual content or entire paths to a workspace. Triggers `LearningContentAssigned` notification to all workspace users with `client` role. Assignment requires active (accepted, non-expired) `PracticeWorkspace` relationship.
- **FR6.3**: "Recommended for you" on `/learn` hub pulls assignments for current workspace, ordered by due_date (soonest first), then assigned_at (newest first)
- **FR6.4**: Practice dashboard at `/practice/learning`: content CRUD, assignments, completion rates, literacy scores per workspace. No custom branding or practice logo on content -- content displays the practice name as author attribution only.
- **FR6.5**: Bulk assign to up to 50 workspaces from a workspace group. Uses `AssignContent` action in a DB transaction. Validates all target workspaces are connected to the practice before creating any assignments (all-or-nothing).
- **FR6.6**: Practice can only assign content they created (`practice_id` matches) or platform content (`is_platform = true`). Cannot assign another practice's content.
- **FR6.7**: Deleting practice content soft-cascades: assignments remain but display "Content no longer available". `ContentAssignment` records are NOT deleted -- preserves audit trail.

### FR7: Advisory Session Booking

- **FR7.1**: "Book a Session" CTA on content detail pages and at path completion
- **FR7.2**: Opens existing meeting creation (016-CDB) with pre-filled title (`"Advisory: {content_title}"`) and description (`"Follow-up session for learning content: {content_title}"`). Adds `learning_content_id` to meeting metadata (nullable column on `meetings` table).
- **FR7.3**: `MeetingType::Advisory` already exists in codebase (confirmed). No enum change needed.
- **FR7.4**: Completed advisory sessions (meetings with `type=advisory` and `status=completed`) counted toward literacy score. Counted per unique meeting, not per attendee.
- **FR7.5**: "Book a Session" only appears when workspace has a connected practice (`PracticeWorkspace` exists and is accepted). Hidden for workspaces without a practice connection.

### FR8: Quizzes & Assessments

- **FR8.1**: `Quiz` model: learning_content_id (nullable FK), title, questions (JSON), pass_threshold_percent (int default 70), is_ai_generated (bool), created_by_user_id (FK nullable), workspace_id (FK). Questions fixed at creation -- no question bank or randomisation in v1.
- **FR8.2**: Question JSON: `[{ question: string, type: "multiple_choice"|"true_false", options: string[], correct_index: number, explanation: string }]`. Maximum 10 questions per quiz. AI-generated quizzes default to 5 questions.
- **FR8.3**: `QuizResult` model: quiz_id, user_id, workspace_id, score_percent, passed (boolean), answers (JSON -- `[{ question_index: number, selected_index: number }]`), completed_at
- **FR8.4**: Retakes allowed unlimited times on failure. Each attempt stored as separate `QuizResult`. Only the best result counts toward literacy score (prevents gaming by retaking passed quizzes).
- **FR8.5**: On pass, trigger `CalculateLiteracyScore` and check badge milestones via `AwardBadge`. Badge check uses count of distinct quizzes passed (not attempts).
- **FR8.6**: Practice members can manually create quizzes for their content via the practice learning dashboard. Uses the same `Quiz` model with `is_ai_generated = false`.

### FR9: Progress Dashboard

- **FR9.1**: `/learn` hub sections: My Score (hero card with level, score, ring progress), Recommended (assigned + entity-type-matched, max 6 cards), In Progress (content with status=in_progress), Calculators (5 calculator cards), Completed (paginated history, 10 per page)
- **FR9.2**: `/learn/paths` -- card grid of available paths, filterable by entity type and difficulty. Each card shows name, difficulty badge, item count, duration, progress bar. Paths filtered to workspace entity_type by default, with "Show All" toggle.
- **FR9.3**: `/learn/paths/{slug}` -- path detail with progress bar and ordered item list with checkmarks. "Continue" button scrolls to first incomplete item.
- **FR9.4**: `/learn/content/{slug}` -- full-width article/video. Sidebar: difficulty, duration, "Mark Complete" button, quiz link (if quiz exists), "Book a Session" (if practice connected), "Explain this to me" (opens AI chat). Mobile: sidebar collapses below content.
- **FR9.5**: `/learn/calculators` -- grid of 5 calculator cards with icons and descriptions. Click opens inline calculator below the grid (not modal). Calculators available based on entity type (Net Worth only for personal, Retirement only for SMSF, all others universal).
- **FR9.6**: `/learn/quizzes/{id}` -- one question per screen, progress indicator (e.g., "3 of 5"), previous/next navigation, results page on completion with correct answers and explanations. No timer.

### FR10: Notifications

Uses existing `CreateNotification` action and `NotificationType` enum.

- **FR10.1**: `LearningContentAssigned` -- content assigned by practice, notify all workspace users with role `client`, `owner`, or `bookkeeper`. Links to `/learn/content/{slug}`.
- **FR10.2**: `LearningMilestone` -- path progress at 25%, 50%, 75%, 100%. Notify user only. Links to `/learn/paths/{slug}`.
- **FR10.3**: `QuizCompleted` -- quiz pass/fail with score. Notify user only. Links to `/learn/quizzes/{id}/results`.
- **FR10.4**: `LiteracyLevelUp` -- notify user AND practice staff (users on the connected practice with `practice_manager` or `accountant` role) on level increase. No notification on same-level recalculation.
- **FR10.5**: Advisory session booking handled by existing meeting notifications (016-CDB)

---

## Data Model

### New Tables

**`learning_contents`**: id, workspace_id (FK), practice_id (FK nullable), title, slug (unique per workspace), type, body (text nullable -- TipTap JSON), video_url (nullable), category, difficulty, estimated_duration_minutes, entity_types (json nullable), is_platform (bool), created_by_user_id (FK nullable), timestamps, deleted_at (soft delete). Indexes: `[workspace_id, category]`, `[workspace_id, type]`, `[practice_id]`.

**`learning_paths`**: id, workspace_id (FK), practice_id (FK nullable), name, slug (unique per workspace), description (text nullable), difficulty, entity_type_filter (nullable), is_platform (bool), estimated_duration_minutes (int default 0), timestamps, deleted_at (soft delete). Index: `[workspace_id, entity_type_filter]`.

**`learning_path_items`**: id, learning_path_id (FK cascade), learning_content_id (FK cascade), position (int), timestamps. Unique: `[learning_path_id, learning_content_id]`.

**`learning_progress`**: id, user_id (FK cascade), learning_content_id (FK cascade), workspace_id (FK cascade), status (default 'not_started'), started_at, completed_at, time_spent_seconds (int default 0), timestamps. Unique: `[user_id, learning_content_id, workspace_id]`. Index: `[user_id, workspace_id, status]`.

**`quizzes`**: id, workspace_id (FK), learning_content_id (FK nullable nullOnDelete), title, questions (json), pass_threshold_percent (int default 70), is_ai_generated (bool), created_by_user_id (FK nullable), timestamps.

**`quiz_results`**: id, quiz_id (FK cascade), user_id (FK cascade), workspace_id (FK cascade), score_percent (int), passed (bool), answers (json), completed_at, timestamps. Index: `[user_id, quiz_id]`.

**`content_assignments`**: id, practice_id (FK cascade), assignable_type, assignable_id, workspace_id (FK cascade), assigned_by_user_id (FK nullable nullOnDelete), due_date (date nullable), assigned_at, timestamps. Indexes: `[workspace_id, assignable_type]`, `[practice_id]`.

**`financial_literacy_scores`**: id, user_id (FK cascade), workspace_id (FK cascade), score (int default 0), level, content_completed_count (int default 0), quizzes_passed_count (int default 0), calculators_used_count (int default 0), sessions_attended_count (int default 0), calculated_at, timestamps. Unique: `[user_id, workspace_id]`.

**`financial_literacy_score_history`**: id, user_id (FK cascade), workspace_id (FK cascade), score (int), sub_scores (json), calculated_at. Index: `[user_id, workspace_id, calculated_at]`.

### Modified Tables

**`meetings`**: Add nullable `learning_content_id` (FK nullable nullOnDelete) column for advisory session tracking.

### New Enums (all in `app/Enums/Learning/`)

- `LearningContentType` -- article, video, calculator, quiz
- `LearningContentCategory` -- tax, superannuation, estate_planning, budgeting, investing, compliance, business_finance, personal_finance
- `LearningDifficulty` -- beginner, intermediate, advanced
- `LearningProgressStatus` -- not_started, in_progress, completed
- `LiteracyLevel` -- novice, learner, competent, proficient, expert (with `label()`, `colour()`, `minScore()`)

---

## API Endpoints

### Workspace Side (inside `SetWorkspaceContext` middleware, gated by `feature:learning_hub`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/learning/content` | List content (filterable by category, type, difficulty, entity_type) |
| GET | `/api/v1/learning/content/counts` | Counts by category (for StatusTabs) |
| GET | `/api/v1/learning/content/{slug}` | Content detail |
| POST | `/api/v1/learning/content/{id}/progress` | Update progress (start/complete) |
| GET | `/api/v1/learning/paths` | List paths |
| GET | `/api/v1/learning/paths/{slug}` | Path detail with progress |
| GET | `/api/v1/learning/recommendations` | Personalised recommendations (rule-based) |
| GET | `/api/v1/learning/calculators/prefill` | Pre-fill data from workspace |
| POST | `/api/v1/learning/calculators/{type}/log` | Log calculator usage |
| GET | `/api/v1/learning/quizzes/{id}` | Quiz questions (no answers in response) |
| POST | `/api/v1/learning/quizzes/{id}/submit` | Submit answers, returns result |
| GET | `/api/v1/learning/quizzes/{id}/results` | User's best quiz result |
| POST | `/api/v1/learning/content/{id}/generate-quiz` | AI quiz generation (rate-limited) |
| GET | `/api/v1/learning/score` | Current user's literacy score + history |
| GET | `/api/v1/learning/assignments` | Assignments for workspace |

### Practice Side (inside `auth:sanctum` practice prefix)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/practice/learning/content` | Practice-created content |
| POST | `/api/v1/practice/learning/content` | Create content |
| PATCH | `/api/v1/practice/learning/content/{id}` | Update content |
| DELETE | `/api/v1/practice/learning/content/{id}` | Soft delete content |
| POST | `/api/v1/practice/learning/paths` | Create path |
| PATCH | `/api/v1/practice/learning/paths/{id}` | Update path + items |
| DELETE | `/api/v1/practice/learning/paths/{id}` | Soft delete path |
| POST | `/api/v1/practice/learning/quizzes` | Create quiz manually |
| POST | `/api/v1/practice/learning/assign` | Assign content/path to workspace |
| POST | `/api/v1/practice/learning/assign/bulk` | Bulk assign (max 50, transactional) |
| GET | `/api/v1/practice/learning/progress` | Client completion rates |
| GET | `/api/v1/practice/learning/scores` | Literacy scores per workspace |

### Modified

| Method | Path | Change |
|--------|------|--------|
| POST | `/api/v1/meetings` | Accept optional `learning_content_id` in request body |

---

## UI/UX Requirements

### Workspace Side

**`/learn` -- Learning Hub**: Hero literacy score card (ring progress, level name, numeric score), "Recommended for You" (assigned + entity-type-matched, max 6 cards), "Continue Learning" (in-progress), calculators grid, completed history. Empty state suggests starter paths by entity type. Sidebar: "Learn" with `GraduationCap` icon, shortcut `G then U`, feature key `learning_hub`. Fully responsive -- card grids collapse to single column on mobile.

**`/learn/paths`**: Card grid, filterable by entity type and difficulty. Each card shows name, difficulty badge, item count, duration, progress bar.

**`/learn/paths/{slug}`**: Header with overall progress, ordered content list with checkmarks, "Continue" button.

**`/learn/content/{slug}`**: Full-width article/video. Sidebar: difficulty, duration, "Mark Complete", quiz link, "Book a Session", "Explain this to me". Video embeds use sandboxed iframes. Mobile: sidebar stacks below content.

**`/learn/calculators`**: Grid of 5 calculator cards. Inline calculator components (not modal). Entity-type-aware visibility.

**`/learn/quizzes/{id}`**: One question per screen, progress indicator, results with explanations on completion. No timer. Previous/next navigation.

### Practice Side

**`/practice/learning`**: Tabs -- Content (CRUD table with DataTable), Paths (CRUD table with drag-to-reorder items), Quizzes (manual quiz CRUD), Assignments (assignment list with completion status), Client Progress (literacy scores per workspace, click for per-user detail).

### Navigation Updates

- Add `{ title: "Learn", url: "/learn", icon: GraduationCap, shortcut: "G then U", featureKey: "learning_hub" }` to `primaryNav` in `navigation.ts`
- Add `u: "/learn"` to `chordShortcuts`
- Add "Learning" to practice sidebar nav
- Add `learning_hub` to `FeatureRegistry` (category: `advanced`, default: `true`, icon: `GraduationCap`)

---

## Acceptance Criteria

- [ ] `/learn` hub renders with recommended, in-progress, completed, and calculator sections
- [ ] Content filterable by category, type, difficulty, entity_type
- [ ] Learning paths display ordered items with progress tracking
- [ ] Platform content seeded on `migrate:fresh --seed` (20-30 articles, 10+ paths across all entity types)
- [ ] All 5 calculators render and compute correctly, pre-fill from workspace data where applicable
- [ ] Calculators display accuracy disclaimers
- [ ] "Explain this to me" on report pages opens AI chat with context
- [ ] AI-generated quizzes produce valid question structures and persist
- [ ] Quiz generation rate-limited to 1 per content per workspace per hour
- [ ] Quiz submit validates answers, determines pass/fail at 70% threshold
- [ ] Financial Literacy Score recalculates on content completion, quiz pass, calculator use, session attendance
- [ ] Score only increases (no decay)
- [ ] Badges awarded at each literacy level milestone via existing `AwardBadge` action
- [ ] "Book a Session" opens meeting creation with pre-filled topic (only when practice connected)
- [ ] Practice can create/edit/delete custom content and paths (soft delete)
- [ ] Practice can assign content/paths to workspaces (single and bulk up to 50)
- [ ] Bulk assign is transactional (all-or-nothing)
- [ ] Assigned content appears in "Recommended for You"
- [ ] Practice dashboard shows completion rates and literacy scores per workspace
- [ ] Notifications fire for assignments, milestones, quiz completion, level-up
- [ ] Learning hub gated by `learning_hub` feature flag
- [ ] All learning routes protected by `feature:learning_hub` middleware
- [ ] Content body uses TipTap JSON format, rendered via read-only TipTap
- [ ] Video embeds restricted to YouTube, Vimeo, Loom domains

---

## Technical Notes

### Existing Infrastructure (Do NOT Rebuild)

- `ChatConversation` / `ChatMessage` -- AI chatbot (021-AIQ)
- `Badge` / `Challenge` / `Streak` -- gamification (036-GMF)
- `AwardBadge` action -- badge creation pattern (036-GMF)
- `Meeting` / `MeetingAttendee` -- calendar (016-CDB)
- `MeetingType::Advisory` -- already exists in `app/Enums/MeetingType.php`
- `HealthScore` / `HealthScoreHistory` + `CalculateEntityHealthScore` -- scoring pattern reference (051-EHS)
- `CreateNotification` action + `NotificationType` enum (024-NTF)
- Practice-workspace relationships via `PracticeWorkspace` pivot
- TipTap editor component (`frontend/src/components/notes/tiptap-editor.tsx`)
- `FeatureRegistry` + `CheckFeature` middleware for feature gating
- `DataTable` component for practice CRUD tables

### New Backend Components

- 8 models in `app/Models/Tenant/`: LearningContent, LearningPath, LearningPathItem, LearningProgress, Quiz, QuizResult, ContentAssignment, FinancialLiteracyScore
- 1 model: `FinancialLiteracyScoreHistory` (following `HealthScoreHistory` pattern)
- 8 controllers in `app/Http/Controllers/Api/`: LearningContentController, LearningPathController, LearningProgressController, QuizController, LiteracyScoreController, ContentAssignmentController, CalculatorController, PracticeLearningController
- 3 actions in `app/Actions/Learning/`: CalculateLiteracyScore (follows `CalculateEntityHealthScore` pattern), AssignContent, GenerateQuiz
- Form Requests in `app/Http/Requests/Learning/`: StoreLearningContentRequest, UpdateLearningContentRequest, SubmitQuizRequest, StoreQuizRequest, AssignContentRequest, BulkAssignContentRequest, UpdateProgressRequest, LogCalculatorRequest
- API Resources: LearningContentResource, LearningPathResource, QuizResource, QuizResultResource, LiteracyScoreResource, ContentAssignmentResource
- 5 enums in `app/Enums/Learning/`
- 1 Policy: `LearningContentPolicy` (practice members can CRUD their own content, clients can view)
- `LearningContentSeeder` in `database/seeders/` (called from `DemoPersonasSeeder`)
- 9 migrations for new tables (8 new tables + 1 `meetings` alter)
- Add `learning_content`, `learning_path`, `quiz`, `content_assignment` to morph map in `AppServiceProvider`
- Add `learning_hub` to `FeatureRegistry::all()`
- New `NotificationType` cases: LearningContentAssigned, LearningMilestone, QuizCompleted, LiteracyLevelUp
- New `NotificationType::filterCategory()` case: 'Learning' for all 4 new types

### New Frontend Components

- 6 pages under `frontend/src/app/(dashboard)/learn/` (hub, paths, paths/[slug], content/[slug], calculators, quizzes/[id])
- Slug-scoped equivalents under `frontend/src/app/w/[slug]/(dashboard)/learn/`
- 1 practice page: `frontend/src/app/(practice)/practice/learning/page.tsx`
- Components in `frontend/src/components/learning/`: literacy-score-card, content-card, path-progress, quiz-player, 5 calculator components (compound-interest, tax-estimator, retirement-planner, loan-repayment, net-worth-tracker)
- "Explain this" button component added to existing report pages (not new pages)
- 3 hook files in `frontend/src/hooks/`: use-learning, use-quizzes, use-literacy-score
- Types in `frontend/src/types/learning.ts`

---

## Testing Strategy

### Feature Tests (Target: 30-40 tests)

Tests follow existing patterns: seed `RolesAndPermissionsSeeder`, assign roles, use `X-Workspace-Id` header.

**Content & Paths (8-10 tests)**
- List content filtered by category, difficulty, entity_type
- Content detail by slug returns full body
- Practice-created content only visible to connected workspaces
- Content from unconnected practice returns 404
- Path detail includes ordered items with user progress
- Content counts endpoint returns correct group-by-category counts

**Progress & Score (6-8 tests)**
- Mark content as started updates progress to in_progress
- Mark content as completed updates progress and triggers score recalculation
- Literacy score increases on content completion
- Literacy score capped at 100
- Badge awarded on literacy level milestone
- Score does not decrease on subsequent recalculations

**Quizzes (6-8 tests)**
- Submit quiz with passing score creates QuizResult with passed=true
- Submit quiz with failing score creates QuizResult with passed=false
- Retake quiz stores separate QuizResult
- AI quiz generation creates valid question structure
- AI quiz generation rate-limited (returns 429 on second call within hour)
- Quiz questions endpoint omits correct_index from response

**Practice Curation (6-8 tests)**
- Practice can create content (POST, returns 201)
- Practice can update own content (PATCH)
- Practice cannot update another practice's content (403)
- Assign content to connected workspace triggers notification
- Bulk assign to 50 workspaces succeeds
- Bulk assign with disconnected workspace fails entirely (422)

**Authorization (4-6 tests)**
- Client role can view content and submit quizzes
- Client role cannot create content (403)
- Auditor role has read-only access
- Feature flag disabled returns 403 for all learning endpoints
- Bookkeeper can view content and use calculators

### Browser Tests (Target: 5-8 tests)

- `/learn` hub renders with sections
- Navigate to path, view progress, mark content complete
- Calculator pre-fills and computes (loan repayment)
- Quiz flow: answer questions, see results
- Practice learning tab: create content, assign to workspace

---

## Clarifications

The following 20 questions were raised during requirements analysis, answered using codebase patterns and project conventions.

### Content Management

**Q1: Who creates platform (seed) content, and what editor do they use?**
A: Platform content is created by the `LearningContentSeeder`, not through a UI. The seeder uses `updateOrCreate` on slug for idempotency and is called within the `DemoPersonasSeeder` chain (the only seeder called from `DatabaseSeeder`). Practice members author custom content via the existing TipTap editor component from the Notes epic (`frontend/src/components/notes/tiptap-editor.tsx`). No new rich text editor is needed.

**Q2: What format is the rich text body stored in, and is there a size limit?**
A: TipTap JSON format (not HTML), matching the Notes model pattern. Maximum body size is 100KB, validated in `StoreLearningContentRequest`. The frontend renders it via a read-only TipTap instance, ensuring consistent rendering across authoring and viewing.

**Q3: Should learning content support soft deletes for audit trail?**
A: Yes. Both `LearningContent` and `LearningPath` use soft deletes (`deleted_at`). This is critical for practice content: when a practice deletes content that has been assigned, the `ContentAssignment` records survive, and the UI shows "Content no longer available" rather than a broken link. This follows the pattern of preserving audit trails that the platform uses elsewhere (e.g., `Meeting` soft deletes).

### Learning Paths

**Q4: Do paths support branching, prerequisites, or conditional logic?**
A: No. Paths are strictly sequential in v1 -- an ordered list of `LearningPathItem` rows sorted by `position`. There are no inter-path prerequisites either; users can start any path at any time. Branching and conditional paths are deferred to v2.

**Q5: How are path items reordered, and can an item appear in multiple paths?**
A: Items are reordered by updating the `position` column via `PATCH /api/v1/practice/learning/paths/{id}` which accepts a `items` array with `learning_content_id` and `position`. A content item can appear in multiple paths (the unique constraint is on `[learning_path_id, learning_content_id]`, not on `learning_content_id` alone). The practice UI uses drag-to-reorder on the path detail editor.

### Calculators

**Q6: Which calculators auto-fill from workspace data, and what happens when data is unavailable?**
A: The `/api/v1/learning/calculators/prefill` endpoint returns data for applicable calculators based on workspace entity type: Tax Estimator pre-fills from P&L revenue (all entity types), Retirement Planner from SMSF asset balances (only `smsf` entity type), Loan Repayment from the first active `Loan` model fields (`current_balance`, `interest_rate`, `term_months`). Compound Interest has no pre-fill. Net Worth is read-only from `PersonalAsset`/`PersonalDebt` (only `personal` entity type). When data is unavailable, the pre-fill fields return `null` and the calculator renders with empty inputs that the user fills manually.

**Q7: Do calculators need accuracy disclaimers, and are calculations server-side or client-side?**
A: All calculations are client-side only (React components). Each calculator that uses financial projections (Tax Estimator, Retirement Planner, Loan Repayment) displays a prominent disclaimer. The Tax Estimator disclaimer specifically notes it does not account for deductions, offsets, or individual circumstances. Net Worth is read-only (no projection). Compound Interest is generic and needs only a "For illustrative purposes" note.

### AI Integration

**Q8: Does the AI learning mode use a separate system prompt, model, or conversation context?**
A: No separate system prompt, model, or AI config. The educational context is appended to the existing system prompt in `frontend/src/app/api/chat/route.ts` when the message starts with `[learn]` or comes from an "Explain this" button click. The appended text instructs the AI to use plain language, analogies, and examples. The same workspace AI config (model selection, agent name) applies. This keeps the implementation minimal -- no new API route or streaming infrastructure.

**Q9: How does "Explain this to me" on report pages pass context to the AI?**
A: The button composes a pre-formatted message with the report name, date range, and key totals (e.g., total revenue, total expenses, net profit for P&L) and opens the existing chat panel with that message pre-filled. The message is prefixed with `[learn]` to trigger the educational prompt variant. No new API endpoint is needed -- it uses the existing `POST /api/chat` route. The report data is already available in the report page's React state.

### Literacy Score

**Q10: Does the literacy score decay over time or only increase?**
A: Score only increases, never decays. This is a deliberate design choice for a learning platform: penalising users for not returning would discourage engagement. The score reflects cumulative learning achievement. There is no scheduled recalculation -- the score is recomputed synchronously on each qualifying event (content completion, quiz pass, calculator use, advisory session completion).

**Q11: How is the literacy score calculated -- cached counts or live queries?**
A: The `CalculateLiteracyScore` action queries live counts each time, following the `CalculateEntityHealthScore` pattern from 051-EHS. It counts `learning_progress` records (status=completed), distinct `quiz_results` (passed=true), distinct calculator `learning_progress` records (type=calculator), and `meetings` (type=advisory, status=completed). The action then upserts `FinancialLiteracyScore` and creates a `FinancialLiteracyScoreHistory` record. The component counts stored on the score model are for display convenience, not the source of truth.

### Gamification Integration

**Q12: How are learning badges created -- new badge system or existing `AwardBadge` action?**
A: The existing `AwardBadge` action in `app/Actions/Gamification/AwardBadge.php` is reused. It accepts `badgeType` (string), `sourceType` (string), and optionally `sourceId` and `milestoneThreshold`. For literacy badges, `source_type` is `'literacy_score'` and `badge_type` values are `literacy_novice`, `literacy_learner`, etc. For quiz badges, `source_type` is `'quiz_result'`. The `AwardBadge` action already handles duplicate prevention (checks `exists()` before creating). No changes to the Badge model or AwardBadge action are needed.

**Q13: Should learning completion trigger any streaks or challenges?**
A: Not in v1. The gamification system (036-GMF) has `StreakType` and `StreakFrequency` enums for reconciliation, invoicing, etc. Adding a `learning` streak type would require enum changes and listener wiring. This is deferred. Badges are the only gamification integration for 062-EDU. A `learning_daily` streak could be added in v2 if engagement data justifies it.

### Practice Curation

**Q14: Can practices bulk-assign content, and what validation applies?**
A: Yes, up to 50 workspaces at once via `POST /api/v1/practice/learning/assign/bulk`. The `AssignContent` action runs in a DB transaction and validates ALL target workspaces are connected to the practice (via `PracticeWorkspace` where `accepted_at IS NOT NULL` and not expired) before creating any assignments. If any workspace is disconnected, the entire batch fails with 422. This prevents partial assignments that would be confusing to manage.

**Q15: Can practices brand content with their logo, or is it plain?**
A: No custom branding in v1. Practice content displays the practice name as author attribution only (e.g., "By Smith & Partners Accounting"). No logo, custom colours, or white-labelling. Platform content shows "MoneyQuest" as author. This keeps the content rendering simple and consistent.

### Quizzes

**Q16: Is there a question bank or randomisation for quizzes?**
A: No. Quizzes have fixed questions set at creation time (either AI-generated or manually created by practice). There is no question bank, no randomisation of question order, and no question pool selection. Every user taking the same quiz sees the same questions in the same order. Randomisation is a v2 consideration.

**Q17: How are retakes handled -- unlimited, and which score counts?**
A: Retakes are unlimited on failure. Each attempt is stored as a separate `QuizResult` record. Only the best result counts toward the literacy score (determined by `MAX(score_percent)` query in `CalculateLiteracyScore`). Once a user has passed a quiz, retaking it does not increase their literacy score further -- the distinct-quizzes-passed count does not double-count the same quiz.

### Frontend UX

**Q18: How are videos embedded, and is there mobile responsiveness consideration?**
A: Videos use sandboxed iframes restricted to YouTube, Vimeo, and Loom domains (validated server-side on `video_url`). The iframe uses `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"` and `sandbox="allow-scripts allow-same-origin allow-popups"`. The embed is wrapped in a 16:9 aspect ratio container (`aspect-video` Tailwind class). On mobile, the content page sidebar stacks below the content. Card grids use responsive columns (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`). No offline/PWA support in v1.

**Q19: Is there a feature flag, and how is it gated?**
A: Yes. `learning_hub` is added to `FeatureRegistry::all()` with category `advanced`, default `true`, and icon `GraduationCap`. All learning API routes are wrapped in `middleware(['feature:learning_hub'])`. The frontend nav item uses `featureKey: "learning_hub"` which the existing `use-features.ts` hook handles automatically. This follows the exact same pattern as `bank_feeds`, `invoices`, `budgets`, etc.

### Testing Strategy

**Q20: What is the test breakdown, and are browser tests included?**
A: Target 30-40 feature tests covering content CRUD, progress tracking, quiz submission, score calculation, badge awarding, practice assignment, bulk operations, and authorization. 5-8 browser tests for key flows (hub rendering, path navigation, calculator interaction, quiz completion, practice content creation). Tests follow existing patterns: `RefreshDatabase`, seed `RolesAndPermissionsSeeder`, assign roles, use `X-Workspace-Id` header. The feature flag is tested by verifying 403 responses when `learning_hub` is disabled. AI quiz generation tests mock the AI response to avoid real API calls.
