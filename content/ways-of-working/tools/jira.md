---
title: "Jira"
description: "Issue tracking, sprint management, and spec-driven development"
---

[Jira](https://www.atlassian.com/software/jira) is our primary tool for issue tracking, sprint management, and connecting specifications to implementation.

---

## What It Does

Jira manages our entire development workflow from ideation to delivery.

| Feature | Description |
|---------|-------------|
| **Issue Tracking** | Stories, bugs, tasks, epics |
| **Sprint Management** | Planning, boards, burndown |
| **Backlog Grooming** | Prioritization and refinement |
| **Reporting** | Velocity, cycle time, lead time |
| **Integrations** | GitHub, Slack, Confluence |

---

## Role in Spec-Driven Development

Jira is the **bridge between specifications and code**. Our [Spec-Driven Development](/ways-of-working/spec-driven-development/) workflow uses Jira to:

1. **Link specs to tickets** - Every story references its specification
2. **Track implementation** - Stories move through the board as code is written
3. **Connect to PRs** - GitHub integration links commits to tickets
4. **Measure flow** - Cycle time and lead time metrics

### The Flow

```
Spec (Confluence/Docs) → Jira Story → GitHub PR → Deployment
         ↑                    ↑              ↑
         └────────────────────┴──────────────┘
                    All linked together
```

---

## Jira Rovo MCP

We use the **Jira Rovo MCP** to connect Claude Code directly to Jira, enabling:

- Creating and updating tickets from the command line
- Pulling ticket details into Claude context
- Linking commits and PRs to stories automatically
- Querying sprint status and blockers

See [MCP Quick Setup](/ways-of-working/mcps/02-managing-servers) for configuration.

---

## Our Workflow

| Status | Meaning |
|--------|---------|
| **Backlog** | Refined, ready for sprint |
| **To Do** | In current sprint, not started |
| **In Progress** | Actively being worked on |
| **In Review** | PR open, awaiting review |
| **Done** | Merged and deployed |

---

## Best Practices

### Writing Good Tickets

- Clear title describing the outcome
- Link to spec or design
- Acceptance criteria as checklist
- Story points estimated
- Dependencies identified

### During Development

- Move ticket to "In Progress" when starting
- Link PR to ticket (use ticket ID in branch name)
- Update ticket with blockers or questions
- Move to "In Review" when PR is ready

### Closing Tickets

- Ensure all acceptance criteria are met
- Verify [Definition of Done](/overview/team-practices/08-definition-of-done)
- Add any relevant notes or learnings

---

## Resources

- [Jira Documentation](https://support.atlassian.com/jira-software-cloud/)
- [Spec-Driven Development](/ways-of-working/spec-driven-development/)
- [MCP Quick Setup](/ways-of-working/mcps/02-managing-servers)
