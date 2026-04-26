---
title: "Implementation Plan: Accountant & Practice Management"
description: "Full technical implementation plan for 015-ACT — cross-workspace advisor dashboard, practice client list, invite acceptance flow, ownership transfer, transaction reclassification, and bulk reporting."
---

# Implementation Plan: Accountant & Practice Management

**Branch**: `015-ACT-accountant-practice-management`
**Date**: 2026-03-14
**Spec**: [/initiatives/FL-financial-ledger/015-ACT-accountant-practice-management/spec](/initiatives/FL-financial-ledger/015-ACT-accountant-practice-management/spec)
**Gate 3**: [/initiatives/FL-financial-ledger/015-ACT-accountant-practice-management/checklists/gate3](/initiatives/FL-financial-ledger/015-ACT-accountant-practice-management/checklists/gate3)
**Data Model**: [/initiatives/FL-financial-ledger/015-ACT-accountant-practice-management/data-model](/initiatives/FL-financial-ledger/015-ACT-accountant-practice-management/data-model)

---

## Summary

This plan delivers seven capabilities across backend and frontend for accountant-led practice management. The core constraint is that this epic crosses workspace boundaries — the advisor dashboard aggregates data from multiple workspaces, but each query must be independently authorized with no possibility of cross-tenant data leakage. The reclassification feature extends the existing event-sourced journal entry system by introducing a new aggregate method and event type rather than any direct mutation.

Already built and out of scope for re-implementation:
- `WorkspaceInvitation` model and migration
- `InviteUser` action (existing users + pending tokens, separation of duties)
- `POST /api/v1/workspaces/{id}/invite` and `GET /api/v1/workspaces/{id}/members` endpoints
- `RolesAndPermissionsSeeder` (6 roles, 44 permissions, Spatie Permission teams mode)
- `SetWorkspaceContext` middleware

---

## Technical Context

**Language/Version**: PHP 8.4, Laravel 12, Next.js 16 (React 19, TypeScript strict)
**Primary Dependencies**: Spatie laravel-event-sourcing v7, Lorisleiva Actions, Spatie Permission (teams mode), TanStack Query v5, React Hook Form + Zod, Tailwind CSS, shadcn/ui
**Storage**: SQLite (local dev), MySQL/Postgres (production)
**Testing**: Pest v4, pestphp/pest-plugin-browser v4 (Playwright)
**Target Platform**: Laravel API + Next.js SPA
**Performance Goals**: Advisor dashboard for 10 workspaces renders in under 5 seconds; bulk reports for 10 workspaces complete in under 60 seconds
**Constraints**: Zero cross-tenant data leakage; ownership transfer requires recipient acceptance; reclassification must use event sourcing, never direct mutation
**Scale/Scope**: Multi-workspace per user; practice client notes are personal to author; reclassification audit trail is immutable

---

## Gate 3 Architecture Check

See [gate3 checklist](/initiatives/FL-financial-ledger/015-ACT-accountant-practice-management/checklists/gate3) for full pass/fail matrix. Summary:

- All checks PASS
- One flag requiring care: Cross-tenant advisor dashboard query — mitigated by the `GetAdvisorDashboard` action querying each workspace independently using `$user->workspaces()` scope, never raw cross-workspace joins
- One open spec question: Whether accountant/owner can override locked-period restriction for reclassification (spec FR-027 says "system prevents reclassification" for locked periods without override — plan follows the spec conservatively: no override)

---

## Data Model

See [data-model.md](/initiatives/FL-financial-ledger/015-ACT-accountant-practice-management/data-model) for full entity definitions.

### New Tables Summary

| Table | Model | Scope |
|-------|-------|-------|
| `practice_clients` | `PracticeClient` | Central (user_id + workspace_id, personal) |
| `practice_notes` | `PracticeNote` | Central (practice_client_id + user_id) |
| `ownership_transfers` | `OwnershipTransfer` | Tenant-scoped (workspace_id) |
| `reclassifications` | `Reclassification` | Tenant-scoped (workspace_id) |

### Modified Tables

| Table | Change |
|-------|--------|
| `workspace_invitations` | Add `status` enum column (`pending`, `accepted`, `expired`), `accepted_at`, `invited_by_user_id`, `resend_count` |
| `journal_entry_lines` | Add `reclassified_at` timestamp, `reclassification_id` nullable FK |

---

## API Contracts

All workspace-scoped endpoints require `auth:sanctum` + `SetWorkspaceContext` middleware and the `X-Workspace-Id` header. Cross-workspace endpoints (advisor dashboard, practice clients, bulk reports) require `auth:sanctum` only — they perform per-workspace authorization internally.

### Cross-Workspace Endpoints (no SetWorkspaceContext)

**GET /api/v1/advisor/dashboard**
Query params: none
Response:
