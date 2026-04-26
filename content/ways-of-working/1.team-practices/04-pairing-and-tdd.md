---
title: Pairing & TDD
description: Pair programming and test-driven development practices
---

A developer typically writes code alone. **Pair programming** is a practice where two developers work together on a task—whether software design, algorithms, coding, or testing.

The rationale: **two minds are better than one.**

If done correctly, pair programming yields better software, faster, and at lower cost.

---

## Why Pair?

- Knowledge sharing across the team
- Fewer bugs caught in review
- Better design decisions made in real-time
- Onboarding accelerator for new team members
- Keeps focus high (harder to get distracted)

---

## Test-Driven Development (TDD)

TDD is a style of programming where three activities are tightly interwoven: **coding**, **testing**, and **design** (refactoring).

### The TDD Cycle

```text
1. Write a "single" unit test describing an aspect of the program
2. Run the test — it should FAIL (program lacks the feature)
3. Write "just enough" code to make the test pass
4. Refactor the code until it meets simplicity criteria
5. Repeat, accumulating unit tests over time
```

::callout{icon="i-lucide-repeat"}
**Red → Green → Refactor**

Write a failing test. Make it pass. Clean up the code. Repeat.
::

---

## Why TDD?

| Benefit                    | Description                             |
| -------------------------- | --------------------------------------- |
| **Improved code quality**  | Tests catch issues early                |
| **Higher test coverage**   | Tests written alongside code, not after |
| **Faster debugging**       | Failing tests pinpoint problems         |
| **Better design**          | Testable code tends to be well-designed |
| **Easier refactoring**     | Tests give confidence to change code    |
| **Catch regressions fast** | Existing tests protect against breaks   |

---

## Why Pairing + TDD Together?

- Pairing helps maintain TDD discipline
- **Ping pong** method relies on TDD structure
- Real-time code review happens naturally
- Knowledge transfer is continuous

---

## Pairing Patterns

### Ping Pong

1. **Dev A** writes a test
2. **Dev B** writes code to pass the test
3. **Dev B** writes the next test (or improves the current one)
4. **Dev A** writes code to pass
5. Rinse and repeat

### Driver / Navigator

- **Driver**: Writes the code, focuses on the immediate task
- **Navigator**: Reviews, thinks ahead, considers the bigger picture
- Swap roles frequently (every 15-30 minutes)

---

## Tips for Success

### Pairing - Do's

- **Swap driver frequently** - keeps both engaged
- Use **ping-pong & driver/navigator** to encourage collaboration
- **Pair every sprint** - recommendation: half a day each week
- If there are office days, use those for pairing
- **Swap pairs** to spread knowledge across the team

### Pairing - Don'ts

- **"Watch the Master" anti-pattern** - both people should contribute
- Assume you're always right
- Pair for **more than 5 hours/day** - research shows diminishing returns after 5 hours (higher cognitive load)

---

### TDD - Do's

- Write failing tests first
- Take **"baby steps"** - small increments
- Remember to refactor
- Refactor tests as well as code
- Roll back if you break lots of tests

### Learning - Do's

- Hold regular **"learning hours"**
- Learn other techniques: Golden Master, Property-Based Testing, and more

---

## Learn More

### Pairing Resources

- **Video**: [To Pair or Not to Pair](https://www.youtube.com/watch?v=u_eZ-ae2FY8) (17 min)
- **Overview**: [On Pair Programming](https://martinfowler.com/articles/on-pair-programming.html)
- **Variations**: Mob Programming, Dev/Test Pairing, BA/Dev Pairing

### AI-Assisted Pairing

Pair programming concepts extend to working with AI:

::callout{icon="i-lucide-bot"}
**[Pair Prompting →](/ways-of-working/claude-code-advanced/07-pair-prompting)**

Apply pairing principles when working with Claude Code. The AI becomes your pair—you drive the intent, it helps with implementation.
::

---

## Related

- [Pair Prompting](/ways-of-working/claude-code-advanced/07-pair-prompting) - AI-assisted pair programming
- [Pull Request Manifesto](/overview/team-practices/01-pull-request-manifesto) - Code review practices
- [Story Kick Offs and Desk Checks](/overview/team-practices/10-story-kick-offs-desk-checks) - Starting and finishing well
