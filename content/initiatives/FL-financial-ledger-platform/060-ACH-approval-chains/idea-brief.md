---
title: "Idea Brief: Configurable Approval Chains"
---

# Idea Brief: Configurable Approval Chains

**Epic**: 060-ACH
**Created**: 2026-03-22
**Initiative**: FL -- MoneyQuest Ledger / Platform Intelligence & Automation
**Status**: Idea

---

## Problem Statement (What)

Businesses with more than one or two people involved in financial decisions need approval workflows that reflect their internal controls. MoneyQuest currently offers only single-step approval -- anyone with the "approve" permission can approve any journal entry, invoice, bill, or BAS period regardless of the document's value, risk, or complexity.

- **No amount thresholds** -- a $50 office supply journal entry and a $500,000 asset revaluation follow the same one-click approval path
- **No multi-step review** -- regulated industries, larger SMEs, and accountants managing client books need sequential sign-off (e.g. bookkeeper prepares, senior accountant reviews, partner approves)
- **No escalation when approvers are absent** -- if the sole approver is on leave, documents sit in limbo with no automatic escalation or delegation
- **No audit trail of the approval chain** -- auditors can see *who* approved, but not *which step in what workflow*, making it hard to prove that internal controls were followed
- **Flat permission model** -- the "approver" role grants blanket approval rights across all document types and amounts, providing no granularity

**Current State**: Approval is binary -- submit, then any approver clicks "Approve" or "Reject". No routing logic, no thresholds, no steps. Notifications go to all users with the "approver" pivot role on the workspace.

---

## Possible Solution (How)

A **configurable approval workflow engine** at the workspace level that routes documents through one or more approval steps based on document type, amount thresholds, and custom rules.

- **Workflow definitions** -- workspace admins define named workflows per document type (journal entries, invoices, bills, BAS) with one or more sequential steps
- **Threshold-based routing** -- rules like "journal entries over $10,000 require a second approval step" or "bills over $50,000 require owner sign-off"
- **Step configuration** -- each step specifies approvers (specific users or roles), whether approval is "any one of" or "all of", and an optional escalation timeout
- **Escalation and delegation** -- if a step is not actioned within a configurable window, escalate to the next level or a designated delegate; allow users to delegate approval authority when away
- **Approval audit trail** -- each step records who approved, when, with optional comments, stored as domain events on the existing aggregates
- **Notification integration** -- each step triggers targeted notifications only to the approvers relevant to that step (not all approvers)
- **Settings UI** -- a workspace settings page to create, edit, and preview approval workflows per document type

**Example**:
```
// Before (Current)
1. Bookkeeper creates $75,000 journal entry
2. Bookkeeper submits for approval
3. ANY user with "approve" permission clicks Approve
4. Journal entry is posted

// After (With Approval Chains)
1. Bookkeeper creates $75,000 journal entry
2. Bookkeeper submits for approval
3. System routes to "High Value JE" workflow (threshold: > $10,000)
4. Step 1: Senior Accountant reviews and approves
5. Step 2: Owner/Partner gives final approval
6. Journal entry is posted -- audit trail shows both steps
```

---

## Benefits (Why)

**User/Client Experience**:
- **Confidence in controls** -- workspace owners know high-value transactions get the right level of scrutiny
- **Reduced bottlenecks** -- parallel approval options and delegation prevent documents sitting idle when someone is unavailable

**Operational Efficiency**:
- **Targeted notifications** -- approvers only see documents routed to them, reducing notification noise by an estimated 40-60% for multi-person teams
- **Automated escalation** -- eliminates manual follow-up ("has anyone approved this?"), saving 1-2 hours/week for busy practices

**Business Value**:
- **Audit readiness** -- documented multi-step approval trails satisfy external auditor requirements for internal controls
- **Competitive parity** -- Xero (via ApprovalMax), MYOB, and QuickBooks all offer multi-level approval workflows; this is table stakes for mid-market
- **Practice upsell** -- accountants managing client workspaces can enforce firm-standard approval policies across all clients

**ROI**: Reduces approval-related admin overhead by approximately 3-5 hours/week per workspace with 3+ users. Enables MoneyQuest to compete for mid-market clients who require segregation of duties.

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | -- |
| **A** | -- |
| **C** | -- |
| **I** | -- |

---

## Assumptions & Dependencies

**Assumptions**:
- Most workspaces will use simple 1-2 step workflows; complex chains (3+ steps) will be rare but must be supported
- Approval workflows are workspace-scoped, not organisation-scoped (each entity can have its own rules)
- The existing "approver" role and `journal-entry.approve` / `invoice.approve` permissions remain valid; approval chains add routing on top, they do not replace the permission model

**Dependencies**:
- 002-CLE Core Ledger Engine -- JournalEntryAggregate submit/approve/reject events
- 005-IAR Invoicing -- InvoiceAggregate approve event
- 044-TAX BAS Compliance -- BasPeriod approval flow
- 024-NTF Notifications -- notification infrastructure for step-level alerts
- 039-RPA Roles & Permissions -- existing 6-role, 44-permission model

**Risks**:
- **Complexity creep** (MEDIUM) -- approval workflows can become arbitrarily complex; scope must be tightly bounded to sequential steps with threshold routing. Mitigation: Phase 1 covers sequential steps and thresholds only; parallel approvals and delegation in Phase 2.
- **Performance on submit** (LOW) -- evaluating workflow rules on every document submission adds latency. Mitigation: rules are simple threshold checks cached per workspace; no external calls.
- **Backward compatibility** (MEDIUM) -- workspaces without configured workflows must continue to work exactly as today (single-step approval). Mitigation: default to current behavior when no workflow is defined for a document type.

---

## Estimated Effort

**T-shirt size**: L (Large)

- **Phase 1** (2 sprints): Workflow and step models, threshold routing for journal entries, sequential approval, settings UI, approval audit trail
- **Phase 2** (1-2 sprints): Extend to invoices/bills/BAS, parallel approval mode ("any of" vs "all of"), escalation timeouts, delegation
- **Phase 3** (1 sprint): Practice-level workflow templates (push a standard approval policy to all client workspaces), reporting dashboard

---

## Proceed to PRD?

**YES** -- The problem is well-understood, the existing approval infrastructure provides a solid foundation (aggregates, events, notifications, policies), and the solution is scoped to incremental phases. Research is minimal -- this is a workflow configuration layer, not a new domain.

---

## Decision

- [ ] **Approved** -- Proceed to PRD
- [ ] **Needs More Information** -- [What's needed?]
- [ ] **Declined** -- [Reason]

**Approval Date**: --

---

## Next Steps

**If Approved**:
1. [ ] Run `/speckit-specify` to create spec.md with user stories and acceptance criteria
2. [ ] Run `/trilogy-clarify spec` to refine edge cases (e.g., what happens mid-workflow when a workflow is edited)
3. [ ] Run `/trilogy-clarify business` to validate ROI and competitive positioning
4. [ ] Run `/trilogy-spec-handover` for Gate 1

**If Declined**:
- Continue with single-step approval; revisit when mid-market client feedback demands it
