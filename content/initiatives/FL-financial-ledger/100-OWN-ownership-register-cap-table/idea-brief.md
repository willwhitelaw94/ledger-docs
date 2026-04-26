---
title: "Idea Brief: Ownership Register & Cap Table"
---

# Idea Brief: Ownership Register & Cap Table

**Created**: 2026-04-02
**Author**: Will Whitelaw

---

## Problem Statement (What)

- Accountants managing Pty Ltd structures, trusts, and family groups need to know **who owns what % of each entity** for tax returns, annual ASIC filings, and group consolidation
- The existing EntityRelationship model captures "A holds shares in B" with a percentage, but lacks **share classes, share counts, investment amounts, and transfer history**
- There is no per-entity ownership summary view — the `/structure` graph shows the network but not a clean cap table breakdown
- Practice managers working across 20+ client entities have no consolidated view of shareholding across their book
- Ownership data is currently tracked in spreadsheets, ASIC filings, or Cake Equity — not connected to the ledger

**Current State**: EntityRelationship supports `HOLDS_SHARES` and `OWNS` with a percentage (basis points). No share register, no share classes, no cap table visualization.

---

## Possible Solution (How)

A lightweight **Ownership Register** per entity that enriches the existing EntityRelationship model with share-level detail, plus a **Cap Table view** that visualizes ownership breakdown.

- **Share Classes** — Define share classes per entity (Ordinary, Preference A/B, Redeemable, etc.) with attributes: class name, total issued, rights description
- **Shareholder Register** — Each `HOLDS_SHARES` or `OWNS` relationship can specify: share class, share count, investment amount (cents), issue date
- **Cap Table Dashboard** — Per-entity page showing: pie chart of ownership %, shareholder table with share class/count/%, total securities summary
- **Transfer History** — Log share movements between holders (leverages existing `entity_relationship_versions` audit trail, extended with transfer-specific fields)
- **Practice-Wide View** — Practice managers see ownership summaries across all client entities in a single table

```
// Before (Current)
EntityRelationship: "John Smith HOLDS_SHARES in Smith Pty Ltd — 50%"
→ No share class, no share count, no investment amount, no cap table view

// After (New)
EntityRelationship: "John Smith HOLDS_SHARES in Smith Pty Ltd — 50%"
  + share_class: "Ordinary"
  + share_count: 500
  + investment_amount: $500 (100 cents per share)
  + issue_date: 2020-01-15
→ Cap table shows pie chart + shareholder table + total securities
```

---

## Benefits (Why)

**User/Client Experience**:
- Accountants see ownership structure at a glance — no more cross-referencing ASIC extracts
- Annual return preparation time reduced by connecting shareholding to the ledger entity

**Operational Efficiency**:
- Eliminates duplicate data entry between spreadsheets and accounting software
- Practice managers audit ownership across all clients from one screen

**Business Value**:
- Differentiator vs Xero/MYOB which have zero ownership features
- Natural upsell surface for accountant-managed entity structures
- Feeds group consolidation (028-CFT) with accurate ownership percentages

**ROI**: High stickiness feature — once ownership data is in the platform, switching cost increases significantly.

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | Will Whitelaw (PO, Dev) |
| **A** | Will Whitelaw |
| **C** | -- |
| **I** | -- |

---

## Assumptions & Dependencies, Risks

**Assumptions**:
- Accountants (not business owners) are the primary users entering share data
- We do NOT need ESOP, vesting schedules, SAFEs, convertible notes — that's Cake Equity's market
- Share transfers are recorded as historical events, not real-time corporate actions

**Dependencies**:
- EntityRelationship model (already built — `HOLDS_SHARES`, `OWNS` with percentage)
- Entity relationship versions table (already built — audit trail)
- Contact model (shareholders can be contacts or other workspaces/entities)
- 028-CFT Consolidation & Family Tree (already built — group structure)

**Risks**:
- Scope creep into full equity management (MEDIUM) -- Mitigation: Strict "no ESOP/vesting" boundary, focus on compliance view only
- Data accuracy if share register diverges from ASIC records (LOW) -- Mitigation: Read-only ASIC integration in future, manual entry for v1

---

## Estimated Effort

**M (2-3 sprints)**, approximately 20-30 story points

- **Sprint 1**: Schema + backend — share classes, extend EntityRelationship with share fields, transfer history, API endpoints
- **Sprint 2**: Frontend — cap table view per entity, shareholder table, pie chart, practice-wide ownership report
- **Sprint 3**: Polish — transfer form, CSV export, integration with structure graph page

---

## Proceed to PRD?

**YES** — High-value, low-complexity feature that builds directly on existing infrastructure (EntityRelationship, entity_relationship_versions). Clear scope boundary (no ESOP). Immediate value for accountants managing Pty Ltd and trust structures.

---

## Decision

- [ ] **Approved** - Proceed to PRD
- [ ] **Needs More Information** - [What's needed?]
- [ ] **Declined** - [Reason]

**Approval Date**: —

---

## Next Steps

**If Approved**:
1. [ ] `/speckit-specify` — Write full specification with user stories
2. [ ] `/trilogy-clarify spec` — Refine requirements
3. [ ] `/trilogy-spec-handover` — Gate 1 validation

---

**Notes**: Inspired by Cake Equity's cap table UI but deliberately scoped to the accountant's compliance view, not startup equity management. The key insight is that MoneyQuest already has the relationship graph — this just adds share-level detail to relationships that already exist.
