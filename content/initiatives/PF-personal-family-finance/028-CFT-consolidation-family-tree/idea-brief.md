---
title: "Idea Brief: Consolidation & Family Tree"
---

# Idea Brief: Consolidation & Family Tree

**Created**: 2026-03-15
**Author**: William Whitelaw

---

## Problem Statement (What)

- **Flat groups hide real relationships**: 027-PMV introduced workspace groups for practices, but they're just named buckets — no hierarchy, no parent/child, no way to express that "Smith Pty Ltd" is owned by "Smith Family Trust" which is controlled by "John & Jane Smith"
- **No consolidated view**: A family with a trust, company, SMSF, and personal finances across 4 workspaces cannot see their combined net worth — each workspace is an isolated ledger
- **Accountants can't report across entities**: Practices managing corporate groups or family structures need consolidated balance sheets and P&L, but must export and manually combine spreadsheets from each workspace
- **Individual net worth tracking impossible**: Users who want to track personal wealth across multiple entities (property trust, company, super fund) have no single view of their total financial position
- **Corporate groups lack structure**: Parent/subsidiary relationships are invisible — a holding company with 3 subsidiaries appears as 4 unrelated workspaces

**Current State**: 027-PMV delivers flat workspace groups with aggregate dashboard stats (pending approvals, overdue invoices). 014-CON (Consolidation & Net Worth) was scoped but not built. The data model (workspace_groups + workspace_group_members) exists but has no hierarchy or financial consolidation capability.

---

## Possible Solution (How)

Three capability layers building on the existing group infrastructure:

### 1. Group Hierarchy & Family Tree
- Add parent/child relationships within groups (a workspace can be a child of another workspace within the group)
- Family tree visualisation showing the entity structure — who owns what, how entities relate
- Support for common structures: family trust + company + SMSF, holding company + subsidiaries, individual + partnerships
- Hierarchy is optional — flat groups continue to work for simple collections

### 2. Consolidated Financial Statements
- Consolidated balance sheet: roll up all member workspace balance sheets into a single view
- Consolidated P&L: aggregate revenue and expenses across all group members
- Elimination entries: handle inter-entity transactions (e.g., loan from trust to company) to avoid double-counting
- Net worth calculation: total assets minus total liabilities across all group members

### 3. Group as Invitable Product Surface
- Groups become a first-class area that people can be **invited to** — not just an internal practice tool
- Three-tier permission model:
  - **Manager** (practice member): full ledger access to all member workspaces
  - **Viewer** (read-only summary): sees net worth, entity breakdown, trends — NO transaction detail, no accounting jargon. Designed for non-financial-literate users (the family patriarch, spouse, board member)
  - **Entity Viewer** (single-workspace read-only): summary of one specific entity only (e.g., trust beneficiary sees trust balance sheet summary but not the company or SMSF)
- The viewer experience: big net worth number, simple entity breakdown, trend chart, asset allocation — answers "what am I worth?" without the accounting noise

### 4. Group Dashboard & Reporting
- Group-level dashboard: total net worth, combined asset/liability breakdown, trend over time
- Per-entity contribution: how much of the group's net worth comes from each workspace
- Drill-down: click any line item to see which workspace(s) contribute to it
- Two dashboard modes: **manager view** (full detail) and **viewer mode** (summary only)
- Accessible to practices, individuals, and invited family members/stakeholders

```
// Before (Current — flat groups)
Smith Family Group:
  - Smith Family Trust          [Balance Sheet: $500k net]
  - Smith Pty Ltd               [Balance Sheet: $200k net]
  - Smith SMSF                  [Balance Sheet: $800k net]
  - John Smith Personal         [Balance Sheet: -$50k net]
  (No combined view, no hierarchy, no relationship data)

// After (Hierarchical with consolidation)
Smith Family Group — Net Worth: $1.45M
  └── Smith Family Trust (parent)     $500k
      ├── Smith Pty Ltd (subsidiary)  $200k
      └── Smith SMSF (related)        $800k
  └── John Smith Personal             -$50k
  Consolidated Balance Sheet available
  Family tree visualisation available
  Inter-entity loan of $100k eliminated

// Viewer mode (what the family patriarch sees)
"Smith Family — Net Worth: $1.45M"
  Trust       ████████████████░░░░  $500k  (34%)
  Company     ██████░░░░░░░░░░░░░░  $200k  (14%)
  Super       ██████████████████████ $800k  (55%)
  Personal    ▓░░░░░░░░░░░░░░░░░░░  -$50k  (-3%)
  📈 Up 8% this quarter
  (No journal entries, no BAS, no accounting jargon)
```

---

## Benefits (Why)

**User/Client Experience**:
- Net worth visible in one click — no spreadsheet gymnastics
- Family tree makes complex structures understandable at a glance
- Practices can present consolidated reports to clients directly from the platform
- Non-financial family members get a simple, jargon-free view of their wealth

**Operational Efficiency**:
- Eliminates manual consolidation work — estimated 4-6 hours/month saved per practice per corporate group client
- Automated elimination entries reduce errors in consolidated reporting

**Viral Growth**:
- The group invite IS the viral loop — accountant invites family members to see their net worth
- Family members who see the dashboard tell their friends ("my accountant shows me my net worth in real time")
- Each family group adds 2-4 viewer accounts — platform grows beyond just accountants

**Business Value**:
- Unique differentiator — Xero, MYOB, and QuickBooks don't offer native consolidation for SMBs
- Opens new market: personal wealth tracking / family office use case
- Higher average workspace count per user (families create 3-5 entities vs 1)

**ROI**: Practices with 5+ family group clients save ~30 hours/month on consolidation. Individuals pay for the platform to see their net worth — high-value, low-churn segment.

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
- 027-PMV workspace groups are the foundation (complete) — this epic extends, not replaces
- Balance sheet data is available per workspace via existing reporting engine (007-FRC)
- Inter-entity transactions can be identified by matching contact records across workspaces

**Dependencies**:
- 027-PMV — workspace groups with aggregate stats (complete)
- 007-FRC — financial reporting, balance sheet generation (complete)
- 002-CLE — core ledger engine with double-entry accounting (complete)

**Risks**:
- Consolidation elimination logic complexity (HIGH) → Mitigation: v1 skips automatic elimination, shows combined totals with a manual "mark as inter-entity" toggle
- Performance of cross-workspace financial aggregation (MEDIUM) → Mitigation: pre-compute and cache consolidated figures, refresh on demand
- User confusion about what "consolidated" means (MEDIUM) → Mitigation: clear labelling ("Combined view — not audited"), education in-app

---

## Estimated Effort

**XL — 6 sprints / 6 weeks**

- **Sprint 1**: Group hierarchy data model (parent_workspace_id on group members, hierarchy validation, family tree API)
- **Sprint 2**: Family tree visualisation (interactive canvas component, drag-to-reorder, entity relationship display)
- **Sprint 3**: Consolidated balance sheet engine (cross-workspace account aggregation, currency normalisation)
- **Sprint 4**: Consolidated P&L + net worth calculation (revenue/expense aggregation, net worth dashboard widget)
- **Sprint 5**: Inter-entity elimination (mark inter-entity transactions, exclude from consolidation)
- **Sprint 6**: Group dashboard, reporting, polish (trend charts, per-entity contribution, drill-down, PDF export)

---

## Proceed to PRD?

**YES** — This is the feature that turns MoneyQuest from "accounting software" into "wealth management platform". It unlocks the personal finance / family office market and gives practices a capability that no competitor offers natively for SMBs.

---

## Decision

- [ ] **Approved** — Proceed to PRD
- [ ] **Needs More Information** — [What's needed?]
- [ ] **Declined** — [Reason]

**Approval Date**: —

---

## Next Steps

**If Approved**:
1. [ ] Run `/trilogy-idea-handover` — Gate 0 validation
2. [ ] Run `/speckit-specify` — Detailed spec with user stories
3. [ ] Run `/trilogy-clarify spec` — Refine consolidation logic and elimination rules
4. [ ] Research: how do Xero HQ, MYOB, and Sage handle multi-entity consolidation for SMBs?

**Notes**: This epic supersedes the original 014-CON scope. The 027-PMV workspace group infrastructure provides the data model foundation — this epic adds hierarchy and financial consolidation on top.
