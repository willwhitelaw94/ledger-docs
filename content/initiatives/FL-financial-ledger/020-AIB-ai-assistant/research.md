---
title: "AI Assistant — Architecture Research Document"
description: "Research findings for building a production AI assistant in MoneyQuest Ledger: Laravel AI SDK, RAG architecture, SQLite-to-PostgreSQL migration, and architecture patterns."
---

# AI Assistant — Architecture Research Document

**Created**: 2026-03-21
**Topic**: Production AI architecture for MoneyQuest Ledger
**Epic**: 020-AIB AI Assistant
**Status**: Complete

**Sources Searched:**
- Web: Laravel AI SDK docs, Prism PHP docs, Tighten RAG tutorial, Neon Postgres docs, OpenAI embedding docs
- Codebase: Existing 021-AIQ chatbot implementation, ChatToolController, chat models, API routes, package.json, composer.json
- TC Docs: 020-AIB spec, 021-AIQ epic, architecture patterns

---

## Executive Summary

MoneyQuest Ledger is in an exceptionally strong position for the AI Assistant upgrade. Three major developments have converged:

1. **Laravel AI SDK** (`laravel/ai`) launched as a first-party Laravel package in February 2026 and reached production-stable status with Laravel 13 on March 17, 2026. It provides agents, tools, conversation persistence, embeddings, RAG with pgvector, and streaming — all with native Laravel integration. This replaces the current approach of running AI entirely through Next.js route handlers.

2. **The existing 021-AIQ chatbot** already has solid infrastructure: 8 tool endpoints in `ChatToolController`, conversation persistence via `ChatConversation`/`ChatMessage` models, and a working `useChat` + `streamText` streaming setup. This is a strong foundation to migrate onto the Laravel AI SDK.

3. **pgvector on Neon Postgres** provides a production-ready path for RAG without introducing a separate vector database. The SQLite-to-PostgreSQL migration is straightforward given that all 142 migrations use standard Laravel schema builder with no SQLite-specific SQL.

The recommended architecture: **Laravel AI SDK handles all AI processing, tool execution, and conversation persistence server-side. Next.js consumes the stream via the Vercel data protocol for the chat UI.** This eliminates API key management on the frontend, leverages Laravel's authorization system for tool gating, and positions the codebase for the full 020-AIB spec (inbox review, action execution, context-aware panel).

---

## 1. Laravel AI Features (2025-2026)

### What Has Laravel Released?

**Laravel AI SDK** (`laravel/ai`) — the official first-party package for AI integration.

| Detail | Value |
|--------|-------|
| **Package** | `composer require laravel/ai` |
| **Announced** | February 5, 2026 |
| **Production-stable** | March 17, 2026 (with Laravel 13 release) |
| **Docs** | [laravel.com/docs/12.x/ai-sdk](https://laravel.com/docs/12.x/ai-sdk) |
| **Compatibility** | Laravel 12.x and 13.x |

### Key Features

| Feature | Description | Relevance to MoneyQuest |
|---------|-------------|------------------------|
| **Agents** | PHP classes with `instructions()`, `tools()`, `schema()` | Replace Next.js route handler with a `FinancialAssistant` agent |
| **Tool Calling** | Custom tools with typed parameters, concurrent execution | Migrate ChatToolController endpoints to Agent tools |
| **RemembersConversations** | Automatic DB persistence of conversation history | Replace custom ChatConversation/ChatMessage models |
| **Structured Output** | JSON schema responses with validation | For inbox review confirmations, action proposals |
| **Embeddings** | `AI::embed()` with OpenAI, Gemini, Cohere, Jina, VoyageAI | Generate embeddings for RAG |
| **SimilaritySearch Tool** | Built-in pgvector-backed vector search | RAG out of the box |
| **Streaming** | Server-sent events with Vercel data protocol support | Direct compatibility with `useChat` on Next.js |
| **Provider Failover** | Chain providers for automatic fallback | Anthropic primary, OpenAI fallback |
| **Testing Fakes** | `AI::fake()`, `AI::fakeEmbeddings()` | Full test coverage without API calls |
| **Reranking** | `$chunks->rerank()` collection macro | Improve RAG result quality |

### Prism PHP (Community Alternative)

**Prism** (`prism-php/prism`) is a community package that preceded the official SDK. Key points:

- Prism 1.0 shipped stable around August 2025
- Provides similar features: text generation, tool calling, embeddings, structured output
- MCP tool compatibility
- Concurrent tool execution via Laravel's `Concurrency` facade

**Recommendation**: Use the **Laravel AI SDK** (`laravel/ai`), not Prism. The official SDK is maintained by the Laravel team, ships with Laravel 13, and has deeper framework integration (migration tables, Vercel protocol support, artisan generators). Prism was the right choice before February 2026; the official SDK supersedes it.

### Sources

- [Laravel AI SDK Documentation](https://laravel.com/docs/12.x/ai-sdk)
- [Introducing the Laravel AI SDK](https://laravel.com/blog/introducing-the-laravel-ai-sdk)
- [Laravel 13 Released](https://laravel-news.com/laravel-13-released)
- [Prism PHP](https://prismphp.com/)
- [Prism GitHub](https://github.com/prism-php/prism)
- [Laravel AI SDK Production Guide](https://dev.to/martintonev/how-to-use-laravel-ai-sdk-in-production-agents-tools-streaming-rag-4mfk)

---

## 2. RAG Architecture for Laravel

### Architecture Overview

RAG (Retrieval-Augmented Generation) enriches LLM responses with relevant context from the application's own data. For MoneyQuest, this means the AI assistant can answer questions not just from structured queries (the current tool-based approach) but from the full body of workspace knowledge — transaction descriptions, contact notes, invoice memos, journal entry narratives.

### pgvector for PostgreSQL

pgvector is a PostgreSQL extension that adds vector data types and similarity search operators directly to Postgres. No separate vector database needed.

**How it works:**
1. Add a `vector(1536)` column to a table
2. Store embedding arrays (float arrays) in that column
3. Query with cosine similarity: `ORDER BY embedding <=> $query_vector`
4. Add HNSW index for fast approximate nearest-neighbor search

**Laravel AI SDK integration:**

```php
// Migration
Schema::create('document_chunks', function (Blueprint $table) {
    $table->id();
    $table->foreignId('workspace_id')->constrained();
    $table->string('source_type');  // 'invoice', 'journal_entry', 'contact', etc.
    $table->unsignedBigInteger('source_id');
    $table->text('chunk_text');
    $table->json('metadata')->nullable();
    $table->vector('embedding', dimensions: 1536)->vectorIndex();
    $table->timestamps();
});
```

```php
// Query — built into Laravel AI SDK
$chunks = DocumentChunk::whereVectorSimilarTo(
    'embedding',
    $userQuestion,
    minSimilarity: 0.3
)->where('workspace_id', $workspaceId)
 ->limit(10)
 ->get();
```

### Embedding Model Recommendation

| Model | Dimensions | Cost per 1M tokens | MTEB Score | Recommendation |
|-------|-----------|--------------------:|------------|----------------|
| `text-embedding-3-small` | 1,536 | $0.02 | 62.3% | **Use this** — best cost/performance ratio |
| `text-embedding-3-large` | 3,072 | $0.13 | 64.6% | Only for legal/compliance if needed |

**Recommendation**: Use `text-embedding-3-small` (1,536 dimensions). The 6.5x cost difference vs. `text-embedding-3-large` is not justified by the marginal 2.3% quality improvement. Financial data is structured and domain-specific, which favours cost efficiency over raw benchmark scores.

### What to Embed (Financial Data Chunking Strategy)

| Entity | What to Embed | Chunk Strategy |
|--------|--------------|----------------|
| **Journal Entries** | Description + line account names + amounts | One chunk per entry |
| **Invoices/Bills** | Contact name + line descriptions + amounts + status | One chunk per document |
| **Contacts** | Name + notes + ABN + categorisation | One chunk per contact |
| **Bank Transactions** | Description + amount + matched status + memo | One chunk per transaction |
| **Chart of Accounts** | Account name + code + type + description | One chunk per account |
| **Reconciliation Rules** | Rule name + conditions + category mapping | One chunk per rule |

**Chunking approach**: For structured financial records, each record is naturally one chunk (unlike unstructured documents that need splitting). The chunk text should be a human-readable summary: `"Invoice INV-2024-001 to Telstra for $1,240 (Utilities - Telephone) due 2024-03-30, status: overdue by 5 days"`.

### The SimilaritySearch Tool

The Laravel AI SDK provides `SimilaritySearch::usingModel()` — a built-in tool that agents can use to search embedded data:

```php
use Laravel\Ai\Tools\SimilaritySearch;

class FinancialAssistant implements Agent, HasTools
{
    public function tools(): iterable
    {
        return [
            SimilaritySearch::usingModel(
                model: DocumentChunk::class,
                column: 'embedding',
                minSimilarity: 0.3,
                limit: 10
            ),
            // ... existing structured tools (balances, P&L, etc.)
        ];
    }
}
```

### Alternative: Middleware-Based Retrieval

Instead of letting the LLM decide when to search, inject context before every prompt:

```php
class RetrieveFinancialContext
{
    public function handle(AgentPrompt $prompt, Closure $next)
    {
        $chunks = DocumentChunk::whereVectorSimilarTo(
            'embedding',
            $prompt->prompt,
            minSimilarity: 0.3
        )->where('workspace_id', $prompt->agent->workspaceId)
         ->limit(10)
         ->get();

        $prompt->agent->withChunks($chunks);
        return $next($prompt);
    }
}
```

**Recommendation**: Use **both approaches** — middleware-based retrieval for general context enrichment, plus the `SimilaritySearch` tool for when the LLM needs to do targeted lookups. The existing structured tools (balances, P&L, transactions) remain the primary data source for exact numbers; RAG supplements with contextual understanding.

### Sources

- [RAG with Laravel AI SDK (Tighten)](https://tighten.com/insights/chat-with-your-documents-a-practical-guide-to-rag-using-the-new-laravel-ai-sdk/)
- [Laravel AI SDK Tutorial Part 2: RAG](https://hafiz.dev/blog/laravel-ai-sdk-tutorial-part-2-build-a-rag-powered-support-bot-with-tools-and-memory)
- [RAG System Using Laravel and PostgreSQL](https://devzahid.medium.com/retrieval-augmented-generation-rag-system-using-laravel-and-postgresql-76b27278a1cf)
- [pgvector Extension - Neon Docs](https://neon.com/docs/extensions/pgvector)
- [Prism Embeddings](https://prismphp.com/core-concepts/embeddings.html)

---

## 3. SQLite to PostgreSQL Migration

### Current State

- **DB_CONNECTION**: SQLite (default in `config/database.php`)
- **Migrations**: 142 files, all using standard Laravel schema builder
- **SQLite-specific patterns**: Only `whereDate()` usage (already noted in CLAUDE.md as a convention)
- **Postgres prep already started**: Migration `2026_03_22_300001_widen_abn_columns_for_postgres.php` exists
- **pgsql config**: Already defined in `config/database.php`
- **Event sourcing**: Spatie v7 stores events in `stored_events` table — works on both SQLite and PostgreSQL

### Migration Steps

1. **Environment switch** — change `DB_CONNECTION=pgsql` in `.env`, set `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
2. **Run `php artisan migrate:fresh`** — all 142 migrations use Laravel schema builder, which generates driver-appropriate SQL
3. **Seed data** — `php artisan db:seed` or `php artisan demo:seed`
4. **Enable pgvector** — `CREATE EXTENSION IF NOT EXISTS vector;` (or via migration)
5. **Add vector columns** — new migration for the `document_chunks` table

### Known Gotchas

| Issue | Impact | Fix |
|-------|--------|-----|
| **Boolean handling** | SQLite uses 0/1, PostgreSQL uses TRUE/FALSE | Laravel's schema builder handles this — no code changes needed |
| **Case sensitivity** | PostgreSQL `LIKE` is case-sensitive; SQLite is not | Use `ILIKE` or `->whereRaw('LOWER(x) LIKE ?')` for text search in `ChatToolController::search()` |
| **String length enforcement** | SQLite ignores `string(11)` length; PostgreSQL enforces it | Already fixed: `widen_abn_columns_for_postgres` migration widens ABN from 11 to 14 chars |
| **Autoincrement** | SQLite uses `AUTOINCREMENT`; PostgreSQL uses `SERIAL` | Laravel handles this — no code changes |
| **Foreign keys** | SQLite disables FK constraints by default | Already enabled in config: `'foreign_key_constraints' => true` |
| **whereDate()** | SQLite date handling differs slightly | Already using `whereDate()` (the Laravel-safe approach), not raw `where()` |
| **JSON columns** | SQLite stores JSON as text; PostgreSQL has native JSONB | Laravel casts handle this transparently, but JSONB enables indexing |
| **Transaction isolation** | SQLite uses DEFERRED transactions | PostgreSQL uses READ COMMITTED by default — stronger guarantees, same code |

### Neon Postgres (Serverless)

| Feature | Neon Support |
|---------|-------------|
| **pgvector** | Yes — fully supported, including HNSW indexes |
| **Serverless scaling** | Scale to zero, auto-scale on demand |
| **Database branching** | Create instant copies for testing/staging |
| **Multi-tenant SaaS** | Suitable — single-database multi-tenancy with `workspace_id` scoping works well |
| **Connection pooling** | Built-in via Neon's connection pooler |
| **Laravel compatibility** | Full — standard PostgreSQL driver, no special configuration |
| **Cost** | Free tier: 0.5 GiB storage, 191 compute hours. Paid: $19/month for 10 GiB + autoscaling |

**Recommendation**: Neon Postgres is well-suited for MoneyQuest. The serverless model means no cold-start issues for a SaaS app with varying load. Database branching is excellent for the demo/snapshot workflow (`php artisan demo:reset`). pgvector support means RAG works without a separate service.

**Alternative**: Laravel Cloud ships with its own Serverless Postgres offering with pgvector support. Worth evaluating if the project moves to Laravel Cloud for deployment.

### Migration Scope Assessment

**Low risk.** All 142 migrations use standard Laravel schema builder. No raw SQL, no SQLite-specific functions. The one known issue (ABN column width) is already fixed. The `whereDate()` convention in CLAUDE.md was specifically chosen for cross-database compatibility. Estimated effort: 1-2 hours for the switch, plus testing.

### Sources

- [Neon pgvector Extension](https://neon.com/docs/extensions/pgvector)
- [Neon: Serverless PostgreSQL Platform](https://www.gocodeo.com/post/neon-the-serverless-postgresql-platform-built-for-ai-agents)
- [Laravel Cloud Serverless Postgres](https://cloud.laravel.com/docs/resources/databases/postgres)
- [PostgreSQL in Laravel: What You Need to Know](https://laraveldaily.com/post/postgresql-laravel-what-you-need-to-know)
- [Laravel 12 with PostgreSQL Setup Guide](https://kritimyantra.com/blogs/laravel-12-with-postgresql-a-complete-setup-guide-2025)

---

## 4. Architecture Patterns

### Recommended Architecture: Laravel-Primary AI Processing

```
┌─────────────────────────────────────────────────────┐
│  Next.js Frontend                                    │
│                                                      │
│  useChat() ←──── SSE stream (Vercel data protocol)   │
│      │                                               │
│      └──→ POST /api/v1/chat/prompt                   │
│           (proxied through Next.js or direct)        │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│  Laravel API                                         │
│                                                      │
│  FinancialAssistant Agent                            │
│  ├── instructions() — system prompt                  │
│  ├── tools() — 8+ tools (balances, P&L, invoices...) │
│  ├── middleware() — RetrieveFinancialContext (RAG)    │
│  └── RemembersConversations — auto DB persistence    │
│                                                      │
│  Streaming via Vercel Data Protocol                  │
│  ├── ->stream($prompt)->usingVercelDataProtocol()    │
│  └── SSE: text-delta, tool-input, tool-output, finish│
│                                                      │
│  Authorization: workspace middleware + role-based     │
│  tool gating                                         │
│                                                      │
│  PostgreSQL + pgvector                               │
│  ├── document_chunks (embeddings)                    │
│  ├── agent_conversations (auto-managed)              │
│  └── agent_conversation_messages (auto-managed)      │
└─────────────────────────────────────────────────────┘
```

### Why Laravel-Primary (Not Next.js)

| Concern | Next.js (Current) | Laravel (Recommended) |
|---------|-------------------|----------------------|
| **API key security** | Exposed in Next.js server env | Stays in Laravel `.env` |
| **Authorization** | Must proxy cookies back to Laravel for each tool call | Native middleware + Spatie Permission |
| **Tool execution** | HTTP round-trips from Next.js to Laravel for each tool | Direct Eloquent queries, zero network overhead |
| **Conversation persistence** | Custom hooks calling Laravel API | `RemembersConversations` trait — automatic |
| **Streaming** | AI SDK `streamText` works well | Laravel AI SDK `->stream()` with Vercel protocol — compatible with `useChat` |
| **RAG** | Would need a separate embedding service | Native pgvector queries via Eloquent |
| **Testing** | Harder to test tool chains end-to-end | `AI::fake()` + standard Laravel feature tests |
| **Action execution** | Must call Laravel API to create bills/invoices | Direct access to Actions (CreateBill, CreateInvoice) |

### Tool Architecture: Migrating ChatToolController to Agent Tools

The current 8 tool endpoints in `ChatToolController` are HTTP controllers called via `fetch()` from the Next.js route handler. With the Laravel AI SDK, these become Agent tools — PHP classes with typed parameters that execute directly via Eloquent.

**Current (Next.js-driven):**
```
User -> useChat -> POST /api/chat (Next.js) -> streamText -> tool call
    -> fetch(LARAVEL_URL/api/v1/chat/tools/balances) -> JSON -> back to LLM
```

**Proposed (Laravel-driven):**
```
User -> useChat -> POST /api/v1/assistant/prompt (Laravel) -> Agent->stream()
    -> tool: GetAccountBalances -> direct Eloquent query -> back to LLM
    -> SSE stream (Vercel protocol) -> useChat renders
```

**Example tool migration:**

```php
// app/Ai/Tools/GetAccountBalances.php
namespace App\Ai\Tools;

use App\Models\Tenant\AccountBalance;
use Laravel\Ai\Contracts\Tool;

class GetAccountBalances implements Tool
{
    public function __construct(private int $workspaceId) {}

    public function name(): string { return 'get_account_balances'; }

    public function description(): string
    {
        return 'Get current account balances for the workspace.';
    }

    public function parameters(): array
    {
        return [
            'period' => [
                'type' => 'string',
                'enum' => ['current_month', 'last_month', 'ytd', 'all'],
                'description' => 'Time period filter',
            ],
        ];
    }

    public function __invoke(string $period = 'current_month'): string
    {
        $accounts = AccountBalance::with('chartAccount')
            ->where('workspace_id', $this->workspaceId)
            ->where('balance', '!=', 0)
            ->get()
            ->map(fn ($ab) => [
                'name' => $ab->chartAccount->name,
                'code' => $ab->chartAccount->code,
                'type' => $ab->chartAccount->type->value,
                'balance' => $ab->balance,
            ])
            ->take(50);

        return json_encode([
            'accounts' => $accounts,
            'as_of' => now()->toDateString(),
        ]);
    }
}
```

### Conversation Persistence

The Laravel AI SDK's `RemembersConversations` trait auto-creates two tables:

- `agent_conversations` — conversation metadata (replaces `chat_conversations`)
- `agent_conversation_messages` — message history (replaces `chat_messages`)

**Migration path**: Keep the existing `chat_conversations` and `chat_messages` tables for historical data. New conversations use the SDK's tables. Write a data migration to copy historical conversations if needed.

### Context Window Management

For workspace-scoped RAG context:

1. **Workspace isolation** — all `document_chunks` have `workspace_id`. Every vector query includes `->where('workspace_id', $id)`.
2. **Context budget** — limit RAG results to 10 chunks (~5,000 tokens) to leave room for the system prompt, conversation history, and tool results.
3. **Conversation trimming** — the `RemembersConversations` trait stores full history; the agent's `messages()` method loads the last 50 messages to stay within context limits.
4. **Page context** — when the frontend sends the current page URL, the agent resolves it to an entity (e.g. `/invoices/INV-001` resolves to the invoice record) and includes it in the system prompt.

### Streaming Protocol Compatibility

The Laravel AI SDK natively supports the Vercel data protocol. This means:

```php
// Laravel endpoint
return (new FinancialAssistant($workspace))
    ->stream($prompt)
    ->usingVercelDataProtocol();
```

The response includes the `x-vercel-ai-ui-message-stream` header and emits SSE events in the format `useChat` expects: `text-delta`, `tool-input-available`, `tool-output-available`, `finish`. The existing Next.js `useChat` hook consumes this directly — no changes needed to the frontend streaming logic.

**Next.js proxy route** (optional, for cookie forwarding):

```typescript
// frontend/src/app/api/chat/route.ts (simplified proxy)
export async function POST(req: Request) {
  const body = await req.json();
  const response = await fetch(`${LARAVEL_URL}/api/v1/assistant/prompt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: req.headers.get('cookie') ?? '',
      'X-Workspace-Id': body.workspaceId ?? '',
    },
    body: JSON.stringify(body),
  });

  // Pass through the SSE stream directly
  return new Response(response.body, {
    headers: response.headers,
  });
}
```

### Sources

- [Laravel AI SDK Streaming + Vercel Protocol](https://laravel.com/docs/12.x/ai-sdk)
- [Laravel AI SDK in Production](https://delaneyindustries.co.uk/blog/running-laravel-ai-sdk-in-production)
- [Prism Tool Calling](https://prismphp.com/core-concepts/tools-function-calling/)
- [AI SDK Stream Protocol](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol)

---

## 5. Existing State Assessment

### What Exists Today (021-AIQ)

| Component | Location | Status |
|-----------|----------|--------|
| **Chat route handler** | `frontend/src/app/api/chat/route.ts` | Working — AI SDK v4 `streamText` with 8 tools |
| **Chat panel** | `frontend/src/components/chat/ChatPanel.tsx` | Working — slide-in panel UI |
| **Chat messages** | `frontend/src/components/chat/ChatMessages.tsx` | Working — message rendering |
| **Tool result components** | `frontend/src/components/chat/results/` | 7 components: BalanceCard, CashFlowCard, ExpenseChart, InvoiceList, PnlCard, SearchResults, TransactionTable |
| **Chat store** | `frontend/src/stores/chat.ts` | Zustand — panel open/close, active conversation ID |
| **Chat history hooks** | `frontend/src/hooks/use-chat-history.ts` | TanStack Query — conversations list, messages, create, save |
| **Chat types** | `frontend/src/types/chat.ts` | TypeScript interfaces for all tool results + conversation/message types |
| **Laravel tool controller** | `app/Http/Controllers/Api/ChatToolController.php` | 7 endpoints: balances, transactions, pnl, cashFlow, invoices, expenses, search |
| **Laravel models** | `app/Models/Tenant/ChatConversation.php`, `ChatMessage.php` | Workspace-scoped with global scope |
| **Laravel policy** | `app/Policies/ChatConversationPolicy.php` | Authorization for conversations |
| **AI config** | Via `/api/v1/chat/ai-config` endpoint | Agent name, custom system prompt, model selection |
| **Frontend packages** | `@ai-sdk/anthropic@^3.0.58`, `@ai-sdk/react@^3.0.118` | Current Vercel AI SDK |
| **Backend packages** | `anthropic-ai/sdk@^0.6.0` | Direct Anthropic SDK (not used for chat — chat runs through Next.js) |

### What 020-AIB Spec Requires (Beyond 021-AIQ)

| Requirement | Current State | Gap |
|-------------|--------------|-----|
| Persistent conversations across sessions | Partially built — models exist, hooks exist | Need to wire up conversation resume properly |
| Inbox document review via conversation | Not built | Requires 019-AIX integration + action tools |
| Conversational document creation | Not built | Requires new tools: CreateBill, CreateInvoice, CreateJournalEntry |
| Context-aware panel (shows record in focus) | Not built | Requires page context passing + entity resolution |
| Context panel with workspace summary | Not built | Requires new component + summary data endpoint |
| Role-based action gating | Partially built — ChatConversationPolicy exists | Tools need permission checks per action |
| Intray surfacing | Partially built — `get_intray_items` tool exists | Need deeper integration with 018-ITR |

### Migration Path: 021-AIQ to 020-AIB

1. **Install Laravel AI SDK**: `composer require laravel/ai` + publish + migrate
2. **Create `FinancialAssistant` agent**: `php artisan make:agent FinancialAssistant`
3. **Migrate tools**: Convert `ChatToolController` methods into Agent tool classes
4. **Add new tools**: CreateBill, CreateInvoice, ConfirmInboxItem, RejectInboxItem
5. **Add RAG**: Create `document_chunks` table, write embedding ingestion command
6. **Switch streaming**: Laravel agent `->stream()` with Vercel protocol, simplify Next.js route to a proxy
7. **Keep frontend components**: The 7 tool result components + chat UI work as-is with `useChat`

---

## Recommendations Summary

### Immediate Actions (This Sprint)

| Action | Effort | Impact |
|--------|--------|--------|
| Switch to PostgreSQL (Neon) | 2 hours | Unblocks pgvector for RAG |
| Install `laravel/ai` | 30 minutes | Unlocks agents, tools, conversation persistence, embeddings |
| Create `FinancialAssistant` agent | 2 hours | Replace Next.js AI route with Laravel-native agent |
| Migrate 8 tools from ChatToolController | 4 hours | Tools run server-side, no HTTP round-trips |

### Short-Term (Next 2 Sprints)

| Action | Effort | Impact |
|--------|--------|--------|
| Set up `document_chunks` table with pgvector | 2 hours | Enable RAG infrastructure |
| Write embedding ingestion for key entities | 4 hours | Invoices, JEs, contacts, bank transactions get embedded |
| Add `SimilaritySearch` tool to agent | 1 hour | Natural language search across all financial data |
| Wire up Vercel data protocol streaming | 2 hours | Seamless streaming to existing Next.js UI |
| Add `RemembersConversations` | 1 hour | Replace custom conversation persistence |

### Medium-Term (020-AIB Full Implementation)

| Action | Effort | Impact |
|--------|--------|--------|
| Add action tools (CreateBill, CreateInvoice, etc.) | 8 hours | Conversational document creation |
| Add inbox review tools (019-AIX integration) | 8 hours | Document review through conversation |
| Context panel component | 6 hours | Shows record in focus or workspace summary |
| Page context resolution | 4 hours | Assistant knows what page user is viewing |
| Role-based tool gating | 4 hours | Tools check permissions before executing |

### Technology Choices

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AI orchestration | Laravel AI SDK (`laravel/ai`) | Official first-party, production-stable, native Laravel integration |
| Database | PostgreSQL on Neon | pgvector support, serverless scaling, database branching |
| Embedding model | OpenAI `text-embedding-3-small` | Best cost/performance ratio at $0.02/1M tokens, 1536 dimensions |
| LLM | Anthropic Claude (primary), OpenAI GPT (failover) | Already using Anthropic; SDK failover is trivial |
| Vector storage | pgvector in PostgreSQL | No separate vector DB needed; workspace-scoped queries via Eloquent |
| Streaming | Vercel data protocol via Laravel AI SDK | Direct compatibility with existing `useChat` frontend |
| Conversation persistence | `RemembersConversations` trait | Zero custom code; auto-creates tables |
| Frontend | Keep existing `useChat` + tool result components | Already working well; no changes needed |

---

## Open Questions

1. **Embedding refresh cadence** — when a journal entry is updated or an invoice status changes, how quickly should the embedding be re-generated? Options: synchronous (on save), queued (within seconds), batch (hourly).

2. **Conversation migration** — should existing `chat_conversations`/`chat_messages` data be migrated to the SDK's `agent_conversations`/`agent_conversation_messages` tables, or run both in parallel?

3. **Model selection** — the current setup allows per-workspace model selection (claude-haiku-4-5 vs claude-sonnet-4-6). Should this continue, or should the agent use a fixed model with failover?

4. **RAG vs. structured tools** — for precise numerical queries ("What's my bank balance?"), structured tools are always more accurate than RAG. RAG is better for fuzzy questions ("What was that invoice from the electrician last month?"). How should the agent decide which approach to use?

5. **019-AIX dependency** — the inbox review features depend on 019-AIX (AI Document Inbox). What's the timeline for that epic? Should 020-AIB Phase 1 ship without inbox review?
