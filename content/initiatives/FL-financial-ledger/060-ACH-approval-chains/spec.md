---
title: "Feature Specification: Configurable Approval Chains"
---

# Feature Specification: Configurable Approval Chains

**Epic**: 060-ACH
**Feature Branch**: `feature/060-ach-approval-chains`
**Created**: 2026-03-22
**Status**: Draft
**Input**: Idea brief -- configurable multi-step approval workflows with threshold routing, escalation, delegation, and full audit trails

---

## Overview

MoneyQuest currently provides single-step, binary approval for journal entries, invoices, bills, and BAS periods. Any workspace user with the `approve` permission can approve any document regardless of value, risk, or document type. There is no routing, no amount thresholds, no multi-step chains, and no escalation when approvers are unavailable.

This specification defines a configurable approval workflow engine that routes documents through one or more approval steps based on document type, amount thresholds, and custom conditions. The engine sits as a coordination layer on top of the existing aggregate-based approve/reject events -- it does not replace them, it orchestrates when and by whom they fire.

**Document types supported**: Journal Entries, Invoices, Bills, BAS Periods.

**Backward compatibility**: Workspaces without configured approval workflows continue to work exactly as today -- single-step, any-approver approval. The approval chain engine only activates when at least one workflow is defined for a document type.

**Status model**: Documents remain in their existing status during the approval chain (e.g., `PendingApproval` for journal entries, `Draft` for invoices/bills pending chain completion, `AwaitingApproval` for BAS periods). Step-level progress is tracked entirely on the `ApprovalInstance` and `ApprovalStepInstance` models, not on the document's status enum. No new document statuses are introduced.

**Invoice/Bill approval interception**: Currently, invoices and bills transition from `Draft` to `Approved` via a single "Approve" action with no intermediate submit step. When an approval workflow is configured for a document type, the UI replaces the "Approve" button with a "Submit for Approval" action. This creates an `ApprovalInstance` and begins the chain. Only the final step's completion triggers the underlying aggregate's `approve()` event. When no workflow is configured, the existing single-click "Approve" behavior is preserved unchanged.

**Feature flag**: The approval chain engine is gated behind a `configurable-approval-chains` feature flag (Laravel Pennant), disabled by default. Workspaces are enabled individually. When the flag is off, the system behaves identically to today.

---

## User Scenarios & Testing

### User Story 1 -- Workspace Admin Defines an Approval Workflow (Priority: P1)

As a workspace owner or accountant, I want to define approval workflows per document type so that documents are routed through the right number of review steps based on my organisation's internal controls.

**Why this priority**: Without workflow definitions, no other approval chain functionality can operate. This is the foundational story that unlocks all subsequent multi-step approval behavior.

**Independent Test**: Can be fully tested by navigating to Settings > Approval Workflows, creating a workflow, and verifying it is saved and displayed in the workflow list. Delivers value as the configuration surface for all downstream approval behavior.

**Acceptance Scenarios**:

1. **Given** I am an owner or accountant on a workspace with no approval workflows configured, **When** I navigate to Settings > Approval Workflows, **Then** I see an empty state explaining that all documents currently use single-step approval and offering a "Create Workflow" action.

2. **Given** I am on the Approval Workflows settings page, **When** I click "Create Workflow" and select document type "Journal Entries", name it "High Value JE Review", add two sequential steps (Step 1: "Senior Accountant" role, any-one-of; Step 2: specific user "Jane Owner", required), and save, **Then** the workflow appears in the list with its name, document type, step count, and active status.

3. **Given** a workflow "High Value JE Review" exists with a minimum threshold of $10,000, **When** I edit the workflow to change the threshold to $25,000 and save, **Then** the updated threshold is displayed and only future submissions are affected -- documents already in-flight continue under their original workflow rules.

4. **Given** I am a bookkeeper on the workspace, **When** I navigate to Settings > Approval Workflows, **Then** I cannot access the page (permission denied) because workflow management requires owner or accountant role.

5. **Given** a workflow exists for "Journal Entries" with a minimum threshold of $10,000, **When** I try to create a second workflow for "Journal Entries" with the same minimum threshold of $10,000, **Then** the system prevents creation because two workflows for the same document type cannot have the same minimum threshold.

6. **Given** I attempt to delete a workflow that has in-flight approval instances (documents currently being approved), **When** I click "Delete", **Then** the system prevents deletion and offers to deactivate the workflow instead. Deactivation prevents new documents from routing to the workflow while allowing in-flight instances to complete.

---

### User Story 2 -- Threshold-Based Workflow Routing on Submit (Priority: P1)

As a bookkeeper or accountant who submits documents for approval, I want submitted documents to be automatically routed to the correct approval workflow based on the document's type and amount so that high-value transactions get the right level of scrutiny.

**Why this priority**: Routing is the core intelligence of the approval chain engine. Without it, multi-step workflows exist but never activate. This story makes the workflow definitions operational.

**Independent Test**: Can be fully tested by creating a workflow with a threshold, submitting a document above and below that threshold, and verifying the correct workflow (or default single-step) is selected.

**Acceptance Scenarios**:

1. **Given** a workflow "Standard JE" exists for journal entries with no minimum threshold (threshold = 0) and one approval step, and a workflow "High Value JE" exists for journal entries with a minimum threshold of $10,000 and two approval steps, **When** a bookkeeper submits a journal entry totalling $5,000, **Then** the system routes it to the "Standard JE" workflow (one step) because $5,000 meets the $0 threshold but not the $10,000 threshold, and the highest matching threshold wins.

2. **Given** the same two workflows, **When** a bookkeeper submits a journal entry totalling $75,000, **Then** the system routes it to the "High Value JE" workflow (two steps) because $75,000 meets the $10,000 threshold which is higher than the $0 threshold, and the first step's designated approvers are notified.

3. **Given** no approval workflows are defined for journal entries on this workspace, **When** a bookkeeper submits a journal entry, **Then** the existing single-step approval behavior applies -- all users with the `journal-entry.approve` permission are notified and any one of them can approve.

4. **Given** a workflow is selected for a document, **When** the system creates the approval instance, **Then** the instance records which workflow and which version of the workflow was used, so that later edits to the workflow do not retroactively change in-flight approvals.

5. **Given** an invoice for $50,000 and a workflow "High Value Invoice" with a minimum threshold of $25,000, **When** the user clicks "Submit for Approval" on the invoice, **Then** the invoice's ApprovalInstance is created, the workflow's first step approvers are notified, and the invoice remains in Draft status until the chain completes.

6. **Given** a document was rejected, returned to Draft, the user amends the amount from $5,000 to $50,000, and re-submits, **When** the system routes the re-submission, **Then** a brand-new ApprovalInstance is created, the workflow is re-evaluated against the new amount (potentially routing to a different workflow), and the chain starts from Step 1. The old rejected instance is preserved in the audit trail.

---

### User Story 3 -- Sequential Multi-Step Approval (Priority: P1)

As an approver assigned to a step in an approval workflow, I want to see only documents that are awaiting my specific step so that I can review and approve or reject them with clarity about what level of review has already occurred.

**Why this priority**: Multi-step sequential approval is the primary value proposition of approval chains. Users need to act on their assigned step, see prior approvals in the chain, and advance or reject the document.

**Independent Test**: Can be fully tested by configuring a two-step workflow, submitting a document, approving step 1, verifying step 2 activates, and approving step 2 to see the document reach its final approved/posted state.

**Acceptance Scenarios**:

1. **Given** a two-step workflow where Step 1 is assigned to "Senior Accountant" role and Step 2 is assigned to user "Jane Owner", **When** a journal entry is routed to this workflow, **Then** only users with the "Senior Accountant" role (who also have `journal-entry.approve` permission) see it in their pending approvals.

2. **Given** Step 1 has been approved by a senior accountant, **When** the step is completed, **Then** Step 2 activates, Jane Owner receives a notification, and the document appears in Jane's pending approval queue with a visible indicator showing "Step 2 of 2 -- prior approval by [Name] on [Date]".

3. **Given** Step 2 is active and Jane Owner clicks "Approve", **When** the final step is completed, **Then** the document transitions to its terminal approved state (Posted for journal entries, Approved for invoices/bills, Approved for BAS periods) and the underlying aggregate's approve event fires with the final approver's identity.

4. **Given** Step 1 is active, **When** an approver at Step 1 clicks "Reject" with a reason, **Then** the entire workflow instance is rejected, the document returns to Draft, and the original submitter is notified with the rejection reason and which step rejected it.

5. **Given** a three-step workflow with Steps 1, 2, and 3, **When** Step 2 rejects, **Then** the document returns to Draft (not to Step 1), the workflow instance is marked as rejected, and the audit trail shows Steps 1 approved and Step 2 rejected.

6. **Given** a document is mid-workflow at Step 2, **When** I view the document detail page, **Then** I see an "Approval Progress" section showing all steps, which are complete (with approver name and timestamp), which is current, and which are pending.

---

### User Story 4 -- Approval Audit Trail (Priority: P1)

As an auditor or workspace owner, I want a complete audit trail of every approval step -- who approved, when, with what comments, and which workflow governed the process -- so that I can prove internal controls were followed.

**Why this priority**: Audit readiness is a primary business driver. Without a step-level audit trail, multi-step approval adds process but cannot prove compliance.

**Independent Test**: Can be fully tested by completing a multi-step approval, then viewing the document's audit history and verifying every step is logged with approver, timestamp, action, and optional comment.

**Acceptance Scenarios**:

1. **Given** a journal entry has completed a two-step approval workflow, **When** an auditor views the journal entry's audit history, **Then** they see entries for: (a) submission with submitter name and timestamp, (b) Step 1 approval with approver name, timestamp, step label, and any comment, (c) Step 2 approval with approver name, timestamp, step label, and any comment, (d) final posting timestamp.

2. **Given** a document was rejected at Step 2, **When** I view its audit trail, **Then** I see the Step 1 approval entry followed by the Step 2 rejection entry including the rejection reason, the rejector's name, and the step label.

3. **Given** approval events are stored, **When** I query the audit trail for a document, **Then** each entry includes the workflow name, workflow version, step number, step label, action (approved/rejected), actor, timestamp, and optional comment.

4. **Given** an approver adds a comment during approval ("Verified supporting documentation attached"), **When** the audit trail is displayed, **Then** the comment appears alongside the step approval entry.

---

### User Story 5 -- Step-Level Targeted Notifications (Priority: P1)

As a workspace member who has approval authority, I want to receive notifications only when a document reaches the specific step I am responsible for -- not for every document submitted across the workspace -- so that I am not overwhelmed by irrelevant approval requests.

**Why this priority**: Targeted notifications reduce noise by 40-60% for multi-person teams and are essential for multi-step workflows to be usable in practice. Without them, all approvers are notified for all submissions regardless of step assignment.

**Independent Test**: Can be fully tested by configuring a two-step workflow with different approvers at each step, submitting a document, and verifying that only Step 1's approvers receive the initial notification and Step 2's approvers receive their notification only when Step 1 is complete.

**Acceptance Scenarios**:

1. **Given** a two-step workflow where Step 1 approvers are [Alice, Bob] and Step 2 approver is [Carol], **When** a document is submitted and enters Step 1, **Then** Alice and Bob each receive an in-app notification; Carol does not.

2. **Given** Alice approves Step 1, **When** Step 2 activates, **Then** Carol receives an in-app notification that includes the document reference, the step she needs to action, and the prior approver's name.

3. **Given** no approval workflow is configured for a document type, **When** a document is submitted, **Then** the existing notification behavior fires (all workspace users with the `approve` permission for that document type are notified) -- no regression.

4. **Given** a document is rejected at Step 1, **When** the rejection occurs, **Then** the original submitter receives a notification with the rejection reason and step information; Step 2 approvers are not notified at all (the step never activated).

---

### User Story 6 -- Parallel Approval Mode ("Any Of" vs "All Of") (Priority: P2)

As a workspace admin defining a workflow step, I want to choose whether a step requires approval from any one of the assigned approvers or from all of them so that I can model both quick single-sign-off and consensus-based review stages.

**Why this priority**: Phase 2 enhancement. The P1 stories deliver sequential steps with "any one of" as the default. Parallel "all of" mode adds flexibility for firms that need consensus at certain steps (e.g., both partners must sign off on entries above $100,000).

**Independent Test**: Can be fully tested by creating a step with "all of" mode, assigning three approvers, having two approve and verifying the step does not complete until the third also approves.

**Acceptance Scenarios**:

1. **Given** a workflow step configured as "any one of" with approvers [Alice, Bob, Carol], **When** Bob approves, **Then** the step is complete and the workflow advances to the next step (or completes) regardless of Alice and Carol's actions.

2. **Given** a workflow step configured as "all of" with approvers [Alice, Bob], **When** Alice approves but Bob has not yet acted, **Then** the step remains active, Bob still sees it in his pending queue, and the approval progress shows "1 of 2 approvals received".

3. **Given** an "all of" step where Alice has approved, **When** Bob rejects, **Then** the entire workflow instance is rejected, Alice's prior approval on this step is recorded in the audit trail but does not prevent the rejection.

4. **Given** an "all of" step with 3 approvers, **When** all 3 approve, **Then** the step completes and the workflow advances. The audit trail shows all three individual approval actions.

---

### User Story 7 -- Escalation Timeouts (Priority: P2)

As a workspace admin, I want to configure an escalation timeout on a workflow step so that if no approver acts within the specified window, the approval request is automatically escalated to the next level or a designated fallback approver.

**Why this priority**: Phase 2 enhancement. Prevents documents from sitting in limbo when approvers are unavailable. Depends on the sequential approval infrastructure from P1.

**Independent Test**: Can be fully tested by creating a step with a 24-hour escalation timeout, advancing the clock past the timeout, and verifying the escalation fires to the designated fallback.

**Acceptance Scenarios**:

1. **Given** a workflow step with a 48-hour escalation timeout and a fallback approver "Jane Owner", **When** 48 hours pass with no action from the step's assigned approvers, **Then** Jane Owner receives a notification that the step has been escalated to her and she appears as an eligible approver for that step.

2. **Given** an escalation has occurred, **When** Jane approves the escalated step, **Then** the audit trail records the escalation event (original approvers, timeout duration, escalation target) and the approval by Jane.

3. **Given** a step has been escalated, **When** one of the original approvers later attempts to approve it, **Then** they can still approve (escalation adds approvers, it does not remove the originals).

4. **Given** a step has no escalation timeout configured, **When** the step sits unapproved for any length of time, **Then** no automatic action occurs -- the document remains at that step until someone acts or manually intervenes.

---

### User Story 8 -- Delegation of Approval Authority (Priority: P2)

As an approver who will be unavailable (on leave, in meetings), I want to delegate my approval authority to a colleague for a specified date range so that documents assigned to my steps are not blocked.

**Why this priority**: Phase 2 enhancement. Delegation works alongside escalation to prevent bottlenecks. It is user-initiated rather than system-automated.

**Independent Test**: Can be fully tested by creating a delegation, submitting a document to the delegator's step, and verifying the delegate can approve it.

**Acceptance Scenarios**:

1. **Given** Alice is an approver on Step 1, **When** Alice creates a delegation to Bob for 2026-04-01 to 2026-04-14, **Then** the delegation appears in Alice's active delegations list and Bob is notified that he has been granted delegated approval authority.

2. **Given** an active delegation from Alice to Bob exists, **When** a document reaches a step where Alice is an assigned approver, **Then** both Alice and Bob can approve or reject the step. The audit trail records whether the action was by the original approver or a delegate.

3. **Given** a delegation from Alice to Bob exists with an end date of 2026-04-14, **When** 2026-04-15 arrives, **Then** the delegation automatically expires and Bob no longer appears as an eligible approver for Alice's steps.

4. **Given** Alice has delegated to Bob, **When** Bob attempts to further delegate Alice's authority to Carol (chain delegation), **Then** the system prevents it -- delegation is single-level only, no chaining.

5. **Given** Alice is an approver on a step with "all of" mode, **When** Alice has delegated to Bob and Bob approves on Alice's behalf, **Then** that counts as Alice's approval for the purposes of the "all of" requirement.

---

### User Story 9 -- Extend Approval Chains to Invoices and Bills (Priority: P2)

As a workspace admin, I want to define approval workflows for invoices and bills (not just journal entries) so that all financial document types benefit from multi-step approval routing.

**Why this priority**: Phase 2 extends the P1 journal entry implementation to invoices and bills. The workflow engine is document-type-agnostic by design, but the integration points with each aggregate differ.

**Independent Test**: Can be fully tested by creating an approval workflow for invoices, submitting an invoice for approval, and verifying it routes through the workflow steps before transitioning to the Approved status.

**Acceptance Scenarios**:

1. **Given** a workflow "High Value Invoice" exists for invoices with a minimum threshold of $25,000, **When** a user clicks "Submit for Approval" on a $50,000 invoice, **Then** an ApprovalInstance is created, the invoice remains in Draft status, and the workflow's first step approvers are notified.

2. **Given** a bill completes all approval workflow steps, **When** the final step is approved, **Then** the bill's aggregate `approve` event fires and the bill transitions to Approved status.

3. **Given** no workflow is defined for bills on this workspace, **When** a user clicks "Approve" on a bill, **Then** the existing single-step approval behavior applies unchanged -- the bill transitions directly from Draft to Approved.

4. **Given** a workflow is configured for invoices, **When** a user views a Draft invoice, **Then** the action button shows "Submit for Approval" instead of "Approve". When no workflow is configured, the button shows "Approve" as it does today.

---

### User Story 10 -- Extend Approval Chains to BAS Periods (Priority: P2)

As a workspace admin, I want BAS period submissions to follow an approval workflow so that tax compliance documents get the same controlled review process as financial documents.

**Why this priority**: BAS periods already have an AwaitingApproval state. Integrating with approval chains adds step-level routing and audit trails to the BAS compliance workflow.

**Independent Test**: Can be fully tested by creating a workflow for BAS periods, submitting a BAS period for approval, and verifying it flows through the configured steps before reaching Approved status.

**Acceptance Scenarios**:

1. **Given** a workflow "BAS Review" exists for BAS periods with two steps (accountant review, then owner sign-off), **When** a BAS period is submitted for approval, **Then** it enters the workflow and Step 1 approvers are notified.

2. **Given** the BAS period completes all workflow steps, **When** the final step is approved, **Then** the BAS period transitions from AwaitingApproval to Approved and the audit trail records every step.

---

### User Story 11 -- Practice-Level Workflow Templates (Priority: P3)

As a practice manager overseeing multiple client workspaces, I want to define standard approval workflow templates at the practice level and push them to client workspaces so that I can enforce consistent internal controls across all clients without configuring each workspace individually.

**Why this priority**: Phase 3 capability. Depends on the full approval workflow engine (P1+P2) and the practice management infrastructure. Delivers significant scale value for accounting firms managing many clients.

**Independent Test**: Can be fully tested by creating a practice template, pushing it to a client workspace, and verifying the workflow is created on the client workspace with the template's configuration.

**Acceptance Scenarios**:

1. **Given** a practice has a template "Standard 2-Step Approval" with configured steps and thresholds, **When** the practice manager pushes this template to a connected client workspace, **Then** the workspace receives the workflow with all steps and thresholds pre-configured.

2. **Given** a template has been pushed to a workspace, **When** the workspace admin views Approval Workflows, **Then** they see the workflow with a "Practice Template" badge and can choose to customise it or keep it as-is.

3. **Given** a practice updates a template, **When** the update is pushed, **Then** only workspaces that have not customised their copy of the template receive the update. Customised copies are left unchanged.

---

### Edge Cases

- **What happens when a workflow is edited while documents are in-flight?** In-flight approval instances continue under the original workflow version. New submissions use the updated workflow. The system snapshots the workflow configuration when the approval instance is created.

- **What happens when an assigned approver is deactivated or removed from the workspace?** The deactivated or removed user is skipped for "any one of" steps (remaining approvers can still act). For "all of" steps, the step becomes uncompletable -- the workspace admin is notified and must reassign the step or remove the user from the workflow. Delegations from the deactivated user are automatically expired.

- **What happens if the only approver on a step is also the document's submitter?** The system enforces separation of duties -- a user cannot approve a step on a document they submitted (the "submitter" is the user who initiated the approval process, recorded on the ApprovalInstance), even if they are an assigned approver. If they are the only approver, the step escalates (if configured) or an admin is notified.

- **What happens with concurrent approvals on an "all of" step?** Each approval is recorded independently. The step completes when the required count is met. If a rejection arrives after some approvals, the rejection takes precedence and the step (and workflow) is rejected.

- **What happens when delegation conflicts with "all of" mode?** If Alice delegates to Bob, and both Alice and Bob are assigned to the same "all of" step, Bob's approval counts as Bob's own approval AND as Alice's delegated approval. The step needs confirmations from each distinct assigned approver (or their delegate), not from each distinct human.

- **What if two workflows for the same document type have the same minimum threshold?** The system prevents this during creation/edit. Each document type within a workspace must have unique minimum threshold values across its active workflows. Validation rejects duplicate thresholds.

- **What about documents with zero amount?** Workflows with no minimum threshold (threshold = 0 or null) match all documents of that type, including zero-amount entries. Documents without a monetary amount (e.g., memo-only journal entries) are matched against workflows with no threshold or a threshold of zero.

- **Can a workflow have zero steps?** No. Every workflow must have at least one step. A workflow with one step is equivalent to the current single-step approval but with explicit approver assignment rather than "anyone with the permission".

- **What happens when a rejected document is re-submitted?** A brand-new ApprovalInstance is created. The workflow is re-evaluated against the current document amount (which may have changed during editing), potentially routing to a different workflow. The chain starts from Step 1. The old rejected instance is preserved in the audit trail for a complete audit history.

- **What happens when a user's role changes while a document is in-flight?** Role-based approver membership is resolved at step activation time, not at workflow creation or document submission time. If a user is removed from the "accountant" role between Step 1 and Step 2 activation, and Step 2 is assigned to the "accountant" role, that user will not be eligible for Step 2.

- **Can the same user approve multiple steps in a chain?** Yes, as long as they are not the document's submitter. The separation-of-duties rule (FR-021) only bars the submitter from approving -- it does not prevent one approver from acting on multiple steps. This supports small teams where one person wears multiple hats.

- **Can a workflow be deleted while it has in-flight instances?** No. A workflow with pending (in-flight) approval instances cannot be deleted. It can be deactivated, which prevents new documents from routing to it while allowing in-flight instances to complete. Deletion is only permitted when there are zero pending instances.

- **What about multi-currency documents?** For P1, threshold matching uses the document's `total` field in its native currency without exchange-rate conversion. Thresholds should be set assuming the workspace's base currency. Multi-currency threshold conversion (converting foreign-currency documents to base currency using the day's exchange rate before matching) is a P2 enhancement.

---

## Requirements

### Functional Requirements

**Workflow Definition**

- **FR-001**: The system MUST allow workspace owners and accountants to create, edit, deactivate, and delete approval workflows scoped to a workspace. Deletion is only permitted when the workflow has zero pending approval instances.

- **FR-002**: Each workflow MUST be associated with exactly one document type: Journal Entry, Invoice, Bill, or BAS Period.

- **FR-003**: Each workflow MUST have a name (unique per workspace + document type), an active/inactive toggle, and an optional description.

- **FR-004**: Each workflow MUST define a minimum threshold amount (integer, in cents). Routing uses "highest matching minimum threshold wins" semantics: a document is routed to the active workflow with the highest `min_threshold` value that the document's amount meets or exceeds. Two workflows for the same document type within a workspace MUST NOT have the same minimum threshold value.

- **FR-005**: Each workflow MUST contain at least one and at most ten sequential approval steps.

**Step Configuration**

- **FR-006**: Each approval step MUST specify its approvers, which can be assigned by specific users, by workspace role, or a combination of both. Role membership is resolved at step activation time (not at workflow creation or submission time).

- **FR-007**: Each step MUST specify an approval mode: "any one of" (default -- one approval completes the step) or "all of" (every assigned approver must approve to complete the step).

- **FR-008**: Each step MUST have a human-readable label (e.g., "Manager Review", "Partner Sign-Off") that appears in the approval progress display and audit trail.

- **FR-009**: Each step MAY specify an escalation timeout (integer, 1 to 720 hours). When the timeout elapses with no action, the step's eligible approvers are expanded to include the designated escalation target (a specific user or role). A value of 0 or null means no escalation is configured.

- **FR-010**: The system MUST allow step reordering within a workflow through a drag-and-drop or up/down interface.

**Routing**

- **FR-011**: When a document is submitted for approval, the system MUST evaluate all active workflows for that document type on the workspace, select the workflow with the highest `min_threshold` value that the document's amount meets or exceeds, and create an approval instance linked to that workflow.

- **FR-012**: If no workflow is defined (or no active workflow matches) for the document type, the system MUST fall back to the existing single-step approval behavior with no changes.

- **FR-013**: The system MUST snapshot the workflow configuration at the time the approval instance is created. The snapshot includes: workflow name, workflow version number, each step's configuration (order, label, mode, assigned user IDs, assigned role names, escalation timeout, escalation target). Subsequent edits to the workflow MUST NOT affect in-flight approvals.

- **FR-014**: For journal entries, the "amount" used for threshold matching MUST be the total debit amount of the entry (sum of all debit line amounts in cents).

- **FR-015**: For invoices and bills, the "amount" used for threshold matching MUST be the document's `total` field in cents. For P1, this uses the native currency amount without exchange-rate conversion. Multi-currency conversion for threshold matching is a P2 enhancement.

- **FR-016**: For BAS periods, threshold matching is not amount-based. Only one workflow can be active per workspace for BAS periods (since there is no threshold to differentiate multiple workflows). The active BAS workflow matches all BAS periods submitted for approval.

**Approval Execution**

- **FR-017**: When a step becomes active, the system MUST send targeted notifications only to the approvers assigned to that step (plus any active delegates for those approvers). New notification types: `ApprovalStepPending` (step activated), `ApprovalStepEscalated` (escalation fired), `ApprovalDelegationGranted` (delegation created), `ApprovalChainCompleted` (full chain approved), `ApprovalChainRejected` (chain rejected at step N). Existing `JeSubmitted`/`JeApproved`/`JeRejected` notifications continue to fire for non-workflow-governed documents.

- **FR-018**: An approver MUST be able to approve a step with an optional comment.

- **FR-019**: An approver MUST be able to reject a step with a mandatory reason. Rejection at any step rejects the entire workflow instance and returns the document to Draft status.

- **FR-020**: When the final step of a workflow is approved, the system MUST trigger the underlying aggregate's approve event to complete the document's state transition. The aggregate's `approve()` method is called only on final step completion, never on intermediate steps.

- **FR-021**: The system MUST enforce separation of duties: the user who initiated the approval process (the "submitter", recorded as `submitted_by` on the ApprovalInstance) CANNOT approve any step in that document's approval workflow, even if they are an assigned approver for that step. For journal entries, the submitter is the user who called "Submit for Approval". For invoices/bills, the submitter is the user who clicked "Submit for Approval". This does not prevent the same non-submitter user from approving multiple steps in the same chain.

- **FR-022**: In "all of" mode, each assigned approver (or their active delegate) MUST individually approve for the step to complete. Any single rejection rejects the entire workflow.

- **FR-023**: The system MUST support approving or rejecting from the document detail page, from the notification itself, and from a dedicated "My Approvals" queue view.

**Delegation**

- **FR-024**: An approver MUST be able to delegate their approval authority to another workspace user for a specified date range (start date, end date).

- **FR-025**: Delegation MUST be single-level only -- a delegate cannot further delegate authority they received.

- **FR-026**: When a delegation is active, the delegate appears as an eligible approver for all steps where the delegator is assigned. The audit trail MUST record the action as "approved by [Delegate] on behalf of [Delegator]".

- **FR-027**: Delegations MUST expire automatically at the end of their configured date range.

**Escalation**

- **FR-028**: When a step's escalation timeout elapses, the system MUST add the escalation target (user or role) to the step's eligible approvers and send them a notification marked as "Escalated".

- **FR-029**: Escalation MUST NOT remove the original approvers -- they can still act after escalation.

- **FR-030**: The audit trail MUST record escalation events including the original timeout, escalation time, and the escalation target.

**Audit Trail**

- **FR-031**: Every action on an approval instance (step activated, approved, rejected, escalated, delegated) MUST be recorded as an immutable audit event with: workflow name, workflow version, step number, step label, action type, actor, timestamp, and optional comment.

- **FR-032**: The document detail page MUST display the full approval history as a chronological timeline showing each step's status, actor, timestamp, and comments.

- **FR-033**: Approval events MUST be stored as domain events on the existing event sourcing infrastructure, enabling replay and reconstruction of approval state.

**Permissions**

- **FR-034**: Workflow management (create, edit, deactivate, delete workflows) MUST require the `approval-workflow.manage` permission, granted to owners and accountants by default.

- **FR-035**: The existing `journal-entry.approve`, `invoice.approve`, `bill.approve`, and `bas.approve` permissions MUST remain the gate for who can be assigned as an approver. The approval chain layer adds routing on top -- it does not replace the permission model.

- **FR-036**: A new `approval-workflow.view` permission MUST allow auditors and read-only roles to see approval workflow configurations and audit trails without being able to modify them.

**User Interface**

- **FR-037**: The Settings area MUST include an "Approval Workflows" page accessible to users with the `approval-workflow.manage` permission. Workflows MUST be displayed grouped by document type and sorted by minimum threshold ascending, with visual indicators showing the effective threshold range each workflow covers.

- **FR-038**: The workflow builder MUST provide a visual step-by-step editor where admins can add, remove, reorder, and configure each step.

- **FR-039**: Document detail pages (journal entry, invoice, bill, BAS period) MUST display an "Approval Progress" panel when the document is governed by a workflow, showing all steps, their status, and the current step highlighted.

- **FR-040**: A "My Approvals" page MUST aggregate all documents awaiting the current user's approval across all document types, showing the document reference, amount, workflow step, time waiting, and a direct link to approve or view. Default sort order: oldest first (longest waiting time at top).

- **FR-041**: The existing `ApprovalActions` component MUST be extended to show context-aware buttons: "Approve Step" and "Reject" when the current user is an eligible approver for the active step, or a read-only progress indicator otherwise. For invoices/bills with a configured workflow, the "Approve" button MUST be relabelled to "Submit for Approval" when the document is in Draft status.

### Key Entities

- **ApprovalWorkflow**: A named approval policy for a specific document type within a workspace. Contains: name, document type, description, minimum threshold (integer, cents), active flag, ordered list of steps, and a version number incremented on each edit.

- **ApprovalStep**: A single step within a workflow definition. Contains: step order, label, approval mode ("any_one_of" or "all_of"), assigned approvers (users and/or roles), escalation timeout (optional, 1-720 hours), and escalation target (optional, user or role).

- **ApprovalInstance**: A runtime record created when a document is submitted and matched to a workflow. Contains: reference to the document (polymorphic via morph map), submitted_by (the user who initiated the approval process -- used for separation-of-duties enforcement), snapshot of the workflow configuration at creation time (JSON: workflow name, version, each step's order/label/mode/approver IDs/role names/escalation config), current step index, overall status (pending, approved, rejected), created_at, completed_at.

- **ApprovalStepInstance**: A runtime record for each step within an active approval instance. Contains: step order, label, status (pending, active, approved, rejected, escalated), approver actions (who approved/rejected, when, with what comment, whether acting as delegate), escalation events, activation and completion timestamps.

- **ApprovalDelegation**: A record of delegated approval authority. Contains: delegator user, delegate user, workspace_id, start date, end date, active flag, created_at.

---

## Non-Functional Requirements

- **NFR-001**: Workflow routing evaluation on document submission MUST complete within 50ms. Threshold checks are simple integer comparisons against a small number of cached workflow definitions per workspace.

- **NFR-002**: Approval actions (approve/reject a step) MUST complete within the same latency envelope as the current single-step approval (<200ms).

- **NFR-003**: The "My Approvals" queue MUST load within 1 second for workspaces with up to 500 pending approval items.

- **NFR-004**: Approval audit events MUST be stored immutably. Once written, they cannot be modified or deleted -- only new events can be appended.

- **NFR-005**: The escalation timeout scheduler MUST process pending escalations within 5 minutes of their configured timeout (scheduled job running at minimum every 5 minutes).

- **NFR-006**: The system MUST support up to 50 active approval workflows per workspace without performance degradation.

- **NFR-007**: All approval-related data (workflows, instances, delegations) MUST be scoped to `workspace_id` and MUST pass tenant isolation tests.

- **NFR-008**: The approval chain engine MUST be gated behind a `configurable-approval-chains` feature flag (Laravel Pennant), disabled by default. Workspaces can be enabled individually. When the flag is off, the system behaves identically to today.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Workspaces with 3+ users that configure at least one approval workflow report a 40% or greater reduction in approval-related notification volume within 30 days of adoption.

- **SC-002**: Users can define a new two-step approval workflow in under 3 minutes using the settings UI.

- **SC-003**: 100% of approval actions on workflow-governed documents produce a complete audit trail entry with workflow name, step label, actor, timestamp, and optional comment.

- **SC-004**: Zero regression in approval behavior for workspaces that have not configured any approval workflows -- existing single-step flow works identically.

- **SC-005**: Escalation timeouts fire within 5 minutes of the configured deadline for 99% of escalation events.

- **SC-006**: The "My Approvals" queue becomes the primary approval interface, with 80%+ of approval actions initiated from the queue (vs navigating to individual documents) within 60 days of launch.

---

## Out of Scope

- **Conditional branching** -- workflows are strictly sequential. No "if amount > X, skip to Step 3" logic. All steps execute in order.
- **External approvers** -- only workspace members can be approvers. No email-based or guest approval.
- **Approval via email** -- approvals must be performed in the MoneyQuest UI. Email notifications link to the app but do not contain action buttons.
- **Retroactive workflow application** -- workflows only apply to newly submitted documents. Documents already in PendingApproval state when a workflow is created continue under the old single-step process.
- **Workflow analytics dashboard** -- average approval times, bottleneck analysis, SLA tracking. This can be a future enhancement.
- **Mobile-specific approval UX** -- the responsive web UI supports mobile browsers, but there is no dedicated mobile approval flow or push notifications.
- **Multi-currency threshold conversion** (P1) -- threshold matching uses the document's native-currency total. Exchange-rate-adjusted threshold matching for foreign-currency documents is a P2 enhancement.

---

## Dependencies

| Dependency | Epic | Integration Point |
|---|---|---|
| Core Ledger Engine | 002-CLE | JournalEntryAggregate submit/approve/reject events, JournalEntryStatus enum |
| Invoicing | 005-IAR | InvoiceAggregate approve event, InvoiceStatus enum |
| BAS Compliance | 044-TAX | BasPeriod approval flow, BasPeriodStatus enum |
| Notifications | 024-NTF | NotificationType enum, CreateNotification action, existing listeners |
| Roles & Permissions | 039-RPA | 6 roles, 44+ permissions, RolesAndPermissionsSeeder |
| Practice Management | 027-PMV | Practice-workspace connections (P3 only -- templates) |

---

## Clarifications

### Session 2026-03-22

- Q: Should the document status change during a multi-step chain, or should step progress be tracked separately? -> A: Reuse existing document statuses (`PendingApproval` for JEs, `Draft` for invoices/bills awaiting chain, `AwaitingApproval` for BAS). Step progress tracked on ApprovalInstance/ApprovalStepInstance. No new status enum values.
- Q: How do invoices/bills enter an approval chain when they have no "submit for approval" step? -> A: The UI shows "Submit for Approval" instead of "Approve" when a workflow is configured. This creates the ApprovalInstance. Only the final step triggers the aggregate's `approve()`.
- Q: How should threshold matching work for multi-currency documents? -> A: P1 uses the document's `total` in native currency without conversion. Multi-currency conversion is a P2 enhancement.
- Q: How is the "submitter" tracked for separation-of-duties enforcement on invoices/bills? -> A: The ApprovalInstance records `submitted_by` (the user who initiated the approval process). This is the user barred from approving any step.
- Q: What triggers the approval chain for invoices/bills? -> A: A "Submit for Approval" button replaces the "Approve" button when a workflow is configured. Clicking it creates the ApprovalInstance.
- Q: What exactly is stored in the workflow snapshot? -> A: JSON snapshot of workflow name, version, and each step's order/label/mode/approver user IDs/role names/escalation config.
- Q: Can a workflow be deleted while it has in-flight instances? -> A: No. Must deactivate instead. Deletion only when zero pending instances.
- Q: How does threshold routing work -- ranges or minimum-threshold matching? -> A: "Highest matching minimum threshold wins". No explicit upper bounds. Duplicate min_threshold values for the same doc type are prevented by validation.
- Q: What happens when a rejected document is re-submitted? -> A: New ApprovalInstance created, workflow re-evaluated against current amount, chain starts from Step 1. Old rejected instance preserved.
- Q: How should the "My Approvals" queue be sorted? -> A: Oldest first (longest waiting time at top) by default.
- Q: What happens when a user's role changes while a document is in-flight? -> A: Role membership resolved at step activation time, not at workflow creation or submission time.
- Q: Can the same user approve multiple steps? -> A: Yes, as long as they are not the submitter. Separation-of-duties only bars the submitter.
- Q: What new notification types are needed? -> A: ApprovalStepPending, ApprovalStepEscalated, ApprovalDelegationGranted, ApprovalChainCompleted, ApprovalChainRejected. Existing JE notifications remain for non-workflow documents.
- Q: How should the feature be rolled out? -> A: Feature flag `configurable-approval-chains` via Laravel Pennant, disabled by default, enabled per workspace.
- Q: What about user removal (not just deactivation) from workspace? -> A: Same behavior as deactivation -- skipped for "any one of" steps, blocks "all of" steps.
- Q: Is there a cap on escalation timeout? -> A: 1 to 720 hours (30 days). 0 or null means no escalation.
- Q: Can multiple BAS workflows be active simultaneously? -> A: No. Since BAS has no threshold routing, only one workflow can be active per workspace for BAS periods.
- Q: Are approval events stored via event sourcing or a separate table? -> A: Event sourcing (ApprovalInstanceAggregate), consistent with existing aggregate patterns. Projectors build read models.
- Q: How should the settings page display workflows? -> A: Grouped by document type, sorted by minimum threshold ascending, with visual indicators of effective threshold ranges.
- Q: What about multi-currency threshold conversion? -> A: Deferred to P2. Added to Out of Scope for P1.
