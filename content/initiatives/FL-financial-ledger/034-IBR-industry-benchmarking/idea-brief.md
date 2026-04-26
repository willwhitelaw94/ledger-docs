---
title: "Idea Brief: Industry Benchmarking & Financial Ratios"
---

# Idea Brief: Industry Benchmarking & Financial Ratios

**Created**: 2026-03-16
**Author**: William Whitelaw

---

## Problem Statement (What)

- Business owners see their own numbers but have no context for whether those numbers are good, bad, or typical for their industry
- An accountant reviewing a tradie's books knows 42% gross profit is healthy — but the tradie doesn't. They need the comparison to understand their position
- Key financial ratios (gross profit margin, expense ratios, debtor days, liquidity) are buried in report pages and require manual calculation
- Practice managers advising multiple clients across industries have no quick way to spot which clients are underperforming vs their peers
- No proactive alerting when a ratio drifts outside the healthy range for the industry

**Current State**: Financial reports show raw numbers. No ratio calculations, no industry comparison, no "how am I doing vs others like me?" insight. Users must export to a spreadsheet to compute ratios manually.

---

## Possible Solution (How)

An **Industry Benchmarking** module that calculates financial ratios from the workspace's real ledger data and compares them against published industry averages:

- **Automatic ratio calculation** — computed from existing account balances, P&L, and balance sheet data. No manual input required.
- **Industry benchmark data** — sourced from ATO Small Business Benchmarks and ABS industry financials, keyed by the workspace's industry (already stored from entity setup)
- **Visual comparison** — gauge charts or cards showing the user's ratio vs the industry average/range with colour-coded status (green/amber/red)
- **Key ratios**: Gross Profit Margin, Net Profit Margin, Operating Expense Ratio, Current Ratio (liquidity), Quick Ratio, Debtor Days, Creditor Days, Revenue Growth
- **AI integration** — Penny (the chatbot) can reference benchmarks: "Your gross profit margin is 42%, above the trades average of 38%. Your debtor days are 45 — industry average is 30, you may want to chase overdue invoices."
- **Practice dashboard** — accountants see a client-by-client benchmark comparison, spotting outliers at a glance
- **Alerts** — optional notifications when a ratio drifts outside the healthy range for the industry (e.g., gross margin drops below industry P25)

```
// Before
Owner: "My gross profit is $180K — is that good?"
Accountant: "For a plumber doing $420K revenue, that's 42% margin which is solid."
(This conversation happens outside the system, if at all)

// After
Dashboard card: Gross Profit Margin — 42% (Industry avg: 38%) ✓ Above average
Penny: "Your gross margin is healthy at 42%. Focus area: debtor days (45) are above industry average (30)."
Practice view: 3 of 8 clients have below-average liquidity ratios
```

---

## Benefits (Why)

**User experience**:
- Transforms raw accounting data into actionable business intelligence
- Non-accountant owners instantly understand their financial health without needing expert interpretation

**Operational efficiency**:
- Accountants can prioritise advisory conversations — focus on clients whose ratios are drifting, not manually calculating benchmarks in spreadsheets
- Practice managers spot at-risk clients before they become problems

**Business value**:
- Differentiator vs Xero/MYOB — they show numbers, we show context
- Drives engagement with the AI chatbot (Penny becomes a business advisor, not just a data fetcher)
- Foundation for future features: predictive cash flow, automated advisory reports, client health scoring

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | William Whitelaw (PO, Dev) |
| **A** | William Whitelaw |
| **C** | — |
| **I** | — |

---

## Assumptions & Dependencies, Risks

**Assumptions**:
- ATO Small Business Benchmarks are freely available and cover the ANZSIC codes mapped to our industry list
- Workspace industry is already set during entity setup (013-WSP) — no new onboarding step needed
- Existing P&L, balance sheet, and account balance data is sufficient to compute all target ratios
- Benchmark data updates annually — a static JSON seed is acceptable for MVP (no live API needed)

**Dependencies**:
- 013-WSP Workspace Entity Setup — industry field on workspace
- 007-FRC Financial Reporting — P&L and balance sheet data
- 002-CLE Core Ledger Engine — account balances
- 021-AIQ AI Financial Chatbot — Penny tool integration for benchmark queries
- 015-ACT Accountant Practice Management — practice-level benchmark comparison view

**Risks**:
- ATO benchmark data may not cover all industries in our list (MEDIUM) → Mitigation: fall back to "All Industries" aggregate, show "No industry benchmark available" where data is missing
- Ratio calculations may give misleading results for new workspaces with limited data (LOW) → Mitigation: require minimum 3 months of data before showing benchmarks, display "Not enough data yet" otherwise
- Users may misinterpret benchmarks as prescriptive advice (LOW) → Mitigation: clear disclaimer "Benchmarks are indicative ranges, not financial advice"

---

## Estimated Effort

**M — 1 week (1 sprint)**

- **Phase 1** (2 days): Benchmark data seeder (ATO/ABS data as JSON), ratio calculation service, API endpoints
- **Phase 2** (2 days): Dashboard benchmark cards, dedicated `/benchmarks` page with all ratios, AI chatbot tool
- **Phase 3** (1 day): Practice-level comparison view, optional alerts, tests

---

## Proceed to PRD?

**YES** — High differentiation value. Leverages existing data (no new input required from users). Computationally simple. ATO benchmark data is freely available.

---

## Decision

- [ ] **Approved** - Proceed to PRD
- [ ] **Needs More Information**
- [ ] **Declined**

**Approval Date**: —

---

## Next Steps

**If Approved**:
1. [ ] Source ATO Small Business Benchmark data and map to workspace industries
2. [ ] `/speckit-specify` — Generate full spec
3. [ ] `/speckit-plan` — Technical plan
4. [ ] `/speckit-implement` — Build it
