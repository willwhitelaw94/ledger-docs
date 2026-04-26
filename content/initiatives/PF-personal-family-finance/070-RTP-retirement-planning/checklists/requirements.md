---
title: "Requirements Checklist: Retirement Planning"
---

# Requirements Checklist: Retirement Planning

**Epic**: 070-RTP Retirement Planning
**Created**: 2026-03-22
**Status**: Not Started

---

## Retirement Profile

- [ ] **FR-001**: 3-step onboarding wizard with only step 1 required
- [ ] **FR-002**: Per-user (non-tenant-scoped) retirement profile with jurisdiction field defaulting to "AU"
- [ ] **FR-003**: Sensible defaults for all fields (retirement age 67, life expectancy 90, legislated SG rate, zero contributions)
- [ ] **FR-004**: Home ownership status field (owner without mortgage, owner with mortgage, renter)
- [ ] **FR-005**: Optional business exit value and exit year
- [ ] **FR-006**: "Learn more" tooltip on every profile field

## Projection Engine

- [ ] **FR-007**: Two-phase year-by-year simulation (accumulation then drawdown)
- [ ] **FR-008**: Compound annual returns mapped from risk tolerance (conservative 5%, balanced 6.5%, growth 8%, aggressive 9.5%)
- [ ] **FR-009**: Inflation-adjusted withdrawals at configurable CPI rate (default 2.5%)
- [ ] **FR-010**: Reduced return rate in drawdown phase (accumulation rate minus 1.5%)
- [ ] **FR-011**: Shortfall detection and reporting (age at which funds are exhausted)
- [ ] **FR-012**: Personal workspace asset aggregation (investments, cash, property) into retirement asset base
- [ ] **FR-013**: Live asset prices from feed links (049-APF) with fallback to static values
- [ ] **FR-014**: Projection caching with invalidation on profile, asset, or variable changes

## Australian Superannuation Rules

- [ ] **FR-015**: Legislated SG rate schedule (11.5% FY2025-26, 12% FY2027-28 onwards)
- [ ] **FR-016**: Concessional contribution cap ($30,000/year, indexed at 3%) with excess treated as non-concessional
- [ ] **FR-017**: Non-concessional contribution cap ($120,000/year, 4x concessional)
- [ ] **FR-018**: 15% contributions tax on concessional contributions
- [ ] **FR-019**: Preservation age lookup from birth year (default 60 for post-30 June 1964)
- [ ] **FR-020**: Transfer balance cap warning when projected balance exceeds $1,900,000
- [ ] **FR-021**: Versioned configuration for all super rules (not hardcoded)
- [ ] **FR-022**: User-overridable employer SG rate for above-minimum employers

## Scenario Integration

- [ ] **FR-023**: Retirement-specific variables registered with 068-SPE (target age, desired income, extra contributions, return rate, inflation rate, business exit value, business exit year)
- [ ] **FR-024**: Registered as scenario projector with 068-SPE
- [ ] **FR-025**: Up to 3 named retirement scenarios for side-by-side comparison
- [ ] **FR-026**: No standalone scenario CRUD — consumes 068-SPE shared capabilities

## Goal Integration

- [ ] **FR-027**: Auto-created Goal with type "Retirement" on profile creation
- [ ] **FR-028**: Auto-updated goal current value and progress history on projection recompute
- [ ] **FR-029**: Retirement goal visible in existing goals dashboard

## Couples Planning

- [ ] **FR-030**: Partner profile linking via email invitation
- [ ] **FR-031**: Individual projections per partner plus combined household projection
- [ ] **FR-032**: Combined projection accounts for different retirement ages
- [ ] **FR-033**: Unlinking removes combined view without affecting individual projections

## Practice Advisory View

- [ ] **FR-034**: Read-only "Retirement" tab on practice client detail page
- [ ] **FR-035**: Advisory notes on client retirement projections (polymorphic notes)
- [ ] **FR-036**: Practice advisors cannot edit client retirement profiles
- [ ] **FR-037**: "Retirement Reviews" dashboard widget for practice workspaces

## Regulatory Compliance

- [ ] **FR-038**: Persistent, non-dismissable disclaimer on every retirement projection page
- [ ] **FR-039**: Disclaimer appended to every AI chatbot retirement response
- [ ] **FR-040**: Practice views labelled "Client Projection" — never "Financial Plan" or "Recommendation"
- [ ] **FR-041**: AI uses descriptive language only — no directive language ("you should")

## Navigation & Access

- [ ] **FR-042**: "Retirement" nav item in personal workspace between "Net Worth" and "Settings"
- [ ] **FR-043**: Only the profile owner can create or edit their retirement profile

---

## User Stories

- [ ] **US-01** (P1): Set Up a Retirement Profile — 3-step wizard, sensible defaults, per-user storage
- [ ] **US-02** (P1): View My Retirement Projection — two-phase timeline chart, shortfall detection, inflation adjustment
- [ ] **US-03** (P1): Compare Retirement Scenarios — 068-SPE integration, named scenarios, overlay comparison
- [ ] **US-04** (P1): Automatic Retirement Goal Tracking — auto-created goal, auto-updated progress
- [ ] **US-05** (P1): Australian Superannuation Rules Engine — SG schedule, caps, preservation age, contributions tax
- [ ] **US-06** (P2): Regulatory Disclaimer Framework — persistent disclaimers, no directive language
- [ ] **US-07** (P2): Couples Retirement Planning — linked profiles, individual + combined views
- [ ] **US-08** (P2): Practice Advisory View — read-only client projections, advisory notes, retirement tab
- [ ] **US-09** (P3): AI Retirement Trajectory Insights — chatbot integration, natural language summaries
- [ ] **US-10** (P3): Practice Retirement Overview Widget — client trajectory status table, sorted by urgency

---

## Success Criteria

- [ ] **SC-001**: Onboarding wizard completable in under 3 minutes
- [ ] **SC-002**: Projection displays within 2 seconds
- [ ] **SC-003**: Projection accuracy within 1% of manual calculation
- [ ] **SC-004**: Disclaimer visible on 100% of retirement surfaces
- [ ] **SC-005**: 30%+ personal workspace users create a profile within 60 days
- [ ] **SC-006**: 25%+ higher 90-day retention for profile creators
- [ ] **SC-007**: 80%+ practice advisors rate client view as useful
- [ ] **SC-008**: Scenario comparison loads within 3 seconds
- [ ] **SC-009**: Zero instances of directive language in system outputs

---

## Edge Cases Verified

- [ ] Zero super balance produces valid projection (SG-only accumulation)
- [ ] Desired income exceeding sustainable withdrawal shows shortfall clearly
- [ ] Concessional cap excess correctly reclassified as non-concessional
- [ ] Non-AU users get generic drawdown projections without AU super rules
- [ ] Linked partners with different risk tolerances use individual rates
- [ ] Date of birth change recomputes preservation age and all projections
- [ ] Practice advisor sees "no profile" message for clients without retirement profiles
- [ ] Target retirement age below preservation age shows informational note
- [ ] Business exit value correctly injected as one-time inflow in specified year
