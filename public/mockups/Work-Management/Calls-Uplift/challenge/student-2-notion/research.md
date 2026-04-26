---
title: "Notion UX Patterns Research"
description: "Design Student 2 research into Notion's UI patterns for the TC Portal Calls Inbox"
---

# Notion UX Patterns Research

## Design Student 2 - Calls Inbox & Call Review

**Research Date:** February 2026
**Application:** TC Portal - Care Coordinator Calls Workflow

---

## Jakob's Law Context

> "Users spend most of their time on OTHER sites. They prefer your site to work the same way as all the other sites they already know."

Notion has over 30 million users and is widely adopted across knowledge work, project management, and team collaboration. Its database-centric design language has become a de facto standard for structured data interfaces. Borrowing its patterns creates immediate familiarity for coordinators who already use similar tools in their daily workflows.

---

## Pattern 1: Database Views (Table, Board, List, Timeline)

### What It Is
Notion treats every structured dataset as a "database" that can be rendered through multiple view types without changing the underlying data:

- **Table View**: Spreadsheet-like grid with sortable columns, inline cell editing, and row-level selection. Rows represent records; columns represent properties.
- **Board/Kanban View**: Cards grouped into vertical columns by a select property (typically "Status"). Cards can be dragged between columns to change their grouping property.
- **List View**: A compact, vertically stacked list of entries showing title and a few key properties. Minimal chrome, high density.
- **Gallery View**: Visual cards arranged in a grid, each showing an image/cover and selected properties beneath.
- **Calendar View**: Entries plotted on a month/week calendar grid by their date property.
- **Timeline View**: A horizontal Gantt-style bar chart showing entries across a time range.

### How It Works (Interaction Details)
- A **view switcher** sits at the top of the database. It shows the current view name and type icon, with a dropdown or tabs to switch between saved views.
- Each view can have **independent filters, sorts, and visible properties**. Switching views changes the lens but never the data.
- Users can **create new views** from a "+" button, choosing the layout type and configuring which properties to show.
- **Drag-and-drop** in Board view updates the grouping property on the record. This is a single-action status change.

### Why It Matters
- **Same data, different lenses**: A coordinator processing 40 calls may prefer a dense table for scanning. A team lead tracking progress may prefer a kanban board. Neither changes the data.
- **Reduced cognitive load**: The view matches the task at hand rather than forcing a single layout on all workflows.
- **Personalization without customization cost**: Views are cheap to create and share, so teams can standardize on named views ("My Queue", "Unlinked Calls", "Completed Today").

### Application to Calls Inbox
- **Table View** for batch processing: scan caller, duration, status, snippet across many rows quickly. Checkbox selection enables bulk actions.
- **Board View** for visual progress: columns like "Unlinked", "Ready for Review", "Completed", "Flagged" give an instant sense of workload distribution.
- **Saved views** as workflow shortcuts: "My Pending Reviews" (filtered to current user, status = pending), "All Unlinked" (filtered to unlinked calls), "Completed Today" (date = today, status = completed).

### Sources
- [Intro to databases - Notion Help Center](https://www.notion.com/help/intro-to-databases)
- [Views, filters, sorts & groups - Notion Help Center](https://www.notion.com/help/views-filters-and-sorts)
- [Create a Flexible Workspace with Notion's Kanban Boards](https://www.notion.com/use-case/kanban-board)

---

## Pattern 2: Side Peek / Page Open Modes

### What It Is
When a user clicks a row in a Notion database, the entry can open in one of three modes:

- **Side Peek**: A panel slides in from the right edge, occupying roughly 50% of the viewport. The database list/table remains visible on the left, slightly dimmed. The user can scroll the list, click another entry, or close the panel.
- **Center Peek**: A modal dialog appears centered over the database, with a semi-transparent backdrop. The database is obscured but not navigated away from.
- **Full Page**: The entry replaces the current view entirely. The user navigates back via breadcrumb or browser back.

### How It Works (Interaction Details)
- The default open mode is configurable per database view (a setting in the view options menu labelled "Open pages in").
- In **Side Peek mode**, the panel has a fixed width (approximately 50% of viewport or a max of ~720px). It includes:
  - A **close button** (X) in the top-right corner
  - A **full page button** to expand to full page
  - The entry's title, properties, and body content rendered as a page
  - Scrollable independently from the list
- The **list/table behind the panel** remains interactive. Clicking a different row swaps the peek content without closing and reopening the panel. This creates a rapid review flow: click row 1, review, click row 2, review, etc.
- Keyboard shortcuts can navigate between entries while the panel is open (arrow keys move selection in the list; the panel content updates).

### Why It Matters
- **Context preservation**: The coordinator never loses their place in the queue. They can see how many calls remain, which ones are flagged, and their current position.
- **Rapid cycling**: "Back button fatigue" is eliminated. Completing a review and moving to the next call is a single click, not a navigate-back-then-click-next sequence.
- **Spatial memory**: Users maintain awareness of their position. "I am third from the top, seven more to go" is visible at a glance.

### Application to Calls Inbox
- **Side Peek as the primary review mode**: Click a call row, the review panel opens on the right with audio player, transcription, package linking, and notes. The inbox list remains visible on the left.
- **Sequential review flow**: Complete one call, click the next row, the panel content swaps instantly. Target sub-30-second reviews become achievable when there is zero navigation overhead.
- **Escape hatch to full page**: For complex calls with long transcriptions or multiple package matches, the coordinator can expand to full page for more space.

### Sources
- [How to Change Notion's Side Peek Setting](https://www.makeuseof.com/change-notion-side-peek-setting/)
- [Efficiently Using Peek Pages in Notion](https://www.sparxno.com/blog/peek-pages-notion)
- [Notion Releases - Database side peek](https://www.notion.com/releases/2022-07-20)

---

## Pattern 3: Inline Editing and Property Chips

### What It Is
Notion database entries display their properties as interactive "chips" -- small, styled inline elements that double as both display and edit affordance:

- **Select properties** appear as coloured pills/tags. Clicking a pill opens an inline dropdown to change the value.
- **Text properties** appear as plain text. Clicking the cell enters edit mode with a text cursor, no modal or separate form.
- **Relation properties** appear as linked chips showing the related entry's title. Clicking opens a search popup to add or change the relation.
- **Date properties** show a formatted date string. Clicking opens a calendar picker inline.
- **Checkbox properties** are rendered as interactive checkboxes that toggle on click.

### How It Works (Interaction Details)
- **Hover state**: When hovering over an editable cell, the cell background subtly changes (light grey highlight) and the cursor changes to indicate editability.
- **Click to edit**: A single click enters edit mode. There is no "Edit" button or "Save" button. Changes are saved automatically on blur or Enter.
- **Escape to cancel**: Pressing Escape reverts the cell to its previous value.
- **Tab to next cell**: Pressing Tab moves to the next editable cell in the row, enabling keyboard-driven data entry across multiple fields.
- **Property chips in page view**: When a record is opened (in peek or full page), its properties are listed at the top as labelled rows: "Status: [Chip]", "Package: [Chip]", "Priority: [Chip]". Each chip is clickable and editable in place.

### Why It Matters
- **Directness**: The user clicks exactly where they want to make a change. There is no indirection through menus, forms, or modals.
- **Speed**: No form submission, no page reload, no "Save" button. The interaction is: click, type/select, done.
- **Discoverability**: The hover state signals "this is editable" without cluttering the default display with edit icons or input borders.
- **Error reduction**: The user sees all surrounding context while editing a single field, reducing the chance of editing the wrong record.

### Application to Calls Inbox
- **Inline status change**: In table view, the status column shows a coloured chip ("Pending", "In Review", "Completed"). Clicking the chip opens a dropdown to change status without opening the call detail.
- **Quick notes in table**: A "Notes" column in the table view allows click-to-type inline, enabling fast annotation without opening the side peek.
- **Package linking via search chip**: The "Package" column shows "Unlinked" as a warning-coloured chip. Clicking it opens a search popup to find and link a package inline, right in the table row.
- **Property bar in side peek**: The peek panel shows call properties (Status, Package, Priority, Coordinator) as labelled chips at the top, all editable in place.

### Sources
- [Database properties - Notion Help Center](https://www.notion.com/help/database-properties)
- [Table view - Notion Help Center](https://www.notion.com/help/tables)
- [How to Bulk Edit Properties in Notion](https://www.notionapps.com/blog/notion-bulk-edit-2025)

---

## Pattern 4: Filtering, Sorting, and Grouped Views

### What It Is
Notion provides a composable filtering and sorting system that sits above the database view:

- **Filter bar**: A horizontal bar below the view tabs showing active filters as removable pills. A "Filter" button opens a filter builder.
- **Filter builder**: An inline form where users add conditions: Property + Operator + Value (e.g., "Status is Pending", "Date is Today", "Package is empty").
- **AND/OR logic**: Multiple filters combine with AND by default. Users can switch to OR or create nested filter groups.
- **Sort controls**: A "Sort" button opens a panel to add sort rules: Property + Direction (ascending/descending). Multiple sorts chain.
- **Grouping**: A "Group" option groups rows by a select property, creating collapsible sections in the table (e.g., grouped by Status).

### How It Works (Interaction Details)
- **Persistent filters per view**: Each saved view remembers its filter and sort configuration. Switching views swaps the entire filter/sort state.
- **Quick filter pills**: Active filters appear as small pills in the filter bar (e.g., "Status: Pending | x"). Clicking "x" removes the filter. Clicking the pill text opens the filter for editing.
- **Filter suggestions**: The filter builder suggests property values based on existing data (e.g., showing all existing status values as options).
- **Search**: A search input in the view toolbar performs a text search across all visible properties, narrowing the displayed rows in real time.
- **Group toggle**: When grouped, each group header shows a count (e.g., "Pending (12)") and can be collapsed/expanded. This provides a quick overview of distribution.

### Why It Matters
- **Workflow-specific views**: Coordinators can create a "My Unlinked Calls" view with filters pre-set to `Status = Unlinked AND Coordinator = Me`, then switch to "All Pending" with a single click.
- **Reduced repetition**: Without saved filters, coordinators would manually set the same filters every session. Saved views eliminate this friction.
- **Data overview via grouping**: Grouping by status in the table view gives an instant count of how many calls are in each state, without needing a separate dashboard.

### Application to Calls Inbox
- **Pre-built saved views**: "My Queue" (assigned to me, pending), "Unlinked" (package = empty), "Completed Today" (status = completed, date = today), "All Calls" (no filters).
- **Quick search**: A search input in the toolbar lets coordinators search for a caller name or phone number across all calls.
- **Grouped table**: Optionally group by status to see "Unlinked (5)", "Ready for Review (8)", "Completed (22)" as collapsible sections in the table.
- **Filter pills**: Active filters shown as pills above the table, easily removable, so coordinators always know why they are seeing a subset.

### Sources
- [Views, filters, sorts & groups - Notion Help Center](https://www.notion.com/help/views-filters-and-sorts)
- [Using advanced database filters - Notion Help Center](https://www.notion.com/help/guides/using-advanced-database-filters)

---

## Pattern 5: Relations and Linked Databases

### What It Is
Notion allows database entries to reference entries in other databases through "Relation" properties:

- **Relation property**: A property type that links one database entry to one or more entries in another database. Displayed as clickable chips showing the related entry's title.
- **Rollup property**: A property that pulls a value from the related entry (e.g., showing the related package's "Level" or "Status" directly on the call entry).
- **Bi-directional relations**: When Database A has a relation to Database B, Database B automatically gets a corresponding relation back to Database A. Both sides are aware of the connection.
- **Linked database views**: A database view can be embedded in another page, showing a filtered subset of entries (e.g., a package page showing all calls linked to that package).

### How It Works (Interaction Details)
- **Adding a relation**: Click the relation cell (or chip). A search popup appears with a text input. Type to search the target database. Click a result to create the link.
- **Multiple relations**: A single call can link to multiple packages if the relation allows it. Each linked entry appears as a separate chip.
- **Removing a relation**: Hover over a relation chip, click "x" to remove the link.
- **Navigating relations**: Click a relation chip to peek into the related entry (opens in side peek or navigates to the page). This enables quick context switching: "Let me check this package's details before linking."
- **Empty state**: When no relation exists, the cell shows "Empty" or a subtle "+" button, signalling that a link can be added.
- **Rollup display**: Rollup values appear as read-only properties on the entry. For example, a call linked to a package could display the package's client name, package level, and active status without the coordinator needing to navigate to the package.

### Why It Matters
- **Data integrity**: The call-to-package link is a first-class relationship, not a text field prone to typos. Selecting from a search ensures the link points to a real package.
- **Context surfacing**: Rollups bring package context (client name, level, status) directly into the call row, eliminating the need to open the package to check basic info.
- **Bi-directional awareness**: The package page can show "Related Calls" as a linked database view, giving supervisors a way to see all calls associated with a package.
- **Visual indicators**: The presence or absence of a relation chip (linked vs "Empty") creates an instant visual signal for unlinked calls that need attention.

### Application to Calls Inbox
- **Call-to-Package relation**: Each call has a "Package" relation property. When linked, it shows the package name as a teal chip. When unlinked, it shows an orange "Unlinked" warning chip.
- **Quick link workflow**: Click the "Unlinked" chip, search for the package by name or number, click to link. The chip updates immediately. No form, no modal, no page reload.
- **Package context rollup**: Once linked, the call row in the table shows the package's client name and level as additional columns, giving the coordinator context at a glance.
- **Relation filter**: "Show only unlinked calls" is a filter on the Package relation property: "Package is empty". This creates the triage workflow view.
- **Suggested matches**: The search popup can show suggested packages based on the caller's phone number, pre-filling the most likely match to speed up linking.

### Sources
- [Relations and rollups - Notion Help Center](https://www.notion.com/help/relations-and-rollups)
- [Filtering Notion Relational Properties](https://www.landmarklabs.co/notion-tutorials/notion-filter-relation)
- [Using advanced database filters](https://www.notion.com/help/guides/using-advanced-database-filters)

---

## Summary: Key Patterns for TC Portal

| Pattern | Notion Behaviour | TC Portal Application |
|---------|-----------------|----------------------|
| Database Views | Table/Board/List/Gallery/Calendar/Timeline | Table for batch scanning, Board for visual progress tracking |
| Side Peek | Right panel slides in, list stays visible | Review call detail without losing queue position |
| Inline Editing | Click any cell/chip to edit in place | Quick status changes, notes, package linking in table |
| Filtering & Sorting | Composable filters, saved views, grouping | "My Queue", "Unlinked", "Completed Today" as preset views |
| Relations | Typed links between databases, rollups | Call-to-Package linking with search, context rollup |

---

## References

1. [Intro to databases - Notion Help Center](https://www.notion.com/help/intro-to-databases)
2. [Views, filters, sorts & groups - Notion Help Center](https://www.notion.com/help/views-filters-and-sorts)
3. [Database properties - Notion Help Center](https://www.notion.com/help/database-properties)
4. [Table view - Notion Help Center](https://www.notion.com/help/tables)
5. [Relations and rollups - Notion Help Center](https://www.notion.com/help/relations-and-rollups)
6. [Create a Flexible Workspace with Notion's Kanban Boards](https://www.notion.com/use-case/kanban-board)
7. [How to Change Notion's Side Peek Setting](https://www.makeuseof.com/change-notion-side-peek-setting/)
8. [Efficiently Using Peek Pages in Notion](https://www.sparxno.com/blog/peek-pages-notion)
9. [Notion Releases - Database side peek](https://www.notion.com/releases/2022-07-20)
10. [Design Critique: A Breakdown of Notion](https://medium.com/@yolu.x0918/a-breakdown-of-notion-how-ui-design-pattern-facilitates-autonomy-cleanness-and-organization-84f918e1fa48)
11. [Using advanced database filters - Notion Help Center](https://www.notion.com/help/guides/using-advanced-database-filters)
12. [How to Bulk Edit Properties in Notion](https://www.notionapps.com/blog/notion-bulk-edit-2025)
13. [Filtering Notion Relational Properties](https://www.landmarklabs.co/notion-tutorials/notion-filter-relation)
