---
title: "Idea Brief: Client Report Templates (SPFR)"
---

# Idea Brief: Client Report Templates (SPFR)

**Created**: 2026-04-01
**Author**: William Whitelaw

---

## Problem Statement (What)

- **Year-end deliverables are assembled outside MoneyQuest**: When an accounting practice finishes year-end work (workpapers, adjusting journals, WTB review), they switch to Word/Excel/CaseWare to assemble the client report pack — Profit & Loss, Balance Sheet, Director's Declaration, Compilation Report, Depreciation Schedule, Notes to Accounts. This breaks the workflow and duplicates data.
- **Entity-type-specific statutory requirements**: A Company requires a Director's Declaration and different disclosure notes than a Trust (trustee's declaration, distribution statement) or a Sole Trader (no declaration needed). Practices maintain multiple Word templates per entity type, manually swapping boilerplate each year.
- **No link between ledger data and report output**: Financial statements are manually transcribed or exported from the ledger, then pasted into report templates. This creates reconciliation risk — the numbers in the delivered report may not match the final adjusted trial balance.
- **Boilerplate text management is painful**: Compilation reports, accounting policy notes, and director's declarations contain standard paragraphs that vary by entity type, industry, and audit/review scope. Practices copy-paste from prior year files, risking stale or incorrect wording.
- **No consistency across the practice**: Each accountant maintains their own template variants. New staff produce inconsistent report packs. Quality control relies on partner review catching formatting and content issues.

**Current State**: MoneyQuest has the financial reporting engine (007-FRC — P&L, Balance Sheet, Trial Balance, GL, BAS), the Fixed Asset Register (033-FAR — depreciation schedules), year-end close (019-YEA), and the workpapers/WTB system (072-WKP). All the data sources exist. What's missing is the template-driven assembly layer that pulls ledger data into a branded, statutory-compliant report pack.

---

## Possible Solution (How)

Introduce a **Report Template** system — practice-owned, entity-type-aware templates that define the structure and content of year-end client report packs. Templates combine static boilerplate sections with dynamic data placeholders that pull from the ledger at generation time.

### Core Concepts

- **Report Templates**: A named, ordered collection of report sections. Each template targets an entity type (Company, Trust, Partnership, Sole Trader, Not-For-Profit, SMSF). Templates have a lifecycle: Draft → Ready to Use → Archived.
- **Report Sections**: Individual pages/components within a template — e.g., Cover Page, Director's Declaration, Compilation Report, Profit & Loss, Balance Sheet, Cash Flow Statement, Depreciation Schedule, Notes to Accounts, Supplementary Schedules. Sections are ordered and individually togglable.
- **Report Fields**: Reusable data placeholders (e.g., `{{entity_name}}`, `{{reporting_period}}`, `{{director_names}}`, `{{preparer_name}}`, `{{abn}}`) that resolve at generation time from workspace, organisation, and practice data.
- **Financial Data Binding**: Certain sections (P&L, Balance Sheet, Depreciation Schedule, Cash Flow) bind directly to existing report endpoints (007-FRC, 033-FAR), pulling adjusted balances from the WTB (072-WKP) — not raw ledger totals.
- **Report Styles**: Practice-level styling configuration — logo, fonts, colours, header/footer, page numbering — applied consistently across all templates.
- **System Templates**: MoneyQuest ships default templates per entity type (like Xero's "Created by Xero" templates) that practices can clone and customise. Practices cannot edit system templates directly.
- **Custom Templates**: Practices create their own templates from scratch or by cloning system/existing templates.
- **Report Pack Generation**: For a specific workspace + financial year, a practice selects a template, reviews/edits narrative sections, and generates a PDF report pack. Generated packs are stored as versioned documents.

### Entity-Type Templates (Australian Focus)

| Entity Type | Key Sections |
|-------------|-------------|
| **Company** | Director's Declaration, Compilation Report, P&L, Balance Sheet, Cash Flow Statement, Notes to Accounts, Detailed P&L Schedule |
| **Trust** | Trustee's Declaration, Compilation Report, P&L (Statement of Income), Balance Sheet, Distribution Statement, Notes to Accounts |
| **Partnership** | Partners' Declaration, Compilation Report, P&L, Balance Sheet, Partners' Equity Statement, Notes to Accounts |
| **Sole Trader** | Compilation Report, P&L, Balance Sheet, Notes to Accounts |
| **Not-For-Profit** | Committee Declaration, Compilation Report, Statement of Income & Expenditure, Balance Sheet, Notes to Accounts |
| **SMSF** | Trustee's Declaration, Compilation Report, Operating Statement, Statement of Financial Position, Notes, Member Benefit Statements |

### Section Types

1. **Static Text** — editable rich text with report field placeholders (declarations, compilation reports, notes)
2. **Financial Statement** — bound to a ledger report endpoint, auto-populated with adjusted figures
3. **Schedule** — bound to a specific data source (depreciation register, loan schedule, related party register)
4. **Custom Table** — manually editable table for ad-hoc disclosures

### Example Report Fields

| Field | Resolves From |
|-------|---------------|
| `{{entity_name}}` | Workspace name |
| `{{abn}}` | Workspace ABN |
| `{{acn}}` | Workspace ACN |
| `{{reporting_period}}` | Selected financial year ("Year ended 30 June 2026") |
| `{{reporting_date}}` | Period end date |
| `{{director_names}}` | Workspace contacts with role = Director |
| `{{trustee_name}}` | Workspace contacts with role = Trustee |
| `{{preparer_name}}` | Practice user generating the report |
| `{{preparer_firm}}` | Practice organisation name |
| `{{preparer_abn}}` | Practice ABN |
| `{{registered_agent_number}}` | Practice Tax Agent Registration Number |
| `{{date_prepared}}` | Generation date |

---

## Benefits (Why)

- **Closes the year-end loop** — workpapers (072-WKP) feed adjusting journals into the WTB, report templates pull adjusted figures into the client deliverable. The full workflow stays in MoneyQuest.
- **Eliminates CaseWare/Word dependency** — practices pay $2,000–$5,000/year per firm for CaseWare. Sole practitioners use Word templates. Both are eliminated.
- **Data integrity** — financial figures in the report are pulled live from the ledger. No manual transcription errors. The report always matches the adjusted trial balance.
- **Entity-type compliance** — system templates encode the correct statutory sections per entity type. New staff can't accidentally omit a director's declaration from a company report.
- **Practice consistency** — all accountants use the same branded templates. Report Styles ensure consistent logo, fonts, and formatting across all client deliverables.
- **Year-over-year efficiency** — prior year report packs serve as the starting point for the next year. Narrative sections carry forward, financial data refreshes automatically.
- **Competitive parity and beyond** — matches Xero Practice Manager's SPFR capability and CaseWare's template system, while adding tight integration with the event-sourced ledger (adjusted balances from WTB, not raw totals).

---

## Competitor Research

### Xero Practice Manager (SPFR)

The screenshot reference. Key patterns:

1. **Entity-type templates** — Company, Trust, Partnership, Sole Trader, Not-For-Profit, each with entity-specific statutory sections
2. **StatusTabs** — Ready to Use / Draft / Archive lifecycle
3. **System templates** ("Created by Xero") — cloneable, not editable
4. **Report Styles** — global styling config (fonts, logos, colours) separate from content
5. **Report Fields** — reusable data placeholders that templates reference
6. **Management Report** — separate template for internal/board reporting (not statutory)
7. **"Example Additional Reports"** — modular sections that bolt onto existing packs
8. **SPFR-focused** — Special Purpose Financial Reports, not General Purpose (GPFR)

### CaseWare

1. **Structured workpaper → report flow** — workpapers feed directly into report sections
2. **Conditional sections** — sections auto-include based on entity/engagement type
3. **Audit trail** — tracks every edit to boilerplate text with user attribution
4. **Prior period rollforward** — narrative sections carry forward, financials refresh
5. **Pricing**: ~$2,000–$5,000/year per firm

### MYOB Practice

1. **WTB-integrated** — report financials pull from the adjusted WTB, not raw ledger
2. **ATO-aligned** — SMSF templates match ATO audit tool format

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | William Whitelaw (PO, Dev) |
| **A** | William Whitelaw |
| **C** | — |
| **I** | — |

---

## Dependencies

| Direction | Epic | Relationship |
|-----------|------|-------------|
| **Depends on** | 007-FRC Financial Reporting (complete) | P&L, Balance Sheet, Cash Flow data for financial statement sections |
| **Depends on** | 033-FAR Fixed Asset Register (complete) | Depreciation schedule data binding |
| **Depends on** | 072-WKP Workpapers & WTB (planned) | Adjusted balances from WTB, not raw ledger totals |
| **Depends on** | 015-ACT / 027-PMV Practice Management (complete) | Practice-level template ownership, practice branding |
| **Integrates with** | 059-DGS Document Governance & Signing | Digital signatures on declarations and compilation reports |
| **Integrates with** | 019-YEA Year-End Close | Report generation triggers after year-end close finalised |
| **Integrates with** | 012-ATT Attachments | Generated PDF packs stored as workspace attachments |
| **Integrates with** | 023-EML Email Infrastructure | Email report packs to clients |
| **Future** | 022-CPV Client Portal | Clients access report packs via portal |

---

## Estimated Effort

**L — 5 sprints / 5 weeks**

- **Phase 1** (1.5 sprints): Backend foundation — migrations, models (ReportTemplate, ReportSection, ReportField, ReportStyle, GeneratedReport), enums, CRUD actions, system template seeder
- **Phase 2** (1.5 sprints): Template builder frontend — section ordering, rich text editor with field insertion, financial statement preview, template cloning
- **Phase 3** (1 sprint): Report generation — PDF rendering engine, financial data binding from 007-FRC/033-FAR/072-WKP, report field resolution, versioned storage
- **Phase 4** (0.5 sprint): Report Styles — practice-level branding (logo, fonts, colours, headers/footers), PDF styling
- **Phase 5** (0.5 sprint): Management Report template, prior-year rollforward, email delivery

---

## Proceed to PRD?

**YES** — This is the natural successor to 072-WKP (Workpapers & WTB). The year-end workflow is: adjusting journals → WTB review → workpaper sign-off → **client report pack generation**. Without this, practices must leave MoneyQuest at the final step. All data sources are already built (007-FRC, 033-FAR, 072-WKP). Matches Xero SPFR capability — a must-have for practice adoption.
