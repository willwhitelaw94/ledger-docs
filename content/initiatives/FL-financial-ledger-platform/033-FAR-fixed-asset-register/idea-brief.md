---
title: "Idea Brief: Fixed Asset Register & Depreciation"
---

# Idea Brief: Fixed Asset Register & Depreciation

**Created**: 2026-03-15
**Author**: William Whitelaw

---

## Problem Statement (What)

- Users have no way to track fixed assets (vehicles, equipment, property, furniture) or intangible assets (patents, software licenses, goodwill) within MoneyQuest
- Depreciation and amortization journal entries must be manually created each period — tedious, error-prone, and often forgotten
- No visibility into total asset value, accumulated depreciation, or net book value
- No asset disposal workflow — selling or scrapping an asset requires manual gain/loss calculations
- Individuals tracking personal assets (via Personal Ledger) have no depreciation mechanism

**Current State**: Assets exist only as balances in chart accounts with no structured register, no depreciation schedules, and no asset lifecycle management.

---

## Possible Solution (How)

A toggleable module providing a full asset register with automated depreciation/amortization schedules powered by the Financial Schedule Engine (built in 032-LAT).

- **Asset register** — list of all assets with purchase date, cost, net book value, depreciation method, useful life
- **Asset types** — Tangible (vehicles, equipment, property, furniture, plant) and Intangible (patents, software, goodwill, trademarks)
- **Depreciation methods** — Straight-line, Diminishing value, Units of production
- **Amortization** — same engine, applied to intangible assets
- **Auto journal entries** — Financial Schedule Engine generates periodic depreciation/amortization JEs
- **Asset lifecycle** — Acquired → In Service → Disposed (sold/scrapped/written off)
- **Disposal workflow** — calculate gain/loss on disposal, generate closing JEs
- **Revaluation** — adjust asset value up/down with JE (revaluation reserve)
- **Dashboard widget** — total asset value, net book value, depreciation this period

```
// Before
1. Buy equipment for $20,000
2. Manually calculate monthly depreciation
3. Manually create JE each month (DR Depreciation Expense, CR Accumulated Depreciation)
4. Forget for 3 months, scramble at year-end

// After
1. Add asset → system generates depreciation schedule
2. Schedule Engine auto-creates JEs each period
3. See net book value, accumulated depreciation, remaining useful life
4. Dispose asset → system calculates gain/loss and creates closing JE
```

---

## Benefits (Why)

**User/Client Experience**:
- Eliminate manual depreciation JEs: ~12 per asset per year automated
- Clear visibility into asset values and net book value at any point

**Operational Efficiency**:
- Depreciation calculated once, posted automatically by Schedule Engine
- Disposal gain/loss handled by the system

**Business Value**:
- Essential for any business with physical assets — high demand feature
- Reuses Financial Schedule Engine from 032-LAT — incremental build cost is low
- Required for accurate balance sheet and tax reporting

**ROI**: High value, low incremental cost (engine already built). Every business and many individuals need this.

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
- Standard depreciation methods (straight-line, diminishing value) cover 90%+ of use cases
- Financial Schedule Engine from 032-LAT is built and available

**Dependencies**:
- 002-CLE Core Ledger Engine (journal entry generation)
- 032-LAT Financial Schedule Engine (schedule calculation + auto JE posting)
- Module toggle system (asset register as a toggleable module)

**Risks**:
- Tax depreciation vs book depreciation divergence (MEDIUM) → Mitigation: MVP tracks book depreciation only, tax depreciation deferred
- Revaluation accounting complexity (MEDIUM) → Mitigation: simple revaluation in MVP, full IFRS revaluation model deferred
- Units of production method requires usage tracking (LOW) → Mitigation: manual usage input per period

---

## Estimated Effort

**M (3-4 sprints)**, approximately 25-35 story points

- **Sprint 1**: Foundation — Asset model, register, CRUD, asset types, depreciation methods
- **Sprint 2**: Schedule integration — plug into Financial Schedule Engine, auto JE generation, depreciation schedules
- **Sprint 3**: Frontend — Asset register page, detail page, disposal workflow, dashboard widget
- **Sprint 4**: Polish — revaluation, reporting, intangible asset amortization

---

## Proceed to PRD?

**YES** — Fixed assets are essential for accurate financial reporting. Low incremental cost due to Financial Schedule Engine reuse from 032-LAT.

---

## Decision

- [ ] **Approved** - Proceed to PRD
- [ ] **Needs More Information**
- [ ] **Declined**

**Approval Date**: —

---

## Notes

- Reuses Financial Schedule Engine from 032-LAT — depreciation is just another schedule type
- Consider: bulk import of existing assets with accumulated depreciation
- Consider: asset tagging/categorisation for reporting
- Future: tax depreciation schedules (separate from book depreciation)
- Future: asset insurance tracking, warranty dates
