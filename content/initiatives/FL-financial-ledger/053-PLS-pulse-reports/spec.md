---
title: "Feature Specification: Pulse Reports"
---

# Feature Specification: Pulse Reports

**Feature Branch**: `053-PLS-pulse-reports`
**Created**: 2026-03-19
**Status**: Draft
**Epic**: 053-PLS
**Initiative**: FL — Financial Ledger
**Effort**: Large
**Depends On**: 048-FPL (Feed Pipeline), 051-EHS (Entity Health Score), 021-AIQ (AI Chatbot), 007-FRC (Financial Reporting)

## Out of Scope

- **Report white-labelling** — custom fonts, colour schemes, and domain-branded PDF templates are deferred to a future iteration. V1 uses workspace logo + default MoneyQuest styling.
- **Client self-service scheduling** — only workspace members with appropriate permissions can schedule reports. Client-role users receive reports but cannot configure schedules in v1.
- **Real-time streaming generation UI** — v1 shows step-by-step progress text updates. Live-streaming partial report rendering (sections appearing as they complete) is deferred.
- **Multi-language reports** — all generated narratives are English-only in v1.
- **Historical backfill** — v1 does not retroactively generate Pulse Reports for periods before the feature is enabled.

## Overview

Pulse Reports are AI-orchestrated financial analyses that go far beyond static reports. When a user requests a Pulse Report — or one is triggered automatically — the AI executes a multi-step investigation across the ledger: querying financial data, running ratio analysis, comparing against history and benchmarks, checking for anomalies, evaluating the health score, reviewing active nudges, and synthesising everything into a narrative report with charts, insights, and recommended actions.

This is not a template with numbers plugged in. It is an AI agent that thinks like an accountant, pulling on whatever threads it needs to answer the question "How is this entity doing, and what should we do about it?"

### Why This Matters

Traditional financial reports are backwards-looking spreadsheets that require expertise to interpret. Pulse Reports are forwards-looking narratives that anyone can understand. An accountant spends hours preparing a client update — the Pulse Report does it in seconds, with the accountant reviewing and editing rather than creating from scratch.

For the universal ledger vision, Pulse Reports are how a user tracking a property portfolio, share investments, a business, and personal finances gets a **unified intelligence briefing** across all their entities.

## Report Types

### 1. Entity Pulse (per-workspace)

A comprehensive health check of a single entity. The AI orchestrates:

```
Step 1: Gather financial data
├── Pull P&L for current period + prior period + same period last year
├── Pull balance sheet as at today
├── Pull cash flow statement
├── Pull aging reports (receivables + payables)
└── Pull bank account balances and recent feed data

Step 2: Calculate ratios and metrics
├── Liquidity ratios (current, quick, cash)
├── Profitability ratios (gross margin, net margin, EBITDA)
├── Efficiency ratios (debtor days, creditor days, inventory turnover)
├── Leverage ratios (debt-to-equity, interest coverage)
└── Growth rates (revenue, expenses, profit — period over period)

Step 3: Analyse trends
├── Compare current ratios to 3-month, 6-month, 12-month trends
├── Identify improving and deteriorating metrics
├── Flag metrics that crossed thresholds (e.g., current ratio dropped below 1.0)
└── Seasonal comparison (same period last year)

Step 4: Cross-reference
├── Check health score and sub-scores
├── Check active nudges and alerts
├── Check anomaly detection findings (040-AND)
├── Check upcoming obligations (bills due, BAS deadlines, loan repayments)
└── If benchmarking enabled, compare against industry peers (034-IBR)

Step 5: Synthesise and generate
├── Generate executive summary (2-3 paragraphs, plain English)
├── Generate key metrics dashboard (charts and sparklines)
├── Generate "Top 3 Things to Celebrate" (positive trends)
├── Generate "Top 3 Things to Watch" (risk areas)
├── Generate recommended actions with estimated impact
└── Generate forward outlook (next 30/60/90 days based on trends)
```

### 2. Practice Pulse (multi-entity)

A portfolio review across all entities in a practice. The AI orchestrates:

```
Step 1: Run Entity Pulse for each workspace (parallel)
Step 2: Aggregate across entities
├── Total AUM (assets under management)
├── Entity distribution by health score range
├── Entities with deteriorating scores (trending down)
├── Top revenue entities, top risk entities
└── Cross-entity patterns (e.g., "3 clients have overdue receivables with the same vendor")

Step 3: Practice-level insights
├── Client attention priority ranking
├── Revenue at risk (entities with declining health)
├── Upcoming deadlines across all entities
├── Practice utilisation (tasks assigned vs completed)
└── Advisory opportunity identification
```

### 3. Group Pulse (consolidation)

For family offices or entity groups (028-CFT), a consolidated view:

```
Step 1: Run Entity Pulse for each entity in the group
Step 2: Consolidation
├── Consolidated net worth (all entities)
├── Inter-entity positions (loans, shared assets)
├── Net worth trend with entity-level contribution
└── Asset allocation across the group

Step 3: Group-level insights
├── Which entities are contributing most to net worth growth
├── Concentration risk (too much in one asset class or entity)
├── Tax optimisation opportunities across entities
└── Estate planning implications
```

### 4. Topic Pulse (focused investigation)

A deep dive on a specific topic. User asks a question, the AI investigates:

- "How is our cash flow trending?" — Deep cash flow analysis with forecasting
- "Are we spending too much on contractors?" — Vendor analysis, peer comparison, trend
- "What's happening with our property portfolio?" — Revaluation history, rental yields, LVR
- "Prepare a loan application summary" — Financial ratios, cash flow, profitability optimised for lender review

## User Scenarios & Testing

### User Story 1 — Generate Entity Pulse Report (Priority: P1)

A business owner wants a comprehensive, AI-generated financial health report for their entity. Rather than waiting for their accountant to manually compile a client update, they click a button and receive a full investigation within seconds — executive summary, metrics, celebrations, warnings, and recommended actions.

**Why this priority**: The Entity Pulse is the foundational report type. Every other report type (Practice, Group, Topic) builds on top of it. Without a reliable single-entity report, the entire feature has no foundation.

**Independent Test**: Can be tested by navigating to the entity dashboard, clicking "Generate Pulse Report", and verifying the complete report renders with all sections populated from real ledger data.

**Acceptance Scenarios**:

1. **Given** I am on the entity dashboard, **When** I click "Generate Pulse Report", **Then** I see a loading state showing the AI's progress through each step ("Gathering financial data... Calculating ratios... Analysing trends...").
2. **Given** the report generates successfully, **When** I view it, **Then** I see: executive summary, key metrics with charts, "Top 3 Celebrations", "Top 3 Watch Items", recommended actions, and forward outlook.
3. **Given** the report is generated, **When** I click "Share", **Then** I can email it as a styled PDF (023-EML) or copy a shareable link.
4. **Given** a workspace with insufficient data (e.g., less than 30 days of transactions), **When** I generate a Pulse Report, **Then** I see a partial report with a disclaimer indicating which sections could not be calculated due to limited data.

---

### User Story 2 — Scheduled Pulse Reports (Priority: P1)

An accountant managing multiple client entities wants Pulse Reports generated automatically on a recurring schedule, so they arrive in the feed and inbox without manual effort. This transforms the accountant's workflow from reactive report-building to proactive review-and-edit.

**Why this priority**: Scheduled reports are what make Pulse Reports a habit rather than a novelty. Accountants need reliable, recurring delivery to integrate this into their client management workflow.

**Independent Test**: Can be tested by configuring a weekly schedule in Settings > Pulse Reports, advancing the clock (or triggering the scheduled command), and verifying the report appears in the user feed and optionally in email.

**Acceptance Scenarios**:

1. **Given** I am on Settings > Pulse Reports, **When** I configure a schedule (weekly/monthly), **Then** Entity Pulse reports are generated automatically and delivered to the user feed (050-UAF) and optionally via email.
2. **Given** a monthly Pulse Report is generated on the 1st, **When** I receive it, **Then** it covers the previous month with month-over-month and year-over-year comparisons.
3. **Given** I manage 15 entities in a practice, **When** I schedule a Practice Pulse weekly, **Then** I receive a single consolidated report every Monday morning.
4. **Given** a scheduled report fails to generate (e.g., API timeout, insufficient data), **When** the schedule fires, **Then** I receive a feed notification that generation failed with the reason.

---

### User Story 3 — Conversational Pulse (Priority: P2)

A user wants to ask the AI chatbot a complex financial question and receive a structured Pulse Report in response rather than a shallow text answer. The chatbot recognises the depth of the question and automatically upgrades to a multi-step investigation.

**Why this priority**: Conversational access makes Pulse Reports discoverable and accessible without navigating to a dedicated page. However, it depends on the chatbot infrastructure (021-AIQ) and the core Entity Pulse (Story 1) being stable first.

**Independent Test**: Can be tested by opening the AI chatbot, asking "Give me a pulse on cash flow", and verifying the response includes structured sections with charts rendered inline.

**Acceptance Scenarios**:

1. **Given** I'm in the AI chatbot, **When** I ask "Give me a pulse on cash flow", **Then** the chatbot runs a Topic Pulse investigation and responds with a structured analysis including charts.
2. **Given** I ask "Compare this quarter to last quarter", **When** the chatbot investigates, **Then** it generates a comparison report with delta highlights and trend explanations.
3. **Given** the chatbot generates a Pulse response, **When** I say "Export this as a report", **Then** it formats the conversation into a shareable Pulse Report.

---

### User Story 4 — Accountant Reviews and Edits (Priority: P2)

An accountant wants to review an AI-generated Pulse Report before sending it to a client. The AI produces the first draft; the accountant adds professional judgement, adjusts tone, and includes personalised commentary before approving delivery.

**Why this priority**: Accountants are the gatekeepers of financial advice. Without a review-and-edit workflow, the reports cannot be trusted for client delivery. This is essential for professional adoption but requires the core report generation (Story 1) to work first.

**Independent Test**: Can be tested by generating a Pulse Report, clicking "Edit", modifying the executive summary, and clicking "Approve and Send" to verify the edited version is delivered.

**Acceptance Scenarios**:

1. **Given** a Pulse Report is generated, **When** I click "Edit", **Then** I can modify the executive summary, add/remove insights, adjust the tone, and add personal commentary.
2. **Given** I edit a report, **When** I click "Approve and Send", **Then** the final report is emailed to the client with the accountant's branding and sign-off.
3. **Given** I regularly edit reports for a client, **When** the AI generates the next report, **Then** it incorporates my editing patterns (e.g., always include a note about upcoming BAS deadlines).

---

### User Story 5 — Pulse Report History (Priority: P3)

A user wants to review past Pulse Reports to see how their entity's financial analysis has evolved over time. By comparing reports side by side, they can track whether recommended actions were effective and how the financial narrative has shifted.

**Why this priority**: Report history is valuable for longitudinal analysis but is not essential for initial adoption. Users need to generate and use reports (Stories 1-4) before history becomes meaningful.

**Independent Test**: Can be tested by generating multiple reports over different periods, viewing the archive, and selecting two reports for side-by-side comparison.

**Acceptance Scenarios**:

1. **Given** I've generated 6 monthly Pulse Reports, **When** I view the report archive, **Then** I see all past reports with date, type, and health score at the time.
2. **Given** I compare two reports, **When** I select January and March, **Then** I see a side-by-side comparison highlighting what changed between them.

---

### Edge Cases

- **Workspace with no bank account connected**: Report skips bank-related sections (cash flow from feeds, reconciliation status) and explains why those sections are absent rather than showing empty charts.
- **Workspace with less than 30 days of data**: Partial report generated with a prominent disclaimer. Ratios requiring historical comparison (YoY, trend) are omitted. Available metrics are still shown.
- **Multiple reports generated on same day**: Each report is stored independently. The archive shows all reports with timestamps to distinguish them.
- **Scheduled report for a deactivated workspace**: Schedule is automatically paused. A feed notification informs the user the workspace is inactive.
- **Entity Pulse in a workspace with no invoices**: Invoice-related metrics (debtor days, aging) are excluded. The report adapts its narrative to the available data dimensions.
- **Practice Pulse when one entity fails to generate**: The consolidated report includes successfully generated entities and lists failed entities with reasons. It does not block the entire Practice Pulse.
- **Topic Pulse with an ambiguous question**: The AI asks a clarifying question before running the investigation rather than guessing the intent.
- **Concurrent report generation requests**: A second request for the same workspace and type while one is generating returns the in-progress report rather than starting a duplicate.
- **Report references stale data**: All reports are point-in-time snapshots. The generated_at timestamp is prominently displayed. Viewing an old report shows a "This report was generated on [date]" banner.
- **Edited report vs original**: Both the original AI-generated version and the accountant-edited version are retained. The client receives the edited version; the original is available for audit.

## Requirements

### Functional Requirements

**Entity Pulse Generation**
- **FR-001**: System MUST execute a multi-step AI investigation across the ledger when generating an Entity Pulse: gather financial statements, calculate ratios, analyse trends, cross-reference health score/nudges/anomalies, and synthesise into narrative.
- **FR-002**: System MUST produce a report containing: executive summary (2-3 paragraphs, plain English), key metrics with charts, "Top 3 Celebrations", "Top 3 Watch Items", recommended actions with estimated impact, and forward outlook (30/60/90 days).
- **FR-003**: System MUST show real-time progress through generation steps in the UI ("Gathering financial data... Calculating ratios... Analysing trends...").
- **FR-004**: System MUST gracefully handle insufficient data by producing a partial report with a disclaimer indicating which sections could not be calculated.

**Report Types**
- **FR-005**: System MUST support four report types: Entity Pulse (single workspace), Practice Pulse (multi-entity portfolio), Group Pulse (consolidation family tree), and Topic Pulse (focused investigation on a user question).
- **FR-006**: Practice Pulse MUST run Entity Pulses in parallel for each workspace and aggregate results into a consolidated portfolio view.
- **FR-007**: Group Pulse MUST include consolidated net worth, inter-entity positions, asset allocation, and group-level insights (concentration risk, tax optimisation opportunities).
- **FR-008**: Topic Pulse MUST accept a natural language question and run a targeted investigation, adapting its steps to the question scope.

**Scheduling**
- **FR-009**: System MUST allow users to configure automated report schedules with frequency options: weekly, fortnightly, monthly, quarterly.
- **FR-010**: System MUST deliver scheduled reports to the user activity feed (050-UAF) and optionally via email (023-EML).
- **FR-011**: System MUST run scheduled report generation during off-peak hours (2am-5am workspace timezone).
- **FR-012**: System MUST notify the user via feed if a scheduled report fails to generate, including the failure reason.

**AI Chatbot Integration**
- **FR-013**: System MUST expose Pulse Report generation as a chatbot tool (`generate_pulse_report`) in the AI chatbot (021-AIQ).
- **FR-014**: System MUST automatically upgrade complex financial questions in the chatbot to a Pulse Report flow rather than giving shallow answers.
- **FR-015**: System MUST render Pulse Report sections as rich components inline in the chat conversation.
- **FR-016**: System MUST allow users to export a chatbot-generated Pulse response into a shareable report format.

**Review & Edit**
- **FR-017**: System MUST allow accountants to edit AI-generated reports: modify executive summary, add/remove insights, adjust tone, and add personal commentary.
- **FR-018**: System MUST retain both the original AI-generated version and the accountant-edited version for audit purposes.
- **FR-019**: System MUST support an "Approve and Send" workflow that emails the finalised report to clients with the accountant's branding and sign-off.
- **FR-020**: System SHOULD incorporate accountant editing patterns into future report generation for the same client (learning from edits).

**Sharing & Export**
- **FR-021**: System MUST support PDF export with workspace branding (logo and colours).
- **FR-022**: System MUST support shareable links for generated reports.
- **FR-023**: System MUST support email delivery of styled PDF reports via the email infrastructure (023-EML).

**Report History**
- **FR-024**: System MUST store all generated reports and make them accessible via a report archive with date, type, and health score at the time of generation.
- **FR-025**: System MUST support side-by-side comparison of two historical reports with change highlighting.
- **FR-026**: System MUST retain generated reports for a minimum of 2 years.

**Data Integrity**
- **FR-027**: AI-generated narratives MUST reference specific numbers from the ledger — no hallucinated figures. All monetary amounts and percentages must be traceable to source data.
- **FR-028**: Reports MUST be point-in-time snapshots. Viewing a report after the underlying data changes MUST show the data as it was at generation time, not recalculated.

### Key Entities

- **PulseReport**: The generated report record, tenant-scoped. Contains the report type (entity/practice/group/topic), optional topic question for Topic Pulse, generation status (generating/completed/failed/edited/sent), step completion progress for UI tracking, structured data from all investigation steps (ratios, metrics, comparisons stored as JSON), AI-generated narrative text, structured sections with charts/tables/recommendations (JSON), editor reference if an accountant reviewed it, schedule reference if auto-generated, generation timestamp, and the reporting period (start/end dates).
- **PulseSchedule**: A recurring schedule configuration, tenant-scoped. Specifies the recipient user, report type, frequency (weekly/fortnightly/monthly/quarterly), day of week or month for timing, delivery method (feed only, email, or both), active status, and last generation timestamp.
- **PulseReportOrchestrator**: The AI agent action that plans which investigation steps to run based on report type and data availability, executes steps (gather statements, calculate ratios, analyse trends, check health score, check nudges, check anomalies, check obligations, benchmark, forecast, analyse categories/vendors/assets, consolidate entities), synthesises step results into narrative, and formats output for the target medium (HTML in-app, PDF for email/share, Markdown for chatbot).

### Report Rendering Components

- **PulseCard**: Full report rendered as a styled, interactive card in the application.
- **MetricGrid**: Key financial metrics with sparklines and trend arrows.
- **InsightList**: Ranked insights with severity indicators (celebrate/watch/action).
- **ActionList**: Recommended actions with estimated impact values.
- **ComparisonTable**: Period-over-period deltas with colour-coded highlighting.

## Dependencies

- **048-FPL** Feed Pipeline — real-time data that feeds into reports
- **051-EHS** Entity Health Score — score data included in reports
- **052-ABN** AI Behavioural Nudges — active nudges included in reports
- **021-AIQ** AI Financial Chatbot — Pulse is a chatbot skill + uses rich rendering
- **007-FRC** Financial Reporting — underlying financial statements
- **040-AND** Anomaly Detection — anomaly findings included in reports
- **034-IBR** Industry Benchmarking — peer comparison data
- **041-CFF** Cash Flow Forecasting — forward projection
- **050-UAF** User Activity Feed — scheduled reports delivered to feed
- **023-EML** Email Infrastructure — report delivery via email
- **027-PMV** Practice Management — practice pulse for multi-entity
- **028-CFT** Consolidation Family Tree — group pulse for entity groups

## Success Criteria

- **SC-001**: Entity Pulse generation completes within 30 seconds for a workspace with 12 months of transaction data.
- **SC-002**: Practice Pulse for 15 entities completes within 2 minutes via parallel entity evaluation.
- **SC-003**: 70% of accountants who generate their first Pulse Report generate at least one more within 30 days.
- **SC-004**: 50% of accountants who try Pulse Reports set up a recurring schedule within their first month.
- **SC-005**: Accountants spend less than 5 minutes editing an AI-generated report before sending to clients (vs. 30+ minutes creating a report from scratch).
- **SC-006**: 80% of generated report narratives require no correction to monetary figures or percentages (zero hallucinated numbers).
- **SC-007**: Scheduled reports have a 95%+ successful generation rate (failures are edge cases, not systemic).
- **SC-008**: At least 30% of AI chatbot users trigger a Topic Pulse within their first 2 weeks of using the chatbot.

## Clarifications

- Q: What is the difference between a Pulse Report and a standard financial report (007-FRC)? — A: Standard reports (P&L, Balance Sheet, Cash Flow) are structured outputs of ledger data. Pulse Reports are AI-orchestrated investigations that consume those reports as inputs, add ratio analysis, trend detection, cross-referencing, and narrative synthesis. A Pulse Report might pull from 5+ standard reports in a single generation.
- Q: Can a client-role user generate a Pulse Report? — A: No in v1. Client-role users can view reports shared with them but cannot trigger generation or configure schedules. This may be relaxed in future iterations.
- Q: What happens if a dependency feature (e.g., anomaly detection) is not enabled for a workspace? — A: The orchestrator adapts. Steps that depend on unavailable features are skipped, and the report notes which enrichments were unavailable. The core financial analysis (statements, ratios, trends) always runs.
- Q: Are Pulse Reports gated by plan tier? — A: Entity Pulse is available on Professional and above. Practice Pulse requires a practice connection. Group Pulse requires the consolidation feature (028-CFT). Topic Pulse is available wherever the AI chatbot is available.
- Q: How does the AI avoid hallucinating financial figures? — A: The orchestrator runs structured queries against the ledger first, producing typed data (ratios, amounts, percentages). The AI narrative step receives this structured data and is instructed to reference only provided figures. Post-generation validation checks that all monetary amounts in the narrative match the structured data.
- Q: What LLM is used for narrative generation? — A: The same model configured for the AI chatbot (021-AIQ). The orchestrator uses tool-calling to gather data and a final synthesis prompt for the narrative. Model choice is configurable at the workspace level via AI settings.
