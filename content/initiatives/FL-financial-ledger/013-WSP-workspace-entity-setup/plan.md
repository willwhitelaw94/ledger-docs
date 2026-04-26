---
title: "Implementation Plan: Workspace Entity Setup & Smart Chart of Accounts"
---

# Implementation Plan: Workspace Entity Setup & Smart Chart of Accounts

**Epic**: 013-WSP | **Date**: 2026-03-14 | **Spec**: [spec.md](/initiatives/FL-financial-ledger/013-WSP-workspace-entity-setup/spec.md)
**Status**: Draft

---

## Summary

Extend the workspace creation flow from a single hardcoded CoA seed into a fully configurable, AI-assisted onboarding wizard. Workspaces gain entity type, ABN, and a questionnaire snapshot. A hybrid template engine (DB-stored base templates + flag overlay modules) replaces the hardcoded `AustralianStandardCoA` PHP class. Two AI touch points: Claude extracts business flags from free-text (simple mode), and optionally renames accounts in plain language. Every account gets a canonical `sub_type` from an expanded closed enum — the shared vocabulary for bank feed auto-categorisation.

---

## Technical Context

**Backend**: Laravel 12, PHP 8.4, Lorisleiva Actions, Spatie Laravel Data
**Frontend**: Next.js 16, React 19, TypeScript, TanStack Query v5, React Hook Form + Zod
**Database**: SQLite (dev), MySQL (prod) — all migrations schema-only
**AI**: Anthropic PHP SDK (`anthropic/anthropic-sdk-php`) — server-side only, two discrete calls
**Testing**: Pest v4
**No event sourcing** — workspace configuration is not a financial fact; plain Eloquent throughout

---

## Gate 3: Architecture Pre-Check

### CLAUDE.md Overrides Apply

This project uses Next.js/React (not Vue/Inertia). Gate 3 frontend checks use the CLAUDE.md Next.js equivalents.

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | ✅ PASS | Extends existing Actions/CoA/Workspace patterns |
| Existing patterns leveraged | ✅ PASS | `CreateWorkspace`, `SeedChartOfAccounts`, `InviteUser` all extended |
| No impossible requirements | ✅ PASS | All items buildable with current stack |
| No event sourcing needed | ✅ PASS | Config data — not financial facts, no replay requirement |
| Multi-tenancy scoping | ✅ PASS | All new tenant tables include `workspace_id` |
| AccountSubType enum expansion | ⚠️ ADDRESSED | Plan includes Phase 1 expansion from 15 → ~70 values |
| SeedChartOfAccounts refactor | ⚠️ ADDRESSED | Backward-compatible — existing `AustralianStandardCoA` seeder preserved as fallback |
| InviteUser/invitations not duplicated | ✅ PASS | Existing `InviteUser` action + `workspace_invitations` table reused |
| No hardcoded business logic in frontend | ✅ PASS | Template matching, flag extraction all server-side |
| TypeScript strict — no `any` | ✅ PASS | Mandated in all new components |
| TanStack Query for server state | ✅ PASS | Wizard preview endpoint consumed via TanStack Query |
| React Hook Form + Zod for wizard | ✅ PASS | Single `useForm` instance at wizard parent, per-step Zod schemas |
| AI calls server-side only | ✅ PASS | Laravel actions call Claude API — key never exposed to frontend |
| Lorisleiva Actions | ✅ PASS | All business logic in Actions with `AsAction` trait |
| API Resources for all responses | ✅ PASS | New resources defined for wizard preview, template list |

**Gate 3 Pre-Check: PASS** — no red flags. Proceed to implementation.

---

## Data Model

### Workspace (existing — additions only)

```
workspaces
  + entity_type          enum('pty_ltd','trust','sole_trader','partnership','smsf','not_for_profit') nullable
  + abn                  string(11) nullable — validated by check-digit at input, stored digits only
  + legal_name           string nullable — registered legal name (may differ from workspace display name)
  + questionnaire_snapshot  json nullable — captured flags at wizard completion, read-only audit
```

### AccountSubType enum (expand existing)

Current: 15 generic values
Target: ~70 canonical values grouped by purpose:

```
Assets:      bank, cash, accounts_receivable, prepayment, inventory, fixed_asset,
             investment_property, motor_vehicle, computer_equipment, office_equipment,
             accumulated_depreciation, other_asset

Liabilities: accounts_payable, gst_collected, gst_paid, ato_settlement,
             payg_withholding, superannuation_payable, credit_card, business_loan,
             mortgage, annual_leave_provision, long_service_leave, other_liability

Equity:      owners_capital, owners_drawings, share_capital, retained_earnings,
             trust_corpus, trust_distribution, smsf_member_equity, dividends_paid

Revenue:     sales_revenue, service_revenue, rental_income, interest_income,
             grant_income, other_income

Expenses:    cost_of_goods_sold, subcontractor, wages, superannuation, payg_expense,
             fuel, vehicle_registration, vehicle_insurance, vehicle_depreciation,
             rent_expense, utilities, insurance, subscriptions, advertising,
             accounting_legal, bank_fees, interest_expense, depreciation,
             office_supplies, it_software, travel_entertainment, uniforms_ppe,
             tools_equipment, council_rates, repairs_maintenance, cleaning,
             telephone_internet, postage_courier, training_education, other_expense
```

### coa_base_templates (new)

```
id
name                   string — e.g. "Sole Trader — Trades"
entity_type            enum (matches workspace entity_type values)
industry               string — e.g. 'trades', 'professional_services', 'retail' etc.
description            text nullable
priority               integer default 0 — tie-breaking when multiple base templates match
is_active              boolean default true
created_at / updated_at
```

### coa_base_template_accounts (new)

```
id
template_id            FK → coa_base_templates
code                   string — e.g. '31100'
name                   string — e.g. "Owner's Capital"
type                   enum('asset','liability','equity','revenue','expense')
parent_code            string nullable — resolved at seeding time
default_tax_code       string nullable
sub_type               AccountSubType enum — canonical, required
is_system              boolean default false
reasoning              string nullable — plain-English explanation for CoA review screen
sort_order             integer default 0
```

### coa_overlay_modules (new)

```
id
name                   string — e.g. "Employees & Payroll"
flag_key               string — matches questionnaire flag: 'has_employees', 'has_vehicles',
                                'has_inventory', 'has_property', 'gst_registered',
                                'invoices_clients', 'buys_on_credit', 'has_loans',
                                'has_subcontractors'
description            text nullable
is_active              boolean default true
created_at / updated_at
```

### coa_overlay_accounts (new)

```
id
overlay_id             FK → coa_overlay_modules
code                   string
name                   string
type                   enum (same as base)
parent_code            string nullable
default_tax_code       string nullable
sub_type               AccountSubType enum — required
is_system              boolean default false
reasoning              string nullable
sort_order             integer default 0
```

### EntityType enum (new)

```php
enum EntityType: string {
    case PTY_LTD        = 'pty_ltd';
    case TRUST          = 'trust';
    case SOLE_TRADER    = 'sole_trader';
    case PARTNERSHIP    = 'partnership';
    case SMSF           = 'smsf';
    case NOT_FOR_PROFIT = 'not_for_profit';
}
```

---

## API Contracts

### POST /api/v1/workspaces/wizard/preview
Preview the CoA that would be generated for given wizard inputs. Called after Stage 2.

**Request**:
```json
{
  "workspace_id": null,
  "entity_type": "sole_trader",
  "industry": "trades",
  "flags": {
    "has_employees": true,
    "has_vehicles": true,
    "gst_registered": true,
    "invoices_clients": true,
    "buys_on_credit": false,
    "has_inventory": false,
    "has_property": false,
    "has_loans": false
  },
  "free_text": "I run a small electrical business..."  // simple mode only — null in advanced
}
```

**Response**: `WizardPreviewResource`
```json
{
  "matched_template": "Sole Trader — Trades",
  "extracted_flags": { ... },        // populated in simple mode
  "flag_confidence": { "has_employees": "high", "gst_registered": "high" },
  "accounts": [
    {
      "code": "52100",
      "name": "Wages Expense",
      "type": "expense",
      "sub_type": "wages",
      "is_system": false,
      "reasoning": "Included because you have employees — required for ATO PAYG reporting.",
      "source": "overlay:has_employees"
    }
  ]
}
```

### POST /api/v1/workspaces/wizard/ai-label
Trigger AI plain-language renaming for a set of accounts.

**Request**:
```json
{
  "entity_type": "sole_trader",
  "industry": "trades",
  "accounts": [
    { "code": "12300", "name": "Motor Vehicles", "sub_type": "motor_vehicle" }
  ]
}
```

**Response**: streamed JSON — each line is a renamed account suggestion.

### POST /api/v1/workspaces (extend existing)
Create workspace from wizard. Extends current `CreateWorkspace` action payload.

**New fields**:
```json
{
  "entity_type": "sole_trader",
  "abn": "51824753556",
  "legal_name": "John Smith",
  "questionnaire_flags": { ... },
  "account_overrides": [
    { "code": "52100", "name": "Staff Wages", "action": "rename" },
    { "code": "52200", "action": "remove" },
    { "code": "99001", "name": "Custom Account", "type": "expense", "sub_type": "other_expense", "action": "add" }
  ]
}
```

### GET /api/v1/admin/coa-templates
List all templates + overlays (admin only).

### POST/PATCH /api/v1/admin/coa-templates/{id}
Create/update base templates and their accounts (admin only).

### GET /api/v1/workspaces/{id}/coa-suggestions
Return account suggestions based on workspace questionnaire snapshot. Additive — excludes accounts already in the workspace CoA.

---

## Source Code Layout

```
app/
├── Actions/
│   ├── ChartOfAccounts/
│   │   ├── SeedChartOfAccounts.php          MODIFY — add template engine path
│   │   ├── MatchCoaTemplate.php             NEW — picks base + overlays from flags
│   │   ├── AssembleCoaPreview.php           NEW — builds preview account list
│   │   └── SuggestMissingAccounts.php       NEW — post-creation suggestions
│   └── Workspace/
│       ├── CreateWorkspace.php              MODIFY — accept entity_type, abn, flags
│       ├── ExtractBusinessFlags.php         NEW — Claude API call (simple mode)
│       └── LabelChartAccounts.php           NEW — Claude API call (AI rename, streamed)
├── Enums/
│   ├── AccountSubType.php                   MODIFY — expand to ~70 values
│   └── EntityType.php                       NEW
├── Http/
│   ├── Controllers/Api/
│   │   ├── WorkspaceController.php          MODIFY — wizard preview + create endpoints
│   │   └── Admin/CoaTemplateController.php  NEW — admin template CRUD
│   ├── Requests/
│   │   ├── Workspace/
│   │   │   ├── WizardPreviewRequest.php     NEW
│   │   │   └── StoreWorkspaceRequest.php    MODIFY — add entity_type, abn, flags
│   │   └── Admin/
│   │       ├── StoreCoaTemplateRequest.php  NEW
│   │       └── UpdateCoaTemplateRequest.php NEW
│   └── Resources/
│       ├── WizardPreviewResource.php        NEW
│       ├── CoaTemplateResource.php          NEW
│       └── CoaTemplateAccountResource.php  NEW
├── Models/Tenant/
│   ├── Workspace.php                        MODIFY — entity_type, abn, legal_name casts
│   ├── CoaBaseTemplate.php                  NEW
│   ├── CoaBaseTemplateAccount.php           NEW
│   ├── CoaOverlayModule.php                 NEW
│   └── CoaOverlayAccount.php               NEW
└── Policies/
    └── CoaTemplatePolicy.php               NEW — admin only

database/migrations/
├── 2026_03_14_200001_add_entity_fields_to_workspaces.php      NEW
├── 2026_03_14_200002_create_coa_base_templates_table.php      NEW
├── 2026_03_14_200003_create_coa_base_template_accounts.php    NEW
├── 2026_03_14_200004_create_coa_overlay_modules_table.php     NEW
└── 2026_03_14_200005_create_coa_overlay_accounts_table.php    NEW

database/seeders/
└── CoaTemplatesSeeder.php                                      NEW — 6 base + 8 overlays

frontend/src/
├── app/(dashboard)/
│   └── workspaces/
│       └── create/
│           └── page.tsx                    NEW — wizard page (client component)
├── components/
│   ├── workspace/
│   │   ├── WizardStage1.tsx               NEW — entity type + ABN
│   │   ├── WizardStage2Simple.tsx         NEW — free text + extracted flags
│   │   ├── WizardStage2Advanced.tsx       NEW — structured questionnaire
│   │   ├── WizardStage3Review.tsx         NEW — CoA review with reasoning
│   │   └── AccountReasoningBadge.tsx      NEW — per-account reasoning tooltip
│   └── layout/
│       └── workspace-switcher.tsx         MODIFY — add "Create new workspace" CTA
└── hooks/
    ├── use-wizard-preview.ts              NEW — TanStack Query for preview endpoint
    └── use-ai-label.ts                    NEW — streaming AI label hook
```

---

## Implementation Phases

### Phase 1: Foundation (Backend) — ~1 week

1. **Expand `AccountSubType` enum** — add ~55 new canonical values. Update `label()` and `accountType()` methods. Backfill existing template accounts with specific sub_types (e.g. `AustralianStandardCoA` currently has no sub_types — add them).

2. **Add `EntityType` enum** — new PHP enum.

3. **Workspace migrations** — add `entity_type`, `abn`, `legal_name`, `questionnaire_snapshot` columns. Update `Workspace` model fillable/casts. Update `WorkspaceResource` to include new fields.

4. **CoA template tables** — 4 new migrations for `coa_base_templates`, `coa_base_template_accounts`, `coa_overlay_modules`, `coa_overlay_accounts`.

5. **`CoaTemplatesSeeder`** — seed 6 base templates + 8 overlay modules with full account lists, sub_types, and reasoning text. ~500–600 account definitions total.

6. **`MatchCoaTemplate` action** — given `(entity_type, industry, flags[])`, returns the best matching base template + list of applicable overlay modules. Pure PHP, no AI. Scoring: exact entity_type match (3pts) + exact industry match (2pts) + flag count match (1pt each). Falls back to `AustralianStandardCoA` if no match.

7. **`AssembleCoaPreview` action** — given a matched template + overlays, returns the merged account list deduplicated by code. System accounts always included. User overrides (renames/removes/adds) applied on top.

8. **`SeedChartOfAccounts` update** — add DB-template code path alongside existing hardcoded path. When template is `australian_standard` and no DB templates exist, falls back to existing behaviour. Zero breaking changes.

**Phase 1 tests**: `MatchCoaTemplateTest`, `AssembleCoaPreviewTest`, `AccountSubTypeTest`

---

### Phase 2: Wizard API — ~1 week

1. **`WizardPreviewRequest`** + **`WizardPreviewResource`** — request validation + structured response.

2. **`POST /workspaces/wizard/preview`** endpoint — calls `MatchCoaTemplate` → `AssembleCoaPreview` → returns `WizardPreviewResource`. In simple mode, runs `ExtractBusinessFlags` first.

3. **`ExtractBusinessFlags` action** — sends free-text to Claude Opus 4.6 with structured output schema (JSON). Returns flag array + confidence map. On any failure, returns `null` — the calling controller detects this and instructs the frontend to switch to advanced mode silently. Never throws to the user.

4. **`LabelChartAccounts` action** — sends account list + business context to Claude Haiku 4.5. Streams response. Each line is a JSON object `{code, suggested_name}`. Frontend consumes the stream.

5. **`POST /workspaces/wizard/ai-label`** endpoint — proxies the streamed Claude response to the frontend. Uses Laravel's `StreamedResponse`.

6. **`StoreWorkspaceRequest` update** — add `entity_type`, `abn` (with check-digit validation rule), `legal_name`, `questionnaire_flags`, `account_overrides` fields.

7. **`CreateWorkspace` action update** — accept new fields, call `MatchCoaTemplate` + `AssembleCoaPreview`, apply overrides, pass final account list to `SeedChartOfAccounts` (DB template path).

8. **Admin endpoints** — `GET/POST/PATCH /admin/coa-templates` with `CoaTemplatePolicy` (admin role only).

9. **`GET /workspaces/{id}/coa-suggestions`** — loads questionnaire snapshot, re-runs `AssembleCoaPreview`, filters out existing accounts, returns suggestions.

**Phase 2 tests**: `WizardPreviewApiTest`, `ExtractBusinessFlagsTest` (mock Claude), `CreateWorkspaceWizardTest`, `CoaTemplateAdminApiTest`, `CoaSuggestionsApiTest`

**ABN validation rule**:
```php
// Custom Laravel rule — AbnValidationRule
// 11-digit check-digit algorithm per ATO specification
// Applied in StoreWorkspaceRequest and WizardPreviewRequest
```

---

### Phase 3: Frontend Wizard — ~1.5 weeks

**Architecture**: Single page `workspaces/create/page.tsx` (client component). Single `useForm` instance (React Hook Form) at wizard root. Per-step Zod schemas for validation before advancing. TanStack Query for preview + AI label endpoints.

**Stage 1 — Entity & Identity**
- Entity type selector (6 options with icons)
- Workspace name input
- ABN input with real-time format validation (11 digits, spaces allowed, stripped on submit)
- Base currency + fiscal year start month
- Zod schema validates ABN format client-side; server validates check-digit

**Stage 2 — Business Profile**
- Toggle: Simple / Advanced mode (default: simple)
- Simple: `<textarea>` → on blur/submit calls `/wizard/preview` with `free_text` → shows extracted flags with confidence badges → user can correct any flag
- Advanced: 8 flag questions presented as yes/no card selectors, one at a time or all visible (progressive disclosure)
- Both modes call `/wizard/preview` to get account list before Stage 3

**Stage 3 — CoA Review**
- Account list grouped by type (Assets, Liabilities, Equity, Revenue, Expenses)
- Each account row: code, name, type badge, sub_type label, reasoning text (expandable), lock icon for system accounts
- Rename: inline edit on non-system account name
- Remove: trash icon on non-system accounts
- Add: "+ Add account" opens a small form (name, type, sub_type dropdown)
- "Suggest plain-language names" button → calls `/wizard/ai-label` → streams renamed suggestions → user accepts/rejects per account
- "Create workspace" button → submits full wizard payload to `POST /workspaces`
- Close/back → confirmation dialog ("Your progress will be lost") → discard

**Workspace switcher update** — add "Create new workspace" at bottom of switcher dropdown → routes to `/workspaces/create`

**Phase 3 tests**: Playwright browser tests covering wizard completion, ABN validation, simple mode extraction display, Stage 3 rename/remove/add

---

### Phase 4: Admin Template UI — ~0.5 weeks

- `/admin/coa-templates` page — list base templates + overlays
- Template detail: account list with edit/add/remove/reorder
- Inline editing of reasoning text per account
- Activate/deactivate template toggle
- No design doc needed — standard admin CRUD pattern matching existing admin pages

**Phase 4 tests**: `CoaTemplateAdminUiTest`

---

## Claude API Integration

### Call 1 — Flag Extraction (Simple Mode)

```
Model:    claude-opus-4-6
Thinking: adaptive
Output:   structured JSON (closed schema matching flag array)
Trigger:  user submits free text in Stage 2 simple mode
Fallback: returns all flags as false/null → wizard shows all flags as "unconfirmed"
Cost:     ~$0.005 per wizard session (one call, short prompt)
```

### Call 2 — Account Labelling (Optional AI Rename)

```
Model:    claude-haiku-4-5
Thinking: none (rename is not complex reasoning)
Output:   streamed JSON lines, one per account
Trigger:  user clicks "Suggest plain-language names" in Stage 3
Fallback: no-op — original names preserved, user notified
Cost:     ~$0.001 per workspace (Haiku pricing, short context)
```

Both calls are **server-side only** in Laravel Actions. The Anthropic API key is never sent to the frontend.

---

## Testing Strategy

```
tests/
├── Unit/
│   ├── Enums/AccountSubTypeTest.php              accountType() mapping for all ~70 values
│   ├── Actions/MatchCoaTemplateTest.php           scoring logic, tie-breaking, fallback
│   └── Actions/AssembleCoaPreviewTest.php         deduplication, override application
├── Feature/Api/
│   ├── WizardPreviewApiTest.php                  preview endpoint, flag combinations
│   ├── CreateWorkspaceWizardTest.php              full wizard payload, ABN validation
│   ├── CoaTemplateAdminApiTest.php               CRUD, policy (admin only)
│   ├── CoaSuggestionsApiTest.php                 additive suggestions only
│   └── ExtractBusinessFlagsTest.php              mocked Claude response
└── Browser/
    └── WorkspaceWizardTest.php                   end-to-end wizard (Playwright)
```

**Tenant isolation test** (critical): verify accounts seeded for Workspace A are not visible from Workspace B, even within the same organisation.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Claude API unavailable in simple mode | Low | Medium | Fallback to advanced mode automatically — no blocking |
| `SeedChartOfAccounts` refactor breaks existing workspace creation | Medium | High | DB template path is additive; existing hardcoded path preserved as fallback |
| `AccountSubType` enum expansion breaks existing bank rule references | Low | High | Additive only — existing 15 values preserved with same string keys |
| Template seeder produces incorrect CoA for edge-case combinations | Medium | Medium | Automated test matrix covering all flag combinations |
| ABN check-digit rule has edge cases | Low | Medium | Use ATO's published algorithm with test cases from ATO website |
| AI label suggestions exceed account name max length | Low | Low | Truncate to 100 chars client-side before accepting suggestion |

---

## Gate 3: Architecture Post-Check

| Section | Check | Status |
|---------|-------|--------|
| Technical Feasibility | Architecture approach clear | ✅ PASS |
| Technical Feasibility | Existing patterns leveraged | ✅ PASS |
| Technical Feasibility | No impossible requirements | ✅ PASS |
| Technical Feasibility | Performance considered | ✅ PASS — AI calls async/streamed |
| Technical Feasibility | Security considered | ✅ PASS — API key server-side only |
| Data & Integration | Data model understood | ✅ PASS — 4 new tables, workspace additions documented |
| Data & Integration | API contracts clear | ✅ PASS — 6 endpoints specified |
| Data & Integration | Dependencies identified | ✅ PASS — `anthropic/anthropic-sdk-php` |
| Data & Integration | Integration points mapped | ✅ PASS — extends CreateWorkspace, SeedChartOfAccounts |
| Data & Integration | DTO persistence explicit | ✅ PASS — Actions use validated data, not raw request arrays |
| Implementation Approach | File changes identified | ✅ PASS — full file list above |
| Implementation Approach | Risk areas noted | ✅ PASS — SeedChartOfAccounts refactor, ABN validation |
| Implementation Approach | Testing approach defined | ✅ PASS — Unit/Feature/Browser per phase |
| Implementation Approach | Rollback possible | ✅ PASS — migrations are reversible, feature flag possible |
| Laravel Best Practices | Lorisleiva Actions | ✅ PASS |
| Laravel Best Practices | No hardcoded business logic in frontend | ✅ PASS |
| Laravel Best Practices | API Resources for responses | ✅ PASS |
| Laravel Best Practices | Model route binding | ✅ PASS |
| Laravel Best Practices | Migrations schema-only | ✅ PASS |
| Frontend (Next.js/React) | TypeScript strict, no `any` | ✅ PASS |
| Frontend (Next.js/React) | TanStack Query for server state | ✅ PASS |
| Frontend (Next.js/React) | React Hook Form + Zod | ✅ PASS — single useForm at wizard root |
| Frontend (Next.js/React) | Server/client components explicit | ✅ PASS — wizard page is `'use client'` |
| Multi-Tenancy | All new models have workspace_id | ✅ PASS |
| Multi-Tenancy | No cross-tenant queries | ✅ PASS |
| Event Sourcing | No event sourcing needed | ✅ PASS — config data, not financial facts |

**Gate 3 Post-Check: PASS ✅**

---

## Development Clarification Decisions (2026-03-14)

| # | Question | Decision |
|---|----------|----------|
| Q1 | Template seeder data format | **JSON files** in `database/seeders/templates/json/` — seeder reads JSON, admin UI writes to DB. JSON is source of truth for git history, diffable, reviewable without code changes. |
| Q2 | AI extraction failure handling | **Silent fallback to advanced mode** — if Claude fails, wizard switches to structured questions automatically. No error shown. |
| Q3 | Overlay account code scheme | **Standard type ranges, pre-assigned in JSON** — overlay accounts sit within the standard 5-digit scheme (e.g. wages at 52100 in the 52000 expense range). `AssembleCoaPreview` deduplicates by code. Codes defined in JSON. |
| Q4 | Questionnaire snapshot contents | **Final confirmed flags only** — `{has_employees: true, has_vehicles: true, ...}` stored on workspace. Powers `SuggestMissingAccounts`. Free text not persisted. |

### Updated File Structure (JSON templates)

```
database/seeders/
├── templates/
│   ├── json/
│   │   ├── base/
│   │   │   ├── sole_trader_trades.json
│   │   │   ├── sole_trader_professional.json
│   │   │   ├── pty_ltd_trades.json
│   │   │   ├── pty_ltd_professional.json
│   │   │   ├── trust.json
│   │   │   └── smsf.json
│   │   └── overlays/
│   │       ├── has_employees.json
│   │       ├── has_vehicles.json
│   │       ├── has_inventory.json
│   │       ├── has_property.json
│   │       ├── gst_registered.json
│   │       ├── invoices_clients.json
│   │       ├── buys_on_credit.json
│   │       └── has_loans.json
│   └── AustralianStandardCoA.php   (preserved — fallback)
└── CoaTemplatesSeeder.php           (reads JSON → DB)
```

### Questionnaire Snapshot Schema

```json
{
  "has_employees": true,
  "has_vehicles": true,
  "gst_registered": true,
  "invoices_clients": true,
  "buys_on_credit": false,
  "has_inventory": false,
  "has_property": false,
  "has_loans": false,
  "has_subcontractors": false
}
```

---

## Next Steps

1. `/speckit-tasks` — generate task list from this plan
2. `/trilogy-db-visualiser` — interactive DB schema canvas for this epic
