---
title: "Feature Specification: Report Drill-Down & Date Comparison"
---

# Feature Specification: Report Drill-Down & Date Comparison

**Epic**: 091-RDD | **Created**: 2026-04-01 | **Status**: Draft
**Depends on**: 007-FRC (Financial Reporting)

---

## Problem Statement

MoneyQuest reports show summary totals but lack drill-down capability. Users cannot click an account balance to see the underlying transactions. Reports also lack period-over-period comparison (this month vs last month, this year vs last year). Xero's reporting strength is deep drill-down and flexible date comparison.

## Scope

### In Scope (P1)
- Click-to-drill on any report line: account balance → transaction list
- Transaction list shows journal entry lines filtered by account + date range
- Date comparison mode: compare current period against a prior period (month, quarter, year)
- Variance column: absolute and percentage change between periods
- Applies to: Trial Balance, P&L, Balance Sheet, General Ledger

### In Scope (P2)
- Multi-period comparison (up to 12 months side-by-side)
- Budget vs Actual comparison overlay on P&L and Balance Sheet
- Tracking category breakdown (drill into department/location/project splits)
- Report export with drill-down data (Excel with linked sheets)
- Saved report configurations (date range + comparison + filters as named preset)
- Report scheduling (email PDF monthly to stakeholders)

### In Scope (P3)
- Custom formula columns (calculated metrics like gross margin %, current ratio)
- Dashboard-embeddable report widgets (mini P&L, mini Balance Sheet)
- Consolidated reporting across workspace groups (028-CFT extension)
- Audit trail integration (who posted each transaction in drill-down)

### Out of Scope
- BI tool integration (Tableau, Power BI connectors)
- Natural language report queries (covered by 021-AIQ)

## Key Entities
- `ReportPreset` — workspace_id, report_type, name, date_range, comparison_period, filters (JSON), tracking_categories
- `ScheduledReport` — report_preset_id, frequency, recipients (JSON), last_sent_at, next_send_at

## Success Criteria
- Drill-down renders < 1 second for accounts with < 10,000 transactions
- Date comparison adds < 500ms to report generation
- Budget vs Actual variance within $1 of manual calculation
