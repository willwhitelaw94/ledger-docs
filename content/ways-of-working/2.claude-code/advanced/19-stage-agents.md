---
title: Stage Agents
description: Autonomous agents that orchestrate each phase of the development lifecycle, chaining skills and validating gates
---

Stage agents are autonomous orchestrators — each one owns a phase of the development lifecycle, chains the right skills together, and validates its gates before handing off to the next stage.

---

## What Are Agents?

Agents are specialised Claude Code assistants that run in their **own isolated context window**. Unlike skills (which inject instructions into your current conversation), an agent gets its own system prompt, its own tool access, and its own MCP server connections.

Think of it like delegating to a colleague: you hand them a brief, they go away, do the work with their own tools, and come back with results. Your main conversation doesn't get cluttered with their working context.

### What Makes an Agent Different From a Skill?

| | Skill | Agent |
|---|---|---|
| **Where it runs** | In your main conversation | Its own isolated context window |
| **Context cost** | Low — injects instructions, no extra overhead | Separate — doesn't consume your main context |
| **What it knows** | Whatever is in your current conversation + skill instructions | Only what's in its AGENT.md system prompt + injected skills |
| **How it's triggered** | You type `/skill-name` or Claude auto-detects | Claude delegates based on the agent's `description` field |
| **Persistence** | Gone when conversation ends | Can have its own `memory` that persists across sessions |
| **Tool access** | Uses your conversation's tools | Has its own configured `tools`, `mcpServers`, `permissionMode` |

### When to Use an Agent vs a Skill

- **Use a skill** when you need Claude to follow specific instructions within your current conversation (e.g. `/pest-testing` while writing code)
- **Use an agent** when you want to delegate an entire phase of work (e.g. "run the QA agent" to handle the full testing cycle autonomously)

Most of the time, you'll use skills directly. Agents are for when you want to hand off a whole stage and let it run.

---

## Skills vs Agents — The Architecture

**Skills are atoms. Agents are molecules.**

| Concept | What It Is | Example |
|---------|-----------|---------|
| **Skill** | A single-purpose command that injects knowledge and guides behaviour | `/trilogy-idea`, `/pest-testing` |
| **Stage Agent** | A thin orchestrator that chains skills, validates gates, and hands off | `planning-agent`, `dev-agent` |
| **Agent Team** | Parallel workers within a stage that coordinate via shared task lists | `frontend-agent` + `backend-agent` + `testing-agent` |

Each agent has **skills preloaded** — the full content of those skills is injected into the agent's system prompt at startup. This means the planning-agent doesn't just know "run `/trilogy-idea`" — it has the complete skill instructions available and knows exactly how to execute each step.

### Agent Configuration (AGENT.md)

Every agent is defined by a markdown file with YAML frontmatter:

```yaml
---
name: qa-agent
description: >
  Autonomous QA stage orchestrator. Chains QA planning, browser testing,
  fix-and-retest, and QA handover. Validates Gate 5.
tools: Read, Write, Edit, Bash, Glob, Grep
model: inherit
memory: project
skills:
  - trilogy-qa
  - trilogy-qa-test-agent
  - trilogy-qa-handover
  - pest-testing
mcpServers:
  - chrome-devtools
  - laravel-boost
  - linear
permissionMode: acceptEdits
color: green
---

# QA Stage Agent

[System prompt with workflow, gotchas, completion criteria...]
```

| Field | What It Does |
|-------|-------------|
| `skills` | Full skill content injected at startup — the agent has all instructions available |
| `tools` | Which Claude tools the agent can use (Read, Write, Bash, etc.) |
| `mcpServers` | External connections (Linear, Chrome DevTools, Laravel Boost, etc.) |
| `model` | Which Claude model (`inherit` = same as parent, or `haiku`/`sonnet`/`opus`) |
| `memory` | Persistent memory across sessions (`project` = project-level) |
| `permissionMode` | How permissions are handled (`acceptEdits` = auto-accept file changes) |

---

## The Pipeline

Each stage agent runs sequentially — you can't design before spec, can't dev before design. But **within** a stage, agents can run in parallel (the dev stage does this).

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Planning │───▸│  Design  │───▸│   Dev    │───▸│    QA    │───▸│ Release  │
│  Agent   │    │  Agent   │    │  Agent   │    │  Agent   │    │  Agent   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
  Gate 0+1        Gate 2        Gate 3+4         Gate 5          Gate 6

  idea-brief.md   design.md     plan.md         test-report.md   release-notes
  spec.md         mockups/      tasks.md        screenshots/
  business.md                   code + tests

                    ┌──────────────────┐
                    │  Research Agent   │  ← cross-cutting, any stage can use
                    └──────────────────┘
```

State is shared between stages through **file artifacts** on disk — not context passing or databases.

---

## Agent Inventory

### Stage Agents (Sequential Pipeline)

| Agent | Stage | Gates | Skills Chained | MCPs |
|-------|-------|-------|---------------|------|
| `planning-agent` | Ideation + Spec | Gate 0, Gate 1 | `trilogy-idea`, `trilogy-idea-handover`, `speckit-specify`, `trilogy-clarify`, `trilogy-spec-handover` + 6 more | Linear, Laravel Boost |
| `design-agent` | Design | Gate 2 | `trilogy-design`, `trilogy-design-research`, `trilogy-mockup`, `trilogy-design-handover` + more | Figma, Linear |
| `dev-agent` | Implementation | Gate 3, Gate 4 | `speckit-plan`, `speckit-tasks`, `speckit-implement`, `trilogy-dev-handover` + 10 more | Laravel Boost, Linear, Chrome DevTools |
| `qa-agent` | QA | Gate 5 | `trilogy-qa`, `trilogy-qa-test-agent`, `trilogy-qa-test-codify`, `trilogy-qa-handover` | Chrome DevTools, Laravel Boost, Linear |
| `release-agent` | Release | Gate 6 | `trilogy-release`, `trilogy-ship`, `trilogy-release-notes` | Linear |

### Dev Team Agents (Parallel within Dev Stage)

The dev-agent is a **team lead** that spawns teammates for parallel implementation:

| Agent | Responsibility | File Ownership |
|-------|---------------|---------------|
| `backend-agent` | Laravel controllers, models, actions, data classes, routes, migrations | `domain/`, `app/`, `database/` |
| `frontend-agent` | Vue pages, components, composables, styling | `resources/js/` |
| `testing-agent` | Pest tests, browser verification — tests continuously as features land | `tests/` |

### Cross-Cutting Agent

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| `research-agent` | Gathers context from Fireflies, Teams, Linear, web, codebase, TC Docs | Before any stage, when exploring a new domain, or when context is needed |

---

## State Handoff Between Stages

Agents share state through file artifacts:

| Artifact | Created By | Consumed By |
|----------|-----------|-------------|
| `idea-brief.md` | Planning | Design, Dev |
| `spec.md` | Planning | Design, Dev, QA |
| `business.md` | Planning | Design, Release |
| `design.md` | Design | Dev |
| `mockups/` | Design | Dev, QA |
| `plan.md` | Dev | Dev (implementation) |
| `tasks.md` | Dev | Dev (teammates) |
| `test-report.md` | QA | Release |
| `meta.yaml` | All stages | All stages (source of truth) |

---

## Dev Agent Team (Parallel Implementation)

The dev stage is unique — it uses **Agent Teams** to parallelize work:

```
Dev Agent (team lead)
│
├── Phase 1: Planning (solo)
│   └── /speckit-plan → plan.md → /speckit-tasks → tasks.md
│
├── Phase 2: Implementation (team)
│   ├── backend-agent  → domain/, app/, database/
│   ├── frontend-agent → resources/js/
│   └── testing-agent  → tests/ (tests continuously)
│
├── Phase 3: Quality (solo)
│   └── Gate 4 validation → /trilogy-dev-handover
│
└── Handoff → QA Agent
```

**Coordination patterns:**
- **Prop Contract**: Backend creates route + controller with props → frontend builds Vue page consuming those props
- **Continuous Testing**: Testing agent tests each feature as it lands, doesn't wait for everything to finish
- **File Boundaries**: No overlap — each teammate owns specific directories

---

## Research Agent (Cross-Cutting)

The research agent isn't part of the sequential pipeline. Any stage (or the user) can use it when context is needed:

- **Before Planning** — "What do stakeholders think about this problem?"
- **Before Design** — "How do competitors handle this?"
- **During Dev** — "What existing code relates to this?"
- **During QA** — "What edge cases were discussed in meetings?"

Sources: Fireflies, Linear, Web Search, Codebase, TC Docs, Confluence.

---

## Where Agents Live

Agents are defined in `.tc-wow/claude/agents/` (shared across projects) and symlinked into `.claude/agents/` (where Claude reads them).

```
.tc-wow/claude/agents/          ← source of truth (synced via submodule)
├── planning-agent.md
├── design-agent.md
├── dev-agent.md
├── frontend-agent.md
├── backend-agent.md
├── testing-agent.md
├── qa-agent.md
├── release-agent.md
└── research-agent.md

.claude/agents/                 ← symlinks (what Claude uses)
├── planning-agent.md → ../../.tc-wow/claude/agents/planning-agent.md
├── design-agent.md   → ../../.tc-wow/claude/agents/design-agent.md
└── ...
```

### Syncing Agents

Run `/tc-wow` to update the submodule and automatically symlink agents:

```bash
/tc-wow
```

This updates the `.tc-wow` submodule and creates symlinks from `.claude/agents/` → `.tc-wow/claude/agents/` so Claude can use them.

If you prefer to do it manually:

```bash
git submodule update --remote .tc-wow

mkdir -p .claude/agents
cd .claude/agents
for f in ../../.tc-wow/claude/agents/*.md; do
  ln -sf "$f" "$(basename $f)"
done
```

---

## Key Constraints

1. **No nested subagents** — subagents cannot spawn other subagents. Only team leads spawn teammates.
2. **Sequential stages** — can't design before spec, can't dev before design.
3. **Parallel within stages** — frontend/backend/testing CAN run in parallel within the dev stage.
4. **File-based state** — all inter-stage communication happens through files on disk.
5. **Gates are checkpoints** — every stage validates against its gate checklist before handing off.

---

## See Also

- [Custom Agents](/ways-of-working/claude-code-advanced/12-custom-agents) — How to create your own agents
- [Skills Reference](/ways-of-working/spec-driven-development/09-skills-reference) — Complete skill catalogue
- [Quality Gates](/ways-of-working/spec-driven-development/10-quality-gates) — Gate details and checklists
- [Workflow Map](/ways-of-working/spec-driven-development/01-workflow-map) — The full journey from idea to production
