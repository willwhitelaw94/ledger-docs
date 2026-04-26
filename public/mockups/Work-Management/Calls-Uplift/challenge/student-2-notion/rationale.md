---
title: "Design Rationale: Notion-Inspired Calls Inbox"
description: "Why Notion's database-centric patterns are effective for the TC Portal Calls Inbox workflow"
---

# Design Rationale: Notion-Inspired Calls Inbox

## Design Student 2 - Pattern Selection Rationale

---

## Why Notion Patterns for TC Portal Coordinators

### Jakob's Law Application

Care coordinators spend their workday across multiple digital tools -- email clients, CRMs, government portals, and increasingly, modern workspace applications like Notion, Monday.com, and Airtable. These tools have normalised a specific interaction vocabulary: database views, side panels, inline editing, and filter-driven workflows. By borrowing Notion's patterns:

1. **Reduced learning curve**: Patterns feel familiar on first use. A coordinator who has used any modern database tool will recognise view switching, filter pills, and click-to-edit cells.
2. **Transferable mental models**: The concept of "same data, different views" is now a widely understood pattern. Coordinators do not need to learn that switching from Table to Board does not change their data.
3. **Trust through recognition**: "I know how this works" builds immediate confidence and reduces the anxiety of adopting a new tool.

### Audience Consideration

TC Portal coordinators are:
- Handling high volumes of calls daily (efficiency is the primary concern)
- Context-switching between clients, packages, and care types frequently
- Working primarily on desktop with large monitors (optimised for mouse and keyboard)
- Experienced computer users but not necessarily "power users" in the developer sense
- Time-pressured, with a target of completing call reviews in under 30 seconds

Notion patterns are appropriate because they balance:
- **Simplicity for quick tasks** (click a row, review, click Complete)
- **Depth for power users** (saved views, advanced filters, keyboard shortcuts)
- **Flexibility for different work styles** (some prefer scanning a table, others prefer a visual board)

---

## Pattern-by-Pattern Rationale

### 1. Multiple Database Views (Table + Board)

**Why this works for calls review:**

| View | When Coordinators Use It | Key Benefit |
|------|--------------------------|-------------|
| Table | Scanning many calls, batch operations, spreadsheet familiarity | Highest information density, fastest scanning |
| Board | Visual progress tracking, understanding workload distribution | Instant overview of how many calls are in each state |
| List | Focused single-call review, minimal visual noise | Clean reading experience for sequential processing |

**The critical insight**: Different tasks within the same workflow benefit from different views. A coordinator starting their day may use the Board view to understand the shape of their workload ("I have 5 unlinked, 8 ready for review, 22 completed"). They then switch to Table view to batch-process the 8 ready calls. Neither view changes the underlying data.

**Trade-offs:**
- (+) Flexibility for different work styles and task phases
- (+) Same data, different presentations -- no duplicate entry or synchronisation issues
- (+) Notion-style view tabs are a well-understood pattern, not a novel invention
- (-) Initial view choice may overwhelm new users (mitigated by setting a sensible default)
- (-) Development cost of implementing multiple view renderers (mitigated by component reuse)

**Recommendation:** Launch with Table as the default view (most familiar, highest density for batch work). Add Board as the secondary view for visual progress tracking. Consider List view as a future addition.

---

### 2. Side Peek Panel (Variation A)

**Why this works for calls review:**

The side peek is the single most important pattern for achieving the sub-30-second review target. Here is why:

- **Zero navigation overhead**: The coordinator clicks a row. The detail panel appears on the right. They do not leave the page, do not wait for a page load, and do not lose their place in the queue. When they complete the review, they click the next row. The panel content swaps. Total navigation cost: one click per review.
- **Context preservation**: While reviewing call #3, the coordinator can see that call #4 is flagged as "Unlinked" and call #5 has been in the queue since yesterday. This ambient awareness drives prioritisation without explicit effort.
- **Spatial memory**: "I am on the third row. Seven more to go." This is visible at all times. In a full-page navigation model, the coordinator loses this context and must rely on memory or breadcrumbs.
- **Batch flow state**: The side peek enables a rhythm: click, scan transcription, add note, click Complete, click next row. This tight loop supports flow state for high-volume processing.

**Trade-offs:**
- (+) Best pattern for high-volume sequential review workflows
- (+) Maintains position awareness and queue visibility
- (+) Natural for desktop (utilises wide screens effectively)
- (-) Split attention between list and detail (acceptable because the list is ambient context, not active focus)
- (-) Limited horizontal space for transcription text (mitigated by making the panel width generous -- approximately 50% of viewport)
- (-) Not suitable for mobile (acceptable because coordinators work on desktop)

**When to use:** Primary recommendation for desktop coordinators doing batch review. This is the default interaction for the Table view.

---

### 3. Board View with Full-Page Overlay (Variation B)

**Why this works for calls review:**

The Board (Kanban) view serves a different purpose than the Table. It answers the question: "What is the shape of my workload right now?"

- **Instant workload overview**: Four columns -- Unlinked, Ready for Review, Completed, Flagged -- give an immediate visual summary. No counting required; the height of each column tells the story.
- **Drag-and-drop status changes**: Moving a card from "Ready for Review" to "Completed" is a single drag action. This is satisfying, fast, and leverages the spatial metaphor that Kanban boards have trained users on.
- **Full-page overlay for detail**: When a card needs detailed review (reading transcription, linking package), clicking it opens a Notion-style full-width page overlay. This provides more space than a side peek, appropriate for the less frequent but more complex reviews that happen from the Board view.

**Trade-offs:**
- (+) Best for visual progress tracking and workload understanding
- (+) Drag-and-drop status changes are intuitive and fast
- (+) Full-page overlay provides maximum space for complex reviews
- (-) Lower information density than Table view (fewer calls visible at once)
- (-) Less efficient for pure batch processing (Table + Side Peek is faster)
- (-) Drag-and-drop may be imprecise on smaller screens

**When to use:** Secondary view for coordinators who prefer visual workflows, or for team leads who need a workload overview. Particularly useful at the start and end of the day.

---

### 4. Inline Editing (Click-to-Edit Properties)

**Why this works for calls review:**

Inline editing eliminates the most common source of friction in data entry: the round-trip to a separate edit form.

- **Status changes**: Click the "Pending" chip, select "Completed" from the dropdown. Done. No modal, no form, no save button. This is the fastest path from "I want to change this" to "it is changed."
- **Notes entry**: Click the notes cell in the table row. A text cursor appears. Type the note. Click away. Saved. The coordinator never left the table.
- **Package linking**: Click the "Unlinked" chip. A search popup appears. Type a name or package number. Click the match. Linked. The chip updates from orange "Unlinked" to teal "PKG-1234". Three clicks, no page transition.

**Applied to TC Portal:**
- Status changes via inline dropdown (in table cells and in side peek property bar)
- Notes via inline text field (in table cells)
- Package linking via inline search selector (in table cells and in side peek)
- All property chips in the side peek header are clickable and editable

**Trade-offs:**
- (+) Fastest path to common actions -- no intermediary screens
- (+) Reduces click count and eliminates form submission overhead
- (+) Hover states signal editability without cluttering the default view
- (-) Accidental edits are possible (mitigated by clear hover states and undo capability)
- (-) Auto-save must be reliable (mitigated by optimistic UI with error recovery)

---

### 5. Relations (Package Linking as a First-Class Concept)

**Why this works for calls review:**

The call-to-package link is not a text field. It is a typed relationship between two entities in the system. Notion's Relation pattern treats this correctly:

- **Search-based linking**: The coordinator searches for a package by name, number, or client name. The system returns matching packages. The coordinator clicks one. This ensures the link points to a real, valid package -- no typos, no stale references.
- **Suggested matches**: When a call comes in from a phone number the system recognises, it can pre-suggest the most likely package match. The coordinator confirms with one click instead of searching.
- **Visual distinction**: Linked calls show a teal package chip. Unlinked calls show an orange "Unlinked" warning chip. This binary visual signal makes triage instant -- scan the Package column, orange means "needs attention."
- **Rollup context**: Once linked, the call row can display rolled-up information from the package (client name, package level, active status) without the coordinator needing to open the package.

**Design choices:**
- Search-based linking (not a dropdown with all packages, which would be unusable at scale)
- Suggested matches based on caller phone number (reduces search to one-click confirmation for recurring callers)
- Clear visual indicator for "Unlinked" state (orange warning chip, not just an empty cell)
- Dedicated "Unlinked" saved view for focused triage sessions

**Trade-offs:**
- (+) Intuitive "connect the dots" mental model that users understand from Notion, Airtable, Monday.com
- (+) Search handles large package lists gracefully
- (+) Suggestions speed up the most common linking scenario (repeat callers)
- (-) Requires robust search and matching (fuzzy search, phone number normalisation)
- (-) Wrong link is easy to make (mitigated by showing package details before confirming)

---

### 6. Saved Views and Filter Presets

**Why this works for calls review:**

Coordinators have recurring workflows. Without saved views, they rebuild the same filters every session. With saved views, each workflow is one click:

- **"My Queue"**: Assigned to me, status = Pending or In Review. This is the default landing view.
- **"Unlinked"**: Package = empty. For focused triage sessions where the goal is to clear the unlinked backlog.
- **"Completed Today"**: Status = Completed, date = today. For end-of-day auditing and reporting.
- **"All Calls"**: No filters. For searching or browsing the complete call history.

**Applied to TC Portal:**
- View tabs at the top of the inbox (e.g., "My Queue (12) | Unlinked (5) | All Pending (34) | Completed Today")
- Each tab restores a saved filter, sort, and view type configuration
- Active filters shown as removable pills in the filter bar, so the coordinator always understands why they see a particular subset

**Trade-offs:**
- (+) Eliminates repetitive filter setup across sessions
- (+) Supports different coordinator workflows and preferences
- (+) Tab count badges give an instant summary of workload distribution
- (-) Too many tabs creates clutter (mitigated by limiting pre-built views to 4-5 and hiding custom views behind a dropdown)
- (-) Naming views can cause confusion across teams (mitigated by using clear, descriptive names and showing badge counts)

---

## Recommendation Summary

### Primary Recommendation: Variation A (Table View + Side Peek)

**Why this wins:**
1. **Speed optimised**: Side peek enables sub-30-second reviews by eliminating navigation overhead
2. **Familiar pattern**: Closest to email inbox behaviour (Outlook, Gmail) that coordinators already know
3. **Batch friendly**: Checkbox selection + batch actions bar for bulk operations
4. **Desktop-first**: Utilises wide screens effectively with the table-and-panel split
5. **Highest density**: Table view shows the most calls per screen, reducing scrolling

### Secondary Option: Variation B (Board/Kanban View)

**Why this complements:**
1. **Visual progress**: Great for understanding workload shape at a glance
2. **Status-centric**: Makes the pending-to-completed pipeline immediately visible
3. **Coexists with Table**: Offered as an alternative view via the view toggle, not a replacement
4. **Team lead value**: Supervisors can see team workload distribution without running reports

### Combined Strategy

The strongest outcome is offering both views through the Notion-style view toggle:
- **Table + Side Peek** as the default for individual contributors doing batch review
- **Board** as an alternative for visual workflow tracking and team oversight
- **Saved views** (tabs) for quick access to filtered subsets regardless of view type

---

## Trade-off Matrix

| Criteria | Table + Side Peek | Board + Overlay |
|----------|-------------------|-----------------|
| Speed (sub-30s reviews) | Excellent | Good |
| Context preservation | Excellent (list always visible) | Limited (overlay covers board) |
| Desktop optimisation | Excellent | Good |
| Visual progress tracking | Limited (requires counting rows) | Excellent (column heights tell the story) |
| Batch operations | Excellent (checkboxes + batch bar) | Limited (one card at a time) |
| Information density | Excellent (many rows visible) | Moderate (cards take more space) |
| Simplicity | Good | Good |
| Implementation effort | Medium | Medium |

---

## Risks and Mitigations

### Risk 1: View Option Overwhelm
Offering multiple views (Table, Board) plus saved view tabs may overwhelm coordinators on first use.

**Mitigation:** Launch with Table as the sole default. Introduce Board view after the core workflow is validated. Use progressive disclosure -- the view toggle is small and unobtrusive; coordinators who do not need it can ignore it.

### Risk 2: Inline Editing Accidents
Click-to-edit can lead to accidental changes, especially for status and package linking.

**Mitigation:**
- Clear visual distinction between display state and edit state (input border appears on click)
- Confirmation step for destructive changes (unlinking a package shows a confirmation)
- Undo capability for recent changes (toast notification with "Undo" link)
- Escape key to cancel in-progress edits

### Risk 3: Search Performance for Package Linking
Package search must return results quickly with large datasets (thousands of packages).

**Mitigation:**
- Index packages for instant search (Meilisearch or similar)
- Show suggested packages first (based on phone number matching)
- Fuzzy matching for typo tolerance
- Debounced search input to reduce server load

### Risk 4: Side Peek Space Constraints
Long transcriptions may feel cramped in a 50%-width side peek panel.

**Mitigation:**
- Scrollable transcription section with a generous max-height
- "Expand to full page" button in the panel header for complex reviews
- Collapsible sections (audio player, package linking) so the transcription can take more vertical space
- Adjustable panel width (drag the divider)

### Risk 5: Mobile and Tablet Usage
Side peek and table view are desktop-first patterns that do not translate well to narrow screens.

**Mitigation:**
- Detect viewport width; on narrow screens, switch to a full-page detail view instead of side peek
- Board view with card tapping (full-page overlay) works acceptably on tablets
- Explicitly position the Calls Inbox as a "desktop optimised" feature in documentation

---

## Conclusion

Notion's database-centric patterns provide a proven, familiar foundation for the Calls Inbox. The **Table View + Side Peek** combination best meets the target of sub-30-second reviews by eliminating navigation overhead and maintaining queue context. The **Board View** complements this as a secondary lens for visual progress tracking.

The key insight is that these are not competing designs -- they are complementary views of the same data. The Notion-style view toggle lets coordinators choose the right lens for their current task without any loss of data or state.

**Key success metrics to track post-implementation:**
- Average review completion time (target: under 30 seconds)
- Calls processed per hour per coordinator
- Unlinked call backlog clearance rate (time from call arrival to package linking)
- Coordinator satisfaction scores (ease of use, speed perception)
- View usage distribution (which views coordinators actually use)
