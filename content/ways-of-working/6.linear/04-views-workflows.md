---
title: "Views & Workflows"
description: "Custom views, cycles, and team workflows in Linear"
---

> Views let you see exactly what you need. Cycles keep work moving.

---

## Views

### What Are Views?

Saved filters that show issues matching specific criteria.

### Creating a View

1. Go to any issue list
2. Set filters (status, creator, team, labels, etc.)
3. Click "Save View"
4. Choose scope: Workspace, Team, or Personal

### Example: "My Issues"

```
Filter: Creator = me
Display: Board view
Group by: Status
```

Save as personal view, favorite it, access from sidebar.

### Organizing Views

- **Favorite** views you use often
- **Folders** organize favorites (personal to each user)
- **Team views** shared with your squad
- **Workspace views** visible to everyone

---

## Display Options

| View Type | Best For |
|-----------|----------|
| **List** | Quick scanning, bulk updates |
| **Board** | Kanban-style, status tracking |
| **Timeline** | Dependencies, scheduling |
| **Calendar** | Due dates, deadlines |

### Display Properties

Customize what shows on each card:
- Assignee
- Priority
- Estimate
- Labels
- Due date
- Cycle

---

## Cycles (Sprints)

### Enabling Cycles

1. Go to Team Settings
2. Turn on Cycles
3. Set cycle length (default: 2 weeks)

### Working with Cycles

| Action | How |
|--------|-----|
| Add issue to cycle | Drag or set Cycle field |
| View current cycle | Team → Active Cycle |
| Plan next cycle | Team → Upcoming Cycle |
| Review past cycles | Team → Past Cycles |

### Sprint Planning

Same concept as Jira:
1. Review backlog
2. Pull issues into upcoming cycle
3. Estimate and assign
4. Start cycle

---

## Pulse & Updates

Automated check-ins to keep projects moving.

### Configuration

| Type | Default | When | Purpose |
|------|---------|------|---------|
| Workspace Pulse | Weekly | - | General updates |
| Project Updates | Weekly | Friday 3-4pm | Project status |
| Initiative Updates | Every 4 weeks | Friday 4-5pm | Initiative progress |

### How It Works

1. Linear pings responsible person's inbox
2. They write a quick update
3. Update visible on project/initiative
4. Can send to Slack (when connected)

---

## Integrations

### Currently Connected

| Integration | Status | Purpose |
|-------------|--------|---------|
| **GitHub** | Active | Branch linking, PR status |

### Planned

| Integration | Purpose |
|-------------|---------|
| **Slack** | Notifications, updates |
| **Intercom** | Feed support tickets |
| **Raycast** | Quick access (Tim investigating) |

---

## Team Workflows

### Triage Flow

```
Intercom/Support → Triage Team → Assign to Squad → Squad Backlog
```

### Development Flow

```
Backlog → Cycle Planning → In Progress → In Review → Done
```

### Labels for Workflow

| Label | Purpose |
|-------|---------|
| `blocked` | Waiting on something |
| `needs-design` | Requires design input |
| `needs-review` | Ready for code review |
| `ready-for-qa` | Implementation complete |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `C` | Create issue |
| `Cmd+K` | Command palette (search anything) |
| `G I` | Go to inbox |
| `G M` | Go to my issues |
| `Space` | Select issue |
| `X` | Close issue |

---

## Tips

- **Start simple** — Don't over-engineer views on day one
- **Use keyboard** — Linear is built for it
- **Trust the inbox** — It surfaces what needs attention
- **Cycles optional** — Not every team needs sprints

---

## Related

- [Structure & Hierarchy](./02-structure) — Understanding the data model
- [Claude Integration](./03-claude-integration) — Creating issues with AI
