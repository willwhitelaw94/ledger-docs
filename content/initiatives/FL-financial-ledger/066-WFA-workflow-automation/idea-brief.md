---
title: "Idea Brief: Workflow Automation & Trigger Rules"
---

# Idea Brief: Workflow Automation & Trigger Rules

**Created**: 2026-03-22
**Author**: William Whitelaw
**Epic**: 066-WFA

---

## Problem Statement (What)

- Workspace owners and accountants cannot control what happens when events occur in their ledger -- all 13 notification listeners are hardcoded with fixed recipients, channels, and behaviour
- Adding a new automation (e.g. "email me when any bill over $5,000 is approved") requires a code change, deploy, and developer involvement
- Email notification preferences are limited to 5 coarse categories (workspace invitation, job share, invoice sent, overdue reminder, payment confirmation) -- users cannot opt in/out per event type or set conditions
- Accountants managing multiple workspaces have no way to create workspace-specific rules such as "auto-assign bank reconciliation tasks every Monday" or "escalate unsigned documents after 48 hours"
- There is no audit trail showing which automations fired, what they did, or why a notification was sent

**Current State**: 13 event listeners in `app/Listeners/Notifications/` fire hardcoded notifications for domain events (JE submitted, invoice paid, bank feed synced, etc.). 24 notification types exist but only 5 email preference categories. Users cannot create, modify, or disable any automation without developer intervention. No execution logging exists.

---

## Possible Solution (How)

Build a configurable automation engine scoped per workspace: "When [trigger] happens, if [conditions] match, then [do actions]."

- **Workspace rules** -- user-defined automation rules with a trigger, optional conditions, and one or more actions
- **System default rules** -- migrate the 13 existing hardcoded listeners into editable "system rules" that users can customise, disable, or extend
- **Visual rule builder** -- a trigger/condition/action builder in workspace settings so non-technical users can create automations without code
- **Rule execution log** -- every rule execution is recorded with timestamp, trigger event, matched conditions, actions taken, and outcome (success/failure)
- **Template rules** -- pre-built rule templates for common workflows that users can enable with one click

**Example**:
```
Before (Current Hardcoded Process)
1. Developer writes a new listener class
2. Developer hardcodes recipients, message text, and channel
3. Deploy to production
4. Users cannot change anything without another deploy

After (Configurable Automation)
1. User opens Settings > Automations
2. Picks trigger: "Invoice becomes overdue"
3. Adds condition: "Amount > $1,000"
4. Picks action: "Send email to workspace owner + Create task for bookkeeper"
5. Rule is live immediately -- no deploy needed
```

---

## Benefits (Why)

**User/Client Experience**:
- Self-service automation: users create rules in minutes instead of waiting days for developer changes
- Granular control: per-event, per-condition notification preferences replace the current 5-category toggle

**Operational Efficiency**:
- Eliminates developer bottleneck for notification changes -- estimated 2-4 hours/month of developer time reclaimed
- System default rules are editable, reducing "please change this notification text" support requests

**Business Value**:
- Unlocks premium "automation" tier for billing (power users pay for advanced rule counts/conditions)
- Differentiator: most small-business accounting tools offer zero workflow automation
- Extensibility: webhook action enables third-party integrations without custom code

**ROI**: Estimated $5K-10K/year in saved developer time; potential premium feature revenue from power users and accountant practices managing 10+ workspaces.

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
- The existing event sourcing infrastructure provides sufficient domain events to serve as triggers
- Most users will start with template rules and only advanced users will build custom rules from scratch
- The 13 existing hardcoded listeners can be migrated to system rules without changing notification behaviour

**Dependencies**:
- 024-NTF Notifications & Activity Feed (existing, provides CreateNotification action and NotificationMailer)
- 027-PMV Practice Management v2 (existing, provides task creation for "Create task" action type)
- 060-ACH Approval Chains (Tier 1, provides approval chain initiation for "Start approval chain" action type)
- 045-PUB Public API & Webhooks (existing, provides webhook dispatch infrastructure for "Webhook" action type)

**Risks**:
- Runaway rules (HIGH) -- a misconfigured rule could fire thousands of notifications or create recursive loops. Mitigation: rate limiting per rule, circuit breaker after N executions per hour, and a "dry run" preview mode before activation.
- Migration complexity (MEDIUM) -- converting 13 hardcoded listeners to system rules while preserving existing behaviour. Mitigation: run old listeners and new system rules in parallel during a transition period; compare outputs before cutting over.
- Performance overhead (MEDIUM) -- evaluating conditions on every domain event adds latency. Mitigation: async rule evaluation via queued jobs; index rules by trigger event type so only relevant rules are loaded.

---

## Estimated Effort

**Large (3 sprints / 6 weeks)**, approximately 80-100 story points

- **Sprint 1**: Core engine -- WorkspaceRule model, trigger registry, condition evaluator, action dispatcher, execution log
- **Sprint 2**: System default migration + rule builder UI -- convert 13 listeners to system rules, build visual trigger/condition/action builder in settings
- **Sprint 3**: Templates, webhook action, approval chain integration, rate limiting, dry-run mode

---

## Proceed to PRD?

**YES** -- This is a Tier 2 infrastructure epic that unlocks user self-service for notifications and workflow automation. The existing hardcoded listener pattern does not scale, and the current 5-category email preference system is too coarse. Specifying the trigger/condition/action model now will establish a foundation that future epics (AI Bookkeeper, advanced approval chains) can build on.

---

## Decision

- [ ] **Approved** -- Proceed to PRD
- [ ] **Needs More Information** -- [What's needed?]
- [ ] **Declined** -- [Reason]

**Approval Date**: --

---

## Next Steps

**If Approved**:
1. [ ] Run `/speckit-specify` to create detailed specification
2. [ ] Run `/trilogy-clarify spec` to refine trigger/condition/action taxonomy
3. [ ] Run `/trilogy-clarify business` to validate premium tier monetisation angle
4. [ ] Run `/trilogy-spec-handover` for Gate 1

**If Declined**:
- Continue maintaining hardcoded listeners and expand the email preference categories incrementally
