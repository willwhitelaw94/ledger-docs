---
title: "Implementation Tasks: Workflow Automation & Trigger Rules"
---

# Implementation Tasks: Workflow Automation & Trigger Rules

**Epic**: 066-WFA | **Scope**: P1 (US1-US5, US10) | **Backend Only** | **Date**: 2026-03-22
**Branch**: `066-workflow-automation`
**Estimated Tests**: ~110

Tasks marked **[P]** can run in parallel with other [P] tasks in the same phase.

---

## Phase 1: Foundation (Migrations, Enums, Models, DTOs)

**Goal**: Database schema, PHP enums, Eloquent models, Spatie Data DTOs. Zero tests -- validated by later phases.

---

### T001 [P] Create `RuleTriggerType` enum

**File**: `app/Enums/Automation/RuleTriggerType.php`
**Story**: US2, US10 | **FR**: FR-001, FR-003, FR-006

Create a `string` backed enum with 25 cases. Each case maps to an existing `NotificationType` value or a new trigger.

**Cases** (value => case name):
- `je_submitted` => `JeSubmitted`
- `je_approved` => `JeApproved`
- `je_rejected` => `JeRejected`
- `invoice_sent` => `InvoiceSent`
- `invoice_paid` => `InvoicePaid`
- `invoice_overdue` => `InvoiceOverdue`
- `bank_feed_synced` => `BankFeedSynced`
- `bank_feed_error` => `BankFeedError`
- `reconciliation_completed` => `ReconciliationCompleted`
- `task_shared` => `TaskShared`
- `client_task_completed` => `ClientTaskCompleted`
- `client_request_submitted` => `ClientRequestSubmitted`
- `client_request_status_changed` => `ClientRequestStatusChanged`
- `task_comment_practice` => `TaskCommentPractice`
- `task_comment_client` => `TaskCommentClient`
- `task_overdue` => `TaskOverdue`
- `job_share_viewed` => `JobShareViewed`
- `signing_request_sent` => `SigningRequestSent`
- `document_signed` => `DocumentSigned`
- `document_completed` => `DocumentCompleted`
- `document_declined` => `DocumentDeclined`
- `signing_reminder` => `SigningReminder`
- `access_expiring` => `AccessExpiring`
- `access_expired` => `AccessExpired`
- `cash_flow_shortfall` => `CashFlowShortfall`

**Methods to implement**:

1. `label(): string` -- human-readable label (e.g. "Journal entry submitted")
2. `category(): string` -- one of: `Approvals`, `Invoicing`, `Banking`, `Practice Tasks`, `Client Requests`, `Signing`, `Access`, `Forecasting`, `Jobs`
3. `isAvailable(): bool` -- returns `false` only for `JobShareViewed` (pending 022-CPV); `true` for all others
4. `conditionFields(): array` -- returns array of `['field' => string, 'type' => ConditionFieldType, 'label' => string]` per trigger. See data-model.md "Condition Fields per Trigger Type" table for exact mapping. Example for `je_submitted`: `[['field' => 'amount', 'type' => ConditionFieldType::Currency, 'label' => 'Amount'], ['field' => 'reference', 'type' => ConditionFieldType::Text, 'label' => 'Reference'], ...]`
5. `placeholderTokens(): array` -- returns array of strings. See data-model.md "Placeholder Tokens per Trigger Type" table. Example for `je_submitted`: `['{reference}', '{amount}', '{actor_name}', '{line_count}']`
6. `static eventClassMap(): array` -- returns `[EventClass::class => self::Case, ...]` mapping domain event classes to trigger types. Used by `RuleEventDataExtractor`.

---

### T002 [P] Create 6 supporting enums

**Files**: All in `app/Enums/Automation/`
**Story**: US1-US5, US10 | **FR**: FR-005, FR-009, FR-017, FR-018, FR-022

**`RuleActionType.php`** (string enum, 4 cases):
- `send_notification`, `send_email`, `create_task`, `fire_webhook`
- Method: `label(): string`

**`RuleType.php`** (string enum, 2 cases):
- `system`, `custom`
- Method: `label(): string` ("System default", "Custom")

**`RuleMode.php`** (string enum, 3 cases):
- `enabled`, `disabled`, `dry_run`
- Method: `label(): string`

**`RuleOutcome.php`** (string enum, 8 cases):
- `success`, `partial`, `failure`, `skipped`, `dry_run`, `rate_limited`, `timeout`, `circuit_breaker_disabled`
- Method: `label(): string`, `isError(): bool` (returns true for failure, timeout, circuit_breaker_disabled)

**`ConditionOperator.php`** (string enum, 10 cases):
- `equals`, `not_equals`, `greater_than`, `greater_than_or_equal`, `less_than`, `less_than_or_equal`, `contains`, `starts_with`, `is_empty`, `is_not_empty`
- Methods: `label(): string`, `applicableFieldTypes(): array` returning `ConditionFieldType[]` -- see data-model.md "ConditionOperator" table for exact mapping

**`ConditionFieldType.php`** (string enum, 6 cases):
- `text`, `number`, `currency`, `date`, `role`, `boolean`
- Method: `label(): string`

---

### T003 [P] Create 5 migrations

**Files**: `database/migrations/`
**Story**: US1-US5 | **FR**: FR-016

Reference data-model.md for exact column definitions, types, defaults, indexes, and foreign keys.

**`2026_03_22_800001_create_workspace_rules_table.php`**:
- Columns: `id`, `uuid`, `workspace_id` (FK to `workspaces.id`), `name` (string 255), `description` (text nullable), `trigger_type` (string 80), `rule_type` (string 20), `mode` (string 20 default `enabled`), `execution_count` (int default 0), `last_executed_at` (timestamp nullable), `created_by` (FK to `users.id` nullable), `system_key` (string 80 nullable unique), `timestamps`
- Indexes: composite on (`workspace_id`, `trigger_type`), composite on (`workspace_id`, `mode`)
- Foreign keys: `workspace_id` references `workspaces.id` cascade delete, `created_by` references `users.id` set null

**`2026_03_22_800002_create_rule_conditions_table.php`**:
- Columns: `id`, `workspace_rule_id` (FK), `field` (string 80), `operator` (string 30), `value` (text nullable), `field_type` (string 20), `position` (smallint default 0), `timestamps`
- FK: `workspace_rule_id` references `workspace_rules.id` cascade delete
- Index: on `workspace_rule_id`

**`2026_03_22_800003_create_rule_actions_table.php`**:
- Columns: `id`, `workspace_rule_id` (FK), `action_type` (string 30), `config` (jsonb), `position` (smallint default 0), `timestamps`
- FK: `workspace_rule_id` references `workspace_rules.id` cascade delete
- Index: on `workspace_rule_id`

**`2026_03_22_800004_create_rule_execution_logs_table.php`**:
- Columns: `id`, `uuid`, `workspace_id` (FK), `workspace_rule_id` (FK nullable), `rule_name` (string 255), `trigger_type` (string 80), `trigger_payload` (text nullable), `conditions_detail` (jsonb nullable), `actions_detail` (jsonb nullable), `outcome` (string 30), `duration_ms` (int nullable), `created_at` (timestamp)
- NO `updated_at` -- log entries are immutable
- FK: `workspace_rule_id` references `workspace_rules.id` set null on delete
- Indexes: composite on (`workspace_id`, `created_at` DESC), on `workspace_rule_id`, composite on (`workspace_id`, `outcome`)

**`2026_03_22_800005_create_rule_templates_table.php`**:
- No `workspace_id` -- central/platform table
- Columns: `id`, `name` (string 255), `description` (text nullable), `category` (string 40), `trigger_type` (string 80), `default_conditions` (jsonb default `[]`), `default_actions` (jsonb default `[]`), `is_active` (boolean default true), `timestamps`
- P2 scope but schema created now for forward compatibility

---

### T004 [P] Create 5 Eloquent models

**Files**: `app/Models/Tenant/` and `app/Models/Central/`
**Story**: US1-US5

**`app/Models/Tenant/WorkspaceRule.php`**:
- Uses `HasUuids` trait BUT only on the `uuid` column: override `uniqueIds()` to return `['uuid']`
- Override `getRouteKeyName()` to return `'uuid'`
- Property: `$fillable = ['workspace_id', 'name', 'description', 'trigger_type', 'rule_type', 'mode', 'execution_count', 'last_executed_at', 'created_by', 'system_key']`
- Casts: `trigger_type` => `RuleTriggerType::class`, `rule_type` => `RuleType::class`, `mode` => `RuleMode::class`, `last_executed_at` => `'datetime'`
- Relationships: `conditions(): HasMany(RuleCondition)`, `actions(): HasMany(RuleAction)`, `executionLogs(): HasMany(RuleExecutionLog)`, `workspace(): BelongsTo(Workspace)`, `creator(): BelongsTo(User, 'created_by')`
- Scopes: `scopeForWorkspace($q, int $wsId)`, `scopeEnabled($q)` (where mode = enabled), `scopeForTrigger($q, RuleTriggerType $type)`, `scopeSystem($q)`, `scopeCustom($q)`
- Global scope: workspace_id scoping consistent with all other tenant models

**`app/Models/Tenant/RuleCondition.php`**:
- `$fillable = ['workspace_rule_id', 'field', 'operator', 'value', 'field_type', 'position']`
- Casts: `operator` => `ConditionOperator::class`, `field_type` => `ConditionFieldType::class`
- Relationship: `rule(): BelongsTo(WorkspaceRule)`

**`app/Models/Tenant/RuleAction.php`**:
- `$fillable = ['workspace_rule_id', 'action_type', 'config', 'position']`
- Casts: `action_type` => `RuleActionType::class`, `config` => `'array'`
- Relationship: `rule(): BelongsTo(WorkspaceRule)`

**`app/Models/Tenant/RuleExecutionLog.php`**:
- Uses `HasUuids` on `uuid` column only (override `uniqueIds()`)
- Override `getRouteKeyName()` => `'uuid'`
- `$fillable = ['workspace_id', 'workspace_rule_id', 'rule_name', 'trigger_type', 'trigger_payload', 'conditions_detail', 'actions_detail', 'outcome', 'duration_ms']`
- Casts: `trigger_type` => `RuleTriggerType::class`, `outcome` => `RuleOutcome::class`, `conditions_detail` => `'array'`, `actions_detail` => `'array'`
- NO `updated_at`: set `const UPDATED_AT = null`
- Relationships: `rule(): BelongsTo(WorkspaceRule)` (nullable), `workspace(): BelongsTo(Workspace)`

**`app/Models/Central/RuleTemplate.php`**:
- No `workspace_id` -- central model
- `$fillable = ['name', 'description', 'category', 'trigger_type', 'default_conditions', 'default_actions', 'is_active']`
- Casts: `trigger_type` => `RuleTriggerType::class`, `default_conditions` => `'array'`, `default_actions` => `'array'`, `is_active` => `'boolean'`

---

### T005 [P] Create Spatie Data DTOs

**Files**: `app/Data/Automation/`
**Story**: US2, US10 | **FR**: FR-007, FR-019

**`RuleConditionData.php`**:
```php
class RuleConditionData extends Data
{
    public function __construct(
        public readonly string $field,
        public readonly string $operator,    // ConditionOperator value
        public readonly ?string $value,      // nullable for is_empty/is_not_empty
        public readonly string $field_type,  // ConditionFieldType value
        public readonly int $position = 0,
    ) {}
}
```
- Validation in `rules()`: `field` required string max:80, `operator` required in ConditionOperator values, `value` nullable string, `field_type` required in ConditionFieldType values, `position` integer min:0
- Custom validation: validate `operator` is applicable to `field_type` (call `ConditionOperator::from($operator)->applicableFieldTypes()`)

**`RuleActionData.php`**:
```php
class RuleActionData extends Data
{
    public function __construct(
        public readonly string $action_type,  // RuleActionType value
        public readonly array $config,
        public readonly int $position = 0,
    ) {}
}
```
- Validation in `rules()`: `action_type` required in RuleActionType values, `config` required array, `position` integer min:0
- Custom validation: validate `config` schema per `action_type` -- `send_notification` requires `title` (string), `body` (string), at least one of `recipient_roles`/`recipient_user_ids`/`recipient_actor`; `send_email` requires `subject`, `body_template`, at least one recipient field; `create_task` requires `title`; `fire_webhook` requires either `webhook_endpoint_id` (when mode=`existing_endpoint`) or `custom_url` (when mode=`custom_url`)

**`ActionResult.php`** (value object, not Spatie Data):
```php
class ActionResult
{
    public function __construct(
        public readonly bool $success,
        public readonly ?string $error = null,
    ) {}

    public static function ok(): self { return new self(true); }
    public static function fail(string $error): self { return new self(false, $error); }
}
```
- File: `app/Data/Automation/ActionResult.php`

---

## Phase 2: Rule Engine Core (Evaluation + Actions)

**Goal**: The engine that evaluates rules and dispatches actions. Heart of the system.

---

### T006 Create `RuleEventDataExtractor` service

**File**: `app/Services/Automation/RuleEventDataExtractor.php`
**Story**: US4, US10 | **FR**: FR-006, FR-008

**Purpose**: Accepts any domain event, maps it to a `RuleTriggerType`, extracts a flat associative array payload.

**Class signature**:
```php
class RuleEventDataExtractor
{
    public function extract(object $event): ?array
    // Returns ['trigger_type' => RuleTriggerType, 'workspace_id' => int, 'payload' => array] or null
```

**Implementation**:

1. Call `RuleTriggerType::eventClassMap()` to find matching trigger type. Return `null` if event class not registered.
2. Extract `workspace_id` from the event object (all domain events carry `$workspaceId`).
3. Build the flat payload by switching on trigger type. For each trigger type, load the relevant model and extract condition fields + placeholder tokens into a flat array.

**Payload extraction per trigger type** (representative examples):

- `je_submitted`: Load `JournalEntry` by `$event->aggregateRootUuid()` and workspace. Extract: `amount` (int cents from `total_amount`), `reference` (string), `line_count` (int), `triggering_user_role` (look up `$event->submittedBy` role in workspace), `actor_name` (User name)
- `invoice_paid`: Load `Invoice` by aggregate UUID with `contact`. Extract: `amount` (int cents), `contact_name`, `invoice_number`, `payment_method` (from event)
- `invoice_overdue`: Extract: `amount`, `contact_name`, `invoice_number`, `days_overdue`
- `bank_feed_synced`: Extract from event properties: `imported_count`, `unmatched_count`, `bank_account_name`
- `task_shared`: Load `PracticeTask`. Extract: `task_title`, `actor_name`
- `task_comment_practice` / `task_comment_client`: Load `PracticeTask`. Extract: `task_title`, `commenter_name`, `task_visibility`
- `signing_*` triggers: Extract: `document_title`, `signer_name`, `actor_name`

4. Always inject common payload keys: `workspace_name` (load from Workspace model), `trigger_label` (from `$triggerType->label()`).

**Depends on**: T001 (RuleTriggerType enum)

---

### T007 Create `ConditionEvaluator` service

**File**: `app/Services/Automation/ConditionEvaluator.php`
**Story**: US10 | **FR**: FR-004, FR-005, FR-007, FR-008

**Class signature**:
```php
class ConditionEvaluator
{
    /**
     * @param  Collection<RuleCondition>  $conditions
     * @param  array<string, mixed>       $payload
     * @return array{matched: bool, details: array}
     */
    public function evaluate(Collection $conditions, array $payload): array
```

**Implementation**:

1. If `$conditions` is empty, return `['matched' => true, 'details' => []]` (no conditions = always match, FR-004).
2. Iterate each condition. For each:
   a. Get `$actual = $payload[$condition->field] ?? null`
   b. Cast `$condition->value` and `$actual` based on `$condition->field_type`:
      - `ConditionFieldType::Number`, `ConditionFieldType::Currency` => cast both to `int` (never float -- cents)
      - `ConditionFieldType::Date` => parse both with `Carbon::parse()`
      - `ConditionFieldType::Boolean` => cast to bool (`"true"` => true)
      - `ConditionFieldType::Text`, `ConditionFieldType::Role` => keep as string
   c. Evaluate operator:
      - `equals`: `$actual === $expected` (type-aware after cast)
      - `not_equals`: `$actual !== $expected`
      - `greater_than`: `$actual > $expected` (number/currency/date only)
      - `greater_than_or_equal`: `$actual >= $expected`
      - `less_than`: `$actual < $expected`
      - `less_than_or_equal`: `$actual <= $expected`
      - `contains`: `str_contains((string)$actual, (string)$expected)` (text only, case-insensitive)
      - `starts_with`: `str_starts_with((string)$actual, (string)$expected)` (text only, case-insensitive)
      - `is_empty`: `$actual === null || $actual === ''`
      - `is_not_empty`: `$actual !== null && $actual !== ''`
   d. Record detail: `['field' => $condition->field, 'operator' => $condition->operator->value, 'expected' => $condition->value, 'actual' => $actual, 'matched' => $result]`
3. AND logic: all must match. Return `['matched' => $allMatched, 'details' => $details]`.

**Depends on**: T002 (ConditionOperator, ConditionFieldType enums)

---

### T008 Create `PlaceholderResolver` service

**File**: `app/Services/Automation/PlaceholderResolver.php`
**Story**: US2, US4 | **FR**: FR-036, FR-037, FR-038

**Class signature**:
```php
class PlaceholderResolver
{
    public function resolve(string $template, array $payload): string
```

**Implementation**:

1. Find all `{token_name}` patterns in `$template` using `preg_match_all('/\{(\w+)\}/', $template, $matches)`.
2. For each token: look up `$payload[$tokenName]`. If found, replace. If not found, replace with empty string (FR-038).
3. For currency values (keys containing `amount`): format as `$X,XXX.XX` using `number_format($value / 100, 2)` with `$` prefix.
4. Return the resolved string.

**Depends on**: None (standalone utility)

---

### T009 [P] Create `ActionExecutorInterface`

**File**: `app/Services/Automation/ActionExecutors/ActionExecutorInterface.php`
**Story**: US2 | **FR**: FR-009

```php
namespace App\Services\Automation\ActionExecutors;

use App\Data\Automation\ActionResult;
use App\Models\Tenant\RuleAction;
use App\Models\Tenant\WorkspaceRule;

interface ActionExecutorInterface
{
    public function execute(RuleAction $action, array $payload, WorkspaceRule $rule): ActionResult;
}
```

---

### T010 Create `NotificationActionExecutor`

**File**: `app/Services/Automation/ActionExecutors/NotificationActionExecutor.php`
**Story**: US2, US4 | **FR**: FR-011

**Implementation**:

1. Read `$action->config`: `recipient_roles` (array of role strings), `recipient_user_ids` (array of ints), `recipient_actor` (bool), `title` (string), `body` (string).
2. Resolve recipients:
   a. If `recipient_roles` set: query workspace users by role (`$workspace->users` pivot where role in `$recipientRoles`).
   b. If `recipient_user_ids` set: load `User::whereIn('id', $ids)`, verify they belong to the workspace.
   c. If `recipient_actor` is true and payload contains `actor_id`: add the actor user.
   d. Deduplicate by user ID. Exclude actor if config includes `exclude_actor: true`.
3. Resolve placeholder tokens in `title` and `body` via `PlaceholderResolver::resolve()`.
4. For each recipient: call `CreateNotification::run(workspaceId: $rule->workspace_id, userId: $recipient->id, type: NotificationType::from($rule->trigger_type->value), title: $resolvedTitle, body: $resolvedBody, actorId: $payload['actor_id'] ?? null)`.
5. Return `ActionResult::ok()` or `ActionResult::fail($error)`.

**Dependencies**: `PlaceholderResolver` (T008), `CreateNotification` action (existing at `app/Actions/Notifications/CreateNotification.php`), `NotificationType` enum (existing at `app/Enums/NotificationType.php`)

---

### T011 Create `EmailActionExecutor`

**File**: `app/Services/Automation/ActionExecutors/EmailActionExecutor.php`
**Story**: US2 | **FR**: FR-012

**Implementation**:

1. Read `$action->config`: `recipient_roles`, `recipient_user_ids`, `recipient_actor`, `subject`, `body_template`.
2. Resolve recipients same as T010.
3. Resolve placeholders in `subject` and `body_template` via `PlaceholderResolver`.
4. For each recipient: call `NotificationMailer::send()` (existing at `app/Services/NotificationMailer.php`).
5. Automation emails bypass `NotificationPreference` category check (FR-012 -- the rule IS the opt-in).
6. Return `ActionResult::ok()` or `ActionResult::fail()`.

**Dependencies**: `PlaceholderResolver` (T008), `NotificationMailer` (existing at `app/Services/NotificationMailer.php`)

---

### T012 Create `TaskActionExecutor`

**File**: `app/Services/Automation/ActionExecutors/TaskActionExecutor.php`
**Story**: US2 | **FR**: FR-013, FR-035

**Implementation**:

1. Read `$action->config`: `title`, `description`, `assignee_mode` (one of `practice_owner`, `task_assignee`, `specific_user`), optional `assignee_user_id`.
2. Resolve placeholders in `title` and `description` via `PlaceholderResolver`.
3. Find linked practice: query `PracticeMemberAssignment` (existing at `app/Models/Central/PracticeMemberAssignment.php`) where `workspace_id = $rule->workspace_id`. If none found, return `ActionResult::fail('No practice linked to workspace')`.
4. Duplicate suppression (FR-035): check `PracticeTask::where('title', $resolvedTitle)->where('workspace_id', $rule->workspace_id)->whereNotIn('status', ['completed', 'cancelled'])->exists()`. If true, return `ActionResult::fail('Duplicate task suppressed')`.
5. Resolve assignee based on `assignee_mode`:
   - `practice_owner`: find practice owner from `PracticeMemberAssignment`
   - `task_assignee`: use `$payload['assignee_id']` if present
   - `specific_user`: use `$action->config['assignee_user_id']`
6. Create `PracticeTask` (existing at `app/Models/Central/PracticeTask.php`) with the resolved fields.
7. Return `ActionResult::ok()`.

**Dependencies**: `PlaceholderResolver` (T008), `PracticeMemberAssignment` model, `PracticeTask` model

---

### T013 Create `WebhookActionExecutor`

**File**: `app/Services/Automation/ActionExecutors/WebhookActionExecutor.php`
**Story**: US2 | **FR**: FR-014

**Implementation**:

1. Read `$action->config`: `mode` (`existing_endpoint` or `custom_url`), `webhook_endpoint_id`, `custom_url`, `custom_secret`.
2. If `mode === 'existing_endpoint'`: load `WebhookEndpoint` (existing at `app/Models/Tenant/WebhookEndpoint.php`) by ID. Get URL and secret from it.
3. If `mode === 'custom_url'`: use `custom_url` and `custom_secret` directly.
4. Build JSON payload: `['event_type' => $rule->trigger_type->value, 'timestamp' => now()->toIso8601String(), 'workspace_id' => $rule->workspace_id, 'data' => $payload]`.
5. Send HTTP POST via `Http::timeout(10)->withHeaders([...optional signature header...])->post($url, $jsonPayload)`.
6. If signature secret provided: add `X-Webhook-Signature` header with HMAC-SHA256 of payload body.
7. Log delivery status.
8. Return `ActionResult::ok()` on 2xx, `ActionResult::fail("HTTP {$status}: {$body}")` otherwise.

**Dependencies**: `WebhookEndpoint` model (existing)

---

### T014 Create `RuleEngine` service (orchestrator)

**File**: `app/Services/Automation/RuleEngine.php`
**Story**: US1-US5, US10 | **FR**: FR-003, FR-016, FR-027

**Class signature**:
```php
class RuleEngine
{
    public function __construct(
        private RuleEventDataExtractor $extractor,
    ) {}

    public function handleEvent(object $event): void
```

**Implementation**:

1. Call `$this->extractor->extract($event)`. If `null` (event not mapped to any trigger), return.
2. Extract `$triggerType`, `$workspaceId`, `$payload` from the result.
3. Query matching rules: `WorkspaceRule::forWorkspace($workspaceId)->forTrigger($triggerType)->enabled()->get()` (FR-003, NFR-003).
4. For each matching rule: dispatch `EvaluateRule` as a queued job, passing `$rule->id` and `$payload`.
5. In test environments (`app()->environment('testing')`): dispatch synchronously via `EvaluateRule::run()` instead of queueing.

**Depends on**: T006 (RuleEventDataExtractor), T004 (WorkspaceRule model)

---

### T015 Create `EvaluateRule` action

**File**: `app/Actions/Automation/EvaluateRule.php`
**Story**: US1-US5, US10 | **FR**: FR-008, FR-015, FR-022

**Pattern**: Lorisleiva Action with `AsAction` trait. Also implements `ShouldQueue` for queue dispatch.

**Class signature**:
```php
class EvaluateRule
{
    use AsAction;

    public function handle(int $ruleId, array $payload): void
```

**Implementation**:

1. Start timer: `$start = microtime(true)`.
2. Load `$rule = WorkspaceRule::with(['conditions', 'actions'])->find($ruleId)`. If not found, return (rule deleted between dispatch and execution).
3. If `$rule->mode === RuleMode::Disabled`, return (should not happen but defensive).
4. Call `ConditionEvaluator::evaluate($rule->conditions, $payload)`. Get `$conditionResult`.
5. **If conditions do NOT match**: write `RuleExecutionLog` with outcome `RuleOutcome::Skipped`, include `conditions_detail`. Increment `execution_count` and set `last_executed_at`. Return.
6. **If mode is `dry_run`**: write log with outcome `RuleOutcome::DryRun`, include what actions *would* have run. Return.
7. **If conditions match and mode is `enabled`**: iterate `$rule->actions()->orderBy('position')->get()`. For each action:
   a. Resolve the executor via action type: map `RuleActionType` to the corresponding `ActionExecutorInterface` implementation (use a `match` statement or service container binding).
   b. Call `$executor->execute($action, $payload, $rule)`.
   c. Record result in `$actionsDetail[]`: `['action_type' => $action->action_type->value, 'position' => $action->position, 'outcome' => $result->success ? 'success' : 'failure', 'error' => $result->error]`.
   d. Each action is independent -- a failure in one does NOT prevent others (FR-015).
8. Determine overall outcome: all success => `RuleOutcome::Success`, all failure => `RuleOutcome::Failure`, mixed => `RuleOutcome::Partial`.
9. Write `RuleExecutionLog`: `rule_name` (snapshot), `trigger_type`, `trigger_payload` (JSON-encode payload, truncate to 2000 chars), `conditions_detail`, `actions_detail`, `outcome`, `duration_ms` (elapsed time).
10. Increment `$rule->execution_count` and set `$rule->last_executed_at = now()`.
11. Wrap the entire handler in a 30-second timeout (`pcntl_alarm` or try/catch with timeout). On timeout: write log with outcome `RuleOutcome::Timeout`.

**Depends on**: T004 (models), T007 (ConditionEvaluator), T009-T013 (action executors)

---

### T016 Create `RuleEngineListener`

**File**: `app/Listeners/Automation/RuleEngineListener.php`
**Story**: US4 | **FR**: FR-027

**Pattern**: Universal event subscriber.

**Implementation**:

```php
class RuleEngineListener implements ShouldSubscribe
{
    public function __construct(private RuleEngine $ruleEngine) {}

    public function subscribe(Dispatcher $events): array
    {
        // Map ALL domain event classes to handleEvent()
        $map = [];
        foreach (RuleTriggerType::eventClassMap() as $eventClass => $triggerType) {
            $map[$eventClass] = 'handleEvent';
        }
        return $map;
    }

    public function handleEvent(object $event): void
    {
        $workspaceId = $this->extractWorkspaceId($event);
        if (!$workspaceId) return;

        // Feature flag check -- only process if workflow_automation is ON
        $workspace = Workspace::find($workspaceId);
        if (!$workspace || !Feature::for($workspace)->active('workflow_automation')) {
            return; // Old listeners handle this
        }

        $this->ruleEngine->handleEvent($event);
    }

    private function extractWorkspaceId(object $event): ?int
    {
        return $event->workspaceId ?? null;
    }
}
```

**Depends on**: T014 (RuleEngine), T001 (RuleTriggerType::eventClassMap)

---

## Phase 3: CRUD API (US1, US2, US3)

**Goal**: REST API for rule management. 10 endpoints, policy, form requests, resources.

---

### T017 Create `WorkspaceRulePolicy`

**File**: `app/Policies/WorkspaceRulePolicy.php`
**Story**: US1, US2, US3 | **FR**: FR-021

**Methods**:
- `viewAny(User $user): bool` => `$user->hasPermissionTo('automation-rule.view')`
- `view(User $user, WorkspaceRule $rule): bool` => `$user->hasPermissionTo('automation-rule.view')`
- `create(User $user): bool` => `$user->hasPermissionTo('automation-rule.manage')`
- `update(User $user, WorkspaceRule $rule): bool` => `$user->hasPermissionTo('automation-rule.manage')`
- `delete(User $user, WorkspaceRule $rule): bool` => `$user->hasPermissionTo('automation-rule.manage') && $rule->rule_type === RuleType::Custom` (system rules cannot be deleted, FR-017)
- `toggle(User $user, WorkspaceRule $rule): bool` => `$user->hasPermissionTo('automation-rule.manage')`

**Register** in `app/Providers/AppServiceProvider.php`: `Gate::policy(WorkspaceRule::class, WorkspaceRulePolicy::class);`

---

### T018 Create Form Requests

**Files**: `app/Http/Requests/Automation/`
**Story**: US2, US3 | **FR**: FR-019

**`StoreAutomationRuleRequest.php`**:
- `authorize()`: `return $this->user()->can('create', WorkspaceRule::class)`
- `rules()`:
  - `name` => `required|string|max:255`
  - `trigger_type` => `required|string` (must be valid `RuleTriggerType` value AND `isAvailable() === true`)
  - `mode` => `sometimes|string` (valid `RuleMode` value, default `enabled`)
  - `conditions` => `sometimes|array`
  - `conditions.*` => validated via `RuleConditionData::rules()`
  - `actions` => `required|array|min:1`
  - `actions.*` => validated via `RuleActionData::rules()`
- Custom `after()` validation: validate each condition's `field` against `RuleTriggerType::from($triggerType)->conditionFields()` (only fields registered for that trigger type are allowed)

**`UpdateAutomationRuleRequest.php`**:
- `authorize()`: pre-load rule via `WorkspaceRule::where('uuid', $this->route('uuid'))->where('workspace_id', $this->input('workspace_id'))->firstOrFail()`, stash on `$this->attributes->set('workspaceRule', $rule)`, return `$this->user()->can('update', $rule)`
- `rules()`: same as Store but all fields `sometimes` (partial updates allowed)
- Same `after()` validation for conditions

---

### T019 Create API Resources

**Files**: `app/Http/Resources/`
**Story**: US1, US2, US3, US5

**`AutomationRuleResource.php`** (list view):
```php
return [
    'uuid' => $this->uuid,
    'name' => $this->name,
    'trigger_type' => $this->trigger_type->value,
    'trigger_label' => $this->trigger_type->label(),
    'trigger_category' => $this->trigger_type->category(),
    'rule_type' => $this->rule_type->value,
    'rule_type_label' => $this->rule_type->label(),
    'mode' => $this->mode->value,
    'mode_label' => $this->mode->label(),
    'execution_count' => $this->execution_count,
    'last_executed_at' => $this->last_executed_at?->toIso8601String(),
    'created_at' => $this->created_at->toIso8601String(),
];
```

**`AutomationRuleDetailResource.php`** (full detail):
- Extends list fields with: `description`, `conditions` (array of `{field, operator, value, field_type, position}`), `actions` (array of `{action_type, config, position}`), `system_key`, `created_by` (user name if loaded)

**`RuleExecutionLogResource.php`**:
```php
return [
    'uuid' => $this->uuid,
    'rule_name' => $this->rule_name,
    'rule_uuid' => $this->rule?->uuid,
    'trigger_type' => $this->trigger_type->value,
    'trigger_label' => $this->trigger_type->label(),
    'outcome' => $this->outcome->value,
    'outcome_label' => $this->outcome->label(),
    'duration_ms' => $this->duration_ms,
    'created_at' => $this->created_at->toIso8601String(),
    'conditions_detail' => $this->conditions_detail,
    'actions_detail' => $this->actions_detail,
    'trigger_payload' => $this->trigger_payload,
];
```

**`TriggerTypeResource.php`**:
```php
return [
    'value' => $this->value,
    'label' => $this->label(),
    'category' => $this->category(),
    'available' => $this->isAvailable(),
    'condition_fields' => $this->conditionFields(),
    'placeholder_tokens' => $this->placeholderTokens(),
];
```

---

### T020 Create CRUD Actions

**Files**: `app/Actions/Automation/`
**Story**: US1, US2, US3

**`CreateWorkspaceRule.php`** (Lorisleiva Action with `AsAction`):
- `handle(array $validated, int $workspaceId, ?int $createdBy): WorkspaceRule`
- Wrap in `DB::transaction()`:
  1. Create `WorkspaceRule` with: `workspace_id`, `name`, `description`, `trigger_type`, `rule_type` => `RuleType::Custom`, `mode` (default `enabled`), `created_by`.
  2. Create `RuleCondition` rows from `$validated['conditions']` array.
  3. Create `RuleAction` rows from `$validated['actions']` array.
- Return the rule with relationships loaded.

**`UpdateWorkspaceRule.php`**:
- `handle(WorkspaceRule $rule, array $validated): WorkspaceRule`
- Wrap in `DB::transaction()`:
  1. Update rule attributes (name, description, trigger_type if changed, mode).
  2. Delete-and-recreate conditions: `$rule->conditions()->delete()`, then create new rows from `$validated['conditions']`.
  3. Delete-and-recreate actions: `$rule->actions()->delete()`, then create new rows from `$validated['actions']`.
- Return refreshed rule.

**`DeleteWorkspaceRule.php`**:
- `handle(WorkspaceRule $rule): void`
- Guard: if `$rule->rule_type === RuleType::System`, throw `\DomainException('System rules cannot be deleted')`.
- Delete the rule (cascade deletes conditions + actions).

**`ToggleWorkspaceRule.php`**:
- `handle(WorkspaceRule $rule, RuleMode $newMode): WorkspaceRule`
- Update `$rule->mode = $newMode` and save.
- Return the updated rule.

---

### T021 Create `AutomationRuleController`

**File**: `app/Http/Controllers/Api/AutomationRuleController.php`
**Story**: US1, US2, US3, US5

**Endpoints** (10 total):

**`index(Request $request)`**: `GET automation-rules`
- `Gate::authorize('viewAny', WorkspaceRule::class)`
- Query `WorkspaceRule::forWorkspace($request->workspace_id)` with optional filters: `?search=` (name/trigger_type LIKE), `?rule_type=` (system/custom), `?mode=` (enabled/disabled/dry_run)
- Paginate at 25 per page
- Return `AutomationRuleResource::collection($rules)`

**`store(StoreAutomationRuleRequest $request)`**: `POST automation-rules`
- Call `CreateWorkspaceRule::run($request->validated(), $request->workspace_id, $request->user()->id)`
- Return `new AutomationRuleDetailResource($rule)` with 201 status

**`show(Request $request, string $uuid)`**: `GET automation-rules/{uuid}`
- Load `WorkspaceRule` by UUID and workspace_id, with conditions + actions
- `Gate::authorize('view', $rule)`
- Return `new AutomationRuleDetailResource($rule)`

**`update(UpdateAutomationRuleRequest $request, string $uuid)`**: `PATCH automation-rules/{uuid}`
- Retrieve pre-loaded rule from `$request->attributes->get('workspaceRule')`
- Call `UpdateWorkspaceRule::run($rule, $request->validated())`
- Return `new AutomationRuleDetailResource($rule)`

**`destroy(Request $request, string $uuid)`**: `DELETE automation-rules/{uuid}`
- Load rule by UUID, `Gate::authorize('delete', $rule)`
- Call `DeleteWorkspaceRule::run($rule)`
- Return 204

**`toggle(Request $request, string $uuid)`**: `PATCH automation-rules/{uuid}/toggle`
- Load rule, `Gate::authorize('toggle', $rule)`
- Validate `$request->input('mode')` as valid `RuleMode`
- Call `ToggleWorkspaceRule::run($rule, RuleMode::from($request->mode))`
- Return `new AutomationRuleResource($rule)`

**`triggerTypes()`**: `GET automation-rules/trigger-types`
- `Gate::authorize('viewAny', WorkspaceRule::class)`
- Return all `RuleTriggerType::cases()` via `TriggerTypeResource::collection()`

**`executionLog(Request $request)`**: `GET automation-rules/execution-log`
- `Gate::authorize('viewAny', WorkspaceRule::class)`
- Query `RuleExecutionLog::where('workspace_id', $request->workspace_id)` with optional filters: `?rule_uuid=` (filter by rule), `?outcome=`, `?from=` / `?to=` (date range)
- Order by `created_at DESC`, paginate at 50
- Return `RuleExecutionLogResource::collection()`

**`executionLogDetail(Request $request, string $uuid)`**: `GET automation-rules/execution-log/{uuid}`
- Load log by UUID and workspace_id
- Return `new RuleExecutionLogResource($log)`

**`counts(Request $request)`**: `GET automation-rules/counts`
- `Gate::authorize('viewAny', WorkspaceRule::class)`
- Query grouped counts: `WorkspaceRule::forWorkspace($wsId)->selectRaw("rule_type, mode, count(*) as count")->groupBy('rule_type', 'mode')->get()`
- Return shaped for StatusTabs: `['all' => $total, 'system' => $systemCount, 'custom' => $customCount, 'disabled' => $disabledCount]`

---

## Phase 4: System Default Migration (US4)

**Goal**: Seed 14 system default rules replicating exact behaviour of 13 hardcoded listeners.

---

### T022 Create `SystemDefaultRulesSeeder`

**File**: `database/seeders/SystemDefaultRulesSeeder.php`
**Story**: US4 | **FR**: FR-025, FR-026

**Class structure**:
```php
class SystemDefaultRulesSeeder extends Seeder
{
    public function run(): void
    {
        // For standalone artisan command: iterate all workspaces
        Workspace::each(fn ($ws) => $this->runForWorkspace($ws));
    }

    public function runForWorkspace(Workspace $workspace): void
    {
        foreach ($this->systemDefaults() as $def) {
            // Idempotent via system_key
            if (WorkspaceRule::where('workspace_id', $workspace->id)
                ->where('system_key', $def['system_key'])->exists()) {
                continue;
            }
            // Create rule + conditions + actions
        }
    }
}
```

**14 system default rules** (map exactly from plan.md Phase 5, task 25):

| # | system_key | trigger_type | Notification title | Body template | Recipient logic |
|---|---|---|---|---|---|
| 1 | `je_submitted_notify_approvers` | `je_submitted` | "Journal entry awaiting approval" | "JE #{reference} submitted by {actor_name}" | Role: approver (exclude actor) |
| 2 | `je_approved_notify_submitter` | `je_approved` | "Journal entry approved" | "JE #{reference} has been approved" | Actor (the submitter, from event) |
| 3 | `je_rejected_notify_submitter` | `je_rejected` | "Journal entry rejected" | "JE #{reference} has been rejected" | Actor (the submitter) |
| 4 | `invoice_sent_notify_sender` | `invoice_sent` | "Invoice sent" | "Invoice #{invoice_number} sent to {contact_name}" | Actor (the sender) |
| 5 | `invoice_paid_notify_owners` | `invoice_paid` | "Invoice #{invoice_number} paid" | "{amount} received from {contact_name}" | Roles: owner, accountant + entity creator (`recipient_actor: true`) |
| 6 | `bank_feed_synced_notify_owners` | `bank_feed_synced` | "Bank feed synced" | "{imported_count} transactions imported, {unmatched_count} unmatched" | Roles: owner, accountant |
| 7 | `bank_feed_error_notify_owners` | `bank_feed_error` | "Bank feed error" | "{error_message}" | Roles: owner, accountant |
| 8 | `task_shared_notify_workspace` | `task_shared` | "New task from your accountant" | "{task_title}" | Roles: owner, accountant |
| 9 | `client_task_completed_notify_practice` | `client_task_completed` | "Client completed task" | "{task_title}" | Task assignee or creator (via config `assignee_mode: task_assignee`) |
| 10 | `client_request_submitted_notify_practice` | `client_request_submitted` | "Client request submitted" | "{request_title}" | Assigned practice members (fallback: practice owners) |
| 11 | `client_request_status_changed_notify_creator` | `client_request_status_changed` | "Request status updated" | "{request_title} is now {new_status}" | Request creator (via `recipient_actor: true`) |
| 12 | `task_comment_practice_notify_workspace` | `task_comment_practice` | "New comment on task" | "A comment was added to \"{task_title}\"" | Roles: owner, accountant (exclude commenter) |
| 13 | `task_comment_client_notify_practice` | `task_comment_client` | "Client commented on task" | "A client added a comment to \"{task_title}\"" | Task assignee or creator (exclude commenter) |
| 14 | `job_share_viewed_notify_creator` | `job_share_viewed` | "Job share viewed" | (stub -- unavailable trigger) | Token creator |

All rules created with `rule_type: system`, `mode: enabled` (except #14 which is `disabled` because trigger is unavailable).

---

### T023 Integrate seeder into workspace provisioning

**File**: `app/Actions/Workspace/CreateWorkspace.php`
**Story**: US4 | **FR**: FR-026

**Change**: At the end of the `handle()` method, after workspace creation and CoA seeding, add:
```php
(new \Database\Seeders\SystemDefaultRulesSeeder)->runForWorkspace($workspace);
```

This ensures every new workspace gets the 14 system defaults automatically.

Also update `database/seeders/DemoPersonasSeeder.php`: after demo workspace creation, call `SystemDefaultRulesSeeder::runForWorkspace()` for each demo workspace.

---

## Phase 5: Condition Operators (US10)

**Goal**: Ensure all 10 operators work correctly with all 6 field types. This phase is primarily tested (the logic lives in T007 ConditionEvaluator).

---

### T024 Validate operator-field type compatibility matrix

**Verification task** (no new file -- validates T007 implementation)
**Story**: US10 | **FR**: FR-005, FR-007

Verify `ConditionOperator::applicableFieldTypes()` returns correct types per operator:

| Operator | text | number | currency | date | role | boolean |
|----------|------|--------|----------|------|------|---------|
| `equals` | Y | Y | Y | Y | Y | Y |
| `not_equals` | Y | Y | Y | Y | Y | Y |
| `greater_than` | - | Y | Y | Y | - | - |
| `greater_than_or_equal` | - | Y | Y | Y | - | - |
| `less_than` | - | Y | Y | Y | - | - |
| `less_than_or_equal` | - | Y | Y | Y | - | - |
| `contains` | Y | - | - | - | - | - |
| `starts_with` | Y | - | - | - | - | - |
| `is_empty` | Y | Y | Y | Y | - | - |
| `is_not_empty` | Y | Y | Y | Y | - | - |

Verify the `StoreAutomationRuleRequest` and `UpdateAutomationRuleRequest` custom `after()` validation rejects conditions where operator is not applicable to field type.

---

## Phase 6: Execution Log (US5)

**Goal**: Log every rule evaluation, provide purge command.

---

### T025 Execution logging in `EvaluateRule`

**(Already handled in T015)** -- this task verifies the log-writing behavior:

Verify `EvaluateRule` writes a `RuleExecutionLog` entry for EVERY evaluation:
- Outcome `success`: all actions ran
- Outcome `partial`: some actions failed
- Outcome `failure`: all actions failed
- Outcome `skipped`: conditions did not match
- Outcome `dry_run`: mode was dry_run
- Outcome `timeout`: 30s exceeded
- `trigger_payload` truncated to 2,000 characters
- `conditions_detail` includes per-condition `{field, operator, expected, actual, matched}`
- `actions_detail` includes per-action `{action_type, position, outcome, error}`
- `duration_ms` is accurate elapsed time

---

### T026 Create `PurgeExecutionLog` action

**File**: `app/Actions/Automation/PurgeExecutionLog.php`
**Story**: US5 | **FR**: FR-023, FR-040

**Pattern**: Lorisleiva Action with `AsAction` trait AND artisan command registration.

```php
class PurgeExecutionLog
{
    use AsAction;

    public string $commandSignature = 'automation:purge-log';
    public string $commandDescription = 'Purge automation execution log entries older than 90 days';

    public function handle(): int
    {
        $cutoff = now()->subDays(90);
        $count = RuleExecutionLog::where('created_at', '<', $cutoff)->delete();
        Log::info("Purged {$count} automation execution log entries older than {$cutoff}");
        return $count;
    }

    public function asCommand(Command $command): void
    {
        $count = $this->handle();
        $command->info("Purged {$count} execution log entries.");
    }
}
```

**Schedule registration** in `routes/console.php`:
```php
Schedule::command('automation:purge-log')->daily();
```

---

## Phase 7: New Domain Events

**Goal**: Introduce proper Laravel events for the 5 controller-invoked listeners, plus bank feed events.

---

### T027 [P] Create 7 new event classes

**Files**: `app/Events/Automation/`
**Story**: US4 | **FR**: FR-039

These are standard Laravel events (NOT Spatie stored events).

**`TaskSharedWithClient.php`**:
```php
class TaskSharedWithClient
{
    public function __construct(
        public readonly int $workspaceId,
        public readonly int $taskId,
        public readonly int $actorId,
    ) {}
}
```

**`ClientTaskCompleted.php`**:
```php
public readonly int $workspaceId,
public readonly int $taskId,
public readonly int $completedById,
```

**`ClientRequestSubmitted.php`**:
```php
public readonly int $workspaceId,
public readonly int $requestId,
public readonly int $submittedById,
```

**`ClientRequestStatusChanged.php`**:
```php
public readonly int $workspaceId,
public readonly int $requestId,
public readonly string $newStatus,
public readonly int $changedById,
```

**`TaskCommentAdded.php`**:
```php
public readonly int $workspaceId,
public readonly int $taskId,
public readonly int $commenterId,
public readonly string $source,  // 'practice' or 'client'
```

**`BankFeedSynced.php`**:
```php
public readonly int $workspaceId,
public readonly int $bankAccountId,
public readonly int $importedCount,
public readonly int $unmatchedCount,
```

**`BankFeedError.php`**:
```php
public readonly int $workspaceId,
public readonly int $bankAccountId,
public readonly string $errorMessage,
```

---

### T028 Dispatch new events from controllers

**Story**: US4 | **FR**: FR-039

**File: `app/Http/Controllers/Api/PracticeTaskController.php`**:
- In `update()` method: after task visibility changes to `shared`, add `event(new TaskSharedWithClient($task->workspace_id, $task->id, auth()->id()))`
- In `completeByClient()` method (or equivalent): add `event(new ClientTaskCompleted($task->workspace_id, $task->id, auth()->id()))`
- In `addComment()` method: add `event(new TaskCommentAdded($task->workspace_id, $task->id, auth()->id(), $isPractice ? 'practice' : 'client'))`

**File: `app/Http/Controllers/Api/ClientRequestController.php`**:
- In `store()` method: add `event(new ClientRequestSubmitted($request->workspace_id, $clientRequest->id, auth()->id()))`
- In `updateStatus()` method: add `event(new ClientRequestStatusChanged($request->workspace_id, $clientRequest->id, $newStatus, auth()->id()))`

**Bank feed sync service** (locate the bank feed sync action/service):
- After successful sync: `event(new BankFeedSynced($workspaceId, $bankAccountId, $importedCount, $unmatchedCount))`
- On sync error: `event(new BankFeedError($workspaceId, $bankAccountId, $errorMessage))`

---

### T029 Update existing 5 directly-called listeners for parallel-run compatibility

**Files**: 5 listeners in `app/Listeners/Notifications/`
**Story**: US4 | **FR**: FR-039

Each listener currently has a `handle()` method accepting model instances (e.g. `handle(PracticeTask $task, int $actorId)`). Add a second `handle()` method overload (or use a single method that accepts both) so they can also be registered as standard event listeners:

**`NotifyOnTaskShared.php`**: Add `handleEvent(TaskSharedWithClient $event): void` that loads PracticeTask and calls existing logic. Original `handle(PracticeTask, int)` preserved for backward compatibility.

**`NotifyOnClientTaskCompleted.php`**: Add `handleEvent(ClientTaskCompleted $event): void`.

**`NotifyOnClientRequestSubmitted.php`**: Add `handleEvent(ClientRequestSubmitted $event): void`.

**`NotifyOnClientRequestStatusChanged.php`**: Add `handleEvent(ClientRequestStatusChanged $event): void`.

**`NotifyOnTaskCommentAdded.php`**: Add `handleEvent(TaskCommentAdded $event): void`.

Each `handleEvent()` method must include the feature flag guard:
```php
public function handleEvent(TaskSharedWithClient $event): void
{
    if (Feature::for(Workspace::find($event->workspaceId))->active('workflow_automation')) {
        return; // Rule engine handles this
    }
    $task = PracticeTask::find($event->taskId);
    if ($task) {
        $this->handle($task, $event->actorId);
    }
}
```

---

## Phase 8: Integration (Wiring)

**Goal**: Connect everything -- EventServiceProvider, permissions, routes, feature flag, policy registration.

---

### T030 Update `EventServiceProvider`

**File**: `app/Providers/EventServiceProvider.php`
**Story**: US4 | **FR**: FR-027

Add the new domain events to the `$listen` array with both old listeners and the universal subscriber:

```php
// Add to $listen array:
TaskSharedWithClient::class => [
    NotifyOnTaskShared::class,  // handleEvent() -- includes feature flag guard
],
ClientTaskCompleted::class => [
    NotifyOnClientTaskCompleted::class,
],
ClientRequestSubmitted::class => [
    NotifyOnClientRequestSubmitted::class,
],
ClientRequestStatusChanged::class => [
    NotifyOnClientRequestStatusChanged::class,
],
TaskCommentAdded::class => [
    NotifyOnTaskCommentAdded::class,
],
BankFeedSynced::class => [
    NotifyOwnersOnBankFeedSynced::class,
],
BankFeedError::class => [
    NotifyOwnersOnBankFeedError::class,
],
```

Register `RuleEngineListener` as a subscriber:
```php
protected $subscribe = [
    RuleEngineListener::class,
];
```

---

### T031 Add feature flag guards to existing 8 event-based listeners

**Files**: 8 listeners in `app/Listeners/Notifications/`
**Story**: US4 | **FR**: FR-027

Add the Pennant feature flag check to the beginning of each existing event-based listener's `handle()` method. These are the listeners already registered in `EventServiceProvider::$listen`:

1. `NotifyApproversOnJeSubmitted.php`
2. `NotifyBookkeeperOnJeApproved.php`
3. `NotifyBookkeeperOnJeRejected.php`
4. `NotifyInvoiceSender.php`
5. `NotifyOwnersOnInvoicePaid.php`
6. `NotifyOwnersOnBankFeedSynced.php`
7. `NotifyOwnersOnBankFeedError.php`
8. `NotifyOnJobShareViewed.php` (currently commented out)

**Pattern** (add to top of each `handle()` method):
```php
$workspace = Workspace::find($event->workspaceId);
if ($workspace && Feature::for($workspace)->active('workflow_automation')) {
    return; // Rule engine handles this
}
```

For listeners that receive `PracticeTask` model instead of events (T029 handles those), this step is not needed -- the `handleEvent()` method already includes the guard.

---

### T032 Add permissions to `RolesAndPermissionsSeeder`

**File**: `database/seeders/RolesAndPermissionsSeeder.php`
**Story**: US1 | **FR**: FR-021

Add two new permissions:

**`allPermissions()` method** -- add after Estate Planning section:
```php
// Automation Rules (066-WFA)
'automation-rule.view',
'automation-rule.manage',
```

**`accountantPermissions()` method** -- add:
```php
// Automation Rules (066-WFA)
'automation-rule.view', 'automation-rule.manage',
```

**`approverPermissions()` method** -- add (read-only):
```php
// Automation Rules (066-WFA) — read only
'automation-rule.view',
```

**`auditorPermissions()` method** -- add (read-only):
```php
// Automation Rules (066-WFA) — read only
'automation-rule.view',
```

**Do NOT add** to `bookkeeperPermissions()` or `clientPermissions()` -- these roles cannot access automation settings.

---

### T033 Register routes in `routes/api.php`

**File**: `routes/api.php`
**Story**: US1-US5

Add inside the existing workspace-scoped middleware group (after `auth:sanctum` + `SetWorkspaceContext`):

```php
// Automation Rules (066-WFA)
Route::prefix('automation-rules')->group(function () {
    Route::get('/', [AutomationRuleController::class, 'index']);
    Route::post('/', [AutomationRuleController::class, 'store']);
    Route::get('counts', [AutomationRuleController::class, 'counts']);
    Route::get('trigger-types', [AutomationRuleController::class, 'triggerTypes']);
    Route::get('execution-log', [AutomationRuleController::class, 'executionLog']);
    Route::get('execution-log/{uuid}', [AutomationRuleController::class, 'executionLogDetail']);
    Route::get('{uuid}', [AutomationRuleController::class, 'show']);
    Route::patch('{uuid}', [AutomationRuleController::class, 'update']);
    Route::delete('{uuid}', [AutomationRuleController::class, 'destroy']);
    Route::patch('{uuid}/toggle', [AutomationRuleController::class, 'toggle']);
});
```

Note: No `feature:workflow_automation` middleware on these routes. The API is always available (rules can be created before the flag is flipped). The flag only controls whether the rule engine processes events.

---

### T034 Register Pennant feature flag

**File**: `app/Providers/AppServiceProvider.php`
**Story**: US4 | **FR**: FR-027

Add alongside existing feature definitions:
```php
Feature::define('workflow_automation', fn () => false);  // OFF by default
```

Register the policy:
```php
Gate::policy(WorkspaceRule::class, WorkspaceRulePolicy::class);
```

---

## Phase 9: Tests

**Goal**: ~110 tests covering all P1 functionality.

---

### T035 [P] Unit tests: `RuleTriggerTypeTest`

**File**: `tests/Unit/Automation/RuleTriggerTypeTest.php`
**Covers**: T001

Tests (~15):
- Each of 25 cases has a non-empty `label()`
- Each case has a valid `category()` (one of the 9 categories)
- `isAvailable()` returns false only for `JobShareViewed`
- `conditionFields()` returns non-empty array for all available triggers
- `conditionFields()` returns valid `ConditionFieldType` for each field
- `placeholderTokens()` returns non-empty array for all triggers
- `eventClassMap()` returns valid event class => enum case mapping
- `eventClassMap()` covers all Spatie event classes (JournalEntrySubmitted, InvoicePaymentReceived, etc.) plus new events (TaskSharedWithClient, etc.)

---

### T036 [P] Unit tests: `ConditionEvaluatorUnitTest`

**File**: `tests/Unit/Automation/ConditionEvaluatorUnitTest.php`
**Covers**: T007, T024

Tests (~35):
- **equals**: text, number, currency (int cents), date (ISO-8601), role, boolean
- **not_equals**: text, number
- **greater_than**: number (50000 > 10000 = true, 5000 > 10000 = false), currency, date (2026-03-22 > 2026-03-01 = true)
- **greater_than_or_equal**: boundary case (equal values = true)
- **less_than**: number, currency, date
- **less_than_or_equal**: boundary case
- **contains**: case-insensitive ("Acme Corp" contains "acme" = true), partial match
- **starts_with**: case-insensitive ("INV-001" starts_with "INV" = true)
- **is_empty**: null => true, empty string => true, non-empty => false
- **is_not_empty**: inverse of above
- **Empty conditions**: returns `matched: true`
- **AND logic**: two conditions, both match => true; one fails => false
- **Null actual value**: field missing from payload, non-empty operator => handle gracefully
- **Type coercion**: currency value stored as "50000" string, compared numerically

---

### T037 [P] Unit tests: `PlaceholderResolverTest`

**File**: `tests/Unit/Automation/PlaceholderResolverTest.php`
**Covers**: T008

Tests (~8):
- Single token replacement: `"{amount}"` => "$1,500.00"
- Multiple tokens: `"JE #{reference} by {actor_name}"` => `"JE #JE-001 by John"`
- Unresolved token => empty string (FR-038): `"{missing}"` => `""`
- No tokens => string unchanged
- Currency formatting: amount key `15000` => `"$150.00"`
- Common tokens injected: `{workspace_name}` and `{trigger_label}` resolved automatically
- Nested braces not treated as tokens: `"{{not_a_token}}"` => `"{not_a_token}"`
- Empty template string => empty string

---

### T038 [P] Feature tests: `AutomationRuleCrudTest`

**File**: `tests/Feature/Automation/AutomationRuleCrudTest.php`
**Covers**: T018-T021

Tests (~20):
- **Create rule**: POST valid payload => 201, rule in DB with conditions + actions
- **Create rule missing trigger**: POST without trigger_type => 422
- **Create rule missing actions**: POST with empty actions => 422
- **Create rule unavailable trigger**: POST with `job_share_viewed` => 422
- **Create rule invalid condition field**: POST condition field not in trigger's conditionFields => 422
- **Create rule invalid operator for field type**: POST `greater_than` on text field => 422
- **List rules**: GET => paginated list with correct shape
- **List rules with search**: GET `?search=invoice` => filtered results
- **List rules by type**: GET `?rule_type=system` => only system rules
- **Show rule detail**: GET /{uuid} => full detail with conditions and actions
- **Update rule**: PATCH /{uuid} with new conditions => 200, conditions replaced
- **Delete custom rule**: DELETE /{uuid} => 204, rule gone
- **Delete system rule blocked**: DELETE /{uuid} of system rule => 403
- **Toggle rule**: PATCH /{uuid}/toggle with `mode: disabled` => mode updated
- **Trigger types endpoint**: GET /trigger-types => 25 types with fields and tokens
- **Counts endpoint**: GET /counts => grouped counts by type/mode
- **Execution log list**: GET /execution-log => paginated
- **Execution log detail**: GET /execution-log/{uuid} => full detail
- **Execution log date filter**: GET /execution-log?from=...&to=... => filtered

---

### T039 [P] Feature tests: `AuthorizationTest`

**File**: `tests/Feature/Automation/AuthorizationTest.php`
**Covers**: T017, T032

Tests (~8):
- Owner can list rules (200)
- Accountant can create rules (201)
- Approver can list but not create (GET 200, POST 403)
- Auditor can list but not create (GET 200, POST 403)
- Bookkeeper denied list (403)
- Client denied list (403)
- Cross-workspace access denied (rule from workspace A not accessible from workspace B headers)
- Unauthenticated user denied (401)

---

### T040 [P] Feature tests: `RuleEngineTest`

**File**: `tests/Feature/Automation/RuleEngineTest.php`
**Covers**: T014, T015, T016

Tests (~15):
- **Rule matches, actions execute**: Create enabled rule for `je_submitted`, dispatch `JournalEntrySubmitted` event with Pennant flag ON, verify notification created for correct recipients
- **Conditions don't match**: Create rule with `amount > 100000`, dispatch event with amount 50000, verify execution log has outcome `skipped`, no notification created
- **Conditions match**: Same rule, amount 150000, verify notification created
- **Dry-run mode**: Set rule to `dry_run`, dispatch event, verify log has outcome `dry_run`, no notification/email/task/webhook created
- **Disabled rule not evaluated**: Set rule to `disabled`, dispatch event, verify no log entry
- **Multiple actions, one fails**: Rule with notification (succeeds) + webhook to bad URL (fails), verify log outcome `partial`, notification created
- **Multiple actions, all succeed**: Rule with notification + email, verify both sent, log outcome `success`
- **Task action skips when no practice**: Rule with create_task action, workspace has no practice link, verify log shows "no practice linked"
- **Task duplicate suppression**: Create incomplete task with same title, fire rule, verify no duplicate task created
- **Webhook action sends POST**: Rule with fire_webhook, verify HTTP::assertSent to correct URL with correct payload
- **Webhook with existing endpoint**: Rule referencing WebhookEndpoint ID, verify correct URL used
- **Execution log written on every outcome**: Verify log entry for success, skipped, partial, failure
- **Execution count incremented**: After evaluation, rule's `execution_count` increases, `last_executed_at` set
- **30-second timeout**: (mock or skip if not practical in test env)
- **Trigger payload truncated**: Large payload truncated to 2000 chars in log

---

### T041 [P] Feature tests: `SystemDefaultMigrationTest`

**File**: `tests/Feature/Automation/SystemDefaultMigrationTest.php`
**Covers**: T022, T023

Tests (~10):
- Fresh workspace gets 14 system default rules
- Each rule has correct `trigger_type`, `system_key`, `rule_type: system`
- Idempotent: running seeder twice produces 14 rules (not 28)
- System default #1 (JE submitted): recipients match old listener (approver role, exclude actor)
- System default #5 (Invoice paid): recipients include owner + accountant + entity creator
- System default #12 (Task comment practice): recipients are owner + accountant, exclude commenter
- System default #13 (Task comment client): recipient is task assignee or creator
- System default #14 (Job share viewed): rule exists but trigger is unavailable, mode is disabled
- System rules cannot be deleted via API
- System rules can be disabled via toggle

---

### T042 [P] Feature tests: `ConditionEvaluatorTest` (integration)

**File**: `tests/Feature/Automation/ConditionEvaluatorTest.php`
**Covers**: T007, T024

Tests (~8):
- Create rule via API with `amount > 100000` condition, trigger `invoice_overdue` event, verify execution log shows condition evaluated with actual vs expected
- Create rule with `contact_name contains "Acme"`, trigger with "Acme Corp" => matches
- Create rule with `contact_name contains "Acme"`, trigger with "Beta Inc" => skipped
- Create rule with `triggering_user_role equals "bookkeeper"`, trigger by owner => skipped
- Create rule with two AND conditions, both match => fires
- Create rule with two AND conditions, one fails => skipped
- Condition with `is_empty` on nullable field => matches when null
- Condition with date comparison: `days_overdue greater_than 30`

---

### T043 [P] Feature tests: `ExecutionLogTest`

**File**: `tests/Feature/Automation/ExecutionLogTest.php`
**Covers**: T025, T026

Tests (~8):
- Log entry created for successful rule execution
- Log entry created for skipped (conditions not matched)
- Pagination at 50 per page
- Date range filter (`from` and `to` query params)
- Outcome filter (`?outcome=success`)
- Rule name filter
- Purge command deletes entries older than 90 days
- Purge command preserves entries newer than 90 days
- Log detail endpoint returns full conditions_detail and actions_detail

---

### T044 [P] Feature tests: `FeatureFlagTest`

**File**: `tests/Feature/Automation/FeatureFlagTest.php`
**Covers**: T031, T034

Tests (~6):
- Flag OFF: old `NotifyApproversOnJeSubmitted` listener fires on `JournalEntrySubmitted`, notification created
- Flag OFF: `RuleEngineListener` does not process the event, no execution log entry
- Flag ON: `RuleEngineListener` processes the event, system default rule fires, notification created
- Flag ON: old `NotifyApproversOnJeSubmitted` returns early, no duplicate notification
- Never both: dispatch event with flag ON, verify exactly one set of notifications (not two)
- Flag ON then OFF: verify toggle works (flip back to old listeners)

---

### T045 [P] Feature tests: `ActionExecutorTest`

**File**: `tests/Feature/Automation/ActionExecutorTest.php`
**Covers**: T010, T011, T012, T013

Tests (~10):
- `NotificationActionExecutor`: creates notification for each recipient_role user
- `NotificationActionExecutor`: resolves placeholder tokens in title and body
- `NotificationActionExecutor`: excludes actor when `exclude_actor: true`
- `EmailActionExecutor`: sends email via NotificationMailer, bypasses category preferences
- `TaskActionExecutor`: creates PracticeTask with correct title and assignee
- `TaskActionExecutor`: skips when no practice linked
- `TaskActionExecutor`: suppresses duplicate task
- `WebhookActionExecutor`: sends HTTP POST with correct payload (use `Http::fake()`)
- `WebhookActionExecutor`: returns failure on non-2xx response
- `WebhookActionExecutor`: uses existing WebhookEndpoint URL when mode is `existing_endpoint`

---

### T046 [P] Feature tests: `NewDomainEventsTest`

**File**: `tests/Feature/Automation/NewDomainEventsTest.php`
**Covers**: T027, T028

Tests (~7):
- `PracticeTaskController::update()` dispatches `TaskSharedWithClient` when visibility changes to shared (use `Event::fake()`)
- `PracticeTaskController::completeByClient()` dispatches `ClientTaskCompleted`
- `PracticeTaskController::addComment()` dispatches `TaskCommentAdded` with correct source
- `ClientRequestController::store()` dispatches `ClientRequestSubmitted`
- `ClientRequestController::updateStatus()` dispatches `ClientRequestStatusChanged` with new status
- Bank feed sync dispatches `BankFeedSynced` with counts
- Bank feed error dispatches `BankFeedError` with message

---

## Summary

| Phase | Tasks | New Files | Modified Files | Est. Tests |
|-------|-------|-----------|----------------|------------|
| 1. Foundation | T001-T005 | 18 (7 enums, 5 migrations, 5 models, 3 DTOs) | 0 | 0 |
| 2. Rule Engine Core | T006-T016 | 10 (4 executors, interface, 3 services, action, listener) | 0 | 0 (tested in P9) |
| 3. CRUD API | T017-T021 | 9 (policy, 2 requests, 4 resources, 3 actions, controller) | 0 | 0 (tested in P9) |
| 4. System Defaults | T022-T023 | 1 (seeder) | 2 (CreateWorkspace, DemoPersonasSeeder) | 0 (tested in P9) |
| 5. Condition Operators | T024 | 0 (verification) | 0 | 0 (tested in P9) |
| 6. Execution Log | T025-T026 | 1 (PurgeExecutionLog) | 1 (console.php) | 0 (tested in P9) |
| 7. New Domain Events | T027-T029 | 7 (events) | 7 (5 listeners, 2 controllers) | 0 (tested in P9) |
| 8. Integration | T030-T034 | 0 | 4 (EventServiceProvider, RolesAndPermissionsSeeder, api.php, AppServiceProvider) | 0 |
| 9. Tests | T035-T046 | 12 (test files) | 0 | ~110 |
| **Total** | **46** | **58** | **14** | **~110** |
