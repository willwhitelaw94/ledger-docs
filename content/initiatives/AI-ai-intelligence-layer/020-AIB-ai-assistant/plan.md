---
title: "Implementation Plan: AI Assistant"
---

# Implementation Plan: AI Assistant

**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)
**Created**: 2026-03-21
**Status**: Draft

---

## Summary

Evolve the existing 021-AIQ chatbot into a production AI assistant powered by the Laravel AI SDK (`laravel/ai`). The current architecture — AI processing in a Next.js route handler calling Laravel tool endpoints over HTTP — is replaced with a **Laravel-primary agent** that has direct Eloquent access to workspace data, streams responses via the Vercel data protocol, and supports RAG via pgvector.

This is not a rewrite. The existing 7 tools, conversation models, and frontend chat components are preserved and evolved. The migration path is incremental: PostgreSQL first, then Laravel AI SDK agent, then RAG, then new capabilities.

---

## Technical Context

### Technology Stack

| Layer | Current (021-AIQ) | Target (020-AIB) |
|-------|-------------------|-------------------|
| **AI Processing** | Next.js route handler + Anthropic SDK | Laravel AI SDK Agent (server-side) |
| **Streaming** | Next.js → Anthropic → SSE → useChat | Laravel → Vercel data protocol → useChat |
| **Tool Execution** | HTTP round-trip (Next.js → Laravel API → response) | Direct Eloquent queries inside Agent tools |
| **Conversation Persistence** | Custom ChatConversation/ChatMessage models | Laravel AI SDK `RemembersConversations` trait |
| **Embeddings / RAG** | None | pgvector on PostgreSQL + `AI::embed()` |
| **Database** | SQLite | PostgreSQL (Neon or local) |
| **LLM Provider** | Anthropic (Claude Haiku 4.5) | Anthropic primary, OpenAI fallback (via provider chain) |
| **Frontend Chat** | AI SDK v4 `useChat` + 7 result components | Same — enhanced with context panel + action confirmations |

### Dependencies

| Dependency | Purpose | Status |
|------------|---------|--------|
| `laravel/ai` | Agent, tools, streaming, conversation persistence, embeddings | Install via composer |
| PostgreSQL | Primary database (replaces SQLite) | User switching now |
| pgvector extension | Vector embeddings for RAG | Install on Postgres |
| `text-embedding-3-small` (OpenAI) | Embedding model (1536 dimensions, $0.02/1M tokens) | API key required |
| 019-AIX (AI Document Inbox) | Inbox review tools — **not a hard dependency** | Not built yet — US2 deferred |
| 018-ITR (Attention Queue) | Intray surfacing — **not a hard dependency** | Not built yet — US5 deferred |

### Constraints

- **Workspace isolation is non-negotiable** — every agent call, tool query, and embedding is scoped to `workspace_id`
- **No data fabrication** — agent must cite source records, refuse to guess
- **Role-based tool gating** — write actions (create bill, approve invoice) check user permissions before execution
- **Streaming latency** — first token within 2 seconds
- **Conversation history** — persisted server-side indefinitely per workspace user

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js Frontend                                           │
│                                                             │
│  useChat() ──→ POST /api/chat ──→ proxy to Laravel          │
│       ↑                                                     │
│       └── SSE stream (Vercel data protocol)                 │
│                                                             │
│  [ChatPanel] [ContextPanel] [ToolResults]                   │
└─────────────────────────────────────────────────────────────┘
                          │
                    HTTP stream
                          │
┌─────────────────────────────────────────────────────────────┐
│  Laravel API                                                │
│                                                             │
│  POST /api/v1/chat/stream                                   │
│       │                                                     │
│       ▼                                                     │
│  FinancialAssistant (Laravel AI SDK Agent)                   │
│       │                                                     │
│       ├── instructions() ← system prompt + workspace context │
│       │                                                     │
│       ├── tools() ← registered tool classes                  │
│       │   ├── GetAccountBalances                             │
│       │   ├── GetProfitAndLoss                               │
│       │   ├── GetOutstandingInvoices                         │
│       │   ├── GetCashFlow                                    │
│       │   ├── GetTopExpenses                                 │
│       │   ├── GetTransactions                                │
│       │   ├── SearchTransactions                             │
│       │   ├── GetIntrayItems                                 │
│       │   ├── CreateBill (write — permission-gated)          │
│       │   ├── CreateInvoice (write — permission-gated)       │
│       │   ├── SemanticSearch (RAG — pgvector)                │
│       │   └── ... extensible                                 │
│       │                                                     │
│       ├── RemembersConversations                             │
│       │   └── ai_conversations / ai_messages tables          │
│       │                                                     │
│       └── stream() → Vercel data protocol SSE               │
│                                                             │
│  Embedding Pipeline (background)                             │
│       ├── EmbeddingObserver (model events → queue)            │
│       ├── GenerateEmbedding job                              │
│       └── document_chunks table (pgvector)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Existing Tables (Evolved)

**`chat_conversations`** → Replaced by Laravel AI SDK's `ai_conversations` table (migration ships with the package). Existing data migrated.

**`chat_messages`** → Replaced by `ai_messages` table. Existing message history migrated.

### New Tables

#### `document_chunks` (RAG embeddings)

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| uuid | uuid | Unique |
| workspace_id | bigint FK | Tenant scoping |
| chunkable_type | string | Morph type (invoice, journal_entry, contact, etc.) |
| chunkable_id | bigint | Morph ID |
| content | text | The text chunk that was embedded |
| metadata | jsonb | Source context (record type, key fields, dates) |
| embedding | vector(1536) | pgvector column |
| created_at | timestamp | |
| updated_at | timestamp | |

**Indexes**: `workspace_id`, HNSW index on `embedding` for fast similarity search, `chunkable_type + chunkable_id`

#### `ai_config` (already exists as `chat_ai_configs`)

Kept as-is. Stores workspace-scoped agent name, model preference, system prompt overrides.

### What Gets Embedded (RAG Sources)

| Entity | What's Chunked | Trigger |
|--------|----------------|---------|
| Invoice | Description, line items, contact name, amounts, status | On create/update |
| Bill | Same as invoice | On create/update |
| Journal Entry | Narration, line descriptions, amounts, accounts | On create/post |
| Contact | Name, email, phone, notes, type | On create/update |
| Bank Transaction | Description, amount, date, matched status | On import/reconcile |
| Chart Account | Name, code, type, description | On create/update |
| Notes | Rich text content, linked record context | On create/update |

Average workspace: ~2,000 chunks. At 1536 dimensions × 4 bytes = ~6KB per embedding. 2,000 × 6KB = ~12MB of vector data per workspace. Well within pgvector performance range.

---

## API Contracts

### Stream Endpoint (replaces Next.js route handler)

```
POST /api/v1/assistant/stream
Headers: X-Workspace-Id, Authorization (Sanctum cookie)
Body: {
  "message": "What invoices are overdue?",
  "conversation_id": "uuid" (optional — new conversation if omitted),
  "page_context": "/invoices/INV-042" (optional — current page URL)
}
Response: SSE stream (Vercel data protocol)
```

### Conversation Endpoints

```
GET    /api/v1/assistant/conversations          — list user's conversations
GET    /api/v1/assistant/conversations/{uuid}   — get conversation with messages
DELETE /api/v1/assistant/conversations/{uuid}   — delete conversation
POST   /api/v1/assistant/conversations/{uuid}/title — rename conversation
```

### Embedding Pipeline Endpoints (admin/background)

```
POST /api/v1/assistant/embed/workspace   — trigger full workspace re-embedding (admin)
GET  /api/v1/assistant/embed/status      — embedding pipeline status
```

---

## Implementation Phases

### Phase 0: PostgreSQL Migration

**Goal**: Switch from SQLite to PostgreSQL. No AI changes yet — just the database.

1. Update `.env` — `DB_CONNECTION=pgsql`, credentials
2. Install pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector;`
3. Run `php artisan migrate` — verify all 142+ migrations work on Postgres
4. Fix any SQLite-specific queries:
   - `LIKE` → `ILIKE` for case-insensitive search (grep for `'like'` in query builders)
   - `whereDate()` patterns should work as-is
5. Run full test suite: `php artisan test --compact`
6. Update `demo:seed` / snapshot commands for Postgres (pg_dump/pg_restore instead of SQLite copy)
7. Verify frontend works end-to-end

**Deliverable**: App running on PostgreSQL, all tests green.

### Phase 1: Laravel AI SDK Foundation

**Goal**: Install Laravel AI SDK, create the FinancialAssistant agent, migrate existing tools.

1. `composer require laravel/ai`
2. `php artisan vendor:publish --tag=ai-migrations` — publish conversation tables
3. `php artisan migrate` — create `ai_conversations` and `ai_messages` tables
4. Create `app/AI/FinancialAssistant.php` — Agent class:
   - `instructions()` — system prompt with workspace context, financial domain rules
   - `tools()` — register tool classes (migrated from ChatToolController)
   - `RemembersConversations` trait — automatic conversation persistence
   - Workspace-scoped via constructor injection
5. Migrate 8 existing tools from `ChatToolController` methods to standalone tool classes:
   - `app/AI/Tools/GetAccountBalances.php`
   - `app/AI/Tools/GetProfitAndLoss.php`
   - `app/AI/Tools/GetOutstandingInvoices.php`
   - `app/AI/Tools/GetCashFlow.php`
   - `app/AI/Tools/GetTopExpenses.php`
   - `app/AI/Tools/GetTransactions.php`
   - `app/AI/Tools/SearchTransactions.php`
   - `app/AI/Tools/GetIntrayItems.php`
   Each tool: typed parameters, `handle()` method with direct Eloquent queries, workspace-scoped
6. Create `app/Http/Controllers/Api/AssistantController.php`:
   - `stream()` — instantiate FinancialAssistant, call `->stream()`, return SSE response
   - `conversations()` — list user conversations
   - `conversation()` — get conversation with messages
   - `deleteConversation()` — delete
   - `renameConversation()` — update title
7. Register routes in `api.php`
8. Update Next.js `frontend/src/app/api/chat/route.ts` — simplify to a proxy that forwards to `/api/v1/assistant/stream` (or point `useChat` transport directly at the Laravel endpoint)
9. Verify streaming works end-to-end with existing frontend components
10. Write migration script to copy `chat_conversations`/`chat_messages` → `ai_conversations`/`ai_messages`

**Deliverable**: Agent streaming via Laravel, existing tools working, conversations persisted by the SDK.

### Phase 2: Write Actions (US3)

**Goal**: The assistant can create bills, invoices, and journal entries through conversation.

1. Create write tool classes (permission-gated):
   - `app/AI/Tools/CreateBill.php` — calls existing `CreateInvoice` action (type=bill)
   - `app/AI/Tools/CreateInvoice.php` — calls existing `CreateInvoice` action
   - `app/AI/Tools/CreateJournalEntry.php` — calls existing `CreateJournalEntry` action
   Each tool: checks `$user->hasPermissionTo()` before execution, returns draft (not posted)
2. Add confirmation flow — the agent presents a summary and asks "Create this?" before executing
3. Add "missing fields" detection — agent identifies required fields not provided and asks for them
4. Write tests: permission gating, draft creation, missing field prompts

**Deliverable**: Users can create documents through conversation with confirmation step.

### Phase 3: RAG Pipeline

**Goal**: Embed workspace data in pgvector for semantic search.

1. Create `document_chunks` migration with `vector(1536)` column + HNSW index
2. Create `DocumentChunk` model (workspace-scoped, polymorphic)
3. Create `app/AI/Embedding/ChunkBuilder.php` — takes a model instance, returns text chunks:
   - Invoice: "Invoice INV-042 to Telstra, $1,240 inc GST, due 30 Mar, status: overdue. Lines: ..."
   - Contact: "Contact: Telstra (supplier), email: billing@telstra.com, outstanding: $3,400"
   - etc.
4. Create `app/Jobs/GenerateEmbedding.php` — queued job that:
   - Takes a model instance
   - Calls ChunkBuilder to get text chunks
   - Calls `AI::embed()` to get vector
   - Upserts DocumentChunk rows
5. Create `app/Observers/EmbeddingObserver.php` — listens to created/updated on embeddable models, dispatches GenerateEmbedding job
6. Register observer on: Invoice, JournalEntry, Contact, BankTransaction, ChartAccount, Note
7. Create `app/AI/Tools/SemanticSearch.php` — Laravel AI SDK's `SimilaritySearch` tool configured for `document_chunks` table
8. Add SemanticSearch to FinancialAssistant tools
9. Create `php artisan assistant:embed-workspace {workspace_id}` — batch job to embed all existing data
10. Write tests: embedding generation, semantic search retrieval, workspace isolation

**Deliverable**: Assistant answers questions using RAG + structured tools. "What did we discuss with Telstra last month?" returns relevant invoice memos and notes.

### Phase 4: Context-Aware Panel (US4)

**Goal**: The assistant knows what page the user is viewing and shows a context panel.

1. Frontend: pass `page_context` (current URL path) with each message
2. Backend: `FinancialAssistant::instructions()` injects page context — "The user is currently viewing invoice INV-042"
3. Frontend: create `ContextPanel` component alongside `ChatPanel`:
   - When assistant references a specific record → render record summary card
   - When no specific record → render workspace summary (bank balance, overdue count, pending bills)
4. Update `ChatPanel` to slide-in panel (not full page) accessible from anywhere via `Cmd/Ctrl + /`
5. Persist panel state across navigation (Zustand store)
6. Add conversation sidebar — list of past conversations, click to load

**Deliverable**: Context-aware assistant panel accessible from any page.

### Phase 5: Polish & Scale

**Goal**: Production hardening.

1. Provider failover — Anthropic primary → OpenAI fallback
2. Rate limiting — per-user, per-workspace limits on assistant requests
3. Streaming timeout — cancel after 30s, show error
4. Embedding pipeline monitoring — track embedding freshness, queue health
5. Cost tracking — log token usage per workspace for billing attribution
6. AI config enhancements — model selection, temperature, max tokens per workspace
7. `AI::fake()` test coverage across all tools
8. Browser tests for assistant panel

**Deliverable**: Production-ready assistant.

---

## What Gets Deferred

| Feature | Why | When |
|---------|-----|------|
| US2 (Inbox review via conversation) | Depends on 019-AIX | After 019-AIX ships |
| US5 (Intray items via conversation) | Depends on 018-ITR | After 018-ITR ships |
| Document creation from inbox | Depends on US2 | After 019-AIX ships |

These are additive — the agent architecture supports them. When 019-AIX ships, add `ReviewInboxItem`, `ConfirmInboxItem`, `RejectInboxItem` tools to the agent. No architectural changes needed.

---

## Source Code Structure

### Backend (New/Modified Files)

```
app/
├── AI/
│   ├── FinancialAssistant.php              # Main Agent class
│   ├── Tools/
│   │   ├── GetAccountBalances.php          # Migrated from ChatToolController
│   │   ├── GetProfitAndLoss.php
│   │   ├── GetOutstandingInvoices.php
│   │   ├── GetCashFlow.php
│   │   ├── GetTopExpenses.php
│   │   ├── GetTransactions.php
│   │   ├── SearchTransactions.php
│   │   ├── GetIntrayItems.php
│   │   ├── CreateBill.php                  # New — write action
│   │   ├── CreateInvoice.php               # New — write action
│   │   ├── CreateJournalEntry.php          # New — write action
│   │   └── SemanticSearch.php              # New — RAG tool
│   └── Embedding/
│       ├── ChunkBuilder.php                # Model → text chunks
│       └── EmbeddableModels.php            # Registry of embeddable models
├── Http/Controllers/Api/
│   └── AssistantController.php             # Stream + conversation CRUD
├── Jobs/
│   └── GenerateEmbedding.php               # Queued embedding job
├── Models/Tenant/
│   └── DocumentChunk.php                   # pgvector model
├── Observers/
│   └── EmbeddingObserver.php               # Model → embedding on save
└── Console/Commands/
    └── EmbedWorkspace.php                  # Batch embed command

database/migrations/
├── xxxx_create_document_chunks_table.php
└── xxxx_migrate_chat_to_ai_sdk.php         # Data migration

routes/api.php                              # New assistant routes
```

### Frontend (Modified Files)

```
frontend/src/
├── app/api/chat/route.ts                   # Simplified to proxy (or removed)
├── components/chat/
│   ├── ChatPanel.tsx                       # Enhanced — slide-in from anywhere
│   ├── ContextPanel.tsx                    # New — record/summary display
│   ├── ConversationSidebar.tsx             # Enhanced — past conversations
│   └── ... (existing result components preserved)
├── hooks/
│   └── use-chat.ts (or use-assistant.ts)   # Updated transport target
└── stores/
    └── chat.ts                             # Enhanced — panel state, context
```

---

## Testing Strategy

### Phase 0 (Postgres migration)
- Full existing test suite on PostgreSQL (~590 feature tests)

### Phase 1 (Agent foundation)
- `tests/Feature/Api/AssistantControllerTest.php` — stream, conversations CRUD
- `tests/Unit/AI/FinancialAssistantTest.php` — agent with `AI::fake()`
- `tests/Unit/AI/Tools/*Test.php` — each tool in isolation

### Phase 2 (Write actions)
- Permission gating: bookkeeper can create bill, client cannot
- Confirmation flow: agent presents summary before creating
- Missing fields: agent asks for due date when not provided

### Phase 3 (RAG)
- `tests/Unit/AI/Embedding/ChunkBuilderTest.php` — correct text output per model
- `tests/Feature/AI/SemanticSearchTest.php` — pgvector query returns relevant chunks
- Workspace isolation: chunks from workspace A not searchable from workspace B

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Laravel AI SDK API changes (new package) | Medium | Medium | Pin version, read changelog before upgrading |
| PostgreSQL migration breaks existing queries | Low | High | Run full test suite on Postgres before proceeding |
| RAG embedding costs at scale | Low | Medium | Use text-embedding-3-small ($0.02/1M tokens), batch embedding, skip unchanged records |
| LLM hallucination on financial data | Medium | High | Tools return structured data, system prompt forbids fabrication, citation requirement |
| Streaming latency under load | Low | Medium | Laravel queue for non-blocking tool execution, provider failover |
| pgvector query performance at scale | Low | Low | HNSW index, limit to 20 results, workspace-scoped queries |

---

## Gate 3: Architecture Check

### 1. Technical Feasibility

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | Laravel AI SDK Agent with direct Eloquent, streaming via Vercel protocol |
| Existing patterns leveraged | PASS | Migrates 8 existing tools, reuses Actions for write tools |
| No impossible requirements | PASS | All 18 FRs achievable (US2/US5 deferred on dependency) |
| Performance considered | PASS | Streaming, HNSW vector index, queued embeddings |
| Security considered | PASS | Permission-gated write tools, workspace isolation, no API keys on frontend |

### 2. Data & Integration

| Check | Status | Notes |
|-------|--------|-------|
| Data model understood | PASS | document_chunks for RAG, SDK-managed conversations |
| API contracts clear | PASS | 6 endpoints defined |
| Dependencies identified | PASS | laravel/ai, PostgreSQL, pgvector, OpenAI embeddings |
| Integration points mapped | PASS | Replaces Next.js route handler, extends existing tool pattern |

### 3. Implementation Approach

| Check | Status | Notes |
|-------|--------|-------|
| File changes identified | PASS | See source structure above |
| Risk areas noted | PASS | Postgres migration, LLM hallucination, SDK maturity |
| Testing approach defined | PASS | AI::fake() for agent tests, pgvector for RAG tests |
| Rollback possible | PASS | Feature flag, old chatbot route retained until cutover |

### 4. Resource & Scope

| Check | Status | Notes |
|-------|--------|-------|
| Scope matches spec | PASS | US1/US3/US4 in scope, US2/US5 deferred on dependency |
| Effort reasonable | PASS | 5 phases, ~3-4 sprints |
| Skills available | PASS | Standard Laravel + React patterns, new package (well-documented) |

### Overall: PASS
