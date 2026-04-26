---
title: "Idea Brief: Repeating Entries"
---

# Idea Brief: Repeating Entries

**Created**: 2026-03-14
**Author**: William Whitelaw

---

## Problem Statement (What)

- Business owners create the same invoices, bills, and journal entries on a recurring cycle (weekly rent, monthly subscriptions, quarterly BAS provisions)
- Each cycle they manually re-create the document — re-entering contact, lines, accounts, amounts
- Missed or late entries cause inaccurate financial reports and cash flow forecasts
- No visibility into upcoming scheduled entries — users can't see what's due next week

**Current State**: Users duplicate documents manually. A `RecurringTemplate` model exists with scheduling logic (`advanceToNextDueDate()`, frequency support, occurrence tracking) but has no proper UI, no bill support, and no background execution job.

---

## Possible Solution (How)

A unified "Repeating" module across invoices, bills, and manual journals:

- **Template creation**: "Save as Repeating" from any invoice, bill, or journal entry — captures the full document payload (lines, contact, accounts, tax codes, amounts)
- **Schedule configuration**: Frequency (weekly/fortnightly/monthly/quarterly/yearly), start date, optional end date or max occurrences
- **Automated execution**: Laravel scheduled command (`ProcessRecurringTemplates`) runs daily, creates documents when `next_due_date` is reached
- **Dedicated list page**: `/repeating` showing all templates with next due date, frequency, last run, status (active/paused/completed)
- **"Repeating" tab**: On invoice, bill, and journal entry index pages (using existing `StatusTabs` pattern) filtering to show only repeating-generated documents
- **Template management**: Edit template payload, pause/resume, change frequency, delete
- **Execution history**: Log of every document generated from each template with timestamp and link

```
// Before
1. Open "New Invoice"
2. Re-enter customer, 6 line items, accounts, tax codes
3. Submit — repeat next month
4. Forget one month → cash flow report is wrong

// After
1. Create invoice once → "Save as Repeating" (monthly)
2. System auto-creates the invoice each month
3. Dashboard widget: "3 repeating entries due this week"
4. Pause/edit/cancel anytime from /repeating
```

---

## Benefits (Why)

**User Experience**:
- Eliminates repetitive data entry: ~5 min per document × N documents per cycle
- Reduces human error from manual re-creation (wrong amounts, missing lines)

**Operational Efficiency**:
- Entries created on time, every time — no more "forgot to invoice this month"
- Financial reports always up to date without manual intervention

**Business Value**:
- Better cash flow accuracy from timely invoice/bill creation
- Foundation for automated payment reminders and cash flow forecasting

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
- `RecurringTemplate` model and scheduling logic are production-ready (already built)
- Templates store enough data in `template_data` JSON to fully reconstruct any document type
- Laravel scheduler is configured and running in production

**Dependencies**:
- Invoicing (005-IAR) — invoice creation action
- Bills — bill creation action
- Manual journals (002-CLE) — journal entry creation action
- StatusTabs component (already built this session)

**Risks**:
- Template payload drift (LOW) — if invoice line schema changes, old templates may break → Mitigation: validate `template_data` before execution, skip and alert on failure
- Duplicate creation on retry (LOW) — idempotency needed if job runs twice → Mitigation: track `last_executed_at` per template, skip if already run for current period

---

## Estimated Effort

**M — 1 week (1 sprint)**

- **Phase 1** (2 days): Backend — `ProcessRecurringTemplates` command, execution history table, bill/JE template type support, idempotency guard
- **Phase 2** (2 days): Frontend — `/repeating` list page, "Save as Repeating" modal on invoice/bill/JE forms, template edit/pause/delete actions
- **Phase 3** (1 day): Integration — "Repeating" tab on index pages, dashboard widget for upcoming entries, tests

---

## Proceed to PRD?

**YES** — Foundation model already exists. Primarily a UI + scheduled job build on proven patterns.

---

## Decision

- [ ] **Approved** - Proceed to PRD
- [ ] **Needs More Information**
- [ ] **Declined**

**Approval Date**: —

---

## Next Steps

**If Approved**:
1. [ ] `/speckit-specify` — Generate full spec from this brief
2. [ ] `/speckit-plan` — Technical plan
3. [ ] `/speckit-tasks` — Implementation tasks
4. [ ] `/speckit-implement` — Build it
