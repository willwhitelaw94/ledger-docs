---
title: "Idea Brief: Client Portal"
---

# Idea Brief: Client Portal

**Created**: 2026-03-22
**Author**: William Whitelaw
**Supersedes**: Previous 022-CPV brief (job sharing + viral CTA, 2026-03-14)

---

## Problem Statement (What)

- Clients of accounting practices have **no dedicated experience** in MoneyQuest -- they log in and see the same interface as accountants and bookkeepers, minus permissions
- The "client" role exists with 8 read-only permissions but no tailored layout, simplified navigation, or client-specific dashboard
- Clients cannot view reports their accountant has prepared, respond to tasks, upload source documents, or sign documents through the platform
- Accountants communicate with clients via email, phone, and ad-hoc channels outside MoneyQuest, creating fragmentation and lost context
- Compliance deadlines and upcoming obligations are invisible to clients -- they rely entirely on their accountant to remind them
- The practice-client relationship is one-directional: the practice works on behalf of the client, but the client has no self-service visibility

**Current State**: A client invited to a workspace sees a stripped-down version of the full accounting interface. Navigation items they cannot access are hidden, but the layout, terminology, and information architecture are designed for accountants. There is no client onboarding, no simplified dashboard, no document exchange workflow, and no way for a client to proactively engage with their financial health.

---

## Possible Solution (How)

A **dedicated client portal** -- a distinct layout and experience within the existing Next.js frontend, served to users with the "client" role. Not a separate app, but a purpose-built lens on the same data.

**1. Client Layout & Navigation**
- Simplified sidebar with 5-6 items (Dashboard, Reports, Tasks, Documents, Messages, Settings)
- No accounting jargon -- "Reports" not "Financial Reporting & Compliance", "Tasks" not "Practice Tasks"
- Clean, card-based design optimised for mobile-first usage

**2. Client Dashboard**
- Financial health summary: key metrics the accountant has chosen to surface (revenue, expenses, profit, cash position)
- Upcoming deadlines: BAS due dates, tax lodgement deadlines, document expiry
- Recent activity: latest reports shared, tasks assigned, documents requiring signature
- Compliance status: traffic-light indicators for key obligations

**3. Report Access**
- View and download reports the practice has explicitly shared (P&L, Balance Sheet, BAS, custom reports)
- Reports tagged as "shared with client" appear automatically in the client's report library
- PDF download and on-screen viewing

**4. Task Interaction**
- View tasks assigned by the practice, mark them complete, add comments, attach files
- Simple checklist view -- not a kanban board
- Raise new requests to the practice via a structured form (category, description, urgency)

**5. Document Upload & Management**
- Upload receipts, bank statements, and source documents directly to their entity's intray
- View documents the practice has shared with them
- Clear distinction between "documents I uploaded" and "documents shared with me"

**6. Document Signing**
- Sign documents sent by the practice -- integrates with the existing 059-DGS signing infrastructure
- Signing requests appear as actionable items on the dashboard and in notifications

**7. In-Platform Messaging**
- Thread-based messaging between client and their assigned advisor/accountant
- Messages tied to specific entities (a task, a report, a document) for context
- Replaces email/phone for routine practice-client communication

**8. Notifications & Alerts**
- Clients receive notifications for: new tasks assigned, reports ready, documents to sign, upcoming deadlines, message replies
- Email + in-app notification delivery
- Notification preferences configurable by the client

**9. Practice Branding**
- Practice can customise the portal appearance: logo, primary colour, practice name
- Client sees their accountant's brand, not MoneyQuest's -- white-label feel

**10. Self-Service Onboarding**
- Practice sends an invite link; client creates an account and lands directly in the portal
- Guided first-run experience: "Here's your dashboard, your accountant has shared these reports, you have 2 tasks to complete"

```
// Before
1. Client emails accountant: "Can you send me my latest P&L?"
2. Accountant exports PDF, emails it back
3. Client emails again: "Also, I uploaded my receipts to Dropbox, can you grab them?"
4. Accountant downloads from Dropbox, manually imports
5. BAS deadline passes -- client didn't know it was due

// After
1. Client logs into portal, sees P&L already in their Reports tab
2. Uploads receipts directly to Documents -- they arrive in the entity's intray
3. Dashboard shows "BAS due in 14 days" with traffic-light status
4. Accountant sends task "Please review and sign your BAS" -- client signs in-portal
5. All communication in one thread, attached to the relevant documents
```

---

## Benefits (Why)

**User/Client Experience**:
- Clients get real-time visibility into their financial position without asking their accountant
- Self-service document upload eliminates the Dropbox/email/phone shuffle
- Clear deadline visibility reduces missed compliance obligations

**Operational Efficiency**:
- Practices spend less time on "send me my P&L" requests -- estimated 30-40% reduction in routine client communication overhead
- Document exchange is structured and auditable, not scattered across email threads
- Task completion tracking replaces manual follow-up

**Business Value**:
- **Key differentiator** vs competitors: Xero Practice Manager has no client-facing portal; MYOB Practice lacks document signing integration
- **Client retention driver**: clients who interact with a portal are more engaged and less likely to switch accountants
- **Platform stickiness**: once clients and practices communicate through MoneyQuest, switching cost increases for both parties
- **Upsell pathway**: free client view leads to personal workspace interest (links to 065-VGR referral engine)

**ROI**: Reduces average practice-client communication overhead by 2-3 hours/week per advisor. For a 10-person practice, that is 20-30 hours/week recovered for billable work.

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

**Assumptions**:
- Clients are willing to adopt a portal rather than continuing with email/phone
- Practices will invest time in configuring shared reports and branding
- Mobile-responsive design is sufficient (no native app required at launch)

**Dependencies**:
- 027-PMV Practice Management v2 (complete) -- task infrastructure, assignments, templates
- 059-DGS Document Governance & Signing (complete) -- SigningDocument model, send/sign actions
- 012-ATT File Attachments (complete) -- polymorphic uploads on 5 models
- 024-NTF Notifications & Activity Feed (complete) -- 24 notification types, email delivery
- 003-AUT Auth & Multi-tenancy (complete) -- client role, Sanctum auth, workspace scoping
- 018-ITR Intray Attention Queue (partially built) -- document intake pipeline
- 007-FRC Financial Reporting (complete) -- P&L, Balance Sheet, BAS generation

**Risks**:
- Client adoption rate lower than expected (MEDIUM) --> Mitigation: keep the portal dead simple, mobile-first, guided onboarding; measure adoption weekly
- Scope creep into full helpdesk/CRM territory (HIGH) --> Mitigation: strict scope to 10 components listed above; messaging is simple threads, not a ticketing system
- Practice branding adds complexity with little initial value (LOW) --> Mitigation: ship branding as Phase 3; Phase 1 uses MoneyQuest brand with practice name only
- Notification fatigue for clients (MEDIUM) --> Mitigation: sensible defaults (only actionable items notify); client-configurable preferences

---

## Estimated Effort

**L (Large) -- 5 sprints / ~10 weeks**

- **Sprint 1**: Client layout + routing + dashboard -- dedicated layout component, simplified sidebar, role-based layout switching, financial health cards, deadline widget
- **Sprint 2**: Report sharing + document upload -- report visibility flagging, client report library, document upload to intray, shared document views
- **Sprint 3**: Task interaction + request form -- client task checklist, mark complete, comment, structured request submission to practice pipeline
- **Sprint 4**: Document signing + messaging -- signing request flow in portal, thread-based messaging between client and advisor, message notifications
- **Sprint 5**: Notifications + branding + onboarding -- client notification preferences, practice branding config (logo, colour), invite-link onboarding flow, mobile polish

---

## Proceed to PRD?

**YES** -- All major dependencies are complete. The client role and permissions exist. Practice management, signing, attachments, notifications, and reporting are all built. This is primarily a frontend experience layer with targeted backend additions (report sharing flags, messaging model, branding config). High strategic value as a differentiator.

---

## Decision

- [ ] **Approved** - Proceed to PRD
- [ ] **Needs More Information** - What's needed?
- [ ] **Declined** - Reason

**Approval Date**: --

---

## Next Steps

**If Approved**:
1. [ ] Run `/trilogy-idea-handover` -- Gate 0 validation + Linear epic creation
2. [ ] Run `/speckit-specify` -- generate full specification with user stories
3. [ ] Resolve scope boundary with 058-CPT (Practice Client Portal) -- 058 covers practice-side task board; 022 covers client-side experience
4. [ ] Define which reports are shareable by default vs opt-in
5. [ ] Design the messaging data model (lightweight threads, not full chat)

**Scope Boundaries**:
- **022-CPV** (this epic) = the client-facing portal experience (what the client sees and does)
- **058-CPT** = the practice-side task board and client request pipeline (what the practice sees and manages)
- **065-VGR** = viral growth, referral attribution, and free tier conversion (growth mechanics on top of the portal)

**Notes**: The original 022-CPV brief focused narrowly on public job share links as a viral growth mechanism. That scope has been split: job sharing remains in 022 as one feature of the broader portal, and the growth/referral engine has moved to 065-VGR.
