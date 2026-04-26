---
title: "Feature Specification: Bank Account Setup & Feed Connection"
---

# Feature Specification: Bank Account Setup & Feed Connection

**Feature Branch**: `017-BAS-bank-account-setup`
**Created**: 2026-03-14
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a Bank Account Manually (Priority: P1)

A bookkeeper or owner wants to add a new bank account to their workspace. They navigate to Banking and start the setup flow. They enter the account details — name, institution (selected from a Basiq-provided institution list), BSB, account number, linked chart of accounts account, and optional opening balance. The account is created and immediately visible in the Banking overview. They can optionally upload transactions via CSV in early versions, or connect a live bank feed later from the account detail.

**Why this priority**: Manual account setup is the minimum viable path for users who either don't want automatic feed connection or whose institution isn't supported by the bank feed provider. All users need this regardless of whether they connect a feed.

**Independent Test**: Can be fully tested by completing the manual form at `/banking/new` (Step 1 only) and verifying the new account appears in the Banking overview with the correct opening balance.

**Acceptance Scenarios**:

1. **Given** a bookkeeper is on the Banking page, **When** they click "Add Bank Account", **Then** they are taken to the account setup form at `/banking/new`
2. **Given** the setup form is open, **When** they fill in account name, institution, BSB, account number, linked chart account, and opening balance, **Then** the form validates all required fields before submission
3. **Given** a valid form, **When** they submit, **Then** the account is created and they are redirected to the Banking overview where the new account card appears
4. **Given** a duplicate account number already exists in the workspace, **When** they submit, **Then** the form displays a clear validation error indicating the account already exists

---

### User Story 2 - Connect a Bank Feed via Basiq (Priority: P2)

After creating a bank account, an owner can optionally connect it to automatic bank feed data via Basiq from the account detail view. This is not a mandatory step during creation — the account exists and is usable (via CSV import or manual entry) without a live feed. They see a confirmation screen showing what will be shared and what permissions are required, then are handed off to the Basiq-hosted institution login flow. After Basiq completes the OAuth consent, they land back on the MoneyQuest callback page which confirms the connection is active.

**Why this priority**: Automatic bank feeds eliminate manual transaction entry — a core value driver for the product. Without this, users must import CSV files or enter transactions manually. This story depends on Story 1 (the account must exist first).

**Independent Test**: Can be tested by creating an account with the "Connect bank feed" option, completing the Basiq OAuth flow in a staging environment, and verifying the connection status changes to "connected" on the account card.

**Acceptance Scenarios**:

1. **Given** an account has been created in Step 1, **When** the user proceeds to connect a feed, **Then** they see a confirmation screen showing the institution name, the type of data access being granted, and a clear call-to-action to proceed to the institution's login
2. **Given** the user is on the confirmation screen, **When** they click "Connect with [Institution]", **Then** they are redirected to the Basiq-hosted institution login UI (external)
3. **Given** the user has successfully completed the Basiq OAuth consent flow, **When** Basiq redirects them back, **Then** they land on `/banking/feeds/callback` which shows a success confirmation and a link back to Banking
4. **Given** the user cancels or fails the Basiq OAuth flow, **When** Basiq redirects them back with an error, **Then** the callback page shows a clear error message and offers the option to try again or skip feed connection
5. **Given** a successful callback, **When** the user navigates to Banking, **Then** the account card shows a "Connected" feed status indicator

---

### User Story 3 - Skip Feed Connection (Priority: P2)

During the setup flow, after creating the account, the user wants to skip connecting a bank feed and just use manual import or entry. They should be able to exit the flow at the feed connection step without losing their created account.

**Why this priority**: Not all users need or can access automatic feeds (institution not supported, preference for manual control). The account must remain even if feed connection is skipped.

**Independent Test**: Can be tested by completing Step 1 (create account), then clicking "Skip" or "Do this later" on the feed connection screen, and verifying the account exists in Banking without a feed connection.

**Acceptance Scenarios**:

1. **Given** an account has been created and the feed connection prompt is shown, **When** the user clicks "Skip for now", **Then** they are redirected to the Banking overview with the new account visible but without a feed connection
2. **Given** the user skips feed connection, **When** they later view the account, **Then** there is a clear path to connect a feed at any time from the account detail view

---

### User Story 4 - View and Manage Feed Connection Status (Priority: P3)

An owner or accountant can see at a glance which bank accounts have active feed connections, which are pending, and which are disconnected. They can reconnect a feed or disconnect it from the account detail.

**Why this priority**: Ongoing feed management (reconnecting expired consents, disconnecting stale accounts) is important for operational reliability, but is secondary to the initial connection flow.

**Independent Test**: Can be tested by navigating to an account with an active feed connection and verifying the connection status is visible, with options to disconnect shown.

**Acceptance Scenarios**:

1. **Given** a bank account with an active feed connection, **When** the user views the account detail, **Then** the connection status, institution name, and last sync date are visible
2. **Given** a bank account with a connected feed, **When** the user clicks "Disconnect feed", **Then** the feed is disconnected and the account remains with manual-only mode
3. **Given** a bank account with an expired or failed connection, **When** the user views it, **Then** a clear warning is shown with an option to reconnect

---

### Edge Cases

- What happens if the Basiq callback returns before the account has finished saving?
- How does the system handle Basiq sessions that expire mid-flow (user leaves, returns later)?
- What if the user connects the same bank institution account to two different MoneyQuest accounts?
- What if the BSB entered doesn't match any known Australian BSB format?
- What if the user's institution is not supported by Basiq — is this surfaced before or after they attempt connection?
- What if the opening balance date is in the future?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow bookkeepers and owners to create a bank account with the following required fields: account name, institution (selected from a Basiq-provided institution list), account number, and linked chart of accounts account
- **FR-002**: The system MUST allow optional fields on account creation: BSB (for Australian accounts), currency, and opening balance with effective date. If an opening balance is provided, the system MUST automatically create an opening balance journal entry posting to the linked chart of accounts account
- **FR-003**: The system MUST validate that the combination of account number and BSB is unique within the workspace before saving
- **FR-004**: The system MUST allow users to connect a bank feed to an existing account at any time from the account detail view — feed connection is not required during account creation
- **FR-005**: When initiating feed connection, the system MUST present a confirmation screen showing the institution name and the type of data access being granted, then hand off to the Basiq-hosted OAuth flow (external institution login) when the user confirms
- **FR-006**: The system MUST handle the Basiq OAuth callback at a dedicated return URL (`/banking/feeds/callback`) and update the account's feed connection status accordingly
- **FR-007**: The system MUST allow users to skip feed connection during setup without losing the created account
- **FR-008**: The system MUST display a success or failure state on the callback page with clear next actions
- **FR-009**: The system MUST display feed connection status (connected, disconnected, pending, error) on the bank account card in the Banking overview
- **FR-010**: The system MUST allow bookkeepers and above to disconnect a feed from the account detail view
- **FR-011**: The system MUST restrict bank account creation to users with the bookkeeper role or above (not auditor or client roles)
- **FR-012**: The system MUST allow bookkeepers and above to import transactions via CSV upload to a bank account in lieu of a live feed

### Key Entities

- **Bank Account**: Represents a financial institution account within a workspace. Key attributes: name, institution, BSB, account number (masked for display), currency, opening balance, opening balance date, linked chart of accounts account, feed connection status
- **Feed Connection**: Represents an active Basiq consent link between a bank account and a Basiq user consent. Key attributes: basiq_user_id, basiq_account_id, connection status, last synced at, consent expiry
- **Chart of Accounts Account**: The ledger account this bank account posts to (e.g., "Cash at Bank 1100"). Selected during setup from the workspace's chart of accounts

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the manual account creation flow (Step 1 only) in under 2 minutes
- **SC-002**: Users can complete the full setup including feed connection (Steps 1–4) in under 5 minutes
- **SC-003**: 100% of Basiq callbacks are handled without data loss — account is preserved regardless of OAuth outcome
- **SC-004**: Feed connection status is always accurate and reflects the real Basiq consent state within 60 seconds of a status change
- **SC-005**: Users who skip feed connection can initiate connection from the account detail at any time without needing to re-enter account details

---

## Clarifications

### Session 2026-03-14

- Q: Is feed connection part of the creation wizard or triggered separately? → A: Separate — account creation stands alone; feed connection is an optional action from the account detail at any time. CSV import is also available as an alternative in early versions.
- Q: Is the institution selected from a Basiq-provided list or free-text? → A: Institution list comes from Basiq API (not free-text).
- Q: Is opening balance required? Does it create a journal entry? → A: Optional. If provided, system creates an opening balance journal entry automatically.
- Q: What uniqueness rule applies to account number? → A: Unique on BSB + account number combination within the workspace.
- Q: Who can disconnect a feed? → A: Same roles as creation — bookkeeper and above.
- Q: Which countries does the institution list cover? → A: AU and NZ (Basiq's supported markets).
- Q: What happens to CSV-imported transactions when a live feed is later connected? → A: System flags potential duplicates for user review (not auto-deduplicated).
- Q: What account does the opening balance credit against? → A: A system-managed "Opening Balances" equity account (auto-created if absent).
- Q: Is the institution picker a flat dropdown or searchable? → A: Searchable/filterable (type to search by name) — Command + Popover pattern.
- Q: How are expired Basiq consent notifications handled? → A: In-app only — status indicator on account card + banner on Banking page.
