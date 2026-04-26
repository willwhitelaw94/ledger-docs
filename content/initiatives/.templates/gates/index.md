---
title: Gates
navigation: false
---

# Gates

Quality checkpoints ensuring each phase is complete before progressing.

| Gate | Name | Key Question | Status | Date |
|------|------|--------------|--------|------|
| 1 | [Spec](./1-spec) | Is this spec ready for design? | :icon{name="circle-dotted" color="gray"} Pending | - |
| 2 | [Design](./2-design) | Does it look right? | :icon{name="circle-dotted" color="gray"} Pending | - |
| 3 | [Architecture](./3-architecture) | Will the structure hold? | :icon{name="circle-dotted" color="gray"} Pending | - |
| 4 | [Code Quality](./4-code-quality) | Is it ready to inspect? | :icon{name="circle-dotted" color="gray"} Pending | - |
| 5 | [QA](./5-qa) | Does it actually work? | :icon{name="circle-dotted" color="gray"} Pending | - |
| 6 | [Release](./6-release) | May this enter the city? | :icon{name="circle-dotted" color="gray"} Pending | - |

## Workflow

```
Idea → Spec → [Gate 1] → Design → [Gate 2] → Plan → [Gate 3] → Code → [Gate 4] → QA → [Gate 5] → Review → [Gate 6] → Production
```

## Gate Skills

| Gate | Skill | Runs After |
|------|-------|------------|
| 1 - Spec | `/speckit-specify` | Spec created |
| 2 - Design | `/trilogy-design` | Design complete |
| 3 - Architecture | `/speckit-plan` | Plan created |
| 4 - Code Quality | `/trilogy-dev-handover` | Code complete |
| 5 - QA | `/trilogy-qa` | QA testing |
| 6 - Release | `/trilogy-release` | Review complete |

## Reference

Full gate definitions: [.tc-wow/gates/](/.tc-wow/gates/)
