---
title: Managing MCP Servers
description: Install, configure, and manage MCP servers for TC Portal development
---

Commands and configuration for working with MCP servers.

## Quick Setup — TC Portal

Run these commands from the `tc-portal` directory to install all recommended MCPs. Each command adds the server to your user-level config.

### Core (Required)

```bash
# Laravel Boost — database, artisan, tinker, doc search
claude mcp add laravel-boost -- php artisan boost:mcp

# Laravel Herd — PHP versions, services, sites
claude mcp add herd -- php /Applications/Herd.app/Contents/Resources/herd-mcp.phar
```

### Collaboration (Recommended)

```bash
# Atlassian — Jira + Confluence (OAuth in browser)
claude mcp add atlassian --transport sse https://mcp.atlassian.com/v1/sse

# Linear — issues, projects, cycles
claude mcp add linear -- npx -y mcp-remote https://mcp.linear.app/mcp

# Fireflies — meeting transcripts + summaries (OAuth in browser)
claude mcp add fireflies -- npx mcp-remote https://api.fireflies.ai/mcp

# Figma — design system, screenshots, code connect
claude mcp add figma --transport http https://mcp.figma.com/mcp
```

### Testing & Debugging (Optional)

```bash
# Chrome DevTools — live browser control, DOM, JS debugging
claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest
```

### After Installing

1. **Restart Claude Code** — type `/mcp` to verify servers are connected
2. **Authenticate** — Atlassian, Linear, Fireflies, and Figma will open OAuth in your browser on first use
3. **No API keys needed** — all use OAuth or local connections

---

## Installing Servers

### Add a Server (stdio)

```bash
claude mcp add server-name -- command args
```

### Add a Server (SSE transport)

```bash
claude mcp add server-name --transport sse https://example.com/sse
```

### Add a Server (HTTP transport)

```bash
claude mcp add server-name --transport http https://example.com/mcp
```

## Listing & Removing

### List Installed Servers

```bash
claude mcp list
```

Shows all configured servers across project, user, and session scopes.

### Remove a Server

```bash
claude mcp remove server-name
```

### Check Status in Session

```text
/mcp
```

Shows connection status for all servers in the current Claude Code session.

## Configuration Locations

| Scope | Location | Use Case |
|-------|----------|----------|
| Project | `.mcp.json` | Team-shared, version controlled |
| User | `~/.claude.json` | Personal servers, per-project |
| Session | `claude --mcp server` | Temporary, this session only |

### Project Configuration Example

Create `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "boost": {
      "command": "php",
      "args": ["artisan", "boost:mcp"]
    }
  }
}
```

### Session-Only Server

For temporary use without modifying config:

```bash
claude --mcp postgres
```

## Environment Variables

Pass environment variables to servers:

```json
{
  "mcpServers": {
    "aws": {
      "command": "mcp-server-aws",
      "env": {
        "AWS_REGION": "ap-southeast-2",
        "AWS_PROFILE": "default"
      }
    }
  }
}
```

## Debugging Servers

### Check if Server Starts

```bash
# Run the server command directly to see errors
php artisan boost:mcp
```

### Restart Servers

In Claude Code session:

```text
/mcp restart
```

## Best Practices

1. **Use `claude mcp add`** — the CLI manages config files for you
2. **Personal servers at user level** — API keys, OAuth tokens stay on your machine
3. **Session servers for one-off tasks** — testing, temporary access
4. **Never commit tokens** — OAuth-based MCPs handle this automatically

## Related

- [MCP Servers Overview](/ways-of-working/mcps) — Recommended servers by category
- [MCP Tool Search](/ways-of-working/claude-code-advanced/13-mcp-tool-search) — Reduce context overhead
