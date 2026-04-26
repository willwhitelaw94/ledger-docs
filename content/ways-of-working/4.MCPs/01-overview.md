---
title: Overview
description: Recommended MCP servers by category
---

Extend Claude Code with external tools and services.

## What Are MCP Servers?

MCP (Model Context Protocol) servers give Claude access to external tools—databases, APIs, services, and more. Each server adds capabilities but also consumes context tokens.

**Important:** With [MCP Tool Search](/ways-of-working/claude-code-advanced/13-mcp-tool-search) (V4), tool definitions load on-demand rather than at startup, reducing context overhead by 85%.

## Our Recommended Servers

These servers are configured for TC Portal development:

| Server | Purpose | Category |
| --- | --- | --- |
| [Laravel Boost](/ways-of-working/mcps/servers/laravel-boost) | Database queries, Artisan commands, tinker, doc search | Core |
| [Laravel Herd](/ways-of-working/mcps/servers/herd) | Local PHP environment, services, sites | Core |
| [Atlassian](/ways-of-working/mcps/servers/atlassian) | Jira issues, Confluence pages | Collaboration |
| **Linear** | Issues, projects, cycles, teams | Collaboration |
| **Fireflies** | Meeting transcripts, summaries, search | Collaboration |
| **Figma** | Design system, screenshots, code connect | Collaboration |
| **Chrome DevTools** | Live browser control, DOM, JS debugging | Testing |

See [Managing MCP Servers](/ways-of-working/mcps/02-managing-servers#quick-setup--tc-portal) for install commands.

## Recommended by Category

### Development (Core)

| Server            | What It Provides                                           |
| ----------------- | ---------------------------------------------------------- |
| **Laravel Boost** | Database queries, Artisan commands, URL generation, tinker |
| **Laravel Herd**  | PHP version management, local services                     |
| **GitHub**        | Repository access, PR management, issues                   |
| **Filesystem**    | Enhanced file operations beyond built-in tools             |
| **Context7**      | Documentation and context retrieval                        |

### Databases

> **Note:** Laravel Boost already provides database queries, schema inspection, and tinker for MySQL/PostgreSQL. These standalone database MCPs are only needed for non-Laravel projects or direct access to other database types.

| Server         | What It Provides                      | When to Use                                      |
| -------------- | ------------------------------------- | ------------------------------------------------ |
| **PostgreSQL** | Direct SQL queries, schema inspection | Non-Laravel projects                             |
| **MongoDB**    | Document database operations          | MongoDB databases                                |
| **MySQL**      | MySQL-specific queries                | Non-Laravel projects                             |
| **Redis**      | Cache inspection, pub/sub             | Direct Redis access (Boost covers Laravel cache) |

### Documents & Search

| Server         | What It Provides                  |
| -------------- | --------------------------------- |
| **Qdrant**     | Vector search, semantic retrieval |
| **Confluence** | Wiki pages (via Atlassian MCP)    |

### Testing & Automation

| Server              | What It Provides                                    |
| ------------------- | --------------------------------------------------- |
| **Chrome DevTools** | Live browser control, DOM inspection, JS debugging  |
| **Playwright**      | Browser automation, screenshots, E2E tests          |
| **Puppeteer**       | Chrome automation alternative                       |

### Cloud & Infrastructure

| Server         | What It Provides                        |
| -------------- | --------------------------------------- |
| **AWS**        | S3, Lambda, EC2, and other AWS services |
| **Docker**     | Container management, logs              |
| **Kubernetes** | Cluster operations, pod management      |

## Quick Reference

For installation, configuration, and management commands, see [Managing MCP Servers](/ways-of-working/mcps/02-managing-servers).

## Context Considerations

Each MCP server adds overhead:

| Servers Connected | Without Tool Search | With Tool Search |
| ----------------- | ------------------- | ---------------- |
| 1-2 servers       | \~8% context        | \~2% context     |
| 5 servers         | \~20% context       | \~4% context     |
| 10+ servers       | \~30%+ context      | \~5% context     |

**Best practices:**

- Only connect servers you'll actually use
- Use session-specific servers (`--mcp`) for one-off tasks
- Monitor with `/context` and `/mcp`
- Disable unused servers in long sessions

## Finding More Servers

- [MCP Market Leaderboard](https://mcpmarket.com/leaderboards) — Popular servers ranked
- [MCP Server Registry](https://github.com/modelcontextprotocol/servers) — Official list
- [Awesome MCP Servers](https://github.com/punkpeye/awesome-mcp-servers) — Community curated
- Search npm: `npm search mcp-server`

## Related

- [Managing MCP Servers](/ways-of-working/mcps/02-managing-servers) — Installation, configuration, commands
- [MCP Tool Search](/ways-of-working/claude-code-advanced/13-mcp-tool-search) — Reduce MCP context overhead by 85%
- [Extending Claude](/ways-of-working/claude-code-advanced/01-extending-claude) — MCP vs Skills vs Agents
- [Advanced Context](/ways-of-working/claude-code-advanced/04-advanced-context) — Managing MCP output limits
