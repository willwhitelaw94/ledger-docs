---
title: "Feature Specification: Payment Gateway Integration"
description: "Stripe card payments and GoCardless direct debit for online invoice payments with auto-reconciliation"
---

# Feature Specification: Payment Gateway Integration

**Epic**: 098-PGI | **Created**: 2026-04-01 | **Status**: Draft
**Initiative**: FL -- MoneyQuest Ledger
**Effort**: XL (6 sprints)
**Depends On**: 005-IAR (Invoicing, complete), 025-CRN (Credit Notes, complete), 023-EML (Email Infrastructure, complete), 088-IPT (Invoice PDF Templates, complete)
**Supersedes**: 089-PGW (Payment Gateway Integrations -- absorbed and expanded), 047-STP (Stripe Payments & Connect -- Connect onboarding and billing portions remain separate)

---

## Problem Statement

Customers receiving MoneyQuest invoices have no way to pay online. Every invoice sent today requires the customer to manually arrange a bank transfer, then the business waits for funds to appear and manually matches the payment against the invoice. This creates three pain points:

1. **Slow payment** -- without a frictionless "Pay Now" button, customers deprioritise payment. Average days-sales-outstanding (DSO) for manual-pay invoices is 28+ days.
2. **Manual reconciliation labour** -- bookkeepers spend hours cross-referencing bank feeds against invoices, especially when customers pay partial amounts or combine multiple invoices into one transfer.
3. **No direct debit option** -- recurring service businesses (accountants, consultants, property managers) cannot set up automatic collection and must invoice-and-chase every cycle.

Xero, MYOB, and QuickBooks all offer integrated online payments via Stripe and GoCardless, reducing DSO by 30-50% and automating the payment-to-ledger pipeline. MoneyQuest must match this capability to be a credible alternative.

### Existing Infrastructure

The codebase already has significant payment scaffolding:

- **InvoiceAggregate** with `recordPayment()` method that fires `InvoicePaymentReceived` events, handles partial payments, and guards against overpayment
- **InvoicePayment** model with `amount`, `payment_date`, `payment_method`, `reference`, `journal_entry_id` fields
- **Payment** model with `PaymentMethod` enum (`cash`, `bank_transfer`, `card`, `cheque`, `other`), `PaymentStatus` enum, and bank account linkage
- **RecordInvoicePayment** action that orchestrates aggregate event, payment record, and JE creation
- **SendPaymentConfirmationEmail** action already triggered after payment recording
- **InvoiceStatus** transitions: `Sent -> PartiallyPaid -> Paid` with `isPayable()` guard
- **BankAccount** model with `chart_account_id` linking to the Chart of Accounts for JE posting
- **Credit note allocation** system (025-CRN) for handling refunds as credit notes
- **047-STP** defines Stripe Connect Express onboarding for tenants -- this epic consumes a connected account but does not own the onboarding flow

What is missing: payment link generation, public payment portal, Stripe payment intent creation, GoCardless mandate management, webhook handlers for both gateways, auto-reconciliation pipeline, refund processing, fee handling, and payment settings UI.

---

## Scope

### In Scope (P1 -- Core Online Payments)

- Payment link generation for sent invoices (unique token-based URL)
- Public payment portal page (unauthenticated, branded per workspace)
- Stripe integration: Payment Intents, checkout sessions, webhook handling
- Auto-record `InvoicePayment` + journal entry (Dr Bank, Cr Accounts Receivable) on confirmed payment
- Partial payment support (customer chooses amount, minimum $1.00)
- Payment status tracking on invoice list and detail pages
- Payment settings page (connect/disconnect gateways, configure defaults)
- Payment receipt email to customer via existing email infrastructure
- Webhook idempotency (prevent duplicate payment recording)

### In Scope (P2 -- Direct Debit & Fees)

- GoCardless integration: mandate creation, one-off collection, recurring collection
- GoCardless AU direct debit (BECS) support
- Payment fee handling: absorb or pass Stripe/GoCardless fees to customer
- Surcharge display on payment portal ("Card payment includes 1.5% surcharge")
- Refund processing through gateway with auto credit note creation
- Payment retry for failed direct debit collections
- Mandate management UI (view active mandates per contact)

### In Scope (P3 -- Advanced)

- Apple Pay / Google Pay via Stripe Payment Request Button
- Multi-currency payment acceptance (charge in invoice currency)
- Payment analytics dashboard (conversion rates, average payment time by method)
- Saved payment methods for returning customers
- Payment plan / instalment setup (split invoice into scheduled collections)
- Bulk "Send Payment Link" for multiple outstanding invoices

### Out of Scope

- POS / in-person card terminals
- Cryptocurrency payments
- Buy-now-pay-later (Afterpay, Zip)
- Stripe Connect Express onboarding (owned by 047-STP)
- Platform subscription billing (owned by 009-BIL)
- BPAY integration (Australian bill payment network -- separate epic)
- PayID / NPP real-time payments (separate epic)

---

## Architecture Context

### Payment Flow Overview

```
Customer receives invoice email
         |
         v
  Clicks "Pay Now" link
         |
         v
  Public Payment Portal (/{workspace-slug}/pay/{token})
    - Shows invoice summary, amount due, payment methods
    - No authentication required
         |
         +--- Card Payment (Stripe) ---------> Stripe Payment Intent
         |                                          |
         +--- Direct Debit (GoCardless) -----> GoCardless Payment
         |                                          |
         v                                          v
  Webhook received (async)                   Webhook received (async)
         |                                          |
         v                                          v
  ProcessGatewayPayment action (idempotent)
         |
         +--- RecordInvoicePayment (existing action)
         |         |
         |         +--- InvoiceAggregate::recordPayment()
         |         +--- InvoicePaymentReceived event
         |         +--- JE: Dr Bank, Cr Accounts Receivable
         |
         +--- Create GatewayPayment record
         +--- SendPaymentConfirmationEmail (existing action)
         +--- Update PaymentLink status
```

### Event Sourcing Integration

Gateway payments flow through the existing `InvoiceAggregate::recordPayment()` pipeline. The `ProcessGatewayPayment` action is the only new entry point -- it calls `RecordInvoicePayment::run()` internally, ensuring the same event sourcing guarantees apply to online payments as manual payments. The `payment_method` is set to `card` (Stripe) or `direct_debit` (GoCardless), and the `reference` contains the gateway transaction ID.

### Multi-Tenancy

All gateway models are workspace-scoped with `workspace_id` column and global scope. The public payment portal resolves the workspace from the `PaymentLink` token -- no tenant context middleware needed for the public route. Webhook handlers resolve the workspace from the `GatewayPayment.workspace_id` stored at payment initiation time.

### Feature Gating

Online payments gated via Laravel Pennant feature flag `online_payments`. Backend middleware check on payment settings routes. API response includes `features.online_payments` boolean for frontend conditional rendering. Requires Professional+ plan tier.

---

## User Stories

### US-1: Generate Payment Link for Sent Invoice [P1]

**As a** bookkeeper,
**I want** a unique payment link automatically generated when I send an invoice,
**so that** my customers can pay online without me doing anything extra.

**INVEST**: Independent (no gateway config required to generate link), Negotiable (auto vs manual generation), Valuable (enables all downstream payment stories), Estimable (token generation + URL construction), Small (single action + migration), Testable (link format and uniqueness assertions).

**Acceptance Scenarios**:

1. **Given** an invoice with status "Approved" is marked as sent, **When** the `SendInvoice` action completes, **Then** a `PaymentLink` record is created with a unique 64-character token, the invoice UUID, an expiry date of 90 days from now, and the link URL follows the pattern `{APP_URL}/{workspace-slug}/pay/{token}`.

2. **Given** an invoice already has a payment link, **When** the invoice is sent again (e.g. resend), **Then** the existing link is reused (not duplicated) and the expiry date is extended to 90 days from now.

3. **Given** a payment link exists for an invoice, **When** the invoice is voided, **Then** the payment link is deactivated (`deactivated_at` set) and visiting the URL shows "This invoice is no longer available for payment."

4. **Given** a payment link has expired (90 days past), **When** a customer visits the URL, **Then** they see "This payment link has expired. Please contact {business name} for a new invoice." and the business is not charged any gateway fees.

5. **Given** the workspace does not have any payment gateway connected, **When** the payment link is generated, **Then** the link is still created (for future gateway connection) but the payment portal shows "Online payment is not yet available for this invoice. Please pay via bank transfer." with the workspace's bank details if configured.

---

### US-2: Public Payment Portal Page [P1]

**As a** customer who received an invoice,
**I want** to view the invoice summary and pay online from a clean, branded page,
**so that** I can pay in under 60 seconds without creating an account.

**INVEST**: Independent (works with any gateway or no gateway), Negotiable (branding depth), Valuable (the customer-facing conversion point), Estimable (single public page + API), Small (one page, no auth), Testable (renders invoice data, shows payment methods).

**Acceptance Scenarios**:

1. **Given** a valid payment link token, **When** the customer visits `/{workspace-slug}/pay/{token}`, **Then** they see the workspace business name and logo, invoice number, issue date, due date, contact name, line item summary, subtotal, tax, total, amount already paid, and amount due.

2. **Given** the invoice has amount_due of $500.00, **When** the payment portal loads, **Then** the payment amount field defaults to $500.00, with an option to enter a custom amount (minimum $1.00, maximum the amount_due).

3. **Given** the workspace has Stripe connected and active, **When** the portal loads, **Then** a "Pay with Card" button is displayed. **Given** the workspace also has GoCardless connected, **Then** a "Pay by Direct Debit" button is also displayed.

4. **Given** the customer visits the payment link, **When** the page loads, **Then** `PaymentLink.viewed_at` is set to the current timestamp (first view only) and `PaymentLink.view_count` is incremented.

5. **Given** the invoice is already fully paid (amount_due = 0), **When** the customer visits the payment link, **Then** they see "This invoice has been paid in full. Thank you!" with the payment date and a link to download the receipt PDF.

6. **Given** the workspace has no gateways connected, **When** the portal loads, **Then** the page shows "Online payment is not available. Please pay via bank transfer." with the workspace's bank details (BSB, account number, reference = invoice number) if configured, or "Contact {business name} for payment instructions."

---

### US-3: Pay Invoice with Card via Stripe [P1]

**As a** customer,
**I want** to pay an invoice with my credit or debit card,
**so that** payment is immediate and I get a receipt.

**INVEST**: Independent (Stripe-only, no GoCardless dependency), Negotiable (hosted checkout vs embedded elements), Valuable (fastest payment method, highest conversion), Estimable (Stripe Payment Intent API is well-documented), Small (create intent + redirect + webhook handler), Testable (Stripe test mode with test card numbers).

**Acceptance Scenarios**:

1. **Given** a customer clicks "Pay with Card" on the payment portal for an invoice of $330.00 (including GST), **When** they are redirected to Stripe Checkout, **Then** the checkout page shows the workspace business name, invoice number in the description, and the amount $330.00 AUD.

2. **Given** the customer completes payment using a valid card, **When** Stripe fires the `checkout.session.completed` webhook, **Then** `ProcessGatewayPayment` action runs: creates a `GatewayPayment` record with status `succeeded`, calls `RecordInvoicePayment::run()` which fires `InvoicePaymentReceived` event on the aggregate, creates an `InvoicePayment` record with `payment_method = 'card'` and `reference = 'pi_xxx'`, posts a journal entry (Dr Bank clearing account, Cr Accounts Receivable), and updates the invoice `amount_paid` and `amount_due`.

3. **Given** the invoice total is $1,000 and the customer chooses to pay $400 (partial payment), **When** payment succeeds, **Then** the invoice transitions to `partially_paid` with `amount_due = $600`, and the payment portal shows the remaining balance with a new "Pay Now" option.

4. **Given** the customer's card is declined, **When** Stripe returns a card error, **Then** the checkout page shows the error message from Stripe (e.g. "Your card was declined") and no payment or journal entry is recorded in MoneyQuest.

5. **Given** a webhook for `checkout.session.completed` is received but `ProcessGatewayPayment` has already processed this `stripe_event_id`, **When** the handler runs, **Then** it returns 200 OK without creating a duplicate payment (idempotency guard on `gateway_event_id` column).

6. **Given** the customer abandons the checkout page without paying, **When** the checkout session expires (30 minutes), **Then** the invoice remains in its current status, the `GatewayPayment` record (if created) stays in `pending` status, and no journal entry is created.

---

### US-4: Auto-Reconciliation of Gateway Payments [P1]

**As a** bookkeeper,
**I want** online payments to be automatically recorded and reconciled,
**so that** I never need to manually match a Stripe or GoCardless payment to an invoice.

**INVEST**: Independent (processes webhook events regardless of UI), Negotiable (clearing account vs direct bank account), Valuable (eliminates the manual reconciliation pain point), Estimable (extends existing `RecordInvoicePayment` action), Small (one action + one projector update), Testable (assert JE lines, payment record, and invoice status after webhook).

**Acceptance Scenarios**:

1. **Given** a Stripe payment of $500.00 succeeds for invoice INV-000042, **When** `ProcessGatewayPayment` runs, **Then** a journal entry is posted with two lines: Debit "Gateway Clearing - Stripe" (asset account, auto-created during gateway setup) $500.00, Credit "Accounts Receivable" $500.00.

2. **Given** the Stripe payout lands in the workspace's actual bank account 2 days later, **When** the bank feed imports the payout transaction, **Then** the bank reconciliation system (004-BFR) matches it against the gateway clearing account balance, and the bookkeeper confirms the match: Debit "Business Bank Account", Credit "Gateway Clearing - Stripe".

3. **Given** a GoCardless direct debit of $250.00 succeeds, **When** the `payments.paid` webhook fires, **Then** the same auto-record flow executes: JE posted (Dr Gateway Clearing - GoCardless, Cr Accounts Receivable), invoice payment recorded, invoice status updated.

4. **Given** an invoice has `amount_due = $300` and a gateway payment of $300 succeeds, **When** auto-reconciliation completes, **Then** the invoice transitions to `paid` status with `paid_at` set and `amount_due = 0`.

5. **Given** an invoice has `amount_due = $300` and a gateway payment of $100 succeeds (partial), **When** auto-reconciliation completes, **Then** the invoice transitions to `partially_paid` with `amount_due = $200`.

---

### US-5: Payment Settings -- Connect Gateways [P1]

**As a** workspace owner,
**I want** to connect my Stripe and GoCardless accounts from a settings page,
**so that** my invoices can accept online payments.

**INVEST**: Independent (settings page, no invoice dependency), Negotiable (wizard vs inline setup), Valuable (prerequisite for all online payments), Estimable (OAuth flows are documented by both providers), Small (one settings page + two OAuth flows), Testable (connection status persistence and disconnect flow).

**Acceptance Scenarios**:

1. **Given** a workspace owner navigates to Settings > Online Payments, **When** no gateways are connected, **Then** they see two cards: "Stripe -- Accept card payments" with a "Connect" button, and "GoCardless -- Accept direct debit payments" with a "Connect" button. Each card shows the provider logo, supported payment methods, and typical fees.

2. **Given** the owner clicks "Connect" on the Stripe card, **When** they complete the Stripe Connect Express onboarding (handled by 047-STP), **Then** they return to the settings page showing Stripe status as "Active", with options to "Disconnect" and configure fee handling.

3. **Given** the owner clicks "Connect" on the GoCardless card, **When** they are redirected to GoCardless OAuth and authorise MoneyQuest, **Then** a `PaymentGateway` record is created with `provider = 'gocardless'`, `status = 'active'`, and the GoCardless access token is encrypted and stored.

4. **Given** a gateway is connected, **When** the owner clicks "Disconnect", **Then** a confirmation modal warns "Existing unpaid invoices will no longer show online payment options. Pending payments will still be processed." and on confirmation, the gateway status is set to `disconnected` and `disconnected_at` is timestamped.

5. **Given** the workspace is on the Starter plan, **When** they navigate to Online Payments settings, **Then** they see a plan upgrade prompt: "Online payments are available on Professional and Enterprise plans" with an "Upgrade" CTA.

6. **Given** both Stripe and GoCardless are connected, **When** the owner configures default payment methods, **Then** they can set per-gateway defaults: "Show card payments on invoices" (toggle), "Show direct debit on invoices" (toggle), and a default selection for which method appears first on the payment portal.

---

### US-6: Payment Status on Invoice List [P1]

**As a** bookkeeper,
**I want** to see the payment status (unpaid, processing, paid, failed) on the invoice list,
**so that** I can quickly identify which invoices need attention.

**INVEST**: Independent (display-only, no gateway dependency), Negotiable (badge style), Valuable (visibility into payment pipeline), Estimable (one column + one enum), Small (frontend-only change + API resource field), Testable (assert badge renders for each status).

**Acceptance Scenarios**:

1. **Given** an invoice has been sent but no payment link has been viewed, **When** the invoice list renders, **Then** the payment status column shows a grey "Unpaid" badge.

2. **Given** a customer has viewed the payment link but not yet paid, **When** the invoice list renders, **Then** the payment status shows a blue "Viewed" badge with the view timestamp on hover.

3. **Given** a Stripe checkout session is in progress (created but not completed), **When** the invoice list renders, **Then** the payment status shows an amber "Processing" badge.

4. **Given** a gateway payment has succeeded and been recorded, **When** the invoice list renders, **Then** the payment status shows a green "Paid Online" badge (distinct from manually recorded "Paid").

5. **Given** a GoCardless direct debit failed (e.g. insufficient funds), **When** the invoice list renders, **Then** the payment status shows a red "Failed" badge with the failure reason on hover and a "Retry" action available.

---

### US-7: Pay Invoice by Direct Debit via GoCardless [P2]

**As a** customer with a recurring service relationship,
**I want** to set up a direct debit mandate and have invoices collected automatically,
**so that** I never miss a payment and the business gets paid on time.

**INVEST**: Independent (GoCardless-only, no Stripe dependency), Negotiable (mandate setup flow), Valuable (recurring revenue automation for service businesses), Estimable (GoCardless API is well-documented), Small (mandate creation + collection + webhook), Testable (GoCardless sandbox environment).

**Acceptance Scenarios**:

1. **Given** a customer clicks "Pay by Direct Debit" on the payment portal, **When** GoCardless has no existing mandate for this customer's email, **Then** they are redirected to GoCardless's hosted mandate setup page to enter their bank details (BSB + account number for AU BECS direct debit).

2. **Given** the customer completes mandate setup, **When** GoCardless confirms the mandate via `mandates.active` webhook, **Then** a `DirectDebitMandate` record is created linking the contact to the GoCardless mandate ID, and the original invoice payment is collected immediately against the new mandate.

3. **Given** a contact already has an active mandate, **When** they receive a new invoice and click "Pay by Direct Debit", **Then** payment is collected immediately against the existing mandate without requiring bank detail re-entry. The payment portal shows "Direct debit will be collected from your account ending in XX34 within 3 business days."

4. **Given** a direct debit collection is created, **When** GoCardless fires the `payments.confirmed` webhook (typically 3-5 business days for BECS), **Then** `ProcessGatewayPayment` runs the same auto-record flow as Stripe: `InvoicePayment` created, JE posted, invoice status updated.

5. **Given** a direct debit payment fails, **When** GoCardless fires the `payments.failed` webhook with reason `insufficient_funds`, **Then** the `GatewayPayment` status is set to `failed`, the invoice remains in its current status (no payment recorded), the workspace receives a notification "Direct debit failed for INV-000042: Insufficient funds", and the payment portal shows a "Retry Payment" option.

6. **Given** a customer wants to cancel their mandate, **When** they contact the business, **Then** the workspace owner can cancel the mandate from the contact detail page, which calls GoCardless API to cancel and sets `DirectDebitMandate.cancelled_at`.

---

### US-8: Payment Fee Handling [P2]

**As a** workspace owner,
**I want** to choose whether to absorb payment processing fees or pass them to the customer,
**so that** I can protect my margins on small invoices.

**INVEST**: Independent (configuration only), Negotiable (fixed vs percentage surcharge display), Valuable (margin protection for businesses), Estimable (fee calculation is arithmetic), Small (one setting + surcharge display + JE line), Testable (assert fee amounts in various scenarios).

**Acceptance Scenarios**:

1. **Given** the workspace has fee handling set to "Absorb fees" (default), **When** a customer pays a $100 invoice via Stripe (2.9% + $0.30 fee), **Then** the customer is charged $100.00, Stripe deducts $3.20 in fees, and the workspace receives $96.80. The `InvoicePayment` records $100.00 (the full invoice amount). The gateway fee of $3.20 is recorded as a separate JE: Debit "Payment Processing Fees" (expense), Credit "Gateway Clearing" account.

2. **Given** the workspace has fee handling set to "Pass to customer", **When** the payment portal loads for a $100 invoice, **Then** it shows: "Invoice amount: $100.00 | Card surcharge (2.9% + $0.30): $3.20 | Total to pay: $103.20". The customer is charged $103.20. The `InvoicePayment` records $100.00 (the invoice amount). The surcharge of $3.20 is recorded separately: Debit "Gateway Clearing", Credit "Payment Surcharge Revenue" (revenue account).

3. **Given** the workspace has fee handling set to "Pass to customer" and GoCardless is used (1% fee, capped at $5), **When** the payment portal shows direct debit option for a $200 invoice, **Then** it shows: "Invoice amount: $200.00 | Direct debit fee (1%): $2.00 | Total to pay: $202.00".

4. **Given** Australian Consumer Law requirements, **When** fee pass-through is enabled, **Then** the surcharge displayed must not exceed the actual cost of processing the payment. The system calculates the fee based on the gateway's published rate, not an arbitrary markup.

---

### US-9: Process Refund Through Gateway [P2]

**As a** bookkeeper,
**I want** to refund a payment through the original gateway and have a credit note auto-created,
**so that** both the ledger and the customer's bank account are corrected in one action.

**INVEST**: Independent (refund-only, no new payment flow), Negotiable (full vs partial refund), Valuable (eliminates manual refund + manual credit note), Estimable (Stripe/GoCardless refund APIs), Small (one action + one webhook handler), Testable (refund API call + credit note assertion).

**Acceptance Scenarios**:

1. **Given** an invoice was paid via Stripe and the bookkeeper clicks "Refund" on the payment, **When** they enter refund amount $50.00 (full or partial) and confirm, **Then** the system calls `Stripe::refund($payment_intent_id, $amount)`, creates a `GatewayPayment` record with type `refund` and status `pending`, and waits for the webhook confirmation.

2. **Given** Stripe confirms the refund via `charge.refunded` webhook, **When** `ProcessGatewayRefund` action runs, **Then** a credit note is auto-created against the original invoice (type `credit_note`, linked via `credit_note_for_uuid`), the credit note is auto-approved (posting reversing JE: Debit Accounts Receivable, Credit Gateway Clearing), and the credit note is auto-allocated against the original invoice (reducing `amount_paid`).

3. **Given** a partial refund of $50 on a $200 invoice that was fully paid, **When** the refund processes, **Then** the invoice transitions from `paid` back to `partially_paid` with `amount_due = $50`.

4. **Given** a GoCardless payment is refunded, **When** the bookkeeper initiates the refund, **Then** the same flow applies using GoCardless's refund API, and the funds are returned to the customer's bank account within 5-10 business days.

5. **Given** a refund fails at the gateway (e.g. charge too old for Stripe -- >90 days), **When** the API returns an error, **Then** the system shows the error message to the bookkeeper and suggests creating a manual credit note + recording a manual refund payment instead.

---

### US-10: Workspace Gateway Dashboard [P2]

**As a** workspace owner,
**I want** a dashboard showing online payment activity across all invoices,
**so that** I can monitor collection performance and identify issues.

**INVEST**: Independent (read-only reporting), Negotiable (chart types), Valuable (visibility into payment funnel), Estimable (aggregation queries), Small (one page + summary endpoint), Testable (assert calculated metrics).

**Acceptance Scenarios**:

1. **Given** the owner navigates to the Online Payments dashboard, **When** the page loads, **Then** they see summary cards: "Total collected this month" (sum of succeeded gateway payments), "Pending" (sum of processing payments), "Failed" (count and sum of failed payments), "Average time to pay" (median hours from invoice sent to payment received).

2. **Given** 100 invoices were sent with payment links this month, **When** 60 were viewed and 45 were paid online, **Then** the dashboard shows: "Link view rate: 60%", "Conversion rate: 75% of viewed / 45% of sent", "Online payment adoption: 45%".

3. **Given** there are failed payments, **When** the owner clicks the "Failed" card, **Then** they see a list of failed payments with invoice number, customer name, amount, failure reason, and a "Retry" or "Contact Customer" action.

---

## Functional Requirements

### Payment Links

- **FR-001**: System MUST generate a unique, cryptographically secure 64-character token for each payment link, URL pattern `/{workspace-slug}/pay/{token}`.
- **FR-002**: System MUST auto-generate a payment link when an invoice is sent (status transition to `sent`), reusing existing links on resend.
- **FR-003**: Payment links MUST expire after 90 days. Expired links show an informational message, not an error.
- **FR-004**: Payment links MUST be deactivated when the invoice is voided or fully paid.
- **FR-005**: System MUST track `viewed_at` (first view timestamp) and `view_count` on each payment link.

### Payment Portal

- **FR-006**: The payment portal MUST be a public page requiring no authentication.
- **FR-007**: The portal MUST display workspace branding (business name, logo) and invoice details (number, dates, contact, line items, totals, amount due).
- **FR-008**: The portal MUST support custom payment amounts for partial payments, with a minimum of $1.00 (100 cents) and a maximum of the `amount_due`.
- **FR-009**: The portal MUST show available payment methods based on connected and active gateways.
- **FR-010**: The portal MUST display a success confirmation after payment with receipt download option.

### Stripe Integration

- **FR-011**: System MUST create Stripe Checkout Sessions using the workspace's connected Stripe account (via 047-STP Connect Express).
- **FR-012**: Checkout sessions MUST include `application_fee_amount` for platform commission (configurable, default 1.5% / 150 basis points).
- **FR-013**: System MUST handle `checkout.session.completed` webhook to trigger payment recording.
- **FR-014**: System MUST handle `payment_intent.payment_failed` webhook to update `GatewayPayment` status to `failed`.
- **FR-015**: System MUST store `stripe_event_id` (Stripe webhook event ID) on all processed webhook events for idempotent handling. Duplicate events return 200 OK with no side effects.
- **FR-016**: System MUST handle `charge.refunded` webhook to process refunds.
- **FR-017**: System MUST handle `charge.dispute.created` and `charge.dispute.closed` webhooks to track disputes.
- **FR-018**: Checkout session timeout MUST be 30 minutes.

### GoCardless Integration

- **FR-019**: System MUST support GoCardless OAuth connection for workspace authorisation.
- **FR-020**: System MUST create GoCardless redirect flows for mandate setup, collecting customer bank details via GoCardless hosted pages.
- **FR-021**: System MUST support BECS (AU direct debit) scheme.
- **FR-022**: System MUST handle `mandates.active` webhook to confirm mandate activation.
- **FR-023**: System MUST handle `payments.confirmed` and `payments.paid_out` webhooks to trigger payment recording.
- **FR-024**: System MUST handle `payments.failed` webhook with failure reason and update `GatewayPayment` status.
- **FR-025**: System MUST support mandate cancellation via API from the contact detail page.
- **FR-026**: For contacts with an active mandate, the payment portal MUST offer one-click collection without re-entering bank details.

### Auto-Reconciliation

- **FR-027**: System MUST call `RecordInvoicePayment::run()` for every confirmed gateway payment, flowing through the existing `InvoiceAggregate::recordPayment()` event sourcing pipeline.
- **FR-028**: System MUST post journal entries for gateway payments: Debit "Gateway Clearing - {Provider}" (auto-created asset account), Credit "Accounts Receivable".
- **FR-029**: When gateway fees are absorbed, system MUST post a separate JE: Debit "Payment Processing Fees" (expense), Credit "Gateway Clearing - {Provider}".
- **FR-030**: System MUST update invoice `amount_paid`, `amount_due`, and `status` (to `partially_paid` or `paid`) as part of the event sourcing flow.
- **FR-031**: System MUST trigger `SendPaymentConfirmationEmail` after successful payment recording.
- **FR-032**: System MUST create the gateway clearing account in the Chart of Accounts during gateway connection setup if it does not already exist.

### Refunds

- **FR-033**: System MUST support full and partial refunds through both Stripe and GoCardless APIs.
- **FR-034**: On confirmed refund, system MUST auto-create a credit note against the original invoice using the existing 025-CRN credit note flow.
- **FR-035**: The auto-created credit note MUST be auto-approved (posting reversing JE) and auto-allocated against the original invoice.
- **FR-036**: If the refund causes invoice `amount_due` to increase above zero, the invoice MUST transition back to `partially_paid`.
- **FR-037**: System MUST handle refund failures gracefully, showing the gateway error and suggesting manual credit note creation.

### Fee Handling

- **FR-038**: System MUST support two fee modes per workspace: "Absorb" (default) and "Pass to customer".
- **FR-039**: In "Pass to customer" mode, the payment portal MUST display the surcharge amount and total to pay, calculated from the gateway's published fee schedule.
- **FR-040**: Surcharges MUST comply with Australian Consumer Law (cannot exceed actual processing cost).
- **FR-041**: Surcharge amounts MUST be recorded separately from the invoice payment -- they are not part of the invoice total.

### Payment Status

- **FR-042**: System MUST track gateway payment status as an enum: `pending`, `processing`, `succeeded`, `failed`, `disputed`, `refunded`.
- **FR-043**: Invoice API resource MUST include a `payment_gateway_status` field derived from the latest `GatewayPayment` record.
- **FR-044**: Invoice list page MUST display payment status badges (Unpaid, Viewed, Processing, Paid Online, Failed).

### Settings & Configuration

- **FR-045**: Payment settings page MUST allow connecting and disconnecting Stripe and GoCardless.
- **FR-046**: Payment settings MUST allow configuring fee handling mode (absorb/pass-through) per gateway.
- **FR-047**: Payment settings MUST allow configuring default payment methods shown on the portal.
- **FR-048**: Payment settings MUST allow configuring platform commission rate (for future per-tenant overrides; v1 uses platform default).
- **FR-049**: Online payments feature MUST be gated to Professional+ plans via Laravel Pennant `online_payments` flag.

### Security

- **FR-050**: Payment link tokens MUST be generated using `Str::random(64)` or equivalent CSPRNG.
- **FR-051**: All gateway API keys and tokens MUST be encrypted at rest using Laravel's `encrypted` cast.
- **FR-052**: Stripe webhook signatures MUST be verified using `stripe-signature` header.
- **FR-053**: GoCardless webhook signatures MUST be verified using HMAC-SHA256.
- **FR-054**: The payment portal MUST not expose any internal IDs (workspace_id, invoice_id) -- only the token.
- **FR-055**: Rate limiting MUST be applied to the payment portal: 30 requests per minute per IP.

---

## Key Entities

### PaymentGateway (tenant-scoped, new)

| Field | Type | Description |
|-------|------|-------------|
| id | bigint | PK |
| uuid | uuid | Public identifier |
| workspace_id | int | FK to workspaces, tenant scope |
| provider | enum | `stripe`, `gocardless` |
| external_account_id | string | Stripe account ID or GoCardless organisation ID |
| status | enum | `pending`, `active`, `restricted`, `disconnected` |
| access_token | encrypted text | GoCardless OAuth token (null for Stripe -- uses Connect) |
| config | json | Provider-specific settings (fee mode, default methods, etc.) |
| fee_mode | enum | `absorb`, `pass_to_customer` (default: `absorb`) |
| connected_at | datetime | When gateway was connected |
| disconnected_at | datetime | Nullable, when gateway was disconnected |
| created_at | datetime | |
| updated_at | datetime | |

### PaymentLink (tenant-scoped, new)

| Field | Type | Description |
|-------|------|-------------|
| id | bigint | PK |
| workspace_id | int | FK to workspaces, tenant scope |
| invoice_id | int | FK to invoices |
| token | string(64) | Unique URL token (indexed) |
| url | string | Full payment URL |
| expires_at | datetime | 90 days from creation |
| viewed_at | datetime | Nullable, first view timestamp |
| view_count | int | Number of views (default 0) |
| deactivated_at | datetime | Nullable, set when invoice voided/paid |
| created_at | datetime | |
| updated_at | datetime | |

### GatewayPayment (tenant-scoped, new)

| Field | Type | Description |
|-------|------|-------------|
| id | bigint | PK |
| uuid | uuid | Public identifier |
| workspace_id | int | FK to workspaces, tenant scope |
| invoice_id | int | FK to invoices |
| payment_gateway_id | int | FK to payment_gateways |
| type | enum | `payment`, `refund` |
| external_session_id | string | Stripe checkout session ID or GoCardless payment ID |
| external_payment_id | string | Stripe payment intent ID or GoCardless payment ID |
| external_charge_id | string | Nullable, Stripe charge ID |
| gateway_event_id | string | Webhook event ID for idempotency (unique index) |
| amount | int | Payment amount in cents |
| fee_amount | int | Gateway processing fee in cents |
| surcharge_amount | int | Surcharge passed to customer in cents (0 if absorbed) |
| net_amount | int | Amount after fees in cents |
| currency | string(3) | ISO currency code |
| status | enum | `pending`, `processing`, `succeeded`, `failed`, `disputed`, `refunded` |
| failure_reason | string | Nullable, gateway error message |
| dispute_status | enum | Nullable, `needs_response`, `under_review`, `won`, `lost` |
| invoice_payment_id | int | Nullable FK to invoice_payments (set after auto-record) |
| journal_entry_id | int | Nullable FK to journal_entries |
| paid_at | datetime | Nullable, when payment confirmed |
| refunded_at | datetime | Nullable, when refund confirmed |
| metadata | json | Full gateway response payload for audit |
| created_at | datetime | |
| updated_at | datetime | |

### DirectDebitMandate (tenant-scoped, new)

| Field | Type | Description |
|-------|------|-------------|
| id | bigint | PK |
| uuid | uuid | Public identifier |
| workspace_id | int | FK to workspaces, tenant scope |
| contact_id | int | FK to contacts |
| payment_gateway_id | int | FK to payment_gateways (GoCardless) |
| external_mandate_id | string | GoCardless mandate ID |
| scheme | enum | `becs`, `bacs`, `sepa`, `ach` (v1: `becs` only) |
| status | enum | `pending`, `active`, `failed`, `cancelled`, `expired` |
| bank_account_last4 | string(4) | Last 4 digits of bank account for display |
| authorised_at | datetime | Nullable, when mandate became active |
| cancelled_at | datetime | Nullable |
| created_at | datetime | |
| updated_at | datetime | |

### Chart of Accounts -- Auto-Created Accounts

| Account | Type | Code | Purpose |
|---------|------|------|---------|
| Gateway Clearing - Stripe | Asset (Current) | 1060 | Holds funds between gateway charge and bank payout |
| Gateway Clearing - GoCardless | Asset (Current) | 1061 | Holds funds between DD collection and bank payout |
| Payment Processing Fees | Expense | 6200 | Gateway fees when absorbed by workspace |
| Payment Surcharge Revenue | Revenue | 4200 | Surcharges passed to customers |

---

## Edge Cases

### Payment Timing Conflicts

- **Simultaneous online and manual payment**: If a customer pays online while the bookkeeper also records a manual payment for the same invoice, the `InvoiceAggregate::guardNoOverpayment()` guard prevents overpayment. The second payment (whichever arrives last) will be rejected with "Payment exceeds remaining balance." The bookkeeper sees the online payment already recorded and can void the manual one.

- **Invoice voided during checkout**: If an invoice is voided while a customer has an active Stripe checkout session, the checkout session is expired via `Stripe::checkoutSessions()->expire($session_id)`. If payment completes before expiry (race condition), the system auto-refunds the payment via Stripe Refund API and logs a warning.

- **Payment link viewed after invoice paid manually**: The payment portal shows "This invoice has been paid in full. Thank you!" -- no payment action available.

### Gateway-Specific Edge Cases

- **Stripe payout failure**: When a Stripe payout to the workspace's bank fails, the funds remain in the Stripe Connect account. The workspace receives a notification. The gateway clearing account retains the balance until the payout succeeds or the workspace updates bank details in Stripe Express dashboard.

- **GoCardless mandate failure**: If a BECS mandate setup fails (invalid BSB, closed account), GoCardless fires `mandates.failed` webhook. The customer sees an error on the mandate setup page and can retry with different bank details.

- **GoCardless payment timing**: BECS direct debits take 3-5 business days to confirm. During this window, the payment shows as "Processing" on the invoice. The JE is only posted when `payments.confirmed` fires -- never on initiation.

- **Chargeback / dispute**: Stripe fires `charge.dispute.created`. The `GatewayPayment` status is set to `disputed`. If the dispute is lost (`charge.dispute.closed` with status `lost`), the system reverses the original payment by creating a credit note and allocating it against the invoice, restoring `amount_due`. The workspace is notified with dispute details.

### Idempotency & Reliability

- **Webhook delivery failure**: Both Stripe and GoCardless retry webhooks with exponential backoff (up to 3 days). The `gateway_event_id` unique index ensures no duplicate processing.

- **Webhook processing failure**: If `ProcessGatewayPayment` fails (e.g. database error), the webhook returns 500, triggering a retry. The job is also queued with 3 retries and exponential backoff.

- **Out-of-order webhooks**: Stripe may deliver `payment_intent.succeeded` before `checkout.session.completed`. The system handles both events and uses the `gateway_event_id` idempotency key to ensure only one payment record is created regardless of event order.

### Financial Edge Cases

- **Refund exceeds current balance in clearing account**: If a refund is processed after the clearing account has been reconciled to zero (payout already matched), the clearing account goes negative. This is correct accounting -- the clearing account will be replenished when the refund amount is deducted from the next payout.

- **Multi-currency considerations (P3)**: In v1, payments are processed in the workspace's base currency only. If an invoice is in a different currency, the payment portal displays an error: "Online payments are not available for foreign currency invoices." This is a known limitation addressed in P3.

- **Fee calculation precision**: Gateway fees are calculated to the cent. Stripe's 2.9% + $0.30 on a $10.00 payment is $0.59 (29 cents + 30 cents). Amounts are always integers (cents) to avoid floating-point errors.

---

## Non-Functional Requirements

- **NFR-001**: Payment portal page load time MUST be under 2 seconds (measured at P95).
- **NFR-002**: Webhook processing (receipt to JE posted) MUST complete within 5 seconds.
- **NFR-003**: System MUST handle 100+ concurrent webhook events without data loss.
- **NFR-004**: All gateway credentials MUST be encrypted at rest and never logged.
- **NFR-005**: Payment portal MUST be responsive (mobile-first) -- 60%+ of invoice payments happen on mobile.
- **NFR-006**: System MUST maintain PCI-DSS compliance by never handling raw card numbers -- all card data stays within Stripe's hosted checkout.

---

## Dependencies

| Direction | Epic | Relationship |
|-----------|------|-------------|
| **Depends on** | 005-IAR Invoicing & AR/AP | Invoice model, InvoicePayment, InvoiceAggregate, RecordInvoicePayment action |
| **Depends on** | 025-CRN Credit Notes | Credit note auto-creation for refunds |
| **Depends on** | 047-STP Stripe Connect | Stripe Connect Express onboarding (account connection) |
| **Depends on** | 023-EML Email Infrastructure | Payment confirmation emails, payment failure notifications |
| **Depends on** | 088-IPT Invoice PDF Templates | Invoice rendering on payment portal |
| **Related** | 004-BFR Bank Feeds & Reconciliation | Gateway payout matching against bank feed transactions |
| **Related** | 090-APR Automated Payment Reminders | Reminders can include "Pay Now" link |
| **Related** | 009-BIL Billing & Monetisation | Feature gating (Professional+ plan) |
| **Blocks** | 022-CPV Client Portal | Payment portal is the first public-facing client experience |

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Online payment from invoice completed in under 3 clicks / 60 seconds for the customer.
- **SC-002**: Auto-reconciliation accuracy > 99% (gateway payment to JE without manual intervention).
- **SC-003**: Payment notification to business within 60 seconds of gateway confirmation.
- **SC-004**: DSO reduction of 30%+ for workspaces using online payments vs. manual-only.
- **SC-005**: Payment link view-to-pay conversion rate > 60%.
- **SC-006**: Zero duplicate payments from webhook retries (idempotency verified by integration tests).
- **SC-007**: 40%+ of Professional/Enterprise workspaces connect at least one gateway within 6 months.
- **SC-008**: Payment portal page load time < 2 seconds at P95.

### Test Coverage Targets

- Unit tests: Actions, fee calculations, token generation, status transitions (30+ tests)
- Feature tests: API endpoints, webhook handlers, idempotency, auth/permission checks (40+ tests)
- Browser tests: Payment portal flow, settings page, invoice list badges (15+ tests)
- Integration tests: Stripe test mode end-to-end, GoCardless sandbox end-to-end (10+ tests)

---

## Clarifications

### Session 2026-04-01

- Q: Should the payment portal use Stripe's hosted checkout or embedded payment elements? A: Stripe hosted checkout for v1. PCI-compliant out of the box, supports Apple Pay/Google Pay natively, and requires no PCI SAQ. Embedded elements can be added in P3 for a more branded experience.
- Q: Should gateway clearing accounts be auto-created or manually configured? A: Auto-created during gateway connection setup. The system creates the clearing account in the Chart of Accounts with a default code. The bookkeeper can rename it but cannot delete it while the gateway is connected.
- Q: How should the journal entry differ from manual payment recording? A: Manual payments debit the workspace's bank account directly (Dr Bank, Cr AR). Gateway payments debit a clearing account (Dr Gateway Clearing, Cr AR) because the funds don't arrive in the bank immediately. The clearing account is reconciled when the Stripe/GoCardless payout hits the bank feed.
- Q: Should refunds auto-create credit notes or use a separate refund mechanism? A: Auto-create credit notes using the existing 025-CRN infrastructure. This keeps the ledger consistent -- every revenue reversal flows through the same credit note pipeline. The credit note is auto-approved and auto-allocated so the bookkeeper sees the refund already processed.
- Q: What happens to online payments if the workspace downgrades from Professional to Starter? A: Historical gateway payment data remains visible (read-only). Gateways are disconnected. Existing pending payments are still processed (webhooks still handled). New payment links are not generated. If they upgrade again, they reconnect without losing history.
- Q: Should webhook processing be synchronous or queued? A: Queued via Laravel's job queue. Webhook endpoints return 200 immediately after signature verification and event deduplication check. The `ProcessGatewayPayment` job processes asynchronously with 3 retries and exponential backoff. Failed jobs alert via the existing notification infrastructure.

### Session 2026-04-01 -- Ambiguity Scan Decisions

#### 1. Stripe Connect vs Direct Integration (Integration)
**Gap**: Spec references 047-STP for Stripe Connect Express onboarding but 047-STP does not exist in the codebase yet. No Stripe Connect code, no `stripe_account_id` on Workspace, no Connect OAuth flow.
**Decision**: `PaymentGateway` model stores the `external_account_id` (Stripe Connected Account ID, e.g. `acca_xxx`). This epic builds a minimal Connect Express onboarding action (`ConnectStripeAccount`) that redirects the owner to Stripe's hosted onboarding and handles the OAuth callback. The 047-STP dependency is treated as "built inline" within P1 of this epic -- not as a separate prerequisite. If 047-STP is later built with richer Connect features (dashboard embedding, payout scheduling), it consumes the same `PaymentGateway` record.

#### 2. PaymentMethod Enum Extension (Domain & Data Model)
**Gap**: The existing `PaymentMethod` enum has `card` but no `direct_debit` case. GoCardless payments need a new enum value.
**Decision**: Add `DirectDebit = 'direct_debit'` to the `PaymentMethod` enum. The `InvoicePayment.payment_method` field already stores a string, so this is backward-compatible. No migration needed -- just the enum case addition.

#### 3. `recordedBy` for System-Initiated Payments (Functional Scope)
**Gap**: `RecordInvoicePayment::handle()` requires `int $recordedBy` (a user ID). Webhook-initiated payments have no authenticated user.
**Decision**: Use a sentinel value. Create a constant `RecordInvoicePayment::SYSTEM_USER_ID = 0`. The projector stores `recorded_by = 0` for gateway-initiated payments. The UI displays "Online Payment" instead of a user name when `recorded_by === 0`. This avoids creating a fake User record or making the field nullable (which would break existing code).

#### 4. Payment Portal Route Structure (Functional Scope)
**Gap**: The spec says `/{workspace-slug}/pay/{token}` but the Next.js app is a separate SPA at a different domain/port. The payment portal is public (no auth). How does this route work?
**Decision**: The payment portal is a Next.js page at `frontend/src/app/(public)/[slug]/pay/[token]/page.tsx`. It is a Server Component that fetches invoice data from a new public API endpoint `GET /api/v1/public/payment-links/{token}` (no auth required, rate-limited at 30 req/min per IP). The `[slug]` param is validated against the `PaymentLink`'s workspace slug server-side. No Sanctum cookies needed -- the API endpoint is outside the `auth:sanctum` middleware group.

#### 5. Webhook Endpoint Authentication & Routing (Integration)
**Gap**: Spec mentions webhook signature verification but does not specify the route structure or how webhooks are routed per workspace.
**Decision**: Two webhook endpoints, both outside auth middleware: `POST /api/webhooks/stripe` and `POST /api/webhooks/gocardless`. These are global (not per-workspace). The workspace is resolved from the `GatewayPayment` record (looked up via `external_session_id` or `external_payment_id` from the webhook payload). Stripe webhooks use a single platform-level webhook secret (`STRIPE_WEBHOOK_SECRET` env var) verified via `Stripe\Webhook::constructEvent()`. GoCardless uses `GOCARDLESS_WEBHOOK_SECRET` with HMAC-SHA256 verification.

#### 6. Idempotency Key Column Scope (Edge Cases)
**Gap**: The spec says `gateway_event_id` is a unique index for idempotency, but does not clarify whether uniqueness is per-workspace or global.
**Decision**: `gateway_event_id` is globally unique (not scoped to `workspace_id`). Stripe event IDs (`evt_xxx`) and GoCardless event IDs are globally unique by design. A single unique index on `gateway_event_id` is sufficient. The `ProcessGatewayPayment` action does a `GatewayPayment::where('gateway_event_id', $eventId)->exists()` check before processing.

#### 7. Currency Mismatch Handling (Domain & Data Model)
**Gap**: Spec says P3 handles multi-currency but does not define what happens if a workspace's base currency differs from the invoice currency in P1. The `GatewayPayment.currency` field exists but no conversion logic is specified.
**Decision**: P1 enforces same-currency only. The `CreateCheckoutSession` action validates `$invoice->currency === $workspace->base_currency`. If they differ, the API returns 422 with message "Online payments are only available for invoices in your base currency ({currency}). Multi-currency online payments are coming soon." The payment portal hides the "Pay Now" button for foreign-currency invoices and shows the bank transfer fallback.

#### 8. Fee Calculation Precision & Source of Truth (Non-Functional)
**Gap**: Spec says "calculated from the gateway's published fee schedule" for pass-through surcharges, but fee schedules vary by country, card type, and Stripe plan. Where does the fee rate come from?
**Decision**: Store configurable fee rates on the `PaymentGateway.config` JSON column. Defaults: Stripe `{"card_rate_bps": 290, "card_fixed_cents": 30}` (2.9% + $0.30), GoCardless `{"dd_rate_bps": 100, "dd_cap_cents": 500}` (1% capped at $5). The workspace owner can adjust these in payment settings to match their actual Stripe/GoCardless pricing. Surcharge is calculated at checkout-session creation time, stored on `GatewayPayment.surcharge_amount`, and displayed to the customer. All arithmetic uses integer cents -- e.g., `surcharge = (amount * card_rate_bps / 10000) + card_fixed_cents`, with standard rounding.

#### 9. Gateway Clearing Account Auto-Creation -- Account Codes (Domain & Data Model)
**Gap**: Spec lists fixed account codes (1060, 1061, 6200, 4200) but CoA templates use various numbering schemes. What if those codes are already taken?
**Decision**: The auto-creation action (`CreateGatewayClearingAccounts`) checks if the code is already in use. If taken, it appends a suffix (e.g., `1060-S` for Stripe, `1060-GC` for GoCardless). The accounts are created with `is_system = true` so they cannot be deleted while the gateway is connected. The account name is the canonical identifier, not the code -- bookkeepers can rename codes but not delete system accounts (enforced by existing `ChartAccountPolicy::update()` guard on `is_system`).

#### 10. Payment Portal Branding Data (Functional Scope)
**Gap**: Spec says the portal shows "workspace business name and logo" but does not specify how branding data reaches the public page without auth.
**Decision**: The public API endpoint `GET /api/v1/public/payment-links/{token}` returns a response payload that includes workspace branding fields: `business_name`, `logo_url` (a public S3 URL or null), and `primary_color` (hex, nullable). These are read from the `Workspace` and `Organisation` models. No sensitive data (IDs, emails, internal settings) is exposed. The response is cached for 5 minutes at the API level (`Cache::remember`) since branding rarely changes.

#### 11. Refund Flow -- Who Can Initiate? (User Journeys)
**Gap**: US-9 says "the bookkeeper clicks Refund" but does not specify which roles can initiate refunds, or whether a new permission is needed.
**Decision**: Refunds require the existing `invoice.void` permission (reused, since refunds are a form of revenue reversal). Roles with this permission: `owner`, `accountant`. Bookkeepers and approvers cannot initiate gateway refunds. No new permission is added -- this aligns with the principle that bookkeepers create/submit and accountants/owners approve/reverse.

#### 12. Webhook Failure Alerting (Non-Functional)
**Gap**: Spec says "failed jobs alert via existing notification infrastructure" but does not specify the notification channel or recipient.
**Decision**: Failed `ProcessGatewayPayment` jobs (after all 3 retries exhausted) create an in-app notification (`type = 'payment_webhook_failed'`) for all workspace users with the `owner` or `accountant` role. The notification includes the invoice number, gateway name, amount, and failure reason. No email notification for webhook failures -- the in-app notification + the existing failed-jobs monitoring is sufficient for P1.

#### 13. Payment Link Deactivation on Full Payment (Completion Signals)
**Gap**: FR-004 says deactivate when "fully paid" but `RecordInvoicePayment` does not currently touch payment links. Who deactivates?
**Decision**: The `InvoiceProjector` (which already handles `InvoicePaymentReceived` events) gains a new side-effect: when the invoice transitions to `paid` status, it sets `deactivated_at` on the associated `PaymentLink`. Similarly, the `InvoiceVoided` event handler deactivates the link. This keeps the logic in the projector (single source of truth for read model updates) rather than scattering it across actions.

#### 14. Checkout Session Metadata for Workspace Resolution (Integration)
**Gap**: Spec says webhook handlers resolve workspace from `GatewayPayment.workspace_id` but for Stripe, the `GatewayPayment` record must exist before the webhook arrives. When is it created?
**Decision**: The `GatewayPayment` record is created with status `pending` when the checkout session is created (before the customer pays). The `CreateCheckoutSession` action creates the record with `external_session_id`, `workspace_id`, `invoice_id`, and `amount`. When the `checkout.session.completed` webhook arrives, the handler looks up `GatewayPayment::where('external_session_id', $sessionId)->first()`, updates the status to `succeeded`, sets `gateway_event_id`, and proceeds with `RecordInvoicePayment`. This also handles the case where Stripe delivers `payment_intent.succeeded` -- we look up by `external_payment_id` instead.

#### 15. Abandoned Checkout Session Cleanup (Edge Cases)
**Gap**: Spec says abandoned sessions leave `GatewayPayment` in `pending` status, but does not say how these are cleaned up.
**Decision**: A scheduled artisan command `payments:cleanup-stale` runs daily and sets `GatewayPayment` records with status `pending` and `created_at` older than 48 hours to status `expired`. This is a read-model cleanup only -- no financial impact, no events. The command is registered in `routes/console.php` alongside existing scheduled commands.

#### 16. Invoice Voided During Active Checkout -- Race Condition (Edge Cases)
**Gap**: Spec mentions expiring the Stripe session if invoice is voided, but does not specify where this logic lives.
**Decision**: The `InvoiceVoided` event handler in the projector checks for any `GatewayPayment` records with status `pending` or `processing` for that invoice. If found, it dispatches a `ExpireCheckoutSession` job that calls `Stripe\Checkout\Session::expire()`. If the payment already completed (race condition), the webhook handler detects the voided invoice status when calling `RecordInvoicePayment` -- the aggregate's `isPayable()` guard will reject it. The `ProcessGatewayPayment` action then auto-refunds via Stripe Refund API and logs a `payment_auto_refunded` notification.

#### 17. GoCardless Payment Initiation Timing (User Journeys)
**Gap**: For GoCardless with an existing mandate, the spec says "payment is collected immediately" but does not clarify whether a `GatewayPayment` record is created at initiation or only on webhook confirmation.
**Decision**: Same pattern as Stripe. When the customer clicks "Pay by Direct Debit" and has an active mandate, `CreateDirectDebitPayment` action calls GoCardless API to create the payment, then creates a `GatewayPayment` record with status `processing` (not `pending`, because GoCardless payments are initiated server-side unlike Stripe where the customer drives checkout). The JE is only posted when `payments.confirmed` webhook arrives (status transitions to `succeeded`). The payment portal shows "Payment initiated -- your account will be debited within 3-5 business days."

#### 18. Platform Commission Accounting (Domain & Data Model)
**Gap**: FR-012 mentions `application_fee_amount` for platform commission (1.5%) but does not specify how this is recorded in the workspace's ledger.
**Decision**: Platform commission is invisible to the workspace's ledger. The `application_fee_amount` is deducted by Stripe before funds reach the connected account. From the workspace's perspective, the fee they see is the net processing fee (Stripe's standard rate). The `GatewayPayment.fee_amount` stores only the gateway processing fee that the workspace bears, not the platform commission. Platform commission revenue is tracked in the central (non-tenant) database for MoneyQuest's own accounting -- a separate concern outside this epic.

#### 19. Payment Portal -- Partial Payment Minimum Validation (Edge Cases)
**Gap**: FR-008 says minimum $1.00 (100 cents), but what if the remaining `amount_due` is less than $1.00 (e.g., $0.50 remaining)?
**Decision**: If `amount_due < 100` cents, the minimum is set to `amount_due` itself. The customer cannot pay less than the full remaining balance when it is under $1.00. The validation rule is `min(100, amount_due)`. This prevents a scenario where a $0.50 balance can never be paid online.

#### 20. Disconnect Gateway -- Pending Payment Handling (Edge Cases)
**Gap**: US-5 AC-4 warns about pending payments on disconnect, but does not specify whether webhooks are still processed.
**Decision**: Disconnecting a gateway sets `PaymentGateway.status = 'disconnected'` but does NOT delete the record or revoke webhook endpoints. Webhooks for the disconnected gateway are still processed -- the `ProcessGatewayPayment` action checks `GatewayPayment` existence (not gateway status) for payment recording. New payment links will not show the disconnected gateway's payment method. This ensures in-flight payments complete successfully. The webhook secret remains valid until the workspace owner revokes it from the Stripe/GoCardless dashboard directly.

#### 21. Surcharge Journal Entry -- Pass-Through Mode (Domain & Data Model)
**Gap**: US-8 AC-2 says surcharge is recorded as "Payment Surcharge Revenue" but the customer is charged `invoice_amount + surcharge`. The `InvoicePayment` records only the invoice amount. Where is the surcharge JE posted from?
**Decision**: The `ProcessGatewayPayment` action posts two JEs when surcharge > 0: (1) The standard payment JE: Dr Gateway Clearing, Cr Accounts Receivable for the invoice amount. (2) A surcharge JE: Dr Gateway Clearing, Cr Payment Surcharge Revenue for the surcharge amount. The total debit to Gateway Clearing equals the amount charged to the customer. When Stripe pays out, the clearing account nets to zero. The surcharge is not part of the `InvoicePayment.amount` -- it is a separate revenue item.
