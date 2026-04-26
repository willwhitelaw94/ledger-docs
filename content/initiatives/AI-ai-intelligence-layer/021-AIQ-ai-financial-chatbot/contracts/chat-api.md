---
title: "API Contracts: AI Financial Chatbot"
---

# API Contracts: AI Financial Chatbot

**Epic**: 021-AIQ | **Created**: 2026-03-14

All Laravel endpoints require:
- `Authorization: Bearer {token}` or Sanctum session cookie
- `X-Workspace-Id: {workspace_id}` header

---

## Chat History

### GET /api/v1/chat/conversations
List conversations for the workspace, sorted by last activity.

**Response** `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Top expenses this month",
      "last_message_at": "2026-03-14T10:30:00Z",
      "created_at": "2026-03-14T10:00:00Z"
    }
  ],
  "meta": { "current_page": 1, "last_page": 1, "per_page": 20 }
}
```

### POST /api/v1/chat/conversations
Create a new conversation.

**Response** `201`:
```json
{ "data": { "id": "uuid", "title": null, "created_at": "..." } }
```

### GET /api/v1/chat/conversations/{uuid}/messages
Get messages for a conversation (last 50, oldest first).

**Response** `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "role": "user",
      "content": "What are my top expenses?",
      "parts": null,
      "created_at": "..."
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "Here are your top expenses this month...",
      "parts": [...],
      "created_at": "..."
    }
  ]
}
```

### POST /api/v1/chat/conversations/{uuid}/messages
Append messages after a completed exchange.

**Request**:
```json
{
  "messages": [
    { "role": "user", "content": "...", "parts": null },
    { "role": "assistant", "content": "...", "parts": [...] }
  ],
  "title": "Top expenses this month"
}
```

**Response** `201`: `{ "data": { "saved": 2 } }`

---

## AI Config

### GET /api/v1/chat/ai-config
```json
{
  "data": {
    "agent_name": "Penny",
    "system_prompt": null,
    "model": "claude-haiku-4-5",
    "features_enabled": { "chatbot": true }
  }
}
```

### PUT /api/v1/chat/ai-config
**Request**: `{ "agent_name": "Max", "system_prompt": "We're a trades business...", "model": "claude-sonnet-4-6" }`
**Response** `200`: Updated config object

---

## Chat Tool Endpoints

All return structured data used by the Next.js tool `execute()` functions.

### GET /api/v1/chat/tools/balances
Query params: `period` (optional: `current_month`, `last_month`, `ytd`, `all`)

```json
{
  "accounts": [
    { "name": "Business Cheque Account", "code": "1010", "type": "asset", "balance": 2450000, "currency": "AUD" }
  ],
  "as_of": "2026-03-14"
}
```

### GET /api/v1/chat/tools/transactions
Query params: `account` (code), `from` (date), `to` (date), `limit` (default 20, max 50)

```json
{
  "transactions": [
    { "id": "uuid", "date": "2026-03-10", "description": "Bunnings - Materials", "account": "Subcontractors", "direction": "debit", "amount": 84000, "currency": "AUD", "journal_entry_uuid": "uuid" }
  ],
  "total": 1
}
```

### GET /api/v1/chat/tools/pnl
Query params: `from` (date, required), `to` (date, required)

```json
{
  "from": "2026-01-01", "to": "2026-03-31",
  "revenue": 15000000, "expenses": 9200000, "net": 5800000, "currency": "AUD",
  "top_revenue": [{ "name": "Service Revenue", "amount": 15000000 }],
  "top_expenses": [{ "name": "Subcontractors", "amount": 4200000 }, { "name": "Materials", "amount": 2100000 }]
}
```

### GET /api/v1/chat/tools/cash-flow
Query params: `period` (optional)

```json
{
  "period": "current_month",
  "cash_in": 8500000, "cash_out": 6200000, "net": 2300000, "currency": "AUD",
  "opening_balance": 1200000, "closing_balance": 3500000
}
```

### GET /api/v1/chat/tools/invoices
Query params: `status` (`overdue`, `upcoming`, `all`, default `overdue`)

```json
{
  "invoices": [
    { "uuid": "uuid", "number": "INV-0042", "contact": "Smith Constructions", "amount": 550000, "due_date": "2026-03-01", "days_overdue": 13, "currency": "AUD" }
  ],
  "total_overdue": 550000
}
```

### GET /api/v1/chat/tools/expenses
Query params: `period` (optional), `limit` (default 10, max 20)

```json
{
  "period": "current_month",
  "expenses": [
    { "name": "Subcontractors", "code": "5100", "amount": 4200000, "percentage": 45.6 }
  ],
  "total": 9200000, "currency": "AUD"
}
```

### GET /api/v1/chat/tools/search
Query params: `q` (required, min 2 chars)

```json
{
  "query": "bunnings",
  "transactions": [...]
}
```

---

## Next.js Route Handler

### POST /api/chat

**Request**:
```typescript
{
  messages: UIMessage[];       // @ai-sdk/react UIMessage[]
  workspaceId: string;
  conversationId?: string;
}
```

**Response**: `text/event-stream` — Vercel AI SDK UIMessageStream

The route handler:
1. Reads `ANTHROPIC_API_KEY` from `process.env`
2. Fetches workspace AI config from Laravel
3. Assembles system prompt: base + entity/industry context + custom prompt
4. Calls `streamText()` with 7 tools
5. Returns `result.toUIMessageStreamResponse()`
