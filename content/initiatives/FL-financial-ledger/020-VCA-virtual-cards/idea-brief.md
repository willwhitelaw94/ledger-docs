---
title: "Idea Brief: Virtual Cards"
---

# Idea Brief: Virtual Cards

**Epic**: 020-VCA
**Created**: 2026-03-14
**Initiative**: FL — Financial Ledger Platform

---

## Problem Statement (What)

- Businesses have no way to give employees controlled access to company funds without issuing a physical card or reimbursement workflows
- Reimbursement flows (employee pays → submits receipt → gets paid back) are slow, create cash flow burden on staff, and add reconciliation overhead
- Physical company cards have no granular controls — any cardholder can spend anywhere with no real-time visibility
- Finance teams currently have no way to enforce category restrictions (e.g. "marketing budget only") or per-person spend limits at the point of purchase
- Transactions from company cards must be manually imported or matched — there is no automatic ledger posting when spend occurs
- Receipt capture is disconnected from the transaction — receipts live in email or a separate expense tool, never linked to the ledger entry

**Current State**: No spend management capability. Businesses either use physical cards with no controls, or burden employees with reimbursements. Reconciliation is manual and delayed.

---

## Possible Solution (How)

### Virtual Card Issuance
- Workspace admins issue virtual cards to workspace members (one per user, or multiple purpose-specific cards)
- Cards are digital-only: card number, CVV, expiry — usable for online payments and Apple/Google Pay
- Each card is tied to a single workspace member and a cost centre or expense category
- Card issuance via an embedded card-issuing provider (e.g. Stripe Issuing, Airwallex, or Marqeta)

### Spend Controls
- Per-card limits: transaction limit, daily limit, monthly limit
- Merchant Category Code (MCC) restrictions: allow only specific categories (e.g. "Travel & Transport", "Software & Subscriptions")
- Date range locks: temporary project-based cards that auto-expire
- Card freeze/unfreeze: admin or cardholder can pause a card instantly

### Real-Time Transaction Feed
- Approved transactions trigger a webhook from the card issuer in real-time
- Transaction is automatically posted as a draft ledger entry (debit = expense account, credit = clearing account)
- Cardholder receives an in-app and/or push notification to capture a receipt
- Transactions appear in a "Cards" feed — similar to Bank Feed but scoped to virtual card transactions

### Receipt Capture & Reconciliation
- Cardholder attaches a receipt (photo/PDF) directly to the transaction notification
- Optional: cardholder adds a memo or job/cost-centre tag
- Finance team reviews and approves draft entries — or auto-posts based on matching rules
- Fully reconciled transaction shows: merchant, amount, category, receipt, ledger entry — all in one record

### Before / After

```
// Before
Employee pays → keeps receipt → submits expense report →
finance reviews → reimbursement processed → manual ledger entry →
receipt stored in email → no real-time visibility

// After
Admin issues virtual card with limits → employee spends →
transaction hits ledger in real-time → push notification to capture receipt →
receipt attached → finance approves → reconciled with zero manual data entry
```

---

## Benefits (Why)

**For Finance Teams**
- Real-time spend visibility — no more end-of-month surprise reconciliation
- Spend policy enforced at the point of purchase — no over-budget surprises
- Automatic ledger posting eliminates manual entry for card transactions
- Receipts linked at transaction level — no chasing staff for documentation

**For Employees**
- No personal funds tied up in reimbursement cycles
- Simple receipt capture from notification — not a separate expense app
- Transparency: can see their own card balance and transaction history

**For Business Owners**
- Granular control without micromanagement — set the rules once, trust the system
- Real-time dashboard of all company card spend across all employees
- Audit trail: every transaction has a receipt, a ledger entry, and an approver

**Platform Value**
- Differentiates from pure accounting tools — moves Polygon toward spend management
- High-frequency interaction touchpoint (every card swipe) drives daily active use
- Monetisation: interchange revenue share from card issuer; or premium tier feature
- Natural upsell from bank feeds (004-BFR) — users already comfortable with transaction feeds

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | William Whitelaw (PO, Dev) |
| **A** | William Whitelaw |
| **C** | — |
| **I** | — |

---

## Assumptions & Dependencies

**Assumptions**
- A card-issuing provider (Stripe Issuing, Airwallex, or Marqeta) can be integrated — licensing/compliance requirements for card issuing in AU need to be validated
- Workspace users are identified individuals (not anonymous) — user identity is already established (003-AUT complete)
- The clearing account approach (debit expense, credit card clearing) is the correct accounting pattern for virtual card spend
- Receipt capture can piggyback on the existing file attachments system (012-ATT)

**Dependencies**
- 003-AUT Auth & Multi-tenancy — user identity, workspace roles for cardholder and admin roles
- 004-BFR Bank Feeds & Reconciliation — webhook ingestion pattern, transaction matching infrastructure
- 010-PLT Platform Integrations — card-issuing provider API integration
- 012-ATT File Attachments — receipt file storage on card transactions
- 002-CLE Core Ledger Engine — auto-posting of card transactions as journal entries

**Risks**
- **Regulatory**: Card issuing in Australia requires AFSL or partnership with a licensed provider — must confirm Stripe Issuing / Airwallex availability in AU before committing
- **Fraud / Liability**: Issued cards carry financial liability — dispute handling, fraud controls, and chargeback processes must be defined
- **Scope creep**: Spend management is a full product category (Weel, Expensify, Airwallex Spend) — must draw a clear boundary between MVP and future
- **Complexity**: Real-time webhooks + event sourcing + reconciliation state machine is non-trivial — integrating an external issuer's lifecycle events with our aggregate model needs careful design

---

## Estimated Effort

**T-Shirt Size**: XL (5–7 sprints)

| Phase | Work |
|-------|------|
| Discovery | Provider evaluation (Stripe Issuing vs Airwallex vs Marqeta), AU regulatory check, data model design |
| Backend | VirtualCard + CardTransaction models, card-issuing provider integration, webhook ingestion, auto-ledger posting |
| API | Card management endpoints, spend controls CRUD, transaction feed, receipt attachment |
| Frontend | Card management UI (issue, freeze, set limits), transaction feed, receipt capture flow, spend dashboard |
| Tests | Spend limit enforcement, MCC restriction, webhook-to-ledger posting accuracy, multi-tenant isolation |

---

## Proceed to Spec?

**NOT YET** — a discovery spike is needed first to validate:
1. Whether Stripe Issuing or Airwallex Issuing is available and licensable in Australia
2. The regulatory pathway (do we need our own AFSL, or can we operate under the provider's licence?)
3. Interchange economics and whether this is a viable revenue stream or a cost centre

Once the provider and regulatory question is resolved, this is a strong YES to spec — all technical dependencies are complete.
