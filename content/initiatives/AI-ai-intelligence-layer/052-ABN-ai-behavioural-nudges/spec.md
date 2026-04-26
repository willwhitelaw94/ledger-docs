---
title: "Feature Specification: AI Behavioural Nudges"
---

# Feature Specification: AI Behavioural Nudges

**Feature Branch**: `052-ABN-ai-behavioural-nudges`
**Created**: 2026-03-19
**Status**: Draft
**Epic**: 052-ABN
**Initiative**: FL — Financial Ledger
**Effort**: Large
**Depends On**: 048-FPL (Feed Pipeline), 051-EHS (Entity Health Score), 021-AIQ (AI Chatbot)

## Out of Scope

- **Machine learning model training** — v1 uses rule-based evaluation and suppression, not ML. Feedback loop is deterministic.
- **Push notifications (mobile/desktop)** — nudges surface in-app only (entity feed, chatbot, detail pages). Push notifications are a separate concern (024-NTF).
- **Peer comparison nudges** — require 034-IBR (Industry Benchmarking) which is a separate epic. The evaluator slot exists but ships empty in v1.
- **Custom nudge authoring** — users cannot create their own nudge rules in v1. They can only adjust thresholds and toggle categories.
- **Multi-language nudge copy** — English only for v1.
- **Nudge-triggered automations** — nudges inform, they do not auto-execute actions (e.g., auto-sending invoice reminders).

## Overview

MoneyQuest sees every financial decision an entity makes — what they buy, when they buy it, how much they pay, who they pay, and how that compares to their past behaviour and their peers. AI Behavioural Nudges turns this data into proactive, contextual coaching that surfaces at the right moment to help users make better financial decisions.

This is not a report you go looking for. These are **nudges that find you** — appearing in the entity feed, the user activity feed, the AI chatbot, and on relevant detail pages.

### Why This Matters

Plaid discovered that "consumers rapidly sign up for and purchase stocks when prices are high — the exact inverse of what they should do." MoneyQuest sees the same patterns in real-time. The difference is we can **intervene** — not just observe. A nudge at the moment of decision is worth more than a retrospective report.

For accountants, nudges transform the advisory relationship: instead of reviewing a client's year-end and saying "you overspent on X", they can say "we flagged this in March and you course-corrected."

## Nudge Categories

### 1. Spending Pattern Nudges

| Nudge | Trigger | Example |
|-------|---------|---------|
| **Spending spike** | Category spend > 150% of 3-month average | "Office supplies spend is $4,200 this month — 2.3x your usual $1,800. Worth checking?" |
| **Subscription creep** | New recurring charge detected | "New $99/month subscription to Notion detected. You now have 14 active subscriptions totalling $2,340/month." |
| **Vendor concentration** | Single vendor > 30% of category spend | "78% of your IT spend goes to one vendor. Consider diversifying to reduce risk." |
| **Seasonal reminder** | Approaching period with historically high spend | "Last December you spent $18,000 on staff bonuses. Budget accordingly." |

### 2. Cash Flow Nudges

| Nudge | Trigger | Example |
|-------|---------|---------|
| **Cash runway warning** | Projected cash < 30 days of operating expenses | "At current burn rate, cash covers 24 days. $15,200 in receivables are overdue — chase them." |
| **Payment timing** | Large outgoing due when balance is low | "Your $8,500 quarterly insurance is due in 5 days but your balance is $9,200. Consider timing." |
| **Collection opportunity** | Receivables aging past terms | "3 invoices ($23,400 total) are 15+ days overdue. Sending reminders could improve cash flow by $23K." |
| **Surplus detection** | Cash balance significantly above operating needs | "Cash balance is $145,000 — 6 months of operating expenses. Consider moving excess to a higher-yield account." |

### 3. Investment & Asset Nudges

| Nudge | Trigger | Example |
|-------|---------|---------|
| **Cost basis alert** | Buying above average cost | "You're buying ASX200 ETF at $84.20 — your average cost basis is $72.40 (16% above). Dollar-cost averaging would smooth this." |
| **Revaluation insight** | Significant asset value change | "Your Cremorne property AVM increased $45,000 this quarter. Total unrealised gain now $185,000." |
| **Dividend opportunity** | Ex-dividend date approaching for held stock | "BHP goes ex-dividend on March 28. You hold 500 shares — expected dividend $1,250." |
| **Diversification** | Portfolio concentration > 40% in one asset | "68% of your investment portfolio is in Australian property. Consider geographic or asset class diversification." |

### 4. Compliance & Tax Nudges

| Nudge | Trigger | Example |
|-------|---------|---------|
| **BAS deadline** | Approaching BAS lodgement date | "Q3 BAS due April 28. You have $3,200 in uncategorised transactions that may affect GST." |
| **Tax deduction hint** | Expense that may be deductible | "Your $2,400 home office expense may be claimable. Ensure you have receipts attached." |
| **FBT warning** | Potential fringe benefit detected | "Entertainment expenses of $8,500 this quarter may trigger FBT obligations. Review with your accountant." |
| **Year-end prep** | Approaching financial year end | "EOFY in 45 days. 12 transactions still uncategorised. 3 depreciation schedules need updating." |

### 5. Peer Comparison Nudges (requires 034-IBR)

| Nudge | Trigger | Example |
|-------|---------|---------|
| **Above-average spend** | Category spend > 75th percentile for industry | "Your rent as % of revenue is 18% — most similar businesses are at 8-12%. Worth reviewing?" |
| **Below-average margin** | Gross margin < 25th percentile | "Your gross margin (32%) is below the industry median (41%). Pricing or COGS may need attention." |

## User Scenarios & Testing

### User Story 1 — Nudges in Entity Feed (Priority: P1)

A business owner wants proactive financial insights surfaced in their daily workflow. Rather than digging through reports, they expect MoneyQuest to flag anomalies and opportunities as they happen — right in the entity feed alongside bank transactions and invoice updates.

**Why this priority**: The entity feed is the primary surface where users spend their time. If nudges don't appear here, they don't get seen. This is the foundational delivery mechanism for the entire feature.

**Independent Test**: Can be tested by importing bank transactions that trigger a spending spike, then verifying the nudge appears in the entity feed with correct amounts and comparison data.

**Acceptance Scenarios**:

1. **Given** my office supplies spend this month is 2.3x the 3-month average, **When** the feed pipeline processes the latest bank transactions, **Then** a spending spike nudge appears in my entity feed with the category, amount, and comparison.
2. **Given** a nudge appears in the feed, **When** I click "Dismiss", **Then** it is removed from the feed. **When** I click "Helpful", **Then** similar nudges continue to be generated. **When** I click "Not relevant", **Then** this specific nudge type is suppressed for this category.
3. **Given** I dismissed a spending spike nudge for "Office Supplies" with "Not relevant" feedback, **When** the same category spikes next month, **Then** the nudge does NOT reappear (learned preference).
4. **Given** multiple nudges are generated on the same day, **When** I view the entity feed, **Then** nudges are interleaved with other feed items, sorted by severity (critical first), with a maximum of 5 nudges visible per day.

---

### User Story 2 — Nudges in AI Chatbot (Priority: P1)

The AI chatbot proactively mentions relevant nudges during conversation. When a user asks a financial question, the chatbot weaves in active nudges that are contextually relevant — making the advice feel personalised and data-driven.

**Why this priority**: The chatbot is the conversational interface for financial advice. Nudges without chatbot integration means the AI gives generic answers when it could give specific, data-backed recommendations.

**Independent Test**: Can be tested by creating active nudges for a workspace, then asking the chatbot a related question and verifying it references the nudge data in its response.

**Acceptance Scenarios**:

1. **Given** I ask the chatbot "How's my cash flow?", **When** there are active cash flow nudges, **Then** the response includes them contextually: "Cash flow is positive, but I noticed 3 overdue invoices totalling $23,400 that could strengthen it further."
2. **Given** I ask "Should I buy more BHP shares?", **When** my cost basis data is available, **Then** the chatbot references it: "Your average cost basis is $42.10. BHP is currently at $46.80. You'd be buying 11% above your average."
3. **Given** I ask "What should I focus on today?", **When** there are active nudges across categories, **Then** the chatbot prioritises by severity and surfaces the top 2-3 most actionable nudges.

---

### User Story 3 — Practice-Level Nudges (Priority: P2)

An accountant managing multiple client entities wants to see which clients have active nudges requiring advisory intervention. Rather than opening each client workspace individually, the practice dashboard aggregates nudge signals so the accountant can prioritise their advisory time.

**Why this priority**: Practice-level visibility is the key differentiator for accounting firms. However, individual entity nudges must work first (P1) before aggregation makes sense.

**Independent Test**: Can be tested by generating nudges across multiple client workspaces connected to a practice, then verifying the practice dashboard shows nudge indicators and allows drill-down.

**Acceptance Scenarios**:

1. **Given** I am on the practice dashboard, **When** I view the client list, **Then** entities with critical nudges show a nudge indicator (bell icon with count).
2. **Given** I click the nudge indicator for a client, **When** the nudge panel opens, **Then** I see all active nudges for that entity, filterable by category.
3. **Given** a client has a cash runway warning, **When** I view it, **Then** I can click "Send to Client" to share the nudge as a message via email (023-EML).
4. **Given** I am viewing the practice dashboard, **When** I sort clients by nudge count or severity, **Then** the most urgent clients appear first.

---

### User Story 4 — Nudge Preferences (Priority: P2)

A user wants to control which nudge categories they receive and how sensitive the triggers are. Not every user wants every nudge — a sophisticated investor may not need diversification reminders, while a new sole trader wants all the help they can get.

**Why this priority**: Preferences prevent alert fatigue and respect user autonomy. Without them, users will either ignore all nudges or disable the feature entirely.

**Independent Test**: Can be tested by adjusting nudge preferences in settings, then verifying that disabled categories stop generating nudges and sensitivity thresholds change trigger points.

**Acceptance Scenarios**:

1. **Given** I am on Settings > Nudges, **When** I view the preferences, **Then** I see toggles for each nudge category with sensitivity sliders (e.g., "Alert me when spend exceeds: 120% / 150% / 200% of average").
2. **Given** I disable "Investment & Asset Nudges", **When** my portfolio changes, **Then** no investment nudges are generated for this entity.
3. **Given** I set the spending spike threshold to 200%, **When** my category spend reaches 180% of average, **Then** no spending spike nudge is generated. **When** it reaches 210%, **Then** a nudge fires.

---

### User Story 5 — Nudge Detail and Action Links (Priority: P2)

A user who sees a nudge wants to understand the context and take action directly from the nudge, without having to navigate to the relevant page manually.

**Why this priority**: Nudges that inform but don't enable action are only half useful. Deep links to the relevant page close the loop between awareness and action.

**Independent Test**: Can be tested by clicking the action link on a nudge and verifying it navigates to the correct detail page with relevant data pre-loaded.

**Acceptance Scenarios**:

1. **Given** a cash runway warning nudge, **When** I view the nudge detail, **Then** I see the projected runway in days, current cash balance, total overdue receivables, and a breakdown of the calculation.
2. **Given** a collection opportunity nudge, **When** I click the action link, **Then** I am taken to the invoices list filtered to show overdue invoices.
3. **Given** a compliance nudge about uncategorised transactions, **When** I click the action link, **Then** I am taken to the bank reconciliation page with uncategorised transactions highlighted.

---

### Edge Cases

- **What happens when a workspace has insufficient data for nudge evaluation?** Evaluators require a minimum of 30 days of transaction data before generating spending pattern nudges. Cash flow nudges require at least one bank account connected. Nudge categories that cannot be evaluated are silently skipped.
- **What happens when multiple nudges of the same type trigger simultaneously?** Deduplication ensures max 1 nudge per type per category per week. If office supplies and IT both spike, both generate independent nudges. If office supplies spikes twice in one week, only the first nudge fires.
- **What happens when a user dismisses all nudges?** The system respects the suppression but does not stop evaluating. If a new category or type is introduced, it will still generate nudges for unsuppressed types.
- **What happens when a nudge expires?** Nudges expire after 30 days if not actioned or dismissed. Expired nudges are marked as expired and removed from active feeds, but retained in history for analysis.
- **What happens when the feed pipeline processes a large batch of transactions?** Nudge evaluation is debounced — same as health score. A batch of 200 transactions triggers one evaluation, not 200.
- **What happens when an entity's health score (051-EHS) drops significantly?** The health score drop may independently trigger nudges if the underlying metrics cross nudge thresholds. The health score itself is not a nudge trigger — the same underlying data drives both.
- **What happens when a practice sends a nudge to a client who has that nudge category disabled?** The "Send to Client" action sends an email with the nudge content regardless of the client's in-app preferences — it's an explicit advisory communication, not an automated nudge.

## Requirements

### Functional Requirements

**Nudge Generation**

- **FR-001**: System MUST generate nudges automatically via NudgeEvaluator actions that run after feed pipeline processing, after journal entry posting, and on a nightly batch for time-based nudges.
- **FR-002**: System MUST support five evaluator categories: SpendingPatternEvaluator, CashFlowEvaluator, InvestmentEvaluator, ComplianceEvaluator, and PeerComparisonEvaluator (deferred to 034-IBR).
- **FR-003**: System MUST check user preferences and suppression rules before generating any nudge.
- **FR-004**: System MUST deduplicate nudges — maximum 1 nudge per type per category per week per workspace.
- **FR-005**: System MUST limit nudge generation to a maximum of 5 nudges per workspace per day to prevent alert fatigue.
- **FR-006**: System MUST run nudge evaluation asynchronously (queued) so it does not slow down the triggering event.
- **FR-007**: System MUST debounce evaluation when processing batch feed events — one evaluation per batch, not per transaction.

**Nudge Content & Display**

- **FR-008**: Each nudge MUST include a title, body with specific numbers (AI-generated), severity level (info/warning/critical), category, and a deep-link action URL to the relevant page.
- **FR-009**: Nudges MUST appear in the entity feed interleaved with other feed items, sorted by severity.
- **FR-010**: Nudges MUST be accessible to the AI chatbot (021-AIQ) as contextual data for conversational responses.
- **FR-011**: Nudges MUST expire after 30 days if not actioned or dismissed.

**Feedback Loop**

- **FR-012**: System MUST support three feedback actions per nudge: "Helpful" (increase weight), "Not relevant" (suppress type for category in workspace), and "Dismiss" (neutral, no learning).
- **FR-013**: System MUST persist feedback and use it to personalise nudge thresholds per workspace over time via rule-based suppression (not ML).
- **FR-014**: System MUST track nudge status transitions: active → dismissed, active → actioned, active → suppressed, active → expired.

**Preferences**

- **FR-015**: System MUST provide a Settings > Nudges page with toggles per nudge category and sensitivity sliders for configurable thresholds.
- **FR-016**: System MUST respect disabled categories — no nudges generated for disabled categories regardless of trigger conditions.

**Practice Integration**

- **FR-017**: System MUST show nudge indicators (bell icon with count) on the practice dashboard client list for entities with active nudges.
- **FR-018**: System MUST allow practice users to view all active nudges for a client entity, filterable by category.
- **FR-019**: System MUST allow practice users to "Send to Client" a nudge as an email via the email infrastructure (023-EML).

### Key Entities

- **Nudge**: A proactive financial insight generated by an evaluator. Has a workspace_id (tenant-scoped), category (enum: spending, cash_flow, investment, compliance, peer), type (string identifying the specific nudge, e.g., spending_spike, cash_runway_warning), severity (enum: info, warning, critical), title, body (AI-generated text with specific numbers), data (JSON payload with amounts, percentages, comparisons, linked entity IDs), action_url (deep link to relevant page), status (enum: active, dismissed, actioned, suppressed, expired), feedback (enum: helpful, not_relevant, or null), generated_at timestamp, and expires_at timestamp (nullable for non-time-sensitive nudges).
- **NudgePreference**: Per-workspace configuration for nudge behaviour. Has a workspace_id, category, enabled flag, and threshold settings (JSON with configurable sensitivity values per nudge type within the category).
- **NudgeSuppression**: Records when a user marks a specific nudge type as "Not relevant" for a specific category. Has a workspace_id, nudge_type, category, and suppressed_at timestamp. Prevents future generation of that type+category combination.

## Success Criteria

- **SC-001**: Nudge evaluation completes within 10 seconds per workspace for all active evaluators.
- **SC-002**: No more than 5 nudges are generated per workspace per day across all categories.
- **SC-003**: 70% of users who receive nudges interact with at least one (dismiss, helpful, or not relevant) within 7 days.
- **SC-004**: Users who engage with nudges show measurably improved financial behaviours within 90 days (e.g., reduced overdue receivables, more consistent reconciliation).
- **SC-005**: Less than 10% of nudges receive "Not relevant" feedback after the first month (indicating the system learns preferences effectively).
- **SC-006**: Nudge generation does not increase feed pipeline processing time by more than 5% (async, debounced).
- **SC-007**: 50% of practice users check client nudge indicators at least weekly on the practice dashboard.
- **SC-008**: Expired nudges are automatically cleaned from active feeds within 24 hours of expiry.

## Clarifications

### Session 2026-03-19

- Q: Is this ML-based or rule-based? → A: **Rule-based for v1.** Evaluators use configurable thresholds and historical averages. Feedback loop uses deterministic suppression rules, not model retraining. ML is a future enhancement.
- Q: How many nudges per day is acceptable? → A: **Max 5 per workspace per day.** Alert fatigue is the biggest risk. Better to miss a low-priority nudge than to overwhelm the user.
- Q: Do nudges replace reports? → A: **No.** Nudges are complementary — they surface signals that reports already contain but that users may not notice. Reports remain the authoritative view.
- Q: Where do nudges surface? → A: **Entity feed (primary), AI chatbot (contextual), practice dashboard (aggregated).** Not in push notifications for v1.
- Q: What about peer comparison nudges? → A: **Deferred to 034-IBR.** The PeerComparisonEvaluator slot exists in the architecture but ships empty in v1. When 034-IBR launches, it plugs into the existing evaluator framework.
- Q: Can nudges trigger automated actions? → A: **No.** Nudges inform; they do not execute. A nudge can suggest "send invoice reminders" but does not auto-send them. Automation is a future enhancement.
- Q: How does this relate to Entity Health Score (051-EHS)? → A: **Same underlying data, different output.** Health score is a composite metric. Nudges are specific, actionable insights. A health score drop does not directly trigger a nudge — the underlying metrics (e.g., overdue receivables) trigger both independently.
- Q: What minimum data is required before nudges fire? → A: **30 days of transaction data for spending patterns.** Cash flow nudges require at least one connected bank account. Compliance nudges require workspace entity type to be set (for BAS, FBT relevance).
