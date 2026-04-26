---
title: "Implementation Tasks: Bank Reconciliation Rules"
---

# Implementation Tasks: Bank Reconciliation Rules

**Epic**: 021-BRR | **Mode**: AI | **Generated**: 2026-03-14
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

---

## Phase 1: Backend Foundation (Migrations, Models, Permissions)

- [X] T001 [P] Migration: Create `database/migrations/2026_03_14_100001_extend_bank_feed_rules_table.php` — add columns: `is_default` (boolean, default false), `last_matched_at` (timestamp, nullable), `match_field` add 'card_category' as valid value (existing string column, no enum change needed in SQLite). Run `php artisan make:migration extend_bank_feed_rules_table`.

- [X] T002 [P] Migration: Create `database/migrations/2026_03_14_100002_create_rule_matches_table.php` — columns: `id` (bigIncrements), `workspace_id` (foreignId→workspaces, cascadeOnDelete), `bank_feed_rule_id` (foreignId→bank_feed_rules, cascadeOnDelete), `bank_transaction_id` (foreignId→bank_transactions, cascadeOnDelete), `outcome` (string: auto_posted|suggested|ignored), `created_at` (timestamp). Index on (workspace_id, bank_feed_rule_id). No `updated_at`.

- [X] T003 [P] Migration: Create `database/migrations/2026_03_14_100003_create_rule_suggestions_table.php` — columns: `id` (bigIncrements), `workspace_id` (foreignId→workspaces, cascadeOnDelete), `match_value` (string), `target_chart_account_id` (foreignId→chart_accounts, cascadeOnDelete), `target_tax_code` (string, nullable), `occurrence_count` (unsignedInteger), `status` (string, default 'pending': pending|accepted|dismissed), `timestamps`. Unique index on (workspace_id, match_value, target_chart_account_id).

- [X] T004 [P] Enum: Create `app/Enums/RuleMatchOutcome.php` — cases: AUTO_POSTED, SUGGESTED, IGNORED. String-backed enum.

- [X] T005 [P] Enum: Create `app/Enums/RuleSuggestionStatus.php` — cases: PENDING, ACCEPTED, DISMISSED. String-backed enum.

- [X] T006 Model: Update `app/Models/Tenant/BankFeedRule.php` — add to `$fillable`: `is_default`, `last_matched_at`. Add to `$casts`: `is_default` => 'boolean', `last_matched_at` => 'datetime'. Update `matches()` method: add `card_category` case that checks `$transaction->merchant_category` against `$this->match_value` (case-insensitive contains). Add `ruleMatches()` hasMany relationship to RuleMatch. Add `scopeStale($query, $days = 90)` — where `last_matched_at` is null or older than $days ago.

- [X] T007 [P] Model: Create `app/Models/Tenant/RuleMatch.php` — `$fillable`: workspace_id, bank_feed_rule_id, bank_transaction_id, outcome. `$casts`: outcome => RuleMatchOutcome::class. Relationships: `rule()` belongsTo BankFeedRule, `transaction()` belongsTo BankTransaction. No `updated_at` — set `const UPDATED_AT = null`.

- [X] T008 [P] Model: Create `app/Models/Tenant/RuleSuggestion.php` — `$fillable`: workspace_id, match_value, target_chart_account_id, target_tax_code, occurrence_count, status. `$casts`: status => RuleSuggestionStatus::class, occurrence_count => 'integer'. Relationships: `targetAccount()` belongsTo ChartAccount. Scope: `scopePending($query)` — where status = pending.

- [X] T009 Permission: Update `database/seeders/RolesAndPermissionsSeeder.php` — add `bookkeeper` to the roles that receive `banking.manage` permission. Currently only owner + accountant have it.

---

## Phase 2: Backend API (Controller, Actions, Form Requests)

- [X] T010 Controller: Create `app/Http/Controllers/Api/BankFeedRuleController.php` — methods: `index` (GET, list rules ordered by priority), `store` (POST, create rule), `update` (PATCH, update rule), `destroy` (DELETE), `toggle` (PATCH, flip is_active), `reorder` (POST, batch update priorities), `test` (POST, test rule against unreconciled txns). All methods require workspace context via `SetWorkspaceContext` middleware. Use `$this->authorize()` with BankAccountPolicy::manageRules for mutations, viewAny for reads.

- [X] T011 Action: Create `app/Actions/Banking/TestRule.php` (AsAction) — `handle(string $matchField, string $matchType, string $matchValue, ?int $minAmount, ?int $maxAmount, int $workspaceId): array`. Query `bank_transactions` where `workspace_id` matches, `reconciliation_status` = 'unmatched', `created_at` >= 90 days ago. Apply match logic (same as BankFeedRule::matches but without a model instance). Return array of matching transactions with: id, description, amount, date, merchant_category.

- [X] T012 Action: Create `app/Actions/Banking/ReorderRules.php` (AsAction) — `handle(array $orderedIds, int $workspaceId): void`. Validate all IDs belong to workspace. Update `priority` column: first ID gets priority 0, second gets 1, etc. Use single transaction.

- [X] T013 [P] Form Request: Create `app/Http/Requests/Banking/UpdateBankFeedRuleRequest.php` — `authorize()`: load rule by route param, stash on attributes, check `$this->user()->can('manageRules', BankAccount::class)`. Rules: match_field (string, in:description,merchant_name,reference,amount,card_category), match_type (string, in:exact,contains,starts_with,regex), match_value (string, max:500), target_chart_account_id (exists:chart_accounts,id), target_tax_code (nullable, string), auto_reconcile (boolean), is_active (boolean). All fields optional (PATCH).

- [X] T014 [P] Form Request: Create `app/Http/Requests/Banking/ReorderRulesRequest.php` — rules: `rule_ids` (required, array), `rule_ids.*` (integer, exists:bank_feed_rules,id).

- [X] T015 [P] Form Request: Create `app/Http/Requests/Banking/TestRuleRequest.php` — rules: `match_field` (required, string), `match_type` (required, string), `match_value` (required, string), `min_amount` (nullable, integer), `max_amount` (nullable, integer).

- [X] T016 Resource: Create `app/Http/Resources/BankFeedRuleResource.php` — fields: id, name, match_field, match_type, match_value, target_chart_account_id, target_account (nested: id, code, name from targetAccount relation), target_tax_code, target_contact_id, auto_reconcile, is_active, is_default, priority, last_matched_at, created_at, updated_at.

- [X] T017 Routes: Add to `routes/api.php` inside workspace-scoped group — `Route::apiResource('bank-feed-rules', BankFeedRuleController::class)`, plus: `Route::patch('bank-feed-rules/{bankFeedRule}/toggle', [BankFeedRuleController::class, 'toggle'])`, `Route::post('bank-feed-rules/reorder', [BankFeedRuleController::class, 'reorder'])`, `Route::post('bank-feed-rules/test', [BankFeedRuleController::class, 'test'])`.

---

## Phase 3: Default Rules & Audit Trail

- [X] T018 Seeder: Create `database/seeders/DefaultBankFeedRulesSeeder.php` — static method `seedForWorkspace(Workspace $workspace)`. Bank feed defaults (is_default=true, is_active=true, auto_reconcile=false): XERO→IT & Software (GST), ATO PAYMENT→Tax Payable (BAS), PAYROLL→Wages & Salaries (No GST), STRIPE→Sales Revenue (GST), TELSTRA→Telephone & Internet (GST), QANTAS→Travel (GST). Card category defaults: Restaurants & Dining→Meals & Entertainment (GST), Software & Subscriptions→IT & Software (GST), Travel & Transport→Travel (GST), Office Supplies→Office Supplies (GST). Account matching by code from workspace's chart_accounts. Skip rules where target account code doesn't exist.

- [X] T019 Hook: In workspace creation flow (likely `CreateWorkspace` action or workspace observer), call `DefaultBankFeedRulesSeeder::seedForWorkspace($workspace)` after chart of accounts is seeded.

- [X] T020 Update `app/Actions/Banking/SuggestMatches.php` — after Pass 3 rule match, create `RuleMatch` record with outcome (auto_posted if auto_reconcile=true, suggested otherwise). Update `$rule->last_matched_at = now()` and `$rule->save()`.

---

## Phase 4: Pattern Detection & Suggestions

- [X] T021 Action: Create `app/Actions/Banking/DetectRulePatterns.php` (AsAction) — `handle(int $workspaceId): Collection`. Query `bank_transactions` where reconciliation_status = 'reconciled' and workspace_id matches. Group by normalised description keyword (extract dominant word: strip numbers, take first word ≥4 chars) + `matched_journal_entry_id` → resolve to chart_account_id via journal entry lines. Count occurrences. Filter: count ≥ 3, no existing active rule with same match_value, no existing suggestion with same match_value + account. Return collection of potential suggestions with match_value, target_chart_account_id, target_tax_code (from most common), occurrence_count.

- [X] T022 Controller: Add suggestion endpoints to `BankFeedRuleController` — `suggestions()` (GET: return pending RuleSuggestions for workspace), `acceptSuggestion(RuleSuggestion $suggestion)` (POST: create BankFeedRule from suggestion, set suggestion status=accepted), `dismissSuggestion(RuleSuggestion $suggestion)` (POST: set status=dismissed).

- [X] T023 Routes: Add suggestion routes — `Route::get('bank-feed-rules/suggestions', [BankFeedRuleController::class, 'suggestions'])`, `Route::post('bank-feed-rules/suggestions/{ruleSuggestion}/accept', [BankFeedRuleController::class, 'acceptSuggestion'])`, `Route::post('bank-feed-rules/suggestions/{ruleSuggestion}/dismiss', [BankFeedRuleController::class, 'dismissSuggestion'])`. Note: suggestion routes MUST be registered before the apiResource to avoid route conflicts.

- [X] T024 Resource: Create `app/Http/Resources/RuleSuggestionResource.php` — fields: id, match_value, target_chart_account_id, target_account (nested: id, code, name), target_tax_code, occurrence_count, status, created_at.

- [X] T025 Trigger: In `BankFeedRuleController::index()`, call `DetectRulePatterns::run($workspaceId)` and upsert results into `rule_suggestions` table (update occurrence_count if exists, create if new, skip dismissed). This runs on page load — lightweight query.

---

## Phase 5: Backend Tests

- [X] T026 [P] Test: Create `tests/Feature/Api/BankFeedRuleApiTest.php` — tests: list rules returns ordered by priority, create rule with all match types, update rule changes target account, delete rule, toggle enable/disable flips is_active, reorder updates priorities correctly, test preview returns matching unreconciled transactions, test preview respects amount range filters, bookkeeper can manage rules, client cannot manage rules, auditor cannot manage rules.

- [X] T027 [P] Test: Create `tests/Feature/Api/RuleSuggestionApiTest.php` — tests: suggestions endpoint returns pending suggestions, accept suggestion creates rule + sets status accepted, dismiss suggestion sets status dismissed, pattern detection finds 3+ recurring codings, pattern detection ignores already-ruled patterns.

- [X] T028 [P] Test: Add tests for default rule seeding — new workspace gets default bank feed + card category rules, default rules have is_default=true, default rules are editable/deletable.

---

## Phase 6: Frontend — Hooks & Types

- [X] T029 [P] Types: Add to `frontend/src/types/index.ts` — `BankFeedRule` type: { id: number, name: string, match_field: string, match_type: string, match_value: string, target_chart_account_id: number, target_account: { id: number, code: string, name: string } | null, target_tax_code: string | null, target_contact_id: number | null, auto_reconcile: boolean, is_active: boolean, is_default: boolean, priority: number, last_matched_at: string | null, created_at: string, updated_at: string }. `RuleSuggestion` type: { id: number, match_value: string, target_chart_account_id: number, target_account: { id: number, code: string, name: string }, target_tax_code: string | null, occurrence_count: number, status: string, created_at: string }. `TestRuleMatch` type: { id: number, description: string, amount: number, date: string, merchant_category: string | null }.

- [X] T030 [P] Hook: Create `frontend/src/hooks/use-rules.ts` — exports: `useRules()` (GET /bank-feed-rules, returns { data: BankFeedRule[] }), `useCreateRule()` (POST mutation), `useUpdateRule()` (PATCH mutation), `useDeleteRule()` (DELETE mutation), `useToggleRule()` (PATCH /toggle mutation), `useReorderRules()` (POST /reorder mutation, accepts { rule_ids: number[] }), `useTestRule()` (POST /test mutation, returns { data: TestRuleMatch[] }). All mutations invalidate ['bank-feed-rules'] query key.

- [X] T031 [P] Hook: Create `frontend/src/hooks/use-rule-suggestions.ts` — exports: `useRuleSuggestions()` (GET /bank-feed-rules/suggestions, returns { data: RuleSuggestion[] }), `useAcceptSuggestion()` (POST /suggestions/{id}/accept mutation, invalidates both suggestions + rules), `useDismissSuggestion()` (POST /suggestions/{id}/dismiss mutation, invalidates suggestions).

---

## Phase 7: Frontend — Rules Page & Components

- [X] T032 Page: Create `frontend/src/app/(dashboard)/settings/rules/page.tsx` — page component that renders: page header ("Reconciliation Rules" with subtitle + "New Rule" button), `<RuleSuggestions>` section (if suggestions exist), `<RuleList>` section. Uses `useRules()` and `useRuleSuggestions()` hooks. Manages `isCreating` state to show/hide `<InlineRuleForm>`.

- [X] T033 Navigation: Update `frontend/src/lib/navigation.ts` — add "Reconciliation Rules" link under Settings section, path: `/settings/rules`.

- [X] T034 Component: Create `frontend/src/components/rules/rule-suggestions.tsx` — renders amber-bordered cards per mockup (01-rules-overview.html). Each suggestion shows: "Detected pattern" badge, occurrence count, match description (e.g. "Description contains STRIPE → Sales Revenue GST"), Card badge if card_category. Actions: Accept button (calls useAcceptSuggestion), Edit button (opens InlineRuleForm pre-filled), X dismiss button (calls useDismissSuggestion). Show/hide accept+edit on hover with `opacity-0 group-hover:opacity-100`.

- [X] T035 Component: Create `frontend/src/components/rules/rule-row.tsx` — renders single rule row per mockup. Shows: drag handle (6-dot grip icon), priority number, source badge (Bank blue / Card violet), match description ("contains XERO → IT & Software GST"), auto-post/suggest/disabled/broken status pill, enable/disable toggle (calls useToggleRule), overflow menu (edit, delete) on hover. Broken state: red tint bg, warning icon, "archived" label if target account archived. Disabled state: 50% opacity, toggle off. Default label badge. Stale indicator if last_matched_at > 90 days ago.

- [X] T036 Component: Create `frontend/src/components/rules/rule-list.tsx` — renders the Active Rules section. Uses `@dnd-kit/core` + `@dnd-kit/sortable` for drag-to-reorder. On drag end, calls `useReorderRules` with new ID order. Header shows rule count + "Drag to reorder" hint. Renders `<RuleRow>` for each rule. Footer stats bar: N auto-posting, N suggesting, N broken, N transactions auto-coded this month.

- [X] T037 Component: Create `frontend/src/components/rules/inline-rule-form.tsx` — teal-bordered inline card per mockup (02-inline-create.html). Uses React Hook Form + Zod. Fields: source type select (Bank Feed / Card Transaction), match type select (contains/starts_with/exact/pattern), match value text input (monospace), target account select (from chart_accounts), tax code select (GST/No GST/Input Taxed/BAS Excluded), optional amount range (min/max, collapsible). Auto-post toggle with warning. "Test rule — N matches" link (calls useTestRule, shows count). Cancel + Save buttons. Props: `mode: 'create' | 'edit'`, `defaultValues?: Partial<BankFeedRule>`, `onSave`, `onCancel`.

- [X] T038 Component: Create `frontend/src/components/rules/rule-test-preview.tsx` — expands below InlineRuleForm per mockup (03-test-preview.html). Table with columns: Date, Description (with match keyword highlighted in amber `<mark>`), Amount (red, right-aligned), Would Code To (account name + tax badge). Summary row: total amount, target account. Shows "6 matches" badge in header. Auto-post toggle + Save Rule button in footer.

- [X] T039 Install: Run `cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` for drag-and-drop.

---

## Phase 8: Frontend — Inline Reconciliation Prompt

- [X] T040 Component: Create `frontend/src/components/banking/reconciliation-rule-prompt.tsx` — small inline banner shown after coding a transaction that matches a detected pattern. Shows: "Detected pattern — create a rule for {keyword} → {account}?" with Accept (creates rule via useCreateRule) and Dismiss buttons. Subtle amber/teal styling, slides down with animation.

- [X] T041 Integration: Update the existing banking reconciliation page (likely `frontend/src/app/(dashboard)/banking/reconciliation/page.tsx`) — after a transaction is reconciled, check if a suggestion exists for that description pattern (query suggestions or detect locally). If yes, show `<ReconciliationRulePrompt>` inline below the reconciled transaction.

---

## Phase 9: Polish & Cleanup

- [X] T042 Run `vendor/bin/pint --dirty` to format all new PHP files.
- [X] T043 Run `cd frontend && npx tsc --noEmit` to verify no TypeScript errors in new files.
- [X] T044 Run `php artisan test --compact` to verify all tests pass.
- [X] T045 Update `frontend/src/types/index.ts` exports if any types were missed.
