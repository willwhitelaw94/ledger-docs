---
title: "Business: Practice Specialisation & Module Gating"
---

# Business: Practice Specialisation & Module Gating

## Executive Summary

Practice Specialisation & Module Gating transforms MoneyQuest from a general-purpose accounting platform into a practice-type-aware financial ecosystem. Today, every practice — whether a bookkeeper, accountant, financial planner, or wealth advisor — sees the same modules, the same dashboard, and the same workspace features. This creates noise for practices (bookkeepers see tax compliance modules they will never use) and, critically, blocks MoneyQuest from entering the wealth advisory market — the highest-value practice segment.

This epic introduces practice types (an enum-driven classification), automatic module gating (practice type determines which features are available to connected client workspaces), a family tree / org chart visualisation (the visual hierarchy of entities within a family group), and a dedicated wealth advisor dashboard (total AUM, per-family org charts, aggregated alerts). Together, these capabilities open a new market segment, simplify module management for all practice types, and deliver the "family-first" UX that positions MoneyQuest as a wealth visibility platform — not just an accounting tool.

## Business Problem

### Current State
- All practices are treated identically — no concept of practice specialisation or type
- Every practice sees every module regardless of relevance (bookkeepers see tax, estate planners see BAS)
- The platform has no dedicated offering for wealth advisors — a practice managing $50M across a family group gets the same view as a sole trader doing their own books
- Family groups (038-FGP) and consolidation (028-CFT) exist as backend data structures, but there is no visual family tree that shows entity hierarchy with rolled-up financials
- Module configuration is per-workspace via manual feature flags — there is no practice-level automation

### Pain Points
- **Module noise**: Practices see features irrelevant to their specialisation, creating clutter and confusion. A bookkeeping practice has no use for BAS compliance workflows or wills modules.
- **No wealth advisory market access**: Wealth advisors work in terms of families and entity structures, not individual workspaces. Without a family-centric view, MoneyQuest cannot serve this segment.
- **Manual module management**: Enabling modules per workspace is tedious for practices managing 20+ client workspaces. One practice type setting should control modules for all connected workspaces.
- **Invisible entity structures**: Complex family structures (trusts, companies, SMSFs, personal) exist as flat lists of workspaces. Advisors cannot see the relationships between entities at a glance.
- **No advisor-level metrics**: Wealth advisors need total AUM, per-family net worth, and cross-family alerts. The current practice dashboard shows per-workspace cards with no aggregation.

### Opportunity
- Open MoneyQuest to the wealth advisory market — a high-value segment where competitors are weak
- Automate module management via practice-level typing — reducing operational overhead and improving UX
- Deliver a "family tree" visualisation that no direct competitor offers (not Xero, not MYOB, not Class Super)
- Position MoneyQuest as a wealth visibility platform aligned with the $1T AUM vision
- Create a premium pricing tier for wealth advisory practices based on AUM under management

## Business Objectives

### Primary Goals
1. **Open the wealth advisory market** — deliver purpose-built features (family tree, AUM dashboard, aggregated alerts) that make MoneyQuest compelling for wealth advisors and family office operators
2. **Automate module gating** — one practice type setting controls module access for all connected workspaces, eliminating per-workspace manual configuration
3. **Deliver family-first UX** — the org chart visualisation makes complex multi-entity structures comprehensible at a glance, for both advisors and family members

### Secondary Goals
4. **Reduce module noise** — bookkeepers only see core ledger, banking, and invoicing; accountants see tax and compliance; each practice type sees exactly what is relevant
5. **Enable premium pricing** — wealth advisory practices command higher fees and manage higher AUM, justifying a premium billing tier
6. **Increase platform stickiness** — the family tree and consolidated AUM view create a network effect: the more entities in the tree, the more valuable the platform becomes
7. **Foundation for future vertical specialisation** — the practice type framework enables future verticals (e.g., property management, agriculture) without architectural changes

### Non-Goals
- Building a full financial planning tool (goal projections, retirement modelling, insurance analysis)
- Replacing dedicated wealth advisory platforms (Class Super, BGL, Praemium) for SMSF administration
- Automated ownership percentage tracking or beneficial interest modelling
- Real-time market data feeds for investment portfolios on tree nodes

## Success Metrics & KPIs

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Wealth advisory practice signups | 0 (no wealth advisory offering) | 20 practices within 6 months of launch | Registration with `wealth_advisory` specialisation |
| AUM under platform | Measurable via 028-CFT net worth data | $500M total AUM across wealth advisory practices within 12 months | Sum of all wealth advisory practice client groups' net worth |
| Module adoption by practice type | 0% (no type-based gating) | 80% of practices have set a type within 90 days of migration | Practices with at least one specialisation set |
| Module noise reduction | N/A (subjective, no baseline) | 50% fewer visible navigation items for bookkeeping practices vs current state | Count of sidebar nav items before/after by practice type |
| Practice onboarding completion rate | Current 027-PMV completion rate (baseline to be measured) | 10% improvement in onboarding completion after adding practice type step | Wizard step completion analytics |
| Family tree engagement | 0 (new feature) | 60% of wealth advisory practices view the family tree at least weekly | Page view analytics for org chart component |
| Advisor dashboard daily active usage | 0 (new feature) | 40% of wealth advisory practice users open the dashboard daily | Dashboard page view analytics |

### Leading Indicators
- Weekly org chart page views per wealth advisory practice (engagement)
- Number of family groups created by wealth advisory practices (adoption)
- Practice type changes from default "Accounting" to other types (self-identification)
- Module registry API call frequency (frontend utilisation)

### Lagging Indicators
- Wealth advisory practice retention at 6 and 12 months (stickiness)
- AUM growth rate across platform (value accumulation)
- Premium tier conversion rate for wealth advisory practices (revenue)
- Support ticket volume related to module visibility ("why do I see this feature?")

## Stakeholder Analysis

| Stakeholder | Role | Interest | RACI |
|-------------|------|----------|------|
| Wealth advisors | Primary target user — manage family wealth across entity structures | High — purpose-built dashboard and family tree view | Responsible (use daily) |
| Accounting practices | Existing users — benefit from module gating and reduced noise | Medium — module gating improves their UX but is not a new capability | Informed |
| Bookkeeping practices | Existing users — benefit most from noise reduction | Medium — simplified interface improves daily workflow | Informed |
| Financial planning practices | Target user — Goals, Cash Flow Forecasting gated to their type | Medium — validates that the platform serves their specialisation | Responsible (use modules) |
| Estate planning practices | Target user — Wills, Family Group gated to their type | Medium — niche segment but high-value per client | Responsible (use modules) |
| Family members (Viewers) | End users — see the family tree and net worth via group invitations | High — the visual tree is their primary interface to family wealth | Informed |
| Product (William) | Feature owner — defines scope and priorities | High — strategic feature opening a new market | Accountable |

## Business Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Scope creep on org chart** — the tree visualisation could expand into a full entity management tool | Medium — delays delivery, dilutes focus | High | V1 tree is read-only visualisation only. Hierarchy editing stays in 028-CFT. No ownership modelling. Strict scope boundaries in spec. |
| **Wealth advisory market validation** — wealth advisors may prefer dedicated tools (Class, BGL, Praemium) over a generalist platform | High — investment in features with low adoption | Medium | Target wealth advisors who already use or are evaluating MoneyQuest for accounting. The tree and AUM dashboard are incremental features, not a full competing product. Low marginal cost if adoption is lower than expected. |
| **Module gating complexity** — multi-practice, multi-type module union calculations may produce unexpected results | Medium — workspace has modules nobody expects | Low | Union semantics are simple and predictable. The module registry API provides transparency. Workspace settings shows "Enabled by [Practice] — [Type]" for every module. |
| **Migration disruption** — existing practices may be confused by the default type assignment | Low — one-time event | Medium | Default to "Accounting" (the most common type). One-time banner with clear CTA to change. No modules revoked during migration. Same pattern successfully used in 027-PMV per-accountant migration. |
| **Performance — large family trees** — rendering 20+ entity trees with financial data may be slow | Medium — poor UX for the highest-value users | Low | Async node data loading (structure first, financial data per-node). 5-minute cache from 028-CFT. 2-second render target in success criteria. Virtual rendering for 20+ nodes. |
| **Dependency chain** — full feature requires 028-CFT, 038-FGP, 051-EHS | Medium — incomplete experience if dependencies missing | Low | Graceful degradation specced for every dependency. Tree works without net worth (028-CFT). Tree works without health badges (051-EHS). Core module gating has zero dependencies. |

## ROI Analysis

### Investment
- **Development effort**: L-sized epic (3-4 sprints) — Practice type enum + migration, module gating engine, org chart component, wealth advisor dashboard
- **Infrastructure**: Minimal — reuses existing 028-CFT consolidation engine, existing feature flag infrastructure, existing group hierarchy data model
- **Ongoing**: Near-zero incremental cost — no new databases, no new external services, no new data pipelines

### Expected Returns

**Revenue — Premium Wealth Advisory Tier**
- Wealth advisory practices are the highest-value practice type. They manage more entities, require more features, and have higher AUM under management
- A wealth advisory billing tier at 2-3x the standard practice tier is justified by the exclusive dashboard, family tree, and consolidated AUM features
- Target: 20 wealth advisory practices x $200/month premium = $48,000/year incremental revenue within 12 months

**Retention — Platform Stickiness**
- The family tree creates a network effect: each new entity added to the tree increases the platform's value to the advisor and the family
- Module gating reduces noise, making the platform feel purpose-built rather than generic — reducing the "this isn't for me" churn driver
- Wealth advisors with 10+ entities in a family tree have extremely high switching costs

**Operational Efficiency — Module Management**
- Practice-level module gating eliminates per-workspace feature flag configuration
- One setting (practice type) replaces N settings (one per connected workspace per module)
- For a practice with 50 workspaces, this is a 50x reduction in configuration overhead

**Market Expansion — New Customer Segment**
- Wealth advisory is a $20B global market that MoneyQuest currently does not serve
- No direct competitor in the Australian market offers a family tree + consolidated AUM view integrated with a ledger platform
- First-mover advantage in the intersection of accounting ledger and wealth visualisation

### Payback Period
- Expected within 6 months for the module gating features (immediate operational efficiency gains)
- Expected within 12 months for the wealth advisory features (new customer acquisition timeline)
- Break-even point: 10 wealth advisory practice signups at the premium tier

## Market Context

### Target Users
1. **Wealth advisors and family office operators** — manage complex family structures across trusts, companies, SMSFs, and personal entities. Need a consolidated view of family wealth with visual hierarchy.
2. **Multi-specialisation accounting practices** — firms that do both accounting and financial planning. Need module gating that reflects their dual specialisation.
3. **Bookkeeping practices** — want a simplified interface without tax, compliance, and planning modules cluttering their workspace.
4. **Estate planning lawyers** — managing client estates with wills, trusts, and asset registers. Need the estate-specific module set.

### Competitive Landscape

| Competitor | Practice Types | Module Gating | Family Tree | Wealth Dashboard |
|-----------|---------------|---------------|-------------|-----------------|
| **Xero Practice Manager** | No type concept — all practices see all modules | No — manual per-client feature toggles | No | No |
| **MYOB Practice** | No type concept | No | No | No |
| **Class Super** | SMSF-specific only | Implicit — only SMSF modules exist | No | Portfolio dashboard (SMSF-only) |
| **BGL** | SMSF + corporate compliance | Implicit by product (BGL Simple Fund, CAS 360) | No | Fund-level dashboard |
| **Praemium** | Investment platform | N/A — not an accounting tool | No | Portfolio-level (investments only) |
| **Karbon** | No type concept | No | No | No |
| **TaxDome** | No type concept | No | No | No |
| **MoneyQuest (this epic)** | 5 practice types with multi-specialisation | Automatic module gating by practice type | Visual org chart with net worth + health | AUM dashboard with per-family drill-down |

### Key Differentiators
- **No competitor offers practice-type-driven module gating** — all competitors show all features to all practices, creating noise
- **No competitor offers a family tree view with financial data on nodes** — Class and BGL have fund-level views but not multi-entity family trees
- **No competitor integrates an accounting ledger with a wealth visualisation dashboard** — wealth platforms (Praemium, HUB24) do not have ledger capabilities; accounting platforms (Xero, MYOB) do not have wealth views

### Timing Considerations
- The wealth advisory market in Australia is consolidating — advisors are looking for platforms that can serve multiple entity types, not just SMSFs
- 038-FGP (Family Group Portal) and 028-CFT (Consolidation) provide the data infrastructure — this epic delivers the UX layer on top
- Shipping before competitors recognise the ledger-to-wealth-visualisation opportunity provides first-mover advantage

## Business Clarifications

### Session 2026-03-21

**Q1: Is wealth advisory the primary business driver, or is module gating?**

**Decision**: Both, but they serve different strategic purposes. Module gating is a platform hygiene feature — it makes every practice's experience better by removing irrelevant modules. It has broad impact but low revenue uplift. Wealth advisory is a market expansion play — it opens a new customer segment with premium pricing potential. Module gating ships first (Sprint 1) because it is prerequisite infrastructure. The wealth advisory dashboard ships second (Sprint 3) as the revenue-generating feature.

**Q2: What is the pricing strategy for wealth advisory practices?**

**Decision**: Wealth advisory is a premium tier, priced at 2-3x the standard practice tier. Justification: wealth advisory practices manage more entities, require more advanced features (consolidation, org chart, AUM tracking), and the value delivered (family wealth visibility) commands premium positioning. Exact pricing to be finalised during billing tier review. The feature is not gated behind Enterprise — it is a specialisation-based premium, not a plan-tier feature.

**Q3: How do we validate demand for wealth advisory features before full build?**

**Decision**: The feature set is intentionally incremental — the org chart and dashboard are built on existing infrastructure (028-CFT consolidation, 038-FGP groups). Development cost is 3-4 sprints, which is manageable risk for market exploration. Post-launch, measure: wealth advisory practice signups (target 20 in 6 months), weekly org chart views (target 60% of wealth practices), and AUM accumulation (target $500M in 12 months). If adoption is below 50% of targets at 6 months, reassess the wealth advisory positioning.

**Q4: Should module gating be hard or soft? Can workspace owners override practice-driven modules?**

**Decision**: Hard gating for practice-driven modules — workspace owners cannot disable modules that their connected practice enables. Workspace owners CAN enable additional modules that are not in their practice's set (self-service module access). This means practice type is a floor, not a ceiling. Rationale: if a bookkeeper's client wants to enable Tax (perhaps they are switching accountants), they should be able to. But the bookkeeping practice should not be burdened with tax modules in their own view.

**Q5: What is the risk of the PracticeType enum becoming stale as new modules are added?**

**Decision**: Low risk. The ModuleRegistry service is the single source of truth — when a new epic adds a module, the registry mapping is updated in one place. The PracticeType enum itself rarely changes (adding a new practice type is a significant business decision, not a routine code change). The more common operation is adding a module to an existing type's mapping, which is a one-line change in the registry service.

**Q6: How does this interact with the existing PlanTier billing system?**

**Decision**: Orthogonal systems. PlanTier (Trial, Starter, Professional, Enterprise) controls workspace-level capabilities (storage quotas, user limits, feature tiers). PracticeType controls which modules are visible. A workspace on the Starter plan connected to a wealth advisory practice sees wealth advisory modules — but may have Starter-level limits on storage or users. The two systems do not conflict because they gate different things: PlanTier gates capacity, PracticeType gates functionality.

**Q7: Should the family tree be available to non-wealth-advisory practices?**

**Decision**: The family tree component is technically available to any practice that has the `estate_planning` or `wealth_advisory` specialisation (both include Family Group Portal in their module set). However, the full wealth advisor dashboard (AUM tracking, per-family cards, aggregated alerts) is exclusive to `wealth_advisory`. This means estate planners can see individual family trees but do not get the advisor-level overview dashboard.

**Q8: What is the expected AUM per wealth advisory practice?**

**Decision**: The target is $25M average AUM per wealth advisory practice. This assumes an average of 10 families per practice, each with $2.5M average net worth across 3-4 entities. At 20 practices, total platform AUM reaches $500M. At 40 practices (12-month target), total platform AUM reaches $1B — 0.1% of the $1T vision.

**Q9: How does this position MoneyQuest against dedicated SMSF administration platforms?**

**Decision**: MoneyQuest does not compete with Class Super or BGL on SMSF administration (compliance returns, audit trail, regulatory reporting). MoneyQuest's SMSF capability is general ledger accounting for the SMSF entity. The wealth advisory differentiator is the family-level view: an SMSF alongside a trust, a company, and a personal ledger — all in one tree with consolidated net worth. Class and BGL cannot do this because they only see the SMSF, not the rest of the family.

**Q10: Is there a risk of overwhelming practices with the new onboarding step?**

**Decision**: Minimal risk. The practice type selection is a single step with 5 clear options, each with a description. It takes under 10 seconds to complete. It replaces the current dead-end (no type selection at all) with a purposeful choice that immediately improves the user's experience by showing only relevant modules. The 027-PMV onboarding already has 4 steps — adding a 5th (or integrating into the Firm Details step) is a marginal increase. User testing during beta will validate whether it feels natural or burdensome.

## Approval

- [ ] Business objectives approved
- [ ] Success metrics defined and baselines established
- [ ] Stakeholders aligned on scope and non-goals
- [ ] Wealth advisory pricing tier confirmed with billing/pricing team
- [ ] Practice type migration plan reviewed for existing practices
- [ ] Competitive positioning validated against Class Super, BGL, Xero PM
