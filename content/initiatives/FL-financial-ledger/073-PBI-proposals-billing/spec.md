---
title: "Feature Specification: Proposals, Billing & Deal Pipeline"
---

# Feature Specification: Proposals, Billing & Deal Pipeline

**Feature Branch**: `073-PBI-proposals-billing`
**Created**: 2026-04-01
**Status**: Draft
**Epic**: 073-PBI
**Initiative**: FL -- Financial Ledger Platform
**Effort**: XL (7+ sprints)
**Depends On**: 005-IAR (complete -- Invoice model), 008-JCT (complete -- job costing), 023-EML (complete -- email), 031-QPO (complete -- quotes/PO types & statuses), 072-JTW (in progress -- practice jobs, timesheets, WIP)

### Out of Scope

- **Stripe payment collection** -- capturing card/bank details at signing and auto-charging. Deferred to 047-STP or a dedicated payment collection epic. V1 generates invoices; payment is recorded manually or via existing payment flows.
- **Multi-signatory proposals** -- Ignition supports up to 10 signatories. V1 supports a single client signer.
- **Branded landing pages / custom domains** -- proposals are served from the existing portal. Custom domain branding deferred.
- **Video in proposals** -- embedding video in cover letters. Deferred.
- **AutoCollect (unpaid invoice import)** -- importing unpaid Xero invoices into MoneyQuest for collection. Deferred.
- **Timesheet-to-invoice billing** -- auto-generating invoices from time entries at hourly rates. V1 supports fixed-fee and recurring billing from proposals. Time-based billing is deferred.
- **Approval workflows for proposals** -- internal sign-off before sending. V1 is direct send by any practice member.

### Architectural Decisions

1. **Proposal is a new entity, not an Invoice extension.** Unlike 031-QPO which added types to Invoice, proposals have too much unique data (cover letter, engagement terms, tiers, signatures, deal links) to fit in the Invoice model. However, on acceptance, a proposal auto-generates an Invoice (type=quote) using the existing model.

2. **Single-acceptance flow (Ignition pattern).** The client sees one page and performs one action. Accepting simultaneously: agrees to scope, signs engagement letter, and authorises billing. No separate quote approval step.

3. **Dynamic engagement letter composition.** Engagement letters are assembled from a Terms Library of conditional sections, matched by service category. This avoids manually editing terms for every proposal and ensures compliance terms are never accidentally omitted.

4. **Tiered pricing is optional.** Simple proposals have flat service lines. Tiered proposals have lines grouped into ProposalTier entities. The client portal renders either format.

5. **Services are workspace-scoped.** The service catalogue is per-workspace (practice workspace), not global. This allows different practices on the platform to maintain their own catalogues.

---

## Overview

Accounting practices need to bill their clients for services rendered. The current system tracks effort via timesheets (072-JTW) and manages jobs, but has no mechanism to generate proposals, secure engagement letters, or invoice clients for professional services.

This epic introduces the practice billing lifecycle: **Deal → Proposal → Acceptance → Invoice → Payment**, all tied to Jobs. It is inspired by [Ignition](https://ignitionapp.com), the market leader for accounting practice proposals, adapted to leverage MoneyQuest Ledger's existing accounting engine.

**Key insight from Ignition**: The proposal, engagement letter, and payment authorisation should be a **single document** with a **single acceptance action**. This eliminates the traditional multi-step process (send proposal → send separate engagement letter → set up billing) that causes friction and delays.

**Key advantage over Ignition**: MoneyQuest has the full double-entry accounting engine. Proposal line items link through to invoice lines, which link to journal entries, which link to chart accounts. This gives practices real profitability insight that Ignition (which relies on Xero for everything financial) cannot provide.

---

## User Scenarios & Testing

### User Story 1 -- Service Catalogue Management (Priority: P1)

A practice partner sets up their service catalogue -- the reusable library of services they offer. Each service has a name, default price, category, and revenue account mapping. The catalogue is used when building proposals.

**Why this priority**: Services must exist before proposals can be built. This is the foundation layer.

**Independent Test**: Create 5 services across different categories. When building a proposal, all 5 appear in the service picker with correct default pricing.

**Acceptance Scenarios**:

1. **Given** I am a practice member, **When** I navigate to /settings/services, **Then** I see a DataTable of all services with columns: Name, Category, Default Price, Billing Frequency, Active, Actions.

2. **Given** I click "New Service", **When** I fill in name ("Annual Tax Return -- Individual"), default price ($2,500), category (Tax Compliance), tax code (GST), and revenue account, **Then** the service is created and appears in the list.

3. **Given** a service exists, **When** I edit it and change the default price to $2,750, **Then** the new price is used for future proposals. Existing proposals using this service are unaffected.

4. **Given** I create a service with `is_scope_boundary = true` and price $0, **When** I add it to a proposal, **Then** it appears as a scope exclusion line (e.g. "Advisory Services -- Not Included") with $0 amount.

5. **Given** I deactivate a service, **When** I build a new proposal, **Then** the deactivated service does not appear in the service picker. Existing proposals with this service are unaffected.

6. **Given** I view the service list, **When** I filter by category "Tax Compliance", **Then** only services in that category are shown.

---

### User Story 2 -- Engagement Term Sections (Priority: P1)

A practice sets up their engagement letter terms library -- conditional sections that auto-compose based on which services are selected. Universal sections (intro, limitation of liability) are always included. Category-specific sections (BAS obligations, SMSF terms) are included only when relevant services are present.

**Why this priority**: Engagement letters are legally required (APES 305) for Australian practices. Dynamic composition eliminates manual editing errors and ensures compliance terms are never accidentally omitted.

**Independent Test**: Create 3 universal sections and 2 category-specific sections. When selecting services in categories "tax_compliance" and "bas_preparation", the composed engagement letter includes all 3 universal sections plus the 2 matching category sections, in sort order.

**Acceptance Scenarios**:

1. **Given** I navigate to /settings/engagement-terms, **When** the page loads, **Then** I see a sortable list of term sections with: Title, Applies To (category badges or "Universal"), Active, and drag handles for reordering.

2. **Given** I click "New Section", **When** I fill in title ("BAS Preparation Terms"), body (rich text), and select `applies_to_categories: ["bas_preparation", "bookkeeping"]`, **Then** the section is created.

3. **Given** I create a section with `is_universal = true`, **When** composing an engagement letter for any proposal, **Then** this section is always included regardless of service categories.

4. **Given** sections exist for "tax_compliance" and "bas_preparation", **When** I call the compose endpoint with categories `["tax_compliance", "bas_preparation"]`, **Then** the response contains all universal sections + both category sections, merged in sort_order.

5. **Given** I am building a proposal and select services with categories "tax_compliance" and "smsf_compliance", **When** I view the engagement letter preview, **Then** it shows the dynamically composed letter with relevant sections only.

---

### User Story 3 -- Create and Send a Proposal (Priority: P1)

A practice partner creates a proposal for a client engagement. They select the client, add services from the catalogue, write a cover letter, configure billing terms, and attach engagement letter terms. They preview the proposal as the client will see it, then send it.

**Why this priority**: This is the core workflow. Without proposals, there is no billing lifecycle.

**Independent Test**: Create a proposal with 3 service lines, cover letter, and engagement terms. Send it. Verify the client receives an email with a secure link. Open the link and see the full proposal rendered correctly.

**Acceptance Scenarios**:

1. **Given** I navigate to /proposals/new, **When** the builder loads, **Then** I see sections: Details (client picker, title, expiry date, assigned to), Cover Letter (rich text editor), Services (add from catalogue or custom lines), Billing (type, frequency, deposit), Engagement Letter (auto-composed from terms library with ability to customise), and Preview.

2. **Given** I select a client contact and add 3 services from the catalogue, **When** I view the services table, **Then** each line shows the service description, quantity, unit price, and total. Subtotal, GST, and grand total calculate automatically.

3. **Given** I add services with categories "tax_compliance" and "bas_preparation", **When** I view the Engagement Letter section, **Then** it auto-populates with composed terms from the terms library matching those categories plus all universal sections. I can edit the text before saving.

4. **Given** I have filled in all required fields, **When** I click "Save Draft", **Then** the proposal is saved with status "draft" and proposal_number auto-assigned (e.g. PROP-001).

5. **Given** a draft proposal exists, **When** I click "Send to Client", **Then**: (a) a ProposalShareToken is generated, (b) an email is sent to the client contact with a secure link, (c) the proposal status changes to "sent", (d) `sent_at` timestamp is recorded.

6. **Given** I click "Preview", **When** the preview renders, **Then** I see exactly what the client will see: practice branding, cover letter, services table, billing summary, engagement letter, and signature block.

7. **Given** a sent proposal, **When** I click "Withdraw", **Then** the status changes to "withdrawn" and the share token is invalidated.

---

### User Story 4 -- Tiered Pricing in Proposals (Priority: P2)

A practice partner wants to offer the client three pricing options within a single proposal: Essentials, Standard, and Premium. Each tier contains different combinations of services at different price points.

**Why this priority**: Tiered pricing encourages clients to self-select higher-value packages. Ignition reports that firms using tiers see higher average deal values. However, many proposals will be single-tier, so this is P2.

**Independent Test**: Create a proposal with 3 tiers. Each tier has different services. Send to client. Client selects "Standard" tier. On acceptance, only Standard tier lines are converted to invoices.

**Acceptance Scenarios**:

1. **Given** I am building a proposal, **When** I enable "Tiered Pricing" toggle, **Then** a tier management section appears where I can create tiers (name, description, is_recommended).

2. **Given** I have created 3 tiers, **When** I add service lines, **Then** each line can be assigned to a specific tier via a tier dropdown. Lines can also be "all tiers" (included in every option).

3. **Given** a tiered proposal is sent, **When** the client views the portal page, **Then** they see tiers displayed as selectable cards with tier name, description, service list, and total price. The recommended tier is highlighted.

4. **Given** the client selects "Standard" tier and accepts, **When** the proposal is accepted, **Then** `selected_tier_id` is set on the proposal, and only lines belonging to the "Standard" tier (plus "all tiers" lines) are used for invoice generation.

---

### User Story 5 -- Client Portal Acceptance (Priority: P1)

A client receives a proposal email and clicks the link. They see a branded page with the full proposal. They review services, billing terms, and engagement letter. They type their name as a digital signature, check the agreement box, and click Accept. The acceptance triggers quote/invoice generation.

**Why this priority**: The client-facing acceptance flow is the "money moment". Without it, proposals are just PDFs.

**Independent Test**: Open a proposal link, read the content, accept with signature, verify the proposal status changes to "accepted", a quote is auto-generated, and the practice receives a notification.

**Acceptance Scenarios**:

1. **Given** I have a proposal share token, **When** I open `/portal/proposals/{token}`, **Then** I see: practice logo/name, proposal title, date, expiry date, cover letter, services table (with pricing), billing summary (type, frequency, monthly amount if recurring), engagement letter content, agreement checkbox, signature field, and Accept/Decline buttons.

2. **Given** the proposal page loads, **When** the system records the visit, **Then** `viewed_at` is set on the proposal and the proposal status changes to "viewed". The practice receives a "proposal viewed" notification.

3. **Given** I check the agreement box and type my full name, **When** I click "Accept Proposal", **Then**: (a) `accepted_at`, `signature_name`, `signature_ip`, `signature_data` are recorded, (b) status changes to "accepted", (c) a Quote (Invoice type=quote) is auto-generated with lines copied from proposal, (d) the practice receives a "proposal accepted" notification.

4. **Given** I click "Decline", **When** a dialog asks for an optional reason, **Then** I can enter a reason and confirm. `declined_at` and `declined_reason` are recorded. Status changes to "declined".

5. **Given** the proposal has expired (past `valid_until`), **When** I open the link, **Then** I see a message "This proposal has expired" with the practice contact details. Accept/Decline buttons are disabled.

6. **Given** the proposal has already been accepted, **When** I reopen the link, **Then** I see a "Proposal Accepted" confirmation with the acceptance date and signature.

---

### User Story 6 -- Proposal to Invoice Conversion (Priority: P1)

After a client accepts a proposal, the practice converts the generated quote into an invoice (or the system does it automatically for recurring billing). The invoice links back to the proposal and job for profitability tracking.

**Why this priority**: This closes the billing loop. Without conversion, acceptance is just a status change.

**Independent Test**: Accept a proposal with 3 service lines. Convert the quote to an invoice. Verify the invoice has the same lines, is linked to the proposal and job(s), and follows the normal invoice workflow.

**Acceptance Scenarios**:

1. **Given** a proposal is accepted and a quote auto-generated, **When** I view the proposal detail, **Then** I see a "Convert to Invoice" button.

2. **Given** I click "Convert to Invoice", **When** the conversion runs, **Then**: (a) a new Invoice (type=invoice, status=draft) is created, (b) lines are copied from the quote with `job_id` preserved, (c) `converted_from_uuid` on the invoice links to the quote, (d) `converted_to_uuid` on the quote links to the invoice, (e) quote status becomes "converted", (f) proposal status becomes "converted".

3. **Given** the proposal has `billing_type = recurring` and `billing_frequency = monthly`, **When** the proposal is accepted, **Then** in addition to the initial quote, a `RecurringTemplate` is created that auto-generates invoices per the billing schedule. All generated invoices are linked to the proposal and job(s).

4. **Given** `deposit_required = true` with `deposit_amount = 50000` (=$500), **When** the proposal is accepted, **Then** a deposit invoice is generated immediately with reference "Deposit -- PROP-XXX". The remaining amount is billed per the billing schedule.

5. **Given** a converted invoice exists, **When** I view it, **Then** I see a link back to the original proposal and the quote it was converted from.

---

### User Story 7 -- Scope Changes & Instant Bill (Priority: P2)

After a proposal is accepted and work is underway, the practice needs to adjust scope -- add new services, change pricing, or bill for ad-hoc work outside the original engagement.

**Why this priority**: Scope creep is the #1 profitability killer for accounting practices. This feature manages it.

**Independent Test**: Accept a proposal. Add a new service line to the active engagement. Instant-bill for an ad-hoc advisory session. Verify both show up on the job's invoicing history.

**Acceptance Scenarios**:

1. **Given** an accepted proposal, **When** I click "Edit Services", **Then** I can add new service lines, remove services, or adjust pricing on existing lines. Changes are saved as a service amendment.

2. **Given** I edit services on an active engagement, **When** the next recurring invoice generates, **Then** it reflects the updated service lines and pricing.

3. **Given** an accepted proposal or active job, **When** I click "Instant Bill", **Then** a dialog opens where I select/create ad-hoc service lines. Clicking "Create Invoice" generates an invoice immediately, linked to the proposal and job.

4. **Given** scope boundary services ($0 items) are on the proposal, **When** a client requests work that falls under a scope exclusion, **Then** the practice can point to the exclusion and use Instant Bill to charge for the additional work.

---

### User Story 8 -- Deal Pipeline (Priority: P2)

A practice tracks prospective clients through a lightweight CRM pipeline: from initial enquiry, through qualification and negotiation, to proposal sent and won/lost.

**Why this priority**: Pipeline visibility enables revenue forecasting. Without it, practices don't know their projected intake. Ignition offers this on Pro+ ($399/month).

**Independent Test**: Create 3 deals at different stages. View the kanban board. Drag a deal from "Negotiating" to "Proposal Sent". Create a proposal from the deal. Accept the proposal. Verify the deal auto-transitions to "Won".

**Acceptance Scenarios**:

1. **Given** I navigate to /deals, **When** the page loads, **Then** I see a kanban board with columns: New, Qualifying, Negotiating, Proposal Sent. Each column shows total estimated value. Won/Lost are separate filtered views.

2. **Given** I click "New Deal", **When** I fill in name, contact (optional), estimated value, and owner, **Then** the deal is created in "New" stage.

3. **Given** a deal exists in "Negotiating", **When** I click "Create Proposal", **Then** a new proposal is created pre-linked to the deal and pre-filled with the deal's contact. The deal stage transitions to "Proposal Sent".

4. **Given** a deal has a linked proposal, **When** the client accepts the proposal, **Then** the deal auto-transitions to "Won" with `actual_value` set from the proposal total.

5. **Given** a deal has a linked proposal, **When** the client declines, **Then** the deal auto-transitions to "Lost" with `lost_reason` copied from the decline reason.

6. **Given** I view /deals/pipeline-summary, **When** the summary loads, **Then** I see: total pipeline value by stage, deal count by stage, win rate (won / (won + lost)), and average deal size.

---

### User Story 9 -- Renewals (Priority: P3)

At the end of a financial year, a practice bulk-renews client engagements with optional price increases.

**Why this priority**: Important for retention and revenue growth, but not needed for initial launch.

**Acceptance Scenarios**:

1. **Given** I navigate to /proposals with filter "status = converted", **When** I select multiple proposals and click "Bulk Renew", **Then** a dialog opens asking for optional price increase (% or flat $ amount).

2. **Given** I set a 5% price increase, **When** I confirm, **Then** new draft proposals are created from each selected proposal with updated pricing and `renewed_from_id` linking to the originals.

3. **Given** renewed proposals are created, **When** I view them, **Then** each shows "Renewal of PROP-XXX" with a link to the original.

---

### Edge Cases

- **Proposal accepted after expiry**: Expired proposals show disabled buttons on the portal. Practice can manually re-send with a new expiry date.
- **Multiple proposals to same contact**: Allowed. Each is independent. Only the most recent accepted one is the "active engagement".
- **Proposal with tiers where client selects nothing**: Accept button is disabled until a tier is selected.
- **Service deleted after being used in proposals**: Soft-reference. Existing proposal lines retain the description/pricing. The service picker no longer shows it.
- **Contact deleted after proposal sent**: Portal link still works (proposal stores contact snapshot). Practice sees a "contact deleted" note.
- **Concurrent edits to same proposal**: Last-write-wins with optimistic locking (updated_at check).
- **Recurring proposal converted but template fails**: Invoice generation failure logs an error and notifies the practice. Manual retry available.
- **Proposal line with $0 (scope boundary)**: Included in the proposal display. Excluded from totals. Not converted to invoice lines.

---

## Requirements

### Functional Requirements

**Service Catalogue**

- **FR-PBI-001**: System MUST provide a service entity with: workspace_id, name, description, default_price, default_quantity, default_billing_frequency, tax_code, chart_account_id, category, is_scope_boundary, is_active, sort_order.
- **FR-PBI-002**: Services MUST be scoped to the workspace. CRUD operations require workspace membership.
- **FR-PBI-003**: Services MUST support categories: tax_compliance, bas_preparation, bookkeeping, payroll, financial_statements, audit, advisory, company_secretary, smsf_compliance, estate_planning, other.
- **FR-PBI-004**: Deactivated services MUST NOT appear in the service picker but MUST remain on existing proposals.

**Engagement Terms**

- **FR-PBI-005**: System MUST provide engagement term sections with: workspace_id, title, body (rich text), applies_to_categories (JSON array), is_universal, sort_order, is_active.
- **FR-PBI-006**: System MUST provide a composition endpoint that accepts an array of service categories and returns the merged engagement letter text (all universal sections + matching category sections, in sort_order).
- **FR-PBI-007**: Engagement letter templates MUST support merge fields: `{{client_name}}`, `{{practice_name}}`, `{{services_summary}}`, `{{total}}`, `{{date}}`, `{{expiry_date}}`.

**Proposals**

- **FR-PBI-008**: System MUST provide a proposal entity with all fields defined in the domain model (see section below).
- **FR-PBI-009**: Proposals MUST use a separate numbering sequence (default prefix: "PROP-", configurable in workspace settings).
- **FR-PBI-010**: Proposals MUST support statuses: draft, sent, viewed, accepted, declined, expired, converted, withdrawn. Status transitions MUST be validated via `canTransitionTo()`.
- **FR-PBI-011**: Proposal lines MUST support an optional `proposal_tier_id` for tiered pricing. When tiers are used, the client selects a tier at acceptance and only that tier's lines are converted.
- **FR-PBI-012**: Proposal lines MUST support per-line `billing_frequency` override for mixed billing within a single proposal.
- **FR-PBI-013**: Sending a proposal MUST generate a ProposalShareToken and email the client a secure link.
- **FR-PBI-014**: The proposal share token MUST be a 64-character random string with optional expiry.

**Client Portal**

- **FR-PBI-015**: The portal proposal page MUST be accessible without authentication via the share token.
- **FR-PBI-016**: Opening the portal page MUST set `viewed_at` and transition status to "viewed" (if currently "sent").
- **FR-PBI-017**: Accepting MUST capture: signature_name, signature_ip (from request), signature_data (typed name), and set accepted_at.
- **FR-PBI-018**: Accepting MUST auto-generate an Invoice (type=quote, status=quoted) with lines copied from the proposal. The proposal's `quote_id` is set.
- **FR-PBI-019**: Declining MUST capture optional declined_reason and set declined_at.
- **FR-PBI-020**: Expired proposals (past valid_until) MUST show disabled accept/decline buttons with an expiry message.

**Conversion & Billing**

- **FR-PBI-021**: Accepted proposals MUST be convertible to invoices via the existing quote-to-invoice conversion flow (031-QPO).
- **FR-PBI-022**: For recurring billing, acceptance MUST create a RecurringTemplate with billing_frequency from the proposal.
- **FR-PBI-023**: For proposals with deposit_required, acceptance MUST generate an immediate deposit invoice.
- **FR-PBI-024**: All generated invoices MUST store `proposal_id` and `job_id` for traceability.

**Scope Changes**

- **FR-PBI-025**: Accepted proposals MUST support service line edits (add/remove/update lines) without requiring a new proposal.
- **FR-PBI-026**: System MUST support "Instant Bill" -- creating a one-off invoice against an active proposal/job for ad-hoc work.

**Deal Pipeline**

- **FR-PBI-027**: System MUST provide a deal entity with: workspace_id, contact_id, name, stage, estimated_value, actual_value, owner_id, proposal_id, notes, won_at, lost_at, lost_reason.
- **FR-PBI-028**: Deal stages MUST be: new, qualifying, negotiating, proposal_sent, won, lost.
- **FR-PBI-029**: Creating a proposal from a deal MUST auto-transition the deal to "proposal_sent" and link the proposal.
- **FR-PBI-030**: Proposal acceptance MUST auto-transition the linked deal to "won". Proposal decline MUST auto-transition to "lost".

**Renewals**

- **FR-PBI-031**: System MUST support bulk renewal of accepted/converted proposals with optional price adjustment (percentage or flat amount).
- **FR-PBI-032**: Renewed proposals MUST store `renewed_from_id` linking to the original proposal.

**Notifications**

- **FR-PBI-033**: System MUST dispatch notifications for: proposal.sent, proposal.viewed, proposal.accepted, proposal.declined, proposal.expiring (3 days before valid_until), proposal.expired.

---

### Key Entities

- **Service** (table: `services`): Reusable service catalogue item. Scoped to workspace. Has default pricing, category, and revenue account.
- **EngagementLetterTemplate** (table: `engagement_letter_templates`): Reusable full template with merge fields.
- **EngagementTermSection** (table: `engagement_term_sections`): Conditional section of engagement terms, matched by service category.
- **Proposal** (table: `proposals`): Branded client-facing document bundling scope, pricing, engagement terms, and digital signature.
- **ProposalLine** (table: `proposal_lines`): Individual service line within a proposal. Becomes an invoice_line on conversion.
- **ProposalTier** (table: `proposal_tiers`): Named pricing package within a proposal (optional).
- **ProposalShareToken** (table: `proposal_share_tokens`): Secure token for client portal access.
- **Deal** (table: `deals`): Lightweight CRM pipeline entry tracking prospects from enquiry to close.

### Relationship to Existing Entities

```
Workspace
  |-- Service (new)
  |-- EngagementLetterTemplate (new)
  |-- EngagementTermSection (new)
  |-- Proposal (new)
  |     |-- ProposalLine (new) --> Service, Job, ProposalTier, ChartAccount
  |     |-- ProposalTier (new)
  |     |-- ProposalShareToken (new)
  |     |-- Invoice (existing, via quote_id / invoice_id)
  |     |-- RecurringTemplate (existing, for recurring billing)
  |     |-- Contact (existing, via contact_id)
  |     \-- Deal (new, via deal_id)
  |
  |-- Deal (new)
  |     |-- Contact (existing, optional)
  |     \-- Proposal (existing, optional)
  |
  |-- Invoice (existing)
  |     |-- proposal_id (new nullable FK)
  |     \-- job_id (new nullable FK)
  |
  \-- Job / project_jobs (existing)
        |-- proposal_id (new nullable FK)
        |-- billing_type (new column)
        |-- billing_frequency (new column)
        |-- estimated_hours (new column)
        \-- hourly_rate (new column)
```

---

## Enums

### ProposalStatus

```php
enum ProposalStatus: string
{
    case Draft = 'draft';
    case Sent = 'sent';
    case Viewed = 'viewed';
    case Accepted = 'accepted';
    case Declined = 'declined';
    case Expired = 'expired';
    case Converted = 'converted';
    case Withdrawn = 'withdrawn';
}
```

### BillingType

```php
enum BillingType: string
{
    case Fixed = 'fixed';
    case Recurring = 'recurring';
    case TimeAndMaterials = 'time_and_materials';
    case Milestone = 'milestone';
}
```

### BillingFrequency

```php
enum BillingFrequency: string
{
    case Weekly = 'weekly';
    case Fortnightly = 'fortnightly';
    case Monthly = 'monthly';
    case Quarterly = 'quarterly';
    case Annually = 'annually';
    case OnCompletion = 'on_completion';
}
```

### ServiceCategory

```php
enum ServiceCategory: string
{
    case TaxCompliance = 'tax_compliance';
    case BasPreparation = 'bas_preparation';
    case Bookkeeping = 'bookkeeping';
    case Payroll = 'payroll';
    case FinancialStatements = 'financial_statements';
    case Audit = 'audit';
    case Advisory = 'advisory';
    case CompanySecretary = 'company_secretary';
    case SmsfCompliance = 'smsf_compliance';
    case EstatePlanning = 'estate_planning';
    case Other = 'other';
}
```

### DealStage

```php
enum DealStage: string
{
    case New = 'new';
    case Qualifying = 'qualifying';
    case Negotiating = 'negotiating';
    case ProposalSent = 'proposal_sent';
    case Won = 'won';
    case Lost = 'lost';
}
```

---

## API Endpoints

### Services

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/services` | List services (filterable by category, active) |
| POST | `/api/v1/services` | Create service |
| PUT | `/api/v1/services/{id}` | Update service |
| DELETE | `/api/v1/services/{id}` | Delete service |

### Engagement Term Sections

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/engagement-term-sections` | List sections |
| POST | `/api/v1/engagement-term-sections` | Create section |
| PUT | `/api/v1/engagement-term-sections/{id}` | Update section |
| DELETE | `/api/v1/engagement-term-sections/{id}` | Delete section |
| POST | `/api/v1/engagement-term-sections/compose` | Compose letter from service categories |

### Proposals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/proposals` | List proposals (filterable by status, contact, date) |
| POST | `/api/v1/proposals` | Create proposal |
| GET | `/api/v1/proposals/{uuid}` | Get proposal detail |
| PUT | `/api/v1/proposals/{uuid}` | Update proposal |
| DELETE | `/api/v1/proposals/{uuid}` | Soft delete proposal |
| POST | `/api/v1/proposals/{uuid}/send` | Send proposal to client |
| POST | `/api/v1/proposals/{uuid}/withdraw` | Withdraw proposal |
| POST | `/api/v1/proposals/{uuid}/duplicate` | Duplicate proposal |
| POST | `/api/v1/proposals/{uuid}/convert-to-invoice` | Convert accepted proposal to invoice |
| POST | `/api/v1/proposals/{uuid}/edit-services` | Edit services on accepted proposal |
| POST | `/api/v1/proposals/{uuid}/instant-bill` | Create one-off invoice for ad-hoc work |
| POST | `/api/v1/proposals/bulk-renew` | Bulk create renewal proposals |

### Portal (public, token-auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/portal/proposals/{token}` | View proposal (sets viewed_at) |
| POST | `/api/v1/portal/proposals/{token}/accept` | Accept with signature |
| POST | `/api/v1/portal/proposals/{token}/decline` | Decline with optional reason |

### Deals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/deals` | List deals (filterable by stage, owner) |
| POST | `/api/v1/deals` | Create deal |
| GET | `/api/v1/deals/{uuid}` | Get deal detail |
| PUT | `/api/v1/deals/{uuid}` | Update deal |
| DELETE | `/api/v1/deals/{uuid}` | Delete deal |
| POST | `/api/v1/deals/{uuid}/create-proposal` | Create proposal from deal |
| GET | `/api/v1/deals/pipeline-summary` | Pipeline metrics |

---

## Success Criteria

### Measurable Outcomes

- **SC-PBI-001**: A practice can create a proposal from the service catalogue, send it to a client, and have it accepted in under 5 minutes.
- **SC-PBI-002**: Client acceptance generates a valid quote (Invoice type=quote) with 100% of proposal line items, amounts, and job links preserved.
- **SC-PBI-003**: Converted invoices are linked to proposals and jobs, enabling profitability tracking across the full lifecycle (proposal → invoice → journal entry → chart account).
- **SC-PBI-004**: Engagement letters are dynamically composed with zero manual editing required when using the terms library.
- **SC-PBI-005**: Tiered proposals render correctly on the client portal with tier selection, and only selected tier lines are converted.
- **SC-PBI-006**: Proposal portal loads in under 2 seconds and works without client authentication.
- **SC-PBI-007**: Deal pipeline accurately reflects proposal status (auto-transitions on acceptance/decline).
- **SC-PBI-008**: Existing quote, invoice, and job functionality is unaffected (zero regressions on 005-IAR, 008-JCT, 031-QPO).

---

## Clarifications

### Session 2026-04-01

- Q: Should this be a separate Laravel app? --> A: No. It lives in the financial-ledger project alongside existing models. Proposals, services, deals are all workspace-scoped tenant entities in the same database.
- Q: What is the relationship to 031-QPO (Quotes & Purchase Orders)? --> A: QPO added quote/PO types to the Invoice model. This epic adds Proposals as a higher-level entity that generates quotes on acceptance. The quote-to-invoice conversion from QPO is reused.
- Q: What about the existing Job model (project_jobs)? --> A: Proposal lines link to project_jobs via job_id. New columns are added to project_jobs for billing metadata (billing_type, billing_frequency, estimated_hours, hourly_rate, proposal_id).
- Q: How does this relate to 072-JTW (Practice Jobs/Timesheets)? --> A: 072-JTW tracks the firm's effort (time budgets, timesheets, WIP). This epic tracks the firm's billing (proposals, invoices). Practice jobs carry the time; proposal lines carry the fees. They link via the workspace-level project_job. Future: time-based billing will connect JTW time entries to PBI invoice generation.
- Q: Stripe payment collection? --> A: Out of scope. V1 generates invoices; payment recording uses existing manual flows. Stripe integration (047-STP) is a future dependency.
- Q: Should engagement letters be versioned? --> A: No versioning in V1. The composed text is snapshot into `proposal.engagement_letter` at creation time. Editing term sections does not retroactively change sent proposals.

### Session 2026-04-01 (Clarification Round 2)

- Q: Services scoped to practice or workspace? --> A: Practice-scoped. Follows PracticeJob pattern from JTW. The firm owns the service catalogue, not individual client workspaces. Models in `app/Models/Central/`, scoped by `practice_id`.
- Q: Proposal entity — workspace-scoped or practice-scoped? --> A: Practice-scoped with `workspace_id` FK to the client workspace. `practice_id` is the primary scope. Same Central/ model pattern.
- Q: Where do Proposal, Service, Deal models live? --> A: `app/Models/Central/`. All practice-scoped entities. Auth uses practice_users pivot role (owner/member), consistent with 072-JTW.
- Q: Quote vs Invoice on acceptance? --> A: Skip the quote step. Acceptance creates a draft Invoice directly (type=invoice, status=draft). The extra quote→invoice step is unnecessary friction. Keep `converted_from_proposal_id` on the invoice for traceability.
- Q: Recurring billing template start_date? --> A: Acceptance date as default, with an optional `billing_start_date` field on the proposal for mid-year engagements.
- Q: Deposit — flat amount or percentage? --> A: Both. `deposit_type` enum (flat/percentage), `deposit_value` stores the amount or percentage.
- Q: Tax handling on proposal lines? --> A: GST-exclusive, matching existing invoice system. Tax calculated per line via service's tax_code. `rate_basis_points` pattern (integer, 1000 = 10%).
- Q: Portal authentication model? --> A: Under `(public)` layout, no auth. Token in URL is sufficient. Match existing signing flow at `/share/`. No login friction.
- Q: Portal branding? --> A: Use existing practice profile data (name, logo). No new branding settings for V1. Falls back to MoneyQuest branding if no practice logo.
- Q: Signature capture — typed name or canvas? --> A: Typed name only. Legally sufficient in Australia (Electronic Transactions Act 1999). `signature_data` = typed name string. No canvas.
- Q: Deal entity — workspace-scoped or practice-scoped? --> A: Practice-scoped with optional `workspace_id`. Deals start before clients have workspaces. Once onboarded, link the workspace.
- Q: Deal pipeline priority? --> A: Build with P1. It's lightweight CRUD + kanban, 2-3 days max. Gives the full lifecycle from day one.
- Q: Rich text editor for engagement terms? --> A: TipTap, already in the codebase for notes. Consistent UX.
- Q: Merge fields resolved server-side or client-side? --> A: Server-side at composition time. Composed text snapshot into `proposal.engagement_letter_html`. Preview re-composes live. Sent proposals are frozen.
- Q: Who can create/send proposals? --> A: Trust-based. Any practice member can create and send. V2 can layer approval chains via 060-ACH.
- Q: Who sees the deal pipeline? --> A: All practice members. Practices are small (5-15 people). "My deals" filter by owner handles personal views.
- Q: Should proposals link to PracticeJob (072-JTW) as well as project_jobs? --> A: Yes. `proposal.practice_job_id` (optional FK to PracticeJob for effort tracking) + `proposal_line.project_job_id` (optional FK to project_jobs for financial tracking). Full picture: effort + fees.
- Q: Notification channels for proposal events? --> A: Both in-app and email via existing 024-NTF system. "Proposal viewed" is real-time in-app + email.
- Q: Proposal builder — wizard or single page? --> A: Single long-form page with sticky section nav (sidebar TOC). Not a wizard — all sections visible for quick iteration. Sections: Details, Cover Letter, Services, Billing, Engagement Letter, Preview.
- Q: Proposal numbering — per-year or continuous? --> A: Continuous per-practice. PROP-001, PROP-002, etc. Unique within practice. Configurable prefix stored on practice settings.
