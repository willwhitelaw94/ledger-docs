---
title: "Claude for Everyone"
description: "From quick BA tasks to autonomous agents — choose your level"
---

> You don't need to write code. You just need to describe what you want.

---

## Choose Your Level

| Level      | What                                                                                                 | Who It's For                             |
| ---------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **Easy**   | [Be Your Own BA](#be-your-own-ba-easy) — Teams to Jira in 2 minutes                                  | Everyone — no setup required             |
| **Medium** | [Cowork/Projects/Connectors](#cowork-projects-connectors-medium) — autonomous cross-system workflows | Product, Ops, anyone with local codebase |

---

## Be Your Own BA (Easy)

::loom-video
https://www.loom.com/share/a4fab745571a40e5ab4226f73a29f6cf
::

While planning and scoping is primarily the responsibility of our Planning team, **everyone can be a BA in some capacity**.

The vision:

- **Designers and developers** documenting their own discovery
- **Ops and Product Owners** capturing requirements as they surface
- **Anyone** able to turn a chat conversation into a Jira ticket

When we're having conversations about product requirements or dropping requests in Teams, Claude can cut through the noise—summarize what's been discussed, do a gap analysis against existing epics, and create the Jira ticket with proper user story format.

**No more requirements falling through the cracks.**

### When to Use This

- Quick feature requests from stakeholders
- Bug reports mentioned in chat
- Small enhancements that don't need full specs
- Capturing requirements before they get lost

### The 2-Minute Workflow

**1. Open Claude Chat**

Go to [claude.ai](https://claude.ai) and start a new chat. Make sure you have the connectors enabled:

- **Atlassian** (for Jira/Confluence)
- **Microsoft 365** (for Teams)
- **Fireflies** (for meeting transcripts)

**2. Link the Teams Chat**

Paste the Teams chat link and ask Claude to summarize:

```text
Here's our product planning chat: [Teams link]

Tell me about everything going on in this chat.
```

Claude will summarize recent discussions, decisions, and requests.

**3. Screenshot & Paste Requirements**

See a specific request in Teams? Screenshot it and paste directly into Claude:

```text
Can you add these requirements to our On Hold Bills epic in Jira?
[paste screenshot]
```

**4. Let Claude Do the Gap Analysis**

Claude will:

1. Search Jira for related epics/stories
2. Check Confluence for existing documentation
3. Identify gaps between what's requested and what exists
4. Propose new user stories or acceptance criteria

**5. Create the Jira Ticket**

Tell Claude to create the ticket:

```text
Yes, please create that as a new Jira story under the epic.
```

Done. Requirement captured, ticket created.

### Real Example: On Hold Bills

Here's how this worked for the On Hold Bills feature:

**From Teams chat:**

> **Mellette (9:10 AM):** Good Morning team. With the new on hold workflow, for those that will be system declined, will we be able to show on the history the dates email reminders are sent to all stakeholders?

> **Scott (via Romy, 11:37 AM):** Do you know if dev are working on getting the on hold reasons available for coords?

**Claude's gap analysis:**

| Request                          | Current State                                   | Gap                                      |
| -------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| Email reminder history           | Activity logs exist but don't show email events | Need to add email events to activity log |
| On hold reasons for coordinators | Reasons exist but not visible to coordinators   | Need UI to expose reasons                |

**Created stories:**

- **TP-3990**: As a finance accounts user, I need to see all email reminders sent in the bill's activity log so I can investigate write-offs with a complete audit trail
- **TP-3991**: As a coordinator, I need to see on hold reasons for bills so I understand why bills are pending

### Tips for Better Results

**Be Specific About the Epic**

```text
Add this to the On Hold Bills epic (TP-XXXX)
```

**Ask for Stories, Not Comments**

By default, Claude might add comments to existing tickets. Be explicit:

```text
Don't add as a comment - create a new Jira story
```

**Review Before Creating**

Ask Claude to show you the proposed story first:

```text
Show me what the user story would look like before creating it
```

### Setting Up Connectors

**In Claude.ai Settings**

1. Go to **Settings** → **Connectors**
2. Enable:
   - **Atlassian** - Connect your Jira/Confluence
   - **Microsoft 365** - Connect Teams
   - **Fireflies** - Connect meeting transcripts (optional)

**Organization Skills**

If Claude keeps adding comments instead of creating tickets, update your organization skill:

> When I ask to create stories, always create new Jira issues. Never add as comments to existing tickets.

### When to Graduate

This approach is great for:

- ✅ Small enhancements
- ✅ Bug fixes
- ✅ Quick captures from chat
- ✅ Incremental requirements

Move to Medium level when you need autonomous workflows or codebase access.

---

## Cowork, Projects & Connectors (Medium)

::loom-video
https://www.loom.com/share/37b0836942304e1a9bb48e4a888889e1
::

### The Three Layers

| Layer | What It Does | Best For |
|-------|--------------|----------|
| **Claude Desktop + Connectors** | Chat with access to Jira, Teams, Fireflies | Quick tasks, checking status, adding stories |
| **TC Projects** | Long-form chats with files and memory | Deep work on specific initiatives |
| **Cowork** | Autonomous tasks with codebase access | Updating docs, cross-system workflows |

### Claude Desktop + Connectors

Quick tasks using MCPs:

- **Atlassian** — Jira issues, Confluence pages
- **Fireflies** — Meeting transcripts
- **Microsoft 365** — Teams messages, emails
- **GitHub** — Limited in Desktop (use Claude Code instead)

### TC Projects

For longer work sessions:

- Connect files (GitHub repos, documents)
- Memory persists across chats
- Projects organize around initiatives

Example: A 97-page IM document connected to a project for ongoing reference.

### Cowork

The autonomous layer—Claude works independently.

**What Cowork Can Do:**

- Access your **connectors (MCPs)**
- Access your **project files and memory**
- Work with the **codebase** (if pulled locally)
- Write files, update docs, cross-reference systems

**Setup Requirements:**

1. Pull TC Portal locally (via Git)
2. Connect codebase in Cowork
3. TC Portal includes:
   - Main Laravel application
   - TC Docs content files (initiatives, features)

**Example Task:**

```text
In this folder (Trilogy Product project), I have the IM.
Tell me about key information in the IM and help me update
the overview section of the product team docs.
```

### What You Can Automate (Without Writing Code)

| Department | Task | How It Works |
|------------|------|--------------|
| **Finance** | Monthly board packs | Connect to Xero, pull P&L, format against your KPIs |
| **Finance** | Variance analysis | Compare actuals to budget, highlight issues over 10% |
| **HR** | Performance reviews | Pull data from Employment Hero, Aircall, combine into one report |
| **HR** | 360 feedback | Generate forms, collect responses, compile summaries |
| **Operations** | Release notes | Translate technical changes into coordinator-friendly language |
| **Operations** | Meeting summaries | Extract decisions and action items from Fireflies transcripts |

### Current Limitations

::alert{type="warning"}
Cowork was built by Anthropic with AI in 14 days—it's still buggy.
::

| Limitation | Workaround |
|------------|------------|
| GitHub not in Desktop connectors | Use Claude Code for repo access |
| Cowork can hang | Reset Claude, retry |
| Still stabilizing | Expect rough edges |

---

## Cursor + Multi-Step Agents (Hard)

For developers and power users who want full control.

See: [Claude Code](/ways-of-working/claude-code) — the complete guide to building and running agents in Cursor.

**What you get:**

- Full codebase access
- Git operations (branches, commits, PRs)
- Terminal commands (tests, builds)
- MCP integrations (Jira, Teams, Fireflies)
- `/trilogy.*` and `/speckit.*` commands
- Multi-agent parallel workflows

---

## The Vision

All three levels should eventually converge:

- **Connectors** for external systems
- **Projects** for context and memory
- **Codebase** for implementation

One place: read Teams → check Jira → update docs → write code.

---

## Related

- [Ready to Go](/ways-of-working/environment-setup/00-ready-to-go) — Get set up
- [Claude Code](/ways-of-working/claude-code) — Hard mode guide
- [MCP Servers](/ways-of-working/mcps) — Setting up MCPs
- [Spec-Driven Development](/ways-of-working/spec-driven-development) — Full feature workflow

---

## Sources

- [Everyone Should Be Using Claude Code](https://www.lennysnewsletter.com/p/everyone-should-be-using-claude-code) - Lenny Rachitsky's survey of 500+ users
- [Claude for Financial Services](https://www.anthropic.com/news/claude-for-financial-services) - Anthropic official
- [Getting started with Cowork](https://support.claude.com/en/articles/13345190-getting-started-with-cowork)
