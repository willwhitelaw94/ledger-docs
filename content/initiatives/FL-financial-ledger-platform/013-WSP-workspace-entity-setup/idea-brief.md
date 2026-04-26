---
title: "Idea Brief: Workspace Entity Setup & Smart Chart of Accounts"
---

# Idea Brief: Workspace Entity Setup & Smart Chart of Accounts

**Epic**: 013-WSP
**Created**: 2026-03-14
**Initiative**: FL — Financial Ledger Platform

---

## Problem Statement (What)

- After registration, users land in a single workspace with a generic Australian CoA — no entity type, no industry awareness
- No way to create additional workspaces (e.g. a Trust alongside a Pty Ltd) after onboarding
- The workspace switcher exists in the UI but there is no "create new workspace" flow
- ABN lives on the Organisation only — each legal entity (company, trust, sole trader) has its own ABN and should carry it at the workspace level
- One CoA template serves all entity types and industries — a sole trader electrician and a corporate trust have radically different account structures
- Accounts have no canonical `sub_type` — when bank feeds arrive, there is no reliable way to auto-categorise transactions regardless of how the user has labelled their accounts

**Current State**: Single generic CoA seeded at workspace creation. No entity type field. No multi-workspace creation path. ABN only on organisation.

---

## Possible Solution (How)

### Workspace Creation Wizard (3-stage flow)

**Stage 1 — Entity Type**
- Legal entity selector: Pty Ltd / Trust / Sole Trader / Partnership / SMSF / Not-for-Profit
- ABN field at workspace level (each entity has its own)
- Entity name, base currency, fiscal year start

**Stage 2 — Smart Questionnaire (6-8 questions)**
- Industry vertical: Trades, Professional Services, Retail, Hospitality, Agriculture, Healthcare, Property/Investment, Other
- Do you have employees? (→ wages, super, PAYG accounts)
- Do you hold inventory? (→ COGS, stock-on-hand accounts)
- Are you GST-registered? (→ GST collected/paid system accounts)
- Do you own property? (→ property asset, depreciation, rental income accounts)
- Do you have vehicles? (→ fuel, motor vehicle, depreciation accounts)
- Do you invoice clients? (→ AR, debtors accounts)
- Do you buy on credit? (→ AP, creditors accounts)

**Stage 3 — CoA Review**
- System generates template: deterministic canonical backbone + questionnaire-driven accounts
- Optional AI layer: renames accounts in plain language based on industry/context (e.g. "Motor Vehicles" → "Work Ute & Van")
- User reviews, can add/remove/rename accounts before finalising
- Every account carries a canonical `sub_type` regardless of user label (powers bank feed auto-categorisation)

### CoA Template System
- 50+ templates stored in database, admin-editable via a template management UI
- Templates tagged by: entity_type + industry + questionnaire flags
- Canonical `sub_type` values (e.g. `fuel`, `wages`, `subscriptions`, `rent`) locked — only the display name is customisable
- System accounts (AR, AP, GST Collected, GST Paid, Retained Earnings) always seeded and locked

### Before / After

```
// Before
Register → single generic workspace → one CoA for everyone

// After
Register → create workspace → pick entity type + ABN →
answer 6-8 questions → AI suggests CoA from matched template →
user reviews & approves → live workspace with smart accounts
```

---

## Benefits (Why)

**User Experience**
- Onboarding feels tailored — accounts match the business from day one
- No manual CoA cleanup after setup
- Multiple entities managed under one login (company + trust + sole trader)

**Platform Value**
- `sub_type` on every account enables intelligent bank feed auto-categorisation (epic 004)
- Template library is a scalable growth asset — new verticals added without code changes
- ABN at workspace level enables future ATO integration, BAS pre-fill, STP

**Business Value**
- Reduces churn from "CoA doesn't fit my business" friction during trial
- Positions platform for accountant/bookkeeper multi-client use cases
- Foundation for consolidation reporting across entities (epic 014-CON)

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | William Whitelaw (PO, Dev) |
| **A** | William Whitelaw |
| **C** | — |
| **I** | — |

---

## Assumptions & Dependencies

**Assumptions**
- `sub_type` column already added to `chart_accounts` (migration `2026_03_11_200001` ran)
- `industry` field exists on `workspace` — will be extended, not replaced
- CoA template engine can be seeded from database (not hardcoded PHP classes)
- AI labelling is optional/skippable — deterministic path always available

**Dependencies**
- 002-CLE Core Ledger (complete)
- 003-AUT Auth & Multi-tenancy (complete)
- 004-BFR Bank Feeds — `sub_type` mapping used by bank rules
- 014-CON Consolidation & Net Worth (downstream — depends on multi-workspace)

**Risks**
- AI labelling quality varies — must be reviewable, not auto-applied
- Template maintenance overhead as industries grow — needs admin UI from day one
- ABN validation (check digit) needs to be correct for ATO compliance

---

## Estimated Effort

**T-Shirt Size**: L (3–4 sprints)

| Phase | Work |
|-------|------|
| Backend | Entity type + ABN on workspace, template DB schema, template seeder (50 templates), `sub_type` enum + seeding |
| API | Workspace creation endpoint with wizard payload, template matching logic, AI labelling service (optional) |
| Frontend | 3-stage wizard UI, CoA review/edit screen, workspace switcher "create new" flow |
| Admin | Template management CRUD (admin role only) |
| Tests | Wizard validation, template matching, tenant isolation, sub_type coverage |

---

## Proceed to Spec?

**YES** — foundational epic. Blocks bank feed intelligence (004), consolidation (014), and ATO integrations. Template system must be designed for scale before more workspaces are created.
