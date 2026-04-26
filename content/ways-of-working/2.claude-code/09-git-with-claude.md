---
title: "Git with Claude"
description: Claude + Git CLI is all you need - no GitHub MCP required
---

Claude is excellent at Git. You don't need fancy integrations.

## The Simple Truth: Git CLI is Enough

Claude handles Git commands flawlessly through the terminal. You don't need:
- GitHub MCP servers
- Git GUI tools
- Special integrations

Just ask Claude what you want, and it runs the right `git` commands.

## Why Git CLI > GitHub MCP

| Git CLI (Built-in) | GitHub MCP |
|--------------------|------------|
| Always available | Requires setup |
| No authentication hassles | Token management |
| Claude knows it deeply | Extra abstraction layer |
| Works offline for local ops | Needs API access |
| Zero overhead | More things to break |

Claude's training includes extensive Git knowledge. It knows the flags, the edge cases, the recovery commands. Let it use what it knows best.

## Common Git Workflows

### Committing Changes

Just ask:
> "Commit these changes with a good message"

Claude will:
1. Run `git status` to see what changed
2. Stage appropriate files
3. Write a descriptive commit message
4. Run the commit

### Creating PRs

> "Create a PR for this branch"

Claude uses `gh pr create` (GitHub CLI) - no MCP needed.

### Checking History

> "Show me what changed in the last 5 commits"
> "Who last modified this file?"
> "When was this function added?"

### Branching

> "Create a new branch for this feature"
> "Switch to the dev branch"
> "Merge main into my branch"

## Merge Conflicts

Claude handles merge conflicts well, but you need to prompt it.

### When Conflicts Happen

After a merge/rebase with conflicts:
> "Help me resolve these merge conflicts"

Claude will:
1. Show you the conflicting files
2. Explain what each side changed
3. Suggest the right resolution
4. Make the edits

### Tips for Conflict Resolution

- **Show Claude both sides**: "This is my change, this is theirs, which should win?"
- **Explain intent**: "I want to keep my feature but incorporate their bug fix"
- **Ask for explanation**: "Why did this conflict happen?"

### After Resolution

> "Mark conflicts as resolved and continue the merge"

Claude runs:
```bash
git add <resolved-files>
git merge --continue  # or git rebase --continue
```

## Code Review with Claude

Before pushing, ask for a review:

> "Review my changes before I push"

Claude will:
- Run `git diff` to see changes
- Identify potential issues
- Suggest improvements
- Check for common mistakes

This catches problems before your teammates see them.

## Concepts > Commands

You don't need to memorize Git commands. Understand these concepts:

- **Commits** = Checkpoints (save points you can return to)
- **Branches** = Parallel timelines (work on features without affecting main)
- **Staging** = Selecting what goes in the next commit
- **Remote** = The shared copy (GitHub/GitLab)
- **Merge** = Combining branches
- **Rebase** = Replaying your changes on top of new work

Tell Claude what you want conceptually, and it handles the syntax.

## Key Takeaways

- **Git CLI is all you need** - Claude handles it perfectly
- **Skip the GitHub MCP** - it adds complexity without benefit
- **Ask for merge conflict help** - Claude resolves them well
- **Get code reviews before pushing** - catch issues early
- **Think in concepts** - let Claude handle the commands

## Quick Prompts Reference

| What you want | What to say |
|---------------|-------------|
| Commit changes | "Commit with a good message" |
| Create PR | "Create a PR for this branch" |
| Resolve conflicts | "Help me resolve these merge conflicts" |
| Review changes | "Review my changes before I push" |
| Undo last commit | "Undo the last commit but keep the changes" |
| See history | "Show recent commits" |
| Switch branch | "Switch to the feature branch" |
