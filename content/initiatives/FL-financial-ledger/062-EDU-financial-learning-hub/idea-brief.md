---
title: "Idea Brief: Financial Learning Hub"
---

# Idea Brief: Financial Learning Hub

**Created**: 2026-03-22
**Author**: William Whitelaw

---

## Problem Statement (What)

- Clients have varying financial literacy, yet every client sees the same reports with no educational context
- Practices spend significant time explaining the same concepts (BAS, distributions, depreciation) individually
- No structured way for practices to curate educational resources tailored to client situations
- The AI chatbot (021-AIQ) answers reactively but does not proactively guide learning
- Gamification (036-GMF) rewards operational tasks but not learning or comprehension
- Clients who do not understand their financials disengage, increasing churn

**Current State**: No education infrastructure. Practices use external tools (email, Loom, PDFs) to share knowledge. No curriculum structure, no progress tracking, no literacy measurement.

---

## Possible Solution (How)

1. **Learning Content Library** -- platform-seeded + practice-created articles, video embeds, calculators, quizzes. Organised by category and difficulty. Tagged by entity type relevance.
2. **Learning Paths** -- ordered curricula per entity type (e.g., "SMSF Compliance", "BAS & GST"). Practice-created custom paths. Progress tracking per user.
3. **Interactive Calculators** -- compound interest, tax estimator, retirement planner, loan repayment, net worth tracker. Pre-filled from workspace data.
4. **AI Learning Assistant** -- extends 021-AIQ with educational prompt. "Explain this to me" on reports. AI-generated quizzes. Personalised recommendations.
5. **Financial Literacy Score** -- per-user 0-100 score from completions, quizzes, tool usage, sessions. Gamification badges per level.
6. **Practice Content Curation** -- assign content/paths to clients. Completion tracking across the practice. Bulk assign to workspace groups.
7. **Advisory Session Booking** -- "Book a session" CTA linked to 016-CDB calendar. Topic pre-filled from content.

```
// Before: Client sees BAS report, calls accountant for 30-min explanation. Same question x10 clients/month.
// After:  Client clicks "Explain this" → AI explains → follows "BAS & GST" path → passes quiz → practice sees completion.
```

---

## Benefits (Why)

**Client**: Self-service education, personalised by entity type, reduces dependency on ad-hoc calls.
**Practice**: Educate at scale (create once, assign to many), track who needs attention, reduce repetitive explanations by 30-40%.
**Business**: No competitor (Xero, MYOB, QBO) offers embedded financial education. Increases engagement and retention. Natural upsell path.

**ROI**: 25-35% reduction in practice support time for foundational queries.

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | William Whitelaw (PO, Dev) |
| **A** | -- |
| **C** | -- |
| **I** | -- |

---

## Assumptions & Dependencies, Risks

**Assumptions**: Clients want to learn (validated by practice feedback on repetitive questions). Practices will create content (mitigated by seeded defaults). Quiz-based assessment is an acceptable literacy proxy.

**Dependencies**: 021-AIQ (complete), 036-GMF (complete), 016-CDB (complete), 027-PMV (complete), 051-EHS (complete).

**Risks**: Content quality (MEDIUM -- seed high-quality defaults). Adoption (MEDIUM -- integrate "Explain this" into existing flows). Scope creep into LMS (LOW -- no certificates, no SCORM, no video hosting).

---

## Estimated Effort

**XL -- 5-6 sprints**, building new infrastructure plus deep integrations.

- **Sprint 1**: Content model + CRUD + seeder
- **Sprint 2**: Learning paths + progress tracking + /learn hub
- **Sprint 3**: Interactive calculators (5 React components)
- **Sprint 4**: Quizzes + Financial Literacy Score + gamification badges
- **Sprint 5**: AI learning assistant + "Explain this" buttons
- **Sprint 6**: Practice curation dashboard + session booking + notifications

---

## Proceed to PRD?

**YES** -- Unique differentiator. Leverages five existing epics. Practices repeatedly cite "client education" as a pain point.

---

## Decision

- [ ] **Approved** - Proceed to PRD
- [ ] **Needs More Information** - [What's needed?]
- [ ] **Declined** - [Reason]

**Approval Date**: --

---

## Next Steps

**If Approved**:
1. [ ] `/trilogy-idea-handover` -- Gate 0 validation + create Linear epic
2. [ ] `/speckit-specify` -- Generate full specification
3. [ ] `/trilogy-clarify` -- Refine requirements across lenses

**If Declined**:
- Revisit after practice user research on education needs
