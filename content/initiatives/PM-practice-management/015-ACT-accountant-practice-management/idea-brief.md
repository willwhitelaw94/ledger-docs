---
title: "Idea Brief: Accountant & Practice Management"
---

# Idea Brief: Accountant & Practice Management

**Epic**: 015-ACT
**Created**: 2026-03-14
**Initiative**: FL — Financial Ledger Platform

---

## Problem Statement (What)

- An accountant or bookkeeper managing multiple clients has no consolidated view — they must switch between workspaces one at a time via the standard workspace switcher
- An accountant who sets up a new entity on behalf of a client has no way to invite the client as owner and step back to a lower role without manual workarounds
- A client who isn't yet registered can't be invited to their own workspace — there's no invite-by-email flow
- An accountant practice managing 20+ clients across different organisations cannot see work queued for them (e.g. awaiting approval, unreconciled transactions) without checking each workspace individually
- There is no concept of "practice" — a group of workspaces managed by the same accountant across different client organisations
- Ownership transfer is not possible — the person who creates the workspace is stuck as owner with no way to formally hand control to the client

**Current State**: Single workspace context. No practice view. No invite-by-email. No ownership transfer. Accountant must be added to each client organisation separately with no aggregated view.

---

## Possible Solution (How)

### Practice Dashboard
A dedicated view for users with `accountant` or `bookkeeper` roles across multiple organisations:
- Lists all client workspaces the accountant has access to, regardless of which organisation they belong to
- Status at a glance per client: pending approvals, unreconciled transactions, overdue invoices, last activity date
- Quick-switch into any client workspace from one screen
- Filter by: needs attention, pending approvals, inactive (no activity in 30+ days)

### Create Workspace on Behalf of Client
- Accountant runs the workspace creation wizard (013-WSP) for a client
- On wizard completion, instead of auto-switching into the workspace, a **"Hand off to client"** option appears
- Accountant enters the client's email address
- If the client is already a user: they receive an invitation to the workspace as `owner`
- If the client is not yet registered: an invite link is sent — on first login, they land directly in the workspace as `owner`
- Accountant retains their role (defaults to `accountant`) and can adjust or remove themselves after handoff

### Ownership Transfer
- Any current `owner` of a workspace can transfer ownership to another member
- Transfer requires the recipient to accept (they receive a notification)
- Once accepted, the transferring user is downgraded to their next highest role (or removed if they choose)
- Full audit trail of ownership changes

### Invite by Email
- Any workspace owner or accountant can invite a new user by email address
- Invite specifies the role to be assigned on acceptance
- Invite link expires after 7 days (resendable)
- On first login via invite link, user lands directly in the workspace with the assigned role

### Practice Settings
- Accountants can mark a set of workspaces as "my practice clients" for their personal practice view
- Practice view is personal — it doesn't affect the client's workspace or permissions
- Accountants can add notes per client (internal, not visible to the client)

### Before / After

```
// Before
Accountant sets up client workspace → stuck as owner →
client has no way to get in → accountant manually adds client →
no consolidated view of all clients → check each workspace one by one

// After
Accountant runs wizard → completes setup → clicks "Hand off to client" →
types client email → client gets invite link → accepts → becomes owner →
accountant retains accountant role → practice dashboard shows all clients
in one view with live status indicators
```

---

## Benefits (Why)

**For Accountants & Bookkeepers**
- Manage all clients from one screen — dramatic time saving vs. workspace-by-workspace navigation
- Clean client onboarding process — set up, hand off, done
- Practice view highlights work that needs attention without opening each workspace

**For Clients**
- Accountant sets everything up correctly from day one — client inherits a properly configured workspace
- No awkward onboarding — the accountant handles the technical setup, client just accepts an invite

**Platform Value**
- Accountants are high-value, sticky users — they bring multiple clients to the platform
- Practice management is a key differentiator vs. consumer accounting tools
- Opens path to accountant marketplace / referral program
- Foundation for multi-org billing consolidation (accountant pays for all client workspaces)

**Business Value**
- Accountant channel acquisition: one accountant = multiple paying workspaces
- Reduces churn: clients with an accountant actively using the platform are far less likely to leave
- Premium feature justifying higher plan tier for practice users

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | William Whitelaw (PO, Dev) |
| **A** | William Whitelaw |
| **C** | — |
| **I** | — |

---

## Assumptions & Dependencies

**Assumptions**
- Multi-workspace per organisation is complete (003-AUT done)
- Workspace creation wizard (013-WSP) is complete — accountant uses it to set up client workspaces
- Role system (6 roles including `accountant`) is already implemented
- Email delivery infrastructure exists (Laravel mail)

**Dependencies**
- 013-WSP Workspace Entity Setup — wizard must exist before "create on behalf of" flow works
- 003-AUT Auth & Multi-tenancy (complete)
- 009-BIL Billing — practice billing model (accountant pays for clients) is a downstream consideration, not a blocker for v1

**Risks**
- Multi-org access under one login creates complex permission queries — must not leak cross-org data
- Invite-by-email creates unregistered user records — need cleanup process for expired/unaccepted invites
- Ownership transfer is high-stakes — needs confirmation flow and audit trail
- Practice dashboard aggregates data across workspaces — potential performance concern at scale (50+ clients)

---

## Estimated Effort

**T-Shirt Size**: XL (4–6 sprints)

| Phase | Work |
|-------|------|
| Backend | Invite model (email + role + expiry), ownership transfer action, practice membership model, cross-org workspace query (scoped, no data leakage) |
| API | Invite endpoints, transfer endpoint, practice dashboard aggregate endpoint |
| Frontend | Practice dashboard page, invite-by-email flow, handoff modal in wizard, ownership transfer UI, practice client notes |
| Tests | Invite acceptance, ownership transfer audit, cross-org isolation (critical), expired invite cleanup |

---

## Proceed to Spec?

**YES** — but **depends on 013-WSP** shipping first. The "create on behalf of" flow is the entry point for the accountant workflow and requires the wizard. Spec after 013-WSP is in QA.
