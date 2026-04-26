---
title: "Design Handover: Help & Support (HSP)"
---

# Design Handover: Help &amp; Support (078-HSP)

**Epic**: 078-HSP
**Date**: 2026-04-19
**Design Owner**: William Whitelaw
**Stage**: Design → Dev

---

## Gate 2 Checklist Result: PASS

| Check | Status | Notes |
|---|---|---|
| design.md covers all spec requirements | PASS | Every FR category (Help Sheet, Articles, Tours, What's New, Feedback, Targeting, Permissions, Analytics, Accessibility, Seed Content) addressed |
| Mockups exist for all key screens | PASS | 10 interactive Next.js routes under `/mockups/078-hsp/*` |
| Responsive considerations documented | PASS | design.md §10 — sm/md/lg behaviours specified |
| Accessibility requirements specified | PASS | design.md §11 — focus traps, ESC, ARIA, SR headings, axe-core |
| Edge cases and error states designed | PASS | design.md §13 — empty/loading/error per surface |
| Design principles are clear and actionable | PASS | design.md §2 maps all 7 core principles to concrete choices; §4 adds 5 epic-specific principles |
| Dark mode coverage | PASS | Every mockup tested in dark mode, uses `bg-background` / `bg-card` / `text-muted-foreground` tokens |
| Keyboard shortcut alignment | PASS | `<kbd>` badges on every row that has a shortcut; `Cmd+/` opens sheet, `/` focuses search, `Enter` / `Esc` on tours |
| Locked decisions from spec honoured | PASS | Q2, Q3, Q4, Q8, Q10, Q12, Q17, Q29, Q33 all reflected in design |

---

## Summary

### What we're building

Unified Help &amp; Support surface:
- New `?` button in the page header opens a right-side Sheet with search, recommended articles, tour trigger, keyboard shortcuts link, What's New, and feedback entry
- `/help` full page for category-based browsing
- Guided tours powered by driver.js, with a new `scope` column (user vs workspace) and two seeded sequences (first-login + first-workspace-visit)
- What's New feed with unread badge driven by `user.last_seen_release_at`
- Structured feedback capture writing to `user_feedback`
- Super-admin authoring UIs for articles, tours, release notes, and feedback triage under `/admin/help-and-support/*`

### Key Component Decisions

**Reusing (no new primitives):**
- `Sheet`, `Dialog`, `Command`, `Input`, `Textarea`, `Button`, `Badge`, `StatusBadge`, `StatusTabs`, `DataTable`, `Skeleton`, `Tabs`, `Separator`

**New helpers:**
- `<HelpPageKey value="invoices.detail" />` — registers current page's key
- `useTour()` — thin wrapper over driver.js
- `useHelpSheet()` — Zustand for open/close + view routing
- `<ArticleMarkdown>` — react-markdown + rehype-sanitize

### Critical UX Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Where does the `?` button sit? | Between Ask AI and Notifications in the header | Matches Xero IA but keeps our header density; discoverable without crowding |
| Article detail rendering | Inline in the sheet | Maintains context; matches "Help never interrupts work" epic principle |
| Feedback capture surface | `Dialog` over the sheet (not full-page) | ~20s interaction, not a flow — Dialog is correct |
| Tour library | driver.js (locked Q2) | 5kb, minimal opinions; wrapped in `useTour()` so swappable |
| Content editing | 2-pane markdown + live preview | Plain markdown matches CLAUDE.md conventions; no WYSIWYG complexity |
| Per-page key derivation | Explicit `<HelpPageKey>` component (locked Q3) | Zero heuristic failure; tiny per-page boilerplate |

---

## Mockup URLs (local dev — `cd frontend && npm run dev`)

All under `http://localhost:3001/mockups/078-hsp`:

| # | Path | Surface |
|---|---|---|
| Index | `/mockups/078-hsp` | Gallery with links to every mockup |
| 1 | `/mockups/078-hsp/header` | Header `?` button integration |
| 2 | `/mockups/078-hsp/help-sheet` | Help Sheet (index / article / what's-new views) |
| 3 | `/mockups/078-hsp/help-center` | `/help` full page |
| 4 | `/mockups/078-hsp/tour-overlay` | driver.js-styled tour (3 steps, spotlight) |
| 5 | `/mockups/078-hsp/feedback-modal` | Feedback Dialog with screenshot |
| 6 | `/mockups/078-hsp/whats-new` | Release notes feed |
| 7 | `/mockups/078-hsp/admin-articles` | Articles list + 2-pane markdown editor |
| 8 | `/mockups/078-hsp/admin-tours` | Tours list + step editor |
| 9 | `/mockups/078-hsp/admin-release-notes` | Release notes list + editor with video |
| 10 | `/mockups/078-hsp/admin-feedback` | Feedback triage with drawer |

These routes are isolated from the production app — no auth, no workspace context, fake data only. They **must be deleted** before launch (captured in `design.md` §18 handoff risks).

---

## Data Requirements (reference — already in plan.md)

| Surface | Data needed | Source |
|---|---|---|
| Help Sheet — Recommended | Articles where `page_keys` intersect current page key | `GET /api/v1/help/recommendations?page_key=` |
| Help Sheet — Search | Full-text search on articles | `GET /api/v1/help/articles?q=` (tsvector) |
| Help Sheet — Recently viewed | Current user's last 3 `help_article_views` | `GET /api/v1/help/articles/recent` |
| Tour row | Tours matching route pattern, filtered by role + flag, not yet completed | `GET /api/v1/tours?route=` |
| What's New badge | `unread_count` (notes with `published_at > user.last_seen_release_at`) | `GET /api/v1/help/release-notes` |
| Feedback submission | Auto-captured: `user_id`, `workspace_id`, `user_agent` | `POST /api/v1/help/feedback` |

---

## Open Questions for Development

Non-blocking — can be resolved during Sprint 2 or 3:

- **Q1** — Is `/help` public? Recommended (c) authenticated V1. **Confirm before Sprint 2 ends.**
- **Q7** — Always show "Last updated"? Baked into mockups as (b) yes. Confirm.
- **Q16** — Clipboard paste for screenshots? Baked in (c) file + paste. Confirm bundle/perf impact.
- **Q19** — Target roles include practice roles? Baked in (b) workspace + practice. Confirm.
- **Q26** — "Preview as role" in article editor? Baked in (b) yes. Placeholder button exists in admin-articles mockup.
- **Q27** — Draft saves? Baked in (b) draft/published. Status toggle visible.
- **Q30** — Proactive `?` nudges? (a) user-initiated only V1. Not shown in mockups.

Also flagged at handoff:
1. `rehype-sanitize` is a new dep — verify Sprint 2 bundle size hit.
2. driver.js styling must pass dark-mode contrast — Sprint 3 QA item.
3. `<HelpPageKey>` adoption across 20+ pages — plan a separate rollout PR from the feature PR.

---

## Out of Scope (Deferred — reaffirmed at Gate 2)

All items listed in spec.md §Out of Scope remain out of scope. Notably:
- Per-practice custom articles / tours
- AI chatbot RAG integration (Q28)
- Linear / Slack feedback routing (Q13)
- Multi-language content
- Public changelog (Q20)
- Scheduled publish (Q27)
- Global user "disable tours" preference (Q11)

---

## Sign-Off

| Role | Name | Date | Status |
|---|---|---|---|
| Designer / Product | William Whitelaw | 2026-04-19 | Approved |
| Lead Developer | _ | _ | Pending |
| Stakeholder | _ | _ | Not required for V1 |

By signing off, we confirm:
- [x] Design is complete enough to begin implementation
- [x] All major UX decisions are finalised (9 locked in Session 2026-04-19)
- [x] 7 open questions are documented and non-blocking
- [x] Scope boundaries are clear

---

## Next Steps

- [ ] Dev Agent / `/speckit-plan` — plan.md already exists; confirm Sprint 1 backend foundation tasks
- [ ] Spike on bundle-size impact of `react-markdown` + `rehype-sanitize` before Sprint 2 commits
- [ ] Schedule Q1 decision (public `/help`) before Sprint 2 ends
- [ ] QA to add dark-mode contrast check + axe-core run to Sprint 4 test plan

---

## Recommended: Proceed to Dev

**Recommendation**: proceed to dev. The design is internally consistent, reuses existing primitives, respects the "Linear for accounting" density, and maps every principle to concrete choices. Open questions are intentional — they belong to product, not design.

The only items I would not ship without confirming first are:
1. `/help` auth state (Q1) — changes SEO and onboarding posture
2. `rehype-sanitize` bundle impact — verify on a real Sprint 2 branch before committing to it everywhere
