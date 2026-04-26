---
title: Initiatives
description: Strategic initiatives organising the WealthQuest / Ledgerly platform roadmap
---

# Initiatives

The platform is organised into nine strategic initiatives. Each initiative represents a distinct customer narrative, technical bet, or operational concern. Epics live under exactly one initiative — multi-domain epics are placed where their primary customer value lands.

## Customer-facing initiatives

### [FL — Financial Ledger Platform](/initiatives/fl-financial-ledger-platform)
The core engine — event-sourced ledger, multi-tenancy, workspaces, foundational accounting patterns. Everything else sits on this. **20 epics**.

### [MM — Money Movement](/initiatives/mm-money-movement)
Transactions, AR/AP, payments, bank accounts, virtual cards, invoicing, batch payments. The "do work" surface for SMB users. **15 epics**.

### [FP — Feeds & Aggregation](/initiatives/fp-feeds-and-aggregation)
Universal ingestion pipeline + smart coding engine. Vendor-agnostic feeds (Basiq, Yodlee, direct), ML categorisation, anomaly detection, activity feeds. **The strategic moat**. **14 epics**.

### [PM — Practice Management](/initiatives/pm-practice-management)
Accountant and bookkeeper-facing tools — advisor dashboard, practice teams, client portal, request templates, jobs/timesheets/WIP. The Karbon/TaxDome-class product surface. **12 epics**.

### [PF — Personal & Family Finance](/initiatives/pf-personal-family-finance)
Consumer and family wealth — personal ledger, goals, family groups, consolidated view, scenario planning, retirement, estate. The Universal Ledger vision. **10 epics**.

### [TAX — Tax, Payroll & Compliance](/initiatives/tax-tax-payroll-compliance)
Australian-specific tax + payroll + compliance. BAS/IAS, FBT, STP Phase 2, SuperStream, awards, leave, payslips, state payroll, ETP. The regulatory moat. **13 epics**.

### [AI — AI Intelligence Layer](/initiatives/ai-ai-intelligence-layer)
User-facing AI surfaces — chatbot, document inbox, AI assistant, behavioural nudges, MCP server. Cross-cutting layer that consumes data from every other initiative. **5 epics**.

### [EXP — Experience, Engagement & Growth](/initiatives/exp-experience-engagement-growth)
Dashboards, gamification, viral loops, notifications, search, custom reports, help & support, accessibility, mobile prep. What makes people come back. **23 epics**.

## Operational initiatives

### [INF — Platform Infrastructure](/initiatives/inf-platform-infrastructure)
Billing & monetisation, email infrastructure, public API & webhooks, document storage, marketplace ecosystem. Plumbing that's not customer-narrative but keeps the lights on. **5 epics**.

---

## Cross-initiative reference

Some epics naturally touch multiple initiatives. The placement rule:

1. **Where does the primary customer value land?** — that's the home initiative
2. **Cross-references via epic dependencies** — captured in each epic's `meta.yaml` `depends_on:` list
3. **Foundational patterns live in FL** — even if they're consumed by every other initiative

Examples:
- `105-TCE Transaction Coding Engine` lives in **FP** because its job is to code feed items, but it depends on `044-TAX` (which lives in **TAX**) for BAS metadata, and surfaces results in `018-ITR` (which lives in **FP**)
- `036-GMF Gamification` lives in **EXP** because its job is engagement, but it touches activity feeds in **FP** and the JE timeline in **FL**
- `015-ACT Accountant Practice Management` lives in **PM** but composes flows from **FL** (workspace invitations, ownership transfers)

## Epic numbering

Global epic numbers are preserved across initiatives — `001-FLP` through `105-TCE` — so existing references in commits, Linear, and tribal knowledge continue to resolve.

Where the same number appeared on two epics historically (e.g. `019-AIX` and `019-YEA`, `024-NTF` and `024-RPT`), the disambiguation is in the code suffix; both epics live at their respective code's natural initiative home.
