---
title: "Feature Specification: Virtual Cards"
---

# Feature Specification: Virtual Cards

**Epic**: 020-VCA
**Created**: 2026-03-14
**Status**: Draft
**Initiative**: FL — Financial Ledger Platform

---

## Overview

Virtual Cards allows workspace admins and their accountants to issue digital spending cards to employees and team members. Each card carries configurable spend limits and category restrictions. Every purchase automatically creates a draft journal entry in the ledger — no manual data entry. Employees capture receipts directly from transaction notifications. Finance teams approve entries from the same interface they already use for reconciliation.

The feature targets Australian SME owner-operators and the accountants/bookkeepers managing their books.

---

## User Scenarios & Testing

### User Story 1 — Issue a Virtual Card to a Team Member (Priority: P1)

A workspace admin wants to give a team member access to company funds for a specific purpose — e.g. a marketing manager who regularly pays for advertising subscriptions. The admin issues a virtual card, sets a monthly spending limit, and restricts it to software and advertising purchases. The team member immediately receives their card details and can add it to Apple Pay.

**Why this priority**: Without card issuance, nothing else in this feature exists. This is the entry point for the entire product — no card issued, no value delivered.

**Independent Test**: Can be fully tested by an admin issuing a card to a test user, confirming the card appears in the team member's account, and verifying the spend limits are stored correctly.

**Acceptance Scenarios**:

1. **Given** a workspace admin is on the Cards page, **When** they click "Issue Card", enter the team member's name, set a $500 monthly limit and "Software & Subscriptions" category only, **Then** a new virtual card is created with those controls and the team member receives their card number, expiry, and CVV
2. **Given** a card has been issued, **When** the cardholder attempts a purchase from an allowed merchant category within their limit, **Then** the purchase is approved
3. **Given** a card has been issued with a $500 monthly limit, **When** the cardholder attempts a purchase that would exceed the limit, **Then** the purchase is declined at the point of sale
4. **Given** a card has been issued restricted to "Software & Subscriptions", **When** the cardholder attempts a purchase at a restaurant, **Then** the purchase is declined
5. **Given** a workspace admin has issued a card, **When** they view the Cards list, **Then** they can see all active cards, the cardholder name, the spend limit, and the amount spent this month

---

### User Story 2 — Card Transaction Auto-Posts to the Ledger (Priority: P1)

When a team member makes a purchase on their virtual card, the finance team wants to see it in the ledger immediately — not at month end. The transaction should already have a suggested expense account (based on where it was spent), a GST flag, and be ready to approve.

**Why this priority**: The core value proposition of ledger-native cards. If transactions don't auto-post, the feature is no better than a physical card with manual reconciliation. This must work for P1.

**Independent Test**: Can be tested by simulating a card transaction and confirming a draft journal entry appears in the ledger with the correct accounts and amount, without any manual action from the finance team.

**Acceptance Scenarios**:

1. **Given** a cardholder makes a $110 purchase at a software vendor, **When** the transaction settles, **Then** a draft journal entry appears in the ledger debiting the "IT & Software" expense account for $100 and "GST Paid" for $10, credited against the card clearing account
2. **Given** a draft journal entry has been created from a card transaction, **When** the accountant views the entry, **Then** they can see the merchant name, card used, cardholder name, amount, and suggested expense account
3. **Given** a card transaction creates a draft entry, **When** the accountant disagrees with the suggested expense account, **Then** they can change the account before approving
4. **Given** a draft card journal entry exists, **When** the accountant approves it, **Then** it is posted to the ledger and the card clearing account balance reduces accordingly
5. **Given** multiple card transactions occur on the same day across different cardholders, **When** the accountant views the card transaction feed, **Then** all transactions appear in real-time order with their suggested accounts and status (pending receipt / ready to approve / approved)

---

### User Story 3 — Capture a Receipt on a Card Transaction (Priority: P1)

When a team member makes a purchase, they need to attach a receipt before the finance team can fully reconcile it. The cardholder receives an in-app notification prompting them to attach a photo or PDF of the receipt, which links directly to the journal entry.

**Why this priority**: Receipt capture closes the audit loop. Without it, finance teams still chase receipts via email — the core reconciliation pain point persists.

**Independent Test**: Can be tested by completing a card transaction, receiving a receipt prompt notification, uploading a receipt photo, and confirming it appears attached to the draft journal entry visible to the accountant.

**Acceptance Scenarios**:

1. **Given** a cardholder has just made a purchase, **When** they open the Polygon app, **Then** they see a notification prompting them to upload a receipt for that transaction
2. **Given** a receipt prompt is shown, **When** the cardholder uploads a photo or PDF, **Then** the receipt is attached to the draft journal entry and the "Missing receipt" flag is cleared
3. **Given** a cardholder has not attached a receipt after 48 hours, **When** the accountant views the transaction, **Then** it is flagged as "Receipt overdue" with the cardholder's name
4. **Given** a receipt has been attached, **When** the accountant views the draft entry, **Then** they can preview the receipt image without leaving the journal entry view
5. **Given** a cardholder adds a note to a transaction (e.g. "Client lunch — ABC Corp"), **When** the accountant views the entry, **Then** the note appears as the journal entry memo

---

### User Story 4 — Set and Update Spend Controls on a Card (Priority: P2)

A workspace admin needs to adjust a card's spending rules after it has been issued — for example, increasing a monthly limit for a conference trip or adding a new allowed merchant category.

**Why this priority**: Spend controls are core to the value proposition, but updating them after issuance is an operational need that can be deferred slightly from the initial issue flow.

**Independent Test**: Can be tested by issuing a card with a $200 limit, editing it to $500, confirming purchases between $201–$500 now succeed, and that the updated limit is visible to both admin and cardholder.

**Acceptance Scenarios**:

1. **Given** a card is active, **When** a workspace admin updates the monthly spending limit, **Then** the new limit takes effect immediately for subsequent purchases
2. **Given** a card has a "Software only" restriction, **When** a workspace admin adds "Travel & Transport" to the allowed categories, **Then** the cardholder can now purchase from travel merchants
3. **Given** an admin updates a card's controls, **When** the cardholder views their card, **Then** they can see the updated limits and allowed categories
4. **Given** an admin reduces a monthly limit below the current month's spend, **When** the cardholder attempts another purchase, **Then** the purchase is declined and the cardholder sees their current spend vs new limit

---

### User Story 5 — Freeze and Unfreeze a Card (Priority: P2)

A workspace admin needs to immediately pause a card — for example, if an employee leaves, if a card is suspected lost, or if a project budget is exhausted. The freeze must take effect instantly.

**Why this priority**: Safety control. Important for risk management but can follow core issuance and transaction flows.

**Independent Test**: Can be tested by freezing an active card, attempting a purchase (which should decline), unfreezing the card, and confirming purchases succeed again.

**Acceptance Scenarios**:

1. **Given** a card is active, **When** a workspace admin clicks "Freeze Card", **Then** all subsequent purchase attempts on that card are declined immediately
2. **Given** a card is frozen, **When** the cardholder attempts a purchase, **Then** they receive a declined response (the card is not identified as invalid — it simply does not authorise)
3. **Given** a card is frozen, **When** a workspace admin clicks "Unfreeze Card", **Then** the card resumes normal operation and purchases within limits succeed
4. **Given** an employee's workspace access is revoked, **When** their workspace membership is removed, **Then** any cards issued to them are automatically frozen

---

### User Story 6 — Admin Spend Dashboard (Priority: P2)

A business owner or accountant wants a single view of all company card spend — who is spending, on what, how much this month, and whether any receipts are overdue.

**Why this priority**: Visibility without drilling into individual transactions. Important for ongoing management but usable even before all controls are polished.

**Independent Test**: Can be tested by issuing 3 cards with transactions, opening the spend dashboard, and confirming all cards, their month-to-date spend, and receipt status are visible without navigating to individual entries.

**Acceptance Scenarios**:

1. **Given** a workspace has multiple active cards, **When** a workspace admin opens the Cards dashboard, **Then** they see each card, the cardholder name, the monthly limit, the amount spent this month, and a progress bar showing utilisation
2. **Given** one cardholder has overdue receipts, **When** the admin views the dashboard, **Then** cards with overdue receipts are visually flagged and show the count of receipts outstanding
3. **Given** the admin wants to see total company card spend this month, **When** they view the dashboard summary, **Then** a total spend figure across all cards is displayed alongside the total limit
4. **Given** the admin clicks on a specific card, **When** the card detail view opens, **Then** they see the full transaction history for that card, including settled, pending, and declined transactions

---

### User Story 7 — Cardholder Views Their Own Card (Priority: P3)

A team member who has been issued a card wants to view their card details, see their transaction history, and understand how much of their monthly limit they have remaining.

**Why this priority**: Important for cardholder experience, but the feature delivers value to admins and accountants even if the cardholder view is simple at launch.

**Independent Test**: Can be tested by a cardholder logging in, navigating to their card, and confirming card details, available balance, and transaction history are all visible.

**Acceptance Scenarios**:

1. **Given** a workspace member has been issued a card, **When** they navigate to their card view, **Then** they can see their masked card number, the monthly limit, the amount spent this month, and their remaining balance
2. **Given** a cardholder views their card, **When** they tap to reveal the full card number and CVV, **Then** the full details are shown (subject to re-authentication if required)
3. **Given** a cardholder has made purchases, **When** they view their transaction history, **Then** each transaction shows the merchant name, amount, date, and whether a receipt has been attached
4. **Given** a cardholder wants to add their card to Apple Pay or Google Pay, **When** they tap "Add to Wallet", **Then** they are guided through the digital wallet provisioning flow

---

### Edge Cases

- What happens when a transaction is authorised but the merchant later reverses it (e.g. a cancelled subscription)? The reversal must unwind the draft journal entry or create a matching credit.
- What happens when a transaction is authorised for one amount but settled for a different amount (e.g. a hotel pre-authorisation for $200 that settles at $175)? The journal entry must reflect the settled amount.
- What happens when a cardholder's workspace membership is suspended but not revoked? Their card should freeze until membership is reinstated.
- What happens when a monthly limit is reached mid-month and the admin wants to grant a one-off exception? The admin can temporarily increase the limit for that month only.
- What happens if a card transaction occurs in a foreign currency? The journal entry must reflect the AUD settled amount, and any foreign currency detail should be stored for reference.
- What happens when an accountant deletes a draft card journal entry? The transaction should be flagged as "Unreconciled" and remain visible in the card feed, requiring a decision (re-code or exclude).

---

## Requirements

### Functional Requirements

**Card Management**
- **FR-001**: Workspace admins MUST be able to issue a virtual card to any active workspace member
- **FR-002**: Each virtual card MUST have a configurable monthly spending limit
- **FR-003**: Each virtual card MUST support merchant category restrictions (allow-list of spending categories)
- **FR-004**: Each virtual card MUST support an optional expiry date for project-based or temporary cards
- **FR-005**: Workspace admins MUST be able to freeze and unfreeze any card in their workspace instantly
- **FR-006**: Cards issued to a workspace member MUST be automatically frozen when that member's workspace access is revoked
- **FR-007**: Workspace admins MUST be able to update spend limits and category restrictions on active cards
- **FR-008**: Cardholders MUST be able to view their own card details, available balance, and transaction history
- **FR-009**: The system MUST display card details (number, CVV, expiry) securely, requiring the cardholder to explicitly reveal them
- **FR-010**: The system MUST support digital wallet provisioning (Apple Pay, Google Pay) for issued cards

**Transaction Feed & Ledger Integration**
- **FR-011**: Every settled card transaction MUST automatically create a draft journal entry in the workspace ledger
- **FR-012**: Draft journal entries from card transactions MUST include: merchant name, amount (AUD), date, cardholder, and a suggested expense account based on the merchant's spending category
- **FR-013**: The suggested expense account MUST be based on a configurable mapping from merchant category to chart of accounts, editable by workspace owners and accountants
- **FR-013b**: Cardholders MUST be able to override the suggested expense account on their own individual transactions when submitting a receipt
- **FR-014**: Workspace admins and accountants MUST be able to review, recode, and approve draft card journal entries
- **FR-015**: Card transaction journal entries MUST use a dedicated card clearing account as the credit side of the entry, consistent with standard accounting treatment for corporate card spend
- **FR-016**: The card transaction feed MUST display all transactions across all workspace cards in real-time, filterable by cardholder, date range, and status
- **FR-017**: Declined transactions MUST be visible in the card feed with a clear "Declined" status and the reason (over limit, restricted category, card frozen)

**Receipt Capture**
- **FR-018**: After a card transaction occurs, the cardholder MUST receive an in-app notification prompting them to upload a receipt
- **FR-019**: Cardholders MUST be able to attach a photo or PDF receipt to any card transaction
- **FR-020**: Cardholders MUST be able to add a text note (memo) to any card transaction
- **FR-021**: Transactions without a receipt after 48 hours MUST be flagged as "Receipt overdue" in the card feed and dashboard
- **FR-022**: Attached receipts MUST be viewable by the accountant from the journal entry without leaving the entry view

**Spend Dashboard**
- **FR-023**: Workspace admins MUST have a dashboard showing all active cards, their monthly limits, month-to-date spend, and receipt status
- **FR-024**: The dashboard MUST show total company card spend for the current month across all cards
- **FR-025**: Cards with overdue receipts MUST be visually flagged on the dashboard with the count of outstanding receipts

**Card Programme Setup & Wallet**
- **FR-030**: A workspace MUST complete a one-time card programme setup (business verification and bank account linking) before any cards can be issued
- **FR-031**: The setup flow MUST be self-serve within Polygon — no redirect to an external platform
- **FR-032**: Workspace admins MUST be able to top up the Card Wallet by transferring funds from a linked bank account
- **FR-033**: Card purchases MUST be declined if they would cause the Card Wallet balance to go below zero
- **FR-034**: Workspace admins MUST receive a notification when the Card Wallet balance falls below a threshold they configure, with a sensible default pre-filled (e.g. $500)

**Billing & Access**
- **FR-026**: Virtual card functionality MUST be restricted to workspaces on a plan that includes the Virtual Cards feature
- **FR-027**: Each active virtual card MUST be billable as a per-card monthly fee on the workspace subscription
- **FR-028**: Only workspace members with the `owner` or `accountant` role MUST be able to issue, freeze, and manage cards
- **FR-029**: Cardholders MUST only be able to view and manage their own card(s), not other members' cards
- **FR-035**: Workspace owners MAY be issued a card and act as a cardholder in addition to their admin role
- **FR-036**: Workspace accountants MUST NOT be issued a card — the accountant role approves card journal entries and cannot also be a cardholder (separation of duties)

### Key Entities

- **Virtual Card**: A digital payment card issued to a specific workspace member. Has a card number, expiry, CVV, spending limit, category restrictions, and a status (active / frozen / cancelled). Belongs to a workspace and a cardholder.
- **Card Transaction**: A purchase event on a virtual card. Records the merchant name, merchant category, amount, currency, date, authorisation status (approved / declined), and settlement status (authorised / settled / reversed). Linked to a cardholder and a card.
- **Card Journal Entry**: A journal entry automatically created from a settled card transaction. Links the card transaction, the suggested expense account, the GST component, and the card clearing account. Has a status of draft (pending receipt / pending approval) or posted.
- **Merchant Category Mapping**: A workspace-level configuration that maps merchant spending categories to chart of accounts expense accounts. Pre-seeded with sensible defaults (e.g. "Restaurants & Dining" → "Meals & Entertainment"), editable by owners and accountants. Functionally equivalent to the existing bank reconciliation rules — card transactions follow the same auto-coding pattern as bank feed transactions, with the advantage that merchant categories are structured codes rather than fuzzy text, making matching more reliable. No new rules infrastructure is required.
- **Card Clearing Account**: A balance sheet liability account that holds the outstanding balance of all card spend not yet reconciled. Created automatically when the first card is issued in a workspace.
- **Card Wallet**: A pre-funded float held by the card issuing provider on behalf of the workspace. All card purchases draw from the wallet balance. The workspace admin tops up the wallet by transferring funds from a linked bank account. Cards cannot be approved for purchases that would exceed the current wallet balance.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Workspace admins can issue a virtual card to a team member and have the card ready to use in under 3 minutes
- **SC-002**: 25% of paid workspaces have at least one active virtual card within 12 months of launch
- **SC-003**: $500,000 in monthly spend is processed through Polygon virtual cards within 12 months of launch
- **SC-004**: At least 80% of card transactions have a receipt attached within 48 hours of the transaction occurring
- **SC-005**: At least 70% of settled card transactions are auto-coded to the correct expense account without the accountant needing to recode
- **SC-006**: Card-using workspaces churn at a rate at least 30% lower than non-card workspaces at the 12-month mark
- **SC-007**: Workspace admins can freeze a card and have it take effect within 10 seconds of the freeze action

---

### User Story 0 — Enable Cards for a Workspace (Priority: P1)

Before any cards can be issued, a workspace admin must set up the card program. This is a one-time onboarding flow that collects business verification details, links a bank account for wallet top-ups, and makes an initial deposit into the card wallet.

**Why this priority**: Cards cannot be issued until the workspace wallet is active. This is the prerequisite for all other stories.

**Independent Test**: Can be tested by a workspace admin completing the setup wizard and confirming the Card Wallet balance is visible and cards can be issued.

**Acceptance Scenarios**:

1. **Given** a workspace has not yet enabled cards, **When** an admin navigates to the Cards section, **Then** they see a setup prompt rather than the card management interface
2. **Given** the admin starts card setup, **When** they complete the business verification steps and link a bank account, **Then** the workspace card programme is activated and they can issue cards
3. **Given** card setup is complete, **When** the admin makes an initial wallet top-up, **Then** the Card Wallet balance is reflected immediately and cards can be issued up to that balance
4. **Given** the card wallet balance reaches zero, **When** a cardholder attempts a purchase, **Then** the purchase is declined and the admin receives a low-balance notification
5. **Given** the admin wants to top up the wallet, **When** they initiate a transfer from their linked bank account, **Then** the wallet balance increases by the transferred amount within one business day

---

## Clarifications

### Session 2026-03-14
- Q: How does the workspace fund card purchases? → A: **Pre-loaded wallet** — workspace deposits funds upfront; cards draw from wallet balance; purchases decline if wallet is insufficient
- Q: What happens when a workspace enables cards for the first time? → A: **Self-serve setup wizard within Polygon** — business verification, bank account linking, initial wallet top-up; no redirect to external platform
- Q: Can owners/accountants also be cardholders? → A: **Owners yes, accountants no** — separation of duties; accountant approves card journal entries and cannot also be a cardholder
- Q: What triggers a low-wallet-balance notification? → A: **Admin-configured threshold** — sensible default pre-filled (e.g. $500), editable by the workspace admin
- Q: Who can edit the merchant category → expense account mapping? → A: **Owners and accountants** manage the global mapping; **cardholders** can override the suggested account on their own individual transactions
- Note: Merchant category auto-coding is not a new system — it reuses the existing bank reconciliation rules engine. Card transactions follow the same pattern as bank feed transactions, with structured merchant category codes replacing fuzzy text matching.

---

## Out of Scope (V1)

- Physical card issuance (plastic cards, delivery logistics)
- Short-term credit lines or deferred payment (future epic)
- Multi-currency card controls (cards settle in AUD; foreign currency amounts are displayed but not separately controlled)
- Reimbursement workflows (virtual cards replace reimbursements — not model them)
- Integration with third-party expense tools (Dext, Hubdoc, Expensify)
- Cardholder mobile app (card management is within the existing Polygon web app)
- Bulk card issuance (one card issued at a time in V1)
