---
title: "Business: Virtual Cards"
---

# Business: Virtual Cards

**Epic**: 020-VCA
**Updated**: 2026-03-14

---

## Executive Summary

Virtual Cards gives SME owners and their accountants/bookkeepers a way to issue controlled digital spending cards to employees — with spend limits, category restrictions, and real-time transaction feeds that auto-post directly into the Polygon ledger. V1 is virtual-only (online + Apple/Google Pay), funded via monthly billing with a per-card fee model. The 12-month primary success metric is adoption: percentage of paid workspaces with at least one active virtual card issued.

---

## Business Problem

**Current state**
- SMEs give employees physical company cards (no controls) or run reimbursement workflows (slow, cash-flow burden on staff)
- Finance teams and accountants have no real-time visibility of employee spend — reconciliation is end-of-month, manual, and delayed
- Receipts live in email or a separate expense tool, never linked to the ledger entry
- No way to enforce category restrictions or per-person limits at the point of purchase

**Pain points**
- Bookkeepers spend significant time chasing receipts and manually entering card transactions
- Business owners discover budget overruns after the fact, not in real-time
- Reimbursement cycles create friction — employees dislike floating personal funds

**Opportunity**
- Polygon already has the full ledger, bank feeds infrastructure, and reconciliation engine
- A virtual card product sits naturally on top of this: every card swipe becomes an auto-posted ledger entry, receipts attach to the transaction, accountant approves from the same interface they already use

---

## Business Objectives

**Primary goals**
- Give SME owners and their accountants a single place to issue, control, and reconcile employee spend
- Eliminate manual card transaction entry and end-of-month reconciliation surprises
- Drive adoption of virtual cards across paid workspaces within 12 months

**Secondary goals**
- Generate incremental MRR via per-card fee pricing
- Increase daily active use — every card transaction is a touchpoint that brings users back to Polygon
- Establish the foundation for future embedded lending (short-term credit lines measured against the business's ledger data)

**Non-goals (V1)**
- Physical card issuance (V2)
- Short-term credit / card credit lines (future epic — "Coming Soon" placeholder in UI)
- Expense report / reimbursement workflow (out of scope — this replaces reimbursements, not models them)
- International cards or multi-currency spend controls (V2)

---

## Success Metrics & KPIs

| Metric | Baseline | Target (12 months) | Measurement |
|--------|----------|--------------------|-------------|
| **Adoption rate** *(primary)* | 0% | 25% of paid workspaces have ≥1 active card | Workspace-level flag in billing data |
| **Monthly spend volume** *(primary)* | $0 | $500K/month processed across all workspaces | Sum of CardTransaction amounts |
| Cards issued per workspace | — | Avg 3 cards per workspace using the feature | Card model count per workspace |
| Receipt capture rate | — | ≥80% of transactions have a receipt attached within 48h | Attachment presence on CardTransaction |
| Auto-reconciliation rate | — | ≥70% of card transactions auto-posted without manual intervention | Reconciliation status on ledger entries |
| Retention lift *(lagging)* | — | Card-using workspaces churn ≤50% of the rate of non-card workspaces | Churn cohort analysis at 12 months |
| Per-card MRR | $0 | To be set once pricing is confirmed | Stripe subscription line item |

---

## Stakeholder Analysis

| Stakeholder | Role | Interest | RACI |
|-------------|------|----------|------|
| William Whitelaw | PO, Dev | Full delivery ownership | R, A |
| SME Business Owner | End user (card admin) | Spend control, real-time visibility, no paperwork | C |
| Bookkeeper / Accountant | End user (reconciler) | Auto-posted entries, receipt capture, approval workflow | C |
| Employee / Cardholder | End user (spender) | Easy receipt capture, no reimbursements | I |
| Card Issuing Provider (TBD) | Technology partner | API integration, compliance, interchange | C |

---

## Business Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Card issuing not available/licensable in AU | High — blocks entire feature | Medium | Discovery spike first: confirm Stripe Issuing or Airwallex availability in AU before committing to spec |
| Regulatory — AFSL requirement | High — could require own licence | Medium | Use provider-managed funding model (Airwallex Wallet / Stripe Issuing) so Polygon doesn't hold funds; provider holds the licence |
| Fraud / chargeback liability | High | Low-Medium | Delegate dispute handling to card issuer in V1; define clear ToS around cardholder liability |
| Scope creep into full expense management | Medium — delays delivery | High | Strict V1 scope: virtual-only, no reimbursements, no physical cards, no credit. "Coming soon" placeholders only. |
| Low adoption if per-card pricing is too high | Medium | Medium | Price at a level that's clearly cheaper than the time cost of manual reconciliation; validate with 2–3 accountant beta users before launch |

---

## ROI Analysis

**Investment**
- Discovery spike: ~1 sprint (provider evaluation, regulatory check)
- Full delivery: ~5–7 sprints (XL)
- Ongoing: card issuing provider integration maintenance, webhook reliability

**Expected returns**
- Per-card fee (pricing TBD — ~$5–10/card/month is indicative)
- At 25% adoption of 200 paid workspaces = 50 workspaces × avg 3 cards = 150 active cards
- At $7/card/month = ~$1,050 MRR at 12-month adoption target (modest but grows with workspace growth)
- Retention lift is the larger economic argument: if card-using workspaces churn half as often, LTV doubles for that cohort
- Future: short-term credit lines on top of the card product represent a significantly larger revenue opportunity

**Payback period**
- MRR contribution alone is modest at early scale — the business case rests primarily on retention improvement and competitive differentiation, not interchange or card fees alone

---

## Market Context

**Target users**
- Primary: Australian SME owners (5–50 staff) who manage spend through an accountant or bookkeeper
- Secondary: Accountants/bookkeepers managing multiple SME clients who want a unified card + reconciliation view across their client book

**Competitive landscape**
| Competitor | Positioning | Gap vs Polygon |
|-----------|-------------|----------------|
| Weel (formerly Spenny) | AU spend management, virtual cards, receipt capture | No accounting ledger — exports to Xero/MYOB. Polygon integrates natively |
| Airwallex Spend | Global virtual cards, expense management | Expensive, enterprise-focused, no AU SME accounting integration |
| Expensify | Expense reports + reimbursements | Reimbursement model, not card-first. No ledger integration |
| Xero (no card product) | Accounting only | Xero has no card issuing — gap Polygon can fill |
| MYOB (no card product) | Accounting only | Same gap |

**Polygon's advantage**: the ledger is already there. Every card transaction auto-posts with zero re-keying. Competitors are expense tools trying to connect to accounting; Polygon is accounting that issues the card.

**Timing**
- CDR (Consumer Data Right) in AU is maturing — bank feed + virtual card together is a strong "connected finance" story
- Airwallex Issuing is available in AU — confirmation needed on whether we can integrate under their programme without our own AFSL

---

## Business Clarifications

### Session 2026-03-14

- Q1: Who's the primary buyer? → **SME owner-operators AND their accountants/bookkeepers** managing on their behalf
- Q2: Revenue model? → **Per-card fee** (e.g. $5–10/card/month)
- Q3: Card funding model? → **Monthly billing** (spend billed to business monthly); future option: short-term credit lines measured against the ledger — "Coming Soon" placeholder in V1 UI
- Q4: Physical cards in scope? → **Virtual-only** (V1). Apple/Google Pay covers in-person. Physical cards = V2.
- Q5: Primary success metric at 12 months? → **Adoption rate + Volume** — % of paid workspaces with ≥1 active card (leading) and $M monthly spend processed (proves active usage, not just issuance)

---

## Approval

- [ ] Business objectives approved
- [ ] Success metrics defined and baselined
- [ ] Stakeholders aligned
- [ ] Provider discovery spike scoped and scheduled
