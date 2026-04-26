---
title: Pull Request Manifesto
description: Our philosophy on code review and pull request best practices
---

> "The ratio of time spent reading versus writing is well over 10 to 1. We are constantly reading old code as part of the effort to write new code. ... [Therefore,] making it easy to read makes it easier to write."
>
> — Robert C. Martin, Clean Code: A Handbook of Agile Software Craftsmanship

---

## The Reading vs Writing Ratio

Code review isn't just a gate—it's where we learn from each other.

### What Should the Ratio Be?

There's no fixed rule, but a common guideline is that **review time should be around 20-30% of development time**.

| Development Time | Expected Review Time |
| ---------------- | -------------------- |
| 10 hours         | 2-3 hours            |
| 4 hours          | 45-75 minutes        |
| 1 hour           | 12-18 minutes        |

---

## Why Review More Often?

### Reduces Context Switching

Quick reviews allow developers to address feedback while the code is still fresh in their minds.

### Increases Team Morale

Quick reviews show respect for the developer's time and effort, boosting morale and motivation.

### Prevents Merge Conflicts

Quick code reviews prevent merge conflicts. As the codebase evolves, delayed reviews increase the chance of conflicting changes.

---

## Pull Requests

With GitHub, we use **Pull Requests** to review code before it reaches main.

PRs are primarily about **team communication** about code:

- We learn from each other's code
- We help each other avoid repeating similar patterns or mistakes
- **The goal is to collaborate on making something higher quality than what any single engineer could have produced themselves**

---

## The Pull Request Manifesto

### As a Pull Request Writer, I Will:

::callout{icon="i-lucide-pen-line"}
**Writing Good PRs**

1. **Keep PRs small and focused** - One logical change per PR
2. **Write clear descriptions** - Explain the "why", not just the "what"
3. **Self-review first** - Read my own diff before requesting review
4. **Link to context** - Reference tickets, specs, or discussions
5. **Highlight areas of uncertainty** - Call out where I'd especially appreciate feedback
6. **Respond to feedback promptly** - Keep the conversation moving
7. **Be open to suggestions** - Remember the goal is the best outcome, not being "right"
::

### As a Pull Request Reviewer, I Will:

::callout{icon="i-lucide-search"}
**Reviewing Thoughtfully**

1. **Review promptly** - Respect my teammate's time and context
2. **Be constructive** - Suggest improvements, don't just criticize
3. **Explain my reasoning** - Help others learn from feedback
4. **Ask questions** - Seek to understand before suggesting changes
5. **Distinguish preferences from requirements** - "Nit:" vs blocking feedback
6. **Acknowledge good work** - Celebrate clever solutions and clean code
7. **Focus on what matters** - Correctness, clarity, maintainability > style nitpicks
::

---

## PR Size Guidelines

| Size       | Lines Changed  | Review Approach                                       |
| ---------- | -------------- | ----------------------------------------------------- |
| **Small**  | < 200 lines    | Quick review, same day                                |
| **Medium** | 500 lines      | Block time, thorough review                           |
| **Large**  | 500-1000 lines | Consider splitting, or schedule dedicated review time |

**Smaller PRs = Faster reviews = Faster shipping = Happier team**

---

## What to Look For

When reviewing, consider:

- **Correctness** - Does it do what it's supposed to?
- **Clarity** - Is the code easy to understand?
- **Maintainability** - Will this be easy to modify later?
- **Performance** - Any obvious bottlenecks?
- **Security** - Any vulnerabilities introduced?
- **Tests** - Are changes adequately tested?
- **Documentation** - Does complex logic have comments?

---

## Feedback Etiquette

### Good Feedback

- "Consider using X here because Y"
- "I'm not sure I understand this part—could you explain?"
- "Nit: personal preference, but I find X more readable"
- "This is a great solution for Z"

### Less Helpful Feedback

- "This is wrong" (without explanation)
- "Just do it differently"
- Silence (no feedback at all)

---

## Related

- [Pairing & TDD](/overview/team-practices/04-pairing-and-tdd) - Collaborative development practices
- [Git with Claude](/ways-of-working/claude-code/08-git-with-claude) - AI-assisted Git workflows
