---
title: Recovery & Checkpoints
description: Undoing changes, stopping execution, and using Git as your safety net
---

When Claude goes off track, here's how to get back on course.

## Stopping Claude Mid-Execution

### Keyboard Shortcuts

| Shortcut      | What it does              |
| ------------- | ------------------------- |
| `Escape`      | Register interrupt signal |
| `Ctrl+C`      | Cancel current generation |
| `Esc` + `Esc` | Open the rewind menu      |

**Important**: Escape/Ctrl+C may not always stop Claude immediately. If you see Claude continuing after pressing Escape, let it finish and then rewind.

## The Rewind Feature (Esc + Esc)

Claude Code has built-in checkpointing. Every time you send a prompt, a checkpoint is automatically created.

**To rewind:**

1. Press `Esc` twice quickly, or
2. Type `/rewind`

**Choose what to restore:**

- **Conversation only** - Keep code changes, rewind the dialog
- **Code only** - Revert file edits, keep conversation
- **Both** - Full restore to a previous checkpoint

### What Gets Checkpointed

| Tracked                       | Not Tracked                |
| ----------------------------- | -------------------------- |
| File edits via Claude's tools | Bash commands (rm, mv, cp) |
| Conversation history          | Manual edits you make      |
| Session state                 | Database changes           |
|                               | API calls                  |

**Critical**: If Claude runs `rm file.txt` or other bash commands, the rewind feature **cannot undo those**. That's where Git comes in.

## Git as Your Safety Net

Think of commits like Crash Bandicoot checkpoints - you can always go back to the last one and try again.

### The Checkpoint Mindset

```bash
# Before risky work
git add . && git commit -m "checkpoint: before refactor"

# Claude does something wrong...

# Go back to checkpoint
git checkout .
```

### Quick Recovery Commands

```bash
# See what Claude changed
git diff

# Discard ALL uncommitted changes
git checkout .

# Discard changes to one file
git checkout -- path/to/file.txt

# See commit history
git log --oneline

# Hard reset to a specific commit
git reset --hard <commit-hash>
```

### Commit Frequency = Safety

The more often you commit, the smaller the blast radius when something goes wrong.

**Recommended flow:**

1. Commit before starting a new task
2. Let Claude work
3. Review the changes (`git diff`)
4. Commit if good, revert if bad
5. Repeat

This is why `/commit` exists as a slash command - make it easy to checkpoint frequently.

## Ask Claude to Undo

Sometimes the simplest approach: just ask.

> "Hey, undo what you just did and try a different approach"

> "Revert those changes and let's start fresh"

> "That didn't work - go back to how it was before"

Claude can:

- Revert its own file changes
- Understand what went wrong
- Try a different approach

This works well for recent changes where you're still in the same conversation.

## Plan Mode: Prevention First

The best recovery is not needing to recover.

**Toggle Plan Mode**: `Shift+Tab` or `Alt+M`

In Plan Mode, Claude analyzes and explains what it would do without actually doing it. Review the plan, then let it execute.

Use Plan Mode when:

- Making large refactors
- Doing something you're not sure about
- Working in unfamiliar code
- The task is complex or risky

## Recovery Decision Tree

```text
Something went wrong...
         |
         v
    Is it recent?
    /           \
   Yes           No
   |              |
   v              v
Ask Claude    Check git diff
to undo          |
   |              v
   v         Big changes?
Did it work?   /      \
 /     \      Yes      No
Yes    No      |        |
 |      |      v        v
Done  Try    git      git checkout
      Esc+Esc reset   specific file
      /rewind --hard
```

## Key Takeaways

- **Esc + Esc** opens the rewind menu for quick undo
- **Git is your safety net** - checkpoints don't track bash commands
- **Commit frequently** - smaller blast radius when things go wrong
- **Just ask Claude** to undo recent changes
- **Plan Mode** prevents mistakes before they happen
- Think of commits like game checkpoints - save often

## Quick Reference

| Situation                                  | Solution                     |
| ------------------------------------------ | ---------------------------- |
| Claude is running, want to stop            | `Ctrl+C` or `Escape`         |
| Undo recent Claude changes                 | `Esc+Esc` → Rewind           |
| Claude ran bash commands that broke things | `git checkout .`             |
| Want to review before undoing              | `git diff`                   |
| Go back to last commit                     | `git reset --hard HEAD`      |
| Try a different approach                   | Ask Claude to undo and retry |

## Further Reading

- [Claude Code Checkpointing Docs](https://code.claude.com/docs/en/checkpointing.md)
- [ccundo - Selective Undo Tool](https://github.com/RonitSachdev/ccundo)
