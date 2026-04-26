---
title: "Implementation Tasks: Contacts & Client Management Frontend Uplift"
---

# Implementation Tasks: Contacts & Client Management Frontend Uplift

**Spec**: `spec.md` | **Plan**: `plan.md` | **Mode**: AI | **Date**: 2026-03-11

---

## Phase 1: Foundation (Types, Hooks, Constants)

- [X] T001 [P] [US1] Fix `payment_terms` type in `frontend/src/types/index.ts` — change `payment_terms: number | null` to `payment_terms: string | null` on the `Contact` interface (line 266)

- [X] T002 [P] [US1] Create `frontend/src/hooks/use-tax-codes.ts` — TanStack Query hook wrapping `GET /tax-codes`. Return type `TaxCode[]` (type already exists in `types/index.ts`). Pattern: match `use-accounts.ts` structure. Query key: `["tax-codes"]`. Extract `.data.data` from response.

- [X] T003 [US1] Expand payload types in `frontend/src/hooks/use-contacts.ts`:
  - `CreateContactPayload`: add `display_name?: string`, `mobile?: string`, `website?: string`, `abn?: string`, `is_gst_registered?: boolean`, `address_line_1?: string`, `address_line_2?: string`, `city?: string`, `state?: string`, `postcode?: string`, `country?: string`, `default_revenue_account_id?: number | null`, `default_expense_account_id?: number | null`, `default_tax_code?: string`, `payment_terms?: string | null`, `currency?: string`, `notes?: string`
  - `UpdateContactPayload`: make it `Partial<CreateContactPayload>` (already is, will inherit new fields)

- [X] T004 [P] [US1] Create `frontend/src/lib/constants.ts` (or add to existing) — export `PAYMENT_TERMS_OPTIONS` array `[{ value: "due_on_receipt", label: "Due on Receipt" }, { value: "net_7", label: "Net 7 days" }, { value: "net_14", label: "Net 14 days" }, { value: "net_30", label: "Net 30 days" }, { value: "net_60", label: "Net 60 days" }, { value: "net_90", label: "Net 90 days" }]` and `PAYMENT_TERMS_LABELS: Record<string, string>` map for display

---

## Phase 2: Shared Contact Form Component

- [X] T005 [US1] Create `frontend/src/components/contacts/contact-form.tsx` — shared form component used by both create and edit pages. Props: `defaultValues?: Partial<ContactFormValues>`, `onSubmit: (data) => Promise<void>`, `isSubmitting: boolean`, `submitLabel: string`. Implementation:
  - Zod schema with all fields from plan (name required, type required, email optional+validated, ABN strips spaces then validates length 11, country defaults "AU", notes max 2000)
  - React Hook Form with `zodResolver`
  - 6 stacked Card sections: Identity (name, display_name, type Select), Contact Info (email, phone, mobile, website in 2-col grid), Business Details (ABN Input, is_gst_registered Switch), Address (line_1, line_2, city/state/postcode in grid, country), Accounting Defaults (revenue account Select via `useAccounts({type:"revenue"})`, expense account Select via `useAccounts({type:"expense"})`, tax code Select via `useTaxCodes()`, payment_terms Select from PAYMENT_TERMS_OPTIONS, currency Input), Notes (Textarea max 2000)
  - Submit + Cancel buttons at bottom
  - Uses shadcn/ui: Card, CardHeader, CardTitle, CardContent, Input, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Switch, Textarea, Button, Separator
  - Map empty strings to `undefined` before submission (don't send empty strings to API)

---

## Phase 3: Create & Edit Pages [US1, US2]

- [X] T006 [US1] Rewrite `frontend/src/app/(dashboard)/contacts/new/page.tsx` — replace current 4-field form with `ContactForm` component. `onSubmit` calls `createContact.mutateAsync(payload)`, on success: `toast.success("Contact created")` then `router.push(\`/contacts/\${result.id}\`)`. On 422 error: parse `error.response.data.errors` and call `form.setError()` per field. On other errors: `toast.error("Failed to create contact")`.

- [X] T007 [US2] Create `frontend/src/app/(dashboard)/contacts/[id]/edit/page.tsx` — edit page. Uses `use(params)` to get `id`, `useContact(id)` to fetch, `useUpdateContact()` to save. Renders `ContactForm` with `defaultValues` mapped from contact (flatten `address.line_1` → `address_line_1`, etc.). `onSubmit` calls `updateContact.mutateAsync({ id, payload })`, on success: `toast.success("Contact updated")` then `router.push(\`/contacts/\${id}\`)`. Same 422 error handling as T006. Show Skeleton while loading.

---

## Phase 4: Detail View [US3]

- [X] T008 [US3] Create `frontend/src/components/contacts/contact-detail.tsx` — read-only detail component. Props: `contact: Contact`. Renders stacked Cards matching form sections:
  - Identity: name, display_name (if different from name), type badge(s) (reuse existing badge pattern from list page)
  - Contact Info: email (mailto link), phone, mobile, website (external link) — skip section if all null
  - Business Details: ABN formatted, GST badge ("Registered for GST" green badge or "Not registered") — skip section if no ABN and not GST registered
  - Address: formatted multi-line address — skip section if all address fields null
  - Accounting Defaults: revenue account name (fetch via `useAccount(id)` if set), expense account name, tax code, payment terms (human-readable from PAYMENT_TERMS_LABELS), currency — skip section if all null
  - Notes: rendered text — skip section if null

- [X] T009 [US3] Rewrite `frontend/src/app/(dashboard)/contacts/[id]/page.tsx` — convert from edit form to read-only detail view. Uses `useContact(id)` to fetch. Renders `ContactDetail` component. Page actions: "Edit" button linking to `/contacts/[id]/edit` (conditionally shown — always show for now, permission-gating is future work), "Back to Contacts" link. Show Skeleton while loading. If contact not found after loading, redirect to `/contacts` via `router.push`.

---

## Phase 5: List Enhancements [US4]

- [X] T010 [US4] Update `frontend/src/app/(dashboard)/contacts/page.tsx` — add columns to TanStack Table:
  - Add "Location" column after "Phone": accessor function returns `[contact.address?.city, contact.address?.state].filter(Boolean).join(", ")` or "—" if both null
  - Add "GST" column after "Location": render green `<Badge>` with "GST" text if `is_gst_registered`, otherwise nothing
  - Update row click to navigate to `/contacts/[id]` (detail) instead of edit

- [X] T011 [US4] Add archive toggle to contacts list page — add a `<Checkbox>` or `<Switch>` labelled "Show archived" above the DataTable. When toggled, pass `include_archived: true` to `useContacts()` params. Update `useContacts` hook in `use-contacts.ts` to accept and pass `include_archived` param to API. Archived contacts should render with muted text (`text-muted-foreground`) and an "Archived" badge.

---

## Phase 6: Archive & Restore [US5]

- [X] T012 [US5] Update contact detail page (`/contacts/[id]/page.tsx`) — add "Archive" button (destructive variant) that calls `deleteContact.mutateAsync(id)` with confirmation dialog (use `confirm()` for now). On success: `toast.success("Contact archived")`, redirect to `/contacts`. If contact `is_archived`, show "Restore" button instead that calls `updateContact.mutateAsync({ id, payload: { is_archived: false } })`. On restore success: `toast.success("Contact restored")`, invalidate query.

- [X] T013 [US5] Update "Archive" action in list page row actions (`contacts/page.tsx`) — rename "Archive" label (already correct). Wire `onClick` to call `deleteContact.mutateAsync(contact.id)` with `confirm("Archive this contact?")`. On success: `toast.success("Contact archived")`. Import `useDeleteContact` in component scope (may need to lift mutation or use inline).

---

## Phase 7: Code Quality Gate

- [ ] T014 Run `cd frontend && npx tsc --noEmit` to verify zero TypeScript errors across all new/modified files

- [ ] T015 Run `vendor/bin/pest --compact` to verify all 191 existing tests still pass (zero regressions)

- [ ] T016 Audit all new `.tsx` files against Gate 4 frontend checklist:
  - Every file is `.tsx` with strict TypeScript — no `any` types
  - Props destructured with types
  - API response types match Laravel API Resources
  - `'use client'` on all pages with state/effects
  - TanStack Query for all server state
  - React Hook Form + Zod for forms
  - No unused imports or variables
  - No inline styles — Tailwind only
  - Loading and error states handled
  - No `console.log` in production code

- [ ] T017 Run `vendor/bin/pint --dirty` to format any changed PHP files (likely none but verify)

- [ ] T018 Verify browser tests still pass: `vendor/bin/pest tests/Browser/ContactsTest.php` — existing 8 contact browser tests must pass. If any fail due to route changes (detail vs edit), update test expectations.
