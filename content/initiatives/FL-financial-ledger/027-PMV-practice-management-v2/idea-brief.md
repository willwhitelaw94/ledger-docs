---
title: "Idea Brief: Practice Management v2"
---

# Idea Brief: Practice Management v2

**Created**: 2026-03-15
**Author**: William Whitelaw

---

## Problem Statement (What)

- **Shallow onboarding**: Practice setup is a single form (name, ABN, email) with no guided flow to invite team or add first client — new firms hit an empty dashboard with no clear next step
- **Blanket access model**: All practice members get identical `accountant` role on every linked workspace — no way to assign specific accountants to specific clients or limit scope
- **Flat workspace list**: Practices managing 20+ clients (common for small firms) have no way to group related entities — a family trust, company, and SMSF for the same client appear as three unrelated cards
- **No accountant-client workflow**: Zero task management, ticketing, or structured communication between the practice and its clients — all coordination happens outside the platform (email, phone, spreadsheets)
- **Missing "Create Client" UI**: The backend `CreateClientWorkspace` action exists but has no frontend page — practices can't create workspaces for clients from the practice interface
- **Dead nav items**: Jobs and Reports pages show "Coming soon" placeholders, breaking trust in the practice experience

**Current State**: 015-ACT delivered the foundation — practice CRUD, invite links, 3 connection flows, advisor settings. But the experience stops at "you're connected" without enabling the daily workflow of managing clients.

---

## Possible Solution (How)

Five capability areas, each building on the existing 015-ACT foundation:

### 1. Practice Onboarding Wizard
- Multi-step wizard (Firm Details → Invite Team → Add First Client → Success) replacing the single-page form
- Batch invite endpoint for multiple team emails at once
- "Create Client Workspace" step with entity type, currency, industry template
- Skippable steps — users can come back later

### 2. Per-Accountant Workspace Assignment
- Assignment table: which practice members have access to which workspaces
- Role override per assignment (accountant vs bookkeeper vs read-only)
- Primary accountant designation per workspace (visible in dashboard cards)
- "Assign team" dialog on workspace connection

### 3. Workspace Grouping (Client Families)
- New `workspace_groups` table — a named collection of related workspaces (e.g., "Smith Family" containing Trust, Company, SMSF)
- Practice-scoped groups (not visible to workspace owners)
- Dashboard view: grouped cards with aggregate stats
- Drag-and-drop or checkbox grouping from client list

### 4. Practice Task Management
- Task model: title, description, assignee (practice member), client workspace, due date, status (open/in_progress/done/blocked)
- Recurring task templates (e.g., "Quarterly BAS" auto-creates tasks on schedule)
- Task board view (Kanban columns by status) and list view
- Task comments/notes — visible to assigned accountant
- Future: client-facing tasks (requests for documents, approvals)

### 5. Client Workbooks
- Per-workspace engagement checklist (e.g., "Tax Return 2026" with checklist items)
- Workbook templates that auto-populate for new engagements
- Progress tracking visible in dashboard cards
- Document attachment per checklist item (leverages existing 012-ATT attachments)

```
// Before (Current)
1. Create practice (single form)
2. Get empty dashboard
3. Share invite link manually
4. All team members see all clients equally
5. Track tasks in external spreadsheet

// After (v2)
1. Guided wizard: firm details → invite team → create first client
2. Dashboard shows grouped clients with health metrics
3. Specific accountants assigned to specific clients
4. In-app task board with recurring templates
5. Engagement workbooks track progress per client
```

---

## Benefits (Why)

**User/Client Experience**:
- Onboarding completion rate: ~30% (current dead-end) → 80%+ (guided wizard)
- Time to first value: reduced from "figure it out" to under 5 minutes

**Operational Efficiency**:
- Per-accountant assignment eliminates noise — team members only see relevant clients
- Workspace grouping reduces cognitive load for practices with 20+ entities
- Task management replaces external spreadsheets — estimated 2-3 hrs/week saved per accountant

**Business Value**:
- Practice management is the key differentiator vs. Xero/MYOB (they don't have it natively)
- Higher stickiness — once a firm manages clients through the platform, switching cost is high
- Enables future billing integration (track time against tasks)

**ROI**: Each practice managing 10+ clients represents ~$200/month in platform revenue. Improving onboarding and daily workflow directly impacts conversion and retention.

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | William Whitelaw (PO, Dev) |
| **A** | William Whitelaw |
| **C** | -- |
| **I** | -- |

---

## Assumptions & Dependencies, Risks

**Assumptions**:
- Existing 015-ACT foundation (models, actions, routes) is stable and production-ready
- Practice members are always existing MoneyQuest users (no guest/external invite in v1)
- Workspace grouping is a practice-side concept only — workspace owners don't see groups

**Dependencies**:
- 015-ACT — practice CRUD, invite links, workspace connections (complete)
- 012-ATT — file attachments for workbook items (complete)
- 024-NTF — notifications for task assignments and due dates (partially complete)

**Risks**:
- Task management scope creep (MEDIUM) → Mitigation: v1 is practice-internal only, no client-facing tasks
- Workspace grouping data model complexity (LOW) → Mitigation: simple many-to-many, no hierarchical nesting in v1
- Per-accountant assignment breaking existing blanket access (MEDIUM) → Mitigation: migration auto-assigns all existing members, opt-in granular control

---

## Estimated Effort

**L (Large) — 5 sprints / 5 weeks**

- **Sprint 1**: Practice onboarding wizard (backend batch invite + frontend multi-step wizard + create client workspace page)
- **Sprint 2**: Per-accountant workspace assignment (assignment table, role overrides, primary accountant, UI)
- **Sprint 3**: Workspace grouping / client families (data model, CRUD, dashboard grouped view)
- **Sprint 4**: Practice task management (task model, CRUD, Kanban board, recurring templates)
- **Sprint 5**: Client workbooks + polish (engagement checklists, templates, integration testing)

---

## Proceed to PRD?

**YES** — This addresses the #1 gap in the platform for the target persona (accounting practices). The foundation is built; this epic turns it into a daily-use tool.

---

## Decision

- [ ] **Approved** — Proceed to PRD
- [ ] **Needs More Information** — [What's needed?]
- [ ] **Declined** — [Reason]

**Approval Date**: --

---

## Next Steps

**If Approved**:
1. [ ] Run `/trilogy-idea-handover` — Gate 0 validation + Linear epic creation
2. [ ] Run `/speckit-specify` — Generate detailed spec with user stories
3. [ ] Run `/trilogy-clarify spec` — Refine requirements
4. [ ] Incorporate competitor research findings (Karbon, TaxDome, XPM patterns)

**Notes**: Competitor research agent is running in parallel — findings will enrich the spec phase with benchmarks from Karbon (workflow automation), TaxDome (client portal + tasks), and XPM (staff assignment + billing).
