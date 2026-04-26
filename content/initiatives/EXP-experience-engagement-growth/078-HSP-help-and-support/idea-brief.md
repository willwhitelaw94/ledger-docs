---
title: "Idea Brief: Help & Support (HSP)"
---

# Idea Brief: Help & Support (HSP)

**Created**: 2026-04-19
**Author**: William Whitelaw

---

## Problem Statement (What)

- **Users get stuck and leave the app** to find answers. Ledgerly spans 75+ epics (banking, invoicing, AR/AP, payroll, BAS, practice management, workpapers, AI chatbot, etc.) and there is no in-product way to learn how a feature works, reach support, or surface "what's new".
- **New users have no guided path on first login**. After sign-up and onboarding, users land on the dashboard cold. There is no page-level tour explaining what Intray is, why the Inbox exists, how Kanban differs from Table view, or where to find the AI chatbot — despite these being differentiators.
- **Accountants onboarding junior staff have no structured teaching surface**. Firms re-teach the same concepts per hire (journal entries, reconciliation, year-end close) with no self-serve content.
- **Release announcements are invisible**. New features ship weekly but users only discover them by accident. There is no "What's New" feed, no unread badge, no mechanism to nudge users toward changed behaviour.
- **The tour migration is a ghost**. `tour_definitions` and `tour_completions` tables exist (migration `2026_04_01_750001_create_tour_tables.php`) but have no model, controller, seeder, or frontend — the 075-FTS epic was closed prematurely. Tours cannot fire.
- **Keyboard shortcuts are undiscoverable**. CLAUDE.md mandates kbd badges inline and a `?` overlay, but the overlay component alone does not teach users *when* a shortcut is useful. Tours need to point at them.
- **Feedback is lost**. Users report issues via email, Slack, or "I should tell Will". There is no structured in-product feedback capture with URL, workspace, role, and optional screenshot.

**Current State**: Zero help surfaces. No articles, no tours firing, no release notes, no feedback form. `?` key opens shortcut overlay only. Support routing is "email the founder".

---

## Possible Solution (How)

A unified **Help & Support** surface — one `?` button in the header that opens a right-hand sheet (Xero-style) with everything a stuck user needs, plus a full `/help` page for deeper browsing and admin authoring.

### Core Surfaces

1. **Header `?` button → Help Sheet (right drawer)**
   - Search across articles
   - "Recommended for this page" — articles tagged to the current route
   - Recently viewed articles
   - Row: "Start tour for this page" (if a tour exists for the current route)
   - Row: "Keyboard shortcuts" → opens the existing `?` overlay
   - Row: "What's new" → release-notes feed with unread badge on the `?` icon
   - Row: "Give feedback" → modal with category, body, URL auto-filled, optional screenshot
   - Footer link: "Browse all help topics" → `/help`

2. **`/help` full page**
   - Categorised article browser (e.g. Getting Started, Invoicing, Banking, Payroll, Practice, AI Assistant)
   - Article detail view with breadcrumbs, related articles, "Was this helpful?" feedback
   - Super-admin authoring UI: create / edit / publish / retire articles, categories, tags, `page_keys`

3. **Tours (TTOURS)**
   - Built on existing `tour_definitions` / `tour_completions` schema
   - Admin UI (super-admin only) to author tours: steps, CSS target selectors, route pattern, audience (role and/or Pennant feature flag), trigger (`first-visit` | `manual`)
   - `useTour(pageKey)` hook — auto-starts on first visit to a matching route if the tour is `is_active`, the user's role/flag matches, and no completion row exists
   - Skippable with "Don't show again" → writes a `tour_completions` row
   - "Replay tour" row in the help sheet when a tour exists for the current page
   - Library choice is an open question — see Clarifications (driver.js vs react-joyride vs shepherd.js vs custom)

4. **What's New (release notes)**
   - Chronological list of release entries: title, category (New / Improved / Fixed), body (markdown), published_at, optional image, optional "Take me there" link
   - Unread badge on the `?` icon (pulse dot) driven by `last_seen_release_at` on the user record
   - Viewing the feed clears the badge

5. **Feedback Capture**
   - Modal with: category (Bug / Idea / Question / Other), body (required), URL (auto-filled), workspace_id (auto-filled if in workspace context), role (auto), optional screenshot upload (uses existing S3 pipeline from 012-ATT)
   - Stored centrally so super-admins can triage across all tenants
   - Out of scope: auto-routing to Linear / Slack (open question — see Clarifications)

### Data Model Sketch (to be refined in spec)

| Table | Scope | Purpose |
|-------|-------|---------|
| `help_articles` | Central | Title, slug, body (markdown), category_id, page_keys (JSON array for route matching), target_roles (JSON), feature_flag, status (draft/published/archived), author_id, view_count |
| `help_categories` | Central | Name, slug, icon, sort_order |
| `help_article_views` | Central | Tracks views per user for recency + analytics |
| `tour_definitions` | EXISTS | Extend with `route_pattern` column if needed |
| `tour_completions` | EXISTS | Already scoped by user_id + workspace_id |
| `release_notes` | Central | Title, body, category, published_at, image_url, cta_url |
| `user_feedback` | Central (with optional workspace_id) | Category, body, url, user_agent, screenshot_path, user_id, workspace_id, status, created_at |

### Example (Before / After)

```
// Before — User lands on /intray with no idea what it is
1. User opens /intray
2. Sees 3-pane grid, transactions, suggestions — no context
3. Closes tab, messages Will on Slack: "What's the Intray for?"

// After — Guided first experience
1. User opens /intray for the first time
2. Tour auto-starts: "Intray is your attention queue..."
3. 5-step walkthrough points at each pane with arrows
4. User clicks "Got it" → completion recorded
5. Later, user clicks `?` → "Start tour for this page" to replay
```

---

## Benefits (Why)

**User Experience**
- **Unblocks stuck users in-product** — target: 60%+ of help interactions resolved without leaving the app
- **First-login retention** — page tours give new users a guided path; target: 30% reduction in "how do I..." support touches from new sign-ups
- **Discoverability of differentiators** — AI chatbot, Intray, Workpapers, Kanban view get surfaced via tours and "What's New"

**Operational Efficiency**
- **Founder/support time saved** — structured feedback replaces ad-hoc Slack/email; target: 5 hours/week saved triaging
- **Practice onboarding** — firms use the help center as a training resource for junior staff, reducing per-hire teaching time by an estimated 2-3 hours

**Business Value**
- **Competitive parity** — Xero, MYOB, QuickBooks all ship in-product help; Ledgerly cannot credibly target practice customers without it
- **Activation and stickiness** — guided tours correlate with higher feature adoption; What's New re-engages dormant users after releases
- **Feedback loop** — structured in-product feedback gives product a cleaner signal than noisy support channels

**ROI**: Hard to quantify in dollars at this stage, but unblocking a single practice customer per month (ARR ~$1,200) easily repays the 4-5 sprint investment.

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | — (PO), — (BA), — (Des), — (Dev) |
| **A** | — |
| **C** | — |
| **I** | — |

> **Gate 0 blocker**: RACI is not yet assigned. To be filled in before handover to design.

---

## Assumptions & Dependencies, Risks

**Assumptions**
- Help articles are written in markdown and can be stored in the DB (not markdown-in-repo) — reviewable via Clarifications
- Super-admins (`is_super_admin = true`) are the primary authors; per-practice custom help is deferred to a later phase
- The existing `tour_definitions` schema is close enough — minor additions (e.g. `route_pattern`) are acceptable
- PostHog is not yet installed; analytics questions (view counts, tour completion rates) can be answered from our own tables in V1

**Dependencies**
- **012-ATT Attachments** (complete) — S3 pipeline for feedback screenshots and article images
- **024-NTF Notifications** (complete) — optional: nudge users on new releases
- **009-BIL / Pennant** (complete) — feature flag gating for role-targeted tours
- **020-AIB AI Assistant** (partial) — future: help articles could be a RAG source for the AI chatbot
- The existing `?` keyboard-shortcut overlay (CLAUDE.md) — must not be broken; shortcut help is a row inside the help sheet

**Risks**
- **Tour target selectors drift** (MEDIUM) — tours reference CSS selectors or `data-tour-target` attributes that break when UI changes → Mitigation: standardise on `data-tour-target="<slug>"` conventions; add a lint check
- **Author content at scale** (MEDIUM) — articles take time to write; shipping an empty help center is worse than none → Mitigation: seed V1 with 15-20 core articles covering P1 epics (JE, invoices, bills, banking, AR/AP)
- **Tour library lock-in** (LOW) — picking the wrong library (driver.js / react-joyride / shepherd.js) means rewrites → Mitigation: thin wrapper `useTour()` so the library is swappable
- **Accessibility failures** (MEDIUM) — tour overlays and help sheets are historically weak at keyboard/SR support → Mitigation: WCAG 2.1 AA target, focus trap in sheet and tour step, ESC to close, ARIA live regions
- **Feedback becomes a black hole** (MEDIUM) — if feedback is captured but never triaged, users stop sending → Mitigation: define triage SLA and integrate with Linear (open Clarification)

---

## Estimated Effort

**L — 4 sprints / 4 weeks**, approximately 45-55 story points

- **Sprint 1**: Backend foundation — models, migrations (help_articles, help_categories, release_notes, user_feedback), controllers, resources, policies, seeders for 15-20 articles + 5 tours
- **Sprint 2**: Help sheet + `/help` page — right drawer, search, recommended-for-this-page, article detail, "What's New" feed, unread badge
- **Sprint 3**: Tours engine — library integration, `useTour()` hook, auto-start on first visit, replay, tour authoring admin UI
- **Sprint 4**: Feedback capture + Release notes admin UI + polish (a11y audit, keyboard flows, mobile responsiveness)

---

## Proceed to PRD?

**YES** — Help is a competitive-parity gate for practice customers and a material improvement to user activation. The tour schema already exists but is unused, and the `?` button slot is ready in the page header. Clarification is needed on ~10 significant decisions (article storage, tour library, content authoring scope, analytics, feedback routing) before design — to be captured in `spec.md` via `/trilogy-clarify spec`.

---

## Decision

- [ ] **Approved** — Proceed to PRD
- [ ] **Needs More Information**
- [ ] **Declined**

**Approval Date**:
