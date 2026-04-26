---
title: "Idea Brief: Email Infrastructure & Transactional Notifications"
---

# Idea Brief: Email Infrastructure & Transactional Notifications

**Created**: 2026-03-14
**Author**: —

---

## Problem Statement (What)

- No transactional email driver is configured — Laravel/Fortify auth emails (registration confirmation, password reset) are generated but silently discarded
- Workspace invitations exist in the database (`WorkspaceInvitation` model, migration live) but cannot be delivered to the invitee
- The CPV epic (022) builds share links for client-facing job views — without email delivery, those links can only be copied manually; clients are never notified
- No product notification layer exists for any domain event (invoice sent, payment received, overdue invoice, job share)
- Local development has no way to inspect or preview outgoing emails

**Current State**: Zero emails are delivered in any environment. All Fortify auth flows silently fail email delivery. Workspace invitations are unusable. The CPV share-link feature (022) ships without the email call-to-action that makes it viral.

---

## Possible Solution (How)

- **Resend as mail driver** — configure Laravel mail to use Resend (API key, sending domain, DNS records)
- **Auth emails** — registration confirmation and password reset wired up and rendering with branded MoneyQuest templates
- **Invitation email** — trigger on `WorkspaceInvitation` creation; deliver invite link with sender name, workspace name, and expiry date
- **Domain event notifications** — queue-driven emails triggered by existing Spatie event-sourcing events:
  - `InvoiceSent` → email copy of invoice to client contact
  - Payment received → confirmation to payer contact
  - Job share link created (CPV) → share link email to homeowner/client
  - Overdue invoice → reminder to client contact
- **Branded HTML templates** — MoneyQuest teal/white card layout, consistent across all email types
- **Email preferences** — per-user opt-out per notification category (not applicable to auth emails)
- **Local dev** — Mailpit integration; emails visible at `localhost:8025` without any real delivery

**Example**:
```
// Before
User is invited to workspace → invitation record saved → nothing sent
Client invoice is sent → InvoiceSent event fired → nothing emailed

// After
User is invited → invitation record saved → branded invitation email delivered via Resend
Client invoice is sent → InvoiceSent event fired → PDF email copy delivered to client contact
```

---

## Benefits (Why)

**Product completeness**:
- Workspace invitations become functional — currently 0% of invitations reach the invitee
- CPV share links can be emailed to clients, enabling the viral loop that justifies the 022 epic

**User trust**:
- Auth emails (password reset, email confirmation) are table-stakes for any SaaS product — their absence erodes trust in the platform

**Operational efficiency**:
- Automated invoice delivery and payment confirmations remove a manual step bookkeepers currently handle outside the system
- Overdue reminders can replace ad-hoc follow-up

**ROI**: Enables the CPV share-link feature (022) to drive client adoption, which is the primary growth lever identified in that epic. Without email, the viral mechanic is broken.

---

## Owner (Who)

— (Accountable: to be assigned)

---

## Other Stakeholders

| Role | Person |
|------|--------|
| **R** | — |
| **A** | — |
| **C** | — |
| **I** | — |

---

## Assumptions & Dependencies, Risks

**Assumptions**:
- Resend is the preferred provider (vs SendGrid, Postmark) — low-cost, developer-friendly, strong Laravel integration
- Sending domain will be a subdomain of the MoneyQuest domain (e.g., `mail.moneyquest.app`)
- User contacts on invoices/jobs have valid email addresses — notification delivery assumes email is present

**Dependencies**:
- **022-CPV** — share link email is the primary immediate unlock this epic provides; CPV should not ship without it
- **003-AUT** — Fortify auth is already wired; this epic adds the mail driver and templates it needs
- **005-IAR / InvoiceAggregate** — `InvoiceSent` event exists; notification listener hooks into it
- **013-WSP** — `WorkspaceInvitation` model and migration exist; this epic sends the email

**Risks**:
- DNS misconfiguration delays sending domain verification (MEDIUM) → Mitigation: configure DNS early in Sprint 1, allow buffer before dependent features launch
- Email deliverability issues if domain reputation is new (LOW) → Mitigation: Resend handles reputation management; warm-up period not required for low volume
- User preferences scope creep — preferences UI can grow large (LOW) → Mitigation: MVP is a simple opt-out toggle per category; full preferences centre is future scope

---

## Estimated Effort

**2 sprints**

- **Sprint 1**: Provider setup + auth emails + invitation email — Resend configured, DNS verified, Mailpit for local dev, registration/password-reset templates live, workspace invitation email live
- **Sprint 2**: Domain event notifications + branded templates + email preferences — `InvoiceSent` listener, payment confirmation, CPV share link email, overdue reminder, per-user opt-out

---

## Proceed to PRD?

**YES** — CPV (022) is blocked on share link email delivery. Auth emails are a pre-launch requirement. Both are low-complexity but high-impact.

---

## Decision

- [ ] **Approved** - Proceed to PRD
- [ ] **Needs More Information** - [What's needed?]
- [ ] **Declined** - [Reason]

**Approval Date**: —

---

## Next Steps

**If Approved**:
1. [ ] Assign RACI (owner, accountable, consulted)
2. [ ] Register sending domain with Resend; plan DNS changes
3. [ ] Run `/speckit-specify` to produce spec.md
4. [ ] Run `/trilogy-clarify spec` to lock down notification triggers and preferences scope
