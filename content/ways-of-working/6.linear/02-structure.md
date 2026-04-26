---
title: "Structure & Hierarchy"
description: "Initiatives, Projects, Issues, and how they connect"
---

> Linear has three levels: Initiatives → Projects → Issues. That's it.

---

## The Hierarchy

```
Initiative (Work Management)
└── Project (Consumer Lifecycle)
    ├── Milestone: Planning
    ├── Milestone: Design
    ├── Milestone: Dev
    ├── Milestone: QA
    └── Milestone: Release
        └── Issue (User Story)
            └── Sub-issue (Task)
```

---

## Initiatives

**What they are**: Major work streams that group related projects.

| Field | Purpose |
|-------|---------|
| Status | Track overall progress |
| Updates | Regular check-ins (configured via Pulse) |
| Lead | Responsible person |
| Timeline | Visual roadmap of projects |

**Our initiatives** align with docs.trilogycare.dev:
- Consumer Journey & Care Planning
- Supplier Management
- Coordination Management
- Work Management
- Budgets & Finance
- Consumer Experience
- Infrastructure
- Adhoc

**Sub-initiatives** (Premium): Break large initiatives into focused sub-streams, each with multiple epics.

---

## Projects (Epics)

**What they are**: Specific deliverables within an initiative.

Each project has:

### Documents

- **Idea Brief**: The who, what, where, when, why
- **Spec**: Detailed requirements (synced from docs or linked)

### Milestones

Optional phases to organize issues:

| Milestone | Purpose |
|-----------|---------|
| Planning | Requirements gathering |
| Design | UI/UX work |
| Dev | Implementation |
| QA | Testing |
| Release | Deployment |

**Note**: Milestones must be created manually—Claude can't create them when syncing epics.

### Timeline View

- Drag to set dates
- Visualize dependencies
- Simpler than Jira Plan

---

## Issues

**What they are**: All work items—stories, tasks, bugs. Linear doesn't distinguish.

### Fields

| Field | Purpose |
|-------|---------|
| Assignee | Who's doing it |
| Priority | P1-P4 or No Priority |
| Estimate | Story points or time |
| Milestone | Which phase |
| Labels | Type, domain, area |
| Cycle | Which sprint |

### Labels

Three categories we use:

| Category | Examples |
|----------|----------|
| **Ticket Type** | Story, Bug, Task, Spike |
| **Domain/Area** | Payments, Care Plans, Mobile |
| **Other** | Blocked, Needs Design |

### Sub-issues

Break down an issue into smaller tasks:
- Each sub-issue can have its own assignee
- Progress rolls up to parent issue

---

## Templates

Create issue templates in Settings:

- Define standard format (e.g., story template with acceptance criteria)
- Auto-populate labels (e.g., Ticket Type: Story)
- Consistent structure across the team

---

## What Lives Where?

| Content | Location | Why |
|---------|----------|-----|
| Idea Brief | Linear document | Quick access, commenting |
| Spec | Link to docs hub | Version control, better formatting |
| User Stories | Linear issues | Trackable, assignable |
| Design mockups | Linked | Figma, etc. |

**Decision pending**: We're still deciding the exact split between Linear documents and docs hub links.

---

## Related

- [Claude Integration](./03-claude-integration) — How specs sync to create issues
- [Views & Workflows](./04-views-workflows) — Organizing and viewing your work
