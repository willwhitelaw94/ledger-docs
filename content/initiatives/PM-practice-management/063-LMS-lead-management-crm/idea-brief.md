---
title: "Idea Brief: Lead Management & Platform CRM"
---

# Idea Brief: Lead Management & Platform CRM

**Created**: 2026-03-22
**Author**: William Whitelaw

---

## Problem Statement (What)

- No visibility into the growth funnel — people sign up or they don't, and there's zero tracking in between
- The landing page drives signups but there's no lead capture for people who aren't ready to register (e.g., "book a demo" or "join waitlist")
- No trial analytics — can't see how far users get through onboarding, where they drop off, or which trials are about to expire without converting
- No churn detection — inactive workspaces go unnoticed until the user cancels
- Platform stats in `/admin` show totals and this-month counts but no funnel, no pipeline, no lifecycle tracking
- No outreach tooling — can't send targeted emails to trial users, at-risk accounts, or new signups
- Revenue metrics (MRR, ARR, LTV, churn rate) aren't tracked — billing exists (009-BIL) but there's no dashboard aggregating it
- Practice partner onboarding has no dedicated pipeline — practices are high-value but treated the same as individual signups

**Current State**: The super admin portal at `/admin` shows basic entity counts (organisations, workspaces, users, practices) and plan tier distribution. No lead capture, no funnel tracking, no lifecycle management, no email automation.

---

## Possible Solution (How)

### 1. Lead Capture & Pipeline
- Lead model (central): name, email, company, entity type, source (website/referral/partner/event/manual), UTM tracking
- Public API endpoint for landing page lead capture forms (no auth required)
- Kanban board at `/admin/leads`: New -> Contacted -> Demo Booked -> Trial Started -> Converted -> Lost
- Lead detail with activity timeline, notes, and assigned admin
- Manual lead creation + CSV import
- Simple lead scoring based on entity type + source + engagement

### 2. Trial Management
- Link lead to Organisation when they register (lead.organisation_id)
- Track trial lifecycle: start, end (30 days), extensions, conversion
- Trial dashboard: active trials, expiring this week, conversion rate
- Extend trial and convert trial admin actions

### 3. Onboarding Funnel
- Track onboarding steps per organisation: registration -> entity setup -> CoA selection -> first transaction -> bank connected -> first reconciliation -> invited team member
- Funnel visualisation showing drop-off at each step
- "Stuck" alerts for users who haven't progressed in 3+ days

### 4. Usage Analytics & Churn Signals
- Platform-wide metrics: MAU, DAU, WAU, feature adoption rates
- Inactive workspace detection (no login in 14+ days)
- Declining engagement comparison (last 7 days vs previous 7 days)
- "At risk" list of workspaces showing churn signals

### 5. Email Drip Sequences
- Template-based drip sequences: welcome, day 3 tips, day 7 check-in, day 14 nudge, trial expiry warning, churn risk re-engagement
- Admin can edit templates, enable/disable sequences
- Send log with delivery tracking
- Integrates with existing email infrastructure (023-EML)

### 6. Revenue Dashboard
- MRR, ARR, LTV, churn rate, average revenue per workspace
- Revenue by plan tier breakdown
- Growth trend charts tied to existing PlanTier enum and billing models (009-BIL)

### 7. Referral & Practice Partner Tracking
- Referral link generation, referral status tracking (pending/registered/converted)
- Separate practice partner pipeline: Prospect -> Contacted -> Onboarding -> Active -> Churned
- Practice health scoring based on client workspace count and activity

```
// Before
1. Visitor lands on marketing site -> signs up or leaves
2. No visibility into who visited, who dropped off, who's struggling
3. Trials expire silently, inactive users churn unnoticed
4. Revenue metrics require manual spreadsheet analysis

// After
1. Landing page captures leads -> pipeline tracks them to conversion
2. Trial dashboard shows who's stuck, who's thriving, who needs a nudge
3. Automated drip emails guide users through onboarding
4. Churn signals flag at-risk accounts before they leave
5. Revenue dashboard shows MRR/ARR/LTV in real time
```

---

## Benefits (Why)

**Growth Visibility**: Full funnel tracking from first touch to paid conversion — no more guessing.

**Retention**: Churn signals and automated re-engagement catch at-risk accounts before they leave.

**Operational Efficiency**: Admins manage the entire growth pipeline from one portal instead of spreadsheets and manual email.

**Revenue Intelligence**: Real-time MRR, ARR, LTV, and churn rate tied to actual billing data.

**Practice Partnerships**: Dedicated pipeline ensures high-value practice partners get appropriate onboarding attention.

**ROI**: Estimated 10-15% improvement in trial-to-paid conversion through targeted onboarding nudges and timely outreach. Earlier churn detection reduces revenue loss.

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

**Assumptions**:
- Landing page can integrate a lead capture form that posts to the public API
- Email infrastructure (023-EML) is production-ready for drip sequences
- Billing models from 009-BIL provide sufficient data for revenue metrics
- Super admin users will actively monitor the growth dashboard

**Dependencies**:
- 009-BIL (Billing & Monetisation) -- complete, provides PlanTier, subscription data
- 023-EML (Email Infrastructure) -- complete, provides email sending capabilities
- 024-NTF (Notifications) -- complete, provides in-app notification framework
- 051-EHS (Entity Health Score) -- complete, pattern reference for practice health scoring

**Risks**:
- Adoption risk (LOW) -- super admin only, small user base, clear value proposition
- Data accuracy risk (MEDIUM) -> Mitigation: usage metrics are computed from existing models, not new instrumentation
- Scope creep into full CRM/marketing automation (HIGH) -> Mitigation: strict "lightweight" scope -- no A/B testing, no marketing automation, no payment processing for referrals
- Email deliverability (MEDIUM) -> Mitigation: leverage existing 023-EML infrastructure and start with low-volume targeted sends

---

## Estimated Effort

**XL (Extra Large) -- 5-6 sprints**, building new central models and a full admin sub-application.

- **Sprint 1**: Lead model + pipeline kanban + manual lead creation + CSV import
- **Sprint 2**: Trial management dashboard + onboarding funnel tracking
- **Sprint 3**: Usage analytics dashboard + churn signal detection
- **Sprint 4**: Email drip sequences + send log + template management
- **Sprint 5**: Revenue dashboard + referral tracking + practice partner pipeline
- **Sprint 6**: Polish, lead scoring, admin activity feed, mobile responsive

---

## Proceed to PRD?

**YES** -- Growth is currently blind. This is platform infrastructure that every SaaS needs. All models are central (not tenant-scoped), all UI lives behind super admin auth, and it leverages existing billing and email infrastructure.

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
- Revisit after initial growth targets are set and manual processes prove insufficient
