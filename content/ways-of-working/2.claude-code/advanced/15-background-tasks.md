---
title: Background Tasks
description: Run agents and commands in the background while you continue working
---

Don't wait. Background long-running tasks and keep working.

## The Problem

Some operations take time:

- Test suites running
- Agents exploring codebases
- Build processes
- Complex searches

Waiting blocks your flow.

## The Solution: Ctrl+B

Press **Ctrl+B** to send any running operation to the background.

```text
Claude: "Running test suite..."
[Ctrl+B]
Claude: "Task backgrounded. Continuing..."
You: "While that runs, let's look at the auth code"
```

You get notified when background tasks complete.

## Managing Background Tasks: `/tasks`

View all background tasks:

```text
/tasks
```

Shows:

| Info | Description |
|------|-------------|
| Task ID | Unique identifier |
| Status | Running, completed, failed |
| Type | Agent, shell command, etc. |
| Started | When it began |

## What Can Run in Background

### Agents

Subagents exploring your codebase:

```text
You: "Use an explore agent to find all authentication code"
[Ctrl+B while it's running]
```

The agent continues working. You get results when it finishes.

### Shell Commands

Long-running shell operations:

```text
You: "Run the full test suite"
[Ctrl+B]
```

Tests run in background. Results appear when done.

### Parallel Execution

Multiple background tasks can run simultaneously:

```text
Task 1: Explore agent searching auth code
Task 2: Test suite running
Task 3: Build process compiling
```

All progress in parallel while you work on something else.

## Notifications

When a background task completes:

- **Success** — Results appear in your conversation
- **Failure** — Error details shown
- **Partial** — Whatever completed is available

You don't need to poll. Claude tells you when things finish.

## Practical Workflows

### The Test-While-Code Pattern

```text
1. Make code changes
2. "Run tests for UserController"
3. [Ctrl+B]
4. Continue coding
5. Test results appear when ready
6. Fix any failures
```

### The Parallel Research Pattern

```text
1. "Explore agent: find all payment code"
2. [Ctrl+B]
3. "Another explore agent: find all notification code"
4. [Ctrl+B]
5. Work on main task
6. Both results arrive independently
```

### The Build-and-Continue Pattern

```text
1. "Run npm build"
2. [Ctrl+B]
3. Write documentation while building
4. Build completes, see any errors
```

## Best Practices

### 1. Background Early

Don't wait until you're bored. Background immediately if:

- Operation will take more than a few seconds
- You have other work to do
- You're exploring in parallel

### 2. Name Your Context

Before backgrounding, make sure Claude knows what you're looking for:

```text
Good: "Explore agent: find authentication middleware and how it validates tokens"
Bad: "Look at auth stuff"
```

Clear instructions = useful background results.

### 3. Check /tasks Periodically

```text
/tasks
```

Quick glance at what's running and what's done.

### 4. Don't Over-Parallelize

Background tasks still consume resources. Running 10 simultaneous explore agents may slow everything down.

Sweet spot: 2-3 background tasks at once.

## Keyboard Reference

| Shortcut | Action |
|----------|--------|
| **Ctrl+B** | Background current operation |

That's it. One shortcut to remember.

## Task Lifecycle

```text
Started → Running → [Ctrl+B] → Backgrounded → Completed → Results shown
                                    ↓
                                  Failed → Error shown
```

## When to Background vs. Wait

| Situation | Recommendation |
|-----------|----------------|
| Quick operation (<5 seconds) | Wait |
| Test suite | Background |
| Single file search | Wait |
| Codebase-wide exploration | Background |
| Simple build | Wait |
| Full production build | Background |

Rule of thumb: If you could do something useful while waiting, background it.

## Related

- [Custom Agents](/ways-of-working/claude-code-advanced/12-custom-agents) — Create agents for background tasks
- [Extending Claude](/ways-of-working/claude-code-advanced/01-extending-claude) — Built-in subagents overview
