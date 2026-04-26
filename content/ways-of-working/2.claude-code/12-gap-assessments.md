---
title: Gap Assessments with Claude
description: Using Claude Code to identify gaps between documentation, plans, and reality
---

Gap assessments are one of Claude's superpowers. The ability to read multiple sources, compare them, and identify what's missing or misaligned makes Claude exceptionally useful for keeping documentation, plans, and implementations in sync.

---

## Why Claude Excels at Gap Analysis

Claude can:
- **Read multiple documents simultaneously** - compare a BRP against initiative docs, or specs against code
- **Hold context across sources** - remember what's in document A while analysing document B
- **Identify patterns of omission** - spot what's *not* there, not just what is
- **Produce structured comparisons** - tables, checklists, prioritised lists

This is tedious work for humans but trivial for Claude.

---

## Common Gap Assessment Use Cases

### 1. Planning vs Documentation

**"Does our BRP align with our initiative docs?"**

```
Compare the BRP January 2026 document with our initiatives folder.
What features are mentioned in the BRP but don't have initiative
documentation? What's documented but not in the BRP?
```

Claude will read both sources and produce a gap matrix.

### 2. Specs vs Implementation

**"Does the code match the spec?"**

```
Read the spec.md for Collections V2 and compare it against the actual
implementation in the codebase. What's specified but not built?
What's built but not specified?
```

Useful for pre-release audits.

### 3. Documentation Freshness

**"Is our documentation up to date?"**

```
Compare the team structure documented in squads.md against what you
can see in recent commits, PR authors, and CODEOWNERS. Are there
people missing? Teams that have changed?
```

Documentation drifts. Claude can spot it.

### 4. Compliance Checklists

**"Have we covered all requirements?"**

```
Read the Support at Home compliance requirements document and compare
against our feature documentation. What compliance items don't have
corresponding features documented?
```

Regulatory gap analysis in minutes, not days.

### 5. Meeting Notes vs Actions

**"Did we capture everything from the meeting?"**

```
Compare the Fireflies transcript from our planning session against
the Jira tickets created. What was discussed but not ticketed?
What actions were mentioned but not assigned?
```

Ensures nothing falls through the cracks.

---

## Gap Assessment Prompt Patterns

### The Basic Pattern

```
Read [Source A] and [Source B].
Compare them and identify:
1. What's in A but not B
2. What's in B but not A
3. What's in both but different
```

### The Prioritised Pattern

```
Compare [Source A] against [Source B].
For each gap found, categorise as:
- Critical: Must address before [milestone]
- Important: Should address soon
- Nice-to-have: Can wait
```

### The Action-Oriented Pattern

```
Compare [Source A] and [Source B].
For each gap, suggest:
- What needs to be created/updated
- Where it should live (file path)
- Who should own it
```

---

## Real Example: BRP vs TC Docs

We just ran this gap assessment. Here's what Claude found:

| BRP Item | TC Docs Status | Gap |
|----------|---------------|-----|
| Collections V2 | Documented | None |
| Budget Analytics Dashboard | Not found | **Missing initiative** |
| Mobile Experience V2 | Sparse docs | **Needs expansion** |
| Supplier Portal V2 | Not documented | **Missing initiative** |
| Key Metrics/OKRs | Not captured | **Missing doc** |

From one prompt, we identified 4 documentation gaps that would have been missed.

---

## Tips for Effective Gap Assessments

### Be Specific About Sources

Bad: "Check if our docs are up to date"
Good: "Compare BRP-2026-01-January.md against the initiatives/ folder"

### Ask for Structure

Bad: "What's missing?"
Good: "Create a table showing: Item | Source A Status | Source B Status | Gap Type"

### Request Actionable Output

Bad: "Find the gaps"
Good: "For each gap, recommend: what to create, where to put it, priority level"

### Iterate

First pass finds obvious gaps. Ask follow-up questions:
- "Are there any implicit gaps I should know about?"
- "What assumptions are different between these sources?"
- "What's the highest-risk gap here?"

---

## When to Run Gap Assessments

| Trigger | Assessment Type |
|---------|----------------|
| After BRP/planning sessions | Plans vs documentation |
| Before releases | Specs vs implementation |
| Quarterly | Documentation freshness |
| New team member joins | Onboarding docs vs reality |
| After org changes | Team docs vs actual structure |
| Compliance audits | Requirements vs features |

---

## Automating Gap Assessments

Consider adding gap checks to your workflow:

1. **Post-BRP ritual** - Compare new BRP against initiative docs
2. **Pre-release checklist** - Spec vs implementation review
3. **Monthly doc health** - Stale documentation scan
4. **Onboarding feedback** - What docs were wrong or missing?

Claude makes these fast enough to run regularly, not just when things feel broken.

---

## Related

- [Context Management](/ways-of-working/claude-code/07-context-management) - How to feed Claude the right sources
- [Plan Mode](/ways-of-working/claude-code/11-plan-mode) - For larger gap-driven projects
- [BRP Sessions](/context/brp) - Source material for planning gaps
