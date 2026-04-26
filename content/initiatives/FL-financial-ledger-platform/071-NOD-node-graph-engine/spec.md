---
title: "Feature Specification: NODE — Graph-First Financial Operating System"
---

# Feature Specification: NODE — Graph-First Financial Operating System

**Feature Branch**: `071-node-graph-engine`
**Created**: 2026-03-22
**Status**: Draft

---

## Core Concept

NODE is a visualisation tool that renders the relationships between financial entities as an interactive force-directed graph. It provides instant comprehension of complex multi-entity structures — who owns what, how entities relate, and how the network has evolved over time.

**Every node is a workspace.** Companies, trusts, partnerships, sole traders, and personal entities are all workspaces. Personal entities represent people — a person's Personal entity exists in the graph whether or not that person has ever logged into the platform. An accountant can model an entire client's family structure without anyone else having a login.

**Every edge is a relationship.** Ownership, control, beneficiary, trustee, director, shareholding, subsidiary — all stored in one `entity_relationships` table. Any entity type can connect to any other entity type. A trust can be trustee of another trust. A company can be beneficiary of a trust. A personal entity can hold shares in a listed company.

**Groups are visual containers.** WorkspaceGroups provide an optional visual boundary around clusters of related entities. The group doesn't create relationships — the edges do. Remove the group border and the organism still exists because the ownership and control edges hold it together.

---

## Out of Scope

The following are explicitly NOT part of 071-NOD. They belong to separate epics in the broader platform vision:

- Money flow animation between entities (invoice/payment edges)
- Contact, asset, loan, or bank account nodes — these are detail-panel content, not graph nodes
- Estate & succession planning
- Messaging / communication layer
- Workflow automation triggered by graph events
- Credit scoring / lending integration
- AI insights on the graph
- ASIC auto-lookup & relationship suggestions (deferred — see `context/rich_context/asic-integration-future.md`)
- Education & learning platform
- Graph presets / saved views (future enhancement)
- Stakeholder invitations from the graph (future enhancement)

---

## User Scenarios & Testing

### User Story 1 — View Entity Structure (Priority: P1)

As an entity owner or advisor, I can open the graph page and see all my entities and their relationships as an interactive visual map.

Each entity appears as a node — sized by net worth and coloured by entity type (company, trust, personal, sole trader, partnership). Lines between nodes show relationships: ownership percentages, trustee/beneficiary links, directorships, and shareholdings. Personal entities visually represent the people in the structure, whether or not they have platform logins.

Users can drag nodes to rearrange the layout, zoom in/out, and pan across the network. The graph uses a force-directed layout that naturally clusters related entities together. WorkspaceGroups appear as visual containers around their member entities.

**Why this priority**: This is the foundational experience — visualising the entity structure is the entire product. Without this, nothing else matters.

**Independent Test**: Can be fully tested by navigating to the graph page and verifying that the user's workspaces appear as nodes with correct relationship edges between them.

**Acceptance Scenarios**:

1. **Given** a user with access to a group containing 5 entities (2 companies, 1 trust, 2 personal), **When** they open the graph page, **Then** they see 5 nodes coloured by entity type, connected by relationship edges showing ownership percentages and roles
2. **Given** a Personal entity "John Smith" owns 100% of "Smith Holdings" and is beneficiary of "Smith Family Trust", **When** the graph renders, **Then** the John Smith node connects to both entities with labelled edges ("owns 100%", "beneficiary")
3. **Given** a Personal entity exists for a person who has never logged in, **When** the graph renders, **Then** that Personal entity still appears as a node with its relationship edges
4. **Given** a graph is displayed, **When** the user drags a node, **Then** the node moves, connected edges follow, and the force layout re-settles smoothly
5. **Given** entities belong to a WorkspaceGroup, **When** the graph renders, **Then** a visual container boundary surrounds those entities with the group name as a label

---

### User Story 2 — Explore Entity Details (Priority: P1)

As a user viewing the graph, I can click any entity node to see a slide-out detail panel showing a summary of that entity's financial position — without leaving the graph view.

The detail panel shows:
- Entity name, type, and base currency
- Net position (total assets minus total liabilities)
- Number of contacts, open invoices, and active projects
- Health score (if available)
- List of relationships (connected entities with relationship types and percentages)
- Recent activity count

For Personal entities (representing people), the panel also shows which entities they are connected to and their role in each (owner, director, beneficiary, trustee).

The panel includes a "Go to entity" link that navigates to the existing workspace dashboard for that entity.

**Why this priority**: Click-to-explore is what makes the graph useful, not just pretty. Without detail panels, the graph is a picture with no depth.

**Independent Test**: Can be tested by clicking each entity type and verifying the correct summary data appears in the slide-out panel with a working navigation link.

**Acceptance Scenarios**:

1. **Given** a graph with a company entity node, **When** the user clicks the node, **Then** a slide-out panel appears showing the entity's name, type, currency, net position, and relationship list
2. **Given** a graph with a Personal entity node, **When** the user clicks the node, **Then** the panel shows the person's name and all entities they connect to with their role (owner, director, beneficiary, trustee)
3. **Given** a detail panel is open, **When** the user clicks "Go to entity", **Then** they navigate to the existing workspace dashboard for that entity
4. **Given** a detail panel is open, **When** the user clicks a different node, **Then** the panel updates to show the new node's details
5. **Given** a detail panel is open, **When** the user presses Escape, **Then** the panel closes and the graph remains visible
6. **Given** "John" owns 60% of "Holdings" (directed edge from John to Holdings), **When** the user clicks the "Holdings" node to open the detail panel, **Then** the relationships list shows the inverse label "owned by John 60%" (reflecting the inbound relationship from the target's perspective)

---

### User Story 3 — Create and Edit Relationships (Priority: P1)

As an accountant or entity owner, I can create, edit, and remove relationships between entities directly from the graph — building the structure visually.

To create a relationship: drag from one node to another, or right-click a node and select "Add relationship". A form appears asking for the target entity, relationship type (owns, trustee_of, beneficiary_of, director_of, holds_shares, subsidiary_of, partner_in, controls), and optional percentage.

To edit: click an edge label to modify the relationship type or percentage. To remove: right-click an edge and select "Remove relationship".

Changes persist immediately to the `entity_relationships` table. The graph animates to reflect structural changes.

**Why this priority**: The graph isn't just a viewer — it's the primary tool for building entity structures. Without the ability to create relationships, the graph is empty on first use.

**Independent Test**: Can be tested by dragging between two entity nodes, filling in the relationship form, and verifying the edge appears with correct label and persists after page refresh.

**Acceptance Scenarios**:

1. **Given** two unconnected entity nodes, **When** the user drags from one to the other, **Then** a relationship form appears asking for type and optional percentage
2. **Given** the relationship form is submitted with "owns 60%", **When** the form saves, **Then** a new edge appears between the nodes labelled "owns 60%"
3. **Given** an existing edge, **When** the user clicks the edge label, **Then** an edit form appears allowing them to change the type or percentage
4. **Given** an existing edge, **When** the user right-clicks and selects "Remove relationship", **Then** the edge is removed after confirmation
5. **Given** a new relationship is created, **When** the user refreshes the page, **Then** the relationship persists
6. **Given** the graph canvas is displayed, **When** the user right-clicks the canvas background and selects "New entity", **Then** a quick entity creation form appears, and on submit a new standalone node appears at the click position
7. **Given** an existing entity node, **When** the user right-clicks the node and selects "Add related entity", **Then** a form appears to create a new entity and define the relationship in one step, resulting in a new node connected to the original by the specified edge

---

### User Story 4 — Time Slider (Priority: P2)

As a user viewing the graph, I can drag a time slider to see how the entity structure has changed over time — entities added, relationships formed, ownership changed.

The time slider sits below the graph and spans from the earliest entity creation date to the present. Dragging it back in time:
- Removes entity nodes that didn't exist yet (filtered by `created_at`)
- Removes relationship edges that hadn't been established yet (filtered by `created_at`)
- Adjusts node sizes to reflect net worth at that point in time (derived from journal entries posted up to that date)

A "play" button animates the slider forward, showing the structure growing and evolving over time. This is powerful for client presentations, year-end reviews, and demonstrating how financial complexity has grown.

Event sourcing makes this possible — all journal entries are timestamped immutable events, so historical balances can be reconstructed by summing entries up to any date.

**Why this priority**: This is the "wow" feature that demonstrates the platform's depth and differentiates NODE from static org charts.

**Independent Test**: Can be tested by dragging the slider to a historical date and verifying that only entities and relationships that existed at that date are shown, with correct historical net worth values.

**Acceptance Scenarios**:

1. **Given** an entity was created on 1 March 2026, **When** the user drags the slider to 15 February 2026, **Then** that entity node disappears from the graph
2. **Given** the slider is at a historical date, **When** an entity's net worth was $50,000 at that date (currently $150,000), **Then** the node size reflects the historical $50,000 value
3. **Given** a relationship was created on 15 March 2026, **When** the slider is before that date, **Then** the relationship edge is not visible
4. **Given** the user clicks "play", **Then** the slider advances automatically and the graph animates to show the structure evolving over time

---

### User Story 5 — Search and Filter (Priority: P2)

As a user viewing a graph with many entities, I can search for a specific entity by name and filter by entity type.

Search: A search bar at the top of the graph page. Typing filters matching entities in real time. Selecting a result zooms the graph to centre on that node and highlights it with a pulse animation.

Filters:
- By entity type: company, trust, sole trader, personal, partnership
- By status: active, archived
- By relationship: "show only entities connected to [selected node]"

Active filters appear as removable chips below the search bar.

**Why this priority**: Essential for structures with more than 10 entities. Without search, users can't find specific entities in complex groups.

**Independent Test**: Can be tested by searching for a known entity name and verifying the graph centres on it, then applying type filters and verifying node visibility changes.

**Acceptance Scenarios**:

1. **Given** a graph with 20+ entity nodes, **When** the user types "Smith" in the search bar, **Then** matching nodes are highlighted and non-matching nodes dim
2. **Given** search results are showing, **When** the user selects a result, **Then** the graph smoothly pans and zooms to centre on that node
3. **Given** the graph shows all entity types, **When** the user filters to "trusts only", **Then** non-trust nodes fade out, leaving only trust entities and their connecting edges
4. **Given** a filter is active, **When** the user removes the filter chip, **Then** all previously hidden nodes reappear

---

### User Story 6 — Keyboard Navigation (Priority: P2)

As a keyboard-first user, I can navigate and interact with the graph via keyboard shortcuts.

| Shortcut | Action |
|----------|--------|
| `G then N` | Go to Graph (NODE) page |
| `Tab` / `Shift+Tab` | Cycle through nodes (focus ring visible) |
| `Enter` | Open detail panel for focused node |
| `Escape` | Close detail panel / clear search |
| `/` | Focus search |
| `+` / `-` | Zoom in / out |
| `0` | Reset zoom to fit all nodes |
| `N` | New entity (create) |
| `R` | New relationship (from focused node) |

**Why this priority**: The platform's keyboard-first design principle requires keyboard support for all primary interactions.

**Independent Test**: Can be tested by pressing Tab to focus nodes, Enter to open panels, and shortcut keys to zoom — all without a mouse.

**Acceptance Scenarios**:

1. **Given** the graph is displayed, **When** the user presses Tab repeatedly, **Then** focus moves between nodes with a visible focus ring, and the graph pans to keep the focused node visible
2. **Given** a node is focused, **When** the user presses Enter, **Then** the detail panel opens for that node
3. **Given** the graph is displayed, **When** the user presses `?`, **Then** the keyboard shortcut help overlay includes all graph shortcuts

---

### Edge Cases

- What happens when a group has no entity relationships defined? → Show entity nodes within the group container but with no edges. Display a prompt: "Drag between entities to define relationships"
- What happens when an entity is archived? → Node appears dimmed/faded with a visual indicator. Relationships remain visible but styled as inactive
- What happens when two entities have multiple relationship types (e.g., Company A is both a shareholder and trustee of Trust B)? → Show multiple edges between the same nodes, each labelled with its type
- What happens on mobile? → Desktop/tablet only for MVP. Mobile shows a simplified list view of entities and relationships instead of the interactive graph
- What happens when a user has access to only some entities in a group? → Only visible entities and their relationships are shown. Hidden entities are not rendered (no "mystery nodes")
- What happens when entity relationships create a circular structure (A owns B, B owns C, C owns A)? → The graph handles cycles naturally — force-directed layout supports circular references. Edges render correctly in both directions
- What happens when two entities have duplicate relationship types (e.g., different share classes)? → Allowed. Multiple edges of the same type between the same pair are permitted. Each edge is rendered separately with its own label
- What happens when a user tries to create a self-referential relationship (entity to itself)? → Blocked with a validation error. An entity cannot have a relationship with itself
- What happens when an entity has no relationships (orphan)? → Shown in an ungrouped area floating outside any group container so it remains visible and discoverable
- What happens when groups are nested (group within a group)? → Flattened to top-level containers only for MVP. Nested group hierarchies are not visualised — all groups render at the same level

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST store entity-to-entity relationships in a dedicated table with: source entity, target entity, relationship type, optional percentage, and soft-delete support
- **FR-002**: System MUST support relationship types: owns, holds_shares, beneficiary_of, trustee_of, director_of, subsidiary_of, partner_in, controls
- **FR-003**: System MUST render entities (workspaces) as interactive nodes in a force-directed graph, coloured by entity type and sized by net worth
- **FR-004**: System MUST render relationships as labelled edges between entity nodes, showing type and percentage where applicable
- **FR-005**: System MUST render WorkspaceGroups as visual container boundaries around their member entities
- **FR-006**: System MUST treat Personal entities (entity_type = personal) as the representation of people in the graph, regardless of whether the person has a platform login
- **FR-007**: Users with owner or accountant role MUST be able to create relationships by dragging between nodes or via a right-click context menu. Other roles can view but not edit
- **FR-008**: Users with owner or accountant role MUST be able to edit relationship type and percentage by clicking an edge label
- **FR-009**: Users with owner or accountant role MUST be able to remove relationships via right-click context menu with confirmation
- **FR-010**: Users MUST be able to click any node to view a contextual detail panel showing entity summary, financial position, and relationship list
- **FR-011**: System MUST respect workspace access permissions — users only see entities they have authorisation to view
- **FR-012**: System MUST provide a time slider that filters the graph to show only entities and relationships that existed at the selected date, with node sizes reflecting historical net worth
- **FR-013**: Users MUST be able to search the graph by entity name and filter by entity type and status
- **FR-014**: System MUST handle graphs with up to 200 entity nodes without perceptible lag (target: 60fps interaction)
- **FR-015**: System MUST support keyboard navigation for all primary graph interactions
- **FR-016**: Users MUST be able to navigate from a node's detail panel to the full workspace dashboard for that entity
- **FR-017**: System MUST render edge tooltips on hover showing relationship details
- **FR-018**: System MUST display a simplified list view of entities and relationships on mobile devices — the interactive graph canvas is desktop/tablet only for MVP
- **FR-019**: System MUST warn (but not block) when ownership percentages for a target entity exceed 100%
- **FR-020**: System MUST soft-delete entity relationships when either connected entity is archived, preserving them for time slider history
- **FR-021**: System MUST auto-infer basic group membership edges from existing WorkspaceGroup data on first load, so the graph is not empty for existing users
- **FR-022**: System MUST allow any user with workspace access to view the graph, but restrict relationship create/edit/delete to owner and accountant roles
- **FR-023**: System MUST treat relationships as directed — source and target matter (e.g., "John owns Holdings" is different from "Holdings owns John"). The target node's detail panel MUST show the inverse label (e.g., "owned by John 60%")
- **FR-024**: System MUST allow multiple relationships of the same type between the same entity pair (e.g., different share classes). Each duplicate edge is rendered and stored separately
- **FR-025**: System MUST version relationship changes with timestamps, preserving a history of modifications. The time slider MUST reflect historical relationship percentages and types at any point in time
- **FR-026**: System MUST differentiate node shapes by entity type: circle for personal/people, square for company, triangle for trust, diamond for partnership, pentagon for sole trader
- **FR-027**: System MUST show edge labels on hover only — clean lines by default to keep the graph uncluttered at overview zoom levels
- **FR-028**: System MUST persist node positions per user across sessions so that a user's custom layout is preserved on return
- **FR-029**: System MUST provide PNG and PDF export of the current graph view via an export button, suitable for presentations and reports
- **FR-030**: System MUST support single undo (Ctrl+Z / Cmd+Z) to reverse the last relationship change (create, edit, or delete)
- **FR-031**: System MUST block self-referential relationships (an entity cannot have a relationship with itself) and display a validation error when attempted
- **FR-032**: System MUST display orphan entities (those with no relationships) in an ungrouped area floating outside any group container, ensuring they remain visible and discoverable
- **FR-033**: System MUST be accessible via a top-level sidebar navigation item ("Structure" or "Network") in the main application navigation
- **FR-034**: System MUST centre the graph on the current workspace context on initial load, so the user sees the entity they navigated from
- **FR-035**: System MUST render group containers as flat (top-level only) for MVP — nested group hierarchies are not visualised
- **FR-036**: System MUST be desktop/tablet only for MVP — mobile devices show a simplified list view of entities and relationships instead of the interactive graph canvas

### Key Entities

- **Entity Relationship**: A persisted record linking two workspaces with a relationship type (owns, trustee_of, beneficiary_of, director_of, holds_shares, subsidiary_of, partner_in, controls) and optional percentage. Source and target are both workspaces. Any entity type can connect to any other entity type. Stored in `entity_relationships` table
- **Graph Node**: A visual element representing a workspace (entity). Has a type (derived from workspace entity_type), label (workspace name), size (derived from net worth), colour (derived from entity type), and interactive position. Personal entities visually represent people
- **Graph Edge**: A visual connection between two entity nodes representing an Entity Relationship. Shows relationship type label and percentage. Supports multiple edges between the same pair of nodes
- **Graph Container**: A visual boundary representing a WorkspaceGroup. Contains member entity nodes. Labelled with group name. Does not create relationships — only provides visual organisation

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can comprehend a 10-entity structure within 30 seconds of opening the graph (measured by time to first node click)
- **SC-002**: Graph renders and becomes interactive within 2 seconds for structures with up to 50 entities
- **SC-003**: An accountant can build a 5-entity structure with relationships in under 3 minutes using drag-to-connect
- **SC-004**: 80% of users with 3+ entities use the graph page at least once per month after launch
- **SC-005**: Users can identify all entities connected to a specific person (Personal entity) in under 2 clicks
- **SC-006**: Graph interaction maintains 60fps on modern browsers for structures up to 200 entities
- **SC-007**: All graph interactions are accessible via keyboard — no mouse-only actions

---

## Clarifications

### Session 2026-03-22

- Q: What are the node types? → A: Nodes are workspaces only. All entity types (company, trust, personal, sole trader, partnership). No contacts, users, assets, or accounts as separate nodes
- Q: How are people represented? → A: Personal entities (workspaces with entity_type = personal) represent people. A person exists in the graph whether or not they have a platform login. An accountant can model a client's entire structure without anyone else logging in
- Q: What are the edge types? → A: Entity-to-entity relationships only. Ownership, shareholding, beneficiary, trustee, director, subsidiary, partner, control. Stored in one `entity_relationships` table. Any entity type can connect to any other
- Q: What is the primary use case? → A: Visualisation and presentation tool. Show clients their structure, onboard new advisors, present at advisory meetings. Clean, beautiful, simple
- Q: What about groups? → A: WorkspaceGroups are visual containers only. They provide a boundary around related entities but don't create relationships. The edges are the structure
- Q: Graph computation strategy? → A: Hybrid — compute on-demand for small graphs, cached projection for larger networks
- Q: Tech stack? → A: react-force-graph-2d (frontend) + PostgreSQL (backend, no graph DB). One new `entity_relationships` table
- Q: Is the time slider feasible? → A: Yes. Entity structure via `created_at` filtering. Historical net worth via journal entry date queries (event sourcing provides timestamped immutable events)
- Q: Out of scope? → A: All items from the broader NODE vision doc that aren't the graph: money flow animation, estate planning, education, messaging, workflow automation, credit scoring, AI insights, ASIC lookup, contact/asset/loan nodes, presets, stakeholder invitations
- Q: Relationship lifecycle on entity archive? → A: Soft-delete relationships alongside the entity. Preserves history for time slider but hides from current graph view
- Q: Percentage validation? → A: Warn but allow when ownership percentages exceed 100%. Accountants need flexibility during setup and restructuring
- Q: First-time experience? → A: Auto-infer group membership edges from existing WorkspaceGroup data so the graph has content on first load. User adds ownership/control details on top
- Q: Who can view vs edit? → A: Anyone with workspace access can view the graph (seeing only entities they can access). Only owner and accountant roles can create/edit/delete relationships

### Session 2026-03-22 (Round 2)

- Q5: Entity creation — canvas vs node? → A: Both. Right-click canvas for standalone entity creation. Right-click existing node for "Add related entity" which creates the entity and relationship in one step
- Q6: Relationship direction — directed vs undirected? → A: Directed. Source and target matter — "John owns Holdings" is different from "Holdings owns John". Direction IS the meaning. Additionally, the target node's detail panel shows the inverse label (e.g., "owned by John 60%")
- Q7: Duplicate relationships — allow or block? → A: Allow duplicates. Multiple edges of the same type between the same pair are permitted (e.g., different share classes). Each edge is rendered separately
- Q8: Relationship history — current only vs versioned? → A: Versioned. Keep history of changes with timestamps. Time slider shows historical percentages and relationship states
- Q9: Node shapes — uniform or differentiated? → A: Shapes per entity type. Circle = personal/people, Square = company, Triangle = trust, Diamond = partnership, Pentagon = sole trader
- Q10: Edge labels — always visible or on hover? → A: On hover only. Clean lines by default. Labels appear on hover to keep graph clean at overview zoom levels
- Q11: Node position persistence — ephemeral or saved? → A: Save per user. Each user's node positions persist across sessions
- Q12: Graph canvas theme — match app or fixed? → A: Match app theme. Dark if app is dark, light if light
- Q13: Graph export — none or PNG/PDF? → A: PNG/PDF export. Button to export current view as image or PDF for presentations
- Q14: Undo/redo — none or single undo? → A: Single undo. Ctrl+Z (Cmd+Z on Mac) undoes the last relationship change
- Q15: Multi-select — yes or no? → A: No multi-select for MVP. One node at a time
- Q16: Real-time updates — yes or no? → A: No real-time for MVP. Refresh to see changes from other users
- Q17: Orphan entities — hide or show? → A: Show in ungrouped section. Floating outside any container so they are visible and discoverable
- Q18: Bulk import — MVP or later? → A: Not for MVP. Manual creation only
- Q19: Self-referential relationships — allow or block? → A: Block. Prevent self-referential relationships with a validation error
- Q20: Audit trail — basic or full? → A: Basic timestamps. created_at, updated_at, created_by on the entity_relationships table
- Q21: Entry point — sidebar or nested? → A: Top-level sidebar item. "Structure" or "Network" in main navigation
- Q22: Default graph centre — all entities or current? → A: Current workspace. Centre on the entity the user navigated from
- Q23: Group nesting — flat or nested? → A: Flat groups only for MVP. Only top-level groups render as containers
- Q24: Mobile priority — responsive or desktop-first? → A: Desktop only for MVP. Mobile shows simplified list view instead of interactive graph
