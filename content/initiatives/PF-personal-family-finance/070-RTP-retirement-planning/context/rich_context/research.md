---
title: "070-RTP Retirement Planning — Research Document"
description: "Competitive analysis, AU super rules, modelling patterns, UX patterns, and regulatory considerations for the Retirement Planning epic"
created: 2026-03-22
topic: "Retirement Planning"
sources_searched:
  web:
    - moneysmart.gov.au (retirement planner, super calculator)
    - ato.gov.au (contribution caps, SG rates, TTR rules)
    - servicesaustralia.gov.au (Age Pension means testing)
    - asic.gov.au (RG 244, AFSL requirements)
    - superannuation.asn.au (ASFA Retirement Standard)
    - abs.gov.au (life expectancy tables)
    - projectionlab.com
    - boldin.com (formerly NewRetirement)
    - stockspot.com.au
    - finder.com.au (robo-advisor comparison)
    - superguide.com.au
    - kitces.com (Monte Carlo methodology)
    - bogleheads.org (tool comparisons)
  codebase:
    - frontend/src/stores/forecast-scenario.ts
    - frontend/src/app/w/[slug]/(dashboard)/net-worth/page.tsx
    - frontend/src/components/forecast/
    - app/Enums/AccountSubType.php
---

# 070-RTP Retirement Planning — Research Document

## Executive Summary

Retirement planning in software falls into three distinct tiers: (1) simple government calculators like MoneySmart that accept a few inputs and produce a single projected balance, (2) mid-tier tools embedded in super fund and robo-advisor apps that add goal tracking and basic projections, and (3) sophisticated standalone planners like Boldin and ProjectionLab that offer Monte Carlo simulation, multi-scenario comparison, tax optimisation, and couples planning. No Australian accounting platform (Xero, MYOB, QuickBooks) offers retirement planning — they stop at superannuation payroll compliance. This represents a clear whitespace opportunity for MoneyQuest.

The regulatory landscape is navigable but requires careful design. Under ASIC RG 244, calculators providing "factual information" (projections based on user-supplied inputs with stated assumptions) do not require an AFSL. The moment a tool considers a user's personal objectives and makes recommendations, it crosses into "personal advice" territory requiring licensing. The design principle is clear: MoneyQuest should show projections and scenarios, never recommend specific products or strategies. Every output needs a general advice warning.

Australian superannuation rules for 2025-26 are well-documented and relatively stable: $30,000 concessional cap, $120,000 non-concessional cap, 12% SG rate (now permanent), preservation age 60, $2M transfer balance cap. These can be encoded as configuration (not hardcoded) to accommodate the annual indexation cycle. The ASFA Retirement Standard provides useful benchmarks: $76,505/year for a comfortable couple, $54,240 for a comfortable single.

---

## 1. Competitive Analysis

### 1.1 AU SMSF Administration Platforms

| Platform | Market Share | Retirement Modelling? | Notes |
|----------|-------------|----------------------|-------|
| **Class Super** | ~50.5% of advice firms | No native retirement modelling | Focus: SMSF compliance, document generation, real-time data feeds. Best API openness. Strongest UI. |
| **BGL Simple Fund 360** | ~25.8% | No native retirement modelling | Focus: SMSF admin, tax, compliance documents. Partnership with Smarter SMSF for pension documents. |
| **SuperConcepts** | ~20.6% | Strategy guidance only | Provides educational content on SMSF strategies (contribution timing, TTR) but no projection tools. |

**Key insight**: SMSF platforms are compliance-focused — they calculate tax, generate documents, and manage regulatory reporting. None model retirement outcomes or provide projection tools. They assume the financial adviser handles retirement modelling externally (usually via Xplan, AdviceOS, or spreadsheets).

### 1.2 Australian Government Tools

#### MoneySmart (ASIC) — moneysmart.gov.au

Three separate calculators, not one integrated tool:

| Calculator | Inputs | Output |
|------------|--------|--------|
| **Superannuation Calculator** | Age (18-75), income, employer contribution rate (10.5-25%), salary sacrifice, voluntary contributions, investment return, fees, insurance | Projected super balance at retirement age |
| **Account-Based Pension Calculator** | Starting balance, desired income, investment return | How long savings will last |
| **Retirement Planner** | Combines the above + Age Pension eligibility | Estimated retirement income from all sources |

**Variables exposed**: Age, income, employer contribution rate, salary sacrifice amount, voluntary after-tax contributions, investment return assumption, admin fees, insurance premiums, retirement age, desired retirement income.

**Default assumptions** (updated quarterly): Based on APRA statistics (March 2025 for fees, December 2024 for insurance) and Willis Towers Watson Global Asset Model (August 2025). Admin fees default $59/year + 0.08% of balance. Insurance default $521/year. 15% tax on concessional contributions. Results shown in "today's dollars" (inflation-adjusted).

**Disclaimer pattern**: "This is a model based on a set of assumptions. It is not a prediction. Do not rely on these estimates to make financial decisions. Consider your own investment objectives, financial situation and needs. You may wish to get advice from a licensed financial adviser."

### 1.3 International Personal Finance Planners

#### Boldin (formerly NewRetirement) — boldin.com

**Tier**: Premium standalone planner. $12/month (PlannerPlus) after 14-day trial. Free tier available.

**Key features**:
- 250+ manual input fields covering income, expenses, assets, liabilities, Social Security, pensions, rental income, business income
- Monte Carlo simulation with probability-of-success score
- Roth conversion optimiser (minimise lifetime taxes)
- Multiple scenarios branching from a single base case — "what if" views without re-entering data
- Tax-aware withdrawal sequencing
- Couples planning with different retirement ages
- Estate planning integration
- Dashboard with trajectory charts, income waterfall, tax projections

**UX approach**: Wizard-style onboarding that progressively builds the financial picture. Dashboard shows a "retirement score" (percentage chance of success). Scenarios appear as tabs users can switch between.

**Strength**: Depth of inputs — users can model almost any financial variable. Weakness: complexity can overwhelm casual users.

#### ProjectionLab — projectionlab.com

**Tier**: Modern indie planner. Free tier includes Monte Carlo. Paid tiers for advanced features.

**Key features**:
- "Build a living model of your whole life's finances"
- Monte Carlo simulation with fan charts showing 5th/50th/95th percentile outcomes
- Historical backtesting against actual market data
- Sankey diagrams for cash flow visualisation
- Custom plots — users create their own analyses
- International support including Australian presets
- FIRE (Financial Independence, Retire Early) calculations
- Part-time work phases, career transitions, travel periods
- Roth conversions, rental income, real estate decisions
- No connection to real financial accounts (privacy-first)

**UX approach**: Described as "the most beautiful financial planning tool" — modern, slick, fast. Data entry via manual input or CSV import. Emphasises visual exploration over form-filling.

**Strength**: Best-in-class visualisations and modern UX. Weakness: no account linking means manual data entry.

#### cFIREsim

**Tier**: Free, open-source-style. FIRE community favourite.

**Key features**:
- Historical backtesting using actual US market returns (every possible retirement start date)
- Success rate across all historical periods
- Variable spending rules (Guyton-Klinger, VPW)
- Simple inputs: portfolio value, annual spending, retirement length
- No Monte Carlo — uses actual historical sequences instead

**UX approach**: Minimalist. Aimed at FIRE enthusiasts who understand sequence-of-returns risk. Output is a single success percentage and a spaghetti chart of all historical paths.

**Strength**: Uses real historical data, not simulated. Weakness: US-only data, no Australian market support.

#### Fidelity Retirement Planner

**Key features**:
- "Planning & Guidance Center" combining retirement income planner, quick check, and portfolio review
- Retirement Score (0-150 scale) assessing savings adequacy
- Monthly retirement income estimate
- Tax-aware withdrawal strategy modelling (taxable vs tax-free accounts)
- Roth conversion impact analysis
- Healthcare expense estimation (US-specific)

**UX approach**: Integrated into brokerage platform — pulls real account data automatically. Score-based feedback ("you're on track" vs "you need to save more"). Guided workflows for common decisions.

### 1.4 Accounting Platforms

| Platform | Retirement Planning? | What They Offer Instead |
|----------|---------------------|------------------------|
| **Xero** | No | STP-compliant payroll with superannuation automation. No projection, no modelling. |
| **MYOB** | No | Deep payroll with auto super calculations, BAS, STP. Strongest AU payroll. No projection. |
| **QuickBooks** | No | Basic payroll. Less AU super specialisation than Xero/MYOB. No projection. |

**Key insight**: Accounting platforms treat superannuation as a payroll compliance obligation, not a planning opportunity. None connect the data they already hold (income, super contributions, business value) to retirement outcomes. This is the exact gap MoneyQuest can fill.

### 1.5 Australian Robo-Advisors

| Platform | Retirement Features | Pricing |
|----------|-------------------|---------|
| **Stockspot** | "Stockspot Super" (ETF-only super fund), "Stockspot Pension" (waitlist). Investment calculator. No retirement projections. | $1/month (<$20k) or 0.396-0.66% p.a. |
| **Raiz** | Spare-change investing into 6 risk-profiled portfolios. Raiz Super product. No retirement modelling. | $5.50/month (<$20k) or 0.275% p.a. |
| **Spaceship** | 5 diversified portfolios. Spaceship Super. No retirement projections. | $3/month (>$100 balance) + 0.15-0.50% p.a. |

**Key insight**: AU robo-advisors focus on investment management and product distribution (super funds, ETF portfolios). None offer retirement projections, scenario modelling, or drawdown analysis. They assume users will use external tools (or their adviser) for retirement planning.

### 1.6 Competitive Summary

```
                        Simple              Mid-Tier               Sophisticated
                     (calculators)       (fund/robo tools)        (standalone planners)
                    ┌─────────────┐    ┌──────────────────┐    ┌────────────────────┐
AU Government:      │ MoneySmart  │    │                  │    │                    │
                    └─────────────┘    │                  │    │                    │
Super Funds:        │ AustralianSuper│  │ Cbus, ART, QSuper│   │                    │
                    │ basic calc   │    │ enhanced calcs   │    │                    │
                    └─────────────┘    └──────────────────┘    │                    │
International:      │              │    │                  │    │ Boldin, ProjectionLab│
                    │              │    │                  │    │ Fidelity, cFIREsim │
                    └─────────────┘    └──────────────────┘    └────────────────────┘
Accounting:         │              │    │                  │    │                    │
                    │  NONE        │    │  NONE            │    │  NONE              │
                    └──────────────┘    └──────────────────┘    └────────────────────┘

MoneyQuest target:  ─────────────────────────────────────────── ▶ Mid-to-Sophisticated
                    Connected to REAL accounting data = unique differentiator
```

---

## 2. Australian Superannuation Rules (2025-26)

### 2.1 Contribution Caps

| Type | 2025-26 Cap | Tax Treatment | Notes |
|------|-------------|---------------|-------|
| **Concessional (before-tax)** | $30,000/year | 15% contributions tax in fund | Includes SG, salary sacrifice, personal deductible |
| **Non-concessional (after-tax)** | $120,000/year | No additional tax (already taxed income) | Nil if TSB >= $2M at prior 30 June |
| **Carry-forward (concessional)** | Up to 5 years unused cap | Same 15% rate | Eligible if TSB < $500,000 at prior 30 June |
| **Bring-forward (non-concessional)** | Up to $360,000 over 3 years | No additional tax | TSB < $1.76M: $360k / TSB $1.76-1.88M: $240k / TSB >= $1.88M: $120k |

**Division 293 tax**: Additional 15% on concessional contributions for individuals earning > $250,000 (total = 30% tax on super contributions).

### 2.2 Superannuation Guarantee (SG)

| Period | Rate | Notes |
|--------|------|-------|
| 2025-26 | 12% | Permanent rate — no further legislated increases |
| 2026-27+ | 12% | Unchanged unless Parliament legislates |

**Maximum super contributions base**: $62,500/quarter ($250,000/year) for 2025-26. Employers not required to pay SG on earnings above this.

**Payday super** (from 1 July 2026): Employers must pay super at the same time as wages (currently quarterly).

### 2.3 Preservation Age

| Date of Birth | Preservation Age |
|---------------|-----------------|
| Before 1 July 1960 | 55 |
| 1 July 1960 - 30 June 1961 | 56 |
| 1 July 1961 - 30 June 1962 | 57 |
| 1 July 1962 - 30 June 1963 | 58 |
| 1 July 1963 - 30 June 1964 | 59 |
| After 30 June 1964 | 60 |

**Conditions of release**: Retirement after preservation age, reaching age 65 (regardless of work status), permanent incapacity, terminal illness, severe financial hardship (limited), compassionate grounds.

### 2.4 Tax on Withdrawals

| Component | Age 60+ | Below Age 60 (above preservation) |
|-----------|---------|-----------------------------------|
| **Tax-free component** | Tax-free | Tax-free |
| **Taxable component** | Tax-free | First $235,000 taxed at 0%, remainder at marginal rate - 15% offset |

**Key rule**: For most retirees (age 60+), super withdrawals are entirely tax-free. This is a critical modelling simplification for v1.

### 2.5 Government Co-Contribution

| Income Range | Co-Contribution | Maximum |
|-------------|----------------|---------|
| Total income < $45,400 | $0.50 per $1 of personal non-concessional contribution | $500 |
| $45,400 - $60,400 | Reduces progressively | $0 at $60,400 |

Eligibility: Must lodge a tax return, have >= 10% income from employment, be under age 71, TSB < transfer balance cap.

### 2.6 Spouse Contribution Tax Offset

| Spouse's Assessable Income | Tax Offset |
|--------------------------|------------|
| < $37,000 | Up to $540 (18% of first $3,000 contributed) |
| $37,000 - $40,000 | Reduces progressively |
| >= $40,000 | $0 |

### 2.7 Transfer Balance Cap

| Period | General TBC |
|--------|------------|
| 2025-26 | $2,000,000 |

This caps the total amount that can be transferred into tax-free retirement phase (0% earnings tax). Amounts above the cap must remain in accumulation (15% earnings tax) or be withdrawn.

### 2.8 Age Pension (Means Testing)

#### Income Test (20 March 2026 - 19 September 2026)

| Status | Full Pension Threshold | Taper Rate | Cut-Off |
|--------|----------------------|------------|---------|
| Single | $218/fortnight | $0.50 per $1 over threshold | ~$2,401/fn |
| Couple (combined) | $380/fortnight | $0.50 per $1 over threshold | ~$3,621/fn |

#### Assets Test (20 March 2026 - 19 September 2026)

| Status | Full Pension Threshold | Taper Rate | Part Pension Cut-Off |
|--------|----------------------|------------|---------------------|
| Single homeowner | $321,500 | $3/fn per $1,000 over | $722,000 |
| Single non-homeowner | $579,500 | $3/fn per $1,000 over | $980,500 |
| Couple homeowner | $481,500 | $3/fn per $1,000 over | $1,085,000 |
| Couple non-homeowner | $739,500 | $3/fn per $1,000 over | $1,343,000 |

**Deeming rules**: Financial assets are deemed to earn a set rate regardless of actual returns. Deeming rates are set by the government and change periodically.

**Full Age Pension rate** (March 2026): $1,200.90/fortnight (single), $1,810.40/fortnight (couple combined). Includes pension supplement and energy supplement.

**Age Pension age**: 67 for anyone born after 1 January 1957.

### 2.9 ASFA Retirement Standard (September 2025 Quarter)

| Lifestyle | Single (homeowner) | Couple (homeowner) |
|-----------|-------------------|-------------------|
| **Comfortable** | $54,240/year | $76,505/year |
| **Modest** | $35,199/year | $50,866/year |

Assumptions: Age 65+, own home outright, live to ~85. Comfortable includes: private health insurance, reasonable car, regular leisure, annual domestic trip, overseas trip every 7 years.

**Lump sum targets** (at age 67):
- Comfortable single: ~$595,000
- Comfortable couple: ~$690,000

### 2.10 Transition to Retirement (TTR)

| Rule | Detail |
|------|--------|
| **Eligibility** | Reached preservation age (60 for most), still working |
| **Withdrawal range** | Minimum 4% p.a., maximum 10% p.a. of account balance |
| **Earnings tax** | Up to 15% (NOT tax-free like retirement phase) |
| **Payment tax** | Tax-free if aged 60+ |
| **Transfer balance cap** | TTR does NOT count toward transfer balance cap |
| **Conversion** | Automatically converts to retirement phase pension on full condition of release |

**Common TTR strategy**: Salary sacrifice additional super (taxed at 15% instead of marginal rate), draw TTR pension to replace lost take-home pay. Net effect: more money into super at lower tax rate.

### 2.11 Life Expectancy (ABS 2022-2024)

| Metric | Male | Female |
|--------|------|--------|
| **At birth** | 81.1 years | 85.1 years |
| **At age 65** | ~85.3 years | ~87.8 years |

Source: Australian Bureau of Statistics. The Australian Government Actuary publishes detailed life tables with age-specific mortality rates used by super funds and insurers.

**Annual mortality probability by age**: 0.25% at birth, 0.04% at age 30, 0.43% at age 60, 3.22% at age 80.

---

## 3. Retirement Modelling Patterns

### 3.1 Drawdown Strategies

| Strategy | How It Works | Pros | Cons | Best For |
|----------|-------------|------|------|----------|
| **Constant Dollar** | Withdraw fixed $X/year (inflation-adjusted) | Predictable income, simple | Ignores market conditions; risk of ruin in bad markets | Conservative retirees wanting certainty |
| **Constant Percentage** | Withdraw X% of current balance annually | Self-adjusting to market; can't run out | Income volatility year-to-year | Flexible retirees comfortable with variable income |
| **4% Rule** (Bengen) | 4% of initial balance, then inflation-adjust | Simple benchmark, historically 95%+ success over 30 years | Based on US data; may not hold for 40+ year retirements or non-US markets | Starting-point rule of thumb |
| **Bucket Strategy** | Split portfolio into 3 buckets: short-term (1-3 years cash), medium (3-10 years bonds), long-term (10+ years equities) | Psychological comfort; avoids selling equities in downturns | Complexity of rebalancing; doesn't mathematically outperform total-return | Retirees anxious about market volatility |
| **Dynamic Spending** (Guyton-Klinger) | Adjust withdrawals based on portfolio performance — guardrails with floor and ceiling | Best balance of income stability and portfolio longevity | More complex to implement and communicate | Sophisticated users willing to adjust spending |
| **Variable Percentage Withdrawal (VPW)** | Withdrawal rate increases with age based on remaining life expectancy | Mathematically optimal for spending; rarely runs out | Income can drop significantly in bad years | FIRE community users, long retirements |

**Recommendation for MoneyQuest v1**: Implement constant dollar as default (simplest to understand), with percentage-based and dynamic spending as advanced options. Show the impact of each strategy on portfolio longevity in side-by-side scenarios.

### 3.2 Longevity Risk Modelling

**Life expectancy tables**: Use Australian Government Actuary life tables (age-specific mortality rates). Key insight: life expectancy at age 65 is ~85 (male) / ~88 (female), but there is a ~25% chance a 65-year-old male lives to 92 and a 65-year-old female lives to 94.

**Probability of ruin**: The chance that portfolio is exhausted before death. Calculated across all simulated scenarios. A 5% probability of ruin means 95% of scenarios had money remaining at death.

**Approaches**:
1. **Fixed horizon**: Plan to age 90 or 95 (simple but arbitrary)
2. **Mortality-weighted**: Weight simulation outcomes by probability of being alive at each age (more accurate)
3. **Joint life expectancy**: For couples, plan to the expected death of the last survivor (longer horizon)

### 3.3 Inflation Adjustment

| Method | Description | Use Case |
|--------|-------------|----------|
| **Constant real return** | Subtract assumed inflation from nominal return; show results in "today's dollars" | MoneySmart approach — simplest for users to understand |
| **Separate nominal + CPI** | Model nominal returns and inflation independently; apply CPI to expenses | More accurate; captures purchasing power risk |
| **Variable inflation** | Use historical inflation distribution in Monte Carlo | Most accurate but adds complexity |

**Recommendation**: Show results in "today's dollars" (MoneySmart convention) for v1. Store nominal values internally for accuracy but present inflation-adjusted outputs. Use a configurable CPI assumption (default: 2.5% — RBA target midpoint).

### 3.4 Sequence-of-Returns Risk

The order of investment returns matters enormously in retirement. A 20% drop in year 1 of retirement (when withdrawing from a declining portfolio) is far more damaging than a 20% drop in year 20.

**Modelling approaches**:
1. **Monte Carlo simulation**: Randomly sample annual returns from a distribution. Run 1,000-10,000 simulations. Report percentile outcomes (5th/25th/50th/75th/95th).
2. **Historical backtesting**: Test the plan against every actual historical period (e.g., retiring in 1929, 1973, 2000, 2008). Shows worst-case real-world scenarios.
3. **Block bootstrap**: Sample multi-year blocks of historical returns to preserve autocorrelation. More statistically robust than simple random sampling.

**Recommendation for MoneyQuest**: Monte Carlo for v1 (via the Scenario Planning Engine 068-SPE). Historical backtesting as a v2 enhancement when Australian market data is integrated. Display results as fan charts (5th/25th/50th/75th/95th percentile bands).

### 3.5 Couples Planning

| Challenge | Modelling Requirement |
|-----------|----------------------|
| Different ages | Independent retirement dates; younger partner may still be working |
| Different super balances | Separate accumulation and drawdown tracks |
| Different preservation ages | Affects when each person can access super |
| Survivor scenarios | Model death of either partner; impact on Age Pension (single vs couple rates), income, expenses |
| Combined Age Pension | Means testing uses combined income and assets for couples |
| Expense changes on death | Expenses typically drop ~30% on death of a partner (not 50%) |
| Optimising contributions | May benefit from equalising super balances for tax and pension efficiency |

**Key statistic**: On average, wives survive husbands by 7+ years (2.3 years older + 5 years longer life expectancy). Couples planning must model the survivor period.

---

## 4. UX Patterns for Retirement Projections

### 4.1 Timeline Visualisation

The canonical retirement visualisation is a **dual-phase timeline chart**:

```
Balance ($)
    │
    │         ╱╲  Peak at retirement
    │        ╱  ╲
    │       ╱    ╲
    │      ╱      ╲
    │     ╱        ╲
    │    ╱    Accumulation    ╲  Drawdown
    │   ╱     Phase           ╲  Phase
    │  ╱                       ╲
    │ ╱                         ╲
    │╱                           ╲────── Age Pension kicks in
    ├──────────┬─────────────────┬──────
    30        60               85-95
              Retirement Age    End of plan
```

**Best practice** (from ProjectionLab and Boldin):
- X-axis = age (not years from now) — more intuitive
- Y-axis = portfolio balance in today's dollars
- Vertical line marking retirement age
- Shaded region showing Age Pension contribution
- Hover for detailed year-by-year breakdown
- Income sources stacked (super drawdown + Age Pension + other income)

### 4.2 "What If" Sliders

Interactive controls that instantly update the projection. Key variables users should be able to adjust:

| Slider | Range | Default | Impact |
|--------|-------|---------|--------|
| Retirement age | 55-75 | 67 | Shifts the accumulation/drawdown transition point |
| Annual contribution (extra) | $0-$30,000 | $0 | Increases accumulation slope |
| Desired retirement income | $30k-$150k | ASFA Comfortable | Sets the drawdown rate |
| Investment return assumption | 3-10% | 7% nominal / 4.5% real | Steepens/flattens the trajectory |
| Inflation assumption | 1-5% | 2.5% | Affects real purchasing power |
| Life expectancy | 80-100 | ABS life table | Extends/shortens drawdown period |

**UX pattern**: Sliders on a sidebar panel with the chart updating in real-time. Show the "before" trajectory as a ghost line when adjusting.

### 4.3 Probability Fan Charts

Monte Carlo results displayed as shaded bands showing the range of possible outcomes:

```
Balance ($)
    │
    │    ░░░░░░░  95th percentile (best case)
    │   ░░▒▒▒░░░
    │  ░░▒▒▓▓▒▒░░  75th percentile
    │ ░░▒▒▓▓██▓▓▒▒░░
    │░░▒▒▓▓████▓▓▒▒░░  50th (median)
    │ ░░▒▒▓▓██▓▓▒▒░░
    │  ░░▒▒▓▓▒▒░░  25th percentile
    │   ░░▒▒▒░░░
    │    ░░░░░░░  5th percentile (worst case)
    ├──────────────────────
```

**Best practice**:
- 5 bands: 5th, 25th, 50th, 75th, 95th percentile
- Darker shading for more likely outcomes (median is darkest)
- Show "probability of success" as a prominent percentage (e.g., "87% chance your savings last to age 92")
- Allow users to overlay specific historical scenarios (e.g., "what if you retired in 2008?")

### 4.4 Gap Analysis Visualisation

Show the distance between current trajectory and retirement goal:

```
                  ┌── Goal: $80k/year income
                  │
    $80k ─────────┤ ═══════════════
                  │       GAP
    $58k ─────────┤ ───────────────  ← Current trajectory
                  │
                  └── Today          Retirement
```

**Implementation patterns observed**:
- **Traffic light indicator**: Green (on track, >90% success), Amber (at risk, 60-90%), Red (off track, <60%)
- **Dollar gap**: "You need an additional $340/month in contributions to close the gap"
- **Time gap**: "At current trajectory, you'll reach your goal 3 years later than planned"
- **Interactive**: Click the gap to see specific actions that would close it (increase contributions, delay retirement, reduce target income)

### 4.5 Income Waterfall (Post-Retirement)

Show where retirement income comes from each year:

```
$80k ┤ ████████████████████████████
     │ ████████████████████████████
     │ ▓▓▓▓▓▓▓▓▓▓▓▓████████████
     │ ▓▓▓▓▓▓▓▓▓▓▓▓████████████
     │ ░░░░░░░░▓▓▓▓████████████
     │         ▓▓▓▓████████████
     ├─────┬─────┬─────┬──────
     65    70    75    80   Age

     ██ Super drawdown
     ▓▓ Age Pension
     ░░ Other income (rental, investments)
```

### 4.6 Retirement Score / Readiness Index

Several platforms use a single score to communicate readiness:
- **Fidelity**: 0-150 scale (80+ = "on track")
- **Boldin**: Percentage probability of success from Monte Carlo
- **Super funds**: Simple "on track" / "not on track" binary

**Recommendation**: Use probability of success (%) as the primary metric — it is honest, intuitive, and backed by Monte Carlo. Supplement with a qualitative label: "Strong" (>85%), "On Track" (70-85%), "At Risk" (50-70%), "Action Needed" (<50%).

---

## 5. Regulatory Considerations

### 5.1 AFSL Requirements — The Advice Boundary

Under the Corporations Act 2001 and ASIC Regulatory Guide 244 (RG 244), financial communications fall into three categories:

| Category | Definition | AFSL Required? | Example |
|----------|-----------|---------------|---------|
| **Factual information** | Objectively ascertainable information whose truth cannot be questioned | No | "The concessional contribution cap is $30,000" |
| **General advice** | A recommendation or opinion about financial products that does NOT consider the person's individual objectives, financial situation, or needs | Yes (but lighter obligations) | "Salary sacrifice can reduce your tax" |
| **Personal advice** | A recommendation that DOES consider (or a reasonable person would expect to consider) the person's individual circumstances | Yes (full obligations: SOA, best interests duty) | "You should salary sacrifice $15,000 based on your income" |

### 5.2 Where Calculators Fit

**Calculators that accept user inputs and produce projections based on stated assumptions are generally "factual information"** — they perform a mathematical calculation, not a qualitative judgment. This is why MoneySmart, super fund calculators, and tools like industry super's retirement calculator operate without providing personal advice.

**Critical requirements to stay in "factual information" territory**:
1. User supplies all inputs (tool doesn't infer or suggest values based on their situation)
2. Assumptions are clearly stated and user-adjustable
3. Output is a projection/estimate, not a recommendation
4. No language suggesting "you should" do anything
5. General advice warning displayed prominently

**Risk areas that push toward "personal advice"**:
- Using data the platform already holds about the user to pre-fill inputs (creates expectation of personalised consideration)
- AI-generated suggestions like "increase your contributions by $500/month" (qualitative judgment about the user's situation)
- Comparing the user's situation to benchmarks and suggesting specific actions

### 5.3 The High Court Precedent

In *Westpac Securities v ASIC*, the High Court ruled that **disclaimers cannot override the reasonable person test**. If a tool elicits personal information and then provides targeted suggestions, a general advice disclaimer offers no protection. The substance of the interaction determines whether personal advice was given, not the disclaimer.

### 5.4 How Other Platforms Handle the Boundary

| Platform | Approach |
|----------|----------|
| **MoneySmart** | Pure calculator — user enters all inputs, sees projections. "Do not rely on these estimates to make financial decisions." |
| **Super funds** (AustralianSuper, Cbus, ART) | "This calculator is for educational purposes." Pre-fill with member data but state projections are estimates only. |
| **Boldin** | "PlannerPlus is not a replacement for a financial advisor." Users enter all data manually. |
| **Stockspot** | Holds AFSL — licensed to provide general advice. Investment recommendations are general advice with disclaimer. |

### 5.5 Recommended Approach for MoneyQuest

**Tier 1 — Safe (No AFSL needed)**:
- Projection calculator using user-supplied inputs
- Scenario comparison showing outcomes of different assumptions
- Benchmarks (ASFA Retirement Standard) as reference points, not targets
- Fan charts showing range of possible outcomes
- General advice warning on every output page

**Tier 2 — Careful (General advice, needs review)**:
- Pre-filling inputs from ledger data (current income, super balance from accounts)
- AI insights that describe trends: "Your super balance has grown 8% p.a. over the past 3 years"
- Automated alerts: "Based on your projection, your savings may be exhausted by age 82"

**Tier 3 — Avoid (Personal advice, needs AFSL)**:
- "You should increase your contributions by $X"
- "Based on your situation, a TTR strategy would save you $X in tax"
- Product recommendations: "Consider switching to a growth fund"

### 5.6 Recommended Disclaimer Wording

Based on analysis of MoneySmart, super fund, and industry calculator disclaimers:

```
IMPORTANT: This retirement projection is a model based on assumptions.
It is not a prediction of your future financial position and should not
be relied upon to make financial decisions.

This tool provides general information only. It does not take into
account your personal objectives, financial situation, or needs.
Before making any financial decisions, consider whether the information
is appropriate for your circumstances and seek advice from a licensed
financial adviser.

[Product name] is not a financial adviser and does not hold an
Australian Financial Services Licence. The projections shown are
estimates only and actual outcomes may differ materially.
```

---

## 6. Existing Codebase Context

### 6.1 Related Features Already Built

| Feature | Epic | Relevance to Retirement Planning |
|---------|------|--------------------------------|
| **Cash Flow Forecasting** (041-CFF) | Complete | Scenario store pattern (`forecast-scenario.ts`), chart components, 13-week projection engine |
| **Goal Setting** (037-GLS) | Complete | Goal CRUD, progress tracking, alerts — retirement goals would extend this |
| **Personal Ledger** (030-PLG) | Complete | Net worth tracking with superannuation as a category; asset/liability register |
| **Fixed Asset Register** (033-FAR) | Complete | Depreciation modelling — pattern for time-based value changes |
| **Asset Price Feeds** (049-APF) | Complete | 5 price providers (Redbook, RP Data, ASX, CoinGecko, Fake); revaluation engine |
| **Entity Health Score** (051-EHS) | Complete | Scoring model pattern — could inform "retirement readiness score" |

### 6.2 Reusable Patterns

**Scenario store** (`frontend/src/stores/forecast-scenario.ts`): Zustand store with add/remove/clear/toggle scenario items. Can be extended or replicated for retirement scenarios.

**Net worth page** (`frontend/src/app/w/[slug]/(dashboard)/net-worth/page.tsx`): Already categorises assets including "superannuation" as a distinct category with a `PiggyBank` icon. Uses `useMyNetWorthDetail()` hook.

**Forecast chart components** (`frontend/src/components/forecast/`): Scenario panel, drill-down panel, threshold dialog, chart component — all reusable patterns for retirement projection UI.

### 6.3 Dependencies Not Yet Built

| Epic | Status | Dependency Type |
|------|--------|----------------|
| **068-SPE Scenario Planning Engine** | Not started | Hard dependency — retirement projections are scenarios |
| **069-RMI Risk Management** | Not started | Soft dependency — risk profile informs return assumptions |

---

## 7. Synthesis

### 7.1 Consolidated Requirements for v1

| # | Requirement | Source | Confidence |
|---|------------|--------|------------|
| 1 | **Retirement profile setup** — target age, desired income, life expectancy, risk tolerance | Idea brief + MoneySmart pattern | High (3 sources) |
| 2 | **Superannuation modelling** — current balance, employer SG (12%), salary sacrifice, voluntary contributions, carry-forward | AU super rules + MoneySmart + Boldin | High (3 sources) |
| 3 | **Contribution cap tracking** — $30k concessional, $120k non-concessional, carry-forward eligibility | ATO rules | High (authoritative) |
| 4 | **Projection engine** — compound growth with configurable return/inflation assumptions, shown in today's dollars | All competitor tools | High (universal pattern) |
| 5 | **Monte Carlo simulation** — 1,000+ scenarios, fan chart output with probability of success | Boldin + ProjectionLab + Kitces methodology | High (industry standard) |
| 6 | **Drawdown modelling** — constant dollar (default) + percentage-based + dynamic spending | Drawdown strategy research | High (well-documented patterns) |
| 7 | **Age Pension integration** — means testing (income + assets tests), partial pension calculation | Services Australia + Super Guide | High (authoritative) |
| 8 | **Scenario comparison** — side-by-side "what if" with different retirement ages, contribution levels, return assumptions | Boldin + ProjectionLab + idea brief | High (3 sources) |
| 9 | **Timeline chart** — accumulation to drawdown with fan chart probability bands | ProjectionLab + Boldin UX patterns | High (industry standard) |
| 10 | **Gap analysis** — current trajectory vs goal with dollar/time gap quantification | RetireReady + OnTrajectory patterns | Medium (2 sources) |
| 11 | **Retirement readiness score** — probability-based (% chance of success), not arbitrary scale | Fidelity + Boldin pattern | Medium (2 sources) |
| 12 | **General advice disclaimer** — prominently displayed, following MoneySmart/super fund patterns | ASIC RG 244 + competitor analysis | High (regulatory requirement) |
| 13 | **Couples planning** — different ages, different balances, survivor scenarios | Boldin + couples planning research | Medium (v1 or v2 decision needed) |
| 14 | **TTR modelling** — transition to retirement strategy with 4-10% drawdown range and tax implications | ATO TTR rules | Medium (may be v2) |
| 15 | **ASFA benchmarks** — comfortable/modest retirement standards as reference points | ASFA Retirement Standard | High (well-known AU benchmark) |

### 7.2 Key Design Decisions Needed

1. **Pre-fill from ledger data?** — Using the user's actual income and super balance from their MoneyQuest accounts is the unique differentiator. But pre-filling pushes closer to "personal advice" territory. Decision: pre-fill as defaults but let users override, with clear disclaimer that projections are estimates.

2. **AI advisor tone** — The idea brief mentions "AI retirement advisor" suggesting contribution changes. This is risky under ASIC rules. Decision: AI should describe trends and show scenarios ("if you increased contributions by $500/month, your projection shows...") rather than recommend ("you should increase...").

3. **Couples in v1 or v2?** — Couples planning adds significant complexity (different ages, survivor modelling, combined means testing). Boldin and ProjectionLab both support it. Decision needed based on sprint capacity.

4. **Australian market data for backtesting** — cFIREsim uses US data. Australian equities have different return characteristics. For v1, Monte Carlo with configurable assumptions is safer than historical backtesting requiring AU-specific data.

5. **Scenario Planning Engine dependency** — The idea brief states 068-SPE must ship first. If SPE is delayed, should RTP build its own lightweight projection engine or wait?

### 7.3 Open Questions

1. [ ] Will MoneyQuest seek an AFSL in future? This affects how far the AI advisor can go.
2. [ ] Should the TTR modelling include the salary sacrifice + TTR pension optimisation strategy, or just basic TTR drawdown rules?
3. [ ] How granular should Age Pension modelling be? Full means testing with deeming, or simplified estimation?
4. [ ] Should we integrate with any super fund data APIs (e.g., Consumer Data Right for super), or is manual entry sufficient for v1?
5. [ ] What Australian market return assumptions should we default to? The MoneySmart calculator uses Willis Towers Watson projections. Should we use a simpler assumption like "Australian equities: 7% nominal, bonds: 4% nominal"?
6. [ ] Should retirement planning be available to all workspace types, or only Personal Ledger users?

### 7.4 Recommended Next Steps

1. **Decide on v1 scope** — core projection + scenarios + fan chart, or include couples + TTR + Age Pension?
2. **Clarify 068-SPE dependency** — can RTP start with a lightweight projection engine while SPE is built?
3. **Design the regulatory disclaimer framework** — create a shared component for general advice warnings
4. **Prototype the timeline chart** — fan chart with accumulation/drawdown phases using existing forecast chart components as a starting point
5. **Define the super rules configuration** — contribution caps, SG rate, preservation age, tax rates as a config file that updates annually
6. **Proceed to PRD** (spec.md) with these research findings as input

---

## Sources

### Government & Regulatory
- [ATO — Contribution Caps](https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/contributions-caps)
- [ATO — Non-Concessional Contributions Cap](https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/caps-limits-and-tax-on-super-contributions/non-concessional-contributions-cap)
- [ATO — Super Guarantee](https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee)
- [ATO — Transition to Retirement](https://www.ato.gov.au/individuals-and-families/jobs-and-employment-types/working-as-an-employee/leaving-the-workforce/transition-to-retirement)
- [Services Australia — Assets Test for Age Pension](https://www.servicesaustralia.gov.au/assets-test-for-age-pension?context=22526)
- [Services Australia — Income Test for Age Pension](https://www.servicesaustralia.gov.au/income-test-for-age-pension?context=22526)
- [ASIC — Giving Financial Product Advice](https://www.asic.gov.au/regulatory-resources/financial-services/giving-financial-product-advice/)
- [ASIC — RG 244 Giving Information, General Advice and Scaled Advice](https://www.asic.gov.au/regulatory-resources/find-a-document/regulatory-guides/rg-244-giving-information-general-advice-and-scaled-advice/)
- [MoneySmart — Retirement Planner](https://moneysmart.gov.au/plan-for-your-retirement/retirement-planner)
- [MoneySmart — Superannuation Calculator](https://moneysmart.gov.au/how-super-works/superannuation-calculator)
- [MoneySmart — Transition to Retirement](https://moneysmart.gov.au/retirement-income-sources/transition-to-retirement)
- [ABS — Life Expectancy 2022-2024](https://www.abs.gov.au/statistics/people/population/life-expectancy/latest-release)
- [Australian Government Actuary — Life Tables](https://aga.gov.au/publications/life-tables)

### Industry Standards & Benchmarks
- [ASFA Retirement Standard](https://www.superannuation.asn.au/consumers/retirement-standard/)
- [ASFA Retirement Standard Budgets (March 2025 Quarter)](https://www.superannuation.asn.au/wp-content/uploads/2025/06/ASFA_Retirement_Standard_Budgets_Mar_25_quarter.pdf)
- [SuperGuide — Age Pension Asset Test Thresholds](https://www.superguide.com.au/in-retirement/age-pension-asset-test-thresholds)
- [SuperGuide — Age Pension Income Test Thresholds](https://www.superguide.com.au/in-retirement/age-pension-income-test-thresholds)
- [SuperGuide — Age Pension Rates (March 2026)](https://www.superguide.com.au/in-retirement/age-pension-rates)

### Competitor Tools
- [Boldin (formerly NewRetirement)](https://www.boldin.com/)
- [ProjectionLab](https://projectionlab.com/)
- [Fidelity Retirement Planner](https://www.fidelity.com/calculators-tools/retirement-calculator/overview)
- [Fidelity Retirement Score](https://www.fidelity.com/calculators-tools/fidelity-retirement-score-tool)
- [Stockspot](https://www.stockspot.com.au/)
- [Finder — Compare Australian Robo Advisors 2026](https://www.finder.com.au/robo-advice)

### SMSF Platforms
- [Class Super Market Position 2025](https://insightperth.com/why-class-super-leads/)
- [Netwealth — SMSF Administration Software](https://www.netwealth.com.au/web/insights/advicetech-glossary/smsf-administration-software-for-wealth-professionals/)
- [SMSF Engine — 2025 Software Guide](https://smsfengine.com.au/general/2025-smsf-software-guide/)

### Super Contribution & Tax Details
- [Rest Super — Contribution Caps 2025-26](https://rest.com.au/super/grow-my-super/contribution-caps)
- [Point B Planning — AU Super Contribution Caps 2025-26](https://pointbplanning.com.au/australian-super-contribution-caps-2025-26/)
- [MLC — Super Contribution Caps 2025-26](https://www.mlc.com.au/personal/insights/super-contribution-caps)
- [Challenger — What's Changing from 1 July 2025](https://www.challenger.com.au/adviser/knowledge-hub/Articles/Whats-changing-from-1-July-2025-in-super)
- [Industry Super — SG Rate Changes](https://www.industrysuper.com/understand-super/super-guarantee-calculator/super-guarantee-changes)

### Modelling Methodology
- [Kitces — How Many Monte Carlo Simulations Are Enough?](https://www.kitces.com/blog/monte-carlo-simulation-historical-returns-sequence-risk-calculate-sustainable-spending-levels/)
- [Kitces — Assessing Monte Carlo Model Performance](https://www.kitces.com/blog/monte-carlo-models-simulation-forecast-error-brier-score-retirement-planning/)
- [T. Rowe Price — Monte Carlo Analysis for Retirement](https://www.troweprice.com/personal-investing/resources/insights/how-monte-carlo-analysis-could-improve-your-retirement-plan.html)
- [Boldin — Monte Carlo Simulation Methodology](https://help.boldin.com/en/articles/5805671-boldin-s-monte-carlo-simulation)
- [Portfolio Visualizer — Monte Carlo Simulation](https://www.portfoliovisualizer.com/monte-carlo-simulation)

### Drawdown Strategies
- [Vanguard — Spending Strategies in Retirement](https://ownyourfuture.vanguard.com/content/en/learn/living-in-retirement/spending-strategies-in-retirement.html)
- [Schwab — Bucket Drawdown Strategy](https://www.schwab.com/learn/story/phasing-retirement-with-bucket-drawdown-strategy)
- [Morningstar — How to Find Your Perfect Withdrawal Rate](https://www.morningstar.com/retirement/how-find-your-perfect-withdrawal-rate-strategy)
- [White Coat Investor — Comparing Withdrawal Strategies](https://www.whitecoatinvestor.com/comparing-portfolio-withdrawal-strategies-in-retirement/)

### UX & Visualisation
- [Timeline.co — Retirement Modelling](https://www.timeline.co/resources/retirement-modelling-that-reflects-the-advice-being-given)
- [Advisor Perspectives — A New Tool to Visualize Retirement Planning](https://www.advisorperspectives.com/articles/2020/10/29/a-new-tool-to-visualize-retirement-planning)
- [OnTrajectory — Financial Planning](https://www.ontrajectory.com/)
- [RetireReady — Gap Analysis](https://retireready.com/solutions/gap-analysis/)

### Regulatory & Disclaimer
- [Dwyer Harris — Walking the General Advice Tightrope](https://www.dwyerharris.com/blog/walking-the-general-advice-tightrope)
- [Assured Support — General Advice](https://www.assuredsupport.com.au/articles/general-advice/)
- [Cbus Super — About the Retirement Calculator](https://www.cbussuper.com.au/tools-resources/calculators/retirement-income-estimate-calculator/about-this-calculator-retirement-income-estimate)

### Couples Planning
- [Boldin — 20+ Scenarios for Retirement Planning](https://www.boldin.com/retirement/scenarios-to-try-with-a-comprehensive-retirement-calculator/)
- [Great Oak Advisors — Age-Gap Couple Retirement](https://www.greatoakadvisors.com/age-gap-couples-retirement-success/)
- [Kiplinger — Retirement Planning for Couples with Age Gaps](https://www.kiplinger.com/slideshow/retirement/t037-s004-retirement-planning-wrinkles-couples-with-age-gaps/index.html)
