---
title: "Idea Brief: Platform Pulse"
---

# Idea Brief: Platform Pulse

**Created**: 2026-04-19
**Author**: Will Whitelaw
**Epic Code**: 102-PPL
**Initiative**: FL-financial-ledger

---

## Problem Statement (What)

The super admin `/admin` overview today shows plan distribution and recent groups — useful but flat. There's no visceral sense of platform scale, momentum, or geographic reach.

- **No sense of scale** — a super admin can't see total Assets Under Ledger or monthly transaction flow at a glance
- **No sense of progress** — we have revenue-like north-star targets ($1B AUM, $100M/mo transaction flow) but they're not visible anywhere
- **No sense of liveness** — the platform feels static even when hundreds of journal entries post per hour
- **No sense of reach** — we can't see where on the map our entities are, nor how they relate to each other (groups → entities → accounts)
- **Dashboards feel like a CRM table** rather than a platform-operator command centre

**Current State**: `/admin` shows 4 KPI cards (Groups/Entities/Users/Practices), Plan Distribution, and a Recent Groups table. Zero financial magnitude, zero geography, zero live signal.

---

## Possible Solution (How)

Two surfaces, one epic — both live on the super admin overview page:

**1. Platform Pulse Ticker (hero band)**
- **Assets Under Ledger** — sum of positive account balances across all workspaces, animated odometer, progress bar toward $1B
- **Monthly Transaction Flow** — absolute sum of journal entries posted in last 30 days, progress bar toward $100M
- **Live pulse feed** — slow-scrolling stream of recent journal entries (anonymised workspace, amount, time)

**2. Platform Map (tabbed panel)**
- **Geographic tab** — world/AU map with clustered pins per workspace (or organisation) coloured by plan tier. Hover = workspace summary; click = drill to workspace detail
- **Graph tab** — node graph (reuses 071-NOD Node Graph Engine) showing organisations → workspaces → chart accounts; filters by plan tier, size, sector

**Example**:
```
// Before (current)
[4 KPI cards] → [Plan Distribution] [Recent Groups]

// After
[Hero Ticker: $247M AUL → $1B  |  $18.4M/mo → $100M  |  Live feed]
[Tabs: Map  |  Graph]
[4 KPI cards] → [Plan Distribution] [Recent Groups]
```

---

## Benefits (Why)

**User/Client Experience**:
- Super admin can read platform state in 3 seconds — no clicks, no drilldown
- Targets become shared visible truth rather than slide-deck numbers

**Operational Efficiency**:
- Geographic anomalies (e.g., all new signups from one postcode) become obvious
- Account-graph reveals concentration risk, cross-group patterns, orphan entities

**Business Value**:
- Investor/board demo surface — a single screen that conveys platform maturity and trajectory
- Growth accountability: progress toward $1B AUM and $100M/mo flow is always visible
- Reinforces the universal-ledger vision (platform, not just accounting app)

**ROI**: Not a direct-revenue feature. Strategic ROI: improves platform-ops decisions, accelerates investor conversations, raises ambition across team.

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | Will Whitelaw (PO, Dev) |
| **A** | Will Whitelaw |
| **C** | — |
| **I** | — |

---

## Assumptions & Dependencies, Risks

**Assumptions**:
- Account balance + journal entry aggregates can be computed cheaply with a cached query (1–5 min TTL)
- Workspaces have enough address/geography data to plot (or we add a country/state field during this epic)
- 071-NOD Node Graph Engine exposes a reusable graph view we can scope to super-admin data

**Dependencies**:
- 002-CLE Core Ledger Engine (journal entry projector — complete)
- 071-NOD Node Graph Engine (complete)
- Map library choice (e.g., MapLibre, react-simple-maps, or Mapbox) — decide during spec
- Workspace address/country column — may need a small migration if not present

**Risks**:
- **Map library cost/licensing** (MEDIUM) → Mitigation: prefer MapLibre + open tiles before Mapbox
- **Aggregate query performance at scale** (MEDIUM) → Mitigation: materialised summary table updated by scheduled job, not recomputed per request
- **Privacy of pulse feed** (LOW) → Mitigation: anonymise workspace names; never show amounts over a threshold with identifying info
- **Scope creep** (MEDIUM) — ticker + map + graph are three features → Mitigation: ship ticker first (P0), map second, graph third

---

## Estimated Effort

**2–3 sprints / ~4–6 weeks**, approximately 13–20 story points

- **Sprint 1**: Platform Pulse Ticker — aggregates endpoint, hero band UI, odometer animation, progress bars, pulse feed
- **Sprint 2**: Platform Map (geographic) — address backfill, map component, pin clustering, drill-through
- **Sprint 3**: Platform Graph — reuse 071-NOD, super-admin scoping, filters, polish

---

## Proceed to PRD?

**YES** — clear problem, clear solution, data already exists, reuses existing infrastructure (071-NOD, journal entry projector). Worth spec'ing.

---

## Decision

- [ ] **Approved** - Proceed to PRD
- [ ] **Needs More Information** - [What's needed?]
- [ ] **Declined** - [Reason]

**Approval Date**: —

---

## Next Steps

**If Approved**:
1. [ ] `/trilogy-idea-handover` — Gate 0, create Linear epic as Backlog
2. [ ] `/speckit-specify` — generate spec.md
3. [ ] `/trilogy-clarify spec` — refine requirements
4. [ ] `/trilogy-spec-handover` — Gate 1, transition Backlog → Design

---

**Notes**: Connects to the universal-ledger vision (project_universal_ledger_vision.md) — the $1B AUM target is an explicit stake in the ground. Consider this the super-admin analogue of the client-facing dashboard — platform-scale telemetry rather than per-workspace numbers.
