---
title: "Idea Brief: In-App Notifications & Activity Feed"
---

# Idea Brief: In-App Notifications & Activity Feed

**Created**: 2026-03-15
**Author**: —

---

## Problem Statement (What)

- Users have no visibility of activity happening in their workspace — everything is silent until they navigate to the relevant section and look
- Journal entries submitted for approval sit unactioned because approvers have no signal that something is waiting for them
- Invoices sent to clients, bank feeds synced, job share links viewed by clients, payments received — all happen without any in-app acknowledgment
- Approval workflows that depend on a bookkeeper submitting and an approver acting require manual coordination outside the product (email, Slack, phone)
- The CPV epic (022) creates a moment where a client views a builder's job dashboard — currently that moment is invisible to the builder, killing the potential viral loop
- Users must poll every section of the app to answer "did it work?" — this creates anxiety and erodes trust in the platform

**Current State**: Zero in-app notifications exist. All domain events fire and are stored (Spatie event sourcing) but nothing surfaces them to users in real time. Workspace activity is only discoverable by manually navigating to each domain section.

---

## Possible Solution (How)

- **Notification bell in the header** — badge count of unread notifications; clicking opens a panel listing recent notifications with timestamps, mark-as-read, and mark-all-read actions
- **Activity feed panel** — slide-in panel (or dedicated page) showing a chronological workspace activity feed, filterable by domain (invoicing, banking, approvals, jobs)
- **Domain event listeners** — server-side listeners on existing Spatie event-sourcing events that create `Notification` records in the database
- **Key notification triggers (MVP)**:
  - Journal entry submitted for approval → notify approvers
  - Journal entry approved / rejected → notify submitter
  - Invoice sent → notify workspace owners/accountants
  - Invoice viewed by client → notify sender
  - Invoice paid / overdue → notify relevant users
  - Bill due within 7 days → notify bookkeeper/owner
  - Bank feed synced successfully / sync error → notify owner/accountant
  - Job share link viewed by client (022-CPV) → notify the job owner
  - Workspace invitation accepted → notify workspace owner
  - Ownership transfer requested / accepted → notify both parties
- **Mark as read / mark all read** — per-notification and bulk actions
- **Notification preferences** — per-user, per-workspace toggle by category (approvals, invoicing, banking, jobs); stored as JSON on a `notification_preferences` table or column
- **Real-time delivery** — Laravel Broadcasting via Reverb (self-hosted) or Pusher; front-end listens via Laravel Echo for instant bell badge updates without polling

**Example**:
```
// Before
Bookkeeper submits journal entry → JournalEntrySubmitted event stored → nothing visible
Client opens job share link → JobShareLinkViewed event stored → builder has no idea

// After
Bookkeeper submits → JournalEntrySubmitted listener creates Notification → approver sees bell badge increment in real time
Client opens job share link → listener creates Notification → builder gets "🔗 Client viewed your Job Dashboard" in their bell panel
```

---

## Benefits (Why)

**Workflow velocity**:
- Approval workflows (bookkeeper → approver) become self-driving — no manual coordination needed to move an entry from submitted to approved
- Bill due reminders prevent missed payments without requiring users to check the bills list daily

**User retention**:
- Keeps users in the app — a notification that surfaces in the bell is actioned in-app rather than triggering an outbound context-switch
- Reduces "did it work?" anxiety that drives users to navigate away and check manually

**Viral moment (CPV tie-in)**:
- The job-share-link-viewed notification is the emotional payoff of the 022-CPV epic — the builder built their job dashboard, shared it, and now they see "your client just viewed it." This is a shareable, memorable product moment.

**Platform maturity**:
- A notification system is table-stakes for a modern SaaS product — its absence makes the platform feel unfinished
- Activity feeds are a natural precursor to audit log surfacing and team collaboration features

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
- Reverb (Laravel's first-party WebSocket server) is the preferred real-time transport — avoids Pusher costs at early scale, self-hosted on the same infrastructure
- Notifications are workspace-scoped — a user in multiple workspaces receives separate notification streams per workspace
- Notification preferences are per-user per-workspace — one user may want approval alerts in Workspace A but not Workspace B
- Retention: notifications older than 90 days are soft-deleted; the activity feed shows the last 30 days by default
- MVP does not include push notifications to mobile browsers (PWA) — web only

**Dependencies**:
- **022-CPV** — `JobShareLinkViewed` event must exist and carry enough payload (job ID, viewer IP/timestamp) for the notification listener to act on
- **023-EML** — email notification delivery for users who are offline when an event fires (bell handles online users; email handles offline); 023 should ship first or in parallel
- **002-CLE / Spatie event sourcing** — all domain events already fire and are stored; this epic adds listeners on top of the existing event infrastructure
- **005-IAR / InvoiceAggregate** — `InvoiceSent`, `InvoicePaid` events exist; listeners hook into them directly

**Risks**:
- WebSocket infrastructure adds operational complexity (Reverb process management, horizontal scaling) — MEDIUM → Mitigation: start with polling fallback (`/api/notifications/unread-count` on a 30-second interval) in Sprint 1; add real-time WebSocket in Sprint 2 once the data layer is solid
- Notification volume at scale — a workspace with high transaction throughput could generate hundreds of notifications per day → Mitigation: notification deduplication (one "bank feed synced" per sync job, not one per transaction) and per-category preference opt-outs
- Scope creep — activity feeds can grow to include every model change (audit-log style) → Mitigation: MVP is explicitly limited to the trigger list above; full audit log is a separate epic

---

## Estimated Effort

**2 sprints**

- **Sprint 1**: Backend — `Notification` model + migration, domain event listeners for MVP trigger list, `notification_preferences` model, REST API (`GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`, `GET/PATCH /notification-preferences`), polling-based unread count endpoint
- **Sprint 2**: Frontend — notification bell component in app header with badge count, slide-in notification panel, activity feed list with domain filter tabs, mark-read interactions, notification preferences UI in Settings; wire up Laravel Echo + Reverb for real-time badge updates

---

## Proceed to PRD?

**YES** — Approval workflow friction is a reported pain point that this directly resolves. The CPV viral moment (job share viewed) has no payoff without this notification. Both are high-value, and the backend data layer is straightforward given existing event infrastructure.

---

## Decision

- [ ] **Approved** - Proceed to PRD
- [ ] **Needs More Information** - [What's needed?]
- [ ] **Declined** - [Reason]

**Approval Date**: —

---

## Key Decisions to Clarify in Spec

1. **Real-time transport**: Reverb (self-hosted) vs Pusher (managed) vs polling-only for MVP — cost, ops complexity, and timeline trade-offs
2. **Bell vs full activity feed vs both**: Is the notification bell sufficient for MVP, or does the full chronological feed ship in the same sprint?
3. **Preference granularity**: Per-category toggle (approvals, invoicing, banking, jobs) vs per-event-type toggle — finer control increases implementation cost significantly
4. **Full trigger list vs MVP subset**: The list above is already scoped to MVP; confirm which items are must-have for launch vs can-follow
5. **Retention period**: 90 days hard delete vs soft-delete forever vs user-configurable

---

## Next Steps

**If Approved**:
1. [ ] Assign RACI (owner, accountable, consulted)
2. [ ] Confirm real-time transport decision (Reverb vs Pusher vs polling)
3. [ ] Confirm MVP notification trigger list with product owner
4. [ ] Run `/speckit-specify` to produce spec.md
5. [ ] Run `/trilogy-clarify spec` to lock down notification preferences scope and retention policy
