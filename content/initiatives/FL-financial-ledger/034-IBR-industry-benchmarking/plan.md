---
title: "Technical Plan: Industry Benchmarking & Financial Ratios"
---

# Technical Plan: Industry Benchmarking & Financial Ratios

**Epic**: 034-IBR
**Created**: 2026-03-16

---

## Architecture Overview

### Backend

1. **`industry_benchmarks` table** — reference data storing ATO-style benchmark statistics per industry per ratio.
   - Columns: `id`, `industry_code` (string), `ratio_code` (string), `average` (decimal 8,2), `p25` (decimal 8,2), `p75` (decimal 8,2), `source` (string), `year` (int), `created_at`, `updated_at`
   - Seeded via `BenchmarkDataSeeder` with realistic ATO small business data for 10 industries

2. **`IndustryBenchmark` model** — simple Eloquent model (no tenant scoping — reference data is global)

3. **`CalculateFinancialRatios` action** (Lorisleiva `AsAction`) — the core computation engine:
   - Accepts `workspace_id`, `from` date, `to` date
   - Queries `JournalEntryLine` grouped by `ChartAccount.type` and `ChartAccount.sub_type` for the date range (P&L ratios) and `AccountBalance` for point-in-time ratios (balance sheet)
   - Computes 8 ratios: gross_profit_margin, net_profit_margin, operating_expense_ratio, current_ratio, quick_ratio, debtor_days, creditor_days, revenue_growth
   - Returns array of ratio objects with: `code`, `label`, `value`, `formatted_value`, `description`, `status` (above/within/below/na), `suggestion`
   - Handles division-by-zero gracefully (returns `null` value with status `na`)

4. **`BenchmarkController`** — two endpoints:
   - `GET /api/v1/benchmarks` — full ratio + industry comparison (requires `report.profit-loss` permission)
   - `GET /api/v1/benchmarks/summary` — top 3 ratios for dashboard widget

5. **`BenchmarkResource`** — API Resource wrapping ratio + benchmark data

6. **Chat tool** — `benchmarks` method on `ChatToolController` + `get_benchmarks` tool in frontend `route.ts`

### Frontend

1. **`/benchmarks` page** — full benchmarks view with ratio cards, period selector, industry comparison
2. **`use-benchmarks.ts` hook** — TanStack Query hooks for benchmark endpoints
3. **Dashboard `financial_health` widget** — compact 3-ratio summary card
4. **Types** — `Benchmark`, `BenchmarkRatio`, `BenchmarkSummary` in `types/index.ts`
5. **Navigation** — add Benchmarks to `reportsNav` in `navigation.ts`

### Ratio Formulas (all from JournalEntryLine data)

| Ratio | Formula | Sub-types Used |
|-------|---------|---------------|
| Gross Profit Margin | (Revenue - COGS) / Revenue × 100 | Revenue: all `AccountType::Revenue`; COGS: `direct_cost`, `cost_of_goods_sold`, `subcontractor` |
| Net Profit Margin | (Revenue - All Expenses) / Revenue × 100 | All `AccountType::Expense` |
| Operating Expense Ratio | Operating Expenses / Revenue × 100 | Expense sub-types excluding COGS sub-types |
| Current Ratio | Current Assets / Current Liabilities | Assets: `bank`, `cash`, `current_asset`, `accounts_receivable`, `inventory`, `prepayment`; Liabilities: `current_liability`, `accounts_payable`, `gst_collected`, `gst_paid`, `ato_settlement`, `payg_withholding`, `superannuation_payable`, `credit_card` |
| Quick Ratio | (Cash + Receivables) / Current Liabilities | Cash: `bank`, `cash`; Receivables: `accounts_receivable` |
| Debtor Days | (Receivables / Revenue) × 365 | `accounts_receivable` balance / annual revenue |
| Creditor Days | (Payables / COGS) × 365 | `accounts_payable` balance / annual COGS |
| Revenue Growth | (Current - Prior) / Prior × 100 | Requires 12+ months data |

### COGS Sub-types

The following expense sub-types are classified as Cost of Goods Sold / Cost of Sales:
- `direct_cost`
- `cost_of_goods_sold`
- `subcontractor`

### Industry Codes

Matches workspace `industry` field values:
- `australian_standard` (fallback for all industries)
- `trades`
- `professional_services`
- `retail`
- `hospitality`
- `healthcare`
- `construction`
- `transport`
- `agriculture`
- `technology`

### Authorization

Benchmarks reuse `report.profit-loss` permission — no new permissions needed. All 6 roles that can view P&L can view benchmarks.

---

## Key Decisions

- **No new permissions** — benchmarks are a report, reuse `report.profit-loss`
- **No new policy** — controller uses `Gate::authorize('viewAny', JournalEntry::class)` like other report endpoints
- **Global reference data** — `industry_benchmarks` is NOT tenant-scoped (shared across all workspaces)
- **Ratios computed on demand** — not stored, not event-sourced. Calculated from existing JE lines and account balances
- **Balance sheet ratios use AccountBalance** — point-in-time snapshot (current ratio, quick ratio, debtor/creditor days)
- **P&L ratios use JournalEntryLine** — period-based (gross margin, net margin, opex ratio, revenue growth)
- **Suggestions are hardcoded** — per-ratio static strings, not AI-generated
- **Dashboard widget** — added as `financial_health` to the existing widget system
