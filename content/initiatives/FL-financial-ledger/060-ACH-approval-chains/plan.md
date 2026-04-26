---
title: "Implementation Plan: Configurable Approval Chains"
---

# Implementation Plan: Configurable Approval Chains

**Branch**: `feature/060-ach-approval-chains` | **Date**: 2026-03-22 | **Spec**: [spec.md](/initiatives/FL-financial-ledger/060-ACH-approval-chains/spec)
**Scope**: P1 Backend Only (US1-US5) | **Data Model**: [data-model.md](/initiatives/FL-financial-ledger/060-ACH-approval-chains/data-model)

## Summary

A configurable approval workflow engine that routes documents (journal entries, invoices, bills, BAS periods) through multi-step sequential approval chains based on document type and amount thresholds. The engine sits as a coordination layer on top of the existing aggregate-based approve/reject events -- it orchestrates when and by whom they fire, without replacing them. Workspaces without configured workflows continue to use the existing single-step approval behavior. P1 delivers the backend: workflow CRUD, threshold-based routing, sequential multi-step execution with "any one of" mode, full audit trail, and step-level targeted notifications. Gated behind a `configurable-approval-chains` Pennant feature flag, disabled by default.

## Technical Context

**Language/Version**: PHP 8.4 (Laravel 12)
**Primary Dependencies**: Lorisleiva Actions, Spatie laravel-event-sourcing v7 (existing), Laravel Pennant (existing)
**Storage**: PostgreSQL, single-database multi-tenancy via `workspace_id` scoping
**Testing**: Pest v4 (feature tests)
**Target Platform**: Laravel API consumed by Next.js frontend (frontend out of P1 scope)
**Constraints**: <200ms approval action latency, <50ms routing evaluation, max 50 active workflows per workspace, max 10 steps per workflow
**Scale**: Thousands of approval instances per workspace, hundreds of concurrent pending items

## Gate 3: Architecture Check

### 1. Technical Feasibility

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | Coordination layer on existing aggregates. Standard Laravel Actions + Eloquent models. No new event-sourced aggregates in P1 -- approval state lives in Eloquent read models directly |
| Existing patterns leveraged | PASS | Lorisleiva Actions, Form Requests, API Resources, Policies, existing notification system |
| No impossible requirements | PASS | All P1 FRs buildable with current stack. Threshold routing is integer comparison. Step execution is sequential state machine |
| Performance considered | PASS | Routing is `WHERE workspace_id = ? AND document_type = ? AND is_active = true ORDER BY min_threshold_cents DESC LIMIT 1` -- trivial query. Approval actions are single-row updates |
| Security considered | PASS | Separation-of-duties enforced in `ApproveApprovalStep` action. Permission-gated. Workspace-scoped |

### 2. Data & Integration

| Check | Status | Notes |
|-------|--------|-------|
| Data model understood | PASS | 5 new tables: `approval_workflows`, `approval_steps`, `approval_instances`, `approval_step_instances`, `approval_delegations`. See [data-model.md](/initiatives/FL-financial-ledger/060-ACH-approval-chains/data-model) |
| API contracts clear | PASS | 2 controllers, ~14 endpoints. CRUD for workflows + instance querying/actions |
| Dependencies identified | PASS | 002-CLE (complete), 005-IAR (complete), 044-TAX (complete), 024-NTF (complete), 039-RPA (complete) |
| Integration points mapped | PASS | `JournalEntrySubmitted` event listener, `ApproveJournalEntry` action modification, NotificationType enum extension |
| DTO persistence explicit | PASS | Form Request `validated()` to Action params. Workflow snapshot serialized as JSON on instance creation |

### 3. Implementation Approach

| Check | Status | Notes |
|-------|--------|-------|
| File changes identified | PASS | See File Manifest below |
| Risk areas noted | PASS | Primary risk: intercepting existing submit/approve flow without regression. Mitigated by feature flag + fallback to existing behavior when no workflow matches |
| Testing approach defined | PASS | Feature tests for every action, routing edge cases, permission checks, tenant isolation, backward compatibility |
| Rollback possible | PASS | All new tables are additive. Feature flag disables entire system. No existing tables modified. Existing approve/reject flows unchanged when flag is off |

### 4. Laravel Best Practices

| Check | Status | Notes |
|-------|--------|-------|
| Use Lorisleiva Actions | PASS | All business logic in `app/Actions/Approval/` |
| Form Requests for validation | PASS | Every mutation endpoint has a Form Request |
| API Resources for responses | PASS | `ApprovalWorkflowResource`, `ApprovalInstanceResource`, `ApprovalStepInstanceResource` |
| Model route binding | PASS | UUID-based via `getRouteKeyName()` on `ApprovalWorkflow` and `ApprovalInstance` |
| Sanctum cookie auth | PASS | All routes under `auth:sanctum` + `SetWorkspaceContext` middleware |
| Migrations schema-only | PASS | Permissions seeded via `RolesAndPermissionsSeeder` update |

### 5. Event Sourcing Standards

| Check | Status | Notes |
|-------|--------|-------|
| Aggregate roots identified | PASS | P1 does NOT introduce a new aggregate root. Approval state is managed via Eloquent models (ApprovalInstance, ApprovalStepInstance). The existing JE/Invoice aggregates are called on final-step completion only |
| Events are granular facts | PASS | Standard Laravel events (not stored events): `ApprovalStepActivated`, `ApprovalChainCompleted`, `ApprovalChainRejected`. Used for notification dispatch |
| Projectors identified | N/A | No new projectors in P1. Approval models are direct Eloquent, not event-sourced projections |

**Decision: Eloquent over Event Sourcing for Approval State**

The spec's clarification (line 495) mentions `ApprovalInstanceAggregate`, but after analysis, P1 approval state is better served by direct Eloquent models for these reasons:

1. **Approval chains are coordination, not financial mutations** -- they do not produce ledger entries. The financial integrity guarantee of event sourcing is unnecessary here.
2. **Step state is mutable by design** -- steps transition through `pending -> active -> approved/rejected`. This is a state machine, not an append-only event stream.
3. **The audit trail is captured in the `actions` JSON on each step instance** -- every approve/reject action is recorded with actor, timestamp, comment, and delegate info. This provides the same traceability as stored events.
4. **The existing aggregates (JournalEntryAggregate, InvoiceAggregate) are still called** on final-step completion -- so the financial events remain event-sourced.
5. **Standard Laravel events** (`ApprovalStepActivated`, etc.) fire for notification dispatch and can be consumed by listeners just like stored events.

If P2 requires event sourcing for replay/audit compliance beyond what the `actions` JSON provides, an `ApprovalInstanceAggregate` can be introduced then without schema changes (the stored events would complement, not replace, the Eloquent models).

### 6. Multi-Tenancy Standards

| Check | Status | Notes |
|-------|--------|-------|
| All models scoped | PASS | Every model has `workspace_id` column (directly or inherited) |
| Central vs tenant separation clear | PASS | All 5 tables are workspace-scoped (tenant). No central tables |
| No cross-tenant queries | PASS | All queries include `workspace_id` constraint |
| Tenant context set in middleware | PASS | Routes behind `SetWorkspaceContext` middleware |
| Tests verify isolation | PASS | Test plan includes cross-workspace isolation tests |

### Overall: PASS -- No red flags

---

## Architecture Overview

### Approval Chain Lifecycle

```
Document created (Draft)
         │
         ▼
    Submit for Approval
         │
         ▼
┌─────────────────────────────────┐
│  RouteDocumentForApproval       │
│  (listener on JournalEntry-     │
│   Submitted event)              │
│                                 │
│  1. Feature flag check          │
│  2. Find matching workflow      │
│     (highest threshold wins)    │
│  3. If no workflow: return      │
│     (existing flow continues)   │
│  4. Create ApprovalInstance     │
│     with workflow snapshot      │
│  5. Create ApprovalStepInstance │
│     rows for each step          │
│  6. Activate Step 1             │
│  7. Fire ApprovalStepActivated  │
│     event (triggers notifs)     │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Step N is active               │
│                                 │
│  Eligible approver acts:        │
│  ┌──────────┐  ┌──────────────┐ │
│  │ Approve  │  │ Reject       │ │
│  │ (comment │  │ (reason      │ │
│  │ optional)│  │ required)    │ │
│  └────┬─────┘  └──────┬───────┘ │
│       │               │         │
│       ▼               ▼         │
│  Step completed   Chain rejected│
│  (any_one_of:     All steps     │
│   first approve   after this    │
│   wins)           are skipped.  │
│       │           Document      │
│       ▼           returns to    │
│  Is this the      Draft.        │
│  final step?                    │
│  ┌────┴────┐                    │
│  │ No      │ Yes                │
│  │         │                    │
│  │ Activate│ Fire aggregate     │
│  │ next    │ approve() event.   │
│  │ step    │ Document →         │
│  │         │ Posted/Approved    │
│  └─────────┘                    │
└─────────────────────────────────┘
```

### Integration with Existing Submit Flow

The approval chain engine intercepts the existing submit flow via an event listener, not by modifying the existing Actions or Aggregates.

**Journal Entries (P1)**:

1. `SubmitJournalEntry` action calls `JournalEntryAggregate::submitForApproval()` -- **unchanged**.
2. The aggregate records `JournalEntrySubmitted` event -- **unchanged**.
3. `EventServiceProvider` dispatches to listeners:
   - `NotifyApproversOnJeSubmitted` -- **modified**: checks for active approval instance. If found, skips generic notification (the chain handles targeted notifications). If not found, fires existing generic notification.
   - `RouteDocumentForApproval` -- **new listener**: evaluates workflows, creates approval instance if a match is found.
4. When the final step approves, `ApproveApprovalStep` calls `ApproveJournalEntry::run()` which calls the aggregate's `approve()` -- the existing approval flow fires normally.

**Invoices/Bills (P2 scope for UI, but the routing engine supports them in P1)**:

The `RouteDocumentForApproval` action is document-type-agnostic. In P1, it is wired to `JournalEntrySubmitted`. In P2, additional listeners on invoice/bill submit events will call the same routing action.

### Notification Flow

```
Step activated
     │
     ▼
ApprovalStepActivated event fires
     │
     ▼
NotifyApprovalStepApprovers listener
     │
     ├── Resolve eligible approvers:
     │   1. Expand role names to user IDs
     │      (at activation time)
     │   2. Add active delegates (P2)
     │   3. Exclude the submitter
     │      (separation of duties)
     │
     ├── For each eligible approver:
     │   CreateNotification::run(
     │     type: ApprovalStepPending,
     │     title: "Approval needed: Step N",
     │     body: "[Doc ref] - [Step label]",
     │     subject: $approvalStepInstance,
     │   )
     │
     └── Store resolved_approver_ids
         on the step instance
```

### Feature Flag Behavior

```php
// AppServiceProvider::boot()
Feature::define('configurable_approval_chains', fn () => false);
```

When the flag is **off** (default):
- `RouteDocumentForApproval` listener returns immediately (no-op)
- `NotifyApproversOnJeSubmitted` fires existing generic notifications unchanged
- Approval workflow API routes return 404 (feature middleware)
- Existing single-step approval works identically to today

When the flag is **on** for a workspace:
- Routing evaluates workflows. If none match, falls back to existing behavior
- Targeted notifications replace generic notifications for workflow-governed documents
- Workflow CRUD and instance API endpoints are accessible

---

## File Manifest

### New Files

**Enums** (4 files):
- `app/Enums/ApprovableDocumentType.php` -- JournalEntry, Invoice, Bill, BasPeriod
- `app/Enums/ApprovalMode.php` -- AnyOneOf, AllOf
- `app/Enums/ApprovalStepStatus.php` -- Pending, Active, Approved, Rejected, Skipped
- `app/Enums/ApprovalInstanceStatus.php` -- Pending, Approved, Rejected

**Models** (5 files):
- `app/Models/Tenant/ApprovalWorkflow.php`
- `app/Models/Tenant/ApprovalStep.php`
- `app/Models/Tenant/ApprovalInstance.php`
- `app/Models/Tenant/ApprovalStepInstance.php`
- `app/Models/Tenant/ApprovalDelegation.php`

**Actions** (7 files):
- `app/Actions/Approval/CreateApprovalWorkflow.php` -- CRUD create with validation
- `app/Actions/Approval/UpdateApprovalWorkflow.php` -- CRUD update, increments version
- `app/Actions/Approval/DeleteApprovalWorkflow.php` -- Guards against in-flight instances
- `app/Actions/Approval/DeactivateApprovalWorkflow.php` -- Soft disable without deletion
- `app/Actions/Approval/RouteDocumentForApproval.php` -- Core routing logic: find matching workflow, create instance, activate first step
- `app/Actions/Approval/ApproveApprovalStep.php` -- Approve current step, advance chain or complete
- `app/Actions/Approval/RejectApprovalStep.php` -- Reject step, reject chain, return doc to draft

**Events** (3 files -- standard Laravel events, NOT stored events):
- `app/Events/Approval/ApprovalStepActivated.php`
- `app/Events/Approval/ApprovalChainCompleted.php`
- `app/Events/Approval/ApprovalChainRejected.php`

**Listeners** (3 files):
- `app/Listeners/Approval/RouteJournalEntryForApproval.php` -- Listens to `JournalEntrySubmitted`, calls `RouteDocumentForApproval`
- `app/Listeners/Approval/NotifyApprovalStepApprovers.php` -- Listens to `ApprovalStepActivated`, sends targeted notifications
- `app/Listeners/Approval/NotifyOnApprovalChainOutcome.php` -- Listens to `ApprovalChainCompleted` and `ApprovalChainRejected`

**Controllers** (2 files):
- `app/Http/Controllers/Api/ApprovalWorkflowController.php` -- CRUD + list workflows
- `app/Http/Controllers/Api/ApprovalInstanceController.php` -- My Approvals queue, approve/reject step, instance detail

**Form Requests** (5 files):
- `app/Http/Requests/Approval/StoreApprovalWorkflowRequest.php`
- `app/Http/Requests/Approval/UpdateApprovalWorkflowRequest.php`
- `app/Http/Requests/Approval/ApproveStepRequest.php`
- `app/Http/Requests/Approval/RejectStepRequest.php`
- `app/Http/Requests/Approval/DeleteApprovalWorkflowRequest.php`

**API Resources** (3 files):
- `app/Http/Resources/ApprovalWorkflowResource.php`
- `app/Http/Resources/ApprovalInstanceResource.php`
- `app/Http/Resources/ApprovalStepInstanceResource.php`

**Policy** (1 file):
- `app/Policies/ApprovalWorkflowPolicy.php`

**Migrations** (1 file):
- `database/migrations/xxxx_xx_xx_create_approval_tables.php` -- All 5 tables in one migration

**Tests** (1+ files):
- `tests/Feature/Approval/ApprovalWorkflowTest.php`
- `tests/Feature/Approval/ApprovalRoutingTest.php`
- `tests/Feature/Approval/ApprovalExecutionTest.php`
- `tests/Feature/Approval/ApprovalNotificationTest.php`
- `tests/Feature/Approval/ApprovalAuditTest.php`
- `tests/Feature/Approval/ApprovalPermissionTest.php`

### Modified Files

- `app/Enums/NotificationType.php` -- Add `ApprovalStepPending`, `ApprovalChainCompleted`, `ApprovalChainRejected` cases
- `app/Providers/EventServiceProvider.php` -- Register new listeners
- `app/Providers/AppServiceProvider.php` -- Register policy, define feature flag, add `bas_period` to morph map
- `app/Listeners/Notifications/NotifyApproversOnJeSubmitted.php` -- Check for active approval instance; skip generic notification if workflow-governed
- `database/seeders/RolesAndPermissionsSeeder.php` -- Add `approval-workflow.manage` and `approval-workflow.view` permissions
- `routes/api.php` -- Add approval workflow and instance routes

---

## API Routes

All routes under `auth:sanctum` + `SetWorkspaceContext` middleware, gated by `feature:configurable_approval_chains`.

### Workflow Management (Settings)

| Method | Path | Controller Method | Permission | FR |
|--------|------|-------------------|------------|-----|
| GET | `/api/v1/approval-workflows` | `ApprovalWorkflowController@index` | `approval-workflow.view` | FR-001, FR-037 |
| POST | `/api/v1/approval-workflows` | `ApprovalWorkflowController@store` | `approval-workflow.manage` | FR-001 |
| GET | `/api/v1/approval-workflows/{uuid}` | `ApprovalWorkflowController@show` | `approval-workflow.view` | FR-001 |
| PATCH | `/api/v1/approval-workflows/{uuid}` | `ApprovalWorkflowController@update` | `approval-workflow.manage` | FR-001 |
| DELETE | `/api/v1/approval-workflows/{uuid}` | `ApprovalWorkflowController@destroy` | `approval-workflow.manage` | FR-001 |
| POST | `/api/v1/approval-workflows/{uuid}/deactivate` | `ApprovalWorkflowController@deactivate` | `approval-workflow.manage` | FR-001 |
| POST | `/api/v1/approval-workflows/{uuid}/activate` | `ApprovalWorkflowController@activate` | `approval-workflow.manage` | FR-001 |

### Approval Instance (My Approvals + Document Actions)

| Method | Path | Controller Method | Permission | FR |
|--------|------|-------------------|------------|-----|
| GET | `/api/v1/approval-instances` | `ApprovalInstanceController@index` | `approval-workflow.view` | FR-040 |
| GET | `/api/v1/approval-instances/{uuid}` | `ApprovalInstanceController@show` | `approval-workflow.view` | FR-032, FR-039 |
| POST | `/api/v1/approval-instances/{uuid}/approve` | `ApprovalInstanceController@approve` | (dynamic -- see below) | FR-018 |
| POST | `/api/v1/approval-instances/{uuid}/reject` | `ApprovalInstanceController@reject` | (dynamic -- see below) | FR-019 |
| GET | `/api/v1/approval-instances/for-document/{type}/{id}` | `ApprovalInstanceController@forDocument` | `approval-workflow.view` | FR-039 |
| GET | `/api/v1/approval-instances/my-approvals` | `ApprovalInstanceController@myApprovals` | (any authenticated user) | FR-040 |

**Dynamic permission for approve/reject**: The user must (a) have the underlying document's approve permission (e.g., `journal-entry.approve`), (b) be in the step's resolved approver list, and (c) not be the submitter. This is checked in the `ApproveApprovalStep` / `RejectApprovalStep` action, not via a Policy.

---

## Permissions

### New Permissions

| Permission | Granted To | Purpose |
|------------|-----------|---------|
| `approval-workflow.manage` | owner, accountant | Create, edit, deactivate, delete workflows |
| `approval-workflow.view` | owner, accountant, approver, auditor | View workflow configurations and audit trails |

### Seeder Changes

Add to `RolesAndPermissionsSeeder`:

- `allPermissions()` -- add both permissions
- `accountantPermissions()` -- add both permissions
- `approverPermissions()` -- add `approval-workflow.view`
- `auditorPermissions()` -- add `approval-workflow.view`

### Existing Permissions (Unchanged)

The document-level approve permissions (`journal-entry.approve`, `invoice.approve`, `bill.approve`, `bas.approve`) remain the gate for who CAN be an approver. The approval chain layer adds routing on top -- it does not replace the permission model. A user must have BOTH the document's approve permission AND be assigned to the step to act.

---

## Actions Detail

### RouteDocumentForApproval

The core routing action. Called from a listener on `JournalEntrySubmitted` (and in P2, from invoice/bill submit events).

```
Input:
  - approvableType: ApprovableDocumentType
  - approvableId: int
  - workspaceId: int
  - amountCents: int (total debit for JE, total for invoice/bill, 0 for BAS)
  - submittedBy: int (user ID)

Logic:
  1. Check Feature::active('configurable_approval_chains')
     → if off, return null (existing flow continues)

  2. Query active workflows:
     ApprovalWorkflow::where('workspace_id', $workspaceId)
       ->where('document_type', $approvableType)
       ->where('is_active', true)
       ->where('min_threshold_cents', '<=', $amountCents)
       ->orderByDesc('min_threshold_cents')
       ->first()

  3. If no workflow found, return null (fallback to existing behavior)

  4. Build workflow snapshot JSON from workflow + its steps

  5. Create ApprovalInstance:
     - workspace_id, workflow_id, approvable_type/id
     - submitted_by
     - workflow_snapshot
     - current_step_order = 1
     - status = pending

  6. Create ApprovalStepInstance rows for each step
     (all start as 'pending')

  7. Activate Step 1:
     - Set step 1 status = 'active'
     - Resolve approver IDs (expand roles to user IDs, exclude submitter)
     - Store resolved_approver_ids
     - Set activated_at

  8. Dispatch ApprovalStepActivated event

Output: ApprovalInstance (or null if no workflow matched)
```

### ApproveApprovalStep

```
Input:
  - instanceUuid: string
  - userId: int (the approver)
  - comment: ?string

Logic:
  1. Load ApprovalInstance by UUID + workspace_id
  2. Guard: instance status must be 'pending'
  3. Load active ApprovalStepInstance (current_step_order)
  4. Guard: step status must be 'active'
  5. Guard: userId must be in resolved_approver_ids
  6. Guard: userId must NOT be instance.submitted_by (separation of duties)
  7. Guard: userId must have the document's approve permission

  8. Record approval action in step's actions JSON:
     { user_id, action: "approved", comment, is_delegate: false, acted_at }

  9. For "any_one_of" mode: step is complete on first approval
     → Set step status = 'approved', completed_at

  10. Check if this was the final step:
      a. YES (final step):
         - Set instance status = 'approved', completed_at
         - Call the document's aggregate approve:
           * JE: ApproveJournalEntry::run($uuid, $userId)
           * Invoice: (P2)
           * Bill: (P2)
         - Dispatch ApprovalChainCompleted event

      b. NO (more steps):
         - Increment instance.current_step_order
         - Activate next step (resolve approvers, set active, activated_at)
         - Dispatch ApprovalStepActivated event

Output: ApprovalStepInstance (updated)
```

### RejectApprovalStep

```
Input:
  - instanceUuid: string
  - userId: int
  - reason: string (required)

Logic:
  1-7. Same guards as ApproveApprovalStep

  8. Record rejection in step's actions JSON:
     { user_id, action: "rejected", comment: reason, acted_at }

  9. Set step status = 'rejected', completed_at

  10. Set all subsequent step instances to 'skipped'

  11. Set instance status = 'rejected', completed_at

  12. Return document to Draft:
      * JE: Call JournalEntryAggregate::reject($uuid, $userId, $reason)
        (This fires JournalEntryRejected event, which triggers
         existing NotifyBookkeeperOnJeRejected listener)

  13. Dispatch ApprovalChainRejected event

Output: ApprovalStepInstance (updated)
```

### CreateApprovalWorkflow

```
Input (from StoreApprovalWorkflowRequest):
  - workspace_id: int (from middleware)
  - document_type: ApprovableDocumentType
  - name: string
  - description: ?string
  - min_threshold_cents: int (>= 0)
  - steps: array of { order, label, mode, approver_user_ids, approver_role_names }

Validation:
  - Name unique per workspace + document_type
  - min_threshold_cents unique among active workflows for this workspace + document_type
  - At least 1 step, at most 10 steps
  - Each step has at least one approver (user or role)
  - Step orders are sequential starting from 1
  - For BAS periods: only one active workflow allowed per workspace

Logic:
  1. Create ApprovalWorkflow record
  2. Create ApprovalStep records for each step
  3. Return workflow with steps

Output: ApprovalWorkflow (with steps loaded)
```

### UpdateApprovalWorkflow

```
Input (from UpdateApprovalWorkflowRequest):
  - Same fields as create (partial update supported)

Logic:
  1. Load workflow by UUID + workspace_id
  2. Guard: cannot change document_type
  3. Validate uniqueness constraints against other active workflows
  4. Update workflow fields
  5. Increment version
  6. Sync steps (delete removed, update existing, create new)
  7. In-flight instances are NOT affected (they use their snapshot)

Output: ApprovalWorkflow (updated, with steps)
```

### DeleteApprovalWorkflow

```
Logic:
  1. Load workflow by UUID + workspace_id
  2. Guard: no pending ApprovalInstances exist for this workflow
     → If in-flight, return 409 Conflict with message to deactivate instead
  3. Delete workflow (cascade deletes steps)
```

---

## NotificationType Additions

Add to `app/Enums/NotificationType.php`:

```php
// Approval Chains (060-ACH)
case ApprovalStepPending = 'approval_step_pending';
case ApprovalChainCompleted = 'approval_chain_completed';
case ApprovalChainRejected = 'approval_chain_rejected';
```

With corresponding `label()`, `icon()`, and `filterCategory()` entries:

| Case | Label | Icon | Filter Category |
|------|-------|------|----------------|
| ApprovalStepPending | 'Approval Step Pending' | 'bell' | 'Approvals' |
| ApprovalChainCompleted | 'Approval Chain Completed' | 'check-circle' | 'Approvals' |
| ApprovalChainRejected | 'Approval Chain Rejected' | 'x-circle' | 'Approvals' |

---

## EventServiceProvider Changes

```php
// Existing -- modified
JournalEntrySubmitted::class => [
    NotifyApproversOnJeSubmitted::class,       // Modified: skip if workflow-governed
    IncrementStreakOnJeSubmitted::class,        // Unchanged
    RouteJournalEntryForApproval::class,        // NEW: routes to approval chain
],

// New
ApprovalStepActivated::class => [
    NotifyApprovalStepApprovers::class,         // NEW: targeted step notifications
],

ApprovalChainCompleted::class => [
    NotifyOnApprovalChainOutcome::class,        // NEW: notify submitter of completion
],

ApprovalChainRejected::class => [
    NotifyOnApprovalChainOutcome::class,        // NEW: notify submitter of rejection
],
```

---

## NotifyApproversOnJeSubmitted Modification

The existing listener must be modified to avoid double-notification for workflow-governed documents.

```php
public function handle(JournalEntrySubmitted $event): void
{
    // ... existing try/catch wrapper ...

    $je = JournalEntry::where('workspace_id', $event->workspaceId)
        ->where('uuid', $event->aggregateRootUuid())
        ->first();

    if (! $je) {
        return;
    }

    // NEW: Check if this JE is governed by an approval workflow
    if (Feature::active('configurable_approval_chains')) {
        $hasApprovalInstance = ApprovalInstance::where('workspace_id', $event->workspaceId)
            ->where('approvable_type', 'journal_entry')
            ->where('approvable_id', $je->id)
            ->where('status', ApprovalInstanceStatus::Pending->value)
            ->exists();

        if ($hasApprovalInstance) {
            // Targeted step-level notifications are handled by
            // NotifyApprovalStepApprovers listener. Skip generic broadcast.
            return;
        }
    }

    // ... existing generic notification logic (unchanged) ...
}
```

**Ordering note**: `RouteJournalEntryForApproval` must execute BEFORE `NotifyApproversOnJeSubmitted` in the listener array so the approval instance exists when the notification listener checks. Laravel processes listeners in array order, so the `RouteJournalEntryForApproval` listener is listed first in `EventServiceProvider` (see above -- it is listed AFTER in the array but listeners fire in order, so we must reorder).

**Corrected ordering**:
```php
JournalEntrySubmitted::class => [
    RouteJournalEntryForApproval::class,        // FIRST: creates instance if workflow matches
    NotifyApproversOnJeSubmitted::class,         // SECOND: checks for instance, skips if found
    IncrementStreakOnJeSubmitted::class,          // Unchanged
],
```

---

## Policy: ApprovalWorkflowPolicy

```php
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

---

## Implementation Phases

### Phase 1A: Foundation (Schema + Models + Enums)

1. Create migration for all 5 tables
2. Create 4 new enums
3. Create 5 new Eloquent models with relationships, casts, scopes
4. Add `bas_period` to morph map in `AppServiceProvider`
5. Add `approval-workflow.manage` and `approval-workflow.view` permissions to `RolesAndPermissionsSeeder`
6. Define `configurable_approval_chains` feature flag in `AppServiceProvider`
7. Run migration, run seeder

**Test**: Models are queryable. Permissions exist. Feature flag defaults to off.

### Phase 1B: Workflow CRUD (US1)

1. Create `ApprovalWorkflowPolicy`
2. Register policy in `AppServiceProvider`
3. Create `StoreApprovalWorkflowRequest` with validation rules:
   - Name unique per workspace + doc type
   - Threshold unique among active workflows for workspace + doc type
   - Steps array: 1-10 items, each with label + at least one approver
   - BAS: max one active workflow per workspace
4. Create `UpdateApprovalWorkflowRequest`
5. Create `DeleteApprovalWorkflowRequest` (guards in-flight instances)
6. Create `CreateApprovalWorkflow` action
7. Create `UpdateApprovalWorkflow` action (increments version)
8. Create `DeleteApprovalWorkflow` action (guards in-flight)
9. Create `DeactivateApprovalWorkflow` action
10. Create `ApprovalWorkflowResource`
11. Create `ApprovalWorkflowController` (index, store, show, update, destroy, activate, deactivate)
12. Add routes to `api.php` behind `feature:configurable_approval_chains` middleware

**Tests**:
- CRUD operations (create, read, update, delete)
- Name uniqueness validation
- Threshold uniqueness validation (same doc type, same workspace)
- Step count validation (1-10)
- BAS single-workflow constraint
- Deletion blocked with in-flight instances
- Deactivation allowed with in-flight instances
- Permission checks (owner/accountant can manage, bookkeeper cannot)
- Version incrementing on update
- Workspace isolation

### Phase 1C: Routing Engine (US2)

1. Create `RouteDocumentForApproval` action (core routing logic)
2. Create `RouteJournalEntryForApproval` listener on `JournalEntrySubmitted`
3. Register listener in `EventServiceProvider` (before `NotifyApproversOnJeSubmitted`)
4. Create `ApprovalInstanceResource` and `ApprovalStepInstanceResource`

**Tests**:
- JE below threshold routes to lower workflow
- JE above threshold routes to higher workflow
- No workflow defined: existing flow unchanged (backward compatibility)
- Feature flag off: no routing occurs
- Workflow snapshot captures current config
- Re-submission after rejection creates new instance
- In-flight instance not affected by workflow edits
- BAS routing (no threshold, single active workflow)
- Amount extraction: JE debit total, invoice total

### Phase 1D: Sequential Approval Execution (US3)

1. Create `ApproveApprovalStep` action
2. Create `RejectApprovalStep` action
3. Create `ApproveStepRequest` and `RejectStepRequest` form requests
4. Create standard Laravel events: `ApprovalStepActivated`, `ApprovalChainCompleted`, `ApprovalChainRejected`
5. Create `ApprovalInstanceController` (index, show, approve, reject, forDocument, myApprovals)
6. Add routes to `api.php`
7. Wire `ApproveApprovalStep` to call `ApproveJournalEntry::run()` on final step

**Tests**:
- Two-step chain: approve step 1 activates step 2
- Two-step chain: approve step 2 fires aggregate approve, document is Posted
- Reject at step 1: chain rejected, document back to Draft
- Reject at step 2: chain rejected, step 1 preserved as approved in trail, doc back to Draft
- Separation of duties: submitter cannot approve any step
- Non-eligible user cannot approve (not in resolved_approver_ids)
- User without `journal-entry.approve` permission cannot approve
- My Approvals queue returns correct items for current user
- Step order advances correctly
- Completed chain cannot be acted on again

### Phase 1E: Audit Trail (US4)

1. Ensure `actions` JSON on `ApprovalStepInstance` captures every action with actor, timestamp, comment
2. Create `forDocument` endpoint on `ApprovalInstanceController` to return full instance history for a document
3. Ensure rejection reason is recorded in actions JSON
4. Ensure workflow name, version, step label are accessible via instance + snapshot

**Tests**:
- Completed chain audit trail contains: submission, step 1 approval (actor, timestamp, comment), step 2 approval
- Rejected chain audit trail: step 1 approved, step 2 rejected with reason
- Workflow name and version accessible from instance
- Actions JSON is append-only (new actions added, old ones never removed)

### Phase 1F: Targeted Notifications (US5)

1. Add 3 new cases to `NotificationType` enum (with label, icon, filterCategory)
2. Create `NotifyApprovalStepApprovers` listener on `ApprovalStepActivated`
3. Create `NotifyOnApprovalChainOutcome` listener on `ApprovalChainCompleted` and `ApprovalChainRejected`
4. Modify `NotifyApproversOnJeSubmitted` to skip when approval instance exists
5. Register all listeners in `EventServiceProvider`

**Tests**:
- Step 1 activation: only step 1 approvers notified, step 2 approvers not notified
- Step 1 completion: step 2 approvers notified
- Chain completed: submitter notified
- Chain rejected: submitter notified with reason
- No workflow: existing generic notification fires (backward compatibility)
- Notification type is `ApprovalStepPending` for step activation
- Notification type is `ApprovalChainCompleted` / `ApprovalChainRejected` for outcomes

---

## Testing Strategy

### Test Coverage by User Story

| User Story | Test File | Key Scenarios | Est. Tests |
|------------|-----------|---------------|------------|
| US1: Workflow CRUD | `ApprovalWorkflowTest.php` | CRUD, validation, uniqueness, permissions, deactivation | ~15 |
| US2: Routing | `ApprovalRoutingTest.php` | Threshold matching, fallback, re-submission, snapshot, BAS | ~12 |
| US3: Sequential Approval | `ApprovalExecutionTest.php` | Multi-step flow, approve, reject, separation of duties, final-step aggregate call | ~15 |
| US4: Audit Trail | `ApprovalAuditTest.php` | Actions JSON, timeline, comment recording | ~8 |
| US5: Notifications | `ApprovalNotificationTest.php` | Targeted notifications, backward compat, notification types | ~10 |
| Cross-cutting | `ApprovalPermissionTest.php` | Role-based access, workspace isolation | ~8 |
| **Total** | | | **~68** |

### Test Setup Pattern

All approval tests follow the existing workspace test setup:

```php
uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $this->user = User::factory()->create();
    $this->org = Organisation::factory()->create();
    $this->workspace = Workspace::factory()->create([
        'organisation_id' => $this->org->id,
    ]);

    $this->workspace->users()->attach($this->user->id, ['role' => 'owner']);
    setPermissionsTeamId($this->workspace->id);
    $this->user->assignRole('owner');

    $this->wsHeaders = ['X-Workspace-Id' => (string) $this->workspace->id];

    // Enable feature flag for tests
    Feature::define('configurable_approval_chains', fn () => true);
});
```

### Key Test Scenarios

**Backward compatibility** (critical):
```php
it('uses existing single-step approval when no workflow is configured', function () {
    // Create and submit a JE with NO approval workflows defined
    // Assert: JE is PendingApproval
    // Assert: generic JeSubmitted notification sent to all approvers
    // Assert: any approver can approve via existing endpoint
    // Assert: JE transitions to Posted
});
```

**Feature flag off**:
```php
it('does not route to approval chain when feature flag is off', function () {
    Feature::define('configurable_approval_chains', fn () => false);

    // Create workflow, submit JE
    // Assert: no ApprovalInstance created
    // Assert: existing notification flow fires
});
```

**Threshold routing**:
```php
it('routes to highest matching threshold workflow', function () {
    // Create workflow A: threshold 0, 1 step
    // Create workflow B: threshold 1000000 ($10,000), 2 steps
    // Submit JE with $75,000 total debits
    // Assert: routed to workflow B (2 steps)
});
```

**Separation of duties**:
```php
it('prevents submitter from approving any step', function () {
    // Submit JE as bookkeeper (submittedBy = bookkeeper)
    // Attempt to approve step 1 as bookkeeper
    // Assert: 403 Forbidden
});
```

**Workspace isolation**:
```php
it('cannot access approval instances from another workspace', function () {
    // Create workflow + instance in workspace A
    // Query from workspace B
    // Assert: 404 or empty result
});
```

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Listener ordering causes double notifications | Medium | Low | `RouteJournalEntryForApproval` registered before `NotifyApproversOnJeSubmitted` in EventServiceProvider. Tests verify ordering |
| Workflow edit during in-flight approval causes inconsistency | High | Medium | Workflow snapshot on instance creation. In-flight approvals use snapshot, not live workflow |
| Approver role changes during chain | Low | Medium | Role membership resolved at step activation time, not submission time. Documented in spec edge cases |
| Feature flag rollback leaves orphan instances | Low | Low | Orphan instances are inert -- they do not affect document status. Documents remain in their existing status. Instances can be cleaned up via artisan command if needed |
| Performance degradation with many workflows | Low | Low | Routing query is a single indexed query. Max 50 workflows per workspace (NFR-006) |

---

## Out of P1 Scope (Deferred to P2+)

| Feature | Spec Reference | P2 Dependency |
|---------|---------------|---------------|
| "All of" approval mode execution logic | US6 (P2) | Column exists, enum exists, action logic deferred |
| Escalation timeouts | US7 (P2) | Columns exist in schema, scheduled command deferred |
| Delegation CRUD and resolution | US8 (P2) | Table exists, delegation actions/endpoints deferred |
| Invoice/Bill submit interception | US9 (P2) | Routing engine supports them; listeners/UI deferred |
| BAS period approval integration | US10 (P2) | Routing supports BAS; listener/UI deferred |
| Practice-level workflow templates | US11 (P3) | Entirely deferred |
| Frontend (all UI components) | FR-037 to FR-041 | Separate epic or P2 |
| Multi-currency threshold conversion | Edge case | P2 enhancement |
| My Approvals frontend page | FR-040 | Backend endpoint in P1, frontend in P2 |
