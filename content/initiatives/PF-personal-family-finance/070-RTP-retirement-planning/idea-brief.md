---
title: "Idea Brief: Retirement Planning"
---

# Idea Brief: Retirement Planning

**Created**: 2026-03-22
**Author**: William Whitelaw

---

## Problem Statement (What)

- Users have no way to model retirement outcomes — when can I retire, how much do I need, what income will I have?
- Business owners can't see how their business exit strategy impacts retirement readiness
- Accountants advising on superannuation contributions, salary sacrifice, or investment rebalancing have no tool to show long-term retirement impact
- Goals (037-GLS) can track a "retirement fund" target but can't model the journey — contributions, returns, drawdown, longevity risk, or tax implications
- Personal ledger users tracking net worth (030-PLG) can see where they are today but not where they'll be in 20 years

**Current State**: Goal Setting (037-GLS) tracks progress toward static targets. Cash flow forecasting (041-CFF) projects 13 weeks ahead. Neither models retirement-specific variables like super contributions, preservation age, drawdown rates, or longevity projections.

---

## Possible Solution (How)

A retirement planning module that connects to the Scenario Planning Engine (068-SPE) to model personalised retirement outcomes:

- **Retirement profile** — target retirement age, desired annual income, life expectancy assumption, risk tolerance
- **Income stream modelling** — superannuation (employer + salary sacrifice + voluntary), investment portfolio returns, rental income, business sale proceeds, pension eligibility
- **Goal-linked scenarios** — set retirement goals and the AI runs scenarios showing how current trajectory, investment changes, or contribution increases impact the timeline
- **Drawdown modelling** — post-retirement cash flow: how long will savings last at different spending levels, adjusted for inflation
- **Multi-person support** — couples planning together, business partners with different exit timelines, employer planning for employee retirement benefits
- **AI retirement advisor** — "If you increase super contributions by $500/month, you can retire 2 years earlier" or "At current trajectory, you'll reach your retirement income goal by age 63"

```
// Before
1. User asks accountant: "When can I retire?"
2. Accountant opens spreadsheet, manually enters assumptions
3. Produces a static PDF projection
4. Next year: redo from scratch

// After
1. User opens Retirement Planning, sets goal: retire at 60, $80k/year income
2. Engine pulls real data: current super balance, portfolio, business value, cash flow
3. Shows: "At current trajectory: retire at 63. Increase super by $500/mo: retire at 60."
4. Compare 3 scenarios side-by-side, auto-updated as real data flows in
5. AI: "Your property concentration (68%) creates sequence-of-returns risk — consider diversifying before retirement"
```

---

## Benefits (Why)

**User/Client Experience**:
- Individuals and business owners get clear, data-driven retirement projections — not generic calculators
- Projections update automatically as real financial data changes — always current

**Operational Efficiency**:
- Accountants replace manual retirement modelling spreadsheets with a client-facing tool
- Advisory meetings become more productive — show scenarios live, adjust in real-time

**Business Value**:
- Massive differentiator — connects daily accounting data to life's biggest financial question
- Drives long-term platform stickiness — users won't leave if their retirement plan lives here
- Premium feature for Professional/Enterprise tiers
- Natural upsell from Personal Ledger users

**ROI**: High retention and conversion driver. Retirement planning is the #1 reason individuals seek financial advice — owning this in-platform is strategically significant.

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | William Whitelaw (PO, Dev) |
| **A** | -- |
| **C** | -- |
| **I** | -- |

---

## Assumptions & Dependencies, Risks

**Assumptions**:
- Users will provide retirement-specific inputs (target age, desired income) if the onboarding is low-friction
- Australian superannuation rules (preservation age, contribution caps, tax concessions) are the primary regulatory context for v1

**Dependencies**:
- Scenario Planning Engine (068-SPE) — retirement projections are scenarios with retirement-specific variables
- Portfolio Tracking (049-APF) — provides current investment values and returns
- Goals (037-GLS) — retirement goals link to the goal tracking system
- Risk Management (069-RMI) — risk profile informs retirement scenario assumptions
- Personal Ledger (030-PLG) — net worth baseline for personal users

**Risks**:
- Regulatory complexity (HIGH) → Mitigation: v1 is informational projection only — explicit "not financial advice" disclaimers; no AFSL-regulated outputs
- Accuracy of long-term projections (MEDIUM) → Mitigation: Monte Carlo ranges via Scenario Planning Engine; show probability bands, not single numbers
- Super fund data integration (LOW for v1) → Mitigation: manual entry for v1; API integration with super funds deferred to v2

---

## Estimated Effort

**L (Large) — 4-5 sprints**, approximately 40-50 story points

- **Sprint 1**: Retirement profile & onboarding — target age, income goal, risk tolerance, current super balance entry
- **Sprint 2**: Projection engine — contribution modelling (employer/salary sacrifice/voluntary), investment returns, inflation adjustment, drawdown calculation
- **Sprint 3**: Scenario integration — connect to 068-SPE for multi-variable retirement scenarios, side-by-side comparison
- **Sprint 4**: AI retirement advisor — trajectory analysis, contribution optimisation suggestions, risk warnings
- **Sprint 5**: Multi-person & polish — couples planning, employer view, dashboard widget, practice advisory view

---

## Proceed to PRD?

**YES** — Builds on Scenario Planning Engine (068-SPE) and connects five existing modules into a compelling retirement advisory tool. High strategic value for platform stickiness and premium tier conversion.

---

## Decision

- [ ] **Approved** - Proceed to PRD
- [ ] **Needs More Information** - [What's needed?]
- [ ] **Declined** - [Reason]

**Approval Date**: [YYYY-MM-DD]

---

## Next Steps

**If Approved**:
1. [ ] Create PRD (spec.md)
2. [ ] Create plan.md
3. [ ] Create Linear epic
4. [ ] Break down into user stories

---

**Notes**: Build order is critical: 068-SPE (Scenario Planning) must ship first, then 069-RMI (Risk Management) and 070-RTP (Retirement Planning) can be built in parallel since both consume the scenario engine but don't depend on each other.
