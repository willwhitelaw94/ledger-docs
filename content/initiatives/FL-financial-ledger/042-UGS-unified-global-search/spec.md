---
title: "Feature Specification: Unified Global Search"
---

# Feature Specification: Unified Global Search

**Feature Branch**: `042-UGS-unified-global-search`
**Created**: 2026-03-19
**Status**: Draft
**Epic**: 042-UGS
**Initiative**: FL — Financial Ledger Platform
**Effort**: M (2 sprints)
**Depends On**: 002-CLE (complete), 006-CCM (complete), 005-IAR (complete), 004-BFR (complete), 008-JCT (complete)

### Out of Scope

- **Natural language search / AI-powered queries** — v1 uses keyword matching with typo tolerance only, not semantic or LLM-driven search
- **Cross-workspace search** — v1 scopes all results to the current workspace. Cross-workspace search (e.g., practice-wide) deferred to v2
- **Search analytics / popular queries dashboard** — no admin reporting on search usage patterns in v1
- **Saved searches / search bookmarks** — users can re-run recent searches but cannot save named search presets
- **Full-text document/attachment search** — v1 indexes structured record fields only, not PDF/file attachment contents
- **Custom search ranking / boosting rules per workspace** — v1 uses Meilisearch default ranking with sensible attribute ordering

---

## Overview

MoneyQuest currently has no way to search across entity types. Users looking for "Trilogy Care" must navigate to Contacts, then Invoices, then Journal Entries separately. This feature adds a unified search bar (Cmd+K) powered by Meilisearch that searches across contacts, invoices, bills, journal entries, bank transactions, chart accounts, and jobs — returning instant, typo-tolerant results. Meilisearch is chosen for its speed (<50ms p95), typo tolerance, faceted filtering, multi-tenancy support via tenant-scoped indexes, and simple self-hosting.

---

## User Scenarios & Testing

### User Story 1 — Cmd+K Global Search (Priority: P1)

A user wants to press Cmd+K (or click the search bar) from anywhere in the app and instantly find any record by name, number, amount, reference, or description. Today they must mentally map which section a record lives in and navigate there manually — a frustrating context switch that interrupts workflow. The command palette search should feel as fast and intuitive as Spotlight or Linear's Cmd+K.

**Why this priority**: This is the entire feature. Without the search bar, nothing else exists. Every other story depends on this core UI and search infrastructure being in place.

**Independent Test**: Can be tested by indexing seed data and verifying that typing a contact name returns results across multiple entity types within 100ms.

**Acceptance Scenarios**:

1. **Given** the user presses Cmd+K from any page, **When** the search palette opens, **Then** a text input with focus is shown, with recent searches displayed below.

2. **Given** the user types "Trilogy", **When** results load, **Then** they see grouped results: Contacts matching "Trilogy", Invoices to/from "Trilogy", Journal Entries mentioning "Trilogy", and Jobs tagged "Trilogy" — all within 200ms.

3. **Given** the user types "INV-001", **When** results load, **Then** the invoice with reference INV-001 appears as the top result.

4. **Given** the user types "$3,300", **When** results load, **Then** transactions, invoices, and bills with amount $3,300 appear.

5. **Given** the user types "Trilgy" (typo), **When** results load, **Then** "Trilogy Care" still appears thanks to typo tolerance.

6. **Given** the user selects a result, **When** they press Enter or click it, **Then** they are navigated to that record's detail page.

7. **Given** the user opens the search palette and types nothing, **When** the palette is visible, **Then** recent searches are displayed as clickable items that re-run the query.

---

### User Story 2 — Search Indexing Pipeline (Priority: P1)

The system needs to keep the search index in sync with the database as records are created, updated, and deleted. A bookkeeper creates a new contact "ABC Plumbing" and moments later wants to create an invoice for them — they should be able to find "ABC Plumbing" via search immediately, not wait for a batch job.

**Why this priority**: Stale search results destroy trust. If users search for something they just created and it's missing, they'll stop using search entirely. The index must update within seconds of any mutation.

**Independent Test**: Can be tested by creating a new invoice and verifying it appears in search results within 5 seconds.

**Acceptance Scenarios**:

1. **Given** a new contact "ABC Plumbing" is created, **When** the user searches 5 seconds later, **Then** "ABC Plumbing" appears in results.

2. **Given** an invoice is updated from Draft to Sent, **When** the user searches for it, **Then** the result shows the updated status.

3. **Given** a journal entry is soft-deleted, **When** the user searches for it, **Then** it no longer appears in results.

4. **Given** the search index is rebuilt (full reindex), **When** the rebuild completes, **Then** all searchable records are indexed with zero downtime for search queries.

5. **Given** multiple records are created in rapid succession (e.g., CSV import of 500 contacts), **When** the import completes, **Then** all 500 contacts are indexed within 30 seconds via batched indexing.

---

### User Story 3 — Scoped & Filtered Search (Priority: P2)

A bookkeeper wants to narrow search results to a specific entity type or apply filters like date range or status. When they're already on the Contacts page and press Cmd+K, the search should contextually default to showing contacts first — reducing friction for the most common use case.

**Why this priority**: Power users with large datasets need filtering to find specific records efficiently. Without scoping, the search palette becomes noisy for workspaces with thousands of records across many entity types.

**Independent Test**: Can be tested by performing a search, selecting the "Invoices" filter, and verifying only invoices appear.

**Acceptance Scenarios**:

1. **Given** the search palette is open, **When** the user selects the "Invoices" filter tab, **Then** only invoice results are shown.

2. **Given** the user types a search query and selects "This month" date filter, **When** results load, **Then** only records from the current month appear.

3. **Given** the user is on the Contacts page and presses Cmd+K, **When** the search palette opens, **Then** the "Contacts" filter is pre-selected (contextual scope).

4. **Given** the user has a filter active and clears the search text, **When** they type a new query, **Then** the filter remains active until explicitly cleared.

---

### User Story 4 — Tenant-Scoped Index Isolation (Priority: P1)

Search results MUST only return records belonging to the user's current workspace. Cross-tenant data leakage in search is a critical security violation. Even if a user has access to multiple workspaces, the search palette only returns results from the workspace they're currently viewing.

**Why this priority**: Multi-tenancy security is non-negotiable. This must be correct from day one. A single cross-tenant data leak in search could expose sensitive financial data and destroy platform trust.

**Independent Test**: Can be tested by indexing data for two workspaces and verifying a user in Workspace A cannot see Workspace B results.

**Acceptance Scenarios**:

1. **Given** Workspace A has a contact "Trilogy Care" and Workspace B has a contact "Trilogy Health", **When** a user in Workspace A searches "Trilogy", **Then** only "Trilogy Care" appears.

2. **Given** a user switches from Workspace A to Workspace B, **When** they search, **Then** results are scoped to Workspace B only.

3. **Given** a super admin viewing Workspace A, **When** they search, **Then** results are still scoped to Workspace A (no cross-tenant leakage even for admins in normal search).

---

### Edge Cases

- **Meilisearch unavailability**: The search bar shows a "Search temporarily unavailable" message. The app continues to function without search. No error is thrown to the user.
- **Full reindex during active usage**: Existing index serves queries while the new index builds. Swap is atomic — no partial results during the transition.
- **Very large workspaces (100K+ records)**: Meilisearch handles this natively. Pagination after 20 results with "Show more" button. No performance degradation expected up to 500K records per workspace.
- **Searching amounts stored as integers (cents)**: Index stores both integer and formatted display amount. Users can search "$1,234.56" or "123456".
- **Empty search query**: Shows recent searches only, no full index scan.
- **Special characters in search (e.g., "O'Brien", "Smith & Co")**: Meilisearch handles these natively. Apostrophes and ampersands are treated as word separators.
- **Concurrent index writes**: Meilisearch queues writes internally. Concurrent model observer dispatches are safe — no explicit locking required.
- **Workspace with no indexed data**: Search palette shows "No results found" with a hint: "Try a different search term or check that records exist in this workspace."

---

## Requirements

### Functional Requirements

**Search Palette UI**
- **FR-001**: System MUST provide a Cmd+K (Ctrl+K on Windows) triggered search palette accessible from every page.
- **FR-002**: System MUST reserve Cmd+K globally — no other feature may bind to this shortcut.
- **FR-003**: System MUST group results by entity type with entity-specific icons and preview data (e.g., contact name + email, invoice reference + amount + status).
- **FR-004**: System MUST store and display recent searches per user (last 10 queries).
- **FR-005**: System MUST navigate the user to the selected record's detail page on Enter or click.

**Searchable Entities**
- **FR-006**: System MUST search across: contacts, invoices, bills, journal entries, bank transactions, chart accounts, and jobs.
- **FR-007**: System MUST support typo-tolerant search (Meilisearch default: 2-character tolerance).
- **FR-008**: System MUST return results within 200ms (p95) for datasets up to 500K records per workspace.

**Indexing Pipeline**
- **FR-009**: System MUST sync index within 5 seconds of any create, update, or delete mutation via event-driven indexing (model observers).
- **FR-010**: System MUST support full reindex without downtime via index swap.
- **FR-011**: System MUST support batched indexing for bulk operations (imports) to avoid overwhelming the index with individual writes.

**Filtering & Scoping**
- **FR-012**: System MUST support entity-type filtering and date range filtering in the search palette.
- **FR-013**: System MUST pre-select the contextual entity type filter when the user opens search from an entity-specific page.

**Tenant Isolation**
- **FR-014**: System MUST enforce tenant-scoped index isolation — no cross-workspace data in results. Each workspace has its own Meilisearch index (or uses tenant_id filter keys).
- **FR-015**: System MUST scope search results to the current workspace even for super admin users.

**Resilience**
- **FR-016**: System MUST gracefully degrade when Meilisearch is unavailable (show message, don't crash, no exceptions surfaced to user).

### Key Entities

- **Search Index**: Per-workspace Meilisearch index containing all searchable entities with tenant_id scoping. Index name follows pattern `ws_{workspace_id}_{entity_type}` or a single combined index with filterable `entity_type` attribute.
- **Search Document**: A flattened, indexed representation of a domain entity (contact, invoice, etc.) with searchable fields (name, reference, description, formatted amount), filterable attributes (entity_type, status, date), and a link to the source record (entity_type + ID + URL path).
- **Recent Search**: A per-user log of recent search queries (last 10) stored client-side in localStorage, scoped by workspace_id. No server-side storage required for v1.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Search p95 latency under 200ms for workspaces with up to 500K indexed records.
- **SC-002**: Index sync latency under 5 seconds from mutation to searchable result.
- **SC-003**: 60% of active users use global search at least once per session within 3 months of launch.
- **SC-004**: Zero cross-tenant data leakage incidents in search results (verified by automated tenant isolation tests).
- **SC-005**: Full reindex of a 100K-record workspace completes in under 60 seconds with zero search downtime.
- **SC-006**: Meilisearch unavailability does not produce user-facing errors — graceful degradation verified by kill-switch test.

---

## Clarifications

### Session 2026-03-19

- Q: Should the search index be one index per workspace or one index per entity type per workspace? → A: TBD at implementation. One combined index per workspace with a filterable `entity_type` attribute is simpler and allows cross-entity search in a single query. Multiple indexes per entity type give finer control over ranking. Recommend starting with one combined index and splitting only if ranking quality suffers.
- Q: Should recent searches be stored server-side or client-side? → A: Client-side in localStorage, scoped by workspace_id. Keeps it simple, avoids an extra API endpoint, and recent searches are a per-device convenience — not a synced feature.
- Q: How should amounts be indexed for search? → A: Index both the raw integer (cents) and a pre-formatted display string (e.g., "$1,234.56"). Meilisearch searches string fields by default — the formatted amount lets users search naturally with dollar signs and commas.
- Q: Should the search palette support keyboard navigation of results? → A: Yes. Arrow keys to move between results, Enter to select, Escape to close. This aligns with the keyboard-first UX principle in CLAUDE.md.
- Q: What happens when a workspace has feature-flagged modules disabled (e.g., jobs module off)? → A: Don't index entities for disabled modules. When a module is toggled on, trigger a reindex for that entity type. When toggled off, remove those documents from the index.
- Q: Should the Cmd+K palette replace or coexist with the future command palette (also Cmd+K per CLAUDE.md)? → A: This IS the command palette referenced in CLAUDE.md. v1 is search-only. Future versions will add command actions (e.g., "Create Invoice", "Go to Settings") to the same palette, evolving it into a full command palette.
