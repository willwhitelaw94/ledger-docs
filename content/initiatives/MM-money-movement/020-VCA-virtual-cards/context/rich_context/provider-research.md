---
title: "020-VCA Virtual Cards — Provider & Regulatory Research"
created: 2026-03-14
topic: "Virtual card issuing in Australia — provider landscape, regulatory pathway, interchange economics, competitive analysis, and technical integration patterns"
sources_searched:
  web:
    - https://stripe.com/au/issuing
    - https://docs.stripe.com/issuing/global
    - https://docs.stripe.com/issuing/purchases/authorizations
    - https://www.airwallex.com/au/core-api/issuing
    - https://www.airwallex.com/docs/issuing/get-started/create-cards/whitelabel-card-offering
    - https://www.airwallex.com/docs/developer-tools/webhooks/listen-for-webhook-events/issuing
    - https://help.airwallex.com/hc/en-gb/articles/900001757106-How-is-Airwallex-licensed-and-regulated
    - https://www.nium.com/newsroom/nium-expands-across-australia-and-new-zealand
    - https://www.cuscal.com/payments/issuing/card-services/
    - https://letsweel.com/faqs
    - https://letsweel.com/resources/the-weelhouse/articles/our-journey-to-visa-business-debit-cards
    - https://www.archa.com.au/
    - https://www.adyen.com/issuing
    - https://afslhouse.com.au/insights/bin-sponsorship-afsl-card-issuing-fintechs/
    - https://www.rba.gov.au/payments-and-infrastructure/review-of-retail-payments-regulation/2025-07/consultation-paper/interchange-fees.html
    - https://assets.ctfassets.net/e6wv1zvbwa49/2LvwTq9fsnlWroURPHZvul/f6cd9975ee5e39ee92a846140b41e029/Volopay_Australia_-_Airwallex_AU_-_Product_Disclosure_Statement.docx.pdf
---

# 020-VCA Virtual Cards — Provider & Regulatory Research

## Executive Summary

This document consolidates research across five critical dimensions for the 020-VCA Virtual Cards epic: AU card issuing providers, the Australian regulatory pathway, interchange economics, the competitive landscape, and technical integration patterns.

**The headline finding:** Stripe Issuing is not available in Australia. The two credible provider paths for an Australian accounting SaaS are (1) **Airwallex's embedded issuing API** under their AFSL, or (2) **Nium** (Weel's current issuer). Both allow a SaaS company to issue cards as an Authorised Representative under the provider's AFSL — eliminating the need to hold a separate licence at launch. Adyen and Marqeta are technically possible but have limited Australian focus or require deeper engagement.

**On regulation:** The current framework requires an AFSL or CAR (Corporate Authorised Representative) status to distribute cards. The Volopay model (operating as a CAR under Airwallex's AFSL) is the clearest precedent for how Polygon could enter the market without obtaining its own licence immediately. New Tranche 1A legislation (October 2025) will formalise this with explicit payment function licensing — but carve-outs for CAR arrangements are expected to remain.

**On interchange:** Australian interchange rates are among the most heavily regulated in the world. Debit/prepaid cards earn a weighted average benchmark of 8 cents per transaction (falling to ~6 cents under proposed 2026 reforms). At SME card volumes this is not a material revenue stream — not like US programs earning 1-2% cashback. The commercial card BIN earns higher rates than consumer, which is worth noting for product design. Interchange should be treated as a margin offset on platform costs, not a primary revenue line.

**Recommended provider: Airwallex**. They have an established AU AFSL (487221), an active white-label partner programme with documented precedent (Volopay), a developer-grade API, and an existing presence in the Australian SME accounting integration ecosystem (Xero, QuickBooks). The CAR model is proven and the compliance burden is lower than Nium (which is a more infrastructure-level BaaS).

---

## 1. AU Card Issuing Providers

### 1.1 Stripe Issuing

**Availability in Australia: NOT AVAILABLE**

Stripe Issuing is available only in the United States, United Kingdom, and European Economic Area. Australia is explicitly absent from the supported countries list as of March 2026. Cards issued via Stripe are denominated in USD, EUR, or GBP — no AUD support for local issuance.

Stripe Payments Australia Pty Ltd does hold AFSL 500105 for standard payment processing, but this does not extend to card issuing capabilities in Australia.

**Assessment:** Not a viable path. Rule out Stripe Issuing entirely for Australian deployment.

Sources: [Stripe Issuing Global](https://docs.stripe.com/issuing/global), [Stripe AU/Issuing page](https://stripe.com/au/issuing)

---

### 1.2 Airwallex Issuing

**Availability in Australia: YES — fully available**

Airwallex is the strongest candidate. Key facts:

- **Licence**: Airwallex Pty Ltd holds AFSL **487221** (issued 2016 for payments/FX). Airwallex SVF Pty Ltd is a Corporate Authorised Representative (CAR 001313604) under this AFSL, covering stored value products including virtual cards. A separate Airwallex Capital Pty Ltd holds AFSL 549026 for investment products.
- **Network**: Visa only (Mastercard not currently supported for issuing)
- **Card types**: Virtual, physical, digital wallets (Apple Pay, Google Pay)
- **White-label**: Explicitly supported. Partners can brand cards with their own identity using Airwallex's BIN and infrastructure
- **Go-live timeline**: 3–4 weeks for virtual card launch; 2–3 months for physical cards
- **API quality**: Developer-grade REST API with webhooks, PAN delegation via secure tokens (no need to host PCI-sensitive data), MCC-based controls, multi-currency wallet funding
- **Countries**: 60+ countries, 170+ currencies

**The Volopay precedent** is the most important data point. Volopay (an Australian expense management platform) issued white-labelled Visa virtual and physical cards in Australia via Airwallex's embedded issuing API. Volopay's Product Disclosure Statement explicitly states: *"Volopay arranges for customers to be issued a Card by Airwallex, which issues the Card through the Visa payment scheme. Volopay arranges customer access to the Services via the Volopay Payment Solution, with the Services provided by Airwallex through the Airwallex Platform."* Volopay operated as an authorised representative under Airwallex's AFSL — not holding its own licence.

**Pricing**: No public pricing for the embedded issuing API (custom commercial arrangement). The standard Airwallex consumer product charges AUD $15/user/month for additional cards. Embedded/platform pricing is negotiated and likely interchange-based with a per-transaction or per-card fee.

**Assessment:** Best option. Proven in AU, credible regulatory path, strong API, clear white-label precedent. Best match with Polygon's SME accounting positioning.

Sources: [Airwallex AU Core API Issuing](https://www.airwallex.com/au/core-api/issuing), [Airwallex Licensing](https://help.airwallex.com/hc/en-gb/articles/900001757106-How-is-Airwallex-licensed-and-regulated), [Volopay PDS](https://assets.ctfassets.net/e6wv1zvbwa49/2LvwTq9fsnlWroURPHZvul/f6cd9975ee5e39ee92a846140b41e029/Volopay_Australia_-_Airwallex_AU_-_Product_Disclosure_Statement.docx.pdf), [Airwallex White-label Docs](https://www.airwallex.com/docs/issuing/get-started/create-cards/whitelabel-card-offering)

---

### 1.3 Nium

**Availability in Australia: YES — well established**

Nium is the infrastructure provider powering Weel (Australia's leading spend management platform) as of March 2024, having replaced their previous issuer. Also powers Budgetly.

- **Licence**: Nium Pty Limited ACN 601 384 025 holds AFS licence **464627**. Weel Holdings Pty Ltd (ACN 617 434 607) is an authorised representative (AFS AR 1269625) under Nium's AFSL — the same CAR model as the Airwallex/Volopay arrangement
- **Network**: Visa (Weel specifically issues Visa Business Debit cards via Nium)
- **Issued globally**: 75+ million cards globally; strong SME focus
- **White-label**: Yes, explicitly offered to platforms
- **Partners in AU**: Weel, Budgetly (confirmed)

Nium is a more infrastructure-level BaaS provider — less consumer-facing than Airwallex, and the relationship model is typically larger-volume or enterprise-grade. Weel's decision to move to Nium in 2024 was driven by international/FX capabilities and global card acceptance.

**Assessment:** Viable but likely more enterprise-sales oriented and may require higher volume commitments. More complex to engage than Airwallex for a new platform. Weel's use of Nium is powerful validation that the model works.

Sources: [Weel/Nium Partnership](https://www.nium.com/newsroom/weel-partners-with-nium-to-accelerate-global-growth), [Weel Visa Debit Journey](https://letsweel.com/resources/the-weelhouse/articles/our-journey-to-visa-business-debit-cards), [Nium AU Expansion](https://www.nium.com/newsroom/nium-expands-across-australia-and-new-zealand)

---

### 1.4 Marqeta

**Availability in Australia: TECHNICALLY YES, but limited**

Marqeta closed its local Australian office in May 2023 as a cost-cutting measure, but continues to serve existing Australian customers (including Afterpay) from its Oakland, California headquarters. They announced a partnership with Visa in APAC for easier card program launches across 10 markets including Australia.

Marqeta's model is more suited to large-scale programs (Afterpay, Cash App) rather than SME SaaS platforms. Minimum volumes are likely high, and the US-based support model adds friction.

**Assessment:** Not the right fit for early-stage or mid-market Australian SaaS. Too enterprise-focused, no local presence.

Sources: [Marqeta Australia shutdown](https://www.paymentsdive.com/news/marqeta-card-issuing-australia-employee-cuts-bnpl/651538/), [Marqeta Stables AU partnership](https://investors.marqeta.com/news-releases/news-release-details/marqeta-announces-partnership-stables-australia-power-prepaid)

---

### 1.5 Adyen Issuing

**Availability in Australia: NOT AVAILABLE**

Adyen's card issuing product is currently available for businesses in the US, UK, and Europe only. Australia is not supported.

**Assessment:** Rule out for now.

Source: [Adyen Issuing](https://www.adyen.com/issuing)

---

### 1.6 Cuscal

**Availability in Australia: YES — but infrastructure-only**

Cuscal is Australia's original BIN sponsor and payment infrastructure provider, servicing banks, mutuals, and fintechs for nearly 60 years. They are a Principal Member of Visa and eftpos.

- Provides BIN sponsorship, card scheme sponsorship, settlement, dispute management
- Supports Apple Pay, Google Pay, Samsung Pay, Garmin Pay registration
- Primarily works with banks/credit unions and established fintechs — not typically a direct partner for early-stage SaaS
- Does not provide the developer-grade API layer that Airwallex or Nium offer

**Assessment:** Not suitable as a direct integration partner for Polygon. Cuscal is the plumbing behind the plumbing — the kind of entity Airwallex or Nium uses. Useful to know exists in case a BIN sponsor relationship ever becomes necessary at scale.

Source: [Cuscal Card Services](https://www.cuscal.com/payments/issuing/card-services/), [Cuscal Scheme Sponsorship](https://www.cuscalpayments.com.au/cards/scheme-sponsorship/)

---

### 1.7 Zepto

Zepto is an Australian real-time account-to-account payments infrastructure provider. They do **not** offer card issuing — their focus is on direct debit and instant bank transfers. Not relevant for virtual card issuance.

---

## 2. Australian Regulatory Pathway

### 2.1 What Licence Is Required?

To issue virtual cards in Australia, the core regulatory question is whether you are:

1. **The card issuer** — requires an AFSL authorising "issue of non-cash payment products"
2. **Arranging for others to issue cards** (program manager/distributor) — also requires an AFSL or CAR status under the issuer's AFSL

The Corporations Act 2001 (Cth) treats "non-cash payment products" (which includes prepaid and virtual cards) as financial products. Any entity that issues, arranges to issue, or controls the customer experience for such products is providing a financial service.

**There is no "free pass."** Simply building on top of a licensed issuer does not automatically exempt you from regulatory obligations.

### 2.2 Stored Value Facilities (SVF)

A Stored Value Facility (SVF) is a payment product where funds can be loaded onto an account or device for future use without an immediate onward payment instruction. Both physical and virtual prepaid cards are SVFs.

Under Australia's new Payments System Modernisation reforms (Tranche 1A, October 2025):
- SVF providers will require an AFSL with specific payment function authorisations
- ASIC oversees conduct and licensing (Corporations Act)
- APRA oversees prudential regulation only for **Major SVF providers** where total stored value exceeds AUD $200 million — far beyond any SME accounting SaaS at launch

For a small-to-mid SaaS, APRA oversight is not relevant at launch. ASIC licensing or CAR appointment is what matters.

### 2.3 The Corporate Authorised Representative (CAR) Model

This is the pathway used by Weel (under Nium) and Volopay (under Airwallex). It works as follows:

1. Polygon enters a commercial partnership with a licensed issuer (e.g. Airwallex)
2. Airwallex appoints Polygon as a **Corporate Authorised Representative** under AFSL 487221
3. Airwallex files a written notice with ASIC within 30 business days
4. The partnership agreement clearly allocates responsibilities: Airwallex retains primary compliance, Polygon handles customer onboarding subject to Airwallex's KYC/AML framework
5. Polygon can market, distribute, and manage the card experience under its own brand

**This model does not require Polygon to hold its own AFSL.** It is the standard entry path for Australian fintech card programs.

**Key obligations for Polygon as a CAR:**
- Must comply with Airwallex's compliance policies (AML/KYC, dispute handling)
- Cannot design card products outside the parameters Airwallex permits
- Must not hold or safeguard customer funds directly (Airwallex holds the float)
- Must disclose to customers that financial services are provided by Airwallex (as per FSG/PDS requirements)

### 2.4 New Payments Reform (2025) — What Changes?

The Treasury Laws Amendment Bill 2025 (Payments System Modernisation), released for consultation on 9 October 2025, introduces:
- A **function-based licensing framework** replacing the old "non-cash payment facility" model
- Seven defined payment functions requiring AFSL authorisation
- White-label card distribution is explicitly classified as "issuance of payment instruments" — no more grey-zone exemptions
- CAR arrangements remain valid under the new framework but must be formally documented

**Timeline:** Implementation from 2026 onwards in tranches. Transitional provisions expected.

**What this means for Polygon:** The CAR model under Airwallex remains the right path even post-reform. But legal review of the partnership agreement against the new framework will be required before launch, particularly around who is authorised for which payment functions.

### 2.5 The Regulatory Model Used by Market Players

| Provider | Entity | Licence Type | AFSL/AR Number |
|----------|--------|-------------|----------------|
| Weel | Nium Pty Ltd (issuer) | AFSL | 464627 |
| Weel | Weel Holdings Pty Ltd | Authorised Representative | AR 1269625 |
| Volopay | Airwallex Pty Ltd (issuer) | AFSL | 487221 |
| Volopay | Volopay (distributor) | CAR under Airwallex | (via AFSL 487221) |
| Airwallex | Airwallex Pty Ltd | AFSL | 487221 |
| Airwallex | Airwallex SVF Pty Ltd | CAR | 001313604 |
| Stripe (AU) | Stripe Payments Australia | AFSL (payments only) | 500105 |

Sources: [BIN Sponsorship & AFSL](https://afslhouse.com.au/insights/bin-sponsorship-afsl-card-issuing-fintechs/), [Payments Reform Guide](https://afslhouse.com.au/insights/payments-modernisation-australia-payment-service-provider-guide/), [Treasury Draft Legislation](https://ministers.treasury.gov.au/ministers/daniel-mulino-2025/media-releases/new-legislation-modernise-regulation-payment-service), [Allens — New Payments Licensing](https://www.allens.com.au/insights-news/insights/2025/10/first-tranche-of-payments-licensing-reforms-what-you-need-to-know/)

---

## 3. Interchange Economics in Australia

### 3.1 Current RBA Interchange Rate Caps

The RBA regulates interchange fees via formal Standards. As of 2025:

| Card Type | Weighted Average Benchmark | Per-Transaction Cap |
|-----------|---------------------------|---------------------|
| Debit / Prepaid | 8 cents | 10 cents or 0.20% |
| Credit | 0.50% of transaction value | 0.80% |

**Critical context:** These caps are among the lowest in the developed world. Australia's interchange regulation (implemented from 2003) was specifically designed to reduce the "hidden tax" merchants pay and to lower consumer costs. The result is that interchange is dramatically lower than in the US (where debit interchange can be 1–2% and credit up to 3%).

### 3.2 Proposed 2026 Reforms (RBA Consultation, July 2025)

The RBA's Payments System Board proposed further reductions effective **1 July 2026**:

| Card Type | New Benchmark | New Cap |
|-----------|--------------|---------|
| Debit / Prepaid | 6 cents | 6 cents or 0.12% |
| Credit | (benchmark removed) | 0.30% |

On a $50 lunch, the maximum interchange on a debit card is ~6 cents (current) falling to ~6 cents (same under the new cap). On a $1,000 subscription, credit interchange is max $5 (current) falling to $3 (proposed).

Sources: [RBA Interchange Consultation Paper](https://www.rba.gov.au/payments-and-infrastructure/review-of-retail-payments-regulation/2025-07/consultation-paper/interchange-fees.html), [Allens RBA Shake-up](https://www.allens.com.au/insights-news/insights/2025/07/rbas-payment-shake-up-implications-for-merchants-and-payment-service-providers/)

### 3.3 How Revenue Share Works for Program Managers

In a standard card program structure:

1. Merchant pays interchange to their acquirer
2. Acquirer passes interchange (minus acquirer margin) to the card network
3. Card network passes most of interchange to the issuing bank (Airwallex in this model)
4. Issuing bank retains a portion and shares the remainder with the program manager (Polygon)

The typical split is negotiated commercially. In US/UK markets, program managers can expect to receive ~70–80% of interchange. In Australia, the absolute dollar amounts are so small that the economics look very different:

- **Debit/prepaid at 8 cents per transaction**: If Polygon earns ~60% of 8 cents = ~$0.048 per transaction
- A customer making 50 card transactions per month = $2.40/month in interchange revenue
- At 500 active cardholders: ~$1,200/month in total interchange revenue

For context, at 1,000 cardholders making 50 transactions/month at average $100:
- Interchange on debit: ~1,000 × 50 × $0.048 = **$2,400/month**
- Interchange on credit (at 0.3%): 1,000 × 50 × $100 × 0.3% × 70% = **$10,500/month**

**Commercial vs consumer BINs:** Commercial (business) card programs earn higher interchange than consumer cards under the RBA framework. This is an important product design choice — positioning Polygon cards as "commercial" cards can improve the interchange economics.

### 3.4 Is Interchange a Viable Revenue Stream?

**At early/mid SME volumes: No, interchange is not a primary revenue line in Australia.**

The RBA regulation has squeezed interchange to the point where it functions as a margin offset against platform costs rather than a material revenue stream. Weel and Airwallex do not prominently advertise interchange as a revenue feature — they build revenue on subscription fees, FX margins, and AP automation.

For Polygon's virtual card product, the viable revenue model is:
1. **Subscription fee** per active cardholder or per card (e.g. $5–15/user/month, consistent with market)
2. **FX margin** if multi-currency cards are offered (Airwallex's business model)
3. **Interchange** as a cost offset / bonus at higher volumes (not primary)
4. **Stickiness / retention uplift** — cards make the accounting software more embedded (core strategic value)

Sources: [RBA Backgrounder on Interchange](https://www.rba.gov.au/payments-and-infrastructure/review-of-retail-payments-regulation/backgrounders/backgrounder-on-interchange-and-scheme-fees.html), [Lithic — Fintech Interchange Revenue](https://www.lithic.com/blog/interchange), [Finska — SaaS interchange optimization](https://fiska.com/blog/interchange-optimization-for-saas/)

---

## 4. Competitive Landscape — SME Virtual Cards and Accounting in Australia

### 4.1 Weel (formerly DiviPay)

**The market leader for AU SME virtual cards.**

- Founded 2018, first virtual corporate cards in Australia
- 60,000+ cardholders, 4,000+ finance teams in AU/NZ
- **Issuer**: Nium Pty Ltd (AFSL 464627); Weel is an Authorised Representative (AR 1269625)
- **Network**: Visa Business Debit (as of March 2024, after switching from prepaid to debit)
- **Pricing**: Basic plan from ~$119–135/month (5 users); additional users ~$5–10/month/card
- **Features**: Unlimited virtual/physical cards, per-card spend limits, MCC restrictions, mandatory receipt capture, AI receipt validation, GST extraction, reimbursements, AP automation
- **Accounting integrations**: Xero, MYOB, QuickBooks, NetSuite + Open API (deep, two-way sync)
- **Weakness**: Not multi-currency focused; primarily AUD domestic

**Positioning risk for Polygon:** Weel is the direct incumbent. The differentiation for Polygon must come from accounting-native integration depth — cards that auto-code to the chart of accounts, reconcile against invoices, enforce budget codes, and feed directly into journals. Weel is the standalone tool; Polygon can make cards native to the ledger.

Sources: [Weel](https://letsweel.com/), [Finder — Weel Review](https://www.finder.com.au/credit-cards/business-credit-cards/weel), [Nium/Weel Partnership](https://www.prnewswire.com/news-releases/australias-leading-spend-management-platform-weel-partners-with-nium-and-visa-to-accelerate-global-growth-and-customer-offering-302098407.html)

---

### 4.2 Airwallex Spend (with Cards)

**The multi-currency banking platform with embedded cards.**

- Primary positioning: global payments, FX, and treasury — cards are a feature, not the core
- **Pricing**: Explore (AUD $29/month), Grow ($149/month), Accelerate ($499/month) — waivable with $10k balance or $5k/month deposits. Additional employee cards: $15/user/month
- **Cards**: Visa virtual + physical; company cards (virtual only) and employee cards
- **Card limits**: Only 2 employee cards on base plans (vs Weel's unlimited)
- **Accounting integrations**: Xero, QuickBooks, ApprovalMax, NetSuite, Sage
- **Strength**: Zero international transaction fees, multi-currency wallets, strong for global businesses
- **Weakness**: Expense management depth is secondary to payments; limited receipt intelligence vs Weel

**Positioning note:** Airwallex is the issuing infrastructure partner recommendation for Polygon, but also a competitor on the front-end. Polygon can use Airwallex's API while competing with Airwallex's consumer product — this is a common pattern.

Sources: [Airwallex AU Pricing](https://www.airwallex.com/au/pricing), [Weel vs Airwallex comparison](https://letsweel.com/comparison/weel-vs-airwallex), [Airwallex cards review](https://www.worldfirst.com/au/insight/business-banking-insights/airwallex-card-review/)

---

### 4.3 Archa

**Australian corporate charge card — premium SME positioning.**

- Australian-founded, Mastercard network
- **Product**: Corporate charge card (not prepaid — actual credit line with monthly settlement)
- **Features**: Instant card issuance, 0% FX fees (raw Mastercard rate), business rewards points, travel insurance
- **Accounting integrations**: Xero, MYOB Acumatica (deep native integration), SAP Concur
- **Positioning**: Best-in-class rates and fees; targets professional services and mid-market
- **Regulatory**: Archa Limited (ACN 614 724 355) — specific card issuer/AFSL arrangement not publicly disclosed

Archa is more premium and credit-based than a prepaid/debit virtual card program. Less directly competitive with a ledger-native card feature.

Sources: [Archa](https://www.archa.com.au/)

---

### 4.4 ProSpend

**Australian mid-market unified spend management platform.**

- Founded 2015, serving 1,000+ ANZ businesses
- **Features**: Expenses, AP automation, virtual cards, purchase orders, travel, budgets in one platform
- **Virtual cards**: Issue in seconds, category rules, dynamic limits, real-time budget sync
- **Accounting integrations**: Xero, MYOB, NetSuite, Sage, Business Central, Acumatica — and 30+ others
- **Positioning**: Best unified spend platform, replaces Weel for companies needing invoicing + cards + POs
- **Pricing**: Not publicly disclosed (custom)

ProSpend is the closest competitive overlap with what Polygon could build — expense + AP + virtual cards in one system, deeply integrated with accounting software. ProSpend's differentiator is breadth; Polygon's would be being native to the ledger itself.

Sources: [ProSpend](https://prospend.com/virtual-card/), [MYOB App Store — ProSpend](https://www.myob.com/au/apps/prospend-virtual-cards)

---

### 4.5 Xero — Cards Product?

Xero does **not** offer a native virtual card or spend management product. They integrate with third-party tools (Weel, Airwallex, ProSpend, Dext) via their app ecosystem. No evidence of Xero building proprietary card issuance.

---

### 4.6 MYOB — Cards Product?

MYOB does not offer a native virtual card product. MYOB's app marketplace includes ProSpend virtual cards. MYOB acquired Nimble (BNPL for SMEs) in 2023, but this is not a card-issuing product.

---

### 4.7 Expensify

- US-based, strong global presence including Australia
- **Cards**: Virtual cards available with Expensify Cards (US-issued; unclear if AUD cards available)
- **Pricing**: $5/member/month, with cashback offsetting subscription (US model — not clearly applicable in AU given low interchange)
- **Accounting**: Xero, QuickBooks, NetSuite integration
- **AU gap**: The cashback/interchange revenue model that makes Expensify Cards attractive in the US does not translate to Australia's regulated interchange environment. Expensify has less AU-specific market presence than Weel or Airwallex.

Source: [Expensify Xero AU](https://apps.xero.com/au/app/expensify)

---

### 4.8 Dext / Hubdoc

Receipt capture tools, not card issuers. Dext (formerly Receipt Bank) and Hubdoc are document ingestion layers that feed into accounting software. They are complements to a card program, not competitors. Polygon could position native card transactions as making Dext/Hubdoc unnecessary for card-linked spend.

---

### 4.9 Summary Competitive Matrix

| Provider | Card Network | Issuer/Model | Key AU Integrations | Pricing Model | Strength |
|----------|-------------|-------------|---------------------|---------------|---------|
| Weel | Visa | Nium AFSL, Weel as CAR | Xero, MYOB, QBKS, NetSuite | $119+/month | Market leader, deep AU expense mgmt |
| Airwallex | Visa | Own AFSL | Xero, QBKS, NetSuite, Sage | $29–499/month | Multi-currency, global payments |
| Archa | Mastercard | Own entity | Xero, MYOB, Concur | Undisclosed | Corporate charge card, premium |
| ProSpend | Visa/MC | Undisclosed | Xero, MYOB, 30+ ERPs | Custom | Unified spend + AP + virtual cards |
| Expensify | Visa (US) | US-based | Xero, QBKS, NetSuite | $5/user/month | US-centric cashback model |
| Polygon (proposed) | Visa (via Airwallex) | Airwallex AFSL, Polygon as CAR | Native to MoneyQuest Ledger | TBD | Ledger-native: auto-journal, CoA mapping, budget enforcement |

---

## 5. Technical Integration Patterns

### 5.1 Stripe Issuing Webhooks (reference — US/UK/EU only)

Even though Stripe Issuing is not available in Australia, the pattern is worth documenting as a reference for what a well-designed card issuing API looks like.

**Key webhook events:**
- `issuing_authorization.request` — real-time authorization (must respond within 2 seconds to approve/decline)
- `issuing_authorization.created` — authorization created
- `issuing_authorization.updated` — authorization updated (status changes, fuel/fleet data arrival)
- `issuing_transaction.created` — transaction created (upon capture)
- `issuing_transaction.updated` — transaction updated
- `issuing_transaction.receipt_received` — receipt data attached

**Authorization payload data includes:**
- `amount` and `merchant_amount` (in card vs merchant currency)
- `merchant_data.name`, `merchant_data.city`, `merchant_data.country`, `merchant_data.category` (MCC)
- `approved` (boolean)
- `is_amount_controllable` (for partial auth)
- `request_history` (full authorization trail)
- `pending_request.amount` (for incremental authorizations)

**Real-time control:** Stripe allows you to programmatically approve or decline transactions based on your own logic (budget checks, policy rules) within 2 seconds.

Sources: [Stripe Issuing Authorizations](https://docs.stripe.com/issuing/purchases/authorizations), [Stripe Issuing real-time auth](https://docs.stripe.com/issuing/controls/real-time-authorizations), [Stripe event types](https://docs.stripe.com/api/events/types)

---

### 5.2 Airwallex Issuing API — How It Works

**Two-phase transaction model:**

**Phase 1 — Authorization:**
- Event: `issuing.transaction.succeeded` with `event_type = AUTHORIZATION`
- Funds are held (not settled)
- Opportunity to implement real-time approval/decline via remote authorization webhook

**Phase 2 — Clearing (Settlement):**
- Event: `issuing.transaction.succeeded` with `event_type = CLEARING`
- Occurs within 7 days of authorization
- Match to authorization via `matched_authorizations` field

**Key data fields on card transactions:**
- `billing_currency` — ISO-4217 currency code
- `retrieval_ref` — acquirer-assigned unique reference
- `transaction_type` — filter by type
- Merchant information (name, MCC, location) — available but specific field names require consulting full API reference
- Card controls: MCC restrictions, currency controls, time-period limits, per-transaction limits

**Card funding model:** Cards are funded directly from the Airwallex Wallet — no need to pre-fund per card. Cards draw from the wallet balance at authorization time.

**Remote authorization:** Airwallex supports `remote authorization` — platforms can receive an authorization webhook and respond approve/decline in real-time, enabling ledger-native budget enforcement at the point of purchase.

**PCI compliance:** Airwallex handles PCI-DSS Level 1 compliance. Sensitive PAN data is accessed via tokenized delegation — Polygon does not need to store raw card numbers.

Sources: [Airwallex Issuing Webhooks](https://www.airwallex.com/docs/developer-tools/webhooks/listen-for-webhook-events/issuing), [Retrieve card transactions](https://www.airwallex.com/docs/issuing__retrieve-card-transactions), [Remote authorization](https://www.airwallex.com/docs/issuing/card-controls/remote-authorization/respond-to-authorization-requests)

---

### 5.3 Accounting SaaS Integration Pattern — Ledger-Native Virtual Cards

The key technical innovation for Polygon is not just issuing cards, but making the card transaction **trigger a journal entry** automatically. Here is the pattern:

```
Card swipe
    → Airwallex auth webhook → Polygon API
    → Check budget/limits → Approve/Decline in real-time
    → On clearing: POST journal entry draft to ledger
    → Match MCC to GL account via chart of accounts mapping
    → Attach receipt (via Airwallex OCR or manual upload) to journal entry
    → Auto-code GST based on MCC and supplier data
    → Flag for approval if over threshold or unrecognised MCC
```

**MCC-to-GL mapping** is the core IP: a lookup table mapping Merchant Category Codes to likely GL accounts (e.g., MCC 5812 Restaurants → 7400 Meals & Entertainment; MCC 7372 Software → 7500 IT & Software). This can be pre-seeded from common Australian CoA templates and user-editable.

**Key integration data points available per transaction:**
- Merchant name (for supplier creation/matching)
- MCC code (for GL auto-mapping)
- Amount in AUD (or foreign currency + conversion)
- Transaction date/time
- Card used (maps to employee/cost centre)
- Authorization vs settled amount

Sources: [Airwallex API card issuing blog](https://www.airwallex.com/au/blog/card-issuing-for-business), [MCC codes guide](https://stripe.com/guides/merchant-category-codes)

---

## 6. Key Decisions Enabled by These Findings

| Decision | Finding | Recommendation |
|----------|---------|----------------|
| Which card issuing provider? | Stripe: not AU. Adyen: not AU. Marqeta: no local support. Airwallex: fully available, proven white-label precedent (Volopay). Nium: also available but more enterprise. | **Airwallex** as primary provider |
| What regulatory path? | CAR under Airwallex's AFSL is the standard model (same as Weel/Nium, Volopay/Airwallex). No need for own AFSL at launch. | **Corporate Authorised Representative** under Airwallex AFSL 487221 |
| Is interchange a revenue line? | At AU volumes and rates, interchange at debit is ~6–8 cents/transaction. At 1,000 cardholders × 50 transactions: ~$2,400/month total at best. | **Not primary revenue**; use subscription + FX as the revenue model |
| Commercial vs consumer BIN? | Commercial cards earn higher interchange and are more appropriate for B2B SME use case | **Commercial card BIN** — position as business expense card |
| Primary competitive differentiator? | Weel is the incumbent with deep expense management. ProSpend has the broadest feature set. Neither is native to a double-entry ledger. | **Ledger-native** card: auto-journal, CoA mapping, budget enforcement at point of purchase |
| Is a credit card viable? | Credit card product requires more regulatory complexity (credit licence considerations) and higher volume for economics | **Prepaid/debit card** first; credit card as future phase |
| Network: Visa vs Mastercard? | Airwallex only supports Visa for issuing. Weel (via Nium) is Visa. Archa is Mastercard. | **Visa** via Airwallex |
| New regulatory reform risk? | Tranche 1A legislation (Oct 2025) formalises the CAR model. Transition provisions expected. | Low risk for CAR model, but **legal review required** before launch |

---

## 7. Open Questions

1. [ ] **What are Airwallex's minimum volume commitments** for a new embedded issuing partner? Are there minimums that would be difficult for Polygon to meet at launch?

2. [ ] **What is the revenue share arrangement** for interchange in Airwallex's embedded issuing API contract? What % do partners typically receive?

3. [ ] **Does Airwallex support remote authorization (real-time approve/decline)** for AU-based card programs specifically? This is core to budget-enforcement UX.

4. [ ] **What KYC/AML requirements** would Polygon need to pass through to customers as part of the CAR arrangement? Does this require customers to re-KYC with Airwallex, or does Polygon's existing workspace onboarding satisfy this?

5. [ ] **Can cards be funded from a wallet balance vs a linked bank account?** If Airwallex requires customers to hold an Airwallex wallet as the funding source, that adds significant onboarding friction vs simply linking a business bank account.

6. [ ] **What is the liability model** for chargebacks and fraud between Airwallex and Polygon as CAR? What exposure does Polygon carry?

7. [ ] **Does Nium accept mid-market SaaS as partners**, or is their minimum scale closer to Weel (60k+ cardholders)? Nium could be the backup if Airwallex's commercial terms are unfavourable.

8. [ ] **RBA 2026 reform impact**: If debit interchange caps drop to 6 cents, what happens to the cost economics of card programs for issuers? Do providers pass this through to program managers?

9. [ ] **Will Polygon need to issue a Financial Services Guide (FSG)** to customers as part of the CAR disclosure obligations?

10. [ ] **Xero and MYOB integration compatibility**: Can card transactions feed into a Xero/MYOB bank feed view as well as Polygon's native journal? This could be a critical UX requirement if customers use Polygon alongside existing accounting platforms.

---

## 8. Recommended Provider and Path

**Recommended provider: Airwallex**

**Rationale:**
1. **Proven AU precedent**: Volopay built exactly this model — white-labelled Visa virtual/physical cards issued via Airwallex's embedded API to Australian SMEs, operating as a CAR under AFSL 487221
2. **Developer-grade API**: MCC controls, remote authorization, PAN tokenization, multi-currency wallet funding, webhooks for all transaction lifecycle events
3. **No Stripe constraint**: Stripe Issuing's absence in AU rules out the most obvious alternative; Airwallex fills this gap with comparable API quality
4. **Competitive moat opportunity**: Airwallex is also a competitor in the front-end spend management space, which means the data Polygon receives from the partnership is valuable and Airwallex has incentive to maintain good infrastructure
5. **AU accounting ecosystem**: Airwallex already integrates with Xero, QuickBooks, MYOB — so Polygon operates within the same partner ecosystem
6. **Regulatory simplicity**: CAR model is well-documented, precedented, and lower overhead than obtaining own AFSL at launch

**Recommended path:**
1. Initiate commercial conversations with Airwallex's embedded finance / platform partnerships team
2. Engage a payments law firm (e.g. Gilbert + Tobin, Allens) to review the CAR appointment structure under the new Tranche 1A framework
3. Design card product with commercial BIN positioning (not consumer)
4. Build to Airwallex's issuing API with remote authorization enabled from day one — this is the core technical differentiator (real-time budget enforcement)
5. Fund cards from Airwallex wallet (not bank account linking) — simpler infrastructure initially, even if it requires customers to pre-fund a wallet

**Backup provider: Nium** (if Airwallex commercial terms are unfavourable or minimum volume requirements are prohibitive)

---

## 9. Sources Index

| Topic | Source URL |
|-------|-----------|
| Stripe Issuing — not in AU | [docs.stripe.com/issuing/global](https://docs.stripe.com/issuing/global) |
| Airwallex AU AFSL | [help.airwallex.com — licensing](https://help.airwallex.com/hc/en-gb/articles/900001757106-How-is-Airwallex-licensed-and-regulated) |
| Airwallex issuing API | [airwallex.com/au/core-api/issuing](https://www.airwallex.com/au/core-api/issuing) |
| Airwallex white-label cards | [airwallex.com/docs/issuing/whitelabel](https://www.airwallex.com/docs/issuing/get-started/create-cards/whitelabel-card-offering) |
| Volopay PDS (Airwallex CAR) | [Volopay PDS PDF](https://assets.ctfassets.net/e6wv1zvbwa49/2LvwTq9fsnlWroURPHZvul/f6cd9975ee5e39ee92a846140b41e029/Volopay_Australia_-_Airwallex_AU_-_Product_Disclosure_Statement.docx.pdf) |
| Weel product | [letsweel.com](https://letsweel.com/) |
| Weel/Nium partnership | [nium.com — Weel partnership](https://www.nium.com/newsroom/weel-partners-with-nium-to-accelerate-global-growth) |
| Weel Visa Debit journey | [letsweel.com — Visa journey](https://letsweel.com/resources/the-weelhouse/articles/our-journey-to-visa-business-debit-cards) |
| Nium AU expansion | [nium.com — AU/NZ expansion](https://www.nium.com/newsroom/nium-expands-across-australia-and-new-zealand) |
| Cuscal BIN sponsorship | [cuscalpayments.com.au](https://www.cuscalpayments.com.au/cards/scheme-sponsorship/) |
| Marqeta AU shutdown | [paymentsdive.com](https://www.paymentsdive.com/news/marqeta-card-issuing-australia-employee-cuts-bnpl/651538/) |
| Adyen — not in AU | [adyen.com/issuing](https://www.adyen.com/issuing) |
| AU AFSL / BIN sponsorship regulation | [afslhouse.com.au — BIN sponsorship](https://afslhouse.com.au/insights/bin-sponsorship-afsl-card-issuing-fintechs/) |
| New payments legislation (Tranche 1A) | [Treasury media release](https://ministers.treasury.gov.au/ministers/daniel-mulino-2025/media-releases/new-legislation-modernise-regulation-payment-service) |
| Allens — new payments licensing | [allens.com.au](https://www.allens.com.au/insights-news/insights/2025/10/first-tranche-of-payments-licensing-reforms-what-you-need-to-know/) |
| SVF/APRA/ASIC dual regulation | [afslhouse.com.au — SVF](https://afslhouse.com.au/insights/apra-vs-asic-dual-regulation-stored-value-facilities-payments-licensing/) |
| RBA interchange current caps | [rba.gov.au — backgrounder](https://www.rba.gov.au/payments-and-infrastructure/review-of-retail-payments-regulation/backgrounders/backgrounder-on-interchange-and-scheme-fees.html) |
| RBA interchange proposed 2026 | [rba.gov.au — 2025 consultation](https://www.rba.gov.au/payments-and-infrastructure/review-of-retail-payments-regulation/2025-07/consultation-paper/interchange-fees.html) |
| Airwallex issuing webhooks | [airwallex.com/docs — issuing webhooks](https://www.airwallex.com/docs/developer-tools/webhooks/listen-for-webhook-events/issuing) |
| Airwallex retrieve card transactions | [airwallex.com/docs — transactions](https://www.airwallex.com/docs/issuing__retrieve-card-transactions) |
| Airwallex remote authorization | [airwallex.com/docs — remote auth](https://www.airwallex.com/docs/issuing/card-controls/remote-authorization/respond-to-authorization-requests) |
| ProSpend virtual cards | [prospend.com/virtual-card](https://prospend.com/virtual-card/) |
| Archa | [archa.com.au](https://www.archa.com.au/) |
| AU prepaid card market 2025 | [GlobeNewswire — AU market report](https://www.globenewswire.com/news-release/2025/07/07/3111105/28124/en/Australia-Prepaid-Card-and-Digital-Wallet-Market-Report-2025-A-35-71-Billion-Market-by-2029-with-8-2-CAGR-During-2025-2029.html) |
| Interchange SaaS economics | [Lithic — fintech interchange](https://www.lithic.com/blog/interchange) |
| MCC codes guide | [stripe.com/guides/mcc](https://stripe.com/guides/merchant-category-codes) |
