---
title: "Tasks: Industry Benchmarking & Financial Ratios"
---

# Tasks: Industry Benchmarking & Financial Ratios

**Epic**: 034-IBR
**Created**: 2026-03-16

---

## Phase 1: Database & Models

- [X] **Task 1.1**: Create migration `create_industry_benchmarks_table` — columns: id, industry_code (string), ratio_code (string), average (decimal 8,2), p25 (decimal 8,2), p75 (decimal 8,2), source (string), year (int), timestamps
- [X] **Task 1.2**: Create `IndustryBenchmark` model in `app/Models/Tenant/` — fillable fields, no tenant scoping
- [X] **Task 1.3**: Create `BenchmarkDataSeeder` with realistic ATO-style data for 10 industries x 8 ratios
- [X] **Task 1.4**: Create `RatioCode` enum in `app/Enums/` with 8 ratio codes and labels

## Phase 2: Action & Controller

- [X] **Task 2.1**: Create `CalculateFinancialRatios` action with `AsAction` trait — computes all 8 ratios from JE lines and account balances
- [X] **Task 2.2**: Create `BenchmarkResource` API Resource — wraps ratio data + industry benchmarks
- [X] **Task 2.3**: Create `BenchmarkController` with `index` (full ratios) and `summary` (top 3 for dashboard) endpoints
- [X] **Task 2.4**: Register routes: `GET /api/v1/benchmarks` and `GET /api/v1/benchmarks/summary`

## Phase 3: Chat Tool Integration

- [X] **Task 3.1**: Add `benchmarks` method to `ChatToolController`
- [X] **Task 3.2**: Add route `GET /api/v1/chat/tools/benchmarks`
- [X] **Task 3.3**: Add `get_benchmarks` tool to frontend `route.ts`

## Phase 4: Frontend — Types, Hooks & Page

- [X] **Task 4.1**: Add benchmark types to `frontend/src/types/index.ts`
- [X] **Task 4.2**: Create `frontend/src/hooks/use-benchmarks.ts` with TanStack Query hooks
- [X] **Task 4.3**: Create `/benchmarks` page at `frontend/src/app/(dashboard)/benchmarks/page.tsx`
- [X] **Task 4.4**: Add Benchmarks to navigation in `frontend/src/lib/navigation.ts`

## Phase 5: Dashboard Widget

- [X] **Task 5.1**: Add `financial_health` to `WidgetId` type and widget registry
- [X] **Task 5.2**: Create `FinancialHealthCard` widget component in dashboard page

## Phase 6: Tests

- [X] **Task 6.1**: Create `tests/Feature/Api/BenchmarkApiTest.php` — test endpoints, permissions, edge cases
