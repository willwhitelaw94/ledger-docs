---
title: "Implementation Plan: Fixed Asset Register & Depreciation"
---

# Implementation Plan: Fixed Asset Register & Depreciation

**Branch**: `feature/033-FAR-fixed-asset-register` | **Date**: 2026-03-16 | **Spec**: [spec.md](./spec.md)

## Summary

Build a toggleable Fixed Asset Register module that tracks tangible and intangible assets with automated depreciation/amortization. Reuses the Financial Schedule Engine built in 032-LAT — depreciation is just another schedule type. Assets auto-create chart accounts, generate depreciation schedules, and post JEs automatically via the existing daily `schedules:run` command.

## Technical Context

**Language/Version**: PHP 8.4 (Laravel 12) + TypeScript (Next.js 16, React 19)
**Primary Dependencies**: Financial Schedule Engine (from 032-LAT), DepreciationCalculator (new), existing CreateJournalEntry action
**Storage**: SQLite (local dev)
**Testing**: Pest v4 (Feature + Unit) + Playwright (Browser)
**Constraints**: All amounts as integers (cents), workspace-scoped via `workspace_id`

### Reused from 032-LAT
- `app/Services/FinancialScheduleEngine.php` — schedule creation, daily runner, missed entry catch-up
- `app/Models/Tenant/FinancialSchedule.php` — polymorphic schedule with `schedulable_type = 'asset'`
- `app/Console/Commands/RunFinancialSchedules.php` — daily `schedules:run` command (already scheduled)
- `database/migrations/..._create_financial_schedules_table.php` — already migrated

## Gate 3: Architecture Check

### 1. Technical Feasibility — PASS

| Check | Status |
|-------|--------|
| Architecture approach clear | ✅ Follows Loan pattern exactly — Actions, Eloquent, Resources, reuses Schedule Engine |
| Existing patterns leveraged | ✅ Same CRUD + schedule pattern as 032-LAT |
| No impossible requirements | ✅ Standard depreciation formulas (straight-line, diminishing value, units of production) |
| Performance considered | ✅ Max ~100 assets per workspace, schedules are small (60 entries for 5yr monthly) |
| Security considered | ✅ Workspace-scoped, policy-based authorization |

### 2. Data & Integration — PASS

| Check | Status |
|-------|--------|
| Data model understood | ✅ 4 new tables + 5 enums, reuses financial_schedules |
| API contracts clear | ✅ ~15 endpoints defined below |
| Dependencies identified | ✅ Financial Schedule Engine, CreateJournalEntry, Contacts, Chart of Accounts |
| Integration points mapped | ✅ Schedule Engine processes 'asset' type, JE creation via existing action |
| DTO persistence explicit | ✅ Spatie Data class for asset creation |

### 3. Implementation Approach — PASS

| Check | Status |
|-------|--------|
| File changes identified | ✅ Listed per phase below |
| Risk areas noted | ✅ Diminishing value calculation, pro-rata disposal, bulk import |
| Testing approach defined | ✅ Unit tests for math, feature tests for API |
| Rollback possible | ✅ Module toggle, new tables only |

### 4-6. All other checks — PASS
Same patterns as 032-LAT. No new architectural risks.

### Pre-Check Notes
- Assets are NOT event-sourced — standard CRUD with JE integration via existing actions
- The FinancialScheduleEngine needs a new handler for `schedulable_type = 'asset'` — the `processSchedule()` method must be extended to create depreciation JEs
- DepreciationCalculator is a new service (separate from AmortizationCalculator) with straight-line, diminishing value, and units of production methods

---

## Design Decisions

### Data Model

#### New Enums

```php
// app/Enums/AssetCategory.php
enum AssetCategory: string {
    case Tangible = 'tangible';
    case Intangible = 'intangible';
}

// app/Enums/AssetType.php
enum AssetType: string {
    case Vehicle = 'vehicle';
    case Equipment = 'equipment';
    case Property = 'property';
    case Furniture = 'furniture';
    case Plant = 'plant';
    case Software = 'software';
    case Patent = 'patent';
    case Goodwill = 'goodwill';
    case Trademark = 'trademark';
    case Other = 'other';
}

// app/Enums/AssetStatus.php
enum AssetStatus: string {
    case InService = 'in_service';
    case FullyDepreciated = 'fully_depreciated';
    case Disposed = 'disposed';
}

// app/Enums/DepreciationMethod.php
enum DepreciationMethod: string {
    case StraightLine = 'straight_line';
    case DiminishingValue = 'diminishing_value';
    case UnitsOfProduction = 'units_of_production';
}

// app/Enums/DepreciationFrequency.php
enum DepreciationFrequency: string {
    case Monthly = 'monthly';
    case Quarterly = 'quarterly';
    case Annually = 'annually';
}

// app/Enums/DisposalMethod.php
enum DisposalMethod: string {
    case Sold = 'sold';
    case Scrapped = 'scrapped';
    case WrittenOff = 'written_off';
}
```

#### New Tables

**assets**
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| uuid | uuid unique | route binding |
| workspace_id | bigint FK | |
| name | string | e.g., "Vehicle — Toyota HiLux" |
| category | enum(AssetCategory) | tangible/intangible |
| type | enum(AssetType) | |
| purchase_date | date | |
| cost | bigint | cents |
| residual_value | bigint | cents |
| useful_life_months | int | |
| depreciation_method | enum(DepreciationMethod) | |
| depreciation_frequency | enum(DepreciationFrequency) | |
| status | enum(AssetStatus) | default 'in_service' |
| accumulated_depreciation | bigint | cents, cached/updated |
| net_book_value | bigint | cents, cached (cost - accum) |
| total_estimated_units | int nullable | for units of production |
| units_used | int nullable | running total |
| asset_account_id | bigint FK | auto-created |
| accum_depreciation_account_id | bigint FK | auto-created contra |
| depreciation_expense_account_id | bigint FK | auto-created |
| contact_id | bigint FK nullable | supplier |
| purchase_bill_id | bigint FK nullable | linked bill |
| purchase_journal_entry_id | bigint FK nullable | linked JE |
| custom_type_label | string nullable | when type = 'other' |
| created_by | bigint FK | |
| timestamps + soft deletes | | |

**asset_depreciation_entries**
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| asset_id | bigint FK cascade | |
| period_number | int | |
| date | date | |
| depreciation_amount | bigint | cents |
| accumulated_depreciation | bigint | cents running total |
| net_book_value | bigint | cents after this entry |
| status | string | scheduled/posted/skipped |
| journal_entry_id | bigint FK nullable | |
| posted_at | datetime nullable | |

**asset_disposals**
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| asset_id | bigint FK | |
| disposal_date | date | |
| method | enum(DisposalMethod) | |
| proceeds | bigint | cents ($0 for scrap/write-off) |
| net_book_value_at_disposal | bigint | cents |
| gain_or_loss | bigint | cents (positive=gain, negative=loss) |
| pro_rata_depreciation | bigint | cents |
| journal_entry_id | bigint FK | closing JE |
| disposed_by | bigint FK | |
| timestamps | | |

**asset_revaluations**
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| asset_id | bigint FK | |
| date | date | |
| previous_value | bigint | cents |
| new_value | bigint | cents |
| adjustment_amount | bigint | cents (positive=up, negative=down) |
| reason | text | |
| journal_entry_id | bigint FK | |
| revalued_by | bigint FK | |
| timestamps | | |

### API Contracts

#### Asset CRUD
| Method | Endpoint | Action | Auth |
|--------|----------|--------|------|
| GET | `/api/v1/assets` | ListAssets | asset.view |
| POST | `/api/v1/assets` | CreateAsset | asset.create |
| GET | `/api/v1/assets/{uuid}` | ShowAsset | asset.view |
| PATCH | `/api/v1/assets/{uuid}` | UpdateAsset | asset.update |
| DELETE | `/api/v1/assets/{uuid}` | DeleteAsset | asset.delete |

#### Asset Actions
| Method | Endpoint | Action | Auth |
|--------|----------|--------|------|
| GET | `/api/v1/assets/{uuid}/schedule` | GetSchedule | asset.view |
| POST | `/api/v1/assets/{uuid}/dispose` | DisposeAsset | asset.dispose |
| POST | `/api/v1/assets/{uuid}/revalue` | RevalueAsset | asset.revalue |
| POST | `/api/v1/assets/{uuid}/record-usage` | RecordUsage (UoP) | asset.update |

#### Bulk Import
| Method | Endpoint | Action | Auth |
|--------|----------|--------|------|
| POST | `/api/v1/assets/import` | BulkImportAssets | asset.create |

#### Dashboard & Reports
| Method | Endpoint | Action | Auth |
|--------|----------|--------|------|
| GET | `/api/v1/dashboard/assets` | AssetDashboardWidget | asset.view |
| GET | `/api/v1/reports/assets` | AssetScheduleReport | report.general-ledger |

### UI Components

```
frontend/src/
├── app/(dashboard)/assets/
│   ├── page.tsx                    # Asset Register
│   ├── new/page.tsx                # Create Asset
│   ├── import/page.tsx             # Bulk CSV Import
│   ├── [uuid]/
│   │   ├── page.tsx                # Asset Detail
│   │   ├── components/
│   │   │   ├── AssetSummary.tsx    # Key metrics card
│   │   │   ├── DepreciationTable.tsx # Schedule table
│   │   │   ├── DepreciationHistory.tsx # Posted JE list
│   │   │   ├── DisposalSheet.tsx   # Dispose slide-over
│   │   │   ├── RevaluationSheet.tsx # Revalue slide-over
│   │   │   └── AssetProgress.tsx   # Depreciation progress bar
│   │   └── edit/page.tsx           # Edit Asset
├── app/(dashboard)/dashboard/components/widgets/
│   └── asset-widget.tsx            # Dashboard widget
├── app/(dashboard)/reports/assets/
│   └── page.tsx                    # Asset schedule report
├── components/assets/
│   ├── AssetForm.tsx               # Shared create/edit form
│   └── CsvImportForm.tsx           # Bulk import form
├── hooks/
│   ├── use-assets.ts               # TanStack Query hooks
│   └── use-asset-schedule.ts       # Schedule hooks
└── types/
    └── assets.ts                   # All asset types
```

---

## Implementation Phases

### Phase 1: Foundation (Sprint 1)

**Goal**: Enums, migrations, models, DepreciationCalculator service, CRUD actions, controller, routes, tests.

**Backend Files**:
- 6 enums (AssetCategory, AssetType, AssetStatus, DepreciationMethod, DepreciationFrequency, DisposalMethod)
- 4 migrations (assets, asset_depreciation_entries, asset_disposals, asset_revaluations)
- 4 models (Asset, AssetDepreciationEntry, AssetDisposal, AssetRevaluation)
- `app/Services/DepreciationCalculator.php` — straight-line, diminishing value, units of production
- Actions: CreateAsset, UpdateAsset, DeleteAsset, GenerateDepreciationSchedule
- Controller, Resources, Form Requests, Policy
- Update RolesAndPermissionsSeeder: asset.view, asset.create, asset.update, asset.delete, asset.dispose, asset.revalue
- Update FinancialScheduleEngine to handle `schedulable_type = 'asset'`
- Routes

**Permissions**: `asset.view, asset.create, asset.update, asset.delete, asset.dispose, asset.revalue`

**Tests**: ~15 (DepreciationCalculator unit tests + Asset CRUD feature tests)

### Phase 2: Disposal, Revaluation & Schedule Integration (Sprint 2)

**Goal**: Dispose assets with gain/loss JEs, revalue with schedule recalculation, daily job processes asset schedules.

**Backend Files**:
- Actions: DisposeAsset, RevalueAsset, RecordUsage, PostDepreciationEntry
- Form Requests: DisposeAssetRequest, RevalueAssetRequest, RecordUsageRequest
- Resources: AssetDisposalResource, AssetRevaluationResource
- Extend FinancialScheduleEngine.processSchedule() for asset type — creates depreciation JE via CreateJournalEntry
- Pro-rata depreciation calculation on mid-period disposal

**Tests**: ~15 (disposal gain/loss, revaluation + recalc, daily job posts depreciation, pro-rata)

### Phase 3: Frontend (Sprint 3)

**Goal**: All React pages — register, detail, create, edit, dispose, revalue.

**Frontend Files**: All files listed in UI Components section.
- Types, hooks, shared components (AssetForm)
- Asset register with DataTable, filters, summary cards
- Asset detail with Summary/Schedule/History tabs
- DisposalSheet and RevaluationSheet slide-overs
- AssetProgress bar (percentage depreciated)
- Navigation: `G then A` (already reserved for Accounts — use `G then F` for Fixed Assets)

### Phase 4: Polish — Import, Dashboard, Report (Sprint 4)

**Goal**: Bulk CSV import, dashboard widget, report page, navigation.

**Backend**:
- Action: BulkImportAssets (CSV parse, validate, create assets with accumulated depreciation)
- Dashboard endpoint, report action

**Frontend**:
- CSV import page with preview/validation
- Dashboard asset widget
- Asset schedule report page
- Keyboard shortcut: `G then F` → Fixed Assets

---

## Testing Strategy

**Phase 1** (~15 tests): DepreciationCalculator (straight-line, diminishing, UoP, residual stop, $0 cost), Asset CRUD (create, update, delete, auth, scoping)
**Phase 2** (~15 tests): Disposal (sold gain, scrapped loss, pro-rata, closing JEs), Revaluation (up/down, schedule recalc), Daily job (posts depreciation JE, marks posted)
**Phase 3** (~5 tests): Browser tests (create asset, view schedule, dispose)
**Phase 4** (~10 tests): Bulk import (valid CSV, validation errors, accumulated depreciation), dashboard, report

**Total: ~45 tests**

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Diminishing value rounding over long periods | Medium | Medium | Each period recalculates from current NBV, not cumulative. Stop at residual. |
| Pro-rata disposal calculation edge cases | Medium | Medium | Day-count fraction of period. Unit tests for mid-month, end-of-month, first day. |
| Bulk import with bad data | Medium | Low | Validate each row, report errors, don't import partial. Preview step before commit. |
| Units of production has no time schedule | Low | Low | No FinancialSchedule created for UoP — manual usage entries only. |
| FinancialScheduleEngine coupling | Low | Medium | Asset handler is a new method alongside loan handler — clean separation. |
