---
title: "Feature Specification: Stripe Payments & Connect"
---

# Feature Specification: Stripe Payments & Connect

**Feature Branch**: `047-STP-stripe-payments-connect`
**Created**: 2026-03-19
**Status**: Draft
**Epic**: 047-STP
**Initiative**: FL — Financial Ledger Platform
**Effort**: L (4 sprints)
**Depends On**: 009-BIL (complete), 005-IAR (complete), 004-BFR (complete)

### Out of Scope

- **Multi-gateway support** — v1 is Stripe-only. PayPal, GoCardless, or other gateways deferred to v2
- **Stripe Connect Standard/Custom** — v1 uses Express accounts only. Standard or Custom account types deferred
- **Customer-initiated recurring card payments** — v1 supports one-off invoice payments only. Saved cards and autopay deferred
- **Stripe Tax automatic calculation** — v1 validates ABNs for GST reverse charge but does not use Stripe Tax for automatic tax calculation
- **Multi-currency payment processing** — v1 processes payments in the tenant's base currency only
- **Refund processing via MoneyQuest** — refunds are handled directly in the Stripe dashboard; MoneyQuest reflects the status via webhook
- **Custom checkout branding** — v1 uses Stripe's default hosted checkout. Tenant-branded checkout deferred

---

## Overview

MoneyQuest has subscription billing infrastructure (009-BIL) using Laravel Cashier for platform subscriptions. This epic adds two capabilities: Stripe Connect (Express) so tenants can accept online invoice payments from their customers, and platform billing enhancements including 14-day free trial flow, ABN validation for GST, dunning UX, and upgrade/downgrade flows. Together these turn MoneyQuest from a tool that tracks payments into a tool that *processes* payments — a significant value-add that increases stickiness and generates transaction-based revenue.

---

## User Scenarios & Testing

### User Story 1 — Tenant Stripe Express Onboarding (Priority: P1)

A tenant wants to enable "Pay Online" on their invoices so their customers can pay with card or bank transfer directly from the invoice email or customer portal. Today the tenant sends invoices with bank details for manual payment, then has to wait and manually reconcile when funds arrive. Stripe Connect Express lets them flip a switch and start accepting online payments — Stripe handles all the KYC/identity verification.

**Why this priority**: Without Stripe Connect onboarding, no online payments are possible. This is the gateway to all transaction-based revenue and the core value proposition of this epic. Every other payment story depends on a connected Express account being in place.

**Independent Test**: Can be tested entirely in Stripe test mode. Create a test tenant, verify the Express account creation API call, simulate the onboarding redirect and return webhook, and confirm the account status is persisted correctly in the database.

**Acceptance Scenarios**:

1. **Given** a tenant navigates to Settings > Online Payments, **When** they click "Enable Online Payments", **Then** they are redirected to Stripe's Express onboarding flow to complete identity verification and bank account setup.

2. **Given** Stripe Express onboarding is completed, **When** the tenant returns to MoneyQuest via the redirect URL, **Then** their online payments status shows "Active" and all future invoices include a "Pay Online" option.

3. **Given** a tenant's Express account has verification issues, **When** Stripe requires additional info (via `account.updated` webhook with `requirements.currently_due`), **Then** MoneyQuest shows a banner linking to the Stripe Express dashboard to complete verification.

4. **Given** a tenant wants to disconnect, **When** they click "Disable Online Payments", **Then** existing unpaid invoices lose the "Pay Online" option and no new payments are processed through Connect.

5. **Given** a tenant on the Starter plan attempts to enable online payments, **When** the feature is gated to Professional+, **Then** they see an upgrade prompt instead of the onboarding flow.

---

### User Story 2 — Customer Pays Invoice Online (Priority: P1)

A customer receives an invoice email with a "Pay Now" button. They click it and pay via Stripe-hosted checkout. The payment is automatically recorded in MoneyQuest — no manual reconciliation needed. This is the end-to-end flow that delivers the value promised by Connect onboarding.

**Why this priority**: This is the end-user experience that makes online payments valuable. Without the payment flow, Connect onboarding has no payoff. This story also generates the platform's transaction-based revenue via configurable commission.

**Independent Test**: Can be tested in Stripe test mode with a test invoice. Create an invoice, generate the checkout session, use Stripe test card numbers to complete payment, and verify the webhook triggers payment recording and journal entry posting.

**Acceptance Scenarios**:

1. **Given** an invoice with "Pay Online" enabled is sent, **When** the customer clicks "Pay Now" in the email, **Then** they are taken to a Stripe-hosted checkout page showing the invoice amount, tenant's business name, and available payment methods.

2. **Given** the customer completes payment, **When** Stripe confirms the charge via `checkout.session.completed` webhook, **Then** MoneyQuest automatically records the payment against the invoice, posts the journal entry (Dr Bank, Cr Accounts Receivable), and updates the invoice status.

3. **Given** the platform commission is 1.5%, **When** a $1,000 payment is processed, **Then** $15 is retained by the platform via `application_fee_amount`, and $985 minus Stripe processing fees settles to the tenant's connected bank account.

4. **Given** a partial payment on an invoice for $2,000, **When** the customer pays $500 via checkout, **Then** the invoice shows as "Partially Paid" with $1,500 remaining and a new "Pay Now" link for the balance.

5. **Given** a customer abandons the checkout page without paying, **When** the checkout session expires, **Then** the invoice remains in its current status with no payment recorded.

---

### User Story 3 — 14-Day Free Trial Flow (Priority: P1)

A new user signs up and gets full Professional tier access for 14 days without entering a credit card. Before expiry, they're prompted to subscribe. After expiry, access is restricted to read-only. This is the primary acquisition funnel — the first impression that determines whether a user becomes a paying customer.

**Why this priority**: The trial is the primary acquisition funnel. Without a smooth trial-to-paid conversion, growth stalls. Every new user touches this flow, making it the highest-leverage UX in the platform.

**Independent Test**: Can be tested by creating a new organisation and verifying Professional features are available, then advancing time past 14 days (using Carbon::setTestNow) and verifying read-only restrictions are enforced by both middleware and frontend.

**Acceptance Scenarios**:

1. **Given** a new user completes registration, **When** their organisation is created, **Then** a 14-day trial starts with full Professional tier features and a "14 days remaining" banner visible on every page.

2. **Given** a trial with 3 days remaining, **When** the user logs in, **Then** a prominent banner shows "3 days left — add payment method to continue" with a CTA to the billing page.

3. **Given** a trial expires without conversion, **When** the user logs in, **Then** they see all their data (read-only) but cannot create new entries, invoices, or reconcile. A full-screen prompt offers plan selection.

4. **Given** a user converts during trial, **When** they enter payment details and select a plan, **Then** the trial banner disappears and billing starts immediately (no double-charge for the trial period).

5. **Given** a trial has 7 days remaining, **When** the countdown banner renders, **Then** it shows at 7, 3, and 1 day marks with increasing visual urgency (info, warning, danger styling).

---

### User Story 4 — Plan Upgrade/Downgrade (Priority: P2)

A growing business wants to upgrade from Starter to Professional to unlock invoicing, or downgrade if they no longer need features. Today plan changes require contacting support — a friction point that slows revenue growth and frustrates users who want self-service control.

**Why this priority**: Self-service plan changes are essential for SaaS retention and expansion revenue. Without them, upgrades require support tickets which adds friction at the exact moment a user is ready to pay more.

**Independent Test**: Can be tested by subscribing to Starter via Stripe test mode, upgrading to Professional, and verifying feature access changes immediately. Then downgrade and verify feature loss warnings and end-of-cycle timing.

**Acceptance Scenarios**:

1. **Given** a Starter user clicks "Upgrade to Professional", **When** they confirm, **Then** Stripe prorates the charge, Professional features are unlocked immediately, and a confirmation email is sent.

2. **Given** a Professional user wants to downgrade to Starter, **When** they initiate the downgrade, **Then** a warning shows which features they'll lose (invoicing, BAS, multi-currency, etc.) and the downgrade takes effect at the next billing cycle.

3. **Given** a user has 3 workspaces on Professional (3 included) and downgrades to Starter (1 included), **When** the downgrade warning shows, **Then** it lists the workspaces that will become read-only and asks the user to select which one to keep active.

4. **Given** a user upgrades and then downgrades within the same billing cycle, **When** the next invoice generates, **Then** the prorated credit for the upgrade is applied and the user is not overcharged.

---

### User Story 5 — Dunning & Payment Recovery (Priority: P2)

When a subscription payment fails, the system handles recovery gracefully — Smart Retries, grace period, degraded access, and clear communication. Good dunning silently recovers revenue; bad dunning churns paying customers over a temporary card issue.

**Why this priority**: Payment failures are inevitable (expired cards, insufficient funds). Good dunning recovers 60%+ of failed payments; bad dunning loses them permanently. This is a revenue protection mechanism that runs on autopilot.

**Independent Test**: Can be tested in Stripe test mode by using the `4000000000000341` test card (attaches but fails on charge) and verifying the state transitions: active > past_due > grace period > unpaid > read-only.

**Acceptance Scenarios**:

1. **Given** a payment fails, **When** Stripe's first retry also fails, **Then** the user sees a "Payment failed — please update your card" banner with a direct link to update payment method.

2. **Given** a subscription is past_due for 7 days, **When** the grace period ends, **Then** the subscription moves to "unpaid" and workspace access is restricted to read-only.

3. **Given** a user updates their payment method during the grace period, **When** Stripe successfully charges the updated method, **Then** full access is restored and the past_due banner disappears.

4. **Given** a subscription moves to "unpaid" after the grace period, **When** the user updates their payment method and Stripe charges successfully, **Then** full access is restored within 60 seconds of the successful charge webhook.

---

### Edge Cases

- **Stripe Connect payout failure**: When a payout to a tenant's bank fails, the tenant is notified via email and in-app banner. The payment is held in their Express account until payout succeeds or they update their bank details in the Stripe Express dashboard.
- **Customer chargeback/dispute**: The disputed amount is deducted from the tenant's next payout. MoneyQuest shows a "Disputed" badge on the invoice with Stripe's dispute status (needs_response, under_review, won, lost). If lost, the payment is reversed in the ledger.
- **Invalid ABN**: Stripe Tax validation fails, GST is charged at the standard rate (no reverse charge), and the user is prompted to provide a valid ABN on the billing page.
- **Workspace limit on downgrade**: When a tenant on Starter reaches the workspace limit, a prompt to upgrade appears when they try to create a new workspace. Existing workspaces beyond the limit become read-only.
- **Webhook delivery failure**: Stripe retries webhooks for up to 3 days. MoneyQuest stores a `stripe_event_id` for idempotency to prevent duplicate payment recording on retry.
- **Checkout session for a voided invoice**: If an invoice is voided while a customer has an open checkout session, the checkout session is cancelled via the Stripe API. If payment completes before cancellation, a refund is automatically issued.
- **Simultaneous online and manual payment**: If a customer pays online and the tenant also records a manual payment for the same invoice, the invoice may show as overpaid. The system flags overpayments for the tenant to review and allocate as a credit.
- **Express account deauthorisation**: If a tenant disconnects their Stripe account directly from Stripe (not via MoneyQuest), the `account.application.deauthorized` webhook sets the Connect status to "Disconnected" and disables online payments.

---

## Requirements

### Functional Requirements

**Stripe Connect**
- **FR-001**: System MUST support Stripe Connect Express account onboarding for tenants to accept online invoice payments.
- **FR-002**: System MUST generate Stripe-hosted checkout sessions for invoices with a "Pay Online" option, including the invoice amount, tenant business name, and line item descriptions.
- **FR-003**: System MUST automatically record payments when Stripe `checkout.session.completed` webhook confirms successful charge.
- **FR-004**: System MUST auto-post journal entries for online payments (Dr Bank, Cr Accounts Receivable) using the existing InvoiceAggregate event sourcing flow.
- **FR-005**: System MUST support configurable platform commission via `application_fee_amount` on each checkout session, stored as a percentage in platform config (default 1.5%).
- **FR-006**: System MUST support partial payments via online checkout — the checkout amount defaults to the invoice balance remaining, and a new checkout session is generated for any remaining balance.
- **FR-007**: System MUST handle chargebacks by reflecting the disputed status on the invoice and reversing the payment journal entry if the dispute is lost.
- **FR-008**: System MUST store `stripe_event_id` for all processed webhooks to ensure idempotent handling on retry.
- **FR-009**: System MUST gate online payments to Professional+ plans via Laravel Pennant feature flag `online_payments`.

**Free Trial**
- **FR-010**: System MUST provide a 14-day free trial with full Professional tier access, no credit card required, starting from organisation creation.
- **FR-011**: System MUST show countdown banners at 7 days, 3 days, and 1 day before trial expiry with escalating visual urgency.
- **FR-012**: System MUST restrict to read-only access after trial expiry without conversion — all write API endpoints return 403 with a `trial_expired` error code.
- **FR-013**: System MUST not double-charge when a user converts during trial — Stripe subscription starts immediately with no retroactive charge for the trial period.

**Plan Management**
- **FR-014**: System MUST support self-service plan upgrades with immediate feature unlock and prorated billing via Stripe proration.
- **FR-015**: System MUST support plan downgrades effective at next billing cycle with a confirmation screen listing features and workspaces that will be lost or restricted.
- **FR-016**: System MUST validate ABNs against the Australian Business Register API for GST reverse charge eligibility.
- **FR-017**: System MUST apply Australian GST (10%) to subscriptions for customers without a valid ABN.
- **FR-018**: System MUST handle workspace limit enforcement on downgrade — excess workspaces become read-only, user selects which to keep active.

**Dunning**
- **FR-019**: System MUST integrate Stripe Smart Retries for failed payment recovery (configured in Stripe dashboard, monitored via webhooks).
- **FR-020**: System MUST provide a 7-day grace period before restricting access on payment failure — `past_due` status triggers banner, `unpaid` status triggers read-only.
- **FR-021**: System MUST allow users to update payment methods at any time from the billing page via Stripe's Customer Portal or an embedded card element.
- **FR-022**: System MUST restore full access within 60 seconds of a successful payment webhook after a failed payment recovery.

### Key Entities

- **StripeConnectAccount** (tenant-scoped): A tenant's Express account. Fields: `workspace_id`, `stripe_account_id`, `onboarding_status` (pending, complete, restricted), `charges_enabled` (boolean), `payouts_enabled` (boolean), `platform_fee_percent` (integer basis points, default 150 = 1.5%), `disabled_at` (nullable timestamp for manual disconnect), `metadata` (JSON for Stripe account details).
- **OnlinePayment** (tenant-scoped): A payment processed via Stripe Connect. Fields: `workspace_id`, `invoice_id` (FK), `stripe_checkout_session_id`, `stripe_payment_intent_id`, `stripe_charge_id`, `amount` (integer cents), `platform_fee` (integer cents), `net_amount` (integer cents), `currency`, `status` (pending, succeeded, disputed, refunded), `dispute_status` (nullable: needs_response, under_review, won, lost), `payment_id` (FK to the Payment record created in the ledger).
- **Trial** (on Organisation model): Trial period fields on the existing Organisation model. Fields: `trial_started_at` (timestamp), `trial_ends_at` (timestamp), `trial_converted_at` (nullable timestamp — set when user subscribes during trial).
- **Subscription** (on Organisation model, via Laravel Cashier): An organisation's billing subscription managed by Laravel Cashier. Fields: `stripe_id` (Stripe subscription ID), `stripe_status` (trialing, active, past_due, canceled, unpaid), `stripe_price` (Stripe price ID), `trial_ends_at`, `ends_at` (for cancellations/downgrades scheduled at period end).

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: 30% of Professional/Enterprise tenants enable Stripe Connect within 6 months of launch.
- **SC-002**: Invoices with "Pay Online" are paid 40% faster (median days-to-payment) than invoices without.
- **SC-003**: Trial-to-paid conversion rate of 15%+ within 30 days of trial start.
- **SC-004**: Dunning recovery rate of 60%+ (failed payments recovered within the 7-day grace period).
- **SC-005**: Platform commission generates measurable recurring transaction revenue (target TBD based on payment volume projections post-launch).
- **SC-006**: Online payment recording (webhook to journal entry) completes in under 5 seconds.
- **SC-007**: Stripe Express onboarding flow completes in under 3 minutes for tenants with documents ready.
- **SC-008**: Zero duplicate payments from webhook retries (idempotency verified by integration tests).

---

## Clarifications

### Session 2026-03-19

- Q: Should online payments use Stripe-hosted checkout or embedded payment elements? → A: Stripe-hosted checkout. Simpler to implement, PCI-compliant out of the box, and supports all payment methods Stripe enables for the region. Embedded elements can be added in v2 for a more branded experience.
- Q: How should partial payments work with online checkout? → A: Checkout session amount defaults to the invoice balance remaining. After partial payment, a new "Pay Now" link is generated for the remaining balance. No saved payment methods or autopay in v1.
- Q: Should the platform commission be fixed or configurable per tenant? → A: Platform-wide default (1.5%) stored in config, with the ability to override per tenant in the future. V1 uses the global default only.
- Q: How should the trial interact with existing organisations created before this feature? → A: Existing organisations without a subscription are grandfathered on their current plan tier. The trial flow applies only to new registrations after this feature launches.
- Q: Should the free trial require email verification? → A: Yes. Email verification is already required by Fortify. The trial clock starts at organisation creation, not at email verification.
- Q: What happens to a tenant's online payment data if they downgrade from Professional to Starter? → A: Historical payment data remains visible (read-only). New online payments are disabled. Existing unpaid invoices lose the "Pay Online" option. If they upgrade again, Connect is re-enabled without re-onboarding.
- Q: Should webhook processing be synchronous or queued? → A: Queued via Laravel's job queue for resilience. Stripe webhooks return 200 immediately, and the payment recording job processes asynchronously. Failed jobs retry with exponential backoff.
