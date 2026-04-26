---
title: "Feature Specification: Feed Pipeline Infrastructure"
---

# Feature Specification: Feed Pipeline Infrastructure

**Feature Branch**: `048-FPL-feed-pipeline-infrastructure`
**Created**: 2026-03-19
**Status**: Draft
**Epic**: 048-FPL
**Initiative**: FL — Financial Ledger Platform
**Effort**: XL (6 sprints)
**Depends On**: 004-BFR (complete), 021-BRR (complete), 002-CLE (complete), 018-ITR (planned), 024-NTF (planned)

### Out of Scope

- **Individual feed source implementations** — this epic builds the pipes, not the water. Bank feeds (Basiq), Redbook, ASX tickers, RP Data, and other providers are separate epics that plug into this pipeline.
- **AI auto-classification model training** — v1 uses the existing rules engine with AI suggestions from the chatbot (021-AIQ). Custom ML models for classification deferred.
- **Real-time streaming ingestion** — v1 uses scheduled polling and webhook receipt. WebSocket push from providers deferred.
- **Cross-workspace feed sharing** — each feed source is scoped to a single workspace. Practice-level feed management deferred.
- **Feed item editing** — normalised payloads are immutable once ingested. Users classify and transform, they don't edit the source data.
- **Custom provider SDK** — v1 providers are internal PHP classes. An external plugin/SDK for third-party providers deferred.

---

## Overview

MoneyQuest needs a universal, scalable feed pipeline — the core engine that ingests external data from any source and converts it into accounting entries. Bank transactions are the first and most common feed, but the architecture must generalise to any data source: asset price APIs, market data, property valuations, government rate changes, and more. This epic defines the infrastructure layer — the abstractions, scheduling, error handling, and JE generation that every feed source shares. The existing bank feed infrastructure (004-BFR) migrates to become the first `FeedProvider` implementation.

---

## Architecture

### Pipeline Stages

Every feed follows the same lifecycle:

```
Source → Ingest → Normalise → Match/Classify → Transform → Generate JE → Notify
```

1. **Source** — External API, webhook, file upload, or manual entry. Each source has a `FeedProvider` implementation.
2. **Ingest** — Pull or receive raw data. Handles auth, pagination, rate limits, retries. Stores raw payload for auditability.
3. **Normalise** — Convert source-specific format into a canonical `FeedItem` shape. One normaliser per source type.
4. **Match/Classify** — Pattern matching against existing ledger data. Uses rules engine (extending 021-BRR bank reconciliation rules). AI-assisted classification for ambiguous items.
5. **Transform** — Map classified items to journal entry line data (accounts, amounts, direction, tax codes).
6. **Generate JE** — Create draft or auto-posted journal entries via existing ledger actions. Respects workspace settings for auto-post thresholds.
7. **Notify** — Surface items needing review in the Intray (018-ITR), entity feed, and notifications (024-NTF).

### Scaling Design

- **Queue-based processing** — Each sync job is dispatched to a Laravel queue. Feed items are processed individually so failures don't block the batch.
- **Idempotent ingestion** — `external_id` per source ensures re-syncs don't create duplicates.
- **Backpressure** — If a workspace has > N unprocessed items, pause further syncs until the backlog clears.
- **Retry with exponential backoff** — Failed items retry up to 3 times with increasing delays. After 3 failures, status becomes `error` and surfaces in Intray.
- **Raw payload preservation** — The original API response is stored immutably. If normalisers improve, items can be re-processed from raw data.
- **Provider isolation** — Each provider is a self-contained class. A failing provider cannot affect other sources.
- **Tenant isolation** — All processing is workspace-scoped. Queue jobs carry `workspace_id` for proper scoping.
- **Observable** — Every stage transition is logged. Feed health dashboard shows sync status, error rates, processing lag.

### Rules Engine (extending 021-BRR)

The existing bank reconciliation rules engine is generalised to work with any feed type:

- Rules have a `feed_type` scope (bank_transaction, asset_price, etc.)
- Conditions match on normalised payload fields (not raw data)
- Actions map to: account assignment, tax code, contact, job, description template
- Rule priority ordering with first-match semantics
- AI suggestion endpoint for unmatched items (leveraging 021-AIQ chatbot)
- Learning from user corrections — when a user manually classifies an item, suggest creating a rule

### Event Sourcing Integration

Feed-generated journal entries flow through the existing event-sourced ledger:

- `FeedItemProcessed` domain event captures the full provenance (source, raw data, classification, rule applied)
- JEs created by feeds are tagged with `source_type: feed` and `feed_item_id` for traceability
- Revaluation entries (from price feeds) use specific journal entry types that can be filtered in reports

---

## User Scenarios & Testing

### User Story 1 — Feed Source Management (Priority: P1)

A workspace owner wants to connect, configure, and monitor external data feeds that automatically create accounting entries. Today, bank feeds are hard-wired through the Basiq integration. The owner needs a unified interface to manage all feed sources — banks, price feeds, and future data sources — from a single settings page with consistent connection, configuration, and monitoring patterns.

**Why this priority**: Without a way to connect and manage feed sources, no data enters the pipeline. This is the entry point for the entire system — every other story depends on sources being connectable and monitorable.

**Independent Test**: Can be tested by creating a workspace, connecting a mock feed provider, verifying it appears in the settings list with correct status, then pausing and disconnecting it.

**Acceptance Scenarios**:

1. **Given** I am a workspace owner on the Settings > Feeds page, **When** I click "Add Feed Source" and select a provider type (e.g., "Bank Account (Basiq)"), **Then** I am guided through the provider-specific connection flow and the source appears as "Active" with a sync schedule displayed.

2. **Given** a feed source is active, **When** I view the source detail page, **Then** I see: last sync timestamp, total items processed count, error count, current status, and sync schedule. I can pause, resume, or disconnect the source.

3. **Given** a feed source has failed items, **When** I view the source detail, **Then** I see the error count with expandable details per failed item, and can retry failed items individually or in bulk via a "Retry All Failed" action.

4. **Given** a feed source is paused, **When** I click "Resume", **Then** the source immediately queues a sync job and the status returns to "Active".

5. **Given** I disconnect a feed source, **When** the disconnect completes, **Then** the source status becomes "Disconnected", no further syncs are scheduled, and existing feed items remain in the system for historical reference.

---

### User Story 2 — Automatic Classification & JE Generation (Priority: P1)

A bookkeeper wants incoming feed items to be automatically classified and converted to journal entries based on rules, so they don't have to manually categorise every transaction. The classification engine extends the existing bank reconciliation rules (021-BRR) to work with any feed type, and the system learns from manual corrections to improve future classifications.

**Why this priority**: Classification and JE generation are the core value of the pipeline — turning raw external data into accounting entries without manual work. Without this, the pipeline ingests data but produces no output.

**Independent Test**: Can be tested by seeding classification rules, syncing a batch of mock feed items, and verifying that matching items produce draft JEs while unmatched items remain in the queue with AI suggestions.

**Acceptance Scenarios**:

1. **Given** a bank transaction feed syncs 50 new transactions and classification rules exist, **When** processing completes, **Then** transactions matching existing rules are auto-classified with the rule's account, tax code, and contact assignments, and draft journal entries are created for each classified item.

2. **Given** a transaction does not match any classification rule, **When** I view it in the feed queue, **Then** I see AI-suggested classifications ranked by confidence score, and can accept a suggestion or manually classify the item.

3. **Given** I manually classify an unmatched feed item (selecting account, tax code, contact), **When** I save the classification, **Then** the system prompts "Create a rule for similar items?" with a pre-filled rule based on my classification. Accepting creates the rule; dismissing skips.

4. **Given** a workspace has auto-post enabled with a confidence threshold of 90%, **When** a feed item is classified with confidence >= 90%, **Then** the journal entry is auto-posted (not left as draft). Items below the threshold remain as draft JEs for review.

5. **Given** a classification rule maps a feed item to specific accounts, **When** the journal entry is generated, **Then** the JE lines have correct debit/credit directions, amounts in cents, and the JE is tagged with `source_type: feed` and `feed_item_id` for traceability.

---

### User Story 3 — Feed Ingestion & Processing Pipeline (Priority: P1)

A system administrator needs the pipeline to reliably ingest data from multiple providers, handle failures gracefully, and process items through all stages without data loss. The pipeline must be idempotent (re-syncs don't create duplicates), isolated per provider (one failing source doesn't affect others), and auditable (raw payloads preserved).

**Why this priority**: The pipeline's reliability is the foundation for user trust. If items are lost, duplicated, or silently fail, users cannot rely on the system for accounting. This is the engineering backbone that makes everything else work.

**Independent Test**: Can be tested by syncing items with known `external_id` values twice and verifying no duplicates, then simulating provider failures and verifying other sources continue processing.

**Acceptance Scenarios**:

1. **Given** a feed source syncs and returns items with `external_id` values, **When** the same source syncs again and returns overlapping items, **Then** items with existing `external_id` values are skipped (not duplicated) and only new items are ingested.

2. **Given** a feed item fails during processing (e.g., normalisation error), **When** the failure occurs, **Then** the item's status becomes "error" with the failure reason stored, the item is queued for retry with exponential backoff, and subsequent items in the batch continue processing.

3. **Given** a feed item has failed 3 times, **When** the third retry fails, **Then** the item's status becomes permanently "error" and it surfaces in the Intray (018-ITR) for manual attention.

4. **Given** a provider (e.g., Basiq) is experiencing an outage, **When** syncs for that provider fail, **Then** other providers in the same workspace continue syncing on schedule without interruption.

5. **Given** a feed item is ingested, **When** I inspect it via the API, **Then** the `raw_payload` field contains the exact original data from the provider (immutable), and the `normalised_payload` field contains the canonical shape produced by the normaliser.

6. **Given** a workspace has more than the configured backpressure threshold of unprocessed items, **When** the scheduler evaluates the next sync, **Then** it skips the sync and logs a backpressure event. Syncing resumes when the queue drops below the threshold.

---

### User Story 4 — Entity Feed View (Priority: P2)

A user wants to see a chronological feed of all incoming data across sources for their workspace. This is the "activity stream" for the entity — a single place to see everything flowing into the ledger from external sources, with the ability to drill into individual items and their linked journal entries.

**Why this priority**: The entity feed is a key usability feature but not a prerequisite for the pipeline to function. Users can manage feeds through settings and the Intray without it. The feed view adds a polished consumption layer.

**Independent Test**: Can be tested by creating feed items from multiple sources, loading the feed view, and verifying items appear in reverse-chronological order with correct source icons and statuses.

**Acceptance Scenarios**:

1. **Given** I am on the entity dashboard, **When** I view the Feed tab, **Then** I see all feed items in reverse-chronological order with: source icon, description, amount (formatted), status badge (pending/matched/posted/error), and timestamp.

2. **Given** the feed has 500+ items, **When** I scroll down, **Then** items load progressively via infinite scroll (cursor-based pagination) without page reloads.

3. **Given** I click a feed item that has a linked journal entry, **When** the detail expands, **Then** I see the classification applied, the rule that matched (if any), and a link to navigate to the journal entry detail page.

4. **Given** I click a feed item with status "pending" or "error", **When** the detail expands, **Then** I see the raw and normalised data, and for errors, the failure reason and a "Retry" button.

5. **Given** I want to filter the feed, **When** I use the source filter dropdown, **Then** the feed shows only items from the selected source. Status filter tabs (All, Pending, Posted, Error) are also available.

---

### User Story 5 — Feed Health Monitoring (Priority: P2)

A workspace admin wants to monitor the health of all feed sources and catch issues early — before stale data leads to incorrect financial reporting. The health dashboard surfaces sync delays, error rates, and processing backlogs so problems are visible at a glance.

**Why this priority**: Monitoring is essential for production reliability but doesn't block initial pipeline development. Once feeds are operational, monitoring becomes critical for ongoing trust and maintenance.

**Independent Test**: Can be tested by creating multiple feed sources with varying sync histories, loading the health dashboard, and verifying status indicators and alert triggers.

**Acceptance Scenarios**:

1. **Given** multiple feed sources are active, **When** I view Settings > Feeds, **Then** I see a health dashboard showing for each source: last sync time, items pending count, error count, processing lag (time since last processed item), and an overall status indicator (Healthy/Warning/Error).

2. **Given** a feed source has not synced in 2x its expected interval (e.g., hourly source hasn't synced in 2 hours), **When** the scheduler detects the overdue sync, **Then** the source status changes to "Warning", an alert is created in the Intray (018-ITR), and a notification is sent to workspace admins.

3. **Given** a feed source has an error rate above 20% over the last 100 items, **When** the health check runs, **Then** the source status changes to "Degraded" and a diagnostic summary is available showing the most common error types.

4. **Given** all feed sources are healthy, **When** I view the health dashboard, **Then** each source shows a green "Healthy" indicator with the time until next scheduled sync.

---

### Edge Cases

- **Duplicate external IDs across providers**: `external_id` is unique per `feed_source_id`, not globally. Two different providers can have items with the same external identifier without conflict.
- **Provider returns empty sync**: If a sync returns zero items, the `last_synced_at` is still updated and no error is raised. An empty sync is a valid result.
- **Normaliser changes after ingestion**: If a normaliser is updated (bug fix or improvement), existing items can be re-normalised from `raw_payload`. A "Re-process" action on the source triggers re-normalisation of all items.
- **Workspace deletion with active feeds**: When a workspace is deleted, all feed sources are disconnected (provider disconnect called), feed items are soft-deleted with the workspace, and scheduled syncs are cancelled.
- **Clock skew between provider and server**: Feed items use the provider's timestamp for ordering (stored in `normalised_payload`) but the server's timestamp for `created_at`. The feed view sorts by provider timestamp.
- **Concurrent syncs for the same source**: The scheduler uses a database lock per source to prevent overlapping syncs. If a sync is already running, the next scheduled sync is skipped.
- **Rule conflicts (multiple rules match)**: First-match semantics apply — rules are ordered by priority (lowest number first). The first matching rule wins. If priority is tied, the oldest rule takes precedence.
- **Feed item amount is zero**: Zero-amount items (e.g., bank fee reversals) are processed normally. A JE with zero-amount lines is valid in the ledger.
- **Provider rate limiting**: When a provider returns a rate limit response (HTTP 429), the sync job respects the `Retry-After` header and reschedules accordingly, up to the 3-retry maximum.

---

## Requirements

### Functional Requirements

**Feed Source Management**

- **FR-001**: System MUST support a `FeedSource` model scoped to `workspace_id` with fields: type (enum), provider (string), config (encrypted JSON), status (active/paused/error/disconnected), last_synced_at, next_sync_at.
- **FR-002**: System MUST support connecting a feed source via a `FeedProvider` interface with methods: `connect()`, `disconnect()`, `sync()`, `normalise()`, `getCapabilities()`.
- **FR-003**: System MUST support pausing and resuming feed sources. Pausing stops scheduled syncs; resuming triggers an immediate sync and restores the schedule.
- **FR-004**: System MUST support disconnecting a feed source, which calls the provider's `disconnect()` method, sets status to "disconnected", and preserves all existing feed items.
- **FR-005**: System MUST store provider credentials in encrypted JSON config, never in plaintext.

**Feed Ingestion & Processing**

- **FR-006**: System MUST store every ingested item as a `FeedItem` with: feed_source_id, external_id, raw_payload (immutable JSON), normalised_payload (JSON), status (pending/matched/classified/transformed/posted/skipped/error), classification (JSON), journal_entry_id (nullable FK), workspace_id, processed_at.
- **FR-007**: System MUST enforce uniqueness on (`feed_source_id`, `external_id`) to guarantee idempotent ingestion.
- **FR-008**: System MUST process feed items individually via queue jobs so that a failure on one item does not block subsequent items in the batch.
- **FR-009**: System MUST retry failed items up to 3 times with exponential backoff (30s, 2min, 10min). After 3 failures, status becomes permanently "error".
- **FR-010**: System MUST implement backpressure — if a workspace has more than a configurable threshold (default 500) of unprocessed items, further syncs are paused until the backlog clears.
- **FR-011**: System MUST preserve raw_payload immutably. Raw data is never modified after ingestion.

**Classification & Rules Engine**

- **FR-012**: System MUST extend the existing reconciliation rules (021-BRR) with a `feed_type` scope so rules can target specific feed types (bank_transaction, asset_price, etc.).
- **FR-013**: System MUST match feed items against rules using normalised payload fields with first-match semantics (lowest priority number wins).
- **FR-014**: System MUST support rule actions: account assignment, tax code, contact, job, and description template.
- **FR-015**: System MUST provide AI-suggested classifications for unmatched items via the existing chatbot infrastructure (021-AIQ), ranked by confidence score.
- **FR-016**: System MUST prompt users to create a rule when they manually classify an unmatched item, with the rule pre-filled from the manual classification.

**Journal Entry Generation**

- **FR-017**: System MUST generate journal entries from classified feed items via the existing event-sourced ledger actions (002-CLE).
- **FR-018**: System MUST tag feed-generated JEs with `source_type: feed` and `feed_item_id` for full traceability.
- **FR-019**: System MUST support workspace-configurable auto-post thresholds — JEs above the confidence threshold are auto-posted; below are created as drafts.
- **FR-020**: System MUST emit a `FeedItemProcessed` domain event capturing full provenance: source, raw data hash, classification details, rule applied, JE created.

**Scheduling & Orchestration**

- **FR-021**: System MUST provide a `FeedScheduler` service with an Artisan command (`feed:process-due`) that runs every minute, evaluating all active feed sources and dispatching sync jobs for sources past their `next_sync_at`.
- **FR-022**: System MUST use a database lock per feed source to prevent concurrent syncs of the same source.
- **FR-023**: System MUST update `next_sync_at` after each sync based on the source's configured polling interval.
- **FR-024**: System MUST support a `retryFailed()` action that re-queues all permanently errored items for a given source (resetting retry count).

**Feed Health & Monitoring**

- **FR-025**: System MUST provide a health dashboard endpoint returning per-source: last_synced_at, items_pending count, error_count, processing_lag, and overall status (healthy/warning/error/degraded).
- **FR-026**: System MUST flag sources as "Warning" when they have not synced in 2x their expected interval.
- **FR-027**: System MUST flag sources as "Degraded" when their error rate exceeds 20% over the last 100 items.
- **FR-028**: System MUST surface overdue and degraded sources in the Intray (018-ITR) and send notifications to workspace admins (024-NTF).

**Entity Feed View**

- **FR-029**: System MUST provide an API endpoint for feed items with cursor-based pagination, supporting filters by source and status.
- **FR-030**: System MUST return feed items in reverse-chronological order (by provider timestamp) with source metadata, description, amount, status, and linked JE reference.
- **FR-031**: System MUST support a feed item detail endpoint returning raw_payload, normalised_payload, classification details, matched rule, and linked JE.

### Key Entities

- **FeedSource**: Represents a connected external data provider for a workspace. Fields: id, workspace_id (FK), type (enum: bank_transaction, asset_price, market_data, property_valuation, custom), provider (string identifier e.g., "basiq", "redbook"), config (encrypted JSON — credentials, endpoints, polling interval), status (enum: active, paused, error, disconnected), last_synced_at (timestamp), next_sync_at (timestamp), created_at, updated_at. Scoped to workspace.

- **FeedItem**: A single piece of ingested external data at any stage of the pipeline. Fields: id, feed_source_id (FK), external_id (string — dedup key, unique per source), raw_payload (immutable JSON — original provider data), normalised_payload (JSON — canonical shape), status (enum: pending, matched, classified, transformed, posted, skipped, error), classification (JSON — matched rule ID, confidence score, suggested accounts), journal_entry_id (nullable FK — set once JE is created), workspace_id (FK), error_message (nullable text), retry_count (int, default 0), processed_at (nullable timestamp), created_at, updated_at. Unique constraint on (feed_source_id, external_id).

- **FeedProvider** (interface, not a model): Contract that each external data source must implement. Methods: connect(config): AuthResult, disconnect(source): void, sync(source, since): RawItem[], normalise(rawItem): NormalisedItem, getCapabilities(): ProviderCapabilities. Each provider is a self-contained PHP class in `app/Services/FeedProviders/`.

- **FeedProcessor** (service, not a model): Orchestrates the classify-transform-generate pipeline for a single feed item. Methods: process(feedItem): ProcessResult, classify(feedItem): Classification, transform(feedItem, classification): JournalEntryLineData[], generateEntry(feedItem, lines): JournalEntry.

- **FeedScheduler** (service, not a model): Manages sync scheduling and orchestration. Methods: scheduleSync(source): void, processDueFeeds(): void (called by Artisan command every minute), retryFailed(source): void.

---

## Success Criteria

- **SC-001**: Feed sync completes within 30 seconds for up to 500 items per batch.
- **SC-002**: Failed items do not block processing of subsequent items in the same batch — verified by test with a poisoned item mid-batch.
- **SC-003**: Raw payloads are retained immutably for minimum 7 years (audit compliance) — verified by migration constraint (no `raw_payload` update allowed).
- **SC-004**: Feed processing is horizontally scalable — adding queue workers increases throughput linearly (no shared mutable state beyond the database).
- **SC-005**: Zero data loss on acknowledged items — once a provider returns data and it is acknowledged, it must be persisted before any processing begins.
- **SC-006**: Idempotent ingestion — re-syncing the same items produces zero duplicates, verified by test syncing 100 items twice and asserting count remains 100.
- **SC-007**: Provider isolation — a failing provider does not affect sync or processing of other providers in the same workspace, verified by test with one erroring and one healthy provider.
- **SC-008**: Classification rules match with first-match semantics — verified by test with overlapping rules asserting the highest-priority rule wins.
- **SC-009**: The existing bank feed infrastructure (004-BFR Basiq provider) successfully migrates to the FeedProvider interface with zero regression in bank transaction syncing.
- **SC-010**: Feed health dashboard loads in under 1 second for workspaces with up to 10 active feed sources.

---

## Clarifications

### Session 2026-03-19

- **Q**: Why build a pipeline abstraction instead of direct integrations per data source? **A**: The universal ledger vision (tracking any asset class — vehicles, equities, property, crypto, collectibles) requires continuous external data. Without a shared pipeline, each new source becomes a bespoke integration with its own scheduling, error handling, retry logic, and JE generation — leading to fragile, duplicated code. The pipeline is the engineering backbone that makes the universal ledger scalable.

- **Q**: How does this relate to the existing bank feed infrastructure (004-BFR)? **A**: The existing Basiq integration migrates to become the first `FeedProvider` implementation. The bank reconciliation rules engine (021-BRR) is generalised with a `feed_type` scope to work with any feed type. This is a refactor-and-extend, not a rewrite.

- **Q**: Should feed items be event-sourced? **A**: No. Feed items use a standard Eloquent model with status transitions. The event sourcing boundary is at JE creation — feed items flow through the pipeline and ultimately produce event-sourced journal entries via the existing CLE aggregate. A `FeedItemProcessed` domain event captures provenance.

- **Q**: How are accounts matched across different feed types? **A**: Rules match on normalised payload fields — each feed type has a defined set of matchable fields in its normalised shape. Bank transactions match on description, amount, merchant. Asset prices match on ticker symbol, asset class. The rules engine conditions are polymorphic on feed type.

- **Q**: What happens if the rules engine and AI suggestions both fail to classify an item? **A**: The item stays in "pending" status and surfaces in the Intray (018-ITR) for manual classification. No JE is created until classification is complete. Users can always manually classify any pending item.
