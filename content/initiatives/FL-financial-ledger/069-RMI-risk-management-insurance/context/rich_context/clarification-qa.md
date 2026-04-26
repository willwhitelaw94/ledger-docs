---
title: "069-RMI Clarification Q&A"
description: "20 self-clarification questions and answers for the Risk Management & Insurance Register epic"
---

# 069-RMI Clarification Q&A

**Date**: 2026-03-22
**Analyst / Product Owner**: William Whitelaw
**Method**: Spec analyst self-clarification against idea brief + codebase context

---

## 1. Scope Boundaries

### Q1. What ships in v1 versus what is deferred? Specifically, do AI risk alerts and scenario planning integration belong in this epic or are they separate?

**Answer**: v1 ships three surfaces: (1) Risk Register CRUD with likelihood/impact scoring, (2) Insurance Register with policy CRUD and renewal reminders, and (3) a read-only risk dashboard widget showing the consolidated risk score. **Deferred to v2 or to 068-SPE integration work**: AI-generated risk alerts beyond simple renewal reminders, Monte Carlo risk modelling, stress testing integration with the Scenario Planning Engine, and insurance provider API integrations. The idea brief's Sprint 4 ("AI alerts & integration") is too ambitious for v1. Instead, v1 delivers basic notifications (insurance renewal reminders via the existing notification system) and exposes risk data as a data source that 068-SPE can consume later. This keeps the epic at 3 sprints, not 4.

### Q2. Is the Risk Register or Insurance Register the higher priority? If we had to ship only one, which one?

**Answer**: Insurance Register ships first. It has a tighter value proposition: users track real policy data, get renewal reminders, and see coverage gaps against their asset register. The ROI is concrete and immediate -- preventing a lapsed insurance policy saves real money. The Risk Register is more abstract and advisory-oriented; it depends on the Insurance Register data to be useful (insurance gaps feed into risk scoring). Sprint order: (1) Insurance Register, (2) Risk Register, (3) Dashboard widget + portfolio risk metrics.

### Q3. Where does this epic end and where does Scenario Planning (068-SPE) begin? Is there overlap in portfolio risk metrics?

**Answer**: Clean boundary: 069-RMI owns **current-state** risk assessment. 068-SPE owns **forward-looking** projections. Specifically, 069-RMI calculates and displays today's portfolio concentration, asset class exposure, and coverage gap ratios. 068-SPE will consume those metrics as inputs to "what if" scenarios (e.g., "What happens to my risk score if I sell $200k of property and buy equities?"). 069-RMI exposes a `GetRiskProfile` action that returns the current risk breakdown; 068-SPE calls that action with modified portfolio parameters to project future risk states. No overlap -- they are producer and consumer.

### Q4. Does v1 include any portfolio risk metrics (VaR, volatility) or are those deferred?

**Answer**: v1 includes **concentration analysis** (percentage allocation by asset class) and **coverage ratio** (insured value vs asset value). These are simple calculations over existing `AssetFeedLink` and `Asset` model data. VaR (Value at Risk), volatility tracking, and sector-level exposure analysis are deferred to v2. Rationale: VaR requires historical price time series and statistical modelling that adds significant complexity; concentration and coverage gaps deliver 80% of the advisory value with 20% of the effort.

---

## 2. Risk Register Data Model

### Q5. What risk categories does v1 support, and are they a fixed enum or user-configurable?

**Answer**: Fixed enum in v1 with these categories:

```php
enum RiskCategory: string
{
    case Investment = 'investment';       // portfolio concentration, market exposure
    case Market = 'market';              // interest rate, FX, commodity price
    case Liquidity = 'liquidity';        // cash runway, access to funds
    case Insurance = 'insurance';        // coverage gaps, policy lapses
    case Compliance = 'compliance';      // regulatory, tax, ATO deadlines
    case Operational = 'operational';    // key person, technology, process
    case Credit = 'credit';             // customer default, receivable aging
}
```

User-configurable categories are deferred. The enum covers the categories relevant to SMBs, personal ledgers, and advisory practices. Custom categories would need a `risk_categories` table with workspace scoping, which adds migration and CRUD complexity for limited v1 value.

### Q6. What scoring methodology do we use? Is it a standard likelihood x impact matrix?

**Answer**: Yes, a 5x5 likelihood-impact matrix, producing a composite score from 1-25. Both dimensions use a 1-5 integer scale:

- **Likelihood**: 1 (Rare), 2 (Unlikely), 3 (Possible), 4 (Likely), 5 (Almost Certain)
- **Impact**: 1 (Insignificant), 2 (Minor), 3 (Moderate), 4 (Major), 5 (Catastrophic)
- **Risk Score** = likelihood x impact (1-25)
- **Risk Level**: Low (1-5), Medium (6-12), High (13-19), Critical (20-25)

This maps to a `RiskLevel` enum following the same pattern as `HealthLabel` and `AnomalySeverity` in the existing codebase. The risk level enum uses the same colour convention: green/blue/amber/red.

### Q7. What is the review workflow for risk items? Do they have a lifecycle status?

**Answer**: Risk items have a simple lifecycle:

```php
enum RiskStatus: string
{
    case Identified = 'identified';   // newly created
    case Assessed = 'assessed';       // scored and mitigations documented
    case Mitigating = 'mitigating';   // active mitigation in progress
    case Accepted = 'accepted';       // risk accepted, no further action
    case Closed = 'closed';           // risk no longer relevant
}
```

Each risk item has a `next_review_date` field. When that date passes, the item surfaces in the Intray (018-ITR) attention queue and triggers an in-app notification. The review workflow is lightweight: the user updates the assessment (likelihood/impact may change) and sets the next review date. No approval chain -- risk reviews are informational, not transactional. This follows the pattern of anomaly flags (open/dismissed/investigated) but with a richer lifecycle.

### Q8. Is the risk register polymorphic in scope -- entity, personal, group -- and how does that map to the data model?

**Answer**: Risk items are workspace-scoped, not polymorphic. Every risk item belongs to exactly one workspace via `workspace_id`, following the standard tenant-scoping pattern used by every other model in the codebase. For "group-level" risk views (family group seeing risks across entities), we aggregate workspace-level risks using `WorkspaceGroup::getAllWorkspaceIds()` the same way consolidated reports work today. No new polymorphic scope column needed. The `RiskItem` model has a `workspace_id` column with the standard global scope.

For linking a risk to a specific asset or insurance policy, we use nullable foreign keys (`asset_id`, `insurance_policy_id`) rather than morphs. This keeps the schema simple and query-friendly. A risk about "Property at 42 Smith St is underinsured" links to both the asset and the policy.

---

## 3. Insurance Register Data Model

### Q9. What data do we track for each insurance policy? What are the required vs optional fields?

**Answer**: The `InsurancePolicy` model:

**Required fields**:
- `workspace_id` (int, tenant scope)
- `uuid` (string, route key)
- `policy_number` (string)
- `policy_type` (enum: see Q10)
- `provider_name` (string -- insurer name)
- `coverage_amount_cents` (int -- maximum cover)
- `annual_premium_cents` (int)
- `start_date` (date)
- `end_date` (date -- renewal/expiry)
- `status` (enum: active, expired, cancelled, pending_renewal)

**Optional fields**:
- `contact_id` (FK to contacts -- the insurance broker/provider)
- `asset_id` (FK to assets -- for asset-specific policies like vehicle or property insurance)
- `excess_cents` (int -- policy excess/deductible)
- `payment_frequency` (enum: monthly, quarterly, annually)
- `auto_renew` (boolean, default false)
- `notes` (text)
- `document_path` (string -- uploaded policy document via attachments)
- `created_by` (FK to users)

All monetary amounts are integers (cents), following the project convention. The `contact_id` link lets users associate a policy with the broker contact already in their contact register.

### Q10. What insurance policy types does v1 support?

**Answer**: Fixed enum covering common AU personal and business insurance:

```php
enum InsurancePolicyType: string
{
    case PublicLiability = 'public_liability';
    case ProfessionalIndemnity = 'professional_indemnity';
    case BusinessInsurance = 'business_insurance';
    case WorkersCompensation = 'workers_compensation';
    case BuildingInsurance = 'building_insurance';
    case ContentsInsurance = 'contents_insurance';
    case LandlordInsurance = 'landlord_insurance';
    case VehicleInsurance = 'vehicle_insurance';
    case HomeInsurance = 'home_insurance';
    case HealthInsurance = 'health_insurance';
    case LifeInsurance = 'life_insurance';
    case IncomeProtection = 'income_protection';
    case TotalPermanentDisability = 'total_permanent_disability';
    case TraumaInsurance = 'trauma_insurance';
    case CyberInsurance = 'cyber_insurance';
    case Other = 'other';
}
```

This covers both business (public liability, professional indemnity, workers comp) and personal (home, health, life, income protection) policy types. It aligns with the platform's dual business/personal ledger positioning. The `Other` fallback handles edge cases without needing user-configurable types in v1.

### Q11. How does renewal workflow work? Is it automated or manual?

**Answer**: Semi-automated via the existing notification system:

1. A scheduled artisan command (`risk:check-renewals`) runs daily, similar to `recurring:process`.
2. It queries `InsurancePolicy::where('status', 'active')->where('end_date', '<=', now()->addDays(30))`.
3. For policies expiring within 30 days: creates an in-app notification and (if configured) an email via the existing notification infrastructure (024-NTF).
4. Notification intervals: 30 days, 14 days, 7 days, 1 day before expiry. Each interval fires once (tracked via a `renewal_reminded_at` JSON column or a simple `last_reminder_days` integer).
5. On the day of expiry, if `auto_renew` is false, the status transitions to `expired`. If `auto_renew` is true, the status transitions to `pending_renewal` (user must confirm).
6. Manual renewal: user clicks "Renew" on the policy detail page, which creates a new policy record with updated dates and archives the old one.

No automatic policy creation or payment processing in v1. The renewal is a reminder-driven manual process.

### Q12. How does coverage gap analysis work? What constitutes a "gap"?

**Answer**: Coverage gap analysis compares insured value against asset value for asset-linked policies. Three types of gaps:

1. **Uninsured asset gap**: An asset exists (in the `assets` table or `AssetFeedLink`) with no linked insurance policy. Example: a $500k investment property with no building insurance. Detection: `Asset::whereDoesntHave('insurancePolicies')` for asset classes that conventionally require insurance (vehicles, property).

2. **Underinsured gap**: A policy's `coverage_amount_cents` is less than the asset's current market value (`AssetFeedLink::last_value_cents` or `Asset::current_value`). Example: property insured for $400k but valued at $600k. Gap = $200k. Threshold: coverage < 80% of market value triggers a warning.

3. **Lapsed coverage gap**: A policy with status `expired` that was previously active. The time window since expiry determines severity.

The analysis runs as a `CalculateCoverageGaps` action that returns an array of gap items, each with the asset, the gap type, the dollar shortfall, and a severity (low/medium/high). This feeds into the risk dashboard widget and can auto-create risk items in the Risk Register with category `insurance`.

---

## 4. Portfolio Risk Metrics

### Q13. Which portfolio metrics ship in v1 and how are they calculated?

**Answer**: Two metrics in v1:

**1. Concentration Analysis**
- Data source: `AssetFeedLink` records grouped by `asset_class` (the existing `AssetClass` enum: Vehicle, ListedSecurity, Property, Cryptocurrency, TermDeposit, ManagedFund, Other).
- Calculation: `(class_total_market_value / portfolio_total_market_value) * 100` for each class.
- Output: percentage allocation per asset class, with a warning flag when any single class exceeds a configurable threshold (default 60%).
- This builds directly on the existing `AssetFeedController::portfolio()` endpoint which already groups by class and sums values.

**2. Insurance Coverage Ratio**
- Data source: Sum of `InsurancePolicy::coverage_amount_cents` for all active policies vs sum of `Asset::current_value` (or `AssetFeedLink::last_value_cents`).
- Calculation: `(total_coverage / total_asset_value) * 100`.
- Output: a single percentage with thresholds: >80% = adequately covered, 50-80% = partially covered, <50% = significantly underinsured.

Both metrics are computed on-demand by a `GetPortfolioRiskMetrics` action, not stored. They are lightweight aggregations over existing data.

### Q14. Where does the data come from for these metrics? Do we need new data sources?

**Answer**: No new data sources. Everything comes from existing models:

- **Asset valuations**: `AssetFeedLink` (for market-priced assets linked to feeds -- equities, crypto, property, vehicles) and `Asset` (for fixed assets tracked in the asset register -- equipment, furniture, etc.)
- **Insurance coverage**: The new `InsurancePolicy` model created by this epic.
- **Account balances**: Existing journal entry line aggregations (same queries used by `CalculateEntityHealthScore`).

The `AssetFeedLink` model already tracks `last_value_cents`, `book_value_cents`, and `asset_class`. The portfolio endpoint already returns `by_class` breakdowns. We just need a thin action that reads the same data and applies risk thresholds.

### Q15. Should portfolio risk metrics be stored/cached or computed on-demand?

**Answer**: Computed on-demand in v1. Rationale: the underlying queries are simple aggregations over small datasets (a typical workspace has 5-50 asset feed links and 5-20 insurance policies). Caching adds complexity for negligible performance gain. The `GetPortfolioRiskMetrics` action returns a DTO, not a persisted model. If performance becomes an issue with group-level consolidation across many workspaces, we can add caching in v2 following the same pattern as `HealthScore` (upsert + history table).

---

## 5. Integration Points

### Q16. How does this integrate with Entity Health Score (051-EHS)? Does risk score replace or extend it?

**Answer**: Extends, not replaces. The existing `CalculateEntityHealthScore` action computes 5 sub-scores: liquidity, cash_flow, profitability, stability, obligations. Risk and insurance data becomes a **6th input factor** to the health score in a future update, but NOT in 069-RMI v1.

In v1, the risk module produces its own independent composite score (the risk matrix aggregate). In a follow-up PR, we add a `risk_score` sub-dimension to `CalculateEntityHealthScore` with a weight of ~0.10 (reducing others proportionally). This keeps 069-RMI self-contained and avoids modifying the health score calculation in the same delivery.

The risk dashboard widget and the health score widget coexist on the dashboard as separate widgets. They link to each other: the health widget can show "Risk: 3 HIGH items" as a contributing factor, and the risk widget can show the entity health label for context.

### Q17. How does this connect to the existing Anomaly Detection (040-AND) system?

**Answer**: One-way data flow: anomaly detection can **generate** risk items, but risk management does not feed back into anomaly detection.

Specifically, when the anomaly detection system flags a high-severity anomaly (e.g., duplicate payment, amount outlier), a future enhancement can auto-create a risk item with category `operational` or `credit` in the risk register. In v1, this integration is NOT built -- it is documented as a future hook. The connection point is clean: both systems use similar severity enums (`AnomalySeverity` and `RiskLevel` both use high/medium/low patterns) and both are workspace-scoped.

The key difference: anomaly detection is **backward-looking** (flagging things that already happened in transaction data). Risk management is **current-state and forward-looking** (assessing ongoing exposure). They complement each other but operate independently.

### Q18. How does this integrate with the dashboard widget system (057-CDB2)?

**Answer**: 069-RMI registers two new widgets in the widget catalogue (`GetWidgetCatalogue` action):

1. **`risk_summary`** -- A compact card showing: total risk items by level (critical/high/medium/low), number of insurance policies expiring within 30 days, and the portfolio concentration breakdown as a donut chart. Size: `2x2` grid cell minimum.

2. **`insurance_renewals`** -- A list widget showing upcoming insurance renewals sorted by expiry date, with status badges. Size: `2x1` grid cell minimum.

Both widgets follow the existing pattern: the backend adds them to the `GetWidgetCatalogue` action's return array, and the frontend creates corresponding React components in `frontend/src/components/dashboard/widgets/`. The `WidgetRenderer.tsx` component gets two new cases in its switch statement. No changes to the grid layout system itself.

### Q19. How does the insurance register connect to existing expense tracking? Can we auto-detect premium payments?

**Answer**: v1 does NOT auto-detect premium payments from bank transactions. This is a v2 feature that would use reconciliation rules (021-BRR) to match insurance premium payments to policies.

However, v1 does support a manual link: the `InsurancePolicy` model has a `contact_id` field. If the user has set up their insurance broker as a Contact and pays premiums as bills, they can manually associate the policy with the contact. The insurance policy detail page can then show "Recent payments to this provider" by querying bills/payments to that contact. This is a read-only convenience, not a bidirectional link.

The `AccountSubType` enum already has `INSURANCE` and `VEHICLE_INSURANCE` expense sub-types, confirming that insurance premiums already flow through the chart of accounts. The insurance register is a metadata layer on top of -- not a replacement for -- expense tracking.

---

## 6. Multi-Tenancy & Permissions

### Q20. What permissions does this feature need, and which roles get access?

**Answer**: Six new permissions following the existing naming convention (singular form, dot-separated):

```
risk.view           -- view risk register items and insurance policies
risk.create         -- create new risk items and insurance policies
risk.update         -- update existing risk/insurance records, set review dates
risk.delete         -- delete risk items and insurance policies
risk.review         -- mark risk items as reviewed, change status
insurance.manage    -- manage insurance-specific operations (renewal, gap analysis)
```

Role assignments:

| Permission | owner | accountant | bookkeeper | approver | auditor | client |
|---|---|---|---|---|---|---|
| `risk.view` | Y | Y | Y | Y | Y | Y |
| `risk.create` | Y | Y | Y | - | - | - |
| `risk.update` | Y | Y | Y | - | - | - |
| `risk.delete` | Y | Y | - | - | - | - |
| `risk.review` | Y | Y | - | Y | - | - |
| `insurance.manage` | Y | Y | Y | - | - | - |

Rationale: Risk is read-heavy -- everyone should see the risk profile. Creation and updates are operational (owner, accountant, bookkeeper). Review/status changes are advisory (owner, accountant, approver -- similar to journal entry approve pattern). Delete is restricted to owner and accountant. Client role gets view-only, which is important for advisory meetings where the accountant presents the risk profile to the client.

Practice advisors access risk data for their clients' workspaces through the existing `WorkspaceGroup` membership and `GroupDashboardController` patterns. No new practice-level permissions needed -- the group dashboard will include risk summary data using the same `getAllWorkspaceIds()` aggregation pattern used by consolidated reports. The `GroupMemberUser` role (manager/viewer/entity-viewer) governs what level of risk detail is visible at the group level.
