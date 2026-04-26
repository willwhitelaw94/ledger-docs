---
title: "Idea Brief: Quotes & Purchase Orders"
---

# Idea Brief: Quotes & Purchase Orders

**Created**: 2026-03-15
**Author**: William Whitelaw

---

## Problem Statement (What)

- **No pre-transaction documents**: Businesses can create invoices and bills but have no way to send a quote to a customer before committing, or issue a purchase order to a supplier before receiving goods
- **Lost sales workflow**: The quote → invoice → payment pipeline is the standard sales cycle, but users must create invoices directly — skipping the negotiation/approval step
- **No procurement tracking**: Businesses ordering from suppliers have no way to track what's been ordered vs what's been received vs what's been billed

**Current State**: The Invoice model already supports multiple types (invoice, bill, credit_note, bill_credit_note) via InvoiceType enum. The architecture supports extension. No quote or PO capability exists.

---

## Possible Solution (How)

Extend the existing Invoice model with two new types — `quote` and `purchase_order`. Same line items, same contacts, same structure. Different status flows and a "convert" action.

- **Quotes**: draft → sent → accepted/declined/expired → converted to invoice
- **Purchase Orders**: draft → sent → received → converted to bill
- **One-click conversion**: accepted quote becomes an invoice; received PO becomes a bill
- **Separate numbering**: QUO-001, PO-001 (configurable prefixes in workspace settings)

---

## Benefits (Why)

- Completes the sales and procurement cycle — standard for any accounting platform
- Xero, MYOB, and QuickBooks all have quotes/POs — table stakes for credibility
- Quote acceptance tracking gives sales pipeline visibility
- PO tracking prevents duplicate orders and missed receipts

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

**M — 2 sprints / 2 weeks**

- **Sprint 1**: Backend (enum extension, new statuses, actions, controllers, conversion logic)
- **Sprint 2**: Frontend (quote/PO pages, conversion UI, settings for prefixes)

---

## Proceed to PRD?

**YES** — Table stakes feature. The architecture already supports it via InvoiceType extension.
