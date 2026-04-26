---
title: "Feature Specification: Auth Provider Migration"
---

# Feature Specification: Auth Provider Migration

**Feature Branch**: `040-auth-provider-migration`
**Created**: 2026-03-19
**Status**: Draft
**Epic**: 040-AUM
**Initiative**: FL — Financial Ledger Platform
**Effort**: L (4 sprints)
**Depends On**: 039-RPA (in progress — authorization layer must be independent of auth provider)

### Out of Scope

- **Custom identity provider hosting** — v1 uses a managed external provider (WorkOS or alternative), not a self-hosted IdP
- **Multi-factor hardware token management** — v1 supports TOTP and provider-native MFA; dedicated hardware key (YubiKey) enrollment UI deferred
- **Per-workspace auth policies** — v1 configures SSO at the practice level, not per-workspace. Workspace-level auth policies deferred
- **Federated identity across practices** — a user belonging to multiple practices authenticates separately with each; cross-practice identity federation deferred
- **Custom SCIM attribute mapping** — v1 maps IdP groups to role templates only; custom attribute sync (phone, department, etc.) deferred
- **Auth provider billing integration** — tracking per-MAU costs against MoneyQuest subscription tiers deferred to billing epic

---

## Overview

MoneyQuest Ledger currently uses Sanctum + Fortify for authentication — sufficient for a single-app model but limiting as the platform scales to serve enterprise accounting firms, lending companies, and tax agents. This epic migrates authentication to an external identity provider to unlock SSO/SAML for practice firms, directory sync for automated staff provisioning, passwordless and social login for clients, and user impersonation for practice support workflows — all without disrupting existing users or changing the authorization layer (039-RPA).

### Companion Epic

This epic handles **authentication** (who are you?). Authorization (what can you do?) is handled by **039-RPA Roles & Permissions Architecture**. The two epics are independent — the PermissionResolver in 039-RPA does not depend on which auth provider authenticates the user.

### Current State

- **What works**: Sanctum cookie auth, Fortify registration with MFA (TOTP), JSON login/register/logout responses, CORS configured for SPA, demo persona seeder with 6 test users.
- **What's limiting**: No SSO/SAML support. No directory sync for practice staff provisioning. No passwordless login. No social login. No user impersonation (practice viewing client files as client). Session management is basic (no forced logout, no session listing).

### Provider Evaluation

| Feature | WorkOS | Clerk | Auth0 | Kinde |
|---------|--------|-------|-------|-------|
| SSO/SAML (practice firms) | Built-in | Enterprise add-on | Built-in | Built-in |
| Organizations (multi-tenant) | Built-in | Built-in | Built-in | Built-in |
| Directory Sync (practice staff) | Built-in | No | Enterprise | No |
| User impersonation | Built-in | No | Built-in | No |
| MFA/passwordless | Built-in | Built-in | Built-in | Built-in |
| B2B focus | Primary | Secondary (B2C first) | Strong | Moderate |
| Laravel SDK | Community | Community | Official | Official |
| Pricing model | Per MAU | Per MAU | Per MAU | Per MAU |

**Recommended: WorkOS** — strongest B2B fit for the practice/firm model. Organizations map to practices, Directory Sync solves staff provisioning, SSO/SAML is day-one ready for enterprise accounting firms.

---

## User Scenarios & Testing

### User Story 1 — Seamless Auth Migration (Priority: P1)

As an existing user, I continue to log in exactly as I do today, with no disruption, while the platform transitions to an external auth provider behind the scenes. The migration must be invisible — no password resets, no broken sessions, no "please re-register" emails.

**Why this priority**: Migration cannot break existing users. Every other story in this epic assumes the external provider is in place. If the migration itself causes user lockouts or friction, the entire initiative fails on day one. This is the foundation.

**Independent Test**: Existing demo personas (admin@, sarah@, james@, emma@, mike@, lisa@) can all log in with their current credentials after migration. No password resets required. MFA users are gracefully handled.

**Acceptance Scenarios**:

1. **Given** I am an existing user with email/password credentials, **When** the platform migrates to the new auth provider, **Then** I can log in with my existing credentials without a password reset.

2. **Given** I am a new user registering after migration, **When** I create an account, **Then** my account is created in the external auth provider (not the local database) and I am seamlessly logged in.

3. **Given** I have MFA enabled via Fortify, **When** the platform migrates, **Then** my MFA setup transfers or I am prompted to re-enroll (one-time) with a clear explanation of why re-enrollment is needed.

4. **Given** I am logged in with an active Sanctum session during the migration window, **When** the migration activates, **Then** my current session continues uninterrupted until natural expiry.

5. **Given** the migration is in progress, **When** I visit the login page, **Then** I see no visual change — the auth provider swap is entirely backend.

---

### User Story 2 — Practice SSO/SAML (Priority: P2)

A practice owner at an accounting firm wants their staff to log in with the firm's identity provider (Azure AD, Google Workspace, Okta), eliminating separate MoneyQuest credentials. This is a compliance requirement for enterprise firms and a sales unlock for the practice tier — firms with 50+ staff will not adopt a platform that requires individual credential management.

**Why this priority**: Enterprise accounting firms require SSO for compliance and onboarding efficiency. This is a sales unlock for the practice tier. It depends on Story 1 (external provider in place) but is the highest-value feature the migration enables.

**Independent Test**: Configure SAML with a test IdP. Practice staff can log in via SSO. Staff who leave the firm's IdP are automatically denied access.

**Acceptance Scenarios**:

1. **Given** I am a practice owner, **When** I navigate to practice settings and open "Single Sign-On", **Then** I see a configuration form for SAML or OIDC with my firm's identity provider.

2. **Given** SSO is configured for my practice, **When** a staff member visits the MoneyQuest login page and enters their email, **Then** they are redirected to the firm's IdP, authenticate there, and are returned to MoneyQuest authenticated with their correct practice role.

3. **Given** a staff member is deactivated in the firm's IdP, **When** they attempt to log in to MoneyQuest via SSO, **Then** they are denied access with a message directing them to their firm administrator.

4. **Given** SSO is configured, **When** a staff member who is not in the firm's IdP tries to join the practice, **Then** they are blocked unless the practice has enabled "Allow mixed auth" (email/password alongside SSO).

5. **Given** SSO is configured and "Enforce SSO" is enabled, **When** a practice staff member tries to log in with email/password, **Then** they are redirected to the SSO flow and cannot bypass it.

---

### User Story 3 — Directory Sync for Practice Staff (Priority: P2)

A practice owner's firm staff directory (Azure AD, Google Workspace, Okta) automatically syncs to MoneyQuest, so that when staff join or leave the firm, their MoneyQuest access updates automatically. No manual user provisioning, no stale access from forgotten offboarding.

**Why this priority**: Manual user provisioning doesn't scale for practices with 50+ staff. Directory sync eliminates stale access — a compliance requirement for firms handling client financial data. It pairs naturally with SSO (Story 2) as the second pillar of enterprise identity management.

**Independent Test**: Add a user to the firm's directory. Verify they appear in the MoneyQuest practice within 15 minutes. Remove them from the directory. Verify their MoneyQuest access is revoked.

**Acceptance Scenarios**:

1. **Given** directory sync is enabled for a practice, **When** a new user is added to the firm's IdP, **Then** they are automatically provisioned in the MoneyQuest practice with the default role template (from 039-RPA).

2. **Given** directory sync is enabled, **When** a user is deactivated in the firm's IdP, **Then** their MoneyQuest access is suspended (not deleted — audit trail preserved) within 15 minutes.

3. **Given** directory sync is enabled, **When** a user's group membership changes in the IdP (e.g., moved from "Junior" to "Senior" group), **Then** their MoneyQuest role template can optionally be updated based on the IdP group-to-role-template mapping configured by the practice owner.

4. **Given** directory sync provisions a new user, **When** that user first logs in, **Then** they see their assigned workspaces immediately without any manual workspace assignment.

---

### User Story 4 — Passwordless & Social Login (Priority: P3)

A client-role user who accesses their entity infrequently should not need to remember a MoneyQuest-specific password. Magic links, passkeys, and social providers (Google, Microsoft) reduce friction for these low-frequency users.

**Why this priority**: Reduces friction for client-role users who access their entity infrequently. Lower priority because existing email/password + MFA works fine for regular users (accountants, bookkeepers). This is a UX improvement, not a blocker.

**Independent Test**: Log in with a Google account. Verify the user is created and can access their workspace. Log in with a magic link. Verify email delivery and one-click access.

**Acceptance Scenarios**:

1. **Given** I am on the login page, **When** I choose "Sign in with Google", **Then** I authenticate via Google OAuth and land on my dashboard with my workspaces visible.

2. **Given** I am on the login page, **When** I enter my email and choose "Magic Link", **Then** I receive an email with a one-click login link valid for 15 minutes.

3. **Given** I previously logged in with email/password, **When** I link a social provider in my profile settings, **Then** I can use either method going forward without creating a duplicate account.

4. **Given** I am a new user who registers via social login, **When** I am later invited to a workspace via email, **Then** the invitation resolves to my existing social-login account (matched by email).

---

### User Story 5 — User Impersonation (Priority: P3)

A practice staff member needs to view a client entity as if they were the client — for training, support, and troubleshooting. Impersonation must have a clear visual indicator and a complete audit trail, making it safer than the current workaround of sharing credentials.

**Why this priority**: Accounting firms need to guide clients through their books. Impersonation with audit trail is safer than sharing credentials. Lower priority because it is a workflow improvement, not a security or compliance requirement. Depends on the access audit trail from 039-RPA.

**Independent Test**: Practice staff impersonates a client entity owner. Verify they see the client's view. Verify a banner shows "Viewing as [Client Name]". Verify the impersonation session is logged in the access audit trail (039-RPA).

**Acceptance Scenarios**:

1. **Given** I am a practice staff member assigned to a client entity, **When** I choose "View as client" from the entity actions menu, **Then** I see the entity through the client role's permissions with all practice-specific UI hidden.

2. **Given** I am impersonating a client, **When** I take any action, **Then** a persistent banner shows "Viewing as [Client Name] — Exit" at the top of every page.

3. **Given** I am impersonating a client, **When** I click "Exit" on the impersonation banner, **Then** I return to my normal practice staff view with the entity context preserved.

4. **Given** impersonation occurs, **When** anyone views the access audit log (039-RPA), **Then** the impersonation session is recorded with start time, end time, the impersonating user, and the impersonated user/entity.

5. **Given** I am a practice staff member not assigned to a client entity, **When** I attempt to impersonate that client, **Then** the action is blocked and a "Not authorised" error is shown.

---

### Edge Cases

- **Dual existence during migration**: What happens if a user exists in both local auth and the new provider during migration? The external provider becomes authoritative. The local password is kept as fallback for a configurable migration window (default 30 days), then disabled. Users who only log in via local auth during the window are prompted to verify their external provider account.
- **Auth provider outage**: What happens if the external auth provider has an outage? Local Sanctum sessions remain valid — no logged-in users are disrupted. New logins are blocked with a clear error message ("Authentication service temporarily unavailable"). No silent fallback to local auth — that would bypass SSO policies.
- **API tokens during migration**: What happens to Sanctum personal access tokens during migration? API tokens continue to work unchanged. Only browser session auth transitions to the external provider.
- **SSO enforcement with existing local users**: What happens when a practice enables "Enforce SSO" but some staff have never logged in via SSO? Those users are prompted to link their SSO identity on next login. They cannot bypass SSO after the enforcement grace period (configurable, default 7 days).
- **Directory sync conflict**: What happens when directory sync tries to provision a user whose email already exists in MoneyQuest under a different practice? The existing account is linked (not duplicated). The user gains access to the new practice in addition to their existing access. A notification is sent to both practice owners.
- **Impersonation scope creep**: What happens if a practice staff member tries to impersonate a user in a workspace they are not assigned to? The impersonation is blocked at the policy level — assignment to the client entity is a prerequisite.
- **MFA re-enrollment failure**: What happens if a user with MFA cannot re-enroll during migration (lost device, etc.)? Standard account recovery flow applies — identity verification via email, then MFA reset. The migration does not change the recovery process.

---

## Requirements

### Functional Requirements

**Auth Migration**
- **FR-001**: System MUST migrate authentication to an external provider without requiring existing users to reset passwords.
- **FR-002**: System MUST maintain Sanctum cookie-based session management for the SPA — the auth provider handles identity verification, Sanctum handles session state.
- **FR-003**: System MUST NOT change the authorization layer — the PermissionResolver (039-RPA) and Spatie Permission operate independently of the auth provider.
- **FR-004**: System MUST support a configurable migration window during which local password fallback remains active for existing users.
- **FR-005**: System MUST ensure new registrations after migration create accounts in the external provider, not the local database.

**SSO/SAML**
- **FR-006**: System MUST support SAML and OIDC SSO configuration per practice.
- **FR-007**: System MUST support "Enforce SSO" mode per practice, preventing email/password login for practice staff.
- **FR-008**: System MUST support "Allow mixed auth" mode per practice, permitting both SSO and email/password login.

**Directory Sync**
- **FR-009**: System MUST support directory sync (SCIM) from major IdPs (Azure AD, Google Workspace, Okta) for automated staff provisioning and deprovisioning.
- **FR-010**: System MUST map IdP groups to MoneyQuest role templates (from 039-RPA) for automated role assignment on provisioning.
- **FR-011**: System MUST suspend (not delete) deprovisioned users to preserve audit trail integrity.

**Passwordless & Social Login**
- **FR-012**: System MUST support passwordless login (magic link) as an optional login method.
- **FR-013**: System MUST support social login (Google, Microsoft) as optional login methods.
- **FR-014**: System MUST link social login accounts to existing accounts by email match to prevent duplicate accounts.

**Impersonation**
- **FR-015**: System MUST support user impersonation restricted to practice staff viewing assigned client entities.
- **FR-016**: System MUST display a persistent visual indicator during impersonation sessions.
- **FR-017**: System MUST log all impersonation sessions in the access audit trail (039-RPA) with start time, end time, impersonator, and impersonated user.

### Key Entities

- **AuthProvider**: Configuration for the external auth provider (WorkOS or alternative). Stores API keys, organisation mappings, feature toggles (SSO enabled, directory sync enabled, social login enabled, magic link enabled), and migration window settings.
- **PracticeSSOConfig**: Per-practice SSO configuration. Maps a practice to an IdP with SAML/OIDC connection details, enforcement mode (enforce/mixed), and setup status.
- **DirectorySyncMapping**: Maps IdP groups to MoneyQuest practice role templates (from 039-RPA). Governs automated provisioning — includes IdP group identifier, target role template, and sync status.
- **ImpersonationSession**: Audit record of an impersonation event. Records impersonator (user_id), impersonated user (user_id), entity (workspace_id), start time, end time, and termination reason (manual exit, session timeout, access revoked).

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Zero existing users are locked out during migration — 100% of existing credentials continue to work throughout the migration window.
- **SC-002**: Practice SSO setup takes under 10 minutes with standard IdP documentation.
- **SC-003**: Directory sync provisions new staff within 15 minutes of IdP change.
- **SC-004**: Directory sync deprovisioning revokes MoneyQuest access within 15 minutes of IdP deactivation.
- **SC-005**: Auth provider failover maintains existing sessions — no logged-in users are disrupted by a provider outage.
- **SC-006**: All impersonation sessions are logged with 100% coverage in the access audit trail.
- **SC-007**: Social login and magic link reduce login friction — client-role users can access their entity within 2 clicks from the login page.
- **SC-008**: Migration window is configurable between 7 and 90 days, with local password fallback disabled automatically at window close.

---

## Clarifications

### Session 2026-03-19

- **Q**: Final provider choice — WorkOS vs alternatives? **A**: Requires pricing comparison at projected user volumes and evaluation of Laravel SDK maturity. WorkOS is the recommendation based on feature fit, but the architecture must be provider-agnostic behind an adapter interface so the provider can be swapped. Decision to be finalized before Gate 2.
- **Q**: Should the migration be a "big bang" cutover or gradual rollout? **A**: Gradual. Feature flag per practice — migrated practices use the external provider, non-migrated practices continue on Sanctum/Fortify. The migration window applies per-user within a migrated practice.
- **Q**: How does the external auth provider map to MoneyQuest's multi-tenancy model? **A**: The auth provider's "Organization" concept maps to a MoneyQuest Practice (not a Workspace). A practice has one SSO config, one directory sync. Workspaces remain internal to MoneyQuest's authorization layer.
- **Q**: What happens to Fortify features (password reset, email verification) after migration? **A**: Fortify is retained during the migration window for fallback. After full migration, password reset and email verification are delegated to the external provider's hosted flows. Fortify routes are eventually removed.
- **Q**: Should impersonation be available for non-practice users (e.g., MoneyQuest support staff)? **A**: Not in v1. Support impersonation requires a separate super-admin audit trail and legal framework. V1 is practice-to-client only.
- **Q**: How does this interact with the magic link login in 028-CFT (group Viewer access)? **A**: The 028-CFT magic link for group Viewers will use the same external auth provider's magic link infrastructure once migrated. Until migration, 028-CFT uses its own token-based link. Post-migration, both converge on the same mechanism.
