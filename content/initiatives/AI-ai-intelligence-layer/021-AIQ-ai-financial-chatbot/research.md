---
title: "Research: AI Financial Chatbot"
---

# Research: AI Financial Chatbot

**Epic**: 021-AIQ | **Created**: 2026-03-14

---

## Vercel AI SDK — Key Patterns

**Decision**: Use `@ai-sdk/react` (`useChat`) + `@ai-sdk/anthropic` in the Next.js route handler.

**Rationale**: The AI SDK provides `toUIMessageStreamResponse()` which produces a data stream format that `useChat` understands natively. This gives us part-based message rendering, tool call state management (`input-streaming` → `input-available` → `output-available`), and smooth streaming with `experimental_throttle` — all for free. Building equivalent functionality in Laravel would require reimplementing this protocol.

**Alternatives considered**:
- Laravel SSE (like existing `LabelChartAccounts`) — rejected because it doesn't integrate with `useChat` and would require a custom streaming hook
- OpenAI SDK — rejected because Anthropic is already the provider and `@ai-sdk/anthropic` is the official adapter

---

## Message Rendering Pattern

The AI SDK v4 uses **part-based messages** (not single content strings):

```typescript
// Render a message
message.parts.map(part => {
  if (part.type === 'text') return <p>{part.text}</p>;
  if (part.type.startsWith('tool-')) {
    const toolName = part.type.replace('tool-', '');
    if (part.state === 'input-streaming') return <ToolCallSpinner name={toolName} />;
    if (part.state === 'output-available') return <RichResultComponent tool={toolName} output={part.output} />;
  }
});
```

This gives us the "thinking" indicator while Claude is calling a tool, and the rich component once results are ready.

---

## Tool Execution Pattern

Tools with server-side `execute()` functions run automatically — no client-side `addToolOutput` needed:

```typescript
// In /api/chat/route.ts
tools: {
  get_top_expenses: tool({
    description: 'Get the top expense accounts ranked by amount',
    parameters: z.object({ period: z.string().optional() }),
    execute: async ({ period }, { request }) => {
      // Forward cookies + workspace header to Laravel
      const res = await fetch(`${LARAVEL_URL}/api/v1/chat/tools/expenses`, {
        headers: {
          Cookie: request.headers.get('cookie') ?? '',
          'X-Workspace-Id': workspaceId,
        },
        next: { revalidate: 0 }, // Never cache financial data
      });
      return res.json();
    }
  })
}
```

---

## Auth Forwarding

The Next.js route handler is a server-side function. It receives the browser's Sanctum session cookie in the incoming request and forwards it to Laravel. Laravel's `SetWorkspaceContext` middleware validates the cookie and workspace membership as normal.

This is the same cookie-forwarding pattern used in all other server actions in the app.

---

## Model Selection

- `claude-haiku-4-5` — default model per workspace. Fast, cheap, handles tool routing well.
- `claude-sonnet-4-6` — available as workspace config option. Better for complex multi-step reasoning.
- Per-workspace model selection stored in `workspace_ai_configs.model`.
