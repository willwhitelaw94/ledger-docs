---
title: "Implementation Tasks: Configurable Approval Chains"
---

# Implementation Tasks: Configurable Approval Chains

**Epic**: 060-ACH | **Scope**: P1 Backend Only (US1-US5) | **Branch**: `feature/060-ach-approval-chains`
**Spec**: [spec.md](/initiatives/FL-financial-ledger/060-ACH-approval-chains/spec) | **Plan**: [plan.md](/initiatives/FL-financial-ledger/060-ACH-approval-chains/plan) | **Data Model**: [data-model.md](/initiatives/FL-financial-ledger/060-ACH-approval-chains/data-model)

**Estimated Tests**: ~68 | **New Files**: ~30 | **Modified Files**: ~6

---

## Phase 1: Foundation (Schema, Enums, Models)

### T001 [P] -- Create Migration for All 5 Approval Tables

**File**: `database/migrations/2026_03_22_000001_create_approval_tables.php`

Create a single migration containing all 5 tables. Use `Schema::create` for each.

**Table 1: `approval_workflows`**

| Column | Type | Method |
|--------|------|--------|
| `id` | bigint PK | `$table->id()` |
| `uuid` | char(36) | `$table->char('uuid', 36)->unique()` |
| `workspace_id` | bigint FK | `$table->foreignId('workspace_id')->constrained()->cascadeOnDelete()` |
| `document_type` | varchar(30) | `$table->string('document_type', 30)` |
| `name` | varchar(255) | `$table->string('name')` |
| `description` | text nullable | `$table->text('description')->nullable()` |
| `min_threshold_cents` | bigint | `$table->bigInteger('min_threshold_cents')->default(0)` |
| `version` | integer | `$table->integer('version')->default(1)` |
| `is_active` | boolean | `$table->boolean('is_active')->default(true)` |
| `created_by` | bigint FK nullable | `$table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()` |
| `timestamps` | | `$table->timestamps()` |

Indexes:
```php
$table->index(['workspace_id', 'document_type', 'is_active']);
$table->unique(['workspace_id', 'document_type', 'name']);
// PostgreSQL partial unique index for threshold uniqueness among active workflows:
DB::statement('CREATE UNIQUE INDEX approval_workflows_threshold_unique ON approval_workflows (workspace_id, document_type, min_threshold_cents) WHERE is_active = true');
```

**Table 2: `approval_steps`**

| Column | Type | Method |
|--------|------|--------|
| `id` | bigint PK | `$table->id()` |
| `approval_workflow_id` | bigint FK | `$table->foreignId('approval_workflow_id')->constrained()->cascadeOnDelete()` |
| `order` | smallint | `$table->smallInteger('order')` |
| `label` | varchar(255) | `$table->string('label')` |
| `mode` | varchar(20) | `$table->string('mode', 20)->default('any_one_of')` |
| `approver_user_ids` | json | `$table->json('approver_user_ids')->default('[]')` |
| `approver_role_names` | json | `$table->json('approver_role_names')->default('[]')` |
| `escalation_timeout_hours` | int nullable | `$table->integer('escalation_timeout_hours')->nullable()` |
| `escalation_target_user_id` | bigint nullable | `$table->unsignedBigInteger('escalation_target_user_id')->nullable()` |
| `escalation_target_role` | varchar(50) nullable | `$table->string('escalation_target_role', 50)->nullable()` |
| `timestamps` | | `$table->timestamps()` |

Indexes:
```php
$table->unique(['approval_workflow_id', 'order']);
```

**Table 3: `approval_instances`**

| Column | Type | Method |
|--------|------|--------|
| `id` | bigint PK | `$table->id()` |
| `uuid` | char(36) | `$table->char('uuid', 36)->unique()` |
| `workspace_id` | bigint FK | `$table->foreignId('workspace_id')->constrained()->cascadeOnDelete()` |
| `approval_workflow_id` | bigint FK nullable | `$table->foreignId('approval_workflow_id')->nullable()->constrained('approval_workflows')->nullOnDelete()` |
| `approvable_type` | varchar(50) | `$table->string('approvable_type', 50)` |
| `approvable_id` | bigint | `$table->unsignedBigInteger('approvable_id')` |
| `submitted_by` | bigint FK | `$table->foreignId('submitted_by')->constrained('users')` |
| `workflow_snapshot` | json | `$table->json('workflow_snapshot')` |
| `current_step_order` | smallint | `$table->smallInteger('current_step_order')->default(1)` |
| `status` | varchar(20) | `$table->string('status', 20)->default('pending')` |
| `timestamps` | | `$table->timestamps()` |
| `completed_at` | timestamp nullable | `$table->timestamp('completed_at')->nullable()` |

Indexes:
```php
$table->index(['workspace_id', 'approvable_type', 'approvable_id']);
$table->index(['workspace_id', 'status']);
$table->index(['approval_workflow_id']);
```

**Table 4: `approval_step_instances`**

| Column | Type | Method |
|--------|------|--------|
| `id` | bigint PK | `$table->id()` |
| `approval_instance_id` | bigint FK | `$table->foreignId('approval_instance_id')->constrained('approval_instances')->cascadeOnDelete()` |
| `step_order` | smallint | `$table->smallInteger('step_order')` |
| `label` | varchar(255) | `$table->string('label')` |
| `mode` | varchar(20) | `$table->string('mode', 20)` |
| `status` | varchar(20) | `$table->string('status', 20)->default('pending')` |
| `resolved_approver_ids` | json | `$table->json('resolved_approver_ids')->default('[]')` |
| `actions` | json | `$table->json('actions')->default('[]')` |
| `activated_at` | timestamp nullable | `$table->timestamp('activated_at')->nullable()` |
| `completed_at` | timestamp nullable | `$table->timestamp('completed_at')->nullable()` |
| `timestamps` | | `$table->timestamps()` |

Indexes:
```php
$table->unique(['approval_instance_id', 'step_order']);
$table->index(['status']);
```

**Table 5: `approval_delegations`** (P2 usage, schema created now)

| Column | Type | Method |
|--------|------|--------|
| `id` | bigint PK | `$table->id()` |
| `uuid` | char(36) | `$table->char('uuid', 36)->unique()` |
| `workspace_id` | bigint FK | `$table->foreignId('workspace_id')->constrained()->cascadeOnDelete()` |
| `delegator_user_id` | bigint FK | `$table->foreignId('delegator_user_id')->constrained('users')->cascadeOnDelete()` |
| `delegate_user_id` | bigint FK | `$table->foreignId('delegate_user_id')->constrained('users')->cascadeOnDelete()` |
| `starts_at` | date | `$table->date('starts_at')` |
| `ends_at` | date | `$table->date('ends_at')` |
| `timestamps` | | `$table->timestamps()` |

Indexes:
```php
$table->index(['workspace_id', 'delegator_user_id', 'starts_at', 'ends_at']);
$table->index(['workspace_id', 'delegate_user_id']);
```

**Acceptance**: `php artisan migrate` succeeds. All 5 tables exist in PostgreSQL with correct columns, types, indexes, and foreign keys.

---

### T002 [P] -- Create 4 Enums

Create all 4 enums as string-backed PHP enums.

**File 1**: `app/Enums/ApprovableDocumentType.php`

```php
<?php

namespace App\Enums;

enum ApprovableDocumentType: string
{
    case JournalEntry = 'journal_entry';
    case Invoice = 'invoice';
    case Bill = 'bill';
    case BasPeriod = 'bas_period';
}
```

**File 2**: `app/Enums/ApprovalMode.php`

```php
<?php

namespace App\Enums;

enum ApprovalMode: string
{
    case AnyOneOf = 'any_one_of';
    case AllOf = 'all_of';
}
```

**File 3**: `app/Enums/ApprovalStepStatus.php`

```php
<?php

namespace App\Enums;

enum ApprovalStepStatus: string
{
    case Pending = 'pending';
    case Active = 'active';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Skipped = 'skipped';
}
```

**File 4**: `app/Enums/ApprovalInstanceStatus.php`

```php
<?php

namespace App\Enums;

enum ApprovalInstanceStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
```

**Acceptance**: All 4 enums are importable with no syntax errors.

---

### T003 [P] -- Create ApprovalWorkflow Model

**File**: `app/Models/Tenant/ApprovalWorkflow.php`

**Class**: `ApprovalWorkflow extends Model`

**`$fillable`**:
```php
'uuid', 'workspace_id', 'document_type', 'name', 'description',
'min_threshold_cents', 'version', 'is_active', 'created_by'
```

**`casts()`**:
```php
'document_type' => ApprovableDocumentType::class,
'min_threshold_cents' => 'integer',
'version' => 'integer',
'is_active' => 'boolean',
'created_by' => 'integer',
```

**`getRouteKeyName()`**: return `'uuid'`

**Relationships**:
- `steps(): HasMany` -> `ApprovalStep::class`, ordered by `order` (use `->orderBy('order')`)
- `workspace(): BelongsTo` -> `Workspace::class`
- `creator(): BelongsTo` -> `User::class`, `'created_by'`
- `approvalInstances(): HasMany` -> `ApprovalInstance::class`

**Scopes**:
- `scopeForWorkspace($query, int $workspaceId)` -- `->where('workspace_id', $workspaceId)`
- `scopeActive($query)` -- `->where('is_active', true)`

**Boot method**: Auto-generate UUID on creating:
```php
protected static function boot(): void
{
    parent::boot();
    static::creating(function ($model) {
        $model->uuid = $model->uuid ?? (string) \Illuminate\Support\Str::uuid();
    });
}
```

**Acceptance**: Model is instantiable, relationships load correctly, UUID auto-generates on create.

---

### T004 [P] -- Create ApprovalStep Model

**File**: `app/Models/Tenant/ApprovalStep.php`

**Class**: `ApprovalStep extends Model`

**`$fillable`**:
```php
'approval_workflow_id', 'order', 'label', 'mode',
'approver_user_ids', 'approver_role_names',
'escalation_timeout_hours', 'escalation_target_user_id', 'escalation_target_role'
```

**`casts()`**:
```php
'order' => 'integer',
'mode' => ApprovalMode::class,
'approver_user_ids' => 'array',
'approver_role_names' => 'array',
'escalation_timeout_hours' => 'integer',
'escalation_target_user_id' => 'integer',
```

**Relationships**:
- `workflow(): BelongsTo` -> `ApprovalWorkflow::class`, `'approval_workflow_id'`

**Acceptance**: Model is instantiable, JSON columns cast to arrays, `mode` cast to `ApprovalMode` enum.

---

### T005 [P] -- Create ApprovalInstance Model

**File**: `app/Models/Tenant/ApprovalInstance.php`

**Class**: `ApprovalInstance extends Model`

**`$fillable`**:
```php
'uuid', 'workspace_id', 'approval_workflow_id', 'approvable_type', 'approvable_id',
'submitted_by', 'workflow_snapshot', 'current_step_order', 'status', 'completed_at'
```

**`casts()`**:
```php
'status' => ApprovalInstanceStatus::class,
'workflow_snapshot' => 'array',
'current_step_order' => 'integer',
'submitted_by' => 'integer',
'completed_at' => 'datetime',
```

**`getRouteKeyName()`**: return `'uuid'`

**Relationships**:
- `stepInstances(): HasMany` -> `ApprovalStepInstance::class`, ordered by `step_order`
- `workflow(): BelongsTo` -> `ApprovalWorkflow::class`, `'approval_workflow_id'`
- `workspace(): BelongsTo` -> `Workspace::class`
- `submitter(): BelongsTo` -> `User::class`, `'submitted_by'`
- `approvable(): MorphTo` -- uses the existing morph map for `approvable_type` / `approvable_id`

**Scopes**:
- `scopeForWorkspace($query, int $workspaceId)` -- `->where('workspace_id', $workspaceId)`
- `scopePending($query)` -- `->where('status', ApprovalInstanceStatus::Pending)`

**Boot method**: Auto-generate UUID on creating (same pattern as T003).

**Helper method**:
```php
public function activeStepInstance(): ?ApprovalStepInstance
{
    return $this->stepInstances()
        ->where('step_order', $this->current_step_order)
        ->first();
}
```

**Acceptance**: Model is instantiable, `approvable()` morph resolves to JournalEntry/Invoice, UUID auto-generates on create, `activeStepInstance()` returns the current step.

---

### T006 [P] -- Create ApprovalStepInstance Model

**File**: `app/Models/Tenant/ApprovalStepInstance.php`

**Class**: `ApprovalStepInstance extends Model`

**`$fillable`**:
```php
'approval_instance_id', 'step_order', 'label', 'mode', 'status',
'resolved_approver_ids', 'actions', 'activated_at', 'completed_at'
```

**`casts()`**:
```php
'step_order' => 'integer',
'mode' => ApprovalMode::class,
'status' => ApprovalStepStatus::class,
'resolved_approver_ids' => 'array',
'actions' => 'array',
'activated_at' => 'datetime',
'completed_at' => 'datetime',
```

**Relationships**:
- `approvalInstance(): BelongsTo` -> `ApprovalInstance::class`

**Acceptance**: Model is instantiable, `actions` and `resolved_approver_ids` cast to arrays.

---

### T007 [P] -- Create ApprovalDelegation Model (P2 usage, schema only)

**File**: `app/Models/Tenant/ApprovalDelegation.php`

**Class**: `ApprovalDelegation extends Model`

**`$fillable`**:
```php
'uuid', 'workspace_id', 'delegator_user_id', 'delegate_user_id', 'starts_at', 'ends_at'
```

**`casts()`**:
```php
'starts_at' => 'date',
'ends_at' => 'date',
```

**`getRouteKeyName()`**: return `'uuid'`

**Relationships**:
- `delegator(): BelongsTo` -> `User::class`, `'delegator_user_id'`
- `delegate(): BelongsTo` -> `User::class`, `'delegate_user_id'`
- `workspace(): BelongsTo` -> `Workspace::class`

**Boot method**: Auto-generate UUID on creating.

**Acceptance**: Model is instantiable. No actions or endpoints in P1 -- model exists for schema completeness.

---

### T008 -- Add `bas_period` to Morph Map

**File**: `app/Providers/AppServiceProvider.php`

**Location**: Inside the `Relation::morphMap([...])` call in `boot()` (currently at line ~129).

**Change**: Add this entry to the existing morph map array:

```php
'bas_period' => \App\Models\Tenant\BasPeriod::class,
```

Add it after the existing `'practice_task'` or `'client_request'` entry. Exact placement is not critical as long as it is inside the `morphMap` array.

**Acceptance**: `Relation::getMorphedModel('bas_period')` returns `App\Models\Tenant\BasPeriod::class`.

---

### T009 -- Define Feature Flag

**File**: `app/Providers/AppServiceProvider.php`

**Location**: After the existing `Feature::define(...)` calls (currently lines 197-200).

**Change**: Add:

```php
Feature::define('configurable_approval_chains', fn () => false);
```

**Acceptance**: `Feature::active('configurable_approval_chains')` returns `false` by default.

---

### T010 -- Register ApprovalWorkflow Policy

**File**: `app/Providers/AppServiceProvider.php`

**Location**: After the last `Gate::policy(...)` call (currently line ~213).

**Change**: Add:

```php
Gate::policy(\App\Models\Tenant\ApprovalWorkflow::class, \App\Policies\ApprovalWorkflowPolicy::class);
```

**Depends on**: T003 (model), T017 (policy).

**Acceptance**: `Gate::getPolicyFor(ApprovalWorkflow::class)` returns `ApprovalWorkflowPolicy`.

---

### T011 -- Add Permissions to RolesAndPermissionsSeeder

**File**: `database/seeders/RolesAndPermissionsSeeder.php`

**Changes** (4 locations):

1. **`allPermissions()`**: Add after the `// Estate Planning (060-WEP)` block (before closing `];` at line ~278):
```php
// Approval Chains (060-ACH)
'approval-workflow.manage',
'approval-workflow.view',
```

2. **`accountantPermissions()`**: Add after the estate planning permissions (before closing `];` at line ~341):
```php
// Approval Chains (060-ACH)
'approval-workflow.manage', 'approval-workflow.view',
```

3. **`approverPermissions()`**: Add after the estate planning line (before closing `];` at line ~441):
```php
// Approval Chains (060-ACH)
'approval-workflow.view',
```

4. **`auditorPermissions()`**: Add after the estate planning line (before closing `];` at line ~489):
```php
// Approval Chains (060-ACH)
'approval-workflow.view',
```

**Acceptance**: After running `php artisan db:seed --class=RolesAndPermissionsSeeder`:
- `owner` role has `approval-workflow.manage` and `approval-workflow.view`
- `accountant` role has both
- `approver` role has `approval-workflow.view` only
- `auditor` role has `approval-workflow.view` only
- `bookkeeper` role has neither
- `client` role has neither

---

## Phase 2: Core Actions (Business Logic)

### T012 -- CreateApprovalWorkflow Action

**File**: `app/Actions/Approval/CreateApprovalWorkflow.php`

**Class**: `CreateApprovalWorkflow` with `AsAction` trait.

**Method signature**:
```php
public function handle(
    int $workspaceId,
    ApprovableDocumentType $documentType,
    string $name,
    ?string $description,
    int $minThresholdCents,
    array $steps,
    int $createdBy,
): ApprovalWorkflow
```

**`$steps` array format** (each element):
```php
[
    'order' => int,        // 1-based, sequential
    'label' => string,
    'mode' => string,      // 'any_one_of' or 'all_of'
    'approver_user_ids' => int[],
    'approver_role_names' => string[],
]
```

**Logic**:
1. Create `ApprovalWorkflow` record with all fields. Set `version` = 1, `is_active` = true.
2. Loop `$steps`, create `ApprovalStep` for each, attached to the workflow.
3. Return workflow with `steps` relationship loaded.

**No validation in action** -- validation is handled by `StoreApprovalWorkflowRequest` (T019). The action trusts its inputs.

**Acceptance**: Creates workflow + N step records. Version is 1. Steps are ordered correctly.

---

### T013 -- UpdateApprovalWorkflow Action

**File**: `app/Actions/Approval/UpdateApprovalWorkflow.php`

**Class**: `UpdateApprovalWorkflow` with `AsAction` trait.

**Method signature**:
```php
public function handle(
    ApprovalWorkflow $workflow,
    array $data,
): ApprovalWorkflow
```

**`$data`** keys (all optional): `name`, `description`, `min_threshold_cents`, `steps`.

**Logic**:
1. Guard: if `$data` contains `document_type`, throw `\DomainException('Cannot change document type after creation')`.
2. Update workflow scalar fields from `$data` (only keys present).
3. Increment `$workflow->version` by 1.
4. If `steps` key is present in `$data`:
   - Delete all existing `ApprovalStep` records for this workflow (`$workflow->steps()->delete()`).
   - Create new `ApprovalStep` records from `$data['steps']` array.
5. Save workflow.
6. Return workflow with fresh `steps` relationship.

**Acceptance**: Version increments. Steps are replaced. In-flight instances are NOT affected (they use their snapshot).

---

### T014 -- DeleteApprovalWorkflow Action

**File**: `app/Actions/Approval/DeleteApprovalWorkflow.php`

**Class**: `DeleteApprovalWorkflow` with `AsAction` trait.

**Method signature**:
```php
public function handle(ApprovalWorkflow $workflow): void
```

**Logic**:
1. Check for pending instances:
```php
$hasPending = ApprovalInstance::where('approval_workflow_id', $workflow->id)
    ->where('status', ApprovalInstanceStatus::Pending)
    ->exists();
```
2. If `$hasPending` is true, throw `\DomainException('Cannot delete a workflow with in-flight approval instances. Deactivate it instead.')`.
3. Otherwise, `$workflow->delete()` (cascade deletes steps via FK).

**Acceptance**: Throws DomainException when pending instances exist. Deletes workflow + steps when no pending instances.

---

### T015 -- DeactivateApprovalWorkflow Action

**File**: `app/Actions/Approval/DeactivateApprovalWorkflow.php`

**Class**: `DeactivateApprovalWorkflow` with `AsAction` trait.

**Method signature**:
```php
public function handle(ApprovalWorkflow $workflow): ApprovalWorkflow
```

**Logic**:
1. `$workflow->update(['is_active' => false])`.
2. Return `$workflow->fresh()`.

Note: Also create an `ActivateApprovalWorkflow` action in the same file (or a separate `app/Actions/Approval/ActivateApprovalWorkflow.php`) with the same pattern but setting `is_active => true`.

**Acceptance**: Workflow `is_active` is set to false/true. Inactive workflows are excluded from routing queries.

---

### T016 -- RouteDocumentForApproval Action (Core Routing Engine)

**File**: `app/Actions/Approval/RouteDocumentForApproval.php`

**Class**: `RouteDocumentForApproval` with `AsAction` trait.

**Method signature**:
```php
public function handle(
    ApprovableDocumentType $approvableType,
    int $approvableId,
    int $workspaceId,
    int $amountCents,
    int $submittedBy,
): ?ApprovalInstance
```

**Logic**:
1. **Feature flag check**:
```php
if (! Feature::active('configurable_approval_chains')) {
    return null;
}
```

2. **Find matching workflow** (highest threshold wins):
```php
$workflow = ApprovalWorkflow::where('workspace_id', $workspaceId)
    ->where('document_type', $approvableType)
    ->where('is_active', true)
    ->where('min_threshold_cents', '<=', $amountCents)
    ->orderByDesc('min_threshold_cents')
    ->with('steps')
    ->first();
```

3. If no workflow found, return `null`. (Existing flow continues.)

4. **Build workflow snapshot JSON**:
```php
$snapshot = [
    'name' => $workflow->name,
    'version' => $workflow->version,
    'steps' => $workflow->steps->map(fn (ApprovalStep $step) => [
        'order' => $step->order,
        'label' => $step->label,
        'mode' => $step->mode->value,
        'approver_user_ids' => $step->approver_user_ids,
        'approver_role_names' => $step->approver_role_names,
    ])->toArray(),
];
```

5. **Create ApprovalInstance**:
```php
$instance = ApprovalInstance::create([
    'workspace_id' => $workspaceId,
    'approval_workflow_id' => $workflow->id,
    'approvable_type' => $approvableType->value,
    'approvable_id' => $approvableId,
    'submitted_by' => $submittedBy,
    'workflow_snapshot' => $snapshot,
    'current_step_order' => 1,
    'status' => ApprovalInstanceStatus::Pending,
]);
```

6. **Create ApprovalStepInstance rows** for each step in the snapshot (all start as `pending`):
```php
foreach ($snapshot['steps'] as $step) {
    ApprovalStepInstance::create([
        'approval_instance_id' => $instance->id,
        'step_order' => $step['order'],
        'label' => $step['label'],
        'mode' => $step['mode'],
        'status' => ApprovalStepStatus::Pending,
    ]);
}
```

7. **Activate Step 1**:
```php
$firstStep = $instance->stepInstances()->where('step_order', 1)->first();
$resolvedApproverIds = $this->resolveApprovers($snapshot['steps'][0], $workspaceId, $submittedBy);

$firstStep->update([
    'status' => ApprovalStepStatus::Active,
    'resolved_approver_ids' => $resolvedApproverIds,
    'activated_at' => now(),
]);
```

8. **Dispatch event**:
```php
event(new ApprovalStepActivated($instance, $firstStep));
```

9. Return `$instance`.

**Private helper** `resolveApprovers(array $stepConfig, int $workspaceId, int $submittedBy): array`:
- Start with `$stepConfig['approver_user_ids']` (direct user IDs).
- For each role in `$stepConfig['approver_role_names']`, query workspace users with that role:
```php
$workspace = Workspace::find($workspaceId);
$roleUserIds = $workspace->users()
    ->wherePivot('role', $roleName)
    ->pluck('users.id')
    ->toArray();
```
- Merge user IDs and role-resolved IDs, deduplicate.
- Remove `$submittedBy` from the list (separation of duties).
- Return the array of unique user IDs.

**Acceptance**: Routes to highest matching threshold. Returns null when flag off or no workflow matches. Snapshot captures exact workflow config. Step 1 is activated with resolved approvers excluding submitter.

---

### T017 -- ApproveApprovalStep Action

**File**: `app/Actions/Approval/ApproveApprovalStep.php`

**Class**: `ApproveApprovalStep` with `AsAction` trait.

**Method signature**:
```php
public function handle(
    string $instanceUuid,
    int $workspaceId,
    int $userId,
    ?string $comment = null,
): ApprovalStepInstance
```

**Logic**:

1. **Load instance**:
```php
$instance = ApprovalInstance::where('uuid', $instanceUuid)
    ->where('workspace_id', $workspaceId)
    ->firstOrFail();
```

2. **Guard -- instance must be pending**:
```php
if ($instance->status !== ApprovalInstanceStatus::Pending) {
    throw new \DomainException('This approval chain is no longer active.');
}
```

3. **Load active step**:
```php
$step = $instance->stepInstances()
    ->where('step_order', $instance->current_step_order)
    ->where('status', ApprovalStepStatus::Active)
    ->firstOrFail();
```

4. **Guard -- user must be in resolved_approver_ids**:
```php
if (! in_array($userId, $step->resolved_approver_ids)) {
    throw new \DomainException('You are not an eligible approver for this step.');
}
```

5. **Guard -- separation of duties (submitter cannot approve)**:
```php
if ($userId === $instance->submitted_by) {
    throw new \DomainException('The document submitter cannot approve any step in the approval chain.');
}
```

6. **Guard -- user must have the document's approve permission**. Map `approvable_type` to permission:
```php
$permissionMap = [
    'journal_entry' => 'journal-entry.approve',
    'invoice' => 'invoice.approve',
    'bill' => 'bill.approve',
    'bas_period' => 'bas.approve',
];
$requiredPermission = $permissionMap[$instance->approvable_type]
    ?? throw new \DomainException('Unknown document type.');

$user = User::findOrFail($userId);
if (! $user->hasPermissionTo($requiredPermission)) {
    throw new \DomainException('You do not have permission to approve this document type.');
}
```

7. **Record approval action** in step's `actions` JSON (append):
```php
$actions = $step->actions ?? [];
$actions[] = [
    'user_id' => $userId,
    'action' => 'approved',
    'comment' => $comment,
    'is_delegate' => false,
    'delegator_user_id' => null,
    'acted_at' => now()->toIso8601String(),
];
$step->actions = $actions;
```

8. **Complete step** (P1 is `any_one_of` only -- first approval completes):
```php
$step->status = ApprovalStepStatus::Approved;
$step->completed_at = now();
$step->save();
```

9. **Check if final step**:
```php
$totalSteps = $instance->stepInstances()->count();
$isFinalStep = ($instance->current_step_order >= $totalSteps);
```

10. **If final step (chain complete)**:
```php
$instance->status = ApprovalInstanceStatus::Approved;
$instance->completed_at = now();
$instance->save();

// Fire aggregate approve for the underlying document
$this->approveDocument($instance, $userId);

event(new ApprovalChainCompleted($instance));
```

11. **If NOT final step (advance chain)**:
```php
$instance->current_step_order++;
$instance->save();

// Activate next step
$nextStep = $instance->stepInstances()
    ->where('step_order', $instance->current_step_order)
    ->first();

$snapshotSteps = $instance->workflow_snapshot['steps'];
$nextStepConfig = collect($snapshotSteps)->firstWhere('order', $nextStep->step_order);

$resolvedApproverIds = app(RouteDocumentForApproval::class)
    ->resolveApprovers($nextStepConfig, $instance->workspace_id, $instance->submitted_by);

$nextStep->update([
    'status' => ApprovalStepStatus::Active,
    'resolved_approver_ids' => $resolvedApproverIds,
    'activated_at' => now(),
]);

event(new ApprovalStepActivated($instance, $nextStep));
```

12. Return `$step`.

**Private helper** `approveDocument(ApprovalInstance $instance, int $userId): void`:
```php
match ($instance->approvable_type) {
    'journal_entry' => ApproveJournalEntry::run(
        JournalEntry::findOrFail($instance->approvable_id)->uuid,
        $userId,
    ),
    // invoice, bill, bas_period are P2 scope
    default => null,
};
```

Requires `use App\Actions\Ledger\ApproveJournalEntry;` and `use App\Models\Tenant\JournalEntry;`.

**NOTE**: Extract the `resolveApprovers` method to a shared concern or make it public on `RouteDocumentForApproval` so both T016 and T017 can call it. Recommended: make it `public` on `RouteDocumentForApproval`.

**Acceptance**: Approves step. Advances chain to next step. On final step, calls `ApproveJournalEntry::run()` and dispatches `ApprovalChainCompleted`. Guards block: non-eligible user, submitter, already-completed chain.

---

### T018 -- RejectApprovalStep Action

**File**: `app/Actions/Approval/RejectApprovalStep.php`

**Class**: `RejectApprovalStep` with `AsAction` trait.

**Method signature**:
```php
public function handle(
    string $instanceUuid,
    int $workspaceId,
    int $userId,
    string $reason,
): ApprovalStepInstance
```

**Logic**:

1-6. **Same guards as T017** (load instance, check pending, load active step, check eligible, check separation of duties, check permission).

7. **Record rejection** in step's `actions` JSON:
```php
$actions = $step->actions ?? [];
$actions[] = [
    'user_id' => $userId,
    'action' => 'rejected',
    'comment' => $reason,
    'is_delegate' => false,
    'delegator_user_id' => null,
    'acted_at' => now()->toIso8601String(),
];
$step->actions = $actions;
$step->status = ApprovalStepStatus::Rejected;
$step->completed_at = now();
$step->save();
```

8. **Skip all subsequent steps**:
```php
$instance->stepInstances()
    ->where('step_order', '>', $instance->current_step_order)
    ->update(['status' => ApprovalStepStatus::Skipped->value]);
```

9. **Reject the instance**:
```php
$instance->status = ApprovalInstanceStatus::Rejected;
$instance->completed_at = now();
$instance->save();
```

10. **Return document to Draft** by calling the aggregate's reject:
```php
if ($instance->approvable_type === 'journal_entry') {
    $je = JournalEntry::findOrFail($instance->approvable_id);
    JournalEntryAggregate::retrieve($je->uuid)
        ->reject($userId, $reason)
        ->persist();
}
```

Requires `use App\Aggregates\JournalEntryAggregate;`.

11. **Dispatch event**:
```php
event(new ApprovalChainRejected($instance, $step));
```

12. Return `$step`.

**Acceptance**: Step is rejected. Subsequent steps are skipped. Instance is rejected. JE returns to Draft. `ApprovalChainRejected` event fires.

---

## Phase 3: US1 -- Workflow CRUD (Controller, Routes, Policy, Form Requests, Resources)

### T019 -- StoreApprovalWorkflowRequest

**File**: `app/Http/Requests/Approval/StoreApprovalWorkflowRequest.php`

**`authorize()`**:
```php
return $this->user()->can('create', ApprovalWorkflow::class);
```

**`rules()`**:
```php
return [
    'document_type' => ['required', 'string', Rule::in(array_column(ApprovableDocumentType::cases(), 'value'))],
    'name' => ['required', 'string', 'max:255'],
    'description' => ['nullable', 'string'],
    'min_threshold_cents' => ['required', 'integer', 'min:0'],
    'steps' => ['required', 'array', 'min:1', 'max:10'],
    'steps.*.order' => ['required', 'integer', 'min:1', 'max:10'],
    'steps.*.label' => ['required', 'string', 'max:255'],
    'steps.*.mode' => ['required', 'string', Rule::in(array_column(ApprovalMode::cases(), 'value'))],
    'steps.*.approver_user_ids' => ['present', 'array'],
    'steps.*.approver_user_ids.*' => ['integer', 'exists:users,id'],
    'steps.*.approver_role_names' => ['present', 'array'],
    'steps.*.approver_role_names.*' => ['string', Rule::in(['owner', 'accountant', 'bookkeeper', 'approver', 'auditor', 'client'])],
];
```

**`after()` hooks**:
1. **Name uniqueness** per workspace + document_type:
```php
$exists = ApprovalWorkflow::where('workspace_id', $this->input('workspace_id'))
    ->where('document_type', $this->input('document_type'))
    ->where('name', $this->input('name'))
    ->exists();
if ($exists) {
    $validator->errors()->add('name', 'A workflow with this name already exists for this document type.');
}
```

2. **Threshold uniqueness** among active workflows:
```php
$thresholdExists = ApprovalWorkflow::where('workspace_id', $this->input('workspace_id'))
    ->where('document_type', $this->input('document_type'))
    ->where('is_active', true)
    ->where('min_threshold_cents', $this->input('min_threshold_cents'))
    ->exists();
if ($thresholdExists) {
    $validator->errors()->add('min_threshold_cents', 'An active workflow for this document type already has this threshold.');
}
```

3. **Each step has at least one approver** (user or role):
```php
foreach ($this->input('steps', []) as $i => $step) {
    $userIds = $step['approver_user_ids'] ?? [];
    $roleNames = $step['approver_role_names'] ?? [];
    if (empty($userIds) && empty($roleNames)) {
        $validator->errors()->add("steps.{$i}", "Step {$step['order']} must have at least one approver (user or role).");
    }
}
```

4. **BAS: max one active workflow per workspace**:
```php
if ($this->input('document_type') === ApprovableDocumentType::BasPeriod->value) {
    $basExists = ApprovalWorkflow::where('workspace_id', $this->input('workspace_id'))
        ->where('document_type', ApprovableDocumentType::BasPeriod->value)
        ->where('is_active', true)
        ->exists();
    if ($basExists) {
        $validator->errors()->add('document_type', 'Only one active BAS approval workflow is allowed per workspace.');
    }
}
```

**Acceptance**: Validates all constraints. Returns 422 with specific messages on violation.

---

### T020 -- UpdateApprovalWorkflowRequest

**File**: `app/Http/Requests/Approval/UpdateApprovalWorkflowRequest.php`

**`authorize()`**:
```php
$workflow = ApprovalWorkflow::where('uuid', $this->route('uuid'))
    ->where('workspace_id', $this->input('workspace_id'))
    ->firstOrFail();
$this->attributes->set('approvalWorkflow', $workflow);
return $this->user()->can('update', $workflow);
```

**`rules()`**: Same as T019 but all fields optional (`'sometimes'` instead of `'required'` for top-level fields). `steps` is optional -- if provided, follows same validation as T019.

**`after()` hooks**: Same uniqueness checks as T019, but exclude the current workflow from the queries:
```php
->where('id', '!=', $this->attributes->get('approvalWorkflow')->id)
```

**Acceptance**: Partial updates work. Uniqueness checks exclude self.

---

### T021 [P] -- DeleteApprovalWorkflowRequest

**File**: `app/Http/Requests/Approval/DeleteApprovalWorkflowRequest.php`

**`authorize()`**:
```php
$workflow = ApprovalWorkflow::where('uuid', $this->route('uuid'))
    ->where('workspace_id', $this->input('workspace_id'))
    ->firstOrFail();
$this->attributes->set('approvalWorkflow', $workflow);
return $this->user()->can('delete', $workflow);
```

**`rules()`**: Empty array (no body needed for DELETE).

**Acceptance**: Resolves workflow and checks policy.

---

### T022 [P] -- ApproveStepRequest

**File**: `app/Http/Requests/Approval/ApproveStepRequest.php`

**`authorize()`**: return `true` (dynamic permission checking happens in the action itself -- T017).

**`rules()`**:
```php
return [
    'comment' => ['nullable', 'string', 'max:2000'],
];
```

**Acceptance**: Accepts optional comment. Auth deferred to action.

---

### T023 [P] -- RejectStepRequest

**File**: `app/Http/Requests/Approval/RejectStepRequest.php`

**`authorize()`**: return `true` (dynamic permission checking in action -- T018).

**`rules()`**:
```php
return [
    'reason' => ['required', 'string', 'max:2000'],
];
```

**Acceptance**: Requires `reason` string. Returns 422 if missing.

---

### T024 -- ApprovalWorkflowPolicy

**File**: `app/Policies/ApprovalWorkflowPolicy.php`

```php
<?php

namespace App\Policies;

use App\Models\Tenant\ApprovalWorkflow;
use App\Models\User;

class ApprovalWorkflowPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('approval-workflow.view');
    }

    public function view(User $user, ApprovalWorkflow $workflow): bool
    {
        return $user->hasPermissionTo('approval-workflow.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('approval-workflow.manage');
    }

    public function update(User $user, ApprovalWorkflow $workflow): bool
    {
        return $user->hasPermissionTo('approval-workflow.manage');
    }

    public function delete(User $user, ApprovalWorkflow $workflow): bool
    {
        return $user->hasPermissionTo('approval-workflow.manage');
    }

    public function deactivate(User $user, ApprovalWorkflow $workflow): bool
    {
        return $user->hasPermissionTo('approval-workflow.manage');
    }
}
```

**Acceptance**: `viewAny`/`view` pass for owner, accountant, approver, auditor. `create`/`update`/`delete`/`deactivate` pass for owner and accountant only.

---

### T025 [P] -- ApprovalWorkflowResource

**File**: `app/Http/Resources/ApprovalWorkflowResource.php`

```php
public function toArray($request): array
{
    return [
        'uuid' => $this->uuid,
        'document_type' => $this->document_type->value,
        'name' => $this->name,
        'description' => $this->description,
        'min_threshold_cents' => $this->min_threshold_cents,
        'version' => $this->version,
        'is_active' => $this->is_active,
        'step_count' => $this->whenLoaded('steps', fn () => $this->steps->count()),
        'steps' => $this->whenLoaded('steps', fn () => $this->steps->map(fn ($step) => [
            'order' => $step->order,
            'label' => $step->label,
            'mode' => $step->mode->value,
            'approver_user_ids' => $step->approver_user_ids,
            'approver_role_names' => $step->approver_role_names,
        ])),
        'created_by' => $this->created_by,
        'created_at' => $this->created_at?->toIso8601String(),
        'updated_at' => $this->updated_at?->toIso8601String(),
    ];
}
```

**Acceptance**: Serializes workflow with optional nested steps.

---

### T026 [P] -- ApprovalInstanceResource

**File**: `app/Http/Resources/ApprovalInstanceResource.php`

```php
public function toArray($request): array
{
    return [
        'uuid' => $this->uuid,
        'approvable_type' => $this->approvable_type,
        'approvable_id' => $this->approvable_id,
        'submitted_by' => $this->submitted_by,
        'workflow_snapshot' => $this->workflow_snapshot,
        'current_step_order' => $this->current_step_order,
        'status' => $this->status->value,
        'step_instances' => ApprovalStepInstanceResource::collection($this->whenLoaded('stepInstances')),
        'created_at' => $this->created_at?->toIso8601String(),
        'completed_at' => $this->completed_at?->toIso8601String(),
    ];
}
```

**Acceptance**: Serializes instance with nested step instances.

---

### T027 [P] -- ApprovalStepInstanceResource

**File**: `app/Http/Resources/ApprovalStepInstanceResource.php`

```php
public function toArray($request): array
{
    return [
        'step_order' => $this->step_order,
        'label' => $this->label,
        'mode' => $this->mode->value,
        'status' => $this->status->value,
        'resolved_approver_ids' => $this->resolved_approver_ids,
        'actions' => $this->actions,
        'activated_at' => $this->activated_at?->toIso8601String(),
        'completed_at' => $this->completed_at?->toIso8601String(),
    ];
}
```

**Acceptance**: Serializes step instance with actions JSON and resolved approver IDs.

---

### T028 -- ApprovalWorkflowController

**File**: `app/Http/Controllers/Api/ApprovalWorkflowController.php`

**Methods**:

1. **`index(Request $request)`**:
   - `Gate::authorize('viewAny', ApprovalWorkflow::class)`
   - Return `ApprovalWorkflowResource::collection` of workflows for the current workspace, ordered by `document_type` then `min_threshold_cents`, with `steps` eager loaded.

2. **`store(StoreApprovalWorkflowRequest $request)`**:
   - Call `CreateApprovalWorkflow::run(...)` with validated data from request.
   - Return `new ApprovalWorkflowResource($workflow)` with 201 status.

3. **`show(Request $request, string $uuid)`**:
   - Load workflow by UUID + workspace_id, with steps.
   - `Gate::authorize('view', $workflow)`.
   - Return `new ApprovalWorkflowResource($workflow)`.

4. **`update(UpdateApprovalWorkflowRequest $request)`**:
   - Get workflow from `$request->attributes->get('approvalWorkflow')`.
   - Call `UpdateApprovalWorkflow::run($workflow, $request->validated())`.
   - Return `new ApprovalWorkflowResource($workflow)`.

5. **`destroy(DeleteApprovalWorkflowRequest $request)`**:
   - Get workflow from `$request->attributes->get('approvalWorkflow')`.
   - Call `DeleteApprovalWorkflow::run($workflow)`.
   - Return 204 no content. On DomainException, return 409 Conflict with error message.

6. **`deactivate(Request $request, string $uuid)`**:
   - Load workflow by UUID + workspace_id.
   - `Gate::authorize('deactivate', $workflow)`.
   - Call `DeactivateApprovalWorkflow::run($workflow)`.
   - Return `new ApprovalWorkflowResource($workflow)`.

7. **`activate(Request $request, string $uuid)`**:
   - Load workflow by UUID + workspace_id.
   - `Gate::authorize('deactivate', $workflow)` (same policy method).
   - Call `ActivateApprovalWorkflow::run($workflow)`.
   - Return `new ApprovalWorkflowResource($workflow)`.

**Acceptance**: All 7 endpoints work. 403 for unprivileged roles. 409 for delete with in-flight. 422 for validation failures.

---

## Phase 4: US2 -- Routing Engine (Listener, EventServiceProvider)

### T029 -- ApprovalStepActivated Event

**File**: `app/Events/Approval/ApprovalStepActivated.php`

Standard Laravel event (NOT a stored event). Implements `ShouldBroadcast` is NOT needed (P1 is backend only).

```php
<?php

namespace App\Events\Approval;

use App\Models\Tenant\ApprovalInstance;
use App\Models\Tenant\ApprovalStepInstance;

class ApprovalStepActivated
{
    public function __construct(
        public readonly ApprovalInstance $instance,
        public readonly ApprovalStepInstance $stepInstance,
    ) {}
}
```

**Acceptance**: Event is dispatchable with instance and step instance.

---

### T030 [P] -- ApprovalChainCompleted Event

**File**: `app/Events/Approval/ApprovalChainCompleted.php`

```php
<?php

namespace App\Events\Approval;

use App\Models\Tenant\ApprovalInstance;

class ApprovalChainCompleted
{
    public function __construct(
        public readonly ApprovalInstance $instance,
    ) {}
}
```

---

### T031 [P] -- ApprovalChainRejected Event

**File**: `app/Events/Approval/ApprovalChainRejected.php`

```php
<?php

namespace App\Events\Approval;

use App\Models\Tenant\ApprovalInstance;
use App\Models\Tenant\ApprovalStepInstance;

class ApprovalChainRejected
{
    public function __construct(
        public readonly ApprovalInstance $instance,
        public readonly ApprovalStepInstance $rejectedStep,
    ) {}
}
```

---

### T032 -- RouteJournalEntryForApproval Listener

**File**: `app/Listeners/Approval/RouteJournalEntryForApproval.php`

**Listens to**: `JournalEntrySubmitted::class`

```php
<?php

namespace App\Listeners\Approval;

use App\Actions\Approval\RouteDocumentForApproval;
use App\Enums\ApprovableDocumentType;
use App\Events\Ledger\JournalEntrySubmitted;
use App\Models\Tenant\JournalEntry;
use Illuminate\Support\Facades\Log;

class RouteJournalEntryForApproval
{
    public function handle(JournalEntrySubmitted $event): void
    {
        try {
            $je = JournalEntry::where('workspace_id', $event->workspaceId)
                ->where('uuid', $event->aggregateRootUuid())
                ->first();

            if (! $je) {
                return;
            }

            // Calculate total debit amount for threshold matching
            $totalDebitCents = $je->lines()
                ->where('direction', 'debit')
                ->sum('amount');

            RouteDocumentForApproval::run(
                approvableType: ApprovableDocumentType::JournalEntry,
                approvableId: $je->id,
                workspaceId: $event->workspaceId,
                amountCents: (int) $totalDebitCents,
                submittedBy: $event->submittedBy,
            );
        } catch (\Throwable $e) {
            Log::error('RouteJournalEntryForApproval failed: '.$e->getMessage(), [
                'exception' => $e,
                'workspace_id' => $event->workspaceId,
            ]);
        }
    }
}
```

**Acceptance**: On JE submission, if feature flag is on and workflow matches, creates ApprovalInstance. If flag is off or no match, does nothing (null return from action is silently ignored).

---

### T033 -- ApprovalInstanceController

**File**: `app/Http/Controllers/Api/ApprovalInstanceController.php`

**Methods**:

1. **`index(Request $request)`**:
   - `Gate::authorize('viewAny', ApprovalWorkflow::class)`
   - Return paginated `ApprovalInstanceResource::collection` for the current workspace. Filter by `status` query param if provided. Eager load `stepInstances`.

2. **`show(Request $request, string $uuid)`**:
   - Load instance by UUID + workspace_id with `stepInstances`.
   - `Gate::authorize('viewAny', ApprovalWorkflow::class)`.
   - Return `new ApprovalInstanceResource($instance)`.

3. **`approve(ApproveStepRequest $request, string $uuid)`**:
   - Call `ApproveApprovalStep::run($uuid, $request->input('workspace_id'), $request->user()->id, $request->input('comment'))`.
   - Return `new ApprovalStepInstanceResource($stepInstance)`.
   - Catch `\DomainException` and return 403 or 409 as appropriate.

4. **`reject(RejectStepRequest $request, string $uuid)`**:
   - Call `RejectApprovalStep::run($uuid, $request->input('workspace_id'), $request->user()->id, $request->input('reason'))`.
   - Return `new ApprovalStepInstanceResource($stepInstance)`.
   - Catch `\DomainException` and return 403 or 409 as appropriate.

5. **`forDocument(Request $request, string $type, int $id)`**:
   - `Gate::authorize('viewAny', ApprovalWorkflow::class)`.
   - Query `ApprovalInstance` by `workspace_id`, `approvable_type = $type`, `approvable_id = $id` with `stepInstances` eager loaded.
   - Return `ApprovalInstanceResource::collection($instances)`.

6. **`myApprovals(Request $request)`**:
   - Find all `ApprovalStepInstance` records where `status = 'active'` AND `$request->user()->id` is in `resolved_approver_ids`.
   - Join to `approval_instances` for workspace scoping.
   - Order by `activated_at` ascending (oldest first).
   - Return paginated results with parent instance data.

**Note on `myApprovals` query**: Since `resolved_approver_ids` is JSON, use `whereJsonContains`:
```php
$stepInstances = ApprovalStepInstance::whereHas('approvalInstance', function ($q) use ($request) {
        $q->where('workspace_id', $request->input('workspace_id'))
          ->where('status', ApprovalInstanceStatus::Pending);
    })
    ->where('status', ApprovalStepStatus::Active)
    ->whereJsonContains('resolved_approver_ids', $request->user()->id)
    ->orderBy('activated_at')
    ->paginate(25);
```

**Acceptance**: All 6 endpoints function correctly. `myApprovals` returns only steps assigned to the current user. `forDocument` returns all instances for a given document.

---

## Phase 5: US3 -- Sequential Approval Execution

Tasks T017 and T018 (Phase 2) already implement the core approve/reject logic. This phase wires up the controller endpoints (T033) and ensures the full lifecycle works end-to-end.

### T034 -- Verify End-to-End Sequential Approval Flow

**No new files**. This is a verification task against the code produced by T016, T017, T018, T032, T033.

**Verify**:
1. Create a 2-step workflow (step 1: role `accountant`, step 2: specific user).
2. Submit a JE via the existing `SubmitJournalEntry` action.
3. Confirm `RouteJournalEntryForApproval` fires and creates an `ApprovalInstance` with 2 `ApprovalStepInstance` rows.
4. Step 1 has `status = active`, step 2 has `status = pending`.
5. Call `POST /api/v1/approval-instances/{uuid}/approve` as a user with `accountant` role.
6. Step 1 transitions to `approved`. Step 2 transitions to `active`. Instance `current_step_order` is 2.
7. Call `POST /api/v1/approval-instances/{uuid}/approve` as the step 2 user.
8. Step 2 transitions to `approved`. Instance transitions to `approved`. `ApproveJournalEntry::run()` is called. JE transitions to `Posted`.

**If anything fails, the issue is in T016/T017/T018/T032/T033. Fix the specific task.**

---

## Phase 6: US4 -- Audit Trail (Approval Progress Display Data)

### T035 -- Ensure forDocument Endpoint Returns Full Audit Data

**No new files**. Verify that the `forDocument` endpoint (T033 method 5) returns:

1. The `workflow_snapshot` JSON (contains workflow name, version, step labels).
2. Each `ApprovalStepInstance` with:
   - `actions` JSON array containing each action record: `user_id`, `action` (approved/rejected), `comment`, `is_delegate`, `delegator_user_id`, `acted_at`.
   - `status` (pending/active/approved/rejected/skipped).
   - `label` (step label from snapshot).
   - `activated_at` and `completed_at` timestamps.
3. The `submitted_by` user ID on the instance.
4. The overall `status` and `completed_at` on the instance.

**Verify the actions JSON is append-only**: Each approve/reject action appends to the array. No mutations or deletions of existing entries.

**Acceptance**: The `GET /api/v1/approval-instances/for-document/journal_entry/{id}` response contains all data needed to reconstruct the full audit timeline: submission, each step's activation, each approval/rejection with actor and timestamp, and chain completion.

---

## Phase 7: US5 -- Targeted Notifications

### T036 -- Add Notification Types to NotificationType Enum

**File**: `app/Enums/NotificationType.php`

**Add 3 new cases** after the `SigningReminder` case (line ~32):

```php
// Approval Chains (060-ACH)
case ApprovalStepPending = 'approval_step_pending';
case ApprovalChainCompleted = 'approval_chain_completed';
case ApprovalChainRejected = 'approval_chain_rejected';
```

**Add to `label()` match** (after `self::SigningReminder`):
```php
self::ApprovalStepPending => 'Approval Step Pending',
self::ApprovalChainCompleted => 'Approval Chain Completed',
self::ApprovalChainRejected => 'Approval Chain Rejected',
```

**Add to `icon()` match**:
```php
self::ApprovalStepPending => 'bell',
self::ApprovalChainCompleted => 'check-circle',
self::ApprovalChainRejected => 'x-circle',
```

**Add to `filterCategory()` match** (add to existing `'Approvals'` category line):
Change:
```php
self::JeSubmitted, self::JeApproved, self::JeRejected => 'Approvals',
```
To:
```php
self::JeSubmitted, self::JeApproved, self::JeRejected, self::ApprovalStepPending, self::ApprovalChainCompleted, self::ApprovalChainRejected => 'Approvals',
```

**Acceptance**: All 3 new cases resolve correctly for `label()`, `icon()`, and `filterCategory()`.

---

### T037 -- NotifyApprovalStepApprovers Listener

**File**: `app/Listeners/Approval/NotifyApprovalStepApprovers.php`

**Listens to**: `ApprovalStepActivated::class`

```php
<?php

namespace App\Listeners\Approval;

use App\Actions\Notifications\CreateNotification;
use App\Enums\NotificationType;
use App\Events\Approval\ApprovalStepActivated;
use Illuminate\Support\Facades\Log;

class NotifyApprovalStepApprovers
{
    public function handle(ApprovalStepActivated $event): void
    {
        try {
            $instance = $event->instance;
            $step = $event->stepInstance;
            $snapshotName = $instance->workflow_snapshot['name'] ?? 'Approval Workflow';

            foreach ($step->resolved_approver_ids as $approverUserId) {
                CreateNotification::run(
                    workspaceId: $instance->workspace_id,
                    userId: $approverUserId,
                    type: NotificationType::ApprovalStepPending,
                    title: "Approval needed: Step {$step->step_order} - {$step->label}",
                    body: "{$snapshotName} - {$instance->approvable_type} #{$instance->approvable_id}",
                    subject: $step,
                    actorId: $instance->submitted_by,
                );
            }
        } catch (\Throwable $e) {
            Log::error('NotifyApprovalStepApprovers failed: '.$e->getMessage(), [
                'exception' => $e,
            ]);
        }
    }
}
```

**Acceptance**: Each resolved approver receives an `ApprovalStepPending` notification. Non-approvers receive nothing.

---

### T038 -- NotifyOnApprovalChainOutcome Listener

**File**: `app/Listeners/Approval/NotifyOnApprovalChainOutcome.php`

**Listens to**: `ApprovalChainCompleted::class` AND `ApprovalChainRejected::class`

```php
<?php

namespace App\Listeners\Approval;

use App\Actions\Notifications\CreateNotification;
use App\Enums\NotificationType;
use App\Events\Approval\ApprovalChainCompleted;
use App\Events\Approval\ApprovalChainRejected;
use Illuminate\Support\Facades\Log;

class NotifyOnApprovalChainOutcome
{
    public function handle(ApprovalChainCompleted|ApprovalChainRejected $event): void
    {
        try {
            $instance = $event->instance;
            $snapshotName = $instance->workflow_snapshot['name'] ?? 'Approval Workflow';
            $isCompleted = $event instanceof ApprovalChainCompleted;

            $type = $isCompleted
                ? NotificationType::ApprovalChainCompleted
                : NotificationType::ApprovalChainRejected;

            $title = $isCompleted
                ? "Approval complete: {$snapshotName}"
                : "Approval rejected: {$snapshotName}";

            $body = $isCompleted
                ? "{$instance->approvable_type} #{$instance->approvable_id} has been fully approved."
                : "{$instance->approvable_type} #{$instance->approvable_id} was rejected at step {$event->rejectedStep->step_order} ({$event->rejectedStep->label}).";

            // Notify the submitter
            CreateNotification::run(
                workspaceId: $instance->workspace_id,
                userId: $instance->submitted_by,
                type: $type,
                title: $title,
                body: $body,
                subject: $instance,
            );
        } catch (\Throwable $e) {
            Log::error('NotifyOnApprovalChainOutcome failed: '.$e->getMessage(), [
                'exception' => $e,
            ]);
        }
    }
}
```

**Note**: The `handle` method accepts a union type. `ApprovalChainRejected` has a `rejectedStep` property; `ApprovalChainCompleted` does not. Check with `instanceof` before accessing.

**Acceptance**: Submitter receives `ApprovalChainCompleted` on full approval. Submitter receives `ApprovalChainRejected` on rejection with step info.

---

## Phase 8: Integration (Modify Existing Files)

### T039 -- Register Listeners in EventServiceProvider

**File**: `app/Providers/EventServiceProvider.php`

**Add imports** at the top (after existing `use` statements):
```php
use App\Events\Approval\ApprovalChainCompleted;
use App\Events\Approval\ApprovalChainRejected;
use App\Events\Approval\ApprovalStepActivated;
use App\Listeners\Approval\NotifyApprovalStepApprovers;
use App\Listeners\Approval\NotifyOnApprovalChainOutcome;
use App\Listeners\Approval\RouteJournalEntryForApproval;
```

**Modify** the `JournalEntrySubmitted` listener array. Change from:
```php
JournalEntrySubmitted::class => [
    NotifyApproversOnJeSubmitted::class,
    IncrementStreakOnJeSubmitted::class,
],
```
To:
```php
JournalEntrySubmitted::class => [
    RouteJournalEntryForApproval::class,    // FIRST: creates approval instance if workflow matches
    NotifyApproversOnJeSubmitted::class,     // SECOND: skips if workflow-governed (T040)
    IncrementStreakOnJeSubmitted::class,
],
```

**CRITICAL**: `RouteJournalEntryForApproval` MUST be before `NotifyApproversOnJeSubmitted` so the approval instance exists when the notification listener checks for it.

**Add 3 new event-listener mappings** to the `$listen` array:
```php
ApprovalStepActivated::class => [
    NotifyApprovalStepApprovers::class,
],
ApprovalChainCompleted::class => [
    NotifyOnApprovalChainOutcome::class,
],
ApprovalChainRejected::class => [
    NotifyOnApprovalChainOutcome::class,
],
```

**Acceptance**: All 4 listener registrations are in place. `RouteJournalEntryForApproval` fires before `NotifyApproversOnJeSubmitted`.

---

### T040 -- Modify NotifyApproversOnJeSubmitted to Skip When Workflow-Governed

**File**: `app/Listeners/Notifications/NotifyApproversOnJeSubmitted.php`

**Add imports**:
```php
use App\Enums\ApprovalInstanceStatus;
use App\Models\Tenant\ApprovalInstance;
use Illuminate\Support\Facades\Feature;
```

**Modify `handle()` method**. After the `if (! $je) { return; }` check (line ~23), insert:

```php
// Skip generic notification if this JE is governed by an approval workflow.
// Targeted step-level notifications are handled by NotifyApprovalStepApprovers.
if (Feature::active('configurable_approval_chains')) {
    $hasApprovalInstance = ApprovalInstance::where('workspace_id', $event->workspaceId)
        ->where('approvable_type', 'journal_entry')
        ->where('approvable_id', $je->id)
        ->where('status', ApprovalInstanceStatus::Pending->value)
        ->exists();

    if ($hasApprovalInstance) {
        return;
    }
}
```

**Acceptance**: When a JE has a pending approval instance, the generic notification is suppressed. When no instance exists (no workflow matched or flag is off), the existing notification fires as before.

---

### T041 -- Add Approval Routes to api.php

**File**: `routes/api.php`

**Add the following route group** inside the existing workspace-scoped middleware group (after existing route blocks). Use the `feature:configurable_approval_chains` middleware to gate the entire block:

```php
// Approval Chains (060-ACH)
Route::middleware(['feature:configurable_approval_chains'])->group(function () {
    // Workflow Management (Settings)
    Route::get('approval-workflows', [ApprovalWorkflowController::class, 'index']);
    Route::post('approval-workflows', [ApprovalWorkflowController::class, 'store']);
    Route::get('approval-workflows/{uuid}', [ApprovalWorkflowController::class, 'show']);
    Route::patch('approval-workflows/{uuid}', [ApprovalWorkflowController::class, 'update']);
    Route::delete('approval-workflows/{uuid}', [ApprovalWorkflowController::class, 'destroy']);
    Route::post('approval-workflows/{uuid}/deactivate', [ApprovalWorkflowController::class, 'deactivate']);
    Route::post('approval-workflows/{uuid}/activate', [ApprovalWorkflowController::class, 'activate']);

    // Approval Instances (My Approvals + Actions)
    Route::get('approval-instances', [ApprovalInstanceController::class, 'index']);
    Route::get('approval-instances/my-approvals', [ApprovalInstanceController::class, 'myApprovals']);
    Route::get('approval-instances/for-document/{type}/{id}', [ApprovalInstanceController::class, 'forDocument']);
    Route::get('approval-instances/{uuid}', [ApprovalInstanceController::class, 'show']);
    Route::post('approval-instances/{uuid}/approve', [ApprovalInstanceController::class, 'approve']);
    Route::post('approval-instances/{uuid}/reject', [ApprovalInstanceController::class, 'reject']);
});
```

**Add imports** at the top of the file:
```php
use App\Http\Controllers\Api\ApprovalWorkflowController;
use App\Http\Controllers\Api\ApprovalInstanceController;
```

**Note**: The `my-approvals` and `for-document` routes MUST be defined before the `{uuid}` route to avoid route parameter conflicts.

**Acceptance**: All 14 routes respond correctly when feature flag is on. All return 404 when feature flag is off.

---

## Phase 9: Tests

### T042 -- ApprovalWorkflowTest (US1: CRUD)

**File**: `tests/Feature/Approval/ApprovalWorkflowTest.php`

**Setup**: Use standard workspace test setup pattern with `RefreshDatabase`, seed `RolesAndPermissionsSeeder`, create user/org/workspace, attach user as `owner`, enable feature flag.

**Test cases** (~15):

```
it('creates a workflow with two steps')
  - POST /api/v1/approval-workflows with valid payload
  - Assert 201, response has uuid, name, document_type, step_count = 2

it('validates name uniqueness per workspace and document type')
  - Create workflow A for journal_entry named "Standard"
  - POST another with same name + document_type
  - Assert 422, errors contain 'name'

it('validates threshold uniqueness among active workflows')
  - Create workflow A: threshold 0, journal_entry
  - Create workflow B: threshold 0, journal_entry
  - Assert 422, errors contain 'min_threshold_cents'

it('allows same threshold for different document types')
  - Create workflow A: threshold 0, journal_entry
  - Create workflow B: threshold 0, invoice
  - Assert 201

it('validates at least one step')
  - POST with steps: []
  - Assert 422

it('validates at most ten steps')
  - POST with 11 steps
  - Assert 422

it('validates each step has at least one approver')
  - POST with step having empty approver_user_ids and empty approver_role_names
  - Assert 422

it('updates a workflow and increments version')
  - PATCH with new name
  - Assert version is 2

it('blocks deletion when in-flight instances exist')
  - Create workflow, create pending ApprovalInstance
  - DELETE
  - Assert 409

it('allows deletion when no pending instances exist')
  - Create workflow with no instances
  - DELETE
  - Assert 204

it('deactivates a workflow')
  - POST /deactivate
  - Assert is_active = false

it('activates a deactivated workflow')
  - POST /activate
  - Assert is_active = true

it('enforces only one active BAS workflow per workspace')
  - Create active BAS workflow
  - Create second BAS workflow
  - Assert 422

it('denies bookkeeper from managing workflows')
  - Login as bookkeeper
  - POST /api/v1/approval-workflows
  - Assert 403

it('allows approver to view workflows')
  - Login as approver
  - GET /api/v1/approval-workflows
  - Assert 200

it('isolates workflows between workspaces')
  - Create workflow in workspace A
  - GET from workspace B
  - Assert empty or not found
```

---

### T043 -- ApprovalRoutingTest (US2: Routing)

**File**: `tests/Feature/Approval/ApprovalRoutingTest.php`

**Setup**: Same as T042. Additionally create a bookkeeper user for submissions and an accountant user for approvals.

**Helper**: Create a JE via the existing `CreateJournalEntry` + `SubmitJournalEntry` actions.

**Test cases** (~12):

```
it('routes JE to highest matching threshold workflow')
  - Create workflow A: threshold 0, 1 step
  - Create workflow B: threshold 1000000 (10k), 2 steps
  - Submit JE with $75,000 total debits
  - Assert ApprovalInstance created, linked to workflow B
  - Assert 2 ApprovalStepInstance rows

it('routes JE to lower threshold when amount is below higher threshold')
  - Same workflows as above
  - Submit JE with $5,000
  - Assert routed to workflow A (1 step)

it('falls back to existing behavior when no workflow is configured')
  - No workflows defined
  - Submit JE
  - Assert no ApprovalInstance created
  - Assert JE is PendingApproval (existing flow)

it('does not route when feature flag is off')
  - Feature::define('configurable_approval_chains', fn () => false)
  - Create workflow
  - Submit JE
  - Assert no ApprovalInstance created

it('snapshots workflow config at instance creation time')
  - Create workflow (version 1)
  - Submit JE, instance created
  - Update workflow name + version increments to 2
  - Assert instance workflow_snapshot.name is the original name
  - Assert instance workflow_snapshot.version is 1

it('creates new instance on re-submission after rejection')
  - Submit JE, route to workflow, reject
  - Re-submit same JE
  - Assert a second ApprovalInstance exists
  - Assert first instance status is 'rejected'
  - Assert second instance status is 'pending'

it('resolves role-based approvers at step activation time')
  - Create step with approver_role_names: ['accountant']
  - Add user with accountant role to workspace
  - Submit JE
  - Assert resolved_approver_ids contains the accountant user ID

it('excludes submitter from resolved approvers')
  - Create step with approver_role_names: ['accountant']
  - Submitter is also an accountant
  - Submit JE
  - Assert resolved_approver_ids does NOT contain submitter ID

it('calculates JE debit total for threshold matching')
  - Create JE with 2 debit lines: 5000 + 3000 = 8000 cents
  - Create workflow with threshold 7000
  - Submit JE
  - Assert routed to that workflow (8000 >= 7000)

it('skips inactive workflows during routing')
  - Create active workflow (threshold 0)
  - Deactivate it
  - Submit JE
  - Assert no ApprovalInstance (inactive workflow ignored)

it('handles zero-amount documents')
  - Create workflow with threshold 0
  - Submit JE with $0 total debits
  - Assert routed to workflow

it('workspace isolation: workflow in workspace A does not route in workspace B')
  - Create workflow in workspace A
  - Submit JE in workspace B
  - Assert no ApprovalInstance in workspace B
```

---

### T044 -- ApprovalExecutionTest (US3: Sequential Approval)

**File**: `tests/Feature/Approval/ApprovalExecutionTest.php`

**Setup**: Same as T042. Create bookkeeper (submitter), accountant (step 1 approver), owner (step 2 approver). Create a 2-step workflow. Helper to submit a JE and get the approval instance UUID.

**Test cases** (~15):

```
it('approves step 1 and activates step 2')
  - Approve step 1 as accountant
  - Assert step 1 status = approved, step 2 status = active
  - Assert instance current_step_order = 2

it('approves final step and posts the journal entry')
  - Approve step 1, then approve step 2
  - Assert instance status = approved
  - Assert JE status = Posted (check DB)

it('calls ApproveJournalEntry on final step completion')
  - Approve through all steps
  - Assert JE has posted_at set and status is Posted

it('rejects at step 1 and returns JE to draft')
  - Reject step 1 with reason "Missing docs"
  - Assert step 1 status = rejected
  - Assert instance status = rejected
  - Assert JE status = Draft

it('rejects at step 2 preserving step 1 approval')
  - Approve step 1, reject step 2
  - Assert step 1 status = approved (preserved)
  - Assert step 2 status = rejected
  - Assert instance status = rejected
  - Assert JE status = Draft

it('skips subsequent steps on rejection')
  - 3-step workflow, reject at step 2
  - Assert step 3 status = skipped

it('prevents submitter from approving any step')
  - Submit JE as bookkeeper
  - Attempt to approve step 1 as bookkeeper
  - Assert 403 / DomainException

it('prevents non-eligible user from approving')
  - User not in resolved_approver_ids attempts approval
  - Assert 403 / DomainException

it('prevents user without approve permission from approving')
  - User with 'client' role (no journal-entry.approve) attempts approval
  - Assert 403 / DomainException

it('prevents acting on already-completed chain')
  - Complete full chain (approved)
  - Attempt another approval
  - Assert DomainException

it('prevents acting on rejected chain')
  - Reject chain
  - Attempt approval
  - Assert DomainException

it('records approval comment in actions JSON')
  - Approve with comment "Looks good"
  - Assert step actions JSON contains entry with comment

it('records rejection reason in actions JSON')
  - Reject with reason "Needs revision"
  - Assert step actions JSON contains entry with reason

it('approve endpoint returns correct response')
  - POST /api/v1/approval-instances/{uuid}/approve
  - Assert 200, response has step_order, status, actions

it('reject endpoint returns correct response')
  - POST /api/v1/approval-instances/{uuid}/reject with reason
  - Assert 200, response has step_order, status = rejected
```

---

### T045 -- ApprovalAuditTest (US4: Audit Trail)

**File**: `tests/Feature/Approval/ApprovalAuditTest.php`

**Test cases** (~8):

```
it('forDocument endpoint returns full audit trail for completed chain')
  - Complete a 2-step approval
  - GET /api/v1/approval-instances/for-document/journal_entry/{id}
  - Assert response contains: workflow_snapshot.name, workflow_snapshot.version
  - Assert step 1: status approved, actions[0].user_id, actions[0].acted_at
  - Assert step 2: status approved, actions[0].user_id, actions[0].acted_at

it('audit trail includes rejection reason')
  - Approve step 1, reject step 2 with reason
  - Assert step 2 actions JSON: action = 'rejected', comment = reason

it('audit trail includes approval comment')
  - Approve step 1 with comment
  - Assert step 1 actions[0].comment = comment

it('workflow name and version accessible from instance')
  - GET instance show endpoint
  - Assert workflow_snapshot.name and workflow_snapshot.version present

it('actions JSON is append-only')
  - Two approvals on same step (only relevant for future all_of mode, but test the append pattern)
  - Assert actions array length increases

it('forDocument returns empty for document with no approval instance')
  - GET for a document that was never routed to approval chain
  - Assert empty array

it('forDocument returns multiple instances for re-submitted document')
  - Submit, reject, re-submit
  - Assert 2 instances returned, first rejected, second pending

it('instance show includes all step instances with full actions')
  - GET /api/v1/approval-instances/{uuid}
  - Assert step_instances array present with correct count
```

---

### T046 -- ApprovalNotificationTest (US5: Targeted Notifications)

**File**: `tests/Feature/Approval/ApprovalNotificationTest.php`

**Test cases** (~10):

```
it('notifies only step 1 approvers when step 1 activates')
  - 2-step workflow: step 1 = [Alice, Bob], step 2 = [Carol]
  - Submit JE
  - Assert Notification created for Alice (type = approval_step_pending)
  - Assert Notification created for Bob
  - Assert NO notification for Carol

it('notifies step 2 approver when step 1 completes')
  - Approve step 1
  - Assert Notification created for Carol (type = approval_step_pending)

it('notifies submitter when chain completes')
  - Complete full chain
  - Assert Notification for submitter (type = approval_chain_completed)

it('notifies submitter when chain is rejected')
  - Reject at step 1
  - Assert Notification for submitter (type = approval_chain_rejected)

it('skips generic JE notification when workflow is active')
  - Submit JE with workflow configured
  - Assert NO JeSubmitted notification for generic approvers
  - Assert ApprovalStepPending notifications for step 1 approvers

it('fires generic JE notification when no workflow matches')
  - No workflows defined
  - Submit JE
  - Assert JeSubmitted notification fires as usual

it('fires generic JE notification when feature flag is off')
  - Feature::define('configurable_approval_chains', fn () => false)
  - Create workflow, submit JE
  - Assert JeSubmitted notification fires
  - Assert no ApprovalStepPending notifications

it('notification includes correct type value')
  - Check notification record type = 'approval_step_pending'

it('notification includes step label in title')
  - Assert notification title contains the step label string

it('step 2 approvers are NOT notified if chain is rejected at step 1')
  - Reject at step 1
  - Assert zero notifications for step 2 approvers
```

---

### T047 -- ApprovalPermissionTest (Cross-Cutting)

**File**: `tests/Feature/Approval/ApprovalPermissionTest.php`

**Test cases** (~8):

```
it('owner can create workflows')
  - POST as owner -> 201

it('accountant can create workflows')
  - POST as accountant -> 201

it('bookkeeper cannot create workflows')
  - POST as bookkeeper -> 403

it('approver cannot create workflows')
  - POST as approver -> 403

it('auditor can view workflows')
  - GET as auditor -> 200

it('client cannot view workflows')
  - GET as client -> 403

it('approval-workflow routes return 404 when feature flag is off')
  - Feature::define('configurable_approval_chains', fn () => false)
  - GET /api/v1/approval-workflows
  - Assert 404 (feature middleware)

it('approval instances from workspace A not visible in workspace B')
  - Create instance in workspace A
  - GET from workspace B
  - Assert 404 or empty result
```

---

## Summary

| Phase | Tasks | Parallelizable | Files |
|-------|-------|----------------|-------|
| 1: Foundation | T001-T011 | T001-T007 all [P], T008-T011 sequential | 11 new + 3 modified |
| 2: Core Actions | T012-T018 | T012-T015 [P], T016-T018 sequential | 8 new |
| 3: US1 CRUD | T019-T028 | T019-T027 [P], T028 depends on all | 10 new |
| 4: US2 Routing | T029-T033 | T029-T031 [P], T032-T033 sequential | 5 new |
| 5: US3 Execution | T034 | -- | 0 (verification) |
| 6: US4 Audit | T035 | -- | 0 (verification) |
| 7: US5 Notifications | T036-T038 | T037-T038 [P] | 3 new + 1 modified |
| 8: Integration | T039-T041 | -- | 3 modified |
| 9: Tests | T042-T047 | All [P] | 6 new |
| **Total** | **47** | | **~30 new, ~6 modified** |

**Estimated test count**: ~68 tests across 6 test files.

**Dependency chain**:
```
Phase 1 (T001-T011) -> Phase 2 (T012-T018) -> Phase 3 (T019-T028)
                                             -> Phase 4 (T029-T033)
                                                    -> Phase 5 (T034)
                                                    -> Phase 6 (T035)
Phase 2 + Phase 3 + Phase 4 -> Phase 7 (T036-T038)
                             -> Phase 8 (T039-T041)
                             -> Phase 9 (T042-T047)
```
