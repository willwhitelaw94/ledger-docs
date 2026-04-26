---
title: "Feature Specification: Multi-Currency"
---

# Feature Specification: Multi-Currency

**Epic**: 011-MCY
**Created**: 2026-03-01
**Status**: Complete
**Initiative**: FL — MoneyQuest Ledger
**Phase**: 3 (Sprints 9–12)
**Design Direction**: Super Modern

---

## Context

The Multi-Currency module enables workspaces to operate in multiple currencies while maintaining a single base currency (typically AUD) for reporting. It provides exchange rate management, currency conversion, multi-currency journal entries with locked rates, and month-end FX revaluation for unrealised gains and losses.

Each workspace has a `base_currency` set at creation (immutable). Foreign currency transactions on journal entry lines store both the foreign amount and the converted base_amount with the locked exchange rate — enabling accurate FX gain/loss calculation even when rates change later.

### Architectural Context

- **Exchange rates as workspace data** — rates are stored per workspace with from/to currency pair, date, and source (manual or API). Upsert semantics prevent duplicates for the same pair + date.
- **Rate locking on journal entries** — JournalEntryLine stores `currency_code`, `base_amount`, and `exchange_rate` (18,8 decimal). The rate is locked at entry creation time for audit trail integrity.
- **Conversion in cents** — `ExchangeRate::convert()` rounds to the nearest cent: `(int) round($amountCents * rate)`. No floating-point leakage.
- **FX revaluation** — `RevalueOpenBalances` action recalculates foreign currency exposures at month-end, posting unrealised FX gain/loss adjustments as a single journal entry.
- **Feature gated** — multi_currency is Enterprise-only in the plan tier.
- **Date comparisons** — Rate queries use `whereDate()` for SQLite compatibility (not `where()` on date columns).

> **Test coverage gap**: FX revaluation (User Story 4) is implemented in code but has no automated tests. The RevalueOpenBalances action should be covered by integration tests verifying gain/loss calculation accuracy and journal entry posting.

### Dependencies

| Direction | Epic | Relationship |
|-----------|------|-------------|
| **Depends on** | 002-CLE Core Ledger Engine | Multi-currency extends journal entry lines with currency fields |
| **Depends on** | 003-AUT Auth & Multi-tenancy | Workspace base_currency, workspace scoping |
| **Depends on** | 009-BIL Billing & Monetisation | multi_currency feature gated to Enterprise plan |
| **Integrates with** | 005-IAR Invoicing & AR/AP | Invoice currency field, contact preferred currency |
| **Integrates with** | 004-BFR Bank Feeds & Reconciliation | Bank account currency field |
| **Integrates with** | 007-FRC Financial Reporting | Reports show base_currency amounts; FX revaluation entries appear in reports |

---

## User Scenarios & Testing

### User Story 1 — Exchange Rate Management (Priority: P1)

An accountant manages exchange rates for currency pairs used by the workspace. Rates can be entered manually or batch-imported, and are date-specific. The system supports upsert semantics — re-entering a rate for the same pair + date updates the existing rate.

**Why this priority**: Exchange rates must exist before any multi-currency transactions can be created or converted.

**Independent Test**: An accountant can enter a USD/AUD rate of 1.538 for 2026-03-01, query it back, and use it to convert $1,000 USD to $1,538 AUD.

**Acceptance Scenarios**:

1. **Given** an accountant enters a rate: USD → AUD = 1.538 on 2026-03-01, **When** the rate is saved, **Then** it is created with from_currency = "USD", to_currency = "AUD", rate = 1.53800000, rate_date = 2026-03-01, source = "manual"
2. **Given** a rate USD/AUD already exists for 2026-03-01, **When** the same pair + date is submitted with rate 1.55, **Then** the existing rate is updated (upsert, not duplicate)
3. **Given** batch rates are submitted (USD/AUD and GBP/AUD for 2026-03-01), **When** the batch is processed, **Then** both rates are created/updated and a count is returned
4. **Given** rates exist for 2026-03-01 and 2026-03-05, **When** the latest rate is requested for USD/AUD, **Then** the most recent rate (2026-03-05) is returned
5. **Given** no rate exists for a currency pair, **When** the latest rate is requested, **Then** a 404 is returned
6. **Given** from_currency and to_currency are the same ("AUD"/"AUD"), **When** the rate is submitted, **Then** validation rejects — same-currency rates are not allowed
7. **Given** rates are filtered by from_currency = "USD", **When** the list is returned, **Then** only USD-based rates appear

---

### User Story 2 — Currency Conversion (Priority: P1)

A user converts an amount between currencies using stored exchange rates. The conversion uses the rate effective on or before the specified date.

**Why this priority**: Conversion is the core utility that underpins multi-currency journal entries, invoicing, and reporting.

**Independent Test**: A user can convert 100,000 cents ($1,000.00 USD) to AUD using the rate 1.538, receiving 153,800 cents ($1,538.00 AUD).

**Acceptance Scenarios**:

1. **Given** a USD/AUD rate of 1.538 on 2026-03-01, **When** a user converts 100000 cents (USD) on 2026-03-01, **Then** to_amount = 153800 cents (AUD), rate = 1.538
2. **Given** the same currency (USD → USD), **When** conversion is requested, **Then** to_amount = from_amount, rate = 1.0 (identity)
3. **Given** rates exist for 2026-03-01 (1.538) and 2026-03-05 (1.55), **When** conversion is requested for 2026-03-03, **Then** the 2026-03-01 rate is used (closest on or before requested date)
4. **Given** no rate exists for the pair, **When** conversion is requested, **Then** a 404 is returned with "Exchange rate not found"

---

### User Story 3 — Multi-Currency Journal Entries (Priority: P1)

An accountant creates journal entries with lines in foreign currencies. Each foreign-currency line stores the currency_code, the amount in that currency, the base_amount (converted to workspace base currency), and the locked exchange_rate used at entry time.

**Why this priority**: Multi-currency journal entries are the foundation for recording foreign transactions in the ledger.

**Independent Test**: An accountant can create a journal entry with a USD line, see it stored with currency_code = "USD", base_amount converted to AUD, and exchange_rate locked — ensuring future rate changes don't affect the historical entry.

**Acceptance Scenarios**:

1. **Given** a journal entry with a line: amount = 100000 (USD), currency_code = "USD", base_amount = 153800 (AUD), exchange_rate = 1.538, **When** the entry is created, **Then** all three fields are persisted on the journal_entry_lines record
2. **Given** the projector processes a JournalEntryCreated event, **When** the event contains currency fields, **Then** the projector stores currency_code, base_amount, and exchange_rate on the line
3. **Given** a line with currency_code = "AUD" (same as workspace base), **When** base_amount is null, **Then** the line is treated as single-currency (no conversion needed)

---

### User Story 4 — FX Revaluation (Priority: P2)

At month-end, an accountant runs FX revaluation to calculate unrealised gains and losses on outstanding foreign currency balances. The system compares the original locked exchange rate with the current rate and posts an adjustment journal entry.

**Why this priority**: FX revaluation is an accounting requirement for businesses with foreign currency exposure, but it depends on exchange rates and multi-currency entries being in place.

**Independent Test**: After posting a $1,000 USD entry at rate 1.538 (AUD base = $1,538), when the rate moves to 1.56 at month-end, the system posts a $22 unrealised FX gain ($1,560 - $1,538) to the FX Gain/Loss account.

**Acceptance Scenarios**:

1. **Given** posted journal entry lines in USD with locked rate 1.538, and the current rate on 2026-03-31 is 1.56, **When** revaluation is run for 2026-03-31, **Then** an adjustment journal entry is created with the FX gain (difference between revalued and original base amounts)
2. **Given** the revaluation produces adjustments, **When** the journal entry is posted, **Then** it has source_type = "fx_revaluation" for identification
3. **Given** no foreign currency lines exist, **When** revaluation is run, **Then** no journal entry is created and an empty adjustments array is returned
4. **Given** multiple currencies (USD and GBP) with open balances, **When** revaluation is run, **Then** a single journal entry is created with lines for each currency/account combination

---

### User Story 5 — Workspace Base Currency (Priority: P1)

A workspace's base currency is set during creation (onboarding) and serves as the reporting currency for all financial statements. All multi-currency amounts are converted to the base currency for balance calculations and reporting.

**Why this priority**: The base currency is a foundational setting that all multi-currency features depend on.

**Independent Test**: During onboarding, a user can select AUD as the base currency using the CurrencyCombobox, and all subsequent financial data is reported in AUD.

**Acceptance Scenarios**:

1. **Given** a user is creating a workspace during onboarding, **When** they select "NZD" as the base currency, **Then** the workspace is created with base_currency = "NZD"
2. **Given** base_currency is not specified, **When** the workspace is created, **Then** it defaults to "AUD"
3. **Given** a workspace with base_currency "AUD", **When** reports are generated, **Then** all amounts are in AUD (using base_amount for foreign-currency lines)

---

### Edge Cases

- **Rate for exact date not found**: System uses the most recent rate on or before the requested date — not interpolation
- **Very old rate**: Converting with a rate from months ago → system returns the closest available rate; no expiry on rates
- **Rounding**: `ExchangeRate::convert()` rounds to nearest cent — (int) round($amountCents * rate). Edge: 5050 × 1.538 = 7766.9 → rounds to 7767
- **Base currency change**: Not supported after workspace creation — would require revaluing all historical entries
- **FX revaluation with zero net exposure**: Currency exposure nets to zero across accounts → no adjustment entry created
- **Deleted exchange rate**: No delete endpoint; rates are historical records. Incorrect rates are overwritten via upsert.
- **12 supported currencies**: Frontend CurrencyCombobox supports AUD, USD, GBP, EUR, NZD, CAD, JPY, SGD, HKD, CHF, CNY, INR
- **No ExchangeRate policy**: Exchange rate CRUD is open to any authenticated workspace user — no granular permissions yet. A future iteration should restrict write access to accountant/owner roles
- **JPY rounding**: JPY has no fractional units (no "cents") — amounts should be treated as whole yen. The current convert() method rounds to the nearest integer, which works correctly for JPY

---

## Requirements

### Functional Requirements

**Exchange Rate Management**

- **FR-MCY-001**: System MUST support creating exchange rates with from_currency, to_currency (3-char ISO 4217), rate (decimal 18,8), rate_date, and source (manual|api)
- **FR-MCY-002**: System MUST enforce unique constraint on (workspace_id, from_currency, to_currency, rate_date) with upsert semantics
- **FR-MCY-003**: System MUST reject rates where from_currency = to_currency
- **FR-MCY-004**: System MUST support batch rate creation/update via a single endpoint
- **FR-MCY-005**: System MUST support querying the latest rate for a currency pair (most recent rate on or before today)
- **FR-MCY-006**: System MUST support listing rates with optional filters: from_currency, to_currency, date

**Currency Conversion**

- **FR-MCY-007**: System MUST convert amounts between currencies using stored exchange rates
- **FR-MCY-008**: Conversion MUST use the rate effective on or before the specified date (closest prior rate)
- **FR-MCY-009**: Same-currency conversion MUST return identity (rate = 1.0, to_amount = from_amount)
- **FR-MCY-010**: Conversion MUST round to the nearest cent: `(int) round($amountCents * rate)`
- **FR-MCY-011**: System MUST return 404 when no rate exists for the requested currency pair and date

**Multi-Currency Journal Entries**

- **FR-MCY-012**: Journal entry lines MUST support optional currency_code (default workspace base_currency), base_amount (converted cents), and exchange_rate (locked 18,8 decimal)
- **FR-MCY-013**: Projector MUST persist currency_code, base_amount, and exchange_rate from event data
- **FR-MCY-014**: Lines with currency_code matching workspace base_currency MAY have null base_amount and exchange_rate

**FX Revaluation**

- **FR-MCY-015**: System MUST support month-end FX revaluation via RevalueOpenBalances action
- **FR-MCY-016**: Revaluation MUST recalculate foreign currency balances at the current rate and post adjustment entries for unrealised FX gain/loss
- **FR-MCY-017**: Revaluation entries MUST use source_type = "fx_revaluation" for filtering and identification
- **FR-MCY-018**: Revaluation MUST post to an FX Gain/Loss account (code 8200, auto-created if needed)
- **FR-MCY-019**: Revaluation MUST group adjustments by (currency_code, chart_account_id) and create a single journal entry

**Workspace Configuration**

- **FR-MCY-020**: Each workspace MUST have a base_currency (3-char ISO 4217, default "AUD") set at creation
- **FR-MCY-021**: Frontend MUST provide a CurrencyCombobox supporting 12 currencies (AUD, USD, GBP, EUR, NZD, CAD, JPY, SGD, HKD, CHF, CNY, INR)

**Feature Gating**

- **FR-MCY-022**: multi_currency feature MUST be gated to Enterprise plan only

**Tenant Scoping**

- **FR-MCY-023**: All exchange rates MUST be scoped by workspace_id — no cross-workspace rate sharing
- **FR-MCY-024**: Conversion and rate queries MUST use workspace_id from the request context

### Key Entities

- **ExchangeRate**: Stores currency pair rates per workspace and date. Instance method: `convert(int $amountCents): int` — multiplies and rounds. Static method: `getRate(int $workspaceId, string $from, string $to, string $date): ?self` — returns closest rate on or before date, null for same-currency. Unique on (workspace_id, from_currency, to_currency, rate_date).
- **JournalEntryLine** (extended): Adds currency_code (3-char, default base), base_amount (converted cents, nullable), and exchange_rate (locked decimal, nullable) for multi-currency support.
- **RevalueOpenBalances** (action): Calculates unrealised FX gains/losses by comparing locked rates with current rates for outstanding foreign currency balances. Posts a single adjustment journal entry.
- **CurrencyCombobox** (frontend): React Hook Form-compatible combobox with 12 currencies, flag emojis, and searchable dropdown. Used in onboarding and financial forms.
- **ExchangeRateController**: 5 endpoints — index (list), store (single), storeBatch (batch), latest (most recent), convert (amount conversion).

---

## Success Criteria

### Measurable Outcomes

- **SC-MCY-001**: Exchange rate CRUD works with upsert semantics — re-entering same pair + date updates rather than duplicates (verified by test)
- **SC-MCY-002**: Currency conversion produces correct results — 100,000 cents USD × 1.538 = 153,800 cents AUD (verified by model test)
- **SC-MCY-003**: Rate date lookup uses closest prior rate — rate for 2026-03-03 correctly returns 2026-03-01 rate when no 03-03 rate exists
- **SC-MCY-004**: Multi-currency journal entry lines persist currency_code, base_amount, and exchange_rate through event → projector → database
- **SC-MCY-005**: FX revaluation correctly calculates unrealised gains/losses and posts adjustment entries
- **SC-MCY-006**: Same-currency conversion returns identity (rate = 1.0) with no rounding errors
- **SC-MCY-007**: All exchange rate operations scoped by workspace — verified by workspace isolation tests
