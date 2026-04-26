---
title: "Items Catalogue (Products & Services) Research Document"
created: 2026-03-21
topic: "062-ITM Items Catalogue"
sources_searched:
  web:
    - "https://developer.xero.com/documentation/api/accounting/items"
    - "https://developer.myob.com/api/myob-business-api/v2/inventory/item/"
    - "https://www.synchub.io/connectors/xero/datamodel"
    - "https://avers.com.au/Bookkeeping/Blog/Using-Items-in-Xero-for-faster-Invoicing/"
    - "https://productideas.xero.com/forums/939198-for-small-businesses"
  codebase:
    - "app/Models/Tenant/InvoiceLine.php"
    - "app/Models/Tenant/Invoice.php"
    - "app/Models/Tenant/ChartAccount.php"
    - "app/Models/Tenant/TaxCode.php"
    - "app/Data/InvoiceLineData.php"
    - "app/Actions/Invoicing/CreateInvoice.php"
    - "app/Events/Invoicing/InvoiceCreated.php"
    - "app/Enums/AccountType.php"
    - "app/Enums/AccountSubType.php"
    - "database/migrations/2026_03_01_100002_create_invoices_table.php"
    - "database/seeders/Templates/json/overlays/has_inventory.json"
    - "frontend/src/components/line-item-grid/types.ts"
    - "frontend/src/components/line-item-grid/line-item-grid.tsx"
---

# Items Catalogue (Products & Services) Research Document

## Executive Summary

MoneyQuest Ledger needs a centralised Items catalogue -- a master list of products and services that auto-populate invoice/bill line items with description, price, tax code, and GL account. This is a foundational building block: it speeds up data entry, ensures consistency, enables per-product revenue/cost analytics, and is a prerequisite for future inventory tracking (063-INV).

Research across Xero and MYOB reveals a mature, well-understood pattern: items are simple CRUD entities (not event-sourced) with separate sell/buy configurations, each mapping to GL accounts and tax codes. The key differentiator between platforms is how they handle inventory tracking -- Xero bolts it on as an optional flag, MYOB treats it as a first-class feature with locations and restocking alerts.

MoneyQuest's codebase is already **partially prepared** for items. The frontend `LineItemGrid` component has an `item_code` column stubbed in (visible on invoice/credit variants), the `LineItem` TypeScript interface includes `item_code?: string`, and the column visibility system supports toggling it. The backend `InvoiceLine` model and migration have no item reference yet -- this is the primary gap.

---

## Competitor Analysis

### Xero Items Data Model

Xero's Items API exposes a flat model with nested sell/buy detail objects.

| Field | Type | Description |
|-------|------|-------------|
| `ItemID` | guid | Unique identifier (auto-generated) |
| `Code` | string | Short item code, unique per org (max ~30 chars) |
| `Name` | string | Item name (not shown to customers in Xero -- used for internal search) |
| `Description` | string | Sales description (shown on invoices) |
| `PurchaseDescription` | string | Purchase description (shown on bills) |
| `IsSold` | boolean | Available for sales transactions (default true) |
| `IsPurchased` | boolean | Available for purchase transactions (default true) |
| `SalesDetails.UnitPrice` | decimal | Default sell price (exclusive of tax) |
| `SalesDetails.AccountCode` | string | Revenue GL account code |
| `SalesDetails.TaxType` | string | Default sales tax type |
| `PurchaseDetails.UnitPrice` | decimal | Default purchase price |
| `PurchaseDetails.AccountCode` | string | Expense GL account code |
| `PurchaseDetails.COGSAccountCode` | string | COGS account (tracked items only) |
| `PurchaseDetails.TaxType` | string | Default purchase tax type |
| `IsTrackedAsInventory` | boolean | Enables quantity-on-hand tracking |
| `InventoryAssetAccountCode` | string | Asset account for tracked inventory |
| `TotalCostPool` | decimal | Total cost of current stock |
| `QuantityOnHand` | decimal | Current stock level |
| `UpdatedDateUTC` | datetime | Last modified timestamp |

**Xero UX for Invoice Lines:**
- User types in the "Item" column or clicks the dropdown
- Typing the item code and pressing Tab auto-selects and populates the line
- On selection, the following auto-fill: description, unit price, GL account, tax rate
- Users can override any auto-filled value before saving
- Items are created inline from the invoice form ("+ New Item" in dropdown)

**What Xero Does Well:**
- Simple, flat model -- easy to understand
- Separate sell/buy descriptions and prices -- same item can have different descriptions on invoices vs bills
- Quick inline item creation from invoice form
- Code-based search is fast (type code, press Tab)
- Optional inventory tracking -- service businesses don't see stock complexity

**What Users Complain About:**
- No search by description -- only code/name matching, not description text
- No item categories/groups for reporting
- No quantity-based pricing / price breaks
- No customer-specific pricing
- No unit of measure field (items are just "units")
- Limited bulk editing of items
- New invoicing UI regressions make line item entry slower overall
- Cannot copy invoice line items easily

### MYOB Items Data Model

MYOB has a significantly more detailed item model with inventory-first design.

| Field | Type | Description |
|-------|------|-------------|
| `UID` | guid | Unique identifier |
| `Number` | string(30) | Item number/code |
| `Name` | string(30) | Item name |
| `Description` | string(255) | Full description |
| `UseDescription` | boolean | Use description text instead of name on forms |
| `IsActive` | boolean | Active/inactive status |
| `IsBought` | boolean | Available for purchase |
| `IsSold` | boolean | Available for sale |
| `IsInventoried` | boolean | Tracked in inventory |
| `QuantityOnHand` | decimal(13.3) | Current stock |
| `QuantityCommitted` | decimal(13.3) | Allocated to pending sales |
| `QuantityOnOrder` | decimal(13.3) | On pending purchase orders |
| `QuantityAvailable` | decimal(13.3) | Calculated available for sale |
| `AverageCost` | decimal(13.6) | Weighted average cost |
| `CurrentValue` | decimal(13.6) | Total inventory value |
| `BaseSellingPrice` | decimal(13.6) | Base sell price (tax-inclusive) |
| **SellingDetails** | | |
| `.BaseSellingPrice` | decimal(12.6) | Standard selling price per unit |
| `.SellingUnitOfMeasure` | string | Unit description (kg, hour, etc.) |
| `.ItemsPerSellingUnit` | decimal | Items per selling unit |
| `.IsTaxInclusive` | boolean | Prices include tax |
| `.TaxCode` | object | Tax code reference |
| `.CalculateSalesTaxOn` | enum | Tax calculation basis |
| **BuyingDetails** | | |
| `.LastPurchasePrice` | decimal(12.6) | Last purchase price (tax-inclusive) |
| `.StandardCost` | decimal(12.6) | Standard buy price per unit |
| `.BuyingUnitOfMeasure` | string | Purchase unit (kg, hour, etc.) |
| `.ItemsPerBuyingUnit` | decimal | Items per buying unit |
| `.TaxCode` | object | Purchase tax code |
| `.RestockingInformation` | object | Min level, supplier, order qty |
| **Account References** | | |
| `IncomeAccount` | object | Revenue account (UID, Name, DisplayID) |
| `CostOfSalesAccount` | object | COGS account |
| `ExpenseAccount` | object | Expense account |
| `AssetAccount` | object | Inventory asset account |
| **Custom Fields** | | |
| `CustomList1-3` | object | Custom dropdown fields |
| `CustomField1-3` | object | Custom text fields |
| **Locations** | | |
| `LocationDetails` | array | Stock per location |
| `DefaultSellLocation` | object | Default outbound location |
| `DefaultReceiveLocation` | object | Default inbound location |

**What MYOB Does Better Than Xero:**
- Unit of measure on both sell and buy sides
- Items per unit (e.g., 12 items per "box")
- Restocking information (min level, preferred supplier, default order qty)
- Multi-location inventory
- Custom fields (3 lists + 3 text fields)
- Price matrix with multiple price levels (A-F) and quantity breaks
- `QuantityCommitted` / `QuantityOnOrder` / `QuantityAvailable` breakdown

**What MYOB Does Worse:**
- More complex -- steeper learning curve for service-only businesses
- Name limited to 30 characters
- No inline creation from invoice forms (must go to Items list)
- Heavier data model even when inventory isn't needed

### Comparison Table: Xero vs MYOB vs MoneyQuest (Proposed)

| Feature | Xero | MYOB | MoneyQuest (Proposed) |
|---------|------|------|----------------------|
| **Item code** | Yes (unique per org) | Yes ("Number", 30 chars) | Yes (unique per workspace, optional) |
| **Name** | Yes | Yes (30 chars max) | Yes (255 chars) |
| **Sell description** | Yes (separate from purchase) | Yes (single, toggle) | Yes (separate sell/buy descriptions) |
| **Buy description** | Yes (separate) | Same as name (toggle) | Yes (separate) |
| **Sell price** | Yes (ex-tax) | Yes (inc or ex-tax) | Yes (in cents, ex-tax) |
| **Buy price** | Yes | Yes ("StandardCost") | Yes (in cents, ex-tax) |
| **Default sell GL account** | Yes (by code) | Yes (by UID) | Yes (by chart_account_id FK) |
| **Default buy GL account** | Yes (by code) | Yes ("ExpenseAccount") | Yes (by chart_account_id FK) |
| **Default sell tax code** | Yes (TaxType string) | Yes (TaxCode object) | Yes (tax_code string) |
| **Default buy tax code** | Yes (TaxType string) | Yes (TaxCode object) | Yes (tax_code string) |
| **IsSold flag** | Yes | Yes | Yes |
| **IsPurchased flag** | Yes | Yes | Yes |
| **Item type enum** | No (use IsSold/IsPurchased) | No (use IsBought/IsSold) | Yes (`service` / `product` / `both`) |
| **Unit of measure** | No | Yes (sell + buy separately) | Yes (single field, v1) |
| **Inventory tracking** | Optional flag | Optional flag | Deferred to 063-INV |
| **Categories/groups** | No | No (custom fields workaround) | Yes (item_category) |
| **Active/inactive** | Via status | Yes (IsActive) | Yes (is_active) |
| **Custom fields** | No | Yes (6 custom fields) | Deferred |
| **Price breaks** | No | Yes (price matrix A-F) | Deferred |
| **Customer-specific pricing** | No | Via price matrix | Deferred |
| **Multi-location stock** | No | Yes | Deferred to 063-INV |
| **Restocking alerts** | No | Yes | Deferred to 063-INV |
| **Search on invoice line** | Code/name only | Code/name | Code, name, AND description |
| **Inline creation** | Yes ("+ New Item") | No | Yes ("+ New Item" in combobox) |

---

## Existing Codebase Analysis

### Current Invoice Line Model

**`app/Models/Tenant/InvoiceLine.php`** has these fields:
```
invoice_id, description, quantity, unit_price, amount,
tax_code, tax_amount, chart_account_id, job_id, sort_order
```

Notable characteristics:
- `quantity` is stored as integer x100 (e.g., 1050 = 10.50 units)
- `unit_price` is in cents
- `amount` is computed server-side: `(quantity / 100) * unit_price`
- `tax_code` is a string (e.g., "GST"), not a FK to TaxCode model
- `chart_account_id` is a nullable FK to `chart_accounts`
- No `item_id` or `item_code` reference exists yet

### Current Invoice Line Migration

**`database/migrations/2026_03_01_100002_create_invoices_table.php`** creates the `invoice_lines` table with the fields above. The `job_id` column was added in a separate migration.

### InvoiceLineData DTO

**`app/Data/InvoiceLineData.php`** mirrors the model fields exactly:
```php
description, quantity, unit_price, tax_code, tax_amount,
chart_account_id, job_id, sort_order
```

### InvoiceCreated Event

**`app/Events/Invoicing/InvoiceCreated.php`** stores `lines` as a raw `array` (the normalized line arrays). Item references would need to be included in this event payload when items are selected.

### CreateInvoice Action

**`app/Actions/Invoicing/CreateInvoice.php`** receives lines as arrays, normalizes them (calculates amount from qty x price), and passes them through the InvoiceAggregate. The normalizeLines method would need to resolve item defaults when an `item_id` is present.

### Frontend LineItemGrid

**`frontend/src/components/line-item-grid/`** is the universal grid used for all document types.

Key findings:
- **`item_code` column already exists** in the grid column definitions
- It's **visible by default** on `invoice` and `credit` variants
- It's currently rendered as an `EditableTextCell` (plain text input) -- needs to become a combobox/autocomplete
- The `LineItem` TypeScript interface includes `item_code?: string`
- The `GridLookups` interface does NOT yet include items (only accounts, taxCodes, contacts, jobs)
- The `ColumnVisibility` interface already has `item_code: boolean`

### Chart of Accounts Setup

The CoA system already supports all GL account types needed for items:

| Account Need | Existing Support |
|---|---|
| Revenue account (sell) | `AccountType::Revenue`, sub-types: `SALES`, `SALES_REVENUE`, `SERVICE_REVENUE` |
| Expense account (buy) | `AccountType::Expense`, sub-types: `DIRECT_COST`, `COST_OF_GOODS_SOLD` |
| COGS account | `AccountSubType::COST_OF_GOODS_SOLD` (code 51000 in CoA templates) |
| Inventory asset | `AccountSubType::INVENTORY` (code 11500 in `has_inventory` overlay) |

The `has_inventory` CoA overlay already defines:
- `11500 Stock on Hand` (asset, inventory sub-type)
- `51000 Cost of Goods Sold` (expense, cost_of_goods_sold)
- `51100 Purchases` (expense, cost_of_goods_sold)

### No Existing Item/Product Concept

Grep confirms **zero** references to `item_id`, `product_id`, or any item catalogue concept in the backend codebase. The `item_code` field on the frontend is a free-text field with no backing model.

---

## Data Model Recommendation

### Should Items Be Event-Sourced?

**No.** Items should be simple CRUD (Eloquent model + standard migrations).

Reasoning:
- Items are **reference data**, not financial mutations. They don't affect the ledger directly.
- The *use* of an item (on an invoice line) is already captured in the InvoiceCreated event's `lines` array.
- Event sourcing adds complexity (aggregate root, events, projectors) for zero benefit on a lookup table.
- Xero and MYOB both treat items as simple CRUD entities.
- The item's **current** state (price, description) matters, not its event history. Price history can be tracked via a separate `item_price_history` table if needed later.

### Proposed Item Model

**`app/Models/Tenant/Item.php`**

```
items table:
  id                      bigint PK
  uuid                    uuid UNIQUE
  workspace_id            FK -> workspaces (tenant-scoped)
  code                    string(50) NULLABLE (optional SKU/code, unique per workspace)
  name                    string(255) NOT NULL
  description             text NULLABLE (default description for display)
  item_type               enum: 'service', 'product', 'both' DEFAULT 'service'
  is_sold                 boolean DEFAULT true
  is_purchased            boolean DEFAULT true
  is_active               boolean DEFAULT true

  -- Sell configuration
  sell_description        text NULLABLE (overrides description on invoices)
  sell_price              bigint DEFAULT 0 (cents, ex-tax)
  sell_account_id         FK -> chart_accounts NULLABLE
  sell_tax_code           string NULLABLE (matches TaxCode.code)

  -- Buy configuration
  buy_description         text NULLABLE (overrides description on bills)
  buy_price               bigint DEFAULT 0 (cents, ex-tax)
  buy_account_id          FK -> chart_accounts NULLABLE
  buy_tax_code            string NULLABLE

  -- Units
  unit_of_measure         string(50) NULLABLE (e.g. "hours", "kg", "units", "each")

  -- Organisation
  category                string(100) NULLABLE (free-text category for grouping/reporting)
  sort_order              integer DEFAULT 0

  -- Tracking (deferred to 063-INV, but reserve columns)
  is_tracked              boolean DEFAULT false
  -- inventory_asset_account_id  FK NULLABLE (add with 063-INV)
  -- cogs_account_id             FK NULLABLE (add with 063-INV)

  -- Import support
  import_source           string NULLABLE
  external_id             string NULLABLE

  timestamps
  soft_deletes
```

**Indexes:**
- `(workspace_id, code)` UNIQUE WHERE code IS NOT NULL
- `(workspace_id, is_active)`
- `(workspace_id, item_type)`
- `(workspace_id, category)`

### Proposed ItemType Enum

**`app/Enums/ItemType.php`**

```php
enum ItemType: string
{
    case Service = 'service';   // Sell or buy hours, consulting, etc.
    case Product = 'product';   // Physical goods
    case Both = 'both';         // Can be sold AND purchased (e.g., materials resold)
}
```

Note: `item_type` is informational for v1. The actual sell/buy availability is controlled by `is_sold` and `is_purchased` flags, matching Xero's approach. The enum adds a semantic classification for UI grouping and reporting.

### Invoice Line Changes

**Add `item_id` to `invoice_lines`:**

```
ALTER TABLE invoice_lines
  ADD COLUMN item_id BIGINT NULLABLE REFERENCES items(id) ON DELETE SET NULL
```

When a line references an item:
- The item's defaults (description, unit_price, tax_code, chart_account_id) pre-fill the line
- The line stores **copies** of the values (not live references) -- so changing the item later doesn't alter historical invoices
- `item_id` is a soft reference for analytics ("which invoices used this item?")
- If the item is deleted, `item_id` becomes NULL but the line data is preserved

This is the same pattern Xero uses: items are **templates** for line data, not live bindings.

### InvoiceLineData DTO Changes

```php
class InvoiceLineData extends Data
{
    public function __construct(
        public readonly string $description,
        public readonly int $quantity,
        public readonly int $unit_price,
        public readonly ?string $tax_code = null,
        public readonly ?int $tax_amount = null,
        public readonly ?int $chart_account_id = null,
        public readonly ?int $job_id = null,
        public readonly ?int $sort_order = null,
        public readonly ?int $item_id = null,        // NEW
    ) {}
}
```

### InvoiceCreated Event Changes

The `lines` array in the event would include `item_id` alongside the copied values. No structural change needed since lines are stored as raw arrays.

### Frontend Type Changes

```typescript
// In line-item-grid/types.ts
export interface LineItem {
  _key: string;
  id?: number;
  item_id?: number;       // NEW: reference to Item
  item_code?: string;     // Already exists -- becomes the display value from Item.code
  description: string;
  quantity: number;
  unit_price: number;
  chart_account_id: number | null;
  tax_code: string | null;
  amount: number;
  tax_amount: number;
  job_id: number | null;
  sort_order: number;
}

// In line-item-grid/types.ts -- add to GridLookups
export interface GridLookups {
  accounts: ChartAccount[];
  taxCodes: TaxCode[];
  contacts?: Contact[];
  jobs?: Job[];
  items?: Item[];          // NEW
}
```

### Item Search/Autocomplete UX

The `item_code` column in LineItemGrid needs to become a `ComboboxCell` (already used for account and tax code selection) that:

1. Searches items by code, name, AND description (unlike Xero which only searches code/name)
2. Shows results as: `[code] name` with description as sublabel
3. On selection, auto-fills: description, unit_price, chart_account_id, tax_code
4. Allows "+" New Item creation inline
5. Allows clearing the item (line becomes manual again)
6. Does NOT lock fields after selection -- user can always override

---

## Chart of Accounts Impact

### Accounts Already Available

The existing CoA templates and overlays provide all needed accounts:

| Purpose | Account Code | Account Name | Type | Sub-Type |
|---------|-------------|--------------|------|----------|
| Sales revenue | 41000 | Sales Revenue | Revenue | sales_revenue |
| Service revenue | 42000 | Service Revenue | Revenue | service_revenue |
| Cost of Sales | 51000 | Cost of Sales / COGS | Expense | cost_of_goods_sold |
| Materials | 51100 | Materials & Supplies / Purchases | Expense | cost_of_goods_sold |
| Stock on Hand | 11500 | Stock on Hand | Asset | inventory |

### No New Accounts Required

Items in v1 (without inventory tracking) don't need new GL accounts. Each item simply maps to existing revenue and expense accounts. The `has_inventory` CoA overlay already provides Stock on Hand / COGS for when 063-INV adds inventory tracking.

### Recommended Default Account Mapping

When creating items, suggest sensible defaults based on item type:

| Item Type | Default Sell Account | Default Buy Account |
|-----------|---------------------|---------------------|
| Service | Service Revenue (42000) | Direct Cost (50000) |
| Product | Sales Revenue (41000) | COGS / Materials (51100) |
| Both | Sales Revenue (41000) | COGS / Materials (51100) |

---

## API Design Recommendations

### Endpoints

```
GET    /api/v1/items                    # List items (paginated, filterable)
GET    /api/v1/items/search?q=          # Search by code/name/description (for autocomplete)
GET    /api/v1/items/{uuid}             # Get single item
POST   /api/v1/items                    # Create item
PATCH  /api/v1/items/{uuid}             # Update item
DELETE /api/v1/items/{uuid}             # Soft-delete (archive)
POST   /api/v1/items/{uuid}/activate    # Reactivate archived item
GET    /api/v1/items/counts             # Status counts for StatusTabs
POST   /api/v1/items/import             # CSV import
```

### Search Endpoint

The `/items/search` endpoint is critical for the line-item autocomplete. It should:
- Accept `?q=` for fuzzy search across code, name, description
- Accept `?type=sell|buy` to filter by `is_sold`/`is_purchased`
- Return lightweight results (id, uuid, code, name, sell_price/buy_price, sell_account_id/buy_account_id, sell_tax_code/buy_tax_code)
- Limit to 20 results
- Be fast (<100ms) -- index `code`, `name`, add full-text search on `description`

### Feature Flag

Items should be gated behind a Pennant feature flag:
```php
Feature::define('items_catalogue', fn (Workspace $workspace) => true);
```

Route middleware: `middleware('feature:items_catalogue')`

Frontend: check the feature flag in the API response to show/hide the Items nav item and the item_code column in LineItemGrid.

---

## Open Questions

1. [ ] **Price history tracking** -- Should we store a `item_price_history` table from day one, or defer until users request it? (Recommendation: defer, the invoice lines already preserve historical prices.)

2. [ ] **Recurring templates** -- RecurringTemplate stores `template_data` as JSON. Should item references be stored in template line data? (Recommendation: yes, store `item_id` in template lines so recurring invoices pick up current item defaults.)

3. [ ] **Quote/PO integration** -- Quotes and purchase orders use the same `invoice_lines` table (via Invoice model's type field). Items should work identically on quotes and POs. Confirm this is the intended approach.

4. [ ] **CSV import format** -- What columns should the import CSV expect? Recommendation: code, name, description, sell_price, buy_price, sell_account_code, buy_account_code, sell_tax_code, buy_tax_code, unit_of_measure, category, item_type.

5. [ ] **Bank reconciliation rules** -- Should bank feed rules be able to auto-suggest items? (Recommendation: defer, bank rules currently suggest accounts/tax codes only.)

---

## Recommended Next Steps

1. **Write spec** -- Use this research to produce the 062-ITM technical specification
2. **Migration first** -- Create the `items` table and `Item` model with CRUD actions
3. **Add `item_id` to invoice_lines** -- Migration + update InvoiceLineData DTO
4. **Items CRUD API** -- Controller, Form Requests, API Resource, Policy
5. **Items search endpoint** -- Optimised for autocomplete performance
6. **Frontend Items page** -- List page with StatusTabs, create/edit form
7. **LineItemGrid upgrade** -- Convert `item_code` EditableTextCell to ComboboxCell with item search
8. **CSV import** -- Action for bulk item creation
9. **Feature flag** -- Gate behind Pennant flag
10. **Tests** -- Item CRUD (8-10 tests), item-on-invoice integration (3-4 tests), search (2-3 tests)
