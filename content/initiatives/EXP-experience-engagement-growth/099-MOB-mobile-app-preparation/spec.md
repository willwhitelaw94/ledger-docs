---
title: "Feature Specification: Mobile App Preparation (Backend)"
---

# Feature Specification: Mobile App Preparation (Backend)

**Epic**: 099-MOB
**Feature Branch**: `feature/099-mob-mobile-app-preparation`
**Created**: 2026-04-01
**Status**: Draft
**Initiative**: FL -- Financial Ledger Platform
**Effort**: L (4 sprints)
**Depends On**: 003-AUT (complete), 012-ATT (complete), 024-NTF (complete), 019-AIX (complete), 045-PUB (complete)

### Out of Scope

- **React Native / Expo app build** -- the mobile client is a separate epic. This epic prepares the backend only.
- **Mobile-specific UI or navigation** -- all frontend concerns live in the Expo epic.
- **WebSocket / real-time push via Reverb** -- push notifications use FCM/APNs, not WebSockets. Reverb remains a future upgrade for the web frontend.
- **Offline-first database sync** -- the mobile app will cache API responses for offline reading. Full bidirectional offline sync (conflict resolution, local writes queued) is deferred.
- **OAuth2 / third-party app authorization** -- mobile auth uses first-party Sanctum tokens, not OAuth flows. Third-party OAuth deferred to 045-PUB v2.
- **Deep link / universal link configuration** -- handled in the Expo app epic, not backend.
- **App Store / Play Store submission** -- not backend.

---

## Overview

MoneyQuest serves ~888 API endpoints to the Next.js frontend via Sanctum cookie-based SPA authentication. This architecture assumes a browser environment -- cookies, CSRF tokens, same-origin requests. A React Native mobile app cannot use cookie auth and faces additional constraints: intermittent connectivity, constrained bandwidth, push notification delivery, and camera-based document capture as a primary input method.

This epic prepares the Laravel backend for mobile consumption without breaking the existing web frontend. The changes fall into nine areas:

1. **Token-based authentication** alongside existing cookie auth
2. **Push notification infrastructure** extending the existing 024-NTF system
3. **API versioning review** to stabilise v1 for a second client
4. **Offline-friendly response headers** for efficient mobile caching
5. **Image and file optimisation** for bandwidth-constrained environments
6. **Receipt capture API** leveraging the 019-AIX inbox for camera-to-bill workflows
7. **Biometric auth support** for token refresh without re-entering credentials
8. **Rate limiting review** tuned for mobile request patterns
9. **Mobile-optimised response payloads** to reduce transfer sizes

All changes are additive. The web frontend continues to use cookie auth and full payloads unchanged.

---

## User Scenarios & Testing

### User Story 1 -- Token-Based Authentication for Mobile (Priority: P1)

As a MoneyQuest user logging in from the mobile app, I want to authenticate with my email and password and receive a long-lived API token so that I can make authenticated requests without browser cookies.

**Why this priority**: Without token auth, the mobile app cannot authenticate at all. Every other mobile feature depends on a valid token being present. This is the gateway to the entire mobile API surface.

**Independent Test**: Can be tested by posting credentials to the token endpoint, receiving a token, using it to make an authenticated request, and verifying it works. Can also test revocation independently.

**Acceptance Scenarios**:

1. **Given** a registered user with valid credentials, **When** they POST to `/api/v1/auth/token` with email, password, and device_name, **Then** the system returns a Sanctum personal access token, the user's profile, and a list of their workspaces.

2. **Given** a user with MFA enabled (Fortify two-factor), **When** they POST valid credentials to `/api/v1/auth/token`, **Then** the system returns a 403 with `mfa_required: true` and a temporary `mfa_token`. **When** they POST the TOTP code to `/api/v1/auth/token/mfa` with the `mfa_token`, **Then** the system returns the full access token.

3. **Given** a valid token, **When** it is included in the `Authorization: Bearer {token}` header on any workspace-scoped API request, **Then** the request is authenticated and the existing `SetWorkspaceContext` middleware resolves the workspace from the `X-Workspace-Id` header as normal.

4. **Given** a user wants to log out of the mobile app, **When** they POST to `/api/v1/auth/token/revoke`, **Then** the current token is deleted and all subsequent requests with that token return 401 Unauthorized.

5. **Given** a user is logged in on multiple devices, **When** they revoke a specific token by ID via POST to `/api/v1/auth/tokens/{id}/revoke`, **Then** only that token is revoked. Other device tokens remain valid.

6. **Given** a user wants to see all active sessions, **When** they GET `/api/v1/auth/tokens`, **Then** they see a list of active tokens with device_name, last_used_at, and created_at -- but never the token value itself.

7. **Given** invalid credentials, **When** a POST is made to `/api/v1/auth/token`, **Then** the system returns 401 with a generic "Invalid credentials" message (no user enumeration).

---

### User Story 2 -- Push Notification Infrastructure (Priority: P1)

As a mobile user, I want to receive push notifications on my phone when important events happen in my workspace so that I do not have to open the app to check for updates.

**Why this priority**: Push notifications are the primary engagement driver for mobile. Without them, the mobile app is entirely pull-based -- users must open the app and refresh to discover pending approvals, paid invoices, or bank feed updates. Push is what makes mobile indispensable.

**Independent Test**: Can be tested by registering a device token, triggering a notification via the existing 024-NTF CreateNotification action, and verifying the push delivery channel dispatches to FCM/APNs.

**Acceptance Scenarios**:

1. **Given** a user is logged in on the mobile app with a valid API token, **When** the app registers its FCM/APNs device token via POST to `/api/v1/devices`, **Then** the token is stored against the user with the device platform (ios/android), device_name, and associated API token.

2. **Given** a user has registered two devices (iPhone and iPad), **When** a notification is created for that user (e.g., journal entry pending approval), **Then** the push notification is delivered to both registered devices.

3. **Given** a user has configured notification preferences (024-NTF NotificationPreference model) to disable a category, **When** an event of that category occurs, **Then** no push notification is sent for that category -- preferences apply uniformly across in-app and push channels.

4. **Given** a device token becomes invalid (app uninstalled, token expired), **When** FCM/APNs returns an "unregistered" or "invalid token" error, **Then** the system soft-deletes the device registration and does not retry.

5. **Given** a user revokes an API token (logs out of a device), **When** the token is revoked, **Then** all device registrations associated with that token are also soft-deleted, stopping push delivery to that device.

6. **Given** a user wants to control push notifications independently from in-app notifications, **When** they GET `/api/v1/devices/{id}/preferences`, **Then** they see per-category push toggles. **When** they PATCH preferences, **Then** only push delivery is affected -- in-app notifications continue per their own settings.

7. **Given** a push notification is tapped, **When** the payload is received by the mobile app, **Then** it includes `notification_id`, `subject_type`, `subject_id`, and `workspace_id` so the app can deep-link to the relevant screen.

---

### User Story 3 -- API Versioning Review & Stability Audit (Priority: P1)

As the platform team, we want to audit all v1 API endpoints to ensure they are stable, well-documented, and free of browser-specific assumptions so that the mobile app can rely on them as a long-term contract.

**Why this priority**: The mobile app is a second client consuming the same API. Any browser-only assumptions (CSRF dependencies, HTML error pages, redirect responses) will cause silent failures on mobile. This audit must happen before mobile development begins.

**Independent Test**: Can be tested by running an automated scan of all v1 route definitions, checking response types, and verifying no endpoint returns HTML or depends on cookie-only mechanisms for its core functionality.

**Acceptance Scenarios**:

1. **Given** the full set of v1 API routes, **When** an audit script scans each route, **Then** every endpoint returns `Content-Type: application/json` for both success and error responses -- no HTML error pages, no redirect responses for API routes.

2. **Given** an unauthenticated request to a protected endpoint, **When** the request uses `Accept: application/json`, **Then** the response is a JSON 401 -- not a redirect to `/login`.

3. **Given** a validation error on any endpoint, **When** the request is made with `Accept: application/json`, **Then** the response is a JSON 422 with the standard Laravel validation error format -- not an HTML error page.

4. **Given** the Sanctum middleware stack, **When** a request includes a valid Bearer token (not a cookie), **Then** the `EnsureFrontendRequestsAreStateful` middleware is bypassed and CSRF verification is not required.

5. **Given** the audit identifies endpoints that return browser-specific data (e.g., redirect URLs, CSRF tokens in response bodies), **When** those endpoints are documented, **Then** each is either made client-agnostic or explicitly marked as web-only with a mobile alternative provided.

6. **Given** the v1 API surface, **When** the audit is complete, **Then** a machine-readable API compatibility manifest is produced listing every endpoint with its auth method (cookie/token/both), response format, and any mobile-specific notes.

---

### User Story 4 -- Offline-Friendly Response Headers (Priority: P2)

As a mobile user with intermittent connectivity, I want the app to show me my most recent data even when offline so that I can review accounts, contacts, and recent documents without a network connection.

**Why this priority**: Mobile users frequently lose connectivity -- on trains, in basements, in areas with poor signal. Without cache-friendly headers, the app must either show a blank screen offline or implement its own cache invalidation logic, which is error-prone. Standard HTTP caching headers let the app cache efficiently with minimal custom logic.

**Independent Test**: Can be tested by making a GET request to a cacheable endpoint, verifying `ETag` and `Last-Modified` headers are present, making a conditional request with `If-None-Match`, and verifying a 304 Not Modified response when data has not changed.

**Acceptance Scenarios**:

1. **Given** a GET request to `/api/v1/chart-accounts`, **When** the response is returned, **Then** it includes an `ETag` header (hash of the response body) and a `Last-Modified` header (most recent `updated_at` timestamp of any chart account in the workspace).

2. **Given** a subsequent GET request to `/api/v1/chart-accounts` with `If-None-Match: "{previous_etag}"`, **When** no chart accounts have changed, **Then** the response is 304 Not Modified with no body -- saving bandwidth.

3. **Given** a GET request to `/api/v1/contacts` with `If-Modified-Since: "2026-03-15T10:00:00Z"`, **When** no contacts have been updated since that timestamp, **Then** the response is 304 Not Modified.

4. **Given** the following endpoints are designated as offline-cacheable: Chart of Accounts (`/chart-accounts`), Contacts (`/contacts`), recent Invoices (`/invoices?per_page=50`), recent Bills (`/bills?per_page=50`), Bank Transactions (`/bank-transactions?per_page=100`), Workspace Settings (`/workspace`), **When** any of these endpoints are called, **Then** `ETag` and `Last-Modified` headers are present on every response.

5. **Given** a mobile client performing an initial sync, **When** it requests `/api/v1/sync/manifest`, **Then** it receives a manifest listing each cacheable resource, its current `ETag`, record count, and `last_modified_at` timestamp -- allowing the client to determine which resources need fetching without making individual requests.

---

### User Story 5 -- Image and File Optimisation for Mobile (Priority: P2)

As a mobile user viewing attachments, I want images to load quickly on cellular connections so that I can review receipts and documents without waiting for full-resolution files to download.

**Why this priority**: The attachment system (012-ATT) currently serves original files only. A 5MB receipt photo on a 3G connection takes 30+ seconds to download. Thumbnails and progressive loading are essential for a usable mobile experience. This is lower priority than auth and push because the app is functional without it -- just slow.

**Independent Test**: Can be tested by uploading an image attachment, requesting a thumbnail variant, and verifying the returned image is resized and compressed.

**Acceptance Scenarios**:

1. **Given** an image attachment exists on a document (invoice, bill, journal entry, contact, job), **When** a GET request is made to `/api/v1/attachments/{uuid}/thumbnail`, **Then** a resized image is returned (max 400px on longest edge, WebP format, quality 80).

2. **Given** an image attachment exists, **When** a GET request is made to `/api/v1/attachments/{uuid}/preview`, **Then** a medium-resolution image is returned (max 1200px on longest edge, WebP format, quality 85) suitable for full-screen mobile viewing.

3. **Given** a non-image attachment (PDF, spreadsheet), **When** a thumbnail request is made, **Then** the system returns a generated preview image of the first page (for PDFs) or a file-type icon placeholder (for other formats).

4. **Given** thumbnails are generated, **When** the same thumbnail is requested again, **Then** it is served from cache (S3 or CDN) -- not regenerated. Cache key includes attachment UUID and variant name.

5. **Given** the attachment list endpoint `/api/v1/{parentType}/{parentId}/attachments`, **When** a mobile client requests it, **Then** each attachment in the response includes `thumbnail_url` and `preview_url` fields alongside the existing `download_url`.

6. **Given** an attachment upload from mobile, **When** the image exceeds 10MB, **Then** the upload is accepted but the original is compressed server-side to a maximum of 5MB before storage. The original dimensions are preserved. A `compressed: true` flag is included in the attachment metadata.

---

### User Story 6 -- Receipt Capture API (Priority: P2)

As a mobile user who just received a receipt, I want to photograph it and have it automatically processed into the document inbox so that I do not have to manually enter bill details later.

**Why this priority**: Receipt capture is the single most compelling mobile-only use case. It justifies installing the app. However, it builds on existing infrastructure (019-AIX inbox, 012-ATT attachments) so it is lower priority than the foundational auth and push work that enables any mobile interaction at all.

**Independent Test**: Can be tested by POSTing an image to the receipt capture endpoint, verifying an InboxItem is created with status `pending`, and verifying the ExtractInboxDocumentJob is dispatched for OCR processing.

**Acceptance Scenarios**:

1. **Given** a mobile user with `inbox.upload` permission, **When** they POST a photo to `/api/v1/inbox/capture` with the image file and optional metadata (vendor name, amount, date, notes), **Then** an InboxItem is created with status `pending`, the image is stored as an attachment, and the ExtractInboxDocumentJob is dispatched for AI extraction.

2. **Given** the receipt capture endpoint, **When** multiple images are submitted in a single request (front and back of receipt), **Then** all images are attached to the same InboxItem and the extraction job processes them together.

3. **Given** a captured receipt, **When** the ExtractInboxDocumentJob completes, **Then** the InboxItem is updated with extracted fields (vendor, date, amount, tax, line items) and the status transitions to `ready_for_review` -- matching the existing 019-AIX flow.

4. **Given** the user provides optional metadata (vendor name) alongside the photo, **When** extraction runs, **Then** user-provided metadata takes precedence over OCR-extracted values where both exist.

5. **Given** the captured image is blurry or unreadable, **When** extraction fails to identify key fields, **Then** the InboxItem status transitions to `needs_attention` with a reason, and the user receives a push notification (if registered) indicating manual review is needed.

6. **Given** the user has no network connectivity at capture time, **When** the mobile app queues the capture locally and submits it when connectivity returns, **Then** the endpoint accepts the request with a `captured_at` timestamp (from the device) that is stored on the InboxItem for accurate chronological ordering.

---

### User Story 7 -- Biometric Auth Support (Priority: P2)

As a mobile user, I want to unlock the app with FaceID or TouchID instead of entering my password every time so that access is fast and secure.

**Why this priority**: Biometric auth dramatically improves mobile UX. Without it, users must enter their email and password every time their token expires -- a significant friction point. However, it only works after token auth (Story 1) is in place, and the backend work is minimal (token refresh endpoint).

**Independent Test**: Can be tested by issuing a token, calling the refresh endpoint with the existing token, and verifying a new token is returned without requiring password re-entry.

**Acceptance Scenarios**:

1. **Given** a user with a valid, non-expired API token, **When** they POST to `/api/v1/auth/token/refresh`, **Then** the existing token is revoked and a new token is issued for the same device_name, extending the session without requiring credentials.

2. **Given** a token that has been inactive for longer than the configurable `token_refresh_window` (default 30 days), **When** a refresh is attempted, **Then** the refresh is denied with 401 and the user must re-authenticate with full credentials. This prevents indefinite token chains from a single login.

3. **Given** a user with MFA enabled, **When** they refresh a token within the `token_refresh_window`, **Then** MFA is NOT re-required. The biometric unlock on the device is considered the second factor. MFA is only required on initial login.

4. **Given** a user changes their password on the web app, **When** any mobile token attempts a refresh, **Then** all existing tokens are invalidated and the user must re-authenticate with new credentials on all devices.

5. **Given** a workspace admin deactivates a user, **When** the user's next mobile request or token refresh is attempted, **Then** it is rejected with 401 and all of that user's tokens are revoked.

---

### User Story 8 -- Rate Limiting Review for Mobile (Priority: P3)

As the platform team, we want rate limits that accommodate mobile request patterns -- which tend to be bursty (app open triggers many parallel requests) but lower overall volume -- so that mobile users do not hit 429 errors during normal usage.

**Why this priority**: The current rate limits are tuned for the web SPA, which spreads requests more evenly. Mobile apps tend to burst on launch (fetching dashboard, notifications, workspace state simultaneously). However, this is a tuning exercise, not a blocker -- the app is functional with existing limits, just occasionally throttled.

**Independent Test**: Can be tested by simulating a mobile app launch pattern (15 parallel requests within 2 seconds) against the API and verifying none are rate-limited.

**Acceptance Scenarios**:

1. **Given** the current global rate limit is 60 requests/minute per user, **When** a mobile user opens the app and fires 20 requests in 3 seconds (dashboard, notifications, workspace, contacts, recent invoices, bank transactions, etc.), **Then** none of the requests are rate-limited because the burst is within the per-minute allowance.

2. **Given** a token-authenticated request, **When** rate limiting is evaluated, **Then** limits are applied per-user (not per-token), so a user on multiple devices shares a single rate limit pool.

3. **Given** the API returns a 429 response, **When** the response is sent, **Then** it includes `Retry-After` (seconds), `X-RateLimit-Limit` (max requests), `X-RateLimit-Remaining` (remaining requests), and `X-RateLimit-Reset` (Unix timestamp) headers so the mobile client can implement intelligent backoff.

4. **Given** certain endpoints are heavier than others (report generation, search), **When** those endpoints are called, **Then** they consume a higher weight from the rate limit pool (e.g., report generation = 5 units, standard GET = 1 unit).

5. **Given** the platform team needs to adjust limits without a deployment, **When** rate limit configuration is updated in the database (per plan tier), **Then** new limits take effect within 60 seconds via config cache refresh.

---

### User Story 9 -- Mobile-Optimised Response Payloads (Priority: P3)

As a mobile user on a cellular connection, I want API responses to be as small as possible so that pages load quickly and I use less data.

**Why this priority**: Full web API payloads include data that mobile views do not display (verbose relationship objects, metadata fields, HTML-formatted content). Trimming responses reduces transfer size and parse time. This is lower priority because the app works with full payloads -- it is an optimisation, not a requirement.

**Independent Test**: Can be tested by making a request with the mobile flag, comparing response size against the standard response, and verifying all required mobile fields are present while verbose fields are omitted.

**Acceptance Scenarios**:

1. **Given** a mobile client includes the `X-Client-Platform: mobile` header on a request, **When** the API processes the response, **Then** API Resources check for this header and omit fields flagged as `web_only` -- reducing response payload size.

2. **Given** the contacts index endpoint returns 15 fields per contact on web, **When** a mobile request is made, **Then** the response includes only the 8 fields needed for the mobile list view (uuid, name, type, email, phone, outstanding_balance, overdue_amount, avatar_url). The full resource is still available at the detail endpoint.

3. **Given** a mobile request for invoices, **When** the response is returned, **Then** it omits `html_body`, `email_history`, and `audit_trail` fields -- which are only used on web detail pages. The mobile detail view fetches the full resource individually.

4. **Given** the `X-Client-Platform: mobile` header is NOT present, **When** any request is made, **Then** the response is identical to the current behaviour -- no fields are omitted. Existing web functionality is not affected.

5. **Given** a mobile list endpoint, **When** the default `per_page` is evaluated, **Then** mobile defaults to `per_page=25` (vs web's `per_page=50`) to reduce initial payload size. The client can override this with an explicit `per_page` parameter.

6. **Given** a mobile response, **When** it is compressed, **Then** the API supports and encourages `Accept-Encoding: gzip` (already standard in Laravel) and the response includes `Content-Encoding: gzip`. Mobile responses should average 40-60% smaller than web responses for list endpoints.

---

### Edge Cases

- **What happens when a user authenticates via token AND has an active cookie session?** Both auth methods work independently. Sanctum resolves the first valid guard (token or cookie). The user sees one combined session in the tokens list for the cookie session (labelled "Web Session").
- **What happens when a device token is registered for a user who is later removed from a workspace?** Device registrations are user-scoped, not workspace-scoped. The device still receives push notifications for other workspaces. Workspace removal only stops notifications for that workspace.
- **What happens when the same device token is registered twice?** The system upserts on device_token -- the existing registration is updated with the new API token, not duplicated.
- **What happens when the mobile app submits a receipt capture but the user's workspace has exceeded its storage quota?** The upload is rejected with 413 and a message indicating the storage limit has been reached. The mobile app should prompt the user to upgrade or free space.
- **What happens when a token refresh is attempted with a revoked token?** The refresh is rejected with 401. The user must re-authenticate with full credentials.
- **What happens when FCM/APNs credentials are not configured for the workspace?** Push notifications silently degrade -- the notification is created in-app (024-NTF) but no push is attempted. An admin-visible warning is shown in workspace settings.
- **What happens when a mobile client sends `X-Client-Platform: mobile` to a webhook or event-sourcing endpoint?** The header is ignored for non-GET endpoints. Mobile payload optimisation only applies to read responses.
- **What happens when the sync manifest endpoint is called on a workspace with 10,000+ contacts?** The manifest returns metadata (counts, ETags) not the data itself. Even for large workspaces, the manifest response is under 5KB.

---

## Requirements

### Functional Requirements

**Token-Based Authentication**
- **FR-001**: System MUST support Sanctum personal access token issuance via POST `/api/v1/auth/token` accepting email, password, and device_name.
- **FR-002**: System MUST support two-factor authentication for token issuance -- returning an interim `mfa_required` response and accepting TOTP codes at `/api/v1/auth/token/mfa`.
- **FR-003**: System MUST support individual token revocation via POST `/api/v1/auth/token/revoke` (current token) and POST `/api/v1/auth/tokens/{id}/revoke` (specific token by ID).
- **FR-004**: System MUST support listing active tokens via GET `/api/v1/auth/tokens` with device_name, last_used_at, and created_at -- never exposing the token value.
- **FR-005**: System MUST ensure token-authenticated requests bypass CSRF verification and `EnsureFrontendRequestsAreStateful` middleware.
- **FR-006**: System MUST support token refresh via POST `/api/v1/auth/token/refresh` -- issuing a new token and revoking the old one without requiring credentials.
- **FR-007**: System MUST enforce a configurable `token_refresh_window` (default 30 days). Tokens inactive beyond this window require full re-authentication.
- **FR-008**: System MUST revoke all user tokens when the user's password is changed.
- **FR-009**: System MUST revoke all user tokens when the user is deactivated by a workspace admin.

**Push Notifications**
- **FR-010**: System MUST support device registration via POST `/api/v1/devices` accepting device_token, platform (ios/android), and device_name.
- **FR-011**: System MUST upsert device registrations on device_token -- preventing duplicate registrations for the same device.
- **FR-012**: System MUST deliver push notifications via FCM (Android) and APNs (iOS) when in-app notifications (024-NTF) are created for users with registered devices.
- **FR-013**: System MUST respect existing NotificationPreference settings -- suppressing push for disabled categories.
- **FR-014**: System MUST support per-device push preferences via GET/PATCH `/api/v1/devices/{id}/preferences`.
- **FR-015**: System MUST soft-delete device registrations when the associated API token is revoked.
- **FR-016**: System MUST soft-delete device registrations when FCM/APNs returns an "unregistered" or "invalid token" error.
- **FR-017**: System MUST include `notification_id`, `subject_type`, `subject_id`, and `workspace_id` in push notification payloads for deep linking.
- **FR-018**: System MUST silently degrade when FCM/APNs credentials are not configured -- creating in-app notifications without attempting push delivery.

**API Stability**
- **FR-019**: System MUST return `Content-Type: application/json` for all API responses (success and error) on all v1 routes.
- **FR-020**: System MUST return JSON 401 (not redirect) for unauthenticated API requests with `Accept: application/json`.
- **FR-021**: System MUST return JSON 422 with standard validation error format for all validation failures.
- **FR-022**: System MUST produce an API compatibility manifest listing every endpoint, its auth method(s), response format, and mobile notes.

**Offline Caching**
- **FR-023**: System MUST include `ETag` and `Last-Modified` response headers on designated offline-cacheable endpoints: chart-accounts, contacts, invoices (index), bills (index), bank-transactions (index), workspace settings.
- **FR-024**: System MUST return 304 Not Modified for conditional requests with valid `If-None-Match` or `If-Modified-Since` headers when data has not changed.
- **FR-025**: System MUST expose a sync manifest endpoint (GET `/api/v1/sync/manifest`) returning each cacheable resource's current ETag, record count, and last_modified_at timestamp.

**Image & File Optimisation**
- **FR-026**: System MUST generate on-demand image thumbnails (400px max edge, WebP, quality 80) at `/api/v1/attachments/{uuid}/thumbnail`.
- **FR-027**: System MUST generate on-demand image previews (1200px max edge, WebP, quality 85) at `/api/v1/attachments/{uuid}/preview`.
- **FR-028**: System MUST cache generated variants in S3 keyed by attachment UUID and variant name.
- **FR-029**: System MUST include `thumbnail_url` and `preview_url` in attachment list responses.
- **FR-030**: System MUST compress uploaded images exceeding 10MB to a maximum of 5MB, preserving dimensions.

**Receipt Capture**
- **FR-031**: System MUST accept photo uploads via POST `/api/v1/inbox/capture` with optional metadata (vendor, amount, date, notes).
- **FR-032**: System MUST support multi-image capture (up to 5 images) in a single request.
- **FR-033**: System MUST create an InboxItem with status `pending` and dispatch ExtractInboxDocumentJob for AI extraction.
- **FR-034**: System MUST accept a `captured_at` device timestamp for offline-queued captures.
- **FR-035**: System MUST prioritise user-provided metadata over OCR-extracted values where both exist.

**Rate Limiting**
- **FR-036**: System MUST apply rate limits per-user (not per-token) for token-authenticated requests.
- **FR-037**: System MUST include `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers on all responses.
- **FR-038**: System MUST support weighted rate limiting -- heavier endpoints (reports, search) consume more units from the rate limit pool.
- **FR-039**: System MUST support runtime rate limit configuration changes (per plan tier) without deployment, effective within 60 seconds.

**Mobile Response Optimisation**
- **FR-040**: System MUST support `X-Client-Platform: mobile` request header to trigger trimmed API Resource responses.
- **FR-041**: System MUST omit `web_only` flagged fields from responses when `X-Client-Platform: mobile` is present.
- **FR-042**: System MUST default to `per_page=25` for mobile list requests (overridable by explicit `per_page` parameter).
- **FR-043**: System MUST NOT alter response shape for requests without the `X-Client-Platform` header -- existing web behaviour is preserved.

### Key Entities

- **PersonalAccessToken** (Sanctum built-in): Extended with `device_name` (already supported by Sanctum), `last_used_at` (already supported). Fields: `id`, `tokenable_type`, `tokenable_id`, `name` (device_name), `token` (SHA-256 hash), `abilities` (JSON), `last_used_at`, `expires_at`, `created_at`, `updated_at`.

- **DeviceRegistration** (new): A user's mobile device registered for push notifications. Fields: `id`, `uuid`, `user_id`, `personal_access_token_id` (FK to the API token used during registration), `device_token` (FCM/APNs token, unique), `platform` (enum: ios, android), `device_name` (string, e.g., "iPhone 15 Pro"), `push_enabled` (boolean, default true), `deleted_at` (soft delete), `created_at`, `updated_at`.

- **DevicePushPreference** (new): Per-device push notification category preferences. Fields: `id`, `device_registration_id`, `category` (NotificationCategory enum), `enabled` (boolean, default true), `created_at`, `updated_at`.

- **InboxItem** (existing, 019-AIX): Extended with `captured_at` (nullable datetime) for offline receipt captures. No structural changes -- receipt capture creates standard InboxItems with attachments.

- **Attachment** (existing, 012-ATT): No schema changes. Thumbnail and preview URLs are derived from the existing `path` field and served via new controller endpoints. Cached variants stored in S3 under `attachments/{uuid}/variants/`.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Token issuance endpoint responds in under 500ms at p95 (including password hash verification).
- **SC-002**: Push notification delivery latency (notification created to FCM/APNs API call) is under 5 seconds at p95.
- **SC-003**: 304 Not Modified responses account for 40%+ of cacheable endpoint requests from mobile clients within 30 days of launch.
- **SC-004**: Mobile-optimised list responses are 40-60% smaller than standard web responses (measured by Content-Length).
- **SC-005**: Receipt capture to InboxItem creation completes in under 3 seconds at p95 (excluding extraction job).
- **SC-006**: Zero 429 rate-limit errors during simulated mobile app launch burst (20 parallel requests in 3 seconds).
- **SC-007**: 100% of v1 API endpoints return JSON for both success and error responses (audit pass rate).
- **SC-008**: Thumbnail generation completes in under 2 seconds at p95, with subsequent requests served from cache in under 200ms.

---

## Clarifications

### Session 2026-04-01

- Q: Should token auth replace cookie auth for the web frontend? -> A: No. Cookie auth remains the primary method for the Next.js SPA. Token auth is additive, specifically for mobile and third-party API clients. Both auth guards coexist via Sanctum's multi-guard resolution.
- Q: Should we use Laravel's built-in notification channels (mail, database, broadcast) for push? -> A: Use a custom `PushChannel` notification channel that dispatches to FCM/APNs. This integrates with the existing 024-NTF system via the CreateNotification action -- when a notification is created, a listener checks for registered devices and dispatches push. We do NOT use Laravel's built-in `DatabaseNotification` -- our custom `Notification` model (024-NTF) is the source of truth.
- Q: How should the mobile app identify itself? -> A: Via the `X-Client-Platform: mobile` header on all requests. This is simpler than content negotiation (`Accept: application/vnd.moneyquest.mobile+json`) and avoids complexity with CDN caching. The header is optional -- omitting it gives standard web responses.
- Q: Should device registrations be workspace-scoped? -> A: No. Device registrations are user-scoped. A user on three workspaces receives push notifications from all three via the same device. The `workspace_id` in the push payload tells the mobile app which workspace context to open.
- Q: What FCM/APNs library should we use? -> A: `laravel-notification-channels/fcm` for Firebase Cloud Messaging (covers both Android and iOS via FCM HTTP v1 API). APNs-specific delivery deferred unless FCM proves insufficient for iOS.
- Q: Should the sync manifest include delta sync (changes since last sync)? -> A: Not in v1. The manifest provides ETags and timestamps for conditional GET requests. True delta sync (event log replay for a client) is deferred. The client uses conditional requests per-resource for efficient incremental sync.
- Q: Should compressed images preserve EXIF data? -> A: Strip all EXIF data except orientation. EXIF data can contain GPS coordinates and personal metadata that should not be stored or served.
- Q: What about token expiry? -> A: Tokens do not expire by default (consistent with Sanctum's default). The `token_refresh_window` controls refresh eligibility, not token validity. A token remains valid for API requests until explicitly revoked or the user's password changes. Workspace admins can force-revoke all tokens for a user.
