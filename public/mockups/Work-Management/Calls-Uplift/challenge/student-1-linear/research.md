---
title: "Linear UX Pattern Research"
description: "Design Student 1 research into Linear's UI patterns for the TC Portal Calls Inbox"
---

# Linear UX Pattern Research

## Design Student 1 -- Linear Patterns for Calls Inbox

Research into specific, transferable UX patterns from Linear (the issue tracker) that can be applied to TC Portal's Calls Inbox and Call Review workflow. Linear is chosen because care coordinators processing calls share a core workflow with engineers triaging issues: receive items from an external source, classify them, take a quick action, move on.

---

## Pattern 1: Triage Inbox -- Dedicated Staging Area with Single-Key Actions

### What It Is

Linear's **Triage** is a purpose-built inbox that sits outside the normal workflow. Items arrive here from integrations (Slack, email, Intercom) and must be explicitly accepted, declined, snoozed, or marked as duplicate before they enter any team's backlog. It is not a view or a filter -- it is a distinct state in Linear's data model.

### How It Works in Linear

- **Access**: Sidebar navigation item, or keyboard sequence `G` then `T`
- **Four single-key triage actions**:
  - `1` -- Accept (moves to Backlog or a chosen status)
  - `2` -- Mark as Duplicate (links to existing issue)
  - `3` -- Decline (moves to Cancelled)
  - `H` -- Snooze (hides for a configurable duration, then resurfaces)
- **Triage Responsibility**: A rotating assignment that designates who is responsible for emptying triage each day
- **Triage Intelligence** (AI): Suggests labels, priority, project, and identifies likely duplicates automatically
- **Isolation**: Triage items are excluded from all standard views (Board, List, Cycle) until triaged, keeping active work clean

### Key Design Details

- The action bar appears **at the bottom of the viewport** when one or more items are selected, using progressive disclosure
- Each action button includes the keyboard shortcut as a visible badge (e.g., a small `1` pill next to "Accept")
- The list automatically advances to the next item after an action, supporting rapid sequential processing
- A count badge in the sidebar shows unprocessed triage items, creating gentle urgency

### Why It Transfers to Calls Inbox

- Calls arrive from an external system (telephony/transcription service) -- same as Linear integrations feeding triage
- Coordinators need a clear decision point per call: Link & Complete, Complete Only, Flag, or Defer
- The single-key action model supports the 30-second review target
- "Triage Responsibility" maps to shift-based coordinator assignments

### Sources

- [Linear Docs -- Triage](https://linear.app/docs/triage)
- [Linear Changelog -- Issue Triage](https://linear.app/changelog/2021-06-29-linear-release-and-issue-triage)
- [Linear Docs -- Triage Responsibility](https://linear.app/docs/triage-responsibility)

---

## Pattern 2: Command Palette (Cmd+K) -- Universal Search and Action Hub

### What It Is

A modal search interface triggered by `Cmd/Ctrl + K` that provides instant access to every action, navigation target, and entity in the application. It replaces the need for menus, dropdowns, and dedicated search pages.

### How It Works in Linear

- **Trigger**: `Cmd/Ctrl + K` from anywhere in the application
- **Search scope**: Issues, projects, views, team members, settings, actions, and navigation destinations
- **Ranking**: Results sorted by relevance, recency, and user frequency
- **Contextual actions**: When items are selected in a list view, `Cmd+K` shows bulk actions applicable to the selection
- **Nested navigation**: Selecting an action category (e.g., "Change status") opens a sub-palette with specific options
- **Fuzzy matching**: "crt iss" matches "Create Issue"; typo-tolerant input

### Key Design Details

- The palette appears centered in the viewport with a subtle backdrop overlay
- A text input at the top with placeholder text that changes contextually ("Search or jump to...", "Change status to...")
- Results are grouped by category (Actions, Issues, Navigation) with section headers
- Each result row shows an icon, title, and optional description/metadata
- Arrow keys navigate results; Enter selects; Escape closes or goes back one level
- The palette remembers recent commands and surfaces them when opened empty

### Why It Transfers to Calls Inbox

- **Package search**: Natural integration point -- coordinator presses `Cmd+K`, types a patient name or package number, selects from results to link
- **Discoverability**: New coordinators search "how do I..." and find actions; power users type shorthand
- **Bulk operations**: Select 5 calls from same family member, `Cmd+K` -> "Link to Package" -> search -> one action links all 5
- **Navigation**: Jump between Calls Inbox, a specific Package, Calendar -- all without mouse

### Sources

- [Linear Docs -- Conceptual Model](https://linear.app/docs/conceptual-model)
- [Linear Method -- Keyboard-First Design](https://linear.app/method/keyboard-first)
- [Command Palette UX Patterns (Medium)](https://medium.com/design-bootcamp/command-palette-ux-patterns-1-d6b6e68f30c1)

---

## Pattern 3: Split View -- List + Detail Panel with Context Preservation

### What It Is

A two-pane layout where a scrollable list occupies the left portion and a detail panel on the right shows the full context of the selected item. Navigating the list updates the panel without page transitions.

### How It Works in Linear

- Clicking an issue in a list view can open it in a **side peek panel** (rather than navigating to a full page)
- The list remains scrollable and visible; the selected item is highlighted with a left border accent
- The detail panel shows: title, description, comments, activity timeline, and a metadata sidebar (assignee, status, priority, labels, project, cycle)
- Content column width is constrained to ~640px for optimal readability (line length)
- The panel grows proportionally on wider screens but caps at a max width
- `Escape` closes the panel and returns focus to the list
- Arrow keys (`J`/`K` or `Up`/`Down`) move selection in the list while the panel is open, instantly loading the next item

### Key Design Details

- The list width is fixed (~320px) regardless of viewport width
- The selected item in the list shows a coloured left border (2px accent) and a subtle background tint
- The detail panel has its own scrollable area independent of the list
- A thin border separates list and panel with no shadow, maintaining flatness
- Loading the next item in the panel is near-instant (optimistic UI / prefetching)

### Why It Transfers to Calls Inbox

- Coordinators need to see the call list (to know what is remaining) while reviewing a specific call
- Transcription + audio player + package linking + notes all need vertical space -- the detail panel provides it
- Desktop-first requirement means screen real estate is available for a split layout
- Arrow-key navigation lets coordinators flow through calls sequentially without mouse movement

### Sources

- [Linear -- How We Redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Linear Changelog -- Issue View Layout Improvements](https://linear.app/changelog/2021-06-03-issue-view-layout)
- [Linear Docs -- Views](https://linear.app/docs/views)

---

## Pattern 4: Status Indicators -- Shape + Colour Encoding

### What It Is

A visual system that combines **icon shape** and **colour** to communicate item state at a glance. Critically, Linear never relies on colour alone -- each status has a distinct icon silhouette.

### How It Works in Linear

| Status | Icon Shape | Colour |
|--------|-----------|--------|
| Triage | Dotted circle outline | Grey |
| Backlog | Dashed circle outline | Grey |
| Todo | Empty circle | Grey |
| In Progress | Half-filled circle | Yellow |
| Done | Filled checkmark circle | Green/Purple |
| Cancelled | Struck-through circle | Grey |

- **Priority** uses a separate icon set: exclamation marks for Urgent, descending bar charts for High/Medium/Low
- **Labels** use small coloured pills with text
- Status icons appear inline in list rows, are compact (16x16px), and maintain legibility at small sizes
- Hovering a status icon shows a tooltip with the status name and available transitions

### Key Design Details

- Icons are **monochrome with a single accent colour** -- never multicolour
- The status dot/icon is always the leftmost element in a list row, establishing visual rhythm
- Transitions between statuses are animated subtly (a circle filling, a check appearing)
- Label pills are compact: small rounded rectangle, 6px padding, 11px text

### Why It Transfers to Calls Inbox

- Calls have clear states: Unlinked (needs linking), Needs Review (linked but not reviewed), Completed, Snoozed, Flagged
- Shape differentiation ensures accessibility (not colour-dependent)
- Compact icons preserve information density in the call list
- The visual rhythm of status icons on the left edge enables rapid scanning of a long list

### Proposed Call Status Mapping

| Call Status | Icon Shape | Colour | TC Tailwind |
|------------|-----------|--------|-------------|
| Unlinked | Warning triangle | Orange | `text-orange-500` (#E0763C) |
| Needs Review | Half-filled circle | Yellow | `text-yellow-500` (#DDA023) |
| Completed | Checkmark circle | Green | `text-green-500` (#4DC375) |
| Snoozed | Clock | Grey | `text-gray-500` (#999999) |
| Flagged/Spam | X circle | Red | `text-red-500` (#E04B51) |

### Sources

- [Linear Docs -- Configuring Workflows](https://linear.app/docs/configuring-workflows)
- [Linear Method -- Crafted with Intention](https://linear.app/method/quality)
- [Carbon Design System -- Status Indicator Pattern](https://carbondesignsystem.com/patterns/status-indicator-pattern/)

---

## Pattern 5: Bulk Selection with Contextual Action Toolbar

### What It Is

A multi-select mechanism that reveals a floating action toolbar at the bottom of the screen when one or more items are selected, enabling batch operations without navigating away from the list.

### How It Works in Linear

- **Select individual items**: `X` key while item is focused, or click the checkbox that appears on hover
- **Select range**: `Shift + Click` on two items selects everything between them; `Shift + Up/Down` extends selection
- **Select all**: `Cmd/Ctrl + A` selects all visible items
- **Bulk action toolbar**: A dark, floating bar anchored to the bottom of the viewport that shows:
  - Count of selected items ("3 issues selected")
  - Action buttons: Status, Assignee, Priority, Labels, Project, Cycle, Delete
  - Each action opens a dropdown/palette for choosing the target value
- **Command palette integration**: `Cmd+K` while items are selected shows actions that apply to the entire selection
- **Right-click context menu**: Multi-select then right-click shows bulk actions in a context menu

### Key Design Details

- The toolbar animates in from the bottom when selection begins, slides out when cleared
- It uses a dark background (#1e293b-style) to contrast with the main content and draw attention
- Each toolbar button shows only an icon + label (no descriptions), keeping it compact
- A "clear selection" button (X) is always visible on the left of the toolbar
- The toolbar never obscures the list items (it sits below or overlays the pagination area)

### Why It Transfers to Calls Inbox

- **Same-family batch linking**: A coordinator receives 4 calls from the same family number -- select all, link to one package
- **End-of-shift review**: Select all routine calls that were already linked, mark all as "Completed" in one action
- **Spam cleanup**: Select several junk calls and mark as spam simultaneously
- The progressive disclosure approach (toolbar only when needed) keeps the UI clean during normal single-call review

### Sources

- [Linear Docs -- Select Issues](https://linear.app/docs/select-issues)
- [Linear Docs -- Bulk Actions](https://linear.app/docs/select-issues#bulk-actions)
- [Linear Method -- Keyboard-First](https://linear.app/method/keyboard-first)

---

## Summary: Transferable Principles from Linear

1. **Keyboard-first, mouse-supported**: Every action has a keyboard shortcut, but the UI is fully usable with mouse. Shortcuts are visible as badges on buttons, not hidden.
2. **Progressive disclosure**: The bulk action toolbar, command palette, and context menus only appear when relevant, keeping the default UI minimal.
3. **Opinionated default workflow**: Triage has exactly four actions. This constraint reduces decision fatigue and enables muscle memory.
4. **Speed as a feature**: Sub-100ms interactions, instant panel updates, optimistic UI. The interface never makes the user wait.
5. **Context preservation**: Split views keep the list visible during review. No full-page navigations. The user always knows where they are.
6. **Information density as a dial**: Users can show/hide columns, toggle between views, and save preferences -- but the defaults are clean and minimal.
7. **Visual hierarchy through restraint**: Muted colours for chrome, strong colours only for status and actions. Ample whitespace. No decorative elements.
