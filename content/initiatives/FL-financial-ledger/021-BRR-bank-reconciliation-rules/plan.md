---
title: "Implementation Plan: Bank Reconciliation Rules"
---

# Implementation Plan: Bank Reconciliation Rules

**Epic**: 021-BRR | **Date**: 2026-03-14 | **Spec**: [spec.md](./spec.md)

## Summary

Build a frontend Rules management page and extend the existing backend `bank_feed_rules` infrastructure (from 004-BFR) with: rule CRUD UI, inline rule creation, test/preview, drag-to-reorder priority, default rule seeding, card category (MCC) match type, pattern-based rule suggestions, and inline reconciliation prompts. The backend rules engine, model, matching logic, and basic API already exist — this epic is primarily frontend + backend extensions.

## Technical Context

**Backend**: Laravel 12, PHP 8.4, Pest testing
**Frontend**: Next.js 16, React 19, TypeScript, TanStack Query v5, shadcn/ui
**Database**: SQLite (local), amounts as integers (cents)
**Auth**: Sanctum cookie SPA auth, Spatie Permission (teams mode)
**Existing Infrastructure**: `bank_feed_rules` table, `BankFeedRule` model, `SuggestMatches` action (3-pass matching), basic CRUD API on `BankAccountController`

### What Already Exists (004-BFR)

| Component | Location | Status |
|-----------|----------|--------|
| `bank_feed_rules` migration | `database/migrations/2026_03_01_100003_create_bank_tables.php` | Complete |
| `BankFeedRule` model | `app/Models/Tenant/BankFeedRule.php` | Complete — has `matches()` method |
| `SuggestMatches` action | `app/Actions/Banking/SuggestMatches.php` | Complete — 3-pass matching with rule evaluation |
| Basic CRUD API | `BankAccountController` (index/store/destroy) | Partial — no update, no reorder, no test preview |
| `StoreBankFeedRuleRequest` | `app/Http/Requests/Banking/` | Complete |
| `BankFeedRuleData` DTO | `app/Data/BankFeedRuleData.php` | Complete |
| `BankAccountPolicy` | `app/Policies/BankAccountPolicy.php` | Complete — `manageRules()` requires `banking.manage` |
| Permissions | `RolesAndPermissionsSeeder` | Partial — `banking.manage` is owner+accountant only |

### What Needs Building

| Component | Type | Effort |
|-----------|------|--------|
| Rules management page (frontend) | New | Large |
| Inline rule create/edit (frontend) | New | Medium |
| Rule test/preview endpoint + UI | New | Medium |
| Drag-to-reorder priority (frontend + API) | New | Small |
| Enable/disable toggle (API + UI) | Extend | Small |
| Card category (MCC) match type | Extend model + migration | Small |
| Default rule seeder | New seeder | Small |
| `last_matched_at` + stale detection | Migration + UI | Small |
| Pattern-based rule suggestions | New action + API + UI | Medium |
| Inline reconciliation suggestion prompt | Frontend extension | Medium |
| Permission update (add bookkeeper) | Seeder update | Tiny |

## Design Decisions

### Data Model Extensions

**Extend `bank_feed_rules` table** (new migration):

```
add columns:
  - match_field: add 'card_category' to existing enum (description|merchant_name|reference|amount|card_category)
  - is_default: boolean, default false (marks seeded default rules)
  - last_matched_at: timestamp, nullable (tracks rule freshness)
  - dismissed_suggestion: boolean, default false (for suggested rules the user dismissed)
```

**New table: `rule_matches`** (audit trail):

```
rule_matches:
  - id: bigint PK
  - workspace_id: FK workspaces
  - bank_feed_rule_id: FK bank_feed_rules
  - bank_transaction_id: FK bank_transactions
  - outcome: enum (auto_posted|suggested|ignored)
  - created_at: timestamp
  - index: (workspace_id, bank_feed_rule_id)
```

**New table: `rule_suggestions`** (pattern detection cache):

```
rule_suggestions:
  - id: bigint PK
  - workspace_id: FK workspaces
  - match_value: string (detected keyword pattern)
  - target_chart_account_id: FK chart_accounts
  - target_tax_code: string, nullable
  - occurrence_count: unsigned int
  - status: enum (pending|accepted|dismissed)
  - created_at, updated_at: timestamps
  - unique: (workspace_id, match_value, target_chart_account_id)
```

### API Contracts

**Rules CRUD** (extend existing `BankAccountController` or new `BankFeedRuleController`):

| Method | Endpoint | Purpose | FR |
|--------|----------|---------|-----|
| GET | `/api/v1/bank-feed-rules` | List all rules (ordered by priority) | FR-001 |
| POST | `/api/v1/bank-feed-rules` | Create rule | FR-002 |
| PATCH | `/api/v1/bank-feed-rules/{id}` | Update rule | FR-006 |
| DELETE | `/api/v1/bank-feed-rules/{id}` | Delete rule | FR-007 |
| PATCH | `/api/v1/bank-feed-rules/{id}/toggle` | Enable/disable | FR-008 |
| POST | `/api/v1/bank-feed-rules/reorder` | Batch reorder priorities | FR-009 |
| POST | `/api/v1/bank-feed-rules/test` | Test rule against unreconciled txns | FR-010–012 |

**Suggestions**:

| Method | Endpoint | Purpose | FR |
|--------|----------|---------|-----|
| GET | `/api/v1/bank-feed-rules/suggestions` | Get pending suggestions | FR-027–028 |
| POST | `/api/v1/bank-feed-rules/suggestions/{id}/accept` | Accept suggestion → create rule | FR-028 |
| POST | `/api/v1/bank-feed-rules/suggestions/{id}/dismiss` | Dismiss suggestion | FR-028 |

### UI Components (Next.js)

| Component | Location | Purpose |
|-----------|----------|---------|
| `RulesPage` | `frontend/src/app/(dashboard)/settings/rules/page.tsx` | Main rules management page |
| `RuleSuggestions` | `frontend/src/components/rules/rule-suggestions.tsx` | Suggested rules section (amber cards) |
| `RuleList` | `frontend/src/components/rules/rule-list.tsx` | Draggable rules list with inline editing |
| `RuleRow` | `frontend/src/components/rules/rule-row.tsx` | Single rule row with toggle, badges, actions |
| `InlineRuleForm` | `frontend/src/components/rules/inline-rule-form.tsx` | Inline create/edit form |
| `RuleTestPreview` | `frontend/src/components/rules/rule-test-preview.tsx` | Test results table with match highlighting |
| `ReconciliationRulePrompt` | `frontend/src/components/banking/reconciliation-rule-prompt.tsx` | Inline prompt during reconciliation |
| `use-rules.ts` | `frontend/src/hooks/use-rules.ts` | TanStack Query hooks for rules CRUD |
| `use-rule-suggestions.ts` | `frontend/src/hooks/use-rule-suggestions.ts` | TanStack Query hooks for suggestions |

### Permission Update

Current: `banking.manage` → owner, accountant only
Required: Add `bookkeeper` to `banking.manage` permission (per clarification Q5)

## Implementation Phases

### Phase 1: Backend Extensions (Foundation)

**Goal**: Complete backend API for full rules CRUD, test preview, and permission update.

1. **Migration**: Add `is_default`, `last_matched_at`, `card_category` match field to `bank_feed_rules`
2. **Migration**: Create `rule_matches` table
3. **Migration**: Create `rule_suggestions` table
4. **Controller**: Create dedicated `BankFeedRuleController` with full CRUD + toggle + reorder + test
5. **Action**: `TestRule` — accepts match criteria, queries unreconciled transactions from last 90 days, returns matches
6. **Action**: `ReorderRules` — accepts ordered array of rule IDs, updates priority column
7. **Form Requests**: `UpdateBankFeedRuleRequest`, `ReorderRulesRequest`, `TestRuleRequest`
8. **Resource**: `BankFeedRuleResource` (extend or replace existing)
9. **Permission**: Update `RolesAndPermissionsSeeder` — add bookkeeper to `banking.manage`
10. **Model**: Update `BankFeedRule` — add `card_category` to `matches()` method
11. **Tests**: Full CRUD tests, reorder tests, test preview tests, permission tests

### Phase 2: Default Rules & Rule Matching Audit Trail

**Goal**: Seed default rules for new workspaces, track rule matches.

1. **Seeder**: `DefaultBankFeedRulesSeeder` — AU defaults (XERO→IT, ATO→Tax, PAYROLL→Wages, STRIPE→Sales, etc.)
2. **Seeder**: Default card category rules (Restaurants→Meals, Software→IT, Travel→Travel, etc.)
3. **Hook**: Call seeder when workspace is created (or on first Rules page visit)
4. **Update `SuggestMatches`**: After rule match, write to `rule_matches` table + update `last_matched_at`
5. **Tests**: Default seeding, audit trail recording

### Phase 3: Pattern Detection & Suggestions

**Goal**: Detect reconciliation patterns and suggest rules.

1. **Action**: `DetectRulePatterns` — queries reconciled transactions, groups by normalised description + target account, finds patterns with 3+ occurrences that don't already have rules
2. **Model**: `RuleSuggestion` with workspace scope
3. **Trigger**: Run `DetectRulePatterns` after each reconciliation batch (or on Rules page load)
4. **API**: Suggestions endpoints (list, accept, dismiss)
5. **Tests**: Pattern detection accuracy, suggestion lifecycle

### Phase 4: Frontend — Rules Page

**Goal**: Build the rules management page per mockups.

1. **Page**: `/settings/rules` route + page component
2. **Navigation**: Add "Reconciliation Rules" to settings nav
3. **Hooks**: `use-rules.ts` (CRUD, reorder, toggle, test), `use-rule-suggestions.ts`
4. **Components**: `RuleSuggestions`, `RuleList`, `RuleRow`, `InlineRuleForm`
5. **Drag-to-reorder**: Use `@dnd-kit/sortable` for priority reordering
6. **Rule test preview**: `RuleTestPreview` component with match highlighting
7. **States**: Empty state, loading, broken rule indicator, stale rule indicator, disabled rule styling

### Phase 5: Frontend — Inline Reconciliation Prompt

**Goal**: Prompt rule creation during reconciliation flow.

1. **Component**: `ReconciliationRulePrompt` — shows when coding a transaction that matches a detected pattern
2. **Integration**: Hook into existing reconciliation page to check for patterns after coding
3. **Quick-create**: One-click creates the rule from the prompt without navigating away

## Testing Strategy

### Phase 1 Tests (Backend)

- **Feature**: Rules CRUD (create, read, update, delete, toggle, reorder)
- **Feature**: Test preview endpoint returns correct matches
- **Feature**: Permission tests — bookkeeper can manage rules, client cannot
- **Unit**: `BankFeedRule::matches()` with card_category match type
- **Unit**: `TestRule` action with various match types and amount ranges

### Phase 2 Tests

- **Feature**: Default rules seeded on workspace creation
- **Feature**: `rule_matches` records created during SuggestMatches
- **Unit**: `last_matched_at` updated on rule match

### Phase 3 Tests

- **Feature**: Pattern detection finds correct suggestions
- **Feature**: Accept suggestion creates rule, dismiss hides it
- **Unit**: `DetectRulePatterns` with various transaction patterns

### Phase 4–5 Tests

- **Browser**: Rules page loads with suggestions + active rules
- **Browser**: Inline create form → save → rule appears in list
- **Browser**: Test preview shows matching transactions
- **Browser**: Drag reorder updates priority

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Broad rules auto-posting incorrectly | Medium | High | Test preview is P1, auto-post requires explicit opt-in with warning |
| Pattern detection generates noisy suggestions | Low | Low | 3+ threshold, easy dismiss, suggestions are non-blocking |
| Performance with many rules per workspace | Low | Low | Rules are simple string checks, indexed by workspace + priority |
| Card category match type depends on 020-VCA | Medium | Low | Card rules are P2, can ship bank feed rules first |

## Next Steps

1. Run `/speckit-tasks` to generate implementation tasks from this plan
2. Start with Phase 1 (backend extensions) — most value, unblocks frontend
