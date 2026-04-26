---
title: "Idea Brief: Year-End Close"
---

# Idea Brief: Year-End Close

**Epic**: 019-YEA
**Created**: 2026-03-14
**Initiative**: FL — Financial Ledger Platform

---

## Problem Statement (What)

- There is no formal year-end close process — accountants must manually track what has been done, with no guided checklist or workflow
- Posting year-end adjusting entries (accruals, depreciation, prepayments) is possible but those entries are indistinguishable in the general ledger from ordinary transactions
- There is no retained earnings rollover — the system does not auto-calculate net profit and post the closing entry to retained earnings; accountants must do this manually
- Accounting periods can be locked today, but there is no structured sign-off flow: no trial balance checkpoint, no review step, no accountant sign-off record
- Workpapers and sign-off notes — the internal memos, schedules, and audit-trail records an accountant produces at year end — have nowhere to live; they get stored in email or Dropbox outside the system
- Client users currently have visibility of all entries, but year-end workpapers are internal accounting records that clients should not see

**Current State**: No year-end workflow, no adjustment flagging, no retained earnings automation, no workpaper storage, no sign-off record. Accountants close the year in their heads and in external documents.

---

## Possible Solution (How)

### Adjusting Journal Entries
- Standard journal entry creation flow gains a "Year-End Adjustment" type flag
- Flagged entries display visibly as adjustments in the general ledger and on reports
- Accountants can filter the ledger to show only adjustment entries

### Period Lock & Close Workflow
- A step-by-step close checklist UI guides the accountant through:
  1. Lock the period (prevent new entries)
  2. Run the trial balance and verify it balances
  3. Review and confirm retained earnings rollover
  4. Sign off the period with a name and timestamp
- Only the `owner` and `accountant` roles can lock or close a period
- The checklist shows status (incomplete / in-progress / complete) per step

### Retained Earnings Rollover
- When the accountant reaches the retained earnings step, the system calculates net profit for the period
- A proposed closing entry is displayed for review (debit revenue accounts, credit expense accounts, net to retained earnings)
- Accountant confirms — entry is posted automatically with the "Year-End Adjustment" type flag
- Once confirmed, the rollover cannot be edited (reversal only)

### Workpapers & Sign-Off Notes
- Accountants can attach TipTap rich-text workpaper notes to a period close
- File attachments are supported on workpaper notes (PDFs, spreadsheets, supporting documents)
- Workpapers are marked internal — the `client` and `auditor` roles cannot see them
- Sign-off is recorded with the accountant's name, timestamp, and optional comment

### Before / After

```
// Before
Accountant posts year-end entries with no flag → indistinguishable in ledger →
manually calculates retained earnings → posts closing entry manually →
stores workpapers in email → no sign-off record → no way to prove period is closed

// After
Accountant flags adjusting entries → opens close workflow checklist →
system calculates and proposes retained earnings entry → accountant confirms →
entry posted automatically → workpapers attached to close record →
sign-off recorded with timestamp → period is formally closed
```

---

## Benefits (Why)

**For Accountants**
- Formal close process reduces risk of missed steps — guided checklist vs. memory
- Adjustment entries are clearly identified in reports — no hunting for year-end entries
- Retained earnings automation eliminates manual calculation errors
- Workpapers stay in the system — no external file management

**For Business Owners**
- Period close is a formal, auditable record — not an informal understanding
- Can see that their accountant has signed off the year without needing to ask

**Platform Value**
- Year-end close is a core accountant workflow — without it, MoneyQuest Ledger is incomplete for professional accounting use
- Sign-off records and workpaper storage differentiate from basic bookkeeping tools
- Foundation for future audit support features

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
- Accounting periods exist and can be locked (partial — locking exists, formal close workflow does not)
- The `accountant` and `owner` roles are implemented (003-AUT complete)
- Journal entry creation with types is implemented (002-CLE complete)
- Financial reporting (trial balance, P&L) exists (007-FRC complete)
- TipTap rich-text notes exist (implemented — polymorphic notes system)
- File attachments exist (012-ATT complete)

**Dependencies**
- 002-CLE Core Ledger Engine — journal entries, event sourcing, period locking
- 007-FRC Financial Reporting — trial balance, P&L for retained earnings calculation
- 003-AUT Auth & Multi-tenancy — role-based access for close workflow

**Risks**
- Retained earnings rollover touches the chart of accounts — must locate or create the retained earnings account reliably
- Closing entries are high-stakes — a wrong rollover amount could corrupt the opening balances
- Workpaper visibility rules add a third permission dimension (beyond workspace + role)
- Period close is irreversible in most accounting systems — UX must clearly communicate finality

---

## Estimated Effort

**T-Shirt Size**: L (3–4 sprints)

| Phase | Work |
|-------|------|
| Backend | Adjusting entry type flag, period close state machine, retained earnings calculator, workpaper model with visibility rules |
| API | Close workflow endpoints, retained earnings preview, workpaper CRUD |
| Frontend | Close checklist UI, adjustment flag on entry forms, workpaper notes panel, sign-off flow |
| Tests | Retained earnings calculation accuracy, close workflow state transitions, workpaper visibility isolation |

---

## Proceed to Spec?

**YES** — all dependencies are complete. This is a greenfield feature with no blockers. Retained earnings calculation logic should be specified carefully before implementation begins.
