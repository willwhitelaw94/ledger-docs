---
title: "Implementation Plan: Employee Portal & Viral Acquisition Loop (Phase 1)"
---

# Implementation Plan: Employee Portal & Viral Acquisition Loop (Phase 1)

**Spec**: `employee-portal-spec.md`
**Scope**: Phase 1 -- Portal Foundation (3 sprints)
**FR Coverage**: FR-001 through FR-020 (Phase 2 FRs 021-027 are out of scope for this plan)

---

## Dependency Graph

```
Sprint 1 (Data model + role + middleware)
  T01 Migration ─────────────────────┐
  T02 PortalStatus enum ─────────────┤
  T03 Employee model updates ────────┤ (depends on T01, T02)
  T04 Employee role seeder ──────────┤
  T05 EnsureEmployeePortalAccess ────┤ (depends on T04)
  T06 Sprint 1 tests ────────────────┘ (depends on T01-T05)

Sprint 2 (Invitation + portal API)
  T07 InviteEmployeeToPortal ────────┐ (depends on T03, T04)
  T08 Employer portal endpoints ─────┤ (depends on T07)
  T09 PayslipResource ───────────────┤
  T10 YearToDateSummaryResource ─────┤
  T11 EmployeePortalController ──────┤ (depends on T05, T09, T10)
  T12 Portal routes ─────────────────┤ (depends on T05, T11)
  T13 EmployeeResource update ───────┤ (depends on T02)
  T14 Sprint 2 tests ────────────────┘ (depends on T07-T13)

Sprint 3 (Viral loop + employer dashboard)
  T15 CreateEmployeePersonalWorkspace ─┐ (depends on T03, referral actions)
  T16 Portal workspace endpoints ──────┤ (depends on T12, T15)
  T17 portalCounts endpoint ───────────┤ (depends on T02)
  T18 payrollDashboard extension ──────┤ (depends on T17)
  T19 bulkInviteToPortal endpoint ─────┤ (depends on T07)
  T20 Sprint 3 tests ─────────────────┘ (depends on T15-T19)
```

---

## Sprint 1: Data Model, Employee Role, and Middleware

### T01 -- Migration: Add portal columns to employees table

**File**: `database/migrations/2026_04_02_000001_add_portal_columns_to_employees_table.php`
**Action**: Create new migration
**FR**: FR-001, FR-002, FR-003

```php
Schema::table('employees', function (Blueprint $table) {
    $table->unsignedBigInteger('user_id')->nullable()->after('workspace_id');
    $table->string('portal_status')->default('not_invited')->after('status');
    $table->timestamp('portal_invited_at')->nullable()->after('portal_status');

    $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
    $table->index('user_id', 'idx_employees_user_id');
    $table->index(['workspace_id', 'portal_status'], 'idx_employees_portal_status');
});
```

**Fields added**:
- `user_id` -- bigint unsigned, nullable, FK to `users.id` with `ON DELETE SET NULL`
- `portal_status` -- varchar, default `'not_invited'`
- `portal_invited_at` -- timestamp, nullable

**Indexes**:
- `idx_employees_user_id` on `user_id`
- `idx_employees_portal_status` on `(workspace_id, portal_status)` -- composite for the `portalCounts` GROUP BY query

**Dependencies**: None (can be done first)

---

### T02 -- Create PortalStatus enum

**File**: `app/Enums/PortalStatus.php`
**Action**: Create new file
**FR**: FR-002

```php
<?php

namespace App\Enums;

enum PortalStatus: string
{
    case NotInvited = 'not_invited';
    case Invited = 'invited';
    case Active = 'active';
    case Revoked = 'revoked';

    public function label(): string
    {
        return match ($this) {
            self::NotInvited => 'Not Invited',
            self::Invited => 'Invited',
            self::Active => 'Active',
            self::Revoked => 'Revoked',
        };
    }
}
```

**Dependencies**: None (can be done in parallel with T01)

---

### T03 -- Update Employee model

**File**: `app/Models/Tenant/Employee.php`
**Action**: Modify existing file
**FR**: FR-001, FR-002, FR-003

**Changes**:

1. Add to `$fillable` array: `'user_id'`, `'portal_status'`, `'portal_invited_at'`

2. Add to `casts()` method:
   ```php
   'portal_status' => PortalStatus::class,
   'portal_invited_at' => 'datetime',
   ```

3. Add `user()` relationship:
   ```php
   public function user(): BelongsTo
   {
       return $this->belongsTo(\App\Models\User::class);
   }
   ```

4. Add scope for portal-active employees:
   ```php
   public function scopePortalActive(Builder $query): Builder
   {
       return $query->where('portal_status', PortalStatus::Active);
   }
   ```

5. Add scope for finding employee by user ID:
   ```php
   public function scopeForUser(Builder $query, int $userId): Builder
   {
       return $query->where('user_id', $userId);
   }
   ```

**Import**: `use App\Enums\PortalStatus;`

**Dependencies**: T01 (migration), T02 (enum)

---

### T04 -- Add `employee` role to RolesAndPermissionsSeeder

**File**: `database/seeders/RolesAndPermissionsSeeder.php`
**Action**: Modify existing file
**FR**: FR-006

**Changes**:

1. Add `'employee' => $this->employeePermissions()` to the `$rolePermissions` array in the `run()` method (after `'client'`).

2. Add the new permissions to `allPermissions()`:
   ```php
   // Employee Portal (064-PAY Employee Portal)
   'payslip.view-own',
   'portal.access',
   ```

3. Add new method:
   ```php
   private function employeePermissions(): array
   {
       return [
           'payslip.view-own',
           'portal.access',
       ];
   }
   ```

**Note**: The `employee` role is the 7th workspace role. It is intentionally minimal -- only 2 permissions. It must NOT be added to any other role's permission list. The `payslip.view-own` and `portal.access` permissions are exclusive to the `employee` role.

**Dependencies**: None (can be done in parallel with T01-T02)

---

### T05 -- Create EnsureEmployeePortalAccess middleware

**File**: `app/Http/Middleware/EnsureEmployeePortalAccess.php`
**Action**: Create new file
**FR**: FR-008

**Pattern**: Follows `EnforceJobScope` middleware structure. Runs AFTER `SetWorkspaceContext` (which sets `workspace` on `$request->attributes`).

```php
<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Enums\PortalStatus;
use App\Models\Tenant\Employee;
use App\Services\PermissionResolver;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmployeePortalAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $workspace = $request->attributes->get('workspace');

        if (! $workspace) {
            return response()->json(['message' => 'Workspace context required.'], 400);
        }

        // Check that the user has portal.access permission
        $resolver = app(PermissionResolver::class);
        if (! $resolver->check($user, $workspace->id, 'portal.access')) {
            return response()->json([
                'message' => 'You do not have employee portal access to this workspace.',
            ], 403);
        }

        // Find the employee record linked to this user in this workspace
        $employee = Employee::where('workspace_id', $workspace->id)
            ->where('user_id', $user->id)
            ->first();

        if (! $employee) {
            return response()->json([
                'message' => 'No employee record is linked to your account in this workspace.',
            ], 403);
        }

        if ($employee->portal_status !== PortalStatus::Active) {
            $message = $employee->portal_status === PortalStatus::Revoked
                ? "Your portal access to {$workspace->name} has been removed. Contact your employer for more information."
                : 'Your employee portal access is not active.';

            return response()->json(['message' => $message], 403);
        }

        // Store the employee on the request for downstream controllers
        $request->attributes->set('portal_employee', $employee);

        return $next($request);
    }
}
```

**Key decisions**:
- Verifies `portal.access` permission via `PermissionResolver` (consistent with how `SetWorkspaceContext` resolves permissions).
- Looks up the `Employee` record by `user_id + workspace_id` (FR-007 data isolation).
- Stores the resolved employee on `$request->attributes` (follows `EnforceJobScope` pattern of stashing context on the request).
- Returns 403 (not 404) for revoked employees with a descriptive message.
- Runs after `SetWorkspaceContext`, which has already validated workspace access and resolved permissions.

**Register in bootstrap/app.php** -- add to `$middleware->alias()`:
```php
'employee_portal' => \App\Http\Middleware\EnsureEmployeePortalAccess::class,
```

**Dependencies**: T04 (role must exist for permission check to work)

---

### T06 -- Sprint 1 Tests

**File**: `tests/Feature/Api/EmployeePortalTest.php`
**Action**: Create new test file
**FR**: FR-001-FR-008 (foundation)

**Test cases** (Pest):

```
Seeder / Migration
- it seeds the employee role with exactly 2 permissions (payslip.view-own, portal.access)
- it adds user_id, portal_status, portal_invited_at columns to employees

PortalStatus Enum
- it casts portal_status to PortalStatus enum
- it defaults portal_status to not_invited

Employee Model
- it belongs to a user (user_id FK)
- it scopes by portal_active
- it scopes by forUser

EnsureEmployeePortalAccess Middleware
- it allows access when user has portal.access and employee.portal_status is active
- it returns 403 when user has no portal.access permission
- it returns 403 when no employee record is linked to user
- it returns 403 when portal_status is revoked (with descriptive message)
- it returns 403 when portal_status is invited (not yet active)
- it stores portal_employee on request attributes
```

**Setup pattern** (follows existing test conventions):
```php
uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    // Create org, workspace, user, employee...
});
```

**Dependencies**: T01-T05 (all Sprint 1 tasks)

---

## Sprint 2: Invitation Flow and Portal API

### T07 -- Create InviteEmployeeToPortal action

**File**: `app/Actions/Payroll/InviteEmployeeToPortal.php`
**Action**: Create new file
**FR**: FR-004, FR-005

```php
<?php

namespace App\Actions\Payroll;

use App\Actions\Email\SendWorkspaceInvitationEmail;
use App\Enums\PortalStatus;
use App\Models\Tenant\Employee;
use App\Models\User;
use App\Models\WorkspaceInvitation;
use App\Services\PermissionService;
use Illuminate\Support\Str;
use Lorisleiva\Actions\Concerns\AsAction;

class InviteEmployeeToPortal
{
    use AsAction;

    public function handle(Employee $employee, int $invitedBy): array
    {
        if (! $employee->email) {
            throw new \DomainException('Employee must have an email address before being invited to the portal.');
        }

        if (in_array($employee->portal_status, [PortalStatus::Active, PortalStatus::Invited], true)) {
            throw new \DomainException('Employee has already been invited to the portal.');
        }

        $existingUser = User::where('email', $employee->email)->first();

        if ($existingUser) {
            return $this->linkExistingUser($employee, $existingUser);
        }

        return $this->createInvitation($employee);
    }

    private function linkExistingUser(Employee $employee, User $user): array
    {
        $workspace = $employee->workspace;

        // Link employee record to user
        $employee->update([
            'user_id' => $user->id,
            'portal_status' => PortalStatus::Active,
            'portal_invited_at' => now(),
        ]);

        // Add user to workspace with employee role (if not already a member)
        if (! $user->hasWorkspaceAccess($workspace->id)) {
            $workspace->users()->attach($user->id, ['role' => 'employee']);
            app(PermissionService::class)->assignRole($user, $workspace->id, 'employee');
        } else {
            // User already has workspace access (e.g., bookkeeper).
            // Do NOT change their existing role. Just link the employee record.
            // The employee role permissions are additive through the employee record link.
        }

        return [
            'status' => 'linked',
            'message' => "{$employee->full_name} is already a MoneyQuest user. Their employee record has been linked to their account.",
            'portal_status' => PortalStatus::Active->value,
        ];
    }

    private function createInvitation(Employee $employee): array
    {
        $invitation = WorkspaceInvitation::updateOrCreate(
            ['workspace_id' => $employee->workspace_id, 'email' => $employee->email],
            [
                'role' => 'employee',
                'token' => Str::random(32),
                'expires_at' => now()->addDays(7),
            ],
        );

        SendWorkspaceInvitationEmail::run($invitation);

        $employee->update([
            'portal_status' => PortalStatus::Invited,
            'portal_invited_at' => now(),
        ]);

        return [
            'status' => 'invited',
            'message' => "Invitation sent to {$employee->email}.",
            'portal_status' => PortalStatus::Invited->value,
        ];
    }
}
```

**Key decisions**:
- When the user already exists, immediately links and sets `portal_status: active` (FR-004). Does NOT overwrite existing workspace roles.
- When no user exists, creates `WorkspaceInvitation` with `role: 'employee'` and 7-day expiry (FR-005), following the pattern in `InviteUser`.
- Uses `SendWorkspaceInvitationEmail` (existing 023-EML infrastructure) for the invitation email.
- Guards against double-invite and missing email.

**Modification to AcceptInvitation**: The existing `AcceptInvitation` action (`app/Actions/Workspace/AcceptInvitation.php`) already handles attaching users and assigning roles. However, when a portal invitation is accepted, we also need to link `employee.user_id`. Add a post-accept hook:

**File**: `app/Actions/Workspace/AcceptInvitation.php`
**Change**: After the existing `$invitation->update(['accepted_at' => now()])` line, add:

```php
// If this is an employee portal invitation, link the employee record
if ($invitation->role === 'employee') {
    $employee = \App\Models\Tenant\Employee::where('workspace_id', $invitation->workspace_id)
        ->where('email', $invitation->email)
        ->whereNull('user_id')
        ->first();

    if ($employee) {
        $employee->update([
            'user_id' => $user->id,
            'portal_status' => \App\Enums\PortalStatus::Active,
        ]);
    }
}
```

**Dependencies**: T03 (Employee model), T04 (employee role seeded)

---

### T08 -- Add employer-facing portal management endpoints to PayrollController

**File**: `app/Http/Controllers/Api/PayrollController.php`
**Action**: Modify existing file
**FR**: FR-004, FR-005

**New methods**:

1. `inviteToPortal(Request $request, int $id)`:
   - Load employee by ID + workspace_id
   - `Gate::authorize('update', $employee)` (reuse existing update permission)
   - Call `InviteEmployeeToPortal::run($employee, $request->user()->id)`
   - Return JSON result from the action

2. `resendInvitation(Request $request, int $id)`:
   - Load employee, verify `portal_status === 'invited'`
   - Find existing `WorkspaceInvitation`, regenerate token, reset expiry
   - Call `SendWorkspaceInvitationEmail::run($invitation)`
   - Update `portal_invited_at`
   - Return success response

**Dependencies**: T07 (InviteEmployeeToPortal action)

---

### T09 -- Create PayslipResource (employee-facing)

**File**: `app/Http/Resources/Payroll/PayslipResource.php`
**Action**: Create new file
**FR**: FR-009, FR-010

```php
<?php

namespace App\Http\Resources\Payroll;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PayslipResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Whitelist approach: only include fields safe for employee eyes.
        // NEVER include: tax_file_number, bank_bsb, bank_account_number,
        // bank_account_name, tax_scale, tax_treatment_code
        return [
            'pay_run_id' => $this->pay_run_id,
            'period_start' => $this->payRun?->period_start?->toDateString(),
            'period_end' => $this->payRun?->period_end?->toDateString(),
            'payment_date' => $this->payRun?->payment_date?->toDateString(),
            'gross_pay' => $this->gross_pay,
            'ordinary_hours' => (float) $this->ordinary_hours,
            'overtime_hours' => (float) $this->overtime_hours,
            'hourly_rate' => $this->hourly_rate,
            'salary_amount' => $this->salary_amount,
            'payg_withheld' => $this->payg_withheld,
            'super_guarantee' => $this->super_guarantee,
            'help_repayment' => $this->help_repayment,
            'net_pay' => $this->net_pay,
            'leave_annual_accrued' => $this->leave_annual_accrued,
            'leave_personal_accrued' => $this->leave_personal_accrued,
            'leave_annual_taken' => $this->leave_annual_taken,
            'leave_personal_taken' => $this->leave_personal_taken,
            'is_new' => $this->when(
                $request->attributes->has('portal_employee'),
                fn () => $this->isNewForEmployee($request),
                false,
            ),
        ];
    }

    private function isNewForEmployee(Request $request): bool
    {
        // A payslip is "new" if the pay run was finalised after
        // the employee last viewed the portal. This requires a
        // last_portal_viewed_at timestamp on the employee record,
        // which can be updated on each portal access.
        // For v1, default to false (the "New" badge is a UI enhancement
        // that can be layered on via a separate last_viewed tracking mechanism).
        return false;
    }
}
```

**Security**: Uses a whitelist approach -- only explicitly listed fields are returned. The `PayRunLine` model has `tax_scale`, `notes`, and links to the employee model (which contains TFN, bank details). None of those are included.

**Dependencies**: None (can be done in parallel with T07-T08)

---

### T10 -- Create YearToDateSummaryResource

**File**: `app/Http/Resources/Payroll/YearToDateSummaryResource.php`
**Action**: Create new file
**FR**: FR-011

This is a manually constructed resource (not wrapping a model), so it extends `JsonResource` and wraps an array.

```php
<?php

namespace App\Http\Resources\Payroll;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class YearToDateSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'financial_year' => $this->resource['financial_year'],
            'total_gross' => $this->resource['total_gross'],
            'total_payg' => $this->resource['total_payg'],
            'total_super' => $this->resource['total_super'],
            'total_net' => $this->resource['total_net'],
            'total_help' => $this->resource['total_help'],
            'pay_count' => $this->resource['pay_count'],
            'leave_annual_balance' => $this->resource['leave_annual_balance'],
            'leave_personal_balance' => $this->resource['leave_personal_balance'],
        ];
    }
}
```

**Dependencies**: None

---

### T11 -- Create EmployeePortalController

**File**: `app/Http/Controllers/Api/EmployeePortalController.php`
**Action**: Create new file
**FR**: FR-007, FR-009, FR-010, FR-011, FR-016

```php
<?php

namespace App\Http\Controllers\Api;

use App\Enums\PayRunStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Payroll\PayslipResource;
use App\Http\Resources\Payroll\YearToDateSummaryResource;
use App\Models\Tenant\Employee;
use App\Models\Tenant\PayRunLine;
use App\Models\Tenant\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EmployeePortalController extends Controller
{
    /**
     * List all payslips for the authenticated employee (finalised only).
     *
     * FR-007: Filters by employee.user_id = auth()->id() -- never user-supplied employee ID.
     * FR-010: Only finalised pay runs.
     */
    public function payslipIndex(Request $request): AnonymousResourceCollection
    {
        $employee = $request->attributes->get('portal_employee');

        $payslips = PayRunLine::where('employee_id', $employee->id)
            ->whereHas('payRun', fn ($q) => $q->where('status', PayRunStatus::Finalised))
            ->with('payRun')
            ->orderByDesc(
                PayRunLine::query()
                    ->select('payment_date')
                    ->from('pay_runs')
                    ->whereColumn('pay_runs.id', 'pay_run_lines.pay_run_id')
                    ->limit(1)
            )
            ->paginate(20);

        return PayslipResource::collection($payslips);
    }

    /**
     * Detailed payslip for a specific pay run.
     *
     * FR-007: Validates the pay run line belongs to the authenticated employee.
     */
    public function payslipShow(Request $request, int $payRunId): PayslipResource
    {
        $employee = $request->attributes->get('portal_employee');

        $payslip = PayRunLine::where('employee_id', $employee->id)
            ->where('pay_run_id', $payRunId)
            ->whereHas('payRun', fn ($q) => $q->where('status', PayRunStatus::Finalised))
            ->with('payRun')
            ->firstOrFail();

        return new PayslipResource($payslip);
    }

    /**
     * Year-to-date earnings summary and leave balances.
     *
     * FR-011: Aggregates all PayRunLine records in the current financial year.
     */
    public function yearToDateSummary(Request $request): YearToDateSummaryResource
    {
        $employee = $request->attributes->get('portal_employee');
        $workspace = $request->attributes->get('workspace');

        $fiscalYearStart = $this->getFiscalYearStart($workspace);
        $fiscalYearLabel = $this->getFiscalYearLabel($workspace);

        $aggregates = PayRunLine::where('employee_id', $employee->id)
            ->whereHas('payRun', fn ($q) => $q
                ->where('status', PayRunStatus::Finalised)
                ->where('payment_date', '>=', $fiscalYearStart)
            )
            ->selectRaw('
                COALESCE(SUM(gross_pay), 0) as total_gross,
                COALESCE(SUM(payg_withheld), 0) as total_payg,
                COALESCE(SUM(super_guarantee), 0) as total_super,
                COALESCE(SUM(net_pay), 0) as total_net,
                COALESCE(SUM(help_repayment), 0) as total_help,
                COUNT(*) as pay_count
            ')
            ->first();

        return new YearToDateSummaryResource([
            'financial_year' => $fiscalYearLabel,
            'total_gross' => (int) $aggregates->total_gross,
            'total_payg' => (int) $aggregates->total_payg,
            'total_super' => (int) $aggregates->total_super,
            'total_net' => (int) $aggregates->total_net,
            'total_help' => (int) $aggregates->total_help,
            'pay_count' => (int) $aggregates->pay_count,
            'leave_annual_balance' => $employee->leave_annual_balance ?? 0,
            'leave_personal_balance' => $employee->leave_personal_balance ?? 0,
        ]);
    }

    /**
     * Check if the employee already has a personal workspace.
     *
     * FR-016: Returns existing workspace info or null.
     */
    public function personalWorkspaceStatus(Request $request): JsonResponse
    {
        $user = $request->user();

        $personalWorkspace = Workspace::whereHas('users', fn ($q) => $q
            ->where('users.id', $user->id)
            ->where('workspace_user.role', 'owner')
        )
            ->where('entity_type', 'personal')
            ->first();

        if ($personalWorkspace) {
            return response()->json([
                'has_personal_workspace' => true,
                'workspace_id' => $personalWorkspace->id,
                'workspace_name' => $personalWorkspace->name,
                'workspace_slug' => $personalWorkspace->slug,
            ]);
        }

        return response()->json([
            'has_personal_workspace' => false,
        ]);
    }

    private function getFiscalYearStart(Workspace $workspace): string
    {
        $startMonth = $workspace->fiscal_year_start_month ?? 7;
        $now = now();

        $fiscalYearStart = $now->copy()->setMonth($startMonth)->startOfMonth();

        if ($fiscalYearStart->isAfter($now)) {
            $fiscalYearStart->subYear();
        }

        return $fiscalYearStart->toDateString();
    }

    private function getFiscalYearLabel(Workspace $workspace): string
    {
        $startMonth = $workspace->fiscal_year_start_month ?? 7;
        $now = now();

        $fiscalYearStart = $now->copy()->setMonth($startMonth)->startOfMonth();

        if ($fiscalYearStart->isAfter($now)) {
            $fiscalYearStart->subYear();
        }

        $startYear = $fiscalYearStart->year;
        $endYear = $startYear + 1;

        return "{$startYear}-" . substr((string) $endYear, -2);
    }
}
```

**Critical security notes**:
- Every query uses `$request->attributes->get('portal_employee')` set by `EnsureEmployeePortalAccess` middleware -- never a user-supplied employee ID.
- `payslipShow` validates ownership: `employee_id = $employee->id` AND `pay_run_id` matches.
- Year-to-date aggregation uses `fiscal_year_start_month` from the workspace model.

**Dependencies**: T05 (middleware sets `portal_employee`), T09 (PayslipResource), T10 (YearToDateSummaryResource)

---

### T12 -- Register portal routes

**File**: `routes/api.php`
**Action**: Modify existing file
**FR**: FR-006, FR-008

Add a new route group inside the workspace-scoped routes block (after the existing payroll routes, around line 895):

```php
// Employee Portal (064-PAY Employee Portal)
Route::middleware(['employee_portal'])->prefix('portal')->group(function () {
    Route::get('payslips', [EmployeePortalController::class, 'payslipIndex']);
    Route::get('payslips/{payRunId}', [EmployeePortalController::class, 'payslipShow']);
    Route::get('summary', [EmployeePortalController::class, 'yearToDateSummary']);
    Route::post('create-personal-workspace', [EmployeePortalController::class, 'createPersonalWorkspace']);
    Route::get('personal-workspace-status', [EmployeePortalController::class, 'personalWorkspaceStatus']);
});
```

These routes are already inside the `auth:sanctum` + `SetWorkspaceContext` + `job_scope` middleware group. The `employee_portal` middleware alias (registered in T05) adds the portal-specific checks.

Also add the employer-facing portal management routes inside the existing `feature:payroll` group:

```php
// Employee Portal Management (employer-facing)
Route::post('employees/{id}/invite-portal', [PayrollController::class, 'inviteToPortal']);
Route::post('employees/{id}/resend-invitation', [PayrollController::class, 'resendInvitation']);
Route::get('employees/portal-counts', [PayrollController::class, 'portalCounts']);
Route::post('employees/bulk-invite', [PayrollController::class, 'bulkInviteToPortal']);
```

**Import**: Add `use App\Http\Controllers\Api\EmployeePortalController;` at the top of `routes/api.php`.

**Route ordering note**: `portal-counts` and `bulk-invite` must be defined BEFORE `employees/{id}` to avoid the parameter matching `portal-counts` as an `{id}`. Since the existing routes already have `employees/{id}` at line 880, add the new non-parameterized routes BEFORE the existing `employees/{id}` route, or after the parameterized routes since they use POST/GET with distinct paths.

**Dependencies**: T05 (middleware alias registered), T08 (PayrollController methods), T11 (EmployeePortalController)

---

### T13 -- Extend EmployeeResource with portal_status

**File**: `app/Http/Resources/Payroll/EmployeeResource.php`
**Action**: Modify existing file
**FR**: FR-017

Add to the `toArray` return array (after `leave_personal_balance`):

```php
'portal_status' => $this->portal_status?->value,
'portal_status_label' => $this->portal_status?->label(),
'portal_invited_at' => $this->portal_invited_at?->toIso8601String(),
'user_id' => $this->user_id,
```

**Dependencies**: T02 (PortalStatus enum)

---

### T14 -- Sprint 2 Tests

**File**: `tests/Feature/Api/EmployeePortalTest.php`
**Action**: Extend test file from T06
**FR**: FR-004, FR-005, FR-007, FR-009, FR-010, FR-011, FR-016, FR-017

**Test cases**:

```
InviteEmployeeToPortal Action
- it links an existing user and sets portal_status to active
- it creates a WorkspaceInvitation when no user exists
- it sets portal_status to invited when invitation is created
- it sends an invitation email via SendWorkspaceInvitationEmail
- it throws DomainException when employee has no email
- it throws DomainException when employee is already invited
- it does not overwrite existing workspace role when linking existing user
- it adds employee role for new workspace member

AcceptInvitation Integration
- it sets employee.user_id and portal_status to active when portal invitation is accepted
- it links employee record even when user registers fresh via invitation

Employer Endpoints
- POST /employees/{id}/invite-portal returns linked status for existing user
- POST /employees/{id}/invite-portal returns invited status for new user
- POST /employees/{id}/invite-portal returns 422 for employee without email
- POST /employees/{id}/resend-invitation regenerates token and sends email
- POST /employees/{id}/resend-invitation returns 422 for non-invited employee

Portal API -- Payslip Index
- GET /portal/payslips returns only finalised pay runs for the authenticated employee
- GET /portal/payslips does not return draft pay runs
- GET /portal/payslips returns empty list when employee has no pay run lines
- GET /portal/payslips orders by payment_date descending

Portal API -- Payslip Show
- GET /portal/payslips/{payRunId} returns payslip detail for authenticated employee
- GET /portal/payslips/{payRunId} returns 404 for another employee's pay run
- GET /portal/payslips/{payRunId} returns 404 for draft pay run
- GET /portal/payslips/{payRunId} never includes tax_file_number in response
- GET /portal/payslips/{payRunId} never includes bank_bsb or bank_account_number

Portal API -- Year-to-Date Summary
- GET /portal/summary returns aggregated YTD totals in correct financial year
- GET /portal/summary includes current leave balances
- GET /portal/summary returns zeros when no finalised pay runs exist

Portal API -- Personal Workspace Status
- GET /portal/personal-workspace-status returns has_personal_workspace: false when none exists
- GET /portal/personal-workspace-status returns workspace details when personal workspace exists

EmployeeResource
- it includes portal_status and portal_invited_at in response
```

**Dependencies**: T07-T13 (all Sprint 2 tasks)

---

## Sprint 3: Viral Loop and Employer Dashboard

### T15 -- Create CreateEmployeePersonalWorkspace action

**File**: `app/Actions/Payroll/CreateEmployeePersonalWorkspace.php`
**Action**: Create new file
**FR**: FR-012, FR-013, FR-014, FR-015, FR-016

```php
<?php

namespace App\Actions\Payroll;

use App\Actions\Referral\ActivateReferral;
use App\Actions\Referral\GenerateReferralCode;
use App\Actions\Referral\TrackReferralSignup;
use App\Actions\Workspace\CreateWorkspace;
use App\Models\Central\ViralReferral;
use App\Models\Tenant\Workspace;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Lorisleiva\Actions\Concerns\AsAction;

class CreateEmployeePersonalWorkspace
{
    use AsAction;

    public function handle(User $employee, Workspace $employerWorkspace): Workspace
    {
        // FR-016: Check if employee already has a personal workspace
        $existingPersonal = Workspace::whereHas('users', fn ($q) => $q
            ->where('users.id', $employee->id)
            ->where('workspace_user.role', 'owner')
        )
            ->where('entity_type', 'personal')
            ->first();

        if ($existingPersonal) {
            throw new \DomainException('You already have a personal workspace.');
        }

        return DB::transaction(function () use ($employee, $employerWorkspace) {
            // FR-012: Create personal workspace
            $organisation = $employerWorkspace->organisation;
            // Use the employee's own organisation if they have one,
            // otherwise use the employer's org (personal workspaces need an org parent)
            $employeeOrg = $employee->organisations()->first() ?? $organisation;

            $personalWorkspace = CreateWorkspace::run(
                organisationId: $employeeOrg->id,
                name: "{$employee->first_name}'s Personal Finances",
                ownerId: $employee->id,
                industry: 'personal',
                entityType: 'personal',
            );

            // FR-013: Identify employer workspace owner (earliest by pivot created_at)
            $workspaceOwner = $this->resolveWorkspaceOwner($employerWorkspace);

            if ($workspaceOwner) {
                // Generate referral code for owner (idempotent)
                $referralCode = GenerateReferralCode::run($workspaceOwner);

                // FR-014: Track referral signup
                $referral = TrackReferralSignup::run($employee, $referralCode->code);

                // Store source metadata on the referral
                if ($referral) {
                    $referral->update([
                        'metadata' => array_merge($referral->metadata ?? [], [
                            'source' => 'employee_portal',
                            'employer_workspace_id' => $employerWorkspace->id,
                            'employer_workspace_name' => $employerWorkspace->name,
                            'invited_at' => now()->toIso8601String(),
                        ]),
                    ]);

                    // FR-015: Activate referral (SIGNED_UP -> ACTIVATED)
                    ActivateReferral::run($employee);
                }
            }

            return $personalWorkspace;
        });
    }

    /**
     * FR-013: Find the workspace owner with the earliest pivot created_at.
     */
    private function resolveWorkspaceOwner(Workspace $workspace): ?User
    {
        return $workspace->users()
            ->wherePivot('role', 'owner')
            ->orderBy('workspace_user.created_at', 'asc')
            ->first();
    }
}
```

**Key decisions**:
- Uses existing `CreateWorkspace::run()` which handles CoA seeding (PersonalCoA for `entity_type: 'personal'`), AI config, bank feed rules, inbox address, and accounting periods.
- Resolves the earliest workspace owner for referral attribution (FR-013).
- Calls `GenerateReferralCode` (idempotent -- returns existing if active), `TrackReferralSignup`, and `ActivateReferral` from 065-VGR.
- Stores `source: 'employee_portal'` in the referral's `metadata` JSON (FR-014).
- Guards against duplicate personal workspaces (FR-016).
- Wraps in `DB::transaction` for atomicity.

**Dependencies**: T03 (employee model with user_id), existing 065-VGR referral actions, `CreateWorkspace` action

---

### T16 -- Add createPersonalWorkspace endpoint to EmployeePortalController

**File**: `app/Http/Controllers/Api/EmployeePortalController.php`
**Action**: Modify existing file (add method)
**FR**: FR-012, FR-013, FR-014, FR-015

```php
/**
 * Create a personal workspace for the employee (viral CTA).
 *
 * FR-012-015: Creates workspace, attributes referral to employer, activates referral.
 */
public function createPersonalWorkspace(Request $request): JsonResponse
{
    $user = $request->user();
    $workspace = $request->attributes->get('workspace');

    $personalWorkspace = CreateEmployeePersonalWorkspace::run($user, $workspace);

    return response()->json([
        'workspace_id' => $personalWorkspace->id,
        'workspace_name' => $personalWorkspace->name,
        'workspace_slug' => $personalWorkspace->slug,
    ], 201);
}
```

**Note**: The `DomainException` thrown when the employee already has a personal workspace is caught by the global exception handler in `bootstrap/app.php` (which renders `DomainException` as 422 JSON).

**Dependencies**: T15 (CreateEmployeePersonalWorkspace action), T12 (route already registered)

---

### T17 -- Add portalCounts endpoint to PayrollController

**File**: `app/Http/Controllers/Api/PayrollController.php`
**Action**: Modify existing file (add method)
**FR**: FR-018

```php
/**
 * Portal status counts for the employer dashboard.
 */
public function portalCounts(Request $request): JsonResponse
{
    Gate::authorize('viewAny', Employee::class);

    $workspaceId = $request->input('workspace_id');

    $counts = Employee::where('workspace_id', $workspaceId)
        ->where('status', EmployeeStatus::Active)
        ->selectRaw("portal_status, count(*) as count")
        ->groupBy('portal_status')
        ->pluck('count', 'portal_status');

    return response()->json([
        'not_invited' => $counts['not_invited'] ?? 0,
        'invited' => $counts['invited'] ?? 0,
        'active' => $counts['active'] ?? 0,
        'revoked' => $counts['revoked'] ?? 0,
    ]);
}
```

**Note**: Only counts active employees (not terminated). Uses the composite index `idx_employees_portal_status` (workspace_id, portal_status) for efficient grouping.

**Dependencies**: T02 (PortalStatus enum)

---

### T18 -- Extend payrollDashboard with portal adoption metrics

**File**: `app/Http/Controllers/Api/PayrollController.php`
**Action**: Modify existing `payrollDashboard` method
**FR**: FR-020

Add to the existing `payrollDashboard` method, after the `$superLiability` query:

```php
// Portal adoption metrics
$portalActive = Employee::where('workspace_id', $workspaceId)
    ->where('status', EmployeeStatus::Active)
    ->where('portal_status', PortalStatus::Active)
    ->count();

$portalInvited = Employee::where('workspace_id', $workspaceId)
    ->where('status', EmployeeStatus::Active)
    ->where('portal_status', PortalStatus::Invited)
    ->count();

$portalEligible = Employee::where('workspace_id', $workspaceId)
    ->where('status', EmployeeStatus::Active)
    ->whereNotNull('email')
    ->count();
```

Add to the response JSON array:

```php
'portal_active_count' => $portalActive,
'portal_invited_count' => $portalInvited,
'portal_total_eligible' => $portalEligible,
```

**Import**: Add `use App\Enums\PortalStatus;` at the top of the controller.

**Dependencies**: T02 (PortalStatus enum)

---

### T19 -- Add bulkInviteToPortal endpoint

**File**: `app/Http/Controllers/Api/PayrollController.php`
**Action**: Modify existing file (add method)
**FR**: FR-019

```php
/**
 * Bulk-invite selected employees to the portal.
 */
public function bulkInviteToPortal(Request $request): JsonResponse
{
    Gate::authorize('update', Employee::class);

    $request->validate([
        'employee_ids' => 'required|array|min:1|max:100',
        'employee_ids.*' => 'integer',
    ]);

    $workspaceId = $request->input('workspace_id');
    $employeeIds = $request->input('employee_ids');

    $employees = Employee::where('workspace_id', $workspaceId)
        ->whereIn('id', $employeeIds)
        ->where('status', EmployeeStatus::Active)
        ->get();

    $invited = 0;
    $skippedNoEmail = 0;
    $skippedAlreadyInvited = 0;
    $errors = [];

    foreach ($employees as $employee) {
        if (! $employee->email) {
            $skippedNoEmail++;
            continue;
        }

        if (in_array($employee->portal_status, [PortalStatus::Active, PortalStatus::Invited], true)) {
            $skippedAlreadyInvited++;
            continue;
        }

        try {
            InviteEmployeeToPortal::run($employee, $request->user()->id);
            $invited++;
        } catch (\DomainException $e) {
            $errors[] = "{$employee->full_name}: {$e->getMessage()}";
        }
    }

    return response()->json([
        'invited' => $invited,
        'skipped_no_email' => $skippedNoEmail,
        'skipped_already_invited' => $skippedAlreadyInvited,
        'errors' => $errors,
    ]);
}
```

**Dependencies**: T07 (InviteEmployeeToPortal action)

---

### T20 -- Sprint 3 Tests

**File**: `tests/Feature/Api/EmployeePortalTest.php`
**Action**: Extend test file from T14
**FR**: FR-012-FR-020

**Test cases**:

```
CreateEmployeePersonalWorkspace Action
- it creates a personal workspace with entity_type personal
- it names the workspace "[First Name]'s Personal Finances"
- it seeds the personal chart of accounts template
- it generates a referral code for the workspace owner
- it calls TrackReferralSignup with source employee_portal in metadata
- it calls ActivateReferral transitioning to ACTIVATED
- it attributes referral to the earliest workspace owner (by pivot created_at)
- it throws DomainException if employee already has a personal workspace

Portal Endpoint -- Create Personal Workspace
- POST /portal/create-personal-workspace creates workspace and returns 201
- POST /portal/create-personal-workspace returns 422 if personal workspace already exists

Portal Endpoint -- Personal Workspace Status
- GET /portal/personal-workspace-status returns false when no personal workspace
- GET /portal/personal-workspace-status returns true with details when personal workspace exists

Employer Portal Management -- Portal Counts
- GET /employees/portal-counts returns grouped counts by portal_status
- GET /employees/portal-counts only counts active employees

Employer Dashboard Extension
- GET /payroll/dashboard includes portal_active_count, portal_invited_count, portal_total_eligible

Bulk Invite
- POST /employees/bulk-invite invites eligible employees and skips those without email
- POST /employees/bulk-invite skips already-invited employees
- POST /employees/bulk-invite returns correct counts in response
- POST /employees/bulk-invite validates employee_ids is required array

Authorization
- it denies bookkeeper from inviting employees to portal (requires employee.update)
- it denies client from accessing portal management endpoints
- it allows accountant to invite employees to portal
```

**Dependencies**: T15-T19 (all Sprint 3 tasks)

---

## Summary: Files Created and Modified

### New Files (10)

| File | Task | Description |
|------|------|-------------|
| `database/migrations/2026_04_02_000001_add_portal_columns_to_employees_table.php` | T01 | Migration: user_id, portal_status, portal_invited_at |
| `app/Enums/PortalStatus.php` | T02 | Enum: not_invited, invited, active, revoked |
| `app/Http/Middleware/EnsureEmployeePortalAccess.php` | T05 | Portal access middleware |
| `app/Actions/Payroll/InviteEmployeeToPortal.php` | T07 | Invitation action (link or invite) |
| `app/Http/Resources/Payroll/PayslipResource.php` | T09 | Employee-facing payslip (whitelist, no TFN) |
| `app/Http/Resources/Payroll/YearToDateSummaryResource.php` | T10 | YTD summary resource |
| `app/Http/Controllers/Api/EmployeePortalController.php` | T11 | Portal controller (payslips, summary, CTA) |
| `app/Actions/Payroll/CreateEmployeePersonalWorkspace.php` | T15 | Viral loop: workspace + referral attribution |
| `tests/Feature/Api/EmployeePortalTest.php` | T06/T14/T20 | All portal tests (~50 test cases) |

### Modified Files (7)

| File | Task | Change |
|------|------|--------|
| `app/Models/Tenant/Employee.php` | T03 | Add user_id, portal_status, portal_invited_at to fillable/casts; add user() relationship, portal scopes |
| `database/seeders/RolesAndPermissionsSeeder.php` | T04 | Add employee role with payslip.view-own, portal.access permissions |
| `bootstrap/app.php` | T05 | Register `employee_portal` middleware alias |
| `app/Actions/Workspace/AcceptInvitation.php` | T07 | After accept, link employee.user_id if role is 'employee' |
| `app/Http/Controllers/Api/PayrollController.php` | T08/T17/T18/T19 | Add inviteToPortal, resendInvitation, portalCounts, bulkInviteToPortal; extend payrollDashboard |
| `app/Http/Resources/Payroll/EmployeeResource.php` | T13 | Add portal_status, portal_status_label, portal_invited_at, user_id |
| `routes/api.php` | T12 | Add portal route group + employer portal management routes |

---

## Parallelism Guide

```
Sprint 1 (can all start in parallel):
  T01 (migration)         ─┐
  T02 (enum)              ─┤─→ T03 (model, needs T01+T02) ─→ T05 (middleware, needs T04)
  T04 (seeder)            ─┘                                    │
                                                                ↓
                                                           T06 (tests)

Sprint 2:
  T09 (PayslipResource)          ─┐
  T10 (YTD Resource)              ─┤─→ T11 (controller, needs T05+T09+T10) ─→ T12 (routes)
  T07 (invite action, needs T03)  ─┤─→ T08 (employer endpoints, needs T07)  ─┘
  T13 (EmployeeResource, needs T02)┘
                                                                              ↓
                                                                         T14 (tests)

Sprint 3:
  T15 (personal workspace, needs T03) ─→ T16 (endpoint, needs T15+T12)
  T17 (portalCounts, needs T02)       ─┐
  T18 (dashboard ext, needs T02)       ─┤─→ T20 (tests)
  T19 (bulk invite, needs T07)         ─┘
```
