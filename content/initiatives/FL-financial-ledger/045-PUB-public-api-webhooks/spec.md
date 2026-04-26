---
title: "Feature Specification: Public REST API & Outbound Webhooks"
---

# Feature Specification: Public REST API & Outbound Webhooks

**Feature Branch**: `045-PUB-public-api-webhooks`
**Created**: 2026-03-19
**Status**: Draft
**Epic**: 045-PUB
**Initiative**: FL — Financial Ledger Platform
**Effort**: L (4 sprints)
**Depends On**: 003-AUT (complete), 009-BIL (complete)

### Out of Scope

- **OAuth2 / OpenID Connect flows** — v1 uses API key authentication only. OAuth for third-party app authorization deferred to v2
- **GraphQL API** — v1 is REST-only. GraphQL deferred based on partner demand
- **Webhook transformation/filtering** — v1 sends the full event payload. Custom payload templates and field-level filtering deferred
- **API usage billing/metering** — v1 enforces rate limits by plan tier but does not charge per API call
- **Sandbox/test mode** — v1 API keys operate against live workspace data. A sandbox environment with synthetic data deferred
- **Zapier/Make native integrations** — the API enables these, but pre-built integration apps are a separate initiative

---

## Overview

MoneyQuest has a comprehensive internal API powering the Next.js frontend (~200 routes). This epic exposes a documented, versioned, rate-limited public API for third-party integrations — payroll imports, CRM syncing, custom dashboards, and automation tools. It also adds outbound webhooks so external systems can react to MoneyQuest events in real-time.

The API is the foundation for the platform ecosystem. Every integration partner, custom script, and Zapier-style automation depends on it.

---

## User Scenarios & Testing

### User Story 1 — API Key Management (Priority: P1)

A workspace admin wants to create API keys for third-party integrations, each with specific permissions and rate limits. Today there is no way for external systems to authenticate against MoneyQuest — only the internal SPA session auth exists. The admin needs to generate keys scoped to exactly the data a given integration should access, and revoke them instantly if compromised.

**Why this priority**: Without auth, no API access is possible. Keys are the gateway to the entire public API surface. Every other story in this epic depends on a valid authentication mechanism being in place.

**Independent Test**: Can be tested by creating an API key, using it to make a request, and verifying it works with correct permissions and is rejected for unauthorised scopes.

**Acceptance Scenarios**:

1. **Given** a workspace admin opens API Settings, **When** they click "Create API Key", **Then** they can name the key, select permission scopes (read:contacts, write:invoices, etc.), and the key is generated and shown once.

2. **Given** an API key with "read:contacts" scope, **When** a request to GET /api/v1/contacts is made, **Then** it succeeds. **When** a request to POST /api/v1/invoices is made, **Then** it returns 403 Forbidden.

3. **Given** an API key exceeds 60 requests/minute, **When** the next request arrives, **Then** a 429 Too Many Requests response is returned with a Retry-After header.

4. **Given** a compromised key, **When** the admin revokes it, **Then** all subsequent requests with that key return 401 Unauthorized immediately.

---

### User Story 2 — Public API Documentation (Priority: P1)

A developer integrating with MoneyQuest wants clear, browsable API documentation with request/response examples, authentication guides, and error reference. Without docs, developers must reverse-engineer the API from trial and error — a non-starter for ecosystem adoption.

**Why this priority**: An undocumented API is an unused API. Docs are as important as the endpoints themselves. Developer experience at the documentation layer directly determines integration adoption rate.

**Independent Test**: Can be tested by verifying the docs site loads, all endpoints are listed, and example requests can be copied and used successfully.

**Acceptance Scenarios**:

1. **Given** a developer visits the API docs page, **When** it loads, **Then** they see all available endpoints grouped by domain (Contacts, Invoices, Bills, Journal Entries, Bank Transactions, Chart of Accounts, Jobs, Reports).

2. **Given** the developer views an endpoint, **When** they expand it, **Then** they see: HTTP method, URL, request parameters, request body schema, response schema, example request (curl), and example response.

3. **Given** the developer wants to try an endpoint, **When** they enter their API key in the docs playground, **Then** they can make live requests and see actual responses.

---

### User Story 3 — Outbound Webhook Configuration (Priority: P1)

A workspace admin wants to configure webhook URLs that receive real-time HTTP POST notifications when key events occur in MoneyQuest. Today, external systems must poll the API to detect changes — wasteful for the platform and slow for the integration. Webhooks flip the model: MoneyQuest pushes events as they happen.

**Why this priority**: Webhooks enable real-time integrations without polling. They're the push counterpart to the pull API. Together, API + webhooks form the complete integration surface that the ecosystem needs.

**Independent Test**: Can be tested by configuring a webhook URL, triggering an event, and verifying the webhook delivery with correct payload.

**Acceptance Scenarios**:

1. **Given** a workspace admin opens Webhook Settings, **When** they click "Add Webhook", **Then** they can enter a URL, select event types (invoice.paid, payment.received, reconciliation.completed, contact.created, journal_entry.posted), and optionally set a secret for signature verification.

2. **Given** a webhook is configured for "invoice.paid", **When** a payment is recorded that fully pays an invoice, **Then** a POST request is sent to the configured URL within 30 seconds with the event payload including invoice details and payment amount.

3. **Given** a webhook delivery fails (non-2xx response), **When** the first attempt fails, **Then** the system retries 3 times with exponential backoff (30s, 2min, 10min) and logs each attempt.

4. **Given** the admin views the webhook delivery log, **When** they expand a delivery, **Then** they see the request payload, response status, response body, and timing for each attempt.

---

### User Story 4 — API Versioning (Priority: P2)

The API must support versioning so existing integrations don't break when new features are added. As MoneyQuest evolves, response shapes and endpoint behaviour will change. Integrations built today must continue working when v2 ships next year.

**Why this priority**: Without versioning, any API change risks breaking all integrations simultaneously. It's lower priority than the initial API launch but must be architecturally planned from day one — retrofitting versioning is extremely painful.

**Independent Test**: Can be tested by making requests to /api/v1/ and verifying the response format matches v1 spec regardless of any v2 additions.

**Acceptance Scenarios**:

1. **Given** the current API version is v1, **When** a request is made to /api/v1/contacts, **Then** the response follows the v1 schema.

2. **Given** a v2 is released with a breaking change, **When** existing integrations continue to use /api/v1/, **Then** they continue to work unchanged.

3. **Given** a deprecated API version, **When** requests are made, **Then** a Deprecation header is included with the sunset date.

---

### Edge Cases

- What happens when a webhook URL is consistently failing? After 10 consecutive failures, the webhook is automatically disabled and the admin is notified via email.
- What happens when a webhook payload is too large? Payloads are capped at 256KB. Events exceeding this include a summary with a link to fetch the full resource via API.
- What happens when an API key is used from a different workspace? API keys are workspace-scoped. Requests including a different workspace_id return 403.
- What about webhook signature verification? Each webhook includes an X-MoneyQuest-Signature header using HMAC-SHA256 with the webhook secret.
- What happens when an API key is used after the workspace's subscription lapses? The key returns 403 with a message indicating the workspace plan does not include API access.
- What happens when a webhook endpoint returns a 301/302 redirect? The system does NOT follow redirects — the delivery is treated as a failure. Admins must configure the final URL directly.
- What happens when two API keys have overlapping scopes? Each key is evaluated independently. Revoking one does not affect the other.

---

## Requirements

### Functional Requirements

**API Key Authentication**
- **FR-001**: System MUST support API key creation with a user-defined name, selectable permission scopes, and workspace binding.
- **FR-002**: System MUST enforce per-key permission scopes — requests outside the key's scopes return 403 Forbidden.
- **FR-003**: System MUST enforce rate limiting per API key (default 60 req/min, configurable per plan tier).
- **FR-004**: System MUST support immediate key revocation — all subsequent requests return 401 Unauthorized.
- **FR-005**: System MUST scope all API keys to the current workspace. A key from workspace A cannot access workspace B data.
- **FR-006**: System MUST display the API key value exactly once at creation time. Subsequent views show only the key prefix (e.g., `mq_live_abc...`).

**Public API Endpoints**
- **FR-007**: System MUST expose a versioned public REST API at /api/v1/ covering: contacts, invoices, bills, journal entries, bank transactions, chart of accounts, jobs, and reports.
- **FR-008**: System MUST support API versioning with backward-compatible changes within a version and deprecation notices (Deprecation header with sunset date) for version sunsets.
- **FR-009**: System MUST return responses in the same format as internal API Resources (consistent shape between internal and public API).

**API Documentation**
- **FR-010**: System MUST provide interactive API documentation with endpoint reference grouped by domain, request/response schemas, and curl examples.
- **FR-011**: System MUST include a live playground in the docs where developers can authenticate with their API key and make real requests.
- **FR-012**: System MUST auto-generate documentation from OpenAPI/Swagger spec to ensure docs stay in sync with the actual API.

**Outbound Webhooks**
- **FR-013**: System MUST support outbound webhook configuration with event type selection and URL registration.
- **FR-014**: System MUST deliver webhooks within 30 seconds of the triggering event.
- **FR-015**: System MUST retry failed webhook deliveries 3 times with exponential backoff (30s, 2min, 10min).
- **FR-016**: System MUST provide a webhook delivery log with request payload, response status, response body, and timing for each attempt.
- **FR-017**: System MUST include HMAC-SHA256 signature verification on all webhook deliveries via the X-MoneyQuest-Signature header.
- **FR-018**: System MUST auto-disable webhooks after 10 consecutive delivery failures and notify the workspace admin.
- **FR-019**: System MUST scope all webhook configurations to the current workspace.
- **FR-020**: System MUST cap webhook payloads at 256KB. Events exceeding this include a summary with a resource link.

### Key Entities

- **API Key**: A workspace-scoped authentication token. Fields: `id`, `workspace_id`, `name` (user-defined label), `key_hash` (bcrypt hash of the key — plaintext never stored), `key_prefix` (first 8 chars for display), `scopes` (JSON array of permission strings, e.g., `["read:contacts", "write:invoices"]`), `rate_limit` (requests per minute, default 60), `last_used_at` (timestamp of most recent request), `revoked_at` (nullable, set on revocation), `expires_at` (nullable, optional expiry), `created_at`, `updated_at`.
- **Webhook Endpoint**: A configured URL for receiving event notifications. Fields: `id`, `workspace_id`, `url` (HTTPS endpoint), `secret` (HMAC signing secret), `event_types` (JSON array of subscribed events, e.g., `["invoice.paid", "contact.created"]`), `is_enabled` (boolean, auto-set to false after 10 consecutive failures), `consecutive_failures` (int, reset to 0 on success), `created_at`, `updated_at`.
- **Webhook Delivery**: A log record for each delivery attempt. Fields: `id`, `webhook_endpoint_id`, `event_type` (string), `payload` (JSON), `http_status` (nullable int), `response_body` (nullable text, truncated to 10KB), `attempt_number` (1-4), `delivered_at` (timestamp of attempt), `duration_ms` (round-trip time), `created_at`.
- **API Version**: A versioned schema set defining request/response contracts for all endpoints. Not a database entity — expressed as route prefix (/api/v1/) and API Resource class namespacing.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: 20% of Professional/Enterprise workspaces create at least one API key within 6 months of launch.
- **SC-002**: Webhook delivery success rate (first attempt) of 95%+.
- **SC-003**: API documentation page averages 5+ minutes per visit (indicating engaged developers).
- **SC-004**: Zero breaking changes within a published API version.
- **SC-005**: API key creation to first successful authenticated request takes under 2 minutes (measured via onboarding funnel).
- **SC-006**: Webhook delivery latency (event trigger to first HTTP attempt) is under 30 seconds at p95.

---

## Clarifications

### Session 2026-03-19

- Q: Should the public API reuse existing internal API controllers or have separate ones? → A: Separate controller layer with shared Actions. Internal controllers use Sanctum session auth and return internal API Resources. Public controllers use API key auth, enforce scopes, and return versioned API Resources. The business logic (Actions) is shared.
- Q: Should API keys support expiry dates? → A: Optional — admins can set an expiry date at creation time. Keys without an expiry last until revoked. Expired keys return 401 with a message indicating expiry.
- Q: What plan tiers get API access? → A: Professional and Enterprise only. Free and Starter plans see the API Settings page but with an upgrade prompt. Rate limits scale with plan: Professional = 60 req/min, Enterprise = 300 req/min.
- Q: Should webhook payloads include the full resource or just an ID? → A: Full resource payload (matching the API Resource format) up to 256KB. This avoids the "webhook then fetch" anti-pattern that adds latency to integrations.
- Q: How should the OpenAPI spec be maintained? → A: Auto-generated from Laravel route definitions and API Resource classes using a package like Scramble or L5-Swagger. Manual overrides for descriptions and examples. Spec file committed to repo.
- Q: Should webhooks support custom headers? → A: Not in v1. The X-MoneyQuest-Signature header plus standard Content-Type is sufficient. Custom headers add complexity with minimal value.
