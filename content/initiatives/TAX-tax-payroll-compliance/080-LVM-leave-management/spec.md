---
title: "Feature Specification: Leave Management"
---

# Feature Specification: Leave Management

**Epic**: 080-LVM | **Created**: 2026-04-01 | **Status**: Draft
**Depends on**: 064-PAY (Payroll & HR)

---

## Problem Statement

Leave management is currently limited to balance tracking on pay run lines. There is no leave request workflow, no calendar visualisation, no leave type configuration, and no NES entitlement enforcement. Employees and managers have no way to request, approve, or view leave outside of pay runs.

## Scope

### In Scope (P1 — Core)
- Leave type configuration: annual, personal/carer's, compassionate, community service, long service (per state)
- Leave request creation (employee or on behalf of) with date range, leave type, hours, notes
- Leave approval workflow: pending → approved → rejected (manager/owner)
- Leave calendar view (monthly, per-employee and team overview)
- Leave balance display per employee (current, projected after pending requests)
- NES entitlement calculation: 4 weeks annual, 10 days personal per year (pro-rated for part-time)
- Leave accrual integration with pay runs (064-PAY already calculates, this displays and manages)

### In Scope (P2 — Advanced)
- Leave loading calculation (17.5% annual leave loading)
- Leave in advance (negative balance with approval)
- Time-in-lieu accrual and usage
- Public holiday calendar integration (state-specific)
- Leave balance forecast (projected balance at future date)
- Team availability heatmap (who's away when)
- Export leave balances for audit

### In Scope (P3 — Self-Service)
- Employee self-service portal: request leave, view balances, download leave history
- Manager dashboard: pending approvals, team availability, leave liability
- Email notifications for leave requests and approvals
- Slack/Teams integration for leave notifications

### Out of Scope
- Roster/shift management
- Time and attendance tracking (separate from 072-JTW)
- Parental leave government payment processing

## Key Entities
- `LeaveType` — Configurable per workspace (name, accrual_rate, max_balance, paid, NES_linked)
- `LeaveRequest` — Employee leave request (employee_id, leave_type_id, start_date, end_date, hours, status, approved_by, notes)
- `LeaveBalance` — Current balance snapshot per employee per leave type (balance_hours, accrued_ytd, taken_ytd)
- `PublicHoliday` — State-specific public holidays (date, name, state, substitute_date)

## Success Criteria
- Leave request to approval < 2 clicks for manager
- Calendar loads < 1 second for 50-employee workspace
- NES entitlement calculations 100% accurate
- Leave balances reconcile exactly with pay run accruals
