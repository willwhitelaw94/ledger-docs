---
title: "Design Brief: Help & Support (HSP)"
---

# Design Brief: Help & Support (078-HSP)

**Epic**: 078-HSP
**Created**: 2026-04-19
**Spec**: [spec.md](/initiatives/fl-financial-ledger/078-hsp-help-and-support/spec)
**Plan**: [plan.md](/initiatives/fl-financial-ledger/078-hsp-help-and-support/plan)
**Design Phase**: Gate 2

---

## 1. Context

### Who this is for

| Persona | Lens on help |
|---|---|
| **Bookkeeper / Owner** (workspace user) | Stuck mid-flow — needs a 30-second answer without leaving the page they're on |
| **Accountant / Practice Manager** | Teaching junior staff — uses `/help` as a training index |
| **New user (first login)** | Needs orientation — the `?` button, the sidebar, keyboard shortcuts |
| **Super-admin / content editor** | Authoring — 2-pane markdown editor, tour step editor, feedback triage |

### Primary device

Desktop-first. Power users live in Ledgerly daily. Sidebar + right-side help Sheet only makes sense at >=`md` breakpoints; mobile collapses to a full-screen Sheet.

### Dark mode

Dark mode is the **default** for dashboard surfaces (`guides/design-system.md` section 8). Every surface in this epic must render with the same visual hierarchy in both themes.

---

## 2. Alignment with Core Principles

Every design choice below has been checked against [`developer-docs/design-principles.md`](/developer-docs/design-principles). The Help Sheet and its supporting surfaces are a new product-wide chrome — they must feel native to "Linear for accounting," not a bolted-on Intercom widget.

| Principle | Concrete choice in this design |
|---|---|
| **1. Speed is a feature** | Help Sheet opens `<200ms` (SC-007). Article search is debounced 150ms and renders `Skeleton` rows during fetch — not a spinner. The `?` button is statically rendered so it never flashes during auth. Recommended articles are prefetched when the page key changes (no click latency). |
| **2. Keyboard first** | Help Sheet toggles with `Cmd/Ctrl + /`. Inside the sheet: `/` focuses search, `J`/`K` navigates results, `Enter` opens, `Esc` closes. Every actionable row shows a `<kbd>` badge. The "Keyboard shortcuts" row itself has a `?` badge that matches the existing overlay hotkey. Tour "Next" accepts `Enter`; "Skip" accepts `Esc`. |
| **3. One thing at a time** | Sheet has one search box, one primary action per state. "Recommended for this page" is shown first — the *right* answer, not ten. The feedback modal asks for category + body; URL is auto-filled, everything else is optional. Tour popovers show one step at a time with a single primary "Next" button. |
| **4. Trust through transparency** | Articles always show "Last updated DATE" (Q7 recommendation). "Was this helpful?" vote state is visible ("Thanks — noted"). Feedback toast confirms "We've got it" with a reference ID. Release notes category badge (New / Improved / Fixed) is unambiguous. Tour completion writes an audit row; users can replay any tour from the help sheet. |
| **5. Forms are conversations** | Feedback modal has 2 required fields (category, body). URL, role, workspace, user-agent are auto-captured. Screenshot accepts drag-drop, paste-from-clipboard (`Cmd+V`), and file picker — three ways in, no friction. |
| **6. Consistent visual language** | All cards use `rounded-lg border bg-card`. Status colours (`draft`/`published`/`archived`) route through `StatusBadge`. Admin tables reuse `DataTable`. Primary action always bottom-right of forms. |
| **7. Context always present** | Help Sheet shows the current page name in its subtitle ("Help on Invoices"). Article detail shows breadcrumb `Help Center > Invoicing > Recording payments`. Tour popovers include a step counter ("3 of 5"). |

### Tensions (flagged, not silent)

- **Sheet vs page principle tension**: the design-principles file says "Modals for complex flows — use pages or slide-in panels instead." The Help Sheet is a **slide-in panel**, not a modal — but the Feedback form inside it is a `Dialog`. This is intentional: feedback is a short interruption (~20s), not a flow, so a dialog is the correct primitive. Calling it out so we don't drift later.
- **Tour overlay is a modal-ish surface**: we accept this because `driver.js` provides a true focus trap, `role="dialog"`, and an ARIA live region for step content. It's the minimum for WCAG 2.1 AA on a spotlight pattern.

---

## 3. Locked Decisions (from spec.md Session 2026-04-19)

Carry-forward only — do NOT re-open in design:

| # | Decision |
|---|---|
| Q2 | Tour engine = **driver.js**, wrapped in `useTour()` hook |
| Q3 | Page key = **explicit registry** via `<HelpPageKey value="invoices.detail" />` |
| Q4 | Content model = **hybrid** markdown seed + DB-authoritative edits |
| Q8 | Route pattern = **path + `:param` wildcards** |
| Q10 | Target inside a collapsed parent = **skip with warning** |
| Q12 | `tour_completions.workspace_id` = **nullable** |
| Q17 | New Spatie permission = **`help.manage`**, seeded to super-admin |
| Q29 | Admin surface = **unified under `/admin/help-and-support/*`** |
| Q33 | Tour scope = **new `scope` column** (`user` / `workspace`) with two seeded sequences |

---

## 4. Design Principles for this Epic

In addition to the product-wide principles:

1. **Help never interrupts work.** Sheet overlays but does not dim the entire page. Pressing `Esc` returns focus to the `?` button. Article detail opens inline within the sheet, not as a modal.
2. **Help never lies about freshness.** Every article shows "Last updated" — if it's >6 months, a super-admin review flag is surfaced in the admin list.
3. **Help teaches, doesn't tell.** Tour steps and articles point at concrete UI: `data-tour-target="invoices.create-button"`. No "click the button in the top-right" prose.
4. **Admin surfaces use production patterns.** Article list is a `DataTable`. Feedback triage is a `DataTable` with row actions. Tour editor is drag-to-reorder via `@dnd-kit`. No bespoke admin chrome.
5. **Linear-density, not Xero-density.** Xero's help panel is roomy. Ours is tighter: `py-2` rows, `text-sm` throughout, `kbd` inline. More content visible without scrolling.

---

## 5. Surface Inventory

Ten surfaces total — 6 end-user, 4 admin. Each has a working Next.js mockup at `frontend/src/app/mockups/078-hsp/*/page.tsx`.

### End-user

| # | Surface | Route (mockup) | Primitive | Purpose |
|---|---|---|---|---|
| 1 | Header `?` button (integrated) | `/mockups/078-hsp/header` | `Button` (ghost) | Opens Help Sheet; shows unread release-note dot |
| 2 | Help Sheet | `/mockups/078-hsp/help-sheet` | shadcn `Sheet` (right, 420px) | Core entry — search + recommended + rows |
| 3 | `/help` full page | `/mockups/078-hsp/help-center` | Split layout | Category browser + article detail |
| 4 | Tour overlay | `/mockups/078-hsp/tour-overlay` | driver.js styled via CSS | Guided onboarding |
| 5 | Feedback modal | `/mockups/078-hsp/feedback-modal` | shadcn `Dialog` | Structured capture with screenshot |
| 6 | What's New feed | `/mockups/078-hsp/whats-new` | Sheet secondary view | Release notes, category pills |

### Admin (`help.manage` required)

| # | Surface | Route (mockup) | Pattern |
|---|---|---|---|
| 7 | Articles list + editor | `/mockups/078-hsp/admin-articles` | `DataTable` + split-pane markdown editor |
| 8 | Tours list + step editor | `/mockups/078-hsp/admin-tours` | `DataTable` + dnd-kit step editor |
| 9 | Release notes list + editor | `/mockups/078-hsp/admin-release-notes` | `DataTable` + editor with image/video |
| 10 | Feedback triage | `/mockups/078-hsp/admin-feedback` | `DataTable` with filters + triage drawer |

---

## 6. Help Sheet — Anatomy (detail)

The Help Sheet is the core surface. It has **three views** routed by internal state (no URL change):

### 6.1 Index view (default)

```
┌─ Help & Support ────────── [×] ─┐  (SheetHeader, 44px, border-b)
│  On: Invoices                   │  (subtitle — current page name)
├─────────────────────────────────┤
│  [🔍 Search help...      /]     │  (Input with `/` kbd hint)
├─────────────────────────────────┤
│  Recommended for this page      │  (text-xs uppercase muted)
│  ┌───────────────────────────┐  │
│  │ Recording invoice payments│  │  (article card — title + 1-line excerpt)
│  │ Invoicing · 2 min read    │  │
│  ├───────────────────────────┤  │
│  │ Voiding a sent invoice    │  │
│  │ Invoicing · 1 min read    │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  Recently viewed                │  (only shown if history exists)
│  · Creating a journal entry    │
│  · AI Assistant basics         │
├─────────────────────────────────┤
│  ▶  Start tour for this page    │  (only shown if matching tour exists)
│  ⌨  Keyboard shortcuts       ? │  (kbd badge right)
│  ✨  What's new            •3   │  (unread dot + count)
│  💬  Give feedback              │
├─────────────────────────────────┤
│  Browse all help topics →       │  (SheetFooter — link to /help)
└─────────────────────────────────┘
```

- Width: `sm:max-w-md` (~440px) — tighter than Xero's 480px
- Background: `bg-background`, border-l
- Rows: `py-2.5 px-4`, `hover:bg-muted/50`, divide-y for separators

### 6.2 Article view (inline — no navigation)

```
┌─ Help & Support ────────── [×] ─┐
│  ← Back to help                 │  (arrow + text, top-left)
├─────────────────────────────────┤
│  Invoicing > Recording payments │  (breadcrumb, text-xs muted)
│                                  │
│  # Recording payments on invoices│  (h1, text-xl)
│                                  │
│  Last updated 3 Apr 2026        │  (text-xs muted)
│                                  │
│  <markdown body, prose-sm>      │
│                                  │
│  Was this helpful?               │
│  [👍 Yes]  [👎 No]              │
│                                  │
│  Related articles                │
│  · Voiding an invoice           │
│  · Creating a credit note       │
└─────────────────────────────────┘
```

- `← Back` restores previous scroll position and search state (Zustand-held).
- Body uses `@tailwindcss/typography` `prose-sm` with a tightened overrides layer.
- Markdown sanitised via `rehype-sanitize`.

### 6.3 What's New view

```
┌─ Help & Support ────────── [×] ─┐
│  ← Back                         │
│                                  │
│  What's new                      │
│                                  │
│  [NEW]    15 Apr 2026           │
│  Kanban view on Jobs             │
│  Drag jobs between statuses...   │
│  [Take me there →]              │
│  ─────────                       │
│  [IMPROVED] 10 Apr 2026          │
│  Faster bank reconciliation      │
│  <expandable body>               │
│  ─────────                       │
│  [FIXED]  5 Apr 2026             │
│  PDF export on Safari            │
└─────────────────────────────────┘
```

- Category pills: `new` = primary, `improved` = amber, `fixed` = muted.
- Optional image (attachment) or video embed (YouTube / Loom iframe, sandboxed).
- Opening the view triggers `POST /help/release-notes/seen` — the pulse dot on the `?` button clears on next render.

---

## 7. Tour Overlay — driver.js styling pass

driver.js default styling is too loud for our theme. Override:

| Element | Override |
|---|---|
| Backdrop | `bg-black/50` (was `rgba(0,0,0,.7)`) |
| Highlight box | `ring-2 ring-primary ring-offset-2 ring-offset-background rounded-md` |
| Popover card | `bg-popover text-popover-foreground border rounded-lg shadow-lg p-4 max-w-sm` |
| Title | `text-base font-semibold mb-1` |
| Body | `text-sm text-muted-foreground prose prose-sm` (markdown) |
| Step counter | `text-xs text-muted-foreground tabular-nums` — "3 of 5" bottom-left of card |
| Previous | `Button variant="ghost" size="sm"` — disabled on step 1 |
| Skip | `Button variant="ghost" size="sm"` — bottom-left |
| Next / Got it | `Button variant="default" size="sm"` — bottom-right; `Enter` activates |

The `useTour()` hook wraps driver.js so callers never import it directly — makes the library swappable per Q2 rationale.

---

## 8. Feedback Modal — Anatomy

```
┌─ Give feedback ──────── [×] ──┐
│                                │
│  What's on your mind? *        │
│  [ Bug  |  Idea  |  Question  │  (segmented control; pills)
│    |  Other                 ]  │
│                                │
│  Tell us more *                │
│  ┌──────────────────────────┐ │
│  │ Textarea (min 10 chars)  │ │  (autofocus)
│  │                          │ │
│  │                          │ │
│  └──────────────────────────┘ │
│                                │
│  Screenshot (optional)         │
│  ┌─ Drop, paste, or click ──┐ │
│  │ 📎 Attach screenshot     │ │  (drag-drop zone)
│  │ or press Cmd+V to paste  │ │
│  └──────────────────────────┘ │
│                                │
│  Context (auto-captured)       │  (collapsed expandable section)
│  URL: /w/acme/invoices/123    │
│  Role: owner                   │
│  Workspace: Acme Pty Ltd       │
│                                │
│  [Cancel]          [Send] ⌘↵  │
└───────────────────────────────┘
```

- Category: 4 pills (Bug, Idea, Question, Other). Clickable, `aria-pressed`, keyboard-selectable.
- Screenshot: 3-in-1 input — drop zone, paste handler, file picker. Thumbnail preview with remove `×`.
- Context panel is collapsible (collapsed by default). Users can edit the URL before submit.
- Submit accepts `Cmd/Ctrl + Enter`.
- On success: modal closes, toast "Thanks — we've got it. (ID: fb_abc123)". Sheet remains open.
- On error: modal stays open; typed content preserved; retry button appears.

---

## 9. Admin Surfaces (super-admin / `help.manage`)

All admin surfaces follow the existing `AdminShell` pattern at `frontend/src/components/admin/admin-shell.tsx`. Unified under `/admin/help-and-support/*` per Q29.

### 9.1 Articles list + editor

**List** — `DataTable` with columns: Title, Category, Status (`StatusBadge`: draft/published/archived), Target Roles, Views, Last Updated, Author. Row action: "Edit". Primary action "New article" top-right with kbd `N`.

**Editor** — 2-pane split:
- Left: form (Title, Slug auto-generated from title, Category select, Page keys multi-select, Target roles multi-select, Feature flag input, Status) and markdown `Textarea` (`font-mono text-sm`)
- Right: live preview rendered via `react-markdown` in `prose-sm` — matches exactly what users will see in the sheet
- Footer: Cancel (ghost) | Preview as... (outline, opens role selector) | Save draft | Publish (default)
- Optimistic concurrency (Q18 recommendation): `updated_at` is sent with the request; conflict modal on staleness

### 9.2 Tours list + step editor

**List** — `DataTable` with columns: Key, Title, Route pattern, Scope badge (`user` / `workspace`), Steps (count), Trigger, Active toggle, Completions. Row actions: Edit, Preview, Duplicate.

**Step editor** — Form at top (Key, Title, Description, Route Pattern, Scope, Target Roles, Trigger, Feature flag, Active). Steps list below, drag-to-reorder via `@dnd-kit`:
- Each step row: drag handle, step number, title, target selector (CSS or `data-tour-target`), actions (edit / delete)
- Step edit panel: Target selector, Title, Body (markdown with live preview), Placement (top/bottom/left/right/auto), Spotlight padding
- "Preview tour" button opens the route in a new tab with `?_preview_tour=<key>` — no completion row written
- "Pick element" button (future) — overlays a selector UI; out of scope for V1 mockup but left as a seam

### 9.3 Release notes list + editor

**List** — `DataTable`: Title, Category (pill), Published at, Notify sent, Has image/video. Sort by `published_at DESC`.

**Editor** — Single-column form:
- Title (required), Body (markdown + live preview), Category (segmented: New/Improved/Fixed)
- Image (drag-drop via 012-ATT) **or** video URL (YouTube/Loom — validated)
- CTA URL + CTA label (optional pair)
- Notify users on publish (checkbox, Q6 hybrid)
- Status: Draft / Publish now / Schedule (future — disabled in V1)

### 9.4 Feedback triage

**List** — `DataTable` with filters at top:
- Status tabs: New | Triaged | Resolved (StatusTabs pattern with counts)
- Filters: Category (multi), Date range, Has screenshot, Workspace (search)
- Columns: Status, Category, User (avatar + email), Workspace, Body preview (2 lines, truncate), URL (monospace), Created (relative), Screenshot thumb
- Row click opens a right-hand triage drawer (Sheet)

**Triage drawer** — Sheet from right, 560px:
- Full body, clickable URL, user-agent, user/workspace metadata
- Screenshot (full-size, lightbox on click)
- Actions: Mark triaged | Mark resolved (requires resolution note) | Copy link to Linear (future, greyed)
- Audit trail at bottom: "Triaged by William 2d ago"

---

## 10. Responsive behaviour

| Breakpoint | Behaviour |
|---|---|
| `<sm` (mobile) | Sheet takes full viewport (`w-full`), no `max-w-md`. `/help` stacks sidebar above content. Admin surfaces redirect to desktop (we do not target super-admin on mobile in V1). |
| `sm`–`md` | Sheet = 3/4 width capped at 440px. `/help` sidebar collapses to a dropdown. |
| `md`+ | Design targets shown above. |

Tour popovers reflow automatically via driver.js based on viewport.

---

## 11. Accessibility Plan (non-negotiable — SC-006)

| Requirement | Implementation |
|---|---|
| Focus trap in Sheet | shadcn `Sheet` (Radix) handles this natively |
| Focus trap in Dialog | shadcn `Dialog` (Radix) handles this natively |
| Focus trap in Tour | driver.js has `disableActiveInteraction=false` with explicit focus management; we add a manual trap in `TourProvider` for WCAG belt-and-braces |
| ESC closes Sheet / Dialog / Tour | Native for Radix; explicit handler for driver.js |
| Return focus on close | Sheet returns to `?` button; Dialog returns to "Give feedback" row; Tour returns to `document.activeElement` at start |
| ARIA labels on icon-only buttons | `?` button: `aria-label="Open help"`; Close button inherits from shadcn |
| Keyboard nav through rows | Sheet rows are `role="button"` `tabindex="0"`; arrow keys navigate (custom handler) |
| Tour ARIA | `role="dialog"` on popover; `aria-live="polite"` on step body; step counter announced via `aria-describedby` |
| Screen-reader-only headings | `<h2 className="sr-only">Search</h2>`, `<h2 className="sr-only">Recommended</h2>` — keeps heading outline intact |
| Keyboard-only test | Browser test covers: open sheet (`Cmd+/`) → search → arrow to result → `Enter` → read → `Esc` → submit feedback — all without mouse |
| Contrast (light + dark) | All uses of `text-muted-foreground` on `bg-background` meet WCAG AA; verified in tokens table |
| `axe-core` | Integrated into Sprint 4 browser tests; zero critical/serious violations required before Gate 5 |

---

## 12. Component Inventory

### Reuse (no new primitives)

| Component | Use |
|---|---|
| `Sheet` | Help Sheet, Feedback Triage drawer |
| `Dialog` | Feedback modal, KeyboardShortcutsOverlay (existing), conflict-modal for optimistic concurrency |
| `Command` | Help Sheet search (cmdk under the hood — matches header search pattern) |
| `Input`, `Textarea` | Editors |
| `Button` (all variants) | All actions |
| `Badge` | Category pills, release-note categories |
| `StatusBadge` | Article/feedback/tour status |
| `StatusTabs` | Feedback status filter |
| `DataTable` | All 4 admin list views |
| `Skeleton` | Loading states everywhere (never spinners) |
| `Tabs` | Admin editor tabs ("Content" / "Settings") |
| `Separator` | Between sheet sections |
| `kbd` (element, not component) | Shortcut badges |

### New helpers (not new primitives)

| Helper | Purpose |
|---|---|
| `<HelpPageKey value="invoices.detail" />` | Mounts and registers a key into `useHelpPageKeyStore` |
| `useHelpPageKey(key)` | Hook alternative to the component |
| `useTour()` | Thin wrapper around driver.js |
| `useHelpSheet()` | Zustand-backed open/close + view routing |
| `<ArticleMarkdown body={...} />` | Wrapped `react-markdown` with `rehype-sanitize` + in-app link handling |

No new shadcn primitives required.

---

## 13. Loading, Empty, and Error States

| Surface | Empty | Loading | Error |
|---|---|---|---|
| Help Sheet — Recommended | "No articles tagged for this page yet. [Give feedback](../)" link | 3 `Skeleton` rows, pulse | Inline "Couldn't load recommendations. Retry" |
| Help Sheet — Search (>0 chars) | "No articles found for 'xyz'. Give feedback so we can write one." | 4 `Skeleton` rows | "Search is temporarily unavailable." |
| Help Sheet — What's New | "You're all caught up." + undraw-style illustration optional | Skeleton cards | Inline retry |
| Article view | N/A (detail exists) | `Skeleton` for title + 6 body lines | "Article not found or was archived." |
| `/help` category list | "No articles in this category yet." | Skeleton rows | Full-page fallback |
| Tour — target missing | Silent skip + super-admin log (Q10) | N/A | — |
| Feedback submit | N/A | Button shows spinner after 150ms | Inline error + retry button; content preserved |
| Admin — no articles | Card CTA "Seed default content" | Skeleton rows | Standard error boundary |

---

## 14. Analytics & Metrics

Per spec §Success Criteria. All tracked **in-DB** in V1 (Q48 open — PostHog deferred).

| Metric | Source |
|---|---|
| Help sheet opens | `help_sheet_open` event (client-only — minimal useful signal; not stored V1, just emitted to the existing analytics hook so it's ready when PostHog is added) |
| Article views | `help_article_views` rows |
| Article helpful votes | `help_article_feedback` rows |
| Tour completions | `tour_completions` rows (includes skip) |
| Release notes seen | `user.last_seen_release_at` timestamp |
| Feedback volume | `user_feedback` rows |

---

## 15. Open Design Questions (non-blocking)

These can be resolved during dev or early Sprint 2 — none block mockup signoff:

- **Q1** — Is `/help` public? Recommended (c) authenticated V1. If we go public, the `/help` page gets an "Ask for help" CTA routing to an unauth-friendly feedback capture. **Decision needed before Sprint 2 ends.**
- **Q7** — Always show "Last updated"? Recommended (b) yes. Folded into mockups already. Confirm.
- **Q16** — Clipboard paste support for screenshots? Recommended (c) both file + paste. Folded in. Confirm acceptable.
- **Q19** — Target roles — include practice roles? Recommended (b) workspace + practice. Folded into the target-roles multi-select.
- **Q26** — Preview article as a role? Recommended (b) yes. Surface is a "Preview as..." button in the editor footer.
- **Q27** — Draft saves? Recommended (b) yes. Folded in via Status toggle.
- **Q30** — Proactive `?` nudges? Recommended (a) user-initiated only V1. Mockups do NOT show nudges.

---

## 16. Gate 2 Validation

See [design-handover.md](./design-handover.md) for the full checklist result. High level:

| Check | Status |
|---|---|
| design.md covers all spec requirements | PASS |
| Mockups exist for all key screens | PASS (10 surfaces) |
| Responsive considerations documented | PASS (§10) |
| Accessibility requirements specified | PASS (§11) |
| Edge cases and error states designed | PASS (§13) |
| Design principles are clear and actionable | PASS (§2, §4) |

---

## 17. Research Notes (short)

### Xero help panel (reference)

Xero's `?` opens a right-side panel with Search, "Recommended articles," "Contact Xero," and "Visit Xero Central." Structure is right, density is loose. Rows are ~48px, no kbd hints, no inline article reading. We take the information architecture and tighten it: `py-2.5` rows, inline article view, `kbd` hints, skeleton loading.

### Linear's "What's new"

Linear surfaces release notes as a **right-side sheet** with category pills (New/Fixed/Improved) and dates. Entry-level simple body with occasional image embed. This is our model exactly — we add the "Take me there" CTA button because our release notes often reference a specific route.

### Vercel changelog

Monthly chronological cards with a coloured category stripe and embedded screenshots. Dense, readable. We inherit the dense-card feel for release notes. We do NOT inherit the social-share buttons (out of V1 scope, Q20).

### driver.js defaults

Default styling uses `rgba(0,0,0,.7)` backdrop and a blue "Popover Title". Both clash with our semantic tokens and design-system colour palette. The override CSS in §7 is the minimum viable theming. No new dependency — CSS override only.

### Existing Ledgerly patterns

- `Sheet` usage: chat panels, notification drawer — our Help Sheet matches their visual weight
- `Dialog` usage: confirm dialogs, onboarding modals — our Feedback Dialog matches
- `Command` usage: command palette in header — our search reuses the cmdk pattern

---

## 18. Handoff

**Ready for**: Dev Agent / `/speckit-plan` — the `plan.md` already exists and passes Gate 3 (see plan §2.1–2.7).

**Risks to flag at handoff**:
1. `rehype-sanitize` is a new dep — verify bundle-size impact on Sprint 2 smoke build.
2. driver.js styling must pass dark-mode contrast — add a Sprint 3 QA item.
3. `<HelpPageKey>` adoption across 20+ pages is a broad change — plan for a rollout PR separate from the core HSP feature PR.
