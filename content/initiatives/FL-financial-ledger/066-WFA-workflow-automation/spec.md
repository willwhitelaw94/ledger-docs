---
title: "Feature Specification: Workflow Automation & Trigger Rules"
---

# Feature Specification: Workflow Automation & Trigger Rules

**Feature Branch**: `066-workflow-automation`
**Created**: 2026-03-22
**Status**: Draft
**Epic**: 066-WFA

---

## Overview

MoneyQuest currently has 13 hardcoded notification listeners that fire fixed notifications to fixed recipients when domain events occur. Users cannot create, modify, disable, or extend any automation without developer intervention. Email notification preferences are limited to 5 coarse categories.

This epic replaces that pattern with a configurable, per-workspace automation engine: **"When [trigger] happens, if [conditions] match, then [do actions]."** Each workspace gets system default rules (migrated from the existing hardcoded listeners) that can be customised, disabled, or extended. Users can also create entirely new rules from scratch or from pre-built templates.

**Scope boundary**: This spec covers the rule engine, rule builder UI, system default migration, template rules, and execution logging. It does NOT cover:
- AI-generated rule suggestions or natural language rule creation -- those belong to a future AI Bookkeeper (020-AIB) integration
- OR logic or nested condition groups (AND/OR) -- deferred to a future iteration; AND-only covers the vast majority of practical rules
- "Start approval chain" action type -- deferred until 060-ACH (Approval Chains) ships; the action type registry is extensible so new types can be added without schema changes

---

## User Scenarios & Testing

### User Story 1 -- View and manage automation rules (Priority: P1)

As a workspace owner or accountant, I want to see all active and inactive automation rules for my workspace so that I can understand what automations are running, which ones are system defaults, and quickly enable or disable them.

**Why this priority**: Without a central rule list, users cannot discover, audit, or control their workspace automations. This is the foundational view that all other stories build on.

**Independent Test**: Can be fully tested by navigating to Settings > Automations and verifying the rule list renders with correct status, type labels, and toggle controls.

**Acceptance Scenarios**:

1. **Given** I am an owner or accountant in a workspace that has system default rules, **When** I navigate to Settings > Automations, **Then** I see a list of all workspace rules showing: rule name, trigger type label, enabled/disabled status, rule type badge (System / Custom), and last execution timestamp.

2. **Given** I am viewing the automation rules list, **When** I toggle a system default rule from enabled to disabled, **Then** the rule stops executing on future trigger events, the toggle reflects the disabled state, and an entry is added to the execution log recording the disable action.

3. **Given** I am viewing the automation rules list, **When** I toggle a disabled rule back to enabled, **Then** the rule resumes executing on future trigger events.

4. **Given** I am a bookkeeper or client role user, **When** I navigate to Settings, **Then** I do not see the Automations section because I lack the `workspace.settings` permission.

5. **Given** I am viewing the automation rules list with 20+ rules, **When** I use the search box, **Then** rules are filtered by name or trigger type as I type.

6. **Given** I am viewing the automation rules list, **When** I click a rule row, **Then** I see the rule detail view showing the full trigger, conditions, and actions configuration.

---

### User Story 2 -- Create a custom automation rule (Priority: P1)

As a workspace owner or accountant, I want to create a new automation rule by choosing a trigger event, adding optional conditions, and selecting one or more actions, so that I can automate repetitive workflows without developer involvement.

**Why this priority**: The core value proposition of the epic -- self-service automation creation. Without this, the system only provides editable defaults, which is an incremental improvement rather than a transformational one.

**Independent Test**: Can be fully tested by creating a new rule end-to-end in the rule builder and verifying the rule appears in the list with correct configuration.

**Acceptance Scenarios**:

1. **Given** I am on the Automations settings page, **When** I click "New Rule", **Then** I see a rule builder form with three sections: Trigger (required), Conditions (optional), and Actions (at least one required).

2. **Given** I am in the rule builder, **When** I select a trigger type (e.g. "Invoice becomes overdue"), **Then** the available condition fields update to show only fields relevant to that trigger (e.g. amount, contact, due date).

3. **Given** I have selected a trigger and want to add conditions, **When** I click "Add condition", **Then** I can choose a field, an operator (equals, not equals, greater than, less than, contains), and a value.

4. **Given** I have a trigger and conditions set, **When** I add an action of type "Send notification", **Then** I can choose recipient roles (owner, accountant, bookkeeper, specific user via searchable member selector) and customise the notification title and body with placeholder tokens (e.g. {invoice_number}, {amount}, {contact_name}).

5. **Given** I have completed all required fields in the rule builder, **When** I click "Save rule", **Then** the rule is created in an enabled state and appears in the automation rules list.

6. **Given** I am creating a rule, **When** I try to save without selecting a trigger or without adding at least one action, **Then** I see validation errors explaining what is missing.

7. **Given** I have created a custom rule, **When** I return to the automation rules list, **Then** my rule appears with a "Custom" badge and its enabled status.

8. **Given** I am in the rule builder and I select a trigger type that is not yet available (e.g. "Job share viewed"), **When** I view the trigger dropdown, **Then** that trigger appears greyed out with a "Coming soon" label and cannot be selected.

---

### User Story 3 -- Edit and delete custom rules (Priority: P1)

As a workspace owner or accountant, I want to edit an existing custom rule's trigger, conditions, or actions, and delete rules I no longer need, so that I can keep my automations current as my business needs change.

**Why this priority**: Rules that cannot be modified after creation force users to delete and recreate, which is frustrating and loses execution history context.

**Independent Test**: Can be fully tested by editing an existing rule's conditions and verifying the changes persist, then deleting the rule and verifying it is removed.

**Acceptance Scenarios**:

1. **Given** I am viewing a custom rule's detail, **When** I click "Edit", **Then** the rule builder opens pre-populated with the rule's current trigger, conditions, and actions.

2. **Given** I am editing a custom rule, **When** I change a condition value and click "Save", **Then** the rule is updated and future trigger events evaluate against the new condition.

3. **Given** I am viewing a custom rule's detail, **When** I click "Delete" and confirm the deletion prompt, **Then** the rule is permanently removed from the workspace and no longer appears in the list.

4. **Given** I am viewing a system default rule's detail, **When** I look at the available actions, **Then** I see "Edit" (to customise conditions, recipients, and action details) but NOT "Delete" because system defaults cannot be removed -- only disabled.

5. **Given** I am editing a system default rule, **When** I modify the notification body text and save, **Then** future notifications from this rule use the custom text instead of the system default text.

---

### User Story 4 -- System default rules migration (Priority: P1)

As a workspace owner, I want the existing hardcoded notification behaviours to appear as editable "System" rules in my Automations settings, so that I can customise their recipients, conditions, and notification text without losing any current notification behaviour.

**Why this priority**: This is the migration path from the old hardcoded system. Without it, the old listeners and new rule engine would run in parallel, creating confusion and duplicate notifications.

**Independent Test**: Can be fully tested by verifying that all 14 system default rules appear in a fresh workspace's automation list with correct trigger types, recipients, and notification text matching the current hardcoded behaviour.

**Acceptance Scenarios**:

1. **Given** a workspace is created (or the migration runs on existing workspaces), **When** I navigate to Settings > Automations, **Then** I see 14 system default rules, each corresponding to one of the existing hardcoded notification behaviours:
   - Journal entry submitted (notify approvers)
   - Journal entry approved (notify submitter)
   - Journal entry rejected (notify submitter)
   - Invoice sent (notify sender)
   - Invoice paid (notify owners, accountants, and invoice creator)
   - Bank feed synced (notify owners and accountants)
   - Bank feed error (notify owners and accountants)
   - Task shared with client (notify workspace owners and accountants)
   - Client task completed (notify practice assignee or task creator)
   - Client request submitted (notify assigned practice members, fallback to practice owners)
   - Client request status changed (notify request creator)
   - Task comment added by practice member (notify workspace owners and accountants)
   - Task comment added by client (notify practice assignee or task creator)
   - Job share viewed (notify token creator) -- marked as "Coming soon" until 022-CPV ships

2. **Given** the system default rules have been migrated, **When** I compare the notification output of the old hardcoded listener with the new system default rule for the same event, **Then** the same recipients receive the same notification with the same title and body text, including composite recipient logic (e.g. "Invoice paid" notifies owners, accountants, AND the invoice creator).

3. **Given** I disable a system default rule (e.g. "Bank feed synced"), **When** a bank feed sync completes, **Then** no notification is sent for that event in this workspace, while other workspaces with the rule enabled still receive notifications.

4. **Given** a system default rule exists, **When** I view its detail, **Then** I see a "System" badge and the rule cannot be deleted -- only disabled or customised.

---

### User Story 5 -- Rule execution log (Priority: P1)

As a workspace owner or accountant, I want to see a log of every automation rule execution showing what triggered it, which conditions matched, what actions were taken, and whether each action succeeded or failed, so that I can troubleshoot automations and audit what the system did on my behalf.

**Why this priority**: Without an execution log, users cannot debug why a rule did or did not fire, making the automation system opaque and untrustworthy. This is essential for user confidence.

**Independent Test**: Can be fully tested by triggering a rule and verifying the execution log entry appears with correct trigger, condition match result, action outcome, and timestamp.

**Acceptance Scenarios**:

1. **Given** an automation rule fires successfully, **When** I navigate to Settings > Automations and click the "Execution Log" tab, **Then** I see an entry showing: rule name, trigger event type, timestamp, number of conditions evaluated, number of actions executed, and overall outcome (success/partial/failure).

2. **Given** an automation rule fires but one of its two actions fails (e.g. webhook returns 500), **When** I view the execution log entry, **Then** the overall outcome shows "partial", and expanding the entry shows each action's individual result (success or failure with error detail).

3. **Given** a rule's conditions do not match the trigger event (e.g. invoice amount is below the condition threshold), **When** I view the execution log, **Then** I see an entry with outcome "skipped" and the condition evaluation detail showing which condition did not match.

4. **Given** the execution log has 100+ entries, **When** I use the date range filter and rule name filter, **Then** entries are filtered accordingly and paginated at 50 per page.

5. **Given** I click on a specific execution log entry, **When** the detail panel opens, **Then** I see: the trigger event payload summary (key identifiers only, capped at 2,000 characters), each condition with its expected value vs actual value, each action with its result, and the total execution duration.

---

### User Story 6 -- Template rules (Priority: P2)

As a workspace owner or accountant, I want to browse a library of pre-built rule templates for common workflows and enable them with one click, so that I can quickly set up useful automations without building rules from scratch.

**Why this priority**: Templates lower the barrier to adoption by showing users what is possible and providing ready-made automations. Not blocking for MVP but significantly improves first-time experience.

**Independent Test**: Can be fully tested by browsing the template library, enabling a template, and verifying the resulting rule appears in the workspace rule list with the template's pre-configured trigger, conditions, and actions.

**Acceptance Scenarios**:

1. **Given** I am on the Automations settings page, **When** I click "Browse Templates", **Then** I see a list of pre-built rule templates grouped by category (e.g. Invoicing, Banking, Approvals, Practice Tasks).

2. **Given** I am browsing templates, **When** I click on a template (e.g. "Notify me when any bill over $5,000 is approved"), **Then** I see a preview of the trigger, conditions, and actions that the template will create.

3. **Given** I am viewing a template preview, **When** I click "Use Template", **Then** a new custom rule is created in my workspace pre-populated with the template's configuration, and I am taken to the rule builder so I can customise it before saving.

4. **Given** I have enabled a template rule, **When** I view it in the rules list, **Then** it appears as a "Custom" rule (not "System") and I can fully edit or delete it.

5. **Given** a template references a condition value that varies per workspace (e.g. amount threshold), **When** I use the template, **Then** the rule builder highlights that field for me to confirm or change the default value.

---

### User Story 7 -- Dry-run mode for rules (Priority: P2)

As a workspace owner or accountant, I want to test a rule in "dry run" mode before activating it, so that I can see what it would do without actually sending notifications, creating tasks, or firing webhooks.

**Why this priority**: Dry-run mode prevents misconfigured rules from sending unwanted notifications or creating duplicate tasks. It builds user confidence and reduces support requests.

**Independent Test**: Can be fully tested by toggling a rule to dry-run mode, triggering the event, and verifying that the execution log records what would have happened without any side effects.

**Acceptance Scenarios**:

1. **Given** I am creating or editing a rule, **When** I toggle the "Dry run" switch on, **Then** the rule evaluates triggers and conditions normally but does NOT execute any actions.

2. **Given** a rule is in dry-run mode and its trigger fires with matching conditions, **When** I view the execution log, **Then** I see an entry with outcome "dry-run" and the detail panel shows which actions would have been executed, including recipient lists and notification text.

3. **Given** a rule is in dry-run mode, **When** I view it in the rules list, **Then** it shows a distinct "Dry Run" badge so I can easily distinguish it from live rules.

4. **Given** a rule has been in dry-run mode and I am satisfied with the results, **When** I edit the rule and turn off dry-run mode, **Then** the rule becomes fully active and subsequent triggers execute actions for real.

---

### User Story 8 -- Multiple action types (Priority: P2)

As a workspace owner or accountant, I want each automation rule to support multiple action types -- send in-app notification, send email, create a practice task, and fire a webhook -- so that a single trigger can automate a complete workflow across channels.

**Why this priority**: Multi-action rules are what make the automation engine genuinely powerful. Single-action rules only replace the existing notification system. Multiple actions per rule unlock workflows like "notify + create task + alert external system."

**Independent Test**: Can be fully tested by creating a rule with multiple actions and verifying each action type executes independently when the rule fires.

**Acceptance Scenarios**:

1. **Given** I am building a rule in the rule builder, **When** I click "Add action" after already adding one action, **Then** I can add a second action of a different type (e.g. first action is "Send notification", second action is "Create task").

2. **Given** a rule has an action of type "Send in-app notification", **When** the rule fires, **Then** an in-app notification is created for each specified recipient using the configured title and body with placeholder tokens resolved. No email is sent by this action -- "Send in-app notification" and "Send email" are independent action types.

3. **Given** a rule has an action of type "Send email", **When** the rule fires, **Then** an email is sent to the specified recipients via the existing NotificationMailer. Automation-triggered emails bypass category-level notification preferences because the rule itself is the user's opt-in; users who do not want the email can disable the rule or remove the email action.

4. **Given** a rule has an action of type "Create task", **When** the rule fires and the workspace is linked to a practice, **Then** a practice task is created in the linked practice with the configured title, description, and assignee. If no practice is linked to the workspace, the action is skipped with a "no practice linked" note in the execution log.

5. **Given** a rule has an action of type "Fire webhook", **When** the rule fires, **Then** an HTTP POST is sent to the configured webhook URL with a JSON payload containing the trigger event type, timestamp, and relevant entity data, and the webhook delivery is logged.

6. **Given** a rule has three actions and the second action fails (e.g. webhook timeout), **When** the rule executes, **Then** the first and third actions still execute successfully, and the execution log records the partial failure with the individual action outcomes.

7. **Given** I am adding a "Fire webhook" action, **When** I configure the action, **Then** I can either select an existing registered webhook endpoint from my workspace (from the Public API & Webhooks feature) or provide a custom one-off URL with an optional secret header for signature verification.

---

### User Story 9 -- Rate limiting and circuit breaker (Priority: P2)

As a workspace owner, I want the automation engine to protect me from runaway rules that could send thousands of notifications in a loop, so that a misconfigured rule does not flood recipients or overwhelm the system.

**Why this priority**: The highest-severity risk in the idea brief. Without rate limiting, a single misconfigured rule could generate massive notification spam, erode user trust, and cause system performance issues.

**Independent Test**: Can be fully tested by creating a rule that triggers very frequently and verifying that the rate limiter throttles executions after the configured threshold, and the circuit breaker disables the rule after sustained over-firing.

**Acceptance Scenarios**:

1. **Given** a rule fires more than 50 times within a rolling 1-hour window, **When** the 51st trigger event occurs, **Then** the rule is throttled: the execution is skipped, an execution log entry is recorded with outcome "rate-limited", and the workspace owner receives a one-time notification that the rule has been rate-limited.

2. **Given** a rule has been rate-limited 3 times within a rolling 24-hour window (indicating sustained over-firing), **When** the circuit breaker threshold is reached, **Then** the rule is automatically disabled, an execution log entry is recorded with outcome "circuit-breaker-disabled", and the workspace owner receives a notification explaining the rule was disabled and how to re-enable it.

3. **Given** a rule has been disabled by the circuit breaker, **When** the workspace owner re-enables it from the rule detail view, **Then** the rate limit counters are reset and the rule resumes normal operation.

4. **Given** a rule with a "Create task" action fires, **When** a task with the same title already exists for the same workspace and is not yet complete, **Then** the action is skipped with a "duplicate suppressed" note in the execution log, preventing task duplication.

---

### User Story 10 -- Condition operators and field types (Priority: P1)

As a workspace owner or accountant building a rule, I want a set of condition operators (equals, not equals, greater than, less than, contains, is empty, is not empty) that work with different field types (text, number, currency, date, role, boolean), so that I can create precise conditions for when a rule should fire.

**Why this priority**: Conditions are what differentiate this system from a simple event-to-notification mapper. Without conditions, every rule fires on every matching event, which is too noisy to be useful.

**Independent Test**: Can be fully tested by creating rules with various condition types and verifying that only events matching the conditions trigger the actions.

**Acceptance Scenarios**:

1. **Given** I am adding a condition to a rule with trigger "Invoice becomes overdue", **When** I select the "Amount" field, **Then** I see operators: equals, not equals, greater than, greater than or equal, less than, less than or equal.

2. **Given** I create a rule with condition "Amount greater than 100000" (cents, i.e. $1,000), **When** an invoice with amount 50000 ($500) becomes overdue, **Then** the rule does NOT fire and the execution log shows outcome "skipped" with condition detail "Amount 50000 is not greater than 100000".

3. **Given** I create a rule with condition "Amount greater than 100000", **When** an invoice with amount 150000 ($1,500) becomes overdue, **Then** the rule fires and executes its actions.

4. **Given** I am adding a condition with a text field (e.g. contact name), **When** I select the "Contact name" field, **Then** I see operators: equals, not equals, contains, starts with, is empty, is not empty.

5. **Given** I want multiple conditions on a single rule, **When** I add a second condition, **Then** both conditions must match for the rule to fire (AND logic), and the condition group is labelled "All conditions must match".

6. **Given** I am adding a condition based on who triggered the event, **When** I select the "Triggering user role" field, **Then** I see a dropdown of workspace roles (owner, accountant, bookkeeper, approver, auditor, client) as the value selector.

---

### Edge Cases

- **What happens when a rule's trigger event type is removed in a future release?** The rule becomes orphaned and is marked as "Trigger unavailable" in the rules list. It does not fire but is preserved so the user can see it and decide to delete or reconfigure.

- **What happens when a rule references a specific user who is removed from the workspace?** The action targeting that user is skipped during execution with a "Recipient not found" note in the execution log. The rule remains active for other recipients.

- **What happens when two rules have the same trigger and overlapping conditions?** Both rules fire independently. There is no deduplication across rules -- each rule is an independent automation. Rule execution order is non-deterministic and rules MUST NOT depend on the outcome of other rules.

- **What happens when a workspace is created from a template or cloned?** System default rules are created during workspace provisioning. Custom rules are NOT cloned.

- **What happens if rule evaluation takes longer than 30 seconds?** The evaluation is aborted, an execution log entry is recorded with outcome "timeout", and the rule remains enabled for future events.

- **What happens if the same event triggers both the old hardcoded listener and a system default rule during migration?** The feature flag controls which system is active. When the flag is OFF (default during rollout), ONLY the old listeners fire. When the flag is ON (after parity verification), ONLY the rule engine fires. They never run simultaneously for the same event type, preventing duplicate notifications.

- **What happens when a trigger type is registered but its source event does not yet exist?** (e.g. "Job share viewed" depends on 022-CPV.) The trigger type appears in the trigger registry and rule builder but is greyed out with a "Coming soon" label. Rules cannot be created for unavailable triggers.

- **What happens when 5 of the 13 listeners are called directly from controllers, not via Laravel events?** (NotifyOnTaskShared, NotifyOnClientTaskCompleted, NotifyOnClientRequestSubmitted, NotifyOnClientRequestStatusChanged, NotifyOnTaskCommentAdded.) The migration must introduce proper domain events for these 5 cases so the rule engine can listen uniformly. During the parallel-run period, the old direct controller calls remain active.

- **What happens when the NotifyOnTaskCommentAdded listener has bidirectional logic?** It becomes TWO system default rules: one for "Practice member comments on shared task" (notify workspace owners/accountants) and one for "Client comments on shared task" (notify practice assignee/task creator). A `comment_source` condition field (practice/client) differentiates them.

- **What happens when the user who created a rule is removed from the workspace?** The rule survives. The `created_by` field is informational (audit trail) only, not functional. The rule continues to fire regardless of whether the creator is still a workspace member.

- **What happens when a "Create task" action fires but the workspace has no linked practice?** The action is skipped with a "no practice linked" note in the execution log. The other actions in the rule still execute normally.

---

## Requirements

### Functional Requirements -- Trigger Types

- **FR-001**: System MUST support the following trigger event types, each mapping to an existing domain event or notification type: journal entry submitted, journal entry approved, journal entry rejected, invoice sent, invoice paid, invoice overdue, bank feed synced, bank feed error, reconciliation completed, task shared with client, client task completed, client request submitted, client request status changed, task comment added (practice member), task comment added (client), job share viewed, signing request sent, document signed, document completed, document declined, signing reminder, access expiring, access expired, cash flow shortfall, task overdue. Trigger types whose source event does not yet exist (e.g. job share viewed pending 022-CPV) MUST be registered but marked as unavailable.

- **FR-002**: System MUST allow only one trigger event type per rule. Multi-trigger rules are not supported -- users should create separate rules for different triggers.

- **FR-003**: System MUST expose each trigger event type with a human-readable label and a category grouping (Approvals, Invoicing, Banking, Practice Tasks, Client Requests, Signing, Access, Forecasting, Jobs) in the rule builder. Unavailable triggers MUST be shown greyed out with a "Coming soon" label.

### Functional Requirements -- Conditions

- **FR-004**: System MUST support zero or more conditions per rule, evaluated with AND logic (all conditions must match for the rule to fire). OR logic and nested condition groups are out of scope for this version.

- **FR-005**: System MUST support the following condition operators: equals, not equals, greater than, greater than or equal, less than, less than or equal, contains, starts with, is empty, is not empty.

- **FR-006**: System MUST expose condition fields relevant to the selected trigger type. For example, an "Invoice paid" trigger exposes: amount, contact name, invoice number, triggering user role. A "Journal entry submitted" trigger exposes: total amount, reference, number of lines, triggering user role. A "Task comment added" trigger exposes: comment_source (practice/client), task title, task visibility.

- **FR-007**: System MUST validate that condition values are compatible with the selected field type (e.g. numeric values for amount fields, role names for role fields).

- **FR-008**: System MUST evaluate all conditions against the event payload at the time of rule execution, not at rule creation time.

### Functional Requirements -- Action Types

- **FR-009**: System MUST support the following action types: send in-app notification, send email notification, create practice task, fire webhook. The action type registry MUST be extensible so that future action types (e.g. "Start approval chain" from 060-ACH) can be added without schema changes.

- **FR-010**: System MUST allow one or more actions per rule, with no maximum limit.

- **FR-011**: "Send in-app notification" action MUST support selecting recipients by workspace role (owner, accountant, bookkeeper, approver), specific user (via searchable workspace member selector), or event actor (the user who triggered the event), and MUST support customisable notification title and body with placeholder tokens. This action creates an in-app notification only -- it does NOT send an email. "Send in-app notification" and "Send email" are independent action types.

- **FR-012**: "Send email notification" action MUST route through the existing NotificationMailer service. Automation-triggered emails bypass the category-level NotificationPreference check because the rule itself is the user's opt-in to receive the email. Users who do not want the email can disable the rule or remove the email action.

- **FR-013**: "Create practice task" action MUST create a task via the existing practice task system (PracticeTask model in Central), with configurable task title, description, and assignee. The task is created in the practice that manages the triggering workspace (via PracticeMemberAssignment). If no practice is linked to the workspace, the action MUST be skipped with a "no practice linked" note in the execution log.

- **FR-014**: "Fire webhook" action MUST support two modes: (a) selecting an existing registered WebhookEndpoint from the workspace (from 045-PUB Public API & Webhooks), or (b) providing a custom one-off URL with an optional secret header. In both modes, an HTTP POST is sent with a JSON payload containing: event type, timestamp, workspace identifier, and relevant entity data. The delivery MUST be logged.

- **FR-015**: Each action within a rule MUST execute independently -- a failure in one action MUST NOT prevent other actions in the same rule from executing.

### Functional Requirements -- Rule Management

- **FR-016**: System MUST scope all rules to a workspace. A rule in workspace A MUST NOT fire on events from workspace B.

- **FR-017**: System MUST support two rule types: "System" (created by migration, cannot be deleted) and "Custom" (created by users, can be deleted).

- **FR-018**: System MUST allow rules to be enabled, disabled, or set to dry-run mode.

- **FR-019**: System MUST validate rule completeness on save: a rule requires a name, exactly one trigger, and at least one action.

- **FR-020**: System MUST support searching and filtering the rule list by name, trigger type, rule type (System/Custom), and enabled/disabled status.

- **FR-021**: Only users with the `workspace.settings` permission (owner and accountant roles) MUST be able to view, create, edit, enable, disable, or delete automation rules.

### Functional Requirements -- Execution Log

- **FR-022**: System MUST record every rule evaluation in an execution log with: rule identifier, trigger event type, timestamp, trigger event payload summary (key identifiers only, capped at 2,000 characters -- include entity UUID, amount, contact name but not nested line items), condition evaluation result (matched/not matched per condition), actions executed (per action: type, result, error detail if failed), overall outcome (success, partial, failure, skipped, dry-run, rate-limited, timeout, circuit-breaker-disabled), and execution duration in milliseconds.

- **FR-023**: Execution log entries MUST be retained for 90 days and then automatically purged via a scheduled command.

- **FR-024**: System MUST display the execution log in the Automations settings area with pagination (50 per page), date range filter, rule name filter, and outcome filter.

### Functional Requirements -- System Default Migration

- **FR-025**: System MUST create 14 system default rules for every existing workspace when the migration runs, each replicating the exact behaviour of the corresponding hardcoded listener (trigger event, recipient selection logic including composite recipients like "owners + accountants + entity creator", notification title, and body text). The "Task comment added" listener becomes two rules (practice member comment and client comment) due to its bidirectional routing logic.

- **FR-026**: System MUST create system default rules automatically for new workspaces during workspace provisioning.

- **FR-027**: System MUST provide a feature flag to control the migration cutover. When the flag is OFF (default during rollout), ONLY the old hardcoded listeners fire. When the flag is ON (after parity verification), ONLY the rule engine fires. The two systems MUST NOT run simultaneously for the same event type to prevent duplicate notifications.

- **FR-039**: The migration MUST introduce proper domain events for the 5 notification listeners that are currently called directly from controllers (NotifyOnTaskShared, NotifyOnClientTaskCompleted, NotifyOnClientRequestSubmitted, NotifyOnClientRequestStatusChanged, NotifyOnTaskCommentAdded). This ensures the rule engine can listen to all trigger types uniformly via the event system rather than requiring controller modifications.

### Functional Requirements -- Template Rules

- **FR-028**: System MUST provide a template library of at least 10 pre-built rule templates covering common workflows across Invoicing, Banking, Approvals, and Practice Task categories.

- **FR-029**: Using a template MUST create a new Custom rule pre-populated with the template configuration, which the user can then customise before saving.

- **FR-030**: Templates MUST be maintained centrally and available to all workspaces.

### Functional Requirements -- Rate Limiting and Safety

- **FR-031**: System MUST enforce a per-rule rate limit of 50 executions per rolling 1-hour window. Executions beyond this limit are skipped with outcome "rate-limited".

- **FR-032**: System MUST enforce a circuit breaker that automatically disables a rule after 3 rate-limit events within a rolling 24-hour window.

- **FR-033**: System MUST notify the workspace owner when a rule is rate-limited and when a rule is disabled by the circuit breaker.

- **FR-034**: System MUST reset rate limit counters when a rule is manually re-enabled after circuit breaker activation.

- **FR-035**: "Create task" action MUST suppress duplicate task creation when a task with the same title already exists for the workspace and is not yet complete.

### Functional Requirements -- Placeholder Tokens

- **FR-036**: Notification title and body fields in actions MUST support placeholder tokens that are resolved from the trigger event payload at execution time. Tokens MUST use curly brace syntax (e.g. {invoice_number}, {amount}, {contact_name}, {actor_name}).

- **FR-037**: System MUST display available placeholder tokens for the selected trigger type in the rule builder, so users know which tokens they can use.

- **FR-038**: Unresolved tokens (referencing fields not present in the event payload) MUST be replaced with an empty string, not left as raw token text.

### Functional Requirements -- Scheduled Maintenance

- **FR-040**: System MUST provide a scheduled command (e.g. `automation:purge-log`) that runs daily to delete execution log entries older than 90 days. This follows the existing daily command pattern used by `recurring:process`.

---

### Key Entities

- **WorkspaceRule**: Represents a single automation rule scoped to a workspace. Key attributes: name, workspace, trigger event type, rule type (system/custom), mode (enabled/disabled/dry-run), execution count, last executed timestamp, created by user (informational only -- rules survive user removal). A workspace rule has many conditions and many actions.

- **RuleCondition**: Represents a single condition on a rule. Key attributes: field name, operator, value, field type. Conditions are evaluated with AND logic -- all must match for the rule to fire.

- **RuleAction**: Represents a single action on a rule. Key attributes: action type (notification/email/task/webhook), position (execution order), configuration (recipient roles, notification title/body, webhook URL or endpoint reference, task title/assignee, etc.).

- **RuleExecutionLog**: Represents a single execution attempt of a rule. Key attributes: rule reference, trigger event type, trigger event payload summary (capped at 2,000 characters), condition evaluation detail (per condition: field, operator, expected value, actual value, matched), action results (per action: type, outcome, error detail), overall outcome, execution duration, timestamp. Retained for 90 days, purged by scheduled command.

- **RuleTemplate**: Represents a pre-built rule template. Key attributes: name, description, category, trigger event type, default conditions, default actions. Centrally maintained, not workspace-scoped.

---

## Non-Functional Requirements

- **NFR-001**: Rule evaluation MUST complete within 5 seconds per rule, including all condition checks and action dispatching (actions themselves may execute asynchronously).

- **NFR-002**: Rule evaluation MUST be performed asynchronously via a queued job so that the primary business operation (e.g. approving a journal entry) is not delayed by automation processing.

- **NFR-003**: The rule engine MUST only load rules matching the trigger event type for evaluation, not all workspace rules, to minimise query overhead.

- **NFR-004**: The execution log MUST support at least 1 million entries per workspace before requiring archival.

- **NFR-005**: The automation rules list and execution log MUST load within 2 seconds for workspaces with up to 100 rules and 10,000 log entries.

- **NFR-006**: All rule management operations (create, update, delete, enable, disable) MUST be protected by workspace-level authorisation, ensuring no cross-workspace access.

---

## API Endpoints

The following endpoints are needed to support the rule builder UI and execution log:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/automation-rules` | List all rules for the current workspace (search, filter, paginate) |
| `POST /api/v1/automation-rules` | Create a new custom rule |
| `GET /api/v1/automation-rules/{uuid}` | Get full rule detail (trigger, conditions, actions) |
| `PATCH /api/v1/automation-rules/{uuid}` | Update a rule (conditions, actions, name, mode) |
| `DELETE /api/v1/automation-rules/{uuid}` | Delete a custom rule (system rules cannot be deleted) |
| `PATCH /api/v1/automation-rules/{uuid}/toggle` | Enable or disable a rule |
| `GET /api/v1/automation-rules/execution-log` | List execution log entries (paginate, filter by date, rule, outcome) |
| `GET /api/v1/automation-rules/execution-log/{uuid}` | Get execution log entry detail |
| `GET /api/v1/automation-rules/templates` | List available rule templates |
| `POST /api/v1/automation-rules/from-template/{templateId}` | Create a rule from a template (returns pre-populated rule for editing) |
| `GET /api/v1/automation-rules/trigger-types` | List available trigger types with their condition fields and placeholder tokens |

---

## UI Wireframe Descriptions

### Automations Settings Page (Settings > Automations)

- **StatusTabs** at top: All | System | Custom | Disabled
- **Search bar** to filter by rule name or trigger type
- **"New Rule" button** with keyboard shortcut `N`
- **"Browse Templates" button** next to New Rule
- **Rules table** with columns: Name, Trigger, Type (System/Custom badge), Status (Enabled/Disabled/Dry Run badge), Last Executed, toggle switch
- Clicking a rule row navigates to the rule detail view
- **"Execution Log" tab** alongside the rules list tab, showing the log table

### Rule Builder (Full-page form)

- **Name field** at top
- **Trigger section**: dropdown to select one trigger event type, grouped by category. Unavailable triggers shown greyed out with "Coming soon" label.
- **Conditions section**: repeating group of condition rows. Each row: field dropdown (populated based on trigger), operator dropdown, value input (type-appropriate: text, number, date picker, role selector). "Add condition" button. "All conditions must match" label.
- **Actions section**: repeating group of action cards. Each card has: action type selector, type-specific configuration fields (recipient selector with searchable member dropdown for specific users, notification title/body with token help, webhook URL/secret or endpoint selector, task title/description/assignee). "Add action" button.
- **Mode toggle**: Active / Dry Run
- **Save button** with `Cmd+Enter` shortcut
- **Cancel button** with `Escape`

### Rule Detail View (Read-only with edit action)

- Rule name and badges (System/Custom, Enabled/Disabled/Dry Run)
- Trigger type with human-readable label
- Conditions displayed as a readable sentence (e.g. "When amount is greater than $1,000")
- Actions listed with their type icons and configuration summary
- Execution stats: total executions, last execution time, success rate
- "Edit" button, "Delete" button (custom only), enable/disable toggle

### Execution Log Table

- Columns: Timestamp, Rule Name, Trigger, Outcome (badge: success/partial/failure/skipped/dry-run/rate-limited), Duration
- Expandable rows showing condition evaluation detail and per-action results
- Filters: date range picker, rule name dropdown, outcome dropdown
- Paginated at 50 per page

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: After migration, 100% of the 14 system default rules (covering all existing hardcoded notification behaviours including the split task comment rules) produce identical notification output to the old listeners (verified by parallel-run parity check with feature flag OFF, then ON).

- **SC-002**: Users can create and activate a new custom automation rule within 3 minutes using the rule builder.

- **SC-003**: At least 5 rule templates are used across 10+ workspaces within the first month of release, indicating template discoverability and usefulness.

- **SC-004**: Execution log entries are recorded for 100% of rule evaluations (both fired and skipped) with complete condition and action detail.

- **SC-005**: Zero runaway rule incidents occur after launch, demonstrating that rate limiting and circuit breaker protections are effective.

- **SC-006**: Developer time spent on "change this notification" requests drops to zero within 3 months of release, as workspace owners handle changes via the rule builder.

- **SC-007**: Rule evaluation does not add more than 500ms of latency to the primary business operation (measured via queue job dispatch time, not action execution time).

---

## Dependencies

| Dependency | Status | Relationship |
|------------|--------|-------------|
| 024-NTF Notifications & Activity Feed | Complete | Provides CreateNotification action and NotificationMailer service used by notification and email action types |
| 027-PMV Practice Management v2 | Complete | Provides PracticeTask model and creation infrastructure for "Create task" action type |
| 045-PUB Public API & Webhooks | Complete | Provides WebhookEndpoint model and DispatchWebhook action for "Fire webhook" action type |
| 060-ACH Approval Chains | Not started | Future integration point -- "Start approval chain" action type will be added when 060-ACH ships |
| 022-CPV Client Portal Views | Not started | "Job share viewed" trigger type unavailable until 022-CPV ships |

---

## Clarifications

### Session 2026-03-22

- Q: Should "Start approval chain" be a fifth action type? -> A: Defer to future. Keep 4 action types. Add Out of Scope note. 060-ACH as future integration. Action type registry extensible.
- Q: Should WFA "Fire webhook" action reuse 045-PUB WebhookEndpoint or support arbitrary URLs? -> A: Support both -- select existing endpoint OR provide custom one-off URL+secret.
- Q: How does the rule engine intercept 5 controller-invoked listeners? -> A: Migration introduces proper domain events for all 5. Old direct calls remain during parallel-run.
- Q: Should NotifyOnJobShareViewed (stub) be included as a trigger type? -> A: Include in registry but mark as unavailable/greyed out until 022-CPV ships.
- Q: Should all 24 NotificationType enum values be trigger types? -> A: Yes. All 24 + the task comment split = comprehensive trigger coverage.
- Q: Should OR logic be supported for conditions? -> A: AND-only for v1. OR and nesting deferred to future iteration.
- Q: How is the bidirectional NotifyOnTaskCommentAdded represented? -> A: Two system default rules (practice comment, client comment). System default count becomes 14.
- Q: Which permission controls automation access? -> A: Existing `workspace.settings` (not `workspace.manage` which does not exist).
- Q: How do automation emails interact with NotificationPreference categories? -> A: Automation emails bypass category-level preferences. The rule itself is the opt-in.
- Q: Should "Invoice paid" system default include the creator? -> A: Yes. Migrated rules replicate exact recipient logic including composite recipients.
- Q: How is execution log purging triggered? -> A: Scheduled Artisan command (daily), consistent with existing `recurring:process` pattern. Added FR-040.
- Q: Can old listeners and new rules run simultaneously causing duplicates? -> A: No. Feature flag is binary -- OFF = only old listeners, ON = only rule engine. Never both.
- Q: Should a rule support multiple trigger types? -> A: No. One trigger per rule. Different triggers expose different condition fields.
- Q: How are "specific user" recipients selected? -> A: Searchable dropdown of workspace members (name + role) with type-ahead.
- Q: Where does "Create task" create the task? -> A: In the practice linked to the workspace via PracticeMemberAssignment. If no practice linked, action skipped.
- Q: Should task deduplication be title-only or title + entity? -> A: Title + workspace + incomplete status is sufficient because tokens make titles entity-specific.
- Q: Does "Send email" also create an in-app notification? -> A: No. They are independent action types. A rule that wants both must add both actions.
- Q: Do rules survive when the creating user is removed? -> A: Yes. created_by is informational only.
- Q: What size limit for trigger event payload in execution log? -> A: 2,000 characters. Key identifiers only, no nested line items.
- Q: Does rule execution order matter for same-trigger rules? -> A: No. Order is non-deterministic. Rules are independent and must not depend on other rules' outcomes.
