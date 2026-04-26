---
title: "068-SPE Scenario Planning Engine — Research Document"
---

# Scenario Planning Engine — Research Document

**Created**: 2026-03-22
**Topic**: Multi-variable financial scenario modelling for MoneyQuest Ledger
**Requested by**: William Whitelaw

---

## Executive Summary

Financial scenario planning is a major gap in the Australian SME accounting software market. The incumbents (Xero, QuickBooks, MYOB, FreshBooks) offer no native multi-variable scenario modelling — Xero's built-in forecast is limited to 7- or 30-day cash-only projections with single-transaction "what-if" adjustments. Advanced scenario modelling is left to third-party add-ons (Fathom, Float, Dryrun) or standalone FP&A platforms (Jirav, Planful). None of these tools are integrated into the ledger itself — they all sit as bolt-on reporting layers that import data from accounting systems.

The personal finance space is more mature. Tools like ProjectionLab and Boldin (formerly NewRetirement) offer sophisticated Monte Carlo simulations (1,000+ iterations), customizable probability distributions, fan-chart visualizations with percentile bands, and long-horizon projections (20-40 years). Their UX patterns — slider-based variable adjustment, side-by-side scenario comparison, customizable success/failure categories — provide strong design precedents for MoneyQuest's scenario engine.

MoneyQuest is uniquely positioned because it owns the ledger data. Unlike Fathom or Jirav (which must import snapshots), MoneyQuest can project forward from real-time double-entry balances, live asset valuations, budget actuals, and goal progress. The existing codebase already has the building blocks: cash flow forecasting with scenario overlays (041-CFF), portfolio tracking with market feeds (049-APF), account-level budgets with variance tracking (029-BGT), multi-scope goals with progress history (037-GLS), and 20+ financial ratios computed on-demand (057-CDB2). The Scenario Planning Engine connects these modules into a unified forward-looking projection.

---

## 1. Competitive Analysis

### 1.1 Accounting Platform Incumbents

| Platform | Scenario Planning? | What They Offer | Limitations |
|----------|-------------------|-----------------|-------------|
| **Xero** | No native scenario modelling | 7-day or 30-day cash flow forecast based on invoices/bills. One-off amount adjustments, date tweaking for overdue items. | Static snapshots, not dynamic models. No multi-variable adjustment. No saving/comparing scenarios. Relies on third-party apps (Float, Dryrun) for "what-if" modelling. |
| **QuickBooks** | No | Cash flow planner with 30/90-day projection. AI-powered anomaly detection via Intuit Assist. | Cash-only, no balance sheet or P&L projections. No scenario comparison. |
| **MYOB** | No | Basic cash flow reporting. Strong AU payroll/tax compliance. | No forecasting or scenario tools at all. Traditional compliance-focused platform. |
| **FreshBooks** | No | Invoice-focused cash flow visibility. Instant Payouts, BNPL on invoices. | Freelancer-targeted. No financial modelling capability. |

**Key finding**: None of the four major AU/global accounting platforms offer integrated financial scenario modelling. They all treat forecasting as a reporting afterthought, not a planning tool. This is a clear whitespace opportunity.

**Sources**: [Xero Cash Flow Software](https://www.xero.com/us/accounting-software/analytics/cash-flow/), [Cash Flow Frog — Xero Limitations](https://cashflowfrog.com/blog/xero-cash-flow-forecasting-tool-uses-and-limitations/), [Dryrun + Xero](https://www.dryrun.com/xero-cash-flow-forecasting-scenario-modeling-with-dryrun), [FreshBooks vs QuickBooks vs Xero](https://www.webgility.com/blog/freshbooks-vs-quickbooks-vs-xero)

---

### 1.2 Dedicated Financial Modelling / FP&A Tools

| Tool | Key Features | Scenario Approach | Pricing Tier | AU Presence |
|------|-------------|-------------------|--------------|-------------|
| **Fathom** | Three-way forecasting (P&L + BS + CF), unlimited scenarios, 50 microforecasts, multi-entity consolidation (up to 300 entities), driver-based models | Best/worst/event-based scenarios. 5-year horizons. Scenario comparison across all three statements. Integrates with Xero, QBO, MYOB. | Mid-tier (~$50-100/mo per company) | Strong AU presence, HQ'd in Brisbane |
| **Spotlight Reporting** | Pre-defined and custom scenarios, multi-entity/multi-currency consolidation, intercompany eliminations | Scenario-based forecasting with template-driven workflows | Mid-tier | Strong AU/NZ presence |
| **Jirav** | Driver-based budgeting, rolling forecasts, sensitivity analysis, multiple plan versions | Operational metrics-driven (revenue drivers, headcount, costs). Assess assumption changes across plan versions. Best for mid-to-long-term planning. | Low-to-mid tier ($500-2000/mo) | Primarily US-focused |
| **Futrli** | Short-term cash flow scenarios, "what-if" modelling on revenue timing/expenses/financing | Simple scenario toggles affecting cash position. Useful for cash planning, not full-statement modelling. | Mid-tier | UK-focused, available in AU |
| **Syft Analytics** | Event-based and short-term scenario adjustments, four-way forecasting (actuals + forecasts + KPIs), real-time dashboards | Quick "what-if" changes. Better for operational analysis than long-term models. | Low-to-mid tier | Available in AU |
| **Reach Reporting** | Pre-configured scenario templates, three-statement forecasting, customizable forecast templates | Template-based. Advanced scenarios require Excel export. | Premium tier | Available in AU |

**Key finding**: Fathom is the strongest competitor in AU — Brisbane-based, deeply integrated with Xero, and offers true three-way forecasting with unlimited scenarios. However, Fathom is a bolt-on reporting tool that imports data. It does not own the ledger. It cannot provide real-time projections from live balances, and it has no Monte Carlo or probability-based modelling.

**The gap**: No tool in the AU market combines (a) ledger-native data, (b) multi-variable scenario modelling, (c) Monte Carlo probability distributions, and (d) goal/portfolio integration. MoneyQuest can fill all four.

**Sources**: [Fathom — 6 Best Financial Modelling Tools](https://www.fathomhq.com/blog/the-6-best-financial-modelling-software-tools), [Jirav vs Fathom](https://www.jirav.com/blog/jirav-vs-fathom-deep-fpa-vs-financial-reporting), [Fathom Scenario Planning Blog](https://blog.fathomhq.com/how-scenario-planning-can-help-businesses-stay-ahead)

---

### 1.3 Personal Finance / Retirement Planning Tools

| Tool | Monte Carlo? | Simulations | Visualization | Key UX Patterns |
|------|-------------|-------------|---------------|-----------------|
| **ProjectionLab** | Yes | Customizable distribution, user-defined runs | Percentile-based success score, trial-level drill-down, Sankey cash flow diagrams | Customizable success/failure categories (names, thresholds, colors). Toggle scenarios on/off to see impact. Fast, modern, slider-heavy interface. Scenario comparison built-in. |
| **Boldin (NewRetirement)** | Yes | 1,000 iterations, normal distribution | Fan chart with percentile bands (10th, 50th, 90th). Blue shading widens over time to show uncertainty. Median line with spreading confidence interval. | "Retirement Chance of Success" percentage. 250+ input variables. Auto-updating when connected accounts change. Simple percentage-based success communication. |
| **cFIREsim** | Historical backtesting | Tests against all historical periods | Success rate percentage, spending/balance charts | Free tool, historical return sequences rather than random sampling. |
| **Pralana** | Yes | Customizable | Detailed retirement projections | Spreadsheet-style, power-user oriented. |

**Key UX insights from personal finance tools:**

1. **Success as a percentage** — Boldin's "90% chance of success" is immediately understandable to non-technical users. Adopt this pattern for business scenarios: "85% chance your cash position stays above $X."

2. **Fan charts with widening uncertainty** — Boldin's visualization where the shaded area expands over time is intuitive. Narrow bands = predictable near-term; wide bands = uncertain long-term. Use this for MoneyQuest's projection charts.

3. **Customizable outcome categories** — ProjectionLab lets users define what "success" means (thresholds, names, colors). For MoneyQuest: accountants can define what a "healthy" vs "at risk" outcome looks like per client.

4. **Toggle scenarios on/off** — ProjectionLab's quick-toggle to show/hide scenarios is essential for comparison without visual overload.

5. **Trial-level drill-down** — ProjectionLab lets users examine individual Monte Carlo trials. This builds trust in the simulation by making it transparent.

**Sources**: [ProjectionLab Monte Carlo](https://projectionlab.com/monte-carlo), [ProjectionLab Monte Carlo Redesign](https://projectionlab.com/blog/monte-carlo-redesign), [Boldin Monte Carlo](https://help.boldin.com/en/articles/5805671-boldin-s-monte-carlo-simulation), [Boldin Review](https://www.retirebeforedad.com/boldin-review/)

---

### 1.4 Australian Market Gap Summary

| Capability | Xero | Fathom | Jirav | MoneyQuest (proposed) |
|-----------|------|--------|-------|----------------------|
| Ledger-native data | Yes | No (import) | No (import) | **Yes** |
| Multi-variable scenarios | No | Yes (limited) | Yes | **Yes** |
| Three-way forecasting | No | Yes | Yes | **Yes** |
| Monte Carlo / probability | No | No | No | **Yes** |
| Portfolio/asset integration | No | No | No | **Yes** |
| Goal tracking integration | No | No | No | **Yes** |
| Save & compare named scenarios | No | Yes | Yes | **Yes** |
| Sensitivity analysis (tornado) | No | No | Yes (limited) | **Yes** |
| AI-generated scenarios | No | No | No | **Yes** |
| Real-time projection from live balances | No | No | No | **Yes** |

**Confidence: HIGH** — confirmed across 10+ competitor analyses. No AU accounting platform offers integrated scenario modelling with probability distributions.

---

## 2. Technical Patterns

### 2.1 Monte Carlo Simulation in TypeScript / Web Workers

**Architecture recommendation: Client-side Monte Carlo via Web Workers**

**Why client-side:**
- 1,000 iterations of a time-series projection with 5-10 variables is computationally feasible in JavaScript. Boldin runs 1,000 iterations client-side without issue.
- Web Workers offload computation to a background thread, keeping the UI responsive during simulation.
- No server cost for compute-intensive operations. The API provides the baseline data snapshot; the browser does the simulation.
- Server-side fallback for complex multi-entity scenarios or batch processing (e.g., practice dashboard showing all clients' projections).

**Implementation pattern:**

```typescript
// scenario-worker.ts — runs in Web Worker
type SimulationConfig = {
  iterations: number;          // default 1,000
  horizonMonths: number;       // 12, 60, 120, 240
  variables: VariableConfig[];
  baseline: BaselineSnapshot;
};

type VariableConfig = {
  key: string;
  mean: number;
  stdDev: number;
  distribution: 'normal' | 'lognormal' | 'uniform';
  bounds?: { min: number; max: number };
};

type SimulationResult = {
  percentiles: {
    p10: number[];  // monthly values at 10th percentile
    p25: number[];
    p50: number[];  // median
    p75: number[];
    p90: number[];
  };
  successRate: number;         // % of trials meeting target
  sensitivityRanking: SensitivityResult[];
};
```

**Key technical decisions:**
1. **Distribution type** — Use normal distribution for most financial variables (revenue growth, expense changes). Use lognormal for asset returns (stock prices can't go below zero). Use uniform for binary/bounded variables (interest rate between X and Y).
2. **Random number generation** — Use a seeded PRNG (e.g., `mulberry32`) for reproducible results. Allow users to re-seed for different random paths (like ProjectionLab).
3. **Performance** — 1,000 iterations x 240 months x 10 variables = ~2.4M calculations. JavaScript handles this in <500ms on modern hardware. Web Worker prevents UI jank.
4. **Correlation** — For v1, assume variables are independent. For v2, consider correlation matrices (e.g., high inflation often correlates with higher interest rates).

**Sources**: [Monte Carlo Simulation in JavaScript](https://scribbler.live/2024/04/09/Monte-Carlo-Simulation-in-JavaScript.html), [Parallel JavaScript for FinTech Monte Carlo](https://medium.com/@nttp/parallel-javascript-for-fintech-monte-carlo-e3b036d3d2d8), [JS vs WASM Monte Carlo](https://polyglot.codes/posts/webassembly-monte-carlo/)

---

### 2.2 Time-Series Projection Algorithm

**Core projection loop:**

```
For each month in horizon:
  1. Apply revenue growth rate to baseline revenue
  2. Apply expense change rates to baseline expenses
  3. Apply interest rate to debt balances
  4. Apply appreciation/depreciation to asset values
  5. Calculate tax liability based on projected income
  6. Update cash position = opening + revenue - expenses - tax - debt service
  7. Update net worth = assets - liabilities
  8. Check goal progress against projected values
```

**Baseline snapshot (from API):**
The server provides a point-in-time snapshot of all relevant financial data:
- Current cash position (from bank accounts)
- Revenue run-rate (from P&L / budgets)
- Expense run-rate (from P&L / budgets)
- Asset portfolio (from asset feed links)
- Debt balances (from liability accounts)
- Tax rates (from BAS/tax codes)
- Goal targets (from goals)

The client then applies variable adjustments and projects forward. The server never runs the simulation itself (except for batch/practice scenarios).

---

### 2.3 Sensitivity Analysis / Tornado Charts

**Algorithm:**

```
For each variable V:
  1. Hold all other variables at baseline
  2. Run projection with V at -20% of its range
  3. Run projection with V at +20% of its range
  4. Record the impact on the target metric (e.g., net worth at year 10)
  5. Impact = |result_high - result_low|

Sort variables by impact descending → tornado chart data
```

**Visualization:** Horizontal bar chart with bars extending left (downside) and right (upside) from a central baseline. The longest bar at top = most impactful variable. This visual hierarchy enables instant identification of which lever matters most.

**Implementation:** Recharts (already used in MoneyQuest) does not natively support tornado charts. Options:
1. **Custom Recharts BarChart** — use negative/positive values on a horizontal bar chart with custom labels. Feasible but requires workarounds.
2. **D3.js via visx** — Airbnb's low-level React+D3 primitives offer full control. Better for custom visualizations.
3. **Recharts with custom shapes** — Use `<Bar>` with computed negative/positive values and a `<ReferenceLine y={baseline}>`

**Recommendation:** Use Recharts for consistency with the existing codebase. A horizontal `<BarChart>` with negative/positive values achieves the tornado effect.

**Sources**: [Tornado Diagrams Guide](https://www.projinsights.com/tornado-diagram-a-simple-guide-to-sensitivity-analysis-with-examples/), [Tornado Charts Wikipedia](https://en.wikipedia.org/wiki/Tornado_diagram)

---

### 2.4 Data Model Design

**Proposed schema (Laravel models):**

```
Scenario                          ScenarioVariable
├── id                            ├── id
├── workspace_id                  ├── scenario_id
├── name                          ├── variable_key (enum)
├── description                   ├── adjustment_type (absolute|percent|override)
├── status (draft|active|archived)├── adjustment_value (integer, basis points or cents)
├── time_horizon_months           ├── distribution (normal|lognormal|uniform)
├── baseline_snapshot (json)      ├── std_dev_bps (integer, optional)
├── result_cache (json, nullable) ├── min_bound / max_bound (optional)
├── created_by                    └── created_at
├── created_at
└── updated_at

ScenarioComparison
├── id
├── workspace_id
├── name
├── scenario_ids (json array)
├── target_metric (enum: net_worth|cash_position|goal_progress|etc.)
└── created_at
```

**Variable keys (v1 — 8 core variables):**

| Key | Label | Unit | Default Distribution |
|-----|-------|------|---------------------|
| `revenue_growth` | Revenue Growth Rate | % p.a. | Normal |
| `expense_growth` | Expense Change Rate | % p.a. | Normal |
| `inflation_rate` | Inflation Rate | % p.a. | Normal |
| `interest_rate` | Interest Rate | % p.a. | Normal |
| `tax_rate` | Effective Tax Rate | % | Uniform |
| `asset_return` | Investment Return Rate | % p.a. | Lognormal |
| `property_growth` | Property Appreciation | % p.a. | Normal |
| `salary_growth` | Salary/Income Growth | % p.a. | Normal |

**Extensibility:** The `variable_key` is an enum. Future modules (Retirement Planning, Risk Management) can register additional keys without schema changes. Each variable carries its own distribution parameters, allowing fine-grained control per-scenario.

---

### 2.5 API Architecture

**Endpoints (following MoneyQuest patterns):**

```
GET    /api/v1/scenarios                    — list scenarios for workspace
POST   /api/v1/scenarios                    — create scenario
GET    /api/v1/scenarios/{uuid}             — get scenario with variables
PATCH  /api/v1/scenarios/{uuid}             — update scenario
DELETE /api/v1/scenarios/{uuid}             — soft-delete scenario
POST   /api/v1/scenarios/{uuid}/snapshot    — refresh baseline snapshot from live data
POST   /api/v1/scenarios/{uuid}/simulate    — (optional) server-side simulation
GET    /api/v1/scenarios/baseline           — get current baseline snapshot (no scenario)
POST   /api/v1/scenario-comparisons         — save comparison set
GET    /api/v1/scenario-comparisons/{uuid}  — get comparison with scenario data
```

**Key design decisions:**
1. **Baseline snapshot is server-generated** — aggregates data from budgets, P&L, balance sheet, portfolio, goals into one JSON blob. Heavy query, but called once per scenario creation/refresh.
2. **Simulation is client-side by default** — the frontend receives the baseline + variable definitions and runs Monte Carlo in a Web Worker. No server compute cost.
3. **Result caching** — after simulation, the client can POST results back for caching (so the dashboard widget can show last-run results without re-simulating).
4. **Practice view** — for accountant practice dashboards showing all clients, a batch endpoint runs simulations server-side to avoid requiring each client workspace to be loaded.

---

## 3. UX Patterns

### 3.1 Slider-Based Variable Adjustment

**Best practices from research:**

1. **Real-time feedback** — as the user drags a slider, the projection chart updates immediately (or with a short debounce). This is the "scrubbing" interaction that makes scenario planning feel powerful.

2. **Clear boundaries** — each slider shows min/max bounds and a baseline marker. Example: Revenue Growth slider ranges from -20% to +40% with a baseline marker at the budget's assumed rate.

3. **Numeric input alongside slider** — users who know their target number should be able to type it directly. The slider and input are bidirectionally linked.

4. **Grouped by category** — variables grouped into "Revenue & Growth", "Costs & Expenses", "Market & Economic", "Personal/Entity Specific" sections. Collapsible groups prevent overwhelming the user.

5. **Reset to baseline** — one-click reset per variable or reset-all to return to baseline assumptions.

6. **Accessibility** — keyboard-navigable sliders with ARIA labels. Step increments configurable (0.5% for rates, $1,000 for amounts).

**Sources**: [40 Slider UI Examples](https://www.eleken.co/blog-posts/slider-ui), [Slider Component Design Journey](https://medium.com/@oshalurade/designing-the-perfect-slider-component-f2dff91afa0a)

---

### 3.2 Side-by-Side Scenario Comparison

**Recommended layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Scenario Comparison: "Conservative" vs "Growth" vs ... │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ Projection Chart ──────────────────────────────┐    │
│  │  [Line per scenario, color-coded]                │    │
│  │  [Toggle scenarios on/off with checkboxes]       │    │
│  │  [X-axis: time, Y-axis: selected metric]        │    │
│  └──────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─ Comparison Table ──────────────────────────────┐    │
│  │  Metric        │ Base Case │ Conservative │ Growth│   │
│  │  Cash (Yr 5)   │  $420K    │   $380K      │ $580K │   │
│  │  Net Worth     │  $1.2M    │   $1.1M      │ $1.8M │   │
│  │  Goal Progress │  72%      │   65%        │  95%  │   │
│  └──────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─ Variable Diff ─────────────────────────────────┐    │
│  │  Variable        │ Base │ Conservative │ Growth  │    │
│  │  Revenue Growth  │  8%  │    4%        │   15%   │    │
│  │  Interest Rate   │  5%  │    6%        │    5%   │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Key patterns:**
- Up to 5 scenarios compared at once (more becomes visually noisy)
- Color coding consistent across chart and table
- "Delta" column showing difference from base case
- Toggle between metrics (cash position, net worth, profit, goal progress)

---

### 3.3 Probability Distribution Visualization (Fan Charts)

**Recommended approach (inspired by Boldin):**

1. **Central line** — the median (50th percentile) projection, solid and bold
2. **Inner band** — 25th to 75th percentile, medium opacity fill
3. **Outer band** — 10th to 90th percentile, light opacity fill
4. **Widening over time** — the bands naturally widen as uncertainty compounds, creating the "fan" effect
5. **Success marker** — a horizontal line at the target value (e.g., $500K net worth), with the percentage of trials exceeding it displayed prominently

**Implementation with Recharts:**
- Use `<Area>` component with `fillOpacity` for the bands
- Stack areas: outer band (light) behind inner band (medium) behind median line
- Use `d3.area()` approach for the confidence interval region
- The ForecastChart component already supports `<ReferenceArea>` and `<ReferenceLine>` — extend this pattern

**Key UX decisions:**
- **Default view** — show fan chart. Toggle to "show all trials" for power users (like ProjectionLab).
- **Success percentage** — displayed as a large number above the chart: "78% chance of reaching your goal"
- **Hover interaction** — hovering on a month shows a vertical line with the percentile values at that point

**Sources**: [D3 Confidence Interval Example](https://d3-graph-gallery.com/graph/line_confidence_interval.html), [Fan Chart Definition](https://financedictionarypro.com/definitions/f/fan-chart/)

---

### 3.4 Making Monte Carlo Understandable

**Communication patterns from Boldin & ProjectionLab:**

1. **"X% chance of success"** — the single most important output. Frame it positively: "85% chance your cash stays above $50K" rather than "15% chance of shortfall."

2. **Traffic light categories** — ProjectionLab lets users define Green/Yellow/Red thresholds. Example:
   - Green (90%+): "Very likely to succeed"
   - Yellow (70-89%): "Good chance, some uncertainty"
   - Orange (50-69%): "Uncertain — consider adjustments"
   - Red (<50%): "High risk — scenario needs changes"

3. **Plain language summaries** — AI can generate: "In 85 out of 100 simulated futures, your business maintains a positive cash position through 2031. The main risk factor is revenue growth — if it drops below 5%, your cash position becomes uncertain after year 3."

4. **Progressive disclosure** — default shows success rate + fan chart. "Show details" reveals percentile table, individual trials, distribution histograms.

5. **Comparison framing** — "Your Conservative scenario has a 92% success rate vs 68% for Aggressive Growth. The difference is driven primarily by the assumed revenue growth rate."

---

## 4. Existing Codebase Context

### 4.1 Cash Flow Forecasting (041-CFF)

**What exists:**
- `GenerateForecast` action: builds a 13-week (90-day) rolling forecast from invoices, bills, recurring templates, and historical payment pattern predictions
- `CashFlowForecast` model with `ForecastItem` children (week_number, source_type, amount, direction, confidence_pct)
- `GetForecastData` action: assembles weekly summaries with running balance from starting bank balance
- `ForecastChart` component: Recharts `ComposedChart` with inflow/outflow bars, projected balance line, threshold reference line, shortfall shading
- **Scenario overlay already exists**: `ForecastScenarioItem` type supports `add_item` and `move_item` mutations. `useForecastScenarioStore` (Zustand) holds ephemeral scenario items. The chart renders a purple dashed "scenario balance" line alongside the blue "projected balance" line.

**Reuse opportunity:**
- The 13-week forecast provides the short-term baseline for the scenario engine's cash position projections
- The scenario overlay UX pattern (toggle on/off, add items, see impact) can be extended to multi-variable scenarios
- The `ForecastChart` component's `scenarioData` prop pattern can be generalized

**Gaps to fill:**
- Current scenarios are ephemeral (Zustand store, not persisted). The engine needs named, saved scenarios.
- Current scenarios only add/move individual cash items. The engine needs percentage-based growth rate adjustments.
- Current horizon is 13 weeks. The engine needs 1-20 year horizons.
- No probability distributions. Each scenario item is deterministic.

**Key files:**
- `frontend/src/types/forecast.ts` — ForecastScenarioItem type with client-generated UUID
- `frontend/src/stores/forecast-scenario.ts` — Zustand store with add/remove/toggle
- `frontend/src/components/forecast/scenario-panel.tsx` — UI for adding hypothetical items (direction, week, amount, label)
- `frontend/src/components/forecast/forecast-chart.tsx` — Recharts chart with scenario overlay line
- `app/Actions/Forecasting/GenerateForecast.php` — 90-day forecast from invoices/bills/recurring/predicted
- `app/Actions/Forecasting/GetForecastData.php` — Weekly summary builder with running balance
- `app/Models/Tenant/CashFlowForecast.php` — workspace-scoped, one active forecast
- `app/Models/Tenant/ForecastItem.php` — items with source_type, confidence_pct, direction
- `app/Http/Controllers/Api/CashFlowForecastController.php` — CRUD + generate + threshold endpoints

---

### 4.2 Portfolio Tracking (049-APF)

**What exists:**
- `AssetFeedLink` type: tracks assets linked to external price feeds (vehicles, listed securities, property, crypto, managed funds, term deposits)
- `PortfolioSummary` type: aggregates total book value, market value, unrealised gains, return %, and breakdown by asset class
- `AssetPriceHistoryPoint` type: valuation history with market/trade values and confidence scores
- `usePortfolio()` hook: fetches portfolio summary from `/asset-feeds/portfolio`
- `ChartPortfolioWatchlist` component: sparkline-based watchlist with asset class badges and change percentages
- `RevaluationPolicyConfig` type: per-class revaluation method (fair value P&L or reserve)

**Reuse opportunity:**
- Portfolio data provides the asset side of net worth projections
- Historical price data enables return calculation for asset growth assumptions
- Asset class breakdown enables class-specific return assumptions (e.g., property at 5% p.a., equities at 8% p.a.)
- The sparkline and percentage-change patterns in `ChartPortfolioWatchlist` can be reused in scenario comparison views

**Key files:**
- `frontend/src/types/asset-feed.ts` — AssetFeedLink, PortfolioSummary, AssetPriceHistoryPoint types
- `frontend/src/hooks/use-asset-feeds.ts` — TanStack Query hooks for portfolio/history/policies
- `frontend/src/components/dashboard/widgets/charts/ChartPortfolioWatchlist.tsx` — Watchlist with sparklines

---

### 4.3 Budgets (029-BGT)

**What exists:**
- `Budget` model: workspace-scoped, with name, type, tracking_category_id, fiscal_year, start/end dates, status (BudgetStatus enum)
- `BudgetLine` model: per-account, per-period budget amounts (integer cents)
- Budget can be filtered by tracking category and fiscal year
- Budgets link to chart accounts for account-level budgeting

**Reuse opportunity:**
- Budget data provides the income/expense baseline for projections — the scenario engine's "base case" revenue and expense assumptions should default to budget amounts
- Budget variance (actual vs budget) provides calibration data for confidence levels — if actuals consistently exceed budget by 10%, the scenario engine can adjust the mean upward
- The fiscal year and period structure aligns with the projection engine's monthly time steps

**Key files:**
- `app/Models/Tenant/Budget.php` — workspace_id, fiscal_year, tracking_category, status
- `app/Models/Tenant/BudgetLine.php` — budget_id, chart_account_id, period, amount (cents)

---

### 4.4 Goals (037-GLS)

**What exists:**
- `Goal` model: supports workspace, user, and group scopes. Types: revenue, expense, profit, savings, debt, net_worth, cash_reserve, custom.
- Tracks target_cents, baseline_cents, current_cents with progress calculation
- `GoalType` enum has a `direction()` method (increase vs decrease) affecting progress math
- `paceStatus()` computes ahead/on_track/behind based on time elapsed vs progress
- `projectedEndValue()` extrapolates current daily rate to deadline — a simple linear projection
- `GoalProgressHistory` records historical value snapshots for trend analysis
- Frontend `Goal` type includes progress_percent, pace_status, projected_end_cents, milestones

**Reuse opportunity:**
- Goals provide the "success criteria" for Monte Carlo simulations — "what % of trials achieve this goal?"
- `projectedEndValue()` is a simple linear projection; the scenario engine replaces this with a multi-variable, distribution-aware projection
- Goal milestones can be plotted on scenario projection charts as reference markers
- The pace_status (ahead/on_track/behind) concept maps directly to Monte Carlo success rate categories

**Key files:**
- `app/Models/Tenant/Goal.php` — scopes, types, progress calculation, pace status, projected end value
- `app/Models/Tenant/GoalProgressHistory.php` — historical value snapshots
- `frontend/src/types/goal.ts` — GoalScope, GoalType, GoalStatus, GoalTimeframe, PaceStatus types

---

### 4.5 Financial Ratios (057-CDB2)

**What exists:**
- `GetFinancialRatios` action: computes 20+ ratios on-demand from live journal entry data
- Ratios span: Liquidity (current, quick, cash, working capital), Profitability (gross margin, net profit margin, ROA, ROE), Efficiency (DSO, DPO, asset turnover, receivables turnover), Leverage (D/E, D/A, interest coverage), Growth (revenue, expense, profit growth)
- Frontend types in `financial-ratios.ts` match the API shape exactly
- Growth ratios (current vs prior period) provide the baseline growth rates for the scenario engine

**Reuse opportunity:**
- Growth ratios (revenue_growth, expense_growth) are natural defaults for scenario variable sliders
- Leverage ratios inform debt-related scenario variables
- The on-demand computation pattern (no background jobs, calculated when widget renders) should be adopted for the baseline snapshot endpoint
- The `FinancialRatiosSummary` (total_revenue, total_expenses, net_profit, total_assets, total_liabilities, total_equity) is essentially the baseline snapshot the scenario engine needs

**Key files:**
- `app/Actions/Dashboard/GetFinancialRatios.php` — 20+ ratios computed from JE lines + chart accounts
- `frontend/src/types/financial-ratios.ts` — Typed ratio interfaces

---

## 5. Synthesis

### 5.1 Consolidated Requirements

| # | Requirement | Source | Confidence |
|---|------------|--------|------------|
| 1 | Named, persistent scenarios with CRUD operations | Idea brief + competitive analysis (Fathom, Jirav all persist scenarios) | HIGH |
| 2 | Multi-variable adjustment (5-8 variables in v1) | Idea brief + competitor gap analysis | HIGH |
| 3 | Time horizons: 1, 5, 10, 20 years | Idea brief + personal finance tools (Boldin/ProjectionLab support 30+ years) | HIGH |
| 4 | Side-by-side scenario comparison (up to 5) | Idea brief + every competitor supports this | HIGH |
| 5 | Monte Carlo simulation (1,000 iterations) | Idea brief + Boldin pattern (1,000 runs is industry standard) | HIGH |
| 6 | Fan chart with percentile bands (10th/25th/50th/75th/90th) | Boldin + ProjectionLab patterns | HIGH |
| 7 | Success rate percentage ("X% chance of meeting goal") | Boldin + ProjectionLab patterns | HIGH |
| 8 | Sensitivity analysis with tornado chart | Idea brief + Jirav has limited sensitivity testing | MEDIUM |
| 9 | Baseline snapshot from live ledger data | Unique MoneyQuest advantage, confirmed by codebase analysis | HIGH |
| 10 | Client-side Monte Carlo via Web Workers | Technical research, performance feasible, cost-efficient | HIGH |
| 11 | Server-side simulation fallback for practice batch views | Idea brief (Sprint 5) | MEDIUM |
| 12 | AI-generated scenario suggestions | Idea brief (Sprint 4), no competitor offers this | MEDIUM |
| 13 | Integration with Goals (success criteria) | Idea brief + Goal model analysis | HIGH |
| 14 | Integration with Portfolio (asset projections) | Idea brief + AssetFeedLink analysis | HIGH |
| 15 | Integration with Budgets (expense/revenue baseline) | Idea brief + Budget model analysis | HIGH |
| 16 | Slider-based variable adjustment with real-time chart updates | UX research + every modern planning tool uses sliders | HIGH |
| 17 | Dashboard widget showing last-run scenario summary | Idea brief (Sprint 5) | MEDIUM |
| 18 | Extensible variable schema for future modules (Retirement, Risk) | Idea brief notes section | HIGH |

### 5.2 Open Questions

1. **Multi-entity scenarios** — should a scenario span multiple workspaces (e.g., a family group)? The Goal model already supports group scope. The scenario model may need a similar pattern.
2. **Variable correlation** — for v1, assume independence. When to add correlation matrices? (Answer: v2, when users request "if inflation rises, interest rates probably rise too.")
3. **Historical calibration** — should the engine automatically derive growth rates from historical data, or require manual input? Recommendation: default to last 12 months actuals, allow manual override.
4. **Permission model** — who can create/view/edit scenarios? Likely follows the `forecast.view`/`forecast.manage` pattern already used for cash flow forecasting.
5. **Snapshot staleness** — how often should baseline snapshots refresh? On every scenario open? Daily? On-demand only?
6. **Practice advisory view** — should accountants see a "portfolio" view of all their clients' scenarios? This is a Sprint 5 item but affects data model design (central vs tenant scoped scenarios).

### 5.3 Technical Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Monte Carlo performance on low-end devices | LOW | Web Worker isolates computation. 1,000 iterations at 240 months is ~500ms on 2020 hardware. Reduce to 500 iterations on mobile. |
| Projection accuracy expectations | MEDIUM | Clear labeling: "Projections, not predictions." Confidence bands explicitly show uncertainty range. Disclaimer text on all scenario pages. |
| Variable independence assumption (v1) | LOW | Document limitation. Most users won't notice. Add correlation in v2 when sophistication demands it. |
| Baseline snapshot query cost | MEDIUM | The `GetFinancialRatios` action already queries JE lines + chart accounts efficiently. Extend with caching (5-minute TTL). |
| Feature scope creep | HIGH | v1 ships with 8 variables only. Variable schema is extensible, but new variables require deliberate addition. |

---

## 6. Recommended Next Steps

1. **Proceed to PRD/spec** — research confirms strong market opportunity, feasible technical approach, and solid codebase foundation
2. **Design the baseline snapshot API first** — this is the foundation everything builds on. It aggregates data from 5+ existing modules.
3. **Build the Web Worker Monte Carlo engine as a standalone module** — testable in isolation before UI integration
4. **Start with deterministic projections (no Monte Carlo)** — Sprint 1-2 can ship value with simple multi-variable projections before adding probability distributions in Sprint 4
5. **Prototype the fan chart early** — the visualization is the "wow" moment. A working fan chart demo will validate the approach before investing in the full scenario CRUD.
6. **Coordinate with Goal model** — the scenario engine's success criteria should reference Goal targets directly, enabling "X% chance of reaching [Goal Name]" output

---

## Sources

### Competitor Analysis
- [Xero Cash Flow Software](https://www.xero.com/us/accounting-software/analytics/cash-flow/)
- [Xero Cash Flow Limitations](https://cashflowfrog.com/blog/xero-cash-flow-forecasting-tool-uses-and-limitations/)
- [Dryrun + Xero Scenario Modeling](https://www.dryrun.com/xero-cash-flow-forecasting-scenario-modeling-with-dryrun)
- [Fathom 6 Best Financial Modelling Tools](https://www.fathomhq.com/blog/the-6-best-financial-modelling-software-tools)
- [Fathom Scenario Planning](https://blog.fathomhq.com/how-scenario-planning-can-help-businesses-stay-ahead)
- [Jirav vs Fathom](https://www.jirav.com/blog/jirav-vs-fathom-deep-fpa-vs-financial-reporting)
- [FreshBooks vs QuickBooks vs Xero](https://www.webgility.com/blog/freshbooks-vs-quickbooks-vs-xero)
- [Top Financial Modelling Software Australia](https://slashdot.org/software/financial-modeling/in-australia/)
- [Bentleys — Financial Modelling Guide Australia](https://www.bentleys.com.au/resources/financial-projection-methods-budget-scenario-planning-predictive-modeling-and-trend-analysis-for-australian-companies/)

### Personal Finance Tools
- [ProjectionLab Monte Carlo](https://projectionlab.com/monte-carlo)
- [ProjectionLab Monte Carlo Redesign](https://projectionlab.com/blog/monte-carlo-redesign)
- [Boldin Monte Carlo Simulation](https://help.boldin.com/en/articles/5805671-boldin-s-monte-carlo-simulation)
- [Boldin Review](https://www.retirebeforedad.com/boldin-review/)
- [Boldin vs Best Retirement Planning](https://www.boldin.com/retirement/newretirement-vs-best-retirement-planning/)

### Technical Patterns
- [Monte Carlo Simulation in JavaScript](https://scribbler.live/2024/04/09/Monte-Carlo-Simulation-in-JavaScript.html)
- [Parallel JavaScript for FinTech Monte Carlo](https://medium.com/@nttp/parallel-javascript-for-fintech-monte-carlo-e3b036d3d2d8)
- [JS vs WASM Monte Carlo](https://polyglot.codes/posts/webassembly-monte-carlo/)
- [D3 Confidence Interval](https://d3-graph-gallery.com/graph/line_confidence_interval.html)
- [Fan Chart Definition](https://financedictionarypro.com/definitions/f/fan-chart/)

### UX Patterns
- [40 Slider UI Examples](https://www.eleken.co/blog-posts/slider-ui)
- [Slider Component Design](https://medium.com/@oshalurade/designing-the-perfect-slider-component-f2dff91afa0a)
- [Tornado Diagram Guide](https://www.projinsights.com/tornado-diagram-a-simple-guide-to-sensitivity-analysis-with-examples/)
- [Tornado Diagrams Wikipedia](https://en.wikipedia.org/wiki/Tornado_diagram)
