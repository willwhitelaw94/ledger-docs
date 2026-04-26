---
title: "Idea Brief: Loan Applications & Tracking"
---

# Idea Brief: Loan Applications & Tracking

**Created**: 2026-03-15
**Author**: William Whitelaw

---

## Problem Statement (What)

- Users have no way to track loans within MoneyQuest — they manually track repayments in spreadsheets or external tools, disconnected from their ledger
- Loan repayments generate journal entries (interest expense, principal reduction) but users must create these manually every month
- No visibility into total debt position, upcoming payments, or payoff progress across loan types
- Individuals can't see their mortgage/car loan alongside their personal ledger; companies can't track business loans alongside their accounts
- Practice firms have no consolidated view of client debt positions

**Current State**: Users either ignore loans entirely or manually create journal entries for each repayment with no amortization schedule, no interest tracking, and no loan lifecycle management.

---

## Possible Solution (How)

A toggleable module that lets workspaces track loans — both as **borrower** (liabilities) and **lender** (assets/receivables). Full lifecycle from application through to payoff.

- **Loan register** — list of all loans with status, balance, next payment, lender/borrower
- **Loan types** — Mortgage, Car/Vehicle, Personal, Business, Line of Credit, Student
- **Amortization engine** — calculate schedules with interest (fixed, variable, interest-only)
- **Auto journal entries** — generate JEs on each repayment (split principal vs interest)
- **Loan lifecycle** — Applied → Approved → Funded → Active → Paid Off
- **Dashboard widget** — total debt/receivables, next payments, payoff progress bars
- **Both sides of the coin** — track as borrower (liability) or lender (asset/receivable)

```
// Before
1. Take out a car loan
2. Manually create JE each month splitting principal/interest
3. Guess remaining balance
4. No visibility into total debt position

// After
1. Add loan → system generates amortization schedule
2. Record repayment → JE auto-created with correct split
3. See remaining balance, payoff date, total interest paid
4. Dashboard shows full debt position at a glance
```

---

## Benefits (Why)

**User/Client Experience**:
- Eliminate manual JE creation for loan repayments: ~12 JEs/year per loan automated
- Clear visibility into debt position — individuals see mortgage alongside personal budget

**Operational Efficiency**:
- Amortization calculated once, repayments tracked automatically
- Interest vs principal split handled by the system, not the user

**Business Value**:
- Differentiator: most SME accounting tools don't handle loan tracking well
- Drives adoption for personal ledger users (mortgage/car loan is their #1 financial concern)
- Practice firms get consolidated client debt visibility

**ROI**: High engagement feature for personal ledger users; low churn risk for users who track loans here.

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
- Users want to track loans within their accounting tool rather than separately
- Amortization schedules can be calculated with standard formulas (PMT, IPMT, PPMT)
- Variable rate loans update schedule when rate changes

**Dependencies**:
- 002-CLE Core Ledger Engine (journal entry generation)
- 030-PLG Personal Ledger (individual loan tracking)
- Module toggle system (loans as a toggleable module)

**Risks**:
- Scope creep into full lending platform (HIGH) → Mitigation: strict scope — tracking only, not origination/credit checks
- Interest calculation edge cases across jurisdictions (MEDIUM) → Mitigation: support common methods (reducing balance, flat rate), add more later
- Variable rate loans add complexity (MEDIUM) → Mitigation: MVP with fixed rate, variable rate in v2

---

## Estimated Effort

**M (3-4 sprints)**, approximately 30-40 story points

- **Sprint 1**: Foundation — Loan model, migrations, CRUD, loan types, status lifecycle
- **Sprint 2**: Amortization engine — schedule calculation, interest methods, auto JE generation
- **Sprint 3**: Frontend — Loan register page, loan detail, repayment recording, dashboard widget
- **Sprint 4**: Polish — both-sides (lender view), reporting, payoff projections

---

## Proceed to PRD?

**YES** — Loans fill a clear gap in the universal ledger vision. High value for personal ledger users (mortgages, car loans) and companies (business debt tracking). Well-scoped with clear boundaries.

---

## Decision

- [ ] **Approved** - Proceed to PRD
- [ ] **Needs More Information**
- [ ] **Declined**

**Approval Date**: —

---

## Notes

- Loan types should be extensible (enum + custom)
- Consider: loan-to-value ratio display for secured loans (mortgage vs property value)
- Future: integration with bank feeds to auto-match loan repayment transactions
- This is a natural companion to the Personal Ledger module — individuals' biggest financial items are loans
