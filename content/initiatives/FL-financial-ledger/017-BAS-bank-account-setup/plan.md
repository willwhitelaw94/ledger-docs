---
title: "Implementation Plan: Bank Account Setup & Feed Connection"
---

# Implementation Plan: Bank Account Setup & Feed Connection

**Branch**: `017-BAS-bank-account-setup` | **Date**: 2026-03-14 | **Spec**: [spec.md](./spec.md)
**Status**: Ready for Implementation

---

## Summary

The banking infrastructure (models, controller, actions, feed provider abstraction) was built in epic 004-BFR. This epic adds the missing frontend pages and the few backend gaps that stand between existing plumbing and a fully working end-to-end user flow:

1. **Account creation with opening balance** — the form exists at `/banking/new` but the backend doesn't yet handle `opening_balance`/`opening_balance_date`, validate BSB+account_number uniqueness, or create the opening balance journal entry.
2. **Basiq OAuth callback page** — `/banking/feeds/callback` doesn't exist; Basiq redirects users here after consent.
3. **Account detail page** — `/banking/[id]` doesn't exist; users need a place to see feed status and manage the connection.
4. **Post-creation UX** — after creating an account the user is dumped to `/banking`; they should land on the account detail page where feed connection is offered.
5. **`feed_status` in API resource** — `BankAccountResource` exposes `provider` but not the higher-level `feed_status` ('live'|'manual'|'disconnected') that the frontend needs.

---

## Technical Context

### Technology Stack
- **Backend**: Laravel 12, PHP 8.4, Lorisleiva Actions, Spatie Laravel Data (where applicable)
- **Frontend**: Next.js 16, React 19, TypeScript, TanStack Query v5, React Hook Form + Zod
- **Database**: SQLite (local dev) — existing `bank_accounts` table, no new migrations needed
- **Auth**: Sanctum + `SetWorkspaceContext` middleware

### Existing Infrastructure (004-BFR, already built)

| File | Purpose |
|------|---------|
| `app/Models/Tenant/BankAccount.php` | Model with all fields |
| `app/Http/Controllers/Api/BankAccountController.php` | store, show, index, connectFeed, connectFeedCallback, disconnectFeed, syncFeed |
| `app/Actions/Banking/ConnectBankFeed.php` | Returns Basiq consent URL |
| `app/Actions/Banking/CompleteConnection.php` | Completes OAuth, updates account |
| `app/Actions/Banking/DisconnectBankFeed.php` | Disconnects feed |
| `app/Http/Requests/Banking/StoreBankAccountRequest.php` | Validates creation fields |
| `app/Http/Resources/BankAccountResource.php` | API response |
| `frontend/src/app/(dashboard)/banking/new/page.tsx` | Add account form (complete) |
| `frontend/src/app/(dashboard)/banking/feeds/page.tsx` | Feed status list + CSV import |
| `frontend/src/hooks/use-banking.ts` | TanStack Query hooks (no feed management hooks yet) |

### Dependencies
- Opening balance JE: requires `JournalEntryAggregate` (from 002-CLE) and the "Opening Balances" equity account auto-creation pattern used in other ledger operations
- Feed connection: requires `BankFeedProviderInterface` binding (Basiq in prod, Fake in tests) — already wired in `AppServiceProvider`

### Constraints
- **No new migrations required** — the `bank_accounts` table has all needed columns. Opening balance is handled by creating a JE; `current_balance` stores the resulting balance.
- **Opening balance JE** must post: debit the linked chart account, credit the workspace's "Opening Balances" equity account (auto-created if absent, same pattern as existing JE code)
- **Basiq callback URL** pattern: `{frontend_url}/banking/feeds/callback?account_id={id}&authorization_code={code}` for success, or `?error={message}` for failure
- **Authorization**: feed connection actions restricted to bookkeeper and above (`banking.manage` permission in Spatie Permission)

---

## Pre-Check Notes (Gate 3 Input Validation)

| Area | Finding | Status |
|------|---------|--------|
| Opening balance JE creation | Controller currently does bare `BankAccount::create()` — business logic needed. Wrap in `CreateBankAccount` action. | Address in plan |
| BSB + account_number uniqueness | `StoreBankAccountRequest` has no uniqueness check. Spec requires it (FR-003). | Address in plan |
| `feed_status` computation | `BankAccountResource` returns raw `provider` field. Frontend feeds page already expects `feed_status`. | Address in plan |
| Feed management hooks | `use-banking.ts` has no `useConnectFeed`/`useDisconnectFeed` hooks despite feed controller endpoints existing. | Address in plan |
| Callback page missing | `/banking/feeds/callback` does not exist. Basiq redirects here. | Address in plan |
| Account detail page missing | No `/banking/[id]` page exists — required for US4. | Address in plan |

No red flags — all issues are well-understood additions within existing patterns.

---

## Data Model

No new tables or migrations. The `bank_accounts` table already has all required columns:

| Column | Usage |
|--------|-------|
| `provider` | `'manual'` (no feed) or `'basiq'` (connected) |
| `provider_account_id` | Basiq account UUID when connected |
| `provider_meta` | JSON blob from Basiq (consent_id, etc.) |
| `last_synced_at` | Feed last successful sync timestamp |
| `current_balance` | Running balance in cents (updated after sync) |

**`feed_status` computed field** (added to `BankAccountResource`):
- `'live'` — `provider === 'basiq'` AND `provider_account_id` is not null
- `'disconnected'` — `provider === 'basiq'` AND `provider_account_id` is null (partial/broken state)
- `'manual'` — `provider === 'manual'` or null

### Opening Balance Journal Entry

When `opening_balance` is provided on account creation:
- **Debit**: linked `chart_account_id` for `opening_balance` cents
- **Credit**: workspace "Opening Balances" equity account (code `3-900`, auto-created via `EnsureOpeningBalancesAccount` helper if absent)
- JE description: `"Opening balance — {account_name}"`
- JE date: `opening_balance_date` (defaults to today if omitted)
- `current_balance` set to `opening_balance` cents on the new BankAccount

---

## API Contracts

All endpoints already exist. Changes are additions only:

### `POST /api/v1/bank-accounts` (updated)

Added request fields:
```json
{
  "chart_account_id": 42,
  "account_name": "ANZ Business Cheque",
  "account_number_masked": "1234",
  "bsb": "012-345",
  "institution": "AU00000",
  "currency": "AUD",
  "opening_balance": 250000,
  "opening_balance_date": "2026-03-14"
}
```

Added validation:
- `opening_balance`: nullable integer (cents), min 0
- `opening_balance_date`: nullable date, not in future
- BSB + `account_number_masked` must be unique within workspace (via `after()` hook)

Response: `BankAccountResource` (unchanged shape, `feed_status` field added)

### `GET /api/v1/bank-accounts/{id}` (updated response)

`BankAccountResource` now includes:
```json
{
  "id": 1,
  "account_name": "ANZ Business Cheque",
  "feed_status": "live",
  "last_synced_at": "2026-03-14T10:00:00+00:00",
  "provider": "basiq",
  ...
}
```

### Frontend callback URL shape (Basiq → Next.js)

Success: `GET /banking/feeds/callback?account_id=1&authorization_code=abc123`
Failure: `GET /banking/feeds/callback?account_id=1&error=access_denied`

The callback page calls `POST /api/v1/bank-accounts/{account_id}/connect/callback` with `{ authorization_code }` on success.

---

## UI Components

### New pages

| Page | Path | Purpose |
|------|------|---------|
| Account Detail | `/banking/[id]/page.tsx` | Feed status, balance, manage connect/disconnect |
| Callback | `/banking/feeds/callback/page.tsx` | Basiq OAuth return handler |

### Updated pages

| Page | Change |
|------|--------|
| `/banking/new/page.tsx` | Redirect to `/banking/{id}` after creation (not `/banking`) |

### Component structure for Account Detail (`/banking/[id]`)

```
AccountDetailPage
├── PageContainer (title = account_name, breadcrumbs)
├── AccountHeaderCard — balance, institution, feed_status badge
├── FeedConnectionCard — Connect/Disconnect/Reconnect actions
│   ├── FeedConnectedState — last_synced_at, institution name, "Disconnect" button
│   ├── FeedDisconnectedState — warning, "Reconnect" button
│   └── FeedManualState — "Connect bank feed" button → calls connectFeed API
└── (Future: transaction list, notes)
```

---

## Implementation Phases

### Phase 1: Backend — Opening Balance & Resource Updates

**Goal**: Complete the `POST /bank-accounts` contract and improve the resource.

Tasks:
1. **`StoreBankAccountRequest`** — add `opening_balance` (nullable integer), `opening_balance_date` (nullable date), BSB+account_number uniqueness check via `after()` hook
2. **`CreateBankAccount` action** (`app/Actions/Banking/CreateBankAccount.php`) — Lorisleiva action that:
   - Creates `BankAccount` with validated fields
   - If `opening_balance` provided: calls `EnsureOpeningBalancesAccount::run($workspace)` to get/create the Opening Balances equity account, then creates a JE (debit linked account, credit opening balances account) via `JournalEntryAggregate`
   - Sets `current_balance` to `opening_balance` cents
   - Wraps in `DB::transaction()`
3. **`BankAccountController::store()`** — delegate to `CreateBankAccount::run()`
4. **`BankAccountResource`** — add `feed_status` computed field

### Phase 2: Frontend — Account Detail & Callback Pages

**Goal**: Complete US2, US3, US4 frontend flows.

Tasks:
1. **`BankAccount` type** (`frontend/src/types/index.ts`) — add `feed_status: 'live' | 'manual' | 'disconnected' | null` and `created_at: string`
2. **Feed hooks** (`frontend/src/hooks/use-banking.ts`) — add `useConnectFeed`, `useDisconnectFeed`, `useCompleteFeedConnection`
3. **`/banking/feeds/callback/page.tsx`** (new) — Reads `account_id`, `authorization_code`, `error` from `useSearchParams`. On load, if `authorization_code` present, calls `useCompleteFeedConnection`. Shows animated success/failure state with links back to Banking. Handles loading state during API call.
4. **`/banking/[id]/page.tsx`** (new) — Account detail page. Uses `useBankAccount(id)`. Renders account header + feed management card. Feed management card shows appropriate state (connected/disconnected/manual) based on `feed_status`. Connect action calls `useConnectFeed` → redirects user to Basiq consent URL. Disconnect shows confirmation before calling `useDisconnectFeed`.
5. **`/banking/new/page.tsx`** — Update `onSubmit` to redirect to `/banking/{newAccount.id}` instead of `/banking`

### Phase 3: Tests & Polish

Tasks:
1. **`BankAccountApiTest`** (Pest feature test) — covers:
   - Account creation with valid fields returns 201
   - Duplicate BSB+account_number returns 422 with validation error
   - Opening balance creates JE (debit chart account, credit Opening Balances equity)
   - `feed_status` is `'manual'` on a freshly created account
   - `feed_status` is `'live'` after `CompleteConnection` runs
2. **`vendor/bin/pint --dirty`** on all modified PHP files

---

## Testing Strategy

**Feature Tests** (`tests/Feature/Api/BankAccountApiTest.php`):

```php
it('creates a bank account with opening balance journal entry')
it('rejects duplicate bsb and account number in same workspace')
it('returns feed_status manual for a new account')
it('returns feed_status live after completing feed connection')
it('denies client role from creating bank accounts')
```

**Test Setup**: `RolesAndPermissionsSeeder`, owner user, workspace with `EnsureOpeningBalancesAccount` seeded or auto-created by action.

---

## Gate 3 Architecture Check

### 1. Technical Feasibility
| Check | Status |
|-------|--------|
| Architecture approach clear | ✅ All changes are additions to existing patterns |
| Existing patterns leveraged | ✅ Lorisleiva Actions, Form Requests, API Resources, TanStack Query |
| No impossible requirements | ✅ All items are buildable with current stack |
| Performance considered | ✅ Opening balance JE is a single DB transaction, no N+1 risk |
| Security considered | ✅ Authorization follows existing policy pattern; account_number_masked (last 4 only) |

### 2. Data & Integration
| Check | Status |
|-------|--------|
| Data model understood | ✅ No new migrations; all columns exist |
| API contracts clear | ✅ Defined above |
| Dependencies identified | ✅ JournalEntryAggregate, BankFeedProviderInterface, EnsureOpeningBalancesAccount |
| Integration points mapped | ✅ feed provider abstraction already wired |
| DTO persistence explicit | ✅ Actions handle creation; no toArray() anti-pattern |

### 3. Implementation Approach
| Check | Status |
|-------|--------|
| File changes identified | ✅ Listed in phases above |
| Risk areas noted | ✅ Opening balance JE must be atomic with account creation |
| Testing approach defined | ✅ Pest feature tests specified |
| Rollback possible | ✅ No migrations; code-only changes |

### 4. Resource & Scope
| Check | Status |
|-------|--------|
| Scope matches spec | ✅ Exactly the 4 user stories |
| Effort reasonable | ✅ ~3 backend files + 2 new frontend pages |

### 5. Laravel Best Practices
| Check | Status |
|-------|--------|
| Use Lorisleiva Actions | ✅ `CreateBankAccount` with AsAction |
| Action authorization in authorize() | ✅ Delegated via Form Request |
| Migrations schema-only | ✅ No new migrations |
| Granular model policies | ✅ Existing `BankAccountPolicy` handles all abilities |

### 6. Next.js/React Frontend Standards (CLAUDE.md overrides)
| Check | Status |
|-------|--------|
| All components use TypeScript | ✅ All `.tsx` with strict types |
| No `any` types | ✅ All API responses typed via `BankAccount` interface |
| TanStack Query for server state | ✅ All data via hooks |
| Forms use React Hook Form + Zod | ✅ Only `/banking/new` has a form; already uses RHF+Zod |
| Server vs client components | ✅ New pages use `'use client'` |

**Gate 3 Result: PASS** ✅

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Opening balance JE fails after account created | Low | High | Wrap both in `DB::transaction()`; account creation rolls back if JE fails |
| Basiq callback race (user lands before account saved) | Very Low | Low | Account is created before redirect to Basiq; callback just updates provider_meta |
| "Opening Balances" equity account doesn't exist | Low | Medium | `EnsureOpeningBalancesAccount` action auto-creates it (pattern used elsewhere) |

---

## Next Steps

1. Run `/speckit-tasks 017-BAS` to generate implementation tasks
2. Run `/speckit-implement 017-BAS` to execute
