---
title: "Idea Brief: Document Governance & Signing"
---

# Idea Brief: Document Governance & Signing

**Created**: 2026-03-20
**Author**: William Whitelaw

---

## Problem Statement (What)

- Practices need clients to sign governance documents (engagement letters, authority to act, privacy consent, year-end sign-offs) but rely on email attachments, wet signatures, or third-party tools like DocuSign
- No in-platform way to send a document for review and capture a legally binding digital signature
- Signed document status is tracked manually — no audit trail of who signed, when, from where
- Clients must leave the platform to sign documents, creating friction and delays
- Practices have no central view of outstanding unsigned documents across all clients

**Current State**: Document attachments exist (012-ATT) and file management is being built (056-FEX), but there is no signature capture, no document review workflow, and no governance tracking.

---

## Possible Solution (How)

### 1. Document Signing Workflow
- Practice uploads a document (PDF) and marks it "requires signature"
- Selects which client contact(s) need to sign
- Document enters a signing pipeline: Draft → Sent → Viewed → Signed (or Declined)
- Email notification sent to client with a link to review and sign

### 2. Client Signing Experience
- Client clicks link or navigates to `/documents/signing` in their dashboard
- Views the document inline (PDF viewer)
- Captures digital signature: typed name + checkbox consent + timestamp + IP address
- Option for drawn signature (canvas-based signature pad)
- Signed document stored with signature metadata as immutable record

### 3. Practice Governance Dashboard
- `/practice/documents` — central view of all documents across clients
- Filter by status: Awaiting, Viewed, Signed, Expired, Declined
- Bulk send (e.g., send engagement letter to all clients for new financial year)
- Resend reminder for overdue signatures
- Download signed copy with signature certificate page appended

### 4. Document Templates
- Practice creates reusable document templates (engagement letter, privacy policy, etc.)
- Templates can include merge fields: `{{client_name}}`, `{{practice_name}}`, `{{date}}`
- Generate personalised documents per client from template
- Template library managed at `/practice/settings/document-templates`

### 5. Audit Trail & Legal Compliance
- Every signature event logged: IP address, user agent, timestamp, user ID
- Signature certificate page appended to signed PDF (like DocuSign)
- Immutable record — signed documents cannot be modified or deleted
- Compliant with Australian Electronic Transactions Act 1999

```
// Before
1. Accountant creates engagement letter in Word
2. Emails PDF to client
3. Client prints, signs, scans, emails back (or ignores)
4. Accountant saves to local folder, updates spreadsheet
5. No audit trail, no reminders, documents get lost

// After
1. Practice selects "Engagement Letter" template → generates for client
2. Client receives notification → clicks "Review & Sign" in MoneyQuest
3. Client reads document inline → types name → confirms → signed
4. Practice dashboard shows "Signed ✓" with timestamp
5. Full audit trail: viewed at, signed at, IP, user agent
```

---

## Benefits (Why)

**User/Client Experience**:
- Sign documents without leaving the platform — 30-second process vs print-scan-email
- Clear visibility of what needs signing and what's been completed
- Mobile-friendly signing experience

**Operational Efficiency**:
- Eliminate manual tracking of document status
- Bulk send governance documents to all clients at once
- Automated reminders reduce follow-up time by estimated 60-70%

**Business Value**:
- Premium feature for practice plans — differentiator vs Xero/MYOB
- Reduces dependency on third-party signing tools (DocuSign costs $25-60/user/month)
- Strengthens compliance posture — immutable audit trail

**ROI**: Practices save 2-4 hours/week on document chasing. Replaces $300-720/year per user in DocuSign fees.

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
- Digital signatures via consent + timestamp + IP are legally sufficient under Australian Electronic Transactions Act 1999 (they are for most commercial documents, excluding certain property/statutory instruments)
- Clients will prefer in-platform signing over email-based alternatives
- PDF rendering in-browser is sufficient (no need for page-by-page annotation)

**Dependencies**:
- 012-ATT (Attachments) — complete, provides file storage infrastructure
- 056-FEX (File Explorer) — provides document management foundation
- 058-CPT (Practice Client Portal) — shared notification and client-facing infrastructure

**Risks**:
- Legal compliance nuance (MEDIUM) → Mitigation: consult with legal on signature requirements; support "witnessed" signatures for higher-assurance documents
- PDF rendering complexity (LOW) → Mitigation: use proven library (react-pdf or pdf.js); start with view-only, not annotation
- Template engine complexity (LOW) → Mitigation: simple string replacement for merge fields; don't build a full document editor

---

## Estimated Effort

**L (Large) — 3-4 sprints**

- **Sprint 1**: Document signing model + upload workflow + signing pipeline states + practice dashboard
- **Sprint 2**: Client signing experience (PDF viewer + signature capture + consent) + email notifications
- **Sprint 3**: Document templates + merge fields + bulk send + reminders
- **Sprint 4**: Audit trail certificate + signed PDF generation + polish + mobile

---

## Proceed to PRD?

**YES** — High-value practice feature that replaces expensive third-party tools. Builds on existing attachment infrastructure. Clear competitive differentiator.

---

## Decision

- [ ] **Approved** - Proceed to PRD
- [ ] **Needs More Information** - [What's needed?]
- [ ] **Declined** - [Reason]

**Approval Date**: —

---

## Next Steps

**If Approved**:
1. [ ] `/trilogy-idea-handover` — Gate 0 validation + create Linear epic
2. [ ] `/speckit-specify` — Generate full specification
3. [ ] `/trilogy-clarify` — Refine requirements across lenses

**If Declined**:
- Evaluate lighter alternative: link-based signing via third-party integration
