---
title: "Implementation Plan: Personal Ledger"
---

# Implementation Plan: Personal Ledger

**Branch**: `feature/030-PLG-personal-ledger` | **Date**: 2026-03-15 | **Spec**: [spec.md](./spec.md)

## Summary

Add "Personal / Individual" as an entity type that transforms the entire UI — simplified onboarding, asset/liability forms, net worth dashboard, modular sidebar. The ledger engine is unchanged; only the presentation adapts. Valuations create journal entries underneath. Accountants see the full accounting UI via role override.

## Technical Context

**Language/Version**: PHP 8.4 (Laravel 12), TypeScript (Next.js 16, React 19)
**Key Integration**: Existing CoA template system, CreateWorkspace action, JournalEntry aggregate, Pennant feature flags
**Storage**: SQLite (local), single-database multi-tenancy
**Testing**: Pest v4 (feature tests)
**Constraints**: No external price feeds in v1, no workspace type migration, amounts in cents

---

## Gate 3: Architecture Check

### 1. Technical Feasibility — PASS

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | Entity type drives module visibility via hardcoded mapping |
| Existing patterns leveraged | PASS | CreateWorkspace action, CoA templates, JournalEntry aggregate, Pennant |
| No impossible requirements | PASS | All 22 FRs buildable |
| Performance considered | PASS | CoA generation is template-based (< 500ms), valuations are single JEs |
| Security considered | PASS | Role override for accountants, module access control |

### 2. Data & Integration — PASS

| Check | Status | Notes |
|-------|--------|-------|
| Data model understood | PASS | 2 new tables (personal_assets, personal_debts) + 1 CoA template + module config |
| API contracts clear | PASS | ~15 new endpoints |
| Dependencies identified | PASS | 002-CLE, 028-CFT, existing CoA system |
| Integration points mapped | PASS | JournalEntry aggregate for valuations, 028-CFT for net worth consolidation |

### 3. Implementation Approach — PASS

| Check | Status | Notes |
|-------|--------|-------|
| File changes identified | PASS | 4-phase plan |
| Risk areas noted | PASS | Valuation JE accounting, module leakage, onboarding flow |
| Testing approach defined | PASS | Feature tests per phase |
| Rollback possible | PASS | New entity type is additive, no existing data modified |

### 4. Next.js/React Standards — PASS

| Check | Status | Notes |
|-------|--------|-------|
| TypeScript strict | PASS | All new types defined |
| TanStack Query | PASS | Hooks for assets, debts, valuations |
| React Hook Form + Zod | PASS | Asset/debt forms |
| Modular sidebar | PASS | Entity type check in existing sidebar component |

---

## Data Model

### New Tables

#### `personal_assets`

User-facing asset records. Each maps to a ChartAccount underneath.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| workspace_id | FK workspaces | cascadeOnDelete |
| chart_account_id | FK chart_accounts | nullable, cascadeOnDelete |
| name | string | e.g., "My House" |
| category | string | property, investments, cash_bank, superannuation, vehicles, other |
| current_value | integer | cents |
| purchase_date | date | nullable |
| notes | text | nullable |
| created_at, updated_at | timestamps | |

Index: `[workspace_id, category]`

#### `personal_debts`

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| workspace_id | FK workspaces | cascadeOnDelete |
| chart_account_id | FK chart_accounts | nullable, cascadeOnDelete |
| name | string | e.g., "Home Loan" |
| category | string | mortgage, credit_card, personal_loan, hecs, car_loan, other |
| current_balance | integer | cents |
| interest_rate | integer | nullable, basis points (500 = 5.00%) |
| lender | string | nullable |
| notes | text | nullable |
| created_at, updated_at | timestamps | |

Index: `[workspace_id, category]`

#### `valuation_entries`

History of value changes for both assets and debts.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| valuable_type | string | morph: personal_asset, personal_debt |
| valuable_id | bigint | morph |
| previous_value | integer | cents |
| new_value | integer | cents |
| valued_at | date | |
| journal_entry_id | FK journal_entries | nullable — the JE created for this valuation |
| created_by_user_id | FK users | nullable |
| created_at | timestamp | |

Index: `[valuable_type, valuable_id]`

### Modified Tables

#### `workspaces`

No schema change — `entity_type` field already exists and is a string. Add 'personal' as a valid value in the EntityType enum.

### New CoA Template

`database/seeders/Templates/PersonalTemplate.php`

```
Assets:
  1000 Cash at Bank (asset, current_asset)
  1100 Property (asset, non_current_asset)
  1200 Vehicles (asset, non_current_asset)
  1300 Investments (asset, non_current_asset)
  1400 Superannuation (asset, non_current_asset)
  1500 Personal Effects (asset, non_current_asset)
  1600 Other Assets (asset, non_current_asset)

Liabilities:
  2000 Credit Cards (liability, current_liability)
  2100 Mortgage (liability, non_current_liability)
  2200 Personal Loans (liability, current_liability)
  2300 HECS/HELP (liability, non_current_liability)
  2400 Car Loan (liability, current_liability)
  2500 Other Debts (liability, current_liability)

Equity:
  3000 Opening Balance (equity, equity)
  3100 Revaluation Reserve (equity, equity)
```

---

## API Contracts

### Personal Assets

| Method | Path | Action | Notes |
|--------|------|--------|-------|
| GET | `/v1/personal/assets` | `index` | List all assets for workspace |
| POST | `/v1/personal/assets` | `store` | Create asset + JE |
| GET | `/v1/personal/assets/{id}` | `show` | Asset with valuation history |
| PATCH | `/v1/personal/assets/{id}` | `update` | Edit name, category, notes |
| DELETE | `/v1/personal/assets/{id}` | `destroy` | Remove asset + reverse JE |
| POST | `/v1/personal/assets/{id}/valuations` | `revalue` | Update value + create JE |

### Personal Debts

| Method | Path | Action | Notes |
|--------|------|--------|-------|
| GET | `/v1/personal/debts` | `index` | List all debts |
| POST | `/v1/personal/debts` | `store` | Create debt + JE |
| GET | `/v1/personal/debts/{id}` | `show` | Debt with valuation history |
| PATCH | `/v1/personal/debts/{id}` | `update` | Edit name, category, notes |
| DELETE | `/v1/personal/debts/{id}` | `destroy` | Remove + reverse JE |
| POST | `/v1/personal/debts/{id}/valuations` | `revalue` | Update balance + create JE |

### Module Configuration

| Method | Path | Action | Notes |
|--------|------|--------|-------|
| GET | `/v1/workspace/modules` | `modules` | Returns available modules for current workspace entity type |

---

## Implementation Phases

### Phase 1: Entity Type + CoA + Module Config (Sprint 1)

**Backend:**
- Add 'personal' to EntityType enum (or validation list)
- Create `PersonalTemplate.php` CoA seeder with ~15 accounts
- Update `CreateWorkspace` action: if entity_type = 'personal', use PersonalTemplate, skip industry template logic
- Create module configuration: `app/Services/ModuleConfig.php` with `getModules(string $entityType): array` — returns module list per entity type
- Add `GET /v1/workspace/modules` endpoint returning available modules
- Update onboarding: accept 'personal' entity type, accept `tracking_options` array

**Frontend:**
- Add "Personal / Individual" option to entity type selector in onboarding
- When "Personal" selected: show tracking checklist instead of industry template
- Module-aware sidebar: read available modules from API or workspace context, conditionally render nav items
- Personal dashboard variant: net worth headline + "Add first asset/debt" prompts when empty

**Tests:** 6 tests (personal workspace creation, CoA generation, module config, sidebar filtering, onboarding flow)

### Phase 2: Assets & Debts CRUD (Sprint 2)

**Backend:**
- Migrations: `personal_assets`, `personal_debts`, `valuation_entries`
- Models: `PersonalAsset`, `PersonalDebt`, `ValuationEntry` (polymorphic)
- Add to morph map: `personal_asset`, `personal_debt`
- Actions: `CreatePersonalAsset` (creates asset + JE via JournalEntry aggregate), `CreatePersonalDebt`, `UpdatePersonalAsset`, `UpdatePersonalDebt`, `DeletePersonalAsset` (reverse JE), `DeletePersonalDebt`
- Controllers: `PersonalAssetController`, `PersonalDebtController`
- Resources: `PersonalAssetResource`, `PersonalDebtResource`
- Routes under `auth:sanctum` + `SetWorkspaceContext` middleware

**Frontend:**
- `/assets` page: grid of asset cards (name, category icon, value, last updated)
- `/debts` page: grid of debt cards (name, category icon, balance, interest rate)
- "Add Asset" dialog with React Hook Form + Zod
- "Add Debt" dialog
- Asset/debt detail view (name, value, notes, valuation history list)

**Tests:** 8 tests (asset CRUD, debt CRUD, JE creation verification, validation)

### Phase 3: Valuations (Sprint 3)

**Backend:**
- Action: `RevaluePersonalAsset` — calculates diff, creates JE (Debit/Credit asset + Revaluation Reserve), creates ValuationEntry
- Action: `RevaluePersonalDebt` — same pattern for liabilities
- Endpoint: `POST /v1/personal/assets/{id}/valuations` and `POST /v1/personal/debts/{id}/valuations`
- Resource: `ValuationEntryResource`
- Update asset/debt show endpoints to include valuation history

**Frontend:**
- "Update Value" button on asset/debt cards
- Revalue dialog: new value input + date picker
- Valuation history list on detail view (date, previous value, new value, change amount)
- Value-over-time mini chart on detail view (when 2+ valuations)

**Tests:** 6 tests (revalue asset, revalue debt, JE accuracy, valuation history, negative value prevention)

### Phase 4: Role Override + Polish + Integration (Sprint 4)

**Backend:**
- Middleware or service: role-based module override — if user has `accountant`/`owner` role via practice assignment AND is viewing a personal workspace, return full module list
- Update `ModuleConfig::getModules()` to accept optional role parameter
- Verify 028-CFT integration: personal workspace balance sheets feed into consolidated net worth

**Frontend:**
- Role override: when accountant enters personal workspace, sidebar shows full accounting nav
- Personal dashboard polish: net worth card with trend (from 028-CFT), asset/debt summary cards, "My Net Worth" link
- Redirect middleware: personal users hitting /invoices, /journal-entries etc. get redirected to /dashboard
- Empty states for all personal pages

**Tests:** 4 tests (role override, module redirect, 028-CFT integration, empty states)

---

## Testing Strategy

| Phase | Feature Tests |
|-------|---------------|
| 1. Entity type + CoA + modules | 6 |
| 2. Assets & debts CRUD | 8 |
| 3. Valuations | 6 |
| 4. Role override + integration | 4 |
| **Total** | **24** |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Valuation JE accounting is incorrect | Medium | High | Extensive test fixtures with known values; accountant override to inspect/correct |
| Module leakage (personal user sees accounting pages) | Low | Medium | Redirect middleware + conditional sidebar rendering + tests verifying module list |
| Scope creep into budgeting | High | Medium | Strict out-of-scope list. No spending categories, no budgets, no forecasting. Balance sheet only. |
| Personal CoA too simple for edge cases | Low | Low | Accountant can add accounts via role override. Template is a starting point, not a limit. |
