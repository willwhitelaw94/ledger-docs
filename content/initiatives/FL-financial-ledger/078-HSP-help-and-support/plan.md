---
title: "Implementation Plan: Help & Support (HSP)"
---

# Implementation Plan: Help & Support (078-HSP)

**Epic**: 078-HSP
**Created**: 2026-04-19
**Spec**: [spec.md](./spec.md)

---

## 1. Technical Context

### Stack

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 12, PHP 8.4, PostgreSQL |
| Event sourcing | **Not used** — help articles, tours, release notes, feedback are central CRUD (not tenant-scoped, not event-sourced). Event sourcing is reserved for financial mutations. |
| Business logic | Lorisleiva Actions (`AsAction` trait) |
| Auth | Sanctum cookies; authoring routes gated by `is_super_admin` + new `help.manage` Spatie permission (Q17 recommendation) |
| API responses | Laravel API Resources |
| Validation | Form Requests (mutations) with pre-loaded models stashed on `$request->attributes`; `Gate::authorize()` inline for reads |
| Frontend | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Server state | TanStack Query v5 |
| Client state | Zustand v5 — `useHelpSheetStore` (open/closed, active tab), `useTourStore` (active tour, current step) |
| UI primitives | shadcn/ui — `Sheet` for the drawer, `Dialog` for feedback modal, `Tabs`, `Input`, `Button`, `Badge`, `Command` for search |
| Forms | React Hook Form + Zod — feedback modal, article authoring, tour authoring |
| Drag-and-drop | @dnd-kit/core + @dnd-kit/sortable (already installed — used by 077-CRQ, 078-HSP reuses for tour step reordering) |
| Markdown rendering | `react-markdown` + `rehype-sanitize` (new dependency) |
| Markdown editing | Textarea + split-pane live preview using `react-markdown`; no WYSIWYG (Q25 recommendation) |
| Tour engine | `driver.js` (Q2 recommendation) wrapped in `useTour()` for library-swap insurance |
| Search | PostgreSQL `tsvector` + `plainto_tsquery` (Q23 recommendation) |

### Key Dependencies

| Dependency | Status | Relationship |
|-----------|--------|-------------|
| 012-ATT Attachments | Complete | S3 pipeline for feedback screenshots and article images |
| 024-NTF In-App Notifications | Complete | Optional release-note push notifications (Q6) |
| 009-BIL Laravel Pennant | Complete | `Feature::active()` used to gate tours and articles via `feature_flag` column |
| 003-AUT Auth & Multi-tenancy | Complete | `User.is_super_admin` flag; `SetWorkspaceContext` middleware for feedback workspace capture |
| 020-AIB AI Assistant | Partial | Future only (Q28) — not in V1 scope |

### Existing Codebase Readiness

**Backend (prepared)**:

| Component | Status | File |
|-----------|--------|------|
| `tour_definitions` table | EXISTS (migration) | `database/migrations/2026_04_01_750001_create_tour_tables.php` |
| `tour_completions` table | EXISTS (migration) | same file |
| S3 upload pipeline | EXISTS | `app/Actions/Attachments/UploadAttachment.php` (reused for feedback screenshots) |
| `is_super_admin` flag | EXISTS | `users` table |
| Pennant `Feature::active()` gating | EXISTS | Used throughout existing middleware |
| Admin routing prefix | EXISTS | `routes/api.php` has `admin` group middleware |

**Backend (needs creation)**:

| Component | Status | Purpose |
|-----------|--------|---------|
| `app/Models/Central/HelpArticle.php` | NEW | Article model |
| `app/Models/Central/HelpCategory.php` | NEW | Category model |
| `app/Models/Central/HelpArticleView.php` | NEW | Per-user view tracking |
| `app/Models/Central/HelpArticleFeedback.php` | NEW | "Was this helpful?" votes |
| `app/Models/Central/TourDefinition.php` | NEW | Tour model on existing table |
| `app/Models/Central/TourCompletion.php` | NEW | Completion model on existing table |
| `app/Models/Central/ReleaseNote.php` | NEW | Release note model |
| `app/Models/Central/UserFeedback.php` | NEW | Feedback model |
| Migrations | NEW | `help_articles`, `help_categories`, `help_article_views`, `help_article_feedback`, `release_notes`, `user_feedback`; ALTER `users` add `last_seen_release_at`; ALTER `tour_definitions` add `route_pattern` + `scope` (enum `user` \| `workspace`, default `workspace`); ALTER `tour_completions` make `workspace_id` nullable (Q12, Q33) |
| Enums | NEW | `HelpArticleStatus` (draft, published, archived), `ReleaseNoteCategory` (new, improved, fixed), `FeedbackCategory` (bug, idea, question, other), `FeedbackStatus` (new, triaged, resolved) |
| `app/Http/Controllers/Api/HelpArticleController.php` | NEW | Public article read + search |
| `app/Http/Controllers/Api/HelpCategoryController.php` | NEW | Category read |
| `app/Http/Controllers/Api/HelpRecommendationController.php` | NEW | "Recommended for this page" endpoint |
| `app/Http/Controllers/Api/ReleaseNoteController.php` | NEW | Read + mark-seen |
| `app/Http/Controllers/Api/TourController.php` | NEW | Read tours matching route + mark complete |
| `app/Http/Controllers/Api/UserFeedbackController.php` | NEW | Submit feedback |
| `app/Http/Controllers/Api/Admin/HelpArticleAdminController.php` | NEW | CRUD for articles + categories |
| `app/Http/Controllers/Api/Admin/TourAdminController.php` | NEW | CRUD for tours |
| `app/Http/Controllers/Api/Admin/ReleaseNoteAdminController.php` | NEW | CRUD for release notes |
| `app/Http/Controllers/Api/Admin/UserFeedbackAdminController.php` | NEW | Triage feedback |
| Actions (`app/Actions/Help/`) | NEW | `PublishArticle`, `ArchiveArticle`, `IncrementArticleView`, `RecordArticleFeedback`, `CompleteTour`, `MarkReleaseNotesSeen`, `SubmitFeedback`, `TriageFeedback` |
| API Resources | NEW | `HelpArticleResource`, `HelpCategoryResource`, `TourDefinitionResource`, `ReleaseNoteResource`, `UserFeedbackResource` |
| Form Requests | NEW | `StoreHelpArticleRequest`, `UpdateHelpArticleRequest`, `StoreTourRequest`, `UpdateTourRequest`, `StoreReleaseNoteRequest`, `SubmitFeedbackRequest`, `TriageFeedbackRequest` |
| Policies | NEW | `HelpArticlePolicy`, `TourDefinitionPolicy`, `ReleaseNotePolicy`, `UserFeedbackPolicy` (all gate WRITE on `is_super_admin` / `help.manage` permission) |
| Seeders | NEW | `HelpCategorySeeder`, `HelpContentSeeder` (15 articles — Q4 hybrid, seeds from `database/seeders/content/help/*.md`, never overwrites live DB edits), `TourSeeder` (5 workspace tours + 3 user-scope onboarding tours: `onboarding.welcome`, `onboarding.sidebar`, `onboarding.shortcuts`), `ReleaseNoteSeeder` (initial "Welcome to the new Help Center" note) |
| Permission | NEW | `help.manage` added to `RolesAndPermissionsSeeder`, seeded to super-admin only (Q17) |
| Full-text search index | NEW | PostgreSQL `tsvector` generated column on `help_articles(title, body)` + GIN index |

**Frontend (nothing exists — all new)**:

No frontend components, hooks, stores, or types exist for help, tours, release notes, or feedback. The entire frontend surface is new. One small modification: `frontend/src/components/layout/page-header.tsx` gains a `?` button.

### File Inventory (Frontend)

| Path | Purpose |
|------|---------|
| `frontend/src/components/help/help-sheet.tsx` | Right drawer component |
| `frontend/src/components/help/help-sheet-trigger.tsx` | `?` button rendered into PageHeaderBar |
| `frontend/src/components/help/help-search.tsx` | Debounced search input |
| `frontend/src/components/help/article-card.tsx` | Article preview card |
| `frontend/src/components/help/article-view.tsx` | Inline article reader (markdown) |
| `frontend/src/components/help/recommended-articles.tsx` | "Recommended for this page" list |
| `frontend/src/components/help/recent-articles.tsx` | "Recently viewed" list |
| `frontend/src/components/help/whats-new-feed.tsx` | Release notes list |
| `frontend/src/components/help/feedback-modal.tsx` | Feedback form modal |
| `frontend/src/components/help/help-page-key.tsx` | Component that registers the current page's `page_key` in Zustand (Q3) |
| `frontend/src/components/tours/tour-provider.tsx` | Mounts driver.js and exposes tour control |
| `frontend/src/components/tours/tour-trigger.tsx` | `useTour()` hook that auto-starts matching tours |
| `frontend/src/components/tours/tour-step.tsx` | Step renderer (markdown body + controls) |
| `frontend/src/stores/help-sheet.ts` | Zustand — sheet open state, active section |
| `frontend/src/stores/tour.ts` | Zustand — active tour, current step index, running state |
| `frontend/src/stores/help-page-key.ts` | Zustand — current page's `page_key` (set by `<HelpPageKey>`) |
| `frontend/src/hooks/use-help-articles.ts` | TanStack Query hooks |
| `frontend/src/hooks/use-release-notes.ts` | TanStack Query hooks |
| `frontend/src/hooks/use-tours.ts` | TanStack Query hooks |
| `frontend/src/hooks/use-feedback.ts` | TanStack Query hook (mutation) |
| `frontend/src/hooks/use-tour.ts` | Main tour orchestrator — reads matching tours, auto-starts, handles completion |
| `frontend/src/types/help.ts` | `HelpArticle`, `HelpCategory`, `ReleaseNote`, `TourDefinition`, `UserFeedback` types |
| `frontend/src/lib/help-api.ts` | Typed API client wrappers |
| `frontend/src/app/(dashboard)/help/page.tsx` | Help Center landing |
| `frontend/src/app/(dashboard)/help/[category]/page.tsx` | Category listing |
| `frontend/src/app/(dashboard)/help/[category]/[slug]/page.tsx` | Article detail |
| `frontend/src/app/(admin)/admin/help-and-support/articles/page.tsx` | Article list (admin) |
| `frontend/src/app/(admin)/admin/help-and-support/articles/[id]/page.tsx` | Article editor (admin) |
| `frontend/src/app/(admin)/admin/help-and-support/tours/page.tsx` | Tour list (admin) |
| `frontend/src/app/(admin)/admin/help-and-support/tours/[id]/page.tsx` | Tour editor (admin) |
| `frontend/src/app/(admin)/admin/help-and-support/release-notes/page.tsx` | Release-note list (admin) |
| `frontend/src/app/(admin)/admin/help-and-support/release-notes/[id]/page.tsx` | Release-note editor (admin) |
| `frontend/src/app/(admin)/admin/help-and-support/feedback/page.tsx` | Feedback triage table (admin) |
| `frontend/src/app/(admin)/admin/help-and-support/feedback/[id]/page.tsx` | Feedback detail / triage (admin) |
| `frontend/src/components/layout/page-header.tsx` | MODIFY — add `?` button |

---

## 2. Gate 3: Architecture Checklist

### 2.1 Technical Feasibility

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | Central CRUD (no event sourcing), proven patterns from 076-CRT / 077-CRQ |
| Existing patterns leveraged | PASS | Follows central-model pattern; reuses Attachment pipeline, shadcn Sheet, dnd-kit |
| No impossible requirements | PASS | All spec items achievable with current stack |
| Performance considered | PASS | Search via tsvector + GIN index; help sheet opens <200ms (SC-007); article list paginated |
| Security considered | PASS | Markdown sanitised via rehype-sanitize; authoring gated by `is_super_admin` + `help.manage` permission; feedback screenshots via trusted 012-ATT pipeline |

### 2.2 Data & Integration

| Check | Status | Notes |
|-------|--------|-------|
| Data model understood | PASS | 6 new tables + 3 migrations against existing tables (users.last_seen_release_at; tour_definitions.route_pattern; tour_completions.workspace_id nullable) |
| API contracts clear | PASS | 20+ endpoints across public and admin |
| Dependencies identified | PASS | All dependencies (012-ATT, 024-NTF, 009-BIL, 003-AUT) complete |
| Integration points mapped | PASS | PageHeaderBar `?` button, existing keyboard-shortcut overlay linkage, Pennant gating, Spatie Permission |
| DTO persistence explicit | PASS | No DTOs beyond validation — central models are simple enough that Spatie Data is overkill |

### 2.3 Event Sourcing Standards

| Check | Status | Notes |
|-------|--------|-------|
| Aggregate roots identified | N/A | This epic does not introduce financial mutations. No events, projectors, or aggregates. |
| Snapshots planned | N/A | — |
| Replay strategy documented | N/A | — |

### 2.4 Multi-Tenancy Standards

| Check | Status | Notes |
|-------|--------|-------|
| Tenant models scoped | PASS | ALL new models are **central** (shared across tenants). `user_feedback.workspace_id` is nullable (captured for context, not for tenant isolation). |
| Central vs tenant separation clear | PASS | Declared explicitly in spec; models go in `app/Models/Central/` |
| No cross-tenant queries | PASS | No tenant-scoped data in this epic |
| Tenant context set in middleware | PASS | Feedback submission reads `workspace_id` from `SetWorkspaceContext` middleware (nullable for public/practice-shell pages) |
| Tests verify isolation | N/A | No tenant-scoped data — isolation tests not applicable |

### 2.5 Laravel Backend Overrides

| Check | Status | Notes |
|-------|--------|-------|
| Use Lorisleiva Actions | PASS | All mutation logic via `AsAction` |
| Laravel Data for DTOs | N/A | Simple payloads; Form Requests sufficient |
| API Resources for responses | PASS | One Resource per model |
| Model route binding | PASS | Controllers use `HelpArticle`, `TourDefinition`, `ReleaseNote`, `UserFeedback` injected by slug/uuid |
| Sanctum cookie auth | PASS | Same as rest of app |
| Feature flags dual-gated | PASS | Pennant check in API endpoints + `feature_flag` field on articles/tours for frontend filtering |

### 2.6 Next.js/React Standards (CLAUDE.md Gate Overrides)

| Check | Status | Notes |
|-------|--------|-------|
| All components use TypeScript | PASS | Strict `.tsx` throughout |
| Props typed with types | PASS | `type Props = {}` for every component |
| No `any` types | PASS | Full types in `types/help.ts` |
| Shared types identified | PASS | `frontend/src/types/help.ts` |
| Component library reused | PASS | shadcn `Sheet`, `Dialog`, `Tabs`, `Command`, `Badge`, `Input`, `Button`, `Textarea` |
| Server/client components explicit | PASS | Help sheet, article view, admin editors all `'use client'`. The `/help` page shell is a Server Component; article detail rendering is server-side for SEO-friendliness |
| Data fetching via TanStack Query | PASS | All server state through hooks in `frontend/src/hooks/` |
| Client state via Zustand | PASS | `useHelpSheetStore`, `useTourStore`, `useHelpPageKeyStore` |
| Forms use React Hook Form + Zod | PASS | Feedback modal, article editor, tour editor, release-note editor |
| API client typed | PASS | `frontend/src/lib/help-api.ts` fully typed |

### 2.7 Accessibility (First-class, FR-050)

| Check | Status | Notes |
|-------|--------|-------|
| Focus trap | PASS | shadcn `Sheet` and `Dialog` provide focus trap by default |
| ESC closes overlays | PASS | shadcn default + tour provider explicit handler |
| ARIA labels | PASS | All icon-only buttons labelled; sheet has `aria-labelledby` |
| Keyboard-only navigation | PASS | Full test plan includes keyboard-only traversal per user story |
| Screen reader announcements | PASS | Tour step content in an ARIA live region; feedback toast announced |
| axe-core audit | PASS | Included in Sprint 4 test plan (SC-006) |

---

## 3. Architecture Overview

### 3.1 System Architecture

```
User (workspace / practice / super-admin)
        │
        v
Header `?` button ──> HelpSheet (right drawer)
        │                  │
        │                  ├── Search      ──> GET /help/articles?q=
        │                  ├── Recommended ──> GET /help/recommendations?page_key=
        │                  ├── Recently    ──> GET /help/articles/recent
        │                  ├── Tour row    ──> useTour().start()
        │                  ├── Shortcuts   ──> opens existing overlay
        │                  ├── What's new  ──> GET /help/release-notes  + POST /help/release-notes/seen
        │                  └── Feedback    ──> opens FeedbackModal
        │                                           │
        v                                           v
TourProvider (driver.js)                 POST /help/feedback  (+ S3 upload via 012-ATT)
        │
        ├── reads tours for current route (GET /tours?route=)
        ├── filters by role + feature flag
        ├── filters out completed
        ├── auto-starts highest priority if trigger=first-visit
        └── on complete/skip: POST /tours/{key}/complete

Super-admin (separate)
        │
        v
/admin/help-and-support/*
        │
        ├── articles    ── CRUD on HelpArticle
        ├── tours       ── CRUD on TourDefinition
        ├── release-notes ─ CRUD on ReleaseNote
        └── feedback    ── triage UserFeedback
```

### 3.2 Help Sheet Open Flow

```
User clicks `?`
      │
      v
useHelpSheetStore.open()
      │
      v
<Sheet> renders (shadcn — focus trap, ESC binding)
      │
      v
Sheet mounts children:
  - HelpSearch           (idle)
  - RecommendedArticles  ──> useHelpRecommendations(currentPageKey)
  - RecentArticles       ──> useRecentArticles()
  - TourRow              ──> useMatchingTour(currentRoute)
  - ShortcutsRow         (static)
  - WhatsNewRow          ──> useUnreadReleaseNoteCount()
  - FeedbackRow          (static)
```

### 3.3 Tour Lifecycle

```
Route change in Next.js
      │
      v
useTour() hook evaluates:
  - matching tour definitions for current route
  - user role + feature flag intersect
  - tour_completions missing for (user, workspace, tour_key)
      │
      ├── match + trigger=first-visit  ──> auto-start
      └── match + trigger=manual       ──> surface "Start tour" row, don't auto-start
      │
      v
Tour starts (driver.js):
  - for each step: find target selector, wait up to 2s
  - render spotlight + popover
  - user clicks Next / Back / Skip
      │
      v
On complete OR skip OR ESC:
  POST /tours/{key}/complete  ──> tour_completions row
      │
      v
Tour cleanup:
  - remove overlay
  - return focus to document.activeElement pre-tour
```

### 3.4 Feedback Flow

```
User clicks "Give feedback"
      │
      v
<FeedbackModal> opens with React Hook Form + Zod
      │
      ├── Category (select): bug, idea, question, other
      ├── Body (textarea, min 10 chars)
      ├── URL (pre-filled from window.location.pathname + search)
      └── Screenshot upload ──> POST /attachments (012-ATT)
      │
      v
Submit:
  POST /help/feedback {category, body, url, screenshot_attachment_id}
      │
      v
SubmitFeedback action:
  - validate
  - create UserFeedback row with status=new
  - (Q13 — DB only V1, no external routing)
      │
      v
Toast "Thanks — we've got it."
```

---

## 4. Data Model

### 4.1 New Tables

**`help_categories`**
```
id, name (string), slug (string, unique), icon (string), sort_order (int), timestamps
```

**`help_articles`**
```
id, slug (string, unique), title (string), body (text), category_id (FK → help_categories),
page_keys (jsonb), target_roles (jsonb, nullable), feature_flag (string, nullable),
status (enum: draft/published/archived), view_count (int, default 0),
author_id (FK → users), published_at (timestamp, nullable), timestamps,
search_vector (tsvector, generated column on title || body),
INDEX: slug, status, category_id, GIN on search_vector, GIN on page_keys
```

**`help_article_views`**
```
id, user_id (FK → users), article_id (FK → help_articles), viewed_at (timestamp),
INDEX: (user_id, viewed_at DESC), (article_id, viewed_at)
```

**`help_article_feedback`**
```
id, user_id (FK → users, nullable), article_id (FK → help_articles),
helpful (boolean), comment (text, nullable), created_at,
UNIQUE: (user_id, article_id) — one vote per user per article
```

**`release_notes`**
```
id, title (string), body (text), category (enum: new/improved/fixed),
published_at (timestamp, nullable), image_attachment_id (FK → attachments, nullable),
cta_url (string, nullable), cta_label (string, nullable),
notify_users (boolean, default false),   -- Q6 hybrid
timestamps,
INDEX: published_at DESC
```

**`user_feedback`**
```
id, user_id (FK → users), workspace_id (FK → workspaces, nullable),
category (enum), body (text), url (string), user_agent (string),
screenshot_attachment_id (FK → attachments, nullable),
status (enum: new/triaged/resolved),
triaged_at (timestamp, nullable), triaged_by (FK → users, nullable),
resolved_at (timestamp, nullable), resolution_note (text, nullable),
timestamps,
INDEX: status, created_at DESC, (workspace_id, created_at)
```

### 4.2 Schema Changes to Existing Tables

- **`users`** — add `last_seen_release_at` (timestamp, nullable)
- **`tour_definitions`** — add `route_pattern` (string, after `priority`)
- **`tour_completions`** — make `workspace_id` nullable (for super-admin / practice-shell tours) (Q12)

### 4.3 Enums

- `HelpArticleStatus`: draft, published, archived
- `ReleaseNoteCategory`: new, improved, fixed
- `FeedbackCategory`: bug, idea, question, other
- `FeedbackStatus`: new, triaged, resolved
- `TourTrigger`: first-visit, manual (already in schema — string; typed enum on model side)

---

## 5. API Surface

### 5.1 Public (Authenticated)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/help/articles` | List published articles (paginated, filterable by category + search) |
| GET | `/api/v1/help/articles/{slug}` | Article detail — increments view count |
| GET | `/api/v1/help/articles/recent` | Current user's last 3 views |
| GET | `/api/v1/help/recommendations` | Articles matching `?page_key=` + current user's role/flags |
| GET | `/api/v1/help/categories` | List categories with article counts |
| POST | `/api/v1/help/articles/{slug}/feedback` | "Was this helpful?" vote |
| GET | `/api/v1/help/release-notes` | Published release notes + `unread_count` |
| POST | `/api/v1/help/release-notes/seen` | Update `user.last_seen_release_at = now()` |
| GET | `/api/v1/tours` | Tours matching `?route=` + filters |
| POST | `/api/v1/tours/{key}/complete` | Write `tour_completions` row |
| POST | `/api/v1/help/feedback` | Submit feedback (multipart with optional screenshot) |

### 5.2 Super-Admin (`is_super_admin` middleware + `help.manage` policy)

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST/PATCH/DELETE | `/api/v1/admin/help/articles` | CRUD |
| POST | `/api/v1/admin/help/articles/{id}/publish` | Publish |
| POST | `/api/v1/admin/help/articles/{id}/archive` | Archive |
| GET/POST/PATCH/DELETE | `/api/v1/admin/help/categories` | CRUD |
| GET/POST/PATCH/DELETE | `/api/v1/admin/help/tours` | CRUD |
| POST | `/api/v1/admin/help/tours/{id}/preview-token` | Generate a preview token that bypasses completion rows |
| GET/POST/PATCH/DELETE | `/api/v1/admin/help/release-notes` | CRUD |
| GET | `/api/v1/admin/help/feedback` | Triage list |
| PATCH | `/api/v1/admin/help/feedback/{id}` | Update status, resolution_note |

---

## 6. Phasing

**Sprint 1 — Backend Foundation + Core Read APIs**
- All migrations (6 new tables + 3 schema changes)
- All 8 models with relationships, policies, enums
- Seeders: `HelpCategorySeeder`, `HelpContentSeeder` (15 articles), `TourSeeder` (5 tours), permission seeding
- Public read endpoints: articles, categories, recommendations, release notes, tours
- API Resources
- Pest tests (~25 tests): model factories, endpoint tests, role/flag gating, super-admin authorisation

**Sprint 2 — Help Sheet + Help Center + What's New**
- Header `?` button integration in `page-header.tsx`
- `HelpSheet` component with all rows
- Article detail inline view within sheet
- Search (tsvector-backed)
- `/help` page with categories, article list, article detail
- `<HelpPageKey>` component for route-key registration
- What's New feed + unread badge wiring
- 15 TanStack Query hooks, Zustand stores
- Browser tests (~8 tests) covering keyboard nav and screen-reader flows

**Sprint 3 — Tours Engine**
- Integrate driver.js, wrap in `useTour()`
- `TourProvider` component
- Auto-start on first-visit logic with selector waiting (max 2s)
- `POST /tours/{key}/complete` wiring, dedup via unique constraint
- Super-admin `/admin/help-and-support/tours` CRUD UI with step editor (drag-and-drop reordering via dnd-kit)
- Missing-target diagnostic logging
- Browser tests (~5 tests): auto-start, manual start, skip, completion idempotency

**Sprint 4 — Feedback + Admin UIs + A11y Polish**
- Feedback modal + S3 screenshot upload via 012-ATT
- `/admin/help-and-support/feedback` triage table
- `/admin/help-and-support/articles` + markdown editor
- `/admin/help-and-support/release-notes` editor
- axe-core a11y sweep → fix all critical/serious findings
- Performance: measure help sheet open time, search latency; tune if SC-007/SC-008 not met
- Cross-browser smoke (Chrome, Safari, Firefox)

### Deferred Pennant flag

Per Q31 recommendation, the **tour engine** (Sprint 3 output) is gated behind a new Pennant feature `help-tours` with a phased rollout. Articles, What's New, and Feedback ship globally.

---

## 7. Testing Strategy

### 7.1 Backend (Pest)

- **Unit**: enums, policies, Action classes (SubmitFeedback, CompleteTour, etc.)
- **Feature**: every endpoint with happy-path + role-gated denial + feature-flag gating + validation errors
- **Seeder tests**: running `HelpContentSeeder` produces exactly 15 articles with valid categories and page_keys
- **Search tests**: tsvector search returns expected articles for known terms, case-insensitive
- **Unique-constraint tests**: `tour_completions` double-insert is a noop
- Target: ≥50 Pest tests across feature + unit

### 7.2 Frontend (Browser — Pest 4 + Playwright)

- **Help sheet open/close**: `?` button triggers drawer, ESC closes, focus returns
- **Search**: typing shows debounced results; empty state shows feedback link
- **Tour auto-start**: first visit to `/intray` → tour runs; second visit → does not
- **Tour skip via ESC**: writes completion row
- **Feedback modal**: open, fill, submit, toast on success
- **Article view**: click article → inline view; back → preserved state
- **What's New**: unread badge shows correct count; clears after open
- **Keyboard-only traversal**: open sheet → tab through every row → open article → read → back → close sheet without mouse
- Target: ≥15 browser tests

### 7.3 Accessibility

- axe-core integrated into browser tests for the help sheet, article view, `/help`, tour overlay
- Manual screen-reader test (VoiceOver on macOS) end-to-end for at least 3 user flows
- Zero critical/serious violations (SC-006)

### 7.4 Performance

- Help sheet open P95 <200ms (SC-007): measured via `performance.mark()` in a browser test
- Search response P95 <300ms (SC-008): measured server-side in feature test

---

## 8. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Tour target selectors drift when UI changes | MEDIUM | Standardise on `data-tour-target="<slug>"` attributes; add a lint check that warns if a tour step references a missing slug |
| Tour library choice proves wrong post-launch | LOW | `useTour()` is a thin wrapper; swapping to another library is <1 day |
| Article content rots (drift from UI) | MEDIUM | `/admin/help-and-support/articles` surfaces `last_updated_at`; super-admin review cadence quarterly; view-count-without-helpful-votes flagged for review |
| Feedback volume exceeds triage capacity | MEDIUM | Q13 deferred Linear integration — revisit once volume measured; initial SLA: triage within 72h, unresolved after 30 days is auto-escalated |
| PostgreSQL full-text search insufficient as content grows | LOW | Q23 migration path to Typesense documented; abstracted behind `HelpSearchService` |
| Markdown sanitiser too aggressive (breaks legitimate content) | LOW | `rehype-sanitize` with an allowlist schema; super-admin preview shows rendered output before publish |
| Tour auto-start races with dynamic content render | MEDIUM | FR-020 covers: wait up to 2s for target selector to exist before firing; skip silently if not found |
| Users miss the `?` button | LOW | Orientation tour (US10) points at it; kbd badge shown in tooltip |

---

## 9. Complexity Tracking

| Area | Complexity | Justification |
|------|------------|---------------|
| Tour engine | MEDIUM-HIGH | Dynamic target resolution, selector waiting, completion dedup, feature-flag + role gating, admin authoring UI. Mitigated by library (driver.js) doing the heavy lifting of overlay rendering. |
| Markdown editor + sanitiser | LOW | No WYSIWYG; plain textarea + live preview. Sanitiser is a single dependency. |
| `<HelpPageKey>` registry pattern | LOW | Simple Zustand store + effect-on-mount. Small boilerplate cost (one line per page) accepted for accuracy. |
| Search (tsvector) | LOW-MEDIUM | Generated column + GIN index; no external service to manage. |
| Feedback + screenshot flow | LOW | Reuses 012-ATT; small form. |
| Admin authoring UIs (4 surfaces) | MEDIUM | Four CRUD UIs with consistent patterns (DataTable + form editor). Highest volume of code. |

---

## 10. Open Decisions (Blockers for Design)

The following Clarifications from spec.md must be resolved before Gate 2 (Design handover):

- **Q2** — Tour library choice (recommended: driver.js)
- **Q3** — Route key derivation (recommended: explicit `<HelpPageKey>` registry)
- **Q4** — Content source of truth (recommended: hybrid markdown seed + DB override)
- **Q8** — Tour `route_pattern` syntax (recommended: path + `:param` wildcards)
- **Q10** — Tour step target in collapsed parent (recommended: skip + warn)
- **Q12** — `tour_completions.workspace_id` when null (recommended: make nullable)
- **Q17** — `help.manage` permission (recommended: introduce permission, seed to super-admin)
- **Q29** — Admin UI structure (recommended: unified `/admin/help-and-support/*`)

The remaining Clarifications can be resolved during design or early development without blocking.

---

## 11. Post-Launch / V2 Candidates

- Per-practice custom articles and tours (Q5)
- Public changelog page (Q20)
- AI chatbot RAG over help content (Q28)
- Proactive contextual nudges (Q30)
- External search backend migration (Q23)
- Scheduled publish (Q27)
- Multi-language content
- Video embeds (Q21)
- Linear / Slack feedback routing (Q13)
- User-visible "My feedback" tab (Q14)
