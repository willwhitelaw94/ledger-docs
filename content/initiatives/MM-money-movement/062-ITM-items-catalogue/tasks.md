---
title: "AI-Agent Task List: Items Catalogue"
---

# AI-Agent Task List: Items Catalogue (062-ITM)

**Epic**: 062-ITM
**Plan**: [plan.md](./plan.md)
**Spec**: [spec.md](./spec.md)

Each task is scoped for a single AI-agent execution. Tasks are ordered by dependency. Labels: `[B]` = Backend, `[F]` = Frontend, `[T]` = Test, `[P]` = Phase indicator.

---

## Phase 1: Backend Foundation

### Database & Model Layer

- [ ] T001 [B][P1] **Create items table migration.** Create `database/migrations/2026_03_23_100001_create_items_table.php`. Schema per plan Section 3.1: `id`, `uuid`, `workspace_id` (FK -> workspaces, CASCADE), `code` (varchar 50, nullable), `name` (varchar 255, NOT NULL), `description` (text nullable), `item_type` (varchar 20, default 'service'), `is_sold` (bool default true), `is_purchased` (bool default true), `is_active` (bool default true), `sell_description` (text nullable), `sell_price` (bigint default 0), `sell_account_id` (FK -> chart_accounts, SET NULL), `sell_tax_code` (varchar 20 nullable), `buy_description` (text nullable), `buy_price` (bigint default 0), `buy_account_id` (FK -> chart_accounts, SET NULL), `buy_tax_code` (varchar 20 nullable), `unit_of_measure` (varchar 50 nullable), `category` (varchar 100 nullable), `sort_order` (int default 0), `is_tracked` (bool default false), `import_source` (varchar 50 nullable), `external_id` (varchar 100 nullable), timestamps, soft deletes. Add unique index on `(workspace_id, code)` where code is not null and deleted_at is null. Add indexes on `(workspace_id, is_active)`, `(workspace_id, item_type)`, `(workspace_id, category)`. Run `php artisan migrate` to verify.

- [ ] T002 [B][P1] **Create add_item_id_to_invoice_lines migration.** Create `database/migrations/2026_03_23_100002_add_item_id_to_invoice_lines_table.php`. Add `item_id` column: `$table->foreignId('item_id')->nullable()->constrained('items')->nullOnDelete()`. Add index on `item_id`. Run `php artisan migrate` to verify.

- [ ] T003 [B][P1] **Create ItemType enum.** Create `app/Enums/ItemType.php` as a backed string enum: `Service = 'service'`, `Product = 'product'`, `Both = 'both'`. Follow the pattern of existing enums in `app/Enums/` (e.g., `AccountType.php`).

- [ ] T004 [B][P1] **Create Item model.** Create `app/Models/Tenant/Item.php`. Extend `Model`, use `SoftDeletes`. Set `$fillable` to all columns from T001 (except id, uuid, timestamps, deleted_at). Cast `item_type` to `ItemType` enum, booleans (`is_sold`, `is_purchased`, `is_active`, `is_tracked`) to `boolean`, integers (`sell_price`, `buy_price`, `sort_order`) to `integer`. Add UUID generation in `boot()` method using `static::creating(fn ($item) => $item->uuid = (string) Str::uuid())`. Add relationships: `workspace()` -> BelongsTo Workspace, `sellAccount()` -> BelongsTo ChartAccount (FK `sell_account_id`), `buyAccount()` -> BelongsTo ChartAccount (FK `buy_account_id`), `invoiceLines()` -> HasMany InvoiceLine. Add scope `scopeForWorkspace($query, $workspaceId)` filtering by `workspace_id`. Add scope `scopeActive($query)` filtering `is_active = true`.

- [ ] T005 [B][P1] **Update InvoiceLine model.** Edit `app/Models/Tenant/InvoiceLine.php`: add `'item_id'` to the `$fillable` array. Add new relationship method `item(): BelongsTo` returning `$this->belongsTo(Item::class)`.

- [ ] T006 [B][P1] **Update InvoiceLineData DTO.** Edit `app/Data/InvoiceLineData.php`: add `public readonly ?int $item_id = null` as the last constructor parameter. Add `'item_id' => ['nullable', 'integer']` to the `rules()` method.

### Authorization Layer

- [ ] T007 [B][P1] **Create ItemPolicy.** Create `app/Policies/ItemPolicy.php` following the exact pattern of `app/Policies/ContactPolicy.php`. Methods: `viewAny(User $user): bool` -> `$user->hasPermissionTo('item.view')`, `view(User $user, Item $item): bool` -> `$user->hasPermissionTo('item.view')`, `create(User $user): bool` -> `$user->hasPermissionTo('item.create')`, `update(User $user, Item $item): bool` -> `$user->hasPermissionTo('item.update')`, `delete(User $user, Item $item): bool` -> `$user->hasPermissionTo('item.delete')`, `import(User $user): bool` -> `$user->hasPermissionTo('item.import')`.

- [ ] T008 [B][P1] **Register ItemPolicy in AppServiceProvider.** Edit `app/Providers/AppServiceProvider.php`: add `use App\Models\Tenant\Item;` and `use App\Policies\ItemPolicy;` imports. Add `Gate::policy(Item::class, ItemPolicy::class);` in the `boot()` method, after the existing policy registrations (after the last `Gate::policy()` call around line 208).

- [ ] T009 [B][P1] **Add item permissions to RolesAndPermissionsSeeder.** Edit `database/seeders/RolesAndPermissionsSeeder.php`: Add `'item.view'`, `'item.create'`, `'item.update'`, `'item.delete'`, `'item.import'` to the permissions array. Assign to roles: **owner** gets all 5, **accountant** gets all 5, **bookkeeper** gets view/create/update/import (not delete), **approver** gets view only, **auditor** gets view only, **client** gets view only. Follow the existing pattern where permissions are listed per role in the role definitions.

- [ ] T010 [B][P1] **Define items_catalogue feature flag.** Edit `app/Providers/AppServiceProvider.php`: add `Feature::define('items_catalogue', fn () => true);` alongside the existing feature definitions (around line 197, after `Feature::define('bas_lodgement', ...)`).

### Form Requests

- [ ] T011 [B][P1] **Create StoreItemRequest.** Create `app/Http/Requests/Item/StoreItemRequest.php` extending FormRequest. `authorize()`: return `$this->user()->can('create', Item::class)`. `rules()`: `name` -> `['required', 'string', 'max:255']`, `code` -> `['nullable', 'string', 'max:50']`, `description` -> `['nullable', 'string', 'max:2000']`, `item_type` -> `['required', 'string', Rule::in(['service', 'product', 'both'])]`, `is_sold` -> `['sometimes', 'boolean']`, `is_purchased` -> `['sometimes', 'boolean']`, `sell_description` -> `['nullable', 'string', 'max:2000']`, `sell_price` -> `['nullable', 'integer', 'min:0']`, `sell_account_id` -> `['nullable', 'integer', 'exists:chart_accounts,id']`, `sell_tax_code` -> `['nullable', 'string', 'max:20']`, `buy_description` -> `['nullable', 'string', 'max:2000']`, `buy_price` -> `['nullable', 'integer', 'min:0']`, `buy_account_id` -> `['nullable', 'integer', 'exists:chart_accounts,id']`, `buy_tax_code` -> `['nullable', 'string', 'max:20']`, `unit_of_measure` -> `['nullable', 'string', 'max:50']`, `category` -> `['nullable', 'string', 'max:100']`. Add `after()` method with workspace-scoped code uniqueness check: if code is provided, query `Item::where('workspace_id', $this->input('workspace_id'))->where('code', $this->input('code'))->exists()` and add error "Code already exists" if true.

- [ ] T012 [B][P1] **Create UpdateItemRequest.** Create `app/Http/Requests/Item/UpdateItemRequest.php` extending FormRequest. `authorize()`: resolve item via `Item::where('workspace_id', $this->input('workspace_id'))->findOrFail($this->route('id'))`, stash on `$this->attributes->set('item', $item)`, return `$this->user()->can('update', $item)`. `rules()`: same as StoreItemRequest but all fields are `sometimes` instead of `required`. Add `after()` for code uniqueness excluding current item: `->where('id', '!=', $this->attributes->get('item')->id)`.

### API Resource & Actions

- [ ] T013 [B][P1] **Create ItemResource.** Create `app/Http/Resources/ItemResource.php` extending JsonResource. `toArray()` returns: `id`, `uuid`, `code`, `name`, `description`, `item_type`, `is_sold`, `is_purchased`, `is_active`, `sell_description`, `sell_price`, `sell_account_id`, `sell_tax_code`, `buy_description`, `buy_price`, `buy_account_id`, `buy_tax_code`, `unit_of_measure`, `category`, `is_tracked`, `sort_order`, `created_at` (ISO 8601), `updated_at` (ISO 8601). Include `sell_account` and `buy_account` as nested objects when relationships are loaded (using `$this->whenLoaded()`).

- [ ] T014 [B][P1] **Create CreateItem action.** Create `app/Actions/Item/CreateItem.php` with `use AsAction` trait. `handle(int $workspaceId, array $data): Item` method: merge `workspace_id` and `uuid` (Str::uuid()) into data, create Item via `Item::create($data)`, return the created item. Keep it simple -- no event sourcing needed.

- [ ] T015 [B][P1] **Create UpdateItem action.** Create `app/Actions/Item/UpdateItem.php` with `use AsAction` trait. `handle(Item $item, array $data): Item` method: call `$item->update($data)`, return `$item->fresh()`.

### Controller & Routes

- [ ] T016 [B][P1] **Create ItemController.** Create `app/Http/Controllers/Api/ItemController.php` extending Controller. Follow the exact pattern of `ContactController`. Methods:

  **`index(Request $request): AnonymousResourceCollection`** -- `Gate::authorize('viewAny', Item::class)`. Query `Item::where('workspace_id', ...)` with filters: `search` (LIKE on code, name, description), `status` (active/inactive/all -- default active), `type` (service/product/both), `category`. Paginate with `per_page` (default 25). Return `ItemResource::collection()`.

  **`counts(Request $request): JsonResponse`** -- `Gate::authorize('viewAny', Item::class)`. Return `{ active: N, inactive: N, all: N }` counts using `selectRaw` + `groupBy` on `is_active`. Include `all` as sum.

  **`search(Request $request): AnonymousResourceCollection`** -- `Gate::authorize('viewAny', Item::class)`. Accept `q` param, `context` param (sell/buy), `limit` (default 20). Filter: `is_active = true`, when context=sell filter `is_sold = true`, when context=buy filter `is_purchased = true`. Search across code, name, description with OR conditions. Return `ItemResource::collection()` (no pagination, just limit).

  **`show(Request $request, int $id): ItemResource`** -- Find item by id + workspace_id, `Gate::authorize('view', $item)`. Load `sellAccount` and `buyAccount` relationships. Return `ItemResource::make()`.

  **`store(StoreItemRequest $request): ItemResource`** -- Call `CreateItem::run($request->integer('workspace_id'), $request->validated())`. Return `ItemResource::make()`.

  **`update(UpdateItemRequest $request, int $id): ItemResource`** -- Get item from `$request->attributes->get('item')`. Call `UpdateItem::run($item, $request->validated())`. Return `ItemResource::make()`.

  **`destroy(Request $request, int $id): JsonResponse`** -- Find item by id + workspace_id, `Gate::authorize('delete', $item)`. Call `$item->delete()` (soft delete). Return `{ message: 'Item archived successfully.' }`.

  **`activate(Request $request, int $id): ItemResource`** -- Find item (including trashed) by id + workspace_id: `Item::withTrashed()->where(...)`. `Gate::authorize('update', $item)`. Call `$item->restore()`. Return `ItemResource::make()`.

- [ ] T017 [B][P1] **Add item routes to api.php.** Edit `routes/api.php`: add `use App\Http\Controllers\Api\ItemController;` import at top. Inside the workspace-scoped route group (after the contacts routes block around line 186), add:
  ```php
  Route::middleware(['feature:items_catalogue'])->group(function () {
      Route::get('items', [ItemController::class, 'index']);
      Route::post('items', [ItemController::class, 'store']);
      Route::get('items/counts', [ItemController::class, 'counts']);
      Route::get('items/search', [ItemController::class, 'search']);
      Route::get('items/{id}', [ItemController::class, 'show']);
      Route::patch('items/{id}', [ItemController::class, 'update']);
      Route::delete('items/{id}', [ItemController::class, 'destroy']);
      Route::post('items/{id}/activate', [ItemController::class, 'activate']);
      Route::post('items/import', [ItemController::class, 'import']);
  });
  ```
  Ensure `/items/counts`, `/items/search`, and `/items/import` are BEFORE `/items/{id}` to avoid route parameter capture.

### Phase 1 Tests

- [ ] T018 [T][P1] **Write Item CRUD feature tests.** Create `tests/Feature/Api/ItemTest.php` using Pest. Follow the exact pattern of existing tests (RefreshDatabase, seed RolesAndPermissionsSeeder, create user/org/workspace, assign owner role, set wsHeaders). Tests:

  1. `it('can create an item with all fields')` -- POST /items with full payload, assert 201, assert all fields in response
  2. `it('requires name to create an item')` -- POST /items without name, assert 422
  3. `it('validates unique code within workspace')` -- create item with code "WEB", POST another with same code, assert 422 with "Code already exists"
  4. `it('allows same code in different workspaces')` -- create item with code "WEB" in workspace A, create another with "WEB" in workspace B, assert both 201
  5. `it('can list items with pagination')` -- create 30 items, GET /items?per_page=10, assert 10 items, page 1 of 3
  6. `it('can search items by code, name, and description')` -- create items, GET /items?search=web, assert matching items returned
  7. `it('can filter items by status')` -- create active + inactive items, GET /items?status=active, assert only active returned
  8. `it('can show a single item')` -- GET /items/{id}, assert 200 with all fields
  9. `it('can update an item')` -- PATCH /items/{id} with new name, assert 200, assert name changed
  10. `it('can soft-delete an item')` -- DELETE /items/{id}, assert 200, assert item not in active list
  11. `it('can reactivate a soft-deleted item')` -- DELETE then POST /items/{id}/activate, assert 200, assert item in active list
  12. `it('returns correct counts')` -- create 3 active + 2 inactive, GET /items/counts, assert { active: 3, inactive: 2, all: 5 }
  13. `it('search endpoint filters by context')` -- create sell-only + buy-only items, GET /items/search?context=sell, assert only sell items
  14. `it('search endpoint limits results')` -- create 30 items, GET /items/search?q=item&limit=5, assert 5 results
  15. `it('scopes items to workspace')` -- create item in workspace A, request from workspace B headers, assert empty list
  16. `it('denies auditor from creating items')` -- login as auditor, POST /items, assert 403
  17. `it('allows bookkeeper to create items')` -- login as bookkeeper, POST /items, assert 201
  18. `it('denies bookkeeper from deleting items')` -- login as bookkeeper, DELETE /items/{id}, assert 403

  Run: `php artisan test --filter=ItemTest`

- [ ] T019 [T][P1] **Write Item-on-Invoice integration tests.** Create `tests/Feature/Api/ItemInvoiceIntegrationTest.php`. Tests:

  1. `it('can create an invoice with item_id on a line')` -- Create item, POST invoice with line containing `item_id`, assert line has `item_id` in response
  2. `it('preserves line data when item is deleted')` -- Create item, create invoice with item, delete item, GET invoice -- assert line description/price preserved, item_id is null
  3. `it('does not affect existing invoices when item price changes')` -- Create item at $100, create invoice, update item to $150, GET invoice -- assert line still shows $100

  Run: `php artisan test --filter=ItemInvoiceIntegrationTest`

---

## Phase 2: Frontend Items Page

### Types & Data Layer

- [ ] T020 [F][P2] **Create Item TypeScript types.** Create `frontend/src/types/item.ts` with: `ItemType` type alias (`'service' | 'product' | 'both'`), `Item` interface matching `ItemResource` response (id, uuid, code, name, description, item_type, is_sold, is_purchased, is_active, sell_description, sell_price, sell_account_id, sell_tax_code, buy_description, buy_price, buy_account_id, buy_tax_code, unit_of_measure, category, is_tracked, created_at, updated_at). Add re-exports in `frontend/src/types/index.ts`: `export type { Item, ItemType } from './item';`

- [ ] T021 [F][P2] **Create use-items TanStack Query hook.** Create `frontend/src/hooks/use-items.ts` following the exact pattern of `frontend/src/hooks/use-contacts.ts`. Implement:

  **Types**: `ItemsParams` (page, per_page, search, status, type, category), `CreateItemPayload` (all item fields for create), `UpdateItemPayload` (Partial of create + is_active).

  **Hooks**:
  - `useItems(params?: ItemsParams)` -- `useQuery<PaginatedResponse<Item>>` with queryKey `['items', params]`, GET `/items`
  - `useItem(id: number)` -- `useQuery<Item>` with queryKey `['items', id]`, GET `/items/${id}`
  - `useItemCounts()` -- `useQuery<Record<string, number>>` with queryKey `['items', 'counts']`, GET `/items/counts`
  - `useItemSearch(query: string, context: 'sell' | 'buy')` -- `useQuery<Item[]>` with queryKey `['items', 'search', query, context]`, GET `/items/search?q=${query}&context=${context}`, `enabled: query.length >= 1`
  - `useCreateItem()` -- `useMutation` with POST `/items`, invalidates `['items']` on success
  - `useUpdateItem()` -- `useMutation` with PATCH `/items/${id}`, invalidates `['items']` and `['items', id]` on success
  - `useDeleteItem()` -- `useMutation` with DELETE `/items/${id}`, invalidates `['items']` on success

  All mutations call `getCsrfCookie()` before the API call (matching existing pattern).

### Items List Page

- [ ] T022 [F][P2] **Create Items list page.** Create `frontend/src/app/w/[slug]/(dashboard)/items/page.tsx`. Follow the Contacts list page pattern. Structure:

  - `"use client"` directive
  - Page header: "Items" title, "New Item" button (links to `/w/${slug}/items/new`), "Import" button (opens import dialog)
  - `StatusTabs` component with tabs: Active (default), Inactive, All -- using `useItemCounts()` for counts
  - Search input (debounced, 300ms) using `useDebounce` hook
  - `DataTable` with columns: Code, Name, Sell Price (formatted as dollars from cents), Buy Price (formatted), Type (badge), Status (badge)
  - Row click navigates to `/w/${slug}/items/${item.id}`
  - Paginated via `useItems({ page, per_page: 25, search, status: activeTab })`
  - Empty state when no items exist with prompt to create first item

- [ ] T023 [F][P2] **Create Item form component.** Create `frontend/src/components/items/item-form.tsx`. Shared form used by both create and edit pages. Props: `initialData?: Item` (for edit mode), `onSubmit: (data) => void`, `isSubmitting: boolean`.

  - Use React Hook Form (`useForm`) with Zod schema validation
  - Zod schema: name (string, min 1, max 255), code (string optional, max 50), description (string optional), item_type (enum: service/product/both), is_sold (boolean), is_purchased (boolean), sell_description (string optional), sell_price (number, transform to/from cents for display), sell_account_id (number nullable), sell_tax_code (string nullable), buy_description (string optional), buy_price (number, transform to/from cents), buy_account_id (number nullable), buy_tax_code (string nullable), unit_of_measure (string optional), category (string optional)
  - Sections: **Basic Info** (name, code, description, item_type, unit_of_measure, category), **Sell Configuration** (conditionally shown when `is_sold` is true -- sell_description, sell_price, sell_account, sell_tax_code), **Buy Configuration** (conditionally shown when `is_purchased` is true -- buy_description, buy_price, buy_account, buy_tax_code)
  - Account fields use a combobox/select fetching from `useAccounts()` hook (existing)
  - Tax code fields use a select fetching from `useTaxCodes()` hook (existing)
  - Price fields display as dollars (e.g., "150.00") but submit as cents (15000)
  - Submit button: "Save Item" with `Cmd+Enter` shortcut

- [ ] T024 [F][P2] **Create Item create page.** Create `frontend/src/app/w/[slug]/(dashboard)/items/new/page.tsx`. Renders the `ItemForm` component. On submit, calls `useCreateItem()` mutation. On success, navigates to `/w/${slug}/items` with a success toast. Page title: "New Item". Back link to items list.

- [ ] T025 [F][P2] **Create Item detail/edit page.** Create `frontend/src/app/w/[slug]/(dashboard)/items/[id]/page.tsx`. Fetches item via `useItem(id)`. Renders `ItemForm` with `initialData` pre-filled. On submit, calls `useUpdateItem()` mutation. Shows loading skeleton while fetching. Includes "Delete" button (calls `useDeleteItem()`, confirms via dialog, navigates back to list). Includes "Activate" button if item is inactive (calls PATCH with `is_active: true`).

### Navigation & Feature Flag

- [ ] T026 [F][P2] **Add Items to sidebar navigation.** Edit the sidebar navigation component (find in `frontend/src/components/layout/`). Add "Items" nav link with icon (`Package` from lucide-react). Position it near Contacts/Invoices in the Sales/Business section. Feature-gate the link: only show when workspace features include `items_catalogue`. Use the existing pattern for feature-gated nav items (check how other feature-flagged items like AI chatbot are conditionally rendered). Add keyboard shortcut hint if applicable.

### CSV Import

- [ ] T027 [B][P2] **Create ImportItems action.** Create `app/Actions/Item/ImportItems.php` with `use AsAction` trait. `handle(int $workspaceId, array $rows, array $mapping): array` method: iterate through rows, map CSV columns using the provided mapping, validate each row (name required, code unique within workspace), create `Item` records in a database transaction. Return `{ created: N, errors: [...] }`. Handle: duplicate codes (skip with error), missing required fields (skip with error), invalid item_type (default to 'service'). Resolve account codes to `chart_account_id` by looking up `ChartAccount::where('workspace_id', $workspaceId)->where('code', $accountCode)->first()`.

- [ ] T028 [B][P2] **Create ImportItemsRequest.** Create `app/Http/Requests/Item/ImportItemsRequest.php` extending FormRequest. `authorize()`: return `$this->user()->can('import', Item::class)`. `rules()`: `file` -> `['required', 'file', 'mimes:csv,txt', 'max:5120']`, `mapping` -> `['required', 'array']`, `mapping.name` -> `['required', 'string']` (the CSV column name that maps to item name).

- [ ] T029 [B][P2] **Add import method to ItemController.** Edit `app/Http/Controllers/Api/ItemController.php`: add `import(ImportItemsRequest $request): JsonResponse` method. Parse CSV file from request, extract headers, apply column mapping, call `ImportItems::run()`. Return JSON with `{ created: N, errors: [...] }`.

- [ ] T030 [F][P2] **Create CSV import dialog.** Create `frontend/src/components/items/item-import-dialog.tsx`. Dialog component (shadcn `Dialog` or `Sheet`). Steps:

  1. **Upload**: File drop zone accepting `.csv` files. On upload, parse headers client-side.
  2. **Map columns**: Show detected CSV columns as a dropdown for each item field (name, code, sell_price, buy_price, sell_account_code, buy_account_code, sell_tax_code, buy_tax_code, unit_of_measure, category, item_type). Auto-map obvious matches (e.g., "Name" -> name, "Code" -> code).
  3. **Preview**: Show first 10 rows in a table with validation status (green checkmark / red X per row).
  4. **Import**: Submit to API, show progress, display result (N created, N errors with details).

  Use `useImportItems()` mutation hook (add to `use-items.ts` as a multipart form mutation).

### Phase 2 Tests

- [ ] T031 [T][P2] **Write Item import tests.** Create `tests/Feature/Api/ItemImportTest.php`. Tests:

  1. `it('can import items from CSV')` -- Upload valid CSV with 5 items, assert 200, assert 5 items created
  2. `it('flags duplicate codes during import')` -- CSV with 2 rows having same code, assert errors array contains duplicate message
  3. `it('requires name column in mapping')` -- Submit import without name mapping, assert 422
  4. `it('resolves account codes to IDs')` -- CSV with account code "41000", assert created item has correct sell_account_id
  5. `it('denies auditor from importing')` -- login as auditor, POST /items/import, assert 403

  Run: `php artisan test --filter=ItemImportTest`

---

## Phase 3: Line Item Integration

### LineItemGrid Upgrade

- [ ] T032 [F][P3] **Update LineItem type and GridLookups.** Edit `frontend/src/components/line-item-grid/types.ts`:
  - Add `item_id?: number;` to the `LineItem` interface (after `id?: number;`)
  - Add `import type { Item } from "@/types";` at top
  - Add `items?: Item[];` to the `GridLookups` interface

- [ ] T033 [F][P3] **Add onCreateNew prop to ComboboxCell.** Edit `frontend/src/components/line-item-grid/cells/combobox-cell.tsx`:
  - Add `onCreateNew?: () => void;` and `createNewLabel?: string;` to `ComboboxCellProps` interface
  - After `<CommandEmpty>` in the render, conditionally render a `<CommandItem>` at the bottom of the list when `onCreateNew` is defined: `<CommandItem onSelect={onCreateNew} className="text-primary"><Plus className="mr-2 size-4" />{createNewLabel ?? "+ Create new"}</CommandItem>`
  - Import `Plus` from `lucide-react`

- [ ] T034 [F][P3] **Build handleItemChange in LineItemGrid.** Edit `frontend/src/components/line-item-grid/line-item-grid.tsx`:
  - Add `items?: Item[]` import from types
  - Build `itemOptions: ComboboxOption[]` via useMemo from `lookups.items` (filter `is_active`), map to `{ value: item.id, label: item.name, sublabel: item.code ?? undefined }`
  - Create `handleItemChange(index: number, itemId: number | null)` callback: find the item in `lookups.items`, determine document context (sell vs buy -- derive from `variant`: `invoice`/`credit` = sell, others need a new `documentType?: 'sell' | 'buy'` prop). Build updates: `{ item_id: itemId, item_code: item.code }`. If sell context: also set `description: item.sell_description ?? item.name`, `unit_price: item.sell_price`, `tax_code: item.sell_tax_code`, `chart_account_id: item.sell_account_id`. If buy context: use `buy_description`, `buy_price`, `buy_tax_code`, `buy_account_id`. If itemId is null, set `item_id: undefined, item_code: undefined` (clear item, keep other fields). Call `updateLine(index, updates)`.
  - Add `documentType?: 'sell' | 'buy'` to `LineItemGridProps` interface (default `'sell'`)
  - Add `handleItemChange` to `CellContext` interface

- [ ] T035 [F][P3] **Replace item_code cell renderer.** Edit `frontend/src/components/line-item-grid/line-item-grid.tsx`, in the `renderCell` function, replace the `case "item_code"` block: instead of `EditableTextCell`, render `ComboboxCell` with `value={line.item_id ?? null}`, `options={ctx.itemOptions}`, `onChange={(v) => ctx.handleItemChange(rowIndex, v as number | null)}`, `placeholder="Item"`, `searchPlaceholder="Search items..."`, `showSublabel`, `onNavigate={onNav}`. Add `onCreateNew` prop (see T036). For `readOnly` mode, display `line.item_code ?? ""` as before. Add `itemOptions` to the `CellContext` interface and pass it in the render call.

- [ ] T036 [F][P3] **Create ItemQuickCreateDialog.** Create `frontend/src/components/line-item-grid/item-quick-create-dialog.tsx`. A compact dialog for creating an item inline from the invoice form. Props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `onCreated: (item: Item) => void`, `context: 'sell' | 'buy'`.

  - Minimal form fields: name (required), sell_price / buy_price (based on context), sell_tax_code / buy_tax_code (combobox), sell_account_id / buy_account_id (combobox)
  - Uses React Hook Form + Zod for validation
  - On submit, calls `useCreateItem()` mutation
  - On success, calls `onCreated(item)` which the parent uses to select the new item on the current line
  - Uses shadcn `Dialog` component

- [ ] T037 [F][P3] **Wire quick create into LineItemGrid.** Edit `frontend/src/components/line-item-grid/line-item-grid.tsx`:
  - Add state: `const [quickCreateRow, setQuickCreateRow] = useState<number | null>(null)`
  - In the `item_code` ComboboxCell, set `onCreateNew={() => setQuickCreateRow(rowIndex)}` and `createNewLabel="+ New Item"`
  - Render `<ItemQuickCreateDialog>` at the bottom of the component, passing `open={quickCreateRow !== null}`, `onOpenChange={(open) => { if (!open) setQuickCreateRow(null) }}`, `onCreated={(item) => { handleItemChange(quickCreateRow!, item.id); setQuickCreateRow(null); }}`
  - Import `ItemQuickCreateDialog` and `Item` type

### Backend Integration

- [ ] T038 [B][P3] **Update CreateInvoice action for item_id.** Edit `app/Actions/Invoicing/CreateInvoice.php`: in the `normalizeLines()` method, preserve `item_id` on the line array -- ensure it passes through to the event and projector. No special logic needed since `item_id` is just a reference. The line already stores copies of description, unit_price, tax_code, and chart_account_id, so item defaults are preserved by the existing copy mechanism. Just ensure `item_id` is not stripped from the line data.

- [ ] T039 [B][P3] **Add items to DemoPersonasSeeder.** Edit `database/seeders/DemoPersonasSeeder.php`: in the demo workspace setup, create 5-10 sample items covering different types: "Website Design" (service, sell $150/hr), "Logo Design" (service, sell $500 flat), "Hosting Package" (product, sell $29/mo), "Business Cards" (product, sell $120, buy $40), "Consulting" (service, sell $200/hr). This ensures the demo workspace has items for testing and demos. Use the admin workspace's chart accounts for sell/buy account IDs.

### Wiring Into Document Forms

- [ ] T040 [F][P3] **Pass items to LineItemGrid from invoice form.** Edit the invoice create/edit page (`frontend/src/app/w/[slug]/(dashboard)/invoicing/` or wherever the invoice form lives). Add `useItemSearch()` or pre-fetch items via `useItems()` and pass them to `<LineItemGrid lookups={{ ...existingLookups, items: itemsData }}>`. Set `documentType="sell"` for invoices. Ensure the search hook is debounced. Also update the bill form pages to pass `documentType="buy"`.

- [ ] T041 [F][P3] **Pass items to LineItemGrid from bill form.** Same as T040 but for the bill create/edit pages. Set `documentType="buy"` so the `handleItemChange` auto-fills buy config (buy_description, buy_price, buy_tax_code, buy_account_id) instead of sell config.

- [ ] T042 [F][P3] **Pass items to LineItemGrid from credit note form.** Same as T040 for credit note forms. Credit notes use sell config by default (they reverse invoices). Set `documentType="sell"`.

### Phase 3 Tests

- [ ] T043 [T][P3] **Write browser tests for Items.** Create `tests/Browser/ItemsTest.php` using Pest browser plugin. Tests:

  1. `it('loads the items list page')` -- `browserLogin()`, navigate to `/items`, assert page title "Items" visible, assert StatusTabs visible
  2. `it('can create an item via the form')` -- navigate to `/items/new`, fill in name "Test Item", fill in sell price, click Save, assert redirected to items list, assert "Test Item" visible
  3. `it('can search items')` -- create items via API seed, navigate to `/items`, type in search box, assert filtered results
  4. `it('shows item column on invoice form')` -- navigate to invoice create page, assert "Item" column header visible in line grid
  5. `it('can select an item on invoice line')` -- create item via seed, navigate to invoice form, click Item combobox on first line, type item name, select from dropdown, assert description field auto-filled
  6. `it('can create item inline from invoice form')` -- on invoice form, click Item combobox, click "+ New Item", fill in name + price, save, assert item selected on line

  Run: `FRONTEND_URL=http://localhost:3001 vendor/bin/pest tests/Browser/ItemsTest.php`

---

## Phase 3+ (P3 Stretch / Future Sprint)

### Reporting

- [ ] T044 [B][P3+] **Create Revenue by Item report endpoint.** Add `GET /api/v1/reports/revenue-by-item` endpoint. Accept `?from=YYYY-MM-DD&to=YYYY-MM-DD&group_by=category`. Query: join `invoice_lines` with `items` on `item_id`, filter by invoice `status = 'paid'` and `issue_date` range, group by item, calculate `SUM(amount)` as total_revenue, `COUNT(DISTINCT invoice_id)` as invoice_count, `AVG(unit_price)` as avg_price. Return grouped results. Gate behind `report.profit-loss` permission.

- [ ] T045 [F][P3+] **Create Revenue by Item report page.** Create report page at `/w/[slug]/reports/revenue-by-item`. Date range picker, table showing items with revenue, invoice count, average price. Optional group-by-category toggle showing subtotals per category. Reuse existing report page layout patterns.
