---
title: "Feed Pipeline Strategy"
description: "Strategic rationale for MoneyQuest's universal feed pipeline — informed by Plaid's platform evolution and the universal ledger vision"
---

# Feed Pipeline Strategy

**Created**: 2026-03-19
**Related Epics**: 048-FPL, 049-APF, 050-UAF, 051-EHS, 052-ABN, 053-PLS, 040-AND

## Strategic Thesis

MoneyQuest's feed pipeline is the engineering backbone that transforms the platform from a bookkeeping tool into a **wealth management platform**. The pipeline ingests external data from any source — bank transactions, asset prices, market data, property valuations — and converts it into accounting entries that keep the ledger accurate in real-time.

This is not a feature. It is **infrastructure that makes every other feature more valuable**.

## The Plaid Playbook

Plaid's evolution from bank linking API to analytics platform is the closest analogy to what MoneyQuest is building:

| Phase | Plaid | MoneyQuest |
|-------|-------|------------|
| **1. Build the pipes** | Bank account linking API (screen scraping → APIs) | Feed Pipeline Infrastructure (048-FPL) — universal ingestion engine |
| **2. Reach scale** | 1 in 2 Americans with a bank account linked | Cross-entity visibility for accountants managing 8-20 workspaces |
| **3. Analytics on the data** | Fraud detection, credit scoring, payments analytics (20% ARR, 93% CAGR) | Anomaly detection (040-AND), pattern matching, AI classification |
| **4. Network effects** | Fraud signal from one app propagates to all | Anomaly detected in one entity informs all entities in a practice/group |

**Key insight from Plaid CEO Zach Perret**: "Everything that we've launched over the last two years has been a version of an analytics product that leverages the aggregate data set that comes through the rest of the platform."

This is exactly what MoneyQuest should do: build the pipeline first, then compound intelligence on the aggregate data flowing through it.

## Three Layers of Feed

### Layer 1: Entity Feed (per-workspace data ingestion)
External data sources flowing into a specific workspace, creating journal entries:

- **Bank transactions** (primary, already built in 004-BFR / 010-PLT) — pattern matching, auto-classification
- **Vehicle valuations** (Redbook) — fleet tracking, revaluation JEs
- **Listed securities** (ASX / market data) — mark-to-market, dividend recognition
- **Property valuations** (RP Data / CoreLogic) — AVM estimates, revaluation JEs
- **Cryptocurrency** (CoinGecko / exchange APIs) — volatile asset tracking
- **Interest rates** (RBA) — accrual schedule adjustments

### Layer 2: User Feed (cross-workspace attention queue)
Aggregates items needing the user's attention across ALL their workspaces:

- Bank transactions to reconcile
- Invoices to approve
- Documents to review (AI inbox)
- Anomalies to investigate
- Feed source errors to fix
- Practice tasks assigned

### Layer 3: Intelligence Layer (analytics on aggregate data)
Products built on the data flowing through the pipeline:

- **Anomaly detection** (040-AND) — duplicate payments, unusual patterns, fraud signals
- **Benchmarking** (034-IBR) — compare entity performance against industry norms using aggregate data
- **Cash flow forecasting** (041-CFF) — predict future cash flows using historical feed data patterns
- **AI classification** — pattern matching that improves as more data flows through the system

## Cyclical Resilience

**Lesson from Plaid**: Bank transaction volume is cyclical (Plaid's new user signups "fell off a cliff" during rate hikes). But per-user-per-month revenue stayed stable.

**Implication for MoneyQuest**: Diversify feed sources early. Bank transactions are the primary feed, but asset revaluations (property, shares, vehicles) are needed regardless of economic cycles. A workspace tracking a property portfolio needs monthly valuations whether the market is up or down.

| Feed Type | Cyclical Sensitivity | Revenue Stability |
|-----------|---------------------|-------------------|
| Bank transactions | High (volume-driven) | Moderate |
| Asset prices (shares) | High (trading volume) | Moderate |
| Property valuations | Low (always need current value) | High |
| Vehicle valuations | Low (fleet management) | High |
| Interest rates | Low (rates always exist) | High |

## Pricing Implications (009-BIL)

Plaid's pricing model insight: they charge **per-action** (signup + payment) PLUS **per-user-per-month**. The per-user-per-month is the stable revenue base; per-action is the growth/cyclical component.

For MoneyQuest, consider:
- **Per-workspace subscription** (stable base) — what you pay for the ledger
- **Per-feed-source** (growth component) — each connected data source adds value
- **Per-asset-tracked** (usage component) — more assets = more revaluation = more value
- **Analytics add-ons** (premium tier) — anomaly detection, benchmarking, forecasting

## Cross-Entity Intelligence (Network Effects)

The real power emerges when the pipeline processes data across multiple entities:

- **Practice-level anomaly detection**: An accountant managing 15 SMBs can spot when one entity's spending pattern diverges from peers
- **Group consolidation**: A family office with 5 entities sees a unified net worth that auto-updates from all feed sources
- **Federated fraud signals**: If a vendor is flagged as suspicious in one entity, the signal propagates to all entities in the practice

This maps directly to existing epics:
- 028-CFT Consolidation Family Tree — group-level aggregation
- 015-ACT / 027-PMV Practice Management — practice-level visibility
- 038-FGP Family Group Portal — family-level cross-entity view

## Implementation Sequence

```
Phase 1: Pipeline Foundation (048-FPL)
├── FeedSource, FeedItem, FeedProvider abstractions
├── Generalised rules engine (extending 021-BRR)
├── Queue-based processing, retry, idempotent ingestion
└── Migrate existing bank feeds (004-BFR, 010-PLT) to be first FeedProvider

Phase 2: Entity Feed UI + User Feed (050-UAF)
├── Entity feed view with infinite scroll
├── Cross-workspace user activity feed
├── Badge counts, inline actions
└── Feed preferences and filtering

Phase 3: Asset Price Feeds (049-APF)
├── Redbook (vehicles) — simplest, monthly cadence
├── ASX / market data (equities) — daily cadence
├── RP Data (property) — monthly/quarterly cadence
└── Revaluation JE generation with configurable accounting policies

Phase 4: Intelligence Layer
├── 040-AND Anomaly detection consuming feed data
├── 034-IBR Benchmarking using aggregate patterns
├── 041-CFF Cash flow forecasting from historical feeds
└── Cross-entity pattern detection for practices/groups
```

## Competitive Reference

| Company | What they built | Lesson for MoneyQuest |
|---------|----------------|----------------------|
| **Plaid** | Bank linking → fraud/credit analytics | Pipeline first, analytics compound on top |
| **Xero** | Bank feeds + rules | Good UX but single-entity, no cross-entity intelligence |
| **Mint/Rocket Money** | Aggregation for consumers | Validated demand but couldn't monetise without the ledger |
| **Bloomberg Terminal** | Multi-source financial data feeds | Premium pricing justified by real-time data |
| **Sharesight** | Share portfolio tracking with tax reporting | Validated demand for automated revaluation |
| **myProsperity** | 27-provider wealth portal for advisers ($45B+ tracked) | Breadth of feeds but **no ledger** — just a portal. Acquired by HUB24 for ~$40M |

MoneyQuest's unique position: we have the **ledger** (double-entry, event-sourced) AND the **feed pipeline** AND **multi-entity visibility**. No one else combines all three.

### myProsperity Competitive Teardown

myProsperity connects to 27+ external providers to build a "whole of wealth" picture. Sold B2B to accounting/advisory firms as a white-label portal. $45B+ in assets tracked. **But they don't have an accounting engine** — they're a read-only wealth dashboard, not a ledger.

**What they connect to (and what MoneyQuest should prioritise):**

#### Tier 1 — High Value, JE-Generating Feeds (049-APF)
These create journal entries and directly improve the ledger:

| Source | Provider | What it does | Priority |
|--------|----------|-------------|----------|
| Bank transactions | Basiq (we use), Yodlee (they use) | **Already built** | Done |
| Property valuations | RP Data / CoreLogic | Automated AVM, revaluation JEs | P2 |
| Vehicle valuations | Redbook | Market value, revaluation JEs | P2 |
| Share prices | ASX market data | Mark-to-market, dividend recognition | P2 |
| Investment portfolios | Sharesight | Holdings, performance, dividends → JEs | P2 |
| Crypto | CoinGecko / exchange APIs | Mark-to-market (**myProsperity doesn't have this**) | P3 |
| Interest rates | RBA | Accrual schedule updates | P3 |
| SMSF admin | Class Super, BGL/Simple Fund 360 | Fund holdings, balances → JEs | P2 |

#### Tier 2 — Medium Value, Data Enrichment (future)
Useful for practice management and client onboarding but don't generate JEs:

| Source | Provider | What it does |
|--------|----------|-------------|
| Wrap platforms | HUB24, Netwealth, Macquarie, Praemium, Mason Stevens, WealthO2, CFS Edge | Portfolio data import (read-only, enrichment) |
| Financial planning | XPLAN (Iress), Midwinter AdviceOS | Client data sync (two-way) |
| Business registry | ABR | ABN lookup, entity verification |
| Company data | ASIC | Company extracts, director registry |

#### Tier 3 — Low Value, Nice-to-Have (much later)
Distribution/integration plays, not core pipeline:

| Source | Provider | What it does |
|--------|----------|-------------|
| Accounting PM | Xero Practice Manager | Client contact sync |
| Document mgmt | FYI | Document flow |
| Practice mgmt | The Access Group (HandiSoft/APS) | Client data |
| eSignatures | Annature, FuseSign, DocuSign | Signed documents |
| Insurance | MLC | Policy data (read-only) |

#### What myProsperity DOESN'T have (our gaps to exploit)
- **No ledger** — they show balances, not double-entry accounting
- **No journal entry generation** — feed data is display-only, not accounting
- **No crypto** — no digital asset tracking
- **No anomaly detection** — no intelligence on the data
- **No health scores** — no entity-level financial health assessment
- **No AI analysis** — no pulse reports, no nudges, no proactive coaching
- **No cross-entity intelligence** — no federated signals across entities
- **No rules engine** — no auto-classification of feed items

MoneyQuest with the feed pipeline + ledger + intelligence layer would subsume everything myProsperity does while adding the accounting engine they fundamentally lack.

## Additional Plaid Insights (Applied)

### Minimum Data Threshold for Intelligence Products

Plaid was explicit: "We had to get to a certain amount of scale" before analytics products worked. For MoneyQuest, each intelligence product has a minimum viable dataset:

| Product | Minimum Data | Why |
|---------|-------------|-----|
| Entity Health Score (051-EHS) | 3 months of transactions + 1 quarter P&L | Trends need at least one comparison period |
| Behavioural Nudges (052-ABN) | 3 months of categorised transactions | Averages need history to compare against |
| Pulse Reports (053-PLS) | 1 complete accounting period | Reports need at least one full period snapshot |
| Anomaly Detection (040-AND) | 6 months of data | Pattern detection needs larger sample |
| Benchmarking (034-IBR) | N/A (aggregate, not per-entity) | Works from day one using platform-wide data |

**Product implication**: Progressive unlock — show a "building your profile" state until minimum data is reached. Don't show an unreliable score and erode trust.

### Progressive Disclosure (Change Management)

Moving from manual bookkeeping to AI-powered finance is a big shift. Some users will love it, some will feel replaced. The product should progressively introduce intelligence:

```
Month 1: Feed pipeline active — bank transactions flow in, user manually classifies
Month 2: Rules suggestions appear — "Create a rule for this pattern?"
Month 3: Health score unlocks — "You now have enough data for your health score"
Month 4: Nudges begin — opt-in, start with 1-2 per week
Month 6: Pulse Reports available — first auto-generated report
```

Each layer builds on user trust established by the previous layer.

### Entity Lifecycle & Hibernation

Even dormant entities (no new transactions) retain value: tax lookback, audit compliance, benchmarking history. Consider a "hibernation" tier in billing (009-BIL) that's cheaper but retains all data and historical intelligence. The entity doesn't disappear — it just stops generating new feed items.

### CDR (Consumer Data Right) Alignment

Australia's Consumer Data Right is the equivalent of Dodd-Frank's data ownership provision that enabled Plaid. MoneyQuest should be positioned as a **CDR-aligned platform** — the tool that helps consumers exercise their right to their financial data. This is regulatory tailwind for the feed pipeline. The architecture should follow CDR-compliant data sharing standards where applicable.

### Cross-Entity Vendor Reputation

Plaid federates fraud signals across apps. MoneyQuest's equivalent: **cross-entity vendor intelligence** within a practice or group. If a vendor is flagged as problematic in one workspace (disputed invoices, returned payments, anomaly flags), that signal propagates to other workspaces. Concrete implementation within 040-AND:

- Vendor reputation score based on aggregate behaviour across entities in a practice
- "This vendor has disputed invoices in 3 of your other clients" alert
- Shared vendor blocklist at practice level

### Financial Product Graph

Plaid sees which apps consumers link to. MoneyQuest sees which **financial products** entities use (banks, investment platforms, insurance providers). This powers:

- **Advisory intelligence** — accountants see which products clients use across all entities
- **Product recommendations** — "Entities like yours typically get better rates with X"
- **Future marketplace** — connecting entities to financial products through the platform
- Maps to entity metadata captured during onboarding and bank account setup (017-BAS)
