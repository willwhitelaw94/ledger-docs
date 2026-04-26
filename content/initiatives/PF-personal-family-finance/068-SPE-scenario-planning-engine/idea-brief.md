---
title: "Idea Brief: Scenario Planning Engine"
---

# Idea Brief: Scenario Planning Engine

**Created**: 2026-03-22
**Author**: William Whitelaw

---

## Problem Statement (What)

- Users can only model single-variable "what if" scenarios in cash flow forecasting (add/remove one transaction at a time) — no way to model compound futures
- Accountants advising clients on investment changes, tax strategy, or growth plans have no tool to show projected outcomes across the full financial position
- Business owners and personal ledger users can't answer "what happens to my net worth in 10 years if I change X, Y, and Z simultaneously?"
- Existing modules (portfolio, budgets, goals, tax, cash flow) each hold a piece of the picture but nothing connects them into a unified projection
- No way to save, name, or compare different planning scenarios side-by-side

**Current State**: Cash flow forecasting (041-CFF) offers a 13-week rolling forecast with ephemeral single-transaction scenarios. Portfolio (049-APF) tracks market values. Budgets (029-BGT) track variance. Goals (037-GLS) track progress. None of these project forward across multiple variables.

---

## Possible Solution (How)

A multi-variable financial modelling engine that sits on top of existing ledger data and lets users create named scenarios with adjustable parameters:

- **Scenario builder** — adjust multiple variables simultaneously: investment returns, tax rates, interest rates, revenue growth, expense changes, inflation
- **Time horizon projections** — model outcomes over 1, 5, 10, and 20-year periods using real ledger data as the baseline
- **Side-by-side comparison** — save named scenarios ("Conservative", "Aggressive Growth", "Tax Law Change") and compare projected outcomes visually
- **Sensitivity analysis** — tornado charts showing which variable has the biggest impact on a chosen outcome (net worth, cash position, retirement readiness)
- **AI-generated scenarios** — suggest scenario parameters based on market conditions, industry benchmarks, or detected patterns in the user's data
- **Monte Carlo distributions** — probability ranges for outcomes rather than single-point projections ("70% chance your net worth exceeds $X by 2036")

```
// Before (Current)
1. Open cash flow forecast
2. Add one hypothetical transaction
3. See 13-week impact on cash only
4. No way to save or compare

// After (Scenario Planning Engine)
1. Create named scenario "Aggressive Growth"
2. Set: revenue +15%, hire 2 staff, interest rate +1%, property appreciates 5%/yr
3. See 10-year projection across net worth, cash flow, tax liability, goal progress
4. Compare against "Conservative" and "Base Case" scenarios
5. AI highlights: "Revenue growth has 3x more impact than interest rate on your retirement goal"
```

---

## Benefits (Why)

**User/Client Experience**:
- Clients see projected outcomes before making decisions — reduces anxiety, increases confidence
- Accountants can present data-driven advisory scenarios in client meetings — elevates the relationship from compliance to strategic

**Operational Efficiency**:
- Replaces manual spreadsheet modelling that accountants currently do outside the platform
- Scenarios auto-update as real data flows in — no stale spreadsheets

**Business Value**:
- Major differentiator — no AU accounting platform offers integrated scenario modelling
- Drives premium tier adoption (Professional/Enterprise feature)
- Foundation for Retirement Planning and Risk Management modules — unlocks two future epics

**ROI**: High retention driver for advisory-focused practices. Estimated 15-20% lift in Professional tier conversion.

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
- Users have sufficient historical data (6+ months) for meaningful projections
- Monte Carlo simulations can run client-side or via lightweight API without excessive compute cost

**Dependencies**:
- Cash Flow Forecasting (041-CFF) — provides baseline cash projection logic
- Portfolio Tracking (049-APF) — provides asset valuations and returns data
- Budgets (029-BGT) — provides income/expense baseline
- Goals (037-GLS) — provides target milestones for scenario outcomes
- Tax/BAS (044-TAX) — provides tax rate parameters

**Risks**:
- Projection accuracy expectations (MEDIUM) → Mitigation: clearly label outputs as projections with confidence ranges, not predictions
- Compute cost for Monte Carlo at scale (LOW) → Mitigation: run simulations client-side with Web Workers; server-side only for complex multi-entity scenarios
- Feature complexity creep (HIGH) → Mitigation: v1 ships with 3-5 adjustable variables only; advanced modelling in v2

---

## Estimated Effort

**L (Large) — 4-5 sprints**, approximately 40-55 story points

- **Sprint 1**: Scenario model & CRUD — create/save/delete named scenarios, variable parameter schema, baseline snapshot from real data
- **Sprint 2**: Projection engine — time-series calculation across selected variables, 1/5/10/20-year horizons
- **Sprint 3**: Comparison UI — side-by-side scenario views, sensitivity tornado charts, projection line charts
- **Sprint 4**: AI suggestions & Monte Carlo — AI-generated scenario parameters, probability distributions, confidence ranges
- **Sprint 5**: Polish & integration — connect to goals progress, dashboard widget, practice advisory view

---

## Proceed to PRD?

**YES** — This is the connective tissue between five existing modules and the foundation for Retirement Planning (069) and Risk Management (070). High strategic value, clear user demand from advisory practices.

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

**Notes**: This epic is intentionally designed as a platform layer. Retirement Planning and Risk Management will consume the scenario engine's projection API rather than building their own modelling. The variable schema should be extensible so future modules can register their own adjustable parameters.
