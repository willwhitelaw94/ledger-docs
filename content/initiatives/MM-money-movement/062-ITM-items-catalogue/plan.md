---
title: "Implementation Plan: Items Catalogue"
---

# Implementation Plan: Items Catalogue (062-ITM)

**Epic**: 062-ITM
**Created**: 2026-03-21
**Spec**: [spec.md](./spec.md)
**Research**: [research.md](./context/rich_context/research.md)

---

## 1. Technical Context

### Stack

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 12, PHP 8.4, SQLite (local) |
| Event sourcing | **Not used** -- Items are reference data (simple CRUD via Eloquent) |
| Business logic | Lorisleiva Actions (`AsAction` trait) |
| DTOs | Spatie Laravel Data |
| Auth | Sanctum cookies, Spatie Permission (team mode) |
| API responses | Laravel API Resources |
| Validation | Form Requests (mutations), `Gate::authorize()` (reads) |
| Feature flags | Laravel Pennant + `CheckFeature` middleware |
| Frontend | Next.js 16, React 19, TypeScript (strict) |
| Server state | TanStack Query v5 |
| UI primitives | shadcn/ui |
| Forms | React Hook Form + Zod |
| Data grids | Custom `LineItemGrid` component (existing) |

### Key Dependencies

| Dependency | Status | Relationship |
|-----------|--------|-------------|
| 002-CLE Core Ledger | Complete | Workspace context, chart of accounts |
| 005-IAR Invoicing | Complete | `InvoiceLine` model, `InvoiceAggregate`, `CreateInvoice` action |
| 025-CRN Credit Notes | Complete | Credit note lines (same `invoice_lines` table) |
| 024-RPT Repeating | Complete | `RecurringTemplate` stores line data as JSON |
| LineItemGrid component | Exists | `item_code` column stubbed as `EditableTextCell` -- needs upgrade to combobox |

### Existing Codebase Readiness

**Frontend (partially prepared)**:
- `LineItem.item_code?: string` in `frontend/src/components/line-item-grid/types.ts`
- `item_code` column visible by default on `invoice` and `credit` grid variants
- `ComboboxCell` component already exists for accounts, tax codes, and jobs
- `GridLookups` interface missing `items` -- needs adding

**Backend (zero item concept)**:
- No `Item` model, migration, enum, action, controller, policy, or resource
- No `item_id` on `invoice_lines` table
- `InvoiceLineData` DTO has no `item_id` field
- Feature flag `items_catalogue` not yet defined

---

## 2. Gate 3: Architecture Checklist

### 2.1 Technical Feasibility

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | Standard CRUD pattern matching existing ContactController, JobController |
| Existing patterns leveraged | PASS | Follows Contact CRUD exactly: Model, Policy, FormRequests, Resource, Controller, TanStack hook |
| No impossible requirements | PASS | All spec items are straightforward CRUD + autocomplete |
| Performance considered | PASS | Search endpoint indexed on `(workspace_id, code)`, `(workspace_id, name)`; limit 20 results |
| Security considered | PASS | Workspace-scoped via `workspace_id`, Policy for authorization, Pennant feature flag |

### 2.2 Data & Integration

| Check | Status | Notes |
|-------|--------|-------|
| Data model understood | PASS | `items` table with sell/buy configs; `item_id` nullable FK on `invoice_lines` |
| API contracts clear | PASS | 9 endpoints defined (see Section 4) |
| Dependencies identified | PASS | `chart_accounts` FK for account references, `invoice_lines` FK for item reference |
| Integration points mapped | PASS | LineItemGrid autocomplete, CreateInvoice action, InvoiceLineData DTO |
| DTO persistence explicit | PASS | `InvoiceLineData` gains `item_id`; action copies item defaults to line fields |

### 2.3 Implementation Approach

| Check | Status | Notes |
|-------|--------|-------|
| File changes identified | PASS | See Section 8 (full file inventory) |
| Risk areas noted | PASS | LineItemGrid combobox upgrade is the riskiest change (see Section 9) |
| Testing approach defined | PASS | ~25 Pest tests (Section 7) |
| Rollback possible | PASS | Feature-flagged; `item_id` is nullable FK with SET NULL on delete |

### 2.4 Resource & Scope

| Check | Status | Notes |
|-------|--------|-------|
| Scope matches spec | PASS | 3 phases, no over-engineering; reporting deferred to Phase 3 |
| Effort reasonable | PASS | Estimated 3 sprints (M t-shirt) |
| Skills available | PASS | All patterns exist in codebase |

### 2.5 Laravel Best Practices

| Check | Status | Notes |
|-------|--------|-------|
| Use Lorisleiva Actions | PASS | `CreateItem`, `UpdateItem`, `ImportItems` actions |
| Laravel Data for DTOs | PASS | `ItemData` for complex create/update payloads |
| API Resources for responses | PASS | `ItemResource` |
| Model route binding | PASS | Controller uses `int $id` with workspace-scoped query (matches Contact pattern) |
| Sanctum cookie auth | PASS | Same auth as all workspace-scoped routes |
| Feature flags dual-gated | PASS | Backend: `middleware('feature:items_catalogue')`, Frontend: check feature in workspace config |
| No hardcoded business logic in frontend | PASS | Item defaults come from API; frontend just renders |
| Migrations schema-only | PASS | Two migrations: `create_items_table`, `add_item_id_to_invoice_lines` |

### 2.6 Next.js/React Standards (CLAUDE.md Gate Overrides)

| Check | Status | Notes |
|-------|--------|-------|
| All components use TypeScript | PASS | Every `.tsx` file uses strict TypeScript |
| Props typed with types | PASS | All component props use `type Props = {}` or inline destructured types |
| No `any` types | PASS | `Item` type defined in `types/item.ts`, API responses fully typed |
| Shared types identified | PASS | `Item`, `ItemType` types in `frontend/src/types/item.ts` |
| Component library reused | PASS | Reuses `ComboboxCell`, `StatusTabs`, `DataTable`, `Sheet` (shadcn) |
| Server/client components explicit | PASS | Items page + form are `'use client'`; no server components needed |
| Data fetching via TanStack Query | PASS | `use-items.ts` hook with `useItems`, `useItem`, `useCreateItem`, etc. |
| Forms use React Hook Form + Zod | PASS | Item form uses `useForm` + Zod schema |
| API client typed | PASS | All API calls typed with request/response types |

---

## 3. Data Model

### 3.1 New Table: `items`

```
items
  id                      bigint PK AUTO_INCREMENT
  uuid                    char(36) UNIQUE NOT NULL
  workspace_id            bigint NOT NULL  FK -> workspaces(id) ON DELETE CASCADE
  code                    varchar(50) NULLABLE
  name                    varchar(255) NOT NULL
  description             text NULLABLE
  item_type               varchar(20) NOT NULL DEFAULT 'service'  -- 'service' | 'product' | 'both'
  is_sold                 boolean NOT NULL DEFAULT true
  is_purchased            boolean NOT NULL DEFAULT true
  is_active               boolean NOT NULL DEFAULT true

  -- Sell configuration
  sell_description        text NULLABLE
  sell_price              bigint NOT NULL DEFAULT 0      -- cents, ex-tax
  sell_account_id         bigint NULLABLE  FK -> chart_accounts(id) ON DELETE SET NULL
  sell_tax_code           varchar(20) NULLABLE

  -- Buy configuration
  buy_description         text NULLABLE
  buy_price               bigint NOT NULL DEFAULT 0      -- cents, ex-tax
  buy_account_id          bigint NULLABLE  FK -> chart_accounts(id) ON DELETE SET NULL
  buy_tax_code            varchar(20) NULLABLE

  -- Units & organisation
  unit_of_measure         varchar(50) NULLABLE
  category                varchar(100) NULLABLE
  sort_order              integer NOT NULL DEFAULT 0

  -- Future: inventory tracking (063-INV)
  is_tracked              boolean NOT NULL DEFAULT false

  -- Import support
  import_source           varchar(50) NULLABLE
  external_id             varchar(100) NULLABLE

  created_at              timestamp NULLABLE
  updated_at              timestamp NULLABLE
  deleted_at              timestamp NULLABLE    -- soft deletes

INDEXES:
  UNIQUE (workspace_id, code) WHERE code IS NOT NULL AND deleted_at IS NULL
  INDEX  (workspace_id, is_active)
  INDEX  (workspace_id, item_type)
  INDEX  (workspace_id, category)
```

### 3.2 Modified Table: `invoice_lines`

```sql
ALTER TABLE invoice_lines
  ADD COLUMN item_id BIGINT NULLABLE
  REFERENCES items(id) ON DELETE SET NULL;

INDEX (item_id);
```

### 3.3 New Enum: `ItemType`

```php
// app/Enums/ItemType.php
enum ItemType: string
{
    case Service = 'service';
    case Product = 'product';
    case Both    = 'both';
}
```

---

## 4. API Contracts

All endpoints scoped to workspace via `X-Workspace-Id` header. Feature-gated via `middleware('feature:items_catalogue')`.

### 4.1 Items CRUD

| Method | Endpoint | Controller Method | Auth | Description |
|--------|----------|-------------------|------|-------------|
| `GET` | `/api/v1/items` | `index` | `Gate::authorize('viewAny', Item::class)` | Paginated list with search, filter by status/type/category |
| `GET` | `/api/v1/items/counts` | `counts` | `Gate::authorize('viewAny', Item::class)` | StatusTab counts: `{ active: N, inactive: N, all: N }` |
| `GET` | `/api/v1/items/search` | `search` | `Gate::authorize('viewAny', Item::class)` | Autocomplete search (code + name + description), max 20 results |
| `POST` | `/api/v1/items` | `store` | `StoreItemRequest` (authorize via Policy) | Create item |
| `GET` | `/api/v1/items/{id}` | `show` | `Gate::authorize('view', $item)` | Single item |
| `PATCH` | `/api/v1/items/{id}` | `update` | `UpdateItemRequest` (authorize via Policy) | Update item |
| `DELETE` | `/api/v1/items/{id}` | `destroy` | `Gate::authorize('delete', $item)` | Soft-delete (deactivate) |
| `POST` | `/api/v1/items/{id}/activate` | `activate` | `Gate::authorize('update', $item)` | Reactivate soft-deleted item |
| `POST` | `/api/v1/items/import` | `import` | `ImportItemsRequest` (authorize via Policy) | CSV import with validation |

### 4.2 Request/Response Shapes

**GET /api/v1/items** (index)

Query params: `?page=1&per_page=25&search=web&status=active&type=service&category=Design`

Response: `PaginatedResponse<ItemResource>`

**GET /api/v1/items/search** (autocomplete)

Query params: `?q=web&context=sell|buy&limit=20`

- `context=sell` filters to `is_sold=true` items, returns sell config
- `context=buy` filters to `is_purchased=true` items, returns buy config

Response:
```json
{
  "data": [
    {
      "id": 1,
      "uuid": "...",
      "code": "WEB",
      "name": "Website Design",
      "description": "Website design and development",
      "sell_price": 15000,
      "sell_description": "Website design and development",
      "sell_account_id": 42,
      "sell_tax_code": "GST",
      "buy_price": 0,
      "buy_description": null,
      "buy_account_id": null,
      "buy_tax_code": null,
      "unit_of_measure": "hours",
      "item_type": "service"
    }
  ]
}
```

**POST /api/v1/items** (create)

```json
{
  "name": "Website Design",
  "code": "WEB",
  "description": "Website design and development",
  "item_type": "service",
  "is_sold": true,
  "is_purchased": false,
  "sell_description": "Website design and development",
  "sell_price": 15000,
  "sell_account_id": 42,
  "sell_tax_code": "GST",
  "buy_description": null,
  "buy_price": 0,
  "buy_account_id": null,
  "buy_tax_code": null,
  "unit_of_measure": "hours",
  "category": "Design"
}
```

**GET /api/v1/items/counts**

```json
{
  "data": {
    "active": 45,
    "inactive": 3,
    "all": 48
  }
}
```

**POST /api/v1/items/import**

Multipart form: `file` (CSV), `mapping` (JSON column map)

```json
{
  "file": "<csv file>",
  "mapping": {
    "code": "Item Code",
    "name": "Item Name",
    "sell_price": "Sale Price",
    "buy_price": "Cost Price",
    "sell_account_code": "Revenue Account",
    "buy_account_code": "Expense Account",
    "sell_tax_code": "Sales Tax",
    "buy_tax_code": "Purchase Tax",
    "unit_of_measure": "UOM",
    "category": "Category",
    "item_type": "Type"
  }
}
```

### 4.3 Permissions

New permissions to add to `RolesAndPermissionsSeeder`:

| Permission | Roles |
|-----------|-------|
| `item.view` | owner, accountant, bookkeeper, approver, auditor, client |
| `item.create` | owner, accountant, bookkeeper |
| `item.update` | owner, accountant, bookkeeper |
| `item.delete` | owner, accountant |
| `item.import` | owner, accountant, bookkeeper |

---

## 5. Frontend Component Architecture

### 5.1 New Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/w/[slug]/items` | `ItemsPage` | List page with StatusTabs, search, DataTable |
| `/w/[slug]/items/new` | `ItemFormPage` | Create item form (React Hook Form + Zod) |
| `/w/[slug]/items/[id]` | `ItemDetailPage` | View/edit item (Sheet slide-out or full page) |

### 5.2 New Components

**Items page** (`frontend/src/app/w/[slug]/(dashboard)/items/page.tsx`):
- Reuses existing `DataTable` + `StatusTabs` + search bar pattern (same as Contacts)
- Columns: Code, Name, Sell Price, Buy Price, Type, Status
- StatusTabs: Active (default), Inactive, All
- "New Item" button with `N` keyboard shortcut
- "Import" button for CSV import
- Keyboard: `G then I` navigation (reserve -- Items shares "I" with Invoices, may need adjustment)

**Item form** (`frontend/src/app/w/[slug]/(dashboard)/items/new/page.tsx` and `[id]/edit/page.tsx`):
- React Hook Form + Zod validation schema
- Sections: Basic Info, Sell Configuration, Buy Configuration, Additional
- Account and tax code fields use existing combobox pattern (same data as LineItemGrid lookups)
- Reuses shadcn `Input`, `Select`, `Textarea`, `Switch`, `Button` components

**Item autocomplete on LineItemGrid** (modification to existing `line-item-grid.tsx`):
- Replace `EditableTextCell` for `item_code` column with `ComboboxCell`
- Add `items` to `GridLookups` interface
- New `handleItemChange` callback that auto-fills line fields on item selection
- "+ New Item" option at bottom of dropdown (opens compact dialog)
- Shows: `[code] name` with description as sublabel

**Inline create dialog** (`frontend/src/components/line-item-grid/item-quick-create-dialog.tsx`):
- Minimal form: name (required), sell price, sell tax code, sell account
- Creates item via API, selects on current line
- Dialog/Sheet component from shadcn

### 5.3 New Types

```typescript
// frontend/src/types/item.ts

export type ItemType = 'service' | 'product' | 'both';

export interface Item {
  id: number;
  uuid: string;
  code: string | null;
  name: string;
  description: string | null;
  item_type: ItemType;
  is_sold: boolean;
  is_purchased: boolean;
  is_active: boolean;
  sell_description: string | null;
  sell_price: number;         // cents
  sell_account_id: number | null;
  sell_tax_code: string | null;
  buy_description: string | null;
  buy_price: number;          // cents
  buy_account_id: number | null;
  buy_tax_code: string | null;
  unit_of_measure: string | null;
  category: string | null;
  is_tracked: boolean;
  created_at: string;
  updated_at: string;
}
```

### 5.4 New Hook

```typescript
// frontend/src/hooks/use-items.ts
// TanStack Query hooks:
//   useItems(params)          -- paginated list
//   useItem(id)               -- single item
//   useItemCounts()           -- StatusTab counts
//   useItemSearch(query, ctx) -- autocomplete search (debounced)
//   useCreateItem()           -- mutation
//   useUpdateItem()           -- mutation
//   useDeleteItem()           -- mutation
//   useImportItems()          -- mutation (multipart)
```

### 5.5 Modified Components

| Component | Change |
|-----------|--------|
| `line-item-grid/types.ts` | Add `item_id?: number` to `LineItem`, add `items?: Item[]` to `GridLookups` |
| `line-item-grid/line-item-grid.tsx` | Replace `EditableTextCell` for `item_code` with `ComboboxCell`, add `handleItemChange` callback, add `itemOptions` memo, add "+ New Item" action |
| `line-item-grid/cells/combobox-cell.tsx` | Add optional `onCreateNew` callback prop for "+ New Item" action in dropdown |
| Sidebar navigation | Add "Items" nav item under Sales section (feature-flagged) |

---

## 6. Implementation Phases

### Phase 1: Backend Foundation (Sprint 1)

**Goal**: Item model, CRUD API, search endpoint, permissions, feature flag.

1. Migration: `create_items_table`
2. Migration: `add_item_id_to_invoice_lines_table`
3. `ItemType` enum
4. `Item` model with workspace scope, soft deletes, relationships
5. `ItemPolicy` with RBAC permissions
6. Permissions in `RolesAndPermissionsSeeder`
7. `ItemResource` API resource
8. `ItemData` Spatie Data DTO
9. `StoreItemRequest` and `UpdateItemRequest` form requests
10. `CreateItem` and `UpdateItem` actions
11. `ItemController` with index, show, store, update, destroy, activate, counts, search
12. Feature flag: `items_catalogue` in AppServiceProvider
13. Routes in `api.php` under `middleware('feature:items_catalogue')`
14. Policy registration in AppServiceProvider
15. Update `InvoiceLineData` DTO to include `item_id`
16. Update `InvoiceLine` model: add `item_id` to fillable, add `item()` relationship
17. Pest feature tests: Item CRUD, search, permissions, workspace isolation

### Phase 2: Frontend Items Page (Sprint 2)

**Goal**: Full Items management page with list, create, edit, StatusTabs.

1. `Item` TypeScript type in `types/item.ts`
2. `use-items.ts` TanStack Query hooks
3. Items list page with DataTable, StatusTabs, search
4. Item create page (React Hook Form + Zod)
5. Item edit page (pre-filled form)
6. Sidebar navigation: add "Items" link (feature-flagged)
7. CSV import dialog (upload, column mapping, preview, import)
8. `ImportItems` action (backend) for CSV processing
9. `ImportItemsRequest` form request

### Phase 3: Line Item Integration (Sprint 3)

**Goal**: Item autocomplete on invoice/bill/credit note lines, inline create.

1. Modify `GridLookups` to include `items`
2. Modify `LineItem` type to include `item_id`
3. Replace `item_code` `EditableTextCell` with `ComboboxCell` in LineItemGrid
4. Build `itemOptions` from items search API (debounced)
5. Implement `handleItemChange`: on item select, auto-fill description, unit_price, tax_code, chart_account_id based on document type (sell vs buy)
6. Add `onCreateNew` prop to `ComboboxCell` for "+ New Item" action
7. Build `ItemQuickCreateDialog` component
8. Pass items to LineItemGrid from invoice/bill form pages
9. Update `CreateInvoice` action to accept and persist `item_id` on lines
10. Update `InvoiceCreated` event payload to include `item_id` per line
11. Verify credit note lines carry over `item_id`
12. Verify recurring templates store `item_id` in template line data
13. Browser tests: item selection on invoice, bill type switching, inline create
14. Revenue by Item report endpoint (Phase 3 / P3 -- deferred if time-constrained)

---

## 7. Testing Strategy

### 7.1 Backend Feature Tests (Pest)

| Test File | Tests | Covers |
|-----------|-------|--------|
| `tests/Feature/Api/ItemTest.php` | ~18 | CRUD operations, validation, workspace isolation, soft delete, reactivate, search, counts |
| `tests/Feature/Api/ItemImportTest.php` | ~5 | CSV import: valid file, duplicate codes, missing columns, mapping, large file |
| `tests/Feature/Api/ItemInvoiceIntegrationTest.php` | ~5 | `item_id` on invoice lines, auto-fill verification, item deletion SET NULL, bill buy-config |

**Test conventions** (matching existing patterns):
- `uses(RefreshDatabase::class)` with `RolesAndPermissionsSeeder`
- Assign `owner` role for happy path, test `bookkeeper`/`auditor` for permission boundaries
- Use `->withHeaders($this->wsHeaders)` for workspace scoping
- Verify `workspace_id` isolation (create item in workspace A, ensure not visible in workspace B)

### 7.2 Browser Tests (Playwright via Pest)

| Test File | Tests | Covers |
|-----------|-------|--------|
| `tests/Browser/ItemsTest.php` | ~6 | Items list page loads, create item form, edit item, StatusTabs, search, item column on invoice |

### 7.3 Key Test Scenarios

1. Create item with all fields, verify persisted correctly
2. Create item with duplicate code in same workspace -- expect 422
3. Create item with same code in different workspace -- expect success
4. Soft-delete item, verify hidden from search endpoint
5. Reactivate soft-deleted item, verify visible in search
6. Search by code, name, and description -- all return results
7. Select item on invoice line -- verify sell config auto-fills
8. Select item on bill line -- verify buy config auto-fills
9. Edit item price, create new invoice -- verify new price used
10. Edit item price, check old invoice -- verify old price preserved
11. Delete item -- verify `item_id` SET NULL on existing invoice lines
12. CSV import with valid data -- verify all items created
13. CSV import with duplicate codes -- verify errors flagged
14. Bookkeeper can CRUD items, auditor can only view
15. Counts endpoint returns correct active/inactive/all

---

## 8. File Inventory

### New Files (Backend)

| File | Purpose |
|------|---------|
| `database/migrations/2026_03_23_100001_create_items_table.php` | Items table schema |
| `database/migrations/2026_03_23_100002_add_item_id_to_invoice_lines_table.php` | `item_id` FK on invoice_lines |
| `app/Enums/ItemType.php` | `service`, `product`, `both` enum |
| `app/Models/Tenant/Item.php` | Eloquent model with workspace scope |
| `app/Policies/ItemPolicy.php` | RBAC authorization |
| `app/Http/Resources/ItemResource.php` | API resource |
| `app/Data/ItemData.php` | Spatie Data DTO |
| `app/Http/Requests/Item/StoreItemRequest.php` | Create validation + authorize |
| `app/Http/Requests/Item/UpdateItemRequest.php` | Update validation + authorize |
| `app/Http/Requests/Item/ImportItemsRequest.php` | Import validation + authorize |
| `app/Actions/Item/CreateItem.php` | Create item action |
| `app/Actions/Item/UpdateItem.php` | Update item action |
| `app/Actions/Item/ImportItems.php` | CSV import action |
| `app/Http/Controllers/Api/ItemController.php` | CRUD + search + counts + import |
| `tests/Feature/Api/ItemTest.php` | Item CRUD tests |
| `tests/Feature/Api/ItemImportTest.php` | CSV import tests |
| `tests/Feature/Api/ItemInvoiceIntegrationTest.php` | Item-on-invoice integration tests |
| `tests/Browser/ItemsTest.php` | E2E browser tests |

### New Files (Frontend)

| File | Purpose |
|------|---------|
| `frontend/src/types/item.ts` | `Item`, `ItemType` TypeScript types |
| `frontend/src/hooks/use-items.ts` | TanStack Query hooks |
| `frontend/src/app/w/[slug]/(dashboard)/items/page.tsx` | Items list page |
| `frontend/src/app/w/[slug]/(dashboard)/items/new/page.tsx` | Create item page |
| `frontend/src/app/w/[slug]/(dashboard)/items/[id]/page.tsx` | Item detail/edit page |
| `frontend/src/components/items/item-form.tsx` | Shared item form component (RHF + Zod) |
| `frontend/src/components/items/item-import-dialog.tsx` | CSV import dialog |
| `frontend/src/components/line-item-grid/item-quick-create-dialog.tsx` | Inline item creation dialog |

### Modified Files (Backend)

| File | Change |
|------|--------|
| `app/Models/Tenant/InvoiceLine.php` | Add `item_id` to `$fillable`, add `item()` BelongsTo relationship |
| `app/Data/InvoiceLineData.php` | Add `?int $item_id = null` property and validation rule |
| `app/Actions/Invoicing/CreateInvoice.php` | Pass `item_id` through `normalizeLines()` |
| `app/Providers/AppServiceProvider.php` | Register `ItemPolicy`, define `items_catalogue` feature flag |
| `database/seeders/RolesAndPermissionsSeeder.php` | Add `item.view`, `item.create`, `item.update`, `item.delete`, `item.import` permissions |
| `routes/api.php` | Add items route group under `feature:items_catalogue` middleware |

### Modified Files (Frontend)

| File | Change |
|------|--------|
| `frontend/src/components/line-item-grid/types.ts` | Add `item_id?: number` to `LineItem`, add `items?: Item[]` to `GridLookups` |
| `frontend/src/components/line-item-grid/line-item-grid.tsx` | Replace `item_code` `EditableTextCell` with item `ComboboxCell`, add `handleItemChange`, add `itemOptions` |
| `frontend/src/components/line-item-grid/cells/combobox-cell.tsx` | Add optional `onCreateNew?: () => void` prop for "+ New Item" action |
| `frontend/src/types/index.ts` | Re-export `Item` and `ItemType` from `./item` |
| Sidebar component | Add "Items" nav link under Sales section (feature-flagged) |
| Invoice/bill form pages | Pass `items` to `LineItemGrid` via `lookups` prop |

---

## 9. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| LineItemGrid combobox upgrade breaks existing account/tax selection | High | Low | Item combobox follows exact same `ComboboxCell` pattern as accounts/tax; no structural changes to existing cells |
| Autocomplete search too slow with large catalogues (500+ items) | Medium | Low | Dedicated `/search` endpoint with indexed columns, limit 20 results, debounced frontend queries |
| CSV import with bad data crashes or creates duplicates | Medium | Medium | Validation preview step; duplicate code detection; database transaction wraps entire import |
| Existing invoices lose data when `item_id` column added | Low | None | `item_id` is nullable; migration only adds column, no data modification; SET NULL on delete |
| Feature flag not properly hiding Items from non-flagged workspaces | Medium | Low | Dual-gated: backend middleware blocks API, frontend sidebar conditionally renders |
| Recurring templates break when `item_id` added to line data | Medium | Low | `item_id` is optional in DTO; existing templates without `item_id` continue to work |

---

## 10. Out of Scope (Deferred)

| Feature | Deferred To | Reason |
|---------|-------------|--------|
| Inventory tracking (quantity on hand) | 063-INV | Separate epic, requires COGS accounting, inventory valuation |
| Price history tracking | Future | Invoice lines already preserve historical prices; table can be added later |
| Customer-specific pricing | Future | Requires pricing matrix; not needed for v1 |
| Quantity-based price breaks | Future | Same as above |
| Bank reconciliation rule item suggestion | Future | Rules currently suggest accounts/tax only |
| Custom fields on items | Future | Wait for platform-wide custom fields feature |
