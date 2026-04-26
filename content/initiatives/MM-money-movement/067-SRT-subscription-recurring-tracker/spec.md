---
title: "Feature Specification: Subscription & Recurring Payment Tracker"
---

# Feature Specification: Subscription & Recurring Payment Tracker

**Feature Branch**: `067-subscription-tracker`
**Created**: 2026-03-22
**Status**: Draft
**Epic**: 067-SRT

---

## Overview

Users import bank transactions via Basiq feeds or manual CSV, yet recurring payments -- subscriptions, memberships, insurance premiums, loan repayments -- remain invisible within the transaction stream. This feature analyses historical bank transactions to detect recurring payment patterns, maintains a subscription registry for confirmed recurring payments, surfaces spending insights and change alerts, and feeds known obligations into cash flow forecasting.

**Primary audience**: Personal ledger users (030-PLG) managing household subscriptions and recurring costs.
**Secondary audience**: Small business owners tracking SaaS tools, insurance, and fixed operational costs.

---

## Out of Scope

The following are explicitly excluded from this epic:

- **Income/inflow pattern detection** -- The detection engine analyses outflows (debit transactions) only. Detecting recurring income (salary, dividends, rental) is a natural Phase 2 extension but is not part of this epic.
- **Budget limits or spending caps** -- This is a subscription *tracker*, not a budget planner. Category-level spending limits belong in a separate budgeting enhancement.
- **Automated cancellation** -- The system tracks and alerts; it does not cancel services on the user's behalf.
- **External subscription management APIs** -- No integration with Truebill/Rocket Money-style cancellation services.
- **Community/shared merchant databases** -- MerchantProfile is system-seeded reference data only. User-contributed merchant mappings are a future enhancement.
- **Bill negotiation or rate comparison** -- Comparing provider rates or suggesting cheaper alternatives is out of scope.

---

## User Scenarios & Testing

### User Story 1 - View Detected Subscription Suggestions (Priority: P1)

As a user reviewing my bank transactions, I want the system to identify recurring payment patterns and present them as subscription suggestions so that I can quickly build a complete picture of my recurring commitments without manually searching through transaction history.

**Why this priority**: This is the foundational capability. Without detection, users must manually add every subscription. Automated detection delivers the core "aha moment" that makes the feature valuable.

**Independent Test**: Can be tested by importing 6+ months of bank transactions and verifying that the detection engine surfaces known recurring charges as suggestions with correct merchant, amount, and frequency.

**Acceptance Scenarios**:

1. **Given** I have at least 3 months of imported bank transactions containing recurring charges (e.g. Netflix monthly on the 15th), **When** I open the Subscriptions page for the first time, **Then** I see a "Detected Subscriptions" section listing each suggested subscription with: merchant name, average amount, detected frequency, number of matching transactions, and a confidence indicator (high/medium/low).

2. **Given** the detection engine has identified a recurring charge from "SPOTIFY PREMIUM" appearing monthly at $13.99, **When** I view the suggestion, **Then** I see the merchant name normalised to "Spotify Premium" (cleaned of raw bank description noise), the amount shown as $13.99/month, frequency as "Monthly", and a confidence badge of "High".

3. **Given** the detection engine has found a charge that appears quarterly with varying amounts (e.g. electricity bill ranging $180-$240), **When** I view the suggestion, **Then** the amount shows as a range ($180-$240/quarter), the frequency shows "Quarterly", and the confidence badge shows "Medium" to reflect the variable amount.

4. **Given** I have fewer than 3 months of transaction history for a particular bank account, **When** the detection engine runs, **Then** no suggestions are generated for that account and a message explains that more transaction history is needed for accurate detection.

5. **Given** the detection engine has surfaced 8 suggestions, **When** I dismiss a suggestion by clicking "Not a subscription", **Then** that suggestion is removed from the list, the underlying transactions are excluded from future detection runs for that merchant across all bank accounts in the workspace, and the remaining suggestions are unchanged.

---

### User Story 2 - Confirm and Add Subscriptions to Registry (Priority: P1)

As a user reviewing detected subscriptions, I want to confirm suggestions and have them added to my subscription registry so that I can build an accurate, maintained list of all my recurring payments.

**Why this priority**: Detection without a registry to store confirmed subscriptions provides no lasting value. Confirmation is the bridge between automated suggestion and managed tracking.

**Independent Test**: Can be tested by confirming a detected suggestion and verifying it appears in the subscription registry with all expected fields populated, linked to historical transactions.

**Acceptance Scenarios**:

1. **Given** I see a detected subscription suggestion for "Netflix" at $22.99/month, **When** I click "Confirm", **Then** a new subscription record is created in my registry with provider name "Netflix", amount $22.99, frequency "Monthly", status "Active", and all matching historical bank transactions are linked to this subscription.

2. **Given** I confirm a subscription, **When** I view the subscription detail, **Then** I see: provider name, category (auto-suggested, editable), amount, frequency, next expected charge date (calculated from the most recent transaction + frequency), status, linked bank account, and a timeline of all linked historical transactions.

3. **Given** I want to track a subscription the system did not detect (e.g. an annual insurance premium paid by direct debit), **When** I click "Add Subscription" and fill in the provider name, amount, frequency, and start date, **Then** the subscription is created in my registry with status "Active" and the system attempts to match existing bank transactions to it retroactively.

4. **Given** I have confirmed 5 subscriptions, **When** I view the Subscriptions page, **Then** I see a registry list showing all confirmed subscriptions sorted by next expected charge date, with each row displaying: provider name/logo, category, amount, frequency, next charge date, and status badge.

5. **Given** I confirm a subscription for a merchant that already exists in my Contacts (006-CCM), **When** the subscription is created, **Then** the subscription is linked to the existing Contact record so that I can see the contact's subscription alongside their invoices and bills.

---

### User Story 3 - View Subscription Spending Dashboard (Priority: P1)

As a user managing my subscriptions, I want to see a summary dashboard showing my total recurring spend, breakdown by category, and spending trends so that I can understand the full cost of my subscriptions at a glance.

**Why this priority**: The dashboard is the daily-use surface. Users open it to answer "How much am I spending on subscriptions?" -- the question that drives engagement and the one that justifies the feature's existence.

**Independent Test**: Can be tested with 5+ confirmed subscriptions across different categories and verifying the dashboard displays correct totals, category breakdown, and trend data.

**Acceptance Scenarios**:

1. **Given** I have 12 active subscriptions totalling $487/month, **When** I view the Subscriptions dashboard, **Then** I see a total monthly spend figure of $487, a total annual projection of $5,844, and the count of active subscriptions (12).

2. **Given** my subscriptions include 4 entertainment ($89/mo), 3 utilities ($210/mo), 3 SaaS tools ($65/mo), and 2 insurance ($123/mo), **When** I view the category breakdown, **Then** I see each category with its total spend, percentage of total, and count of subscriptions, sorted by spend descending.

3. **Given** I have 6 months of subscription payment history, **When** I view the spending trend chart, **Then** I see a monthly bar or line chart showing total subscription spend per month for the last 6 months, with the current month's projection based on active subscriptions.

4. **Given** I have subscriptions in both AUD and USD (multi-currency enabled), **When** I view the dashboard, **Then** all amounts are converted to my workspace's base currency using the latest available exchange rate for the totals, with the original currency shown alongside each subscription in the registry list.

---

### User Story 4 - Receive Price Change Alerts (Priority: P1)

As a user tracking subscriptions, I want to be alerted when a subscription's charge amount changes so that I can investigate whether it is a legitimate price increase, an error, or an unauthorised charge.

**Why this priority**: Price increase detection is the feature's strongest differentiator from manual tracking. Users cite "catching a sneaky price hike" as the number one reason to use subscription trackers. Without alerts, the tracker is a passive list.

**Independent Test**: Can be tested by importing a bank transaction with an amount different from the subscription's expected amount and verifying the alert is created with correct old/new amounts and percentage change.

**Acceptance Scenarios**:

1. **Given** my "Netflix" subscription is registered at $16.99/month, **When** a new bank transaction is imported for Netflix at $22.99, **Then** a price change alert is created showing: subscription name, old amount ($16.99), new amount ($22.99), change (+$6.00 / +35.3%), and the transaction date.

2. **Given** a price change alert has been created, **When** I view my alerts feed, **Then** the alert appears with severity "Warning" and I can either "Acknowledge" (updates the subscription's expected amount to $22.99) or "Flag for Review" (keeps the alert open and does not update the expected amount).

3. **Given** my electricity subscription is registered as variable-amount ($180-$240 range), **When** a charge of $225 arrives within the expected range, **Then** no alert is generated. **When** a charge of $310 arrives outside the range, **Then** a price change alert is created noting the charge exceeds the expected range.

4. **Given** a subscription has a price change alert that I acknowledge, **When** I view the subscription's transaction timeline, **Then** the specific transaction that triggered the price change is visually marked, and the subscription's recorded amount is updated from that date forward.

---

### User Story 5 - Detect Post-Cancellation Charges (Priority: P2)

As a user who has cancelled a subscription, I want to be alerted if charges continue appearing after the cancellation date so that I can dispute the charge with the provider or my bank.

**Why this priority**: Post-cancellation charge detection prevents real financial loss. It is ranked P2 because it requires the user to first mark a subscription as cancelled (dependent on registry functionality from US2), and the frequency of this scenario is lower than price changes.

**Independent Test**: Can be tested by marking a subscription as "Cancelled" with an effective date, then importing a bank transaction from that merchant after the cancellation date, and verifying an alert is raised.

**Acceptance Scenarios**:

1. **Given** I have marked my "Gym Membership" subscription as "Cancelled" with effective date 2026-03-01, **When** a bank transaction from "GYM MEMBERSHIP DIRECT DEBIT" is imported with a date of 2026-03-15, **Then** a post-cancellation charge alert is created with severity "Critical", showing the subscription name, cancellation date, charge amount, and charge date.

2. **Given** a post-cancellation alert exists, **When** I view it, **Then** I see options to "Dispute" (which marks the alert as actioned and records the dispute date) or "Dismiss" (if the charge was legitimate, e.g. a final billing period).

3. **Given** I cancel a subscription with a frequency of "Annual" and the last charge was 10 months ago, **When** a charge arrives 2 months later (at the annual renewal date), **Then** the system correctly identifies this as a post-cancellation charge rather than a legitimate renewal.

---

### User Story 6 - Track Subscription Lifecycle (Priority: P2)

As a user managing subscriptions, I want to pause, cancel, and archive subscriptions with a clear status history so that I can manage the full lifecycle of each subscription and maintain a historical record.

**Why this priority**: Lifecycle management makes the registry useful long-term. Without it, cancelled subscriptions clutter the active view and there is no historical audit trail.

**Independent Test**: Can be tested by transitioning a subscription through active, paused, cancelled, and archived states and verifying each transition updates the status, records the timestamp, and adjusts the subscription's visibility in the registry.

**Acceptance Scenarios**:

1. **Given** an active subscription for "Spotify", **When** I click "Pause", **Then** the status changes to "Paused", the next expected charge date is cleared, and the subscription moves to a "Paused" section in the registry. No alerts are generated for missed charges while paused.

2. **Given** a paused subscription, **When** I click "Resume", **Then** the status returns to "Active", the next expected charge date is recalculated from today based on the original frequency (no backfill of missed periods), and the subscription returns to the active registry.

3. **Given** an active or paused subscription, **When** I click "Cancel" and provide a cancellation effective date, **Then** the status changes to "Cancelled", post-cancellation charge monitoring begins from the effective date, and the subscription moves to a "Cancelled" section. The subscription remains visible for 90 days after the last post-cancellation alert is resolved (or 90 days from cancellation if no alerts), then auto-archives.

4. **Given** a cancelled subscription older than 90 days with no open post-cancellation alerts, **When** the system runs its daily maintenance, **Then** the subscription status changes to "Archived" and it moves to the archived view, preserving the full transaction history and status change timeline. If a post-cancellation alert is detected during the 90-day window, the auto-archive timer resets from the date the alert is resolved.

5. **Given** I view a subscription's detail page, **When** I scroll to the "History" section, **Then** I see a chronological timeline of all status changes (created, paused, resumed, cancelled, archived) with timestamps and the user who made each change.

---

### User Story 7 - Feed Subscriptions into Cash Flow Forecast (Priority: P2)

As a user running cash flow forecasts, I want my confirmed subscriptions to automatically appear as predictable recurring outflows in the forecast so that my cash position projections are more accurate without manual data entry.

**Why this priority**: Integration with cash flow forecasting (041-CFF) delivers compounding value -- the subscription tracker becomes more useful because it improves forecasts, and forecasts become more useful because they include real subscription data. P2 because it depends on both the registry (US2) and the existing forecasting module.

**Independent Test**: Can be tested by confirming 3+ subscriptions and generating a cash flow forecast, then verifying the forecast includes line items for each subscription at the expected dates and amounts.

**Acceptance Scenarios**:

1. **Given** I have 5 active subscriptions in my registry, **When** I generate a new cash flow forecast, **Then** the forecast includes a line item for each subscription at its next expected charge date, with source type "Subscription" and the subscription's expected amount.

2. **Given** my Netflix subscription is $22.99/month with next charge on April 15, **When** I generate a 12-week forecast starting April 1, **Then** I see Netflix charges on April 15, May 15, and June 15, each for $22.99, each marked as a "Subscription" source with high confidence.

3. **Given** I have a variable-amount subscription (electricity, $180-$240/quarter), **When** the forecast includes this subscription, **Then** the forecast uses the average amount ($210) with a moderate confidence indicator, and the tooltip explains the amount is based on historical average.

4. **Given** I cancel a subscription on the registry, **When** I regenerate the cash flow forecast, **Then** the cancelled subscription no longer appears in future forecast periods.

---

### User Story 8 - Manage Subscription Categories (Priority: P2)

As a user organising my subscriptions, I want to assign and manage categories for my subscriptions so that I can see spending breakdowns by type and quickly identify where my recurring money goes.

**Why this priority**: Categories enable the spending breakdown dashboard (US3) and give users a familiar organisational structure. P2 because the dashboard can show an "Uncategorised" fallback without categories, but is significantly more useful with them.

**Independent Test**: Can be tested by creating custom categories, assigning subscriptions to them, and verifying the category breakdown in the dashboard reflects the assignments correctly.

**Acceptance Scenarios**:

1. **Given** the system provides default categories (Entertainment, Utilities, Insurance, Loans & Repayments, SaaS & Software, Health & Fitness, News & Media, Education, Food & Delivery, Other), **When** I confirm a new subscription, **Then** the system auto-suggests a category based on the merchant name (e.g. "Netflix" suggests "Entertainment") and I can accept or change it.

2. **Given** I want a category that does not exist in the defaults (e.g. "Kids Activities"), **When** I create a custom category with a name and optional colour, **Then** the category appears in all category selection dropdowns and is available for the spending breakdown.

3. **Given** I reassign a subscription from "Other" to "Entertainment", **When** I view the spending dashboard, **Then** the category breakdown immediately reflects the change with updated totals.

---

### User Story 9 - Receive Renewal and Trial Expiry Reminders (Priority: P3)

As a user with annual subscriptions and free trials, I want advance reminders before renewal dates and trial expiry dates so that I can decide whether to continue or cancel before being charged.

**Why this priority**: Renewal reminders are valuable but depend on users proactively entering renewal/trial dates. The core detection engine cannot determine trial vs paid status from bank transactions alone. P3 because it requires manual input for most scenarios.

**Independent Test**: Can be tested by setting a renewal reminder date on a subscription and verifying a notification is created the configured number of days before the date.

**Acceptance Scenarios**:

1. **Given** I add a subscription with an annual renewal date of 2026-12-01 and a reminder preference of 14 days, **When** the date reaches 2026-11-17, **Then** I receive an in-app notification: "Annual renewal for [Provider] in 14 days -- $[amount]".

2. **Given** I add a free trial subscription with a trial end date of 2026-04-15, **When** the date reaches 3 days before (2026-04-12), **Then** I receive a notification: "Free trial for [Provider] ends in 3 days. Cancel before [date] to avoid being charged."

3. **Given** I do not set a renewal or trial date on a subscription, **When** the subscription operates normally, **Then** no renewal or trial reminders are sent -- only the standard price change and post-cancellation alerts apply.

---

### User Story 10 - Identify Forgotten and Unused Subscriptions (Priority: P3)

As a user reviewing my spending, I want the system to flag subscriptions I may have forgotten about or no longer use so that I can cancel them and save money.

**Why this priority**: "Forgotten subscription" detection is a marketing headline feature but technically simpler than price change detection. P3 because it is primarily a nudge/suggestion rather than a critical alerting mechanism.

**Independent Test**: Can be tested by having a low-cost subscription ($2.99/month) that was confirmed 6+ months ago with no user interaction (no views, no edits), and verifying the system flags it for review.

**Acceptance Scenarios**:

1. **Given** a subscription has been active for 6+ months and I have not viewed or interacted with the subscription record in the last 90 days, **When** the forgotten subscription check runs, **Then** a "Review Suggested" alert is created: "You haven't reviewed [Provider] ($[amount]/[frequency]) in 90 days. Still need it?"

2. **Given** the forgotten subscription alert is shown, **When** I click "Keep", **Then** the alert is dismissed and the 90-day inactivity clock resets. **When** I click "Review", **Then** I am taken to the subscription detail page.

3. **Given** I have 3 subscriptions under $5/month that are each over 6 months old, **When** the forgotten subscription check runs, **Then** the alerts are grouped in the dashboard as "Small charges to review -- $[total]/month across [count] subscriptions".

---

### Edge Cases

- **What happens when the same merchant charges different amounts for different services?** (e.g. "GOOGLE" for both Google One at $4.49 and YouTube Premium at $22.99) -- The detection engine treats each distinct amount/frequency combination as a separate subscription suggestion. Users can merge or split suggestions during confirmation.

- **What happens when a subscription charge date shifts by 1-3 days between months?** (e.g. Netflix charges on the 14th, then 15th, then 13th) -- The detection engine uses a date tolerance window of +/- 5 days from the expected date when matching transactions to existing subscriptions. The next expected date is recalculated from the most recent actual charge date.

- **What happens when a user has the same subscription across multiple bank accounts?** -- Each bank account is analysed independently. If the same merchant appears across accounts, the system flags this as a potential duplicate during detection and asks the user to confirm which account is the active one.

- **What happens when a subscription payment fails and is retried?** -- Failed/reversed transactions (identifiable by matching debit + credit on the same day from the same merchant) are excluded from subscription detection and do not trigger alerts.

- **What happens when a merchant is acquired and the bank description changes?** (e.g. "STAN STREAMING" becomes "PARAMOUNT+ AU") -- The system cannot automatically detect merchant name changes. The user must manually update the subscription or confirm a new detection suggestion and archive the old one. Future: a community-maintained merchant alias database.

- **What happens when a subscription amount includes variable tax or currency conversion fees?** -- For fixed-amount subscriptions, a price change alert fires when a charge differs by more than $0.50 or 5% (whichever is greater). For variable-amount subscriptions, the expected range is mean +/- 1 standard deviation of linked transaction amounts; charges outside that range trigger an alert.

- **How does multi-currency work?** -- Subscriptions track the original charge currency from the bank transaction. Dashboard totals convert to the workspace base currency using the latest available exchange rate. Individual linked transactions display the amount converted at the exchange rate from the transaction date. The subscription detail shows both original and converted amounts.

- **What happens during initial setup with years of transaction history?** -- The detection engine processes the most recent 12 months of transactions by default. Users can trigger a full history scan, but the system caps at 24 months to limit processing time. Detection runs asynchronously and notifies the user when complete.

- **What happens when a bank account is deactivated or disconnected?** -- Linked subscriptions retain all data but the "linked bank account" field shows an inactive indicator. Subscriptions are NOT automatically cancelled -- the user may reconnect the account or the subscription may charge to a different account. Detection stops for inactive bank accounts. No data is deleted.

- **What happens when two bank feed syncs complete simultaneously for the same workspace?** -- Detection scans use a workspace-level lock. If a detection scan is already running, subsequent triggers are queued and processed after the current scan completes. This prevents duplicate subscription suggestions.

---

## Requirements

### Functional Requirements -- Detection Engine

- **FR-001**: System MUST analyse bank transactions with `direction = Debit` (outflows only) within a workspace to identify recurring payment patterns by grouping transactions with matching merchant names, similar amounts, and regular time intervals.
- **FR-002**: System MUST resolve the merchant identity for each transaction using a fallback chain: (1) use the `merchant_name` field if populated by the bank feed provider, (2) if null, normalise the `description` field by trimming whitespace, converting to title case, removing common suffixes (Pty Ltd, Inc, LLC, AU, Com), and stripping transaction reference numbers.
- **FR-003**: System MUST support fuzzy merchant matching with a configurable similarity threshold (default 85%) to consolidate merchant name variants (e.g. "NETFLIX.COM", "Netflix Inc", "NETFLIX AU") into a single merchant identity.
- **FR-004**: System MUST detect the following charge frequencies: weekly (6-8 day intervals), fortnightly (12-16 day intervals), monthly (27-34 day intervals), quarterly (85-100 day intervals), semi-annual (170-200 day intervals), and annual (350-380 day intervals).
- **FR-005**: System MUST classify each detected subscription with a confidence score: High (5+ consistent charges, fixed amount, regular interval), Medium (3-4 charges or variable amount within 10% tolerance), Low (2-3 charges with irregular timing or amount variance above 10%).
- **FR-006**: System MUST require a minimum of 3 matching transactions before suggesting a subscription (2 transactions establish a pattern, 3 confirm it).
- **FR-007**: System MUST exclude one-time purchases that happen to recur (e.g. two Amazon purchases a month apart) by requiring at least 3 occurrences within the detection window and consistent timing.
- **FR-008**: System MUST process detection asynchronously and notify the user when detection is complete, analysing the most recent 12 months of transactions by default.
- **FR-009**: System MUST allow users to trigger a manual re-detection scan at any time, processing only transactions imported since the last scan.
- **FR-010**: System MUST exclude transactions that have been dismissed by the user for a specific normalised merchant name from future detection runs for that merchant. Dismissals are scoped to the workspace (apply across all bank accounts).
- **FR-041**: System MUST automatically trigger an incremental detection scan after each successful bank feed sync, processing only the newly imported transactions. This runs via a listener on the bank feed sync completion event.

### Functional Requirements -- Subscription Registry

- **FR-011**: System MUST maintain a subscription registry per workspace containing: provider name, display name, category, expected amount as integer cents (fixed or min/max range for variable amounts), charge currency, frequency, next expected charge date, status, linked bank account, linked contact, and creation source (detected or manual).
- **FR-012**: System MUST support the following subscription statuses with valid transitions: Active (initial) -> Paused -> Active (resume), Active -> Cancelled -> Archived, Paused -> Cancelled -> Archived. Archived is a terminal state.
- **FR-013**: System MUST auto-link new bank transactions to confirmed subscriptions when the merchant name matches (using the same fuzzy matching as detection), the transaction direction is Debit, and the transaction date falls within +/- 5 days of the expected charge date.
- **FR-014**: System MUST calculate and update the next expected charge date after each linked transaction by adding the subscription's frequency interval to the actual transaction date.
- **FR-015**: System MUST allow users to manually create subscriptions by providing: provider name, amount, frequency, and start date, and optionally: category, linked bank account, and renewal date.
- **FR-016**: System MUST support variable-amount subscriptions by storing an expected amount range (minimum and maximum in integer cents) calculated as the mean +/- 1 standard deviation of linked transaction amounts.
- **FR-017**: System MUST record a status change history for each subscription, capturing: old status, new status, changed-by user, timestamp, and optional reason.
- **FR-018**: System MUST auto-archive cancelled subscriptions after 90 days if no post-cancellation charges have been detected. If a post-cancellation alert is detected during the 90-day window, the auto-archive timer resets from the date the alert is resolved (acknowledged or dismissed).

### Functional Requirements -- Alerts and Insights

- **FR-019**: System MUST generate a "Price Change" alert when a linked transaction amount differs from the subscription's expected amount. For fixed-amount subscriptions, the tolerance is $0.50 or 5%, whichever is greater. For variable-amount subscriptions, the alert fires when a charge falls outside the stored min/max range (mean +/- 1 standard deviation).
- **FR-020**: System MUST generate a "Post-Cancellation Charge" alert with "Critical" severity when a transaction matches a cancelled subscription's merchant after the cancellation effective date.
- **FR-021**: System MUST generate a "Forgotten Subscription" suggestion when a subscription has been active for 6+ months with no user interaction (view, edit, or acknowledgement) in the last 90 days.
- **FR-022**: System MUST generate renewal reminder notifications at the user-configured number of days before the subscription's renewal date (default: 14 days for annual, 3 days for trials).
- **FR-023**: System MUST calculate total monthly and annual recurring spend across all active subscriptions, converting multi-currency amounts to the workspace base currency using the latest available exchange rate.
- **FR-024**: System MUST calculate spending breakdowns by category, showing total spend, percentage of total, and subscription count per category.
- **FR-025**: System MUST track monthly subscription spend over time (rolling 12 months) to display spending trend data.
- **FR-026**: System MUST deliver alerts through the existing in-app notification system (024-NTF). Each SubscriptionAlert creates a corresponding Notification record via the CreateNotification action, using the SubscriptionAlert as the morph subject. New NotificationType enum cases are required: `subscription_price_change`, `subscription_post_cancellation`, `subscription_forgotten`, `subscription_renewal_reminder`. These map to a "Subscriptions" filter category.

### Functional Requirements -- Cash Flow Integration

- **FR-027**: System MUST add a `Subscription` case to the existing `ForecastSourceType` enum (alongside Invoice, Bill, Recurring, Predicted) and generate ForecastItem records for each active subscription when a cash flow forecast is created via the GenerateForecast action.
- **FR-028**: System MUST project subscription charges for the forecast period by repeating the subscription's expected amount at its frequency interval, starting from the next expected charge date. All subscriptions generate outflow (`ForecastDirection::Outflow`) items.
- **FR-029**: System MUST assign confidence to subscription forecast items: 90% (`confidence_pct = 90`) for fixed-amount subscriptions, 70% (`confidence_pct = 70`) for variable-amount subscriptions (using the historical average as the projected amount).
- **FR-030**: System MUST exclude paused and cancelled subscriptions from forecast generation.

### Functional Requirements -- User Interface

- **FR-031**: System MUST provide a subscription dashboard page showing: total spend summary (monthly/annual), active subscription count, category breakdown, spending trend chart, and a link to the full registry.
- **FR-032**: System MUST provide a subscription registry list view with filtering by: status (active, paused, cancelled, archived), category, frequency, and bank account. The list MUST be sortable by: next charge date, amount, provider name, and date added.
- **FR-033**: System MUST provide a subscription detail page showing: provider information, amount and frequency, linked transactions timeline, status history, alerts, and associated contact.
- **FR-034**: System MUST provide a detection review page showing pending subscription suggestions with options to confirm, dismiss, or edit each suggestion before adding to the registry.
- **FR-035**: System MUST display subscription-related alerts in the existing alerts/notification feed alongside other notification types.
- **FR-036**: System MUST support keyboard shortcuts consistent with the application's shortcut system: `G then U` to navigate to Subscriptions (added to both `primaryNav` and `personalNav` in navigation config), `N` to add a new subscription on the registry page. Note: `G then U` was previously unassigned in the chord shortcuts map.

### Functional Requirements -- Integrations

- **FR-037**: System MUST link subscriptions to existing Contact records (006-CCM) when a matching contact exists, using merchant name matching against contact name and display name.
- **FR-038**: System MUST complement (not duplicate) anomaly detection (040-AND). When the anomaly detection engine evaluates a bank transaction, it MUST check whether the transaction matches an active subscription's expected merchant and amount range. If it does, the anomaly flag severity is downgraded or the flag is auto-dismissed. Unexpected subscription charges (price change, post-cancellation) generate both a subscription alert and an anomaly flag.
- **FR-039**: System MUST update the personal ledger (030-PLG) net worth calculation to include total subscription obligations as a known recurring liability when calculating projected expenses.

### Functional Requirements -- Access Control

- **FR-040**: System MUST be gated by a `subscription_tracker` feature flag (registered in FeatureRegistry as an `advanced` category feature, defaulting to `false`). The feature requires `bank_feeds` to be enabled.
- **FR-042**: System MUST enforce the following permissions (singular form per project convention): `subscription.view`, `subscription.create`, `subscription.update`, `subscription.delete`. Owner and accountant roles receive all four. Bookkeeper receives view, create, and update. Approver and auditor receive view only. Client receives view only.

### Non-Functional Requirements

- **NFR-001**: The detection engine MUST process 12 months of transaction history (up to 10,000 transactions per bank account) within 30 seconds.
- **NFR-002**: The detection engine MUST achieve a minimum precision of 85% (no more than 15% false positives) as measured against user confirmation/dismissal rates over the first 90 days.
- **NFR-003**: The subscription dashboard MUST load within 2 seconds for workspaces with up to 50 active subscriptions.
- **NFR-004**: Detection scans for newly imported transactions (incremental) MUST complete within 5 seconds per bank account.
- **NFR-005**: All subscription data MUST be scoped to the workspace (multi-tenant isolation). No cross-workspace data leakage in detection, alerts, or merchant matching.
- **NFR-006**: The merchant alias/normalisation database MUST NOT share user-specific transaction data across workspaces. Shared merchant name mappings are system-level reference data only.
- **NFR-007**: Alert generation MUST be near-real-time: alerts for price changes and post-cancellation charges MUST appear within 60 seconds of the triggering bank transaction import.
- **NFR-008**: Detection scans MUST use a workspace-level lock (mutex) to prevent concurrent scans from creating duplicate subscription suggestions. Concurrent triggers are queued and processed sequentially.

---

### Key Entities

- **Subscription**: The core record representing a confirmed recurring payment. Belongs to a workspace. Tracks provider name, display name, category_id (FK to SubscriptionCategory), expected amount as integer cents (or amount_min/amount_max for variable amounts), currency, frequency, next expected charge date, status (active/paused/cancelled/archived), bank_account_id, contact_id, creation source (detected/manual), renewal date, trial end date, reminder days, cancellation effective date, and last_interacted_at (for forgotten subscription detection). Has many linked bank transactions (via `subscription_bank_transaction` pivot table) and status change records. Registered in `Relation::morphMap()` as `'subscription'`.

- **SubscriptionBankTransaction** (pivot): A join table linking subscriptions to bank transactions. Columns: `subscription_id`, `bank_transaction_id`, `linked_at` (timestamp). Keeps the BankTransaction model clean and respects feature flag boundaries -- no FK column is added to the bank_transactions table.

- **SubscriptionDetection**: A pending suggestion generated by the detection engine that has not yet been confirmed or dismissed. Tracks the workspace, normalised merchant name, raw merchant names encountered (JSON array), detected frequency, average amount (integer cents), amount variance (integer cents), confidence score (high/medium/low), number of matching transactions, date range of matches, bank_account_id, and user decision (pending/confirmed/dismissed). Confirmed detections become Subscription records. Dismissed detections prevent future suggestions for the same normalised merchant name workspace-wide.

- **SubscriptionCategory**: A lookup table of subscription categories per workspace. Provides default system categories (Entertainment, Utilities, Insurance, etc.) plus user-created custom categories. Each category has a name, colour (hex), icon identifier, sort order, and is_system flag. System defaults cannot be deleted but can be hidden.

- **SubscriptionStatusChange**: An audit record capturing each status transition of a subscription. Tracks subscription_id, old status, new status, changed_by (user ID), timestamp, and optional reason. Provides the "History" timeline on the subscription detail page.

- **SubscriptionAlert**: An alert record for subscription-related events (price change, post-cancellation charge, forgotten subscription, renewal reminder). Tracks subscription_id, alert type, severity (info/warning/critical), details (JSON: old_amount, new_amount, triggering_bank_transaction_id, etc.), status (open/acknowledged/dismissed), actioned_at, and timestamps. When created, a corresponding Notification record is also created via CreateNotification with the SubscriptionAlert as the morph subject. The SubscriptionAlert tracks domain-specific resolution (acknowledge updates subscription amount; dispute records action), while the Notification handles read/dismissed state in the feed. Registered in `Relation::morphMap()` as `'subscription_alert'`.

- **MerchantProfile**: A system-level reference record (NOT workspace-scoped) mapping raw bank transaction merchant names to normalised display names, logos, website URLs, and default category suggestions. Shared across all workspaces as reference data (no user-specific information). Seeded with common merchants and enriched over time.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can see all detected subscription suggestions within 60 seconds of opening the Subscriptions page for the first time (after detection completes).
- **SC-002**: 80% of users confirm at least 3 subscription suggestions within their first session, indicating detection quality meets expectations.
- **SC-003**: Users can answer "How much do I spend on subscriptions per month?" in under 10 seconds from the dashboard.
- **SC-004**: Price change alerts are generated within 60 seconds of the triggering bank transaction import, with zero false negatives for changes exceeding 5%.
- **SC-005**: Post-cancellation charge alerts achieve 100% detection rate (no missed charges after a subscription is marked cancelled).
- **SC-006**: Cash flow forecasts that include subscription data achieve 15% better accuracy for recurring outflow predictions compared to forecasts without subscription data (measured by comparing forecast vs actual over 3 months).
- **SC-007**: Users who actively use subscription tracking view the Subscriptions page at least 2 times per week on average, indicating the dashboard drives regular engagement.
- **SC-008**: The subscription registry supports 200 subscriptions per workspace without performance degradation on the dashboard or registry list.

---

## Dependencies & Integration Map

| System | Epic | Integration Point |
|--------|------|-------------------|
| Bank Feeds & Reconciliation | 004-BFR | Source data: BankTransaction model provides transactions for detection. Detection triggers automatically on bank feed sync completion. Only `direction = Debit` transactions are analysed. |
| Anomaly Detection | 040-AND | Complementary: anomaly detection checks active subscriptions before flagging; expected charges are downgraded/dismissed. Unexpected subscription charges generate both alert types. |
| Cash Flow Forecasting | 041-CFF | Outbound: adds `Subscription` case to ForecastSourceType enum. GenerateForecast action includes a new `getSubscriptionItems()` method alongside existing invoice/bill/recurring/predicted methods. |
| Personal Ledger | 030-PLG | Enrichment: subscription totals feed into projected expense calculations for net worth. |
| Contacts & Client Management | 006-CCM | Linking: subscriptions auto-link to Contact records by merchant name match against contact name and display_name fields. |
| In-App Notifications | 024-NTF | Delivery: subscription alerts create Notification records via CreateNotification. Four new NotificationType enum cases added under a "Subscriptions" filter category. |
| Multi-Currency | 011-MCY | Conversion: dashboard totals convert foreign currency subscriptions to workspace base currency using latest available exchange rate. |

---

## UI Wireframe Descriptions

### Subscription Dashboard (Primary View)

The dashboard is the landing page for the Subscriptions feature. Top section shows three summary cards: total monthly spend, total annual spend, and active subscription count. Below the summary, a horizontal category breakdown bar shows proportional spend by category with colour coding. A spending trend chart (line or area) shows monthly subscription spend over the trailing 12 months. Below the chart, a "Recent Alerts" section shows the 3 most recent unacknowledged alerts with quick-action buttons (acknowledge/dismiss). A prominent "Review Suggestions" banner appears at the top when unreviewed detection suggestions exist, showing the count and linking to the detection review page.

### Subscription Registry (List View)

StatusTabs at the top filter by: All, Active, Paused, Cancelled, Archived -- with counts per status. Below the tabs, a filterable and sortable data table shows all subscriptions with columns: provider name (with logo if available), category badge, amount/frequency, next charge date, status badge, and a row-level actions menu (edit, pause/resume, cancel, archive). A search bar filters by provider name. "Add Subscription" button in the top right opens the manual add form. The list paginates at 50 items with server-side pagination.

### Detection Review Page

A card-based layout showing each detected subscription suggestion. Each card shows: normalised merchant name, detected amount and frequency, number of matching transactions, confidence badge, date range of matches, and three action buttons: "Confirm" (adds to registry), "Edit & Confirm" (opens editor to adjust fields before adding), and "Not a Subscription" (dismisses). An "Accept All High Confidence" bulk action button at the top confirms all suggestions with High confidence in one click. A progress indicator shows how many suggestions have been reviewed out of the total.

### Subscription Detail Page

A split layout. Left panel shows the subscription's core information: provider name/logo, category, amount, frequency, status with history timeline, linked bank account, linked contact, and renewal/trial dates. Right panel shows a transaction timeline of all linked bank transactions in reverse chronological order, with each transaction showing date, amount, and any alerts (price change markers, post-cancellation flags). An "Alerts" tab shows all alerts for this subscription. An "Edit" button opens the subscription editor for updating any field.

### Alerts Feed

Subscription alerts appear inline in the existing notification/alert feed. Each alert card shows: alert type icon (price change, post-cancellation, forgotten, renewal), subscription provider name, alert detail text, timestamp, and action buttons specific to the alert type. Alerts are filterable by type and status (open, acknowledged, dismissed).

---

## Clarifications

### Session 2026-03-22

- Q: Should detection analyse debit-only (outflows) or both debits and credits? -> A: Debit-only in Phase 1. Income detection is Phase 2. FR-001 updated to specify `direction = Debit`.
- Q: Should subscriptions use the existing `Recurring` ForecastSourceType or add a new `Subscription` case? -> A: Add new `Subscription` case. Reusing `Recurring` would conflate source_id semantics and prevent filtering. FR-027 updated.
- Q: `G then U` keyboard shortcut is also claimed by 062-EDU Learning Hub. Which gets it? -> A: Subscriptions get `G then U` (higher-frequency daily-use feature). Learning Hub will be reassigned when built. FR-036 updated.
- Q: How do SubscriptionAlert and Notification relate? -> A: SubscriptionAlert is the domain record (tracks resolution state); Notification is the delivery mechanism (tracks read/dismissed). Creating a SubscriptionAlert also creates a Notification via CreateNotification. Same pattern as AnomalyFlag + Notification. Key Entities updated.
- Q: Do Subscription and SubscriptionAlert need morph map entries? -> A: Yes. `subscription` and `subscription_alert` registered in morphMap for notification subjects and future polymorphic use.
- Q: What permissions are needed and which roles get them? -> A: `subscription.view/create/update/delete`. Owner+accountant=all, bookkeeper=view+create+update, approver+auditor+client=view only. FR-042 added.
- Q: Should subscriptions be gated by a feature flag? -> A: Yes. `subscription_tracker` as an advanced feature (default false), requires `bank_feeds` enabled. FR-040 added.
- Q: The spec shows dollar amounts but the codebase stores integers (cents). Clarification needed? -> A: ACs describe user-visible behavior (display amounts). All stored amounts are integers (cents) per project convention. Entity descriptions updated to note "integer cents."
- Q: How does detection use the existing `merchant_name` field on BankTransaction? -> A: Fallback chain: use `merchant_name` if populated, else normalise `description`. FR-002 updated.
- Q: How are subscriptions linked to bank transactions? -> A: Via a `subscription_bank_transaction` pivot table. No FK added to BankTransaction model. Added SubscriptionBankTransaction to Key Entities.
- Q: When does detection run automatically? -> A: After each bank feed sync (listener on sync completion), processing only new transactions. Also on first Subscriptions page visit (full scan) and manually. FR-041 added.
- Q: Are merchant dismissals per-account or per-workspace? -> A: Per-workspace. Dismissing a merchant excludes it across all bank accounts. FR-010 updated.
- Q: What is explicitly out of scope? -> A: Income detection, budget limits, automated cancellation, external APIs, community merchant DB, bill negotiation. Out of Scope section added.
- Q: Where does the Subscriptions nav item appear for personal ledger users? -> A: In both `primaryNav` (business) and `personalNav` (personal). FR-036 updated.
- Q: The tolerance thresholds for variable amounts are inconsistent (10% in edge case, 5% in FR-019). Resolution? -> A: Fixed-amount subs use $0.50/5% threshold. Variable-amount subs use mean +/- 1 std dev range. FR-019 and edge case updated to align.
- Q: What happens if a post-cancellation alert is detected during the 90-day auto-archive window? -> A: Timer resets from the date the alert is resolved. US6 AC3/AC4 and FR-018 updated.
- Q: Which exchange rate is used for multi-currency dashboard totals? -> A: Latest available rate for totals/projections. Transaction-date rate for individual linked transaction displays. Edge case and US3 AC4 updated.
- Q: How does subscription tracker communicate "expected" charges to anomaly detection? -> A: At anomaly detection time, the engine checks the subscription registry for matching merchant/amount. Loosely coupled, no event-driven signal. FR-038 updated.
- Q: What about concurrent detection scans from simultaneous bank feed syncs? -> A: Workspace-level mutex lock. Concurrent triggers queue sequentially. NFR-008 and edge case added.
- Q: What happens when a bank account is deactivated? -> A: Subscriptions retain data, show inactive indicator. Not auto-cancelled. Detection stops for inactive accounts. Edge case added.
