---
title: "Idea Brief: Subscription & Recurring Payment Tracker"
---

# Idea Brief: Subscription & Recurring Payment Tracker

**Created**: 2026-03-22
**Author**: William Whitelaw

---

## Problem Statement (What)

- **Recurring payments are invisible**: Bank transactions flow through MoneyQuest via feeds and imports, but there is no system to identify which charges repeat. Users see hundreds of individual transactions with no awareness of underlying subscription commitments.
- **No subscription inventory**: There is nowhere to see "I pay $X/month across Y subscriptions." Users cannot answer basic questions: How much do my subscriptions cost? What am I paying for? Have any prices increased?
- **Price increases go unnoticed**: A streaming service bumps from $16.99 to $22.99, an insurance premium creeps up 8% at renewal, a forgotten $2.99/month app keeps charging. These changes are buried in transaction noise.
- **Cancelled services keep charging**: Users cancel a service but charges continue. Without tracking the expected end date against incoming transactions, there is no alert that something is wrong.
- **Cash flow forecasts miss predictable outflows**: The cash flow forecasting module (041-CFF) models future cash position but cannot automatically account for known recurring obligations. Users must manually enter each subscription as a forecast assumption.
- **Personal ledger users have no spending awareness**: The personal ledger (030-PLG) tracks assets and liabilities, but recurring subscriptions -- often the largest controllable expense category -- are completely unmanaged.

**Current State**: Bank transactions are imported and categorised. Anomaly detection flags outliers and duplicates. Cash flow forecasting supports scenario modelling. Recurring templates exist for creating documents (invoices, bills, journal entries) on a schedule. But none of these systems detect, track, or manage recurring charges coming *in* from bank feeds.

---

## Possible Solution (How)

### Subscription Detection Engine
- Analyse imported bank transactions for recurring patterns: same merchant + similar amount + regular interval
- Fuzzy merchant name matching to consolidate variants (e.g. "NETFLIX.COM", "Netflix Inc", "NETFLIX AU")
- Detect frequency (weekly, fortnightly, monthly, quarterly, annual) and amount consistency (fixed vs variable)
- Confidence scoring to distinguish genuine subscriptions from coincidental repeat purchases
- Present detected subscriptions to user for confirmation before adding to registry

### Subscription Registry
- Master list of all confirmed recurring payments per entity
- Key fields: provider name, category, amount/average, frequency, next expected date, status (active/paused/cancelled)
- Manual add for subscriptions the system hasn't detected
- Auto-link to historical bank transactions
- Group by category: entertainment, utilities, insurance, loans, SaaS, health

### Alerts and Insights
- Total monthly/annual recurring spend at a glance
- Price increase detection ("Netflix went from $16.99 to $22.99")
- Post-cancellation charge alerts, upcoming renewal reminders, forgotten subscription flagging
- New subscription detected notification

### Cash Flow Integration
- Feed confirmed subscriptions into cash flow forecasting (041-CFF) as predictable recurring outflows
- Improve forecast accuracy with known future obligations

```
// Before (current -- no subscription awareness)
Bank feed: 200 transactions this month
User sees: individual line items, no pattern recognition
Cash flow forecast: manual assumptions only

// After (subscription tracker active)
Bank feed: 200 transactions this month
System detects: 14 recurring subscriptions totalling $487/month
Alerts: "Spotify increased from $12.99 to $13.99" | "Free trial ending in 3 days"
Cash flow: $487/month auto-included as recurring outflows
```

---

## Benefits (Why)

**User/Client Experience**:
- See total recurring spend in one place -- no manual spreadsheet tracking
- Catch price increases within days, not months: estimated 15-20% of subscriptions increase annually without notice
- Cancel forgotten services: average Australian household has 2-3 unused subscriptions ($30-50/month wasted)

**Operational Efficiency**:
- Reduces manual data entry in cash flow forecasting by auto-populating known recurring outflows
- Subscription data enriches anomaly detection with expected-vs-actual comparisons

**Business Value**:
- High-engagement feature: subscription dashboards drive weekly active usage (users check regularly)
- Differentiator for personal ledger: most accounting tools ignore subscriptions; consumer finance apps (Frollo, WeMoney) make it a headline feature
- Retention driver: users who discover savings from subscription audits attribute value directly to the platform

**ROI**: If the average user saves $40/month by cancelling 1-2 forgotten subscriptions, the feature pays for itself in perceived value. At 10,000 personal ledger users, that is $4.8M/year in user savings -- a compelling marketing metric.

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | William Whitelaw (PO, Dev) |
| **A** | William Whitelaw |
| **C** | -- |
| **I** | -- |

---

## Assumptions & Dependencies, Risks

**Assumptions**:
- Bank feed transaction descriptions contain enough information to identify merchants and detect patterns
- Most recurring subscriptions follow predictable intervals (weekly, fortnightly, monthly, quarterly, annual)
- Users will confirm/reject detected subscriptions rather than expecting fully automatic management

**Dependencies**:
- 004-BFR -- bank feeds and reconciliation (complete): provides the transaction data to analyse
- 030-PLG -- personal ledger (complete): primary consumer for subscription tracking
- 040-AND -- anomaly detection (complete): provides pattern detection foundations
- 041-CFF -- cash flow forecasting (complete): integration target for recurring outflow predictions
- 006-CCM -- contacts (complete): merchant/provider linking

**Risks**:
- Detection accuracy insufficient (MEDIUM) --> Mitigation: confidence scoring with user confirmation. System suggests, user confirms. False positives are dismissed, false negatives can be manually added. Improve detection model over time.
- Merchant name fuzzy matching is unreliable (MEDIUM) --> Mitigation: start with exact matching + simple normalisation (trim, lowercase, remove common suffixes). Build a curated merchant alias database for known providers. User can manually merge duplicates.
- Scope creep into full budgeting app (HIGH) --> Mitigation: this is a subscription *tracker*, not a budget planner. Track recurring charges, alert on changes, feed into cash flow. Do not build spending categories, budget limits, or savings goals. Those belong in a separate epic.

---

## Estimated Effort

**L -- 4 sprints / 4 weeks**

- **Sprint 1**: Detection engine -- pattern matching on bank transactions, merchant normalisation, confidence scoring, subscription suggestion UI
- **Sprint 2**: Subscription registry -- CRUD, manual add, transaction linking, category management, provider display
- **Sprint 3**: Alerts and insights -- price change detection, cancellation tracking, spending summary dashboard, notification integration
- **Sprint 4**: Cash flow integration, lifecycle tracking (cancel/archive), polish and testing

---

## Proceed to PRD?

**YES** -- Subscription tracking fills a clear gap between bank feed import and cash flow forecasting. The personal ledger module gives MoneyQuest a consumer audience, but without subscription awareness those users lack one of the most requested personal finance features. The detection engine leverages existing bank transaction data, making this high value for moderate effort.

---

## Decision

- [ ] **Approved** -- Proceed to PRD
- [ ] **Needs More Information** -- [What's needed?]
- [ ] **Declined** -- [Reason]

**Approval Date**: --

---

## Next Steps

**If Approved**:
1. [ ] Run `/trilogy-idea-handover` -- Gate 0 validation
2. [ ] Run `/speckit-specify` -- Detailed spec with user stories and acceptance criteria
3. [ ] Research: how do Frollo, WeMoney, Truebill/Rocket Money, and Emma handle subscription detection?
