---
title: "Feature Specification: Automated Payment Reminders"
---

# Feature Specification: Automated Payment Reminders

**Epic**: 090-APR | **Created**: 2026-04-01 | **Status**: Draft
**Depends on**: 005-IAR (Invoicing), 023-EML (Email Infrastructure)

---

## Problem Statement

Businesses manually chase overdue invoices. No automated reminder system exists. Xero sends configurable reminder emails at intervals (7 days before due, on due date, 7/14/30 days overdue) which significantly reduces days-sales-outstanding.

## Scope

### In Scope (P1)
- Reminder schedule configuration per workspace (up to 5 reminder stages)
- Default schedule: 3 days before due, on due date, 7 days overdue, 14 days overdue, 30 days overdue
- Email template per reminder stage (customisable subject, body, tone escalation)
- Scheduled job: daily check for invoices matching reminder criteria
- Reminder history per invoice (when sent, which stage, email address)
- Opt-out per invoice (skip reminders for specific invoices)
- Opt-out per contact (never send reminders to this customer)

### In Scope (P2)
- SMS reminders (via Twilio/MessageBird)
- Reminder effectiveness dashboard (% paid within N days of reminder)
- Statement of account email (monthly summary of all outstanding invoices)
- Escalation actions (mark as bad debt after final reminder, create task for follow-up)
- Practice mode: reminders sent on behalf of client workspaces

### Out of Scope
- Debt collection agency integration
- Legal demand letter generation
- Credit reporting

## Key Entities
- `ReminderSchedule` — workspace_id, stages (JSON array of {days_offset, template_id, enabled})
- `ReminderLog` — invoice_id, stage, sent_at, email_address, opened_at, clicked_at
- `ReminderTemplate` — workspace_id, stage, subject, body_html, tone (friendly|firm|urgent|final)
