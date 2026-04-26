---
title: "Implementation Tasks: AI Assistant"
---

# Implementation Tasks: AI Assistant

**Mode**: AI | **Date**: 2026-03-21 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

---

## Phase 0: PostgreSQL Migration

- [ ] T001 Update `.env` — set `DB_CONNECTION=pgsql`, `DB_HOST=127.0.0.1`, `DB_PORT=5432`, `DB_DATABASE=moneyquest`, `DB_USERNAME` and `DB_PASSWORD` per the user's local Postgres setup. File: `.env`

- [ ] T002 Enable pgvector extension — create migration `xxxx_enable_pgvector_extension.php`. Content: `DB::statement('CREATE EXTENSION IF NOT EXISTS vector;')` in up(), `DB::statement('DROP EXTENSION IF EXISTS vector;')` in down(). This must run BEFORE any migration that uses vector columns. File: `database/migrations/2026_03_22_000001_enable_pgvector_extension.php`

- [ ] T003 Run `php artisan migrate:fresh --seed` on PostgreSQL. Verify all migrations pass. Fix any failures.

- [ ] T004 Fix case-sensitive search — grep the codebase for `'like'` in query builders (specifically in Controllers and Actions that do text search). Replace `where('column', 'like', ...)` with `where('column', 'ILIKE', ...)` for PostgreSQL compatibility. Key files to check: `app/Http/Controllers/Api/ChatToolController.php` (search method), `app/Http/Controllers/Api/ContactController.php`, `app/Http/Controllers/Api/InvoiceController.php`, `app/Http/Controllers/Api/FileController.php`, and any other controllers with search. Use `ILIKE` which works on Postgres (case-insensitive) and doesn't exist on SQLite — so wrap with `config('database.default') === 'pgsql' ? 'ILIKE' : 'like'` or just use `ILIKE` since we're committing to Postgres.

- [ ] T005 Update demo snapshot commands — the `demo:snapshot` and `demo:restore` commands currently copy SQLite files. Update `app/Console/Commands/` snapshot commands to use `pg_dump` / `pg_restore` for PostgreSQL. Read existing snapshot commands first to understand the pattern.

- [ ] T006 Run full test suite: `php artisan test --compact`. Fix any PostgreSQL-related failures. Common issues: boolean comparisons, string length enforcement, case-sensitive assertions.

- [ ] T007 Verify frontend works end-to-end — start the Next.js dev server, login, navigate through main pages (dashboard, invoices, contacts, banking, files), verify data loads correctly from PostgreSQL.

---

## Phase 1: Laravel AI SDK Foundation

- [ ] T008 Install Laravel AI SDK: `composer require laravel/ai`. Read the package documentation first (check `vendor/laravel/ai/README.md` or the published docs) to understand the exact API — Agent interface, Tool interface, streaming method, conversation persistence.

- [ ] T009 Publish AI SDK migrations and config: `php artisan vendor:publish --provider="Laravel\Ai\AiServiceProvider"` (or equivalent tag). Run `php artisan migrate` to create `ai_conversations` and `ai_messages` tables.

- [ ] T010 Configure AI SDK — set `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` in `.env`. Configure the default provider in `config/ai.php` (Anthropic primary). File: `.env` and `config/ai.php`

- [ ] T011 Create Agent: `FinancialAssistant` — Laravel AI SDK Agent class. File: `app/AI/FinancialAssistant.php`
  - Implements the Agent interface (or extends base Agent class — check SDK docs)
  - Constructor: accepts `Workspace $workspace`, `User $user`, `?string $pageContext = null`
  - `instructions()`: returns system prompt — workspace name, entity type, user role, financial domain rules ("never fabricate data", "cite source records", "refuse actions the user's role doesn't permit"), page context if provided
  - `tools()`: returns array of tool instances (registered below)
  - Uses `RemembersConversations` trait (check SDK docs for exact trait name)
  - Model: `anthropic/claude-sonnet-4-5` (or configurable from `chat_ai_configs` table)

- [ ] T012 Create Tool: `GetAccountBalances` — File: `app/AI/Tools/GetAccountBalances.php`
  - Migrate logic from `ChatToolController::accountBalances()` method
  - Parameters: `period` (enum: current_month, last_month, ytd, all)
  - Direct Eloquent query — no HTTP call. Workspace scoped via constructor-injected workspace
  - Returns structured array matching existing tool response shape

- [ ] T013 [P] Create Tool: `GetProfitAndLoss` — File: `app/AI/Tools/GetProfitAndLoss.php`
  - Migrate from `ChatToolController::profitAndLoss()`
  - Parameters: `from` (date), `to` (date)
  - Direct Eloquent query

- [ ] T014 [P] Create Tool: `GetOutstandingInvoices` — File: `app/AI/Tools/GetOutstandingInvoices.php`
  - Migrate from `ChatToolController::outstandingInvoices()`
  - Parameters: `status` (enum: overdue, upcoming, all)

- [ ] T015 [P] Create Tool: `GetCashFlow` — File: `app/AI/Tools/GetCashFlow.php`
  - Migrate from `ChatToolController::cashFlow()`
  - Parameters: `period`

- [ ] T016 [P] Create Tool: `GetTopExpenses` — File: `app/AI/Tools/GetTopExpenses.php`
  - Migrate from `ChatToolController::topExpenses()`
  - Parameters: `period`, `limit`

- [ ] T017 [P] Create Tool: `GetTransactions` — File: `app/AI/Tools/GetTransactions.php`
  - Migrate from `ChatToolController::transactions()`
  - Parameters: `account`, `from`, `to`, `limit`

- [ ] T018 [P] Create Tool: `SearchTransactions` — File: `app/AI/Tools/SearchTransactions.php`
  - Migrate from `ChatToolController::searchTransactions()`
  - Parameters: `q` (string, min 2 chars)
  - NOTE: Use `ILIKE` for Postgres search

- [ ] T019 [P] Create Tool: `GetIntrayItems` — File: `app/AI/Tools/GetIntrayItems.php`
  - Migrate from `ChatToolController::intrayItems()`
  - No parameters

- [ ] T020 Create Controller: `AssistantController` — File: `app/Http/Controllers/Api/AssistantController.php`
  - `stream(Request $request)`: validate message + optional conversation_id + optional page_context. Instantiate FinancialAssistant with workspace + user + page_context. Call agent stream method. Return SSE response. Gate::authorize with a general assistant access check.
  - `conversations(Request $request)`: list user's conversations for current workspace. Return JSON.
  - `conversation(Request $request, string $uuid)`: get conversation with messages. Return JSON.
  - `deleteConversation(Request $request, string $uuid)`: delete conversation. Return 204.
  - `renameConversation(Request $request, string $uuid)`: update title. Return JSON.

- [ ] T021 Register routes in `routes/api.php` — inside workspace-scoped middleware group:
  ```
  Route::post('assistant/stream', [AssistantController::class, 'stream']);
  Route::get('assistant/conversations', [AssistantController::class, 'conversations']);
  Route::get('assistant/conversations/{uuid}', [AssistantController::class, 'conversation']);
  Route::delete('assistant/conversations/{uuid}', [AssistantController::class, 'deleteConversation']);
  Route::patch('assistant/conversations/{uuid}/title', [AssistantController::class, 'renameConversation']);
  ```

- [ ] T022 Update Next.js chat route — simplify `frontend/src/app/api/chat/route.ts` to proxy to `/api/v1/assistant/stream` on the Laravel backend. The route should forward the request body and stream the response back. OR: update the frontend `useChat` transport to point directly at the Laravel endpoint (preferred if CORS allows).

- [ ] T023 Data migration: chat_conversations → ai_conversations — create migration `xxxx_migrate_chat_to_ai_sdk.php` that copies existing `chat_conversations` and `chat_messages` rows into the Laravel AI SDK tables (`ai_conversations`, `ai_messages`). Map fields appropriately. Keep old tables until verified. File: `database/migrations/xxxx_migrate_chat_to_ai_sdk.php`

- [ ] T024 Feature tests: `AssistantControllerTest` — File: `tests/Feature/Api/AssistantControllerTest.php`
  - Use `AI::fake()` to mock agent responses
  - Test: stream endpoint returns SSE response
  - Test: conversations list scoped to user + workspace
  - Test: conversation detail returns messages
  - Test: delete conversation
  - Test: rename conversation
  - Test: workspace isolation (conversation from workspace A not visible from B)
  - ~10 tests

- [ ] T025 [P] Unit tests: tool classes — File: `tests/Unit/AI/Tools/` (one test file per tool)
  - Test each tool returns expected data shape from seeded workspace data
  - Use `AI::fake()` or call tool `handle()` directly
  - Verify workspace scoping

- [ ] T026 Run `vendor/bin/pint --dirty` on all new PHP files.

---

## Phase 2: Write Actions [US3]

- [ ] T027 Create Tool: `CreateBill` — File: `app/AI/Tools/CreateBill.php`
  - Parameters: `contact_name` (string), `amount_cents` (int), `due_date` (date), `description` (string), `category` (string, optional)
  - Permission check: `$this->user->hasPermissionTo('bill.create')` — abort if denied
  - Resolve contact by name (fuzzy match or create suggestion)
  - Resolve chart account by category name
  - Call existing `CreateInvoice` action (type=bill) to create draft bill
  - Return confirmation summary (draft ID, amount, contact, due date)
  - NEVER post directly — always create as draft

- [ ] T028 [P] Create Tool: `CreateInvoice` — File: `app/AI/Tools/CreateInvoice.php`
  - Same pattern as CreateBill but type=invoice
  - Permission check: `$this->user->hasPermissionTo('invoice.create')`

- [ ] T029 [P] Create Tool: `CreateJournalEntry` — File: `app/AI/Tools/CreateJournalEntry.php`
  - Parameters: `narration` (string), `lines` (array of {account_name, direction, amount_cents})
  - Permission check: `$this->user->hasPermissionTo('journal-entry.create')`
  - Validate debits equal credits before creating
  - Call existing `CreateJournalEntry` action
  - Return confirmation summary

- [ ] T030 Add write tools to FinancialAssistant — update `tools()` method to include CreateBill, CreateInvoice, CreateJournalEntry. These are conditionally registered based on user permissions (only add if user has the permission). File: `app/AI/FinancialAssistant.php`

- [ ] T031 Feature tests: write tools — File: `tests/Feature/AI/WriteToolsTest.php`
  - Test: CreateBill creates draft bill with correct fields
  - Test: CreateBill denied for client role
  - Test: CreateJournalEntry validates debit/credit balance
  - Test: CreateInvoice creates draft invoice
  - ~8 tests

### Phase 2b: Action Tools (Approve / Reject / Reverse / Send / Reconcile)

- [ ] T056 [P] Create Tool: `ApproveJournalEntry` — File: `app/AI/Tools/ApproveJournalEntry.php`
  - Parameters: `journal_entry_uuid` (string)
  - Permission check: `$this->user->hasPermissionTo('journal-entry.approve')`
  - Calls existing `ApproveJournalEntry` action
  - Returns confirmation with entry number and status

- [ ] T057 [P] Create Tool: `RejectJournalEntry` — File: `app/AI/Tools/RejectJournalEntry.php`
  - Parameters: `journal_entry_uuid` (string), `reason` (string)
  - Permission check: `$this->user->hasPermissionTo('journal-entry.reject')`
  - Calls existing `RejectJournalEntry` action

- [ ] T058 [P] Create Tool: `ReverseJournalEntry` — File: `app/AI/Tools/ReverseJournalEntry.php`
  - Parameters: `journal_entry_uuid` (string), `reason` (string)
  - Permission check: `$this->user->hasPermissionTo('journal-entry.reverse')`
  - Calls existing `ReverseJournalEntry` action

- [ ] T059 [P] Create Tool: `ApproveInvoice` — File: `app/AI/Tools/ApproveInvoice.php`
  - Parameters: `invoice_uuid` (string)
  - Permission check: `$this->user->hasPermissionTo('invoice.approve')`
  - Calls existing `ApproveInvoice` action (via InvoiceAggregate)

- [ ] T060 [P] Create Tool: `VoidInvoice` — File: `app/AI/Tools/VoidInvoice.php`
  - Parameters: `invoice_uuid` (string), `reason` (string)
  - Permission check: `$this->user->hasPermissionTo('invoice.void')`
  - Calls existing `VoidInvoice` action

- [ ] T061 [P] Create Tool: `SendInvoice` — File: `app/AI/Tools/SendInvoice.php`
  - Parameters: `invoice_uuid` (string)
  - Permission check: `$this->user->hasPermissionTo('invoice.send')`
  - Calls existing `SendInvoice` action

- [ ] T062 [P] Create Tool: `RecordPayment` — File: `app/AI/Tools/RecordPayment.php`
  - Parameters: `invoice_uuid` (string), `amount_cents` (int), `payment_date` (date), `payment_method` (string, optional)
  - Permission check: `$this->user->hasPermissionTo('invoice.recordPayment')`
  - Calls existing `RecordPayment` action

- [ ] T063 [P] Create Tool: `ReconcileTransaction` — File: `app/AI/Tools/ReconcileTransaction.php`
  - Parameters: `bank_transaction_id` (int), `match_type` (string: invoice|bill|journal_entry|account), `match_uuid` (string)
  - Permission check: `$this->user->hasPermissionTo('banking.reconcile')`
  - Calls existing reconciliation action

- [ ] T064 Update FinancialAssistant tools() — add all new action tools (T056–T063) to the agent's tool list, conditionally registered based on user permissions. File: `app/AI/FinancialAssistant.php`

- [ ] T065 Feature tests: action tools — File: `tests/Feature/AI/ActionToolsTest.php`
  - Test: ApproveJournalEntry approves a submitted entry
  - Test: ApproveJournalEntry denied for bookkeeper role
  - Test: VoidInvoice voids an approved invoice
  - Test: SendInvoice sends an approved invoice
  - Test: RecordPayment records payment on invoice
  - Test: ReconcileTransaction matches bank transaction
  - Test: ReverseJournalEntry creates reversal
  - Test: RejectJournalEntry rejects with reason
  - ~10 tests

---

## Phase 3: RAG Pipeline

- [ ] T032 Migration: `create_document_chunks_table` — File: `database/migrations/xxxx_create_document_chunks_table.php`
  - Columns: id, uuid, workspace_id (FK), chunkable_type (string), chunkable_id (bigint), content (text), metadata (jsonb, nullable), embedding (vector 1536), timestamps
  - Indexes: workspace_id, morphs index on chunkable_type + chunkable_id
  - Vector index: `$table->vector('embedding', dimensions: 1536)->vectorIndex()` (HNSW) — check Laravel AI SDK docs for exact syntax

- [ ] T033 Model: `DocumentChunk` — File: `app/Models/Tenant/DocumentChunk.php`
  - fillable: uuid, workspace_id, chunkable_type, chunkable_id, content, metadata, embedding
  - Casts: metadata → array, embedding → vector (check SDK docs for vector cast)
  - Relationships: workspace() BelongsTo, chunkable() MorphTo
  - Boot: auto-generate uuid

- [ ] T034 Create ChunkBuilder service — File: `app/AI/Embedding/ChunkBuilder.php`
  - `buildChunk(Model $model): string` — returns human-readable text summary
  - Handles: Invoice ("Invoice INV-042 to Telstra, $1,240 inc GST, due 30 Mar..."), JournalEntry, Contact, BankTransaction, ChartAccount, Note
  - Uses `formatMoney()` for amounts, includes status, key dates, line items
  - Returns a single string per record (financial records are naturally one chunk)

- [ ] T035 Create GenerateEmbedding job — File: `app/Jobs/GenerateEmbedding.php`
  - Queued job (ShouldQueue)
  - Accepts model class + model ID
  - Loads model, calls ChunkBuilder::buildChunk()
  - Calls `AI::embed($chunkText)` to get vector (check SDK docs for exact API)
  - Upserts DocumentChunk row (update if exists for same chunkable_type + chunkable_id + workspace_id)

- [ ] T036 Create EmbeddingObserver — File: `app/Observers/EmbeddingObserver.php`
  - Listens to `created` and `updated` events
  - Dispatches GenerateEmbedding job
  - Register on models: Invoice, JournalEntry, Contact, BankTransaction, ChartAccount, Note
  - Register in AppServiceProvider::boot()

- [ ] T037 Create SemanticSearch tool — File: `app/AI/Tools/SemanticSearch.php`
  - Use Laravel AI SDK's SimilaritySearch if available, otherwise manual implementation:
  - Parameters: `query` (string)
  - Embed the query via `AI::embed($query)`
  - Query DocumentChunk where workspace_id matches, order by vector similarity, limit 10
  - Return content + metadata for matched chunks

- [ ] T038 Add SemanticSearch to FinancialAssistant tools — update `tools()` in `app/AI/FinancialAssistant.php`

- [ ] T039 Create artisan command: `assistant:embed-workspace` — File: `app/Console/Commands/EmbedWorkspace.php`
  - Accepts workspace_id argument
  - Iterates all embeddable models for that workspace
  - Dispatches GenerateEmbedding job for each
  - Shows progress bar
  - Usage: `php artisan assistant:embed-workspace 5`

- [ ] T040 Feature tests: RAG pipeline — File: `tests/Feature/AI/RagPipelineTest.php`
  - Test: ChunkBuilder generates correct text for each model type
  - Test: GenerateEmbedding job creates/upserts DocumentChunk
  - Test: SemanticSearch returns relevant chunks (use AI::fakeEmbeddings())
  - Test: workspace isolation — chunks from workspace A not returned for workspace B
  - ~8 tests

- [ ] T041 Run `vendor/bin/pint --dirty` on all new PHP files.

---

## Phase 4: Frontend — Context-Aware Panel [US4]

- [ ] T042 Update chat store — enhance `frontend/src/stores/chat.ts` to track: `pageContext` (current URL), `selectedConversationId`, `panelMode` ('chat' | 'context'). Add actions: `setPageContext`, `selectConversation`.

- [ ] T043 Create `ContextPanel` component — File: `frontend/src/components/chat/ContextPanel.tsx`
  - When assistant references a specific record (invoice, contact, etc.) → render record summary card with key fields + link to full record
  - When no specific record in focus → render workspace summary: bank balance, overdue invoice count, pending bills total
  - Fetches summary data from existing API endpoints (dashboard data hooks)
  - Shows alongside ChatPanel in a split layout

- [ ] T044 Update ChatPanel — modify `frontend/src/components/chat/ChatPanel.tsx`
  - Change from bottom-right sticky to slide-in panel from right edge (Sheet component)
  - Full-height panel with conversation sidebar (left) + messages (right)
  - Page context passed with each message via the `pageContext` field
  - Conversation list in sidebar — loaded from `GET /api/v1/assistant/conversations`
  - Click conversation to load history
  - "New conversation" button

- [ ] T045 Update chat transport — modify the `useChat` hook configuration to point to the new `/api/v1/assistant/stream` endpoint (via proxy or direct). Update the message payload to include `conversation_id` and `page_context`. File: `frontend/src/hooks/use-chat.ts` or wherever useChat is configured.

- [ ] T046 [P] Add page context tracking — in the dashboard layout component, track the current URL and update the chat store's `pageContext` on route changes. File: `frontend/src/app/(dashboard)/layout.tsx` or a shared layout wrapper.

- [ ] T047 [P] Add action confirmation UI — when the assistant proposes a write action (create bill, create invoice), render a confirmation card in the chat with "Confirm" / "Cancel" buttons. On confirm, send a follow-up message to the assistant. File: `frontend/src/components/chat/ActionConfirmation.tsx`

### Phase 4b: Enhanced Assistant UI Components

- [ ] T066 Create `AssistantPanel` wrapper component — File: `frontend/src/components/assistant/assistant-panel.tsx`
  - `'use client'`
  - Three-column layout: conversation sidebar (280px, dark bg-zinc-950) + chat area (flex-1) + context panel (350px, collapsible)
  - Full-width toggle: button in header switches between panel mode (Sheet from right edge, ~60% width) and full-width mode (100% viewport)
  - Remembers mode preference in Zustand store
  - Keyboard shortcut: `Cmd/Ctrl+/` toggles panel open/close

- [ ] T067 [P] Create `ConversationSidebar` component — File: `frontend/src/components/assistant/conversation-sidebar.tsx`
  - Dark sidebar (bg-zinc-950, text-zinc-300)
  - "New Conversation" button at top (prominent)
  - Search input for filtering conversations
  - Conversations grouped by: Today, Yesterday, This Week, Earlier
  - Each item: title, time, preview (truncated), unread dot
  - Active conversation highlighted with left border-indigo-500
  - Hover reveals "..." menu: Rename, Pin, Delete
  - Bottom: usage meter — "{N} of {limit} messages used this month" with progress bar
  - Uses `GET /api/v1/assistant/conversations`

- [ ] T068 [P] Create `StreamingIndicator` component — File: `frontend/src/components/assistant/streaming-indicator.tsx`
  - Pulsing indigo dot with "Thinking..." text
  - Shown at the bottom of messages while assistant is streaming
  - Subtle animate-pulse, not a spinner

- [ ] T069 [P] Create `ToolResultCard` wrapper component — File: `frontend/src/components/assistant/tool-result-card.tsx`
  - Shared wrapper for all tool results: border, rounded-lg, subtle shadow, icon header with tool name
  - "View full report →" link at bottom (navigates to the relevant page)
  - Collapsible: click header to expand/collapse result data
  - Props: `title`, `icon`, `linkTo`, `children`

- [ ] T070 Update existing tool result components — update the 7 existing result components in `frontend/src/components/chat/` to use the new `ToolResultCard` wrapper and match the mockup design:
  - `BalanceCard` → wrapped in ToolResultCard, compact layout
  - `PnlCard` → wrapped in ToolResultCard, mini bar chart using div bars
  - `TransactionTable` → wrapped in ToolResultCard, collapsible
  - `CashFlowCard` → wrapped in ToolResultCard
  - `InvoiceList` → wrapped in ToolResultCard with status badges
  - `ExpenseChart` → wrapped in ToolResultCard with percentage bars
  - `SearchResults` → wrapped in ToolResultCard
  - Files: `frontend/src/components/chat/BalanceCard.tsx`, `PnlCard.tsx`, `TransactionTable.tsx`, `CashFlowCard.tsx`, `InvoiceList.tsx`, `ExpenseChart.tsx`, `SearchResults.tsx`

- [ ] T071 [P] Create `ActionConfirmationCard` component — File: `frontend/src/components/assistant/action-confirmation-card.tsx`
  - Indigo-accented border (border-2 border-indigo-500/20)
  - Header: action name + document icon (e.g. "Create Bill")
  - Field rows: icon + label + value for each field (contact, amount, category, due date)
  - Missing field callout: amber bg, AlertCircle icon, question text, clickable suggestions
  - Two buttons: primary "Create Draft" + ghost "Cancel"
  - On confirm: sends confirmation message to assistant
  - On cancel: sends "cancel" to assistant

- [ ] T072 [P] Create `ActionSuccessCard` component — File: `frontend/src/components/assistant/action-success-card.tsx`
  - Emerald-accented border (border-emerald-500/20 bg-emerald-50/5)
  - CheckCircle icon + "Done!" header
  - Summary: "Draft bill BIL-0089 created for Officeworks — $250.00 due 28 March"
  - "View bill →" link to the created record

- [ ] T073 Update `ContextPanel` (T043) — enhance with 3-tab structure:
  - Tab 1 "Summary": workspace financial metrics (bank balance, receivables, payables, net) with mini sparkline SVGs
  - Tab 2 "Record": specific record detail when referenced in conversation (invoice, contact, etc.) with status badge, line items, payment history
  - Tab 3 "Compare": side-by-side comparison when user asks to compare records, highlighted differences in amber
  - Use shadcn Tabs component
  - File: `frontend/src/components/assistant/context-panel.tsx`

- [ ] T074 [P] Create `UsageMeter` component — File: `frontend/src/components/assistant/usage-meter.tsx`
  - Shows "{N} of {limit} messages this month" with progress bar
  - Green (<70%), amber (70–90%), red (>90%)
  - Fetched from a new endpoint or derived from conversation message count
  - Shown at bottom of conversation sidebar

---

## Phase 5: Polish & Production

- [ ] T048 Provider failover — configure Laravel AI SDK to use Anthropic primary, OpenAI fallback. Check SDK docs for provider chain syntax. File: `app/AI/FinancialAssistant.php` or `config/ai.php`

- [ ] T049 [P] Rate limiting — add rate limit middleware to assistant/stream route. Limit: 30 requests per minute per user. File: `routes/api.php` (add throttle middleware)

- [ ] T050 [P] Streaming timeout — add 30-second timeout to agent stream. If exceeded, return error message. Check SDK docs for timeout configuration.

- [ ] T051 [P] Cost tracking — log token usage per assistant call. Create `ai_usage_logs` table or use the SDK's built-in logging. Track: workspace_id, user_id, model, input_tokens, output_tokens, cost_cents, timestamp.

- [ ] T052 [P] Update AI config — allow workspace admins to configure model, temperature, max tokens from the settings page. Extend existing `chat_ai_configs` table if needed. Ensure FinancialAssistant reads these settings.

- [ ] T053 Browser tests: assistant panel — File: `tests/Browser/AssistantTest.php`
  - Test: open assistant panel via Cmd+/
  - Test: send a message and receive streaming response
  - Test: conversation appears in sidebar
  - Test: switch between conversations
  - ~5 tests

- [ ] T054 Run `vendor/bin/pint --dirty` on all modified PHP files. Verify `npx tsc --noEmit` passes.

- [ ] T055 Run full test suite: `php artisan test --compact`. All tests green.
