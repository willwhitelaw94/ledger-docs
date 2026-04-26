---
title: "Examples"
description: "Real-world examples of spec-driven development artifacts"
---

See the workflow in action with real features from TC Portal.

---

## Featured Examples

### Enhanced Bulk Actions (EBA)

An infrastructure feature adding Gmail-style bulk actions to CommonTable.

| Artifact | Description |
|----------|-------------|
| [IDEA-BRIEF.md](/initiatives/Infrastructure/Enhanced-Bulk-Actions/IDEA-BRIEF) | Problem statement, benefits, stakeholders, effort estimate |
| [spec.md](/initiatives/Infrastructure/Enhanced-Bulk-Actions/spec) | User scenarios, acceptance criteria, test cases |
| [design.md](/initiatives/Infrastructure/Enhanced-Bulk-Actions/design) | UI patterns, component decisions, accessibility |
| [technical-plan.md](/initiatives/Infrastructure/Enhanced-Bulk-Actions/plan) | Technical approach, phases, architecture |
| [tasks.md](/initiatives/Infrastructure/Enhanced-Bulk-Actions/tasks) | Implementation tasks organized by story |

**Why this example**: Shows a complete artifact chain for an infrastructure feature with clear technical scope.

---

### Client Home Care Agreement (HCA)

A consumer lifecycle feature for in-Portal agreement signing.

| Artifact | Description |
|----------|-------------|
| [IDEA-BRIEF.md](/initiatives/Consumer-Lifecycle/Client-HCA/IDEA-BRIEF) | Problem statement, compliance context, stakeholders |
| [spec.md](/initiatives/Consumer-Lifecycle/Client-HCA/spec) | State model, consent flows, SLA requirements |
| [design.md](/initiatives/Consumer-Lifecycle/Client-HCA/design) | Agreement sections, signature capture, UI flows |

**Why this example**: Shows a business-critical feature with compliance requirements and multi-stakeholder RACI.

---

## Artifact Templates

Each phase produces specific artifacts:

| Phase | Primary Artifact | Template Location |
|-------|------------------|-------------------|
| Ideation | `IDEA-BRIEF.md` | `.tc-wow/templates/idea-brief.md` |
| Specification | `spec.md` | `.tc-wow/templates/spec.md` |
| Design | `design.md` | `.tc-wow/templates/design.md` |
| Planning | `technical-plan.md`, `tasks.md` | `.tc-wow/templates/technical-plan.md` |

---

## Browse All Initiatives

Explore more examples organized by domain:

| Domain | Link |
|--------|------|
| Clinical & Care Plan | [/initiatives/Clinical-And-Care-Plan](/initiatives/Clinical-And-Care-Plan) |
| Consumer Lifecycle | [/initiatives/Consumer-Lifecycle](/initiatives/Consumer-Lifecycle) |
| Supplier Management | [/initiatives/Supplier-Management](/initiatives/Supplier-Management) |
| Work Management | [/initiatives/Work-Management](/initiatives/Work-Management) |
| Infrastructure | [/initiatives/Infrastructure](/initiatives/Infrastructure) |
| Budgets & Finance | [/initiatives/Budgets-And-Finance](/initiatives/Budgets-And-Finance) |

---

## Video Walkthroughs

End-to-end demonstrations of the spec-driven workflow.

| # | Title | Description |
|---|-------|-------------|
| 1 | **Ideation to Spec** | Capturing an idea and writing the specification |
| 2 | **Clarification Lenses** | Running `/trilogy-clarify` through multiple perspectives |
| 3 | **Design & Planning** | From spec to design.md and technical-plan.md |
| 4 | **Implementation with Ralph** | Using `/speckit-implement` with Ralph Wiggum autonomous mode |
| 5 | **QA to Release** | Code review, QA testing, and shipping to production |

---

## Implementation Support: Ralph Wiggum

For implementation, `/speckit-implement` supports two modes:

| Mode | Command | Description |
|------|---------|-------------|
| **Standard** | `/speckit-implement` | Interactive with user oversight |
| **Autonomous** | `/speckit-implement --ralph` | Loop until all tasks done |

Ralph Mode uses test feedback to self-correct, looping automatically until all tasks pass or max iterations reached.

See [Ralph Wiggum Mode](/ways-of-working/spec-driven-development/04-ralph-wiggum) for the full guide.

---

## See Also

- [Spec-Driven Development](/ways-of-working/spec-driven-development/00-spec-driven-development) - Core philosophy
- [Workflow Map](/ways-of-working/spec-driven-development/01-workflow-map) - Visual reference
- [Skills Reference](/ways-of-working/spec-driven-development/09-skills-reference) - Complete skill catalogue
- [Quality Gates](/ways-of-working/spec-driven-development/10-quality-gates) - Gate details and owners
