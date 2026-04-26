---
title: "Data Model: Subscription & Recurring Payment Tracker"
---

# Data Model: Subscription & Recurring Payment Tracker

**Epic**: 067-SRT | **Date**: 2026-03-22 | **Scope**: P1 Backend

All monetary amounts are stored as integers (cents). All workspace-scoped tables include `workspace_id` with a foreign key to `workspaces.id`. Timestamps follow Laravel conventions (`created_at`, `updated_at`).

---

## Entity Relationship Diagram (Text)

```
MerchantProfile (system-level, no workspace_id)
    |
    | (reference lookup)
    v
SubscriptionDetection ---[confirmed]--> Subscription
    |                                       |
    | workspace_id                          | workspace_id
    |                                       |
    | decision (pending/confirmed/dismissed) |--- has many --> SubscriptionBankTransaction (pivot) --> BankTransaction
    |                                       |--- has many --> SubscriptionStatusChange
    |                                       |--- has many --> SubscriptionAlert --> Notification
    |                                       |--- belongs to --> SubscriptionCategory
    |                                       |--- belongs to --> BankAccount
    |                                       |--- belongs to --> Contact
    |                                       |--- belongs to --> Workspace
```

---

## Tables

### subscription_categories

Lookup table of subscription categories. System defaults are seeded; users can create custom categories per workspace.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint (PK) | No | auto | |
| `workspace_id` | bigint (FK) | Yes | null | Null for system defaults; set for custom categories |
| `name` | varchar(100) | No | | Category display name |
| `slug` | varchar(100) | No | | URL-safe identifier |
| `colour` | varchar(7) | Yes | null | Hex colour code (e.g. #22c55e) |
| `icon` | varchar(50) | Yes | null | Icon identifier |
| `sort_order` | integer | No | 0 | Display ordering |
| `is_system` | boolean | No | false | True for seeded defaults (cannot be deleted) |
| `is_hidden` | boolean | No | false | User can hide system categories |
| `created_at` | timestamp | Yes | | |
| `updated_at` | timestamp | Yes | | |

**Indexes**: `(workspace_id, slug)` unique where workspace_id is not null; `(workspace_id)`.

**System defaults** (seeded via `SubscriptionCategorySeeder`):

| Name | Slug | Colour | Icon |
|------|------|--------|------|
| Entertainment | entertainment | #a78bfa | Film |
| Utilities | utilities | #fbbf24 | Zap |
| Insurance | insurance | #22c55e | Shield |
| Loans & Repayments | loans-repayments | #ef4444 | Landmark |
| SaaS & Software | saas-software | #3b82f6 | Monitor |
| Health & Fitness | health-fitness | #f472b6 | Heart |
| News & Media | news-media | #64748b | Newspaper |
| Education | education | #fb923c | GraduationCap |
| Food & Delivery | food-delivery | #14b8a6 | UtensilsCrossed |
| Other | other | #94a3b8 | MoreHorizontal |

---

### merchant_profiles

System-level reference table (NOT workspace-scoped). Maps raw merchant names to canonical display names. Shared across all workspaces.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint (PK) | No | auto | |
| `canonical_name` | varchar(255) | No | | Normalised merchant name (e.g. "Netflix") |
| `display_name` | varchar(255) | No | | User-facing display name |
| `aliases` | json | Yes | null | Array of known raw bank description variants |
| `logo_url` | varchar(500) | Yes | null | URL to merchant logo |
| `website_url` | varchar(500) | Yes | null | Merchant website |
| `default_category_slug` | varchar(100) | Yes | null | Suggested category slug |
| `created_at` | timestamp | Yes | | |
| `updated_at` | timestamp | Yes | | |

**Indexes**: `(canonical_name)` unique.

---

### subscriptions

The core registry table for confirmed recurring payments.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint (PK) | No | auto | |
| `workspace_id` | bigint (FK) | No | | Tenant scope |
| `provider_name` | varchar(255) | No | | Normalised merchant name used for matching |
| `display_name` | varchar(255) | No | | User-facing name (editable) |
| `category_id` | bigint (FK) | Yes | null | FK to subscription_categories |
| `expected_amount` | integer | Yes | null | Fixed expected charge in cents (null for variable) |
| `amount_min` | integer | Yes | null | Variable amount lower bound in cents |
| `amount_max` | integer | Yes | null | Variable amount upper bound in cents |
| `currency_code` | varchar(3) | No | 'AUD' | ISO currency code from bank transaction |
| `frequency` | varchar(20) | No | | SubscriptionFrequency enum value |
| `next_expected_charge_date` | date | Yes | null | Calculated: last charge date + frequency |
| `status` | varchar(20) | No | 'active' | SubscriptionStatus enum value |
| `bank_account_id` | bigint (FK) | Yes | null | FK to bank_accounts (primary charging account) |
| `contact_id` | bigint (FK) | Yes | null | FK to contacts (auto-linked or manual) |
| `creation_source` | varchar(20) | No | 'manual' | SubscriptionCreationSource enum value |
| `renewal_date` | date | Yes | null | Annual renewal date (for reminders, P3) |
| `trial_end_date` | date | Yes | null | Free trial expiry (for reminders, P3) |
| `reminder_days` | integer | Yes | null | Days before renewal to notify |
| `cancellation_effective_date` | date | Yes | null | When cancellation takes effect |
| `last_interacted_at` | timestamp | Yes | null | Last user view/edit (for forgotten detection) |
| `created_at` | timestamp | Yes | | |
| `updated_at` | timestamp | Yes | | |

**Indexes**:
- `(workspace_id, status)` -- primary query filter
- `(workspace_id, provider_name)` -- merchant matching
- `(workspace_id, next_expected_charge_date)` -- forecast projection
- `(workspace_id, category_id)` -- dashboard breakdown
- `(workspace_id, bank_account_id)` -- account filtering

**Foreign Keys**:
- `workspace_id` references `workspaces(id)` on delete cascade
- `category_id` references `subscription_categories(id)` on delete set null
- `bank_account_id` references `bank_accounts(id)` on delete set null
- `contact_id` references `contacts(id)` on delete set null

---

### subscription_bank_transaction

Pivot table linking subscriptions to their matched bank transactions. Keeps the BankTransaction model clean -- no FK column added to `bank_transactions`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint (PK) | No | auto | |
| `subscription_id` | bigint (FK) | No | | FK to subscriptions |
| `bank_transaction_id` | bigint (FK) | No | | FK to bank_transactions |
| `linked_at` | timestamp | No | | When the link was established |

**Indexes**:
- `(subscription_id, bank_transaction_id)` unique -- prevents duplicate links
- `(bank_transaction_id)` -- reverse lookup

**Foreign Keys**:
- `subscription_id` references `subscriptions(id)` on delete cascade
- `bank_transaction_id` references `bank_transactions(id)` on delete cascade

---

### subscription_detections

Pending suggestions generated by the detection engine. Each represents a potential subscription that the user has not yet confirmed or dismissed.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint (PK) | No | auto | |
| `workspace_id` | bigint (FK) | No | | Tenant scope |
| `bank_account_id` | bigint (FK) | Yes | null | Account where pattern was detected |
| `normalized_merchant_name` | varchar(255) | No | | Cleaned merchant name |
| `raw_merchant_names` | json | No | | Array of raw description variants encountered |
| `detected_frequency` | varchar(20) | No | | SubscriptionFrequency enum value |
| `average_amount` | integer | No | | Average charge amount in cents |
| `amount_variance` | integer | No | 0 | Standard deviation of amounts in cents |
| `confidence` | varchar(10) | No | | DetectionConfidence enum value |
| `match_count` | integer | No | | Number of matching transactions |
| `first_seen_date` | date | No | | Earliest matching transaction date |
| `last_seen_date` | date | No | | Most recent matching transaction date |
| `matched_transaction_ids` | json | No | | Array of bank_transaction IDs |
| `decision` | varchar(20) | No | 'pending' | DetectionDecision enum value |
| `decided_by` | bigint (FK) | Yes | null | User who confirmed/dismissed |
| `decided_at` | timestamp | Yes | null | When decision was made |
| `subscription_id` | bigint (FK) | Yes | null | FK to subscription created on confirm |
| `created_at` | timestamp | Yes | | |
| `updated_at` | timestamp | Yes | | |

**Indexes**:
- `(workspace_id, decision)` -- filter pending detections
- `(workspace_id, normalized_merchant_name)` -- unique check and dismissal lookup
- `(workspace_id, bank_account_id)` -- account-scoped queries

**Foreign Keys**:
- `workspace_id` references `workspaces(id)` on delete cascade
- `bank_account_id` references `bank_accounts(id)` on delete set null
- `decided_by` references `users(id)` on delete set null
- `subscription_id` references `subscriptions(id)` on delete set null

---

### subscription_status_changes

Audit trail for subscription lifecycle transitions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint (PK) | No | auto | |
| `subscription_id` | bigint (FK) | No | | FK to subscriptions |
| `old_status` | varchar(20) | Yes | null | Null for initial creation |
| `new_status` | varchar(20) | No | | SubscriptionStatus enum value |
| `changed_by` | bigint (FK) | Yes | null | User who made the change |
| `reason` | varchar(500) | Yes | null | Optional reason for change |
| `created_at` | timestamp | Yes | | |

**Note**: `updated_at` is omitted (immutable audit records, similar to ForecastItem pattern).

**Indexes**:
- `(subscription_id, created_at)` -- timeline ordering

**Foreign Keys**:
- `subscription_id` references `subscriptions(id)` on delete cascade
- `changed_by` references `users(id)` on delete set null

---

### subscription_alerts

Domain-specific alert records for subscription events. Each alert also creates a corresponding Notification record via `CreateNotification` for feed delivery.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | bigint (PK) | No | auto | |
| `workspace_id` | bigint (FK) | No | | Tenant scope |
| `subscription_id` | bigint (FK) | No | | FK to subscriptions |
| `type` | varchar(30) | No | | SubscriptionAlertType enum value |
| `severity` | varchar(10) | No | 'warning' | SubscriptionAlertSeverity enum value |
| `details` | json | Yes | null | Type-specific data (see below) |
| `status` | varchar(20) | No | 'open' | SubscriptionAlertStatus enum value |
| `actioned_at` | timestamp | Yes | null | When acknowledged or dismissed |
| `actioned_by` | bigint (FK) | Yes | null | User who took action |
| `created_at` | timestamp | Yes | | |
| `updated_at` | timestamp | Yes | | |

**`details` JSON structure by alert type**:

**PriceChange**:
```json
{
    "old_amount": 1699,
    "new_amount": 2299,
    "change_amount": 600,
    "change_percentage": 35.3,
    "triggering_bank_transaction_id": 12345
}
```

**PostCancellation** (P2 -- schema included now for completeness):
```json
{
    "cancellation_date": "2026-03-01",
    "charge_amount": 5999,
    "charge_date": "2026-03-15",
    "triggering_bank_transaction_id": 12346
}
```

**Forgotten** (P3 -- schema included now for completeness):
```json
{
    "days_since_interaction": 92,
    "subscription_amount": 299,
    "subscription_frequency": "monthly"
}
```

**RenewalReminder** (P3 -- schema included now for completeness):
```json
{
    "renewal_date": "2026-12-01",
    "days_until_renewal": 14,
    "renewal_amount": 14999
}
```

**Indexes**:
- `(workspace_id, status)` -- filter open alerts
- `(subscription_id, type)` -- alerts per subscription by type
- `(workspace_id, created_at)` -- recent alerts for dashboard

**Foreign Keys**:
- `workspace_id` references `workspaces(id)` on delete cascade
- `subscription_id` references `subscriptions(id)` on delete cascade
- `actioned_by` references `users(id)` on delete set null

---

## Model Definitions

### Subscription

```php
class Subscription extends Model
{
    protected $fillable = [
        'workspace_id', 'provider_name', 'display_name', 'category_id',
        'expected_amount', 'amount_min', 'amount_max', 'currency_code',
        'frequency', 'next_expected_charge_date', 'status', 'bank_account_id',
        'contact_id', 'creation_source', 'renewal_date', 'trial_end_date',
        'reminder_days', 'cancellation_effective_date', 'last_interacted_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => SubscriptionStatus::class,
            'frequency' => SubscriptionFrequency::class,
            'creation_source' => SubscriptionCreationSource::class,
            'expected_amount' => 'integer',
            'amount_min' => 'integer',
            'amount_max' => 'integer',
            'reminder_days' => 'integer',
            'next_expected_charge_date' => 'date',
            'renewal_date' => 'date',
            'trial_end_date' => 'date',
            'cancellation_effective_date' => 'date',
            'last_interacted_at' => 'datetime',
        ];
    }

    // Relationships
    public function workspace(): BelongsTo;
    public function category(): BelongsTo;       // SubscriptionCategory
    public function bankAccount(): BelongsTo;     // BankAccount
    public function contact(): BelongsTo;          // Contact
    public function bankTransactions(): BelongsToMany; // via subscription_bank_transaction pivot
    public function statusChanges(): HasMany;      // SubscriptionStatusChange
    public function alerts(): HasMany;             // SubscriptionAlert
    public function detection(): HasOne;           // SubscriptionDetection (reverse lookup)

    // Scopes
    public function scopeActive(Builder $query): Builder;
    public function scopeForWorkspace(Builder $query, int $workspaceId): Builder;

    // Helpers
    public function isVariable(): bool;  // amount_min and amount_max are set
    public function monthlyEquivalent(): int; // normalise any frequency to monthly cents
    public function annualEquivalent(): int;  // normalise any frequency to annual cents
}
```

### SubscriptionBankTransaction

```php
class SubscriptionBankTransaction extends Model
{
    public $timestamps = false;

    protected $table = 'subscription_bank_transaction';

    protected $fillable = [
        'subscription_id', 'bank_transaction_id', 'linked_at',
    ];

    protected function casts(): array
    {
        return [
            'linked_at' => 'datetime',
        ];
    }

    public function subscription(): BelongsTo;
    public function bankTransaction(): BelongsTo;
}
```

### SubscriptionDetection

```php
class SubscriptionDetection extends Model
{
    protected $fillable = [
        'workspace_id', 'bank_account_id', 'normalized_merchant_name',
        'raw_merchant_names', 'detected_frequency', 'average_amount',
        'amount_variance', 'confidence', 'match_count', 'first_seen_date',
        'last_seen_date', 'matched_transaction_ids', 'decision',
        'decided_by', 'decided_at', 'subscription_id',
    ];

    protected function casts(): array
    {
        return [
            'detected_frequency' => SubscriptionFrequency::class,
            'confidence' => DetectionConfidence::class,
            'decision' => DetectionDecision::class,
            'raw_merchant_names' => 'array',
            'matched_transaction_ids' => 'array',
            'average_amount' => 'integer',
            'amount_variance' => 'integer',
            'match_count' => 'integer',
            'first_seen_date' => 'date',
            'last_seen_date' => 'date',
            'decided_at' => 'datetime',
        ];
    }

    public function workspace(): BelongsTo;
    public function bankAccount(): BelongsTo;
    public function decidedBy(): BelongsTo;  // User
    public function subscription(): BelongsTo; // Created subscription (if confirmed)
}
```

### SubscriptionCategory

```php
class SubscriptionCategory extends Model
{
    protected $fillable = [
        'workspace_id', 'name', 'slug', 'colour', 'icon',
        'sort_order', 'is_system', 'is_hidden',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'is_system' => 'boolean',
            'is_hidden' => 'boolean',
        ];
    }

    public function subscriptions(): HasMany;

    public function scopeVisible(Builder $query): Builder;
    public function scopeForWorkspace(Builder $query, ?int $workspaceId): Builder;
    // Returns system defaults + workspace custom categories
}
```

### SubscriptionStatusChange

```php
class SubscriptionStatusChange extends Model
{
    public const UPDATED_AT = null; // Immutable audit record

    protected $fillable = [
        'subscription_id', 'old_status', 'new_status',
        'changed_by', 'reason',
    ];

    protected function casts(): array
    {
        return [
            'old_status' => SubscriptionStatus::class,
            'new_status' => SubscriptionStatus::class,
            'created_at' => 'datetime',
        ];
    }

    public function subscription(): BelongsTo;
    public function changedBy(): BelongsTo; // User
}
```

### SubscriptionAlert

```php
class SubscriptionAlert extends Model
{
    protected $fillable = [
        'workspace_id', 'subscription_id', 'type', 'severity',
        'details', 'status', 'actioned_at', 'actioned_by',
    ];

    protected function casts(): array
    {
        return [
            'type' => SubscriptionAlertType::class,
            'severity' => SubscriptionAlertSeverity::class,
            'status' => SubscriptionAlertStatus::class,
            'details' => 'array',
            'actioned_at' => 'datetime',
        ];
    }

    public function workspace(): BelongsTo;
    public function subscription(): BelongsTo;
    public function actionedBy(): BelongsTo; // User
}
```

### MerchantProfile

```php
class MerchantProfile extends Model
{
    // Note: NOT workspace-scoped. System-level reference data.

    protected $fillable = [
        'canonical_name', 'display_name', 'aliases',
        'logo_url', 'website_url', 'default_category_slug',
    ];

    protected function casts(): array
    {
        return [
            'aliases' => 'array',
        ];
    }
}
```

---

## Migration Order

Migrations must be created in dependency order:

1. `create_subscription_categories_table` -- no FKs to other new tables
2. `create_merchant_profiles_table` -- system-level, no FKs
3. `create_subscriptions_table` -- FKs to workspaces, subscription_categories, bank_accounts, contacts
4. `create_subscription_bank_transaction_table` -- FKs to subscriptions, bank_transactions
5. `create_subscription_detections_table` -- FK to workspaces, bank_accounts, users, subscriptions
6. `create_subscription_status_changes_table` -- FK to subscriptions, users
7. `create_subscription_alerts_table` -- FK to workspaces, subscriptions, users

---

## Relationship to Existing Models

### BankTransaction (read-only, no modifications)

The Subscription module reads from `bank_transactions` but does NOT add columns to it. The `subscription_bank_transaction` pivot table provides the link. This respects feature flag boundaries -- disabling the subscription tracker leaves the bank_transactions table unchanged.

### Contact (006-CCM)

Subscriptions optionally link to contacts via `contact_id` FK. Auto-linking happens during confirmation by fuzzy-matching the subscription's `provider_name` against `contacts.name` and `contacts.display_name` within the workspace.

### BankAccount

Subscriptions track which bank account the charges come from via `bank_account_id`. When a bank account is deactivated, the subscription retains the FK but displays an inactive indicator. Detection stops for inactive accounts.

### CashFlowForecast / ForecastItem (041-CFF)

Active subscriptions generate `ForecastItem` records with `source_type = 'subscription'` and `source_id = subscription.id`. The `ForecastSourceType::Subscription` enum case is added.

### Notification (024-NTF)

SubscriptionAlert records are the morph subject for Notification records. When a SubscriptionAlert is created, a corresponding Notification is created via the existing `CreateNotification` action. The `NotificationType` enum gains four new cases under the "Subscriptions" filter category.

---

## Query Performance Notes

- **Detection query**: The primary detection query filters `bank_transactions` by `workspace_id`, `direction = 'debit'`, and `transaction_date` within the last 12 months. Existing indexes on `(workspace_id, transaction_date)` and `(workspace_id, direction)` should be sufficient. If performance is an issue, a composite index `(workspace_id, direction, transaction_date)` can be added.

- **Dashboard aggregation**: Total spend and category breakdown queries aggregate across `subscriptions` filtered by `workspace_id` and `status = 'active'`. The `(workspace_id, status)` index covers this.

- **Auto-linking**: When new bank transactions arrive, matching against active subscriptions uses `provider_name` fuzzy matching. The `(workspace_id, provider_name)` index on subscriptions enables efficient lookup. For workspaces with fewer than 200 subscriptions (SC-008 target), an in-memory comparison is feasible.

- **Trend data**: Monthly spend trend queries join `subscription_bank_transaction` with `bank_transactions` and group by month. This is a reporting query expected to run in under 2 seconds for 50 active subscriptions (NFR-003).
