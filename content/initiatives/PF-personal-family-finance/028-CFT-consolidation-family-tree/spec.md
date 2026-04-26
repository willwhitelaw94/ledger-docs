---
title: "Feature Specification: Consolidation & Family Tree"
---

# Feature Specification: Consolidation & Family Tree

**Feature Branch**: `028-CFT-consolidation-family-tree`
**Created**: 2026-03-15
**Status**: Approved (Gate 1 passed 2026-03-15)
**Epic**: 028-CFT
**Initiative**: FL — Financial Ledger Platform
**Effort**: XL (6 sprints)
**Depends On**: 027-PMV (complete), 007-FRC (complete), 002-CLE (complete)

### Out of Scope

- **Automatic elimination detection** — v1 uses manual "mark as inter-entity" toggle, not AI/rule-based detection
- **Multi-currency consolidation** — v1 assumes all group members use the same base currency (typically AUD). Currency normalisation deferred to v2
- **Audit-grade consolidated statements** — labelled "Combined view — not audited" to avoid compliance risk
- **PDF export of consolidated reports** — deferred to a reporting polish sprint
- **Personal asset valuation feeds** — automatic property/share price updates from external APIs deferred
- **Group-level journal entries** — no cross-workspace journal entries; each workspace maintains its own ledger

---

## Overview

MoneyQuest Ledger's workspace groups (027-PMV) are flat collections — they show related entities together on a dashboard but have no hierarchy, no financial consolidation, and no way to invite non-accountant stakeholders. This epic transforms groups into a hierarchical wealth management surface: parent/child entity structures, consolidated balance sheets and P&L, net worth calculation, and a tiered permission model that lets family members see their combined wealth without the accounting detail. The group becomes the answer to "what am I worth?" for individuals, families, and corporate structures.

---

## User Scenarios & Testing

### User Story 1 — Group Hierarchy & Entity Relationships (Priority: P1)

A practice accountant manages the Smith family's affairs across 4 workspaces. Today they appear as a flat list. The accountant wants to express that Smith Pty Ltd is a subsidiary of Smith Family Trust, and that the SMSF is a related entity. They need a way to set parent/child relationships within the group and see the structure as a family tree.

**Why this priority**: Hierarchy is the foundation for consolidation — without knowing which entities are parents and which are children, the system can't determine the consolidation structure. Every other story in this epic depends on the hierarchy data being in place.

**Independent Test**: Can be tested by creating a group with 4 workspaces, setting parent/child relationships, and verifying the tree API returns the correct structure.

**Acceptance Scenarios**:

1. **Given** I am a practice member viewing a workspace group, **When** I open the "Entity Structure" panel, **Then** I see all member workspaces in a tree layout — ungrouped by default (all at root level).

2. **Given** I am viewing the entity structure, **When** I drag "Smith Pty Ltd" under "Smith Family Trust" (or use a "Set Parent" dropdown), **Then** Smith Pty Ltd becomes a child of Smith Family Trust. The tree re-renders to show the parent/child relationship.

3. **Given** a group has a hierarchy (Trust → Company, Trust → SMSF, Personal at root), **When** I request the group's structure via the API, **Then** I receive a nested tree with parent/child relationships, each node containing workspace ID, name, entity type, and relationship type (subsidiary, related, personal).

4. **Given** I set a relationship type on a connection (e.g., "subsidiary" vs "related" vs "personal"), **When** the tree renders, **Then** the relationship label appears on the connection line.

5. **Given** a workspace is removed from a group, **When** it had children, **Then** those children move up to the root level (they don't get deleted or orphaned).

6. **Given** I try to create a circular hierarchy (A → B → A), **When** I attempt to set A as a child of B while B is already a child of A, **Then** the system prevents it and shows an error.

---

### User Story 2 — Consolidated Balance Sheet (Priority: P1)

A practice accountant wants to see the combined financial position of all entities in the Smith Family group. Today they must export each workspace's balance sheet and manually merge them in a spreadsheet. The consolidated balance sheet automatically aggregates assets, liabilities, and equity across all group members, showing total net worth.

**Why this priority**: This is the core value proposition — the reason groups exist beyond organisation. Without consolidation, groups are just folders. With it, they become a financial intelligence surface.

**Independent Test**: Can be tested by creating 3 workspaces with known balance sheet data, grouping them, and verifying the consolidated balance sheet sums correctly.

**Acceptance Scenarios**:

1. **Given** a group "Smith Family" has 3 workspaces each with balance sheet data, **When** I navigate to the group's "Consolidated Balance Sheet" view, **Then** I see a single balance sheet where every account line is the sum of that account across all member workspaces.

2. **Given** the consolidated balance sheet is displayed, **When** I click on any line item (e.g., "Cash at Bank: $150,000"), **Then** I see a breakdown showing how much each workspace contributes (Trust: $80k, Company: $50k, SMSF: $20k).

3. **Given** two workspaces in the group use the same chart of accounts structure, **When** accounts are consolidated, **Then** matching accounts are merged by account code. Accounts that exist in only one workspace appear with zero in the others.

4. **Given** the group has a hierarchy, **When** I view the consolidated balance sheet, **Then** I can optionally see sub-totals per entity level (parent entity subtotal, then grand total including all subsidiaries).

5. **Given** a workspace has no balance sheet data yet (newly created), **When** the consolidated view is generated, **Then** that workspace contributes zero to all lines and is noted as "No data" in the per-entity breakdown.

---

### User Story 3 — Consolidated P&L & Net Worth (Priority: P1)

A practice accountant wants to see the combined revenue, expenses, and profit across all entities in a group. Additionally, family members want a single "net worth" number — total assets minus total liabilities across all group members.

**Why this priority**: The P&L completes the financial picture (balance sheet = position, P&L = performance). Net worth is the headline metric that makes the product compelling for non-accountant users.

**Independent Test**: Can be tested by creating workspaces with revenue/expense data, grouping them, and verifying the consolidated P&L and net worth calculation.

**Acceptance Scenarios**:

1. **Given** a group has workspaces with revenue and expense data, **When** I navigate to "Consolidated P&L", **Then** I see combined revenue, combined expenses, and net profit across all members for a selectable date range.

2. **Given** the consolidated P&L is displayed, **When** I click on a revenue line, **Then** I see the per-workspace breakdown (same drill-down pattern as the balance sheet).

3. **Given** a group's consolidated balance sheet shows total assets of $2M and total liabilities of $550k, **When** the net worth is calculated, **Then** it displays $1.45M (assets minus liabilities).

4. **Given** the group has historical balance sheet data, **When** I view the net worth trend, **Then** I see a line chart showing net worth at the end of each month for the past 12 months.

5. **Given** a date range is selected for the P&L, **When** the consolidated report generates, **Then** only transactions within that date range are included (not all-time).

---

### User Story 4 — Inter-Entity Elimination (Priority: P2)

A practice accountant notices that the consolidated balance sheet double-counts a $100k loan from the Trust to the Company. The loan appears as an asset in the Trust (loan receivable) and a liability in the Company (loan payable). The accountant needs to mark this as an inter-entity transaction so it is excluded from the consolidated view.

**Why this priority**: Without elimination, consolidated figures are inflated by inter-entity transactions. This is the most technically complex feature but essential for the consolidated view to be meaningful. V1 uses manual marking rather than automatic detection.

**Independent Test**: Can be tested by creating two workspaces with matching inter-entity balances, marking them for elimination, and verifying the consolidated balance sheet excludes them.

**Acceptance Scenarios**:

1. **Given** I am viewing the consolidated balance sheet, **When** I click "Manage Eliminations", **Then** I see a list of potential eliminations — accounts that have matching debits in one workspace and credits in another.

2. **Given** I select a Trust receivable ($100k) and a Company payable ($100k) as an elimination pair, **When** I confirm the elimination, **Then** both amounts are excluded from the consolidated balance sheet, and a note shows "Inter-entity elimination: $100k".

3. **Given** an elimination is active, **When** I view the consolidated balance sheet, **Then** the total is reduced by the eliminated amount, and a line item "Less: Inter-entity eliminations" appears.

4. **Given** I remove an elimination, **When** the consolidated balance sheet recalculates, **Then** the previously eliminated amounts reappear in the totals.

5. **Given** an elimination pair references accounts that no longer have matching balances (e.g., the loan was partially repaid), **When** the system detects a mismatch, **Then** the elimination is flagged as "out of balance" for the accountant to review.

---

### User Story 5 — Invite Stakeholders to Group (Priority: P2)

A practice accountant wants to invite the Smith family patriarch to see the group's net worth and entity breakdown — but without access to individual transactions, journal entries, or accounting detail. The patriarch should see a simple, beautiful dashboard that answers "what am I worth?" John Smith's adult daughter, a trust beneficiary, should be able to see just the trust's summary.

**Why this priority**: This is what transforms the product from "accounting tool for accountants" into "wealth visibility platform for families". The invite mechanism is the viral growth loop — every family member who sees their net worth becomes an advocate.

**Independent Test**: Can be tested by inviting a user as a Viewer, logging in as them, and verifying they see only the summary dashboard with no access to workspace detail.

**Acceptance Scenarios**:

1. **Given** I am a group Manager (practice member), **When** I click "Invite to Group", **Then** I see options to invite by email with a role selector: Manager, Viewer, or Entity Viewer.

2. **Given** I invite "john@smith.com" as a Viewer, **When** John accepts the invitation and logs in, **Then** he sees the group dashboard showing: total net worth (big number), per-entity breakdown (bars/cards), net worth trend chart, and asset allocation. He does NOT see: journal entries, bank reconciliation, chart of accounts, individual transactions, or any accounting controls.

3. **Given** I invite "sarah@smith.com" as an Entity Viewer for "Smith Family Trust" only, **When** Sarah logs in, **Then** she sees only the Trust's summary: total assets, total liabilities, net position, and a simplified balance sheet. She does NOT see other entities in the group.

4. **Given** John is a Viewer, **When** he taps on "Smith Pty Ltd" in the entity breakdown, **Then** he sees a simplified summary: Total Assets, Total Liabilities, Net Position, and top asset categories (Property, Cash, Investments, etc.). He cannot navigate into the workspace or see individual accounts/transactions.

5. **Given** a Viewer is on the group dashboard, **When** new balance sheet data is generated (e.g., month-end close), **Then** the net worth and trend chart update automatically on their next visit.

6. **Given** a Manager revokes a Viewer's access, **When** the Viewer tries to access the group, **Then** they receive a "You no longer have access" message and are redirected.

---

### User Story 6 — Group Dashboard (Priority: P2)

The group dashboard is the primary interface for both Managers and Viewers. It adapts based on the user's role — Managers see full detail with drill-down into workspaces, Viewers see a simplified wealth summary.

**Why this priority**: The dashboard is where the value is delivered. Without it, hierarchy and consolidation are backend capabilities with no user-facing expression.

**Independent Test**: Can be tested by loading the dashboard as both a Manager and a Viewer, verifying the content and controls differ appropriately.

**Acceptance Scenarios**:

1. **Given** I am a Manager viewing the group dashboard, **When** the page loads, **Then** I see: net worth headline, family tree visualisation, consolidated balance sheet summary (top 10 accounts), consolidated P&L summary, per-entity cards with health metrics (from 027-PMV), and management controls (invite, edit hierarchy, manage eliminations).

2. **Given** I am a Viewer viewing the group dashboard, **When** the page loads, **Then** I see: net worth headline (large, prominent), per-entity breakdown (visual bars with percentages), net worth trend chart (12 months), asset allocation breakdown (property, cash, investments, super), and a footer noting "Combined view — not audited". I do NOT see: management controls, elimination entries, individual transactions, or practice-specific features.

3. **Given** the group has 4 entities, **When** I view the per-entity breakdown, **Then** each entity shows: name, entity type badge (Trust, Company, SMSF, Personal), net position amount, and percentage of total net worth.

4. **Given** historical data exists, **When** I view the net worth trend, **Then** the chart shows month-end net worth for the past 12 months with a clear up/down indicator comparing to the previous period.

5. **Given** I am a Manager, **When** I click "View as Client", **Then** the dashboard switches to Viewer mode so I can preview what the family sees before inviting them.

---

### User Story 7 — Family Tree Visualisation (Priority: P3)

The family tree is an interactive visual representation of the group's entity structure — showing who owns what, how entities relate, and (optionally) the net position of each node. It's both an informational display and an editing tool for Managers.

**Why this priority**: Lower priority than the financial engine, but critical for making complex structures comprehensible. A picture is worth a thousand spreadsheet rows.

**Independent Test**: Can be tested by rendering a group with a 3-level hierarchy and verifying the tree layout, labels, and interaction.

**Acceptance Scenarios**:

1. **Given** a group has a hierarchy (Trust at top, Company and SMSF as children, Personal at root), **When** the family tree renders, **Then** each node shows: entity name, entity type icon, net position amount, and relationship lines connecting parents to children.

2. **Given** I am a Manager, **When** I interact with the family tree, **Then** I can: drag nodes to rearrange the hierarchy, click a node to open the entity detail, and right-click for actions (set as parent, remove from group, change relationship type).

3. **Given** I am a Viewer, **When** I see the family tree, **Then** I can view the structure and click nodes for summary info, but I cannot rearrange or edit the hierarchy.

4. **Given** a group has 6+ entities, **When** the tree renders, **Then** it uses a responsive layout that works on both desktop (horizontal tree) and mobile (vertical list with indentation).

---

### Edge Cases

- What happens when a group has members with different base currencies? V1 displays a warning "Currency mismatch — consolidated figures use [base currency]" and converts at the most recent exchange rate. Multi-currency consolidation is out of scope for v1.
- What happens when a workspace's chart of accounts differs from others in the group? Accounts are matched by account code. Unmatched accounts appear in the consolidation as standalone lines with data from only the workspace that has them.
- What happens when a Viewer's group access is the only reason they have an account? The Viewer account persists but shows "No groups available" if all access is revoked.
- What happens when the consolidated balance sheet doesn't balance after eliminations? Display a warning banner "Eliminations out of balance by $X — review required" with a link to the elimination management screen.
- What happens when a workspace is deleted but was part of a group? It is automatically removed from the group. Historical consolidated data retains the workspace's contributions up to the deletion date.

---

## Requirements

### Functional Requirements

**Group Hierarchy**
- **FR-001**: System MUST support parent/child relationships between workspaces within a group, stored as a `parent_member_id` on each group member.
- **FR-002**: System MUST support relationship type labels on parent/child connections: subsidiary, related, personal.
- **FR-003**: System MUST prevent circular hierarchies (validation on save).
- **FR-004**: System MUST return the group structure as a nested tree via the API.
- **FR-005**: Removing a parent workspace MUST promote its children to root level (no orphans).

**Consolidated Balance Sheet**
- **FR-006**: System MUST aggregate balance sheet data across all group member workspaces by matching chart account type and classification (e.g., "Current Assets > Cash"), not by account code. This handles different CoA templates across workspaces.
- **FR-007**: System MUST provide per-workspace drill-down on any consolidated line item.
- **FR-008**: System MUST support sub-totals per hierarchy level (parent subtotal, group grand total).
- **FR-009**: System MUST handle workspaces with no financial data (contribute zero, marked "No data").
- **FR-034**: Consolidated financial data MUST be cached with a 5-minute TTL. A "Refresh" action MUST be available to bust the cache on demand.

**Consolidated P&L & Net Worth**
- **FR-010**: System MUST aggregate revenue and expense accounts across all group members for a selectable date range.
- **FR-011**: System MUST calculate net worth as total assets minus total liabilities across all group members.
- **FR-012**: System MUST store monthly net worth snapshots via a scheduled job on the 1st of each month (capturing the previous month's closing position). The dashboard shows live-calculated current net worth alongside historical snapshots.
- **FR-013**: System MUST display a 12-month net worth trend chart.

**Inter-Entity Elimination**
- **FR-014**: System MUST allow Managers to manually mark account pairs as inter-entity eliminations.
- **FR-015**: System MUST exclude eliminated amounts from consolidated totals with a visible "Less: Inter-entity eliminations" line.
- **FR-016**: System MUST flag eliminations that are out of balance (mismatched amounts).
- **FR-017**: Eliminations MUST be reversible (remove to restore original amounts).

**Group Invitations & Permissions**
- **FR-018**: System MUST support three group roles: Manager (full access), Viewer (summary only), Entity Viewer (single-entity summary).
- **FR-019**: System MUST allow Managers to invite users to the group by email with a role and a visibility setting: "show amounts" (default) or "show percentages only".
- **FR-020**: Viewers MUST NOT see individual transactions, journal entries, chart of accounts, or accounting controls.
- **FR-021**: Entity Viewers MUST only see the summary of their designated entity, not other group members.
- **FR-022**: System MUST support revoking group access (immediate effect).
- **FR-031**: System MUST support magic link login for Viewers — a one-click email link that authenticates and lands directly on the group dashboard. No password required.
- **FR-032**: Magic link login MUST be a group-level setting controlled by the Manager: "Require password" (default) or "Allow magic link access". When enabled, Viewer invitation emails include a magic link instead of requiring account creation.
- **FR-033**: Magic links MUST expire after 24 hours and be re-sendable by the Manager.

**Group Dashboard**
- **FR-023**: System MUST provide a group dashboard with net worth headline, entity breakdown, trend chart, and asset allocation using fixed friendly categories: Property, Cash & Bank, Investments, Superannuation, Vehicles & Equipment, Other Assets. Categories are mapped from chart of accounts classifications.
- **FR-024**: Dashboard MUST adapt based on role — Manager view (full detail + controls) vs Viewer mode (summary only).
- **FR-025**: System MUST provide a "View as Client" toggle for Managers to preview the Viewer experience.
- **FR-038**: System MUST support a single pinned commentary note per group, editable by Managers, visible to Viewers on the dashboard. Acts as a "message from your accountant" channel.
- **FR-026**: Dashboard MUST display "Combined view — not audited" disclaimer for all users.
- **FR-035**: System MUST automatically generate a "My Net Worth" virtual group for every user who owns 2+ workspaces, aggregating all their owned workspaces. No manual group creation needed for individuals.
- **FR-036**: The "My Net Worth" auto-group MUST surface as both: (a) a summary widget on the existing workspace dashboard ("My Net Worth: $X" banner above workspace list), and (b) a dedicated /net-worth page with full trend chart, entity breakdown, and asset allocation. Widget links to the full page.
- **FR-037**: The /net-worth page MUST use the same consolidation engine and Viewer-mode dashboard as practice groups.

**Family Tree**
- **FR-027**: System MUST render an interactive family tree visualisation of the group hierarchy.
- **FR-028**: Managers MUST be able to edit the hierarchy via drag-and-drop in the tree view.
- **FR-029**: Viewers MUST see a read-only version of the family tree.
- **FR-030**: Tree MUST be responsive — horizontal layout on desktop, vertical list on mobile.

### Key Entities

- **Workspace Group** (extended from 027-PMV): Adds hierarchy support (parent_member_id on members), group-level invitation.
- **Group Member Hierarchy**: Parent/child relationship on `workspace_group_members` — adds `parent_member_id` (nullable self-referencing FK) and `relationship_type` (subsidiary, related, personal).
- **Group Invitation**: Email-based invitation to a group with a role (manager, viewer, entity_viewer) and optional entity scope.
- **Group Member User**: Links a user to a group with a role. Separate from workspace_users — this is group-level access.
- **Inter-Entity Elimination**: A pair of accounts across two workspaces marked for exclusion from consolidation. Has workspace_a_id, account_a_id, workspace_b_id, account_b_id, amount, status (active, out_of_balance).
- **Net Worth Snapshot**: Monthly snapshot of a group's consolidated net worth (total_assets, total_liabilities, net_worth, snapshot_date). Used for trend charts.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A consolidated balance sheet for a group of 4 workspaces generates in under 3 seconds.
- **SC-002**: Net worth is accurate to the cent — total assets minus total liabilities matches manual calculation.
- **SC-003**: Viewers can see their family's net worth within 2 clicks of logging in.
- **SC-004**: The family tree renders correctly for groups with up to 10 entities and 3 hierarchy levels.
- **SC-005**: Inter-entity eliminations reduce consolidated totals by exactly the eliminated amounts (verified by tests).
- **SC-006**: Viewers see zero accounting jargon — no "journal entry", "debit", "credit", "BAS", or "reconciliation" on their dashboard.
- **SC-007**: Group invitation to net worth view takes under 30 seconds (invite, accept, see dashboard).
- **SC-008**: Monthly net worth snapshots are generated automatically (scheduled job) with no manual intervention.

---

## Clarifications

### Session 2026-03-15

- Q: How should consolidated balance sheet aggregate accounts across workspaces with different CoA templates? → A: Match by account type and classification (e.g., "Current Assets > Cash"), not by account code. The CoA already has type/classification metadata. This is how real-world consolidation works.
- Q: Should Viewers see actual dollar amounts or percentages? → A: Configurable per invitation — Manager chooses "show amounts" or "show percentages only" when inviting. Gives accountant control over disclosure level per person.
- Q: When should net worth snapshots be generated? → A: Scheduled job on the 1st of each month capturing the previous month's closing position. Dashboard shows live current net worth alongside historical snapshots.
- Q: Should the group dashboard require login or support public links? → A: Magic link login for Viewers (one-click email, no password), controlled by a group-level setting. Manager chooses "Require password" (default) or "Allow magic link access". Links expire after 24 hours, re-sendable. Magic link always goes through login (auth required), never public — sensitivity concern.
- Q: Should consolidated balance sheet be cached or live? → A: Cached with 5-minute TTL. "Refresh" button available to bust cache on demand. Accounting data doesn't change by the second.
- Q: Should individuals (non-practice users) be able to create groups? → A: Auto-group — system automatically generates a "My Net Worth" virtual group for any user who owns 2+ workspaces. No manual creation needed. Practice groups remain explicit. Both use the same consolidation engine.
- Q: What asset categories should the Viewer dashboard use? → A: Fixed friendly categories: Property, Cash & Bank, Investments, Superannuation, Vehicles & Equipment, Other Assets. Mapped from CoA classifications. Simple, no accounting jargon.
- Q: How much detail when a Viewer clicks on an entity? → A: Simplified balance sheet summary — Total Assets, Total Liabilities, Net Position, top asset categories. No individual accounts or transactions.
- Q: Where does "My Net Worth" auto-group appear? → A: Both — summary widget on existing dashboard (banner above workspace list) + dedicated /net-worth page with full detail. Widget links to the full page.
- Q: Should Managers be able to add commentary for Viewers? → A: Single pinned note per group — "message from your accountant" visible on the Viewer dashboard. High-impact, low-effort communication channel.
