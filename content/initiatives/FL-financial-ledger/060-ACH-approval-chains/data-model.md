---
title: "Data Model: Configurable Approval Chains"
---

# Data Model: Configurable Approval Chains

**Epic**: 060-ACH | **Scope**: P1 (Backend Only)

---

## Entity Relationship Diagram

```
                     ┌─────────────────────┐
                     │  ApprovalWorkflow    │
                     │  (definition)        │
                     ├─────────────────────┤
                     │  workspace_id FK     │
                     │  document_type       │
                     │  name                │
                     │  min_threshold_cents │
                     │  version             │
                     │  is_active           │
                     └──────────┬──────────┘
                                │ hasMany
                     ┌──────────▼──────────┐
                     │   ApprovalStep      │
                     │   (definition)      │
                     ├─────────────────────┤
                     │  workflow_id FK      │
                     │  order               │
                     │  label               │
                     │  mode                │
                     │  approver_user_ids   │
                     │  approver_role_names │
                     └─────────────────────┘


    ┌──────────────┐         ┌─────────────────────────┐
    │  Document    │ 1 ──◄── │  ApprovalInstance        │
    │  (JE/Inv/    │         │  (runtime)               │
    │   Bill/BAS)  │         ├─────────────────────────┤
    └──────────────┘         │  approvable_type/id      │
                             │  workspace_id FK         │
                             │  workflow_id FK           │
                             │  workflow_snapshot (JSON) │
                             │  submitted_by FK         │
                             │  current_step_order      │
                             │  status                  │
                             └────────────┬────────────┘
                                          │ hasMany
                             ┌────────────▼────────────┐
                             │  ApprovalStepInstance    │
                             │  (runtime)               │
                             ├─────────────────────────┤
                             │  approval_instance_id FK │
                             │  step_order              │
                             │  label                   │
                             │  mode                    │
                             │  status                  │
                             │  resolved_approver_ids   │
                             │  actions (JSON)          │
                             └─────────────────────────┘


                     ┌─────────────────────┐
                     │ ApprovalDelegation   │
                     ├─────────────────────┤
                     │  workspace_id FK     │
                     │  delegator_user_id   │
                     │  delegate_user_id    │
                     │  starts_at           │
                     │  ends_at             │
                     └─────────────────────┘
```

---

## New Tables

### `approval_workflows` (workspace-scoped)

Stores workflow definitions. Each workflow targets a single document type and defines a minimum threshold for routing.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK AUTO | |
| uuid | char(36) UNIQUE | Public identifier, route model binding key |
| workspace_id | bigint FK (workspaces) | cascadeOnDelete |
| document_type | varchar(30) | Enum: `journal_entry`, `invoice`, `bill`, `bas_period` |
| name | varchar(255) | Unique per workspace + document_type |
| description | text NULLABLE | Optional description |
| min_threshold_cents | bigint DEFAULT 0 | Minimum document amount (cents) for routing. Unique per workspace + document_type among active workflows |
| version | integer DEFAULT 1 | Incremented on each edit |
| is_active | boolean DEFAULT true | Inactive workflows do not participate in routing |
| created_by | bigint FK (users) NULLABLE | nullOnDelete |
| created_at | timestamp | |
| updated_at | timestamp | |

**Indexes**:
- `(workspace_id, document_type, is_active)` -- routing query: find active workflows for a doc type
- `(uuid)` UNIQUE
- `(workspace_id, document_type, name)` UNIQUE -- name uniqueness constraint
- `(workspace_id, document_type, min_threshold_cents)` UNIQUE WHERE `is_active = true` -- threshold uniqueness among active workflows (partial index on PostgreSQL)

---

### `approval_steps` (children of approval_workflows)

Defines the ordered steps within a workflow definition. Steps are sequential; `order` determines execution sequence.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK AUTO | |
| approval_workflow_id | bigint FK (approval_workflows) | cascadeOnDelete |
| order | smallint | 1-based step position. Min 1, max 10 per workflow |
| label | varchar(255) | Human-readable step label (e.g., "Manager Review") |
| mode | varchar(20) DEFAULT 'any_one_of' | Enum: `any_one_of`, `all_of`. P1 ships with `any_one_of` only; `all_of` is P2 |
| approver_user_ids | json DEFAULT '[]' | Array of specific user IDs assigned to this step |
| approver_role_names | json DEFAULT '[]' | Array of role name strings (e.g., `["accountant", "owner"]`). Resolved at step activation time |
| escalation_timeout_hours | integer NULLABLE | 1-720. NULL = no escalation. P2 feature, column created in P1 but not used |
| escalation_target_user_id | bigint NULLABLE | Specific user to escalate to. P2 |
| escalation_target_role | varchar(50) NULLABLE | Role name to escalate to. P2 |
| created_at | timestamp | |
| updated_at | timestamp | |

**Indexes**:
- `(approval_workflow_id, order)` UNIQUE -- step order is unique within a workflow

**Constraints**:
- At least one of `approver_user_ids` or `approver_role_names` must be non-empty (validated in Action, not DB constraint)
- `order` between 1 and 10 inclusive

---

### `approval_instances` (workspace-scoped, runtime)

Created when a document is submitted for approval and matched to a workflow. Stores a snapshot of the workflow configuration at creation time so edits to the workflow do not affect in-flight approvals.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK AUTO | |
| uuid | char(36) UNIQUE | Public identifier |
| workspace_id | bigint FK (workspaces) | cascadeOnDelete |
| approval_workflow_id | bigint FK (approval_workflows) NULLABLE | nullOnDelete -- preserved via snapshot |
| approvable_type | varchar(50) | Morph map alias: `journal_entry`, `invoice`, `bill`, `bas_period` |
| approvable_id | bigint | ID of the document being approved |
| submitted_by | bigint FK (users) | User who initiated the approval process. Used for separation-of-duties |
| workflow_snapshot | json | Full snapshot: `{ name, version, steps: [{ order, label, mode, approver_user_ids, approver_role_names }] }` |
| current_step_order | smallint DEFAULT 1 | The step order currently active |
| status | varchar(20) DEFAULT 'pending' | Enum: `pending`, `approved`, `rejected` |
| created_at | timestamp | |
| updated_at | timestamp | |
| completed_at | timestamp NULLABLE | When the chain completed (approved or rejected) |

**Indexes**:
- `(uuid)` UNIQUE
- `(workspace_id, approvable_type, approvable_id)` -- find instance for a document
- `(workspace_id, status)` -- "My Approvals" queue filtering
- `(approval_workflow_id)` -- check for in-flight instances before workflow deletion

**Note on snapshot**: The `workflow_snapshot` JSON captures the exact configuration used for this instance. Even if the workflow is later edited (incrementing `version`), this instance continues under the snapshotted rules.

---

### `approval_step_instances` (children of approval_instances, runtime)

One row per step per approval instance. Tracks the runtime state of each step: who was eligible, who acted, when, and with what outcome.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK AUTO | |
| approval_instance_id | bigint FK (approval_instances) | cascadeOnDelete |
| step_order | smallint | Mirrors the step's position from the workflow snapshot |
| label | varchar(255) | Denormalized from snapshot for query convenience |
| mode | varchar(20) | `any_one_of` or `all_of`. From snapshot |
| status | varchar(20) DEFAULT 'pending' | Enum: `pending`, `active`, `approved`, `rejected`, `skipped` |
| resolved_approver_ids | json DEFAULT '[]' | User IDs resolved at activation time (role-expanded + delegates). Excludes submitter |
| actions | json DEFAULT '[]' | Array of action records: `[{ user_id, action: "approved"|"rejected", comment, is_delegate, delegator_user_id, acted_at }]` |
| activated_at | timestamp NULLABLE | When this step became active |
| completed_at | timestamp NULLABLE | When this step was completed (approved or rejected) |
| created_at | timestamp | |
| updated_at | timestamp | |

**Indexes**:
- `(approval_instance_id, step_order)` UNIQUE
- `(status)` -- find active steps across all instances for notification/escalation queries

**The `actions` JSON structure** (each element):
```json
{
  "user_id": 42,
  "action": "approved",
  "comment": "Verified supporting docs attached",
  "is_delegate": false,
  "delegator_user_id": null,
  "acted_at": "2026-04-01T14:30:00Z"
}
```

---

### `approval_delegations` (workspace-scoped)

Stores delegation of approval authority between users for a date range.

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK AUTO | |
| uuid | char(36) UNIQUE | Public identifier |
| workspace_id | bigint FK (workspaces) | cascadeOnDelete |
| delegator_user_id | bigint FK (users) | The user granting authority. cascadeOnDelete |
| delegate_user_id | bigint FK (users) | The user receiving authority. cascadeOnDelete |
| starts_at | date | Delegation start (inclusive) |
| ends_at | date | Delegation end (inclusive) |
| created_at | timestamp | |
| updated_at | timestamp | |

**Indexes**:
- `(uuid)` UNIQUE
- `(workspace_id, delegator_user_id, starts_at, ends_at)` -- look up active delegations for a user
- `(workspace_id, delegate_user_id)` -- look up what delegations a user has received

**Constraints** (validated in Action):
- `starts_at <= ends_at`
- No overlapping active delegations for the same delegator within the same workspace
- Delegator and delegate must be different users
- Single-level only: delegate cannot further delegate received authority

**Note**: This table is created in P1 migrations for schema completeness but the delegation Actions and API endpoints are P2 scope. P1 does not expose delegation CRUD -- the `resolved_approver_ids` on step instances simply resolves to the directly assigned users/roles without delegate expansion.

---

## Enums

### `ApprovableDocumentType` (new)

```php
enum ApprovableDocumentType: string
{
    case JournalEntry = 'journal_entry';
    case Invoice = 'invoice';
    case Bill = 'bill';
    case BasPeriod = 'bas_period';
}
```

Maps directly to the morph map aliases. Used in `ApprovalWorkflow.document_type` and routing logic.

### `ApprovalMode` (new)

```php
enum ApprovalMode: string
{
    case AnyOneOf = 'any_one_of';
    case AllOf = 'all_of';
}
```

P1 ships with `any_one_of` only. The `all_of` mode column exists in the schema but the `ApproveApprovalStep` action only implements `any_one_of` completion logic. `all_of` is P2 (US6).

### `ApprovalStepStatus` (new)

```php
enum ApprovalStepStatus: string
{
    case Pending = 'pending';     // Not yet reached
    case Active = 'active';       // Currently awaiting action
    case Approved = 'approved';   // Step completed successfully
    case Rejected = 'rejected';   // Step rejected
    case Skipped = 'skipped';     // Skipped (e.g., after rejection of a prior step -- future use)
}
```

### `ApprovalInstanceStatus` (new)

```php
enum ApprovalInstanceStatus: string
{
    case Pending = 'pending';     // Chain in progress
    case Approved = 'approved';   // All steps approved, document transitioned
    case Rejected = 'rejected';   // Rejected at some step
}
```

---

## Morph Map Additions

No new morph map entries required. The `approvable_type` column uses the existing morph aliases (`journal_entry`, `invoice`, `bill`) already defined in `AppServiceProvider`. For BAS periods, add `bas_period` to the morph map:

```php
// AppServiceProvider::boot()
Relation::morphMap([
    // ... existing entries ...
    'bas_period' => \App\Models\Tenant\BasPeriod::class,
]);
```

---

## Amount Extraction for Threshold Matching

| Document Type | Amount Source | Notes |
|---|---|---|
| Journal Entry | Sum of all debit line amounts (`journal_entry_lines.amount` WHERE `direction = 'debit'`) | Loaded via `$entry->lines()->where('direction', 'debit')->sum('amount')` |
| Invoice | `invoices.total` column (cents) | Already stored as integer |
| Bill | `invoices.total` column (cents) -- bills share the `invoices` table with `type = 'bill'` | Already stored as integer |
| BAS Period | N/A -- no amount-based routing | Only one workflow per workspace for BAS. Active workflow matches all BAS submissions |

---

## Workspace Scoping

All five tables include `workspace_id` (directly or inherited through parent FK). The `SetWorkspaceContext` middleware ensures workspace isolation. Models will use a `scopeForWorkspace` scope consistent with the existing pattern.

**Tenant isolation invariant**: Every query on approval tables MUST include a `workspace_id` constraint. Tests will verify that creating an approval instance in Workspace A is invisible from Workspace B.
