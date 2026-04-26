---
title: "Feature Specification: Asset Price Feeds"
---

# Feature Specification: Asset Price Feeds

**Feature Branch**: `049-APF-asset-price-feeds`
**Created**: 2026-03-19
**Status**: Draft
**Epic**: 049-APF
**Initiative**: FL — Financial Ledger Platform
**Effort**: XL (6 sprints)
**Depends On**: 048-FPL (Feed Pipeline Infrastructure), 033-FAR (Fixed Asset Register), 011-MCY (Multi-Currency)

### Out of Scope

- **Real-time streaming prices** — v1 uses scheduled polling (daily/monthly), not WebSocket or streaming market data
- **Portfolio rebalancing or trade execution** — we display valuations, we don't execute trades
- **Tax lot accounting / CGT calculation engine** — Sharesight integration imports pre-calculated CGT data; MoneyQuest does not compute CGT independently in v1
- **Custom/illiquid asset valuation** — art, collectibles, private equity with no public pricing API are valued manually, not via feeds
- **Multi-provider failover per asset class** — v1 uses one provider per asset class, not redundant providers with automatic failover
- **Historical backfill on first link** — v1 starts tracking from the date an asset is linked, not retroactive price history import
- **Provider billing management** — users manage their own API keys / subscriptions with external providers

---

## Overview

The universal ledger tracks assets beyond cash — vehicles, shares, property, crypto, collectibles. These assets have market values that change over time. Asset Price Feeds connects the ledger to external pricing sources so that asset valuations stay current, revaluation journal entries are generated automatically, and users always see an accurate net worth. Each asset class has its own data provider, but all flow through the Feed Pipeline (048-FPL) for consistent ingestion, processing, and JE generation.

A personal ledger showing a house bought for $800K that's now worth $1.2M — but still showing $800K — is useless for net worth tracking. Automatic revaluation is what transforms MoneyQuest from a bookkeeping tool into a **wealth management platform**.

---

## User Scenarios & Testing

### User Story 1 — Link Asset to Price Feed (Priority: P1)

An owner has tracked assets in their ledger — a car, an investment portfolio, a rental property — but their balance sheet still shows the original purchase prices. They want to connect each asset to an external pricing source so valuations update automatically without manual journal entries every month. Today they either ignore market value changes or spend hours looking up prices and posting revaluation entries by hand.

**Why this priority**: Linking is the foundational action. No revaluation JEs, no price history, no portfolio dashboard — none of the downstream features work until a user can connect an asset to a pricing source. This is the on-ramp for the entire epic.

**Entry Points**: The "Link to Price Feed" action is available from two places: (1) the **fixed asset detail page** (natural home for vehicles, property, equipment), and (2) the **chart account detail page** (natural home for investment accounts, bank accounts, crypto wallets). Both create the same underlying AssetFeedLink — the entry point differs by asset class convention but the data model is identical.

**Independent Test**: Can be tested by creating a fixed asset (vehicle), searching the Redbook provider for a matching make/model/year, selecting it, and verifying the asset record now carries a `feed_link` with the correct provider and external identifier. Repeat for an investment chart account linked to an ASX ticker.

**Acceptance Scenarios**:

1. **Given** I have a vehicle fixed asset in my workspace, **When** I click "Link to Price Feed" on the fixed asset detail page and search for my car's make/model/year, **Then** I see matching Redbook entries and can select one to link.

2. **Given** I have an investment chart account, **When** I click "Link to Price Feed" on the chart account detail page and link individual holdings to ASX ticker symbols, **Then** each holding shows the current market price alongside my cost basis.

3. **Given** I link an asset to a price feed (from either entry point), **When** the next scheduled sync runs, **Then** a revaluation JE is created if the market value differs from book value, and the asset's current value updates on the balance sheet.

4. **Given** I have linked an asset to a provider, **When** I view the asset detail page (fixed asset or chart account), **Then** I see the linked provider name, external identifier (e.g., ticker symbol, Redbook ID), last sync date, and current market value.

5. **Given** I want to unlink an asset from a price feed, **When** I click "Unlink" on the asset detail, **Then** the feed connection is removed, no further syncs occur, and the asset retains its last known market value as book value.

6. **Given** I am on a chart account detail page for a non-asset account type (e.g., revenue, liability), **When** I look for the "Link to Price Feed" action, **Then** it is not available — only asset-type and investment-type chart accounts show the linking option.

7. **Given** I have a linked asset with active syncing, **When** I click "Pause" on the feed link, **Then** syncing stops immediately (no further scheduled syncs), the status shows "Paused", and the asset retains its last known market value. **When** I click "Resume", **Then** syncing restarts with `next_sync_at` calculated from today (no backfill of missed periods).

---

### User Story 2 — Revaluation History (Priority: P2)

A user has had their vehicle linked to Redbook for 8 months. They want to see how the car's value has trended — did it depreciate faster than expected? Did a particular model year hold value? They need a visual history of valuations over time, with each data point traceable to the journal entry that recorded the change.

**Why this priority**: History is what makes price feeds trustworthy and auditable. Without it, users see a current number with no context. With it, they can understand trends, explain movements to their accountant, and verify the system is working correctly.

**Independent Test**: Can be tested by creating a linked asset, simulating 6 monthly price syncs with varying values, and verifying the price history chart renders correctly with clickable links to the corresponding revaluation JEs.

**Acceptance Scenarios**:

1. **Given** a vehicle linked to Redbook with 6+ months of sync history, **When** I view the asset detail, **Then** I see a price history chart showing valuations over time.

2. **Given** revaluation JEs have been generated for each price change, **When** I hover or click on a data point in the history chart, **Then** I see the valuation amount, date, and a link to the corresponding journal entry.

3. **Given** a property with monthly RP Data valuations, **When** I view the 12-month history, **Then** I see the AVM estimate trend with confidence bands reflecting the provider's confidence indicator.

4. **Given** a linked asset with no price change between two sync periods, **When** I view the history, **Then** those periods still show data points (confirming the sync ran) but no JE link (since no revaluation was needed).

---

### User Story 3 — Portfolio Dashboard (Priority: P2)

An investor has shares across 3 ASX-listed companies, a rental property, a vehicle, and some crypto. Each is tracked in the ledger with price feeds. Today they must look at each asset individually to understand their total investment position. They want a single consolidated view showing all price-fed assets with current values, cost basis, and unrealised gains/losses — a snapshot of their investment portfolio health.

**Why this priority**: Individual asset tracking is useful, but the portfolio view is where the real insight lives. It answers "how are my investments performing overall?" — the question every investor asks. Without it, the price feeds are isolated data points rather than a cohesive wealth picture.

**Independent Test**: Can be tested by creating 4 assets across different classes (shares, property, vehicle, crypto), linking them to price feeds with known cost basis and current values, and verifying the portfolio dashboard sums correctly with accurate gain/loss calculations.

**Acceptance Scenarios**:

1. **Given** I have multiple assets linked to price feeds (shares, property, vehicle), **When** I view the Portfolio dashboard, **Then** I see a summary table with: asset name, asset class, cost basis, current value, unrealised gain/loss (amount and %), and date of last valuation.

2. **Given** the portfolio view, **When** I click on an asset class heading (e.g., "Listed Securities"), **Then** I drill into that class showing individual ticker performance, per-holding gain/loss, and allocation within the class.

3. **Given** multi-currency investments (e.g., USD-denominated shares), **When** viewed in AUD, **Then** FX conversion is applied using current exchange rates from 011-MCY, and both the local currency value and AUD equivalent are shown.

4. **Given** the portfolio dashboard, **When** I view the asset allocation breakdown, **Then** I see a visual chart (donut or bar) showing the proportion of total portfolio value in each asset class.

---

### User Story 4 — Revaluation Policy Configuration (Priority: P2)

An accountant managing a client's workspace needs to configure how asset revaluations are recorded in the ledger. Australian accounting standards offer choices: gains can go to an equity revaluation reserve (revaluation model) or through profit & loss (fair value model). The default should work for most users, but the accountant needs the flexibility to set policy per asset class according to the client's reporting needs.

**Why this priority**: Without configurable policies, the system must hardcode one accounting treatment — which will be wrong for some users. This is a moderate-effort feature but essential for the revaluation JEs to be correct according to each workspace's accounting approach.

**Independent Test**: Can be tested by setting two different revaluation policies on two asset classes, triggering revaluations for both, and verifying the generated JEs use the correct debit/credit accounts per the configured policy.

**Acceptance Scenarios**:

1. **Given** I am on Settings > Accounting Policies, **When** I configure revaluation policy for an asset class, **Then** I can choose between: (a) revaluation model — gains to equity revaluation reserve, losses to P&L, or (b) fair value through P&L — both gains and losses to P&L.

2. **Given** a policy is set for "Listed Securities" as fair value through P&L, **When** a revaluation JE is auto-generated for a share price increase, **Then** the JE debits the Investment Asset and credits Unrealised Gains (P&L account), matching the configured policy.

3. **Given** a policy is set for "Vehicles" as revaluation model, **When** a revaluation JE is auto-generated for a vehicle value increase, **Then** the JE debits the Vehicle Asset and credits Revaluation Reserve (equity account).

4. **Given** I change a revaluation policy mid-year, **When** new revaluations occur after the change, **Then** new JEs follow the updated policy. Previously posted JEs are not modified (immutability preserved).

---

### User Story 5 — Sharesight Portfolio Integration (Priority: P2)

An investor already tracks their share portfolio in Sharesight, which calculates cost basis, dividends, and CGT events. Rather than re-entering all of this data, they want to connect Sharesight to MoneyQuest so their investment ledger is automatically populated with holdings, valuations, dividend income, and disposal entries. This is a validated demand signal — myProsperity has this integration.

**Why this priority**: Sharesight is the dominant retail investment tracker in Australia. Integrating with it avoids the need to build our own cost basis and CGT engine — we import Sharesight's pre-calculated data. This dramatically reduces complexity while delivering the same end-user value.

**Independent Test**: Can be tested by mocking the Sharesight API to return a portfolio with 3 holdings, 2 dividends, and 1 disposal, then verifying that the correct sub-accounts, revaluation JEs, dividend income JEs, and CGT disposal JEs are created.

**Acceptance Scenarios**:

1. **Given** I connect my Sharesight account via OAuth, **When** the initial sync runs, **Then** each Sharesight holding creates or updates an investment sub-account under my parent investment account, with cost basis and current market value populated.

2. **Given** Sharesight reports a dividend event for a holding, **When** the sync processes it, **Then** a dividend income JE is created: DR Dividend Receivable, CR Dividend Income.

3. **Given** Sharesight reports a disposal (sale) event, **When** the sync processes it, **Then** a CGT disposal JE is created with cost base and sale proceeds from Sharesight's calculation.

4. **Given** the daily Sharesight sync runs, **When** holding values have changed, **Then** revaluation JEs are generated following the workspace's configured revaluation policy for listed securities.

---

### User Story 6 — SMSF Administration Integration (Priority: P2)

An SMSF trustee or their accountant uses Class Super or BGL Simple Fund 360 to administer the fund. The SMSF is a key personal ledger use case (030-PLG). They want MoneyQuest to import the fund's transactions — contributions, investment purchases/sales, pension payments, and tax provisions — so the SMSF ledger is always current without dual data entry.

**Why this priority**: SMSFs are a major target segment for the personal ledger. Class and BGL are the two dominant SMSF admin platforms in Australia. Without this integration, SMSF users must manually enter all fund transactions — a dealbreaker for adoption. myProsperity integrates with both, validating market demand.

**Independent Test**: Can be tested by mocking the Class Super API to return member contributions, an investment transaction, and a pension payment, then verifying the correct JEs are created for each transaction type.

**Acceptance Scenarios**:

1. **Given** I connect my Class Super or BGL account, **When** the initial sync runs, **Then** fund member balances, holdings, and recent transactions are imported into the workspace.

2. **Given** the sync detects a member contribution received, **When** it processes the event, **Then** a JE is created: DR Cash/Bank, CR Member Contribution (classified by contribution type — concessional/non-concessional).

3. **Given** the sync detects an investment purchase, **When** it processes the event, **Then** a JE is created: DR Investment Asset (sub-account for the specific holding), CR Cash/Bank.

4. **Given** the sync detects a pension payment, **When** it processes the event, **Then** a JE is created: DR Pension Payable, CR Cash/Bank.

5. **Given** the SMSF has multiple members (accumulation and pension phase), **When** I view reporting, **Then** I see dual reporting: member-level balances by phase and fund-level consolidated balance sheet.

---

### Edge Cases

- **Provider API unavailable**: If a provider API is down during a scheduled sync, the sync is retried with exponential backoff (3 attempts). If all retries fail, the asset retains its last known value and the user sees a "Sync failed — last updated [date]" indicator on the asset detail. Other providers and workspaces are unaffected.
- **Price feed returns zero or negative value**: The system rejects valuations of zero or negative amounts for asset classes where this is invalid (vehicles, property). For securities, zero is valid (delisted stock). A warning is logged and the user is notified to review.
- **Asset deleted while linked to feed**: Deleting a fixed asset automatically unlinks it from the price feed. No further syncs are attempted. Historical price data and JEs remain in the ledger.
- **Multiple assets linked to the same ticker/identifier**: Supported — each asset maintains its own feed link, quantity, and cost basis. A share portfolio may have multiple lots of the same ticker purchased at different prices.
- **Provider returns stale data**: If the valuation date returned by the provider is older than expected (e.g., a "daily" feed returns data from 3 days ago), the system logs a staleness warning but still processes the valuation. The staleness is visible on the asset detail.
- **Revaluation JE generation when workspace has no open accounting period**: The revaluation JE is queued and created when the next period is opened, or posted to the most recent open period if available.
- **Rate limiting**: Each provider has configurable rate limits. The sync scheduler respects these limits, spacing requests across the sync window. CoinGecko free tier (10-30 req/min) is the most constrained.
- **FX rate unavailable for multi-currency conversion**: If the exchange rate for a non-AUD asset's currency is not available on the valuation date, the system uses the most recent available rate and flags the valuation as "estimated FX".
- **Sharesight reports a corporate action (stock split, merger)**: V1 does not automatically handle corporate actions. The sync will show a valuation discrepancy. The user must manually adjust cost basis. Corporate action handling deferred to v2.
- **SMSF contribution exceeds cap**: MoneyQuest does not enforce or warn about contribution caps in v1. This is the SMSF admin platform's responsibility (Class/BGL). MoneyQuest records the transaction as reported.
- **Missing gain/loss/reserve accounts**: If a revaluation sync runs but the required gain/loss/reserve chart accounts are missing from the workspace, the revaluation JE is NOT created. The price history record is still saved (market value is known), the AssetFeedLink status is set to `error`, and the workspace owner is notified with "Revaluation pending — configure accounting policy". The JE is created on the next successful sync after accounts are configured.
- **Large price movement**: If a single sync produces a value change exceeding the configurable threshold (default 20%), the revaluation JE is created as draft instead of auto-posted, and the workspace owner is notified to review. This prevents erroneous provider data from flowing through to the balance sheet unchecked.
- **Chart account linked to feed is archived**: If a chart account with an active feed link is archived, the feed link is automatically paused. The user sees a warning before archiving. Unarchiving the account allows the user to resume the feed.
- **Sharesight OAuth token expires**: When the Sharesight OAuth refresh token expires (typically 30 days without use), the FeedSource status changes to `error` and the user is prompted to reconnect. Pending syncs are queued until reconnection. Other feed sources in the workspace are unaffected.

---

## Requirements

### Functional Requirements

**Feed Linking**
- **FR-001**: System MUST allow users to link an asset to an external pricing provider via a search interface (make/model/year for vehicles, ticker symbol for securities, address for property, token ID for crypto). The "Link to Price Feed" action MUST be available from both the fixed asset detail page and the chart account detail page (for asset-type/investment-type accounts only).
- **FR-002**: System MUST store the feed link as a relationship between the asset record and the provider, including: provider type, external identifier, sync frequency, and connection status.
- **FR-003**: System MUST allow users to unlink an asset from a price feed, retaining the last known market value as book value.
- **FR-004**: System MUST support linking multiple assets to the same external identifier (e.g., multiple lots of the same ticker).

**Revaluation JE Generation**
- **FR-005**: System MUST automatically generate revaluation JEs when a price feed sync returns a market value different from the asset's current book value.
- **FR-006**: Revaluation JE accounts MUST be determined by the workspace's configured revaluation policy for the relevant asset class.
- **FR-007**: Revaluation JEs MUST be tagged with `source_type: revaluation`, `feed_item_id`, and `asset_id` for traceability.
- **FR-008**: Revaluation JEs MUST follow the standard double-entry pattern — gain: DR Asset, CR Reserve/Income; loss: DR Reserve/Expense, CR Asset.
- **FR-009**: System MUST compare the asset's current book value (from the ledger) with the new market value (from the feed) to determine gain or loss direction and amount.

**Revaluation Policy**
- **FR-010**: System MUST support per-asset-class revaluation policy configuration with at least two options: revaluation model (gains to equity reserve, losses to P&L) and fair value through P&L (both gains and losses to P&L).
- **FR-011**: Policy changes MUST apply only to future revaluations — previously posted JEs are immutable.

**Price History & Audit**
- **FR-012**: System MUST retain all historical price data from feed syncs indefinitely for audit trail purposes.
- **FR-013**: System MUST display a price history chart on the asset detail page showing valuations over time.
- **FR-014**: Each price history data point MUST link to the corresponding revaluation JE (if one was generated).

**Portfolio Dashboard**
- **FR-015**: System MUST provide a portfolio dashboard showing all price-fed assets with: asset name, asset class, cost basis, current value, unrealised gain/loss (amount and percentage).
- **FR-016**: Portfolio dashboard MUST support drill-down by asset class to show individual asset performance.
- **FR-017**: Portfolio dashboard MUST apply FX conversion for non-AUD assets using current exchange rates from 011-MCY.
- **FR-018**: Portfolio dashboard MUST show an asset allocation breakdown visualisation.

**Provider Implementations**
- **FR-019**: Each provider MUST implement the `FeedProvider` interface from 048-FPL: `connect()`, `sync()`, `normalise()`, `getCapabilities()`.
- **FR-020**: System MUST support the following providers: Redbook (vehicles, monthly), ASX/market data (securities, daily), RP Data/CoreLogic (property, monthly/quarterly), CoinGecko (crypto, hourly/daily configurable), RBA (interest rates, on change), Sharesight (portfolios, daily), Class Super/BGL (SMSF, daily).
- **FR-021**: Provider sync frequency MUST be configurable per asset link within the bounds of the provider's capabilities.

**Sharesight Integration**
- **FR-022**: Sharesight sync MUST create/update investment sub-accounts under the parent investment account for each holding.
- **FR-023**: Sharesight dividend events MUST generate income JEs: DR Dividend Receivable, CR Dividend Income.
- **FR-024**: Sharesight disposal events MUST generate CGT JEs with cost base and proceeds from Sharesight's calculation.

**SMSF Integration**
- **FR-025**: Class Super / BGL sync MUST import member contributions, investment transactions, pension payments, and tax provisions.
- **FR-026**: Each SMSF transaction type MUST generate the appropriate JE pattern (contribution received, investment purchase/sale, pension payment, tax provision).
- **FR-027**: SMSF reporting MUST support dual views: member-level (accumulation/pension phase) and fund-level (consolidated balance sheet).

**Interest Rate Feeds**
- **FR-028**: Interest rate feeds MUST update the accrual schedule used by recurring entries (024-RPT), not generate JEs directly.
- **FR-029**: Rate changes MUST trigger recalculation of expected interest accruals on linked liability accounts (mortgages, loans) and asset accounts (term deposits).

**Safeguards & Defaults**
- **FR-030**: When a price feed sync produces a value change exceeding a configurable threshold (default: 20% per sync period per asset class), the revaluation JE MUST be created as draft (not auto-posted), and the workspace owner MUST be notified to review.
- **FR-031**: System MUST auto-create default gain/loss/reserve chart accounts (Unrealised Gains, Unrealised Losses, Asset Revaluation Reserve) when a workspace's first price feed is linked, if accounts with matching sub_types do not already exist.
- **FR-032**: The "Link to Price Feed" action on chart account detail pages MUST only be available for asset-type and investment-type chart accounts (not revenue, liability, equity, or expense accounts).
- **FR-033**: AssetFeedLink MUST support a `paused` status that stops sync scheduling without removing the link. Resuming recalculates `next_sync_at` from the current date (no backfill).

**Provider Phasing**
- **FR-034**: v1 launch MUST include at minimum: CoinGecko (crypto), ASX/market data (securities), and Redbook (vehicles). RP Data (property) and Sharesight (portfolios) are targeted for v1.1. SMSF integrations (Class Super, BGL) and RBA (interest rates) are v2.

### Key Entities

- **AssetFeedLink**: Connects an asset to an external pricing provider. Can link via a fixed asset OR a chart account (one or the other, never both). Fields: `asset_id` (nullable FK to Asset — for fixed assets like vehicles, property), `chart_account_id` (nullable FK to ChartAccount — for investment accounts, crypto wallets), `feed_source_id` (FK to FeedSource — handles sync scheduling, retries, and interval), `asset_class` (enum: vehicle, listed_security, property, cryptocurrency, term_deposit, managed_fund, other), `provider` (string: redbook, asx, rpdata, coingecko, rba, sharesight, class_super, bgl), `external_identifier` (provider-specific ID — ticker symbol, Redbook key, property address hash, token ID), `external_label` (human-readable name from provider), `last_value_cents` (most recent market value in cents), `book_value_cents` (current carrying amount in cents), `last_synced_at`, `status` (active, paused, inactive, error), `meta` (JSON — provider-specific metadata), `workspace_id`.
- **AssetPriceHistory**: Time-series record of valuations from feed syncs. Fields: `asset_feed_link_id`, `valuation_date`, `market_value_cents`, `trade_value_cents` (nullable — e.g., Redbook trade-in vs retail), `confidence` (nullable — provider's confidence indicator, e.g., RP Data AVM confidence), `journal_entry_id` (nullable FK — linked if a revaluation JE was generated), `raw_payload` (JSON — full provider response for audit), `workspace_id`.
- **RevaluationPolicy**: Per-workspace, per-asset-class accounting policy configuration. Fields: `workspace_id`, `asset_class` (enum matching asset classes), `method` (revaluation_model, fair_value_pnl), `gain_account_id` (FK to chart account for gains), `loss_account_id` (FK to chart account for losses), `reserve_account_id` (nullable FK — equity reserve account for revaluation model).
- **AssetRevaluationTransformer**: Feed pipeline transformer (plugged into 048-FPL) that handles accounting logic — compares book value to market value, applies revaluation policy, generates JE lines.

---

## Success Criteria

- **SC-001**: A price feed sync for 50 linked assets completes within 60 seconds (excluding provider API response time) without blocking user interactions.
- **SC-002**: Revaluation JEs are accurate to the cent — the JE amount exactly equals the difference between book value and new market value.
- **SC-003**: A user can link an existing fixed asset to a price feed in under 30 seconds (search, select, confirm).
- **SC-004**: The portfolio dashboard loads within 3 seconds for a workspace with up to 100 price-fed assets.
- **SC-005**: Provider API failures for one asset class do not affect syncs for other asset classes or other workspaces.
- **SC-006**: All revaluation JEs are traceable — tagged with source_type, feed_item_id, and asset_id, and filterable in reports.
- **SC-007**: Historical price data is retained indefinitely and queryable for any linked asset.
- **SC-008**: Interest rate feed changes correctly update recurring entry accrual schedules without generating erroneous JEs.

---

## Clarifications

### Session 2026-03-19

- Q: Should price feeds backfill historical data when first linked? → A: No. V1 starts tracking from the link date forward. Historical backfill adds complexity (provider rate limits, cost basis ambiguity) and is deferred.
- Q: Which provider for ASX securities? → A: Not committed to one provider yet. Alpha Vantage, Polygon, and Yahoo Finance are candidates. The `FeedProvider` interface abstracts the provider — swappable without changing the revaluation logic.
- Q: Should revaluation JEs be auto-posted or created as drafts? → A: Follow the feed pipeline convention from 048-FPL. Default behaviour is auto-post for trusted providers (Sharesight, Class/BGL) and draft for market price feeds (user reviews before posting). Configurable per provider.
- Q: How does this interact with 028-CFT consolidated net worth? → A: Price feeds update individual workspace balance sheets via revaluation JEs. The 028-CFT consolidation engine then picks up the updated balances. No direct integration needed — it flows through the existing ledger.
- Q: Should CoinGecko sync frequency be user-configurable? → A: Yes, within provider capabilities. CoinGecko supports hourly or daily. Users choose based on their needs (active traders want hourly, holders want daily). Rate limits are enforced regardless of user preference.
- Q: What happens when Sharesight and direct market data both cover the same asset? → A: If a user has Sharesight connected, Sharesight is the source of truth for holdings it tracks (it has richer data — cost basis, CGT). Direct market data feeds are for assets not in Sharesight.
- Q: Should the SMSF integration enforce contribution caps? → A: No. MoneyQuest records what the SMSF admin platform reports. Cap enforcement is the responsibility of Class/BGL. We are a ledger, not a compliance engine.

### Session 2026-03-21

**Functional Scope & Behavior**

- Q1: Where should the "Link to Price Feed" entry point live — fixed asset detail, chart account detail, or both? → A: Both. Chart accounts are the natural home for investment accounts and bank connections (the account IS the asset in the CoA). Fixed assets are the natural home for vehicles, property, and equipment (the asset register IS the asset). Both create the same underlying AssetFeedLink record. The chart account detail page only shows the option for asset-type and investment-type accounts (AccountType::Asset subtypes). This is consistent with how Basiq bank feeds already link to chart accounts via BankAccount.

- Q2: What is the default revaluation policy when a workspace has not configured one for an asset class? → A: Default to **fair value through P&L** (both gains and losses to P&L). Reasoning: this is the simpler model, produces the most intuitive balance sheet for personal users (the primary v1 audience), and matches AASB 9 default for financial instruments. The revaluation model (AASB 116/138) is the opt-in choice for accountants who need equity reserve treatment. The ProcessAssetRevaluation action already falls back to FairValuePnl when no policy is configured.

- Q3: Should the system auto-create the necessary gain/loss/reserve chart accounts when a workspace first enables price feeds, or require the user to map them manually? → A: Auto-create with sensible defaults from the CoA overlay system (similar to how bank feed accounts are seeded). Create: "Unrealised Gains" (P&L income), "Unrealised Losses" (P&L expense), and "Asset Revaluation Reserve" (equity). The user can remap them in Settings > Accounting Policies. If accounts already exist with matching sub_types (unrealised_gains, unrealised_losses, revaluation_reserve), use those rather than creating duplicates.

- Q4: What permissions control who can link/unlink assets to price feeds and who can configure revaluation policies? → A: Linking/unlinking follows existing asset permissions — users who can update a fixed asset (`asset.update`) or chart account can link/unlink. Revaluation policy configuration requires `workspace.manage` (owner/accountant only), same gate as other accounting policy settings. Revaluation JEs are system-generated and bypass the normal approval workflow (they are tagged with source_type: revaluation so auditors can filter and review them).

- Q5: When a revaluation JE is auto-generated, who is the `created_by` user? → A: System user. Revaluation JEs set `created_by` to the workspace owner (the first owner-role user) and carry `source_type: revaluation` to distinguish them from human-created entries. This mirrors how recurring entry JEs (024-RPT) handle the created_by field. The JE memo explicitly states "Asset revaluation" with the asset name and direction (gain/loss).

**Domain & Data Model**

- Q6: The AssetFeedLink model has `asset_id` (FK to Asset/fixed asset). When linking from a chart account, what does `asset_id` reference? → A: The `asset_id` column remains a nullable FK to the Asset (fixed asset register) model. When linking from a chart account, add a `chart_account_id` (nullable FK to ChartAccount) column. The link has one or the other populated — never both. This mirrors the polymorphic pattern but uses explicit FKs for query performance and referential integrity. The AssetFeedLink entity description in the spec should be updated to include `chart_account_id`.

- Q7: The existing Asset model uses `asset_account_id` to reference a chart account, but ProcessAssetRevaluation references `$asset->chart_account_id` — which field is the correct one for determining the JE debit/credit account? → A: The correct field is `asset_account_id` on the Asset model. ProcessAssetRevaluation has a bug — it should use `$asset->asset_account_id`. When the link is via chart_account_id directly (no fixed asset), the chart_account_id on the AssetFeedLink IS the asset account for the JE. The action should check `$link->asset?->asset_account_id ?? $link->chart_account_id` to resolve the correct account.

- Q8: The spec entity description for AssetFeedLink lists `sync_frequency` as a field, but the actual model uses `feed_source_id` (FK to FeedSource) and sync frequency lives on FeedSource. Which is canonical? → A: The FeedSource model is canonical. AssetFeedLink does NOT store sync_frequency directly — it delegates to the linked FeedSource record (which has `sync_interval_minutes` and `next_sync_at`). The spec entity description should be corrected to show `feed_source_id` instead of `sync_frequency`. This is the right design: FeedSource already handles scheduling, retries, and the SyncDueFeeds command.

- Q9: Should AssetPriceHistory records be soft-deleted or hard-deleted when an asset is unlinked? → A: Never deleted. Price history is retained indefinitely per FR-012, even after unlinking. The UnlinkAssetFromFeed action already correctly marks the link as inactive without touching history. This supports audit trail requirements and allows users to view historical valuations for assets they later unlink.

**User Journeys & Flows**

- Q10: When a user clicks "Link to Price Feed", how does the search interface adapt to different asset classes? What if the asset class is ambiguous? → A: The search interface presents a provider picker first (e.g., "What type of asset?": Vehicle / Listed Security / Property / Crypto / Managed Fund / Term Deposit). Once the type is selected, the search fields adapt: vehicles show make/model/year dropdowns (Redbook), securities show a ticker search bar (ASX), property shows an address search (RP Data), crypto shows a token search (CoinGecko). The asset class is inferred from the fixed asset's AssetCategory/AssetType if linking from a fixed asset, or from the chart account's sub_type if linking from a chart account. The user can override the inferred class.

- Q11: For listed securities, does each individual holding (e.g., 100 shares of BHP) need its own fixed asset record, or can one chart account hold multiple tickers? → A: One chart account (e.g., "Share Portfolio - ASX") can have **multiple AssetFeedLinks**, one per ticker. Each link tracks its own external_identifier, book_value_cents, and last_value_cents independently. This avoids forcing users to create dozens of fixed asset records for a diversified portfolio. The portfolio dashboard aggregates across all links. This is already supported by FR-004 and the existing data model.

**Non-Functional Quality**

- Q12: How should the system handle multi-tenant sync scheduling to avoid thundering herd problems (all workspaces syncing at the same time)? → A: The SyncDueFeeds command already queries FeedSource records by `next_sync_at <= now()`. When creating a new AssetFeedLink, the `next_sync_at` on the FeedSource should be jittered by a random offset (0-60 minutes for daily feeds, 0-7 days for monthly feeds) to spread load. This is an implementation detail but the spec should document the performance requirement: SC-001 already covers this (50 assets in 60 seconds), and SC-005 covers isolation. No spec change needed, but the edge case for rate limiting should note the jitter strategy.

- Q13: What is the data retention policy for raw_payload on AssetPriceHistory? It could grow large over years. → A: Retain raw_payload for 24 months, then prune to keep only the normalised fields (market_value_cents, trade_value_cents, confidence). This balances audit requirements with storage costs. The pruning is a background job, not user-facing. Add this as an operational note rather than a functional requirement — it does not affect v1 behaviour since raw data is useful for debugging during the initial rollout.

**Integration & Dependencies**

- Q14: How does the Sharesight OAuth flow work in a multi-tenant context? Is the OAuth token stored per-workspace or per-user? → A: Per-workspace, on the FeedSource `config` column (which is already encrypted via `encrypted:array` cast). One Sharesight connection per workspace. If the connecting user leaves the workspace, the connection persists (it belongs to the workspace, not the user). This matches the Basiq bank feed pattern where the FeedSource stores the connection config. The Sharesight OAuth callback should validate the workspace context before storing tokens.

- Q15: The spec lists "Class Super/BGL" as a single provider, but these are two separate platforms with different APIs. Should they be separate FeedProvider implementations? → A: Yes, separate implementations: `ClassSuperFeedProvider` and `BglFeedProvider`. They share the same FeedSourceType (SmsfAdmin) and generate the same JE patterns, but they have different authentication flows and API schemas. The FeedProviderRegistry resolves the correct provider by the `provider` string on FeedSource/AssetFeedLink. FR-020 should list them as separate entries. This is the right design because Class and BGL have different market positions and API maturity.

**Edge Cases & Failure Handling**

- Q16: What happens when a revaluation sync produces a value change but the workspace's chart of accounts is missing the required gain/loss/reserve accounts? → A: The revaluation JE creation should fail gracefully — log an error, mark the sync as requiring attention (status: `error` on the AssetFeedLink), and notify the workspace owner. The price history record is still created (the market value IS known), but no JE is posted. The user sees "Revaluation pending — configure accounting policy" on the asset detail. This prevents posting JEs to nonexistent accounts, which would corrupt the trial balance.

- Q17: If a provider changes its pricing methodology (e.g., Redbook changes how it values a vehicle model), the market value might jump significantly between syncs. Should the system flag large movements? → A: Yes. Add a configurable threshold per asset class (default: 20% movement in a single sync period). If the price change exceeds the threshold, the revaluation JE is created as **draft** instead of auto-posted, and the user is notified to review. This prevents large erroneous revaluations from flowing through to the balance sheet unchecked. Add this as FR-030.

**Constraints & Tradeoffs**

- Q18: Should v1 support pausing a price feed (temporarily stopping syncs without unlinking)? → A: Yes. The AssetFeedLink already has a `status` field and the FeedSource has a status enum including Active/Disconnected. Add a `paused` status to AssetFeedLink. When paused, the linked FeedSource is also paused (no sync scheduling). The user can resume, which reactivates the FeedSource and recalculates next_sync_at from the current date (no backfill, matching the existing pattern from recurring templates 024-RPT). Add AC to Story 1.

- Q19: The spec lists 7+ providers. What is the v1 launch minimum? Can we ship with a subset? → A: v1 launch minimum is **3 providers**: CoinGecko (crypto, simplest API, no auth), ASX/market data (securities, core use case), and Redbook (vehicles, validated Australian demand). Property (RP Data) and Sharesight are fast-follows in v1.1. SMSF integrations (Class/BGL) and RBA interest rates are v2. The FeedProvider interface ensures adding providers later is additive, not disruptive. FR-020 should note the phased rollout.

**Terminology & Consistency**

- Q20: The spec uses both "book value" and "cost basis" in different places. Are they the same thing, or distinct concepts? → A: They are **distinct**. Cost basis is the original purchase price (what you paid). Book value is the current carrying amount on the balance sheet (cost basis adjusted for depreciation and prior revaluations). For a new asset with no depreciation or revaluation, they are equal. After a revaluation JE, book value changes but cost basis does not. The portfolio dashboard shows both: "cost basis" (original purchase) and "current value" (latest market value). Unrealised gain/loss is current value minus **cost basis** (not book value) for investment performance reporting, but revaluation JE amount is based on current value minus **book value** (to avoid double-counting prior revaluations). The spec should consistently use "cost basis" for purchase price and "book value" for current carrying amount.
