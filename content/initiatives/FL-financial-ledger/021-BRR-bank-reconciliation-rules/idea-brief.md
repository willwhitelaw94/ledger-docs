---
title: "Idea Brief: Bank Reconciliation Rules"
---

# Idea Brief: Bank Reconciliation Rules

**Epic**: 021-BRR
**Created**: 2026-03-14
**Initiative**: FL — Financial Ledger Platform

---

## Problem Statement (What)

- Accountants and bookkeepers manually categorise the same recurring transactions every month — Stripe payouts always go to Sales Revenue, AWS charges always go to IT & Software — but there is no way to automate this
- The bank reconciliation queue fills up with transactions that have obvious, predictable matches, forcing the accountant to click through each one individually
- New workspaces have no auto-coding in place, so the first reconciliation session is entirely manual regardless of how simple the transaction patterns are
- Virtual card transactions (020-VCA) and bank feed transactions use the same underlying rules infrastructure, but there is no UI to manage, test, or tune those rules
- Rules that exist in the system today (seeded at account creation) cannot be viewed, edited, or deleted by the accountant — they are invisible configuration

**Current State**: A `bank_feed_rules` table exists in the backend (built in 004-BFR) with full support for keyword matching, regex, amount ranges, and auto-reconcile flags — but there is no UI to manage these rules. Accountants manually reconcile every transaction with no automation.

---

## Possible Solution (How)

### Rules Management UI
- A dedicated "Reconciliation Rules" settings page where accountants can view, create, edit, and delete rules
- Each rule defines: match condition (description contains / starts with / regex), optional amount range, target expense account, GST code, and whether to auto-post or just auto-suggest
- Rules are ordered by priority — first matching rule wins
- Pre-seeded rules for common Australian business expenses (Stripe → Sales Revenue, ATO → Tax Payable, etc.) that can be edited or deleted

### Rule Testing
- Before saving a rule, the accountant can test it against recent unreconciled transactions to see which ones would match
- Matched transactions are previewed with their suggested account before the rule is activated

### Auto-Coding from Card Transactions
- Virtual card transactions (020-VCA) use the same rules engine — merchant category codes map to expense accounts using the same rule structure
- Accountants manage card auto-coding rules from the same interface as bank feed rules

### Before / After

```
// Before
Accountant opens reconciliation queue →
clicks through 40 transactions →
manually selects account for each →
30 of them were the same recurring vendors

// After
Accountant creates rules for recurring vendors →
opens reconciliation queue →
30 transactions are already auto-suggested or auto-posted →
reviews only the 10 genuinely new or ambiguous transactions
```

---

## Benefits (Why)

**For Accountants & Bookkeepers**
- Recurring transactions handled automatically — no more repetitive clicking
- Rules accumulate over time — the longer a workspace is on Polygon, the less manual reconciliation work remains
- Card and bank feed transactions managed from one consistent interface

**For Business Owners**
- Faster close — month-end reconciliation shrinks from hours to minutes as rules mature
- Fewer errors — rules encode the accountant's knowledge so it's consistently applied

**Platform Value**
- Closes the loop between 004-BFR (bank feeds) and 020-VCA (virtual cards) — both feed into the same rules engine
- Rules are a retention driver — a workspace with 50 configured rules has strong switching cost
- Foundation for ML-assisted auto-categorisation (rules become training data)

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
- `bank_feed_rules` table and backend matching logic already exist (004-BFR complete) — this epic is primarily frontend UI + wiring card transactions into the same engine
- The rules engine already supports: exact match, contains, starts_with, regex, amount range, auto-reconcile flag, priority ordering
- Card transactions from 020-VCA will use merchant category codes as their match field — the rules engine may need a minor extension to support category-code matching (low effort)

**Dependencies**
- 004-BFR Bank Feeds & Reconciliation — backend rules engine, `bank_feed_rules` table
- 020-VCA Virtual Cards — card transaction auto-coding reuses this rules UI

**Risks**
- Rules that are too broad (e.g. match anything containing "payment") can cause incorrect auto-posting — a testing/preview step is essential before activation
- Auto-post rules (not just suggest) bypass accountant review — must require explicit opt-in and display a clear warning

---

## Estimated Effort

**T-Shirt Size**: M (2 sprints)

| Phase | Work |
|-------|------|
| Backend | Minor extension for card MCC match type; API endpoints for rules CRUD (may already exist); seeded default rules |
| Frontend | Rules management page (list, create, edit, delete, reorder); rule test/preview against live transactions |
| Tests | Rule matching accuracy, priority ordering, auto-post safeguards, card MCC matching |

---

## Proceed to Spec?

**YES** — backend infrastructure exists, dependencies are clear, scope is tightly bounded. Ready to spec immediately.
