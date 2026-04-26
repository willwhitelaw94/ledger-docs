---
title: Skills Reference
description: Complete catalogue of Claude Code skills organized by workflow phase
---

A comprehensive reference of all available skills, organized by when you'd use them in the development workflow.

---

## Quick Reference

| Phase | Primary Skills | Gate After |
|-------|----------------|------------|
| **Research** | `trilogy-research`, `trilogy-learn`, `trilogy-teams-chat` | - |
| **Ideation** | `trilogy-idea`, `trilogy-idea-spawn`, `hod-problem-statement`, `hod-hmw`, `hod-humanise`, `trilogy-raci` | - |
| **Specification** | `speckit-specify`, `trilogy-clarify`, `speckit-checklist` | Business |
| **Design** | `trilogy-design`, `trilogy-mockup`, `trilogy-image`, `trilogy-flow` | Design |
| **Planning** | `speckit-plan`, `speckit-tasks`, `speckit-analyze` | Technical |
| **Implementation** | `speckit-implement`, `pest-testing`, `inertia-vue-development`, `tailwindcss-development` | - |
| **Code Review** | `trilogy-dev-handover`, `laravel-simplifier` | Code |
| **QA** | `trilogy-qa`, `trilogy-qa-test-agent`, `trilogy-qa-test-codify`, `trilogy-qa-handover` | QA |
| **Release** | `trilogy-release`, `trilogy-ship` | Release |
| **Documentation** | `trilogy-docs-build`, `trilogy-docs-write`, `trilogy-docs-feature` | - |

---

## Research & Context Gathering

Skills for building understanding before you start.

| Skill                   | What It Does                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `trilogy-research`      | Spawn parallel agents to gather context from Jira, Teams, Fireflies, Confluence, and codebase          |
| `trilogy-learn`         | Interactive context loading - ask what you want to learn from (Features, Code, Teams, JIRA, Fireflies) |
| `trilogy-teams-chat`    | Fetch and analyze Teams chat by URL - extracts decisions, action items, discussions                    |
| `teams-chat-summarizer` | Structured analysis of Teams chat history to extract key decisions and progress updates                |
| `trilogy-brp`           | Plan and prepare Big Room Planning sessions with context from last BRP and roadmap                     |

---

## Ideation

Skills for capturing and refining ideas.

| Skill                   | What It Does                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `trilogy-idea`          | Create publication-ready idea briefs for new features or epics                                                |
| `trilogy-idea-spawn`    | Generate an interactive ideas board from an idea brief and meeting transcript — team votes and prioritizes live |
| `hod-problem-statement` | Transform messy context into clear, solution-agnostic problem statements                                      |
| `hod-hmw`               | Generate "How Might We" prompts that reframe problems as creative opportunities                               |
| `hod-humanise`          | Transform technical PRDs into designer-friendly documentation using plain language                             |

---

## Specification

Skills for detailing what to build.

### Core Specification

| Skill               | What It Does                                                                       |
| ------------------- | ---------------------------------------------------------------------------------- |
| `speckit-specify`   | Generate publication-ready feature specifications from user descriptions           |
| `speckit-checklist` | Generate requirements quality checklists - "unit tests for English specifications" |

### Clarification (trilogy-clarify)

Run specs through different stakeholder lenses to catch blind spots. Single skill with lens arguments.

```bash
/trilogy-clarify spec        # Functional requirements
/trilogy-clarify business    # Outcomes, ROI, stakeholders
/trilogy-clarify development # Architecture, constraints
/trilogy-clarify db          # Schema, relationships
/trilogy-clarify all         # Run all lenses (except design)
```

| Lens          | Perspective          | Output             | Focus Areas                                                  |
| ------------- | -------------------- | ------------------ | ------------------------------------------------------------ |
| `spec`        | Requirements Analyst | `spec.md`          | Functional requirements, edge cases, data model              |
| `business`    | PM/Stakeholder       | `business-spec.md` | Outcomes, success metrics, ROI, stakeholder alignment        |
| `development` | Engineer/Architect   | `technical-plan.md`| Architecture, implementation approach, technical constraints |
| `db`          | Data Architect       | `db-spec.md`       | Schema design, relationships, data architecture, migrations  |

*Note: For design, use `/trilogy-design`* *instead of \`/trilogy-clarify design*\*`**. It produces` design.md\`\* *with comprehensive UX/UI documentation.*

---

## Design

Skills for creating design documentation and mockups. Runs Gate 2 (Design) on exit.

| Skill            | What It Does                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `trilogy-design` | Create comprehensive design documentation (design.md) - UX decisions, UI patterns, components, accessibility |
| `trilogy-mockup` | Generate 5-10 ASCII UI mockup variations to explore design options                                           |
| `trilogy-image`  | Create visual assets for epics - hero images, storyboards, AI prompts                                        |
| `speckit-erd`    | Generate Entity-Relationship Diagrams (ASCII and Mermaid) from db-spec                                       |
| `trilogy-flow`   | Generate user flow diagrams showing paths, decision points, and error handling                               |

---

## Planning & Estimation

Skills for breaking down work and estimating effort.

| Skill                   | What It Does                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `speckit-plan`          | Create technical implementation plans with architecture, phases, and constraints           |
| `speckit-tasks`         | Generate implementation tasks organized by user story with dependencies                    |
| `trilogy-estimate`      | Estimate effort at any level - idea briefs (T-shirt), stories (days), tasks (points)       |
| `speckit-analyze`       | Identify inconsistencies, duplications, and gaps across spec artifacts                     |
| `trilogy-raci`          | Create RACI matrices to define roles, decision authority, and responsibilities             |

### Estimation (trilogy-estimate)

Estimate at any level of the spec hierarchy. Inserts estimates inline and validates cross-level consistency.

```bash
/trilogy-estimate           # Auto-detect and estimate whatever exists
/trilogy-estimate idea      # T-shirt size for idea brief (S/M/L)
/trilogy-estimate stories   # Days per story in spec.md
/trilogy-estimate tasks     # Points per task in tasks.md
```

| Level | Unit | Format | Cost Conversion |
|-------|------|--------|-----------------|
| Idea | T-shirt (S/M/L) | Section in IDEA-BRIEF.md | S: $15-30k, M: $60-120k, L: $180k+ |
| Story | Days | `> **Estimate**: 8 days \| ~$24k` | 1 day = ~$3k |
| Task | Points (1-8) | `` `3` `` after [US] label | 1 pt ≈ 0.5 days |

See [Estimation & Linear Sync](/ways-of-working/spec-driven-development/03-estimation-linear) for the full workflow.

---

## Implementation

Skills for building the thing.

### Core Implementation

| Skill               | What It Does                                                                     |
| ------------------- | -------------------------------------------------------------------------------- |
| `speckit-implement` | Execute implementation following tasks.md - interactive or autonomous Ralph mode |

### Development Skills

Specialized skills activated contextually during development.

| Skill                     | Domain             | When Activated                                                   |
| ------------------------- | ------------------ | ---------------------------------------------------------------- |
| `pest-testing`            | PHP Testing        | Writing tests, debugging failures, architecture testing, mocking |
| `inertia-vue-development` | Frontend           | Vue pages, forms, navigation, Inertia.js patterns                |
| `tailwindcss-development` | Styling            | CSS, responsive design, dark mode, Tailwind utilities            |
| `pennant-development`     | Feature Flags      | Feature toggles, A/B testing, conditional features               |
| `playwright-browser`      | Browser Automation | UI testing, debugging frontend, web automation                   |

---

## Review & Release

Skills for quality assurance and shipping.

### Code Gate (Gate 4)

| Skill                | What It Does                                                  |
| -------------------- | ------------------------------------------------------------- |
| `trilogy-dev-handover`         | Run Code Gate checks (tests, linting, coverage) and create PR |
| `laravel-simplifier` | Simplify and refine PHP/Laravel code for clarity              |

### QA Gate (Gate 5)

| Skill                    | What It Does                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `trilogy-qa`             | Generate QA test plan (qa-plan.md) from spec.md acceptance criteria — no browser needed    |
| `trilogy-qa-test-agent`  | Execute the test plan in the browser, fix failures, generate test-report.md with evidence  |
| `trilogy-qa-test-codify` | Convert passing browser tests into deterministic Playwright E2E tests for CI               |
| `trilogy-qa-handover`    | Run Gate 5 checks, confirm no open Sev 1-3 issues, transition Linear to Review             |

### Release Gate (Gate 6)

| Skill             | What It Does                                                                           |
| ----------------- | -------------------------------------------------------------------------------------- |
| `trilogy-release` | Full release workflow - release notes, communication plan, runs Gate 6                 |
| `trilogy-ship`    | Ship to production - analyze changes, Jira ticket, branch, commit, PR, changelog, tags |

---

## Project Management Sync

Skills for syncing specs to Linear.

| Skill                | What It Does                                                                   |
| -------------------- | ------------------------------------------------------------------------------ |
| `trilogy-linear-sync` | Sync stories, tasks, and docs to Linear with estimates                        |

### Linear Sync (trilogy-linear-sync)

Push local artifacts to Linear for project tracking.

```bash
/trilogy-linear-sync push stories   # Spec stories → Linear Issues
/trilogy-linear-sync push tasks     # Tasks → Linear Sub-issues (with points)
/trilogy-linear-sync push docs      # Idea brief + spec → Linear Document
/trilogy-linear-sync push all       # Everything at once
```

| What | Source | Syncs To |
|------|--------|----------|
| Stories | spec.md | Linear Issues (estimate in description) |
| Tasks | tasks.md | Linear Sub-issues (points → estimate field) |
| Docs | IDEA-BRIEF.md + spec.md | Linear Document |

See [Estimation & Linear Sync](/ways-of-working/spec-driven-development/03-estimation-linear) for the full workflow.

---

## Documentation

Skills for maintaining knowledge.

| Skill                  | What It Does                                                              |
| ---------------------- | ------------------------------------------------------------------------- |
| `trilogy-docs-build`   | Build and preview the docs site (runs docs\:build + docs\:preview)        |
| `trilogy-docs-write`   | Structure guide for where to put docs - file conventions and placement    |
| `trilogy-docs-feature` | Document feature domains by exploring codebase and synthesizing knowledge |

---

## Operations & Setup

Skills for project maintenance and configuration.

| Skill                  | What It Does                                                           |
| ---------------------- | ---------------------------------------------------------------------- |
| `trilogy-submodules`   | Initialize or update git submodules (auto-detects which to run)        |
| `trilogy-setup-mcp`    | Configure MCP servers (Atlassian, Teams, GitHub, Herd, custom)         |
| `speckit-constitution` | Update project constitution and propagate amendments across artifacts  |
| `trilogy-train`        | Analyze workflow effectiveness and identify optimization opportunities |

---

## Skill Naming Conventions

| Prefix          | Purpose                                                                    |
| --------------- | -------------------------------------------------------------------------- |
| `speckit-*`     | Specification-driven development workflow (specify → plan → implement)     |
| `trilogy-*`     | TC Portal-specific tools and integrations                                  |
| `hod-*`         | Human-centered design thinking (How Might We, Humanise, Problem Statement) |
| `*-development` | Contextual development skills activated during coding                      |

---

## Skill Counts by Category

| Category                 | Count  |
| ------------------------ | ------ |
| SpecKit (workflow)       | 8      |
| Trilogy (TC Portal)      | 22     |
| HOD (design thinking)    | 3      |
| Development (contextual) | 5      |
| Other                    | 2      |
| **Total**                | **40** |

*Note: `trilogy-clarify`* *consolidates clarification lenses. `trilogy-design`* *is the dedicated design skill (replaces \`/trilogy-clarify design*\*`**).` trilogy-release\*\*`* *handles the full release workflow (Gate 6) before &#x60;/trilogy-ship`\*\*\*\*.\*

---

## See Also

- [Spec-Driven Development](/ways-of-working/spec-driven-development/00-spec-driven-development) - Core workflow and philosophy
- [Workflow Map](/ways-of-working/spec-driven-development/01-workflow-map) - Visual reference of the complete workflow
- [Quality Gates](/ways-of-working/spec-driven-development/10-quality-gates) - The gatekeeper story
