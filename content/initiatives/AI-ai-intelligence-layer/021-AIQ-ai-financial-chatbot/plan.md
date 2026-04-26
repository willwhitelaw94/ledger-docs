---
title: "Implementation Plan: AI Financial Chatbot"
---

# Implementation Plan: AI Financial Chatbot

**Epic**: 021-AIQ | **Date**: 2026-03-14 | **Spec**: [spec.md](/spec.md)
**Status**: Draft

---

## Summary

A workspace-scoped AI financial chatbot using the **Vercel AI SDK** (`@ai-sdk/react` + `@ai-sdk/anthropic`) for Next.js-quality streaming and tool call rendering. Claude uses server-side tools to query real Laravel ledger data — no fabricated numbers. Responses render rich inline components (balance cards, P&L summaries, transaction tables, bar charts) using the AI SDK's part-based message model.

**Architecture pattern**: Next.js route handler owns the AI conversation loop (`streamText` + `toUIMessageStreamResponse`). Tools call Laravel API endpoints for data. Laravel owns chat history persistence and workspace AI config.

---

## Technical Context

**Language/Version**: PHP 8.4 (Laravel 12) + TypeScript (Next.js 16, React 19)
**AI SDK**: `@ai-sdk/react` + `@ai-sdk/anthropic` (Vercel AI SDK v4)
**Model**: `claude-haiku-4-5` for tool routing, `claude-sonnet-4-6` for reasoning (configurable per workspace)
**Storage**: SQLite/MySQL — 2 new tenant-scoped tables (`chat_conversations`, `chat_messages`) + 1 config table (`workspace_ai_configs`)
**Testing**: Pest feature tests (Laravel tool endpoints + chat history CRUD), Playwright browser tests
**Streaming**: `streamText` → `toUIMessageStreamResponse()` — Vercel AI SDK data stream protocol
**Performance**: First token within 2 seconds; tool calls resolve within 1 second each

### Dependencies

- `@ai-sdk/react` — `useChat` hook, part-based message rendering
- `@ai-sdk/anthropic` — Anthropic provider for Next.js
- `anthropic-ai/sdk` (PHP) — already installed for existing AI actions
- Recharts (already in project) — bar charts, sparklines
- Laravel: existing projectors and API Resources are the tool data sources

### Constraints

- `ANTHROPIC_API_KEY` must be available as a server-side env var in Next.js (`frontend/.env.local`) — never exposed to browser
- All Laravel tool endpoints must go through `SetWorkspaceContext` middleware — same workspace scoping as all other endpoints
- Tool responses must be summarised server-side before sending to Claude — no raw Eloquent collections
- Chat history endpoint must not return more than 50 messages per page (context window protection)

---

## Architecture Decision: Next.js-First vs Laravel-First

**Decision**: Next.js route handler owns the AI loop.

**Rationale**: The Vercel AI SDK's `useChat` hook expects a specific data stream format (`toUIMessageStreamResponse()`). Building this in Laravel would require reimplementing the entire protocol, losing all SDK benefits (part-based messages, tool call states, `experimental_throttle`). The Next.js route handler is server-side — `ANTHROPIC_API_KEY` never reaches the browser.

**Laravel's role**: Financial data tools (read-only query endpoints) + chat history persistence + AI config storage.

**Auth forwarding**: The Next.js route handler forwards the Sanctum session cookie + `X-Workspace-Id` header to each Laravel tool call via `fetch()` server-to-server.

---

## Data Model

### `chat_conversations` (tenant-scoped)

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `workspace_id` | bigint FK | Tenant scope |
| `title` | string nullable | Auto-generated from first message |
| `last_message_at` | timestamp nullable | For sorting |
| `created_at` / `updated_at` | timestamps | |

### `chat_messages` (tenant-scoped)

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `conversation_id` | bigint FK | |
| `workspace_id` | bigint FK | Denormalised for scoping |
| `role` | enum: `user`, `assistant` | |
| `content` | text | Plain text content |
| `parts` | JSON nullable | AI SDK UIMessage parts (tool calls, results) |
| `created_at` | timestamp | |

### `workspace_ai_configs` (tenant-scoped, one per workspace)

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint PK | |
| `workspace_id` | bigint FK unique | One config per workspace |
| `agent_name` | string default `'Penny'` | Displayed in chat header |
| `system_prompt` | text nullable | Custom context prepended to every request |
| `model` | string default `'claude-haiku-4-5'` | Configurable per workspace |
| `features_enabled` | JSON | `{"chatbot": true}` |
| `created_at` / `updated_at` | timestamps | |

---

## API Contracts

### Laravel — Chat History & Config

```
GET  /api/v1/chat/conversations                  # List conversations (paginated)
POST /api/v1/chat/conversations                  # Create conversation
GET  /api/v1/chat/conversations/{uuid}/messages  # Get messages (last 50)
POST /api/v1/chat/conversations/{uuid}/messages  # Append messages (batch)
GET  /api/v1/chat/ai-config                      # Get workspace AI config
PUT  /api/v1/chat/ai-config                      # Update workspace AI config
```

### Laravel — Chat Tool Endpoints (read-only)

All require `X-Workspace-Id` header and Sanctum authentication.

```
GET /api/v1/chat/tools/balances     ?period=current_month
GET /api/v1/chat/tools/transactions ?account=&from=&to=&limit=20
GET /api/v1/chat/tools/pnl          ?from=&to=
GET /api/v1/chat/tools/cash-flow    ?period=current_month
GET /api/v1/chat/tools/invoices     ?status=overdue
GET /api/v1/chat/tools/expenses     ?period=current_month&limit=10
GET /api/v1/chat/tools/search       ?q=
```

### Next.js — AI Chat Route

```
POST /api/chat    # streamText with tools, returns UIMessageStream
```

Request body:
```typescript
{
  messages: UIMessage[];      // AI SDK UIMessage[]
  workspaceId: string;
  conversationId?: string;
}
```

---

## UI Components

### Pages & Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/chat` | `ChatPage` | Full-page chat (dedicated view) |
| *(any page)* | `ChatPanel` | Slide-over panel, accessible everywhere |

### Chat Components (`frontend/src/components/chat/`)

| Component | Purpose |
|-----------|---------|
| `ChatPanel` | Slide-over wrapper, open/close state via Zustand |
| `ChatMessages` | Scrollable message list |
| `ChatMessage` | Single message bubble — renders text + parts |
| `ChatInput` | Textarea + submit, disabled during streaming |
| `ChatHeader` | Agent name, workspace, new chat button |
| `ChatToolCall` | Inline display of tool invocation (loading state) |

### Rich Result Components (`frontend/src/components/chat/results/`)

These render from `part.type === 'tool-{toolName}'` when `part.state === 'output-available'`:

| Component | Tool | Renders |
|-----------|------|---------|
| `BalanceCard` | `get_account_balances` | Account name + balance amount card |
| `PnlCard` | `get_profit_and_loss` | Revenue / Expenses / Net in 3-column card |
| `TransactionTable` | `get_transactions` | Table with account, description, amount, date — rows link to JE |
| `ExpenseChart` | `get_top_expenses` | Horizontal bar chart (Recharts) |
| `CashFlowCard` | `get_cash_flow` | Cash in / Cash out / Net card |
| `InvoiceList` | `get_outstanding_invoices` | Invoice rows with amount + due date + link |
| `SearchResults` | `search_transactions` | Transaction table (reuses TransactionTable) |

### State Management

- `useChatStore` (Zustand) — panel open/close, active conversation ID
- `useChat` (AI SDK) — message state, streaming, tool calls
- `useChatHistory` (TanStack Query) — conversation list + message history from Laravel

---

## Implementation Phases

### Phase 1: Laravel Foundation (Days 1–3)

1. Migration: `chat_conversations`, `chat_messages`, `workspace_ai_configs`
2. Models: `ChatConversation`, `ChatMessage`, `WorkspaceAiConfig` (all tenant-scoped with `workspace_id`)
3. Seeder: default `WorkspaceAiConfig` record per workspace (run in `CreateWorkspace` action)
4. Feature flag: `ai_chatbot` via Laravel Pennant
5. 7 chat tool controllers (`ChatToolController`) — one action per tool, each returning structured arrays
6. Chat history controllers (`ChatConversationController`, `ChatMessageController`)
7. AI config controller (`ChatAiConfigController` — GET + PUT)
8. Routes: all under `middleware(['auth:sanctum', 'workspace', 'feature:ai_chatbot'])`
9. Policies: `ChatConversationPolicy`, `ChatMessagePolicy`
10. Pest feature tests for all endpoints

### Phase 2: Next.js AI Route Handler (Days 4–5)

1. Install `@ai-sdk/react` and `@ai-sdk/anthropic` in `frontend/`
2. `frontend/src/app/api/chat/route.ts` — POST handler:
   - Reads `ANTHROPIC_API_KEY` from server env
   - Fetches workspace AI config from Laravel
   - Defines 7 tools using `tool()` with Zod schemas
   - Each tool's `execute()` calls the corresponding Laravel tool endpoint with forwarded cookies + workspace header
   - Returns `result.toUIMessageStreamResponse()`
3. Tool definitions with Zod schemas matching Laravel response shapes
4. System prompt assembly: base prompt + workspace entity type + industry + custom user prompt
5. `frontend/src/hooks/use-chat-history.ts` — TanStack Query hooks for conversations + messages

### Phase 3: Chat UI (Days 6–8)

1. `useChatStore` Zustand store — panel visibility, active conversation
2. `ChatPanel` slide-over component — renders above page content, keyboard shortcut to open (`Cmd+K` or dedicated button)
3. `ChatMessages` + `ChatMessage` — renders `message.parts` using AI SDK pattern:
   - `part.type === 'text'` → text bubble
   - `part.type === 'tool-{name}'` + `state === 'input-streaming'` → `ChatToolCall` with spinner
   - `part.type === 'tool-{name}'` + `state === 'output-available'` → rich result component
4. All 7 rich result components
5. `ChatInput` — textarea with `handleSubmit` from `useChat`, disabled on `status !== 'ready'`
6. `ChatHeader` — agent name from config, "New Chat" button
7. Chat button in layout sidebar (gated by `ai_chatbot` feature flag)
8. `/chat` full page route (same components, no slide-over wrapper)

### Phase 4: Chat History + Agent Config (Days 9–10)

1. On `useChat` `onFinish` callback — save messages to Laravel via `POST /api/v1/chat/conversations/{id}/messages`
2. Conversation list in `ChatPanel` header — load from `GET /api/v1/chat/conversations`
3. Click conversation → load history into `useChat` initial messages
4. AI Agent settings page at `/settings/ai-agent`:
   - Agent name input
   - Custom context prompt textarea
   - Model selector (haiku / sonnet)
   - AI features toggle
5. Settings saved to `PUT /api/v1/chat/ai-config`

### Phase 5: Polish + Testing (Days 11–14)

1. Empty state — first-time users see suggested questions ("Try asking: What are my top expenses this month?")
2. Error handling — API down, AI unavailable, stream interrupted
3. Disclaimer banner in chat panel ("AI responses are informational only, not financial advice")
4. `experimental_throttle: 50` on `useChat` for smooth streaming
5. Playwright browser tests: open panel, send message, verify response renders, verify rich component appears
6. Pest tests for all Laravel endpoints
7. Pint + TypeScript strict mode

---

## Gate 3: Architecture Check

### Multi-Tenancy ✅

- `chat_conversations.workspace_id` — tenant-scoped with global scope on model
- `chat_messages.workspace_id` — denormalised for fast scoping
- `workspace_ai_configs.workspace_id` — unique per workspace
- All tool endpoints behind `SetWorkspaceContext` middleware — identical to all other workspace-scoped routes
- Next.js route handler passes `X-Workspace-Id` to every Laravel tool call

### Event Sourcing ✅

- No new events needed — chat is read-only against the ledger
- Chat history stored as regular Eloquent models (not event-sourced — chat is not a financial mutation)

### Frontend TypeScript Standards ✅ (Next.js override per CLAUDE.md)

- All components are `.tsx` with strict TypeScript
- `useChat` typed with `UIMessage[]` from `@ai-sdk/react`
- Tool response shapes defined as TypeScript interfaces in `frontend/src/types/chat.ts`
- No `any` types — all tool responses typed against Laravel response shapes
- Rich result components receive typed props (`BalanceCardProps`, `PnlCardProps`, etc.)
- TanStack Query for all server state (conversations, messages, AI config)

### No Business Logic in Frontend ✅

- Financial calculations happen in Laravel tool endpoints
- Claude only interprets data — never generates numbers
- `get_top_expenses` returns pre-ranked data from Laravel; frontend renders it

### Feature Flags ✅

- `ai_chatbot` Pennant flag — backend route middleware guards tool + history endpoints
- Frontend: chat panel button hidden when flag disabled; `/chat` page redirects if flag off
- Dual-gated (backend middleware + frontend conditional rendering)

### Authorization ✅

- `ChatConversationPolicy` — users can only read/write their workspace's conversations
- Tool endpoints use existing workspace-scoped query patterns (same as `AccountBalanceProjector`)
- Next.js route handler validates workspace membership before calling tools (via forwarded cookies)

### Red Flags — None ✅

| Check | Status |
|-------|--------|
| `any` types for API responses | ❌ Not planned — all typed |
| Business logic in frontend | ❌ All in Laravel tool handlers |
| No workspace scoping on chat data | ❌ `workspace_id` on all tables |
| ANTHROPIC_API_KEY in browser | ❌ Server-side route handler only |
| Cross-workspace data in tools | ❌ `SetWorkspaceContext` middleware enforces isolation |
| useEffect + useState for API calls | ❌ TanStack Query used |

**Gate 3 Status: PASS ✅**

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AI SDK version churn | Low | Medium | Pin `@ai-sdk/*` versions; track changelog |
| Sanctum cookie forwarding fails | Medium | High | Test server-to-server auth in Phase 2; fall back to token if needed |
| Tool response too large for context window | Low | Medium | Cap all tool responses at 50 rows server-side; summarise in Laravel before returning |
| Claude hallucinating numbers | Very Low | High | Tools return real data; Claude only describes it — never asked to generate figures |
| Streaming blocked by CORS | Low | Medium | Next.js route handler is same-origin; no CORS issue |
| Chat history growing unbounded | Low | Low | 50-message cap per fetch; auto-archive conversations > 30 days |

---

## Next Steps

1. Run `/speckit-tasks` to generate implementation task list
2. Add `ANTHROPIC_API_KEY` to `frontend/.env.local`
3. Run `/speckit-implement` to build
