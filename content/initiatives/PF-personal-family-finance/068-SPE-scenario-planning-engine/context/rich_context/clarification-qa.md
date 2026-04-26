---
title: "068-SPE Scenario Planning Engine — Clarification Q&A"
description: "20 self-clarification questions and answers covering scope, data model, projection engine, integrations, UX, and multi-tenancy for the Scenario Planning Engine epic."
---

# 068-SPE Scenario Planning Engine — Clarification Q&A

**Date**: 2026-03-22
**Method**: Self-clarification (spec analyst + product owner) against idea brief and codebase context

---

## 1. Scope Boundaries

### Q1. What is in v1 vs deferred to v2+?

**Answer**: v1 ships with a focused variable set and deterministic projections only. Specifically:

**v1 (this epic)**:
- Named scenario CRUD (create, save, rename, duplicate, delete)
- 5 adjustable variable categories: revenue growth %, expense growth %, interest rate %, inflation rate %, asset appreciation %
- Deterministic time-series projection across 1, 5, 10, and 20-year horizons
- Baseline snapshot from real ledger data (balance sheet + P&L actuals)
- Side-by-side comparison of up to 3 scenarios
- Sensitivity tornado chart (which variable moves the outcome most)
- Line chart overlay of projected net worth / cash / profit across scenarios
- "Base Case" auto-generated scenario using current actuals and zero-change assumptions

**Deferred to v2**:
- Monte Carlo probability distributions and confidence ranges
- AI-generated scenario suggestions based on market data or patterns
- Per-account-level variable overrides (e.g., "increase rent expense by 8% but hold salaries flat")
- Multi-entity/group-level consolidated scenario projections
- Scenario sharing and export to PDF
- Goal-linked scenario outcomes ("will I hit my savings goal under this scenario?")
- Integration with external market data feeds for auto-populated assumptions

Monte Carlo is deferred because it requires either a Web Worker implementation or server-side compute, and the value of getting deterministic projections right first outweighs the complexity of probability modelling.

### Q2. Where does scenario planning end and retirement planning / risk management begin?

**Answer**: The Scenario Planning Engine (068-SPE) is a **calculation and comparison layer**. It answers: "Given these variable changes over this time horizon, what does the projected financial position look like?"

Retirement Planning (069) will **consume** the SPE projection API to add retirement-specific concepts: retirement age, superannuation contribution schedules, drawdown rates, Age Pension eligibility, and retirement income adequacy. SPE does not know about retirement.

Risk Management (070) will **consume** the SPE projection API to add risk-specific concepts: probability of ruin, stress testing against historical market crashes, insurance gap analysis, and risk scoring. SPE does not calculate probabilities in v1 — it produces deterministic projections that Risk Management layers probability onto.

The boundary: if a variable or output concept is specific to retirement or risk, it belongs in 069/070. If it is a general "what happens to my finances if X changes by Y%" question, it belongs here.

### Q3. Does SPE apply to both business entities and personal ledger entities, or just one?

**Answer**: Both. The projection engine operates against whatever financial data the workspace holds. For a business workspace, the baseline is revenue/expenses/assets/liabilities from the business CoA. For a personal ledger workspace, the baseline is income/expenses/assets/liabilities from the personal CoA. The variable schema is the same — revenue growth applies to business revenue or personal income; expense growth applies to both.

The only difference is the output labels: business entities see "Revenue" and "COGS", personal entities see "Income" and "Living Expenses". This is a display concern, not a data model concern. The workspace's `entity_type` field (already present on the Workspace model) determines the label set.

### Q4. Is there a minimum data requirement before a user can create a scenario?

**Answer**: No hard gate. A user can create a scenario with zero historical data — the baseline snapshot will simply show zeroes, and the projections will be based purely on the variables they set. This is useful for pre-revenue businesses modelling a growth plan.

However, the UI will show a soft informational banner: "This scenario is based on limited data. Add 6+ months of transactions for more accurate baselines." The banner appears when the workspace has fewer than 180 days of posted journal entries.

---

## 2. Data Model

### Q5. How are scenarios stored? What is the primary model?

**Answer**: A new `Scenario` model in `app/Models/Tenant/` with:

```
scenarios
├── id (bigint PK)
├── uuid (uuid, route key)
├── workspace_id (FK → workspaces)
├── created_by (FK → users)
├── name (string, e.g. "Aggressive Growth")
├── description (text, nullable)
├── status (enum: draft | active | archived)
├── baseline_snapshot (jsonb) — frozen financial position at creation time
├── variables (jsonb) — the adjustable parameters and their values
├── time_horizon_years (int, default 10)
├── is_base_case (boolean, default false)
├── projection_cache (jsonb, nullable) — cached projection results
├── projection_cached_at (timestamp, nullable)
├── created_at / updated_at
```

This is a standard Eloquent model, NOT event-sourced. Scenarios are planning tools, not financial facts. They are mutable (users adjust variables and re-project). Event sourcing is reserved for actual ledger mutations per project conventions.

The `baseline_snapshot` is a frozen copy of the financial position (total assets, liabilities, equity, revenue run-rate, expense run-rate, cash balance) captured at scenario creation. This means old scenarios remain comparable even as the real ledger changes.

### Q6. What is the schema for the `variables` JSON column?

**Answer**: A typed JSON object with a fixed set of variable categories. Each variable has a `value` (the user's input) and a `unit` (percent or absolute):

```json
{
  "revenue_growth": { "value": 15, "unit": "percent_annual", "label": "Revenue Growth" },
  "expense_growth": { "value": 5, "unit": "percent_annual", "label": "Expense Growth" },
  "interest_rate": { "value": 6.5, "unit": "percent_annual", "label": "Interest Rate" },
  "inflation_rate": { "value": 3.2, "unit": "percent_annual", "label": "Inflation Rate" },
  "asset_appreciation": { "value": 5, "unit": "percent_annual", "label": "Asset Appreciation" }
}
```

v1 uses only `percent_annual` as the unit. v2 will add `absolute_annual` (e.g., "add $50,000 salary expense") and `percent_one_off` (e.g., "one-time 20% revenue spike in year 3"). The schema is intentionally extensible — future modules (069, 070) can register their own variable keys without changing the Scenario model.

On the backend, a `ScenarioVariableData` Spatie Data class will validate and type-cast this structure, following the project's existing pattern with `JournalEntryLineData`.

### Q7. How does the baseline snapshot work? Is it recalculated or frozen?

**Answer**: Frozen at creation time. When a user creates a scenario, the system calls `GetFinancialRatios::run()` (already exists in `app/Actions/Dashboard/GetFinancialRatios.php`) plus `GetCashSummary::run()` to capture the current financial position. This snapshot is stored in `baseline_snapshot` as JSON.

The snapshot includes:
- `total_assets`, `total_liabilities`, `total_equity` (from balance sheet)
- `annual_revenue`, `annual_expenses`, `net_profit` (trailing 12 months, annualised)
- `cash_balance` (sum of bank accounts)
- `total_debt` (current + non-current liabilities)
- `asset_values` (array of asset categories with current values from `Asset` model)
- `captured_at` (timestamp)

The frozen snapshot means: if you created a "Conservative" scenario 6 months ago, it still shows projections from that point in time. This is intentional — it allows "then vs now" comparison. A user can duplicate a scenario to create a new one with a fresh baseline if they want an updated starting point.

### Q8. Is there a separate `scenario_projections` table, or are projections stored inline?

**Answer**: Inline in `projection_cache` as JSON. No separate table. The projection output is a time-series array:

```json
[
  { "year": 0, "net_worth": 150000000, "cash": 50000000, "revenue": 120000000, "expenses": 95000000, "assets": 300000000, "liabilities": 150000000 },
  { "year": 1, "net_worth": 168500000, "cash": 62000000, ... },
  ...
  { "year": 10, ... }
]
```

All amounts in cents (integers), consistent with the project convention. The cache is invalidated (set to null) whenever `variables` or `time_horizon_years` changes, and recalculated on next view. This avoids a separate table while keeping projections fast to read.

The maximum payload size is ~20 data points (years 0-20) with ~8 metrics each = ~160 values. Well within JSON column limits.

---

## 3. Projection Engine

### Q9. Is the projection engine client-side or server-side?

**Answer**: Server-side via a Laravel Action (`ProjectScenario`). Reasons:

1. The baseline snapshot requires querying ledger data (journal entries, assets, bank accounts) — this must happen server-side.
2. The projection calculation is deterministic arithmetic — not computationally expensive — so no need for Web Workers.
3. Server-side keeps the business logic in Actions (project convention) rather than duplicating financial calculation in TypeScript.
4. The projection result is cached in `projection_cache`, so subsequent views are a single JSON read with zero recalculation.

The API endpoint is `POST /api/v1/scenarios/{uuid}/project` which runs the projection and returns the result. The frontend calls this once when a scenario is created or variables change, then reads the cached result thereafter.

### Q10. How does the projection calculation work? What is the mathematical model?

**Answer**: Compound annual growth applied to the baseline snapshot, year by year. For each year `t` from 1 to `time_horizon_years`:

```
revenue[t] = revenue[t-1] * (1 + revenue_growth / 100)
expenses[t] = expenses[t-1] * (1 + expense_growth / 100) * (1 + inflation_rate / 100)
net_profit[t] = revenue[t] - expenses[t]
cash[t] = cash[t-1] + net_profit[t] - (debt_balance[t-1] * interest_rate / 100)
assets[t] = non_cash_assets[t-1] * (1 + asset_appreciation / 100) + cash[t]
liabilities[t] = liabilities[t-1]  // static in v1 (no debt repayment modelling)
net_worth[t] = assets[t] - liabilities[t]
```

v1 uses a simplified model where:
- Revenue and expenses compound independently
- Inflation stacks on top of expense growth (compounding)
- Interest is paid annually on the opening debt balance (no amortisation in v1)
- Asset appreciation applies to non-cash assets only (property, investments, equipment)
- Liabilities remain static (no repayment schedule — that is a v2 / 069 Retirement feature)
- Cash accumulates net profit minus interest payments

This is intentionally simple. The value is in the comparison, not the precision. Users are modelling directional outcomes ("am I better off with 15% growth or 5% cost reduction?"), not building an auditable forecast.

### Q11. What is the time granularity of projections?

**Answer**: Annual. v1 projects in whole years only. The output is one data point per year from year 0 (baseline) to year N (time_horizon_years).

Monthly granularity is deferred. It adds 12x the data points without proportional value for long-horizon planning (5-20 years). The existing Cash Flow Forecast (041-CFF) already provides weekly granularity for the short-term (13 weeks). SPE fills the long-term gap.

If a user selects a 1-year horizon, they still get annual granularity (year 0 and year 1). For sub-annual detail, they should use the cash flow forecast.

### Q12. How is sensitivity analysis (tornado chart) calculated?

**Answer**: One-at-a-time perturbation. For the tornado chart, the engine:

1. Takes the current scenario variables as the "centre" case
2. For each variable, creates two derivative projections: one with the variable increased by a fixed delta (+25% of its current value, minimum +1pp), one with it decreased by the same delta
3. Measures the impact on a chosen outcome metric (default: net worth at the final year)
4. Ranks variables by the absolute spread (high - low projection)

This runs server-side as part of the `ProjectScenario` action. The sensitivity data is included in the `projection_cache`:

```json
{
  "time_series": [...],
  "sensitivity": [
    { "variable": "revenue_growth", "low": 120000000, "centre": 150000000, "high": 185000000 },
    { "variable": "expense_growth", "low": 170000000, "centre": 150000000, "high": 125000000 },
    ...
  ]
}
```

The tornado chart is a horizontal bar chart rendered with Recharts (already used in the codebase for dashboard widgets).

---

## 4. Integration Points

### Q13. How does SPE connect to the existing Cash Flow Forecast (041-CFF)?

**Answer**: It does not directly consume the CFF output. They are complementary but separate:

- **CFF** = short-term (13-week), transaction-level, based on real invoices/bills/recurring items
- **SPE** = long-term (1-20 year), variable-based, based on annualised run-rates

The connection point is the **baseline snapshot**: SPE reads the current cash balance (from bank accounts, same source as CFF's `starting_balance`) and the current revenue/expense run-rate (from the ledger, same data CFF's `getPredictedItems` uses historically). But SPE does not import CFF's weekly projections.

In v2, we may add a "zoom" feature where the first year of an SPE projection uses CFF's granular weekly data and then switches to annual projections for years 2+. But that is deferred.

### Q14. How does SPE connect to Goals (037-GLS)?

**Answer**: Read-only in v1. The scenario detail page will show a "Goal Overlay" section that displays active goals as horizontal milestone lines on the projection chart. For example, if a user has a "Net Worth $2M by 2030" goal, the chart shows a dashed line at $2M, and the projected net worth line either crosses it (goal achievable) or falls short.

This is a display integration only — no writes to the Goal model. The frontend reads goals via the existing `/api/v1/goals` endpoint and overlays them on the projection chart using the `GoalType` to map to the correct output metric (e.g., `net_worth` type maps to the net worth time series, `revenue` type maps to the revenue time series).

v2 will add write integration: "Create a goal from this scenario outcome" and "Which scenario gets me to my goal fastest?"

### Q15. How does SPE connect to Budgets (029-BGT)?

**Answer**: The baseline snapshot optionally uses the active budget as the expense/revenue baseline instead of trailing actuals. When creating a scenario, the user can choose:

- **"Actual" baseline** (default) — uses trailing 12-month actuals from the ledger
- **"Budget" baseline** — uses the active budget's annual totals as the starting revenue/expense figures

This is a toggle on the scenario creation form. The `baseline_snapshot` records which source was used (`baseline_source: "actual" | "budget"`) and the budget ID if applicable. The Budget model already has `lines` with `chart_account_id` and `amount` per period — we sum these for the annual figure.

### Q16. How does SPE connect to Assets/Portfolio (049-APF, 033-FAR)?

**Answer**: The baseline snapshot includes asset values grouped by category. The `Asset` model already has `category` (enum), `net_book_value`, and `cost`. The snapshot captures:

```json
{
  "asset_values": {
    "property": 250000000,
    "vehicles": 4500000,
    "equipment": 1200000,
    "investments": 35000000,
    "other": 500000
  }
}
```

The `asset_appreciation` variable in v1 applies a uniform rate across all non-cash assets. v2 will allow per-category appreciation rates (e.g., property +5%, vehicles -10% depreciation, investments +8%).

For assets with `AssetFeedLink` (live price feeds from Redbook, ASX, etc.), the snapshot captures the latest market value rather than book value. This gives a more realistic baseline for personal ledger users tracking investment portfolios.

### Q17. Does SPE integrate with Tax/BAS (044-TAX)?

**Answer**: Not in v1. Tax is complex — marginal rates, company vs individual, offsets, CGT — and modelling it correctly requires deep integration with the tax engine.

In v1, projections are pre-tax. The projection output includes a note: "Projections are before tax. Actual outcomes will differ based on your tax position."

v2 will add a `tax_rate` variable (effective tax rate as a simple percentage) that reduces net profit by that rate. A full marginal tax calculation is a 069/070 concern.

---

## 5. UX & Interaction

### Q18. How do users create and compare scenarios? What is the primary UI flow?

**Answer**: The Scenario Planning Engine lives at `/scenarios` (workspace-scoped) with three views:

1. **Scenario List** — standard index page with StatusTabs (Draft / Active / Archived), table with name, created date, horizon, last projected. "New Scenario" button with `N` keyboard shortcut.

2. **Scenario Builder** (create/edit) — a single-page form:
   - Name + description fields at the top
   - Baseline source toggle (Actual vs Budget)
   - Time horizon selector (1 / 5 / 10 / 20 years)
   - Variable sliders — each variable is a labeled slider with a numeric input beside it. Sliders range from -50% to +100% with 0.5% steps. Default values are pre-populated from recent actuals (e.g., if historical revenue growth was 12%, the slider starts at 12%).
   - "Project" button that triggers the server-side calculation
   - Results area below: line chart + summary table

3. **Comparison View** — accessible from the list page by selecting 2-3 scenarios via checkboxes and clicking "Compare". Opens a dedicated comparison page:
   - Overlaid line chart (one line per scenario, different colours)
   - Side-by-side summary table (scenario columns, metric rows)
   - Tornado chart for the selected scenario showing variable sensitivity
   - Outcome metric selector: net worth (default), cash, revenue, profit

The comparison URL is `/scenarios/compare?ids=uuid1,uuid2,uuid3` — bookmark-friendly.

### Q19. What visualisations does v1 include?

**Answer**: Three chart types, all rendered with Recharts (already in the codebase):

1. **Projection Line Chart** — on the scenario detail page. X-axis: years (0 to N). Y-axis: dollar amount. One line per outcome metric (net worth, cash, revenue, expenses). Toggle-able series. Shows the single scenario's projected trajectory.

2. **Comparison Overlay Chart** — on the comparison page. Same axes. One line per scenario for the selected outcome metric. Up to 3 scenarios overlaid with distinct colours and a legend.

3. **Sensitivity Tornado Chart** — horizontal bar chart. One bar per variable. Bar extends left (decrease) and right (increase) from the centre value. Variables sorted by total spread (most impactful at top). Clicking a bar shows the two derivative scenarios that produced the spread.

All charts follow the existing `ChartCard` wrapper pattern (from `frontend/src/components/dashboard/widgets/charts/ChartCard.tsx`) for consistent styling — title, subtitle, optional date range, responsive container.

### Q20. What keyboard shortcuts does the scenario planning feature add?

**Answer**: Following the project's keyboard-first UX convention:

| Shortcut | Context | Action |
|----------|---------|--------|
| `G then P` | Global | Go to Scenarios (P for Planning) |
| `N` | Scenario list | New Scenario |
| `J` / `K` | Scenario list | Navigate up/down |
| `Enter` | Scenario list | Open selected scenario |
| `E` | Scenario detail | Edit scenario variables |
| `Cmd+Enter` | Scenario builder | Run projection |
| `C` | Scenario list (with selection) | Compare selected scenarios |
| `Escape` | Comparison view | Back to list |

These are registered with `useHotkeys` and included in the `?` shortcut help overlay. The `G then P` shortcut is added to `frontend/src/lib/navigation.ts` and the sidebar. The CLAUDE.md keyboard shortcuts table should be updated when this ships.

---

## 6. Multi-tenancy & Permissions

### Q21. Who can create and view scenarios? What permissions are needed?

**Answer**: New permissions added to `RolesAndPermissionsSeeder`:

- `scenario.view` — view scenario list and projections
- `scenario.create` — create and edit scenarios
- `scenario.delete` — delete scenarios

Role mapping:

| Role | view | create | delete |
|------|------|--------|--------|
| owner | yes | yes | yes |
| accountant | yes | yes | yes |
| bookkeeper | yes | no | no |
| approver | yes | no | no |
| auditor | yes | no | no |
| client | yes | no | no |

Rationale: Scenarios are advisory/planning tools — accountants and owners create them, everyone else can view. Bookkeepers and approvers can see projections (useful for understanding the business direction) but cannot create or modify them. Clients can view scenarios their accountant has shared (the advisor creates the scenario in the client's workspace).

No approval workflow — scenarios are not financial documents. Draft/Active/Archived status is for the creator's own organisation, not for approval gates.

### Q22. Are scenarios workspace-scoped? Can they span multiple workspaces (groups)?

**Answer**: Scenarios are strictly workspace-scoped in v1. Each scenario belongs to a single workspace via `workspace_id`. The baseline snapshot reflects that workspace's financial data only.

Group-level scenarios (projecting across multiple entities in a WorkspaceGroup) are deferred to v2. This requires the consolidation logic from 028-CFT to produce a combined baseline, which adds significant complexity. v1 focuses on per-entity planning.

Practice advisors access client scenarios through the standard workspace-switching mechanism — they switch to the client's workspace and see/create scenarios there. No special practice-level scenario model is needed.

### Q23. Can practice advisors create scenarios in client workspaces? Any restrictions?

**Answer**: Yes. If a practice advisor has the `accountant` or `owner` role in a client workspace (assigned when the practice-client relationship is established), they can create and modify scenarios in that workspace. The existing role-based access model handles this without any SPE-specific logic.

There is no "advisor-only" visibility flag. All scenarios in a workspace are visible to all users with `scenario.view` permission. If an advisor creates a scenario for advisory discussion, the client (with `client` role) can also see it. This is intentional — the value of scenarios is in shared understanding between advisor and client.

v2 may add a `visibility` field (`private` | `shared`) if advisors need draft scenarios that clients cannot see until ready. But v1 keeps it simple: all scenarios visible to all workspace members.
