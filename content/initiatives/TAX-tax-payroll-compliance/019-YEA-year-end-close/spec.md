---
title: "Feature Specification: Year-End Close"
---

# Feature Specification: Year-End Close

**Feature Branch**: `019-YEA-year-end-close`
**Created**: 2026-03-14
**Status**: Draft
**Epic**: 019-YEA

---

## Overview

Year-End Close gives accountants and business owners on MoneyQuest Ledger a formal, guided workflow to close an accounting period at year end. It covers four connected capabilities: flagging journal entries as year-end adjustments, a step-by-step period close checklist, automated retained earnings rollover, and workpaper storage with accountant sign-off. Together these capabilities replace an ad-hoc, error-prone manual process with an auditable close record inside the workspace.

---

## User Scenarios & Testing

### User Story 1 — Post Year-End Adjusting Entry (Priority: P1)

An accountant posts accruals, depreciation charges, and prepayment reversals at year end as part of closing the books. These entries need to be clearly distinguishable from ordinary day-to-day transactions so that the year-end adjustments appear cleanly in the general ledger and reports without being confused with routine bookkeeping.

**Why this priority**: The adjusting entry flag is the foundational building block. Without it, year-end entries are invisible in the context of close. All other capabilities (checklist, rollover, workpapers) reference the period being closed — adjusting entries are what accountants post before they initiate the close. This must ship first.

**Independent Test**: Can be fully tested by creating a journal entry, selecting "Year-End Adjustment" as the entry type, saving it, and verifying it appears with the adjustment label in the journal entry list and on the general ledger report.

**Acceptance Scenarios**:

1. **Given** I am logged in as an Accountant or Owner, **When** I open the new journal entry form, **Then** I see an entry type selector that includes "Year-End Adjustment" as an option alongside the standard "Journal Entry" type.

2. **Given** I am creating a new journal entry, **When** I select "Year-End Adjustment" as the entry type and submit a balanced entry, **Then** the entry is saved and displayed with a visible "Year-End Adjustment" label in the journal entry list.

3. **Given** adjusting entries exist for the current accounting period, **When** I view the general ledger report, **Then** adjusting entries display with a distinct label that distinguishes them from regular journal entries.

4. **Given** I am viewing the journal entry list, **When** I apply a filter for "Year-End Adjustment" entries, **Then** only adjusting entries are shown and all other entry types are hidden.

5. **Given** I am logged in as a Bookkeeper role, **When** I open the new journal entry form, **Then** the "Year-End Adjustment" type option is not available — Bookkeepers cannot post adjusting entries.

6. **Given** an adjusting entry has been posted, **When** I view the entry detail, **Then** I can see the type is "Year-End Adjustment" and this label appears on any printed or exported version of the entry.

---

### User Story 2 — Run Period Lock & Close Checklist (Priority: P1)

An accountant needs a formal, step-by-step workflow to close an accounting period at year end. The checklist guides them through locking the period, verifying the trial balance, confirming the retained earnings rollover, and recording final sign-off — with clear status indicators at each step so they know exactly where they are in the process.

**Why this priority**: The close checklist is the central orchestration layer of the year-end workflow. It holds together the lock, the retained earnings step, and the sign-off into one accountable sequence. Without the checklist, the other capabilities are disconnected actions. This is the UX spine of the whole epic.

**Independent Test**: Can be fully tested by navigating to Accounting Periods, selecting a period, initiating the close workflow, and stepping through each checklist step to confirm status updates correctly and the period reaches "Closed" state.

**Acceptance Scenarios**:

1. **Given** I am logged in as an Accountant or Owner, **When** I navigate to the Accounting Periods page and select an open period, **Then** I see a "Close Period" button that opens the year-end close workflow.

2. **Given** I have opened the close workflow for a period, **When** I view the checklist, **Then** I see four steps in order: (1) Lock Period, (2) Review Trial Balance, (3) Confirm Retained Earnings Rollover, (4) Sign Off — each showing its current status (Not Started, In Progress, or Complete).

3. **Given** I am on Step 1 (Lock Period), **When** I confirm the lock, **Then** the period status changes to Locked, no new journal entries can be posted to the period, and Step 1 shows as Complete.

4. **Given** the period is Locked, **When** any user (including Owner or Accountant) attempts to create a journal entry dated within the locked period, **Then** the entry is rejected with a message stating the period is locked.

5. **Given** I am on Step 2 (Review Trial Balance), **When** I view the step, **Then** the trial balance for the period is displayed in-context showing total debits and total credits — and whether they are equal.

6. **Given** the trial balance is out of balance (debits do not equal credits), **When** I am on Step 2, **Then** I see a warning indicating the trial balance does not balance, and I cannot proceed to Step 3 until I acknowledge the imbalance or resolve the underlying entries.

7. **Given** the workspace uses multi-currency and has foreign currency accounts with unrealised FX gains/losses, **When** I am on Step 2 (Review Trial Balance), **Then** I see a warning prompting me to post FX adjustment entries before proceeding — the retained earnings rollover uses base currency amounts only.

7. **Given** Steps 1 and 2 are complete, **When** I proceed to Step 3 (Confirm Retained Earnings Rollover), **Then** I see the proposed closing entry for review before it is posted (see User Story 3 for detail on this step).

8. **Given** Steps 1, 2, and 3 are complete, **When** I reach Step 4 (Sign Off), **Then** I see a sign-off form with my name pre-filled, a date field defaulting to today, and an optional comment field.

9. **Given** I complete the sign-off on Step 4, **When** I submit, **Then** the period status changes to Closed, the close is recorded with my name, timestamp, and comment, and the checklist shows all four steps as Complete.

10. **Given** a period has been closed, **When** I view the Accounting Periods list, **Then** the period displays with a "Closed" badge and the accountant's sign-off name and date visible.

11. **Given** I am logged in as a Bookkeeper or lower role, **When** I navigate to the Accounting Periods page, **Then** the "Close Period" button is not visible — only Accountants and Owners can initiate a close.

---

### User Story 3 — Retained Earnings Rollover (Priority: P1)

When closing the year, the system automatically calculates net profit (or loss) for the period and proposes the closing entry that transfers it to retained earnings. The accountant reviews the proposed entry before it is posted — they can see exactly which accounts are being debited and credited and by how much — and confirms to post it. This eliminates manual calculation and ensures the opening balance sheet for the new year starts correctly.

**Why this priority**: Retained earnings rollover is the accounting event that makes a year-end close meaningful. Without it, the close is administrative only — the balance sheet does not reflect the period's results. Getting this right is critical; an incorrect rollover corrupts opening balances for the next year.

**Independent Test**: Can be fully tested by running a period close on a workspace with known income and expense balances, verifying the proposed closing entry amounts match the expected net profit, confirming the entry, and checking that the retained earnings account balance increases by the net profit amount.

**Acceptance Scenarios**:

1. **Given** I am on Step 3 (Confirm Retained Earnings Rollover) of the close checklist, **When** the step loads, **Then** I see the calculated net profit (or net loss) for the period displayed as a single summary figure.

2. **Given** the retained earnings step has loaded, **When** I view the proposed closing entry, **Then** I see a line-by-line breakdown showing each revenue account being debited to zero, each expense account being credited to zero, and the net difference being posted to the Retained Earnings account.

3. **Given** the workspace has a net profit for the period, **When** I view the proposed entry, **Then** the Retained Earnings account is shown as a credit for the net profit amount.

4. **Given** the workspace has a net loss for the period, **When** I view the proposed entry, **Then** the Retained Earnings account is shown as a debit for the net loss amount.

5. **Given** I have reviewed the proposed closing entry and it is correct, **When** I click "Confirm and Post", **Then** the closing entry is posted with entry type "Year-End Adjustment", Step 3 is marked Complete, and I am advanced to Step 4.

6. **Given** a retained earnings closing entry has been posted, **When** I view the account balance for the Retained Earnings account, **Then** it reflects the increase (or decrease) from the closing entry.

7. **Given** a closing entry has been posted, **When** I attempt to edit or delete it, **Then** the system rejects the attempt — the closing entry is immutable and can only be corrected by reversal.

8. **Given** the workspace has no Retained Earnings account in the chart of accounts, **When** the retained earnings step loads, **Then** the system automatically creates a "Retained Earnings" equity account (code 3200) and proceeds with the rollover step.

---

### User Story 4 — Attach Workpaper Notes to a Period Close (Priority: P2)

An accountant needs to attach internal workpaper notes — schedules, reconciliation memos, review checklists — to a period close record. These are the internal accounting records that support the year-end figures. They must stay inside the workspace, linked to the close, and must not be visible to client users.

**Why this priority**: Workpapers are important for professional accounting practice and audit readiness, but they do not block the core close workflow. An accountant can close a period without them. They are P2 because the close process functions without workpapers, but the feature is not complete for professional accountants without a place to store them.

**Independent Test**: Can be fully tested by closing a period, navigating to the closed period's workpapers tab, adding a rich-text note, attaching a PDF file, and then logging in as a client-role user and confirming the workpapers tab is not visible.

**Acceptance Scenarios**:

1. **Given** a period close has been initiated (period is Locked or beyond), **When** I view the close record, **Then** I see a Workpapers section where I can add notes.

2. **Given** I am in the Workpapers section, **When** I click "Add Workpaper", **Then** a rich-text editor opens where I can write a workpaper note with formatting (headings, bullet lists, bold, italic).

3. **Given** I have written a workpaper note, **When** I save it, **Then** the note appears in the Workpapers list with my name, the date and time it was created, and the first line of the note as a preview.

4. **Given** I am viewing a workpaper note, **When** I click "Attach File", **Then** I can upload one or more files (PDF, spreadsheet, image) that are attached to that workpaper note.

5. **Given** I am logged in as a Client-role user, **When** I navigate to the Accounting Periods page, **Then** I cannot see the Workpapers section — it is hidden from Client and Auditor roles entirely.

6. **Given** I am logged in as an Accountant or Owner, **When** I view a workpaper note, **Then** I can edit or delete it — with a confirmation step before deletion.

7. **Given** a period is fully Closed (sign-off complete), **When** I view the workpapers, **Then** I can still add new workpaper notes to the closed period — the close does not lock workpapers.

---

### User Story 5 — View Year-End Adjustment Entries in Reports (Priority: P2)

When an accountant or business owner views financial reports (general ledger, trial balance, profit and loss), they need to clearly see which entries are year-end adjustments so they can distinguish normal trading activity from close-of-period accounting entries. Reports should support filtering or highlighting of adjustment entries.

**Why this priority**: Report visibility of adjusting entries is a natural extension of User Story 1, but it is not a blocking requirement for the core close workflow. The flagging in the ledger list (US1) delivers the primary value; report-level integration is an important completeness item for the audit trail.

**Independent Test**: Can be fully tested by posting an adjusting entry, opening the general ledger report for the relevant period, and verifying the entry displays with the Year-End Adjustment label and that a filter for adjustment-only entries works correctly.

**Acceptance Scenarios**:

1. **Given** adjusting entries exist in a period, **When** I view the general ledger report for that period, **Then** adjusting entries are visually distinguished from regular entries (e.g., an "Adjustment" label in the entry type column).

2. **Given** I am viewing the general ledger report, **When** I toggle a "Year-End Adjustments Only" filter, **Then** only adjusting entries are shown and the report totals recalculate to reflect only those entries.

3. **Given** I am viewing the profit and loss report, **When** the report includes periods where a retained earnings close has been posted, **Then** the closing entry lines are clearly labelled as "Year-End Close" and do not distort the trading profit figures.

4. **Given** I export the general ledger to CSV or PDF, **When** the export includes adjusting entries, **Then** the exported file includes the entry type column showing "Year-End Adjustment" for those entries.

---

### User Story 6 — View Close History and Audit Trail (Priority: P3)

An accountant or business owner needs to see a history of past period closes — who signed off, when, and any notes — so they have an auditable record of year-end activity without needing to check external documents.

**Why this priority**: Audit trail is important for professional practice but does not affect day-to-day operations. It is a completeness feature that adds confidence for auditors and business owners reviewing historical years.

**Independent Test**: Can be fully tested by closing a period with sign-off, navigating to the period close history, and confirming the signed-off name, timestamp, and comment are displayed correctly.

**Acceptance Scenarios**:

1. **Given** one or more periods have been closed, **When** I navigate to the Accounting Periods page, **Then** I see a history of closed periods with the close date, the accountant's name, and any sign-off comment.

2. **Given** I select a closed period, **When** I view the close detail, **Then** I see a full timeline: when the lock was applied, when the retained earnings entry was posted, and when sign-off was recorded — each with a name and timestamp.

3. **Given** I am an Auditor-role user, **When** I view the Accounting Periods page, **Then** I can see the close history and timeline but cannot see workpapers — the audit trail is visible to auditors, workpapers are not.

---

### Edge Cases

- What happens if an accountant closes a period but the chart of accounts does not have a Retained Earnings account — the system must block the rollover step and prompt the accountant to configure one before proceeding.
- What happens if an accountant attempts to lock a period that has unreconciled bank transactions — the system displays the count of unreconciled transactions as a warning and requires explicit "Proceed anyway" acknowledgement before locking. It is a soft block, not a hard block — locking and reconciliation are independent workflows.
- What happens if the closing entry is partially posted (system error mid-way) — the system must ensure the closing entry is atomic: either fully posted or not posted at all, with no partial state.
- What happens if there are no income or expense accounts with balances at year end — the retained earnings rollover step should still complete but with a zero-value closing entry and an informational note.
- What happens to existing entries posted to a period after it is locked — any attempt to post to a locked period must be rejected, including backdated entries from integrations (e.g., bank feeds importing transactions).
- What happens if a period is locked but the accountant realises a material error — the Owner role can unlock a Locked period. Unlocking requires a mandatory reason (free text), is logged in the audit trail, and resets the close checklist to Step 1. Accountants cannot unlock — only Owners. Fully Closed periods (sign-off complete) cannot be unlocked or reopened.
- What happens when the workpaper file attachment is very large — the system should enforce a per-file size limit consistent with the existing attachments system (012-ATT).
- What happens when multiple accountants work in the same workspace — only one person can progress the close workflow at a time; concurrent access to the checklist should be handled gracefully (last-writer wins with a refresh prompt).

---

## Requirements

### Functional Requirements

**Adjusting Journal Entries**

- **FR-001**: The journal entry creation form MUST include an entry type selector that includes "Year-End Adjustment" as a selectable option, visible only to Accountant and Owner roles.
- **FR-002**: Journal entries created with the "Year-End Adjustment" type MUST display a distinct label in the journal entry list and in the general ledger report that visually distinguishes them from standard entries.
- **FR-003**: The journal entry list MUST support filtering to show only "Year-End Adjustment" entries, excluding all other entry types from the filtered view.
- **FR-004**: The "Year-End Adjustment" entry type MUST be included in exported versions of the general ledger (CSV, PDF) as a dedicated column value.

**Period Lock & Close Workflow**

- **FR-005**: Accountant and Owner roles MUST be able to initiate the year-end close workflow from the Accounting Periods page for any open accounting period.
- **FR-006**: The close workflow MUST present a four-step checklist: (1) Lock Period, (2) Review Trial Balance, (3) Confirm Retained Earnings Rollover, (4) Sign Off — in this order, with each step requiring completion before the next is available.
- **FR-007**: When a period is locked (Step 1 complete), the system MUST reject any new journal entry dated within that period, regardless of the user's role.
- **FR-008**: The exception to FR-007 is that Accountant and Owner roles MUST still be able to post "Year-End Adjustment" entries to a locked period — adjusting entries are a permitted exception to the lock.
- **FR-009**: Step 2 MUST display the trial balance for the period, showing total debits, total credits, and whether they balance. If the trial balance is out of balance, the system MUST display a warning message.
- **FR-010**: The system MUST NOT prevent the accountant from proceeding past Step 2 if the trial balance is out of balance — the warning is informational, not a hard block, but must be explicitly acknowledged before proceeding.
- **FR-011**: Step 4 (Sign Off) MUST record the signing accountant's name, the sign-off timestamp, and an optional free-text comment against the period close record.
- **FR-012**: Once a period is Closed (all four steps complete), the period status MUST display as "Closed" in the Accounting Periods list with the accountant name and date of sign-off visible.
- **FR-013**: Bookkeeper, Approver, Auditor, and Client roles MUST NOT be able to initiate, view, or interact with the close workflow checklist.

**Retained Earnings Rollover**

- **FR-014**: When Step 3 loads, the system MUST calculate net profit (or loss) for the period by summing all revenue account balances minus all expense account balances for that period.
- **FR-015**: The retained earnings step MUST display the proposed closing entry in full, showing each revenue account being debited to zero, each expense account being credited to zero, and the net amount being credited (or debited) to the Retained Earnings account.
- **FR-016**: The Accountant or Owner MUST explicitly confirm the proposed closing entry before it is posted — it MUST NOT post automatically.
- **FR-017**: The closing entry MUST be posted with entry type "Year-End Adjustment" and a standardised description (e.g., "Year-End Close — Retained Earnings Rollover — [Period Name]").
- **FR-018**: The closing entry MUST be immutable once posted — edits and deletions MUST be rejected. Corrections MUST be made via a reversal entry.
- **FR-019**: If no Retained Earnings account exists in the chart of accounts, the system MUST auto-create a "Retained Earnings" equity account (code 3200) when Step 3 loads and proceed with the rollover.
- **FR-030**: When locking a period (Step 1), if unreconciled bank transactions exist in the period, the system MUST display the count as a warning and require explicit acknowledgement ("Proceed anyway") before locking.
- **FR-031**: Owner role MUST be able to unlock a Locked period. Unlocking requires a mandatory reason (free text), is recorded in the audit trail, and resets the close checklist to Step 1. Accountants MUST NOT be able to unlock.
- **FR-032**: Fully Closed periods (sign-off complete) MUST NOT be reopenable by any role. Prior period corrections MUST be posted as adjustments in the current open period.
- **FR-033**: For multi-currency workspaces, the retained earnings rollover MUST use base currency amounts only. Step 2 (Review Trial Balance) MUST display a warning if foreign currency accounts have unrealised FX gains/losses that have not been posted as adjusting entries.
- **FR-020**: The Retained Earnings account balance MUST reflect the closing entry immediately after it is posted.

**Workpapers & Sign-Off**

- **FR-021**: Accountant and Owner roles MUST be able to create, edit, and delete rich-text workpaper notes on any period that has been Locked or beyond in the close workflow.
- **FR-022**: Workpaper notes MUST support rich-text formatting including headings, bullet lists, numbered lists, bold, and italic text.
- **FR-023**: Workpaper notes MUST support file attachments (PDF, spreadsheet, image formats) consistent with the existing attachments capability.
- **FR-024**: Workpaper notes MUST NOT be visible to Client or Auditor roles — they are restricted to Accountant and Owner roles only.
- **FR-025**: Each workpaper note MUST record the author's name and the date and time it was created.
- **FR-026**: Workpaper notes MUST remain editable after the period is fully Closed — the close sign-off does not lock workpapers.

**Audit Trail**

- **FR-027**: The Accounting Periods page MUST display a close history for all closed periods, showing at minimum: the close date, the signing accountant's name, and the sign-off comment.
- **FR-028**: The period close detail view MUST display a timeline of close events: period lock timestamp, retained earnings entry post timestamp, and sign-off timestamp — each with the acting user's name.
- **FR-029**: Auditor-role users MUST be able to view the close history and close timeline for all periods.

### Key Entities

- **Accounting Period**: A defined time range (e.g., 01 July 2025 – 30 June 2026) with a status: Open, Locked, or Closed. The close workflow drives the status transitions.
- **Period Close Record**: A record attached to an Accounting Period that tracks the four close steps, their completion status, the timestamps, and the signing user.
- **Adjusting Journal Entry**: A journal entry with entry type "Year-End Adjustment". Behaviorally identical to a standard journal entry but with a distinct type label and the exception that it can be posted to a locked period.
- **Retained Earnings Closing Entry**: A specific adjusting journal entry auto-generated by the system during Step 3. It zeroes all revenue and expense accounts and posts the net to the Retained Earnings account.
- **Workpaper Note**: A rich-text note with optional file attachments, linked to a Period Close Record. Visible only to Accountant and Owner roles.
- **Sign-Off Record**: The name, timestamp, and optional comment recorded when the accountant completes Step 4 of the close checklist.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: An accountant can complete the full year-end close workflow (lock, trial balance review, retained earnings confirmation, sign-off) in under 15 minutes for a workspace with up to 200 accounts, without needing to leave MoneyQuest Ledger.
- **SC-002**: The retained earnings closing entry calculation is accurate to the cent — the sum of posted amounts matches the net profit shown on the profit and loss report for the same period, with zero discrepancy.
- **SC-003**: A period in "Locked" status rejects 100% of attempted journal entry posts dated within that period, with the exception of Year-End Adjustment entries from Accountant and Owner roles.
- **SC-004**: Workpaper notes and attachments created by an Accountant are inaccessible to Client-role users — zero workpaper content is visible to a Client who logs in independently.
- **SC-005**: The close history and sign-off record are preserved indefinitely — a period closed two years ago still shows the accountant's name, timestamp, and comment.
- **SC-006**: The retained earnings closing entry fails atomically — if an error occurs during posting, the system returns to the pre-confirmation state with no partial journal entry in the ledger.

---

## Clarifications

### Session 2026-03-15
- Q: Auto-create Retained Earnings account or require manual setup? → A: Auto-create — system creates "Retained Earnings" equity account (code 3200) automatically when Step 3 loads and none exists
- Q: Unreconciled bank transactions when locking — hard block or soft warning? → A: Soft warning with acknowledgement — show count, require explicit "Proceed anyway" click
- Q: Can Owner unlock a locked period? → A: Yes — Owner can unlock Locked periods with mandatory reason, audit log, and checklist reset to Step 1. Fully Closed periods cannot be reopened.
- Q: Multi-currency retained earnings rollover? → A: Base currency only. Step 2 shows FX warning if unrealised gains/losses haven't been posted. FX adjustments are manual adjusting entries.
- Q: Can a fully Closed period be reopened? → A: No — close is permanent and irreversible. Prior period corrections are posted as adjustments in the current open period.
