---
title: "Idea Brief: Risk Management & Insurance Register"
---

# Idea Brief: Risk Management & Insurance Register

**Created**: 2026-03-22
**Author**: William Whitelaw

---

## Problem Statement (What)

- Users have no way to identify, track, or quantify financial risks across their entities — investment concentration, insurance gaps, liquidity exposure, or market volatility
- Accountants can't produce a risk profile for client advisory meetings — they resort to ad-hoc spreadsheets or skip it entirely
- Insurance policies are tracked in filing cabinets or scattered spreadsheets — no renewal reminders, no coverage gap analysis, no premium-to-asset ratio visibility
- Portfolio tracking (049-APF) shows market values but not risk metrics — no VaR, no concentration warnings, no volatility tracking
- Family groups managing multiple entities have no consolidated risk view across the group

**Current State**: Anomaly detection (040-AND) catches transaction-level fraud. Entity health score (051-EHS) gives a general health indicator. Neither provides forward-looking risk assessment or insurance tracking.

---

## Possible Solution (How)

A risk management module with two core surfaces: a risk register and an insurance register.

- **Risk register** — categorised risk items (investment, market, liquidity, compliance, insurance, operational) with likelihood/impact scoring, mitigation actions, and review dates
- **Insurance register** — track policies (type, provider, coverage amount, premium, renewal date), coverage gap analysis against assets, renewal reminders
- **Portfolio risk metrics** — concentration analysis, sector exposure, volatility indicators, VaR estimates using asset price feed data
- **Risk dashboard widget** — consolidated risk score with drill-down to individual risk items and insurance gaps
- **AI risk alerts** — proactive notifications when risk profile changes (e.g., asset concentration exceeds threshold, insurance policy lapses, market volatility spike)

```
// Before
1. Accountant manually reviews client portfolio in spreadsheet
2. Checks insurance policies from paper files
3. No systematic risk scoring
4. Client meeting: "You should probably review your insurance"

// After
1. Risk dashboard shows: 3 HIGH risks, 2 insurance gaps, portfolio concentrated 68% in property
2. AI alert: "Vehicle insurance expires in 14 days — no renewal scheduled"
3. Client meeting: "Your risk score improved from 62 to 78 after diversifying last quarter"
```

---

## Benefits (Why)

**User/Client Experience**:
- Clients see their risk exposure clearly — drives better decision-making
- Insurance renewal reminders prevent coverage gaps — real money saved

**Operational Efficiency**:
- Replaces manual risk assessment spreadsheets
- Auto-calculates portfolio risk metrics from existing asset data — no double entry

**Business Value**:
- Positions MoneyQuest as a wealth advisory platform, not just accounting software
- Insurance register is a retention feature — users won't leave if their policy data lives here
- Feeds into Scenario Planning (068-SPE) for stress testing

**ROI**: Retention driver for personal ledger and family group users. Advisory practices charge for risk reviews — this tool enables that.

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
- Users will maintain insurance policy data if the UX is low-friction (auto-detect from bank transactions, OCR from policy documents)
- Portfolio risk metrics can be calculated from existing asset price feed data without additional data sources

**Dependencies**:
- Asset Price Feeds (049-APF) — provides market data for volatility and concentration analysis
- Entity Health Score (051-EHS) — risk score could extend or complement health score
- Scenario Planning Engine (068-SPE) — stress testing consumes risk parameters

**Risks**:
- Insurance data entry friction (MEDIUM) → Mitigation: AI extraction from uploaded policy documents, bank transaction matching for premiums
- Risk metric accuracy expectations (MEDIUM) → Mitigation: label as indicative, not financial advice; disclaim appropriately
- Scope creep into compliance/regulatory (LOW) → Mitigation: v1 is informational only — no regulatory reporting

---

## Estimated Effort

**M-L (Medium-Large) — 3-4 sprints**, approximately 30-40 story points

- **Sprint 1**: Risk register CRUD — categories, likelihood/impact matrix, mitigation tracking, review dates
- **Sprint 2**: Insurance register — policy CRUD, renewal reminders, coverage gap analysis against assets
- **Sprint 3**: Portfolio risk metrics — concentration, volatility, VaR from asset feeds; risk dashboard widget
- **Sprint 4**: AI alerts & integration — proactive risk notifications, scenario planning integration

---

## Proceed to PRD?

**YES** — Fills a clear gap in the platform's advisory capabilities. Builds on existing asset and health score infrastructure.

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

**Notes**: The risk register should be polymorphic — applicable to business entities, personal ledgers, and family groups. Insurance register could eventually integrate with insurance provider APIs for auto-renewal and claims tracking, but v1 is manual entry + AI extraction.
