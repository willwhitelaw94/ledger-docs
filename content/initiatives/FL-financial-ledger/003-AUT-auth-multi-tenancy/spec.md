---
title: "Feature Specification: Auth & Multi-tenancy"
---

# Feature Specification: Auth & Multi-tenancy

**Epic**: 003-AUT
**Created**: 2026-03-01
**Status**: Draft
**Initiative**: FL — MoneyQuest Ledger
**Phase**: 1 (Sprints 1–4)
**Design Direction**: Super Modern

---

## Context

Auth & Multi-tenancy is the platform's identity and access layer. It handles user registration, MFA, organisation and workspace management, role-based access control with separation of duties, and tenant scoping. This epic works alongside the Core Ledger Engine (002-CLE) in Phase 1 — together they form the minimum viable platform.

### Architectural Context

- **Single-database multi-tenancy** — Stancl/Tenancy v3.9 with `tenant_id` column scoping. All tenants share one Aurora PostgreSQL database.
- **Org → Workspace → User hierarchy** — Users authenticate at the organisation level, then access workspaces with role-specific permissions.
- **Laravel Sanctum** — Cookie-based SPA auth for the Next.js frontend. Subdomain cookie sharing across `{slug}.moneyquestledger.com.au`.
- **Spatie laravel-permission (teams mode)** — Tenant-scoped RBAC with mutually exclusive role pairs for separation of duties.
- **Laravel Fortify + TOTP** — MFA is mandatory per ATO DSP requirements.
- **Laravel Pennant** — Feature flags control which modules are enabled per tenant.

### Dependencies

| Direction | Epic | Relationship |
|-----------|------|-------------|
| **Depends on** | 002-CLE Core Ledger Engine | CoA templates seeded during workspace creation |
| **Blocks** | All other epics | Every feature requires authenticated, scoped access |

---

## User Scenarios & Testing

### User Story 1 — Tenant Onboarding & Workspace Setup (Priority: P1)

A business owner signs up for MoneyQuest Ledger, creates their organisation, and sets up their first workspace. They choose their industry, configure their fiscal year, select a chart of accounts template, and are guided through a step-by-step onboarding wizard. The entire signup-to-first-value experience takes under 10 minutes with no credit card required (14-day Professional trial).

**Why this priority**: Without onboarding, no other feature is usable. This is the entry point for every customer. First impressions determine conversion.

**Independent Test**: A new user can sign up, complete the wizard, and land on a configured workspace dashboard with a chart of accounts — ready to connect a bank or enter their first transaction.

**Acceptance Scenarios**:

1. **Given** a new user visits the signup page, **When** they complete registration with email, password, and MFA setup (TOTP), **Then** an organisation is created, a 14-day Professional trial begins (no card required), and they enter the onboarding wizard
2. **Given** the user is in the onboarding wizard, **When** they complete each step (Organisation name → Industry → Fiscal year → CoA template → Connect bank → Invite team), **Then** progress is tracked and each step can be skipped and returned to later
3. **Given** the user selects "Aged Care" as their industry and "July–June" fiscal year, **When** the workspace is provisioned, **Then** the system seeds the Aged Care chart of accounts template, creates 12 monthly periods for the current fiscal year, and configures Australian tax codes
4. **Given** an onboarding checklist is active, **When** the user completes all steps, **Then** the checklist dismisses with a congratulatory state; if steps remain incomplete, the checklist persists on the dashboard until finished
5. **Given** the entire flow (signup → wizard → workspace ready), **When** measured end-to-end, **Then** it completes in under 10 minutes for a user who connects a bank account

---

### User Story 2 — Role-Based Access Control & Separation of Duties (Priority: P1)

An organisation administrator manages user roles and permissions scoped to each workspace. The system enforces separation of duties — the person who creates journal entries cannot approve them. Roles determine what users can see and do, driving different UI experiences from the same codebase.

**Why this priority**: Financial software requires strict access control for compliance, fraud prevention, and audit readiness. Every other epic's permission checks depend on this.

**Independent Test**: An admin can assign roles to team members, and the system correctly restricts actions — a Bookkeeper can create entries but not approve them, an Auditor can view everything but modify nothing.

**Acceptance Scenarios**:

1. **Given** a user has the "Bookkeeper" role in Workspace A and "Auditor" role in Workspace B, **When** they switch to Workspace B, **Then** they can only view data (read-only) and all create/edit controls are hidden
2. **Given** a user has both "Bookkeeper" and "Approver" roles assigned, **When** the admin saves this configuration, **Then** the system rejects it with "Separation of duties violation: Bookkeeper and Approver roles are mutually exclusive"
3. **Given** a user with the "Client" role logs in, **When** they navigate the workspace, **Then** they see only selected financial reports shared with them — the general ledger, bank feeds, settings, and full navigation are hidden
4. **Given** a "Customer" role user (from the Lending or Invoice portal), **When** they log in, **Then** they see a simplified dashboard showing only their balance, transactions, and payment schedule — no accounting features visible
5. **Given** the audit log is active, **When** any user performs a financial action (create, post, reverse, reconcile), **Then** the action is recorded with timestamp, user ID, IP address, user agent, and the full event payload
6. **Given** a user has the "Approver" role, **When** they attempt to create a new journal entry, **Then** the system prevents it — Approvers can only review and approve/reject entries created by others

---

### User Story 3 — Organisation & Workspace Management (Priority: P1)

An organisation owner manages their workspace portfolio — creating additional workspaces (sets of books), managing team members across workspaces, and switching between workspaces. Each workspace is fully isolated with its own chart of accounts, fiscal year, and financial data. Users can belong to multiple organisations with different roles at each.

**Why this priority**: Multi-workspace support is essential for the target market (aged care providers with multiple facilities). The workspace switcher is used daily.

**Independent Test**: An owner can create a second workspace, configure it independently, invite different team members, and switch between workspaces — seeing only that workspace's data each time.

**Acceptance Scenarios**:

1. **Given** an organisation owner has Workspace A configured, **When** they create Workspace B, **Then** B gets its own chart of accounts (can use a different template), fiscal year, and empty financial data — completely independent of A
2. **Given** a user belongs to two workspaces, **When** they use the workspace switcher, **Then** the UI transitions to the target workspace's context within 1 second, showing only that workspace's data, navigation, and role-appropriate controls
3. **Given** a user belongs to two organisations, **When** they use the organisation switcher, **Then** they move to the target org's default workspace with their org-level role applied
4. **Given** an owner is managing team members, **When** they invite a user by email, **Then** the invitee receives an email with a secure link, and upon acceptance they appear in the workspace with the assigned role
5. **Given** a user is removed from a workspace while they have draft entries, **When** the removal is processed, **Then** their draft entries are reassigned to the workspace admin and the user loses access immediately

---

### User Story 4 — Security & Session Management (Priority: P1)

The platform enforces enterprise-grade security: mandatory MFA (TOTP), session timeouts, brute-force protection, and comprehensive audit logging. All security measures comply with ATO DSP requirements for financial software handling sensitive taxpayer data.

**Why this priority**: ATO DSP compliance is non-negotiable for an Australian accounting platform. A security incident would be existential.

**Independent Test**: A user with MFA enabled can log in, and after 30 minutes of inactivity their session expires requiring re-authentication.

**Acceptance Scenarios**:

1. **Given** MFA is mandatory per ATO DSP requirements, **When** a user attempts to disable MFA in their settings, **Then** the system prevents it with "Multi-factor authentication is required for compliance and cannot be disabled"
2. **Given** a user has been inactive for 30 minutes, **When** they next interact with the system, **Then** their session is terminated and they must re-authenticate with email, password, and MFA code
3. **Given** a user enters an incorrect password, **When** they fail 5 consecutive times, **Then** the account is locked for 15 minutes and the user receives an email notification about the failed attempts
4. **Given** a user performs any security-relevant action (login, logout, role change, password change, MFA setup), **When** the action completes, **Then** it is logged with timestamp, IP address, user agent, and action details — retained for 12+ months
5. **Given** a user logs in from a new device, **When** authentication succeeds, **Then** a notification is sent to the user's registered email about the new device login

---

### User Story 5 — Feature Flags & Module Management (Priority: P2)

The platform administrator controls which modules are enabled for each tenant via feature flags. Modules (Zone Ledger, Budget Tracker, etc.) can be toggled per organisation based on their subscription and configuration. The UI dynamically shows/hides features based on active modules.

**Why this priority**: The module architecture is how the platform serves different customer segments (aged care, SMB, lending) from one codebase. Feature flags are the mechanism.

**Independent Test**: An admin can enable Budget Tracker for a tenant, and that tenant's users immediately see the Budget Tracker navigation and features — while tenants without it see nothing.

**Acceptance Scenarios**:

1. **Given** an organisation has Zone Ledger enabled and Budget Tracker disabled, **When** a user navigates the app, **Then** all Zone Ledger features are visible but Budget Tracker menu items, pages, and API endpoints return 403
2. **Given** an admin enables Budget Tracker for an organisation, **When** the flag is toggled, **Then** the module becomes available to all users in that org on their next page load — no deployment required
3. **Given** a tenant's subscription includes Professional tier, **When** the system checks feature access, **Then** it cross-references the tier's included modules with the tenant's feature flags to determine access
4. **Given** a module is disabled, **When** API requests target that module's endpoints, **Then** the system returns 403 with "This module is not enabled for your organisation"

---

### Edge Cases

- **Last admin removal**: Attempting to remove the last Owner/Admin from an organisation → system prevents it: "Cannot remove the last administrator"
- **Orphaned invitations**: Invitation link used after the invitee was already added by another path → system detects existing membership and shows "You already have access to this workspace"
- **Concurrent role changes**: Admin A changes User X's role while Admin B simultaneously changes it → optimistic locking, last write wins with audit trail of both changes
- **MFA device loss**: User loses their TOTP device → recovery via backup codes (generated at MFA setup, shown once, user must store securely)
- **Cross-org data isolation**: User belongs to Org A and Org B → switching orgs completely resets the data context; no data from Org A is accessible while in Org B
- **Trial expiry**: 14-day trial expires without conversion → workspace becomes read-only (view data, export, but no create/edit). Billing prompt shown.
- **Workspace limit on plan**: Starter plan user tries to create a 2nd workspace → system shows upgrade prompt with tier comparison

---

## Requirements

### Functional Requirements

**Authentication**
- **FR-AUT-001**: System MUST support email/password authentication with mandatory TOTP MFA
- **FR-AUT-002**: System MUST use Laravel Sanctum for cookie-based SPA authentication with subdomain cookie sharing
- **FR-AUT-003**: System MUST enforce 30-minute session timeout on inactivity
- **FR-AUT-004**: System MUST implement brute-force lockout after 5 failed login attempts (15-minute lockout)
- **FR-AUT-005**: System MUST generate one-time backup codes at MFA setup for device-loss recovery
- **FR-AUT-006**: System MUST notify users via email on new device login

**Organisation & Workspace**
- **FR-AUT-007**: System MUST support the Org → Workspace → User hierarchy
- **FR-AUT-008**: System MUST support multiple workspaces per organisation, each with independent CoA, fiscal year, and data
- **FR-AUT-009**: System MUST support users belonging to multiple organisations with different roles at each
- **FR-AUT-010**: System MUST provide a workspace switcher that transitions context within 1 second
- **FR-AUT-011**: System MUST provide an organisation switcher for users in multiple orgs
- **FR-AUT-012**: System MUST scope all tenant data queries by `tenant_id` via Stancl/Tenancy v3.9

**Roles & Permissions**
- **FR-AUT-013**: System MUST enforce role-based access using Spatie laravel-permission in teams mode
- **FR-AUT-014**: System MUST support these roles: Platform Admin, Org Owner, Accountant, Bookkeeper, Approver, Auditor, Client, Customer
- **FR-AUT-015**: System MUST enforce separation of duties — Bookkeeper and Approver roles are mutually exclusive
- **FR-AUT-016**: System MUST render different UI views based on user role and tenant modules (role-based interfaces, not separate apps)
- **FR-AUT-017**: System MUST prevent removal of the last Owner/Admin from an organisation

**Audit & Security**
- **FR-AUT-018**: System MUST log all security-relevant events with timestamp, user ID, IP address, user agent, and action payload
- **FR-AUT-019**: Audit logs MUST be retained for 12+ months minimum
- **FR-AUT-020**: System MUST provide tiered audit visibility: users see activity log (who/what/when), admins see full detail (IP, user agent, payloads), auditors see everything read-only
- **FR-AUT-021**: System MUST encrypt all data at rest with AES-256 via AWS KMS
- **FR-AUT-022**: System MUST use TLS 1.2+ for all data in transit
- **FR-AUT-023**: System MUST rate-limit API requests: 60 req/min general, 10 req/min bank feeds

**Onboarding**
- **FR-AUT-024**: System MUST provide a guided setup wizard: Org name → Industry → Fiscal year → CoA template → Connect bank → Invite team
- **FR-AUT-025**: System MUST persist an onboarding checklist until all setup steps are completed
- **FR-AUT-026**: System MUST offer industry-specific CoA templates: Australian Standard, Aged Care, Construction, Professional Services, Hospitality, Retail
- **FR-AUT-027**: Onboarding flow MUST be completable in under 10 minutes (signup to first value)

**Feature Flags**
- **FR-AUT-028**: System MUST use Laravel Pennant for module toggling per tenant
- **FR-AUT-029**: System MUST store module configuration (enabled features) on the organisation record
- **FR-AUT-030**: Disabled modules MUST return 403 on API access and hide UI elements

**Trial**
- **FR-AUT-031**: New customers MUST receive a 14-day free trial with full Professional tier access, no credit card required
- **FR-AUT-032**: System MUST transition to read-only mode when trial expires without payment conversion

### Key Entities

- **Organisation**: The paying customer entity. Owns billing subscription, user roster, feature flags, and one or more Workspaces. Has a name, slug, ABN (optional), and plan tier.
- **Workspace (Tenant)**: A set of books with its own chart of accounts, fiscal year, currency, and financial data. Belongs to an Organisation. Identified by `tenant_id` for data scoping.
- **User**: A person with email, password hash, MFA secret, and backup codes. Can belong to multiple Organisations and Workspaces with different roles at each level.
- **Role**: A named permission set (Platform Admin, Org Owner, Accountant, Bookkeeper, Approver, Auditor, Client, Customer) with workspace-level scope. Managed by Spatie laravel-permission.
- **Invitation**: A pending workspace membership invitation with email, assigned role, expiry, and acceptance status.
- **AuditLog**: A record of security and financial events with timestamp, user, IP, user agent, action type, and payload. Retained 12+ months.
- **FeatureFlag**: A per-tenant toggle for module availability. Managed by Laravel Pennant.

---

## Success Criteria

### Measurable Outcomes

- **SC-AUT-001**: Onboarding (signup → wizard → first value) completes in under 10 minutes
- **SC-AUT-002**: Workspace switch transitions in under 1 second
- **SC-AUT-003**: Zero cross-tenant data leakage — verified by automated tests
- **SC-AUT-004**: MFA cannot be disabled — verified by security test
- **SC-AUT-005**: Separation of duties enforced — Bookkeeper cannot approve their own entries, verified by permission test
- **SC-AUT-006**: Session timeout fires at exactly 30 minutes of inactivity
- **SC-AUT-007**: Account locks after exactly 5 failed attempts and unlocks after 15 minutes
- **SC-AUT-008**: 100% of financial actions logged in audit trail with required fields
