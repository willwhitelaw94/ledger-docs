---
title: "Idea Brief: Personal Ledger"
---

# Idea Brief: Personal Ledger

**Created**: 2026-03-15
**Author**: William Whitelaw

---

## Problem Statement (What)

- **Accounting UI assumes expertise**: Every page in MoneyQuest — journal entries, chart of accounts, BAS, reconciliation — assumes the user is an accountant or bookkeeper. Individuals tracking personal wealth are excluded by the interface, not the engine.
- **No "personal" entity type**: The onboarding flow offers business types (Pty Ltd, Trust, Sole Trader) but no personal/individual option. People who want to track "what do I own and what do I owe?" have nowhere to start.
- **Jargon barrier**: "Debit", "Credit", "Journal Entry", "Chart of Accounts" — these terms mean nothing to a person trying to log their mortgage balance or share portfolio value. The UI must speak human.
- **Static modules**: The sidebar, dashboard, and available pages are the same regardless of entity type. A personal ledger user sees invoicing, bank reconciliation, and BAS — features they'll never use. This creates confusion and clutter.
- **Net worth gap**: 028-CFT built the "My Net Worth" dashboard and consolidation engine, but there's no simple way for an individual to feed data into it. They'd need to create journal entries to record their house value — absurd for a consumer.

**Current State**: The ledger engine (002-CLE) is entity-agnostic — it handles double-entry for anything. The entity_type field exists on workspaces. Feature flags (Laravel Pennant) can toggle modules. The infrastructure is ready; the consumer-facing experience is not.

---

## Possible Solution (How)

### Core concept: the ledger adapts to the entity type

When a user creates a workspace with entity_type = "personal" (new option), the entire UI transforms:

### 1. Onboarding: "Personal" entity type
- Add "Personal / Individual" to entity type selector in onboarding and workspace creation
- When selected: skip business-specific setup (ABN, GST, CoA template selection)
- Instead: show "What would you like to track?" checklist (property, investments, bank accounts, super, vehicles, debts)
- Auto-generate a simplified chart of accounts based on selections

### 2. Modular UI based on entity type
- Sidebar navigation changes: hide Invoices, Bills, BAS, Journal Entries, Reconciliation
- Show instead: Assets, Debts, Net Worth, Transactions
- Dashboard changes: net worth headline replaces KPI stat cards
- Feature flags drive visibility — `entity_type` determines which Pennant flags are active

### 3. Simplified asset/liability forms
- "Add Asset" form: name, category (property/investment/cash/super/vehicle/other), current value, purchase date (optional), notes
- "Add Debt" form: name, category (mortgage/credit card/loan/HECS/other), balance owing, interest rate (optional), lender
- "Update Value" button on each asset/liability — logs a new valuation (creates a journal entry underneath)
- No debits, no credits, no account codes — just "what's it worth today?"

### 4. Transaction feed (optional)
- Connect a bank account (existing Basiq integration) to auto-import transactions
- Categorise spending into simple buckets (housing, food, transport, entertainment, savings)
- Monthly spending summary — not full reconciliation, just "where did my money go?"

```
// Before (current — business accounting UI for everyone)
Sidebar: Dashboard | Invoices | Bills | Journal Entries | Banking | Contacts | Reports | Settings
Forms: "Create Journal Entry" with debit/credit lines, account codes, tax codes

// After (personal ledger — entity_type = "personal")
Sidebar: Dashboard | Assets | Debts | Transactions | Net Worth | Settings
Forms: "Add Asset — My House" → value: $850,000, category: Property
        "Add Debt — Home Loan" → balance: $400,000, category: Mortgage
```

---

## Benefits (Why)

**User/Client Experience**:
- Anyone can track their net worth in under 2 minutes — no accounting knowledge required
- The UI speaks their language: "assets and debts", not "debits and credits"
- Connects naturally to 028-CFT's "My Net Worth" dashboard for multi-entity consolidation

**Business Value**:
- Expands addressable market from ~500k Australian businesses to ~10M Australian adults
- Personal ledgers are high-retention: people check their net worth regularly
- Each personal user is a potential referral to their accountant → practice sign-ups
- Personal → business upgrade path: "I've outgrown personal, I need proper books"

**Platform Growth**:
- Viral loop: "Check out my net worth dashboard" → friend signs up → creates personal ledger
- Family groups (028-CFT): personal + trust + company + SMSF = consolidated family wealth
- Practice connection: accountant invites client to add personal assets → complete picture

**ROI**: If 1% of Australian adults create a personal ledger (100k users) at $5/month freemium → $500k MRR from a segment that costs almost nothing to serve (no support, no complexity).

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
- The double-entry engine doesn't need modification — personal assets/liabilities are just journal entries with a friendly UI on top
- Laravel Pennant can toggle UI modules based on entity_type (existing pattern)
- Users will accept manual valuations for now (no automatic price feeds in v1)

**Dependencies**:
- 002-CLE — core ledger engine (complete)
- 028-CFT — "My Net Worth" auto-group and consolidation (complete)
- 010-PLT — Basiq bank feed integration for optional transaction import (complete)
- Laravel Pennant feature flags (existing)

**Risks**:
- Simplification loses power users (LOW) → Mitigation: entity_type drives the UI, not the engine. Power users choose a business type. Personal users get the simple view. Both use the same ledger.
- Valuation accuracy without feeds (MEDIUM) → Mitigation: v1 is manual-entry. Users update values when they feel like it. Future: property/share price API feeds.
- Scope creep into budgeting/spending app (HIGH) → Mitigation: v1 is asset/liability tracking only. Spending categorisation is optional and deferred to v2. We are not building Mint — we are building a balance sheet.

---

## Estimated Effort

**L — 4 sprints / 4 weeks**

- **Sprint 1**: "Personal" entity type in onboarding, simplified CoA generation, feature flag module config
- **Sprint 2**: Personal dashboard (net worth headline, asset/liability cards), add/edit asset and debt forms
- **Sprint 3**: Valuation history (update values over time, trend charts per asset), modular sidebar
- **Sprint 4**: Transaction feed integration (optional bank connect, spending categories), polish

---

## Proceed to PRD?

**YES** — This is the consumer play. It turns MoneyQuest from an accounting tool into a personal finance platform. The engine is built; this epic is about making it accessible to everyone.

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
3. [ ] Research: how do Sharesight, Kubera, and Empower (Personal Capital) handle personal asset tracking?
