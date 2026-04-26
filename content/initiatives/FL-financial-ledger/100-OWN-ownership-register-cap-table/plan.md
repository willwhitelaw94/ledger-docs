---
title: "Implementation Plan: Ownership Register & Cap Table"
---

# Implementation Plan: Ownership Register & Cap Table

**Branch**: `feature/100-OWN-ownership-register` | **Date**: 2026-04-02 | **Spec**: [spec.md](./spec.md)

## Summary

Add a lightweight per-entity ownership register with share classes, shareholder holdings (polymorphic — contacts or workspaces), cap table visualization, transfer history, and a practice-wide ownership report. Extends the existing EntityRelationship graph with share-level detail. 3 new workspace-scoped models, 3 migrations, 1 new controller, 6 actions, 1 new page, 1 practice report tab, nav cleanup.

## Technical Context

**Backend**: Laravel 12, PHP 8.4, PostgreSQL
**Frontend**: Next.js 16, React 19, TypeScript, TanStack Query, Zustand, shadcn/ui, Recharts
**Testing**: Pest v4 (PHP), Playwright browser tests
**Auth**: Sanctum cookie SPA + Spatie Permission (team mode)

### Dependencies (existing)

- `EntityRelationship` model (central, `HOLDS_SHARES` + percentage) — auto-sync target
- `Contact` model (workspace-scoped) — polymorphic holder
- `Workspace` model — entity type determines label mapping
- `RolesAndPermissionsSeeder` — 4 new permissions
- Sidebar navigation (`frontend/src/lib/navigation.ts`)
- Practice reports page (add Ownership tab)

### Constraints

- All amounts in cents (integer) — no floats
- Share counts as integers — no fractional shares
- Transfers are immutable — reversal-only pattern (matches journal entries)
- Workspace-scoped tables with `workspace_id` column + global scope
- UUID for API exposure, auto-increment for internal FKs

---

## Data Model

### New Tables

```
share_classes
├─ id (auto-increment PK)
├─ uuid (UUID, unique)
├─ workspace_id (FK → workspaces)
├─ name (string 100)
├─ total_authorised (integer)
├─ total_issued (integer)
├─ rights_description (text, nullable)
├─ timestamps
├─ soft_deletes
└─ INDEX (workspace_id)

share_holdings
├─ id (auto-increment PK)
├─ uuid (UUID, unique)
├─ workspace_id (FK → workspaces)
├─ share_class_id (FK → share_classes)
├─ holder_type (string 20: 'contact' | 'workspace')
├─ holder_id (integer)
├─ share_count (integer)
├─ investment_amount (integer, cents, default 0)
├─ amount_paid (integer, cents, default 0)
├─ amount_unpaid (integer, cents, default 0)
├─ issue_date (date)
├─ certificate_number (string 50, nullable)
├─ timestamps
├─ soft_deletes
├─ UNIQUE (workspace_id, share_class_id, holder_type, holder_id)
└─ INDEX (workspace_id, holder_type, holder_id)

share_transfers
├─ id (auto-increment PK)
├─ uuid (UUID, unique)
├─ workspace_id (FK → workspaces)
├─ share_class_id (FK → share_classes)
├─ from_holder_type (string 20, nullable)
├─ from_holder_id (integer, nullable)
├─ to_holder_type (string 20, nullable)
├─ to_holder_id (integer, nullable)
├─ quantity (integer)
├─ transfer_date (date)
├─ consideration_amount (integer, cents, default 0)
├─ reason (string 500, nullable)
├─ transfer_type (string 20: 'transfer' | 'new_issue' | 'cancellation' | 'buyback')
├─ recorded_by_user_id (FK → users)
├─ timestamps
├─ NO soft_deletes (immutable audit records)
└─ INDEX (workspace_id, share_class_id), INDEX (workspace_id, transfer_date)
```

### Morph Map

Add to `AppServiceProvider::boot()`:
```php
'share_class' => ShareClass::class,
'share_holding' => ShareHolding::class,
```

No morph map needed for ShareTransfer (not polymorphic target).

---

## API Contracts

### Share Classes

| Method | Path | Action | Auth |
|--------|------|--------|------|
| GET | `/share-classes` | List all for workspace | `ownership.view` |
| POST | `/share-classes` | Create share class | `ownership.create` |
| PATCH | `/share-classes/{uuid}` | Update share class | `ownership.update` |
| DELETE | `/share-classes/{uuid}` | Delete (if no holdings) | `ownership.delete` |

### Share Holdings

| Method | Path | Action | Auth |
|--------|------|--------|------|
| GET | `/share-holdings` | List all for workspace | `ownership.view` |
| POST | `/share-holdings` | Add shareholder | `ownership.create` |
| PATCH | `/share-holdings/{uuid}` | Update holding | `ownership.update` |
| DELETE | `/share-holdings/{uuid}` | Remove holding | `ownership.delete` |

### Share Transfers

| Method | Path | Action | Auth |
|--------|------|--------|------|
| GET | `/share-transfers` | List transfer history | `ownership.view` |
| POST | `/share-transfers` | Record transfer | `ownership.create` |

No PATCH/DELETE — transfers are immutable.

### Cap Table Summary

| Method | Path | Action | Auth |
|--------|------|--------|------|
| GET | `/ownership/summary` | Aggregated cap table data | `ownership.view` |

Returns: `{ share_classes: [...], holdings: [...], totals: { shareholders, shares, investment, unpaid } }`

### Practice Report

| Method | Path | Action | Auth |
|--------|------|--------|------|
| GET | `/practice/reports/ownership` | Cross-workspace ownership summaries | practice member |

---

## Implementation Phases

### Phase 1: Schema + Backend Core (P1 stories)

**Migrations:**
1. `create_share_classes_table`
2. `create_share_holdings_table`
3. `create_share_transfers_table`

**Models** (in `app/Models/Tenant/`):
- `ShareClass` — fillable, casts, `workspace()`, `holdings()`, `transfers()`, soft deletes
- `ShareHolding` — fillable, casts, polymorphic `holder()` (morphTo), `shareClass()`, computed `percentage` accessor, `amount_paid + amount_unpaid = investment_amount` validation
- `ShareTransfer` — fillable, casts, polymorphic `fromHolder()` / `toHolder()`, `shareClass()`, `recordedBy()`, NO soft deletes

**Enum:**
- `TransferType` — `Transfer`, `NewIssue`, `Cancellation`, `Buyback`

**Actions** (in `app/Actions/Ownership/`):
- `CreateShareClass` — validate, create, return
- `UpdateShareClass` — validate, update
- `DeleteShareClass` — block if holdings exist
- `CreateShareHolding` — validate, create, auto-sync EntityRelationship if holder is workspace
- `UpdateShareHolding` — validate, update, re-sync EntityRelationship
- `RecordShareTransfer` — validate, adjust holdings (create/update from & to), adjust `total_issued` for new issues / cancellations, sync EntityRelationship for workspace holders

**Controller:**
- `OwnershipController` — CRUD for share classes, holdings, transfers, summary endpoint

**Form Requests:**
- `StoreShareClassRequest`, `UpdateShareClassRequest`
- `StoreShareHoldingRequest`, `UpdateShareHoldingRequest`
- `StoreShareTransferRequest`

**Policy:**
- `ShareClassPolicy`, `ShareHoldingPolicy` — check `ownership.*` permissions

**Permissions:**
- Add `ownership.view`, `ownership.create`, `ownership.update`, `ownership.delete` to `RolesAndPermissionsSeeder`

**API Resources:**
- `ShareClassResource`, `ShareHoldingResource`, `ShareTransferResource`

**Routes** (inside workspace-scoped group in `api.php`):
```
Route::apiResource('share-classes', OwnershipController::class)->only(['index', 'store', 'update', 'destroy']);
Route::apiResource('share-holdings', OwnershipController::class)->only(['index', 'store', 'update', 'destroy']);
Route::get('share-transfers', [OwnershipController::class, 'transfers']);
Route::post('share-transfers', [OwnershipController::class, 'recordTransfer']);
Route::get('ownership/summary', [OwnershipController::class, 'summary']);
```

**Tests:**
- `tests/Feature/Api/OwnershipTest.php` — CRUD for share classes, holdings, transfers
- Authorization tests (bookkeeper can create, auditor view-only, client view-only)
- EntityRelationship auto-sync tests
- Transfer immutability tests
- Validation tests (over-allocation warning, paid + unpaid = investment)

### Phase 2: Frontend Cap Table Page (P1 stories)

**Page:**
- `frontend/src/app/w/[slug]/(dashboard)/ownership/page.tsx`
  - Sub-tabs: "Overview" (default) | "Transfers" (P2, can stub initially)
  - Overview tab: Summary card + Donut chart + Register table
  - Uses `StatusTabs` or inline tab component for sub-navigation

**Hooks** (`frontend/src/hooks/use-ownership.ts`):
- `useShareClasses()` — GET `/share-classes`
- `useCreateShareClass()`, `useUpdateShareClass()`, `useDeleteShareClass()`
- `useShareHoldings()` — GET `/share-holdings`
- `useCreateShareHolding()`, `useUpdateShareHolding()`, `useDeleteShareHolding()`
- `useOwnershipSummary()` — GET `/ownership/summary`
- `useShareTransfers()` — GET `/share-transfers`
- `useRecordTransfer()` — POST `/share-transfers`

**Types** (`frontend/src/types/ownership.ts`):
```typescript
type ShareClass = {
  uuid: string;
  name: string;
  total_authorised: number;
  total_issued: number;
  rights_description: string | null;
};

type ShareHolding = {
  uuid: string;
  share_class: ShareClass;
  holder_type: 'contact' | 'workspace';
  holder_id: number;
  holder_name: string;
  share_count: number;
  percentage: number; // basis points
  investment_amount: number;
  amount_paid: number;
  amount_unpaid: number;
  issue_date: string;
  certificate_number: string | null;
};

type ShareTransfer = {
  uuid: string;
  share_class: ShareClass;
  from_holder_name: string | null;
  to_holder_name: string | null;
  quantity: number;
  transfer_date: string;
  consideration_amount: number;
  reason: string | null;
  transfer_type: 'transfer' | 'new_issue' | 'cancellation' | 'buyback';
  recorded_by: string;
  created_at: string;
};

type OwnershipSummary = {
  share_classes: ShareClass[];
  holdings: ShareHolding[];
  totals: {
    shareholders: number;
    total_shares: number;
    total_investment: number;
    total_unpaid: number;
  };
};
```

**Components** (`frontend/src/components/ownership/`):
- `OwnershipSummaryCard` — Total shareholders, shares, investment, unpaid badge
- `OwnershipDonutChart` — Recharts PieChart with shareholder segments, "Others" grouping at 8+
- `ShareholderRegisterTable` — TanStack Table with holder name, class, count, %, paid/unpaid, cert #
- `ShareClassManager` — Inline cards showing each class with edit/delete, "Add Share Class" button
- `ShareHoldingForm` — Dialog for adding/editing a shareholder (polymorphic holder picker)
- `ShareClassForm` — Dialog for add/edit share class
- `TransferHistoryTable` — TanStack Table for transfer log (Phase 2 tab content)
- `RecordTransferForm` — Dialog for recording transfers

**Navigation:**
- Add "Ownership" to sidebar nav in `navigation.ts` — icon: `Share2`, shortcut: `G then O`, position before "Structure", hidden for `sole_trader` and `personal` entity types, permission: `ownership.view`

### Phase 3: Transfers + Practice Report + Nav (P2 stories)

**Transfers tab:**
- Wire up transfer history table on "Transfers" sub-tab
- Record transfer dialog with from/to holder pickers, transfer type selector
- "As at" date filter for point-in-time cap table reconstruction

**Practice report:**
- Add "Ownership" tab to `/practice/reports` page
- Practice-wide ownership summary endpoint: `GET /practice/reports/ownership`
- Table: entity name, type, shareholder count, top 3 holders, total shares
- Search by shareholder name across all entities

**Practice nav:**
- Add "Entity Map" to practice shell navigation (points to `/structure` or equivalent)

**Tests:**
- Transfer recording + holding adjustment
- Transfer immutability (reject edit/delete)
- Practice report data scoping
- "As at" date filtering
- Entity type nav visibility

---

## Gate 3: Architecture Check

### 1. Technical Feasibility

| Check | Status |
|-------|--------|
| Architecture approach clear | PASS — 3 workspace-scoped models, standard CRUD + polymorphic holders |
| Existing patterns leveraged | PASS — follows Invoice/Contact/JournalEntry patterns exactly |
| No impossible requirements | PASS — all items buildable with existing stack |
| Performance considered | PASS — simple queries, <50 shareholders per entity typical |
| Security considered | PASS — workspace-scoped, permission-gated, no cross-tenant leaks |

### 2. Data & Integration

| Check | Status |
|-------|--------|
| Data model understood | PASS — 3 tables defined with fields, constraints, indexes |
| API contracts clear | PASS — 12 endpoints defined with methods, paths, auth |
| Dependencies identified | PASS — EntityRelationship, Contact, Workspace, Permissions |
| Integration points mapped | PASS — auto-sync EntityRelationship, practice report aggregation |
| DTO persistence explicit | PASS — Form Requests for validation, not raw toArray() |

### 3. Implementation Approach

| Check | Status |
|-------|--------|
| File changes identified | PASS — models, controller, actions, migration, page, hooks, types, nav |
| Risk areas noted | PASS — polymorphic holder resolution, EntityRelationship sync |
| Testing approach defined | PASS — feature tests per phase, authorization matrix |
| Rollback possible | PASS — feature branch, migrations reversible |

### 4. Resource & Scope

| Check | Status |
|-------|--------|
| Scope matches spec | PASS — no over-engineering, no ESOP/vesting |
| Effort reasonable | PASS — M-size, 2-3 sprints |
| Skills available | PASS — standard Laravel + React patterns |

### 5. Laravel Best Practices

| Check | Status |
|-------|--------|
| No hardcoded business logic in frontend | PASS — percentage calculated backend, labels from entity type |
| Cross-platform reusability | PASS — all logic in API, frontend renders |
| Model route binding | PASS — UUID route binding on models |
| Use Lorisleiva Actions | PASS — 6 actions planned |
| Granular model policies | PASS — ShareClassPolicy, ShareHoldingPolicy |
| Migrations schema-only | PASS — permissions added via seeder |

### 6. Frontend Standards (Next.js/React Override)

| Check | Status |
|-------|--------|
| All components use TypeScript | PASS — `.tsx` with strict types |
| Props typed with interfaces/types | PASS — types defined in `types/ownership.ts` |
| No `any` types | PASS — all API shapes typed |
| TanStack Query for server state | PASS — hooks defined |
| Forms use React Hook Form + Zod | PASS — share class and holding forms |
| shadcn/ui components reused | PASS — Card, Dialog, Table, Badge, Chart |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Polymorphic holder complexity | Low | Medium | Well-understood pattern (morphTo), existing morph map |
| EntityRelationship sync edge cases | Medium | Medium | One-way sync only (register → graph), extensive tests |
| Over-allocation data inconsistency | Low | Low | Warning-only, no hard block, accountant responsible |
| Scope creep into equity mgmt | Medium | High | Strict "no ESOP" boundary, spec locked |

---

## Next Steps

1. `/speckit-tasks` — Generate implementation task list
2. Start Phase 1 (backend) immediately — no blockers
