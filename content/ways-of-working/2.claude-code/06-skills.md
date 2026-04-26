---
title: Skills
description: What skills are, why we use them, and a complete catalogue of TC WoW skills
---

Skills are Claude Code's superpower for repeatable, specialized workflows. This guide explains what they are, why we chose them, and catalogues every skill available in TC WoW.

---

## What Are Skills?

Skills are markdown files that inject specialized knowledge, workflows, and behavior into Claude Code. Think of them as **expert consultants** Claude can call on when needed.

```text
.claude/skills/
├── trilogy-docs-build/SKILL.md
├── speckit-plan/SKILL.md
└── pest-testing/SKILL.md
```

Each skill contains:
- **Frontmatter** with name, description, and trigger keywords
- **Instructions** Claude follows when the skill activates
- **Templates** and reference materials (optional)

### Example Skill Structure

```markdown
---
name: trilogy-docs-build
description: Build and preview documentation. Use when user wants
  to preview docs, view docs, or start documentation server.
---

# Trilogy Docs Build

## When to Use
- User asks to preview documentation
- User wants to see the docs site
- User mentions "docs" and "preview" or "build"

## Execution Steps
1. Run `npm run docs:build`
2. Run `npm run docs:preview`
3. Open browser to localhost:3000
...
```

---

## Why Skills Over Slash Commands?

We exclusively use **Skills** instead of slash commands (`.claude/commands/*.md`). Here's why:

| Aspect | Slash Commands | Skills |
|--------|----------------|--------|
| **Invocation** | User types `/command` | User types `/skill` OR Claude auto-invokes |
| **Automation** | Manual only | Can be triggered automatically |
| **Structure** | Single markdown file | Folder with SKILL.md + supporting files |
| **Metadata** | None | YAML frontmatter (name, description, triggers) |
| **Discovery** | Hidden until you know them | Claude sees descriptions and suggests them |
| **Composability** | Standalone | Can reference other skills, templates, prompts |

**The key advantage**: Skills can be invoked by Claude automatically when the task matches the skill description. Slash commands require the user to know they exist.

**Example**: When you say "I need to plan my implementation", Claude automatically invokes `speckit-plan`. With slash commands, you'd need to know `/speckit.plan` exists.

---

## How Skills Get Activated

Skills activate in two ways:

### 1. Explicit Invocation
Type the skill name as a command:
```text
/trilogy-docs-build
/pest-testing
/trilogy-clarify business
```

### 2. Automatic Detection
Claude reads skill descriptions and activates them when your request matches:

```text
You: "Can you help me write some tests for the PaymentService?"
Claude: [Automatically activates pest-testing skill]
```

The frontmatter `description` field contains trigger keywords:
```yaml
description: Test applications using Pest 3 PHP framework.
  Activates when writing tests, creating unit or feature tests,
  debugging test failures, working with datasets or mocking.
```

---

## Skills vs MCPs vs Agents

| Extension | What It Does | Context Cost |
|-----------|--------------|--------------|
| **Skills** | Inject prompts/instructions | Low |
| **MCPs** | Connect external tools | High (8-30%) |
| **Agents** | Run parallel tasks | Separate context |

Skills are lightweight—they don't consume context just by existing. They only load when needed.

See [Extending Claude](/ways-of-working/claude-code-advanced/01-extending-claude) for the full comparison.

---

## TC WoW Skills Catalogue

All skills organized by workflow area. Total: **48 skills**.

---

### Boost Skills (Laravel Ecosystem)

Development ecosystem integration for Laravel, PHP testing, Vue, and styling. These activate contextually during coding.

| Skill | Purpose | Triggers |
|-------|---------|----------|
| `pennant-development` | Feature flags with Laravel Pennant | feature flags, toggles, A/B testing, @feature directive |
| `pest-testing` | Testing with Pest 3 PHP framework | write tests, unit tests, feature tests, TDD, assertions |
| `inertia-vue-development` | Inertia.js v2 Vue client apps | Vue pages, forms, useForm, Link, deferred props |
| `tailwindcss-development` | Styling with Tailwind CSS v3 | CSS, styling, responsive, dark mode, layout |

---

### SpecKit Skills (Specification Workflow)

The core specification-driven development workflow: specify → plan → implement.

| Skill | Purpose | Output |
|-------|---------|--------|
| `speckit-specify` | Generate technical specifications | `spec.md` |
| `speckit-checklist` | Requirements quality validation | Quality checklist |
| `speckit-analyze` | Find inconsistencies across artifacts | Analysis report |
| `speckit-plan` | Create technical implementation plans | `plan.md` |
| `speckit-tasks` | Generate implementation tasks | `tasks.md` |
| `speckit-erd` | Generate entity-relationship diagrams | ERD (ASCII/Mermaid) |
| `speckit-implement` | Execute implementation from tasks | Working code |
| `speckit-constitution` | Update project constitution | `constitution.md` |

---

### Discovery & Research

Understanding problems before building solutions.

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `trilogy-learn` | Interactive context loading | Starting work on unfamiliar domain |
| `trilogy-research` | Multi-source research agent | Building context from Fireflies, Teams, Linear, web |
| `trilogy-teams-chat` | Fetch Teams chat by URL | Extracting decisions from chat links |
| `teams-chat-summarizer` | Structured Teams analysis | Documenting team discussions |
| `trilogy-brp` | Big Room Planning preparation | Quarterly planning sessions |

---

### Ideation & Problem Definition

Capturing and refining ideas with design thinking.

| Skill | Purpose | Output |
|-------|---------|--------|
| `trilogy-idea` | Create idea briefs for epics | `IDEA-BRIEF.md` |
| `trilogy-idea-spawn` | Generate interactive ideas board from idea brief + meeting transcript for team voting | `ideas-board.html` |
| `hod-problem-statement` | Clear, solution-agnostic problems | Problem statement |
| `hod-hmw` | "How Might We" prompts | Creative opportunity framing |
| `hod-humanise` | Transform PRDs to plain language | Designer-friendly docs |
| `trilogy-raci` | RACI matrices for team roles | Responsibility matrix |

---

### Design & Visualization

Making requirements visual and understandable.

| Skill | Purpose | Output |
|-------|---------|--------|
| `trilogy-design` | Comprehensive UX/UI documentation | `design.md` |
| `trilogy-mockup` | ASCII UI mockup variations | 5-10 mockup options |
| `trilogy-flow` | User flow diagrams | Flow diagram (ASCII/Mermaid) |
| `trilogy-image` | Hero images and storyboards | Visual assets with AI prompts |

---

### Clarification (Multi-Lens Review)

Run specs through different stakeholder perspectives.

```bash
/trilogy-clarify spec        # Functional requirements
/trilogy-clarify business    # Outcomes, ROI, stakeholders
/trilogy-clarify development # Architecture, constraints
/trilogy-clarify db          # Schema, relationships
/trilogy-clarify all         # Run all lenses
```

| Lens | Perspective | Focus |
|------|-------------|-------|
| `spec` | Requirements Analyst | Edge cases, data model, acceptance criteria |
| `business` | PM/Stakeholder | Success metrics, ROI, stakeholder alignment |
| `development` | Engineer/Architect | Technical constraints, implementation approach |
| `db` | Data Architect | Schema design, migrations, relationships |

---

### Estimation & Planning

Breaking down work and estimating effort.

| Skill | Purpose | Output |
|-------|---------|--------|
| `trilogy-estimate` | Multi-level effort estimation | T-shirt (idea), days (story), points (task) |
| `trilogy-linear-sync` | Sync specs to Linear | Linear issues with estimates |

```bash
/trilogy-estimate           # Auto-detect level
/trilogy-estimate idea      # T-shirt sizing (S/M/L)
/trilogy-estimate stories   # Days per story
/trilogy-estimate tasks     # Points per task
```

---

### Code Quality & Review

Preparing code for merge.

| Skill | Purpose | Gate |
|-------|---------|------|
| `trilogy-dev-handover` | Run dev checks, create PR | Code Gate (4) |
| `laravel-simplifier` | Simplify PHP/Laravel code | — |

---

### QA & Verification

Testing and validating implementations.

| Skill | Purpose | Gate |
|-------|---------|------|
| `trilogy-qa` | Generate QA test reports | — |
| `trilogy-qa-handover` | Run Gate 5, transition QA → Review | QA Gate (5) |
| `trilogy-verify` | Browser-based verification | — |
| `playwright-browser` | Browser automation & testing | — |

---

### Release & Deployment

Getting code to production.

| Skill | Purpose | Gate |
|-------|---------|------|
| `trilogy-release` | Full release workflow | Release Gate (6) |
| `trilogy-ship` | Ship to production | — |
| `duck-ship` | Code-first Jira workflow | — |

---

### Documentation

Creating and maintaining knowledge.

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `trilogy-docs-build` | Build and preview docs site | Reviewing documentation |
| `trilogy-docs-write` | Know where to save documents | Adding new docs |
| `trilogy-docs-feature` | Enrich feature docs from codebase | Technical documentation |

---

### Setup & Configuration

Project maintenance and configuration.

| Skill | Purpose |
|-------|---------|
| `trilogy-submodules` | Initialize/update git submodules |
| `trilogy-setup-mcp` | Configure MCP servers |
| `trilogy-train` | Analyze workflow effectiveness |

---

## Skill Naming Conventions

| Prefix | Purpose |
|--------|---------|
| `speckit-*` | Specification-driven workflow (specify → plan → implement) |
| `trilogy-*` | TC Portal-specific tools and integrations |
| `hod-*` | Human-centered design thinking |
| `*-development` | Contextual development skills activated during coding |

---

## Creating Your Own Skills

1. **Create the folder**: `.claude/skills/my-skill/`
2. **Add SKILL.md** with frontmatter:

```markdown
---
name: my-skill
description: What it does. Triggers on: keyword1, keyword2, keyword3.
---

# My Skill

## Purpose
What problem this skill solves.

## When to Use
- Trigger condition 1
- Trigger condition 2

## Execution Steps
1. Step one
2. Step two
3. Step three

## Output
What the skill produces.
```

3. **Add supporting files** (optional):
   - `references/` - Reference documentation
   - `templates/` - Output templates
   - `examples/` - Example outputs

---

## Case Study: Video Screenshot Extraction

::alert{type="info"}
**Coming Soon**: Piot's Loom video skill demonstration
::

### The Problem

When documenting features or creating training materials, we often have Loom videos that need to be converted into step-by-step documentation with screenshots. Manually scrubbing through videos and taking screenshots is tedious.

### The Solution

A custom skill that:
1. Downloads video from Loom URL
2. Extracts key frames at meaningful moments
3. Pairs screenshots with transcript segments
4. Generates multimodal documentation

### How It Works

```text
[LOOM VIDEO WALKTHROUGH TO BE ADDED]

Piot will demonstrate:
- Setting up the skill structure
- Integrating with video processing tools
- Pairing visual frames with transcript
- Generating the final documentation
```

### Key Learnings

- **Multimodal context**: Combining visual and text creates richer documentation
- **Automation value**: What took 30 minutes now takes 30 seconds
- **Skill composition**: The skill chains multiple tools together

---

## Quick Reference

### Most Used Skills

| Task | Skill |
|------|-------|
| Write tests | `/pest-testing` |
| Style components | `/tailwindcss-development` |
| Create spec | `/speckit-specify` |
| Plan implementation | `/speckit-plan` |
| Generate tasks | `/speckit-tasks` |
| Review from different angles | `/trilogy-clarify all` |
| Create PR | `/trilogy-dev-handover` |
| Ship release | `/trilogy-release` then `/trilogy-ship` |

### Workflow Shortcuts

```bash
# Full spec workflow
/trilogy-idea → /trilogy-idea-spawn → /speckit-specify → /trilogy-clarify all → /trilogy-design

# Implementation workflow
/speckit-plan → /speckit-tasks → /speckit-implement

# Release workflow
/trilogy-dev-handover → /trilogy-qa → /trilogy-release → /trilogy-ship
```

---

## See Also

- [Extending Claude](/ways-of-working/claude-code-advanced/01-extending-claude) - Skills vs MCPs vs Agents
- [Skills Reference](/ways-of-working/spec-driven-development/09-skills-reference) - Quick lookup table
- [Spec-Driven Development](/ways-of-working/spec-driven-development/00-spec-driven-development) - The full workflow
