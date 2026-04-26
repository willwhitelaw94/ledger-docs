---
title: "Feature Specification: Personal Ledger"
---

# Feature Specification: Personal Ledger

**Feature Branch**: `030-PLG-personal-ledger`
**Created**: 2026-03-15
**Status**: Approved (Gate 1 passed 2026-03-15)
**Epic**: 030-PLG
**Initiative**: FL — Financial Ledger Platform
**Effort**: L (4 sprints)
**Depends On**: 002-CLE (complete), 028-CFT (complete), 010-PLT (complete)

### Out of Scope

- **Automatic price feeds** — property valuation APIs, share price APIs, crypto feeds deferred to v2
- **Budgeting / spending tracking** — this is not Mint. V1 tracks assets and liabilities, not spending categories
- **Investment portfolio management** — no individual share lots, cost basis, or capital gains. Just total portfolio value.
- **Tax implications** — no CGT calculations, no deduction tracking
- **Workspace upgrade/migration** — personal workspaces stay personal. Users create a separate business workspace if needed.

### Architectural Decisions

1. **Separate workspaces, not upgrades**: Personal and business are separate workspaces. Users who outgrow personal create a new business workspace and group them via 028-CFT.
2. **Role-based UI override**: Entity type drives the default UI. Accountants viewing a personal workspace see the full accounting view (role override). Workspace owners see the simplified personal view.
3. **Hardcoded module mapping for v1**: Entity type → module list is a PHP match statement, not a database table. Data-driven configuration deferred to v2.
4. **Personal CoA template**: ~15 accounts auto-generated on workspace creation. No template selection step in onboarding.
5. **Valuations as journal entries**: "Update value" creates a journal entry (Debit: Asset, Credit: Revaluation Reserve). Opinionated but correct for wealth tracking. Users never see the journal entry.

---

## Overview

MoneyQuest's ledger engine handles double-entry accounting for any entity type, but the UI assumes every user is an accountant. Personal Ledger adds a new entity type ("personal") that transforms the entire user experience — simplified onboarding, asset/liability forms instead of journal entries, a net worth dashboard instead of financial reports, and a modular sidebar that hides accounting features. The same engine powers everything; only the presentation layer changes.

---

## User Scenarios & Testing

### User Story 1 — Personal Workspace Onboarding (Priority: P1)

An individual wants to track their personal wealth. They sign up, select "Personal / Individual" as their entity type, and answer a simple "What do you want to track?" checklist. The system creates a workspace with a simplified chart of accounts and drops them into a net worth dashboard — not an accounting dashboard.

**Why this priority**: Without a personal entity type in onboarding, individuals can't enter the platform. This is the front door.

**Independent Test**: Create a new user, select "Personal" entity type, complete onboarding, verify the workspace has a personal CoA and the dashboard shows the net worth view.

**Acceptance Scenarios**:

1. **Given** I am on the workspace creation screen (onboarding or new workspace), **When** I view the entity type options, **Then** I see "Personal / Individual" alongside the existing business types (Pty Ltd, Trust, etc.).

2. **Given** I select "Personal / Individual", **When** I proceed, **Then** I skip business-specific steps (ABN, GST registration, industry template selection) and instead see a checklist: "What would you like to track?" with options: Property, Investments, Bank Accounts, Superannuation, Vehicles, Debts.

3. **Given** I check "Property" and "Debts" and complete onboarding, **When** my workspace is created, **Then** the chart of accounts contains only the relevant accounts (Property asset accounts, Mortgage/Loan liability accounts, Equity accounts) — not the full business CoA.

4. **Given** my workspace is created with entity_type = "personal", **When** I land on the dashboard, **Then** I see a net worth headline (initially $0) with "Add your first asset" and "Add your first debt" prompts — not the standard business KPI cards.

5. **Given** I am an accountant viewing a client's personal workspace, **When** I open it from the practice dashboard, **Then** I see the full accounting UI (journal entries, chart of accounts, reports) — not the simplified personal view. My role overrides the entity type default.

---

### User Story 2 — Add Assets (Priority: P1)

An individual wants to record that they own a house worth $850,000 and have $50,000 in shares. They use simple "Add Asset" forms with friendly fields — no accounting knowledge required. The system creates the correct journal entries underneath.

**Why this priority**: Assets are the core data input. Without them, the net worth dashboard shows nothing.

**Independent Test**: Add 2 assets, verify they appear on the dashboard with correct values, verify journal entries were created in the background.

**Acceptance Scenarios**:

1. **Given** I am on my personal dashboard, **When** I click "Add Asset", **Then** I see a form with: Name (e.g., "My House"), Category (select: Property, Investments, Cash & Bank, Superannuation, Vehicles, Other), Current Value (dollar input), Purchase Date (optional), and Notes (optional).

2. **Given** I fill in "My House", category "Property", value "$850,000" and save, **When** the asset is created, **Then** my net worth dashboard updates to show $850,000, and the asset appears in my Assets list with name, category icon, and current value.

3. **Given** the asset was created, **When** I inspect the ledger as an accountant, **Then** I see a journal entry: Debit "Property" $850,000, Credit "Opening Balance (Equity)" $850,000.

4. **Given** I have 3 assets (house, shares, super), **When** I view my Assets page, **Then** I see a list/grid of asset cards sorted by value (highest first), each showing: name, category badge, current value, and last updated date.

5. **Given** I click on an asset card, **When** the detail view opens, **Then** I can edit the name, category, notes, and see the valuation history (list of value changes over time with dates).

---

### User Story 3 — Add Debts (Priority: P1)

An individual wants to record their mortgage ($400,000), credit card ($5,000), and HECS debt ($20,000). Same simple form pattern as assets.

**Why this priority**: Debts are the other half of net worth. Assets minus debts = net worth.

**Independent Test**: Add 3 debts, verify net worth calculation is correct (assets minus debts).

**Acceptance Scenarios**:

1. **Given** I am on my personal dashboard, **When** I click "Add Debt", **Then** I see a form with: Name (e.g., "Home Loan"), Category (select: Mortgage, Credit Card, Personal Loan, HECS/HELP, Car Loan, Other), Balance Owing (dollar input), Interest Rate (optional, percentage), Lender (optional text), and Notes (optional).

2. **Given** I add "Home Loan" with balance $400,000, **When** saved, **Then** my net worth decreases by $400,000, and the debt appears in my Debts list.

3. **Given** I have assets totalling $900,000 and debts totalling $425,000, **When** I view the dashboard, **Then** net worth shows $475,000 with a clear breakdown: "Assets: $900k | Debts: $425k".

4. **Given** the debt was created, **When** inspected as an accountant, **Then** I see a journal entry: Debit "Opening Balance (Equity)" $400,000, Credit "Mortgage (Liability)" $400,000.

---

### User Story 4 — Update Valuations (Priority: P1)

An individual's house was worth $850,000 six months ago. It's now worth $900,000 based on a recent comparable sale. They click "Update Value" on the asset and enter the new amount. The system records the change and adjusts net worth.

**Why this priority**: Wealth changes over time. Without valuations, the dashboard becomes stale and users stop returning.

**Independent Test**: Create an asset at $850k, update to $900k, verify net worth increased by $50k, verify valuation history shows both entries.

**Acceptance Scenarios**:

1. **Given** I am viewing an asset "My House" currently valued at $850,000, **When** I click "Update Value", **Then** I see a simple form: New Value (dollar input) and Date (defaults to today).

2. **Given** I enter $900,000 and save, **When** the update completes, **Then** the asset card shows $900,000, net worth increases by $50,000, and the valuation history shows two entries: $850,000 (original) and $900,000 (today).

3. **Given** the valuation was updated, **When** inspected as an accountant, **Then** I see a journal entry: Debit "Property" $50,000, Credit "Revaluation Reserve (Equity)" $50,000.

4. **Given** I update a debt balance from $400,000 to $380,000 (paid down), **When** saved, **Then** net worth increases by $20,000 (liability decreased). Journal entry: Debit "Mortgage" $20,000, Credit "Revaluation Reserve" $20,000.

5. **Given** an asset has 5 valuations over 12 months, **When** I view the asset detail, **Then** I see a simple line chart showing value over time.

---

### User Story 5 — Modular Sidebar & Dashboard (Priority: P2)

The sidebar and dashboard adapt based on entity_type. Personal workspaces show a wealth-focused navigation and dashboard. Business workspaces show the full accounting UI. The same codebase renders both.

**Why this priority**: Without modular UI, personal users see intimidating accounting features they don't need.

**Independent Test**: Create two workspaces (personal + business), switch between them, verify the sidebar and dashboard render differently.

**Acceptance Scenarios**:

1. **Given** my workspace has entity_type = "personal", **When** I view the sidebar, **Then** I see: Dashboard, Assets, Debts, Net Worth, Transactions (if bank connected), Settings. I do NOT see: Invoices, Bills, Journal Entries, Chart of Accounts, Banking, Reports, Contacts, Jobs.

2. **Given** my workspace has entity_type = "pty_ltd", **When** I view the sidebar, **Then** I see the full accounting navigation (unchanged from today).

3. **Given** I switch between a personal and business workspace, **When** the workspace context changes, **Then** the sidebar updates immediately to match the entity type.

4. **Given** I am an accountant with a personal workspace client, **When** I enter that workspace from the practice dashboard, **Then** I see the full accounting sidebar (role override) — because I need access to journal entries and the CoA for professional review.

5. **Given** the module mapping is: personal → [dashboard, assets, debts, net_worth, transactions, settings], **When** a personal user navigates to /invoices directly via URL, **Then** they receive a 404 or redirect to dashboard (module not available).

---

### User Story 6 — Personal Chart of Accounts Template (Priority: P2)

When a personal workspace is created, the system auto-generates a simplified chart of accounts with ~15 accounts tailored to the user's "What do you want to track?" selections. No manual CoA setup required.

**Why this priority**: The CoA is the foundation of the ledger. Personal users should never see or manage it directly, but it must exist for the engine to work.

**Independent Test**: Create a personal workspace with "Property + Investments + Debts" selected, verify the CoA has the correct accounts and nothing extra.

**Acceptance Scenarios**:

1. **Given** I selected "Property" and "Debts" during onboarding, **When** my workspace is created, **Then** the chart of accounts contains: Property (asset), Mortgage (liability), Personal Loan (liability), Credit Card (liability), Opening Balance (equity), Revaluation Reserve (equity), Cash at Bank (asset — always included).

2. **Given** I selected all tracking options, **When** my workspace is created, **Then** the CoA contains the full personal template (~15 accounts covering all categories).

3. **Given** my personal workspace exists, **When** I navigate to Settings, **Then** I do NOT see a "Chart of Accounts" link. The CoA is invisible to personal users.

4. **Given** an accountant views my personal workspace, **When** they navigate to Chart of Accounts, **Then** they see the full CoA and can add/modify accounts if needed (professional override).

---

### User Story 7 — Net Worth Integration with 028-CFT (Priority: P3)

An individual has a personal workspace and two business workspaces (trust + company). The 028-CFT "My Net Worth" auto-group includes all three. The personal ledger's assets and debts feed directly into the consolidated net worth view alongside the business entities.

**Why this priority**: This is where the personal ledger connects to the bigger wealth management vision. Lower priority because 028-CFT auto-group already works — this story verifies the integration.

**Independent Test**: Create a personal workspace with $500k net worth and two business workspaces, verify "My Net Worth" consolidation includes all three.

**Acceptance Scenarios**:

1. **Given** I own a personal workspace (net worth $500k) and a business workspace (net worth $200k), **When** I view /net-worth, **Then** the consolidated view shows $700k with both entities in the breakdown.

2. **Given** I update my personal house value from $850k to $900k, **When** I view /net-worth, **Then** the consolidated net worth reflects the $50k increase immediately (within cache TTL).

3. **Given** my personal workspace contributes to the "My Net Worth" auto-group, **When** a monthly snapshot is generated, **Then** it includes the personal workspace's balance sheet data alongside business workspaces.

---

### Edge Cases

- What happens when a user selects zero tracking options during onboarding? Create the workspace with a minimal CoA (Cash at Bank + Opening Balance + Revaluation Reserve). Show "Add your first asset" prompt.
- What happens when someone adds a negative asset value? Prevent it — assets must be >= 0. Show validation error "Asset value must be positive. If this is a debt, add it under Debts instead."
- What happens when a personal user tries to access /journal-entries via URL? Return 404 or redirect to /dashboard. The module is not available for personal entity type.
- What happens when an accountant converts a personal workspace to business? Not supported in v1. They should create a separate business workspace.
- What happens when a debt balance reaches $0? Keep it in the list with $0 balance and a "Paid off!" badge. User can archive it.

---

## Requirements

### Functional Requirements

**Onboarding**
- **FR-001**: System MUST offer "Personal / Individual" as an entity type option during workspace creation.
- **FR-002**: Personal onboarding MUST skip business-specific steps (ABN, GST, industry template) and instead show a "What do you want to track?" checklist.
- **FR-003**: System MUST auto-generate a personal chart of accounts based on the user's tracking selections.
- **FR-004**: Personal onboarding MUST land the user on a net-worth-focused dashboard, not the standard business dashboard.

**Assets & Debts**
- **FR-005**: System MUST provide an "Add Asset" form with: name, category (Property, Investments, Cash & Bank, Superannuation, Vehicles, Other), current value, purchase date (optional), notes.
- **FR-006**: System MUST provide an "Add Debt" form with: name, category (Mortgage, Credit Card, Personal Loan, HECS/HELP, Car Loan, Other), balance owing, interest rate (optional), lender (optional), notes.
- **FR-007**: Creating an asset MUST generate a journal entry underneath: Debit asset account, Credit Opening Balance equity account.
- **FR-008**: Creating a debt MUST generate a journal entry: Debit Opening Balance, Credit liability account.
- **FR-009**: Asset values MUST be >= 0. Debt balances MUST be >= 0.

**Valuations**
- **FR-010**: System MUST support "Update Value" on any asset or debt, recording the new value and date.
- **FR-011**: Updating an asset value MUST generate a journal entry: Debit/Credit asset account and Revaluation Reserve equity account for the difference.
- **FR-012**: System MUST maintain a valuation history per asset/debt showing all value changes with dates.
- **FR-013**: System MUST display a value-over-time chart on the asset/debt detail view when 2+ valuations exist.

**Modular UI**
- **FR-014**: Sidebar navigation MUST adapt based on workspace entity_type. Personal shows: Dashboard, Assets, Debts, Net Worth, Settings. Business shows full accounting navigation.
- **FR-015**: Module mapping MUST be hardcoded per entity type in v1 (PHP match statement).
- **FR-016**: Accountants viewing a personal workspace MUST see the full accounting UI (role-based override). Workspace owners see the entity-type UI.
- **FR-017**: Personal users navigating to unavailable modules (e.g., /invoices) MUST be redirected to their dashboard.

**Personal CoA**
- **FR-018**: System MUST include a "personal" chart of accounts template with ~15 accounts covering: Property, Vehicles, Investments, Superannuation, Cash, Mortgage, Credit Cards, Loans, HECS, Opening Balance, Revaluation Reserve.
- **FR-019**: Personal workspace CoA MUST be invisible to the workspace owner. No "Chart of Accounts" link in personal navigation.
- **FR-020**: Accountants MUST retain full CoA access on personal workspaces via role override.

**Integration**
- **FR-021**: Personal workspace balance sheets MUST feed into 028-CFT's "My Net Worth" auto-group consolidation.
- **FR-022**: Monthly net worth snapshots MUST include personal workspace data.

### Key Entities

- **Personal Asset**: A user-facing representation of a balance sheet asset — has name, category, current value, valuation history. Maps to a ChartAccount + JournalEntryLines underneath.
- **Personal Debt**: Same pattern for liabilities — name, category, balance, interest rate, lender.
- **Valuation Entry**: A timestamped value change on an asset or debt — creates a journal entry. Has: amount, date, previous_amount.
- **Module Configuration**: Maps entity_type → list of available sidebar modules and pages. Hardcoded in v1.
- **Personal CoA Template**: A chart of accounts template with ~15 accounts for personal wealth tracking. Stored alongside existing business templates.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A new user can create a personal workspace and add their first asset in under 2 minutes.
- **SC-002**: Personal users never see the words "journal entry", "debit", "credit", or "chart of accounts" in their UI.
- **SC-003**: Net worth updates within 1 second of saving an asset/debt value change.
- **SC-004**: Personal workspace sidebar shows exactly 5 items (Dashboard, Assets, Debts, Net Worth, Settings) — no accounting modules leak through.
- **SC-005**: Accountants can access full accounting features on personal workspaces without any configuration change.
- **SC-006**: Personal workspace assets/debts feed correctly into 028-CFT consolidated net worth (verified by test).
- **SC-007**: The personal CoA auto-generation creates accounts in under 500ms (no API calls, template-based).

---

## Clarifications

### Session 2026-03-15 (Pre-spec architectural decisions)

- Q: What accounting treatment for "Add Asset"? → A: Debit Asset, Credit Opening Balance (Equity). "Update Value" uses Revaluation Reserve. Opinionated but correct for wealth tracking.
- Q: Personal → Business upgrade path? → A: Separate workspaces. No migration. Group them via 028-CFT if needed.
- Q: What UI does an accountant see on a personal workspace? → A: Full accounting UI. Role overrides entity type. Accountants need journal entries and CoA access for professional review.
- Q: Module mapping: hardcoded or data-driven? → A: Hardcoded PHP match statement in v1. Data-driven (database table) in v2.
- Q: What's in the personal CoA? → A: ~15 accounts covering standard personal asset/liability categories plus Opening Balance and Revaluation Reserve equity accounts.
