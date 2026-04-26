---
title: "Implementation Plan: BAS & Tax Compliance Module"
description: "6-phase implementation plan for complete BAS field mapping, GST cash method, PDF export, PAYG instalments, IAS support, and tax agent dashboard."
---

# Implementation Plan: BAS & Tax Compliance Module

**Branch**: `feature/044-TAX-bas-tax-module` | **Date**: 2026-03-22 | **Spec**: [spec.md](/initiatives/FL-financial-ledger/044-TAX-bas-tax-module/spec)

## Summary

Complete the BAS & Tax Compliance module by closing gaps identified in the [research document](/initiatives/FL-financial-ledger/044-TAX-bas-tax-module/context/raw_context/tax-compliance-research): full BAS field mapping (G1-G20 + summary), workspace tax settings, GST cash method support, BAS PDF export for manual ATO lodgement, BAS rejection workflow, PAYG instalment calculator, IAS field differentiation, and practice dashboard enhancements. SBR2 electronic lodgement is deferred to v2 (see research for rationale).

The existing infrastructure is substantial -- 4 models, 6 enums, 8 actions, 1 controller (10 methods), 1 policy, 4 resources, 10 routes, 4 frontend components, 1 hook file, 1 type file, and 16 passing feature tests. This plan builds on top of that foundation.

## Technical Context

**Language/Version**: PHP 8.4 (Laravel 12), TypeScript (Next.js 16, React 19)
**Primary Dependencies**: Spatie Permission (teams mode), TanStack Query v5, React Hook Form + Zod, Zustand v5
**Storage**: PostgreSQL, single-database multi-tenancy with `workspace_id` scoping
**Testing**: Pest v4 (feature + browser via Playwright)
**Target Platform**: Web SPA (Next.js frontend + Laravel API)
**Depends On**: 007-FRC (complete), 002-CLE (complete), 015-ACT (complete), 005-IAR (complete -- invoicing/payments for cash GST)
**Monetary convention**: All amounts as `int` (cents). Tax rates as `rate_basis_points` (1000 = 10%).

---

## Gate 3: Architecture Check

### 1. Technical Feasibility

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | Extends existing models/actions/controller, adds workspace tax settings, PDF generation via DomPDF |
| Existing patterns leveraged | PASS | Lorisleiva Actions, `Gate::authorize()` for reads, API Resources, TanStack Query hooks, BasPeriodPolicy |
| No impossible requirements | PASS | All FRs buildable with current stack; SBR2 deferred |
| Performance considered | PASS | BAS report generation is per-period query, not full-table scan; practice overview uses indexed workspace_id |
| Security considered | PASS | `SetWorkspaceContext` middleware + `BasPeriodPolicy` for all BAS endpoints; practice overview uses advisor connections |

### 2. Data & Integration

| Check | Status | Notes |
|-------|--------|-------|
| Data model understood | PASS | 1 new table (`workspace_tax_settings`), 1 new table (`bas_rejections`), 0 modified tables (all existing tables sufficient) |
| API contracts clear | PASS | 6 new endpoints + 3 modified endpoints across 1 existing controller + 1 new settings controller |
| Dependencies identified | PASS | 005-IAR (complete -- payments table for cash GST), 015-ACT (complete -- advisor connections for practice dashboard) |
| Integration points mapped | PASS | `GenerateBasReport` needs cash GST path, `LodgeBas` needs manual receipt entry, PDF generation service |
| DTO persistence explicit | PASS | Tax settings via Form Request `validated()`, BAS fields via action params |

### 3. Implementation Approach

| Check | Status | Notes |
|-------|--------|-------|
| File changes identified | PASS | See File Manifest (~45 files) |
| Risk areas noted | PASS | Cash GST calculation complexity is highest risk -- requires payment-date-based GST attribution |
| Testing approach defined | PASS | Feature tests per phase, cash GST boundary tests critical |
| Rollback possible | PASS | All schema changes are additive; new features behind existing permission gates |

### 4. Laravel Best Practices

| Check | Status | Notes |
|-------|--------|-------|
| Use Lorisleiva Actions | PASS | `CalculatePaygInstalment`, `RejectBasPeriod`, `GenerateBasPdf`, `RecordManualLodgement` |
| Form Requests for mutations | PASS | `UpdateWorkspaceTaxSettingsRequest`, `RejectBasPeriodRequest`, `RecordManualLodgementRequest` |
| API Resources for responses | PASS | `WorkspaceTaxSettingsResource`, `BasRejectionResource` |
| Model route binding | PASS | Controllers use Model instances |
| Sanctum cookie auth | PASS | All routes under `auth:sanctum` + `SetWorkspaceContext` |

### 5. Next.js/React Standards

| Check | Status | Notes |
|-------|--------|-------|
| All components TypeScript | PASS | Every `.tsx` file uses strict TypeScript |
| Props typed with interfaces | PASS | Types in `types/tax.ts` (extended) |
| No `any` types | PASS | All API response types defined |
| TanStack Query for server state | PASS | Hooks in `use-bas.ts` (extended) |
| Zustand for client state | PASS | BAS wizard step state in Zustand store |
| React Hook Form + Zod | PASS | Tax settings form, PAYG configuration |

### Overall: PASS -- No red flags

---

## Architecture Overview

```
Existing (already built)                    New (this plan)
========================                    ================

BasPeriod model                             WorkspaceTaxSettings model (new)
BasLodgement model                          BasRejection model (new)
BasAdjustment model                         CalculatePaygInstalment action
PaygInstalment model                        RejectBasPeriod action
TaxCode model (bas_field)                   GenerateBasPdf action
                                            RecordManualLodgement action
6 Tax enums                                 GenerateBasFieldsComplete action
                                            GstMethod enum (accrual/cash)
8 Tax actions
  GenerateBasReport ----+
  PrepareBas            |                   BasController additions:
  AddBasAdjustment      +--- preserved        + reject()
  SubmitBasForApproval  |                     + recordLodgement()
  ApproveBasPeriod      |                     + downloadPdf()
  LodgeBas              |                     + fields()
  PostSettlementJe      |
  RecordPaygPayment ----+                   WorkspaceTaxSettingsController (new)

BasController (10 methods)                  BAS field calculation engine
BasPeriodPolicy                               (full G1-G20 + summary)
4 Resources                                 Cash GST calculation path
                                            BAS PDF generation (DomPDF)
16 feature tests                            Practice dashboard filters

Frontend:
  types/tax.ts                              Tax settings page
  hooks/use-bas.ts                          BAS wizard UI enhancements
  4 BAS components                          PAYG instalment UI
                                            ~20 additional tests
```

### Key Design Decisions

1. **PDF export via DomPDF** -- Laravel DomPDF package for server-side PDF generation. BAS layout uses a Blade template styled to match ATO form structure. PDF endpoint returns binary response with `Content-Type: application/pdf`.

2. **Cash GST via payments table** -- `GenerateBasFieldsComplete` gets a new code path for cash GST that queries invoice/bill payments within the BAS period, then pro-rates GST proportionally. This avoids creating duplicate JEs and works with the existing event-sourced payment flow.

3. **Manual lodgement recording replaces SBR2 stub** -- The existing `LodgeBas` action is kept but a new `RecordManualLodgement` action is added for v1. Users enter the ATO receipt number after lodging via the ATO portal. This triggers the same settlement JE flow.

4. **Full BAS field engine as a dedicated action** -- `GenerateBasFieldsComplete` wraps the existing `GenerateBasReport` and adds G-section calculations, derived fields, summary fields, and PAYG/withholding integration. The original action is preserved for backward compatibility.

5. **Workspace tax settings as a separate table** -- Not columns on `workspaces` table. Keeps tax configuration cleanly separated and allows for future tax-jurisdiction-specific settings without modifying the core workspace model.

6. **No new Spatie permissions** -- The existing `bas.prepare`, `bas.approve`, `bas.lodge` permissions cover all new actions. Rejection uses `bas.approve` (same role that approves can reject).

---

## Data Model

### New Table: `workspace_tax_settings`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `workspace_id` | FK workspaces, cascadeOnDelete, unique | One settings record per workspace |
| `abn` | string(11), nullable | Australian Business Number |
| `gst_registered` | boolean, default `true` | Whether workspace is GST registered |
| `gst_method` | string, default `'accrual'` | `accrual` or `cash` |
| `lodgement_frequency` | string, default `'quarterly'` | `quarterly` or `monthly` |
| `payg_instalment_method` | string, nullable | `ato_determined`, `income_based`, or null (no obligation) |
| `payg_instalment_rate_basis_points` | integer, nullable | ATO-notified rate (1000 = 10%) |
| `payg_instalment_amount` | integer, nullable | ATO-determined amount in cents |
| `bas_agent_name` | string, nullable | Tax agent name for BAS PDF |
| `bas_agent_abn` | string(11), nullable | Tax agent ABN |
| `bas_agent_number` | string, nullable | Tax agent registration number |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### New Table: `bas_rejections`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `bas_period_id` | FK bas_periods, cascadeOnDelete | |
| `rejected_by_user_id` | FK users, nullable, nullOnDelete | |
| `reason` | text | Required rejection reason |
| `created_at` | timestamp | |

Index: `bas_period_id`

---

## API Contracts

### New Endpoints

| Method | Path | Controller Method | Notes |
|--------|------|-------------------|-------|
| GET | `/tax-settings` | `WorkspaceTaxSettingsController@show` | Returns workspace tax settings (creates default if none) |
| PUT | `/tax-settings` | `WorkspaceTaxSettingsController@update` | Update tax settings (ABN, GST method, lodgement frequency, PAYG config) |
| POST | `/bas/periods/{basPeriod}/reject` | `BasController@reject` | Reject BAS period with reason, returns to IN_PROGRESS |
| POST | `/bas/periods/{basPeriod}/record-lodgement` | `BasController@recordLodgement` | Record manual ATO lodgement with receipt number |
| GET | `/bas/periods/{basPeriod}/pdf` | `BasController@downloadPdf` | Download ATO-formatted BAS PDF |
| GET | `/bas/periods/{basPeriod}/fields` | `BasController@fields` | Full BAS field breakdown (G1-G20 + summary + W + T) |

### Modified Endpoints

| Method | Path | Change |
|--------|------|--------|
| POST | `/bas/periods/prepare` | Use workspace tax settings for GST method and form type defaults |
| GET | `/bas/periods/{basPeriod}` | Include full field breakdown, rejection history |
| GET | `/practice/bas/overview` | Add status filter, period filter, sort by overdue |

---

## Implementation Phases

### Phase 1: BAS Preparation Engine (Sprint 1)

**~16 tasks, estimated 3 days**

#### Backend -- Migration & Models (4 tasks)

**Task 1.1**: Create migration `2026_03_23_100001_add_tax_settings_and_rejections.php`
- `workspace_tax_settings` table with all columns, unique index on `workspace_id`
- `bas_rejections` table with all columns, index on `bas_period_id`
- Follow existing migration pattern from `2026_03_22_100001_create_bas_periods_table.php`

**Task 1.2**: Create `app/Models/Tenant/WorkspaceTaxSettings.php`
- Fillable: `workspace_id`, `abn`, `gst_registered`, `gst_method`, `lodgement_frequency`, `payg_instalment_method`, `payg_instalment_rate_basis_points`, `payg_instalment_amount`, `bas_agent_name`, `bas_agent_abn`, `bas_agent_number`
- Casts: `gst_registered` -> `boolean`, `gst_method` -> `GstMethod` enum, `lodgement_frequency` -> `LodgementFrequency`, `payg_instalment_method` -> `PaygCalculationMethod` (nullable), `payg_instalment_rate_basis_points` -> `integer`, `payg_instalment_amount` -> `integer`
- Relationships: `workspace()`
- Scope: `scopeForWorkspace($query, $workspaceId)`

**Task 1.3**: Create `app/Models/Tenant/BasRejection.php`
- Fillable: `bas_period_id`, `rejected_by_user_id`, `reason`
- Relationships: `basPeriod()`, `rejectedBy()`

**Task 1.4**: Update `app/Models/Tenant/BasPeriod.php`
- Add `rejections()` hasMany relationship
- Add `latestRejection()` hasOne relationship (latest by created_at)

#### Backend -- Enums (1 task)

**Task 1.5**: Create `app/Enums/Tax/GstMethod.php`
- Backed string enum: `ACCRUAL = 'accrual'`, `CASH = 'cash'`
- Methods: `label()` -- "Accrual", "Cash"

#### Backend -- Complete BAS Field Engine (3 tasks)

**Task 1.6**: Create `app/Actions/Tax/GenerateBasFieldsComplete.php`
- Accepts: `workspaceId`, `fromDate`, `toDate`, `gstMethod` (GstMethod enum)
- Calls existing `GenerateBasReport::run()` for accrual path
- For cash path, queries `payments` table to determine which invoice/bill GST falls in period
- Calculates ALL fields: G1-G20 (with G5, G6, G8, G12, G16, G17, G19 as derived), 1A-9 summary, W1-W5 (placeholder zeros for v1), T1-T11 (from PAYG instalment config)
- Returns structured array with field code, label, amount (integer cents), is_calculated flag, and component field codes for derived fields
- Distinguishes capital (G10) vs non-capital (G11) purchases by chart account type

**Task 1.7**: Create cash GST calculation path in `GenerateBasFieldsComplete`
- Query `payments` table for payments received/made within the BAS period
- For each payment, find the related invoice/bill and its lines with tax codes
- Pro-rate GST per line: `gst_for_period = (int) round(payment_amount * line_tax_amount / invoice_total)` -- all integer cents
- Group by `bas_field` from the tax code
- Add rounding adjustment to last line to ensure sum matches total

**Task 1.8**: Update `app/Actions/Tax/PrepareBas.php`
- Load workspace tax settings to determine GST method
- Call `GenerateBasFieldsComplete` instead of `GenerateBasReport`
- Auto-determine form_type (BAS vs IAS) from lodgement_frequency setting
- Include PAYG instalment fields from workspace tax settings

#### Backend -- Tax Settings Controller (3 tasks)

**Task 1.9**: Create `app/Http/Controllers/Api/WorkspaceTaxSettingsController.php`
- `show()`: Returns workspace tax settings, creates default record if none exists. Uses `Gate::authorize('viewAny', BasPeriod::class)` (reuse bas.prepare permission).
- `update()`: Validates and updates tax settings. Uses Form Request.

**Task 1.10**: Create `app/Http/Requests/Tax/UpdateWorkspaceTaxSettingsRequest.php`
- Validates: `abn` (nullable, string, size:11, digits), `gst_registered` (boolean), `gst_method` (in: accrual, cash), `lodgement_frequency` (in: quarterly, monthly), `payg_instalment_method` (nullable, in: ato_determined, income_based), `payg_instalment_rate_basis_points` (nullable, integer, min:0, max:10000), `payg_instalment_amount` (nullable, integer, min:0), `bas_agent_name` (nullable, string, max:255), `bas_agent_abn` (nullable, string, size:11), `bas_agent_number` (nullable, string, max:50)
- `authorize()`: `$this->user()->can('prepare', BasPeriod::class)`
- `after()` hook: validate ABN check digit if provided

**Task 1.11**: Create `app/Http/Resources/WorkspaceTaxSettingsResource.php`
- All fields plus computed: `gst_method_label`, `lodgement_frequency_label`, `payg_method_label`

#### Backend -- Resources & Routes (3 tasks)

**Task 1.12**: Create `app/Http/Resources/BasRejectionResource.php`
- Fields: id, bas_period_id, rejected_by (whenLoaded), reason, created_at

**Task 1.13**: Update `app/Http/Resources/BasPeriodResource.php`
- Add `latest_rejection` (whenLoaded) using `BasRejectionResource`
- Add `rejections_count` (whenCounted)

**Task 1.14**: Register new routes in `routes/api.php`
- `GET /tax-settings` -> `WorkspaceTaxSettingsController@show`
- `PUT /tax-settings` -> `WorkspaceTaxSettingsController@update`
- `GET /bas/periods/{basPeriod}/fields` -> `BasController@fields`

#### Frontend -- Tax Settings Page (2 tasks)

**Task 1.15**: Create `frontend/src/app/w/[slug]/(dashboard)/settings/tax/page.tsx`
- Tax settings form with React Hook Form + Zod
- Sections: Business Details (ABN), GST Settings (registered, method, frequency), PAYG Instalments (method, rate/amount), BAS Agent Details
- Uses existing settings layout shell

**Task 1.16**: Update `frontend/src/hooks/use-bas.ts`
- Add `useWorkspaceTaxSettings()` query hook
- Add `useUpdateWorkspaceTaxSettings()` mutation hook
- Add `useBasFields(periodId)` query hook for full field breakdown

---

### Phase 2: BAS Review & Adjustment UI (Sprint 2)

**~14 tasks, estimated 3 days**

#### Backend -- Rejection & Manual Lodgement (4 tasks)

**Task 2.1**: Create `app/Actions/Tax/RejectBasPeriod.php`
- Validates period status is AWAITING_APPROVAL
- Creates `BasRejection` record with reason and user
- Transitions period status back to IN_PROGRESS
- Returns period with rejection loaded

**Task 2.2**: Create `app/Actions/Tax/RecordManualLodgement.php`
- Accepts: `BasPeriod`, `atoReceiptNumber` (string), `userId`
- Validates period status is APPROVED
- Creates `BasLodgement` with provided receipt number, status LODGED
- Calls existing `PostSettlementJe::run()` for settlement JE
- Transitions period status to LODGED
- Marks any previous lodgements as AMENDED

**Task 2.3**: Create `app/Http/Requests/Tax/RejectBasPeriodRequest.php`
- Validates: `reason` (required, string, max:1000)
- `authorize()`: resolves `BasPeriod`, stashes on attributes, checks `bas.approve` permission

**Task 2.4**: Create `app/Http/Requests/Tax/RecordManualLodgementRequest.php`
- Validates: `ato_receipt_number` (required, string, max:50)
- `authorize()`: resolves `BasPeriod`, stashes on attributes, checks `bas.lodge` permission

#### Backend -- Controller Methods (3 tasks)

**Task 2.5**: Add `BasController@reject()` method
- Uses `RejectBasPeriodRequest`
- Calls `RejectBasPeriod::run()`
- Returns `BasPeriodResource` with rejection loaded

**Task 2.6**: Add `BasController@recordLodgement()` method
- Uses `RecordManualLodgementRequest`
- Calls `RecordManualLodgement::run()`
- Returns `BasLodgementResource`

**Task 2.7**: Add `BasController@fields()` method
- Loads workspace tax settings for GST method
- Calls `GenerateBasFieldsComplete::run()`
- Merges manual adjustments
- Returns structured field data with is_calculated flags

#### Backend -- Routes (1 task)

**Task 2.8**: Register routes
- `POST /bas/periods/{basPeriod}/reject` -> `BasController@reject`
- `POST /bas/periods/{basPeriod}/record-lodgement` -> `BasController@recordLodgement`

#### Frontend -- BAS Review UI (6 tasks)

**Task 2.9**: Update `frontend/src/types/tax.ts`
- Add `WorkspaceTaxSettings` interface
- Add `BasRejection` interface
- Add `BasFieldComplete` interface (field_code, label, amount, is_calculated, components, drilldown_available)
- Add `GstMethod` type
- Extend `BasPeriodDetail` with `latest_rejection`, `rejections`

**Task 2.10**: Create `frontend/src/app/w/[slug]/(dashboard)/tax/bas/page.tsx`
- BAS periods list page with StatusTabs (All, Not Started, In Progress, Awaiting Approval, Approved, Lodged)
- Each period card shows: period range, form type, status badge, due date, days overdue, prepared_by, approved_by
- "Prepare BAS" button for new periods
- Click period opens detail view

**Task 2.11**: Create `frontend/src/app/w/[slug]/(dashboard)/tax/bas/[id]/page.tsx`
- BAS detail page with full field breakdown
- Sections: GST Detail (G1-G20), Summary (1A-9), PAYG Withholding (W1-W5), PAYG Instalments (T1-T11)
- Calculated fields shown with formula tooltip
- Non-calculated fields show "Add Adjustment" button
- Drilldown button on each non-calculated field
- Action bar: Submit for Approval / Approve / Reject / Record Lodgement / Download PDF (based on status + permissions)

**Task 2.12**: Create `frontend/src/components/tax/bas-field-section.tsx`
- Renders a section of BAS fields (e.g., G-section, Summary, W-section, T-section)
- Each field row: code, label, amount (formatted from cents), calculated indicator, drilldown button
- Calculated fields have subtle background to distinguish from data fields
- Adjustment badge on fields with manual adjustments

**Task 2.13**: Create `frontend/src/components/tax/bas-adjustment-modal.tsx`
- Modal for adding manual adjustments
- React Hook Form + Zod: field_code (readonly), amount (integer cents input), reason (required textarea)
- Shows current field value and preview of adjusted value

**Task 2.14**: Create `frontend/src/components/tax/bas-rejection-modal.tsx`
- Modal for rejecting BAS with reason
- React Hook Form + Zod: reason (required textarea, max 1000 chars)
- Confirmation step before submitting

---

### Phase 3: PAYG Instalment Calculator (Sprint 3)

**~10 tasks, estimated 2 days**

#### Backend -- PAYG Calculation (3 tasks)

**Task 3.1**: Create `app/Actions/Tax/CalculatePaygInstalment.php`
- Accepts: `workspaceId`, `fromDate`, `toDate`, `method` (PaygCalculationMethod)
- For ATO_DETERMINED: reads `payg_instalment_amount` from workspace tax settings, returns as T7
- For INCOME_BASED: queries revenue chart accounts for total income in period (T1), reads `payg_instalment_rate_basis_points` from tax settings (T2), calculates `T5 = (int) round(T1 * T2 / 10000)`. All amounts in integer cents.
- Creates or updates `PaygInstalment` record for the BAS period
- Returns structured T-field data (T1-T11)

**Task 3.2**: Update `app/Actions/Tax/GenerateBasFieldsComplete.php`
- Integrate `CalculatePaygInstalment` for T-section fields
- Skip T-fields when form_type is IAS (monthly)
- Include T7 or T5 in field 5B (PAYG instalment credit) for summary calculation

**Task 3.3**: Update `app/Actions/Tax/PrepareBas.php`
- Auto-create `PaygInstalment` record during preparation if workspace has PAYG obligation
- Set calculation_method from workspace tax settings

#### Frontend -- PAYG UI (4 tasks)

**Task 3.4**: Create `frontend/src/components/tax/payg-instalment-section.tsx`
- Renders T-section fields within BAS detail page
- For ATO-determined: shows T7 field with editable amount
- For income-based: shows T1 (instalment income, read-only calculated), T2 (rate from settings), T5 (calculated result)
- "Record Payment" button when instalment is pending

**Task 3.5**: Create `frontend/src/components/tax/payg-payment-modal.tsx`
- Modal for recording PAYG instalment payment
- Shows amount (from instalment record), payment date (default today)
- Calls existing `RecordPaygPayment` action via API
- Success: shows journal entry reference number

**Task 3.6**: Update `frontend/src/hooks/use-bas.ts`
- Add `useCalculatePaygInstalment()` mutation hook
- Add `useRecordPaygPayment()` mutation hook

**Task 3.7**: Update `frontend/src/types/tax.ts`
- Add `PaygInstalment` interface
- Add `PaygFieldData` interface for T-section field structure

#### Tests (3 tasks)

**Task 3.8**: Feature test -- PAYG instalment ATO-determined method
- Configure workspace with ATO-determined PAYG, prepare BAS, verify T7 field value in cents

**Task 3.9**: Feature test -- PAYG instalment income-based method
- Create revenue transactions, configure rate (basis points), prepare BAS, verify T1, T2, T5 calculations (all cents)

**Task 3.10**: Feature test -- PAYG payment recording
- Record payment, verify JE created with correct amounts in cents, verify instalment marked as paid

---

### Phase 4: IAS Support (Sprint 4)

**~8 tasks, estimated 1.5 days**

#### Backend (4 tasks)

**Task 4.1**: Update `app/Actions/Tax/GenerateBasFieldsComplete.php`
- When `formType` is IAS:
  - Include GST fields (G1-G20, 1A-1B) -- same as BAS
  - Include PAYG withholding fields (W1-W5) -- same as BAS
  - Exclude PAYG instalment fields (T1-T11)
  - Exclude FBT instalment (field 3)
  - Adjust summary fields (field 4, 5A, 5B, 6A, 7) to exclude T and FBT components

**Task 4.2**: Update `app/Actions/Tax/PrepareBas.php`
- Auto-determine form_type based on workspace `lodgement_frequency`:
  - `quarterly` -> `BasFormType::BAS`
  - `monthly` -> `BasFormType::IAS`
- Use 21-day due date offset for monthly (already implemented in `calculateDueDate`)

**Task 4.3**: Update `app/Actions/Tax/GenerateBasPdf.php` (created in Phase 5)
- PDF template conditionally shows/hides sections based on form_type
- IAS PDF header shows "Instalment Activity Statement" instead of "Business Activity Statement"

**Task 4.4**: Feature test -- IAS field exclusion
- Configure workspace for monthly, prepare BAS, verify T-fields and FBT excluded, GST and W-fields present

#### Frontend (4 tasks)

**Task 4.5**: Update `frontend/src/app/w/[slug]/(dashboard)/tax/bas/[id]/page.tsx`
- Conditionally render sections based on form_type
- Hide PAYG Instalments section for IAS
- Hide FBT field for IAS
- Show "IAS" badge instead of "BAS" in header

**Task 4.6**: Update `frontend/src/components/tax/bas-period-card.tsx`
- Show form type badge (BAS / IAS)
- Different due date display for monthly vs quarterly

**Task 4.7**: Update prepare BAS flow
- Auto-select form type based on workspace tax settings
- Show info banner when workspace is configured for monthly lodgement

**Task 4.8**: Browser test -- IAS preparation and field rendering
- Configure monthly, prepare, verify IAS fields shown correctly

---

### Phase 5: PDF Export & Manual Lodgement (Sprint 5)

**~12 tasks, estimated 2.5 days**

#### Backend -- PDF Generation (5 tasks)

**Task 5.1**: Install DomPDF package
- `composer require barryvdh/laravel-dompdf`
- Publish config: `php artisan vendor:publish --provider="Barryvdh\DomPDF\ServiceProvider"`

**Task 5.2**: Create `app/Actions/Tax/GenerateBasPdf.php`
- Accepts: `BasPeriod`
- Loads workspace tax settings for ABN, agent details
- Calls `GenerateBasFieldsComplete` for field data
- Merges manual adjustments
- Renders Blade template with field data
- Returns PDF binary via DomPDF

**Task 5.3**: Create Blade template `resources/views/pdf/bas-statement.blade.php`
- ATO-formatted layout with all field sections
- Header: workspace name, ABN, period dates, form type (BAS/IAS)
- G-section table with all G1-G20 fields
- Summary section with 1A-9 fields
- W-section table (if applicable)
- T-section table (if BAS, not IAS)
- Footer: preparer details, approver details, agent details
- Adjustments appendix (if any adjustments exist): field_code, amount in cents formatted as dollars, reason, user, timestamp

**Task 5.4**: Add `BasController@downloadPdf()` method
- `Gate::authorize('view', $basPeriod)`
- Calls `GenerateBasPdf::run()`
- Returns response with `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="BAS-{period}.pdf"`

**Task 5.5**: Register route
- `GET /bas/periods/{basPeriod}/pdf` -> `BasController@downloadPdf`

#### Backend -- Record Lodgement History (2 tasks)

**Task 5.6**: Add `BasController@lodgementHistory()` method
- Returns all lodgements for a period with settlement JE links
- Useful for audit trail display

**Task 5.7**: Register route
- `GET /bas/periods/{basPeriod}/lodgements` -> `BasController@lodgementHistory`

#### Frontend -- PDF & Lodgement UI (5 tasks)

**Task 5.8**: Create `frontend/src/components/tax/bas-download-pdf-button.tsx`
- Button component that triggers PDF download via API
- Shows loading spinner during generation
- Opens PDF in new tab or downloads depending on user preference

**Task 5.9**: Create `frontend/src/components/tax/record-lodgement-modal.tsx`
- Modal for recording manual ATO lodgement
- React Hook Form + Zod: `ato_receipt_number` (required, string)
- Info text: "Enter the receipt number you received after lodging via the ATO portal"
- Confirmation step: "This will finalise the BAS and post a settlement journal entry"
- Success: shows settlement JE reference

**Task 5.10**: Create `frontend/src/components/tax/lodgement-history.tsx`
- Timeline component showing lodgement history for a period
- Each entry: receipt number, lodged_at, lodged_by, form_type, settlement JE link
- Amendment chain shown via revision_of_lodgement_id

**Task 5.11**: Update `frontend/src/hooks/use-bas.ts`
- Add `useRecordManualLodgement()` mutation hook
- Add `useRejectBasPeriod()` mutation hook
- Add `useLodgementHistory(periodId)` query hook
- Add `useDownloadBasPdf(periodId)` query hook (blob download)

**Task 5.12**: Update BAS detail page action bar
- Approved status: show "Download PDF" + "Record Lodgement" buttons
- Awaiting Approval status: show "Approve" + "Reject" buttons
- Lodged status: show "Download PDF" + "View Lodgement History"

---

### Phase 6: Tax Agent Multi-Client Dashboard (Sprint 6)

**~10 tasks, estimated 2 days**

#### Backend (4 tasks)

**Task 6.1**: Update `BasController@practiceOverview()`
- Use advisor connections (015-ACT) instead of user's workspaces for proper practice scoping
- Add query params: `status` filter, `period` filter (e.g., "2026-Q1"), `sort` (overdue_first, name, status)
- Add pagination (25 per page)
- Include workspace tax settings (ABN, lodgement frequency) in response

**Task 6.2**: Add `BasController@practiceApprove()` method
- Approve a BAS period from the practice dashboard context
- Verify advisor connection exists before allowing action
- Delegates to existing `ApproveBasPeriod::run()`

**Task 6.3**: Add `BasController@practiceRecordLodgement()` method
- Record manual lodgement from practice dashboard context
- Verify advisor connection before allowing action
- Delegates to `RecordManualLodgement::run()`

**Task 6.4**: Register practice routes
- `GET /practice/bas/overview` (update existing)
- `POST /practice/bas/{basPeriod}/approve`
- `POST /practice/bas/{basPeriod}/record-lodgement`

#### Frontend (6 tasks)

**Task 6.5**: Create `frontend/src/app/(practice)/practice/tax/page.tsx`
- Practice BAS dashboard page
- Table with columns: Client, ABN, Period, Status, Due Date, Days Overdue, Actions
- StatusTabs: All, Not Started, In Progress, Awaiting Approval, Approved, Lodged, Overdue
- Sort by overdue (descending) by default
- Overdue rows highlighted with amber/red background

**Task 6.6**: Create `frontend/src/components/practice/bas-dashboard-table.tsx`
- Data table with sorting, filtering, pagination
- Action buttons per row: Approve (if awaiting), Record Lodgement (if approved), View (always)
- Overdue badge with days count
- Click row to expand inline detail or navigate to workspace BAS

**Task 6.7**: Create `frontend/src/components/practice/bas-quick-approve-modal.tsx`
- Quick approve modal from practice dashboard
- Shows BAS summary (net GST in cents formatted as dollars, PAYG, total owing/refundable)
- Confirm button to approve without leaving dashboard

**Task 6.8**: Create `frontend/src/hooks/use-practice-bas.ts`
- `usePracticeBasOverview(filters)` query hook
- `usePracticeApprove()` mutation hook
- `usePracticeRecordLodgement()` mutation hook

**Task 6.9**: Update practice navigation
- Add "Tax" or "BAS" nav item to practice shell sidebar
- Show count badge with number of BAS awaiting approval

**Task 6.10**: Keyboard shortcuts for practice BAS dashboard
- `J`/`K` for row navigation
- `Enter` to view selected BAS
- `A` to approve selected BAS (if awaiting approval)
- Register in `?` help overlay

---

## File Manifest

### Migrations (1 file)

| File | Action |
|------|--------|
| `database/migrations/2026_03_23_100001_add_tax_settings_and_rejections.php` | CREATE |

### Models (2 new, 1 modified)

| File | Action |
|------|--------|
| `app/Models/Tenant/WorkspaceTaxSettings.php` | CREATE |
| `app/Models/Tenant/BasRejection.php` | CREATE |
| `app/Models/Tenant/BasPeriod.php` | MODIFY -- add `rejections()`, `latestRejection()` relationships |

### Enums (1 new)

| File | Action |
|------|--------|
| `app/Enums/Tax/GstMethod.php` | CREATE |

### Actions (5 new, 2 modified)

| File | Action |
|------|--------|
| `app/Actions/Tax/GenerateBasFieldsComplete.php` | CREATE |
| `app/Actions/Tax/RejectBasPeriod.php` | CREATE |
| `app/Actions/Tax/RecordManualLodgement.php` | CREATE |
| `app/Actions/Tax/GenerateBasPdf.php` | CREATE |
| `app/Actions/Tax/CalculatePaygInstalment.php` | CREATE |
| `app/Actions/Tax/PrepareBas.php` | MODIFY -- use workspace tax settings, call GenerateBasFieldsComplete |
| `app/Actions/Tax/GenerateBasFieldsComplete.php` | MODIFY (Phase 3, 4) -- integrate PAYG calculator, IAS field exclusion |

### Controllers (1 new, 1 modified)

| File | Action |
|------|--------|
| `app/Http/Controllers/Api/WorkspaceTaxSettingsController.php` | CREATE |
| `app/Http/Controllers/Api/BasController.php` | MODIFY -- add `reject()`, `recordLodgement()`, `downloadPdf()`, `fields()`, `lodgementHistory()`, update `practiceOverview()`, add `practiceApprove()`, `practiceRecordLodgement()` |

### Form Requests (3 new)

| File | Action |
|------|--------|
| `app/Http/Requests/Tax/UpdateWorkspaceTaxSettingsRequest.php` | CREATE |
| `app/Http/Requests/Tax/RejectBasPeriodRequest.php` | CREATE |
| `app/Http/Requests/Tax/RecordManualLodgementRequest.php` | CREATE |

### Resources (2 new, 1 modified)

| File | Action |
|------|--------|
| `app/Http/Resources/WorkspaceTaxSettingsResource.php` | CREATE |
| `app/Http/Resources/BasRejectionResource.php` | CREATE |
| `app/Http/Resources/BasPeriodResource.php` | MODIFY -- add `latest_rejection`, `rejections_count` |

### PDF Templates (1 new)

| File | Action |
|------|--------|
| `resources/views/pdf/bas-statement.blade.php` | CREATE |

### Routes (1 modified)

| File | Action |
|------|--------|
| `routes/api.php` | MODIFY -- add tax settings routes, BAS reject/record-lodgement/pdf/fields routes, practice BAS routes |

### Frontend Pages (4 new)

| File | Action |
|------|--------|
| `frontend/src/app/w/[slug]/(dashboard)/settings/tax/page.tsx` | CREATE |
| `frontend/src/app/w/[slug]/(dashboard)/tax/bas/page.tsx` | CREATE |
| `frontend/src/app/w/[slug]/(dashboard)/tax/bas/[id]/page.tsx` | CREATE |
| `frontend/src/app/(practice)/practice/tax/page.tsx` | CREATE |

### Frontend Components (10 new, 2 modified)

| File | Action |
|------|--------|
| `frontend/src/components/tax/bas-field-section.tsx` | CREATE |
| `frontend/src/components/tax/bas-adjustment-modal.tsx` | CREATE |
| `frontend/src/components/tax/bas-rejection-modal.tsx` | CREATE |
| `frontend/src/components/tax/payg-instalment-section.tsx` | CREATE |
| `frontend/src/components/tax/payg-payment-modal.tsx` | CREATE |
| `frontend/src/components/tax/bas-download-pdf-button.tsx` | CREATE |
| `frontend/src/components/tax/record-lodgement-modal.tsx` | CREATE |
| `frontend/src/components/tax/lodgement-history.tsx` | CREATE |
| `frontend/src/components/practice/bas-dashboard-table.tsx` | CREATE |
| `frontend/src/components/practice/bas-quick-approve-modal.tsx` | CREATE |
| `frontend/src/components/tax/bas-period-card.tsx` | MODIFY -- add form type badge, IAS handling |
| `frontend/src/components/tax/bas-summary-card.tsx` | MODIFY -- add full field breakdown support |

### Frontend Hooks (1 new, 1 modified)

| File | Action |
|------|--------|
| `frontend/src/hooks/use-practice-bas.ts` | CREATE |
| `frontend/src/hooks/use-bas.ts` | MODIFY -- add tax settings hooks, reject/record-lodgement/PDF hooks, fields hook |

### Frontend Types (1 modified)

| File | Action |
|------|--------|
| `frontend/src/types/tax.ts` | MODIFY -- add WorkspaceTaxSettings, BasRejection, BasFieldComplete, GstMethod, PaygInstalment, PaygFieldData |

### Frontend Navigation (1 modified)

| File | Action |
|------|--------|
| `frontend/src/lib/navigation.ts` | MODIFY -- add Tax/BAS nav item |

### Tests (4 new files)

| File | Action |
|------|--------|
| `tests/Feature/Api/WorkspaceTaxSettingsTest.php` | CREATE |
| `tests/Feature/Api/BasFieldsCompleteTest.php` | CREATE |
| `tests/Feature/Api/BasCashGstTest.php` | CREATE |
| `tests/Feature/Api/BasPdfTest.php` | CREATE |

---

## Risk Register

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Cash GST pro-rata calculation produces rounding errors | High | Medium | Use integer cents throughout. For pro-rata: `(int) round($payment_cents * $line_tax_cents / $invoice_total_cents)`. Add rounding adjustment to last line to ensure sum matches. Comprehensive test with known amounts. |
| `GenerateBasFieldsComplete` performance with large transaction volumes | Medium | Low | BAS is per-period (max 3 months of data). Existing `GenerateBasReport` handles this well. Index on `(workspace_id, status, entry_date)` on journal_entries covers the query. For cash GST, add index on `(workspace_id, payment_date)` on payments table. |
| Cash GST requires payment records to be reliable | High | Medium | Pre-check: validate that invoice/bill payment totals match invoice totals before including in BAS. Flag discrepancies for accountant review. If payment data is incomplete, fall back to accrual and warn the user. |
| DomPDF rendering of ATO form layout | Low | Medium | ATO form layout is tabular -- well within DomPDF capabilities. Use CSS tables, not flexbox/grid. Test with real field data before finalising template. |
| Practice dashboard cross-workspace queries at scale | Medium | Low | Query is indexed on workspace_id. Practice overview is paginated at 25. For 100+ workspaces, the query is still a single indexed scan per workspace with a WHERE IN clause. |
| Breaking change to existing `GenerateBasReport` consumers | Medium | Low | The original `GenerateBasReport` action is preserved unchanged. `GenerateBasFieldsComplete` is a new action that wraps it. Existing 16 tests continue to pass against the original. |

### Dependencies

| Dependency | Status | Risk |
|------------|--------|------|
| 007-FRC (Financial Reporting) | Complete | None -- BAS report generation exists |
| 002-CLE (Core Ledger Engine) | Complete | None -- JournalEntry, JE lines, ChartAccount all exist |
| 005-IAR (Invoicing & AR/AP) | Complete | None -- payments table exists for cash GST queries |
| 015-ACT (Practice Management) | Complete | None -- advisor connections exist for practice dashboard scoping |
| barryvdh/laravel-dompdf | External | Low -- stable, well-maintained Laravel package |

---

## Testing Strategy

### Feature Tests (~20 new tests across 4 files)

**Workspace Tax Settings** -- `tests/Feature/Api/WorkspaceTaxSettingsTest.php`:
- `it returns default tax settings for workspace`
- `it updates tax settings with valid data`
- `it validates ABN format (11 digits)`
- `it rejects invalid GST method`
- `it denies client role from updating tax settings`

**Complete BAS Fields** -- `tests/Feature/Api/BasFieldsCompleteTest.php`:
- `it calculates all G-section fields from transactions`
- `it derives calculated fields correctly (G5, G6, G8, G12, G16, G17, G19)`
- `it distinguishes capital (G10) vs non-capital (G11) purchases by account type`
- `it calculates summary fields (1A-9) from G-section results`
- `it excludes T-fields and FBT from IAS`
- `it includes T-fields and FBT in quarterly BAS`
- `it rejects a BAS period with reason`
- `it returns rejected BAS to IN_PROGRESS status`
- `it records manual lodgement with ATO receipt number`
- `it posts settlement JE on manual lodgement`

**Cash GST** -- `tests/Feature/Api/BasCashGstTest.php`:
- `it reports GST on payment date for cash method`
- `it does not include unpaid invoice GST for cash method`
- `it includes unpaid invoice GST for accrual method`
- `it pro-rates GST for partial payments (all amounts in cents)`
- `it handles invoice paid across period boundary`

**BAS PDF** -- `tests/Feature/Api/BasPdfTest.php`:
- `it generates PDF for approved BAS period`
- `it includes ABN and entity name in PDF`
- `it denies PDF download for unauthorized user`

### Test Setup Pattern

```php
// Extend existing BasApiTest setup pattern
beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    $this->user = User::factory()->create();
    // ... org + workspace setup (same as BasApiTest) ...
    SeedChartOfAccounts::run($this->workspace, 'australian_standard');

    // Create comprehensive tax codes for all BAS fields
    TaxCode::create([
        'workspace_id' => $this->workspace->id,
        'code' => 'GST',
        'name' => 'GST on Income',
        'rate_basis_points' => 1000, // 10%
        'bas_field' => '1A',
        'effective_from' => '2020-01-01',
        'is_active' => true,
    ]);
    TaxCode::create([
        'workspace_id' => $this->workspace->id,
        'code' => 'GST-P',
        'name' => 'GST on Purchases',
        'rate_basis_points' => 1000, // 10%
        'bas_field' => '1B',
        'effective_from' => '2020-01-01',
        'is_active' => true,
    ]);
    TaxCode::create([
        'workspace_id' => $this->workspace->id,
        'code' => 'FRE',
        'name' => 'GST Free Income',
        'rate_basis_points' => 0,
        'bas_field' => 'G3',
        'effective_from' => '2020-01-01',
        'is_active' => true,
    ]);
    TaxCode::create([
        'workspace_id' => $this->workspace->id,
        'code' => 'EXP',
        'name' => 'Export Sales',
        'rate_basis_points' => 0,
        'bas_field' => 'G2',
        'effective_from' => '2020-01-01',
        'is_active' => true,
    ]);
    TaxCode::create([
        'workspace_id' => $this->workspace->id,
        'code' => 'CAP',
        'name' => 'Capital Purchase GST',
        'rate_basis_points' => 1000, // 10%
        'bas_field' => 'G10',
        'effective_from' => '2020-01-01',
        'is_active' => true,
    ]);

    // Create workspace tax settings
    WorkspaceTaxSettings::create([
        'workspace_id' => $this->workspace->id,
        'abn' => '51824753556',
        'gst_registered' => true,
        'gst_method' => 'accrual',
        'lodgement_frequency' => 'quarterly',
    ]);
});
```

### Cash GST Test Pattern

```php
it('reports GST on payment date for cash method', function () {
    // Set workspace to cash GST
    WorkspaceTaxSettings::where('workspace_id', $this->workspace->id)
        ->update(['gst_method' => 'cash']);

    // Create invoice in Q1 (Jan-Mar) with 11000 cents total, 1000 cents GST
    $invoice = createInvoice(date: '2026-02-15', total: 11000, gst: 1000);

    // Pay invoice in Q2 (Apr) -- full payment of 11000 cents
    recordPayment(invoice: $invoice, amount: 11000, date: '2026-04-10');

    // Q1 BAS should NOT include this GST (cash method, not yet paid)
    $q1Fields = GenerateBasFieldsComplete::run(
        workspaceId: $this->workspace->id,
        fromDate: '2026-01-01',
        toDate: '2026-03-31',
        gstMethod: GstMethod::CASH,
    );
    expect($q1Fields['1A']['amount'])->toBe(0);

    // Q2 BAS should include this GST (paid in Q2)
    $q2Fields = GenerateBasFieldsComplete::run(
        workspaceId: $this->workspace->id,
        fromDate: '2026-04-01',
        toDate: '2026-06-30',
        gstMethod: GstMethod::CASH,
    );
    expect($q2Fields['1A']['amount'])->toBe(1000); // 1000 cents
});
```
