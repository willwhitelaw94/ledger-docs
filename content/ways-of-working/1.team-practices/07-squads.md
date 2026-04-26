---
title: Squads
description: Team structure, domain ownership, and responsibilities
---

The Trilogy Care Digital Team is organised into specialised squads covering discovery, design, development, infrastructure, and data. Each squad has clear ownership and responsibilities.

---

## Organisation Structure

```mermaid
flowchart LR
    Discovery --> Design --> Dev --> Infra --> Data
```

---

## The Full Digital Team

### Discovery

| Member  |
| ------- |
| Will    |
| Cass    |
| Dave    |
| Steve   |
| Roman   |
| Slavo   |
| Phoebe  |

### Design

| Member |
| ------ |
| Ed     |
| Dave   |
| Beth   |
| Vic    |
| Ruby   |

### Dev Squads

| Squad      | Members                                        |
| ---------- | ---------------------------------------------- |
| **Pod 1**  | Tim, Oscar, Stuart, Lachlan, Leo, Ptr          |
| **Pod 2**  | Matt, Dave W, D'Arcy, Leo                      |
| **IM Pod 3** | Vishal, Alex C, Oliver, Sam, Max             |
| **Pod 4**  | Khoa, Elton, Nick, Vassilios, Rudy, Bianca     |

### Infra

| Member  |
| ------- |
| Jake    |
| Marcus  |
| Shannon |
| Sri Tech |

### Data

| Data Eng   | Kyte   | A2     |
| ---------- | ------ | ------ |
| Prabhu P   | Al     | Alister |
| Wellaiky   | Miller | Angus  |
|            | Todd   | Tim    |

---

## Domain Ownership Principles

### Each Squad Owns

- **Code**: All code within their domain directories
- **Data**: Database tables and schemas related to their domain
- **APIs**: Endpoints serving their domain
- **Tests**: Test coverage for their domain
- **Documentation**: Keeping domain docs current

### Cross-Squad Collaboration

When work spans multiple domains:

1. Identify the **primary domain** (where most change happens)
2. That squad **leads** the initiative
3. Other squads provide **support and review**
4. Use [Story Kick Offs](/overview/team-practices/10-story-kick-offs-desk-checks) to align early

### Shared Code

The `domain/Shared/` directory contains code used across multiple domains. Changes here require:

- Review from affected squads
- Consideration of backwards compatibility
- Clear documentation of changes

---

## Related

- [Customer Journey](/features/1.customer-journey) - How domains connect in the customer experience
- [Domains](/features/domains) - Detailed domain documentation
