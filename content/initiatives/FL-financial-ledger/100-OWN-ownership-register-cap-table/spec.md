---
title: "Feature Specification: Ownership Register & Cap Table"
---

# Feature Specification: Ownership Register & Cap Table

**Feature Branch**: `feature/100-OWN-ownership-register`
**Created**: 2026-04-02
**Status**: Draft
**Last Refined**: 2026-04-01 (spec analyst pass — 20 questions)

## Overview

A lightweight ownership register for each entity (workspace), giving accountants an at-a-glance view of **who owns what** — share classes, share counts, ownership percentages, and investment amounts. Includes a per-entity cap table view and a practice-wide ownership report.

**Scope boundary**: This is the accountant's compliance view of ownership, not a startup equity management platform. No ESOP, vesting schedules, SAFEs, convertible notes, or option pools.

**Navigation decisions**:
- Ownership tab lives **per entity** at `/w/{slug}/ownership`
- The `/structure` graph stays as a cross-entity network view but moves out of each entity's sidebar nav — it becomes a **practice-level view** accessible from the practice portal or a top-level "Entity Map" link
- [DECISION: For users without a practice (e.g. sole traders with multiple entities), the structure graph should remain accessible. Options: (a) keep it in entity sidebar but demote it to a "More" section, (b) add it to the workspace settings area, (c) only show it in entity sidebar when user has no practice. Recommended: keep `Structure` in entity sidebar for non-practice users, add `Entity Map` to practice nav for practice users. Both point to the same component.]

---

## Spec Analysis: 20 Hard Questions

The following analysis was performed by walking through 20 critical questions about this spec, answered from the perspective of someone who understands the MoneyQuest Ledger codebase. Findings are integrated into the spec sections below, with `[DECISION: ...]` tags where the product owner needs to validate a choice.

### Architecture & Data Model

**Q1: Should ShareClass, ShareHolding, ShareTransfer be workspace-scoped (tenant) tables or central tables?**

ShareClass, ShareHolding, and ShareTransfer MUST be **workspace-scoped tenant tables** with a `workspace_id` column. Rationale: EntityRelationship is central because it connects two workspaces (cross-entity by nature). But share classes and holdings belong to a single entity — "Smith Pty Ltd has Ordinary shares" is data about Smith Pty Ltd, not about the relationship between two entities. This follows the existing pattern: every model in `app/Models/Tenant/` has `workspace_id` and uses global scoping. The share register is the entity's own records.

**Q2: What's the relationship between ShareHolding and EntityRelationship?**

These are **complementary, not competing** models. EntityRelationship captures the graph edge ("A holds shares in B" at 50%) for the cross-entity network visualisation. ShareHolding captures the detailed register ("A holds 500 Ordinary shares in B, invested $500, issued 2020-01-15"). When a ShareHolding is created/updated, the system SHOULD sync the corresponding EntityRelationship's percentage to match. But EntityRelationship can exist without a ShareHolding (e.g. DIRECTOR_OF, TRUSTEE_OF relationships have no share data). A ShareHolding where the holder is another workspace SHOULD create/update a HOLDS_SHARES EntityRelationship. A ShareHolding where the holder is a contact does NOT create an EntityRelationship (contacts are not nodes in the entity graph).

**Q3: How do we handle shareholders who are individuals (contacts) vs entities (workspaces)?**

This is the critical design tension. Contact is workspace-scoped (each workspace has its own contact list), while EntityRelationship is central (workspace-to-workspace). The solution: ShareHolding uses a **polymorphic `holder` reference** — `holder_type` (contact or workspace) and `holder_id`. When holder_type=contact, the holder_id references a contact within the same workspace (no cross-tenant issue — the contact belongs to the entity recording ownership). When holder_type=workspace, the holder_id references another workspace (cross-entity, similar to how EntityRelationship works). This avoids cross-tenant data access because contacts used as shareholders must exist in the owning workspace's contact list.

[DECISION: Should we also support a "freetext" holder type for shareholders who aren't contacts and aren't other entities in the system? E.g. "John Smith (deceased estate)" where the accountant doesn't want to create a full contact record. Recommended: No for v1 — require creating a contact. This keeps data clean and searchable.]

**Q4: Should share counts be integers or support fractional shares?**

Share counts MUST be **integers**. Australian company law deals in whole shares. Unit trusts can have fractional units, but this is rare and typically handled by using a larger denomination (e.g. 1,000,000 units instead of 1,000.000 units). Using integers aligns with the project convention of integer-only financial amounts (cents). If fractional units are needed in future, the migration can be changed, but v1 should use integers.

[DECISION: Confirm integers for share/unit counts. If a user needs 0.5 units, they should scale their unit class to use a finer denomination.]

**Q5: What's the right primary key strategy?**

Use **auto-increment IDs** with a `uuid` column for API exposure, consistent with the existing pattern in most tenant models (e.g. JournalEntry, Invoice). The `uuid` is used in API routes for security (not exposing sequential IDs), while the auto-increment ID is used for foreign keys internally. EntityRelationship uses auto-increment without UUID, but that's a central model — for workspace-scoped models with API endpoints, UUID is the standard.

### Business Logic

**Q6: How does percentage auto-calculation work with multiple share classes?**

Ownership percentage is calculated **per share class**, not weighted across all classes. If an entity has 1000 Ordinary shares and 200 Preference shares, and John holds 500 Ordinary and 100 Preference, his ownership shows as: 50% of Ordinary, 50% of Preference. The cap table summary shows a **weighted total percentage** based on total shares across all classes: (500 + 100) / (1000 + 200) = 50%. This matches ASIC reporting conventions where ownership is reported per class.

[DECISION: Confirm per-class percentage as primary, with optional weighted total. Some accountants may want to weight by value rather than count — defer value-weighted to a future iteration.]

**Q7: What happens to existing HOLDS_SHARES relationships when share holdings are added?**

Existing EntityRelationship records with `HOLDS_SHARES` type remain unchanged. They continue to power the entity graph. When new ShareHoldings are created where the holder is a workspace, the system checks for a matching EntityRelationship and updates its percentage. If no matching relationship exists, one is created automatically. This is a **one-way sync**: ShareHolding -> EntityRelationship percentage. Editing EntityRelationship percentage directly (via the graph UI) does NOT update ShareHolding — the share register is the source of truth, and the EntityRelationship percentage becomes a computed reflection of the register.

**Q8: Should transfers automatically create/update EntityRelationship records?**

Yes. When a transfer moves shares between holders where both are workspaces (entity-to-entity), the system recalculates the EntityRelationship percentage for both the source and destination. If the source holder's share count drops to zero, the EntityRelationship is soft-deleted. If the destination is a new workspace holder, a new EntityRelationship is created. Contact-to-contact transfers have no effect on EntityRelationship.

**Q9: How do we handle trusts with income and capital beneficiaries?**

Different beneficiary entitlements are modelled as **different unit classes**. A trust might have "Income Units" (entitling holders to income distributions) and "Capital Units" (entitling holders to capital distributions). The spec already supports this via the entity-type-aware labelling ("Unit Class" for trusts). The `rights_description` field on ShareClass is where the accountant documents the specific entitlements. This is not a system-enforced distinction — the ledger does not automatically calculate distributions. It's a recording/compliance feature.

**Q10: What about unpaid/partly paid shares?**

ASIC's share register requires tracking paid vs unpaid amounts per share. The spec currently only has `investment_amount` (total consideration). For v1, add `amount_paid` (integer, cents) and `amount_unpaid` (integer, cents) to ShareHolding. This is critical for Pty Ltd compliance — many small companies issue $1 shares that remain unpaid for years. The investment_amount field becomes the total consideration (paid + unpaid), and `amount_paid` / `amount_unpaid` track the actual payment status.

[DECISION: Include partly-paid share tracking in v1? It adds 2 columns and is important for ASIC compliance. Recommended: Yes, include it. Low complexity, high compliance value.]

### Permissions & Multi-tenancy

**Q11: Who can edit ownership data?**

Ownership requires **dedicated permissions**: `ownership.view`, `ownership.create`, `ownership.update`, `ownership.delete`. Following existing patterns in `RolesAndPermissionsSeeder`: owner gets all, accountant gets all, bookkeeper gets view + create + update (no delete), approver gets view only, auditor gets view only, client gets view only. This mirrors the entity-relationship permission pattern but is separate because ownership is entity-internal data, not cross-entity graph data.

**Q12: Practice-wide report data scoping?**

When a practice manager views the practice-wide ownership report, they see data from all workspaces connected to their practice (via `practice_workspaces` pivot). Shareholder names (contacts) are visible because the practice manager has access to those workspaces — they're not viewing another tenant's data, they're aggregating data from workspaces they already have access to. This follows the same pattern as practice reports, timesheets, and WIP reports.

**Q13: Dedicated permissions confirmed.**

New permissions to add to `RolesAndPermissionsSeeder`:
- `ownership.view` — view cap table and register
- `ownership.create` — add share classes, record shareholders
- `ownership.update` — edit share classes, update holdings
- `ownership.delete` — delete share classes (if no holdings), remove shareholders

The nav item in the sidebar should use `permission: 'ownership.view'` to gate visibility.

### UX & Navigation

**Q14: Where does "Ownership" go in the entity sidebar?**

In the `primaryNav` array in `frontend/src/lib/navigation.ts`, "Ownership" should be placed **after "Structure" (or in its position if Structure moves)**. Looking at the current nav order: Dashboard, Feed, Intray, Accounts, Banking, Invoices, Bills, Payments, Contacts, Items, Accounting, Budgets, Scenarios, Loans, Files, Signing, Structure, Ask AI. "Ownership" should go **where Structure currently sits** (position 16), and Structure either stays after it or moves to practice nav. Recommended icon: `Users` is taken (Contacts), so use `Crown` or `Share2` from lucide-react. Shortcut: `G then O` (for Ownership — "O" is currently unbound).

[DECISION: Confirm sidebar position and shortcut. `G then O` seems natural. Icon suggestion: `PieChart` is taken (Budgets). Options: `Crown`, `Share2`, `ShieldCheck`, or `UserCheck`. Recommended: `Share2` (lucide "share-2" icon) — visually suggests ownership/splitting.]

**Q15: What about non-practice users who need the structure graph?**

The spec says "Structure moves to practice nav" but sole traders or business owners with multiple entities (who don't have a practice) still need the entity graph. Solution: **keep Structure in the entity sidebar** for all users AND **add Entity Map to practice nav** for practice users. The entity sidebar "Structure" link opens the graph scoped to the current user's accessible workspaces (as it does today). The practice "Entity Map" opens the same graph, optionally filtered to the practice's client workspaces. This avoids breaking existing users.

**Q16: Sub-tabs or scroll sections for the ownership page?**

Use **sub-tabs** within the ownership page: "Overview" (cap table dashboard with donut chart and register) and "Transfers" (transfer history). This matches the existing pattern in practice reports (tabs for Overview/WIP/Utilisation) and banking (tabs for Register/Reconcile/Feeds/Rules). Tabs provide clearer navigation and allow the URL to reflect the active section (`/ownership?tab=transfers`). The share class management should be inline on the Overview tab (modal or inline forms), not a separate tab.

**Q17: Donut chart edge cases — 1 shareholder or 0 shareholders?**

- **0 shareholders**: Show the empty state (already specified in User Story 3, Scenario 3) — "Set up your ownership register" prompt.
- **1 shareholder at 100%**: Show a complete donut in a single colour with the shareholder name. This is valid and common (sole director/shareholder of a Pty Ltd).
- **1 shareholder at less than 100%**: Show two segments — the shareholder's portion and an "Unallocated" grey segment.
- **Many shareholders**: Show individual segments up to 8 colours, then group remaining as "Others" to avoid visual clutter.

### Edge Cases & Compliance

**Q18: ASIC share certificate numbers?**

ASIC's Form 484 and annual company statement require certificate numbers. Add an optional `certificate_number` field (nullable string, max 50) to ShareHolding. This is low-cost to add and avoids a future migration. Most small companies use sequential numbering ("Certificate 001", "Certificate 002"). The system does NOT auto-generate certificate numbers — the accountant enters them manually.

[DECISION: Include certificate_number in v1? It's a single nullable column. Recommended: Yes — cheap to add, avoids "why can't I record the certificate number" feedback from accountants.]

**Q19: Beneficial vs legal ownership?**

This is a genuine complexity. A trustee company legally holds shares on behalf of trust beneficiaries. The share register records the **legal owner** (the trustee company), not the beneficial owner. For MoneyQuest v1, the share register records legal ownership only. Beneficial ownership is captured through the entity graph — the TRUSTEE_OF and BENEFICIARY_OF relationships in EntityRelationship already model this layer. The cap table shows "Trustee Co Pty Ltd holds 100% of Smith Family Trust units" — the user then follows the graph to see who the beneficiaries are. No additional modelling needed for v1.

**Q20: Historical point-in-time views?**

This is essential for tax return preparation ("Show me the cap table as at 30 June 2025"). The `issue_date` on ShareHolding and `transfer_date` on ShareTransfer provide the raw data. A point-in-time view reconstructs holdings by replaying transfers up to a given date. For v1, the transfer history enables manual reconstruction. For v1.1, add an "As at date" filter on the cap table that computes holdings at that point by applying transfers chronologically. This is a P2 feature — the transfer model already captures dates, so no schema changes needed, just a query filter.

[DECISION: Point-in-time "As at" date filter — include in P2 scope or defer to a future epic? Recommended: Include in P2 (User Story 4 scope). The query logic is straightforward: "sum all transfers where transfer_date <= as_at_date grouped by holder and class".]

---

## User Scenarios & Testing

### User Story 1 — Share Classes (Priority: P1)

An accountant opens the ownership page for a Pty Ltd entity and defines the share classes that entity has issued — for example, "Ordinary Shares" (1,000 total issued) and "Preference A" (200 total issued). Each share class has a name, total shares authorised, total shares issued, and an optional description of rights.

**Why this priority**: Share classes are the foundation — shareholders and percentages can't be recorded without them. For trusts, this story also covers defining unit classes.

**Independent Test**: Can be fully tested by creating share classes on an entity and verifying they appear in the ownership page header/summary.

**Acceptance Scenarios**:

1. **Given** I am on `/w/smith-pty-ltd/ownership`, **When** I click "Add Share Class" and enter name "Ordinary", total authorised 1000, total issued 1000, **Then** the share class appears in the summary card with those values.
2. **Given** a share class "Ordinary" exists with 1000 shares issued, **When** I edit the name to "Ordinary A" and update authorised to 2000, **Then** the share class reflects the updated values.
3. **Given** a share class has shareholders allocated against it, **When** I attempt to delete it, **Then** the system prevents deletion and shows a message explaining shares must be unallocated first.
4. **Given** the entity type is "trust", **When** I add a share class, **Then** the label reads "Unit Class" instead of "Share Class" throughout the page.
5. **Given** the entity type is "partnership", **When** I view the ownership page, **Then** labels read "Partnership Interest" instead of "Share Class", and counts represent interest percentages in basis points.
6. **Given** I create a share class with total issued = 0, **When** I save, **Then** the system accepts it (valid for authorised-but-unissued classes) and percentage calculations handle division by zero gracefully (show 0%).
7. **Given** I have `ownership.view` permission but NOT `ownership.create`, **When** I visit the ownership page, **Then** the "Add Share Class" button is not visible.

**Entity Type Label Mapping**:

| Entity Type | "Share Class" becomes | "Shares" becomes | "Shareholder" becomes |
|---|---|---|---|
| pty_ltd | Share Class | Shares | Shareholder |
| trust | Unit Class | Units | Unit Holder |
| partnership | Interest Class | Interests | Partner |
| smsf | Unit Class | Units | Member |
| not_for_profit | Membership Class | Memberships | Member |
| sole_trader | N/A (hide ownership page) | N/A | N/A |
| personal | N/A (hide ownership page) | N/A | N/A |

[DECISION: Should sole_trader and personal entity types have the ownership page at all? Sole traders don't have shares/units. Recommended: Hide the ownership nav item for sole_trader and personal entity types via `featureKey` or entity-type check.]

---

### User Story 2 — Shareholder Register (Priority: P1)

An accountant records who holds shares in the entity. A shareholder can be either an **existing contact** (individual person) or **another entity** (workspace) — for example, "John Smith (contact) holds 500 Ordinary shares" or "Smith Family Trust (entity) holds 200 Preference A shares". Each holding records: shareholder reference, share class, number of shares, ownership percentage (auto-calculated from total issued), investment amount, amount paid, amount unpaid, issue date, and optional certificate number.

**Why this priority**: The shareholder table is the core data — the cap table pie chart and practice-wide views depend on it.

**Independent Test**: Can be tested by adding shareholders to an entity and verifying the register table displays correctly with calculated percentages.

**Acceptance Scenarios**:

1. **Given** share class "Ordinary" exists with 1000 issued, **When** I add shareholder "John Smith" (contact) with 500 shares, **Then** the register shows John Smith at 50.00% ownership, and the totals row updates.
2. **Given** I am adding a shareholder, **When** I search for a holder, **Then** I can choose from existing contacts OR existing entities (other workspaces I have access to).
3. **Given** John Smith holds 500/1000 Ordinary shares and I add Jane Smith with 300 shares, **When** I view the register, **Then** John shows 50%, Jane shows 30%, and "Unallocated" shows 200 shares (20%).
4. **Given** the total allocated shares for a class exceeds the total issued, **When** I try to save, **Then** the system shows a warning (not a block) — over-allocation is allowed with a visible amber indicator.
5. **Given** a shareholder is another entity (workspace), **When** I click their name in the register, **Then** I navigate to that entity's ownership page.
6. **Given** a shareholder is another entity (workspace) and I save the holding, **Then** the system auto-creates or updates a `HOLDS_SHARES` EntityRelationship between the workspace-holder and this entity, with percentage matching the holding.
7. **Given** I add a shareholder with investment amount $1,000, amount paid $100, **Then** amount unpaid auto-calculates to $900 and the holding shows a "Partly Paid" indicator.
8. **Given** I enter a certificate number "CERT-001" for a holding, **Then** the certificate number appears in the register table and is included in any export.
9. **Given** a contact used as a shareholder is soft-deleted, **When** I view the register, **Then** the holding row shows the contact's name with a "(Deleted)" label — the holding is NOT removed.
10. **Given** I have `ownership.view` but NOT `ownership.create`, **When** I view the register, **Then** the "Add Shareholder" button is hidden and edit actions are disabled.

---

### User Story 3 — Cap Table View (Priority: P1)

The ownership page shows a visual cap table dashboard: a donut/pie chart of ownership breakdown by shareholder, a summary card (total shareholders, total shares, total securities value), and the full shareholder register table below. This is the primary view an accountant sees when they open `/w/{slug}/ownership`.

**Why this priority**: This is the main UX — without it, the data entry from Stories 1-2 has no readable output.

**Independent Test**: Can be tested by adding share classes and shareholders, then verifying the pie chart and summary render correctly.

**Acceptance Scenarios**:

1. **Given** an entity has 3 shareholders across 2 share classes, **When** I open `/w/{slug}/ownership`, **Then** I see a donut chart coloured by shareholder, a summary card with total shareholders/shares/value, and the register table.
2. **Given** I toggle between "By Shareholder" and "By Share Class" views, **When** I select "By Share Class", **Then** the pie chart segments show share class proportions instead of individual holders.
3. **Given** an entity has no share classes or shareholders defined, **When** I open the ownership page, **Then** I see an empty state with "Set up your ownership register" prompt and an "Add Share Class" button.
4. **Given** the entity has shareholders, **When** I view the summary card, **Then** it shows: total shareholders count, total shares issued (sum across all classes), total investment amount, and total amount unpaid (if any holdings are partly paid).
5. **Given** an entity has 1 shareholder at 100%, **When** I view the donut chart, **Then** I see a complete single-colour donut with the shareholder's name.
6. **Given** an entity has more than 8 shareholders, **When** I view the donut chart, **Then** the top 7 are shown individually and remaining are grouped as "Others" to avoid visual clutter.
7. **Given** the register has holdings where allocated shares exceed total issued, **When** I view the overview, **Then** an amber warning banner appears at the top: "Allocated shares exceed issued shares for [class name]."
8. **Given** the entity has holdings with unpaid amounts, **When** I view the summary card, **Then** a "Partly Paid" badge appears and the total unpaid amount is displayed.

---

### User Story 4 — Transfer History (Priority: P2)

When ownership changes — shares transferred, new shares issued, shares cancelled — the accountant records a transfer event. Each transfer logs: from holder, to holder, share class, number of shares, transfer date, consideration (price paid), and reason. The transfer creates new holdings automatically (or adjusts existing ones).

**Why this priority**: Transfers are the audit trail. Not blocking for v1 cap table display but essential for compliance and ASIC annual return preparation.

**Independent Test**: Can be tested by recording a transfer between two shareholders and verifying holdings update and the transfer appears in the history log.

**Acceptance Scenarios**:

1. **Given** John Smith holds 500 Ordinary shares, **When** I record a transfer of 200 shares from John to Jane Smith on 2026-03-15 for $200, **Then** John's holding decreases to 300, Jane's holding increases by 200 (or is created at 200 if new), and the transfer appears in the history log.
2. **Given** I want to issue new shares, **When** I record a transfer with "from" set to "New Issue" (no source holder), **Then** the total issued shares for that class increases and the recipient's holding increases.
3. **Given** I want to cancel/buy back shares, **When** I record a transfer with "to" set to "Cancellation", **Then** the source holder's shares decrease and total issued decreases.
4. **Given** an entity has 5 transfers recorded, **When** I view the transfer history tab, **Then** I see a chronological list with date, from, to, class, quantity, consideration, and reason.
5. **Given** a transfer involves two workspace-type holders, **When** the transfer is saved, **Then** the corresponding EntityRelationship percentages are recalculated for both the source and destination holders.
6. **Given** a transfer reduces a workspace-holder's shares to zero, **When** the transfer is saved, **Then** the corresponding EntityRelationship is soft-deleted (holder no longer owns shares).
7. **Given** a transfer has been recorded, **When** I attempt to edit or delete it, **Then** the system blocks the action — transfers are immutable audit records (consistent with the reversal-only pattern for posted journal entries). To correct a mistake, record a reversing transfer.
8. **Given** I am on the Transfers tab, **When** I filter by "As at" date 2025-06-30, **Then** the register view reconstructs holdings as at that date by applying only transfers on or before 2025-06-30.

[DECISION: Should transfers be immutable (consistent with the ledger's reversal-only pattern)? Or should accountants be able to edit historical transfers? Recommended: Immutable, with reversing transfers for corrections. This maintains audit integrity.]

---

### User Story 5 — Practice-Wide Ownership Report (Priority: P2)

A practice manager opens a report showing ownership summaries across all client entities they manage. The report shows: entity name, entity type, number of shareholders, total shares, and a mini ownership breakdown (top 3 holders with percentages). The practice manager can click through to any entity's full cap table.

**Why this priority**: Practice managers need a portfolio view to audit ownership across their book of clients — especially for family groups where the same people appear across multiple entities.

**Independent Test**: Can be tested by setting up ownership data on multiple entities and viewing the practice-wide report.

**Implementation note**: This report should be a new tab on the existing `/practice/reports` page (which already has Overview/WIP/Utilisation tabs), rather than a separate route. Tab name: "Ownership". This follows the established practice reports pattern.

**Acceptance Scenarios**:

1. **Given** I am a practice manager with 10 client entities, 4 of which have ownership data, **When** I open `/practice/reports?tab=ownership`, **Then** I see a table with all 10 entities, the 4 with data showing shareholder counts and top holders, and the 6 without showing "No data".
2. **Given** the practice-wide report shows entities, **When** I click an entity name, **Then** I navigate to that entity's `/w/{slug}/ownership` page.
3. **Given** I want to find entities where a specific person is a shareholder, **When** I search by shareholder name, **Then** the report filters to only entities where that person holds shares.
4. **Given** the report lists entities, **When** I sort by "Total Shareholders", **Then** entities are ordered by shareholder count.
5. **Given** entity types are mixed (Pty Ltd, Trust, Partnership), **When** I view the report, **Then** labels adapt per entity type (shareholders/unit holders/partners) in the summary column.

---

### User Story 6 — Structure Page Navigation Cleanup (Priority: P1)

The `/structure` entity graph page is retained in the entity sidebar for all users. For practice users, it is ALSO accessible from the practice portal as a top-level "Entity Map" link. The graph continues to work as before — the practice-level link provides a convenient cross-entity access point, while the per-entity link remains for non-practice users.

**Why this priority**: The ownership page is a natural home for per-entity ownership data, while the structure graph remains the cross-entity network view. Both are needed.

**Independent Test**: Can be tested by verifying the practice nav includes "Entity Map" and the ownership page links to the graph view.

**Acceptance Scenarios**:

1. **Given** I am on any entity's dashboard, **When** I look at the sidebar navigation, **Then** I still see the "Structure" link (no removal).
2. **Given** I am on the practice portal, **When** I look at the navigation, **Then** I see an "Entity Map" link that opens the graph view.
3. **Given** I am on `/w/smith-pty-ltd/ownership`, **When** I click "View in Entity Map", **Then** I navigate to the structure graph with this entity highlighted/selected.
4. **Given** I am on the ownership page, **When** I see the "Ownership" nav item in the sidebar, **Then** it appears directly before "Structure" in the navigation order.
5. **Given** my entity type is "sole_trader" or "personal", **When** I look at the sidebar, **Then** I do NOT see the "Ownership" nav item (these entity types have no share/unit structure).

---

### Edge Cases

- **Shareholder (contact) deleted**: Their holding remains with a "(Deleted Contact)" label — holdings are never silently removed.
- **Workspace (entity shareholder) deleted**: Same treatment — the holding persists with a "(Deleted Entity)" marker. The EntityRelationship is soft-deleted by cascade, but the ShareHolding remains independently.
- **Multiple share classes per holder**: Each holding is per share class — a single shareholder can have multiple rows (one per class). Percentages are calculated per class and shown with a weighted total.
- **Over-allocation**: Warning indicator (amber) but not blocked — accountants may be correcting data incrementally.
- **EntityRelationship sync**: ShareHolding with workspace-type holders auto-syncs EntityRelationship percentage. This is one-way: register -> graph. Editing the graph directly does not update the register.
- **Zero issued shares**: Division by zero in percentage calculation handled gracefully — show 0% with a tooltip "No shares issued in this class."
- **Currency of investment amounts**: Investment amounts use the workspace's `base_currency`. Multi-currency share transactions are out of scope for v1.
- **Duplicate shareholders in same class**: The system should prevent adding the same holder to the same share class twice. If shares change hands, use the transfer mechanism (P2).
- **Entity types without ownership**: Sole traders and personal entities do not have meaningful ownership structures — the ownership nav item is hidden for these entity types.
- **Beneficial vs legal ownership**: The share register records legal ownership only. Beneficial ownership is modelled through EntityRelationship types (TRUSTEE_OF, BENEFICIARY_OF) in the entity graph.
- **Partly paid shares**: Holdings track amount_paid and amount_unpaid separately. The sum must equal investment_amount (enforced via validation).

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to create, edit, and delete share classes per entity with: name, total authorised (integer), total issued (integer), and rights description (nullable text).
- **FR-002**: System MUST allow users to record shareholders against an entity with: holder reference (polymorphic — contact or workspace), share class, share count (integer), investment amount (cents), amount paid (cents), amount unpaid (cents), issue date, and certificate number (nullable).
- **FR-003**: System MUST auto-calculate ownership percentage from share count divided by total issued for that class. When total issued is zero, percentage displays as 0%.
- **FR-004**: System MUST display a cap table view per entity at `/w/{slug}/ownership` showing: donut chart, summary card, and shareholder register table.
- **FR-005**: System MUST support shareholders that are contacts (individuals) OR other entities (workspaces).
- **FR-006**: System MUST display entity-type-aware labels per the label mapping table (Share Class / Unit Class / Interest Class / Membership Class).
- **FR-007**: System MUST log transfer events with: from holder (nullable for new issues), to holder (nullable for cancellations), share class, quantity, transfer date, consideration amount (cents), and reason.
- **FR-008**: System MUST support "New Issue" (no source) and "Cancellation" (no destination) transfer types, adjusting total issued accordingly.
- **FR-009**: System MUST automatically adjust holdings when a transfer is recorded.
- **FR-010**: System MUST show a transfer history log per entity, ordered chronologically.
- **FR-011**: System MUST provide a practice-wide ownership report as a tab on `/practice/reports` showing all client entities with ownership summaries.
- **FR-012**: System MUST allow practice managers to search the ownership report by shareholder name across all entities.
- **FR-013**: System MUST show a warning (not a hard block) when allocated shares exceed total issued for a share class.
- **FR-014**: System MUST add "Entity Map" link to practice portal navigation (pointing to the structure graph).
- **FR-015**: System MUST add "Ownership" link to entity sidebar navigation, positioned before "Structure", hidden for sole_trader and personal entity types.
- **FR-016**: System MUST restrict ownership data access via dedicated permissions: `ownership.view`, `ownership.create`, `ownership.update`, `ownership.delete`.
- **FR-017**: System MUST auto-sync EntityRelationship percentage when ShareHolding with workspace-type holder is created, updated, or deleted.
- **FR-018**: System MUST enforce that the same holder cannot hold shares in the same class twice (unique constraint on holder + share class).
- **FR-019**: System MUST validate that `amount_paid + amount_unpaid = investment_amount` for each holding.
- **FR-020**: Transfers MUST be immutable once recorded. Corrections require a reversing transfer.
- **FR-021**: System MUST display "Partly Paid" indicator on holdings where `amount_unpaid > 0`.
- **FR-022**: System MUST prevent deletion of a share class that has associated holdings.

### Key Entities

- **ShareClass**: Defines a class of shares/units for an entity. Workspace-scoped model.
  - `id` (auto-increment), `uuid`, `workspace_id` (FK), `name` (string), `total_authorised` (integer), `total_issued` (integer), `rights_description` (text, nullable), `timestamps`, `soft_deletes`
  - One entity can have multiple share classes.

- **ShareHolding**: A record of shares held by a shareholder in a specific class. Workspace-scoped model.
  - `id` (auto-increment), `uuid`, `workspace_id` (FK), `share_class_id` (FK), `holder_type` (string — 'contact' or 'workspace'), `holder_id` (integer), `share_count` (integer), `investment_amount` (integer, cents), `amount_paid` (integer, cents, default 0), `amount_unpaid` (integer, cents, default 0), `issue_date` (date), `certificate_number` (string, nullable, max 50), `timestamps`, `soft_deletes`
  - Unique constraint: `workspace_id` + `share_class_id` + `holder_type` + `holder_id`
  - Ownership percentage is a computed value (share_count / share_class.total_issued * 10000), NOT stored.

- **ShareTransfer**: An immutable event recording a change in holdings. Workspace-scoped model.
  - `id` (auto-increment), `uuid`, `workspace_id` (FK), `share_class_id` (FK), `from_holder_type` (string, nullable), `from_holder_id` (integer, nullable), `to_holder_type` (string, nullable), `to_holder_id` (integer, nullable), `quantity` (integer), `transfer_date` (date), `consideration_amount` (integer, cents, default 0), `reason` (string, nullable, max 500), `transfer_type` (enum: transfer, new_issue, cancellation, buyback), `recorded_by_user_id` (FK to users), `timestamps`
  - No soft deletes — transfers are permanent audit records.
  - from_holder is nullable (for new issues). to_holder is nullable (for cancellations/buybacks).

### Permissions (new)

Add to `RolesAndPermissionsSeeder`:

| Permission | owner | accountant | bookkeeper | approver | auditor | client |
|---|---|---|---|---|---|---|
| `ownership.view` | Y | Y | Y | Y | Y | Y |
| `ownership.create` | Y | Y | Y | N | N | N |
| `ownership.update` | Y | Y | Y | N | N | N |
| `ownership.delete` | Y | Y | N | N | N | N |

---

## Open Decisions Summary

The following decisions need product owner validation:

1. **[DECISION: Structure nav]** Keep Structure in entity sidebar for all users AND add Entity Map to practice nav? Or remove Structure from entity sidebar entirely?
2. **[DECISION: Freetext shareholders]** Allow freetext holder names for shareholders who aren't contacts/entities? Or require creating a contact?
3. **[DECISION: Integer share counts]** Confirm integers-only for share/unit counts (no fractional shares)?
4. **[DECISION: Per-class percentage]** Confirm per-class percentage as primary, with weighted total as secondary?
5. **[DECISION: Partly paid shares]** Include `amount_paid` / `amount_unpaid` in v1?
6. **[DECISION: Certificate numbers]** Include `certificate_number` in v1?
7. **[DECISION: Immutable transfers]** Transfers are immutable (reversal-only pattern)?
8. **[DECISION: As-at date filter]** Include point-in-time cap table reconstruction in P2 scope?
9. **[DECISION: Entity type visibility]** Hide ownership nav for sole_trader and personal entity types?

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: An accountant can set up a complete ownership register (share classes + shareholders) for an entity within 5 minutes.
- **SC-002**: The cap table page loads and renders the pie chart + shareholder table within 2 seconds for entities with up to 50 shareholders.
- **SC-003**: A practice manager can identify all entities where a specific person is a shareholder within 10 seconds using the search function.
- **SC-004**: 100% of entities show correct ownership percentages calculated from share counts — no manual percentage entry required.
- **SC-005**: Transfer history maintains a complete audit trail — every share movement is traceable with date, parties, and consideration.
- **SC-006**: EntityRelationship graph accurately reflects ownership percentages from the share register — no manual sync required.
- **SC-007**: Partly paid share indicators are visible for all holdings with unpaid amounts, supporting ASIC annual return preparation.
