---
title: "Feature Specification: Billing & Monetisation"
---

# Feature Specification: Billing & Monetisation

**Epic**: 009-BIL
**Created**: 2026-03-01
**Status**: Complete
**Initiative**: FL — MoneyQuest Ledger
**Phase**: 3 (Sprints 9–12)
**Design Direction**: Super Modern

---

## Context

The Billing & Monetisation module implements the SaaS pricing model for MoneyQuest Ledger. It defines 4 plan tiers (Trial, Starter, Professional, Enterprise) with feature gating, resource limits (workspaces, users, bank feeds), and a self-service plan management API. This is the **central layer** — it operates at the Organisation level, not the tenant/workspace level.

New users start on the Professional plan with a 14-day trial. After trial expiry, features are locked to the Trial tier until the user upgrades to a paid plan.

> **Scope**: This epic covers plan definition, feature gating, and plan management. Payment processing (Stripe, Paddle, etc.) is deferred to a future integration.

### Architectural Context

- **PlanTier enum** — all plan definitions (pricing, limits, features) are codified in a single PHP enum. No database table for plans — they are code-driven and versioned with the codebase.
- **FeatureGate service** — centralised feature access control. Checks explicit feature overrides (Organisation.features JSON) first, then falls back to plan-tier features. Precedence: override → trial expiry check → plan tier includes.
- **CheckFeature middleware** — route-level feature gating. Applied as `middleware('feature:reconciliation')` on workspace-scoped routes.
- **Organisation-level billing** — plan_tier, trial_ends_at, and feature overrides live on the Organisation model (central, not tenant-scoped).
- **Laravel Pennant** — configured with database store for optional A/B feature flags (not currently used for billing; FeatureGate handles plan-based access).
- **Enterprise bank feeds** — `maxBankFeeds()` returns `PHP_INT_MAX` (effectively unlimited), not null like workspaces/users.

**Resource Limits by Tier**:

| Resource | Trial | Starter | Professional | Enterprise |
|----------|-------|---------|-------------|------------|
| Workspaces | 1 | 1 | 3 | Unlimited (null) |
| Users | 1 | 2 | 5 | Unlimited (null) |
| Bank Feeds | 0 | 1 | 3 | Unlimited (PHP_INT_MAX) |

### Dependencies

| Direction | Epic | Relationship |
|-----------|------|-------------|
| **Depends on** | 003-AUT Auth & Multi-tenancy | Organisation model, user authentication |
| **Independent of** | 002-CLE Core Ledger Engine | Billing is central layer, not tenant-scoped |
| **Gates** | 004-BFR Bank Feeds & Reconciliation | `bank_feeds` and `reconciliation` features gated by plan |
| **Gates** | 005-IAR Invoicing & AR/AP | `invoicing` feature gated by plan |
| **Gates** | 008-JCT Job Costing | `job_costing` and `tracking_categories` gated by plan |
| **Gates** | 011-MCY Multi-Currency | `multi_currency` gated to Enterprise only |

---

## User Scenarios & Testing

### User Story 1 — Plan Tiers & Pricing (Priority: P1)

A prospective user views available plans with pricing, features, and resource limits. Plan information is publicly accessible (no auth required for viewing plans).

**Why this priority**: Users must understand what they're getting before they sign up. Plan visibility drives conversion.

**Independent Test**: A visitor can view all 4 plans with correct pricing ($0, $29, $59, $99/month), feature lists, and resource limits — without being logged in.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they request the plans endpoint, **Then** all 4 tiers are returned with id, label, monthly_price (cents), max_workspaces, max_users, max_bank_feeds, and features array
2. **Given** the Professional plan, **When** its details are viewed, **Then** price = 5900 ($59/month), max_workspaces = 3, max_users = 5, max_bank_feeds = 3, and features include ledger, invoicing, reconciliation, job_costing, etc.
3. **Given** the Enterprise plan, **When** its limits are viewed, **Then** max_workspaces and max_users are null (unlimited)

---

### User Story 2 — Feature Gating (Priority: P1)

The system controls access to features based on the organisation's plan tier. Features not included in the current plan are blocked at both the API level (middleware) and the frontend level (check-feature endpoint).

**Why this priority**: Feature gating is the core monetisation mechanism. Without it, all users get all features regardless of plan.

**Independent Test**: A Starter-plan organisation can access invoicing but is denied access to reconciliation (Professional feature). The frontend can check feature availability before rendering UI.

**Acceptance Scenarios**:

1. **Given** an organisation on the Starter plan, **When** a feature check is performed for "invoicing", **Then** allowed = true (Starter includes invoicing)
2. **Given** an organisation on the Starter plan, **When** a feature check is performed for "reconciliation", **Then** allowed = false (Starter does not include reconciliation)
3. **Given** an organisation with explicit feature override for "multi_currency" (not in their plan), **When** feature check is performed, **Then** allowed = true (overrides take precedence)
4. **Given** a route with `middleware('feature:reconciliation')`, **When** a Starter-plan user hits it, **Then** the system returns 403
5. **Given** an organisation on Trial plan with expired trial, **When** any feature check is performed, **Then** all features return false (trial expired)
6. **Given** an organisation on Trial plan with active trial (trial_ends_at in the future), **When** feature check is performed for Trial features (ledger, basic_reports), **Then** allowed = true

---

### User Story 3 — Current Plan & Usage (Priority: P1)

An authenticated user views their organisation's current plan, feature access, and resource usage (how many workspaces/users they've used vs their limits).

**Why this priority**: Users need to understand their current plan and usage to make upgrade decisions.

**Independent Test**: A Professional-plan user can see they are using 1 of 3 workspaces and 2 of 5 users, with all Professional features listed.

**Acceptance Scenarios**:

1. **Given** a Professional-plan organisation with 1 workspace and 2 users, **When** the current plan is requested, **Then** the response includes: `plan` = "professional", `plan_label` = "Professional", `max_workspaces` = 3, `max_users` = 5, `max_bank_feeds` = 3, `features` = [...], `current_workspaces` = 1, `current_users` = 2, `is_trial` = false, `trial_ends_at` = null
2. **Given** a Trial-plan organisation with active trial, **When** the current plan is requested, **Then** `is_trial` = true and `trial_ends_at` is an ISO 8601 timestamp
3. **Given** the usage endpoint is called, **When** the response is returned, **Then** it includes workspaces (used, limit, available), users (used, limit, available), and bank_feeds (limit)

---

### User Story 4 — Plan Changes (Priority: P1)

An authenticated user upgrades or downgrades their organisation's plan. Plan changes take effect immediately. Switching to the Trial plan is not allowed.

**Why this priority**: Self-service plan management is essential for a SaaS product.

**Independent Test**: A Starter-plan user can upgrade to Professional, see their features expand immediately, and is blocked from downgrading to Trial.

**Acceptance Scenarios**:

1. **Given** a Starter-plan organisation, **When** the user changes to "professional", **Then** plan_tier is updated, trial_ends_at is cleared, and the response includes the updated limits
2. **Given** a user attempts to switch to "trial", **When** the request is submitted, **Then** the system rejects with a validation error (cannot switch to trial)
3. **Given** an invalid plan tier "gold", **When** the change request is submitted, **Then** the system rejects with a validation error
4. **Given** a plan change from Professional to Enterprise, **When** the change completes, **Then** multi_currency and api_access features become available immediately

---

### User Story 5 — Resource Limits (Priority: P2)

The system enforces resource limits based on the plan tier. Organisations cannot exceed their workspace or user allocation.

**Why this priority**: Limits enforcement is a supporting feature that depends on the plan infrastructure being in place.

**Independent Test**: A Starter-plan organisation (max 1 workspace) is blocked from creating a second workspace. An Enterprise organisation (unlimited) can create as many as needed.

**Acceptance Scenarios**:

1. **Given** a Starter-plan org with 1 workspace (max = 1), **When** FeatureGate::canAddWorkspace() is called, **Then** returns false
2. **Given** a Professional-plan org with 2 workspaces (max = 3), **When** FeatureGate::canAddWorkspace() is called, **Then** returns true (1 remaining)
3. **Given** an Enterprise-plan org, **When** FeatureGate::canAddWorkspace() is called, **Then** always returns true (unlimited)
4. **Given** a Starter-plan org with 2 users (max = 2), **When** FeatureGate::canAddUser() is called, **Then** returns false

---

### Edge Cases

- **Trial expiry**: Organisation's trial_ends_at passes → all feature checks return false until plan upgrade
- **Feature override on expired trial**: Explicit feature override + expired trial → override still takes precedence (features JSON checked first)
- **Plan change during active trial**: Upgrading from Trial to Starter → clears trial_ends_at, activates paid features immediately
- **Concurrent plan changes**: Two admins change plan simultaneously → last write wins (no optimistic locking on plan changes)
- **Enterprise unlimited**: max_workspaces and max_users are null → all limit checks return true
- **Downgrade with excess resources**: Org has 3 workspaces, downgrades to Starter (max 1) → existing workspaces remain accessible, but creating new ones is blocked

---

## Requirements

### Functional Requirements

**Plan Tiers**

- **FR-BIL-001**: System MUST define 4 plan tiers: Trial ($0), Starter ($29/mo), Professional ($59/mo), Enterprise ($99/mo)
- **FR-BIL-002**: Plan tiers MUST be codified in a PlanTier enum with pricing, limits, and features — not in a database table
- **FR-BIL-003**: Plans endpoint MUST be publicly accessible (no authentication required)

**Feature Gating**

- **FR-BIL-004**: System MUST gate 12 features across tiers:
  - **Trial**: ledger, basic_reports
  - **Starter**: + invoicing, contacts, bank_feeds
  - **Professional**: + reconciliation, bas_lodgement, job_costing, tracking_categories, recurring_transactions
  - **Enterprise**: + multi_currency, api_access
- **FR-BIL-005**: FeatureGate MUST check explicit feature overrides (Organisation.features JSON) before plan-tier features
- **FR-BIL-006**: FeatureGate MUST block all features for expired Trial plans
- **FR-BIL-007**: CheckFeature middleware MUST return 403 when a feature is not available for the organisation's plan
- **FR-BIL-008**: check-feature endpoint MUST return { feature, allowed, plan } for frontend conditional rendering

**Plan Management**

- **FR-BIL-009**: System MUST support viewing current plan with features, limits, and usage counts
- **FR-BIL-010**: System MUST support self-service plan changes (immediate effect)
- **FR-BIL-011**: System MUST prevent switching to the Trial plan
- **FR-BIL-012**: Plan changes MUST clear trial_ends_at
- **FR-BIL-013**: Usage endpoint MUST return workspace/user/bank-feed usage vs limits with available counts

**Resource Limits**

- **FR-BIL-014**: System MUST enforce workspace creation limits via FeatureGate::canAddWorkspace()
- **FR-BIL-015**: System MUST enforce user invitation limits via FeatureGate::canAddUser()
- **FR-BIL-016**: Enterprise plan MUST have unlimited workspaces and users (null limits)
- **FR-BIL-017**: Bank feed limits MUST be plan-tier-based: Trial = 0, Starter = 1, Professional = 3, Enterprise = unlimited

**Trial Management**

- **FR-BIL-018**: New registrations MUST start on Professional plan with 14-day trial
- **FR-BIL-019**: Trial expiry MUST lock features to Trial-tier subset (ledger, basic_reports only)
- **FR-BIL-020**: Active trial (trial_ends_at in future) MUST grant Professional-tier features

### Key Entities

- **PlanTier** (enum): Defines all 4 plan tiers with pricing, resource limits, and feature arrays. Methods: `label()`, `monthlyPrice()` (returns cents), `maxWorkspaces()` (?int), `maxUsers()` (?int), `maxBankFeeds()` (int), `features()` (string[]), `includes(string $feature)` (bool), `isAtLeast(PlanTier $tier)` (bool).
- **FeatureGate** (service): Static methods — `check(Organisation, string $feature): bool` (override → trial check → plan includes), `checkOrFail(Organisation, string $feature): void` (aborts 403), `canAddWorkspace(Organisation): bool`, `canAddUser(Organisation): bool`, `limits(Organisation): array` (returns full plan/usage/limits breakdown for current-plan endpoint).
- **CheckFeature** (middleware): Route-level feature gating. Reads workspace → organisation → checks FeatureGate.
- **Organisation** (model): Central model carrying plan_tier, trial_ends_at, and features (JSON override). Not tenant-scoped.
- **BillingController**: 5 endpoints — plans (public), current-plan, change-plan, check-feature, usage (all auth-required).

---

## Success Criteria

### Measurable Outcomes

- **SC-BIL-001**: All 12 features correctly gated by plan tier — verified by feature check tests across all 4 tiers
- **SC-BIL-002**: Feature overrides take precedence over plan tier — verified by test with explicit override on a lower-tier plan
- **SC-BIL-003**: Trial expiry blocks all features — verified by test with past trial_ends_at
- **SC-BIL-004**: Plan changes take immediate effect — feature availability changes within the same request lifecycle
- **SC-BIL-005**: Resource limits enforced — workspace/user creation blocked when at limit (verified by FeatureGate unit tests)
- **SC-BIL-006**: Enterprise has unlimited resources — canAddWorkspace() and canAddUser() always return true
- **SC-BIL-007**: New registrations start with Professional 14-day trial — verified in registration flow test
