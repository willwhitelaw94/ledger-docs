---
title: Keyboard Shortcuts
description: Essential shortcuts and custom keybindings for Claude Code
---

Master the keyboard. Work faster.

## Essential Shortcuts

| Shortcut | Action | When to Use |
|----------|--------|-------------|
| **Ctrl+C** | Cancel current operation | Stop runaway commands, long outputs |
| **Ctrl+B** | Background current task | Send to background, keep working |
| **Shift+Tab** | Auto-accept plan edits | Trust Claude's plan, apply all changes |
| **Esc Esc** | Rewind to previous state | Undo last action, go back |
| **Ctrl+R** | Reverse command history | Find previous commands |

## Operation Control

### Cancel: Ctrl+C

Stop whatever's happening:

```text
Claude: "Reading large file..."
[Ctrl+C]
Claude: "Cancelled."
```

Use when:
- Output is too verbose
- Wrong command started
- Taking too long

### Background: Ctrl+B

Send running operation to background:

```text
Claude: "Running tests..."
[Ctrl+B]
Claude: "Backgrounded. What's next?"
```

See [Background Tasks](/ways-of-working/claude-code-advanced/15-background-tasks) for details.

## Navigation

### Rewind: Esc Esc

Double-tap Escape to undo the last action:

```text
[Made a mistake]
[Esc] [Esc]
[Back to previous state]
```

Works for:
- File changes
- Command execution
- Navigation mistakes

### Command History: Ctrl+R

Search through previous commands:

```text
[Ctrl+R]
(reverse-i-search): test
> php artisan test --filter=UserTest
```

Standard shell reverse search behavior.

## Edit Mode

### Auto-Accept Plan: Shift+Tab

When Claude shows a plan with edits:

```text
Claude: "I'll make these changes:
  - Edit file A
  - Edit file B
  - Run tests"

[Shift+Tab] → Accepts all proposed changes
```

Use when you trust Claude's plan and want to proceed quickly.

## Custom Keybindings

Configure custom shortcuts in `~/.claude/keybindings.json`:

```json
{
  "keybindings": [
    {
      "key": "ctrl+t",
      "command": "runTests"
    },
    {
      "key": "ctrl+shift+c",
      "command": "clearContext"
    }
  ]
}
```

### View Current Keybindings

```text
/keybindings
```

Shows all configured shortcuts.

### Available Commands

| Command | Description |
|---------|-------------|
| `runTests` | Execute test suite |
| `clearContext` | Clear conversation (`/clear`) |
| `compact` | Compact context (`/compact`) |
| `cancel` | Cancel operation |
| `background` | Background task |

## Quick Reference Card

```text
┌─────────────────────────────────────────┐
│  CLAUDE CODE SHORTCUTS                  │
├─────────────────────────────────────────┤
│  Ctrl+C      Cancel operation           │
│  Ctrl+B      Background task            │
│  Shift+Tab   Accept plan edits          │
│  Esc Esc     Rewind/undo                │
│  Ctrl+R      Command history            │
├─────────────────────────────────────────┤
│  /keybindings   View all shortcuts      │
│  /config        Configure settings      │
└─────────────────────────────────────────┘
```

## Building Muscle Memory

Start with these three:

1. **Ctrl+C** — Your emergency stop
2. **Ctrl+B** — Don't wait, background it
3. **Esc Esc** — Made a mistake? Go back

Add more as you get comfortable.

## Image Pasting

To paste images from your clipboard into a Claude Code prompt, use **Ctrl+V** — even on Mac where you'd normally use Cmd+V. This is a common gotcha since Claude Code uses Ctrl consistently across all platforms.

## Platform Notes

| Platform | Modifier Key |
|----------|-------------|
| macOS | Ctrl (not Cmd) |
| Linux | Ctrl |
| Windows | Ctrl |

Claude Code uses Ctrl consistently across platforms, even on Mac where you might expect Cmd.

## Related

- [Background Tasks](/ways-of-working/claude-code-advanced/15-background-tasks) — Using Ctrl+B effectively
- [Context Management](/ways-of-working/claude-code/07-context-management) — Commands like /clear and /compact
