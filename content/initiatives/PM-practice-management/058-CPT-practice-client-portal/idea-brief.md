---
title: "Idea Brief: Practice Client Portal"
---

# Idea Brief: Practice Client Portal

**Created**: 2026-03-20
**Author**: William Whitelaw

---

## Problem Statement (What)

- Practices have no way to assign tasks directly to clients or track completion from the client's perspective
- Clients have no self-service channel to raise requests to their practice — they resort to email, phone, or ad-hoc messages that get lost
- Practice tasks exist in the backend (PracticeTask model) but there is **no frontend UI** — no task board, no client-facing view, no kanban
- When a client needs something from their accountant (e.g., "Can you review my payroll setup?"), there's no structured intake — just informal communication
- Practice staff have no pipeline view to triage and manage incoming client requests

**Current State**: Practice task infrastructure exists in the backend (CRUD, templates, comments, status logs, recurring generation) but is entirely API-only with zero frontend pages. Clients cannot see or interact with tasks at all.

---

## Possible Solution (How)

### 1. Practice Task Board (Practice Side)
- Kanban board at `/practice/tasks` — columns: To Do, In Progress, Blocked, Done
- Filter by workspace (client), assignee, due date, template
- Drag-and-drop status transitions
- Bulk actions: assign, set due date, change status
- Task detail slide-over with comments, attachments, status history

### 2. Client Task View (Workspace Side)
- Task checklist at `/tasks` in the workspace dashboard
- Shows tasks assigned to the client by their practice
- Client can: mark complete, add comments, attach files
- Simple list view — not kanban (clients don't need pipeline complexity)
- Badge in sidebar showing pending task count

### 3. Client Request Tickets (New)
- "Raise a Request" form accessible from client dashboard
- Structured form: category (dropdown), subject, description, urgency (low/normal/high), attachments
- Creates a `ClientRequest` that flows into the practice ticket pipeline
- Client can track status of their requests

### 4. Practice Ticket Pipeline (Practice Side)
- Inbox view at `/practice/requests` — incoming client requests
- Pipeline: New → Acknowledged → In Progress → Resolved
- Convert request to task (one-click)
- Respond to client (creates comment visible to client)
- Filter by workspace, urgency, status

### 5. Visibility Controls
- Tasks have `visibility` field: `internal` (practice-only) or `shared` (visible to client)
- Practice can toggle visibility per task
- Internal tasks never appear on client side

```
// Before
1. Client emails accountant: "Can you help with my BAS?"
2. Accountant creates mental note or spreadsheet entry
3. No tracking, no audit trail, no visibility for client
4. Tasks assigned internally but client never sees them

// After
1. Client clicks "Raise Request" → fills structured form
2. Practice sees request in pipeline → acknowledges → converts to task
3. Task appears on client's dashboard → client uploads docs → marks complete
4. Full audit trail: who created, who completed, when, comments
```

---

## Benefits (Why)

**User/Client Experience**:
- Clients get self-service request channel — no more email ping-pong
- Clients see exactly what's expected of them and can track progress
- Structured intake reduces miscommunication and lost requests

**Operational Efficiency**:
- Practice staff triage requests in a pipeline instead of scattered emails
- Task templates auto-generate recurring work (already built)
- One-click convert request → task reduces admin overhead

**Business Value**:
- Differentiator vs competitors (Xero Practice Manager lacks client-facing tasks)
- Increases client engagement with the platform (sticky feature)
- Reduces churn — clients who interact more with their accountant's tools stay longer

**ROI**: Estimated 15-20% reduction in practice admin overhead from structured request intake. Higher client retention from improved communication.

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
- Backend task infrastructure (PracticeTask, templates, comments, status logs) is production-ready
- Clients will adopt a structured request form over email/phone
- Practice staff will monitor the ticket pipeline regularly

**Dependencies**:
- 027-PMV (Practice Management V2) — complete, provides task backend
- 015-ACT (Accountant Practice Management) — complete, provides practice-workspace connection
- 056-FEX (File Explorer) — for attachment handling on tasks/requests

**Risks**:
- Adoption risk (MEDIUM) → Mitigation: keep client UX extremely simple — checklist, not kanban
- Notification gap (MEDIUM) → Mitigation: integrate with 024-NTF notification system for task assignments and request updates
- Scope creep into full helpdesk (LOW) → Mitigation: keep request form simple — category + description + urgency, not a full ticketing system

---

## Estimated Effort

**L (Large) — 3-4 sprints**, leveraging existing backend infrastructure.

- **Sprint 1**: Practice task board (kanban UI) + client task checklist view + visibility controls
- **Sprint 2**: Client request model + request form + practice ticket pipeline
- **Sprint 3**: Comments/attachments on shared tasks + notifications + request-to-task conversion
- **Sprint 4**: Polish, templates UI, bulk actions, mobile responsive

---

## Proceed to PRD?

**YES** — Backend is 80% built. This is primarily a frontend build + the ClientRequest model. High-value feature that differentiates MoneyQuest from competitors.

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
- Revisit after client feedback on current practice management features
