---
title: "Idea Brief: Practice Specialisation & Module Gating"
---

# Idea Brief: Practice Specialisation & Module Gating

**Created**: 2026-03-21
**Author**: William Whitelaw

---

## Problem Statement (What)

- Practices are currently flat — no concept of what type of practice they are (accounting, financial planning, estate planning, bookkeeping)
- Every practice sees the same modules regardless of their specialisation — an accountant doesn't need the wills module, a wealth advisor doesn't need BAS
- There's no way for a wealth advisor to see a family's financial picture across entities — the platform treats every entity as independent
- Family groups (038-FGP) exist structurally but there's no **visual family tree / org chart** view that shows the hierarchy of entities (people → trusts → companies) with rolled-up financials
- The dashboard is the same for everyone — a wealth advisor managing $50M across a family group gets the same view as a sole trader doing their own books

**Current State**: Practices manage client workspaces with a flat permission model. Modules are toggled by feature flags per workspace, not by practice type. No family tree visualisation exists.

---

## Possible Solution (How)

### 1. Practice Types (Enum-driven module gating)

- Add a `practice_type` to each practice: accounting, financial_planning, estate_planning, bookkeeping, wealth_advisory
- Each practice type unlocks a specific set of modules for their client workspaces:

| Practice Type | Unlocked Modules |
|---------------|-----------------|
| **Accounting** | Tax (044-TAX), BAS, Compliance, Reporting, Reconciliation |
| **Financial Planning** | Tax, Goals (037-GLS), Cash Flow Forecasting (041-CFF), Asset Register (033-FAR) |
| **Estate Planning** | Wills (060-WEP), Family Group Portal (038-FGP), Asset Register |
| **Wealth Advisory** | All of the above + Consolidation (028-CFT), Family Tree View, Entity Health (051-EHS) |
| **Bookkeeping** | Core ledger, Banking, Invoicing, Contacts (no tax, no wills, no planning) |

- Practices can hold multiple types (an accounting + financial planning firm)

### 2. Family Tree / Org Chart Dashboard View

- A visual org chart showing the hierarchy of entities within a family group
- Each node = an entity (person, trust, SMSF, company, partnership)
- Nodes show: entity name, type icon, net worth, health score, key alerts
- Edges show: ownership relationships, beneficial interests, control
- Click a node → drills into that entity's workspace
- Roll-up financials: total family net worth, consolidated assets/liabilities
- The wealth advisor sees the whole tree; family members see their branch

### 3. Wealth Advisor Dashboard

- A dedicated dashboard preset for wealth advisory practices
- Top-level: total AUM across all client families, family count, alerts
- Per-family: the org chart view with rolled-up financials
- This becomes the primary interface for wealth advisors — they work from the family tree, not individual workspaces

```
// Before
Wealth advisor logs in → sees flat list of client workspaces → opens each one individually

// After
Wealth advisor logs in → sees family org charts with rolled-up net worth → clicks a node to drill in
```

---

## Benefits (Why)

**User/Client Experience**:
- Wealth advisors get a purpose-built view that matches how they think — families, not entities
- Practice-appropriate modules reduce clutter — bookkeepers don't see tax, accountants don't see wills

**Operational Efficiency**:
- Module gating at the practice level eliminates per-workspace feature flag management
- One setting (practice type) controls module access for all connected client workspaces

**Business Value**:
- Opens MoneyQuest to the wealth advisory market — a new customer segment
- Higher AUM under management = higher platform value (aligns with $1T vision)
- Practice type-based pricing — wealth advisory tier commands premium pricing
- Stickiness: the family tree view creates a network effect — the more entities, the more valuable the platform

**ROI**: Wealth advisory is the highest-value practice type. One wealth advisor managing 20 families × $5M average = $100M AUM. Platform fee per AUM = recurring premium revenue.

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | William Whitelaw (PO, Dev) |
| **A** | William Whitelaw |
| **C** | — |
| **I** | — |

---

## Assumptions & Dependencies, Risks

**Assumptions**:
- Practice management (015-ACT, 027-PMV) is stable and can be extended with a type field
- Family Group Portal (038-FGP) provides the group hierarchy data model
- Consolidation (028-CFT) handles the financial roll-up logic

**Dependencies**:
- 038-FGP (Family Group Portal) — group hierarchy and workspace membership
- 028-CFT (Consolidation) — rolled-up financials across the tree
- 044-TAX (Tax Module) — tax as a gated module
- 060-WEP (Wills & Estate Planning) — wills as a gated module

**Risks**:
- Scope creep — the org chart view could become a full product in itself (MEDIUM) → Mitigation: V1 is read-only visualisation, not a management tool
- Practice type migration — existing practices need to be assigned a type retroactively (LOW) → Mitigation: default to "accounting" for existing practices
- Multi-type complexity — practices with multiple specialisations add complexity to module gating (MEDIUM) → Mitigation: union of all type modules, not intersection

---

## Estimated Effort

**L (3-4 sprints)**, broken into phases:

- **Sprint 1**: Practice type enum, migration, module gating engine, admin UI for setting practice type
- **Sprint 2**: Family tree / org chart visualisation component, integration with 038-FGP data
- **Sprint 3**: Wealth advisor dashboard preset, rolled-up financials, per-family view
- **Sprint 4**: Polish — multi-type support, practice type onboarding, migration of existing practices

---

## Proceed to PRD?

**YES** — This is a strategic feature that opens a new market segment (wealth advisory) and ties together several existing epics (038-FGP, 028-CFT, 044-TAX, 060-WEP) into a coherent product story. The practice type gating also simplifies module management long-term.

---

## Decision

- [ ] **Approved** - Proceed to PRD
- [ ] **Needs More Information**
- [ ] **Declined**

**Approval Date**: —

---

## Next Steps

**If Approved**:
1. `/trilogy-idea-handover` — Gate 0 (Idea Gate)
2. `/speckit-specify` — Full specification
3. `/trilogy-clarify business` — Validate wealth advisory market sizing
