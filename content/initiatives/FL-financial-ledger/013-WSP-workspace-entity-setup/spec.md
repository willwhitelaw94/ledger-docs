---
title: "Feature Specification: Workspace Entity Setup & Smart Chart of Accounts"
---

# Feature Specification: Workspace Entity Setup & Smart Chart of Accounts

**Epic**: 013-WSP
**Created**: 2026-03-14
**Status**: Draft — Clarified 2026-03-14
**Initiative**: FL — Financial Ledger Platform

## Clarification Decisions (2026-03-14)

| # | Question | Decision |
|---|----------|----------|
| Q1 | Simple vs Advanced mode | **Both in v1** — simple (free-text AI extraction) is the default; advanced (structured questions) is toggled. Both converge on the same flag array and template matcher. |
| Q2 | Per-account reasoning text | **In scope v1, stored on template** — each `CoA Template Account` carries a static reasoning sentence authored by admins. Rendered in the CoA review screen. |
| Q3 | First workspace / onboarding integration | **Wizard replaces onboarding workspace creation** — all workspace creation (first and subsequent) routes through the new wizard. One code path. Onboarding pre-populates entity type if collected earlier. |
| Q4 | ABN optionality | **Required for all entity types, strictly validated** — Pty Ltd, Trust, Sole Trader, Partnership, SMSF all require a valid ABN. NFP requires ABN if GST-registered, otherwise optional. |
| Q5 | New workspace access | **Creator gets `owner` role only** — no other users auto-added. Invitation is a deliberate post-creation action from workspace settings. |
| Q6 | Template composition | **Hybrid** — base template per entity+industry handles structural differences (equity structure, entity-specific accounts). Flag overlays (employees, vehicles, property, etc.) are additive modules applied on top, consistent regardless of entity type. |
| Q7 | Sub_type canonical list | **Closed enum, defined in this epic** — ~60–80 canonical values seeded as part of 013-WSP. All template accounts and future bank feed rules reference this enum. New values added by platform admins only. |
| Q8 | Wizard abandonment | **Discard on close with warning** — no draft workspaces. Closing shows a confirmation dialog; on confirm all wizard state is discarded. No workspace is created until Stage 3 is finalised. |
| Q9 | Post-creation account suggestions | **Additive "suggested accounts" in CoA settings** — never removes or flags existing accounts. Suggests accounts the workspace doesn't yet have based on the original questionnaire snapshot. Framed as a suggestion, not a re-run of setup. |
| Q10 | Custom account codes & CoA configurability | **Auto-assign in wizard, fully configurable post-creation** — wizard auto-assigns the next available code in the correct type range. After creation, the CoA is fully editable: add, remove, rename, recode accounts one by one via a rich management UI. |

---

## User Scenarios & Testing

### User Story 1 — Create a New Workspace via Guided Wizard (Priority: P1)

A business owner with an existing organisation account needs to set up a second set of books — e.g. a family trust alongside their existing company. They open the workspace switcher, choose "Create new workspace", and are guided through a 3-stage wizard: (1) entity type and ABN, (2) a short questionnaire about how the business operates, (3) a review of the suggested Chart of Accounts. They approve the accounts and land in a new, fully configured workspace.

**Why this priority**: This is the entry point for all other stories. Without the creation wizard, no other workspace or CoA personalisation exists. Also unblocks multi-entity users who currently have no path to create a second workspace.

**Independent Test**: Can be tested end-to-end by completing the wizard from the switcher and verifying a new isolated workspace exists with a seeded CoA.

**Acceptance Scenarios**:

1. **Given** a logged-in user on any workspace page, **When** they open the workspace switcher and select "Create new workspace", **Then** a 3-stage wizard opens.
2. **Given** Stage 1 of the wizard, **When** the user selects "Sole Trader" as entity type and enters a valid 11-digit ABN, **Then** the ABN is stored against the workspace and the user advances to Stage 2.
3. **Given** Stage 1, **When** the user submits an invalid ABN (fails check-digit validation), **Then** an error is shown and the user cannot advance.
4. **Given** Stage 2, **When** the user answers all questionnaire questions and submits, **Then** Stage 3 displays a pre-populated CoA based on their answers.
5. **Given** Stage 3, **When** the user approves the CoA without changes, **Then** the workspace is created and the user is switched into it.
6. **Given** a completed wizard, **When** the new workspace loads, **Then** all seeded accounts carry a canonical `sub_type` value and system accounts (AR, AP, GST Collected, GST Paid, Retained Earnings) are marked locked.

---

### User Story 2 — Smart Questionnaire Drives Account Selection (Priority: P1)

A tradesperson setting up a new workspace for their electrical business answers the questionnaire: trades industry, has employees, owns vehicles, is GST-registered, invoices clients. The system matches these answers to the Trades template and adds employee accounts (Wages, PAYG Withholding, Superannuation), vehicle accounts (Motor Vehicles, Fuel, Depreciation), and the full GST set. A professional services firm that answers "no employees, no inventory, professional services" gets a leaner account list.

**Why this priority**: The questionnaire is the intelligence layer that differentiates this platform. Without it, every workspace gets the same generic CoA.

**Independent Test**: Can be tested by submitting different questionnaire combinations via the API and verifying the returned account list changes accordingly.

**Acceptance Scenarios**:

1. **Given** a user selects "Trades" industry and answers "Yes" to employees, **When** Stage 3 loads, **Then** the suggested CoA includes Wages Expense, PAYG Withholding Payable, and Superannuation Payable accounts.
2. **Given** a user answers "No" to employees, **When** Stage 3 loads, **Then** no wage or payroll accounts appear in the suggestion.
3. **Given** a user answers "Yes" to GST-registered, **When** Stage 3 loads, **Then** GST Collected and GST Paid are always present (and locked as system accounts).
4. **Given** a user answers "Yes" to vehicles, **When** Stage 3 loads, **Then** Motor Vehicles, Accumulated Depreciation — Vehicles, and Fuel Expense accounts are included.
5. **Given** a user answers "Yes" to property ownership, **When** Stage 3 loads, **Then** Rental Income, Investment Property, Mortgage Liability, and Property Depreciation accounts are included.
6. **Given** any questionnaire combination, **When** Stage 3 loads, **Then** every suggested account has a non-null `sub_type` value.

---

### User Story 3 — Review and Edit Suggested CoA Before Finalising (Priority: P2)

Before committing the new workspace, a user can see all suggested accounts in a review screen, rename accounts to suit their terminology (e.g. "Wages Expense" → "Staff Wages"), remove accounts they don't need, and add accounts not in the suggestion. They can also trigger AI-assisted renaming to get plain-language labels based on their industry and entity type.

**Why this priority**: The review step ensures the CoA fits the business exactly at setup — reducing post-setup editing and support burden.

**Independent Test**: Can be tested by modifying the suggested CoA on Stage 3 and verifying the saved workspace reflects only the finalised accounts.

**Acceptance Scenarios**:

1. **Given** Stage 3 is loaded with suggested accounts, **When** the user renames an account, **Then** the new name is used in the final workspace (the `sub_type` remains unchanged).
2. **Given** Stage 3, **When** the user removes a non-system account, **Then** it is excluded from the final seeded CoA.
3. **Given** Stage 3, **When** the user tries to remove a system account (AR, AP, GST accounts, Retained Earnings), **Then** the action is blocked with an explanation.
4. **Given** Stage 3, **When** the user clicks "Suggest plain-language names" (AI rename), **Then** account names are updated with plain-language alternatives and the user can accept or revert individual changes.
5. **Given** the AI rename is triggered but the service is unavailable, **When** the request fails, **Then** the original account names are preserved and an informational message is shown — the user can still proceed without AI renaming.

---

### User Story 4 — Entity Type & ABN at Workspace Level (Priority: P2)

A user who manages a company and a family trust under one login needs each workspace to carry the correct ABN and legal entity type independently. The workspace settings page shows entity type, ABN, and allows updating them. The organisation-level ABN remains for billing/account purposes.

**Why this priority**: ABN at workspace level is required for correct BAS reporting, STP, and future ATO integrations. It's also the foundation for consolidation reporting (014-CON) where entity type determines account classification.

**Independent Test**: Can be tested by creating two workspaces with different entity types and ABNs, then verifying each workspace returns its own ABN and entity type from the API.

**Acceptance Scenarios**:

1. **Given** a workspace was created with entity type "Trust" and a trust ABN, **When** the workspace settings page loads, **Then** entity type "Trust" and the trust ABN are displayed.
2. **Given** workspace settings, **When** a user with owner role updates the ABN, **Then** the new ABN is validated and saved.
3. **Given** workspace settings, **When** a user with bookkeeper role tries to update the entity type, **Then** the action is denied (owner/accountant only).
4. **Given** two workspaces under the same organisation, **When** both are loaded, **Then** each returns its own entity type and ABN independently.

---

### User Story 5 — CoA Template Library (Admin) (Priority: P3)

A platform administrator can view, create, edit, and deactivate CoA templates via an admin interface. Each template has a name, entity type tag, industry tag, questionnaire flag tags (e.g. `has_employees`, `has_vehicles`), and a list of accounts. Admins can add new industry templates without a code deployment.

**Why this priority**: The template library must be admin-editable from day one or the system becomes a maintenance burden. New verticals (e.g. aged care, mining) must be addable without code changes.

**Independent Test**: Can be tested by creating a new template in the admin UI and verifying the wizard uses it for matching questionnaire answers.

**Acceptance Scenarios**:

1. **Given** an admin user, **When** they navigate to the template management section, **Then** they see a list of all active CoA templates with their entity type, industry, and account count.
2. **Given** an admin viewing a template, **When** they add a new account with a canonical `sub_type`, **Then** the account appears in the next wizard session that matches this template.
3. **Given** an admin deactivates a template, **When** a user goes through the wizard with matching answers, **Then** the deactivated template is not selected (falls back to the default template).
4. **Given** an admin sets an account on a template as `is_system = true`, **When** a workspace is created from that template, **Then** the system account cannot be renamed or removed by the workspace user.

---

### User Story 6 — Simple Mode: Describe Your Business in Plain Text (Priority: P1)

A user who is not sure how to answer accounting questions can switch to simple mode on Stage 2 of the wizard. They type a plain-English description of their business — e.g. *"I run a small electrical business in Queensland. I have 3 employees and 2 work vans. I'm GST registered and I invoice my clients."* The system extracts business flags from this description, selects the matching CoA template, and advances to the review screen. The user can see which flags were extracted and correct any that were missed.

**Why this priority**: Simple mode dramatically lowers the onboarding barrier for non-accountants. It's the default entry point — the structured questionnaire (advanced mode) is the fallback for users who want explicit control.

**Independent Test**: Can be tested by submitting a free-text description via the API and verifying the extracted flags match the expected values and the correct template is selected.

**Acceptance Scenarios**:

1. **Given** Stage 2 of the wizard, **When** the user is in simple mode and types a business description, **Then** the system extracts a set of flags (industry, entity indicators, operational flags) and displays them for user confirmation before advancing.
2. **Given** simple mode with extracted flags displayed, **When** the user corrects an incorrectly extracted flag, **Then** the corrected flag is used for template matching.
3. **Given** simple mode, **When** the AI extraction service is unavailable, **Then** the wizard automatically falls back to advanced mode (structured questions) with an informational message — workspace creation is not blocked.
4. **Given** a description with low confidence on an important flag (e.g., ambiguous about GST registration), **Then** the system highlights that flag as "unconfirmed" and prompts the user to confirm it before proceeding.
5. **Given** Stage 2, **When** the user toggles between simple and advanced mode, **Then** answers already provided in one mode are preserved (where mappable) in the other.

---

### User Story 7 — Per-Account Reasoning in CoA Review (Priority: P2)

On the Stage 3 review screen, each suggested account displays a one-sentence plain-English explanation of why it was included. For example: *"Included because you have employees — required for ATO PAYG withholding reporting."* or *"Included for your work vehicles. Your bank feed will use this to auto-categorise fuel transactions."* System accounts also show their reasoning with a lock icon. Users who understand why an account is there are less likely to remove accounts they actually need.

**Why this priority**: Reasoning text builds user confidence and reduces post-setup support. It also serves as an in-app education layer for users learning accounting fundamentals.

**Independent Test**: Can be tested by verifying that every account on the Stage 3 review screen has a non-empty reasoning string.

**Acceptance Scenarios**:

1. **Given** Stage 3 is loaded, **When** the user views the suggested accounts, **Then** every account displays a reasoning sentence explaining why it was included.
2. **Given** a system account (e.g., GST Collected), **When** the user views its reasoning, **Then** the reasoning explains its purpose and notes it cannot be removed.
3. **Given** an account added by the user on Stage 3 (not from the template), **When** it is added, **Then** it displays a default reasoning of "Added manually" — no AI generation required.
4. **Given** an admin creates or edits a template account, **When** they save the account, **Then** they can author or update the reasoning sentence for that account.

---

### Edge Cases

- What happens when a user's questionnaire answers match multiple templates equally? → The system selects the most specific match (entity type + industry + most flag matches); ties go to the higher-priority template set by the admin.
- What if the ABN lookup service is unavailable during wizard Step 1? → ABN format validation (11-digit check digit) still runs locally. The lookup is non-blocking — users can proceed without a confirmed business name.
- What if a workspace is created without going through the wizard (API direct)? → System accounts are always seeded. The default Australian Standard template is applied if no template flags are provided.
- What if an AI renaming suggestion contains an account name longer than the maximum allowed? → The suggestion is truncated to the character limit and flagged for user review.
- What happens to existing workspaces created before this epic ships? → Existing workspaces are unaffected. Entity type defaults to `null` (migrated gracefully). Sub-type backfill on existing accounts is a separate migration task.
- What happens when an accountant creates a workspace on behalf of a client? → The accountant completes the wizard and is assigned `owner`. On completion, a "Hand off to client" option allows them to invite the client by email as `owner`. The accountant retains their `accountant` role. Full invite-by-email and ownership transfer flows are covered in **015-ACT Accountant & Practice Management** (downstream epic, depends on this one).

---

## Requirements

### Functional Requirements

**Workspace Creation**
- **FR-001**: Users MUST be able to initiate a new workspace creation flow from the workspace switcher at any time after registration.
- **FR-002**: The workspace creation wizard MUST collect entity type, workspace name, ABN, base currency, and fiscal year start month before advancing to the questionnaire.
- **FR-003**: The ABN field MUST validate the 11-digit Australian check-digit algorithm — invalid ABNs MUST be rejected before the user can advance.
- **FR-004**: The system MUST support the following entity types: Pty Ltd, Trust, Sole Trader, Partnership, SMSF, Not-for-Profit.
- **FR-005**: Each workspace MUST store its own entity type and ABN independently of the parent organisation's ABN.

**Smart Questionnaire — Two Modes**
- **FR-006**: Stage 2 MUST offer two modes: (a) **Simple mode** — a single free-text field where the user describes their business in plain English; (b) **Advanced mode** — a structured set of flags presented one at a time. Simple mode is the default.
- **FR-006a**: In simple mode, the system MUST use AI extraction to derive business flags from the free-text description and display the extracted flags for user confirmation before proceeding.
- **FR-006b**: If the AI extraction service is unavailable, the wizard MUST automatically fall back to advanced mode — workspace creation MUST NOT be blocked.
- **FR-006c**: Flags extracted with low confidence MUST be highlighted for user confirmation before template matching runs.
- **FR-006d**: Advanced mode MUST present at minimum: industry vertical (8 options), has employees, holds inventory, GST-registered, owns property, owns vehicles, invoices clients, buys on credit.
- **FR-007**: The system MUST use the combination of entity type + industry + questionnaire flags to select the best matching CoA template from the library.
- **FR-008**: When multiple templates match, the system MUST prefer the most specific match (most flags matched); ties resolved by template priority order set by admins.

**Chart of Accounts Generation**
- **FR-009**: The system MUST always seed system accounts (Accounts Receivable, Accounts Payable, GST Collected, GST Paid, Retained Earnings) regardless of template or questionnaire answers.
- **FR-010**: System accounts MUST be locked — users MUST NOT be able to rename, archive, or delete them.
- **FR-011**: Every seeded account MUST carry a canonical `sub_type` value that cannot be changed by workspace users.
- **FR-012**: Users MUST be able to rename, remove (non-system), or add accounts on the CoA review screen before finalising workspace creation.
- **FR-013**: The system MAY offer AI-assisted plain-language renaming of accounts on the review screen. This feature MUST be optional and skippable. Failure of the AI service MUST NOT block workspace creation.
- **FR-013a**: Every account on the Stage 3 review screen MUST display a reasoning sentence explaining why it was included. For template accounts, this sentence is authored by the admin on the template. For manually added accounts, the reasoning defaults to "Added manually."

**Template Library**
- **FR-014**: CoA templates MUST use a hybrid composition model: (a) **base templates** per entity type + industry combination (handles structural differences like equity accounts); (b) **flag overlay modules** per questionnaire flag (employees, vehicles, property, etc.) that are additive and entity-type-agnostic. The final account list for a workspace is assembled by combining the matched base template + all matching overlays.
- **FR-015**: CoA templates and overlay modules MUST be stored in the database (not hardcoded), with fields for: name, type (base/overlay), entity_type tag, industry tag, questionnaire flag tag, account list, priority, and active/inactive status.
- **FR-016**: Platform administrators MUST be able to create, edit, activate, and deactivate templates and overlays without a code deployment.
- **FR-017**: Each template account MUST include: account code, name, type (asset/liability/equity/revenue/expense), parent code, default tax code, canonical `sub_type`, `is_system` flag, and `reasoning` sentence.
- **FR-018**: The canonical `sub_type` values MUST be a closed enum defined and seeded as part of this epic (~60–80 values covering all common account classifications). New sub_type values MAY only be added by platform admins. All template accounts MUST reference a value from this enum.
- **FR-019**: The template library MUST ship with a minimum of: 6 base templates (one per entity type × key industry groupings) + overlay modules for each of the 8 questionnaire flags.

**Wizard Abandonment**
- **FR-020**: If a user closes or navigates away from the wizard before finalising Stage 3, the system MUST display a confirmation dialog ("Your progress will be lost"). On confirm, all wizard state is discarded. No workspace record is created until the user explicitly finalises Stage 3.

**Post-Creation CoA Management**
- **FR-021**: After workspace creation, owners MUST be able to add, remove (non-system), rename, and recode accounts one at a time via a dedicated CoA management UI.
- **FR-022**: The CoA management UI MUST provide an "Account suggestions" feature that proposes accounts the workspace does not yet have, based on the original questionnaire snapshot. Suggestions are additive only — existing accounts are never removed or flagged.
- **FR-023**: When a user adds a custom account during the wizard Stage 3 review, the system MUST auto-assign the next available account code within the correct account type range (e.g. next available in 52000–52999 for expenses). The user MAY override the auto-assigned code before finalising.

**Workspace Switcher & Access**
- **FR-018**: The workspace switcher MUST display all workspaces the logged-in user has access to, grouped by organisation.
- **FR-019**: The workspace switcher MUST include a "Create new workspace" action that opens the creation wizard.
- **FR-020**: After completing the wizard, the user MUST be automatically switched into the newly created workspace.
- **FR-021**: The user who completes the wizard MUST be assigned the `owner` role in the new workspace. No other users are added automatically.
- **FR-022**: The workspace creation wizard MUST be used for ALL workspace creation — including the first workspace during initial onboarding. The existing onboarding workspace creation flow is replaced by this wizard.

**ABN Validation**
- **FR-023**: ABN is REQUIRED for entity types: Pty Ltd, Trust, Sole Trader, Partnership, SMSF. The ABN MUST pass 11-digit check-digit validation before the user can advance past Stage 1.
- **FR-024**: ABN is OPTIONAL for Not-for-Profit entities that are not GST-registered. NFPs that are GST-registered MUST provide a valid ABN.

### Key Entities

- **Workspace**: A fully isolated set of books for one legal entity. Gains: `entity_type` (enum), `abn` (string), `legal_name` (string). Existing: `industry`, `base_currency`, `fiscal_year_start_month`.
- **CoA Base Template**: A complete structural account list for a specific entity type + industry combination (e.g. "Sole Trader — Trades"). Handles accounts that differ structurally between entity types (equity structure, drawings vs dividends, etc.). Tagged with entity_type and industry. One base template is selected per workspace.
- **CoA Overlay Module**: An additive set of accounts triggered by a single questionnaire flag (e.g. `has_employees` overlay adds Wages, PAYG, Super accounts). Entity-type-agnostic — the same overlay applies whether you're a Pty Ltd or a sole trader. Multiple overlays are combined on top of the base template.
- **CoA Template Account**: An account definition within a base template or overlay. Carries: account code, name, type, parent code, default tax code, canonical `sub_type`, `is_system` flag, and `reasoning` sentence (plain-English explanation authored by admins, displayed on the Stage 3 review screen).
- **Account Sub Type**: A closed enum of ~60–80 canonical account classifications (e.g. `fuel`, `wages`, `super`, `payg`, `rent`, `interest_income`, `subscriptions`, `insurance`, `utilities`, `ar`, `ap`, `gst_collected`, `gst_paid`, `retained_earnings`). Defined and seeded in this epic. Every chart account in every workspace carries exactly one sub_type. Immutable by workspace users. Powers bank feed auto-categorisation in 004-BFR.
- **Questionnaire Response**: The set of boolean flags and selections captured in Stage 2 of the wizard. Used transiently for template matching — not persisted as a separate record (stored on the workspace as a JSON snapshot for audit purposes).

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user can complete the full 3-stage workspace creation wizard in under 3 minutes.
- **SC-002**: 100% of accounts seeded via the wizard carry a non-null canonical `sub_type` value.
- **SC-003**: System accounts (AR, AP, GST Collected, GST Paid, Retained Earnings) are present in every workspace created via the wizard, regardless of questionnaire answers.
- **SC-004**: Template matching selects the correct template for at least 95% of questionnaire combinations covered by the 50 shipped templates (verified by automated test matrix).
- **SC-005**: A platform administrator can create a new CoA template and have it available in the wizard without any code deployment or server restart.
- **SC-006**: An invalid ABN (failing check-digit) is rejected at wizard Step 1 in 100% of cases — no invalid ABN is persisted.
- **SC-007**: Workspace data isolation is maintained — a user in Workspace A cannot see accounts, transactions, or templates seeded for Workspace B, even within the same organisation.
- **SC-008**: Existing workspaces created before this epic are unaffected — their CoA and journal entries remain intact after the migration runs.
