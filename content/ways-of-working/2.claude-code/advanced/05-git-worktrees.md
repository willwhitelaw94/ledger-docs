---
title: "Advanced: Git Worktrees"
description: Running multiple branches simultaneously for parallel work
---

Work on multiple branches at the same time without stashing.

## What Are Git Worktrees?

A worktree is a separate working directory linked to the same repository. Instead of switching branches (and losing your work-in-progress), you have multiple directories - each on a different branch.

```
~/projects/
├── tc-portal/              # Main worktree (dev branch)
├── tc-portal-feature-a/    # Worktree for feature A
└── tc-portal-hotfix/       # Worktree for urgent fix
```

Each directory is a full checkout. You can have VS Code open in one, Claude Code in another.

## When Worktrees Make Sense

### Good Use Cases

- **Urgent hotfix** while mid-feature - don't disrupt your work
- **Running multiple Claude sessions** on different tasks
- **Comparing implementations** side-by-side
- **Long-running tasks** (builds, tests) while you work elsewhere
- **Code review** without switching away from your work

### When to Skip Worktrees

- Simple, quick branch switches
- You're comfortable with stashing
- You only work on one thing at a time
- Your repo is huge (worktrees duplicate files)

## Basic Commands

### Create a Worktree

```bash
# From your main repo
git worktree add ../tc-portal-feature path/to/branch

# Or create a new branch
git worktree add -b new-feature ../tc-portal-feature
```

### List Worktrees

```bash
git worktree list
```

### Remove a Worktree

```bash
# After you're done and merged
git worktree remove ../tc-portal-feature
```

## Using Worktrees with Claude Code

### Parallel Claude Sessions

Run separate Claude Code sessions in different worktrees:

```bash
# Terminal 1: Main feature work
cd ~/projects/tc-portal
claude

# Terminal 2: Hotfix
cd ~/projects/tc-portal-hotfix
claude
```

Each Claude session has its own context, its own branch, its own changes.

### Ask Claude to Set It Up

> "Create a worktree for a hotfix branch"

Claude will run the commands for you.

## The Simpler Alternative

For most people, **single codebase + frequent commits** is enough:

1. Commit your work-in-progress
2. Switch branches
3. Do the other task
4. Switch back

Worktrees add complexity. Use them when the benefit is clear.

## Key Takeaways

- Worktrees let you work on multiple branches simultaneously
- Great for hotfixes, parallel Claude sessions, or comparisons
- Adds complexity - only use when needed
- Single codebase with frequent commits works for most cases
- Ask Claude to manage worktree commands for you
