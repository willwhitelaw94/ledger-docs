---
title: "Implementation Plan: Subscription & Recurring Payment Tracker (P1 Backend)"
---

# Implementation Plan: Subscription & Recurring Payment Tracker (P1 Backend)

**Branch**: `067-subscription-tracker` | **Date**: 2026-03-22 | **Spec**: [spec.md](./spec.md)
**Scope**: Phase 1 backend only -- US1 (detection), US2 (registry), US3 (dashboard data), US4 (price change alerts)

---

## Summary

Build a subscription detection engine that analyses bank transactions to identify recurring payment patterns, a registry to store confirmed subscriptions, API endpoints for dashboard spending data, and a price change alert system. All amounts stored as integer cents. Debit-only detection. Backend only -- no frontend components in this phase.

---

## Technical Context

**Language/Version**: PHP 8.4 / Laravel 12
**Primary Dependencies**: Lorisleiva Actions, Spatie Laravel Data, Laravel Pennant (feature flags), Pest v4
**Storage**: PostgreSQL (single-database multi-tenancy with `workspace_id` scoping)
**Testing**: Pest (`php artisan test --compact`)
**Performance Goals**: Detection of 10,000 transactions within 30 seconds; incremental scans under 5 seconds per account
**Constraints**: All monetary amounts as integers (cents); workspace-scoped data isolation; no cross-tenant leakage

---

## Project Structure

### New Files

```text
app/
├── Actions/Subscriptions/
│   ├── DetectSubscriptions.php           # Full + incremental detection orchestrator
│   ├── ConfirmSubscription.php           # Confirm a detection -> create Subscription
│   ├── DismissDetection.php              # Dismiss a detection for a merchant
│   ├── CreateSubscription.php            # Manual subscription creation
│   ├── UpdateSubscription.php            # Edit subscription fields
│   ├── CancelSubscription.php            # Active/Paused -> Cancelled transition
│   ├── PauseSubscription.php             # Active -> Paused
│   ├── ResumeSubscription.php            # Paused -> Active
│   └── DetectPriceChanges.php            # Compare new txn amount to expected
├── Console/Commands/
│   └── DetectSubscriptionsCommand.php    # subscriptions:detect artisan command
├── Enums/
│   ├── SubscriptionStatus.php
│   ├── SubscriptionFrequency.php
│   ├── DetectionConfidence.php
│   ├── DetectionDecision.php
│   ├── SubscriptionAlertType.php
│   ├── SubscriptionAlertSeverity.php
│   ├── SubscriptionAlertStatus.php
│   └── SubscriptionCreationSource.php
├── Http/
│   ├── Controllers/Api/
│   │   └── SubscriptionController.php
│   ├── Requests/Subscriptions/
│   │   ├── StoreSubscriptionRequest.php
│   │   └── UpdateSubscriptionRequest.php
│   └── Resources/Subscriptions/
│       ├── SubscriptionResource.php
│       ├── SubscriptionDetectionResource.php
│       ├── SubscriptionAlertResource.php
│       └── SubscriptionCategoryResource.php
├── Models/Tenant/
│   ├── Subscription.php
│   ├── SubscriptionBankTransaction.php   # Pivot model
│   ├── SubscriptionDetection.php
│   ├── SubscriptionCategory.php
│   ├── SubscriptionStatusChange.php
│   ├── SubscriptionAlert.php
│   └── MerchantProfile.php              # System-level (no workspace_id)
├── Policies/
│   └── SubscriptionPolicy.php
├── Services/
│   ├── SubscriptionDetectionEngine.php   # Pattern matching, frequency detection
│   └── MerchantNormalizer.php            # Fuzzy name matching, canonical resolution
├── Listeners/
│   └── TriggerSubscriptionDetection.php  # Listener for bank feed sync completion
database/
├── migrations/
│   ├── xxxx_create_subscription_categories_table.php
│   ├── xxxx_create_merchant_profiles_table.php
│   ├── xxxx_create_subscriptions_table.php
│   ├── xxxx_create_subscription_bank_transaction_table.php
│   ├── xxxx_create_subscription_detections_table.php
│   ├── xxxx_create_subscription_status_changes_table.php
│   └── xxxx_create_subscription_alerts_table.php
├── seeders/
│   └── SubscriptionCategorySeeder.php    # Default system categories
tests/
└── Feature/
    └── Subscriptions/
        ├── DetectionEngineTest.php
        ├── SubscriptionCrudTest.php
        ├── SubscriptionDetectionApiTest.php
        ├── SubscriptionDashboardTest.php
        ├── PriceChangeAlertTest.php
        ├── MerchantNormalizerTest.php
        └── SubscriptionPolicyTest.php
```

### Modified Files

```text
app/Enums/ForecastSourceType.php            # Add Subscription case
app/Enums/NotificationType.php              # Add 4 subscription cases
app/Actions/Forecasting/GenerateForecast.php # Add getSubscriptionItems()
app/Providers/AppServiceProvider.php         # morphMap + Gate::policy
app/Services/FeatureRegistry.php             # Add subscription_tracker feature
database/seeders/RolesAndPermissionsSeeder.php # Add subscription.* permissions
routes/api.php                               # Add subscription routes
```

---

## Enums

### SubscriptionStatus

```php
enum SubscriptionStatus: string
{
    case Active = 'active';
    case Paused = 'paused';
    case Cancelled = 'cancelled';
    case Archived = 'archived';
}
```

Valid transitions: Active -> Paused, Active -> Cancelled, Paused -> Active, Paused -> Cancelled, Cancelled -> Archived.

### SubscriptionFrequency

```php
enum SubscriptionFrequency: string
{
    case Weekly = 'weekly';
    case Fortnightly = 'fortnightly';
    case Monthly = 'monthly';
    case Quarterly = 'quarterly';
    case SemiAnnual = 'semi_annual';
    case Annual = 'annual';
}
```

Each case carries an `intervalDays()` method returning the nominal interval and a `toleranceRange()` method returning min/max days for detection matching (per FR-004).

### DetectionConfidence

```php
enum DetectionConfidence: string
{
    case High = 'high';     // 5+ consistent charges, fixed amount, regular interval
    case Medium = 'medium'; // 3-4 charges or variable amount within 10%
    case Low = 'low';       // 2-3 charges with irregular timing or >10% variance
}
```

### DetectionDecision

```php
enum DetectionDecision: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Dismissed = 'dismissed';
}
```

### SubscriptionAlertType

```php
enum SubscriptionAlertType: string
{
    case PriceChange = 'price_change';
    case PostCancellation = 'post_cancellation';
    case Forgotten = 'forgotten';
    case RenewalReminder = 'renewal_reminder';
}
```

### SubscriptionAlertSeverity

```php
enum SubscriptionAlertSeverity: string
{
    case Info = 'info';
    case Warning = 'warning';
    case Critical = 'critical';
}
```

### SubscriptionAlertStatus

```php
enum SubscriptionAlertStatus: string
{
    case Open = 'open';
    case Acknowledged = 'acknowledged';
    case Dismissed = 'dismissed';
}
```

### SubscriptionCreationSource

```php
enum SubscriptionCreationSource: string
{
    case Detected = 'detected';
    case Manual = 'manual';
}
```

---

## Services

### MerchantNormalizer

Responsible for cleaning raw bank transaction descriptions into canonical merchant names.

**Location**: `app/Services/MerchantNormalizer.php`

**Key methods**:

- `normalize(string $raw): string` -- Trims whitespace, converts to title case, strips common suffixes (Pty Ltd, Inc, LLC, AU, Com), removes transaction reference numbers (sequences of 6+ digits).
- `resolveMerchant(BankTransaction $txn): string` -- Implements FR-002 fallback chain: (1) return `merchant_name` if populated, (2) else normalise `description`.
- `isSimilar(string $a, string $b, int $threshold = 85): bool` -- Fuzzy string comparison using `similar_text()` percentage. Returns true when similarity meets or exceeds threshold (default 85% per FR-003).
- `findCanonicalName(string $normalized, int $workspaceId): string` -- Checks MerchantProfile table for a matching canonical name. Falls back to the normalized input.

### SubscriptionDetectionEngine

The core pattern detection service. Stateless -- receives transaction data and returns detection results.

**Location**: `app/Services/SubscriptionDetectionEngine.php`

**Key methods**:

- `detect(Collection $transactions, array $dismissedMerchants): Collection` -- Main entry point. Groups transactions by normalised merchant name (via MerchantNormalizer), filters to debit-only, excludes dismissed merchants, identifies recurring patterns, returns a collection of detection result DTOs.
- `groupByMerchant(Collection $transactions): Collection` -- Groups transactions using fuzzy merchant matching (85% threshold). Two transactions belong to the same group when their normalised merchant names pass `MerchantNormalizer::isSimilar()`.
- `detectFrequency(Collection $merchantTransactions): ?SubscriptionFrequency` -- Analyses intervals between consecutive transactions for a single merchant. Calculates median interval and matches against each SubscriptionFrequency tolerance range (FR-004). Returns null if no frequency matches.
- `scoreConfidence(Collection $merchantTransactions, ?SubscriptionFrequency $frequency): DetectionConfidence` -- Applies FR-005 scoring rules based on occurrence count, amount variance, and interval regularity.
- `calculateAmountStats(Collection $merchantTransactions): array` -- Returns `['average' => int, 'min' => int, 'max' => int, 'stddev' => float, 'is_variable' => bool]`. Amount is variable when stddev > 10% of mean.
- `excludeFailedTransactions(Collection $transactions): Collection` -- Removes failed/reversed transactions per edge case (matching debit + credit same day, same merchant).

**Detection algorithm (high-level)**:

1. Filter to debit-only transactions within the detection window (default 12 months).
2. Resolve merchant name for each transaction via MerchantNormalizer.
3. Exclude dismissed merchants.
4. Group transactions by normalised merchant using fuzzy matching.
5. For each merchant group with 3+ transactions (FR-006):
   a. Sort by transaction_date ascending.
   b. Calculate intervals between consecutive transactions.
   c. Detect frequency via median interval matching.
   d. If frequency detected, compute amount stats and confidence score.
   e. Yield a detection result with merchant, frequency, amount, confidence, and matched transaction IDs.
6. Return collection of detection results.

---

## Actions

All actions use `Lorisleiva\Actions\Concerns\AsAction` trait.

### DetectSubscriptions

**Location**: `app/Actions/Subscriptions/DetectSubscriptions.php`

**Signature**: `handle(int $workspaceId, ?int $bankAccountId = null, bool $incrementalOnly = false): Collection`

**Behaviour**:
1. Acquire workspace-level mutex lock (`Cache::lock("subscription_detect:{$workspaceId}", 120)`) per NFR-008.
2. Load dismissed merchant names for this workspace from SubscriptionDetection where decision = dismissed.
3. Query BankTransactions: workspace-scoped, debit-only, filtered by bank_account_id if provided.
4. If `incrementalOnly`, only process transactions created since the last detection run (tracked via a `last_detection_at` timestamp on a workspace setting or cache key).
5. Delegate to `SubscriptionDetectionEngine::detect()`.
6. For each result, upsert a SubscriptionDetection record (update if same normalised merchant exists and is pending; create if new).
7. Release lock and return the collection of SubscriptionDetection records.

### ConfirmSubscription

**Location**: `app/Actions/Subscriptions/ConfirmSubscription.php`

**Signature**: `handle(SubscriptionDetection $detection, int $userId, ?int $categoryId = null, ?array $overrides = []): Subscription`

**Behaviour**:
1. Mark detection as `confirmed`.
2. Create a new Subscription record from the detection data (merchant name, amount, frequency, bank account).
3. Apply optional overrides (display name, category, amount adjustments).
4. Auto-suggest category from MerchantProfile if not provided.
5. Link historical bank transactions to the new subscription via the pivot table.
6. Calculate and set `next_expected_charge_date` from most recent linked transaction + frequency.
7. Auto-link to Contact (006-CCM) if merchant name matches an existing contact name/display_name.
8. Create initial SubscriptionStatusChange record (null -> active).
9. Return the created Subscription.

### DismissDetection

**Location**: `app/Actions/Subscriptions/DismissDetection.php`

**Signature**: `handle(SubscriptionDetection $detection, int $userId): void`

**Behaviour**:
1. Mark detection decision as `dismissed`.
2. The normalised merchant name is now excluded from future detection runs for this workspace (FR-010).

### CreateSubscription

**Location**: `app/Actions/Subscriptions/CreateSubscription.php`

**Signature**: `handle(int $workspaceId, int $userId, array $data): Subscription`

**Behaviour**:
1. Create subscription from user-provided data (provider name, amount in cents, frequency, start date).
2. Set creation_source = `manual`.
3. Attempt retroactive bank transaction matching: query BankTransactions for the workspace with fuzzy merchant name match and debit direction; link matches via pivot.
4. Calculate `next_expected_charge_date` from start_date + frequency (or from most recent matched transaction if found).
5. Create initial SubscriptionStatusChange record.
6. Auto-link to Contact if matching merchant found.
7. Return the created Subscription.

### UpdateSubscription

**Location**: `app/Actions/Subscriptions/UpdateSubscription.php`

**Signature**: `handle(Subscription $subscription, int $userId, array $data): Subscription`

**Behaviour**:
1. Update allowed fields: display_name, category_id, expected_amount, amount_min, amount_max, frequency, linked bank_account_id, renewal_date, trial_end_date, reminder_days.
2. Update `last_interacted_at` timestamp (resets forgotten subscription timer).
3. If amount fields changed, recalculate variable-amount ranges.
4. Return the updated Subscription.

### CancelSubscription

**Location**: `app/Actions/Subscriptions/CancelSubscription.php`

**Signature**: `handle(Subscription $subscription, int $userId, ?string $effectiveDate = null, ?string $reason = null): Subscription`

**Behaviour**:
1. Validate subscription is Active or Paused.
2. Set status to Cancelled.
3. Set `cancellation_effective_date` (defaults to today).
4. Clear `next_expected_charge_date`.
5. Create SubscriptionStatusChange record.
6. Return the updated Subscription.

### PauseSubscription / ResumeSubscription

**Location**: `app/Actions/Subscriptions/PauseSubscription.php`, `ResumeSubscription.php`

Similar pattern: validate current status, transition, create SubscriptionStatusChange record. Resume recalculates `next_expected_charge_date` from today + frequency (no backfill).

### DetectPriceChanges

**Location**: `app/Actions/Subscriptions/DetectPriceChanges.php`

**Signature**: `handle(BankTransaction $transaction): ?SubscriptionAlert`

**Behaviour**:
1. Called when a new bank transaction is linked to a subscription (via auto-linking in FR-013).
2. For fixed-amount subscriptions: check if transaction amount differs from `expected_amount` by more than 50 cents or 5%, whichever is greater (FR-019).
3. For variable-amount subscriptions: check if transaction amount falls outside `amount_min`/`amount_max` range.
4. If price change detected:
   a. Create SubscriptionAlert with type=PriceChange, severity=Warning.
   b. Store old_amount, new_amount, percentage_change, triggering_bank_transaction_id in `details` JSON.
   c. Create corresponding Notification via existing `CreateNotification` action with NotificationType::SubscriptionPriceChange and the SubscriptionAlert as the morph subject.
5. Return the alert or null.

---

## Artisan Command

### subscriptions:detect

**Location**: `app/Console/Commands/DetectSubscriptionsCommand.php`

**Signature**: `subscriptions:detect {--workspace= : Specific workspace ID} {--all : Run for all workspaces} {--incremental : Only scan new transactions}`

**Behaviour**:
1. If `--all`, iterate all workspaces with `subscription_tracker` feature enabled.
2. If `--workspace`, run for that workspace only.
3. Delegates to `DetectSubscriptions` action.
4. Outputs count of new detections found.

This command is triggered:
- Manually via artisan.
- Automatically after bank feed sync via `TriggerSubscriptionDetection` listener on the bank feed sync completion event.

---

## Listener

### TriggerSubscriptionDetection

**Location**: `app/Listeners/TriggerSubscriptionDetection.php`

Listens for the bank feed sync completion event. Dispatches `DetectSubscriptions` action with `incrementalOnly: true` for the workspace whose bank feed just synced. Also runs auto-linking for new transactions against confirmed subscriptions, triggering `DetectPriceChanges` for each linked transaction.

---

## Controller

### SubscriptionController

**Location**: `app/Http/Controllers/Api/SubscriptionController.php`

All read endpoints use `Gate::authorize()` inline. Mutation endpoints use Form Requests.

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| `index` | GET `/subscriptions` | List subscriptions with status/category/frequency/account filters, paginated | `subscription.view` |
| `counts` | GET `/subscriptions/counts` | Status counts for StatusTabs | `subscription.view` |
| `show` | GET `/subscriptions/{subscription}` | Subscription detail with transactions, alerts, status history | `subscription.view` |
| `store` | POST `/subscriptions` | Manual subscription creation | `subscription.create` |
| `update` | PATCH `/subscriptions/{subscription}` | Update subscription fields | `subscription.update` |
| `cancel` | POST `/subscriptions/{subscription}/cancel` | Cancel with effective date | `subscription.update` |
| `pause` | POST `/subscriptions/{subscription}/pause` | Pause subscription | `subscription.update` |
| `resume` | POST `/subscriptions/{subscription}/resume` | Resume from pause | `subscription.update` |
| `detections` | GET `/subscriptions/detections` | List pending detection suggestions | `subscription.view` |
| `confirmDetection` | POST `/subscriptions/detections/{detection}/confirm` | Confirm a detection | `subscription.create` |
| `dismissDetection` | POST `/subscriptions/detections/{detection}/dismiss` | Dismiss a detection | `subscription.update` |
| `confirmAllHigh` | POST `/subscriptions/detections/confirm-all-high` | Bulk confirm high confidence | `subscription.create` |
| `triggerDetection` | POST `/subscriptions/detect` | Trigger manual detection scan | `subscription.create` |
| `dashboard` | GET `/subscriptions/dashboard` | Dashboard stats: totals, category breakdown, trend | `subscription.view` |
| `categories` | GET `/subscriptions/categories` | List subscription categories | `subscription.view` |
| `alerts` | GET `/subscriptions/alerts` | List subscription alerts | `subscription.view` |
| `acknowledgeAlert` | POST `/subscriptions/alerts/{alert}/acknowledge` | Acknowledge a price change alert (updates subscription amount) | `subscription.update` |
| `dismissAlert` | POST `/subscriptions/alerts/{alert}/dismiss` | Dismiss an alert | `subscription.update` |

---

## Policy

### SubscriptionPolicy

**Location**: `app/Policies/SubscriptionPolicy.php`

```php
class SubscriptionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('subscription.view');
    }

    public function view(User $user, Subscription $subscription): bool
    {
        return $user->hasPermissionTo('subscription.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('subscription.create');
    }

    public function update(User $user, Subscription $subscription): bool
    {
        return $user->hasPermissionTo('subscription.update');
    }

    public function delete(User $user, Subscription $subscription): bool
    {
        return $user->hasPermissionTo('subscription.delete');
    }
}
```

Registered in `AppServiceProvider::boot()` via `Gate::policy(Subscription::class, SubscriptionPolicy::class)`.

---

## Permissions

Added to `RolesAndPermissionsSeeder`:

```
subscription.view
subscription.create
subscription.update
subscription.delete
```

| Role | Permissions |
|------|-------------|
| owner | view, create, update, delete |
| accountant | view, create, update, delete |
| bookkeeper | view, create, update |
| approver | view |
| auditor | view |
| client | view |

---

## Feature Flag

Added to `FeatureRegistry::all()`:

```php
'subscription_tracker' => [
    'name' => 'Subscription Tracker',
    'description' => 'Detect and track recurring subscriptions from bank transactions',
    'category' => 'advanced',
    'default' => false,
    'icon' => 'CalendarClock',
],
```

Routes gated with `Route::middleware(['feature:subscription_tracker'])`. Requires `bank_feeds` to be enabled (checked at feature toggle time in FeatureGate, not as a route dependency).

---

## Routes

Added to `routes/api.php` inside the workspace-scoped middleware group:

```php
// Subscriptions (067-SRT)
Route::middleware(['feature:subscription_tracker'])->group(function () {
    Route::get('subscriptions', [SubscriptionController::class, 'index']);
    Route::get('subscriptions/counts', [SubscriptionController::class, 'counts']);
    Route::get('subscriptions/dashboard', [SubscriptionController::class, 'dashboard']);
    Route::get('subscriptions/categories', [SubscriptionController::class, 'categories']);
    Route::get('subscriptions/detections', [SubscriptionController::class, 'detections']);
    Route::get('subscriptions/alerts', [SubscriptionController::class, 'alerts']);
    Route::post('subscriptions', [SubscriptionController::class, 'store']);
    Route::post('subscriptions/detect', [SubscriptionController::class, 'triggerDetection']);
    Route::post('subscriptions/detections/confirm-all-high', [SubscriptionController::class, 'confirmAllHigh']);
    Route::get('subscriptions/{subscription}', [SubscriptionController::class, 'show']);
    Route::patch('subscriptions/{subscription}', [SubscriptionController::class, 'update']);
    Route::post('subscriptions/{subscription}/cancel', [SubscriptionController::class, 'cancel']);
    Route::post('subscriptions/{subscription}/pause', [SubscriptionController::class, 'pause']);
    Route::post('subscriptions/{subscription}/resume', [SubscriptionController::class, 'resume']);
    Route::post('subscriptions/detections/{detection}/confirm', [SubscriptionController::class, 'confirmDetection']);
    Route::post('subscriptions/detections/{detection}/dismiss', [SubscriptionController::class, 'dismissDetection']);
    Route::post('subscriptions/alerts/{alert}/acknowledge', [SubscriptionController::class, 'acknowledgeAlert']);
    Route::post('subscriptions/alerts/{alert}/dismiss', [SubscriptionController::class, 'dismissAlert']);
});
```

---

## Morph Map

Added to `AppServiceProvider::boot()`:

```php
'subscription' => \App\Models\Tenant\Subscription::class,
'subscription_alert' => \App\Models\Tenant\SubscriptionAlert::class,
```

---

## NotificationType Additions

Four new cases added to `App\Enums\NotificationType`:

```php
// Subscription Tracker (067-SRT)
case SubscriptionPriceChange = 'subscription_price_change';
case SubscriptionPostCancellation = 'subscription_post_cancellation';
case SubscriptionForgotten = 'subscription_forgotten';
case SubscriptionRenewalReminder = 'subscription_renewal_reminder';
```

With corresponding `label()`, `icon()`, and `filterCategory()` (returning `'Subscriptions'`) implementations.

---

## ForecastSourceType Addition

New case added to `App\Enums\ForecastSourceType`:

```php
case Subscription = 'subscription';
```

With `label()` returning `'Subscription'`.

### GenerateForecast Integration

A new private method `getSubscriptionItems(int $workspaceId): Collection` added to `GenerateForecast`, following the same pattern as `getRecurringItems()`:

1. Query active subscriptions for the workspace (status = Active only; exclude Paused/Cancelled per FR-030).
2. For each subscription, project charges within the 90-day forecast window.
3. For fixed-amount subscriptions: use `expected_amount` with `confidence_pct = 90`.
4. For variable-amount subscriptions: use the average of `amount_min` and `amount_max` with `confidence_pct = 70`.
5. All items use `ForecastDirection::Outflow` and `ForecastSourceType::Subscription`.

Called from `handle()` alongside existing source methods:
```php
$items = $items->merge($this->getSubscriptionItems($workspaceId));
```

---

## Implementation Phases

### Phase 1A: Foundation (Migrations, Models, Enums, Seeders)

1. Create all enums (8 files).
2. Create all migrations (7 tables).
3. Create all models (7 files) with relationships, casts, and scopes.
4. Create `SubscriptionCategorySeeder` with 10 default categories.
5. Update `RolesAndPermissionsSeeder` with subscription permissions.
6. Update `AppServiceProvider` with morphMap entries and Gate::policy.
7. Update `FeatureRegistry` with `subscription_tracker`.
8. Run migrations, seed categories, verify schema.

### Phase 1B: Detection Engine (Services + DetectSubscriptions Action)

1. Build `MerchantNormalizer` service with unit tests.
2. Build `SubscriptionDetectionEngine` service with unit tests.
3. Build `DetectSubscriptions` action with workspace-level locking.
4. Build `DetectSubscriptionsCommand` artisan command.
5. Build `TriggerSubscriptionDetection` listener.
6. Write feature tests: detection accuracy, dismissed merchant exclusion, incremental scan, concurrent lock.

### Phase 1C: Registry (CRUD Actions + Controller)

1. Build `ConfirmSubscription`, `DismissDetection`, `CreateSubscription`, `UpdateSubscription` actions.
2. Build `CancelSubscription`, `PauseSubscription`, `ResumeSubscription` actions.
3. Build `SubscriptionPolicy`.
4. Build Form Requests (`StoreSubscriptionRequest`, `UpdateSubscriptionRequest`).
5. Build API Resources (Subscription, Detection, Alert, Category).
6. Build `SubscriptionController` with all endpoints.
7. Register routes in `api.php`.
8. Write feature tests: CRUD operations, status transitions, policy enforcement.

### Phase 1D: Alerts + Dashboard + Forecast Integration

1. Build `DetectPriceChanges` action.
2. Add `NotificationType` cases and update `label()`/`icon()`/`filterCategory()`.
3. Build dashboard endpoint (totals, category breakdown, trend).
4. Add `ForecastSourceType::Subscription` case and update `label()`.
5. Add `getSubscriptionItems()` to `GenerateForecast`.
6. Write feature tests: price change detection, alert CRUD, dashboard calculations, forecast integration.

---

## Testing Strategy

All tests use Pest v4 with `RefreshDatabase`. Each test file seeds `RolesAndPermissionsSeeder` and creates workspace context.

### Unit Tests

| Test File | Covers | Key Assertions |
|-----------|--------|----------------|
| `MerchantNormalizerTest.php` | Name cleaning, fuzzy matching, canonical resolution | Strips suffixes, handles edge cases, 85% threshold |
| `DetectionEngineTest.php` | Frequency detection, confidence scoring, grouping | Correct frequency for each interval range, 3+ txn minimum, variable amount detection |

### Feature Tests

| Test File | Covers | Key Assertions |
|-----------|--------|----------------|
| `DetectionEngineTest.php` | Full detection pipeline | Detects known patterns from seeded transactions, respects dismissed merchants, workspace isolation |
| `SubscriptionCrudTest.php` | Create, read, update, status transitions | Manual create works, confirm detection creates subscription, pause/resume/cancel transitions, archived terminal |
| `SubscriptionDetectionApiTest.php` | Detection API endpoints | Detections listed, confirm creates subscription, dismiss excludes merchant, bulk confirm |
| `SubscriptionDashboardTest.php` | Dashboard stats endpoint | Correct totals, category breakdown, multi-currency conversion |
| `PriceChangeAlertTest.php` | Price change detection | Fixed amount tolerance, variable range, alert creation, notification created, acknowledge updates amount |
| `SubscriptionPolicyTest.php` | Authorization | Owner full access, bookkeeper no delete, auditor view-only, client view-only |

### Test Data Factory

Create `SubscriptionFactory`, `SubscriptionDetectionFactory`, and `SubscriptionAlertFactory` for consistent test data generation.

### What Is NOT Tested (P1 Scope)

- Frontend components (P1 is backend only).
- Post-cancellation charge detection (US5, P2).
- Lifecycle management beyond basic transitions (US6, P2).
- Forgotten subscription detection (US10, P3).
- Renewal reminders (US9, P3).
- Category CRUD (US8, P2 -- only system defaults in P1).

---

## Gate 3 Architecture Checklist

### 1. Technical Feasibility

| Check | Status |
|-------|--------|
| Architecture approach clear | PASS -- Service + Action pattern matches existing codebase |
| Existing patterns leveraged | PASS -- Same patterns as AnomalyDetection, CashFlowForecast |
| No impossible requirements | PASS -- All FRs are implementable |
| Performance considered | PASS -- Workspace-level locking, incremental scans, indexed queries |
| Security considered | PASS -- Workspace-scoped, feature-flagged, permission-gated |

### 2. Data & Integration

| Check | Status |
|-------|--------|
| Data model understood | PASS -- See data-model.md |
| API contracts clear | PASS -- Controller methods, routes, and resources defined |
| Dependencies identified | PASS -- No new packages required |
| Integration points mapped | PASS -- BankTransaction, ForecastSourceType, NotificationType, Contact |
| DTO persistence explicit | PASS -- Form Requests + validated data, no toArray() into create() |

### 3. Implementation Approach

| Check | Status |
|-------|--------|
| File changes identified | PASS -- All new and modified files listed above |
| Risk areas noted | PASS -- Fuzzy matching accuracy, detection performance at scale |
| Testing approach defined | PASS -- Unit + feature tests per phase |
| Rollback possible | PASS -- Feature flag disables all routes; migrations are reversible |

### 4. Resource & Scope

| Check | Status |
|-------|--------|
| Scope matches spec | PASS -- P1 stories only, no frontend |
| Effort reasonable | PASS -- Estimated 8-10 days |
| Skills available | PASS -- Standard Laravel patterns |

### 5. Laravel Best Practices

| Check | Status |
|-------|--------|
| Use Lorisleiva Actions | PASS -- All business logic in Actions |
| Model route binding | PASS -- Controller methods use model instances |
| No hardcoded business logic | PASS -- Thresholds configurable, detection engine is service |
| Feature flags dual-gated | PASS -- Route middleware + FeatureRegistry |
| Migrations schema-only | PASS -- Category seeder is separate |
| Granular model policies | PASS -- SubscriptionPolicy with 5 methods |
| Event sourcing not needed | PASS -- Subscriptions are mutable CRUD, not financial postings |

---

## Risk Areas

| Risk | Mitigation |
|------|------------|
| Fuzzy matching produces false positives | 85% threshold is conservative; dismissed merchants are permanently excluded; users review before confirming |
| Detection performance on large transaction sets | Incremental scans after bank sync process only new transactions; full scans limited to 12 months; workspace-level lock prevents concurrent scans |
| Concurrent bank feed syncs for same workspace | Mutex lock with 120s TTL; queued detection prevents duplicate suggestions |
| MerchantProfile coverage | System-seeded with common Australian merchants; graceful fallback to normalised description when no profile match |
