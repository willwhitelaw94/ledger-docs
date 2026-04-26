---
title: "Feature Specification: Contacts & Client Management"
---

# Feature Specification: Contacts & Client Management

**Epic**: 006-CCM
**Created**: 2026-03-11
**Status**: Draft
**Initiative**: FL — MoneyQuest Ledger
**Design Direction**: Super Modern

---

## Context

The Contacts & Client Management module provides a centralised register of customers, suppliers, and dual-role contacts used across the ledger — invoicing, job costing, bank feed rules, and reconciliation all reference contacts. The backend API is fully built (18 tests, full CRUD with filtering, search, pagination, and soft-delete archiving). This spec covers the **frontend uplift** — expanding the minimal contact forms to expose all fields the API supports, improving the list view, and adding the detail/view experience.

### Current State

The frontend has three pages:
- **List page** (`/contacts`) — TanStack Table with search, type filter, pagination, row actions. Working well.
- **Create page** (`/contacts/new`) — Only captures 4 fields: name, email, phone, type. Missing 15+ fields the API supports.
- **Edit page** (`/contacts/[id]`) — Same minimal 4-field form. No read-only detail view.

### Dependencies

| Direction | Epic | Relationship |
|-----------|------|-------------|
| **Depends on** | 002-CLE Core Ledger Engine | Default revenue/expense accounts reference chart of accounts |
| **Depends on** | 003-AUT Auth & Multi-tenancy | Workspace scoping, role-based permissions |
| **Used by** | 005-IAR Invoicing & AR | Invoices belong to a contact (customer type) |
| **Used by** | 008-JCT Job Costing | Jobs can reference a contact |
| **Used by** | 004-BFR Bank Feeds & Reconciliation | Bank feed rules can target a contact |

---

## User Scenarios & Testing

### User Story 1 — Full Contact Creation (Priority: P1)

A bookkeeper creates a new contact with all relevant business details — legal name, display name, contact information (email, phone, mobile, website), Australian business identifiers (ABN, GST registration), postal address, default accounting settings (revenue account, expense account, tax code), payment terms, and notes. The form is organised into logical sections so users can quickly fill the essentials (name and type) and optionally complete the rest.

**Why this priority**: Contact creation is the entry point for the entire contacts module and is referenced by invoicing, jobs, and bank feeds. Incomplete contact records lead to manual data entry downstream.

**Independent Test**: A bookkeeper can create a contact with all fields populated, see it in the contacts list, and open it to verify all saved data — delivering a complete contact register.

**Acceptance Scenarios**:

1. **Given** a bookkeeper navigates to New Contact, **When** they fill in name "Acme Plumbing", type "supplier", ABN "12345678901", enable GST registered, set payment terms to Net 30, and save, **Then** the contact is created with all fields persisted and the user is redirected to the contact detail view (`/contacts/[id]`) with a success toast
2. **Given** a bookkeeper is creating a contact, **When** they enter an ABN that is not exactly 11 characters, **Then** the form shows a validation error before submission
3. **Given** a bookkeeper is creating a contact, **When** they leave the name field empty and attempt to save, **Then** the form shows "Name is required" inline
4. **Given** a bookkeeper is creating a contact, **When** they enter an invalid email format, **Then** the form shows an email validation error inline
5. **Given** a bookkeeper is creating a contact, **When** they only fill name and type (minimum required fields), **Then** the contact is created successfully — all other fields are optional

---

### User Story 2 — Contact Editing with Full Fields (Priority: P1)

A bookkeeper edits an existing contact, updating any field. The edit form loads with all current values pre-populated, including address, accounting defaults, and notes. Changes are saved via PATCH and the user is returned to the contacts list.

**Why this priority**: Contacts evolve — businesses change addresses, register for GST, update payment terms. Editing must expose all the same fields as creation.

**Independent Test**: A bookkeeper can open an existing contact, change the ABN, update the address, toggle GST registration, and save — then reopen and verify the changes persisted.

**Acceptance Scenarios**:

1. **Given** a contact exists with all fields populated, **When** a bookkeeper opens the edit page, **Then** all fields are pre-populated with the current values including address, ABN, GST status, payment terms, and notes
2. **Given** a bookkeeper changes the contact type from "customer" to "both", **When** they save, **Then** the type is updated and the contact now appears in both customer and supplier filtered views
3. **Given** a bookkeeper updates the address fields, **When** they save, **Then** the address is persisted as flat fields (address_line_1, city, state, postcode, country) matching the API contract
4. **Given** a bookkeeper sets default revenue and expense accounts, **When** they save, **Then** these defaults are stored and available when creating invoices or journal entries for this contact

---

### User Story 3 — Contact Detail View (Priority: P2)

A user (including read-only roles like auditor and client) views contact details in a structured layout showing all information organised by section — identity, contact info, address, accounting defaults, and notes. Read-only roles see the same detail without edit controls.

**Why this priority**: Users with view-only permissions need to look up contact details. The current edit-only page doesn't serve auditors, clients, or approvers who just need to read.

**Independent Test**: An auditor can navigate to a contact and see all details (name, ABN, address, payment terms, notes) in a read-only layout without any edit or delete buttons.

**Acceptance Scenarios**:

1. **Given** a user with `contact.view` permission navigates to `/contacts/[id]`, **When** they do not have `contact.update` permission, **Then** the page displays all contact information in a read-only format with no edit button
2. **Given** a user with `contact.update` permission navigates to `/contacts/[id]`, **When** the page loads, **Then** they see an "Edit" button that navigates to `/contacts/[id]/edit`
3. **Given** a contact has a partial address (city and state only, no street), **When** a user views the detail, **Then** only the populated address fields are displayed — no "null" or empty placeholders

---

### User Story 4 — Improved Contact List (Priority: P2)

The contact list displays additional context beyond name/type/email/phone — showing location (city, state) and whether the contact is GST-registered. The list also shows archived contacts when toggled.

**Why this priority**: The list is the primary navigation surface. Showing city/state helps distinguish contacts with similar names, and GST status is frequently needed when creating invoices.

**Independent Test**: A user views the contacts list and can see city/state and GST badge for each contact, and can toggle to include archived contacts.

**Acceptance Scenarios**:

1. **Given** contacts exist with city and state populated, **When** the user views the list, **Then** a "Location" column displays "{city}, {state}" (or just the populated field if one is missing)
2. **Given** a GST-registered contact exists, **When** the user views the list, **Then** a "GST" badge is visible on that contact's row
3. **Given** archived contacts exist, **When** the user toggles "Show archived", **Then** archived contacts appear in the list with a visual indicator (muted styling or "Archived" badge)

---

### User Story 5 — Contact Archiving & Unarchiving (Priority: P3)

A user with delete permission can archive a contact from the detail/edit page. Archived contacts are soft-deleted and can be restored by toggling `is_archived` back to false.

**Why this priority**: Archiving is important for data hygiene but is lower priority since the basic delete action already exists via the API.

**Independent Test**: A user archives a contact, confirms it disappears from the default list, toggles "Show archived", finds it, and restores it.

**Acceptance Scenarios**:

1. **Given** a user clicks "Archive" on a contact, **When** they confirm the action, **Then** the contact is soft-deleted and disappears from the default contact list
2. **Given** an archived contact is visible (via "Show archived" toggle), **When** a user clicks "Restore", **Then** the contact's `is_archived` flag is set to false and it reappears in the default list

---

### Edge Cases

- **ABN exactly 11 characters**: ABN validation must enforce exactly 11 characters — not min/max, but exact length. Common mistake: spaces in ABN (e.g., "12 345 678 901") — form should strip spaces before validation or accept formatted input
- **Country code**: Country field accepts 2-character ISO codes (e.g., "AU"). Default should be "AU" for new contacts. Display should show the country name, not the code
- **Display name fallback**: If display_name is not provided, the API returns `name` as display_name. The form should show display_name as optional with a placeholder hint "Defaults to legal name"
- **Duplicate contacts**: No uniqueness constraint on name or email per workspace. Users may accidentally create duplicates — but this is by design (two contacts can share the same email)
- **Contact in use**: Attempting to hard-delete (not archive) a contact referenced by invoices or jobs — the API soft-deletes, so this is safe. But the UI should communicate "Archive" not "Delete" to set correct expectations
- **Empty address**: If no address fields are populated, the address section should be collapsed or hidden in detail view — not shown as a block of empty fields
- **Payment terms display**: Payment terms are stored as enum strings (e.g., "net_30") — display should be human-readable ("Net 30 days", "Due on Receipt")
- **Server validation errors**: If the API returns a 422 with field-level errors (e.g., deleted chart account ID), errors are mapped to form fields inline. Non-field errors (500, timeouts) show a fallback toast

---

## Requirements

### Functional Requirements

**Contact Form (Create & Edit)**

- **FR-CCM-001**: System MUST display the contact form organised in logical sections: Identity (name, display name, type), Contact Info (email, phone, mobile, website), Business Details (ABN, GST registered), Address (line 1, line 2, city, state, postcode, country), Accounting Defaults (revenue account, expense account, tax code, payment terms, currency), and Notes
- **FR-CCM-002**: System MUST require only name and type for contact creation — all other fields are optional
- **FR-CCM-003**: System MUST validate ABN as exactly 11 characters when provided
- **FR-CCM-004**: System MUST validate email format when provided
- **FR-CCM-005**: System MUST validate country as exactly 2 characters (ISO code) when provided, defaulting to "AU"
- **FR-CCM-006**: System MUST offer payment terms as a dropdown with options: Due on Receipt, Net 7, Net 14, Net 30, Net 60, Net 90
- **FR-CCM-007**: System MUST allow selecting default revenue and expense accounts from the workspace's chart of accounts
- **FR-CCM-008**: System MUST allow selecting a default tax code from the workspace's tax codes
- **FR-CCM-009**: System MUST send address fields as flat keys (address_line_1, address_line_2, city, state, postcode, country) matching the API contract — not nested under an "address" object
- **FR-CCM-010**: System MUST pre-populate all fields when editing an existing contact, mapping the API's nested `address` response back to flat form fields

**Contact Detail View**

- **FR-CCM-011**: System MUST display all contact information in a structured read-only layout when the user has view permission
- **FR-CCM-012**: System MUST show edit controls only when the user has update permission
- **FR-CCM-013**: System MUST hide empty sections — if no address is provided, the address section is not rendered
- **FR-CCM-014**: System MUST display payment terms in human-readable format (e.g., "Net 30 days" not "net_30")
- **FR-CCM-015**: System MUST display GST registration status clearly (e.g., "Registered for GST" badge)

**Contact List Enhancements**

- **FR-CCM-016**: Contact list MUST show location (city, state) column
- **FR-CCM-017**: Contact list MUST show GST registration indicator
- **FR-CCM-018**: Contact list MUST support toggling archived contacts visibility

**Archiving**

- **FR-CCM-019**: System MUST use "Archive" terminology (not "Delete") for soft-delete operations
- **FR-CCM-020**: System MUST support unarchiving (restoring) contacts via `is_archived: false` PATCH

**Type Safety**

- **FR-CCM-021**: TypeScript `Contact` interface MUST type `payment_terms` as `string | null` (not `number | null`)
- **FR-CCM-022**: Hook payload types MUST include all fields the API accepts
- **FR-CCM-023**: Zod form schema MUST match the API validation rules

### Key Entities

- **Contact**: A customer, supplier, or dual-role business entity. Contains identity (name, display_name, type), contact info (email, phone, mobile, website), Australian business identifiers (ABN, is_gst_registered), postal address (line_1, line_2, city, state, postcode, country defaulting to AU), accounting defaults (default_revenue_account_id, default_expense_account_id, default_tax_code, payment_terms, currency), notes, and archive status. Scoped to a workspace via workspace_id. Soft-deletable.

---

## Success Criteria

### Measurable Outcomes

- **SC-CCM-001**: Contact creation form exposes all 20+ fields the API supports — no data requires direct API calls to set
- **SC-CCM-002**: All existing 18 backend tests continue to pass after frontend changes — zero regressions
- **SC-CCM-003**: Form validation catches invalid ABN, email, and required fields client-side before submission — 0% of preventable validation errors reach the server
- **SC-CCM-004**: Read-only users (auditor, client) can view full contact details without encountering edit controls — verified by role-based UI rendering
- **SC-CCM-005**: Archived contacts are excluded from the default list view and can be toggled visible — matching the API's `include_archived` parameter behaviour
- **SC-CCM-006**: TypeScript types are correct — `payment_terms` is `string | null`, all API response fields are typed, no `any` types

---

## Clarifications

### Session 2026-03-11
- Q: Should detail and edit be the same route (inline toggle), separate routes, or edit-first? -> A: Separate routes — `/contacts/[id]` is read-only detail, `/contacts/[id]/edit` is the edit form
- Q: After creating or updating a contact, where should the user land? -> A: Redirect to detail view (`/contacts/[id]`) with a success toast
- Q: How should the form handle server-side validation errors? -> A: Both — map Laravel 422 field errors to form fields inline, plus a fallback toast for unmapped/general errors (500s, timeouts, permission issues)
- Q: Should all form sections be visible on create, or use progressive disclosure? -> A: All sections visible as stacked cards — one card per section, all expanded on page load. Simple and scannable.
- Q: Do hooks for chart accounts and tax codes exist for the Accounting Defaults dropdowns? -> A: `useAccounts()` exists (filterable by type for revenue/expense). `useTaxCodes()` needs to be created — API endpoint `GET /tax-codes` exists.
- Q: ABN space handling? -> A: Strip spaces automatically before validation and submission (default)
- Q: 404 for non-existent contact? -> A: Redirect to `/contacts` (default)
- Q: Toast/notification system? -> A: Use sonner (already in project) for success/error toasts
