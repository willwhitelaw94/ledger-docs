---
title: "Fees"
---


> Self-Managed and Coordinator Fees (CC & TC Loadings)

---

## Overview

The Fees domain calculates and applies loadings to invoices and service plan items. Two types of fees are applied based on package type and service category.

---

## Fee Types

| Fee Type | Full Name | Applies To | Purpose |
|----------|-----------|------------|---------|
| **CC** | Care Coordination Fee | Fully Coordinated packages only | Covers care coordination services |
| **TC** | Trilogy Care Fee | All package types | Administrative and service management overhead |

**Note**: These fees are in addition to the 10% Care Management activities/fees that every provider is allowed to charge.

---

## Service Groups

Service groups determine fee calculation rules:

| Service Group | Code | Description | Fee Rules |
|---------------|------|-------------|-----------|
| Home Support | SERG-0001 | Personal Care, Nursing, Transport, Meals, Cleaning, Social Support | Standard uncapped percentage-based |
| Assistive Technology | SERG-0002 | Services providing/maintaining assistive devices | Capped CC and TC fees |
| Home Modifications | SERG-0003 | Home or environmental modifications | Capped CC and TC fees |

**Key difference**: For Home Support, TC compounds on CC. For Assistive Tech and Home Mods, fees are calculated independently (no compounding).

---

## Fee Calculation

### Home Support (SERG-0001)

**Self-Managed Packages:**
```
TC Fee = Supplier Amount × 10%
```

**Fully Coordinated Packages:**
```
CC Fee = Supplier Amount × CC Loading %  (default 20%)
TC Fee = (Supplier Amount + CC Fee) × 10%
```
Note: TC compounds on CC, resulting in slightly higher total fee.

### Assistive Technology (SERG-0002)

| Fee | % | Cap |
|----|---|-----|
| CC | 5% | $250 |
| TC | 5% | $250 |

**Fully Coordinated:** Both fees calculated separately on supplier amount, each capped.
```
Example: $10,000 item
CC = min(5% × $10,000, $250) = $250
TC = min(5% × $10,000, $250) = $250
Total fees = $500
```

**Self-Managed:** Combined loading applied.
```
Combined % = 10% (CC + TC)
Combined Cap = $500
Fee = min(10% × $10,000, $500) = $500
```

### Home Modifications (SERG-0003)

| Fee | % | Cap |
|----|---|-----|
| CC | 5% | $500 |
| TC | 10% | $1,000 |

**Fully Coordinated:** Both fees calculated separately on supplier amount, each capped.
```
Example: $20,000 item
CC = min(5% × $20,000, $500) = $500
TC = min(10% × $20,000, $1,000) = $1,000
Total fees = $1,500
```

**Self-Managed:** Combined loading applied.
```
Combined % = 15% (CC + TC)
Combined Cap = $1,500
Fee = min(15% × $20,000, $1,500) = $1,500
```

---

## Complete Fee Table

| Service | Package | CC % | TC % | CC Cap | TC Cap | Total Cap |
|---------|---------|------|------|--------|--------|-----------|
| **Assistive Technology** | SM | 0% | 10% | $0 | $500 | $500 |
| **Assistive Technology** | SM+ | 5% | 5% | $250 | $250 | $500 |
| **Home Modifications** | SM | 0% | 15% | $0 | $1,500 | $1,500 |
| **Home Modifications** | SM+ | 5% | 10% | $500 | $1,000 | $1,500 |

### Unified Formula

For both SM and SM+ packages, fees can be calculated using a single formula:

```
Combined fee = min(supplier_amount × (CC% + TC%), CC_cap + TC_cap)
```

For SM packages, the CC values are zero, so the formula naturally simplifies:
- **AT SM**: min(amount × 10%, $500)
- **HM SM**: min(amount × 15%, $1,500)

---

## When Fees Apply

Fees are calculated in two places:

1. **Service Plan Item** - Single planned service item as an estimate confirmed with the recipient
2. **Invoice (Bill)** - At the whole invoice level (not per line item)

### Invoice-Level Caps (AT/HM)

Fee caps for AT and HM apply **per invoice**, not per line item:

- If an invoice has multiple **Assistive Tech** line items, the total CC fee is capped at **$250** and TC at **$250**
- If an invoice has items for both AT and HM, caps are applied separately for each service group
- If an invoice has AT, HM, and Home Support items, each follows its own rules

**Example**: Invoice with 3 AT items totaling $15,000:
- CC = min(5% × $15,000, $250) = $250 (not $750)
- TC = min(5% × $15,000, $250) = $250 (not $750)
- Total fee = $500

---

## Government Compliance

The fee caps align with the Support at Home Provider Manual requirements:

| Service | Government Maximum | How Trilogy Applies It |
|---------|-------------------|----------------------|
| **Assistive Technology** | Admin costs ≤ 10% of total cost, or $500 (whichever is lower) | SM: 10% / $500 combined; SM+: 5%/$250 CC + 5%/$250 TC |
| **Home Modifications** | Coordination costs ≤ 15% of quoted cost, or $1,500 (whichever is lower) | SM: 15% / $1,500 combined; SM+: 5%/$500 CC + 10%/$1,000 TC |

---

## Fee Split Rationale (AT vs HM)

The different TC/CC splits between AT and HM reflect the workload distribution:

| Service | CC % | TC % | Reasoning |
|---------|------|------|-----------|
| **Assistive Technology** | 5% | 5% | Equal split (1:1) - simpler procurement process |
| **Home Modifications** | 5% | 10% | Weighted toward TC (2:1) - more complex coordination, managing multiple quotes, arranging builders |

For **Self-Managed packages**, the CC component zeros out, so the combined formula simplifies:
- AT: 10% capped at $500 (equivalent to CC% + TC%)
- HM: 15% capped at $1,500 (equivalent to CC% + TC%)

---

## Summary Matrix

| Package Type | Service Group | Calculation | Capped? |
|--------------|---------------|-------------|---------|
| Self-Managed | Home Support | TC = Supplier × 10% | No |
| Fully Coordinated | Home Support | CC = Supplier × CC%; TC = (Supplier + CC) × 10% | No |
| Self-Managed | Assistive Tech / Home Mods | Combined CC+TC % on supplier, capped | Yes |
| Fully Coordinated | Assistive Tech / Home Mods | CC and TC calculated separately, each capped | Yes |

---

## CC Fee Management

- CC fee is set per Service Plan (not per item)
- Default is the Coordinator's current CC rate
- Can be overridden with Trilogy Default or Custom rate
- Changes to CC fee create a new Service Plan version
- CC fee changes can be initiated by Coordinators (requires Admin approval)

---

## Open Questions

| Question | Context |
|----------|---------|
| **Why does FeeCalculator service not exist?** | Docs reference Services/FeeCalculator.php but fee calculation logic is in CalculateFeesAction instead |
| **What is the model name for CC fee proposals?** | Docs say CareCoordinatorFee.php but actual model is CareCoordinatorFeeProposal.php |
| **Where are fee constants stored?** | Fee.php has CARE_MANAGEMENT_PERCENTAGE=10 and TC_LOADING_PERCENTAGE=10 as constants |

---

## Technical Components

### Fee Domain (Actual)

```
domain/Fee/
├── Models/
│   ├── Fee.php                  # Main fee record with FeeTypeEnum, FeeStatusEnum
│   ├── FeePayment.php           # Payment tracking
│   ├── MonthlyFee.php           # Monthly aggregations
│   └── QuarterlyFee.php         # Quarterly aggregations
├── Actions/
│   └── CalculateFeesAction.php  # Contains ALL fee calculation logic
├── Data/
│   ├── FeeCalculationData.php
│   ├── FeePercentagesData.php
│   └── BillFeesResultData.php
├── Enums/
│   ├── FeeTypeEnum.php          # CC_LOADING, TC_LOADING
│   ├── FeeStatusEnum.php        # PENDING, CONFIRMED, PAID
│   └── PeriodStatusEnum.php
└── EventSourcing/
    └── FeeProjector.php
```

**Note**: `Services/FeeCalculator.php` does NOT exist. Fee calculation is in `CalculateFeesAction.php`.

### CareCoordinatorFee Domain (Extensive)

```
domain/CareCoordinatorFee/
├── Models/
│   └── CareCoordinatorFeeProposal.php   # NOT CareCoordinatorFee.php
├── Actions/ (14 files)
│   ├── ApproveFeeChangeProposalAction.php
│   ├── ClientApproveFeeProposalAction.php
│   ├── ClientRejectFeeProposalAction.php
│   └── [10+ more actions]
├── Enums/
│   ├── FeeProposalStatusEnum.php        # PENDING_ADMIN_APPROVAL, APPROVED, etc.
│   ├── FeeProposalTypeEnum.php
│   └── LoadingFeesEnum.php
├── EventSourcing/
│   ├── Aggregates/
│   ├── Events/ (11 event types)
│   ├── Projectors/ (2 files)
│   └── Reactors/
├── Notifications/ (4 notification classes)
└── Data/ (24 DTO files)
```

---

## Related Documentation

- [Budget](budget.md) - Fee allocation in service plans
- [Bill Processing](bill-processing.md) - Fee application on invoices
- [How fees are calculated](https://trilogycare.atlassian.net/wiki/spaces/TC/pages/706936851) (Confluence)

---

## Decision History

| Date | Ticket | Decision | Notes |
|------|--------|----------|-------|
| 2025-11 | [TP-2880](https://trilogycare.atlassian.net/browse/TP-2880) | Applied correct fee labels: AT 5%/5%, HM 5%/10% | Implemented by Tim Maier |
| 2025-11 | [TP-2516](https://trilogycare.atlassian.net/browse/TP-2516) | Fee calculation review | Feedback ticket - confirmed fee logic is correct |
| 2026-01 | [TP-3870](https://trilogycare.atlassian.net/browse/TP-3870) | Cap TC/CC fees at bill level (not line item) | Ensures compliance with government caps |

The 5%/10% split for HM (vs 5%/5% for AT) reflects the additional work required for home modifications coordination (managing multiple quotes, arranging builders). This was an internal business decision to divide the government-allowed maximums between TC and CC.

---

## Status

**Maturity**: Production
**Pod**: Pod 4 (Supply Chain & Operations)
