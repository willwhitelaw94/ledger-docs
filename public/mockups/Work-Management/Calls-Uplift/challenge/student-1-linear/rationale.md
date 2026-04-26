---
title: "Design Rationale -- Linear Patterns for Calls Inbox"
description: "Why Linear's UI patterns are the right foundation for TC Portal's Calls Inbox and Call Review workflow"
---

# Design Rationale: Linear Patterns for TC Portal Calls Inbox

## The Core Insight

Care coordinators triaging calls and software engineers triaging issues are doing the same cognitive work: receive an item from an external source, classify it, take a quick action, move to the next one. Linear has spent years optimising this exact workflow. By applying Linear's patterns to the Calls Inbox, we borrow tested solutions rather than inventing new ones.

**Target: Complete a call review in under 30 seconds.**

---

## Jakob's Law Application

> "Users spend most of their time on OTHER sites. This means that users prefer your site to work the same way as all the other sites they already know."

Linear's design language has become the benchmark for modern productivity tools. Its patterns -- command palette, keyboard shortcuts, triage workflows, split views -- appear across tools coordinators likely encounter: Slack, Notion, Figma, VS Code, Superhuman. These are no longer "Linear patterns" -- they are modern software patterns. Coordinators will recognise them even if they have never used Linear directly.

---

## Pattern-by-Pattern Rationale

### 1. Triage Inbox (Variation A -- Full-Screen Inbox)

**The parallel**: Linear's Triage is a staging area for items arriving from external integrations. TC Portal's Calls Inbox is a staging area for calls arriving from the telephony system. Both need rapid classification and disposition.

**Why it works for coordinators**:

- **Constrained choices reduce decision fatigue**: Four actions only -- `1` Link & Complete, `2` Complete Only, `3` Flag, `H` Defer. This mirrors Linear's Accept/Duplicate/Decline/Snooze. Coordinators do not need to think about which button to press; the mapping becomes muscle memory within a single shift.
- **Auto-advance keeps momentum**: After completing an action, the list advances to the next call. The coordinator never needs to manually click the next item. This eliminates a full second per call, which across 100 calls per day saves nearly 2 minutes of pure click time.
- **Isolation from active work**: Unprocessed calls live in the inbox. Completed calls disappear from the list. This prevents the "where was I?" problem that occurs when completed and pending items are mixed.
- **Count badge creates gentle urgency**: A badge showing "12 pending" in the sidebar nudges coordinators to process without being aggressive or anxiety-inducing.

**Trade-off accepted**: The full-screen triage view shows less detail per call than a split view. This is intentional -- most calls (especially linked ones) can be completed from the list row alone, reading the transcription snippet and pressing `2` to complete. Only unlinked calls need the expanded view.

### 2. Split View with Detail Panel (Variation B)

**The parallel**: Linear's side-peek panel shows issue details while keeping the list visible. TC Portal's split view shows call details (audio, transcription, package linking, notes) while keeping the call list visible.

**Why it works for coordinators**:

- **Context preservation is critical**: Coordinators process calls in batches, often during a specific time block. Losing sight of the list ("how many are left?") breaks their mental model and rhythm. The list anchors their progress.
- **All review elements in one view**: Audio player, transcription, package search, notes, and the complete action -- all visible without scrolling on a standard 1920x1080 display. No tabs, no modals, no page transitions.
- **Keyboard-driven list navigation**: Arrow keys move focus through the list; the detail panel updates instantly. A coordinator can review 8 calls in sequence without touching the mouse.
- **Fixed list width (320px)**: Enough to show caller name, time, duration, and status badge. No wasted space. The detail panel gets the remaining width for content-heavy elements like transcription.

**Trade-off accepted**: The split view requires a desktop-width screen. On smaller viewports, it would need to collapse to a stacked view. However, the brief specifies desktop-first, and care coordinators use Portal at their desk.

### 3. Command Palette (Cmd+K)

**Why it works for coordinators**:

- **Package search as a first-class action**: The most common action for unlinked calls is "find the right package and link it." The command palette provides instant fuzzy search -- type "mary john" and "PKG-1234 Mary Johnson" appears. This is faster than navigating to a separate search page or opening a modal dropdown.
- **Discoverable but not mandatory**: The `Cmd+K` trigger is shown as a button in the top bar. New coordinators can click it; experienced ones press the shortcut. Every action available in the palette also exists as a button or keyboard shortcut elsewhere -- the palette is an accelerator, not a requirement.
- **Bulk action integration**: When multiple calls are selected, `Cmd+K` shows bulk actions ("Link all to package", "Mark all as completed"). This handles the common case of multiple calls from the same family member.
- **Navigation shortcut**: "Go to Margaret Johnson's package" -- type it, jump there, review context, come back. No sidebar navigation needed.

**Trade-off accepted**: Some coordinators will never discover `Cmd+K`. That is fine. All functionality is accessible through visible buttons and single-key shortcuts. The palette is a power-user accelerator, not a gate.

### 4. Status Indicators with Shape + Colour

**Why it works for coordinators**:

- **Scanning speed**: A coordinator glancing at 20 calls needs to instantly identify which are unlinked (need action) vs. already linked (routine review). Orange warning triangles for unlinked calls and yellow half-circles for pending review create an unmistakable visual hierarchy.
- **Accessibility**: Shape differentiation means colour-blind coordinators can still distinguish states. A triangle is always "unlinked" regardless of how orange renders on their display.
- **Consistency with Linear's vocabulary**: The same iconography (circles, checkmarks, triangles) is used across modern tools, reducing cognitive load.

### 5. Bulk Selection with Bottom Toolbar

**Why it works for coordinators**:

- **Batch linking**: 4 calls from +61 402 567 890 arrive. Select all four, press `1`, search for the package once, link all four. Time: ~15 seconds instead of ~60 seconds (4 x 15 seconds individually).
- **End-of-shift cleanup**: Select all linked calls, press `2` to complete all. Done.
- **Progressive disclosure**: The toolbar only appears when items are selected. During normal single-call review, the bottom bar shows only keyboard shortcuts -- clean and minimal.

---

## Addressing the 30-Second Target

### Scenario 1: Linked call, routine review (most common)

| Step | Action | Time |
|------|--------|------|
| 1 | Arrow down to call | 0.5s |
| 2 | Scan transcription snippet in list row | 2s |
| 3 | Press `2` (Complete Only) | 0.5s |
| | **Total** | **3 seconds** |

### Scenario 2: Unlinked call, phone number matches a known package

| Step | Action | Time |
|------|--------|------|
| 1 | Arrow down to call | 0.5s |
| 2 | Scan transcription snippet | 2s |
| 3 | Press `1` (Link & Complete) | 0.5s |
| 4 | See suggested package (phone match) | 1s |
| 5 | Press Enter to confirm suggestion | 0.5s |
| | **Total** | **4.5 seconds** |

### Scenario 3: Unlinked call, need to search for package

| Step | Action | Time |
|------|--------|------|
| 1 | Arrow down to call | 0.5s |
| 2 | Read transcription in detail panel | 5s |
| 3 | Press `Cmd+K` to open palette | 0.5s |
| 4 | Type package name/number | 3s |
| 5 | Select from results, press Enter | 1s |
| 6 | Add quick note | 5s |
| 7 | Press `1` to complete | 0.5s |
| | **Total** | **15.5 seconds** |

### Scenario 4: Unlinked call, requires audio review

| Step | Action | Time |
|------|--------|------|
| 1 | Arrow down to call | 0.5s |
| 2 | Press Space to play audio | 0.5s |
| 3 | Listen to relevant portion (skip forward) | 15s |
| 4 | Press `Cmd+K`, search package | 3.5s |
| 5 | Select package, press Enter | 1s |
| 6 | Add note | 5s |
| 7 | Press `1` to complete | 0.5s |
| | **Total** | **26 seconds** |

Even the most complex scenario (audio review + search + notes) comes in under 30 seconds. Routine calls complete in 3-5 seconds.

---

## Variation Comparison

| Dimension | Variation A (Triage View) | Variation B (Split View) |
|-----------|--------------------------|--------------------------|
| **Best for** | Rapid sequential processing of many calls | Detailed review requiring transcription/audio |
| **Speed** | Fastest -- 3s per routine call | Fast -- 5-10s per call with detail review |
| **Detail visible** | Transcription snippet only; expand-in-place for more | Full transcription, audio player, notes always visible |
| **Screen usage** | Full width for list; efficient for scanning | 320px list + detail panel; efficient for review |
| **Cognitive load** | Lowest -- constrained to 4 actions | Low -- more information but well-organised |
| **Batch workflow** | Excellent -- select multiple, one action | Good -- select in list, but detail panel shows one |
| **Recommendation** | **Default view for daily triage** | **Activated when coordinators need detail (unlinked calls, disputes)** |

The ideal implementation offers **both views as tabs**: "Triage" (Variation A) and "Review" (Variation B), letting coordinators switch based on their current task. This mirrors Linear's ability to toggle between List and Board views.

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Keyboard shortcuts not discovered | Medium | Low | Visible shortcut badges on all buttons; `?` key opens shortcut reference; onboarding tooltip on first visit |
| Wrong package linked accidentally | Low | Medium | Undo action (`Cmd+Z`) within 10 seconds; confirmation dialog on bulk link operations (>3 calls) |
| Command palette feels unfamiliar | Medium | Low | Prominent `Cmd+K` button in header; all actions have button equivalents; palette is optional |
| Phone number matching produces false positives | Low | Medium | Show suggestions WITH manual search; suggestions are ranked, not auto-applied; coordinator always confirms |
| Too many calls overwhelm the inbox | Low | Medium | Grouping by status; filter tabs (Unlinked / Review / Completed); pagination at 25 items; count badge shows progress |

---

## Implementation Priority

### Phase 1: Core List + Detail Panel
- Call list with status grouping and filter tabs
- Detail panel with transcription, audio player, and notes
- Basic keyboard navigation (arrow keys to move, Enter to select)
- "Complete Review" button
- *Delivers:* Functional call review workflow

### Phase 2: Triage Actions + Package Linking
- Single-key shortcuts (`1`, `2`, `3`, `H`)
- Package search and linking (inline in detail panel)
- Phone number-based package suggestions
- Auto-advance after action
- *Delivers:* Speed-optimised workflow; 30-second target achievable

### Phase 3: Command Palette + Bulk Operations
- `Cmd+K` integration with package search
- Multi-select (`X` key, `Shift+Click`)
- Bulk action toolbar
- Saved view preferences
- *Delivers:* Power-user workflows; batch processing for high-volume days

---

## Sources Referenced

- [Linear Docs -- Triage](https://linear.app/docs/triage)
- [Linear Docs -- Display Options](https://linear.app/docs/display-options)
- [Linear Docs -- Select Issues](https://linear.app/docs/select-issues)
- [Linear -- How We Redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Linear Method -- Keyboard-First](https://linear.app/method/keyboard-first)
- [Linear Method -- Quality](https://linear.app/method/quality)
- [Command Palette UX Patterns (Medium)](https://medium.com/design-bootcamp/command-palette-ux-patterns-1-d6b6e68f30c1)
- [Carbon Design System -- Status Indicator Pattern](https://carbondesignsystem.com/patterns/status-indicator-pattern/)
