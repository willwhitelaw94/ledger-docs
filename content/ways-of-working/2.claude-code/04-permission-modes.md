---
title: Permission Modes
description: Normal, auto-accept, and bypassing all permissions
---

## Overview

- Normal mode - approve each action
- Auto-accept mode - trust Claude's decisions
- Bypassing all permissions with `--dangerously-skip-permissions`
- When each mode is appropriate

## Normal Mode (Default)

The default permission mode requires you to approve each action Claude wants to take:

- **File edits** - Approve before any file is modified
- **Bash commands** - Approve before any terminal command runs
- **Tool calls** - Approve MCP tool invocations

This is the safest approach when you're learning Claude Code or working in sensitive areas of your codebase.

## Auto-Edit Mode

Auto-edit mode lets Claude automatically edit files within specified folders while still requiring approval for everything else.

### How It Works

1. You define which folders Claude can edit freely
2. Edits to those folders happen automatically
3. Edits outside those folders still require approval
4. Bash commands and other tools still require approval

### Configuration

In your Claude Code settings, specify allowed folders:

```json
{
  "permissions": {
    "allow": [
      "Edit:.tc-docs/**",
      "Edit:tests/**"
    ]
  }
}
```

### Practical Example

If you're working on documentation:

- Allow: `.tc-docs/**` - Claude can freely edit docs
- Block: `app/**`, `config/**` - Still requires approval for application code

This gives Claude speed where you want it while maintaining control where it matters.

### Safety Considerations

Good candidates for auto-edit:

- Documentation folders
- Test files
- Generated code directories
- Scratch/temp folders

Keep approval required for:

- Application source code (`app/`, `src/`)
- Configuration files (`config/`, `.env`)
- Package manifests (`package.json`, `composer.json`)
- Database migrations

## Auto-Accept Mode

Auto-accept mode trusts all Claude decisions, including bash commands and tool calls.

Use this when:

- You're in a sandboxed environment
- You've thoroughly tested Claude's behavior
- Speed is more important than review
- You're pairing closely and watching the output

**Caution:** Claude can run any terminal command in this mode. Use only when you trust the environment and can recover from mistakes.

## Bypassing All Permissions

The `--dangerously-skip-permissions` flag removes all permission checks:

```bash
claude --dangerously-skip-permissions
```

### Appropriate Uses

- **CI/CD pipelines** - Automated environments without human interaction
- **Trusted containers** - Isolated, disposable environments
- **Scripted workflows** - When Claude Code is part of a larger automation

### Not Recommended For

- Interactive development sessions
- Production environments
- Shared workstations
- Any environment where mistakes are costly

## Folder Restrictions Pattern

The most practical approach combines auto-edit with explicit folder restrictions:

```json
{
  "permissions": {
    "allow": [
      "Edit:docs/**",
      "Edit:tests/**",
      "Edit:.claude/**"
    ],
    "deny": [
      "Edit:vendor/**",
      "Edit:node_modules/**",
      "Edit:.env*"
    ]
  }
}
```

This pattern:

- Speeds up work in safe areas
- Protects critical files automatically
- Reduces approval fatigue
- Maintains audit trail for sensitive changes

## Choosing Your Mode

| Scenario                 | Recommended Mode         |
| ------------------------ | ------------------------ |
| Learning Claude Code     | Normal                   |
| Documentation work       | Auto-edit (docs folder)  |
| Test writing             | Auto-edit (tests folder) |
| Core application changes | Normal                   |
| CI/CD automation         | Bypass (in container)    |
| Trusted local dev        | Auto-accept (carefully)  |
