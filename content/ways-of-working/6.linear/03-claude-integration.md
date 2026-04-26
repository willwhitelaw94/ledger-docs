---
title: "Claude Integration"
description: "Syncing specs and creating issues with Claude + Linear MCP"
---

> Claude can sync specs to Linear, creating projects and issues automatically via MCP.

---

## How It Works

The Linear MCP server allows Claude to:

1. **Create projects** from idea briefs
2. **Sync specs** as Linear documents
3. **Generate issues** from user stories
4. **Link GitHub branches** to issues

---

## Syncing a Spec

When you sync a spec using Claude + MCP:

### What Gets Created

| Source | Linear Result |
|--------|---------------|
| Idea Brief | Project document |
| Spec document | Project document (with commenting) |
| User stories | Issues with priority |

### Example Flow

```
Spec: "As a new recipient, I want to be guided when I first sign in
       to fill my home care agreement" (P1)

       ↓ Claude syncs via MCP

Linear Issue:
  - Title: "Guide new recipients through home care agreement on first sign in"
  - Priority: P1
  - Ready for sub-issues and assignment
```

---

## What Claude Can Do

| Action | Supported |
|--------|-----------|
| Create project | Yes |
| Sync idea brief | Yes |
| Sync spec document | Yes |
| Create issues from stories | Yes |
| Suggest assignees | Yes (AI suggestions) |
| Suggest milestones | Yes (AI suggestions) |
| **Create milestones** | **No** (manual) |

**Note**: Milestones (Planning, Design, Dev, QA, Release) must be created manually on each project.

---

## GitHub Branch Linking

When Claude creates a branch, use the Linear ticket number:

```bash
# Claude creates branch
git checkout -b TIM-123-feature-name

# Linear automatically links the branch to the issue
```

The branch shows up in the issue's activity.

---

## Document Sync Limitations

Linear documents support:
- Rich text
- Commenting
- Basic formatting

Linear documents **don't** support:
- Mermaid diagrams
- Custom components
- Advanced formatting

**Recommendation**: For complex specs, link to docs hub rather than syncing content.

---

## Setup

### Prerequisites

1. Linear MCP server configured in Claude
2. Linear API token with appropriate permissions
3. Team/workspace access

### MCP Configuration

```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "@linear/mcp-server"],
      "env": {
        "LINEAR_API_KEY": "your-api-key"
      }
    }
  }
}
```

---

## Common Workflows

### Creating a New Epic

1. Write idea brief in docs
2. Ask Claude: "Create a Linear project for [epic name] in [initiative]"
3. Claude creates project, syncs idea brief
4. Manually add milestones

### Syncing User Stories

1. Write spec with user stories in docs
2. Ask Claude: "Sync these user stories to Linear project [name]"
3. Claude creates issues for each story
4. Assign, estimate, and organize

### Linking to GitHub

1. Ask Claude: "Create a branch for [issue number]"
2. Claude creates branch with ticket number
3. Linear links automatically

---

## Tips

- **Use ticket numbers** in all branch names for automatic linking
- **Sync early** — get issues into Linear as soon as stories are defined
- **Don't over-sync** — complex docs are better as links than Linear documents
- **AI suggestions** are helpful but not always right — review assignees and milestones

---

## Related

- [Spec-Driven Development](/ways-of-working/spec-driven-development) — Where specs come from
- [Structure & Hierarchy](./02-structure) — How Linear organizes work
- [MCP Servers](/ways-of-working/mcps) — Other MCP integrations
