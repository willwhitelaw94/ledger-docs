---
title: "Idea Brief: Proposals, Billing & Deal Pipeline"
---

# Idea Brief: Proposals, Billing & Deal Pipeline

**Created**: 2026-04-01
**Author**: William Whitelaw

---

## Problem Statement (What)

- **No way to bill clients for practice services**: Accounting firms using MoneyQuest can manage client workspaces, track time via timesheets (072-JTW), and manage jobs, but cannot generate a proposal, quote, or invoice to the client for services rendered
- **Lost engagement workflow**: Australian practices are required to issue engagement letters (APES 305) before commencing work. Currently this happens outside the system — typically via Ignition ($99–$399/month per firm) or manual PDFs
- **No sales pipeline**: Practices have no way to track prospective clients from initial enquiry through to signed engagement. Deals are tracked in spreadsheets or heads
- **Disconnect between work and billing**: Jobs/timesheets track effort but there's no link from "we budgeted 10 hours on Smith Tax Return" to "we should bill Smith $2,500 for this work"
- **Scope creep is unmanaged**: No mechanism to define what's in/out of scope, or to instantly bill for ad-hoc work outside the original engagement

**Current State**: The Invoice model supports quotes (type = quote) and conversion to invoices (031-QPO). The Job model tracks time budgets and costs (008-JCT, 072-JTW). The email system is built (023-EML). All the pieces exist but they're not connected for practice-side billing.

---

## Possible Solution (How)

Introduce a **Proposal** entity that bundles scope, pricing, engagement terms, and digital acceptance into a single client-facing document — inspired by Ignition's single-acceptance flow.

- **Proposals**: Branded documents containing cover letter + service lines + engagement letter + digital signature. Sent to clients via email link.
- **Service Catalogue**: Reusable library of services with default pricing, categories, and revenue accounts.
- **Dynamic Engagement Letters**: Terms composed from conditional sections based on selected service categories (BAS terms auto-included when BAS services selected).
- **Tiered Pricing**: Optional Essentials/Standard/Premium packages within a single proposal.
- **Single-Acceptance Flow**: Client accepts scope + terms + billing authorisation in one action. Auto-generates quote/invoice.
- **Deal Pipeline**: Lightweight CRM (New → Qualifying → Negotiating → Proposal Sent → Won/Lost) for tracking prospects.
- **Scope Management**: Edit active engagements, instant-bill for ad-hoc work, annual renewals with optional price increases.

---

## Benefits (Why)

- **Eliminates Ignition dependency** — practices pay $99–$399/month for Ignition. This is built in.
- **Closes the billing loop** — time tracked in 072-JTW connects to invoices generated from proposals. Full profitability visibility.
- **Australian compliance** — engagement letters with digital signatures satisfy APES 305 requirements.
- **Revenue forecasting** — deal pipeline + accepted proposals = predictable revenue.
- **Competitive differentiator** — Ignition is billing-only and pushes everything to Xero. MoneyQuest has the full accounting engine — proposals link to actual costs via journal entries for real profitability insight.
- **Scope creep management** — $0 boundary items + instant bill = clear scope definitions and easy ad-hoc billing.

---

## Competitor Research: Ignition (Practice Ignition)

Market leader for accounting practice proposals/billing. Key takeaways:

1. **Single-acceptance flow** is their core differentiator — proposal + engagement letter + payment auth in one step
2. **Dynamic engagement letters** — terms auto-compose based on selected services
3. **Tiered pricing** within proposals (clients self-select package)
4. **Automatic payment collection** via Stripe (91% auto-collected)
5. **Scope creep tools** — instant bill, service edits on active engagements, $0 boundary items
6. **Bulk renewals** with automatic price increases
7. **Lightweight CRM pipeline** (Deals) on Pro+ plan
8. **AI Price Insights** ($349/year add-on) benchmarking against platform-wide data
9. **Pricing**: $39–$399/month + 1% transaction fees

See context/ignition-research.md for full analysis.

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | William Whitelaw (PO, Dev) |
| **A** | William Whitelaw |
| **C** | — |
| **I** | — |

---

## Estimated Effort

**XL — 7+ sprints / 7–8 weeks**

- **Phase 1** (2 sprints): Backend foundation — enums, migrations, models, Services/Proposals CRUD
- **Phase 2** (1 sprint): Client portal — proposal acceptance flow with digital signatures
- **Phase 3** (2 sprints): Frontend — proposal builder, services settings, engagement terms, proposals list
- **Phase 4** (1 sprint): Deal pipeline — CRM, kanban board
- **Phase 5** (1 sprint): Billing automation — recurring invoices, deposits, scope changes, renewals
- **Phase 6** (future): AI integration, analytics, PDF export
- **Phase 7** (future): Stripe payment collection

---

## Proceed to PRD?

**YES** — This is the natural successor to 072-JTW. Time tracking without billing is incomplete. Replaces $99–$399/month Ignition dependency. All underlying infrastructure (invoices, jobs, email, portal) is already built.
