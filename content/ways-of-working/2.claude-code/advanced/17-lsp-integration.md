---
title: LSP Integration
description: 900x faster semantic code navigation with Language Server Protocol
---

Semantic understanding instead of text search.

## What Is LSP Integration?

LSP (Language Server Protocol) gives Claude Code deep understanding of your code's structure—not just text patterns, but actual semantic meaning.

**Available since:** v2.0.74+

## The Speed Difference

| Operation | Text-based Search | LSP |
|-----------|------------------|-----|
| Find definition | Grep through files | Instant jump |
| Find references | Pattern matching | Semantic lookup |
| Cross-codebase navigation | Slow, unreliable | **900x faster** |

LSP understands that `UserService` in your import statement refers to the class defined in `app/Services/UserService.php`—it doesn't just search for the string "UserService".

## Supported Languages

| Language | Support Level |
|----------|--------------|
| Python | Full |
| TypeScript | Full |
| JavaScript | Full |
| Go | Full |
| Rust | Full |
| Java | Full |
| C/C++ | Full |
| C# | Full |
| PHP | Full |
| Kotlin | Full |
| Ruby | Full |
| HTML/CSS | Basic |

## Enabling LSP

LSP plugins are configured in `.claude/settings.json`:

```json
{
  "plugins": [
    "php-lsp@claude-plugins-official",
    "typescript-lsp@claude-plugins-official"
  ]
}
```

### Available Official Plugins

| Plugin | Languages |
|--------|-----------|
| `php-lsp@claude-plugins-official` | PHP |
| `typescript-lsp@claude-plugins-official` | TypeScript, JavaScript |
| `python-lsp@claude-plugins-official` | Python |
| `go-lsp@claude-plugins-official` | Go |
| `rust-lsp@claude-plugins-official` | Rust |

## What LSP Enables

### Go to Definition

Claude can instantly jump to where something is defined:

```text
You: "Where is the UserService class defined?"
Claude: [Instantly finds app/Services/UserService.php:15]
```

No grep, no guessing.

### Find All References

See everywhere something is used:

```text
You: "Where is createUser called?"
Claude: [Lists all call sites with line numbers]
```

### Understand Imports

LSP resolves imports to actual files:

```text
use App\Services\UserService;
     ↓
app/Services/UserService.php
```

### Type Information

Claude understands types, interfaces, and inheritance:

```text
You: "What methods does UserController inherit?"
Claude: [Lists methods from parent Controller class]
```

## When LSP Helps Most

- **Large codebases** — Navigation without loading everything into context
- **Refactoring** — Find all usages before changing
- **Understanding unfamiliar code** — Jump around efficiently
- **Cross-file changes** — Know what's affected

## Practical Impact

Without LSP, Claude has to:
1. Search for text patterns
2. Read multiple files to understand relationships
3. Guess at which "UserService" you mean

With LSP:
1. Direct lookup via semantic understanding
2. Accurate results immediately
3. Less context consumed by exploratory file reads

## Checking LSP Status

```text
/doctor
```

Shows which LSP servers are running and their status.

## Troubleshooting

### LSP Not Working

1. **Check settings.json** — Is the plugin listed?
2. **Run /doctor** — See if LSP server started
3. **Check language support** — Is your language supported?
4. **Restart session** — LSP servers start on session init

### Slow LSP

First-time indexing can be slow on large projects. Subsequent sessions use cached indexes.

## Related

- [Extending Claude](/ways-of-working/claude-code-advanced/01-extending-claude) — Other ways to extend capabilities
- [Context Management](/ways-of-working/claude-code/07-context-management) — LSP reduces context consumption
