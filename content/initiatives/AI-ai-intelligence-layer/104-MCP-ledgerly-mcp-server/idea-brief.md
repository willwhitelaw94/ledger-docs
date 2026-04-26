---
title: "Idea Brief: Ledgerly MCP Server"
---

# Idea Brief: Ledgerly MCP Server

**Created**: 2026-04-21
**Author**: Will Whitelaw

---

## Problem Statement (What)

- AI clients (Claude, Cursor, ChatGPT, custom agents) can't natively talk to the Ledgerly ledger — integrators must learn and wrap the REST API themselves
- Every new AI-powered use case (bookkeeping copilots, agent-driven close, automated reconciliation tools) duplicates the same integration plumbing
- Competitors (Xero, MYOB, QuickBooks) expose REST APIs but no MCP — there is no AI-native accounting platform yet
- Internal AI features (chatbot, inbox, anomaly detection) each re-implement tool definitions instead of sharing one canonical contract

**Current State**: 200+ REST endpoints exist. The in-app chatbot has 7 bespoke tool endpoints. No programmatic AI entry point for third parties. Public API (045-PUB) covers API keys + webhooks but not AI tool semantics.

---

## Possible Solution (How)

A first-class MCP server that exposes the ledger engine as a standardised set of tools any MCP-compatible client can connect to.

- **Read tools**: get balances, trial balance, P&L, balance sheet, general ledger, invoice/bill lists, contact lookup, cash position, budget vs actuals
- **Write tools**: create journal entry, create/send invoice, create/pay bill, reconcile transaction, create contact, run report
- **Auth**: reuse Sanctum + API key infrastructure from 045-PUB; per-workspace scoping enforced by existing `SetWorkspaceContext` middleware
- **Tool contract**: each MCP tool wraps an existing Lorisleiva Action — no business logic duplication
- **Discoverability**: publish to the MCP registry; ship a one-click "Connect to Claude/Cursor" flow in workspace settings

**Example**:

```
// Before
Developer wants to build a close-the-books agent:
1. Read Ledgerly REST docs
2. Handle Sanctum auth + workspace headers manually
3. Write 20 HTTP wrappers
4. Re-derive tool semantics for their LLM

// After
1. Install Ledgerly MCP: `npx @ledgerly/mcp --workspace=abc123`
2. Agent picks tools from standardised catalogue
3. Ships in a day
```

---

## Benefits (Why)

**User/Client Experience**:
- Any accountant or business owner can plug Ledgerly into Claude Desktop / Cursor / ChatGPT in under 2 minutes
- Unlocks "ask your ledger anything" for non-technical users without waiting for us to build UI
- Power users can compose workflows we never shipped (e.g. "draft invoices for every unbilled timesheet this month")

**Operational Efficiency**:
- Internal chatbot (021-AIQ), AI inbox (019-AIX), and future AI features consume the same tool catalogue — removes duplicate tool definitions
- Third-party integrators build on Ledgerly without platform team involvement

**Business Value**:
- Genuine USP: "The AI-native accounting platform" — no competitor has this at launch
- Marketplace flywheel (links to 093-MKP): community-published agents and skills
- Distribution channel: listing in the MCP registry puts Ledgerly in front of every agent builder
- Pricing lever: meter MCP tool calls as a premium billing feature

**ROI**: Hard to quantify pre-launch. Qualitatively: defensible positioning in a category about to be reshaped by AI agents; accelerates every downstream AI epic.

---

## Owner & Stakeholders

| Role | Person |
|------|--------|
| **R** | Will Whitelaw (PO, Dev) |
| **A** | Will Whitelaw |
| **C** | — |
| **I** | — |

---

## Assumptions & Dependencies, Risks

**Assumptions**:
- MCP as a protocol remains dominant (Anthropic-led, adopted by OpenAI, Cursor, Windsurf, etc.)
- Existing Lorisleiva Actions are clean enough to wrap without refactor
- 045-PUB API key auth can be reused as MCP bearer credentials

**Dependencies**:
- 045-PUB Public API & Webhooks (API keys, rate limiting)
- 039-RPA Roles & Permissions (tool-level permission gating)
- Stancl tenant resolution continues to run before tool execution

**Risks**:
- **Write-tool blast radius** (HIGH) → Mitigation: read-only MCP on launch; write tools behind a per-workspace opt-in flag + scoped API key
- **Protocol churn** (MEDIUM) → Mitigation: pin to the official MCP SDK, follow spec updates, avoid custom extensions
- **Prompt injection via ledger data** (MEDIUM) → Mitigation: tool responses sanitise user-generated strings; document the threat model for integrators
- **Support burden from third-party agents doing weird things** (LOW) → Mitigation: clear rate limits, audit log every tool call, error budgets per API key

---

## Estimated Effort

**M — approximately 2–3 sprints**

- **Sprint 1**: MCP server scaffold, auth (reuse 045-PUB keys), read tools for balances + reports + invoices/bills, audit logging
- **Sprint 2**: Write tools (create JE, create invoice, reconcile), permission gating per tool, rate limiting, registry publishing
- **Sprint 3**: One-click connect flow in workspace settings, docs + examples, billing meter integration, marketplace listing

---

## Proceed to PRD?

**YES** — clear strategic positioning, leverages existing Actions + API infrastructure, unblocks the marketplace and third-party AI ecosystem.

---

## Decision

- [ ] **Approved** - Proceed to PRD
- [ ] **Needs More Information** - [What's needed?]
- [ ] **Declined** - [Reason]

**Approval Date**: —

---

## Next Steps

**If Approved**:
1. [ ] `/trilogy-idea-handover` — Gate 0 validation + create Linear epic
2. [ ] `/speckit-specify` — PRD
3. [ ] `/trilogy-clarify spec` — refine PRD

---

**Notes**: Pairs naturally with 045-PUB (Public API & Webhooks) and 093-MKP (Marketplace Ecosystem). The MCP is the AI-native on-ramp; REST remains the deterministic integration layer.
