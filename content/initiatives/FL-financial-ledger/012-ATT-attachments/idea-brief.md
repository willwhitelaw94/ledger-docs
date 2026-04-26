---
title: "Idea Brief: File Attachments"
---

# Idea Brief: File Attachments

**Created**: 2026-03-11
**Author**: William Whitelaw

---

## Problem Statement (What)

- Accounting objects (invoices, journal entries, bank transactions, contacts, jobs) have no way to store supporting documents
- Users must manage receipts, source documents, and evidence outside the system — losing audit trail linkage
- No way to attach supplier invoices, expense receipts, or bank statements to their corresponding ledger entries
- Compliance and audit readiness suffer without document attachment capability

**Current State**: All supporting documents live outside MoneyQuest Ledger. Users manually cross-reference files stored in email, cloud drives, or local folders.

---

## Possible Solution (How)

- Polymorphic `attachments` table linking files to any accounting object
- Upload, list, download, and delete endpoints per parent object (Xero-style API)
- Laravel filesystem abstraction: `local` disk for dev/testing, `s3` disk for production
- Multi-tenant file namespacing: `{tenant_id}/{object_type}/{object_uuid}/` path structure
- File constraints: size limits, MIME type allowlist, max attachments per object
- `Storage::fake()` for all test coverage — no real filesystem needed in CI

**Key features:**
- Attach files to: Invoices, Journal Entries, Bank Transactions, Contacts, Jobs
- Inline file preview for images and PDFs in the frontend
- Drag-and-drop upload in the Next.js UI
- Signed temporary URLs for secure S3 downloads

```
// Before
1. Create invoice in MoneyQuest
2. Save receipt PDF to Google Drive
3. Manually note "see Drive folder X" in invoice memo

// After
1. Create invoice in MoneyQuest
2. Drag receipt PDF onto invoice → attached and stored
3. Auditor clicks attachment to view/download directly
```

---

## Benefits (Why)

**User/Client Experience**:
- Eliminates context switching between ledger and file storage
- One-click access to supporting documents from any accounting object

**Operational Efficiency**:
- Reduces time spent cross-referencing documents
- Streamlines audit preparation — all evidence co-located with entries

**Business Value**:
- Table-stakes feature for accounting software — expected by users migrating from Xero/MYOB/QBO
- Improves compliance posture for regulated industries

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | William Whitelaw (PO, Dev) |
| **A** | — |
| **C** | — |
| **I** | — |

---

## Assumptions & Dependencies, Risks

**Assumptions**:
- Laravel filesystem abstraction is sufficient for both local and S3 storage
- File uploads will be direct (not chunked/resumable) for MVP — files under 20MB
- Existing polymorphic pattern is acceptable for linking attachments to multiple object types

**Dependencies**:
- AWS S3 bucket provisioned for production (can proceed with local disk for now)
- Existing parent objects (invoices, JEs, bank transactions, contacts, jobs) are complete

**Risks**:
- Large file uploads on slow connections (MEDIUM) → Mitigation: enforce size limits, consider chunked uploads in future iteration
- Storage costs scaling with tenant usage (LOW) → Mitigation: per-tenant storage quotas in billing tier

---

## Estimated Effort

**S — 1 sprint**, approximately 8-13 story points

- **Sprint 1**: Backend (migration, model, policy, action, API endpoints, tests) + Frontend (upload component, attachment list, download)

---

## Proceed to PRD?

**YES** — Table-stakes feature with clear scope and well-understood patterns (Laravel filesystem, polymorphic relations). Low risk, high value.

---

## Decision

- [ ] **Approved** - Proceed to PRD
- [ ] **Needs More Information** - [What's needed?]
- [ ] **Declined** - [Reason]

**Approval Date**: [YYYY-MM-DD]

---

## Next Steps

**If Approved**:
1. [ ] `/trilogy-idea-handover` — Gate 0 validation
2. [ ] `/speckit-specify` — Full specification
3. [ ] `/speckit-plan` — Implementation plan

**Refinement (optional)**:
- `/trilogy-clarify business` — Refine business outcomes
- `/trilogy-research` — Gather context from similar implementations
