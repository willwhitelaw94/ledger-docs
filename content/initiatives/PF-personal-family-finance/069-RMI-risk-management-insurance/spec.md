---
title: "Feature Specification: Risk Management & Insurance Register"
---

# Feature Specification: Risk Management & Insurance Register

**Feature Branch**: `069-risk-management-insurance`
**Created**: 2026-03-22
**Status**: Draft
**Input**: A risk management module with two core surfaces -- a risk register for tracking and scoring financial risks, and an insurance register for tracking policies, renewal reminders, and coverage gap analysis against assets.

---

## User Scenarios & Testing

### User Story 1 -- Record an Insurance Policy (Priority: P1)

As a business owner or personal ledger user, I want to record my insurance policies in one place so I have a complete view of my coverage and never lose track of a policy again.

**Why this priority**: The insurance register is the highest-value surface in this epic. Users gain immediate, concrete value from having their policies centralised -- no more filing cabinets or scattered spreadsheets. Every other insurance feature (renewals, gap analysis, coverage metrics) depends on policies being recorded first.

**Independent Test**: Can be fully tested by creating an insurance policy with all required fields and verifying it appears in the insurance register list with correct details.

**Acceptance Scenarios**:

1. **Given** the insurance register page, **When** I click "New Policy" and fill in the policy number, type (e.g., Building Insurance), provider name, coverage amount, annual premium, start date, and end date, **Then** the policy is saved and appears in the insurance register list with status "Active".

2. **Given** the new policy form, **When** I select a policy type of "Vehicle Insurance" and link it to an existing asset (my car), **Then** the policy is associated with that asset for coverage gap analysis.

3. **Given** an existing active policy, **When** I open its detail page, **Then** I see all policy details including coverage amount, premium, excess, payment frequency, linked asset (if any), linked contact (broker), and any attached documents.

4. **Given** the insurance register list, **Then** StatusTabs show "Active", "Pending Renewal", "Expired", and "Cancelled" with counts for each status.

5. **Given** a policy with a linked contact (insurance broker), **When** I view the policy detail, **Then** I see the broker's name as a clickable link to their contact record.

---

### User Story 2 -- Receive Insurance Renewal Reminders (Priority: P1)

As a user with active insurance policies, I want to receive reminders before my policies expire so I never accidentally let coverage lapse.

**Why this priority**: Preventing a lapsed insurance policy saves real money. This is the most tangible ROI of the insurance register -- a single prevented lapse can justify the entire feature. Without reminders, the register is just a static list.

**Independent Test**: Can be tested by creating a policy with an end date 30 days from now and verifying that reminder notifications are generated at the correct intervals.

**Acceptance Scenarios**:

1. **Given** an active policy with an end date 30 days from today, **When** the daily renewal check runs, **Then** an in-app notification is created: "Building Insurance (Policy #12345) expires in 30 days."

2. **Given** the same policy, **When** 14 days remain, **Then** a second reminder notification is sent. Further reminders are sent at 7 days and 1 day before expiry.

3. **Given** a policy that reaches its end date with auto-renew set to off, **When** the daily renewal check runs on the expiry day, **Then** the policy status changes to "Expired" and a final notification is sent: "Building Insurance has expired."

4. **Given** a policy that reaches its end date with auto-renew set to on, **When** the daily renewal check runs on the expiry day, **Then** the policy status changes to "Pending Renewal" and a notification prompts the user to confirm the renewal.

5. **Given** an expired policy, **When** I click "Renew" on the policy detail page, **Then** a new policy record is created with the same details but updated start and end dates, and the old policy remains archived for record-keeping.

---

### User Story 3 -- Identify Insurance Coverage Gaps (Priority: P1)

As a business owner or accountant, I want to see which assets are uninsured or underinsured so I can take action before a loss event occurs.

**Why this priority**: Coverage gap analysis is the killer feature that no competing platform offers. It connects accounting data (asset values) to insurance data (coverage amounts) -- something impossible in standalone insurance reminder apps. This is the primary advisory value for accountants.

**Independent Test**: Can be tested by creating assets and policies with mismatched values, then running the coverage gap analysis and verifying all three gap types are correctly identified.

**Acceptance Scenarios**:

1. **Given** a property asset valued at $600,000 with building insurance coverage of $400,000, **When** I view the coverage gap analysis, **Then** the property appears as "Underinsured" with a gap of $200,000 and a coverage ratio of 67%.

2. **Given** a vehicle asset with no linked insurance policy, **When** I view the coverage gap analysis, **Then** the vehicle appears as "Uninsured" with the full asset value shown as the coverage gap.

3. **Given** a policy that expired 15 days ago for a property that is still in service, **When** I view the coverage gap analysis, **Then** the property appears as "Lapsed Coverage" with the time since expiry shown.

4. **Given** assets where all insurable items have active policies with coverage amounts exceeding 80% of their current market value, **When** I view the coverage gap analysis, **Then** the summary shows "Adequately Covered" with no gap items listed.

5. **Given** the coverage gap analysis page, **Then** a summary banner shows: total asset value, total insured value, overall coverage ratio percentage, and the count of uninsured, underinsured, and lapsed items.

---

### User Story 4 -- Register a Risk Item (Priority: P1)

As an accountant or business owner, I want to record financial risks with structured scoring so I can systematically track and manage my risk exposure instead of relying on ad-hoc notes.

**Why this priority**: The risk register is the second core surface of this epic. It provides the structured framework for risk management that no mainstream Australian accounting platform offers. Without it, risk assessment remains informal and inconsistent.

**Independent Test**: Can be fully tested by creating a risk item with category, likelihood, impact, and mitigation notes, and verifying it appears in the risk register with the correct calculated score and level.

**Acceptance Scenarios**:

1. **Given** the risk register page, **When** I click "New Risk" and select category "Liquidity", set likelihood to "Possible" (3) and impact to "Major" (4), enter a description and mitigation plan, and set a review date, **Then** the risk is saved with a calculated score of 12 and level "High".

2. **Given** the new risk form, **When** I select category "Insurance" and link the risk to a specific asset and insurance policy, **Then** the risk item shows the linked asset and policy on its detail page.

3. **Given** the risk register list, **Then** StatusTabs show "Identified", "Assessed", "Mitigating", "Accepted", and "Closed" with counts for each status.

4. **Given** a risk item with a review date that has passed, **Then** the item is visually flagged as "Review Overdue" in the list and a notification prompts the user to review it.

5. **Given** a risk item, **When** I update the likelihood from "Possible" (3) to "Unlikely" (2), **Then** the score recalculates from 12 to 8 and the risk level changes from "High" to "Medium".

---

### User Story 5 -- View the Risk Heat Map (Priority: P2)

As an accountant preparing for a client advisory meeting, I want to see all risk items plotted on a visual heat map so I can quickly communicate the risk profile to my client.

**Why this priority**: The heat map is the universal language of risk management. It transforms a list of risk items into an intuitive visual that non-experts can understand at a glance. It is essential for advisory meetings but not required for basic risk tracking.

**Independent Test**: Can be tested by creating several risk items across different likelihood/impact combinations and verifying they appear correctly on the 5x5 matrix.

**Acceptance Scenarios**:

1. **Given** 8 risk items with varying likelihood and impact scores, **When** I view the risk heat map, **Then** each risk appears as a dot in the correct cell of the 5x5 matrix, with cells colour-coded from green (low) through amber and orange to red (critical).

2. **Given** a heat map cell containing 3 risk items, **Then** the cell shows a count badge of "3" and **When** I click the cell, **Then** a panel shows the list of risk items in that cell.

3. **Given** the heat map view, **Then** a legend explains the colour coding: green (score 1-5, Low), amber (score 6-12, Medium), orange (score 13-19, High), red (score 20-25, Critical).

---

### User Story 6 -- Review and Update Risk Items (Priority: P2)

As an accountant or business owner, I want to periodically review risk items, update their scores, and progress them through their lifecycle so my risk register stays current and actionable.

**Why this priority**: A risk register that is never updated becomes stale and loses credibility. The review workflow ensures risks are actively managed, not just recorded. This is the ongoing operational value of the register.

**Independent Test**: Can be tested by advancing a risk item through each lifecycle status and verifying the status transitions and review date updates work correctly.

**Acceptance Scenarios**:

1. **Given** a risk item in "Identified" status, **When** I review it, update the likelihood and impact scores, add mitigation notes, and click "Mark as Assessed", **Then** the status changes to "Assessed" and the review date updates to today.

2. **Given** an "Assessed" risk item, **When** I document active mitigation steps and click "Begin Mitigating", **Then** the status changes to "Mitigating".

3. **Given** a "Mitigating" risk item where the mitigation is complete, **When** I click "Accept Risk", **Then** the status changes to "Accepted" and the risk remains visible but is no longer flagged for action.

4. **Given** a risk item that is no longer relevant (e.g., the asset was sold), **When** I click "Close", **Then** the status changes to "Closed" and the item moves to the Closed tab.

5. **Given** any risk item, **When** I set the next review date to a future date, **Then** a reminder notification is generated when that date arrives.

---

### User Story 7 -- View Portfolio Concentration Analysis (Priority: P2)

As a personal ledger or investment entity user, I want to see how my assets are distributed across asset classes so I can identify over-concentration and make informed rebalancing decisions.

**Why this priority**: Concentration risk is one of the most common and actionable portfolio risks. The data already exists in the asset register -- this feature surfaces it as a risk metric with configurable thresholds. Deferred from P1 because it requires portfolio data to be meaningful.

**Independent Test**: Can be tested by setting up assets across multiple asset classes and verifying the concentration breakdown and threshold warnings display correctly.

**Acceptance Scenarios**:

1. **Given** a portfolio with assets across 4 asset classes (Property 55%, Listed Securities 25%, Cash 15%, Cryptocurrency 5%), **When** I view the portfolio risk metrics, **Then** a donut chart shows the allocation breakdown with percentages labelled for each class.

2. **Given** a portfolio where Property represents 65% of total value and the concentration threshold is set to 60%, **When** I view the portfolio risk metrics, **Then** the Property segment is highlighted with a warning: "Property concentration (65%) exceeds 60% threshold."

3. **Given** a portfolio with no assets or no asset price data, **When** I view the portfolio risk metrics, **Then** an empty state message explains that concentration analysis requires assets with current valuations.

---

### User Story 8 -- View Insurance Coverage Ratio (Priority: P2)

As a user with both assets and insurance policies, I want to see my overall insurance coverage ratio so I know at a glance whether my total coverage is adequate.

**Why this priority**: The coverage ratio is a simple but powerful metric that summarises the entire insurance position in one number. It complements the detailed gap analysis (Story 3) with a quick health indicator.

**Independent Test**: Can be tested by creating assets and policies and verifying the coverage ratio calculation and threshold colouring are correct.

**Acceptance Scenarios**:

1. **Given** total insurable asset value of $1,200,000 and total active insurance coverage of $1,000,000, **When** I view the coverage ratio, **Then** it displays "83% covered" with a green indicator (above 80% threshold).

2. **Given** total insurable asset value of $1,200,000 and total active insurance coverage of $600,000, **When** I view the coverage ratio, **Then** it displays "50% covered" with an amber indicator (between 50% and 80%) and a recommendation to review coverage.

3. **Given** total insurable asset value of $1,200,000 and total active insurance coverage of $300,000, **When** I view the coverage ratio, **Then** it displays "25% covered" with a red indicator (below 50%) and an urgent recommendation to increase coverage.

---

### User Story 9 -- Risk Summary Dashboard Widget (Priority: P3)

As a business owner, I want a dashboard widget showing my risk summary so I can monitor my risk posture at a glance without navigating to the full risk register.

**Why this priority**: Dashboard integration increases daily visibility and engagement with risk management. Lower priority because the full risk register and insurance register must exist first -- the widget is a summary view, not a primary surface.

**Independent Test**: Can be tested by adding the widget to a dashboard layout and verifying it displays correct counts, upcoming renewals, and concentration data.

**Acceptance Scenarios**:

1. **Given** the dashboard widget catalogue, **Then** a "Risk Summary" widget is available for selection.

2. **Given** the risk summary widget is on my dashboard and I have risk items across all levels, **Then** the widget shows a breakdown by risk level: Critical (2), High (3), Medium (5), Low (4), with colour-coded badges.

3. **Given** the risk summary widget, **Then** it shows the count of insurance policies expiring within 30 days and a mini donut chart of portfolio concentration by asset class.

4. **Given** the risk summary widget, **When** I click it, **Then** I am navigated to the full risk register page.

---

### User Story 10 -- Insurance Renewals Dashboard Widget (Priority: P3)

As a user with multiple insurance policies, I want a dashboard widget listing upcoming renewals so I can see at a glance which policies need attention soon.

**Why this priority**: A dedicated renewals widget surfaces time-sensitive information on the dashboard without requiring users to visit the insurance register. Lower priority because renewal notifications (Story 2) already provide proactive alerts.

**Independent Test**: Can be tested by adding the widget to a dashboard and verifying it shows policies sorted by expiry date with correct status badges.

**Acceptance Scenarios**:

1. **Given** the dashboard widget catalogue, **Then** an "Insurance Renewals" widget is available for selection.

2. **Given** the renewals widget is on my dashboard, **Then** it lists upcoming insurance renewals sorted by expiry date (nearest first), each showing the policy type, provider name, days until expiry, and a status badge.

3. **Given** the renewals widget with a policy expiring in 3 days, **Then** that policy row is highlighted with an urgent visual indicator.

4. **Given** no policies expiring within the next 90 days, **Then** the widget shows an empty state: "No upcoming renewals."

---

### Edge Cases

- **What happens when an asset is disposed but still has an active insurance policy?** The coverage gap analysis excludes disposed assets. The insurance policy remains in the register (the user may want to cancel it manually) but is not counted toward coverage ratios for in-service assets.
- **What happens when an asset's market value increases above its insurance coverage?** The coverage gap analysis detects this as an underinsured gap the next time the analysis is run. The gap analysis uses the latest available market value from asset price feeds.
- **What happens when a user creates a risk item but does not set likelihood or impact?** Both fields are required. The form validates that likelihood and impact are each between 1 and 5 before saving.
- **What happens when all risk items are closed?** The risk register shows the Closed tab as active with all items listed. The heat map displays empty (no active risks plotted). The risk summary widget shows zero counts with a positive message.
- **What happens when a workspace has no assets?** The coverage gap analysis and concentration analysis show empty states explaining that these features require assets to be registered. The risk register and insurance register still function independently.
- **What happens when an insurance policy has an end date in the past at the time of creation?** The policy is saved with status "Expired" immediately. A validation warning (not a blocker) advises the user that the policy end date is in the past.
- **What happens when a single asset has multiple insurance policies?** This is supported. For example, a property might have both building insurance and landlord insurance. The coverage gap analysis sums all active policy coverage amounts for a given asset when calculating the coverage ratio.
- **What happens when a user without delete permission tries to remove a risk item?** The delete action is not available in the UI. If attempted via the API, the system returns a "Forbidden" response.

---

## Requirements

### Functional Requirements

#### Insurance Register

- **FR-001**: System MUST allow users to create, view, update, and delete insurance policies within a workspace.
- **FR-002**: System MUST support 16 insurance policy types: Public Liability, Professional Indemnity, Business Insurance, Workers Compensation, Building Insurance, Contents Insurance, Landlord Insurance, Vehicle Insurance, Home Insurance, Health Insurance, Life Insurance, Income Protection, Total Permanent Disability, Trauma Insurance, Cyber Insurance, and Other.
- **FR-003**: System MUST track required fields for each policy: policy number, policy type, provider name, coverage amount, annual premium, start date, end date, and status.
- **FR-004**: System MUST track optional fields: linked contacts (broker and/or provider), linked assets (one or more, polymorphic across Asset and PersonalAsset), excess amount, payment frequency, auto-renew flag, `renewed_from_id` (self-referential link to previous policy), notes, and attached documents.
- **FR-005**: System MUST support four policy statuses: Active, Pending Renewal, Expired, and Cancelled.
- **FR-006**: System MUST store all monetary amounts as integers (cents), consistent with platform conventions.
- **FR-007**: System MUST allow linking an insurance policy to one or more assets (both `Asset` from 033-FAR and `PersonalAsset` from 030-PLG) via a polymorphic many-to-many relationship (`insurance_policy_asset` pivot table with `asset_type`/`asset_id` morph columns) for coverage gap analysis. *(Updated per C-03, C-12)*
- **FR-008**: System MUST allow linking an insurance policy to up to two contact records: one for the insurance broker (`broker_contact_id`) and one for the insurance provider/insurer (`provider_contact_id`). A `provider_name` free-text field provides a fallback when no provider contact exists. *(Updated per C-05)*

#### Renewal Reminders

- **FR-009**: System MUST run a daily scheduled check for policies approaching their end date.
- **FR-010**: System MUST generate in-app notifications at 30, 14, 7, and 1 day intervals before a policy's end date.
- **FR-011**: System MUST ensure each reminder interval fires only once per policy (no duplicate reminders).
- **FR-012**: System MUST automatically transition policy status to "Expired" on the end date when auto-renew is off.
- **FR-013**: System MUST automatically transition policy status to "Pending Renewal" on the end date when auto-renew is on.
- **FR-014**: System MUST support manual renewal by creating a new policy record with updated dates, linking it to the previous policy via `renewed_from_id`, while transitioning the previous policy's status to "Expired". *(Updated per C-04)*

#### Coverage Gap Analysis

- **FR-015**: System MUST detect uninsured assets across both the fixed asset register (`Asset` from 033-FAR) and personal asset register (`PersonalAsset` from 030-PLG) where the asset is tangible/physical and conventionally requires insurance (vehicles, property, equipment, furniture, plant). Financial and intangible assets are excluded by default, with a user toggle to include all asset types. *(Updated per C-12, C-13)*
- **FR-016**: System MUST detect underinsured assets -- assets where the total active insurance coverage is less than 80% of the asset's current market value.
- **FR-017**: System MUST detect lapsed coverage -- assets linked to policies that have expired, showing the time elapsed since expiry.
- **FR-018**: System MUST display a coverage gap summary showing total asset value, total insured value, overall coverage ratio, and counts of each gap type.
- **FR-019**: System MUST use the latest available market value from asset price feeds for assets with feed links, and the recorded current value for assets without feeds.

#### Risk Register

- **FR-020**: System MUST allow users to create, view, update, and delete risk items within a workspace.
- **FR-021**: System MUST support a fixed set of 7 risk categories: Investment, Market, Liquidity, Insurance, Compliance, Operational, and Credit.
- **FR-022**: System MUST use a 5x5 likelihood-impact scoring matrix where likelihood ranges from 1 (Rare) to 5 (Almost Certain) and impact ranges from 1 (Insignificant) to 5 (Catastrophic).
- **FR-023**: System MUST calculate the risk score as likelihood multiplied by impact, producing a value from 1 to 25.
- **FR-024**: System MUST assign a risk level based on the score: Low (1-5), Medium (6-12), High (13-19), Critical (20-25).
- **FR-025**: System MUST support 5 risk statuses in a defined lifecycle: Identified, Assessed, Mitigating, Accepted, and Closed.
- **FR-026**: System MUST track a description, mitigation plan (free text), and next review date for each risk item.
- **FR-027**: System MUST allow linking a risk item to a specific asset and/or insurance policy via optional references.
- **FR-028**: System MUST generate a notification when a risk item's next review date arrives or has passed.
- **FR-029**: System MUST display a 5x5 heat map visualisation showing risk items plotted by likelihood and impact, colour-coded by risk level.

#### Portfolio Risk Metrics

- **FR-030**: System MUST calculate asset class concentration as the percentage of total portfolio value held in each asset class, using existing asset valuation data.
- **FR-031**: System MUST allow users to configure a concentration threshold (default 60%) above which a warning is displayed for any single asset class.
- **FR-032**: System MUST calculate the insurance coverage ratio as total active insurance coverage divided by total insurable asset value, expressed as a percentage.
- **FR-033**: System MUST apply threshold-based colouring to the coverage ratio: green (above 80%), amber (50-80%), red (below 50%).

#### Dashboard Widgets

- **FR-034**: System MUST register a "Risk Summary" widget in the widget catalogue showing risk item counts by level, upcoming insurance renewals count, and a mini concentration chart.
- **FR-035**: System MUST register an "Insurance Renewals" widget in the widget catalogue showing upcoming policy renewals sorted by expiry date.

#### Permissions and Access

- **FR-036**: System MUST enforce 9 permissions: `risk.view`, `risk.create`, `risk.update`, `risk.delete`, `risk.review`, `insurance.view`, `insurance.create`, `insurance.update`, `insurance.delete`. *(Updated per C-01)*
- **FR-037**: System MUST grant `risk.view` and `insurance.view` to all 6 workspace roles (owner, accountant, bookkeeper, approver, auditor, client). *(Updated per C-01)*
- **FR-038**: System MUST grant `risk.create`, `risk.update`, `insurance.create`, `insurance.update` to owner, accountant, and bookkeeper roles. *(Updated per C-01)*
- **FR-039**: System MUST grant `risk.delete` and `insurance.delete` to owner and accountant roles only. *(Updated per C-01)*
- **FR-040**: System MUST grant risk.review (status transitions) to owner, accountant, and approver roles.
- **FR-041**: System MUST scope all risk and insurance data to the workspace, preventing cross-tenant data access.

#### Group-Level Views

- **FR-042**: System MUST support group-level aggregation of risk and insurance data across workspaces within a workspace group, using the existing group membership and permission model.

#### Notifications

- **FR-046**: System MUST add four `NotificationType` enum cases: `InsuranceRenewalReminder`, `InsuranceExpired`, `RiskReviewDue`, `CoverageGapDetected`, all under a "Risk & Insurance" filter category. *(Added per C-16)*
- **FR-047**: System MUST provide a daily artisan command `insurance:daily-check` scheduled at 06:30 UTC that processes renewal reminders, policy expiry transitions, coverage gap detection, and risk review date notifications. *(Added per C-17)*
- **FR-048**: Renewal reminder notifications MUST be sent to all workspace users with `insurance.view` permission. Risk review due notifications MUST be sent to all workspace users with `risk.view` permission. *(Added per C-16)*

#### Estate Planning Cross-Reference

- **FR-049**: The estate dashboard (060-WEP) SHOULD display an "Insurance Coverage" summary card showing count of active policies, total coverage amount, and count of coverage gaps, linking through to the insurance register. *(Added per C-10)*
- **FR-050**: The estate dashboard SHOULD flag missing person-protection policies (Life Insurance, Income Protection, Total Permanent Disability) when a will exists but no such active policies are recorded. Priority: P2/Sprint 3. *(Added per C-11)*

#### Navigation

- **FR-051**: System MUST add a "Risk & Insurance" top-level nav item with sub-items: Risk Register, Insurance, Coverage Analysis. Feature-gated via `risk_management` feature flag. Keyboard shortcut: `G then W`. *(Added per C-18)*
- **FR-052**: For personal ledger workspaces (entity_type = "personal"), the nav SHOULD show "Insurance" only (simplified -- no risk register entry), added to `personalNav`. *(Added per C-18)*

#### General

- **FR-043**: System MUST display all monetary values using the workspace's currency format with proper separators.
- **FR-044**: System MUST support keyboard shortcuts for navigation and creation, consistent with the application's keyboard-first conventions.
- **FR-045**: System MUST support document attachments on insurance policies via the existing polymorphic attachment system (`HasAttachments` trait, registered in morph map).

### Key Entities

- **Insurance Policy** (`insurance_policies` table): A record of an insurance contract. Tracks the policy number, type (from 16 predefined types via `InsurancePolicyType` enum), provider name (free text) and/or provider contact (`provider_contact_id`), broker contact (`broker_contact_id`), coverage amount (cents), annual premium (cents), excess (cents), start date, end date, payment frequency, auto-renew flag, status (`InsurancePolicyStatus` enum: active/pending_renewal/expired/cancelled), and `renewed_from_id` (self-referential FK for renewal chain). Assets linked via `insurance_policy_asset` polymorphic pivot table. Uses `HasAttachments` trait for document storage. Workspace-scoped via `workspace_id`.

- **Risk Item** (`risk_items` table): A recorded financial risk affecting a workspace. Categorised by `RiskCategory` enum (7 categories), scored using a 5x5 likelihood-impact matrix (score 1-25, `RiskLevel` enum for level), and progressed through a 5-status lifecycle (`RiskStatus` enum: identified/assessed/mitigating/accepted/closed). May be linked to an asset (`asset_type`/`asset_id` morph) and/or insurance policy (`insurance_policy_id` FK). Includes description, mitigation plan (text), next review date, and `reviewed_at` timestamp. Workspace-scoped via `workspace_id`.

- **Coverage Gap**: A calculated result (not stored) identifying where insurance coverage is missing or insufficient relative to asset values. Three types: uninsured (no policy), underinsured (coverage below 80% of market value), and lapsed (policy expired). Produced by analysing insurance policies against both the fixed asset register (`Asset`) and personal asset register (`PersonalAsset`), defaulting to tangible/physical assets only.

- **Portfolio Concentration**: A calculated result (not stored) showing the percentage allocation of portfolio value across asset classes (using `AssetClass` enum from 049-APF). Flags when any single asset class exceeds a configurable threshold (default 60%). Produced by aggregating `AssetFeedLink.last_value_cents` grouped by `asset_class`.

### State Transition Diagrams

#### Insurance Policy Status Transitions *(Added per C-06)*

```
Active ──────> Pending Renewal  (auto-renew on, end date reached)
Active ──────> Expired          (auto-renew off, end date reached)
Active ──────> Cancelled        (manual cancellation)
Pending Renewal ──> Expired     (renewal confirmed: new policy created, old transitions)
Expired ──────> [terminal]      (user clicks "Renew" to create NEW policy record)
Cancelled ────> [terminal]      (cannot reactivate; create new policy instead)
```

#### Risk Item Status Transitions *(Added per C-07)*

```
Identified ──> Assessed         (required: set likelihood + impact)
Assessed ────> Mitigating       (begin active mitigation)
Assessed ────> Accepted         (accept risk without mitigation)
Assessed ────> Closed           (risk no longer relevant)
Mitigating ──> Accepted         (mitigation complete)
Mitigating ──> Assessed         (re-assess risk)
Mitigating ──> Closed           (risk no longer relevant)
Accepted ───> Mitigating        (risk needs attention again)
Accepted ───> Closed            (risk retired)
Closed ─────> Identified        (reopen: resets review cycle)
```

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can create an insurance policy and view it in the register in under 90 seconds.
- **SC-002**: Renewal reminder notifications are generated within 24 hours of a policy entering a reminder window (30/14/7/1 days before expiry).
- **SC-003**: Coverage gap analysis correctly identifies 100% of uninsured, underinsured (below 80% coverage ratio), and lapsed assets in test scenarios.
- **SC-004**: Users can create a risk item, set likelihood/impact scores, and see the calculated risk level in under 60 seconds.
- **SC-005**: The risk heat map renders all active risk items in the correct cells of the 5x5 matrix with accurate colour coding.
- **SC-006**: Portfolio concentration calculation matches manually calculated percentages within 0.1% accuracy.
- **SC-007**: Insurance coverage ratio calculation matches manually calculated values within 0.1% accuracy.
- **SC-008**: No workspace can view, create, or modify risk or insurance data belonging to another workspace (tenant isolation verified by tests).
- **SC-009**: Role-based access control correctly enforces all 9 permissions -- users without permission receive a "Forbidden" response. *(Updated per C-01)*
- **SC-010**: At least 60% of workspaces with registered assets create at least one insurance policy within 60 days of feature launch.

---

## Sprint Delivery Plan

### Sprint 1 -- Insurance Register
Insurance policy CRUD, 16 policy types, 4 statuses, linked assets and contacts, document attachments, renewal reminders (30/14/7/1 day notifications), manual renewal workflow.

### Sprint 2 -- Risk Register
Risk item CRUD, 7 risk categories, 5x5 likelihood-impact matrix, 5-status lifecycle, next review date with notifications, heat map visualisation, coverage gap analysis (uninsured, underinsured, lapsed).

### Sprint 3 -- Dashboard and Metrics
Risk summary dashboard widget, insurance renewals dashboard widget, portfolio concentration analysis with configurable thresholds, insurance coverage ratio calculation, group-level aggregation.

### Deferred (Not in v1)
- AI-generated risk alerts beyond renewal reminders
- Scenario Planning Engine (068-SPE) integration
- VaR (Value at Risk) and volatility calculations
- Automatic risk item creation from anomaly detection
- Insurance premium auto-detection from bank transactions
- Insurance provider API integrations
- Composite 0-100 risk score with entity-type-specific weights
- Risk profile questionnaire
- Risk score as a sub-dimension of Entity Health Score

---

## Clarifications

### Auth & Permissions

**C-01: Should insurance permissions be split into granular CRUD (insurance.view, insurance.create, insurance.update, insurance.delete) instead of a single insurance.manage permission?**

Yes. The current spec uses a single `insurance.manage` permission, but every other domain in the codebase follows a granular pattern (e.g., `asset.view`, `asset.create`, `asset.update`, `asset.delete`; `budget.view`, `budget.create`, etc.). A single `insurance.manage` makes it impossible to grant view-only access to insurance data for auditors and clients while blocking mutations. The permission set should be expanded to: `insurance.view`, `insurance.create`, `insurance.update`, `insurance.delete`. This aligns with the existing `RolesAndPermissionsSeeder` pattern and allows auditors/clients to view policies without modifying them.

**Updated FR-036**: System MUST enforce 9 permissions: `risk.view`, `risk.create`, `risk.update`, `risk.delete`, `risk.review`, `insurance.view`, `insurance.create`, `insurance.update`, `insurance.delete`.

**Updated FR-037**: System MUST grant `risk.view` and `insurance.view` to all 6 workspace roles.

**Updated FR-038**: System MUST grant `risk.create`, `risk.update`, `insurance.create`, `insurance.update` to owner, accountant, and bookkeeper roles.

**Updated FR-039**: System MUST grant `risk.delete` and `insurance.delete` to owner and accountant roles only.

**C-02: Which roles should be able to perform the insurance renewal action (creating a new policy from an expired one)?**

The renewal action creates a new policy record. Following the codebase pattern where domain-specific state transitions get their own permission (e.g., `journal-entry.approve`, `period.close`), renewal should require `insurance.create` since it is fundamentally creating a new record. No separate `insurance.renew` permission is needed -- the `insurance.create` permission covers it. This means owner, accountant, and bookkeeper can renew; approver, auditor, and client cannot.

### Data Model Edge Cases

**C-03: Should a single insurance policy support linking to multiple assets (e.g., a fleet vehicle policy covering 5 vehicles), or only a single asset?**

Multiple assets. The spec currently says "linked asset" (singular) in FR-004 and FR-007. In practice, a single business insurance policy often covers multiple assets (e.g., a contents policy covering all office equipment, or a fleet policy). The data model should use a many-to-many pivot table (`insurance_policy_asset`) rather than a single `asset_id` foreign key. This also improves coverage gap analysis accuracy -- one policy can contribute coverage to multiple assets.

**Updated FR-007**: System MUST allow linking an insurance policy to one or more assets via a many-to-many relationship for coverage gap analysis.

**C-04: How should the system handle policy versioning when a renewal creates a new record? Should the old and new policy be linked?**

Yes, with a `renewed_from_id` self-referential foreign key on the `insurance_policies` table. When a user clicks "Renew", the new policy record stores a reference to the previous policy. The old policy's status transitions to "Expired" (if auto-renew off) or remains "Pending Renewal" until the new one is confirmed Active. This creates an audit trail of policy history for a given coverage type. The pattern follows how the estate planning module links will versions (current `WillStatus` with superseded state).

**Updated FR-014**: System MUST support manual renewal by creating a new policy record with updated dates, linking it to the previous policy via `renewed_from_id`, while transitioning the previous policy's status to "Expired".

**C-05: Should the `provider_name` on the insurance policy be a free-text field, or should it link to a Contact record (like the broker field)?**

It should support both: a `provider_contact_id` foreign key to the Contact model (optional), plus a `provider_name` text field as fallback. If a Contact is linked, `provider_name` is derived from the contact record. This is consistent with how the Asset model handles its `contact_id` for suppliers. Users who have not set up their insurer as a contact can still type the name; those who have can link for richer data (e.g., viewing all policies with a given insurer from the contact detail page).

**Updated FR-008**: System MUST allow linking an insurance policy to up to two contact records: one for the insurance broker and one for the insurance provider/insurer. A `provider_name` free-text field provides a fallback when no provider contact exists.

### State Transitions

**C-06: What are the valid status transitions for insurance policies? Can a cancelled policy be reactivated?**

Valid transitions:
- Active -> Pending Renewal (auto-renew on, end date reached)
- Active -> Expired (auto-renew off, end date reached)
- Active -> Cancelled (manual cancellation)
- Pending Renewal -> Active (renewal confirmed -- actually creates new record, old stays Pending Renewal then transitions to Expired)
- Expired -> (no transitions; user clicks "Renew" to create a new policy)
- Cancelled -> (no transitions; terminal state)

A cancelled policy cannot be reactivated. If the user wants to reinstate coverage, they create a new policy. This follows the immutability pattern used throughout the ledger (posted JEs are immutable, voided invoices are terminal).

**C-07: Can a risk item skip statuses (e.g., go directly from Identified to Accepted without passing through Assessed)?**

Yes, with restrictions. The lifecycle should enforce a minimum progression: Identified -> Assessed is required (you must score it). From Assessed, the user may go to Mitigating or directly to Accepted (choosing to accept the risk without mitigation). Any status can transition to Closed (risk no longer relevant). The "Closed" transition should require a reason/note. Backwards transitions (e.g., Accepted -> Mitigating) should be allowed for cases where a previously accepted risk needs active mitigation.

Valid transitions:
- Identified -> Assessed (required first step: set likelihood + impact)
- Assessed -> Mitigating, Assessed -> Accepted, Assessed -> Closed
- Mitigating -> Accepted, Mitigating -> Assessed (re-assess), Mitigating -> Closed
- Accepted -> Mitigating (risk needs attention again), Accepted -> Closed
- Closed -> Identified (reopen -- resets review cycle)

### Integration with Contacts

**C-08: Should the Contact model gain a new type or flag to identify insurance-related contacts (broker, insurer), or is the existing type field sufficient?**

The existing `type` field on Contact uses values `customer`, `supplier`, `both`. Insurance brokers and insurers are suppliers of services -- they fit naturally under `supplier` or `both`. No new contact type is needed. The insurance policy's `broker_contact_id` and `provider_contact_id` foreign keys provide the semantic link. The Contact detail page should show a "Policies" tab or section listing all insurance policies where this contact is the broker or provider, following the pattern of how contacts already show linked invoices and bills.

**C-09: Should the contact detail page display linked insurance policies, and if so, how?**

Yes. The Contact model should gain `insurancePoliciesAsBroker()` and `insurancePoliciesAsProvider()` relationships. The contact detail page should show a collapsible section or tab titled "Insurance Policies" listing policies where the contact is broker or provider. This follows the existing pattern where contacts show linked invoices (`invoices()`) and bills (`bills()`). The section should display policy type, policy number, status, coverage amount, and expiry date.

### Integration with Estate Planning (060-WEP)

**C-10: How should insurance data feed into estate planning? Should the estate dashboard surface insurance coverage gaps?**

Yes, but as a read-only cross-reference, not a deep integration. The 060-WEP estate dashboard (US-07) shows estate plan completeness (will, BDBN, POA status). It should include an "Insurance Coverage" summary card showing: count of active policies, total coverage, and count of coverage gaps. This surfaces insurance as a dimension of estate readiness without duplicating the full coverage gap analysis. The link is informational -- clicking through navigates to the insurance register. Implementation: the estate dashboard API endpoint calls `GetCoverageGapSummary` (a new Action from 069-RMI) to get aggregate numbers.

**C-11: Should life insurance and income protection policies receive special treatment in the estate planning context (e.g., flagging if no life insurance exists for a will testator)?**

Yes, as a P2 enhancement. The estate dashboard should flag: "No life insurance policy found" if the workspace has a will but no active Life Insurance, Income Protection, or Total Permanent Disability policy. This is a coverage gap specific to estate planning -- not the general asset-based gap analysis. Implementation: add a `getEstateInsuranceGaps()` method to the coverage gap action that checks for the existence of person-protection policy types rather than asset-linked coverage. Deferred to Sprint 3 alongside the dashboard widgets.

### Integration with Personal Assets

**C-12: Should coverage gap analysis work with PersonalAsset (030-PLG) in addition to Asset (033-FAR)?**

Yes. Personal ledger workspaces (entity_type = "personal") use `PersonalAsset` instead of `Asset`. The insurance policy's asset linkage should be polymorphic -- supporting both `Asset` and `PersonalAsset` via a `insurable_type` / `insurable_id` pattern on the pivot table, or separate nullable foreign keys. Given that the pivot table already needs to exist for many-to-many (C-03), the simplest approach is: the `insurance_policy_asset` pivot table has `asset_type` (morph type) and `asset_id` columns, registered in the morph map as `asset` and `personal_asset`. Coverage gap analysis queries both asset models and unions the results.

**Updated FR-007**: System MUST allow linking an insurance policy to one or more assets (both `Asset` from 033-FAR and `PersonalAsset` from 030-PLG) via a polymorphic many-to-many relationship.

**Updated FR-015**: System MUST detect uninsured assets across both the fixed asset register (`Asset`) and personal asset register (`PersonalAsset`) where the asset class conventionally requires insurance.

**C-13: For personal ledger workspaces, which asset categories are considered "insurable" for coverage gap analysis?**

The coverage gap analysis needs a concept of "insurable" asset classes. Not all assets need insurance (e.g., you don't insure a stock portfolio with property-style insurance). Insurable categories for gap analysis purposes:
- Asset (033-FAR): Vehicle, Property, Equipment, Furniture, Plant (tangible physical assets)
- PersonalAsset (030-PLG): assets with category matching vehicle, property, jewellery, collectibles, equipment

Non-insurable (excluded from gap analysis): Listed Securities, Cryptocurrency, Managed Funds, Software, Patents, Goodwill, Trademarks. These are financial/intangible assets covered by different risk mechanisms (hedging, diversification), not insurance policies.

The `AssetType` enum already classifies tangible vs intangible vs financial via the `category()` method. Gap analysis should default to tangible assets only, with a user toggle to include all asset types.

### Integration with Practice Management

**C-14: How should practice advisors view client insurance and risk data across their managed workspaces?**

Through the existing WorkspaceGroup aggregation model. The spec's FR-042 mentions group-level aggregation. Implementation: a practice advisor viewing a workspace group sees a consolidated table showing, per member workspace: count of active policies, total coverage, count of coverage gaps, count of open risk items by level, and next policy expiry date. This follows the pattern of the consolidated reports (028-CFT) which aggregate financial data across group members using `WorkspaceGroup::getAllWorkspaceIds()`. The advisor needs `risk.view` and `insurance.view` permissions on each member workspace (enforced by existing group permission checks).

**C-15: Should practice tasks be auto-created when coverage gaps or overdue risk reviews are detected for client workspaces?**

Not in v1. This is a natural extension but adds complexity (auto-creation rules, task templates, de-duplication). For v1, the practice advisor sees the aggregated view and manually creates practice tasks from it. A "Create Task" button on the group risk summary page pre-fills the task with context (e.g., "Review insurance coverage gaps for [workspace name] -- 2 uninsured assets"). This follows how 027-PMV practice tasks work today -- advisors create them from context, not auto-generated.

### Notifications

**C-16: What NotificationType enum values are needed, and who receives each notification?**

Four new cases needed in the `NotificationType` enum:
- `InsuranceRenewalReminder` -- sent to all workspace users with `insurance.view` permission at 30/14/7/1 day intervals
- `InsuranceExpired` -- sent to all workspace users with `insurance.view` permission when a policy transitions to Expired
- `RiskReviewDue` -- sent to all workspace users with `risk.view` permission when a risk item's review date arrives
- `CoverageGapDetected` -- sent to workspace owner and users with `insurance.view` permission when a new coverage gap is identified (run as part of the daily check alongside renewal reminders)

Filter category for all four: "Risk & Insurance". The notification `subject_type`/`subject_id` morph points to the relevant `InsurancePolicy` or `RiskItem` record.

**C-17: Should the daily renewal check command also run the coverage gap analysis and notify on new gaps?**

Yes. A single artisan command `insurance:daily-check` should handle both renewal reminders and coverage gap detection. It runs daily at 06:30 (after `health-score:calculate-all` at 02:00 and before `email:overdue-reminders` at 07:00). The command iterates all workspaces with active policies, checks renewal windows, transitions expired policies, and runs a lightweight coverage gap check. If a new gap is detected (asset was previously covered but policy expired overnight, or a new asset was added without coverage), it generates a `CoverageGapDetected` notification. The risk review date check runs in a separate section of the same command.

### Frontend UX

**C-18: Where do the Risk Register and Insurance Register sit in the navigation hierarchy?**

As a new top-level nav item "Risk & Insurance" in `primaryNav` with sub-items. Following the existing navigation pattern in `frontend/src/lib/navigation.ts`:

```typescript
{
  title: "Risk & Insurance",
  url: "/risk",
  icon: Shield,
  shortcut: "G then R", // Note: "R" is currently bound to /reports
  featureKey: "risk_management",
  items: [
    { title: "Risk Register", url: "/risk/register" },
    { title: "Insurance", url: "/risk/insurance" },
    { title: "Coverage Analysis", url: "/risk/coverage" },
  ],
}
```

Since `G then R` is already bound to `/reports`, the risk shortcut should use `G then W` (for "risk/Worry" -- all single-letter mnemonics near R are taken). The `featureKey: "risk_management"` allows the nav item to be hidden for workspaces that don't enable the feature via Laravel Pennant.

For personal ledger workspaces, the insurance register should appear in `personalNav` as a simpler entry (insurance only, no risk register -- personal users are less likely to use formal risk scoring).

**C-19: Should the insurance register and risk register pages be accessible on mobile, and are there any mobile-specific UX considerations?**

Yes, both pages must be responsive. The list views use the existing `DataTable` component which is already mobile-responsive. The risk heat map is the only component that requires special mobile treatment -- on screens narrower than 640px, it should render as a sorted list grouped by risk level rather than the 5x5 grid (the grid cells become too small to tap). The insurance policy form should use a single-column layout on mobile. Keyboard shortcut `kbd` badges are hidden on mobile via the existing `hidden sm:inline-flex` pattern.

### Testing Strategy

**C-20: What is the minimum test coverage required, and which test types are needed?**

Following the project's testing strategy:

**Feature tests** (API-level, highest priority):
- InsurancePolicyController: CRUD, status transitions, renewal, counts endpoint (minimum 12 tests)
- RiskItemController: CRUD, status transitions, review, heat map data, counts endpoint (minimum 12 tests)
- CoverageGapAnalysis: uninsured/underinsured/lapsed detection across Asset and PersonalAsset (minimum 6 tests)
- PortfolioConcentration: calculation accuracy, threshold warnings (minimum 4 tests)
- Tenant isolation: verify cross-workspace data access is blocked for both models (minimum 2 tests)
- Permission enforcement: verify each of the 9 permissions blocks unauthorized access (minimum 9 tests)

**Unit tests**:
- Risk score calculation (likelihood * impact = score, score -> level mapping)
- Coverage ratio calculation (sum coverage / sum asset value)
- Concentration percentage calculation

**Browser tests** (Playwright, lower priority):
- Create insurance policy flow
- Risk register with heat map rendering
- Coverage gap analysis page loads with correct data

Minimum total: ~45 feature tests, ~6 unit tests, ~3 browser tests. All tests must seed `RolesAndPermissionsSeeder` and use `->withHeaders(['X-Workspace-Id' => ...])` per project convention.
