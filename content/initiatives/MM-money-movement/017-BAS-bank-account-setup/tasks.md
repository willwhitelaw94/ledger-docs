---
title: "Implementation Tasks: Bank Account Setup & Feed Connection"
---

# Implementation Tasks: Bank Account Setup & Feed Connection

**Epic**: 017-BAS-bank-account-setup
**Mode**: AI
**Generated**: 2026-03-14

---

## Phase 1: Backend Foundation

- [X] T001 [US1] Update `StoreBankAccountRequest` — add validation rules: `opening_balance` (nullable, integer, min:0), `opening_balance_date` (nullable, date, not_after:today); add `after()` hook that checks uniqueness of `bsb` + `account_number_masked` combination within the workspace (query `BankAccount::where('workspace_id', ...)->where('bsb', ...)->where('account_number_masked', ...)->exists()`, add `$validator->errors()->add('account_number_masked', 'An account with this BSB and account number already exists.')` if true). File: `app/Http/Requests/Banking/StoreBankAccountRequest.php`

- [X] T002 [US1] Create `CreateBankAccount` action — `use AsAction`, `handle(array $validated, int $workspaceId, int $userId): BankAccount`. Inside `DB::transaction()`: (1) create `BankAccount::create([...fields from $validated, 'workspace_id' => $workspaceId, 'provider' => 'manual', 'current_balance' => $validated['opening_balance'] ?? 0])`. (2) If `opening_balance` > 0: get/create Opening Balances equity account via `ChartAccount::firstOrCreate(['workspace_id' => $workspaceId, 'code' => '3-900'], ['name' => 'Opening Balances', 'type' => 'equity', 'is_system' => true, 'workspace_id' => $workspaceId])`, then create a `JournalEntry` with two lines: debit `chart_account_id` for `opening_balance` cents + credit `3-900` account for `opening_balance` cents, status `posted`, entry_date = `opening_balance_date ?? today()`, description = `"Opening balance — {$account->account_name}"`. Return the `BankAccount`. File: `app/Actions/Banking/CreateBankAccount.php`

- [X] T003 [US1] Update `BankAccountController::store()` — replace the bare `BankAccount::create($validated)` block with `CreateBankAccount::run($request->validated(), $request->integer('workspace_id'), $request->user()->id)`. Add `use App\Actions\Banking\CreateBankAccount;` import. File: `app/Http/Controllers/Api/BankAccountController.php`

- [X] T004 [P] [US1] Update `BankAccountResource::toArray()` — add `'feed_status' => $this->computeFeedStatus()` to the returned array. Add private method `computeFeedStatus(): string` that returns: `'live'` if `$this->provider === 'basiq' && $this->provider_account_id !== null`, `'disconnected'` if `$this->provider === 'basiq' && $this->provider_account_id === null`, `'manual'` otherwise. File: `app/Http/Resources/BankAccountResource.php`

---

## Phase 2: Backend Tests

- [X] T005 [US1] Create `tests/Feature/Api/BankAccountApiTest.php` (Pest) with `uses(RefreshDatabase::class)`. `beforeEach`: seed `RolesAndPermissionsSeeder`, create user+org+workspace, attach user as owner with `setPermissionsTeamId`, set `$this->wsHeaders`. Tests:
  - `it('creates a bank account and returns 201')` — POST `/api/v1/bank-accounts` with valid payload (no opening balance), assert 201, assert `feed_status === 'manual'`
  - `it('creates opening balance journal entry when opening_balance provided')` — POST with `opening_balance: 50000, opening_balance_date: today()`, assert `JournalEntry::where('description', 'like', 'Opening balance%')->exists()` is true, assert BankAccount `current_balance === 50000`
  - `it('rejects duplicate bsb and account number in same workspace')` — create first account, POST second with same bsb+account_number_masked, assert 422 with `errors.account_number_masked`
  - `it('returns feed_status live after completing feed connection')` — create account, update it directly with `provider='basiq', provider_account_id='fake-id'`, GET `/api/v1/bank-accounts/{id}`, assert `data.feed_status === 'live'`
  - `it('denies client role from creating bank accounts')` — create client user, POST, assert 403
  File: `tests/Feature/Api/BankAccountApiTest.php`

---

## Phase 3: Frontend Types & Hooks

- [X] T006 [P] [US1] Update `BankAccount` interface in `frontend/src/types/index.ts` — add `feed_status: 'live' | 'manual' | 'disconnected' | null` and `created_at?: string`. File: `frontend/src/types/index.ts`

- [X] T007 [P] [US2] Add feed management hooks to `frontend/src/hooks/use-banking.ts`:
  - `useConnectFeed(accountId: number)`: mutation that calls `POST /api/v1/bank-accounts/{accountId}/connect` with `{ callback_url: string }`, returns `{ consent_url: string }`. On success does NOT invalidate — caller redirects to `consent_url`.
  - `useCompleteFeedConnection(accountId: number)`: mutation that calls `POST /api/v1/bank-accounts/{accountId}/connect/callback` with `{ authorization_code: string }`, on success invalidates `bankKeys.accounts()` and `bankKeys.account(accountId)`.
  - `useDisconnectFeed(accountId: number)`: mutation that calls `POST /api/v1/bank-accounts/{accountId}/disconnect`, on success invalidates `bankKeys.accounts()` and `bankKeys.account(accountId)`.
  File: `frontend/src/hooks/use-banking.ts`

---

## Phase 4: Frontend Pages

- [X] T008 [US2] [US3] Create `/banking/feeds/callback/page.tsx` — `'use client'`, reads `account_id`, `authorization_code`, `error` from `useSearchParams()`. On mount (useEffect), if `authorization_code` and `account_id` are present: call `useCompleteFeedConnection(Number(account_id)).mutate({ authorization_code })`. Render three states:
  - **Loading** (`isPending`): spinner + "Connecting your bank feed…"
  - **Success** (`isSuccess`): `CheckCircle2` icon (emerald), "Bank feed connected!" heading, "Your account is now syncing transactions automatically." subtext, Link to `/banking`
  - **Error** (`isError` or `error` param present): `XCircle` icon (red), "Connection failed" heading, error message or "Something went wrong. Please try again.", buttons for "Try again" (Link to `/banking/new`) and "Skip for now" (Link to `/banking`)
  - **Initial/no-params**: redirect to `/banking` via `useRouter().replace('/banking')`
  File: `frontend/src/app/(dashboard)/banking/feeds/callback/page.tsx`

- [X] T009 [US4] Create `/banking/[id]/page.tsx` — `'use client'`, reads `params.id`, calls `useBankAccount(Number(params.id))`. Layout uses `PageContainer` with title = `account.account_name`, breadcrumbs `[{label:'Banking',href:'/banking'},{label:account.account_name}]`. Renders:
  - **Account header card** (`rounded-xl border bg-card p-5`): left side shows balance (`formatMoney(account.current_balance)`) + currency badge + institution name; right side shows `feed_status` badge ('Live feed' emerald / 'Manual' muted / 'Disconnected' red). Shows `last_synced_at` formatted as "Last synced {date}" when `feed_status === 'live'`.
  - **Feed connection card** (`rounded-xl border bg-card`): renders one of three sub-states based on `account.feed_status`:
    - `'live'`: `Wifi` icon (emerald), "Live feed connected", last sync date, "Disconnect feed" button (calls `useDisconnectFeed`, shows confirm dialog via `window.confirm` — acceptable here since it's just a quick MVP)
    - `'disconnected'`: `WifiOff` icon (red), "Feed disconnected" warning, "Reconnect" button
    - `'manual'` (default): `WifiOff` icon (muted), "No bank feed connected", "Connect bank feed" button → calls `useConnectFeed`, on success redirects to `consent_url` via `window.location.href = consent_url`; pass `callback_url = window.location.origin + '/banking/feeds/callback?account_id=' + account.id`
  - **Back link**: `<Link href="/banking">← All accounts</Link>` at bottom
  File: `frontend/src/app/(dashboard)/banking/[id]/page.tsx`

- [X] T010 [US1] [US3] Update `/banking/new/page.tsx` — in `onSubmit`, change `router.push("/banking")` to `router.push(\`/banking/${newAccount.id}\`)`. The `createBankAccount.mutateAsync()` return value is already `data.data` (BankAccount) from the hook — capture it: `const newAccount = await createBankAccount.mutateAsync({...})`. File: `frontend/src/app/(dashboard)/banking/new/page.tsx`

---

## Phase 5: Polish & Pint

- [X] T011 [P] Run `vendor/bin/pint --dirty` on all modified PHP files and fix any style violations. Files: `app/Actions/Banking/CreateBankAccount.php`, `app/Http/Requests/Banking/StoreBankAccountRequest.php`, `app/Http/Controllers/Api/BankAccountController.php`, `app/Http/Resources/BankAccountResource.php`, `tests/Feature/Api/BankAccountApiTest.php`

- [X] T012 [P] Run `php artisan test --filter=BankAccountApiTest` and confirm all 5 tests pass.
