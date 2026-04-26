---
title: "Context Management"
description: Understanding and managing Claude Code's context window effectively
---

Master the art of working within Claude's context limits.

## What is a Context Window?

A **context window** is the total amount of information (measured in tokens) that Claude can see during a conversation. Think of it as Claude's working memory - everything it can reference at any moment.

**What fills your context:**
- Your prompts and questions
- Claude's responses
- Code files Claude has read
- Tool outputs (search results, terminal output)
- Conversation history
- System instructions (CLAUDE.md, project rules)

**Token basics:**
- 1 token ≈ 4 characters or ¾ of a word
- 200,000 tokens ≈ 150,000 words
- A typical code file is 500-2,000 tokens

## Context Windows by Model

All Claude Code models share the same context window:

| Model | Context Window | Output Limit |
|-------|---------------|--------------|
| Claude Haiku | 200,000 tokens | 8,192 tokens |
| Claude Sonnet | 200,000 tokens | 64,000 tokens |
| Claude Opus | 200,000 tokens | 64,000 tokens |

**Practical limits:** While you have 200k tokens, quality often degrades before hitting the limit. Aim to stay under 150k for optimal performance.

## The Golden Rule: One Task, One Chat

Research indicates an average **39% performance drop** when instructions cross multiple conversation turns. The longer a conversation runs, the more Claude's accuracy degrades.

**The rule:** After 20+ turns, consider starting fresh.

Why this happens:
- Earlier context gets "buried" by newer information
- Conflicting instructions accumulate
- Signal-to-noise ratio decreases

**Practical approach:**
- One focused task per session
- Use `/clear` liberally between unrelated tasks
- Start fresh rather than trying to course-correct a confused session

## Essential Commands

### Check Your Context: `/context`

Visualize current context usage:

```
/context
```

Shows a colored grid displaying what's consuming your context. Use this regularly to understand your usage patterns.

### Clear Context: `/clear`

Reset your conversation completely:

```
/clear
```

**When to use:**
- Switching between unrelated tasks
- Context is bloated with old information
- Starting fresh on a new problem

**Note:** This clears conversation history only - your code changes remain intact.

### Compact Context: `/compact`

Summarize your conversation to free up space:

```
/compact
```

With custom focus instructions:

```
/compact Focus on code changes and test results
```

**Best practice:** Compact at natural breakpoints (after completing a feature, before starting new work) rather than waiting for auto-compact.

### Resume Sessions: `claude --resume`

Pick up where you left off:

```bash
# Interactive picker
claude --resume

# Resume by name
claude --resume "auth-refactor"

# Continue most recent session
claude -c
```

**Name your sessions for easy recall:**
```
/rename "auth-refactor"
```

## Auto-Compact

Claude Code can automatically compact when approaching context limits.

**How it works:**
- Triggers at ~75% context usage
- Creates an intelligent summary of your conversation
- As of v2.0.64, auto-compacting is instant

**Enable/Disable:**
1. Run `/config`
2. Navigate to "Auto-compact enabled"
3. Toggle on/off

**Recommendation:** Many developers prefer manual compaction at strategic points for more control.

## Best Practices

### 1. Write Specific Queries

❌ "Look at my code and find problems"
✅ "Check the UserController for N+1 query issues"

Specific queries consume fewer tokens and get better results.

### 2. Work in Focused Sessions

Rather than one long conversation covering everything:
- Use `/clear` between unrelated tasks
- Name sessions by feature/task
- Resume specific sessions when returning to work

### 3. Keep Files Under 300 Lines

Claude works best with focused files:
- Break large files into logical modules
- Extract reusable components
- This isn't just good for AI - it's good architecture

### 4. Customize Compaction in CLAUDE.md

```markdown
# Summary instructions

When you are using compact, please focus on:
- Code changes made
- Test results
- Decisions and rationale
```

### 5. Monitor Before It's Too Late

Check `/context` regularly. It's easier to compact proactively than to recover from a bloated context.

## Understanding Token Costs

| Action | Approximate Tokens |
|--------|-------------------|
| Reading a typical file | 500-2,000 |
| Running a test suite | 1,000-5,000 |
| Search results | 500-2,000 per search |
| Your average prompt | 50-200 |
| Claude's detailed response | 500-2,000 |
| MCP tools (without Tool Search) | 8-30% of context |
| MCP tools (with Tool Search) | ~5% of context |

**High token consumers:**
- Large file reads
- Verbose test output
- Multiple search operations
- Long conversations without compaction
- Many MCP servers connected

## MCP Tool Search (V4)

MCP servers consume context just by being connected—each adds tool definitions Claude needs to understand.

**Before V4:** ~77,000 tokens consumed at startup with 10 MCPs
**With Tool Search:** ~8,700 tokens consumed (85% reduction)

Tool Search lazy-loads MCP tool definitions on-demand rather than at startup. This preserves 95% of your context for actual work.

See [MCP Tool Search](/ways-of-working/claude-code-advanced/13-mcp-tool-search) for configuration and details.

## When to Start Fresh vs Resume

**Start fresh (`/clear` or new session):**
- Completely different task
- Previous context is irrelevant
- You're hitting quality issues from bloated context

**Resume (`claude --resume`):**
- Continuing the same feature
- Need context from previous decisions
- Multi-day work on same problem

**Compact and continue (`/compact`):**
- Same task, but context is getting large
- Want to preserve key decisions but free space
- Natural breakpoint in work
