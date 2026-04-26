---
title: "Practice Management Platform Research"
description: "Competitive research across Xero Practice Manager, Karbon, Canopy, TaxDome, Jetpack Workflow, and Ignition covering 10 functional areas for the MoneyQuest Ledger practice management module."
---

# Practice Management Platform Research

**Epic**: 015-ACT Accountant & Practice Management
**Date**: 2026-03-14
**Sources**: Web research across vendor sites, help centres, review sites, and industry publications

---

## Executive Summary

Six platforms were analysed across 10 functional areas. The market divides into three tiers:

1. **All-in-one practice suites** (TaxDome, Canopy) -- attempt to cover CRM, workflow, client portal, billing, communication, and document management in a single product. TaxDome is the most comprehensive, with an account/contact data model that handles family groups and linked entities natively.

2. **Workflow-first platforms** (Karbon, Jetpack Workflow) -- excel at internal team workflow, task management, and reporting but vary in client-facing features. Karbon has strong email triage and team collaboration; Jetpack Workflow is laser-focused on recurring task automation but lacks a client portal or billing.

3. **Engagement and billing specialists** (Ignition) -- owns the proposal-to-payment pipeline with engagement letters, automated billing, and scope creep management. Does not attempt practice management or workflow -- designed to integrate with Karbon, XPM, or others.

4. **Ecosystem connectors** (Xero Practice Manager) -- deeply integrated with the Xero ecosystem (Xero HQ, Xero Ledger, Xero Tax), making it the natural choice for Xero-based practices. Solid job/time/billing core but weaker on modern workflow automation and client portals compared to newer entrants.

**Key insight for MoneyQuest**: The platforms that accountants love most combine a **practice-level dashboard** (cross-client view), **pipeline-based workflow automation**, and a **polished client portal**. The account/contact separation model (TaxDome) and client groups (XPM, Karbon) are essential for modelling real-world accounting relationships. No platform does all 10 areas equally well -- most firms use 2-3 tools together (e.g., Karbon + Ignition + Xero).

---

## 1. Practice Registration and Onboarding

### Xero Practice Manager (XPM)

- **Sign-up**: Part of the Xero Partner Programme. Accountants sign up for Xero, apply for partner status, then get XPM access as part of their partner subscription.
- **Setup wizard**: Minimal dedicated wizard. Setup involves connecting XPM to Xero HQ and configuring business settings (tax rates, job categories, task types).
- **Client import**: CSV import with up to 500 lines per batch. Clients can also be imported from connected Xero organisations. Client Groups can be created manually or via CSV with a "Group" column.
- **Onboarding time**: Relatively fast if already in the Xero ecosystem; painful if migrating from non-Xero tools.

### Karbon

- **Sign-up**: Direct sign-up via karbonhq.com. Free trial available. Paid onboarding services offered.
- **Setup**: Guided onboarding with data import assistance. The onboarding team helps migrate client data, work templates, job history, and team assignments.
- **Client import**: Three methods -- (1) CSV/Excel upload directly, (2) bulk contact update file processed by Karbon team, (3) sync from Xero or QuickBooks Online. Xero sync uses smart matching on name + billing email.
- **Onboarding time**: Varies. Paid onboarding includes live training, process consultations, and data migration.

### Canopy

- **Sign-up**: Direct sign-up via getcanopy.com. Modular pricing -- firms pick which modules they need.
- **Setup**: Dedicated onboarding specialist assigned. 37 pre-built task templates to get started.
- **Client import**: CSV import with mapping. Document folder templates can be applied automatically to new clients.
- **Onboarding time**: Guided by onboarding specialist with best practice recommendations.

### TaxDome

- **Sign-up**: Direct sign-up. Free trial. Comprehensive onboarding programme.
- **Setup wizard**: Step-by-step setup flow covering firm branding, service tags, pipeline creation, and client import. 6-8 week average onboarding time with flexibility to self-pace.
- **Client import**: CSV import tool that sets up client accounts automatically. Tags assigned during import (Tax, 1040, 1065, etc.). Pre-built "Tax Season Template Kit" for quick deployment.
- **Paid onboarding**: Available for firms wanting hands-on expert setup. TaxDome Academy and live webinars supplement self-service.

### Jetpack Workflow

- **Sign-up**: Direct sign-up. 14-day free trial.
- **Setup**: Import client list and apply workflow templates from 70+ pre-built options. Accounting workflow specialists available for onboarding support.
- **Client import**: CSV import for client data. Templates applied to clients to generate recurring jobs automatically.

### Ignition

- **Sign-up**: Direct sign-up. Primarily positioned as a proposal/engagement tool, not a full practice setup.
- **Setup**: Configure service catalogue, pricing, and engagement letter templates. No firm-wide practice setup wizard.
- **Client import**: Not a primary use case. Clients are created through the proposal flow -- when a proposal is sent, the client record is created.

**Summary table**:

| Platform | Dedicated Setup Wizard | CSV Import | Sync from Accounting Software | Paid Onboarding |
|----------|----------------------|------------|------------------------------|-----------------|
| XPM | Minimal | Yes (500 row limit) | Xero orgs | Via Xero partner |
| Karbon | Guided | Yes | Xero, QBO | Yes |
| Canopy | Specialist-led | Yes | Limited | Yes |
| TaxDome | Step-by-step | Yes (auto-setup) | No native sync | Yes |
| Jetpack | Minimal | Yes | No | Included |
| Ignition | No (service catalogue only) | No | No | No |

---

## 2. Team Management

### Xero Practice Manager

- **Staff roles**: Configurable staff roles and permissions. Roles control access to clients, jobs, billing, and reports. Permissions managed from within XPM and shared across the Xero suite.
- **Utilisation tracking**: Built-in. Productivity calculated as billable hours / total hours (excluding leave), expressed as a percentage. Reports available for individual staff and firm-wide.
- **Hierarchy**: No formal partner/manager/senior/junior hierarchy -- roles are flat permission groups.

### Karbon

- **Team structure**: Users assigned as team members. Roles include Admin and Standard user types.
- **Assignment**: Work items can have a "Client Manager" (primary person) and additional assignees per task. Role-based assignment at the template level (assign by role, not person) so templates stay reusable.
- **Utilisation**: Available via WIP reporting. Monitor efficiency and billable hours. Resource Planning Dashboard template available.

### Canopy

- **Roles and permissions**: Admin-configurable access profiles. Best practice is to create 3-5 user types based on staff levels, then assign permissions accordingly.
- **Assignment**: Tasks assigned to individual team members with due dates. Centralized dashboard shows workload per person.
- **Utilisation**: Time tracking built-in. WIP reports show unbilled time and expenses per staff member.

### TaxDome

- **Team roles**: Firm owner, admin, and standard team members. Role-based walkthroughs available for each perspective.
- **Assignment**: Staff assigned to jobs with a "lead person" designation. Per-job assignment visibility.
- **Utilisation**: Time Utilization Dashboard -- compares weekly capacity hours with actual hours worked. Custom hourly rates per team member or per service. Reports buildable for different time periods.

### Jetpack Workflow

- **Team structure**: Flat team structure. Users assigned to jobs and tasks.
- **Assignment**: Tasks assigned to specific team members with dependencies (prerequisites must complete first). Cascading deadline system.
- **Capacity**: Dashboard shows hours overdue and hours expected per week. "Plan" view (Scale tier) provides detailed capacity planning per team member.

### Ignition

- **Team management**: Limited. Ignition is not a team management tool -- it handles proposals and billing, not staff workload.
- **No utilisation tracking**: Not applicable. Ignition is front-of-house (sales/billing), not back-office (workflow/time).

**Summary table**:

| Platform | Configurable Roles | Staff Utilisation | Capacity Planning | Assignment Hierarchy |
|----------|-------------------|-------------------|-------------------|---------------------|
| XPM | Yes (permission-based) | Yes (%) | Via reports | Flat |
| Karbon | Admin/Standard | Yes (WIP-based) | Dashboard template | Client Manager + assignees |
| Canopy | Custom profiles | Yes (time-based) | WIP reports | Per-task |
| TaxDome | Owner/Admin/Standard | Yes (dashboard) | Hours vs capacity | Lead person + assigned |
| Jetpack | Flat | Yes (time tracking) | Plan view (premium) | Per-task |
| Ignition | N/A | N/A | N/A | N/A |

---

## 3. Client-Accountant Assignment

### Xero Practice Manager

- Jobs are assigned to staff members with due dates. A single "assigned to" field per job. The manager of a client is set at the client level. Client groups share the same manager/contact point.

### Karbon

- **Client Manager** is a first-class concept -- each contact/organisation has a designated Client Manager. Work items can have different assignees per task, separate from the Client Manager. Role-based assignment at template level means the work auto-assigns to the right role when created.

### Canopy

- Tasks assigned to individual team members. No formal "primary accountant" concept at the client level -- assignment is per-task/per-engagement. However, the CRM allows filtering by assigned staff.

### TaxDome

- Each job has an assigned team member and a "lead person." Client accounts can have a default assigned team member. The pipeline view shows who is responsible for each stage of work.

### Jetpack Workflow

- Jobs assigned to team members. Client records can have a designated contact person. No formal primary/secondary accountant concept -- assignment is at the job level.

### Ignition

- Proposals are created by a team member and attributed to them. No ongoing client-accountant assignment model.

**Key patterns across platforms**:
- **Client-level assignment** (Karbon's Client Manager, XPM's client manager) -- a default person responsible for the relationship
- **Job/task-level assignment** (all platforms) -- who does the specific work
- **Role-based template assignment** (Karbon) -- assign to "Manager" role, not "Sarah"

---

## 4. Client Grouping

### Xero Practice Manager

- **Client Groups**: First-class feature. Found under Clients > Groups. A group has a name and a tax status. Groups typically represent a single contact point who receives consolidated invoicing. Created manually or via CSV import. Use case: family trust + individual + company all managed as one group with one invoice.

### Karbon

- **Client Groups**: Used to manage related contacts by ownership or financial structure. Members listed in a Members section. Shared Timeline showing all communications for the group. Work can be created for the group. Useful for parent/subsidiary relationships and family businesses. Client Requests can be sent per entity within a group, with the entity name shown under each request.

### Canopy

- **No formal client grouping**. Clients are managed individually. Tags and custom fields can be used to informally group related entities, but there's no structured parent/child or family group model.

### TaxDome

- **Account/Contact separation**: The most sophisticated model. An **Account** is a billable entity (individual, family, or business). A **Contact** is a person. Contacts can be linked to multiple Accounts. A "family account" is an individual account with two contacts (e.g., married couple filing jointly). Children, grandparents can also be linked. **Linked Accounts** section shows all accounts sharing contacts. **Tags** provide additional grouping (Account Tags + Contact Tags). Portal access is controlled per contact per account.

### Jetpack Workflow

- **No formal grouping**. Clients are flat records. Tags can be applied for informal categorization.

### Ignition

- **No client grouping**. Each proposal is sent to a client entity. No relationship modelling between entities.

**Key insight**: TaxDome's Account/Contact separation is the most flexible model for real-world accounting. The Karbon Client Groups model is simpler but handles the most common cases (family business, corporate group). XPM's groups are billing-focused. Most platforms rely on tags for informal grouping.

---

## 5. Workbooks / Client Portals

### Xero Practice Manager

- **No native client portal**. XPM is an internal practice tool. Client interaction happens through Xero HQ client access (view-only into their Xero organisation) or third-party integrations (SuiteFiles, FYI for document management).

### Karbon

- **Client Tasks / Client Requests**: Karbon's client-facing feature. Sends structured requests to clients for missing information. Clients receive email with a link to respond -- no separate app or login required. Requests can include document upload, question responses, and checklists. Automatic reminders sent if not completed. **No full client portal** -- interaction is request-based, not an ongoing portal.

### Canopy

- **Full client portal**: Branded, mobile-optimised. Free for clients. Features: to-do list of tasks, secure document sharing, e-signatures, billing history, two-factor authentication, Touch/Face ID. Folder templates can be pre-configured per client type. Clients register via invitation and create a password.

### TaxDome

- **Full client portal + mobile app** (iOS and Android). Clients can: upload/scan documents, e-sign forms, chat securely with the firm, pay invoices, complete **Organizers** (interactive questionnaires with conditional logic). Portal is branded with firm's logo. Organizers are a key differentiator -- structured data collection templates with sections, question types, and logic jumps (similar to typeform-style forms).

### Jetpack Workflow

- **No client portal**. Most frequently requested missing feature per user reviews. All client communication happens via email. Document collection requires back-and-forth email.

### Ignition

- **Proposal portal only**. Clients receive a link to review proposals, sign engagement letters, and enter payment details. Not an ongoing client portal -- it's a single-purpose acceptance flow.

**Key insight**: TaxDome's Organizers (interactive questionnaires) are particularly powerful -- they replace the "send spreadsheet, get it back half-filled" workflow. Canopy's portal is the most traditional (document + task focused). Karbon's Client Requests are lightweight but effective for specific information gathering.

---

## 6. Task Management / Ticketing

### Xero Practice Manager

- **Jobs**: The core unit of work. Jobs have tasks, assigned staff, due dates, and statuses. Job templates define standard task lists per service type. Job categories and statuses are configurable. No formal ticketing system -- tasks exist within jobs.

### Karbon

- **Work items**: Each piece of client work is a Work item with a Kanban board view. Tasks within work items are organized as checklists with dependencies. Status columns are customizable. Client Tasks assigned with automatic reminders. No separate ticketing system -- work items serve this purpose.

### Canopy

- **Tasks and subtasks**: Hierarchical task structure. Task templates (37 pre-built) define standard workflows. Subtasks have assigned team members, due dates, and status tracking. Automations trigger on status changes (notify next person, create new task, email client). Centralized dashboard for firm-wide task visibility.

### TaxDome

- **Jobs + Pipelines**: A Job is a unit of client work that moves through a Pipeline (visual stages). Each pipeline stage can trigger automations (send email, assign task, create organizer). Tasks exist within jobs as checklists. Recurring jobs auto-generated on schedule. No separate ticketing -- the pipeline IS the tracking system.

### Jetpack Workflow

- **Jobs**: Three-level hierarchy -- Template > Project > Job. Master templates define task lists. Templates applied to clients create projects. Recurrence settings (weekly/monthly/quarterly/yearly/custom) auto-generate jobs. "Magic Job" feature: editing a recurring template cascades changes to all future instances. Task dependencies ensure sequential execution.

### Ignition

- **No task management**. Proposals and engagement tracking only. Integrates with workflow tools (Karbon, Financial Cents) to trigger task creation on proposal acceptance.

**Key patterns**:
- **Template-driven recurring work** is universal (except Ignition)
- **Pipeline/Kanban visualization** (TaxDome, Karbon, Canopy)
- **Cascading template changes** (Jetpack's Magic Job is unique)
- **Automation on status change** (TaxDome, Canopy, Karbon)

---

## 7. Communication

### Xero Practice Manager

- **Basic email**: Send emails from within XPM. Attach client emails to jobs. Mobile app enables call/message/email from contact list. No built-in chat or messaging.
- **Activity feed**: Via Xero HQ -- alerts, queries, and client activity visible.
- **Integrations**: VXT (call transcripts), SuiteFiles (document/email management).

### Karbon

- **Email Triage**: Core differentiator. Gmail/Microsoft 365 emails flow into a centralised Triage inbox. Emails are actionable items, not just messages. Shared Triage (team inbox), Delegated Triage. Emails can be assigned to work items or contacts.
- **Internal communication**: @mentions in Notes (not email). Comments on emails for internal discussion. Notifications via Triage.
- **Activity Timeline**: Chronological record of all interactions per client -- emails, notes, comments, work items, timesheets. Any team member can understand full context instantly.
- **No client-facing chat**: Communication with clients is via email (synced into Karbon).

### Canopy

- **Client portal messaging**: Clients can communicate through the portal.
- **Email**: Basic email integration.
- **Notifications**: Automated notifications on task status changes.
- **No dedicated internal chat**.

### TaxDome

- **Omnichannel inbox**: Secure chat + email sync + SMS, all in one inbox. The most comprehensive communication platform.
- **Secure client chat**: Real-time messaging in portal and mobile app. Attach images, embed videos (YouTube, Loom, Vimeo, Google Drive).
- **Email sync**: Outlook/Gmail sync with shared inbox. No Cc/Bcc needed -- team sees everything.
- **SMS**: Send/receive text messages directly from TaxDome. Clients use native SMS on their phone.
- **TeamChat**: Internal team communication with channels and direct messages, built into the workflow.
- **Automated reminders**: Clients automatically reminded to complete tasks, sign documents, pay invoices.

### Jetpack Workflow

- **Email integration only**. No built-in messaging, chat, or client communication.
- **Internal**: Team collaboration through task comments and email notifications.

### Ignition

- **Proposal communication only**: Clients receive proposal links. No ongoing communication channel.
- **Integrations**: Connects to Karbon, Slack, and others for workflow triggers.

**Key insight**: TaxDome's omnichannel approach (chat + email + SMS + internal TeamChat) is the most complete. Karbon's email Triage is the most innovative for managing inbound communication flow. Most platforms still rely heavily on email.

---

## 8. Billing and Engagement Letters

### Xero Practice Manager

- **Time and billing**: Track time against jobs, convert to invoices. Supports fixed-fee and time-based billing. WIP wash-up process for writing off/writing up WIP. Invoices sync to Xero for accounting.
- **No engagement letters**: Not a native feature. Firms use Ignition or standalone tools.

### Karbon

- **Time tracking**: Built-in time tracking against work items. WIP reporting to identify unbilled work.
- **No native billing/invoicing**: Karbon tracks time and WIP but doesn't generate invoices. Integrates with Xero/QuickBooks for actual invoicing.
- **No engagement letters**: Integrates with Ignition for proposals.

### Canopy

- **Time and Billing module**: Built-in timers (start from anywhere, including inside tasks). Manual time entry. WIP reports. Invoice generation from time entries and billing items.
- **Engagement letters**: "Canopy Engagements" -- reusable branded templates, customizable service packages, built-in e-signatures, automatic task generation on acceptance. Clients review, sign, and provide payment details through a secure link. Engagement acceptance auto-creates tasks in the workflow.
- **Billing models**: Hourly, per-item, deposits, saved payment details.

### TaxDome

- **Invoicing**: Built-in invoice generation. Auto-generate from completed work and client agreements. Fixed fees, hourly rates, recurring billing.
- **Payments**: Stripe and CPACharge integration. Clients pay through portal via credit card, debit card, or ACH.
- **Engagement letters**: Built-in proposal and engagement letter feature. E-signatures (unlimited). Tied to billing -- accepted proposals trigger recurring invoicing.
- **Time tracking**: Built-in with custom hourly rates per team member or per service. Time entries convertible to invoices.

### Jetpack Workflow

- **Time tracking**: Built-in. Budgeted vs actual time. Internal cost vs external billing rate.
- **No billing/invoicing**: Must use QuickBooks or separate software. Time data can be exported.
- **E-sign**: Digital document management for engagement letters and contracts (added as a feature, not a full engagement workflow).

### Ignition

- **Engagement letters**: Core competency. Dynamic language -- engagement letter provisions change based on selected services (irrelevant clauses removed automatically). Up to 10 decision-makers can review and sign. Compliance-focused templates.
- **Proposals**: Branded proposals with service packages, pricing tiers, and add-on options. AI-powered Price Insights (benchmarking vs peers, $349/year add-on). Lead capture pipeline (March 2025).
- **Billing**: Automated recurring billing from accepted proposals. Collect payment details upfront. Credit card and bank transfer. "Instant Bill" for ad-hoc/out-of-scope work.
- **Scope creep management**: 85% of customers report reduced scope creep. Instant Bill enables billing for unplanned work without full proposal.
- **Price increases**: Auto-apply increases across multiple clients during renewal. Bulk renewal and fee increase support.
- **Renewal workflow**: At end of term (default 12 months, customizable), system prompts for rollover/re-engage. Draft renewals inherit all settings from original.

**Key insight**: Ignition owns the engagement letter space. TaxDome and Canopy have solid built-in alternatives. Karbon and XPM rely on integrations (typically Ignition). For MoneyQuest, the question is whether to build engagement letters natively or integrate with Ignition.

---

## 9. Workflow Automation

### Xero Practice Manager

- **Job templates**: Define standard task lists per job type. Assign tasks to staff on job creation. Auto-create jobs on proposal acceptance (via Ignition integration).
- **Recurring jobs**: Set up recurring schedules for jobs.
- **Limited automation**: No conditional triggers or pipeline automation. Workflow is manual (assign, track, complete).

### Karbon

- **Work templates**: Hundreds of pre-built templates. Customizable checklists with task dependencies. Role-based assignment (assign to role, not person).
- **Automations**: Triggers on due dates, client activity, or status changes. Auto-send email reminders and follow-ups. Smart Reminders chase clients for missing information. Client Requests auto-generated.
- **Practice Intelligence**: AI-driven platform (2025) that predicts next best actions and automates complex workflows across the practice.

### Canopy

- **Task templates**: 37 pre-built + custom. Predefined subtasks, assigned roles, relative due dates, and automation rules per template.
- **Automations**: Trigger/action model -- when subtask completes, notify next person, create new task, or email client.
- **Engagement-linked**: Accepted engagements auto-create all associated tasks and subtasks.

### TaxDome

- **Pipelines**: Visual workflow stages for each service type. Jobs move through stages with pre-set automations at each stage.
- **Stage automations**: At each pipeline stage, auto-trigger: send email, create task, assign job, send organizer, request e-signature, generate invoice, send reminder.
- **Templates marketplace**: Pre-built pipeline templates for common scenarios (tax prep, bookkeeping, payroll, onboarding).
- **Recurring**: Jobs auto-created on schedule with full pipeline automation.

### Jetpack Workflow

- **Template hierarchy**: Master Template > Project > Job. Recurrence auto-generates jobs.
- **Magic Job**: Editing a recurring template cascades to all future instances -- unique feature.
- **Dependencies**: Tasks within jobs can have prerequisites.
- **Limited automation beyond recurrence**: No conditional triggers or pipeline stages.

### Ignition

- **Proposal automation**: Auto-generate draft renewals. Bulk price increases across clients. Lead pipeline with qualification stages.
- **Integration triggers**: On proposal acceptance, trigger job creation in Karbon/XPM/Financial Cents. Trigger invoicing in Xero/QuickBooks.
- **No workflow management**: Ignition automates the front-end (proposal to payment), then hands off to a workflow tool.

**Key patterns**:
- **Pipeline/stage-based automation** (TaxDome, Karbon) is the most powerful model
- **Template recurrence** is table stakes (all except Ignition)
- **Cross-tool triggers** (Ignition > Karbon, Canopy engagement > tasks) show the integration-first approach
- **AI-driven next actions** (Karbon Practice Intelligence) is the emerging frontier

---

## 10. Practice-Level Reporting

### Xero Practice Manager

- **Staff utilisation**: Productivity % (billable / total hours). Reports for individual and firm-wide.
- **WIP**: Billable WIP balance tracking. WIP ledger. WIP wash-up reports.
- **Revenue**: By job, client, job type. Recoverable costs reporting.
- **Custom reports**: Practice-wide report templates. Analysis, performance, and WIP categories.
- **Capacity**: Via staff allocation reporting (hours allocated vs available).

### Karbon

- **WIP**: Filter by fee type, client manager, client, work type. Identify highest-value work to complete. Client profitability analysis.
- **Utilisation**: Employee efficiency tracking.
- **Revenue**: Service delivery and profitability reporting.
- **Resource Planning**: Dashboard template for capacity planning.
- **Practice Intelligence**: AI-powered insights predicting firm performance and recommending actions.

### Canopy

- **WIP**: All unbilled time and expenses. Filterable by staff, client, service.
- **Time**: Built-in time tracking with reporting.
- **Revenue**: Via billing module. Invoice and payment reporting.
- **Limited**: Less advanced practice-level analytics compared to XPM or TaxDome.

### TaxDome

- **Time Utilization Dashboard**: Compare weekly capacity hours vs actual hours per team member. Build reports for any time period.
- **Revenue**: Reports on invoices, time entries, billing by client/service.
- **Pipeline reports**: Job progress, bottlenecks, stage duration.
- **AI search**: Natural language query to find specific report data.
- **Saved filters**: Reusable report filters shared with team.
- **Custom reports**: Jobs, tasks, time entries, invoices, pipelines.

### Jetpack Workflow

- **Capacity**: Dashboard showing hours overdue and expected. Per-team-member workload. "Plan" view (premium tier) for detailed capacity planning.
- **Profitability**: Budgeted vs actual time. Internal cost vs external billing rate per job.
- **Job completion**: Overdue tasks, completion rates, bottleneck identification.
- **Limited financial reporting**: No native revenue or WIP reporting (lacks billing).

### Ignition

- **Proposal analytics**: Revenue from accepted proposals. Win rates. Average proposal value.
- **Price Insights**: AI benchmarking -- compare your pricing to anonymised peer data.
- **Revenue tracking**: $3.1 billion in client revenue facilitated through the platform in 2025.
- **No practice operations reporting**: No utilisation, WIP, or capacity metrics.

**Summary table**:

| Platform | Staff Utilisation | WIP | Revenue per Client | Capacity Planning | AI Analytics |
|----------|------------------|-----|--------------------|-------------------|-------------|
| XPM | Yes (%) | Yes (ledger) | Yes | Via allocation | No |
| Karbon | Yes | Yes (filterable) | Yes (profitability) | Dashboard template | Practice Intelligence |
| Canopy | Basic | Yes | Basic | No | No |
| TaxDome | Yes (dashboard) | No native WIP | Yes | Hours vs capacity | AI search |
| Jetpack | Via time tracking | No | Budget vs actual | Plan view (premium) | No |
| Ignition | No | No | Proposal revenue | No | Price Insights |

---

## Synthesis: Implications for MoneyQuest

### Cross-Platform Patterns Worth Adopting

1. **Account/Contact separation** (TaxDome model): Essential for modelling families, corporate groups, and the reality that one person (the accountant) interacts with many entities. MoneyQuest already has Contacts; the "Account" layer sits above and groups related Workspaces.

2. **Client Manager as first-class assignment** (Karbon model): Beyond task-level assignment, having a designated Client Manager per workspace/client creates accountability and powers practice-level views.

3. **Pipeline-based workflow automation** (TaxDome/Karbon): Visual stages with per-stage automations. MoneyQuest's current job model could adopt pipeline thinking for accountant workflows (e.g., tax prep pipeline: Collect Documents > Review > Prepare > Review > Lodge > Complete).

4. **Engagement letter to workflow trigger** (Ignition/Canopy): When a client signs an engagement, the system auto-creates all jobs, tasks, and recurring work. This bridges sales and delivery.

5. **Organizers / structured data collection** (TaxDome): Interactive questionnaires with conditional logic, sent through the client portal, with automatic reminders. Far more effective than emailing spreadsheets.

6. **Email Triage** (Karbon): A centralised inbox that turns emails into actionable work items, with team assignment and client context.

7. **Omnichannel communication** (TaxDome): Chat + email + SMS in one inbox, with team-internal channels alongside client-facing threads.

### What the 015-ACT Idea Brief Already Covers

The existing idea brief focuses on:
- Practice dashboard (cross-workspace view) -- aligned with XPM and Karbon's practice views
- Workspace creation on behalf of clients -- aligned with accountant onboarding flows
- Ownership transfer -- a gap in most platforms (they don't model ownership transfer because the firm always owns the account)
- Invite by email -- table stakes, all platforms do this

### Gaps in the 015-ACT Idea Brief (Informed by Research)

| Gap | Description | Priority | Platforms That Do It |
|-----|-------------|----------|---------------------|
| **Client grouping** | Family groups, corporate structures, parent/child workspaces | High | TaxDome, XPM, Karbon |
| **Client Manager assignment** | First-class "who owns this relationship" at the client level | High | Karbon, XPM |
| **Workflow pipelines** | Visual stage-based workflow for recurring practice work | Medium | TaxDome, Karbon, Canopy |
| **Engagement letters** | Proposals, scope definition, e-signatures, auto-billing | Medium | Ignition, TaxDome, Canopy |
| **Client portal** | Client-facing view for document upload, task completion, communication | Medium | TaxDome, Canopy |
| **Structured data collection** | Organizers/questionnaires sent to clients via portal | Medium | TaxDome |
| **Team utilisation** | Staff hours, capacity planning, WIP tracking | Medium | XPM, TaxDome, Karbon |
| **Practice billing** | Billing the client for accounting services (separate from their ledger) | Medium | XPM, TaxDome, Canopy |
| **Communication hub** | Centralised inbox for client comms (email, chat, SMS) | Low (v2) | TaxDome, Karbon |
| **Practice reporting** | Revenue per client, utilisation, WIP, capacity | Low (v2) | XPM, TaxDome, Karbon |

### Recommended Phasing for MoneyQuest

**Phase 1 (015-ACT as specced)**: Practice dashboard, invite flow, ownership transfer, workspace creation on behalf of client.

**Phase 2 (extend 015-ACT)**: Client grouping (link workspaces as a group), Client Manager assignment, practice client notes. This is the minimum to be credible as a practice tool.

**Phase 3 (new epic)**: Workflow pipelines for practice work (job pipelines with status stages and automations). Engagement letters (or Ignition integration). Client portal enhancements (organizers, structured data collection).

**Phase 4 (new epic)**: Practice billing and invoicing (firm bills client for services). Team utilisation and WIP tracking. Practice-level reporting dashboards. Communication hub.

### Build vs Integrate Decision Points

| Feature | Build | Integrate | Recommendation |
|---------|-------|-----------|---------------|
| Practice dashboard | Build | -- | Build (core differentiator) |
| Client grouping | Build | -- | Build (core data model) |
| Engagement letters | Build (simple) | Ignition | Integrate first, build later |
| Time tracking | Build | -- | Build (extends existing job costing) |
| Communication | Build (basic chat) | -- | Build minimal, extend later |
| Document management | Build (basic) | -- | Build (extends attachments 012-ATT) |
| Reporting | Build | -- | Build (extends existing reports) |

---

## Sources

### Xero Practice Manager
- [Xero Practice Manager Product Page](https://www.xero.com/us/xero-practice-manager/)
- [XPM Review - FitSmallBusiness](https://fitsmallbusiness.com/xero-practice-manager-review/)
- [XPM Client Groups - Link Academy](https://support.linkacademy.com/hc/en-us/articles/360002206035-Xero-Practice-Manager-Client-Settings-Clients-vs-Client-Groups)
- [XPM Staff Roles and Permissions](https://central.xero.com/s/article/About-staff-privileges-in-Practice-Manager-AU)
- [XPM WIP Reporting - Link Academy](https://support.linkacademy.com/hc/en-us/articles/360002519755-Practice-Performance-Reporting-with-Xero-Practice-Manager-Interpreting-your-Billable-WIP-balance)
- [XPM Utilisation Reporting - Link Academy](https://support.linkacademy.com/hc/en-us/articles/360002519595-Team-Performance-Reporting-with-Xero-Practice-Manager-Productivity)
- [XPM Client Import](https://xero.my.site.com/s/article/Import-your-client-file-US-CA-SG-SA-ROW)

### Karbon
- [Karbon Product Page](https://karbonhq.com/)
- [Karbon In-Depth Review - Future Firm](https://futurefirm.co/karbon-practice-management/)
- [Karbon Review 2026 - Uku](https://getuku.com/articles/karbon-review)
- [Karbon Client Groups - Help Centre](https://help.karbonhq.com/en/articles/5880261-manage-a-client-group)
- [Karbon Email Triage - Help Centre](https://help.karbonhq.com/en/articles/5574239-overview-of-triage)
- [Karbon Workflow Templates](https://karbonhq.com/templates/)
- [Karbon WIP Dashboard Template](https://karbonhq.com/templates/work-in-progress-dashboard/)
- [Karbon Client Import](https://help.karbonhq.com/en/articles/1524435-import-client-data)
- [Karbon Practice Intelligence Launch](https://karbonhq.com/resources/karbon-launches-tax-workflow-and-practice-intelligence/)

### Canopy
- [Canopy Product Page](https://www.getcanopy.com/)
- [Canopy Client Portal](https://www.getcanopy.com/accounting-client-portal)
- [Canopy Review 2026 - Uku](https://getuku.com/articles/canopy-review)
- [Canopy Engagements and Proposals](https://www.getcanopy.com/engagements-and-proposals)
- [Canopy Document Management](https://www.getcanopy.com/document-management)
- [Canopy Workflow](https://www.getcanopy.com/workflow)

### TaxDome
- [TaxDome Product Page](https://taxdome.com/)
- [TaxDome Review 2026 - Uku](https://getuku.com/articles/taxdome-review)
- [TaxDome Contacts and Accounts Explained](https://help.taxdome.com/article/514-contacts-accounts-explained)
- [TaxDome Client Management](https://taxdome.com/client-management)
- [TaxDome Secure Messaging](https://taxdome.com/secure-messages)
- [TaxDome Email Sync](https://taxdome.com/email-sync)
- [TaxDome TeamChat](https://blog.taxdome.com/teamchat-brings-channels-and-direct-messages-inside-your-workflow-for-complete-end-to-end-team-collaboration/)
- [TaxDome SMS](https://blog.taxdome.com/introducing-sms-text-messages-communication-in-taxdome/)
- [TaxDome Firm Dashboard](https://taxdome.com/firm-dashboard)
- [TaxDome Time and Billing](https://taxdome.com/time-billing)
- [TaxDome Workflow](https://taxdome.com/workflow)
- [TaxDome Onboarding](https://taxdome.com/onboarding)
- [TaxDome CSV Import Tool](https://blog.taxdome.com/crm-update-introducing-the-taxdome-csv-import-tool/)
- [TaxDome Templates](https://help.taxdome.com/article/407-templates)

### Jetpack Workflow
- [Jetpack Workflow Product Page](https://jetpackworkflow.com/)
- [Jetpack Workflow In-Depth Review - Future Firm](https://futurefirm.co/jetpack-workflow/)
- [Jetpack Workflow Review 2026 - Uku](https://getuku.com/articles/jetpack-workflow-review)
- [Jetpack Workflow How It Works](https://jetpackworkflow.com/how-it-works/)
- [Jetpack Workflow for Firm Owners](https://jetpackworkflow.com/for-firm-owners/)
- [Jetpack Workflow Capacity Planning](https://jetpackworkflow.com/blog/real-time-visibility-into-client-work-and-team-capacity-for-accounting-firms/)

### Ignition
- [Ignition Product Page](https://www.ignitionapp.com/)
- [Ignition Engagement Letters](https://www.ignitionapp.com/product/engagement-letters)
- [Ignition 2025 Product Innovations](https://www.ignitionapp.com/blog/ignition-2025-roadmap-revenue-automation)
- [Ignition What's New](https://www.ignitionapp.com/whats-new)
- [Ignition Review - Cone](https://www.getcone.io/blog/practice-ignition-software)
- [Ignition Review - Blake Oliver](https://www.blakeoliver.com/blog/recommended-practice-ignition-for-online-proposals-and-more)
- [Ignition $3.1B Revenue Facilitated](https://cfotech.news/story/ignition-platform-drives-usd-3-1bn-in-2025-client-revenue)

### Comparison and Industry
- [12 Best Practice Management Platforms 2026 - TaxDome Blog](https://blog.taxdome.com/accounting-practice-management-software/)
- [TaxDome vs Canopy - Karbon Magazine](https://karbonhq.com/resources/taxdome-vs-canopy/)
- [12 Client Portals for Accountants - Future Firm](https://futurefirm.co/client-portals-for-accountants/)
- [Karbon vs Canopy - TaxDome Blog](https://blog.taxdome.com/karbon-vs-canopy/)
