---
title: "Plan Mode Deep Dive"
description: Shift+Tab workflow and reviewable plans
---

Think before you act.

## Overview

- Activating plan mode with Shift+Tab
- Creating reviewable plans
- When to plan vs when to just do

## What Plan Mode Does

Plan mode is a lightweight way to have Claude research and propose an approach before writing any code. In plan mode:

- Claude can **read** files and explore your codebase
- Claude **cannot** edit files or run commands
- Claude writes a **plan file** for your review
- You approve before any changes happen

This creates a natural checkpoint between "understanding the problem" and "making changes."

## Activating Plan Mode

### Keyboard Shortcut

Press `Shift+Tab` to toggle plan mode on or off. You'll see an indicator showing the current state.

### VS Code Extension

In VS Code, the status bar shows a clickable plan mode toggle. Click it to switch between:
- **Normal mode** - Claude can execute
- **Plan mode** - Claude can only research and plan

### Command Line

```bash
# Start a session in plan mode
claude --plan
```

## The Planning Workflow

### Phase 1: Initial Understanding

Claude explores your codebase to understand the request:
- Reads relevant files
- Searches for patterns
- Identifies dependencies
- Asks clarifying questions

### Phase 2: Design

Claude creates a plan file (typically at `~/.claude/plans/`) containing:
- Summary of the approach
- Files to modify
- Step-by-step implementation
- Potential risks or considerations

### Phase 3: User Review

You review the plan and can:
- **Approve** - Exit plan mode and let Claude execute
- **Revise** - Ask Claude to adjust the approach
- **Reject** - Start over with different direction

### Phase 4: Execution

Once approved, Claude follows the plan to implement changes. The plan file remains as documentation of what was agreed.

## When to Use Plan Mode

Plan mode shines for:

- **Multi-file changes** - Refactoring across several files
- **Architectural decisions** - New features with multiple approaches
- **Unfamiliar code** - When you want to understand before changing
- **High-stakes changes** - Database migrations, auth systems
- **Learning** - See how Claude thinks about problems

## When to Skip Plan Mode

Just let Claude work directly for:

- **Single-file fixes** - Simple bug fixes in one place
- **Quick iterations** - "Make the button blue"
- **Clear requirements** - You've already specified exactly what to do
- **Documentation** - Writing or updating docs
- **Test additions** - Adding tests to existing code

## Plan Mode Tips

### Be Specific About What You Want

Good: "I want to add user authentication using Laravel Sanctum with token-based API auth"

Vague: "Add login"

### Let Claude Ask Questions

If Claude asks clarifying questions in plan mode, answer them. This leads to better plans.

### Review the Plan Critically

Don't just approve - actually read what Claude proposes. Catch issues before code is written.

### Iterate on Plans

If something looks wrong, tell Claude. "The plan looks good but I'd prefer using Redis for sessions instead of database" leads to a revised plan.

## Example Session

```
You: [Plan mode ON] Add a dark mode toggle to the settings page

Claude: Let me explore the codebase to understand the current settings structure...
[Reads files, explores patterns]

Claude: Here's my plan:
1. Add dark mode preference to user settings model
2. Create a toggle component in Settings.vue
3. Use Tailwind's dark: prefix for styling
4. Store preference in localStorage for instant switching

Does this approach work for you?

You: Yes, looks good. [Exits plan mode]

Claude: [Begins implementing the plan]
```

## Think Keywords (Extended Reasoning)

When you need Claude to reason more deeply, use thinking keywords in your prompt:

| Keyword | Effect |
|---------|--------|
| `think` | Basic extended reasoning |
| `think hard` | More thorough analysis |
| `think harder` | Even deeper reasoning |
| `ultrathink` | Maximum reasoning depth |

### How to Use

Add the keyword naturally to your prompt:

```
Think hard about how we should structure the authentication system

Ultrathink: What are the security implications of this API design?
```

### When to Use Thinking Keywords

- **Complex architectural decisions** - "Ultrathink about the data model"
- **Security reviews** - "Think hard about potential vulnerabilities"
- **Debugging tricky issues** - "Think through why this might be failing"
- **Trade-off analysis** - "Think about the pros and cons of each approach"

### Combining with Plan Mode

Plan mode + thinking keywords is powerful for complex work:

```
[Plan mode ON]
Ultrathink: Design a multi-tenant architecture for this application.
Consider data isolation, performance, and future scaling.
```

Claude will spend more tokens reasoning through the problem before proposing a plan.

## Plan Files

Plans are saved to `~/.claude/plans/` with unique names. You can:
- Reference them later
- Share with teammates
- Use as documentation for what was built
