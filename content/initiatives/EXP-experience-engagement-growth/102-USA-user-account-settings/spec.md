---
title: "102-USA — User Account Settings"
description: "Personal account section for each signed-in user — profile, password, connected accounts, two-factor, sessions, and notification preferences. Distinct from workspace-scoped /settings."
---

# 102-USA — User Account Settings

**Status:** Planned
**Effort:** M (~3–4 days)
**Depends on:** `003-AUT` (Auth)
**Sibling of:** `101-SSO` (Connected accounts panel lives here)

## Problem

Today the user dropdown's **Account** item is a no-op (`onClick={() => {}}` in `frontend/src/components/layout/user-menu.tsx`). There is no personal account page anywhere in the app — only a workspace-scoped `/settings` area for organisation/billing/users/etc. As soon as we ship SSO (`101-SSO`), 2FA, or session management, the user needs a place to manage their personal identity that's *clearly separate* from workspace settings.

This is also the natural home for cross-workspace user concerns: which workspaces am I a member of, what role do I have in each, what's my notification cadence, what devices are signed in.

## Goal

A clean, personal **Account** section at `/account` (workspace-agnostic) that holds everything about *the human signed in*, not the workspace they happen to be in. Distinct visual treatment from `/settings` to make the boundary obvious.

## Non-Goals

- Workspace settings (already at `/settings/...` — keep as-is)
- Practice-level settings (separate)
- Super admin platform settings (separate, at `/admin/...`)
- Billing — billing is workspace-scoped, lives at `/settings/billing`
- Building OAuth providers themselves — that's `101-SSO`

## Information Architecture

```
/account                        → redirect to /account/profile
/account/profile                → name, email, avatar, locale, timezone
/account/security/password      → change password
/account/security/connected     → linked SSO providers (101-SSO scope)
/account/security/two-factor    → TOTP / backup codes
/account/security/sessions      → active devices, revoke
/account/notifications          → email, in-app, digest cadence
/account/workspaces             → list of workspaces I'm in + role per workspace
/account/api-tokens             → personal access tokens (Sanctum)
/account/danger                 → delete account, export data
```

Settings sub-nav (200px left rail, matching the mockup style):

```
ACCOUNT
  Profile
  Notifications
  Workspaces
  API tokens

SECURITY
  Password
  Connected accounts        ← 101-SSO panel
  Two-factor authentication
  Sessions

ZONE
  Delete account
```

## Routing & Layout

- New route group: `frontend/src/app/(dashboard)/account/` reusing the same dashboard chrome (sidebar + header)
- Shared layout file `account/layout.tsx` renders the 200px settings-style sub-nav on the left and feature content on the right (matches Option A mockup pattern)
- Breadcrumb on every page: `Account / {Section} / {Page}`
- Page header: title + 1-line subtitle + optional "Save" / status indicator on the right
- Auto-save semantics where possible (e.g., theme, notifications) — explicit Save button only for password and profile

## Visual Style

Matches the **stone-palette mockups** at `mockups/sso-connected-accounts/01-stacked-rows.html`. Specifically:

- Stone neutrals, white surfaces, single-pixel borders (`border-stone-200`)
- Page header with breadcrumb above title
- Settings sub-nav with active state `bg-stone-100 text-stone-900 font-medium`
- Section pattern: small uppercase `<h2>` + content panel
- Stacked-row pattern for collections (connected accounts, sessions, workspaces, tokens)
- Mono font for IDs, emails-as-identifiers, dates in tabular contexts
- Status chips: emerald (active/connected), stone (inactive/available), rose (warning/danger)

Reuses existing shadcn primitives (Button, Input, Switch, Label, Separator, Tooltip, DropdownMenu) — no net new components.

## User Stories

### Discoverability

1. As a signed-in user, when I click my avatar in the top-right, the dropdown's **Account** item navigates to `/account/profile` (currently does nothing).
2. The user-menu dropdown's **Account** item shows a `kbd` hint of `G A` to match the keyboard shortcut convention.
3. Pressing `G then A` from anywhere (when not focused on an input) opens `/account/profile`.

### Profile

4. On `/account/profile`, I see my name, email, avatar (initials fallback), preferred name, timezone, and locale.
5. I can edit name, preferred name, timezone, and locale. Email changes go through verification (separate flow — out of scope for this epic, just disable the field with a "contact support" link for now).
6. Saving shows an inline "Saved" confirmation, no toast spam.
7. Avatar upload supports drag-drop and click-to-browse (5MB JPG/PNG max). Removing the avatar reverts to initials.

### Password

8. On `/account/security/password` I see "Last changed: {date}" and a strength chip if known.
9. Changing password requires current password + new password + confirmation, with the same live strength indicator we built on the register page.
10. If I have no password (SSO-only signup from `101-SSO`), the page shows "Set a password" instead of "Change password" and skips the current-password field.

### Connected accounts

11. The full `101-SSO` connected-accounts panel renders here (Option A mockup pattern). See that spec for behaviour.

### Two-factor

12. On `/account/security/two-factor` I can enable TOTP. We show a QR code, ask the user to enter a code from their authenticator, and store the secret encrypted.
13. After enabling, the page shows "Active since {date}" with a "Disable" button (requires password re-confirm) and a "Show backup codes" action.
14. Backup codes are generated once at enable time, downloadable as a `.txt` file, and regeneratable (which invalidates the previous set).

### Sessions

15. On `/account/security/sessions` I see a list of active sessions: device, browser, IP location (geo from IP), last active timestamp, "current session" badge.
16. I can revoke any session except the current one (current is disabled with a tooltip).
17. There's a "Revoke all other sessions" button that signs me out everywhere except here.

### Notifications

18. On `/account/notifications` I see a grouped list of notification categories (banking, invoicing, jobs, mentions, weekly digest) each with toggles for **Email** and **In-app**.
19. Changes save instantly with optimistic update.
20. There's a master switch "Pause all email for {1h | 4h | 1d | until I turn it back on}" that overrides per-category settings until the timer expires.

### Workspaces

21. On `/account/workspaces` I see every workspace I'm a member of, with: workspace name, organisation (parent), my role, joined date, last activity, "switch to" action.
22. I can leave a workspace (with confirmation) unless I'm the sole owner — then the action is disabled with a tooltip.

### API tokens

23. On `/account/api-tokens` I see all my personal Sanctum tokens with: name, scopes, last used, created date, "revoke" action.
24. "Create token" opens a modal asking for a name and ability scopes (checkbox list of available abilities). On create, the plaintext token is shown ONCE in a copy-to-clipboard box with a clear warning it won't be shown again.

### Delete / Export

25. On `/account/danger` I have two actions:
    - **Export my data** — kicks off a job to bundle all my user-level data (profile, identities, tokens, sessions, notification prefs) as a downloadable archive. Email link when ready.
    - **Delete account** — requires typing my email to confirm, then password (or SSO re-auth). On confirm, soft-deletes the user, removes from all workspaces (transferring ownership where I'm sole owner — block with explicit error if that's not resolvable), and queues hard-delete after 30 days.

## Functional Requirements

### Frontend

**FR-1: Dropdown wiring.** Update `frontend/src/components/layout/user-menu.tsx` so the **Account** item is a `<Link href="/account/profile">` instead of `onClick={() => {}}`. Add a `kbd` hint showing `G A` at the right end of the menu item. Same for the compact (admin masquerade) variant.

**FR-2: Keyboard shortcut.** Register `G A` as a global navigation chord that pushes `/account/profile`. Add it to the `?` keyboard help overlay.

**FR-3: Route group + layout.** Create `frontend/src/app/(dashboard)/account/layout.tsx` rendering the settings-style 200px sub-nav + content area. The sidebar nav data is a static list of sections (no API call) — visible items are filtered by user capability where relevant (e.g., super admins see all sections).

**FR-4: Pages.** One `page.tsx` per route in the IA above. Each page is a client component using TanStack Query for data fetching, React Hook Form + Zod for any forms.

**FR-5: Visual fidelity to the mockup.** The Connected Accounts page (and by extension every collection-style page) uses the **stacked-rows** pattern from `mockups/sso-connected-accounts/01-stacked-rows.html`:
- White panel with `border-stone-200`
- Row layout: icon (40px) · title + chip · metadata · actions
- Status chips with colored dot prefix
- Help footer text under collections explaining last-method protection / consequences

**FR-6: Index redirect.** `/account` and `/account/security` should redirect to their first child (`profile` and `password` respectively) so users land somewhere sensible.

**FR-7: Section headers in sub-nav.** The sub-nav shows uppercase grey section labels (`ACCOUNT`, `SECURITY`, `ZONE`) above grouped items, matching the existing `Workspace` / `Personal` pattern in the main sidebar.

### Backend

**FR-8: Profile endpoints.**
- `GET /api/v1/account` — returns the current user's profile DTO (name, email, preferred_name, timezone, locale, avatar_url, has_password, mfa_enabled, identities_count, sessions_count)
- `PATCH /api/v1/account` — updates editable profile fields
- `POST /api/v1/account/avatar` / `DELETE /api/v1/account/avatar`

**FR-9: Password endpoints.**
- `POST /api/v1/account/password` — accepts current_password (optional if user has no password), new_password, new_password_confirmation
- Validation matches `Password::min(8)->mixedCase()->numbers()` (existing `CreateNewUser` rule)

**FR-10: Two-factor.** Reuse Fortify's existing TOTP routes — the spec just defines the UI consumer for them. Endpoints:
- `POST /api/v1/account/two-factor/enable`
- `POST /api/v1/account/two-factor/confirm`
- `POST /api/v1/account/two-factor/disable`
- `GET /api/v1/account/two-factor/recovery-codes`
- `POST /api/v1/account/two-factor/recovery-codes/regenerate`

**FR-11: Sessions.**
- `GET /api/v1/account/sessions` — returns list from Laravel's `sessions` table filtered by user_id
- `DELETE /api/v1/account/sessions/{id}` — revokes one
- `DELETE /api/v1/account/sessions` — revokes all except current

**FR-12: Notifications.**
- `GET /api/v1/account/notification-preferences` — returns matrix of category × channel
- `PATCH /api/v1/account/notification-preferences` — partial update
- `POST /api/v1/account/notification-preferences/pause` — accepts `{ until: ISO8601 }`

**FR-13: Workspaces.**
- `GET /api/v1/account/workspaces` — returns list with role + joined_at + last_active_at
- `DELETE /api/v1/account/workspaces/{id}` — leave workspace (validation: not sole owner)

**FR-14: API tokens.**
- `GET /api/v1/account/tokens` — list with metadata (no plaintext)
- `POST /api/v1/account/tokens` — create, returns plaintext once
- `DELETE /api/v1/account/tokens/{id}` — revoke

**FR-15: Account deletion.**
- `POST /api/v1/account/export` — queues `ExportUserData` job
- `DELETE /api/v1/account` — soft-delete + queue 30-day hard-delete + transfer/block ownership conflicts

**FR-16: Authorization.** All `/api/v1/account/*` endpoints implicitly authorize on `auth()->id()` — no Spatie Permission needed, you can always manage your own account. Form Requests use the standard Sanctum auth middleware.

**FR-17: New `notification_preferences` table** if one doesn't exist — `(user_id, category, channel, enabled, paused_until)`. Check existing notification module first to avoid duplicating.

### Data model

| Table | Status | Notes |
|---|---|---|
| `users` | exists | Add `preferred_name`, `timezone`, `locale`, `avatar_url` if missing |
| `user_identities` | new (`101-SSO`) | Already specced |
| `notification_preferences` | likely new | Verify against `024-NTF` epic |
| `personal_access_tokens` | exists (Sanctum) | No change |
| `sessions` | exists (Laravel) | Add user-scoped scope |

### Deletion mechanics

Soft-delete the user, then a scheduled command (`accounts:purge-soft-deleted`) runs daily and hard-deletes accounts whose `deleted_at` is more than 30 days ago. Hard-delete cascades user_identities, tokens, sessions, notification preferences. Workspace memberships were already removed at soft-delete time.

If the user is the sole owner of any workspace at delete time, the API returns `409 Conflict` with a list of workspaces and forces the user to either transfer ownership or delete the workspace first. No silent data loss.

## Acceptance Criteria

- [ ] Clicking **Account** in the user dropdown navigates to `/account/profile` (was no-op)
- [ ] `G A` keyboard chord opens `/account/profile`
- [ ] `/account/profile` renders profile fields, edits save successfully
- [ ] `/account/security/password` works with the same live strength indicator from the register page
- [ ] `/account/security/connected` renders the Option A stacked-rows mockup (deps: `101-SSO`)
- [ ] `/account/security/two-factor` enables/disables TOTP via Fortify
- [ ] `/account/security/sessions` lists sessions and lets the user revoke
- [ ] `/account/notifications` toggles save instantly
- [ ] `/account/workspaces` lists memberships with leave action
- [ ] `/account/api-tokens` create-and-show-once flow works
- [ ] `/account/danger` delete flow blocks if user is sole owner of any workspace
- [ ] All pages match the stacked-rows mockup visual style
- [ ] Keyboard help overlay (`?`) lists `G A`
- [ ] Tests: feature tests per endpoint, browser test for dropdown → `/account/profile` navigation
- [ ] No new shadcn components needed (audit before merge)

## Phasing

To keep this shippable as small slices:

| Phase | Scope | Effort |
|---|---|---|
| **1 — Skeleton** | Dropdown wiring + `/account/profile` (read-only) + layout/sub-nav + redirect from `/account` | 0.5 day |
| **2 — Profile + Password** | Edit profile, change password with strength indicator | 0.5 day |
| **3 — Connected accounts** | Pull in `101-SSO` panel (depends on `101-SSO` backend) | 0.5 day |
| **4 — Sessions + 2FA** | Reuse Fortify TOTP, list sessions, revoke flow | 1 day |
| **5 — Notifications + Workspaces + Tokens + Danger** | The remaining tabs | 1.5 days |

Phase 1 alone removes the broken dropdown experience and gives a real destination — worth shipping standalone.

## Open Questions

1. **Email change flow** — out of scope for now (placeholder "contact support"). Worth its own mini-spec later, since it touches verification + preventing account takeover.
2. **Avatar storage** — S3 (matches existing attachments) or local? Default to S3 to be consistent with `012-ATT`.
3. **Notification categories** — pull the canonical list from the existing `024-NTF` epic; don't invent a new one here.
4. **Two-factor recovery codes UX** — copy-to-clipboard or download-as-file? Default both.
5. **Personal API tokens scope list** — what abilities are exposed to users vs reserved for admin use? Probably need a curated allowlist to prevent accidental over-permissive tokens.
