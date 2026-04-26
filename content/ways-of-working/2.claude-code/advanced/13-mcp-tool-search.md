---
title: MCP Tool Search
description: 85% context reduction through lazy loading MCP tools
---

The standout V4 feature that preserves your context for actual work.

## The Problem

Every MCP server you connect adds tool definitions to Claude's context. Before V4, all tools loaded at startup—whether you needed them or not.

```text
Before V4:
- 10 MCP servers connected
- ~77,000 tokens consumed at startup
- Only ~123,000 tokens left for your actual work
```

That's 38% of your context gone before you even start.

## The Solution: Lazy Loading

MCP Tool Search loads tools on-demand rather than at startup. Claude only loads tool definitions when it needs them.

```text
With MCP Tool Search:
- 10 MCP servers connected
- ~8,700 tokens consumed at startup
- ~191,300 tokens available for work
```

**Result:** 85% reduction in initial context consumption. You preserve 95% of your context for actual work.

## How It Works

1. **At startup** — Claude loads only tool names and brief descriptions
2. **When needed** — Full tool definitions load on-demand
3. **After use** — Tool definitions can be unloaded if context gets tight

This is lazy loading applied to AI tooling.

## Accuracy Improvements

MCP Tool Search doesn't just save context—it improves accuracy:

| Model | Accuracy Improvement |
|-------|---------------------|
| Claude Opus 4 | +25 percentage points |
| Claude Opus 4.5 | +8.6 percentage points |

Less noise in context = better tool selection.

## Checking Your Context

Use `/context` to visualize current usage:

```text
/context
```

This shows a colored grid displaying what's consuming your context—including MCP overhead.

## Configuration

MCP Tool Search auto-enables when context usage hits a threshold:

| Setting | Default |
|---------|---------|
| Auto-enable threshold | 10% context usage |
| Manual toggle | Via `/config` |

### Enabling/Disabling

1. Run `/config`
2. Search for "Tool Search" or "MCP"
3. Toggle the setting

## When It Helps Most

MCP Tool Search provides the biggest benefit when:

- **Many MCPs connected** — More tools = more context saved
- **Long conversations** — Every token matters over time
- **Complex tasks** — You need context for code, not tool definitions
- **Multiple integrations** — GitHub + database + filesystem + cloud

## Best Practices

### 1. Monitor Context Regularly

```text
/context
```

Check before and after connecting new MCPs.

### 2. Disable Unused MCPs

Even with lazy loading, unused MCPs add some overhead. If you're not using an MCP in this session:

```bash
# Session-specific MCP usage
claude --mcp server-name
```

### 3. Combine with Session Hygiene

MCP Tool Search works best with good context habits:

- Use `/clear` between unrelated tasks
- Compact at natural breakpoints (`/compact`)
- Start fresh after 20+ turns

## The Numbers

Research indicates "an average 39% performance drop when instructions cross multiple conversation turns." MCP Tool Search helps by:

1. **Reducing baseline context** — More room for conversation history
2. **Improving signal-to-noise** — Only relevant tools in context
3. **Enabling longer sessions** — Before hitting quality degradation

## Practical Impact

| Scenario | Before V4 | With Tool Search |
|----------|-----------|------------------|
| 5 MCPs, simple task | 50K tokens consumed | 6K tokens consumed |
| 10 MCPs, complex feature | 77K tokens consumed | 9K tokens consumed |
| Many MCPs, long conversation | Context exhaustion | Sustainable work |

## Related

- [Context Management](/ways-of-working/claude-code/07-context-management) — Core context concepts
- [Extending Claude](/ways-of-working/claude-code-advanced/01-extending-claude) — MCP overview and context costs
