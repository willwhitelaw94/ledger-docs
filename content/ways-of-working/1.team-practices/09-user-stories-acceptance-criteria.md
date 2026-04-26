---
title: "User Stories & Acceptance Criteria"
description: "Writing effective user stories and clear acceptance criteria"
---

Acceptance criteria define what must be true for a feature or user story to be accepted as complete by the Product Owner. They ensure alignment between design, development, and stakeholder expectations.

---

## General Acceptance Criteria

These apply to **all stories**:

- [ ] Tested on multiple devices and screen sizes
- [ ] All functionality works as intended
- [ ] Meets [Definition of Done](/overview/team-practices/08-definition-of-done) requirements

---

## Writing Acceptance Criteria

### Gherkin Format

Write acceptance criteria in **Gherkin format** for clarity:

```gherkin
Given I am a new user
When I land on the Services page
Then I should see a list of services filtered by category
And each service should have a short description and link to read more
```

### Structure

| Keyword | Purpose |
|---------|---------|
| **Given** | The initial context or state |
| **When** | The action or trigger |
| **Then** | The expected outcome |
| **And** | Additional conditions |

---

## Examples by Feature Type

### Contact Form

```gherkin
Given I am on the Contact page
When I fill in all required fields and submit the form
Then I should see a confirmation message
And the submission should be received in the associated systems
And all field validations should work as intended
```

### Benefit Calculator

```gherkin
Given I am using the Benefit Calculator
When I enter my details and calculate
Then the calculation should display correct results
And the visual representation should match the design
And print/download functions should work as intended
And the calculator should work on all devices and screen sizes
```

### Coordinator Hub

```gherkin
Given I am a logged-in coordinator
When I access the Coordinator Hub
Then I should see my dashboard and hub pages
And all pages should work on multiple devices and screen sizes
And print/download functions should work as intended
```

---

## Writing Good User Stories

### Format

```
As a [type of user]
I want [some goal]
So that [some reason/benefit]
```

### Example

```
As a care coordinator
I want to see a summary of my assigned packages
So that I can prioritise my workload for the day
```

### INVEST Criteria

Good user stories are:

| Criteria | Description |
|----------|-------------|
| **I**ndependent | Can be delivered separately |
| **N**egotiable | Details can be discussed |
| **V**aluable | Delivers value to users |
| **E**stimable | Can be sized by the team |
| **S**mall | Fits in a sprint |
| **T**estable | Has clear acceptance criteria |

---

## Acceptance Checklist

Before closing any ticket:

- [ ] All acceptance criteria are explicitly met
- [ ] General acceptance criteria satisfied
- [ ] [Definition of Done](/overview/team-practices/08-definition-of-done) complete
- [ ] **Product Owner has confirmed acceptance**

::callout{icon="i-lucide-check-circle" color="green"}
**Acceptance must be explicitly confirmed by the Product Owner before a ticket can be closed.**
::

---

## Related

- [Definition of Done](/overview/team-practices/08-definition-of-done) - Quality checklist
- [Story Kick Offs and Desk Checks](/overview/team-practices/10-story-kick-offs-desk-checks) - Starting and finishing stories
- [Sprint Estimation](/overview/team-practices/02-sprint-estimation) - Sizing stories
