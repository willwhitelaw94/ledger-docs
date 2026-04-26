---
title: "Dev Handover: 078-HSP Help & Support (Frontend)"
---

# Dev Handover — 078-HSP Help & Support

**Branch**: `feature/cherry-on-top` (shared branch)
**Author**: Claude dev agent
**Session**: 2026-04-19
**Status**: P0 complete, P1 partial (Articles + Feedback admin done; Tours + Release Notes stubs only)

---

## What Shipped

### Priority 0 — End-user surfaces (complete)

All P0 surfaces are in and wired to existing backend endpoints. Backend was
already tested (40 Pest tests green) — no backend changes required for P0.

| Surface | Key files | Status |
|---------|-----------|--------|
| Header `?` button | `frontend/src/components/help/help-sheet-trigger.tsx` + `components/layout/page-header.tsx` | Done — unread pulse dot when release notes are unread |
| Help sheet (right drawer) | `components/help/help-sheet.tsx` | Done — search (debounced 150ms), recommended + recently viewed, rows for tour / shortcuts / what's new / feedback, footer link to `/help` |
| Article inline view | `components/help/article-view.tsx` + `components/help/article-markdown.tsx` | Done — markdown via `react-markdown` + `rehype-sanitize` (FR-015), "Was this helpful?" Yes/No, archived banner |
| Feedback modal | `components/help/feedback-modal.tsx` + `stores/feedback-modal.ts` | Done — category chips, 10-char min body, screenshot drop/paste/pick, auto-captured URL, `Cmd/Ctrl+Enter` submit |
| What's New feed | `components/help/whats-new-feed.tsx` | Done — expandable notes, YouTube + Loom embed detection, auto mark-seen |
| `/help` page | `app/(dashboard)/help/page.tsx` + `help-center-client.tsx` | Done — category nav, article list, article detail with breadcrumbs |
| Tour engine | `components/tours/tour-provider.tsx` + `stores/tour.ts` + `hooks/use-tours.ts` | Done — driver.js wrapped; auto-start for `first-visit` tours with 2s selector wait (FR-020); themed to match design tokens in both light and dark mode |

### Priority 1 — Admin surfaces (partial)

| Surface | Files | Status |
|---------|-------|--------|
| Admin shell + tab nav | `app/(admin)/admin/help-and-support/layout.tsx` + sidebar link in `components/admin/admin-sidebar.tsx` | Done |
| **Admin Articles list** | `app/(admin)/admin/help-and-support/articles/page.tsx` | Done — filters by status + category, search, click-through to editor |
| **Admin Articles editor** | `app/(admin)/admin/help-and-support/articles/article-editor.tsx` + `[id]/page.tsx` + `new/page.tsx` | Done — 2-pane markdown editor with live preview, category picker, page keys, target roles, feature flag, publish/archive/delete actions |
| **Admin Feedback triage** | `app/(admin)/admin/help-and-support/feedback/page.tsx` | Done — status tabs with counts, filterable list, side panel for triage with resolution note |
| Admin Tours authoring | `app/(admin)/admin/help-and-support/tours/page.tsx` | **Stub** — deferred to V2; explains seeder-based authoring path for V1 |
| Admin Release Notes authoring | `app/(admin)/admin/help-and-support/release-notes/page.tsx` | **Stub** — same rationale |

### Backend changes (P1)

Three new super-admin controllers added, gated by the existing `super_admin`
middleware. Routes registered under `/api/v1/admin/help/*`:

| Controller | File | Endpoints |
|------------|------|-----------|
| `HelpArticleAdminController` | `app/Domains/Platform/Http/Controllers/Admin/` | `GET/POST/PATCH/DELETE articles`, `POST articles/{id}/publish`, `POST articles/{id}/archive` |
| `HelpCategoryAdminController` | same | `GET/POST/PATCH/DELETE categories` |
| `UserFeedbackAdminController` | same | `GET feedback`, `GET feedback/counts`, `GET/PATCH feedback/{id}` |

`UserFeedbackResource` was extended to expose `user`, `workspace`, `triaged_by`
relations when loaded (previously only scalars). Backward compatible — public
feedback endpoints don't load those relations so the shape stays the same there.

### Infrastructure changes

| Change | Location | Notes |
|--------|----------|-------|
| `driver.js` installed | `frontend/package.json` | 1.3.7 |
| `react-markdown`, `rehype-sanitize`, `remark-gfm` | `frontend/package.json` | For article + release-note body rendering |
| Dashboard layout mounts HelpSheet / FeedbackModal / TourProvider | `frontend/src/app/(dashboard)/layout.tsx` | Single mount point for every authed route |
| Page header `?` button | `frontend/src/components/layout/page-header.tsx` | Dynamic import (SSR disabled) — kept `page-leading` store untouched |
| driver.js theme CSS | `frontend/src/app/globals.css` (appended) | Dark-mode compliant — uses `var(--popover)`, `var(--primary)` etc |
| Admin sidebar nav entry | `frontend/src/components/admin/admin-sidebar.tsx` | "Help & Support" entry under Administration |

---

## Locked Decisions — Honoured

- Tour library: **driver.js**, wrapped in `TourProvider` (FR-027)
- Route-key derivation: **explicit `<HelpPageKey>`** — `help.index` set on the help center landing page
- Admin permission check: enforced by `super_admin` middleware at route layer + `useAuth.is_super_admin` guard at `(admin)` layout layer (FR-011, FR-044)
- Tour scope: server-side filtering — hook consumes `/tours?route=`

## Ambiguities Resolved

| Question | Resolution | Reason |
|----------|-----------|--------|
| `Cmd/Ctrl + /` global shortcut for help sheet | **Not wired** | `Cmd/Ctrl + /` is already bound to AI Assistant toggle (CLAUDE.md global). Introducing a conflicting binding would break existing shortcut. Header button is sufficient; a future dedicated shortcut (e.g. `Cmd/Ctrl + .` or `G then H`) can be added without collision. |
| Screenshot upload for feedback | **UI-only in V1** | Feedback always submits `screenshot_attachment_id: null`. The UI affordance (file picker + paste + drop + preview) is present and working. Wiring the actual S3 upload requires either a two-phase commit on `user_feedback` or a new pending-upload endpoint — deferred to a follow-up. |
| `resolution_note` form of update | Stored whenever status → resolved | Kept simple: no separate endpoint for note-without-status. |

---

## Quality Gates

| Check | Status | Notes |
|-------|--------|-------|
| TypeScript strict (my code) | **PASS** | `npx tsc --noEmit` clean for every new file. 16 pre-existing errors in `scenarios/*` remain — untouched by this branch. |
| ESLint (my code) | **PASS** | Only two warnings in my code, both from `useForm().watch()` in `feedback-modal.tsx` and `article-editor.tsx` — a known React-Compiler / react-hook-form compatibility notice that exists throughout the codebase. No errors. |
| Backend tests | **PASS** | `php artisan test --filter="Help\|Feedback\|Tour"` — 40 passing (133 assertions). No regressions. |
| `next build` | **BLOCKED BY PRE-EXISTING** | Build fails on pre-existing JSX syntax errors in `scenarios/[uuid]/page.tsx`, `scenarios/new/page.tsx`, `scenarios/page.tsx`. My files compile. Flagged for a separate fix. |
| Dark mode | **PASS** | All surfaces rely on `var(--*)` tokens; driver.js popover CSS uses `color-mix` for hover state on primary. |
| Accessibility spot-checks | **PASSABLE** | Focus trap via shadcn Sheet/Dialog defaults; ESC bound; ARIA labels on all icon-only buttons; search inputs labelled; screen-reader-only sheet title; kbd tags semantic. Full axe-core sweep deferred — see P2 below. |

---

## Priority 2 — Deferred

| Item | Reason | Planned home |
|------|--------|-------------|
| Seeded markdown content (5+ articles per category) | Content authoring is a follow-up. The admin editor ships in P1 so content can be authored in the UI. | `database/seeders/content/help/*.md` + existing `HelpContentSeeder` |
| axe-core automated sweep | Not integrated in this pass — manual accessibility review only | Add to `frontend/e2e/` as a Playwright test |
| Global keyboard shortcut for help sheet | Collides with existing Cmd+/ binding; no consensus yet on alternative | Either `Cmd+.` or `G then H` via `use-keyboard-shortcuts.ts` |
| Admin Tours + Release Notes authoring UI | Scope/time trade-off. V1 seeds cover the highest-value tours; admin UI can wait. | Same `admin/help-and-support/{tours,release-notes}/` routes — stubs are already in place |
| Screenshot upload in feedback | Needs two-phase commit OR pending-upload endpoint | Small follow-up; UI is already built |

---

## File Inventory

### New frontend files

```
frontend/src/components/help/
├── help-sheet.tsx              — Right drawer (shadcn Sheet)
├── help-sheet-trigger.tsx      — `?` button in page header
├── help-page-key.tsx           — (existed) Route-key registration
├── article-view.tsx            — Inline article reader
├── article-markdown.tsx        — Sanitised markdown renderer
├── whats-new-feed.tsx          — Release notes feed w/ embed support
└── feedback-modal.tsx          — Feedback modal (shadcn Dialog)

frontend/src/components/tours/
└── tour-provider.tsx           — driver.js wrapper + auto-start

frontend/src/stores/
├── feedback-modal.ts           — Open/close state
├── tour.ts                     — Active tour state
├── help-sheet.ts               — (existed) Sheet state
└── help-page-key.ts            — (existed) Route key registry

frontend/src/hooks/
├── use-help.ts                 — (existed) TanStack Query hooks for public help API
├── use-tours.ts                — TanStack Query hooks for tours
└── use-admin-help.ts           — Admin CRUD hooks

frontend/src/app/(dashboard)/help/
├── page.tsx                    — Server component wrapper
└── help-center-client.tsx      — Full /help page

frontend/src/app/(admin)/admin/help-and-support/
├── layout.tsx                  — Tab nav
├── page.tsx                    — Redirect → articles
├── articles/
│   ├── page.tsx                — List
│   ├── article-editor.tsx      — Shared editor component
│   ├── [id]/page.tsx           — Edit route
│   └── new/page.tsx            — Create route
├── tours/page.tsx              — STUB
├── release-notes/page.tsx      — STUB
└── feedback/page.tsx           — Triage list + detail panel
```

### Modified frontend files

- `frontend/src/components/layout/page-header.tsx` — adds dynamic HelpSheetTrigger
- `frontend/src/app/(dashboard)/layout.tsx` — mounts HelpSheet, FeedbackModal, TourProvider
- `frontend/src/components/admin/admin-sidebar.tsx` — adds Help & Support nav entry
- `frontend/src/app/globals.css` — appends driver.js theme

### New backend files

```
app/Domains/Platform/Http/Controllers/Admin/
├── HelpArticleAdminController.php    — CRUD + publish/archive
├── HelpCategoryAdminController.php   — CRUD
└── UserFeedbackAdminController.php   — Triage
```

### Modified backend files

- `routes/api.php` — adds `/admin/help/*` route group
- `app/Http/Resources/Help/UserFeedbackResource.php` — exposes user/workspace/triaged_by when loaded

---

## Manual Verification

```bash
# 1. Frontend dev server
cd frontend && npm run dev   # port 3001

# 2. Backend
php artisan serve   # or herd

# 3. Login as admin@ledgerly.app / password
```

Then:

- On any dashboard page, click the `?` icon in the top bar (between Ask AI and the bell).
- Type in the search — with seeded content, results appear.
- Click "Give feedback" — the modal opens; submit lands a `user_feedback` row.
- Click "What's new" — switches to the release-notes feed.
- Visit `/help` — category nav + list + detail.
- Visit `/admin/help-and-support/articles` (super-admin only) — list + create.
- Visit `/admin/help-and-support/feedback` — triage table.

### Example screenshots (live URLs — not checked-in images)

- Help sheet: `http://localhost:3001/invoices` → click `?`
- Help center: `http://localhost:3001/help`
- Admin articles: `http://localhost:3001/admin/help-and-support/articles`
- Admin feedback: `http://localhost:3001/admin/help-and-support/feedback`

---

## Known Issues / Follow-Ups

1. **Screenshot upload for feedback** — UI-only in this pass. Wire S3 via 012-ATT pipeline in a follow-up.
2. **`next build` blocked by scenarios** — pre-existing JSX errors in `scenarios/[uuid]/page.tsx`, `scenarios/new/page.tsx`, `scenarios/page.tsx`. Not in this epic's scope — flag for owner of 068-SPE.
3. **Admin Tours authoring** — stub only. V1 tours are seeder-authored. Follow-up can lift the existing `TourSeeder` pattern into a step-editor UI.
4. **Admin Release Notes authoring** — same rationale; stub only.
5. **axe-core sweep** — deferred to a separate accessibility pass. Manual spot-checks are clean (focus trap, ESC, ARIA labels, keyboard navigation all verified).
6. **Seed content** — V1 ships with whatever `HelpContentSeeder` already produces. Founder or super-admin should author 5+ articles per category via the new admin UI once content is ready.

---

## Gate 4 Self-Assessment

| Check | Status |
|-------|--------|
| Tests pass | ✅ 40 backend tests passing |
| Coverage | (Not measured — this is frontend-heavy) |
| TypeScript strict | ✅ No `any`, no `@ts-ignore` introduced |
| Linting clean | ✅ No errors in new code (only React-Compiler warnings on `useForm().watch()`) |
| Acceptance criteria | Partial — P0 user stories 1, 2, 3, 4 (tour runtime), 5, 6, 9 are covered. US7 (article authoring) is covered in P1. US8 (tour authoring) deferred. US10 (orientation tour) depends on seeded orientation tour content. |
| No hardcoded business logic in React | ✅ All rules come from API (role, flag, page key filtering all server-side) |
| Forms use React Hook Form + Zod | ✅ feedback-modal + article-editor |
| Server/client components | ✅ `/help` page shell is Server Component; client surfaces are `'use client'` |
| API client typed | ✅ `use-help.ts` and `use-admin-help.ts` fully typed |

**Overall**: P0 ships green. P1 ships with two stubs remaining (tours + release notes admin) — acceptable given V1 seeder path. P2 (a11y sweep, seed content) is a separate task.

---

**Ready for QA**: P0 end-user surfaces + P1 articles/feedback admin. Tours and release-notes admin are placeholder-only and should be excluded from QA scope for this pass.
