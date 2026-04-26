---
title: Custom Agents
description: Specialized assistants with isolated context windows and focused system prompts
---

Create your own agents for automatic task delegation.

## What Are Custom Agents?

Custom agents are specialized assistants with isolated context windows and focused system prompts. Unlike built-in subagents (Explore, Plan, Bash), you define these yourself—giving Claude the ability to automatically delegate tasks based on descriptions and available tools.

## Creating Custom Agents

Create agents via the `/agents` command or manually in the agents directory:

```text
~/.claude/agents/
├── test-runner/
│   └── AGENT.md
├── docs-writer/
│   └── AGENT.md
└── security-reviewer/
│   └── AGENT.md
```

## Agent Configuration

Each agent is defined by an `AGENT.md` file with frontmatter configuration:

```markdown
---
name: test-runner
description: Run tests and analyze failures. Use after code changes to verify functionality.
tools:
  - Bash
  - Read
  - Grep
model: haiku
---

# Test Runner Agent

You are a testing specialist. Your job is to:

1. Run the relevant test suite for changed files
2. Analyze any failures
3. Report results clearly

## Running Tests

- For PHP: `php artisan test --filter={test_name}`
- For JS: `npm test -- --testPathPattern={pattern}`

## Reporting

Always include:
- Number of tests run
- Pass/fail count
- For failures: the assertion that failed and relevant context
```

### Configuration Options

| Option | Purpose | Values |
|--------|---------|--------|
| `name` | Agent identifier | Any string |
| `description` | When Claude should delegate to this agent | Trigger description |
| `tools` | Available tools for this agent | Read, Write, Edit, Bash, Grep, Glob, etc. |
| `model` | Which Claude model to use | `haiku`, `sonnet`, `opus` |

## Automatic Delegation

Claude reads agent descriptions and decides when to delegate. The description is key—it tells Claude when this agent is the right choice:

```markdown
---
description: Run tests and analyze failures. Use after code changes to verify functionality.
---
```

With this description, Claude will automatically delegate when:
- You ask to "run the tests"
- You've made code changes and need verification
- Test failures need analysis

## Hot Reload Support

Agents support hot reload—edit an `AGENT.md` file and changes take effect immediately. No restart required.

## Isolated Context Windows

Each agent runs with its own context window, separate from your main conversation. This means:

- Agents don't consume your main context
- They can focus entirely on their specialized task
- Results are returned to your main session

## Example Agents

### Documentation Writer

```markdown
---
name: docs-writer
description: Write and update documentation. Use when creating READMEs, API docs, or code comments.
tools:
  - Read
  - Write
  - Edit
  - Glob
model: sonnet
---

# Documentation Writer

Write clear, concise documentation following project conventions.

## Style Guide

- Use active voice
- Include code examples
- Keep paragraphs short
- Add frontmatter for markdown files
```

### Security Reviewer

```markdown
---
name: security-reviewer
description: Review code for security vulnerabilities. Use before merging PRs or deploying.
tools:
  - Read
  - Grep
  - Glob
model: opus
---

# Security Reviewer

Analyze code for OWASP Top 10 vulnerabilities and security best practices.

## Check For

- SQL injection
- XSS vulnerabilities
- Authentication issues
- Sensitive data exposure
- Insecure dependencies
```

### Database Migration Helper

```markdown
---
name: migration-helper
description: Create and review database migrations. Use when modifying database schema.
tools:
  - Read
  - Write
  - Bash
model: sonnet
---

# Migration Helper

Create Laravel migrations following project conventions.

## Rules

- Always include rollback logic
- Use descriptive migration names
- Check for data loss implications
- Reference existing migrations for patterns
```

## When to Use Custom Agents vs Built-in Subagents

| Use Case | Solution |
|----------|----------|
| Quick codebase search | Built-in Explore agent |
| Planning implementation | Built-in Plan agent |
| Specialized, repeatable tasks | Custom agents |
| Project-specific workflows | Custom agents |
| Tasks needing specific tool combinations | Custom agents |

## Best Practices

1. **Write clear descriptions** - The description determines when Claude delegates
2. **Limit tools** - Only give agents the tools they need
3. **Choose the right model** - Use `haiku` for simple tasks, `opus` for complex analysis
4. **Keep prompts focused** - One agent, one specialty
5. **Include examples** - Show the agent what good output looks like

## Directory Locations

Agents can live in multiple locations:

| Location | Scope |
|----------|-------|
| `~/.claude/agents/` | Global—available in all projects |
| `.claude/agents/` | Project—only available in this repo |

Project agents override global agents with the same name.

---

## See Also

- [Stage Agents](/ways-of-working/claude-code-advanced/19-stage-agents) — TC Portal's agent pipeline that chains skills across the full development lifecycle
