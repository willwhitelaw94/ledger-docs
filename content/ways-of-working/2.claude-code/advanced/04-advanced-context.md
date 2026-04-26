---
title: "Advanced Context Management"
description: MCP tools, context preservation, and advanced techniques
---

Optimize context when working with MCP servers and complex workflows.

## MCP Tools and Context

MCP (Model Context Protocol) servers extend Claude Code's capabilities but consume context tokens. Every tool call's output becomes part of your conversation context.

### Understanding MCP Context Costs

| MCP Tool Type | Typical Token Cost |
|---------------|-------------------|
| Simple query | 200-500 tokens |
| Database query results | 1,000-5,000 tokens |
| Log file analysis | 2,000-10,000 tokens |
| Large API responses | 5,000-25,000 tokens |

**Built-in limits:**
- Warning threshold: 10,000 tokens per tool output
- Default maximum: 25,000 tokens per tool output

### Adjusting MCP Output Limits

For large data workflows, increase the limit:

```bash
export MAX_MCP_OUTPUT_TOKENS=50000
claude
```

**Caution:** Higher limits mean faster context consumption. Use judiciously.

## Disabling MCP Tools

When you don't need certain MCP servers, disable them to reduce overhead.

### List Active Servers

```bash
claude mcp list
```

Shows all configured MCP servers and their status.

### Check Server Status in Session

```
/mcp
```

Displays connection status of all servers in current session.

### Remove Servers Temporarily

```bash
# Remove a server
claude mcp remove github

# Re-add when needed
claude mcp add github
```

### When to Disable MCP Tools

- Working on tasks that don't need external integrations
- Hitting context limits frequently
- Debugging context-related issues
- Reducing costs on token-heavy operations

## MCP Scope Management

Control which projects have access to which servers:

| Scope | Config Location | Use Case |
|-------|----------------|----------|
| Local | Personal config | Your personal tools |
| Project | `.mcp.json` | Team-shared servers |
| User | `~/.claude/` | Available everywhere |

**Project scope example (`.mcp.json`):**
```json
{
  "mcpServers": {
    "database": {
      "command": "mcp-server-postgres",
      "args": ["postgresql://localhost/mydb"]
    }
  }
}
```

## Context Preservation Strategies

### Session Naming Convention

Develop a consistent naming scheme:

```
/rename "feature/user-auth"
/rename "bugfix/login-redirect"
/rename "refactor/api-v2"
```

This makes `claude --resume` much more effective.

### Strategic Compaction Points

Compact at natural breakpoints:

1. **After completing a subtask** - Preserve decisions, clear implementation details
2. **Before switching focus** - Summarize current state
3. **When tests pass** - Lock in the working state
4. **Before complex operations** - Free up space for what's coming

### Custom Compaction Instructions

In your CLAUDE.md:

```markdown
## Summary instructions

When compacting, always preserve:
- File paths of modified files
- Test results (pass/fail, which tests)
- Key architectural decisions
- Error messages that were resolved
- Current task status

Summarize but don't preserve:
- Exploratory searches that didn't help
- Verbose tool outputs
- Failed approaches we abandoned
```

### Export Before Clear

Save important context before clearing:

```
/export session-notes.md
/clear
```

## Advanced Techniques

### Conversation Checkpointing

Before risky operations:

```
/compact Checkpoint before refactoring auth system
```

If things go wrong, you have a clean summary to reference.

### Parallel Session Strategy

For complex features, use multiple named sessions:

```bash
# Main implementation
claude --resume "feature/payments"

# Separate session for tests
claude --resume "feature/payments-tests"

# Research session
claude --resume "feature/payments-research"
```

This keeps each session focused and prevents context bloat.

### Token-Efficient Prompting

**High token cost:**
```
Look at all my controllers and tell me if there are any issues
```

**Low token cost:**
```
Review UserController.php for N+1 queries
```

**Even better:**
```
Check lines 45-80 of UserController.php - is this query efficient?
```

### Managing Large File Reads

Instead of reading entire large files:

```
Read the authenticate method in AuthController.php
```

Rather than:

```
Read AuthController.php
```

Claude will read just what's needed.

### Reducing Search Overhead

**Expensive:**
```
Search the codebase for authentication
```

**Efficient:**
```
Search app/Http/Middleware for auth
```

Narrow the scope to reduce results and token consumption.

## Monitoring and Debugging

### Track Context Growth

Run `/context` periodically during long sessions. Watch for:
- Sudden spikes (large file reads, verbose outputs)
- Steady growth (time to compact)
- Near-limit warnings

### Diagnose High Usage

If context fills quickly:

1. Check for MCP tools returning large outputs
2. Review recent file reads - any unexpectedly large files?
3. Look for verbose test output
4. Consider if auto-compact is triggering too often

### Reset for Fresh Start

When context issues persist:

```bash
# Clear and start fresh
/clear

# Or start a new session entirely
# Exit and run:
claude
```

## Cost Optimization

Context directly impacts API costs. Optimize by:

1. **Disabling unused MCP servers** - Each server adds overhead
2. **Using specific queries** - Vague requests trigger broad searches
3. **Compacting regularly** - Don't let context balloon
4. **Working in focused sessions** - One task per session when possible
5. **Leveraging CLAUDE.md** - Put stable context there, not in conversation

### Estimating Session Costs

Rough guide for planning:
- Light session (simple edits): ~$0.05-0.20
- Medium session (feature development): ~$0.50-2.00
- Heavy session (complex refactoring): ~$2.00-10.00

Use `/cost` or check the Anthropic console for actual usage.

## Further Reading

- [Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) - Anthropic's deep dive into context management
