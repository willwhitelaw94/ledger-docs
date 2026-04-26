---
title: Claude Code 13 Tips
description: 13 practical tips from Boris Cherny, the creator of Claude Code
---

Boris Cherny is the creator of Claude Code. These are his practical tips from daily usage. He emphasizes that "Claude Code works great out of the box" and there's no single correct usage pattern.

## TL;DR

1. **Run 5 parallel terminal sessions** - 5 git checkouts with numbered tabs
2. **Use Web + Mobile sessions** - 5-10 additional sessions on claude.ai/code
3. **Use Opus 4.5 with Thinking** - Less steering, faster overall
4. **Shared CLAUDE.md** - Update when Claude makes mistakes
5. **Tag @.claude on PRs** - Let Claude learn via GitHub Action
6. **Start in Plan Mode** - Then switch to auto-accept
7. **Slash Commands** - Template frequent workflows
8. **Subagents** - Modular roles, specialization = reliability
9. **PostToolUse Hooks** - Auto-format code
10. **/permissions over Skip** - Safer permission management
11. **MCP for external tools** - Slack, BigQuery, Sentry, etc.
12. **Long-running background sessions** - Set up verification on completion
13. **Give Claude verification** - Feedback loops = 2-3x quality

---

## 1. Run 5 Parallel Terminal Sessions

Boris runs 5 Claude Code instances simultaneously using 5 separate git checkouts of the same repo.

- Numbers terminal tabs 1-5 for easy reference
- Uses system notifications to know when any Claude needs input

![Parallel terminal sessions](/images/ways-of-working/boris-tips/08-claude-code-13-tips/01-parallel-terminals.jpg)

## 2. Use Web + Mobile Sessions

Beyond the terminal, Boris runs 5-10 additional sessions on claude.ai/code.

- Fluidly hands off between local and web using the `&` command or `--teleport` flag
- Kicks off sessions from his phone via the Claude iOS app in the morning, then picks them up on his computer later

![Multi-platform usage](/images/ways-of-working/boris-tips/08-claude-code-13-tips/02-multi-platform.jpg)

## 3. Use Opus 4.5 with Thinking

> "It's the best coding model I've ever used, and even though it's bigger & slower than Sonnet, since you have to steer it less and it's better at tool use, it is almost always faster than using a smaller model in the end."

## 4. Shared CLAUDE.md

Boris's team keeps one shared CLAUDE.md checked into git:

- Everyone updates it multiple times a week
- The rule: when Claude does something wrong, add it so it doesn't repeat

![Shared CLAUDE.md](/images/ways-of-working/boris-tips/08-claude-code-13-tips/04-shared-claude-md.jpg)

## 5. Tag @.claude on PRs

In code reviews, Boris tags `@.claude` on coworkers' pull requests to add learnings to CLAUDE.md, using the Claude Code GitHub Action.

![Code review integration](/images/ways-of-working/boris-tips/08-claude-code-13-tips/05-pr-review.jpg)

## PR Review Focus: Bugs Over Style

When configuring Claude's GitHub PR reviews (via `claude-code-review.yml`), keep the review instructions focused on **bugs and potential vulnerabilities** rather than style nitpicks. Overly broad review prompts lead to verbose, unhelpful comments on minor code patterns. A simple instruction like *"Only report on bugs and potential vulnerabilities you find. Be concise."* produces far more useful reviews.

## 6. Start in Plan Mode

Boris's workflow:

1. Start in Plan Mode
2. Iterate until the plan is good
3. Switch into auto-accept edits mode
4. Claude can execute the entire implementation in one go without needing back-and-forth revisions

![Plan mode workflow](/images/ways-of-working/boris-tips/08-claude-code-13-tips/06-plan-mode.png)

## 7. Use Slash Commands

Boris uses slash commands for workflows he does many times a day:

- Saves repeated prompting
- Claude can use them too
- Commands are checked into git under `.claude/commands/` and shared with the team

![Slash commands](/images/ways-of-working/boris-tips/08-claude-code-13-tips/07-slash-commands.jpg)

## 8. Use Subagents

Boris treats subagents like slash commands:

- Agents are not "one big agent" - they're modular roles
- Reliability comes from specialization plus constraint
- Coding becomes a pipeline of phases: spec → draft → simplify → verify

![Subagents](/images/ways-of-working/boris-tips/08-claude-code-13-tips/08-subagents.png)

## 9. PostToolUse Hooks for Formatting

Boris runs a PostToolUse hook that formats Claude's code:

- Claude is "usually" well-formatted
- The hook fixes the last 10% to avoid CI failures

![PostToolUse hooks](/images/ways-of-working/boris-tips/08-claude-code-13-tips/09-hooks.jpg)

## 10. Use /permissions Instead of Skip

Boris avoids skipping permissions by default:

- Pre-allows the small set of tools he trusts for a repo via `/permissions` and shared settings
- Safer than a blanket skip
- Faster than constant prompts

![Selective permissions](/images/ways-of-working/boris-tips/08-claude-code-13-tips/10-permissions.jpg)

## 11. Connect MCP Tools

Boris connects Claude to tools like Slack, BigQuery, and Sentry using MCP:

- Shares the config in `.mcp.json`
- Turns Claude from a code editor into a workflow hub

![MCP tool integration](/images/ways-of-working/boris-tips/08-claude-code-13-tips/11-mcp-tools.jpg)

## 12. Long-Running Background Sessions

For tasks that take a while:

- Sets Claude up to verify the work when it finishes
- Uses background agents, Stop hooks, or plugins (like ralph-wiggum)
- Runs with relaxed permission modes in a sandbox so the session can run without blocking on prompts

![Long-running tasks](/images/ways-of-working/boris-tips/08-claude-code-13-tips/12-background-sessions.jpg)

## 13. Give Claude a Way to Verify Its Work

> "This is probably the most important thing to get great results out of Claude Code — give Claude a way to verify its work. If Claude has that feedback loop, it will 2-3x the quality of the final result."

Verification methods include:

- Browser automation testing
- Running test suites
- Using simulators

---

## Boris's Results

In just 30 days:

- **259 PRs**
- **497 commits**
- **40k lines added**
- **38k lines removed**

---

## 12 Customization Tips from Claude Code's Creator Boris Cherny

### 1. Configure Your Terminal

\- **Theme**: Run `/config` to set light/dark mode

\- **Notifications**: Enable notifications for iTerm2, or use a custom notifs hook

\- **Newlines**: If you use Claude Code in an IDE terminal, Apple Terminal, Warp, or Alacritty, run `/terminal-setup` to enable `Shift+Enter` for newlines (so you don't need to type `\`)

\- **Vim mode**: Run `/vim`

---

## Sources

- [Original Twitter Thread](https://twitter-thread.com/t/2007179832300581177)
- [How Boris Uses Claude Code](https://howborisusesclaudecode.com/)
- [Inside Claude Code: 13 Expert Techniques (Medium)](https://medium.com/@tentenco/inside-claude-code-13-expert-techniques-from-its-creator-boris-cherny-d03695fa85b1)
