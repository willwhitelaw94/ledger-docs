---
title: "Mockup Summary: 013-WSP Workspace Entity Setup"
---

# Mockup Summary: 013-WSP Workspace Entity Setup

**Generated**: 2026-03-14
**Format**: HTML/Tailwind — with skeleton sidebar shell
**Screens**: 5

---

## Screen Overview

| # | Screen | User Story | Key Design Decisions |
|---|--------|-----------|---------------------|
| 01 | Workspace Switcher | US1, FR-019 | Dashed-border CTA differentiates "Create new" from existing workspaces |
| 02 | Stage 1 — Entity & ABN | US1, US4, FR-002–005 | Card grid for entity type (6 options), inline ABN validation badge |
| 03 | Stage 2 — Simple Mode | US6, FR-006a–006c | Post-AI-extraction state showing detected flags + 1 unconfirmed flag |
| 04 | Stage 2 — Advanced Mode | US2, FR-006d | Progress bar + step-by-step questions with visual answer options |
| 05 | Stage 3 — CoA Review | US3, US7, FR-012–013a | Full-page wizard step; account groups; inline rename; reasoning text per account |

---

## Design Decisions

### Workspace Switcher
- **Dashed border CTA** for "Create new workspace" — visually distinct from existing workspace entries without being jarring
- Secondary description "Set up a new entity with smart CoA" sets expectation
- Organisation grouping with a footer "Manage workspaces" link for power users

### Stage 1 — Entity & ABN
- **Card grid (3×2)** for entity selection — visual icons reduce cognitive load vs. a dropdown
- **Inline ABN validation** with green badge + business name lookup on success; shows error state inline
- Two-column bottom row for currency + fiscal year (rarely changed, lower visual weight)

### Stage 2 — Two modes
- **Simple mode** (default): post-extraction state shows a compact flag confirmation UI; "unconfirmed" flags (amber) prompt user to Yes/No before proceeding
- **Advanced mode**: progress bar + answered questions greyed above current question; visual 3-option cards per question (Yes / No / Not sure)
- Mode toggle is always visible — users can switch at any point
- Template match preview bar at bottom of simple mode shows final account count before advancing

### Stage 3 — CoA Review
- **Full-page** (not modal) — the account list needs space; modals feel cramped for 60–80 rows
- **Account groups collapsible** — open on first visit, collapse by type
- **Hover to reveal edit actions** — rename + delete appear on row hover, keeping the list clean at rest
- **Inline rename** — clicking pencil opens an in-row input without a modal
- **Colour-coded source badges** — orange = system/locked, teal = base template, purple = overlay module
- **Reasoning text** shown as a secondary line per row (not tooltip) — always visible, builds user understanding
- **AI rename button** in the header bar (optional, skippable)
- **Right sidebar** — template info, legend, and "you can always edit later" reassurance

---

## Recommended Patterns to Carry Forward

| Pattern | Rationale |
|---------|-----------|
| Step indicator in header (full-page) vs. top of modal (stages 1–2) | Stage 3 needs full width; stages 1–2 work well as modals |
| Hover-to-reveal edit actions on account rows | Keeps the list scannable; power users will hover naturally |
| Amber "confirm this flag" inline in simple mode | Better than a separate confirmation step — keeps user in flow |
| Reasoning text as a permanent secondary row | Tooltips get missed; always-visible text builds confidence |
| Template match preview bar (teal) at bottom of stage 2 | Gives instant feedback on what the questionnaire answers produce |

---

## Open Questions for Stakeholder Review

1. **Stage 3 density**: Should accounts default to a more compact single-line view with reasoning hidden behind an expand chevron, or is the two-line (name + reasoning) view preferred for first-time users?
2. **AI rename placement**: The "AI: Suggest plain-language names" button is in the header. Should it be per-group (apply to just expenses) or global (all accounts at once)?
3. **Stage 2 advanced mode — question order**: Industry is first. Should GST registration be second (most impactful for system accounts) or should we follow the 9-flag order as specced?
4. **Workspace switcher grouping**: When a user has only one organisation, should the "Hamilton Family Office" group header still appear, or only show when there are multiple orgs?

---

## Next Steps

1. Review mockups with stakeholders → note preferred patterns
2. Update `summary.md` with decisions
3. Run `/speckit-implement` to begin implementation (tasks.md has 58 tasks ready)
4. Or run `/trilogy-mockup --challenge` for a design competition on Stage 3 CoA review (the most complex screen)
