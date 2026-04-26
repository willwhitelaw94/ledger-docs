---
title: Ready to Go
description: Get your IDE and Claude Code ready
---

> Get set up with Claude Code in your IDE.

---

## Video Walkthrough

Didn't want to watch my 30 minute video above, this quick video is here to help you simply get your Cursor IDE setup.

::loom-video
COMING SOON
::

---

## Why IDE?

The power isn't just having Claude in your editor—it's running **multiple agents in parallel**.

```text
┌─────────────────────────────────────────────────────────────┐
│                        YOUR IDE                             │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│   Agent 1   │   Agent 2   │   Agent 3   │     Agent 4      │
│             │             │             │                  │
│  Feature    │   Running   │    Docs     │    Research      │
│  Development│   Tests     │   Update    │                  │
│             │             │             │                  │
│  Working on │  Watching   │  Writing    │  Exploring       │
│  budget.vue │  for fails  │  changelog  │  competitor API  │
└─────────────┴─────────────┴─────────────┴──────────────────┘
```

Each agent has its own context, its own task, and runs independently. You're not waiting for one to finish before starting another.

---

## Quick Start

### 1. Install Cursor

[Cursor](https://cursor.com) is our recommended IDE — it's VS Code with AI built in.

1. Download from [cursor.com](https://cursor.com)
2. Install and open
3. Import VS Code settings when prompted (optional)

### 2. Install Claude Code in Cursor

1. Open Extensions (`Cmd+Shift+X`)
2. Search "Claude Code"
3. Install the extension
4. `Cmd+Shift+P` → "Claude: Open Panel"
5. Sign in with your Anthropic account when prompted

### 3. Terminal Only (Alternative)

```bash
npm install -g @anthropic-ai/claude-code
cd ~/code/tc-portal
claude
```

---

## What You Get

- Full codebase access
- Git operations (branches, commits, PRs)
- Terminal commands (tests, builds)
- MCP integrations (Jira, Teams, Fireflies)
- `/trilogy.*` and `/speckit.*` commands

---

## Level Up: Voice Input

Speaking is 2-4x faster than typing. More context = less ambiguity = better Claude output.

**[Voice Input with Whisper Flow](/ways-of-working/claude-code-advanced/06-whisper-flow)** — Set up voice-to-text for hands-free prompting.

---

## Next Steps

- [Claude Code](/ways-of-working/claude-code) — Learn the fundamentals
- [MCP Servers](/ways-of-working/mcps) — Connect Jira, Teams, Fireflies
- [Voice Input](/ways-of-working/claude-code-advanced/06-whisper-flow) — Talk instead of type
- [Cowork](https://claude.ai/cowork) — Claude with local file access
- [Connectors](https://claude.ai/settings/connectors) — Connect Atlassian, Fireflies, 365
- [Claude for Everyone](/ways-of-working/overview/04-cowork-connectors) — BA workflows without code
