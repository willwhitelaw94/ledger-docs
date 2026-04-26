---
title: "Slash Commands"
description: Creating reusable prompts you trigger manually
---

Build your prompt library.

## Overview

- Creating project-level commands
- Creating personal commands
- Using arguments in commands
- Sharing commands with your team

## What Are Slash Commands?

Slash commands are reusable prompts you trigger manually by typing `/command-name`. They're shortcuts for prompts you use repeatedly.

```
/commit          → Generate a commit message
/review-pr 123   → Review pull request #123
/test            → Run and analyze tests
```

Think of them as your personal prompt library.

## Creating Commands

### Project-Level Commands

Store in `.claude/commands/` for your whole team:

```
.claude/commands/
├── commit.md
├── review-pr.md
└── deploy.md
```

Each file is a markdown prompt:

```markdown
# commit.md
Generate a commit message for the staged changes.

Follow conventional commits format.
Keep the subject line under 50 characters.
```

### Personal Commands

Store in `~/.claude/commands/` for just you:

```
~/.claude/commands/
├── standup.md
└── my-style.md
```

Personal commands work across all projects.

## Using Arguments

Pass arguments to commands with `$ARGUMENTS`:

```markdown
# review-pr.md
Review pull request #$ARGUMENTS

Focus on:
- Security issues
- Performance concerns
- Code style consistency
```

Usage: `/review-pr 456`

## Command Naming

- Use kebab-case: `review-pr`, not `reviewPR`
- Be descriptive: `generate-api-tests` beats `tests`
- Keep it short enough to type quickly

## Common Commands

| Command | Purpose |
|---------|---------|
| `/commit` | Generate commit messages |
| `/review-pr` | Review pull requests |
| `/test` | Run and analyze test results |
| `/explain` | Explain selected code |
| `/refactor` | Suggest refactoring |

## Built-in Diagnostic Commands

These commands help you understand and manage your Claude Code environment:

| Command | Purpose |
|---------|---------|
| `/context` | Visualize current context usage (colored grid) |
| `/stats` | Show usage statistics—cycle between 7 days, 30 days, all-time |
| `/doctor` | Diagnose environment—shows update channel, npm versions, LSP status |
| `/config` | Open searchable settings (V4: now searchable) |
| `/tasks` | View background tasks and their status |
| `/mcp` | Show MCP server connection status |
| `/memory` | View all loaded CLAUDE.md files |
| `/keybindings` | View and configure keyboard shortcuts |

### /stats

Track your Claude Code usage over time:

```text
/stats
```

Press Enter to cycle through time ranges:
- Last 7 days
- Last 30 days
- All time

Shows tokens used, API calls, and cost estimates.

### /doctor

Diagnose your Claude Code setup:

```text
/doctor
```

Shows:
- Current version and update channel
- Node.js and npm versions
- LSP server status (which language servers are running)
- MCP server health
- Configuration issues

Use this when things aren't working as expected.

## Sharing Commands

Project commands in `.claude/commands/` are version controlled. Your team gets them automatically.

For personal commands you want to share:
1. Copy to the project's `.claude/commands/`
2. Commit and push

## Commands vs Skills

| Aspect | Commands | Skills |
|--------|----------|--------|
| Trigger | Manual (`/name`) | Automatic |
| Location | `.claude/commands/` | `.claude/skills/` |
| Use case | Repeated prompts | Extended capabilities |

Commands are simple: a markdown file with a prompt. Skills are more complex—see [Extending Claude](/video-series/claude-code-mastery/commands-skills-mcps/02-extending-claude) for details.
