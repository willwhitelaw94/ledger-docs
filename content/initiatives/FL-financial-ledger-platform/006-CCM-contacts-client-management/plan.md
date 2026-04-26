---
title: "Implementation Plan: Contacts & Client Management Frontend Uplift"
---

# Implementation Plan: Contacts & Client Management Frontend Uplift

**Spec**: `006-CCM-contacts-client-management/spec.md`
**Created**: 2026-03-11
**Status**: Draft

## Summary

Uplift the Contacts & Client Management frontend from a minimal 4-field form to a full-featured contact management experience. The backend API is complete (18 tests, full CRUD). This plan covers: expanding create/edit forms with all 20+ fields, adding a read-only detail view, improving the list with location/GST columns, fixing TypeScript types, creating the `useTaxCodes()` hook, and implementing archive/restore UX.

## Technical Context

**Backend**: Laravel 12, PHP 8.4 — fully built, no changes needed
**Frontend**: Next.js 16, React 19, TypeScript, TanStack Query v5, React Hook Form + Zod
**UI**: shadcn/ui components, Tailwind CSS
**Testing**: Pest v4 (backend), browser tests via pestphp/pest-plugin-browser
**Auth**: Sanctum cookie-based SPA auth

### Dependencies

| Dependency | Status | Notes |
|-----------|--------|-------|
| `useAccounts()` hook | Exists | Filter by `type: "revenue"` / `type: "expense"` for account dropdowns |
| `useTaxCodes()` hook | **Needs creation** | API `GET /tax-codes` exists, hook does not |
| `useContacts()` hook | Exists | Needs payload type expansion |
| sonner (toast) | Verify | Need to confirm toast library available |
| shadcn/ui components | Exists | Card, Input, Label, Select, Switch, Textarea, Separator, Button, Badge |

### Constraints

- No backend changes — frontend-only epic
- All monetary values as integers (cents) — not relevant for contacts but maintain convention
- Tenant-scoped — all API calls include workspace context via middleware
- ABN: exactly 11 digits, strip spaces client-side before validation

## Gate 3: Architecture Check

### 1. Technical Feasibility — PASS

| Check | Status | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | Standard React form pages with existing patterns |
| Existing patterns leveraged | PASS | Follows invoice/JE form patterns already in codebase |
| No impossible requirements | PASS | All features backed by existing API |
| Performance considered | PASS | No heavy data — contact forms are simple |
| Security considered | PASS | Role-based UI rendering, no new auth surface |

### 2. Data & Integration — PASS

| Check | Status | Notes |
|-------|--------|-------|
| Data model understood | PASS | Contact entity fully defined in API |
| API contracts clear | PASS | Backend complete with 18 tests |
| Dependencies identified | PASS | `useTaxCodes()` hook needed |
| Integration points mapped | PASS | Chart accounts, tax codes dropdowns |

### 3. Implementation Approach — PASS

| Check | Status | Notes |
|-------|--------|-------|
| File changes identified | PASS | See file list below |
| Risk areas noted | PASS | Low risk — frontend-only, API stable |
| Testing approach defined | PASS | Browser tests for form flows |
| Rollback possible | PASS | Git revert, no migrations |

### 4. Resource & Scope — PASS

| Check | Status | Notes |
|-------|--------|-------|
| Scope matches spec | PASS | 5 user stories, no over-engineering |
| Effort reasonable | PASS | Frontend forms and a detail view |
| Skills available | PASS | Standard React/TypeScript |

### 5. Next.js/React Standards (Gate Override) — PASS

| Check | Status | Notes |
|-------|--------|-------|
| All components use TypeScript | PASS | Every `.tsx` file strict TS |
| Props typed with interfaces/types | PASS | Destructured typed props |
| No `any` types | PASS | All API responses typed via `types/index.ts` |
| Shared types in `types/` | PASS | `Contact`, `TaxCode` in shared types |
| Component library reused | PASS | shadcn/ui primitives throughout |
| Server/client components explicit | PASS | All form pages are `'use client'` |
| TanStack Query for server state | PASS | All hooks use TanStack Query |
| Forms use React Hook Form + Zod | PASS | Existing pattern, extended |
| API client typed | PASS | Typed payloads matching Laravel API Resources |

### 6. Component Decomposition — PASS

Contact forms are simple enough that decomposition is by page, not by sub-component directories. The contact form fields are shared between create and edit via a `ContactForm` component.

## Design Decisions

### Route Structure

| Route | Page | Purpose |
|-------|------|---------|
| `/contacts` | List | Existing — enhanced with location, GST, archive toggle |
| `/contacts/new` | Create | Existing — expanded to full form |
| `/contacts/[id]` | Detail | **New** — read-only view with Edit button |
| `/contacts/[id]/edit` | Edit | **New route** — relocated from `[id]` page |

### Form Section Layout (Stacked Cards)

All sections visible on load, one Card per section:

1. **Identity** — name (required), display_name, type (required)
2. **Contact Information** — email, phone, mobile, website
3. **Business Details** — ABN (11 chars, strip spaces), GST registered (switch)
4. **Address** — line_1, line_2, city, state, postcode, country (default AU)
5. **Accounting Defaults** — default revenue account, default expense account, default tax code, payment terms, currency
6. **Notes** — textarea, max 2000 chars

### API Payload Mapping

The API accepts flat address fields but returns nested `address` object:

```
// API response (GET)
{ address: { line_1, line_2, city, state, postcode, country } }

// API request (POST/PATCH) — flat keys
{ address_line_1, address_line_2, city, state, postcode, country }
```

Form must map between these two shapes.

### Error Handling

- **Client-side**: Zod schema validates before submission
- **Server 422**: Parse `errors` object, map to React Hook Form `setError()` per field
- **Server 500/network**: Fallback toast via sonner
- **Success**: Toast + redirect to `/contacts/[id]` detail view

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `frontend/src/app/(dashboard)/contacts/[id]/edit/page.tsx` | Edit form page (full fields) |
| `frontend/src/components/contacts/contact-form.tsx` | Shared form component (create + edit) |
| `frontend/src/components/contacts/contact-detail.tsx` | Read-only detail sections |
| `frontend/src/hooks/use-tax-codes.ts` | TanStack Query hook for `GET /tax-codes` |

### Modified Files

| File | Changes |
|------|---------|
| `frontend/src/types/index.ts` | Fix `payment_terms` to `string \| null`, add `TaxCode` if missing, add `PaymentTerms` type |
| `frontend/src/hooks/use-contacts.ts` | Expand `CreateContactPayload` and `UpdateContactPayload` with all fields |
| `frontend/src/app/(dashboard)/contacts/new/page.tsx` | Replace with full form using `ContactForm` component |
| `frontend/src/app/(dashboard)/contacts/[id]/page.tsx` | Convert from edit to read-only detail view |
| `frontend/src/app/(dashboard)/contacts/page.tsx` | Add location column, GST badge, archive toggle |

### Component Design

#### `ContactForm` (shared between create + edit)

```
Props:
  defaultValues?: Partial<ContactFormValues>  // pre-populated for edit
  onSubmit: (data: ContactFormValues) => Promise<void>
  isSubmitting: boolean
  submitLabel: string  // "Create Contact" | "Save Changes"

Uses:
  - React Hook Form + Zod schema
  - useAccounts({ type: "revenue" }) for revenue account dropdown
  - useAccounts({ type: "expense" }) for expense account dropdown
  - useTaxCodes() for tax code dropdown
  - shadcn/ui: Card, Input, Label, Select, Switch, Textarea, Button
```

#### `ContactDetail` (read-only detail view)

```
Props:
  contact: Contact

Renders:
  - Stacked cards matching form sections
  - Hides empty sections (no address = no address card)
  - Human-readable payment terms
  - GST registration badge
```

### Zod Schema

```typescript
const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  display_name: z.string().optional().or(z.literal("")),
  type: z.enum(["customer", "supplier", "both"]),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  mobile: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  abn: z.string()
    .transform(v => v.replace(/\s/g, ""))  // strip spaces
    .pipe(z.string().length(11, "ABN must be 11 digits").or(z.literal("")))
    .optional(),
  is_gst_registered: z.boolean().default(false),
  address_line_1: z.string().optional().or(z.literal("")),
  address_line_2: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  postcode: z.string().optional().or(z.literal("")),
  country: z.string().length(2).optional().or(z.literal("")).default("AU"),
  default_revenue_account_id: z.number().nullable().optional(),
  default_expense_account_id: z.number().nullable().optional(),
  default_tax_code: z.string().optional().or(z.literal("")),
  payment_terms: z.enum(["due_on_receipt", "net_7", "net_14", "net_30", "net_60", "net_90"]).optional().nullable(),
  currency: z.string().length(3).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});
```

### Payment Terms Display Map

```typescript
const PAYMENT_TERMS_LABELS: Record<string, string> = {
  due_on_receipt: "Due on Receipt",
  net_7: "Net 7 days",
  net_14: "Net 14 days",
  net_30: "Net 30 days",
  net_60: "Net 60 days",
  net_90: "Net 90 days",
};
```

## Implementation Phases

### Phase 1: Foundation (Types, Hooks, Shared Form)

1. Fix `payment_terms` type in `types/index.ts` (`string | null`)
2. Create `use-tax-codes.ts` hook
3. Expand `CreateContactPayload` and `UpdateContactPayload` in `use-contacts.ts`
4. Build `ContactForm` component with full Zod schema and all 6 sections
5. Verify sonner toast is available

### Phase 2: Pages (Create, Edit, Detail)

1. Update `/contacts/new` to use `ContactForm`
2. Create `/contacts/[id]/edit/page.tsx` using `ContactForm` with pre-populated values
3. Convert `/contacts/[id]/page.tsx` to read-only detail view with Edit button
4. Add success toasts and server error mapping
5. Add redirect to detail view after create/edit

### Phase 3: List Enhancements & Archive

1. Add location column (city, state) to contacts list
2. Add GST badge to contacts list
3. Add "Show archived" toggle with `include_archived` API param
4. Update archive/restore actions with proper UX ("Archive" not "Delete")
5. Add archived visual indicator (muted row + badge)

## Testing Strategy

### Browser Tests (Phase 2-3)

- New contact form renders all sections and fields
- Form validation: empty name, invalid email, bad ABN length
- Create contact with all fields → redirects to detail view
- Detail view shows all populated fields, hides empty sections
- Edit page pre-populates all fields
- Archive contact → disappears from list
- Show archived toggle → archived contacts visible with badge

### Manual Verification

- Verify account dropdowns populate from chart of accounts
- Verify tax code dropdown populates
- Verify 422 server errors map to form fields
- Verify read-only roles see no edit controls

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Toast library not installed | Low | Low | Check for sonner, install if needed |
| Account dropdown loads slowly | Low | Low | TanStack Query caching handles this |
| ABN space stripping edge cases | Low | Low | Zod transform handles before validation |

## Next Steps

1. Run `/speckit-tasks` to generate tasks.md
2. Implement Phase 1 → Phase 2 → Phase 3
