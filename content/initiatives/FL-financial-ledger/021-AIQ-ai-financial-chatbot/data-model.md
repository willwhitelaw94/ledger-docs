---
title: "Data Model: AI Financial Chatbot"
---

# Data Model: AI Financial Chatbot

**Epic**: 021-AIQ | **Created**: 2026-03-14

---

## Entities

### ChatConversation

Represents a single conversation thread within a workspace.

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| `id` | bigint | PK | |
| `workspace_id` | bigint | FK workspaces, required | Tenant scope |
| `title` | string(255) | nullable | Auto-set from first user message (truncated to 60 chars) |
| `last_message_at` | timestamp | nullable | Updated on each new message |
| `created_at` | timestamp | | |
| `updated_at` | timestamp | | |

**Relationships**: `hasMany(ChatMessage)`, `belongsTo(Workspace)`
**Scopes**: Global scope on `workspace_id`
**Indexes**: `(workspace_id, last_message_at DESC)` for conversation list

---

### ChatMessage

A single message in a conversation — either user input or AI response.

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| `id` | bigint | PK | |
| `conversation_id` | bigint | FK chat_conversations, required | |
| `workspace_id` | bigint | FK workspaces, required | Denormalised for scoping |
| `role` | enum | `user` \| `assistant` | |
| `content` | text | required | Plain text content |
| `parts` | JSON | nullable | AI SDK `UIMessagePart[]` — preserves tool calls and results |
| `created_at` | timestamp | | |

**Relationships**: `belongsTo(ChatConversation)`
**Indexes**: `(conversation_id, created_at ASC)` for message loading
**Notes**: `parts` stores the full AI SDK message part structure for rich component re-rendering on history load

---

### WorkspaceAiConfig

Per-workspace AI agent configuration. One record per workspace (created when workspace is created).

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| `id` | bigint | PK | |
| `workspace_id` | bigint | FK workspaces, unique | One config per workspace |
| `agent_name` | string(100) | default `'Penny'` | Displayed in chat UI |
| `system_prompt` | text | nullable, max 2000 chars | Appended to base system prompt |
| `model` | string(50) | default `'claude-haiku-4-5'` | AI model for this workspace |
| `features_enabled` | JSON | default `{"chatbot": true}` | Feature toggles |
| `created_at` | timestamp | | |
| `updated_at` | timestamp | | |

**Relationships**: `belongsTo(Workspace)`
**Notes**: Auto-created in `CreateWorkspace` action with sensible defaults

---

## Tool Response Shapes (TypeScript types for Next.js)

```typescript
// frontend/src/types/chat.ts

export interface BalanceResult {
  accounts: Array<{ name: string; code: string; type: string; balance: number; currency: string }>;
  as_of: string; // ISO date
}

export interface PnlResult {
  from: string;
  to: string;
  revenue: number;
  expenses: number;
  net: number;
  currency: string;
  top_revenue: Array<{ name: string; amount: number }>;
  top_expenses: Array<{ name: string; amount: number }>;
}

export interface TransactionResult {
  transactions: Array<{
    id: string;
    date: string;
    description: string;
    account: string;
    direction: 'debit' | 'credit';
    amount: number;
    currency: string;
    journal_entry_uuid: string;
  }>;
  total: number;
}

export interface CashFlowResult {
  period: string;
  cash_in: number;
  cash_out: number;
  net: number;
  currency: string;
  opening_balance: number;
  closing_balance: number;
}

export interface InvoiceListResult {
  invoices: Array<{
    uuid: string;
    number: string;
    contact: string;
    amount: number;
    due_date: string;
    days_overdue: number;
    currency: string;
  }>;
  total_overdue: number;
}

export interface ExpenseResult {
  period: string;
  expenses: Array<{ name: string; code: string; amount: number; percentage: number }>;
  total: number;
  currency: string;
}

export interface SearchResult {
  query: string;
  transactions: TransactionResult['transactions'];
}

export interface AiConfig {
  agent_name: string;
  system_prompt: string | null;
  model: string;
  features_enabled: Record<string, boolean>;
}
```

---

## Migrations Required

```
2026_03_14_100001_create_chat_conversations_table.php
2026_03_14_100002_create_chat_messages_table.php
2026_03_14_100003_create_workspace_ai_configs_table.php
```
