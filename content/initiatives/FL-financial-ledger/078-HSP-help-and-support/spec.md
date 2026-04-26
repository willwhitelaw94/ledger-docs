---
title: "Feature Specification: Help & Support (HSP)"
---

# Feature Specification: Help & Support (HSP)

**Feature Branch**: `078-HSP-help-and-support`
**Created**: 2026-04-19
**Status**: Draft
**Epic**: 078-HSP
**Initiative**: FL — Financial Ledger Platform
**Effort**: L (4 sprints)
**Depends On**: 012-ATT Attachments (complete — screenshot/image uploads), 024-NTF Notifications (complete — release-note nudges), 009-BIL Pennant (complete — feature-flag-gated tours)
**Absorbs**: 075-FTS Feature Tour Stepper (migration-only stub — model/controller/seeder/frontend are scope of this epic)

---

## Out of Scope

- **Per-practice custom help articles** — V1 super-admin-authored only. Per-practice content model (practice-branded articles, custom tours) is deferred until a practice explicitly asks.
- **AI-generated help content** — articles are human-authored. RAG/embedding help into the AI chatbot (020-AIB) is a future integration, not V1.
- **External knowledge base sync** — no import from Notion / Intercom / Zendesk. Help content is authored in-app in V1.
- **Live chat support** — feedback capture is asynchronous only. No Intercom-style live chat widget.
- **In-product video walkthroughs** — V1 supports images in articles only. Embedded video is future.
- **Multi-language content** — English-only V1. Localisation is future.
- **Community / forum** — no user-to-user help threads.
- **Ticketing / SLA system** — feedback writes to a table that super-admins can read; no assignment, no statuses beyond `new/triaged/resolved`, no customer-visible ticket IDs. If Linear routing is adopted (see Clarifications), it's a one-way forward.
- **Tour branching / conditionals** — V1 tours are linear step-by-step. "If user clicks X, skip to step Y" branching is future.
- **Analytics dashboard for authors** — V1 captures view counts and tour completions in DB tables. Admin dashboards / charts are future.

---

## Overview

Ledgerly spans 75+ epics covering core ledger, banking, invoicing, AR/AP, payroll, practice management, workpapers, and an AI chatbot. Today there is zero in-product help. Users either guess, message the founder directly, or churn. This epic closes that gap with a unified Help & Support surface.

Five user-facing capabilities:

1. **Help Sheet** — right-hand drawer opened from the header `?` button. Search, "Recommended for this page" articles, "Start tour for this page", keyboard shortcuts link, What's New, and feedback capture all in one place.
2. **Help Center** — `/help` page with categorised article browser, article detail view, and super-admin authoring UI.
3. **Guided Tours** — built on the existing `tour_definitions` / `tour_completions` migration. Auto-start on first visit (per `page_key` + user scope), manually replayable, authored by super-admins through an admin UI.
4. **What's New** — chronological release-notes feed with an unread badge on the `?` icon, cleared once the user opens the feed.
5. **Feedback Capture** — structured form (category, body, URL, role, optional screenshot) writing to a central `user_feedback` table for super-admin triage.

### Relationship to Existing Assets

- **`tour_definitions` / `tour_completions` tables** already exist from migration `2026_04_01_750001_create_tour_tables.php`. This epic builds the models, controllers, seeders, admin UI, and frontend hook that activate them. It absorbs the 075-FTS epic.
- **`?` keyboard-shortcut overlay** already exists at `frontend/src/components/layout/keyboard-shortcuts-overlay.tsx`. Not broken or replaced — surfaced as a row inside the new help sheet.
- **Page header `?` button** does not currently exist. The header at `frontend/src/components/layout/page-header.tsx` has a Search button, Ask AI, Notifications, Quick Create, and User Menu — this epic adds a sibling `?` button between Ask AI and Notifications.

### Multi-Tenancy Stance

- **Help content, tour definitions, release notes are central** (shared across all tenants). Models live in `app/Models/Central/`.
- **Tour completions are workspace-scoped** per the existing schema — tours complete per user-per-workspace so a user on a new workspace sees the tour fresh.
- **Feedback is captured with `workspace_id` when the user is in workspace context** (nullable for super-admin / practice-shell / public pages).
- **Article view tracking and release-read state are per user** (not per workspace).

### Scope of "Help"

Help articles serve three audiences, surfaced via article `target_roles`:

- **Recipients (workspace users)**: owners, bookkeepers, approvers, accountants, clients, auditors
- **Practice users**: practice managers, firm owners using the practice portal
- **Super-admins**: platform operators (but super-admin help is minimal in V1)

---

## User Scenarios & Testing

### User Story 1 — Open the Help Sheet and Find an Article (Priority: P1)

A user is on the Invoices page and doesn't remember how to record a partial payment. They click the `?` button in the page header. A right-hand drawer slides in showing "Recommended for this page" at the top — including an article titled "Recording payments on invoices". They click it, read it inline without leaving the page, and apply the steps.

**Why this priority**: This is the core loop. Without the help sheet opening reliably and surfacing relevant articles, every other capability is useless. This is the entry point for 90% of help interactions.

**Independent Test**: Can be fully tested by opening the app, clicking the `?` button on any page with articles tagged to that route, and verifying "Recommended for this page" shows the correct articles.

**Acceptance Scenarios**:

1. **Given** I am on any authenticated page, **When** I click the `?` button in the page header, **Then** a right-hand sheet slides in with the title "Help & Support" and a close button.
2. **Given** the help sheet is open, **When** I view the top section, **Then** I see a search box, a "Recommended for this page" list (articles tagged with a `page_key` matching the current route), and "Recently viewed" (my last 3 articles, if any).
3. **Given** the help sheet is open, **When** I view the middle section, **Then** I see rows for "Start tour for this page" (only if a tour exists for this route), "Keyboard shortcuts", "What's new" (with unread count badge), and "Give feedback".
4. **Given** I click an article title in the help sheet, **When** the article loads, **Then** it renders inline within the sheet with title, body (markdown), category breadcrumb, and related articles at the bottom.
5. **Given** I am viewing an article inline, **When** I click the back arrow, **Then** I return to the help sheet index with my previous state (search term, scroll position) preserved.
6. **Given** I press `Escape` while the help sheet is open, **When** focus is inside the sheet, **Then** the sheet closes and focus returns to the `?` button.
7. **Given** I am on a route with no tagged articles, **When** I open the help sheet, **Then** "Recommended for this page" shows a neutral message ("No articles tagged for this page yet") and the rest of the sheet still functions.

---

### User Story 2 — Search Across Help Articles (Priority: P1)

A user opens the help sheet and types "reconcile" into the search box. Results appear as they type, showing article titles and matched snippets from the body. They click a result and read it.

**Why this priority**: Search is the fallback for when a user doesn't know what page they need or when no article is tagged to their current page. It must work before tours or feedback are worth building.

**Independent Test**: Can be tested by seeding 10+ articles and verifying search returns relevant results within 300ms of typing for queries with 3+ characters.

**Acceptance Scenarios**:

1. **Given** I am in the help sheet, **When** I type 3 or more characters into the search box, **Then** results appear live (debounced ~150ms) showing matched articles sorted by relevance.
2. **Given** my query matches article titles and body, **When** results render, **Then** each result shows the article title, a matched snippet from the body (with the query term highlighted), and the article category.
3. **Given** my query returns no results, **When** I stop typing, **Then** I see "No articles found for '<query>'" with a link to "Give feedback" (so I can tell the team what's missing).
4. **Given** I clear the search box, **When** the input is empty, **Then** I return to the default help sheet view (Recommended + Recently viewed + rows).
5. **Given** I am on a slow connection, **When** I type in search, **Then** I see a loading indicator while results fetch, and the last-good result set stays visible until the new one arrives (no flash of empty state).

---

### User Story 3 — Browse the Help Center (Priority: P1)

A user clicks "Browse all help topics" in the help sheet footer. The `/help` page loads with a left-side category tree (Getting Started, Invoicing, Banking, Payroll, Practice, AI Assistant, Settings) and a main panel showing the top articles per category. They click "Banking" and see the full article list for that category.

**Why this priority**: The help sheet is for in-context quick wins. `/help` is where users go to learn a whole domain (e.g., a bookkeeper onboarding to banking). Without it, there is no browsing experience.

**Independent Test**: Can be tested by navigating to `/help` directly, verifying categories load, clicking each category, and confirming article lists render with correct counts.

**Acceptance Scenarios**:

1. **Given** I navigate to `/help`, **When** the page loads, **Then** I see a page header titled "Help Center", a left sidebar listing categories with article counts, a main panel, and a persistent search bar.
2. **Given** I click a category in the sidebar, **When** the main panel updates, **Then** I see all published articles in that category sorted alphabetically with title, short description, and last-updated date.
3. **Given** I click an article, **When** the article page loads, **Then** I see breadcrumbs (Help Center > Category > Article), the article body rendered from markdown, and a "Related articles" footer.
4. **Given** I finish reading an article, **When** I reach the end, **Then** I see a "Was this helpful?" prompt with Yes/No buttons that increments a counter on the article (for super-admin analytics).
5. **Given** I am an unauthenticated user, **When** I visit `/help`, **Then** [NEEDS CLARIFICATION: Is `/help` public? See Clarifications Q1.]

---

### User Story 4 — Start a Tour for the Current Page (Priority: P1)

A new user lands on `/intray` for the first time. A tour auto-starts: a spotlight overlay appears, a popover points at the left pane with "This is your attention queue — items that need your eyes." They click "Next", the popover moves to the middle pane, then the right. At the end they click "Got it" and the tour completion is recorded — it will not auto-fire again on this workspace.

**Why this priority**: Tours are the differentiator for first-login experience and a core user ask. Without tours, the migration stays unused and users stay lost.

**Independent Test**: Can be tested by seeding a tour for `/intray` and verifying it auto-starts on first visit, advances through steps, and does not re-fire on second visit.

**Acceptance Scenarios**:

1. **Given** a tour exists for route `/intray` with `is_active = true`, `trigger = first-visit`, and `target_roles` includes my role, **When** I navigate to `/intray` for the first time in this workspace, **Then** the tour auto-starts after the page has loaded (waits for target selectors to exist, max 2s).
2. **Given** a tour is running, **When** I view a tour step, **Then** I see a dark overlay behind the target element, a highlighted target element (via a spotlight or outline), and a popover with the step title, body, "Skip", "Back" (disabled on step 1), and "Next" / "Got it" (last step).
3. **Given** I am on step N of a tour, **When** I click "Next", **Then** the popover moves to the target of step N+1 with a smooth transition. If step N+1's target does not exist in the DOM, the tour waits up to 2s then skips the step and shows a subtle warning to super-admins only (hidden to normal users).
4. **Given** I click "Skip" or "Got it" on any step, **When** the tour closes, **Then** a `tour_completions` row is written with `user_id`, `tour_key`, `workspace_id`, `completed_at = now()`.
5. **Given** I have previously completed or skipped a tour, **When** I revisit the same route in the same workspace, **Then** the tour does NOT auto-start.
6. **Given** a tour exists for the current route, **When** I open the help sheet, **Then** I see a "Start tour for this page" row. Clicking it starts the tour regardless of prior completion.
7. **Given** a tour is running, **When** I press `Escape`, **Then** the tour closes, a completion row is written (treated as skipped), and focus returns to the triggering element.
8. **Given** a tour's `feature_flag` is set and the flag is OFF for my user/workspace, **When** I navigate to the matching route, **Then** the tour does NOT auto-start and is NOT shown in the help sheet.
9. **Given** a tour targets an element inside an element that is initially hidden (e.g. a popover or collapsed section), **When** the tour step runs, **Then** the step MUST be skipped gracefully and a warning MUST be logged to the super-admin tour diagnostics log (resolved Q10).

---

### User Story 5 — View What's New (Priority: P1)

A user notices a blue pulse dot on the `?` icon. They click it, open the help sheet, and click "What's new (3)". The sheet navigates to a chronological list of recent release notes: "New: Kanban view on Jobs", "Improved: Bank reconciliation speed", "Fixed: PDF export on Safari". Clicking each expands it inline. After closing, the pulse dot is gone.

**Why this priority**: Release announcements drive feature adoption and re-engagement. Without it, new features ship invisibly.

**Independent Test**: Can be tested by seeding 3 release notes dated after the user's `last_seen_release_at`, verifying the badge shows "3", and confirming the badge clears after the feed is opened.

**Acceptance Scenarios**:

1. **Given** there are N published release notes with `published_at > user.last_seen_release_at`, **When** I view any page with the header, **Then** the `?` icon shows a pulse dot and the "What's new" row in the help sheet shows "What's new (N)".
2. **Given** I click "What's new" in the help sheet, **When** the feed loads, **Then** I see release notes in reverse chronological order with title, category badge (New / Improved / Fixed), date, and body (markdown, expandable).
3. **Given** I open the What's New feed, **When** the server records the open, **Then** `user.last_seen_release_at` is updated to `now()` and the pulse dot disappears on next render.
4. **Given** a release note has a CTA link (e.g. "Take me there"), **When** I click it, **Then** I navigate to the linked route and the help sheet closes.
5. **Given** I have never logged in before or my `last_seen_release_at` is null, **When** I first open What's New, **Then** I see all published release notes and the badge clears to zero after the visit.

---

### User Story 6 — Capture Feedback (Priority: P2)

A user hits an edge case where a button doesn't do what they expect. They click `?` → "Give feedback". A modal opens with a category dropdown (Bug / Idea / Question / Other), a body textarea, the current URL pre-filled, and an "Attach screenshot" button. They type a description, drop in a screenshot, and submit. The super-admin sees it in the feedback triage view.

**Why this priority**: Feedback is P2 because users have existing ways to report issues (email, Slack) — but P2 because the quality of feedback is much higher when captured with URL + workspace + role automatically.

**Independent Test**: Can be tested by opening the feedback modal, submitting a record, and verifying it appears in the super-admin `/admin/help-and-support/feedback` list with all auto-filled fields correct.

**Acceptance Scenarios**:

1. **Given** the help sheet is open, **When** I click "Give feedback", **Then** a modal opens with fields: Category (Bug / Idea / Question / Other — required), Body (required, min 10 chars), URL (auto-filled with current path, editable), Screenshot (optional upload).
2. **Given** I submit the feedback form, **When** the request succeeds, **Then** a `user_feedback` row is written with: `user_id`, `workspace_id` (nullable, set from workspace context if present), `category`, `body`, `url`, `user_agent`, `screenshot_path` (if uploaded), `status = 'new'`, `created_at = now()`.
3. **Given** I upload a screenshot, **When** the upload starts, **Then** the file goes via the existing 012-ATT S3 pipeline with a 5MB max, PNG/JPG/WebP only, and shows a progress indicator.
4. **Given** the submission succeeds, **When** the server responds, **Then** the modal closes and a toast shows "Thanks — we've got it." The help sheet stays open.
5. **Given** the submission fails (5xx or network error), **When** the error is caught, **Then** the modal stays open with a retry button and the typed content is preserved.
6. **Given** I am a super-admin, **When** I visit `/admin/help-and-support/feedback`, **Then** I see a filterable list of all feedback with category, user, workspace, URL, body preview, and screenshot thumbnail. Filters: status, category, date range. Actions: mark triaged, mark resolved, [NEEDS CLARIFICATION Q10: forward to Linear?].

---

### User Story 7 — Super-Admin Authors an Article (Priority: P2)

A super-admin opens `/admin/help-and-support/articles` and clicks "New article". They enter a title, pick a category, write the body in markdown with live preview, tag it with `page_keys` (e.g. `invoices.list`, `invoices.detail`) so it surfaces as "Recommended for this page", select target roles (owner, bookkeeper), and publish. It appears immediately in the help sheet for matching users.

**Why this priority**: Without authoring, the help center is empty. V1 ships with 15-20 seeded articles, but authoring is how it grows. P2 because super-admins can edit markdown files in the DB directly via `tinker` as a fallback in the worst case.

**Independent Test**: Can be tested by logging in as a super-admin, creating an article via the UI, publishing it, and verifying it appears in the help sheet for a matching user.

**Acceptance Scenarios**:

1. **Given** I am a super-admin, **When** I navigate to `/admin/help-and-support/articles`, **Then** I see a table of all articles with columns: Title, Category, Status (Draft / Published / Archived), Target Roles, View Count, Last Updated, Author.
2. **Given** I click "New article", **When** the editor loads, **Then** I see fields: Title (required), Slug (auto-generated from title, editable), Category (dropdown, required), Body (markdown editor with live preview), Page Keys (multi-select tags), Target Roles (multi-select of workspace roles + "all"), Feature Flag (optional text, maps to Pennant), Status (Draft / Published).
3. **Given** I publish an article, **When** the save completes, **Then** the article appears in the help sheet and `/help` within 60 seconds (server cache TTL is acceptable).
4. **Given** a published article exists with `page_keys: ["invoices.list"]`, **When** a matching user opens the help sheet on `/invoices`, **Then** the article appears in "Recommended for this page".
5. **Given** I am NOT a super-admin, **When** I navigate to `/admin/help-and-support/articles`, **Then** I receive a 403 response.
6. **Given** I archive a published article, **When** the save completes, **Then** the article is hidden from the help sheet, `/help` list, and search — but its slug URL still resolves (for old links) with an "Archived" banner.

---

### User Story 8 — Super-Admin Authors a Tour (Priority: P2)

A super-admin opens `/admin/help-and-support/tours` and clicks "New tour". They enter a key (`intray.first-look`), title, route pattern (`/intray`), steps (each with target selector, title, body, position), target roles, trigger (first-visit), and publish. A matching user lands on `/intray` for the first time and the tour auto-starts.

**Why this priority**: Tour authoring unlocks the whole tour capability. P2 because in V1 the 5 seeded tours cover the highest-value pages; the admin UI lets us iterate quickly after launch.

**Independent Test**: Can be tested by authoring a tour, logging in as a matching user, navigating to the route, and verifying the tour fires correctly on all steps.

**Acceptance Scenarios**:

1. **Given** I am a super-admin, **When** I navigate to `/admin/help-and-support/tours`, **Then** I see a table of all tours with columns: Key, Title, Route Pattern, Steps (count), Target Roles, Trigger, Active, Completions (count).
2. **Given** I click "New tour", **When** the editor loads, **Then** I see fields: Key (required, unique, lowercase with dots), Title (required), Description (optional), Route Pattern (required — path with `:param` wildcards, e.g. `/invoices/:id`), Scope (user | workspace, default workspace), Target Roles (multi-select), Feature Flag (optional), Trigger (first-visit / manual), Priority (integer), Active (boolean), Steps (ordered list editor).
3. **Given** I am editing a step, **When** I view the step editor, **Then** I see fields: Target Selector (CSS selector or `data-tour-target` slug), Title (required), Body (markdown, required), Placement (top / bottom / left / right / auto), Spotlight Padding (integer pixels).
4. **Given** I preview a tour, **When** I click "Preview", **Then** the tour runs in a new tab at the route pattern without writing a completion row.
5. **Given** two tours both match the current route and both have `trigger = first-visit`, **When** a user lands on the route, **Then** the tour with the lower `priority` integer (higher priority) fires first; the other does not fire this visit.
6. **Given** a tour references a target selector that no longer exists (UI drift), **When** the tour runs, **Then** the step is logged as a missing-target warning in a super-admin-visible log, the tour auto-skips to the next step, and if all targets are missing the tour gracefully aborts without writing a completion row.

---

### User Story 9 — Keyboard Shortcuts Row in Help Sheet (Priority: P3)

A user clicks `?` → "Keyboard shortcuts". The existing keyboard-shortcut overlay opens showing all global, navigation, list, and detail shortcuts grouped by section.

**Why this priority**: The overlay already exists. All this story does is wire the help sheet row to it. Low effort, high discoverability.

**Independent Test**: Can be tested by opening the help sheet, clicking "Keyboard shortcuts", and verifying the existing overlay opens with all current shortcuts.

**Acceptance Scenarios**:

1. **Given** the help sheet is open, **When** I click "Keyboard shortcuts", **Then** the existing shortcut overlay opens (the same one pressing `?` from any page opens) and the help sheet closes.
2. **Given** I close the shortcut overlay, **When** focus returns to the page, **Then** the help sheet does NOT reopen — this is a one-way navigation.

---

### User Story 10 — First-Login Orientation Tour (Priority: P3)

A brand-new user completes onboarding and lands on the dashboard. A short orientation tour auto-starts explaining the main sidebar, the `?` button, and the Ask AI button. After this tour, per-page tours take over on subsequent navigation.

**Why this priority**: P3 because this is a first-run-only experience that overlaps with the generic tour system (US4). It's a special-cased "orientation" tour that happens to target the dashboard.

**Independent Test**: Can be tested by creating a brand new workspace, completing onboarding, and verifying the orientation tour fires on first dashboard view.

**Acceptance Scenarios**:

1. **Given** I am a newly-onboarded user with no prior `tour_completions` rows, **When** I land on the dashboard for the first time in a new workspace, **Then** the orientation tour (`orientation.dashboard`) auto-starts.
2. **Given** the orientation tour runs, **When** I reach the step pointing at the `?` button, **Then** the step explains "Click here any time to get help, see what's new, or give feedback."
3. **Given** I complete or skip the orientation tour, **When** I navigate to other pages, **Then** per-page tours still auto-start as normal (orientation completion does not suppress per-page tours).

---

### Edge Cases

- **Help sheet opened on a route with no authenticated workspace** (e.g. practice-shell pages or super-admin views): `workspace_id` context is null; "Recommended for this page" still works based on route. `scope = user` tour completions persist on these routes (workspace_id NULL). `scope = workspace` tours simply do not fire on these routes.
- **Article slug collision**: two articles with the same slug are prevented at the DB level via unique constraint on `slug`.
- **Tour step target inside an iframe** (e.g. PDF preview, AI chat iframe): not supported in V1 — out of scope.
- **User disables all tours globally**: [NEEDS CLARIFICATION Q13: Is there a user preference?]
- **Help sheet opened while a tour is running**: the tour pauses (overlay dims, popover hidden); closing the help sheet resumes the tour.
- **Feedback submitted when offline**: [NEEDS CLARIFICATION Q14: queue locally, or fail?]
- **Screenshot upload fails mid-submission**: feedback saves without the screenshot, an error toast shows the upload failed, and the user can retry the upload separately.
- **Release note published with a bad CTA link** (404): user sees a standard 404 page; the help sheet does not protect against broken links.
- **Article body contains JavaScript in a code block**: markdown is rendered with sanitisation; no `<script>` tags survive.
- **Article body references a route that has been removed**: internal links are not validated. A 404 is possible — same as any other broken link in Ledgerly.
- **Two super-admins edit the same article simultaneously**: last-write-wins. No optimistic concurrency in V1 (see Clarifications Q18).
- **Tour key renamed**: existing completion rows become orphaned. V1 does not support tour-key renames — super-admins create a new tour and archive the old one.
- **User changes role mid-session**: tours and articles gated by role re-evaluate on next page view (role is checked server-side on each request).
- **A published article references a `page_key` that no longer maps to any route**: article still appears in search / category browse, but never in "Recommended for this page".

---

## Requirements

### Functional Requirements — Help Sheet & Header Integration

- **FR-001**: System MUST add a `?` button to the page header at `frontend/src/components/layout/page-header.tsx`, positioned between "Ask AI" and the notification bell. The button MUST render an unread-count pulse dot (blue) when the user has unread release notes.
- **FR-002**: Clicking the `?` button MUST open a right-hand drawer (the "Help Sheet") using shadcn/ui `Sheet` component. The sheet MUST be dismissible by `Escape`, by clicking outside, or by clicking a close button.
- **FR-003**: The Help Sheet MUST contain, in order: a header with "Help & Support" title and close button; a search box; a "Recommended for this page" section listing articles whose `page_keys` include the current route key; a "Recently viewed" section showing the user's last 3 opened articles; rows for "Start tour for this page" (only if a matching tour exists), "Keyboard shortcuts", "What's new (N)", and "Give feedback"; a footer link "Browse all help topics" linking to `/help`.
- **FR-004**: The `?` key global shortcut MUST continue to open the existing keyboard-shortcut overlay (no behaviour change). The Help Sheet is opened only by the header button.
- **FR-005**: The Help Sheet MUST trap focus while open and return focus to the `?` button when closed (WCAG 2.1 AA compliance).
- **FR-006**: The Help Sheet and all embedded components MUST be fully keyboard-navigable (Tab / Shift+Tab through interactive elements, Enter to activate).

### Functional Requirements — Help Articles & Categories

- **FR-007**: System MUST provide a central `help_articles` table (central, not tenant-scoped) with: id, slug (unique), title, body (markdown), category_id, page_keys (JSON array), target_roles (JSON array, nullable = all), feature_flag (nullable), status (enum: draft, published, archived), author_id, view_count (integer, default 0), created_at, updated_at, published_at (nullable).
- **FR-008**: System MUST provide a central `help_categories` table with: id, name, slug (unique), icon (lucide icon name), sort_order.
- **FR-009**: System MUST provide a central `help_article_views` table tracking per-user views with: id, user_id, article_id, viewed_at. Used for the "Recently viewed" list and view-count increment.
- **FR-010**: System MUST provide API endpoints: `GET /api/v1/help/articles` (list + filter + search), `GET /api/v1/help/articles/{slug}` (detail — increments view count), `GET /api/v1/help/categories` (list), `GET /api/v1/help/recommendations?page_key=<key>` (articles matching current page).
- **FR-011**: System MUST expose a super-admin authoring API: `POST /api/v1/admin/help/articles`, `PATCH /api/v1/admin/help/articles/{id}`, `DELETE /api/v1/admin/help/articles/{id}`, and CRUD for categories. Authorisation MUST require `is_super_admin = true`.
- **FR-012**: System MUST provide a `/help` page with: left sidebar listing categories with article counts, main panel with category landing + article list, persistent search bar, article detail view at `/help/{category-slug}/{article-slug}`.
- **FR-013**: System MUST provide a super-admin authoring UI at `/admin/help-and-support/articles` with a table of articles, category manager, and a markdown editor with live preview for creating / editing articles.
- **FR-014**: System MUST record "Was this helpful?" Yes/No votes on articles for super-admin analytics. Stored as `help_article_feedback` rows with user_id (nullable for anonymous), article_id, helpful (boolean), created_at.
- **FR-015**: Article body MUST be rendered from markdown with a strict sanitiser — no `<script>`, no inline event handlers. Links to `http(s)://` open in a new tab; internal links stay in-app.
- **FR-016**: Article search MUST be full-text across title and body, case-insensitive, with the search term highlighted in the result snippet. V1 can use PostgreSQL `tsvector` / `plainto_tsquery` (no Elasticsearch / Typesense).
- **FR-017**: Archived articles MUST be excluded from search, "Recommended for this page", and `/help` category listings, but their slug URL MUST still resolve with an "Archived" banner.

### Functional Requirements — Tours

- **FR-018**: System MUST build Eloquent models `TourDefinition` and `TourCompletion` on top of the existing migration. A follow-up migration MUST extend `tour_definitions` with `route_pattern` (string, supports `:param` wildcards like `/invoices/:id`) and `scope` (enum: `user` | `workspace`, default `workspace`), and make `tour_completions.workspace_id` **nullable** so `scope = user` completions can persist without a workspace context.
- **FR-019**: System MUST provide a `useTour(pageKey)` React hook that: fetches tours matching the current route, filters by the user's role and active feature flags, filters out tours the user has already completed (scoped per `tour_definitions.scope`), and auto-starts the highest-priority matching tour if `trigger = first-visit`.
- **FR-020**: Tour auto-start MUST wait for the target selector of step 1 to exist in the DOM (max 2 seconds) before firing. If the selector never appears, the tour is silently skipped.
- **FR-021**: Tours MUST support the following step attributes: target (CSS selector or `data-tour-target` slug), title, body (markdown), placement (top/bottom/left/right/auto), spotlight padding.
- **FR-022**: Completing or skipping a tour MUST write a `tour_completions` row with user_id, tour_key, completed_at, and workspace_id. `workspace_id` is set only when `tour_definitions.scope = 'workspace'`; it is NULL for `scope = 'user'`. The unique constraint MUST support both cases (unique on `(user_id, tour_key, workspace_id)` with NULL-safe handling, or a partial index per scope).
- **FR-023**: System MUST expose `GET /api/v1/tours?route=<route>` returning tours matching the current route, filtered by role and feature flag, minus completed tours. Also `POST /api/v1/tours/{key}/complete` to write a completion row.
- **FR-024**: System MUST provide a super-admin authoring UI at `/admin/help-and-support/tours` with a table of tours and a step editor (add / reorder / remove steps, preview tour).
- **FR-025**: Tours MUST be abortable by `Escape` key; aborting writes a completion row (prevents re-fire).
- **FR-026**: The help sheet MUST surface a "Start tour for this page" row whenever a matching tour exists, regardless of completion status. Clicking the row starts the tour (does not write a duplicate completion row — already present).
- **FR-027**: The tour runtime MUST use **driver.js**, wrapped in the `useTour()` hook so the underlying library remains swappable without touching callers.
- **FR-027a**: `tour_definitions` MUST include a `scope` column — values `user` (completion persists globally for the user) or `workspace` (completion persists per user per workspace). Default: `workspace`.
- **FR-027b**: System MUST seed a **first-login onboarding sequence** of `scope = user` tours (e.g. `onboarding.welcome`, `onboarding.sidebar`, `onboarding.shortcuts`) that plays in priority order the first time a user authenticates, chainable but abortable as a whole.
- **FR-027c**: A **first-workspace-visit sequence** of `scope = workspace` tours (e.g. `entity.chart-of-accounts`, `entity.bank-feed`, `entity.first-invoice`) MUST play the first time the user lands on a newly-accessible workspace, ordered by priority, individually skippable.

### Functional Requirements — What's New (Release Notes)

- **FR-028**: System MUST provide a central `release_notes` table with: id, title, body (markdown), category (enum: new, improved, fixed), published_at, image_url (nullable), cta_url (nullable), cta_label (nullable), created_at, updated_at.
- **FR-029**: System MUST add a `last_seen_release_at` timestamp column to the `users` table (central, nullable).
- **FR-030**: System MUST expose `GET /api/v1/help/release-notes` returning published release notes sorted by `published_at DESC`. Response MUST include `unread_count` for the current user (count of notes with `published_at > user.last_seen_release_at`).
- **FR-031**: Opening the What's New feed MUST update `user.last_seen_release_at = now()` server-side.
- **FR-032**: System MUST provide a super-admin authoring UI at `/admin/help-and-support/release-notes` to create / edit / publish / delete release notes.
- **FR-033**: [NEEDS CLARIFICATION Q6] — Are release notes optionally pushed as notifications (024-NTF), or silent in-app only?

### Functional Requirements — Feedback Capture

- **FR-034**: System MUST provide a central `user_feedback` table with: id, user_id, workspace_id (nullable), category (enum: bug, idea, question, other), body, url, user_agent, screenshot_path (nullable, S3), status (enum: new, triaged, resolved), created_at, triaged_at (nullable), triaged_by (nullable user_id), resolved_at (nullable), resolution_note (nullable).
- **FR-035**: System MUST expose `POST /api/v1/help/feedback` (authenticated users) accepting category, body, url, screenshot (multipart upload via 012-ATT). Returns 201 on success.
- **FR-036**: Feedback submission MUST auto-capture `user_id`, `workspace_id` (from workspace context middleware), `user_agent` (from request header).
- **FR-037**: Screenshot uploads MUST be limited to PNG/JPG/WebP, max 5MB, virus-scanned if the 012-ATT pipeline supports it.
- **FR-038**: System MUST provide a super-admin triage UI at `/admin/help-and-support/feedback` with filters (status, category, date range) and actions (mark triaged, mark resolved, add resolution note).
- **FR-039**: [NEEDS CLARIFICATION Q10] — Does submitted feedback optionally forward to Linear / Slack?

### Functional Requirements — Targeting & Personalisation

- **FR-040**: "Recommended for this page" in the help sheet MUST match articles by `page_keys` intersecting with the current route key. The current route key is derived via an **explicit per-page registry** — each page registers its key via a `<HelpPageKey value="invoices.detail" />` component or a `useHelpPageKey('invoices.detail')` hook. Pages without a registered key fall back to the normalised pathname.
- **FR-041**: Articles, tours, and release notes MUST honour `target_roles` — a user only sees items whose `target_roles` is null (all) or includes at least one of their workspace roles.
- **FR-042**: Articles, tours, and release notes MUST honour `feature_flag` — items with a flag only surface when the flag is active for the user / workspace via Laravel Pennant.

### Functional Requirements — Permissions & Access

- **FR-043**: Help articles, categories, release notes are READABLE by any authenticated user subject to role/flag gating.
- **FR-044**: Help article/category/tour/release-note/feedback-triage WRITES are gated by a new Spatie permission **`help.manage`**, seeded to super-admin roles on migration. Forward-compatible with non-admin content editors later (no code change needed — just grant the permission).
- **FR-045**: Feedback submission is allowed for any authenticated user.
- **FR-046**: [NEEDS CLARIFICATION Q15] — Is any help content visible to unauthenticated users at `/help`?

### Functional Requirements — Analytics & Observability

- **FR-047**: System MUST track article view counts, tour completion counts, and release-note open rates in-DB.
- **FR-048**: [NEEDS CLARIFICATION Q9] — Are analytics additionally pushed to PostHog / an external tool?
- **FR-049**: Missing-tour-target warnings MUST be logged to a super-admin-visible log (a `tour_diagnostics` table or the Laravel log channel is acceptable).

### Functional Requirements — Accessibility

- **FR-050**: Help Sheet, article detail, `/help`, admin UIs, and tour overlay MUST meet WCAG 2.1 AA:
  - Focus trap in modal/sheet/tour popover
  - ESC closes sheet/modal/tour
  - ARIA labels on icon-only buttons
  - Visible focus ring on all interactive elements
  - Tour spotlight overlay has `role="dialog"` and announces step content via ARIA live region
  - Screen-reader-only headings for sheet sections
  - Keyboard-only navigation must complete every user flow (open help, search, read article, submit feedback, complete tour)

### Functional Requirements — Seed Content

- **FR-051**: V1 MUST ship with at least 15 seeded help articles covering: Getting Started (account setup, workspace switch), Invoicing (create, send, record payment, void), Banking (connect feed, reconcile, rules), Journal Entries (create, approve, reverse), AI Assistant (what it does, how to ask), Practice (invite firm, switch context), Reports (P&L, Balance Sheet).
- **FR-052**: V1 MUST ship with at least 5 seeded tours covering: Dashboard orientation, Intray first look, Invoices first look, Banking reconciliation first look, AI chatbot intro.

### Key Entities

- **HelpArticle** — Published in-product article. Fields: slug, title, body (markdown), category, page_keys (JSON), target_roles (JSON), feature_flag, status, view_count, author, timestamps. Central table. **Content model (Q4)**: articles are seeded from markdown files in `database/seeders/content/help/*.md` via `HelpContentSeeder`; DB rows are authoritative once seeded and can be edited via the admin UI without file changes. A follow-up deploy that touches the markdown files re-seeds only articles whose slug does not yet exist in the DB (never overwrites live edits).
- **HelpCategory** — Grouping for articles. Fields: slug, name, icon, sort_order. Central table.
- **HelpArticleView** — Per-user view record for recency. Fields: user, article, viewed_at. Central table.
- **HelpArticleFeedback** — "Was this helpful?" votes. Fields: user (nullable), article, helpful (bool), created_at. Central table.
- **TourDefinition** — Authorable tour. Fields (existing + NEW): key, title, description, steps (JSON), target_roles (JSON), feature_flag, is_active, priority, trigger (`first-visit` / `manual`), **`route_pattern`** (NEW — supports `:param` wildcards), **`scope`** (NEW — `user` or `workspace`, default `workspace`). Central table.
- **TourCompletion** — Per user/workspace/tour record. Fields: user, tour_key, **workspace (nullable — NEW)**, completed_at. NULL workspace_id indicates a `scope = user` completion.
- **ReleaseNote** — Authorable release entry. Fields: title, body (markdown), category (new/improved/fixed), published_at, image_url, cta_url, cta_label. Central table.
- **UserFeedback** — Structured feedback. Fields: user, workspace (nullable), category, body, url, user_agent, screenshot_path, status, triage metadata. Central table.
- **last_seen_release_at** — Column added to `users` table for unread badge state.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: 60% of users who open the help sheet find and open an article (measured weekly via help_article_view records / help_sheet_open events).
- **SC-002**: Tours complete (not skipped) for at least 50% of first-visit triggers (measured via `tour_completions.completed_at` — we treat ESC/Skip as "skipped" via a separate column if needed).
- **SC-003**: 30% reduction in "how do I…" direct-message volume to the founder within 8 weeks of launch (qualitative, tracked by Will and practice-manager feedback).
- **SC-004**: "What's New" feed open rate ≥ 40% within 7 days of a release note publishing (measured via `user.last_seen_release_at` updates post-publish).
- **SC-005**: User feedback submission volume ≥ 10 entries per week in the first month (indicates discovery).
- **SC-006**: Zero accessibility critical / serious violations on the help sheet, article view, and tour overlay per axe-core audit.
- **SC-007**: Help sheet opens in <200ms from `?` click to visible render (P95, measured via browser perf marks).
- **SC-008**: Help article search returns results in <300ms for queries with 3+ characters (P95, measured server-side).
- **SC-009**: Tour auto-start fires within 500ms of route entry when the target selector is present in the DOM at page-load time.
- **SC-010**: 15 help articles and 5 tours are live on day 1 of release.

---

## Clarifications

The following decisions must be resolved before or during design. Each is numbered for traceability.

### Category 1 — Content Model & Storage (Q1–Q4)

- **Q1**: Is `/help` public (no auth required) or authenticated-only?
  - Options: (a) Public — SEO benefit, acquisition funnel; (b) Authenticated-only — simpler; (c) Authenticated-only V1, revisit V2.
  - Recommendation: **(c)** — authenticated-only V1 to avoid SEO and content-review overhead; revisit once we have 50+ articles.

- **Q2**: Tour library — which do we adopt?
  - Options: (a) [driver.js](https://driverjs.com/) — minimal, 5kb, headless-ish; (b) [react-joyride](https://react-joyride.com/) — popular, React-idiomatic; (c) [shepherd.js](https://shepherdjs.dev/) — featureful, TippyJS-backed; (d) custom (build our own over Radix Popover).
  - Recommendation: **(a) driver.js** — smallest, least opinionated; thin wrapper in `useTour()` keeps it swappable.

- **Q3**: How is the current route's `page_key` derived for "Recommended for this page"?
  - Options: (a) Literal URL path (`/invoices/123` → `invoices.123` — needs normalisation); (b) Normalised pathname segments (`/invoices/[id]` → `invoices.detail`); (c) Explicit per-page registry the developer writes (`<HelpPageKey value="invoices.detail">`).
  - Recommendation: **(c)** — explicit registry via a small `<HelpPageKey>` component or `useHelpPageKey()` hook per page. Most accurate, zero heuristic failure.

- **Q4**: Content source of truth — DB only, or DB + markdown-in-repo seeding?
  - Options: (a) DB only — edits are live via admin UI; (b) Markdown-in-repo seeded into DB on deploy — git history for content; (c) Hybrid — seeded markdown as defaults, DB edits override.
  - Recommendation: **(c)** — seed markdown files into the DB from `database/seeders/HelpContentSeeder.php`; DB edits persist. Gives git history AND live editing.

### Category 2 — Targeting & Scope (Q5–Q7)

- **Q5**: Per-practice custom articles / tours?
  - Options: (a) V1 super-admin only; (b) V1 practices can author their own articles with a `practice_id`.
  - Recommendation: **(a)** — V1 super-admin only. Defer practice-custom help until a practice explicitly asks.

- **Q6**: Release notes as notifications?
  - Options: (a) Silent — unread badge only; (b) Always push to 024-NTF; (c) Author decides per-note with a "Notify users" checkbox.
  - Recommendation: **(c)** — author decides per release note. Most flexibility; no noise by default.

- **Q7**: Should articles support "last updated" indicators to users?
  - Options: (a) No — hide; (b) Yes, always; (c) Yes, only if updated in last 30 days.
  - Recommendation: **(b)** — always show. Builds trust in content freshness.

### Category 3 — Tours (Q8–Q12)

- **Q8**: Tour `route_pattern` syntax?
  - Options: (a) Exact string (`/intray`); (b) Prefix (`/invoices` matches `/invoices`, `/invoices/123`, etc.); (c) Glob (`/invoices/*`); (d) Path + per-segment wildcards (`/invoices/:id`).
  - Recommendation: **(d)** — path with `:param` wildcards. Most Next-idiomatic.

- **Q9**: Does `useTour()` auto-advance steps on target click, or always require "Next"?
  - Options: (a) Always require Next — explicit; (b) Auto-advance on target click; (c) Per-step option in the authoring UI.
  - Recommendation: **(c)** — author picks per step; default is "Next".

- **Q10**: Tour step target inside a collapsed parent (e.g. a closed popover or accordion) — behaviour?
  - Options: (a) Auto-expand the parent if we can detect it; (b) Skip the step with a warning; (c) Wait with a loading indicator.
  - Recommendation: **(b)** — skip gracefully, warn super-admins. Auto-expanding is fragile.

- **Q11**: Can users globally opt out of tours via a setting?
  - Options: (a) Yes — user preference `disable_tours`; (b) No — tours are valuable and already skippable per-tour.
  - Recommendation: **(b)** — no global opt-out. Tours are already skippable and only fire once.

- **Q12**: Tour completion scope when workspace_id is null (super-admin, practice-shell pages)?
  - Options: (a) Use workspace_id = 0 placeholder; (b) Make workspace_id nullable in `tour_completions`; (c) Create a synthetic "global" workspace row.
  - Recommendation: **(b)** — make workspace_id nullable via a follow-up migration. Simplest semantically.

### Category 4 — Feedback & Triage (Q13–Q16)

- **Q13**: Does submitted feedback route anywhere outside the DB?
  - Options: (a) DB only V1; (b) DB + optional Linear issue creation; (c) DB + Slack webhook; (d) DB + both.
  - Recommendation: **(a)** — DB only V1. Add Linear integration once we know volume and triage patterns.

- **Q14**: Can users see their own past feedback submissions?
  - Options: (a) No; (b) Yes, in a "My feedback" tab in the help sheet; (c) Only if an admin marks the submission with a public reply.
  - Recommendation: **(a)** — no in V1. Keeps model simple; revisit once triage volume is known.

- **Q15**: Offline feedback submission — queue or fail?
  - Options: (a) Fail with "You're offline"; (b) Queue in localStorage, retry when online; (c) Not applicable (Ledgerly requires online).
  - Recommendation: **(c)** — Ledgerly is online-only; surface the network error.

- **Q16**: Screenshot feature — native browser capture API or user-provided file only?
  - Options: (a) User-provided file only (simple); (b) Native `getDisplayMedia()` / clipboard-paste support; (c) Both.
  - Recommendation: **(c)** — both: file upload + paste from clipboard (very cheap to add, delightful UX).

### Category 5 — Permissions & Roles (Q17–Q19)

- **Q17**: Super-admin-only vs introduce a `help.manage` Spatie permission?
  - Options: (a) Gate on `is_super_admin` V1; (b) Introduce `help.manage` permission now; (c) Introduce it AND seed it to super-admin only.
  - Recommendation: **(c)** — introduce the permission, seed to super-admin only. Cleanest forward path when we later want content editors who are not super-admins.

- **Q18**: Concurrency control on article / tour edits?
  - Options: (a) Last-write-wins; (b) Optimistic concurrency via `updated_at` check; (c) Full row locking.
  - Recommendation: **(b)** — optimistic concurrency. Detect staleness, show a conflict modal. Inexpensive and protects super-admin work.

- **Q19**: Target roles — workspace-scoped or include practice-shell / super-admin roles too?
  - Options: (a) Workspace roles only (owner, accountant, bookkeeper, approver, auditor, client); (b) Workspace + practice roles; (c) Workspace + practice + super-admin.
  - Recommendation: **(b)** — include practice portal users. Super-admin help is tiny V1.

### Category 6 — Release Notes (Q20–Q22)

- **Q20**: Can release notes be deep-linked externally (e.g. shared on Twitter / changelog page)?
  - Options: (a) In-app only V1; (b) Public `/changelog` page later; (c) Per-note public/private toggle.
  - Recommendation: **(b)** — defer public changelog to V2, flag the schema for it.

- **Q21**: Release note body — images only or embedded video support?
  - Options: (a) Images only V1; (b) Images + YouTube/Loom embed; (c) Images + self-hosted video.
  - Recommendation: **(b)** — images + external video embed (YouTube, Loom). No self-hosted video.

- **Q22**: Release note unread badge — does it persist across devices?
  - Options: (a) Per-device (localStorage); (b) Per-user server-side (`last_seen_release_at`).
  - Recommendation: **(b)** — per-user server-side (already in FR-029).

### Category 7 — Search (Q23–Q24)

- **Q23**: Search backend — DB full-text or external?
  - Options: (a) PostgreSQL `tsvector` V1; (b) Typesense / Meilisearch immediately; (c) Start with Postgres, migrate when content > 200 articles.
  - Recommendation: **(c)** — start with Postgres, plan migration path. Likely never needed at Ledgerly scale.

- **Q24**: Search scope — articles only, or include tour titles and release notes?
  - Options: (a) Articles only V1; (b) Articles + release notes; (c) Articles + release notes + tour titles.
  - Recommendation: **(b)** — articles + release notes. Release notes are often "how do I use the new thing" content.

### Category 8 — Authoring UX (Q25–Q27)

- **Q25**: Article body editor — plain markdown textarea or WYSIWYG?
  - Options: (a) Plain markdown with live preview (2-pane); (b) WYSIWYG (TipTap); (c) Notion-like block editor.
  - Recommendation: **(a)** — markdown with live preview. Already what CLAUDE.md conventions expect; cheapest.

- **Q26**: Can super-admins preview an article as a specific role (impersonation-style)?
  - Options: (a) No — preview as current user; (b) Yes — role selector in preview pane.
  - Recommendation: **(b)** — role selector (simple: show/hide based on target_roles filter). Authors need to validate gating.

- **Q27**: Does the authoring UI support draft saves without publishing?
  - Options: (a) No — one save, goes live; (b) Yes — status = draft / published; (c) Yes, with scheduled-publish date.
  - Recommendation: **(b)** — draft/published (covered in FR-007). Scheduled publish is future.

### Category 9 — Integration & Ecosystem (Q28–Q30)

- **Q28**: AI chatbot (020-AIB) integration — should help articles feed the chatbot as context?
  - Options: (a) No V1 — isolated systems; (b) Yes — articles included in chatbot RAG; (c) Phase 2 after we have 30+ articles.
  - Recommendation: **(c)** — defer to after launch. Helps once content depth justifies the RAG complexity.

- **Q29**: Admin Intray vs dedicated admin pages for super-admin work (feedback triage, content moderation)?
  - Options: (a) Dedicated `/admin/help-and-support/articles`, `/admin/help-and-support/tours`, `/admin/help-and-support/feedback`, `/admin/help-and-support/release-notes`; (b) Unified under a new "Help Admin" section in the existing `(admin)` area.
  - Recommendation: **(b)** — unified under `(admin)/help-and-support/` with sub-routes. Follows existing admin UI patterns.

- **Q30**: Should the `?` button ever surface proactive nudges (e.g. "It looks like you're trying to reconcile — here's an article")?
  - Options: (a) No — user-initiated only V1; (b) Yes — contextual nudges based on user behaviour; (c) Deferred to AI chatbot (020-AIB).
  - Recommendation: **(a)** — user-initiated V1. Proactive nudges are the AI chatbot's job.

### Category 10 — Migration & Rollout (Q31–Q32)

- **Q31**: Do we gate the entire feature behind a Pennant flag for phased rollout?
  - Options: (a) No — ship globally; (b) Yes — Pennant `help-center` flag, enable progressively; (c) Gate tours only (highest-risk UX surface).
  - Recommendation: **(c)** — gate tours specifically. Articles / What's New / feedback are low-risk.

- **Q32**: What happens to the 075-FTS epic in meta.yaml?
  - Options: (a) Mark absorbed by 078-HSP and archive; (b) Leave alone; (c) Delete 075-FTS folder.
  - Recommendation: **(a)** — mark absorbed, keep the folder for history, add a note in its meta.yaml pointing to 078-HSP.

### Category 11 — User Onboarding & Tour Scope (Q33)

- **Q33**: Tour completion scope — per-user globally, or per-user-per-workspace?
  - Context: a user may own or access multiple workspaces. Product-level tours (e.g. "Welcome to Ledgerly", "How the sidebar works") should only show once ever per user. Entity-setup tours (e.g. "Set up your chart of accounts", "Connect your first bank feed") should show once per workspace — each new entity gets its own onboarding.
  - Options:
    - (a) Keep the existing `(user_id, tour_key, workspace_id)` unique key — all tours are per-workspace. Product tours re-fire on every new workspace.
    - (b) Flip to `(user_id, tour_key)` — all tours are per-user. Entity setup tours only show for the first workspace.
    - (c) Add a `scope` column on `tour_definitions` (`user` | `workspace`, default `workspace`). `tour_completions` keys on `(user_id, tour_key)` when scope=`user`, and `(user_id, tour_key, workspace_id)` when scope=`workspace`. Introduce a first-login onboarding sequence composed of `user`-scoped tours.
  - Recommendation: **(c)** — per-tour scope. Most flexible, matches real user journeys.

---

### Session 2026-04-19 — Decisions

Answered by: Will Whitelaw

| # | Answer | Notes |
|---|--------|-------|
| Q2 | (a) driver.js | Wrap in `useTour()` hook so swappable |
| Q3 | (c) Explicit per-page registry | `<HelpPageKey value="invoices.detail">` component or `useHelpPageKey()` hook |
| Q4 | (c) Hybrid — markdown seed + DB edits | `database/seeders/HelpContentSeeder.php`; DB edits persist |
| Q8 | (d) Path + `:param` wildcards | Next-idiomatic |
| Q10 | (b) Skip with warning | Auto-expand is fragile |
| Q12 | (b) Nullable `workspace_id` on `tour_completions` | Follow-up migration |
| Q17 | (c) Introduce `help.manage` permission | Seeded to super-admin only initially |
| Q29 | (b) Unified `(admin)/help-and-support/` with sub-routes | |
| Q33 | (c) Per-tour `scope` column (`user` \| `workspace`) | Adds first-login onboarding sequence composed of `user`-scoped tours |

**Still open** — non-blocking, can be answered during design or early dev: Q1, Q5–Q7, Q9, Q11, Q13–Q16, Q18–Q28, Q30–Q32.

---

## Dependencies

| Direction | Epic | Relationship |
|-----------|------|-------------|
| **Depends on** | 012-ATT Attachments (complete) | S3 pipeline for feedback screenshots and article images |
| **Depends on** | 024-NTF Notifications (complete) | Optional push of release notes as notifications (Q6) |
| **Depends on** | 009-BIL / Laravel Pennant (complete) | Feature-flag gating for tours and articles |
| **Absorbs** | 075-FTS Feature Tour Stepper | Migration-only stub; this epic builds the rest |
| **Integrates with** | 020-AIB AI Assistant (partial) | Future: help articles as RAG context for the chatbot (Q28) |
| **Integrates with** | 003-AUT Auth & Multi-tenancy (complete) | `is_super_admin` flag; workspace context for feedback |
| **Uses** | Header `?` button — currently does not exist; to be added to `frontend/src/components/layout/page-header.tsx` | |
| **Uses** | Existing keyboard-shortcut overlay at `frontend/src/components/layout/keyboard-shortcuts-overlay.tsx` | Surfaced as a row inside the help sheet |

---

## Notes

- The 075-FTS epic is being explicitly absorbed: meta.yaml of 075-FTS should be updated to `status: absorbed` with a `successor: 078-HSP` note (captured in Q32).
- Where NEEDS CLARIFICATION markers appear inline in FRs, the Clarifications section above is authoritative — the marker is a pointer, not a blocker. Design can begin once Q1–Q4 and Q8–Q10 are resolved; the rest can be resolved during design.
- Accessibility is a first-class requirement (FR-050 and SC-006). A dedicated a11y audit sweep at the end of Sprint 4 is non-negotiable.
