---
title: "Idea Brief: Credit Notes & Allocations"
---

# Idea Brief: Credit Notes & Allocations

## Problem Statement

Invoices that have been sent or received payments cannot be voided — the system correctly prevents this. But there's no mechanism to issue credit notes for returns, overcharges, or billing errors. The aggregate literally throws "Issue a credit note instead" but there's no way to do it yet.

## Possible Solution

Extend the existing `InvoiceAggregate` to fully support credit note creation, approval (with reversing GL entries), and allocation against outstanding invoices. The infrastructure is 60% built — types, numbering, aggregate parameters, and projector all exist. This epic completes the remaining 40%: creation actions, allocation table, GL reversal logic, API endpoints, and frontend UI.

## Benefits

- **Completes the AR/AP cycle** — invoices aren't useful without a correction mechanism
- **Unblocks real-world usage** — any business that invoices will need credit notes within the first month
- **Minimal new code** — leverages existing invoice infrastructure (same model, same aggregate, same projector)
- **Accounting compliance** — proper credit notes with GL impact, not just "delete and re-issue"

## Estimated Effort

**Size: M** (3-4 days)
- Backend: 1.5 days (allocation table, events, actions, API endpoints)
- Frontend: 1 day (create form, allocation UI, list page)
- Tests: 0.5 days

## Proceed to Spec?

**YES** — spec.md already created. Critical path feature for any accounting workflow.
