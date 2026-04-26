---
title: "Implementation Tasks: Fixed Asset Register & Depreciation"
---

# Implementation Tasks: Fixed Asset Register & Depreciation

**Mode**: AI Agent
**Generated**: 2026-03-16
**Total Tasks**: 55
**Phases**: 4

---

## Phase 1: Foundation — Enums, Migrations, Models, Services, CRUD

### Enums (all parallelizable)

- [ ] T001 [P] Enum: `AssetCategory` — cases: Tangible('tangible'), Intangible('intangible'). Backed string enum. File: `app/Enums/AssetCategory.php`
- [ ] T002 [P] Enum: `AssetType` — cases: Vehicle('vehicle'), Equipment('equipment'), Property('property'), Furniture('furniture'), Plant('plant'), Software('software'), Patent('patent'), Goodwill('goodwill'), Trademark('trademark'), Other('other'). File: `app/Enums/AssetType.php`
- [ ] T003 [P] Enum: `AssetStatus` — cases: InService('in_service'), FullyDepreciated('fully_depreciated'), Disposed('disposed'). File: `app/Enums/AssetStatus.php`
- [ ] T004 [P] Enum: `DepreciationMethod` — cases: StraightLine('straight_line'), DiminishingValue('diminishing_value'), UnitsOfProduction('units_of_production'). File: `app/Enums/DepreciationMethod.php`
- [ ] T005 [P] Enum: `DepreciationFrequency` — cases: Monthly('monthly'), Quarterly('quarterly'), Annually('annually'). Add helper `periodsPerYear(): int` (monthly=12, quarterly=4, annually=1). File: `app/Enums/DepreciationFrequency.php`
- [ ] T006 [P] Enum: `DisposalMethod` — cases: Sold('sold'), Scrapped('scrapped'), WrittenOff('written_off'). File: `app/Enums/DisposalMethod.php`

### Migrations (sequential)

- [ ] T007 Migration: `create_assets_table` — columns: id, uuid (unique), workspace_id (FK), name (string), category (string), type (string), purchase_date (date), cost (bigint), residual_value (bigint), useful_life_months (int), depreciation_method (string), depreciation_frequency (string), status (string default 'in_service'), accumulated_depreciation (bigint default 0), net_book_value (bigint), total_estimated_units (int nullable), units_used (int nullable default 0), asset_account_id (FK chart_accounts), accum_depreciation_account_id (FK chart_accounts), depreciation_expense_account_id (FK chart_accounts), contact_id (FK contacts nullable), purchase_bill_id (FK invoices nullable), purchase_journal_entry_id (FK journal_entries nullable), custom_type_label (string nullable), created_by (FK users), timestamps, softDeletes. Indexes: [workspace_id, status], [workspace_id, category]. File: `database/migrations/2026_03_16_200001_create_assets_table.php`
- [ ] T008 Migration: `create_asset_depreciation_entries_table` — columns: id, asset_id (FK assets cascade), period_number (int), date (date), depreciation_amount (bigint), accumulated_depreciation (bigint), net_book_value (bigint), status (string default 'scheduled'), journal_entry_id (FK journal_entries nullable), posted_at (datetime nullable). Indexes: [asset_id, period_number], [asset_id, status]. File: `database/migrations/2026_03_16_200002_create_asset_depreciation_entries_table.php`
- [ ] T009 Migration: `create_asset_disposals_table` — columns: id, asset_id (FK assets), disposal_date (date), method (string), proceeds (bigint), net_book_value_at_disposal (bigint), gain_or_loss (bigint), pro_rata_depreciation (bigint default 0), journal_entry_id (FK journal_entries), disposed_by (FK users), timestamps. File: `database/migrations/2026_03_16_200003_create_asset_disposals_table.php`
- [ ] T010 Migration: `create_asset_revaluations_table` — columns: id, asset_id (FK assets), date (date), previous_value (bigint), new_value (bigint), adjustment_amount (bigint), reason (text), journal_entry_id (FK journal_entries), revalued_by (FK users), timestamps. File: `database/migrations/2026_03_16_200004_create_asset_revaluations_table.php`

### Models (depend on migrations)

- [ ] T011 [P] Model: `Asset` — $fillable: all columns. Casts: category (AssetCategory), type (AssetType), status (AssetStatus), depreciation_method (DepreciationMethod), depreciation_frequency (DepreciationFrequency), purchase_date (date), cost (integer), residual_value (integer), accumulated_depreciation (integer), net_book_value (integer). Relations: workspace BelongsTo, assetAccount BelongsTo(ChartAccount), accumDepreciationAccount BelongsTo(ChartAccount), depreciationExpenseAccount BelongsTo(ChartAccount), contact BelongsTo(Contact), purchaseBill BelongsTo(Invoice), purchaseJournalEntry BelongsTo(JournalEntry), depreciationEntries HasMany(AssetDepreciationEntry), disposal HasOne(AssetDisposal), revaluations HasMany(AssetRevaluation), financialSchedule MorphOne(FinancialSchedule), creator BelongsTo(User). Scopes: scopeInService, scopeDisposed, scopeTangible, scopeIntangible. Route key: uuid. SoftDeletes. File: `app/Models/Tenant/Asset.php`
- [ ] T012 [P] Model: `AssetDepreciationEntry` — $fillable, casts (date, integer amounts). Relations: asset BelongsTo, journalEntry BelongsTo. File: `app/Models/Tenant/AssetDepreciationEntry.php`
- [ ] T013 [P] Model: `AssetDisposal` — $fillable, casts (disposal_date date, method DisposalMethod, integer amounts). Relations: asset BelongsTo, journalEntry BelongsTo, disposedBy BelongsTo(User). File: `app/Models/Tenant/AssetDisposal.php`
- [ ] T014 [P] Model: `AssetRevaluation` — $fillable, casts (date, integer amounts). Relations: asset BelongsTo, journalEntry BelongsTo, revaluedBy BelongsTo(User). File: `app/Models/Tenant/AssetRevaluation.php`

### Service

- [ ] T015 Service: `DepreciationCalculator` — Static methods: `calculateStraightLine(int $costCents, int $residualCents, int $usefulLifeMonths, DepreciationFrequency $freq): array` — returns array of ['period', 'depreciation', 'accumulated', 'nbv']. Equal amount each period = (cost - residual) / totalPeriods. `calculateDiminishingValue(int $costCents, int $residualCents, int $usefulLifeMonths, DepreciationFrequency $freq, int $ratePercent): array` — each period: depreciation = NBV * periodic rate. Stop when NBV <= residual. `calculateUnitsOfProduction(int $costCents, int $residualCents, int $totalUnits, int $unitsUsed): int` — returns depreciation amount for this usage = (cost - residual) / totalUnits * unitsUsed. `calculateProRata(int $periodAmount, Carbon $periodStart, Carbon $periodEnd, Carbon $disposalDate): int` — day-count fraction. All amounts in cents. Final period adjusts to exactly hit residual value. Handle $0 cost (return empty schedule). File: `app/Services/DepreciationCalculator.php`

### Permissions & Policy

- [ ] T016 Update `RolesAndPermissionsSeeder` — add permissions: 'asset.view', 'asset.create', 'asset.update', 'asset.delete', 'asset.dispose', 'asset.revalue'. Assign: owner (all), accountant (all), bookkeeper (view, create, update), approver (view, dispose, revalue), auditor (view), client (view). File: `database/seeders/RolesAndPermissionsSeeder.php`
- [ ] T017 Policy: `AssetPolicy` — methods: viewAny, view, create, update, delete, dispose, revalue. Each returns `$user->hasPermissionTo('asset.{ability}')`. Register in AppServiceProvider. File: `app/Policies/AssetPolicy.php`

### Data, Requests, Actions

- [ ] T018 [P] Data: `AssetData` — Spatie Data class: name, category, type, purchase_date, cost, residual_value, useful_life_months, depreciation_method, depreciation_frequency, contact_id, purchase_bill_id, purchase_journal_entry_id, total_estimated_units, custom_type_label. File: `app/Data/AssetData.php`
- [ ] T019 [P] Request: `StoreAssetRequest` — authorize via can('create', Asset::class). Rules: name required, category required AssetCategory, type required AssetType, purchase_date required date, cost required integer min:0, residual_value required integer min:0, useful_life_months required integer min:1, depreciation_method required DepreciationMethod, depreciation_frequency required DepreciationFrequency, contact_id nullable exists:contacts, total_estimated_units required_if:depreciation_method,units_of_production. After: validate residual_value < cost. File: `app/Http/Requests/Asset/StoreAssetRequest.php`
- [ ] T020 [P] Request: `UpdateAssetRequest` — authorize via can('update', $asset). Same rules as Store but optional. Pre-load asset. File: `app/Http/Requests/Asset/UpdateAssetRequest.php`
- [ ] T021 Action: `CreateAsset` — AsAction. handle(AssetData $data, int $workspaceId, int $userId): Asset. Steps: 1) Auto-create 3 chart accounts (asset, accumulated depreciation contra, depreciation expense). 2) Create Asset with net_book_value = cost. 3) Generate depreciation schedule via DepreciationCalculator (skip for UoP). 4) Create FinancialSchedule record (skip for UoP). Return asset. File: `app/Actions/Asset/CreateAsset.php`
- [ ] T022 Action: `UpdateAsset` — AsAction. Only allow when status is in_service. Recalculate schedule if cost/residual/life changed. File: `app/Actions/Asset/UpdateAsset.php`
- [ ] T023 Action: `DeleteAsset` — AsAction. Validate no posted depreciation entries. Soft delete. File: `app/Actions/Asset/DeleteAsset.php`
- [ ] T024 Action: `GenerateDepreciationSchedule` — AsAction. handle(Asset $asset): void. Deletes existing scheduled entries. Calls DepreciationCalculator. Creates AssetDepreciationEntry rows. Calculates dates based on frequency from purchase_date. File: `app/Actions/Asset/GenerateDepreciationSchedule.php`

### Resources, Controller, Routes

- [ ] T025 [P] Resource: `AssetResource` — all fields + computed: percentage_depreciated, remaining_useful_life_months, monthly_depreciation. whenLoaded: contact, depreciationEntries, disposal, revaluations. File: `app/Http/Resources/AssetResource.php`
- [ ] T026 [P] Resource: `AssetDepreciationEntryResource` — all fields. File: `app/Http/Resources/AssetDepreciationEntryResource.php`
- [ ] T027 Controller: `AssetController` — methods: index (paginated, filterable by status/category/type), store, show, update, destroy, schedule. File: `app/Http/Controllers/Api/AssetController.php`
- [ ] T028 Routes in `routes/api.php` — apiResource('assets', AssetController). GET assets/{asset}/schedule. File: `routes/api.php`

### Phase 1 Tests

- [ ] T029 Unit test: `DepreciationCalculatorTest` — straight-line ($12k/0 residual/12mo = $1k/mo), straight-line with residual ($45k/$5k/60mo = $666.67), diminishing value 20%/yr, $0 cost asset, pro-rata calculation, final period hits residual exactly. File: `tests/Unit/Services/DepreciationCalculatorTest.php`
- [ ] T030 Feature test: `AssetApiTest` — create (tangible vehicle, intangible software, UoP), show with schedule, update (only in_service), delete (no entries OK, with entries 422), list (filtered by status/category), auth (bookkeeper can create, auditor cannot), workspace scoping. File: `tests/Feature/Api/AssetApiTest.php`

---

## Phase 2: Disposal, Revaluation & Schedule Integration (depends on Phase 1)

### Requests

- [ ] T031 [P] Request: `DisposeAssetRequest` — authorize via can('dispose', $asset). Pre-load asset. Rules: disposal_date required date, method required DisposalMethod, proceeds required integer min:0, bank_account_id required exists:chart_accounts. After: validate asset is in_service or fully_depreciated. File: `app/Http/Requests/Asset/DisposeAssetRequest.php`
- [ ] T032 [P] Request: `RevalueAssetRequest` — authorize via can('revalue', $asset). Pre-load asset. Rules: new_value required integer min:0, reason required string, date required date. After: validate asset is in_service. File: `app/Http/Requests/Asset/RevalueAssetRequest.php`
- [ ] T033 [P] Request: `RecordUsageRequest` — authorize via can('update', $asset). Rules: units required integer min:1, date required date. After: validate asset uses units_of_production method, units don't exceed remaining. File: `app/Http/Requests/Asset/RecordUsageRequest.php`

### Actions

- [ ] T034 Action: `DisposeAsset` — AsAction. handle(Asset $asset, array $data, int $userId): AssetDisposal. Steps: 1) Calculate pro-rata depreciation from last posted entry to disposal_date via DepreciationCalculator::calculateProRata. 2) Post pro-rata JE if > 0. 3) Calculate gain/loss = proceeds - (net_book_value - pro_rata). 4) Create closing JE: DR Bank (proceeds), DR Accumulated Depreciation (total accum + pro_rata), CR Asset Account (cost). If gain: CR Gain on Disposal. If loss: DR Loss on Disposal. 5) Create AssetDisposal record. 6) Update asset: status=disposed, accumulated_depreciation, net_book_value=0. 7) Deactivate FinancialSchedule. File: `app/Actions/Asset/DisposeAsset.php`
- [ ] T035 Action: `RevalueAsset` — AsAction. handle(Asset $asset, array $data, int $userId): AssetRevaluation. Steps: 1) Calculate adjustment = new_value - net_book_value. 2) Create JE: upward → DR Asset, CR Revaluation Reserve. Downward → DR Impairment Loss, CR Asset. 3) Create AssetRevaluation record. 4) Update asset: net_book_value = new_value. 5) Recalculate depreciation schedule from new_value over remaining life via GenerateDepreciationSchedule (pass remaining months). File: `app/Actions/Asset/RevalueAsset.php`
- [ ] T036 Action: `RecordUsage` — AsAction. handle(Asset $asset, int $units, Carbon $date, int $userId): AssetDepreciationEntry. Calculate depreciation via DepreciationCalculator::calculateUnitsOfProduction. Create JE (DR expense, CR accum). Create entry. Update asset units_used + accumulated_depreciation + net_book_value. Auto fully_depreciated if units_used >= total_estimated_units. File: `app/Actions/Asset/RecordUsage.php`
- [ ] T037 Action: `PostDepreciationEntry` — AsAction. handle(AssetDepreciationEntry $entry): void. Create JE via CreateJournalEntry (DR depreciation_expense_account, CR accum_depreciation_account). Update entry: status=posted, journal_entry_id, posted_at. Update asset: accumulated_depreciation, net_book_value. If net_book_value <= residual_value: set status=fully_depreciated, deactivate schedule. File: `app/Actions/Asset/PostDepreciationEntry.php`

### Extend FinancialScheduleEngine

- [ ] T038 Update `FinancialScheduleEngine::processSchedule()` — add case for schedulable_type='asset': find next scheduled AssetDepreciationEntry, call PostDepreciationEntry action. Handle catch-up (post all entries due on or before today). File: `app/Services/FinancialScheduleEngine.php`

### Controller Updates + Resources

- [ ] T039 Update `AssetController` — add methods: dispose, revalue, recordUsage. File: `app/Http/Controllers/Api/AssetController.php`
- [ ] T040 [P] Resource: `AssetDisposalResource` — all fields. File: `app/Http/Resources/AssetDisposalResource.php`
- [ ] T041 [P] Resource: `AssetRevaluationResource` — all fields. File: `app/Http/Resources/AssetRevaluationResource.php`
- [ ] T042 Routes — POST assets/{asset}/dispose, POST assets/{asset}/revalue, POST assets/{asset}/record-usage. File: `routes/api.php`

### Phase 2 Tests

- [ ] T043 Feature tests — disposal (sold with gain, scrapped with loss, pro-rata mid-month, closing JE accounts correct), revaluation (upward → revaluation reserve, downward → impairment loss, schedule recalculated), UoP usage recording, daily job posts depreciation JE, auto fully_depreciated at residual. File: `tests/Feature/Api/AssetApiTest.php` (additions)

---

## Phase 3: Frontend (depends on Phase 2)

### Types & Hooks

- [ ] T044 [P] Types: `assets.ts` — AssetCategory, AssetType, AssetStatus, DepreciationMethod, DepreciationFrequency, DisposalMethod, Asset, AssetDepreciationEntry, AssetDisposal, AssetRevaluation, AssetFormValues, label maps. File: `frontend/src/types/assets.ts`
- [ ] T045 [P] Hook: `use-assets.ts` — useAssets, useAsset, useCreateAsset, useUpdateAsset, useDeleteAsset, useDisposeAsset, useRevalueAsset, useRecordUsage, useDashboardAssets, useAssetReport. File: `frontend/src/hooks/use-assets.ts`
- [ ] T046 [P] Hook: `use-asset-schedule.ts` — useAssetSchedule(uuid). File: `frontend/src/hooks/use-asset-schedule.ts`

### Components

- [ ] T047 Component: `AssetForm.tsx` — React Hook Form + Zod. Fields: name, category (radio), type (select), purchase_date, cost (MoneyInput), residual_value (MoneyInput), useful_life_months (number), depreciation_method (select), depreciation_frequency (select — hidden for UoP), contact_id (ContactCombobox), total_estimated_units (number — shown only for UoP), custom_type_label (shown for 'other'). File: `frontend/src/components/assets/AssetForm.tsx`

### Pages

- [ ] T048 Page: Asset Register — DataTable with columns: Name, Category badge, Type, Purchase Date, Cost, Accum Depreciation, NBV, Method, Status badge, Remaining Life. Filters: status, category, type. Summary cards: total cost, total NBV, total accum depreciation. N shortcut. File: `frontend/src/app/(dashboard)/assets/page.tsx`
- [ ] T049 Page: Create Asset — renders AssetForm, useCreateAsset mutation. File: `frontend/src/app/(dashboard)/assets/new/page.tsx`
- [ ] T050 Page: Asset Detail — tabs: Summary, Schedule, History. Summary: AssetSummary + AssetProgress + action buttons (Dispose, Revalue). Schedule: DepreciationTable. History: posted JEs list. Sub-components: AssetSummary.tsx, DepreciationTable.tsx, DepreciationHistory.tsx, DisposalSheet.tsx, RevaluationSheet.tsx, AssetProgress.tsx. File: `frontend/src/app/(dashboard)/assets/[uuid]/page.tsx` + components/
- [ ] T051 Page: Edit Asset — AssetForm pre-filled, only in_service. File: `frontend/src/app/(dashboard)/assets/[uuid]/edit/page.tsx`
- [ ] T052 Navigation — add "Fixed Assets" to sidebar with Building2 icon, `G then F` shortcut. Add assets report under Reports. File: `frontend/src/lib/navigation.ts`

---

## Phase 4: Import, Dashboard, Report (depends on Phase 3)

- [ ] T053 Action: `BulkImportAssets` — AsAction. Accepts CSV with columns: name, type, purchase_date, cost, residual_value, useful_life_months, depreciation_method, accumulated_depreciation. For each row: validate, create asset with accumulated_depreciation set, calculate remaining schedule from import date. Return count + errors. File: `app/Actions/Asset/BulkImportAssets.php`
- [ ] T054 Frontend: CSV import page — file upload, preview table showing parsed rows, validation errors per row, confirm button. File: `frontend/src/app/(dashboard)/assets/import/page.tsx` + `frontend/src/components/assets/CsvImportForm.tsx`
- [ ] T055 Dashboard endpoint — GET /api/v1/dashboard/assets. Returns: total_cost, total_accumulated_depreciation, total_net_book_value, current_period_depreciation, asset_count_by_status, top_assets (3 highest NBV). File: update AssetController or DashboardController, add route.
- [ ] T056 Frontend: Dashboard asset widget — total cost, total NBV, current period depreciation, asset count. Empty state. File: `frontend/src/components/dashboard/asset-widget.tsx` + update dashboard page.
- [ ] T057 Report endpoint + action — GET /api/v1/reports/assets. Returns all assets with YTD depreciation, remaining life, grouped by type. File: `app/Actions/Asset/GenerateAssetReport.php`, add route.
- [ ] T058 Frontend: Asset report page — DataTable with type filter, summary totals. File: `frontend/src/app/(dashboard)/reports/assets/page.tsx`
- [ ] T059 Phase 4 tests — bulk import (valid CSV, validation errors, accumulated depreciation sets correctly), dashboard endpoint, report. File: `tests/Feature/Api/AssetApiTest.php` (additions)
