---
title: "Linear"
description: "Project management and issue tracking tool replacing Jira for TC Portal development"
---

# Linear

Linear is our project management and issue tracking tool, replacing Jira. It provides a cleaner, faster interface for managing issues, epics (projects), and initiatives.

## Overview

Linear uses a simpler hierarchy than Jira:
- **Initiatives** → High-level strategic goals (like Jira Initiatives)
- **Projects** → Epics/features being built (like Jira Epics)
- **Issues** → Stories, tasks, and bugs combined (replaces Jira Stories/Tasks/Bugs)
- **Sub-issues** → Subtasks within an issue

## Getting Started

### Access
- URL: [linear.app/trilogycare](https://linear.app/trilogycare)
- Sign in with your Trilogy Google account

### Your Workspace

When you log in, you'll see:
- **My Issues** - Issues assigned to you
- **Inbox** - Notifications and updates
- **Teams** - Your squad and other teams
- **Initiatives** - Strategic initiatives
- **Views** - Custom saved filters

## Teams Structure

| Team | Purpose |
|------|---------|
| **Triage** | Initial ticket intake before assignment |
| **Planning** | Design and planning team |
| **Dev Squads** | Individual development squads |

Each team can have:
- Their own issue templates
- Cycles (sprints)
- Custom workflows
- Team-specific labels

## Initiatives

Initiatives align with our strategic areas documented at [docs.trilogycare.dev](https://docs.trilogycare.dev):

1. Consumer Journey & Care Planning (Tim)
2. Supplier Management (Invoices)
3. Coordination Management (Quar)
4. Work Management
5. Budgets & Finance (Matt)
6. Consumer Experience (Mobile)
7. Infrastructure
8. Adhoc

### Sub-Initiatives (Premium Feature)
With Premium, you can create sub-initiatives to break down large initiatives into manageable chunks.

## Projects (Epics)

Projects in Linear are equivalent to Jira Epics. Each project can have:

### Milestones
Milestones help organize issues into phases:
- **Planning** - Requirements and design
- **Design** - UI/UX work
- **Dev** - Development work
- **QA** - Testing phase
- **Release** - Deployment

### Project Documents
Projects can contain linked documents:
- Idea briefs
- Specifications
- Design docs

### Timeline View
The timeline view shows:
- Milestone dates
- Dependencies between projects
- Visual roadmap of work

## Issues

Issues combine what Jira separates into Stories, Tasks, and Bugs.

### Issue Fields
- **Status** - Workflow state (Backlog, In Progress, Done, etc.)
- **Assignee** - Who's working on it
- **Priority** - Urgent, High, Medium, Low, No Priority
- **Estimate** - Story points or time estimate
- **Labels** - Categorization tags
- **Milestone** - Which phase it belongs to
- **Cycle** - Which sprint it's in

### Labels
Our standard labels include:
- **Areas** - Product domains (e.g., Budget, Care Plan)
- **Ticket Types** - Story, Bug, Task, Spike
- **Other** - Team-specific labels

### Issue Templates
Create templates in Team Settings for consistent issue creation:
```
Team Settings → Templates → Create Template
```

Templates can pre-fill:
- Default labels
- Description structure
- Milestone assignment

## Cycles (Sprints)

Cycles are Linear's version of sprints.

### Enabling Cycles
1. Go to Team Settings
2. Enable Cycles
3. Set cycle duration (default: 2 weeks)

### Cycle Planning
- Drag issues into the current cycle
- View cycle progress and burndown
- Automatic cycle rollover for incomplete work

## Views

Views are saved filters and display configurations.

### Creating a View
1. Filter issues using the filter bar
2. Click "Save View"
3. Name your view
4. Choose visibility: Personal, Team, or Workspace

### View Options
- **List** - Traditional list view
- **Board** - Kanban board
- **Timeline** - Gantt-style view

### Display Properties
Customize what fields show in each view:
- Assignee
- Priority
- Estimate
- Labels
- Due date

## Integrations

### GitHub
Linear connects to GitHub for:
- Automatic branch creation from issues
- PR linking to issues
- Status updates when PRs merge

**Branch Naming**: Always use the issue identifier (e.g., `PLA-123`) in branch names for automatic linking.

### Intercom (Planned)
Future integration to create issues from support tickets.

### Slack (Coming Soon)
Notifications and updates to Slack channels.

## Pulse & Updates

### Project Updates
- Configured to request updates weekly (Fridays 3-4pm)
- Updates can be posted to Slack
- Track project health and progress

### Initiative Updates
- Configured every 4 weeks (Fridays 4-5pm)
- High-level strategic progress
- Leadership visibility

## Working with Claude Code

Claude Code integrates with Linear via MCP:

### Creating Issues
```
"Create a Linear issue for [description]"
```

### Searching Issues
```
"Find Linear issues about [topic]"
```

### Branch Creation
When Claude creates a branch, it automatically uses the Linear issue identifier:
```
feature/PLA-1124-enable-care-plan-email
```

## Quick Reference

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `C` | Create new issue |
| `G` then `I` | Go to Inbox |
| `G` then `M` | Go to My Issues |
| `/` | Search |
| `⌘ + K` | Command palette |

### Issue Statuses
| Status | Meaning |
|--------|---------|
| Backlog | Not yet planned |
| Todo | Planned for work |
| In Progress | Currently being worked on |
| In Review | PR submitted, awaiting review |
| Done | Completed |
| Cancelled | Won't be done |

## Best Practices

1. **Use issue identifiers** in branch names and commit messages
2. **Keep issues atomic** - one issue = one piece of work
3. **Update status promptly** - keeps the board accurate
4. **Add context** - link related issues, add comments
5. **Use templates** - consistent issue structure
6. **Review your inbox** - stay on top of updates

## Resources

- [Linear Documentation](https://linear.app/docs)
- [Linear Keyboard Shortcuts](https://linear.app/docs/keyboard-shortcuts)
- [Linear API](https://developers.linear.app/)
