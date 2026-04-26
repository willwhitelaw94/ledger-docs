---
title: "Idea Brief: Document Storage Integration"
---

# Idea Brief: Document Storage Integration

**Created**: 2026-03-21 | **Updated**: 2026-03-22 | **Author**: William Whitelaw

---

## Problem Statement (What)

- Signed documents (059-DGS) live in isolated storage and never appear in the workspace file explorer (056-FEX)
- Generated documents (invoices, reports, wills) have no automatic path into the workspace file system
- Files cannot be sent for signing without re-uploading through the signing flow
- No auto-filing rules -- documents should land in the right folder without manual organisation
- File activity (uploads, moves, links) is not logged

**Current State**: Three disconnected document systems -- file explorer (056-FEX), signing (059-DGS), and attachments (012-ATT) -- with no bridges between them.

---

## Possible Solution (How)

### 1. Signed Documents Auto-File into File Explorer
- On signing completion, auto-create a `File` record in "Signed Documents" folder
- File references the signed PDF path -- no duplication

### 2. Generated Document Auto-Filing
- When any module generates a PDF, auto-create a `File` record
- `AutoFileRule` model maps document types to target folders per workspace

### 3. File Copy Operation
- Copy file to another folder; extends existing bulk operations (move + delete)

### 4. File Activity Logging
- Log events: uploaded, moved, copied, linked, auto-filed, sent_for_signing
- Timeline on file detail panel, combinable with signing audit trail

### 5. Send for Signing from File Explorer
- "Send for Signing" on any PDF creates a draft `SigningDocument` without re-uploading
- Signed copy auto-files back after completion

---

## Benefits (Why)

**User/Client Experience**:
- One place to find all documents -- signed, generated, and uploaded
- No re-uploading between systems; no manual folder sorting
- Clear document lifecycle visible at a glance

**Operational Efficiency**:
- Auto-filing eliminates manual document organisation
- Practice advisors see signed document status directly in file explorer
- Reduces "where did that signed copy go?" support queries

**Business Value**:
- Enables the will builder (060-WEP) to deliver a complete generate-sign-store experience
- Makes signing + file storage feel like one product, not two bolted-on features
- Platform stickiness -- users store important documents here, not Dropbox

**ROI**: Foundational infrastructure that multiplies value of 056-FEX, 059-DGS, and every future document-generating module.

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | William Whitelaw (PO, Dev) |
| **A** | -- |
| **C** | -- |
| **I** | -- |

---

## Assumptions & Dependencies, Risks

**Dependencies**: 056-FEX (complete), 059-DGS (complete), 060-WEP (first consumer)

**Risks**: File path duplication (MEDIUM) -- mitigated by referencing storage paths, not copying files. Permission complexity (LOW) -- file inherits workspace permissions.

---

## Estimated Effort

**M (Medium) -- 2 sprints**

- **Sprint 1**: Signed doc auto-filing, auto-file rules model, file copy operation, file activity logging
- **Sprint 2**: Send for signing from file explorer, generated document auto-filing hooks, workspace document settings UI

---

## Proceed to PRD?

**YES** -- This is the glue between three existing systems. Without it, signing and file storage feel disconnected. Required before the will builder (060-WEP) can deliver a complete experience.

---

## Decision

- [ ] **Approved** - Proceed to PRD
- [ ] **Needs More Information** - [What's needed?]
- [ ] **Declined** - [Reason]

**Approval Date**: --

---

## Next Steps

**If Approved**:
1. [ ] `/trilogy-idea-handover` -- Gate 0 validation + create Linear epic
2. [ ] `/speckit-specify` -- Generate full specification
3. [ ] `/trilogy-clarify` -- Refine requirements

**If Declined**:
- Build ad-hoc integration points as needed per module
