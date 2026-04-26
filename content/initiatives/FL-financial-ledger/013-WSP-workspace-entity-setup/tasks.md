---
title: "Implementation Tasks: 013-WSP Workspace Entity Setup & Smart Chart of Accounts"
---

# Implementation Tasks: 013-WSP Workspace Entity Setup

**Epic**: 013-WSP | **Mode**: AI Agent | **Generated**: 2026-03-14
**Total tasks**: 58 | **Parallelisable**: 21

---

## Phase 1: Foundation — Enums, Models, Migrations

- [X] T001 Enum: Expand `AccountSubType` in `app/Enums/AccountSubType.php` — add cases: `CASH`, `ACCOUNTS_RECEIVABLE`, `PREPAYMENT`, `INVESTMENT_PROPERTY`, `MOTOR_VEHICLE`, `COMPUTER_EQUIPMENT`, `OFFICE_EQUIPMENT`, `ACCUMULATED_DEPRECIATION`, `OTHER_ASSET`, `ACCOUNTS_PAYABLE`, `GST_COLLECTED`, `GST_PAID`, `ATO_SETTLEMENT`, `PAYG_WITHHOLDING`, `SUPERANNUATION_PAYABLE`, `CREDIT_CARD`, `BUSINESS_LOAN`, `MORTGAGE`, `ANNUAL_LEAVE_PROVISION`, `LONG_SERVICE_LEAVE`, `OTHER_LIABILITY`, `OWNERS_CAPITAL`, `OWNERS_DRAWINGS`, `SHARE_CAPITAL`, `RETAINED_EARNINGS`, `TRUST_CORPUS`, `TRUST_DISTRIBUTION`, `SMSF_MEMBER_EQUITY`, `DIVIDENDS_PAID`, `SALES_REVENUE`, `SERVICE_REVENUE`, `RENTAL_INCOME`, `INTEREST_INCOME`, `GRANT_INCOME`, `OTHER_INCOME`, `COST_OF_GOODS_SOLD`, `SUBCONTRACTOR`, `WAGES`, `SUPERANNUATION`, `PAYG_EXPENSE`, `FUEL`, `VEHICLE_REGISTRATION`, `VEHICLE_INSURANCE`, `VEHICLE_DEPRECIATION`, `RENT_EXPENSE`, `UTILITIES`, `INSURANCE`, `SUBSCRIPTIONS`, `ADVERTISING`, `ACCOUNTING_LEGAL`, `BANK_FEES`, `INTEREST_EXPENSE`, `DEPRECIATION_EXPENSE`, `OFFICE_SUPPLIES`, `IT_SOFTWARE`, `TRAVEL_ENTERTAINMENT`, `UNIFORMS_PPE`, `TOOLS_EQUIPMENT`, `COUNCIL_RATES`, `REPAIRS_MAINTENANCE`, `CLEANING`, `TELEPHONE_INTERNET`, `POSTAGE_COURIER`, `TRAINING_EDUCATION`, `OTHER_EXPENSE`. Update `label()` and `accountType()` for all new cases. Preserve all 15 existing case values unchanged.

- [X] T002 [P] Enum: Create `app/Enums/EntityType.php` — `enum EntityType: string` with cases: `PTY_LTD = 'pty_ltd'`, `TRUST = 'trust'`, `SOLE_TRADER = 'sole_trader'`, `PARTNERSHIP = 'partnership'`, `SMSF = 'smsf'`, `NOT_FOR_PROFIT = 'not_for_profit'`. Add `label(): string` method returning human-readable names.

- [X] T003 Migration: Create `database/migrations/2026_03_14_200001_add_entity_fields_to_workspaces.php` — adds to `workspaces` table: `entity_type` varchar(50) nullable after `industry`, `abn` varchar(11) nullable after `entity_type`, `legal_name` varchar(255) nullable after `abn`, `questionnaire_snapshot` json nullable after `legal_name`.

- [X] T004 [P] Migration: Create `database/migrations/2026_03_14_200002_create_coa_base_templates_table.php` — columns: `id` bigIncrements, `name` string, `entity_type` string, `industry` string, `description` text nullable, `priority` integer default 0, `is_active` boolean default true, `timestamps`. Index on `(entity_type, industry, is_active)`.

- [X] T005 [P] Migration: Create `database/migrations/2026_03_14_200003_create_coa_base_template_accounts_table.php` — columns: `id` bigIncrements, `template_id` foreignId constrained `coa_base_templates` cascadeOnDelete, `code` string(20), `name` string, `type` string, `parent_code` string(20) nullable, `default_tax_code` string(20) nullable, `sub_type` string(50), `is_system` boolean default false, `reasoning` string(500) nullable, `sort_order` integer default 0. Index on `template_id`.

- [X] T006 [P] Migration: Create `database/migrations/2026_03_14_200004_create_coa_overlay_modules_table.php` — columns: `id` bigIncrements, `name` string, `flag_key` string(50) unique, `description` text nullable, `is_active` boolean default true, `timestamps`. Valid flag_key values: `has_employees`, `has_vehicles`, `has_inventory`, `has_property`, `gst_registered`, `invoices_clients`, `buys_on_credit`, `has_loans`, `has_subcontractors`.

- [X] T007 [P] Migration: Create `database/migrations/2026_03_14_200005_create_coa_overlay_accounts_table.php` — columns: `id` bigIncrements, `overlay_id` foreignId constrained `coa_overlay_modules` cascadeOnDelete, `code` string(20), `name` string, `type` string, `parent_code` string(20) nullable, `default_tax_code` string nullable, `sub_type` string(50), `is_system` boolean default false, `reasoning` string(500) nullable, `sort_order` integer default 0. Index on `overlay_id`.

- [X] T008 Model: Update `app/Models/Tenant/Workspace.php` — add to `$fillable`: `entity_type`, `abn`, `legal_name`, `questionnaire_snapshot`. Add to `casts()`: `entity_type` → `EntityType::class`, `questionnaire_snapshot` → `'array'`. Add `abn` validation helper: `public function hasValidAbn(): bool` (check-digit logic or delegate to service).

- [X] T009 [P] Model: Create `app/Models/Tenant/CoaBaseTemplate.php` — `$fillable`: `name`, `entity_type`, `industry`, `description`, `priority`, `is_active`. `casts()`: `is_active` → `'boolean'`. Relationship: `accounts(): HasMany` → `CoaBaseTemplateAccount::class`. Scope: `scopeActive($q)`.

- [X] T010 [P] Model: Create `app/Models/Tenant/CoaBaseTemplateAccount.php` — `$fillable`: all columns. `casts()`: `sub_type` → `AccountSubType::class`, `is_system` → `'boolean'`. Relationship: `template(): BelongsTo` → `CoaBaseTemplate::class`.

- [X] T011 [P] Model: Create `app/Models/Tenant/CoaOverlayModule.php` — `$fillable`: `name`, `flag_key`, `description`, `is_active`. `casts()`: `is_active` → `'boolean'`. Relationship: `accounts(): HasMany` → `CoaOverlayAccount::class`. Scope: `scopeActive($q)`, `scopeForFlag(string $flagKey)`.

- [X] T012 [P] Model: Create `app/Models/Tenant/CoaOverlayAccount.php` — `$fillable`: all columns. `casts()`: `sub_type` → `AccountSubType::class`, `is_system` → `'boolean'`. Relationship: `overlay(): BelongsTo` → `CoaOverlayModule::class`.

- [X] T013 JSON Seeds: Create `database/seeders/templates/json/base/` directory and 6 JSON files. Each file is an object with `meta` (name, entity_type, industry, priority) and `accounts` array. Each account: `{code, name, type, parent_code, default_tax_code, sub_type, is_system, reasoning, sort_order}`.

  Files and contents:
  - `sole_trader_trades.json` — Sole Trader Trades: assets (bank, AR, motor vehicles, tools, prepayments), liabilities (AP, GST Collected, GST Paid, ATO Settlement), equity (owners_capital, owners_drawings, retained_earnings), revenue (service_revenue, other_income), expenses (operating expenses header accounts)
  - `sole_trader_professional.json` — Sole Trader Professional Services: leaner asset list (no vehicles/tools by default), same liability/equity structure, revenue (service_revenue, consulting), expenses (office, subscriptions, accounting_legal)
  - `pty_ltd_trades.json` — Pty Ltd Trades: same operative accounts but equity = share_capital + retained_earnings + dividends_paid (no owners_capital/drawings)
  - `pty_ltd_professional.json` — Pty Ltd Professional Services
  - `trust.json` — Trust: equity = trust_corpus + trust_distribution accounts; beneficiary distribution expense accounts
  - `smsf.json` — SMSF: equity = smsf_member_equity; investment assets (shares, property, cash); contribution income; pension/benefit expense accounts

- [X] T014 JSON Seeds: Create `database/seeders/templates/json/overlays/` directory and 9 JSON files. Each file: `{meta: {name, flag_key}, accounts: [...]}`.

  Files:
  - `has_employees.json` — accounts: Wages Expense (sub_type: wages, code: 52100), PAYG Withholding Payable (payg_withholding, 21300, is_system: false), Superannuation Payable (superannuation_payable, 21400), Superannuation Expense (superannuation, 52110), PAYG Expense (payg_expense, 52120), Annual Leave Provision (annual_leave_provision, 21500). Reasoning on each account explains the ATO requirement.
  - `has_vehicles.json` — Motor Vehicles (motor_vehicle, 12300), Accumulated Depreciation — Vehicles (accumulated_depreciation, 12310), Fuel Expense (fuel, 52200), Vehicle Registration (vehicle_registration, 52210), Vehicle Insurance (vehicle_insurance, 52220), Vehicle Depreciation (vehicle_depreciation, 52230). Reasonings mention bank feed auto-categorisation for fuel.
  - `has_inventory.json` — Stock on Hand (inventory, 11500), Cost of Goods Sold (cost_of_goods_sold, 51000, is_system: false), Purchases (cost_of_goods_sold, 51100).
  - `has_property.json` — Investment Property (investment_property, 12500), Accumulated Depreciation — Property (accumulated_depreciation, 12510), Rental Income (rental_income, 41200), Mortgage Liability (mortgage, 23200), Council Rates (council_rates, 52400), Property Insurance (insurance, 52410), Property Depreciation (depreciation_expense, 52420), Repairs & Maintenance (repairs_maintenance, 52430).
  - `gst_registered.json` — GST Collected (gst_collected, 22000, is_system: true), GST Paid (gst_paid, 22100, is_system: true), ATO Settlement Account (ato_settlement, 22200, is_system: true). Reasonings note these cannot be removed.
  - `invoices_clients.json` — Accounts Receivable (accounts_receivable, 11100, is_system: true). Reasoning: "Required to track money owed by your customers."
  - `buys_on_credit.json` — Accounts Payable (accounts_payable, 21100, is_system: true). Reasoning: "Required to track money you owe to suppliers."
  - `has_loans.json` — Business Loan (business_loan, 23100), Interest Expense (interest_expense, 52500).
  - `has_subcontractors.json` — Subcontractor Expense (subcontractor, 52600), Labour Hire (subcontractor, 52610).

- [X] T015 Seeder: Create `database/seeders/CoaTemplatesSeeder.php` — reads each JSON file from `database/seeders/templates/json/base/` and `overlays/`, upserts records into `coa_base_templates` + `coa_base_template_accounts` and `coa_overlay_modules` + `coa_overlay_accounts`. Use `updateOrCreate` keyed on name for templates and `(template_id, code)` / `(overlay_id, code)` for accounts. Log counts on completion.

- [X] T016 Run migrations: `php artisan migrate` then `php artisan db:seed --class=CoaTemplatesSeeder` and verify no errors.

---

## Phase 2: Core Actions — Template Engine

- [X] T017 Action: Create `app/Actions/ChartOfAccounts/MatchCoaTemplate.php` — `use AsAction`. `handle(string $entityType, string $industry, array $flags): array` returns `['base_template' => CoaBaseTemplate, 'overlays' => Collection<CoaOverlayModule>]`. Scoring: find active `CoaBaseTemplate` where `entity_type = $entityType AND industry = $industry`, order by priority desc; if none, find where `entity_type = $entityType` (any industry); if none, first active template. Overlays: load active `CoaOverlayModule` where `flag_key` is in `array_keys(array_filter($flags))`.

- [X] T018 Action: Create `app/Actions/ChartOfAccounts/AssembleCoaPreview.php` — `use AsAction`. `handle(CoaBaseTemplate $base, Collection $overlays, array $overrides = []): array`. Returns array of account objects merged from base accounts + overlay accounts, deduplicated by `code` (base takes precedence). Apply `$overrides`: `{code, action: 'rename'|'remove'|'add', name?, type?, sub_type?}`. Result shape per account: `{code, name, type, sub_type, parent_code, default_tax_code, is_system, reasoning, source}` where `source` is `"base:{template_name}"` or `"overlay:{flag_key}"` or `"user:added"`.

- [X] T019 Action: Update `app/Actions/ChartOfAccounts/SeedChartOfAccounts.php` — add second code path: `handleFromTemplate(Workspace $workspace, array $accounts): void` that accepts the assembled preview array from `AssembleCoaPreview` and seeds accounts. Existing `handle(Workspace $workspace, string $template)` path preserved untouched as fallback.

- [X] T020 Action: Create `app/Actions/ChartOfAccounts/SuggestMissingAccounts.php` — `use AsAction`. `handle(Workspace $workspace): array`. Load `$workspace->questionnaire_snapshot` (flags array). Call `MatchCoaTemplate` + `AssembleCoaPreview` with those flags. Filter out any account codes already in `$workspace->chartAccounts()->pluck('code')`. Return remaining accounts as suggestions array with same shape as `AssembleCoaPreview` output.

- [X] T021 Action: Update `app/Actions/Workspace/CreateWorkspace.php` — add parameters: `?string $entityType = null`, `?string $abn = null`, `?string $legalName = null`, `array $questionnaireFlags = []`, `array $accountOverrides = []`. When `$questionnaireFlags` is non-empty: call `MatchCoaTemplate::run($entityType, $industry, $questionnaireFlags)`, then `AssembleCoaPreview::run($base, $overlays, $accountOverrides)`, then `SeedChartOfAccounts::run()->handleFromTemplate($workspace, $accounts)`. Store `$questionnaireFlags` as `questionnaire_snapshot`. When flags empty: keep existing `SeedChartOfAccounts::run($workspace, $industry)` path.

---

## Phase 2: AI Actions — Claude Integration

- [X] T022 Install Anthropic PHP SDK: `composer require anthropic/anthropic-sdk-php`. Add `ANTHROPIC_API_KEY` to `.env.example`. Add to `config/services.php`: `'anthropic' => ['key' => env('ANTHROPIC_API_KEY')]`.

- [X] T023 Action: Create `app/Actions/Workspace/ExtractBusinessFlags.php` — `use AsAction`. `handle(string $freeText): ?array`. Build prompt: system = "Extract business flags as JSON. Return ONLY a JSON object with boolean values for these keys: has_employees, has_vehicles, has_inventory, has_property, gst_registered, invoices_clients, buys_on_credit, has_loans, has_subcontractors. If unclear, default to false." User = $freeText. Call `claude-opus-4-6` via Anthropic PHP SDK with `output_config.format = json_schema` matching the 9 boolean flags. On any exception (API error, timeout, parse error), return `null` — caller detects null and falls back to advanced mode silently. On success return parsed array.

- [X] T024 Action: Create `app/Actions/Workspace/LabelChartAccounts.php` — `use AsAction`. `handle(string $entityType, string $industry, array $accounts): \Generator`. Builds prompt asking Claude Haiku 4.5 to rename accounts in plain language for the given entity/industry context. System prompt: "You are renaming accounting accounts for a {entityType} in the {industry} industry. For each account, suggest a plain-language name that a non-accountant would understand. Preserve accounting meaning. Return one JSON object per line: {\"code\": \"...\", \"suggested_name\": \"...\"}". Streams response, yields parsed JSON objects line by line. On failure, yields nothing (caller uses original names).

---

## Phase 2: API Endpoints

- [X] T025 Form Request: Create `app/Http/Requests/Workspace/WizardPreviewRequest.php` — `authorize()`: user must be authenticated. `rules()`: `entity_type` required in EntityType values, `industry` required string, `flags` required array, `flags.*` boolean, `free_text` nullable string max:2000, `overrides` nullable array, `overrides.*.code` required_with:overrides string, `overrides.*.action` required_with:overrides in:rename,remove,add, `overrides.*.name` nullable string, `overrides.*.type` nullable in:asset,liability,equity,revenue,expense, `overrides.*.sub_type` nullable string.

- [X] T026 Resource: Create `app/Http/Resources/WizardPreviewResource.php` — shape: `{matched_template: string, accounts: [{code, name, type, sub_type, is_system, reasoning, source}], extracted_flags: array|null, flag_confidence: array|null}`.

- [X] T027 Resource: Create `app/Http/Resources/CoaTemplateResource.php` — shape: `{id, name, entity_type, industry, priority, is_active, accounts_count}`. Create `app/Http/Resources/CoaTemplateAccountResource.php` — shape: `{id, code, name, type, sub_type, is_system, reasoning, sort_order}`.

- [X] T028 Controller: Update `app/Http/Controllers/Api/WorkspaceController.php` — add method `wizardPreview(WizardPreviewRequest $request): JsonResponse`. If `$request->filled('free_text')`: call `ExtractBusinessFlags::run($request->free_text)`; if null returned, return response with `{fallback_to_advanced: true}`. Otherwise use `$request->flags`. Call `MatchCoaTemplate::run(...)` + `AssembleCoaPreview::run(...)`. Return `WizardPreviewResource`.

- [X] T029 Controller: Add `aiLabel(Request $request): StreamedResponse` to `WorkspaceController` — validates `entity_type`, `industry`, `accounts` array. Returns `StreamedResponse` that runs `LabelChartAccounts::run(...)` generator and writes each yielded JSON object as a newline-delimited stream. Sets header `Content-Type: application/x-ndjson`.

- [X] T030 Controller: Add `suggestions(Request $request, Workspace $workspace): JsonResponse` to `WorkspaceController` — authorize `view` on workspace. Call `SuggestMissingAccounts::run($workspace)`. Return as `JsonResponse` with accounts array.

- [X] T031 Form Request: Update `app/Http/Requests/Workspace/UpdateWorkspaceRequest.php` (or `StoreWorkspaceRequest`) — add optional fields: `entity_type` nullable in EntityType values, `abn` nullable string size:11 digits_only + AbnValidationRule, `legal_name` nullable string max:255, `questionnaire_flags` nullable array, `questionnaire_flags.*` boolean, `account_overrides` nullable array.

- [X] T032 Validation: Create `app/Rules/AbnValidationRule.php` — implements `ValidationRule`. `validate(string $attribute, mixed $value, Closure $fail): void`. Strip spaces from value. Check length = 11 digits. Apply ATO check-digit algorithm: subtract 1 from first digit, multiply each digit by weight [10,1,3,5,7,9,11,13,15,17,19], sum all products, check sum % 89 === 0. If invalid call `$fail('The ABN is not valid.')`.

- [X] T033 Controller: Create `app/Http/Controllers/Api/Admin/CoaTemplateController.php` — methods: `index()` lists all templates with accounts_count; `show(CoaBaseTemplate $coaBaseTemplate)` returns template + accounts; `store(StoreCoaTemplateRequest $request)` creates template + accounts from JSON payload; `update(UpdateCoaTemplateRequest $request, CoaBaseTemplate $coaBaseTemplate)` upserts accounts; `toggleActive(Request $request, CoaBaseTemplate $coaBaseTemplate)` flips `is_active`. All methods use `Gate::authorize('manage', CoaBaseTemplate::class)`.

- [X] T034 Policy: Create `app/Policies/CoaTemplatePolicy.php` — `manage(User $user): bool` returns `$user->hasRole('super_admin')` (platform admin, not workspace role). Register in `AppServiceProvider::boot()` via `Gate::policy(CoaBaseTemplate::class, CoaTemplatePolicy::class)`.

- [X] T035 Routes: Add to `routes/api.php` inside workspace-scoped middleware group:
  ```
  POST   workspaces/wizard/preview  → WorkspaceController@wizardPreview
  POST   workspaces/wizard/ai-label → WorkspaceController@aiLabel
  GET    workspaces/{workspace}/coa-suggestions → WorkspaceController@suggestions
  ```
  Add admin routes (platform admin middleware):
  ```
  GET/POST/PATCH/DELETE admin/coa-templates/{...} → Admin\CoaTemplateController
  ```

---

## Phase 3: Frontend Wizard [US1, US2, US6, US7]

- [X] T036 [US1] Types: Create `frontend/src/types/workspace.ts` — export interfaces: `EntityType` union string literal type, `QuestionnaireFlags` (9 boolean keys), `WizardPreviewAccount` `{code, name, type, sub_type, is_system, reasoning, source}`, `WizardPreviewResponse` `{matched_template, accounts, extracted_flags, flag_confidence, fallback_to_advanced?}`, `WizardPayload` `{name, entity_type, industry, abn?, legal_name?, base_currency, fiscal_year_start_month, questionnaire_flags, account_overrides}`.

- [X] T037 [US1] Hook: Create `frontend/src/hooks/use-wizard-preview.ts` — TanStack Query `useMutation` that calls `POST /api/v1/workspaces/wizard/preview`. Accepts `WizardPreviewRequest` body. Returns `WizardPreviewResponse`. Export `useWizardPreview()`.

- [X] T038 [US1] Hook: Create `frontend/src/hooks/use-ai-label.ts` — fetches `POST /api/v1/workspaces/wizard/ai-label` as an NDJSON stream. Returns `{stream: AsyncGenerator<{code, suggested_name}>, isStreaming, error, startLabelling}`. Uses `fetch()` with `response.body.getReader()` for streaming.

- [X] T039 [US1] Page: Create `frontend/src/app/(dashboard)/workspaces/create/page.tsx` — `'use client'`. Imports `useForm` from `react-hook-form`, `zodResolver`. Defines single form schema union of all 3 stages. State: `currentStage: 1|2|3`, `previewData: WizardPreviewResponse | null`. Renders `<WizardStage1>`, `<WizardStage2Simple>` or `<WizardStage2Advanced>`, `<WizardStage3Review>` based on stage. Passes form instance down to each stage component. Handles close → confirmation dialog.

- [X] T040 [US1] Component: Create `frontend/src/components/workspace/WizardStage1.tsx` — `'use client'`. Props: `form: UseFormReturn`. Fields: entity type selector (6 cards with icons, maps to EntityType values), workspace name input, ABN input (format hint "XX XXX XXX XXX", strips spaces on change), legal name input, base currency select (default AUD), fiscal year start month select (1–12, default 7). Zod schema for stage 1: `entity_type` required, `name` required min:2, `abn` string optional validated by regex `^\d{11}$` (server does check-digit), `base_currency` default 'AUD', `fiscal_year_start_month` number 1-12. "Next" button calls `form.trigger(['entity_type','name','abn','base_currency','fiscal_year_start_month'])` before advancing.

- [X] T041 [US2, US6] Component: Create `frontend/src/components/workspace/WizardStage2Simple.tsx` — `'use client'`. Props: `form: UseFormReturn`, `onFlagsExtracted: (flags: QuestionnaireFlags, confidence: Record<string,string>) => void`, `onFallbackToAdvanced: () => void`. Single `<textarea>` placeholder "Describe your business — what do you do, do you have staff, vehicles, property?". On submit: calls `useWizardPreview` mutation with `{entity_type, industry, free_text}`. If response has `fallback_to_advanced: true`, calls `onFallbackToAdvanced()`. Otherwise renders extracted flags as a confirmation list with confidence badges (high=green, low=amber). User can toggle any flag. "Looks right →" button advances to Stage 3 with confirmed flags.

- [X] T042 [US2] Component: Create `frontend/src/components/workspace/WizardStage2Advanced.tsx` — `'use client'`. Props: `form: UseFormReturn`, `onComplete: (flags: QuestionnaireFlags) => void`. Renders 9 flag questions as yes/no card pairs. Industry selector at top (8 options). Each flag question shows icon, label, and brief description. All 9 questions visible at once (not step-by-step). "Preview my accounts →" calls `useWizardPreview` mutation, then calls `onComplete`.

- [X] T043 [US3, US7] Component: Create `frontend/src/components/workspace/WizardStage3Review.tsx` — `'use client'`. Props: `accounts: WizardPreviewAccount[]`, `form: UseFormReturn`, `onCreateWorkspace: () => void`. Renders accounts grouped by type in accordion sections (Assets, Liabilities, Equity, Revenue, Expenses). Each row: code badge, account name (inline-editable for non-system), type badge, sub_type chip, reasoning text (collapsed by default, expand on click), lock icon for system accounts, trash icon for non-system (confirm before remove). "+ Add account" button opens inline form row with name, type, sub_type select (from AccountSubType values). "Suggest plain-language names" button triggers `useAiLabel`, streams suggestions, shows accept/reject per row. "Create workspace" button submits. Tracks all renames/removals/additions as `account_overrides` in form state.

- [X] T044 [US7] Component: Create `frontend/src/components/workspace/AccountReasoningBadge.tsx` — `'use client'`. Props: `reasoning: string | null`, `isSystem: boolean`. Renders an info icon button; on click shows a popover with the reasoning text and optional "System account — cannot be removed" label. If `reasoning` is null, renders nothing.

- [X] T045 [US1] Workspace switcher: Update `frontend/src/components/layout/workspace-switcher.tsx` — add "Create new workspace" item at bottom of workspace list, separated by a divider. Routes to `/workspaces/create` using Next.js `<Link>`. Show `+` icon.

---

## Phase 3: Frontend — Entity & ABN Settings [US4]

- [X] T046 [US4] Settings update: Update `frontend/src/app/(dashboard)/settings/page.tsx` — add "Entity & Legal" section with fields: entity type select (read-only display + edit for owner/accountant), ABN input with validation, legal name input. Uses React Hook Form + Zod. On save: `PATCH /api/v1/workspaces/{id}` with `{entity_type, abn, legal_name}`. Show validation error inline for invalid ABN.

---

## Phase 4: Admin Template UI [US5]

- [X] T047 [US5] Page: Create `frontend/src/app/(dashboard)/admin/coa-templates/page.tsx` — `'use client'`. Lists `CoaBaseTemplate` records from `GET /api/v1/admin/coa-templates` via TanStack Query. Table columns: name, entity type, industry, account count, active toggle, edit link. "New template" button opens creation form.

- [X] T048 [US5] Page: Create `frontend/src/app/(dashboard)/admin/coa-templates/[id]/page.tsx` — template detail showing account list. Each row editable inline: code, name, type, sub_type dropdown, is_system toggle, reasoning text input, sort_order. Add account row at bottom. Save calls `PATCH /api/v1/admin/coa-templates/{id}`. Activate/deactivate toggle at top.

- [X] T049 [US5] Same pattern for overlay modules: `frontend/src/app/(dashboard)/admin/coa-overlays/` — list + detail pages following same pattern as templates.

---

## Phase 5: Post-Creation CoA Management [US3 continued]

- [X] T050 CoA settings update: Update `frontend/src/app/(dashboard)/settings/` CoA management page (if exists) or create `frontend/src/app/(dashboard)/chart-of-accounts/page.tsx` — add "Suggested accounts" button that calls `GET /api/v1/workspaces/{id}/coa-suggestions`. Renders suggested accounts in a dismissible panel. Each suggestion has "+ Add to my accounts" button that calls `POST /api/v1/chart-accounts` with the suggested account data.

---

## Phase 6: Tests

- [X] T051 [P] Test: Create `tests/Unit/Actions/MatchCoaTemplateTest.php` (Pest) — seeds 2 base templates + 3 overlays inline. Tests: exact entity+industry match returns correct template; entity-only match when no industry match; fallback to first active when no match; correct overlays selected from flags; inactive templates excluded; inactive overlays excluded.

- [X] T052 [P] Test: Create `tests/Unit/Actions/AssembleCoaPreviewTest.php` (Pest) — tests: base + overlay accounts merged; code deduplication (base wins); rename override applied; remove override applied; add override applied; system accounts present despite remove attempt; every account has non-null sub_type.

- [X] T053 [P] Test: Create `tests/Unit/Rules/AbnValidationRuleTest.php` (Pest) — tests valid ABNs (at least 5 real ABNs from ATO test list), invalid check-digit, wrong length, non-numeric. Ensure `51824753556` passes (ATO example).

- [X] T054 [P] Test: Create `tests/Feature/Api/WizardPreviewApiTest.php` (Pest) — uses `RefreshDatabase`, seeds `RolesAndPermissionsSeeder` + `CoaTemplatesSeeder`. Tests: authenticated user can call preview; returns accounts with sub_types; simple mode with mocked Claude returns extracted flags; simple mode with Claude failure returns `fallback_to_advanced: true`; all returned accounts have `sub_type` not null; unauthenticated returns 401.

- [X] T055 [P] Test: Create `tests/Feature/Api/CreateWorkspaceWizardTest.php` (Pest) — tests: wizard payload creates workspace with `entity_type` and `abn` stored; seeded accounts all have sub_type; questionnaire_snapshot stored with correct flags; invalid ABN returns 422; NFP without ABN when not GST-registered is accepted; tenant isolation — accounts not visible cross-workspace.

- [X] T056 [P] Test: Create `tests/Feature/Api/CoaTemplateAdminApiTest.php` (Pest) — tests: super_admin can list/create/update templates; owner role cannot access admin endpoints (403); deactivated template not used in wizard preview; new template available immediately after creation.

- [X] T057 [P] Test: Create `tests/Feature/Api/CoaSuggestionsApiTest.php` (Pest) — tests: returns only accounts not already in workspace; empty if workspace already has all suggested accounts; uses questionnaire_snapshot from workspace; 403 if user has no workspace access.

- [X] T058 Pint: Run `vendor/bin/pint --dirty` on all modified/created PHP files. Fix any style violations. Run `php artisan test --compact` and verify all tests pass.

---

## Summary

| Phase | Tasks | Parallelisable | Estimated |
|-------|-------|---------------|-----------|
| Phase 1 — Foundation | T001–T016 | 10 | ~1 week |
| Phase 2 — Actions + API | T017–T035 | 4 | ~1 week |
| Phase 3 — Frontend Wizard | T036–T046 | 1 | ~1.5 weeks |
| Phase 4 — Admin UI | T047–T049 | 0 | ~0.5 weeks |
| Phase 5 — CoA Management | T050 | 0 | ~0.5 days |
| Phase 6 — Tests + Pint | T051–T058 | 7 | ~0.5 weeks |

**MVP scope (P1 stories — US1, US2, US6)**: T001–T045, T051–T055, T058 — foundation + wizard end-to-end
