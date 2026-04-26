---
title: "Plugins"
description: Extend Claude Code with community and custom plugins
---

Install, create, and share Claude Code extensions.

## Overview

Plugins package reusable functionality—commands, skills, hooks, and MCP servers—for easy sharing and installation.

## Installing Plugins

### From the Official Marketplace

```bash
/plugin install plugin-name@claude-plugins-official
```

**Popular official plugins:**

| Plugin | Purpose |
|--------|---------|
| `pr-review-toolkit` | 6 specialized agents for comprehensive PR review |
| `typescript-lsp` | TypeScript language intelligence |
| `commit-commands` | Git commit and push workflows |
| `explanatory-output-style` | Educational insights about implementation |

### Interactive Plugin Manager

Run `/plugin` to open the interactive manager:

- **Discover** - Browse available plugins
- **Installed** - Manage your plugins
- **Marketplaces** - Add or remove plugin sources
- **Errors** - View loading issues

### Installation Scopes

| Scope | Effect | Config Location |
|-------|--------|-----------------|
| **User** (default) | Available in all your projects | `~/.claude/` |
| **Project** | Shared with collaborators | `.claude/settings.json` |
| **Local** | Just you, just this project | Local config |

```bash
/plugin install my-plugin --scope project
```

## Managing Plugins

```bash
/plugin disable plugin-name@marketplace   # Temporarily disable
/plugin enable plugin-name@marketplace    # Re-enable
/plugin uninstall plugin-name@marketplace # Remove completely
```

## Adding Marketplaces

Beyond the official marketplace, add community or private sources:

```bash
# GitHub repository
/plugin marketplace add anthropics/claude-code

# GitLab or other Git hosts
/plugin marketplace add https://gitlab.com/company/plugins.git

# Local path (for development)
/plugin marketplace add ./my-marketplace
```

List and manage marketplaces:

```bash
/plugin marketplace list
/plugin marketplace update marketplace-name
/plugin marketplace remove marketplace-name
```

## Creating Plugins

### Basic Structure

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # Plugin manifest (required)
├── commands/
│   └── hello.md             # Slash commands
├── skills/
│   └── my-skill/
│       └── SKILL.md         # Skills
├── hooks/
│   └── hooks.json           # Hook configurations
└── .mcp.json                # MCP server configs
```

### Plugin Manifest

Create `.claude-plugin/plugin.json`:

```json
{
  "name": "my-plugin",
  "description": "What this plugin does",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  }
}
```

### Adding a Command

Create `commands/hello.md`:

```markdown
---
description: Greet the user warmly
---

# Hello Command

Greet the user named "$ARGUMENTS" and ask how you can help.
```

### Testing Locally

```bash
claude --plugin-dir ./my-plugin
```

Then use your command:

```bash
/my-plugin:hello Alex
```

## Plugin vs Standalone

| Aspect | Standalone (`.claude/`) | Plugin |
|--------|-------------------------|--------|
| Command names | `/hello` | `/plugin-name:hello` |
| Sharing | Manual copy | Install with `/plugin` |
| Versioning | Manual | Semantic versioning |
| Best for | Quick iteration | Team sharing |

**Tip:** Start with standalone configs in `.claude/`, then convert to a plugin when you want to share.

## Notable Plugins

### Ralph Wiggum

Creates autonomous loops for iterative task completion. Already configured in this project.

```bash
/ralph-wiggum:help           # Explain the technique
/ralph-wiggum:ralph-loop     # Start a loop
/ralph-wiggum:cancel-ralph   # Cancel active loop
```

See [Hooks](/guides/claude-code-advanced/01-hooks/) for how Ralph Wiggum works.

### PR Review Toolkit

Six specialized agents for comprehensive pull request review:

- Comment analysis
- Test analysis
- Error handling review
- Type design review
- Code quality checks
- Code simplification suggestions

```bash
/plugin install pr-review-toolkit@claude-plugins-official
```

### Language Servers (LSP)

Real-time code intelligence for jump-to-definition, find references, and type checking:

```bash
/plugin install typescript-lsp@claude-plugins-official
/plugin install python-lsp@claude-plugins-official
```

## Resources

- [Official Plugin Documentation](https://docs.anthropic.com/en/docs/claude-code/plugins)
- [Plugin Marketplace](https://github.com/anthropics/claude-code/tree/main/plugins)
- [Community Plugin Registry](https://claude-plugins.dev/)
