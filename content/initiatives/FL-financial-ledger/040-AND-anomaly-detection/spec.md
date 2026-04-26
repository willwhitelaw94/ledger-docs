---
title: "Feature Specification: Anomaly Detection & Fraud Prevention"
---

# Feature Specification: Anomaly Detection & Fraud Prevention

**Feature Branch**: `040-AND-anomaly-detection`
**Created**: 2026-03-19
**Status**: Draft
**Epic**: 040-AND
**Initiative**: FL — Financial Ledger Platform
**Effort**: L (4 sprints)
**Depends On**: 002-CLE (complete), 004-BFR (complete), 005-IAR (complete), 018-ITR (planned), 024-NTF (planned)

### Out of Scope

- **Machine learning models** — v1 uses statistical rules (standard deviation, time-window matching), not trained ML models. ML-based detection deferred to v2
- **Real-time blocking** — anomalies are flagged after posting, not intercepted before. The ledger remains append-only; detection is advisory
- **Third-party fraud databases** — no integration with external fraud/sanctions lists in v1
- **Cross-workspace anomaly correlation** — detection runs per-workspace only; cross-entity pattern detection deferred
- **Unusual timing detection** — referenced in settings UI but the rule engine for time-of-day / day-of-week patterns is deferred to v2
- **Automatic remediation** — the system flags and recommends actions but never auto-reverses transactions

---

## Overview

Businesses lose money to duplicate payments, amount outliers, unexpected vendors, and unusual transaction patterns — often without realising until tax time. This feature adds an AI-powered anomaly detection layer that continuously monitors the ledger for suspicious or unusual transactions and surfaces them for review.

The system runs detection rules against posted journal entries, bank transactions, invoices, and bills. Anomalies are flagged with severity levels and surfaced in a dedicated review queue, the Intray (018-ITR), and notifications (024-NTF). Users can dismiss false positives, and the system learns from feedback to reduce noise over time.

---

## User Scenarios & Testing

### User Story 1 — Duplicate Payment Detection (Priority: P1)

A bookkeeper wants the system to catch when the same vendor has been paid twice for the same amount within a short window, preventing costly double-payments.

**Why this priority**: Duplicate payments are the most common and costly accounting error. Detection is high-value and algorithmically straightforward — same contact, same amount, short time window. This delivers immediate ROI with minimal complexity.

**Independent Test**: Can be tested by creating two bills to the same contact with the same amount within 7 days and verifying the system flags a potential duplicate.

**Acceptance Scenarios**:

1. **Given** a bill payment of $3,300 to "Office Supplies Co" was posted on March 10, **When** another payment of $3,300 to the same contact is posted on March 14, **Then** the system flags it as a "Potential Duplicate Payment" with High severity.
2. **Given** a flagged duplicate, **When** the user reviews it and marks it as "Not a duplicate" with a reason, **Then** the flag is dismissed and the same pattern is not flagged again for that vendor/amount pair.
3. **Given** two payments to the same vendor with amounts within 2% of each other (e.g., $3,300 and $3,267), **When** posted within 7 days, **Then** the system flags it as a "Possible Duplicate" with Medium severity.

---

### User Story 2 — Amount Outlier Detection (Priority: P1)

An accountant wants to be alerted when a transaction amount is significantly outside the normal range for that account or vendor, catching keying errors and unusual charges.

**Why this priority**: Fat-finger errors ($5,000 instead of $500) are common and can distort reports if not caught quickly. Statistical outlier detection catches these with high confidence once a baseline exists.

**Independent Test**: Can be tested by posting a transaction 10x larger than the historical average for an account and verifying the alert fires.

**Acceptance Scenarios**:

1. **Given** the average expense to "Telstra" is $180/month with a standard deviation of $30, **When** a bill for $1,800 is posted to Telstra, **Then** the system flags it as an "Amount Outlier" with High severity, showing the expected range.
2. **Given** a new vendor with no transaction history, **When** a payment is posted, **Then** no outlier flag is raised (insufficient data for baseline).
3. **Given** an account that normally sees transactions of $50-$200, **When** a transaction of $15,000 is posted, **Then** it is flagged with the account's typical range displayed.

---

### User Story 3 — Unexpected Vendor / New Payee Alert (Priority: P2)

A business owner wants to know when payments are made to vendors who have never been paid before, as a basic fraud prevention measure.

**Why this priority**: New payee alerts catch unauthorised payments and social engineering attacks. Lower priority than duplicates/outliers because new vendors are normal in growing businesses — the signal-to-noise ratio is inherently lower.

**Independent Test**: Can be tested by creating a payment to a contact with no prior transaction history and verifying the alert.

**Acceptance Scenarios**:

1. **Given** a payment is posted to a contact who has never received a payment in this workspace, **When** the transaction is posted, **Then** a "New Payee" alert with Low severity is created.
2. **Given** the user has configured "trusted vendors" in settings, **When** a payment is made to a trusted vendor, **Then** no new payee alert is raised.
3. **Given** a workspace that has been active for less than 90 days, **When** new payee alerts would fire for most vendors, **Then** the system suppresses new payee alerts during the "learning period" and notifies the user when the learning period ends.

---

### User Story 4 — Anomaly Review Queue (Priority: P1)

An accountant wants a dedicated view to review all flagged anomalies, take action on them (dismiss, investigate, reverse), and see the detection history.

**Why this priority**: Without a review queue, anomaly flags are noise. The queue turns detection into actionable workflow — it is the delivery mechanism for every other story in this epic.

**Independent Test**: Can be tested by seeding multiple anomaly records and verifying the queue displays them grouped by severity with action buttons.

**Acceptance Scenarios**:

1. **Given** 5 anomalies have been flagged, **When** the user navigates to the Anomaly Review page, **Then** they see all flags sorted by severity (High, Medium, Low) with the transaction details, flag reason, and action buttons.
2. **Given** an anomaly flagged as "Duplicate Payment", **When** the user clicks "Investigate", **Then** they are taken to a side-by-side comparison of the two transactions.
3. **Given** an anomaly, **When** the user clicks "Dismiss", **Then** the flag is removed and the dismissal reason is logged for model feedback.
4. **Given** a confirmed duplicate payment, **When** the user clicks "Reverse", **Then** they are taken to the reversal workflow for that transaction.

---

### User Story 5 — Anomaly Detection Settings (Priority: P2)

A workspace admin wants to configure which detection rules are active and adjust sensitivity thresholds to reduce false positives for their specific business.

**Why this priority**: Every business is different. A construction company with lumpy invoices needs different thresholds than a consultancy with regular monthly bills. Without configurability, false positive fatigue will cause users to ignore the feature entirely.

**Independent Test**: Can be tested by adjusting the outlier threshold from 3x to 5x standard deviation and verifying a previously-flagged transaction is no longer flagged.

**Acceptance Scenarios**:

1. **Given** the admin opens Anomaly Detection settings, **When** they view the rules list, **Then** they see each rule (Duplicate Payments, Amount Outliers, New Payee, Unusual Timing) with an enable/disable toggle and sensitivity slider.
2. **Given** the admin sets the outlier threshold to "High sensitivity" (2x std dev), **When** transactions are processed, **Then** more items are flagged compared to the default (3x std dev).
3. **Given** the admin disables the "New Payee" rule, **When** a payment to a new vendor is posted, **Then** no alert is created for that rule.

---

### Edge Cases

- **Insufficient data for baselines**: When a workspace has fewer than 20 transactions, detection rules that require statistical baselines are suppressed until sufficient data exists, with a "learning" badge shown on the settings page.
- **Reversed transactions**: Reversal entries are excluded from anomaly detection — they are corrections, not anomalies.
- **Recurring template transactions**: Transactions created from recurring templates are tagged and excluded from duplicate detection, since they are intentionally repeated.
- **Duplicate anomaly flags**: Anomaly records are deduplicated — if an existing open flag covers the same transaction pair, no new flag is created.
- **Bulk imports**: When a bank feed import creates 50+ transactions at once, anomaly detection runs asynchronously (queued) to avoid blocking the import. A notification is sent when detection completes.
- **Multi-currency transactions**: Outlier detection uses the transaction's original currency amount for comparison. Cross-currency comparisons are not performed in v1.
- **Dismissed anomaly re-detection**: When a user dismisses a duplicate flag for a vendor/amount pair, future identical patterns for that specific pair are suppressed. Other vendor/amount combinations are still checked.

---

## Requirements

### Functional Requirements

**Duplicate Payment Detection**
- **FR-001**: System MUST detect duplicate payments: same contact, same amount (exact match), within configurable window (default 7 days), flagged as High severity.
- **FR-002**: System MUST detect possible duplicates: same contact, amount within ±2%, within configurable window, flagged as Medium severity.
- **FR-003**: System MUST exclude reversal entries and recurring template-generated transactions from duplicate detection.

**Amount Outlier Detection**
- **FR-004**: System MUST detect amount outliers: transactions exceeding configurable standard deviation threshold (default 3x) from the contact or account historical average, flagged as High severity.
- **FR-005**: System MUST display the expected range (mean ± threshold) when flagging an outlier.
- **FR-006**: System MUST suppress outlier detection for contacts or accounts with fewer than 5 historical transactions (insufficient baseline).

**New Payee Detection**
- **FR-007**: System MUST alert on first-time payees with no prior payment history in the workspace, flagged as Low severity.
- **FR-008**: System MUST support a "trusted vendors" list that suppresses new payee alerts for designated contacts.
- **FR-009**: System MUST suppress new payee alerts during a learning period (first 90 days or first 20 transactions per account/contact, whichever comes first).

**Anomaly Review Queue**
- **FR-010**: System MUST provide an Anomaly Review page with severity grouping, transaction details, and action buttons (Dismiss, Investigate, Reverse).
- **FR-011**: System MUST support side-by-side transaction comparison for duplicate payment investigations.
- **FR-012**: System MUST log all dismissal actions with reason for detection model improvement.
- **FR-013**: System MUST support anomaly severity levels: High, Medium, Low.

**Anomaly Detection Settings**
- **FR-014**: System MUST allow workspace admins to enable/disable individual detection rules.
- **FR-015**: System MUST allow workspace admins to adjust sensitivity thresholds per rule (e.g., standard deviation multiplier, time window, amount tolerance percentage).
- **FR-016**: System MUST suppress statistical detection rules during a learning period (first 90 days or first 20 transactions per account/contact, whichever comes first), with a "learning" indicator visible in settings.

**Integration & Deduplication**
- **FR-017**: System MUST integrate flagged anomalies into the Intray (018-ITR) and Notifications (024-NTF) systems.
- **FR-018**: System MUST deduplicate anomaly flags — if an existing open flag covers the same transaction pair, no new flag is created.
- **FR-019**: Dismissed vendor/amount pairs MUST be remembered to suppress re-flagging of the same pattern.

### Key Entities

- **Anomaly Flag**: A detected suspicious pattern. Fields: `uuid`, `workspace_id`, `type` (duplicate, outlier, new_payee, unusual_timing), `severity` (high, medium, low), `status` (open, dismissed, investigated, reversed), `primary_transaction_id`, `secondary_transaction_id` (nullable — for duplicate pairs), `detection_metadata` (JSON — expected range, actual value, rule parameters used), `dismissed_reason` (nullable), `dismissed_by` (nullable), `dismissed_at` (nullable), `created_at`.
- **Detection Rule**: A configurable rule per workspace. Fields: `uuid`, `workspace_id`, `type` (duplicate, outlier, new_payee, unusual_timing), `enabled` (boolean), `sensitivity_params` (JSON — threshold multiplier, time window days, amount tolerance percent), `learning_period_active` (boolean), `learning_period_ends_at` (nullable), `created_at`, `updated_at`.
- **Anomaly Feedback**: A user's response to a flag (dismiss with reason, investigate, reverse) used to tune future detection. Stored as status transitions on the Anomaly Flag with audit fields.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: System detects 90%+ of actual duplicate payments (recall) with <20% false positive rate within 6 months of workspace activation.
- **SC-002**: 70% of flagged anomalies are actioned (dismissed or investigated) within 48 hours, indicating the flags are useful and not ignored.
- **SC-003**: Users who enable anomaly detection report 50% fewer duplicate payment issues in quarterly surveys.
- **SC-004**: False positive rate decreases by 30% over 6 months as the system learns from dismissal feedback.
- **SC-005**: Anomaly detection scan completes within 2 seconds per transaction for workspaces with up to 10,000 historical transactions.
- **SC-006**: The Anomaly Review page loads in under 1 second with up to 100 open flags.
- **SC-007**: Zero anomaly flags are created for reversal entries or recurring template transactions (exclusion rules verified by tests).

---

## Clarifications

### Session 2026-03-19

- **Q**: Should anomaly detection run synchronously on transaction post, or asynchronously? **A**: Synchronously for individual transactions (detection is fast — single DB query per rule). Asynchronously (queued) for bulk imports of 50+ transactions to avoid blocking the import flow.
- **Q**: How does the learning period work — per workspace, per contact, or per account? **A**: Per contact and per account independently. A new contact needs 5 transactions before outlier detection activates for that contact. A new workspace suppresses new payee alerts for 90 days. Both thresholds are configurable in detection rule settings.
- **Q**: Should the Anomaly Review page be a standalone route or part of the Intray? **A**: Standalone route (`/anomalies`) with its own StatusTabs (Open / Dismissed / All). Anomaly items also appear in the Intray as attention items, linking back to the anomaly detail.
- **Q**: What permissions control access to anomaly detection? **A**: `anomaly.view` for viewing the review queue, `anomaly.manage` for dismissing/investigating flags, `anomaly.configure` for changing detection settings. Owner and accountant roles get all three; bookkeeper gets view and manage; approver and auditor get view only.
- **Q**: How does the "trusted vendors" list interact with contact management? **A**: A boolean `is_trusted_vendor` flag on the Contact model. Settable from both the contact detail page and the anomaly detection settings page. Trusted vendors bypass new payee alerts only — they are still subject to duplicate and outlier detection.
- **Q**: What happens if a user dismisses a flag and then the underlying transaction is reversed? **A**: The dismissal stands — no re-flagging. The reversal itself is excluded from detection per FR-003. The anomaly flag's status remains "dismissed" for audit trail purposes.
