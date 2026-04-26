---
title: "070-RTP Retirement Planning — Clarification Q&A"
description: "Self-clarification document: 20 targeted questions and answers across scope, data model, projection engine, AU super rules, integration points, and multi-person/practice considerations."
---

# 070-RTP Retirement Planning — Clarification Q&A

**Date**: 2026-03-22
**Roles**: Spec Analyst + Product Owner (self-clarified)

---

## 1. Scope Boundaries

### Q1. What is in v1 versus deferred to v2+?

**Answer**: v1 delivers four things:

1. **Retirement profile** — a per-user questionnaire capturing target retirement age, desired annual retirement income (in today's dollars), life expectancy assumption, current super balance (manual entry), and risk tolerance (conservative/balanced/growth/aggressive).
2. **Projection engine** — a deterministic drawdown calculator that takes current balances (super + personal assets + debts from the personal ledger), applies contribution schedules and assumed returns, and projects year-by-year balances from now until the life expectancy age. Outputs a single projected trajectory, not Monte Carlo.
3. **Scenario comparison** — leverages the 068-SPE Scenario Planning Engine to let users create 2-3 named retirement scenarios with different assumptions (e.g., "Retire at 60" vs "Retire at 65" vs "Max Super Contributions") and compare them side-by-side.
4. **AI trajectory insights** — a single API endpoint consumed by the existing AI chatbot (021-AIQ) that answers "when can I retire?" style questions by running the projection engine and returning a natural language summary.

**Deferred to v2+**:
- Monte Carlo probability distributions (depends on 068-SPE delivering this first)
- Super fund API integration (auto-pull balances from MyGov/fund APIs)
- Centrelink Age Pension modelling (assets test, income test, deeming rates)
- Employer-side retirement benefit planning
- Tax-optimised drawdown sequencing (which accounts to draw from first)
- Annuity/account-based pension product modelling
- International pension schemes (UK State Pension, US Social Security)

### Q2. Is v1 AU-only for superannuation rules?

**Answer**: Yes. v1 models Australian superannuation only. The retirement profile and projection engine are designed with AU-specific fields (SG rate, concessional/non-concessional caps, preservation age by birth year). However, the data model uses a `jurisdiction` field defaulting to `au` so the schema is extensible without migration when we add NZ KiwiSaver, UK pensions, or US 401(k) later.

Non-AU users can still use the module — they just won't get super-specific calculations. They'll enter retirement savings manually and get generic drawdown projections with configurable return rates. The super rules engine is a pluggable service class, not hardcoded into the projection engine.

### Q3. Where is the boundary between "information" and "financial advice"?

**Answer**: This is critical. v1 is strictly informational projection — we are NOT providing personal financial advice under AFSL regulations. Concrete boundaries:

- **We DO**: show projections based on user-supplied assumptions, display "what if" scenarios, highlight gaps (e.g., "at current trajectory you'll have $X at age 65"), and show the mathematical impact of changing contribution levels.
- **We DO NOT**: recommend specific super funds, suggest investment products, tell users to change their asset allocation, or produce any output that could be construed as a Statement of Advice (SOA).
- **Every projection screen** carries a persistent disclaimer: "This is a projection tool for informational purposes only. It is not financial advice. Projections are based on assumptions that may not reflect actual outcomes. Consult a licensed financial adviser before making financial decisions."
- **AI chatbot responses** about retirement include the same disclaimer appended to every message.
- The accountant/practice view can present projections to clients, but the UI explicitly labels outputs as "Client Projection" not "Financial Plan" or "Recommendation."

### Q4. Does the retirement planning module appear for all entity types or only personal workspaces?

**Answer**: The retirement profile is a **user-level** concept, not a workspace-level concept. A user has one retirement profile across all their workspaces. However, the projection engine pulls data from multiple workspaces:

- **Personal workspaces** (`EntityType::PERSONAL`): the primary surface. The "Retirement" nav item appears in the `personalNav` alongside Dashboard, Assets, Debts, Net Worth.
- **SMSF workspaces** (`EntityType::SMSF`): super balance is pulled from the SMSF workspace's ledger balances (member equity accounts via `AccountSubType::SMSF_MEMBER_EQUITY`).
- **Business workspaces** (`EntityType::PTY_LTD`, `EntityType::SOLE_TRADER`, etc.): if the user is an owner, the projection can optionally include a "business exit value" assumption — a manually-entered expected sale price and sale year.
- **Practice workspaces**: practices see a read-only advisory view of their client's retirement projection, not their own.

The retirement profile and projection are accessible from the personal workspace nav. The engine aggregates data cross-workspace via the user's workspace memberships.

---

## 2. Retirement Profile Data Model

### Q5. What data does the retirement profile collect?

**Answer**: The `RetirementProfile` model collects:

| Field | Type | Description |
|---|---|---|
| `user_id` | FK | The user this profile belongs to (1:1) |
| `jurisdiction` | string | `au` (default), extensible to `nz`, `uk`, `us` |
| `date_of_birth` | date | Required — drives preservation age, pension eligibility |
| `target_retirement_age` | int | When the user wants to retire (default: 67) |
| `life_expectancy_age` | int | Planning horizon (default: 90) |
| `desired_annual_income_cents` | int | In today's dollars, how much annual income in retirement |
| `risk_tolerance` | enum | `conservative`, `balanced`, `growth`, `aggressive` |
| `super_balance_cents` | int | Current super balance (manual entry in v1) |
| `super_fund_name` | string, nullable | Informational label only |
| `employer_sg_rate_bps` | int | Employer SG rate in basis points (default: 11500 = 11.5%) |
| `salary_sacrifice_cents` | int | Annual salary sacrifice amount (default: 0) |
| `voluntary_contribution_cents` | int | Annual voluntary (non-concessional) contributions (default: 0) |
| `home_ownership_status` | enum | `owner_no_mortgage`, `owner_with_mortgage`, `renter` — affects Age Pension eligibility later |
| `partner_profile_id` | FK, nullable | Link to partner's retirement profile for couples planning |
| `include_business_exit` | boolean | Whether to include business sale proceeds |
| `business_exit_value_cents` | int, nullable | Expected business sale proceeds |
| `business_exit_year` | int, nullable | Expected year of business sale |
| `meta` | json | Extensible field for future jurisdiction-specific data |

### Q6. Where does the retirement profile live — per-user or per-workspace?

**Answer**: Per-user, stored in the `retirement_profiles` table which is a **central** table (not tenant-scoped). Rationale: a person has one retirement, regardless of how many workspaces they own. The profile references the user, and the projection engine queries across all the user's workspaces to assemble the full picture.

This follows the same pattern as the `User` model being central while workspace-scoped data lives in tenant tables. The retirement profile is conceptually the user's personal planning data, not business data.

However, the `RetirementProjection` (the computed output) is cached per-user in a `retirement_projections` table (also central) with a `computed_at` timestamp. Projections are recomputed on demand or when underlying data changes (asset revaluation, super contribution, goal update).

### Q7. How does the retirement profile handle the onboarding flow?

**Answer**: The retirement profile is created through a dedicated onboarding wizard, not the workspace creation flow. The wizard is 3 steps:

1. **About You** — date of birth, target retirement age, life expectancy (with sensible defaults and a "use Australian average" button). This is the only required step.
2. **Your Super** — current super balance, fund name, employer SG rate, salary sacrifice, voluntary contributions. Pre-fills SG rate at the current legislated rate (11.5% for FY2025-26, rising to 12% by FY2027-28).
3. **Your Income Goal** — desired annual retirement income. Shows benchmark: "The ASFA comfortable retirement standard for a couple is $72,663/year (2024)." Also asks home ownership status.

Users can skip steps 2 and 3 and fill them in later. The profile is usable (produces a projection) with just step 1 + a super balance. Every field has a "learn more" tooltip explaining what it means and why it matters.

### Q8. Does the retirement profile replace or extend the existing Goal model?

**Answer**: It extends, not replaces. When a user creates a retirement profile, the system auto-creates a `Goal` with `type: GoalType::Custom` (we will add a new `GoalType::Retirement` case), `scope: GoalScope::User`, and a `target_cents` equal to the computed retirement fund target. This goal is linked back to the retirement profile via a `retirement_profile_id` on the `Goal` model (nullable FK).

The goal tracks the gap between current total retirement assets and the projected required fund balance. It auto-updates when the projection is recomputed. This means the retirement goal appears in the existing goals dashboard, progress history chart, and pace tracking — no separate goal UI needed.

The `GoalType::Retirement` enum case gets `direction: 'increase'`, `icon: 'sunset'`, and `label: 'Retirement Fund'`.

---

## 3. Projection Engine

### Q9. How does the drawdown modelling work?

**Answer**: The projection engine runs a year-by-year simulation from today until the life expectancy age, split into two phases:

**Accumulation phase** (now to retirement age):
- Start with current super balance + personal investment assets
- Each year: add employer SG contributions + salary sacrifice + voluntary contributions
- Apply assumed nominal return rate based on risk tolerance (conservative=5%, balanced=6.5%, growth=8%, aggressive=9.5%)
- Deduct 15% contributions tax on concessional contributions (employer SG + salary sacrifice)
- Compound annually (simplified — no monthly compounding in v1)

**Drawdown phase** (retirement age to life expectancy):
- No further contributions
- Each year: withdraw the desired annual income (inflation-adjusted from today's dollars)
- Apply a reduced return rate (accumulation rate minus 1.5%, reflecting a more conservative retirement portfolio)
- Track remaining balance year-by-year
- If balance hits zero before life expectancy: flag as "shortfall" and report the age at which funds are exhausted

Output is an array of `ProjectionYear` objects: `{ year, age, super_balance, investment_balance, total_balance, contributions, withdrawals, returns, is_shortfall }`.

### Q10. How are inflation assumptions handled?

**Answer**: Inflation is applied to two things:

1. **Desired retirement income** — the user enters income in today's dollars. The engine inflates this at a configurable rate (default: 2.5% CPI, matching RBA's target band midpoint) to calculate the actual withdrawal needed in each future year.
2. **Contribution caps** — AU concessional and non-concessional caps are indexed to AWOTE. In v1, we apply a 3% annual indexation to caps (slightly above CPI to approximate wage growth).

Return rates are **nominal** (i.e., they already include inflation). We do NOT show "real" vs "nominal" returns in v1 — too confusing for most users. The projection output shows nominal dollar amounts, with a footnote: "All amounts shown in future dollars. In today's dollars, your projected balance of $X would be approximately $Y."

The inflation rate is configurable per-scenario via the Scenario Planning Engine variable schema, so users can model "what if inflation is 4% for the next 5 years."

### Q11. Are superannuation-specific calculations handled by the projection engine or a separate service?

**Answer**: Separate service. The architecture is:

```
RetirementProjectionAction (orchestrator)
  ├── AuSuperCalculator (AU-specific rules)
  │   ├── calculateConcessionalTax()
  │   ├── calculatePreservationAge()
  │   ├── checkContributionCaps()
  │   └── calculateSgRate()
  ├── DrawdownCalculator (generic)
  │   ├── projectAccumulationPhase()
  │   └── projectDrawdownPhase()
  └── ReturnRateResolver (maps risk tolerance to rates)
```

`AuSuperCalculator` is a standalone service class in `app/Services/Retirement/AuSuperCalculator.php`. It encapsulates all AU-specific tax rates, contribution caps, and preservation age rules. When we add NZ or UK support later, we create `NzKiwiSaverCalculator` or `UkPensionCalculator` and the `RetirementProjectionAction` selects the right calculator based on `jurisdiction`.

`DrawdownCalculator` is jurisdiction-agnostic — it takes a starting balance, annual contributions, annual withdrawals, and a return rate, and produces the year-by-year trajectory.

### Q12. How does the projection handle the user's existing assets from the personal ledger?

**Answer**: The projection engine queries the user's personal workspace to pull current balances:

- **Super balance**: from `RetirementProfile.super_balance_cents` (manual entry in v1). In v2, this could auto-sync from an SMSF workspace's `AccountSubType::SMSF_MEMBER_EQUITY` balance.
- **Investment assets**: from `PersonalAsset` records where `category = 'investments'`. Summed as `current_value`.
- **Cash/bank**: from `PersonalAsset` records where `category = 'cash_bank'`. Included in total but modelled with a lower return rate (2% — cash rate assumption).
- **Property**: from `PersonalAsset` records where `category = 'property'`. Included in net worth but NOT included in the drawdown calculation unless the user explicitly marks a property as "sell before retirement" in the profile. Primary residence is excluded from retirement assets (consistent with Age Pension assets test).
- **Debts**: from `PersonalDebt` records. Summed and deducted from total retirement assets. Debts with `interest_rate > 0` are projected to reduce over time if there's a linked loan repayment schedule.

The engine calls `PersonalAsset::where('workspace_id', $personalWorkspaceId)->get()` and categorises by the existing `category` field. No schema changes needed on `PersonalAsset`.

---

## 4. AU Superannuation Rules

### Q13. Which AU super rules does v1 model?

**Answer**: v1 models these specific rules (all hardcoded as constants in `AuSuperCalculator` with a `super_rules_version` for future updates):

| Rule | v1 Implementation |
|---|---|
| **SG rate schedule** | 11.5% (FY2025-26), 12% (FY2027-28 onwards) — legislated schedule |
| **Concessional cap** | $30,000/year (FY2024-25), indexed at 3%/year |
| **Non-concessional cap** | $120,000/year (4x concessional cap) |
| **Contributions tax** | 15% on concessional contributions |
| **Preservation age** | 60 for anyone born after 1 July 1964 (simplified — full birth-year table stored but most users are post-1964) |
| **Earnings tax** | 15% in accumulation, 0% in pension phase (simplified) |

### Q14. Do we model the Division 293 high-income super tax?

**Answer**: Not in v1. Division 293 adds an extra 15% tax on concessional contributions for individuals earning over $250,000. This requires knowing the user's taxable income, which we don't reliably have in the personal ledger (it's a business/payroll concept). Deferred to v2 when we have a more complete income picture, potentially from payroll (064-PAY) integration.

We do store a `meta` JSON field on the retirement profile that can hold `estimated_annual_income_cents` for future use, but v1 doesn't use it for calculations.

### Q15. How do we handle the SG rate increasing over time?

**Answer**: The `AuSuperCalculator` stores the legislated SG rate schedule as an array:

```php
private const SG_SCHEDULE = [
    2024 => 11_00,  // 11.0% in basis points
    2025 => 11_50,  // 11.5%
    2026 => 12_00,  // 12.0% — legislated ceiling
];
```

For projection years beyond the legislated schedule, it holds at the final rate (12%). If the user overrides `employer_sg_rate_bps` on their profile, that override takes precedence (some employers pay above the minimum).

The profile field `employer_sg_rate_bps` defaults to `null`, meaning "use legislated rate." A non-null value means "my employer pays this specific rate."

### Q16. Do we model the $1.9M transfer balance cap (TBC)?

**Answer**: Not in v1. The TBC limits how much super can be transferred into a tax-free pension account. Modelling this properly requires tracking accumulation vs pension phase balances separately, which adds significant complexity. For v1, we treat all super as a single balance.

The projection does flag a warning if the projected super balance at retirement exceeds a threshold (currently $1.9M, stored as a constant): "Your projected super balance may exceed the transfer balance cap. This could affect your tax treatment in retirement. Speak with your financial adviser." This is an informational alert, not a calculation adjustment.

---

## 5. Integration Points

### Q17. How does retirement planning connect to the Scenario Planning Engine (068-SPE)?

**Answer**: Retirement planning is a **consumer** of the Scenario Planning Engine, not a standalone modelling system. The integration works like this:

- 068-SPE defines a `ScenarioVariable` schema. Retirement planning registers its own variables with the scenario engine:
  - `retirement.target_age` (int, 55-75)
  - `retirement.desired_income_cents` (int)
  - `retirement.super_contribution_extra_cents` (int, additional salary sacrifice)
  - `retirement.return_rate_bps` (int, override default for risk tolerance)
  - `retirement.inflation_rate_bps` (int, override default 250)
  - `retirement.business_exit_value_cents` (int)
  - `retirement.business_exit_year` (int)
- When the user creates a scenario in the retirement planning UI, it creates a `Scenario` record via 068-SPE with these variables set.
- The retirement projection engine is registered as a `ScenarioProjector` — when the scenario engine runs a projection, it calls `RetirementProjectionAction` with the variable overrides.
- Side-by-side comparison is rendered by the scenario engine's comparison UI, with retirement-specific charts (balance trajectory, drawdown curve, shortfall age).

This means retirement planning does NOT build its own scenario CRUD or comparison UI. It adds domain-specific variables and a domain-specific projector to the shared engine.

### Q18. How does retirement planning connect to Goals (037-GLS)?

**Answer**: As described in Q8, creating a retirement profile auto-creates a `Goal` with `GoalType::Retirement`. The connection is:

- The goal's `target_cents` is set to the projected "required retirement fund" — the lump sum needed at retirement age to sustain the desired income until life expectancy.
- The goal's `current_cents` is the user's current total retirement assets (super + investments, as computed by the projection engine).
- The goal's `deadline` is set to the user's target retirement date (date of birth + target retirement age).
- `UpdateGoalProgress::run()` is called whenever the retirement projection is recomputed, updating `current_cents` and recording a `GoalProgressHistory` entry.

The user sees their retirement goal in the goals list alongside other goals (savings, debt reduction, etc.). The retirement detail page links back to the full retirement projection via a "View Full Projection" button.

### Q19. How does retirement planning connect to the Portfolio (049-APF) and Personal Ledger (030-PLG)?

**Answer**: Read-only data consumption:

- **Personal Ledger (030-PLG)**: The projection engine reads `PersonalAsset` and `PersonalDebt` records from the user's personal workspace to compute current net worth and retirement asset base. No writes. The personal ledger nav (`personalNav`) gains a new "Retirement" item between "Net Worth" and "Settings."
- **Portfolio/Asset Feeds (049-APF)**: If the user has `AssetFeedLink` records on their personal assets (e.g., ASX-listed shares with daily price feeds), the projection engine uses the `last_value_cents` from those feed links rather than the static `PersonalAsset.current_value`. This means the retirement projection auto-updates when share prices change.
- **Asset class mapping**: The projection engine maps `PersonalAsset.category` to assumed return rates: `investments` -> risk-tolerance-based rate, `cash_bank` -> cash rate (2%), `property` -> property growth rate (4%), `superannuation` -> uses super-specific rate from the calculator. The `AssetClass` enum from 049-APF provides more granular mapping when feed links exist (e.g., `listed_security` vs `cryptocurrency` get different volatility assumptions in v2 Monte Carlo).

### Q20. Can the practice advisor view a client's retirement projection?

**Answer**: Yes, with explicit permission. The practice advisory view works through the existing access grant system:

- A practice (`Practice` model) connected to a client's workspace group (`WorkspaceGroup`) can view the client user's retirement projection if the client has granted `retirement.view` access.
- The practice user sees a read-only version of the projection with all the same charts and scenarios, plus an "Advisory Notes" section where the practice user can attach notes (using the existing polymorphic notes system from the Notes epic).
- Practice users CANNOT edit the client's retirement profile — only the client can. This reinforces the "information, not advice" boundary.
- The practice dashboard gets a "Retirement Reviews" widget showing which clients have retirement projections, their trajectory status (on track / behind / critical), and when the projection was last updated.
- Practice users access client retirement projections via the existing practice client detail page, not a separate route. A "Retirement" tab appears on the client page alongside "Financials," "Documents," etc.

---

## 6. Multi-Person & Practice

This section is partially covered in Q20 (practice view). Remaining questions:

### Q20a. How does couples planning work?

**Answer**: v1 supports basic couples planning via the `partner_profile_id` field on `RetirementProfile`. When two users link their profiles:

1. User A enters User B's email. User B receives an invitation to link profiles (similar to workspace invitations).
2. Once linked, the projection engine runs TWO individual projections and ONE combined view.
3. The combined view shows: total household retirement assets, combined income needs, and the combined drawdown trajectory.
4. Each person retains their own retirement profile with their own super balance, contributions, and risk tolerance. The "combined" view is a presentation layer, not a merged data model.
5. The combined projection accounts for different retirement ages (e.g., one partner retires at 60, the other at 65 — the income need drops when the second partner is still working).

Linking is symmetric — both users can see the combined view. Unlinking removes the `partner_profile_id` from both profiles.

v1 does NOT model: income splitting strategies, spousal super contributions tax offsets, or joint asset ownership percentages. These are v2 advisory features.

### Q20b. Does the employer/business owner get a view of employee retirement readiness?

**Answer**: Deferred to v2. This is a payroll-adjacent feature that only makes sense after 064-PAY (Payroll & HR) ships. In v2, an employer could see aggregate (anonymised) retirement readiness metrics for their workforce, and model the cost impact of increasing the SG rate above the minimum. v1 focuses on the individual and their advisor.

### Q20c. How does retirement planning surface in the practice dashboard for accountants managing multiple clients?

**Answer**: The practice dashboard gains a "Retirement Overview" section (a new dashboard widget, following the existing `WidgetRenderer` pattern) that shows:

- A table of clients with retirement profiles, sorted by trajectory status (critical first)
- Columns: client name, retirement age target, years to retirement, projected shortfall (or surplus), last reviewed date
- Quick actions: "View Projection," "Add Advisory Note"
- Filter by: trajectory status (on_track / behind / critical), years to retirement range

This is a lightweight read-only widget. The accountant clicks through to the client's full projection page (Q20 above) for detailed advisory work. The widget follows the same `ChartCard` / `ListCard` pattern used by existing dashboard widgets.

---

*End of clarification Q&A. These decisions form the basis for the PRD (spec.md) and implementation plan.*
