---
title: "101-SSO — Social Login & SSO"
description: "OAuth-based social sign-in (Google, Microsoft, Apple) and account linking via Laravel Socialite, integrated with the existing Sanctum + Fortify cookie auth flow."
---

# 101-SSO — Social Login & SSO

**Status:** Planned
**Effort:** M (~3–5 days)
**Depends on:** `003-AUT` (Auth & Multi-tenancy)

## Problem

Today, registration and login require email + password. This adds friction (forgotten passwords, password-policy errors, spam signups) and excludes users who expect single-click sign-in via Google or Microsoft. Business users in particular default to Microsoft 365 identity, and individuals default to Google. Apple Sign-In is required if we ever ship a native iOS app alongside other social providers.

## Goal

Let users **register and sign in with Google, Microsoft, or Apple** in one click, while preserving the existing email + password flow. Allow users to **link multiple identities** to a single account, and **unlink** any identity provided at least one auth method remains.

## Non-Goals

- Enterprise SAML / OIDC SSO with custom IdPs (Okta, Auth0, Azure AD app registrations per tenant). That's a separate epic targeting practice/firm tier.
- SCIM provisioning.
- 2FA / MFA changes — existing Fortify TOTP flow continues to apply to email-password accounts.
- Removing the password-based signup path.

## Users & Roles

All workspace roles (owner, accountant, bookkeeper, approver, auditor, client) can sign in via any enabled provider. Identity-to-account linking is a per-user setting; it does not affect workspace permissions.

## User Stories

### Sign up with social

1. As a new visitor, on the **register** page step 2, I see Google / Microsoft / Apple buttons above the email form.
2. Clicking **Google** redirects me to Google's consent screen. After approving, I land back on the app, signed in, with a brand new user record (name + email + avatar pulled from Google).
3. The selected `account_role` (Individual or Practice) is preserved across the OAuth round-trip via signed state.
4. After callback, the existing onboarding flow runs (workspace + entity setup) — social signup does not skip onboarding.
5. If the email returned by the provider already exists as a password-based account, I'm shown a **"this email is already in use — sign in to link"** screen rather than silently merged.

### Sign in with social

6. As a returning user, on the **login** page, I see the same provider buttons above the password form.
7. Clicking **Microsoft** signs me in if my Microsoft identity is already linked. If it's a brand-new identity, the system creates the user (same as signup) — there's no separate "social login vs signup" intent.
8. If sign-in succeeds, I land on the same post-login destination as a password login (workspace switcher or last-used workspace).

### Link / unlink in settings

9. As a signed-in user, on **/settings/account/security**, I see a "Connected accounts" section listing each provider and whether it's linked, with a "Connect" or "Disconnect" button.
10. Clicking **Connect Google** while signed in starts an OAuth flow whose callback links the returned identity to my existing user (no new user created).
11. Clicking **Disconnect Google** removes that link, **only if** I still have at least one other auth method (a password, or another linked provider). Otherwise the button is disabled with a tooltip explaining why.
12. Linking an identity whose email differs from my account email is allowed — the link is by `provider_id`, not by email.

### Edge cases

13. If a provider returns a verified email, we mark the user's `email_verified_at` so they skip the verification step (Google, Microsoft, Apple all return verified emails).
14. If a provider returns no email (rare — Apple users can hide email; Apple gives a relay address), we accept the relay and continue.
15. If a user revokes app access at the provider side, their next login attempt re-prompts for consent — no app-side error needed.
16. If two users somehow have the same `provider` + `provider_id` (shouldn't happen, but unique constraint will catch), the second linker sees a clear error.

## Functional Requirements

### Backend

**FR-1: Identity model.** New `user_identities` table:

| column | type | notes |
|---|---|---|
| id | bigint pk | |
| user_id | foreign key → users | cascade delete |
| provider | string | enum: `google`, `microsoft`, `apple` |
| provider_id | string | unique per provider |
| email | string nullable | snapshot at link time |
| name | string nullable | snapshot at link time |
| avatar_url | string nullable | |
| created_at, updated_at | timestamps | |

Unique index on `(provider, provider_id)`.
Composite index on `(user_id, provider)`.

**FR-2: Socialite installation.**

```bash
composer require laravel/socialite
composer require socialite-providers/microsoft
composer require socialite-providers/apple
```

Microsoft and Apple are not built-in — they come from the official `socialite-providers` org. Built-in providers we are NOT using yet but get for free if we ever want them: Facebook, X (Twitter), LinkedIn, GitHub, GitLab, Bitbucket, Slack.

**FR-3: Provider config** in `config/services.php` for each provider with redirect URIs:

```
/api/auth/{provider}/callback
```

`.env` keys: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`, `APPLE_KEY_ID`, `APPLE_TEAM_ID`, `APPLE_PRIVATE_KEY`.

**FR-4: Routes.**

```
GET  /api/auth/{provider}/redirect          → SocialAuthController@redirect
GET  /api/auth/{provider}/callback          → SocialAuthController@callback
POST /api/account/identities/{provider}     → LinkIdentity (auth required)
DELETE /api/account/identities/{provider}   → UnlinkIdentity (auth required)
GET  /api/account/identities                → ListIdentities (auth required)
```

`{provider}` is constrained to `google|microsoft|apple` via route pattern.

**FR-5: Actions** (Lorisleiva pattern):

- `Auth/RedirectToProvider` — builds Socialite redirect URL, signs `account_role` + `intent` (`login` | `link`) into state.
- `Auth/HandleProviderCallback` — exchanges code for token, finds-or-creates `UserIdentity`, returns `User`.
- `Auth/LinkIdentity` — attaches a `UserIdentity` to the currently authenticated user; rejects if `provider_id` already linked elsewhere.
- `Auth/UnlinkIdentity` — detaches; throws `CannotUnlinkLastAuthMethod` if it would leave the user unable to sign in (no password set + no other identities).

**FR-6: Find-or-create logic** in `HandleProviderCallback`:

1. Look up by `(provider, provider_id)` → if found, log in.
2. Else look up user by `email` → if found AND `intent !== link`, return error: "this email already exists, sign in with your password and link your Google account from settings". Do not silently merge.
3. Else create new `User` + `UserIdentity` in one transaction. Trigger the existing `Registered` event so onboarding fires.

**FR-7: Session establishment.** After successful OAuth, log the user in via `Auth::login($user)` and regenerate the session — the front-end is already cookie-authenticated via Sanctum, so no token issuance needed. Redirect to a frontend route with success/error in the query string.

**FR-8: Form Request validation** for link/unlink endpoints uses standard authorize via Spatie Permission — there's no separate permission needed (any authenticated user can manage their own identities).

**FR-9: Password optional.** Update `users` migration: `password` becomes nullable. Update `CreateNewUser` action to allow null password when an identity is provided. Update password-reset flow to set initial password when none exists.

### Frontend

**FR-10: Provider buttons** on `/register` (step 2) and `/login` — already mocked up. Each button hits `GET /api/auth/{provider}/redirect?intent=login&account_role={role}` which returns a `Location` redirect to the provider's auth URL. The browser follows the redirect.

**FR-11: Callback handler page.** A frontend route `/auth/callback?status=ok|error&message=...` that the API redirects to after the OAuth round-trip. On `ok` it routes to the post-login destination; on `error` it shows a friendly message and a link back to login/register.

**FR-12: Account settings UI.** New "Connected accounts" panel on `/settings/account/security` listing each provider with:
- Linked: provider icon, display name, email, "Disconnect" button (disabled with tooltip if it would orphan the account)
- Not linked: provider icon, "Connect" button → starts link flow

**FR-13: Email-already-exists screen.** When step 2 of FR-6 fires, the callback redirects to `/auth/callback?status=email_exists&email=...&provider=google`, which renders a clear screen: "An account with `<email>` already exists. Sign in with your password, then connect your `<provider>` account from settings." Single CTA: "Sign in".

### Security

**FR-14: State signing.** OAuth state must be signed (Laravel `URL::temporarySignedRoute` or HMAC of `account_role` + `intent` + nonce) and verified on callback. No raw query-string smuggling.

**FR-15: PKCE.** Use Socialite's `stateless()` opt-out — we want stateful sessions with CSRF protection. Microsoft and Google support PKCE; enable where Socialite's API allows.

**FR-16: Rate limiting.** Apply `throttle:10,1` per IP to `/api/auth/{provider}/redirect`.

**FR-17: Email verification trust.** Only auto-verify the user's email when the provider asserts the email is verified (Google `email_verified`, Microsoft equivalent, Apple's `email_verified` claim). Otherwise require standard verification.

**FR-18: Provider revocation propagation.** Optional v2 — listen for revocation webhooks (Google security tokens) and clean up identity rows.

## Acceptance Criteria

- [ ] Socialite + microsoft + apple packages installed; `config/services.php` configured.
- [ ] `user_identities` table exists with unique `(provider, provider_id)` constraint.
- [ ] `users.password` is nullable.
- [ ] `GET /api/auth/google/redirect` returns 302 to Google.
- [ ] Google callback creates a user + identity + workspace flow runs (existing onboarding triggers).
- [ ] Microsoft and Apple paths work end-to-end.
- [ ] Existing email-password user can link a Google identity from `/settings/account/security` and use it to sign in next time.
- [ ] Existing email-password user CANNOT register a new account via Google with the same email — they're sent to the "email exists" screen.
- [ ] User can unlink a provider unless it's their only auth method.
- [ ] Tests:
  - Feature: each provider redirect returns correct URL with signed state
  - Feature: callback creates new user when identity is unknown and email is unknown
  - Feature: callback logs in existing user when identity is known
  - Feature: callback returns "email exists" error when email is known but identity is not (and intent is not `link`)
  - Feature: link endpoint attaches identity to current user
  - Feature: unlink endpoint refuses to remove last auth method
  - Feature: tenant isolation — social signup respects the same workspace creation flow as email signup
  - Browser: clicking Google button on register page reaches a real (mocked) provider redirect

## Out of Scope (future epics)

- **Enterprise SSO (SAML / OIDC IdP)** — separate epic, likely 102-ESS, for practice and enterprise tiers. Includes per-tenant IdP config, JIT provisioning, group-to-role mapping.
- **SCIM provisioning** — auto-provision users from corporate directory.
- **WebAuthn / Passkeys** — passwordless without OAuth.
- **GitHub / Slack / X social login** — built into Socialite already; trivial to add later if there's user demand.

## Open Questions

- Apple Sign-In requires Apple Developer enrollment ($99/yr) — confirm we have that or defer Apple to post-MVP.
- Do we want a "remember last-used provider" hint on the login page (e.g., a small label "you usually sign in with Google")? Nice-to-have, not blocking.
- Microsoft callback can return either personal accounts or work/school accounts — do we treat them as the same provider or split into `microsoft` and `microsoft-work`? Default: treat as one.
