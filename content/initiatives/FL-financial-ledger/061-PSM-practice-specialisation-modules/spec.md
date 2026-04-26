---
title: "Feature Specification: Practice Specialisation & Module Gating"
---

# Feature Specification: Practice Specialisation & Module Gating

**Feature Branch**: `061-PSM-practice-specialisation-modules`
**Created**: 2026-03-21
**Status**: Draft
**Epic**: 061-PSM
**Initiative**: FL — Financial Ledger Platform
**Effort**: L (3-4 sprints)
**Depends On**: 015-ACT (complete), 027-PMV (complete), 038-FGP (specced), 028-CFT (complete), 044-TAX (complete), 051-EHS (specced)

### Out of Scope

- **Automatic module discovery** — v1 uses a static mapping from practice type to modules; no AI-driven or usage-based suggestions
- **Practice type marketplace** — no self-service module store or add-on purchasing per practice type
- **Drag-and-drop hierarchy editing in org chart** — v1 tree is read-only for all users; hierarchy editing remains in the existing 028-CFT entity structure panel
- **Custom KPI dashboards per family** — wealth advisor dashboard uses a fixed layout in v1; custom widget arrangements deferred
- **Ownership percentage modelling** — org chart edges show relationship type but not ownership percentages or beneficial interest splits
- **Real-time financial data on tree nodes** — node net worth values are cached (5-minute TTL matching 028-CFT), not live-streaming
- **Mobile-native org chart** — responsive web layout only; native app deferred

---

## Overview

MoneyQuest's practice management infrastructure (015-ACT, 027-PMV) treats every practice identically — an accounting firm, a financial planner, an estate lawyer, and a bookkeeper all see the same modules, the same dashboard, and the same workspace features. This creates two problems: practices see modules irrelevant to their specialisation (bookkeepers see tax compliance, estate planners see BAS), and the platform cannot serve the wealth advisory market because there is no family-centric visualisation or advisor-level dashboard.

This epic introduces three capabilities:

1. **Practice Types & Module Gating** — a `PracticeType` enum that determines which modules are available to a practice's connected workspaces. An accounting practice unlocks Tax and BAS; a wealth advisor unlocks Consolidation, Family Tree, and Entity Health. Practices can hold multiple specialisations (union of modules).

2. **Family Tree / Org Chart View** — an interactive visual tree rendering the hierarchy of entities within a workspace group (from 038-FGP). Each node shows entity name, type icon, net worth, and health score. Click to drill into a workspace. This is the visual representation of the 028-CFT consolidation structure that wealth advisors and family members have been missing.

3. **Wealth Advisor Dashboard** — a dedicated dashboard preset for practices with the `wealth_advisory` type. Shows total AUM across all client families, per-family org chart cards, aggregated alerts, and one-click drill-down into any family or entity.

Together, these features open MoneyQuest to the wealth advisory market segment, simplify module management for all practice types, and deliver the "family-first" UX that makes complex multi-entity structures comprehensible at a glance.

---

## User Scenarios & Testing

### User Story 1 — Set Practice Type During Onboarding (Priority: P1)

A sole practitioner registers as an accounting practice. During the 027-PMV onboarding wizard, they are asked "What type of practice are you?" and select "Accounting". The system stores this as their practice type, and all client workspaces they connect to automatically receive Tax, BAS, Compliance, Reporting, and Reconciliation modules — without the practice needing to configure feature flags per workspace.

**Why this priority**: Practice type is the foundational data that drives all module gating. Without it, there is no basis for filtering modules. This must be set before any client workspaces are connected so the gating takes effect from the first connection.

**Independent Test**: Complete the onboarding wizard selecting "Accounting" as practice type. Create a client workspace. Verify the workspace has Tax and BAS modules enabled and does not have Wills or Family Tree modules.

**Acceptance Scenarios**:

1. **Given** I am a new user completing the practice onboarding wizard (027-PMV), **When** I reach the "Practice Type" step, **Then** I see a selection of practice types: Accounting, Financial Planning, Estate Planning, Wealth Advisory, and Bookkeeping, each with a brief description and a list of modules it unlocks.

2. **Given** I select "Accounting" as my practice type, **When** the onboarding completes, **Then** my practice record has `practice_type = accounting` stored, and the practice settings page shows "Accounting" as my current type.

3. **Given** I selected "Accounting" during onboarding, **When** I connect to a client workspace, **Then** that workspace automatically has the following modules enabled via feature flags: Tax (044-TAX), BAS, Compliance, Reporting, and Reconciliation. Modules not in the accounting set (Wills, Family Tree, Goals) are not enabled.

4. **Given** I am an existing practice with no type set, **When** I visit the practice settings page after the migration, **Then** I see a prompt to confirm my practice type (defaulting to "Accounting") with the ability to change it.

---

### User Story 2 — Change Practice Type in Settings (Priority: P1)

An accounting practice has grown into financial planning and wants to add that specialisation. The practice owner opens Settings, adds "Financial Planning" to their specialisations, and all connected client workspaces immediately gain access to Goals, Cash Flow Forecasting, and Asset Register modules — in addition to the existing accounting modules.

**Why this priority**: Practices evolve. A practice must be able to add or change specialisations without re-onboarding. This is also the mechanism for multi-specialisation practices.

**Independent Test**: Set a practice to "Accounting" only. Add "Financial Planning" as a second specialisation. Verify connected workspaces now have both accounting modules AND financial planning modules enabled.

**Acceptance Scenarios**:

1. **Given** I am a practice owner on the Settings page, **When** I open the "Practice Specialisation" section, **Then** I see my current type(s) displayed as toggleable cards, with the ability to add or remove specialisations.

2. **Given** my practice is "Accounting" only, **When** I add "Financial Planning" as a second specialisation, **Then** the system recalculates module access for all connected client workspaces — adding Goals (037-GLS), Cash Flow Forecasting (041-CFF), and Asset Register (033-FAR) modules via feature flags.

3. **Given** I remove a specialisation (e.g., removing "Financial Planning"), **When** the change is saved, **Then** modules unique to that specialisation are disabled on connected workspaces, but modules shared with remaining specialisations are preserved. A confirmation dialog warns about module removal before proceeding.

4. **Given** I have multiple specialisations, **When** I view the available modules list, **Then** it shows the union of all modules from all active specialisations — no duplicates.

---

### User Story 3 — Module Gating on Workspace Connection (Priority: P1)

A bookkeeping practice connects to a new client workspace via the invite link flow. The system checks the practice type ("Bookkeeping") and enables only Core Ledger, Banking, Invoicing, and Contacts modules on the workspace. The workspace owner does not see Tax, Wills, Goals, or any modules outside the bookkeeping set.

**Why this priority**: Module gating must activate automatically when a practice-workspace connection is established. Manual per-workspace configuration defeats the purpose of practice-level typing.

**Independent Test**: Create a bookkeeping practice. Connect to a client workspace. Verify the workspace sidebar navigation shows only Core Ledger, Banking, Invoicing, and Contacts — not Tax, BAS, Wills, or Goals.

**Acceptance Scenarios**:

1. **Given** a bookkeeping practice connects to a new client workspace, **When** the connection is established, **Then** the workspace's feature flags are automatically set to enable only the bookkeeping module set: Core Ledger, Banking, Invoicing, and Contacts.

2. **Given** a client workspace is connected to both an accounting practice and a financial planning practice, **When** module access is calculated, **Then** the workspace receives the union of both practices' modules — all accounting modules plus all financial planning modules.

3. **Given** a client workspace is disconnected from all practices, **When** the disconnection completes, **Then** the workspace retains its current module configuration (modules are not revoked on disconnection to avoid disruption). A workspace admin can manually toggle modules from workspace settings.

4. **Given** a workspace is connected to a practice, **When** the workspace owner opens workspace settings, **Then** they see which modules are enabled and the reason ("Enabled by [Practice Name] — Accounting"), but they cannot override practice-driven module gating. They can toggle modules not controlled by a practice.

---

### User Story 4 — Module Registry API (Priority: P2)

A frontend developer building the practice settings page needs to know which modules map to which practice type. The API endpoint returns the full module registry — a mapping of practice types to their enabled modules — so the UI can display "selecting Accounting will enable: Tax, BAS, Compliance..." without hardcoding the mapping in the frontend.

**Why this priority**: The module registry is the single source of truth for practice-to-module mapping. Without it, the mapping would be duplicated between backend and frontend. P2 because the frontend can ship with a static copy initially, but the API is needed for maintainability.

**Independent Test**: Call the module registry API. Verify it returns all 5 practice types with their associated modules. Verify changing a mapping in the backend is reflected in the API response without frontend changes.

**Acceptance Scenarios**:

1. **Given** I call `GET /api/v1/practice/module-registry`, **When** the response is returned, **Then** it contains all 5 practice types, each with an array of module identifiers, display names, and epic references.

2. **Given** a new module is added to a practice type in the backend, **When** the registry API is called, **Then** the new module appears in the response without any frontend deployment.

3. **Given** I provide a specific practice type as a query parameter (`?type=accounting`), **When** the response is returned, **Then** only the modules for that type are included.

---

### User Story 5 — Family Tree Org Chart View (Priority: P1)

A wealth advisor opens their client group "Smith Family" and sees a visual org chart: Smith Family Trust at the top, with Smith Pty Ltd and Smith SMSF as children, and John Smith (personal) at the root level. Each node shows the entity name, a type icon (trust, company, SMSF, personal), net worth, and a health score badge. The advisor clicks on "Smith Pty Ltd" and navigates directly to that workspace's dashboard.

**Why this priority**: The org chart is the centrepiece of the wealth advisory experience. It is the visual answer to "what does this family own and how is it structured?" Without it, wealth advisors must hold the family structure in their heads and navigate workspace-by-workspace.

**Independent Test**: Create a workspace group with 4 entities in a parent/child hierarchy (using 028-CFT structure). Open the family tree view. Verify all 4 nodes render with correct hierarchy, net worth, and health scores. Click a node and verify navigation to that workspace.

**Acceptance Scenarios**:

1. **Given** a workspace group "Smith Family" has a hierarchy (Trust at top, Company and SMSF as children, Personal at root), **When** I open the group and navigate to the "Family Tree" tab, **Then** I see an interactive org chart with nodes connected by edges matching the hierarchy.

2. **Given** each entity in the group has balance sheet data, **When** the org chart renders, **Then** each node displays: entity name, entity type icon (trust shield, company building, SMSF lock, personal user), net worth (assets minus liabilities), and health score badge (colour-coded: green >70, amber 40-70, red <40).

3. **Given** the org chart is displayed, **When** I click on a node, **Then** I am navigated to that entity's workspace dashboard with the correct workspace context set.

4. **Given** the family trust is the root node, **When** I view the tree, **Then** the root node shows the rolled-up net worth of all entities in its subtree (trust + company + SMSF), matching the 028-CFT consolidation engine output.

5. **Given** the tree has more than 3 levels of hierarchy, **When** the chart renders, **Then** branches beyond 3 levels are collapsed by default with an expand/collapse toggle on each node.

6. **Given** the group has no financial data on any entity, **When** the tree renders, **Then** all nodes show the entity name and type icon with "No data" in place of net worth and a grey health score badge.

---

### User Story 6 — Org Chart Zoom, Pan, and Responsive Layout (Priority: P2)

A wealth advisor in a client meeting on their iPad opens a 12-entity family tree. They can pinch-to-zoom, pan across the tree, and the layout adapts to the screen size — horizontal tree on desktop, vertical list with indentation on tablet/mobile.

**Why this priority**: Usability on tablet is critical for advisor-client meetings. The tree must work on screens smaller than a desktop monitor. However, the core tree rendering (US5) must work first.

**Independent Test**: Open a 12-entity family tree on a tablet-sized viewport (1024px). Verify the layout is readable. Verify zoom and pan gestures work.

**Acceptance Scenarios**:

1. **Given** the org chart is displayed on a desktop viewport (>1280px), **When** the tree renders, **Then** it uses a horizontal layout with the root node at the top or left and children flowing downward/rightward.

2. **Given** the org chart is displayed on a tablet viewport (768-1280px), **When** the tree renders, **Then** it uses a compact layout that fits within the viewport, with scrollable overflow for large trees.

3. **Given** the tree has 10+ nodes, **When** the user scrolls or uses pinch gestures (touch) or scroll wheel (mouse), **Then** the tree zooms in/out smoothly with a minimum zoom of 50% and maximum of 200%.

4. **Given** the tree is zoomed in, **When** the user drags (touch or mouse), **Then** the tree pans to reveal offscreen nodes.

---

### User Story 7 — Org Chart with Health Score Badges (Priority: P2)

Each node in the family tree displays the entity's health score from 051-EHS as a colour-coded badge. A red badge on "Smith Pty Ltd" immediately tells the advisor that entity needs attention — without opening it.

**Why this priority**: Health scores add actionable intelligence to the tree. Without them, the advisor must open each workspace to assess status. Depends on 051-EHS being available (graceful degradation if not).

**Independent Test**: Seed a group where one entity has health score 85 (green), one has 55 (amber), and one has 25 (red). Open the tree and verify each badge renders with the correct colour.

**Acceptance Scenarios**:

1. **Given** an entity in the tree has a health score of 85, **When** the node renders, **Then** it shows a green health badge with the score "85".

2. **Given** an entity has a health score of 35, **When** the node renders, **Then** it shows a red health badge with the score "35" and the node has a subtle red border to draw attention.

3. **Given** the 051-EHS entity health score system is not yet deployed, **When** the org chart renders, **Then** nodes display without health badges (graceful degradation — no error, no placeholder).

4. **Given** a health score updates for an entity, **When** the advisor refreshes the tree (or after cache TTL expires), **Then** the badge reflects the updated score.

---

### User Story 8 — Rolled-Up Financials on Tree Nodes (Priority: P2)

The root node of the family tree shows the total family net worth — the sum of all entities in the group. Intermediate parent nodes show subtree totals. This uses the existing 028-CFT consolidation engine, surfaced visually on the tree rather than in a table.

**Why this priority**: Rolled-up financials are what make the tree a financial tool rather than just a pretty diagram. However, the tree must render first (US5) and consolidation already works (028-CFT) — this is integration, not new engine work.

**Independent Test**: Create a group with known balance sheet data across 3 entities. Open the tree. Verify the root node's net worth equals the 028-CFT consolidated net worth for the same group.

**Acceptance Scenarios**:

1. **Given** a family trust (root) has two children: Company (net worth $500k) and SMSF (net worth $300k), and the trust itself has net worth $200k, **When** the tree renders, **Then** the trust node shows a rolled-up net worth of $1M (200k + 500k + 300k).

2. **Given** a parent node has rolled-up financials, **When** I hover over the net worth figure, **Then** a tooltip shows the breakdown: "Trust: $200k, Company: $500k, SMSF: $300k".

3. **Given** inter-entity eliminations exist (028-CFT), **When** the rolled-up net worth is calculated, **Then** it excludes eliminated amounts, matching the 028-CFT consolidated total.

4. **Given** a leaf node (no children), **When** the tree renders, **Then** its net worth shows only its own assets minus liabilities — no roll-up.

---

### User Story 9 — Wealth Advisor Dashboard Overview (Priority: P1)

A wealth advisor logs into MoneyQuest and their dashboard shows a high-level overview: total AUM across all client families, number of families managed, number of entities, and an aggregated alert count (overdue items, health score drops, upcoming deadlines). This is a dedicated dashboard preset that replaces the default workspace dashboard for wealth advisory practices.

**Why this priority**: The dashboard is the wealth advisor's home screen — it determines whether they open MoneyQuest every morning or once a month. Without a purpose-built view, wealth advisors see the same generic practice dashboard that accountants and bookkeepers see.

**Independent Test**: Log in as a wealth advisor practice owner with 3 family groups. Verify the dashboard shows total AUM across all groups, per-family summary cards, and aggregated alert counts.

**Acceptance Scenarios**:

1. **Given** I am a practice owner with type "Wealth Advisory" and 3 client family groups totalling $5.2M in net worth, **When** I open my practice dashboard, **Then** I see the Wealth Advisory dashboard preset showing: total AUM ($5.2M), family count (3), entity count (12), and alert count.

2. **Given** the dashboard is displayed, **When** I look at the family cards section, **Then** I see one card per family group showing: group name, mini org chart thumbnail (3-4 visible nodes), total family net worth, average health score, and a count of attention items.

3. **Given** a family card is displayed, **When** I click on it, **Then** I navigate to the full family tree / org chart view for that group (US5).

4. **Given** I am logged in as a practice member with type "Accounting" (not wealth advisory), **When** I open the practice dashboard, **Then** I see the standard practice dashboard — not the wealth advisory preset. The wealth advisory dashboard is only available to practices with the `wealth_advisory` specialisation.

---

### User Story 10 — Wealth Advisor Dashboard Alerts (Priority: P2)

The wealth advisor dashboard shows a consolidated alerts panel drawing from all client families — overdue invoices, health score drops below thresholds, upcoming deadlines (BAS due dates, tax filing deadlines), and entities with no recent activity. Alerts are grouped by family and sortable by severity.

**Why this priority**: Alerts make the dashboard actionable. Without them, the advisor must drill into each family to discover problems. This is the "what needs my attention?" answer at the advisor level.

**Independent Test**: Seed 3 family groups where one has 2 overdue invoices, one has an entity with health score below 40, and one has a BAS due in 7 days. Verify all 3 alerts appear on the wealth advisor dashboard.

**Acceptance Scenarios**:

1. **Given** the wealth advisor dashboard is displayed, **When** alerts exist across client families, **Then** a consolidated alerts panel shows all alerts grouped by family, with the most severe (red) at the top.

2. **Given** a family has an entity with health score below 40, **When** the alert renders, **Then** it shows: "[Entity Name] in [Family Name] — health score dropped to [score]" with a link to that entity's workspace.

3. **Given** a family has overdue invoices, **When** the alert renders, **Then** it shows: "[X] overdue invoices in [Family Name] totalling $[amount]" with a link to the family's invoice overview.

4. **Given** there are no alerts across any family, **When** the dashboard renders, **Then** the alerts panel shows "All clear — no items need attention" with a green checkmark.

---

### User Story 11 — Wealth Advisor AUM Trend (Priority: P3)

The wealth advisor dashboard shows a line chart of total AUM over the past 12 months — aggregated across all client families. This reuses the net worth snapshot data from 028-CFT, summed across all groups.

**Why this priority**: AUM trend is a key metric for wealth advisors to demonstrate value to their own stakeholders ("assets under our management grew 12% this year"). Lower priority because it is a reporting enhancement, not a core workflow feature.

**Independent Test**: Seed 12 months of net worth snapshots across 3 family groups. Verify the AUM trend chart shows the sum of all groups' net worth per month.

**Acceptance Scenarios**:

1. **Given** 3 family groups have 12 months of net worth snapshots (from 028-CFT), **When** the AUM trend chart renders, **Then** it shows a line chart with monthly data points where each point is the sum of all groups' net worth for that month.

2. **Given** the chart is displayed, **When** I hover over a data point, **Then** a tooltip shows the total AUM and per-family breakdown for that month.

3. **Given** a new family group was added 3 months ago, **When** the chart renders, **Then** that group contributes to the total for only the most recent 3 months — earlier months reflect only the groups that existed at that time.

---

### User Story 12 — Migrate Existing Practices to Default Type (Priority: P2)

Existing practices created before this epic have no practice type. A data migration assigns all existing practices the "Accounting" type by default (the most common type). Practice owners see a one-time banner informing them of their assigned type and inviting them to change it in Settings if it is incorrect.

**Why this priority**: Without migration, existing practices would be in a limbo state — no type, no module gating. This is essential for backward compatibility. P2 because it only matters at deployment time.

**Independent Test**: Run the migration on a database with 5 existing practices. Verify all 5 have type "Accounting". Log in as a practice owner and verify the one-time banner appears with the option to change the type.

**Acceptance Scenarios**:

1. **Given** the migration runs on a database with existing practices that have no type, **When** the migration completes, **Then** all existing practices have `practice_type = accounting` set.

2. **Given** an existing practice owner logs in after the migration, **When** they view the practice dashboard, **Then** a one-time dismissible banner appears: "Your practice has been set to Accounting. You can change your specialisation in Settings."

3. **Given** the practice owner dismisses the banner, **When** they next visit the dashboard, **Then** the banner does not appear again.

4. **Given** an existing practice with connected workspaces migrates to type "Accounting", **When** the module gating engine runs, **Then** connected workspaces that already have modules enabled retain their current configuration — no modules are revoked by the migration.

---

### Edge Cases

- **Practice changes type — what happens to connected workspaces?** Modules are recalculated for all connected workspaces. Newly enabled modules are added. Removed modules are disabled only after a confirmation dialog warns the practice owner. A grace period (7 days) allows workspaces to export data from modules being removed.
- **Workspace connected to multiple practices of different types?** Union of all practice type modules applies. A workspace connected to an accounting practice and an estate planning practice gets Tax + BAS + Compliance + Wills + Family Group + Asset Register.
- **What if a family group has no financial data yet?** The tree renders with entity names and type icons. Net worth shows "No data" on each node. Health score badges are omitted (grey placeholder). The tree is still useful for visualising structure.
- **What if the tree is very deep (>5 levels)?** Support up to 10 levels of hierarchy (matching 028-CFT). Branches beyond 3 levels are collapsed by default with expand/collapse toggles. The zoom/pan controls (US6) allow navigating large trees.
- **What if a practice has only one specialisation and removes it?** Prevented — a practice must have at least one active specialisation. The UI disables the remove button when only one type is selected.
- **What if the wealth advisory dashboard has no family groups?** Shows an empty state: "Create your first family group to see your AUM dashboard" with a link to the group creation flow.
- **What if consolidation (028-CFT) is not yet deployed?** The org chart renders without net worth figures (entity name + type only). The wealth advisor dashboard shows entity count and health scores but not AUM. Graceful degradation.
- **What if 051-EHS (Entity Health Score) is not yet deployed?** Health score badges are omitted from tree nodes and dashboard cards. No error states. The rest of the feature works independently.
- **What if a workspace owner sees modules they did not request?** Workspace settings shows which modules are enabled and why ("Enabled by [Practice Name] — Accounting"). The workspace owner cannot override practice-driven modules but can contact their practice to discuss.

---

## Requirements

### Functional Requirements

**Practice Type & Specialisation**
- **FR-001**: System MUST support a `PracticeType` enum with values: `accounting`, `financial_planning`, `estate_planning`, `wealth_advisory`, `bookkeeping`.
- **FR-002**: System MUST store practice specialisations as a many-to-many relationship (`practice_specialisations` pivot table) allowing a practice to hold multiple types simultaneously.
- **FR-003**: System MUST enforce at least one active specialisation per practice — removing the last type is prevented.
- **FR-004**: System MUST include a "Practice Type" step in the 027-PMV onboarding wizard, presented after Firm Details and before Invite Team.
- **FR-005**: System MUST allow practice owners to add or remove specialisations from the practice Settings page.
- **FR-006**: System MUST display the current specialisation(s) on the practice dashboard header as a badge (e.g., "Accounting + Financial Planning").

**Module Registry & Gating**
- **FR-007**: System MUST maintain a `ModuleRegistry` that maps each practice type to a set of feature flag identifiers. The registry is the single source of truth for practice-to-module mapping.
- **FR-008**: The module-to-practice-type mapping MUST be:

| Practice Type | Modules |
|---------------|---------|
| **Accounting** | Tax (044-TAX), BAS, Compliance, Reporting (007-FRC), Reconciliation (004-BFR) |
| **Financial Planning** | Tax, Goals (037-GLS), Cash Flow Forecasting (041-CFF), Asset Register (033-FAR) |
| **Estate Planning** | Wills (060-WEP), Family Group Portal (038-FGP), Asset Register (033-FAR) |
| **Wealth Advisory** | All of the above + Consolidation (028-CFT), Family Tree View, Entity Health (051-EHS) |
| **Bookkeeping** | Core Ledger (002-CLE), Banking (004-BFR), Invoicing (005-IAR), Contacts (006-CCM) |

- **FR-009**: When a practice connects to a client workspace, the system MUST automatically enable the union of all modules from the practice's active specialisations via feature flags (using the existing `FeatureGate` / Pennant infrastructure).
- **FR-010**: When a workspace is connected to multiple practices, the system MUST enable the union of all modules from all connected practices' specialisations.
- **FR-011**: When a practice specialisation is added, the system MUST recalculate and enable newly available modules on all connected workspaces within 1 second.
- **FR-012**: When a practice specialisation is removed, the system MUST show a confirmation dialog listing affected modules and connected workspaces. A 7-day grace period allows workspace data export before modules are disabled.
- **FR-013**: System MUST provide an API endpoint `GET /api/v1/practice/module-registry` that returns the full practice-type-to-module mapping, queryable by specific type.
- **FR-014**: Workspace settings MUST display which modules are practice-driven ("Enabled by [Practice Name] — [Type]") versus self-configured.
- **FR-015**: When a workspace is disconnected from all practices, modules remain enabled in their current state — no automatic revocation. Workspace admins can manually toggle modules.
- **FR-016**: System MUST include module gating status in the workspace API response so the frontend can show/hide navigation items and feature gates accordingly.

**Migration**
- **FR-017**: A data migration MUST assign `accounting` as the default specialisation for all existing practices that have no type set.
- **FR-018**: Existing practices' connected workspaces MUST NOT have any modules revoked by the migration — current configurations are preserved.
- **FR-019**: A one-time dismissible banner MUST inform existing practice owners of their assigned type with a link to Settings to change it.

**Family Tree / Org Chart**
- **FR-020**: System MUST render an interactive org chart component on the group detail page, under a "Family Tree" tab, using the existing `WorkspaceGroup` and `WorkspaceGroupMember` hierarchy from 028-CFT.
- **FR-021**: Each tree node MUST display: entity/workspace name, entity type icon (mapped from `EntityType` enum), net worth (from 028-CFT consolidation — cached, 5-minute TTL), and health score badge (from 051-EHS when available).
- **FR-022**: Clicking a tree node MUST navigate to that workspace's dashboard with the correct workspace context set (same pattern as 038-FGP entity grid click).
- **FR-023**: The root node (and all parent nodes) MUST display rolled-up net worth — the sum of the node's own net worth plus all descendant nodes' net worth, using the 028-CFT consolidation engine.
- **FR-024**: Hovering over a parent node's net worth MUST show a tooltip with the per-entity breakdown.
- **FR-025**: Tree branches beyond 3 levels of depth MUST be collapsed by default with an expand/collapse toggle on each parent node.
- **FR-026**: System MUST support up to 10 levels of hierarchy (matching 028-CFT's maximum).
- **FR-027**: Edges between nodes MUST display the relationship type label from 028-CFT: subsidiary, related, personal.
- **FR-028**: System MUST support zoom (50%-200%) via scroll wheel / pinch gesture and pan via click-drag / touch-drag on the tree canvas.
- **FR-029**: Tree layout MUST be responsive: horizontal tree on desktop (>1280px), compact scrollable layout on tablet (768-1280px), vertical indented list on mobile (<768px).
- **FR-030**: When 028-CFT is not deployed, the tree MUST render with entity names and type icons only — no net worth figures. When 051-EHS is not deployed, health badges MUST be omitted. No error states in either case.
- **FR-031**: Tree node net worth data MUST be fetched asynchronously after initial tree structure renders — not blocking the initial layout.
- **FR-032**: The org chart MUST render a 20-entity tree in under 2 seconds on a standard desktop browser.

**Wealth Advisor Dashboard**
- **FR-033**: System MUST provide a "Wealth Advisory" dashboard preset accessible only to practices with the `wealth_advisory` specialisation.
- **FR-034**: The wealth advisory dashboard MUST display in its header: total AUM (sum of all client family groups' net worth), total family count, total entity count, and aggregated alert count.
- **FR-035**: The dashboard MUST display per-family cards, each showing: group name, mini org chart thumbnail (up to 4 visible nodes), family net worth, average health score, and attention item count.
- **FR-036**: Clicking a family card MUST navigate to the full family tree / org chart view for that group.
- **FR-037**: The dashboard MUST include a consolidated alerts panel showing all alerts across all families, grouped by family, sorted by severity (critical first). Alert types: overdue invoices, health score drops below 40, upcoming deadlines (BAS, tax filing), entities with no activity in 30+ days.
- **FR-038**: When no alerts exist, the alerts panel MUST display "All clear — no items need attention".
- **FR-039**: The dashboard MUST display an AUM trend line chart showing monthly total AUM for the past 12 months, using net worth snapshot data from 028-CFT summed across all client groups.
- **FR-040**: Hovering over a trend chart data point MUST show total AUM and per-family breakdown for that month.
- **FR-041**: When no family groups exist, the dashboard MUST display an empty state: "Create your first family group to see your AUM overview" with a link to the group creation flow.
- **FR-042**: The dashboard MUST lazy-load per-family financial data — initial render shows family names and entity counts; net worth and health data populates asynchronously.
- **FR-043**: Practices without the `wealth_advisory` specialisation MUST NOT see or access the wealth advisory dashboard. Attempting to access the route directly MUST redirect to the standard practice dashboard.

### Key Entities

- **PracticeType** (new enum): Values: `accounting`, `financial_planning`, `estate_planning`, `wealth_advisory`, `bookkeeping`. Stored in `app/Enums/PracticeType.php`.
- **PracticeSpecialisation** (new pivot): Links a Practice to one or more PracticeType values. Table: `practice_specialisations` with `practice_id` and `type` columns. A practice can have multiple rows.
- **ModuleRegistry** (new service): A singleton service class that holds the static mapping of PracticeType to feature flag identifiers. Lives in `app/Services/ModuleRegistry.php`. Returns the module set for a given practice type or the union across multiple types.
- **Practice** (extended): The existing `Practice` model from 015-ACT. No new columns on the model itself — specialisations are stored in the pivot table. The `practice_type` convenience accessor returns the primary type (first specialisation) for backward compatibility.
- **WorkspaceGroup** (existing from 028-CFT/038-FGP): Used as-is for the family tree. No new fields needed.
- **WorkspaceGroupMember** (existing from 028-CFT): Used as-is for hierarchy (`parent_member_id`, `relationship_type`). No changes needed.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Practice type setting takes under 30 seconds to configure — from opening Settings to saving the specialisation(s).
- **SC-002**: Module gating correctly enables/disables features within 1 second of a practice type change — verified by checking feature flags on connected workspaces immediately after the change.
- **SC-003**: Org chart renders a 20-entity family tree in under 2 seconds on a standard desktop browser (Chrome, 2020+ hardware).
- **SC-004**: Wealth advisor can navigate from family overview to a specific entity workspace in under 3 clicks (dashboard → family card → tree node click).
- **SC-005**: Zero cross-practice data leakage — practice A cannot see practice B's client families on the wealth advisor dashboard. Verified by multi-practice test with tenant isolation checks.
- **SC-006**: Existing practices experience zero module disruption during migration — all currently-enabled modules remain enabled after the migration sets the default type.
- **SC-007**: The module registry API response matches the backend module mapping with 100% accuracy — verified by automated tests comparing API output to the service class.
- **SC-008**: Org chart gracefully degrades when 028-CFT or 051-EHS are not deployed — tree renders without errors, showing available data only.

---

## Clarifications

### Session 2026-03-21

### Q1: Data Model — Practice Type Storage

**Decision**: Practice types are stored in a `practice_specialisations` pivot table (not a column on the practice model) to support multi-type practices natively. The pivot has `practice_id` and `type` (PracticeType enum cast). A convenience accessor on the Practice model returns the primary type for backward compatibility. At least one specialisation is required — removing the last is prevented by validation.

### Q2: Module Gating Mechanism

**Decision**: Module gating uses the existing `FeatureGate` service and Laravel Pennant feature flags. When a practice connects to a workspace, the `ModuleRegistry` service returns the module set for the practice's types, and those flags are enabled on the workspace. This integrates with the existing `CheckFeature` middleware on routes. No new gating infrastructure is needed.

### Q3: Module Revocation on Type Change

**Decision**: When a practice removes a specialisation, modules unique to that type are disabled on connected workspaces after a 7-day grace period. A confirmation dialog warns the practice owner listing which modules will be removed and which workspaces are affected. During the grace period, modules remain enabled with a banner on the workspace indicating "Module access ending [date]". This prevents data loss from abrupt module removal.

### Q4: Workspace Connected to Multiple Practices

**Decision**: Union semantics. A workspace connected to an accounting practice and an estate planning practice gets all modules from both types. Disconnecting one practice recalculates based on the remaining practice(s). If no practices remain, current modules are preserved (no automatic revocation).

### Q5: Org Chart Library

**Decision**: Use a React-based tree/graph rendering library (e.g., `reactflow` or `d3-hierarchy` with a custom React wrapper). The library must support zoom, pan, node click events, and responsive layout. Final library choice deferred to implementation spike. The tree data structure follows the existing `WorkspaceGroupMember` parent/child hierarchy from 028-CFT.

### Q6: Wealth Advisor Dashboard Availability

**Decision**: The wealth advisor dashboard is gated by the `wealth_advisory` practice specialisation. Only practices with this type active can access the dashboard. The route is protected by middleware checking the practice's specialisations. Other practice types see the standard practice dashboard from 027-PMV.

### Q7: Existing Practice Migration Strategy

**Decision**: All existing practices receive the `accounting` type by default via a data migration. Connected workspaces retain their current module configuration unchanged — the migration does not revoke or add any modules. A one-time dismissible banner informs practice owners of the assigned type with a link to change it. This is the same pattern used for per-accountant assignment migration in 027-PMV (FR-012).

### Q8: Family Tree vs 028-CFT US7

**Decision**: 028-CFT User Story 7 specced a basic family tree visualisation as a P3 feature. This epic (061-PSM) delivers a significantly enhanced version: health score badges, rolled-up financials on nodes, zoom/pan, responsive layout, and integration with the wealth advisor dashboard. The 061-PSM implementation supersedes 028-CFT US7. If 028-CFT US7 has already been built, the 061-PSM tree replaces it.

### Q9: Performance — Large Family Trees

**Decision**: Design target is 20 entities per tree (matching SC-003). Trees with 10+ nodes use asynchronous node data loading (FR-031) — the tree structure renders immediately, then net worth and health data populates per-node via parallel API calls. This prevents large trees from blocking the initial render. For trees with 20+ entities (rare but possible), virtual rendering ensures only visible nodes are in the DOM.

### Q10: AUM Calculation Methodology

**Decision**: AUM is the sum of all client family groups' net worth. Net worth is total assets minus total liabilities from the 028-CFT consolidation engine. Inter-entity eliminations are applied (so AUM is not double-counted). AUM data uses the same 5-minute cache as 028-CFT consolidated views, with a manual "Refresh" option on the dashboard.
