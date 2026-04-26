---
title: "Gate 3: Architecture Check — Accountant & Practice Management"
description: "Architecture gate results for Accountant & Practice Management implementation plan."
---

# Gate 3 Architecture Checklist: 015-ACT

**Date**: 2026-03-14
**Plan**: [Implementation Plan](/initiatives/FL-financial-ledger/015-ACT-accountant-practice-management/plan)
**Result**: PASS (with noted items)

---

## 1. Technical Feasibility

| Check | Result | Notes |
|-------|--------|-------|
| Architecture approach clear | PASS | All seven features have clearly defined approaches |
| Existing patterns leveraged | PASS | Lorisleiva Actions, Spatie Permission, existing report actions reused |
| No impossible requirements | PASS | All spec items are buildable with current stack |
| Performance considered | PASS | Advisor dashboard 5s target addressed; bulk reports 60s target addressed with synchronous approach and queued fallback |
| Security considered | PASS | Cross-tenant isolation explicitly designed; practice note privacy enforced at model layer |

---

## 2. Data & Integration

| Check | Result | Notes |
|-------|--------|-------|
| Data model understood | PASS | Four new tables, two modified tables, all fields and relationships defined in data-model.md |
| API contracts clear | PASS | All endpoints defined with method, path, request/response shapes, and auth requirements |
| Dependencies identified | PASS | barryvdh/laravel-dompdf for PDF export; `ZipArchive` (PHP built-in); Laravel Mail for invitations |
| Integration points mapped | PASS | Builds on existing JournalEntryAggregate, existing report actions, existing InviteUser/WorkspaceInvitation |
| DTO persistence explicit | PASS | No `->toArray()` passed directly to ORM; Form Requests use validated array; Data classes only where nested payloads require them |

---

## 3. Implementation Approach

| Check | Result | Notes |
|-------|--------|-------|
| File changes identified | PASS | All new files listed by layer (migrations, models, actions, controllers, resources, policies, frontend hooks, frontend pages) |
| Risk areas noted | PASS | Six risks documented with mitigations in plan.md |
| Testing approach defined | PASS | Pest feature tests per endpoint, authorization tests per policy, event sourcing unit tests |
| Rollback possible | PASS | All changes are additive migrations + new code; existing code is minimally modified |

---

## 4. Resource & Scope

| Check | Result | Notes |
|-------|--------|-------|
| Scope matches spec | PASS | All 35 functional requirements addressed; explicitly excluded items from spec out-of-scope section not implemented |
| Effort reasonable | PASS | Three phases with clear parallelisation map; XL effort estimate matches scope |
| Skills available | PASS | All required skills match existing codebase patterns |

---

## 5. Laravel & Cross-Platform Best Practices

| Check | Result | Notes |
|-------|--------|-------|
| No hardcoded business logic in frontend | PASS | Role checks, counts, and permissions all computed server-side; frontend renders API response |
| Cross-platform reusability | PASS | All business logic in Actions; controllers are thin delegates |
| Laravel Data for validation | NOTE | Simple flat fields use Form Request `validated()` directly per CLAUDE.md conventions; Data classes only for complex nested payloads (none in this epic require Data classes) |
| Model route binding | PASS | Controllers accept model instances via route model binding (e.g. `OwnershipTransfer $transfer`) |
| No magic numbers/IDs | PASS | No hardcoded IDs; all references via model relationships |
| Common components pure | PASS | Frontend shared components (modal, combobox, dialog) contain no business logic |
| Use Lorisleiva Actions | PASS | All business logic in Actions with `AsAction` trait |
| Action authorization in authorize() | PASS | Form Requests perform authorization via `authorize()` → Policy |
| Data classes remain anemic | PASS | No Data classes planned for this epic; no risk of business logic in DTOs |
| Migrations schema-only | PASS | All migrations are schema-only; data seeding in RolesAndPermissionsSeeder update |
| Models have single responsibility | PASS | Each new model owns one domain concept |
| Granular model policies | PASS | PracticeClientPolicy, OwnershipTransferPolicy, ReclassificationPolicy each with specific methods |
| Response objects in auth | FAIL-RISK | Existing policies use `return bool` — this epic follows the same pattern for consistency. Technical debt: should return `Response::allow()/deny()` but changing existing pattern is out of scope |
| Event sourcing: granular events | PASS | `JournalEntryLineReclassified` is the most granular fact; includes all data needed to rebuild state |
| Semantic column documentation | PASS | PHPDoc on `reclassified_at`, `post_transfer_role`, `occurred_at` planned |
| Feature flags dual-gated | N/A | No feature flags planned for this epic; advisor dashboard is available to all authenticated users with 2+ workspaces |

---

## 6. Frontend TypeScript Standards (Next.js/React — per CLAUDE.md overrides)

| Check | Result | Notes |
|-------|--------|-------|
| All components use TypeScript | PASS | All planned `.tsx` files will use strict TypeScript |
| Props typed with interfaces/types | PASS | `type Props = { ... }` with destructured typing |
| No `any` types planned | PASS | All API response types defined in `types/` (see data-model.md and plan type definitions) — one exception: `BulkReportResult.report_data` typed as `unknown` pending report type union definition |
| Shared types identified | PASS | `AdvisorWorkspace`, `PracticeClient`, `PracticeNote`, `OwnershipTransfer`, `Reclassification`, `BulkReportResult` defined in shared `types/` |
| Component library reused | PASS | shadcn/ui `Dialog`, `Select`, `Combobox`, `Badge`, `Button`, `Skeleton` reused; no bespoke UI primitives |
| Server/client components explicit | PASS | All new pages are `'use client'` (they require state and effects); no server components needed |
| Data fetching via TanStack Query | PASS | All server state via `useQuery`/`useMutation` hooks |
| Client state via Zustand | PASS | Filter state on advisor dashboard uses local `useState` (single-component, not shared) — no Zustand needed; multi-workspace context uses existing `useWorkspaceStore` |
| Forms use React Hook Form + Zod | PASS | Reclassify modal, ownership transfer modal, practice note form, bulk report config form all use RHF + Zod |
| API client typed | PASS | All hooks define typed request payloads and typed query return types |

**Red Flags Check**:
- Plan uses `any` types for API responses: NO (all responses typed; `report_data` is `unknown`)
- No distinction between server and client components: NO (all pages explicitly `'use client'`)
- Form state in useState instead of React Hook Form: NO (all forms use RHF)
- API calls without typed responses: NO
- Business logic in React components: NO
- State management via React Context for complex/shared state: NO (Zustand used where needed)

---

## 7. Event Sourcing Standards

| Check | Result | Notes |
|-------|--------|-------|
| Aggregate roots identified | PASS | `JournalEntryAggregate` extended with `reclassifyLine()` method |
| Events are granular facts | PASS | `JournalEntryLineReclassified` carries full payload for future replay |
| Events carry full payload | PASS | `reversalUuid` and `correctingUuid` pre-generated and stored in event so replay can recreate exact UUIDs |
| Projectors identified | PASS | New `ReclassificationProjector` (or extended `JournalEntryProjector`) handles `onJournalEntryLineReclassified` |
| Single projector queue | PASS | Existing queue config unchanged (synchronous per `config/event-sourcing.php`) |
| Snapshots planned | PASS | Existing snapshot strategy (every 100 events) applies to JournalEntryAggregate |
| Replay strategy documented | PASS | Replay of `JournalEntryLineReclassified` recreates reversing + correcting JEs using UUID from event payload; deterministic |

---

## 8. Multi-Tenancy Standards

| Check | Result | Notes |
|-------|--------|-------|
| All tenant models scoped | PASS | `OwnershipTransfer` and `Reclassification` are in `App\Models\Tenant\` namespace with `workspace_id`; `PracticeClient` and `PracticeNote` are intentionally central (cross-tenant by design) |
| Central vs tenant separation clear | PASS | Practice tables are explicitly central (personal to user, not workspace-scoped); all other new models are tenant-scoped |
| No cross-tenant queries | PASS | `GetAdvisorDashboard` iterates `$user->workspaces()` and queries each workspace independently — never `JournalEntry::whereIn('workspace_id', [all_ids])` |
| Tenant context set in middleware | PASS | `SetWorkspaceContext` middleware remains unchanged; advisor/practice/bulk-report endpoints bypass it intentionally and perform their own per-workspace context setting via `setPermissionsTeamId()` |
| Tests verify isolation | PASS | Plan includes cross-tenant isolation tests in `AdvisorDashboardTest` and `PracticeClientTest` |

---

## Summary

**Overall Result**: PASS

**Items requiring attention during implementation**:
1. Response objects in policies — existing `bool` return pattern is technical debt. Not fixed in this epic to avoid scope creep, but flagged.
2. `BulkReportResult.report_data` typed as `unknown` — should be narrowed to a union of the three report shape types once existing report TypeScript types are confirmed.
3. PDF export dependency (`barryvdh/laravel-dompdf`) must be confirmed in `composer.json` before Phase 2 begins.
4. No in-app notification system — email-only in Phase 1. In-app notifications deferred to subsequent epic.
5. Open spec question on locked-period reclassification override — plan follows conservative interpretation (no override).
