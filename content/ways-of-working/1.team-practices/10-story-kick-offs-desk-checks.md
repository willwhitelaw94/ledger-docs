---
title: "Story Kick Offs and Desk Checks"
description: "Starting stories right and finishing them well"
---

Story Kick Offs and Desk Checks are ceremonies that bookend development work—ensuring alignment at the start and quality at the end.

---

## Why Do This?

Based on findings in Feb 2025, our biggest improvement opportunity is **PR times**. Story Kick Offs and Desk Checks directly address this by:

- Reducing rework from misunderstood requirements
- Catching issues before they reach PR review
- Shortening the feedback loop
- Improving collaboration between dev, design, and product

---

## Story Kick Off

**When**: Before a developer starts work on a story

**Who**: Developer, Designer (if UI involved), BA/PM

**Duration**: 10-15 minutes

### Purpose

- Ensure shared understanding of requirements
- Clarify acceptance criteria
- Identify edge cases and risks
- Answer questions before coding starts

### Checklist

- [ ] Developer understands the "why" behind the story
- [ ] Acceptance criteria are clear and testable
- [ ] Design is reviewed (if applicable)
- [ ] Technical approach is discussed
- [ ] Dependencies and blockers identified
- [ ] Questions answered

### Output

Developer starts work with confidence. No surprises mid-development.

---

## Desk Check

**When**: Before a PR is raised (code complete, locally tested)

**Who**: Developer, Designer (if UI involved), BA/PM

**Duration**: 10-20 minutes

### Purpose

- Verify implementation matches requirements
- Catch UX/design issues early
- Get early feedback before formal PR review
- Reduce review cycles

### Checklist

- [ ] Demo the feature locally
- [ ] Walk through acceptance criteria
- [ ] Designer confirms visual/UX implementation
- [ ] BA/PM confirms business logic
- [ ] Edge cases demonstrated
- [ ] Any concerns raised and addressed

### Output

PR is raised with confidence that it will pass review. Faster merge times.

---

## The Golden Rule for PR Times

> **PR review time should be half the development time.**

| Development Time | Target PR Time |
|------------------|----------------|
| 1 day | 4 hours |
| 2 days | 1 day |
| Half day | 2 hours |

Story Kick Offs and Desk Checks help achieve this by:

1. **Reducing rework** - Fewer "this isn't what I expected" comments
2. **Front-loading feedback** - Issues caught before PR, not during
3. **Building shared context** - Reviewers already understand the change

---

## Flow

```
Ticket Created
     ↓
Story Kick Off  ← [Dev + Designer + BA/PM]
     ↓
Development
     ↓
Desk Check      ← [Dev + Designer + BA/PM]
     ↓
PR Raised
     ↓
Code Review     ← [Faster because context is shared]
     ↓
Merge & Deploy
```

---

## Tips for Success

### Story Kick Offs

- **Don't skip it** - Even for "simple" stories
- **Timebox it** - 15 mins max, schedule another if needed
- **Document decisions** - Add notes to the ticket
- **Ask "what could go wrong?"** - Surface risks early

### Desk Checks

- **Demo locally** - Don't wait for staging
- **Use real data** - Or realistic test data
- **Show edge cases** - Not just the happy path
- **Be open to feedback** - Better to change now than after PR review

---

## Related

- [Pull Request Manifesto](/overview/team-practices/01-pull-request-manifesto) - Code review practices
- [Definition of Done](/overview/team-practices/08-definition-of-done) - Quality checklist
- [User Stories & Acceptance Criteria](/overview/team-practices/09-user-stories-acceptance-criteria) - Writing good stories
- [Metrics Roadmap](/overview/team-practices/05-metrics-roadmap) - Measuring improvement
