---
title: "069-RMI Risk Management & Insurance Register - Research Document"
created: 2026-03-22
topic: "Risk Management & Insurance Register for MoneyQuest Ledger"
sources_searched:
  web:
    - safetyculture.com (5x5 risk matrix)
    - corporatefinanceinstitute.com (VaR methods)
    - metricstream.com (risk dashboards, heat maps)
    - wexfordis.com (insurance gap analysis)
    - praemium.com (wealth platform risk)
    - stockspot.com.au (robo-advisor risk profiles)
    - logicmanager.com (ERM software patterns)
    - renewaltracker.com (insurance renewal tracking)
    - getreminded.com (AU insurance reminders)
  codebase:
    - app/Actions/HealthScore/CalculateEntityHealthScore.php
    - app/Models/Tenant/HealthScore.php
    - app/Models/Tenant/AnomalyFlag.php
    - app/Enums/AnomalyDetection/ (AnomalyType, AnomalySeverity, AnomalyStatus)
    - app/Models/Tenant/Asset.php
    - app/Models/Tenant/AssetFeedLink.php
    - app/Models/Tenant/AssetPriceHistory.php
    - app/Http/Controllers/Api/AssetFeedController.php (portfolio endpoint)
    - app/Actions/Dashboard/GetFinancialRatios.php
    - app/Enums/AssetFeed/AssetClass.php
    - app/Enums/AssetType.php
    - app/Enums/HealthScore/HealthLabel.php
    - app/Models/Tenant/DetectionRule.php
    - app/Models/Tenant/CashFlowForecast.php
---

# 069-RMI Risk Management & Insurance Register - Research Document

## Executive Summary

This research explores the competitive landscape, risk assessment frameworks, UX patterns, and existing MoneyQuest codebase capabilities relevant to building a Risk Management & Insurance Register module (069-RMI).

**Key finding**: No mainstream Australian accounting platform (Xero, QuickBooks, MYOB) offers integrated risk management or insurance tracking. This is a greenfield opportunity. The closest competitors are wealth/advisory platforms (Praemium, Class Super) that provide portfolio-level risk views, and standalone risk management SaaS (LogicManager, Resolver) that target enterprise GRC. MoneyQuest can differentiate by combining ledger-native financial risk scoring (built on existing health scores, financial ratios, and anomaly detection) with a practical insurance register -- all in a single platform accessible to SMBs and personal finance users, not just enterprise risk managers.

MoneyQuest already has substantial infrastructure to build on: a 5-dimension entity health score, 17+ financial ratios, 4-type anomaly detection, a portfolio endpoint with asset class grouping, and asset price history with multiple providers. The 069-RMI module extends these rather than rebuilding.

---

## 1. Competitive Analysis

### 1.1 Accounting Platforms (Xero, QuickBooks, MYOB)

**Finding: None offer risk management or insurance tracking. This is a gap in the market.**

| Platform | Risk Features | Insurance Features | Notes |
|----------|--------------|-------------------|-------|
| **Xero** | None. Has cash flow forecasting (30-180 days) and basic financial reporting | None. No insurance policy tracking | Marketplace has no risk/insurance apps. 60%+ AU market share |
| **QuickBooks** | None. Basic expense tracking and GST compliance | None | Focused on simplicity for micro-businesses |
| **MYOB** | None. Strong compliance/STP focus | None. Expense categories for insurance premiums exist | Closing feature gap with Xero but risk is not on roadmap |

**Confidence**: HIGH (3 sources -- web comparison reviews, feature lists, marketplace searches)

**Implication**: MoneyQuest would be the first mainstream AU accounting platform with integrated risk management. This is a legitimate differentiator for advisory practices.

### 1.2 Wealth/Advisory Platforms (Class Super, BGL, Praemium)

**Finding: These platforms provide portfolio-level reporting but not risk registers or insurance tracking.**

| Platform | Risk-Adjacent Features | Gap |
|----------|----------------------|-----|
| **Praemium** | Daily portfolio rebalancing, consolidated wealth view across all asset classes, performance attribution | No risk scoring, no VaR, no insurance register. Focused on portfolio management, not risk quantification |
| **Class Super** | SMSF administration with 200+ data feeds, bulk processing, consolidated reporting | Compliance-focused (SMSF regulations), not risk-focused. No forward-looking risk metrics |
| **BGL 360** | Company compliance management, SMSF administration | Regulatory compliance tracking only. No financial risk assessment |

**Confidence**: MEDIUM (2 sources -- web research, platform feature pages)

**Implication**: MoneyQuest's risk module would complement these platforms. Accountants using Class/BGL for SMSF administration could use MoneyQuest for risk advisory across all entity types.

### 1.3 Insurance Tracking Tools (AU Market)

**Finding: The AU market has consumer reminder apps and enterprise broker platforms, but nothing for SMB/personal use integrated with accounting.**

| Tool | What It Does | Target User | Gap for MoneyQuest |
|------|-------------|-------------|-------------------|
| **GetReminded** | Mobile app for renewal date reminders (insurance, rego, licence) | Consumers | No asset coverage analysis, no accounting integration, no premium tracking |
| **RenewalTracker** | Automated renewal notifications for enterprise contracts | Enterprise procurement | Too heavyweight for SMB/personal. No financial context |
| **RemindCal** | Insurance renewal tracking with automated notifications | Insurance brokers, agencies | Broker-focused, not end-user. No ledger integration |
| **Remindax** | Policy expiry alerts and document management | Insurance companies | Industry-specific, not general purpose |
| **A1 Tracker** | Full risk management + insurance certificate tracking | Large enterprises | Enterprise pricing, overkill for SMBs |

**Confidence**: HIGH (3+ sources -- app stores, web reviews, feature comparisons)

**Implication**: The gap is clear. No tool combines insurance tracking with accounting data to produce coverage gap analysis. MoneyQuest can auto-detect insurance premiums from bank transactions and calculate coverage-to-asset ratios that no standalone reminder app can.

### 1.4 Risk Management SaaS (LogicManager, Resolver, RiskWatch)

**Finding: Enterprise GRC tools provide excellent risk framework patterns but are not suitable for MoneyQuest's target users. Their UX patterns are worth studying.**

| Platform | Key Patterns Worth Adopting | Why Not Compete Directly |
|----------|---------------------------|------------------------|
| **LogicManager** | Risk maturity modelling, enterprise heat map, root-cause analysis taxonomy, risk library of common risk causes | Enterprise-only pricing, GRC/audit focus, no financial ledger integration |
| **Resolver** | Centralized risk register, incident management tied to risks, real-time alerting, customizable dashboards | Targets security/compliance officers, not accountants or individuals |
| **RiskWatch** | Automated risk assessments from templates, continuous monitoring, compliance-risk correlation | Healthcare/manufacturing/finance sector focus, too specialised |

**Adoptable patterns from these tools:**
1. **Risk Library** -- pre-populated list of common risk causes by category (LogicManager). MoneyQuest could ship a "Financial Risk Library" seeded per entity type
2. **Risk-to-Control mapping** -- every risk has a mitigation/control linked to it (all three platforms)
3. **Assessment templates** -- standardized risk assessment workflows that users complete periodically
4. **Heat map visualization** -- 5x5 likelihood/impact matrix is universal across all three
5. **Centralized risk register** -- single table of all risks with status, owner, review date

### 1.5 Personal Finance / Robo-Advisors (Stockspot, Raiz)

**Finding: Robo-advisors use risk profiling for portfolio construction but don't expose ongoing risk metrics to users.**

| Platform | Risk Assessment Approach | What Users See |
|----------|------------------------|---------------|
| **Stockspot** | Questionnaire-based: risk tolerance, financial goals, personal circumstances. Generates model ETF portfolio (conservative to aggressive) | Portfolio allocation pie chart, performance vs benchmark, rebalancing notifications. No VaR, no concentration warnings |
| **Raiz** | 6 diversified portfolios (conservative to aggressive). No guided questionnaire -- user self-selects | Round-up micro-investing, portfolio breakdown by asset class. No risk metrics beyond portfolio type label |

**Confidence**: MEDIUM (2 sources -- platform websites, comparison articles)

**Adoptable patterns:**
1. **Risk profile questionnaire** -- could be adapted for entity risk profile (not just investment). Questions like "How many months of expenses do you have in cash reserves?"
2. **Simple risk labels** -- "Conservative / Moderate / Aggressive" is intuitive for non-experts. MoneyQuest's HealthLabel (Excellent/Good/Fair/Poor/Critical) already follows this pattern

---

## 2. Risk Assessment Frameworks

### 2.1 Financial Risk Categories for SMBs and Individuals

Based on web research and the existing MoneyQuest health score dimensions, the following risk taxonomy is recommended:

| Category | Sub-Risks | Data Source in MoneyQuest | Entity Types |
|----------|-----------|--------------------------|-------------|
| **Liquidity Risk** | Cash runway, current ratio below threshold, inability to meet short-term obligations | Health score liquidity dimension, GetFinancialRatios (current_ratio, quick_ratio, cash_ratio) | All |
| **Market Risk** | Asset price volatility, portfolio concentration, sector exposure, interest rate sensitivity | Asset price feeds (049-APF), AssetFeedLink, AssetPriceHistory | Personal, SMSF, Trust, Investment |
| **Credit Risk** | Customer concentration, overdue receivables, bad debt exposure, counterparty default | Health score stability dimension (revenue concentration), AR aging | Business (Pty Ltd, Sole Trader, Partnership) |
| **Operational Risk** | Key person dependency, process failures, system outages, fraud | Anomaly detection (040-AND), existing AnomalyFlag model | All |
| **Compliance Risk** | BAS lodgement overdue, tax filing deadlines, regulatory breaches, expired licences | BAS compliance (044-TAX), period closing status | Business |
| **Insurance Risk** | Coverage gaps, underinsured assets, expired policies, premium-to-asset ratio | NEW: Insurance register. Cross-reference with Asset model values | All |
| **Concentration Risk** | Revenue dependency on single customer, portfolio over-allocated to single asset class | Invoices (customer concentration), portfolio endpoint (by_class grouping) | All |
| **Debt/Leverage Risk** | High debt-to-equity, interest coverage too low, covenant breach risk | GetFinancialRatios (debt_to_equity, debt_to_assets, interest_coverage) | Business |

### 2.2 Risk Scoring Methodology

#### Recommended: Hybrid Qualitative + Quantitative Approach

**For automatically detected risks (quantitative):**
- Use existing ledger data to calculate risk scores directly
- Example: Liquidity risk score = f(current_ratio, cash_runway_days, overdue_payables)
- Follow the pattern established by `CalculateEntityHealthScore` -- weighted sub-scores producing a 0-100 composite

**For manually registered risks (qualitative):**
- Use a 5x5 likelihood/impact matrix (industry standard)

| | Insignificant (1) | Minor (2) | Moderate (3) | Major (4) | Catastrophic (5) |
|---|---|---|---|---|---|
| **Almost Certain (5)** | 5 | 10 | 15 | 20 | 25 |
| **Likely (4)** | 4 | 8 | 12 | 16 | 20 |
| **Possible (3)** | 3 | 6 | 9 | 12 | 15 |
| **Unlikely (2)** | 2 | 4 | 6 | 8 | 10 |
| **Rare (1)** | 1 | 2 | 3 | 4 | 5 |

**Risk score bands (for the manual 5x5):**
- 1-4: LOW (green)
- 5-9: MODERATE (amber)
- 10-15: HIGH (orange)
- 16-25: CRITICAL (red)

**This maps to existing HealthLabel thresholds (for automatic risks):**
- 80-100: Excellent (low risk)
- 60-79: Good (moderate risk)
- 40-59: Fair (elevated risk)
- 20-39: Poor (high risk)
- 0-19: Critical (critical risk)

#### Composite Risk Score

Combine automatic and manual risk scores into a single entity-level risk score. Weights should vary by entity type, following the established pattern in `CalculateEntityHealthScore::weightsForEntityType()`:

| Entity Type | Liquidity | Market | Credit | Operational | Compliance | Insurance |
|-------------|-----------|--------|--------|-------------|------------|-----------|
| **Pty Ltd** | 0.20 | 0.10 | 0.25 | 0.15 | 0.20 | 0.10 |
| **Sole Trader** | 0.25 | 0.10 | 0.20 | 0.15 | 0.20 | 0.10 |
| **Personal** | 0.25 | 0.25 | 0.05 | 0.10 | 0.05 | 0.30 |
| **SMSF** | 0.15 | 0.30 | 0.05 | 0.10 | 0.25 | 0.15 |
| **Trust** | 0.15 | 0.25 | 0.10 | 0.10 | 0.20 | 0.20 |

### 2.3 Portfolio Risk Metrics

#### Concentration Analysis

Already partially available via `AssetFeedController::portfolio()` which groups holdings by `asset_class` (Vehicle, Listed Security, Property, Cryptocurrency, Term Deposit, Managed Fund, Other). The risk module should add:

1. **Herfindahl-Hirschman Index (HHI)** -- sum of squared portfolio weights. HHI > 2500 = highly concentrated
2. **Top-holding concentration** -- % of portfolio in largest single holding. Threshold: > 30% = warning
3. **Asset class limits** -- configurable per entity type (e.g., SMSF: max 70% in single asset class per ATO guidelines)

#### Volatility Indicators

Using `AssetPriceHistory` data (market_value_cents over time):

1. **Standard deviation of returns** -- calculate from daily/monthly price changes
2. **Beta** -- correlation with market index (requires benchmark data, could be a v2 feature)
3. **Maximum drawdown** -- largest peak-to-trough decline in the asset price history

#### Value at Risk (VaR)

Three methods in order of implementation complexity:

1. **Historical VaR** (recommended for v1): Use actual asset price history to calculate the 5th percentile loss over a holding period. Simplest method, requires only `AssetPriceHistory` data. Formula: sort returns, take the 5th percentile value
2. **Parametric/Variance-Covariance VaR** (v2): Assumes normal distribution. Requires mean return and standard deviation. VaR = Portfolio Value * (z-score * sigma * sqrt(time))
3. **Monte Carlo VaR** (v3): Simulates thousands of scenarios. Most accurate but computationally expensive

**Recommended for v1**: Historical VaR with a 95% confidence level over 30-day and 90-day horizons. Only calculate for asset classes with daily price feeds (Listed Securities, Cryptocurrency, Managed Funds).

#### Sharpe Ratio

`(Portfolio Return - Risk-Free Rate) / Portfolio Std Dev`

Use the RBA cash rate as the risk-free rate (currently ~4.1%). Calculate from `AssetPriceHistory` returns. Only meaningful for financial assets with sufficient price history (30+ data points).

### 2.4 Insurance Gap Analysis Methodology

The insurance gap analysis framework should evaluate four gap types:

1. **Limit Gaps** -- policy coverage amount vs current asset value
   - Metric: `coverage_ratio = policy_limit / asset_current_value`
   - Threshold: < 0.8 (underinsured by 20%+) = warning
   - Data: Insurance register (policy limit) vs Asset model (current_value) or AssetPriceHistory (latest market_value_cents)

2. **Peril Gaps** -- insurable risks without any policy
   - Check: Every tangible asset (Vehicle, Property, Equipment) should have at least one linked insurance policy
   - Check: Business entities should have public liability and professional indemnity
   - Check: Personal entities should have health/life if dependents exist (optional, user-configured)

3. **Valuation Gaps** -- insured value significantly below replacement cost
   - For assets with price feeds: compare policy sum insured vs latest market value
   - For depreciating assets: compare policy sum insured vs replacement cost (not book value)

4. **Time Element Gaps** -- business interruption coverage duration
   - For business entities: check if business interruption policy exists and covers adequate period (typically 12-24 months of operating expenses)

---

## 3. UX Patterns for Non-Expert Users

### 3.1 Risk Heat Map

The standard 5x5 heat map is universally understood. Implementation notes:
- Use colour coding: green (low), amber (moderate), orange (high), red (critical)
- Plot each risk item as a dot on the matrix
- Clickable dots drill down to risk detail
- Show risk count badges in each cell
- Follow the colour system already established by `AnomalySeverity::colour()` (red, amber, blue) and `HealthLabel::colour()` (green, blue, amber, orange, red)

### 3.2 Risk Score Gauge

Follow the pattern of existing `HealthScore` display:
- Circular gauge / radial progress showing 0-100 composite score
- Label overlay: Excellent / Good / Fair / Poor / Critical
- Colour matches the label (green through red)
- Sub-score breakdown as horizontal bars below the gauge (one per risk category)
- Trend indicator (up/down arrow) showing change since last calculation

### 3.3 Insurance Coverage Visualization

**Stacked bar chart per asset:**
- Full bar = asset current value (or replacement cost)
- Filled portion = insurance coverage amount
- Gap portion = uncovered amount (highlighted in red/orange)
- Grouped by asset type (Vehicles, Properties, Equipment, etc.)

**Coverage summary cards:**
- Total asset value vs total insured value
- Coverage ratio percentage with colour coding
- Number of uninsured assets
- Next upcoming renewal date

### 3.4 Risk Radar/Spider Chart

For the composite risk profile, a radar chart showing all 6-8 risk dimensions:
- Each spoke = risk category (Liquidity, Market, Credit, etc.)
- Distance from centre = risk severity (outer = higher risk)
- Overlay: current period vs previous period to show improvement/deterioration
- Works well for client advisory meetings -- "Here's where your risk is concentrated"

### 3.5 Alert/Notification Patterns

Extend the existing in-app notification system (024-NTF):
- **Insurance expiry**: 30-day, 14-day, 7-day warnings before renewal date
- **Coverage gap detected**: When asset revaluation pushes value above coverage
- **Risk threshold breach**: When composite risk score crosses a band boundary
- **Concentration warning**: When portfolio allocation to any single asset class exceeds threshold
- **Review reminder**: Periodic prompt to review risk register items with past review dates

---

## 4. Existing Codebase Context

### 4.1 Anomaly Detection (040-AND)

**Models and Enums:**
- `AnomalyFlag` -- polymorphic model linking to primary/secondary transactions via MorphTo
- `AnomalyType` enum: DUPLICATE, OUTLIER, NEW_PAYEE, UNUSUAL_TIMING
- `AnomalySeverity` enum: HIGH, MEDIUM, LOW (with colour method)
- `AnomalyStatus` enum: OPEN, DISMISSED, INVESTIGATED, REVERSED
- `DetectionRule` -- workspace-scoped rules with `type`, `enabled`, `sensitivity_params`, learning period support

**Patterns to reuse:**
- Severity enum with colour method -- adopt for RiskSeverity
- Status lifecycle (OPEN -> DISMISSED/INVESTIGATED/REVERSED) -- similar to risk item lifecycle (OPEN -> MITIGATED/ACCEPTED/CLOSED)
- Detection rules with configurable sensitivity -- reuse for risk thresholds
- StatusTabs counts endpoint pattern for filtering by status

**Controller patterns:**
- `AnomalyController` uses `Gate::authorize()` for reads (not Form Request)
- Counts endpoint with `GROUP BY status` for StatusTabs
- Dismiss action via dedicated `DismissAnomaly` action class

### 4.2 Entity Health Score (051-EHS)

**Architecture:**
- `CalculateEntityHealthScore` action calculates 5 sub-scores: liquidity, cash_flow, profitability, stability, obligations
- Each sub-score is 0-100, combined with entity-type-specific weights
- `HealthLabel` enum: Excellent (80+), Good (60+), Fair (40+), Poor (20+), Critical (<20)
- `HealthScore` model stores current score; `HealthScoreHistory` stores history for trend charts
- Recalculation triggered manually or via artisan command (`CalculateAllHealthScores`)
- Practice-level endpoint aggregates scores across all connected workspaces

**Patterns to reuse:**
- Weighted composite scoring with entity-type-specific weights -- directly applicable to risk scoring
- Score + label + colour system -- consistent user mental model
- History tracking for trend visualization
- Practice-level aggregation for accountant dashboard

**Integration opportunity:**
- Risk score could **extend** health score with additional dimensions (insurance coverage, market risk, concentration risk)
- Or risk score could be a **sibling** to health score -- both contribute to an overall "entity readiness" view
- Recommended: sibling approach. Health score = backward-looking financial health. Risk score = forward-looking risk exposure. Both displayed together on dashboard

### 4.3 Asset Price Feeds (049-APF)

**Architecture:**
- `AssetFeedLink` connects assets to external price providers (Redbook, ASX, RP Data, CoinGecko)
- `AssetClass` enum: Vehicle, Listed Security, Property, Cryptocurrency, Term Deposit, Managed Fund, Other
- `AssetPriceHistory` stores time-series valuations (market_value_cents, trade_value_cents, confidence, raw_payload)
- Portfolio endpoint groups by asset class and calculates unrealised gains
- `RevaluationPolicy` configures how gains/losses are journaled per asset class

**Data available for risk calculations:**
- `last_value_cents` and `book_value_cents` on AssetFeedLink -- for current market vs book value
- `AssetPriceHistory` time series -- for volatility, VaR, max drawdown calculations
- `by_class` grouping in portfolio endpoint -- for concentration analysis
- `unrealisedGainCents()` -- for exposure quantification

**Gaps to fill:**
- No standard deviation / volatility calculation exists
- No benchmark comparison (beta calculation needs market index data)
- Portfolio endpoint returns raw data but no risk metrics overlay
- No concentration threshold configuration

### 4.4 Financial Ratios (GetFinancialRatios)

**Already calculated (directly relevant to risk):**
- Liquidity: current_ratio, quick_ratio, cash_ratio, working_capital
- Leverage: debt_to_equity, debt_to_assets, interest_coverage
- Efficiency: DSO, DPO (indicative of cash conversion risk)
- Growth: revenue_growth, expense_growth (trend indicators)

**Integration opportunity:**
- Risk module can consume these ratios and apply threshold-based scoring
- Example: current_ratio < 1.0 = HIGH liquidity risk, 1.0-1.5 = MODERATE, > 1.5 = LOW
- No need to recalculate -- call `GetFinancialRatios::run($workspaceId)` and apply risk thresholds

### 4.5 Asset Model (033-FAR)

**Relevant fields:**
- `cost`, `net_book_value`, `accumulated_depreciation` -- for insurance valuation gap analysis
- `category` (Tangible, Intangible, Financial) -- determines which assets need insurance
- `type` (Vehicle, Equipment, Property, etc.) -- determines what insurance type is expected
- `status` (InService, Disposed, etc.) -- only in-service assets need insurance coverage
- `location` -- for property insurance cross-reference

### 4.6 Cash Flow Forecasting (041-CFF)

**Relevant:**
- `CashFlowForecast` with `ForecastItem` children
- Already projects future cash positions
- Risk module can flag when forecast shows cash below threshold (liquidity risk trigger)

### 4.7 Entity Types

**Available entity types** (from EntityType enum):
- PTY_LTD, TRUST, SOLE_TRADER, PARTNERSHIP, SMSF, NOT_FOR_PROFIT, PERSONAL

Each entity type will have different risk profiles and insurance expectations. The entity-type-specific weighting pattern is already established in `CalculateEntityHealthScore`.

---

## 5. Synthesis

### 5.1 Consolidated Requirements (by source count)

| # | Requirement | Sources | Confidence |
|---|------------|---------|------------|
| 1 | **Risk register with 5x5 likelihood/impact matrix** | Web research (SafetyCulture, MetricStream, LogicManager), idea brief | HIGH |
| 2 | **Insurance register with policy CRUD and renewal reminders** | Web research (GetReminded, RenewalTracker), idea brief, AU market gap | HIGH |
| 3 | **Portfolio concentration analysis using existing asset class grouping** | Codebase (AssetFeedController::portfolio), web research (VaR methods), idea brief | HIGH |
| 4 | **Composite risk score following health score pattern (0-100, weighted by entity type)** | Codebase (CalculateEntityHealthScore), idea brief, risk scoring methodology research | HIGH |
| 5 | **Insurance coverage gap analysis against asset values** | Web research (Wexford, Noble Public Adjusting), codebase (Asset model values), idea brief | HIGH |
| 6 | **Risk category taxonomy: Liquidity, Market, Credit, Operational, Compliance, Insurance** | Web research (risk frameworks), codebase (existing health score dimensions) | HIGH |
| 7 | **Financial ratio thresholds as automatic risk triggers** | Codebase (GetFinancialRatios), web research (financial risk scoring) | MEDIUM |
| 8 | **VaR calculation from asset price history** | Web research (CFI, MIT, QuantInsti), codebase (AssetPriceHistory), idea brief | MEDIUM |
| 9 | **Risk dashboard widget with heat map and score gauge** | Web research (MetricStream, FasterCapital), idea brief | MEDIUM |
| 10 | **AI-driven risk alerts via existing notification system** | Idea brief, codebase (024-NTF notifications) | MEDIUM |
| 11 | **Practice-level risk aggregation across client workspaces** | Codebase (HealthScoreController::practiceScores pattern), idea brief | MEDIUM |
| 12 | **Risk profile questionnaire for entity onboarding** | Web research (Stockspot), idea brief | LOW |

### 5.2 Architecture Recommendations

**Follow established patterns:**
- `RiskItem` model following `AnomalyFlag` pattern (polymorphic, workspace-scoped, status lifecycle)
- `InsurancePolicy` model with renewal date, coverage amount, premium, linked asset(s)
- `CalculateEntityRiskScore` action following `CalculateEntityHealthScore` pattern
- `RiskScoreHistory` following `HealthScoreHistory` pattern
- Enums: `RiskCategory`, `RiskSeverity` (reuse AnomalySeverity HIGH/MEDIUM/LOW pattern + add CRITICAL), `RiskStatus` (OPEN/MITIGATED/ACCEPTED/CLOSED)
- `RiskThreshold` model following `DetectionRule` pattern for configurable alert thresholds

**New vs Extend:**
- Do NOT merge risk score into health score. Keep them as sibling concepts:
  - Health Score = retrospective financial health (existing)
  - Risk Score = prospective risk exposure (new)
  - Both displayed together on dashboard widget

**Integration points:**
- `GetFinancialRatios` output feeds automatic liquidity/leverage risk assessment
- `AssetFeedController::portfolio()` output feeds concentration/market risk assessment
- `AssetPriceHistory` time series feeds VaR/volatility calculations
- `Asset` model values feed insurance gap analysis
- `CashFlowForecast` projections feed forward-looking liquidity risk
- In-app notifications (024-NTF) handle risk alerts

### 5.3 Open Questions

1. [ ] Should the insurance register support document uploads (policy PDFs)? The attachment system (012-ATT) already supports polymorphic attachments -- confirm reuse
2. [ ] Should VaR be calculated server-side (PHP) or in a background job? Historical VaR over 250 data points is not computationally heavy but should not block API responses
3. [ ] How deep should the risk-to-insurance linking go? Simple "asset has/doesn't have insurance" or complex "policy covers these specific perils for this asset"?
4. [ ] Should the risk register be event-sourced? Risk items have a lifecycle (created, assessed, mitigated, accepted, closed) that could benefit from event history, but the existing AnomalyFlag uses simple status updates
5. [ ] What risk data should be visible to the `client` role? Full risk register or just the composite score?
6. [ ] Should insurance premium detection from bank transactions be v1 or v2? The idea brief mentions it but it requires pattern matching on transaction descriptions
7. [ ] How should group-level risk aggregation work for family groups managing multiple entities?

### 5.4 Recommended Next Steps

1. **Approve idea brief** and proceed to PRD
2. **Design the data model** -- RiskItem, InsurancePolicy, RiskScore, InsuranceCoverageGap
3. **Sprint 1 scope**: Risk register CRUD (manual risks) + risk category taxonomy + 5x5 matrix scoring
4. **Sprint 2 scope**: Insurance register CRUD + renewal reminders + basic coverage gap (has/doesn't have insurance per insurable asset)
5. **Sprint 3 scope**: Automatic risk detection from financial ratios + portfolio concentration analysis + composite risk score
6. **Sprint 4 scope**: VaR calculation + risk dashboard widget + AI alerts + practice-level view

---

## Appendix A: Risk Category Enum (Proposed)

```php
enum RiskCategory: string
{
    case LIQUIDITY = 'liquidity';
    case MARKET = 'market';
    case CREDIT = 'credit';
    case OPERATIONAL = 'operational';
    case COMPLIANCE = 'compliance';
    case INSURANCE = 'insurance';
    case CONCENTRATION = 'concentration';
    case LEVERAGE = 'leverage';
}
```

## Appendix B: Insurance Policy Types (Proposed)

```php
enum InsurancePolicyType: string
{
    // Business
    case PUBLIC_LIABILITY = 'public_liability';
    case PROFESSIONAL_INDEMNITY = 'professional_indemnity';
    case BUSINESS_INTERRUPTION = 'business_interruption';
    case WORKERS_COMPENSATION = 'workers_compensation';
    case PRODUCT_LIABILITY = 'product_liability';
    case CYBER_INSURANCE = 'cyber_insurance';
    case MANAGEMENT_LIABILITY = 'management_liability';

    // Property & Assets
    case BUILDING = 'building';
    case CONTENTS = 'contents';
    case LANDLORD = 'landlord';
    case STRATA = 'strata';

    // Vehicle
    case MOTOR_VEHICLE_COMPREHENSIVE = 'motor_vehicle_comprehensive';
    case MOTOR_VEHICLE_THIRD_PARTY = 'motor_vehicle_third_party';
    case CTP = 'ctp'; // Compulsory Third Party

    // Personal
    case HEALTH = 'health';
    case LIFE = 'life';
    case INCOME_PROTECTION = 'income_protection';
    case TOTAL_PERMANENT_DISABILITY = 'tpd';
    case TRAUMA = 'trauma';
    case TRAVEL = 'travel';

    // Other
    case OTHER = 'other';
}
```

## Appendix C: Existing Patterns to Follow

| Pattern | Existing Example | Apply To |
|---------|-----------------|----------|
| Composite scoring with entity-type weights | `CalculateEntityHealthScore` | `CalculateEntityRiskScore` |
| Severity enum with colour method | `AnomalySeverity` | `RiskSeverity` |
| Status lifecycle enum | `AnomalyStatus` | `RiskStatus` |
| StatusTabs counts endpoint | `AnomalyController::counts()` | `RiskController::counts()` |
| History tracking for trends | `HealthScoreHistory` | `RiskScoreHistory` |
| Practice-level aggregation | `HealthScoreController::practiceScores()` | `RiskScoreController::practiceScores()` |
| Configurable detection rules | `DetectionRule` | `RiskThreshold` |
| Portfolio grouping by asset class | `AssetFeedController::portfolio()` | Add concentration metrics |
| Label from score mapping | `HealthLabel::fromScore()` | `RiskLabel::fromScore()` |
| Polymorphic model with MorphTo | `AnomalyFlag` (primary/secondary transaction) | `RiskItem` (linked entity/asset) |

## Appendix D: Web Research Sources

- [Xero vs QuickBooks vs MYOB Comparison (Arbour Advisory)](https://arbouradvisory.com.au/best-accounting-software-for-arborists-xero-vs-quickbooks-vs-myob-2026/)
- [MYOB vs Xero 2026 (Software Advice)](https://www.softwareadvice.com/accounting/myob-essentials-profile/vs/xero/)
- [GetReminded - AU Insurance Renewal Reminders](https://www.getreminded.com/)
- [RenewalTracker - Contract Renewal Management](https://www.renewaltracker.com/)
- [RemindCal - Insurance Renewal Software](https://remindcal.com/insurance-renewal-tracking)
- [Praemium Wealth Platform](https://www.praemium.com/)
- [Class Super vs BGL 360 (Bluecrest Accounting)](https://bluecrestaccounting.com.au/blog/smsf-accounting-software-class-super-vs-bgl-360/)
- [Value at Risk Methods (Corporate Finance Institute)](https://corporatefinanceinstitute.com/resources/career-map/sell-side/risk-management/value-at-risk-var/)
- [VaR Lecture Notes (MIT OpenCourseWare)](https://ocw.mit.edu/courses/18-s096-topics-in-mathematics-with-applications-in-finance-fall-2013/8c9f9d321f7c8bb34b289f178f7cfc32_MIT18_S096F13_lecnote7.pdf)
- [5x5 Risk Matrix Guide (SafetyCulture)](https://safetyculture.com/topics/risk-assessment/5x5-risk-matrix)
- [Risk Assessment Matrix Guide (Tracker Networks)](https://www.trackernetworks.com/blog/risk-assessment-matrix-guide)
- [Risk Heat Map Guide (MetricStream)](https://www.metricstream.com/learn/risk-heat-map.html)
- [Risk Management Dashboard Guide (MetricStream)](https://www.metricstream.com/learn/risk-management-dashboard.html)
- [Insurance Gap Analysis (Wexford Insurance Solutions)](https://wexfordis.com/2025/07/12/insurance-gap-analysis/)
- [Coverage Gap Analysis Guide (Noble Public Adjusting)](https://www.noblepagroup.com/2025/10/beginner-understanding-coverage-gap-analysis/)
- [LogicManager ERM Platform](https://www.logicmanager.com/)
- [Top Risk Management Software 2025 (V-Comply)](https://www.v-comply.com/blog/best-risk-management-software-solutions/)
- [Stockspot Robo-Advice (AU)](https://www.stockspot.com.au/)
- [AU Robo-Advisors Comparison (ETF Stream)](https://www.etfstream.com/articles/australias-best-robo-adviser-raiz-stockspot-or-six-park)
- [Risk Scoring Best Practices (Flagright)](https://www.flagright.com/post/how-to-do-risk-scoring)
- [Insurance Policy Management Software (Archipelago)](https://www.onarchipelago.com/blog/insurance-policy-management-software)
- [Insurance Policy Management Platforms (iTransition)](https://www.itransition.com/insurance/policy-management-software)
