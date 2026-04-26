---
title: "Data Model: Workflow Automation & Trigger Rules"
---

# Data Model: Workflow Automation & Trigger Rules

**Epic**: 066-WFA | **Scope**: P1 (Backend Only) | **Date**: 2026-03-22

---

## Entity Relationship Diagram

```
WorkspaceRule (1) ----< (N) RuleCondition
WorkspaceRule (1) ----< (N) RuleAction
WorkspaceRule (1) ----< (N) RuleExecutionLog
RuleTemplate (1) ....> (N) WorkspaceRule  (templates seed custom rules)
Workspace (1) ----< (N) WorkspaceRule
```

---

## Table: `workspace_rules`

The core automation rule, scoped to a workspace. Each rule has exactly one trigger, zero or more conditions, and one or more actions.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `bigint` PK | No | auto | |
| `uuid` | `uuid` UNIQUE | No | gen | Route key. `HasUuids` trait on `uuid` column only. |
| `workspace_id` | `bigint` FK | No | | References `workspaces.id`. Global scope. |
| `name` | `string(255)` | No | | User-visible rule name (e.g. "Notify approvers on JE submitted"). |
| `description` | `text` | Yes | `null` | Optional explanation. |
| `trigger_type` | `string(80)` | No | | Enum value from `RuleTriggerType` (e.g. `je_submitted`). Indexed. |
| `rule_type` | `string(20)` | No | | `system` or `custom`. Enum `RuleType`. |
| `mode` | `string(20)` | No | `enabled` | `enabled`, `disabled`, or `dry_run`. Enum `RuleMode`. |
| `execution_count` | `int` | No | `0` | Denormalized counter, incremented on each evaluation. |
| `last_executed_at` | `timestamp` | Yes | `null` | Timestamp of most recent evaluation. |
| `created_by` | `bigint` FK | Yes | `null` | References `users.id`. Informational only (rule survives user removal). |
| `system_key` | `string(80)` | Yes | `null` | Unique key for system rules (e.g. `je_submitted_notify_approvers`). Used to identify system defaults during migration. `UNIQUE` where not null. |
| `created_at` | `timestamp` | No | | |
| `updated_at` | `timestamp` | No | | |

**Indexes**:
- `idx_workspace_rules_workspace_trigger` on (`workspace_id`, `trigger_type`) -- primary lookup path for RuleEngine
- `idx_workspace_rules_workspace_mode` on (`workspace_id`, `mode`) -- for list filtering
- `UNIQUE` on `system_key` where not null -- prevents duplicate system defaults per workspace

**Notes**:
- `trigger_type` stores the string value of `RuleTriggerType` enum, not an FK. This makes the trigger registry extensible without schema changes.
- `system_key` is a composite identifier (e.g. `je_submitted_notify_approvers`) that the migration seeder uses to detect whether the system default already exists. Custom rules have `null` system_key.

---

## Table: `rule_conditions`

Each row represents a single AND condition on a rule. All conditions must match for the rule to fire.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `bigint` PK | No | auto | |
| `workspace_rule_id` | `bigint` FK | No | | References `workspace_rules.id`. Cascade delete. |
| `field` | `string(80)` | No | | Condition field name (e.g. `amount`, `contact_name`, `triggering_user_role`). |
| `operator` | `string(30)` | No | | Enum value from `ConditionOperator` (e.g. `greater_than`). |
| `value` | `text` | Yes | `null` | Serialized condition value. Nullable for `is_empty` / `is_not_empty` operators. |
| `field_type` | `string(20)` | No | | `text`, `number`, `currency`, `date`, `role`, `boolean`. Enum `ConditionFieldType`. |
| `position` | `smallint` | No | `0` | Display order. |
| `created_at` | `timestamp` | No | | |
| `updated_at` | `timestamp` | No | | |

**Indexes**:
- `idx_rule_conditions_rule` on (`workspace_rule_id`)

**Notes**:
- `value` is stored as text and cast at evaluation time based on `field_type`. Currency values stored in cents (integer string). Dates stored as ISO-8601. Booleans as `"true"` / `"false"`.
- `field` values are validated against the trigger type's registered condition fields at rule creation time (see `RuleTriggerType::conditionFields()`).

---

## Table: `rule_actions`

Each row represents one action to execute when a rule fires. Actions execute independently (FR-015).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `bigint` PK | No | auto | |
| `workspace_rule_id` | `bigint` FK | No | | References `workspace_rules.id`. Cascade delete. |
| `action_type` | `string(30)` | No | | Enum value from `RuleActionType` (e.g. `send_notification`). |
| `config` | `jsonb` | No | | Type-specific configuration (see Action Config Schemas below). |
| `position` | `smallint` | No | `0` | Execution order. |
| `created_at` | `timestamp` | No | | |
| `updated_at` | `timestamp` | No | | |

**Indexes**:
- `idx_rule_actions_rule` on (`workspace_rule_id`)

**Notes**:
- `config` is a JSON column whose structure varies by `action_type`. Validated at rule creation/update time by the corresponding ActionExecutor.

---

### Action Config Schemas

**`send_notification`**:
```json
{
  "recipient_roles": ["owner", "accountant"],
  "recipient_user_ids": [42, 87],
  "recipient_actor": false,
  "title": "Invoice #{invoice_number} is overdue",
  "body": "{amount} from {contact_name} is {days_overdue} days past due"
}
```

**`send_email`**:
```json
{
  "recipient_roles": ["owner"],
  "recipient_user_ids": [],
  "recipient_actor": true,
  "subject": "Invoice overdue: #{invoice_number}",
  "body_template": "Hi {recipient_name},\n\nInvoice #{invoice_number} for {amount} is now overdue."
}
```

**`create_task`**:
```json
{
  "title": "Follow up: overdue invoice #{invoice_number}",
  "description": "Invoice {amount} from {contact_name} is overdue. Please follow up.",
  "assignee_mode": "practice_owner"
}
```
`assignee_mode` values: `practice_owner`, `task_assignee`, `specific_user`. If `specific_user`, include `"assignee_user_id": 42`.

**`fire_webhook`**:
```json
{
  "mode": "existing_endpoint",
  "webhook_endpoint_id": 15,
  "custom_url": null,
  "custom_secret": null
}
```
OR:
```json
{
  "mode": "custom_url",
  "webhook_endpoint_id": null,
  "custom_url": "https://hooks.example.com/receive",
  "custom_secret": "my-secret-header-value"
}
```

---

## Table: `rule_execution_logs`

Immutable audit log of every rule evaluation attempt (FR-022). Retained 90 days (FR-023).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `bigint` PK | No | auto | |
| `uuid` | `uuid` UNIQUE | No | gen | Route key. |
| `workspace_id` | `bigint` FK | No | | References `workspaces.id`. Denormalized for efficient querying without joining rules. |
| `workspace_rule_id` | `bigint` FK | Yes | `null` | References `workspace_rules.id`. Nullable (rule may have been deleted since log entry). SET NULL on delete. |
| `rule_name` | `string(255)` | No | | Snapshot of rule name at execution time. |
| `trigger_type` | `string(80)` | No | | Trigger event type string. |
| `trigger_payload` | `text` | Yes | `null` | JSON summary of trigger event data. Capped at 2,000 characters (FR-022). |
| `conditions_detail` | `jsonb` | Yes | `null` | Per-condition evaluation: `[{field, operator, expected, actual, matched}]`. |
| `actions_detail` | `jsonb` | Yes | `null` | Per-action result: `[{action_type, position, outcome, error}]`. |
| `outcome` | `string(30)` | No | | Enum `RuleOutcome`: `success`, `partial`, `failure`, `skipped`, `dry_run`, `rate_limited`, `timeout`, `circuit_breaker_disabled`. |
| `duration_ms` | `int` | Yes | `null` | Execution duration in milliseconds. |
| `created_at` | `timestamp` | No | | Serves as execution timestamp. |

**Indexes**:
- `idx_execution_log_workspace_created` on (`workspace_id`, `created_at` DESC) -- primary list query
- `idx_execution_log_rule` on (`workspace_rule_id`) -- filter by rule
- `idx_execution_log_outcome` on (`workspace_id`, `outcome`) -- filter by outcome

**Notes**:
- `rule_name` and `trigger_type` are denormalized snapshots so log entries remain readable even after the rule is modified or deleted.
- `trigger_payload` is truncated at write time to 2,000 characters. Contains key identifiers (UUID, amount, contact name) but not nested line items.
- No `updated_at` -- log entries are immutable.

---

## Table: `rule_templates`

Centrally maintained pre-built rule templates (not workspace-scoped). P2 scope but schema created in P1 migration.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `bigint` PK | No | auto | |
| `name` | `string(255)` | No | | Template name (e.g. "Notify me when any bill over $5,000 is approved"). |
| `description` | `text` | Yes | `null` | Explanation of what the template does. |
| `category` | `string(40)` | No | | Grouping: `invoicing`, `banking`, `approvals`, `practice_tasks`, `signing`. |
| `trigger_type` | `string(80)` | No | | Enum value from `RuleTriggerType`. |
| `default_conditions` | `jsonb` | No | `[]` | Pre-configured conditions (same shape as `rule_conditions` rows). |
| `default_actions` | `jsonb` | No | `[]` | Pre-configured actions (same shape as `rule_actions` rows). |
| `is_active` | `boolean` | No | `true` | Can be deactivated centrally to hide from template library. |
| `created_at` | `timestamp` | No | | |
| `updated_at` | `timestamp` | No | | |

**Notes**:
- No `workspace_id` -- templates are platform-level.
- `default_conditions` and `default_actions` are JSON arrays matching the structure of `rule_conditions` and `rule_actions` rows respectively, minus the `id` and `workspace_rule_id` fields.

---

## Enum Definitions

### `RuleTriggerType` (string enum, 25 values)

Maps to existing `NotificationType` cases plus the task comment split.

| Value | Label | Category | Source Event | Available |
|-------|-------|----------|--------------|-----------|
| `je_submitted` | Journal entry submitted | Approvals | `JournalEntrySubmitted` | Yes |
| `je_approved` | Journal entry approved | Approvals | `JournalEntryApproved` | Yes |
| `je_rejected` | Journal entry rejected | Approvals | `JournalEntryRejected` | Yes |
| `invoice_sent` | Invoice sent | Invoicing | `InvoiceSent` | Yes |
| `invoice_paid` | Invoice paid | Invoicing | `InvoicePaymentReceived` | Yes |
| `invoice_overdue` | Invoice becomes overdue | Invoicing | `InvoiceOverdue` (new) | Yes |
| `bank_feed_synced` | Bank feed synced | Banking | `BankFeedSynced` (new) | Yes |
| `bank_feed_error` | Bank feed error | Banking | `BankFeedError` (new) | Yes |
| `reconciliation_completed` | Reconciliation completed | Banking | `TransactionReconciled` | Yes |
| `task_shared` | Task shared with client | Practice Tasks | `TaskSharedWithClient` (new) | Yes |
| `client_task_completed` | Client task completed | Practice Tasks | `ClientTaskCompleted` (new) | Yes |
| `client_request_submitted` | Client request submitted | Client Requests | `ClientRequestSubmitted` (new) | Yes |
| `client_request_status_changed` | Client request status changed | Client Requests | `ClientRequestStatusChanged` (new) | Yes |
| `task_comment_practice` | Practice member commented on task | Practice Tasks | `TaskCommentAdded` (new, with `source=practice`) | Yes |
| `task_comment_client` | Client commented on task | Practice Tasks | `TaskCommentAdded` (new, with `source=client`) | Yes |
| `task_overdue` | Task overdue | Practice Tasks | `TaskOverdue` (new) | Yes |
| `job_share_viewed` | Job share viewed | Jobs | Pending 022-CPV | No |
| `signing_request_sent` | Signing request sent | Signing | `SigningRequestSent` (new) | Yes |
| `document_signed` | Document signed | Signing | `SigningDocumentSigned` (new) | Yes |
| `document_completed` | Document fully signed | Signing | `SigningDocumentCompleted` (new) | Yes |
| `document_declined` | Document declined | Signing | `SigningDocumentDeclined` (new) | Yes |
| `signing_reminder` | Signing reminder sent | Signing | `SigningReminderSent` (new) | Yes |
| `access_expiring` | Access expiring | Access | `AccessExpiring` (new) | Yes |
| `access_expired` | Access expired | Access | `AccessExpired` (new) | Yes |
| `cash_flow_shortfall` | Cash flow shortfall detected | Forecasting | `CashFlowShortfall` (new) | Yes |

**Notes**:
- Events marked "(new)" must be introduced as proper Laravel events during the migration phase (FR-039). These replace direct controller/service calls.
- `task_comment_practice` and `task_comment_client` are the split of the bidirectional `NotifyOnTaskCommentAdded` listener.
- `job_share_viewed` is registered but marked `available: false` until 022-CPV ships.

### `RuleActionType` (string enum, 4 values)

| Value | Label |
|-------|-------|
| `send_notification` | Send in-app notification |
| `send_email` | Send email notification |
| `create_task` | Create practice task |
| `fire_webhook` | Fire webhook |

### `RuleType` (string enum, 2 values)

| Value | Label |
|-------|-------|
| `system` | System default |
| `custom` | Custom rule |

### `RuleMode` (string enum, 3 values)

| Value | Label |
|-------|-------|
| `enabled` | Active |
| `disabled` | Disabled |
| `dry_run` | Dry Run |

### `RuleOutcome` (string enum, 8 values)

| Value | Description |
|-------|-------------|
| `success` | All actions executed successfully |
| `partial` | Some actions succeeded, some failed |
| `failure` | All actions failed |
| `skipped` | Conditions did not match |
| `dry_run` | Rule in dry-run mode, no actions executed |
| `rate_limited` | Per-rule rate limit exceeded |
| `timeout` | Evaluation exceeded 30-second timeout |
| `circuit_breaker_disabled` | Rule disabled by circuit breaker |

### `ConditionOperator` (string enum, 10 values)

| Value | Label | Applicable Field Types |
|-------|-------|----------------------|
| `equals` | Equals | text, number, currency, date, role, boolean |
| `not_equals` | Not equals | text, number, currency, date, role, boolean |
| `greater_than` | Greater than | number, currency, date |
| `greater_than_or_equal` | Greater than or equal | number, currency, date |
| `less_than` | Less than | number, currency, date |
| `less_than_or_equal` | Less than or equal | number, currency, date |
| `contains` | Contains | text |
| `starts_with` | Starts with | text |
| `is_empty` | Is empty | text, number, currency, date |
| `is_not_empty` | Is not empty | text, number, currency, date |

### `ConditionFieldType` (string enum, 6 values)

| Value | Description |
|-------|-------------|
| `text` | Free text, compared as string |
| `number` | Integer, compared numerically |
| `currency` | Integer cents, compared numerically |
| `date` | ISO-8601 date string |
| `role` | Workspace role name (owner, accountant, etc.) |
| `boolean` | `true` / `false` |

---

## Condition Fields per Trigger Type

Each trigger type exposes a specific set of condition fields. The `RuleTriggerType` enum method `conditionFields()` returns this registry.

| Trigger Type | Condition Fields |
|--------------|-----------------|
| `je_submitted` | `amount` (currency), `reference` (text), `line_count` (number), `triggering_user_role` (role) |
| `je_approved` | `amount` (currency), `reference` (text), `triggering_user_role` (role) |
| `je_rejected` | `amount` (currency), `reference` (text), `triggering_user_role` (role) |
| `invoice_sent` | `amount` (currency), `contact_name` (text), `invoice_number` (text), `triggering_user_role` (role) |
| `invoice_paid` | `amount` (currency), `contact_name` (text), `invoice_number` (text), `payment_method` (text) |
| `invoice_overdue` | `amount` (currency), `contact_name` (text), `invoice_number` (text), `days_overdue` (number) |
| `bank_feed_synced` | `imported_count` (number), `unmatched_count` (number), `bank_account_name` (text) |
| `bank_feed_error` | `bank_account_name` (text), `error_message` (text) |
| `reconciliation_completed` | `amount` (currency), `bank_account_name` (text) |
| `task_shared` | `task_title` (text) |
| `client_task_completed` | `task_title` (text) |
| `client_request_submitted` | `request_type` (text), `request_title` (text) |
| `client_request_status_changed` | `request_title` (text), `new_status` (text) |
| `task_comment_practice` | `task_title` (text), `task_visibility` (text) |
| `task_comment_client` | `task_title` (text) |
| `task_overdue` | `task_title` (text), `days_overdue` (number) |
| `signing_*` (5 types) | `document_title` (text), `signer_name` (text) |
| `access_expiring` | `days_until_expiry` (number) |
| `access_expired` | (none) |
| `cash_flow_shortfall` | `shortfall_amount` (currency), `forecast_date` (date) |

---

## Placeholder Tokens per Trigger Type

Each trigger type exposes tokens that can be used in notification title/body text. Resolved at execution time from the event payload.

| Trigger Type | Available Tokens |
|--------------|-----------------|
| `je_submitted` | `{reference}`, `{amount}`, `{actor_name}`, `{line_count}` |
| `je_approved` | `{reference}`, `{amount}`, `{actor_name}` |
| `je_rejected` | `{reference}`, `{amount}`, `{actor_name}`, `{rejection_reason}` |
| `invoice_sent` | `{invoice_number}`, `{amount}`, `{contact_name}`, `{actor_name}` |
| `invoice_paid` | `{invoice_number}`, `{amount}`, `{contact_name}`, `{payment_method}` |
| `invoice_overdue` | `{invoice_number}`, `{amount}`, `{contact_name}`, `{days_overdue}` |
| `bank_feed_synced` | `{bank_account_name}`, `{imported_count}`, `{unmatched_count}` |
| `bank_feed_error` | `{bank_account_name}`, `{error_message}` |
| `task_shared` | `{task_title}`, `{actor_name}` |
| `task_comment_*` | `{task_title}`, `{commenter_name}` |
| `signing_*` | `{document_title}`, `{signer_name}`, `{actor_name}` |
| Common (all triggers) | `{workspace_name}`, `{trigger_label}` |
