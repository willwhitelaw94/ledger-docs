---
title: "Feature Specification: Sharesight Integration"
---

# Feature Specification: Sharesight Integration

**Feature Branch**: `054-SSI-sharesight-integration`
**Created**: 2026-03-19
**Status**: Draft
**Epic**: 054-SSI
**Initiative**: FL-financial-ledger
**Effort**: Large (3-4 weeks)
**Depends On**: 048-FPL (Feed Pipeline Infrastructure), 002-CLE (Core Ledger Engine), 011-MCY (Multi-Currency)

## Out of Scope

- **Manual trade entry** — this epic covers Sharesight-synced data only; manual investment journal entries use the existing JE creation flow.
- **Broker integration** — we do not connect to brokers (CommSec, Interactive Brokers) directly; Sharesight is the aggregator.
- **Tax return lodgement** — CGT data flows into MoneyQuest reports but we do not lodge tax returns.
- **Real-time price streaming** — daily polling only; intraday price updates are out of scope for v1.
- **Multi-portfolio consolidation reporting** — v1 shows each portfolio individually; cross-portfolio roll-up is future work.
- **Sharesight V3 API migration** — we use V2 endpoints with V3 only where V2 is unavailable; full V3 migration is future.
- **Custom/unlisted instrument support** — v1 covers exchange-listed instruments only; custom holdings (private equity, unlisted trusts) are deferred.

## Overview

Sharesight is the dominant investment portfolio tracker in Australia — 700K+ instruments across 60+ exchanges, with cost basis tracking, CGT calculations, dividend history, and performance reporting. This epic connects Sharesight to MoneyQuest's feed pipeline so that investment portfolios automatically generate journal entries: mark-to-market revaluations, dividend income recognition, and capital gains/losses on disposal.

This is the first non-bank `FeedProvider` on the pipeline, proving the architecture generalises beyond bank transactions. For the universal ledger vision, this is the second asset class (after bank accounts) that gets automated feed-driven journal entries.

### Why This Matters

An investor tracking $2M in shares on Sharesight and bookkeeping in MoneyQuest currently has no connection between the two. They manually enter investment purchases, dividend income, and revaluations — or don't, and their balance sheet is wrong. This integration eliminates manual data entry for the entire investment lifecycle.

### Sharesight API Summary

| Aspect | Detail |
|--------|--------|
| **Auth** | OAuth 2.0 Authorization Code grant. 30-min access tokens with refresh. |
| **Base URL** | `https://api.sharesight.com/api/v2/` (V3 for some endpoints) |
| **Rate limits** | 360 req/min, 3 concurrent for report endpoints |
| **Webhook support** | None — polling only |
| **Market coverage** | 60+ exchanges globally, 700K+ instruments. ASX, NYSE, LSE, plus crypto + custom. |
| **Access** | Apply via `api@sharesight.com`. Sandbox available for dev. Partner program for production. |

### Key Endpoints

| Endpoint | Purpose | JE Impact |
|----------|---------|-----------|
| `GET /portfolios` | List user's portfolios | Map to MoneyQuest investment accounts |
| `GET /portfolios/:id/holdings` | Holdings with quantities | Current positions |
| `GET /portfolios/:id/valuation.json` | Current market values per holding | **Revaluation JEs** — compare to book value |
| `GET /portfolios/:id/performance.json` | Money-weighted returns, total gain/loss | Dashboard reporting |
| `GET /portfolios/:id/capital_gains.json` | Realised CGT events (AU) | **Disposal JEs** — cost base vs proceeds |
| `GET /portfolios/:id/payouts` | Dividends and distributions | **Dividend income JEs** |
| `GET /holdings/:id/trades` | Trade history (buy/sell) | **Purchase/sale JEs** |
| `GET /portfolios/:id/unrealised_cgt` | Unrealised gains per holding | Balance sheet reporting |

## User Scenarios & Testing

### User Story 1 — Connect Sharesight Portfolio (Priority: P1)

A user managing investments in Sharesight wants to link their account to MoneyQuest so that portfolio data flows automatically into their ledger. Without this connection, investment purchases, dividends, and revaluations must be entered manually — or the balance sheet stays incomplete.

**Why this priority**: OAuth connection is the gateway to all other functionality. Nothing works without it.

**Independent Test**: Can be tested by navigating to Settings > Feeds, initiating Sharesight OAuth, authorising, and verifying portfolios appear for selection.

**Acceptance Scenarios**:

1. **Given** I am on Settings > Feeds, **When** I click "Add Feed Source" and select "Sharesight", **Then** I am redirected to Sharesight's OAuth consent page.
2. **Given** I authorise on Sharesight, **When** I'm redirected back, **Then** I see my Sharesight portfolios listed and can select which to sync.
3. **Given** I select a portfolio, **When** the initial sync runs, **Then** all current holdings appear as feed items with their market values and cost basis.
4. **Given** I have already connected a portfolio, **When** I return to Settings > Feeds, **Then** I see the connected portfolio with its last sync timestamp and status (Connected, Syncing, Error).
5. **Given** my OAuth token has been revoked on Sharesight, **When** the next sync attempts, **Then** the feed source status changes to "Disconnected" with a "Reconnect" button.

---

### User Story 2 — Automated Revaluation JEs (Priority: P1)

An investor wants their share portfolio's book value to automatically update when market prices change, so the balance sheet reflects fair value without manual journal entries. This is the core value proposition — a living balance sheet.

**Why this priority**: Revaluation is the most frequent JE type from this integration (daily for every holding) and the primary driver of balance sheet accuracy.

**Independent Test**: Can be tested by running a daily sync on a connected portfolio and verifying revaluation JEs are created with correct debit/credit amounts matching the market value delta.

**Acceptance Scenarios**:

1. **Given** a Sharesight portfolio is synced, **When** the daily sync runs and BHP's market value increased from $45.20 to $46.80 per share (500 shares held), **Then** a revaluation JE is created: DR Investment Asset $800, CR Unrealised Gains $800.
2. **Given** a holding's value decreased, **When** the sync processes it, **Then** the opposite JE: DR Unrealised Losses, CR Investment Asset.
3. **Given** the revaluation policy is "Fair value through P&L", **When** a revaluation JE is created, **Then** gains/losses go to P&L accounts (not equity reserves).
4. **Given** a holding's market value has not changed since the last sync, **When** the daily sync runs, **Then** no revaluation JE is created for that holding (avoid zero-value entries).

---

### User Story 3 — Dividend Income Recognition (Priority: P1)

A user wants dividend payments to automatically create income journal entries, capturing both the amount and Australian franking credit metadata for tax reporting purposes.

**Why this priority**: Dividends are a frequent, high-value event for investors. Missing them understates income and breaks tax reporting.

**Independent Test**: Can be tested by verifying that a new payout in Sharesight creates a corresponding dividend income JE with correct amounts and franking metadata.

**Acceptance Scenarios**:

1. **Given** BHP declares a $1.50/share dividend on 500 shares, **When** the payout appears in Sharesight, **Then** a JE is created: DR Dividend Receivable $750, CR Dividend Income $750.
2. **Given** the dividend is franked at 100% (AU), **When** the JE is created, **Then** the franking credit amount is recorded in the JE metadata for tax reporting.
3. **Given** a distribution (not dividend) from a managed fund, **When** processed, **Then** the JE uses the appropriate distribution income account.
4. **Given** a dividend that has already been synced (matching external_id), **When** the next sync runs, **Then** no duplicate JE is created.

---

### User Story 4 — Trade Purchase/Sale JEs (Priority: P2)

A user wants buy and sell trades to automatically create journal entries, including brokerage fees as a separate line item. This captures the full investment lifecycle from purchase through disposal.

**Why this priority**: Trades are less frequent than revaluations but critical for cost basis accuracy and capital gains tracking. P2 because the revaluation JEs already capture the portfolio's current value.

**Independent Test**: Can be tested by triggering a trade sync and verifying the resulting JE has correct lines for the asset, cash, brokerage, and (for sales) realised gain/loss.

**Acceptance Scenarios**:

1. **Given** I bought 200 BHP shares at $45.00, **When** the trade syncs, **Then** a JE is created: DR Investment Asset $9,000, CR Bank/Cash $9,000 (plus brokerage as a separate line).
2. **Given** I sold 100 BHP shares at $48.00 (cost base $45.00), **When** the trade syncs, **Then** a disposal JE: DR Bank/Cash $4,800, CR Investment Asset $4,500, CR Realised Capital Gain $300.
3. **Given** a sale results in a loss, **When** processed, **Then** DR Realised Capital Loss instead of CR Gain.
4. **Given** a trade with brokerage of $19.95, **When** the JE is created, **Then** brokerage appears as a separate DR line to Brokerage Expense.

---

### User Story 5 — Portfolio Dashboard (Priority: P2)

An investor wants a consolidated view of their Sharesight-synced holdings within MoneyQuest, showing positions, performance, and unrealised gains without switching to Sharesight.

**Why this priority**: The dashboard is a read-only view that adds user value but does not affect ledger accuracy. JE generation (P1) must work first.

**Independent Test**: Can be tested by connecting a portfolio and navigating to the investment account to verify the holdings table renders with correct data.

**Acceptance Scenarios**:

1. **Given** a portfolio is synced, **When** I view the investment account, **Then** I see a holdings table: ticker, name, quantity, cost basis, current value, unrealised gain/loss, return %.
2. **Given** multiple portfolios are synced, **When** I view the portfolio summary, **Then** I see total market value, total cost basis, total unrealised gain/loss, and allocation by sector.
3. **Given** a holding was sold (quantity = 0), **When** I view the holdings table, **Then** it does not appear in current holdings but is visible in the trade history.

---

### User Story 6 — CGT Report Data (Priority: P3)

An accountant wants CGT event data from Sharesight to feed into tax reporting, pulling realised capital gains/losses with full cost base and method detail.

**Why this priority**: CGT reporting is tax-time specific (annual), not daily. The data flows from Sharesight's own CGT engine, which is already authoritative.

**Independent Test**: Can be tested by verifying CGT events from Sharesight appear in MoneyQuest's CGT section with correct fields and that they flow into BAS/tax reports.

**Acceptance Scenarios**:

1. **Given** the financial year has realised CGT events, **When** I view the CGT section, **Then** I see events pulled from Sharesight's `capital_gains.json` with: ticker, purchase date, sale date, cost base, proceeds, gain/loss, CGT method.
2. **Given** CGT events exist, **When** I generate BAS/tax reports, **Then** the capital gains data is included automatically.
3. **Given** a CGT event uses FIFO method, **When** displayed, **Then** the method is labelled clearly alongside the cost base calculation.

---

### User Story 7 — Account Mapping Configuration (Priority: P1)

A user wants to configure which chart of accounts are used for investment-related journal entries, so the integration maps to their specific account structure.

**Why this priority**: Without correct account mapping, all auto-generated JEs would post to wrong accounts, making the integration useless. Must be configured during initial setup.

**Independent Test**: Can be tested by navigating to Settings > Feeds > Sharesight and verifying all six account mappings are configurable with sensible defaults.

**Acceptance Scenarios**:

1. **Given** I have connected a Sharesight portfolio, **When** I view Settings > Feeds > Sharesight, **Then** I see configurable account mappings for: Investment Asset, Unrealised Gains, Realised Gains, Dividend Income, Brokerage Expense, and Cash/Bank.
2. **Given** I have not configured account mappings, **When** the first sync runs, **Then** default accounts are used (as defined in the CoA template) and a notification prompts me to review mappings.
3. **Given** I change the Unrealised Gains account from P&L to equity, **When** the next revaluation sync runs, **Then** future revaluation JEs use the new account (existing JEs are unaffected).

---

### Edge Cases

- **Sharesight API is down during sync**: Existing data remains unaffected. Sync retries on next scheduled run. Feed source status shows "Sync Failed" with timestamp and retry indicator.
- **Token refresh fails (revoked)**: Feed source status set to "Disconnected". User sees a "Reconnect" action in the feed and in Settings. No further syncs until re-authenticated.
- **Holding delisted or suspended**: Sharesight still returns it with last known price. Revaluation continues using that price. A note is attached to the feed item indicating the instrument is suspended.
- **Duplicate feed items on re-sync**: External IDs (`val_12345_2026-03-19`, `trade_67890`, `payout_11111`) prevent duplicate JE creation. Idempotent by design.
- **Foreign-denominated holdings (e.g., NYSE in USD)**: Multi-currency support (011-MCY) converts to workspace base currency using the exchange rate on the transaction date.
- **Portfolio with 200+ holdings**: Daily sync must complete within 60 seconds. Batch API calls where possible; respect 360 req/min and 3 concurrent report request limits.
- **Zero-quantity holdings after full disposal**: Excluded from revaluation JEs. Appear in trade history only.
- **Fractional shares**: Amounts stored in cents (integers). Quantity stored as decimal to support fractional positions. Price × quantity calculated server-side.
- **Workspace has no investment-related chart accounts**: Default accounts are seeded from the CoA template on first connection. User prompted to review.
- **Multiple portfolios mapped to same workspace**: Each portfolio creates its own feed source. JEs are tagged with the portfolio name for traceability.

## Data Flow

```
Sharesight Account
    | (OAuth 2.0)
FeedSource (type=investment_portfolio, provider=sharesight)
    | (daily poll)
SharesightFeedProvider.fetch()
    |
    |-- Fetch holdings + valuation -> FeedItems (type=investment_portfolio)
    |-- Fetch new trades since last sync -> FeedItems
    |-- Fetch new payouts since last sync -> FeedItems
    |-- Fetch CGT events -> FeedItems
    |
FeedItems with normalised_payload:
    |-- { subtype: 'valuation', ticker, quantity, market_value, cost_base, unrealised_gain }
    |-- { subtype: 'trade', ticker, direction: 'buy'|'sell', quantity, price, total, date }
    |-- { subtype: 'payout', ticker, type: 'dividend'|'distribution', amount, date, franking }
    |-- { subtype: 'cgt_event', ticker, proceeds, cost_base, gain_loss, method, date }
    |
FeedRules (type=investment_portfolio) classify -> target accounts
    |
JE Generation:
    |-- Revaluation: DR/CR Investment Asset <-> Unrealised Gains
    |-- Purchase: DR Investment Asset, CR Bank/Cash
    |-- Sale: DR Bank/Cash, CR Investment Asset, DR/CR Realised Gain/Loss
    |-- Dividend: DR Dividend Receivable/Cash, CR Dividend Income
    |-- CGT: Tagged with CGT method (FIFO/LIFO/etc.) for tax reporting
```

## Architecture

### SharesightFeedProvider

```php
class SharesightFeedProvider implements FeedProviderInterface
{
    public function identifier(): string { return 'sharesight'; }
    public function feedType(): FeedSourceType { return FeedSourceType::InvestmentPortfolio; }

    public function capabilities(): FeedProviderCapabilities
    {
        return new FeedProviderCapabilities(
            supports_webhook: false,
            supports_historical: true,
            min_interval: 'daily',
            auth_type: 'oauth',
        );
    }

    public function connect(FeedSource $source, array $params): array
    {
        // OAuth 2.0 Authorization Code flow
        // 1. Redirect to https://api.sharesight.com/oauth2/authorize
        // 2. Exchange code for access_token + refresh_token
        // 3. Store tokens in FeedSource.config (encrypted)
        // 4. Fetch portfolios, let user select which to sync
    }

    public function fetch(FeedSource $source, ?Carbon $since = null): array
    {
        $client = $this->authenticatedClient($source);
        $portfolioId = $source->config['portfolio_id'];

        $items = [];

        // 1. Valuation (current market values)
        $valuation = $client->get("/portfolios/{$portfolioId}/valuation.json");
        foreach ($valuation['holdings'] as $holding) {
            $items[] = [
                'type' => 'valuation',
                'external_id' => "val_{$holding['id']}_{$valuation['date']}",
                'data' => $holding,
            ];
        }

        // 2. New trades since last sync
        foreach ($this->fetchNewTrades($client, $portfolioId, $since) as $trade) {
            $items[] = [
                'type' => 'trade',
                'external_id' => "trade_{$trade['id']}",
                'data' => $trade,
            ];
        }

        // 3. New payouts since last sync
        foreach ($this->fetchNewPayouts($client, $portfolioId, $since) as $payout) {
            $items[] = [
                'type' => 'payout',
                'external_id' => "payout_{$payout['id']}",
                'data' => $payout,
            ];
        }

        return $items;
    }

    public function normalise(array $rawItem): array
    {
        return match ($rawItem['type']) {
            'valuation' => $this->normaliseValuation($rawItem['data']),
            'trade' => $this->normaliseTrade($rawItem['data']),
            'payout' => $this->normalisePayout($rawItem['data']),
            default => throw new \InvalidArgumentException("Unknown item type: {$rawItem['type']}"),
        };
    }
}
```

### Normalised Payload Shapes

```
Valuation:
{
    external_id: "val_12345_2026-03-19",
    subtype: "valuation",
    date: "2026-03-19",
    ticker: "BHP.AX",
    instrument_name: "BHP Group Limited",
    quantity: 500,
    market_value: 2340000,      // cents
    cost_base: 2260000,         // cents
    unrealised_gain: 80000,     // cents
    currency: "AUD",
    description: "BHP.AX valuation — 500 shares @ $46.80"
}

Trade:
{
    external_id: "trade_67890",
    subtype: "trade",
    date: "2026-03-18",
    ticker: "BHP.AX",
    direction: "buy" | "sell",
    quantity: 200,
    price: 4520,                // cents per share
    amount: 904000,             // total cents
    brokerage: 1995,            // cents
    description: "Buy 200 BHP.AX @ $45.20"
}

Payout:
{
    external_id: "payout_11111",
    subtype: "payout",
    date: "2026-03-15",
    ticker: "BHP.AX",
    payout_type: "dividend" | "distribution",
    amount: 75000,              // cents
    franking_percentage: 100,   // AU franking credits
    description: "BHP.AX dividend — $1.50 x 500 shares"
}
```

### JE Generation Rules

The `TransformFeedItem` action (from 048-FPL) will be extended with investment-specific transforms:

| Subtype | Debit | Credit | Notes |
|---------|-------|--------|-------|
| **Valuation (gain)** | Investment Asset | Unrealised Gains (P&L or equity) | Configurable per workspace accounting policy |
| **Valuation (loss)** | Unrealised Losses | Investment Asset | |
| **Trade (buy)** | Investment Asset | Bank/Cash + Brokerage Expense | Brokerage as separate line |
| **Trade (sell)** | Bank/Cash | Investment Asset + Realised Gain/Loss | Cost base from Sharesight |
| **Payout (dividend)** | Dividend Receivable | Dividend Income | Franking metadata attached |
| **Payout (distribution)** | Distribution Receivable | Distribution Income | |

### Account Mapping

Users configure which chart accounts to use in Settings > Feeds > Sharesight:

| Purpose | Default Account | Configurable |
|---------|----------------|-------------|
| Investment Asset | Investments at Fair Value (asset) | Yes |
| Unrealised Gains | Unrealised Gains on Investments (P&L or equity) | Yes |
| Realised Gains | Realised Capital Gains (P&L) | Yes |
| Dividend Income | Dividend Income (revenue) | Yes |
| Brokerage Expense | Brokerage & Trading Fees (expense) | Yes |
| Cash/Bank (for trades) | Linked bank account | Yes |

### Token Refresh

Sharesight tokens expire in 30 minutes. The `SharesightFeedProvider` handles this transparently:

1. Before each API call, check if token is expired (stored `expires_at` in FeedSource.config)
2. If expired, use refresh_token to get new access_token
3. Update FeedSource.config with new tokens
4. If refresh fails (revoked), set FeedSource status to Disconnected

## Requirements

### Functional Requirements

**OAuth Connection & Feed Source**
- **FR-001**: System MUST implement OAuth 2.0 Authorization Code flow for Sharesight, redirecting users to Sharesight's consent page and exchanging the code for access + refresh tokens.
- **FR-002**: System MUST store OAuth tokens (encrypted) in `FeedSource.config` and transparently refresh expired access tokens using the refresh token before each API call.
- **FR-003**: System MUST set FeedSource status to "Disconnected" when token refresh fails and surface a "Reconnect" action to the user.
- **FR-004**: System MUST allow users to select which Sharesight portfolio(s) to sync after OAuth authorisation, creating one FeedSource per portfolio.
- **FR-005**: System MUST implement `SharesightFeedProvider` conforming to `FeedProviderInterface` from 048-FPL with `identifier: 'sharesight'`, `feedType: InvestmentPortfolio`, `auth_type: 'oauth'`, `supports_webhook: false`.

**Daily Sync & Feed Items**
- **FR-006**: System MUST run a daily sync for each connected portfolio, fetching valuations, new trades, new payouts, and CGT events since the last sync.
- **FR-007**: System MUST normalise all Sharesight API responses into typed feed items with subtypes: `valuation`, `trade`, `payout`, `cgt_event`.
- **FR-008**: System MUST store all raw Sharesight API responses as `raw_payload` on the feed item for audit trail.
- **FR-009**: System MUST use external IDs (`val_{id}_{date}`, `trade_{id}`, `payout_{id}`) to prevent duplicate feed item creation on re-sync.
- **FR-010**: System MUST store all monetary amounts as integers (cents), consistent with the ledger convention.

**JE Generation — Revaluations**
- **FR-011**: System MUST create revaluation JEs when a holding's market value differs from its book value: DR Investment Asset / CR Unrealised Gains for gains, reversed for losses.
- **FR-012**: System MUST support configurable revaluation policy — fair value through P&L (default) or fair value through equity reserves — per workspace.
- **FR-013**: System MUST NOT create revaluation JEs when the market value is unchanged since last sync.

**JE Generation — Trades**
- **FR-014**: System MUST create purchase JEs for buy trades: DR Investment Asset, CR Bank/Cash, with brokerage as a separate DR line to Brokerage Expense.
- **FR-015**: System MUST create disposal JEs for sell trades: DR Bank/Cash, CR Investment Asset, DR/CR Realised Capital Gain/Loss (cost base sourced from Sharesight).

**JE Generation — Payouts**
- **FR-016**: System MUST create dividend income JEs: DR Dividend Receivable, CR Dividend Income.
- **FR-017**: System MUST record franking credit percentages and amounts in JE metadata for Australian tax reporting.
- **FR-018**: System MUST distinguish dividends from distributions and use separate income accounts for each.

**Account Mapping**
- **FR-019**: System MUST provide configurable account mappings for: Investment Asset, Unrealised Gains, Realised Gains, Dividend Income, Brokerage Expense, and Cash/Bank.
- **FR-020**: System MUST seed default investment accounts from the CoA template when a Sharesight feed source is first connected.
- **FR-021**: System MUST allow account mapping changes to apply to future JEs only (existing JEs are immutable).

**Portfolio Dashboard**
- **FR-022**: System MUST display a holdings table on the investment account page showing: ticker, name, quantity, cost basis, current value, unrealised gain/loss, return %.
- **FR-023**: System MUST display portfolio summary with total market value, total cost basis, total unrealised gain/loss, and sector allocation.

**CGT Reporting**
- **FR-024**: System MUST pull CGT event data from Sharesight's `capital_gains.json` endpoint including: ticker, purchase date, sale date, cost base, proceeds, gain/loss, CGT method.
- **FR-025**: System MUST include CGT data in BAS/tax report generation.

**Rate Limiting & Resilience**
- **FR-026**: System MUST respect Sharesight's rate limits: 360 requests/minute and maximum 3 concurrent report endpoint requests.
- **FR-027**: System MUST gracefully handle Sharesight API downtime — existing data remains unaffected, sync retries on next schedule.

### Key Entities

- **FeedSource** (existing, from 048-FPL): Extended with `type=investment_portfolio`, `provider=sharesight`. Config stores encrypted OAuth tokens (`access_token`, `refresh_token`, `expires_at`), selected `portfolio_id`, and account mapping overrides.
- **FeedItem** (existing, from 048-FPL): Normalised payload with `subtype` field (`valuation`, `trade`, `payout`, `cgt_event`). External ID ensures idempotency. Raw Sharesight response stored in `raw_payload`.
- **SharesightAccountMapping**: Per-workspace configuration linking purposes (investment asset, unrealised gains, realised gains, dividend income, brokerage expense, cash/bank) to chart account IDs. Defaults seeded from CoA template.
- **Normalised Payloads**: Typed structures for each subtype — Valuation (ticker, quantity, market_value, cost_base, unrealised_gain, currency), Trade (ticker, direction, quantity, price, amount, brokerage), Payout (ticker, payout_type, amount, franking_percentage).

## Dependencies

- **048-FPL** Feed Pipeline Infrastructure — this is a FeedProvider plugin; `SharesightFeedProvider` implements `FeedProviderInterface`
- **002-CLE** Core Ledger Engine — JE creation for all generated entries
- **011-MCY** Multi-Currency — foreign-denominated holdings (NYSE, LSE) need FX conversion to workspace base currency
- **033-FAR** Fixed Asset Register — optional linkage of investment holdings as asset records (future enhancement)
- **007-FRC** Financial Reporting — revaluations affect P&L and balance sheet reports

## Success Criteria

- **SC-001**: A connected Sharesight portfolio with 50 holdings completes daily sync and generates all revaluation JEs within 30 seconds.
- **SC-002**: A portfolio with 200 holdings completes daily sync within 60 seconds.
- **SC-003**: Zero duplicate JEs created across 30 consecutive daily syncs (external ID idempotency verified).
- **SC-004**: OAuth token refresh is transparent — zero user interventions required over a 90-day period with active tokens.
- **SC-005**: All six JE subtypes (valuation gain, valuation loss, buy, sell, dividend, distribution) produce balanced double-entry JEs that pass ledger validation.
- **SC-006**: Revaluation JE amounts match Sharesight's reported market value delta to the cent.
- **SC-007**: Franking credit metadata is present on 100% of franked dividend JEs.
- **SC-008**: Sharesight API rate limits (360 req/min, 3 concurrent reports) are never exceeded during sync.

## Non-Functional Requirements

- Daily sync must complete within 60 seconds for a portfolio with up to 200 holdings.
- OAuth token refresh must be transparent — no user action required.
- Rate limiting: respect 360 req/min and 3 concurrent report requests.
- All Sharesight API responses stored as raw_payload for audit trail.
- Graceful degradation: if Sharesight API is down, existing data remains unaffected, sync retries on next schedule.

## Clarifications

### Session 2026-03-19

- Q: Is this a new FeedProvider or a standalone integration? A: **FeedProvider plugin on 048-FPL.** `SharesightFeedProvider` implements `FeedProviderInterface`. This is the first non-bank provider, proving the pipeline generalises.
- Q: How often does sync run? A: **Daily polling.** Sharesight has no webhook support. Daily is sufficient for end-of-day valuations. Intraday price streaming is out of scope for v1.
- Q: What happens to existing JEs when account mappings change? A: **Future JEs only.** Existing JEs are immutable (reversal-only corrections). Account mapping changes apply from the next sync onward.
- Q: How are foreign-denominated holdings handled? A: **Multi-currency (011-MCY).** Holdings in USD, GBP, etc. are converted to workspace base currency using the exchange rate on the transaction date.
- Q: What CGT method does MoneyQuest use? A: **Sharesight's CGT engine is authoritative.** We pull the method (FIFO, LIFO, specific identification) and cost base from Sharesight — MoneyQuest does not recalculate CGT.
- Q: Revaluation policy — P&L or equity? A: **Configurable per workspace.** Default is fair value through P&L. Users/accountants can switch to equity reserve treatment in settings.
- Q: How are brokerage fees handled? A: **Separate JE line.** Buy trades: DR Investment Asset + DR Brokerage Expense, CR Bank/Cash. Brokerage is not capitalised into cost base (Sharesight tracks cost base separately).
