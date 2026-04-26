---
title: "CLAUDE.md"
description: Your project's AI instruction manual
---

Tell Claude how to work with your project.

## What is CLAUDE.md?

CLAUDE.md is a markdown file that provides persistent instructions to Claude Code. It's automatically loaded at the start of every session, giving Claude context about your project without you having to repeat yourself.

Think of it as onboarding documentation - but for your AI assistant.

## File Locations (Full Hierarchy)

Claude Code loads memory files from multiple locations, in order:

| Level | Location | Scope | Use Case |
|-------|----------|-------|----------|
| 1. Enterprise | `/etc/claude-code/CLAUDE.md` | System-wide | Corporate policies, security rules |
| 2. Global | `~/.claude/CLAUDE.md` | All your projects | Personal preferences, global conventions |
| 3. Project | `./CLAUDE.md` | This repository | Team conventions, project-specific rules |
| 4. Project Alt | `./.claude/CLAUDE.md` | This repository | Alternative location, same as above |
| 5. Local | `./CLAUDE.local.md` | Personal override | Your preferences for this project (gitignored) |

**Loading order:** Enterprise → Global → Project → Local

Later files override earlier ones. This means:
- Enterprise rules set the foundation (security, compliance)
- Global preferences apply across all your work
- Project rules standardize team behavior
- Local overrides let you customize without affecting the team

### The Security Gatekeeper Pattern

The global `~/.claude/CLAUDE.md` acts as a security gatekeeper across all projects:

```markdown
# Global Security Rules

## Never Allow
- Committing .env files
- Exposing API keys in code
- Running destructive database commands without confirmation

## Always Require
- Tests before marking work complete
- Confirmation before force-push
```

This ensures consistent safety rules regardless of what project you're working in.

## What to Include

### Good Content

```markdown
# Project Overview
TC Portal - Laravel 12 + Vue 3 + Inertia v2

# Commands
- `npm run dev` - Start Vite dev server
- `php artisan test` - Run tests
- `vendor/bin/pint` - Format PHP code

# Conventions
- Use Form Request classes for validation
- Tests use Pest, not PHPUnit syntax
- Vue components in resources/js/Pages/

# Summary instructions
When compacting, focus on code changes and test results
```

### What NOT to Include

- Entire codebases or large documentation
- Information that changes frequently
- Generic programming advice Claude already knows
- Secrets or credentials

**Keep it concise:** Aim for under 300 lines. Every line consumes context tokens on every interaction.

## Modular Rules

For larger projects, split instructions into focused files:

```
.claude/
  rules/
    testing.md      # Test conventions
    security.md     # Security requirements
    api.md          # API design patterns
```

These are automatically loaded alongside CLAUDE.md.

**Path-specific rules:** Use glob patterns for rules that only apply to certain files:

```markdown
<!-- .claude/rules/frontend.md -->
---
globs: ["resources/js/**/*.vue", "resources/js/**/*.ts"]
---

# Frontend Rules
- Use Composition API
- Prefer `<script setup>` syntax
```

## Importing Other Files

Reference existing documentation:

```markdown
See @README.md for project overview.
See @docs/api.md for API conventions.
```

Claude will load these files when the CLAUDE.md is processed.

## Team Standards

### Version Control

Commit your CLAUDE.md to the repository:
- Ensures consistency across the team
- New team members get AI-ready immediately
- Changes are tracked and reviewable

### What to Standardize

- Testing requirements and commands
- Code style preferences
- Commit message formats
- PR conventions
- Architecture decisions

### Personal Overrides

Use `CLAUDE.local.md` (gitignored) for personal preferences that shouldn't affect the team:

```markdown
# Personal Preferences
- I prefer verbose explanations
- Always show the full file path in responses
```

## Managing Memory

### Check What's Loaded

```
/memory
```

Opens an editor showing all loaded memory files and their contents.

### Effective CLAUDE.md Patterns

**1. Start with the essentials:**
```markdown
# TC Portal
Laravel 12 + Vue 3 + Inertia v2

## Quick Commands
- `composer run dev` - Full dev environment
- `php artisan test --filter=MyTest` - Run specific test
```

**2. Be specific about conventions:**
```markdown
## Conventions
- Controllers: Single-action preferred, use `__invoke()`
- Validation: Always use Form Request classes
- Tests: Pest syntax, use factories
```

**3. Include gotchas:**
```markdown
## Watch Out
- Run `npm run build` after frontend changes
- The `User` model uses soft deletes
- API routes require Sanctum authentication
```

**4. Define compaction behavior:**
```markdown
## Summary instructions
When compacting, preserve:
- Code changes made (file paths and key changes)
- Test results (pass/fail status)
- Decisions made and their rationale
```

## Best Practices

1. **Review regularly** - Update CLAUDE.md as your project evolves
2. **Keep it scannable** - Use headers, bullet points, code blocks
3. **Test with new sessions** - Start fresh to see how well Claude understands your project
4. **Don't duplicate** - If it's in your README, reference it rather than copying
5. **Measure the cost** - Large CLAUDE.md files consume tokens on every interaction
