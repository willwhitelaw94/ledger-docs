---
title: "Feature Specification: Employee Portal & Viral Acquisition Loop"
---

# Feature Specification: Employee Portal & Viral Acquisition Loop

**Feature Branch**: `064-PAY-employee-portal`
**Created**: 2026-04-01
**Status**: Draft
**Epic**: 064-PAY (extension), bridging 065-VGR and 030-PLG
**Initiative**: FL -- Financial Ledger Platform
**Effort**: L (5-6 sprints across 2 phases)
**Depends On**: 064-PAY Phase 1 (complete -- employee records, pay runs, finalisation), 065-VGR (complete -- referral codes, tracking, activation, rewards), 030-PLG (complete -- personal ledger, assets, debts, net worth)

---

## Overview

When a business runs payroll in MoneyQuest, every employee on the payroll is a potential MoneyQuest user who does not yet have an account. Today, employees have no visibility into their own pay data -- they receive no payslips and must ask their employer for pay details. The employer has no mechanism to share this information digitally, and no incentive to bring their employees onto the platform.

This spec bridges three existing epics into a single acquisition funnel:

1. **064-PAY (Payroll)** -- employees already exist as records with email addresses, pay history, and leave balances.
2. **065-VGR (Viral Growth)** -- referral codes, attribution tracking, and reward mechanics are fully built.
3. **030-PLG (Personal Ledger)** -- a complete personal finance workspace (assets, debts, net worth) is ready for individual users.

The employee portal connects these three systems. An employer invites an employee to view their payslips online. The invitation creates (or links to) a MoneyQuest user account. Once logged in, the employee sees their pay history in a read-only view. A persistent call-to-action invites them to "Start your own books -- free", which creates a personal workspace on the free tier with the employer's referral code auto-applied. The employer earns a referral reward, and MoneyQuest gains a new user who entered through the payroll door rather than traditional marketing.

**Why now**: Phase 1 of 064-PAY is complete -- employee records, pay runs, PAYG, super, and journal entry posting are all working. Phase 2 (pay slips, leave management) is the natural moment to add the employee-facing portal because pay slips are the value proposition that makes the invitation compelling. The viral growth engine (065-VGR) and personal ledger (030-PLG) are both complete, meaning the entire funnel from invitation to personal workspace already has backend support.

### Out of Scope

- **Leave requests via portal** -- employees can view leave balances but cannot submit leave requests through the portal in this phase
- **Document upload or signing** -- no employee onboarding document collection (TFN declaration, super choice) via the portal
- **Push notifications** -- email notifications only for v1; push notifications (web or mobile) are deferred
- **Payslip PDF generation** -- employees can view payslip data on screen; downloadable PDF payslips are a Phase 2 enhancement
- **Employee profile editing** -- employees cannot update their own details (address, bank, super) through the portal; changes must go through the employer
- **Multi-employer payslip aggregation** -- if an employee works for two MoneyQuest businesses, they see each workspace's payslips separately, not in a combined view
- **Award/EBA information display** -- no award classification or entitlement information is shown (consistent with 064-PAY Phase 1 scope)

---

## User Scenarios & Testing

### User Story 1 -- Invite Employee to Portal (Priority: P1)

A business owner has set up employees in payroll and wants to give them online access to their payslips. Today, the employee record exists with an email address, but there is no link to a MoneyQuest user account. The employer needs a simple way to send an invitation that either creates a new account or links to an existing one.

**Why this priority**: The invitation is the entry point for the entire funnel. Without it, employees cannot access the portal, payslips remain invisible, and the viral loop has no trigger. Every other story in this spec depends on the employee being linked to a user account.

**Independent Test**: Can be tested by clicking "Invite to Portal" on an employee record, verifying an invitation email is sent, and confirming the employee record is updated with a portal status.

**Acceptance Scenarios**:

1. **Given** a business owner views an active employee's detail page, **When** the employee has an email address and has not been invited, **Then** they see an "Invite to Portal" button.

2. **Given** a business owner clicks "Invite to Portal" for an employee, **When** a MoneyQuest user with that email already exists, **Then** the system links the employee record to the existing user (`employee.user_id = user.id`), adds the user to the workspace with the `employee` role, and sends a notification email saying "You've been added to [Workspace Name]'s employee portal."

3. **Given** a business owner clicks "Invite to Portal" for an employee, **When** no MoneyQuest user with that email exists, **Then** the system creates a `WorkspaceInvitation` record with `role: 'employee'`, sends an invitation email with a magic link, and updates the employee's `portal_status` to `invited`.

4. **Given** an employee has received an invitation email, **When** they click the magic link and complete registration (or log in if they already have an account), **Then** the `AcceptInvitation` flow runs, the employee record's `user_id` is set, and their `portal_status` updates to `active`.

5. **Given** a business owner tries to invite an employee who has no email address on file, **When** they click "Invite to Portal", **Then** the button is disabled with a tooltip: "Add an email address to this employee before inviting them."

6. **Given** a business owner has already invited an employee who has not yet accepted, **When** they view the employee detail page, **Then** they see "Invitation Pending" status with a "Resend Invitation" link and the date the invitation was last sent.

7. **Given** a business owner invites an employee, **When** the employee already has a MoneyQuest account and is already a member of this workspace (e.g., as a bookkeeper), **Then** the system does not create a duplicate workspace membership -- it links `employee.user_id` to the existing user and displays a message: "[Name] is already a member of this workspace. Their employee record has been linked to their account."

**Linked Functional Requirements**: FR-001, FR-002, FR-003, FR-004, FR-005

---

### User Story 2 -- Employee Views Payslips (Priority: P1)

An employee who has accepted their portal invitation wants to see their pay history. They need to see how much they were paid, how much tax was withheld, their super contribution, and their net pay -- for every finalised pay run they were included in.

**Why this priority**: The payslip view is the core value proposition that justifies the portal invitation. If the employee sees nothing useful after accepting, the portal is dead on arrival and the viral loop never activates. This is the "aha moment" that makes them think "MoneyQuest knows my financial life."

**Independent Test**: Can be tested by logging in as an invited employee and verifying payslip data appears for all finalised pay runs, and that no other workspace data is visible.

**Acceptance Scenarios**:

1. **Given** an employee logs into MoneyQuest and selects a workspace where they have the `employee` role, **When** the portal dashboard loads, **Then** they see a list of their payslips ordered by payment date (most recent first), each showing: pay period (start-end dates), payment date, gross pay, PAYG withheld, super guarantee, and net pay.

2. **Given** an employee views their payslip list, **When** they click on a specific payslip, **Then** they see a detailed breakdown: ordinary hours worked, overtime hours, hourly rate or salary amount, gross pay, PAYG withheld, HELP repayment (if applicable), superannuation guarantee, net pay, leave accrued (annual and personal), and leave taken in that period.

3. **Given** an employee's payslip detail view is open, **When** the payslip data loads, **Then** all monetary amounts are displayed formatted as dollars and cents (not raw cents), and the employee's name and pay period are shown in a header.

4. **Given** an employee has the `employee` role in a workspace, **When** they attempt to navigate to any other workspace page (dashboard, invoices, contacts, chart of accounts, journal entries, banking, settings), **Then** they are redirected to the employee portal with a message: "You have employee portal access to this workspace."

5. **Given** a pay run has not been finalised (status is `draft`), **When** an employee views their payslip list, **Then** the draft pay run's data does not appear -- only finalised pay runs are visible.

6. **Given** an employee has been included in pay runs across multiple pay periods, **When** they view their payslip list, **Then** they also see a year-to-date summary at the top: total gross, total PAYG, total super, total net, and current leave balances (annual and personal).

7. **Given** an employee views their payslip, **When** the data is rendered, **Then** the employee's TFN is never displayed anywhere in the portal (not even masked). Tax scale is shown but TFN is excluded from the API response entirely.

**Linked Functional Requirements**: FR-006, FR-007, FR-008, FR-009, FR-010, FR-011

---

### User Story 3 -- Employee Creates Personal Workspace (Priority: P1)

An employee who has been viewing their payslips sees a persistent CTA inviting them to start managing their own finances. One click creates a free personal workspace, and the employer's referral code is automatically applied -- crediting the employer with a successful referral.

**Why this priority**: This is the viral loop itself -- the bridge from "employee of a business" to "individual MoneyQuest user." Every employee who creates a personal workspace is a new user acquired at zero marketing cost, and the employer referral reward creates a positive feedback loop encouraging more invitations.

**Independent Test**: Can be tested by logging in as a portal employee, clicking the CTA, and verifying a personal workspace is created on the free tier with the employer's referral code applied.

**Acceptance Scenarios**:

1. **Given** an employee is viewing the employee portal (payslip list or payslip detail), **When** the page renders, **Then** a persistent CTA banner is displayed: "Start your own books -- free. Track your personal finances, assets, and net worth." with a prominent action button.

2. **Given** an employee clicks the "Start your own books" CTA, **When** the employee does not already have a personal workspace, **Then** the system creates a new workspace with `entity_type: 'personal'` on the `starter` plan tier, names it "[First Name]'s Personal Finances", and redirects the employee to the personal ledger onboarding flow.

3. **Given** the system creates a personal workspace for an employee, **When** the workspace is being set up, **Then** the employer's workspace owner is identified, a referral code is generated for them if they don't have one (via `GenerateReferralCode`), and a referral is tracked (via `TrackReferralSignup`) with `source: 'employee_portal'` recorded in the referral metadata.

4. **Given** the referral has been tracked as `SIGNED_UP`, **When** the personal workspace creation completes, **Then** `ActivateReferral` fires (transitioning the referral to `ACTIVATED`) because the referee now has a workspace. The qualification and reward flow proceeds via the existing 065-VGR pipeline.

5. **Given** an employee already has one or more personal workspaces, **When** they view the employee portal, **Then** the CTA changes to: "Go to your personal books" with a link to their existing personal workspace, rather than offering to create a new one.

6. **Given** the employer's workspace owner is identified for referral attribution, **When** multiple users have the `owner` role on the workspace, **Then** the system attributes the referral to the user who originally created the workspace (the user with the earliest `workspace_user.created_at`).

7. **Given** an employee clicks the CTA and the personal workspace is created, **When** the employee is redirected to the personal ledger, **Then** the new workspace has the `personal` chart of accounts template seeded, and the 030-PLG personal ledger features are enabled (personal assets, personal debts, net worth tracker).

**Linked Functional Requirements**: FR-012, FR-013, FR-014, FR-015, FR-016

---

### User Story 4 -- Employer Views Employee Portal Status (Priority: P2)

A business owner wants to see which of their employees have been invited to the portal, who has accepted, and who has gone on to create their own MoneyQuest account. This gives them visibility into adoption and lets them re-engage employees who haven't accepted.

**Why this priority**: Without status visibility, employers operate blind -- they don't know who to nudge, who is active, or how effective the portal is. This is the employer-side feedback loop that sustains the invitation behaviour. It is P2 because the core portal works without it, but adoption tracking makes it sticky.

**Independent Test**: Can be tested by viewing the employee list with a mix of invited, active, and non-invited employees, and verifying correct status badges and counts.

**Acceptance Scenarios**:

1. **Given** a business owner views the employee list, **When** the list renders, **Then** each employee row displays a portal status badge: "Not Invited" (grey), "Invited" (amber), "Active" (green), or "Has Own Workspace" (teal).

2. **Given** an employee has `portal_status: 'active'` and their linked user has at least one personal workspace (entity_type `personal`), **When** the employee list renders, **Then** their portal status shows "Has Own Workspace" (indicating full viral loop completion).

3. **Given** a business owner views the payroll dashboard, **When** the dashboard loads, **Then** they see a portal adoption widget: "X of Y employees on MoneyQuest" with a breakdown: [N] active, [N] invited (pending), [N] not invited.

4. **Given** a business owner views an employee with "Invited" status, **When** they click on the employee, **Then** they see when the invitation was sent, and a "Resend Invitation" action.

5. **Given** a business owner wants to bulk-invite employees, **When** they select multiple employees from the employee list and click "Invite Selected to Portal", **Then** invitations are sent to all selected employees who have email addresses and have not been invited. Employees without email addresses are skipped with a count: "Skipped [N] employees without email addresses."

**Linked Functional Requirements**: FR-017, FR-018, FR-019, FR-020

---

### User Story 5 -- Payslip Auto-Publish on Finalisation (Priority: P2)

When a pay run is finalised, employees who have active portal access should automatically see the new payslip in their portal. Optionally, they receive an email notification that their payslip is ready.

**Why this priority**: Without auto-publish, the employer would need to manually trigger payslip visibility after each pay run. Since the payslip data comes from finalised pay run lines that already exist, auto-publish is the natural completion of the finalisation flow. The email notification drives re-engagement and keeps the portal top-of-mind.

**Independent Test**: Can be tested by finalising a pay run containing employees with active portal access, and verifying the payslip appears in their portal view and an email notification is sent.

**Acceptance Scenarios**:

1. **Given** a pay run is finalised and contains lines for employees with `portal_status: 'active'`, **When** finalisation completes, **Then** the payslip data is immediately available in each employee's portal view (no additional action required from the employer -- the payslip list queries finalised `PayRunLine` records directly).

2. **Given** a pay run is finalised and the workspace has email notifications enabled for payslips, **When** finalisation completes, **Then** each employee with `portal_status: 'active'` receives an email: "Your payslip for [period_start] to [period_end] is ready. Log in to view it." with a direct link to the portal.

3. **Given** a pay run is finalised but an employee has `portal_status: 'invited'` (not yet accepted), **When** finalisation completes, **Then** no email notification is sent to that employee, and the payslip data will appear retroactively once they accept the invitation and access the portal.

4. **Given** the employer has payslip email notifications disabled in workspace settings, **When** a pay run is finalised, **Then** no payslip notification emails are sent, but the payslip data is still available in the portal.

5. **Given** an employee has portal access and a new pay run is finalised, **When** they next log in to the portal, **Then** the new payslip appears at the top of their list with a "New" badge that disappears after they view the detail.

**Linked Functional Requirements**: FR-021, FR-022, FR-023

---

### User Story 6 -- Revoke Employee Portal Access (Priority: P2)

An employer needs to revoke portal access when an employee is terminated or when access should be removed for any reason. Revoking access should be immediate and should not delete any historical data.

**Why this priority**: This is a security requirement. Without revocation, terminated employees retain indefinite access to the employer's workspace. It is P2 because it is a governance control rather than a core-flow feature, but it is essential before any production use.

**Independent Test**: Can be tested by revoking an active employee's portal access and verifying they can no longer access the workspace's employee portal.

**Acceptance Scenarios**:

1. **Given** a business owner views an employee with `portal_status: 'active'`, **When** they click "Revoke Portal Access", **Then** the employee's `portal_status` changes to `revoked`, the user is removed from the workspace's `workspace_user` pivot (for the `employee` role only -- if they hold another role, that role is preserved), and the employee can no longer access the portal.

2. **Given** an employee has portal access and also holds another workspace role (e.g., they are a bookkeeper who is also on the payroll), **When** the employer revokes portal access, **Then** only the employee-specific portal access is removed. The user retains their other workspace role and can still access the workspace normally through that role.

3. **Given** an employee's portal access has been revoked, **When** the employee tries to access the portal URL for that workspace, **Then** they see a message: "Your portal access to [Workspace Name] has been removed. Contact your employer for more information."

4. **Given** an employee is terminated (via the existing termination flow in 064-PAY), **When** the termination is processed, **Then** the system automatically sets `portal_status` to `revoked` and displays a confirmation: "Employee terminated. Portal access has been revoked."

5. **Given** a business owner has revoked an employee's portal access, **When** they view the employee's record, **Then** they see a "Reinstate Portal Access" button that re-links the employee and restores their `employee` role without requiring a new invitation.

**Linked Functional Requirements**: FR-024, FR-025, FR-026, FR-027

---

## Functional Requirements

### Employee-User Linking

**FR-001** -- The `employees` table must have a nullable `user_id` foreign key column referencing `users.id`. One user can be linked to employee records in multiple workspaces, but each employee record links to at most one user.

**FR-002** -- The `employees` table must have a `portal_status` column (string, enum-backed) with values: `not_invited`, `invited`, `active`, `revoked`. Default: `not_invited`.

**FR-003** -- The `employees` table must have a `portal_invited_at` timestamp column (nullable) recording when the invitation was last sent.

**FR-004** -- When an employee is invited and a user with the matching email already exists, the system must link `employee.user_id` immediately (without requiring invitation acceptance) and add the user to the workspace with the `employee` role.

**FR-005** -- When an employee is invited and no matching user exists, the system must create a `WorkspaceInvitation` record with `role: 'employee'` and a 7-day expiry, following the existing invitation pattern in `AcceptInvitation`.

### Employee Portal Access

**FR-006** -- A new `employee` role must be added to `RolesAndPermissionsSeeder` with exactly two permissions: `payslip.view-own` and `portal.access`.

**FR-007** -- The `payslip.view-own` permission must restrict API responses to only the authenticated user's own `PayRunLine` records. The API must filter by `employee.user_id = auth()->id()` -- never by a user-supplied employee ID.

**FR-008** -- The `portal.access` permission must be checked by a route middleware group that wraps all employee portal routes. This middleware must also verify that `employee.portal_status = 'active'` for the current workspace.

**FR-009** -- The employee portal API must never return the employee's TFN in any form (not even masked). The `PayslipResource` (new) must explicitly exclude `tax_file_number`. Other sensitive employer data (bank BSB, account number) must also be excluded from the employee-facing resource.

**FR-010** -- The employee portal must return payslip data only from pay runs with `status: 'finalised'`. Draft pay run lines must never be visible to employees.

**FR-011** -- The year-to-date summary must be calculated server-side by aggregating all `PayRunLine` records for the employee in the current financial year (based on the workspace's `fiscal_year_start_month`).

### Viral Loop Integration

**FR-012** -- When an employee clicks "Start your own books", the system must create a workspace with `entity_type: 'personal'` and associate it with the employee's user account as `owner`.

**FR-013** -- The system must identify the employer's workspace owner (the user with the earliest `workspace_user.created_at` where `role = 'owner'`) and generate a referral code for them via `GenerateReferralCode` if they don't have an active one.

**FR-014** -- The system must call `TrackReferralSignup` with the employee's user and the employer's referral code, recording `source: 'employee_portal'` in the referral's metadata JSON.

**FR-015** -- The system must call `ActivateReferral` after the personal workspace is created, transitioning the referral from `SIGNED_UP` to `ACTIVATED`. The existing `QualifyReferral` and `GrantReferralReward` pipeline (065-VGR) handles subsequent steps.

**FR-016** -- If the employee already has a personal workspace (any workspace with `entity_type: 'personal'` where they are the owner), the CTA must link to the existing workspace instead of offering to create a new one. No duplicate personal workspaces are created.

### Employer Dashboard

**FR-017** -- The `employeeIndex` endpoint must include `portal_status` in the `EmployeeResource` response.

**FR-018** -- A new `portalCounts` endpoint must return counts grouped by `portal_status`: `{ not_invited: N, invited: N, active: N, revoked: N }`.

**FR-019** -- A new `bulkInvite` endpoint must accept an array of employee IDs, validate each has an email address, and send invitations to all eligible employees in a single request. The response must report: `{ invited: N, skipped_no_email: N, skipped_already_invited: N }`.

**FR-020** -- The `payrollDashboard` endpoint must be extended to include portal adoption metrics: `portal_active_count`, `portal_invited_count`, `portal_total_eligible` (employees with email addresses).

### Payslip Notifications

**FR-021** -- The `FinalisePayRun` action must dispatch a `PayslipAvailable` event for each employee line where the employee has `portal_status: 'active'`.

**FR-022** -- A `SendPayslipNotification` listener must handle `PayslipAvailable` events and send an email via the existing email infrastructure (023-EML). The email must contain: employee name, pay period dates, net pay amount, and a login link to the portal.

**FR-023** -- Payslip email notifications must be toggleable via a workspace setting: `payslip_notifications_enabled` (boolean, default: `true`), stored in the existing `Workspace.invoice_settings` JSON column (renamed conceptually to `notification_settings` or added as a new key).

### Access Revocation

**FR-024** -- A `revokePortalAccess` endpoint must set `employee.portal_status` to `revoked`, remove the `employee` role from the user's workspace permissions (via `PermissionService`), and detach the user from `workspace_user` only if they have no other role on the workspace.

**FR-025** -- If the user holds multiple roles on the workspace (e.g., `bookkeeper` and `employee`), revoking portal access must remove only the `employee` role. The user must retain all other workspace access.

**FR-026** -- When an employee is terminated via `UpdateEmployee` (setting `status: terminated`), the system must automatically revoke portal access by setting `portal_status` to `revoked`.

**FR-027** -- A `reinstatePortalAccess` endpoint must set `employee.portal_status` to `active`, re-add the `employee` role via `PermissionService`, and ensure the user is in `workspace_user` with the `employee` role.

---

## Data Model Changes

### Migration 1: Add portal columns to employees table

```
alter table employees:
  add column user_id        bigint unsigned nullable references users(id) on delete set null
  add column portal_status  varchar default 'not_invited'
  add column portal_invited_at  timestamp nullable

  add index idx_employees_user_id (user_id)
  add index idx_employees_portal_status (workspace_id, portal_status)
```

### Migration 2: Add payslip notification setting

```
-- No new table needed. Add 'payslip_notifications_enabled' key to workspace settings.
-- This can be stored in the existing branding/invoice_settings JSON column or a new
-- workspace_settings JSON column if one is created for general workspace preferences.
```

### New Enum: PortalStatus

```
app/Enums/PortalStatus.php

  NotInvited = 'not_invited'
  Invited = 'invited'
  Active = 'active'
  Revoked = 'revoked'
```

### New Role: employee

Added to `RolesAndPermissionsSeeder`:

```
'employee' => [
    'payslip.view-own',
    'portal.access',
]
```

This is the 7th workspace role. It is intentionally minimal -- employees see nothing except their own payslips.

---

## API Endpoints

### Employee Portal Routes (employee-facing)

All routes are prefixed with `/api/v1/` and require authentication + `SetWorkspaceContext` middleware + `employee` role middleware.

| Method | Route | Action | Description |
|--------|-------|--------|-------------|
| GET | `portal/payslips` | `EmployeePortalController@payslipIndex` | List all payslips for the authenticated employee (finalised only) |
| GET | `portal/payslips/{payRunId}` | `EmployeePortalController@payslipShow` | Detailed payslip for a specific pay run |
| GET | `portal/summary` | `EmployeePortalController@yearToDateSummary` | Year-to-date earnings summary and leave balances |
| POST | `portal/create-personal-workspace` | `EmployeePortalController@createPersonalWorkspace` | Create a personal workspace (viral CTA) |
| GET | `portal/personal-workspace-status` | `EmployeePortalController@personalWorkspaceStatus` | Check if employee already has a personal workspace |

### Employer Management Routes (employer-facing)

Added to existing payroll route group (requires `feature:payroll` middleware).

| Method | Route | Action | Description |
|--------|-------|--------|-------------|
| POST | `employees/{id}/invite-portal` | `PayrollController@inviteToPortal` | Send portal invitation to employee |
| POST | `employees/{id}/resend-invitation` | `PayrollController@resendInvitation` | Resend pending invitation |
| POST | `employees/{id}/revoke-portal` | `PayrollController@revokePortalAccess` | Revoke employee portal access |
| POST | `employees/{id}/reinstate-portal` | `PayrollController@reinstatePortalAccess` | Reinstate revoked portal access |
| POST | `employees/bulk-invite` | `PayrollController@bulkInviteToPortal` | Bulk-invite selected employees |
| GET | `employees/portal-counts` | `PayrollController@portalCounts` | Portal status counts |

---

## Actions (Business Logic)

### New Actions

| Action | Location | Description |
|--------|----------|-------------|
| `InviteEmployeeToPortal` | `app/Actions/Payroll/InviteEmployeeToPortal.php` | Links existing user or creates invitation. Sets `portal_status`, dispatches email. |
| `RevokeEmployeePortalAccess` | `app/Actions/Payroll/RevokeEmployeePortalAccess.php` | Sets `portal_status: revoked`, removes `employee` role, conditionally detaches from workspace. |
| `ReinstateEmployeePortalAccess` | `app/Actions/Payroll/ReinstateEmployeePortalAccess.php` | Sets `portal_status: active`, re-adds `employee` role. |
| `CreateEmployeePersonalWorkspace` | `app/Actions/Payroll/CreateEmployeePersonalWorkspace.php` | Creates personal workspace, seeds PLG accounts, attributes referral to employer, calls `TrackReferralSignup` + `ActivateReferral`. |

### Modified Actions

| Action | Change |
|--------|--------|
| `FinalisePayRun` | After finalisation, dispatch `PayslipAvailable` event for each employee line where `employee.portal_status = 'active'`. |
| `UpdateEmployee` | When `status` is set to `terminated`, automatically call `RevokeEmployeePortalAccess` if `portal_status` is `active` or `invited`. |

---

## Authorization

### The `employee` Role

The `employee` role is fundamentally different from the existing 6 roles. It grants access to a single, isolated surface (the employee portal) with no visibility into business data.

**Permission boundaries**:

| Permission | What It Grants |
|------------|---------------|
| `payslip.view-own` | Read-only access to the authenticated user's own `PayRunLine` records from finalised pay runs |
| `portal.access` | Grants access to the `/portal/*` route group |

**What employees cannot do**:
- View the main dashboard, chart of accounts, journal entries, invoices, bills, contacts, banking, reports, settings, or any other workspace feature
- View other employees' payslips or any aggregate payroll data
- Modify any data (the portal is entirely read-only for employees)
- Access the workspace if their `portal_status` is not `active`

**Middleware chain for portal routes**:
1. `auth:sanctum` -- must be authenticated
2. `SetWorkspaceContext` -- validates workspace access via `X-Workspace-Id`
3. `EnsureEmployeePortalAccess` (new middleware) -- confirms the user is a linked employee with `portal_status: 'active'` in this workspace

### Co-existence with Other Roles

An employee may hold another role on the same workspace (e.g., a bookkeeper who is also on the payroll). In this case:
- They have both the `bookkeeper` and `employee` roles
- They see the full workspace through their `bookkeeper` role
- The employee portal is an additional view available to them
- Revoking portal access removes only the `employee` role; other roles are untouched

---

## Viral Integration (065-VGR Connection)

### Referral Attribution Flow

```
Employer finalises pay run
  --> Employee receives payslip notification email
    --> Employee logs into portal
      --> Employee clicks "Start your own books -- free"
        --> CreateEmployeePersonalWorkspace:
          1. Identify employer workspace owner (earliest owner by pivot created_at)
          2. GenerateReferralCode for owner (idempotent -- returns existing if active)
          3. CreateWorkspace (entity_type: 'personal', plan_tier: 'starter')
          4. TrackReferralSignup (referee=employee, code=owner's code, metadata.source='employee_portal')
          5. ActivateReferral (referee=employee, transitions SIGNED_UP --> ACTIVATED)
          6. [Existing 065-VGR pipeline]: QualifyReferral (after 30 days) --> GrantReferralReward
```

### Referral Metadata

The `viral_referrals.metadata` JSON column records the acquisition source:

```json
{
  "source": "employee_portal",
  "employer_workspace_id": 42,
  "employer_workspace_name": "Smith Construction Pty Ltd",
  "invited_at": "2026-04-15T10:30:00Z"
}
```

This allows the referral dashboard (065-VGR) to distinguish employee-portal referrals from other channels (job share, personal link, direct).

### Reward Attribution

The referral reward goes to the **workspace owner** (not the bookkeeper or accountant who ran payroll). This is because:
- The workspace owner is the business decision-maker who chose MoneyQuest
- They are the most likely person to benefit from referral credits (plan discounts)
- It avoids complexity around "who in the business should get the reward"

---

## New Resources (API Response Shapes)

### PayslipResource (employee-facing)

```
{
  pay_run_id: int,
  period_start: "YYYY-MM-DD",
  period_end: "YYYY-MM-DD",
  payment_date: "YYYY-MM-DD",
  gross_pay: int (cents),
  ordinary_hours: float,
  overtime_hours: float,
  hourly_rate: int (cents),
  salary_amount: int (cents),
  payg_withheld: int (cents),
  super_guarantee: int (cents),
  help_repayment: int (cents),
  net_pay: int (cents),
  leave_annual_accrued: int (minutes),
  leave_personal_accrued: int (minutes),
  leave_annual_taken: int (minutes),
  leave_personal_taken: int (minutes),
  is_new: bool
}
```

**Explicitly excluded**: `tax_file_number`, `bank_bsb`, `bank_account_number`, `bank_account_name`, `tax_scale`, `tax_treatment_code`, employer financial data.

### YearToDateSummaryResource

```
{
  financial_year: "2025-26",
  total_gross: int (cents),
  total_payg: int (cents),
  total_super: int (cents),
  total_net: int (cents),
  total_help: int (cents),
  pay_count: int,
  leave_annual_balance: int (minutes),
  leave_personal_balance: int (minutes)
}
```

---

## Implementation Plan

### Phase 1 -- Portal Foundation (3 sprints)

**Sprint 1: Data model and employee role**
1. Migration: add `user_id`, `portal_status`, `portal_invited_at` to `employees` table
2. Create `PortalStatus` enum
3. Add `employee` role to `RolesAndPermissionsSeeder` with `payslip.view-own`, `portal.access`
4. Create `EnsureEmployeePortalAccess` middleware
5. Tests: role seeding, middleware access control, portal status enum

**Sprint 2: Invitation and portal API**
1. Create `InviteEmployeeToPortal` action (link existing user or create invitation)
2. Add employer endpoints: `invite-portal`, `resend-invitation`, `portal-counts`
3. Create `EmployeePortalController` with `payslipIndex`, `payslipShow`, `yearToDateSummary`
4. Create `PayslipResource` and `YearToDateSummaryResource`
5. Tests: invitation flow (existing user, new user), payslip queries, TFN exclusion, data isolation

**Sprint 3: Viral loop and employer dashboard**
1. Create `CreateEmployeePersonalWorkspace` action (workspace creation + referral attribution)
2. Wire up `ActivateReferral` call after workspace creation
3. Add `portal/create-personal-workspace` and `portal/personal-workspace-status` endpoints
4. Extend `EmployeeResource` with `portal_status`
5. Extend `payrollDashboard` with portal adoption metrics
6. Tests: personal workspace creation, referral tracking with `employee_portal` source, dashboard metrics

### Phase 2 -- Notifications, Revocation, and Polish (2-3 sprints)

**Sprint 4: Notifications and auto-publish**
1. Create `PayslipAvailable` event
2. Create `SendPayslipNotification` listener
3. Modify `FinalisePayRun` to dispatch events for portal-active employees
4. Add workspace setting for payslip notification toggle
5. Tests: notification dispatch on finalisation, setting toggle, email content

**Sprint 5: Revocation and bulk operations**
1. Create `RevokeEmployeePortalAccess` action
2. Create `ReinstateEmployeePortalAccess` action
3. Modify `UpdateEmployee` to auto-revoke on termination
4. Add `bulkInviteToPortal` endpoint
5. Add `revoke-portal` and `reinstate-portal` endpoints
6. Tests: revocation (with and without other roles), termination auto-revoke, bulk invite, reinstatement

---

## Security Considerations

1. **TFN never exposed**: The `PayslipResource` must explicitly exclude `tax_file_number`. The employee model's encrypted TFN cast means the field exists in memory when the model is loaded, so the resource must use a whitelist approach (only include listed fields) rather than a blacklist.

2. **Data isolation**: The `EmployeePortalController` must always filter by `employee.user_id = auth()->id()`. The employee ID must never be accepted as a user-supplied parameter for payslip queries. This prevents one employee from viewing another's payslips.

3. **Workspace scoping**: The `EnsureEmployeePortalAccess` middleware must verify both workspace membership and `portal_status = 'active'`. A revoked employee must get a 403, not a 404.

4. **Invitation token security**: Portal invitations use the existing `WorkspaceInvitation` mechanism with cryptographically random tokens and 7-day expiry.

5. **Role escalation prevention**: The `employee` role must not be assignable via the normal workspace invitation flow or settings page. It can only be assigned through the `InviteEmployeeToPortal` action, which validates the employee record exists.

---

## Open Questions

1. **Should employees be able to download payslip PDFs in Phase 1?** The spec defers this to Phase 2, but if PDF generation is straightforward (e.g., a simple HTML-to-PDF render of the payslip detail view), it could be included in Phase 1 as a high-value addition.

2. **What plan tier should the personal workspace receive?** The spec says `starter` (which includes invoices, bills, contacts, bank feeds, AI assistant). An alternative is a new `personal` tier that includes 030-PLG features (assets, debts, net worth) but excludes business features. This depends on whether MoneyQuest wants to upsell employees to business use or keep them in the personal finance lane.

3. **Should the employer see which employees created personal workspaces?** The spec includes a "Has Own Workspace" status badge. This requires the system to check whether the linked user owns a personal workspace -- which crosses the central/tenant boundary. The alternative is to only show portal status (active/invited) and not expose personal workspace information to the employer.

4. **Should payslip notification emails include the net pay amount?** Including it makes the email immediately useful (the employee knows they were paid without logging in). Excluding it is more secure (email is not encrypted at rest). Recommendation: include it, as it mirrors standard payslip notification practice.

5. **What happens to portal access when an employee's status changes to `inactive` (not terminated)?** The spec auto-revokes on termination but is silent on the `inactive` status. Recommendation: `inactive` employees retain portal access (they may be on leave), only `terminated` triggers revocation.

6. **Should the employer be able to control which pay runs are visible to employees?** Currently, all finalised pay runs are visible. An alternative is an "unpublish" action per pay run if the employer realises they finalised incorrectly. This may conflict with the immutability principle.
