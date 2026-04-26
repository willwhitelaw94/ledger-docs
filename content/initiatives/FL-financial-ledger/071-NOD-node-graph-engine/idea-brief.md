---
title: "Idea Brief: NODE — Graph-First Financial Operating System"
---

# Idea Brief: NODE — Graph-First Financial Operating System

**Created**: 2026-03-22
**Author**: William Whitelaw
**Epic**: 071-NOD

---

## Problem Statement (What)

- Users manage wealth across **dozens of entities** (companies, trusts, personal, family members) but see each one in isolation — separate ledgers, separate dashboards, separate logins
- **Relationships are invisible**: who owns what, how money flows between entities, which advisor manages which client — all trapped in spreadsheets, mental models, or implicit ORM joins
- Accountants and advisors juggle **practice groups, workspace groups, and entity hierarchies** but have no visual map of the network they manage
- Family offices and multi-entity operators cannot answer basic questions like "show me all entities connected to this person" or "trace this payment through the network" without manually cross-referencing multiple screens
- The platform already holds the data (135 models, 929 API routes, contacts, invoices, payments, jobs, groups) — but **the relationships are buried in database joins, not surfaced as a first-class interface**

**Current State**: Users navigate entity-by-entity via sidebar → workspace switcher. Relationships between entities, people, and projects exist in the data layer (Contact → Invoice → Payment → BankTransaction → Job → Workspace → WorkspaceGroup) but are never visualised or made interactive. The 028-CFT family tree canvas is the closest precedent — a static hierarchy view of entity ownership.

---

## Possible Solution (How)

A **force-directed interactive graph** as the primary interface for exploring people, entities, projects, and money flows. The graph projects existing MoneyQuest relationships into an interactive, layered visualisation.

- **Nodes**: People (users, contacts), Entities (workspaces/companies/trusts), Projects (jobs), Accounts (bank accounts, assets)
- **Edges**: Ownership, control, money flows, advisory relationships, obligations
- **Layers**: Toggle between family, legal, financial, risk, and operational views
- **Interaction**: Click node → slide-out panel with ledger, documents, tasks, timeline. Drag, zoom, expand/collapse
- **Graph data projection**: No new database — project existing PostgreSQL relationships into `{nodes[], edges[]}` API responses
- **Progressive disclosure**: Start from "You" node, expand outward. Show detail on demand

**Phased approach**:
- **Phase 1 — Graph MVP**: Project existing relationships → force-directed visualisation → interactive node exploration → layer toggles
- **Phase 2 — Network Intelligence**: Cross-workspace graph, money flow animation, time slider, stakeholder invites (viral loop)
- **Phase 3 — Platform Play**: Shared ledger visibility via projects, graph-native workflows, relationship-driven notifications

```
// Before
1. Open workspace switcher → pick entity
2. Navigate to contacts → find person
3. Open invoices → trace payments manually
4. Switch workspace → repeat for related entity
5. Mental model: "I think these are connected because..."

// After
1. Open graph → see entire network
2. Click person node → see all connected entities, invoices, money flows
3. Toggle "money flow" layer → animated edges show payment paths
4. Click edge → drill into transaction detail
5. Visual certainty: "I can see exactly how these are connected"
```

---

## Benefits (Why)

**User/Client Experience**:
- **Instant comprehension**: See entire financial network in one view instead of switching between 10+ workspaces
- **Relationship discovery**: Surface connections users didn't know existed (e.g., a contact is both a supplier to Company A and a customer of Trust B)
- **Faster navigation**: Click a node instead of navigating sidebar → switcher → page → tab

**Operational Efficiency**:
- **Advisor productivity**: Accountants see their entire client network, assignments, and workload in one graph
- **Audit trail**: Trace money flows visually instead of querying GL reports across entities
- **Onboarding**: New team members understand the entity structure in seconds, not days

**Business Value**:
- **Category differentiation**: No accounting platform offers a graph-first interface — this is the moat
- **Viral growth**: Projects invite stakeholders → stakeholders join → graph expands organically
- **Platform stickiness**: The graph becomes more valuable as more entities and people are added — network effects

**ROI**: The graph is the primary vehicle for the $1T-under-management vision. It transforms MoneyQuest from "accounting software" into "the operating system for financial life."

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
- Existing PostgreSQL relationship data (contacts, invoices, payments, jobs, groups) is rich enough to project a meaningful graph without a dedicated graph database
- Force-directed layout libraries (react-force-graph, Cytoscape, D3) can handle the expected node count (100–10,000 per user) with acceptable performance
- Users will understand and prefer a graph interface over traditional list/table navigation

**Dependencies**:
- 028-CFT Consolidation & Family Tree (provides WorkspaceGroup hierarchy — already built)
- 006-CCM Contacts & Client Management (provides Contact → Entity relationships — already built)
- 005-IAR Invoicing & AR/AP (provides money flow edges via Invoice → Payment chains — already built)

**Risks**:
- **Performance at scale** (MEDIUM) → Mitigation: Progressive rendering, WebGL fallback, server-side graph computation for large networks. Start with per-workspace graphs before cross-workspace
- **UX complexity** (MEDIUM) → Mitigation: Default to simple "entity ownership" layer on first load. Advanced layers (money flow, risk) are opt-in toggles. Don't overwhelm
- **Graph without a graph DB** (LOW) → Mitigation: PostgreSQL recursive CTEs and denormalized projection tables can handle the query patterns for Phase 1. Evaluate Neo4j only if query performance degrades at scale
- **User adoption** (MEDIUM) → Mitigation: Graph is additive — existing sidebar/list navigation remains. Graph is a new lens, not a replacement

---

## Estimated Effort

**XL — 8 sprints / 8 weeks** (phased delivery, Phase 1 shippable at sprint 4)

- **Sprint 1–2**: Graph data layer — `GetEntityGraph` action projecting existing relationships into `{nodes[], edges[]}`, graph API endpoints, node/edge type enums
- **Sprint 3–4**: Graph visualisation — react-force-graph or Cytoscape integration, `/graph` page, node click → detail panel, basic layer toggles (ownership, money flow)
- **Sprint 5–6**: Network intelligence — cross-workspace graph (group-level), edge detail panels (transaction amounts, dates), search/filter within graph
- **Sprint 7–8**: Polish & interaction — money flow animation, time slider prototype, graph presets (practice view, family view, entity view), keyboard shortcuts

---

## Proceed to PRD?

**YES** — The graph is the single biggest product differentiator and the existing data layer can support a meaningful MVP without new infrastructure. Phase 1 (sprints 1–4) is a focused, shippable milestone that proves or disproves the core hypothesis: "a graph interface makes multi-entity financial management fundamentally better."

---

## Decision

- [ ] **Approved** — Proceed to PRD
- [ ] **Needs More Information** — [What's needed?]
- [ ] **Declined** — [Reason]

**Approval Date**: —

---

## Next Steps

**If Approved**:
1. [ ] Run `/trilogy-idea-handover` — Gate 0 validation, create Linear epic
2. [ ] Run `/speckit-specify` — Detailed spec with user stories
3. [ ] Run `/trilogy-clarify dev` — Technical architecture decisions (graph library, data projection strategy, API design)
4. [ ] Evaluate graph libraries: react-force-graph vs Cytoscape vs D3 force simulation
5. [ ] Prototype: project one workspace's Contact → Invoice → Payment chain into a force graph

**Notes**: This epic intentionally excludes estate/succession planning (060-WEP), education (062-EDU), messaging, and workflow automation. Those are separate epics if the graph proves its value. NODE = the graph. Everything else follows.
