---
title: "Idea Brief: Viral Growth & Referral Engine"
---

# Idea Brief: Viral Growth & Referral Engine

**Created**: 2026-03-22
**Author**: William Whitelaw

---

## Problem Statement (What)

- 022-CPV built the job share link and public dashboard — but there's no funnel tracking from "viewer" to "registered user" to "paying customer"
- Referral codes exist (MQ-{prefix}) but are not attributed to the referring user or workspace — no way to measure or reward growth
- Free tier activation on CPV signup is not wired — new registrants land in a standard onboarding with no context about the job they just viewed
- Businesses sharing job links have zero visibility into whether anyone viewed, registered, or imported from their links
- No incentives for existing users to refer friends/colleagues — the only growth lever is organic job sharing
- Workspace admins cannot enable/disable sharing at the workspace level or bulk-manage tokens

**Current State**: Job share links drive anonymous views. No attribution, no conversion tracking, no referral rewards, no free tier auto-provisioning. Every registration from a share link looks identical to a cold signup.

---

## Possible Solution (How)

**1. Conversion Funnel & Attribution**
- Track the full funnel: share link created → viewed → password entered → CTA clicked → registered → job imported → upgraded to paid
- Attribute registrations to the referring user/workspace via referral code on the user record
- Event-sourced funnel events for accurate replay and reporting

**2. Free Tier Auto-Provisioning**
- CPV signups auto-land on a free personal workspace with the shared job pre-imported
- Feature-flagged limits: 1 workspace, basic reports, limited transactions
- Contextual onboarding: "You're viewing [Job Name] from [Business]. Want to track it in your own books?"

**3. Refer-a-Friend Program**
- Any user can generate a personal referral link (not just job shares)
- Referral rewards: credit towards paid plan, extended trial, or feature unlocks
- Dual-sided: referrer gets credit when referee upgrades to paid; referee gets extended trial
- Referral dashboard: see who you've referred, their status, rewards earned

**4. Growth Analytics for Businesses**
- Per-job share analytics: views, unique visitors, registrations, imports
- Workspace-level dashboard: total referral conversions, top-performing share links
- Leaderboard for practices: which advisor drives the most client registrations

**5. Workspace Sharing Controls**
- Workspace-level toggle: enable/disable all job sharing
- Bulk revoke all active tokens
- Default share options (password required, expiry policy)

```
// Before
1. Business shares job link
2. Client views dashboard
3. Client clicks "Create account" → standard registration
4. No attribution, no context, no free tier
5. Business has no idea if anyone even looked

// After
1. Business shares job link (or personal referral link)
2. Client views dashboard → funnel event tracked
3. Client clicks CTA → registers with referral attribution
4. Auto-provisioned free workspace with job pre-imported
5. Business sees: "3 views, 1 registration, 1 import" on their dashboard
6. Referrer earns credit when referee upgrades
```

**Key components:**
- `ReferralAttribution` model — tracks referral code → user → source (job share or personal link)
- Funnel event pipeline — extends existing event sourcing for growth events
- Free tier feature flags — Laravel Pennant gates on plan tier
- Referral reward ledger — credit/debit tracking for referral incentives
- Growth analytics API — per-job, per-workspace, per-user metrics
- Workspace sharing policy — admin controls for token management

---

## Benefits (Why)

**User/Client Experience**:
- Seamless onboarding from share link to own workspace with job already imported
- Referral rewards give existing users a reason to invite colleagues and clients

**Business Value**:
- **Measurable PLG funnel**: every share link becomes a trackable growth event with conversion metrics
- **Compounding network effect**: 100 businesses × 50 jobs × 5% conversion = 250 new users/cycle at ~$0 CAC
- **Referral multiplier**: personal referral links extend growth beyond job shares to any user-to-user invitation
- **Practice incentive**: advisors who drive client registrations see it in their dashboard — reinforces the behavior
- **Upsell pipeline**: free tier → hitting limits → upgrade prompt → paid plan with clear trigger points

**Operational Efficiency**:
- Workspace sharing controls reduce support load (bulk revoke, default policies)
- Attribution data informs which features/workflows drive the most conversions

**ROI**: At 5% conversion on shared job links alone — before personal referrals — the CAC is effectively $0. Referral credit costs are offset by LTV of converted users.

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | — (PO), — (Des), — (Dev) |
| **A** | — |
| **C** | — |
| **I** | — |

---

## Assumptions & Dependencies, Risks

**Assumptions**:
- 022-CPV job sharing infrastructure is stable and complete (it is)
- Free tier is commercially viable (feature-flagged, limited enough to drive upgrades)
- Users are motivated by referral credits (needs validation)
- Practices will value a referral leaderboard (needs validation)

**Dependencies**:
- 022-CPV Client Portal & Viral Growth (complete) — share tokens, public dashboard, import
- 009-BIL Billing & Monetisation (complete) — PlanTier, FeatureGate, limits
- 003-AUT Auth & Multi-tenancy (complete) — registration, workspace creation
- 024-NTF Notifications (complete) — referral reward notifications
- Laravel Pennant feature flags (in place)

**Risks**:
- Referral abuse / fake accounts for credits (MEDIUM) → Mitigation: require email verification + paid upgrade before credit payout; rate limit referral code usage
- Free tier too generous → no upgrade incentive (MEDIUM) → Mitigation: tight limits (1 workspace, 50 transactions/month, no multi-currency); A/B test thresholds
- Low referral adoption (LOW) → Mitigation: in-app prompts at natural share moments (job creation, invoice send, practice onboarding)
- Privacy concerns with funnel tracking (LOW) → Mitigation: aggregate metrics only; no PII in analytics; workspace admin controls

---

## Estimated Effort

**4 sprints / ~8 weeks**

- **Sprint 1**: Attribution & funnel tracking — ReferralAttribution model, funnel events, referral code on user record, conversion tracking pipeline
- **Sprint 2**: Free tier & contextual onboarding — auto-provision free workspace on CPV signup, feature flag gates, contextual "you viewed [Job]" onboarding flow, job pre-import
- **Sprint 3**: Refer-a-friend program — personal referral links, reward ledger, dual-sided credits, referral dashboard UI, notification triggers
- **Sprint 4**: Growth analytics & workspace controls — per-job/per-workspace share analytics, practice leaderboard, workspace sharing toggle, bulk revoke, default share policies

---

## Proceed to PRD?

**YES** — the infrastructure (share tokens, import, billing tiers) is all in place. This epic turns passive sharing into an active, measurable growth engine. High leverage, moderate effort, builds entirely on existing code.

---

## Decision

- [ ] **Approved** - Proceed to PRD
- [ ] **Needs More Information** - What's needed?
- [ ] **Declined** - Reason

**Approval Date**: —

---

## Next Steps

**If Approved**:
1. [ ] Run `/trilogy-idea-handover` — Gate 0 validation + Linear epic creation
2. [ ] Run `/speckit-specify` — generate full spec with user stories
3. [ ] Define free tier limits (transaction cap, workspace cap, feature restrictions)
4. [ ] Design referral reward structure (credit amounts, payout triggers, expiry)
5. [ ] Validate referral incentive with existing users (quick survey or interviews)

**Notes**: This epic deliberately excludes the job sharing mechanics (022-CPV) and focuses on the growth flywheel that sits on top. Consider whether the practice leaderboard (Sprint 4) should be a separate epic under practice management if scope grows.
