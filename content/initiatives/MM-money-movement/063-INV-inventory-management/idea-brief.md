---
title: "Idea Brief: Inventory Management"
---

# Idea Brief: Inventory Management

**Epic**: 063-INV
**Created**: 2026-03-21
**Initiative**: FL — MoneyQuest Ledger
**Status**: Idea
**Depends on**: 062-ITM (Items Catalogue)

---

## Problem Statement

Businesses that sell physical products need to track stock levels, know when to reorder, and correctly account for cost of goods sold (COGS). Without inventory tracking:

- **No stock visibility** — don't know what's in stock, what's running low
- **Manual COGS** — cost of goods sold calculated manually or not at all
- **No purchase order link** — buying stock isn't connected to the ledger
- **Stocktake pain** — physical counts have no system to reconcile against
- **Over/under ordering** — no reorder points or quantity alerts

## Possible Solution

An **Inventory module** built on top of the Items catalogue (062-ITM) that adds quantity tracking, stock movements, and COGS accounting.

**Before**: Sell 10 widgets, manually journal the COGS entry, no idea how many are left.

**After**: Sell 10 widgets via invoice → stock auto-decrements, COGS journal auto-posted, dashboard shows 15 remaining, reorder alert at 10.

**Key capabilities:**
- Stock on hand per item (quantity tracking)
- Stock movements: receive (purchase), sell (invoice), adjust (stocktake), transfer (location)
- Automatic COGS journal entries on sale (perpetual inventory method)
- Reorder points and low stock alerts
- Stocktake / inventory count workflow
- Multiple locations (warehouse, shop, van) — future phase
- Weighted average cost (WAC) or FIFO costing methods
- Inventory valuation report
- Feature-flagged per workspace (not all businesses need inventory)

## Benefits

- **Accurate COGS** — auto-posted journal entries, no manual calculation
- **Stock visibility** — real-time quantity on hand per item
- **Reorder automation** — alerts when stock hits reorder point
- **Audit trail** — every stock movement is a ledger event
- **Valuation reporting** — know the dollar value of inventory at any point

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | — |
| **A** | — |
| **C** | — |
| **I** | — |

## Assumptions & Dependencies

- **Hard dependency on 062-ITM** — inventory tracks quantities against Items
- Requires event sourcing for stock movements (InventoryAggregate)
- COGS journals post to the ledger via existing JournalEntryAggregate
- Only applies to items with type "Product" (not services)
- Costing method (WAC vs FIFO) is a workspace-level setting

## Risks

- Complexity of costing methods (WAC, FIFO, specific identification)
- Multi-location inventory adds significant data model complexity — defer to phase 2
- Partial shipments and backorders add edge cases
- Integration with bank feeds (purchase matching to stock receipts)

## Estimated Effort

**T-shirt size**: L (Large)
- Phase 1: Core stock tracking (receive, sell, adjust, COGS) — 2 sprints
- Phase 2: Stocktake workflow, reorder alerts — 1 sprint
- Phase 3: Multi-location, advanced costing — 2 sprints (future)

## Proceed to Spec?

**YES** — but only after 062-ITM is complete. Inventory builds directly on top of the Items catalogue.
