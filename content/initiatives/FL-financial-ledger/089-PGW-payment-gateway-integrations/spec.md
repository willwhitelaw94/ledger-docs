---
title: "Feature Specification: Payment Gateway Integrations"
---

# Feature Specification: Payment Gateway Integrations

**Epic**: 089-PGW | **Created**: 2026-04-01 | **Status**: Draft
**Depends on**: 005-IAR (Invoicing), 088-IPT (Invoice PDF Templates)

---

## Problem Statement

Customers receiving MoneyQuest invoices have no way to pay online. Businesses must manually reconcile bank transfers against invoices. Xero integrates with Stripe, GoCardless, and PayPal for "Pay Now" buttons on invoices, reducing days-sales-outstanding by 30-50%.

## Scope

### In Scope (P1)
- Stripe Connect integration (card payments, bank transfers)
- "Pay Now" button on invoice portal page
- Payment webhook handling: auto-record payment when Stripe confirms
- Automatic reconciliation: match Stripe payout to bank transaction
- Workspace Stripe onboarding flow (Connect account setup)
- Payment receipt email to customer

### In Scope (P2)
- GoCardless integration (direct debit / ACH)
- PayID integration (Australian NPP real-time payments)
- Partial payment support (customer pays what they can)
- Payment plan setup (split invoice into instalments)
- Recurring card-on-file for subscription invoices
- Refund processing via gateway (linked to credit notes)

### In Scope (P3)
- Apple Pay / Google Pay on invoice portal
- BPAY integration (Australian bill payment network)
- Multi-currency payment acceptance
- Payment analytics dashboard (conversion rates, average payment time by method)

### Out of Scope
- POS / in-person card terminals
- Cryptocurrency payments
- Buy-now-pay-later (Afterpay, Zip)

## Key Entities
- `PaymentGateway` — workspace_id, provider (stripe|gocardless|payid), account_id, config, status
- `GatewayPayment` — invoice_id, gateway_id, external_payment_id, amount, fee, status, paid_at
- `PaymentLink` — invoice_id, token, url, expires_at, viewed_at

## Success Criteria
- Online payment from invoice < 3 clicks for customer
- Auto-reconciliation accuracy > 99%
- Payment notification to business within 60 seconds
- DSO reduction of 30%+ for workspaces using online payments
