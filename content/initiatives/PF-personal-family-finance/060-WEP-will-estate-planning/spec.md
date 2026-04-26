---
title: "Feature Specification: Will & Estate Planning"
---

# Feature Specification: Will & Estate Planning

**Feature Branch**: `060-WEP-will-estate-planning`
**Created**: 2026-03-22
**Status**: Draft
**Epic**: 060-WEP
**Initiative**: FL -- Financial Ledger Platform
**Effort**: XL (4-5 sprints)
**Depends On**: 059-DGS (complete), 056-FEX (complete), 006-CCM (complete), 030-PLG (complete), 033-FAR (complete)

### Out of Scope

- **Legal advice** -- the platform generates documents, not advice. Disclaimers required throughout.
- **Probate processing** -- post-death estate administration is a separate future epic.
- **International wills** -- Australian wills only in v1 (state-specific witnessing, uniform will structure).
- **Complex trust deed drafting** -- testamentary trusts within wills are supported; standalone inter-vivos trust deeds are not.
- **Witness signature capture** -- wills require physical witnessing in all states except VIC; the platform generates a printable PDF with state-specific signing instructions.
- **Codicil support** -- will amendments are handled via full new version (revoke and replace).
- **Mirror/mutual wills** -- couples workflow deferred to v2.
- **Estate map visualization** -- holistic entity-to-beneficiary flow diagrams deferred to v2.
- **Inheritance scenario simulator** -- "what if" modelling for estate distribution deferred to v2.
- **Digital assets section** -- cryptocurrency and online account instructions deferred to v2.
- **Superannuation nomination tracker (non-SMSF)** -- tracking nominations across retail/industry funds deferred to v2.

---

## Overview

MoneyQuest tracks contacts, assets, debts, bank accounts, SMSFs, trusts, and companies -- but has no estate planning layer connecting them. This epic delivers a guided will builder that auto-populates from ledger data, BDBN management for SMSF workspaces, Power of Attorney documents, Advance Health Directives, an estate dashboard with change detection alerts, and a practice advisor view for client estate health monitoring.

The will builder uses a 10-step wizard (React Hook Form + Zod per step) that pulls assets from PersonalAsset, Asset, and BankAccount models and beneficiaries from the Contact model. Document generation uses HTML-to-PDF via DomPDF (matching the existing invoice/report PDF pattern), signing flows through 059-DGS, and completed documents are stored via 056-FEX. BDBN expiry tracking runs via a daily scheduled command with notifications at 90/30/7 day thresholds.

All estate documents are workspace-scoped, version-tracked (wills), and protected by granular permissions. The estate dashboard surfaces "needs updating" alerts when assets change, contacts are archived, or documents go stale. Practice advisors get a cross-client estate health view with gap analysis and bulk task creation.

---

## User Stories

### Individual (Workspace Owner / Member)

**US-01**: As a workspace owner, I want a guided wizard to create my will so I can complete estate planning without leaving the platform.

**US-02**: As a workspace owner, I want my assets auto-populated from the ledger (personal assets, fixed assets, bank accounts) so I don't re-enter data I've already tracked.

**US-03**: As a workspace owner, I want to appoint executors and guardians from my existing contacts so I can reuse contact data.

**US-04**: As a workspace owner, I want to receive alerts when my will may need updating (asset changes, new contacts, entity changes) so my estate plan stays current.

**US-05**: As a workspace owner, I want to create Power of Attorney documents (financial and medical) so my incapacity planning is covered alongside my will.

**US-06**: As a workspace owner, I want to download my will as a PDF with state-specific signing instructions so I can print and execute it correctly.

**US-07**: As a workspace owner, I want an estate dashboard showing the status of my will, BDBN, POA, and health directive so I can see my estate plan completeness at a glance.

### SMSF Member

**US-08**: As an SMSF workspace member, I want to create and track BDBNs with expiry alerts so my super death benefit nominations never lapse unnoticed.

**US-09**: As an SMSF workspace member, I want to renew an expiring BDBN pre-populated from the previous one so renewal is fast and accurate.

**US-10**: As an SMSF workspace member, I want my BDBN sent for signing via the platform so I can manage the two-witness requirement digitally.

### Family Group Manager (WorkspaceGroup Owner)

**US-11**: As a family office manager, I want to see estate plan coverage across all entities in my workspace group so I can identify gaps (missing wills, expired BDBNs, no POA).

**US-12**: As a family office manager, I want testamentary trust options in my will so I can protect assets for minor children and vulnerable beneficiaries.

**US-13**: As a family office manager, I want to create Advance Health Directives so my end-of-life medical wishes are documented alongside my will and POA.

### Practice Advisor

**US-14**: As a practice advisor, I want an estate health view across all my client workspaces so I can identify which clients need estate planning attention.

**US-15**: As a practice advisor, I want alerts for expired BDBNs, missing wills, and stale estate plans so I can proactively reach out to clients.

**US-16**: As a practice advisor, I want to create practice tasks for estate planning reviews so I can track advisory work.

**US-17**: As a practice advisor, I want to review a client's will before they sign it so I can provide professional guidance.

**US-18**: As a practice advisor, I want to bulk-create estate review tasks for multiple clients at once so I can efficiently schedule annual reviews.

**US-19**: As a practice advisor, I want to see BDBN expiry dates across all SMSF clients in a single view so I can manage renewals proactively.

**US-20**: As a practice advisor, I want to send BDBNs and POAs for signing on behalf of a client workspace so I can manage the execution workflow.

---

## Functional Requirements

### FR1: Will Builder Wizard (10-Step Guided Flow)

The will builder uses a single React Hook Form instance at the wizard parent with Zod validation per step. Draft auto-saves on each step completion via PATCH to the API (see C-11). The `current_step` field on the Will model tracks wizard progress for resume.

- **FR1.1 -- Step 1: Will Type Selection**. Options: Simple Will, Testamentary Trust Will. Selection determines whether Step 7 (testamentary trust setup) is shown. Will type stored on the Will model as `will_type` enum. Brief explanation of each type with recommendation guidance (e.g., "Recommended if you have minor children or assets over $1M").

- **FR1.2 -- Step 2: Testator Details**. Auto-filled from the authenticated user's profile and workspace: full legal name, date of birth, address, state/territory (determines witnessing requirements), marital status, number of children. Editable -- user confirms or corrects. State field drives state-specific content throughout the wizard and in the generated PDF (see C-07, C-20).

- **FR1.3 -- Step 3: Executor Appointment**. Select primary and alternate executors from workspace contacts (006-CCM). "Add new contact" inline if needed. Executor role explanation shown. Validation: at least one primary executor required. Warning if executor is also a beneficiary (legal but worth noting). Contact name is denormalized into the will's relationship tables and `data_snapshot` at generation time to survive contact deletion (see C-02).

- **FR1.4 -- Step 4: Guardian Appointment (Optional)**. Only shown if testator indicates children under 18. Select primary and alternate guardians from contacts. Guardian role explanation. Includes optional pet guardianship section (carer + pet fund amount in cents).

- **FR1.5 -- Step 5: Specific Bequests**. Link bequests to assets from the ledger: PersonalAsset, Asset (fixed assets), BankAccount. Each bequest: asset reference (polymorphic), beneficiary (contact), conditions (free text, optional). Also supports pecuniary legacies (fixed dollar amounts to contacts) and non-ledger items (free text description for unlisted items like jewellery, art). Charitable bequests supported (contact with ABN). If a linked asset has been sold or deleted since the bequest was created, the bequest is flagged as "needs review" -- it is NOT auto-removed (see C-05).

- **FR1.6 -- Step 6: Residuary Estate Distribution**. Everything remaining after specific bequests and debts. Percentage-based allocation to beneficiaries (contacts) in basis points (10000 = 100%). Must total 100%. Supports multiple beneficiaries. Contingency beneficiaries if primary predeceases (excluded from 100% total).

- **FR1.7 -- Step 7: Testamentary Trust Setup (Conditional)**. Only shown if will_type is `testamentary_trust`. For each trust: trustee (contact), vesting age (default 25), income distribution rules (JSON -- accumulate, distribute, or trustee discretion). Multiple trusts supported (one per beneficiary group). Explanation of tax advantages for minor beneficiaries.

- **FR1.8 -- Step 8: Funeral Wishes (Optional)**. Free text sections: burial vs cremation preference, ceremony instructions, location preference, organ donation wishes. Non-binding -- clearly labelled as wishes, not directives.

- **FR1.9 -- Step 9: Review & Preview**. Full summary of all sections, each expandable/collapsible. "Edit" button per section returns to that wizard step. Asset schedule with current values from the ledger. Beneficiary distribution summary. Warnings panel: no substitute executor, beneficiary is a witness, large estate without testamentary trust, bequest references a deleted/disposed asset (blocking -- must be resolved before generation), executor/guardian/beneficiary contact is archived (warning). Legal disclaimer prominently displayed. "I acknowledge this is not legal advice" checkbox required before proceeding.

- **FR1.10 -- Step 10: Generate & Sign**. Generates PDF via HTML-to-PDF (server-side, matching the `ExportReportPdf` action pattern: Blade template rendered via DomPDF). PDF preview shown inline (DocumentSplitView reuse). State-specific signing and witnessing instructions displayed (see C-07). Download button for printable PDF. Option to upload signed copy (photo/scan) as attachment. Signed copy stored in 056-FEX file system (both raw disk path and `File` model record created in an auto-provisioned "Estate Planning" folder -- see C-10). If VIC: option to initiate 059-DGS signing flow for remote witnessing -- with prominent notice that the session must occur via live audio-visual link with an authorised witness per VIC Electronic Transactions Act 2000 s 12A (see C-09). Generation is blocked if any bequest references a non-existent asset (deleted/disposed).

### FR2: Beneficiary Management

- **FR2.1**: Beneficiaries are contacts from the 006-CCM Contact model. No separate "beneficiary" model -- contacts are linked to estate documents via relationship tables (`will_bequests`, `will_executors`, `will_guardians`, `will_residuaries`, `bdbn_nominees`).

- **FR2.2**: Contact roles in estate planning: beneficiary (specific bequest or residuary), executor (primary/alternate), guardian (child/pet), trustee (testamentary trust), attorney (POA -- financial/medical), nominee (BDBN), decision maker (health directive). A single contact can hold multiple roles across different documents.

- **FR2.3**: When a contact referenced by an estate document is soft-deleted (archived), the FK remains intact (SoftDeletes does not trigger `nullOnDelete`). The contact is still loadable via `withTrashed()`. The will edit view displays archived contacts with an "Archived" badge. The `estate:detect-will-changes` command fires a `WillNeedsReview` alert (see C-02).

- **FR2.4**: If a contact is hard-deleted, `nullOnDelete` sets the FK to null. The denormalized `*_name` columns and the `data_snapshot` preserve the contact's details, so historical wills remain intact. Draft wills with null contact FKs show a "Contact removed -- please select a replacement" warning.

- **FR2.5**: `<ContactRolePicker>` component: searchable contact selector with role assignment dropdown. Filters out contacts who would create conflicts (e.g., a beneficiary cannot be a witness per the Witness Beneficiary Rule). "Add new contact" inline creates a contact via the existing 006-CCM API and assigns the role in one flow.

### FR3: Will Versioning & History

- **FR3.1**: Will model status lifecycle: `draft` -> `generated` (Generate PDF) -> `signed` (Upload Signed Copy). Side transitions: `generated` -> `draft` (Revert to Draft -- deletes generated PDF, see C-15), `draft|generated|signed` -> `superseded` (new version created), `draft|generated|signed` -> `revoked` (explicit Revoke action). Terminal states: `superseded`, `revoked`.

- **FR3.2**: Creating a new will when one exists: increments the version number and sets the previous will's status to `superseded` with `superseded_at` timestamp. Previous wills are never deleted -- they remain viewable with their `data_snapshot` (see C-03).

- **FR3.3**: Will history page shows all versions with: version number, status, created date, generated date, signed date. Click to view any historical version's data snapshot.

- **FR3.4**: Revocation flow: explicit "Revoke Will" action with required reason. Sets status to `revoked` with `revoked_at` and `revocation_reason`. Revoked wills cannot be un-revoked (create a new will instead). Only workspace `owner` role can revoke.

- **FR3.5**: Data snapshot: at generation time, the full wizard payload (testator details, executor names/addresses, beneficiary names/addresses with allocations, asset descriptions with current values, trust details, funeral wishes) is frozen into `data_snapshot` JSON on the Will model. This ensures historical versions are viewable even if contacts or assets change later.

### FR4: Power of Attorney Builder

- **FR4.1**: PowerOfAttorney model stored in `estate_powers_of_attorney` table. Fields: uuid, workspace_id, poa_type (enum: general_financial, enduring_financial, enduring_medical, enduring_guardianship), grantor_name, grantor_address, grantor_state, status (enum: draft, active, revoked), attorney_contact_id, alternate_attorney_contact_id (nullable), conditions (text, nullable), signing_document_id (FK to 059-DGS, nullable -- application-layer FK only, no DB constraint), file_path, signed_at, revoked_at, created_by, created_at, updated_at.

- **FR4.2**: State-specific POA types displayed based on grantor_state. NSW: Enduring POA + Enduring Guardianship (separate documents). VIC: Enduring POA (can combine financial + medical). QLD: Enduring POA (single form covers both financial + personal/health). SA: Enduring POA + Advance Care Directive (separate). WA: Enduring POA + Enduring Power of Guardianship (separate). TAS: Enduring POA + Enduring Guardian (separate). ACT: Enduring POA + Health Direction (separate). NT: General/Enduring POA + Advance Personal Plan (separate). All 8 states supported in v1 (see C-07).

- **FR4.3**: POA creation wizard (simplified 4-step flow): (1) type selection (filtered by grantor's state), (2) grantor details (auto-filled from user profile), (3) attorney appointment (primary + alternate from contacts), (4) review & generate.

- **FR4.4**: POA PDF generated via DomPDF Blade template at `resources/views/estate/poa-pdf.blade.php`. State-specific template sections based on grantor_state. Signing instructions included.

- **FR4.5**: POA signing via 059-DGS. On completion, status transitions from `draft` to `active`, `signed_at` set. Signed documents stored in 056-FEX "Estate Planning" folder (see C-09).

- **FR4.6**: POA revocation: explicit action with `revoked_at` timestamp. Only `owner` role can revoke.

### FR5: BDBN Management (Binding Death Benefit Nominations)

- **FR5.1**: Gated by entity type -- only available on workspaces where `entity_type` is `smsf`. Feature check in middleware and frontend navigation. Returns 403 on non-SMSF workspaces.

- **FR5.2**: Bdbn model stored in `estate_bdbns` table. Fields: uuid, workspace_id, member_contact_id, member_name (denormalized), status (enum: draft, active, expired, superseded, revoked), nomination_type (enum: binding_lapsing, binding_non_lapsing, non_binding, reversionary), signed_at, expires_at (null for non-lapsing and non-binding), superseded_at, signing_document_id (FK to 059-DGS, nullable -- application-layer FK, no DB constraint), file_path, revoked_at, created_by, created_at, updated_at.

- **FR5.3**: BdbnNominee model. Fields: bdbn_id, nominee_contact_id, nominee_name (denormalized -- see C-02), percentage (integer, basis points -- 10000 = 100%), relationship (enum: spouse, child, financial_dependant, legal_personal_representative).

- **FR5.4**: Nominee percentages must total 10000 (100%). Validation enforced in the `StoreBdbn` action and client-side via Zod.

- **FR5.5**: Expiry tracking: scheduled command `estate:check-bdbn-expiry` runs daily and checks for BDBNs expiring within 90, 30, and 7 days. Notifications sent via existing 024-NTF infrastructure. Only lapsing BDBNs have expiry dates (3 years from signed_at). A separate `estate:expire-bdbns` command marks BDBNs past `expires_at` as `expired` (see C-04).

- **FR5.6**: Renewal flow: "Renew" button on expired or expiring BDBN creates a new BDBN pre-populated from the previous one. Old BDBN status set to `superseded` if currently `active` (replaced by choice), or remains `expired` if already expired. New BDBN starts as `draft` and must go through 059-DGS signing flow.

- **FR5.7**: BDBN PDF generation via DomPDF Blade template at `resources/views/estate/bdbn-pdf.blade.php`. Template includes: fund name, member details, nominee details with percentages, nomination type, signing blocks for member and two witnesses.

- **FR5.8**: BDBN signing completion listener. When a `SigningDocument` linked to a BDBN reaches `completed` status (all signatories signed), a `BdbnSigningCompletedListener` transitions the BDBN: status -> `active`, `signed_at` -> now, `expires_at` -> `signed_at` + 3 years (for `binding_lapsing` type only; null for `binding_non_lapsing`, `non_binding`, and `reversionary`) (see C-09).

- **FR5.9**: Witness-nominee exclusion validation. When sending a BDBN for signing via 059-DGS, the `SendBdbnForSigning` action validates that the two witness signatories are not contacts listed as nominees on the BDBN. This is a hard legal requirement under SIS Regulation 6.17A. Returns 422 if overlap exists.

### FR6: Advance Health Directive

- **FR6.1**: HealthDirective model stored in `estate_health_directives` table. Fields: uuid, workspace_id, directive_state (Australian state -- determines naming and legal requirements), status (enum: draft, active, revoked), principal_name, principal_address, treatment_preferences (JSON -- structured preferences for life-sustaining treatment, pain management, artificial nutrition/hydration, organ donation), appointed_decision_maker_contact_id (nullable FK), decision_maker_name (denormalized), alternate_decision_maker_contact_id (nullable FK), alternate_decision_maker_name (denormalized), additional_instructions (text, nullable), signing_document_id (FK to 059-DGS, nullable -- application-layer FK), file_path, signed_at, revoked_at, created_by, created_at, updated_at.

- **FR6.2**: State-specific naming: QLD = "Advance Health Directive", SA/VIC = "Advance Care Directive", NT = "Advance Personal Plan", NSW = "Advance Care Directive", WA = "Advance Health Directive", TAS = "Advance Care Directive", ACT = "Health Direction". The UI displays the state-appropriate name based on `directive_state`.

- **FR6.3**: Directive creation wizard (3-step flow): (1) principal details (auto-filled) + state selection, (2) treatment preferences (structured form: life-sustaining treatment yes/no/conditional, pain management preferences, artificial nutrition/hydration preferences, organ donation preferences, resuscitation preferences), (3) decision maker appointment (optional -- from contacts) + review & generate.

- **FR6.4**: Treatment preferences stored as structured JSON:
  ```json
  {
    "life_sustaining_treatment": "conditional",
    "life_sustaining_conditions": "Only if recovery is expected",
    "pain_management": "maximum_comfort",
    "artificial_nutrition": "no",
    "organ_donation": "yes",
    "resuscitation": "no",
    "additional_preferences": "Free text..."
  }
  ```

- **FR6.5**: Health directive PDF generated via DomPDF Blade template at `resources/views/estate/health-directive-pdf.blade.php`. Includes state-specific naming, principal details, treatment preferences in plain language, decision maker details, and witnessing instructions.

- **FR6.6**: Signing via 059-DGS. Status transitions from `draft` to `active` on completion. Stored in 056-FEX "Estate Planning" folder (see C-09).

- **FR6.7**: Revocation: explicit action with `revoked_at` timestamp. Only `owner` role can revoke.

- **FR6.8**: Review reminders: the `estate:detect-will-changes` scheduled command also checks health directives older than 24 months and fires a review notification.

### FR7: Estate Dashboard (Status Overview & Alerts)

- **FR7.1**: Estate dashboard at `/w/{slug}/estate` showing four panels: Will Status, BDBN Status (SMSF only), POA Status, Health Directive Status.

- **FR7.2**: Each panel shows: document status badge, last updated date, version number (wills), expiry date (BDBNs), linked contacts (executors, nominees, attorneys, decision makers).

- **FR7.3**: "Needs Updating" alerts panel. Triggered by: new asset added/removed (PersonalAsset, Asset created/deleted), significant value change (>20% of total tracked asset value), beneficiary or executor contact archived/deleted, new workspace created in the same WorkspaceGroup, more than 12 months since last will generation, BDBN expiring within 90 days, health directive older than 24 months. Alerts are deduplicated: one per trigger type per 30-day window (see C-13).

- **FR7.4**: Asset summary section showing current ledger totals: personal assets, fixed assets, bank account balances, debts. Net estate value calculation (assets minus debts).

- **FR7.5**: Family group integration (if workspace is in a WorkspaceGroup): estate plan coverage matrix showing each entity and whether it has a will (personal), BDBN (SMSF), trust deed succession plan (trust), or shareholder agreement (company). Uses `WorkspaceGroup::getAllWorkspaceIds()` to query group members (see C-17).

- **FR7.6**: "Create Will" primary CTA if no will exists. "Review Estate Plan" CTA if any alerts are active.

### FR8: Practice Integration (Advisor Review, Signing, Tasks)

- **FR8.1**: Estate health overview at `/practice/estate` showing all connected client workspaces with estate planning status. Practice advisors have read-only access to client estate documents by default; explicit edit permission on the practice-workspace connection enables edit access (see C-08).

- **FR8.2**: Columns: workspace name, entity type, will status (none/draft/signed/stale), BDBN status (N/A/active/expiring/expired), POA status (none/active), health directive status (none/active), last updated, alerts count.

- **FR8.3**: StatusTabs: All, Needs Attention (missing will OR expired BDBN OR stale will), Up to Date, No Estate Plan. Counts from a dedicated `/counts` endpoint.

- **FR8.4**: "Needs Attention" count badge in practice sidebar navigation.

- **FR8.5**: Click workspace row to view that workspace's estate dashboard (advisor has read access via practice connection).

- **FR8.6**: Bulk action: "Create Review Task" for selected workspaces -- creates a `PracticeTask` per workspace for estate planning review.

- **FR8.7**: Advisor can send BDBNs and POAs for signing on behalf of the client workspace via 059-DGS, using the practice's signing document infrastructure (see C-09).

### FR9: Asset-to-Bequest Linking (Pull from Ledger)

- **FR9.1**: The `<AssetPicker>` component in Step 5 of the will wizard queries three sources: `PersonalAsset` (030-PLG), `Asset` (033-FAR fixed asset register), and `BankAccount` (017-BAS). Results displayed in a unified searchable list grouped by source.

- **FR9.2**: Each asset shows: name, category, current value (formatted via `formatMoney()`), source indicator (Personal / Fixed Asset / Bank Account).

- **FR9.3**: Bequest links are polymorphic: `bequestable_type` (morph map aliases: `personal_asset`, `asset`, `bank_account`) + `bequestable_id`. These three morph aliases already exist in the `Relation::morphMap()` in AppServiceProvider -- no new entries needed.

- **FR9.4**: If a linked asset is sold/deleted after the bequest is created, the bequest is flagged as "needs review" with a warning badge in the UI. The bequest is NOT auto-removed -- the user must explicitly update or remove it. The will cannot transition from `draft` to `generated` if any bequest references a non-existent asset (see C-05).

- **FR9.5**: Non-ledger items supported via free text `description` field (for assets not tracked in the platform, e.g., jewellery, art, personal effects).

### FR10: PDF Generation (HTML-to-PDF, Templates, Draft Watermark)

- **FR10.1**: All estate PDFs generated server-side via DomPDF, matching the existing `ExportReportPdf` action pattern: Blade template rendered to HTML, passed to `Barryvdh\DomPDF\Facade\Pdf::loadHTML()`. Blade templates:
  - `resources/views/estate/will-pdf.blade.php`
  - `resources/views/estate/bdbn-pdf.blade.php`
  - `resources/views/estate/poa-pdf.blade.php`
  - `resources/views/estate/health-directive-pdf.blade.php`

- **FR10.2**: Will template structure: Identification & Revocation clause, Executor appointment, Guardian appointment (if applicable), Specific bequests with asset descriptions and values, Pecuniary legacies, Residuary estate distribution with percentages, Testamentary trust provisions (if applicable), Executor powers, Funeral wishes (if provided), Attestation clause with state-specific witnessing instructions.

- **FR10.3**: Merge fields populated from `data_snapshot` JSON (not live model data) to ensure historical consistency: testator name/address/DOB, executor names/addresses, guardian names, beneficiary names with allocations, asset descriptions with values at generation time, trust details (see C-06).

- **FR10.4**: State-specific content: witnessing instruction block varies by state (see research document Section 1.4). VIC includes remote witnessing option note. SA includes instruction about using the same pen. All states include the two-witness simultaneous presence requirement.

- **FR10.5**: Legal disclaimer page appended to every generated PDF: "Not Legal Advice", "No Lawyer-Client Relationship", "Professional Review Recommended", "State-Specific Requirements", "Will Only Covers Personal Assets" (see C-18).

- **FR10.6**: Draft watermark: PDFs generated from wills in `draft` status display a diagonal "DRAFT -- NOT FOR EXECUTION" watermark across each page. The watermark is removed when the will transitions to `generated` status (i.e., the formal generation action).

- **FR10.7**: Generated PDFs stored at `estate-documents/{workspace_id}/{type}-{uuid}.pdf` on the configured filesystem disk. Signed copies (uploaded scans) stored at `estate-documents/{workspace_id}/{type}-{uuid}-signed.pdf`. A `File` model record (056-FEX) is created for each PDF in an auto-provisioned "Estate Planning" `FileFolder` per workspace, making estate documents discoverable in the workspace file explorer (see C-10).

---

## Data Model

### estate_wills (tenant-scoped)

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| uuid | char(36) UNIQUE | Public identifier |
| workspace_id | bigint FK cascadeOnDelete | |
| will_type | varchar(30) | `simple`, `testamentary_trust` |
| version | integer default 1 | Increments on new will |
| testator_name | varchar(255) | Full legal name |
| testator_dob | date nullable | |
| testator_address | text nullable | Full address |
| testator_state | varchar(3) | AU state code (NSW, VIC, QLD, SA, WA, TAS, ACT, NT) |
| marital_status | varchar(20) nullable | single, married, de_facto, divorced, widowed |
| has_minor_children | boolean default false | |
| status | varchar(20) | draft, generated, signed, superseded, revoked |
| current_step | integer nullable | Wizard progress (1-10) for resume |
| data_snapshot | json nullable | Full wizard payload frozen at generation |
| generated_file_path | varchar(500) nullable | Path to generated PDF |
| signed_file_path | varchar(500) nullable | Path to uploaded signed copy |
| revocation_reason | text nullable | |
| created_by | bigint FK (users) nullOnDelete | |
| generated_at | timestamp nullable | |
| signed_at | timestamp nullable | |
| superseded_at | timestamp nullable | |
| revoked_at | timestamp nullable | |
| created_at | timestamp | |
| updated_at | timestamp | |

Indexes: `[workspace_id, status]`, `[workspace_id, version]`

#### will_bequests (child of estate_wills)

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| will_id | bigint FK cascadeOnDelete | |
| beneficiary_contact_id | bigint FK nullOnDelete | |
| beneficiary_name | varchar(255) nullable | Denormalized for data_snapshot survival |
| bequestable_type | varchar(50) nullable | Morph type: personal_asset, asset, bank_account |
| bequestable_id | bigint nullable | |
| bequest_type | varchar(30) | specific_asset, pecuniary_legacy, non_ledger_item, charitable_bequest |
| description | text nullable | For non-ledger items |
| amount_cents | bigint nullable | For pecuniary legacies |
| conditions | text nullable | |
| sort_order | integer default 0 | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### will_executors (child of estate_wills)

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| will_id | bigint FK cascadeOnDelete | |
| contact_id | bigint FK nullOnDelete | |
| contact_name | varchar(255) nullable | Denormalized |
| role | varchar(20) | primary, alternate |
| sort_order | integer default 0 | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### will_guardians (child of estate_wills)

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| will_id | bigint FK cascadeOnDelete | |
| contact_id | bigint FK nullOnDelete | |
| contact_name | varchar(255) nullable | Denormalized |
| role | varchar(20) | primary, alternate |
| guardian_type | varchar(10) | child, pet |
| pet_fund_cents | bigint nullable | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### will_trusts (child of estate_wills)

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| will_id | bigint FK cascadeOnDelete | |
| name | varchar(255) | Trust name |
| trustee_contact_id | bigint FK nullOnDelete | |
| beneficiary_contact_ids | json | Array of contact IDs |
| vesting_age | integer default 25 | |
| distribution_rules | json | { type, conditions } |
| sort_order | integer default 0 | |
| created_at | timestamp | |
| updated_at | timestamp | |

#### will_residuaries (child of estate_wills)

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| will_id | bigint FK cascadeOnDelete | |
| beneficiary_contact_id | bigint FK nullOnDelete | |
| beneficiary_name | varchar(255) nullable | Denormalized |
| percentage | integer | Basis points (10000 = 100%) |
| is_contingency | boolean default false | |
| contingency_of_contact_id | bigint FK nullable nullOnDelete | Whose contingency |
| created_at | timestamp | |
| updated_at | timestamp | |

### estate_bequests

Note: Bequests are stored in the `will_bequests` child table above. They are tightly coupled to wills via the `will_id` FK. The `estate_bequests` logical grouping is satisfied by `will_bequests` -- there is no standalone bequest table.

### estate_powers_of_attorney (tenant-scoped)

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| uuid | char(36) UNIQUE | |
| workspace_id | bigint FK cascadeOnDelete | |
| poa_type | varchar(30) | general_financial, enduring_financial, enduring_medical, enduring_guardianship |
| grantor_name | varchar(255) | |
| grantor_address | text nullable | |
| grantor_state | varchar(3) | AU state code |
| attorney_contact_id | bigint FK nullOnDelete | |
| attorney_name | varchar(255) nullable | Denormalized |
| alternate_attorney_contact_id | bigint FK nullable nullOnDelete | |
| alternate_attorney_name | varchar(255) nullable | Denormalized |
| conditions | text nullable | Limitations or conditions |
| status | varchar(20) | draft, active, revoked |
| signing_document_id | bigint nullable | Links to 059-DGS (Central model -- no DB-level FK constraint) |
| file_path | varchar(500) nullable | |
| signed_at | timestamp nullable | |
| revoked_at | timestamp nullable | |
| created_by | bigint FK (users) nullOnDelete | |
| created_at | timestamp | |
| updated_at | timestamp | |

Indexes: `[workspace_id, status]`, `[workspace_id, poa_type]`

### estate_bdbns (tenant-scoped, SMSF only)

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| uuid | char(36) UNIQUE | |
| workspace_id | bigint FK cascadeOnDelete | |
| member_contact_id | bigint FK nullOnDelete | SMSF member |
| member_name | varchar(255) nullable | Denormalized |
| nomination_type | varchar(30) | binding_lapsing, binding_non_lapsing, non_binding, reversionary |
| status | varchar(20) | draft, active, expired, superseded, revoked |
| signing_document_id | bigint nullable | Links to 059-DGS (Central model -- no DB-level FK constraint) |
| file_path | varchar(500) nullable | |
| signed_at | timestamp nullable | |
| expires_at | timestamp nullable | 3 years from signed_at for lapsing |
| superseded_at | timestamp nullable | Set when renewed while still active |
| revoked_at | timestamp nullable | |
| created_by | bigint FK (users) nullOnDelete | |
| created_at | timestamp | |
| updated_at | timestamp | |

Indexes: `[workspace_id, status]`, `[expires_at]` (for scheduled expiry check)

#### bdbn_nominees (child of estate_bdbns)

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| bdbn_id | bigint FK cascadeOnDelete | |
| nominee_contact_id | bigint FK nullOnDelete | |
| nominee_name | varchar(255) nullable | Denormalized |
| percentage | integer | Basis points (10000 = 100%) |
| relationship | varchar(40) | spouse, child, financial_dependant, legal_personal_representative |
| created_at | timestamp | |
| updated_at | timestamp | |

### estate_health_directives (tenant-scoped)

| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | |
| uuid | char(36) UNIQUE | |
| workspace_id | bigint FK cascadeOnDelete | |
| directive_state | varchar(3) | AU state code (determines naming) |
| principal_name | varchar(255) | |
| principal_address | text nullable | |
| status | varchar(20) | draft, active, revoked |
| treatment_preferences | json | Structured preferences (see FR6.4) |
| appointed_decision_maker_contact_id | bigint FK nullable nullOnDelete | |
| decision_maker_name | varchar(255) nullable | Denormalized |
| alternate_decision_maker_contact_id | bigint FK nullable nullOnDelete | |
| alternate_decision_maker_name | varchar(255) nullable | Denormalized |
| additional_instructions | text nullable | |
| signing_document_id | bigint nullable | Links to 059-DGS (Central model -- no DB-level FK constraint) |
| file_path | varchar(500) nullable | |
| signed_at | timestamp nullable | |
| revoked_at | timestamp nullable | |
| created_by | bigint FK (users) nullOnDelete | |
| created_at | timestamp | |
| updated_at | timestamp | |

Indexes: `[workspace_id, status]`

---

## Enums

### WillStatus

```php
enum WillStatus: string
{
    case Draft = 'draft';
    case Generated = 'generated';
    case Signed = 'signed';
    case Superseded = 'superseded';
    case Revoked = 'revoked';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Generated => 'Generated',
            self::Signed => 'Signed',
            self::Superseded => 'Superseded',
            self::Revoked => 'Revoked',
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return match ($this) {
            self::Draft => in_array($target, [self::Generated, self::Superseded, self::Revoked]),
            self::Generated => in_array($target, [self::Draft, self::Signed, self::Superseded, self::Revoked]),
            self::Signed => in_array($target, [self::Superseded, self::Revoked]),
            self::Superseded => false,
            self::Revoked => false,
        };
    }
}
```

### BequestType

```php
enum BequestType: string
{
    case SpecificAsset = 'specific_asset';
    case PecuniaryLegacy = 'pecuniary_legacy';
    case NonLedgerItem = 'non_ledger_item';
    case CharitableBequest = 'charitable_bequest';

    public function label(): string
    {
        return match ($this) {
            self::SpecificAsset => 'Specific Asset',
            self::PecuniaryLegacy => 'Pecuniary Legacy',
            self::NonLedgerItem => 'Non-Ledger Item',
            self::CharitableBequest => 'Charitable Bequest',
        };
    }
}
```

### RelationshipType

```php
enum RelationshipType: string
{
    case Spouse = 'spouse';
    case Child = 'child';
    case FinancialDependant = 'financial_dependant';
    case LegalPersonalRepresentative = 'legal_personal_representative';
    case Parent = 'parent';
    case Sibling = 'sibling';
    case Grandchild = 'grandchild';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Spouse => 'Spouse',
            self::Child => 'Child',
            self::FinancialDependant => 'Financial Dependant',
            self::LegalPersonalRepresentative => 'Legal Personal Representative',
            self::Parent => 'Parent',
            self::Sibling => 'Sibling',
            self::Grandchild => 'Grandchild',
            self::Other => 'Other',
        };
    }
}
```

### PoaType

```php
enum PoaType: string
{
    case GeneralFinancial = 'general_financial';
    case EnduringFinancial = 'enduring_financial';
    case EnduringMedical = 'enduring_medical';
    case EnduringGuardianship = 'enduring_guardianship';

    public function label(): string
    {
        return match ($this) {
            self::GeneralFinancial => 'General Power of Attorney (Financial)',
            self::EnduringFinancial => 'Enduring Power of Attorney (Financial)',
            self::EnduringMedical => 'Enduring Power of Attorney (Medical)',
            self::EnduringGuardianship => 'Enduring Guardianship',
        };
    }
}
```

### PoaStatus

```php
enum PoaStatus: string
{
    case Draft = 'draft';
    case Active = 'active';
    case Revoked = 'revoked';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Active => 'Active',
            self::Revoked => 'Revoked',
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return match ($this) {
            self::Draft => in_array($target, [self::Active, self::Revoked]),
            self::Active => in_array($target, [self::Revoked]),
            self::Revoked => false,
        };
    }
}
```

### BdbnType

```php
enum BdbnType: string
{
    case BindingLapsing = 'binding_lapsing';
    case BindingNonLapsing = 'binding_non_lapsing';
    case NonBinding = 'non_binding';
    case Reversionary = 'reversionary';

    public function label(): string
    {
        return match ($this) {
            self::BindingLapsing => 'Binding (Lapsing)',
            self::BindingNonLapsing => 'Binding (Non-Lapsing)',
            self::NonBinding => 'Non-Binding',
            self::Reversionary => 'Reversionary Pension',
        };
    }

    public function hasExpiry(): bool
    {
        return $this === self::BindingLapsing;
    }
}
```

### BdbnStatus

```php
enum BdbnStatus: string
{
    case Draft = 'draft';
    case Active = 'active';
    case Expired = 'expired';
    case Superseded = 'superseded';
    case Revoked = 'revoked';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Active => 'Active',
            self::Expired => 'Expired',
            self::Superseded => 'Superseded',
            self::Revoked => 'Revoked',
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return match ($this) {
            self::Draft => in_array($target, [self::Active, self::Revoked]),
            self::Active => in_array($target, [self::Expired, self::Superseded, self::Revoked]),
            self::Expired => false,
            self::Superseded => false,
            self::Revoked => false,
        };
    }
}
```

### HealthDirectiveStatus

```php
enum HealthDirectiveStatus: string
{
    case Draft = 'draft';
    case Active = 'active';
    case Revoked = 'revoked';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Active => 'Active',
            self::Revoked => 'Revoked',
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return match ($this) {
            self::Draft => in_array($target, [self::Active, self::Revoked]),
            self::Active => in_array($target, [self::Revoked]),
            self::Revoked => false,
        };
    }
}
```

### AustralianState

```php
enum AustralianState: string
{
    case NSW = 'NSW';
    case VIC = 'VIC';
    case QLD = 'QLD';
    case SA = 'SA';
    case WA = 'WA';
    case TAS = 'TAS';
    case ACT = 'ACT';
    case NT = 'NT';

    public function label(): string
    {
        return match ($this) {
            self::NSW => 'New South Wales',
            self::VIC => 'Victoria',
            self::QLD => 'Queensland',
            self::SA => 'South Australia',
            self::WA => 'Western Australia',
            self::TAS => 'Tasmania',
            self::ACT => 'Australian Capital Territory',
            self::NT => 'Northern Territory',
        };
    }

    public function willWitnessingInstructions(): string
    {
        return match ($this) {
            self::NSW => 'Two adult witnesses must be present simultaneously. Both witnesses sign in the will-maker\'s presence.',
            self::VIC => 'Two adult witnesses must be present simultaneously. Victoria supports remote execution via audio-visual link.',
            self::QLD => 'Two adult witnesses must be present at the same time. Witnesses cannot be beneficiaries.',
            self::SA => 'Two adult witnesses must be present simultaneously. Must use the same pen as the testator. Sign under the testator\'s signature.',
            self::WA => 'Two adult witnesses must be present simultaneously.',
            self::TAS => 'Two adult witnesses must be present simultaneously.',
            self::ACT => 'Two adult witnesses must be present simultaneously.',
            self::NT => 'Two adult witnesses must be present simultaneously.',
        };
    }

    public function poaFormName(): string
    {
        return match ($this) {
            self::NSW => 'Enduring Power of Attorney',
            self::VIC => 'Enduring Power of Attorney',
            self::QLD => 'Enduring Power of Attorney',
            self::SA => 'Enduring Power of Attorney',
            self::WA => 'Enduring Power of Attorney',
            self::TAS => 'Enduring Power of Attorney',
            self::ACT => 'Enduring Power of Attorney',
            self::NT => 'General/Enduring Power of Attorney',
        };
    }

    public function healthDirectiveName(): string
    {
        return match ($this) {
            self::NSW => 'Advance Care Directive',
            self::VIC => 'Advance Care Directive',
            self::QLD => 'Advance Health Directive',
            self::SA => 'Advance Care Directive',
            self::WA => 'Advance Health Directive',
            self::TAS => 'Advance Care Directive',
            self::ACT => 'Health Direction',
            self::NT => 'Advance Personal Plan',
        };
    }
}
```

All enums follow the existing project pattern: backed string enum with `label()` method and `canTransitionTo()` where applicable (see `SigningDocumentStatus`, `InvoiceStatus`, `LoanStatus` for reference).

---

## API Endpoints

### Will Endpoints (workspace-scoped, ~10)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/estate/wills` | List wills for current workspace |
| POST | `/api/v1/estate/wills` | Create will (draft) |
| GET | `/api/v1/estate/wills/{uuid}` | Will detail with all relationships |
| PATCH | `/api/v1/estate/wills/{uuid}` | Update draft will (auto-save per wizard step) |
| POST | `/api/v1/estate/wills/{uuid}/generate` | Generate PDF from will data |
| POST | `/api/v1/estate/wills/{uuid}/sign` | Record signed copy upload |
| POST | `/api/v1/estate/wills/{uuid}/revoke` | Revoke will with reason |
| POST | `/api/v1/estate/wills/{uuid}/revert-to-draft` | Revert generated will to draft (deletes PDF) |
| GET | `/api/v1/estate/wills/{uuid}/pdf` | Download generated PDF |
| GET | `/api/v1/estate/wills/{uuid}/history` | Version history |

### Estate Dashboard Endpoints (~4)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/estate/dashboard` | Estate overview (will, BDBN, POA, health directive status) |
| GET | `/api/v1/estate/alerts` | Active "needs updating" alerts |
| POST | `/api/v1/estate/alerts/{id}/dismiss` | Dismiss/snooze an alert |
| GET | `/api/v1/estate/assets-summary` | Asset/debt totals from ledger |

### BDBN Endpoints (SMSF workspaces only, ~7)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/estate/bdbns` | List BDBNs |
| POST | `/api/v1/estate/bdbns` | Create BDBN |
| GET | `/api/v1/estate/bdbns/{uuid}` | BDBN detail with nominees |
| PATCH | `/api/v1/estate/bdbns/{uuid}` | Update draft BDBN |
| POST | `/api/v1/estate/bdbns/{uuid}/send-for-signing` | Send to 059-DGS |
| POST | `/api/v1/estate/bdbns/{uuid}/revoke` | Revoke BDBN |
| POST | `/api/v1/estate/bdbns/{uuid}/renew` | Create new BDBN from existing |

### POA Endpoints (~7)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/estate/poa` | List POAs |
| POST | `/api/v1/estate/poa` | Create POA |
| GET | `/api/v1/estate/poa/{uuid}` | POA detail |
| PATCH | `/api/v1/estate/poa/{uuid}` | Update draft POA |
| POST | `/api/v1/estate/poa/{uuid}/generate` | Generate POA PDF |
| POST | `/api/v1/estate/poa/{uuid}/send-for-signing` | Send to 059-DGS |
| POST | `/api/v1/estate/poa/{uuid}/revoke` | Revoke POA |

### Health Directive Endpoints (~7)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/estate/health-directives` | List health directives |
| POST | `/api/v1/estate/health-directives` | Create health directive |
| GET | `/api/v1/estate/health-directives/{uuid}` | Health directive detail |
| PATCH | `/api/v1/estate/health-directives/{uuid}` | Update draft health directive |
| POST | `/api/v1/estate/health-directives/{uuid}/generate` | Generate PDF |
| POST | `/api/v1/estate/health-directives/{uuid}/send-for-signing` | Send to 059-DGS |
| POST | `/api/v1/estate/health-directives/{uuid}/revoke` | Revoke health directive |

### Practice Endpoints (~3)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/practice/estate` | Estate health across all client workspaces |
| GET | `/api/v1/practice/estate/counts` | StatusTab counts (needs attention, up to date, etc.) |
| GET | `/api/v1/practice/estate/{workspaceId}` | Specific client's estate summary |

### Asset Picker Endpoint (~1)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/estate/assets` | Unified asset list (PersonalAsset + Asset + BankAccount) for bequest linking |

**Total: ~39 endpoints**

---

## UI/UX Requirements

### Workspace Pages

- **`/w/{slug}/estate`** -- Estate dashboard. Four status panels (Will, BDBN, POA, Health Directive) + alerts panel + asset summary. "Create Will" primary CTA if no will exists. Navigation shortcut: `G then W` (`G then E` is assigned to Files). BDBN panel hidden on non-SMSF workspaces.

- **`/w/{slug}/estate/will/new`** -- Will builder wizard. 10-step flow with progress indicator. Save as draft at any step. Resume from last incomplete step (uses `current_step` field).

- **`/w/{slug}/estate/will/{uuid}`** -- Will detail. Split view: PDF preview (left, using DocumentSplitView) + will summary and version history (right). Actions: Edit (if draft), Generate PDF, Upload Signed Copy, Revoke, Revert to Draft (if generated).

- **`/w/{slug}/estate/bdbn`** -- BDBN list. Only shown for SMSF workspaces. StatusTabs: All, Active, Expiring Soon, Expired. "New BDBN" button.

- **`/w/{slug}/estate/bdbn/new`** -- BDBN creation form. Member selection, nominee(s) with percentages (must total 100%), nomination type.

- **`/w/{slug}/estate/bdbn/{uuid}`** -- BDBN detail. Nominee breakdown, signing status, expiry date, renewal button.

- **`/w/{slug}/estate/poa`** -- POA list. StatusTabs: All, Active, Draft. "New POA" button.

- **`/w/{slug}/estate/poa/new`** -- POA creation wizard (4 steps).

- **`/w/{slug}/estate/health-directive`** -- Health directive list. StatusTabs: All, Active, Draft. "New Directive" button.

- **`/w/{slug}/estate/health-directive/new`** -- Health directive creation wizard (3 steps).

### Practice Pages

- **`/practice/estate`** -- Practice estate health dashboard. DataTable of client workspaces with estate status columns. StatusTabs: All, Needs Attention, Up to Date, No Estate Plan. Search by workspace name. Bulk "Create Review Task" action.

### Navigation

- Add "Estate Planning" to `primaryNav` in `frontend/src/lib/navigation.ts` with `ScrollText` icon, shortcut `G then W`, and `featureKey: 'estate_planning'`.
- Add `w: '/estate'` to `chordShortcuts` map.
- Sub-items: Will, BDBN (gated to SMSF), POA, Health Directive.

### Shared Components

- `<WillWizard>` -- Multi-step form (React Hook Form + Zod), single form instance at wizard parent, auto-save per step
- `<EstateDashboard>` -- Four-panel status overview with alerts
- `<BdbnForm>` -- BDBN creation/edit form with nominee percentage validation
- `<PoaWizard>` -- 4-step POA creation flow
- `<HealthDirectiveWizard>` -- 3-step directive creation flow
- `<EstateAlerts>` -- "Needs updating" alert list with dismiss/snooze
- `<AssetPicker>` -- Searchable asset selector (PersonalAsset + Asset + BankAccount) for bequests
- `<ContactRolePicker>` -- Contact selector with role assignment (beneficiary, executor, guardian, trustee, attorney, decision maker)
- `<BeneficiaryDistribution>` -- Pie chart showing residuary estate allocation percentages
- `<WillVersionTimeline>` -- Vertical timeline of will versions with status badges

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `G then W` | Go to Estate Dashboard |
| `N` | New will/BDBN/POA (context-dependent on active tab) |

---

## Acceptance Criteria

### US-01: Will Builder Wizard
- [ ] All 10 steps render and navigate correctly (next/back/jump to step)
- [ ] Form state persists across steps (single React Hook Form instance)
- [ ] Draft save works at any step; resume loads correct step via `current_step`
- [ ] Zod validation per step prevents advancing with invalid data
- [ ] Testamentary trust step only shown when will_type is testamentary_trust
- [ ] Guardian step only shown when has_minor_children is true

### US-02: Asset Auto-Population
- [ ] Step 5 (Specific Bequests) shows PersonalAssets, Assets, and BankAccounts from the workspace
- [ ] Asset values reflect current ledger values
- [ ] User can add non-ledger items via free text description
- [ ] Pecuniary legacies accept amounts in cents

### US-03: Contact Integration
- [ ] Executors, guardians, and beneficiaries are selectable from workspace contacts
- [ ] "Add new contact" inline creates a contact and assigns the role
- [ ] Warning displayed if a beneficiary is also named as an executor (informational, not blocking)

### US-04: Change Detection Alerts
- [ ] Alert fires when a PersonalAsset or Asset is created or deleted after will generation
- [ ] Alert fires when total asset value changes by >20% since will generation
- [ ] Alert fires when an executor or beneficiary contact is archived
- [ ] Alert fires when >12 months pass since last will generation
- [ ] Alerts deduplicated: one per trigger type per 30-day window

### US-05: POA Creation
- [ ] POA wizard shows state-specific POA types based on grantor's state
- [ ] 4-step flow completes with PDF generation
- [ ] Signing via 059-DGS transitions status to active

### US-07: Estate Dashboard
- [ ] Dashboard shows will, BDBN, POA, and health directive status panels
- [ ] "Needs Updating" alerts panel shows active alerts
- [ ] Asset summary shows current totals from ledger
- [ ] BDBN panel hidden on non-SMSF workspaces

### US-08: BDBN Management
- [ ] BDBN menu item only visible on SMSF workspaces
- [ ] Nominee percentages must total 100% (10000 basis points)
- [ ] Expiry date auto-calculated (3 years from signed_at) for binding_lapsing type
- [ ] Expiry notifications sent at 90, 30, and 7 days before expiry
- [ ] Renewal creates a new BDBN pre-populated from the previous one

### US-13: Advance Health Directive
- [ ] 3-step wizard completes with PDF generation
- [ ] Treatment preferences stored as structured JSON
- [ ] State-specific naming applied throughout the UI and PDF
- [ ] Decision maker appointment optional

### US-14: Practice Estate View
- [ ] Practice estate page lists all connected client workspaces with estate status
- [ ] StatusTabs filter correctly (Needs Attention, Up to Date, No Estate Plan)
- [ ] Counts endpoint returns correct counts per status
- [ ] Click workspace navigates to client's estate dashboard
- [ ] Bulk "Create Review Task" creates PracticeTask per selected workspace

### Document Generation
- [ ] Will PDF generates with correct testator details, executor appointments, bequests, and residuary distribution
- [ ] State-specific witnessing instructions included in PDF based on testator_state
- [ ] Legal disclaimer page appended to every generated PDF
- [ ] Draft watermark displayed on draft will PDFs
- [ ] BDBN PDF generates with member, nominee, and percentage details
- [ ] Generated PDFs stored at correct file paths and accessible via download endpoint
- [ ] File model record created in "Estate Planning" folder per workspace

### Security & Authorization
- [ ] All estate endpoints require workspace membership (SetWorkspaceContext middleware)
- [ ] BDBN endpoints return 403 on non-SMSF workspaces
- [ ] Practice estate endpoints require practice membership
- [ ] Only owner/accountant can create/edit estate documents
- [ ] Only owner can revoke estate documents
- [ ] File paths never exposed in API responses (use proxy endpoint)
- [ ] Will data_snapshot preserves historical state (contact/asset changes don't alter past versions)

---

## Scheduled Commands

| Command | Schedule | Description |
|---------|----------|-------------|
| `estate:check-bdbn-expiry` | Daily 9am AEST | Send expiry warnings for BDBNs at 90/30/7 day thresholds |
| `estate:expire-bdbns` | Daily | Mark BDBNs past `expires_at` as `expired` |
| `estate:detect-will-changes` | Daily | Check for asset/contact changes since last will generation and create alerts; also checks health directives older than 24 months |

---

## Permissions

New permissions added to the workspace permission set via `RolesAndPermissionsSeeder`. Permissions are split per document type for granular access control, consistent with the existing pattern (e.g., `invoice.view` vs `bill.view` vs `payment.view`).

| Permission | Roles | Notes |
|------------|-------|-------|
| `estate.view` | owner, accountant, bookkeeper, approver, auditor, client | Dashboard, all estate docs (read) |
| `will.create` | owner, accountant | Create draft will |
| `will.update` | owner, accountant | Edit draft will |
| `will.generate` | owner, accountant | Generate PDF |
| `will.revoke` | owner | Revoke will (destructive) |
| `bdbn.create` | owner, accountant | Create draft BDBN |
| `bdbn.update` | owner, accountant | Edit draft BDBN |
| `bdbn.revoke` | owner | Revoke BDBN |
| `poa.create` | owner, accountant | Create draft POA |
| `poa.update` | owner, accountant | Edit draft POA |
| `poa.revoke` | owner | Revoke POA |
| `health-directive.create` | owner, accountant | Create health directive |
| `health-directive.update` | owner, accountant | Edit draft health directive |
| `health-directive.revoke` | owner | Revoke health directive |
| `estate.sign` | owner, accountant | Upload signed copies, send for signing |

---

## Notifications

All notifications use the existing `CreateNotification` action and `NotificationType` enum. All new cases use `filterCategory()` -> `'Estate Planning'`.

| Notification Type | Icon | Trigger | Targets |
|-------------------|------|---------|---------|
| `BdbnExpiring90` | clock | BDBN expires in 90 days | Workspace owners + practice advisors |
| `BdbnExpiring30` | clock | BDBN expires in 30 days | Workspace owners + practice advisors |
| `BdbnExpiring7` | clock | BDBN expires in 7 days | Workspace owners + practice advisors |
| `WillNeedsReview` | exclamation-triangle | Asset/contact change detection | Will creator + workspace owners |
| `WillGenerated` | document-check | Will PDF generated | Will creator |
| `WillSigned` | check-circle | Signed copy uploaded | Will creator |
| `EstateGapDetected` | exclamation-triangle | New workspace connected with no estate docs | Practice advisors |

Notification target resolution: `CreateNotification::handle()` accepts a single `userId`. Scheduled commands iterate and create one notification per target user. Workspace owners resolved via `$workspace->users()->wherePivot('role', 'owner')->get()`. Practice advisors resolved via `$workspace->practices()` -> practice member users.

---

## Success Criteria

- **SC-01**: Will creation wizard completable in under 25 minutes with pre-populated data.
- **SC-02**: BDBN expiry alerts sent at correct thresholds with zero missed expirations.
- **SC-03**: Asset change detection fires within 24 hours of a qualifying change.
- **SC-04**: Practice estate dashboard loads estate status for 100+ client workspaces in under 3 seconds.
- **SC-05**: Generated will PDF includes all sections, correct merge data, and state-specific witnessing instructions.
- **SC-06**: Zero cross-workspace data leakage -- workspace A's estate data never visible to workspace B.
- **SC-07**: Will versioning preserves all historical versions with complete data snapshots.

---

## Technical Notes

- **Integration points**: 059-DGS (BDBN/POA/Health Directive signing), 056-FEX (file storage), 006-CCM (contacts as roles), 030-PLG (PersonalAsset, PersonalDebt), 033-FAR (Asset), 017-BAS (BankAccount), 024-NTF (notifications), 027-PMV (practice tasks).
- **Entity type gating**: BDBN endpoints and UI gated by `EntityType::Smsf` on the workspace.
- **PDF generation**: uses same HTML-to-PDF pipeline as report PDFs (`ExportReportPdf` action using DomPDF with Blade template, stored to `storage_path("app/...")`).
- **Morph map**: WillBequest uses existing morph map entries for `personal_asset`, `asset`, `bank_account` -- no new entries needed in `Relation::morphMap()` in AppServiceProvider.
- **Amounts**: all monetary values stored as integers (cents/basis points), consistent with project convention.
- **Will data is NOT event-sourced** -- wills are CRUD with versioning (data_snapshot provides historical state). Event sourcing is reserved for financial mutations per project architecture.
- **SigningDocument is a Central model** -- the `signing_document_id` FK on Bdbn, PowerOfAttorney, and HealthDirective references `App\Models\Central\SigningDocument`, not a tenant model. Cross-database FK integrity is handled at the application layer (Eloquent `belongsTo`), not the database layer (no DB FK constraint).
- **Contact uses SoftDeletes** -- contacts referenced by estate documents may be soft-deleted. FKs use `nullOnDelete` for hard deletes. Soft-deleted contacts remain loadable via `withTrashed()`. The `data_snapshot` and denormalized `*_name` columns preserve contact data regardless.
- **File storage**: estate PDFs stored on disk AND as `File` model records in 056-FEX for discoverability. Auto-provisioned "Estate Planning" `FileFolder` per workspace.
- **Feature flag**: `estate_planning` feature flag in Laravel Pennant. Backend middleware + frontend `featureKey` on nav item. Enabled by default for `personal` and `smsf` entity types; opt-in for business entities.

---

## Clarifications

The following 20 clarification questions were raised during spec review. Each is answered using codebase patterns and conventions.

---

### C-01: Authorization -- Which workspace roles can create and manage estate documents?

**Question**: Which workspace roles should have create/edit/revoke permissions for wills, BDBNs, POAs, and health directives? Should the permission model follow the existing pattern?

**Answer**: Estate documents contain highly sensitive personal information and represent legally significant instruments. Following the existing permission pattern where sensitive operations are restricted to higher-privilege roles:

- **`estate.view`** (read-only dashboard and document access): all roles -- owner, accountant, bookkeeper, approver, auditor, client. This matches `personal-asset.view` being granted to all roles. The `client` role represents an external client who should see their own estate plan status.
- **Create/update** (`will.create`, `will.update`, `bdbn.create`, etc.): owner and accountant only. Bookkeeper/approver/auditor have no business creating legal documents. This matches the pattern where `signing-document.create` is restricted to practice managers and owners.
- **Revoke** (`will.revoke`, `bdbn.revoke`, etc.): owner only. Revocation is a destructive, legally significant action -- only the workspace owner should be able to revoke a will or BDBN.
- **Sign** (`estate.sign`): owner and accountant. Covers uploading signed copies and sending documents for signing via 059-DGS.

Permission names use the existing convention: hyphen-separated entity names with dot-separated actions (`journal-entry.view`, `signing-document.create`). Single-word entities use just dot notation (`will.create`, `bdbn.update`). Practice advisors access client estate data through the practice connection, not through workspace roles -- their access is governed by `PracticeClientPolicy`.

**Spec updates**: Permissions table added to the spec with role assignments per permission.

---

### C-02: What happens when a beneficiary contact is deleted after being added to a will?

**Question**: If a contact referenced as an executor, guardian, beneficiary, or nominee is deleted (soft or hard) after being added to a will, what is the correct behaviour?

**Answer**: Two scenarios:

1. **Soft delete (archive)**: `Contact` uses `SoftDeletes`. Soft deletes do NOT trigger `nullOnDelete` -- the FK remains intact and the contact is loadable via `withTrashed()`. The will edit view displays archived contacts with an "Archived" badge. The `estate:detect-will-changes` command fires a `WillNeedsReview` notification. The user should update the will to replace the archived contact, but it is not blocking.

2. **Hard delete**: The FK columns use `nullOnDelete`, setting the reference to null. This would lose the contact's name. To prevent this, all estate relationship tables include a **denormalized `*_name` column** (e.g., `beneficiary_name`, `contact_name`, `nominee_name`, `attorney_name`) populated at creation time. If the contact FK becomes null, the denormalized name preserves the reference for display purposes. Additionally, the `data_snapshot` JSON on the Will model captures all contact details at generation time, ensuring historical PDFs remain complete.

**Spec updates**: Added `beneficiary_name`, `contact_name`, `nominee_name`, `attorney_name`, `decision_maker_name` denormalized columns to all estate relationship tables in the Data Model section.

---

### C-03: How does will versioning work when creating a new will?

**Question**: When a user creates a new will and a previous will exists, how is versioning handled? What happens to the old will?

**Answer**: Will versioning follows an immutable append-only pattern:

1. User clicks "Create New Will" (or "Update Will" from an existing signed will).
2. The `CreateWill` action checks for an existing will in the workspace with status `draft`, `generated`, or `signed`.
3. If an existing non-terminal will is found, its status is set to `superseded` with `superseded_at` = now.
4. The new will is created with `version` = previous version + 1, status = `draft`.
5. If the previous will was `draft` or `generated` (never signed), its data is copied into the new will as default values for the wizard.
6. Previous wills are **never deleted** -- they remain queryable and viewable via their `data_snapshot`.

The will history endpoint returns all versions ordered by version number descending. Each version shows its status, dates, and a link to view the snapshot.

**Spec updates**: FR3 (Will Versioning & History) documents this flow in detail.

---

### C-04: How does BDBN expiry work and what scheduled commands are needed?

**Question**: How should BDBN expiry be tracked and what happens when a BDBN expires? What scheduled commands are needed?

**Answer**: Three scheduled commands handle BDBN lifecycle:

1. **`estate:check-bdbn-expiry`** (daily 9am AEST): Queries `estate_bdbns` where `status = 'active'` and `expires_at` is within 90, 30, or 7 days. Creates `BdbnExpiring90/30/7` notifications via `CreateNotification`. Notifications target workspace owners and connected practice advisors. Deduplication: only one notification per BDBN per threshold per window.

2. **`estate:expire-bdbns`** (daily): Queries `estate_bdbns` where `status = 'active'` and `expires_at < now()`. Sets status to `expired`. Only `binding_lapsing` BDBNs have expiry dates (3 years from `signed_at`). `binding_non_lapsing`, `non_binding`, and `reversionary` types have null `expires_at` and never auto-expire.

3. **`estate:detect-will-changes`** (daily): Checks for asset/contact changes since last will generation across all workspaces. This command also detects health directives older than 24 months and fires review notifications.

The lapsing BDBN's `expires_at` is calculated as `signed_at->addYears(3)` in the `BdbnSigningCompletedListener`. If a member loses capacity before renewal, the BDBN expires and super may go to unintended recipients -- hence the aggressive notification schedule (90/30/7 days).

**Spec updates**: Scheduled Commands section and FR5.5 document this flow.

---

### C-05: What happens when an asset linked to a bequest is sold or deleted?

**Question**: If a PersonalAsset or Asset referenced by a will bequest is sold, disposed, or deleted after the bequest was created, should the bequest be auto-removed?

**Answer**: **No, the bequest is NOT auto-removed.** Auto-removing would silently change the user's intended distribution, which could have serious legal consequences. Instead:

1. The `estate:detect-will-changes` command detects the asset deletion/disposal and fires a `WillNeedsReview` notification.
2. The will detail/edit view shows a **warning badge** on bequests where the linked asset no longer exists (polymorphic query returns null).
3. The will **cannot transition from `draft` to `generated`** if any bequest references a non-existent asset. The `GenerateWillPdf` action validates all bequest references and returns 422 if any are dangling. This forces the user to explicitly update or remove the invalid bequest before generating the PDF.
4. The `data_snapshot` captures asset details at generation time, so previously generated/signed wills are unaffected.

For `Asset` model (which uses `SoftDeletes`), disposed/sold assets remain queryable via `withTrashed()` but are flagged with their disposal status. For `PersonalAsset` (no SoftDeletes), hard-deleted assets leave a dangling `bequestable_id` -- the description denormalization in `data_snapshot` preserves the reference.

**Spec updates**: FR1.5, FR1.9, FR1.10, and FR9.4 document this behaviour.

---

### C-06: How should PDF generation use existing patterns?

**Question**: Should will PDFs use the same HTML-to-PDF pipeline as existing report PDFs, and how are merge fields populated?

**Answer**: Yes, will PDFs follow the exact same pattern as `ExportReportPdf`:

1. Blade template at `resources/views/estate/will-pdf.blade.php` (and bdbn, poa, health-directive variants).
2. Template receives the Will model with relationships loaded.
3. HTML rendered via `view('estate.will-pdf', [...])`.
4. Passed to `Barryvdh\DomPDF\Facade\Pdf::loadHTML($html)->output()`.
5. Stored at `storage_path("app/estate-documents/{workspaceId}/will-{uuid}.pdf")`.

**Merge fields come from `data_snapshot` JSON, NOT live model data.** This ensures:
- Historical PDFs always reflect the state at generation time.
- Contact name changes, asset value updates, and address changes after generation don't alter the PDF.
- The snapshot is frozen at the moment `GenerateWillPdf` runs.

The `data_snapshot` includes: testator details, all executor/guardian/beneficiary names and addresses, asset descriptions with values, trust configuration, funeral wishes, and the state-specific witnessing requirements.

**Spec updates**: FR10 (PDF Generation) section documents Blade template paths, merge field sources, and storage paths.

---

### C-07: How are state-specific requirements handled across all Australian states?

**Question**: Do we need separate templates per state, or one template with conditional sections? Should all 8 states/territories be supported in v1?

**Answer**: **All 8 states and territories are supported in v1.** The primary variation is in witnessing requirements and POA/health directive naming -- the will structure itself is uniform across Australia.

Implementation approach: **one Blade template per document type with conditional sections**, not 8 separate templates. The template receives the `AustralianState` enum and renders state-specific blocks:

- **Witnessing instructions** (will PDF attestation clause): varies by state. SA requires same pen. VIC includes remote witnessing note.
- **POA type names**: vary by state (e.g., "Enduring Guardianship" in NSW vs "Enduring Power of Attorney (Medical Treatment)" in VIC).
- **Health directive names**: "Advance Health Directive" (QLD/WA), "Advance Care Directive" (SA/VIC/NSW/TAS), "Health Direction" (ACT), "Advance Personal Plan" (NT).

The `AustralianState` enum provides helper methods: `willWitnessingInstructions()`, `poaFormName()`, `healthDirectiveName()` that return state-specific strings. This keeps the Blade templates clean with a single `{{ $state->willWitnessingInstructions() }}` call.

The frontend wizard Step 2 captures the state, which flows through to all downstream templates. If the testator moves interstate, they create a new will version with the updated state.

**Spec updates**: AustralianState enum added with helper methods. FR4.2 documents state-specific POA types. FR6.2 documents state-specific health directive naming.

---

### C-08: How do practice advisors access client estate documents?

**Question**: Should practice advisors have full read-write access to client estate documents, or read-only by default?

**Answer**: **Read-only by default, with explicit edit permission opt-in.** This follows the principle of least privilege for sensitive legal documents:

1. Practice advisors connected to a client workspace can **view** all estate documents (will, BDBN, POA, health directive) through the practice estate dashboard. This uses the existing `PracticeClientPolicy` pattern where practice connection grants read access.

2. Practice advisors can **send** BDBNs and POAs for signing on behalf of the client via 059-DGS -- this is a practice-initiated workflow that doesn't modify the estate document itself, only creates a signing request.

3. Practice advisors can **create practice tasks** for estate planning reviews (FR8.6).

4. Practice advisors **cannot** create, edit, or revoke client wills/BDBNs/POAs/health directives by default. This protects against inadvertent changes and maintains clear liability boundaries.

5. If a practice needs edit access (e.g., the advisor is drafting the will on behalf of the client), the workspace owner can grant explicit edit permission on the practice-workspace connection. This follows the existing `PracticeMemberAssignment` pattern where specific permissions can be granted per workspace.

**Spec updates**: FR8.1 documents the default read-only access with opt-in edit capability.

---

### C-09: How does the signing integration with 059-DGS work for BDBNs and POAs?

**Question**: BDBNs require two witnesses who are not nominees. How does the 059-DGS signing flow handle this, and how does signing completion update the estate document?

**Answer**: The signing flow works as follows:

1. **Send for signing**: User clicks "Send for Signing" on a draft BDBN/POA/health directive. The `SendBdbnForSigning` action:
   - Validates the document is in `draft` status.
   - For BDBNs: validates that the selected witness signatories are NOT nominees (SIS Regulation 6.17A). Compares `SigningDocumentSignatory.contact_id` against `BdbnNominee.nominee_contact_id`. Returns 422 if overlap.
   - Creates a `SigningDocument` via 059-DGS with appropriate signatories (member + 2 witnesses for BDBN; grantor + witness for POA; principal + witness for health directive).
   - Sets `signing_document_id` on the estate document.

2. **Signing completion**: When the `SigningDocument` reaches `completed` status (all signatories signed), a `BdbnSigningCompletedListener` (registered in `EventServiceProvider`) fires:
   - Looks up the BDBN/POA/health directive linked to the completed `SigningDocument`.
   - Transitions status: `draft` -> `active`.
   - Sets `signed_at` = now.
   - For BDBNs with `binding_lapsing` type: sets `expires_at` = `signed_at->addYears(3)`.
   - Stores the signed PDF in 056-FEX.

3. **Cross-model FK**: `SigningDocument` is a Central model. The `signing_document_id` column on estate tables references it via application-layer FK only (Eloquent `belongsTo`) -- no database-level FK constraint, following the `PracticeTask` pattern.

**Spec updates**: FR5.8, FR5.9 document the BDBN signing flow and witness validation. FR4.5, FR6.6 document POA and health directive signing.

---

### C-10: How are estate documents stored in the file explorer?

**Question**: Should generated PDFs appear in the workspace file explorer (056-FEX), and how is the folder structure managed?

**Answer**: Yes, all estate PDFs are dual-stored:

1. **Raw disk storage**: at `estate-documents/{workspace_id}/{type}-{uuid}.pdf` (matching the `ExportReportPdf` pattern of `storage_path("app/...")`).

2. **File model record**: a `File` model (056-FEX) record is created for each PDF, making it discoverable in the workspace file explorer. The `File` record's `stored_path` points to the raw disk path, `disk` = `config('filesystems.default')`, `mime_type` = `application/pdf`.

3. **Folder auto-provisioning**: the `GenerateWillPdf` action (and BDBN/POA/health directive equivalents) checks for an "Estate Planning" `FileFolder` in the workspace. If none exists, it creates one. All estate PDFs are filed into this folder. This uses the existing `FileFolder` model and follows the pattern in `FolderController`.

4. **Signed copies**: when a user uploads a signed scan, it is stored at the raw path AND a second `File` record is created in the same "Estate Planning" folder with a clear naming convention (e.g., "Will v1 - Signed Copy").

The disk follows `config('filesystems.default')` (currently `local`), allowing future migration to S3 by changing config.

**Spec updates**: FR10.7 documents dual storage. FR1.10 references the auto-provisioned folder.

---

### C-11: How does the wizard auto-save work?

**Question**: The 10-step wizard could lose state on browser refresh. How should draft persistence work?

**Answer**: Draft saves are server-side via API, not localStorage. The flow:

1. **First entry**: User clicks "Create Will". Frontend POSTs to `POST /api/v1/estate/wills` to create a draft will (gets UUID back). The will is created with `current_step = 1` and empty/default data.

2. **Per-step save**: On each step completion (clicking "Next"), the frontend PATCHes `PATCH /api/v1/estate/wills/{uuid}` with the current form data and increments `current_step`. This is an explicit save on navigation, not a debounced auto-save (legal documents should not save partial/transient state).

3. **Resume**: If the user navigates away and returns, the frontend GETs `GET /api/v1/estate/wills/{uuid}`, populates React Hook Form `defaultValues` from the API response, and navigates to `current_step`. The progress indicator shows completed steps.

4. **Browser refresh**: Same as resume -- the last saved state is authoritative. Any unsaved changes on the current step are lost (standard form behaviour). A "You have unsaved changes" browser prompt (`beforeunload` event) warns the user.

The `current_step` field (integer, nullable) on the Will model tracks wizard progress. Null means the wizard is complete (all 10 steps done, will is in `generated` or `signed` status).

**Spec updates**: `current_step` added to the Will data model. FR1 introduction paragraph documents auto-save behaviour.

---

### C-12: What is the testing strategy for estate planning?

**Question**: What test types, counts, and patterns should be used for the estate planning module?

**Answer**: Following the project's testing conventions (`vendor/bin/pest`, Pest v4, `RefreshDatabase`, `RolesAndPermissionsSeeder`):

**Feature tests** (`tests/Feature/Api/EstateTest.php`, ~15 tests):
- Will CRUD: create draft, update, generate PDF, upload signed copy, revoke, revert to draft
- Will authorization: bookkeeper cannot create will (403), client can view (200), only owner can revoke
- Will state transitions: cannot generate already-generated will, cannot revoke already-revoked will
- Will versioning: new will supersedes previous, version number increments
- BDBN CRUD: create, update, send for signing, revoke, renew
- BDBN SMSF gating: 403 on non-SMSF workspace
- BDBN nominee validation: percentages must total 10000
- BDBN witness-nominee exclusion: send-for-signing rejected when witness is also nominee
- POA CRUD: create, update, send for signing, revoke
- Health directive CRUD: create, update, generate, send for signing
- Estate dashboard: returns correct status summary
- Tenant isolation: workspace A's estate data not visible to workspace B
- Practice estate endpoints: require practice membership, correct counts

**Unit tests** (`tests/Unit/Estate/`, ~5 tests):
- `GenerateWillPdf` action: correct Blade template sections rendered per will_type
- BDBN expiry calculation: 3 years from signed_at for lapsing, null for non-lapsing
- Change detection: asset value delta > 20% triggers alert
- Notification deduplication: second alert within 30-day window suppressed
- Residuary percentage validation: rejects totals != 10000

**Browser tests** (`tests/Browser/EstateTest.php`, ~3 tests):
- Will wizard: navigate all 10 steps, save draft, resume from last step
- Estate dashboard: four panels render, BDBN panel hidden on non-SMSF
- Keyboard shortcut: `G then W` navigates to estate dashboard

All tests seed `RolesAndPermissionsSeeder`, assign roles, and use `->withHeaders(['X-Workspace-Id' => ...])` for workspace-scoped requests.

**Spec updates**: Testing Strategy section added with test file paths and estimated counts.

---

### C-13: How is the notification deduplication handled for "will needs review" alerts?

**Question**: The spec says alerts are deduplicated per trigger type per 30-day window. How is this implemented?

**Answer**: The `estate:detect-will-changes` scheduled command creates `WillNeedsReview` notifications when it detects qualifying changes. To prevent notification spam (e.g., if a user adds 5 assets in a week), deduplication works as follows:

1. Before creating a notification, the command queries the `notifications` table for existing `WillNeedsReview` notifications for the same workspace within the last 30 days.
2. Each notification carries a `data` JSON payload with a `trigger_type` field (e.g., `asset_added`, `asset_deleted`, `contact_archived`, `value_change`, `stale_will`).
3. If a notification with the same `trigger_type` exists within 30 days, the new one is suppressed.
4. Different trigger types can coexist -- a `value_change` alert and an `asset_deleted` alert can both fire within the same 30-day window.

This follows the existing notification pattern in `CreateNotification` where the action receives structured `data` as JSON. The deduplication query is: `Notification::where('workspace_id', $wid)->where('type', 'WillNeedsReview')->where('data->trigger_type', $type)->where('created_at', '>=', now()->subDays(30))->exists()`.

**Spec updates**: FR7.3 documents the 30-day deduplication window.

---

### C-14: Should the estate planning feature be gated by a feature flag or available to all workspaces?

**Question**: Is estate planning available to all entity types, or should it be gated by entity type or feature flag?

**Answer**: Estate planning is gated by the `estate_planning` feature flag in Laravel Pennant, consistent with the existing feature flag pattern (`CheckFeature` middleware + API response flag). Default availability:

- **Personal (`personal`)**: enabled by default -- primary use case (personal wills, POAs, health directives).
- **SMSF (`smsf`)**: enabled by default -- BDBN management is a core SMSF need.
- **Trust, Pty Ltd, Sole Trader, Partnership**: opt-in via feature toggle in workspace settings. Estate planning for these entities is less common but valid (e.g., a sole trader's personal will may reference business assets).
- **Not-for-Profit**: disabled by default -- NFPs typically don't have estate planning needs.

Within the estate module, BDBN functionality is additionally gated by `entity_type === 'smsf'` regardless of the feature flag. Non-SMSF workspaces with estate planning enabled see wills, POAs, and health directives but not BDBNs.

**Spec updates**: Technical Notes section documents the feature flag behaviour.

---

### C-15: How does the "Revert to Draft" action work for generated wills?

**Question**: Can a user revert a generated will back to draft status to make edits? What happens to the generated PDF?

**Answer**: Yes, a `generated` will can be reverted to `draft`. This is important because the user may spot an error in the PDF preview. The flow:

1. User clicks "Revert to Draft" on a will in `generated` status.
2. The `RevertWillToDraft` action:
   - Validates the will is in `generated` status (not `signed`, `superseded`, or `revoked`).
   - Deletes the generated PDF from disk.
   - Deletes the corresponding `File` record from 056-FEX.
   - Clears `generated_file_path`, `generated_at`, and `data_snapshot`.
   - Sets status back to `draft`.
3. The user can now edit the will via the wizard and re-generate.

A `signed` will cannot be reverted -- it has been physically executed. To make changes after signing, the user must create a new version (which supersedes the signed will).

**Spec updates**: FR3.1 documents this transition. API endpoints table includes the revert-to-draft endpoint.

---

### C-16: How are residuary estate percentages validated?

**Question**: The residuary estate requires beneficiary percentages to total 100%. How is this validated on both client and server?

**Answer**: Percentages are stored as integers in basis points (10000 = 100%), consistent with the project convention for precise percentage storage (same pattern as BDBN nominee percentages and tax code `rate_basis_points`).

**Client-side**: Zod schema on Step 6 validates that the sum of all `percentage` values equals 10000. The form shows a running total and disables the "Next" button until it reaches exactly 100%. Contingency beneficiaries are excluded from the 100% total -- they only apply if their linked primary beneficiary predeceases.

**Server-side**: The `StoreWill` / `UpdateWill` action validates: `collect($residuaries)->where('is_contingency', false)->sum('percentage') === 10000`. If validation fails, returns 422 with a clear error message: "Residuary estate allocations must total 100%".

Edge case: if only one beneficiary receives the entire residuary estate, `percentage = 10000`.

**Spec updates**: FR1.6 documents basis point storage and validation.

---

### C-17: How does the WorkspaceGroup integration work for family estate planning?

**Question**: The spec mentions a family group estate coverage matrix. How does this integrate with the WorkspaceGroup model?

**Answer**: The estate dashboard's family group section (FR7.5) leverages the existing `WorkspaceGroup` model and `getAllWorkspaceIds()` method:

1. If the current workspace belongs to a `WorkspaceGroup`, the estate dashboard shows an "Estate Plan Coverage" section.
2. This section calls `GET /api/v1/estate/dashboard` which, if a group exists, queries all workspace IDs in the group via `$group->getAllWorkspaceIds()`.
3. For each workspace in the group, it returns: entity type, will status (latest), BDBN status (if SMSF), POA status, health directive status.
4. The UI renders a matrix showing coverage gaps: green checkmark (active document), yellow warning (draft or stale), red X (no document), grey dash (N/A for entity type).

This is read-only and does not allow cross-workspace editing. The user must navigate to each workspace individually to create/edit estate documents. The group view simply provides a holistic overview.

**Spec updates**: FR7.5 documents this integration.

---

### C-18: What legal disclaimers are required and where are they displayed?

**Question**: What specific legal disclaimers must be shown, and at which points in the user journey?

**Answer**: Five mandatory disclaimers, displayed at specific touchpoints:

1. **"Not Legal Advice"**: shown on the estate dashboard, at the top of the will wizard, and appended to every generated PDF. Text: "MoneyQuest provides tools to help you create estate planning documents. This is not legal advice. We recommend consulting a qualified solicitor, especially for complex estates."

2. **"No Lawyer-Client Relationship"**: shown on the will wizard Step 1 and appended to PDFs. Text: "Using MoneyQuest's estate planning tools does not create a lawyer-client relationship."

3. **"Professional Review Recommended"**: shown on Step 9 (Review) before generation. Text: "We strongly recommend having your will reviewed by a qualified solicitor before signing, particularly if you have: a blended family, business interests, assets over $1M, an SMSF, international assets, or a testamentary trust."

4. **"State-Specific Requirements"**: shown on Step 10 (Generate & Sign) alongside witnessing instructions. Text: "Will requirements vary by state and territory. Ensure you follow the signing and witnessing instructions for your specific state."

5. **"Will Only Covers Personal Assets"**: shown on the estate dashboard if the workspace belongs to a group with multiple entities. Text: "Your will governs your personal assets. Trust assets, superannuation, and jointly-owned assets may be distributed differently. Ensure your estate plan is coordinated across all your entities."

Additionally, a **BDBN Disclaimer** is shown on BDBN creation: "Binding Death Benefit Nominations must comply with your SMSF trust deed and superannuation legislation. We recommend having your BDBN reviewed by an SMSF specialist or solicitor."

Step 9 (Review) includes an **"I acknowledge this is not legal advice"** checkbox that must be checked before the user can proceed to Step 10 (Generate).

**Spec updates**: FR10.5 documents PDF disclaimers. FR1.9 documents the acknowledgment checkbox.

---

### C-19: What keyboard shortcut should estate planning use?

**Question**: `G then E` is already mapped to Files in `navigation.ts`. What shortcut should estate planning use?

**Answer**: Confirmed conflict: `chordShortcuts` in `frontend/src/lib/navigation.ts` maps `e` -> `/files`. Available unmapped letters: `w`, `n`, `u`, `v`, `z`. The best fit is **`G then W`** (W for Will/Estate). This is memorable ("Will") and not in conflict with any existing shortcut.

Update required:
- Add `w: '/estate'` to `chordShortcuts` in `navigation.ts`.
- Add `shortcut: 'G then W'` to the Estate Planning nav item in `primaryNav`.

**Spec updates**: UI/UX Requirements section uses `G then W` throughout.

---

### C-20: How should the will wizard handle the testator's state selection and its downstream effects?

**Question**: The testator's state determines witnessing requirements, POA form types, and health directive naming. How is this managed through the wizard and into PDF generation?

**Answer**: The state selection in Step 2 (Testator Details) drives all state-specific behaviour through the `AustralianState` enum:

1. **Wizard Step 2**: User selects their state/territory from a dropdown. This is pre-filled from the workspace's registered address if available. The selection is stored as `testator_state` on the Will model.

2. **Wizard Step 10**: The state-specific witnessing instructions are displayed based on `testator_state`. For VIC, the 059-DGS remote witnessing option is shown. For SA, the "same pen" requirement is highlighted.

3. **PDF generation**: The Blade template receives the `AustralianState` enum and calls helper methods (`willWitnessingInstructions()`) for the attestation clause. No separate templates per state -- one template with conditional blocks.

4. **POA creation**: The grantor's state determines which POA types are available (FR4.2). The `PoaType` enum is filtered by state in the frontend wizard.

5. **Health directive creation**: The directive's state determines the document name displayed in the UI and on the PDF (FR6.2). The `AustralianState::healthDirectiveName()` method returns the correct term.

6. **State change**: If a user moves interstate, they should create a new will version with the updated state. The system does not automatically invalidate wills on state change -- this is a user responsibility, but the annual review notification may prompt it.

**Spec updates**: AustralianState enum with helper methods added to the Enums section. FR1.2 documents the state selection flow.

---

## Testing Strategy

### Feature Tests (`tests/Feature/Api/EstateTest.php`, ~15 tests)

- Will CRUD: create draft, update, generate PDF, upload signed copy, revoke, revert to draft
- Will authorization: bookkeeper cannot create will (403), client can view (200), only owner can revoke
- Will state transitions: cannot generate already-generated will, cannot revoke already-revoked will
- Will versioning: new will supersedes previous, version number increments
- Will generation blocked: bequest references deleted asset returns 422
- BDBN CRUD: create, update, send for signing, revoke, renew
- BDBN SMSF gating: 403 on non-SMSF workspace
- BDBN nominee validation: percentages must total 10000, rejects at 9999 or 10001
- BDBN witness-nominee exclusion: send-for-signing rejected when witness is also nominee
- BDBN signing completion: listener transitions BDBN to active, sets expiry
- POA CRUD: create, update, send for signing, revoke
- Health directive CRUD: create, update, generate, send for signing, revoke
- Estate dashboard: returns correct will/BDBN/POA/health directive status summary
- Tenant isolation: workspace A's estate data not visible to workspace B
- Practice estate endpoints: require practice membership, correct counts

### Unit Tests (`tests/Unit/Estate/`, ~5 tests)

- `GenerateWillPdf` action: correct Blade template sections rendered per will_type
- BDBN expiry calculation: 3 years from signed_at for lapsing, null for non-lapsing
- Change detection: asset value delta > 20% triggers alert
- Notification deduplication: second alert within 30-day window suppressed
- Residuary percentage validation: rejects totals != 10000

### Browser Tests (`tests/Browser/EstateTest.php`, ~3 tests)

- Will wizard: navigate all 10 steps, save draft, resume from last step
- Estate dashboard: four panels render, BDBN panel hidden on non-SMSF
- Keyboard shortcut: `G then W` navigates to estate dashboard
