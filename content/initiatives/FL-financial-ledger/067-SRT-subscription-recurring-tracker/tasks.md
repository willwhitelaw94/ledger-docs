---
title: "Implementation Tasks: Subscription & Recurring Payment Tracker"
---

# Implementation Tasks: Subscription & Recurring Payment Tracker

**Epic**: 067-SRT | **Scope**: P1 Backend (US1-US4) | **Branch**: `067-subscription-tracker`
**Estimated Tasks**: 56 | **Estimated Tests**: ~110

---

## Phase 1: Foundation (Migrations, Enums, Models, Seeders)

### Enums

- [ ] T001 [US1] Create `app/Enums/SubscriptionStatus.php` with cases: `Active = 'active'`, `Paused = 'paused'`, `Cancelled = 'cancelled'`, `Archived = 'archived'`. No methods needed beyond the backed enum.

- [ ] T002 [US1] Create `app/Enums/SubscriptionFrequency.php` with cases: `Weekly = 'weekly'`, `Fortnightly = 'fortnightly'`, `Monthly = 'monthly'`, `Quarterly = 'quarterly'`, `SemiAnnual = 'semi_annual'`, `Annual = 'annual'`. Add two methods: `intervalDays(): int` returning nominal interval (7, 14, 30, 90, 180, 365) and `toleranceRange(): array` returning `['min' => int, 'max' => int]` per FR-004: weekly 6-8, fortnightly 12-16, monthly 27-34, quarterly 85-100, semi-annual 170-200, annual 350-380.

- [ ] T003 [US1] Create `app/Enums/DetectionConfidence.php` with cases: `High = 'high'`, `Medium = 'medium'`, `Low = 'low'`.

- [ ] T004 [US1] Create `app/Enums/DetectionDecision.php` with cases: `Pending = 'pending'`, `Confirmed = 'confirmed'`, `Dismissed = 'dismissed'`.

- [ ] T005 [US4] Create `app/Enums/SubscriptionAlertType.php` with cases: `PriceChange = 'price_change'`, `PostCancellation = 'post_cancellation'`, `Forgotten = 'forgotten'`, `RenewalReminder = 'renewal_reminder'`.

- [ ] T006 [US4] Create `app/Enums/SubscriptionAlertSeverity.php` with cases: `Info = 'info'`, `Warning = 'warning'`, `Critical = 'critical'`.

- [ ] T007 [US4] Create `app/Enums/SubscriptionAlertStatus.php` with cases: `Open = 'open'`, `Acknowledged = 'acknowledged'`, `Dismissed = 'dismissed'`.

- [ ] T008 [US2] Create `app/Enums/SubscriptionCreationSource.php` with cases: `Detected = 'detected'`, `Manual = 'manual'`.

> T001-T008 are [P] parallelizable -- no interdependencies.

---

### Migrations

All migrations use `$table->id()` for primary key, `$table->timestamps()` unless noted. Foreign keys reference existing tables where specified. Run in dependency order.

- [ ] T009 [US2] Create migration `create_subscription_categories_table`. Columns: `id` bigint PK, `workspace_id` bigint FK nullable (null for system defaults) references `workspaces(id)` on delete cascade, `name` varchar(100) not null, `slug` varchar(100) not null, `colour` varchar(7) nullable, `icon` varchar(50) nullable, `sort_order` integer not null default 0, `is_system` boolean not null default false, `is_hidden` boolean not null default false, `timestamps`. Indexes: unique composite `(workspace_id, slug)` where workspace_id is not null (use `->unique()` on both columns), index on `(workspace_id)`.

- [ ] T010 [US1] Create migration `create_merchant_profiles_table`. Columns: `id` bigint PK, `canonical_name` varchar(255) not null, `display_name` varchar(255) not null, `aliases` json nullable, `logo_url` varchar(500) nullable, `website_url` varchar(500) nullable, `default_category_slug` varchar(100) nullable, `timestamps`. Index: unique on `(canonical_name)`. Note: NO workspace_id -- this is system-level reference data.

- [ ] T011 [US2] Create migration `create_subscriptions_table`. Columns: `id` bigint PK, `workspace_id` bigint FK not null references `workspaces(id)` on delete cascade, `provider_name` varchar(255) not null, `display_name` varchar(255) not null, `category_id` bigint FK nullable references `subscription_categories(id)` on delete set null, `expected_amount` integer nullable, `amount_min` integer nullable, `amount_max` integer nullable, `currency_code` varchar(3) not null default `'AUD'`, `frequency` varchar(20) not null, `next_expected_charge_date` date nullable, `status` varchar(20) not null default `'active'`, `bank_account_id` bigint FK nullable references `bank_accounts(id)` on delete set null, `contact_id` bigint FK nullable references `contacts(id)` on delete set null, `creation_source` varchar(20) not null default `'manual'`, `renewal_date` date nullable, `trial_end_date` date nullable, `reminder_days` integer nullable, `cancellation_effective_date` date nullable, `last_interacted_at` timestamp nullable, `timestamps`. Indexes: `(workspace_id, status)`, `(workspace_id, provider_name)`, `(workspace_id, next_expected_charge_date)`, `(workspace_id, category_id)`, `(workspace_id, bank_account_id)`.

- [ ] T012 [US2] Create migration `create_subscription_bank_transaction_table`. Columns: `id` bigint PK, `subscription_id` bigint FK not null references `subscriptions(id)` on delete cascade, `bank_transaction_id` bigint FK not null references `bank_transactions(id)` on delete cascade, `linked_at` timestamp not null. Indexes: unique on `(subscription_id, bank_transaction_id)`, index on `(bank_transaction_id)`. Note: pivot table name is singular `subscription_bank_transaction` (matches data-model.md).

- [ ] T013 [US1] Create migration `create_subscription_detections_table`. Columns: `id` bigint PK, `workspace_id` bigint FK not null references `workspaces(id)` on delete cascade, `bank_account_id` bigint FK nullable references `bank_accounts(id)` on delete set null, `normalized_merchant_name` varchar(255) not null, `raw_merchant_names` json not null, `detected_frequency` varchar(20) not null, `average_amount` integer not null, `amount_variance` integer not null default 0, `confidence` varchar(10) not null, `match_count` integer not null, `first_seen_date` date not null, `last_seen_date` date not null, `matched_transaction_ids` json not null, `decision` varchar(20) not null default `'pending'`, `decided_by` bigint FK nullable references `users(id)` on delete set null, `decided_at` timestamp nullable, `subscription_id` bigint FK nullable references `subscriptions(id)` on delete set null, `timestamps`. Indexes: `(workspace_id, decision)`, `(workspace_id, normalized_merchant_name)`, `(workspace_id, bank_account_id)`.

- [ ] T014 [US2] Create migration `create_subscription_status_changes_table`. Columns: `id` bigint PK, `subscription_id` bigint FK not null references `subscriptions(id)` on delete cascade, `old_status` varchar(20) nullable (null for initial creation), `new_status` varchar(20) not null, `changed_by` bigint FK nullable references `users(id)` on delete set null, `reason` varchar(500) nullable, `created_at` timestamp nullable. Note: NO `updated_at` -- immutable audit record. Index: `(subscription_id, created_at)`.

- [ ] T015 [US4] Create migration `create_subscription_alerts_table`. Columns: `id` bigint PK, `workspace_id` bigint FK not null references `workspaces(id)` on delete cascade, `subscription_id` bigint FK not null references `subscriptions(id)` on delete cascade, `type` varchar(30) not null, `severity` varchar(10) not null default `'warning'`, `details` json nullable, `status` varchar(20) not null default `'open'`, `actioned_at` timestamp nullable, `actioned_by` bigint FK nullable references `users(id)` on delete set null, `timestamps`. Indexes: `(workspace_id, status)`, `(subscription_id, type)`, `(workspace_id, created_at)`.

> T009-T015 must run in listed order (FK dependencies). T009 and T010 are [P] parallelizable with each other.

---

### Models

- [ ] T016 [US2] Create `app/Models/Tenant/SubscriptionCategory.php`. Fillable: `workspace_id`, `name`, `slug`, `colour`, `icon`, `sort_order`, `is_system`, `is_hidden`. Casts: `sort_order` => `'integer'`, `is_system` => `'boolean'`, `is_hidden` => `'boolean'`. Relationships: `subscriptions(): HasMany` (Subscription). Scopes: `scopeVisible(Builder $query): Builder` -- where `is_hidden` = false; `scopeForWorkspace(Builder $query, ?int $workspaceId): Builder` -- returns system defaults (workspace_id IS NULL) merged with workspace custom categories (workspace_id = $workspaceId).

- [ ] T017 [US1] Create `app/Models/Tenant/MerchantProfile.php`. Note: this model is NOT workspace-scoped (no workspace_id). Fillable: `canonical_name`, `display_name`, `aliases`, `logo_url`, `website_url`, `default_category_slug`. Casts: `aliases` => `'array'`. No relationships.

- [ ] T018 [US2] Create `app/Models/Tenant/Subscription.php`. Fillable: `workspace_id`, `provider_name`, `display_name`, `category_id`, `expected_amount`, `amount_min`, `amount_max`, `currency_code`, `frequency`, `next_expected_charge_date`, `status`, `bank_account_id`, `contact_id`, `creation_source`, `renewal_date`, `trial_end_date`, `reminder_days`, `cancellation_effective_date`, `last_interacted_at`. Casts: `status` => `SubscriptionStatus::class`, `frequency` => `SubscriptionFrequency::class`, `creation_source` => `SubscriptionCreationSource::class`, `expected_amount` => `'integer'`, `amount_min` => `'integer'`, `amount_max` => `'integer'`, `reminder_days` => `'integer'`, `next_expected_charge_date` => `'date'`, `renewal_date` => `'date'`, `trial_end_date` => `'date'`, `cancellation_effective_date` => `'date'`, `last_interacted_at` => `'datetime'`. Relationships: `workspace(): BelongsTo`, `category(): BelongsTo` (SubscriptionCategory), `bankAccount(): BelongsTo` (BankAccount), `contact(): BelongsTo` (Contact), `bankTransactions(): BelongsToMany` (BankTransaction via `subscription_bank_transaction` pivot, withPivot `linked_at`), `statusChanges(): HasMany` (SubscriptionStatusChange), `alerts(): HasMany` (SubscriptionAlert), `detection(): HasOne` (SubscriptionDetection, FK `subscription_id`). Scopes: `scopeActive(Builder $query)` -- where status = `active`; `scopeForWorkspace(Builder $query, int $workspaceId)` -- where workspace_id = $workspaceId. Helper methods: `isVariable(): bool` -- returns `$this->amount_min !== null && $this->amount_max !== null`; `monthlyEquivalent(): int` -- normalise expected_amount (or average of min/max) to monthly cents based on frequency; `annualEquivalent(): int` -- multiply monthlyEquivalent by 12.

- [ ] T019 [US2] Create `app/Models/Tenant/SubscriptionBankTransaction.php`. Set `public $timestamps = false;` and `protected $table = 'subscription_bank_transaction';`. Fillable: `subscription_id`, `bank_transaction_id`, `linked_at`. Casts: `linked_at` => `'datetime'`. Relationships: `subscription(): BelongsTo` (Subscription), `bankTransaction(): BelongsTo` (BankTransaction).

- [ ] T020 [US1] Create `app/Models/Tenant/SubscriptionDetection.php`. Fillable: `workspace_id`, `bank_account_id`, `normalized_merchant_name`, `raw_merchant_names`, `detected_frequency`, `average_amount`, `amount_variance`, `confidence`, `match_count`, `first_seen_date`, `last_seen_date`, `matched_transaction_ids`, `decision`, `decided_by`, `decided_at`, `subscription_id`. Casts: `detected_frequency` => `SubscriptionFrequency::class`, `confidence` => `DetectionConfidence::class`, `decision` => `DetectionDecision::class`, `raw_merchant_names` => `'array'`, `matched_transaction_ids` => `'array'`, `average_amount` => `'integer'`, `amount_variance` => `'integer'`, `match_count` => `'integer'`, `first_seen_date` => `'date'`, `last_seen_date` => `'date'`, `decided_at` => `'datetime'`. Relationships: `workspace(): BelongsTo`, `bankAccount(): BelongsTo` (BankAccount), `decidedBy(): BelongsTo` (User, FK `decided_by`), `subscription(): BelongsTo` (Subscription, FK `subscription_id`).

- [ ] T021 [US2] Create `app/Models/Tenant/SubscriptionStatusChange.php`. Set `public const UPDATED_AT = null;` (immutable audit record). Fillable: `subscription_id`, `old_status`, `new_status`, `changed_by`, `reason`. Casts: `old_status` => `SubscriptionStatus::class`, `new_status` => `SubscriptionStatus::class`, `created_at` => `'datetime'`. Relationships: `subscription(): BelongsTo` (Subscription), `changedBy(): BelongsTo` (User, FK `changed_by`).

- [ ] T022 [US4] Create `app/Models/Tenant/SubscriptionAlert.php`. Fillable: `workspace_id`, `subscription_id`, `type`, `severity`, `details`, `status`, `actioned_at`, `actioned_by`. Casts: `type` => `SubscriptionAlertType::class`, `severity` => `SubscriptionAlertSeverity::class`, `status` => `SubscriptionAlertStatus::class`, `details` => `'array'`, `actioned_at` => `'datetime'`. Relationships: `workspace(): BelongsTo`, `subscription(): BelongsTo` (Subscription), `actionedBy(): BelongsTo` (User, FK `actioned_by`).

> T016-T022 are [P] parallelizable (no cross-model dependencies during creation).

---

### Seeders and Registration

- [ ] T023 [US2] Create `database/seeders/SubscriptionCategorySeeder.php`. Seed 10 system default categories with `is_system = true`, `workspace_id = null`. Data per data-model.md: Entertainment/entertainment/#a78bfa/Film, Utilities/utilities/#fbbf24/Zap, Insurance/insurance/#22c55e/Shield, Loans & Repayments/loans-repayments/#ef4444/Landmark, SaaS & Software/saas-software/#3b82f6/Monitor, Health & Fitness/health-fitness/#f472b6/Heart, News & Media/news-media/#64748b/Newspaper, Education/education/#fb923c/GraduationCap, Food & Delivery/food-delivery/#14b8a6/UtensilsCrossed, Other/other/#94a3b8/MoreHorizontal. Use `firstOrCreate` keyed on `slug` where `workspace_id` is null to be idempotent. Set `sort_order` 0-9 in listed order.

- [ ] T024 [US2] Update `database/seeders/RolesAndPermissionsSeeder.php`. Add 4 new permissions to `allPermissions()`: `'subscription.view'`, `'subscription.create'`, `'subscription.update'`, `'subscription.delete'` (add after estate planning block with comment `// Subscription Tracker (067-SRT)`). Add to `accountantPermissions()`: all 4. Add to `bookkeeperPermissions()`: `'subscription.view'`, `'subscription.create'`, `'subscription.update'` (no delete). Add to `approverPermissions()`: `'subscription.view'`. Add to `auditorPermissions()`: `'subscription.view'`. Add to `clientPermissions()`: `'subscription.view'`.

- [ ] T025 [US2] Update `app/Providers/AppServiceProvider.php`. In `boot()` method, add to `Relation::morphMap()` array: `'subscription' => \App\Models\Tenant\Subscription::class`, `'subscription_alert' => \App\Models\Tenant\SubscriptionAlert::class`. Add `Gate::policy(\App\Models\Tenant\Subscription::class, \App\Policies\SubscriptionPolicy::class);` after the existing policy registrations. Add necessary use imports at top of file.

- [ ] T026 [US2] Update `app/Services/FeatureRegistry.php`. Add new entry to `all()` array after `'ai_assistant'`: `'subscription_tracker' => ['name' => 'Subscription Tracker', 'description' => 'Detect and track recurring subscriptions from bank transactions', 'category' => 'advanced', 'default' => false, 'icon' => 'CalendarClock']`.

- [ ] T027 [US1] Create model factories: `database/factories/SubscriptionFactory.php`, `database/factories/SubscriptionDetectionFactory.php`, `database/factories/SubscriptionAlertFactory.php`. SubscriptionFactory: default state with workspace_id, provider_name (fake company), display_name (same), expected_amount (random 499-9999), currency_code 'AUD', frequency 'monthly', status 'active', creation_source 'manual'. SubscriptionDetectionFactory: workspace_id, normalized_merchant_name, raw_merchant_names (array of 1), detected_frequency 'monthly', average_amount, confidence 'high', match_count 5, first_seen_date/last_seen_date, matched_transaction_ids (empty array), decision 'pending'. SubscriptionAlertFactory: workspace_id, subscription_id, type 'price_change', severity 'warning', status 'open'.

> T023-T027 are [P] parallelizable.

---

## Phase 2: Detection Engine (US1)

### MerchantNormalizer Service

- [ ] T028 [US1] Create `app/Services/MerchantNormalizer.php`. Implement `normalize(string $raw): string` -- trim whitespace, convert to title case via `mb_convert_case($raw, MB_CASE_TITLE)`, strip common suffixes using regex: `/\b(Pty|Ltd|Inc|Llc|Au|Com|Co|Aps|Nz)\b\.?/i`, strip transaction reference numbers (sequences of 6+ digits): `/\d{6,}/`, trim trailing whitespace/punctuation. Implement `resolveMerchant(BankTransaction $txn): string` -- if `$txn->merchant_name` is not null and not empty, return `normalize($txn->merchant_name)`; else return `normalize($txn->description)` (FR-002). Implement `isSimilar(string $a, string $b, int $threshold = 85): bool` -- use PHP `similar_text($a, $b, $percent)` and return `$percent >= $threshold` (FR-003). Implement `findCanonicalName(string $normalized, int $workspaceId): string` -- query `MerchantProfile` where `canonical_name = $normalized` or where any element in `aliases` JSON array matches; return the `display_name` if found, else return `$normalized`.

- [ ] T029 [US1] Create `tests/Feature/Subscriptions/MerchantNormalizerTest.php`. Test cases: (1) strips "Pty Ltd", "Inc", "LLC", "AU" suffixes, (2) removes 6+ digit reference numbers, (3) converts to title case, (4) `resolveMerchant` uses merchant_name when populated, (5) `resolveMerchant` falls back to description when merchant_name is null, (6) `isSimilar` returns true for "Netflix Inc" vs "Netflix" at 85% threshold, (7) `isSimilar` returns false for completely different strings, (8) `findCanonicalName` returns display_name when MerchantProfile exists, (9) `findCanonicalName` returns input when no profile match. Minimum 9 tests.

### SubscriptionDetectionEngine Service

- [ ] T030 [US1] Create `app/Services/SubscriptionDetectionEngine.php`. Implement `detect(Collection $transactions, array $dismissedMerchants): Collection` -- orchestrator that calls groupByMerchant, then for each group with 3+ transactions (FR-006): sort by transaction_date asc, call detectFrequency, if frequency found call scoreConfidence and calculateAmountStats, yield detection result array with keys: `merchant_name`, `frequency`, `average_amount`, `amount_min`, `amount_max`, `amount_variance`, `confidence`, `match_count`, `first_seen_date`, `last_seen_date`, `matched_transaction_ids`, `raw_merchant_names`. Filter out dismissed merchants before grouping. Inject `MerchantNormalizer` via constructor.

- [ ] T031 [US1] Implement `groupByMerchant(Collection $transactions): Collection` on `SubscriptionDetectionEngine`. For each transaction, resolve merchant name via `MerchantNormalizer::resolveMerchant()`. Group transactions where normalised names pass `MerchantNormalizer::isSimilar()` at 85% threshold. Return Collection keyed by canonical merchant name, values are collections of transactions. Must handle the fuzzy grouping: iterate transactions, for each check if any existing group key is similar; if so add to that group, otherwise create new group.

- [ ] T032 [US1] Implement `detectFrequency(Collection $merchantTransactions): ?SubscriptionFrequency` on `SubscriptionDetectionEngine`. Sort transactions by transaction_date ascending. Calculate intervals in days between consecutive transaction dates. Compute the median interval (sort intervals, take middle value). Check median against each `SubscriptionFrequency::toleranceRange()` -- return the first matching frequency. Return null if no frequency matches.

- [ ] T033 [US1] Implement `scoreConfidence(Collection $merchantTransactions, ?SubscriptionFrequency $frequency): DetectionConfidence` on `SubscriptionDetectionEngine`. Per FR-005: return `High` if count >= 5 AND amount stddev <= 10% of mean AND frequency was detected. Return `Medium` if count 3-4 OR amount stddev > 10% but <= 20% of mean. Return `Low` if count 2-3 with irregular timing or stddev > 20%.

- [ ] T034 [US1] Implement `calculateAmountStats(Collection $merchantTransactions): array` on `SubscriptionDetectionEngine`. Return associative array: `'average'` => int (mean of amounts), `'min'` => int, `'max'` => int, `'stddev'` => float (population std deviation), `'is_variable'` => bool (true when stddev > 10% of mean).

- [ ] T035 [US1] Implement `excludeFailedTransactions(Collection $transactions): Collection` on `SubscriptionDetectionEngine`. For each transaction, check if there is a matching credit (same merchant, same amount, same day or next day, direction = Credit). If found, exclude both the debit and the credit from the collection. Return filtered collection.

- [ ] T036 [US1] Create `tests/Feature/Subscriptions/DetectionEngineTest.php`. Test cases: (1) detects monthly subscription from 5 matching transactions, (2) detects quarterly subscription from 4 matching transactions, (3) requires minimum 3 transactions -- 2 transactions returns no detection, (4) correctly identifies High confidence for 5+ fixed-amount regular transactions, (5) correctly identifies Medium confidence for 3-4 transactions, (6) correctly identifies Low confidence for irregular timing, (7) excludes dismissed merchants from results, (8) groups fuzzy merchant names (e.g. "NETFLIX.COM" and "Netflix Inc" become one group), (9) excludes failed/reversed transaction pairs, (10) returns variable amount flag when amounts vary by >10%, (11) detects annual frequency from yearly charges, (12) returns null frequency for irregular intervals that match no tolerance, (13) workspace isolation -- transactions from different workspaces are not mixed. Minimum 13 tests.

> T028-T029 are [P] with T030-T036. T030-T035 are sequential (building out the service method by method).

---

### DetectSubscriptions Action

- [ ] T037 [US1] Create `app/Actions/Subscriptions/DetectSubscriptions.php` with `AsAction` trait. Signature: `handle(int $workspaceId, ?int $bankAccountId = null, bool $incrementalOnly = false): Collection`. Implementation: (1) Acquire workspace-level mutex lock via `Cache::lock("subscription_detect:{$workspaceId}", 120)` -- if lock cannot be acquired within 10 seconds, throw `LockTimeoutException` (NFR-008). (2) Load dismissed merchant names: query `SubscriptionDetection::where('workspace_id', $workspaceId)->where('decision', DetectionDecision::Dismissed)->pluck('normalized_merchant_name')->toArray()`. (3) Query `BankTransaction::where('workspace_id', $workspaceId)->where('direction', EntryDirection::Debit)`. If `$bankAccountId` provided, add `->where('bank_account_id', $bankAccountId)`. If `$incrementalOnly`, filter `->where('created_at', '>', Cache::get("subscription_detect_last:{$workspaceId}", now()->subYear()))`. Otherwise filter last 12 months: `->where('transaction_date', '>=', now()->subMonths(12))`. (4) Pass transactions to `SubscriptionDetectionEngine::detect()`. (5) For each result, upsert `SubscriptionDetection`: find existing by `workspace_id` + `normalized_merchant_name` + `decision = pending`; update if exists, create if new. (6) Update cache key `subscription_detect_last:{$workspaceId}` to now. (7) Release lock. (8) Return collection of SubscriptionDetection records.

---

### Artisan Command

- [ ] T038 [US1] Create `app/Console/Commands/DetectSubscriptionsCommand.php`. Signature: `subscriptions:detect {--workspace= : Specific workspace ID} {--all : Run for all workspaces} {--incremental : Only scan new transactions}`. Handle: if `--all`, query all workspaces where `subscription_tracker` is in their enabled_features (check via `FeatureRegistry::isEnabled()`), iterate and call `DetectSubscriptions::run($workspace->id, null, $incremental)`. If `--workspace`, run for that ID only. Output count of new detections found per workspace via `$this->info()`. Validate that at least one of `--workspace` or `--all` is provided.

---

## Phase 3: US2 -- Registry CRUD (Actions, Controller, Policy, Routes)

### Actions

- [ ] T039 [US2] Create `app/Actions/Subscriptions/ConfirmSubscription.php` with `AsAction` trait. Signature: `handle(SubscriptionDetection $detection, int $userId, ?int $categoryId = null, array $overrides = []): Subscription`. Implementation: (1) Mark detection `decision = confirmed`, `decided_by = $userId`, `decided_at = now()`. (2) Auto-suggest category: if `$categoryId` is null, look up `MerchantProfile` by `canonical_name` matching `$detection->normalized_merchant_name`; if found and `default_category_slug` is set, resolve `SubscriptionCategory` by slug. (3) Create `Subscription::create()` with: `workspace_id` from detection, `provider_name` = detection `normalized_merchant_name`, `display_name` = overrides `display_name` ?? `MerchantProfile::display_name` ?? detection `normalized_merchant_name`, `category_id` from resolved category or overrides, `expected_amount` = detection `average_amount` (if not variable) or null, `amount_min`/`amount_max` from detection stats (if variable), `currency_code` = 'AUD', `frequency` = detection `detected_frequency`, `status` = `SubscriptionStatus::Active`, `bank_account_id` = detection `bank_account_id`, `creation_source` = `SubscriptionCreationSource::Detected`. Apply remaining overrides. (4) Link historical transactions: for each ID in `detection->matched_transaction_ids`, create `SubscriptionBankTransaction` with `linked_at = now()`. (5) Calculate `next_expected_charge_date`: get most recent linked transaction date, add frequency interval via `SubscriptionFrequency::intervalDays()`. (6) Auto-link contact: query `Contact::where('workspace_id', ...)->where(fn($q) => $q->where('name', 'like', "%{$providerName}%")->orWhere('display_name', 'like', "%{$providerName}%"))->first()`. If found, set `contact_id`. (7) Create initial `SubscriptionStatusChange`: `old_status = null`, `new_status = active`, `changed_by = $userId`. (8) Set `detection->subscription_id` to new subscription ID, save. (9) Return the subscription.

- [ ] T040 [US1] Create `app/Actions/Subscriptions/DismissDetection.php` with `AsAction` trait. Signature: `handle(SubscriptionDetection $detection, int $userId): void`. Set `detection->decision = DetectionDecision::Dismissed`, `detection->decided_by = $userId`, `detection->decided_at = now()`, save. Per FR-010, the normalized_merchant_name is now excluded from future detection runs automatically via the dismissed merchant query in DetectSubscriptions.

- [ ] T041 [US2] Create `app/Actions/Subscriptions/CreateSubscription.php` with `AsAction` trait. Signature: `handle(int $workspaceId, int $userId, array $data): Subscription`. Implementation: (1) Create subscription from `$data`: required keys `provider_name`, `amount` (integer cents), `frequency`, `start_date`. Optional: `display_name` (defaults to provider_name), `category_id`, `bank_account_id`, `renewal_date`, `trial_end_date`, `reminder_days`. Set `creation_source = SubscriptionCreationSource::Manual`, `status = SubscriptionStatus::Active`. Determine if fixed or variable: if only `amount` provided, set `expected_amount`; if `amount_min` and `amount_max` provided, set those instead. (2) Retroactive matching: query `BankTransaction` for workspace with direction = Debit, where merchant_name or description fuzzy-matches provider_name (use `MerchantNormalizer::isSimilar()`). Link matches via `SubscriptionBankTransaction` with `linked_at = now()`. (3) Calculate `next_expected_charge_date`: if matched transactions exist, use most recent date + frequency; otherwise use `start_date` + frequency. (4) Create initial `SubscriptionStatusChange`. (5) Auto-link contact (same logic as ConfirmSubscription). (6) Return subscription.

- [ ] T042 [US2] Create `app/Actions/Subscriptions/UpdateSubscription.php` with `AsAction` trait. Signature: `handle(Subscription $subscription, int $userId, array $data): Subscription`. Allowed update fields: `display_name`, `category_id`, `expected_amount`, `amount_min`, `amount_max`, `frequency`, `bank_account_id`, `renewal_date`, `trial_end_date`, `reminder_days`. Also set `last_interacted_at = now()` on every update. If amount fields changed and both min/max provided, recalculate variable-amount ranges. Return updated subscription.

- [ ] T043 [US2] Create `app/Actions/Subscriptions/CancelSubscription.php` with `AsAction` trait. Signature: `handle(Subscription $subscription, int $userId, ?string $effectiveDate = null, ?string $reason = null): Subscription`. Validate `$subscription->status` is Active or Paused (throw `DomainException` otherwise). Set `status = SubscriptionStatus::Cancelled`, `cancellation_effective_date = $effectiveDate ?? today()`, `next_expected_charge_date = null`. Create `SubscriptionStatusChange` with old/new status, changed_by, reason. Return subscription.

- [ ] T044 [US2] Create `app/Actions/Subscriptions/PauseSubscription.php` with `AsAction` trait. Signature: `handle(Subscription $subscription, int $userId, ?string $reason = null): Subscription`. Validate status is Active. Set `status = Paused`, `next_expected_charge_date = null`. Create `SubscriptionStatusChange`. Return subscription.

- [ ] T045 [US2] Create `app/Actions/Subscriptions/ResumeSubscription.php` with `AsAction` trait. Signature: `handle(Subscription $subscription, int $userId): Subscription`. Validate status is Paused. Set `status = Active`. Recalculate `next_expected_charge_date` from today + frequency interval (no backfill, same pattern as RepeatingTemplate resume). Create `SubscriptionStatusChange`. Return subscription.

> T039-T045 are [P] parallelizable (independent actions).

---

### Policy

- [ ] T046 [US2] Create `app/Policies/SubscriptionPolicy.php`. Methods: `viewAny(User $user): bool` returns `$user->hasPermissionTo('subscription.view')`, `view(User $user, Subscription $subscription): bool` returns `$user->hasPermissionTo('subscription.view')`, `create(User $user): bool` returns `$user->hasPermissionTo('subscription.create')`, `update(User $user, Subscription $subscription): bool` returns `$user->hasPermissionTo('subscription.update')`, `delete(User $user, Subscription $subscription): bool` returns `$user->hasPermissionTo('subscription.delete')`.

---

### Form Requests

- [ ] T047 [US2] Create `app/Http/Requests/Subscriptions/StoreSubscriptionRequest.php`. `authorize()`: return `$this->user()->can('create', Subscription::class)`. Rules: `provider_name` required string max:255, `amount` required_without:amount_min integer min:1, `amount_min` required_without:amount nullable integer min:1, `amount_max` required_with:amount_min nullable integer min:1 gte:amount_min, `frequency` required string in:weekly,fortnightly,monthly,quarterly,semi_annual,annual, `start_date` required date, `display_name` nullable string max:255, `category_id` nullable exists:subscription_categories,id, `bank_account_id` nullable exists:bank_accounts,id, `renewal_date` nullable date, `trial_end_date` nullable date, `reminder_days` nullable integer min:1 max:90.

- [ ] T048 [US2] Create `app/Http/Requests/Subscriptions/UpdateSubscriptionRequest.php`. `authorize()`: resolve Subscription from route `{subscription}`, stash on `$this->attributes`, return `$this->user()->can('update', $subscription)`. Rules: `display_name` nullable string max:255, `category_id` nullable exists:subscription_categories,id, `expected_amount` nullable integer min:1, `amount_min` nullable integer min:1, `amount_max` nullable integer min:1 gte:amount_min, `frequency` nullable string in:weekly,fortnightly,monthly,quarterly,semi_annual,annual, `bank_account_id` nullable exists:bank_accounts,id, `renewal_date` nullable date, `trial_end_date` nullable date, `reminder_days` nullable integer min:1 max:90.

> T046-T048 are [P] parallelizable.

---

### API Resources

- [ ] T049 [US2] Create `app/Http/Resources/Subscriptions/SubscriptionResource.php`. Return: `id`, `provider_name`, `display_name`, `category` (SubscriptionCategoryResource when loaded), `expected_amount`, `amount_min`, `amount_max`, `is_variable` (bool), `currency_code`, `frequency`, `frequency_label` (SubscriptionFrequency label), `next_expected_charge_date`, `status`, `bank_account_id`, `bank_account_name` (when bankAccount loaded), `contact_id`, `contact_name` (when contact loaded), `creation_source`, `renewal_date`, `trial_end_date`, `reminder_days`, `cancellation_effective_date`, `last_interacted_at`, `monthly_equivalent` (call `monthlyEquivalent()`), `annual_equivalent` (call `annualEquivalent()`), `transaction_count` (count of bankTransactions when loaded), `created_at`, `updated_at`. Conditionally include `status_changes` (SubscriptionStatusChange collection) and `alerts` (SubscriptionAlertResource collection) and `bank_transactions` when loaded.

- [ ] T050 [US1] Create `app/Http/Resources/Subscriptions/SubscriptionDetectionResource.php`. Return: `id`, `normalized_merchant_name`, `raw_merchant_names`, `detected_frequency`, `frequency_label`, `average_amount`, `amount_variance`, `confidence`, `match_count`, `first_seen_date`, `last_seen_date`, `decision`, `bank_account_id`, `bank_account_name` (when loaded), `created_at`.

- [ ] T051 [US4] Create `app/Http/Resources/Subscriptions/SubscriptionAlertResource.php`. Return: `id`, `subscription_id`, `subscription_name` (when subscription loaded), `type`, `type_label`, `severity`, `details`, `status`, `actioned_at`, `actioned_by`, `created_at`.

- [ ] T052 [US2] Create `app/Http/Resources/Subscriptions/SubscriptionCategoryResource.php`. Return: `id`, `name`, `slug`, `colour`, `icon`, `sort_order`, `is_system`, `subscription_count` (when withCount loaded).

> T049-T052 are [P] parallelizable.

---

### Controller

- [ ] T053 [US2] Create `app/Http/Controllers/Api/SubscriptionController.php`. Implement all 18 endpoints per plan.md controller table. Read endpoints use `Gate::authorize()` inline with `subscription.view` permission. Mutation endpoints use Form Requests. All workspace-scoped queries filter by `$request->input('workspace_id')` (set by SetWorkspaceContext middleware).

  **Read methods (Gate::authorize inline)**:
  - `index()`: List subscriptions. Accept query params: `status`, `category_id`, `frequency`, `bank_account_id`, `search` (provider_name LIKE). Paginate 50. Eager load: `category`, `bankAccount`. Return `SubscriptionResource::collection()`.
  - `counts()`: `GROUP BY status`, return `{active: N, paused: N, cancelled: N, archived: N}` for StatusTabs.
  - `show(Subscription $subscription)`: Load `category`, `bankAccount`, `contact`, `bankTransactions`, `statusChanges`, `alerts`. Update `last_interacted_at = now()` (touch for forgotten detection). Return `SubscriptionResource`.
  - `detections()`: Query `SubscriptionDetection` where `decision = pending`, paginate 20. Eager load `bankAccount`. Return `SubscriptionDetectionResource::collection()`.
  - `dashboard()`: Aggregate: `total_monthly` (sum of monthlyEquivalent for active subs), `total_annual` (sum of annualEquivalent), `active_count`, `category_breakdown` (group by category_id, sum monthlyEquivalent per category), `monthly_trend` (join subscription_bank_transaction + bank_transactions, group by month for last 12 months, sum amounts). Return JSON.
  - `categories()`: Query `SubscriptionCategory::scopeForWorkspace()`, return `SubscriptionCategoryResource::collection()`.
  - `alerts()`: Query `SubscriptionAlert` where `workspace_id`, accept filter `status` and `type`. Paginate 20. Eager load `subscription`. Return `SubscriptionAlertResource::collection()`.

  **Mutation methods (Form Request or inline Gate)**:
  - `store(StoreSubscriptionRequest $request)`: Call `CreateSubscription::run()`, return `SubscriptionResource` 201.
  - `update(UpdateSubscriptionRequest $request, Subscription $subscription)`: Call `UpdateSubscription::run()`, return `SubscriptionResource`.
  - `cancel(Subscription $subscription)`: `Gate::authorize('update', $subscription)`. Accept `effective_date` and `reason` from body. Call `CancelSubscription::run()`. Return `SubscriptionResource`.
  - `pause(Subscription $subscription)`: `Gate::authorize('update', $subscription)`. Call `PauseSubscription::run()`. Return `SubscriptionResource`.
  - `resume(Subscription $subscription)`: `Gate::authorize('update', $subscription)`. Call `ResumeSubscription::run()`. Return `SubscriptionResource`.
  - `confirmDetection(SubscriptionDetection $detection)`: `Gate::authorize('create', Subscription::class)`. Accept optional `category_id`, `display_name` overrides. Call `ConfirmSubscription::run()`. Return `SubscriptionResource` 201.
  - `dismissDetection(SubscriptionDetection $detection)`: `Gate::authorize('update', Subscription::class)`. Call `DismissDetection::run()`. Return 204.
  - `confirmAllHigh()`: `Gate::authorize('create', Subscription::class)`. Query all pending detections with `confidence = high` for workspace. Loop and call `ConfirmSubscription::run()` for each. Return JSON with `confirmed_count`.
  - `triggerDetection()`: `Gate::authorize('create', Subscription::class)`. Call `DetectSubscriptions::run($workspaceId, null, true)`. Return JSON with `detection_count`.
  - `acknowledgeAlert(SubscriptionAlert $alert)`: `Gate::authorize('update', $alert->subscription)`. Set alert `status = acknowledged`, `actioned_at = now()`, `actioned_by = auth()->id()`. If type is PriceChange, update subscription's `expected_amount` to `details['new_amount']`. Return `SubscriptionAlertResource`.
  - `dismissAlert(SubscriptionAlert $alert)`: `Gate::authorize('update', $alert->subscription)`. Set alert `status = dismissed`, `actioned_at = now()`, `actioned_by = auth()->id()`. Return 204.

---

### Routes

- [ ] T054 [US2] Add routes to `routes/api.php` inside the workspace-scoped middleware group. Wrap all routes in `Route::middleware(['feature:subscription_tracker'])->group(function () { ... })`. Register all 18 routes exactly as defined in plan.md routes section. Use model route binding: `{subscription}` binds to `Subscription`, `{detection}` binds to `SubscriptionDetection`, `{alert}` binds to `SubscriptionAlert`. Place after existing route groups with comment `// Subscriptions (067-SRT)`.

---

## Phase 4: US3 -- Dashboard Data

- [ ] T055 [US3] Implement `dashboard()` method on SubscriptionController (already scaffolded in T053 but this task covers the aggregation logic in detail). Build: (1) `total_monthly`: query active subscriptions for workspace, for each call `monthlyEquivalent()`, sum. For multi-currency: if workspace has multi_currency enabled, convert foreign currency amounts using latest exchange rate from `exchange_rates` table (same pattern as reporting). (2) `total_annual`: `total_monthly * 12`. (3) `active_count`: count of active subscriptions. (4) `category_breakdown`: `Subscription::where('workspace_id', $wsId)->where('status', 'active')->select('category_id', DB::raw('count(*) as count'))->groupBy('category_id')->get()`, then for each group calculate total monthly spend. Join to categories for name/colour. (5) `monthly_trend`: join `subscription_bank_transaction` to `bank_transactions`, filter workspace_id, group by `DATE_TRUNC('month', bank_transactions.transaction_date)`, sum amounts, order by month, last 12 months. Return array of `{month: 'YYYY-MM', amount: int}`.

---

## Phase 5: US4 -- Price Change Alerts

- [ ] T056 [US4] Create `app/Actions/Subscriptions/DetectPriceChanges.php` with `AsAction` trait. Signature: `handle(BankTransaction $transaction): ?SubscriptionAlert`. Implementation: (1) Find the subscription this transaction is linked to via `SubscriptionBankTransaction` pivot. If no subscription link, return null. (2) Load the subscription. (3) For fixed-amount subscriptions: calculate threshold = max(50, (int)(subscription.expected_amount * 0.05)). If `abs($transaction->amount - $subscription->expected_amount) > $threshold`, create alert. (4) For variable-amount subscriptions: if `$transaction->amount < $subscription->amount_min || $transaction->amount > $subscription->amount_max`, create alert. (5) Create `SubscriptionAlert::create()` with: workspace_id, subscription_id, type = PriceChange, severity = Warning, details = `['old_amount' => $subscription->expected_amount (or range), 'new_amount' => $transaction->amount, 'change_amount' => $transaction->amount - $subscription->expected_amount, 'change_percentage' => round(($diff / $oldAmount) * 100, 1), 'triggering_bank_transaction_id' => $transaction->id]`. (6) Create notification via `CreateNotification::run()` with `NotificationType::SubscriptionPriceChange` and the alert as morph subject. (7) Return the alert.

- [ ] T057 [US4] Update `app/Enums/NotificationType.php`. Add 4 new cases after the Signing block with comment `// Subscription Tracker (067-SRT)`: `case SubscriptionPriceChange = 'subscription_price_change'`, `case SubscriptionPostCancellation = 'subscription_post_cancellation'`, `case SubscriptionForgotten = 'subscription_forgotten'`, `case SubscriptionRenewalReminder = 'subscription_renewal_reminder'`. Add corresponding entries to `label()`: 'Subscription Price Change', 'Post-Cancellation Charge', 'Forgotten Subscription', 'Subscription Renewal Reminder'. Add to `icon()`: 'exclamation-triangle', 'exclamation-triangle', 'clock', 'bell'. Add to `filterCategory()`: all four return `'Subscriptions'`.

---

## Phase 6: Integration

- [ ] T058 [US3] Update `app/Enums/ForecastSourceType.php`. Add case `Subscription = 'subscription'` after `Predicted`. Update `label()` match: add `self::Subscription => 'Subscription'`.

- [ ] T059 [US3] Update `app/Actions/Forecasting/GenerateForecast.php`. Add private method `getSubscriptionItems(int $workspaceId): Collection`. Implementation: (1) Query `Subscription::where('workspace_id', $workspaceId)->where('status', SubscriptionStatus::Active)->whereNotNull('next_expected_charge_date')->get()`. (2) For each subscription, project charges within the 90-day forecast window (`$this->today` to `$this->endDate`). Start from `next_expected_charge_date`, advance by frequency interval. (3) For fixed-amount: use `expected_amount`, `confidence_pct = 90`. (4) For variable-amount: use `(amount_min + amount_max) / 2`, `confidence_pct = 70`. (5) All items: `direction = ForecastDirection::Outflow`, `source_type = ForecastSourceType::Subscription`, `source_id = $subscription->id`, `contact_name = $subscription->display_name`, `description = "Subscription: " . $subscription->display_name`. (6) In `handle()`, add `$items = $items->merge($this->getSubscriptionItems($workspaceId));` after the `getPredictedItems()` line.

- [ ] T060 [US1] Create `app/Listeners/TriggerSubscriptionDetection.php`. Listen for the bank feed sync completion event (same event that `NotifyOwnersOnBankFeedSynced` handles). In `handle()`: (1) Check if workspace has `subscription_tracker` feature enabled. If not, return early. (2) Dispatch `DetectSubscriptions::run($workspaceId, $bankAccountId, incrementalOnly: true)`. (3) After detection, auto-link new transactions to existing confirmed subscriptions: query active subscriptions for the workspace, for each new debit transaction from the sync, check if merchant matches any subscription's `provider_name` via `MerchantNormalizer::isSimilar()`. If match and transaction date is within +/-5 days of `next_expected_charge_date`, create `SubscriptionBankTransaction` link and update `next_expected_charge_date`. (4) For each newly linked transaction, call `DetectPriceChanges::run($transaction)`.

  Register listener: in `SyncBankFeed.php` action, call `TriggerSubscriptionDetection::run($bankAccount, $result)` after `NotifyOwnersOnBankFeedSynced::run()` (same pattern -- action-based listener, not event-based).

---

## Phase 7: Tests

### CRUD Tests

- [ ] T061 [US2] Create `tests/Feature/Subscriptions/SubscriptionCrudTest.php`. Standard workspace test setup (seed RolesAndPermissionsSeeder, create user/org/workspace, attach as owner). Tests: (1) `it('can manually create a subscription')` -- POST /subscriptions with valid data, assert 201, assert record in DB with correct fields. (2) `it('validates required fields on create')` -- POST without provider_name, assert 422 with validation errors. (3) `it('can update a subscription')` -- PATCH /subscriptions/{id}, assert display_name updated, last_interacted_at set. (4) `it('can cancel an active subscription')` -- POST /subscriptions/{id}/cancel, assert status=cancelled, cancellation_effective_date set, next_expected_charge_date null, SubscriptionStatusChange created. (5) `it('cannot cancel an archived subscription')` -- assert 422 or 500. (6) `it('can pause an active subscription')` -- assert status=paused, next_expected_charge_date null. (7) `it('can resume a paused subscription')` -- assert status=active, next_expected_charge_date recalculated. (8) `it('cannot resume an active subscription')` -- assert error. (9) `it('creates initial status change on create')` -- assert SubscriptionStatusChange record with old_status=null, new_status=active. (10) `it('retroactively matches bank transactions on manual create')` -- seed matching BankTransactions, assert pivot records created. Minimum 10 tests.

### Detection API Tests

- [ ] T062 [US1] Create `tests/Feature/Subscriptions/SubscriptionDetectionApiTest.php`. Tests: (1) `it('lists pending detections')` -- seed 3 pending detections, GET /subscriptions/detections, assert 3 items. (2) `it('confirms a detection and creates subscription')` -- POST /subscriptions/detections/{id}/confirm, assert detection decision=confirmed, subscription created with correct fields, pivot records exist. (3) `it('dismisses a detection')` -- POST /subscriptions/detections/{id}/dismiss, assert decision=dismissed. (4) `it('dismissed merchant excluded from future detections')` -- dismiss detection, run DetectSubscriptions, assert no new detection for that merchant. (5) `it('bulk confirms high confidence detections')` -- seed 2 high + 1 medium pending, POST /subscriptions/detections/confirm-all-high, assert 2 confirmed, 1 still pending. (6) `it('triggers manual detection scan')` -- seed bank transactions, POST /subscriptions/detect, assert detections created. (7) `it('does not expose detections from other workspaces')` -- seed detection in workspace B, GET from workspace A, assert empty. Minimum 7 tests.

### Dashboard Tests

- [ ] T063 [US3] Create `tests/Feature/Subscriptions/SubscriptionDashboardTest.php`. Tests: (1) `it('returns correct total monthly spend')` -- create 3 active subs (monthly $10, weekly $5, annual $120), GET /subscriptions/dashboard, assert total_monthly = 1000 + 2165 + 1000 (cents, approximately). (2) `it('returns category breakdown')` -- assign subs to different categories, assert each category total and percentage. (3) `it('returns active count')` -- create 3 active + 1 paused, assert active_count=3. (4) `it('excludes cancelled and paused from totals')` -- assert only active subs included. (5) `it('returns monthly trend from linked transactions')` -- seed subscription_bank_transaction pivot records linked to bank_transactions in different months, assert trend data. (6) `it('returns counts for status tabs')` -- GET /subscriptions/counts, assert all statuses represented. Minimum 6 tests.

### Price Change Alert Tests

- [ ] T064 [US4] Create `tests/Feature/Subscriptions/PriceChangeAlertTest.php`. Tests: (1) `it('creates alert for fixed amount price increase beyond threshold')` -- sub at 1699 cents, transaction at 2299, assert alert created with correct details. (2) `it('does not alert for amount within 50 cent tolerance')` -- sub at 1699, txn at 1730, assert no alert. (3) `it('does not alert for amount within 5% tolerance')` -- sub at 10000, txn at 10400, assert no alert. (4) `it('creates alert for variable amount outside range')` -- sub with min=18000 max=24000, txn at 31000, assert alert. (5) `it('does not alert for variable amount within range')` -- txn at 22500, assert no alert. (6) `it('acknowledge updates subscription expected amount')` -- POST /subscriptions/alerts/{id}/acknowledge, assert sub expected_amount updated to new_amount. (7) `it('dismiss does not update subscription amount')` -- POST /subscriptions/alerts/{id}/dismiss, assert expected_amount unchanged. (8) `it('creates notification alongside alert')` -- assert Notification record created with type=subscription_price_change. Minimum 8 tests.

### Policy Tests

- [ ] T065 [US2] Create `tests/Feature/Subscriptions/SubscriptionPolicyTest.php`. Tests: (1) `it('owner has full subscription access')` -- assert viewAny, create, update, delete all true. (2) `it('accountant has full subscription access')` -- same as owner. (3) `it('bookkeeper can view, create, update but not delete')` -- assert view/create/update true, delete false. (4) `it('approver can only view')` -- assert view true, create/update/delete false. (5) `it('auditor can only view')` -- same as approver. (6) `it('client can only view')` -- same as approver. (7) `it('denies unauthenticated access')` -- GET /subscriptions without auth, assert 401. Minimum 7 tests.

### Forecast Integration Tests

- [ ] T066 [US3] Create `tests/Feature/Subscriptions/ForecastIntegrationTest.php`. Tests: (1) `it('includes active subscriptions in forecast')` -- create 2 active subs with next_expected_charge_date in forecast window, run GenerateForecast, assert ForecastItem records with source_type=subscription. (2) `it('excludes paused subscriptions from forecast')` -- create paused sub, assert no ForecastItem. (3) `it('excludes cancelled subscriptions from forecast')` -- create cancelled sub, assert no ForecastItem. (4) `it('uses 90% confidence for fixed amount')` -- create fixed sub, assert confidence_pct=90. (5) `it('uses 70% confidence for variable amount')` -- create variable sub (amount_min/max set), assert confidence_pct=70, amount=(min+max)/2. (6) `it('projects multiple charges within 90 day window')` -- weekly sub, assert ~13 ForecastItems. Minimum 6 tests.

> T061-T066 are [P] parallelizable (independent test files).

---

## Task Summary

| Phase | Tasks | Key Deliverables |
|-------|-------|-----------------|
| 1: Foundation | T001-T027 (27 tasks) | 8 enums, 7 migrations, 7 models, 1 seeder, permissions, morph map, feature flag, factories |
| 2: Detection Engine | T028-T038 (11 tasks) | MerchantNormalizer, SubscriptionDetectionEngine, DetectSubscriptions action, artisan command |
| 3: Registry CRUD | T039-T054 (16 tasks) | 7 actions, 1 policy, 2 form requests, 4 API resources, 1 controller (18 endpoints), routes |
| 4: Dashboard Data | T055 (1 task) | Aggregation logic for dashboard endpoint |
| 5: Price Change Alerts | T056-T057 (2 tasks) | DetectPriceChanges action, 4 NotificationType cases |
| 6: Integration | T058-T060 (3 tasks) | ForecastSourceType, GenerateForecast integration, TriggerSubscriptionDetection listener |
| 7: Tests | T061-T066 (6 tasks) | ~57 test cases across 6 test files |
| **Total** | **66 tasks** | |

---

## Dependency Graph

```
Phase 1 (Foundation)
  T001-T008 (enums)  ─────┐
  T009-T015 (migrations) ──┤── must complete before Phase 2+
  T016-T022 (models) ──────┤
  T023-T027 (seeders) ─────┘

Phase 2 (Detection)          Phase 3 (Registry)
  T028-T029 (normalizer) ──┐   T039-T045 (actions) ────┐
  T030-T036 (engine) ──────┤   T046-T048 (policy/FRs) ─┤── T053 (controller) ── T054 (routes)
  T037 (action) ───────────┤   T049-T052 (resources) ──┘
  T038 (command) ──────────┘

Phase 4 (Dashboard) ─── depends on Phase 3 (controller exists)
Phase 5 (Alerts) ────── depends on Phase 1 (models exist)
Phase 6 (Integration) ─ depends on Phase 2 + Phase 3

Phase 7 (Tests) ──────── depends on all production code phases
```
