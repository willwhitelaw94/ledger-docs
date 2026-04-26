---
title: "Feature Specification: BAS & Tax Compliance Module"
description: "Complete specification for Australian BAS/IAS preparation, PAYG instalments, GST cash/accrual methods, PDF export, and tax agent multi-client dashboard."
---

# Feature Specification: BAS & Tax Compliance Module

**Feature Branch**: `044-TAX-bas-tax-module`
**Created**: 2026-03-19
**Updated**: 2026-03-22
**Status**: Refined
**Epic**: 044-TAX
**Initiative**: FL — Financial Ledger Platform
**Effort**: XL (6 sprints)
**Depends On**: 007-FRC (complete — BAS report generation), 002-CLE (complete — core ledger engine), 015-ACT (complete — practice management), 005-IAR (complete — invoicing/payments for cash GST)
**Research**: [Tax Compliance Research](/initiatives/FL-financial-ledger/044-TAX-bas-tax-module/context/raw_context/tax-compliance-research)

### Out of Scope

- **STP (Single Touch Payroll) integration** — payroll lodgement is a separate epic; this epic covers BAS/IAS/PAYG only
- **Income tax return preparation** — BAS is an activity statement, not a tax return; individual/company tax returns are out of scope
- **Automatic GST classification of transactions** — v1 relies on existing tax code assignment on journal entry lines; AI-based GST categorisation deferred
- **FBT (Fringe Benefits Tax) returns** — separate ATO form type, not part of BAS
- **ATO payment processing** — the system calculates what is owed and posts settlement JEs, but does not initiate ATO payments (bank transfers)
- **Historical BAS import** — importing previously lodged BAS from other software or ATO portal deferred to v2
- **Multi-jurisdiction tax compliance** — v1 is Australian BAS/GST only; NZ GST, UK VAT, US sales tax deferred
- **ATO SBR2 electronic lodgement** — deferred to v2 due to $5-15K/year M2M certificate cost, 3-6 month accreditation timeline, and SOAP/XBRL complexity. v1 uses PDF export + manual lodgement via ATO portal. See [research document](/initiatives/FL-financial-ledger/044-TAX-bas-tax-module/context/raw_context/tax-compliance-research) for full rationale.
- **PAYG withholding from payroll (W1-W5)** — requires payroll module; W-fields accept manual entry only in v1

---

## Overview

MoneyQuest has BAS report generation (007-FRC) and a complete preparation-to-lodgement workflow (prepare -> adjust -> submit -> approve -> lodge) with 16 passing feature tests. This epic closes the remaining gaps: complete BAS field mapping (G1-G20 + summary fields), workspace tax settings, GST cash method support, BAS PDF export for manual ATO lodgement, IAS field differentiation, PAYG instalment calculations, BAS rejection workflow, and tax agent multi-client dashboard enhancements.

The v1 lodgement strategy is **PDF export + manual lodge** via the ATO portal. Users enter the ATO receipt number after lodging, which triggers the settlement JE. SBR2 electronic lodgement is deferred to v2 when the user base justifies the $5-15K/year certificate cost.

---

## User Scenarios & Testing

### User Story 1 — Complete BAS Preparation with Full Field Mapping (Priority: P1)

A bookkeeper wants to prepare a BAS that shows all ATO fields (G1-G20 GST detail, 1A-9 summary, W1-W5 withholding, T1-T11 PAYG instalments) with drill-down capability on each field. Today the report only shows fields 1A and 1B — the bookkeeper cannot see the full G-section breakdown or verify calculated fields.

**Why this priority**: Without complete field mapping, the BAS is incomplete and cannot be used for lodgement (manual or electronic). This is the foundation for all other features.

**Independent Test**: Create a workspace with transactions covering all GST categories (standard sales, export sales, GST-free sales, capital purchases, non-capital purchases). Verify all G1-G20 fields calculate correctly against manual calculation.

**Acceptance Scenarios**:

1. **Given** a quarter with mixed transaction types, **When** the bookkeeper opens BAS preparation, **Then** they see all G1-G20 fields with the correct calculated and derived values.

2. **Given** a BAS with G-section detail, **When** the bookkeeper views the summary section, **Then** fields 1A (GST on sales) equals G9, and 1B (GST on purchases) equals G20.

3. **Given** a BAS field with contributing transactions, **When** the bookkeeper clicks a field row, **Then** they see a drilldown of every transaction contributing to that field with journal entry reference, date, account, and amounts.

4. **Given** calculated fields (G5, G6, G8, G12, G16, G17, G19), **When** the BAS is generated, **Then** calculated fields are derived from their component fields and cannot be directly adjusted.

---

### User Story 2 — GST Cash Accounting Method (Priority: P1)

A small business using GST cash accounting wants their BAS to reflect GST only on invoices that have been paid, not all issued invoices. Today the system uses accrual-based reporting — GST is reported when the journal entry is posted (typically at invoice issue), which is incorrect for cash-basis lodgers.

**Why this priority**: Approximately 60% of small businesses in Australia use cash GST accounting. Without this, MoneyQuest produces incorrect BAS figures for more than half of its target market.

**Independent Test**: Create an invoice dated within the BAS period but paid after the period end. Under cash method, GST should not appear. Under accrual, it should.

**Acceptance Scenarios**:

1. **Given** a workspace configured for cash GST, **When** an invoice is issued in Q1 but paid in Q2, **Then** the Q1 BAS does not include GST from that invoice, and the Q2 BAS does.

2. **Given** a workspace configured for accrual GST, **When** an invoice is issued in Q1 but paid in Q2, **Then** the Q1 BAS includes GST from that invoice.

3. **Given** a workspace switching from accrual to cash method, **When** the setting is changed, **Then** only future BAS periods use the new method; already-lodged periods are unaffected.

---

### User Story 3 — BAS PDF Export for Manual Lodgement (Priority: P1)

An accountant wants to download an ATO-formatted BAS PDF after preparation, so they can lodge manually via the ATO portal or keep a printed record. Today there is no PDF export — figures must be transcribed manually.

**Why this priority**: Without SBR2 (deferred to v2), PDF export is the primary way users get BAS data out of MoneyQuest for lodgement. This is the v1 substitute for electronic lodgement.

**Independent Test**: Generate a BAS PDF and verify all field values match the on-screen BAS report, and the layout matches the ATO form structure.

**Acceptance Scenarios**:

1. **Given** an approved BAS, **When** the accountant clicks "Download PDF", **Then** a PDF is generated with all BAS fields in ATO-standard layout, workspace ABN, and period details.

2. **Given** a BAS with adjustments, **When** the PDF is generated, **Then** adjusted field values are shown (not pre-adjustment), and an adjustments appendix lists each adjustment with reason.

3. **Given** a nil BAS (no transactions), **When** the PDF is generated, **Then** all fields show zero and the form is clearly marked as a nil statement.

---

### User Story 4 — BAS Approval Rejection (Priority: P2)

An accountant reviewing a submitted BAS finds errors and wants to reject it back to the bookkeeper with notes explaining what needs correction. Today the accountant can only approve — there is no way to send it back.

**Why this priority**: Without rejection, the accountant must communicate corrections out-of-band (email, chat), which is error-prone and loses audit trail. Rejection completes the review cycle.

**Independent Test**: Submit a BAS, reject it with a reason, verify it returns to in_progress status and the rejection note is recorded.

**Acceptance Scenarios**:

1. **Given** a BAS in AWAITING_APPROVAL status, **When** the accountant clicks "Reject" with a reason, **Then** the status returns to IN_PROGRESS and the rejection reason is recorded with the user and timestamp.

2. **Given** a rejected BAS, **When** the bookkeeper opens it, **Then** they see the rejection reason displayed prominently.

3. **Given** a BAS that has been rejected and corrected, **When** the bookkeeper resubmits, **Then** the approval workflow resumes normally.

---

### User Story 5 — Instalment Activity Statement (IAS) Support (Priority: P2)

Businesses that lodge monthly (instead of quarterly) need IAS support, which covers GST and PAYG withholding but excludes PAYG instalments and FBT. Monthly lodgers are a significant segment, especially larger businesses with annual turnover above the quarterly threshold.

**Why this priority**: Without IAS, MoneyQuest only serves quarterly lodgers. Monthly lodgers represent a large and high-value segment — typically larger businesses and their accountants. Supporting IAS doubles the addressable lodgement market.

**Independent Test**: Configure a workspace for monthly lodgement and verify IAS generation for a single month with correct field inclusion/exclusion.

**Acceptance Scenarios**:

1. **Given** a workspace configured for monthly BAS lodgement, **When** the user opens BAS preparation for a month, **Then** an IAS is generated with GST fields (G1-G20, 1A-1B) and PAYG withholding (W1-W5) but without PAYG instalments (T1-T11) or FBT (field 3).

2. **Given** an IAS, **When** the due date is calculated, **Then** it uses the 21-day offset (not 28-day quarterly offset).

3. **Given** a workspace switching from quarterly to monthly mid-year, **When** the setting is changed, **Then** future periods use monthly/IAS and already-lodged quarterly periods are preserved.

---

### User Story 6 — Tax Agent Multi-Client BAS Dashboard (Priority: P2)

A tax agent managing 50+ client workspaces wants a single view showing BAS status across all clients — which are prepared, which need review, which are overdue. Today they can see a basic overview but it lacks filtering, sorting, and the ability to act on BAS from the dashboard.

**Why this priority**: Practice managers are key users. Without a multi-client view, they must check each workspace individually — untenable at scale. This is the feature that makes MoneyQuest viable as a practice tool, not just a single-entity tool.

**Independent Test**: Create BAS records across multiple workspaces and verify the practice dashboard aggregates them correctly with filters and action buttons.

**Acceptance Scenarios**:

1. **Given** a practice manager with 30 client workspaces, **When** they view the BAS Dashboard in the practice portal, **Then** they see a table showing each client's BAS status (Not Started, In Progress, Awaiting Approval, Approved, Lodged) for the current period.

2. **Given** 5 clients have overdue BAS, **When** the dashboard loads, **Then** overdue clients are highlighted with days-overdue count and sorted to the top.

3. **Given** a client's BAS is ready for approval, **When** the tax agent clicks "Approve" from the dashboard, **Then** they can approve without navigating into the client's workspace.

4. **Given** the dashboard, **When** the tax agent filters by status "Awaiting Approval", **Then** only clients with BAS awaiting their review are shown.

---

### User Story 7 — PAYG Instalment Tracking (Priority: P2)

A business that pays PAYG income tax instalments wants to track instalment amounts, record payments, and have the instalment appear on the BAS at the correct T-fields. PAYG instalments are reported on the BAS for many businesses but are secondary to the core GST compliance workflow.

**Why this priority**: PAYG instalments are part of BAS for many businesses but are secondary to GST compliance. Getting GST right is the priority; PAYG tracking adds completeness.

**Independent Test**: Configure PAYG instalments for a workspace and verify they appear on the BAS at the correct T-fields.

**Acceptance Scenarios**:

1. **Given** a workspace with PAYG instalment obligation using ATO-determined method, **When** the BAS is prepared, **Then** the ATO-determined amount appears at field T7.

2. **Given** a workspace using income-based PAYG method, **When** the BAS is prepared, **Then** instalment income (T1) is calculated from revenue accounts, multiplied by the ATO rate (T2), producing the instalment amount (T5).

3. **Given** a PAYG instalment is paid, **When** the payment is recorded, **Then** a journal entry is posted (Dr PAYG Instalment, Cr Cash at Bank) and the instalment is marked as paid.

---

### User Story 8 — Workspace Tax Settings (Priority: P1)

A business owner or accountant needs to configure their workspace's tax settings — ABN, GST registration status, GST reporting method (cash/accrual), lodgement frequency (monthly/quarterly), and PAYG instalment details. Today there are no workspace-level tax settings.

**Why this priority**: All other BAS features depend on knowing the workspace's tax configuration. Without settings, the system cannot determine the correct GST method, due dates, or PAYG obligations.

**Acceptance Scenarios**:

1. **Given** a workspace settings page, **When** the user sets GST method to "Cash", **Then** all future BAS reports use cash-basis GST calculations.

2. **Given** tax settings, **When** the user enters their ABN, **Then** the ABN is validated (11-digit check) and appears on BAS PDFs.

3. **Given** PAYG settings, **When** the user configures instalment method and rate, **Then** BAS preparation uses those settings for T-field calculations.

---

### Edge Cases

- **Quarterly-to-monthly lodgement change mid-year**: The system adjusts the period configuration and generates IAS for future periods. Already-lodged quarterly BAS remain unchanged.
- **BAS amendment after lodgement**: The system supports BAS revision. The user prepares an amended BAS, which creates a new lodgement record with `revision_of_lodgement_id` pointing to the original. For v1, the user re-lodges manually via ATO portal and enters the new receipt number.
- **Workspace with no transactions in a period**: BAS preparation shows a "Nil BAS" option — all fields are zero. The user can still approve and lodge (record receipt number for nil lodgement).
- **Concurrent BAS preparation**: Only one BAS can be in preparation for a given period. If a second user attempts to open preparation, they see "BAS in progress by [user] — view read-only or request access."
- **Settlement JE when GST accounts have unexpected balances**: The settlement JE posts for the net amount calculated on the BAS fields. If the GST liability/asset account balances do not match the BAS figures (due to prior adjustments), a reconciliation variance note is attached to the JE.
- **Tax agent lodging on behalf of client without workspace access**: The practice dashboard uses the practice-client advisor connection (015-ACT) to verify the tax agent has authority. Lodgement requires an active advisor connection.
- **Cash GST with partial invoice payment**: If an invoice is partially paid in the BAS period, only the GST proportion of the paid amount is included. Formula: `gst_for_period = (payment_amount / invoice_total) * invoice_gst_amount`. All amounts in cents (integer arithmetic).
- **Tax code effective date changes mid-period**: Tax code effectivity is checked per-transaction using `TaxCode::isEffectiveOn()`. If a rate changes mid-quarter, transactions before the change use the old rate and transactions after use the new rate.

---

## Requirements

### Functional Requirements

**BAS Field Mapping & Calculation Engine**
- **FR-001**: System MUST calculate all G-section fields (G1-G20) from journal entry lines, with G5, G6, G8, G12, G16, G17, G19 as derived/calculated fields.
- **FR-002**: System MUST calculate summary fields (1A-9) from G-section results and other components (PAYG withholding, PAYG instalments, FBT).
- **FR-003**: System MUST support field-level drilldown showing every contributing transaction for non-calculated fields.
- **FR-004**: System MUST distinguish between capital purchases (G10) and non-capital purchases (G11) based on chart account type (asset vs expense).
- **FR-005**: Calculated fields (G5, G6, G8, G9, G12, G16, G17, G19, G20, field 4, 5A, 6A, 7) MUST NOT accept manual adjustments — they are always derived.

**Workspace Tax Settings**
- **FR-006**: System MUST store workspace-level tax settings: ABN, GST registration status, GST method (accrual/cash), lodgement frequency (monthly/quarterly), PAYG instalment method, PAYG instalment rate (basis points), and BAS agent details.
- **FR-007**: System MUST validate ABN format (11 digits with ATO check-digit algorithm).
- **FR-008**: System MUST use workspace tax settings to determine GST calculation method and lodgement frequency for BAS preparation.

**GST Cash Method**
- **FR-009**: System MUST support GST cash accounting method where GST is reported based on payment date, not invoice/JE date.
- **FR-010**: For cash GST, system MUST query invoice/bill payment records to determine which GST amounts fall within the BAS period.
- **FR-011**: For partial payments under cash GST, system MUST pro-rate the GST amount proportionally: `gst_for_period = (payment_amount / invoice_total) * invoice_gst_amount`. All amounts in cents.

**BAS PDF Export**
- **FR-012**: System MUST generate a downloadable PDF with all BAS fields in ATO-standard layout.
- **FR-013**: BAS PDF MUST include workspace ABN, entity name, period dates, and preparer/approver details.
- **FR-014**: BAS PDF MUST include an adjustments appendix listing each manual adjustment with field code, amount (cents), reason, user, and timestamp.

**BAS Preparation Workflow**
- **FR-015**: System MUST provide a step-by-step BAS preparation workflow with drill-down to contributing transactions per field.
- **FR-016**: System MUST support manual adjustments to non-calculated BAS fields with audit trail (reason required). Adjustments stored as integer cents.
- **FR-017**: System MUST support BAS approval workflow (bookkeeper prepares -> accountant approves -> record lodgement).
- **FR-018**: System MUST support BAS rejection (accountant rejects -> returns to IN_PROGRESS with reason and audit trail).
- **FR-019**: System MUST auto-post settlement journal entries upon lodgement recording (Dr GST Collected, Cr GST Paid, Dr/Cr ATO Settlement Account). All amounts in cents.
- **FR-020**: System MUST support nil BAS for periods with no taxable activity (all fields zero).

**Manual Lodgement Recording (v1)**
- **FR-021**: System MUST allow users to record a manual lodgement by entering the ATO receipt number obtained from the ATO portal.
- **FR-022**: Recording a manual lodgement MUST transition the BAS period to LODGED status and trigger the settlement JE.
- **FR-023**: System MUST store all lodgement records with ATO receipt numbers for 7-year compliance retention.

**IAS & Lodgement Types**
- **FR-024**: System MUST support both quarterly BAS and monthly IAS lodgement types.
- **FR-025**: IAS MUST exclude PAYG instalment fields (T1-T11) and FBT instalment (field 3).
- **FR-026**: System MUST allow workspace-level configuration of lodgement frequency (monthly or quarterly).

**Practice Dashboard**
- **FR-027**: System MUST provide a multi-client BAS dashboard for practice managers showing BAS status per client per period.
- **FR-028**: System MUST highlight overdue BAS with days-overdue count on the practice dashboard.
- **FR-029**: System MUST allow tax agents to approve BAS and record lodgement from the practice dashboard without navigating into the client workspace.
- **FR-030**: System MUST verify an active advisor connection (015-ACT) before allowing practice-level actions on behalf of a client.
- **FR-031**: Practice dashboard MUST support filtering by status, period, and workspace.

**PAYG Instalments**
- **FR-032**: System MUST track PAYG instalment obligations and include them on BAS at the correct T-fields.
- **FR-033**: System MUST support ATO-determined instalment amounts (T7) and income-based calculation (T1 x T2 = T5).
- **FR-034**: For income-based method, system MUST calculate instalment income (T1) from revenue chart accounts within the BAS period.
- **FR-035**: PAYG instalment rate MUST be stored as `rate_basis_points` (integer, 1000 = 10%).
- **FR-036**: System MUST post journal entries when PAYG instalment payments are recorded. All amounts in cents.

**Notifications**
- **FR-037**: System MUST notify relevant users when BAS is submitted for approval.
- **FR-038**: System MUST notify the preparer when BAS is approved or rejected.
- **FR-039**: System MUST notify workspace owners/accountants when BAS due date is within 7 days (upcoming) or past due (overdue).

**SBR2 Electronic Lodgement (Deferred to v2)**
- **FR-040**: System MUST lodge BAS electronically via the ATO SBR2 accredited gateway. *Deferred — see research document for rationale.*
- **FR-041**: System MUST display ATO error codes with plain-English explanations when lodgement fails. *Deferred.*
- **FR-042**: System MUST support BAS revision/amendment lodgement via SBR2 with original receipt number as reference. *Deferred.*
- **FR-043**: System MUST queue lodgement requests when the SBR2 gateway is unavailable and retry with exponential backoff. *Deferred.*

### Key Entities

- **BasPeriod**: A tax reporting period (monthly or quarterly) tied to a workspace. Fields: `workspace_id`, `period_type` (quarterly/monthly), `form_type` (bas/ias), `start_date`, `end_date`, `due_date`, `status` (not_started, in_progress, awaiting_approval, approved, lodged, amended), `prepared_by_user_id`, `approved_by_user_id`, `submitted_at`, `approved_at`. **Already exists**.

- **BasLodgement**: A record of a lodgement (manual receipt entry or future SBR2). Fields: `bas_period_id`, `ato_receipt_number`, `lodged_at`, `form_type` (BAS/IAS), `field_values` (JSON of all BAS field amounts in cents), `settlement_journal_entry_id`, `revision_of_lodgement_id` (nullable, for amendments), `status`, `ato_error_message`, `lodged_by_user_id`. **Already exists**.

- **BasAdjustment**: A manual adjustment to a BAS field. Fields: `bas_period_id`, `field_code` (e.g., "1A", "G7"), `amount` (integer cents), `reason` (text, required), `adjusted_by_user_id`, `created_at`. **Already exists**.

- **PaygInstalment**: A tracked income tax instalment. Fields: `workspace_id`, `bas_period_id`, `amount` (integer cents), `calculation_method` (ato_determined/income_based), `due_date`, `payment_status` (pending/paid), `journal_entry_id` (nullable, linked when paid). **Already exists**.

- **BasRejection** *(new)*: A record of a BAS rejection. Fields: `bas_period_id`, `rejected_by_user_id`, `reason` (text, required), `created_at`.

- **WorkspaceTaxSettings** *(new)*: Tax configuration for a workspace. Fields: `workspace_id` (unique), `abn`, `gst_registered` (boolean), `gst_method` (accrual/cash), `lodgement_frequency` (monthly/quarterly), `payg_instalment_method` (ato_determined/income_based/none), `payg_instalment_rate_basis_points` (integer, nullable), `payg_instalment_amount` (integer cents, nullable), `bas_agent_name`, `bas_agent_abn`, `bas_agent_number`.

### BAS Field Mapping Reference

All BAS field values are stored and calculated as **integer cents**. The complete field mapping:

**GST Detail (G-section)**:
- G1: Total sales (sum of revenue lines, gross) | G2: Export sales | G3: Other GST-free sales | G4: Input taxed sales
- G5 = G2 + G3 + G4 *(calculated)* | G6 = G1 - G5 *(calculated)* | G7: Adjustments (manual)
- G8 = G6 + G7 *(calculated)* | G9 = GST on sales *(sum of tax_amount or G8/11)*
- G10: Capital purchases | G11: Non-capital purchases | G12 = G10 + G11 *(calculated)*
- G13: Input taxed purchases | G14: No-GST purchases | G15: Private use estimate (manual)
- G16 = G13 + G14 + G15 *(calculated)* | G17 = G12 - G16 *(calculated)* | G18: Adjustments (manual)
- G19 = G17 + G18 *(calculated)* | G20 = GST on purchases *(sum of tax_amount or G19/11)*

**Summary (front page)**:
- 1A = G9 | 1B = G20 | 1C-1G: Specialty taxes (WET, LCT, FTC)
- 2A: PAYG withholding (W4) | 3: FBT instalment
- 4 = 1A + 1C + 1E + 2A + 3 *(calculated)* | 5A = 1B + 1D + 1F + 1G *(calculated)*
- 5B: PAYG instalment credit | 6A = 5A + 5B *(calculated)*
- 7 = 4 - 6A *(calculated)* | 7A: Amount owing (if 7 > 0) | 7B: Refundable (if 7 < 0)

**PAYG Withholding (W-section)**: W1-W5 (manual entry in v1, payroll integration in v2)

**PAYG Instalments (T-section)**: T1-T11 (T7 for ATO-determined, T1xT2=T5 for income-based)

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: All BAS fields (G1-G20 + summary + W + T sections) calculate correctly against known test data sets — verified by automated tests.
- **SC-002**: BAS preparation time under 15 minutes for workspaces with clean data (vs 2-4 hours manual process).
- **SC-003**: BAS PDF export produces complete, ATO-formatted document with all fields populated.
- **SC-004**: Cash GST method correctly defers GST to payment period — verified by test with invoice paid across period boundary.
- **SC-005**: Practice dashboard loads BAS status for 50+ clients in under 2 seconds.
- **SC-006**: All lodgement records retained with ATO receipt numbers for minimum 7-year compliance window.
- **SC-007**: Zero data loss — all adjustments, rejections, and lodgement records have full audit trail.

---

## Clarifications

### Session 2026-03-19

- Q: What is the SBR2 gateway and how does accreditation work? -> A: Standard Business Reporting 2 is the ATO's machine-to-machine API for lodging activity statements. Accreditation requires M2M certificate ($5-15K/year), conformance testing, and 3-6 months elapsed time. **Deferred to v2.**
- Q: Should the settlement JE post automatically or require manual confirmation? -> A: Automatically upon lodgement recording (receipt number entry). The JE zeroes out the GST Collected and GST Paid accounts into the ATO Settlement Account. The accountant can review but not block it.
- Q: How does the approval workflow interact with existing workspace roles? -> A: Bookkeeper role can prepare and submit BAS. Accountant/Owner role can approve, reject, and record lodgement. This maps to the existing Spatie Permission model — permissions: `bas.prepare`, `bas.approve`, `bas.lodge`.
- Q: Should BAS data be event-sourced? -> A: No. BAS preparation is a workflow, not a financial mutation. The settlement JE that results from lodgement IS event-sourced (it goes through JournalEntryAggregate). BAS periods and lodgement records are standard Eloquent models.
- Q: How does the practice dashboard access cross-workspace BAS data? -> A: Via the existing advisor connection model from 015-ACT. The practice dashboard queries BAS periods across all workspaces where the practice has an active advisor connection.
- Q: What happens if a workspace's GST account balances don't match the BAS field totals? -> A: The BAS fields are calculated from transaction-level tax codes, not from account balances. A reconciliation check compares the two and flags discrepancies for the accountant to investigate before lodgement.

### Session 2026-03-22

- Q: Why defer SBR2 to v2? -> A: Cost ($5-15K/year certificate), timeline (3-6 months accreditation), complexity (SOAP/XBRL). Most small practices want BAS *preparation* — lodgement is the last mile and can be done via ATO portal. PDF export covers 80% of the value.
- Q: How does cash GST handle partial payments? -> A: Pro-rate: `gst_for_period = (payment_amount / invoice_total) * invoice_gst_amount`. All arithmetic in integer cents to avoid floating-point issues.
- Q: Should W-fields (PAYG withholding) be automated? -> A: Not in v1. W-fields require payroll data (STP). In v1, W-fields accept manual entry only. The BAS preparation UI allows entering W1-W5 values as manual adjustments.
- Q: What tax codes need to be seeded? -> A: Standard Australian tax codes: GST (1A, 1000bp), GST-Free (G3, 0bp), Input Taxed (G4, 0bp), Export (G2, 0bp), GST on Purchases (1B, 1000bp), Capital GST (G10, 1000bp), Non-Capital GST (G11, 1000bp), No ABN Withholding (W5, 4650bp).
