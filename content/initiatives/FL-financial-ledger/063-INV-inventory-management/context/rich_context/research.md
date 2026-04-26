---
title: "063-INV Inventory Management Research"
created: 2026-03-21
topic: "Inventory Management for Double-Entry Accounting SaaS"
sources_searched:
  web:
    - https://www.vintti.com/blog/how-to-manage-inventory-in-xero-a-guide-for-stock-control
    - https://www.finaleinventory.com/guides/xero-inventory-management/
    - https://dollarsense.ai/aasb-102-the-ultimate-guide-for-accountants-bookkeepers-and-financial-planners-june-2025/
    - https://www.aasb.gov.au/admin/file/content105/c9/AASB102_07-15_COMPdec16_01-19.pdf
    - https://engineering.salesforce.com/event-sourcing-for-an-inventory-availability-solution-3cc0daf5a742/
    - https://www.double-entry-bookkeeping.com/inventory/perpetual-inventory-system-journal-entries/
    - https://www.unleashedsoftware.com/app-marketplace/xero-inventory-management/xero-inventory-management-guide/
    - https://corporatefinanceinstitute.com/resources/accounting/weighted-average-cost-method/
  codebase:
    - app/Enums/AccountSubType.php
    - app/Aggregates/JournalEntryAggregate.php
    - app/Aggregates/InvoiceAggregate.php
    - app/Projectors/InvoiceProjector.php
    - app/Actions/Ledger/CreateJournalEntry.php
    - app/Actions/Workspace/ExtractBusinessFlags.php
    - app/Models/Tenant/InvoiceLine.php
    - database/seeders/Templates/json/overlays/has_inventory.json
---

# 063-INV Inventory Management Research

## Executive Summary

Inventory management for MoneyQuest Ledger is a natural extension of the existing event-sourced double-entry system. The codebase already has foundational pieces in place: an `INVENTORY` account sub-type in `AccountSubType` enum, a `COST_OF_GOODS_SOLD` expense sub-type, a `has_inventory` Chart of Accounts overlay that seeds Stock on Hand (asset) and COGS (expense) accounts, and the `has_inventory` business flag extracted during onboarding. What is missing is the actual inventory tracking engine -- the `InventoryAggregate`, stock movement events, quantity/valuation projectors, and the integration point where an invoice approval triggers automatic COGS journal entries.

The research confirms the **perpetual inventory system with weighted average cost (WAC)** as the right default approach. This aligns with both AASB 102 (which permits WAC and FIFO but prohibits LIFO) and with Xero's approach (WAC only). Xero's tracked inventory is a useful benchmark for what to build *and* what to improve upon -- Xero's 4,000-item ceiling, lack of multi-location support, no batch/serial tracking, and no FIFO option are well-documented pain points that MoneyQuest can address incrementally.

The event sourcing architecture already proven in `JournalEntryAggregate` and `InvoiceAggregate` maps cleanly to inventory. An `InventoryAggregate` per SKU (per workspace) would record `StockReceived`, `StockSold`, `StockAdjusted`, and `StockTransferred` events. Projectors would maintain the `inventory_items` read model (quantity on hand, WAC unit cost, total valuation) and trigger COGS journal entries via the existing `CreateJournalEntry` action.

---

## 1. Xero Inventory Analysis

### How Xero Tracked Inventory Works

Xero's native inventory system provides basic stock tracking with automatic COGS calculation. Key characteristics:

| Feature | How Xero Does It |
|---------|-------------------|
| **Costing method** | Weighted Average Cost (WAC) only -- no FIFO, no specific identification |
| **Stock increases** | Creating a bill (purchase) increases quantity on hand |
| **Stock decreases** | Creating an invoice (sale) decreases quantity on hand |
| **COGS journals** | Auto-posted when an invoice is approved -- DR COGS / CR Stock on Hand |
| **Valuation** | On-hand quantity x WAC unit cost, recalculated on each purchase |
| **Negative stock** | Not permitted -- cannot sell more than you have |
| **Stock adjustments** | Manual adjustments via item page (quantity and/or value) |
| **Purchase orders** | Basic PO creation, can convert to bill when goods arrive |
| **Item limit** | ~4,000 tracked items before performance degrades |

### WAC Recalculation in Xero

Every time a purchase is recorded, the WAC is recalculated:

```
New WAC = (Existing Stock Value + New Purchase Value) / (Existing Qty + New Qty)

Example:
  Before: 50 units @ $10.00 WAC = $500 total value
  Purchase: 30 units @ $12.00 = $360
  After:  80 units @ $10.75 WAC = $860 total value

  WAC = ($500 + $360) / (50 + 30) = $10.75
```

### What Xero Gets Right

- **Zero-config COGS**: Users don't need to understand double-entry -- selling a tracked item auto-posts the COGS journal
- **Simple setup**: Toggle "tracked inventory" on an item, set purchase/sale accounts, done
- **Average cost smoothing**: WAC removes the need to track individual purchase lots
- **Integrated with invoicing**: No separate "stock dispatch" step -- the invoice IS the stock reduction

### What Xero Gets Wrong (Known Pain Points)

| Limitation | Impact | MoneyQuest Opportunity |
|------------|--------|------------------------|
| **WAC only** | Businesses with perishable/seasonal goods need FIFO | Offer WAC default + FIFO per workspace setting |
| **No multi-location** | Businesses with warehouse + shop cannot track per location | Phase 2: location-level stock |
| **No batch/serial tracking** | Electronics, pharmaceuticals need lot tracking | Phase 3 or integration |
| **4,000 item ceiling** | Medium retailers outgrow Xero fast | No artificial limit |
| **No negative stock** | Make-to-order / drop-ship businesses blocked | Allow with warning/config |
| **No landed costs** | Freight/duties cannot be added to item cost | Include in stock receipt |
| **No cycle counting** | Only full stocktake, no rolling count | Build cycle count workflow |
| **No PO approvals** | POs are informal -- no approval workflow | Leverage existing approval patterns |
| **Basic reports** | No aging, no slow-moving stock analysis | AI-powered inventory insights |

### Sources

- [Xero Stock Control Guide -- Vintti](https://www.vintti.com/blog/how-to-manage-inventory-in-xero-a-guide-for-stock-control)
- [Xero Inventory Management -- Finale Inventory](https://www.finaleinventory.com/guides/xero-inventory-management/)
- [Xero Inventory Limitations -- Unleashed](https://www.unleashedsoftware.com/app-marketplace/xero-inventory-management/xero-inventory-management-guide/)
- [Xero Tracked Inventory Limits -- Xero Community](https://central.xero.com/s/question/0D53m00009hsQvfCAE/tracked-inventory-limits)

---

## 2. Accounting Standards -- AASB 102 (Inventories)

### Definition

AASB 102 (equivalent to IAS 2) defines inventories as assets that are:
- Held for sale in the ordinary course of business
- In the process of production for sale
- Raw materials or supplies to be consumed in production or service delivery

### Measurement Rule: Lower of Cost and NRV

Inventories must be measured at the **lower of cost and net realisable value (NRV)**.

- **Cost** = purchase price + conversion costs + other costs to bring to present condition/location
- **NRV** = estimated selling price - estimated costs of completion - estimated selling costs

When NRV falls below cost (obsolescence, damage, market decline), a **write-down is mandatory**. Write-downs are reversible if circumstances improve.

### Permitted Costing Methods

| Method | Description | When Appropriate | Permitted? |
|--------|-------------|------------------|------------|
| **Weighted Average Cost (WAC)** | Average of all purchases weighted by quantity | Fungible goods, commodities, general merchandise | Yes |
| **FIFO (First-In, First-Out)** | Oldest inventory sold first | Perishable goods, seasonal stock, fashion | Yes |
| **Specific Identification** | Each item tracked individually by actual cost | Unique/high-value items (cars, jewellery, art) | Yes (for items not ordinarily interchangeable) |
| **LIFO (Last-In, First-Out)** | Newest inventory sold first | N/A | **Prohibited under AASB 102** |

### Key Requirements

1. **Consistency**: An entity must use the **same cost formula** for all inventories of a similar nature and use
2. **Costing method is a workspace-level setting** -- this aligns with AASB 102's consistency requirement
3. **Write-downs recognised as expense** in the period they occur
4. **Disclosure requirements**:
   - Accounting policies used (which costing method)
   - Total carrying amount and carrying amount by classification
   - Amount of inventories recognised as expense (COGS)
   - Write-downs and reversals
   - Inventories pledged as security (if any)

### Implications for MoneyQuest

- **Default to WAC** -- simplest, covers 90%+ of small-medium businesses
- **Offer FIFO as workspace setting** -- required for perishables, seasonal goods
- **Do NOT implement LIFO** -- prohibited in Australia (and all IFRS jurisdictions)
- **Specific identification** -- defer to Phase 3 (high-value asset tracking)
- **NRV write-down** -- implement as a stock adjustment type
- **Disclosure data** -- ensure the inventory valuation report can produce AASB 102 disclosure figures

### Sources

- [AASB 102 Guide -- DollarSense.ai](https://dollarsense.ai/aasb-102-the-ultimate-guide-for-accountants-bookkeepers-and-financial-planners-june-2025/)
- [AASB 102 Standard PDF -- AASB.gov.au](https://www.aasb.gov.au/admin/file/content105/c9/AASB102_07-15_COMPdec16_01-19.pdf)

---

## 3. COGS Journal Entry Pattern (Perpetual Inventory)

### The Two Journal Entries on Sale

In a perpetual inventory system, **every sale triggers two double-entry transactions**:

**Transaction 1 -- Revenue Recognition (at sell price)**
```
DR  Accounts Receivable     $1,500   (what the customer owes)
CR  Sales Revenue            $1,500   (revenue earned)
```

**Transaction 2 -- COGS Recognition (at cost)**
```
DR  Cost of Goods Sold         $900   (expense: the cost of stock sold)
CR  Stock on Hand (Inventory)  $900   (asset reduction: stock leaves warehouse)
```

The sell price and cost are independent amounts. The difference ($600 in this example) is the gross profit.

### How This Maps to MoneyQuest's Existing System

The existing system already handles Transaction 1 when an invoice is approved -- the `InvoiceProjector` creates the invoice read model. Currently, there is no automatic journal entry creation on invoice approval. The COGS journal would need to be triggered when:

1. An invoice containing **tracked inventory items** is approved
2. The system looks up each line item's `item_id` to check if it is a tracked inventory item
3. For tracked items, calculate the COGS amount: `quantity_sold x WAC_unit_cost`
4. Post a COGS journal via `CreateJournalEntry` action with `sourceType: 'inventory_cogs'`

### Integration Point with Existing Ledger

```
Invoice Approved Event
  |
  v
InvoiceProjector (existing) -- updates invoice read model
  |
  v
InventoryStockSoldReactor (NEW) -- listens for InvoiceApproved
  |
  ├── For each tracked inventory line:
  |   ├── InventoryAggregate->sellStock(itemId, qty, wac)
  |   |     records StockSold event
  |   └── InventoryProjector updates quantity on hand
  |
  └── CreateJournalEntry action:
        sourceType: 'inventory_cogs'
        sourceId: invoice.id
        lines:
          - DR COGS account, amount = qty x WAC
          - CR Inventory Asset account, amount = qty x WAC
```

### Purchase Side (Stock Receipt)

When a bill (purchase invoice) is approved for tracked inventory items:

```
Bill Approved Event
  |
  v
InventoryStockReceivedReactor (NEW) -- listens for BillApproved
  |
  ├── For each tracked inventory line:
  |   ├── InventoryAggregate->receiveStock(itemId, qty, unitCost)
  |   |     records StockReceived event
  |   └── InventoryProjector updates quantity + recalculates WAC
  |
  └── No additional journal needed -- the bill approval already
      posts: DR Stock on Hand / CR Accounts Payable
      (the bill's line items use the inventory asset account)
```

### Stocktake Adjustment

```
Stock Adjustment Action
  |
  v
InventoryAggregate->adjustStock(itemId, adjustmentQty, reason)
  |  records StockAdjusted event
  |
  v
InventoryProjector updates quantity on hand
  |
  v
CreateJournalEntry action:
  sourceType: 'inventory_adjustment'
  lines:
    If increase: DR Stock on Hand / CR Stock Adjustment (expense/income)
    If decrease: DR Stock Adjustment / CR Stock on Hand
```

### Sources

- [Perpetual Inventory Journal Entries -- Double Entry Bookkeeping](https://www.double-entry-bookkeeping.com/inventory/perpetual-inventory-system-journal-entries/)
- [Perpetual Inventory System -- Accounting For Management](https://www.accountingformanagement.org/perpetual-inventory-system/)
- [Inventory Journal Entries Guide -- HubiFi](https://www.hubifi.com/blog/journal-entries-inventory-cogs)

---

## 4. Stock Movement Events (Event Sourcing Design)

### Proposed Aggregate: InventoryAggregate

One aggregate instance per **item** per **workspace**. The aggregate UUID would be a composite: `{workspace_id}:{item_id}` or a dedicated UUID per inventory record.

```php
class InventoryAggregate extends AggregateRoot
{
    protected int $workspaceId = 0;
    protected int $itemId = 0;
    protected int $quantityOnHand = 0;       // units (integer)
    protected int $totalCostCents = 0;        // total value in cents
    protected int $wacUnitCostCents = 0;      // WAC per unit in cents
    protected string $costingMethod = 'wac';  // 'wac' or 'fifo'
}
```

### Event Catalogue

| Event | Trigger | Payload | Effect on State |
|-------|---------|---------|-----------------|
| `StockReceived` | Bill approved (purchase) | itemId, qty, unitCostCents, supplierRef, billId | qty += received; recalculate WAC |
| `StockSold` | Invoice approved (sale) | itemId, qty, unitCostAtSale, invoiceId | qty -= sold; no WAC change |
| `StockAdjusted` | Stocktake / write-off | itemId, adjustmentQty (+/-), reason, adjustedBy | qty += adjustment; optionally adjust value |
| `StockTransferred` | Location transfer (future) | itemId, qty, fromLocationId, toLocationId | No net change (per-location sub-aggregates) |
| `StockWrittenDown` | NRV falls below cost | itemId, newValueCents, reason | Reduce totalCostCents; recalculate WAC |
| `StockOpened` | Initial setup / opening balance | itemId, qty, unitCostCents | Set initial state |
| `CostingMethodChanged` | Workspace setting change | oldMethod, newMethod | Triggers revaluation |

### WAC Recalculation Logic (in Aggregate)

```php
public function receiveStock(
    int $workspaceId,
    int $itemId,
    int $quantity,
    int $unitCostCents,
    ?int $billId = null,
): self {
    $this->guardPositiveQuantity($quantity);

    // Calculate new WAC
    $existingValue = $this->totalCostCents;
    $newPurchaseValue = $quantity * $unitCostCents;
    $newTotalQty = $this->quantityOnHand + $quantity;
    $newWac = $newTotalQty > 0
        ? intdiv($existingValue + $newPurchaseValue, $newTotalQty)
        : 0;

    $this->recordThat(new StockReceived(
        workspaceId: $workspaceId,
        itemId: $itemId,
        quantity: $quantity,
        unitCostCents: $unitCostCents,
        newWacCents: $newWac,
        newQuantityOnHand: $newTotalQty,
        newTotalCostCents: $existingValue + $newPurchaseValue,
        billId: $billId,
    ));

    return $this;
}
```

### FIFO Alternative (Phase 2)

For FIFO, the aggregate would maintain a **lot queue** instead of a single WAC:

```php
// FIFO state in aggregate
protected array $lots = []; // [{qty: 50, unitCost: 1000}, {qty: 30, unitCost: 1200}]

// On sale, consume from oldest lot first
public function sellStock(...): self {
    $remainingQty = $quantity;
    $totalCost = 0;
    foreach ($this->lots as &$lot) {
        $take = min($lot['qty'], $remainingQty);
        $totalCost += $take * $lot['unitCost'];
        $lot['qty'] -= $take;
        $remainingQty -= $take;
        if ($remainingQty <= 0) break;
    }
    // COGS = $totalCost (sum of lots consumed)
}
```

### Projectors

**InventoryProjector** -- maintains `inventory_items` read model:

| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key |
| workspace_id | int | Tenant scope |
| item_id | int | FK to items catalogue |
| quantity_on_hand | int | Current stock level |
| wac_unit_cost | int | Weighted average cost per unit (cents) |
| total_value | int | quantity_on_hand x wac_unit_cost (cents) |
| reorder_point | int | Trigger alert when qty falls to this |
| reorder_quantity | int | Suggested reorder amount |
| last_received_at | datetime | Last stock receipt |
| last_sold_at | datetime | Last stock sale |

**StockMovementProjector** -- maintains `stock_movements` audit log:

| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key |
| workspace_id | int | Tenant scope |
| item_id | int | FK to items catalogue |
| movement_type | enum | received, sold, adjusted, transferred, written_down |
| quantity | int | Signed quantity (+receive, -sell, +/-adjust) |
| unit_cost | int | Cost per unit at time of movement (cents) |
| total_cost | int | Absolute cost of this movement (cents) |
| running_qty | int | Quantity after this movement |
| running_value | int | Total value after this movement (cents) |
| reference_type | string | invoice, bill, adjustment, transfer |
| reference_id | int | FK to source document |
| reason | string | Nullable -- for adjustments/write-downs |
| created_by | int | User who triggered the movement |
| created_at | datetime | Timestamp |

### Snapshot Strategy

Following the established pattern and Salesforce's recommendation, snapshot every **100 events** per aggregate. Inventory aggregates will accumulate events faster than journal entries (every purchase and sale), so snapshots are critical for replay performance.

### Sources

- [Event Sourcing for Inventory -- Salesforce Engineering](https://engineering.salesforce.com/event-sourcing-for-an-inventory-availability-solution-3cc0daf5a742/)
- [Event Sourcing Pattern -- Microsoft Azure](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)

---

## 5. Reorder Points & Alerts

### Reorder Point Logic

```
Reorder Point = (Average Daily Usage x Lead Time in Days) + Safety Stock

Example:
  Average daily sales: 5 units
  Supplier lead time: 7 days
  Safety stock: 10 units
  Reorder point: (5 x 7) + 10 = 45 units
```

When `quantity_on_hand <= reorder_point`, trigger a low stock alert.

### Implementation Approach

**Per-item settings** (on the inventory_items read model):
- `reorder_point` -- quantity threshold (nullable; null = no alert)
- `reorder_quantity` -- suggested quantity to order (nullable)
- `safety_stock` -- minimum buffer (nullable)

**Alert mechanism**:
- The `InventoryProjector`, after updating quantity on a `StockSold` or `StockAdjusted` event, checks if `quantity_on_hand <= reorder_point`
- If triggered, dispatch a `LowStockDetected` notification event
- Notification delivered via the existing notification system (in-app + optional email)
- Alert should include: item name, current qty, reorder point, suggested order qty, preferred supplier

**Dashboard widget**:
- "Low Stock Items" card showing items below reorder point
- Sorted by urgency (furthest below reorder point first)
- Quick action: "Create Purchase Order" from the alert

### Advanced (Phase 2+)

- **Auto-generate draft PO** when reorder point hit
- **Seasonal adjustment** -- AI-suggested reorder points based on historical sales velocity
- **Supplier lead time tracking** -- auto-calculate from historical bill dates vs PO dates

---

## 6. Existing Codebase Analysis

### What Already Exists

| Component | Location | Relevance |
|-----------|----------|-----------|
| `AccountSubType::INVENTORY` | `app/Enums/AccountSubType.php` line 11 | Inventory asset sub-type already in enum |
| `AccountSubType::COST_OF_GOODS_SOLD` | `app/Enums/AccountSubType.php` line 83 | COGS expense sub-type already in enum |
| `has_inventory` CoA overlay | `database/seeders/Templates/json/overlays/has_inventory.json` | Seeds 3 accounts: Stock on Hand (11500, asset/inventory), COGS (51000, expense/cogs), Purchases (51100, expense/cogs) |
| `has_inventory` business flag | `app/Actions/Workspace/ExtractBusinessFlags.php` line 16 | AI extracts this flag during onboarding |
| `InvoiceLine.quantity` | `app/Models/Tenant/InvoiceLine.php` | Already tracks quantity per line (integer, x100 for 2dp precision) |
| `JournalEntryAggregate` | `app/Aggregates/JournalEntryAggregate.php` | Proven event sourcing pattern to follow |
| `InvoiceAggregate` | `app/Aggregates/InvoiceAggregate.php` | Source of `InvoiceApproved` event to react to |
| `InvoiceProjector` | `app/Projectors/InvoiceProjector.php` | Pattern for building read models from events |
| `CreateJournalEntry` action | `app/Actions/Ledger/CreateJournalEntry.php` | Entry point for posting auto-journals (supports `sourceType` parameter) |
| `CoaOverlayModule` model | `app/Models/Tenant/CoaOverlayModule.php` | Feature flag overlay system for CoA |

### What Does NOT Exist Yet

| Component | Needed For | Notes |
|-----------|-----------|-------|
| **Items catalogue (062-ITM)** | Hard dependency -- inventory tracks against items | No `items` table, model, or migration exists. This epic MUST complete first |
| `InventoryAggregate` | Core stock tracking | New aggregate root |
| Stock movement events | Recording all inventory changes | 5-7 new event classes |
| `InventoryProjector` | Read models for quantity/valuation | New projector |
| `StockMovementProjector` | Audit trail of all movements | New projector |
| `inventory_items` table | Stock levels per item | New migration |
| `stock_movements` table | Movement audit log | New migration |
| Inventory controllers + API | CRUD for stock, adjustments, reports | New controller(s) |
| Inventory frontend pages | Stock list, item detail, stocktake, reports | New Next.js pages |
| COGS reactor/listener | Auto-post COGS journal on invoice approval | New event listener |
| `CostingMethod` enum | WAC vs FIFO workspace setting | New enum |
| `StockMovementType` enum | received, sold, adjusted, transferred, written_down | New enum |

### Quantity Precision Note

Invoice lines store `quantity` as integer with x100 multiplier (so `1.50` = `150`). The idea brief mentions "stock on hand per item (quantity tracking)" -- for inventory, whole units are typical (you stock 50 widgets, not 50.00). However, some businesses sell by weight/volume (e.g., 2.5kg of coffee). The Items catalogue (062-ITM) will need to define whether an item uses whole units or decimal units, and the inventory system should respect this.

### Integration Architecture

```
                    ┌─────────────────────┐
                    │   Items Catalogue    │  (062-ITM -- dependency)
                    │   item.is_tracked    │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              v                v                v
     ┌────────────┐   ┌──────────────┐   ┌───────────┐
     │  Invoicing  │   │   Billing    │   │ Stocktake │
     │  (sales)    │   │  (purchases) │   │ (adjust)  │
     └──────┬─────┘   └──────┬───────┘   └─────┬─────┘
            │                │                  │
            v                v                  v
     ┌──────────────────────────────────────────────┐
     │          InventoryAggregate                   │
     │  StockSold  StockReceived  StockAdjusted      │
     └──────────────────┬───────────────────────────┘
                        │
           ┌────────────┼────────────────┐
           v            v                v
    ┌────────────┐ ┌───────────┐ ┌──────────────┐
    │ Inventory  │ │ Stock     │ │ COGS Journal │
    │ Projector  │ │ Movement  │ │ Reactor      │
    │ (qty/val)  │ │ Projector │ │ (auto-post)  │
    └────────────┘ └───────────┘ └──────┬───────┘
                                        │
                                        v
                               ┌────────────────┐
                               │ JournalEntry   │
                               │ Aggregate      │
                               │ (existing)     │
                               └────────────────┘
```

---

## Synthesis

### Consolidated Requirements

1. **Perpetual inventory with WAC default** -- Confirmed by AASB 102 compliance, Xero precedent, and simplicity for SMBs. (Sources: AASB 102, Xero analysis, codebase has_inventory overlay)

2. **FIFO as workspace-level alternative** -- Required for perishable/seasonal goods. AASB 102 permits both WAC and FIFO. (Source: AASB 102)

3. **Auto COGS journals on invoice approval** -- Two-entry pattern: DR COGS / CR Stock on Hand at WAC cost. Triggered by `InvoiceApproved` event for tracked items. (Sources: perpetual inventory accounting, Xero behaviour)

4. **Event-sourced InventoryAggregate** -- Per-item aggregate with StockReceived, StockSold, StockAdjusted events. Follows proven pattern from JournalEntryAggregate. (Sources: codebase patterns, Salesforce event sourcing)

5. **Stock movement audit trail** -- Every movement recorded as immutable event with running quantity and value. (Sources: AASB 102 disclosure, event sourcing pattern)

6. **Reorder point alerts** -- Per-item threshold with in-app notification when stock falls below. (Source: idea brief, Xero feature parity)

7. **Inventory valuation report** -- Must produce AASB 102 disclosure figures: carrying amount, COGS recognised, write-downs. (Source: AASB 102)

8. **Feature-flagged via has_inventory** -- Already extracted during onboarding, already seeds CoA accounts. (Source: codebase ExtractBusinessFlags, has_inventory.json overlay)

9. **Hard dependency on 062-ITM (Items Catalogue)** -- No items table exists yet. Inventory needs `item.is_tracked` boolean to distinguish tracked products from services. (Source: codebase search, idea brief)

### Recommended Phase Breakdown

**Phase 1 -- Core Stock Tracking (MVP)**
- InventoryAggregate with StockReceived, StockSold, StockAdjusted events
- WAC costing only
- Auto COGS journal on invoice approval
- Stock receipt on bill approval
- Manual stock adjustments (stocktake)
- Inventory items list page with quantity/value
- Stock movement history per item

**Phase 2 -- Alerts & Stocktake Workflow**
- Reorder point settings per item
- Low stock notifications
- Stocktake workflow (count sheet, variance review, bulk adjust)
- Inventory valuation report
- NRV write-down adjustments

**Phase 3 -- Advanced Costing & Locations**
- FIFO costing method (workspace setting)
- Multi-location inventory (StockTransferred event)
- Opening balances import
- Landed cost allocation on stock receipts
- Cycle counting

### Open Questions

1. [ ] **062-ITM scope** -- Has the Items Catalogue epic been specified? Inventory is blocked until it exists. What is the `items` table schema?
2. [ ] **Quantity precision** -- Should inventory quantities use whole units (integer) or decimal (x100 like invoice lines)? Depends on item types (whole widgets vs kg of coffee).
3. [ ] **Negative stock policy** -- Should the system prevent selling more than on-hand (like Xero) or allow with a warning? Make-to-order businesses need negative stock.
4. [ ] **Bill approval trigger** -- Does the current bill approval flow auto-post a journal? If so, does it already debit Stock on Hand? Or does it debit Purchases (periodic method)?
5. [ ] **Aggregate granularity** -- One aggregate per item per workspace, or one aggregate per workspace with all items? Per-item is cleaner but creates many aggregate streams.
6. [ ] **Multi-currency stock** -- If items are purchased in foreign currency, should WAC be calculated in base currency after FX conversion, or tracked in original currency?

### Recommended Next Steps

- **Spec 062-ITM first** -- define the Items Catalogue schema (`items` table with `is_tracked`, `purchase_account_id`, `sale_account_id`, `inventory_account_id`)
- **Proceed to spec 063-INV** once Items is defined -- this research provides the technical foundation
- Consider building Items + Inventory as a single sprint delivery since they are tightly coupled
