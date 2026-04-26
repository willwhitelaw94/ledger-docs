---
title: "Feature Specification: Accountant & Practice Management"
---

# Feature Specification: Accountant & Practice Management

**Feature Branch**: `015-ACT-accountant-practice-management`
**Created**: 2026-03-14
**Status**: Draft
**Epic**: 015-ACT
**Initiative**: FL — Financial Ledger Platform
**Effort**: XL
**Depends On**: 003-AUT (complete), 002-CLE (complete)

---

## Overview

Accounting firms and independent bookkeepers managing multiple clients on MoneyQuest Ledger today must navigate into each client's workspace individually. There is no consolidated view of work in progress, no formal way to hand a workspace to a client, and no invite-by-email flow for clients who are not yet registered. This epic delivers the infrastructure for accountant-led practice management: a cross-workspace advisor dashboard, a client list with internal notes, bulk report generation, a transaction reclassification tool, and structured invite and ownership handoff flows.

---

## User Scenarios & Testing

### User Story 1 — Advisor Dashboard: Cross-Workspace Status View (Priority: P1)

An accountant managing 15 client workspaces wants to see the health of every client on one screen before deciding where to spend their day. They need counts of pending items, date of last activity, and a one-click entry into any client workspace — without opening each workspace individually.

**Why this priority**: This is the central value proposition for accountant users. Without it, all other practice features are stranded — the advisor dashboard is the entry point and the daily driver. It directly removes the multi-workspace navigation problem identified in the problem statement.

**Independent Test**: Can be tested independently by creating a test user with Accountant role across three workspaces, navigating to the Advisor Dashboard, and confirming status cards render correctly for all three workspaces. Delivers value without any other story being complete.

**Acceptance Scenarios**:

1. **Given** I am logged in as a user with the `accountant` role in two or more workspaces, **When** I navigate to the Advisor Dashboard, **Then** I see one card per client workspace I have access to, each showing: workspace name, organisation name, count of pending approvals, count of unreconciled bank transactions, count of overdue invoices, and date of last ledger activity.

2. **Given** I am viewing the Advisor Dashboard, **When** I click the "Open" button on a client card, **Then** I am switched into that client's workspace context and land on that workspace's main dashboard.

3. **Given** I am viewing the Advisor Dashboard, **When** I select the "Needs Attention" filter, **Then** only workspaces where at least one of the following is true are shown: pending approvals > 0, unreconciled transactions > 0, overdue invoices > 0.

4. **Given** I am viewing the Advisor Dashboard, **When** I select the "Inactive (30+ days)" filter, **Then** only workspaces where the last recorded ledger activity was more than 30 days ago are shown.

5. **Given** I am viewing the Advisor Dashboard, **When** I select the "Pending Approvals" filter, **Then** only workspaces where pending approvals count is greater than zero are shown.

6. **Given** a workspace I have access to has no ledger activity recorded yet, **When** that workspace appears on the Advisor Dashboard, **Then** its "Last Activity" field displays "No activity yet" rather than a date.

7. **Given** I am logged in as an `owner` or `bookkeeper` (not `accountant`) in a workspace, **When** I navigate to the Advisor Dashboard, **Then** that workspace is still shown on my advisor dashboard (the dashboard is available to all workspace members, not limited to the `accountant` role).

---

### User Story 2 — Practice Client List: Add, Annotate, and Remove Practice Clients (Priority: P1)

An accountant wants to designate specific workspaces as their "practice clients" — a personal list separate from their full workspace access. They also want to add internal notes per client (visible only to them) to track context such as outstanding queries or upcoming deadlines.

**Why this priority**: Without the ability to curate the client list, the advisor dashboard becomes cluttered for accountants who have access to many workspaces (some as a client, some as an accountant). The internal notes capability is tightly coupled — it is what makes the client list a useful practice management tool rather than just a filtered view.

**Independent Test**: Can be tested independently by having one user add a workspace to their practice client list, add a note, then confirm a second user logged into the same workspace cannot see that note.

**Acceptance Scenarios**:

1. **Given** I am on the Advisor Dashboard or a workspace I have access to, **When** I click "Add to Practice Clients", **Then** that workspace is added to my personal practice client list and appears on the Advisor Dashboard under "My Practice Clients".

2. **Given** I have added a workspace to my practice client list, **When** I navigate to the client's entry in my practice client list, **Then** I can add, edit, and delete internal notes for that client. Notes are free-text and have no character limit enforced in the UI.

3. **Given** I have written a note for a practice client, **When** the client user (or any other workspace member) views their workspace, **Then** they cannot see my internal notes. Notes are personal and private to the accountant who wrote them.

4. **Given** I have added a workspace to my practice client list, **When** I click "Remove from Practice Clients" on that client, **Then** the workspace is removed from my practice client list and no longer appears under "My Practice Clients" on the Advisor Dashboard. My access to the workspace is not affected.

5. **Given** a workspace is in my practice client list, **When** my access to that workspace is revoked by the workspace owner, **Then** that workspace is automatically removed from my practice client list and no longer appears on my Advisor Dashboard.

---

### User Story 3 — Invite by Email: Invite Unregistered and Existing Users to a Workspace (Priority: P1)

A workspace owner or accountant wants to invite someone by email address to join a workspace, even if that person has not yet registered for MoneyQuest Ledger. The invited person should receive a link that gives them access to the workspace with the correct role upon acceptance.

**Why this priority**: This unblocks the handoff flow (Story 4) and is independently valuable — any workspace owner needs to be able to add colleagues or clients by email without requiring them to register first. The WorkspaceInvitation model is already built, so this story completes the user-facing flow.

**Independent Test**: Can be tested independently by inviting a new email address to a workspace, using the invite link, completing registration, and confirming the new user lands in the workspace with the correct role.

**Acceptance Scenarios**:

1. **Given** I am a workspace owner or accountant, **When** I navigate to workspace Settings > Users and click "Invite User", **Then** I see a form asking for: email address and role to assign on acceptance (dropdown of available roles: owner, accountant, bookkeeper, approver, auditor, client).

2. **Given** I submit an invite for an email address that belongs to an existing MoneyQuest Ledger user, **When** that user logs in, **Then** they see a pending invitation notification. When they accept, they are added to the workspace with the specified role.

3. **Given** I submit an invite for an email address that is not yet registered, **When** the email is sent, **Then** the recipient receives an email containing a unique invite link. When they click the link, they are guided through account registration and land directly in the workspace with the assigned role upon completion.

4. **Given** a pending invitation exists, **When** 7 days pass without the recipient accepting, **Then** the invite is marked as expired and the invite link no longer grants access.

5. **Given** a pending invitation has expired or I made an error, **When** I view the pending invitations list in workspace Settings > Users, **Then** I can resend the invitation, which generates a new 7-day invite link and sends a fresh email to the recipient.

6. **Given** I view workspace Settings > Users, **When** pending invitations exist, **Then** I see a "Pending Invitations" section listing each invite with: email address, assigned role, date sent, days remaining, and a "Resend" action.

7. **Given** a user has already been invited to a workspace and the invitation is still pending, **When** I attempt to invite the same email address again, **Then** the system informs me a pending invitation already exists for that address and offers the option to resend the existing invite instead.

---

### User Story 4 — Ownership Transfer: Formal Handoff of Workspace Ownership (Priority: P2)

An accountant who created a workspace on behalf of a client wants to transfer ownership to the client. This should be a formal process requiring the recipient to accept, with a complete audit trail and the option for the transferring user to retain a lower role or remove themselves entirely.

**Why this priority**: Depends on Story 3 (invite by email) for the case where the recipient is not yet a workspace member. This is P2 because, while critical to the accountant workflow, it requires the recipient to already be a workspace member or have accepted an invite — making Story 3 a prerequisite.

**Independent Test**: Can be tested independently (after Story 3 is complete) by having an owner initiate a transfer to an existing workspace member, having the recipient accept, and confirming the role change in workspace Settings.

**Acceptance Scenarios**:

1. **Given** I am the owner of a workspace, **When** I navigate to workspace Settings > Organisation > Ownership and click "Transfer Ownership", **Then** I see a form to select the recipient (from existing workspace members) and choose my post-transfer role (accountant, bookkeeper, or remove myself).

2. **Given** I submit an ownership transfer request, **When** the recipient logs in, **Then** they see a pending ownership transfer notification. The notification clearly states the workspace name, the current owner's name, and the role they will be granted.

3. **Given** a recipient accepts an ownership transfer, **When** the acceptance is processed, **Then** the recipient's role is changed to `owner`, the transferring user's role is changed to their selected post-transfer role (or they are removed), and an audit log entry is created recording: date, previous owner, new owner, post-transfer role of previous owner.

4. **Given** a recipient declines an ownership transfer, **When** the decline is processed, **Then** the workspace ownership remains unchanged, the transferring user retains their `owner` role, and both parties are notified of the declined transfer.

5. **Given** an ownership transfer is pending, **When** the current owner attempts to initiate a second transfer to a different recipient, **Then** the system prevents the second transfer and informs the owner a pending transfer already exists. The pending transfer must be cancelled first.

6. **Given** I am an auditor viewing the workspace audit log, **When** an ownership transfer has occurred, **Then** I can see a full record of the transfer including: date, previous owner name, new owner name, and what role the previous owner transitioned to.

---

### User Story 5 — Create Workspace on Behalf of Client with Handoff (Priority: P2)

An accountant completing the workspace setup wizard for a new client wants to immediately hand the workspace off to the client user. Rather than being auto-switched into the workspace after setup, the accountant can enter the client's email and trigger an invite that makes the client the workspace owner.

**Why this priority**: Depends on Stories 3 and 4. This story composes the invite-by-email and ownership-transfer flows into the workspace creation workflow. It is high-value for the accountant channel but requires both prerequisite flows to be solid.

**Independent Test**: Can be tested independently (after Stories 3 and 4 are in place) by running the workspace creation wizard and using the "Hand off to client" option with a new email address, then confirming the client receives an invite that grants them owner access.

**Acceptance Scenarios**:

1. **Given** I am an accountant who has just completed the workspace creation wizard, **When** the wizard reaches the confirmation step, **Then** I see two options: "Take me to the workspace" (default) and "Hand off to client".

2. **Given** I choose "Hand off to client" at the end of the workspace creation wizard, **When** I enter a client email address and confirm, **Then** an invitation is sent to that email address with the role of `owner`. I remain in the workspace with my current role (defaulting to `accountant`).

3. **Given** the client email I enter belongs to an existing MoneyQuest Ledger user, **When** the invitation is sent, **Then** the existing user receives a workspace invitation in their notification feed (as per Story 3, Scenario 2).

4. **Given** the client email I enter is not yet registered, **When** the invitation is sent, **Then** the unregistered user receives an email invite link. Upon completing registration via that link, they land in the workspace as `owner`.

5. **Given** I have handed off a workspace to a client, **When** the client accepts the invite and becomes owner, **Then** the workspace automatically appears in my practice client list (if I have enabled the Advisor Dashboard feature for my account).

---

### User Story 6 — Reclassify Posted Transactions (Priority: P2)

An accountant reviewing a client's accounts discovers that a posted journal entry line has been assigned to the wrong chart account. They want to reassign it to the correct account without deleting the original entry. The system should automatically create the reversing and correcting entries and record a full audit trail.

**Why this priority**: This is a core accountant workflow that does not depend on other stories in this epic, but it requires the core ledger engine (002-CLE) to be complete. It is P2 because it is a power-user tool rather than a day-one necessity, and it carries risk (modifying ledger records) that warrants careful design.

**Independent Test**: Can be tested independently by creating a journal entry with a line coded to the wrong account, reclassifying it, and confirming: the original entry is unchanged, a reversing entry exists, a correcting entry exists, and the correct account now shows the correct balance.

**Acceptance Scenarios**:

1. **Given** I am logged in as an `accountant` or `owner` in a workspace, **When** I view a posted journal entry, **Then** I see a "Reclassify" action on each line of the entry. Users with `bookkeeper`, `approver`, `auditor`, or `client` roles do not see this action.

2. **Given** I click "Reclassify" on a journal entry line, **When** I select a new chart account and provide a reason, **Then** the system creates two new journal entries automatically: (a) a reversing entry that negates the original line, and (b) a correcting entry that posts the amount to the newly selected account. Both entries are linked to the original and marked as "Reclassification".

3. **Given** a reclassification has been completed, **When** I view the original journal entry, **Then** I see a "Reclassified" badge on the affected line and a link to view the reclassification entries.

4. **Given** a reclassification has been completed, **When** I view the workspace audit log, **Then** I see a record containing: date and time, the accountant who performed the reclassification, the original chart account, the new chart account, the amount, and the reason provided.

5. **Given** I attempt to reclassify a journal entry line, **When** the entry was created more than 12 months ago and the relevant accounting period is locked, **Then** the system prevents the reclassification and displays a message explaining the period is closed. [NEEDS CLARIFICATION: Should accountants be able to override locked period restrictions? If so, under what conditions?]

6. **Given** a reclassification creates entries that cause a chart account balance to go negative, **When** the reclassification is submitted, **Then** the system completes the reclassification but displays a warning indicating that the source account now has a negative balance, and the reason is recorded in the audit trail.

---

### User Story 7 — Bulk Report Generation Across Client Workspaces (Priority: P3)

An accountant wants to generate standard financial reports (Profit & Loss, Balance Sheet, Trial Balance) for multiple client workspaces at once, selecting a common date range and exporting all reports in a single operation rather than generating them one workspace at a time.

**Why this priority**: This is high-value for practices with many clients at end of month or financial year, but it does not unlock any other flow and can be delivered after the core dashboard and handoff stories are shipped. It is P3 because it is a productivity enhancement rather than a blocker.

**Independent Test**: Can be tested independently by selecting two client workspaces, choosing a date range and report type, and confirming two correctly formatted reports are generated.

**Acceptance Scenarios**:

1. **Given** I am on the Advisor Dashboard, **When** I click "Bulk Reports", **Then** I see a report configuration screen where I can select: report type (Profit & Loss, Balance Sheet, or Trial Balance), date range (start and end date), and which client workspaces to include (multi-select with "Select All" shortcut).

2. **Given** I have configured a bulk report request with two or more workspaces selected, **When** I click "Generate Reports", **Then** the system generates one report per selected workspace for the chosen date range and report type.

3. **Given** bulk reports have been generated, **When** I choose "Export as PDF", **Then** a ZIP file is downloaded containing one PDF per workspace, each named with the workspace name, report type, and date range (e.g., `AcmeCo_ProfitAndLoss_2025-07-01_2025-12-31.pdf`).

4. **Given** bulk reports have been generated, **When** I choose "Export as CSV", **Then** a ZIP file is downloaded containing one CSV per workspace, following the same naming convention.

5. **Given** I select a workspace for bulk reporting that I have access to but with a role that does not have report access (e.g., `client` role), **When** I attempt to generate reports, **Then** that workspace is excluded from the results and I see a warning listing any workspaces that were skipped due to insufficient permissions.

---

### Edge Cases

- What happens when an accountant's access to a workspace is revoked while a pending ownership transfer is awaiting the recipient's acceptance? The transfer should be automatically cancelled and both parties notified.
- What happens if an invite email fails to deliver (e.g., the email address is invalid)? The system should mark the invite as "Delivery failed" and allow the sender to correct and resend.
- What happens if two accountants both mark the same workspace as a "practice client"? Each accountant's practice list is personal — no conflict. Both can independently annotate and view that workspace.
- What happens when a reclassification results in the same account being debited and credited (i.e., reclassifying to the same account)? The system should prevent this and display a validation error.
- What happens when bulk reports are requested for a workspace that has been archived or disabled? The workspace should be excluded with a warning, not cause the entire batch to fail.
- What happens to an accountant's practice client notes if the accountant's account is deleted? Notes should be deleted with the account (they are personal/private data).
- What happens when an ownership transfer recipient has their account suspended before they accept? The pending transfer should be cancelled automatically when a user account is suspended.

---

## Requirements

### Functional Requirements

**FR-001**: The system MUST display an Advisor Dashboard accessible only to users who have enabled the "Register as Advisor" setting in their profile or onboarding. The dashboard shows one card per workspace the advisor has access to. Users who have not enabled advisor mode do not see the Advisor Dashboard in navigation.

**FR-002**: Each workspace card on the Advisor Dashboard MUST display: workspace name, organisation name, count of pending journal entry approvals, count of unreconciled bank transactions, count of overdue invoices (past their due date and unpaid), and the date of the most recent ledger activity.

**FR-003**: The Advisor Dashboard MUST provide three filters that can be applied independently: "Needs Attention" (any non-zero count), "Pending Approvals" (pending approvals > 0), and "Inactive (30+ days)" (last activity older than 30 days).

**FR-004**: From the Advisor Dashboard, a user MUST be able to switch into any listed workspace with a single click, landing on that workspace's main dashboard.

**FR-005**: Users MUST be able to mark individual workspaces as "Practice Clients", creating a personal curated list within the Advisor Dashboard.

**FR-006**: Practice Client membership MUST be personal to the user who created it — it does not create or modify any permissions on the workspace itself.

**FR-007**: Users MUST be able to add, edit, and delete free-text notes on each workspace in their Practice Client list. Notes MUST be visible only to the user who wrote them.

**FR-008**: When a user's access to a workspace is revoked, that workspace MUST be automatically removed from their Practice Client list.

**FR-009**: Workspace owners and users with the `accountant` role MUST be able to invite a new user to a workspace by email address, specifying the role to be granted on acceptance. Only users with the `owner` role may assign the `owner` role to an invitee — `accountant` inviters may assign any other role.

**FR-010**: If the invited email address belongs to an existing MoneyQuest Ledger user, the invitation MUST appear as a notification within the platform for that user to accept or decline.

**FR-011**: If the invited email address is not yet registered, the system MUST send an email containing a unique invite link. The recipient MUST be able to complete registration via that link and land in the workspace with the assigned role.

**FR-012**: Invite links MUST expire 7 days after they are issued. Expired invite links MUST NOT grant workspace access.

**FR-013**: Workspace owners and accountants MUST be able to resend an invitation, which generates a new 7-day invite link and sends a fresh notification or email to the recipient.

**FR-014**: The pending invitations list in workspace Settings > Users MUST show for each pending invite: recipient email, assigned role, date sent, days remaining before expiry, and a "Resend" action.

**FR-015**: The system MUST prevent sending a duplicate invitation to the same email address for the same workspace while a pending invitation already exists.

**FR-016**: Workspace owners MUST be able to initiate an ownership transfer to any existing workspace member.

**FR-017**: Ownership transfers MUST require explicit acceptance from the recipient before taking effect. Until accepted, the current owner retains the `owner` role.

**FR-018**: When initiating an ownership transfer, the current owner MUST choose their post-transfer role from: `accountant`, `bookkeeper`, or "Remove me from this workspace".

**FR-019**: Upon acceptance of an ownership transfer, the system MUST: assign the `owner` role to the recipient, apply the post-transfer role to the previous owner (or remove them), and create an immutable audit log entry.

**FR-020**: Ownership transfer recipients MUST be able to decline a transfer. On decline, the current owner retains the `owner` role unchanged.

**FR-021**: Only one pending ownership transfer may exist per workspace at a time.

**FR-022**: At the end of the workspace creation wizard, an accountant MUST be offered a "Hand off to client" option as an alternative to entering the workspace immediately.

**FR-023**: The "Hand off to client" flow MUST accept an email address and send an ownership-level invitation to that address (existing user or new registration, per FR-010 and FR-011).

**FR-024**: After using the "Hand off to client" flow, the accountant MUST remain in the workspace with their current role (defaulting to `accountant` if they were the creator).

**FR-025**: When a client accepts a handoff invite and becomes the workspace owner, the workspace MUST be automatically added to the accountant's Practice Client list if the accountant has an active Advisor Dashboard.

**FR-026**: Users with the `accountant` or `owner` role MUST be able to initiate a reclassification on any individual line of any posted journal entry.

**FR-027**: A reclassification MUST require the user to select a new chart account and provide a mandatory reason (free text, minimum 10 characters).

**FR-028**: On submission of a reclassification, the system MUST automatically create two linked journal entries: a reversing entry negating the original line, and a correcting entry posting to the newly selected account. Both entries MUST be marked as "Reclassification" type and reference the original entry.

**FR-029**: The original journal entry line MUST display a "Reclassified" indicator after a reclassification has been applied to it, with a link to the reclassification entries.

**FR-030**: All reclassification events MUST be recorded in the workspace audit log with: timestamp, actor (name and role), original account, new account, amount, and reason.

**FR-031**: Users with the `bookkeeper`, `approver`, `auditor`, and `client` roles MUST NOT see or be able to access the reclassification action.

**FR-032**: The Bulk Reports screen MUST allow selection of report type (Profit & Loss, Balance Sheet, Trial Balance), date range, and one or more client workspaces from the user's Advisor Dashboard list.

**FR-033**: Bulk report generation MUST produce one report per selected workspace, scoped to the selected date range.

**FR-034**: Bulk reports MUST be exportable as a ZIP file containing individual PDFs or CSVs per workspace, named with workspace name, report type, and date range.

**FR-035**: Workspaces where the requesting user has insufficient permissions for report access MUST be excluded from bulk report output with a warning message — they MUST NOT cause the entire batch to fail.

### Key Entities

- **Practice Client**: A personal association between a user and a workspace, indicating that user considers that workspace a "client" in their practice. Attributes: user, workspace, created date. Does not affect permissions.
- **Practice Note**: A private note written by a user against one of their Practice Clients. Attributes: practice client, body text, created date, last updated date. Visible only to the author.
- **Workspace Invitation**: An invitation sent to an email address to join a workspace with a specified role. Attributes: workspace, invited email, assigned role, invited by user, status (pending / accepted / declined / expired), expires at, created at. Already built — this story completes the user-facing flow.
- **Ownership Transfer**: A pending request to transfer workspace ownership from one member to another. Attributes: workspace, current owner, proposed new owner, post-transfer role for current owner, status (pending / accepted / declined), initiated at, resolved at.
- **Reclassification**: A record linking a reclassification action to an original journal entry line, a reversing entry, and a correcting entry. Attributes: original entry, original account, new account, reason, actor, created at.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: An accountant managing 10 client workspaces can view the health status of all 10 on the Advisor Dashboard in under 5 seconds (measured from page load to all cards rendered).
- **SC-002**: An accountant can complete the full "create workspace and hand off to client" flow in under 10 minutes, including workspace wizard completion and handoff email trigger.
- **SC-003**: 100% of reclassification events are recorded in the audit log with the required fields. Zero reclassifications occur without a complete audit trail.
- **SC-004**: An invited user who is not yet registered can complete registration via an invite link and land in the correct workspace with the correct role in a single uninterrupted flow.
- **SC-005**: Bulk report generation for up to 20 workspaces with a 12-month date range completes (background job dispatched to ZIP available for download) in under 60 seconds. Maximum batch size is 20 workspaces.
- **SC-006**: Ownership transfers cannot take effect without recipient acceptance — zero cases of ownership changing without an explicit acceptance action.
- **SC-007**: Practice Client notes written by one user are inaccessible to any other user — zero data leakage across practice lists.

---

## Out of Scope

The following are explicitly excluded from this epic:

- **Consolidated billing across client workspaces** (accountant pays for all clients): downstream of 009-BIL, deferred.
- **Accountant marketplace or referral program**: future commercial feature.
- **Multi-entity consolidated reporting** (rolling up financials across multiple client organisations into a single combined report): future feature.
- **Practice-level user management** (managing a team of bookkeepers under an accountant practice): future feature.
- **Automated reclassification suggestions** (AI-assisted coding correction): future feature.
- **Bulk journal entry approval** across multiple client workspaces from the Advisor Dashboard: deferred.

---

## Clarifications

**CL-001 — Locked Period Override for Reclassification**
*Decision*: Hard block — no one can reclassify across a locked accounting period. The accountant must manually unlock the period via Settings > Accounting Periods, perform the reclassification, then re-lock the period. The system displays a message explaining the period is locked and links to the period settings. This keeps period enforcement consistent and the audit trail clean. The [NEEDS CLARIFICATION] marker in US6 Scenario 5 is resolved as a hard block.

**CL-002 — "Last Ledger Activity" Definition**
*Decision*: Broad definition — any record creation or mutation across key workspace domains counts as activity: journal entries, invoices/bills, bank transactions, contacts, and jobs. The "last activity" timestamp is derived from the maximum `updated_at` / `created_at` across these tables for the workspace. This prevents false negatives (e.g., a workspace active with invoicing but no JEs appearing as "inactive").

**CL-003 — Advisor Dashboard Visibility & "Register as Advisor" Setting**
*Decision*: The Advisor Dashboard requires the user to register as an Advisor — a new user-level setting ("I manage clients as an accountant or bookkeeper") that opts them into the advisor workflow. This is distinct from the two-workspace threshold in FR-001. A user who enables advisor mode sees the Advisor Dashboard in navigation regardless of workspace count. A user who doesn't enable advisor mode never sees it, even if they have access to many workspaces. The "Register as Advisor" setting is exposed during onboarding and in profile settings. FR-001 is updated to reflect this.

**CL-004 — Invite Role Constraints**
*Decision*: Only `owner` can invite another `owner`. Both `owner` and `accountant` roles can invite any other role (accountant, bookkeeper, approver, auditor, client). An `accountant` who attempts to select `owner` from the role dropdown sees it disabled with a tooltip: "Only workspace owners can assign the owner role." FR-009 is updated to reflect this constraint.

**CL-005 — Ownership Transfer Expiry & Notification**
*Decision*: Ownership transfers expire after 30 days if not acted on. The recipient is notified both in-app (notification feed) and by email at the time the transfer is initiated. A reminder email is sent 7 days before expiry. On expiry, both parties receive an in-app notification. The initiating owner's `owner` role is retained unchanged on expiry. A new FR is added to the spec.

**CL-006 — Practice Client Notes Format**
*Decision*: Plain text with a server-side maximum of 10,000 characters per note. No rich text. Simple textarea in the UI. The UI imposes no visible character counter (as per US2 Scenario 2 wording), but the API returns a validation error if the limit is exceeded. The TipTap system is not reused — practice notes are personal scratch-pad annotations, not shared workspace documents.

**CL-007 — Bulk Report Generation: Async Queue**
*Decision*: Bulk report generation is asynchronous. The user submits the request, receives confirmation that processing has started, and is notified (in-app) when the ZIP is ready to download. The download link is available on the Bulk Reports screen under a "Recent Exports" section. SC-005 is updated: the 60-second target applies to the time from job dispatch to ZIP availability, not to the user's wait time in the UI. A hard cap of 20 workspaces per batch request is enforced.

---

**Status**: Clarified — ready for `/trilogy-spec-handover` or `/speckit-tasks`
