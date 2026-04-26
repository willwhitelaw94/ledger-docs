---
title: Research with Subagents
description: Send workers out to gather information without crowding your context window
---

One of Claude Code's most powerful patterns: **spin up subagents to do research in parallel** while you continue working.

::alert{type="warning"}
**Token Warning:** Each subagent consumes its own tokens. Running 42 research agents in parallel (like the screenshot below) is a great way to blow through your daily token budget in minutes. Start with 2-3 focused agents, not dozens.

![42 agents running](/images/Screenshots/42-agents-warning.png)
::

---

## The Problem

When you ask Claude to research something, it consumes your context window with:
- Web search results
- Long articles
- Multiple sources
- Intermediate reasoning

By the time research is done, you've used half your context on information gathering.

## The Solution: Background Research Agents

Instead of researching inline, spawn a subagent to do it:

```
Can you spin up a subagent to research [topic]?
```

Claude launches a worker that:
1. **Runs in a separate context window** — doesn't crowd your main conversation
2. **Can run in the background** — you continue working while it researches
3. **Returns a summary** — distilled findings, not raw data
4. **Preserves sources** — links you can verify

---

## Real Example: Industry Research

Here's what just happened in this conversation:

**Request:** "Spin up a subagent to research industry adoption of AI coding"

**Result:** Two agents ran in parallel:
1. One researched **industry figures** (Jensen Huang, Bret Taylor, etc.)
2. One gathered **articles from reputable publications**

Both returned structured findings with primary sources—without using the main conversation's context.

---

## How It Works

### Single Research Task

```
Spin up a research agent to find:
- What companies are using AI coding tools
- What productivity gains they're reporting
- Primary sources (blog posts, earnings calls, interviews)
```

Claude spawns an agent that:
- Runs web searches
- Reads and synthesizes articles
- Returns a structured summary

### Parallel Research Tasks

```
Run these research tasks in parallel:
1. Find academic studies on AI coding productivity
2. Find CEO statements about AI coding adoption
3. Find developer survey data on AI tool usage
```

Three agents run simultaneously, each in their own context, returning when done.

---

## Research vs BA Requirements Gathering

These are **different use cases**:

| Research | BA Requirements |
|----------|-----------------|
| **External sources** — web, publications, industry data | **Internal sources** — Teams chats, Jira, codebase |
| Finding what the world knows | Finding what we decided |
| Building evidence walls | Capturing requirements |
| Validating industry trends | Understanding stakeholder needs |

### For External Research
```
Spin up a research agent to find articles about [topic] from reputable sources
```

### For Internal Context Gathering
```
/learn — What do we know about the budget feature?
```

Or use the BA workflow:
```
/be-your-own-ba — Turn this Teams chat into Jira tickets
```

---

## When to Use Research Subagents

**Good candidates:**
- Gathering industry evidence/validation
- Finding best practices and patterns
- Competitive analysis
- Technology evaluation
- Building "evidence walls" to convince stakeholders

**Not ideal for:**
- Quick lookups (just ask directly)
- Internal codebase questions (use `/learn` or Explore)
- Requirements that exist in Teams/Jira (use BA workflow)

---

## Tips for Effective Research Prompts

### Be Specific About What You Need

**Vague:**
> Research AI coding

**Specific:**
> Research AI coding adoption. Find:
> - CEO quotes with primary sources
> - Productivity statistics from studies
> - Enterprise adoption case studies
> Return as a structured list with URLs.

### Specify Output Format

```
Return as:
- Bullet points for quick scanning
- Include URLs for every claim
- Group by category (studies, quotes, case studies)
```

### Request Primary Sources

```
Focus on primary sources:
- Original tweets, not articles about tweets
- Actual studies, not summaries
- Earnings call transcripts, not news reports
```

---

## Running Multiple Agents in Parallel

For comprehensive research, run multiple focused agents:

```
Run these three research agents in parallel:

1. ACADEMIC: Find peer-reviewed studies on AI coding productivity
2. INDUSTRY: Find CEO/CTO statements from major tech companies
3. SURVEYS: Find developer survey data (Stack Overflow, JetBrains, etc.)
```

Each agent focuses on one source type, runs independently, and returns findings.

---

## Background vs Foreground

### Foreground (default)
- Agent runs, you wait
- Results appear when done
- Good for quick research

### Background
```
Run this research in the background...
```
- Agent runs asynchronously
- You continue working
- Get notified when done
- Good for extensive research

---

## Example: Building an Evidence Wall

**Goal:** Convince skeptical engineers that AI coding is real

**Approach:**
1. Spawn agent to find CEO quotes with primary sources
2. Spawn agent to find productivity studies
3. Spawn agent to find developer survey data
4. Compile results into a document

**Result:** Credible evidence wall with verifiable sources that skeptics can't dismiss.

---

## The /research Command

We have a `/trilogy-research` skill that orchestrates multi-source research:

```
/trilogy-research — What are best practices for feature flag rollouts?
```

This gathers context from:
- Web sources
- Internal docs
- Codebase patterns
- Teams/Fireflies if relevant

Returns a structured research document.

---

## Case Study: What Happens When You Go Too Far

**The Setup:** We wanted to research and update all domain docs in the TC Portal codebase. The prompt asked Claude to research 30 domain areas and 12 integrations simultaneously.

**What Happened:**

![42 agents running](/images/Screenshots/42-agents-warning.png)

Claude spawned **42 research agents in parallel**:
- 30 domain agents (assessments, care-plan, claims, fees, budget, bills, etc.)
- 12 integration agents (MYOB, Proda, Services Australia API, Twilio, Zoho, etc.)

**The Result:**

```
⚫ Prompt is too long
⚫ Prompt is too long
⚫ Prompt is too long
```

Every agent tried to return its findings. Each one had gathered substantial research. The combined context exceeded limits. The session became unusable.

**Lessons Learned:**

1. **2-3 agents = good.** 42 agents = disaster.
2. **Each agent consumes tokens independently** — they add up fast
3. **Batch your research** — do domains in groups of 3-5, not all at once
4. **Background agents still return** — they don't magically use less tokens
5. **Start a fresh session** if you hit this — the agents will die but you'll recover

**The Right Way:**

Instead of:
```
Research all 30 domains and 12 integrations in parallel
```

Do:
```
Research domains batch 1: assessments, care-plan, claims
[wait for results]
Research domains batch 2: fees, budget, bills
[wait for results]
...
```

Sequential batches, not parallel explosion.

---

## Key Takeaways

1. **Subagents preserve your context** — research happens in separate windows
2. **Parallel execution** — multiple research tasks at once (but keep it to 2-3!)
3. **External vs internal** — research (web) vs requirements (Teams/Jira)
4. **Primary sources matter** — always request URLs/links
5. **Background option** — continue working while research runs
6. **Don't be a hero** — 42 agents will break your session

---

## Related

- [Custom Agents](/ways-of-working/claude-code-advanced/12-custom-agents) — Create your own specialized agents
- [Claude for Everyone](/ways-of-working/overview/04-cowork-connectors) — Internal requirements gathering
- [Ready to Go](/ways-of-working/environment-setup/00-ready-to-go) — Get set up
