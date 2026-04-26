---
title: "Idea Brief: AI Financial Chatbot"
---

# Idea Brief: AI Financial Chatbot

**Epic**: 021-AIQ
**Created**: 2026-03-14
**Author**: William Whitelaw

---

## Problem Statement (What)

- Business owners have all their financial data in the ledger but no way to query it without navigating multiple pages
- Non-accountants don't know which reports to run or how to interpret accounting terminology
- Getting a simple answer like "how much did I spend on contractors last quarter?" requires opening reports, setting date ranges, and cross-referencing accounts
- There is no proactive insight layer — the app is reactive, not conversational

**Current State**: Users must manually navigate to Reports → P&L / General Ledger → set date filters → export or interpret numbers themselves. No natural language access to their own data.

---

## Possible Solution (How)

A workspace-scoped AI financial chatbot powered by Claude with tool use:

- **Conversational interface** — chat panel accessible from anywhere in the app (sidebar or `/chat` page)
- **Tool-use backend** — Claude is given a set of tools that query the workspace's actual ledger data, scoped to the authenticated workspace
- **Rich inline components** — responses render structured UI components (cards, tables, charts), not just plain text
- **Streaming responses** — real-time feel as Claude thinks and responds
- **Persistent chat history** — messages stored per workspace, scrollable
- **Workspace AI config** — entity type, industry, and custom system prompt always prepended for context

**Before / After**:
```
Before:
1. Go to Reports
2. Select P&L
3. Set date range to last quarter
4. Scan rows for "Subcontractors"
5. Cross-reference with invoices manually

After:
User: "How much did I spend on contractors last quarter?"
AI: [renders $8,400 spend card + bar chart by month + 3 top transactions]
```

**Tools Claude would have access to**:
- `get_account_balances(period?)` — current balances by account
- `get_transactions(account?, date_range?, limit?)` — filtered transaction list
- `get_profit_and_loss(from, to)` — P&L for any period
- `get_cash_flow(period?)` — cash in/out summary
- `get_outstanding_invoices()` — overdue and upcoming invoices
- `get_top_expenses(period?, limit?)` — ranked expense breakdown
- `search_transactions(query)` — semantic search across transaction descriptions

**Rich components rendered inline**:
- Balance / cash position card
- P&L summary card (revenue vs expenses vs net)
- Transaction table with drill-down links
- Bar chart / sparkline for period comparisons
- Invoice aging breakdown
- "Top N expenses" ranked list

---

## Benefits (Why)

**User Experience**:
- Insights in seconds vs. minutes — reduces time-to-answer from ~5 minutes to ~10 seconds
- No accounting knowledge required — plain English questions, plain English answers
- Proactive discovery — users find patterns they wouldn't have thought to look for

**Business Value**:
- Strong differentiation from generic accounting software (Xero, MYOB have no conversational layer)
- Increases daily active usage — chat is a habitual surface vs. reports which are periodic
- Reduces support load — "how do I find X?" questions answered by the AI, not support

**ROI**: Potential uplift in paid conversion and retention — conversational AI is a premium feature that justifies higher plan tiers.

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

**Assumptions**:
- `ANTHROPIC_API_KEY` is configured server-side (already in `config/services.anthropic`)
- Tool responses stay within Claude's context window (data is scoped and summarised server-side)
- Users accept that AI responses are informational, not financial advice

**Dependencies**:
- 013-WSP (workspace entity setup — provides entity type / industry context for AI prompts)
- 002-CLE (core ledger — all tools query existing ledger read models)
- Existing API Resources and projectors are the data source (no new DB tables for financial data)

**Risks**:
- Tool response hallucination (LOW) → Mitigation: tools return real data, Claude only interprets it — no generation of numbers
- Cost per conversation (LOW) → Mitigation: Haiku for tool routing, Opus only for complex reasoning; cache repeated queries
- Sensitive data exposure (MEDIUM) → Mitigation: all tools are workspace-scoped via `SetWorkspaceContext` middleware, same as all other API endpoints

---

## Estimated Effort

**2 sprints / ~2 weeks**

- **Sprint 1**: Backend — SSE streaming endpoint, 7 tool handlers, workspace AI config, chat history table
- **Sprint 2**: Frontend — chat UI, rich component renderer, streaming hook, sidebar integration

---

## Proceed to PRD?

**YES** — Clear problem, well-defined solution, strong differentiation value. Depends only on completed epics. Ready to spec.

---

## Decision

- [ ] **Approved** - Proceed to PRD
- [ ] **Needs More Information**
- [ ] **Declined**

**Approval Date**: —
