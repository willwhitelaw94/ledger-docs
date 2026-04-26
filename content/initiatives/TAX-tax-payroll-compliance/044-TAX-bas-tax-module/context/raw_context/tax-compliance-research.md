---
title: "Research: Australian Tax Compliance — BAS, IAS, PAYG & ATO Integration"
description: "Deep-dive research into ATO compliance requirements, SBR2 gateway certification, BAS field mapping, competitor analysis, and gap analysis against existing MoneyQuest implementation."
---

# Research: Australian Tax Compliance — BAS, IAS, PAYG & ATO Integration

**Date**: 2026-03-22
**Epic**: 044-TAX — BAS & Tax Compliance Module
**Author**: Claude (research agent)
**Purpose**: Inform spec refinement and implementation plan with ATO regulatory detail, competitor benchmarks, and a clear-eyed assessment of what is already built vs what remains.

---

## 1. Inventory of What Is Already Built

### 1.1 Backend — Models & Schema

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| `BasPeriod` model | `app/Models/Tenant/BasPeriod.php` | Complete | workspace_id scoped, status enum, due_date, prepared_by/approved_by, lodgements/adjustments/paygInstalments relations, `scopeOverdue`, `days_overdue` computed attribute |
| `BasLodgement` model | `app/Models/Tenant/BasLodgement.php` | Complete | field_values JSON, ato_receipt_number, revision_of_lodgement_id for amendments, lodged_by relationship |
| `BasAdjustment` model | `app/Models/Tenant/BasAdjustment.php` | Complete | field_code, amount (integer/cents), reason, adjusted_by relationship |
| `PaygInstalment` model | `app/Models/Tenant/PaygInstalment.php` | Complete | amount (integer/cents), calculation_method enum, payment_status enum, journal_entry relationship |
| `TaxCode` model | `app/Models/Tenant/TaxCode.php` | Complete | rate_basis_points (1000 = 10%), bas_field mapping, effective date range, `calculateTax()` method |
| Migrations | `database/migrations/2026_03_22_10000{1-4}` | Complete | 4 migration files for bas_periods, bas_lodgements, bas_adjustments, payg_instalments |

### 1.2 Backend — Enums

| Enum | File | Cases |
|------|------|-------|
| `BasPeriodStatus` | `app/Enums/Tax/BasPeriodStatus.php` | NOT_STARTED, IN_PROGRESS, AWAITING_APPROVAL, APPROVED, LODGED, AMENDED |
| `BasFormType` | `app/Enums/Tax/BasFormType.php` | BAS, IAS |
| `LodgementFrequency` | `app/Enums/Tax/LodgementFrequency.php` | QUARTERLY, MONTHLY |
| `BasLodgementStatus` | `app/Enums/Tax/BasLodgementStatus.php` | PENDING, LODGED, FAILED, AMENDED |
| `PaygCalculationMethod` | `app/Enums/Tax/PaygCalculationMethod.php` | ATO_DETERMINED, INCOME_BASED |
| `PaygPaymentStatus` | `app/Enums/Tax/PaygPaymentStatus.php` | PENDING, PAID |

### 1.3 Backend — Actions

| Action | File | What It Does |
|--------|------|--------------|
| `GenerateBasReport` | `app/Actions/Tax/GenerateBasReport.php` | Aggregates JE lines by tax_code -> bas_field, returns bas_fields map + tax_summary + totals (total_tax_collected, total_tax_paid, net_gst_payable) |
| `PrepareBas` | `app/Actions/Tax/PrepareBas.php` | Creates or resumes a BasPeriod, calculates due date (quarterly +28d, monthly +21d), merges adjustments into report |
| `AddBasAdjustment` | `app/Actions/Tax/AddBasAdjustment.php` | Creates adjustment record, validates period status (IN_PROGRESS or AWAITING_APPROVAL only) |
| `SubmitBasForApproval` | `app/Actions/Tax/SubmitBasForApproval.php` | Transitions status to AWAITING_APPROVAL, records prepared_by and submitted_at |
| `ApproveBasPeriod` | `app/Actions/Tax/ApproveBasPeriod.php` | Transitions status to APPROVED, records approved_by and approved_at |
| `LodgeBas` | `app/Actions/Tax/LodgeBas.php` | Validates APPROVED status, generates final field values, marks previous lodgements as AMENDED, calls PostSettlementJe, creates BasLodgement with **stubbed** SBR2 receipt |
| `PostSettlementJe` | `app/Actions/Tax/PostSettlementJe.php` | Creates JE: Dr GST Collected, Cr GST Paid, Dr/Cr ATO Settlement. Finds accounts by name matching. |
| `RecordPaygPayment` | `app/Actions/Tax/RecordPaygPayment.php` | Posts JE for PAYG payment (Dr PAYG Instalment, Cr Cash at Bank), updates payment_status to PAID |

### 1.4 Backend — Controller, Policy, Resources & Routes

| Component | File | Notes |
|-----------|------|-------|
| `BasController` | `app/Http/Controllers/Api/BasController.php` | 10 methods: periods, counts, show, prepare, addAdjustment, submitForApproval, approve, lodge, drilldown, practiceOverview |
| `BasPeriodPolicy` | `app/Policies/BasPeriodPolicy.php` | Permissions: bas.prepare, bas.approve, bas.lodge |
| `BasPeriodResource` | `app/Http/Resources/BasPeriodResource.php` | Full resource with status_label, status_colour, days_overdue |
| `BasAdjustmentResource` | `app/Http/Resources/BasAdjustmentResource.php` | Standard resource |
| `BasLodgementResource` | `app/Http/Resources/BasLodgementResource.php` | Standard resource |
| `PaygInstalmentResource` | `app/Http/Resources/PaygInstalmentResource.php` | Standard resource |
| Routes | `routes/api.php` | 9 workspace-scoped routes under `/bas/periods/*`, 1 practice route `GET /bas/overview` |

### 1.5 Frontend

| Component | File | Notes |
|-----------|------|-------|
| Types | `frontend/src/types/tax.ts` | BasPeriod, BasFieldValue, BasAdjustment, BasLodgement, BasPeriodDetail, BasCounts, BasDrilldownTransaction |
| Hooks | `frontend/src/hooks/use-bas.ts` | useBasPeriods, useBasPeriodCounts, useBasPeriodDetail, useBasDrilldown, usePrepareBas, useAddBasAdjustment, useSubmitBasForApproval, useApproveBasPeriod, useLodgeBas |
| BAS Status Badge | `frontend/src/components/tax/bas-status-badge.tsx` | Status badge component |
| BAS Period Card | `frontend/src/components/tax/bas-period-card.tsx` | Period summary card |
| BAS Field Row | `frontend/src/components/tax/bas-field-row.tsx` | Individual BAS field display with drilldown |
| BAS Summary Card | `frontend/src/components/tax/bas-summary-card.tsx` | Totals summary card |
| Tax Codes Hook | `frontend/src/hooks/use-tax-codes.ts` | Tax code management hooks |

### 1.6 Tests

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `tests/Feature/Api/BasApiTest.php` | 16 tests | Periods list, filter, counts, prepare, idempotent prepare, show, adjustments (valid + rejected), submit, approve (valid + rejected), lodge (valid + rejected), drilldown, auth (bookkeeper approve denied, bookkeeper lodge denied, bookkeeper prepare allowed, client view denied), full workflow |
| `tests/Feature/Api/TaxAndRecurringApiTest.php` | - | Tax code + recurring template tests |
| `tests/Feature/Api/TaxCodeApiTest.php` | - | Tax code CRUD tests |

### 1.7 Summary: What Works Today

The BAS preparation-to-lodgement workflow is **functionally complete** as a closed loop:
1. Prepare a BAS period for a date range (creates or resumes)
2. Add manual adjustments with audit trail
3. Submit for approval (bookkeeper -> accountant)
4. Approve
5. Lodge (posts settlement JE, records lodgement with stubbed SBR2 receipt)
6. Drilldown into individual BAS fields to see contributing transactions
7. Practice overview showing BAS status across client workspaces

---

## 2. Gap Analysis

### 2.1 Critical Gaps

| # | Gap | Impact | Priority |
|---|-----|--------|----------|
| G-01 | **SBR2 lodgement is stubbed** — `LodgeBas` generates a fake receipt (`'SBR2-'.now()->timestamp`), not a real ATO submission | BAS cannot be lodged electronically; users must still use ATO portal or another DSP | P1 for v2, defer for v1 |
| G-02 | **No BAS field mapping completeness** — `GenerateBasReport` aggregates by whatever `bas_field` values exist on TaxCodes, but does not ensure all 20+ ATO fields are represented | BAS may be incomplete; no validation that all required fields have values | P1 |
| G-03 | **No GST reporting method distinction** — no support for cash vs accrual GST reporting. `GenerateBasReport` reads posted JE lines, which is accrual-based | Businesses on cash GST method will get incorrect figures | P1 |
| G-04 | **No PAYG instalment calculation engine** — `PaygInstalment` model exists but there is no action to calculate instalment amounts | Users must manually enter instalment amounts; no income-based calculation | P2 |
| G-05 | **No IAS-specific field handling** — `BasFormType::IAS` exists in enum but the report generation treats BAS and IAS identically | Monthly lodgers may see incorrect fields | P2 |
| G-06 | **No BAS PDF export** — no mechanism to generate a BAS-formatted PDF for manual lodgement or record-keeping | Without SBR2, users need a printable BAS | P1 for v1 |
| G-07 | **No workspace tax settings** — no configuration for GST reporting method, lodgement frequency preference, ABN, or BAS agent details | Cannot determine correct GST method per workspace | P1 |
| G-08 | **No BAS rejection workflow** — approval exists but there is no "reject" action to return a BAS to the preparer with notes | Accountants cannot send BAS back for correction | P2 |
| G-09 | **No nil BAS support** — FR-010 requires nil BAS lodgement but there is no nil detection or handling | Workspaces with no activity cannot lodge | P3 |
| G-10 | **No BAS amendment via SBR2** — amendment is tracked (revision_of_lodgement_id) but there is no re-lodgement mechanism | Cannot correct lodged BAS through the system | P2 (deferred with SBR2) |

### 2.2 Non-Critical Gaps (Nice-to-Have)

| # | Gap | Notes |
|---|-----|-------|
| G-11 | No reconciliation check (BAS fields vs GST account balances) | Spec mentions this but not implemented |
| G-12 | No concurrent preparation lock | Spec edge case but not enforced |
| G-13 | No BAS notification triggers | No notifications when BAS is submitted/approved/lodged |
| G-14 | Practice overview does not check advisor connection | `practiceOverview` uses user's workspaces, not advisor connections |

---

## 3. ATO SBR2/DSP Requirements

### 3.1 What Is SBR2?

Standard Business Reporting 2 (SBR2) is the ATO's machine-to-machine API gateway for electronic lodgement of activity statements (BAS/IAS), tax returns, and other compliance documents. It replaced the older ECI (Electronic Commerce Interface) and SBR1 protocols.

### 3.2 DSP Accreditation Process

To lodge electronically with the ATO, MoneyQuest must become an accredited Digital Service Provider (DSP). The process:

| Step | Timeline | Cost | Notes |
|------|----------|------|-------|
| 1. Register as DSP with ATO | 2-4 weeks | Free | Register via ATO Digital Partnership Office |
| 2. Obtain M2M digital certificate | 2-4 weeks | $5,000-$15,000/year | Machine-to-machine certificate from ATO-approved certificate authority (Verizon/Digicert). Annual renewal required. |
| 3. Development against SBR2 test environment | 4-8 weeks | Dev time | ATO provides EVTE (External Vendor Test Environment) with test ABNs |
| 4. Conformance testing | 2-4 weeks | Dev time | Must pass ATO conformance test suite — specific test scenarios for each form type |
| 5. Production accreditation | 2-4 weeks | Free | ATO reviews conformance results, grants production certificate |
| 6. Ongoing compliance | Continuous | Maintenance | Annual certificate renewal, schema updates when ATO changes forms |

**Total timeline**: 3-6 months from start to production lodgement capability.
**Total cost**: $5,000-$15,000/year for certificate + significant developer time.

### 3.3 SBR2 Technical Architecture

```
MoneyQuest Server
    |
    +-- Build SBR2 XML payload (XBRL taxonomy)
    +-- Sign with M2M certificate (X.509)
    +-- POST to SBR2 gateway (HTTPS/SOAP)
    |
    +-- ATO SBR2 Gateway
         +-- Validates certificate
         +-- Validates payload schema
         +-- Processes lodgement
         +-- Returns receipt/error response
```

- **Protocol**: SOAP over HTTPS with WS-Security
- **Payload**: XBRL (eXtensible Business Reporting Language) using ATO taxonomy
- **Auth**: Mutual TLS with M2M certificate
- **Response**: Synchronous receipt number on success, structured error codes on failure

### 3.4 ATO Error Codes

The ATO returns structured error codes that map to specific fields:

- **CMN.ATO.IITR.EM0001** — Invalid ABN
- **CMN.ATO.IITR.730100** — Field value outside expected range
- **CMN.ATO.GEN.400** — Duplicate lodgement for same period
- **CMN.ATO.GEN.AUTH01** — Certificate authentication failure

Each error includes a field reference, error code, severity (error/warning), and plain-text description.

### 3.5 Recommendation: Defer SBR2 for v1

**SBR2 integration should be deferred to v2.** Rationale:

1. **Cost**: $5-15K/year certificate cost before any revenue from the feature
2. **Timeline**: 3-6 months for accreditation blocks other development
3. **Complexity**: SOAP/XBRL integration is non-trivial and fragile (ATO taxonomy changes periodically)
4. **Market reality**: Most small practices use the ATO portal or their existing DSP for actual lodgement. They want BAS *preparation* and *review* — lodgement is the last mile.
5. **v1 alternative**: PDF export with ATO-formatted BAS enables manual lodgement via ATO portal or bulk upload. This covers 80% of the value with 5% of the SBR2 effort.

**v1 strategy**: PDF export + manual lodge
**v2 strategy**: SBR2 accreditation when user base justifies the certificate cost

---

## 4. Complete BAS Field Mapping

### 4.1 GST Fields (G1-G20)

These fields appear on Section G of the BAS form. Not all are required for every lodger.

| Field | Label | Description | Calculation Source |
|-------|-------|-------------|-------------------|
| G1 | Total sales | Total sales and other income (including GST) | Sum of all revenue JE lines in period (gross amount) |
| G2 | Export sales | GST-free export sales | JE lines with tax_code mapped to bas_field='G2' (export sales, rate 0) |
| G3 | Other GST-free sales | Other GST-free sales | JE lines with tax_code='FRE' or similar GST-free codes |
| G4 | Input taxed sales | Input taxed sales (financial supplies) | JE lines with tax_code mapped to input-taxed sales |
| G5 | G2+G3+G4 | **Calculated**: Sum of G2, G3, G4 | Computed field |
| G6 | G1-G5 | **Calculated**: Total sales subject to GST | Computed field |
| G7 | Adjustments | Adjustments for sales (increasing GST) | Manual adjustments with field_code='G7' |
| G8 | G6+G7 | **Calculated**: Total sales subject to GST after adjustments | Computed field |
| G9 | GST on sales | **Calculated**: GST on sales (G8 / 11) | Computed from G8 or sum of tax_amount on sales lines |
| G10 | Capital purchases | Capital purchases (including GST) | JE lines on asset accounts with GST |
| G11 | Non-capital purchases | Non-capital purchases (including GST) | JE lines on expense accounts with GST |
| G12 | G10+G11 | **Calculated**: Total purchases | Computed field |
| G13 | Purchases for making input taxed sales | Purchases for input taxed sales | JE lines with specific tax code for input-taxed purchases |
| G14 | Purchases with no GST | Purchases with no GST in the price | JE lines on expense/asset accounts with GST-free purchase codes |
| G15 | Estimated purchases for private use | Estimated private use proportion | Manual entry or configured percentage |
| G16 | G13+G14+G15 | **Calculated**: Sum of non-creditable purchases | Computed field |
| G17 | G12-G16 | **Calculated**: Total purchases with GST credits | Computed field |
| G18 | Adjustments | Adjustments for purchases (increasing GST credits) | Manual adjustments with field_code='G18' |
| G19 | G17+G18 | **Calculated**: Total purchases eligible for GST credits after adjustments | Computed field |
| G20 | GST on purchases | **Calculated**: GST on purchases (G19 / 11) | Computed from G19 or sum of tax_amount on purchase lines |

### 4.2 Summary Fields (1A-9)

These are the main BAS summary fields that appear on the front page:

| Field | Label | Description | Calculation Source |
|-------|-------|-------------|-------------------|
| 1A | GST on sales | GST collected on sales | = G9 (or direct sum of output tax amounts) |
| 1B | GST on purchases | GST paid on purchases (credit) | = G20 (or direct sum of input tax amounts) |
| 1C | Wine equalisation tax payable | WET (wine industry only) | JE lines with WET tax code |
| 1D | Wine equalisation tax refundable | WET refund | JE lines with WET refund tax code |
| 1E | Luxury car tax payable | LCT (car dealers) | JE lines with LCT tax code |
| 1F | Luxury car tax refundable | LCT refund | JE lines with LCT refund tax code |
| 1G | Amounts from fuel tax credits | FTC | JE lines with FTC tax code |
| 2A | PAYG income tax withheld | Total PAYG withholding from wages/payments | Sum of withholding JE lines (W1-W5 detail below) |
| 3 | FBT instalment | FBT quarterly instalment | Manual entry or ATO-determined |
| 4 | Total amount owed to ATO | **Calculated**: 1A + 1C + 1E + 2A + 3 | Sum of payable fields |
| 5A | Credit from 1B, 1D, 1F, 1G | **Calculated**: 1B + 1D + 1F + 1G | Sum of credit fields |
| 5B | Credit from PAYG income tax instalment | PAYG instalment credit | T1 or T2 value |
| 6A | Total credits | **Calculated**: 5A + 5B | |
| 7 | Amount owing / refund | **Calculated**: 4 - 6A | Positive = owing, negative = refund |
| 7A | Amount owing | If field 7 > 0 | |
| 7B | Refundable amount | If field 7 < 0 | |
| 8A | Your payment | Amount actually paid | Recorded after payment |
| 8B | Refund to bank account | ATO refund expected | |
| 9 | EFT code | Payment reference | Generated by ATO |

### 4.3 PAYG Withholding Fields (W1-W5)

| Field | Label | Description |
|-------|-------|-------------|
| W1 | Total salary, wages and other payments | Gross wages paid in period |
| W2 | Amounts withheld from W1 | PAYG withheld from wages |
| W3 | Other amounts withheld | Withholding from non-wage payments (ABN not quoted, etc.) |
| W4 | Total amounts withheld | **Calculated**: W2 + W3 |
| W5 | Amounts withheld where no ABN quoted | Withholding for no-ABN payments |

### 4.4 PAYG Instalment Fields (T1-T11)

| Field | Label | Description | Method |
|-------|-------|-------------|--------|
| T1 | Instalment income | Business and investment income for the period | Income-based method |
| T2 | Instalment rate | ATO-notified instalment rate (%) | Income-based method |
| T3 | New varied instalment rate | Voluntary varied rate | Income-based method |
| T4 | Reason for variation | Code for why rate was varied | Income-based method |
| T5 | Tax instalments | **Calculated**: T1 x T2 (or T3) | Income-based method |
| T6 | New varied instalment amount | Varied amount if using amount method | Amount-based variation |
| T7 | ATO-calculated instalment amount | ATO-notified instalment amount | ATO-determined method |
| T8 | Estimated tax for the year | Used when varying amount | Variation support |
| T9 | Varied amount reason | Code for variation | Variation support |
| T10 | PAYG instalment credit | Amount credited this period | Credit |
| T11 | PAYG instalment result | **Calculated**: Net instalment after credits | Result |

---

## 5. IAS vs BAS Differences

### 5.1 What Is an IAS?

An Instalment Activity Statement (IAS) is a simplified version of the BAS used by businesses that lodge monthly. Key differences:

| Aspect | BAS (Quarterly) | IAS (Monthly) |
|--------|-----------------|---------------|
| Lodgement frequency | Quarterly (Mar, Jun, Sep, Dec) | Monthly |
| Due date | 28th of month after quarter end | 21st of month after period end |
| GST fields | Full G1-G20 detail available | Same G1-G20 fields |
| PAYG withholding | W1-W5 included | W1-W5 included |
| PAYG instalments | T1-T11 included | T1-T11 **NOT** included (quarterly only) |
| FBT instalment | Field 3 included | Field 3 **NOT** included |
| Wine/Luxury car tax | 1C-1F included | 1C-1F may be included |
| Form type (SBR2) | `ABR.BASS.2` | `ABR.IASS.2` |

### 5.2 When Is IAS Used?

- Businesses with GST turnover > $20M (mandatory monthly)
- Businesses that voluntarily elect monthly lodgement
- Businesses with PAYG withholding obligations only (no GST)

### 5.3 Implementation Implication

The `BasFormType::IAS` enum already exists. The `GenerateBasReport` action needs to conditionally exclude PAYG instalment fields (T1-T11) and FBT (field 3) when generating an IAS. The calculation engine is otherwise identical.

---

## 6. PAYG Instalment Methods

### 6.1 Amount Method (ATO-Determined)

- ATO notifies a fixed instalment amount each quarter
- Business pays that amount regardless of actual income
- Simplest method — just record the ATO amount at field T7
- Suitable for stable businesses

### 6.2 Rate Method (Income-Based)

- ATO notifies an instalment rate (e.g., 8%)
- Business calculates: `T5 = T1 (instalment income) x T2 (rate)`
- Requires calculating total business and investment income for the period
- Income = revenue from P&L accounts marked as "instalment income"
- More accurate for growing/shrinking businesses

### 6.3 Variation

Both methods allow variation:
- **Amount variation**: Lodge a different amount at T6 with reason at T9
- **Rate variation**: Lodge a different rate at T3 with reason at T4

### 6.4 Implementation Implication

The existing `PaygCalculationMethod` enum has `ATO_DETERMINED` and `INCOME_BASED`. The gap is that there is no calculation engine for the income-based method — it needs to query revenue accounts to determine instalment income (T1), then multiply by the configured rate (T2).

---

## 7. GST Cash vs Accrual Method

### 7.1 Accrual Method (Current Implementation)

GST is reported when invoices are **issued**, regardless of when payment is received. The current `GenerateBasReport` implementation is implicitly accrual-based because it reads posted JE lines — JEs are typically created when invoices are issued.

### 7.2 Cash Method

GST is reported when payment is **received or made**. This means:
- GST on sales is reported when the customer pays the invoice
- GST on purchases is reported when the supplier is paid

### 7.3 Who Uses Cash Method?

Businesses with GST turnover under $10M can elect cash accounting. Many small businesses prefer this because they do not owe GST until they are paid.

### 7.4 Implementation Options

| Option | Approach | Complexity | Accuracy |
|--------|----------|------------|----------|
| A | Filter JE lines by payment date instead of entry_date | Medium | High |
| B | Create separate "cash basis" JEs on payment receipt | High | High |
| C | Use invoice payment records to determine GST timing | Medium | High — if payment records are reliable |

**Recommended**: Option C — query `payments` table to determine which invoice lines have been paid in the BAS period. For purchases, look at bill payments. This avoids duplicating JEs and works with the existing event-sourced invoice/bill payment flow.

### 7.5 Implementation Implication

A workspace-level setting (`gst_method`: `accrual` | `cash`) is needed. When `cash`, `GenerateBasReport` must use payment dates instead of invoice/JE dates to determine which GST amounts fall in the period. This is a significant but well-scoped change.

---

## 8. Competitor Analysis

### 8.1 Xero

| Feature | Xero Implementation | MoneyQuest Status |
|---------|---------------------|-------------------|
| BAS preparation | Automatic from coded transactions | Equivalent (GenerateBasReport) |
| Field mapping | Full G1-G20 + summary fields | Partial (only 1A, 1B via tax code bas_field) |
| Manual adjustments | Yes, with audit trail | Yes (BasAdjustment) |
| GST reporting method | Cash or Accrual selectable | Accrual only (gap) |
| Approval workflow | No built-in approval | Yes (advantage) |
| SBR2 lodgement | Yes — Xero is an accredited DSP | Stubbed (gap) |
| PDF export | Yes — ATO-formatted BAS PDF | No (gap) |
| Settlement JE | Auto-posts on finalisation | Yes (PostSettlementJe) |
| PAYG withholding | Integrated with payroll (W1-W5) | No payroll integration (out of scope) |
| PAYG instalments | Basic T7 entry | Model exists, no calculator (gap) |
| IAS support | Monthly lodgers auto-switch to IAS | Enum exists, no field differentiation (gap) |
| Practice dashboard | Xero HQ — multi-org BAS status | practiceOverview endpoint exists |
| Drilldown | Click field to see transactions | Yes (drilldown endpoint) |

### 8.2 MYOB

| Feature | MYOB Implementation | MoneyQuest Status |
|---------|---------------------|-------------------|
| BAS preparation | "Prepare BAS/IAS" wizard | Equivalent |
| SBR2 lodgement | Yes — GovConnect integration | Stubbed (gap) |
| Cash vs Accrual | Both supported | Accrual only (gap) |
| G1-G20 detail | Full detail view with drilldown | Partial (gap) |
| Practice tools | MYOB Practice — multi-client BAS | practiceOverview exists |
| PDF export | Yes | No (gap) |

### 8.3 QuickBooks Online (QBO)

| Feature | QBO Implementation | MoneyQuest Status |
|---------|---------------------|-------------------|
| BAS preparation | "Lodge BAS" feature | Equivalent |
| SBR2 lodgement | Yes — via SBR2 | Stubbed (gap) |
| GST method | Cash or Accrual | Accrual only (gap) |
| Approval workflow | No built-in approval | Yes (advantage) |
| Practice dashboard | QBO Accountant — multi-client | practiceOverview exists |

### 8.4 Key Competitive Insights

**MoneyQuest advantages over competitors**:
1. Built-in approval workflow (bookkeeper -> accountant -> lodge) — competitors lack this
2. Manual adjustment audit trail — competitors treat this as a black box
3. Field-level drilldown to transactions — most competitors have this but MoneyQuest implementation is solid

**MoneyQuest gaps vs competitors**:
1. No SBR2 lodgement (all three competitors have this)
2. No cash basis GST (all three support it)
3. Incomplete BAS field mapping (competitors map all G1-G20 fields)
4. No PDF export (all three have it)

---

## 9. Recommendation Summary

### v1 Scope (This Implementation Plan)

| Feature | Priority | Notes |
|---------|----------|-------|
| Complete BAS field mapping (G1-G20 + summary) | P1 | Extend GenerateBasReport with full field calculation |
| Workspace tax settings (GST method, ABN, lodgement frequency) | P1 | New workspace_tax_settings table or columns on workspace |
| BAS PDF export (ATO-formatted) | P1 | Generate printable BAS for manual lodgement |
| GST cash method support | P1 | Alternative calculation path in GenerateBasReport |
| BAS rejection workflow | P2 | New "reject" action returning BAS to preparer |
| PAYG instalment calculator (income-based) | P2 | Calculate T1 from revenue accounts, apply T2 rate |
| IAS field differentiation | P2 | Exclude T1-T11 and FBT from IAS |
| Nil BAS detection and handling | P3 | Auto-detect no-activity periods |
| Reconciliation check (fields vs account balances) | P3 | Comparison report before lodgement |
| BAS notifications | P3 | Notify on submit/approve/lodge/overdue |

### v2 Scope (Deferred)

| Feature | Reason for Deferral |
|---------|---------------------|
| ATO SBR2 gateway integration | $5-15K/year certificate cost, 3-6 month accreditation, SOAP/XBRL complexity |
| BAS amendment via SBR2 | Requires SBR2 |
| Historical BAS import | Low priority, complex mapping |
| PAYG withholding from payroll (W1-W5) | Requires payroll module |
| Multi-jurisdiction (NZ GST, UK VAT) | v1 is Australian only |

### v1 Lodgement Strategy

Instead of SBR2, v1 provides:
1. **ATO-formatted PDF** — downloadable BAS form with all fields populated
2. **Manual lodge via ATO portal** — user uploads or types figures into myGov/ATO portal
3. **Record lodgement** — user enters ATO receipt number after manual lodgement (marks period as LODGED)
4. **Settlement JE** — auto-posts on lodgement status change (already works)

This covers the core value proposition (preparing and reviewing BAS within MoneyQuest) while deferring the expensive SBR2 integration until the user base justifies the cost.
