---
title: Extending Claude
description: Skills, MCPs, and agents - when to use each
---

Four ways to give Claude more capabilities.

## Overview

- Skills vs MCPs vs Agents vs Custom Agents
- When to use each
- Managing context overhead
- Practical examples

## The Quick Comparison

| Extension         | What It Does                              | Trigger   | Context Cost     |
| ----------------- | ----------------------------------------- | --------- | ---------------- |
| **Skills**        | Inject prompts/instructions               | Automatic | Low              |
| **MCPs**          | Connect external tools                    | Automatic | High (8-30%)     |
| **Built-in Agents** | Run parallel tasks (Explore, Plan, Bash) | Manual    | Separate context |
| **Custom Agents** | Your own specialized assistants           | Automatic | Separate context |

## Skills

### What They Are

Skills are markdown files that extend Claude's knowledge or behavior. When relevant, Claude automatically uses them.

### Why Skills Over Slash Commands

We exclusively use **Skills** instead of slash commands (`.claude/commands/*.md`). Here's why:

| Aspect | Slash Commands | Skills |
|--------|----------------|--------|
| **Invocation** | User types `/command` | User types `/skill` OR Claude auto-invokes via Skill tool |
| **Automation** | Manual only | Can be triggered programmatically |
| **Structure** | Single markdown file | Folder with SKILL.md + supporting files |
| **Metadata** | None | YAML frontmatter (name, description, triggers) |
| **Discovery** | Hidden until you know them | Claude sees descriptions and can suggest them |
| **Composability** | Standalone | Can reference other skills, templates, prompts |

**Key advantage**: Skills can be invoked by Claude automatically when the task matches the skill description. Slash commands require the user to know they exist and type them.

**Example**: When a user says "I need to plan my implementation", Claude can automatically invoke the `speckit-plan` skill. With slash commands, the user would need to know `/speckit.plan` exists.

**Our decision**: All workflow automation lives in `.claude/skills/`. We removed `.claude/commands/` entirely—those files were just thin wrappers saying "read the skill".

```text
.claude/skills/
├── trilogy-docs/SKILL.md
├── speckit-plan/SKILL.md
└── commit-style/SKILL.md
```

### When Claude Uses Them

Skills have trigger descriptions. Claude reads these and decides when to apply them:

```markdown
---
name: trilogy-docs
description: Build and preview documentation. Use when user wants to review docs, view docs, or start documentation server.
---

# Trilogy Docs Skill

[Instructions for building docs...]
```

### Best For

- Project-specific workflows (`/trilogy.ship`)
- Domain knowledge injection
- Consistent behavior patterns
- Team conventions

### Creating Skills

1. Create `.claude/skills/skill-name/SKILL.md`
2. Add frontmatter with name and trigger description
3. Write the instructions Claude should follow

## MCP Servers

### What They Are

MCP (Model Context Protocol) servers give Claude access to external tools—databases, APIs, services.

```bash
# Add an MCP server
claude mcp add server-name -- command args
```

### Examples

| MCP          | What It Provides                               |
| ------------ | ---------------------------------------------- |
| `herd`       | Laravel Herd services, PHP versions, debugging |
| `github`     | Repository access, PR management               |
| `postgres`   | Direct database queries                        |
| `filesystem` | Enhanced file operations                       |

### Best For

- External service integration
- Database access
- API calls
- System-level operations

### The Context Cost Problem

MCPs consume context just by being connected:

```text
MCP overhead: ~8-30% of your context window
```

Each MCP adds tool definitions that Claude needs to understand. More MCPs = less room for your actual conversation.

### Managing MCP Overhead

Check your context usage:

```text
/context
```

If MCPs are eating too much context:

1. Disable MCPs you're not using
2. Use session-specific MCPs (`claude --mcp server-name`)
3. Consider if you really need that integration

### When to Disable MCPs

- Long conversations where context matters
- Simple tasks that don't need external tools
- When you notice context running out quickly

## Custom Agents

Custom agents are specialized assistants with isolated context windows and focused system prompts. Unlike built-in subagents, you define these yourself—giving Claude the ability to automatically delegate tasks based on descriptions and available tools.

See [Custom Agents](/ways-of-working/claude-code-advanced/12-custom-agents) for the full guide on creating and configuring your own agents.

## Parallel Work: Three Approaches

### Option 1: Multiple Windows (Recommended)

The most practical approach is running multiple Claude Code sessions in separate terminal windows or VS Code panels:

```text
Window 1: Working on frontend components
Window 2: Building API endpoints
Window 3: Writing tests
Window 4: Documentation
Window 5: Exploratory research
```

**Why this works better:**

- Full control over each session
- Easy to see progress at a glance
- Copy patterns between windows
- No confusion about which "agent" is doing what
- Each window has full context independence

This is [pair prompting](/video-series/claude-code-mastery/prompting-communication/03-pair-prompting) at scale—you orchestrate multiple conversations, switching between them as needed.

### Option 2: Built-in Subagents

Claude can spawn subagents within a single session:

| Agent     | Purpose                          |
| --------- | -------------------------------- |
| `Explore` | Search and understand codebase   |
| `Plan`    | Design implementation approaches |
| `Bash`    | Run terminal commands            |

```text
"Use an explore agent to find all authentication code"
```

**The tradeoff:** Subagents run in the background and return results, but you lose visibility into what they're doing. For complex work, multiple windows give you more control.

### Option 3: Custom Agents

Define your own specialized agents that Claude automatically delegates to:

| Agent              | Purpose                          |
| ------------------ | -------------------------------- |
| `test-runner`      | Run tests and analyze failures   |
| `security-reviewer`| Check code for vulnerabilities   |
| `docs-writer`      | Write and update documentation   |

Custom agents run with isolated context windows—they don't consume your main context and can focus entirely on their specialized task.

### When to Use Each

| Approach           | Best For                                         |
| ------------------ | ------------------------------------------------ |
| Multiple windows   | Complex features, frontend work, anything visual |
| Built-in subagents | Quick parallel searches, background exploration  |
| Custom agents      | Repeatable specialized tasks, project workflows  |

### The Real Pattern

Most effective workflow:

1. **Main window** - Your primary work
2. **Research window** - Exploring code, reading docs
3. **Test window** - Running and fixing tests
4. **Custom agents** - Automatic delegation for specialized tasks

You're the orchestrator. Each Claude session is focused. You move between them, carrying insights from one to another.

## Choosing the Right Extension

| Need                        | Solution                                                             |
| --------------------------- | -------------------------------------------------------------------- |
| Reusable prompts            | Skills                                                               |
| Workflow patterns           | Skills                                                               |
| External tools              | MCPs (watch context cost)                                            |
| Parallel work               | Multiple windows                                                     |
| Quick background search     | Built-in subagents                                                   |
| Specialized auto-delegation | [Custom agents](/ways-of-working/claude-code-advanced/12-custom-agents) |

## Practical Example

Building a feature with 5 windows:

| Window | Purpose             | Extensions Used               |
| ------ | ------------------- | ----------------------------- |
| 1      | Frontend components | Skills for component patterns |
| 2      | API endpoints       | Herd MCP for database queries |
| 3      | Tests               | Skills for test patterns      |
| 4      | Documentation       | `/trilogy.docs` command       |
| 5      | Research            | Explore for codebase search   |

You orchestrate. Claude executes. Each window stays focused.

## Further Reading

- [Stage Agents](/ways-of-working/claude-code-advanced/19-stage-agents) - TC Portal's agent pipeline (planning → design → dev → QA → release)
- [Custom Agents](/ways-of-working/claude-code-advanced/12-custom-agents) - Create your own specialized assistants
- [Skills Explained](https://claude.com/blog/skills-explained) - Anthropic's deep dive into how skills work
