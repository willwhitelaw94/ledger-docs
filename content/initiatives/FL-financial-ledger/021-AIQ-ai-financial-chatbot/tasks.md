---
title: "Implementation Tasks: AI Financial Chatbot"
---

# Implementation Tasks: AI Financial Chatbot

**Epic**: 021-AIQ | **Generated**: 2026-03-14 | **Mode**: AI
**Plan**: [plan.md](/plan.md) | **Spec**: [spec.md](/spec.md)

---

## Phase 1: Laravel Foundation — Migrations, Models, Config

- [X] T001 Migration: `create_chat_conversations_table` — columns: `id` bigint PK, `workspace_id` bigint FK workspaces not null, `title` varchar(255) nullable, `last_message_at` timestamp nullable, `created_at`/`updated_at` timestamps. Indexes: `(workspace_id, last_message_at DESC)`. File: `database/migrations/2026_03_14_100001_create_chat_conversations_table.php`

- [X] T002 Migration: `create_chat_messages_table` — columns: `id` bigint PK, `conversation_id` bigint FK chat_conversations not null, `workspace_id` bigint FK workspaces not null (denormalised), `role` enum('user','assistant') not null, `content` text not null, `parts` json nullable. Index: `(conversation_id, created_at ASC)`. File: `database/migrations/2026_03_14_100002_create_chat_messages_table.php`

- [X] T003 Migration: `create_workspace_ai_configs_table` — columns: `id` bigint PK, `workspace_id` bigint FK workspaces unique not null, `agent_name` varchar(100) default 'Penny', `system_prompt` text nullable, `model` varchar(50) default 'claude-haiku-4-5', `features_enabled` json default '{"chatbot":true}', `created_at`/`updated_at` timestamps. File: `database/migrations/2026_03_14_100003_create_workspace_ai_configs_table.php`

- [X] T004 Model: `ChatConversation` — `$fillable = ['workspace_id','title','last_message_at']`, cast `last_message_at` to `datetime`, `hasMany(ChatMessage::class)`, `belongsTo(Workspace::class)`, global scope on `workspace_id` (use `addGlobalScope` with closure checking `WorkspaceContext::id()`). File: `app/Models/Tenant/ChatConversation.php`

- [X] T005 Model: `ChatMessage` — `$fillable = ['conversation_id','workspace_id','role','content','parts']`, cast `parts` to `array`, `belongsTo(ChatConversation::class)`, global scope on `workspace_id`. File: `app/Models/Tenant/ChatMessage.php`

- [X] T006 Model: `WorkspaceAiConfig` — `$fillable = ['workspace_id','agent_name','system_prompt','model','features_enabled']`, cast `features_enabled` to `array`, `belongsTo(Workspace::class)`. File: `app/Models/Tenant/WorkspaceAiConfig.php`

- [X] T007 Pennant feature flag: register `ai_chatbot` in `AppServiceProvider::boot()` — `Feature::define('ai_chatbot', fn (User $user) => true)` (default enabled for all users; workspace toggle comes from `WorkspaceAiConfig.features_enabled`). File: `app/Providers/AppServiceProvider.php`

- [X] T008 Seed default `WorkspaceAiConfig` in `CreateWorkspace` action — after workspace is created, call `WorkspaceAiConfig::create(['workspace_id' => $workspace->id])` to initialise with defaults. File: `app/Actions/Workspace/CreateWorkspace.php`

- [X] T009 Policy: `ChatConversationPolicy` — `viewAny(User $user): bool` → `$user->hasPermissionTo('journal-entries.view')`, `view(User $user, ChatConversation $c): bool` → same permission + `$c->workspace_id === request()->input('workspace_id')`, `create`: same, `delete`: same. Register in `AppServiceProvider` via `Gate::policy(ChatConversation::class, ChatConversationPolicy::class)`. File: `app/Policies/ChatConversationPolicy.php`

- [X] T010 Run `php artisan migrate` and verify all 3 tables created. Confirm `WorkspaceAiConfig` seeding works by running `php artisan migrate:fresh --seed` and checking the demo workspace has a config record.

---

## Phase 2: Laravel API — Chat History & AI Config Controllers

- [X] T011 Controller: `ChatConversationController` — methods: `index(Request $r): JsonResponse` (paginate conversations by workspace_id, order by last_message_at DESC, 20 per page, return `['data' => [...], 'meta' => [...]]`), `store(Request $r): JsonResponse` (create conversation with workspace_id, return 201 with uuid-format id). Use `$this->authorize('viewAny', ChatConversation::class)` inline. File: `app/Http/Controllers/Api/ChatConversationController.php`

- [X] T012 Controller: `ChatMessageController` — methods: `index(ChatConversation $conversation): JsonResponse` (return last 50 messages ordered by `created_at ASC`), `store(Request $r, ChatConversation $conversation): JsonResponse` (bulk-insert messages array from `$r->input('messages')`, optionally update `$conversation->title` if `$r->input('title')`, update `$conversation->last_message_at`, return 201 with `['data' => ['saved' => count]]`). File: `app/Http/Controllers/Api/ChatMessageController.php`

- [X] T013 Controller: `ChatAiConfigController` — methods: `show(Request $r): JsonResponse` (get or create `WorkspaceAiConfig` for workspace, return `['data' => [...]]`), `update(Request $r): JsonResponse` (validate `agent_name` string max 100, `system_prompt` nullable string max 2000, `model` in ['claude-haiku-4-5','claude-sonnet-4-6'], `features_enabled` array; update and return 200). File: `app/Http/Controllers/Api/ChatAiConfigController.php`

- [X] T014 [P] Form Request: `StoreChatMessagesRequest` — `authorize()`: `$this->user()->can('view', ChatConversation::find($this->route('conversation')))`, `rules()`: `['messages' => 'required|array|max:100', 'messages.*.role' => 'required|in:user,assistant', 'messages.*.content' => 'required|string', 'messages.*.parts' => 'nullable|array', 'title' => 'nullable|string|max:60']`. File: `app/Http/Requests/Chat/StoreChatMessagesRequest.php`

- [X] T015 [P] Routes: add chat routes to `routes/api.php` under `middleware(['auth:sanctum', 'workspace'])` group — `GET /v1/chat/conversations`, `POST /v1/chat/conversations`, `GET /v1/chat/conversations/{conversation}/messages`, `POST /v1/chat/conversations/{conversation}/messages`, `GET /v1/chat/ai-config`, `PUT /v1/chat/ai-config`. File: `routes/api.php`

---

## Phase 3: Laravel API — Chat Tool Endpoints

- [X] T016 Controller: `ChatToolController` — 7 methods, all read-only, all workspace-scoped. Add `$this->authorize('viewAny', ChartAccount::class)` to each for permission gate. File: `app/Http/Controllers/Api/ChatToolController.php`

- [X] T017 `ChatToolController::balances(Request $r)` — query `AccountBalance` projector table for the workspace; filter by `period` param (`current_month`, `last_month`, `ytd`, `all` — default `current_month`) using date range on `AccountBalance.updated_at`; return `['accounts' => [['name','code','type','balance','currency']], 'as_of' => today()->toDateString()]`. Only include accounts with non-zero balance. Max 50 rows.

- [X] T018 `ChatToolController::transactions(Request $r)` — query `JournalEntryLine` joining `JournalEntry` and `ChartAccount`; filter by `account` (chart account code), `from`/`to` dates, `limit` (default 20, max 50); return `['transactions' => [['id','date','description','account','direction','amount','currency','journal_entry_uuid']], 'total' => count]`.

- [X] T019 `ChatToolController::pnl(Request $r)` — validate `from` and `to` params required (date format); query `AccountBalance` or `JournalEntryLine` grouped by chart account type; sum revenue (type=revenue) and expenses (type=expense) for period; return `['from','to','revenue','expenses','net','currency','top_revenue' => [...up to 5], 'top_expenses' => [...up to 5]]`.

- [X] T020 `ChatToolController::cashFlow(Request $r)` — query bank/cash account transactions for period; compute opening balance (sum before `from`), cash_in (sum of credits), cash_out (sum of debits), closing balance; return `['period','cash_in','cash_out','net','currency','opening_balance','closing_balance']`.

- [X] T021 `ChatToolController::invoices(Request $r)` — query `Invoice` model; filter by `status` param (`overdue` = past due_date + unpaid, `upcoming` = due in next 30 days, `all`); return `['invoices' => [['uuid','number','contact','amount','due_date','days_overdue','currency']], 'total_overdue' => sum]`. Max 20 rows.

- [X] T022 `ChatToolController::expenses(Request $r)` — query `JournalEntryLine` for expense-type accounts for period; group by `chart_account_id`; sort by amount DESC; compute percentage of total; return `['period','expenses' => [['name','code','amount','percentage']], 'total','currency']`. Limit default 10, max 20.

- [X] T023 `ChatToolController::search(Request $r)` — validate `q` required min 2 chars; search `JournalEntry.description` LIKE `%q%` and `Contact.name` LIKE `%q%`; join with lines; return `['query' => q, 'transactions' => [...same shape as T018 transaction rows...]]`. Max 20 results.

- [X] T024 [P] Routes: add tool routes under `middleware(['auth:sanctum', 'workspace'])` — `GET /v1/chat/tools/balances`, `/transactions`, `/pnl`, `/cash-flow`, `/invoices`, `/expenses`, `/search` — all mapped to `ChatToolController`. File: `routes/api.php`

---

## Phase 4: Next.js — AI Route Handler & Types

- [X] T025 Install AI SDK packages: run `npm install @ai-sdk/react @ai-sdk/anthropic` in `frontend/` directory. Verify `package.json` includes both dependencies.

- [X] T026 TypeScript types: create `frontend/src/types/chat.ts` — export interfaces: `BalanceResult`, `PnlResult`, `TransactionResult`, `CashFlowResult`, `InvoiceListResult`, `ExpenseResult`, `SearchResult`, `AiConfig` — shapes match exactly the Laravel tool response contracts in `data-model.md`. Also export `ChatConversation { id: string; title: string | null; last_message_at: string; created_at: string }` and `ChatMessage { id: string; role: 'user'|'assistant'; content: string; parts: unknown[] | null; created_at: string }`.

- [X] T027 Next.js route handler: create `frontend/src/app/api/chat/route.ts` — `export async function POST(req: Request)`. Read `ANTHROPIC_API_KEY` from `process.env`. Parse body `{ messages, workspaceId, conversationId }`. Fetch AI config from `${LARAVEL_URL}/api/v1/chat/ai-config` with forwarded cookies + `X-Workspace-Id: workspaceId` header. Assemble system prompt: base (financial advisor system prompt, no fabricated numbers, workspace-scoped) + entity context from config + `config.system_prompt` if set. Call `streamText({ model: anthropic('claude-haiku-4-5') /* or config.model */, system, messages, tools, experimental_throttle: 50 })`. Return `result.toUIMessageStreamResponse()`. File: `frontend/src/app/api/chat/route.ts`

- [X] T028 Tool definitions in `route.ts` — define 7 tools using `tool()` from `ai` package. Each tool: `description` (used by Claude to route), `parameters` (Zod schema matching query params), `execute: async (params, { request }) => fetch(${LARAVEL_URL}/api/v1/chat/tools/{endpoint}?{params}, { headers: { Cookie: req.headers.get('cookie') ?? '', 'X-Workspace-Id': workspaceId }, cache: 'no-store' }).then(r => r.json())`. Tools: `get_account_balances` → `/tools/balances`, `get_transactions` → `/tools/transactions`, `get_profit_and_loss` → `/tools/pnl`, `get_cash_flow` → `/tools/cash-flow`, `get_outstanding_invoices` → `/tools/invoices`, `get_top_expenses` → `/tools/expenses`, `search_transactions` → `/tools/search`. File: `frontend/src/app/api/chat/route.ts`

- [X] T029 LARAVEL_URL env constant: ensure `LARAVEL_URL` is read from `process.env.NEXT_PUBLIC_LARAVEL_URL` (already set in `.env.local` as `http://localhost:8000`). Add a guard: if `!process.env.ANTHROPIC_API_KEY` return `Response.json({ error: 'AI not configured' }, { status: 503 })`. File: `frontend/src/app/api/chat/route.ts`

---

## Phase 5: Next.js — Hooks & State Management

- [X] T030 TanStack Query hook: `useChatConversations()` — `GET /api/v1/chat/conversations` with `X-Workspace-Id` header from workspace context; returns `{ data: ChatConversation[], isLoading, error }`. File: `frontend/src/hooks/use-chat-history.ts`

- [X] T031 TanStack Query hook: `useChatMessages(conversationId: string | null)` — `GET /api/v1/chat/conversations/{id}/messages`; enabled only when `conversationId` is non-null; returns `{ data: ChatMessage[], isLoading }`. File: `frontend/src/hooks/use-chat-history.ts`

- [X] T032 TanStack Query hook: `useSaveChatMessages()` — mutation calling `POST /api/v1/chat/conversations/{id}/messages` with `{ messages, title }` body; used in `useChat` `onFinish` callback. File: `frontend/src/hooks/use-chat-history.ts`

- [X] T033 TanStack Query hook: `useAiConfig()` — `GET /api/v1/chat/ai-config`; returns `AiConfig`. `useUpdateAiConfig()` — mutation for `PUT /api/v1/chat/ai-config`. File: `frontend/src/hooks/use-ai-config.ts`

- [X] T034 Zustand store: `useChatStore` — state: `isPanelOpen: boolean`, `activeConversationId: string | null`; actions: `openPanel()`, `closePanel()`, `togglePanel()`, `setActiveConversation(id: string | null)`. File: `frontend/src/hooks/use-chat-store.ts`

---

## Phase 6: Next.js — Chat UI Components

- [X] T035 [US2] Component: `ChatHeader` — props: `agentName: string`, `onNewChat: () => void`, `onClose: () => void`. Renders agent name + avatar initial, "New Chat" button, close (X) button. File: `frontend/src/components/chat/ChatHeader.tsx`

- [X] T036 [US2] Component: `ChatInput` — props: `onSubmit: (message: string) => void`, `isDisabled: boolean`. Controlled textarea with Cmd+Enter submit. Shows spinner overlay when `isDisabled`. File: `frontend/src/components/chat/ChatInput.tsx`

- [X] T037 [US2] Component: `ChatToolCall` — props: `toolName: string`, `state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'`. Renders tool name with spinner during `input-streaming`/`input-available`, hides self when `output-available` (parent renders the rich component instead). File: `frontend/src/components/chat/ChatToolCall.tsx`

- [X] T038 [US2] Rich result: `BalanceCard` — props: `result: BalanceResult`. Renders card listing each account with name, code, balance formatted as currency (divide by 100). File: `frontend/src/components/chat/results/BalanceCard.tsx`

- [X] T039 [US2] Rich result: `PnlCard` — props: `result: PnlResult`. Renders 3-column card: Revenue / Expenses / Net — amounts formatted as currency. Date range shown as subtitle. File: `frontend/src/components/chat/results/PnlCard.tsx`

- [X] T040 [US2] Rich result: `TransactionTable` — props: `result: TransactionResult`. Renders table: Date / Description / Account / Amount (debit red, credit green). Each row: clicking description navigates to `/journal-entries/{journal_entry_uuid}`. File: `frontend/src/components/chat/results/TransactionTable.tsx`

- [X] T041 [US2] Rich result: `ExpenseChart` — props: `result: ExpenseResult`. Renders horizontal bar chart using Recharts `BarChart` (already in project). X-axis: amount. Y-axis: account names. Bars coloured by percentage rank. File: `frontend/src/components/chat/results/ExpenseChart.tsx`

- [X] T042 [US2] Rich result: `CashFlowCard` — props: `result: CashFlowResult`. Renders 3-column card: Cash In (green) / Cash Out (red) / Net (green or red). Shows opening + closing balance below. File: `frontend/src/components/chat/results/CashFlowCard.tsx`

- [X] T043 [US2] Rich result: `InvoiceList` — props: `result: InvoiceListResult`. Renders table: Invoice # / Contact / Amount / Due Date / Days Overdue. Each row links to `/invoices/{uuid}`. File: `frontend/src/components/chat/results/InvoiceList.tsx`

- [X] T044 [US2] Rich result: `SearchResults` — props: `result: SearchResult`. Re-uses `TransactionTable` component with `result.transactions`. Shows query as subtitle. File: `frontend/src/components/chat/results/SearchResults.tsx`

- [X] T045 [US1][US2] Component: `ChatMessage` — props: `message: UIMessage` (from `@ai-sdk/react`). Renders message bubble per role. For `message.parts`: iterate and render `part.type === 'text'` as text bubble; `part.type.startsWith('tool-')` with `state === 'input-streaming'|'input-available'` as `ChatToolCall`; `part.type.startsWith('tool-')` with `state === 'output-available'` dispatches to the correct rich result component by tool name. File: `frontend/src/components/chat/ChatMessage.tsx`

- [X] T046 [US1] Component: `ChatMessages` — props: `messages: UIMessage[]`, `isLoading: boolean`. Scrollable container (`overflow-y-auto`), auto-scrolls to bottom on new messages (`useEffect` + `scrollIntoView`). Renders `ChatMessage` for each. Shows typing indicator when `isLoading`. File: `frontend/src/components/chat/ChatMessages.tsx`

- [X] T047 [US5] Add disclaimer banner: inside `ChatMessages`, render a fixed banner at the top of the message list: "AI responses are informational only and not financial advice." — small gray text, dismissible with localStorage persistence. File: `frontend/src/components/chat/ChatMessages.tsx`

---

## Phase 7: Next.js — Chat Panel & Page

- [X] T048 [US6] Component: `ChatPanel` — slide-over panel using `Sheet` from shadcn/ui. State driven by `useChatStore`. Contains `ChatHeader`, `ChatMessages`, `ChatInput`. Initialises `useChat({ api: '/api/chat', body: { workspaceId }, experimental_throttle: 50 })`. On `onFinish`: call `useSaveChatMessages()` mutation with user + assistant messages. File: `frontend/src/components/chat/ChatPanel.tsx`

- [X] T049 [US3] Conversation history in `ChatPanel` — sidebar within the panel listing conversations from `useChatConversations()`. Clicking a conversation: calls `useChatMessages(id)` then sets `useChat` initial messages via `setMessages()`. "New Chat" button clears messages and sets `activeConversationId` to null. File: `frontend/src/components/chat/ChatPanel.tsx`

- [X] T050 [US6] Mount `ChatPanel` in root layout — import and render `<ChatPanel />` in `frontend/src/app/(dashboard)/layout.tsx` so it's available on every dashboard page. File: `frontend/src/app/(dashboard)/layout.tsx`

- [X] T051 [US6] Chat trigger button in sidebar navigation — add chat icon button to `frontend/src/components/layout/sidebar.tsx` (or equivalent nav component). On click: calls `useChatStore().togglePanel()`. File: `frontend/src/components/layout/sidebar.tsx`

- [X] T052 [US6] Dedicated `/chat` page — renders same `ChatMessages` + `ChatInput` full-page (no slide-over wrapper). Uses same `useChat` hook. File: `frontend/src/app/(dashboard)/chat/page.tsx`

- [X] T053 Add `/chat` to navigation — add "Chat" nav item to `frontend/src/lib/navigation.ts` (sidebar nav items array). File: `frontend/src/lib/navigation.ts`

---

## Phase 8: Next.js — AI Agent Settings Page

- [X] T054 [US4] AI Agent settings page — at `/settings/ai-agent`. Fetches config from `useAiConfig()`. Form using React Hook Form + Zod: `agent_name` text input, `system_prompt` textarea (max 2000 chars, char counter), `model` select (haiku / sonnet with labels and descriptions), `features_enabled.chatbot` toggle. On submit: `useUpdateAiConfig()` mutation. File: `frontend/src/app/(dashboard)/settings/ai-agent/page.tsx`

- [X] T055 Add "AI Agent" entry to settings navigation — add link to `/settings/ai-agent` in settings sidebar nav. File: `frontend/src/app/(dashboard)/settings/page.tsx` or settings layout

---

## Phase 9: Tests

- [X] T056 [P] Pest feature test: `ChatConversationApiTest` — test `index` returns paginated conversations for workspace, `store` creates conversation, cross-workspace access returns 403, unauthenticated returns 401. File: `tests/Feature/Api/ChatConversationApiTest.php`

- [X] T057 [P] Pest feature test: `ChatMessageApiTest` — test `index` returns last 50 messages ordered ASC, `store` bulk-inserts messages + updates conversation title + last_message_at, accessing another workspace's conversation returns 403. File: `tests/Feature/Api/ChatMessageApiTest.php`

- [X] T058 [P] Pest feature test: `ChatAiConfigApiTest` — test `show` auto-creates config if missing, `update` saves valid fields, `update` rejects invalid model string. File: `tests/Feature/Api/ChatAiConfigApiTest.php`

- [X] T059 [P] Pest feature test: `ChatToolApiTest` — test each of 7 tool endpoints returns correct response shape, workspace isolation (other workspace data not returned), unauthenticated returns 401. File: `tests/Feature/Api/ChatToolApiTest.php`

- [X] T060 [P] Run `vendor/bin/pint --dirty` and fix any formatting issues across all new PHP files.

- [X] T061 [P] Run `php artisan test --compact` — all tests must pass (target: 0 failures).

---

## Phase 10: Polish

- [X] T062 Empty state in `ChatMessages` — when `messages.length === 0` render suggested questions: "Try asking: What are my top expenses this month?", "What's my cash position?", "Which invoices are overdue?" — each as a clickable chip that pre-fills the input. File: `frontend/src/components/chat/ChatMessages.tsx`

- [X] T063 Error handling in `ChatPanel` — if `useChat` status is `error`, show retry button and error message "Something went wrong. Try again." File: `frontend/src/components/chat/ChatPanel.tsx`

- [X] T064 TypeScript check: run `cd frontend && npx tsc --noEmit` — resolve all type errors in new files. Confirm no `any` types in new chat components (exception: Recharts props if needed — annotate with comment).

- [X] T065 Verify `ANTHROPIC_API_KEY` is in `frontend/.env.local` and `frontend/.env.example` (add placeholder `ANTHROPIC_API_KEY=` to example). File: `frontend/.env.example`
