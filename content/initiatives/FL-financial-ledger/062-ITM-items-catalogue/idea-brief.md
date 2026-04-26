---
title: "Idea Brief: Items Catalogue"
---

# Idea Brief: Items Catalogue (Products & Services)

**Epic**: 062-ITM
**Created**: 2026-03-21
**Initiative**: FL — MoneyQuest Ledger
**Status**: Idea

---

## Problem Statement

Users manually type line item descriptions, amounts, tax codes, and account mappings every time they create an invoice or bill. This leads to:

- **Inconsistent naming** — same product described differently across invoices
- **Slow data entry** — re-keying price, tax code, and GL account for every line
- **No pricing history** — can't track when prices changed or what was charged previously
- **No reusability** — quotes, invoices, and bills don't share a common item catalogue
- **Reporting gaps** — can't analyse revenue/cost by product or service without consistent item data

## Possible Solution

A centralised **Items catalogue** — a master list of products and services that can be pulled into invoice lines, bill lines, quote lines, and journal entries.

**Before**: Type "Website Design - 10hrs @ $150/hr" manually on every invoice, pick tax code, pick GL account.

**After**: Search "Website Design", auto-fills description, unit price ($150), unit (hours), tax code (GST), revenue account (4-1100), and the user just enters quantity.

**Key capabilities:**
- Items CRUD with name, description, code/SKU, unit price (sell), cost price (buy), unit of measure, default tax code, default revenue/expense GL account
- Item types: Service, Product, or Both (sellable + purchasable)
- Search/autocomplete on invoice/bill line entry
- Per-item pricing tiers (future: quantity breaks, customer-specific pricing)
- Import items from CSV
- Item categories/groups for reporting
- Feature-flagged per workspace via Pennant

## Benefits

- **Faster invoicing** — line items populated in 2 clicks instead of 30 seconds of typing
- **Consistent data** — same item name, price, and GL mapping every time
- **Revenue analytics** — report on top-selling items, revenue by product/service
- **Foundation for inventory** — Items catalogue is the prerequisite for 063-INV stock tracking
- **Quote-to-invoice flow** — items bridge quotes → invoices → bills

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | — |
| **A** | — |
| **C** | — |
| **I** | — |

## Assumptions & Dependencies

- Depends on: 005-IAR (invoicing — line items model exists)
- Depends on: 002-CLE (chart of accounts — GL account mapping)
- Invoice/bill line entry UI must be updated to support item search
- Items are workspace-scoped (tenant isolation)

## Risks

- Retrofitting existing invoices/bills with item references requires data migration strategy
- Users with existing line item descriptions may resist switching to catalogue items

## Estimated Effort

**T-shirt size**: M (Medium)
- Backend: Item model, CRUD API, search, import — 1 sprint
- Frontend: Items list page, item form, line item autocomplete — 1 sprint
- Integration: Wire into invoice/bill/quote line entry — 1 sprint

## Proceed to Spec?

**YES** — Items is a foundational building block for invoicing quality, reporting, and the future inventory module.
