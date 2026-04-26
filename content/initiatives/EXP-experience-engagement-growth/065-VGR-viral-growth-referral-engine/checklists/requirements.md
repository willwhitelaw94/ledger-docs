---
title: "Requirements Checklist: Viral Growth & Referral Engine"
---

# Requirements Checklist: 065-VGR

## Content Quality

- [x] No implementation details (no mention of Laravel, React, database tables, APIs)
- [x] Focused on user value and business outcomes
- [x] Written in plain English for business stakeholders
- [x] Active voice throughout
- [x] Concrete examples where needed

## Requirement Completeness

- [x] All functional requirements are testable (Given/When/Then format for stories)
- [x] Success criteria are measurable with specific metrics
- [x] Success criteria are technology-agnostic
- [ ] 1 NEEDS CLARIFICATION marker remaining (FR-021: anti-fraud review process)
- [x] All user stories meet INVEST criteria
- [x] Edge cases documented (7 scenarios)
- [x] Key entities defined with clear descriptions

## INVEST Validation

| Story | I | N | V | E | S | T | Notes |
|-------|---|---|---|---|---|---|-------|
| S1 — Referral Attribution | Pass | Pass | Pass | Pass | Pass | Pass | Foundation for all other stories |
| S2 — Personal Referral Links | Pass | Pass | Pass | Pass | Pass | Pass | Independent of job sharing |
| S3 — Funnel Tracking | Pass | Pass | Pass | Pass | Pass | Pass | Depends on S1 for attribution data |
| S4 — Free Tier + Onboarding | Pass | Pass | Pass | Pass | Pass | Pass | Extends existing billing infra |
| S5 — Referral Rewards | Pass | Pass | Pass | Pass | Pass | Pass | Requires S1 + paid upgrade |
| S6 — Growth Dashboard | Pass | Pass | Pass | Pass | Pass | Pass | Depends on S3 for funnel data |
| S7 — Workspace Controls | Pass | Pass | Pass | Pass | Pass | Pass | Fully independent |
| S8 — Upgrade Prompts | Pass | Pass | Pass | Pass | Pass | Pass | Requires S4 free tier |

## Feature Readiness

- [x] Acceptance criteria defined for all 8 user stories (43 scenarios total)
- [x] Stories prioritised (P1 through P4)
- [x] Dependencies on existing epics documented (022-CPV, 009-BIL, 003-AUT, 024-NTF)
- [x] Builds on verified existing infrastructure (JobShareToken, PlanTier, FeatureGate, Pennant)
- [x] Clear MVP boundary: S1 + S2 (attribution + personal links) are independently shippable

## Open Items

1. **FR-021**: Anti-fraud review — should suspicious referral patterns be auto-rejected or held for manual review?
