---
title: "Implementation Plan: Workflow Automation & Trigger Rules (P1 Backend)"
---

# Implementation Plan: Workflow Automation & Trigger Rules (P1 Backend)

**Branch**: `066-workflow-automation` | **Date**: 2026-03-22 | **Spec**: `066-WFA-workflow-automation/spec.md`
**Scope**: P1 only (US1, US2, US3, US4, US5, US10) -- backend only, no frontend

---

## Summary

Replace MoneyQuest's 13 hardcoded notification listeners with a configurable, per-workspace automation engine. Each workspace gets system default rules (migrated from existing listeners) that can be customised, disabled, or extended. Users create new rules via the API: "When [trigger] happens, if [conditions] match, then [do actions]."

P1 delivers: the rule engine core, CRUD API, condition evaluation, 4 action executors (notification, email, task, webhook), system default migration of 14 rules, execution logging, and a Pennant feature flag for zero-downtime cutover.

---

## Technical Context

**Language/Version**: PHP 8.4, Laravel 12
**Primary Dependencies**: Lorisleiva Actions, Spatie Event Sourcing v7, Spatie Laravel Data, Laravel Pennant
**Storage**: PostgreSQL (single-database multi-tenancy, `workspace_id` scoping)
**Testing**: Pest v4 (Feature + Unit)
**Constraints**: Rule evaluation must complete < 5 seconds; dispatched via queued job so business operations are not delayed (NFR-001, NFR-002)

---

## Architecture Overview

### High-Level Flow

```
Domain Event (e.g. JournalEntrySubmitted)
    │
    ▼
RuleEngineListener (universal subscriber)
    │  Checks Pennant feature flag -- if OFF, returns immediately (old listeners handle it)
    │  Maps event class to RuleTriggerType enum
    │
    ▼
EvaluateRule (queued job, one per matching rule)
    │  Loads WorkspaceRule + conditions
    │  Calls RuleEventDataExtractor to normalize event payload
    │  Evaluates conditions (AND logic)
    │
    ▼
ExecuteRuleActions (if conditions match)
    │  Iterates RuleAction rows in position order
    │  Dispatches to type-specific ActionExecutor
    │  Each action is independent (failure in one does not block others)
    │
    ▼
RuleExecutionLog (written after evaluation, regardless of outcome)
```

### Key Design Decisions

1. **Universal listener, not per-event listeners**: A single `RuleEngineListener` subscribes to all domain events. This avoids N listener registrations in EventServiceProvider and keeps the rule engine self-contained.

2. **Feature flag is binary**: When Pennant flag `workflow_automation` is OFF (default), the old hardcoded listeners fire and `RuleEngineListener` returns immediately. When ON, `RuleEngineListener` processes rules and the old listeners are bypassed. They never run simultaneously (FR-027).

3. **Queued evaluation**: `EvaluateRule` runs as a queued job so the primary business operation (e.g. approving a JE) is not delayed. The job dispatches synchronously in test environments.

4. **Action executors are strategy classes**: Each `RuleActionType` maps to an `ActionExecutor` class. New action types (e.g. "Start approval chain" from 060-ACH) are added by creating a new executor and registering it -- no schema changes needed (FR-009).

5. **New domain events for controller-invoked listeners**: Five listeners are currently called directly from controllers (not via Laravel events). The migration introduces proper domain events for these so the rule engine can listen uniformly (FR-039).

6. **Condition fields are trigger-scoped**: Each `RuleTriggerType` declares its available condition fields and placeholder tokens. The rule builder API exposes these per trigger type (FR-006).

---

## Project Structure

### New Files

```
app/
├── Actions/Automation/
│   ├── CreateWorkspaceRule.php          # Validate + persist rule with conditions/actions
│   ├── UpdateWorkspaceRule.php          # Update rule, re-validate conditions/actions
│   ├── DeleteWorkspaceRule.php          # Delete custom rule (block system rules)
│   ├── ToggleWorkspaceRule.php          # Enable/disable/dry-run toggle
│   ├── EvaluateRule.php                 # Core: load rule, extract data, evaluate conditions, execute actions
│   └── PurgeExecutionLog.php            # Scheduled: delete log entries > 90 days
│
├── Enums/Automation/
│   ├── RuleTriggerType.php              # 25 trigger types with conditionFields() + placeholderTokens()
│   ├── RuleActionType.php               # 4 action types
│   ├── RuleType.php                     # system / custom
│   ├── RuleMode.php                     # enabled / disabled / dry_run
│   ├── RuleOutcome.php                  # 8 outcome values
│   ├── ConditionOperator.php            # 10 operators
│   └── ConditionFieldType.php           # 6 field types
│
├── Events/Automation/
│   ├── TaskSharedWithClient.php         # New domain event (replaces direct call)
│   ├── ClientTaskCompleted.php          # New domain event (replaces direct call)
│   ├── ClientRequestSubmitted.php       # New domain event (replaces direct call)
│   ├── ClientRequestStatusChanged.php   # New domain event (replaces direct call)
│   ├── TaskCommentAdded.php             # New domain event with `source` (practice/client)
│   ├── BankFeedSynced.php               # New domain event (replaces direct call)
│   └── BankFeedError.php                # New domain event (replaces direct call)
│
├── Http/
│   ├── Controllers/Api/
│   │   └── AutomationRuleController.php # CRUD + toggle + execution log + trigger types
│   ├── Requests/Automation/
│   │   ├── StoreAutomationRuleRequest.php
│   │   └── UpdateAutomationRuleRequest.php
│   └── Resources/
│       ├── AutomationRuleResource.php
│       ├── AutomationRuleDetailResource.php
│       ├── RuleExecutionLogResource.php
│       └── TriggerTypeResource.php
│
├── Listeners/Automation/
│   └── RuleEngineListener.php           # Universal subscriber for all domain events
│
├── Models/Tenant/
│   ├── WorkspaceRule.php
│   ├── RuleCondition.php
│   ├── RuleAction.php
│   └── RuleExecutionLog.php
│
├── Models/Central/
│   └── RuleTemplate.php                 # P2 model, schema created in P1 migration
│
├── Policies/
│   └── WorkspaceRulePolicy.php          # Gates on workspace.settings permission
│
├── Services/Automation/
│   ├── RuleEngine.php                   # Orchestrator: find matching rules, dispatch evaluation jobs
│   ├── ConditionEvaluator.php           # Evaluate a set of conditions against extracted data
│   ├── RuleEventDataExtractor.php       # Normalize any domain event into a flat key-value payload
│   ├── PlaceholderResolver.php          # Replace {tokens} in notification text
│   └── ActionExecutors/
│       ├── ActionExecutorInterface.php  # Contract: execute(RuleAction, array $payload, WorkspaceRule): ActionResult
│       ├── NotificationActionExecutor.php
│       ├── EmailActionExecutor.php
│       ├── TaskActionExecutor.php
│       └── WebhookActionExecutor.php
│
├── Data/Automation/
│   ├── RuleConditionData.php            # Spatie Data DTO for condition validation
│   ├── RuleActionData.php               # Spatie Data DTO for action validation
│   └── ActionResult.php                 # Value object: outcome, error message
│
database/
├── migrations/
│   ├── 2026_03_22_800001_create_workspace_rules_table.php
│   ├── 2026_03_22_800002_create_rule_conditions_table.php
│   ├── 2026_03_22_800003_create_rule_actions_table.php
│   ├── 2026_03_22_800004_create_rule_execution_logs_table.php
│   └── 2026_03_22_800005_create_rule_templates_table.php
│
├── seeders/
│   └── SystemDefaultRulesSeeder.php     # 14 system default rules
│
routes/
│   └── api.php                          # New automation-rules routes
│
tests/
├── Feature/Automation/
│   ├── AutomationRuleCrudTest.php       # API CRUD tests
│   ├── RuleEngineTest.php               # Core evaluation + action dispatch
│   ├── SystemDefaultMigrationTest.php   # 14 defaults appear, parity with old listeners
│   ├── ConditionEvaluatorTest.php       # All operators, all field types
│   ├── ExecutionLogTest.php             # Log creation, filtering, purge
│   └── FeatureFlagTest.php             # Old vs new system, never both
│
└── Unit/Automation/
    ├── RuleTriggerTypeTest.php          # Enum methods, condition fields, tokens
    ├── PlaceholderResolverTest.php      # Token replacement edge cases
    └── ConditionEvaluatorUnitTest.php   # Operator logic in isolation
```

### Modified Files

```
app/Providers/EventServiceProvider.php          # Add RuleEngineListener as subscriber
app/Http/Controllers/Api/PracticeTaskController.php  # Dispatch new domain events (5 cases)
app/Http/Controllers/Api/ClientRequestController.php # Dispatch new domain events
app/Listeners/Notifications/*.php               # Add feature flag guard to all 13 listeners
database/seeders/RolesAndPermissionsSeeder.php  # Add automation-rule.view, automation-rule.manage
database/seeders/DemoPersonasSeeder.php         # Call SystemDefaultRulesSeeder for demo workspaces
routes/api.php                                  # Register automation-rules routes
app/Providers/AppServiceProvider.php            # Register WorkspaceRulePolicy
```

---

## Implementation Phases

### Phase 1: Schema & Models (Foundation)

**Goal**: Database tables, Eloquent models, enums, relationships.

**Tasks**:

1. **Create 7 enums** in `app/Enums/Automation/`:
   - `RuleTriggerType` -- 25 values with `label()`, `category()`, `isAvailable()`, `conditionFields()`, `placeholderTokens()` methods
   - `RuleActionType` -- 4 values with `label()` method
   - `RuleType` -- 2 values (`system`, `custom`)
   - `RuleMode` -- 3 values (`enabled`, `disabled`, `dry_run`)
   - `RuleOutcome` -- 8 values
   - `ConditionOperator` -- 10 values with `label()` and `applicableFieldTypes()` methods
   - `ConditionFieldType` -- 6 values

2. **Create 5 migrations**:
   - `workspace_rules` -- see data-model.md for full schema
   - `rule_conditions` -- FK to workspace_rules, cascade delete
   - `rule_actions` -- FK to workspace_rules, cascade delete
   - `rule_execution_logs` -- FK to workspace_rules (SET NULL), denormalized workspace_id
   - `rule_templates` -- no workspace_id (central table)

3. **Create 5 Eloquent models**:
   - `WorkspaceRule` -- HasUuids (on `uuid` only), casts for enums, relationships to conditions/actions/logs, scopes: `forWorkspace()`, `enabled()`, `forTrigger()`, `system()`, `custom()`
   - `RuleCondition` -- BelongsTo rule
   - `RuleAction` -- BelongsTo rule, `config` cast to array
   - `RuleExecutionLog` -- HasUuids, BelongsTo rule (nullable), immutable (no `updated_at`)
   - `RuleTemplate` -- Central model, `default_conditions` and `default_actions` cast to array

4. **Create Spatie Data DTOs**:
   - `RuleConditionData` -- validates field against trigger type's registered fields, operator against field type compatibility
   - `RuleActionData` -- validates config schema per action type

**Estimated tests**: 0 (models tested via Feature tests in later phases)

---

### Phase 2: Rule Engine Core (Evaluation + Actions)

**Goal**: The engine that evaluates rules and dispatches actions.

**Tasks**:

5. **Create `RuleEventDataExtractor` service**:
   - Accepts any domain event object
   - Maps event class to `RuleTriggerType`
   - Extracts a flat `array<string, mixed>` payload from the event (e.g. `['amount' => 15000, 'contact_name' => 'Acme Corp', ...]`)
   - Loads related entities as needed (e.g. fetches Invoice model to get contact name)
   - Returns `null` if event does not map to any trigger type (non-automation events)

6. **Create `ConditionEvaluator` service**:
   - `evaluate(Collection $conditions, array $payload): ConditionEvaluationResult`
   - Implements all 10 operators with type-aware comparison (cast `value` based on `field_type`)
   - Currency and number comparisons use integer math (never float)
   - Date comparisons use Carbon
   - Returns per-condition detail: `{field, operator, expected, actual, matched}`

7. **Create `PlaceholderResolver` service**:
   - `resolve(string $template, array $payload): string`
   - Replaces `{token}` with values from payload
   - Unresolved tokens replaced with empty string (FR-038)
   - Common tokens (`{workspace_name}`, `{trigger_label}`) injected automatically

8. **Create `ActionExecutorInterface`**:
   ```php
   interface ActionExecutorInterface
   {
       public function execute(RuleAction $action, array $payload, WorkspaceRule $rule): ActionResult;
   }
   ```

9. **Create 4 action executors**:
   - `NotificationActionExecutor` -- resolves recipients by role/user_id/actor, calls `CreateNotification::run()` (FR-011)
   - `EmailActionExecutor` -- resolves recipients, calls `NotificationMailer::send()`, bypasses category preferences (FR-012)
   - `TaskActionExecutor` -- finds linked practice via `PracticeMemberAssignment`, creates `PracticeTask`, suppresses duplicates by title+workspace+incomplete (FR-013, FR-035)
   - `WebhookActionExecutor` -- selects existing `WebhookEndpoint` or uses custom URL, sends HTTP POST, logs delivery (FR-014)

10. **Create `RuleEngine` service** (orchestrator):
    - `handleEvent(object $event): void`
    - Checks Pennant feature flag -- returns immediately if OFF
    - Calls `RuleEventDataExtractor` to get trigger type and payload
    - Queries `WorkspaceRule::forWorkspace($wsId)->forTrigger($triggerType)->enabled()` (NFR-003)
    - Dispatches `EvaluateRule` job per matching rule

11. **Create `EvaluateRule` action** (dispatchable as queued job):
    - Loads the rule with conditions and actions
    - Calls `ConditionEvaluator::evaluate()`
    - If conditions match and mode is `enabled`: iterates actions, calls the appropriate executor
    - If mode is `dry_run`: logs what would have happened without executing
    - Writes `RuleExecutionLog` entry with full detail
    - Handles timeout (30s max) gracefully

12. **Create `RuleEngineListener`** (universal event subscriber):
    - Registered as a subscriber in `EventServiceProvider`
    - `subscribe()` method returns a mapping of all domain event classes to `handleEvent()`
    - `handleEvent()` delegates to `RuleEngine::handleEvent()`

**Estimated tests**: ~40 (ConditionEvaluator unit tests for all operators + RuleEngine integration tests)

---

### Phase 3: CRUD API

**Goal**: REST API for rule management.

**Tasks**:

13. **Create `WorkspaceRulePolicy`**:
    - `viewAny`, `view`, `create`, `update`, `delete` -- all check `$user->hasPermissionTo('automation-rule.view')` for reads, `automation-rule.manage` for writes
    - `delete` additionally blocks system rules (`$rule->rule_type === RuleType::System`)

14. **Add permissions** to `RolesAndPermissionsSeeder`:
    - `automation-rule.view` -- owner, accountant, approver (read-only), auditor (read-only)
    - `automation-rule.manage` -- owner, accountant

15. **Create Form Requests**:
    - `StoreAutomationRuleRequest` -- validates name (required, max 255), trigger_type (valid enum, available), conditions (array of RuleConditionData), actions (array of RuleActionData, min 1), mode (valid enum)
    - `UpdateAutomationRuleRequest` -- same validation, pre-loads rule in `authorize()`

16. **Create `AutomationRuleController`** with these endpoints:

    | Method | Route | Action | Notes |
    |--------|-------|--------|-------|
    | GET | `automation-rules` | `index()` | List rules (search, filter, paginate) |
    | POST | `automation-rules` | `store()` | Create custom rule |
    | GET | `automation-rules/trigger-types` | `triggerTypes()` | List triggers with condition fields + tokens |
    | GET | `automation-rules/execution-log` | `executionLog()` | Paginated log with filters |
    | GET | `automation-rules/execution-log/{uuid}` | `executionLogDetail()` | Single log entry detail |
    | GET | `automation-rules/{uuid}` | `show()` | Full rule detail |
    | PATCH | `automation-rules/{uuid}` | `update()` | Update rule |
    | DELETE | `automation-rules/{uuid}` | `destroy()` | Delete custom rule |
    | PATCH | `automation-rules/{uuid}/toggle` | `toggle()` | Toggle mode |
    | GET | `automation-rules/counts` | `counts()` | StatusTabs counts by type/mode |

17. **Create API Resources**:
    - `AutomationRuleResource` -- list view (name, trigger label, type badge, mode, last_executed_at, execution_count)
    - `AutomationRuleDetailResource` -- full view with nested conditions and actions
    - `RuleExecutionLogResource` -- log entry with expandable condition/action detail
    - `TriggerTypeResource` -- trigger type with condition fields and placeholder tokens

18. **Create Actions**:
    - `CreateWorkspaceRule` -- validates, creates rule + conditions + actions in transaction
    - `UpdateWorkspaceRule` -- validates, replaces conditions + actions (delete-and-recreate within transaction)
    - `DeleteWorkspaceRule` -- validates custom type, soft-checks for system rules
    - `ToggleWorkspaceRule` -- changes mode, logs the toggle

19. **Register routes** in `api.php` under workspace-scoped middleware group:
    ```php
    Route::middleware(['feature:workflow_automation'])->group(function () {
        Route::get('automation-rules', [AutomationRuleController::class, 'index']);
        Route::post('automation-rules', [AutomationRuleController::class, 'store']);
        // ... etc
    });
    ```
    Note: The `feature:workflow_automation` middleware gates the API routes. The RuleEngineListener separately checks the Pennant flag for event processing.

**Estimated tests**: ~30 (CRUD endpoint tests, authorization tests per role)

---

### Phase 4: New Domain Events (FR-039)

**Goal**: Introduce proper domain events for the 5 controller-invoked listeners plus additional events needed for trigger coverage.

**Tasks**:

20. **Create 7 new event classes** in `app/Events/Automation/`:
    - `TaskSharedWithClient` -- `workspaceId`, `taskId`, `actorId`
    - `ClientTaskCompleted` -- `workspaceId`, `taskId`, `completedById`
    - `ClientRequestSubmitted` -- `workspaceId`, `requestId`, `submittedById`
    - `ClientRequestStatusChanged` -- `workspaceId`, `requestId`, `newStatus`, `changedById`
    - `TaskCommentAdded` -- `workspaceId`, `taskId`, `commenterId`, `source` (practice/client)
    - `BankFeedSynced` -- `workspaceId`, `bankAccountId`, `importedCount`, `unmatchedCount`
    - `BankFeedError` -- `workspaceId`, `bankAccountId`, `errorMessage`

    These are standard Laravel events (NOT Spatie stored events -- they are not event-sourced aggregate events).

21. **Dispatch events from controllers**:
    - `PracticeTaskController::update()` -- dispatch `TaskSharedWithClient` when visibility changes to `shared`
    - `PracticeTaskController::completeByClient()` -- dispatch `ClientTaskCompleted`
    - `ClientRequestController::store()` -- dispatch `ClientRequestSubmitted`
    - `ClientRequestController::updateStatus()` -- dispatch `ClientRequestStatusChanged`
    - `PracticeTaskController::addComment()` -- dispatch `TaskCommentAdded` with source
    - Bank feed sync service -- dispatch `BankFeedSynced` and `BankFeedError`

22. **Update existing 5 directly-called listeners** to also listen to the new events (for the parallel-run period when the flag is OFF):
    - `NotifyOnTaskShared` -- add `handle(TaskSharedWithClient $event)` method alongside existing `handle(PracticeTask, int)` signature
    - Same pattern for the other 4 listeners

23. **Register new events in EventServiceProvider** with both old listeners (for flag OFF) and the universal `RuleEngineListener`.

**Estimated tests**: ~10 (verify events are dispatched from controllers)

---

### Phase 5: System Default Rules Migration

**Goal**: Seed 14 system default rules that replicate exact behaviour of the 13 hardcoded listeners.

**Tasks**:

24. **Create `SystemDefaultRulesSeeder`**:
    - Defines 14 system default rules (the 13 listeners + the task comment split = 14)
    - Each rule has: name, trigger_type, system_key, conditions (if any), and actions with exact recipient logic and notification text matching the current hardcoded behaviour
    - Uses `system_key` for idempotency (skip if already exists)

25. **Map all 14 rules** (listener -> system default rule):

    | # | Listener | System Key | Trigger | Recipients | Title | Body |
    |---|----------|------------|---------|------------|-------|------|
    | 1 | `NotifyApproversOnJeSubmitted` | `je_submitted_notify_approvers` | `je_submitted` | Role: approver (exclude actor) | "Journal entry awaiting approval" | "JE #{reference} submitted by {actor_name}" |
    | 2 | `NotifyBookkeeperOnJeApproved` | `je_approved_notify_submitter` | `je_approved` | Actor (submitter) | "Journal entry approved" | "JE #{reference} has been approved" |
    | 3 | `NotifyBookkeeperOnJeRejected` | `je_rejected_notify_submitter` | `je_rejected` | Actor (submitter) | "Journal entry rejected" | "JE #{reference} has been rejected" |
    | 4 | `NotifyInvoiceSender` | `invoice_sent_notify_sender` | `invoice_sent` | Actor (sender) | "Invoice sent" | "Invoice #{invoice_number} sent to {contact_name}" |
    | 5 | `NotifyOwnersOnInvoicePaid` | `invoice_paid_notify_owners` | `invoice_paid` | Roles: owner, accountant + Entity creator | "Invoice #{invoice_number} paid" | "{amount} received from {contact_name}" |
    | 6 | `NotifyOwnersOnBankFeedSynced` | `bank_feed_synced_notify_owners` | `bank_feed_synced` | Roles: owner, accountant | "Bank feed synced" | Dynamic body based on imported/unmatched counts |
    | 7 | `NotifyOwnersOnBankFeedError` | `bank_feed_error_notify_owners` | `bank_feed_error` | Roles: owner, accountant | "Bank feed error" | "{error_message}" |
    | 8 | `NotifyOnTaskShared` | `task_shared_notify_workspace` | `task_shared` | Roles: owner, accountant | "New task from your accountant" | "{task_title}" |
    | 9 | `NotifyOnClientTaskCompleted` | `client_task_completed_notify_practice` | `client_task_completed` | Task assignee or creator | "Client completed task" | "{task_title}" |
    | 10 | `NotifyOnClientRequestSubmitted` | `client_request_submitted_notify_practice` | `client_request_submitted` | Assigned practice members (fallback: practice owners) | "Client request submitted" | "{request_title}" |
    | 11 | `NotifyOnClientRequestStatusChanged` | `client_request_status_changed_notify_creator` | `client_request_status_changed` | Request creator | "Request status updated" | "{request_title} is now {new_status}" |
    | 12 | `NotifyOnTaskCommentAdded` (practice) | `task_comment_practice_notify_workspace` | `task_comment_practice` | Roles: owner, accountant (exclude commenter) | "New comment on task" | 'A comment was added to "{task_title}"' |
    | 13 | `NotifyOnTaskCommentAdded` (client) | `task_comment_client_notify_practice` | `task_comment_client` | Task assignee or creator (exclude commenter) | "Client commented on task" | 'A client added a comment to "{task_title}"' |
    | 14 | `NotifyOnJobShareViewed` (stub) | `job_share_viewed_notify_creator` | `job_share_viewed` | Token creator | "Job share viewed" | (unavailable trigger -- rule created but non-functional) |

26. **Integrate seeder into workspace provisioning**:
    - Call `SystemDefaultRulesSeeder` from workspace creation flow (existing `CreateWorkspace` action)
    - Also callable standalone for existing workspaces: `php artisan db:seed --class=SystemDefaultRulesSeeder`

27. **Create data migration** (Laravel operation or artisan command) to seed system defaults for ALL existing workspaces:
    - Iterates all workspaces
    - Calls seeder per workspace
    - Idempotent via `system_key` check

**Estimated tests**: ~15 (verify all 14 rules created, parity with old listener output)

---

### Phase 6: Feature Flag & Cutover

**Goal**: Pennant flag for zero-downtime migration from old listeners to rule engine.

**Tasks**:

28. **Register Pennant feature flag** `workflow_automation`:
    - Define in feature definitions (workspace-scoped)
    - Default: `false` (old listeners active)
    - When `true`: rule engine active, old listeners bypassed

29. **Add feature flag guard to all 13 existing listeners**:
    ```php
    public function handle(JournalEntrySubmitted $event): void
    {
        if (Feature::for(Workspace::find($event->workspaceId))->active('workflow_automation')) {
            return; // Rule engine handles this
        }
        // ... existing logic
    }
    ```

30. **Add inverse check in `RuleEngineListener`**:
    ```php
    public function handleEvent(object $event): void
    {
        $workspaceId = $this->extractWorkspaceId($event);
        if (!Feature::for(Workspace::find($workspaceId))->active('workflow_automation')) {
            return; // Old listeners handle this
        }
        $this->ruleEngine->handleEvent($event);
    }
    ```

31. **Create parity verification command** `automation:verify-parity`:
    - For each system default rule, simulates the trigger event
    - Compares rule engine output (recipients, notification text) with old listener output
    - Reports any discrepancies
    - Used during rollout to validate before flipping the flag

**Estimated tests**: ~10 (flag ON/OFF behavior, never-both guarantee)

---

### Phase 7: Execution Log & Scheduled Maintenance

**Goal**: Log every evaluation, provide purge command.

**Tasks**:

32. **Execution logging** (integrated into `EvaluateRule` action from Phase 2):
    - Write `RuleExecutionLog` entry after every evaluation
    - Include: conditions_detail, actions_detail, outcome, duration_ms
    - Truncate trigger_payload to 2,000 characters

33. **Create `PurgeExecutionLog` action** (scheduled command):
    - `php artisan automation:purge-log`
    - Deletes entries older than 90 days (FR-023)
    - Logs count of purged entries
    - Register in `routes/console.php` as daily schedule

34. **Execution log API** (integrated into controller from Phase 3):
    - Paginated at 50 per page
    - Filterable by date range, rule name, outcome
    - Detail endpoint with full condition/action breakdown

**Estimated tests**: ~8 (log creation, filtering, purge, retention)

---

## Permissions

### New Permissions

| Permission | Roles |
|------------|-------|
| `automation-rule.view` | owner, accountant, approver (read-only), auditor (read-only) |
| `automation-rule.manage` | owner, accountant |

**Integration**: Added to `RolesAndPermissionsSeeder` in the appropriate role arrays. The policy uses `automation-rule.view` for `viewAny`/`view` and `automation-rule.manage` for `create`/`update`/`delete`/`toggle`.

Note: The spec references `workspace.settings` as the gating permission. We introduce dedicated `automation-rule.*` permissions for granularity, following the established pattern (e.g. `signing-document.view`, `anomaly.manage`). The `workspace.settings` permission is too broad -- it gates workspace name/settings changes, not feature-specific access.

---

## Feature Flag Strategy

### Pennant Feature: `workflow_automation`

**Scope**: Per-workspace (allows gradual rollout)

**Rollout plan**:
1. **Phase A -- Deploy**: Ship code with flag OFF. Old listeners work as before. System default rules are seeded (dormant).
2. **Phase B -- Verify**: Run `automation:verify-parity` on test workspaces. Compare rule engine output vs old listener output.
3. **Phase C -- Canary**: Enable flag for 1-2 internal workspaces. Monitor execution logs for correct behavior.
4. **Phase D -- Rollout**: Enable flag for all workspaces via Pennant scope.
5. **Phase E -- Cleanup**: After 2 weeks stable, remove feature flag guards from old listeners. Delete old listener classes. Remove subscriber registrations from EventServiceProvider.

**The flag controls two things simultaneously**:
1. Whether old listeners execute (OFF = execute, ON = skip)
2. Whether RuleEngineListener processes events (OFF = skip, ON = execute)

This guarantees the two systems never run simultaneously for the same event (FR-027).

---

## API Routes

All routes are workspace-scoped (require `auth:sanctum` + `SetWorkspaceContext` middleware).

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

---

## Testing Strategy

### Unit Tests (Pest, `tests/Unit/Automation/`)

| Test File | Coverage |
|-----------|----------|
| `RuleTriggerTypeTest.php` | All 25 enum values, `label()`, `category()`, `isAvailable()`, `conditionFields()`, `placeholderTokens()` |
| `ConditionEvaluatorUnitTest.php` | All 10 operators x all applicable field types = ~35 cases. Edge cases: null values, empty strings, type coercion |
| `PlaceholderResolverTest.php` | Token replacement, unresolved tokens -> empty string, nested braces, common tokens |

### Feature Tests (Pest, `tests/Feature/Automation/`)

| Test File | Coverage |
|-----------|----------|
| `AutomationRuleCrudTest.php` | Create rule (valid/invalid), update, delete (custom vs system), toggle, list with filters, show detail, trigger-types endpoint |
| `AuthorizationTest.php` | Owner can CRUD, accountant can CRUD, bookkeeper denied, client denied, auditor read-only, approver read-only |
| `RuleEngineTest.php` | Rule matches -> actions execute. Rule conditions don't match -> skipped. Dry-run mode -> logged not executed. Multiple actions with one failure -> partial. Disabled rule -> not evaluated. |
| `SystemDefaultMigrationTest.php` | All 14 system defaults created for new workspace. Idempotent (running twice = same 14). Parity: same recipients/text as old listeners. System rules cannot be deleted. |
| `ConditionEvaluatorTest.php` | Integration: create rule with conditions via API, trigger event, verify condition evaluation in execution log |
| `ExecutionLogTest.php` | Log entry created on every evaluation. Pagination. Date range filter. Outcome filter. Purge command deletes old entries. |
| `FeatureFlagTest.php` | Flag OFF: old listener fires, rule engine silent. Flag ON: rule engine fires, old listener silent. Never both. |
| `ActionExecutorTest.php` | NotificationActionExecutor creates notifications for correct recipients. EmailActionExecutor routes through NotificationMailer. TaskActionExecutor creates PracticeTask (and skips when no practice linked). WebhookActionExecutor sends POST to URL. |
| `NewDomainEventsTest.php` | Controller dispatches correct event when task shared, comment added, request submitted, etc. |

### Test Setup Pattern

```php
uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $this->user = User::factory()->create();
    // ... org + workspace setup ...

    $this->workspace->users()->attach($this->user->id, ['role' => 'owner']);
    setPermissionsTeamId($this->workspace->id);
    $this->user->assignRole('owner');

    $this->wsHeaders = ['X-Workspace-Id' => (string) $this->workspace->id];

    // Seed system default rules for the workspace
    (new SystemDefaultRulesSeeder)->runForWorkspace($this->workspace);
});
```

**Estimated total tests**: ~110 across unit and feature

---

## Gate 3: Architecture Checklist

### 1. Technical Feasibility

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | Universal listener + queued evaluation + strategy-pattern executors |
| Existing patterns leveraged | PASS | Follows Actions pattern (Lorisleiva), Policy pattern, API Resource pattern, Form Request pattern |
| No impossible requirements | PASS | All FRs are implementable with current stack |
| Performance considered | PASS | Queued evaluation (NFR-002), indexed queries on workspace+trigger (NFR-003), 5s timeout |
| Security considered | PASS | Workspace scoping, policy-based authorization, no cross-workspace queries |

### 2. Data & Integration

| Check | Status | Notes |
|-------|--------|-------|
| Data model understood | PASS | 5 tables documented in data-model.md |
| API contracts clear | PASS | 10 endpoints defined with request/response shapes |
| Dependencies identified | PASS | Uses existing CreateNotification, NotificationMailer, PracticeTask, WebhookEndpoint |
| Integration points mapped | PASS | EventServiceProvider, workspace provisioning, 5 controller event dispatches |
| DTO persistence explicit | PASS | Spatie Data DTOs for conditions/actions, explicit `create()` calls in Actions |

### 3. Implementation Approach

| Check | Status | Notes |
|-------|--------|-------|
| File changes identified | PASS | ~35 new files, ~8 modified files listed above |
| Risk areas noted | PASS | Parity verification (Phase 6), 5 controller event dispatches (Phase 4), feature flag cutover |
| Testing approach defined | PASS | ~110 tests across unit and feature, covering all P1 stories |
| Rollback possible | PASS | Feature flag OFF reverts to old listeners instantly |

### 4. Resource & Scope

| Check | Status | Notes |
|-------|--------|-------|
| Scope matches spec | PASS | P1 stories only, no frontend, no P2 features (templates, dry-run, rate limiting) |
| Effort reasonable | PASS | 7 phases, each independently testable |
| Skills available | PASS | Standard Laravel patterns, no exotic dependencies |

### 5. Laravel Best Practices

| Check | Status | Notes |
|-------|--------|-------|
| Use Lorisleiva Actions | PASS | All business logic in Actions (CreateWorkspaceRule, EvaluateRule, etc.) |
| Laravel Data for validation | PASS | RuleConditionData, RuleActionData DTOs |
| Model route binding | PASS | Controller uses UUID route binding via `getRouteKeyName()` |
| No magic numbers/IDs | PASS | All constants in enums |
| Granular model policies | PASS | WorkspaceRulePolicy with per-action checks |
| Feature flags dual-gated | PASS | Backend Pennant flag + API route middleware |
| Event sourcing: N/A | N/A | Rule engine uses standard Laravel events, not Spatie event sourcing |
| Migrations schema-only | PASS | Data seeding in SystemDefaultRulesSeeder, not in migrations |

### 6. Frontend Standards (N/A -- Backend Only)

This plan is P1 backend only. No frontend components are created. The CRUD API is designed to support a future frontend (P2) following the project's Next.js + TanStack Query patterns.

---

## Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Parity failure**: System default rules produce different output than old listeners | High | `automation:verify-parity` command validates before flag flip. Feature flag allows instant rollback. |
| **Performance**: Rule evaluation adds latency to business operations | Medium | Evaluation is queued (async). Only rules matching the trigger type are loaded. 5s timeout per rule. |
| **Duplicate notifications during cutover** | High | Feature flag is binary -- old OR new, never both. Verified by `FeatureFlagTest`. |
| **5 controller event dispatches missed** | Medium | `NewDomainEventsTest` explicitly tests that each controller dispatches the correct event. |
| **Notification text drift**: System default text does not exactly match old listener text | Low | SystemDefaultMigrationTest compares notification title/body character-for-character. |
| **Orphaned rules**: Trigger type removed in future release | Low | Rule marked "Trigger unavailable" in list. Does not fire. User can delete. |

---

## Out of Scope (P1)

These items are explicitly deferred to P2 or later:

- **Frontend UI** (rule builder, rules list, execution log viewer) -- P2
- **Template rules library** (US6, FR-028/029/030) -- P2 (schema created in P1)
- **Dry-run mode** (US7) -- P2 (enum value exists, evaluation logic deferred)
- **Rate limiting and circuit breaker** (US9, FR-031/032/033/034) -- P2
- **Multiple action types per rule in rule builder** (US8 frontend) -- P2 (backend supports it from P1)
- **OR logic / nested condition groups** -- future iteration
- **"Start approval chain" action type** -- after 060-ACH ships
- **AI-generated rule suggestions** -- future 020-AIB integration
