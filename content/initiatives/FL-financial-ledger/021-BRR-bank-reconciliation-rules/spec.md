---
title: "Feature Specification: Bank Reconciliation Rules"
---

# Feature Specification: Bank Reconciliation Rules

**Epic**: 021-BRR
**Created**: 2026-03-14
**Status**: Draft
**Initiative**: FL — Financial Ledger Platform

---

## Overview

Bank Reconciliation Rules lets accountants and bookkeepers define standing instructions for how recurring transactions should be categorised. Once a rule is set — for example, "any transaction from Stripe goes to Sales Revenue with GST" — every future matching transaction is automatically suggested or posted without manual intervention. The reconciliation queue shrinks over time as rules accumulate. Both bank feed transactions and virtual card transactions use the same rules interface.

---

## User Scenarios & Testing

### User Story 1 — Create a Reconciliation Rule (Priority: P1)

An accountant notices they have processed the same Stripe payout transaction ten times this year, coding it to Sales Revenue each time. They want to create a rule so all future Stripe transactions are automatically handled the same way — without reviewing them individually.

**Why this priority**: Creating rules is the core action of this entire feature. Without it nothing else has value.

**Independent Test**: Can be fully tested by creating a rule, opening the reconciliation queue, and confirming a matching transaction shows the suggested account pre-filled without manual selection.

**Acceptance Scenarios**:

1. **Given** an accountant is on the Reconciliation Rules page, **When** they click "New Rule" and enter "description contains STRIPE", select "Sales Revenue" as the account and "GST" as the tax code, **Then** the rule is saved and appears in the rules list
2. **Given** a rule exists for "description contains STRIPE", **When** a new Stripe transaction arrives in the reconciliation queue, **Then** it is pre-coded to Sales Revenue with the GST tax code already applied
3. **Given** a rule has auto-post enabled, **When** a matching transaction arrives, **Then** it is posted to the ledger automatically without appearing in the manual review queue
4. **Given** a rule has auto-post disabled, **When** a matching transaction arrives, **Then** it appears in the queue with the account pre-filled and a "Rule match" indicator, requiring one-click confirmation
5. **Given** two rules could match the same transaction, **When** the transaction arrives, **Then** only the higher-priority rule is applied

---

### User Story 2 — Test a Rule Before Activating It (Priority: P1)

Before saving a new rule, the accountant wants to see which recent unreconciled transactions would match it — to confirm the rule is specific enough and won't accidentally catch the wrong transactions.

**Why this priority**: Without a preview step, broad rules (e.g. "contains 'payment'") cause incorrect auto-posting that is hard to detect and reverse. This is a safety control essential for trust.

**Independent Test**: Can be tested by entering a rule condition, clicking "Test", and verifying that only the expected transactions appear in the preview list before saving.

**Acceptance Scenarios**:

1. **Given** an accountant is creating a rule, **When** they click "Test rule" before saving, **Then** a preview panel shows all unreconciled transactions from the last 90 days that would match the rule, along with the account they would be coded to
2. **Given** the preview shows unexpected matches, **When** the accountant adjusts the match condition to be more specific, **Then** the preview updates in real-time to show the revised match list
3. **Given** the rule test shows zero matches, **When** the accountant views the preview, **Then** a message indicates no recent transactions match, and the accountant can still save the rule for future use
4. **Given** the preview shows the expected transactions only, **When** the accountant saves the rule, **Then** the rule is active and previously-matched transactions in the queue are updated with the suggested account

---

### User Story 3 — Manage Existing Rules (Priority: P1)

An accountant's business has changed — a supplier they previously coded to "Contractors" should now go to "Subcontractors". They need to find the rule, update the account, and ensure all future transactions from that supplier are coded correctly.

**Why this priority**: Rules become stale. Without edit/delete capability, the rules list degrades and auto-coding loses accuracy.

**Independent Test**: Can be tested by editing an existing rule's target account and confirming the next matching transaction is coded to the updated account.

**Acceptance Scenarios**:

1. **Given** rules exist, **When** an accountant opens the Rules page, **Then** they see all rules listed with their match condition, target account, tax code, and whether auto-post is enabled
2. **Given** an accountant selects a rule to edit, **When** they change the target account and save, **Then** all future matching transactions use the updated account
3. **Given** an accountant deletes a rule, **When** a transaction arrives that would have matched it, **Then** the transaction appears in the manual reconciliation queue with no pre-coding
4. **Given** multiple rules exist, **When** the accountant drags a rule to a new position in the list, **Then** the priority order updates and the first matching rule continues to win on future transactions
5. **Given** an accountant wants to temporarily disable a rule without deleting it, **When** they toggle the rule off, **Then** it stops applying to new transactions but remains in the list and can be re-enabled

---

### User Story 4 — Start with Useful Default Rules (Priority: P2)

A new workspace has just been set up. The accountant opens the Rules page for the first time and finds a set of pre-built rules for common Australian business transactions — ATO payments, Xero subscriptions, payroll runs — already configured with sensible accounts.

**Why this priority**: A blank rules page on day one creates no immediate value. Sensible defaults give accountants a starting point and demonstrate the feature's value immediately.

**Independent Test**: Can be tested on a freshly-created workspace by opening the Rules page and confirming a set of pre-seeded rules exists with correct accounts and conditions.

**Acceptance Scenarios**:

1. **Given** a new workspace is created, **When** an accountant opens the Reconciliation Rules page for the first time, **Then** a set of default rules for common Australian business transactions is already present
2. **Given** default rules exist, **When** the accountant reviews them, **Then** each rule shows clearly that it is a "Default rule" and can be edited or deleted like any other rule
3. **Given** an accountant edits a default rule, **When** they change the target account to match their chart of accounts, **Then** the rule is saved with no special restrictions compared to a user-created rule
4. **Given** a default rule does not apply to a workspace (e.g. they don't use Xero), **When** the accountant deletes it, **Then** it is removed without affecting other rules

---

### User Story 5 — Auto-Code Virtual Card Transactions (Priority: P2)

When a virtual card transaction arrives from a restaurant, the system should automatically suggest "Meals & Entertainment" as the expense account — just as a bank feed rule would — using the merchant's category to drive the coding. The accountant manages these card coding rules from the same Rules page.

**Why this priority**: Virtual cards (020-VCA) and bank feeds use the same rules engine. A single interface for both is simpler and more consistent than two separate configuration screens.

**Independent Test**: Can be tested by creating a card category rule (e.g. "Restaurants & Dining → Meals & Entertainment"), making a test card transaction at a restaurant, and confirming the draft journal entry is pre-coded to Meals & Entertainment.

**Acceptance Scenarios**:

1. **Given** the rules list includes card category rules alongside bank feed rules, **When** an accountant views the Rules page, **Then** each rule shows its source type (Bank Feed or Card Transaction) as a label
2. **Given** a card transaction arrives from a merchant categorised as "Software & Subscriptions", **When** a card category rule maps that category to "IT & Software", **Then** the draft journal entry is pre-coded to IT & Software
3. **Given** no card category rule exists for a merchant category, **When** a card transaction arrives in that category, **Then** it appears in the reconciliation queue with no pre-coding, requiring manual selection
4. **Given** an accountant creates a new card category rule, **When** they select the match type, **Then** they can choose from a list of merchant spending categories rather than typing a description keyword

---

### Edge Cases

- What if a transaction matches a rule but the target account has been archived? The rule should flag as broken — the transaction must be manually reviewed and the rule should be highlighted in the Rules list as requiring attention.
- What if an auto-posted transaction needs to be corrected after posting? The posted entry can be reversed through the normal journal entry reversal flow — the rule is not implicated.
- What if the same transaction description matches two rules of equal priority? Priority is determined by list order — the rule higher in the list wins. Ties cannot exist if priority ordering is enforced.
- What if an accountant creates a rule with a very broad condition that matches hundreds of historical transactions? The test preview must show the volume clearly before activation; auto-post rules should not retroactively process already-unmatched transactions.
- What if a workspace has no chart of accounts set up when they first open the Rules page? Default rules should still display but will be flagged as needing an account assignment before they can activate.

---

## Requirements

### Functional Requirements

**Rules Management**
- **FR-001**: Accountants, bookkeepers, and owners MUST be able to view all reconciliation rules for their workspace on a dedicated Rules page
- **FR-002**: Accountants, bookkeepers, and owners MUST be able to create a new rule by defining a match condition, a target expense account, a tax code, and whether to auto-post or auto-suggest
- **FR-003**: Rules MUST support the following match condition types: description contains, description starts with, description matches exactly, and description matches a pattern
- **FR-004**: Rules MUST support an optional amount range filter (minimum and/or maximum transaction amount) to narrow matching
- **FR-005**: Each rule MUST have a priority order — when multiple rules match a transaction, the highest-priority rule applies and lower-priority rules are ignored
- **FR-006**: Accountants, bookkeepers, and owners MUST be able to edit any rule's match condition, target account, tax code, auto-post setting, and priority
- **FR-007**: Accountants, bookkeepers, and owners MUST be able to delete any rule
- **FR-008**: Accountants, bookkeepers, and owners MUST be able to temporarily disable a rule without deleting it, and re-enable it later
- **FR-009**: Accountants, bookkeepers, and owners MUST be able to reorder rules by dragging them to a new position in the priority list

**Rule Testing**
- **FR-010**: Before saving a new rule, accountants MUST be able to preview which unreconciled transactions from the last 90 days would match it
- **FR-011**: The preview MUST show the matched transaction descriptions, amounts, dates, and the account they would be coded to
- **FR-012**: The preview MUST update in real-time as the accountant adjusts the match condition
- **FR-013**: After saving a rule, transactions already in the reconciliation queue that match the new rule MUST be updated with the suggested account immediately

**Auto-Coding Behaviour**
- **FR-014**: When a transaction matches a rule with auto-suggest enabled, it MUST appear in the reconciliation queue with the target account and tax code pre-filled and a "Rule match" indicator
- **FR-015**: When a transaction matches a rule with auto-post enabled, it MUST be posted to the ledger automatically and NOT appear in the manual reconciliation queue
- **FR-016**: Auto-post rules MUST display a clear warning during setup explaining that matching transactions will be posted without review
- **FR-017**: Transactions that were auto-posted by a rule MUST be identifiable as such in the ledger — showing which rule posted them

**Default Rules**
- **FR-018**: New workspaces MUST be seeded with a set of default reconciliation rules for common Australian business transactions
- **FR-019**: Default rules MUST be clearly labelled as defaults and MUST be editable and deletable like any user-created rule

**Card Transaction Rules**
- **FR-020**: The Rules page MUST support card category rules in addition to bank feed description rules
- **FR-021**: Card category rules MUST allow the accountant to select from a predefined list of merchant spending categories as the match condition
- **FR-022**: Card category rules and bank feed rules MUST be managed from the same Rules page, with a label indicating the rule type
- **FR-023**: New workspaces MUST be seeded with default card category rules mapping common merchant categories to standard Australian expense accounts

**Rule Health & Suggestions**
- **FR-024**: If a rule's target account is archived or deleted, the rule MUST be flagged as broken on the Rules page and MUST NOT auto-code or auto-post transactions until the account is updated
- **FR-025**: Each rule MUST display when it last matched a transaction, so accountants can identify stale or unused rules
- **FR-026**: Rules that have not matched any transaction in 90 days SHOULD be visually flagged as potentially stale
- **FR-027**: The system MUST detect recurring transaction patterns from reconciliation history and suggest new rules when 3 or more transactions with the same description pattern have been coded to the same account
- **FR-028**: Suggested rules MUST appear at the top of the Rules page with one-click accept, edit, or dismiss actions
- **FR-029**: During reconciliation, when an accountant codes a transaction that matches a detected pattern, the system MUST show an inline prompt offering to create a rule (e.g. "Detected pattern — create a rule for STRIPE → Sales Revenue?")

### Key Entities

- **Reconciliation Rule**: A standing instruction that defines how matching transactions should be categorised. Has a match type (description contains / starts with / exact / pattern / card category), match value, optional amount range, target expense account, tax code, auto-post flag, enabled flag, and priority order. Scoped to a workspace.
- **Rule Match**: A record linking a reconciliation rule to a specific transaction it matched. Captures which rule applied, when it matched, and whether it resulted in an auto-post or auto-suggest outcome. Supports audit trail and rule performance reporting.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Accountants can create a new rule and see it applied to matching transactions in the reconciliation queue within the same session
- **SC-002**: At least 60% of bank feed transactions in active workspaces are auto-suggested or auto-posted by rules within 6 months of the feature launching
- **SC-003**: Workspaces with 10 or more active rules complete month-end reconciliation in 50% less time than workspaces with no rules (measured via session analytics)
- **SC-004**: Zero instances of a rule auto-posting to an archived or deleted account — broken rule detection prevents this entirely
- **SC-005**: Accountants can create, test, and save a new rule in under 2 minutes

---

## Out of Scope (V1)

- Machine-learning-assisted rule suggestions (the system does not proactively recommend rules based on reconciliation history — that is a future epic)
- Bulk rule import/export (rules are managed one at a time in V1)
- Shared rule libraries across workspaces (rules are workspace-scoped only)
- Rules that split a single transaction across multiple accounts (split coding is handled manually in the reconciliation queue)
- Rules based on contact/supplier name matching (description-based rules only in V1; contact matching is a V2 enhancement)

---

## Clarifications

### Session 2026-03-14
- Q: When a rule is edited, what happens to existing transactions previously auto-suggested by the old version? → A: No retroactive change — only future transactions use the updated rule. Transactions already in the queue keep their original suggestion.
- Q: Should there be a maximum number of rules per workspace? → A: No hard limit — unlimited rules. Performance handled through efficient evaluation.
- Q: When does rule evaluation happen? → A: On import/sync only — rules checked when bank feed transactions are synced or CSV imported. Additionally, rules should show a "last matched" date so accountants can identify stale/unused rules and archive them.
- Q: What threshold for suggesting rules? → A: 3+ identical codings to the same account. Suggestions appear both on the Rules page AND inline during reconciliation — when coding a transaction that matches a pattern, prompt the accountant to create a rule on the spot.
- Q: Who can manage rules? → A: Bookkeepers too — anyone who reconciles can create and edit rules, since they're closest to the transaction patterns.
