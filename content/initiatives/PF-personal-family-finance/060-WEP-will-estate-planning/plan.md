---
title: "Implementation Plan: Will & Estate Planning"
---

# Implementation Plan: Will & Estate Planning

**Epic**: 060-WEP
**Branch**: `feature/060-wep-will-estate-planning`
**Estimated Effort**: XL (4-5 sprints)

---

## Phase 1: Backend Foundation

**Sprint**: 1
**Goal**: All migrations, models, enums, actions, controllers, form requests, resources, policies, and routes for Will, BDBN, POA, and Estate Dashboard.

### 1.1 Migration

- `2026_03_22_700001_create_estate_planning_tables.php`
- Tables: `wills`, `will_bequests`, `will_executors`, `will_guardians`, `will_trusts`, `will_residuaries`, `bdbns`, `bdbn_nominees`, `powers_of_attorney`
- All indexes from spec (workspace_id+status, workspace_id+version, expires_at, workspace_id+poa_type)
- Foreign keys with cascadeOnDelete for child tables, nullOnDelete for contact references

### 1.2 Enums (app/Enums/Estate/)

| Enum | Cases |
|------|-------|
| `WillType` | simple, testamentary_trust |
| `WillStatus` | draft, generated, signed, superseded, revoked |
| `BequestType` | specific, pecuniary, freetext |
| `ExecutorRole` | primary, alternate |
| `GuardianRole` | primary, alternate |
| `GuardianType` | child, pet |
| `BdbnNominationType` | binding_lapsing, binding_non_lapsing, non_binding, reversionary |
| `BdbnStatus` | draft, active, expired, superseded, revoked |
| `BdbnRelationship` | spouse, child, financial_dependant, legal_personal_representative |
| `PoaType` | general_financial, enduring_financial, enduring_medical, enduring_guardianship |
| `PoaStatus` | draft, active, revoked |

All enums include `label()` method. Status enums include `canTransitionTo()`.

### 1.3 Models (app/Models/Tenant/)

- `Will.php` -- uuid route binding, workspace/bequests/executors/guardians/trusts/residuaries/signingDocument/file relationships
- `WillBequest.php` -- morphTo bequestable, belongsTo will/beneficiary contact
- `WillExecutor.php` -- belongsTo will/contact
- `WillGuardian.php` -- belongsTo will/contact
- `WillTrust.php` -- belongsTo will/trustee contact, JSON cast for beneficiary_contact_ids
- `WillResiduary.php` -- belongsTo will/beneficiary contact/contingency contact
- `Bdbn.php` -- uuid route binding, workspace/member contact/nominees/signingDocument relationships, active/expiringSoon scopes
- `BdbnNominee.php` -- belongsTo bdbn/nominee contact
- `PowerOfAttorney.php` -- uuid route binding, workspace/attorney contact/alternate contact/signingDocument relationships

### 1.4 Actions (app/Actions/Estate/)

| Action | Description |
|--------|-------------|
| `CreateWill` | Creates will with status=draft, version=1. If existing will, increments version and supersedes old. |
| `UpdateWillStep` | Saves wizard step data to will fields, updates current_step |
| `GenerateWill` | Validates bequests reference existing assets, creates data_snapshot JSON, transitions to generated |
| `RevertWillToDraft` | Transitions generated will back to draft, clears generated_file_path and generated_at |
| `RevokeWill` | Transitions to revoked with reason, sets revoked_at |
| `SupersedeWill` | Sets status to superseded, sets superseded_at |
| `CreateBdbn` | Creates BDBN with nominees, validates percentages sum to 10000 |
| `RevokeBdbn` | Transitions to revoked |
| `RenewBdbn` | Creates new BDBN pre-populated from existing, supersedes old if active |
| `CreatePowerOfAttorney` | Creates POA record |
| `RevokePoa` | Transitions to revoked |

### 1.5 Controllers (app/Http/Controllers/Api/)

| Controller | Endpoints |
|------------|-----------|
| `WillController` | index, store, show, update, generate, sign, revoke, revertToDraft, history |
| `BdbnController` | index, store, show, update, revoke, renew |
| `PowerOfAttorneyController` | index, store, show, update, revoke |
| `EstateDashboardController` | dashboard (overview), counts |

### 1.6 Form Requests (app/Http/Requests/Estate/)

- `StoreWillRequest` -- validates will_type, testator fields
- `UpdateWillStepRequest` -- validates step data with conditional rules per step
- `GenerateWillRequest` -- resolves will from route, validates no dangling bequests
- `RevokeWillRequest` -- requires revocation_reason
- `StoreBdbnRequest` -- validates nominees, percentages sum to 10000
- `StorePowerOfAttorneyRequest` -- validates poa_type, grantor fields, attorney contact

### 1.7 Resources (app/Http/Resources/)

- `WillResource` -- with bequests, executors, guardians, trusts, residuaries whenLoaded
- `BdbnResource` -- with nominees whenLoaded
- `PowerOfAttorneyResource` -- standard fields

### 1.8 Policy

- `EstatePolicy.php` -- 12 permissions: estate.view, will.create, will.update, will.generate, will.revoke, bdbn.create, bdbn.update, bdbn.revoke, poa.create, poa.update, poa.revoke, estate.sign

### 1.9 Infrastructure

- Permissions added to `RolesAndPermissionsSeeder` (all 12, assigned per spec)
- Morph map entries: `will`, `bdbn`, `power_of_attorney` in AppServiceProvider
- Gate::policy registrations for Will, Bdbn, PowerOfAttorney
- Routes added to workspace-scoped group in routes/api.php

---

## Phase 2: Will Builder Wizard Frontend + PDF Generation

**Sprint**: 2-3
**Goal**: 10-step will builder wizard, PDF generation via DomPDF, document storage.

### 2.1 Frontend Pages

- `/w/{slug}/estate` -- Estate dashboard page
- `/w/{slug}/estate/will/new` -- Will builder wizard (10 steps)
- `/w/{slug}/estate/will/{uuid}` -- Will detail with PDF preview

### 2.2 Will Wizard Components

- `<WillWizard>` -- single React Hook Form instance, Zod validation per step
- `<WillStepTestator>`, `<WillStepExecutors>`, `<WillStepGuardians>`, `<WillStepBequests>`, `<WillStepResiduary>`, `<WillStepTrusts>`, `<WillStepFuneral>`, `<WillStepReview>`, `<WillStepGenerate>`
- `<AssetPicker>` -- searchable asset selector (PersonalAsset + Asset + BankAccount)
- `<ContactRolePicker>` -- contact selector with role assignment

### 2.3 PDF Generation

- `GenerateWillPdf` action -- Blade template rendered via DomPDF
- Blade template at `resources/views/estate/will-pdf.blade.php`
- State-specific witnessing instructions
- Legal disclaimer page appended
- Storage: `estate-documents/{workspace_id}/will-{uuid}.pdf`
- File model record created in "Estate Planning" folder (056-FEX)

### 2.4 TanStack Query Hooks

- `useWills`, `useWill`, `useCreateWill`, `useUpdateWillStep`, `useGenerateWill`, `useRevokeWill`

---

## Phase 3: BDBN + POA + Estate Dashboard

**Sprint**: 3-4
**Goal**: BDBN management for SMSF, POA wizard, estate dashboard frontend.

### 3.1 BDBN Frontend

- `/w/{slug}/estate/bdbn` -- BDBN list with StatusTabs (All, Active, Expiring Soon, Expired)
- `/w/{slug}/estate/bdbn/new` -- BDBN creation form
- `<BdbnForm>` -- nominee percentage validation (must total 100%)
- BDBN PDF generation (Blade template + DomPDF)
- Integration with 059-DGS signing flow

### 3.2 POA Frontend

- `/w/{slug}/estate/poa` -- POA list with StatusTabs
- `/w/{slug}/estate/poa/new` -- 4-step POA wizard
- `<PoaWizard>` -- type selection, grantor details, attorney appointment, review
- POA PDF generation

### 3.3 Estate Dashboard

- `<EstateDashboard>` -- three-panel status overview (Will, BDBN, POA)
- `<EstateAlerts>` -- "Needs updating" alert list
- Asset summary section with net estate value
- BDBN panel conditionally shown for SMSF workspaces

### 3.4 Navigation

- Sidebar nav item "Estate" with shortcut `G then W`
- BDBN sub-nav only visible for SMSF entity types

---

## Phase 4: Practice View, Notifications, Scheduled Commands, Tests

**Sprint**: 4-5
**Goal**: Practice advisor estate view, change detection, expiry notifications, comprehensive tests.

### 4.1 Practice Advisor View

- `/practice/estate` -- Estate health dashboard across all client workspaces
- DataTable with StatusTabs (All, Needs Attention, Up to Date, No Estate Plan)
- Counts endpoint for tab badges
- Click-through to client workspace estate dashboard

### 4.2 Notifications

- Add NotificationType cases: BdbnExpiring90, BdbnExpiring30, BdbnExpiring7, WillNeedsReview, WillGenerated, WillSigned, EstateGapDetected
- Notification deduplication (one per trigger type per 30-day window)

### 4.3 Scheduled Commands

- `estate:check-bdbn-expiry` -- daily 9am AEST, sends 90/30/7 day warnings
- `estate:detect-will-changes` -- daily, checks for asset/contact changes since last generation
- `estate:expire-bdbns` -- daily, marks expired BDBNs

### 4.4 Event Listeners

- `BdbnSigningCompletedListener` -- transitions BDBN to active when signing completes

### 4.5 Tests

- Feature tests (~30): Will CRUD, authorization, state transitions, versioning, BDBN CRUD, SMSF gating, nominee validation, POA CRUD, estate dashboard, tenant isolation
- Unit tests (~10): PDF generation, BDBN expiry calculation, change detection, notification deduplication

---

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| 059-DGS Document Governance & Signing | Complete | SigningDocument model for signing flow |
| 056-FEX Workspace File Explorer | Complete | File/FileFolder models for document storage |
| 006-CCM Contacts & Client Mgmt | Complete | Contact model for beneficiaries, executors, etc. |
| 030-PLG Personal Ledger | Complete | PersonalAsset model for bequest references |
| 033-FAR Fixed Asset Register | Complete | Asset model for bequest references |

---

## Risk Mitigations

- **Legal disclaimer**: Every generated document includes prominent "Not Legal Advice" disclaimer
- **State-specific content**: Witnessing instructions parameterised by testator_state
- **Data immutability**: data_snapshot frozen at generation time; historical versions always viewable
- **SMSF gating**: BDBN endpoints/UI only available on SMSF workspaces (entity_type check)
- **Percentage validation**: Residuary and BDBN nominee percentages enforced server-side (must total 10000 basis points)
