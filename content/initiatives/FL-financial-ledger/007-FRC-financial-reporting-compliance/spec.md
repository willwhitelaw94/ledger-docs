---
title: "Feature Specification: Financial Reporting & Compliance"
---

# Feature Specification: Financial Reporting & Compliance

**Epic**: 007-FRC
**Created**: 2026-03-01
**Status**: Complete
**Initiative**: FL — MoneyQuest Ledger
**Phase**: 2 (Sprints 5–8)
**Design Direction**: Super Modern

---

## Context

The Financial Reporting & Compliance module provides the reporting layer for MoneyQuest Ledger. It generates standard financial statements (Trial Balance, Profit & Loss, Balance Sheet, General Ledger) and Australian tax compliance reports (BAS — Business Activity Statement). All reports are read-only queries against posted journal entries, ensuring the immutable ledger is never modified by reporting.

Reports respect the debit/credit normal balance convention per account type and use the workspace's fiscal year configuration for period calculations. The Balance Sheet implements virtual year-end close — P&L rollup to Retained Earnings is calculated on-the-fly by projectors, requiring no manual closing entries.

> **Scope**: This epic covers 5 implemented reports (Trial Balance, P&L, Balance Sheet, General Ledger, BAS) plus a planned Cash Flow Statement (frontend placeholder exists, backend not yet built). BAS is feature-gated to Professional+ plans via the `bas_lodgement` feature flag.

### Architectural Context

- **Reports read from projectors** — all reports query posted journal entries and their lines, never raw events. The AccountBalance projector provides denormalised totals for Trial Balance performance.
- **Debit/credit normal balances** — Asset and Expense accounts are debit-normal (positive when debits > credits). Liability, Equity, and Revenue accounts are credit-normal (positive when credits > debits). All report calculations respect this convention.
- **Fiscal year awareness** — Balance Sheet current year earnings and BAS quarterly defaults use `workspace.fiscal_year_start_month` (typically 7 for Australian businesses).
- **Comparative reporting** — P&L supports optional comparison periods with variance calculation.
- **BAS field mapping** — Tax codes carry a `bas_field` (e.g., "1A", "1B") that maps journal entry line tax amounts to the correct BAS position.

### Dependencies

| Direction | Epic | Relationship |
|-----------|------|-------------|
| **Depends on** | 002-CLE Core Ledger Engine | Reports read from journal entries, account balances, chart of accounts, and tax codes |
| **Depends on** | 003-AUT Auth & Multi-tenancy | Workspace scoping, role-based report access |
| **Depends on** | 005-IAR Invoicing & AR/AP | AR aging data feeds into financial overview |
| **Integrates with** | 008-JCT Job Costing | Job-tagged lines visible in General Ledger detail |
| **Integrates with** | 011-MCY Multi-Currency | Future: FX consolidation in reports |

---

## User Scenarios & Testing

### User Story 1 — Trial Balance (Priority: P1)

An accountant generates a Trial Balance to verify that total debits equal total credits across all accounts. The report lists every account with a non-zero balance, showing debit and credit totals, and validates the fundamental accounting equation.

**Why this priority**: The Trial Balance is the most basic financial verification tool. It proves the ledger is in balance and is the foundation for all other reports.

**Independent Test**: An accountant can generate a Trial Balance, see all accounts with their debit/credit balances, and confirm the totals are balanced — verifying ledger integrity.

**Acceptance Scenarios**:

1. **Given** posted journal entries exist, **When** an accountant generates the Trial Balance, **Then** all accounts with non-zero balances are listed with debit_balance and credit_balance columns, and `is_balanced` is true when total debits = total credits
2. **Given** no posted entries exist, **When** the Trial Balance is generated, **Then** an empty list is returned with zero totals and `is_balanced` = true
3. **Given** a user with role "bookkeeper" (has `report.trial-balance` permission), **When** they request the Trial Balance, **Then** access is granted
4. **Given** accounts with both debit-normal (assets, expenses) and credit-normal (liabilities, equity, revenue) balances, **When** the Trial Balance is generated, **Then** each account's balance appears in the correct column based on its normal balance direction

---

### User Story 2 — Profit & Loss Statement (Priority: P1)

An accountant generates a Profit & Loss (Income Statement) for a date range, showing revenue, expenses, and net profit. Optionally, a comparison period can be included to calculate variance.

**Why this priority**: The P&L is the primary performance report. Business owners and accountants use it to understand profitability over a period.

**Independent Test**: An accountant can generate a P&L for Q1 2026, see revenue and expense breakdowns, confirm net profit calculation, and optionally compare against Q4 2025 with variance percentages.

**Acceptance Scenarios**:

1. **Given** posted entries with revenue and expense accounts within March 2026, **When** an accountant generates P&L for 2026-03-01 to 2026-03-31, **Then** revenue accounts show credit-normal amounts, expense accounts show debit-normal amounts, and net_profit = total_revenue - total_expenses
2. **Given** entries exist both inside and outside the date range, **When** P&L is generated for March 2026, **Then** only entries with entry_date within the range are included
3. **Given** a comparison period is specified (compare_start_date, compare_end_date), **When** P&L is generated with both periods, **Then** the response includes `comparison_total_revenue`, `comparison_total_expenses`, `comparison_net_profit`, `variance_net_profit`, and per-account rows include `comparison_amount`, `variance`, and `variance_percentage`
4. **Given** missing start_date or end_date, **When** the request is submitted, **Then** a 422 validation error is returned
5. **Given** a user with "client" role (has `report.profit-loss` permission), **When** they request the P&L, **Then** access is granted

---

### User Story 3 — Balance Sheet (Priority: P1)

An accountant generates a Balance Sheet as at a specific date, showing assets, liabilities, equity, and current year earnings. The report validates the accounting equation: Assets = Liabilities + Equity + Current Year Earnings.

**Why this priority**: The Balance Sheet shows the financial position at a point in time. It's required for regulatory compliance and business valuation.

**Independent Test**: An accountant can generate a Balance Sheet as at 31 March 2026, see asset/liability/equity sections with account balances, confirm current year earnings are calculated from the fiscal year start, and verify the accounting equation balances.

**Acceptance Scenarios**:

1. **Given** posted entries up to and including 2026-03-31, **When** the Balance Sheet is generated as at 2026-03-31, **Then** only entries with entry_date <= 2026-03-31 are included, and the response includes assets, liabilities, equity sections with per-account balances
2. **Given** a workspace with fiscal year starting July (month 7), **When** the Balance Sheet is generated as at 2026-03-31, **Then** current_year_earnings = (YTD revenue - YTD expenses) from 2025-07-01 to 2026-03-31
3. **Given** the report is generated, **When** totals are calculated, **Then** `is_balanced` = true when total_assets === total_liabilities + total_equity + current_year_earnings
4. **Given** entries exist after the as_at_date, **When** the Balance Sheet is generated, **Then** those entries are excluded
5. **Given** missing as_at_date, **When** the request is submitted, **Then** a 422 validation error is returned

---

### User Story 4 — General Ledger (Priority: P1)

An accountant generates a General Ledger showing all transactions for each account within a date range, with opening balances, running balances, and closing balances. Optionally filtered to a single account.

**Why this priority**: The General Ledger is the detailed transaction record that auditors and accountants use for verification and reconciliation.

**Independent Test**: An accountant can generate the General Ledger for March 2026, see transactions grouped by account with running balances, filter to a single account, and verify that opening + movements = closing balance.

**Acceptance Scenarios**:

1. **Given** posted entries in March 2026 across multiple accounts, **When** the General Ledger is generated for 2026-03-01 to 2026-03-31, **Then** each account shows opening_balance (from entries before start_date), transactions sorted by entry_date with per-row debit/credit amounts and running_balance, and a closing_balance that equals opening_balance + net movements
2. **Given** an account_id filter is applied, **When** the General Ledger is generated, **Then** only that account's transactions are returned
3. **Given** entries exist before the start_date, **When** the General Ledger is generated, **Then** those entries contribute to the opening_balance but do not appear as transactions
4. **Given** accounts with no transactions and zero opening balance, **When** the General Ledger is generated without account_id filter, **Then** those accounts are excluded from the response

---

### User Story 5 — BAS Report (Priority: P2)

An accountant generates a Business Activity Statement (BAS) report for Australian GST compliance. The report maps journal entry tax amounts to BAS field positions and provides a tax summary with net GST payable.

**Why this priority**: BAS is an Australian regulatory requirement but depends on tax codes and journal entries being in place first.

**Independent Test**: An accountant can generate a BAS report for Q1 2026, see tax amounts mapped to BAS fields (1A, 1B, etc.), view a tax code summary, and confirm the net GST payable calculation.

**Acceptance Scenarios**:

1. **Given** posted entries with GST tax codes (mapped to BAS fields), **When** the BAS report is generated for 2026-01-01 to 2026-03-31, **Then** net_amount and tax_amount are aggregated per BAS field
2. **Given** entries with different tax codes (GST, GST-Free, Input-Taxed), **When** the BAS report is generated, **Then** the tax_summary shows per-code breakdown with code, name, rate_basis_points, net_amount, tax_amount, and line_count
3. **Given** both output tax (sales, BAS field 1A) and input tax (purchases, BAS field 1B), **When** totals are calculated, **Then** net_gst_payable = total_tax_collected - total_tax_paid
4. **Given** entries without tax codes, **When** the BAS report is generated, **Then** those entries are excluded (only lines with non-null tax_code are included)

---

### User Story 6 — Report Access Control (Priority: P2)

Different workspace roles have access to different reports based on their responsibilities. Bookkeepers can access operational reports (Trial Balance, General Ledger) but not strategic reports (P&L, Balance Sheet) unless they have the appropriate permissions.

**Why this priority**: Report access control is important for governance but is a supporting concern, not a core reporting feature.

**Independent Test**: A bookkeeper can access the Trial Balance and General Ledger but is denied access to the P&L, while an auditor can access all reports as read-only.

**Acceptance Scenarios**:

1. **Given** a user with "bookkeeper" role, **When** they request the Trial Balance, **Then** access is granted (has `report.trial-balance`)
2. **Given** a user with "bookkeeper" role, **When** they request the P&L, **Then** access is denied 403 (lacks `report.profit-loss`)
3. **Given** a user with "auditor" role, **When** they request any report, **Then** access is granted (has all report permissions)
4. **Given** a user with "client" role, **When** they request the General Ledger, **Then** access is denied 403 (lacks `report.general-ledger`)

---

### Edge Cases

- **Empty workspace**: No posted entries → all reports return empty data with zero totals; Trial Balance and Balance Sheet show `is_balanced` = true
- **Unbalanced ledger**: If AccountBalance projector is out of sync → Trial Balance shows `is_balanced` = false, alerting the accountant to investigate
- **Fiscal year boundary**: Balance Sheet as at June 30 (fiscal year end) → current_year_earnings covers the full fiscal year; as at July 1 → new fiscal year starts with zero current_year_earnings
- **Reversed entries**: Reversed journal entries are still "posted" status → they appear in reports as separate entries, netting each other out
- **Tax code with no BAS field**: Tax codes where `bas_field` is null → excluded from BAS field aggregation but may appear in tax_summary
- **Very large ledger**: Workspace with 50K+ entries → General Ledger pagination and AccountBalance denormalisation ensure performance
- **Comparative P&L with no comparison data**: Comparison period has zero entries → variance equals the full current period amount
- **Cross-workspace isolation**: Reports for workspace A must never include entries from workspace B — enforced by workspace_id filter on all queries
- **BAS on Starter plan**: User on Starter plan (lacks `bas_lodgement` feature) hits BAS endpoint → 403 via CheckFeature middleware
- **Cash Flow not yet implemented**: Frontend page exists but backend returns no data — placeholder "Coming soon" state

---

## Requirements

### Functional Requirements

**Trial Balance**

- **FR-FRC-001**: System MUST generate a Trial Balance listing all accounts with non-zero debit or credit balances from posted journal entries
- **FR-FRC-002**: Trial Balance MUST validate that total debits = total credits and return `is_balanced` flag
- **FR-FRC-003**: Trial Balance MUST use the AccountBalance projector for performance (denormalised debit_total, credit_total per account)

**Profit & Loss**

- **FR-FRC-004**: System MUST generate a P&L for a specified date range, filtering only posted entries within that range
- **FR-FRC-005**: P&L MUST include only Revenue and Expense account types
- **FR-FRC-006**: P&L MUST respect debit/credit normal balances: Revenue = credits - debits; Expenses = debits - credits
- **FR-FRC-007**: P&L MUST support optional comparison period with variance and variance_percentage calculation
- **FR-FRC-008**: P&L MUST calculate net_profit = total_revenue - total_expenses

**Balance Sheet**

- **FR-FRC-009**: System MUST generate a Balance Sheet as at a specific date, including all posted entries on or before that date
- **FR-FRC-010**: Balance Sheet MUST include only Asset, Liability, and Equity account types
- **FR-FRC-011**: Balance Sheet MUST calculate current_year_earnings from the workspace's fiscal year start to the as_at_date (Revenue - Expenses for that period)
- **FR-FRC-012**: Balance Sheet MUST validate the accounting equation: total_assets = total_liabilities + total_equity + current_year_earnings
- **FR-FRC-013**: Virtual year-end close — no manual closing entries required; current_year_earnings calculated on-the-fly

**General Ledger**

- **FR-FRC-014**: System MUST generate a General Ledger for a date range with per-account transaction detail
- **FR-FRC-015**: General Ledger MUST calculate opening_balance from all entries before the start_date
- **FR-FRC-016**: General Ledger MUST show a running_balance after each transaction within the date range
- **FR-FRC-017**: General Ledger MUST support optional single-account filtering via account_id parameter
- **FR-FRC-018**: General Ledger MUST exclude accounts with no transactions and zero opening balance (unless specifically filtered)

**BAS Report**

- **FR-FRC-019**: System MUST generate a BAS report mapping tax amounts to BAS fields via TaxCode.bas_field
- **FR-FRC-020**: BAS MUST aggregate net_amount and tax_amount per BAS field from posted journal entry lines with non-null tax_code
- **FR-FRC-021**: BAS MUST provide tax_summary grouped by tax code with code, name, rate_basis_points, net_amount, tax_amount, line_count
- **FR-FRC-022**: BAS MUST calculate totals: total_tax_collected (output tax), total_tax_paid (input tax), net_gst_payable

**Cash Flow Statement (Planned)**

- **FR-FRC-023**: System SHOULD generate a Cash Flow Statement categorising cash movements by operating, investing, and financing activities
- **FR-FRC-024**: Cash Flow frontend page exists as a placeholder ("Coming soon") — backend action not yet implemented

**Feature Gating**

- **FR-FRC-025**: BAS report MUST be gated by `bas_lodgement` feature flag (Professional+ plans only)

**Authorization**

- **FR-FRC-026**: System MUST enforce report-specific permissions: `report.trial-balance`, `report.profit-loss`, `report.balance-sheet`, `report.general-ledger`
- **FR-FRC-027**: Owner, Accountant, and Auditor roles MUST have all report permissions
- **FR-FRC-028**: Bookkeeper role MUST have `report.trial-balance` and `report.general-ledger` only
- **FR-FRC-029**: Approver role MUST have all report permissions
- **FR-FRC-030**: Client role MUST have `report.trial-balance`, `report.profit-loss`, and `report.balance-sheet` (no General Ledger)

**Tenant Scoping**

- **FR-FRC-031**: All report queries MUST be scoped by workspace_id — no cross-workspace data in any report
- **FR-FRC-032**: Fiscal year calculations MUST use the workspace's configured fiscal_year_start_month

### Key Entities

- **ReportController**: Thin controller with 5 endpoints (trial-balance, profit-and-loss, balance-sheet, general-ledger, bas). Delegates to Actions for business logic.
- **GenerateProfitAndLoss**: Action that aggregates Revenue/Expense accounts from posted journal entry lines within a date range, with optional comparative period.
- **GenerateBalanceSheet**: Action that aggregates Asset/Liability/Equity accounts from posted entries up to an as_at_date, calculating current year earnings from the fiscal year start.
- **GenerateGeneralLedger**: Action that iterates accounts, calculates opening balances, and builds transaction-level detail with running balances.
- **GenerateBasReport**: Action that maps journal entry line tax amounts to BAS fields via TaxCode.bas_field, providing field-level and code-level aggregation.

---

## Success Criteria

### Measurable Outcomes

- **SC-FRC-001**: Trial Balance always returns `is_balanced` = true for a correctly maintained ledger — any imbalance is immediately visible
- **SC-FRC-002**: P&L net_profit calculation matches manual verification across all test cases
- **SC-FRC-003**: Balance Sheet accounting equation validates (total_assets = total_liabilities + total_equity + current_year_earnings) for all test scenarios
- **SC-FRC-004**: Virtual year-end close produces identical Retained Earnings to manual close method — verified by parallel calculation
- **SC-FRC-005**: General Ledger opening_balance + sum of movements = closing_balance for every account in every test
- **SC-FRC-006**: BAS net_gst_payable matches manual tax calculation — verified against test entries with known tax codes
- **SC-FRC-007**: Report access control enforced — bookkeeper denied P&L access, client denied General Ledger access (verified by authorization tests)
- **SC-FRC-008**: Cross-workspace report isolation verified — reports for workspace A contain zero data from workspace B
