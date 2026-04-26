---
title: Session Teleportation
description: Move work seamlessly between terminal and claude.ai web interface
---

Work in terminal, continue on web. Pick up where you left off across devices.

## What Is Session Teleportation?

Session teleportation lets you move your Claude Code session between:

- **Terminal** ↔ **claude.ai/code** web interface
- **Device A** ↔ **Device B**
- **VS Code** ↔ **Terminal** ↔ **Web**

Your conversation, context, and progress travel with you.

## Core Commands

### Teleport to Web: `/teleport`

Open your current session in the claude.ai web interface:

```text
/teleport
```

This generates a link to continue your session on the web. Useful when:

- You need to step away from terminal
- You want to continue on mobile/tablet
- You're sharing progress with someone

### Resume Recent: `claude -c`

Continue your most recent session:

```bash
claude -c
```

or

```bash
claude --continue
```

Quick way to pick up where you left off after closing terminal.

### Resume Specific: `claude --resume`

Resume a specific session by ID or name:

```bash
# Interactive picker - shows all sessions
claude --resume

# Resume by session name
claude --resume "auth-refactor"

# Resume by session ID
claude --resume abc123
```

### Name Your Sessions

Make sessions easy to find later:

```text
/rename "auth-refactor"
```

Named sessions are easier to resume than hunting through IDs.

## VS Code Extension

The VS Code extension adds remote session browsing:

1. Open Claude Code panel in VS Code
2. Browse available sessions
3. Click to resume any session

This gives you a visual overview of all your work across projects.

## Practical Workflows

### The Commute Pattern

```text
1. Work in terminal at office
2. /teleport before leaving
3. Continue on phone/tablet during commute
4. claude --resume when you get home
```

### The Handoff Pattern

```text
1. Start investigation in terminal
2. /teleport to generate link
3. Share link with teammate
4. They continue in their browser
```

### The Context Preservation Pattern

```text
1. Deep in complex debugging
2. Need to switch machines
3. /teleport or note session name
4. claude --resume on new machine
5. Full context preserved
```

## Session Management

### Listing Sessions

```bash
# Interactive session picker
claude --resume
```

Shows recent sessions with:
- Session name (if set)
- Last active time
- Project/directory

### Session Naming Best Practices

Name sessions by what you're working on:

```text
/rename "pla-1124-email-feature"
/rename "bug-fix-auth-timeout"
/rename "refactor-user-service"
```

Avoid generic names like "work" or "stuff".

## What Transfers

When you teleport or resume:

| Transfers | Doesn't Transfer |
|-----------|------------------|
| Conversation history | Running processes |
| Context and decisions | Background tasks |
| File changes made | Terminal state |
| Session name | Environment variables |

**Note:** Code changes are in your filesystem—they persist regardless of session state.

## When to Use Each

| Situation | Command |
|-----------|---------|
| Continue on web right now | `/teleport` |
| Pick up most recent work | `claude -c` |
| Return to specific feature | `claude --resume "feature-name"` |
| Browse all sessions | `claude --resume` (no args) |

## Tips

### 1. Name Sessions Immediately

When starting significant work:

```text
/rename "descriptive-name"
```

Future you will thank present you.

### 2. Teleport Before Breaks

Before lunch, meetings, or end of day:

```text
/teleport
```

Options open for how you continue.

### 3. Use Consistent Naming

Match session names to tickets/features:

```text
/rename "PLA-1124"
/rename "TP-4007-posthog"
```

Easy to correlate sessions with work items.

## Related

- [Context Management](/ways-of-working/claude-code/07-context-management) — Managing context across sessions
- [Recovery & Checkpoints](/ways-of-working/claude-code/10-recovery-checkpoints) — Recovering from mistakes
