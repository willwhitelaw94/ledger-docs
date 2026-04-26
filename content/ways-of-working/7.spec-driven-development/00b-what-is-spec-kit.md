---
title: "What is Spec Kit?"
description: "Fishing with dynamite — AI-powered development skills that generate features at terrifying speed"
---

Spec Kit is dynamite.

AI coding agents can generate entire features — models, migrations, controllers, Vue pages, tests — in minutes. That's fishing with dynamite. You throw it in and everything surfaces.

The problem? Dynamite doesn't discriminate. Without structure, AI will confidently build the wrong thing, hallucinate requirements, and ship broken code — all at speed. That's blowing up the boat.

**Spec Kit is the dynamite.** [Spec-Driven Development](/ways-of-working/spec-driven-development/00-spec-driven-development) is what stops you blowing up the boat.

Together: you get the catch without sinking.

---

## The Landscape of AI Coding Tools

Before diving into Spec Kit, it helps to understand what else exists in this space.

### Prompt Engineering Patterns

Different AI coding tools have developed their own approaches to extending AI capabilities:

| Tool | Extension Method | How It Works |
|------|------------------|--------------|
| **Cursor** | `.cursorrules` | Project-level rules file that shapes how Cursor's AI behaves |
| **Aider** | `.aider.conf.yml` | Configuration file with conventions, plus chat commands |
| **GitHub Copilot** | `.github/copilot-instructions.md` | Repository instructions for Copilot |
| **Claude Code** | `.claude/` directory | Skills, commands, MCPs, agents, and settings |

Each tool solves the same problem: **how do you give AI context about your project and workflows?**

### The Pattern: Structured Prompts

What these tools share is the pattern of **structured prompts**. Rather than explaining everything in each conversation, you encode your patterns, conventions, and workflows into files that the AI reads automatically.

Cursor calls them "rules". Aider calls them "conventions". We call them **skills**.

### Beyond Configuration: Agent Frameworks

Some tools go further than configuration files—they provide entire frameworks for AI agent workflows:

| Tool | Creator | What It Does |
|------|---------|--------------|
| **[Beads](https://github.com/steveyegge/beads)** | Steve Yegge | A git-backed graph issue tracker for AI agents. Provides persistent memory so agents can handle long-horizon tasks without losing context. Issues stored as JSONL in `.beads/` folder with dependency tracking. |
| **[Goose](https://github.com/block/goose)** | Block (Square) | An open source AI agent that goes beyond suggestions—it executes commands, edits files, runs tests, and handles tasks autonomously. Uses MCP for tool integration. |
| **[GitHub Spec Kit](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/)** | GitHub | An open source toolkit for spec-driven development that works with Copilot, Claude Code, and Gemini CLI. The spec becomes the contract AI uses to generate, test, and validate code. |

**Beads** is particularly interesting—Steve Yegge calls it "a cognitive upgrade for your coding agents." Instead of implicit dependencies in natural language specs, Beads stores explicit dependencies as graph edges. Agents can query for "ready" (unblocked) work and compact old issues automatically.

**Goose** operates like an "automated junior engineer in your terminal." It doesn't just generate text—it executes until the job is done.

Our Spec Kit takes a different approach: **workflow structure over agent autonomy**. We guide AI through defined phases with human checkpoints, rather than letting it run freely.

---

## What Makes Claude Code Different

Claude Code's extension system is more powerful than most:

```text
.claude/
├── skills/         # Reusable workflows and knowledge
├── agents/         # Custom specialized assistants
├── settings.json   # Permissions and configuration
└── CLAUDE.md       # Project-level instructions
```

The key differentiator: **skills can be auto-invoked**.

When you say "I need to plan this feature", Claude can automatically recognize that the `speckit-plan` skill is relevant and use it. With other tools, you need to know the command exists.

---

## Why We Built Spec Kit

We didn't want to start from scratch. We wanted to build **on top of** Claude Code's capabilities, adding:

1. **Structure** — A defined workflow from idea to production
2. **Quality gates** — Human checkpoints that catch problems early
3. **Artifacts** — Consistent output documents that become the source of truth
4. **Skills** — Reusable prompts for each phase of development

### The Problem Spec Kit Solves

AI coding tools are powerful but undirected. Without structure:

- AI makes assumptions that compound into wrong implementations
- There's no checkpoint until code is already written
- Documentation is an afterthought (if it happens at all)
- Each developer creates their own ad-hoc workflow

Spec Kit provides the rails that keep AI on track.

---

## Commands vs Skills: Why We Moved

Early versions of Spec Kit used slash commands:

```bash
/speckit.plan
/speckit.implement
/speckit.tasks
```

We moved entirely to **skills** because:

| Aspect | Commands | Skills |
|--------|----------|--------|
| **Discovery** | Hidden until you know them | Claude sees descriptions and can suggest them |
| **Invocation** | User must type `/command` | User types `/skill` OR Claude auto-invokes |
| **Flexibility** | Single markdown file | Folder with templates, examples, supporting files |

**The insight**: You can still slash-command a skill (`/speckit-plan`), but Claude can *also* invoke it automatically when the task matches. Best of both worlds.

```bash
# These both work:
/speckit-plan                    # Explicit invocation
"Help me plan this feature"      # Claude recognizes and invokes speckit-plan
```

Our decision: all workflow automation lives in `.claude/skills/`. Commands were just thin wrappers.

---

## Dynamite and Boats

Spec Kit gives you power. SDD gives you control.

| | Spec Kit (Dynamite) | SDD (Not Blowing Up the Boat) |
|---|---|---|
| **What** | Skills that unleash AI's raw capability | Gates that channel it safely |
| **How** | `/speckit-implement`, `/trilogy-mockup`, `/speckit-plan` | `/trilogy-idea-handover`, `/trilogy-dev-handover`, `/trilogy-qa` |
| **Without the other** | Fast, wrong, and expensive to fix | Slow, correct, and nobody ships |

You need both. The dynamite catches fish. The discipline keeps the boat afloat.

### Human-in-the-Loop

Every phase has a human checkpoint. AI proposes; humans approve. This catches problems when they're cheap to fix — before code is written.

### Artifacts Over Conversations

Conversations disappear. Documents persist.

Each phase produces a concrete artifact:

| Phase | Artifact |
|-------|----------|
| Ideation | `idea-brief.md` |
| Specification | `spec.md` |
| Design | `design.md`, `mockups/` |
| Planning | `plan.md`, `tasks.md` |
| QA | `test-report.md` |
| Release | `release-notes.md` |

These artifacts become the source of truth—for AI, for humans, for future reference.

---

## The Spec Kit Toolkit

| Skill | Phase | What It Does |
|-------|-------|--------------|
| `trilogy-idea` | Ideation | Capture the problem, not the solution |
| `trilogy-idea-handover` | Gate 0 | Validate idea brief, create Linear epic in Backlog |
| `speckit-specify` | Specification | Generate publication-ready feature specs |
| `trilogy-clarify` | Specification | Run specs through different stakeholder lenses |
| `trilogy-spec-handover` | Gate 1 | Validate spec, transition Linear Backlog → Start |
| `trilogy-design` | Design | Create comprehensive design documentation |
| `trilogy-mockup` | Design | Generate ASCII/HTML UI mockup variations |
| `trilogy-design-handover` | Gate 2 | Validate design, transition Linear Start → Dev |
| `speckit-plan` | Planning (Gate 3) | Create technical implementation plans |
| `speckit-tasks` | Planning | Generate implementation tasks from plans |
| `speckit-implement` | Implementation | Let AI build from the specification |
| `trilogy-dev-handover` | Gate 4 | Run code quality checks, create PR, Linear Dev → QA |
| `trilogy-qa` | Gate 5 | Run QA verification, Linear QA → Review |
| `trilogy-release` | Gate 6 | Full release workflow, Linear Review → Completed |

See the [Skills Reference](/ways-of-working/spec-driven-development/09-skills-reference) for the complete catalogue.

---

## Getting Started

1. **Read the philosophy** — [Spec-Driven Development](/ways-of-working/spec-driven-development/00-spec-driven-development) explains the "why"
2. **See the workflow** — [Workflow Map](/ways-of-working/spec-driven-development/01-workflow-map) shows how skills connect
3. **Try it small** — Pick a minor feature and run through `/trilogy-idea` → `/speckit-specify` → `/speckit-plan`
4. **Check examples** — [Real Examples](/ways-of-working/spec-driven-development/02-examples) shows actual artifacts

The learning curve is small. The payoff is large.

---

## Quick Links

- [Spec-Driven Development](/ways-of-working/spec-driven-development/00-spec-driven-development) — The core philosophy
- [Workflow Map](/ways-of-working/spec-driven-development/01-workflow-map) — Visual reference
- [Skills Reference](/ways-of-working/spec-driven-development/09-skills-reference) — Complete skill catalogue
- [Extending Claude](/ways-of-working/claude-code-advanced/01-extending-claude) — Skills, MCPs, and agents explained

---

Spec Kit isn't a replacement for thinking. It's a structure that makes AI-assisted thinking more effective.
