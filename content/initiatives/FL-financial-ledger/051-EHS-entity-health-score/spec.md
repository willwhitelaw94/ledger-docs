---
title: "Feature Specification: Entity Health Score"
---

# Feature Specification: Entity Health Score

**Feature Branch**: `feature/051-ehs`
**Created**: 2026-03-19
**Status**: Draft
**Epic**: 051-EHS
**Initiative**: FL — Financial Ledger Platform
**Effort**: L (4 sprints)
**Depends On**: 048-FPL (Feed Pipeline), 007-FRC (Financial Reporting), 002-CLE (Core Ledger Engine)

### Out of Scope

- **Custom weight configuration UI** — v1 uses entity-type defaults. A settings page for adjusting dimension weights per workspace is deferred to a future iteration.
- **Real-time WebSocket score updates** — v1 refreshes scores on page load and after known triggers. Live push via WebSockets deferred until usage patterns justify it.
- **Cross-entity composite scores** — v1 scores each entity independently. Aggregated group-level health scores (e.g., "Smith Holdings overall health") deferred to a future iteration alongside 028-CFT.
- **Score-based automated actions** — v1 surfaces scores and recommendations. Automated workflows triggered by score thresholds (e.g., auto-pause invoicing) deferred.
- **Custom sub-score dimensions** — v1 ships with 5 fixed dimensions. User-defined dimensions deferred.
- **Benchmarking data pipeline** — v1 benchmarking (P3) depends on 034-IBR infrastructure. If 034-IBR is not complete, benchmarking stories are deferred.

---

## Overview

Every entity on MoneyQuest has a financial story — but today that story is told through static reports that require accounting literacy to interpret. The Entity Health Score distils an entity's financial health into a real-time, dynamic composite score (0–100) that updates as data flows through the feed pipeline and journal entries are posted. Think of it as a credit score for entities — but built on the full double-entry ledger, not lagging bureau reports. An accountant glances at a practice dashboard and immediately sees which clients are thriving (green), stressed (amber), or in trouble (red). A business owner sees their own score trending up or down with context on why.

---

## User Scenarios & Testing

### User Story 1 — Entity Dashboard Health Score (Priority: P1)

A business owner opens MoneyQuest and wants to immediately understand the financial health of their entity without reading reports. The health score badge on the dashboard gives them a single number with colour coding and a plain-English summary — turning complex financial data into an at-a-glance signal they can act on.

**Why this priority**: The dashboard badge is the primary surface for the health score. Without it, the feature has no visibility. Every other story (trends, insights, alerts, benchmarking) assumes the user has already seen and understood their score on the dashboard.

**Independent Test**: Log in as a business owner. Verify the dashboard shows a health score badge with the numeric score, label, colour, and summary sentence. Click the badge. Verify the sub-score breakdown appears with sparkline trends. Verify a score that dropped this week shows an explanation of what caused the change.

**Acceptance Scenarios**:

1. **Given** I am on the entity dashboard, **When** the page loads, **Then** I see a prominent health score badge (e.g., "74 — Good") with the colour indicator and a one-line summary ("Cash flow strong, watch overdue receivables").

2. **Given** the score is 74, **When** I click the health score badge, **Then** I see a breakdown of all 5 sub-scores (Liquidity, Cash Flow, Profitability, Stability, Obligations) with sparkline trends showing the last 90 days.

3. **Given** the score dropped from 78 to 74 this week, **When** I view the sub-score detail, **Then** I see a "Score Changes" section explaining what caused the drop (e.g., "Overdue receivables increased by $12,400").

4. **Given** this is a new workspace with less than 30 days of data, **When** the dashboard loads, **Then** the health score badge shows "Insufficient Data" with a progress indicator showing how much data is needed before a score can be calculated.

---

### User Story 2 — Practice Dashboard Multi-Entity Scores (Priority: P1)

An accountant managing 15 client entities needs to prioritise their attention across all clients. The practice dashboard surfaces all entity health scores in a sortable list so the accountant can immediately identify which clients need outreach — without opening each entity individually.

**Why this priority**: Practice users are the highest-value persona. They manage multiple entities and need a single pane of glass to triage. Without multi-entity scores on the practice dashboard, accountants must click into each entity one by one to assess health — a workflow that does not scale beyond 5 clients.

**Independent Test**: Log in as a practice accountant with 5+ client entities. Verify each entity in the practice client list shows a health score badge with colour coding and trend arrow. Sort by score ascending and verify the most at-risk entities appear first. Verify that an entity whose score dropped more than 10 points shows an alert chip.

**Acceptance Scenarios**:

1. **Given** I am on the practice dashboard, **When** I view the client list, **Then** each entity shows its health score badge with colour coding and trend arrow (up, down, or stable).

2. **Given** I sort the client list by health score ascending, **When** I view the sorted list, **Then** the most at-risk entities appear first, allowing me to prioritise outreach.

3. **Given** an entity's score dropped more than 10 points in a week, **When** I view the practice dashboard, **Then** I see an alert chip on that entity: "Acme Corp score dropped 12 points — investigate".

4. **Given** I have entities across different entity types, **When** I view the client list, **Then** scores are comparable across entity types because each uses appropriate dimension weights for its type.

---

### User Story 3 — Score Trend & History (Priority: P2)

A user wants to understand how their entity's financial health has changed over time — not just the current snapshot. The trend chart reveals patterns: seasonal dips, steady improvement, or a worrying downward trajectory. This context transforms a static number into a narrative.

**Why this priority**: Trends are what make the health score actionable beyond the current moment. A score of 55 means something very different if it was 70 three months ago (declining) vs. 40 three months ago (improving). P2 because the P1 dashboard badge delivers immediate value, and trend analysis builds on top of accumulated history data.

**Independent Test**: Navigate to the health score detail page for an entity with at least 3 months of history. Verify the trend chart shows the composite score over 12 months with colour-banded backgrounds. Hover over a data point and verify the tooltip shows score, date, and top contributing factor. Switch to a sub-score view and verify the chart updates to show that individual dimension.

**Acceptance Scenarios**:

1. **Given** I am on the health score detail page, **When** I view the trend chart, **Then** I see the composite score plotted over the last 12 months with the score range bands (green/blue/amber/orange/red) as background.

2. **Given** I hover over a point on the chart, **When** a tooltip appears, **Then** it shows the score, date, and the top contributing factor (positive or negative) for that period.

3. **Given** I switch to sub-score view, **When** I select "Cash Flow", **Then** the chart shows the cash flow sub-score trend independently.

4. **Given** the entity has less than 3 months of data, **When** I view the trend chart, **Then** whatever data exists is plotted with a note indicating the minimum recommended period for meaningful trends.

---

### User Story 4 — AI-Powered Score Insights (Priority: P2)

A user sees their score is 58 (Fair) and wants to know what they can do about it. The AI insights panel translates sub-score data into ranked, actionable recommendations — each tied to real ledger data with estimated point impact. This bridges the gap between "knowing the score" and "improving it".

**Why this priority**: Insights are what differentiate the health score from a simple dashboard widget. Without recommendations, the score tells users they have a problem but not how to fix it. P2 because the score itself (P1) must exist and be trusted before recommendations add value. Also integrates with the existing AI chatbot (021-AIQ), extending its capabilities.

**Independent Test**: View the insights panel for an entity with a Fair score. Verify AI-generated recommendations are shown, ranked by estimated impact. Click a recommendation referencing a specific contact and verify it links to the contact record. Ask the AI chatbot "How can I improve my health score?" and verify it references current sub-scores with specific advice.

**Acceptance Scenarios**:

1. **Given** my score is 58 (Fair), **When** I view the insights panel, **Then** I see AI-generated recommendations ranked by impact: "Collecting $23,400 in overdue invoices would improve your score by ~8 points".

2. **Given** a recommendation is "Reduce reliance on top customer", **When** I click it, **Then** I see a breakdown showing that one customer represents 62% of revenue with a link to the contact record.

3. **Given** I ask the AI chatbot "How can I improve my health score?", **When** it responds, **Then** it references the current sub-scores and gives specific, actionable advice tied to real ledger data.

---

### User Story 5 — Score Alerts in User Feed (Priority: P2)

A user wants to be notified when an entity's health score changes significantly — without having to check the dashboard daily. Alerts surface in the user activity feed (050-UAF) when scores drop, cross thresholds, or meet user-configured conditions.

**Why this priority**: Alerts make the health score proactive rather than reactive. Without them, users only see score changes when they happen to visit the dashboard. P2 because the feed infrastructure (050-UAF) must exist, and users need to trust the score (from using P1 features) before alerts become valuable rather than noisy.

**Independent Test**: Wait for (or simulate) the nightly batch after an entity's score dropped 7 points. Verify a feed item appears with the score change and reason. Simulate a threshold crossing (Good to Fair) and verify a higher-priority feed item is created. Configure a custom alert threshold and verify alerts only fire when the condition is met.

**Acceptance Scenarios**:

1. **Given** an entity's score drops more than 5 points in a week, **When** the nightly batch runs, **Then** a feed item is created in the user activity feed (050-UAF) with the score change and top reason.

2. **Given** an entity's score crosses a threshold (e.g., Good to Fair), **When** the threshold is crossed, **Then** a higher-priority feed item is created with recommended actions.

3. **Given** I configure alert thresholds in settings, **When** I set "Alert me if any entity drops below 50", **Then** I only receive alerts when that condition is met.

---

### User Story 6 — Benchmarking Against Peers (Priority: P3)

An accountant wants to contextualise a client's health score by comparing it to industry peers. A score of 65 might be excellent for a startup but mediocre for an established retailer. Benchmarking uses anonymised aggregate data from 034-IBR to show percentile rankings per dimension.

**Why this priority**: Benchmarking adds context but is not required for the health score to be useful on its own. It depends on 034-IBR infrastructure being complete and having sufficient anonymised data to produce meaningful percentiles. P3 because it is an enhancement that becomes more valuable as the platform scales and accumulates cross-entity data.

**Independent Test**: View an entity's health score detail page with benchmarking enabled. Verify a percentile indicator shows how the entity compares to similar businesses. Switch to a sub-score view and verify the per-dimension percentile is displayed.

**Acceptance Scenarios**:

1. **Given** I am viewing an entity's health score detail, **When** I enable benchmarking, **Then** I see a percentile indicator: "This entity scores higher than 68% of similar businesses" (based on aggregate anonymised data from 034-IBR).

2. **Given** benchmarking is enabled, **When** I view a sub-score, **Then** I see how the entity compares on that specific dimension (e.g., "Liquidity: 72nd percentile for retail businesses").

3. **Given** insufficient benchmark data exists for the entity's industry, **When** I view the benchmarking section, **Then** I see a message: "Not enough data for your industry yet" rather than misleading percentiles.

---

### Edge Cases

- **New workspace with no data**: When a workspace has fewer than 30 days of transaction data, the score shows "Insufficient Data" rather than a misleading low number. A progress indicator shows how much data is needed.

- **Entity with no revenue accounts**: When an entity has no revenue (e.g., a holding company with only assets and liabilities), the Profitability dimension is weighted at 0% and its weight is redistributed proportionally across the other dimensions.

- **Score calculation during batch feed import**: When 50+ bank transactions are imported in a batch, the score recalculates once at the end (debounced), not per-transaction.

- **Concurrent nightly batch and real-time trigger**: When a journal entry posts during the nightly batch run, the real-time trigger is deferred until the batch completes to avoid race conditions. The batch result takes precedence.

- **Entity type change**: When an entity changes its type (e.g., from Sole Trader to SMB), dimension weights update on the next recalculation. Historical scores retain the weights used at the time of calculation.

- **Zero-balance accounts**: When all accounts have zero balances (e.g., after a fresh workspace setup with no transactions), the score is "Insufficient Data" — not 0 or 100.

- **Extreme outlier values**: When a sub-score calculation produces an outlier (e.g., current ratio of 500:1), the sub-score is capped at 100 and does not distort the composite.

- **Practice with mixed data-ready and new entities**: When a practice dashboard shows health scores and some entities have insufficient data, those entities show "Insufficient Data" badges and sort last in score-based sorting.

---

## Requirements

### Functional Requirements

**Score Model**

- **FR-001**: System MUST compute a composite Entity Health Score (0–100) as a weighted average of five sub-scores: Liquidity (current ratio, quick ratio, cash runway), Cash Flow (operating CF trend, net CF, burn rate, volatility), Profitability (gross margin, net margin, revenue growth, expense ratio), Stability (revenue concentration, recurring vs one-off, expense consistency), and Obligations (debt-to-equity, interest coverage, overdue payables, overdue receivables aging).
- **FR-002**: System MUST map composite scores to five labelled ranges: Excellent (80–100, green), Good (60–79, blue), Fair (40–59, amber), Poor (20–39, orange), Critical (0–19, red).
- **FR-003**: System MUST apply different default dimension weights based on entity type: SMB/Trading (25/25/20/15/15), Sole Trader (30/25/20/10/15), Property Trust (15/20/15/20/30), Investment Entity (15/15/25/25/20), Personal (30/30/10/15/15), Non-Profit (30/25/10/20/15).
- **FR-004**: System MUST use a trailing window approach: primary 90-day window (most weight), secondary 12-month window (trend context), and same-period-last-year comparison (seasonality adjustment).

**Calculation Triggers**

- **FR-005**: System MUST recalculate affected sub-scores asynchronously when a FeedItemProcessed event is dispatched.
- **FR-006**: System MUST recalculate affected sub-scores asynchronously when a JournalEntryPosted event is dispatched.
- **FR-007**: System MUST run a full nightly batch recalculation for all workspaces via a scheduled console command.
- **FR-008**: System MUST debounce recalculations to a maximum of once per minute per workspace during batch feed processing.

**API**

- **FR-009**: System MUST expose `GET /api/v1/health-score` returning the current composite score, all sub-scores, label, colour, summary, and top contributing factors.
- **FR-010**: System MUST expose `GET /api/v1/health-score/history` returning historical scores for trend chart rendering, supporting date range filtering.
- **FR-011**: System MUST expose `GET /api/v1/health-score/insights` returning AI-generated recommendations ranked by estimated score impact.
- **FR-012**: System MUST expose `PATCH /api/v1/health-score/settings` for configuring dimension weights and alert thresholds.
- **FR-013**: System MUST expose `GET /api/v1/practice/health-scores` returning all entity scores for the practice dashboard with trend arrows and alert chips.

**AI Integration**

- **FR-014**: System MUST register a `get_health_score` tool with the AI chatbot (021-AIQ) that returns composite score, sub-scores, and factors.
- **FR-015**: The AI chatbot MUST be able to simulate score changes (e.g., "If you collected all overdue invoices, your score would improve to approximately 82").

**Feed Integration**

- **FR-016**: System MUST create a feed item in the user activity feed (050-UAF) when a score drops more than 5 points in a week.
- **FR-017**: System MUST create a higher-priority feed item when a score crosses a labelled threshold boundary (e.g., Good to Fair).
- **FR-018**: System MUST respect user-configured alert thresholds — only fire alerts when configured conditions are met.

**Frontend**

- **FR-019**: Dashboard MUST display a health score badge with numeric score, label, colour indicator, and one-line summary.
- **FR-020**: Clicking the badge MUST expand a sub-score breakdown with sparkline trends for each dimension.
- **FR-021**: Practice dashboard client list MUST show health score badges with colour coding, trend arrows, and alert chips.
- **FR-022**: Health score detail page MUST render a 12-month trend chart with colour-banded backgrounds and interactive tooltips.

### Key Entities

- **HealthScore**: Tenant-scoped model storing the current score snapshot. Fields: `workspace_id` (FK), `composite_score` (int 0–100), `liquidity_score` (int 0–100), `cash_flow_score` (int 0–100), `profitability_score` (int 0–100), `stability_score` (int 0–100), `obligations_score` (int 0–100), `label` (enum: excellent/good/fair/poor/critical), `summary` (text — one-line AI-generated summary), `factors` (json — top positive and negative contributing factors), `calculated_at` (timestamp), `period_start` (date — trailing window start), `period_end` (date — trailing window end).

- **HealthScoreHistory**: Tenant-scoped model storing point-in-time scores for trend analysis. Fields: `workspace_id` (FK), `composite_score` (int), `sub_scores` (json — all 5 dimension scores), `factors` (json — contributing factors at time of calculation), `calculated_at` (timestamp). Retained indefinitely — small per-workspace footprint, valuable for long-term trend analysis.

- **HealthScoreSettings**: Tenant-scoped model storing per-workspace configuration. Fields: `workspace_id` (FK), `dimension_weights` (json — custom weight overrides, nullable for entity-type defaults), `alert_threshold` (int, nullable — minimum score to trigger alerts), `alert_drop_threshold` (int, default 5 — point drop to trigger weekly alerts).

---

## Architecture

### Score Calculation Service

```
EntityHealthScoreCalculator (Action)
├── calculate(workspace): HealthScore
│   ├── calculateLiquidity(): SubScore (current ratio, quick ratio, cash runway)
│   ├── calculateCashFlow(): SubScore (operating CF, net CF, burn rate, volatility)
│   ├── calculateProfitability(): SubScore (margins, revenue growth, expense ratio)
│   ├── calculateStability(): SubScore (concentration, recurring %, consistency)
│   ├── calculateObligations(): SubScore (D/E, interest coverage, overdue aging)
│   └── composite(): weighted average with entity-type weights
├── explain(healthScore): ScoreExplanation[] (what changed and why)
└── recommend(healthScore): Recommendation[] (AI-generated improvement actions)
```

### Calculation Triggers

```
1. FeedItemProcessed event → recalculate affected sub-scores (async, queued)
2. JournalEntryPosted event → recalculate affected sub-scores (async, queued)
3. Nightly batch (console command) → full recalculation for all workspaces
```

Recalculations are **debounced** — if 50 bank transactions process in a batch, the score recalculates once at the end, not 50 times.

### AI Chatbot Integration (021-AIQ)

```
Tool: get_health_score
├── Returns current composite + sub-scores + factors
├── AI can reference in conversation: "Your health score is 74. The main drag is overdue receivables at $23,400."
├── AI can simulate: "If you collected all overdue invoices, your score would improve to approximately 82."
```

---

## Dependencies

- **048-FPL** Feed Pipeline — score recalculates on feed events
- **007-FRC** Financial Reporting — uses same underlying financial data (ratios, margins)
- **002-CLE** Core Ledger — journal entry events trigger recalculation
- **005-IAR** Invoicing — overdue receivables are a key factor
- **050-UAF** User Activity Feed — score alerts surface in the feed
- **021-AIQ** AI Chatbot — health score as a chatbot tool
- **034-IBR** Industry Benchmarking — peer comparison (P3)
- **027-PMV** Practice Management — multi-entity score dashboard
- **015-ACT** Accountant Practice — practice-level client health view

---

## Success Criteria

- **SC-001**: A business owner sees their health score badge on the dashboard within 2 seconds of page load — zero additional clicks required.
- **SC-002**: Score calculation completes within 5 seconds for a workspace with 12 months of data.
- **SC-003**: Nightly batch completes all workspace scores within 30 minutes.
- **SC-004**: Sub-score calculations are deterministic — same input data always produces the same score.
- **SC-005**: Debounced recalculation fires at most once per minute per workspace during batch feed processing.
- **SC-006**: Practice dashboard renders health scores for 50+ entities in under 3 seconds.
- **SC-007**: Score history is retained indefinitely with no manual cleanup required.
- **SC-008**: AI chatbot `get_health_score` tool returns accurate data matching the dashboard score with zero drift.
- **SC-009**: Score alerts (050-UAF) fire within 1 hour of the triggering event for real-time triggers and within the nightly batch window for threshold-based alerts.

---

## Clarifications

### Session 2026-03-19

- Q: Why 5 dimensions and not more? → A: Five dimensions balance granularity with comprehensibility. Each dimension maps to a question a business owner or accountant would naturally ask: "Can I pay my bills?" (Liquidity), "Is cash flowing?" (Cash Flow), "Am I profitable?" (Profitability), "Is my income predictable?" (Stability), "Are my debts manageable?" (Obligations). More dimensions dilute the signal; fewer leave gaps.

- Q: How are entity-type weights determined? → A: Weights reflect the financial priorities of each entity type. A Personal entity weights Liquidity and Cash Flow highest because personal finance is about spending within means. A Property Trust weights Obligations highest because leverage management is the primary concern. Weights are initial defaults — future iterations allow per-workspace customisation.

- Q: What happens when a workspace has no data? → A: The score shows "Insufficient Data" rather than a misleading zero. A minimum of 30 days of transaction data is required before the first score is generated. A progress indicator communicates how much data is needed.

- Q: How does the score handle entities with unusual structures (e.g., holding company with no revenue)? → A: Dimensions that cannot be calculated (e.g., Profitability for a holding company with no revenue accounts) are weighted at 0% and their weight is redistributed proportionally across the remaining dimensions.

- Q: Will the nightly batch cause performance issues at scale? → A: The nightly batch processes workspaces sequentially with configurable concurrency. Each workspace calculation is independent and takes under 5 seconds. At 10,000 workspaces with 4 concurrent workers, the batch completes in under 3.5 hours. Optimisation (parallel calculation, caching intermediate results) deferred until traffic data justifies it.

- Q: How does debouncing work for real-time triggers? → A: A queued job is dispatched on each event. The job checks whether a score was calculated within the last 60 seconds for that workspace. If yes, it skips. If no, it recalculates. This ensures at most one recalculation per minute during high-volume feed processing.
