---
title: "Feature Specification: Client Portal"
---

# Feature Specification: Client Portal

**Feature Branch**: `022-CPV-client-portal-viral-growth`
**Created**: 2026-03-22
**Status**: Draft
**Supersedes**: Previous spec (job sharing & viral growth loop, 2026-03-14)

---

## Overview

The Client Portal is a dedicated experience within MoneyQuest for users with the "client" role. It replaces the current behaviour where clients see a stripped-down version of the accountant interface with a purpose-built portal: simplified navigation, a financial health dashboard, report access, task interaction, document exchange, document signing, in-platform messaging, configurable notifications, practice branding, and a guided self-service onboarding flow.

This is not a separate application. It is a distinct layout and navigation structure served to client-role users within the existing frontend, reading from the same data the practice already manages.

**Scope boundaries**:
- **022-CPV** (this epic) = the client-facing portal experience (what the client sees and does)
- **058-CPT** = the practice-side task board and client request pipeline (what the practice manages)
- **065-VGR** = viral growth, referral attribution, and free tier conversion (growth mechanics)

---

## User Scenarios & Testing

### User Story 1 -- Client Layout and Navigation (Priority: P1)

A client logs into MoneyQuest and lands in a simplified, mobile-friendly portal with clean navigation. Instead of the full accounting sidebar with 15+ items, they see 6 tabs: Dashboard, Reports, Tasks, Documents, Messages, and Settings. The language is plain -- no accounting jargon. The experience feels like a dedicated app built for them, not a permissions-reduced version of the accountant interface.

**Why this priority**: This is the foundation for every other story. Without a distinct layout, all other portal features would render inside the accountant interface, which defeats the purpose. This story also delivers immediate perceived value -- clients feel like they have their own space.

**Independent Test**: Can be tested by logging in as a client-role user and verifying the simplified layout renders with exactly 6 navigation items and no accounting-specific terminology.

**Acceptance Scenarios**:

1. **Given** a user with the "client" role logs in, **When** the dashboard loads, **Then** they see a simplified sidebar with exactly these items: Dashboard, Reports, Tasks, Documents, Messages, Settings -- and no other navigation items.
2. **Given** a client is viewing the portal on a mobile device (viewport under 768px), **When** the layout renders, **Then** the navigation collapses to a bottom tab bar with icons for each of the 6 sections, and all content is single-column and touch-friendly.
3. **Given** a client is viewing the portal, **When** they look at any navigation label, page title, or section heading, **Then** no accounting jargon appears -- specifically no references to "Chart of Accounts", "Journal Entries", "Ledger", "General Ledger", "Trial Balance", "Reconciliation", or "BAS".
4. **Given** a client belongs to multiple workspaces (entities), **When** they log in, **Then** they see a workspace switcher showing only entities they have client access to, with the most recently accessed entity selected by default.
5. **Given** a user with a non-client role (owner, accountant, bookkeeper) logs in, **When** the layout loads, **Then** they see the standard full accounting interface, not the client portal layout.
6. **Given** a client is viewing any portal page, **When** they look at the header area, **Then** they see the practice's branding (name and logo) if the practice has configured branding, or the MoneyQuest brand as fallback.

---

### User Story 2 -- Client Dashboard (Priority: P1)

A client lands on their dashboard and immediately sees a snapshot of their financial health: key metrics their accountant has chosen to surface, upcoming deadlines, recent activity, and compliance status. The dashboard answers the question "How are my finances doing?" without the client needing to contact their accountant.

**Why this priority**: The dashboard is the first thing the client sees on every login. A useful dashboard drives repeat engagement and reduces the most common client question ("Can you send me an update?"). It also serves as the hub that links to every other portal feature.

**Independent Test**: Can be tested by logging in as a client and verifying the dashboard shows financial health cards, an upcoming deadlines widget, a recent activity feed, and compliance status indicators -- all with real data from the workspace.

**Acceptance Scenarios**:

1. **Given** a client views their dashboard, **When** the page loads, **Then** they see financial health cards showing key metrics: revenue (current period), expenses (current period), profit/loss (current period), and cash position -- each as a single number with a trend indicator (up/down/flat) compared to the prior period.
2. **Given** a client views the dashboard, **When** there are upcoming compliance deadlines within the next 60 days, **Then** they see an "Upcoming Deadlines" widget listing each deadline with its name (e.g., "BAS Q3"), due date, and days remaining -- sorted by nearest first.
3. **Given** a client views the dashboard, **When** there are no upcoming deadlines within 60 days, **Then** the deadlines widget shows "No upcoming deadlines" with a green checkmark.
4. **Given** a client views the dashboard, **When** there is recent activity (reports shared, tasks assigned, documents to sign), **Then** they see a "Recent Activity" feed showing the 10 most recent items, each with an icon, description, timestamp, and a link to the relevant item.
5. **Given** a client views the dashboard, **When** compliance obligations exist for the entity, **Then** they see a compliance status section with traffic-light indicators: green (on track), amber (due within 14 days), red (overdue) for each obligation.
6. **Given** a client views the dashboard, **When** they have pending actions (tasks to complete, documents to sign), **Then** they see an "Action Required" banner at the top of the dashboard listing each pending item with a direct link to take action.
7. **Given** the practice has not shared any reports or assigned any tasks for a workspace, **When** a new client views the dashboard, **Then** they see a friendly empty state: "Your accountant hasn't shared anything yet. They'll notify you when reports or tasks are ready."

---

### User Story 3 -- Report Access (Priority: P1)

A client opens their Reports tab and sees a library of financial reports their accountant has explicitly shared with them. They can view each report on-screen and download it as a PDF. Reports are automatically available to the client when the practice marks them as "shared" -- no email or manual sending required.

**Why this priority**: "Can you send me my P&L?" is the single most common client-to-practice communication. Eliminating it saves significant practice time and gives clients self-service access to their own financial information. This is the highest-value individual feature in the portal.

**Independent Test**: Can be tested by having a practice user mark a report as "shared with client", then logging in as the client and verifying the report appears in their Reports library with correct data and a working PDF download.

**Acceptance Scenarios**:

1. **Given** a practice user has shared a Profit & Loss report for the current period, **When** a client opens the Reports tab, **Then** they see the report listed with its name ("Profit & Loss"), the reporting period (e.g., "Jul 2025 -- Jun 2026"), and the date it was shared.
2. **Given** a client clicks on a shared report, **When** the report detail loads, **Then** they see the full report rendered on-screen in a clean, readable format -- with section headings, line items, and totals -- without needing to download a PDF.
3. **Given** a client is viewing a shared report, **When** they click "Download PDF", **Then** a PDF file downloads to their device with the report content, the practice branding (logo and name) in the header, and the reporting period in the filename.
4. **Given** a practice user has shared three reports (P&L, Balance Sheet, BAS Summary), **When** a client opens the Reports tab, **Then** all three reports appear in the library sorted by most recently shared first.
5. **Given** a practice user un-shares a previously shared report, **When** the client next loads the Reports tab, **Then** the report no longer appears in their library.
6. **Given** no reports have been shared with the client, **When** they open the Reports tab, **Then** they see an empty state: "No reports have been shared yet. Your accountant will share reports here when they're ready."
7. **Given** a client accesses the Reports tab, **When** they view the report list, **Then** they can filter reports by type (Profit & Loss, Balance Sheet, BAS, Custom) and sort by date shared or reporting period.

---

### User Story 4 -- Task Interaction (Priority: P2)

A client opens their Tasks tab and sees a simple checklist of tasks their accountant has assigned to them. They can mark tasks complete, add comments, and attach files to a task. They can also raise a new request to the practice using a structured form. The experience is a focused checklist -- not a project management board.

**Why this priority**: Task interaction is the primary way the practice drives client engagement with compliance obligations. Clients need to complete actions (provide documents, review statements, approve returns) to keep their finances on track. This is P2 because it depends on the practice having assigned tasks via the existing 027-PMV task infrastructure.

**Independent Test**: Can be tested by having a practice user create a task with "shared" visibility for a workspace, then logging in as the client, viewing the task, marking it complete, adding a comment, and attaching a file.

**Acceptance Scenarios**:

1. **Given** a practice user has created tasks with "shared" visibility for the client's workspace, **When** the client opens the Tasks tab, **Then** they see a checklist of all shared tasks showing: title, due date (if set), and status (open, in progress, complete).
2. **Given** a client views a task, **When** they click the checkbox next to the task, **Then** the task status changes to "complete" and the practice is notified that the client completed the task.
3. **Given** a client views a task with a description, **When** they expand the task, **Then** they see the full description, any comments from the practice, and any attached files -- all in chronological order.
4. **Given** a client wants to respond to a task, **When** they type a comment and click "Send", **Then** the comment is added to the task thread and the practice user assigned to the task is notified.
5. **Given** a client wants to attach a file to a task (e.g., a receipt scan), **When** they click "Attach File" and upload a document, **Then** the file is attached to the task and visible to both the client and the practice.
6. **Given** a client wants to raise a new request, **When** they click "New Request", **Then** they see a structured form with: category (General, Tax, Payroll, Compliance, Reporting, Other), subject, description, and urgency (Low, Normal, High).
7. **Given** a client submits a request, **When** the submission succeeds, **Then** the request appears in the client's task list as "Submitted" and the practice receives a notification with the request details.
8. **Given** a client views their tasks, **When** they have both open tasks and completed tasks, **Then** open tasks appear at the top sorted by due date (nearest first), and completed tasks appear below in a collapsible "Completed" section.
9. **Given** a task has no due date set, **When** the client views the task in the list, **Then** no due date is shown -- the task is sorted after all dated tasks.

---

### User Story 5 -- Document Upload and Management (Priority: P2)

A client opens their Documents tab and sees two clear sections: "My Uploads" (documents they have uploaded) and "Shared with Me" (documents the practice has shared). They can upload receipts, bank statements, and source documents directly, and these arrive in the entity's intake pipeline for the practice to process.

**Why this priority**: Document exchange is the second most time-consuming practice-client interaction after report requests. Replacing the email/Dropbox shuffle with structured uploads eliminates lost documents, provides an audit trail, and feeds directly into the entity's document pipeline. This is P2 because it depends on Story 1 (layout) but can ship independently of reporting or tasks.

**Independent Test**: Can be tested by logging in as a client, uploading a document, and verifying it appears in both the client's "My Uploads" section and the entity's intake pipeline for the practice to process.

**Acceptance Scenarios**:

1. **Given** a client opens the Documents tab, **When** the page loads, **Then** they see two distinct sections: "My Uploads" (showing documents they have uploaded) and "Shared with Me" (showing documents the practice has shared with them).
2. **Given** a client clicks "Upload Document", **When** they select a file (PDF, JPG, PNG, or CSV up to 20MB), **Then** the file is uploaded, appears immediately in their "My Uploads" section with the filename, upload date, and a thumbnail or file-type icon.
3. **Given** a client uploads a document, **When** the upload completes, **Then** the document is delivered to the entity's intake pipeline for the practice to review and process -- the client does not need to specify a category or destination.
4. **Given** a practice user has shared a document with the client (e.g., an engagement letter or tax return summary), **When** the client views "Shared with Me", **Then** the document appears with its name, the date it was shared, and a download button.
5. **Given** a client has uploaded multiple documents, **When** they view "My Uploads", **Then** documents are listed in reverse chronological order (newest first) with the ability to delete an upload only if it has not yet been processed by the practice (determined by whether the practice has actioned the item in their intake pipeline).
6. **Given** a client attempts to upload a file exceeding 20MB, **When** the upload fails, **Then** they see a clear error message: "File size must be under 20MB. Please compress the file or contact your accountant."
7. **Given** a client uploads a document with drag-and-drop, **When** they drag a file over the upload area, **Then** a visual drop zone indicator appears and the file uploads when dropped.
8. **Given** a client has no uploads and no shared documents, **When** they open the Documents tab, **Then** each section shows an appropriate empty state: "Upload receipts and statements here" and "Documents shared by your accountant will appear here."
9. **Given** a client selects multiple files at once (via file picker or drag-and-drop), **When** the upload completes, **Then** each file creates a separate entry in "My Uploads" and a separate item in the entity's intake pipeline.

---

### User Story 6 -- Document Signing (Priority: P2)

A client receives a notification that a document requires their signature. They open the signing request from their dashboard or Documents tab, review the document, and sign it electronically within the portal. The signed document is recorded in the existing document governance system.

**Why this priority**: Document signing is a compliance-critical workflow. Clients currently receive signing requests via email links that open outside the portal. Integrating signing into the portal keeps the experience cohesive, provides visibility in the dashboard, and creates a single place for all practice-client interactions. This is P2 because it leverages the existing 059-DGS signing infrastructure.

**Independent Test**: Can be tested by having a practice user send a signing request to a client, then logging in as the client, opening the request, signing the document, and verifying the signed status is recorded.

**Acceptance Scenarios**:

1. **Given** a practice has sent a signing request to a client, **When** the client views their dashboard, **Then** the signing request appears in the "Action Required" banner with the document title and a "Sign Now" link.
2. **Given** a client clicks "Sign Now" on a signing request, **When** the signing page loads, **Then** they see the document content rendered for review with signature fields clearly marked, and a "Sign" action button.
3. **Given** a client has reviewed a document and clicks "Sign", **When** they confirm the signature (by typing their name or drawing a signature), **Then** the document status changes to "signed", the practice is notified, and the client sees a confirmation: "Document signed successfully."
4. **Given** a client has signing requests, **When** they open the Documents tab, **Then** signing requests appear in a distinct "Awaiting Signature" section above the "Shared with Me" section.
5. **Given** a client has already signed a document, **When** they view the signed document, **Then** they can download the signed PDF but cannot modify or re-sign it.
6. **Given** a signing request has an expiry date, **When** the client views the request after the expiry date, **Then** they see "This signing request has expired. Please contact your accountant to resend."
7. **Given** a client declines to sign a document, **When** they click "Decline" and provide a reason, **Then** the document status changes to "declined", the practice is notified with the reason, and the client sees confirmation.

---

### User Story 7 -- In-Platform Messaging (Priority: P2)

A client opens their Messages tab and sees threaded conversations with their accountant. Messages can be standalone or tied to a specific context (a report, a task, a document). The client can start a new conversation or reply to an existing thread. This replaces email and phone for routine practice-client communication.

**Why this priority**: Messaging centralises communication that currently happens across email, phone, and ad-hoc channels. Without it, every other portal feature generates communication that still flows outside the platform, fragmenting the experience. This is P2 because the portal is usable without messaging (clients can still email), but messaging is essential for the "single pane of glass" value proposition.

**Independent Test**: Can be tested by having a practice user send a message to a client, then logging in as the client, viewing the message, replying, and verifying the reply appears in the thread on both sides.

**Acceptance Scenarios**:

1. **Given** a client opens the Messages tab, **When** the page loads, **Then** they see a list of conversation threads sorted by most recent message first, each showing: the subject or context (e.g., "Re: Q3 BAS"), the last message preview, the timestamp, and an unread indicator if applicable.
2. **Given** a client clicks on a conversation thread, **When** the thread opens, **Then** they see the full message history in chronological order with each message showing the sender name, timestamp, and content.
3. **Given** a client wants to reply to a thread, **When** they type a message and click "Send", **Then** the message is added to the thread and the practice user(s) in the conversation are notified.
4. **Given** a client wants to start a new conversation, **When** they click "New Message", **Then** they can enter a subject line and message body -- the message is sent to their assigned advisor or, if no advisor is assigned, to the practice's general inbox.
5. **Given** a practice user sends a message linked to a specific report (e.g., "Please review your Q3 P&L"), **When** the client views the thread, **Then** a contextual link appears at the top of the thread: "Related to: Q3 Profit & Loss" which navigates to the report when clicked.
6. **Given** a client has unread messages, **When** they view the Messages tab in the sidebar, **Then** a badge shows the unread message count.
7. **Given** a client sends a message in a thread, **When** the message is submitted, **Then** the message appears immediately in the sender's thread view (optimistic update). The recipient sees the message on their next page load or thread refresh.
8. **Given** a client has no messages, **When** they open the Messages tab, **Then** they see an empty state: "No messages yet. Start a conversation with your accountant using the 'New Message' button."

---

### User Story 8 -- Notifications and Alerts (Priority: P3)

A client receives notifications when actionable events occur: tasks assigned, reports shared, documents requiring signature, upcoming deadlines, and message replies. Notifications are delivered both in-app (bell icon with badge) and via email. The client can configure which notifications they receive and through which channel.

**Why this priority**: Notifications are the mechanism that brings clients back to the portal. Without them, clients only engage when they remember to log in. However, the portal is functional without notifications -- clients can still check manually -- which is why this is P3.

**Independent Test**: Can be tested by triggering a notification event (e.g., practice shares a report), verifying the in-app notification appears with a badge, verifying the email is delivered, and then configuring the client's preferences to disable email for that type and verifying no email is sent on the next event.

**Acceptance Scenarios**:

1. **Given** a practice shares a report with a client, **When** the sharing action completes, **Then** the client receives an in-app notification: "[Practice Name] shared a report: [Report Name]" with a link to the report.
2. **Given** a practice assigns a task to a client, **When** the task is created with "shared" visibility, **Then** the client receives an in-app notification: "New task: [Task Title]" with a link to the task.
3. **Given** a practice sends a signing request, **When** the request is sent, **Then** the client receives an in-app notification and an email: "Document requires your signature: [Document Title]" with a link to sign.
4. **Given** a compliance deadline is within 14 days, **When** the daily notification check runs, **Then** the client receives a notification: "[Obligation Name] is due in [N] days" -- sent once when entering the 14-day window and again at 3 days remaining.
5. **Given** a practice user replies to a client's message, **When** the reply is sent, **Then** the client receives an in-app notification: "New reply from [Advisor Name] in [Thread Subject]" with a link to the thread.
6. **Given** a client opens the notification bell, **When** they view the notification list, **Then** notifications are grouped by date with unread items visually distinct, and each notification has a link to the relevant item.
7. **Given** a client opens Settings > Notifications, **When** they view notification preferences, **Then** they can toggle each notification type on/off independently for both in-app and email channels, with sensible defaults (all in-app on, email on for signing and deadlines only).
8. **Given** a client has disabled email notifications for "Report Shared", **When** a practice shares a report, **Then** the in-app notification still appears but no email is sent for that event.

---

### User Story 9 -- Practice Branding (Priority: P3)

A practice configures their portal branding: logo, primary colour, and practice name. When their clients log into the portal, they see the practice's brand -- not the MoneyQuest brand -- creating a white-label experience that reinforces the practice-client relationship.

**Why this priority**: Branding is a significant differentiator for practices evaluating portal solutions, but clients will use the portal without it. The core portal functionality (dashboard, reports, tasks, documents, messages) works identically whether branded or not. This is P3 because it is high-value for practice adoption but not blocking for client value.

**Independent Test**: Can be tested by having a practice user configure a logo and primary colour, then logging in as one of the practice's clients and verifying the logo, colour, and practice name appear throughout the portal.

**Acceptance Scenarios**:

1. **Given** a practice user navigates to their practice settings, **When** they open the "Client Portal Branding" section, **Then** they can upload a logo (PNG or SVG, max 2MB, recommended 200x60px), set a primary accent colour (hex colour picker), and edit the display name shown to clients.
2. **Given** a practice has uploaded a logo and set a primary colour, **When** a client of that practice logs into the portal, **Then** the practice logo appears in the sidebar header, the primary colour is applied to active navigation items and primary buttons, and the practice name appears in the header.
3. **Given** a practice has NOT configured branding, **When** a client logs in, **Then** the MoneyQuest default logo and colour scheme are used, with the practice's registered name from the Practice model displayed in the header.
4. **Given** a client belongs to multiple workspaces managed by different practices, **When** they switch between workspaces, **Then** the branding updates to match the practice associated with the currently selected workspace.
5. **Given** a practice uploads a new logo, **When** the upload is saved, **Then** the logo change is reflected for all clients on their next page load -- no client action required.
6. **Given** a practice-branded portal, **When** the client downloads a PDF report, **Then** the PDF header includes the practice logo and name, not the MoneyQuest brand.

---

### User Story 10 -- Self-Service Onboarding (Priority: P3)

A practice sends an invite link to a client. The client clicks the link, creates their account, and lands directly in the portal with a guided first-run experience. The onboarding orients them to the portal: "Here's your dashboard, your accountant has shared these reports, you have 2 tasks to complete." No prior MoneyQuest knowledge is required.

**Why this priority**: Onboarding determines whether a client adopts the portal or abandons it after the first visit. A confusing first experience means the client goes back to emailing their accountant. However, this is P3 because clients CAN be onboarded manually (practice creates the user account and talks them through it) -- self-service just makes it scalable.

**Independent Test**: Can be tested by generating an invite link from the practice, opening it in an anonymous browser, completing registration, and verifying the guided onboarding flow completes with the client landing on a populated dashboard.

**Acceptance Scenarios**:

1. **Given** a practice user generates a client invite link, **When** they access the invite creation form, **Then** they can enter the client's name and email address, select which workspace(s) the client will have access to, and generate a unique invite link.
2. **Given** a client clicks the invite link, **When** the registration page loads, **Then** they see a branded page (practice logo and name) with fields for: name, email (pre-filled from invite), and password -- with no mention of workspaces, roles, or accounting concepts.
3. **Given** a client completes registration via an invite link, **When** they log in for the first time, **Then** they see a guided overlay tour (3-4 steps) highlighting: "This is your Dashboard", "View reports your accountant has shared", "Complete tasks here", and "Upload documents for your accountant."
4. **Given** a client completes the onboarding tour, **When** they dismiss it, **Then** they land on the dashboard with any pre-existing content (shared reports, pending tasks, signing requests) already visible.
5. **Given** a client has previously completed the onboarding tour, **When** they log in again, **Then** the tour does not repeat -- but they can re-trigger it from Settings if needed.
6. **Given** an invite link has been used to create an account, **When** a second person clicks the same link, **Then** they see a message: "This invite has already been used. Contact your accountant for a new invite."
7. **Given** a client already has a MoneyQuest account (e.g., they are a client of another practice), **When** they click an invite link, **Then** they are prompted to log in with their existing account and the new workspace is added to their account -- no duplicate registration.

---

### Edge Cases

- **Client with multiple entities**: A client may have client access to 2+ workspaces (e.g., personal and business). The workspace switcher lets them switch between entities. Each entity's dashboard, reports, tasks, and documents are independent and workspace-scoped.
- **Practice removes client access**: When a practice removes a client from a workspace, the client immediately loses access to that workspace. If it was their only workspace, they see an empty state: "You don't have access to any entities. Contact your accountant." No data is deleted -- the client simply cannot see it.
- **Branding fallback chain**: If the practice has configured branding, use it. If the practice has a logo but no custom colour, use the logo with default colours. If the practice has no branding at all, show the MoneyQuest brand with the practice's registered name from the Practice model.
- **Signing request for non-portal client**: If a signing request is sent to a client who has not yet created a portal account, the signing email link should still work (via the existing 059-DGS email flow). Once the client creates an account, pending signing requests appear in their portal.
- **Report un-shared after client download**: If a practice un-shares a report after the client has downloaded the PDF, the client retains their downloaded copy. The report simply disappears from the client's Reports library on next load.
- **Message thread with no assigned advisor**: If a client's workspace has no assigned practice advisor, new messages are routed to the practice's general inbox (all practice members with access to that workspace can see it).
- **Client uploads document to wrong entity**: If a client has multiple workspaces, the upload is always scoped to the currently active workspace shown in the workspace switcher. A confirmation toast shows which entity received the upload.
- **Notification fatigue**: Default notification preferences are conservative: in-app notifications are on for all types, email notifications are on only for signing requests and deadline alerts. Clients can adjust in Settings.
- **Invite link for existing user with different role**: If an invited email matches an existing user who already has a different role in that workspace (e.g., bookkeeper), the invite fails with a message to the practice: "This user already has access to this workspace with a different role."
- **Practice with no clients yet**: When a practice has not yet invited any clients, the client portal branding settings are available but a helper message explains: "These settings will apply when you invite your first client."
- **Concurrent message sending**: If a client and advisor send messages simultaneously, both messages appear in the thread in the order received by the server. No message is lost.
- **Client in workspace with no connected practice**: If a client-role user exists in a workspace that has no connected practice (no PracticeWorkspace record), the portal shows MoneyQuest default branding, the Messages tab is hidden (no practice to message), and the Tasks/Requests sections show empty states. Reports, Documents, and Dashboard remain functional.
- **Client request status labels**: The client sees user-friendly status labels: "Submitted" (for status `new`), "In Review" (for `acknowledged`), "In Progress" (for `in_progress`), "Resolved" (for `resolved`), "Closed" (for `closed`). The underlying ClientRequestStatus enum values are preserved.
- **New client permissions required**: The client role currently has read-only permissions. The portal requires new permissions or role-based authorization for: uploading documents to the intake pipeline, creating and viewing messages, managing notification preferences, and submitting client requests. These should be added to the client role in the permissions seeder.

---

## Requirements

### Functional Requirements

**Client Layout & Routing**

- **FR-001**: The system MUST detect the user's role on login and route client-role users to the client portal layout, while all other roles see the standard accounting interface.
- **FR-002**: The client portal layout MUST contain exactly 6 navigation items: Dashboard, Reports, Tasks, Documents, Messages, and Settings.
- **FR-003**: The client portal MUST render as a responsive layout with a bottom tab bar on viewports under 768px and a sidebar on larger viewports.
- **FR-004**: The client portal MUST include a workspace switcher for clients with access to multiple entities, scoping all data to the selected workspace.

**Client Dashboard**

- **FR-005**: The dashboard MUST display financial health cards showing revenue, expenses, profit/loss, and cash position for the current open period, each with a trend indicator compared to the prior period.
- **FR-006**: The dashboard MUST display an "Upcoming Deadlines" widget listing compliance obligations due within the next 60 days, sorted by nearest due date.
- **FR-007**: The dashboard MUST display a "Recent Activity" feed showing the 10 most recent events relevant to the client (reports shared, tasks assigned, documents shared, signing requests).
- **FR-008**: The dashboard MUST display compliance status with traffic-light indicators (green/amber/red) for each tracked obligation.
- **FR-009**: The dashboard MUST display an "Action Required" banner when the client has pending tasks, unsigned signing requests, or unread messages, linking directly to each item.

**Report Access**

- **FR-010**: Practice users MUST be able to mark any generated report (P&L, Balance Sheet, BAS, Custom) as "shared with client" from the report generation or report detail page.
- **FR-011**: Reports marked as shared MUST automatically appear in the client's Reports library without any additional action by the client.
- **FR-012**: Clients MUST be able to view shared reports on-screen and download them as PDF with practice branding applied to the PDF header.
- **FR-013**: Practice users MUST be able to un-share a previously shared report, immediately removing it from the client's library.
- **FR-014**: The Reports library MUST support filtering by report type (Profit & Loss, Balance Sheet, BAS, Custom) and sorting by date shared or reporting period.

**Task Interaction**

- **FR-015**: Clients MUST see all tasks in their workspace that have "shared" visibility, displayed as a checklist sorted by due date (nearest first, undated last).
- **FR-016**: Clients MUST be able to mark a shared task as complete, triggering a notification to the assigned practice user.
- **FR-017**: Clients MUST be able to add comments and attach files to shared tasks.
- **FR-018**: Clients MUST be able to submit a new request to the practice via a structured form with fields: category, subject, description, and urgency.
- **FR-019**: Client requests MUST create a ClientRequest record linked to the practice and workspace, and notify the practice.

**Document Upload & Management**

- **FR-020**: Clients MUST be able to upload files (PDF, JPG, PNG, CSV; max 20MB per file) to their active workspace's intake pipeline.
- **FR-021**: Uploaded documents MUST appear in the client's "My Uploads" section with filename, upload timestamp, and file-type indicator.
- **FR-022**: The system MUST deliver client-uploaded documents to the entity's intake pipeline (InboxItem) for practice processing, with source tagged as "upload" (the existing InboxItemSource value) and the uploading user tracked to distinguish client uploads from practice uploads.
- **FR-023**: Practice users MUST be able to share documents with clients; shared documents MUST appear in the client's "Shared with Me" section.
- **FR-024**: Clients MUST be able to delete their own uploads only if the upload has not yet been processed by the practice.
- **FR-025**: Document upload MUST support drag-and-drop with a visual drop zone indicator.

**Document Signing**

- **FR-026**: Signing requests sent to client-role users MUST appear in the client portal's Documents tab under "Awaiting Signature" and in the dashboard "Action Required" banner.
- **FR-027**: Clients MUST be able to review and sign documents within the portal using the existing 059-DGS signing infrastructure.
- **FR-028**: Clients MUST be able to decline a signing request with a reason, triggering notification to the practice.
- **FR-029**: Signed and declined documents MUST show their final status and allow the client to download the signed PDF.
- **FR-030**: Expired signing requests MUST display a clear expiry message to the client.

**In-Platform Messaging**

- **FR-031**: The system MUST support threaded, asynchronous messaging between clients and practice users.
- **FR-032**: Messages MUST be scoped to a workspace (entity) -- a client's messages in one workspace are not visible in another.
- **FR-033**: Messages MAY be linked to a specific context entity (a shared report, a task, a document, a signing request) via a polymorphic reference.
- **FR-034**: Clients MUST be able to start new conversation threads and reply to existing threads.
- **FR-035**: New messages from clients MUST be routed to the primary practice member assigned to the workspace (the PracticeMemberAssignment record where `is_primary = true`). If no primary member is assigned, messages MUST be routed to all practice users with assignments to that workspace.
- **FR-036**: The Messages tab MUST display an unread badge count in the navigation.

**Notifications & Alerts**

- **FR-037**: The system MUST generate client-facing notifications for the following events. **Existing types** (already in NotificationType): task_shared_with_client, task_comment_added, task_overdue, signing_request_sent, signing_reminder, signing_document_completed, signing_document_declined. **New types** (to be added): report_shared_with_client, deadline_approaching, client_message_received.
- **FR-038**: Notifications MUST be delivered via both in-app (bell icon with badge) and email channels.
- **FR-039**: Clients MUST be able to configure notification preferences per type and per channel (in-app/email) from Settings.
- **FR-040**: Default notification preferences MUST be conservative: all in-app on; email on for signing requests and deadline alerts only.

**Practice Branding**

- **FR-041**: Practice users MUST be able to configure portal branding: logo (PNG/SVG, max 2MB), primary accent colour (hex), and display name.
- **FR-042**: Branding MUST be applied to: the client portal sidebar/header, the login page (when accessed via practice invite link), and PDF report downloads.
- **FR-043**: When no branding is configured, the system MUST fall back to MoneyQuest default branding with the practice's registered name.
- **FR-044**: Branding changes MUST take effect for all clients on their next page load -- no client action required.

**Self-Service Onboarding**

- **FR-045**: Practice users MUST be able to generate single-use invite links for clients, specifying the client's name, email, and target workspace(s).
- **FR-046**: The invite registration page MUST be branded with the inviting practice's logo and name and require only: name, email (pre-filled), and password.
- **FR-047**: First-time login after invite registration MUST trigger a guided onboarding overlay (3-4 steps) introducing the portal sections.
- **FR-048**: The onboarding tour MUST not repeat on subsequent logins but MUST be re-triggerable from Settings.
- **FR-049**: If an invited email matches an existing MoneyQuest user, the system MUST add the new workspace to their existing account instead of creating a duplicate.
- **FR-050**: Used invite links MUST be invalidated after successful registration.

**Security & Isolation**

- **FR-051**: All client portal data access MUST be scoped to the client's workspace_id via the existing SetWorkspaceContext middleware.
- **FR-052**: Clients MUST NOT be able to access any data, page, or API endpoint that their role permissions do not explicitly allow.
- **FR-053**: Client-uploaded documents MUST be stored in tenant-scoped storage paths, inaccessible to clients of other workspaces.

### Non-Functional Requirements

- **NFR-001 (Performance)**: The client dashboard MUST load within 2 seconds on a 4G mobile connection, including all financial health cards and the activity feed.
- **NFR-002 (Responsiveness)**: All portal pages MUST be fully functional on viewports from 320px to 2560px wide, with no horizontal scrolling on mobile.
- **NFR-003 (Accessibility)**: The portal MUST meet WCAG 2.1 AA standards, with keyboard navigation support and screen-reader-compatible markup.
- **NFR-004 (Security)**: All client API endpoints MUST verify workspace membership AND role permissions before returning data. No endpoint should rely solely on authentication.
- **NFR-005 (Scalability)**: The messaging system MUST support at least 1,000 concurrent active conversations per practice without degradation.
- **NFR-006 (Offline)**: If the client loses connectivity while composing a message, the draft MUST be preserved in local storage and recoverable on reconnection.

### Key Entities

- **SharedReport**: Links a report to client visibility. Attributes: workspace_id, report_type (enum: profit_loss, balance_sheet, bas, custom), report_config (the generation parameters -- same format as ReportTemplate.config -- enabling on-demand re-rendering so the client always sees current data), period_start, period_end, shared_by_user_id, shared_at, unshared_at (nullable). A SharedReport being un-shared is a soft removal (unshared_at is set), not a hard delete. Note: this is distinct from `ReportTemplate.is_shared`, which controls intra-workspace template sharing among accountant-role users.

- **ClientMessage**: A single message within a conversation thread. Attributes: workspace_id, thread_id (references ClientMessageThread), sender_user_id, body (text), read_at (nullable), context_type (nullable polymorphic type -- e.g., "shared_report", "practice_task", "signing_document"), context_id (nullable polymorphic ID). Messages are immutable once sent.

- **ClientMessageThread**: Groups related messages into a conversation. Attributes: workspace_id, practice_id, subject, last_message_at, created_by_user_id. Participants are derived from the workspace's client users and the practice users with assignments to that workspace (via PracticeMemberAssignment). The primary assigned member (is_primary = true) is the default recipient for new threads.

- **PortalBranding**: Stores branding configuration per practice. Attributes: practice_id (unique), logo_path, primary_colour (hex string), display_name. One record per practice. Falls back to Practice.name and Practice.logo_url if PortalBranding does not exist.

- **ClientInvite**: A single-use invite for client onboarding. Attributes: practice_id, workspace_id, invited_email, invited_name, token (unique, opaque), created_by_user_id, used_at (nullable), expires_at. Invite is consumed (used_at set) on successful registration.

- **ClientNotificationPreference**: Per-client notification preference overrides. Attributes: user_id, workspace_id, notification_type (enum matching relevant NotificationType values), in_app_enabled (boolean, default true), email_enabled (boolean, default varies by type). Rows are created on first override; missing rows mean "use system default."

**Existing entities leveraged (not new)**:

- **PracticeTask** (027-PMV): Tasks with `visibility: shared` are shown to clients. The `status` and `completed_at` fields track client completion.
- **ClientRequest** (027-PMV): Structured requests from clients to their practice. Already has category, subject, description, urgency, status, and comment support.
- **SigningDocument** (059-DGS): Documents requiring signature. Already has signatory tracking, status lifecycle, and event logging. Portal integrates the client-facing view.
- **InboxItem** (018-ITR): The entity's document intake pipeline. Client uploads create InboxItems with `source: client_upload`.
- **Attachment** (012-ATT): Polymorphic file attachments on tasks, messages, and documents.
- **Notification** (024-NTF): The existing notification system with NotificationType enum. New client-facing types will be added.

---

## Integration Points

### 027-PMV Practice Management v2

- Client portal reads PracticeTask records with `visibility: shared` for the task checklist.
- Client portal writes task comments via PracticeTaskComment and updates task status on completion.
- Client portal creates ClientRequest records when clients submit new requests.
- Client portal reads ClientRequest records to show request status and history.

### 059-DGS Document Governance & Signing

- Client portal reads SigningDocument records where the client is a signatory.
- Client portal uses the existing signing flow (sign/decline actions) via the signing controller.
- Signing request notifications integrate with the dashboard "Action Required" banner.

### 012-ATT File Attachments

- Client document uploads attach to InboxItem via the polymorphic attachment system.
- Task file attachments use the existing HasAttachments trait on PracticeTask.
- Message file attachments use HasAttachments on ClientMessage.

### 018-ITR Intray / Inbox

- Client-uploaded documents create InboxItem records with `source: upload` (the existing InboxItemSource::Upload value). The uploading user is tracked via a field on the InboxItem so the practice can distinguish client uploads from practice-initiated uploads.
- The practice sees these in their standard intray/inbox workflow.

### 024-NTF Notifications & Activity Feed

- New notification types are added for client-specific events (report shared, deadline approaching).
- Existing notification types (task_shared_with_client, signing_request_sent, etc.) are reused.
- Client notification preferences override the default delivery channel per type.

### 007-FRC Financial Reporting

- SharedReport references report generation parameters so the report can be re-rendered on-screen.
- PDF download uses the existing report generation pipeline with practice branding injected.

### 003-AUT Auth & Multi-tenancy

- Client portal routing depends on the "client" role detected at login.
- Workspace switching uses the existing SetWorkspaceContext middleware.
- Client invite registration creates a user with the "client" role in the specified workspace.

---

## UI Wireframe Descriptions

### Client Sidebar (Desktop, 768px+)

A narrow sidebar (240px) with the practice logo at the top, followed by 6 navigation items stacked vertically: Dashboard (home icon), Reports (bar-chart icon), Tasks (checkbox icon), Documents (folder icon), Messages (chat-bubble icon with unread badge), Settings (gear icon). The active item is highlighted with the practice's primary colour. Below the navigation, the workspace switcher shows the current entity name with a dropdown arrow.

### Client Bottom Tab Bar (Mobile, under 768px)

A fixed bottom bar with 5 icon tabs: Dashboard, Reports, Tasks, Documents, Messages. Settings is accessible from the user avatar menu in the header. The active tab is indicated by the practice's primary colour. Unread badges appear on Messages.

### Client Dashboard Page

Single-column card layout on mobile, two-column grid on tablet+. Top section: "Action Required" banner (amber background, list of pending items with links). Below: 4 financial health cards in a 2x2 grid (revenue, expenses, profit, cash -- each with value and trend arrow). Below: "Upcoming Deadlines" card (list with date chips and status dots). Below: "Recent Activity" card (feed of 10 items with icons and timestamps). Below: "Compliance Status" card (list with traffic-light indicators).

### Reports Library Page

A list view of shared reports. Each row: report type icon, report name, reporting period, date shared, and a "View" button. Filter bar at top with type chips (All, P&L, Balance Sheet, BAS, Custom). Clicking "View" opens a full-screen report viewer with a toolbar: "Download PDF" button, print button, and a close/back button.

### Tasks Page

A simple checklist. Each task row: checkbox (clickable to complete), task title, due date badge (red if overdue, amber if due within 7 days, grey otherwise), and an expand arrow. Expanding shows: description, comments thread, attached files, and a comment input box. At the top: "New Request" button. Below the open tasks: a collapsible "Completed" section.

### Documents Page

Three sections stacked vertically. Top: "Awaiting Signature" (if any signing requests exist) -- each row: document title, status badge, "Sign Now" button. Middle: "Shared with Me" -- each row: document name, date shared, download button. Bottom: "My Uploads" -- each row: filename, upload date, status (pending/processed), delete button (if pending). A prominent "Upload Document" button at the top of the page with a drag-and-drop zone.

### Messages Page

Split view on desktop: thread list (left, 300px) and active thread (right). On mobile: thread list is full-screen, tapping a thread opens the thread view with a back button. Thread list: each row shows subject, last message preview (truncated), timestamp, unread dot. Thread view: chronological message bubbles (client messages right-aligned, practice messages left-aligned), contextual link at top if the thread is linked to a report/task/document, message input bar at bottom with attach file button.

### Settings Page

Simple form layout. Sections: "Notification Preferences" (table of notification types with in-app and email toggle columns), "Appearance" (option to re-trigger onboarding tour), "Account" (name, email, password change). No workspace or accounting settings are shown to clients.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Clients can log in and view their portal dashboard within 3 seconds on a 4G mobile connection.
- **SC-002**: At least 70% of invited clients complete the self-service onboarding flow and log in successfully within 7 days of receiving the invite.
- **SC-003**: Practice-to-client "send me my report" requests (measured by client request submissions in the "reporting" category) decrease by 40% within 3 months of portal adoption for practices with 5+ active clients.
- **SC-004**: 90% of client-uploaded documents are successfully delivered to the entity's intake pipeline without manual intervention.
- **SC-005**: Client document signing requests are completed within the portal (not via external email link) for at least 80% of signing events within 3 months of launch.
- **SC-006**: Zero instances of a client accessing data from a workspace they are not a member of -- verified by automated tenant isolation tests.
- **SC-007**: The messaging system handles 100 concurrent active threads per practice without response time exceeding 500ms.
- **SC-008**: At least 60% of portal-active clients use the dashboard at least once per week during their entity's active reporting period.

---

## Out of Scope

- **Full helpdesk/ticketing system**: Messaging is simple threaded conversations, not a ticket queue with SLAs, escalation rules, or canned responses.
- **Client-to-client communication**: Clients cannot message other clients, even within the same workspace.
- **Real-time chat**: Messages are asynchronous (like email). No typing indicators, presence, or push-to-refresh.
- **Native mobile app**: The portal is a responsive web application. Native iOS/Android apps are a future consideration.
- **Client self-service accounting**: Clients cannot create journal entries, invoices, or any accounting records through the portal. They interact with what the practice shares.
- **Automated report sharing**: Reports must be manually marked as "shared" by a practice user. Automatic sharing based on rules or schedules is a future enhancement.
- **Multi-language support**: The portal launches in English only.
- **Viral growth / referral mechanics**: Covered by 065-VGR, not this epic.
- **Practice-side client management UI**: Covered by 058-CPT, not this epic.

---

## Phasing

**Phase 1 (Sprints 1-2)**: Client layout, dashboard, report access, document upload -- the read-heavy, highest-value features that give clients self-service visibility.

**Phase 2 (Sprints 3-4)**: Task interaction, document signing, messaging -- the interactive features that replace email-based workflows.

**Phase 3 (Sprint 5)**: Notifications, practice branding, self-service onboarding -- the engagement and adoption features that make the portal scalable.

---

## Clarifications

### Session 2026-03-22 (Autonomous Spec Review)

1. Q: How should client task writes (mark complete, add comment) be authorized given PracticeTask is a Central model? --> A: Use existing `practice-task.view` permission + workspace_id match. The `shared` visibility flag is the real access gate. No new permissions needed for task interactions.

2. Q: PracticeTask.status is untyped strings -- what values does the portal read/write? --> A: Task statuses in the codebase are `todo`, `in_progress`, `done`. Client-facing labels map: "Open" = todo, "In Progress" = in_progress, "Complete" = done. Client can transition to `done` (sets `completed_at`).

3. Q: InboxItemSource has only `Email` and `Upload` -- no `client_upload`. Which source? --> A: Use existing `Upload` value. Track the uploading user via InboxItem fields to distinguish client vs practice uploads. Spec FR-022 updated.

4. Q: ReportTemplate.is_shared already exists -- do we still need SharedReport? --> A: Yes. `is_shared` on ReportTemplate is for intra-workspace template sharing among accountant-role users, not client visibility. SharedReport is a distinct model. Spec entity description updated.

5. Q: Signing request routes are user-scoped, not workspace-scoped. Compatible? --> A: Yes. Existing `/signing-requests` endpoints work as-is for the portal. They are correctly scoped to the signatory's user_id. No new endpoints needed.

6. Q: Existing NotificationPreference model has coarse category-level toggles. Compatible with per-type, per-channel needs? --> A: No. Existing model is too coarse. ClientNotificationPreference (new model) is correct as specified with per-type, per-channel, per-workspace granularity.

7. Q: How is the "assigned advisor" for message routing determined? --> A: Via PracticeMemberAssignment where `is_primary = true` for the workspace. Fallback: all practice members with assignments to the workspace. Spec FR-035 and entity descriptions updated.

8. Q: Should PortalBranding be a new model given Practice.logo_url and Workspace.branding exist? --> A: Yes. Practice.logo_url is general practice branding. Workspace.branding is entity-level (invoices). PortalBranding is portal-specific white-label config. Fallback chain: PortalBranding > Practice > MoneyQuest default.

9. Q: Should ClientInvite reuse Practice.invite_token? --> A: No. Practice.invite_token is a reusable practice-level token. ClientInvite is per-recipient, per-workspace, single-use. New model as specified.

10. Q: Do the spec's request categories and urgency values match existing enums? --> A: Yes. ClientRequestCategory (General, Tax, Payroll, Compliance, Reporting, Other) and ClientRequestUrgency (Low, Normal, High) match exactly.

11. Q: ClientRequestStatus has New/Acknowledged/InProgress/Resolved/Closed -- how do client-facing labels map? --> A: New = "Submitted", Acknowledged = "In Review", InProgress = "In Progress", Resolved = "Resolved", Closed = "Closed". Edge case added to spec.

12. Q: Navigation.ts already has getNavForEntityType() and clientPracticeNav. How does portal layout relate? --> A: Portal extends the pattern with a new `role === 'client'` branch, replacing the entire nav (not just adding items). Same pattern as personalNav. Implementation detail, no spec change.

13. Q: Should clients be able to upload multiple files at once? --> A: Yes. Multi-file select and drag-and-drop, but each file creates a separate InboxItem (matching existing 1:1 pattern). New acceptance scenario added to US5.

14. Q: What determines if a client upload is "processed" for deletion permission? --> A: InboxItem.processed_at being non-null. Once the practice actions the item, processed_at is set and client loses delete permission. Spec AC clarified.

15. Q: Which existing NotificationType values are client-relevant, and which are new? --> A: 7 existing types reused (task_shared_with_client, task_comment_added, task_overdue, signing_request_sent, signing_reminder, signing_document_completed, signing_document_declined). 3 new types needed (report_shared_with_client, deadline_approaching, client_message_received). FR-037 updated.

16. Q: US7-AC7 says "appears immediately without page refresh" but Out of Scope excludes real-time chat. Contradiction? --> A: Resolved. Sender sees optimistic update immediately. Recipient sees new messages on next page load or thread refresh. AC7 updated.

17. Q: How are reports rendered on-screen for clients? --> A: SharedReport stores generation parameters (same format as ReportTemplate.config). Reports are re-rendered on demand via the existing report generation pipeline + frontend components, showing live data. SharedReport entity updated.

18. Q: Where does the dashboard financial health data come from? --> A: A lightweight endpoint returning 4 KPIs (revenue, expenses, profit/loss, cash position) from AccountBalance projections for the current period. Client's existing `report.*` permissions authorize access. Implementation detail.

19. Q: Client role has read-only permissions. How does the client write messages, upload documents, manage preferences? --> A: New permissions or role-based authorization needed. Edge case added to spec noting new client permissions are required for uploads, messages, notification preferences, and request submission.

20. Q: What happens if a client is in a workspace with no connected practice? --> A: MoneyQuest default branding shown, Messages tab hidden, Tasks/Requests show empty states. Reports, Documents, and Dashboard remain functional. New edge case added.
