---
title: "Hooks"
description: PreToolUse, PostToolUse, Stop hooks, and the Ralph Wiggum technique
---

Automate actions around Claude's work.

## Overview

- PreToolUse hooks
- PostToolUse hooks
- Stop hooks
- The Ralph Wiggum technique

## What Are Hooks?

Hooks are scripts that run automatically at specific points in Claude's workflow. They let you:

- Validate or block actions before they happen
- Transform output after actions complete
- Intercept session events (like exit)

## Hook Types

| Hook | When It Runs | Purpose |
|------|--------------|---------|
| `Setup` | Session start (V4) | Repository initialization |
| `PreToolUse` | Before tool execution | Block or validate actions |
| `PostToolUse` | After tool completion | Transform output, run linters |
| `Stop` | Session exit attempt | Enforce completion, autonomous loops |

### Exit Codes

Hooks communicate with Claude via exit codes:

| Exit Code | Meaning | Effect |
|-----------|---------|--------|
| `0` | Allow | Action proceeds normally |
| `1` | Error | Action fails, error shown |
| `2` | Block with feedback | Action blocked, message shown to Claude |

**Exit code 2** is particularly useful—it lets you block an action while explaining why to Claude, so it can try a different approach.

### Setup Hooks (V4)

Run **once when a session starts**. Use for repository initialization.

**Location:** `.claude/hooks/setup/`

**Use cases:**
- Install dependencies if missing
- Verify environment configuration
- Set up git hooks
- Check required services are running

```bash
# .claude/hooks/setup/init-repo.sh
# Ensure dependencies are installed

if [ ! -d "vendor" ]; then
  echo "Installing PHP dependencies..."
  composer install
fi

if [ ! -d "node_modules" ]; then
  echo "Installing Node dependencies..."
  npm install
fi
```

### PreToolUse Hooks

Run **before** Claude executes a tool. Can block or modify the action.

**Location:** `.claude/hooks/pre-tool-use/`

**Use cases:**
- Block writes to protected files
- Validate command safety
- Enforce coding standards before edits

```bash
# .claude/hooks/pre-tool-use/block-env.sh
# Block any edits to .env files

if [[ "$TOOL_NAME" == "Edit" && "$FILE_PATH" == *.env* ]]; then
  echo "BLOCKED: Cannot edit .env files automatically"
  exit 1
fi
```

### PostToolUse Hooks

Run **after** Claude completes a tool action. Can transform output or trigger follow-up actions.

**Location:** `.claude/hooks/post-tool-use/`

**Use cases:**
- Auto-format code after edits
- Run linters automatically
- Log actions for audit

```bash
# .claude/hooks/post-tool-use/format-php.sh
# Auto-format PHP files after edit

if [[ "$TOOL_NAME" == "Edit" && "$FILE_PATH" == *.php ]]; then
  ./vendor/bin/pint "$FILE_PATH"
fi
```

### Stop Hooks

Run when Claude tries to **exit the session**. Can block exit or trigger continuation.

**Location:** `.claude/hooks/stop/`

**Use cases:**
- Enforce completion criteria
- Implement autonomous loops
- Add exit confirmations

## Practical Examples

### Auto-Format on Save

```bash
# post-tool-use/auto-format.sh
case "$FILE_PATH" in
  *.php) ./vendor/bin/pint "$FILE_PATH" ;;
  *.js|*.ts) npx prettier --write "$FILE_PATH" ;;
  *.py) black "$FILE_PATH" ;;
esac
```

### Block Dangerous Commands

```bash
# pre-tool-use/safety-check.sh
DANGEROUS_PATTERNS="rm -rf|DROP TABLE|DELETE FROM.*WHERE 1"

if [[ "$TOOL_NAME" == "Bash" ]]; then
  if echo "$COMMAND" | grep -qE "$DANGEROUS_PATTERNS"; then
    echo "BLOCKED: Potentially dangerous command"
    exit 1
  fi
fi
```

### Run Tests After Code Changes

```bash
# post-tool-use/auto-test.sh
if [[ "$TOOL_NAME" == "Edit" && "$FILE_PATH" == app/*.php ]]; then
  php artisan test --filter="$(basename "$FILE_PATH" .php)"
fi
```

## The Ralph Wiggum Technique

An advanced pattern that uses Stop hooks to create autonomous loops.

### What It Is

Ralph Wiggum (named after The Simpsons character) is a technique where Claude keeps working on a task until it's complete—without human intervention.

```
Claude: [Works on task]
Claude: [Tries to exit]
Stop Hook: [Blocks exit, re-feeds prompt]
Claude: [Continues working]
[Repeat until done]
```

### How It Works

1. You give Claude a task with clear completion criteria
2. Claude works on it, makes progress
3. When Claude tries to exit, the Stop hook intercepts
4. The same prompt is fed back, but Claude sees its previous work
5. Claude continues iterating until the completion criteria is met

### Using Ralph Wiggum

```bash
/ralph-loop "Build a REST API for todos" --max-iterations 20 --completion-promise "DONE"
```

**Key options:**
- `--max-iterations` - Safety limit (always set this!)
- `--completion-promise` - Text that signals completion

### When It Works Well

- Tasks with clear, verifiable success criteria
- Test-driven development (tests passing = done)
- Greenfield projects you can walk away from
- Tasks with automatic verification (linters, type checks)

### When to Avoid It

- Tasks requiring human judgment
- Design decisions or creative work
- Unclear or subjective success criteria
- Production debugging

### Honest Assessment

Ralph Wiggum has blown up online, but results vary:

**The appeal:**
- Walk away, come back to finished work
- Handles retry logic automatically
- Great for well-defined tasks

**The reality:**
- Requires very clear prompts
- Can burn through tokens on impossible tasks
- Not a replacement for thoughtful iteration
- Multiple windows with human oversight often works better

For most work, [pair prompting](/video-series/claude-code-mastery/prompting-communication/03-pair-prompting) with multiple windows gives you more control. Ralph is best for specific, verifiable tasks where you genuinely can walk away.

### Canceling

```bash
/cancel-ralph
```

## Hook Best Practices

1. **Keep hooks fast** - They run on every tool use
2. **Fail gracefully** - Don't break Claude's workflow
3. **Log important events** - Useful for debugging
4. **Test hooks manually first** - Before letting Claude trigger them
5. **Use exit codes correctly:**
   - `exit 0` - Allow the action
   - `exit 1` - Error (action fails)
   - `exit 2` - Block with feedback (Claude sees your message)

## Sources

- [How to Configure Hooks](https://claude.com/blog/how-to-configure-hooks) - Anthropic's guide to hooks
- [Ralph Wiggum: Autonomous Loops for Claude Code](https://paddo.dev/blog/ralph-wiggum-autonomous-loops/)
- [Official Ralph Wiggum Plugin](https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum)
- [A Brief History of Ralph](https://www.humanlayer.dev/blog/brief-history-of-ralph)
