---
title: "Ralph Wiggum Mode"
description: "Autonomous implementation using iterative loops"
---

Let Claude work through your task list autonomously.

---

## What Is Ralph Wiggum?

Ralph Wiggum (named after The Simpsons character) is a technique where Claude keeps working on a task list until it's complete—without human intervention.

```
Claude: [Works on task]
Claude: [Tries to exit]
Stop Hook: [Blocks exit, re-feeds prompt]
Claude: [Continues working]
[Repeat until all tasks done]
```

---

## How It Integrates with Implementation

`/speckit-implement` supports two modes:

### Standard Mode (Default)

Interactive implementation with user oversight. Claude executes tasks and reports progress, pausing for feedback at each step.

```bash
/speckit-implement
```

**The workflow:**
1. Load tasks.md and technical-plan.md
2. Find next unchecked `[ ]` task
3. Implement the task
4. Run tests
5. Mark task `[X]` if tests pass
6. **Stop and report** — wait for user input
7. Continue with next task on user's go-ahead

### Ralph Mode (Autonomous)

Claude loops continuously until all tasks complete or max iterations reached.

```bash
/speckit-implement --ralph --max-iterations 50
/speckit-implement --autonomous --max-iterations 30
```

**The workflow:**
1. Load tasks.md and technical-plan.md
2. Find next unchecked `[ ]` task
3. Implement the task
4. Run tests
5. If tests pass: mark task `[X]`, continue to next task
6. If tests fail: fix and retry (same iteration)
7. **Loop automatically** — no user input needed
8. Exit when: all tasks done, tests pass, or max iterations reached

---

## When to Use Ralph Mode

**Good candidates:**

| Scenario | Why It Works |
|----------|--------------|
| Well-defined tasks | Clear success criteria (tests) |
| Greenfield features | No existing code conflicts |
| Overnight execution | Walk away, review in morning |
| Test-driven development | Tests provide automatic verification |
| Repetitive scaffolding | Create similar components |

**Avoid for:**

| Scenario | Why It Struggles |
|----------|------------------|
| Design decisions | No human judgment |
| Complex refactoring | Unclear boundaries |
| Production debugging | Needs investigation |
| Subjective success criteria | Can't verify "done" |

---

## Running Ralph

### Basic Usage

```bash
# Start Ralph with safety limit
/speckit-implement --ralph --max-iterations 50
```

### Via Ralph Wiggum Plugin

```bash
/ralph-wiggum:ralph-loop     # Start autonomous loop
/ralph-wiggum:cancel-ralph   # Stop if needed
/ralph-wiggum:help           # Explain the technique
```

### Key Options

| Option | Description |
|--------|-------------|
| `--max-iterations <n>` | Safety limit (always set this!) |
| `--completion-promise <text>` | Text that signals completion |
| `--resume` | Continue from interrupted session |

---

## Progress Tracking

Ralph maintains state in `FEATURE_DIR/context/RALPH_STATE.md`:

```markdown
# Ralph Execution State

## Current Status
- **Iteration**: 12 of 50
- **Current Task**: T015 - Create UserController
- **Tasks Completed**: 14 of 32
- **Tests Passing**: 47 of 47
- **Last Updated**: 2026-01-31 10:45:23

## Iteration Log
| # | Task | Result | Duration |
|---|------|--------|----------|
| 1 | T001 | ✓ | 45s |
| 2 | T002 | ✓ | 1m 12s |
| 3 | T003 | ✗ → ✓ | 2m 30s |
| ... |

## Blocked Tasks (if any)
- T008: Failed 3x - needs database migration fix
```

---

## Exit Conditions

Ralph exits and outputs a promise when:

| Condition | Promise Output |
|-----------|----------------|
| All tasks marked `[X]` | `<promise>IMPLEMENTATION_COMPLETE</promise>` |
| Max iterations reached | `<promise>MAX_ITERATIONS_REACHED</promise>` |
| Same task fails 3x | `<promise>BLOCKED_NEED_HELP</promise>` |

---

## Self-Correction Loop

Ralph's power comes from the test-driven feedback loop:

```
1. Read tasks.md → find first [ ] task
2. Load technical-plan.md → get architecture context
3. Implement task → follow existing patterns
4. Run tests → php artisan test --filter=...
   ├─ PASS → mark [X], move to next task
   └─ FAIL → fix and retry (same iteration)
5. Run pint → vendor/bin/pint --dirty
6. Update progress → RALPH_STATE.md
7. Loop to step 1
```

**Critical requirement**: Tests must exist for Ralph to self-correct. Without tests, Ralph has no feedback signal.

---

## Resuming Interrupted Sessions

If Ralph is interrupted (network, timeout, etc.):

```bash
/speckit-implement --ralph --resume
```

This reads `RALPH_STATE.md` and continues from the last task.

---

## Honest Assessment

Ralph Wiggum has gained attention online, but results vary.

**The appeal:**
- Walk away, come back to finished work
- Handles retry logic automatically
- Great for well-defined, test-backed tasks

**The reality:**
- Requires very clear task definitions
- Can burn through context on complex problems
- Not a replacement for thoughtful iteration
- Multiple windows with human oversight often works better

**Our recommendation**: Use Ralph for specific, verifiable tasks where you genuinely can walk away. For most work, Standard Mode with regular review catches issues earlier.

---

## Sources

- [Ralph Wiggum: Autonomous Loops for Claude Code](https://paddo.dev/blog/ralph-wiggum-autonomous-loops/)
- [Official Ralph Wiggum Plugin](https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum)
- [A Brief History of Ralph](https://www.humanlayer.dev/blog/brief-history-of-ralph)
- [Hooks Documentation](/ways-of-working/claude-code-advanced/03-hooks) — How Stop hooks enable autonomous loops

---

## See Also

- [Skills Reference](/ways-of-working/spec-driven-development/09-skills-reference) — All implementation skills
- [Examples](/ways-of-working/spec-driven-development/02-examples) — Real artifacts to study
- [Quality Gates](/ways-of-working/spec-driven-development/10-quality-gates) — Code Gate validates implementation
